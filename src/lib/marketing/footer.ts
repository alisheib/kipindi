/**
 * ⭐ THE STATUTORY ENVELOPE — what every marketing SMS must carry, appended by the engine and
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

/** OURS — the number `support-config.ts` publishes, in dial form (OQ4, answered 2026-09-26). */
export const STATUTORY_SMS_HELPLINE = HELPLINE_TEL();

/** ETA s.32(1)(b): the sender must be identified, and at the START of the message. */
export const SENDER_IDENTITY = "50pick";

export type MarketingLocale = "SW" | "EN";

/** ⛔ Swahili is the DEFAULT player language (§5.13), so it is first here and everywhere. */
const STOP_WORD: Record<MarketingLocale, string> = { SW: "Acha", EN: "Stop" };

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
 * The footer, exactly as it will be sent. ⛔ The leading newline is part of it and part of its cost.
 *
 * `\n50pick 18+ 0800110011 Acha: 50pick.tz/s/<token>`
 */
export function marketingFooter(token: string, locale: MarketingLocale = "SW"): string {
  return `\n${SENDER_IDENTITY} 18+ ${STATUTORY_SMS_HELPLINE} ${STOP_WORD[locale]}: ${shortDomain()}${OPTOUT_PATH}${token}`;
}

/** A token of the right shape, for measuring the footer without minting a real one. */
export function footerMeasurementToken(): string {
  return "x".repeat(OPTOUT_TOKEN_CHARS);
}

/**
 * ⭐ WHAT AN OFFICER ACTUALLY HAS TO WRITE IN — computed, never typed.
 *
 * The single-segment limit minus the footer. With today's domain that is 160 − 49 = **111**, and the
 * composer prints THAT number rather than 160.
 *
 * ⚠️ `sourcePhrase` is OQ3's shadow. If the lawyer's answer to "how must ETA s.31(c)'s source of the
 * personal information be given inside a 160-character SMS" is "in the body", that phrase comes out
 * of the same 160 and the budget drops accordingly. Passing it here prices that answer instead of
 * arguing about it. It is counted with the one space `composeMarketing` puts before it (U37a: the
 * phrase sits between the body and the footer — see there).
 *
 * 🔴 ENCODING-AWARE SINCE 2026-09-26. It always subtracted from the GSM-7 limit, so a UCS-2 message was
 * told "you have 111 characters" when 70 − 49 = 21 fit. `encoding` is the MESSAGE's, and the footer is
 * sized in it (`unitsIn`). The cap is `SMS_MAX_SEGMENTS` — the one the composer refuses at.
 */
export function operatorBudget(locale: MarketingLocale = "SW", sourcePhrase = "", encoding: SmsEncoding = "GSM7"): number {
  const footer = marketingFooter(footerMeasurementToken(), locale);
  // ⛔ Trimmed BEFORE the emptiness test: a phrase of spaces is no phrase, and `composeMarketing` prints none.
  const phrase = (sourcePhrase ?? "").trim();
  const source = phrase ? `${phrase} ` : "";
  const overhead = unitsIn(footer, encoding) + unitsIn(source, encoding);
  return capUnits(encoding) - overhead;
}

export type MarketingCompose = {
  /** Body + footer — what is actually sent, and what is sized. */
  text: string;
  size: SmsSize;
  budget: number;
  /** Empty means it may be sent. Each entry is one sentence, for a human. */
  problems: string[];
  ok: boolean;
};

/**
 * Compose a marketing message. ⛔ THE FOOTER IS NOT OPTIONAL AND NOT A PARAMETER — there is no call
 * shape that produces a marketing body without it, which is the only way "un-removable" is true of
 * software rather than of a policy document.
 *
 * ⛔ AND THE SIZE IS TAKEN OF THE COMPOSED TEXT. Sizing the body and appending the footer afterwards
 * is the defect this whole unit exists to prevent; `test:campaign-compose` plants exactly that.
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
  // 🔴 THE SOURCE PHRASE WENT IN FRONT OF THE BODY UNTIL U37a (2026-10-01): `${source}${trimmed}`. The identity
  // check then read the PHRASE, so any phrase that did not itself begin with "50pick" (§10's realistic fixture is
  // one) refused every message carrying it; and the over-cap sentence counted the phrase as the officer's text
  // while quoting a budget that had already taken it out. Nothing passed a phrase yet, so nothing shipped wrong.
  // ⭐ OQ3's built safe default says the FOOTER carries the phrase, so it sits between the body and the footer,
  // one space before it — the units `operatorBudget` prices — and the officer's own "50pick" stays first.
  const phrase = (sourcePhrase ?? "").trim();
  const text = `${trimmed}${phrase ? ` ${phrase}` : ""}${marketingFooter(token, locale)}`;
  const size = sizeSms(text);
  // ⭐ The budget in the encoding this message will actually go out in — a single ’ makes it UCS-2.
  const budget = operatorBudget(locale, phrase, size.encoding);
  const problems: string[] = [];

  // ETA s.32(1)(b) — identity at the START, not somewhere in the middle.
  if (!trimmed.startsWith(SENDER_IDENTITY)) {
    problems.push(`The message must begin with “${SENDER_IDENTITY}” so the sender is identified, as the law requires.`);
  }
  if (trimmed.length === 0) {
    problems.push("The message is empty.");
  }
  if (token.length !== OPTOUT_TOKEN_CHARS) {
    problems.push(`The opt-out link is missing or the wrong length, so this message would give no way to stop.`);
  }
  // ⛔ THE ONE CAP (`SMS_MAX_SEGMENTS`), never a second literal here — the two disagreed until 2026-09-26.
  if (size.segments > SMS_MAX_SEGMENTS) {
    problems.push(
      `This is ${size.segments} messages, and the limit is ${SMS_MAX_SEGMENTS} — you have ${budget} characters before the required footer, ` +
        // ⛔ The OFFICER's text against the OFFICER's room: the phrase is already inside `budget`.
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
