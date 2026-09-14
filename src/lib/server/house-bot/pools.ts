/**
 * LOCKED MONEY — the only definition of "money a house stake may be sized against" (04 N1 §4.1).
 *
 * A player's stake can be taken back for free until its exit window closes (`exit-window.ts`). A house
 * stake sized against money that can still leave would be matched against nothing. So a stake counts
 * only once its window closed at least `LOCK_MARGIN_MS` (7 s) ago on the DATABASE clock, and only when
 * it belongs to an account the house may react to (I3): a PLAYER, not a live bot's holder, not
 * penalty-boxed today, and not recruited by a live bot's holder.
 *
 * ⛔ ONE IMPLEMENTATION. The seam's H3 (on the lock transaction), and later the Enter now preview, fire
 * and FILL planning, all call this. `lockedA15` is the one column without the account filter or the
 * margin, read only by the untargeted COUNTER (04 A15 unchanged) — a source pin in
 * `test:house-bot-seam` refuses any other stake sum on the H3 path.
 *
 * Raw pools stay raw: `raw` is the market's own pool, house money included (N1 §4.1).
 */
import { snapshotOrLegacy } from "../market-config";
import { houseSeamStore, type HouseTx, type LockedPool } from "../house-bot-dal";

export type LockedPoolMarket = {
  id: string;
  feeSnapshot?: unknown;
  selectionClosedAt?: string | null;
  resolutionAt: string;
};

/** The exit-window inputs, from the market's FROZEN rates — the same source `cashOutValue` reads. */
export function lockedPoolInputs(market: LockedPoolMarket): { graceMs: number; paidMs: number; closesAt: string } {
  const rates = snapshotOrLegacy(market.feeSnapshot);
  return {
    graceMs: Math.round(Math.max(0, rates.freeExitGraceMinutes) * 60_000),
    paidMs: Math.round(Math.max(0, rates.paidExitWindowMinutes) * 60_000),
    closesAt: market.selectionClosedAt ?? market.resolutionAt,
  };
}

/** `lockedForHouse(marketId, {tx?, graceMs, paidMs, closesAt, asOf?})` — one SQL aggregate (N1 §4.1). */
export function lockedForHouse(
  marketId: string,
  opts: { tx?: HouseTx; graceMs: number; paidMs: number; closesAt: string; asOf?: string | null },
): Promise<LockedPool> {
  return houseSeamStore.lockedPool({ marketId, graceMs: opts.graceMs, paidMs: opts.paidMs, closesAt: opts.closesAt, asOf: opts.asOf ?? null }, opts.tx);
}
