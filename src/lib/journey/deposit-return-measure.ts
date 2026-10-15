/** Origin-backed S9 return measure. Each marked question position can satisfy at most one saved deposit. */
import { isDepositReturnBet, parseSavedDepositBet, type DepositRow } from "./deposit-state";
import { parseBetParam } from "./pending-bet";

export type ReturnPosition = {
  id: string; userId: string; marketId: string; side: string; stake: number;
  placedAt: string; origin?: string | null; houseBotId?: string | null;
};
export type DepositReturnMeasure = {
  eligibleMarketDeposits: number;
  eligibleRoundDeposits: number;
  matchedMarketDeposits: number;
};

export function depositReturnMeasure(deposits: readonly DepositRow[], positions: readonly ReturnPosition[]): DepositReturnMeasure {
  const byQuote = new Map<string, DepositRow[]>();
  let eligibleMarketDeposits = 0, eligibleRoundDeposits = 0, matchedMarketDeposits = 0;
  const key = (user: string, market: string, side: string, stake: number) => `${user}|${market}|${side}|${stake}`;
  for (const row of deposits) {
    if (row.type !== "DEPOSIT" || row.status !== "CONFIRMED" || row.currency !== "TZS" || row.houseBotId != null) continue;
    const created = Date.parse(row.createdAt), completed = Date.parse(row.completedAt ?? "");
    if (!Number.isFinite(created) || !Number.isFinite(completed) || completed < created) continue;
    const saved = parseSavedDepositBet(row.pendingBet);
    const bet = saved && parseBetParam(saved.bet);
    if (!bet || bet.stake === null) continue;
    if (bet.kind === "round") { eligibleRoundDeposits++; continue; }
    eligibleMarketDeposits++;
    const k = key(row.userId, bet.id, bet.side, bet.stake);
    const list = byQuote.get(k) ?? [];
    list.push(row);
    byQuote.set(k, list);
  }
  // A position bears the origin but no deposit id. Pair it with the most recent qualifying, unmatched deposit;
  // this is an inferred one-to-one match, never a claim that the origin stored a foreign key.
  for (const list of byQuote.values()) list.sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""));
  const matched = new Set<string>();
  for (const position of [...positions].sort((a, b) => Date.parse(a.placedAt) - Date.parse(b.placedAt))) {
    if (position.origin !== "deposit_return" || position.houseBotId != null) continue;
    const at = Date.parse(position.placedAt);
    if (!Number.isFinite(at)) continue;
    const list = byQuote.get(key(position.userId, position.marketId, position.side, position.stake));
    const row = list?.find((candidate) => !matched.has(candidate.id)
      && isDepositReturnBet(position.userId, candidate, position, at));
    if (row) { matched.add(row.id); matchedMarketDeposits++; }
  }
  return { eligibleMarketDeposits, eligibleRoundDeposits, matchedMarketDeposits };
}
