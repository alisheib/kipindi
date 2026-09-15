/**
 * THE ENGINE'S ONLY VIEW OF A MARKET — an allowlist, not a filter (04 A13, PLAN §4.1).
 *
 * ⛔ WHY AN ALLOWLIST. A LIVE poll can carry an AI result check (Sentinel fields stamped by an early re-check)
 * and a CLOSED one a staged verdict (stage-1 of two-admin resolution). An engine that read the market ROW could
 * let either leak into a side, an amount or a time — a house stake placed with knowledge no player has. So the
 * engine never holds a `StoredMarket`: it holds `PublicMarketView`, built from exactly `HOUSE_MARKET_FIELDS`,
 * and the engine suites pin that list and walk the engine modules for any forbidden token.
 *
 * The one market fact the engine may learn about a result check is `{blocked:boolean}`, and only from
 * `blackout.ts` (N1 §4.1).
 *
 * Pure: the projection takes a row the DAL selected with this field list and returns the view.
 */

/** The market columns the engine may read (A13), plus `reopenedAt` for A16's reopen detection (N1 §2 (r)). */
export const HOUSE_MARKET_FIELDS = [
  "id",
  "productLine",
  "category",
  "status",
  "yesPool",
  "noPool",
  "selectionClosedAt",
  "resolutionAt",
  "createdAt",
  "titleEn",
  "feeSnapshot",
  "reopenedAt",
] as const;

/** The Up & Down round and chain columns the engine may read (A13). */
export const HOUSE_ROUND_FIELDS = [
  "roundId",
  "chainId",
  "chainKey",
  "roundNumber",
  "opensAt",
  "durationMinutes",
  "openPrice",
  "upTarget",
  "downTarget",
  "chainRunning",
  "assetEnabled",
] as const;

export type HouseViewRound = {
  roundId: string;
  chainId: string;
  /** `<asset symbol>:<duration minutes>`, the rules' chain key. */
  chainKey: string;
  roundNumber: number;
  opensAt: string;
  durationMinutes: number;
  openPrice: number | null;
  upTarget: number | null;
  downTarget: number | null;
  chainRunning: boolean;
  assetEnabled: boolean;
};

/** One row as the DAL selects it: `HOUSE_MARKET_FIELDS`, and the round columns when a round exists. */
export type HouseMarketViewRow = {
  id: string;
  /** RAW — `market-dal` coerces anything but UPDOWN to MARKET, which A12 must not trust. */
  productLine: string;
  category: string;
  status: string;
  yesPool: number;
  noPool: number;
  selectionClosedAt: string | null;
  resolutionAt: string;
  createdAt: string;
  titleEn: string;
  /** Frozen exit rates in minutes, already resolved from the fee snapshot (legacy rows included). */
  exitGraceMin: number;
  exitPaidMin: number;
  reopenedAt: string | null;
  round: HouseViewRound | null;
};

export type PublicMarketView = {
  id: string;
  productLine: string;
  category: string;
  status: string;
  yesPool: number;
  noPool: number;
  selectionClosedAt: string | null;
  resolutionAt: string;
  createdAt: string;
  titleEn: string;
  exitRates: { graceMin: number; paidMin: number };
  isDemo: boolean;
  reopenedAt: string | null;
  round: HouseViewRound | null;
};

/**
 * The demo marker, spelled as `isDemoMarket` spells it (`market-service.ts`). ⛔ Kept in step with that
 * function by the engine suite, which feeds both the same titles.
 */
export const DEMO_TITLE_PREFIX = "Demo · ";

/**
 * A12's one scope predicate, shared by trigger, planner and fire: null when a house stake may be considered,
 * else the code saying why not. Demo markets and a product no policy admits are out of scope with no code of
 * their own (A12 tests: 0 intents).
 */
export function scopeCode(view: PublicMarketView): "PRODUCT_NOT_SUPPORTED" | "UD_NO_ROUND" | "NO_CUTOFF" | null {
  if (view.productLine !== "MARKET" && view.productLine !== "UPDOWN") return "PRODUCT_NOT_SUPPORTED";
  if (view.isDemo) return "PRODUCT_NOT_SUPPORTED";
  if (view.productLine === "UPDOWN") return view.round ? null : "UD_NO_ROUND";
  return view.selectionClosedAt ? null : "NO_CUTOFF";
}

export function inScope(view: PublicMarketView): boolean {
  return scopeCode(view) === null;
}

/**
 * The cutoff the engine plans against (A12 replaces PLAN §4.7): Up & Down `min(opensAt + D, selectionClosedAt ??
 * resolutionAt)`; polls `selectionClosedAt`. Null when out of scope.
 */
export function cutoffOf(view: PublicMarketView): string | null {
  const closes = view.selectionClosedAt ?? view.resolutionAt;
  if (view.productLine === "UPDOWN") {
    if (!view.round) return null;
    const lock = Date.parse(view.round.opensAt) + view.round.durationMinutes * 60_000;
    return new Date(Math.min(lock, Date.parse(closes))).toISOString();
  }
  return view.selectionClosedAt;
}

/** `bettableFrom = max(round opensAt, market createdAt)` (PLAN §4.7). */
export function bettableFrom(view: PublicMarketView): string {
  const created = Date.parse(view.createdAt);
  const opens = view.round ? Date.parse(view.round.opensAt) : created;
  return new Date(Math.max(created, opens)).toISOString();
}

export function projectMarketView(row: HouseMarketViewRow): PublicMarketView {
  return {
    id: row.id,
    productLine: row.productLine,
    category: row.category,
    status: row.status,
    yesPool: row.yesPool,
    noPool: row.noPool,
    selectionClosedAt: row.selectionClosedAt,
    resolutionAt: row.resolutionAt,
    createdAt: row.createdAt,
    titleEn: row.titleEn,
    exitRates: { graceMin: Math.max(0, row.exitGraceMin), paidMin: Math.max(0, row.exitPaidMin) },
    isDemo: row.titleEn.startsWith(DEMO_TITLE_PREFIX),
    reopenedAt: row.reopenedAt,
    round: row.round ? { ...row.round } : null,
  };
}
