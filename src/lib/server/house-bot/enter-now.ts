/**
 * ENTER NOW — the loader and the one "is this market held?" predicate (04 N1 §4.2, §4.4).
 *
 * `loadEnterNowInput` reads every input of `enterNowDecision` fresh. The preview, the press and fire all call it, so
 * the figure an officer confirms is the figure fire re-derives. `marketHeld` is the one holding predicate for the
 * picker, the preview, the press and fire.
 *
 * ⛔ BLACKOUT FIRST. A blacked-out market is never drawn: the opener side is drawn only after the blackout read says
 * no, and only when both raw pools are 0 (N1 §4.1, §4.2 "Load order").
 *
 * ⛔ THE SAME READS AS THE SEAM. Every usage figure comes from the read H2–H4 make (`botUsage`, `marketUsage`,
 * `houseDayBook`, `houseOpenExposure`, `staffChosenPlacedToday`, `counterpartyToday`), so a preview can never promise
 * room the gate then refuses. Where N1's text and the gate count differently, the gate's count is used (C4-SPEC
 * rulings 58–59).
 *
 * ⛔ NO RESULT-CHECK FIELD. The market arrives as `PublicMarketView` (A13); the only result-check fact is `{blocked}`
 * from `blackout.ts`.
 */
import { eatDayKey } from "@/lib/house-bot/clock";
import { parseHouseBotRules, type HouseBotRulesV1 } from "@/lib/house-bot/rules";
import type { IntentKind } from "@/lib/house-bot/constants";
import { db } from "../store";
import { positionStore } from "../market-dal";
import { stakeBoundsForMarket } from "../market-service";
import {
  houseBotControlStore, houseBotIntentStore, houseBotRuntimeStore, houseBotStore, houseSeamStore, targetStore,
  type OpenerDrawnFor, type StoredHouseBot,
} from "../house-bot-dal";
import { houseDayBook, houseOpenExposure } from "./book";
import { infoBlackout } from "./blackout";
import { lockedForHouse, lockedPoolInputsOfView } from "./pools";
import { projectMarketView, type PublicMarketView } from "./market-view";
import { openerSide, type DrawRandomInt } from "./opener-side";
import { loadParseContext } from "./rules-context";
import type { EnterNowInput, EnterNowSide } from "./enter-now-decision";

/** The longest rate window the decision reads (PER_DAY) and the platform one (GLOBAL_BETS_PER_MINUTE), in seconds. */
const BOT_RATE_WINDOW_SEC = 86_400;
const PLATFORM_RATE_WINDOW_SEC = 60;

export type EnterNowLoadRefusal = "BOT_MISSING" | "MARKET_MISSING" | "RULES_FROM_FUTURE" | "RULES_REVIEW";

export type EnterNowLoad =
  | {
      ok: true;
      input: EnterNowInput;
      view: PublicMarketView;
      bot: StoredHouseBot;
      rules: HouseBotRulesV1;
      /** True only when this load wrote the market's opener draw. */
      drawn: boolean;
    }
  | { ok: false; code: EnterNowLoadRefusal; field?: string };

/**
 * Every input of `enterNowDecision`, read fresh (N1 §4.2). A read that fails throws — the caller's transient path,
 * never a stake. It checks nothing a refusal list owns (master, bot status, holder, scope, lifecycle, holding): the
 * press and fire run those first.
 */
export async function loadEnterNowInput(
  botId: string,
  marketId: string,
  opts: { actorId: string | null; drawnFor: OpenerDrawnFor },
  deps: { randomInt?: DrawRandomInt } = {},
): Promise<EnterNowLoad> {
  const bot = await houseBotStore.get(botId);
  if (!bot) return { ok: false, code: "BOT_MISSING" };
  const row = await houseSeamStore.marketView(marketId);
  if (!row) return { ok: false, code: "MARKET_MISSING" };
  const view = projectMarketView(row);
  const { blocked } = await infoBlackout(marketId);

  const parsed = parseHouseBotRules(bot.rules, await loadParseContext());
  if (!parsed.ok) {
    return { ok: false, code: parsed.code === "RULES_FROM_FUTURE" ? "RULES_FROM_FUTURE" : "RULES_REVIEW", ...(parsed.field ? { field: parsed.field } : {}) };
  }

  const pools = await lockedForHouse(marketId, lockedPoolInputsOfView(view));
  let openerDraw: EnterNowInput["openerDraw"] = null;
  let drawn = false;
  if (!blocked && pools.YES.raw === 0 && pools.NO.raw === 0) {
    const d = await openerSide(marketId, { houseBotId: botId, actorId: opts.actorId, drawnFor: opts.drawnFor }, deps);
    openerDraw = { side: d.side, drawnFor: d.drawnFor, drawnAt: d.drawnAt };
    drawn = d.drawn;
  }

  const { nowMs } = await houseBotRuntimeStore.dbClock();
  const dayKey = eatDayKey(nowMs);
  const counterpartyIds = [...new Set([...pools.YES.accounts, ...pools.NO.accounts].map((a) => a.userId))];
  // ⛔ ONE READ AT A TIME. A preview is an officer's click on a live money platform: fifteen parallel reads would take
  // fifteen pooled connections from players' bets at once (a parallel first draft exhausted the scratch cluster).
  const mine = await positionStore.listForUserAndMarket(bot.userId, marketId);
  const usage = await houseSeamStore.botUsage({ houseBotId: botId, marketId });
  const onMarket = await houseSeamStore.marketUsage({ houseBotId: botId, marketId });
  const botDay = await houseDayBook(dayKey, botId);
  const allDay = await houseDayBook(dayKey, null);
  const botExposure = await houseOpenExposure(botId);
  const allExposure = await houseOpenExposure(null);
  /* ⛔ THE PREVIEW'S OWN DAY, PASSED (replan ruling 542). `dayKey` above is derived ONCE from the DATABASE clock
     and both day books already honour it; without it here the member derived a second day of its own, so one preview
     measured its day books on one clock and its staff-chosen usage on another. */
  const botStaff = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: botId, dayKey });
  const allStaff = await houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null, dayKey });
  const wallet = await db.wallet.findByUserId(bot.userId);
  if (!wallet) throw new Error(`enter-now: the holder's wallet could not be read (bot ${botId})`);
  const botPlaced = await houseSeamStore.placedTimes({ houseBotId: botId, withinSec: BOT_RATE_WINDOW_SEC });
  const platformPlaced = await houseSeamStore.placedTimes({ houseBotId: null, withinSec: PLATFORM_RATE_WINDOW_SEC });
  const control = await houseBotControlStore.get();
  const counterparties = await houseSeamStore.counterpartyToday(counterpartyIds);
  const bounds = await stakeBoundsForMarket({ id: marketId, productLine: view.productLine === "UPDOWN" ? "UPDOWN" : "MARKET" });

  // Ruling 59 · `own` is the holder's OPEN marked positions, as H2's conflict check reads them. Two sides cannot
  // both be held: H2 refuses OPPOSITE_SIDE before a second side is ever placed.
  const houseOpen = mine.filter((p) => p.status === "OPEN" && p.houseBotId != null);
  const input: EnterNowInput = {
    view: { id: view.id, titleEn: view.titleEn, category: view.category, selectionClosedAt: view.selectionClosedAt },
    blocked,
    pools,
    openerDraw,
    own: { side: (houseOpen[0]?.side ?? null) as EnterNowSide | null, count: houseOpen.length, stakeTzs: houseOpen.reduce((s, p) => s + p.stake, 0) },
    rules: { thinStakeTzs: parsed.rules.enterNow.thinStakeTzs, openerStakeTzs: parsed.rules.enterNow.openerStakeTzs, roundToTzs: parsed.rules.shaping.roundToTzs },
    bot: {
      stakeMinTzs: bot.stakeMinTzs,
      stakeMaxTzs: bot.stakeMaxTzs,
      capPerMarketTzs: bot.capPerMarketTzs,
      capDailyStakeTzs: bot.capDailyStakeTzs,
      capDailyLossTzs: bot.capDailyLossTzs,
      capOpenExposureTzs: bot.capOpenExposureTzs,
      balanceFloorTzs: bot.balanceFloorTzs,
      capStaffChosenPerDay: bot.capStaffChosenPerDay,
      capStaffChosenDailyTzs: bot.capStaffChosenDailyTzs,
      freqMinGapSec: bot.freqMinGapSec,
      freqMaxPerHour: bot.freqMaxPerHour,
      freqMaxPerDay: bot.freqMaxPerDay,
      stakeOnMarket: usage.stakeOnMarket,
      stakedToday: botDay.stakedTzs,
      projectedLossToday: botDay.projectedLossTzs,
      openExposure: botExposure,
      staffChosenCountToday: botStaff.count,
      staffChosenTzsToday: botStaff.stakeTzs,
      balance: wallet.balance,
      placedAt: botPlaced,
    },
    control: {
      gCapPerMarketTzs: control.gCapPerMarketTzs,
      gCapDailyStakeTzs: control.gCapDailyStakeTzs,
      gCapDailyLossTzs: control.gCapDailyLossTzs,
      gCapOpenExposureTzs: control.gCapOpenExposureTzs,
      gCapStaffChosenPerDay: control.gCapStaffChosenPerDay,
      gCapStaffChosenDailyTzs: control.gCapStaffChosenDailyTzs,
      gStaffChosenMaxCounterpartyShare: control.gStaffChosenMaxCounterpartyShare,
      gCounterPerPlayerPerDay: control.gCounterPerPlayerPerDay,
      gCounterPerPlayerTzsPerDay: control.gCounterPerPlayerTzsPerDay,
      gMaxBetsPerMinute: control.gMaxBetsPerMinute,
      houseOnMarket: onMarket.houseOpenStakeTzs,
      globalStakedToday: allDay.stakedTzs,
      globalProjectedLossToday: allDay.projectedLossTzs,
      globalExposure: allExposure,
      globalStaffChosenCountToday: allStaff.count,
      globalStaffChosenTzsToday: allStaff.stakeTzs,
      platformPlacedAt: platformPlaced,
    },
    counterparties,
    bounds,
    now: new Date(nowMs).toISOString(),
  };
  return { ok: true, input, view, bot, rules: parsed.rules, drawn };
}

/** N1 §6 refusal 15 a–d, in that order. */
export type MarketHeld =
  | { held: false }
  | { held: true; code: "OWNER_POSITION" }
  /** `botId` is null when only another bot's OPEN position (an aggregate read) holds the market. */
  | { held: true; code: "OTHER_BOT"; botId: string | null }
  | { held: true; code: "OWN_INTENT"; intentId: string; kind: IntentKind; dueAt: string }
  | { held: true; code: "PER_MARKET_COUNT"; count: number; max: number | null };

/**
 * Is this market held for this bot (N1 §4.4)? `ignoreIntentId` is the row being fired, which must not hold its own
 * market. The bot is read fresh; a missing bot throws (every caller checked it first).
 */
export async function marketHeld(botId: string, marketId: string, opts: { ignoreIntentId?: string | null } = {}): Promise<MarketHeld> {
  const bot = await houseBotStore.get(botId);
  if (!bot) throw new Error(`marketHeld: no bot ${botId}`);
  // One read at a time, as the loader (pooled connections belong to players' bets first).
  const mine = await positionStore.listForUserAndMarket(bot.userId, marketId);
  const live = await houseBotIntentStore.listLiveOnMarket(marketId);
  const target = await targetStore.activeForMarket(marketId);
  const onMarket = await houseSeamStore.marketUsage({ houseBotId: botId, marketId });
  const usage = await houseSeamStore.botUsage({ houseBotId: botId, marketId });

  // a · the holder's own OPEN stake (H2 OWNER_POSITION).
  if (mine.some((p) => p.status === "OPEN" && p.houseBotId == null)) return { held: true, code: "OWNER_POSITION" };

  // b · another bot: a live intent, an ACTIVE target, or an OPEN house position (I3; H3 OTHER_BOT).
  const liveOther = live.find((i) => i.houseBotId !== botId);
  if (liveOther) return { held: true, code: "OTHER_BOT", botId: liveOther.houseBotId };
  if (target && target.houseBotId !== botId) return { held: true, code: "OTHER_BOT", botId: target.houseBotId };
  if (onMarket.otherBotOpen) return { held: true, code: "OTHER_BOT", botId: null };

  // c · this bot's own live intent of any kind, other than the row being fired.
  const own = live.find((i) => i.houseBotId === botId && i.id !== opts.ignoreIntentId);
  if (own) return { held: true, code: "OWN_INTENT", intentId: own.id, kind: own.kind, dueAt: own.dueAt };

  // d · ruling 58 · H2's own count: this bot's marked positions here in ANY status; a count that is not set holds.
  const max = bot.freqMaxPerMarket;
  if (max == null || usage.countOnMarket >= max) return { held: true, code: "PER_MARKET_COUNT", count: usage.countOnMarket, max };
  return { held: false };
}
