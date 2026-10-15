/** Planning mirror of the PAIR-only H4 caps; H4 remains the in-lock authority. */
import { eatDayKey } from "@/lib/house-bot/clock";
import type { EngineCode } from "@/lib/house-bot/constants";
import type { HouseBotRulesV1 } from "@/lib/house-bot/rules";
import { houseBotIntentStore, type StoredHouseBotControl } from "../house-bot-dal";

export async function pairCapPrecheck(input: {
  control: StoredHouseBotControl;
  houseBotId: string;
  rules: HouseBotRulesV1;
  stakeTzs: number;
  nowMs: number;
}): Promise<EngineCode | null> {
  const { control, houseBotId, rules, stakeTzs, nowMs } = input;
  if (control.gCapPairRoundsPerDay == null || control.gCapPairRoundsPerDay < 1) return "CAP_PAIR_ROUNDS_PER_DAY";
  if (control.gCapPairDailyTzs == null || control.gCapPairDailyTzs < stakeTzs) return "CAP_PAIR_DAILY_TZS";
  if (rules.share.matchPerDay < 1) return "CAP_PAIR_ACCOUNT_PER_DAY";
  const dayKey = eatDayKey(nowMs);
  const allLive = await houseBotIntentStore.pairLiveToday({ houseBotId: null, dayKey });
  const allPlaced = await houseBotIntentStore.pairPlacedToday({ houseBotId: null, dayKey });
  if (allLive.count + allPlaced.count >= control.gCapPairRoundsPerDay) return "CAP_PAIR_ROUNDS_PER_DAY";
  if (allLive.stakeTzs + allPlaced.stakeTzs + stakeTzs > control.gCapPairDailyTzs) return "CAP_PAIR_DAILY_TZS";
  const mineLive = await houseBotIntentStore.pairLiveToday({ houseBotId, dayKey });
  const minePlaced = await houseBotIntentStore.pairPlacedToday({ houseBotId, dayKey });
  if (mineLive.count + minePlaced.count >= rules.share.matchPerDay) return "CAP_PAIR_ACCOUNT_PER_DAY";
  return null;
}
