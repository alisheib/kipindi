/**
 * ⛔ OWNER RULING 2026-10-09 — A MARKETING SMS IS SENT EXACTLY AS THE OFFICER WROTE IT. Nothing is appended: no
 * source line, no "50pick 18+", no helpline, no "Acha:" stop link (COMPLIANCE-DECISIONS § "2026-10-09 · Privacy
 * v2026-10-09 — a marketing SMS is sent exactly as the officer wrote it: no stop link, no 18+, no helpline, no source
 * line (owner ruling)").
 * `marketingFooter` is therefore EMPTY and `operatorBudget` is the whole message's cap; the composed text is the
 * officer's message with `{jina}` filled in, and `test:campaign-compose` plants a footer to prove nothing is added.
 * What stays: the message must still BEGIN with "50pick" (the officer's own text, checked — the sender is named), and
 * the opt-out path and token length stay for the `/s/<token>` page, so a link already sent keeps working.
 * The envelope below is the history of what the engine appended until that ruling.
 *
 * ⭐ (UNTIL 2026-10-09) THE STATUTORY ENVELOPE — what every marketing SMS must carry, appended by the engine and
 * impossible for an officer to remove.
 *
 * 🔴 D5: NO SMS THIS PLATFORM SENDS CARRIES A SENDER IDENTITY OR A RESPONSIBLE-GAMING FOOTER, and
 * both are required. ETA Cap 442 s.32(1)(b)–(c) requires the sender to be identified and an opt-out
 * to be given IN EVERY MESSAGE; s.32(2)(d) and GBT Code cl. 3.7.1–3.7.2 require the condensed
 * responsible-gaming message and a helpline — the one 50pick publishes (Ali, OQ4). A campaign body typed by an officer cannot be
 * trusted to carry them, so the engine appends them and the arithmetic counts them.
 *
 * ── WHY THE FOOTER IS COUNTED, NOT JUST ADDED ────────────────────────────────
 * ⛔ IF THE COMPOSER SIZES THE BODY AND THE ENGINE SENDS BODY + FOOTER, EVERY QUOTE IS WRONG BY 49
 * SEPTETS. A body of 140 characters looks like one segment and sends as two — and at the ~150,000
 * contacts §3c specifies, a second segment is TZS 900,000. So the operator's budget is the SINGLE
 * SEGMENT LIMIT MINUS THE FOOTER, computed here rather than typed, and the composer shows that
 * number rather than 160.
 *
 * ── EVERY STRING IN THE FOOTER IS COPIED, NOT INVENTED ───────────────────────
 * §5.13 and OQ9: no new Swahili sentence is written for players. Both Swahili fragments are already
 * shipped, and these are the lines they are copied from:
 *   · `miaka 18+`  →  `i18n-dict.ts` `tanzaniaMobile18`: "Simu ya Tanzania, miaka 18+." — the string
 *     on the registration screen every player already passes through.
 *   · `Acha`       →  `i18n-dict.ts` `unfollow`: "Acha kufuatilia soko hili" — the verb this product
 *     already uses for "stop doing this".
 * ⭐ `18+` is a symbol rather than prose deliberately: the shipped sentence "miaka 18 au zaidi" is
 * fifteen septets and this footer has forty-nine to spend in total.
 *
 * ── THE HELPLINE IS THE ONE `support-config.ts` PUBLISHES — OQ4 ANSWERED ───────
 * Until 2026-09-26 this footer carried the Gaming Board Advertising Code's `0800110051` while
 * `support-config.ts` publishes `0800 11 0011`, and that contradiction was OQ4 — deliberately left
 * unresolved until the owner answered. ⭐ Ali, 2026-09-26: *"the right helpline is ours."* So the footer
 * now reads the ONE published number from `support-config.ts` (its dial form, no spaces — the same ten
 * septets the Board's number took, so the 49-septet footer budget is unchanged). ⛔ Never a second
 * helpline literal here again: `test:campaign-compose` §12 asserts the footer IS the published number
 * and that the Board's number appears nowhere in it.
 *
 * Guard: `npm run test:campaign-compose`.
 */
import { appUrl } from "@/lib/app-url";
import { sizeSms, unitsIn, capUnits, SMS_MAX_SEGMENTS, type SmsEncoding, type SmsSize } from "@/lib/sms-compose";
import { HELPLINE_TEL } from "@/lib/support-config";

/** The opt-out path's token length. ⛔ The route itself is plan U8; this is the length it must mint. */
export const OPTOUT_TOKEN_CHARS = 8;

/** The opt-out path. `50pick.tz/s/<token>` — short because every character is a septet. */
export const OPTOUT_PATH = "/s/";

/** OURS — the number `support-config.ts` publishes, in dial form (OQ4, answered 2026-09-26).
 *  ⛔ A FUNCTION, NOT A CONSTANT: since 2026-10-03 the helpline is editable in /admin/system, and a
 *  value captured at import would keep the old number for the life of the process. */
export function statutorySmsHelpline(): string {
  return HELPLINE_TEL();
}

/** ETA s.32(1)(b): the sender must be identified, and at the START of the message. */
export const SENDER_IDENTITY = "50pick";

export type MarketingLocale = "SW" | "EN";

/**
 * ⭐ THE SHORT DOMAIN IS DERIVED FROM `appUrl()`, NEVER TYPED.
 *
 * 🔴 A TYPED DOMAIN IS A BILL WAITING TO HAPPEN. If the deployment's public URL ever changes to
 * something longer, a typed `50pick.tz` would keep printing a link that no longer resolves, and a
 * typed longer domain would silently push every single-segment campaign into two. Deriving it means
 * a domain change shows up as a failing assertion at build time rather than as an invoice.
 *
 * `https://www.50pick.tz` → `50pick.tz`. The `www.` is dropped because the apex serves the app
 * directly (measured 2026-09-25: `https://50pick.tz/` answers 200) and four septets is four
 * characters an officer does not get to use. ⚠️ §3b: a `curl` 200 is not proof a BROWSER reaches a
 * page — U8's live drive confirms the opt-out link with a real browser before any message carries it.
 */
export function shortDomain(): string {
  return appUrl().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

/**
 * ⛔ EMPTY SINCE THE OWNER'S RULING OF 2026-10-09 — nothing is appended to a marketing SMS (see this file's header). It
 * stays a function with the arguments it always took, so every caller and every suite that sizes "the message as sent"
 * keeps ONE door; it answers the empty string for every token, language and phrase.
 * (Until that ruling it was `\n[<source phrase> ]50pick 18+ <helpline> Acha: 50pick.tz/s/<token>` — 49 septets, more with
 * a phrase.)
 */
export function marketingFooter(token: string, locale: MarketingLocale = "SW", sourcePhrase = ""): string {
  void token;
  void locale;
  void sourcePhrase;
  return "";
}

/** A token of the opt-out page's length — still handed in by the callers that once printed it. */
export function footerMeasurementToken(): string {
  return "x".repeat(OPTOUT_TOKEN_CHARS);
}

/**
 * ⭐ WHAT AN OFFICER HAS TO WRITE IN — the whole message's cap (160 in the GSM alphabet, 70 in Unicode, times
 * `SMS_MAX_SEGMENTS`), since nothing is appended (the owner's ruling of 2026-10-09). Still computed through the footer,
 * which is empty, so the budget and the composed message can never disagree.
 */
export function operatorBudget(locale: MarketingLocale = "SW", sourcePhrase = "", encoding: SmsEncoding = "GSM7"): number {
  return capUnits(encoding) - unitsIn(marketingFooter(footerMeasurementToken(), locale, sourcePhrase), encoding);
}

export type MarketingCompose = {
  /** The message exactly as sent — the officer's text with `{jina}` filled in, nothing appended (2026-10-09). */
  text: string;
  size: SmsSize;
  budget: number;
  /** Empty means it may be sent. Each entry is one sentence, for a human. */
  problems: string[];
  ok: boolean;
};

/**
 * Compose a marketing message: the officer's text, trimmed, with NOTHING appended (the owner's ruling of 2026-10-09).
 *
 * ⛔ THE SIZE IS TAKEN OF THE COMPOSED TEXT — the text that is sent — so the counter, the test send and the real send
 * can never price one message and send another.
 *
 * ⛔ ONE CALLER IN `src/` (U37a): `lib/marketing/campaign-template.ts`, the renderer the counter, the test send and
 * the real send all go through. A screen or an engine composing here on its own is how the officer is shown one
 * message and a recipient sent another — `test:campaign-compose` §16.1 holds the population.
 */
export function composeMarketing(
  body: string,
  token: string,
  locale: MarketingLocale = "SW",
  sourcePhrase = "",
): MarketingCompose {
  const trimmed = (body ?? "").trim();
  // ⛔ The owner's ruling of 2026-10-09: the text sent IS the officer's text. The footer is empty, so neither the token
  // nor the phrase is printed (a link sent before the ruling keeps working through `/s/<token>`).
  const text = `${trimmed}${marketingFooter(token, locale, sourcePhrase)}`;
  const size = sizeSms(text);
  // ⭐ The budget in the encoding this message will actually go out in — a single ’ makes it UCS-2.
  const budget = operatorBudget(locale, sourcePhrase, size.encoding);
  const problems: string[] = [];

  // The sender is named at the START — the officer's own "50pick", checked, never added.
  if (!trimmed.startsWith(SENDER_IDENTITY)) {
    problems.push(`The message must begin with “${SENDER_IDENTITY}” so the sender is identified.`);
  }
  if (trimmed.length === 0) {
    problems.push("The message is empty.");
  }
  // ⛔ THE ONE CAP (`SMS_MAX_SEGMENTS`), never a second literal here — the two disagreed until 2026-09-26.
  if (size.segments > SMS_MAX_SEGMENTS) {
    problems.push(
      `This is ${size.segments} messages, and the limit is ${SMS_MAX_SEGMENTS} — you have ${budget} characters, ` +
        `and this uses ${unitsIn(trimmed, size.encoding)}.`,
    );
  }
  if (size.encoding === "UCS2" && size.offending.length > 0) {
    problems.push(
      `The character ${size.offending.map((c) => `“${c}”`).join(", ")} is not in the GSM alphabet, ` +
        `which cuts a message from 160 characters to 70. Replacing it is usually enough.`,
    );
  }

  return { text, size, budget, problems, ok: problems.length === 0 };
}
