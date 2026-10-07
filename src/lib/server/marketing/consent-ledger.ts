import { db } from "@/lib/server/store";
import type { MessagingConsentSource, MessagingConsentStatus, MessagingLocale } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { dict } from "@/lib/i18n-dict";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";

/**
 * U6 · THE CONSENT LEDGER'S ONE WRITER.
 *
 * ⭐ WHY A MODULE AND NOT TWO CALL SITES. The wording is the evidence (§5.7), and the only
 * way two sites can be trusted to capture it the same way is for there to be one piece of
 * code that does it. A second implementation is a second answer to "what did this person
 * read", and the two only have to disagree once.
 *
 * ⛔ THE WORDING IS RESOLVED AT THE MOMENT OF THE ACT AND STORED AS TEXT — never a key into
 * today's copy. Storing `push.marketingBody` instead of the sentence would mean the record
 * silently changes every time marketing rewrites the form, which is exactly the record being
 * worthless. That is why this module reads the dictionary and hands the DAL a string.
 *
 * ⛔ ZERO BACKFILL (OD8). Nothing here invents a row for an existing `marketingOptIn = true`.
 * A ledger that fabricates its own evidence is worse than no ledger, because it cannot be
 * told apart from one that does not.
 */

/**
 * The surfaces that can record a marketing consent decision today: ONE — the player's own switch under Profile →
 * Notifications. ⛔ "REGISTRATION" IS GONE (2026-10-07): the sign-up SMS-offers box was REMOVED (the owner's final rule,
 * COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone with a phone — consent is not a condition"), so
 * sign-up records nothing. The rows it wrote from 2026-09-28 keep their `source: "REGISTRATION"`, and their three
 * sentences stay pinned in `consent-wording.ts` — a yes given under them still counts. Never put the site back.
 */
export type MarketingConsentSite = "PROFILE";

/** Named because it is a function parameter — see the note in `store.ts` about `region()`. */
export type AppendMarketingConsentInput = {
  phoneE164: string;
  locale: MessagingLocale;
  status: MessagingConsentStatus;
  source: MessagingConsentSource;
  site: MarketingConsentSite;
  /** What proves the act: the terms version accepted, the surface, the token. */
  evidence: string | null;
  /** The staff user who recorded it. NULL when the data subject acted for themselves. */
  recordedBy: string | null;
};

/**
 * D2 · THE LANGUAGE THE PERSON WAS SHOWN, as a ledger locale. The callers pass the language the form was
 * drawn in (`renderedLocaleOf`, below) or, failing that, the `kp-locale` cookie (`getServerT().locale`,
 * the resolution `/s/[token]/actions.ts` uses) — ⛔ never
 * `User.locale`, which nothing wrote after sign-up, and never a literal "SW": from 2026-09-25 until this
 * fix every REGISTRATION and PROFILE row said SW whatever the page showed. Unknown → SW, the default.
 */
export function messagingLocaleOf(raw: string | null | undefined): MessagingLocale {
  const up = String(raw ?? "").toUpperCase();
  return up === "EN" || up === "ZH" ? up : "SW";
}

/**
 * D2 · THE LANGUAGE THE FORM WAS DRAWN IN, as the form itself posts it back (the profile switch's own
 * `useT().locale`; the sign-up form's hidden `shownLocale` field, which since the sign-up box was removed on
 * 2026-10-07 decides only the new account's `User.locale`). ⭐ It beats the cookie because the cookie
 * can change between drawing and submitting — the language provider rewrites it on mount without
 * redrawing the server's page, and another tab can switch language — so a Swahili tick was stored as the
 * English sentence. ⛔ Exactly "en" | "sw" | "zh", nothing else (not "EN", not " sw"): anything else is
 * null and the caller falls back to the cookie. ⛔ It only SELECTS which of the dictionary's sentences is
 * stored (`marketingConsentWording`) — no text from the client ever reaches the ledger.
 */
export function renderedLocaleOf(posted: unknown): MessagingLocale | null {
  return posted === "en" ? "EN" : posted === "sw" ? "SW" : posted === "zh" ? "ZH" : null;
}

/**
 * The exact sentence the person read, in the language they read it in.
 *
 * ⚠️ Swahili is the DEFAULT (`DEFAULT_LOCALE`), so an unrecognised locale falls to `sw` and
 * never to English — a record that says the player read English copy they were never shown
 * is a false record, not a harmless default.
 * ⭐ OQ11: only the sentences pinned in `consent-wording.ts` count as SMS consent at the gate.
 * ⛔ One site since 2026-10-07 (`MarketingConsentSite`, the type that admits no other): the profile switch's title and
 * body, as the switch shows them. The removed sign-up box's sentence is read from nowhere — its dictionary key is
 * deleted, and only the pinned list still holds its three sentences, as evidence.
 */
export function marketingConsentWording(_site: MarketingConsentSite, locale: MessagingLocale): string {
  const d = locale === "EN" ? dict.en : locale === "ZH" ? dict.zh : dict.sw;
  return `${d.push.marketingTitle} — ${d.push.marketingBody}`;
}

/**
 * Append one row. ⛔ Never updates and never deletes — the DAL exposes no method to do either
 * (`test:dal-parity` §17 asserts the absence in both stores).
 *
 * ⚠️ A FAILURE HERE NEVER THROWS, AND IS NEVER SILENT: it is caught and reported, the way
 * `retention.ts` reports its own lapse failures, and the caller is told `false`. ⛔ WHAT THE CALLER
 * DOES WITH `false` IS ITS OWN RULE — and since Q9 was reversed (2026-10-07) the profile switch's OFF
 * writes THIS row FIRST and changes nothing when it did not land (`recordPlayerMarketingChoice`, the
 * U33r review's MAJOR-3): a switch cleared over a latest GIVEN reads as the two-year LAPSE, which an
 * open licence record reaches, so a "no" with no row behind it would become licence outreach.
 */
export async function appendMarketingConsent(input: AppendMarketingConsentInput): Promise<boolean> {
  const identifier = toMsisdn255(input.phoneE164);
  // ⛔ An unusable key is not a row worth writing: a ledger entry nobody can look up by the
  // number is indistinguishable from no entry at all, and U7's gate reads by this key.
  if (!identifier || identifier.length < 12) {
    console.error("[marketing-consent] refused a ledger row with an unusable identifier");
    return false;
  }
  try {
    await Promise.resolve(
      db.messagingConsent.create({
        // ⛔ The ledger's clock, never `randomUUID()` + `new Date()`: a same-millisecond tie
        // must go to the row written LAST (`ledger-stamp.ts`).
        ...ledgerStamp(),
        channel: "SMS",
        identifier,
        category: "MARKETING",
        status: input.status,
        source: input.source,
        wording: marketingConsentWording(input.site, input.locale),
        locale: input.locale,
        evidence: input.evidence,
        recordedBy: input.recordedBy,
      }),
    );
    return true;
  } catch (err) {
    console.error("[marketing-consent] ledger append failed:", (err as Error)?.message ?? err);
    return false;
  } finally {
    // U24 commit 2 · a book row for this number — a person imported before they signed up, or a player's own
    // number — mirrors the ledger's latest word. ⛔ `mirrorContactCache` never throws, so a recorded consent is
    // never turned into a failure by its cache.
    await mirrorContactCache(identifier);
  }
}
