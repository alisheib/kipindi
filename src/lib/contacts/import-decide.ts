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
 *   1. ⛔ ERASED — the book row's `sourceRef` is `ERASURE_EVIDENCE` (U18b emptied it), or there is no row and the
 *      number's latest ledger word is the erasure withdrawal → keep. Re-importing an old spreadsheet must never
 *      write an erased person's name back (C3, X22).
 *   2. ⛔ ON THE STOP LIST — an ACTIVE suppression (the caller asks `db.suppression.find`, never the book's
 *      `suppressedAt` cache, which no stop or lift maintains) → keep, whatever was asked. A NEW number on the stop
 *      list is still created (owner decision 5): the collapse protects an existing contact, and the send gate
 *      refuses the number either way.
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
 * is no undo, OD35). Different means different in the STORED form: a name through `cleanDisplayName`, an email
 * trimmed and lower-cased, notes with line endings unified and trimmed, tags by `tagKey` as a set (C11, X21). So
 * re-importing what the book already holds is `no_change`, however a spreadsheet re-spaced it. A merge never takes
 * a contact past `MAX_TAGS`: the tags that do not fit are LISTED (`tagsNotAdded`), never silently dropped.
 *
 * ── ⛔ WHAT MAY LEAVE THE SERVER (D19, X22) ──────────────────────────────────────────────────────────────────
 * `ImportDecision` is server-side truth: it carries `consentWritable` and the `erased` reason. The browser gets
 * `DecisionPreview` and `ShownTally` only. A create preview is `{ line, kind }` and nothing more — a per-row consent
 * or player flag is a membership oracle for GROWTH. `erased` is shown as `no_change`, with no contact named:
 * erasure is never disclosed (C3: an erased row is in no reader).
 *
 * Pure and client-safe. It imports `./contact-fields` (the tag rule, the name cleaner, the tag limit) and
 * `../marketing/erasure-mark` (the one mark) and nothing else: no lib/server, no node:, no React, no directive.
 * Guard: `npm run test:contacts-import` (section `decide`) · red: `npm run red:contacts-import`.
 */
import { ERASURE_EVIDENCE } from "../marketing/erasure-mark";
import { MAX_TAGS, cleanDisplayName, tagKey, type ContactDraft } from "./contact-fields";

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
};

/** The number's latest consent-ledger row, as decide() reads it. */
export type LedgerWord = { readonly status: "GIVEN" | "WITHDRAWN"; readonly evidence: string | null };

/**
 * What the AUTHORITY says about one number — read by the server, never from a cache: the book row (erased rows
 * included, X22), an ACTIVE suppression, the latest ledger row, and whether a player account holds the number.
 */
export type NumberFacts = {
  readonly book: BookSnapshot | null;
  readonly suppressed: boolean;
  readonly ledgerLatest: LedgerWord | null;
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
  "chosen_keep", "erased", "suppressed", "same_run", "no_change", "write_refused", "changed_during_import", "invalid",
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
  same_run: "keep",
  no_change: "keep",
  changed_during_import: "keep",
  write_refused: "fail",
  invalid: "fail",
};

/** The keep reasons decide() itself returns (the other three belong to the commit and the read). */
export const DECIDE_KEEP_REASONS = ["chosen_keep", "erased", "suppressed", "same_run", "no_change"] as const satisfies readonly ImportOutcomeReason[];
export type DecideKeepReason = (typeof DECIDE_KEEP_REASONS)[number];

/** The keep reasons the browser may see: `erased` is folded into `no_change` (X22). */
export const SHOWN_KEEP_REASONS = ["chosen_keep", "suppressed", "same_run", "no_change"] as const satisfies readonly DecideKeepReason[];
export type ShownKeepReason = (typeof SHOWN_KEEP_REASONS)[number];

/** ⛔ X22 · erasure is never disclosed: an erased row reads as "nothing to change" anywhere a browser looks. */
export function shownKeepReason(reason: DecideKeepReason): ShownKeepReason {
  return reason === "erased" ? "no_change" : reason;
}

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
      readonly reason: DecideKeepReason;
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
const LINE_ENDINGS = /\r\n?/g;
const LF = String.fromCharCode(10);

const STORED_FORM: Readonly<Record<TextField, (v: string) => string | null>> = {
  displayName: (v) => cleanDisplayName(v),
  email: (v) => {
    const t = v.trim().toLowerCase();
    return t === "" ? null : t;
  },
  notes: (v) => {
    const t = v.replace(LINE_ENDINGS, LF).trim();
    return t === "" ? null : t;
  },
};

/** The stored form, or null for blank. */
function storedForm(field: TextField, v: string | null | undefined): string | null {
  return v == null ? null : STORED_FORM[field](String(v));
}

/* ── tags ─────────────────────────────────────────────────────────────────────────────────────────── */

export type TagMerge = {
  /** The book's tags exactly as stored (⛔ never rewritten), then each new file tag in its stored form. */
  readonly tags: string[];
  readonly added: string[];
  /** New file tags that did not fit under `max` — listed, never silently dropped. */
  readonly notAdded: string[];
};

/**
 * ⭐ C11/X21: the book's tags, then every file tag whose `tagKey` the book does not already hold — in file order,
 * de-duplicated, empties dropped — until the contact holds `max` tags. Tags are added, never removed.
 */
export function mergeTags(book: readonly string[], file: readonly string[], max: number = MAX_TAGS): TagMerge {
  const tags = [...book];
  const seen = new Set(book.map(tagKey));
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
  const keep = (contactId: string | null, reason: DecideKeepReason, tagsNotAdded: readonly string[] = []): ImportDecision => ({
    kind: "keep", line: c.line, contactId, asked, reason, tagsNotAdded,
  });

  const book = f.book;
  if (book === null) {
    // 1 · ⛔ erased, and the row itself is gone: the ledger's last word is the erasure withdrawal (owner decision 4).
    if (f.ledgerLatest !== null && f.ledgerLatest.status === "WITHDRAWN" && f.ledgerLatest.evidence === ERASURE_EVIDENCE) {
      return keep(null, "erased");
    }
    // 3 · an earlier line of this run carries the number — the first row creates it.
    if (f.repeatOf !== null) return keep(null, "same_run");
    // ⭐ X5 — the ONE consent seam, and the stricter of the two predicates the specs held.
    return { kind: "create", line: c.line, consentWritable: f.ledgerLatest === null && !f.suppressed && !f.heldByPlayer };
  }

  if (book.sourceRef === ERASURE_EVIDENCE) return keep(book.id, "erased"); // 1
  if (f.suppressed) return keep(book.id, "suppressed"); // 2
  if (book.importId === runId || f.repeatOf !== null) return keep(book.id, "same_run"); // 3
  if (asked === "KEEP") return keep(book.id, "chosen_keep"); // 4
  const change = asked === "TAKE_FILE" ? takeFile(c, book) : fillBlanks(c, book);
  if (Object.keys(change.patch).length === 0) return keep(book.id, "no_change", change.tagsNotAdded); // 5
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
 * The FIRST line of every number (OD33) — the smallest line, whatever order the rows arrive in. U30 and U32 work
 * per staged batch, so they pass this map built over the WHOLE run's (line, msisdn) pairs; otherwise a repeat whose
 * first row sits in an earlier batch would read as a first row.
 */
export function firstLines(rows: readonly { readonly line: number; readonly msisdn: string }[]): Map<string, number> {
  const first = new Map<string, number>();
  for (const r of rows) {
    const seen = first.get(r.msisdn);
    if (seen === undefined || r.line < seen) first.set(r.msisdn, r.line);
  }
  return first;
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

/** decide() over rows, with the overrides and the first-row rule — the shape U32's commit runs per batch. */
export function decideRows(
  candidates: readonly ImportCandidate[],
  facts: FactsByNumber,
  bulk: ImportChoice,
  overrides: RowOverrides,
  runId: string,
  first: ReadonlyMap<string, number> = firstLines(candidates),
): ImportDecision[] {
  return candidates.map((c) => decide(c, factsFor(c, facts, first), bulk, overrides, runId));
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
/** Server-side truth: `erased` counted on its own. */
export type DecisionTally = Tally<DecideKeepReason>;
/** What a browser may see (X22). */
export type ShownTally = Tally<ShownKeepReason>;

type MutableTally<R extends string> = { create: number; update: number; keep: number; keepBy: Record<R, number>; overwrites: number };

function zeroTally<R extends string>(reasons: readonly R[]): MutableTally<R> {
  const keepBy = Object.fromEntries(reasons.map((r) => [r, 0])) as Record<R, number>;
  return { create: 0, update: 0, keep: 0, keepBy, overwrites: 0 };
}

export function tallyDecisions(ds: readonly ImportDecision[]): DecisionTally {
  const t = zeroTally(DECIDE_KEEP_REASONS);
  for (const d of ds) {
    if (d.kind === "create") t.create++;
    else if (d.kind === "update") {
      t.update++;
      if (d.overwrites.length > 0) t.overwrites++;
    } else {
      t.keep++;
      t.keepBy[d.reason]++;
    }
  }
  return t;
}

/** ⛔ X22 · the truth folded for a browser: `erased` joins `no_change`. */
export function shownTally(t: DecisionTally): ShownTally {
  const out = zeroTally(SHOWN_KEEP_REASONS);
  out.create = t.create;
  out.update = t.update;
  out.keep = t.keep;
  out.overwrites = t.overwrites;
  for (const r of DECIDE_KEEP_REASONS) out.keepBy[shownKeepReason(r)] += t.keepBy[r];
  return out;
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
  /** Null for an update. */
  readonly reason: ShownKeepReason | null;
  readonly overwrites: readonly OverwriteLine[];
  readonly tagsAdded: readonly string[];
  readonly tagsNotAdded: readonly string[];
};

/**
 * ⛔ D19 and X22 by shape. `create` is `{ line, kind }` and nothing else (no consent, ledger or player fact). `keep` is
 * a row no choice can move — erased (shown as `no_change`), on the stop list or a repeat — and names no contact.
 * Only `inBook`, a row the choice DOES move, names the contact, the book's name and each choice's outcome.
 */
export type DecisionPreview =
  | { readonly line: number; readonly kind: "create" }
  | { readonly line: number; readonly kind: "keep"; readonly reason: ShownKeepReason }
  | {
      readonly line: number;
      readonly kind: "inBook";
      readonly contactId: string;
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
    return { kind: "keep", reason: shownKeepReason(d.reason), overwrites: [], tagsAdded: [], tagsNotAdded: d.tagsNotAdded };
  }
  throw new Error("import-decide: a row in the book was decided as a create");
}

function previewOf(c: ImportCandidate, f: DecideFacts, by: Record<ImportChoice, ImportDecision>): DecisionPreview {
  const first = by[IMPORT_CHOICES[0]];
  if (first.kind === "create") return { line: c.line, kind: "create" }; // a create ignores the choice
  if (first.kind === "keep") {
    const reason = first.reason;
    const fixed = IMPORT_CHOICES.every((ch) => {
      const d = by[ch];
      return d.kind === "keep" && d.reason === reason;
    });
    if (fixed || f.book === null) return { line: c.line, kind: "keep", reason: shownKeepReason(reason) };
  }
  if (f.book === null) throw new Error("import-decide: a row outside the book was decided as an update");
  return {
    line: c.line,
    kind: "inBook",
    contactId: f.book.id,
    displayName: f.book.displayName,
    byChoice: byEveryChoice((ch) => choicePreview(by[ch])),
  };
}

/** One row's preview under all three choices (no overrides — `adjustTally` applies them). */
export function previewFor(c: ImportCandidate, f: DecideFacts, runId: string): DecisionPreview {
  return previewOf(c, f, decideEveryChoice(c, f, runId));
}

/**
 * ⭐ The label after per-row overrides, with no request: the bulk choice's tally, with each overridden in-book row
 * moved from its bulk outcome to its override's. Equals `shownTally(tallyDecisions(decideRows(…, bulk, overrides)))`
 * by construction — `test:contacts-import` §D11 holds it.
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
  /** The first line of every number across the WHOLE run, when these candidates are one batch of it. Default:
   *  built from these candidates. */
  readonly firstLines?: ReadonlyMap<string, number>;
};

export type ImportPlan = {
  /** ⭐ The Apply label for each bulk choice, before any override — decide()'s own tally, shown-folded. */
  readonly byChoice: Readonly<Record<ImportChoice, ShownTally>>;
  readonly previews: readonly DecisionPreview[];
};

/** ⭐ Every number on the label comes from decide(): there is no second route to a count (plan §9 U31 Accept). */
export function planImportRows(input: ImportPlanInput): ImportPlan {
  const first = input.firstLines ?? firstLines(input.candidates);
  const decided = byEveryChoice((): ImportDecision[] => []);
  const previews: DecisionPreview[] = [];
  for (const c of input.candidates) {
    const f = factsFor(c, input.facts, first);
    const by = decideEveryChoice(c, f, input.runId);
    for (const ch of IMPORT_CHOICES) decided[ch].push(by[ch]);
    previews.push(previewOf(c, f, by));
  }
  return { byChoice: byEveryChoice((ch) => shownTally(tallyDecisions(decided[ch]))), previews };
}
