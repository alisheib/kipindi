import { randomUUID } from "crypto";
import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMarketingContact } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";

/**
 * U18b · ERASURE REACHES MARKETING — the number is stopped, the consent withdrawn, the book emptied.
 *
 * 🔴 WHY THIS EXISTS (§9 U16, found at S6). Erasure tombstones `User.phoneE164` to `erased:<id>` and,
 * before this, touched no marketing store. On Postgres the gate then finds NO player for the number,
 * falls to the LEDGER branch, and an erased player whose last ledger row was a registration or profile
 * GIVEN read as consenting — saved today only because a contact-only number is `age_unknown` until U33.
 * And the contact book (U18) is the first store holding people with no account at all: a book row for
 * an erased player, left with its name and its link, is the D16 defect itself.
 *
 * ⭐ WHAT IT DOES, for EVERY number the person is known by (the account's, and each linked book row's —
 * a player who changed number has the old one in the book), in the order the gate reads (suppression
 * first, always — `mayReceiveMarketingSms`):
 *   1. SUPPRESS the number — reason OPERATOR, recorded by the officer who fulfilled the request. A
 *      person's old SMS link lifts only a WITHDRAWN stop (`lift`'s reason filter, §17.liftreason), so it
 *      can never re-open an erasure; an OPERATOR stop also takes over an active WITHDRAWN one.
 *   2. Append a WITHDRAWN row to the consent LEDGER, unless its latest row already says so — the ledger
 *      is append-only, so the erasure is recorded as the person's last word, not by editing history.
 *   3. EMPTY every book row for the person — found by the account LINK and by the NUMBER, because a
 *      contact imported before they signed up carries no link: the link broken, name, e-mail, notes,
 *      tags and source reference cleared, `rawInput` reduced to the key, the consent cache WITHDRAWN.
 *      ⭐ The row is KEPT, emptied, and that is deliberate: it is what makes a later import of the same
 *      number "already in the book, suppressed — keep" (U31) instead of a fresh row that re-collects the
 *      erased person's name from somebody's spreadsheet.
 *
 * ⛔ WHAT IT KEEPS, AND WHY: the NUMBER, in three places — `Suppression.identifier`, the ledger rows and
 * `MarketingContact.msisdn`. A stop list that forgot the number could not stop it; this is the minimum
 * needed to honour the objection (ETA s.32, EPOCA reg 7(4)), and `test:erasure` §8 allowlists exactly
 * these three with that reason. ⛔ Nothing here writes the account id beside the number — the evidence
 * is the bare word `erasure` — so the kept number cannot be joined back to the erased account.
 *
 * ⚠️ Runs only on the FIRST pass of an erasure: a re-run finds the tombstone where the number was and has
 * nothing to key on. Every step is idempotent anyway, so a pass that died part-way is finished by the next.
 * ⚠️ Accounts erased BEFORE this shipped are not reached — their number is gone from `User`. Owned by U16.
 */
export type MarketingErasureCounts = {
  /** Numbers this erasure put an officer's stop on (0 for a number where a non-WITHDRAWN stop already stood). */
  marketingSuppressed: number;
  /** WITHDRAWN rows appended to the consent ledger (none for a number whose latest row already was). */
  marketingConsentWithdrawn: number;
  /** Book rows emptied (by link or by number). */
  marketingContactsEmptied: number;
};

/** The ledger's `wording` for an erasure: what the record SAYS happened. Not a sentence any person was
 *  shown — the source is OPERATOR, and `recordedBy` names the officer. English, like the console. */
export const ERASURE_LEDGER_WORDING = "Erasure request fulfilled — marketing consent withdrawn and the number suppressed.";

/** The evidence on both rows. ⛔ Never the account id or the request id — either would let the kept
 *  number be joined back to the person who asked to be erased. */
export const ERASURE_EVIDENCE = "erasure";

/** A book row already emptied by an erasure. Re-running must not count it twice or touch it again. */
function isEmptied(c: StoredMarketingContact): boolean {
  return c.userId === null && c.displayName === null && c.email === null && c.notes === null
    && c.tags.length === 0 && c.sourceRef === null && c.rawInput === c.msisdn
    && c.consentState === "WITHDRAWN" && c.suppressedAt !== null;
}

export async function eraseMarketingFor(input: {
  userId: string;
  /** The account's number BEFORE the tombstone — `+255…`. */
  phoneE164: string;
  officerId: string | null;
}): Promise<MarketingErasureCounts> {
  const counts: MarketingErasureCounts = { marketingSuppressed: 0, marketingConsentWithdrawn: 0, marketingContactsEmptied: 0 };
  const at = new Date().toISOString();
  const raw = toMsisdn255(input.phoneE164);
  const accountNumber = raw && raw.length >= 12 ? raw : null;

  // ── THE BOOK ROWS — by the link AND by the number ─────────────────────────────────────
  // A contact imported before the person signed up carries no link; a contact linked to the account may
  // carry an OLD number the player has since changed. Both are this person's, and both are reached.
  const rows = new Map<string, StoredMarketingContact>();
  for (const c of await Promise.resolve(db.marketingContact.listByUserId(input.userId))) rows.set(c.id, c);
  if (accountNumber) {
    const byNumber = await Promise.resolve(db.marketingContact.findByMsisdn(accountNumber));
    if (byNumber) rows.set(byNumber.id, byNumber);
  }
  // Every number this person is known by: the account's, and each linked row's own.
  const numbers = new Set<string>();
  if (accountNumber) numbers.add(accountNumber);
  for (const c of rows.values()) numbers.add(c.msisdn);

  for (const identifier of numbers) {
    const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };

    // ── 1 · THE STOP ────────────────────────────────────────────────────────────────────
    const before = await Promise.resolve(db.suppression.find(key));
    if (!before || before.reason === "WITHDRAWN") {
      await Promise.resolve(db.suppression.create({
        id: randomUUID(),
        channel: "SMS",
        identifier,
        category: "MARKETING",
        reason: "OPERATOR",
        evidence: ERASURE_EVIDENCE,
        recordedBy: input.officerId,
        createdAt: at,
        liftedAt: null,
        liftedReason: null,
      }));
      counts.marketingSuppressed++;
    }

    // ── 2 · THE LEDGER'S LAST WORD ──────────────────────────────────────────────────────
    const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
    if (latest?.status !== "WITHDRAWN") {
      await Promise.resolve(db.messagingConsent.create({
        // ⛔ The ledger's clock (`ledger-stamp.ts`), never `randomUUID()` + `new Date()`.
        ...ledgerStamp(),
        channel: "SMS",
        identifier,
        category: "MARKETING",
        status: "WITHDRAWN",
        source: "OPERATOR",
        wording: ERASURE_LEDGER_WORDING,
        locale: "EN",
        evidence: ERASURE_EVIDENCE,
        recordedBy: input.officerId,
      }));
      counts.marketingConsentWithdrawn++;
    }
  }

  // ── 3 · EMPTY THE ROWS ────────────────────────────────────────────────────────────────
  for (const c of rows.values()) {
    if (isEmptied(c)) continue;
    await Promise.resolve(db.marketingContact.update(c.id, {
      userId: null,
      displayName: null,
      email: null,
      notes: null,
      tags: [],
      sourceRef: null,
      rawInput: c.msisdn,
      consentState: "WITHDRAWN",
      // ⭐ Truthful: step 1 has just put an active stop on this row's own number.
      suppressedAt: c.suppressedAt ?? at,
      updatedBy: input.officerId,
    }, at));
    counts.marketingContactsEmptied++;
  }
  return counts;
}
