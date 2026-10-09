/**
 * test:contacts-import · section "flow" — S15's browser side of the importer: the reader (`src/lib/contacts/import-read.ts`)
 * and the ONE loop driver (`src/lib/contacts/import-loop.ts`).                                        (S15 · C3–C4, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. The paste is parsed in both of its modes (a list from a chat, cells copied from a sheet), a
 * headerless file is mapped (S15-5), a masked export stays refused whatever the officer says about its first row, every
 * preview is masked, and real `File`s are read through the real streamed reader — a CSV and its digest, an old .xls, an
 * Excel file over the cap, an empty file, a vCard with two numbers on a card, an aborted read, a file past the run's cap.
 * ⭐ C3b: a CSV with one broken quote at its end is read with that record unreadable (G1, R8) while a TAB paste with one
 * is split by hand (P2b); Outlook's and Google's several phone columns gain ONE first-mobile column read as Phone (G4a,
 * G4b), and a file that would gain nothing — one phone column, a serial beside the phones — gains none (G4c); S15-4's
 * count of people whose other number is not imported now covers a file's cells and phone columns too (E1).
 * ⭐ THE LOOPS' PROPERTIES, EACH AGAINST A STUBBED SERVER that keeps its own cursor (the server's builder and the lead hold
 * the commit loop to exactly these): the bar shows only the server's cursor; Stop pauses on the server, then stops; a
 * refusal comes back verbatim; only `busy` is waited out — never given up on while Stop is not pressed (R6, the review
 * round of 2026-10-09), backing off 5 → 10 → 20 → 30 s or the server's longer figure, with Stop still read between
 * waits; a thrown call is followed by the VIEW, never a blind repeat, and a failure whose view cannot be read carries no
 * view at all (R4); a deploy is named; `moved` adopts the server's cursor and counts nothing; a resume starts at the
 * server's cursor; the result's counts are the server's; a loop that stops moving stops. The upload resumes from
 * `nextFrom`, treats `already_staged` as "ask the view and go on", takes a STAGED view as success, and sends every batch
 * within the caps, contiguous.
 * ⭐ PROVED BY MUTATION: each plant below is a replacement bundle built in memory — the defect wrapped around the shipped
 * function — and names the ONE label it must turn red.
 * ⛔ IN-PROCESS: this module reads two sources and makes no file-changing call.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  FIRST_MOBILE_HEADER_START,
  FIRST_MOBILE_SOURCE_NOTE,
  PASTE_LINE_NO_NUMBER,
  PASTE_LIST_NOTE,
  READ_TOO_MANY_ROWS,
  extraNumbersNote,
  extraNumbersOf,
  isListPaste,
  isPhoneColumnHeader,
  mappingFor,
  parsePastedText,
  previewCell,
  readContactsFile,
  type FileMapping,
  type ReadOutcome,
} from "../../src/lib/contacts/import-read.ts";
import { firstMobileIn, phoneCellParts } from "../../src/lib/contacts/phone-cell.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import {
  BUSY_BACKOFF_SEC,
  BUSY_WAIT_MAX_SEC,
  STALL_LIMIT,
  isDeploySkewError,
  runCommit,
  runUpload,
  type BusyState,
  type CommitDeps,
  type CommitOutcome,
  type UploadDeps,
  type UploadOutcome,
} from "../../src/lib/contacts/import-loop.ts";
import { isParsedContactsFile, type ParsedContactsFile } from "../../src/lib/contacts/parsed-file.ts";
import { CONTACT_MASKED_FILE, autoMapHeaders, contactExportHeader, validateMapping } from "../../src/lib/contacts/contact-fields.ts";
import { STAGE_BATCH_MAX_ROWS, stageRowsOf, type StageRowInput } from "../../src/lib/contacts/import-limits.ts";
import { EMPTY_FILE_SENTENCE, parseCsv } from "../../src/lib/contacts/import-parse.ts";
import { XLSX_MAX_BYTES, xlsxRefusalSentence } from "../../src/lib/contacts/xlsx-limits.ts";
import {
  IMPORT_REFUSAL_SENTENCES,
  type CommitStepInput,
  type CommitStepResult,
  type ImportRefusalReason,
  type ImportRunStatus,
  type ImportRunView,
  type ImportViewResult,
  type RunActResult,
  type StageImportInput,
  type StageImportResult,
} from "../../src/lib/contacts/import-flow.ts";

/* ⛔ Control characters are built from their codes: the editing tools decode escape text into raw characters. */
const TAB = String.fromCharCode(9);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const CRLF = CR + LF;
const NINE_DIGITS = /\d{9}/;

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type FlowImpl = {
  readonly parsePaste: typeof parsePastedText;
  readonly mappingFor: typeof mappingFor;
  readonly extraNumbersOf: typeof extraNumbersOf;
  readonly previewCell: typeof previewCell;
  readonly readFile: typeof readContactsFile;
  readonly runCommit: typeof runCommit;
  readonly runUpload: typeof runUpload;
  readonly isSkew: typeof isDeploySkewError;
  readonly sources: { readonly read: string; readonly loop: string };
};

const read = (rel: string): string => decomment(readFileSync(join(REPO_ROOT, rel), "utf8")).split(CRLF).join(LF);

let cached: FlowImpl | null = null;
function real(): FlowImpl {
  if (cached) return cached;
  cached = {
    parsePaste: parsePastedText,
    mappingFor,
    extraNumbersOf,
    previewCell,
    readFile: readContactsFile,
    runCommit,
    runUpload,
    isSkew: isDeploySkewError,
    sources: { read: read("src/lib/contacts/import-read.ts"), loop: read("src/lib/contacts/import-loop.ts") },
  };
  return cached;
}

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  W0: "W0 · ⛔ PURE — import-read.ts and import-loop.ts carry no directive and import only src/lib/contacts modules (the ONE phone-cell rule among them), tz-msisdn and phone-normalize (the loop: import-limits and import-flow alone)",
  P1: "P1 · ⭐ a LIST paste: each line's first number is the Phone cell and the rest of the line the Name (a chat's stamp, an enumeration and separators dropped), lines numbered as pasted, a blank line counted",
  P1b: "P1b · a pasted line with no number is listed as unreadable with its row and the reader's sentence — never dropped",
  P1c: "P1c · ⭐ S15-4 · a line with a second number keeps the FIRST, and the paste's note names that row; a foreign number yields to a Tanzanian one on its line",
  P2: "P2 · a TAB paste is an Excel copy: cells split on the tab with Excel's quoting, a blank line counted, its first row header-matched (Phone, Name; one header row)",
  P2b: "P2b · ⭐ C3b · a TAB paste whose quotation mark never closes is split by hand — every line kept, its quotation marks as typed, nothing unreadable — never cut by the CSV reader's one unreadable record (G1)",
  P3: "P3 · a list paste maps Phone and Name with no header row, named as the field list names them — never \"Column A…\", never read as a headerless file — and U28's validateMapping passes it",
  M1: "M1 · ⭐ S15-5 · a file whose first row is a contact is READ: \"Column A…\" headers, the phone, email and name columns found from the cells, no header row — row 1 staged too",
  M2: "M2 · the officer's word on the first row turns the reading over both ways (\"header\" reads it as names again)",
  M3: "M3 · ⛔ a masked export stays refused in U28's words — even when the officer says its first row is a contact",
  M4: "M4 · a header row narrower than the file is padded to the widest row, so every column can be mapped",
  M5: "M5 · ⛔ NO NUMBER WHOLE: a cell that is a number previews as +255••••NN, a number inside text is bulleted, plain text is untouched",
  G4a: "G4a · ⭐ C3b · G4 — an Outlook export whose Mobile Phone is empty on a row while Business Phone (or Primary Phone) holds the mobile gains ONE column, “Phone (first mobile of: Mobile Phone, Business Phone, Home Phone and 2 more)”, read as Phone: each row's FIRST phone cell holding a Tanzanian mobile (Mobile first; a Car Phone mobile beside it not taken), else the Mobile cell — so a row with no mobile anywhere reads as before; the original columns stay, read as nothing, each saying why; validateMapping passes it, the staged rows carry those cells, the file is valid and the file as read is untouched",
  G4b: "G4b · ⭐ C3b · G4 — Google's export: a Phone 1 - Value cell joining two numbers with ' ::: ' is the row's phone (its first mobile is the key the server stages — G3 before G4), and a row whose mobile is only in Phone 2 - Value reads Phone 2's cell; the Label columns are never phone columns",
  G4c: "G4c · ⛔ CONTROL · G4 — a plain file with one phone column, a serial Namba beside a Simu column that holds every mobile, and an Outlook export whose every mobile is in Mobile Phone gain NO column: the reading is the file as read, Phone where U28 put it",
  E1: "E1 · ⭐ S15-4 said for cells and columns too (C3b): extraNumbersOf counts the rows whose person had another number that is not imported — a second number in the phone cell (G3), a number in another phone column beside the one read (G4) — never a serial or an extension, and the result's sentence counts rows; a plain file counts none",
  R1: "R1 · a CSV File is STREAMED into the reader: its rows read, its digest the sha-256 of its exact bytes, progress reported in bytes",
  R2: "R2 · an old .xls is refused before anything is uploaded, in xlsx-limits' own sentence",
  R3: "R3 · ⭐ C3c · an Excel file over the upload cap is NEVER uploaded and never refused for its size: it is read in the browser — a broken one refused in the copy table's own unreadable sentence, never the old too_large",
  R4: "R4 · an empty file is refused with the empty-file sentence",
  R5: "R5 · ⭐ S15-4 · a vCard card with two numbers yields one row, the count of such cards, and the note that says it",
  R6: "R6 · an aborted read comes back aborted — nothing kept",
  R7: "R7 · ⛔ CRASH CONTROL · a file past the run's cap stops being read and says how to split it",
  R8: "R8 · ⭐ C3b · G1 — a CSV File whose LAST record opens a quotation mark never closed is READ, not refused: its rows kept, that record listed unreadable on its own line with the reader's sentence, and both staged",
  C1: "C1 · ⛔ THE BAR IS THE SERVER'S CURSOR — every figure shown is a cursor the server answered with, never past the server's own",
  C2: "C2 · ⭐ STOP IS READ BETWEEN STEPS: the run is paused ON THE SERVER, then the loop stops — no step after the pause",
  C3: "C3 · ⛔ a refusal ends the loop with the server's refusal, verbatim (its reason and its sentence)",
  C4: "C4 · ⭐ R6 · busy is waited out WITHOUT GIVING UP while Stop is not pressed — 5 s, 10 s, 20 s, then 30 s each time — and the screen is told each wait in the server's sentence, then told the spell is over",
  C4a: "C4a · ⭐ R6 · a wait is the server's own retryAfterSec when that is longer than the backoff's step — and never past the ceiling",
  C4b: "C4b · ⛔ ONLY busy is retried — rate_limited ends the loop on its first answer",
  C4c: "C4c · ⭐ R6 · Stop is still read during a busy spell: the run is paused on the server after the wait in progress, never after the spell ends",
  C5: "C5 · ⛔ after a THROWN step the next call is the VIEW — never a blind repeat — and the loop goes on from the cursor the view reports",
  C5b: "C5b · a deploy (a stale action id, thrown by the step and the view alike) is named as such",
  C6: "C6 · ⭐ moved adopts the server's cursor and counts nothing: the next step starts exactly there",
  C7: "C7 · ⭐ a resume starts from the server's cursor (the view it was given), never from 0",
  C8: "C8 · the result's counts are the server's — the last view's totals, untouched",
  C9: "C9 · ⛔ a loop that stops moving stops: STALL_LIMIT answers that leave the cursor where it was end it as stalled",
  C10: "C10 · ⛔ R4 · a failure whose view could not be read carries NO view — neither loop hands back a cursor it held as where the run stands",
  U1: "U1 · ⭐ the upload resumes from the run's nextFrom — its first batch starts at that record",
  U2: "U2 · already_staged asks the VIEW and carries on from its nextFrom (a retried call, not a failure)",
  U3: "U3 · ⭐ a STAGED view is success even when the last batch's own answer was a refusal",
  U4: "U4 · every batch is within the caps, the batches are contiguous, and together they are the file",
} as const;

/* ══ THE STUBBED SERVER ═════════════════════════════════════════════════════════════════════════ */

const RUN = "ci_abcdefghijklmnopqrst";
const DIGEST = "a".repeat(64);
const SENTENCE = {
  busy: IMPORT_REFUSAL_SENTENCES.busy,
  rate: IMPORT_REFUSAL_SENTENCES.rate_limited,
  cancelled: "This import was cancelled. Rows already written stay in the book.",
  already: "These rows are already staged. Carry on from the row the import asks for next.",
};

function runView(over: Partial<ImportRunView>): ImportRunView {
  return {
    id: RUN, status: "COMMITTING", format: "csv", fileName: "contacts.csv", fileDigest: DIGEST, mapping: { phone: 0, name: 1 },
    totalRows: 0, unreadable: 0, stagedThrough: 0, committedThrough: 0, nextFrom: null,
    totals: { staged: 0, unreadable: 0, pending: 0, create: 0, update: 0, keep: 0, fail: 0 },
    startedBy: "you", mine: true, createdAt: "2026-10-09T09:00:00.000Z", updatedAt: "2026-10-09T09:00:00.000Z",
    pausedAt: null, pausedBy: null, finishedAt: null, decision: null,
    ...over,
  };
}

type Act =
  | "ok" | "busy" | "rate" | "throw" | "skew" | "stuck"
  | { readonly refuse: ImportRefusalReason; readonly message: string }
  | { readonly moveTo: number }
  /** A busy answer that asks for its own wait. */
  | { readonly busyFor: number };

const skewError = (): Error => {
  const e = new Error('Server Action "7f3a" was not found on the server.');
  e.name = "UnrecognizedActionError";
  return e;
};

/** A commit server with its own cursor: `batch` rows a step, a script of answers by call, and a log of every call. Its
 *  view can throw a deploy's error (`skew`) or a dropped connection's (`fail`). */
function commitServer(total: number, batch: number, script: readonly Act[] = [], startAt = 0, viewThrows: "skew" | "fail" | null = null) {
  let cursor = startAt;
  let status: ImportRunStatus = cursor >= total ? "DONE" : "COMMITTING";
  let call = 0;
  const events: string[] = [];
  const answered = new Set<number>([startAt]);
  const now = (): ImportRunView => runView({
    status, totalRows: total, stagedThrough: total, committedThrough: cursor,
    totals: { staged: total, unreadable: 0, pending: total - cursor, create: cursor, update: 0, keep: 0, fail: 0 },
  });
  const step = async (input: CommitStepInput): Promise<CommitStepResult> => {
    const act = script[call++] ?? "ok";
    events.push(`step:${input.fromCursor}`);
    if (act === "throw") throw new Error("fetch failed");
    if (act === "skew") throw skewError();
    if (act === "busy") return { ok: false, reason: "busy", message: SENTENCE.busy, view: now(), retryAfterSec: 2 };
    if (act === "rate") return { ok: false, reason: "rate_limited", message: SENTENCE.rate, view: null, retryAfterSec: 1 };
    if (act === "stuck") return { ok: true, kind: "advanced", view: now() };
    if (typeof act === "object" && "busyFor" in act) return { ok: false, reason: "busy", message: SENTENCE.busy, view: now(), retryAfterSec: act.busyFor };
    if (typeof act === "object" && "refuse" in act) return { ok: false, reason: act.refuse, message: act.message, view: now() };
    if (typeof act === "object" && "moveTo" in act) {
      cursor = act.moveTo;
      answered.add(cursor);
      return { ok: true, kind: "moved", view: now() };
    }
    if (input.fromCursor !== cursor) return { ok: true, kind: "moved", view: now() };
    cursor = Math.min(total, cursor + batch);
    if (cursor >= total) status = "DONE";
    answered.add(cursor);
    return { ok: true, kind: status === "DONE" ? "done" : "advanced", view: now() };
  };
  const view = async (): Promise<ImportViewResult> => {
    events.push("view");
    if (viewThrows === "skew") throw skewError();
    if (viewThrows === "fail") throw new Error("fetch failed");
    return { ok: true, view: now() };
  };
  const pause = async (): Promise<RunActResult> => {
    events.push("pause");
    status = "PAUSED";
    return { ok: true, view: { ...now(), pausedAt: "2026-10-09T09:05:00.000Z", pausedBy: "you" } };
  };
  return { step, view, pause, events, answered, state: () => ({ cursor, status }), now };
}

type Recorded = { shown: number[]; waits: number[]; busy: Array<BusyState | null>; overrun: boolean; steps: number };

function commitDeps(server: ReturnType<typeof commitServer>, stopAfterSteps: number | null = null): { deps: CommitDeps; rec: Recorded } {
  const rec: Recorded = { shown: [], waits: [], busy: [], overrun: false, steps: 0 };
  const deps: CommitDeps = {
    step: async (input) => {
      rec.steps++;
      return server.step(input);
    },
    view: () => server.view(),
    pause: () => server.pause(),
    isDeploySkew: isDeploySkewError,
    shouldStop: () => stopAfterSteps !== null && rec.steps >= stopAfterSteps,
    onView: (v) => {
      rec.shown.push(v.committedThrough);
      if (v.committedThrough > server.state().cursor) rec.overrun = true;
    },
    onBusy: (b) => {
      rec.busy.push(b);
    },
    wait: async (ms) => {
      rec.waits.push(ms);
    },
  };
  return { deps, rec };
}

/** A staging server with its own cursor: the run's records, a script of answers by call, and a log of every batch. Its
 *  view can throw a dropped connection's error (`viewFails`). */
type StageAct = "ok" | "already" | "throw" | "staged-refusal";
function stageServer(total: number, stagedAt = 0, script: readonly StageAct[] = [], viewFails = false) {
  let staged = stagedAt;
  let status: ImportRunStatus = staged >= total ? "STAGED" : "STAGING";
  let call = 0;
  const events: string[] = [];
  const batches: Array<{ from: number; rows: readonly StageImportInput["rows"][number][] }> = [];
  const now = (): ImportRunView => runView({
    status, totalRows: total, stagedThrough: staged, committedThrough: 0, nextFrom: status === "STAGING" ? staged + 1 : null,
    totals: { staged, unreadable: 0, pending: staged, create: 0, update: 0, keep: 0, fail: 0 },
  });
  const stage = async (input: StageImportInput): Promise<StageImportResult> => {
    const act = script[call++] ?? "ok";
    events.push(`stage:${input.from}`);
    batches.push({ from: input.from, rows: input.rows });
    if (act === "throw") throw new Error("fetch failed");
    if (act === "already") {
      // The batch had landed on an earlier call: the server's cursor is past it.
      staged = Math.min(total, input.from - 1 + input.rows.length);
      if (staged >= total) status = "STAGED";
      return { ok: false, reason: "already_staged", message: SENTENCE.already, view: now() };
    }
    if (input.from !== staged + 1) return { ok: false, reason: input.from <= staged ? "already_staged" : "out_of_order", message: SENTENCE.already, view: now() };
    staged = input.from - 1 + input.rows.length;
    if (staged >= total) status = "STAGED";
    if (act === "staged-refusal") return { ok: false, reason: "out_of_order", message: SENTENCE.already, view: now() };
    return { ok: true, view: now() };
  };
  const view = async (): Promise<ImportViewResult> => {
    events.push("view");
    if (viewFails) throw new Error("fetch failed");
    return { ok: true, view: now() };
  };
  return { stage, view, events, batches, now };
}

function uploadDeps(server: ReturnType<typeof stageServer>): UploadDeps {
  return {
    stage: (input) => server.stage(input),
    view: () => server.view(),
    isDeploySkew: isDeploySkewError,
    shouldStop: () => false,
    onView: () => undefined,
    onBusy: () => undefined,
    wait: async () => undefined,
  };
}

/** `n` staged records after a header row (lines 2…n+1). */
const records = (n: number): StageRowInput[] =>
  Array.from({ length: n }, (_, i) => ({ line: i + 2, cells: [`07${String(10_000_000 + i).slice(-8)}`, `Person ${i + 1}`] }));

/* ══ THE FILES ══════════════════════════════════════════════════════════════════════════════════ */

const LIST_PASTE = [
  "Asha Mwakalinga: +255 712 345 678",
  "",
  "0754 123 456 - Baraka",
  "hello there",
  "12. Neema 0688 111 222, 0713 000 111",
  "[12/03/2026, 10:15] Juma: 0765 432 109",
  "Kenya +254 712 345 678 or 0715 000 222",
].join(LF);

const TAB_PASTE = [`Phone${TAB}Name`, `0712 345 678${TAB}Asha`, "", `0754 123 456${TAB}"Mama, Neema"`, ""].join(CRLF);

const HEADERLESS: ParsedContactsFile = {
  format: "csv", fileName: "numbers-only.csv", width: 3, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: ["Asha", "0712 345 678", "asha@example.com"] },
    { line: 2, cells: ["Baraka", "0754 123 456", ""] },
    { line: 3, cells: ["Neema", "0688 111 222", "neema@example.com"] },
  ],
};

const masked = contactExportHeader(false);
const MASKED: ParsedContactsFile = {
  format: "csv", fileName: "masked.csv", width: masked.length, blankRows: 0, notes: [], unreadable: [],
  rows: [{ line: 1, cells: [...masked] }, { line: 2, cells: ["+255••••01", "Asha", ...masked.slice(2).map(() => "")] }],
};

const NARROW_HEADER: ParsedContactsFile = {
  format: "csv", fileName: "narrow.csv", width: 3, blankRows: 0, notes: [], unreadable: [],
  rows: [{ line: 1, cells: ["Phone", "Name"] }, { line: 2, cells: ["0712 345 678", "Asha", "extra"] }],
};

/** C3b · G1 at the paste: a TAB paste whose third line opens a quotation mark that never closes. */
const TAB_BROKEN = [`Phone${TAB}Name`, `0712 345 678${TAB}Asha`, `0754 123 456${TAB}"Mama, Neema`, `0688 111 222${TAB}Juma`].join(CRLF);

/* ── C3b · G4 · several phone columns ── */
const OUTLOOK_HEADER = ["First Name", "Last Name", "Business Phone", "Home Phone", "Mobile Phone", "Primary Phone", "Car Phone", "E-mail Address"];
/** Outlook's shape: lines 3 (Business only) and 5 (Primary only) hold their mobile OUTSIDE Mobile Phone; line 4 a Home
 *  landline beside the mobile; line 6 a Car Phone mobile beside a different Mobile one; lines 7 and 8 no mobile at all. */
const OUTLOOK_LIKE: ParsedContactsFile = {
  format: "csv", fileName: "outlook.csv", width: 8, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: [...OUTLOOK_HEADER] },
    { line: 2, cells: ["Asha", "Juma", "", "", "0712 345 601", "", "", "asha@example.com"] },
    { line: 3, cells: ["Baraka", "Moshi", "0754 345 602", "", "", "", "", ""] },
    { line: 4, cells: ["Neema", "Kimaro", "", "022 211 3456", "0688 345 603", "", "", ""] },
    { line: 5, cells: ["Juma", "Said", "", "", "", "0765 345 604", "", ""] },
    { line: 6, cells: ["Rehema", "John", "", "", "0713 345 605", "", "0714 345 606", ""] },
    { line: 7, cells: ["Zawadi", "Ali", "", "022 211 3457", "", "", "", ""] },
    { line: 8, cells: ["Hassani", "Omari", "+254 712 345 678", "", "", "", "", ""] },
  ],
};
/** The first-mobile column's cells for lines 2–8, and its header — LITERALS, decided by hand. */
const OUTLOOK_PICKS = ["0712 345 601", "0754 345 602", "0688 345 603", "0765 345 604", "0713 345 605", "", ""];
const OUTLOOK_FIRST_MOBILE = "Phone (first mobile of: Mobile Phone, Business Phone, Home Phone and 2 more)";
/** The same export with every mobile in Mobile Phone (a Home landline and a Car mobile beside two of them): no column. */
const OUTLOOK_ALL_IN_MOBILE: ParsedContactsFile = { ...OUTLOOK_LIKE, rows: [OUTLOOK_LIKE.rows[0], OUTLOOK_LIKE.rows[1], OUTLOOK_LIKE.rows[3], OUTLOOK_LIKE.rows[5]] };

const GOOGLE_HEADER = ["First Name", "Last Name", "Phone 1 - Label", "Phone 1 - Value", "Phone 2 - Label", "Phone 2 - Value"];
/** Google's shape: line 2 joins two numbers with " ::: " in Phone 1 AND has another mobile in Phone 2; line 3 a landline
 *  in Phone 1 and its mobile only in Phone 2; line 4 one mobile. */
const GOOGLE_LIKE: ParsedContactsFile = {
  format: "csv", fileName: "google.csv", width: 6, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: [...GOOGLE_HEADER] },
    { line: 2, cells: ["Asha", "Juma", "Mobile", "+255 712 345 611 ::: +255 754 345 612", "Mobile", "0688 345 613"] },
    { line: 3, cells: ["Baraka", "Moshi", "Work", "022 211 3458", "Mobile", "+255 765 345 614"] },
    { line: 4, cells: ["Neema", "Kimaro", "Mobile", "0713 345 615", "", ""] },
  ],
};
const GOOGLE_PICKS = ["+255 712 345 611 ::: +255 754 345 612", "+255 765 345 614", "0713 345 615"];
const GOOGLE_FIRST_MOBILE = "Phone (first mobile of: Phone 1 - Value, Phone 2 - Value)";

/** The controls: one phone column; a serial Namba beside the Simu column that holds every mobile. */
const ONE_PHONE: ParsedContactsFile = {
  format: "csv", fileName: "plain.csv", width: 3, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: ["Name", "Phone", "Email"] },
    { line: 2, cells: ["Asha", "0712 345 621", ""] },
    { line: 3, cells: ["Baraka", "022 211 3459", ""] },
  ],
};
const NAMBA_SIMU: ParsedContactsFile = {
  format: "csv", fileName: "orodha.csv", width: 3, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: ["Namba", "Jina", "Simu"] },
    { line: 2, cells: ["1", "Asha", "0712 345 622"] },
    { line: 3, cells: ["2", "Baraka", "0754 345 623"] },
    { line: 4, cells: ["3", "Neema", ""] },
  ],
};

/** S15-4 · one phone column: a cell holding two numbers, one holding a number and its extension, one plain. */
const TWO_IN_CELL: ParsedContactsFile = {
  format: "csv", fileName: "two.csv", width: 2, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: ["Phone", "Name"] },
    { line: 2, cells: ["0712 345 631 / 0754 345 632", "Asha"] },
    { line: 3, cells: ["0688 345 633 / ext 12", "Baraka"] },
    { line: 4, cells: ["0765 345 634", "Neema"] },
  ],
};

/** The first-mobile column's index in a reading, or -1. */
const firstMobileAt = (m: FileMapping): number => m.headers.findIndex((h) => h.startsWith(FIRST_MOBILE_HEADER_START));

/** A plant's first-mobile column: the reading's own column REBUILT by another chooser over the same phone columns (the
 *  main one first, then the others left to right) — the faithful way to plant a wrong choice. */
function rebuildFirstMobile(m: FileMapping, choose: (cells: readonly string[], order: readonly number[], main: number) => string): FileMapping {
  const at = firstMobileAt(m);
  if (at < 0) return m;
  const headers = m.headers.slice(0, at);
  const main = autoMapHeaders(headers).mapping.phone ?? headers.findIndex((h) => isPhoneColumnHeader(h));
  const order = [main, ...headers.flatMap((h, i) => (i !== main && isPhoneColumnHeader(h) ? [i] : []))];
  const rows = m.file.rows.map((row, r) => (r === 0 ? row : { line: row.line, cells: [...row.cells.slice(0, at), choose(row.cells, order, main)] }));
  return { ...m, file: { ...m.file, rows } };
}

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text);
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

async function readOne(impl: FlowImpl, file: File, signal?: AbortSignal): Promise<{ out: ReadOutcome; progress: Array<[number, number | null, number]> }> {
  const progress: Array<[number, number | null, number]> = [];
  const out = await impl.readFile(file, { signal, onProgress: (r, t, rows) => progress.push([r, t, rows]) });
  return { out, progress };
}

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

async function run(ctx: SectionContext<FlowImpl>): Promise<void> {
  const { impl, ok, log } = ctx;

  // ── W0 · the two modules are pure ─────────────────────────────────────────────────────────────
  const specs = (src: string): string[] => [...src.matchAll(/^\s*import\b[^;]*?from\s*["']([^"']+)["']/gm)].map((m) => m[1]);
  const readAllowed = new Set([
    "./parsed-file", "./import-parse", "./vcard", "./xlsx-limits", "./contact-fields", "./import-limits", "./phone-cell", "../tz-msisdn",
    "../phone-normalize",
    // C3c · the browser's reader of a workbook past the upload cap.
    "./xlsx-read",
  ]);
  const loopAllowed = new Set(["./import-limits", "./import-flow"]);
  const readSpecs = specs(impl.sources.read);
  const loopSpecs = specs(impl.sources.loop);
  const directive = /^\s*["']use (?:client|server)["']/m;
  ok(L.W0,
    readSpecs.length >= 5 && readSpecs.every((s) => readAllowed.has(s)) && loopSpecs.length >= 2 && loopSpecs.every((s) => loopAllowed.has(s))
      && !directive.test(impl.sources.read) && !directive.test(impl.sources.loop),
    `read [${readSpecs.join(", ")}] · loop [${loopSpecs.join(", ")}]`);

  // ── P · the paste ─────────────────────────────────────────────────────────────────────────────
  const list = impl.parsePaste(LIST_PASTE);
  const rowsOf = (f: ParsedContactsFile) => f.rows.map((r) => `${r.line}:${r.cells.join("|")}`).join(" ; ");
  const want = [
    "1:+255 712 345 678|Asha Mwakalinga",
    "3:0754 123 456|Baraka",
    "5:0688 111 222|Neema",
    "6:0765 432 109|Juma",
    "7:0715 000 222|Kenya or",
  ].join(" ; ");
  ok(L.P1, isListPaste(LIST_PASTE) && list.format === "paste" && list.fileName === null && isParsedContactsFile(list)
    && rowsOf(list) === want && list.blankRows === 1 && list.notes[0] === PASTE_LIST_NOTE,
    rowsOf(list));
  ok(L.P1b, list.unreadable.length === 1 && list.unreadable[0].line === 4 && list.unreadable[0].reason === PASTE_LINE_NO_NUMBER,
    JSON.stringify(list.unreadable));
  const multiNote = list.notes.find((n) => n.includes("more than one phone number")) ?? "";
  // Line 7 holds a Kenyan number first: it yields to the Tanzanian one — and its inner groups ("712 345 678") are never
  // read as a Tanzanian number of their own (that would be a stranger's).
  ok(L.P1c, /rows 5 and 7/i.test(multiNote) && list.rows.find((r) => r.line === 7)?.cells[0] === "0715 000 222"
    && !list.rows.some((r) => r.cells[0].replace(/\D/g, "").endsWith("712345678") && !r.cells[0].startsWith("+255")),
    multiNote);

  const table = impl.parsePaste(TAB_PASTE);
  const tableMap = impl.mappingFor(table, { list: isListPaste(TAB_PASTE) });
  ok(L.P2, !isListPaste(TAB_PASTE) && table.format === "paste" && isParsedContactsFile(table)
    && rowsOf(table) === "1:Phone|Name ; 2:0712 345 678|Asha ; 4:0754 123 456|Mama, Neema" && table.blankRows === 1
    && tableMap.headerRows === 1 && tableMap.mapping.phone === 0 && tableMap.mapping.name === 1 && !tableMap.headerless,
    `${rowsOf(table)} · headerRows ${tableMap.headerRows} · ${JSON.stringify(tableMap.mapping)}`);

  const tabBroken = impl.parsePaste(TAB_BROKEN);
  ok(L.P2b, !isListPaste(TAB_BROKEN) && tabBroken.format === "paste" && isParsedContactsFile(tabBroken) && tabBroken.unreadable.length === 0
    && rowsOf(tabBroken) === `1:Phone|Name ; 2:0712 345 678|Asha ; 3:0754 123 456|"Mama, Neema ; 4:0688 111 222|Juma`,
    `${rowsOf(tabBroken)} · unreadable ${JSON.stringify(tabBroken.unreadable)}`);

  const listMap = impl.mappingFor(list, { list: true });
  ok(L.P3, listMap.headerRows === 0 && listMap.mapping.phone === 0 && listMap.mapping.name === 1 && listMap.refusal === null
    && !listMap.headerless && !listMap.headers.some((h) => /^Column [A-Z]+$/.test(h))
    && validateMapping(listMap.headers, listMap.mapping).ok && stageRowsOf(list, listMap.mapping, listMap.headerRows).length === 6,
    `${JSON.stringify(listMap.headers)} · ${JSON.stringify(listMap.mapping)}`);

  // ── M · the mapping ───────────────────────────────────────────────────────────────────────────
  const hl = impl.mappingFor(HEADERLESS);
  ok(L.M1, hl.headerless && hl.headerRows === 0 && hl.refusal === null && hl.headers.join("|") === "Column A|Column B|Column C"
    && hl.mapping.phone === 1 && hl.mapping.email === 2 && hl.mapping.name === 0 && validateMapping(hl.headers, hl.mapping).ok
    && stageRowsOf(HEADERLESS, hl.mapping, hl.headerRows).length === 3,
    `${hl.headers.join("|")} · ${JSON.stringify(hl.mapping)} · refusal ${hl.refusal}`);
  const asHeader = impl.mappingFor(HEADERLESS, { firstRow: "header" });
  const asContact = impl.mappingFor(table, { firstRow: "contact" });
  ok(L.M2, asHeader.headerRows === 1 && !asHeader.headerless && asContact.headerRows === 0 && asContact.headerless,
    `header → ${asHeader.headerRows} · contact → ${asContact.headerRows}`);
  const m1 = impl.mappingFor(MASKED);
  const m2 = impl.mappingFor(MASKED, { firstRow: "contact" });
  ok(L.M3, m1.refusal === CONTACT_MASKED_FILE && m2.refusal === CONTACT_MASKED_FILE && !m2.headerless, `${m1.refusal} · ${m2.refusal}`);
  const narrow = impl.mappingFor(NARROW_HEADER);
  ok(L.M4, narrow.headers.length === 3 && narrow.headers[2] === "" && narrow.headerRows === 1 && narrow.mapping.phone === 0,
    JSON.stringify(narrow.headers));
  const previews = ["0712 345 678", "+255712345678", "Call Asha on 0712345678 today", "Asha", "2.55713E+11"].map((c) => impl.previewCell(c));
  ok(L.M5, previews[0] === "+255••••78" && previews[1] === "+255••••78" && !NINE_DIGITS.test(previews[2]) && previews[2].includes("••••78")
    && previews[3] === "Asha" && previews.every((p) => !NINE_DIGITS.test(p)),
    previews.join(" | "));

  // ── G4 · several phone columns (C3b) ──────────────────────────────────────────────────────────
  const phoneCellsOf = (m: FileMapping): string[] =>
    stageRowsOf(m.file, m.mapping, m.headerRows).map((r) => ("cells" in r ? r.cells[m.mapping.phone ?? -1] ?? "" : "(unreadable)"));
  const outlook = impl.mappingFor(OUTLOOK_LIKE);
  const sourceNoted = [2, 3, 4, 5, 6].every((i) => {
    const c = outlook.columns[i];
    return c !== undefined && c.status === "unused" && c.field === "phone" && c.note === FIRST_MOBILE_SOURCE_NOTE;
  });
  const mappingKey = (m: Readonly<Record<string, number | undefined>>): string =>
    JSON.stringify(Object.entries(m).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  ok(L.G4a, outlook.headers.length === 9 && outlook.headers[8] === OUTLOOK_FIRST_MOBILE && outlook.headerRows === 1
    && mappingKey(outlook.mapping) === mappingKey({ first_name: 0, last_name: 1, phone: 8, email: 7 })
    && sourceNoted && outlook.columns[8]?.status === "mapped" && outlook.columns[8]?.field === "phone"
    && outlook.phoneProblem === null && outlook.refusal === null && validateMapping(outlook.headers, outlook.mapping).ok
    && isParsedContactsFile(outlook.file) && outlook.file.width === 9 && outlook.file !== OUTLOOK_LIKE
    && JSON.stringify(phoneCellsOf(outlook)) === JSON.stringify(OUTLOOK_PICKS)
    && OUTLOOK_LIKE.width === 8 && OUTLOOK_LIKE.rows.every((r) => r.cells.length === 8),
    `${outlook.headers[8] ?? "(no column)"} · ${JSON.stringify(outlook.mapping)} · picks ${JSON.stringify(phoneCellsOf(outlook))}`);

  const google = impl.mappingFor(GOOGLE_LIKE);
  const googleKey = firstMobileIn(phoneCellsOf(google)[0] ?? "")?.number.msisdn ?? null;
  ok(L.G4b, google.headers[6] === GOOGLE_FIRST_MOBILE && google.mapping.phone === 6 && validateMapping(google.headers, google.mapping).ok
    && JSON.stringify(phoneCellsOf(google)) === JSON.stringify(GOOGLE_PICKS) && googleKey === "255712345611"
    && google.columns[3]?.status === "unused" && google.columns[5]?.status === "unused"
    && google.columns[2]?.status === "unknown" && google.columns[4]?.status === "unknown",
    `${google.headers[6] ?? "(no column)"} · picks ${JSON.stringify(phoneCellsOf(google))} · key ${googleKey}`);

  const controls = [ONE_PHONE, NAMBA_SIMU, OUTLOOK_ALL_IN_MOBILE].map((f) => ({ f, m: impl.mappingFor(f) }));
  const added = controls.filter(({ f, m }) => m.file !== f || firstMobileAt(m) >= 0 || m.headers.length !== f.width);
  ok(L.G4c, added.length === 0 && controls[0].m.mapping.phone === 1 && controls[1].m.mapping.phone === 2 && controls[2].m.mapping.phone === 4,
    added.map(({ f, m }) => `${f.fileName}: ${m.headers[m.headers.length - 1]}`).join(" | ")
      || controls.map(({ f, m }) => `${f.fileName} → Phone in column ${m.mapping.phone}`).join(" · "));

  // ── E1 · S15-4's count, for cells and columns ──
  const twoInCell = impl.mappingFor(TWO_IN_CELL);
  const extras = {
    outlook: impl.extraNumbersOf(outlook),
    google: impl.extraNumbersOf(google),
    cell: impl.extraNumbersOf(twoInCell),
    plain: impl.extraNumbersOf(controls[0].m),
    serial: impl.extraNumbersOf(controls[1].m),
  };
  ok(L.E1, JSON.stringify(extras) === JSON.stringify({ outlook: 2, google: 2, cell: 1, plain: 0, serial: 0 })
    && extraNumbersNote(2, "row") === "2 rows hold more than one phone number. One number per person is imported — the first mobile number — and the others are not.",
    JSON.stringify(extras));

  // ── R · real files through the real reader ────────────────────────────────────────────────────
  if (typeof File !== "function") {
    ok(L.R1, false, "this Node has no global File — the reader's file path cannot be driven here");
  } else {
    const csvText = `Phone,Name${CRLF}0712 345 678,Asha${CRLF}0754 123 456,Baraka${CRLF}`;
    const csvBytes = bytesOf(csvText);
    const r1 = await readOne(impl, new File([csvBytes], "contacts.csv", { type: "text/csv" }));
    const last = r1.progress[r1.progress.length - 1] ?? [0, null, 0];
    ok(L.R1, r1.out.kind === "parsed" && r1.out.file.rows.length === 3 && r1.out.digest === sha(csvBytes) && last[0] === csvBytes.length && last[1] === csvBytes.length,
      r1.out.kind === "parsed" ? `${r1.out.file.rows.length} rows · digest ${r1.out.digest.slice(0, 12)}… · progress ${JSON.stringify(last)}` : r1.out.kind);

    const cfb = new Uint8Array(2048);
    cfb.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const r2 = await readOne(impl, new File([cfb], "legacy-97.xls"));
    ok(L.R2, r2.out.kind === "refused" && r2.out.sentence === xlsxRefusalSentence("wrong_format", { kind: "xls" }), JSON.stringify(r2.out).slice(0, 160));

    const big = new Uint8Array(XLSX_MAX_BYTES + 1);
    big.set([0x50, 0x4b, 0x03, 0x04]);
    const r3 = await readOne(impl, new File([big], "big.xlsx"));
    // C3c · a zip head and zeros past the cap: read in the browser, whose zip walk finds no end record.
    ok(L.R3, r3.out.kind === "refused" && r3.out.sentence === xlsxRefusalSentence("unreadable")
      && r3.out.sentence !== xlsxRefusalSentence("too_large", { bytes: XLSX_MAX_BYTES + 1 }), JSON.stringify(r3.out).slice(0, 160));

    const r4 = await readOne(impl, new File([], "empty.csv"));
    ok(L.R4, r4.out.kind === "refused" && r4.out.sentence === EMPTY_FILE_SENTENCE, JSON.stringify(r4.out).slice(0, 160));

    const vcf = ["BEGIN:VCARD", "VERSION:3.0", "FN:Asha", "TEL;TYPE=CELL:0712 345 678", "TEL;TYPE=WORK:0754 123 456", "END:VCARD",
      "BEGIN:VCARD", "VERSION:3.0", "FN:Baraka", "TEL;TYPE=CELL:0688 111 222", "END:VCARD", ""].join(CRLF);
    const r5 = await readOne(impl, new File([bytesOf(vcf)], "phone.vcf"));
    ok(L.R5, r5.out.kind === "parsed" && r5.out.file.format === "vcard" && r5.out.file.rows.length === 2 && r5.out.extraNumbers === 1
      && r5.out.file.notes.includes(extraNumbersNote(1, "card") ?? "-"),
      r5.out.kind === "parsed" ? `${r5.out.file.rows.length} rows · extra ${r5.out.extraNumbers} · notes ${JSON.stringify(r5.out.file.notes)}` : r5.out.kind);

    const stop = new AbortController();
    stop.abort();
    const r6 = await readOne(impl, new File([csvBytes], "contacts.csv"), stop.signal);
    ok(L.R6, r6.out.kind === "aborted", r6.out.kind);

    const line = `0712345678${LF}`;
    const huge = new File([line.repeat(200_003)], "huge.csv");
    const r7 = await readOne(impl, huge);
    ok(L.R7, r7.out.kind === "refused" && r7.out.sentence === READ_TOO_MANY_ROWS, r7.out.kind === "refused" ? r7.out.sentence.slice(0, 80) : r7.out.kind);

    // C3b · G1 · the browser's door: one broken quote at the last record costs that record, never the file.
    const brokenText = `Phone,Name${CRLF}0712 345 678,Asha${CRLF}0754 123 456,${String.fromCharCode(34)}Baraka${CRLF}0688 111 222,Neema${CRLF}`;
    const r8 = await readOne(impl, new File([bytesOf(brokenText)], "broken.csv", { type: "text/csv" }));
    const r8File = r8.out.kind === "parsed" ? r8.out.file : null;
    const r8Staged = r8File === null ? [] : stageRowsOf(r8File, { phone: 0, name: 1 }, 1);
    ok(L.R8, r8File !== null && r8File.rows.length === 2 && r8File.unreadable.length === 1 && r8File.unreadable[0].line === 3
      && r8File.unreadable[0].reason.startsWith("Row 3 opens a quote (") && r8Staged.length === 2 && "readError" in (r8Staged[1] ?? {}),
      r8.out.kind === "parsed" ? `${r8.out.file.rows.length} rows · unreadable ${JSON.stringify(r8.out.file.unreadable)}` : JSON.stringify(r8.out).slice(0, 160));
  }

  // ── C · the commit loop ───────────────────────────────────────────────────────────────────────
  {
    const server = commitServer(2_000, 437);
    const { deps, rec } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    ok(L.C1, out.kind === "done" && rec.shown.length > 2 && rec.shown.every((n) => server.answered.has(n)) && !rec.overrun
      && rec.shown[rec.shown.length - 1] === 2_000,
      `${out.kind} · shown [${rec.shown.join(", ")}] · answered [${[...server.answered].join(", ")}] · overrun ${rec.overrun}`);
    ok(L.C8, out.kind === "done" && JSON.stringify(out.view.totals) === JSON.stringify(server.now().totals) && out.view.committedThrough === 2_000,
      out.kind === "done" ? JSON.stringify(out.view.totals) : out.kind);
  }
  {
    const server = commitServer(2_000, 437);
    const { deps } = commitDeps(server, 2);
    const out = await impl.runCommit(deps, server.now());
    ok(L.C2, out.kind === "stopped" && server.events.join(",") === "step:0,step:437,pause" && server.state().status === "PAUSED"
      && out.view.status === "PAUSED",
      `${out.kind} · ${server.events.join(",")}`);
  }
  {
    const refusal = { refuse: "cancelled" as const, message: SENTENCE.cancelled };
    const server = commitServer(2_000, 437, ["ok", refusal]);
    const { deps } = commitDeps(server);
    const out: CommitOutcome = await impl.runCommit(deps, server.now());
    ok(L.C3, out.kind === "refused" && out.refusal.reason === "cancelled" && out.refusal.message === SENTENCE.cancelled
      && server.events.join(",") === "step:0,step:437",
      `${out.kind} · ${out.kind === "refused" ? out.refusal.message : ""} · ${server.events.join(",")}`);
  }
  {
    // R6 · two busy answers, then the steps: waited out at the backoff's first two steps (the server asked for 2 s, less).
    const s1 = commitServer(874, 437, ["busy", "busy"]);
    const d1 = commitDeps(s1);
    const o1 = await impl.runCommit(d1.deps, s1.now());
    // …and a long spell: seven busy answers in a row are all waited out — 5, 10, 20, then 30 s — and the import finishes.
    const LONG = 7;
    const s2 = commitServer(874, 437, Array.from({ length: LONG }, (): Act => "busy"));
    const d2 = commitDeps(s2);
    const o2 = await impl.runCommit(d2.deps, s2.now());
    const ladder = (n: number): string =>
      Array.from({ length: n }, (_, i) => (BUSY_BACKOFF_SEC[Math.min(i, BUSY_BACKOFF_SEC.length - 1)] ?? 0) * 1000).join(",");
    const told = d1.rec.busy;
    ok(L.C4, o1.kind === "done" && d1.rec.waits.join(",") === ladder(2) && s1.events.length === 4
      && told.length === 3 && told[0]?.message === SENTENCE.busy && told[0]?.waitSec === BUSY_BACKOFF_SEC[0] && told[1]?.attempt === 2 && told[2] === null
      && o2.kind === "done" && d2.rec.waits.join(",") === ladder(LONG) && s2.events.length === LONG + 2,
      `waited out [${d1.rec.waits.join(",")}] in ${s1.events.length} calls, told ${JSON.stringify(told)} · a spell of ${LONG}: ${o2.kind} after ${s2.events.length} calls, waits [${d2.rec.waits.join(",")}]`);
    // R6 · the server's own figure wins when it is longer than the step — and a figure past the ceiling is cut to it.
    const s4 = commitServer(874, 437, [{ busyFor: 45 }, { busyFor: 3_600 }]);
    const d4 = commitDeps(s4);
    const o4 = await impl.runCommit(d4.deps, s4.now());
    ok(L.C4a, o4.kind === "done" && d4.rec.waits.join(",") === `45000,${BUSY_WAIT_MAX_SEC * 1000}`, `${o4.kind} · waits [${d4.rec.waits.join(",")}]`);
    const s3 = commitServer(874, 437, ["rate"]);
    const d3 = commitDeps(s3);
    const o3 = await impl.runCommit(d3.deps, s3.now());
    ok(L.C4b, o3.kind === "refused" && o3.refusal.reason === "rate_limited" && s3.events.length === 1 && d3.rec.waits.length === 0,
      `${o3.kind} · ${s3.events.join(",")} · waits ${d3.rec.waits.length}`);
    // R6 · Stop pressed during a spell (after the third ask): the run is paused at once — not when the platform frees up.
    const s5 = commitServer(874, 437, Array.from({ length: 8 }, (): Act => "busy"));
    const d5 = commitDeps(s5, 3);
    const o5 = await impl.runCommit(d5.deps, s5.now());
    ok(L.C4c, o5.kind === "stopped" && s5.events.join(",") === "step:0,step:0,step:0,pause" && d5.rec.waits.length === 3 && s5.state().status === "PAUSED",
      `${o5.kind} · ${s5.events.join(",")} · waits ${d5.rec.waits.length}`);
  }
  {
    const server = commitServer(1_311, 437, ["ok", "throw"]);
    const { deps } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    const at = server.events.indexOf("step:437");
    ok(L.C5, out.kind === "done" && at >= 0 && server.events[at + 1] === "view" && server.events[at + 2] === "step:437",
      `${out.kind} · ${server.events.join(",")}`);
    const skew = commitServer(1_311, 437, ["skew"], 0, "skew");
    const sk = commitDeps(skew);
    const so = await impl.runCommit(sk.deps, skew.now());
    ok(L.C5b, so.kind === "failed" && so.skew && skew.events.join(",") === "step:0,view", `${so.kind} · ${so.kind === "failed" ? so.skew : ""} · ${skew.events.join(",")}`);
  }
  {
    const server = commitServer(2_000, 437, ["ok", { moveTo: 1_311 }]);
    const { deps, rec } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    const after = server.events.indexOf("step:437");
    ok(L.C6, out.kind === "done" && rec.shown.includes(1_311) && server.events[after + 1] === "step:1311" && !rec.overrun,
      `${out.kind} · ${server.events.join(",")} · shown [${rec.shown.join(", ")}]`);
  }
  {
    const server = commitServer(2_000, 437, [], 1_200);
    const { deps } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    ok(L.C7, out.kind === "done" && server.events[0] === "step:1200", `${out.kind} · ${server.events.join(",")}`);
  }
  {
    const server = commitServer(2_000, 437, ["stuck", "stuck", "stuck", "stuck", "stuck"]);
    const { deps } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    ok(L.C9, out.kind === "stalled" && server.events.length === STALL_LIMIT, `${out.kind} · ${server.events.length} calls`);
  }
  {
    // R4 · the call throws and so does the view after it: each loop's failure carries no view — never the cursor it held.
    const server = commitServer(1_311, 437, ["ok", "throw"], 0, "fail");
    const { deps } = commitDeps(server);
    const out = await impl.runCommit(deps, server.now());
    const stage = stageServer(5_000, 0, ["ok", "throw"], true);
    const up = await impl.runUpload(uploadDeps(stage), records(5_000), stage.now());
    const shownOf = (v: ImportRunView | null): string => (v === null ? "none" : `${v.stagedThrough}/${v.committedThrough}`);
    ok(L.C10, out.kind === "failed" && !out.skew && out.view === null && up.kind === "failed" && !up.skew && up.view === null,
      `commit ${out.kind}${out.kind === "failed" ? ` (view ${shownOf(out.view)})` : ""} · upload ${up.kind}${up.kind === "failed" ? ` (view ${shownOf(up.view)})` : ""}`);
  }

  // ── U · the upload loop ───────────────────────────────────────────────────────────────────────
  {
    const rows = records(5_000);
    const server = stageServer(5_000, 2_000);
    const out: UploadOutcome = await impl.runUpload(uploadDeps(server), rows, server.now());
    const first = server.batches[0];
    ok(L.U1, out.kind === "staged" && first !== undefined && first.from === 2_001 && first.rows[0].line === rows[2_000].line,
      `${out.kind} · first batch from ${first?.from} line ${first?.rows[0]?.line}`);
  }
  {
    const rows = records(5_000);
    const server = stageServer(5_000, 0, ["already"]);
    const out = await impl.runUpload(uploadDeps(server), rows, server.now());
    ok(L.U2, out.kind === "staged" && server.events[0] === "stage:1" && server.events[1] === "view" && server.events[2] === "stage:2001",
      `${out.kind} · ${server.events.join(",")}`);
  }
  {
    const rows = records(1_500);
    const server = stageServer(1_500, 0, ["staged-refusal"]);
    const out = await impl.runUpload(uploadDeps(server), rows, server.now());
    ok(L.U3, out.kind === "staged" && out.view.status === "STAGED", out.kind === "refused" ? `refused · ${out.refusal.reason}` : out.kind);
  }
  {
    const rows = records(5_000);
    const server = stageServer(5_000);
    const out = await impl.runUpload(uploadDeps(server), rows, server.now());
    let next = 1;
    let contiguous = true;
    const lines: number[] = [];
    for (const b of server.batches) {
      if (b.from !== next || b.rows.length > STAGE_BATCH_MAX_ROWS || b.rows.length === 0) contiguous = false;
      next = b.from + b.rows.length;
      for (const r of b.rows) lines.push(r.line);
    }
    ok(L.U4, out.kind === "staged" && contiguous && lines.length === rows.length && lines.every((l, i) => l === rows[i].line),
      `${out.kind} · batches [${server.batches.map((b) => `${b.from}+${b.rows.length}`).join(", ")}]`);
  }
  log(`flow: busy is waited out at ${BUSY_BACKOFF_SEC.join(" → ")} s without giving up (at most ${BUSY_WAIT_MAX_SEC} s a wait); a loop stops after ${STALL_LIMIT} answers that do not move`);
}

/* ══ THE RED PLANTS — each defect wrapped around the shipped function, in memory ═════════════════════ */

const PLANTS: readonly RedPlant<FlowImpl>[] = [
  {
    name: "import-read.ts imports the server store",
    expect: L.W0,
    impl: () => ({ ...real(), sources: { ...real().sources, read: `import { db } from "@/lib/server/store";${LF}${real().sources.read}` } }),
  },
  {
    name: "the list paste loses the name (the rest of the line is not read)",
    expect: L.P1,
    impl: () => ({ ...real(), parsePaste: (t) => { const f = parsePastedText(t); return { ...f, rows: f.rows.map((r) => ({ ...r, cells: [r.cells[0], ""] })) }; } }),
  },
  {
    name: "a pasted line with no number is dropped silently",
    expect: L.P1b,
    impl: () => ({ ...real(), parsePaste: (t) => ({ ...parsePastedText(t), unreadable: [] }) }),
  },
  {
    name: "a line with two numbers keeps the LAST one",
    expect: L.P1c,
    impl: () => ({
      ...real(),
      parsePaste: (t) => {
        const f = parsePastedText(t);
        return { ...f, rows: f.rows.map((r) => (r.line === 7 ? { ...r, cells: ["+254 712 345 678", r.cells[1]] } : r)) };
      },
    }),
  },
  {
    name: "a tab paste is read as a list (the tab ignored)",
    expect: L.P2,
    impl: () => ({ ...real(), parsePaste: (t) => parsePastedText(t.split(TAB).join(" ")) }),
  },
  {
    name: "a TAB paste keeps the CSV reader's one unreadable record — the lines after a broken quote are cut from the paste",
    expect: L.P2b,
    impl: () => ({
      ...real(),
      parsePaste: (t) => {
        if (isListPaste(t)) return parsePastedText(t);
        const read = parseCsv(t, { delimiter: "tab" });
        return read.ok ? { ...read.file, format: "paste", fileName: null } : parsePastedText(t);
      },
    }),
  },
  {
    name: "a list paste is header-matched like a file (no Phone column)",
    expect: L.P3,
    impl: () => ({ ...real(), mappingFor: (f, o) => mappingFor(f, { ...(o ?? {}), list: false }) }),
  },
  {
    name: "S15-5 undone — a headerless file is refused with the old 'Add a header row'",
    expect: L.M1,
    impl: () => ({ ...real(), mappingFor: (f, o) => { const m = mappingFor(f, o); return m.headerless ? { ...m, headerless: false, headerRows: 1, refusal: "Add a header row and upload it again." } : m; } }),
  },
  {
    name: "the officer's word on the first row is ignored",
    expect: L.M2,
    impl: () => ({ ...real(), mappingFor: (f, o) => mappingFor(f, { list: o?.list }) }),
  },
  {
    name: "a masked export read 'as contacts' is let through",
    expect: L.M3,
    impl: () => ({ ...real(), mappingFor: (f, o) => { const m = mappingFor(f, o); return o?.firstRow === "contact" ? { ...m, refusal: null, headerless: true, headerRows: 0 } : m; } }),
  },
  {
    name: "the header row is not padded (a wider data row's column cannot be mapped)",
    expect: L.M4,
    impl: () => ({ ...real(), mappingFor: (f, o) => { const m = mappingFor(f, o); return { ...m, headers: m.headers.slice(0, f.rows[0]?.cells.length ?? 0) }; } }),
  },
  {
    name: "the preview shows a cell as typed — a whole number on screen",
    expect: L.M5,
    impl: () => ({ ...real(), previewCell: (c) => c }),
  },
  {
    name: "C3b G4 undone — several phone columns read as before: the mobile only in Business or Primary Phone is lost",
    expect: L.G4a,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const at = firstMobileAt(m);
        if (at < 0) return m;
        const headers = m.headers.slice(0, at);
        const auto = autoMapHeaders(headers);
        return { ...m, headers, mapping: { ...auto.mapping }, columns: auto.columns, file: f };
      },
    }),
  },
  {
    name: "the first-mobile column reads only the main phone column — no fallback to the others",
    expect: L.G4a,
    impl: () => ({ ...real(), mappingFor: (f, o) => rebuildFirstMobile(mappingFor(f, o), (cells, _order, main) => cells[main] ?? "") }),
  },
  {
    name: "the first-mobile column takes the LAST mobile among the phone columns (a Car Phone over the Mobile one)",
    expect: L.G4a,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => rebuildFirstMobile(mappingFor(f, o), (cells, order, main) => {
        const hits = order.filter((i) => firstMobileIn(cells[i] ?? "") !== null);
        return cells[hits.length > 0 ? hits[hits.length - 1] : main] ?? "";
      }),
    }),
  },
  {
    name: "the first-mobile column asks only whether a WHOLE cell is a number — a ' ::: ' cell passed over for Phone 2's (G3 skipped)",
    expect: L.G4b,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => rebuildFirstMobile(mappingFor(f, o), (cells, order, main) => {
        const hit = order.find((i) => parseTzNumber(cells[i] ?? "").verdict === "ok");
        return cells[hit ?? main] ?? "";
      }),
    }),
  },
  {
    name: "a first-mobile column added to every file with a phone column — the reading never the file as read",
    expect: L.G4c,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const main = m.mapping.phone;
        if (m.headerRows !== 1 || main === undefined || firstMobileAt(m) >= 0) return m;
        const width = m.headers.length;
        const header = `${FIRST_MOBILE_HEADER_START}${m.headers[main]})`;
        const rows = m.file.rows.map((row, r) => ({
          line: row.line,
          cells: [...Array.from({ length: width }, (_, i) => row.cells[i] ?? ""), r === 0 ? header : row.cells[main] ?? ""],
        }));
        return { ...m, headers: [...m.headers, header], mapping: { ...m.mapping, phone: width }, file: { ...m.file, rows, width: width + 1 } };
      },
    }),
  },
  {
    name: "the digest is taken over the decoded text, not the file's bytes",
    expect: L.R1,
    impl: () => ({
      ...real(),
      readFile: async (f, o) => { const out = await readContactsFile(f, o); return out.kind === "parsed" ? { ...out, digest: sha(bytesOf(out.file.rows.map((r) => r.cells.join(",")).join(LF))) } : out; },
    }),
  },
  {
    name: "an old .xls is sent on as if it were a workbook",
    expect: L.R2,
    impl: () => ({ ...real(), readFile: async (f, o) => (f.name.endsWith(".xls") ? { kind: "xlsx", base64: "", digest: DIGEST, fileName: f.name } : readContactsFile(f, o)) }),
  },
  {
    name: "an Excel file over the cap is uploaded anyway",
    expect: L.R3,
    impl: () => ({ ...real(), readFile: async (f, o) => (f.size > XLSX_MAX_BYTES ? { kind: "xlsx", base64: "", digest: DIGEST, fileName: f.name } : readContactsFile(f, o)) }),
  },
  {
    name: "an empty file reads as a file with no rows",
    expect: L.R4,
    impl: () => ({ ...real(), readFile: async (f, o) => (f.size === 0 ? { kind: "parsed", file: { format: "csv", fileName: f.name, rows: [], width: 0, blankRows: 0, notes: [], unreadable: [] }, digest: DIGEST, extraNumbers: 0 } : readContactsFile(f, o)) }),
  },
  {
    name: "the second number on a card is dropped without a word",
    expect: L.R5,
    impl: () => ({ ...real(), readFile: async (f, o) => { const out = await readContactsFile(f, o); return out.kind === "parsed" ? { ...out, extraNumbers: 0, file: { ...out.file, notes: [] } } : out; } }),
  },
  {
    name: "an aborted read carries on to the end",
    expect: L.R6,
    impl: () => ({ ...real(), readFile: (f, o) => readContactsFile(f, { onProgress: o.onProgress }) }),
  },
  {
    name: "S15-4's count reads only the phone column — the numbers in the other phone columns go unsaid",
    expect: L.E1,
    impl: () => ({
      ...real(),
      extraNumbersOf: (r) => extraNumbersOf({ ...r, headers: r.headers.map((h) => (h.startsWith(FIRST_MOBILE_HEADER_START) ? "Phone" : h)) }),
    }),
  },
  {
    name: "S15-4's count takes every part of a cell as a number — an extension counted as a second number",
    expect: L.E1,
    impl: () => ({
      ...real(),
      extraNumbersOf: (r) => r.file.rows.slice(r.headerRows).filter((row) => phoneCellParts(row.cells[r.mapping.phone ?? -1] ?? "").length > 1).length,
    }),
  },
  {
    name: "C3b G1 undone at the door — a CSV with one broken quote is refused whole",
    expect: L.R8,
    impl: () => ({
      ...real(),
      readFile: async (f, o) => {
        const out = await readContactsFile(f, o);
        return out.kind === "parsed" && out.file.unreadable.length > 0 && out.file.format === "csv"
          ? { kind: "refused", sentence: "Row 3 opens a quotation mark that is never closed.", cause: "csv" }
          : out;
      },
    }),
  },
  {
    name: "a file past the cap is read whole and handed on",
    expect: L.R7,
    impl: () => ({ ...real(), readFile: async (f, o) => { const out = await readContactsFile(f, o); return out.kind === "refused" && out.sentence === READ_TOO_MANY_ROWS ? { kind: "parsed", file: parsePastedText("0712345678"), digest: DIGEST, extraNumbers: 0 } : out; } }),
  },
  {
    name: "the bar moves on before the answer (cursor + 500, a guess)",
    expect: L.C1,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, step: async (input) => { deps.onView({ ...start, committedThrough: input.fromCursor + 500 }); return deps.step(input); } }, start) }),
  },
  {
    name: "Stop is never read",
    expect: L.C2,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, shouldStop: () => false }, start) }),
  },
  {
    name: "Stop stops without pausing the run on the server",
    expect: L.C2,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, pause: async (input) => ({ ok: true, view: { ...start, id: input.runId, status: "PAUSED" } }) }, start) }),
  },
  {
    name: "a refusal is said in the dialog's own words, not the server's",
    expect: L.C3,
    impl: () => ({ ...real(), runCommit: async (deps, start) => { const out = await runCommit(deps, start); return out.kind === "refused" ? { ...out, refusal: { ...out.refusal, message: "Import failed." } } : out; } }),
  },
  {
    name: "R6 undone — busy is given up after three answers in a row (the fourth ends the loop)",
    expect: L.C4,
    impl: () => ({
      ...real(),
      runCommit: (deps, start) => {
        let inRow = 0;
        return runCommit({
          ...deps,
          step: async (input) => {
            const r = await deps.step(input);
            inRow = !r.ok && r.reason === "busy" ? inRow + 1 : 0;
            return inRow > 3 && !r.ok ? { ...r, reason: "server_error" as const } : r;
          },
        }, start);
      },
    }),
  },
  {
    name: "busy is retried at once, ignoring the backoff",
    expect: L.C4,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, wait: () => deps.wait(0) }, start) }),
  },
  {
    name: "the backoff never grows (5 s every time)",
    expect: L.C4,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, wait: (ms) => deps.wait(Math.min(ms, 5_000)) }, start) }),
  },
  {
    name: "the busy spell is waited out in silence (the screen is never told why the bar stands still)",
    expect: L.C4,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, onBusy: () => undefined }, start) }),
  },
  {
    name: "the server's longer retryAfterSec is cut to the backoff's step",
    expect: L.C4a,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, wait: (ms) => deps.wait(Math.min(ms, 30_000)) }, start) }),
  },
  {
    name: "a server's hour-long retryAfterSec is waited out in full (no ceiling)",
    expect: L.C4a,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, wait: (ms) => deps.wait(ms === BUSY_WAIT_MAX_SEC * 1000 ? 3_600_000 : ms) }, start) }),
  },
  {
    name: "Stop is held back until the busy spell ends",
    expect: L.C4c,
    impl: () => ({
      ...real(),
      runCommit: (deps, start) => {
        let lastBusy = false;
        return runCommit({
          ...deps,
          step: async (input) => {
            const r = await deps.step(input);
            lastBusy = !r.ok && r.reason === "busy";
            return r;
          },
          shouldStop: () => !lastBusy && deps.shouldStop(),
        }, start);
      },
    }),
  },
  {
    name: "rate_limited is retried as if it were busy",
    expect: L.C4b,
    impl: () => ({
      ...real(),
      runCommit: async (deps, start) => {
        const out = await runCommit(deps, start);
        return out.kind === "refused" && out.refusal.reason === "rate_limited" ? runCommit(deps, start) : out;
      },
    }),
  },
  {
    name: "a thrown step is repeated blind",
    expect: L.C5,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, step: async (input) => { try { return await deps.step(input); } catch { return deps.step(input); } } }, start) }),
  },
  {
    name: "a deploy is reported as an ordinary failure",
    expect: L.C5b,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, isDeploySkew: () => false }, start) }),
  },
  {
    name: "a moved answer is counted on (the batch added to the server's cursor)",
    expect: L.C6,
    impl: () => ({
      ...real(),
      runCommit: (deps, start) => runCommit({
        ...deps,
        step: async (input) => {
          const r = await deps.step(input);
          return r.ok && r.kind === "moved" ? { ...r, view: { ...r.view, committedThrough: r.view.committedThrough + 437 } } : r;
        },
      }, start),
    }),
  },
  {
    name: "a resume starts again from row 0",
    expect: L.C7,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit(deps, { ...start, committedThrough: 0 }) }),
  },
  {
    name: "the result's counts are made up from the cursor",
    expect: L.C8,
    impl: () => ({ ...real(), runCommit: async (deps, start) => { const out = await runCommit(deps, start); return out.kind === "done" ? { ...out, view: { ...out.view, totals: { ...out.view.totals, create: 0, update: out.view.committedThrough } } } : out; } }),
  },
  {
    name: "a loop that stops moving is called done",
    expect: L.C9,
    impl: () => ({ ...real(), runCommit: async (deps, start) => { const out = await runCommit(deps, start); return out.kind === "stalled" ? { kind: "done", view: out.view, note: null } : out; } }),
  },
  {
    name: "R4 undone — a commit that failed unread hands back the cursor it started from as where the run stands",
    expect: L.C10,
    impl: () => ({ ...real(), runCommit: async (deps, start) => { const out = await runCommit(deps, start); return out.kind === "failed" && out.view === null ? { ...out, view: start } : out; } }),
  },
  {
    name: "R4 undone — an upload that failed unread hands back the cursor it started from as where the run stands",
    expect: L.C10,
    impl: () => ({ ...real(), runUpload: async (deps, rows, start) => { const out = await runUpload(deps, rows, start); return out.kind === "failed" && out.view === null ? { ...out, view: start } : out; } }),
  },
  {
    name: "the upload starts again from record 1",
    expect: L.U1,
    impl: () => ({ ...real(), runUpload: (deps, rows, start) => runUpload(deps, rows, { ...start, nextFrom: 1, stagedThrough: 0 }) }),
  },
  {
    name: "already_staged is treated as a refusal",
    expect: L.U2,
    impl: () => ({
      ...real(),
      runUpload: (deps, rows, start) => runUpload({
        ...deps,
        stage: async (input) => { const r = await deps.stage(input); return !r.ok && r.reason === "already_staged" ? { ...r, reason: "bad_rows", view: null } : r; },
      }, rows, start),
    }),
  },
  {
    name: "a refusal's STAGED view is ignored",
    expect: L.U3,
    impl: () => ({
      ...real(),
      runUpload: (deps, rows, start) => runUpload({ ...deps, stage: async (input) => { const r = await deps.stage(input); return r.ok ? r : { ...r, view: null }; } }, rows, start),
    }),
  },
  {
    name: "the whole file is sent in one call, past the caps",
    expect: L.U4,
    impl: () => ({
      ...real(),
      runUpload: async (deps, rows, start) => {
        const r = await deps.stage({ importId: start.id, fileDigest: start.fileDigest, from: start.nextFrom ?? 1, rows: [...rows] });
        return r.ok ? { kind: r.view.status === "STAGED" ? "staged" : "elsewhere", view: r.view } : { kind: "refused", refusal: r };
      },
    }),
  },
];

export const flowSection: ImportSection<FlowImpl> = {
  name: "flow",
  owner: "S15",
  real,
  run,
  plants: PLANTS,
};
