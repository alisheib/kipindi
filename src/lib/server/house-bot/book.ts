/**
 * THE HOUSE BOOK — what the house bots staked, got back and still hold, per EAT day.
 *
 * Every cap, stop and report that talks about a bot's money reads it HERE, so a gate and the
 * console can never disagree about the same day. It reads the MARKERS: stakes from positions
 * carrying `houseBotId`, returned money from marked, CONFIRMED payout, refund and cash-out rows
 * (R3). ⚠️ ONE EXCEPTION, the fee withheld (C5-SPEC ruling 183): deriving a house winner's share
 * of a poll's single fee reads that poll's OTHER winning stakes too — position ids, sides,
 * statuses and stakes only, never an account. It writes nothing and holds no state — the store
 * behind it lives in `house-bot-dal.ts`, because this folder may hold no module-scope Map (04 F7).
 *
 * ⭐ ONE FUNCTION PER QUESTION (C5-SPEC ruling 180). The gates keep `houseDayBook` and its fold
 * byte-for-byte; the console's money card and R1's entry split read `houseBotBook`; the staff-edge
 * duty and R1's scorecard read `houseStaffScorecard`. The last two fold only `entryRows`, whose
 * four entries sum to `dayRows` exactly (`test:house-bot-reports` §1).
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
import {
  houseBookStore, HOUSE_ENTRIES,
  type HouseBookRawRow, type HouseEntry, type HouseEntryRawRow, type HouseFeeInputs, type HouseTx,
} from "@/lib/server/house-bot-dal";
import { eatDayKey, eatDayWindow, eatMonthWindow } from "@/lib/house-bot/clock";
import { allocateFeeShares, poolFee, winnersForAllocation } from "@/lib/payout";
import { hasOwnSnapshot, snapshotOrLegacy } from "../market-config";

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

/**
 * One entry's book (C5-SPEC ruling 181): won = WIN, lost = LOSS, refunded = VOID, cashedOut = CASHED_OUT.
 * ⛔ `settled` is won + lost + refunded (N1): a cashed-out stake is never settled, never counts toward the win rate or
 * the net, yet its stake is in `settledStakeTzs` and its return in `returnedTzs`, so the entries tie to `dayRows`.
 */
export type HouseEntryBook = {
  bets: number;
  stakedTzs: number;
  openStakeTzs: number;
  settledStakeTzs: number;
  returnedTzs: number;
  won: number;
  lost: number;
  refunded: number;
  cashedOut: number;
  settled: number;
  /** won / (won + lost) × 100; null when nothing was won or lost (undefined, never 0%). */
  winRatePct: number | null;
  /** returned − staked over won + lost + refunded stakes: positive means the house gained. */
  netTzs: number;
};

export type HouseBotBook = {
  bets: number;
  stakedTzs: number;
  returnedTzs: number;
  /** returned − settled stake: positive is a profit. */
  netTzs: number;
  openExposureTzs: number;
  /**
   * The fee withheld from this book's house winnings, DERIVED (C5-SPEC ruling 183): each marked WIN whose marked payout
   * landed in the window gets its share of that poll's single fee — the frozen snapshot's fee, split by
   * `allocateFeeShares` exactly as settlement split it — plus the fee on marked CONFIRMED CASHOUT rows.
   * ⛔ NULL, never 0, when any contributing WIN sits on a market with no own snapshot or no settlement time: the share
   * cannot be reproduced, so the figure is "not recorded per stake". Settlement books the same share as the
   * SETTLEMENT_COMMISSION line of `settle_<payout txn id>`; the reports suite holds the two equal on Postgres.
   */
  feeWithheldTzs: number | null;
  /** Only when asked for (`{byEntry: true}`): the same window split into the four entries, which sum to the totals. */
  byEntry?: Record<HouseEntry, HouseEntryBook>;
};

/** The staff-chosen scorecard of one EAT placement month (C5-SPEC rulings 180–181). */
export type StaffScorecardRow = { officerId: string } & HouseEntryBook;
export type StaffScorecard = {
  monthKey: string;
  fromIso: string;
  toIso: string;
  /** One row per officer who requested a stake placed in the month (MANUAL and TARGETED together), sorted by id. */
  officers: StaffScorecardRow[];
  /** The AUTOMATIC entry, product line MARKET, every bot together — what an officer's choices are compared with. */
  baseline: HouseEntryBook;
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

/** The half-open UTC window of one EAT month. ⛔ A malformed key throws, as `dayWindowIso` does. */
function monthWindowIso(monthKey: string): { fromIso: string; toIso: string } {
  const w = eatMonthWindow(monthKey);
  if (!w) throw new Error(`house book: '${monthKey}' is not an EAT month key (YYYY-MM)`);
  return { fromIso: new Date(w.fromMs).toISOString(), toIso: new Date(w.toMs).toISOString() };
}

/** The lifetime window: from the epoch to the day after `nowMs`. */
function lifetimeWindowIso(nowMs: number): { fromIso: string; toIso: string } {
  return { fromIso: LIFETIME_FROM_ISO, toIso: new Date(nowMs + DAY_MS).toISOString() };
}

/** Pure: one entry's book from `entryRows` groups (C5-SPEC ruling 181). No rows gives zeros and no win rate. */
export function foldEntryBook(rows: readonly HouseEntryRawRow[]): HouseEntryBook {
  const s = rows.reduce((acc, r) => ({
    bets: acc.bets + r.bets, staked: acc.staked + r.staked, openStake: acc.openStake + r.openStake,
    settledStake: acc.settledStake + r.settledStake, returned: acc.returned + r.returned,
    won: acc.won + r.won, wonStake: acc.wonStake + r.wonStake, wonReturned: acc.wonReturned + r.wonReturned,
    lost: acc.lost + r.lost, lostStake: acc.lostStake + r.lostStake, lostReturned: acc.lostReturned + r.lostReturned,
    refunded: acc.refunded + r.refunded, refundedStake: acc.refundedStake + r.refundedStake, refundedReturned: acc.refundedReturned + r.refundedReturned,
    cashedOut: acc.cashedOut + r.cashedOut,
  }), {
    bets: 0, staked: 0, openStake: 0, settledStake: 0, returned: 0, won: 0, wonStake: 0, wonReturned: 0,
    lost: 0, lostStake: 0, lostReturned: 0, refunded: 0, refundedStake: 0, refundedReturned: 0, cashedOut: 0,
  });
  return {
    bets: s.bets,
    stakedTzs: s.staked,
    openStakeTzs: s.openStake,
    settledStakeTzs: s.settledStake,
    returnedTzs: s.returned,
    won: s.won,
    lost: s.lost,
    refunded: s.refunded,
    cashedOut: s.cashedOut,
    settled: s.won + s.lost + s.refunded,
    winRatePct: s.won + s.lost > 0 ? (s.won * 100) / (s.won + s.lost) : null,
    netTzs: s.wonReturned + s.lostReturned + s.refundedReturned - (s.wonStake + s.lostStake + s.refundedStake),
  };
}

/**
 * Pure: each fee input WIN's derived share of its poll's single fee, by position id (C5-SPEC ruling 183) — the frozen
 * snapshot's `poolFee` for the winning side, split by `allocateFeeShares` over `winnersForAllocation` exactly as
 * `settleMarket` split it (ties broken by id, so input order does not matter). NULL for a WIN whose market has no own
 * snapshot or no settlement time. ⛔ Only `houseBotBook` reports a fee from it; the reports suite checks it per position
 * against the ledger.
 */
export function derivedFeeShares(inputs: HouseFeeInputs): Map<string, number | null> {
  const markets = new Map(inputs.markets.map((m) => [m.marketId, m]));
  const splits = new Map<string, Map<string, number>>();
  const out = new Map<string, number | null>();
  for (const win of inputs.wins) {
    const m = markets.get(win.marketId);
    if (!m || m.settledAt == null || !hasOwnSnapshot(m.feeSnapshot)) {
      out.set(win.positionId, null);
      continue;
    }
    const key = `${m.marketId}:${win.side}`;
    let split = splits.get(key);
    if (!split) {
      const winners = winnersForAllocation(m.positions, win.side).map(({ id, stake }) => ({ id, stake }));
      const winningPool = win.side === "YES" ? m.yesPool : m.noPool;
      split = allocateFeeShares(winners, winningPool, poolFee(m.yesPool, m.noPool, snapshotOrLegacy(m.feeSnapshot), win.side).fee);
      splits.set(key, split);
    }
    out.set(win.positionId, split.get(win.positionId) ?? 0);
  }
  return out;
}

/**
 * The console's money card and R1's per-bot figures: one bot (or every bot, null) over today's cohort, the lifetime or
 * one EAT placement month, optionally one product line; open exposure now; the fee withheld on the LEDGER basis over the
 * same window (C5-SPEC rulings 180, 183). `{byEntry: true}` adds the four-way entry split.
 */
export async function houseBotBook(
  input: { houseBotId: string | null; range: "today" | "lifetime" | { monthKey: string }; productLine?: string; nowMs: number },
  opts?: { byEntry?: true },
): Promise<HouseBotBook> {
  const window = input.range === "today"
    ? dayWindowIso(eatDayKey(input.nowMs))
    : input.range === "lifetime" ? lifetimeWindowIso(input.nowMs) : monthWindowIso(input.range.monthKey);
  const inProduct = (productLine: string | null) => input.productLine === undefined || productLine === input.productLine;
  const [entryRows, fee, openExposureTzs] = await Promise.all([
    houseBookStore.entryRows({ ...window, houseBotId: input.houseBotId }),
    houseBookStore.feeInputs({ ...window, houseBotId: input.houseBotId }),
    input.productLine === undefined
      ? houseOpenExposure(input.houseBotId)
      : houseBookStore.entryRows({ ...lifetimeWindowIso(input.nowMs), houseBotId: input.houseBotId })
        .then((all) => all.filter((r) => inProduct(r.productLine)).reduce((sum, r) => sum + r.openStake, 0)),
  ]);
  const rows = entryRows.filter((r) => inProduct(r.productLine));
  const total = foldEntryBook(rows);

  const shares = derivedFeeShares(fee);
  const productOf = new Map(fee.markets.map((m) => [m.marketId, m.productLine]));
  let feeWithheldTzs: number | null = 0;
  for (const win of fee.wins) {
    if (!inProduct(productOf.get(win.marketId) ?? null)) continue;
    const share = shares.get(win.positionId);
    if (share == null) {
      feeWithheldTzs = null;
      break;
    }
    feeWithheldTzs += share;
  }
  if (feeWithheldTzs != null) for (const c of fee.cashOuts) if (inProduct(c.productLine)) feeWithheldTzs += c.feeTzs;

  const book: HouseBotBook = {
    bets: total.bets,
    stakedTzs: total.stakedTzs,
    returnedTzs: total.returnedTzs,
    netTzs: total.returnedTzs - total.settledStakeTzs,
    openExposureTzs,
    feeWithheldTzs,
  };
  if (opts?.byEntry) {
    book.byEntry = Object.fromEntries(HOUSE_ENTRIES.map((e) => [e, foldEntryBook(rows.filter((r) => r.entry === e))])) as Record<HouseEntry, HouseEntryBook>;
  }
  return book;
}

/**
 * The staff-chosen scorecard of one EAT placement month (C5-SPEC rulings 180–182): a row per requesting officer
 * (MANUAL + TARGETED, from the one requester rule the store applies) and the automated baseline (AUTOMATIC, product
 * line MARKET, every bot together). UNKNOWN is in neither. Results are as at the read.
 * ⛔ It folds ONLY `entryRows`: the staff-edge duty and R1's scorecard take their figures from here and nowhere else
 * (the reports suite pins this body), and no refusal branch reads it (PLAN I10).
 */
export async function houseStaffScorecard(input: { monthKey: string }): Promise<StaffScorecard> {
  const window = monthWindowIso(input.monthKey);
  const rows = await houseBookStore.entryRows({ ...window, houseBotId: null });
  const byOfficer = new Map<string, HouseEntryRawRow[]>();
  for (const r of rows) {
    if ((r.entry !== "MANUAL" && r.entry !== "TARGETED") || r.officerId == null) continue;
    byOfficer.set(r.officerId, [...(byOfficer.get(r.officerId) ?? []), r]);
  }
  const officers = [...byOfficer.keys()].sort().map((officerId) => ({ officerId, ...foldEntryBook(byOfficer.get(officerId) ?? []) }));
  const baseline = foldEntryBook(rows.filter((r) => r.entry === "AUTOMATIC" && r.productLine === "MARKET"));
  return { monthKey: input.monthKey, fromIso: window.fromIso, toIso: window.toIso, officers, baseline };
}
