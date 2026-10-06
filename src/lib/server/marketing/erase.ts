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
 *   1. THE LEDGER'S LAST WORD — a WITHDRAWN row recorded by the officer. Append-only: the erasure is the person's
 *      last word, not an edit of their history.
 *      · ⭐ THE ERASURE MARKER (U16a, 3a(ii)) — on the account's OWN number WHATEVER came before (a consent, a lapse
 *        or nothing at all), unless its latest row is already WITHDRAWN, so a second pass appends nothing. 🔴 Without
 *        it, an account that never consented and had no book row left no trace once its number was tombstoned: the
 *        gate's contact branch (`consent.ts`, 3) read the number as a stranger's, and a licence basis or a typed
 *        test's attestation could reach the person who asked to be forgotten. It is a LEDGER row, never a stop: a
 *        later GIVEN lifts it, so a recycled number's next holder can still say yes (`test:campaign-privacy` P11).
 *        The importer's ERASED collapse reads it too (`import-decide.ts`: no book row, and the ledger's last word
 *        the erasure's), so an old spreadsheet cannot write the person's name back under that number.
 *      · on every OTHER number they are known by (each linked book row's; a player who changed number has the old
 *        one in the book) only when its latest row is GIVEN. Nothing is written for a number with no consent to
 *        withdraw: it may be somebody else's by now, and nothing of this person's stands on it.
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
 *   4. UNLINK every CAMPAIGN RECIPIENT row linked to the account (U16a, `SmsCampaignRecipient`): its `userId` is cleared
 *      by ONE statement and nothing else is written. The number, the status, the stamps and the gate's trail STAY —
 *      the row is the record that we messaged a number (GN 478T reg 51(1)), kept for its own period (DATA-RETENTION);
 *      what erasure removes is which ACCOUNT held that number. ⛔ Nothing is deleted. Found by the LINK alone, never by
 *      the number: a row about the same number that is linked to another account (a previous holder's) is that
 *      account's record and is not touched.
 *      ⛔ A row still waiting in a live campaign is NOT rewritten: it stays PENDING, and the ONE gate refuses the number
 *      when the slice reaches it — step 1's WITHDRAWN row, which the account's own number carries whatever came before
 *      (`test:campaign-privacy` P5 runs it for a consent withdrawn, P11 for an account that never consented).
 *      ⛔ OPT-OUT TOKENS ARE KEPT: a token holds the number and nothing about a person, and it is a link somebody may
 *      still hold in an old SMS — it can only stop or restart marketing for that number (OD43). Since the engine's E1 a
 *      token exists only for a number that was actually messaged or sent a test.
 *      ⭐ `erasure.ts` calls the SAME helper on a RE-RUN (`unlinkCampaignRecipients`): the number is gone by then, but
 *      the account id is not, so a row linked to the account after the first pass — an enqueue that walked the account
 *      before its number was tombstoned — still loses its link when the officer runs the erasure again.
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
 * WHAT IS KEPT: the number, in the ledger rows, in the emptied book row's `msisdn` and in every campaign recipient
 * row. Nothing written here names the account (the evidence is the bare word `erasure`). ⚠️ Not unlinkable in the
 * strong sense: a row's timestamp — an unlinked recipient row's `updatedAt` included — lines up with the erasure's own
 * audit row, which the 7-year chain keeps by statute.
 *
 * ⚠️ Runs only on the FIRST pass of an erasure: a re-run finds the tombstone where the number was and has
 * nothing to key on — except step 4, which keys on the account id and which `erasure.ts` runs again on a re-run
 * through the same helper. Every step is idempotent (`test:erasure` 12.15 runs it twice; `test:campaign-privacy` P7
 * for step 4, P11c for step 1's marker), so a first pass that died part-way is finished by calling it again before the
 * tombstone is written.
 * ⚠️ Accounts erased BEFORE this shipped (U18b, 2026-10-01) are not reached — their number is gone from `User`, so
 * neither their ledger nor an unlinked book row found by that number can be. Owned by U16b. (A book row LINKED to such an
 * account cannot exist: the one link writer, `registration-contact.ts`, shipped after U18b — so an erasure re-run has no
 * linked book row left to empty, and none is reached here.)
 */
export type MarketingErasureCounts = {
  /** WITHDRAWN rows appended to the consent ledger: the account's own number unless it already stood withdrawn (the
   *  erasure marker), and each other number of theirs whose latest row was GIVEN. */
  marketingConsentWithdrawn: number;
  /** Book rows emptied (by link or by number). */
  marketingContactsEmptied: number;
  /** U29b · staged import rows deleted — by every number the person is known by, in every run. */
  marketingStagedRowsDeleted: number;
  /** U16a · campaign recipient rows that lost the account link — kept, with their number, status and trail. */
  campaignRecipientsUnlinked: number;
};

/** The ledger's `wording` for an erasure: what the record SAYS happened. Not a sentence any person was
 *  shown — the source is OPERATOR, and `recordedBy` names the officer. English, like the console. The SAME
 *  words on the erasure marker (an account's own number that never consented): marketing is withdrawn from the
 *  number either way, which is the one fact the gate and the importer read. */
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

/**
 * U16a · step 4, and the ONE caller of `smsCampaignRecipient.unlinkUser` (`test:campaign-privacy` S1 pins it): every
 * campaign recipient row linked to the account loses the link, by ONE statement, and is otherwise kept as it was.
 * Keyed on the account id alone — never on a number — so it reaches the account on a re-run too, after the tombstone
 * (`erasure.ts`), and never touches a row linked to anybody else. Answers how many rows lost the link: 0 on a re-run
 * with nothing new, which is what makes the re-run visible as a no-op. `at` is the pass's one instant, stamped as
 * each row's `updatedAt` by both twins (C25).
 */
export async function unlinkCampaignRecipients(userId: string, at: string = new Date().toISOString()): Promise<number> {
  return Promise.resolve(db.smsCampaignRecipient.unlinkUser(userId, at));
}

export async function eraseMarketingFor(input: {
  userId: string;
  /** The account's number BEFORE the tombstone — `+255…`. */
  phoneE164: string;
  officerId: string | null;
}): Promise<MarketingErasureCounts> {
  const counts: MarketingErasureCounts = {
    marketingConsentWithdrawn: 0, marketingContactsEmptied: 0, marketingStagedRowsDeleted: 0, campaignRecipientsUnlinked: 0,
  };
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
    if (identifier === accountNumber) {
      // ⭐ THE ERASURE MARKER (U16a, 3a(ii)) — the account's OWN number is marked whatever came before, a consent or
      // nothing at all, so its tombstoned number never reads as a stranger's at the gate. Only a number that already
      // stands withdrawn is skipped, which is what makes a second pass append nothing.
      if (latest?.status === "WITHDRAWN") continue;
    } else {
      // Every other number of theirs keeps U18b's rule: only a consent is withdrawn — the number may be somebody
      // else's by now, and nothing of this person's stands on it.
      if (latest?.status !== "GIVEN") continue;
    }
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

  // ── 4 · THE CAMPAIGN RECORDS (U16a) — the account link goes, the record that we messaged the number stays ─────────
  // ⛔ By the LINK, never by a number (see the header): a row about one of these numbers that is linked to somebody else
  // is theirs. A pending row of a live campaign is left PENDING — the gate refuses the number at send.
  counts.campaignRecipientsUnlinked = await unlinkCampaignRecipients(input.userId, at);
  return counts;
}
