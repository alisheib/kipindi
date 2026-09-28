/**
 * THE HOUSE BOOK — what the house bots staked, got back and still hold, per EAT day.
 *
 * Every cap, stop and report that talks about a bot's money reads it HERE, so a gate and the
 * console can never disagree about the same day. It reads the MARKERS only: stakes from
 * positions carrying `houseBotId`, returned money from marked, CONFIRMED payout, refund and
 * cash-out rows (R3). It writes nothing and holds no state — the store behind it lives in
 * `house-bot-dal.ts`, because this folder may hold no module-scope Map (04 F7).
 *
 * ⭐ THE COHORT IS THE EAT DAY THE STAKE WAS PLACED (R3). A stake placed at 23:59 EAT and settled
 * at 00:01 belongs to the day it was placed on, so the daily loss cap measures the risk the bot
 * took that day, not the calendar day its result happened to arrive.
 *
 * ⛔ TWO LOSS FIGURES, AND THEY ARE NOT INTERCHANGEABLE (PLAN §3):
 *   · `projectedLossTzs` = realised loss + every open stake. GATES refuse a new stake when
 *     projected loss + that stake would pass the cap — the stake could all be lost.
 *   · `realisedLossTzs` = settled stake − money returned. STOPS fire only when realised loss
 *     reaches the cap — a bot is never paused for money it has not actually lost.
 * Realised loss may be negative: that is a profit, and it is reported as such, never clamped.
 *
 * ⛔ THIS MODULE HAS NO RESULTS READER, AND IT IS NOT COMING BACK (C7-SPEC ruling 371, C7 step 7).
 * `houseBotBook` and the `HouseBotBook` type were deleted here with the last of ruling 183's fee derivation.
 * They were written for a lifetime-and-today "Book" card on the console, and the docblock above them still
 * claimed that card as their caller months after owner ruling D20 struck it — an authority that told the next
 * reader a removed surface was live. Measured before the deletion: ZERO callers under `src/` and `scripts/`.
 * What a console may read here is `houseDayBook`, `houseDayBooks` and `houseOpenExposure`, and it reads them
 * through `house-console-read.ts`, never directly (ruling 340). `netTzs` and `feeWithheldTzs` are results, and
 * ruling 266 confines console money to usage against a configured limit — so a reader returning them would
 * invite the next page to "just use the book". `test:house-bot-console` 1.371 is the standing grep.
 * ⚠️ AND THERE IS STILL NO RESULTS READER HERE, THOUGH THE CONSOLE NOW STATES ONE RESULT (D20b amended 2026-09-26
 * under the owner's delegation; C7 ruling 437). The desk's Results tab derives its figure from `houseDayBooks`
 * INSIDE the gate module (`houseResultsForConsole` in `house-console-read.ts`) as minus `realisedLossTzs` — the
 * same settled figure both automatic loss stops act on — so this module gains no export, and the screen and the
 * stop cannot disagree about a day. That one view is all the amendment permits; `netTzs`, `feeWithheldTzs` and
 * every other results figure stay gone.
 */
import { houseBookStore, type HouseBookRawRow, type HouseTx } from "@/lib/server/house-bot-dal";
import { eatDayWindow } from "@/lib/house-bot/clock";

export type HouseDayBook = {
  /** Null = every bot together. */
  houseBotId: string | null;
  dayKey: string;
  bets: number;
  stakedTzs: number;
  openStakeTzs: number;
  settledStakeTzs: number;
  returnedTzs: number;
  /** settled stake − returned. Negative means the cohort is in profit. */
  realisedLossTzs: number;
  /** realised loss + open stake — the most this cohort can still lose. */
  projectedLossTzs: number;
};

type RawSums = Pick<HouseBookRawRow, "bets" | "staked" | "openStake" | "settledStake" | "returned">;

/** Pure: one book from raw sums. Both stores' rows go through this one function. */
export function foldDayBook(raw: RawSums, houseBotId: string | null, dayKey: string): HouseDayBook {
  const realisedLossTzs = raw.settledStake - raw.returned;
  return {
    houseBotId,
    dayKey,
    bets: raw.bets,
    stakedTzs: raw.staked,
    openStakeTzs: raw.openStake,
    settledStakeTzs: raw.settledStake,
    returnedTzs: raw.returned,
    realisedLossTzs,
    projectedLossTzs: realisedLossTzs + raw.openStake,
  };
}

/** Sums per-bot rows into one; no rows gives zeros. */
function sumRows(rows: readonly HouseBookRawRow[]): RawSums {
  return rows.reduce<RawSums>((acc, r) => ({
    bets: acc.bets + r.bets,
    staked: acc.staked + r.staked,
    openStake: acc.openStake + r.openStake,
    settledStake: acc.settledStake + r.settledStake,
    returned: acc.returned + r.returned,
  }), { bets: 0, staked: 0, openStake: 0, settledStake: 0, returned: 0 });
}

/** The half-open UTC window of one EAT day. ⛔ A malformed key throws: a book for "no day" is not
 *  an empty book, and a gate reading one would wave a stake through. */
function dayWindowIso(dayKey: string): { fromIso: string; toIso: string } {
  const w = eatDayWindow(dayKey);
  if (!w) throw new Error(`house book: '${dayKey}' is not an EAT day key (YYYY-MM-DD)`);
  return { fromIso: new Date(w.fromMs).toISOString(), toIso: new Date(w.toMs).toISOString() };
}

/** Every bot's book for one EAT day, in one query (A24). A bot with no stakes that day is absent. */
export async function houseDayBooks(dayKey: string, tx?: HouseTx): Promise<Map<string, HouseDayBook>> {
  const rows = await houseBookStore.dayRows({ ...dayWindowIso(dayKey), houseBotId: null }, tx);
  const books = new Map<string, HouseDayBook>();
  for (const r of rows) books.set(r.houseBotId, foldDayBook(r, r.houseBotId, dayKey));
  return books;
}

/** One bot's book for one EAT day — or every bot together when `houseBotId` is null. No stakes
 *  gives zeros. Pass the lock's `tx` for the in-lock cap reads (build commit 2). */
export async function houseDayBook(dayKey: string, houseBotId: string | null, tx?: HouseTx): Promise<HouseDayBook> {
  const rows = await houseBookStore.dayRows({ ...dayWindowIso(dayKey), houseBotId }, tx);
  return foldDayBook(sumRows(rows), houseBotId, dayKey);
}

/** Open stake right now, whatever day it was placed — one bot, or every bot when null. */
export async function houseOpenExposure(houseBotId: string | null, tx?: HouseTx): Promise<number> {
  const rows = await houseBookStore.openExposure(houseBotId, tx);
  return rows.reduce((sum, r) => sum + r.openStakeTzs, 0);
}
