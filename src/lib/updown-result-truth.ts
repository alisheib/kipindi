/** The viewer's realised rows, after the market's money transaction has committed. */
export type RoundResultRow = {
  /** OPEN is carried for fail-closed aggregate reads if a settled market still holds a row. */
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  side: "UP" | "DOWN";
  stake: number;
  payout: number | null;
};

export type RoundAnnouncement = {
  status: "WIN" | "LOSS" | "VOID" | "MIXED";
  side: "UP" | "DOWN" | null;
  stake: number;
  payout: number;
};

/** A stored terminal amount is safe to state as paid money. TZS is an integer, and
 *  each terminal status has a money meaning that the row must actually satisfy. */
export function validRealizedPayout(row: Pick<RoundResultRow, "status" | "stake" | "payout">): boolean {
  if (!Number.isSafeInteger(row.stake) || row.stake <= 0
      || row.payout == null || !Number.isSafeInteger(row.payout) || row.payout < 0) return false;
  return row.status === "WIN" ? row.payout >= row.stake
    : row.status === "LOSS" ? row.payout === 0
    : row.status === "VOID" ? row.payout === row.stake
    : row.status === "CASHED_OUT";
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
  return {
    status: only === "WIN" || only === "LOSS" || only === "VOID" ? only : "MIXED",
    side: sides.size === 1 ? rows[0].side : null,
    stake,
    payout,
  };
}
