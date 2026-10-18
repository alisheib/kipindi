/**
 * "COUNTS AS" AT THE BET — what a stake from a desk account's holder adds to the count players see (owner rulings,
 * 2026-10-11 and 2026-10-18: docs/COMPLIANCE-DECISIONS.md, "A desk account may count as more than one predictor in the
 * count players see" and "… its holder's own stakes placed by hand count too"; sanctioned change (s), plans/house-bots/PLAN.md §3).
 *
 * The bet path calls it at `// SEAM:shownCount`, inside `wallet:<bettor>` and the bet's own transaction, for EVERY
 * stake — the desk's (after H2 has admitted it) and a person's alike. ⛔ IT MOVES NO MONEY: the stake, the pools, the
 * fee and every ledger row are exactly what they would be without it. Its one output is a whole number the SAME
 * `addToPool` call adds to `predictorExtra`, so an aborted bet adds nothing.
 *
 * ⭐ ONCE PER ACCOUNT PER MARKET, AT ITS HOLDER'S FIRST STAKE THERE — placed by the desk or by hand. Ali, 2026-10-18:
 * "make the by hand place also count" — officers sign in to a desk account and stake polls by hand, and those stakes
 * carry no house marker, so the desk-only rule of 2026-10-11 left their markets at the true count. `mine` is the
 * bettor's positions on this market read in this lock BEFORE this stake was written, so an empty `mine` is exactly the
 * stake that adds 1 to the TRUE count (the pool increment's own `predictorCount` test): the extra joins a market when,
 * and only when, the account does. A later stake adds nothing, whoever places it. A change of weight afterwards moves
 * open markets through `saveHouseBotRules` (the shift), never through here.
 * ⭐ A BETTOR WITH NO LIVE DESK ACCOUNT READS 0 — every ordinary player, and the holder of a REMOVED account
 * (`findLiveByUserId` skips REMOVED): only a designation that still stands is counted as more than one.
 * ⭐ THE WEIGHT IS READ UNDER THE WALLET LOCK THE SHIFT ALSO HOLDS (`wallet:<holder>` — the bettor IS the holder), so a
 * stake and a change of weight are ordered: whichever lands second sees the other, and every open market carries
 * exactly `countsAs − 1` for each account whose holder is on it.
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
  /** The bettor — for a desk stake, the account's holder. */
  userId: string;
  /** The bettor's positions on this market, read in this lock by the bet path before this stake was written. */
  mine: readonly StoredPosition[];
}): Promise<number> {
  if (input.mine.length > 0) return 0;
  const account = await houseBotStore.findLiveByUserId(input.userId, input.tx);
  return account ? countsAsOf(account.rules) - 1 : 0;
}
