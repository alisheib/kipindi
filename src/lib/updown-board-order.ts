/** Keep the round a player can stake on first without changing the order of the others.
 * The clock and frozen opening price are the same facts the money path requires. */
export type BoardOrderRound = {
  state: string;
  opensAt: string;
  closesAt: string;
  selectionClosedAt: string | null;
  openPrice: number | null;
  upTarget: number | null;
  downTarget: number | null;
};

export function isBoardBettable(round: BoardOrderRound, nowMs: number): boolean {
  const opens = Date.parse(round.opensAt);
  const closes = Date.parse(round.closesAt);
  const selectionCloses = round.selectionClosedAt == null ? closes : Date.parse(round.selectionClosedAt);
  return round.state === "open"
    && Number.isFinite(round.openPrice) && Number.isFinite(round.upTarget) && Number.isFinite(round.downTarget)
    && Number.isFinite(opens) && Number.isFinite(closes) && Number.isFinite(selectionCloses)
    && opens <= nowMs && nowMs < closes && nowMs < selectionCloses;
}

export function bettableFirst<T extends BoardOrderRound>(rounds: readonly T[], nowMs: number): T[] {
  return [...rounds].sort((a, b) => Number(isBoardBettable(b, nowMs)) - Number(isBoardBettable(a, nowMs)));
}

/** A result may sit beside the current round only when its window has ended by the
 * current round's opening. If the newest result overlaps, showing an older result as
 * "last" would also mislead, so omit the result card until the rows are repaired. */
export function latestNonOverlappingResult<T extends { state: string; opensAt: string; closesAt: string }>(
  rounds: readonly T[],
  current: Pick<T, "opensAt"> | null,
): T | null {
  const latest = rounds.find((round) => round.state === "resolved" || round.state === "void") ?? null;
  if (!latest || !current) return latest;
  const latestClose = Date.parse(latest.closesAt);
  const currentOpen = Date.parse(current.opensAt);
  return Number.isFinite(latestClose) && Number.isFinite(currentOpen) && latestClose <= currentOpen
    ? latest : null;
}
