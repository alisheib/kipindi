/**
 * U33a · THE CONSENT BASES — the ONE catalogue of the reasons 50pick may hold and message a number, append-only:
 * the four an import run is applied under, and (OD57 · OD58) the licence outreach basis an officer records on a LIST.
 *
 * ⭐ WHY THIS EXISTS. The officer importing a file is the only person who knows how those numbers were
 * gathered. Before the run writes anything they say so ONCE, for the whole run, by choosing one basis
 * below. A first-party basis's composed wording is what the consent row of each number the run creates
 * will carry, byte for byte (§5.7), and the person reads it back in their DSAR export (`dsar.ts` shows
 * `wording` and withholds `evidence`). So every wording here is written about ONE person and must read
 * true about each of them.
 *
 * ⛔ NO FILE CONTENT EVER GRANTS CONSENT (OD10, U31). The only consent an import records is this run-level
 * attestation, and only for a number the run CREATES that has no ledger row, no active suppression and no
 * player holding it (DECISIONS X5, computed inside `decide()`). A bought or third-party list (THIRD_PARTY)
 * records NO ledger row at all: the absence is "no consent" at the gate, and the book row's cache stays
 * UNKNOWN. 🔴 There is no ledger UNKNOWN — `MessagingConsentStatus` is GIVEN | WITHDRAWN, and a ledger
 * UNKNOWN would become the person's LATEST row and speak over a real GIVEN or WITHDRAWN (found by the U33
 * design pass, 2026-10-01: OD9's "a bought list writes UNKNOWN" was false — no enum migration is owed).
 *
 * ⛔ THE LICENCE BASIS IS NEVER A CONSENT (OD57 · OD58, spec S1). `LICENCE_OUTREACH` is "acquisition outreach under
 * 50pick's Gaming Board of Tanzania licence": nobody agreed to anything, so it is not first-party, it composes no
 * ledger wording, and the import door refuses it — it is recorded on a LIST, with that list's own 18+ confirmation, in
 * its own append-only table (`ContactListBasis`, U33a-L / U33b-L), and counts only while the owner's licence-outreach
 * record is open (U33a-R). Its `licence: true` flag is how every reader tells it apart.
 *
 * ⭐ U33w · THE WORDINGS ARE THE ADMIN'S, AND THE TEXT HERE IS EACH ONE'S SUGGESTION (S14 · the owner rule of
 * 2026-10-03, "admins can change everything"). Every basis wording, the 18+ sentence and the bought-list notice is
 * edited on the "Marketing wordings" card (/admin/system) and kept with an append-only history in `marketing.wordings`
 * (`marketing-wordings.ts`; the server half is `src/lib/server/marketing/wordings.ts`). What this file holds is the
 * DEFAULT that prefills the card. ⛔ NOTHING IS EVER RECORDED UNDER A DEFAULT NOBODY SAVED (W1): the two functions
 * that compose and recognise an import attestation take the SAVED versions as a parameter (`SavedBasisWordings`) and
 * stay pure, and the ONE door refuses a first-party basis whose words are unsaved (`wording_unsaved`). The old
 * `CONSENT_BASIS_G4` switch is gone with OD50's static ban: G4 now means "an admin saved these words on the card, and
 * the save is audited" — Ali, or Claude on his word — and the intent is kept at runtime: nothing unconfirmed reaches
 * evidence (`test:marketing-wordings` W1 finds any basis writer that names a default, however it reaches one).
 * ⭐ M3 · THE FIELD SAYS WHAT IT HOLDS: an entry's words are its `defaultWording`, never a bare `wording` a writer could
 * take for the words to record — and W1 counts any read of `defaultWording` outside the two homes as reaching a
 * default, however it is spelled (chained off the lookup, a variable, a non-null assertion, destructured). The door's
 * answer carries the composed SAVED wording and the flags a caller needs — never the catalogue entry, so a caller
 * cannot reach a default through it either.
 *
 * ⛔ APPEND-ONLY, AND PINNED. `test:marketing-consent` U33.pin hashes key|since|firstParty|defaultWording of the FIRST
 * FOUR entries plus the 18+ sentence — the drafts of 2026-10-01, kept as defaults. The hash is over the VALUES (the field
 * was renamed from `wording` with the sha unmoved, M3). Those values never change and the pin is
 * never re-taken: a default carries no ship date (every `since` reads `UNSHIPPED`, U33.draft1), and the date evidence
 * carries is the saved version's own `savedAt`. A new reading of a basis is a new SAVED version on the card; a new
 * basis is a NEW entry appended below the line (`LICENCE_OUTREACH` is the first).
 *
 * ⛔ ENGLISH, ON PURPOSE. The officer reads it in admin chrome, and the ledger row records locale EN — the
 * `erase.ts` precedent (`ERASURE_LEDGER_WORDING`).
 *
 * ⛔ PURE AND CLIENT-SAFE. The Marketing wordings card reads it in the browser (through `marketing-wordings.ts`), and the
 * gate and the writers read it on the server. `test:client-graph-safe` pins it (decision M3). Its ONE import (vb5) is the
 * phone-run detector every free-text field shares (`holdsPhoneRun`, `../contacts/contact-fields`, itself pure and
 * pinned) — this file kept a private copy of it until then.
 *
 * Guards: `npm run test:marketing-consent` (the U33a section, `scripts/marketing-consent/consent-basis.mts`) and
 * `npm run test:marketing-wordings` (W1 · W6).
 */
import { holdsPhoneRun } from "../contacts/contact-fields";

export type ConsentBasisKey = "OWN_FORM" | "OWN_EVENT" | "AGENT_ROSTER" | "THIRD_PARTY" | "LICENCE_OUTREACH";

/** The `since` of every entry. ⭐ A DEFAULT CARRIES NO SHIP DATE (U33.draft1): the date evidence carries is the SAVED
 *  version's own `savedAt` (`marketing-wordings.ts`). ⛔ A decision day is not a ship date (the consent-wording saga). */
export const UNSHIPPED = "unshipped";

export type PinnedConsentBasis = {
  readonly key: ConsentBasisKey;
  /** ⛔ Always `UNSHIPPED` — a default has no ship date, and U33.pin holds the first four exactly as they stand. */
  readonly since: string;
  /** ⭐ A first-party basis records consent (with the 18+ attestation); every other basis records NOTHING on the ledger. */
  readonly firstParty: boolean;
  /** ⭐ OD57 · OD58 · the licence outreach basis — recorded on a LIST with its 18+ confirmation (U33b-L), never on an
   *  import run and never as a consent. Present, and `true`, on that entry alone. */
  readonly licence?: true;
  /** The radio card's title. Admin chrome, NOT evidence: never stored, not pinned. */
  readonly label: string;
  /** ⭐ THE DEFAULT WORDING — the suggestion the Marketing wordings card prefills (`basis.<KEY>`), named so that nobody
   *  takes it for the words to record (M3). ⛔ Never stored as it stands: a first-party row carries the SAVED version's
   *  words with the saved 18+ sentence appended (`importConsentWording`), never a default and never the basis words
   *  alone. Read only by the two homes — W1 finds any basis writer that reads it, directly or through a helper. */
  readonly defaultWording: string;
};

/** ⭐ THE DEFAULT 18+ SENTENCE (`adult.consent`) — a suggestion, pinned (U33.pin); a row carries the SAVED version.
 *  Asked and stored only with a first-party basis — for a bought list nothing is recorded that it could travel with
 *  (OD14: "with the consent"), so it is neither asked nor shown there. */
export const ADULT_ATTESTATION_WORDING = "They told us they are 18 or older.";

export const CONSENT_BASES: readonly PinnedConsentBasis[] = [
  // ── U33 (drafted 2026-10-01) — the DEFAULTS of the first four: suggestions on the Marketing wordings card; nothing records one until an admin saves it (W1) ──
  {
    key: "OWN_FORM", since: UNSHIPPED, firstParty: true, label: "Our own form",
    defaultWording: "This person gave their number to 50pick on a 50pick form and agreed there to receive 50pick offers and news by SMS.",
  },
  {
    key: "OWN_EVENT", since: UNSHIPPED, firstParty: true, label: "A 50pick event or shop",
    defaultWording: "This person gave their number to 50pick staff at a 50pick event or shop and agreed there to receive 50pick offers and news by SMS.",
  },
  {
    // ⭐ An agent's roster counts as first-party (OD9): a registered agent collects for 50pick, under 50pick's terms.
    key: "AGENT_ROSTER", since: UNSHIPPED, firstParty: true, label: "A registered 50pick agent",
    defaultWording: "This person gave their number to a registered 50pick agent for 50pick and agreed to receive 50pick offers and news by SMS.",
  },
  {
    // ⛔ NOT CONSENT. Shown on its card so the officer reads what they are choosing; never stored on a ledger row.
    key: "THIRD_PARTY", since: UNSHIPPED, firstParty: false, label: "A bought or third-party list",
    defaultWording: "This number came from a bought or third-party list; the person never agreed to hear from 50pick.",
  },
  // ⛔ APPEND BELOW THIS LINE — never edit or remove an entry above it: U33.pin holds them, and what a row carries is
  // the version an admin SAVED on the Marketing wordings card, never these defaults.
  {
    // ⛔ NOT CONSENT (OD57 · OD58). The person has NOT agreed, and the default says so in those words — the card refuses
    // any save of this basis that does not (`test:marketing-wordings` W5). Recorded per LIST (U33b-L), never on an
    // import run: the import door refuses it.
    key: "LICENCE_OUTREACH", since: UNSHIPPED, firstParty: false, licence: true, label: "Outreach under our licence",
    defaultWording: "50pick may send this person offers and news by SMS as outreach under its Gaming Board of Tanzania licence. The person has not agreed to receive them; every message carries a stop link, and a stop is kept for good.",
  },
];

/** ⭐ THE DEFAULT BOUGHT-LIST NOTICE (`notice.thirdParty`) — the one sentence the panel shows before a bought-list run is
 *  applied (neutral tone, never danger). UI copy, not evidence: never stored on a row, not pinned, edited on the card.
 *  🔴 OD57 MADE THE OLD DEFAULT FALSE: it promised such numbers are "never sent a marketing SMS", and a list recorded
 *  under the licence outreach basis now can be. */
export const THIRD_PARTY_NOTICE = "These numbers will be stored without consent. They receive marketing SMS only after you put them on a list and record the licence outreach basis for it, with its 18+ confirmation.";

/** ⭐ The proof note — where the numbers came from, in the officer's words. It travels in ledger `evidence`
 *  (withheld from the DSAR export, kept seven years), so it is bounded and screened (§5.14). */
export const PROOF_NOTE_MIN = 10;
export const PROOF_NOTE_MAX = 500;

/** The catalogue entry for a key, exactly as spelled — ⛔ no case folding, no trimming: an unknown key is
 *  REFUSED by the caller, never guessed (C2). ⭐ Total over the catalogue, the licence basis included (a list basis
 *  validates its key here); the IMPORT door narrows it (`checkConsentBasisInput`). */
export function consentBasisFor(key: string | null | undefined): PinnedConsentBasis | null {
  if (typeof key !== "string") return null;
  return CONSENT_BASES.find((b) => b.key === key) ?? null;
}

/**
 * ⭐ THE SAVED WORDINGS — what an import attestation is composed from and recognised against (U33w · S14). The server
 * reads them from `marketing.wordings` (`savedBasisWordingsOf`, `marketing-wordings.ts`) and hands them in, so this
 * file stays pure. Each list is every SAVED version's text, OLDEST FIRST: `basis.<KEY>` under its key, and
 * `adult.consent` as `adult`. ⛔ A key never saved is absent or empty — and then nothing composes and nothing is
 * recognised.
 */
export type SavedBasisWordings = {
  readonly basis: Readonly<Partial<Record<ConsentBasisKey, readonly string[]>>>;
  readonly adult: readonly string[];
};

/** Nothing saved — what every reader answers before an admin saves the card, and in a process that could not load it. */
export const NO_SAVED_WORDINGS: SavedBasisWordings = Object.freeze({ basis: Object.freeze({}), adult: Object.freeze([]) });

/** The saved texts of one list, read defensively: a malformed hand-in reads as nothing saved (it fails closed). */
function savedTexts(list: unknown): readonly string[] {
  return Array.isArray(list) ? list.filter((t): t is string => typeof t === "string" && t !== "") : [];
}

/**
 * The wording a first-party import consent row stores: the NEWEST SAVED version of the basis's words, then the NEWEST
 * SAVED 18+ sentence. `null` for every other basis — a bought list and the licence basis record no ledger row — and
 * `null` while either half has never been saved (W1: a default is a suggestion, never evidence).
 *
 * ⛔ THE BASIS IS THE CATALOGUE'S ENTRY, NEVER THE OBJECT HANDED IN. A look-alike basis (a label where the wording
 * belongs, a flipped flag, an edited copy) composes nothing, so every string this returns is one
 * `isAttestedImportWording` recognises against the same saved versions, and the gate can read back.
 */
export function importConsentWording(basis: PinnedConsentBasis | null | undefined, saved: SavedBasisWordings): string | null {
  if (!basis) return null;
  const pinned = consentBasisFor(basis.key);
  if (!pinned || !pinned.firstParty || pinned.licence === true || basis.firstParty !== true || basis.defaultWording !== pinned.defaultWording) return null;
  const words = savedTexts(saved?.basis?.[pinned.key]);
  const adult = savedTexts(saved?.adult);
  if (words.length === 0 || adult.length === 0) return null;
  return `${words[words.length - 1]} ${adult[adult.length - 1]}`;
}

/**
 * Is this stored wording a composed first-party wording — ANY saved version of a first-party basis's words, a space,
 * then ANY saved version of the 18+ sentence? Exact match: the wording is evidence. ⭐ Any saved pair, not only the
 * newest: a row recorded under version 1 keeps version 1's words verbatim after version 2 is saved (S14).
 * ⛔ Never a default nobody saved, and never a bought-list or licence wording with the 18+ sentence glued on.
 */
export function isAttestedImportWording(wording: string | null | undefined, saved: SavedBasisWordings): boolean {
  if (typeof wording !== "string" || wording === "") return false;
  const adult = savedTexts(saved?.adult);
  if (adult.length === 0) return false;
  for (const b of CONSENT_BASES) {
    if (!b.firstParty || b.licence === true) continue;
    for (const words of savedTexts(saved?.basis?.[b.key])) {
      for (const sentence of adult) if (wording === `${words} ${sentence}`) return true;
    }
  }
  return false;
}

/** The ledger fields the attestation check reads. Structural, so the pure file needs no server type. */
export type ImportAttestationRow = { status: string; source: string; recordedBy: string | null; wording: string };

/**
 * Is this ledger row an officer's first-party import attestation — the ONLY row that carries an 18+ statement
 * for a contact? GIVEN, source IMPORT, recorded BY someone, under a wording composed from SAVED versions.
 * ⛔ Nothing is inferred from `evidence` or anything else on the row (U11): reading an 18+ out of free text
 * would be inventing the attestation. The server hands it the saved versions: `isImportAttestationSaved`.
 */
export function isImportAttestation(row: ImportAttestationRow | null | undefined, saved: SavedBasisWordings): boolean {
  return !!row && row.status === "GIVEN" && row.source === "IMPORT"
    && typeof row.recordedBy === "string" && row.recordedBy.trim() !== ""
    && isAttestedImportWording(row.wording, saved);
}

export type ConsentBasisInput = { basisKey: string; proofNote: string; adultAttested: boolean };
export type ConsentBasisRefusal =
  | "unknown_basis" | "wording_unsaved" | "note_has_phone" | "note_too_short" | "note_too_long" | "adult_not_attested";
export type ConsentBasisCheck =
  /** `wording` is the composed SAVED wording for a first-party basis, and `null` for a bought list (it records nothing).
   *  ⛔ M3 · The answer names the basis by its key and carries the one flag a writer needs (`firstParty`: whether the run
   *  records a ledger row at all) — NEVER the catalogue entry, whose `defaultWording` a caller could otherwise record. */
  | { ok: true; basisKey: ConsentBasisKey; firstParty: boolean; wording: string | null; proofNote: string; adultAttested: boolean }
  | { ok: false; reason: ConsentBasisRefusal; sentence: string };

/** Each refusal in words — the panel's reason line and the server's answer say the same sentence. */
export const CONSENT_BASIS_REFUSAL_SENTENCE: Readonly<Record<ConsentBasisRefusal, string>> = {
  unknown_basis: "Choose how these people gave you their numbers.",
  wording_unsaved: "This basis's words or its 18+ sentence haven't been saved yet — an admin saves them in Admin → System → Marketing wordings.",
  note_has_phone: "Remove the phone number. A proof note is kept for seven years and must never hold one.",
  note_too_short: `Write at least ${PROOF_NOTE_MIN} characters saying where these numbers came from.`,
  note_too_long: `Keep the proof note to ${PROOF_NOTE_MAX} characters or fewer.`,
  adult_not_attested: "Confirm that these people told you they are 18 or older.",
};

/**
 * The proof note as it is STORED, counted and checked: the officer's own characters — composed (NFC) but never
 * compatibility-folded, so "№4" stays "№4" in seven-year evidence — invisible format characters removed (a
 * zero-width space between digits would hide a number from the screen), composed AGAIN, every run of whitespace or
 * control characters one space, trimmed. The panel's live count and the server's limits both count THIS form.
 * ⭐ IDEMPOTENT (U33w review): a format character between a letter and its accent blocks composition, so removing it
 * leaves a pair NFC would join — composing again after the removal makes a second pass change nothing, and a saved
 * marketing wording (`normalizeWording`, the same function) is read back exactly as it was written.
 */
export function normalizeProofNote(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.normalize("NFC").replace(/\p{Cf}/gu, "").normalize("NFC").replace(/[\s\p{Cc}]+/gu, " ").trim();
}

/** The proof note's length as the officer counts it — characters of the stored form, not UTF-16 units. The panel's
 *  live count. */
export function proofNoteChars(raw: unknown): number {
  return Array.from(normalizeProofNote(raw)).length;
}

/*
 * §5.14 · ⛔ vb5 · THE NOTE IS SCREENED BY THE ONE PHONE-RUN DETECTOR (`holdsPhoneRun`, `contact-fields.ts`) — the rule
 * that refuses a number in a contact's name or tags: a Tanzanian mobile number written with whitespace, a full stop, a
 * parenthesis, a square bracket, a plus sign, a LOW LINE or any dash between its digits, read through NFKC (a
 * full-width or circled digit is a digit) on a copy that is never stored. The low line joins since vb5 — the private
 * copy this file kept did not, so "0712_345_678" passed — and since the vb5 review (m3) only a number an operator's
 * prefix holds is refused, so a photo's name (IMG_20261003_143052.jpg) passes. ⚠️ A solidus or a comma still never
 * joins, on purpose: a date range (12/03/2026-14/03/2026) or a list of stand numbers is not one long number, so a
 * number written with those passes this screen.
 */

/**
 * ⭐ THE ONE DOOR for an import run's basis: the panel enables Apply on it and the start action validates the request
 * with it, so the two can never disagree. Refusals come in the order the officer meets the fields — the basis (and
 * whether its words are saved), the note, then the 18+ box — so the reason line names the FIRST missing thing.
 * ⛔ Total over a hostile request: a missing note is a short note, and only the boolean `true` attests.
 * ⛔ W1 · `saved` is REQUIRED, not defaulted: a first-party basis composes its row's words from the SAVED versions alone
 * (`importConsentWording`), and while either half is unsaved the door refuses it (`wording_unsaved`) — a caller cannot
 * reach a default by leaving the argument out.
 * ⛔ OD57 · OD58 · the licence basis is refused here as an unknown basis: it is recorded on a LIST with its own 18+
 * confirmation (U33b-L). A run applied "under the licence" would write nothing and look as if it had.
 */
export function checkConsentBasisInput(input: ConsentBasisInput, saved: SavedBasisWordings): ConsentBasisCheck {
  const refuse = (reason: ConsentBasisRefusal): ConsentBasisCheck => ({ ok: false, reason, sentence: CONSENT_BASIS_REFUSAL_SENTENCE[reason] });
  const basis = consentBasisFor(input?.basisKey);
  if (!basis || basis.licence === true) return refuse("unknown_basis");
  const wording = importConsentWording(basis, saved);
  if (basis.firstParty && wording === null) return refuse("wording_unsaved");
  const proofNote = normalizeProofNote(input?.proofNote);
  if (holdsPhoneRun(proofNote)) return refuse("note_has_phone");
  const chars = Array.from(proofNote).length;
  if (chars < PROOF_NOTE_MIN) return refuse("note_too_short");
  if (chars > PROOF_NOTE_MAX) return refuse("note_too_long");
  const attested = input?.adultAttested === true;
  // ⭐ Asked only with a first-party basis. A tick left over from a first-party choice is NOT carried onto a
  // bought list — nothing is recorded there that it could travel with.
  if (basis.firstParty && !attested) return refuse("adult_not_attested");
  return { ok: true, basisKey: basis.key, firstParty: basis.firstParty, wording, proofNote, adultAttested: basis.firstParty && attested };
}

/** A run id as the evidence carries it: ONE token, so `import:<run> basis:<KEY> note:<note>` parses one way. */
const RUN_ID = /^[A-Za-z0-9_-]+$/;

/**
 * The `evidence` a first-party import consent row carries — the run, the basis, the officer's note — or `null`, and
 * then nothing may be written.
 * ⛔ NO NUMBER EVER: the row's `identifier` already says whose consent it is. The note entered through
 * `checkConsentBasisInput`, which refuses a phone-shaped run, and it is screened AGAIN here — a caller handing in
 * the raw request note, or a run row written by a buggy path, would otherwise put a number into evidence nobody
 * can prune for seven years. A run id that is not one token (` basis:THIRD_PARTY` inside it would forge a second
 * basis), a key the catalogue does not hold, or the licence basis (no import run is ever applied under it — the door
 * refuses it) composes nothing either.
 */
export function importConsentEvidence(runId: string, key: ConsentBasisKey, proofNote: string): string | null {
  const note = normalizeProofNote(proofNote);
  const basis = consentBasisFor(key);
  if (typeof runId !== "string" || !RUN_ID.test(runId) || !basis || basis.licence === true || holdsPhoneRun(note)) return null;
  return `import:${runId} basis:${key} note:${note}`;
}
