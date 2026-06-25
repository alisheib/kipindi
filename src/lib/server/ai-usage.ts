/**
 * AI usage metering — a single, durable record of every Claude API call the
 * platform makes (poll generation, the help chatbot, the market sentinel), so
 * the operator can see spend and catch an exhausted balance from inside 50pick.
 *
 * Why this exists: Anthropic has NO public API for "credits remaining". What we
 * CAN do — accurately — is meter our own spend (we know the model + token counts
 * + web-search count, and the per-model price), aggregate it by day and feature,
 * and let the operator log a top-up so we can estimate what's left.
 *
 * Storage: daily buckets in the SystemConfig key/value table (write-through,
 * same persistence as the other admin-tunable config). No new migration. Without
 * a DATABASE_URL the writes no-op and reads return empty — never throws, so
 * recording usage can never break an AI call.
 */
import { loadConfig, saveConfig } from "./config-store";
import { withLock } from "./locks";

export type AiFeature = "polls" | "chat" | "sentinel" | "other";

export type UsageBucket = {
  calls: number; ok: number; err: number;
  inTok: number; outTok: number; searches: number; costUsd: number;
};
type DayRecord = Partial<Record<AiFeature, UsageBucket>>;
type UsageStore = Record<string, DayRecord>; // "YYYY-MM-DD" (UTC) → per-feature
export type CreditTopup = { amountUsd: number; atIso: string };

const USAGE_KEY = "ai_usage_daily";
const TOPUP_KEY = "ai_credit_topup";
const RETAIN_DAYS = 90;

// Per-MTok USD pricing by model family + web-search per-call price. Matches the
// public Anthropic rates; falls back to Sonnet-tier for an unknown model so an
// estimate is never wildly off.
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

function emptyBucket(): UsageBucket {
  return { calls: 0, ok: 0, err: 0, inTok: 0, outTok: 0, searches: 0, costUsd: 0 };
}
function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/** Record one Claude API call. Fire-and-forget safe: swallows all errors so a
 *  metering failure never affects the caller. */
export async function recordAiUsage(input: {
  feature: AiFeature;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  webSearches?: number;
  ok: boolean;
}): Promise<void> {
  try {
    const inTok = Math.max(0, Math.round(input.inputTokens ?? 0));
    const outTok = Math.max(0, Math.round(input.outputTokens ?? 0));
    const searches = Math.max(0, Math.round(input.webSearches ?? 0));
    const p = priceFor(input.model);
    const cost = (inTok * p.in + outTok * p.out) / 1_000_000 + searches * WEB_SEARCH_USD;
    const day = utcDay();

    await withLock("ai-usage", async () => {
      // Read fresh inside the lock so concurrent instances don't clobber.
      const store = (await loadConfig<UsageStore>(USAGE_KEY)) ?? {};
      const dayRec = store[day] ?? (store[day] = {});
      const b = dayRec[input.feature] ?? (dayRec[input.feature] = emptyBucket());
      b.calls += 1;
      if (input.ok) b.ok += 1; else b.err += 1;
      b.inTok += inTok; b.outTok += outTok; b.searches += searches;
      b.costUsd = round6(b.costUsd + cost);

      // Prune buckets older than the retention window.
      const cutoff = utcDay(new Date(Date.now() - RETAIN_DAYS * 86_400_000));
      for (const k of Object.keys(store)) if (k < cutoff) delete store[k];

      await saveConfig(USAGE_KEY, store);
    });
  } catch { /* metering is best-effort — never break an AI call */ }
}

function addInto(dst: UsageBucket, src: UsageBucket): void {
  dst.calls += src.calls; dst.ok += src.ok; dst.err += src.err;
  dst.inTok += src.inTok; dst.outTok += src.outTok;
  dst.searches += src.searches; dst.costUsd = round6(dst.costUsd + src.costUsd);
}

export type AiUsageSummary = {
  windows: { today: UsageBucket; last7: UsageBucket; last30: UsageBucket; all: UsageBucket };
  byFeature: Record<AiFeature, UsageBucket>;
  recent24h: UsageBucket;
  health: "ok" | "failing" | "idle";
  topup: CreditTopup | null;
  spentSinceTopupUsd: number;
  estimatedRemainingUsd: number | null;
  firstDay: string | null;
  lastDay: string | null;
};

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const store = (await loadConfig<UsageStore>(USAGE_KEY)) ?? {};
  const topup = (await loadConfig<CreditTopup>(TOPUP_KEY)) ?? null;

  const today = utcDay();
  const d7 = utcDay(new Date(Date.now() - 7 * 86_400_000));
  const d30 = utcDay(new Date(Date.now() - 30 * 86_400_000));
  const yesterday = utcDay(new Date(Date.now() - 86_400_000));
  const topupDay = topup ? topup.atIso.slice(0, 10) : null;

  const windows = { today: emptyBucket(), last7: emptyBucket(), last30: emptyBucket(), all: emptyBucket() };
  const byFeature: Record<AiFeature, UsageBucket> = {
    polls: emptyBucket(), chat: emptyBucket(), sentinel: emptyBucket(), other: emptyBucket(),
  };
  const recent24h = emptyBucket();
  let spentSinceTopupUsd = 0;

  const days = Object.keys(store).sort();
  for (const day of days) {
    const rec = store[day];
    for (const feat of Object.keys(rec) as AiFeature[]) {
      const b = rec[feat]!;
      addInto(windows.all, b);
      if (day >= d30) addInto(windows.last30, b);
      if (day >= d7) addInto(windows.last7, b);
      if (day === today) addInto(windows.today, b);
      if (day === today || day === yesterday) addInto(recent24h, b);
      if (byFeature[feat]) addInto(byFeature[feat], b);
      if (topupDay && day >= topupDay) spentSinceTopupUsd = round6(spentSinceTopupUsd + b.costUsd);
    }
  }

  // Health: failing if recent calls exist but every one errored (the
  // exhausted-credit / bad-key signature); idle if no recent calls.
  let health: AiUsageSummary["health"] = "ok";
  if (recent24h.calls === 0) health = "idle";
  else if (recent24h.ok === 0 && recent24h.err > 0) health = "failing";

  const estimatedRemainingUsd = topup ? round6(topup.amountUsd - spentSinceTopupUsd) : null;

  return {
    windows, byFeature, recent24h, health, topup, spentSinceTopupUsd,
    estimatedRemainingUsd,
    firstDay: days[0] ?? null,
    lastDay: days[days.length - 1] ?? null,
  };
}

/** Operator logs a credit top-up (what they added on the Anthropic console), so
 *  the dashboard can estimate remaining = top-up − spend since the top-up. */
export async function setCreditTopup(amountUsd: number): Promise<void> {
  await saveConfig(TOPUP_KEY, { amountUsd: Math.max(0, amountUsd), atIso: new Date().toISOString() } satisfies CreditTopup);
}
