/**
 * Up & Down configuration — the asset registry, the chain registry, and the
 * product-level thresholds.
 *
 * ⛔ ONE CONTROL, ONE PLACE. Everything here is edited from `/admin/updown/*` and
 * NOWHERE else. In particular it is NOT mirrored into `/admin/config` (which owns the
 * long-form poll rates) and the AI pause switch is NOT here — that lives in the
 * AI-toolkit dropdown, the single home for every AI switch on the platform.
 *
 * What this module is careful about, and why:
 *
 *  1. THE SOURCE GATE. An asset's price source must be an ENABLED trusted source in
 *     the existing registry (`source-registry.ts`). There is no second allowlist. A
 *     round captures its source link at generation and resolves against that same
 *     link, so an untrusted domain here would put an unverifiable source behind real
 *     money.
 *
 *  2. THE RATE PROFILE runs through the SAME validator as global config
 *     (`validateRateConfig`), so the winner-floor guardrail applies identically. A
 *     chain cannot be configured with rates under which a correct call loses money.
 *
 *  3. THE GRID IS DERIVED, NEVER ACCUMULATED. `boundaryAfter` computes
 *     `anchor + k·duration` from an instant, so a restart, a missed fire or a slow
 *     tick cannot drift the schedule. Nothing increments a "next boundary" cursor.
 */
import { audit } from "./audit";
import { randomId } from "./crypto";
import { loadConfig, saveConfig } from "./config-store";
import { isSourceTrusted, normalizeDomain } from "./source-registry";
import { validateRateConfig } from "./market-config";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "@/lib/payout";
import type { RefusalReason } from "./updown-oracle";
// The money lives on the market row, never in the Up & Down tables — the source lock needs
// it to tell an operator what is actually riding on the rounds it is refusing to strand.
import { marketStore } from "./market-dal";
import { assetStore, chainStore, roundStore, type StoredAsset, type StoredChain, type ChainState } from "./updown-dal";
import type { RateConfig } from "./market-config";
import type { MarketCategory } from "./market-service";
import type { FeedProviderId } from "./updown-feed";
import { FEED_PROVIDERS, isFeedProviderId } from "@/lib/updown-providers";

// ---------------------------------------------------------------------------
// Product-level configuration
// ---------------------------------------------------------------------------

const UPDOWN_CONFIG_KEY = "updown.config";

/** The durations a chain may run. Not free-form: each duration is a separate chain
 *  with its own timer and its own liquidity, and the 5-minute grid is what lets a
 *  15- and 30-minute round share observations with the 5-minute ones. A 7-minute
 *  duration would not land on the grid and would break that sharing. */
export { ALLOWED_DURATIONS, OBSERVATION_GRID_MINUTES, landsOnGrid } from "@/lib/updown-durations";
export type { Duration } from "@/lib/updown-durations";
import { ALLOWED_DURATIONS, roundSpanMinutes } from "@/lib/updown-durations";
import type { Duration } from "@/lib/updown-durations";

export type UpDownConfig = {
  /**
   * HOW a boundary's price is obtained. One control, one place.
   *
   * ⛔ `"feed"` IS THE ONLY METHOD THAT CAN ACTUALLY WORK, and the default for that
   * reason. `"ai"` — a model reading an approved web page — was the original design and
   * is provably incapable of meeting `maxStalenessSeconds`: probing candidate pages
   * through the real oracle prompt (`scripts/ops-updown-verify-source.mts`) returned
   * either a price with NO timestamp or one 9 hours to 7.3 days old, whether read by
   * `web_search` (crawl-index snippets) or `web_fetch` (cached pages, or client-side
   * widgets with nothing to read). Production proved it: 1,398 rounds opened, ZERO
   * readings confirmed, real player money stranded.
   *
   * `"ai"` is kept selectable because it is built, tested, and honest about refusing —
   * but an operator choosing it should expect every round to void and refund.
   */
  observationMethod: "feed" | "ai";
  /** Which market-data provider `"feed"` uses. `mock` refuses in production by construction. */
  feedProvider: FeedProviderId;
  /**
   * How far the source's OWN quoted timestamp may sit from the grid boundary before
   * the reading is refused. This is the honesty control: the source publishes when IT
   * priced the asset, we bound how stale that may be, and every surface shows the
   * source's time rather than pretending it is ours.
   */
  maxStalenessSeconds: number;
  /** Minimum AI confidence (0-100) to accept a price observation. */
  confidenceThreshold: number;
  /** Attempts before a boundary is declared FAILED and its rounds VOID + refund. */
  maxObservationAttempts: number;
  /**
   * How long after a boundary a DATED feed's "no bar for that minute" means *not yet*
   * rather than *never*, and therefore costs no attempt.
   *
   * ⚠️ MEASURED, NOT CHOSEN — AND MEASURED THREE TIMES, BECAUSE THE FIRST TWO WERE WRONG.
   *
   * 1. **30s**, on BTC/USD, ETH/USD and XAU/USD publishing bar T at **+10s**. Too tight.
   * 2. **120s**, after SOL/USD appeared to publish at **+60s** — which the shadow sampler
   *    surfaced as a 50% `no-bar` rate that looked, for a while, like SOL having no bars at
   *    all. It does have them: a contiguous 5-hour pull returned **300/300 minutes present**.
   * 3. ⛔ **Re-measured 2026-08-04 with `ops-updown-probe-sol.mts`, polling the just-completed
   *    minute every 10s: SOL/USD appeared at +1s, identically to BTC/USD.** The +60s figure
   *    does not reproduce. It was almost certainly an artefact of the QUOTE reader's staleness
   *    judgement — `last_quote_at` is a minute label **rounded up** (E-74), so a fresh quote can
   *    read as a full minute stale — rather than a property of the bar feed at all.
   *
   * ⭐ **The value STAYS at 120s regardless**, and that is the point of a grace: it costs
   * nothing when bars are prompt, and the one thing it must never do is charge an attempt for a
   * bar that is merely *not yet*. Spending an attempt VOIDs live rounds. Sizing this to the
   * fastest measurement would re-create exactly the failure it exists to prevent — which is how
   * SOL came to be **290 of 290 rounds source-failed** under the quote reader (E-63).
   *
   * ⛔ **DO NOT tighten this on the strength of one clean poll.** A number that was wrong twice
   * in one day is a number to leave generous.
   *
   * ⚠️ Still comfortably inside the abandon deadline (390s), so a bar that genuinely never
   * publishes still reaches a terminal state on time — it simply voids on the deadline rather
   * than on a spent budget, which is the more honest of the two endings anyway.
   * ⭐ Re-measure this when a new symbol is offered. It is a property of the PROVIDER'S
   * coverage of that instrument, not a constant.
   *
   * ⛔ Applies to DATED feeds only. A quote feed cannot return this reason at all.
   */
  barPublicationGraceSeconds: number;
  /**
   * How far back a DATED feed may still be asked to settle a round, in seconds.
   *
   * ⛔ THIS IS WHAT MAKES A LATE CLOSE HARMLESS, AND IT IS THE POINT OF THE REBUILD.
   * A quote can only answer "now", so a round whose close was missed had no price and had
   * to void — E-69 (529s late, `closePrice NULL`, source never failed), E-63, E-68. A dated
   * bar returns the same number six hours later, so the honest response to a late close is
   * to READ IT, not to refund a round the market decided perfectly clearly.
   *
   * The bound exists so "late" cannot become "unbounded": beyond it the round voids and
   * refunds, which keeps the standing invariant that every stake reaches a terminal state.
   * 24h is comfortably longer than any outage this platform has had and comfortably shorter
   * than the provider's own 1-minute history.
   */
  maxSettleLookbackSeconds: number;
  /**
   * Backoff between attempts, in seconds, index-matched to the attempt number:
   * `retryBackoffSeconds[0]` is the wait before attempt 2, `[1]` before attempt 3,
   * and so on. Shorter than `maxObservationAttempts - 1`? The last value repeats.
   *
   * ⚠️ READ BY `retryDelaySeconds()` BELOW, AND BY NOTHING ELSE. Until 2026-08-01
   * this field was read by NOTHING — the ladder the whole design rests on had never
   * run, so a boundary that refused once was never asked again and its round stayed
   * open forever (finding E-24). If you add a second reader, delete one of them.
   */
  retryBackoffSeconds: number[];
  /** Default stake bounds when a chain does not override them. */
  defaultMinStake: number;
  defaultMaxStake: number;
  /**
   * The fee profile a NEW chain gets by default.
   *
   * ⭐ **`loser-share` — 13% of the LOSING side (Platform 3% + Operator 10%).**
   * Ali, 2026-08-14. **This SUPERSEDES the 2026-07-24 ruling** that gave Up & Down
   * `capped-commission` at 13% of the pool with a ⅓ ceiling. Both games now charge the
   * same thing, in the same words. See `docs/RULES.md` §2.1 and
   * `docs/COMPLIANCE-DECISIONS.md` § 2026-08-14.
   *
   * ⚠️ THE INCOME CONSEQUENCE IS ACCEPTED AND RECORDED. On a balanced round the fee
   * halves — 13% of the whole pool becomes 13% of half of it (TZS 1,300 → TZS 650 on a
   * balanced TZS 10,000 round). That is deliberate: one charge model the customer can
   * understand beats two that need a diagram. Do not "restore" the ceiling.
   *
   * ⚠️ `feeCeilingRate` stays present and INERT. `poolFee`'s loser-share arm never reads
   * it, but a snapshot written from this profile is read back by code that may look for
   * the field; leaving it defined means an old reader sees a number rather than
   * `undefined`. It governs nothing here.
   *
   * ⛔ Frozen onto each round at creation, so the two models never mix — and a round that
   * opened before the switch settles by the ceiling maths forever. Nothing may rewrite,
   * backfill or migrate a `feeSnapshot`.
   *
   * ⛔ AND THE 16 CHAIN ROWS DO NOT INHERIT THIS. `rateProfileFor` returns
   * `chain.rateProfile ?? cfg.defaultRateProfile`, and every live chain carries its own
   * copy — changing this constant alone would leave the whole board on the old model.
   */
  defaultRateProfile: Partial<RateConfig>;
  /**
   * The winning-boundary margin, in basis points, a NEW chain gets by default and every
   * round inherits when its chain has no override. **50 = 0.5%** — the "50pick" factor from
   * the pricing model: UP wins at base + 0.5%, DOWN at base − 0.5%, otherwise the round
   * VOIDs and every stake is refunded. Frozen onto each round at open (editing it only
   * affects FUTURE rounds). 0 disables the %-band and reverts to the source's min-move rule.
   */
  defaultMarginBps: number;
  /**
   * ⭐ THE MARGIN LADDER — finding **E-32**, decided by Ali 2026-08-02 ("balanced").
   *
   * `defaultMarginBps` above is ONE number for every duration and every asset class, and
   * that is measurably unworkable. Measured on real 1-minute bars from the live provider
   * (`npm run ops:updown-margin-study`, ~1,000 windows per row, weekend synthetic bars
   * excluded — see E-36), **0.50% voids 96-100% of rounds at every duration this platform
   * offers**:
   *
   * ```
   *              median move   void @0.50%   void @ the value chosen below
   *   BTC   5m       0.031%        99.7%          37.6%  (2 bps)
   *   BTC  15m       0.058%        98.5%          29.1%  (3 bps)
   *   BTC  30m       0.087%        96.4%          27.1%  (5 bps)
   *   XAU   5m       0.043%       100.0%          27.7%  (2 bps)
   *   XAU  15m       0.069%       100.0%          24.8%  (3 bps)
   *   XAU  30m       0.115%        97.1%          23.5%  (5 bps)
   * ```
   *
   * A chain left on 0.50% voids nearly every round **while the feed works perfectly**, and
   * the round history is then indistinguishable from findings E-16 / E-25 — the two outages
   * that made every round VOID for the platform's first 1,402. That is the worst failure
   * mode available: safe, silent, and it looks exactly like the bug that was just fixed.
   *
   * Why 0.50% is not simply "a bit wide": the median move scales as **√duration** (measured
   * 0.031 / 0.058 / 0.087 / 0.120% at 5/15/30/60 min — a √t fit to within 8%). Solving for
   * 0.50% gives a window of roughly **23 hours**. 0.50% is a sane margin for a DAILY round.
   * It is ~16× too wide for an hour and ~100× too wide for five minutes.
   *
   * ⚠️ Rounded rules, and why they are not tidier. `category` is the asset's own category, so
   * the per-asset-class axis Ali asked for is expressible — but the two classes actually live
   * (`crypto`, `macro`) measured within 0.01% of each other at equal duration, so populating
   * them with duplicate ladders would only invite silent drift. Duration is the axis that
   * matters; the ladder is therefore `"*"`. **The exception is already measured**: EUR/USD
   * (also `macro`) has a median 5-minute move of **0.012%**, a THIRD of gold's, so a forex
   * asset needs ~1 bps and must get either its own rule here or a per-chain override — the
   * `macro` ladder would void ~70% of its 5-minute rounds.
   *
   * Resolution order, most specific first: the chain's own `marginBps` → the narrowest
   * matching rule here → `defaultMarginBps`. Frozen onto each round at open, as before.
   */
  marginSchedule: MarginRule[];
};

/**
 * One rung of the margin ladder. Matches a round when its asset's category matches
 * `category` (or `category` is `"*"`) and its duration is ≤ `maxDurationMinutes`.
 */
export type MarginRule = {
  /** An asset category (`crypto`, `macro`, …), or `"*"` for any. */
  category: string;
  /** Applies to rounds of at most this many minutes. */
  maxDurationMinutes: number;
  /** The winning-boundary margin, in basis points. */
  bps: number;
};

export const DEFAULT_UPDOWN_CONFIG: UpDownConfig = {
  // `feed` by default because it is the only method that can meet the staleness window —
  // see the field comment. `mock` refuses in production by construction, so a fresh
  // deployment cannot accidentally settle money on an invented price.
  observationMethod: "feed",
  feedProvider: "mock",
  maxStalenessSeconds: 90,
  confidenceThreshold: 85,
  maxObservationAttempts: 4,
  // Deliberately generous, not tuned: measured at +10s, then +60s, then +1s across one day.
  // A grace costs nothing when bars are prompt, and spending an attempt VOIDs live rounds.
  // ⛔ Do not tighten. See the field comment for all three measurements.
  barPublicationGraceSeconds: 120,
  // 24h — longer than any outage this platform has had, shorter than the provider's history.
  maxSettleLookbackSeconds: 86_400,
  retryBackoffSeconds: [15, 45, 120],
  // TZS 1,000 / 1,000,000 PER BET — the platform rule, shared with polls (docs/RULES.md
  // §2.3). All 16 chains carry NULL min/max and inherit these; `stakeBoundsFor` also
  // FLOORS every chain at the product minimum, so a legacy row below it can never take a
  // sub-floor stake.
  defaultMinStake: PLATFORM_MIN_STAKE,
  defaultMaxStake: PLATFORM_MAX_STAKE,
  defaultRateProfile: {
    // ⭐ loser-share, 13% of the LOSING side — see the field's doc-comment above for why
    // this superseded capped-commission on 2026-08-14 and what it costs us.
    feeModel: "loser-share",
    platformFeeRate: 0.03,
    operatorFeeRate: 0.10,
    // ⚠️ INERT under loser-share — `poolFee` never reads it. Kept defined so a reader of
    // an old snapshot never sees `undefined` where it expects a number. It governs nothing.
    feeCeilingRate: 1 / 3,
    // Display-only: the "× 1.4 est." headline on the Up/Down buttons. It is an
    // ESTIMATE, never fixed odds — the card carries the qualifier that says so.
    estimatedWinningsRate: 0.4,
    showEstimatedWinnings: true,
  },
  // ⛔ ZERO — THE MARGIN IS NOW THE TICK FLOOR (Ali's decision, 2026-08-04).
  //
  // `computeTargets` floors the band at `minMoveTicks × 10^-decimals`, so a 0 bps margin means
  // "the band IS the asset's minimum meaningful move". That floor stops being a safety net and
  // becomes the load-bearing rule.
  //
  // ⚠️ MEASURED, on 5,000 real 1-minute bars per asset. The curve is brutally steep — between
  // 0% and 0.01% the void rate leaps from ~1% to ~20%:
  //
  //     BTC 5m   median move 0.031%   @0.00% → 0.5% void   @0.02% → 36.6% void
  //     ETH 5m   median move 0.043%   @0.00% → 0.6%        @0.02% → 26.6%
  //     XAU 5m   median move 0.023%   @0.00% → 28.5%       @0.02% → 47.7%
  //
  // **There is no setting that gives both a visible winning band and a ~95% pay rate.** Ali
  // chose the pay rate: ~99% of rounds decide, against ~63% today.
  //
  // ⛔ CONSEQUENCE ACCEPTED, AND IT CHANGES THE COPY: the Up/Down target tiles now sit
  // essentially AT the open price, so the card reads as **higher or lower**, not "reach the
  // boundary". A card still promising a boundary would be describing a game we no longer run.
  defaultMarginBps: 0,
  // ⛔ EMPTY — every duration now runs at the TICK FLOOR (Ali's decision, 2026-08-04).
  //
  // ⚠️ THIS REPLACES THE E-32 LADDER, AND THE LADDER WAS NOT WRONG. It targeted a ~25-40%
  // void rate, which was Ali's "balanced" call at the time and was measured honestly. The
  // decision that superseded it is a different answer to a different question: not *"what
  // band feels fair"* but *"how often should a round refund at all"*, and the answer is
  // almost never. A round that refunds pays 0% fee and hands a "winner" their stake back
  // (E-65), so a 25-40% void rate is a quarter of the product not happening.
  //
  // ⭐ An empty schedule is a MEANINGFUL value, not an omission: `resolveScheduledMarginBps`
  // returns null and the caller falls back to `defaultMarginBps`, which is now 0 — the tick
  // floor. The per-chain override still exists for an operator who wants a wider band on one
  // chain, so this is a default, not a hard-coding.
  marginSchedule: [],
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_CONFIG: UpDownConfig | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_UPDOWN_CONFIG_HYDRATED: boolean | undefined;
}

function cfgStore(): UpDownConfig {
  return (globalThis.__50PICK_UPDOWN_CONFIG ??= { ...DEFAULT_UPDOWN_CONFIG });
}

/** Persisted-config schema version — bump when a frozen legacy default must move forward.
 *  v2 (2026-07-27): default stake bounds 100/100,000 → 1,000/1,000,000.
 *  v3 (2026-08-14): 500 → 1,000 and 100,000 → 1,000,000. Production was measured on
 *      **500 / 100,000** on 2026-08-14 while this file had read 1,000/1,000,000 since
 *      2026-07-27 — v2's reconcile only moves a bound sitting on exactly 100/100,000,
 *      so a stored 500 was invisible to it. ⛔ A CODE DEFAULT IS NOT A LIVE SETTING.
 *      All 16 chains carry NULL min/max and therefore inherit these two numbers; the
 *      chain rows must NOT be touched for this.
 *  v4 (2026-08-14): defaultRateProfile capped-commission → loser-share (A2). ⛔ The 16
 *      UpDownChain rows carry their OWN rateProfile and are NOT reached by this — see
 *      `ops:updown-loser-share`. */
const UPDOWN_CONFIG_VERSION = 4;

/**
 * Forward-reconcile a config persisted under an older UPDOWN_CONFIG_VERSION.
 *
 * `saveConfig` writes the WHOLE blob, so a value that was merely the OLD default freezes
 * in the DB and shadows a new code default forever. This bumps ONLY values still sitting
 * on a known legacy default, so a deliberate operator choice is never overwritten.
 *
 * ⛔ Pure and EXPORTED on purpose. It used to be four lines inside `ensureHydrated`,
 * where nothing could execute it — so `test:updown-config` could assert the CONSTANT was
 * 1,000 and pass green while production sat on 500 for two and a half weeks. A migration
 * that cannot be run by a test is a migration nobody has ever seen work.
 */
export function reconcileUpDownDefaults(
  config: UpDownConfig,
  fromVersion: number,
): { config: UpDownConfig; changed: boolean } {
  const c = { ...config };
  let changed = false;
  const bump = (key: "defaultMinStake" | "defaultMaxStake", legacy: number) => {
    if (c[key] === legacy) { c[key] = DEFAULT_UPDOWN_CONFIG[key]; changed = true; }
  };
  if (fromVersion < 2) {
    bump("defaultMinStake", 100);
    bump("defaultMaxStake", 100_000);
  }
  if (fromVersion < 3) {
    // 500 → 1,000 and 100,000 → 1,000,000. THE BOUNDS ARE A RULE, NOT A PREFERENCE
    // (Ali, 2026-08-14): TZS 1,000 minimum and TZS 1,000,000 maximum PER BET, on BOTH
    // products. Up & Down was the product still on 500 / 100,000 in production.
    bump("defaultMinStake", 500);
    bump("defaultMaxStake", 100_000);
  }
  if (fromVersion < 4) {
    // A2 · capped-commission → loser-share (Ali, 2026-08-14; docs/RULES.md §2.1).
    //
    // ⛔ ONLY a profile still sitting on the exact retired default is moved. An operator
    // who deliberately set something else keeps it — same rule as every bump above.
    // ⛔ THIS MOVES THE DEFAULT ONLY. Every UpDownChain row carries its OWN rateProfile
    // and `rateProfileFor` prefers it, so the 16 live chains are NOT reached from here.
    // They are migrated by `ops:updown-loser-share`, audited one at a time. A session
    // that changes this constant and stops has changed nothing a player can see.
    const p = c.defaultRateProfile ?? {};
    const isRetiredDefault =
      p.feeModel === "capped-commission" &&
      p.commissionRate === 0.13 &&
      Math.abs((p.feeCeilingRate ?? 0) - 1 / 3) < 1e-9;
    if (isRetiredDefault) {
      c.defaultRateProfile = { ...DEFAULT_UPDOWN_CONFIG.defaultRateProfile };
      changed = true;
    }
  }
  return { config: c, changed };
}

async function ensureHydrated(): Promise<void> {
  if (globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED) return;
  globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED = true;
  const stored = await loadConfig<Partial<UpDownConfig> & { v?: number }>(UPDOWN_CONFIG_KEY);
  // Merge OVER the defaults, so a newly-added field gets its default rather than
  // undefined on a deployment whose persisted blob predates it.
  if (stored) {
    globalThis.__50PICK_UPDOWN_CONFIG = { ...DEFAULT_UPDOWN_CONFIG, ...stored };
    // One-time forward migration: bump default stake bounds still on the legacy defaults
    // (a deliberate custom value is untouched). Self-heals on first read after deploy.
    const storedVersion = stored.v ?? 1;
    if (storedVersion < UPDOWN_CONFIG_VERSION) {
      const { config, changed } = reconcileUpDownDefaults(globalThis.__50PICK_UPDOWN_CONFIG, storedVersion);
      globalThis.__50PICK_UPDOWN_CONFIG = config;
      void saveConfig(UPDOWN_CONFIG_KEY, { ...config, v: UPDOWN_CONFIG_VERSION });
      if (changed) console.log(`[updown-config] reconciled v${storedVersion} → v${UPDOWN_CONFIG_VERSION}: stake bounds now ${config.defaultMinStake}/${config.defaultMaxStake}`);
    }
  }
}

export async function getUpDownConfig(): Promise<UpDownConfig> {
  await ensureHydrated();
  return { ...cfgStore() };
}

export async function setUpDownConfig(
  updates: Partial<UpDownConfig>,
  officerId: string,
): Promise<{ ok: true; config: UpDownConfig; warn?: string } | { ok: false; error: string }> {
  await ensureHydrated();

  if (updates.maxStalenessSeconds !== undefined) {
    const s = updates.maxStalenessSeconds;
    // Upper bound is not arbitrary: at 300s a 5-minute round could settle against a
    // reading taken a whole round away from its own boundary, which is no longer a
    // price "at" that instant in any meaningful sense.
    if (!Number.isFinite(s) || s < 5 || s > 300) {
      return { ok: false, error: "Staleness window must be 5-300 seconds. Above 300s a 5-minute round could settle on a reading a whole round old." };
    }
  }
  if (updates.confidenceThreshold !== undefined) {
    const c = updates.confidenceThreshold;
    if (!Number.isFinite(c) || c < 50 || c > 100) {
      return { ok: false, error: "Confidence threshold must be 50-100." };
    }
  }
  if (updates.maxObservationAttempts !== undefined) {
    const a = updates.maxObservationAttempts;
    if (!Number.isFinite(a) || a < 1 || a > 10) {
      return { ok: false, error: "Observation attempts must be 1-10." };
    }
  }
  if (updates.observationMethod !== undefined) {
    if (updates.observationMethod !== "feed" && updates.observationMethod !== "ai") {
      return { ok: false, error: 'Observation method must be "feed" or "ai".' };
    }
  }
  if (updates.feedProvider !== undefined) {
    // ⛔ THIS VALIDATOR IS THE ROLLBACK LEVER, and it reads the SHARED list rather than its own
    // copy. A provider that exists in the type but not in the list cannot be selected — and,
    // far worse, cannot be switched BACK off without a deploy. One list, one answer.
    if (!isFeedProviderId(updates.feedProvider)) {
      return { ok: false, error: `Feed provider must be one of: ${FEED_PROVIDERS.map((p) => p.id).join(", ")}.` };
    }
  }
  if (updates.retryBackoffSeconds !== undefined) {
    // Validated for the first time in E-24, because for the first time it is READ —
    // by `retryDelaySeconds()` below, and by nothing else.
    // A 0 or negative rung would make the ladder re-dial the paid price source on every
    // lifecycle tick; a huge one would push `abandonAfterSeconds` out past the point
    // where a stake is stuck for an hour. Both are money problems, not typos.
    //
    // ℹ️ MERGE NOTE (2026-08-01). The feed branch validated this same field at 0-3600.
    // The tighter 5-600 window is kept deliberately and it matters MORE now, not less:
    // with `observationMethod: "feed"` the thing being re-dialled is TwelveData, a
    // metered plan (800 credits/day), so a 0s rung is a quota burn, and the upper bound
    // is what keeps the derived `abandonAfterSeconds` deadline inside minutes.
    const b = updates.retryBackoffSeconds;
    if (!Array.isArray(b) || b.length === 0 || b.length > 10) {
      return { ok: false, error: "Retry backoff must be a list of 1-10 waits, in seconds." };
    }
    if (b.some((s) => !Number.isFinite(s) || s < 5 || s > 600)) {
      return { ok: false, error: "Each retry backoff must be 5-600 seconds. Below 5s the paid price source would be re-dialled on every tick." };
    }
  }
  if (updates.defaultMinStake !== undefined || updates.defaultMaxStake !== undefined) {
    const lo = updates.defaultMinStake ?? cfgStore().defaultMinStake;
    const hi = updates.defaultMaxStake ?? cfgStore().defaultMaxStake;
    if (!Number.isFinite(lo) || lo < PLATFORM_MIN_STAKE || lo > PLATFORM_MAX_STAKE) return { ok: false, error: `Minimum stake must be between TZS ${PLATFORM_MIN_STAKE.toLocaleString("en-GB")} and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")} — the platform bounds are a rule, not a setting.` };
    if (!Number.isFinite(hi) || hi < lo || hi > PLATFORM_MAX_STAKE) return { ok: false, error: `Maximum stake must be between the minimum and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")}.` };
  }
  if (updates.defaultMarginBps !== undefined) {
    const m = updates.defaultMarginBps;
    // 0 = no %-band (revert to the source min-move); cap at 2000 bps (20%) — beyond that a
    // round would almost never reach a boundary and would void perpetually.
    if (!Number.isInteger(m) || m < 0 || m > 2000) {
      return { ok: false, error: "Round margin must be a whole number of basis points, 0-2000 (0-20%). 50 = 0.5%." };
    }
  }
  if (updates.marginSchedule !== undefined) {
    // Validated for the same reason `retryBackoffSeconds` is: this list decides what a
    // winning boundary IS, so a malformed rung is a money problem, not a typo. An empty
    // list is allowed and means "fall back to defaultMarginBps for everything" — which is
    // the pre-E-32 behaviour, and an operator must be able to get back to it.
    const s = updates.marginSchedule;
    if (!Array.isArray(s) || s.length > 40) {
      return { ok: false, error: "Margin schedule must be a list of at most 40 rules." };
    }
    for (const r of s) {
      if (!r || typeof r.category !== "string" || !r.category) {
        return { ok: false, error: 'Each margin rule needs a category (an asset category, or "*" for any).' };
      }
      if (!Number.isInteger(r.maxDurationMinutes) || r.maxDurationMinutes < 1 || r.maxDurationMinutes > 20_160) {
        return { ok: false, error: "Each margin rule's maximum duration must be a whole number of minutes, 1-20160 (14 days)." };
      }
      if (!Number.isInteger(r.bps) || r.bps < 0 || r.bps > 2000) {
        return { ok: false, error: "Each margin rule's margin must be a whole number of basis points, 0-2000 (0-20%)." };
      }
    }
  }

  let warn: string | undefined;
  if (updates.defaultRateProfile !== undefined) {
    // THE SAME validator global config uses — including the winner-floor guardrail.
    const v = validateRateConfig(updates.defaultRateProfile);
    if (!v.ok) return { ok: false, error: v.reason };
    warn = v.warn;
  }

  const before = { ...cfgStore() };
  globalThis.__50PICK_UPDOWN_CONFIG = { ...before, ...updates };
  void saveConfig(UPDOWN_CONFIG_KEY, { ...cfgStore(), v: UPDOWN_CONFIG_VERSION });
  audit({
    category: "ADMIN",
    action: "updown.config.updated",
    actorId: officerId,
    targetType: "UpDownConfig",
    targetId: "global",
    payload: { before, after: cfgStore(), changes: updates, warn: warn ?? null },
  });
  return { ok: true, config: { ...cfgStore() }, warn };
}

// ---------------------------------------------------------------------------
// The retry ladder — pure, and the deadline that makes a stake's exit certain
// ---------------------------------------------------------------------------
//
// FINDING E-24 (live QA, 2026-08-01). A player's TZS 500 entered round #155 on
// production and had NO path out: the ladder below was dead config, `advanceChain`
// orphans a pending round at the very next boundary, the market settle sweep
// deliberately excludes Up & Down, stopping the chain does not void its rounds, and
// the operator's remedy had no UI. Five independent mechanisms, all absent.
//
// What follows is the arithmetic behind the one invariant that makes that
// impossible: EVERY ROUND REACHES A TERMINAL STATE WITHIN `abandonAfterSeconds` OF
// ITS OWN BOUNDARY, whatever the oracle, the AI budget, or the chain's state does.
// `healStuckRounds()` in updown-service.ts is what enforces it.

/** One extra lifecycle tick (60s) on either side of the ladder, so the ladder always
 *  gets to finish on its own terms and the deadline stays a BACKSTOP, not the primary
 *  mechanism. See `abandonAfterSeconds`. */
export const ABANDON_GRACE_SECONDS = 120;

/**
 * How long to wait before attempt number `attemptsSoFar + 1`.
 *
 * `attemptsSoFar = 0` → 0: the first reading is taken AT the boundary, by the
 * scheduler, with no delay. After that the ladder applies, and a ladder shorter than
 * the attempt budget repeats its last rung rather than collapsing to zero — a config
 * that runs out of rungs must not turn into "retry as fast as the ticker runs".
 */
export function retryDelaySeconds(cfg: UpDownConfig, attemptsSoFar: number): number {
  if (attemptsSoFar <= 0) return 0;
  const ladder = cfg.retryBackoffSeconds;
  if (!Array.isArray(ladder) || ladder.length === 0) return 0;
  const v = ladder[Math.min(attemptsSoFar, ladder.length) - 1];
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Total wall-clock the ladder covers: the sum of every rung it will actually climb,
 *  given the attempt budget. Defaults ([15,45,120], 4 attempts) → 180s. */
export function ladderSpanSeconds(cfg: UpDownConfig): number {
  let total = 0;
  for (let n = 1; n < cfg.maxObservationAttempts; n++) total += retryDelaySeconds(cfg, n);
  return total;
}

/**
 * THE DEADLINE. Past this many seconds after its boundary, a round is closed and every
 * stake refunded in full — without asking the oracle again, because by then no reading
 * could be accepted even if one arrived.
 *
 * DERIVED, not a magic number, and each term is load-bearing:
 *   ladderSpan          — the ladder must be allowed to finish first;
 *   maxStalenessSeconds — the widest gap from the boundary a reading may EVER have,
 *                         so beyond it a fresh quote is necessarily too stale to use;
 *   ABANDON_GRACE       — two lifecycle ticks, so a missed tick does not race the ladder.
 * Defaults: 180 + 90 + 120 = 390s. A stake is therefore never stuck for more than
 * ~6½ minutes past its round's boundary, on any code path.
 */
export function abandonAfterSeconds(cfg: UpDownConfig): number {
  return ladderSpanSeconds(cfg) + cfg.maxStalenessSeconds + ABANDON_GRACE_SECONDS;
}

// ---------------------------------------------------------------------------
// The grid — pure, so it is exhaustively testable without a clock or a timer
// ---------------------------------------------------------------------------

/**
 * The first grid boundary STRICTLY AFTER `fromMs`.
 *
 * Derived as `anchor + k·duration`, never accumulated from a previous value, so a
 * restart, a missed fire or a slow tick cannot drift the grid. Given the same anchor
 * and duration, every instance and every restart computes the same boundaries —
 * which is what lets a 5-, 15- and 30-minute chain agree on the instants they share.
 */
export function boundaryAfter(anchorMs: number, durationMinutes: number, fromMs: number): number {
  // ⭐ THE STEP IS THE ROUND'S SPAN, NOT ITS BETTING WINDOW (Ali, 2026-08-04). A round now runs
  // `durationMinutes` of betting PLUS a result phase, so consecutive rounds are `span` apart.
  // Stepping by `durationMinutes` here would overlap each round with the previous one's result
  // phase and hand two live rounds to the same chain.
  // ⛔ VALIDATE THE DURATION, NOT THE DERIVED STEP. `roundSpanMinutes` adds a result phase of at
  // least one minute, so a zero or negative duration would produce a POSITIVE step and this
  // guard would wave it through — a chain with a nonsense duration would then quietly emit
  // rounds every minute instead of throwing. Caught by 1.9 in updown-config.test.mts.
  if (!(durationMinutes > 0)) throw new Error("boundaryAfter: duration must be positive");
  const step = roundSpanMinutes(durationMinutes) * 60_000;
  // Math.floor (not trunc) so a `fromMs` BEFORE the anchor still lands correctly on
  // a negative k rather than skipping forward a whole step.
  const k = Math.floor((fromMs - anchorMs) / step) + 1;
  return anchorMs + k * step;
}

/** The grid boundary at or before `atMs` — i.e. the start of the round covering it. */
export function boundaryAtOrBefore(anchorMs: number, durationMinutes: number, atMs: number): number {
  if (!(durationMinutes > 0)) throw new Error("boundaryAtOrBefore: duration must be positive");
  const step = roundSpanMinutes(durationMinutes) * 60_000;   // the SPAN — see boundaryAfter
  return anchorMs + Math.floor((atMs - anchorMs) / step) * step;
}

/**
 * A clean grid anchor: the next whole 5-minute mark at or after `fromMs`, on the
 * minute, with seconds and milliseconds zeroed.
 *
 * Anchoring every chain to the 5-minute grid is what makes observation sharing work
 * — a 15- and a 30-minute round only land on the same instants as the 5-minute
 * rounds if all three are anchored to the same lattice.
 */
export function cleanGridAnchor(fromMs: number): number {
  const FIVE_MIN = 5 * 60_000;
  return Math.ceil(fromMs / FIVE_MIN) * FIVE_MIN;
}

// ---------------------------------------------------------------------------
// Asset registry
// ---------------------------------------------------------------------------

export type AssetInput = {
  key: string;
  symbol: string;
  nameEn: string;
  nameSw: string;
  nameZh?: string | null;
  iconKey: string;
  priceSourceUrl: string;
  category?: MarketCategory;
  decimals?: number;
  minMoveTicks?: number;
  sortOrder?: number;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function validateAsset(input: AssetInput): Promise<{ ok: true; domain: string } | { ok: false; error: string }> {
  const key = (input.key ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(key)) {
    return { ok: false, error: "Asset key must be 2-12 characters, A-Z and 0-9 only (e.g. XAU)." };
  }
  for (const [label, v] of [["English name", input.nameEn], ["Swahili name", input.nameSw], ["symbol", input.symbol], ["icon", input.iconKey]] as const) {
    if (!v || !String(v).trim()) return { ok: false, error: `Asset ${label} is required.` };
  }
  const decimals = input.decimals ?? 2;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
    return { ok: false, error: "Decimals must be a whole number 0-8." };
  }
  // ⛔ THE FLOOR IS 2 TICKS, NOT 1, AND IT IS A MONEY RULE (§6ad scenario 1, 2026-08-04).
  //
  // At the tick-floor margin `computeTargets` produces a band of exactly `minMoveTicks × 10^-d`,
  // and that band is the entire difference between UP, DOWN and a refund. With `decimals: 2`
  // and `minMoveTicks: 1` the band is **0.01** while `toFixed(2)` rounding error is up to
  // **0.005** — so the band is only twice the noise it is measured against, and a round can be
  // decided by rounding rather than by the market.
  //
  // ⚠️ AND THIS IS LIVE, NOT THEORETICAL (E-73). Production carries TWO gold assets on
  // XAU/USD: `GOLD` (disabled, 15 ticks) and `XAU` (**enabled**, **1 tick**), and all 1,291
  // live gold rounds ran on the 1-tick one — a $0.01 band on a $4,056 asset, against a feed
  // whose own two endpoints disagree by $0.06-$0.20 at a single instant.
  //
  // ⭐ Existing assets are NOT rewritten by this: a stored 1 keeps working until an operator
  // saves the row. Refusing to SAVE a new 1 is what stops the population growing, and the
  // per-asset recommendation in the form is what moves the existing ones.
  const ticks = input.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR;
  if (!Number.isInteger(ticks) || ticks < MIN_MOVE_TICKS_FLOOR || ticks > 10_000) {
    return {
      ok: false,
      error:
        `Minimum move must be a whole number of ticks, ${MIN_MOVE_TICKS_FLOOR}-10000. ` +
        `At ${MIN_MOVE_TICKS_FLOOR - 1} tick the winning band is the same size as the rounding ` +
        `error on the price, so a round could be decided by rounding rather than by the market.`,
    };
  }

  // THE SOURCE GATE. One allowlist on the platform, not two.
  let domain: string;
  try {
    const u = new URL(input.priceSourceUrl);
    // ⛔ E-51 · HTTPS ONLY. The provider API key is sent as a QUERY PARAMETER
    // (`TwelveDataFeed.quote`), so a plaintext request would put a paid, metered credential
    // that settlement depends on onto the wire in the clear. Refused HERE, at the form, and
    // only here: `quoteAsset` silently UPGRADES an existing http endpoint instead of refusing
    // it, because refusing at read time would void and refund live rounds for a config typo.
    // ⚠️ Nothing caught this before, because `normalizeDomain(hostname)` throws the scheme away
    // before the allowlist check — so `http://api.twelvedata.com/quote` passed every gate, and
    // two production assets (SOL, XAU) were saved that way with SOL's chain running.
    if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
      return {
        ok: false,
        error:
          `Price source must use https:// — "${u.protocol}//" would send the provider API key ` +
          `in cleartext, because it travels as a query parameter. Use ` +
          `https://${u.hostname}${u.pathname}.`,
      };
    }
    domain = normalizeDomain(u.hostname);
  } catch {
    return { ok: false, error: "Price source must be a valid URL." };
  }
  const category = (input.category ?? "macro") as MarketCategory;
  const trusted = await isSourceTrusted(input.priceSourceUrl, category);
  if (!trusted.ok) {
    return {
      ok: false,
      error: `${trusted.reason}. Add the domain at /admin/sources under "${category}" and enable it first — a round resolves against this exact link, so it must be an approved source.`,
    };
  }
  return { ok: true, domain };
}

export async function listAssets(opts?: { enabledOnly?: boolean }): Promise<StoredAsset[]> {
  return assetStore.list(opts);
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  return assetStore.get(id);
}

export async function createAsset(input: AssetInput, officerId: string): Promise<ServiceResult<StoredAsset>> {
  // ⛔ E-46 — THE SYMBOL/CATEGORY GATE, ENFORCED HERE AND NOT ONLY IN THE FORM.
  // The Add-asset form now offers a symbol dropdown that locks the category, but a
  // dropdown is a courtesy, not a control: a stale tab or a scripted POST can still send
  // any pair. The category decides the TRADING CALENDAR (`sessionKindFor`), so a wrong one
  // silently shuts a 24/7 coin every weekend, or lets a shut market look open. Both were
  // created on production in a single afternoon before this existed.
  {
    const { validateSymbolCategory } = await import("./updown-symbols");
    const bad = validateSymbolCategory(input.symbol ?? "", input.category ?? "macro");
    if (bad) return { ok: false, error: bad };
  }
  const v = await validateAsset(input);
  if (!v.ok) return { ok: false, error: v.error };
  const key = input.key.trim().toUpperCase();
  if (await assetStore.getByKey(key)) {
    return { ok: false, error: `Asset "${key}" already exists.` };
  }
  const now = new Date().toISOString();
  const row: StoredAsset = {
    id: `uda_${randomId(8)}`,
    key,
    symbol: input.symbol.trim(),
    nameEn: input.nameEn.trim(),
    nameSw: input.nameSw.trim(),
    nameZh: input.nameZh?.trim() || null,
    iconKey: input.iconKey.trim(),
    priceSourceUrl: input.priceSourceUrl.trim(),
    sourceDomain: v.domain,
    category: input.category ?? "macro",
    decimals: input.decimals ?? 2,
    // ⛔ The FLOOR, not 1. The validator refuses an explicit 1, but an asset created
    // WITHOUT the field used to land on 1 anyway — the forbidden configuration, reached
    // through the door nobody was watching.  §3.5 caught this.
    minMoveTicks: input.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR,
    // NEW ASSETS START DISABLED. Enabling is a separate, audited act — creating a row
    // must never be enough to put an asset in front of real money.
    enabled: false,
    sortOrder: input.sortOrder ?? 0,
    createdBy: officerId,
    createdAt: now,
    updatedAt: now,
  };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.asset.created", actorId: officerId,
    targetType: "UpDownAsset", targetId: row.id,
    payload: { key: row.key, symbol: row.symbol, priceSourceUrl: row.priceSourceUrl, sourceDomain: row.sourceDomain, decimals: row.decimals, minMoveTicks: row.minMoveTicks },
  });
  return { ok: true, data: row };
}

/**
 * Rounds on this asset whose verdict has NOT been reached, and what is riding on them.
 *
 * Reuses what already exists — `chainStore.list({ assetId })`, `roundStore.list({ chainId,
 * unsettledOnly })` and `marketStore.get` for the money, because the money lives on the
 * market row and never in these tables. No new DAL method, no new index. It runs only on a
 * source edit, never on the hot path.
 */
async function unresolvedRoundsForAsset(assetId: string): Promise<{
  rounds: number; players: number; stakedTzs: number; chains: number; runningChains: number;
}> {
  const chains = await chainStore.list({ assetId });
  let rounds = 0, players = 0, stakedTzs = 0;
  for (const c of chains) {
    for (const r of await roundStore.list({ chainId: c.id, unsettledOnly: true, limit: 500 })) {
      if (r.resolvedAt) continue; // a verdict is reached; its money is on its way out
      rounds++;
      const m = await marketStore.get(r.marketId);
      if (m) { players += Number(m.predictorCount ?? 0); stakedTzs += Number(m.yesPool ?? 0) + Number(m.noPool ?? 0); }
    }
  }
  return { rounds, players, stakedTzs, chains: chains.length, runningChains: chains.filter((c) => c.state === "RUNNING").length };
}

export async function updateAsset(id: string, input: Partial<AssetInput>, officerId: string): Promise<ServiceResult<StoredAsset>> {
  const cur = await assetStore.get(id);
  if (!cur) return { ok: false, error: "Asset not found." };
  const merged: AssetInput = {
    key: input.key ?? cur.key,
    symbol: input.symbol ?? cur.symbol,
    nameEn: input.nameEn ?? cur.nameEn,
    nameSw: input.nameSw ?? cur.nameSw,
    nameZh: input.nameZh !== undefined ? input.nameZh : cur.nameZh,
    iconKey: input.iconKey ?? cur.iconKey,
    priceSourceUrl: input.priceSourceUrl ?? cur.priceSourceUrl,
    category: (input.category ?? cur.category) as MarketCategory,
    decimals: input.decimals ?? cur.decimals,
    minMoveTicks: input.minMoveTicks ?? cur.minMoveTicks,
    sortOrder: input.sortOrder ?? cur.sortOrder,
  };
  const v = await validateAsset(merged);
  if (!v.ok) return { ok: false, error: v.error };

  // ── THE SOURCE LOCK ────────────────────────────────────────────────────────
  // A round FREEZES its source link at open and resolves against THAT link. So the
  // asset's link may not move while a round that captured it is still unresolved — or the
  // asset row and the money's own record disagree, and there is no true sentence an
  // operator can say about which page decided the round.
  //
  // Scoped to UNRESOLVED rather than only to rounds holding money (Ali, 2026-07-30): a
  // round with no bets still spans two boundaries, and an edit landing mid-round would
  // leave its open read from one page and its close from another. Nobody loses money in
  // that case, but the published proof panel becomes incoherent. Widening costs nothing
  // operationally — pausing the chain is the documented first rung of the rollback ladder
  // and is what an operator does anyway.
  //
  // It lives in the SERVICE, not the action, for the same reason `setAssetEnabled`'s
  // running-chain refusal does: `updown-adversarial.test.mts` exists on the premise that
  // the UI hiding a control is not a control, and the service must refuse the crafted POST.
  const sourceChanged =
    merged.priceSourceUrl.trim() !== cur.priceSourceUrl || v.domain !== cur.sourceDomain;
  if (sourceChanged) {
    const live = await unresolvedRoundsForAsset(id);
    if (live.rounds > 0) {
      const money = live.stakedTzs > 0
        ? ` ${live.players} player(s) hold TZS ${live.stakedTzs.toLocaleString()} on them.`
        : " No stakes are on them yet, but their open and close would be read from different pages.";
      return {
        ok: false,
        error:
          `Cannot change the price source: ${live.rounds} round(s) on ${cur.key} have not resolved yet.${money} ` +
          `A round resolves against the link it captured when it opened, so the link cannot move underneath it. ` +
          `Pause this asset's ${live.runningChains} running chain(s) at /admin/updown, let the in-flight rounds ` +
          `settle, then change the link — the next round captures the new one.`,
      };
    }
  }

  // The key is the identity reports group by, so a rename must not collide.
  const newKey = merged.key.trim().toUpperCase();
  if (newKey !== cur.key) {
    const clash = await assetStore.getByKey(newKey);
    if (clash && clash.id !== id) return { ok: false, error: `Asset "${newKey}" already exists.` };
  }
  const row: StoredAsset = {
    ...cur,
    key: newKey,
    symbol: merged.symbol.trim(),
    nameEn: merged.nameEn.trim(),
    nameSw: merged.nameSw.trim(),
    nameZh: merged.nameZh?.trim() || null,
    iconKey: merged.iconKey.trim(),
    priceSourceUrl: merged.priceSourceUrl.trim(),
    sourceDomain: v.domain,
    category: merged.category ?? "macro",
    decimals: merged.decimals ?? 2,
    minMoveTicks: merged.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR,
    sortOrder: merged.sortOrder ?? 0,
    updatedAt: new Date().toISOString(),
  };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.asset.updated", actorId: officerId,
    targetType: "UpDownAsset", targetId: id,
    payload: { before: cur, after: row },
  });
  return { ok: true, data: row };
}

export async function setAssetEnabled(id: string, enabled: boolean, officerId: string): Promise<ServiceResult<StoredAsset>> {
  const cur = await assetStore.get(id);
  if (!cur) return { ok: false, error: "Asset not found." };
  if (enabled) {
    // Re-check the source at ENABLE time, not just at create time: a trusted source
    // can be disabled at /admin/sources after the asset was created, and enabling an
    // asset whose source is no longer approved would put an unverifiable link behind
    // real money.
    const trusted = await isSourceTrusted(cur.priceSourceUrl, cur.category as MarketCategory);
    if (!trusted.ok) {
      return { ok: false, error: `Cannot enable: ${trusted.reason}. Re-approve the source at /admin/sources first.` };
    }
  } else {
    // Disabling an asset must not silently strand running chains. Refuse, and make
    // the operator stop them explicitly — stopping a chain is itself an audited act.
    const running = (await chainStore.list({ assetId: id })).filter((c) => c.state === "RUNNING");
    if (running.length > 0) {
      return { ok: false, error: `Stop this asset's ${running.length} running chain(s) before disabling it.` };
    }
  }
  const row = { ...cur, enabled, updatedAt: new Date().toISOString() };
  await assetStore.upsert(row);
  audit({
    category: "ADMIN", action: enabled ? "updown.asset.enabled" : "updown.asset.disabled",
    actorId: officerId, targetType: "UpDownAsset", targetId: id,
    payload: { key: cur.key },
  });
  return { ok: true, data: row };
}

// ---------------------------------------------------------------------------
// Chain registry
// ---------------------------------------------------------------------------

export type ChainInput = {
  assetId: string;
  durationMinutes: Duration;
  minStake?: number | null;
  maxStake?: number | null;
  rateProfile?: Partial<RateConfig> | null;
  /** Winning-boundary margin (bps); null/undefined = inherit the product default. */
  marginBps?: number | null;
};

/**
 * Shared validation for a margin override (bps). Null = inherit; else a whole 0-2000.
 *
 * Exported so the AI proposal pipeline validates a proposed margin against the SAME rule
 * the admin form uses. A second copy would drift, and the drift would surface only as a
 * chain armed with a band the console itself would have refused.
 */
export function checkMarginBps(m: number | null | undefined): string | null {
  if (m == null) return null;
  if (!Number.isInteger(m) || m < 0 || m > 2000) {
    return "Margin must be a whole number of basis points, 0-2000 (0-20%). Leave blank to inherit the default (0.5%).";
  }
  return null;
}

export async function listChains(opts?: { assetId?: string; state?: ChainState }): Promise<StoredChain[]> {
  return chainStore.list(opts);
}

export async function getChain(id: string): Promise<StoredChain | null> {
  return chainStore.get(id);
}

export async function createChain(input: ChainInput, officerId: string): Promise<ServiceResult<StoredChain>> {
  const asset = await assetStore.get(input.assetId);
  if (!asset) return { ok: false, error: "Asset not found." };
  if (!ALLOWED_DURATIONS.includes(input.durationMinutes)) {
    return {
      ok: false,
      error:
        `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes. Each of these divides ` +
        `the day evenly, so its boundaries land on a lattice anchored at midnight UTC — which is ` +
        `what lets rounds of different lengths share one price reading.`,
    };
  }
  // ⛔ THE SERVER-SIDE DURATION GATE. A dropdown is a courtesy, not a control: a stale page, a
  // scripted POST or a second tab can still submit anything. This is the same function the form
  // greys options with, so the console and the money path can never disagree about whether a
  // pairing is allowed — and gold at 5 minutes is refused here even if the option is clicked.
  // ⚠️ Dynamic import for the same reason `validateSymbolCategory` uses one below: the symbol
  // catalogue reaches `market-calendar`, and a static cycle here breaks the config module.
  // ⭐ …AND IT IS FED THE ASSET'S OWN MEASURED RECORD, so the refusal and the greyed option in
  // the Add-chain form are computed from the same history by the same function. Keyed on
  // `asset.key`, which is what `UpDownObservation` groups by — `asset.symbol` would silently
  // find nothing and quietly disarm the measured half of the gate.
  // ⭐ G1 · AND ITS MOVEMENT RECORD, THE SECOND AXIS. The line above answers "can we price it in
  // time"; this answers "does it move enough to decide". ⛔ Both are passed here, on the write
  // path, or the console greys an option the server would still accept — which is the same
  // "a control that offers what the server refuses" defect in the other direction.
  // ⭐ …AND THE PROVIDER'S OWN TAPE, THE THIRD AXIS. ⛔ Passed here for exactly the reason the
  // two lines above give: a console that greys an option the server would still accept is the
  // defect, not the fix. Keyed by `asset.symbol` — the PROVIDER's symbol, which is what the
  // playbook profiles are stored under, and deliberately not `asset.key`, which is ours.
  const { validateSymbolDuration, findSymbol } = await import("./updown-symbols");
  const { feedAdviceFor, movementAdviceFor } = await import("./updown-feed-history");
  const { playbookVerdictFor, toReadinessAdvice } = await import("./updown-playbook-store");
  const catalogueMin = findSymbol(asset.symbol)?.minDurationMinutes ?? null;
  const [measured, movement, playbook] = await Promise.all([
    feedAdviceFor(asset.key, input.durationMinutes),
    movementAdviceFor(asset.key, input.durationMinutes),
    playbookVerdictFor(asset.symbol, input.durationMinutes, catalogueMin),
  ]);
  const durationErr = validateSymbolDuration(
    asset.symbol, input.durationMinutes, measured, movement, toReadinessAdvice(playbook),
  );
  if (durationErr) return { ok: false, error: durationErr };
  const existing = (await chainStore.list({ assetId: input.assetId })).find((c) => c.durationMinutes === input.durationMinutes);
  if (existing) return { ok: false, error: `${asset.key} already has a ${input.durationMinutes}-minute chain.` };

  const cfg = await getUpDownConfig();
  const lo = input.minStake ?? cfg.defaultMinStake;
  const hi = input.maxStake ?? cfg.defaultMaxStake;
  if (!Number.isFinite(lo) || lo < PLATFORM_MIN_STAKE || lo > PLATFORM_MAX_STAKE) return { ok: false, error: `Minimum stake must be between TZS ${PLATFORM_MIN_STAKE.toLocaleString("en-GB")} and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")} — the platform bounds are a rule, not a setting.` };
  if (!Number.isFinite(hi) || hi < lo || hi > PLATFORM_MAX_STAKE) return { ok: false, error: `Maximum stake must be between the minimum and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")}.` };

  const profile = input.rateProfile ?? cfg.defaultRateProfile;
  const v = validateRateConfig(profile);
  if (!v.ok) return { ok: false, error: v.reason };
  const marginErr = checkMarginBps(input.marginBps);
  if (marginErr) return { ok: false, error: marginErr };

  const now = new Date().toISOString();
  const row: StoredChain = {
    id: `udc_${randomId(8)}`,
    assetId: input.assetId,
    durationMinutes: input.durationMinutes,
    // NEW CHAINS START STOPPED. Creating a chain must never start emitting rounds —
    // starting is a separate, audited act, and it is the first rung of the rollback
    // ladder in the other direction too.
    state: "STOPPED",
    gridAnchorAt: new Date(cleanGridAnchor(Date.now())).toISOString(),
    nextBoundaryAt: null,
    currentRoundId: null,
    minStake: input.minStake ?? null,
    maxStake: input.maxStake ?? null,
    rateProfile: profile as Record<string, unknown>,
    marginBps: input.marginBps ?? null,
    createdBy: officerId,
    createdAt: now,
    updatedAt: now,
  };
  await chainStore.upsert(row);
  audit({
    category: "ADMIN", action: "updown.chain.created", actorId: officerId,
    targetType: "UpDownChain", targetId: row.id,
    payload: { assetKey: asset.key, durationMinutes: row.durationMinutes, rateProfile: profile, minStake: row.minStake, maxStake: row.maxStake, warn: v.warn ?? null },
  });
  return { ok: true, data: row };
}

export async function updateChain(
  id: string,
  updates: { minStake?: number | null; maxStake?: number | null; rateProfile?: Partial<RateConfig> | null; marginBps?: number | null },
  officerId: string,
): Promise<ServiceResult<StoredChain>> {
  const cur = await chainStore.get(id);
  if (!cur) return { ok: false, error: "Chain not found." };

  const cfg = await getUpDownConfig();
  const lo = updates.minStake !== undefined ? (updates.minStake ?? cfg.defaultMinStake) : (cur.minStake ?? cfg.defaultMinStake);
  const hi = updates.maxStake !== undefined ? (updates.maxStake ?? cfg.defaultMaxStake) : (cur.maxStake ?? cfg.defaultMaxStake);
  if (!Number.isFinite(lo) || lo < PLATFORM_MIN_STAKE || lo > PLATFORM_MAX_STAKE) return { ok: false, error: `Minimum stake must be between TZS ${PLATFORM_MIN_STAKE.toLocaleString("en-GB")} and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")} — the platform bounds are a rule, not a setting.` };
  if (!Number.isFinite(hi) || hi < lo || hi > PLATFORM_MAX_STAKE) return { ok: false, error: `Maximum stake must be between the minimum and TZS ${PLATFORM_MAX_STAKE.toLocaleString("en-GB")}.` };

  const patch: Partial<StoredChain> = {};
  if (updates.minStake !== undefined) patch.minStake = updates.minStake;
  if (updates.maxStake !== undefined) patch.maxStake = updates.maxStake;
  if (updates.rateProfile !== undefined) {
    const profile = updates.rateProfile ?? cfg.defaultRateProfile;
    const v = validateRateConfig(profile);
    if (!v.ok) return { ok: false, error: v.reason };
    patch.rateProfile = profile as Record<string, unknown>;
  }
  if (updates.marginBps !== undefined) {
    const marginErr = checkMarginBps(updates.marginBps);
    if (marginErr) return { ok: false, error: marginErr };
    patch.marginBps = updates.marginBps;
  }
  await chainStore.patch(id, patch);
  audit({
    category: "ADMIN", action: "updown.chain.updated", actorId: officerId,
    targetType: "UpDownChain", targetId: id,
    // A rate change here reprices FUTURE rounds only — every round already created
    // carries its own frozen snapshot. Recording both sides makes that provable.
    payload: { before: { minStake: cur.minStake, maxStake: cur.maxStake, rateProfile: cur.rateProfile }, changes: patch, note: "Affects FUTURE rounds only — existing rounds keep the rates frozen onto them at creation." },
  });
  const after = await chainStore.get(id);
  return after ? { ok: true, data: after } : { ok: false, error: "Chain disappeared during update." };
}

/**
 * Start / pause / stop a chain — the operator's primary control and the first rung
 * of the rollback ladder (a pause needs no deploy and lets in-flight rounds settle
 * normally).
 *
 * Arming the timer is deliberately NOT done here: this module owns configuration,
 * the scheduler owns time. `updown-scheduler.ts` reacts to the state change.
 */
export async function setChainState(id: string, state: ChainState, officerId: string): Promise<ServiceResult<StoredChain>> {
  const cur = await chainStore.get(id);
  if (!cur) return { ok: false, error: "Chain not found." };
  if (cur.state === state) return { ok: true, data: cur };

  if (state === "RUNNING") {
    const asset = await assetStore.get(cur.assetId);
    if (!asset) return { ok: false, error: "Chain's asset no longer exists." };
    if (!asset.enabled) return { ok: false, error: `Enable the asset "${asset.key}" before starting its chains.` };
    // Re-check the source at START time for the same reason as at ENABLE time: the
    // operator may have disabled the domain since. A chain that cannot resolve is a
    // chain that takes bets it must then void.
    const trusted = await isSourceTrusted(asset.priceSourceUrl, asset.category as MarketCategory);
    if (!trusted.ok) {
      return { ok: false, error: `Cannot start: ${trusted.reason}. Re-approve the source at /admin/sources first.` };
    }
  }

  const patch: Partial<StoredChain> = { state };
  if (state === "RUNNING") {
    // Re-anchor on start so a chain resumed after a long pause does not compute
    // boundaries from a stale anchor far in the past.
    const anchorMs = cleanGridAnchor(Date.now());
    patch.gridAnchorAt = new Date(anchorMs).toISOString();
    patch.nextBoundaryAt = new Date(boundaryAfter(anchorMs, cur.durationMinutes, Date.now())).toISOString();
  } else {
    // PAUSED/STOPPED: clear the next boundary so nothing reads a schedule for a
    // chain that is not running. In-flight rounds are NOT touched — they settle
    // through the normal path.
    patch.nextBoundaryAt = null;
  }
  await chainStore.patch(id, patch);
  audit({
    category: "ADMIN",
    action: state === "RUNNING" ? "updown.chain.started" : state === "PAUSED" ? "updown.chain.paused" : "updown.chain.stopped",
    actorId: officerId, targetType: "UpDownChain", targetId: id,
    payload: { from: cur.state, to: state, durationMinutes: cur.durationMinutes, note: "In-flight rounds are unaffected and settle through the normal path." },
  });
  const after = await chainStore.get(id);
  return after ? { ok: true, data: after } : { ok: false, error: "Chain disappeared during state change." };
}

/**
 * The stake bounds in force for a chain — its own override, else the product default.
 * The product default is the FLOOR: a per-chain override may raise the minimum but never
 * drop it below `defaultMinStake` (the platform stake floor, currently 1,000). This
 * guarantees no surface can ever present a sub-floor stake, even if a chain row was
 * created/stored with an older, lower minimum before the floor was raised.
 */
export async function stakeBoundsFor(chain: StoredChain): Promise<{ min: number; max: number }> {
  const cfg = await getUpDownConfig();
  return {
    min: Math.max(chain.minStake ?? cfg.defaultMinStake, cfg.defaultMinStake),
    max: Math.max(chain.maxStake ?? cfg.defaultMaxStake, cfg.defaultMinStake),
  };
}

/**
 * The stake bounds in force for the round backing a given market, resolved through the
 * SAME `stakeBoundsFor` the board displays. This is the SINGLE source the money path
 * (`buyPosition`) reads for an Up & Down market, so what the card shows and what a bet is
 * validated against are one number, never two. Returns null when the market has no
 * Up & Down round (a long-form poll), letting the caller keep the global-config path.
 */
export async function stakeBoundsForUpDownMarket(marketId: string): Promise<{ min: number; max: number } | null> {
  const round = await roundStore.getByMarketId(marketId);
  if (!round) return null;
  const chain = await chainStore.get(round.chainId);
  if (!chain) return null;
  return stakeBoundsFor(chain);
}

/** The rate profile a chain freezes onto its rounds — its own, else the default. */
export async function rateProfileFor(chain: StoredChain): Promise<Partial<RateConfig>> {
  const cfg = await getUpDownConfig();
  return (chain.rateProfile as Partial<RateConfig> | null) ?? cfg.defaultRateProfile;
}

/**
 * The scheduled margin for a (category, duration) — the E-32 ladder, resolved most-specific
 * first: a rule naming this exact category beats a `"*"` rule, and among equally specific
 * rules the NARROWEST window that still covers this duration wins. Returns null when no rung
 * covers it, so the caller falls back to `defaultMarginBps` rather than guessing.
 *
 * ⚠️ "Narrowest matching" is what makes the ladder a ladder. A 5-minute round matches the
 * 5, 15, 30, 60, 240 and 1440-minute rungs; picking any but the tightest would price a
 * 5-minute round like a daily one, which is E-32 all over again.
 */
export function resolveScheduledMarginBps(
  cfg: UpDownConfig,
  category: string,
  durationMinutes: number,
): number | null {
  const matches = (cfg.marginSchedule ?? []).filter(
    (r) => (r.category === category || r.category === "*") && durationMinutes <= r.maxDurationMinutes,
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) =>
    // exact category first, then the tightest window
    (a.category === "*" ? 1 : 0) - (b.category === "*" ? 1 : 0) ||
    a.maxDurationMinutes - b.maxDurationMinutes);
  return matches[0]!.bps;
}

/**
 * The winning-boundary margin (bps) a chain applies — its own override, else the E-32 ladder
 * for its asset class and duration, else the product default.
 *
 * ⚠️ `asset` IS REQUIRED, and that is deliberate rather than convenient. Before E-32 this
 * took `(chain, cfg)` and returned one number for everything, which is precisely the defect:
 * a margin that cannot see how long the round is, or what it is on, cannot be right for both
 * a 5-minute crypto round and a daily metals one. Making the asset a parameter means a caller
 * cannot accidentally price a round without knowing what it is pricing.
 */
export function marginBpsForChain(
  chain: StoredChain,
  cfg: UpDownConfig,
  asset: { category: string },
): number {
  return chain.marginBps
    ?? resolveScheduledMarginBps(cfg, asset.category, chain.durationMinutes)
    ?? cfg.defaultMarginBps;
}

/**
 * The frozen winning boundaries for a round: `base ± (base × marginBps/10000)`, rounded to
 * the asset's price precision and FLOORED at the source's minimum move so a near-zero
 * margin still cannot be decided by sub-tick noise. Pure — the money-critical arithmetic,
 * exhaustively testable. Matches the pricing model exactly: base 4120, 50 bps → margin 20.6,
 * up 4140.6, down 4099.4.
 */
/**
 * ⛔ THE SMALLEST `minMoveTicks` AN ASSET MAY BE SAVED WITH.
 *
 * At the tick-floor margin the winning band IS `minMoveTicks × 10^-decimals`. One tick makes
 * that band the same order as the rounding error on the price itself, so the round is decided
 * by `toFixed` rather than by the market. Two is the minimum at which the band is meaningfully
 * larger than the noise it measures.
 *
 * ⚠️ It is NOT a claim that 2 is right for a given asset — it is the floor below which no
 * asset can be right. Gold needs far more (its own feed disagrees with itself by $0.06-$0.20),
 * which is what `recommendMinMoveTicks` is for.
 */
export const MIN_MOVE_TICKS_FLOOR = 2;

/**
 * The `minMoveTicks` an asset SHOULD carry, from measured facts about its price and its feed.
 *
 * ⛔ A NUMBER THE OPERATOR IS SHOWN, NOT ONE THEY MUST KNOW. Ali: *"I don't know how
 * knowledgeable my admins are in typing asset names"* — and this is a far harder question than
 * a symbol. The band has to clear three things at once:
 *
 *   1. **rounding** — half a tick at the asset's own precision, twice over (open and close);
 *   2. **the feed's own disagreement about a single instant** — measured at **$0.06-$0.20** on
 *      XAU/USD between `/quote` and the 1-minute bar, and at **$0.01** on BTC/USD;
 *   3. and it must still be far SMALLER than a typical move, or every round refunds.
 *
 * Returns the ticks, plus the reason in the operator's own terms so the form can say WHY.
 */
export function recommendMinMoveTicks(asset: {
  decimals: number;
  /** Roughly what the asset trades at. The band is absolute, so $63,000 and $73 differ hugely. */
  referencePrice: number;
  /** Measured max disagreement between the two readers at one instant, in price units. */
  feedNoiseAbs?: number;
}): { ticks: number; why: string } {
  const tickSize = Math.pow(10, -asset.decimals);
  // Rounding: up to half a tick on each of the two prices that decide the round.
  const roundingAbs = tickSize;
  const noiseAbs = asset.feedNoiseAbs ?? 0;
  // Clear the LARGER of the two, with a 2x margin so the band is not merely equal to the noise.
  const needAbs = Math.max(roundingAbs, noiseAbs) * 2;
  const ticks = Math.max(MIN_MOVE_TICKS_FLOOR, Math.ceil(needAbs / tickSize));
  const why =
    noiseAbs > roundingAbs
      ? `this feed disagrees with itself by up to ${noiseAbs.toFixed(asset.decimals)} at one instant, so a smaller band would be decided by which reading arrived`
      : `below this the band is the same size as the rounding error on the price, so the round would be decided by rounding`;
  return { ticks, why };
}

export function computeTargets(
  openPrice: number,
  marginBps: number,
  asset: { decimals: number; minMoveTicks: number },
): { margin: number; upTarget: number; downTarget: number } {
  const tick = asset.minMoveTicks * Math.pow(10, -asset.decimals);
  const raw = openPrice * (marginBps / 10_000);
  const margin = Math.max(Number(raw.toFixed(asset.decimals)), tick);
  return {
    margin,
    upTarget: Number((openPrice + margin).toFixed(asset.decimals)),
    downTarget: Number((openPrice - margin).toFixed(asset.decimals)),
  };
}

// ---------------------------------------------------------------------------
// THE LATE CLOSE — two decisions, pure, so the money rule can be proven exhaustively
// ---------------------------------------------------------------------------

/**
 * Does this refusal cost an attempt?
 *
 * ⛔ THE ATTEMPT BUDGET IS A MONEY CONTROL, NOT A COUNTER. Spending it declares the boundary
 * FAILED, which VOIDs every round on it and refunds every stake. So the only question that
 * matters is: *would asking again plausibly get a different answer?*
 *
 *   · `no-api-key` / `ai-paused`  an OPERATOR state. Nothing to retry into, and burning the
 *                                 budget would void live rounds for an ops mistake. Carved out
 *                                 already — this function does not change that, it names it.
 *   · `bar-not-published`         *not yet*, inside the measured publication delay. Asking
 *                                 again in 15 seconds genuinely does get a different answer.
 *   · everything else             a statement about the world. Retrying will not change it,
 *                                 so it must burn the budget or the round waits forever for a
 *                                 reading that is never coming.
 *
 * `elapsedSeconds` is measured from the ROUND'S BOUNDARY, never from wall-clock, so a heal
 * sweep running on an injected clock judges the same instant it claims to.
 */
export function refusalCostsAnAttempt(
  reason: RefusalReason,
  elapsedSeconds: number,
  cfg: Pick<UpDownConfig, "barPublicationGraceSeconds">,
): boolean {
  // The pre-existing carve-out, stated here rather than duplicated at the call site.
  if (reason === "no-api-key" || reason === "ai-paused") return false;
  // ⭐ E-86 · A RATE LIMIT NEVER COSTS A LIFE. It is the purest case of the question above:
  // the identical request succeeds a minute later, so charging it to the budget refunds a round
  // whose price was perfectly knowable. ⛔ And it cannot hang the round — `abandonAfterSeconds`
  // still bounds the boundary, and `acquireObservation` now spaces every read whether or not it
  // was charged, so a permanently rate-limited source ends in a bounded refund rather than a
  // tight loop. On production this voided BTC 3m #188 and BTC 5m #6 at +90s of a 390s deadline.
  if (reason === "rate-limited") return false;
  if (reason === "bar-not-published") {
    // Inside the grace it means NOT YET. Outside it, the provider has had ample time and
    // still published nothing — that is a real failure and must terminate the boundary.
    return elapsedSeconds > cfg.barPublicationGraceSeconds;
  }
  return true;
}

/** Why a past-deadline round may or may not be re-read. Each maps to distinct operator copy. */
export type LateCloseDecision =
  | { reread: true }
  | { reread: false; why: "feed-cannot-answer-about-the-past" | "beyond-the-lookback" };

/**
 * Past the abandon deadline — should the round be re-read, or voided?
 *
 * ⛔ THIS INVERTS A RULE THAT WAS CORRECT AND STOPPED BEING SO. The healer voided a
 * past-deadline round **without re-reading**, and the justification was sound for a quote
 * feed: *"any reading now would exceed the staleness contract"*. A quote answers "the price
 * NOW", so a reading taken an hour late describes an hour-late instant and can never settle
 * the boundary honestly. Not re-dialling also saved real money — re-reading production's
 * 1,398 historical orphans would have cost hundreds of dollars to learn nothing.
 *
 * ⭐ A DATED FEED MAKES THAT PREMISE FALSE. `time_series` returns the bar labelled T whether
 * asked at T+5s or T+6h, and its `open` was measured immutable from first publication. The
 * staleness contract is satisfied *by construction* — the bar's own label IS the boundary —
 * so the reading a late close gets is byte-identical to the one an on-time close would have
 * got. Refusing it refunds a round the market decided perfectly clearly, which is E-69.
 *
 * The decision is therefore a property of the FEED, not of the healer, and it is read from
 * the provider's own `dated` flag rather than hardcoded — so adding a dated provider cannot
 * leave this rule behind.
 */
export function lateCloseDecision(
  provider: { dated?: boolean } | undefined,
  elapsedSeconds: number,
  cfg: Pick<UpDownConfig, "maxSettleLookbackSeconds">,
): LateCloseDecision {
  // ⚠️ An unknown provider is treated as NOT dated. Defaulting the other way would have an
  // unrecognised id silently unlock a re-read path its feed cannot honour.
  if (!provider?.dated) return { reread: false, why: "feed-cannot-answer-about-the-past" };
  if (elapsedSeconds > cfg.maxSettleLookbackSeconds) return { reread: false, why: "beyond-the-lookback" };
  return { reread: true };
}

/** Test helper — drop the hydrated config cache so a case starts from defaults. */
export function __resetUpDownConfig(): void {
  globalThis.__50PICK_UPDOWN_CONFIG = undefined;
  globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED = undefined;
}
