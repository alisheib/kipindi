/**
 * THE IMPORT DIALOG'S WORDS, in ONE place (S15 · C3–C5, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4.2).
 *
 * ⭐ EVERY ENGLISH SENTENCE THE DIALOG SAYS ITSELF lives here; a refusal is the SERVER's sentence (import-flow.ts'
 * `IMPORT_REFUSAL_SENTENCES`, staging's own), shown verbatim beside the next step as a control — never a code. A file's
 * own notes and refusals are its reader's (import-parse.ts, vcard.ts, xlsx-limits.ts, import-read.ts).
 * ⭐ A FIGURE IS A PART, NEVER PASTED INTO A STRING: a sentence that carries numbers is a list of `Part`s, so the panels
 * draw each figure in its own `.amount` span (mono, tabular, one unbreakable unit) with the spaces OUTSIDE it, and
 * `partsText` gives the same sentence as plain text for `aria-valuetext` — one source for what is painted and what is read.
 * ⛔ ADMIN CHROME IS ENGLISH (§5.13); no sentence quotes a cell, a number or a name from the file (§5.14).
 * ⛔ THE CHOICES ARE NAMED BY THE ONE LIST (`IMPORT_CHOICES`, import-decide.ts): this file keys its copy by them and spells
 * none in quotes (`test:contacts-import` §D10 holds one rule).
 */
import { formatNumber } from "@/lib/utils";
import type { ImportChoice, ShownKeepReason } from "@/lib/contacts/import-decide";
import type { PreflightBucket } from "@/lib/contacts/import-flow";
import { formatFileSize, XLSX_MAX_BYTES } from "@/lib/contacts/xlsx-limits";

/* ══ PARTS — a sentence with figures in it ═══════════════════════════════════════════════════════ */

/** A piece of a sentence: words, or a figure drawn as one `.amount` unit. */
export type Part = string | { readonly n: number };
export const fig = (n: number): Part => ({ n });
/** The sentence as plain text — for `aria-valuetext` and a toast. */
export function partsText(parts: readonly Part[]): string {
  return parts.map((p) => (typeof p === "string" ? p : formatNumber(p.n))).join("");
}
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/* ══ THE BUTTON AND THE DIALOG ════════════════════════════════════════════════════════════════════ */

export const IMPORT_BUTTON = "Import contacts";
export const IMPORT_EYEBROW = "Contacts";

/** The dialog's heading in each part of the journey. */
export const IMPORT_TITLES = {
  start: "Import contacts",
  adopt: "An import isn't finished",
  mapping: "The columns",
  check: "Check before importing",
  importing: "Importing contacts",
  paused: "Import paused",
  done: "Import finished",
  cancelled: "Import cancelled",
  problem: "Import contacts",
} as const;

/** The step line under the heading — where the officer is, out of how many. */
export const IMPORT_STEPS = ["Choose a file", "The columns", "Check", "Import"] as const;
export const stepLine = (index: number): string => `Step ${index + 1} of ${IMPORT_STEPS.length} · ${IMPORT_STEPS[index] ?? ""}`;

export const IMPORT_CLOSE = "Close";
export const IMPORT_RELOAD = "Reload the page";
export const IMPORT_TRY_AGAIN = "Try again";

/* ══ FAULTS — said in the panel where they happened, each with its next step ══════════════════════ */

export const IMPORT_FAULT = "Something went wrong while talking to the server. Nothing was lost — try again.";
/** ⭐ The deploy-skew sentence (S15 brief): the page holds an old build's actions; the server holds the run's progress. */
export const IMPORT_SKEW = "The platform was updated — reload this page to resume.";
export const IMPORT_SKEW_DETAIL = "Your import's progress is kept on the server. After the reload, open Import contacts and it carries on from where it stopped.";
export const IMPORT_GONE = "This import no longer exists. Start again from the file.";
export const IMPORT_START_AGAIN = "Start again";
export const IMPORT_STALLED = "The import stopped moving. Nothing is lost — resume it to carry on from where it stopped.";
export const IMPORT_CONNECTION = "The connection dropped. Nothing is lost — the import stopped where the server last counted. Resume to carry on.";
export const IMPORT_OPENING = "Looking for an import that isn't finished…";

/* ══ THE ENTRANCE (step 1) ═══════════════════════════════════════════════════════════════════════ */

export const ENTRANCE = {
  lead: "Choose the file that holds the contacts, or paste them.",
  drop: "Drop a file here, or",
  choose: "Choose a file",
  fileLabel: "Contacts file",
  reads: "Excel (.xlsx) · CSV with any separator · a phone's contacts (.vcf) from iPhone, Android or Google",
  limits: `An Excel file can be up to ${formatFileSize(XLSX_MAX_BYTES)}; a CSV or a contacts file has no size limit.`,
  cannot: "Old Excel files (.xls), OpenDocument (.ods), Apple Numbers, PDFs and pictures can't be read — save the list as .xlsx or CSV first.",
  pasteOpen: "Paste instead",
  pasteClose: "Choose a file instead",
  pasteLabel: "Paste the contacts",
  pasteHint: "Copy cells from Excel or Google Sheets, or a list from a chat — one contact per line. The first phone number on each line is read.",
  pasteRead: "Read the pasted text",
  pasteEmpty: "Paste some contacts first.",
  sampleLead: "Not sure how to lay the file out?",
  readingLabel: "Reading the file",
  reading: (rows: number): Part[] => [fig(rows), ` ${plural(rows, "row", "rows")} read so far`],
  readingStop: "Stop reading",
  xlsx: "Reading the Excel file on the server…",
  xlsxGarbled: "The server's reading of this workbook didn't arrive in one piece. Choose the file again.",
  empty: "This file has no contacts in it. Choose the file that holds the contacts.",
  guardBody: "A file is being read or a paste is waiting. Leaving now discards it — nothing has been imported.",
} as const;

/** The entrance when an unfinished upload is being carried on: the same file must be chosen again. */
export const RESUME_FILE = {
  lead: (name: string | null, nextRow: number): Part[] => [
    name === null ? "Paste the same text again" : `Choose ${name} again`,
    " — it is read again here, and the upload carries on from row ",
    fig(nextRow),
    ".",
  ],
  wrong: "This isn't the file this import was started with, so the upload can't carry on from it. Choose the same file, or discard the unfinished import and start over.",
  differently: "This file now reads differently than when its import began, so the upload can't carry on from it. Discard the unfinished import and start over.",
  discard: "Discard the unfinished import",
} as const;

/* ══ AN UNFINISHED IMPORT, FOUND ON OPEN ══════════════════════════════════════════════════════════ */

export const ADOPT = {
  lead: "Nothing is lost when a tab closes, the page reloads or the platform is updated — carry on, or stop it here.",
  startedBy: (who: string, when: string): string => (who === "you" ? `Started by you ${when}.` : `Started by ${who} ${when}.`),
  file: (name: string | null): string => (name === null ? "Pasted contacts" : name),
  staging: (staged: number, total: number): Part[] => [
    "Uploading stopped after ", fig(staged), " of ", fig(total), ` ${plural(total, "row", "rows")}. Nothing is in the contact book yet.`,
  ],
  staged: (total: number): Part[] => [
    "All ", fig(total), ` ${plural(total, "row is", "rows are")} uploaded and waiting to be checked. Nothing is in the contact book yet.`,
  ],
  committing: (done: number, total: number): Part[] => [fig(done), " of ", fig(total), ` ${plural(total, "row", "rows")} done.`],
  paused: (who: string, when: string): string => (who === "you" ? `Paused by you ${when}.` : `Paused by ${who} ${when}.`),
  resume: "Resume",
  discard: "Discard",
  cancelRest: "Cancel the rest",
} as const;

/* ══ THE COLUMNS (step 2) ═════════════════════════════════════════════════════════════════════════ */

export const MAPPING = {
  lead: "Check what each column will be read as. Change any that are wrong.",
  summary: (rows: number, name: string | null): Part[] => [
    fig(rows), ` ${plural(rows, "row", "rows")} read from `, name === null ? "the pasted text" : name, ".",
  ],
  blank: (n: number): Part[] => [fig(n), ` blank ${plural(n, "row was", "rows were")} skipped.`],
  unreadable: (n: number): Part[] => [fig(n), ` ${plural(n, "record", "records")} couldn't be read — the check lists ${plural(n, "it", "them")} with ${plural(n, "its row", "their rows")}.`],
  headerless: (letter: string): string =>
    `Your file starts with a contact, not column names — column ${letter} will be read as the phone number, and row 1 is imported too.`,
  headerlessNoPhone: "Your file starts with a contact, not column names. Choose the column that holds the phone numbers.",
  firstRowContact: "The first row is a contact, not column names",
  vcard: "A contacts file is read card by card: the name, the mobile number, the email, the groups as tags, and the note.",
  notesHeading: "About this file",
  colColumn: "Column",
  colValues: "First values",
  colReadAs: "Read as",
  notUsed: "Not used",
  noValues: "Empty",
  unnamed: "No column name",
  nameWins: "The Name column is used, so this one is not read.",
  cannotRead: "This column can't be read.",
  tableLabel: "The file's columns",
  change: "Change",
  changeDone: "Done",
  changeLabel: (letter: string): string => `Read column ${letter} as`,
  changeAria: (letter: string): string => `Change what column ${letter} is read as`,
  next: (rows: number): Part[] => ["Next — upload ", fig(rows), ` ${plural(rows, "row", "rows")}`],
  nextPlain: "Next",
  back: "Choose another file",
  guardBody: "You changed how the columns are read. Leaving now discards that — nothing has been imported.",
  opening: "Opening the import…",
} as const;

/* ══ THE UPLOAD (step 3, first half) ══════════════════════════════════════════════════════════════ */

export const UPLOAD = {
  label: "Uploading the rows",
  caption: (staged: number, total: number): Part[] => [fig(staged), " of ", fig(total), ` ${plural(total, "row", "rows")} uploaded`],
  nothingYet: "Nothing is in the contact book yet.",
  stop: "Stop uploading",
  stopping: "Stopping after the rows being sent now…",
  guardBody: "Rows are being uploaded. Leaving stops the upload — choose the same file again later to carry on. Nothing has been imported.",
} as const;

/* ══ THE CHECK (step 3) ═══════════════════════════════════════════════════════════════════════════ */

export const CHECK = {
  heading: "The check",
  checking: "Checking your file against the contact book…",
  tiles: {
    new: "New to the book",
    inBook: "Already in the book",
    repeated: "Repeated in this file",
    invalid: "Not a mobile number",
    unreadable: "Could not be read",
  } satisfies Record<PreflightBucket, string>,
  sum: (counts: readonly number[], rows: number): Part[] => {
    const parts: Part[] = [];
    counts.forEach((n, i) => {
      if (i > 0) parts.push(" + ");
      parts.push(fig(n));
    });
    parts.push(" = ", fig(rows), ` ${plural(rows, "row", "rows")} — every row of your file is counted once.`);
    return parts;
  },
  nothingWritten: "Nothing has been written to the book yet.",
  firstWins: "When a number appears more than once, the first row is the one imported; the later rows are kept as they are.",
  showing: (shown: number, total: number): Part[] => ["Showing ", fig(shown), " of ", fig(total)],
  invalidHeading: "Not a mobile number",
  unreadableHeading: "Could not be read",
  repeatedHeading: "Repeated in this file",
  row: (line: number): Part[] => ["Row ", fig(line)],
  repeats: (line: number, first: number): Part[] => ["Row ", fig(line), " repeats row ", fig(first)],
  bucketsOff: "The check's numbers don't add up, so they aren't shown. Nothing was written — check again.",
  checkAgain: "Check again",
  discard: "Discard this import",
  discardTitle: "Discard this import?",
  discardBody: (total: number): Part[] => [
    "The ", fig(total), ` uploaded ${plural(total, "row is", "rows are")} deleted. Nothing in the contact book changes.`,
  ],
  discardConfirm: "Discard",
  discarded: "Import discarded",
  discardedBody: "Nothing in the contact book changed.",
} as const;

/* ══ NUMBERS ALREADY IN THE BOOK (step 3, the decision) ═══════════════════════════════════════════ */

export const DECIDE = {
  heading: "Numbers already in the book",
  lead: (n: number): Part[] => [fig(n), ` ${plural(n, "number", "numbers")} in your file ${plural(n, "is", "are")} already in the contact book. Choose what happens to them.`],
  recommended: "Recommended",
  changes: (n: number): Part[] => (n === 0 ? ["No contact changes"] : [fig(n), ` ${plural(n, "contact changes", "contacts change")}`]),
  reassure: "A blank cell never erases anything. Numbers on the stop list and erased people are never changed.",
  listHeading: "What would change",
  listLead: "Each contact below differs from your file. Set one apart from the choice above if it should be treated differently.",
  loading: "Loading the changes…",
  more: "Show more",
  failed: "The changes couldn't be loaded. The choice above still applies to every row.",
  name: (from: string, to: string): string => `Name: ${from} → ${to}`,
  nameNew: (to: string): string => `Name: ${to}`,
  emailReplaced: "Email replaced",
  notesReplaced: "Notes replaced",
  fills: "Missing details filled in from the file",
  showing: (shown: number, total: number | null): Part[] => (total === null ? ["Showing ", fig(shown)] : ["Showing ", fig(shown), " of ", fig(total)]),
  colRow: "Row",
  colContact: "Contact",
  colChange: "With this choice",
  colApart: "Set apart",
  tableLabel: "Contacts that would change",
  tagsAdded: (tags: readonly string[]): string => `Tags added: ${tags.join(", ")}`,
  tagsNotAdded: (tags: readonly string[]): string => `Not added, the contact is full of tags: ${tags.join(", ")}`,
  noName: "No name",
  keepAsIs: "Leave this contact as it is",
  useFile: "Use the file's version for this contact",
  setApart: "Set apart",
  cleared: (n: number): Part[] => [
    "You changed the choice for every row, so the ", fig(n), ` ${plural(n, "row", "rows")} you had set apart now ${plural(n, "follows", "follow")} it.`,
  ],
  guardBody: "You set rows apart or named a list. Leaving now discards those choices — nothing has been imported.",
} as const;

/** What happens to a row in the book under a choice, when it does not change (its `shown` reason, X22). */
export const KEEP_REASON: Readonly<Record<ShownKeepReason, string>> = {
  chosen_keep: "Stays as it is",
  no_change: "Nothing to change",
  suppressed: "On the stop list — never changed",
  same_run: "Repeats an earlier row",
};

/** The three choices, keyed by the ONE list — what each does, in words. */
export const CHOICE_COPY: Readonly<Record<ImportChoice, { readonly title: string; readonly body: string }>> = {
  KEEP: {
    title: "Keep what's in the book",
    body: "Nothing about these contacts changes. New numbers are still added.",
  },
  TAKE_FILE: {
    title: "Use the file's version",
    body: "The file's name, email and notes replace what the book holds. Tags are added, never removed.",
  },
  FILL_BLANKS: {
    title: "Only fill in what's missing",
    body: "Only details the book doesn't have yet are filled in from the file.",
  },
};

/* ══ THE LIST (step 3, where the contacts go) ═════════════════════════════════════════════════════ */

export const LIST = {
  heading: "Add the contacts to a list",
  lead: "Offers reach people through a list whose basis and 18+ confirmation are recorded on the Lists card.",
  owed: "People added to a list are covered for offers only once its basis is recorded again on the Lists card, after the import.",
  none: "Don't add them to a list",
  noneBody: "The contacts go into the book only.",
  newList: "A new list",
  newListLabel: "Name of the new list",
  members: (n: number): Part[] => [fig(n), ` ${plural(n, "member", "members")}`],
  covered: "Basis recorded",
  notCovered: "No basis recorded",
  exists: "A list with this name already exists, so the contacts are added to it.",
  loading: "Loading your lists…",
  failed: "Your lists couldn't be loaded. You can import without a list, or try again.",
  openCard: "Open the Lists card",
} as const;

/* ══ THE START ════════════════════════════════════════════════════════════════════════════════════ */

export const APPLY = {
  label: (create: number, update: number, keep: number): Part[] => [
    "Import — ", fig(create), " new · ", fig(update), " updated · ", fig(keep), ` kept as ${plural(keep, "it is", "they are")}`,
  ],
  starting: "Starting the import…",
  overwriteTitle: "Replace details already in the book?",
  overwriteBody: (n: number): Part[] => [
    fig(n), ` ${plural(n, "contact", "contacts")} already in the book will have details replaced with the file's. There is no undo.`,
  ],
  overwriteConfirm: "Replace and import",
  heldListName: "Name the new list, or choose another option.",
  heldLists: "Wait for your lists to load, or choose not to add the contacts to a list.",
} as const;

/* ══ IMPORTING (step 4) ═══════════════════════════════════════════════════════════════════════════ */

export const COMMIT = {
  label: "Importing contacts",
  caption: (done: number, total: number): Part[] => [fig(done), " of ", fig(total), ` ${plural(total, "row", "rows")} done`],
  betsFirst: "Bets always come first — the import waits whenever the platform is busy.",
  busy: (attempt: number, of: number, sec: number): Part[] => [
    "The platform is busy right now — bets come first. Trying again in ", fig(sec), ` ${plural(sec, "second", "seconds")} (`, fig(attempt), " of ", fig(of), ").",
  ],
  stop: "Stop",
  stopping: "Stopping after the rows being written now…",
  askTitle: "Stop the import?",
  askBody: "It stops after the rows being written now. Rows already written stay in the book, and you can resume it from Import contacts.",
  askConfirm: "Stop the import",
  askCancel: "Keep importing",
  askUploadTitle: "Stop uploading?",
  askUploadBody: "The upload stops after the rows being sent now. Nothing is in the contact book yet — choose the same file again later to carry on.",
  askUploadConfirm: "Stop uploading",
  askUploadCancel: "Keep uploading",
  guardBody: "An import is running. Leaving this page stops it after the rows being written now — you can resume it later from Import contacts.",
  pausedBy: (who: string, when: string): string => (who === "you" ? `Paused by you ${when}.` : `Paused by ${who} ${when}.`),
  stoppedHere: "Stopped. Resume to carry on from where it stopped.",
  progress: (done: number, total: number): Part[] => [fig(done), " of ", fig(total), ` ${plural(total, "row", "rows")} done.`],
  resume: "Resume",
  cancelRest: "Cancel the rest",
  cancelTitle: "Cancel the rest of this import?",
  cancelBody: (done: number, rest: number): Part[] => [
    fig(done), ` ${plural(done, "row is", "rows are")} already in the contact book and stay there. The other `, fig(rest),
    ` ${plural(rest, "row", "rows")} won't be imported.`,
  ],
  cancelConfirm: "Cancel the rest",
  cancelKeep: "Keep the import",
  finishing: "Counting the result…",
} as const;

/* ══ WHERE AN OPEN COMES BACK REFUSED — the ways on ═══════════════════════════════════════════════ */

export const OPEN_WAYS = {
  goToOpen: "Go to the unfinished import",
  discardOpen: "Discard it and import this file",
  discardStale: "Discard the unfinished import and start again",
  chooseAnother: "Choose another file",
} as const;

/* ══ THE RESULT ═══════════════════════════════════════════════════════════════════════════════════ */

export const DONE = {
  tiles: { create: "Added", update: "Updated", keep: "Kept as they were", fail: "Couldn't be imported" },
  notImported: "Not imported",
  sum: (parts: readonly number[], rows: number): Part[] => {
    const out: Part[] = [];
    parts.forEach((n, i) => {
      if (i > 0) out.push(" + ");
      out.push(fig(n));
    });
    out.push(" = ", fig(rows), ` ${plural(rows, "row", "rows")}.`);
    return out;
  },
  keptSplit: (inBook: number, stop: number, repeated: number, chosen: number): Part[] => [
    "Kept: ", fig(inBook), " already in the book as they are · ", fig(stop), " on the stop list · ", fig(repeated),
    " repeated in the file · ", fig(chosen), " you chose to keep",
  ],
  cancelled: (written: number, rest: number): Part[] => [
    "The import was cancelled. ", fig(written), ` ${plural(written, "row was", "rows were")} written before it stopped and stay in the book; `,
    fig(rest), ` ${plural(rest, "row was", "rows were")} not imported.`,
  ],
  failuresHeading: "Couldn't be imported",
  failuresMore: "Show more",
  failuresLoading: "Loading the rows that couldn't be imported…",
  failuresFailed: "The rows that couldn't be imported didn't load. Try again.",
  showAdded: "Show the contacts this import added",
  listReady: (name: string): string => `Added to the list ${name} — every member is covered for offers.`,
  listOwed: (name: string): string =>
    `Added to the list ${name}. The new members aren't covered for offers yet — record the list's basis and 18+ confirmation again on the Lists card.`,
  imported: "Import finished",
  importedBody: (create: number, update: number): string => `${formatNumber(create)} added · ${formatNumber(update)} updated.`,
} as const;

/** When a run happened, as the screen says it: "on 9 Oct, 14:05" — the platform's own date format, passed in. */
export const whenText = (formatted: string | null): string => (formatted === null ? "earlier" : `on ${formatted}`);
