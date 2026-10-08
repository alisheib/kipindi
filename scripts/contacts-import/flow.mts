/**
 * test:contacts-import · section "flow" — S15's browser side of the importer: the reader (`src/lib/contacts/import-read.ts`)
 * and the ONE loop driver (`src/lib/contacts/import-loop.ts`).                                        (S15 · C3–C4, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. The paste is parsed in both of its modes (a list from a chat, cells copied from a sheet), a
 * headerless file is mapped (S15-5), a masked export stays refused whatever the officer says about its first row, every
 * preview is masked, and real `File`s are read through the real streamed reader — a CSV and its digest, an old .xls, an
 * Excel file over the cap, an empty file, a vCard with two numbers on a card, an aborted read, a file past the run's cap.
 * ⭐ THE LOOPS' PROPERTIES, EACH AGAINST A STUBBED SERVER that keeps its own cursor (the server's builder and the lead hold
 * the commit loop to exactly these): the bar shows only the server's cursor; Stop pauses on the server, then stops; a
 * refusal comes back verbatim; only `busy` is waited out, at most three times, for the seconds asked; a thrown call is
 * followed by the VIEW, never a blind repeat; a deploy is named; `moved` adopts the server's cursor and counts nothing; a
 * resume starts at the server's cursor; the result's counts are the server's; a loop that stops moving stops. The upload
 * resumes from `nextFrom`, treats `already_staged` as "ask the view and go on", takes a STAGED view as success, and sends
 * every batch within the caps, contiguous.
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
  PASTE_LINE_NO_NUMBER,
  PASTE_LIST_NOTE,
  READ_TOO_MANY_ROWS,
  extraNumbersNote,
  isListPaste,
  mappingFor,
  parsePastedText,
  previewCell,
  readContactsFile,
  type ReadOutcome,
} from "../../src/lib/contacts/import-read.ts";
import {
  BUSY_RETRIES,
  STALL_LIMIT,
  isDeploySkewError,
  runCommit,
  runUpload,
  type CommitDeps,
  type CommitOutcome,
  type UploadDeps,
  type UploadOutcome,
} from "../../src/lib/contacts/import-loop.ts";
import { isParsedContactsFile, type ParsedContactsFile } from "../../src/lib/contacts/parsed-file.ts";
import { CONTACT_MASKED_FILE, contactExportHeader, validateMapping } from "../../src/lib/contacts/contact-fields.ts";
import { STAGE_BATCH_MAX_ROWS, stageRowsOf, type StageRowInput } from "../../src/lib/contacts/import-limits.ts";
import { EMPTY_FILE_SENTENCE } from "../../src/lib/contacts/import-parse.ts";
import { XLSX_MAX_BYTES, xlsxRefusalSentence } from "../../src/lib/contacts/xlsx-limits.ts";
import type {
  CommitStepInput,
  CommitStepResult,
  ImportRefusalReason,
  ImportRunStatus,
  ImportRunView,
  ImportViewResult,
  RunActResult,
  StageImportInput,
  StageImportResult,
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
  W0: "W0 · ⛔ PURE — import-read.ts and import-loop.ts carry no directive and import only src/lib/contacts modules, tz-msisdn and phone-normalize (the loop: import-limits and import-flow alone)",
  P1: "P1 · ⭐ a LIST paste: each line's first number is the Phone cell and the rest of the line the Name (a chat's stamp, an enumeration and separators dropped), lines numbered as pasted, a blank line counted",
  P1b: "P1b · a pasted line with no number is listed as unreadable with its row and the reader's sentence — never dropped",
  P1c: "P1c · ⭐ S15-4 · a line with a second number keeps the FIRST, and the paste's note names that row; a foreign number yields to a Tanzanian one on its line",
  P2: "P2 · a TAB paste is an Excel copy: cells split on the tab with Excel's quoting, a blank line counted, its first row header-matched (Phone, Name; one header row)",
  P3: "P3 · a list paste maps Phone and Name with no header row, named as the field list names them — never \"Column A…\", never read as a headerless file — and U28's validateMapping passes it",
  M1: "M1 · ⭐ S15-5 · a file whose first row is a contact is READ: \"Column A…\" headers, the phone, email and name columns found from the cells, no header row — row 1 staged too",
  M2: "M2 · the officer's word on the first row turns the reading over both ways (\"header\" reads it as names again)",
  M3: "M3 · ⛔ a masked export stays refused in U28's words — even when the officer says its first row is a contact",
  M4: "M4 · a header row narrower than the file is padded to the widest row, so every column can be mapped",
  M5: "M5 · ⛔ NO NUMBER WHOLE: a cell that is a number previews as +255••••NN, a number inside text is bulleted, plain text is untouched",
  R1: "R1 · a CSV File is STREAMED into the reader: its rows read, its digest the sha-256 of its exact bytes, progress reported in bytes",
  R2: "R2 · an old .xls is refused before anything is uploaded, in xlsx-limits' own sentence",
  R3: "R3 · ⛔ an Excel file over the cap is refused BEFORE it is uploaded, its size named (too_large)",
  R4: "R4 · an empty file is refused with the empty-file sentence",
  R5: "R5 · ⭐ S15-4 · a vCard card with two numbers yields one row, the count of such cards, and the note that says it",
  R6: "R6 · an aborted read comes back aborted — nothing kept",
  R7: "R7 · ⛔ CRASH CONTROL · a file past the run's cap stops being read and says how to split it",
  C1: "C1 · ⛔ THE BAR IS THE SERVER'S CURSOR — every figure shown is a cursor the server answered with, never past the server's own",
  C2: "C2 · ⭐ STOP IS READ BETWEEN STEPS: the run is paused ON THE SERVER, then the loop stops — no step after the pause",
  C3: "C3 · ⛔ a refusal ends the loop with the server's refusal, verbatim (its reason and its sentence)",
  C4: "C4 · ⭐ busy is waited out for the seconds asked and retried at most three times in a row; then it is the refusal",
  C4b: "C4b · ⛔ ONLY busy is retried — rate_limited ends the loop on its first answer",
  C5: "C5 · ⛔ after a THROWN step the next call is the VIEW — never a blind repeat — and the loop goes on from the cursor the view reports",
  C5b: "C5b · a deploy (a stale action id, thrown by the step and the view alike) is named as such",
  C6: "C6 · ⭐ moved adopts the server's cursor and counts nothing: the next step starts exactly there",
  C7: "C7 · ⭐ a resume starts from the server's cursor (the view it was given), never from 0",
  C8: "C8 · the result's counts are the server's — the last view's totals, untouched",
  C9: "C9 · ⛔ a loop that stops moving stops: STALL_LIMIT answers that leave the cursor where it was end it as stalled",
  U1: "U1 · ⭐ the upload resumes from the run's nextFrom — its first batch starts at that record",
  U2: "U2 · already_staged asks the VIEW and carries on from its nextFrom (a retried call, not a failure)",
  U3: "U3 · ⭐ a STAGED view is success even when the last batch's own answer was a refusal",
  U4: "U4 · every batch is within the caps, the batches are contiguous, and together they are the file",
} as const;

/* ══ THE STUBBED SERVER ═════════════════════════════════════════════════════════════════════════ */

const RUN = "ci_abcdefghijklmnopqrst";
const DIGEST = "a".repeat(64);
const SENTENCE = {
  busy: "The platform is busy right now — bets come first. Trying again shortly.",
  rate: "You've checked a lot of files in a short time. Wait a moment, then try again.",
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
  | { readonly moveTo: number };

const skewError = (): Error => {
  const e = new Error('Server Action "7f3a" was not found on the server.');
  e.name = "UnrecognizedActionError";
  return e;
};

/** A commit server with its own cursor: `batch` rows a step, a script of answers by call, and a log of every call. */
function commitServer(total: number, batch: number, script: readonly Act[] = [], startAt = 0, viewThrows: "skew" | null = null) {
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
    return { ok: true, view: now() };
  };
  const pause = async (): Promise<RunActResult> => {
    events.push("pause");
    status = "PAUSED";
    return { ok: true, view: { ...now(), pausedAt: "2026-10-09T09:05:00.000Z", pausedBy: "you" } };
  };
  return { step, view, pause, events, answered, state: () => ({ cursor, status }), now };
}

type Recorded = { shown: number[]; waits: number[]; overrun: boolean; steps: number };

function commitDeps(server: ReturnType<typeof commitServer>, stopAfterSteps: number | null = null): { deps: CommitDeps; rec: Recorded } {
  const rec: Recorded = { shown: [], waits: [], overrun: false, steps: 0 };
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
    onBusy: () => undefined,
    wait: async (ms) => {
      rec.waits.push(ms);
    },
  };
  return { deps, rec };
}

/** A staging server with its own cursor: the run's records, a script of answers by call, and a log of every batch. */
type StageAct = "ok" | "already" | "throw" | "staged-refusal";
function stageServer(total: number, stagedAt = 0, script: readonly StageAct[] = []) {
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
  const readAllowed = new Set(["./parsed-file", "./import-parse", "./vcard", "./xlsx-limits", "./contact-fields", "./import-limits", "../tz-msisdn", "../phone-normalize"]);
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
    const s1 = commitServer(874, 437, ["busy", "busy"]);
    const d1 = commitDeps(s1);
    const o1 = await impl.runCommit(d1.deps, s1.now());
    const s2 = commitServer(874, 437, ["busy", "busy", "busy", "busy", "busy", "busy"]);
    const d2 = commitDeps(s2);
    const o2 = await impl.runCommit(d2.deps, s2.now());
    ok(L.C4, o1.kind === "done" && d1.rec.waits.join(",") === "2000,2000" && s1.events.length === 4
      && o2.kind === "refused" && o2.refusal.reason === "busy" && o2.refusal.message === SENTENCE.busy
      && s2.events.length === BUSY_RETRIES + 1 && d2.rec.waits.length === BUSY_RETRIES,
      `waited out [${d1.rec.waits.join(",")}] in ${s1.events.length} calls · always busy: ${s2.events.length} calls, ${d2.rec.waits.length} waits, ${o2.kind}`);
    const s3 = commitServer(874, 437, ["rate"]);
    const d3 = commitDeps(s3);
    const o3 = await impl.runCommit(d3.deps, s3.now());
    ok(L.C4b, o3.kind === "refused" && o3.refusal.reason === "rate_limited" && s3.events.length === 1 && d3.rec.waits.length === 0,
      `${o3.kind} · ${s3.events.join(",")} · waits ${d3.rec.waits.length}`);
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
  log(`flow: the commit loop retries busy ${BUSY_RETRIES} times and stops after ${STALL_LIMIT} answers that do not move`);
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
    name: "busy is retried without end (the loop is run again on its refusal)",
    expect: L.C4,
    impl: () => ({
      ...real(),
      runCommit: async (deps, start) => {
        let out = await runCommit(deps, start);
        for (let i = 0; i < 2 && out.kind === "refused" && out.refusal.reason === "busy"; i++) out = await runCommit(deps, out.refusal.view ?? start);
        return out;
      },
    }),
  },
  {
    name: "busy is retried at once, ignoring the seconds the server asked for",
    expect: L.C4,
    impl: () => ({ ...real(), runCommit: (deps, start) => runCommit({ ...deps, wait: () => deps.wait(0) }, start) }),
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
