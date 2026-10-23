/**
 * MASWALI MILLIONEA — WHAT THE HELP ASSISTANT IS TOLD ABOUT IT (MASWALI-BUILD S6 item 10; MASWALI-PLAN §8 MB-71, MR-25).
 *
 * `src/app/_actions/chat.ts` states its money facts for the two products it was written for, and three of them are false
 * of a weekly jackpot ticket: "13% of the losing side, both games", "a winning bet is never paid less than its stake",
 * "one-sided means refunded". So once Millionea is live the assistant is told which products those facts are about, and
 * what Millionea does instead — every figure read here, never typed (L2: admins can change everything).
 *
 * ⛔ WHO IS TOLD IS MILLIONEA'S GLOBAL ROLLOUT, NEVER THE READER — the journey's precedent (`chat.ts`, S11 WP6): the
 *    prompt is built from the locale and global settings alone (`chat-reader.ts`, `test:privacy-notice` §2c), so the model
 *    is never told who is asking or what a reader's preview shows. ACTIVE → the facts; anything else → null, and every
 *    reader's prompt is today's, byte for byte. A staff preview meets Millionea on its own pages, not in the chat.
 * ⛔ THE FIGURES ARE THE ONES A PLAYER CAN BUY UNDER: the week on sale's frozen rules, or — with no week current — the
 *    rules the next week will freeze (`millioneaHowTo`, the How to play page's own read). Never a literal.
 * ⛔ NOTHING HERE THROWS: an assistant that cannot be told about Millionea answers as today, and its own refusal to
 *    suggest a pick (RULE 1) still stands.
 */
import { dict } from "@/lib/i18n-dict";
import { formatTzs, pctNum } from "@/lib/utils";
import type { RolloutState } from "@/lib/millionea-rollout";
import { millioneaStateNow } from "./millionea-switch";
import { millioneaHowTo, type MillioneaHowTo } from "./maswali-player";

/** The figures the assistant's Millionea passage carries — each already formatted the way the platform prints it. */
export type MillioneaChatFacts = {
  /** The ticket price, `formatTzs`. */
  price: string;
  /** The guaranteed floor, `formatTzs` — null when the rules set no floor (0), so the passage claims none. */
  floor: string | null;
  /** {pct}: the fee's share of the jackpot, taken only in a week whose jackpot is paid — a 10 of 10 week, or a final
   *  week's top scores (§11). */
  feePct: number;
  /** Tickets per account per week. */
  cap: number;
  /** The template's open and close, in English (the prompt's language; the model answers in the reader's). */
  openDay: string;
  openAt: string;
  closeDay: string;
  closeAt: string;
  /** RULES §2.6's free cancel as the week froze it: the window, which is also the runway it needs before the close. */
  freeCancelMinutes: number;
  /** Millionea's own check window after the results are final (OD-05), never the polls' objection window. */
  checkWindowHours: number;
};

/** An ISO weekday (1 = Monday … 7 = Sunday) in English, from the dictionary the rest of Millionea reads. */
function dayIn(weekday: number): string {
  return dict.en.millionea.weekdays[weekday - 1] ?? "";
}

/**
 * ⭐ THE PURE CORE: the facts for one rollout state, from one read of the rules. Null below ACTIVE without reading, and
 * null when the rules cannot be read or do not form a passage the assistant could state truthfully.
 */
export async function millioneaChatFactsFor(state: RolloutState, read: () => Promise<MillioneaHowTo>): Promise<MillioneaChatFacts | null> {
  if (state !== "ACTIVE") return null;
  try {
    const h = await read();
    const openDay = dayIn(h.openWeekday), closeDay = dayIn(h.closeWeekday);
    if (!openDay || !closeDay || !Number.isSafeInteger(h.ticketPrice) || h.ticketPrice <= 0) return null;
    return {
      price: formatTzs(h.ticketPrice), floor: h.floor > 0 ? formatTzs(h.floor) : null, feePct: pctNum(h.feeRate),
      cap: h.ticketCap, openDay, openAt: h.openAt, closeDay, closeAt: h.closeAt,
      freeCancelMinutes: h.freeCancelMinutes, checkWindowHours: h.objectionWindowHours,
    };
  } catch {
    return null;
  }
}

/** The assistant's Millionea facts NOW — what `chat.ts` hands its prompt builder. Never rejects. */
export async function millioneaChatFacts(): Promise<MillioneaChatFacts | null> {
  try {
    return await millioneaChatFactsFor(await millioneaStateNow(), () => millioneaHowTo({ userId: null, state: "ACTIVE" }));
  } catch {
    return null;
  }
}
