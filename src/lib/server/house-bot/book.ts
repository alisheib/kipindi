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
 */
import { houseBookStore, type HouseBookRawRow, type HouseTx } from "@/lib/server/house-bot-dal";
import { eatDayKey, eatDayWindow } from "@/lib/house-bot/clock";

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

export type HouseBotBook = {
  bets: number;
  stakedTzs: number;
  returnedTzs: number;
  /** returned − settled stake: positive is a profit. */
  netTzs: number;
  openExposureTzs: number;
  /**
   * ⛔ ALWAYS NULL — "not recorded per stake", never a confident 0.
   *
   * R3 expected the fee withheld from a house bot's winnings to be summed from its marked ledger
   * rows. The code does not record it there: the settlement payout transaction writes `fee: 0`
   * (market-service.ts, the payout create in settlement), and the commission ledger line names
   * the market but no user and no transaction (ledger.ts, the settlement lines). A zero here
   * would be a false statement about money, so the field is null until build commit 5 derives it
   * from the poll's frozen fee snapshot and the position's share (PLAN §18).
   */
  feeWithheldTzs: null;
};

type RawSums = Pick<HouseBookRawRow, "bets" | "staked" | "openStake" | "settledStake" | "returned">;

const DAY_MS = 24 * 60 * 60 * 1000;
/** The lifetime window starts at the epoch; its end is the day after `nowMs`. */
const LIFETIME_FROM_ISO = "1970-01-01T00:00:00.000Z";

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

/**
 * The console's money card: today's cohort or the whole lifetime, plus live open exposure.
 *
 * ⛔ NO CALLER TODAY, AND ITS PLANNED ONE IS STRUCK (owner ruling D20, 2026-09-17; C5-D20-REPLAN ruling 266). Commit 1 wrote
 * this for the console's lifetime-and-today "Book" card, which D20 removed along with "Today's net" and the fee withheld: a
 * Commit 7 console shows money only as usage against a configured limit, and that reads `houseDayBook` /
 * `houseOpenExposure`, not this. It is left standing, unused and with no case, for Commit 7's rulings to give it a caller
 * or delete it — recorded in PROGRESS by checkpoint C5-5b so it cannot be mistaken for live code (review test-strength-10).
 */
export async function houseBotBook(input: { houseBotId: string | null; range: "today" | "lifetime"; nowMs: number }): Promise<HouseBotBook> {
  const window = input.range === "today"
    ? dayWindowIso(eatDayKey(input.nowMs))
    : { fromIso: LIFETIME_FROM_ISO, toIso: new Date(input.nowMs + DAY_MS).toISOString() };
  const [rows, openExposureTzs] = await Promise.all([
    houseBookStore.dayRows({ ...window, houseBotId: input.houseBotId }),
    houseOpenExposure(input.houseBotId),
  ]);
  const raw = sumRows(rows);
  return {
    bets: raw.bets,
    stakedTzs: raw.staked,
    returnedTzs: raw.returned,
    netTzs: raw.returned - raw.settledStake,
    openExposureTzs,
    feeWithheldTzs: null,
  };
}
