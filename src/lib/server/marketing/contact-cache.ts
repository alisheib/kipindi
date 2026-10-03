import { db } from "@/lib/server/store";
import type { ContactConsentState, MessagingKey } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";

/**
 * U24 commit 2 · THE BOOK'S CACHE, KEPT TRUE BY THE WRITERS.
 *
 * `MarketingContact.consentState` and `suppressedAt` are a CACHE — of the consent ledger's latest word and of the
 * active stop — that the list, its KPI band and every audience predicate read. `audience.ts` only READS them.
 * 🔴 Before this, no writer of the ledger or the stop list touched the book: after a /s/ stop the row still read
 * GIVEN and unsuppressed, so the consent and suppressed filters and the KPI tiles counted a copy nobody updated.
 * ⭐ So EVERY writer of either store calls this after its writes — the opt-out page, the ledger's one append
 * (registration and the profile switch), the profile lift, erasure and the dev seed — and this recomputes both
 * columns from the truth. `test:contacts-audience` §6 holds the population: a src file that writes the ledger or
 * the stop list and does not call this fails the gate.
 *
 * ⭐ IDEMPOTENT, SO IT REPAIRS. It writes only on a difference, so a second call is a read, and a writer whose
 * earlier attempt died between its writes and this call is put right by the next writer or the person's retry.
 * ⚠️ Two writers racing on one number can each read the truth before the other's write lands; the last mirror
 * wins and the next write repairs it. Acceptable for a cache, and only for a cache: the send gate never reads it
 * (`mayReceiveMarketingSms` asks the stop list and the ledger themselves).
 *
 * ⛔ IT NEVER THROWS. A failure is reported and answered `failed` — never allowed to fail the person's own act:
 * a stop must not answer "try again" because a book row could not be refreshed, when the stop itself landed.
 */
export type ContactCacheOutcome = "none" | "unchanged" | "updated" | "failed";

/**
 * ⛔ OD56 (2026-10-02) · THE ROW'S OWN `updatedAt` IS WRITTEN BACK — a cache refresh is not an edit. `updatedAt` is the
 * edit dialog's compare-and-set token and it reaches the browser: if a refresh moved it, a masked officer could read it,
 * suppress (or withdraw) ONE row, and read it again — it would move only when the row had no stop (or no withdrawal)
 * before, the very signal OD54 and A1.1 hide. The edit patch carries no cache field, so an officer's save after a
 * refresh overwrites nothing. `_at` stays in the signature for the callers that pass their instant; it is not stamped.
 */
export async function mirrorContactCache(identifier: string, _at: string = new Date().toISOString()): Promise<ContactCacheOutcome> {
  try {
    // ⛔ The bare `255…` key, normalised HERE (the two-format trap, D6): a caller handing `User.phoneE164`
    // (`+255…`) would otherwise find no row and answer `none` for every player.
    const row = await Promise.resolve(db.marketingContact.findByMsisdn(toMsisdn255(identifier)));
    if (!row) return "none";
    const key: MessagingKey = { channel: "SMS", identifier: row.msisdn, category: "MARKETING" };
    const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
    const stop = await Promise.resolve(db.suppression.find(key));
    const consentState: ContactConsentState = latest ? latest.status : "UNKNOWN";
    // ⭐ The stop's OWN time — "when did they say no" — never the time of this refresh.
    const suppressedAt = stop ? stop.createdAt : null;
    if (row.consentState === consentState && row.suppressedAt === suppressedAt) return "unchanged";
    await Promise.resolve(db.marketingContact.update(row.id, { consentState, suppressedAt }, row.updatedAt));
    return "updated";
  } catch (err) {
    // ⛔ THE ERROR'S NAME AND CODE, NEVER ITS MESSAGE (2026-10-03): a database error's message can print the row it
    // refused, the number in it — and every sign-up now passes through here (`registration-contact.ts`, the same shape).
    let kind = "unreadable error";
    try {
      const e = (err ?? {}) as { name?: unknown; code?: unknown };
      kind = [e.name, e.code].filter((x): x is string => typeof x === "string").join(" ") || kind;
    } catch { /* an error that cannot be read is still reported, as unreadable */ }
    console.error(`[contact-cache] mirror failed (${kind})`);
    return "failed";
  }
}
