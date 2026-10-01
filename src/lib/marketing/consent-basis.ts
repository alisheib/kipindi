/**
 * U33a · THE CONSENT BASES AN IMPORT RUN CAN BE APPLIED UNDER — the ONE catalogue, append-only.
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
 * ⚠️ G4 · THE FOUR WORDINGS AND THE 18+ SENTENCE ARE DRAFTS. They are owner gate G4 (DECISIONS-U29-U40):
 * Ali confirms them before ANY row is written under them, because from the first production row they are
 * append-only legal evidence. Until he does, `CONSENT_BASIS_G4.state` reads "DRAFT", every `since` reads
 * `UNSHIPPED`, and NOTHING IN PRODUCTION REACHES THEM (G4 as the lead narrowed it on 2026-10-01, Option A —
 * plan §0h): `test:marketing-consent` U33.draft2 fails while the state is DRAFT if a production entry point — a
 * file under src/app, a "use server" module, the boot hook or the proxy — names this file or the import writer
 * (`import-consent`), calls `recordImportConsentBatch(` or `fixConsentBasis(`, imports a barrel that re-exports
 * either, or reaches a draft writer through its imports. So the writer may land UNCALLED (U33a's engine commit)
 * and the gate may read `isImportAttestation`; the first production caller — U32's commit action, U33b's panel —
 * is what waits for Ali. ⛔ Never flip the state to make that pass — the flip IS Ali's answer, and it comes with
 * the ship date in every `since` (U33.draft1) and the pin taken again, once.
 *
 * ⛔ APPEND-ONLY ONCE CONFIRMED. Editing a wording after a row carries it would make the ledger say
 * something nobody attested; a new reading is a NEW entry with its own key and `since` (the
 * `consent-wording.ts` precedent). `test:marketing-consent` U33.pin hashes key|since|firstParty|wording
 * of the entries plus the 18+ sentence.
 *
 * ⛔ ENGLISH, ON PURPOSE. The officer reads it in admin chrome, and the ledger row records locale EN — the
 * `erase.ts` precedent (`ERASURE_LEDGER_WORDING`).
 *
 * ⛔ PURE AND IMPORT-FREE. The basis panel will render it in the browser; the gate and the import writer read it
 * on the server. `test:client-graph-safe` pins it (decision M3) — ⚠️ that suite joins predeploy only at U29b
 * (M10), so until then the pin holds when the suite is run, not at every deploy.
 *
 * Guard: `npm run test:marketing-consent` (the U33a section, `scripts/marketing-consent/consent-basis.mts`).
 */

export type ConsentBasisKey = "OWN_FORM" | "OWN_EVENT" | "AGENT_ROSTER" | "THIRD_PARTY";

/** The `since` of an entry no deploy can write yet. ⛔ A decision day is not a ship date (the consent-wording saga). */
export const UNSHIPPED = "unshipped";

export type PinnedConsentBasis = {
  readonly key: ConsentBasisKey;
  /** The day this wording first shipped — the deploy that could first WRITE it under a real import, not the day
   *  it was drafted or decided. ⛔ `UNSHIPPED` while `CONSENT_BASIS_G4` is DRAFT. */
  readonly since: string;
  /** ⭐ A first-party basis records consent (with the 18+ attestation); the bought-list basis records NOTHING. */
  readonly firstParty: boolean;
  /** The radio card's title. Admin chrome, NOT evidence: never stored, not pinned. */
  readonly label: string;
  /** ⛔ VERBATIM EVIDENCE about ONE person. A first-party row stores it with the 18+ sentence appended
   *  (`importConsentWording`), never alone. */
  readonly wording: string;
};

/** ⚠️ G4 · Ali's confirmation of the wordings. ⛔ Only Ali's answer changes it (see the header). */
export type ConsentBasisG4 =
  | { readonly state: "DRAFT"; readonly confirmedOn: null }
  | { readonly state: "CONFIRMED"; readonly confirmedOn: string };

export const CONSENT_BASIS_G4: ConsentBasisG4 = { state: "DRAFT", confirmedOn: null };

/** ⚠️ G4 DRAFT. Asked and stored only with a first-party basis — for a bought list nothing is recorded that
 *  it could travel with (OD14: "with the consent"), so it is neither asked nor shown there. */
export const ADULT_ATTESTATION_WORDING = "They told us they are 18 or older.";

export const CONSENT_BASES: readonly PinnedConsentBasis[] = [
  // ── U33 (drafted 2026-10-01) — ⛔ G4 DRAFTS: nothing in production writes them until Ali confirms them ──
  {
    key: "OWN_FORM", since: UNSHIPPED, firstParty: true, label: "Our own form",
    wording: "This person gave their number to 50pick on a 50pick form and agreed there to receive 50pick offers and news by SMS.",
  },
  {
    key: "OWN_EVENT", since: UNSHIPPED, firstParty: true, label: "A 50pick event or shop",
    wording: "This person gave their number to 50pick staff at a 50pick event or shop and agreed there to receive 50pick offers and news by SMS.",
  },
  {
    // ⭐ An agent's roster counts as first-party (OD9): a registered agent collects for 50pick, under 50pick's terms.
    key: "AGENT_ROSTER", since: UNSHIPPED, firstParty: true, label: "A registered 50pick agent",
    wording: "This person gave their number to a registered 50pick agent for 50pick and agreed to receive 50pick offers and news by SMS.",
  },
  {
    // ⛔ NOT CONSENT. Shown on its card so the officer reads what they are choosing; never stored on a ledger row.
    key: "THIRD_PARTY", since: UNSHIPPED, firstParty: false, label: "A bought or third-party list",
    wording: "This number came from a bought or third-party list; the person never agreed to hear from 50pick.",
  },
  // ⛔ APPEND BELOW THIS LINE — never edit or remove an entry above it once G4 is CONFIRMED.
];

/** The one sentence the panel shows before a bought-list run is applied (neutral tone, never danger). UI copy,
 *  not evidence: never stored, not pinned. */
export const THIRD_PARTY_NOTICE = "These numbers will be stored and never sent a marketing SMS. A bought or third-party list is not consent.";

/** ⭐ The proof note — where the numbers came from, in the officer's words. It travels in ledger `evidence`
 *  (withheld from the DSAR export, kept seven years), so it is bounded and screened (§5.14). */
export const PROOF_NOTE_MIN = 10;
export const PROOF_NOTE_MAX = 500;

/** The catalogue entry for a key, exactly as spelled — ⛔ no case folding, no trimming: an unknown key is
 *  REFUSED by the caller, never guessed (C2). */
export function consentBasisFor(key: string | null | undefined): PinnedConsentBasis | null {
  if (typeof key !== "string") return null;
  return CONSENT_BASES.find((b) => b.key === key) ?? null;
}

/**
 * The wording a first-party import consent row stores: the basis wording, then the 18+ sentence. `null` for the
 * bought-list basis — it records no row.
 *
 * ⛔ COMPOSED FROM THE CATALOGUE'S ENTRY, NEVER FROM THE OBJECT HANDED IN. A look-alike basis (a label where the
 * wording belongs, a flipped flag, an edited copy) composes nothing, so every string this returns is one
 * `isAttestedImportWording` recognises and the gate can read back.
 */
export function importConsentWording(basis: PinnedConsentBasis | null | undefined): string | null {
  if (!basis) return null;
  const pinned = consentBasisFor(basis.key);
  if (!pinned || !pinned.firstParty || basis.firstParty !== true || basis.wording !== pinned.wording) return null;
  return `${pinned.wording} ${ADULT_ATTESTATION_WORDING}`;
}

const ATTESTED = new Set(CONSENT_BASES.map((b) => importConsentWording(b)).filter((w): w is string => w !== null));

/** Is this stored wording one of the composed first-party wordings? Exact match — the wording is evidence. */
export function isAttestedImportWording(wording: string | null | undefined): boolean {
  return typeof wording === "string" && ATTESTED.has(wording);
}

/** The ledger fields the attestation check reads. Structural, so the pure file needs no server type. */
export type ImportAttestationRow = { status: string; source: string; recordedBy: string | null; wording: string };

/**
 * Is this ledger row an officer's first-party import attestation — the ONLY row that carries an 18+ statement
 * for a contact? GIVEN, source IMPORT, recorded BY someone, under an attested wording.
 * ⛔ Nothing is inferred from `evidence` or anything else on the row (U11): reading an 18+ out of free text
 * would be inventing the attestation.
 */
export function isImportAttestation(row: ImportAttestationRow | null | undefined): boolean {
  return !!row && row.status === "GIVEN" && row.source === "IMPORT"
    && typeof row.recordedBy === "string" && row.recordedBy.trim() !== ""
    && isAttestedImportWording(row.wording);
}

export type ConsentBasisInput = { basisKey: string; proofNote: string; adultAttested: boolean };
export type ConsentBasisRefusal = "unknown_basis" | "note_has_phone" | "note_too_short" | "note_too_long" | "adult_not_attested";
export type ConsentBasisCheck =
  | { ok: true; basis: PinnedConsentBasis; wording: string | null; proofNote: string; adultAttested: boolean }
  | { ok: false; reason: ConsentBasisRefusal; sentence: string };

/** Each refusal in words — the panel's reason line and the server's answer say the same sentence. */
export const CONSENT_BASIS_REFUSAL_SENTENCE: Readonly<Record<ConsentBasisRefusal, string>> = {
  unknown_basis: "Choose how these people gave you their numbers.",
  note_has_phone: "Remove the phone number. A proof note is kept for seven years and must never hold one.",
  note_too_short: `Write at least ${PROOF_NOTE_MIN} characters saying where these numbers came from.`,
  note_too_long: `Keep the proof note to ${PROOF_NOTE_MAX} characters or fewer.`,
  adult_not_attested: "Confirm that these people told you they are 18 or older.",
};

/**
 * The proof note as it is STORED, counted and checked: the officer's own characters — composed (NFC) but never
 * compatibility-folded, so "№4" stays "№4" in seven-year evidence — invisible format characters removed (a
 * zero-width space between digits would hide a number from the screen), every run of whitespace or control
 * characters one space, trimmed. The panel's live count and the server's limits both count THIS form.
 */
export function normalizeProofNote(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.normalize("NFC").replace(/\p{Cf}/gu, "").replace(/[\s\p{Cc}]+/gu, " ").trim();
}

/** The proof note's length as the officer counts it — characters of the stored form, not UTF-16 units. The panel's
 *  live count. */
export function proofNoteChars(raw: unknown): number {
  return Array.from(normalizeProofNote(raw)).length;
}

/**
 * §5.14 · The separators the spec names, and only those: whitespace, `.`, `(` `)` `[` `]`, `+` and every dash
 * (`\p{Pd}`: hyphen, en and em dash, the full-width hyphen). ⚠️ NOT `/`, `_`, `,` or `·`, on purpose — a date range
 * ("12/03/2026-14/03/2026") or a list of stand numbers would read as one long number. A number written with
 * those separators passes this screen.
 */
const NUMBER_SEPARATORS = /[\s.()\[\]+\p{Pd}]/gu;
const PHONE_RUN = /\p{Nd}{9,}/u;

/** ⛔ §5.14 · A run of nine or more digits once the separators above are gone, read on a compatibility-folded copy
 *  that is never stored (NFKC: a full-width or circled digit is a digit, a full-width dot is a dot). */
function holdsPhoneShapedRun(note: string): boolean {
  return PHONE_RUN.test(note.normalize("NFKC").replace(NUMBER_SEPARATORS, ""));
}

/**
 * ⭐ THE ONE DOOR for a basis: the panel enables Apply on it and the start action validates the request with it,
 * so the two can never disagree. Refusals come in the order the officer meets the fields — the basis, the note,
 * then the 18+ box — so the reason line names the FIRST missing thing.
 * ⛔ Total over a hostile request: a missing note is a short note, and only the boolean `true` attests.
 */
export function checkConsentBasisInput(input: ConsentBasisInput): ConsentBasisCheck {
  const refuse = (reason: ConsentBasisRefusal): ConsentBasisCheck => ({ ok: false, reason, sentence: CONSENT_BASIS_REFUSAL_SENTENCE[reason] });
  const basis = consentBasisFor(input?.basisKey);
  if (!basis) return refuse("unknown_basis");
  const proofNote = normalizeProofNote(input?.proofNote);
  if (holdsPhoneShapedRun(proofNote)) return refuse("note_has_phone");
  const chars = Array.from(proofNote).length;
  if (chars < PROOF_NOTE_MIN) return refuse("note_too_short");
  if (chars > PROOF_NOTE_MAX) return refuse("note_too_long");
  const attested = input?.adultAttested === true;
  // ⭐ Asked only with a first-party basis. A tick left over from a first-party choice is NOT carried onto a
  // bought list — nothing is recorded there that it could travel with.
  if (basis.firstParty && !attested) return refuse("adult_not_attested");
  return { ok: true, basis, wording: importConsentWording(basis), proofNote, adultAttested: basis.firstParty && attested };
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
 * basis) or a key the catalogue does not hold composes nothing either.
 */
export function importConsentEvidence(runId: string, key: ConsentBasisKey, proofNote: string): string | null {
  const note = normalizeProofNote(proofNote);
  if (typeof runId !== "string" || !RUN_ID.test(runId) || !consentBasisFor(key) || holdsPhoneShapedRun(note)) return null;
  return `import:${runId} basis:${key} note:${note}`;
}
