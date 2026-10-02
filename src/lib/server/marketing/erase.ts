import { db } from "@/lib/server/store";
import type { MessagingKey, StoredMarketingContact } from "@/lib/server/store";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";

/**
 * U18b · ERASURE REACHES MARKETING — the consent withdrawn, the book emptied.
 *
 * 🔴 WHY THIS EXISTS (§9 U16, found at S6). Erasure tombstones `User.phoneE164` to `erased:<id>` and,
 * before this, touched no marketing store. On Postgres the gate then finds NO player for the number,
 * falls to the LEDGER branch, and an erased player whose last ledger row was a registration or profile
 * GIVEN read as consenting — saved today only because a contact-only number is `age_unknown` until U33.
 * And the contact book (U18) is the first store holding people with no account at all: a book row for
 * an erased player, left with its name and its link, is the D16 defect itself.
 *
 * ⭐ WHAT IT DOES:
 *   1. THE LEDGER'S LAST WORD — for every number the person is known by (the account's, and each linked
 *      book row's; a player who changed number has the old one in the book) whose latest row is GIVEN,
 *      a WITHDRAWN row recorded by the officer. Append-only: the erasure is the person's last word, not
 *      an edit of their history. Nothing is written for a number with no consent to withdraw.
 *   2. EMPTY every book row for the person — found by the account LINK and by the account NUMBER (a
 *      contact imported before they signed up carries no link): link, name, e-mail, notes, tags and import
 *      reference cleared, `rawInput` reduced to the key, the cache (consent AND stop) mirrored from the truth,
 *      and `sourceRef` set to `erasure` — the mark the importer (U31) collapses to KEEP on.
 *      ⚖️ WHEN IN DOUBT, ERASE: an unlinked row found by the number is emptied whatever its age, though it
 *      may be a previous holder's — emptying another person's row harms nobody, leaving the erased person's
 *      name would breach the request. The export takes the opposite side of the same doubt
 *      (`dsar.ts`: when in doubt, do not disclose).
 *   2b. DELETE every STAGED import row (U29b, `ContactImportRow`) holding any number the person is known by — in every
 *      officer's run, a number another live account now holds included: a staged row is a transient copy of somebody's
 *      file, never evidence, and ⚖️ when in doubt, erase. A row whose number never parsed carries no key and cannot be
 *      found by number; it leaves with its run (the 14-day idle sweep, or retention 90 days after the run finishes).
 *
 * ⛔ NO STOP-LIST ROW, ON PURPOSE (the S10 review). An OPERATOR suppression can be lifted by nobody —
 * `lift` refuses every reason but WITHDRAWN — and a Tanzanian number outlives its holder: the operator
 * recycles it. The next owner, or the same person coming back, would tick "yes" and be refused for ever
 * while their profile switch read ON. The ledger's WITHDRAWN refuses the erased person exactly as well
 * (the gate's ledger branch reads it) and gives way to a NEW consent, which is the right answer for a
 * new person. ⛔ So erasure also never touches an existing suppression: a stop that stood still stands.
 *
 * ⛔ ANOTHER PERSON'S NUMBER IS NOT WITHDRAWN. A linked row's number that a DIFFERENT live account now
 * holds is that account's to consent with; erasure empties the erased person's row about it and leaves
 * the number's ledger alone. A row found by number that is linked to a different account is not this
 * person's and is not touched.
 *
 * WHAT IS KEPT: the number, in the ledger rows and in the emptied book row's `msisdn`. Nothing written
 * here names the account (the evidence is the bare word `erasure`). ⚠️ Not unlinkable in the strong sense:
 * a row's timestamp lines up with the erasure's own audit row, which the 7-year chain keeps by statute.
 *
 * ⚠️ Runs only on the FIRST pass of an erasure: a re-run finds the tombstone where the number was and has
 * nothing to key on. Every step is idempotent (`test:erasure` 12.15 runs it twice), so a first pass that
 * died part-way is finished by calling it again before the tombstone is written.
 * ⚠️ Accounts erased BEFORE this shipped are not reached — their number is gone from `User`. Owned by U16.
 */
export type MarketingErasureCounts = {
  /** WITHDRAWN rows appended to the consent ledger (one per number whose latest row was GIVEN). */
  marketingConsentWithdrawn: number;
  /** Book rows emptied (by link or by number). */
  marketingContactsEmptied: number;
  /** U29b · staged import rows deleted — by every number the person is known by, in every run. */
  marketingStagedRowsDeleted: number;
};

/** The ledger's `wording` for an erasure: what the record SAYS happened. Not a sentence any person was
 *  shown — the source is OPERATOR, and `recordedBy` names the officer. English, like the console. */
export const ERASURE_LEDGER_WORDING = "Erasure request fulfilled — marketing consent withdrawn.";

/** The evidence on the ledger row, and the `sourceRef` an emptied book row carries. ⭐ Declared in the pure
 *  `@/lib/marketing/erasure-mark` (U31-A) so the importer's browser-side `decide()` reads the same binding;
 *  re-exported here so every existing importer of this module is unchanged. */
export { ERASURE_EVIDENCE };

/** The bare `255…` key of an account's number, keyed EXACTLY as the ledger writers key it
 *  (`toMsisdn255`, `consent-ledger.ts`) — so a number on a prefix the send table refuses (064) still finds
 *  its own rows — and null for a tombstone (`erased:usr_712345678bcd` keeps hex digits that a normaliser
 *  turns into a stranger's number) or anything that is not 255 + a mobile 6/7 + eight digits. */
export function marketingKeyOf(phone: string | null | undefined): string | null {
  if (!phone || phone.startsWith("erased:")) return null;
  const key = toMsisdn255(phone);
  return /^255[67][0-9]{8}$/.test(key) ? key : null;
}

const keyFor = (identifier: string): MessagingKey => ({ channel: "SMS", identifier, category: "MARKETING" });

export async function eraseMarketingFor(input: {
  userId: string;
  /** The account's number BEFORE the tombstone — `+255…`. */
  phoneE164: string;
  officerId: string | null;
}): Promise<MarketingErasureCounts> {
  const counts: MarketingErasureCounts = { marketingConsentWithdrawn: 0, marketingContactsEmptied: 0, marketingStagedRowsDeleted: 0 };
  const at = new Date().toISOString();
  const accountNumber = marketingKeyOf(input.phoneE164);

  // ── THE BOOK ROWS — by the link, and by the account number when the row is nobody else's ────────
  const rows = new Map<string, StoredMarketingContact>();
  for (const c of await Promise.resolve(db.marketingContact.listByUserId(input.userId))) rows.set(c.id, c);
  if (accountNumber) {
    const byNumber = await Promise.resolve(db.marketingContact.findByMsisdn(accountNumber));
    if (byNumber && (byNumber.userId === null || byNumber.userId === input.userId)) rows.set(byNumber.id, byNumber);
  }

  // ── 1 · THE LEDGER'S LAST WORD, for every number the person is known by ─────────────────────
  const numbers = new Set<string>();
  if (accountNumber) numbers.add(accountNumber);
  for (const c of rows.values()) numbers.add(c.msisdn);
  for (const identifier of numbers) {
    if (identifier !== accountNumber) {
      // ⛔ A number another live account holds now is that account's consent, not this person's.
      const holder = await Promise.resolve(db.user.findByPhone(`+${identifier}`));
      if (holder && holder.id !== input.userId) continue;
    }
    const latest = await Promise.resolve(db.messagingConsent.latestFor(keyFor(identifier)));
    if (latest?.status !== "GIVEN") continue;
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

  // ── 2 · EMPTY THE ROWS ────────────────────────────────────────────────────────────────
  for (const c of rows.values()) {
    const emptied = c.userId === null && c.displayName === null && c.email === null && c.notes === null
      && c.tags.length === 0 && c.sourceRef === ERASURE_EVIDENCE && c.importId === null && c.rawInput === c.msisdn;
    if (emptied) continue;
    await Promise.resolve(db.marketingContact.update(c.id, {
      userId: null,
      displayName: null,
      email: null,
      notes: null,
      tags: [],
      sourceRef: ERASURE_EVIDENCE,
      importId: null,
      rawInput: c.msisdn,
      updatedBy: input.officerId,
    }, at));
    counts.marketingContactsEmptied++;
  }

  // ── 2b · THE STAGED COPIES (U29b) — every staged import row holding a number the person is known by ──────────────
  // ⚖️ WHEN IN DOUBT, ERASE: unlike the ledger above, a number another live account holds now is NOT skipped — a staged row
  // is a transient copy of somebody's file, never evidence, and deleting a stranger's copy of it harms nobody.
  for (const identifier of numbers) {
    counts.marketingStagedRowsDeleted += await Promise.resolve(db.contactImportRow.deleteByMsisdn(identifier));
  }

  // ── 3 · THE BOOK'S CACHE, from the truth step 1 just wrote (U24 commit 2) ──────────────────
  // ⭐ The consent AND the stop, through the ONE mirror — never a value of erasure's own. Every number step 1
  // may have written for is mirrored, so a row about the account's number that is linked to somebody else (a
  // previous holder's) stops reading a consent the number no longer has.
  for (const identifier of numbers) await mirrorContactCache(identifier, at);
  return counts;
}
