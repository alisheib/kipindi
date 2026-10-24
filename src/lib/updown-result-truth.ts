/** The viewer's realised rows, after the market's money transaction has committed. */
export type RoundResultRow = {
  /** OPEN is carried for fail-closed aggregate reads if a settled market still holds a row. */
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  side: "UP" | "DOWN";
  stake: number;
  payout: number | null;
  /**
   * ⭐ STAKE-SHARE ONLY (FEE-TAX-2026-10, R3b) — the row's own fee (`Position.feeTzs`, summed over the legs a board row
   * aggregates); NULL/absent on every older model's row. It is what lets a stake-share WIN be paid back below its stake
   * (ruling 1) and still be a valid realised payout — never below its NET stake, the split's own floor.
   */
  fee?: number | null;
};

export type RoundAnnouncement = {
  status: "WIN" | "LOSS" | "VOID" | "MIXED";
  side: "UP" | "DOWN" | null;
  stake: number;
  payout: number;
};

/** A stored terminal amount is safe to state as paid money. TZS is an integer, and
 *  each terminal status has a money meaning that the row must actually satisfy.
 *  ⭐ A WIN's floor is its STAKE under the two older pool models (their winner floor) and its NET stake — the stake less its
 *  own fee — under `stake-share` (FEE-TAX-2026-10, R3b; ruling 1: a winner on a lopsided round is paid back less than it
 *  staked, never less than that). A row says which by carrying its fee; one without a fee is held to the stake, as ever. */
export function validRealizedPayout(row: Pick<RoundResultRow, "status" | "stake" | "payout" | "fee">): boolean {
  if (!Number.isSafeInteger(row.stake) || row.stake <= 0
      || row.payout == null || !Number.isSafeInteger(row.payout) || row.payout < 0) return false;
  return row.status === "WIN" ? row.payout >= winFloor(row)
    : row.status === "LOSS" ? row.payout === 0
    : row.status === "VOID" ? row.payout === row.stake
    : row.status === "CASHED_OUT";
}

/** A WIN's floor: the stake, or — on a row carrying a whole fee within its stake (stake-share) — the net stake. */
function winFloor(row: Pick<RoundResultRow, "stake" | "fee">): number {
  const fee = row.fee;
  return typeof fee === "number" && Number.isSafeInteger(fee) && fee >= 0 && fee <= row.stake ? row.stake - fee : row.stake;
}

/**
 * One factual result per round. Cash-outs belong in the total stake and realised payout,
 * but a round containing only cash-outs has no later settlement event to announce.
 * A winning leg cannot turn a net-losing hedge or an earlier cash-out into a WIN seal.
 */
export function roundAnnouncementFor(
  rows: readonly RoundResultRow[],
  settled: boolean,
): RoundAnnouncement | null {
  if (!settled || rows.length === 0 || rows.every((row) => row.status === "CASHED_OUT")) return null;
  // A missing or inconsistent terminal payout cannot be silently omitted: that
  // would turn a mixed result into a false WIN or misstate the player's money.
  if (rows.some((row) => !validRealizedPayout(row))) return null;
  const statuses = new Set(rows.map((row) => row.status));
  const sides = new Set(rows.map((row) => row.side));
  const only = statuses.size === 1 ? rows[0].status : null;
  const stake = rows.reduce((sum, row) => sum + row.stake, 0);
  const payout = rows.reduce((sum, row) => sum + (row.payout ?? 0), 0);
  if (!Number.isSafeInteger(stake) || !Number.isSafeInteger(payout)) return null;
  // ⭐ FEE-TAX-2026-10 · R3b — a WIN paid back LESS than its stake (stake-share, ruling 1) is announced as the factual totals,
  // never the gold seal: its side won and the money did not. Unreachable under the older models' floor.
  if (only === "WIN" && payout < stake) return { status: "MIXED", side: sides.size === 1 ? rows[0].side : null, stake, payout };
  return {
    status: only === "WIN" || only === "LOSS" || only === "VOID" ? only : "MIXED",
    side: sides.size === 1 ? rows[0].side : null,
    stake,
    payout,
  };
}
