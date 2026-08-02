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
// The money lives on the market row, never in the Up & Down tables — the source lock needs
// it to tell an operator what is actually riding on the rounds it is refusing to strand.
import { marketStore } from "./market-dal";
import { assetStore, chainStore, roundStore, type StoredAsset, type StoredChain, type ChainState } from "./updown-dal";
import type { RateConfig } from "./market-config";
import type { MarketCategory } from "./market-service";
import type { FeedProviderId } from "./updown-feed";

// ---------------------------------------------------------------------------
// Product-level configuration
// ---------------------------------------------------------------------------

const UPDOWN_CONFIG_KEY = "updown.config";

/** The durations a chain may run. Not free-form: each duration is a separate chain
 *  with its own timer and its own liquidity, and the 5-minute grid is what lets a
 *  15- and 30-minute round share observations with the 5-minute ones. A 7-minute
 *  duration would not land on the grid and would break that sharing. */
export const ALLOWED_DURATIONS = [5, 15, 30] as const;
export type Duration = (typeof ALLOWED_DURATIONS)[number];

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
   * The fee profile a NEW chain gets by default. Ali, 2026-07-24:
   * `capped-commission` at 13% of the pool, ceiling ⅓ of the smaller side —
   * exactly TZS 1,300 on a balanced TZS 10,000 pool, using maths that already
   * exists and is already tested. Outcome-NEUTRAL, unlike the `loser-share` model
   * the long-form polls use, and the ceiling preserves the winner floor.
   *
   * Frozen onto each round at creation, so the two models never mix.
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
  retryBackoffSeconds: [15, 45, 120],
  defaultMinStake: 1_000,
  defaultMaxStake: 1_000_000,
  defaultRateProfile: {
    feeModel: "capped-commission",
    commissionRate: 0.13,
    feeCeilingRate: 1 / 3,
    // Display-only: the "× 1.4 est." headline on the Up/Down buttons. It is an
    // ESTIMATE, never fixed odds — the card carries the qualifier that says so.
    estimatedWinningsRate: 0.4,
    showEstimatedWinnings: true,
  },
  // Kept as the LAST resort only — a duration longer than the ladder's top rung. Every
  // round the platform actually runs is priced by `marginSchedule` (E-32), and 0.50% is
  // roughly right for the ~23-hour window it now only ever applies to.
  defaultMarginBps: 50,
  // The measured ladder — ~25-40% void, Ali's "balanced" call (E-32). Each rung is the
  // margin whose measured void rate on real bars is nearest that band; the table of
  // measurements is in the `marginSchedule` doc comment above. Ordered narrowest-window
  // first for readability only; resolution picks the narrowest MATCHING rung regardless.
  marginSchedule: [
    { category: "*", maxDurationMinutes: 5, bps: 2 },
    { category: "*", maxDurationMinutes: 15, bps: 3 },
    { category: "*", maxDurationMinutes: 30, bps: 5 },
    { category: "*", maxDurationMinutes: 60, bps: 7 },
    { category: "*", maxDurationMinutes: 240, bps: 14 },
    { category: "*", maxDurationMinutes: 1440, bps: 30 },
  ],
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
 *  v2 (2026-07-27): default stake bounds 100/100,000 → 1,000/1,000,000. */
const UPDOWN_CONFIG_VERSION = 2;

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
    if ((stored.v ?? 1) < UPDOWN_CONFIG_VERSION) {
      const c = globalThis.__50PICK_UPDOWN_CONFIG;
      if (c.defaultMinStake === 100) c.defaultMinStake = DEFAULT_UPDOWN_CONFIG.defaultMinStake;
      if (c.defaultMaxStake === 100_000) c.defaultMaxStake = DEFAULT_UPDOWN_CONFIG.defaultMaxStake;
      void saveConfig(UPDOWN_CONFIG_KEY, { ...c, v: UPDOWN_CONFIG_VERSION });
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
    if (updates.feedProvider !== "mock" && updates.feedProvider !== "twelvedata") {
      return { ok: false, error: 'Feed provider must be "mock" or "twelvedata".' };
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
    if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
    if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };
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
  const step = durationMinutes * 60_000;
  if (step <= 0) throw new Error("boundaryAfter: duration must be positive");
  // Math.floor (not trunc) so a `fromMs` BEFORE the anchor still lands correctly on
  // a negative k rather than skipping forward a whole step.
  const k = Math.floor((fromMs - anchorMs) / step) + 1;
  return anchorMs + k * step;
}

/** The grid boundary at or before `atMs` — i.e. the start of the round covering it. */
export function boundaryAtOrBefore(anchorMs: number, durationMinutes: number, atMs: number): number {
  const step = durationMinutes * 60_000;
  if (step <= 0) throw new Error("boundaryAtOrBefore: duration must be positive");
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
  const ticks = input.minMoveTicks ?? 1;
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 10_000) {
    return { ok: false, error: "Minimum move must be a whole number of ticks, 1-10000." };
  }

  // THE SOURCE GATE. One allowlist on the platform, not two.
  let domain: string;
  try {
    domain = normalizeDomain(new URL(input.priceSourceUrl).hostname);
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
    minMoveTicks: input.minMoveTicks ?? 1,
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
    minMoveTicks: merged.minMoveTicks ?? 1,
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
    return { ok: false, error: `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes — other values would not land on the 5-minute grid, which is what lets rounds share price observations.` };
  }
  const existing = (await chainStore.list({ assetId: input.assetId })).find((c) => c.durationMinutes === input.durationMinutes);
  if (existing) return { ok: false, error: `${asset.key} already has a ${input.durationMinutes}-minute chain.` };

  const cfg = await getUpDownConfig();
  const lo = input.minStake ?? cfg.defaultMinStake;
  const hi = input.maxStake ?? cfg.defaultMaxStake;
  if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
  if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };

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
  if (!Number.isFinite(lo) || lo < 1) return { ok: false, error: "Minimum stake must be at least TZS 1." };
  if (!Number.isFinite(hi) || hi < lo) return { ok: false, error: "Maximum stake must be at least the minimum stake." };

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

/** Test helper — drop the hydrated config cache so a case starts from defaults. */
export function __resetUpDownConfig(): void {
  globalThis.__50PICK_UPDOWN_CONFIG = undefined;
  globalThis.__50PICK_UPDOWN_CONFIG_HYDRATED = undefined;
}
