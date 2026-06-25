/**
 * AI usage metering — the operator-facing record of every Claude API call the
 * platform makes (poll generation, the help chatbot, the market sentinel), so
 * spend is visible from inside 50pick and an exhausted balance is never a
 * surprise.
 *
 * - Every call is logged as one durable row (see ai-usage-dal.ts) with exact
 *   time, model, token counts, web-search count, cost, and success/error.
 * - Cost is computed deterministically from token counts × public per-model
 *   pricing (Anthropic exposes no "credits remaining" API).
 * - A configurable spend limit (default $20 per cycle) emails all admins when
 *   spend nears, then reaches, the limit.
 *
 * Best-effort everywhere: a metering failure must never break an AI call.
 */
import { aiUsageDal, type AiUsageEventRecord, type AiUsageFilter } from "./ai-usage-dal";
import { loadConfig, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";
import { withLock } from "./locks";
import { randomId } from "./crypto";

export type AiFeature = "polls" | "chat" | "sentinel" | "other";

// Per-MTok USD pricing by model family + web-search per-call price. Matches the
// public Anthropic rates; unknown models fall back to Sonnet-tier so an estimate
// is never wildly off.
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-haiku": { in: 1, out: 5 },
  "claude-sonnet": { in: 3, out: 15 },
  "claude-opus": { in: 5, out: 25 },
  "claude-fable": { in: 10, out: 50 },
};
const WEB_SEARCH_USD = 0.01;

function priceFor(model: string): { in: number; out: number } {
  const m = (model || "").toLowerCase();
  for (const key of Object.keys(PRICE_PER_MTOK)) if (m.includes(key)) return PRICE_PER_MTOK[key];
  return PRICE_PER_MTOK["claude-sonnet"];
}
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function costOf(model: string, inputTokens: number, outputTokens: number, webSearches: number): number {
  const p = priceFor(model);
  return round6((inputTokens * p.in + outputTokens * p.out) / 1_000_000 + webSearches * WEB_SEARCH_USD);
}

const RETAIN_DAYS = 180;
let sinceLastPrune = 0;

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export async function recordAiUsage(input: {
  feature: AiFeature;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  webSearches?: number;
  ok: boolean;
  errorType?: string | null;
  latencyMs?: number | null;
  detail?: string | null;
}): Promise<void> {
  try {
    const inTok = Math.max(0, Math.round(input.inputTokens ?? 0));
    const outTok = Math.max(0, Math.round(input.outputTokens ?? 0));
    const searches = Math.max(0, Math.round(input.webSearches ?? 0));
    const ev: AiUsageEventRecord = {
      id: `aiu_${randomId(14)}`,
      createdAt: new Date().toISOString(),
      feature: input.feature,
      model: input.model,
      inputTokens: inTok,
      outputTokens: outTok,
      webSearches: searches,
      costUsd: costOf(input.model, inTok, outTok, searches),
      ok: input.ok,
      errorType: input.ok ? null : (input.errorType ?? "error"),
      latencyMs: input.latencyMs ?? null,
      detail: input.detail ?? null,
    };
    await aiUsageDal.create(ev);

    // Opportunistic retention prune (every ~250 records) — bounds table growth
    // without a cron.
    if (++sinceLastPrune >= 250) {
      sinceLastPrune = 0;
      const cutoff = new Date(Date.now() - RETAIN_DAYS * 86_400_000).toISOString();
      aiUsageDal.pruneOlderThan(cutoff).catch(() => {});
    }

    await checkLimitAndAlert();
  } catch { /* metering is best-effort — never break an AI call */ }
}

// ---------------------------------------------------------------------------
// Credit limit + alerting
// ---------------------------------------------------------------------------

export type CreditConfig = { limitUsd: number; cycleStartIso: string; alertedLevel: "none" | "warn" | "limit" };
const CREDIT_KEY = "ai_credit_config";
const DEFAULT_LIMIT_USD = 20;
const WARN_FRACTION = 0.8;

// Credit config persists to SystemConfig in production; without a DB (dev/tests)
// it falls back to a process-global so the cycle start + alert state stay stable
// within the run (config-store no-ops without a DB).
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_CREDIT: CreditConfig | undefined;
}
async function loadCredit(): Promise<CreditConfig | null> {
  if (!hasDatabase()) return globalThis.__50PICK_AI_CREDIT ?? null;
  return await loadConfig<CreditConfig>(CREDIT_KEY);
}
async function saveCredit(c: CreditConfig): Promise<void> {
  if (!hasDatabase()) { globalThis.__50PICK_AI_CREDIT = c; return; }
  await saveConfig(CREDIT_KEY, c);
}

export async function getCreditConfig(): Promise<CreditConfig> {
  const c = await loadCredit();
  if (c && typeof c.limitUsd === "number" && c.cycleStartIso) {
    return { limitUsd: c.limitUsd > 0 ? c.limitUsd : DEFAULT_LIMIT_USD, cycleStartIso: c.cycleStartIso, alertedLevel: c.alertedLevel ?? "none" };
  }
  // First read — persist defaults so the cycle start is stable from here on.
  const fresh: CreditConfig = { limitUsd: DEFAULT_LIMIT_USD, cycleStartIso: new Date().toISOString(), alertedLevel: "none" };
  await saveCredit(fresh);
  return fresh;
}

/** Set the spend limit (USD) per cycle. Keeps the current cycle + alert state. */
export async function setCreditLimit(limitUsd: number): Promise<void> {
  const cur = await getCreditConfig();
  await saveCredit({ ...cur, limitUsd: Math.max(0, limitUsd) });
}

/** Start a new spend cycle now (call after topping up credit on Anthropic).
 *  Resets the "spent this cycle" counter and re-arms the alerts. */
export async function resetCreditCycle(): Promise<void> {
  const cur = await getCreditConfig();
  await saveCredit({ ...cur, cycleStartIso: new Date().toISOString(), alertedLevel: "none" });
}

const LEVEL_ORDER: Record<CreditConfig["alertedLevel"], number> = { none: 0, warn: 1, limit: 2 };

/** After each call, if cycle spend crossed the warn (80%) or limit (100%)
 *  threshold for the first time, email + in-app alert all admins. Serialized so
 *  concurrent calls can't double-send. */
async function checkLimitAndAlert(): Promise<void> {
  await withLock("ai-credit-alert", async () => {
    const cfg = await getCreditConfig();
    const spent = await aiUsageDal.sumCostSince(cfg.cycleStartIso);
    // Small epsilon so an exact-boundary spend (e.g. $16.00 of a $20 limit, where
    // 20*0.8 is 16.000000000000004 in float) reliably trips the threshold.
    const EPS = 1e-6;
    let level: CreditConfig["alertedLevel"] = "none";
    if (spent >= cfg.limitUsd - EPS) level = "limit";
    else if (spent >= cfg.limitUsd * WARN_FRACTION - EPS) level = "warn";

    if (LEVEL_ORDER[level] <= LEVEL_ORDER[cfg.alertedLevel]) return; // no new escalation

    await saveCredit({ ...cfg, alertedLevel: level });
    if (level === "none") return; // unreachable past the guard above, but narrows the type
    try {
      const { notifyAdminsAiCreditLimit } = await import("./notification-service");
      await notifyAdminsAiCreditLimit({ level, spentUsd: round6(spent), limitUsd: cfg.limitUsd });
    } catch { /* alert is best-effort */ }
  });
}

// ---------------------------------------------------------------------------
// Summary (dashboard)
// ---------------------------------------------------------------------------

export type UsageBucket = {
  calls: number; ok: number; err: number;
  inTok: number; outTok: number; searches: number; costUsd: number;
};
function emptyBucket(): UsageBucket {
  return { calls: 0, ok: 0, err: 0, inTok: 0, outTok: 0, searches: 0, costUsd: 0 };
}
function addEvent(b: UsageBucket, e: AiUsageEventRecord): void {
  b.calls += 1;
  if (e.ok) b.ok += 1; else b.err += 1;
  b.inTok += e.inputTokens; b.outTok += e.outputTokens; b.searches += e.webSearches;
  b.costUsd = round6(b.costUsd + e.costUsd);
}

export type AiUsageSummary = {
  windows: { today: UsageBucket; last7: UsageBucket; last30: UsageBucket; all: UsageBucket };
  byFeature: Record<AiFeature, UsageBucket>;
  recent24h: UsageBucket;
  health: "ok" | "failing" | "idle";
  credit: { limitUsd: number; cycleStartIso: string; spentThisCycleUsd: number; remainingUsd: number; alertedLevel: CreditConfig["alertedLevel"] };
};

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const now = Date.now();
  const since90 = new Date(now - 90 * 86_400_000).toISOString();
  const events = await aiUsageDal.recent(since90, 200_000);

  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  const d7 = new Date(now - 7 * 86_400_000).toISOString();
  const d30 = new Date(now - 30 * 86_400_000).toISOString();
  const h24 = new Date(now - 86_400_000).toISOString();

  const windows = { today: emptyBucket(), last7: emptyBucket(), last30: emptyBucket(), all: emptyBucket() };
  const byFeature: Record<AiFeature, UsageBucket> = {
    polls: emptyBucket(), chat: emptyBucket(), sentinel: emptyBucket(), other: emptyBucket(),
  };
  const recent24h = emptyBucket();

  for (const e of events) {
    addEvent(windows.all, e);
    if (e.createdAt >= d30) addEvent(windows.last30, e);
    if (e.createdAt >= d7) addEvent(windows.last7, e);
    if (e.createdAt >= todayStart) addEvent(windows.today, e);
    if (e.createdAt >= h24) addEvent(recent24h, e);
    const feat = (byFeature[e.feature as AiFeature] ? (e.feature as AiFeature) : "other");
    addEvent(byFeature[feat], e);
  }

  let health: AiUsageSummary["health"] = "ok";
  if (recent24h.calls === 0) health = "idle";
  else if (recent24h.ok === 0 && recent24h.err > 0) health = "failing";

  const cfg = await getCreditConfig();
  const spentThisCycleUsd = await aiUsageDal.sumCostSince(cfg.cycleStartIso);

  return {
    windows, byFeature, recent24h, health,
    credit: {
      limitUsd: cfg.limitUsd,
      cycleStartIso: cfg.cycleStartIso,
      spentThisCycleUsd: round6(spentThisCycleUsd),
      remainingUsd: round6(Math.max(0, cfg.limitUsd - spentThisCycleUsd)),
      alertedLevel: cfg.alertedLevel,
    },
  };
}

/** Paginated, filtered detail view for the admin page. */
export async function listAiUsage(filter: AiUsageFilter, page: number, pageSize: number) {
  return aiUsageDal.list(filter, Math.max(1, page), Math.min(200, Math.max(1, pageSize)));
}

export type { AiUsageEventRecord, AiUsageFilter };
