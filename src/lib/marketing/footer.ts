/**
 * ⭐ THE STATUTORY ENVELOPE — what every marketing SMS must carry, appended by the engine and
 * impossible for an officer to remove.
 *
 * 🔴 D5: NO SMS THIS PLATFORM SENDS CARRIES A SENDER IDENTITY OR A RESPONSIBLE-GAMING FOOTER, and
 * both are required. ETA Cap 442 s.32(1)(b)–(c) requires the sender to be identified and an opt-out
 * to be given IN EVERY MESSAGE; s.32(2)(d) and GBT Code cl. 3.7.1–3.7.2 require the condensed
 * responsible-gaming message and the Board's helpline. A campaign body typed by an officer cannot be
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
 * ── 🔴 THE HELPLINE HERE IS NOT THE ONE `support-config.ts` PUBLISHES ────────
 * `support-config.ts` pins `0800 11 0011`. The Gaming Board's own Advertising Code names
 * `0800110051`, three times. That contradiction is OQ4, and it is ALI'S to answer — not a thing to
 * resolve by quietly making the two agree. ⛔ DO NOT "FIX" THIS FILE BY POINTING IT AT
 * `support-config.ts`: the safe default recorded in §4a is that the marketing footer carries the
 * REGULATOR'S number, because a statutory footer citing a helpline the regulator does not recognise
 * is the failure that matters, and no published page is changed silently. When OQ4 is answered, one
 * constant moves. `test:campaign-compose` §12 asserts the two are deliberately different and names
 * this note, so an "obvious cleanup" fails instead of shipping.
 *
 * Guard: `npm run test:campaign-compose`.
 */
import { appUrl } from "@/lib/app-url";
import { sizeSms, SMS_LIMITS, type SmsSize } from "@/lib/sms-compose";

/** The opt-out path's token length. ⛔ The route itself is plan U8; this is the length it must mint. */
export const OPTOUT_TOKEN_CHARS = 8;

/** The opt-out path. `50pick.tz/s/<token>` — short because every character is a septet. */
export const OPTOUT_PATH = "/s/";

/**
 * 🔴 THE BOARD'S NUMBER, NOT OURS — see the header. OQ4 is open; this is the safe default that
 * ships meanwhile, and it deliberately differs from `support-config.ts`.
 */
export const STATUTORY_SMS_HELPLINE = "0800110051";

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
 * `\n50pick 18+ 0800110051 Acha: 50pick.tz/s/<token>`
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
 * arguing about it.
 */
export function operatorBudget(locale: MarketingLocale = "SW", sourcePhrase = ""): number {
  const footer = marketingFooter(footerMeasurementToken(), locale);
  const overhead = sizeSms(footer).units + (sourcePhrase ? sizeSms(sourcePhrase).units : 0);
  return SMS_LIMITS.GSM7.single - overhead;
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
 */
export function composeMarketing(
  body: string,
  token: string,
  locale: MarketingLocale = "SW",
  sourcePhrase = "",
): MarketingCompose {
  const trimmed = (body ?? "").trim();
  const source = sourcePhrase ? `${sourcePhrase.trim()} ` : "";
  const text = `${source}${trimmed}${marketingFooter(token, locale)}`;
  const size = sizeSms(text);
  const budget = operatorBudget(locale, sourcePhrase);
  const problems: string[] = [];

  // ETA s.32(1)(b) — identity at the START, not somewhere in the middle.
  if (!`${source}${trimmed}`.startsWith(SENDER_IDENTITY)) {
    problems.push(`The message must begin with “${SENDER_IDENTITY}” so the sender is identified, as the law requires.`);
  }
  if (trimmed.length === 0) {
    problems.push("The message is empty.");
  }
  if (token.length !== OPTOUT_TOKEN_CHARS) {
    problems.push(`The opt-out link is missing or the wrong length, so this message would give no way to stop.`);
  }
  if (size.segments > 1) {
    problems.push(
      `This is ${size.segments} messages, not one — you have ${budget} characters before the required footer, ` +
        `and this uses ${sizeSms(`${source}${trimmed}`).units}.`,
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
