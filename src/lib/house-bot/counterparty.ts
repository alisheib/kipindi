/**
 * COUNTERPARTY ATTRIBUTION — which players a staff-chosen stake is set against (04 N1 §4.1).
 *
 * ⛔ ONE FUNCTION. The Enter now preview, the press and fire (through `enterNowDecision`), and the seam's
 * H4 COUNTERPARTY_COUNT / _TZS for a MANUAL THIN stake all call this, so the figure an officer is shown
 * is the figure the money gate charges. It lived in `server/house-bot/seam.ts` in build commit 2; it
 * moved here, unchanged, when the engine gained its second caller.
 *
 * Every opposite account holding at least `COUNTERPARTY_ATTRIBUTION_MIN_PCT` (25%) of the locked money
 * is attributed `floor(stake × its locked / all locked)`. Pure: no server import.
 */
import { COUNTERPARTY_ATTRIBUTION_MIN_PCT } from "./constants";

export type Counterparty = { userId: string; sharePct: number; attributedTzs: number };

export function attributeStake(
  stakeTzs: number,
  accounts: ReadonlyArray<{ userId: string; lockedTzs: number }>,
  lockedOpp: number,
): Counterparty[] {
  if (!(lockedOpp > 0)) return [];
  return accounts
    .filter((a) => a.lockedTzs * 100 >= COUNTERPARTY_ATTRIBUTION_MIN_PCT * lockedOpp)
    .map((a) => ({
      userId: a.userId,
      sharePct: Math.floor((a.lockedTzs * 100) / lockedOpp),
      attributedTzs: Math.floor((stakeTzs * a.lockedTzs) / lockedOpp),
    }));
}
