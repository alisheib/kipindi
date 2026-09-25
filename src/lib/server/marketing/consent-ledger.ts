import { randomUUID } from "crypto";
import { db } from "@/lib/server/store";
import type { MessagingConsentSource, MessagingConsentStatus, MessagingLocale } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { dict } from "@/lib/i18n-dict";

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

/** The surfaces that can record a marketing consent decision today. */
export type MarketingConsentSite = "REGISTRATION" | "PROFILE";

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
 * The exact sentence the person read, in the language they read it in.
 *
 * ⚠️ Swahili is the DEFAULT (`DEFAULT_LOCALE`), so an unrecognised locale falls to `sw` and
 * never to English — a record that says the player read English copy they were never shown
 * is a false record, not a harmless default.
 */
export function marketingConsentWording(site: MarketingConsentSite, locale: MessagingLocale): string {
  const d = locale === "EN" ? dict.en : locale === "ZH" ? dict.zh : dict.sw;
  return site === "REGISTRATION"
    ? d.auth.optionalUpdates
    : `${d.push.marketingTitle} — ${d.push.marketingBody}`;
}

/**
 * Append one row. ⛔ Never updates and never deletes — the DAL exposes no method to do either
 * (`test:dal-parity` §17 asserts the absence in both stores).
 *
 * ⚠️ A FAILURE HERE MUST NOT FAIL THE PLAYER'S ACTION, AND MUST NOT BE SILENT. Refusing a
 * player's own withdrawal because a ledger insert failed would leave them marketable against
 * their stated wish; swallowing it quietly would leave a consent change with no record. So it
 * is caught and reported, the way `retention.ts` reports its own lapse failures.
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
        id: randomUUID(),
        channel: "SMS",
        identifier,
        category: "MARKETING",
        status: input.status,
        source: input.source,
        wording: marketingConsentWording(input.site, input.locale),
        locale: input.locale,
        evidence: input.evidence,
        recordedBy: input.recordedBy,
        createdAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch (err) {
    console.error("[marketing-consent] ledger append failed:", (err as Error)?.message ?? err);
    return false;
  }
}
