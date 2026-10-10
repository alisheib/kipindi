"use server";

/**
 * THE HELP CHAT, AS THIS READER MAY BE ANSWERED — R8-D (2026-10-10, the owner's ruling (4) completed; owner items 16 and 56):
 * during a reader's break the assistant shows no door to the three programmes that pay for activity — Alika
 * (/profile/invite), Mapendekezo (/proposals), Kuwa wakala (/agent). `ChatRoot` calls this; this calls `chatWithClaude`
 * (`chat.ts`, unchanged — D19a keeps it byte-identical) exactly as before, for every reader.
 *
 * ⛔ THE MODEL IS SENT NOTHING NEW. /legal/privacy §4 tells players, in all three languages, that Anthropic receives "the
 * messages of that conversation, not your account details", and `test:privacy-notice` §2c pins its premise: a system prompt
 * built from the locale and one global setting alone. A prompt that said — or implied, by a line left out — that this reader
 * is on a break would hand a responsible-gambling fact about the account to a third party. So the break is applied on OUR
 * side of the call, to what the reader is SHOWN:
 *   · not on a break — or signed out, or a failed read (an offer fails open): the live answer, untouched;
 *   · on a break, when the question or the answer touches one of the three programmes (`touchesAnOffer`): the break's own
 *     approved sentence with its end (`rg.breakActive` / `rg.exclusionActive`) — what /profile/invite and /proposals say on a
 *     break (R8-C) — in place of the answer; every other answer as the model gave it;
 *   · on a break with no live answer (the burst limiter, a missing key): never the offline corpus, which teaches the three
 *     programmes — the chat's own "try again in a moment" line (`chat.errorFallback`), marked unresolved.
 * The call itself — its rate limit, its daily quota, its prompt and its messages — is today's for everybody.
 */
import { getSession } from "@/lib/server/session";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakSentence, breakStateOf } from "@/lib/break-end";
import { dict, type Locale } from "@/lib/i18n-dict";
import { touchesAnOffer } from "@/lib/chat/break-guard";
import { chatWithClaude } from "./chat";

export async function chatForReader(
  history: { role: "user" | "assistant"; content: string }[],
  userText: string,
  locale: string = "en",
): Promise<{ text: string; unresolved?: boolean } | null> {
  const live = await chatWithClaude(history, userText, locale);
  const session = await getSession();
  if (!session) return live;
  const breakEnd = await Promise.resolve().then(() => isLockedOut(session.userId)).then(breakStateOf).catch(() => null);
  if (!breakEnd) return live;
  const l: Locale = locale === "sw" || locale === "zh" ? locale : "en";
  const t = dict[l];
  if (!live) return { text: t.chat.errorFallback, unresolved: true };
  if (touchesAnOffer(userText) || touchesAnOffer(live.text)) {
    return { text: breakSentence(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, breakEnd.until, Date.now(), t.common.monthsShort, l).text };
  }
  return live;
}
