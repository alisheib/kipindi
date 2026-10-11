/**
 * "COUNTS AS" AT THE BET — what a desk account's stake adds to the count players see (owner ruling, 2026-10-11:
 * docs/COMPLIANCE-DECISIONS.md, "A desk account may count as more than one predictor in the count players see";
 * sanctioned change (s), plans/house-bots/PLAN.md §3).
 *
 * The bet path calls it at `// SEAM:shownCount`, inside `wallet:<holder>` and the bet's own transaction, once H2 has
 * admitted the stake. ⛔ IT MOVES NO MONEY: the stake, the pools, the fee and every ledger row are exactly what they
 * would be without it. Its one output is a whole number the SAME `addToPool` call adds to `predictorExtra`, so an
 * aborted bet adds nothing.
 *
 * ⭐ ONCE PER ACCOUNT PER MARKET, AT ITS FIRST STAKE. `mine` is the holder's positions on this market read in this
 * lock BEFORE this stake was written, so "no position carrying this account's marker" is exactly "this account's
 * first stake here". A later stake adds nothing. A change of weight afterwards moves open markets through
 * `saveHouseBotRules` (the shift), never through here.
 * ⭐ THE WEIGHT IS READ UNDER THE WALLET LOCK THE SHIFT ALSO HOLDS, so a stake and a change of weight are ordered:
 * whichever lands second sees the other, and every open market carries exactly `countsAs − 1` for each account on it.
 * ⛔ READ RAW (`countsAsOf`): the weight the stored document holds is the weight counted, whether or not another leaf
 * of the document parses — the shift reads it the same way, so the two can never disagree about what was added.
 *
 * Its own module: every export of `seam.ts` may only ADD a refusal, and this refuses nothing.
 */
import { countsAsOf } from "@/lib/house-bot/rules";
import { houseBotStore, type HouseTx } from "../house-bot-dal";
import type { StoredPosition } from "../market-service";

export async function houseShownExtra(input: {
  tx: HouseTx;
  botId: string;
  /** The holder's positions on this market, read in this lock by the bet path before this stake was written. */
  mine: readonly StoredPosition[];
}): Promise<number> {
  if (input.mine.some((p) => p.houseBotId === input.botId)) return 0;
  const account = await houseBotStore.get(input.botId, input.tx);
  return account ? countsAsOf(account.rules) - 1 : 0;
}
