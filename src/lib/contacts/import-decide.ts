/**
 * ⭐ decide() — THE ONE RULE FOR WHAT AN IMPORT DOES TO A NUMBER.                      (U31-A, S10 2026-10-01)
 *
 * One file row, the facts about its number and the officer's choice give ONE decision: create, update or keep.
 * The Apply button's label (`planImportRows` → `byChoice`, then `adjustTally` after per-row overrides), the
 * enumerated overwrite confirmation (`previewFor`) and the commit (U32's `commitBatch`, which writes what `decide()`
 * returns and re-decides once on a refused write — X3) all read THIS function, so what the button promised is what
 * the request does (plan §9 U31 Accept). `test:contacts-import` §D10 fails if another file spells the choices.
 *
 * ── THE THREE CHOICES (OD32: `msisdn` is unique, so "add a second row" does not exist) ───────────────────────
 *   KEEP (the default)  the book stays as it is — counted `keep`, ⛔ never `fail`.
 *   TAKE_FILE           every non-blank file value that differs replaces the book's; tags MERGE.
 *   FILL_BLANKS         only blank book fields are filled; tags only when the book has none.
 * A per-row override is keyed by the FILE ROW (`line`, C15/X19). ⛔ Never an array index: rows dropped as invalid
 * before decide() would shift every later index onto the wrong person.
 *
 * ── THE ORDER OF THE COLLAPSES (each beats everything below it, the override included) ──────────────────────
 *   1. ⛔ ERASED — the book row's `sourceRef` is `ERASURE_EVIDENCE` (U18b emptied it; the row decides ALONE), or there
 *      is no row and an erasure STANDS on the number → keep. ⭐ C8a (S15-15): "stands" is the ONE rule
 *      (`erasure-mark.ts`, `erasureStandsOn`) — the latest of the number's ledger rows that is a GIVEN or an erasure
 *      marker is a marker; a later opt-out's WITHDRAWN (a tap on an old /s/ link) or any other row that is not a GIVEN
 *      does NOT lift it, a GIVEN does. The facts carry it (`erasureStands`, one grouped read — `import-check.ts`); this
 *      file asks `isErasedNumber`, the function the Add form asks too. Re-importing an old spreadsheet must never write
 *      an erased person's name back (C3, X22). What a browser is told about such a row: the last section.
 *   2. ⛔ ON THE STOP LIST — an ACTIVE suppression (the caller asks `db.suppression.find`, never the book's
 *      `suppressedAt` cache, which no stop or lift maintains) → keep, whatever was asked. A NEW number on the stop
 *      list is still created (owner decision 5): the collapse protects an existing contact, and the send gate
 *      refuses the number either way.
 *   2b. ⛔ LINKED TO AN ACCOUNT (S15-11, the review round of 2026-10-09) — the book row carries a `userId` → keep
 *      (`account`), whatever was asked: the account is the source of that contact's details, and "use the file's
 *      version" would overwrite a player's registration row, email included. Shown to a reader as itself; a viewer who
 *      may not read numbers imports with KEEP only (S15-10), where every keep folds into one count.
 *   3. SAME RUN (OD33, the FIRST row wins) — this run already created the number (`importId === runId`), or an
 *      earlier line of the same file carries it (`repeatOf`) → keep. 🔴 The importId check alone holds only for
 *      creates: an update never sets `importId` (owner decision 8), so without `repeatOf` an in-book number that
 *      appears twice would be written twice and the LAST row would win.
 *   4. THE CHOICE — the override for this line, else the bulk choice.
 *   5. NOTHING TO CHANGE — the patch is empty → keep (`no_change`), so an export re-imported changes 0 rows (U34).
 *
 * ── ⛔ WHY THE PATCH HAS NO CONSENT FIELD ────────────────────────────────────────────────────────────────────
 * `ImportPatch` can express displayName, email, notes and tags and NOTHING else — no consentState, suppressedAt,
 * userId, source, sourceRef, importId or rawInput. A file cannot re-grant a withdrawn number, link a player or
 * claim another run's rows (OD10, owner decision 8). The ONLY consent seam is `consentWritable` on a CREATE (X5):
 * true only for a number with NO ledger row, no active stop and no player. U33 may record the officer's chosen
 * basis for exactly those rows; decide() itself writes nothing, and an existing row never carries the flag. The
 * caches (`consentState`, `suppressedAt`) are never decided here — `mirrorContactCache` owns them (C4, X6).
 *
 * ── WHAT "BLANK" AND "DIFFERENT" MEAN ────────────────────────────────────────────────────────────────────────
 * Blank is null, empty or only spaces, and ⛔ a blank file cell never blanks a book value (owner decision 1: there
 * is no undo, OD35). Different means different in the STORED form, measured by the SAME rule on both sides that
 * `draftContactRow` applied to the file's cells: a name through `cleanDisplayName`, notes through `cleanNotes`
 * (line endings unified, invisible format and control characters dropped, trimmed), an email trimmed and
 * lower-cased, tags by `tagKey` as a set (C11, X21). So re-importing what the book already holds is `no_change`,
 * however a spreadsheet re-spaced it — a book note carrying a zero-width space the file's copy was cleaned of
 * included — and an export re-imported changes 0 rows (U34). ⛔ A patch that writes tags writes the WHOLE list in
 * its stored form: the book's own tags lower-cased and de-duplicated, then the new ones (C11 binds the import writer
 * too; a row with nothing to add is not rewritten). A merge never takes a contact past `MAX_TAGS`: the tags that do
 * not fit are LISTED (`tagsNotAdded`), never silently dropped.
 *
 * ── ⛔ THE FIRST ROW OF A NUMBER IS THE WHOLE RUN'S (OD33) ─────────────────────────────────────────────────────
 * `decideRows` and `planImportRows` REQUIRE the first line of every number across the WHOLE run, and throw without
 * it: a default built from one batch would let an in-book number repeated across two batches be written twice (the
 * importId belt covers only creates). `firstLines` builds it from the run's staged rows and reads only the DECIDABLE
 * ones — an invalid or unreadable first occurrence never claims a number, or every valid repeat of it would be kept
 * as `same_run` and the number would never be imported.
 *
 * ── ⛔ WHAT MAY LEAVE THE SERVER (D19, X22) ──────────────────────────────────────────────────────────────────
 * `ImportDecision` is server-side truth: it carries `consentWritable`, the contact id and the `erased` reason. The
 * browser gets `DecisionPreview` and `ShownTally` only, and neither names a contact id. A create preview is
 * `{ line, kind }` and nothing more — a per-row consent or player flag is a membership oracle for GROWTH.
 * ⛔ ERASURE IS NEVER DISCLOSED (C3: an erased row is in no reader). An erased number is shown as the ORDINARY contact
 * it is disguised as — one holding exactly the file's values, with the number's real stop and the run's real
 * repeats — so steps 2–5 decide what it reads as: `suppressed` on the stop list, `same_run` as a repeat, otherwise
 * `chosen_keep` under KEEP and `no_change` under the other two. That is every keep's `shown` reason, and its preview
 * is that contact's, the file's own name included: the browser's whole plan for a file is the same whether its
 * erased numbers are erased or merely unchanged (`test:contacts-import` §D14b). ⛔ So the browser's fold is PER
 * DECISION. A count of `erased` cannot say which choice, stop or repeat each erased row was decided under, and
 * folding it into any one reason is the oracle: under KEEP every ordinary in-book row is `chosen_keep`, so a
 * `no_change` there would count the erased rows and nothing else. A residue this file cannot close: the book's own
 * list hides an erased row (C3), so an officer who searches the book for that number finds nothing.
 *
 * Pure and client-safe. It imports `./contact-fields` (the tag rule, the name and notes cleaners, the tag limit) and
 * `../marketing/erasure-mark` (the one mark and, since C8a, the one "is this number erased?") and nothing else: no
 * lib/server, no node:, no React, no directive.
 * Guard: `npm run test:contacts-import` (section `decide`) · red: `npm run red:contacts-import`.
 */
import { isErasedNumber as markIsErased } from "../marketing/erasure-mark";
import { MAX_TAGS, cleanDisplayName, cleanNotes, tagKey, type ContactDraft } from "./contact-fields";

/* ══ THE CHOICES ════════════════════════════════════════════════════════════════════════════════ */

export const IMPORT_CHOICES = ["KEEP", "TAKE_FILE", "FILL_BLANKS"] as const;
export type ImportChoice = (typeof IMPORT_CHOICES)[number];

/** ⭐ Keep what's in the book. A wrong overwrite has no undo (OD35); a wrong keep is fixed by importing again. */
export const DEFAULT_IMPORT_CHOICE: ImportChoice = "KEEP";

/** Per-row overrides, keyed by the FILE ROW (`line`, 1-based over the unfiltered grid). ⛔ Never an array index. */
export type RowOverrides = Readonly<Record<number, ImportChoice>>;

export const NO_OVERRIDES: RowOverrides = Object.freeze({});

export function isImportChoice(v: unknown): v is ImportChoice {
  return typeof v === "string" && (IMPORT_CHOICES as readonly string[]).includes(v);
}

/** One value per choice, in `IMPORT_CHOICES` order — so no caller spells the choices to build a record. */
export function byEveryChoice<T>(make: (choice: ImportChoice) => T): Record<ImportChoice, T> {
  return Object.fromEntries(IMPORT_CHOICES.map((choice) => [choice, make(choice)])) as Record<ImportChoice, T>;
}

/** ⭐ THE ONE READER OF OVERRIDES: this line's override when it holds a valid choice, else the bulk choice. */
export function effectiveChoice(line: number, bulk: ImportChoice, overrides: RowOverrides): ImportChoice {
  const own = Object.prototype.hasOwnProperty.call(overrides, line) ? (overrides as Record<number, unknown>)[line] : undefined;
  return isImportChoice(own) ? own : bulk;
}

/* ══ THE WIRE: a choice and the overrides, as a request carries them ═════════════════════════════ */

/** A choice from a request, or null. Exactly the three spellings — no case folding, no aliases. */
export function parseImportChoice(raw: unknown): ImportChoice | null {
  return isImportChoice(raw) ? raw : null;
}

/** A line key as a request writes it: a whole number from 1, in its one canonical spelling ("06" is refused, so
 *  two keys can never name the same row). */
const LINE_KEY = /^[1-9][0-9]*$/;

/**
 * Overrides from a request, or null when ANY part is wrong — never a partial object. Refused: anything but a plain
 * object (⛔ an ARRAY is index-keyed by construction), a key that is not a canonical line number (0, 1.5, 06, -1),
 * a value outside the three choices, and — when `knownLines` is given — a line that is not in the file.
 */
export function parseRowOverrides(raw: unknown, knownLines?: ReadonlySet<number>): RowOverrides | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const proto: unknown = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return null;
  const out: Record<number, ImportChoice> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!LINE_KEY.test(key)) return null;
    const line = Number(key);
    if (!Number.isSafeInteger(line)) return null;
    if (knownLines !== undefined && !knownLines.has(line)) return null;
    const choice = parseImportChoice(value);
    if (choice === null) return null;
    out[line] = choice;
  }
  return Object.freeze(out);
}

/* ══ THE PATCH — every key an import may write to an EXISTING row ═══════════════════════════════ */

/** ⛔ The whole list. A key that is not here cannot be expressed by `ImportPatch` (it is derived from this list). */
export const IMPORT_PATCH_KEYS = ["displayName", "email", "notes", "tags"] as const;
export type ImportPatchKey = (typeof IMPORT_PATCH_KEYS)[number];
export type ImportPatch = { -readonly [K in ImportPatchKey]?: K extends "tags" ? string[] : string };

/* ══ THE INPUTS ═════════════════════════════════════════════════════════════════════════════════ */

/**
 * One file row, as decide() reads it: U28's drafted values (`draftContactRow`), the file row's `line`, and the
 * number's `255…` key from `parseTzNumber`'s ok verdict. A staged row (U29) maps onto it structurally.
 */
export type ImportCandidate = Readonly<Pick<ContactDraft, "displayName" | "email" | "notes">> & {
  readonly line: number;
  readonly msisdn: string;
  readonly tags: readonly string[];
};

/** The book row for the number, as decide() reads it. A stored contact row satisfies it structurally. */
export type BookSnapshot = {
  readonly id: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly tags: readonly string[];
  readonly sourceRef: string | null;
  readonly importId: string | null;
  readonly updatedAt: string;
  /** S15-11 · the account the row is linked to (sign-up's fact). Absent, null or empty: not linked. */
  readonly userId?: string | null;
};

/** The number's latest consent-ledger row, as decide() reads it — for X5's consent seam alone. ⛔ Never the erasure:
 *  a later opt-out's WITHDRAWN sits above an erasure marker without lifting it, so "is it erased?" is `erasureStands`. */
export type LedgerWord = { readonly status: "GIVEN" | "WITHDRAWN"; readonly evidence: string | null };

/**
 * What the AUTHORITY says about one number — read by the server, never from a cache: the book row (erased rows
 * included, X22), an ACTIVE suppression, the latest ledger row, whether an erasure stands on the number, and whether a
 * player account holds the number.
 */
export type NumberFacts = {
  readonly book: BookSnapshot | null;
  readonly suppressed: boolean;
  readonly ledgerLatest: LedgerWord | null;
  /** ⛔ C8a · whether an erasure STANDS on the number by its ledger — the ONE rule (`erasure-mark.ts`,
   *  `erasureStandsOn`: the latest GIVEN-or-marker row is a marker), read by the server for every number in ONE grouped
   *  read (`messagingConsent.erasureStandsAmong`). decide() reads it only when there is NO book row: a book row decides
   *  alone (`isErasedNumber`). */
  readonly erasureStands: boolean;
  /** ⚠️ The server's loader no longer asks the accounts (S15, 2026-10-09: S15-1 retired the consent seam this fed, X5),
   *  so it answers false there; decide() still honours it for a caller that sets it. A book row's own link is
   *  `book.userId` (S15-11), which IS read. */
  readonly heldByPlayer: boolean;
};

/** The facts for one ROW: the number's facts plus the line of an EARLIER row of this run with the same number. */
export type DecideFacts = NumberFacts & { readonly repeatOf: number | null };

/** The authority's facts, keyed by the `255…` number. */
export type FactsByNumber = ReadonlyMap<string, NumberFacts>;

/* ══ THE ONE OUTCOME UNION (X4) — the row column, U32's sentences and U31's copy all read it ════════ */

export const IMPORT_OUTCOMES = ["create", "update", "keep", "fail"] as const;
export type ImportOutcome = (typeof IMPORT_OUTCOMES)[number];

export const IMPORT_OUTCOME_REASONS = [
  "chosen_keep", "erased", "suppressed", "account", "same_run", "no_change", "write_refused", "changed_during_import", "invalid",
] as const;
export type ImportOutcomeReason = (typeof IMPORT_OUTCOME_REASONS)[number];

/**
 * Which outcome each reason belongs to — complete by construction. `changed_during_import` is U32's re-decided
 * conflict, kept (E9: never failed); `write_refused` is a write the database refused twice; `invalid` is a row
 * that could not be read or carries a field problem (U30's invalid bucket, X20). ⛔ A keep is never a fail.
 */
export const IMPORT_OUTCOME_OF_REASON: Readonly<Record<ImportOutcomeReason, "keep" | "fail">> = {
  chosen_keep: "keep",
  erased: "keep",
  suppressed: "keep",
  account: "keep",
  same_run: "keep",
  no_change: "keep",
  changed_during_import: "keep",
  write_refused: "fail",
  invalid: "fail",
};

/** The keep reasons decide() itself returns (the other three belong to the commit and the read). */
export const DECIDE_KEEP_REASONS = ["chosen_keep", "erased", "suppressed", "account", "same_run", "no_change"] as const satisfies readonly ImportOutcomeReason[];
export type DecideKeepReason = (typeof DECIDE_KEEP_REASONS)[number];

/**
 * The keep reasons a browser may be told (X22). ⛔ Never `erased`, and never a fold of it into one fixed reason: an
 * erased row reads as the ordinary contact it is disguised as, which depends on the choice, the stop and the run it
 * was decided under — so the decision itself carries its browser face (`shown`), and nothing folds a reason alone.
 * `account` (S15-11) is shown as itself — only a viewer who may read numbers ever sees a reason split (S15-10).
 */
export const SHOWN_KEEP_REASONS = ["chosen_keep", "suppressed", "account", "same_run", "no_change"] as const satisfies readonly DecideKeepReason[];
export type ShownKeepReason = (typeof SHOWN_KEEP_REASONS)[number];

/** A stored reason read back (U29's text column), or null. */
export function parseImportOutcomeReason(raw: unknown): ImportOutcomeReason | null {
  return typeof raw === "string" && (IMPORT_OUTCOME_REASONS as readonly string[]).includes(raw) ? (raw as ImportOutcomeReason) : null;
}

/** A row's outcome column pair. */
export type ImportRowOutcome = { readonly outcome: ImportOutcome; readonly reason: ImportOutcomeReason | null };

/** Is this pair writable to a row? create/update carry no reason; keep and fail carry one of THEIR reasons. */
export function isImportOutcomeRow(outcome: unknown, reason: unknown): boolean {
  if (outcome === "create" || outcome === "update") return reason === null;
  if (outcome !== "keep" && outcome !== "fail") return false;
  const r = parseImportOutcomeReason(reason);
  return r !== null && IMPORT_OUTCOME_OF_REASON[r] === outcome;
}

/* ══ THE DECISION ═══════════════════════════════════════════════════════════════════════════════ */

/** One value an update replaces. ⛔ Email and notes are NAMED, never their values (email is identity.contact). */
export type OverwriteLine =
  | { readonly field: "displayName"; readonly from: string; readonly to: string }
  | { readonly field: "email" | "notes" };

export type ImportDecision =
  | {
      readonly kind: "create";
      readonly line: number;
      /** ⭐ X5: no ledger row, no active stop, no player. U33's basis write may run for this row and no other. */
      readonly consentWritable: boolean;
    }
  | {
      readonly kind: "update";
      readonly line: number;
      readonly contactId: string;
      readonly asked: ImportChoice;
      readonly patch: ImportPatch;
      readonly overwrites: readonly OverwriteLine[];
      readonly tagsAdded: readonly string[];
      readonly tagsNotAdded: readonly string[];
      /** The write is conditional on this (X3): a row that moved since it was read is re-decided, never overwritten. */
      readonly guard: { readonly updatedAt: string };
    }
  | {
      readonly kind: "keep";
      readonly line: number;
      readonly contactId: string | null;
      readonly asked: ImportChoice;
      /** The server's truth (X4): the row column and U32's sentences. */
      readonly reason: DecideKeepReason;
      /**
       * ⛔ X22 · what a browser may be told: `reason` itself, except for an erased row — the reason the ordinary contact
       * it is disguised as would get (steps 2–5 over a contact holding exactly the file's values). Previews and
       * `shownTally` read this, never `reason`; a browser-facing read of a stored row (U32) must carry it the same way.
       */
      readonly shown: ShownKeepReason;
      /** File tags a full contact could not take (non-empty only for a `no_change` keep). */
      readonly tagsNotAdded: readonly string[];
    };

/** The row column for a decision (X4). */
export function outcomeOf(d: ImportDecision): ImportRowOutcome {
  return d.kind === "keep" ? { outcome: "keep", reason: d.reason } : { outcome: d.kind, reason: null };
}

/* ── the stored form of each text field: what "blank" and "different" are measured on ─────────────── */

type TextField = "displayName" | "email" | "notes";
const TEXT_FIELDS: readonly TextField[] = ["displayName", "email", "notes"];

/**
 * ⭐ ONE RULE PER FIELD, applied to BOTH sides — the file's cells already went through the same rule in
 * `draftContactRow`, so a value is "different" only when the book would store something else. The name and the notes
 * go through U28's own cleaners (⛔ never a second normaliser here: one that only unified line endings and trimmed
 * read a book note holding a zero-width space as changed, and TAKE_FILE then "replaced" identical visible text); the
 * email is trimmed and lower-cased, as `draftContactRow` writes it.
 */
const STORED_FORM: Readonly<Record<TextField, (v: string) => string | null>> = {
  displayName: (v) => cleanDisplayName(v),
  email: (v) => {
    const t = v.trim().toLowerCase();
    return t === "" ? null : t;
  },
  notes: (v) => cleanNotes(v),
};

/** The stored form, or null for blank. */
function storedForm(field: TextField, v: string | null | undefined): string | null {
  return v == null ? null : STORED_FORM[field](String(v));
}

/* ── tags ─────────────────────────────────────────────────────────────────────────────────────────── */

export type TagMerge = {
  /** The book's tags in their STORED form (`tagKey`, de-duplicated, empties dropped), then each new file tag. */
  readonly tags: string[];
  readonly added: string[];
  /** New file tags that did not fit under `max` — listed, never silently dropped. */
  readonly notAdded: string[];
};

/**
 * ⭐ C11/X21: the book's tags in their stored form, then every file tag whose `tagKey` the book does not already hold —
 * in file order, de-duplicated, empties dropped — until the contact holds `max` tags. Tags are added, never removed.
 * ⛔ C11 binds EVERY writer, the import included: a patch that writes tags writes the book's legacy spellings back
 * lower case and once (`VIP`, `vip` → `vip`). A row that gains no tag writes no tags (`added` is empty), so a legacy
 * row with nothing to change is never rewritten.
 */
export function mergeTags(book: readonly string[], file: readonly string[], max: number = MAX_TAGS): TagMerge {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const raw of book) {
    const tag = tagKey(raw);
    if (tag === "" || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  const added: string[] = [];
  const notAdded: string[] = [];
  for (const raw of file) {
    const tag = tagKey(raw);
    if (tag === "" || seen.has(tag)) continue;
    seen.add(tag);
    if (tags.length >= max) notAdded.push(tag);
    else {
      tags.push(tag);
      added.push(tag);
    }
  }
  return { tags, added, notAdded };
}

type Change = { patch: ImportPatch; overwrites: OverwriteLine[]; tagsAdded: string[]; tagsNotAdded: string[] };

/** TAKE_FILE: every non-blank file value that differs replaces the book's; a blank cell is skipped; tags merge. */
function takeFile(c: ImportCandidate, book: BookSnapshot): Change {
  const patch: ImportPatch = {};
  const overwrites: OverwriteLine[] = [];
  for (const field of TEXT_FIELDS) {
    const to = storedForm(field, c[field]);
    if (to === null) continue; // ⛔ a blank file cell never blanks a book value
    const from = storedForm(field, book[field]);
    if (from === to) continue;
    patch[field] = to;
    if (from !== null) overwrites.push(field === "displayName" ? { field, from, to } : { field });
  }
  const merged = mergeTags(book.tags, c.tags);
  if (merged.added.length > 0) patch.tags = merged.tags;
  return { patch, overwrites, tagsAdded: merged.added, tagsNotAdded: merged.notAdded };
}

/** FILL_BLANKS: only a blank book field takes the file's value; tags only when the book holds none. */
function fillBlanks(c: ImportCandidate, book: BookSnapshot): Change {
  const patch: ImportPatch = {};
  for (const field of TEXT_FIELDS) {
    if (storedForm(field, book[field]) !== null) continue; // ⛔ a filled book field is never touched
    const to = storedForm(field, c[field]);
    if (to !== null) patch[field] = to;
  }
  const bookHasTags = book.tags.some((t) => tagKey(t) !== "");
  const merged = bookHasTags ? null : mergeTags([], c.tags);
  if (merged !== null && merged.added.length > 0) patch.tags = merged.tags;
  return { patch, overwrites: [], tagsAdded: merged?.added ?? [], tagsNotAdded: merged?.notAdded ?? [] };
}

/**
 * 1 · ⛔ Is the number ERASED (C3)? Its book row carries the mark, or there is no row and an erasure stands on the number
 * (owner decision 4; C8a's ONE rule — a later opt-out never lifts it, a GIVEN does). A book row the erasure did not empty
 * is an ordinary row, whatever its ledger. ⭐ ONE READING: this asks `erasure-mark.ts`'s `isErasedNumber`, the very
 * function the Add form's lookup and save ask, so what the importer keeps as erased can never be added by hand.
 */
function isErasedNumber(f: NumberFacts): boolean {
  return markIsErased(f.book, f.erasureStands);
}

type StandingReason = "suppressed" | "account" | "same_run" | "chosen_keep";

/** S15-11 · is this book row linked to an account? A link is sign-up's fact (`userId`); absent, null or empty is not. */
function isLinkedRow(book: BookSnapshot): boolean {
  return typeof book.userId === "string" && book.userId !== "";
}

/**
 * 2–4 · What holds a row in the book whatever its values: an ACTIVE stop, an account's link (2b), this run's earlier
 * claim on the number, or the KEEP choice — or null, when the values decide (5). ONE function for an ordinary row and
 * for the contact an erased row is disguised as (X22), so the two cannot drift apart — the disguise is an ordinary,
 * UNLINKED contact, so its caller passes `linked` false. ⛔ Never for a NEW number: that is created on the stop list
 * (owner decision 5) and under every choice.
 */
function standingKeep(f: DecideFacts, importId: string | null, linked: boolean, asked: ImportChoice, runId: string): StandingReason | null {
  if (f.suppressed) return "suppressed"; // 2
  if (linked) return "account"; // 2b · S15-11
  if (importId === runId || f.repeatOf !== null) return "same_run"; // 3
  if (asked === "KEEP") return "chosen_keep"; // 4
  return null;
}

/**
 * ⭐ THE RULE. See the header for the order of the collapses. Pure: the same row, facts and choice give the same
 * decision, and nothing is read from anywhere else.
 */
export function decide(
  c: ImportCandidate,
  f: DecideFacts,
  bulk: ImportChoice,
  overrides: RowOverrides,
  runId: string,
): ImportDecision {
  // ⛔ The same-run rule keys on the run id: an empty one would silently never match.
  if (typeof runId !== "string" || runId === "") throw new Error("decide: the run id is required");
  const asked = effectiveChoice(c.line, bulk, overrides);
  const book = f.book;
  const keep = (reason: DecideKeepReason, shown: ShownKeepReason, tagsNotAdded: readonly string[] = []): ImportDecision => ({
    kind: "keep", line: c.line, contactId: book === null ? null : book.id, asked, reason, shown, tagsNotAdded,
  });

  // 1 · ⛔ erased — beats everything, the override included. Its browser face is the ordinary (unlinked) contact holding
  //     exactly the file's values: 2–4 as for any row, else an empty patch (5) — never a reason of its own (X22).
  if (isErasedNumber(f)) return keep("erased", standingKeep(f, book === null ? null : book.importId, false, asked, runId) ?? "no_change");
  if (book === null) {
    // 3 · an earlier line of this run carries the number — the first row creates it.
    if (f.repeatOf !== null) return keep("same_run", "same_run");
    // ⭐ X5 — the ONE consent seam, and the stricter of the two predicates the specs held.
    return { kind: "create", line: c.line, consentWritable: f.ledgerLatest === null && !f.suppressed && !f.heldByPlayer };
  }

  const standing = standingKeep(f, book.importId, isLinkedRow(book), asked, runId); // 2 · 2b · 3 · 4
  if (standing !== null) return keep(standing, standing);
  const change = asked === "TAKE_FILE" ? takeFile(c, book) : fillBlanks(c, book);
  if (Object.keys(change.patch).length === 0) return keep("no_change", "no_change", change.tagsNotAdded); // 5
  return {
    kind: "update",
    line: c.line,
    contactId: book.id,
    asked,
    patch: change.patch,
    overwrites: change.overwrites,
    tagsAdded: change.tagsAdded,
    tagsNotAdded: change.tagsNotAdded,
    guard: { updatedAt: book.updatedAt },
  };
}

/* ══ A FILE OF ROWS ═════════════════════════════════════════════════════════════════════════════ */

/**
 * A staged row as the first-row rule reads it: its file row, its `255…` key and what would keep it from being
 * decided. An `ImportCandidate` is one; so is U29's staged row, with its `readError` (X19) and its draft's
 * `problems` (X20).
 */
export type FirstLineRow = {
  readonly line: number;
  /** Null when the number did not parse. */
  readonly msisdn: string | null;
  /** U28's draft problems (X20): a row with any is U30's `invalid` bucket and is never decided. */
  readonly problems?: readonly unknown[];
  /** X19: the record could not be read. */
  readonly readError?: string | null;
};

/** A row decide() will see: a parsed number, no draft problem, no read error. */
function isDecidable(r: FirstLineRow): r is FirstLineRow & { readonly msisdn: string } {
  return typeof r.msisdn === "string" && r.msisdn !== ""
    && (r.problems === undefined || r.problems.length === 0)
    && (r.readError === undefined || r.readError === null);
}

/**
 * ⭐ The FIRST line of every number (OD33) — the smallest line among the run's DECIDABLE rows, whatever order they
 * arrive in. Pass it EVERY staged row of the WHOLE run: U30 and U32 work per staged batch, and a map built over one
 * batch reads a repeat whose first row sits in an earlier batch as a first row. ⛔ An invalid or unreadable row never
 * claims a number: a bad email on the first occurrence would otherwise keep every valid repeat as `same_run`, and
 * the number would never be imported.
 */
export function firstLines(rows: readonly FirstLineRow[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const r of rows) {
    if (!isDecidable(r)) continue;
    const seen = first.get(r.msisdn);
    if (seen === undefined || r.line < seen) first.set(r.msisdn, r.line);
  }
  return first;
}

/** ⛔ The whole run's map is REQUIRED (OD33): a missing one THROWS, never defaults to the rows at hand. */
function requireFirstLines(first: unknown): ReadonlyMap<string, number> {
  if (first instanceof Map) return first;
  throw new Error(
    "import-decide: the first line of every number across the WHOLE run is required — build it with firstLines() over every staged row of the run",
  );
}

/** The earlier line of this run with the same number, or null for the first row. */
export function repeatOf(c: ImportCandidate, first: ReadonlyMap<string, number>): number | null {
  const at = first.get(c.msisdn);
  return at !== undefined && at < c.line ? at : null;
}

/** ⛔ A number with no facts THROWS: a default would call an in-book number new. The message names the row, never
 *  the number (a server log is not the place for one). */
function factsFor(c: ImportCandidate, facts: FactsByNumber, first: ReadonlyMap<string, number>): DecideFacts {
  const f = facts.get(c.msisdn);
  if (f === undefined) throw new Error(`import-decide: no facts were loaded for the number on row ${c.line}`);
  return { ...f, repeatOf: repeatOf(c, first) };
}

/**
 * decide() over rows, with the overrides and the first-row rule — the shape U32's commit runs per batch.
 * ⛔ `first` is REQUIRED and is the WHOLE run's map (`firstLines` over every staged row of the run), never this
 * batch's: without it an in-book number repeated across two batches would be written twice, the last row winning.
 */
export function decideRows(
  candidates: readonly ImportCandidate[],
  facts: FactsByNumber,
  bulk: ImportChoice,
  overrides: RowOverrides,
  runId: string,
  first: ReadonlyMap<string, number>,
): ImportDecision[] {
  const whole = requireFirstLines(first);
  return candidates.map((c) => decide(c, factsFor(c, facts, whole), bulk, overrides, runId));
}

/* ══ TALLIES — the Apply label's numbers ════════════════════════════════════════════════════════ */

export type Tally<R extends string> = {
  readonly create: number;
  readonly update: number;
  readonly keep: number;
  readonly keepBy: Readonly<Record<R, number>>;
  /** Updates that REPLACE at least one non-blank book value — the overwrite confirmation's count. */
  readonly overwrites: number;
};
/** Server-side truth: `erased` counted on its own. ⛔ Never sent to a browser, and never folded into a `ShownTally`. */
export type DecisionTally = Tally<DecideKeepReason>;
/** What a browser may see (X22): every keep by its decision's `shown` reason. */
export type ShownTally = Tally<ShownKeepReason>;

type MutableTally<R extends string> = { create: number; update: number; keep: number; keepBy: Record<R, number>; overwrites: number };

function zeroTally<R extends string>(reasons: readonly R[]): MutableTally<R> {
  const keepBy = Object.fromEntries(reasons.map((r) => [r, 0])) as Record<R, number>;
  return { create: 0, update: 0, keep: 0, keepBy, overwrites: 0 };
}

type KeepDecision = Extract<ImportDecision, { kind: "keep" }>;

function tallyBy<R extends string>(ds: readonly ImportDecision[], reasons: readonly R[], keyOf: (d: KeepDecision) => R): MutableTally<R> {
  const t = zeroTally(reasons);
  for (const d of ds) {
    if (d.kind === "create") t.create++;
    else if (d.kind === "update") {
      t.update++;
      if (d.overwrites.length > 0) t.overwrites++;
    } else {
      t.keep++;
      t.keepBy[keyOf(d)]++;
    }
  }
  return t;
}

/** Server-side truth: every keep by its own reason, `erased` counted on its own. */
export function tallyDecisions(ds: readonly ImportDecision[]): DecisionTally {
  return tallyBy(ds, DECIDE_KEEP_REASONS, (d) => d.reason);
}

/**
 * ⛔ X22 · the browser's tally: every keep by its `shown` reason, folded PER DECISION, so an erased row counts as the
 * ordinary contact it is disguised as under the choice, stop and run it was decided with. There is deliberately no
 * fold from a `DecisionTally`: a count of `erased` cannot say which of those each erased row was decided under.
 */
export function shownTally(ds: readonly ImportDecision[]): ShownTally {
  return tallyBy(ds, SHOWN_KEEP_REASONS, (d) => d.shown);
}

/** Two tallies summed — U30 plans per staged batch and adds them up. */
export function addTallies<R extends string>(a: Tally<R>, b: Tally<R>): Tally<R> {
  const keepBy = { ...a.keepBy } as Record<R, number>;
  for (const r of Object.keys(b.keepBy) as R[]) keepBy[r] = (keepBy[r] ?? 0) + b.keepBy[r];
  return {
    create: a.create + b.create,
    update: a.update + b.update,
    keep: a.keep + b.keep,
    keepBy,
    overwrites: a.overwrites + b.overwrites,
  };
}

/* ══ PREVIEWS — what the browser may know about one row ═════════════════════════════════════════ */

export type ChoicePreview = {
  readonly kind: "update" | "keep";
  /** Null for an update; for a keep, the decision's `shown` reason (X22). */
  readonly reason: ShownKeepReason | null;
  readonly overwrites: readonly OverwriteLine[];
  readonly tagsAdded: readonly string[];
  readonly tagsNotAdded: readonly string[];
};

/**
 * ⛔ D19 and X22 by shape, and ⛔ NO VARIANT NAMES A CONTACT ID (the file row, `line`, is the only key a browser needs).
 * `create` is `{ line, kind }` and nothing else (no consent, ledger or player fact). `keep` is a row no choice can move —
 * on the stop list or a repeat. `inBook` is a row in the book: its name in the stored form and each choice's outcome.
 * An erased number is previewed EXACTLY as the ordinary contact it is disguised as — one holding the file's own
 * values — so its name is the file's, a stop or a repeat makes it a `keep`, and otherwise it is `inBook` with nothing
 * to change under any choice.
 */
export type DecisionPreview =
  | { readonly line: number; readonly kind: "create" }
  | { readonly line: number; readonly kind: "keep"; readonly reason: ShownKeepReason }
  | {
      readonly line: number;
      readonly kind: "inBook";
      readonly displayName: string | null;
      readonly byChoice: Readonly<Record<ImportChoice, ChoicePreview>>;
    };

function decideEveryChoice(c: ImportCandidate, f: DecideFacts, runId: string): Record<ImportChoice, ImportDecision> {
  return byEveryChoice((choice) => decide(c, f, choice, NO_OVERRIDES, runId));
}

function choicePreview(d: ImportDecision): ChoicePreview {
  if (d.kind === "update") {
    return { kind: "update", reason: null, overwrites: d.overwrites, tagsAdded: d.tagsAdded, tagsNotAdded: d.tagsNotAdded };
  }
  if (d.kind === "keep") {
    return { kind: "keep", reason: d.shown, overwrites: [], tagsAdded: [], tagsNotAdded: d.tagsNotAdded };
  }
  throw new Error("import-decide: a row in the book was decided as a create");
}

function previewOf(c: ImportCandidate, f: DecideFacts, by: Record<ImportChoice, ImportDecision>): DecisionPreview {
  const first = by[IMPORT_CHOICES[0]];
  if (first.kind === "create") return { line: c.line, kind: "create" }; // a create ignores the choice
  if (first.kind === "keep") {
    const shown = first.shown;
    const fixed = IMPORT_CHOICES.every((ch) => {
      const d = by[ch];
      return d.kind === "keep" && d.shown === shown;
    });
    if (fixed) return { line: c.line, kind: "keep", reason: shown };
  }
  // ⛔ X22 · an erased number — with or without its emptied row — is previewed as the contact it is disguised as, so
  // the name shown is the FILE's own, in the stored form an ordinary contact holding the file's values would carry.
  const erased = isErasedNumber(f);
  if (f.book === null && !erased) throw new Error("import-decide: a row outside the book was decided as an update");
  const name = erased ? c.displayName : f.book === null ? null : f.book.displayName;
  return {
    line: c.line,
    kind: "inBook",
    displayName: storedForm("displayName", name),
    byChoice: byEveryChoice((ch) => choicePreview(by[ch])),
  };
}

/** One row's preview under all three choices (no overrides — `adjustTally` applies them). */
export function previewFor(c: ImportCandidate, f: DecideFacts, runId: string): DecisionPreview {
  return previewOf(c, f, decideEveryChoice(c, f, runId));
}

/**
 * ⭐ The label after per-row overrides, with no request: the bulk choice's tally, with each overridden in-book row
 * moved from its bulk outcome to its override's. Equals `shownTally(decideRows(…, bulk, overrides, …))` by
 * construction — `test:contacts-import` §D11 holds it — because each preview's per-choice outcome is that choice's
 * decision, `shown` reason included (an erased row moves between its disguise's outcomes, X22).
 */
export function adjustTally(
  base: Readonly<Record<ImportChoice, ShownTally>>,
  previews: readonly DecisionPreview[],
  bulk: ImportChoice,
  overrides: RowOverrides,
): ShownTally {
  const t = addTallies(zeroTally(SHOWN_KEEP_REASONS), base[bulk]) as MutableTally<ShownKeepReason>;
  const move = (p: ChoicePreview, sign: 1 | -1): void => {
    if (p.kind === "update") {
      t.update += sign;
      if (p.overwrites.length > 0) t.overwrites += sign;
    } else {
      t.keep += sign;
      if (p.reason !== null) t.keepBy[p.reason] += sign;
    }
  };
  for (const p of previews) {
    if (p.kind !== "inBook") continue; // a create or a fixed keep is the same under every choice
    const chosen = effectiveChoice(p.line, bulk, overrides);
    if (chosen === bulk) continue;
    move(p.byChoice[bulk], -1);
    move(p.byChoice[chosen], 1);
  }
  return t;
}

/* ══ THE PLAN — the pre-flight's byChoice and previews (U30), writing nothing ════════════════════ */

export type ImportPlanInput = {
  readonly runId: string;
  readonly candidates: readonly ImportCandidate[];
  /** The authority's facts per number (the server loader, over the bulk keyed reads — X10). ⛔ A number missing
   *  here throws. */
  readonly facts: FactsByNumber;
  /** ⛔ REQUIRED: the first line of every number across the WHOLE run — `firstLines` over every staged row of the
   *  run (it skips the invalid and unreadable ones itself), even when these candidates are one batch of it. A
   *  missing map throws. */
  readonly firstLines: ReadonlyMap<string, number>;
};

export type ImportPlan = {
  /** ⭐ The Apply label for each bulk choice, before any override — decide()'s own decisions, tallied by their
   *  `shown` reasons (X22). */
  readonly byChoice: Readonly<Record<ImportChoice, ShownTally>>;
  readonly previews: readonly DecisionPreview[];
};

/** ⭐ Every number on the label comes from decide(): there is no second route to a count (plan §9 U31 Accept). */
export function planImportRows(input: ImportPlanInput): ImportPlan {
  const first = requireFirstLines(input.firstLines);
  const decided = byEveryChoice((): ImportDecision[] => []);
  const previews: DecisionPreview[] = [];
  for (const c of input.candidates) {
    const f = factsFor(c, input.facts, first);
    const by = decideEveryChoice(c, f, input.runId);
    for (const ch of IMPORT_CHOICES) decided[ch].push(by[ch]);
    previews.push(previewOf(c, f, by));
  }
  return { byChoice: byEveryChoice((ch) => shownTally(decided[ch])), previews };
}
