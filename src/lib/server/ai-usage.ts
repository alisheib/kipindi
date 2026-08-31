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
 * - A configurable spend limit (default $20 per TOP-UP WINDOW) emails all admins
 *   when spend nears, then reaches, the limit.
 *
 * Best-effort everywhere: a metering failure must never break an AI call.
 *
 * ── ⛔ TWO THINGS USED TO BE CALLED "CYCLE" IN THIS FILE ─────────────────────────
 *
 * They are different, and they are now spelled differently, because two meanings of
 * one word in one file is how `E-179` happened:
 *
 *   · A **TOP-UP WINDOW** (`CreditConfig.topUpWindowStartIso`) is a PERIOD — "since Ali
 *     last bought Anthropic credit". It is what `assertAiBudget()` measures spend
 *     against, and it is the ONLY thing that can refuse a call. Topping up starts a
 *     new window. This used to be called `cycleStartIso`.
 *
 *   · A **SPEND CYCLE** (`AiSpendCycle`, below) is a DENOMINATION — a fixed quantum of
 *     spend, custom and settable. At $100/cycle, $243.32 is 2 closed cycles and 0.43 of
 *     an open one. Cycles are COUNTABLE, which is the whole point: "we burned N cycles
 *     this year" divides by markets resolved, by month, by revenue. "$243.32" does not.
 *     ⛔ The cycle index NEVER resets — that is what makes "cycles per year" a real
 *     number. A top-up starts a new WINDOW, never a new cycle numbering.
 *
 * ── ⛔ THERE IS STILL EXACTLY ONE MONEY AUTHORITY ────────────────────────────────
 *
 * A cycle DOES stop the AI — Ali, 2026-08-23: *"when a cycle ends we have to start a new one
 * to proceed, or posting / AI resolving is blocked"* — and that is deliberately NOT a second
 * cap on money:
 *
 *   · `limitUsd` is the only thing that says HOW MUCH may be spent. Unchanged.
 *   · A cycle boundary says WHEN AN OFFICER MUST LOOK. It has no opinion about totals.
 *
 * Two controls that cannot disagree about an amount, because only one of them is about an
 * amount. That is what keeps this out of the "two caps argue at 2am against real money"
 * failure — the funded allowance is still just `limitUsd`, shown in cycles as
 * `limitUsd / sizeUsd`.
 *
 * ⛔ AND THE GATE FAILS OPEN. `assertAiBudget` returns `ok` on any internal error, exactly as
 * before: a broken meter must never be able to stop the Market Sentinel from resolving a
 * real-money market.
 */
import { aiUsageDal, type AiUsageEventRecord, type AiUsageFilter } from "./ai-usage-dal";
import { aiCycleDal, DuplicateCycleIndexError, type AiSpendCycleRecord } from "./ai-cycle-dal";
import { loadConfig, saveConfig } from "./config-store";
import { hasDatabase } from "./prisma";
import { withLock } from "./locks";
import { randomId } from "./crypto";
import { audit } from "./audit";
import type { OperatorRefusal } from "./safe-error";
// ⛔ RELATIVE, NOT THE `@/` ALIAS, AND THAT IS LOAD-BEARING. `red:ai-cycles` proves each
// check by copying the tree, mutating one file and running the gate from the copy. `tsx`
// resolves `@/` through the tsconfig paths of the CWD — which is the real repo — so an
// aliased import would quietly load the ORIGINAL module while the harness reported it had
// mutated one. A red proof that reads the wrong tree is worse than no red proof.
import { CYCLE_BOUNDS, type AiSubjectType } from "../ai-cycle-rules";

// One bucket per distinct AI spend line. `updown` is the Up & Down price oracle,
// kept SEPARATE from `sentinel` (normal-market resolution) so the admin AI-usage page
// can say exactly what each game costs (Ali, 2026-07-25 — Up & Down is its own game).
// Historical rows the oracle wrote as `sentinel` (the one pre-separation seeded chain)
// stay attributed there; everything new lands in `updown`.
// ⛔ THE LIST IS THE TYPE, not a comment beside it. A hand-written union cannot be
// enumerated at runtime, so nothing could check that every feature is filed under a product
// line — and `other` was silently filed under NONE, leaving spend that appeared in the total
// and in no line. `test:ai-cycles` §14 now asserts the coverage, which is only possible
// because the features can be listed.
export const AI_FEATURES = ["polls", "chat", "sentinel", "updown", "other"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

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

/**
 * The pricing table's own revision — a content hash, not a hand-bumped constant.
 *
 * ⛔ IT IS DERIVED SO IT CANNOT GO STALE. Every closed cycle stamps the revision it was
 * costed at, so when Anthropic changes a rate, history stays interpretable instead of
 * becoming "costed at rates nobody recorded". A hand-maintained `"v3"` is a number written
 * twice — it disagrees with the table the first time someone edits a rate and forgets.
 */
export const PRICE_REV: string = (() => {
  const canon = JSON.stringify({ m: PRICE_PER_MTOK, w: WEB_SEARCH_USD });
  // FNV-1a, 32-bit. Not cryptographic — it only has to CHANGE when the table changes.
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `p${h.toString(36)}`;
})();

/**
 * WHAT A METERED CALL WAS FOR. `detail` is free text — you cannot divide free text by
 * "resolutions", which is exactly what a cycle count has to be divisible by.
 *
 * ⛔ EVERY CALL SITE NAMES ONE. `subjectId` may be null (a poll is generated BEFORE its
 * candidate row exists, so there is no id to name), but the TYPE never is: an event with no
 * subjectType at all is the half-threaded attribution the whole design is built to avoid,
 * and an under-count here reads as "cheaper than it is".
 *
 * ⚠️ `updown_observation` IS NOT A ROUND. `UpDownObservation` is UNIQUE on
 * (assetId, boundaryAt), so ONE paid oracle call serves EVERY round sitting on that
 * boundary — measured at **2.353 rounds per observation** on production, 2026-08-23.
 * Anyone dividing oracle spend by observations and calling the result a per-round cost is
 * over-stating it by that factor. The read model divides a product LINE's spend by that
 * line's settled markets, which is correct however the calls are shared.
 */
// ⛔ THE LIST IS IN `src/lib/ai-cycle-rules.ts`, ISOMORPHIC, so the admin ledger's label map
// and this type cannot drift apart — `test:ai-cycles` §17 proves they agree. A second
// hand-written union here was exactly the shape that let a comment claim a guard that did
// not exist.
export type { AiSubjectType };

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

/** ⛔ EXPORTED because the CYCLE ledger is never pruned and the EVENT ledger is. Anything
 *  comparing the two has to know where the events stop existing, or it reports a drift that
 *  is really just retention doing its job. */
export const RETAIN_DAYS = 180;
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
  /** ⛔ REQUIRED at every call site. See `AiSubjectType`. */
  subjectType: AiSubjectType;
  /** The soft ref, where one exists at the moment of the call. Null is a real answer. */
  subjectId?: string | null;
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
      subjectType: input.subjectType,
      subjectId: input.subjectId ?? null,
    };
    await aiUsageDal.create(ev);

    // Denominate the same spend in cycles. Runs INSIDE the existing try/catch, so a broken
    // cycle meter can no more break an AI call than a broken usage write can — and it runs
    // AFTER the usage row, so the event ledger is always the senior record. The
    // reconciliation gate (`test:ai-cycles` §1) is what stops "best-effort" quietly meaning
    // "nobody checks", which is this repo's single most repeated defect.
    await accrueSpendToCycles(ev.costUsd, ev.createdAt);

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

/** ⚠️ `topUpWindowStartIso` was called `cycleStartIso` until 2026-08-23 — see the header. */
export type CreditConfig = { limitUsd: number; topUpWindowStartIso: string; alertedLevel: "none" | "warn" | "limit" };
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
  // 🔴 THE LEGACY KEY IS READ, AND THAT IS LOAD-BEARING, NOT TIDINESS.
  // The stored JSON on production carries `cycleStartIso` (measured 2026-08-23:
  // `{"limitUsd":20,"alertedLevel":"none","cycleStartIso":"2026-08-22T17:17:54.323Z"}`).
  // Renaming the field WITHOUT this fallback would make the first read after deploy see no
  // window at all, write a fresh one starting NOW, and thereby ZERO the "spent this window"
  // counter — silently re-opening a budget that may be genuinely exhausted. A rename that
  // un-blocks the live money gate is not a rename, it is an outage with a tidy diff.
  const legacy = (c as (CreditConfig & { cycleStartIso?: string }) | null)?.cycleStartIso;
  const started = c?.topUpWindowStartIso ?? legacy;
  if (c && typeof c.limitUsd === "number" && started) {
    return {
      limitUsd: c.limitUsd > 0 ? c.limitUsd : DEFAULT_LIMIT_USD,
      topUpWindowStartIso: started,
      alertedLevel: c.alertedLevel ?? "none",
    };
  }
  // First read — persist defaults so the window start is stable from here on.
  const fresh: CreditConfig = { limitUsd: DEFAULT_LIMIT_USD, topUpWindowStartIso: new Date().toISOString(), alertedLevel: "none" };
  await saveCredit(fresh);
  return fresh;
}

/**
 * Set the spend limit (USD) for the top-up window. Keeps the window; RE-ARMS the alerts.
 *
 * 🔴 RAISING A LIMIT USED TO SILENTLY DISARM ITS OWN ALARMS, and this was MEASURED on
 * production on 2026-08-31, not reasoned about. The stored row was
 * `{limitUsd:20, alertedLevel:"limit", …}` with $20.5573 spent. `alertedLevel` was carried over
 * unchanged, and `checkLimitAndAlert` escalates only — `LEVEL_ORDER[level] <= LEVEL_ORDER[cfg.alertedLevel]`
 * returns early. So against a NEW $70 ceiling: at $56 the level computes to `warn` (1 ≤ 2 →
 * return, no alert) and at $70 it computes to `limit` (2 ≤ 2 → return, no alert).
 *
 * ⛔ THE OPERATOR WOULD HAVE CROSSED $49 OF SPEND AND HIT A HARD BLOCK WITH NO WARNING — the
 * identical silent wall that caused the incident this whole seam exists for, one ceiling later.
 * An alert level is a statement about a ceiling; carry it across a ceiling change and it becomes
 * a statement about a ceiling that no longer exists.
 *
 * ⭐ SO THE LEVEL IS RECOMPUTED AGAINST THE NEW CEILING, with the SAME formula
 * `checkLimitAndAlert` uses (shared as `alertLevelFor`, so the two cannot drift). Lowering a
 * limit onto spend that already exceeds it therefore lands on `limit` and does NOT re-announce
 * something the operator was already told; raising one above current spend lands on `none` and
 * genuinely re-arms both thresholds.
 */
export async function setCreditLimit(limitUsd: number): Promise<void> {
  const cur = await getCreditConfig();
  const next = Math.max(0, limitUsd);
  const spent = next > 0 ? await aiUsageDal.sumCostSince(cur.topUpWindowStartIso) : 0;
  await saveCredit({ ...cur, limitUsd: next, alertedLevel: alertLevelFor(spent, next) });
}

/**
 * Start a new TOP-UP WINDOW now (call after topping up credit on Anthropic).
 * Resets the "spent this window" counter and re-arms the alerts.
 *
 * ⛔ THIS DOES NOT TOUCH THE CYCLE LEDGER. Ali asked whether a recharge should "reset the
 * cycle or start a new cycle": neither. The cycle index is monotonic for ever — reset it and
 * "cycles per year" stops being a number you can divide by anything. A recharge starts a new
 * WINDOW; the open cycle keeps accruing straight through it.
 */
export async function startNewTopUpWindow(): Promise<void> {
  const cur = await getCreditConfig();
  await saveCredit({ ...cur, topUpWindowStartIso: new Date().toISOString(), alertedLevel: "none" });
}

/**
 * HARD BUDGET GATE — call this BEFORE any paid Anthropic request.
 *
 * The credit meter used to be alert-only: it emailed admins AFTER the spend had
 * already happened, and nothing ever refused a call. The only real cost cap was
 * "a human has to click Generate" — which is exactly the control that a
 * calendar/scheduled generator (F8) removes. So spend is now actually enforced.
 *
 * Fails OPEN on an internal error (a broken meter must not brick poll generation),
 * but fails CLOSED on a genuine over-limit.
 */
export async function assertAiBudget(
  feature: string,
): Promise<{ ok: true } | { ok: false; reason: "budget" | "cycle"; spentUsd: number; limitUsd: number; lastClosedIndex?: number }> {
  try {
    const cfg = await getCreditConfig();

    // ⛔ THE MONEY CEILING FIRST, AND IT IS UNCHANGED. This is the only condition that is
    // about an AMOUNT, and it stays exactly as it was — Ali called it perfect.
    if (cfg.limitUsd > 0) {
      const spent = await aiUsageDal.sumCostSince(cfg.topUpWindowStartIso);
      if (spent >= cfg.limitUsd) {
        audit({
          category: "ADMIN",
          action: "ai.call_blocked.budget_exhausted",
          actorId: null, targetType: "AiUsage", targetId: feature,
          payload: { spentUsd: round6(spent), limitUsd: cfg.limitUsd },
        });
        return { ok: false, reason: "budget", spentUsd: round6(spent), limitUsd: cfg.limitUsd };
      }
    }

    // ⛔ THEN THE CYCLE CHECKPOINT (Ali, 2026-08-23): "when a cycle ends we have to start a
    // new one to proceed, or posting / AI resolving is blocked." It refuses only when a
    // cycle has genuinely been closed and nobody has started its successor. `targetId` is
    // the FEATURE, so the audit trail says which purpose was stopped — the same shape the
    // budget block already had.
    const gate = await cycleGate();
    if (gate.blocked) {
      audit({
        category: "ADMIN",
        action: "ai.call_blocked.cycle_ended",
        actorId: null, targetType: "AiUsage", targetId: feature,
        payload: { lastClosedIndex: gate.lastClosedIndex },
      });
      const spent = cfg.limitUsd > 0 ? round6(await aiUsageDal.sumCostSince(cfg.topUpWindowStartIso)) : 0;
      return { ok: false, reason: "cycle", spentUsd: spent, limitUsd: cfg.limitUsd, lastClosedIndex: gate.lastClosedIndex };
    }

    return { ok: true };
  } catch {
    return { ok: true }; // never let a broken meter block the platform
  }
}

export type AiBudgetBlock = Extract<Awaited<ReturnType<typeof assertAiBudget>>, { ok: false }>;

/**
 * ONE sentence for a refused AI call, defined ONCE.
 *
 * ⛔ WHY THIS IS A SHARED FUNCTION. All four call sites used to build the identical string
 * by hand — *"AI credit limit reached ($x of $y this cycle)"* — and the moment a second
 * reason existed, every one of them would have said the credit limit was reached when it
 * was not. A refusal that names the wrong cause sends an operator to raise a limit that was
 * never the problem. Four copies of one sentence is four chances to be wrong about money.
 *
 * ⚠️ It also corrects the old wording: what those messages called "this cycle" was the
 * TOP-UP WINDOW. A cycle is now a different thing, and the two must never be confused on an
 * operator's screen.
 */
export function describeAiBudgetBlock(b: AiBudgetBlock): string {
  if (b.reason === "cycle") {
    const done = b.lastClosedIndex ?? 0;
    return `AI spend cycle ${done} is complete — AI is paused. Start cycle ${done + 1} under Admin → AI usage to continue.`;
  }
  return `AI credit limit reached ($${b.spentUsd.toFixed(2)} of $${b.limitUsd.toFixed(2)} this top-up window). ` +
    `Raise the limit, or start a new top-up window after adding credit, under Admin → AI usage.`;
}

/**
 * THE SAME REFUSAL, AS DATA — the machine token, the figures, and where to lift it.
 *
 * ⛔ THIS EXISTS BECAUSE THE SENTENCE ABOVE CANNOT BE ACTED ON. `describeAiBudgetBlock` names
 * the screen ("under Admin → AI usage") in prose, and on 2026-08-31 the owner read that exact
 * sentence on production and still had to ask *"where do I fix it, which screen?"* — because a
 * console can PRINT prose but cannot FOLLOW it. `fix.href` is a real route, so the refusal
 * renders as a button that goes there.
 *
 * ⛔ THE FIGURES ARE NUMBERS, NOT SUBSTRINGS OF THE SENTENCE. `failure-reasons.ts` was built
 * over exactly this defect on the player side: `errorCopy` pulled "TZS 1,234" back out of a
 * server sentence with a regex, so rewording the sentence silently dropped the figure off the
 * screen. Reword `describeAiBudgetBlock` freely — nothing downstream reads it for data.
 *
 * ⚠️ KEEP THE TWO IN STEP. They describe one event and are built from one `AiBudgetBlock`;
 * `test:operator-error` asserts that both arms produce a reason AND a matching sentence.
 */
// ⛔ TWO THINGS ARE CALLED `reason` ACROSS THIS BOUNDARY, and after `E-179` this file does not
// get to leave that unsaid. `AiBudgetBlock.reason` is INTERNAL and says which gate refused
// (`"budget"` | `"cycle"`). `OperatorRefusal.reason` is the OPERATOR-FACING token the console
// renders on (`"ai_budget_exhausted"` | `"ai_cycle_ended"`), rostered in
// `src/lib/operator-refusal.ts`. The `ai_` prefix is what keeps them apart at a glance, and this
// function is the ONLY place either vocabulary is translated into the other.
// ⚠️ `test:operator-error` §6.2 scans the bodies of functions RETURNING `OperatorRefusal` — not
// every `reason:` in the file — precisely because the two vocabularies coexist here.
// ⚠️ THE LABELS ARE LENGTH-CONSTRAINED, AND THAT IS A MEASUREMENT, NOT A STYLE OPINION.
// `qa:refusal` renders them in the real button, in the real card, over the real production
// stylesheet: "Open AI usage → Credit budget" is 224px and spills its card by 68px at 320,
// 32px at 360 and 5px at 390 — broken on every phone width. "Open Credit budget" is 150px and
// clears 320 with 5px to spare. ⛔ A remedy the operator cannot read is the defect this whole
// seam exists to remove, so lengthening these needs a bench run, not a judgement.
export function aiBudgetRefusal(b: AiBudgetBlock): OperatorRefusal {
  if (b.reason === "cycle") {
    const done = b.lastClosedIndex ?? 0;
    return {
      reason: "ai_cycle_ended",
      detail: { lastClosedIndex: done, nextIndex: done + 1 },
      fix: { label: "Open Spend cycles", href: "/admin/ai-usage#ai-cycles" },
    };
  }
  return {
    reason: "ai_budget_exhausted",
    detail: { spentUsd: b.spentUsd, limitUsd: b.limitUsd },
    fix: { label: "Open Credit budget", href: "/admin/ai-usage#ai-credit-budget" },
  };
}

const LEVEL_ORDER: Record<CreditConfig["alertedLevel"], number> = { none: 0, warn: 1, limit: 2 };

/**
 * Which alert threshold a given spend has reached against a given ceiling. ONE definition.
 *
 * ⛔ SHARED BY `checkLimitAndAlert` (what to announce) AND `setCreditLimit` (what to consider
 * already announced after a ceiling changes). Two copies of this formula would drift, and the
 * drift is silent in the worst direction: alerts that never fire look exactly like a platform
 * that is comfortably under budget.
 *
 * ⚠️ The epsilon is load-bearing. `20 * 0.8` is `16.000000000000004` in float, so an exact
 * boundary spend of $16.00 against a $20 limit would miss the warn threshold without it.
 */
function alertLevelFor(spentUsd: number, limitUsd: number): CreditConfig["alertedLevel"] {
  const EPS = 1e-6;
  if (limitUsd <= 0) return "none"; // no ceiling set — nothing to announce
  if (spentUsd >= limitUsd - EPS) return "limit";
  if (spentUsd >= limitUsd * WARN_FRACTION - EPS) return "warn";
  return "none";
}

/** After each call, if cycle spend crossed the warn (80%) or limit (100%)
 *  threshold for the first time, email + in-app alert all admins. Serialized so
 *  concurrent calls can't double-send. */
async function checkLimitAndAlert(): Promise<void> {
  await withLock("ai-credit-alert", async () => {
    const cfg = await getCreditConfig();
    const spent = await aiUsageDal.sumCostSince(cfg.topUpWindowStartIso);
    const level = alertLevelFor(spent, cfg.limitUsd);

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
  credit: { limitUsd: number; topUpWindowStartIso: string; spentThisWindowUsd: number; remainingUsd: number; alertedLevel: CreditConfig["alertedLevel"] };
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
    polls: emptyBucket(), chat: emptyBucket(), sentinel: emptyBucket(), updown: emptyBucket(), other: emptyBucket(),
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
  const spentThisWindowUsd = await aiUsageDal.sumCostSince(cfg.topUpWindowStartIso);

  return {
    windows, byFeature, recent24h, health,
    credit: {
      limitUsd: cfg.limitUsd,
      topUpWindowStartIso: cfg.topUpWindowStartIso,
      spentThisWindowUsd: round6(spentThisWindowUsd),
      remainingUsd: round6(Math.max(0, cfg.limitUsd - spentThisWindowUsd)),
      alertedLevel: cfg.alertedLevel,
    },
  };
}

/**
 * Cost (USD) for ONE feature across the standard windows. Powers a game's own
 * economics readout (e.g. the Up & Down admin overview shows exactly what its oracle
 * costs) without pulling the whole cross-feature summary. Same event source + pricing
 * as `getAiUsageSummary`, so the numbers reconcile to the AI-usage page to the cent.
 */
export async function featureCostWindows(feature: AiFeature): Promise<{ today: number; last7: number; last30: number; all: number; calls: number }> {
  const now = Date.now();
  const since90 = new Date(now - 90 * 86_400_000).toISOString();
  const events = (await aiUsageDal.recent(since90, 200_000)).filter((e) => e.feature === feature);
  const todayStart = new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
  const d7 = new Date(now - 7 * 86_400_000).toISOString();
  const d30 = new Date(now - 30 * 86_400_000).toISOString();
  let today = 0, last7 = 0, last30 = 0, all = 0;
  for (const e of events) {
    all = round6(all + e.costUsd);
    if (e.createdAt >= d30) last30 = round6(last30 + e.costUsd);
    if (e.createdAt >= d7) last7 = round6(last7 + e.costUsd);
    if (e.createdAt >= todayStart) today = round6(today + e.costUsd);
  }
  return { today, last7, last30, all, calls: events.length };
}

/** Paginated, filtered detail view for the admin page. */
export async function listAiUsage(filter: AiUsageFilter, page: number, pageSize: number) {
  return aiUsageDal.list(filter, Math.max(1, page), Math.min(200, Math.max(1, pageSize)));
}

// ---------------------------------------------------------------------------
// SPEND CYCLES — the denomination, its config, and the meter
// ---------------------------------------------------------------------------

/**
 * The cycle settings Ali tunes. Persisted in `SystemConfig` exactly like `CreditConfig`.
 *
 * ⛔ `fxTzsPerUsd` DEFAULTS TO 0, MEANING "NOT SET", AND THAT IS DELIBERATE. A shilling
 * figure converted at a rate nobody entered is a fabricated number wearing a currency
 * symbol — the platform's own A-5 no-fabrication rule. Until an officer enters a rate and
 * its date, every TZS figure on the page renders `—`.
 */
export type CycleConfig = {
  /** The denomination. Custom and settable; stamped onto each cycle at open. */
  sizeUsd: number;
  /**
   * ⛔ THIS IS THE CHECKPOINT SWITCH, AND ALI'S ANSWER IS `false`.
   *
   * `false` (default, Ali 2026-08-23) — when a cycle is used up it CLOSES and the next one
   * does NOT open by itself. AI calls are then BLOCKED — "poll posting or AI resolving
   * blocked", in his words — until an officer clicks *Start cycle N+1*. That deliberate
   * pause is the whole point: a $1,000 top-up becomes ten $100 decisions, and each one
   * records how long it lasted before the next was needed.
   *
   * `true` — the next cycle opens automatically and nothing ever pauses. The denomination
   * still counts; it just never asks permission.
   *
   * ⛔ Both settings preserve conservation. There is no mode in which metered spend goes
   * anywhere but into a cycle — including the call that overshoots a boundary, which is
   * split across cycles by the `while` loop rather than being rounded away.
   */
  autoRoll: boolean;
  /** Margin added to AI cost to produce the SUGGESTED price. 100 = price is 2× cost. */
  targetMarginPct: number;
  /** 0 = not set. See the note above — this is never guessed. */
  fxTzsPerUsd: number;
  /** "" when the rate is unset. Dated so staleness is visible; staleness is a money error. */
  fxAsOfIso: string;
  /** Refuse to project a year from less observed history than this. */
  minDaysForProjection: number;
};

const CYCLE_KEY = "ai_cycle_config";

/**
 * Ali's decisions, 2026-08-23: $100 per cycle, price at 2× AI cost, and a cycle that ENDS
 * stops the AI until he starts the next one.
 */
export const CYCLE_DEFAULTS: CycleConfig = {
  sizeUsd: 100,
  autoRoll: false,
  targetMarginPct: 100,
  fxTzsPerUsd: 0,
  fxAsOfIso: "",
  minDaysForProjection: 14,
};

// ⛔ THE BOUNDS LIVE IN ONE ISOMORPHIC FILE (`src/lib/ai-cycle-rules.ts`) and are re-exported
// here for server callers. A second copy is a number written twice, and this repo has a
// standing record of what that costs — see `docs/RULES.md` §7.
export { CYCLE_BOUNDS };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_CYCLE_CFG: CycleConfig | undefined;
}

export async function getCycleConfig(): Promise<CycleConfig> {
  const raw = hasDatabase()
    ? await loadConfig<Partial<CycleConfig>>(CYCLE_KEY)
    : (globalThis.__50PICK_AI_CYCLE_CFG ?? null);
  if (!raw) return { ...CYCLE_DEFAULTS };
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    sizeUsd: clampCycleSize(num(raw.sizeUsd, CYCLE_DEFAULTS.sizeUsd)),
    autoRoll: typeof raw.autoRoll === "boolean" ? raw.autoRoll : CYCLE_DEFAULTS.autoRoll,
    targetMarginPct: clampMargin(num(raw.targetMarginPct, CYCLE_DEFAULTS.targetMarginPct)),
    fxTzsPerUsd: num(raw.fxTzsPerUsd, CYCLE_DEFAULTS.fxTzsPerUsd),
    fxAsOfIso: typeof raw.fxAsOfIso === "string" ? raw.fxAsOfIso : CYCLE_DEFAULTS.fxAsOfIso,
    minDaysForProjection: clampMinDays(num(raw.minDaysForProjection, CYCLE_DEFAULTS.minDaysForProjection)),
  };
}

export async function saveCycleConfig(cfg: CycleConfig): Promise<void> {
  const safe: CycleConfig = { ...cfg, sizeUsd: clampCycleSize(cfg.sizeUsd) };
  if (!hasDatabase()) { globalThis.__50PICK_AI_CYCLE_CFG = safe; return; }
  await saveConfig(CYCLE_KEY, safe);
}

/**
 * ⛔ THE LAST LINE OF DEFENCE AT THE METER, not a substitute for validation.
 * A size of 0 or below means "infinitely many cycles" and a divide-by-zero everywhere
 * downstream (§10b). The form refuses it; this makes it impossible even if a value reaches
 * the store by some other route — a hand-edited `SystemConfig` row, say.
 */
export function clampCycleSize(sizeUsd: number): number {
  if (!Number.isFinite(sizeUsd) || sizeUsd <= 0) return CYCLE_DEFAULTS.sizeUsd;
  return Math.min(CYCLE_BOUNDS.sizeUsd.max, Math.max(CYCLE_BOUNDS.sizeUsd.min, sizeUsd));
}

/**
 * ⛔ THE SAME LAST-LINE-OF-DEFENCE ARGUMENT AS `clampCycleSize`, and it was missing.
 *
 * `minDaysForProjection` reaching the read model as 0 makes `observedDays < minDays` false
 * for a zero-length history, and the very next line divides by `observedDays` — putting
 * **Infinity cycles per year** on the one figure Ali prices from. The form cannot produce a
 * 0 (§7 forces 1–365), but a hand-edited `SystemConfig` row can, and guarding the size while
 * leaving this open is an inconsistency that only looks safe.
 */
export function clampMinDays(days: number): number {
  if (!Number.isFinite(days)) return CYCLE_DEFAULTS.minDaysForProjection;
  return Math.min(CYCLE_BOUNDS.minDaysForProjection.max,
    Math.max(CYCLE_BOUNDS.minDaysForProjection.min, Math.round(days)));
}

/** Same reasoning: a margin of -100% would price at zero, and NaN would poison every cell. */
export function clampMargin(pct: number): number {
  if (!Number.isFinite(pct)) return CYCLE_DEFAULTS.targetMarginPct;
  return Math.min(CYCLE_BOUNDS.targetMarginPct.max, Math.max(CYCLE_BOUNDS.targetMarginPct.min, pct));
}

/** The same float guard `checkLimitAndAlert` uses — `20 * 0.8` is `16.000000000000004`. */
export const CYCLE_EPS = 1e-6;

/**
 * ⛔ A CIRCUIT-BREAKER, NOT A CAP ON THE COUNT. At the $0.001 floor a $2 call legitimately
 * spans 2,000 cycles; past that the config is a typo, and looping is a self-inflicted flood
 * of writes on a connection pool the betting path shares. When it trips, the remainder is
 * still accrued to the open cycle — conservation is never broken — and the event is audited,
 * because an under-count that nobody can see is the failure mode this whole file guards.
 */
const MAX_ROLLS_PER_CALL = 2_000;

async function openNextCycle(
  sizeUsd: number,
  atIso: string,
  openedBy: string | null,
  note: string | null,
): Promise<AiSpendCycleRecord> {
  const next = (await aiCycleDal.maxIndex()) + 1;
  const row: AiSpendCycleRecord = {
    id: `aic_${randomId(14)}`,
    index: next,
    // ⛔ STAMPED HERE AND NEVER RE-READ. A retroactive size change would rewrite what "a
    // cycle" meant for every past year the moment Ali retunes it (§10a).
    sizeUsd,
    priceRev: PRICE_REV,
    openedAt: atIso,
    closedAt: null,
    costUsd: 0,
    status: "OPEN",
    openedBy,
    note,
  };
  await aiCycleDal.create(row);
  return row;
}

/**
 * THE METER. Denominate one call's cost into cycles.
 *
 * ⛔ THE `while` IS NOT OPTIONAL. One call can cross several cycles — at $0.01 a size, a
 * $0.30 Opus call is 30 of them. A single `if` silently caps the count, and every downstream
 * number is then too low, which reads as "cheaper than it is".
 *
 * ⛔ `withLock` AND the unique index on `index`, together. The lock serialises; the unique
 * index is what makes a LOST lock loud (constraint error → audited) instead of silent. That
 * is `E-108`'s lesson: never let the only protection be the one you cannot observe failing.
 */
export async function accrueSpendToCycles(costUsd: number, atIso: string): Promise<void> {
  // A zero-cost call opens nothing. Measured on production 2026-08-23: 1,432 of 4,271 events
  // are failures recorded with no token counts and therefore $0. They are real calls and they
  // stay in the event ledger and in every call count — they simply move no money.
  if (!(costUsd > CYCLE_EPS)) return;

  const cfg = await getCycleConfig();
  const size = clampCycleSize(cfg.sizeUsd);

  await withLock("ai-spend-cycle", async () => {
    // ⛔ THE VERY FIRST CYCLE OPENS ITSELF. Only a cycle that has been CLOSED needs an
    // officer to open its successor. If this opened nothing on an empty ledger, deploying
    // the checkpoint gate would block every AI call on the platform at once.
    let cycle = (await aiCycleDal.openCycle()) ?? (await openNextCycle(size, atIso, null, "first cycle"));
    let remaining = round6(costUsd);
    let rolls = 0;

    while (remaining > CYCLE_EPS) {
      const room = round6(cycle.sizeUsd - cycle.costUsd);
      const take = Math.min(room, remaining);
      let newCost = round6(cycle.costUsd + take);
      await aiCycleDal.update(cycle.id, { costUsd: newCost });
      cycle = { ...cycle, costUsd: newCost };
      remaining = round6(remaining - take);

      if (newCost < cycle.sizeUsd - CYCLE_EPS) continue; // room left — nothing to close

      // 🔴 THE STRADDLING CALL, AND WHY THE CHECKPOINT WOULD OTHERWISE NEVER FIRE.
      //
      // A call almost never lands exactly on a boundary. Filling a $100 cycle with a $0.05
      // call leaves ~$0.03 over — and if that remainder opens the successor, there is never
      // a moment with no open cycle, so `cycleGate` never blocks and Ali's pause never
      // happens. Measured: it fired 0 times out of 6 in the first drive of this suite.
      //
      // So in PAUSE mode the cycle that just filled ABSORBS the rest of that one call. The
      // overshoot is bounded by a single call's cost and is shown honestly on the page as
      // "used > 100%" — a visible, tiny imprecision instead of a control that silently does
      // nothing.
      //
      // ⛔ ONLY WHEN THE REMAINDER IS SMALLER THAN A WHOLE CYCLE. A call genuinely worth
      // several cycles must still be SPLIT into several, or the denomination — the entire
      // point of the feature — is destroyed by one large call.
      if (!cfg.autoRoll && remaining > CYCLE_EPS && remaining < cycle.sizeUsd) {
        const absorbed = round6(newCost + remaining);
        await aiCycleDal.update(cycle.id, { costUsd: absorbed });
        cycle = { ...cycle, costUsd: absorbed };
        newCost = absorbed;
        remaining = 0;
      }

      // ⛔ ORDERING ASSERTED AT CLOSE (§10r). A clock that has gone backwards would
      // otherwise write a cycle that closed before it opened, and every duration derived
      // from it — including "how long did this cycle last", which is the number Ali asked
      // for by name — would be negative.
      const closedAt = Date.parse(atIso) >= Date.parse(cycle.openedAt) ? atIso : cycle.openedAt;
      await aiCycleDal.update(cycle.id, { status: "CLOSED", closedAt });
      audit({
        category: "ADMIN", action: "ai.cycle_closed",
        actorId: null, targetType: "AiSpendCycle", targetId: String(cycle.index),
        payload: {
          index: cycle.index, sizeUsd: cycle.sizeUsd, costUsd: newCost, priceRev: cycle.priceRev,
          openedAt: cycle.openedAt, closedAt, lastedMs: Date.parse(closedAt) - Date.parse(cycle.openedAt),
        },
      });
      rolls++;

      if (remaining > CYCLE_EPS) {
        // ⛔ FORCED, AND NOT A POLICY CHOICE. This call's money has already been spent and
        // it has to land somewhere; refusing to open the next cycle here would simply lose
        // it. The checkpoint is about the NEXT call, never about un-metering this one.
        if (rolls >= MAX_ROLLS_PER_CALL) {
          const spill = await openNextCycle(size, closedAt, null, "roll breaker");
          await aiCycleDal.update(spill.id, { costUsd: remaining });
          audit({
            category: "ADMIN", action: "ai.cycle_roll_breaker",
            actorId: null, targetType: "AiSpendCycle", targetId: String(spill.index),
            payload: { sizeUsd: size, rolls, remainderUsd: remaining, callCostUsd: round6(costUsd) },
          });
          return;
        }
        cycle = await openNextCycle(size, closedAt, null, null);
        continue;
      }

      // Exactly spent. THIS is where the checkpoint lives.
      if (cfg.autoRoll) {
        cycle = await openNextCycle(size, closedAt, null, null);
      }
      // autoRoll === false → no open cycle remains. `assertAiBudget` refuses the next call
      // until an officer starts cycle N+1. That is Ali's "when a cycle ends we have to start
      // a new one to proceed, or posting / AI resolving is blocked".
      return;
    }
  });
}

/**
 * OFFICER CONTROL — start the next cycle, which is what un-blocks the AI after a cycle ends.
 *
 * Returns the cycle that was opened, or null when one is already open (starting a second
 * would put two OPEN rows in a ledger whose whole invariant is that there is exactly one).
 */
export async function startNextCycle(officerId: string | null, note: string | null): Promise<AiSpendCycleRecord | null> {
  return withLock("ai-spend-cycle", async () => {
    if (await aiCycleDal.openCycle()) return null;
    const cfg = await getCycleConfig();
    // ⛔ The size is read HERE, at open, and stamped. This is the one moment a size change
    // takes effect — never retroactively (§8.4).
    return openNextCycle(clampCycleSize(cfg.sizeUsd), new Date().toISOString(), officerId, note);
  });
}

/**
 * OFFICER CONTROL — close the open cycle early, before it has spent its full size.
 * Deliberately does NOT open the successor: closing is "stop here", and starting the next
 * one is the separate, explicit decision Ali asked for.
 */
export async function closeOpenCycleNow(officerId: string | null, note: string | null): Promise<AiSpendCycleRecord | null> {
  return withLock("ai-spend-cycle", async () => {
    const cycle = await aiCycleDal.openCycle();
    if (!cycle) return null;
    const nowIso = new Date().toISOString();
    const closedAt = Date.parse(nowIso) >= Date.parse(cycle.openedAt) ? nowIso : cycle.openedAt;
    await aiCycleDal.update(cycle.id, { status: "CLOSED", closedAt });
    audit({
      category: "ADMIN", action: "ai.cycle_closed_early",
      actorId: officerId, targetType: "AiSpendCycle", targetId: String(cycle.index),
      payload: {
        index: cycle.index, sizeUsd: cycle.sizeUsd, costUsd: cycle.costUsd,
        openedAt: cycle.openedAt, closedAt, lastedMs: Date.parse(closedAt) - Date.parse(cycle.openedAt), note,
      },
    });
    return { ...cycle, status: "CLOSED", closedAt };
  });
}

/**
 * IS THE AI ALLOWED TO SPEND RIGHT NOW, in cycle terms?
 *
 * ⛔ THIS IS A CHECKPOINT, NOT A SECOND MONEY CAP, and the distinction is what keeps §8.6
 * satisfied. It has no opinion about how much may be spent in total — `limitUsd` is still
 * the only ceiling. It answers one question: has an officer acknowledged the last completed
 * $100 by starting the next cycle? Two gates that cannot disagree about an amount, because
 * only one of them is about an amount.
 *
 * Returns `blocked` ONLY when a cycle has actually been closed and nothing succeeded it. An
 * empty ledger is never blocked — the meter opens cycle 1 on the first spend.
 */
export async function cycleGate(): Promise<{ blocked: false } | { blocked: true; lastClosedIndex: number }> {
  const open = await aiCycleDal.openCycle();
  if (open) return { blocked: false };
  const highest = await aiCycleDal.maxIndex();
  if (highest === 0) return { blocked: false }; // nothing has ever been metered
  return { blocked: true, lastClosedIndex: highest };
}

export { DuplicateCycleIndexError };
export type { AiSpendCycleRecord };
export type { AiUsageEventRecord, AiUsageFilter };
