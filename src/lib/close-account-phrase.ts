/**
 * THE PHRASE A PLAYER TYPES TO CLOSE THEIR ACCOUNT — one definition, read by the form and by the server action.
 *
 * 🔴 WHY (2026-09-14, register E-400 ⑦c). The form asked Swahili and Chinese players to type the ENGLISH phrase
 * "CLOSE MY ACCOUNT", in a sentence that was otherwise in their language, because the server compared the input to
 * that one English literal. Typing a phrase is the friction that makes an irreversible act deliberate, and a phrase
 * in a language the player may not read is friction of the wrong kind. Each locale now shows its own phrase.
 *
 * ⭐ THE SERVER ACCEPTS ANY LOCALE'S PHRASE, NOT ONLY THE ONE FOR THE COOKIE IT SEES. A player who switches language
 * between reading the label and pressing the button is still making the same deliberate act, and the cookie is not a
 * fact the action should have to trust for a friction check. What must hold is that the input is one of these
 * phrases, typed whole.
 *
 * ⚠️ The form and the action had also disagreed: the form trimmed the input and the action did not, so a phrase typed
 * with a trailing space enabled the button and was then refused. Both now use `isCloseAccountConfirmation`, which
 * trims and collapses inner whitespace. Case is NOT folded: the dictionary asks for the phrase "exactly as shown".
 *
 * ⛔ PURE. Imported by a client component and a server action alike.
 */
import type { Locale } from "./i18n-dict";

export const CLOSE_ACCOUNT_PHRASE: Record<Locale, string> = {
  en: "CLOSE MY ACCOUNT",
  sw: "FUNGA AKAUNTI YANGU",
  zh: "关闭我的账户",
};

const normalise = (s: string) => s.trim().replace(/\s+/g, " ");

export function isCloseAccountConfirmation(input: string): boolean {
  const typed = normalise(input);
  return (Object.values(CLOSE_ACCOUNT_PHRASE) as string[]).some((phrase) => normalise(phrase) === typed);
}
