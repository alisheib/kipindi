/**
 * test:contacts-import · section "flow" — S15's browser side of the importer: the reader (`src/lib/contacts/import-read.ts`)
 * and the ONE loop driver (`src/lib/contacts/import-loop.ts`).                                        (S15 · C3–C4, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. The paste is parsed in both of its modes (a list from a chat, cells copied from a sheet), a
 * headerless file is mapped (S15-5), a masked export stays refused whatever the officer says about its first row, every
 * preview is masked, and real `File`s are read through the real streamed reader — a CSV and its digest, an old .xls, an
 * Excel file over the cap, an empty file, a vCard with two numbers on a card, an aborted read, a file past the run's cap.
 * ⭐ C3b: a CSV with one broken quote at its end is read with that record unreadable (G1, R8) while a TAB paste with one
 * is split by hand (P2b); Outlook's and Google's several phone columns gain ONE added column read as Phone (G4a, G4b) —
 * under the review round's D2 only the person's OWN phone columns, never Assistant's or Company Main Phone nor a weak
 * "Namba", and under D3 only for a row whose phone column yields no mobile, carrying ALL its other mobiles when there
 * are two or more so the server's one rule refuses the row — and a file that would gain nothing gains none (G4c); D3
 * also removed S15-4's count over a file's rows (E1: no mobile is left out silently, so there is none to count).
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
  ADDED_PHONE_HEADER_START,
  ADDED_PHONE_SOURCE_NOTE,
  PASTE_LINE_NO_NUMBER,
  PASTE_LIST_NOTE,
  READ_TOO_MANY_ROWS,
  extraNumbersNote,
  isListPaste,
  isPhoneColumnHeader,
  mappingFor,
  parsePastedText,
  previewCell,
  readContactsFile,
  type FileMapping,
  type ReadOutcome,
} from "../../src/lib/contacts/import-read.ts";
import { SEVERAL_MOBILES_SENTENCE, firstMobileIn, mobilesIn, phoneCellRefusal } from "../../src/lib/contacts/phone-cell.ts";
import { CHECK, DONE, partsText, sumCutOf } from "../../src/app/admin/contacts/import/import-copy.ts";
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
import { CONTACT_MASKED_FILE, autoMapHeaders, contactExportHeader, scrubPhoneRuns, validateMapping } from "../../src/lib/contacts/contact-fields.ts";
import { maskPhone } from "../../src/lib/phone-normalize.ts";
import { STAGE_BATCH_MAX_ROWS, stageRowsOf, type StageRowInput } from "../../src/lib/contacts/import-limits.ts";
import { EMPTY_FILE_SENTENCE, csvRefusalSentence, parseCsv, stripBom } from "../../src/lib/contacts/import-parse.ts";
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
const json = (v: unknown): string => JSON.stringify(v);

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type FlowImpl = {
  readonly parsePaste: typeof parsePastedText;
  readonly mappingFor: typeof mappingFor;
  readonly previewCell: typeof previewCell;
  readonly readFile: typeof readContactsFile;
  readonly runCommit: typeof runCommit;
  readonly runUpload: typeof runUpload;
  readonly isSkew: typeof isDeploySkewError;
  /** The reader, the loop and (C3b-fix · D3) the dialog that opens a run with S15-4's count — decommented. */
  readonly sources: { readonly read: string; readonly loop: string; readonly dialog: string };
  /** C3b-fix · D5d · the check's and the result's sum lines, and the ONE rule for how they end. */
  readonly sums: { readonly check: typeof CHECK.sum; readonly done: typeof DONE.sum; readonly cutOf: typeof sumCutOf };
};

const read = (rel: string): string => decomment(readFileSync(join(REPO_ROOT, rel), "utf8")).split(CRLF).join(LF);

let cached: FlowImpl | null = null;
function real(): FlowImpl {
  if (cached) return cached;
  cached = {
    parsePaste: parsePastedText,
    mappingFor,
    previewCell,
    readFile: readContactsFile,
    runCommit,
    runUpload,
    isSkew: isDeploySkewError,
    sources: {
      read: read("src/lib/contacts/import-read.ts"),
      loop: read("src/lib/contacts/import-loop.ts"),
      dialog: read("src/app/admin/contacts/import/contacts-import-dialog.tsx"),
    },
    sums: { check: CHECK.sum, done: DONE.sum, cutOf: sumCutOf },
  };
  return cached;
}

/* ══ THE LABELS ═════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  W0: "W0 · ⛔ PURE — import-read.ts and import-loop.ts carry no directive and import only src/lib/contacts modules (the ONE phone-cell rule among them), tz-msisdn and phone-normalize (the loop: import-limits and import-flow alone)",
  P1: "P1 · ⭐ a LIST paste: each line's first number is the Phone cell and the rest of the line the Name (a chat's stamp, an enumeration and separators dropped), lines numbered as pasted, a blank line counted",
  P1b: "P1b · a pasted line with no number is listed as unreadable with its row and the reader's sentence — never dropped",
  P1c: "P1c · ⭐ S15-4 · a line with a second number keeps the FIRST, and the paste's note names that row; a foreign number yields to a Tanzanian one on its line",
  P1d: "P1d · ⛔ C8c · D4 IN THE LIST PASTE — a pasted line's number is read in the CELL it was written in, by the ONE rule: 'Asha +254, 712 345 678' (the line the fix builder found), '254/712345678 Juma', 'Baraka 00254; 712345678' and 'Neema +254 or 712 345 678' stage their whole cell — the server's own rule reads NO mobile in it and never the stranger's 255712345678, its sentence the Kenyan or the too-long one — each name without the code; CONTROLS: 'Asha 712 345 678' and '712345678' (a whole cell of nine digits, Excel's dropped 0) still read 255712345678, and '12. 0712 345 678 Asha', '255, 0712 345 678 Asha' and '0712 345 678 / 0754 111 222 Asha' their first mobile, as before",
  P2: "P2 · a TAB paste is an Excel copy: cells split on the tab with Excel's quoting, a blank line counted, its first row header-matched (Phone, Name; one header row)",
  P2b: "P2b · ⭐ C3b · a TAB paste whose quotation mark never closes is split by hand — every line kept, its quotation marks as typed, nothing unreadable — never cut by the CSV reader's one unreadable record (G1)",
  P3: "P3 · a list paste maps Phone and Name with no header row, named as the field list names them — never \"Column A…\", never read as a headerless file — and U28's validateMapping passes it",
  P4: "P4 · ⭐ C3b-fix · D7 — a TAB paste copied with two title rows above its column names: the titles leave the data (lines 3–5 kept as pasted), ONE note names rows 1–2 and never their words, and the column names map Phone and Name with one header row",
  M1: "M1 · ⭐ S15-5 · a file whose first row is a contact is READ: \"Column A…\" headers, the phone, email and name columns found from the cells, no header row — row 1 staged too",
  M2: "M2 · the officer's word on the first row turns the reading over both ways (\"header\" reads it as names again)",
  M3: "M3 · ⛔ a masked export stays refused in U28's words — even when the officer says its first row is a contact",
  M4: "M4 · a header row narrower than the file is padded to the widest row, so every column can be mapped",
  M5: "M5 · ⛔ NO NUMBER WHOLE — C3b-fix · D9: a cell holding SEVEN or more digits in total, whatever separates them (Excel's thousands commas \"255,757,300,014\", slashes \"0712/345/678\", letters, a date's dashes), is masked whole: its one mobile as +255••••NN, else four bullets and its last two digits; plain text and a cell of six digits or fewer are untouched; no preview ever holds seven digits",
  G4a: "G4a · ⭐ C3b · G4 under C3b-fix D2 and D3 — an Outlook export gains ONE column, “Phone (read from: Mobile Phone, Business Phone, Car Phone and 2 more)”, read as Phone: the Mobile Phone cell whenever it yields a mobile (a Car Phone or Assistant's mobile beside it never read); else the ONE mobile of the person's other OWN phone columns (Business, Primary — the same mobile twice counted once); else the Mobile cell as it was; two DISTINCT mobiles there are carried together, and the server's one rule refuses them with its several-mobiles sentence; ⛔ Assistant's and Company Main Phone are never read nor named; the original columns stay, read as nothing, each saying why; validateMapping passes it, the file is valid and the file as read is untouched",
  G4b: "G4b · ⭐ C3b · G4 under D3 — Google's export: a Phone 1 - Value cell joining two DISTINCT mobiles with ' ::: ' yields none, so Phone 2 - Value is read too and all three mobiles are carried, refused by the server's one rule; a row whose mobile is only in Phone 2 - Value reads Phone 2's; the same mobile twice in Phone 1 is that mobile; the Label columns are never phone columns",
  G4c: "G4c · ⛔ CONTROL · G4 — a plain file with one phone column, a serial Namba beside a Simu column that holds every mobile, ⛔ a WEAK Namba column holding a mobile where Simu is empty (D2: never read unless it is the Phone column), an Outlook export whose every mobile is in Mobile Phone, and one whose only other mobiles sit in Assistant's and Company Main Phone (D2) gain NO column: the reading is the file as read, Phone where U28 put it",
  E1: "E1 · ⛔ C3b-fix · D3 — the S15-4 count is NEVER taken over a file's rows: import-read.ts exports no row counter and no \"row\" unit, and the dialog opens a run with the reader's own count (a vCard's cards, a list paste's lines) — a row holding two or more mobiles is refused by the server's rule, so no mobile is left out silently",
  R1: "R1 · a CSV File is STREAMED into the reader: its rows read, its digest the sha-256 of its exact bytes, progress reported in bytes",
  R2: "R2 · an old .xls is refused before anything is uploaded, in xlsx-limits' own sentence",
  R3: "R3 · ⛔ an Excel file over the cap is refused BEFORE it is uploaded, its size named (too_large)",
  R4: "R4 · an empty file is refused with the empty-file sentence",
  R5: "R5 · ⭐ S15-4 · a vCard card with two numbers yields one row, the count of such cards, and the note that says it",
  R6: "R6 · an aborted read comes back aborted — nothing kept",
  R7: "R7 · ⛔ CRASH CONTROL · a file past the run's cap stops being read and says how to split it",
  R8: "R8 · ⭐ C3b · G1 — a CSV File whose LAST record opens a quotation mark never closed is READ, not refused: its rows kept, that record listed unreadable on its own line with the reader's sentence, and both staged — ⭐ C3b-fix · D5: the outcome carries the row and the ONE line the quote swallowed, and the file's note says it",
  R9: "R9 · ⭐ C3b-fix · D5d — the check's and the result's sum lines never claim \"every row of your file is counted once\" when a quote never closed swallowed lines: they count every row UP TO that row and say how many lines after it were not read; a run this tab did not read whose CSV holds an unreadable record claims only the rows read; a quote that swallowed nothing, and every other run, keep the whole-file claim",
  R10: "R10 · ⭐ C3b-fix · D7 at the CSV door — a CSV File whose first row is a title reads from its column names (row 2 the header, row 3 its contact, ONE note naming row 1), and ⛔ D5e after the title leaves: a title, the column names and a broken quote with no data row before it is refused whole, in the reader's own sentence, never read as a file of no contacts",
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
/** C3b-fix · D7 at the paste: two title rows copied with the table, the column names on the third line. */
const TAB_TITLED = [
  "Orodha ya wateja", `Imeandaliwa na ofisi${TAB}Oktoba`, `Jina${TAB}Simu`, `Asha${TAB}0712 345 678`, `Baraka${TAB}0754 123 456`,
].join(CRLF);
/** The title note for rows 1–2 — a LITERAL (the en dash from its code). */
const TITLE_NOTE_1_2 = `Rows 1${String.fromCharCode(0x2013)}2, above the column names, were not read — a title.`;
const TITLE_NOTE_1 = "Row 1, above the column names, was not read — a title.";

/* ── C3b · G4 under C3b-fix · D2 and D3 · several phone columns ── */
const OUTLOOK_HEADER = [
  "First Name", "Last Name", "Assistant's Phone", "Business Phone", "Car Phone", "Company Main Phone", "Home Phone", "Mobile Phone",
  "Primary Phone", "E-mail Address",
];
/** One Outlook row: a name, then each phone column by its header, the rest empty. */
const outlookRow = (line: number, first: string, phones: Readonly<Record<string, string>>, email = ""): { line: number; cells: string[] } => ({
  line,
  cells: OUTLOOK_HEADER.map((h, i) => (i === 0 ? first : i === 1 ? "Mtei" : h === "E-mail Address" ? email : phones[h] ?? "")),
});
/** Outlook's shape, every case on its own line: the Mobile Phone cell yields (with a landline, a Car Phone mobile, an
 *  Assistant's mobile beside it — never read); the mobile only in Business or Primary Phone; no mobile anywhere; TWO
 *  distinct mobiles in Business and Home Phone; the SAME mobile in Business and Primary Phone; ⛔ mobiles only in
 *  Assistant's and Company Main Phone — another person's lines (D2). */
const OUTLOOK_LIKE: ParsedContactsFile = {
  format: "csv", fileName: "outlook.csv", width: 10, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: [...OUTLOOK_HEADER] },
    outlookRow(2, "Asha", { "Mobile Phone": "0712 345 601" }, "asha@example.com"),
    outlookRow(3, "Baraka", { "Business Phone": "0754 345 602" }),
    outlookRow(4, "Neema", { "Home Phone": "022 211 3456", "Mobile Phone": "0688 345 603" }),
    outlookRow(5, "Juma", { "Primary Phone": "0765 345 604" }),
    outlookRow(6, "Rehema", { "Mobile Phone": "0713 345 605", "Car Phone": "0714 345 606" }),
    outlookRow(7, "Zawadi", { "Home Phone": "022 211 3457" }),
    outlookRow(8, "Hassani", { "Business Phone": "+254 712 345 678" }),
    outlookRow(9, "Upendo", { "Business Phone": "0754 345 607", "Home Phone": "0688 345 608" }),
    outlookRow(10, "Faraji", { "Business Phone": "0754 345 609", "Primary Phone": "+255 754 345 609" }),
    outlookRow(11, "Saidi", { "Assistant's Phone": "0715 345 610", "Company Main Phone": "0716 345 611" }),
    outlookRow(12, "Halima", { "Mobile Phone": "0717 345 612", "Assistant's Phone": "0718 345 613" }),
  ],
};
/** The added column's cells for lines 2–12, and its header — LITERALS, decided by hand. Line 9 carries BOTH mobiles in
 *  their compact spelling, for the server's one rule to refuse; lines 7, 8 and 11 keep the (empty) Mobile Phone cell. */
const OUTLOOK_PICKS = [
  "0712 345 601", "0754 345 602", "0688 345 603", "0765 345 604", "0713 345 605", "", "", "0754345607 / 0688345608", "0754 345 609", "",
  "0717 345 612",
];
const OUTLOOK_ADDED = "Phone (read from: Mobile Phone, Business Phone, Car Phone and 2 more)";
/** The same export with every mobile in Mobile Phone (a Home landline and a Car mobile beside two of them): no column. */
const OUTLOOK_ALL_IN_MOBILE: ParsedContactsFile = { ...OUTLOOK_LIKE, rows: [OUTLOOK_LIKE.rows[0], OUTLOOK_LIKE.rows[1], OUTLOOK_LIKE.rows[3], OUTLOOK_LIKE.rows[5]] };
/** ⛔ D2 · an export whose only mobiles sit in Assistant's and Company Main Phone, and one beside a Mobile Phone mobile:
 *  never read — no column. */
const OUTLOOK_OTHERS_ONLY: ParsedContactsFile = { ...OUTLOOK_LIKE, rows: [OUTLOOK_LIKE.rows[0], OUTLOOK_LIKE.rows[10], OUTLOOK_LIKE.rows[11]] };

const GOOGLE_HEADER = ["First Name", "Last Name", "Phone 1 - Label", "Phone 1 - Value", "Phone 2 - Label", "Phone 2 - Value"];
/** Google's shape: line 2 joins two DISTINCT mobiles with " ::: " in Phone 1 AND has another mobile in Phone 2; line 3 a
 *  landline in Phone 1 and its mobile only in Phone 2; line 4 one mobile; line 5 the SAME mobile twice in Phone 1. */
const GOOGLE_LIKE: ParsedContactsFile = {
  format: "csv", fileName: "google.csv", width: 6, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: [...GOOGLE_HEADER] },
    { line: 2, cells: ["Asha", "Juma", "Mobile", "+255 712 345 611 ::: +255 754 345 612", "Mobile", "0688 345 613"] },
    { line: 3, cells: ["Baraka", "Moshi", "Work", "022 211 3458", "Mobile", "+255 765 345 614"] },
    { line: 4, cells: ["Neema", "Kimaro", "Mobile", "0713 345 615", "", ""] },
    { line: 5, cells: ["Juma", "Said", "Mobile", "0713 345 616 ::: +255 713 345 616", "", ""] },
  ],
};
const GOOGLE_PICKS = ["0712345611 / 0754345612 / 0688345613", "+255 765 345 614", "0713 345 615", "0713 345 616 ::: +255 713 345 616"];
const GOOGLE_ADDED = "Phone (read from: Phone 1 - Value, Phone 2 - Value)";

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
/** ⛔ D2 · a WEAK "Namba" column holding a mobile on the row whose Simu cell is empty: Namba is never read — the row
 *  stages Simu's empty cell (and is refused for it), and no column is added. */
const NAMBA_HOLDS_MOBILE: ParsedContactsFile = {
  format: "csv", fileName: "orodha-namba.csv", width: 3, blankRows: 0, notes: [], unreadable: [],
  rows: [
    { line: 1, cells: ["Namba", "Jina", "Simu"] },
    { line: 2, cells: ["0712 345 624", "Asha", ""] },
    { line: 3, cells: ["2", "Baraka", "0754 345 625"] },
  ],
};

/** The added phone column's index in a reading, or -1. */
const addedAt = (m: FileMapping): number => m.headers.findIndex((h) => h.startsWith(ADDED_PHONE_HEADER_START));

/** A plant's added column: the reading's own column REBUILT by another chooser over the same phone columns (the main one
 *  first, then the others left to right) — the faithful way to plant a wrong choice. */
function rebuildAdded(m: FileMapping, choose: (cells: readonly string[], order: readonly number[], main: number) => string): FileMapping {
  const at = addedAt(m);
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
    "./parsed-file", "./import-parse", "./title-rows", "./vcard", "./xlsx-limits", "./contact-fields", "./import-limits", "./phone-cell",
    "../tz-msisdn", "../phone-normalize",
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
    // ⭐ C8c · "or" joins the Kenyan number and the Tanzanian one into ONE phone cell (`cellOf`), so it is the cell's, not
    // the name's — the name was "Kenya or" before.
    "7:0715 000 222|Kenya",
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

  // ── P1d · C8c · D4 in the list paste ──
  const STRANGER = "255712345678";
  const HOLES: ReadonlyArray<readonly [string, string, string, string]> = [
    // the line · the cell staged whole · the name · the first part whose sentence the server gives
    ["Asha +254, 712 345 678", "+254, 712 345 678", "Asha", "+254"],
    ["254/712345678 Juma", "254/712345678", "Juma", "254/712345678"],
    ["Baraka 00254; 712345678", "00254; 712345678", "Baraka", "00254"],
    ["Neema +254 or 712 345 678", "+254 or 712 345 678", "Neema", "+254"],
  ];
  const holeBad: string[] = [];
  for (const [line, cell, name, sentenceOf] of HOLES) {
    const f = impl.parsePaste(line);
    const staged = f.rows[0]?.cells[0] ?? "";
    const holdsStranger = mobilesIn(staged).some((m) => m.number.msisdn === STRANGER);
    if (f.rows.length !== 1 || staged !== cell || f.rows[0]?.cells[1] !== name || firstMobileIn(staged) !== null || holdsStranger
      || phoneCellRefusal(staged) !== parseTzNumber(sentenceOf).reason) {
      holeBad.push(`${json(line)} → ${json(f.rows[0]?.cells ?? null)}${holdsStranger ? " (THE STRANGER)" : ""}`);
    }
  }
  const CONTROLS: ReadonlyArray<readonly [string, string, string]> = [
    ["Asha 712 345 678", STRANGER, "Asha"],
    ["712345678", STRANGER, ""],
    ["12. 0712 345 678 Asha", STRANGER, "Asha"],
    ["255, 0712 345 678 Asha", STRANGER, "Asha"],
    ["0712 345 678 / 0754 111 222 Asha", STRANGER, "Asha"],
  ];
  const controlBad: string[] = [];
  for (const [line, key, name] of CONTROLS) {
    const f = impl.parsePaste(line);
    const staged = f.rows[0]?.cells[0] ?? "";
    if (f.rows.length !== 1 || firstMobileIn(staged)?.number.msisdn !== key || f.rows[0]?.cells[1] !== name) controlBad.push(`${json(line)} → ${json(f.rows[0]?.cells ?? null)}`);
  }
  ok(L.P1d, holeBad.length === 0 && controlBad.length === 0,
    [...holeBad, ...controlBad].join(" | ") || `${HOLES.length} lines staged whole and refused · ${CONTROLS.length} controls read as before`);

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

  // ── P4 · C3b-fix · D7 · a title copied above the column names ──
  const titled = impl.parsePaste(TAB_TITLED);
  const titledMap = impl.mappingFor(titled);
  ok(L.P4, rowsOf(titled) === `3:Jina|Simu ; 4:Asha|0712 345 678 ; 5:Baraka|0754 123 456` && json(titled.notes) === json([TITLE_NOTE_1_2])
    && isParsedContactsFile(titled) && titledMap.headerRows === 1 && titledMap.mapping.phone === 1 && titledMap.mapping.name === 0,
    `${rowsOf(titled)} · notes ${json(titled.notes)} · ${json(titledMap.mapping)}`);

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
  // ⭐ D9 · each cell beside the preview it must get — LITERALS, decided by hand.
  const PREVIEWS: ReadonlyArray<readonly [string, string]> = [
    ["0712 345 678", "+255••••78"],
    ["+255712345678", "+255••••78"],
    ["Call Asha on 0712345678 today", "+255••••78"],
    ["Asha", "Asha"],
    ["2.55713E+11", "••••11"],
    ["255,757,300,014", "+255••••14"],
    ["0712/345/678", "+255••••78"],
    ["0712abc345def678", "+255••••78"],
    ["12/03/2026", "••••26"],
    ["0712 345 678 / 0754 123 456", "••••56"],
    ["Kariakoo 12", "Kariakoo 12"],
    ["TSh 50,000", "TSh 50,000"],
  ];
  const previews = PREVIEWS.map(([cell]) => impl.previewCell(cell));
  const digitCount = (s: string): number => s.split("").filter((ch) => ch >= "0" && ch <= "9").length;
  const previewMisses = PREVIEWS.flatMap(([, want], i) => (previews[i] === want ? [] : [`case ${i + 1} → "${previews[i]}" (want "${want}")`]));
  ok(L.M5, previewMisses.length === 0 && previews.every((p) => digitCount(p) < 7), previewMisses.join(" | ") || previews.join(" | "));

  // ── G4 · several phone columns (C3b, under C3b-fix D2 and D3) ──────────────────────────────────
  const phoneCellsOf = (m: FileMapping): string[] =>
    stageRowsOf(m.file, m.mapping, m.headerRows).map((r) => ("cells" in r ? r.cells[m.mapping.phone ?? -1] ?? "" : "(unreadable)"));
  const outlook = impl.mappingFor(OUTLOOK_LIKE);
  const outlookPicks = phoneCellsOf(outlook);
  const sourceNoted = [3, 4, 6, 7, 8].every((i) => {
    const c = outlook.columns[i];
    return c !== undefined && c.status === "unused" && c.field === "phone" && c.note === ADDED_PHONE_SOURCE_NOTE;
  });
  const othersUnread = [2, 5].every((i) => outlook.columns[i]?.status === "unknown") && !/Assistant|Company/.test(outlook.headers[10] ?? "");
  const mappingKey = (m: Readonly<Record<string, number | undefined>>): string =>
    JSON.stringify(Object.entries(m).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  // The server's ONE rule over the carried cells: line 9's two mobiles are refused in its words; every other pick yields
  // exactly what its row's own phone cells hold.
  const carried = outlookPicks[7] ?? "";
  ok(L.G4a, outlook.headers.length === 11 && outlook.headers[10] === OUTLOOK_ADDED && outlook.headerRows === 1
    && mappingKey(outlook.mapping) === mappingKey({ first_name: 0, last_name: 1, phone: 10, email: 9 })
    && sourceNoted && othersUnread && outlook.columns[10]?.status === "mapped" && outlook.columns[10]?.field === "phone"
    && outlook.phoneProblem === null && outlook.refusal === null && validateMapping(outlook.headers, outlook.mapping).ok
    && isParsedContactsFile(outlook.file) && outlook.file.width === 11 && outlook.file !== OUTLOOK_LIKE
    && JSON.stringify(outlookPicks) === JSON.stringify(OUTLOOK_PICKS)
    && firstMobileIn(carried) === null && phoneCellRefusal(carried) === SEVERAL_MOBILES_SENTENCE
    && json(mobilesIn(carried).map((m) => m.number.msisdn)) === json(["255754345607", "255688345608"])
    && OUTLOOK_LIKE.width === 10 && OUTLOOK_LIKE.rows.every((r) => r.cells.length === 10),
    `${outlook.headers[10] ?? "(no column)"} · ${JSON.stringify(outlook.mapping)} · picks ${JSON.stringify(outlookPicks)}`);

  const google = impl.mappingFor(GOOGLE_LIKE);
  const googlePicks = phoneCellsOf(google);
  const googleKeys = googlePicks.map((cell) => firstMobileIn(cell)?.number.msisdn ?? null);
  ok(L.G4b, google.headers[6] === GOOGLE_ADDED && google.mapping.phone === 6 && validateMapping(google.headers, google.mapping).ok
    && JSON.stringify(googlePicks) === JSON.stringify(GOOGLE_PICKS)
    && json(googleKeys) === json([null, "255765345614", "255713345615", "255713345616"]) && phoneCellRefusal(googlePicks[0] ?? "") === SEVERAL_MOBILES_SENTENCE
    && google.columns[3]?.status === "unused" && google.columns[5]?.status === "unused"
    && google.columns[2]?.status === "unknown" && google.columns[4]?.status === "unknown",
    `${google.headers[6] ?? "(no column)"} · picks ${JSON.stringify(googlePicks)} · keys ${json(googleKeys)}`);

  const controls = [ONE_PHONE, NAMBA_SIMU, NAMBA_HOLDS_MOBILE, OUTLOOK_ALL_IN_MOBILE, OUTLOOK_OTHERS_ONLY].map((f) => ({ f, m: impl.mappingFor(f) }));
  const grew = controls.filter(({ f, m }) => m.file !== f || addedAt(m) >= 0 || m.headers.length !== f.width);
  const nambaPhones = phoneCellsOf(controls[2].m);
  ok(L.G4c, grew.length === 0 && json(controls.map(({ m }) => m.mapping.phone)) === json([1, 2, 2, 7, 7]) && json(nambaPhones) === json(["", "0754 345 625"])
    && !isPhoneColumnHeader("Namba") && !isPhoneColumnHeader("Assistant's Phone") && !isPhoneColumnHeader("Company Main Phone")
    && !isPhoneColumnHeader("Business Fax") && !isPhoneColumnHeader("Pager") && !isPhoneColumnHeader("Callback") && !isPhoneColumnHeader("Radio Phone")
    && isPhoneColumnHeader("Business Phone") && isPhoneColumnHeader("Phone 2 - Value") && isPhoneColumnHeader("Simu 2"),
    grew.map(({ f, m }) => `${f.fileName}: ${m.headers[m.headers.length - 1]}`).join(" | ")
      || `${controls.map(({ f, m }) => `${f.fileName} → Phone in column ${m.mapping.phone}`).join(" · ")} · Namba file stages ${json(nambaPhones)}`);

  // ── E1 · D3 · no row count ──
  const rowCounter = /export\s+function\s+extraNumbersOf\b|["']row["']/.test(impl.sources.read);
  const dialogCounts = /extraNumbersOf|unit:\s*counted|["']row["']/.test(impl.sources.dialog)
    || !impl.sources.dialog.includes("count: ready.extraNumbers, unit: ready.extraUnit");
  ok(L.E1, !rowCounter && !dialogCounts && extraNumbersNote(2, "card") !== null && extraNumbersNote(2, "line") !== null,
    `import-read.ts counts rows: ${rowCounter} · the dialog counts rows: ${dialogCounts}`);

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
    ok(L.R3, r3.out.kind === "refused" && r3.out.sentence === xlsxRefusalSentence("too_large", { bytes: XLSX_MAX_BYTES + 1 }), JSON.stringify(r3.out).slice(0, 160));

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
    const r8Unclosed = r8.out.kind === "parsed" ? r8.out.unclosed : null;
    ok(L.R8, r8File !== null && r8File.rows.length === 2 && r8File.unreadable.length === 1 && r8File.unreadable[0].line === 3
      && r8File.unreadable[0].reason.startsWith("Row 3 opens a quote (") && r8File.unreadable[0].reason.includes("it and the line after it could not be read")
      && r8Staged.length === 2 && "readError" in (r8Staged[1] ?? {})
      && json(r8Unclosed) === json({ line: 3, lines: 1 }) && r8File.notes.some((n) => n.startsWith("Row 3 opens a quote (") && n.endsWith("it and the line after it were not read.")),
      r8.out.kind === "parsed" ? `${r8.out.file.rows.length} rows · unreadable ${JSON.stringify(r8.out.file.unreadable)} · unclosed ${json(r8Unclosed)} · notes ${json(r8.out.file.notes)}` : JSON.stringify(r8.out).slice(0, 160));

    // C3b-fix · D7 at the door: a title above the column names — padded with the separator, as Excel and Sheets write
    // every row of a sheet to CSV — then a title, the names and a broken quote (D5e).
    const titledCsv = `Orodha ya wateja,${CRLF}Jina,Simu${CRLF}Asha,0712 345 678${CRLF}`;
    const r10 = await readOne(impl, new File([bytesOf(titledCsv)], "orodha.csv", { type: "text/csv" }));
    const r10File = r10.out.kind === "parsed" ? r10.out.file : null;
    const r10Map = r10File === null ? null : impl.mappingFor(r10File);
    const brokenTitled = `Orodha ya wateja,${CRLF}Jina,Simu${CRLF}${String.fromCharCode(34)}Asha,0712 345 678${CRLF}Baraka,0754 123 456${CRLF}`;
    const r10b = await readOne(impl, new File([bytesOf(brokenTitled)], "orodha-broken.csv", { type: "text/csv" }));
    ok(L.R10, r10File !== null && json(r10File.rows.map((r) => r.line)) === json([2, 3]) && json(r10File.notes) === json([TITLE_NOTE_1])
      && r10Map !== null && r10Map.headerRows === 1 && r10Map.mapping.phone === 1
      && r10b.out.kind === "refused" && r10b.out.cause === "csv" && r10b.out.sentence === csvRefusalSentence("unterminated_quote", 3),
      `${r10File === null ? JSON.stringify(r10.out).slice(0, 120) : `lines ${json(r10File.rows.map((r) => r.line))} · notes ${json(r10File.notes)}`}`
      + ` · broken after a title: ${r10b.out.kind === "refused" ? r10b.out.sentence.slice(0, 80) : r10b.out.kind}`);
  }

  // ── R9 · D5d · the sum lines ──────────────────────────────────────────────────────────────────
  const counts5 = [1, 0, 0, 1, 1];
  const terms = [{ n: 1, word: "added" }, { n: 0, word: "updated" }, { n: 0, word: "kept" }, { n: 2, word: "couldn't be imported" }];
  const cutTail = " — every row of your file up to row 3 is counted once; the 1 line after it was not read, because a quote in that row is never closed.";
  const wholeTail = " — every row of your file is counted once.";
  const readTail = " — every row read from your file is counted once.";
  const sums = {
    checkCut: partsText(impl.sums.check(counts5, 3, { line: 3, lines: 1 })),
    checkNone: partsText(impl.sums.check(counts5, 3, null)),
    checkUnknown: partsText(impl.sums.check(counts5, 3, "unknown")),
    checkNothingSwallowed: partsText(impl.sums.check(counts5, 3, { line: 3, lines: 0 })),
    doneCut: partsText(impl.sums.done(terms, 3, { line: 3, lines: 12 })),
    doneUnknown: partsText(impl.sums.done(terms, 3, "unknown")),
  };
  const view = (id: string, format: string, unreadable: number) => ({ id, format, unreadable });
  const cuts = [
    impl.sums.cutOf(view("ci_a", "csv", 1), { runId: "ci_a", unclosed: { line: 7, lines: 4 } }),
    impl.sums.cutOf(view("ci_a", "csv", 0), { runId: "ci_a", unclosed: null }),
    impl.sums.cutOf(view("ci_b", "csv", 1), { runId: "ci_a", unclosed: { line: 7, lines: 4 } }),
    impl.sums.cutOf(view("ci_b", "csv", 0), { runId: null, unclosed: null }),
    impl.sums.cutOf(view("ci_c", "vcard", 2), { runId: null, unclosed: null }),
  ];
  ok(L.R9, sums.checkCut === `1 + 0 + 0 + 1 + 1 = 3 rows${cutTail}` && sums.checkNone.endsWith(wholeTail) && sums.checkUnknown.endsWith(readTail)
    && sums.checkNothingSwallowed.endsWith(wholeTail) && !sums.checkUnknown.includes(wholeTail.slice(3))
    && sums.doneCut.endsWith(" — every row of your file up to row 3 is counted once; the 12 lines after it were not read, because a quote in that row is never closed.")
    && sums.doneUnknown.endsWith(readTail) && !sums.doneCut.includes(wholeTail.slice(3))
    && json(cuts) === json([{ line: 7, lines: 4 }, null, "unknown", null, null]),
    `${json(sums)} · cuts ${json(cuts)}`);

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
    // 🔴 C8c · D4's hole in the paste as it shipped: the reader stops a number at the separator and stages only what follows
    // it — "+254, 712 345 678" becomes the bare "712 345 678", which the server reads WHOLE as a stranger's +255 number.
    name: "the list paste stages only the number after the last separator — the country code before it is cut off",
    expect: L.P1d,
    impl: () => ({
      ...real(),
      parsePaste: (t) => {
        const f = parsePastedText(t);
        const cut = new RegExp("[,;|&/]| or ");
        return { ...f, rows: f.rows.map((r) => ({ ...r, cells: [(r.cells[0].split(cut).pop() ?? r.cells[0]).trim(), ...r.cells.slice(1)] })) };
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
    name: "C3b-fix D7 undone at the paste — a title copied above the column names read as them",
    expect: L.P4,
    impl: () => ({
      ...real(),
      parsePaste: (t) => {
        if (isListPaste(t)) return parsePastedText(t);
        const read = parseCsv(t, { delimiter: "tab" });
        return read.ok && read.file.unreadable.length === 0 ? { ...read.file, format: "paste", fileName: null } : parsePastedText(t);
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
    name: "C3b-fix D9 undone — C3b's preview: masked by its punctuation, so Excel's thousands commas and an office's slashes show a number whole",
    expect: L.M5,
    impl: () => ({
      ...real(),
      previewCell: (c) => {
        const raw = String(c ?? "").trim();
        const parsed = parseTzNumber(raw);
        return parsed.verdict === "ok" && parsed.e164 !== null && /^[\s'+().\d-]+$/.test(raw) ? maskPhone(parsed.e164) : scrubPhoneRuns(raw);
      },
    }),
  },
  {
    name: "C3b G4 undone — several phone columns read as before: the mobile only in Business or Primary Phone is lost",
    expect: L.G4a,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const at = addedAt(m);
        if (at < 0) return m;
        const headers = m.headers.slice(0, at);
        const auto = autoMapHeaders(headers);
        return { ...m, headers, mapping: { ...auto.mapping }, columns: auto.columns, file: f };
      },
    }),
  },
  {
    name: "the added column reads only the main phone column — no fallback to the others",
    expect: L.G4a,
    impl: () => ({ ...real(), mappingFor: (f, o) => rebuildAdded(mappingFor(f, o), (cells, _order, main) => cells[main] ?? "") }),
  },
  {
    name: "C3b-fix D3 undone at G4 — C3b's FIRST mobile among the phone columns: of Business's and Home's two mobiles, Business's is taken",
    expect: L.G4a,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => rebuildAdded(mappingFor(f, o), (cells, order, main) => {
        const hit = order.find((i) => firstMobileIn(cells[i] ?? "") !== null);
        return cells[hit ?? main] ?? "";
      }),
    }),
  },
  {
    name: "C3b-fix D2 undone — Assistant's Phone and Company Main Phone read as the person's own: another person's numbers carried",
    expect: L.G4a,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const strangers = m.headers.flatMap((h, i) => (/^(Assistant's Phone|Company Main Phone)$/.test(h) ? [i] : []));
        return rebuildAdded(m, (cells, order, main) => {
          if (firstMobileIn(cells[main] ?? "") !== null) return cells[main] ?? "";
          const found = [...order, ...strangers].flatMap((i) => mobilesIn(cells[i] ?? ""))
            .filter((x, k, all) => all.findIndex((y) => y.number.msisdn === x.number.msisdn) === k);
          if (found.length === 0) return cells[main] ?? "";
          return found.length === 1 ? found[0].text : found.map((x) => `0${(x.number.msisdn ?? "").slice(3)}`).join(" / ");
        });
      },
    }),
  },
  {
    name: "the added column asks only whether a WHOLE cell is a number — a ' ::: ' cell of two mobiles passed over for Phone 2's",
    expect: L.G4b,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => rebuildAdded(mappingFor(f, o), (cells, order, main) => {
        const hit = order.find((i) => parseTzNumber(cells[i] ?? "").verdict === "ok");
        return cells[hit ?? main] ?? "";
      }),
    }),
  },
  {
    name: "the phone column's own two mobiles left out — Phone 2's single mobile carried as if it were the person's one",
    expect: L.G4b,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => rebuildAdded(mappingFor(f, o), (cells, order, main) => {
        if (firstMobileIn(cells[main] ?? "") !== null) return cells[main] ?? "";
        const found = order.slice(1).flatMap((i) => mobilesIn(cells[i] ?? ""));
        if (found.length === 0) return cells[main] ?? "";
        return found.length === 1 ? found[0].text : found.map((x) => `0${(x.number.msisdn ?? "").slice(3)}`).join(" / ");
      }),
    }),
  },
  {
    name: "an added column on every file with a phone column — the reading never the file as read",
    expect: L.G4c,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const main = m.mapping.phone;
        if (m.headerRows !== 1 || main === undefined || addedAt(m) >= 0) return m;
        const width = m.headers.length;
        const header = `${ADDED_PHONE_HEADER_START}${m.headers[main]})`;
        const rows = m.file.rows.map((row, r) => ({
          line: row.line,
          cells: [...Array.from({ length: width }, (_, i) => row.cells[i] ?? ""), r === 0 ? header : row.cells[main] ?? ""],
        }));
        return { ...m, headers: [...m.headers, header], mapping: { ...m.mapping, phone: width }, file: { ...m.file, rows, width: width + 1 } };
      },
    }),
  },
  {
    name: "C3b-fix D2 undone — a WEAK Namba column read as the person's phone where Simu is empty (a serial may be read as a number)",
    expect: L.G4c,
    impl: () => ({
      ...real(),
      mappingFor: (f, o) => {
        const m = mappingFor(f, o);
        const main = m.mapping.phone;
        const namba = m.headers.indexOf("Namba");
        if (m.headerRows !== 1 || main === undefined || namba < 0 || namba === main || addedAt(m) >= 0) return m;
        const width = m.headers.length;
        const header = `${ADDED_PHONE_HEADER_START}${m.headers[main]}, Namba)`;
        const rows = m.file.rows.map((row, r) => ({
          line: row.line,
          cells: [
            ...Array.from({ length: width }, (_, i) => row.cells[i] ?? ""),
            r === 0 ? header : firstMobileIn(row.cells[main] ?? "") !== null ? row.cells[main] ?? "" : row.cells[namba] ?? "",
          ],
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
    name: "C3b-fix D3 undone in the dialog — a file's rows counted again (C3b's row count beside the readers' own)",
    expect: L.E1,
    impl: () => ({
      ...real(),
      sources: {
        ...real().sources,
        dialog: real().sources.dialog.split("count: ready.extraNumbers, unit: ready.extraUnit")
          .join(`count: counted ? ready.extraNumbers : extraNumbersOf(choice), unit: counted ? ready.extraUnit : ${JSON.stringify("row")}`),
      },
    }),
  },
  {
    name: "the reader exports a row counter again",
    expect: L.E1,
    impl: () => ({
      ...real(),
      sources: { ...real().sources, read: `${real().sources.read}${LF}export function extraNumbersOf(reading: unknown): number { return reading === null ? 0 : 1; }${LF}` },
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
    name: "C3b-fix D7 undone at the CSV door — a title read as the column names",
    expect: L.R10,
    impl: () => ({
      ...real(),
      readFile: async (f, o) => {
        const out = await readContactsFile(f, o);
        if (out.kind !== "parsed" || out.file.format !== "csv") return out;
        const asRead = parseCsv(stripBom(await f.text()).text, { fileName: f.name });
        return asRead.ok ? { ...out, file: asRead.file } : out;
      },
    }),
  },
  {
    name: "C3b-fix D5e undone after a title leaves — the column names and one unreadable record read as a file of no contacts",
    expect: L.R10,
    impl: () => ({
      ...real(),
      readFile: async (f, o) => {
        const out = await readContactsFile(f, o);
        if (out.kind !== "refused" || out.cause !== "csv" || !out.sentence.startsWith("Row 3 opens a quotation mark")) return out;
        const file: ParsedContactsFile = {
          format: "csv", fileName: f.name, width: 2, blankRows: 0, notes: [TITLE_NOTE_1],
          rows: [{ line: 2, cells: ["Jina", "Simu"] }], unreadable: [{ line: 3, reason: "Row 3 opens a quote." }],
        };
        return { kind: "parsed", file, digest: DIGEST, extraNumbers: 0, unclosed: { line: 3, lines: 1 } };
      },
    }),
  },
  {
    name: "C3b-fix D5 undone at the door — the lines a quote swallowed never reach the dialog",
    expect: L.R8,
    impl: () => ({ ...real(), readFile: async (f, o) => { const out = await readContactsFile(f, o); return out.kind === "parsed" ? { ...out, unclosed: null } : out; } }),
  },
  {
    name: "C3b-fix D5d undone — the check's sum says every row of the file was counted, whatever a quote swallowed",
    expect: L.R9,
    impl: () => ({ ...real(), sums: { ...real().sums, check: (counts, rows) => CHECK.sum(counts, rows, null) } }),
  },
  {
    name: "a run read in another tab claims every row of its file — the lines a quote may have swallowed unsaid",
    expect: L.R9,
    impl: () => ({ ...real(), sums: { ...real().sums, cutOf: (v, here) => (here.runId === v.id ? here.unclosed : null) } }),
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
