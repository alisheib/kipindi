/**
 * CAP PRE-CHECK — "would the seam refuse ANY stake this bot could place here?" (C4-SPEC ruling 94).
 *
 * A decision that knows a money cap already refuses writes the right code instead of a PENDING row the seam then
 * skips. `capPrecheck` evaluates the seam's money caps at the SMALLEST stake the bot could place —
 * `max(stakeMinTzs, bounds.min)` — in the seam's declared order (H2 → H3 → H4, `seam.ts`), and returns the first
 * `CAP_<code>` that refuses.
 *
 * ⛔ THE SEAM'S OWN PREDICATES, TERM FOR TERM. A cap that is not set refuses (`over(null, …)` is true; ruling 35);
 * the usage figures come from the reads H2–H4 make (`botUsage`, `houseDayBook`, `houseOpenExposure`, `marketUsage`,
 * `staffChosenPlacedToday`, `counterpartyToday`). The seam stays the authority: this only avoids a row it would skip.
 *
 * ⛔ EXCLUDED ON PURPOSE: the rate caps (MIN_GAP, PER_HOUR, PER_DAY, PER_MARKET_COUNT, GLOBAL_BETS_*) defer or are
 * decided at fire, and TARGET_ONCE reads the live target at fire (N2 §4 step 7).
 */
import { eatDayKey } from "@/lib/house-bot/clock";
import { capEngineCode, type CapCode, type EngineCode } from "@/lib/house-bot/constants";
import { db } from "../store";
import { houseBotIntentStore, houseSeamStore, type StoredHouseBot, type StoredHouseBotControl } from "../house-bot-dal";
import { houseDayBook, houseOpenExposure } from "./book";

export type CapFacts = {
  bot: Pick<StoredHouseBot, "stakeMinTzs" | "stakeMaxTzs" | "capPerMarketTzs" | "balanceFloorTzs" | "capDailyStakeTzs" | "capDailyLossTzs"
    | "capOpenExposureTzs" | "capStaffChosenPerDay" | "capStaffChosenDailyTzs">;
  control: Pick<StoredHouseBotControl, "gCapPerMarketTzs" | "gCapDailyStakeTzs" | "gCapDailyLossTzs" | "gCapOpenExposureTzs"
    | "gCounterPerPlayerPerDay" | "gCounterPerPlayerTzsPerDay" | "gCapStaffChosenPerDay" | "gCapStaffChosenDailyTzs">;
  balance: number;
  stakeOnMarket: number;
  stakedToday: number;
  projectedLossToday: number;
  openExposure: number;
  houseOnMarket: number;
  globalStakedToday: number;
  globalProjectedLossToday: number;
  globalExposure: number;
  /** Null unless the row is staff-chosen (MANUAL or targeted). */
  staffChosen: { count: number; tzs: number; globalCount: number; globalTzs: number } | null;
  /** The trigger account's house stakes today, for a COUNTER; null otherwise. */
  counterparty: { count: number; tzs: number } | null;
};

/** The seam's `over`: a cap that is not set refuses; otherwise refuse above it. */
const over = (cap: number | null, value: number): boolean => cap == null || value > cap;

/** Pure: the first cap the seam would refuse a stake of `stake` with, or null. */
export function capPrecheck(f: CapFacts, stake: number): EngineCode | null {
  const hit = (code: CapCode): EngineCode => capEngineCode(code);
  const b = f.bot;
  // H2 · money caps
  if (b.stakeMinTzs == null || stake < b.stakeMinTzs) return hit("STAKE_MIN");
  if (over(b.stakeMaxTzs, stake)) return hit("STAKE_MAX");
  if (over(b.capPerMarketTzs, f.stakeOnMarket + stake)) return hit("PER_MARKET");
  if (b.balanceFloorTzs == null || f.balance - stake < b.balanceFloorTzs) return hit("BALANCE_FLOOR");
  if (over(b.capDailyStakeTzs, f.stakedToday + stake)) return hit("DAILY_STAKE");
  if (over(b.capDailyLossTzs, f.projectedLossToday + stake)) return hit("DAILY_LOSS_PROJECTED");
  if (over(b.capOpenExposureTzs, f.openExposure + stake)) return hit("EXPOSURE");
  // H2 · staff-chosen caps
  if (f.staffChosen) {
    if (b.capStaffChosenPerDay == null || f.staffChosen.count >= b.capStaffChosenPerDay) return hit("STAFF_CHOSEN_PER_DAY");
    if (over(b.capStaffChosenDailyTzs, f.staffChosen.tzs + stake)) return hit("STAFF_CHOSEN_DAILY_STAKE");
  }
  // H3
  const c = f.control;
  if (over(c.gCapPerMarketTzs, f.houseOnMarket + stake)) return hit("GLOBAL_PER_MARKET");
  // H4
  if (over(c.gCapDailyStakeTzs, f.globalStakedToday + stake)) return hit("GLOBAL_DAILY_STAKE");
  if (over(c.gCapDailyLossTzs, f.globalProjectedLossToday + stake)) return hit("GLOBAL_LOSS_PROJECTED");
  if (over(c.gCapOpenExposureTzs, f.globalExposure + stake)) return hit("GLOBAL_EXPOSURE");
  if (f.counterparty) {
    if (c.gCounterPerPlayerPerDay == null || f.counterparty.count + 1 > c.gCounterPerPlayerPerDay) return hit("COUNTERPARTY_COUNT");
    if (over(c.gCounterPerPlayerTzsPerDay, f.counterparty.tzs + stake)) return hit("COUNTERPARTY_TZS");
  }
  if (f.staffChosen) {
    if (c.gCapStaffChosenPerDay == null || f.staffChosen.globalCount >= c.gCapStaffChosenPerDay) return hit("GLOBAL_STAFF_CHOSEN_PER_DAY");
    if (over(c.gCapStaffChosenDailyTzs, f.staffChosen.globalTzs + stake)) return hit("GLOBAL_STAFF_CHOSEN_DAILY_STAKE");
  }
  return null;
}

/**
 * The facts `capPrecheck` reads, one statement at a time (ruling 60: a decision never takes a burst of pooled
 * connections from players' bets). A read that fails throws — the caller's pass fails that decision, never guesses.
 */
export async function loadCapFacts(
  bot: StoredHouseBot,
  marketId: string,
  opts: { control: StoredHouseBotControl; nowMs: number; staffChosen: boolean; counterpartyUserId: string | null },
): Promise<CapFacts> {
  const day = eatDayKey(opts.nowMs);
  const usage = await houseSeamStore.botUsage({ houseBotId: bot.id, marketId });
  const wallet = await db.wallet.findByUserId(bot.userId);
  if (!wallet) throw new Error(`cap-precheck: the holder's wallet could not be read (bot ${bot.id})`);
  const botDay = await houseDayBook(day, bot.id);
  const botExposure = await houseOpenExposure(bot.id);
  const onMarket = await houseSeamStore.marketUsage({ houseBotId: bot.id, marketId });
  const allDay = await houseDayBook(day, null);
  const allExposure = await houseOpenExposure(null);
  let staffChosen: CapFacts["staffChosen"] = null;
  if (opts.staffChosen) {
    /* ⛔ THE RENDER'S OWN DAY, PASSED (replan ruling 542). Without it this member derives a SECOND day of its own
     * — `eatDayKey(Date.now())` on the memory twin and the DATABASE CLOCK on the Prisma twin — so one decision
     * measured its day books on the app clock and its staff-chosen usage on another. Across EAT midnight, or under
     * any app/DB skew, the gate could refuse a stake that is inside its limits or allow one that is over them.
     * Ruling 348's rule, on the path that ENFORCES a limit rather than the one that paints it. */
    const mine = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: bot.id, dayKey: day });
    const all = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null, dayKey: day });
    staffChosen = { count: mine.count, tzs: mine.stakeTzs, globalCount: all.count, globalTzs: all.stakeTzs };
  }
  let counterparty: CapFacts["counterparty"] = null;
  if (opts.counterpartyUserId) {
    const [today] = await houseSeamStore.counterpartyToday([opts.counterpartyUserId]);
    counterparty = { count: today?.count ?? 0, tzs: today?.tzs ?? 0 };
  }
  return {
    bot, control: opts.control, balance: wallet.balance, stakeOnMarket: usage.stakeOnMarket, stakedToday: botDay.stakedTzs,
    projectedLossToday: botDay.projectedLossTzs, openExposure: botExposure, houseOnMarket: onMarket.houseOpenStakeTzs,
    globalStakedToday: allDay.stakedTzs, globalProjectedLossToday: allDay.projectedLossTzs, globalExposure: allExposure,
    staffChosen, counterparty,
  };
}
