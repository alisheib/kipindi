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
import { TURN_BUSY_HORIZON_SEC, capEngineCode, type CapCode, type EngineCode } from "@/lib/house-bot/constants";
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

/* ═══ N3 · the turn order's facts, and the check at the moment the stake is due ═══════════════════ */

/**
 * One account's rate facts for a pass: its placed stakes (the seam's own rolling windows) and what it already has
 * queued. The queued figures move as the pass gives the account more rows (`noteQueued`).
 */
export type RateFacts = {
  lastPlacedAt: string | null;
  placedLastHour: number;
  placedLastDay: number;
  liveCount: number;
  liveStakeTzs: number;
  /** The soonest due time among its queued rows — the draw's busy term (`busyAtLoad`). */
  minQueuedDueAt: string | null;
  /** The latest due time among its queued rows — with the soonest, `capAtDue`'s minimum-gap term. */
  maxQueuedDueAt: string | null;
};

const blankRates = (): RateFacts => ({ lastPlacedAt: null, placedLastHour: 0, placedLastDay: 0, liveCount: 0, liveStakeTzs: 0, minQueuedDueAt: null, maxQueuedDueAt: null });

/**
 * The whole roster's rate facts in TWO statements (never a per-account loop — ruling 351's shape): `botRateUsage`
 * for every account, then `liveSummaryByBot`. An account absent from both reads gets zeros (`rateFactsFor`).
 */
export async function loadRosterRates(): Promise<Map<string, RateFacts>> {
  const out = new Map<string, RateFacts>();
  for (const r of await houseSeamStore.botRateUsage({ houseBotId: null })) {
    out.set(r.houseBotId, { ...blankRates(), lastPlacedAt: r.lastPlacedAt, placedLastHour: r.placedLastHour, placedLastDay: r.placedLastDay });
  }
  for (const l of await houseBotIntentStore.liveSummaryByBot()) {
    out.set(l.houseBotId, { ...(out.get(l.houseBotId) ?? blankRates()), liveCount: l.count, liveStakeTzs: l.stakeTzs, minQueuedDueAt: l.minDueAt, maxQueuedDueAt: l.maxDueAt });
  }
  return out;
}

/**
 * These facts with one account's own queued rows taken out (N3 review finding 4) — for the trigger, which no longer
 * counts that account's DEAD openers (a queued opener on a market that now holds money can never place) against it:
 * neither their stake on the floor, their count on the rate, nor their due time on the gap. When the removed rows held
 * the soonest or latest due time, that bound is dropped rather than guessed — the seam still measures the gap at fire.
 */
export function withoutQueued(rates: RateFacts, rows: ReadonlyArray<{ stakeTzs: number; dueAt: string }>): RateFacts {
  if (rows.length === 0) return rates;
  const dues = new Set(rows.map((r) => Date.parse(r.dueAt)));
  const count = Math.max(0, rates.liveCount - rows.length);
  return {
    ...rates,
    liveCount: count,
    liveStakeTzs: Math.max(0, rates.liveStakeTzs - rows.reduce((s, r) => s + r.stakeTzs, 0)),
    minQueuedDueAt: count === 0 || (rates.minQueuedDueAt != null && dues.has(Date.parse(rates.minQueuedDueAt))) ? null : rates.minQueuedDueAt,
    maxQueuedDueAt: count === 0 || (rates.maxQueuedDueAt != null && dues.has(Date.parse(rates.maxQueuedDueAt))) ? null : rates.maxQueuedDueAt,
  };
}

/** This account's facts from a roster read — zeros when it has never staked and has nothing queued. */
export const rateFactsFor = (roster: ReadonlyMap<string, RateFacts>, botId: string): RateFacts => ({ ...(roster.get(botId) ?? blankRates()) });

/**
 * The draw's busy term at load (N3): the SOONEST queued due time, when it falls within `TURN_BUSY_HORIZON_SEC` of now
 * — a stake about to be placed makes its account busy (weight 1 until it is due). A row due further ahead, a poll's
 * fill queued 25 minutes out, makes it busy for nothing: holding such an account at the back of every draw until then
 * was the very starvation N3 removes (review finding 3). Within a pass, `markBusy` moves it to each new row's due time.
 */
export function busyAtLoad(rates: RateFacts, nowMs: number): string | null {
  if (rates.minQueuedDueAt == null) return null;
  return Date.parse(rates.minQueuedDueAt) <= nowMs + TURN_BUSY_HORIZON_SEC * 1000 ? rates.minQueuedDueAt : null;
}

/** A pass queued another row on this account (N3): its stake still has to come out of the wallet, and it counts. */
export function noteQueued(rates: RateFacts, row: { stakeTzs: number; dueAt: string }): void {
  rates.liveCount += 1;
  rates.liveStakeTzs += row.stakeTzs;
  if (rates.minQueuedDueAt == null || Date.parse(row.dueAt) < Date.parse(rates.minQueuedDueAt)) rates.minQueuedDueAt = row.dueAt;
  if (rates.maxQueuedDueAt == null || Date.parse(row.dueAt) > Date.parse(rates.maxQueuedDueAt)) rates.maxQueuedDueAt = row.dueAt;
}

/**
 * ⭐ WOULD THE SEAM REFUSE THIS ROW WHEN IT IS DUE? (N3, Ali 2026-10-14) — the account-owned refusals `capPrecheck`
 * cannot see, because it tests the smallest stake NOW and leaves the rate caps out (ruling 94). Measured on production
 * over 7 days: 282 rounds lost at fire to CAP_BALANCE_FLOOR and 126 to CAP_MIN_GAP — each one planned onto an account
 * that was always going to be refused, while another could have taken it.
 *   · the balance floor at the row's OWN stake, less what the account already has queued;
 *   · the minimum gap — refused only where the SEAM would refuse it: the seam answers MIN_GAP with an `until`, and the
 *     mapper DEFERS the row to it when that is before the row's `staleAt` (N1 §4.3). So the row is refused only when
 *     its earliest free time — the later of its last placed stake + gap and its latest queued stake due no later than
 *     it + gap — is at or after `staleAt`. A queued stake due AFTER this row is that row's own gap to keep, at its fire.
 *     ⛔ Refusing on the bare gap, as this first did, threw away the deferral: a player's one reaction
 *     (`hbi_counter_anchor_uq`) was lost for good where the seam would have placed it a few seconds late (review
 *     finding 1, 2026-10-14);
 *   · the hourly and daily rate, counting its queued rows (the seam gives those no `until`, so it never defers them).
 * In the seam's own order (BALANCE_FLOOR, then MIN_GAP, PER_HOUR, PER_DAY). A cap that is not set refuses, as there.
 * ⛔ THE SEAM STAYS THE AUTHORITY (I6). This only keeps a row off an account the seam would refuse; a refusal here is
 * a planning refusal, and the planner offers the market to the next account in the same pass.
 */
export function capAtDue(
  bot: Pick<StoredHouseBot, "balanceFloorTzs" | "freqMinGapSec" | "freqMaxPerHour" | "freqMaxPerDay">,
  f: { balance: number; rates: RateFacts },
  row: { stakeTzs: number; dueAt: string; staleAt: string },
): EngineCode | null {
  const hit = (code: CapCode): EngineCode => capEngineCode(code);
  if (bot.balanceFloorTzs == null || f.balance - f.rates.liveStakeTzs - row.stakeTzs < bot.balanceFloorTzs) return hit("BALANCE_FLOOR");
  if (bot.freqMinGapSec == null) return hit("MIN_GAP");
  const dueMs = Date.parse(row.dueAt);
  const gapMs = bot.freqMinGapSec * 1000;
  // The latest queued stake due no later than this row: the latest if it qualifies, else the soonest if that does.
  const max = f.rates.maxQueuedDueAt == null ? null : Date.parse(f.rates.maxQueuedDueAt);
  const min = f.rates.minQueuedDueAt == null ? null : Date.parse(f.rates.minQueuedDueAt);
  const queuedBefore = max != null && max <= dueMs ? max : min != null && min <= dueMs ? min : null;
  const freeAtMs = Math.max(
    dueMs,
    f.rates.lastPlacedAt != null ? Date.parse(f.rates.lastPlacedAt) + gapMs : Number.NEGATIVE_INFINITY,
    queuedBefore != null ? queuedBefore + gapMs : Number.NEGATIVE_INFINITY,
  );
  if (!(freeAtMs < Date.parse(row.staleAt))) return hit("MIN_GAP");
  if (bot.freqMaxPerHour == null || f.rates.placedLastHour + f.rates.liveCount >= bot.freqMaxPerHour) return hit("PER_HOUR");
  if (bot.freqMaxPerDay == null || f.rates.placedLastDay + f.rates.liveCount >= bot.freqMaxPerDay) return hit("PER_DAY");
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
