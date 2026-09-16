/**
 * THE HOLDER'S OWN MONEY, ON A LIVE HOUSE-BOT ACCOUNT — the F7 hook (02 §3.6, C4-SPEC step 10).
 *
 * ⭐ WHY ADMINS ARE TOLD. A house bot stakes from a real player's wallet. When that player deposits, withdraws, or an
 * officer adjusts the balance, the bot's reach changes with it, and a withdrawal in flight can starve a stake the
 * engine is about to place. Every admin hears about it, once per money event.
 *
 * ⛔ ONLY AN ACTIVE BOT (02 §3.6: "the bot is read fresh and nothing happens unless it is ACTIVE"). A paused bot's
 * holder moving their own money is their business; a bot that is running is the house's.
 *
 * ⛔ TWO IDENTICAL EVENTS ARE TWO ROWS (02 §3.6's test). A holder who withdraws TZS 50,000 twice did it twice, so the
 * emitter never dedupes, and the OWNER_MONEY event is written for each.
 *
 * ⛔ IT NEVER THROWS, AND IT NEVER TOUCHES THE MONEY. It runs after the write has committed and outside every lock;
 * a failure is logged and the money path is exactly as it would have been without house bots.
 */
import type { MoneyEventCode } from "@/lib/house-bot/alert-copy";
import { houseBotEventStore, houseBotStore } from "../house-bot-dal";
import { db } from "../store";
import { announceMoneyEvent } from "./emitters";

export type MoneyHookResult = "noBot" | "notActive" | "sent" | "failed";

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

export async function onHolderMoneyEvent(
  userId: string,
  /** `balanceTzs` is read fresh when omitted: the copy says "balance now", and the write sites need not thread it. */
  e: { event: MoneyEventCode; amountTzs: number; txnId: string; balanceTzs?: number },
): Promise<MoneyHookResult> {
  try {
    const live = await houseBotStore.findLiveByUserId(userId);
    if (!live) return "noBot";
    // Read fresh: the index row may be a moment old, and "ACTIVE" is the whole condition.
    const bot = await houseBotStore.get(live.id);
    if (!bot || bot.status !== "ACTIVE") return "notActive";
    // ⛔ try/catch, not `.catch`: the memory store answers with a plain value.
    let balanceTzs = e.balanceTzs ?? 0;
    if (e.balanceTzs == null) {
      try { balanceTzs = (await db.wallet.findByUserId(bot.userId))?.balance ?? 0; } catch { balanceTzs = 0; }
    }
    await houseBotEventStore.append({
      houseBotId: bot.id, userId: bot.userId, marketId: null, kind: "OWNER_MONEY", fromStatus: bot.status, toStatus: bot.status,
      reason: null, actorId: null, payload: { event: e.event, amountTzs: e.amountTzs, txnId: e.txnId, balanceTzs },
    });
    await announceMoneyEvent({
      botId: bot.id, label: bot.label, holderUserId: bot.userId, event: e.event,
      amountTzs: e.amountTzs, txnId: e.txnId, balanceTzs,
    });
    return "sent";
  } catch (err) {
    console.error("[house-bot] holder money hook failed — the money path is unaffected:", errMessage(err));
    return "failed";
  }
}
