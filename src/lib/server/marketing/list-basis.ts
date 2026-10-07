/**
 * U33b-L · RECORDING A LICENCE BASIS ON A CONTACT LIST — the only writer of `ContactListBasis`, and therefore the only
 * thing in the platform that can make a contact reachable without their consent (spec
 * `docs/marketing-specs/U33a-U37c-OD58.md` §6 U33b-L · §7.8 · §8 · §9; OD57 · OD58).
 *
 * ⭐ WHAT IT IS. U33a-L built the table and U33a-G taught the gate to read it; until this file there was no way to put a
 * row in it, so `LICENCE_LIST` was a branch nothing could reach. A recording says: an officer, on this date, under the
 * Gaming Board licence, with the 18+ confirmation ticked and a note saying where the numbers came from, declares that
 * this list may be messaged. That is the most consequential button in the contact book, which is why every one of its
 * refusals is named and every act is audited under COMPLIANCE.
 *
 * ⛔ A RECORDING COVERS THE MEMBERS PRESENT WHEN IT WAS MADE, AND NOBODY ADDED AFTER. That rule lives in the DAL
 * (`coveredCount`, `standingFor`) and is not restated here — a second copy of "who is covered" is how the card and the
 * gate come to disagree about who may be messaged. This file records; the DAL decides who the record reaches.
 *
 * ⛔ IT NEVER TOUCHES CONSENT. No `messagingConsent` row, no `marketingOptIn`, no `suppression.lift`, no
 * `mirrorContactCache` — the spec forbids each by name, and the reason is one sentence: a licence basis is NOT a
 * consent, and a file that could write one would eventually be asked to. The gate keeps them apart (CONSENT is asked
 * first and wins wherever it exists); this writer must keep them apart too.
 *
 * ⛔ AND IT REFUSES WHILE THE WORDINGS ARE UNSAVED. The row stores the words AS THEY WERE when the basis was recorded
 * (`wording`, `adultWording`, and both versions): seven-year evidence of what the officer actually attested to. A
 * default nobody approved is not evidence — `currentWording` answers null until an admin saves the card, and this
 * refuses rather than recording today's suggestion as though it had been approved.
 *
 * ⛔ 3b · AND THE 18+ WORDS STORED ARE THE WORDS THE OFFICER READ. The row stores the `adult.list` sentence saved AT THE
 * SAVE, and the owner may reword it while a Lists card is open — so a tick given under the old words would be recorded
 * beside new ones the officer never saw. The card therefore posts the VERSION its tick was given for
 * (`attestedVersionOf` re-types the field), and a version that is not the saved one — older, newer, absent or malformed —
 * is refused `attestation_stale`: nothing is written, no audit row is made, and the officer is asked to reload and read
 * the sentence again — in words true both when it was reworded after the page loaded and when the page predates this
 * rule. The same rule the typed test applies to `adult.test` (campaign-compose §18.32).
 *
 * Guard: `npm run test:contacts-lists`.
 */
import { randomInt } from "node:crypto";
import { db } from "@/lib/server/store";
import type { ListBasisCoverage } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { currentWording } from "@/lib/server/marketing/wordings";
import {
  CONSENT_BASIS_REFUSAL_SENTENCE, PROOF_NOTE_MAX, PROOF_NOTE_MIN, normalizeProofNote, proofNoteChars,
} from "@/lib/marketing/consent-basis";
// ⛔ THE ONE phone-run rule the contact fields use, never a second regex here: a note and a contact name are held to the
// same standard, and two definitions of "this text hides a phone number" would drift apart.
import { holdsPhoneRun } from "@/lib/contacts/contact-fields";

/** The catalogue key this file records, and the only one it ever will: the licence basis is recorded on a LIST. */
export const LIST_BASIS_KEY = "LICENCE_OUTREACH";

/** Why a recording or a revocation was refused. Every refusal writes nothing and makes no audit row. */
export type ListBasisRefusal =
  | "no_officer" | "wording_unsaved" | "list_not_found" | "adult_not_attested" | "attestation_stale"
  | "note_has_phone" | "note_too_short" | "note_too_long"
  | "reason_has_phone" | "reason_too_short" | "reason_too_long"
  | "basis_not_found" | "not_saved";

/** The sentences of spec §7.8 — the note's are `CONSENT_BASIS_REFUSAL_SENTENCE`'s, reused rather than rewritten so the
 *  import panel and this card cannot come to word the same rule differently. */
export const LIST_BASIS_REFUSAL_SENTENCE: Readonly<Record<ListBasisRefusal, string>> = Object.freeze({
  no_officer: "Sign in again to record a basis.",
  wording_unsaved:
    "The licence outreach wording or its 18+ confirmation hasn't been saved yet — an admin saves them in Admin → System → Marketing wordings.",
  list_not_found: "That list wasn't found — reload the page.",
  adult_not_attested: "Confirm that every number on this list belongs to a person aged 18 or older.",
  // ⛔ 3b · the tick was given for words reworded since the page opened, or the page predates this rule and posted no
  // version: nothing is recorded. ⛔ The sentence must be TRUE IN BOTH CASES (the review of 2026-10-07) — "reworded while
  // this page was open" was false for a page that simply predates the deploy, so it names both causes: the sentence
  // changed, or the page itself did.
  attestation_stale:
    "Nothing was recorded: the 18+ sentence, or this page itself, has changed since the page was loaded. Reload the page, read the sentence again, tick it, then record.",
  note_has_phone: CONSENT_BASIS_REFUSAL_SENTENCE.note_has_phone,
  note_too_short: CONSENT_BASIS_REFUSAL_SENTENCE.note_too_short,
  note_too_long: CONSENT_BASIS_REFUSAL_SENTENCE.note_too_long,
  reason_has_phone: CONSENT_BASIS_REFUSAL_SENTENCE.note_has_phone,
  reason_too_short: `Write at least ${PROOF_NOTE_MIN} characters saying why the basis is being revoked.`,
  reason_too_long: `Keep the reason to ${PROOF_NOTE_MAX} characters or fewer.`,
  basis_not_found: "That list has no basis in force — reload the page.",
  not_saved: "That didn't save — nothing was changed. Reload the page to check before trying again.",
});

export type RecordListBasisResult =
  | { readonly ok: true; readonly basisId: string; readonly coverage: ListBasisCoverage }
  | { readonly ok: false; readonly reason: ListBasisRefusal; readonly error: string };

export type RevokeListBasisResult =
  | { readonly ok: true; readonly basisId: string }
  | { readonly ok: false; readonly reason: ListBasisRefusal; readonly error: string };

const refuse = <T extends { ok: false; reason: ListBasisRefusal; error: string }>(reason: ListBasisRefusal): T =>
  ({ ok: false, reason, error: LIST_BASIS_REFUSAL_SENTENCE[reason] }) as T;

/* ⛔ `lb_` AND TWENTY LOWER-CASE LETTERS — the model's own shape (`LIST_BASIS_ID`), and both DAL twins refuse anything
   else. Letters only, so no digit run a log could read as a phone number; and an alphabet whose code-unit order agrees
   with every Postgres collation, because the id breaks a `recordedAt` tie and the two twins must break it the same way.
   ⭐ `randomInt` and not `Math.random`: an id that is evidence should not be guessable from another one. */
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function mintBasisId(): string {
  let out = "lb_";
  for (let i = 0; i < 20; i++) out += LETTERS[randomInt(LETTERS.length)];
  return out;
}

/** The note's own rules, in the order the card shows them. Shared by the recording and the revocation reason. */
function noteProblem(raw: unknown, kind: "note" | "reason"): ListBasisRefusal | null {
  const text = normalizeProofNote(raw);
  if (holdsPhoneRun(text)) return kind === "note" ? "note_has_phone" : "reason_has_phone";
  const chars = proofNoteChars(text);
  if (chars < PROOF_NOTE_MIN) return kind === "note" ? "note_too_short" : "reason_too_short";
  if (chars > PROOF_NOTE_MAX) return kind === "note" ? "note_too_long" : "reason_too_long";
  return null;
}

/** ⛔ 3b · A posted version: plain decimal digits, the first not a zero, at most ten of them — and nothing else. */
const POSTED_VERSION = /^[1-9][0-9]{0,9}$/;

/**
 * ⛔ 3b · THE VERSION A TICK WAS GIVEN FOR, AS THE CARD POSTS IT — re-typed here, never trusted to be the shape the card
 * meant to send. A form field arrives as TEXT, so the version is plain decimal digits with no sign, space, leading zero,
 * fraction or exponent ("3"); anything else — absent, empty, "0", "03", "3.0", " 3", "-3", a number, a file — is null.
 * ⛔ Null is never "nothing was reworded": the writer refuses it `attestation_stale` like a mismatch, so a page that posts
 * no version (one loaded before this rule shipped) is asked to read the words again, never recorded against today's.
 */
export function attestedVersionOf(raw: unknown): number | null {
  return typeof raw === "string" && POSTED_VERSION.test(raw) ? Number(raw) : null;
}

/** What the writer reads that a suite may swap. ⛔ For in-process red plants and a fresh world per run ONLY, never in
 *  production: the action passes nothing, and gets these. */
export type ListBasisDeps = {
  /** The newest SAVED version of a wording, or null while it is unsaved — ⛔ never a suggestion (W1). */
  readonly wording: typeof currentWording;
};
export const LIST_BASIS_DEPS: ListBasisDeps = { wording: currentWording };

/**
 * ⭐ RECORD A BASIS. Every rule is run before anything is written, the row carries the words as they stand, and the
 * COMPLIANCE row carries COUNTS ONLY — never a number, never the note's text (spec §8).
 */
export async function recordListBasis(input: {
  listId: string; officerId: string; proofNote: string; adultAttested: boolean;
  /** ⛔ 3b · the version of the `adult.list` words the tick was given for, as the card showed them (`attestedVersionOf`
   *  the posted field) — null when none was posted. */
  attestedVersion: number | null;
  nowIso?: string;
}, deps: ListBasisDeps = LIST_BASIS_DEPS): Promise<RecordListBasisResult> {
  const officerId = typeof input?.officerId === "string" ? input.officerId.trim() : "";
  if (officerId === "") return refuse("no_officer");

  // ⛔ The words FIRST: a basis recorded under a wording nobody approved is not evidence of anything.
  const wording = deps.wording("basis.LICENCE_OUTREACH");
  const adult = deps.wording("adult.list");
  if (wording === null || adult === null) return refuse("wording_unsaved");

  const list = await Promise.resolve(db.contactList.find(input.listId)).catch(() => null);
  if (!list) return refuse("list_not_found");

  // ⛔ The tick is a person's attestation, not a default. It is asked for every recording, including a re-recording.
  if (input.adultAttested !== true) return refuse("adult_not_attested");
  // ⛔ 3b · AND IT COUNTS ONLY FOR THE WORDS IT WAS GIVEN FOR. The row stores `adult`, the words saved NOW; a tick given
  // for any other version (reworded while the page was open), for none, or for a value that is not that version's
  // number is refused before anything is written — a strict comparison, so text, a fraction or null never passes.
  if (input.attestedVersion !== adult.v) return refuse("attestation_stale");

  const noteBad = noteProblem(input.proofNote, "note");
  if (noteBad) return refuse(noteBad);
  const proofNote = normalizeProofNote(input.proofNote);

  const recordedAt = typeof input.nowIso === "string" ? input.nowIso : new Date().toISOString();
  const row = await Promise.resolve(db.contactListBasis.create({
    id: mintBasisId(), listId: input.listId, basisKey: LIST_BASIS_KEY,
    wording: wording.text, wordingVersion: wording.v,
    adultWording: adult.text, adultVersion: adult.v,
    proofNote, recordedBy: officerId, recordedAt,
  })).catch(() => null);
  if (!row) return refuse("not_saved");

  /* The coverage this recording achieved, read back from the DAL rather than counted here — the card prints
     "covers 412 of 420" from the same read, so the audit row and the screen cannot disagree. */
  const coverage = await Promise.resolve(db.contactListBasis.coveredCount(input.listId));
  await audit({
    category: "COMPLIANCE",
    action: "marketing.list_basis_recorded",
    actorId: officerId,
    targetType: "ContactList",
    targetId: input.listId,
    // ⛔ COUNTS AND IDS ONLY. `noteChars` and never the note: it is evidence kept for seven years, read on the row.
    payload: {
      basisId: row.id, basisKey: LIST_BASIS_KEY,
      wordingVersion: wording.v, adultVersion: adult.v,
      members: coverage.live, covered: coverage.covered, noteChars: proofNoteChars(proofNote),
    },
  });
  return { ok: true, basisId: row.id, coverage };
}

/**
 * ⭐ REVOKE THE BASIS IN FORCE. ⛔ It covers nothing FROM THEN ON, and an older recording never comes back (U33a-L's
 * rule: a list's one standing is its NEWEST recording, revoked or not). A revocation is never refused for a rule about
 * the words — stopping outreach must not wait on a wording, exactly as closing the record is never refused for a
 * failing check (U33a-R).
 */
export async function revokeListBasis(input: {
  listId: string; officerId: string; reason: string; nowIso?: string;
}): Promise<RevokeListBasisResult> {
  const officerId = typeof input?.officerId === "string" ? input.officerId.trim() : "";
  if (officerId === "") return refuse("no_officer");
  const reasonBad = noteProblem(input.reason, "reason");
  if (reasonBad) return refuse(reasonBad);
  const reason = normalizeProofNote(input.reason);

  // The list's standing is its NEWEST recording — `listForList` answers newest first, and only an unrevoked one is
  // in force. ⛔ Asked of the DAL, never recomputed: "which basis is in force" has exactly one definition.
  const newest = (await Promise.resolve(db.contactListBasis.listForList(input.listId)))[0];
  if (!newest || newest.revokedAt !== null) return refuse("basis_not_found");

  const at = typeof input.nowIso === "string" ? input.nowIso : new Date().toISOString();
  const row = await Promise.resolve(db.contactListBasis.revoke({ id: newest.id, by: officerId, reason, at })).catch(() => null);
  if (!row) return refuse("not_saved");
  await audit({
    category: "COMPLIANCE",
    action: "marketing.list_basis_revoked",
    actorId: officerId,
    targetType: "ContactList",
    targetId: input.listId,
    payload: { basisId: row.id, reasonChars: proofNoteChars(reason) },
  });
  return { ok: true, basisId: row.id };
}
