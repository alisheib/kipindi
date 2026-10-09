/**
 * test:contacts-import · section "commit" — S15 C4: the import's start and commit (`src/lib/server/contacts/import-commit.ts`)
 * and the action file over them (`src/app/admin/contacts/import/import-actions.ts`).            (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. The REAL start, step, pause, resume, cancel, failures, result and open-runs read run over files
 * staged through the REAL staging service on the memory twin (`scripts/lib/contacts-import-world.mts`): the 40-row file
 * committed in ONE step by a reader, the deterministic 5,000-row file committed 500 rows a step — with a pause, a resume, a
 * replayed step and two drivers on one cursor — and again 2,000 a step without a break, the two ending identical. The
 * review round (2026-10-09) adds: a non-reader's start held to KEEP (S15-10), an ADMIN's view of other officers' runs
 * (S15-12), an erasure landing between a step's read and its write (R9), a step whose cache mirror and audit rows fail
 * after it landed (R10), a database deadlock answered `busy` (R11), and a new list that never outlives a lost start (R12).
 * Only what only the source can show is read from it (M19): what the cores import and what the action file exports.
 *
 * ⛔ IN-PROCESS. Every plant swaps one dependency of the commit (`ImportCommitDeps`) or one text the source assertion
 * reads; this module reads three files and makes no file-changing call. Each run starts from emptied staging, book,
 * ledger, stop-list, user and list maps, put back after.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "../lib/decomment.mts";
import { REPO_ROOT } from "../lib/tracked-files.mts";
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import type { ImportCommitDeps } from "../../src/lib/server/contacts/import-commit.ts";
import type { ContactImportCommitBatch, StoredContactImport, StoredContactImportRow, StoredMarketingContact } from "../../src/lib/server/store.ts";
import type { CommitStepResult, ImportResultResult, PreflightView, RunActResult, StartImportResult } from "../../src/lib/contacts/import-flow.ts";
import type { ImportChoice, ShownTally } from "../../src/lib/contacts/import-decide.ts";
import { adjustTally } from "../../src/lib/contacts/import-decide.ts";
import {
  ADMIN, B, DIGEST, FIVE_THOUSAND_COUNTS, MAPPING, N, NOW, OFFICER, READER, captureAudit, captured, checkModule, commitModule, db,
  fiveThousandRows, fortyRows, holdsDigitRun, inFreshStore, keyOf, mem, runOf, seedAccount, seedFiveThousandBook, seedFortyWorld,
  stageFile, stagedRows, truthCounts,
} from "../lib/contacts-import-world.mts";
import type { StageRow } from "../lib/contacts-import-world.mts";
import { SAMPLE_ROW_SENTENCE } from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

const { eraseMarketingFor } = await import("../../src/lib/server/marketing/erase.ts");
const {
  IMPORT_COMMIT_DEPS, cancelContactImport, commitContactImportStep, contactImportFailures, contactImportResult, failedRowSentence,
  importOpenRuns, pauseContactImport, resumeContactImport, startContactImport,
} = commitModule;
const { checkContactImport, contactImportChanges } = checkModule;

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════════════════════ */

type Sources = { readonly check: string; readonly commit: string; readonly actions: string };
export type CommitImpl = {
  readonly deps: ImportCommitDeps;
  readonly sources: Sources;
};

const PATHS = {
  check: "src/lib/server/contacts/import-check.ts",
  commit: "src/lib/server/contacts/import-commit.ts",
  actions: "src/app/admin/contacts/import/import-actions.ts",
} as const;
const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);
const read = (rel: string): string => decomment(readFileSync(join(REPO_ROOT, rel), "utf8")).split(CRLF).join(LF);

const REAL_DEPS: ImportCommitDeps = {
  ...IMPORT_COMMIT_DEPS,
  audit: captureAudit,
  now: () => NOW,
  stagingDeps: { ...IMPORT_COMMIT_DEPS.stagingDeps, audit: captureAudit, now: () => NOW },
};
let cachedSources: Sources | null = null;
function real(): CommitImpl {
  cachedSources ??= { check: read(PATHS.check), commit: read(PATHS.commit), actions: read(PATHS.actions) };
  return { deps: REAL_DEPS, sources: cachedSources };
}
const withDeps = (patch: Partial<ImportCommitDeps>): CommitImpl => ({ ...real(), deps: { ...REAL_DEPS, ...patch } });

/* ══ THE LABELS ═══════════════════════════════════════════════════════════════════════════════════════════════ */

export const L = {
  M1: "M1 · ⭐ the 40-row file commits in ONE step under TAKE_FILE (a reader's start): done, the cursor at 40, the totals COUNTED from the rows (22 created · 2 updated · 7 kept · 9 failed), and the book gains exactly 22 rows — source IMPORT, sourceRef and importId the run (X6), no account link",
  M2: "M2 · ⭐ 5,000 rows committed 500 a step — with a pause, a resume, a replayed step and two drivers on one cursor — end EXACTLY as 2,000 a step without a break: the same book, the same outcome on every line, and the counts built into the file (3,000 · 125 · 875 · 1,000)",
  M3: "M3 · ⛔ OD33 · the first row wins ACROSS steps: an in-book number repeated two thousand rows later keeps its FIRST row's values (no book name is a repeat's), and a new number repeated in a later step is created ONCE",
  M4: "M4 · a replayed step is 'moved' and changes NOTHING — the service answers moved for an old cursor, and the store refuses the same batch replayed by its cursor's compare-and-set: the book, the rows and the cursor are as they were",
  M5: "M5 · two drivers on ONE cursor at once: exactly one advances, the other is told moved — nothing is counted twice",
  M6: "M6 · ⭐ S15-9 · pause, resume, cancel: a paused run refuses a step (paused) and moves nothing; resume carries on from the cursor; cancel keeps the contacts already written, deletes the unsettled staged rows and says how many were left (R5: notImported 20, counted before the delete), and a later step is refused cancelled; before the start, cancel is the discard (notImported 40)",
  M7: "M7 · ⛔ the stopped contact, the erased tombstone and the player's row LINKED to an account (S15-11 — its file row a different name and an email the book lacks) are NEVER changed under TAKE_FILE — every field and the stamp as they were, the linked row's line kept as `account`",
  M8: "M8 · ⛔ an import writes NO consent and NO stop: the ledger and the stop list hold exactly the rows they held, and no row it touched carries an account link it set",
  M9: "M9 · ⭐ S15-8 · every settled row is BLANKED — name, email, notes, tags and the raw cell emptied; line, number, outcome and reason kept — and a failed row keeps its ONE sentence (the number's, the sample sheet's, a field's, the read error)",
  M10: "M10 · the list: the created and in-book contacts join the chosen new list ONCE each (27) — never the erased tombstone — and importing the same file again into that list adds no duplicate and moves no member's addedAt",
  M11: "M11 · ⛔ S15-3 · OD54 · the result splits the kept rows by reason ONLY for a viewer who may read numbers (a COMPLIANCE reader and an ADMIN alike: 3 unchanged · 1 on the stop list · 3 repeated · 0 kept by choice) and gives a GROWTH officer null on their own run; the list reads not covered (no basis)",
  M12: "M12 · ⭐ bets come first: while a bet waits for an admission slot a step is refused busy, retryAfterSec 5, and nothing moves; when the queue clears the step runs",
  M13: "M13 · X3 · a contact edited between the decision and the write is decided ONCE MORE from fresh facts and written from its new state; one that moves again is kept as changed_during_import (E9: never failed)",
  M14: "M14 · the start's checks: an unknown choice is bad_choice; a malformed exception key, a 5,001st exception or one on a row that does not change is bad_exceptions; a gone list is list_gone, a held name list_name_taken, a name holding a phone number bad_list; a check 31 minutes old, 3 minutes in the future or unreadable is check_stale (R7) and a moved label check_again; a name taken, or an existing list deleted, between the check and the freeze is list_name_taken (P2002) or list_gone (P2003, R17) — none writes anything — and a valid start freezes the choice, the exceptions and the list",
  M15: "M15 · the freeze is a compare-and-set: of two starts at once — each naming a NEW list — exactly one freezes the run, the other is told already_started, the run is COMMITTING with the winner's decision, and ONLY the winner's list exists (R12: a lost start leaves no list)",
  M16: "M16 · ⛔ D19 · no answer — the start, the steps, the failures pages, the results — nor any audit row carries a contact id, the word player, an erasure, a consent fact, or a run of seven digits",
  M17: "M17 · the failures pages: by FILE row, ascending, at most 50 a page, the true total on every page, nextAfterLine null only at the end — all 1,000 of the 5,000-row file's",
  M18: "M18 · ⭐ C4 · a created number the ledger or the stop list knows has its cache MIRRORED (N1 said yes → GIVEN; N4 is stopped → suppressedAt the stop's own time); one they do not know stays UNKNOWN with no stop",
  M19: "M19 · ⛔ what only the source can show: the cores import nothing that sends or writes consent (no sms, dispatch, opt-out, consent-ledger or ledger-stamp module, and — R16 — nothing from the gate's module at all) and call no ledger or stop writer; the action file is \"use server\" and exports EXACTLY the sixteen actions, each async",
  M20: "M20 · ⛔ S15-10 · a GROWTH officer (identity.contact masked) imports with KEEP alone: the check says mayUpdateInBook false, and a start with TAKE_FILE, FILL_BLANKS or any exception — even a KEEP one — is refused update_needs_reader, audited with counts only and nothing written; the same officer's KEEP start freezes",
  M21: "M21 · ⭐ S15-12 · an ADMIN sees the runs OTHER officers left open — STAGING, STAGED, COMMITTING, PAUSED, never DONE or CANCELLED, never their own — newest first, at most 20, each named by its starter and carrying no id; a GROWTH officer asking is refused forbidden and shown nothing",
  M22: "M22 · ⛔ R9 · the erasure race: a person erased between a step's read and its write — their staged row deleted, their number in no book row — is NOT created: the step reads its rows again, the conflict is decided once more, and the run finishes with the other rows imported",
  M23: "M23 · ⭐ R10 · after a step has LANDED its cache mirror and its audit rows cannot turn it into a refusal: a mirror that throws once and audit rows that throw leave the step done, and the run's end mirrors every created number the truth knows (N1 GIVEN, N4 stopped)",
  M24: "M24 · ⭐ R11 · a deadlock (P2034) inside a step answers busy, retryAfterSec 5, with the run's view and one audit row naming the error's code — never server_error, never a throw — the cursor unmoved; the next step lands",
} as const;

/* ══ HELPERS ══════════════════════════════════════════════════════════════════════════════════════════════════ */

type Ctx = SectionContext<CommitImpl>;
const json = (v: unknown): string => JSON.stringify(v);
type Label = { create: number; update: number; keep: number };
const labelOf = (t: ShownTally): Label => ({ create: t.create, update: t.update, keep: t.keep });

/** The check, then the start — as the dialog presses them. Answers the check, the label pressed and the start's answer. */
async function checkAndStart(
  runId: string, deps: ImportCommitDeps, choice: ImportChoice, list: Record<string, unknown>, exceptions: Record<string, ImportChoice> = {},
  who: string = OFFICER,
): Promise<{ preflight: PreflightView | null; label: Label; start: StartImportResult }> {
  const checked = await checkContactImport(who, runId, deps);
  if (!checked.ok) return { preflight: null, label: { create: 0, update: 0, keep: 0 }, start: checked };
  const previews = [];
  let after = 0;
  for (let i = 0; i < 200; i++) {
    const page = await contactImportChanges(who, { runId, afterLine: after }, deps);
    if (!page.ok) break;
    previews.push(...page.page.rows.map((r) => r.preview));
    if (page.page.nextAfterLine === null) break;
    after = page.page.nextAfterLine;
  }
  const overrides = Object.fromEntries(Object.entries(exceptions).map(([k, v]) => [Number(k), v]));
  const label = labelOf(adjustTally(checked.preflight.byChoice, previews, choice, overrides));
  const start = await startContactImport(who, { runId, choice, exceptions, list, expected: label, checkedAt: checked.preflight.checkedAt }, deps);
  return { preflight: checked.preflight, label, start };
}

/** Steps from the run's cursor until done or refused (a safety stop at 400 steps). */
async function drive(runId: string, deps: ImportCommitDeps, who: string = OFFICER): Promise<{ steps: number; last: CommitStepResult | null }> {
  let cursor = (await runOf(runId)).committedThrough;
  let last: CommitStepResult | null = null;
  for (let n = 1; n <= 400; n++) {
    last = await commitContactImportStep(who, { runId, fromCursor: cursor }, deps);
    if (!last.ok) return { steps: n, last };
    cursor = last.view.committedThrough;
    if (last.kind === "done") return { steps: n, last };
  }
  return { steps: 400, last };
}

const bookRows = (): StoredMarketingContact[] => [...mem().marketingContacts.values()] as StoredMarketingContact[];
/** The book as two runs can be compared: every row by number, without the ids, stamps and run ids that differ. */
const bookProjection = (): string => json(bookRows().map((c) => [
  c.msisdn, c.displayName, c.email, c.notes, c.tags.join("|"), c.source, c.importId === null ? "-" : "run",
  c.sourceRef === null ? "-" : c.sourceRef === ERASURE_EVIDENCE ? "erasure" : "ref", c.consentState, c.suppressedAt ?? "-",
].join("·")).sort());
const outcomesOf = async (runId: string): Promise<string> =>
  json((await stagedRows(runId)).map((r) => `${r.line}:${r.outcome}:${r.outcomeReason}`));
const rowJson = (id: string): string => json(mem().marketingContacts.get(id) ?? null);
const blanked = (r: StoredContactImportRow): boolean =>
  r.displayName === null && r.email === null && r.notes === null && r.tags.length === 0 && r.rawPhone === "" && r.outcome !== null;
const FORBIDDEN_WORDS = /player|erase|erasure|consent|ledger|contactId/i;
const LIST_AT = NOW.toISOString();
const listRow = (id: string, name: string) => ({ id, name, description: null, createdAt: LIST_AT, createdBy: null, updatedAt: LIST_AT, updatedBy: null });

/** Every failures page from the top, until nextAfterLine is null. */
async function allFailures(runId: string, deps: ImportCommitDeps, who: string = OFFICER): Promise<{ lines: number[]; sentences: Map<number, string>; ok: boolean; pages: unknown[] }> {
  const lines: number[] = [];
  const sentences = new Map<number, string>();
  const pages: unknown[] = [];
  let after = 0;
  let ok = true;
  for (let i = 0; i < 100; i++) {
    const r = await contactImportFailures(who, { runId, afterLine: after }, deps);
    pages.push(r);
    if (!r.ok) return { lines, sentences, ok: false, pages };
    if (r.rows.length > 50) ok = false;
    for (const row of r.rows) {
      lines.push(row.line);
      sentences.set(row.line, row.sentence);
    }
    if (r.nextAfterLine === null) return { lines, sentences, ok, pages };
    after = r.nextAfterLine;
  }
  return { lines, sentences, ok: false, pages };
}
const ascending = (xs: readonly number[]): boolean => xs.every((x, i) => i === 0 || xs[i - 1] < x);

/** A run row as staging leaves one, in an OPEN or a finished status — M21's world of other officers' runs. */
function runRow(id: string, createdBy: string, status: StoredContactImport["status"], createdAt: string): StoredContactImport {
  return {
    id, status, format: "csv", fileName: null, fileDigest: DIGEST, mapping: { ...MAPPING }, totalRows: 2, unreadable: 0, stagedThrough: 0,
    committedThrough: 0, decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null, decisionConfirmedBy: null,
    consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null, consentBasisSetBy: null,
    consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: status === "DONE" || status === "CANCELLED" ? createdAt : null,
    createdAt, createdBy, updatedAt: createdAt, targetListId: null,
  } as StoredContactImport;
}

/* ══ THE RUN ══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function run({ impl, ok, log }: Ctx): Promise<void> {
  // ── M19 · what only the source can show ──
  {
    const { check, commit, actions } = impl.sources;
    const importsOf = (src: string): string[] => [...src.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]);
    const sends = [...importsOf(check), ...importsOf(commit)].filter((s) => /sms|dispatch|optout|opt-out|consent-ledger|ledger-stamp/.test(s));
    const gateImports = [...`${check}${LF}${commit}`.matchAll(/^import\s+([^;]*?)\s+from\s+"@\/lib\/server\/marketing\/consent";/gm)].map((m) => m[1].replace(/\s+/g, " "));
    const writes = /db[.](?:messagingConsent[.]create|suppression[.](?:create|lift))\s*[(]/.exec(check + commit);
    const EXPECTED_ACTIONS = [
      "cancelImportAction", "checkImportAction", "commitImportStepAction", "discardImportAction", "importChangesAction",
      "importFailuresAction", "importListsAction", "importOpenRunsAction", "importResultAction", "importViewAction", "openImportAction",
      "pauseImportAction", "readXlsxImportAction", "resumeImportAction", "stageImportRowsAction", "startImportAction",
    ];
    const exported = [...actions.matchAll(/^export\s+(async\s+)?function\s+(\w+)/gm)].map((m) => ({ name: m[2], isAsync: Boolean(m[1]) }));
    const otherExports = [...actions.matchAll(/^export\s+(?!async\s+function|type\s|function)/gm)].length;
    ok(L.M19, sends.length === 0 && gateImports.length === 0 && writes === null
      && /^\s*"use server";/.test(actions) && json(exported.map((e) => e.name).sort()) === json(EXPECTED_ACTIONS)
      && exported.every((e) => e.isAsync) && otherExports === 0,
      `sends [${sends}] · gate imports [${gateImports}] · writes ${writes?.[0] ?? "none"} · actions ${exported.length}`);
  }

  // ── the 40-row file under TAKE_FILE, by a READER, into a NEW list, in ONE step: M1 M7 M8 M9 M10 M16 M18 (+ M11's reader half) ──
  let answers: unknown[] = [];
  let readerSplit: ImportResultResult | null = null;
  let adminSplit: ImportResultResult | null = null;
  let maskedSplit: ImportResultResult | null = null;
  await inFreshStore(async () => {
    await seedFortyWorld();
    const truth0 = truthCounts();
    const runId = await stageFile(READER, fortyRows());
    const before = { b3: rowJson("mc_w_b3"), b4: rowJson("mc_w_b4"), b5: rowJson("mc_w_b5") };
    const { start } = await checkAndStart(runId, impl.deps, "TAKE_FILE", { kind: "new", name: "October file" }, {}, READER);
    const step = await commitContactImportStep(READER, { runId, fromCursor: 0 }, impl.deps);
    const view = step.ok ? step.view : null;
    const created = bookRows().filter((c) => c.importId === runId);
    log(`40-row commit: ${step.ok ? `${step.kind} · ${json(view?.totals)}` : `refused ${step.reason}`}`);
    ok(L.M1, start.ok && step.ok && step.kind === "done" && view !== null && view.committedThrough === 40 && view.status === "DONE"
      && json(view.totals) === json({ staged: 40, unreadable: 2, pending: 0, create: 22, update: 2, keep: 7, fail: 9 })
      && created.length === 22 && created.every((c) => c.source === "IMPORT" && c.sourceRef === runId && c.userId === null)
      && bookRows().length === 6 + 22,
      `start ${start.ok ? "ok" : start.reason} · ${json(view?.totals ?? null)} · created ${created.length}`);

    const rows = await stagedRows(runId);
    const at = (line: number): StoredContactImportRow | undefined => rows.find((r) => r.line === line);
    ok(L.M7, before.b3 === rowJson("mc_w_b3") && before.b4 === rowJson("mc_w_b4") && before.b5 === rowJson("mc_w_b5")
      && rowJson("mc_w_b3") !== "null" && rowJson("mc_w_b5") !== "null" && at(15)?.outcome === "keep" && at(15)?.outcomeReason === "account",
      `B3 ${before.b3 === rowJson("mc_w_b3")} · B4 ${before.b4 === rowJson("mc_w_b4")} · B5 ${before.b5 === rowJson("mc_w_b5")} · line 15 ${at(15)?.outcome}/${at(15)?.outcomeReason}`);

    const linked = bookRows().filter((c) => c.userId !== null).map((c) => c.id);
    ok(L.M8, json(truthCounts()) === json(truth0) && json(linked) === json(["mc_w_b5"]), `${json(truth0)} → ${json(truthCounts())} · linked [${linked}]`);

    const sentence = (line: number): string => failedRowSentence(at(line) ?? ({ readError: null, problems: [], msisdn: null } as never));
    ok(L.M9, rows.length === 40 && rows.every(blanked) && rows.every((r) => r.line >= 2 && r.outcome !== null)
      && at(2)?.msisdn === keyOf(N(1)) && at(17)?.outcomeReason === "same_run" && at(13)?.outcomeReason === "no_change"
      && sentence(11) === parseTzNumber("12345").reason && sentence(14) === SAMPLE_ROW_SENTENCE && sentence(25) === parseTzNumber("").reason
      && sentence(5).includes("email address") && sentence(9) === "This card was cut off before its end."
      && rows.every((r) => r.outcomeReason !== "erased"),
      `blanked ${rows.filter(blanked).length}/40 · 11: "${sentence(11)}" · 14: "${sentence(14)}"`);

    const list = [...mem().contactLists.values()].find((l) => (l as { name: string }).name === "October file") as { id: string } | undefined;
    const members = [...mem().contactListMembers.values()] as Array<{ listId: string; contactId: string; addedAt: string }>;
    const onList = members.filter((m) => list !== undefined && m.listId === list.id);
    const expectedMembers = new Set([...created.map((c) => c.id), "mc_w_b1", "mc_w_b2", "mc_w_b3", "mc_w_b5", "mc_w_b6"]);

    readerSplit = await contactImportResult(READER, runId, impl.deps);
    adminSplit = await contactImportResult(ADMIN, runId, impl.deps);

    const n = (local: string): StoredMarketingContact | undefined => bookRows().find((c) => c.msisdn === keyOf(local));
    ok(L.M18, n(N(1))?.consentState === "GIVEN" && n(N(4))?.suppressedAt === "2026-09-02T08:00:00.000Z" && n(N(4))?.consentState === "UNKNOWN"
      && n(N(2))?.suppressedAt === null && n(N(5))?.consentState === "UNKNOWN" && n(N(5))?.suppressedAt === null,
      `N1 ${n(N(1))?.consentState} · N4 ${n(N(4))?.suppressedAt} · N2 ${n(N(2))?.suppressedAt}`);

    const failures = await allFailures(runId, impl.deps, READER);
    answers = [start, step, readerSplit, adminSplit, failures.pages];

    // ── the same file AGAIN, into the same list: no duplicate, no addedAt moved ──
    const addedBefore = json(onList.map((m) => [m.contactId, m.addedAt]).sort());
    const again = await stageFile(READER, fortyRows());
    const second = await checkAndStart(again, impl.deps, "TAKE_FILE", { kind: "existing", listId: list?.id ?? "cl_none" }, {}, READER);
    const secondRun = await drive(again, impl.deps, READER);
    const onListAfter = ([...mem().contactListMembers.values()] as Array<{ listId: string; contactId: string; addedAt: string }>)
      .filter((m) => list !== undefined && m.listId === list.id);
    const addedAfter = json(onListAfter.map((m) => [m.contactId, m.addedAt]).sort());
    ok(L.M10, list !== undefined && onList.length === 27 && onList.every((m) => expectedMembers.has(m.contactId)) && !onList.some((m) => m.contactId === "mc_w_b4")
      && second.start.ok && secondRun.last?.ok === true && onListAfter.length === 27 && addedAfter === addedBefore,
      `members ${onList.length} → ${onListAfter.length} · second start ${second.start.ok ? "ok" : second.start.reason}`);
    answers.push(second.start, secondRun.last);
  });
  const answerText = json([answers, captured]);
  ok(L.M16, answers.length >= 5 && !/mc_[a-z_]/.test(json(answers)) && !json(answers).includes("usr_w_player")
    && !FORBIDDEN_WORDS.test(json(answers)) && !holdsDigitRun(answerText),
    `contact id ${/mc_[a-z_]/.exec(json(answers))?.[0] ?? "none"} · word ${FORBIDDEN_WORDS.exec(json(answers))?.[0] ?? "none"} · digit run ${holdsDigitRun(answerText)}`);

  // ── M12 · bets come first (a GROWTH officer's KEEP run — and M11's masked half) ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    await checkAndStart(runId, impl.deps, "KEEP", { kind: "none" });
    const admission = (globalThis as { __50PICK_ADMISSION?: { queue: unknown[] } }).__50PICK_ADMISSION;
    const waiter = { resolve: () => undefined, timer: null, enqueuedAt: NOW.getTime(), settled: false };
    admission?.queue.push(waiter);
    let busy: CommitStepResult;
    try {
      busy = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, impl.deps);
    } finally {
      const i = admission?.queue.indexOf(waiter) ?? -1;
      if (admission && i >= 0) admission.queue.splice(i, 1);
    }
    const cursor = (await runOf(runId)).committedThrough;
    const then = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, impl.deps);
    ok(L.M12, !busy.ok && busy.reason === "busy" && busy.retryAfterSec === 5 && cursor === 0 && then.ok && then.kind === "done",
      `${busy.ok ? busy.kind : busy.reason} · cursor ${cursor} · then ${then.ok ? then.kind : then.reason}`);
    maskedSplit = await contactImportResult(OFFICER, runId, impl.deps);
  });
  const splitOf = (r: ImportResultResult | null): string => (r === null ? "none" : r.ok ? json(r.result.kept) : r.reason);
  const reader = readerSplit as ImportResultResult | null;
  const admin = adminSplit as ImportResultResult | null;
  const masked = maskedSplit as ImportResultResult | null;
  const WANT_SPLIT = json({ inBookUnchanged: 3, onStopList: 1, repeated: 3, chosenKeep: 0 });
  ok(L.M11, reader !== null && reader.ok && json(reader.result.kept) === WANT_SPLIT && admin !== null && admin.ok && json(admin.result.kept) === WANT_SPLIT
    && reader.result.list !== null && reader.result.list.name === "October file" && reader.result.list.covered === false
    && masked !== null && masked.ok && masked.result.kept === null && masked.result.list === null,
    `reader ${splitOf(reader)} · admin ${splitOf(admin)} · growth ${splitOf(masked)}`);

  // ── M6 · pause, resume, cancel (ten rows a step) — and cancel before the start ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const deps10: ImportCommitDeps = { ...impl.deps, stepRows: 10 };
    const runId = await stageFile(OFFICER, fortyRows());
    await checkAndStart(runId, deps10, "KEEP", { kind: "none" });
    const s1 = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, deps10);
    const paused = await pauseContactImport(OFFICER, { runId }, deps10);
    const s2 = await commitContactImportStep(OFFICER, { runId, fromCursor: 10 }, deps10);
    const cursorPaused = (await runOf(runId)).committedThrough;
    const resumed = await resumeContactImport(OFFICER, { runId }, deps10);
    const s3 = await commitContactImportStep(OFFICER, { runId, fromCursor: 10 }, deps10);
    const cancelled: RunActResult = await cancelContactImport(OFFICER, { runId }, deps10);
    const s4 = await commitContactImportStep(OFFICER, { runId, fromCursor: 20 }, deps10);
    const left = await stagedRows(runId);
    const written = bookRows().filter((c) => c.importId === runId).length;
    const other = await stageFile(OFFICER, fortyRows());
    const discarded: RunActResult = await cancelContactImport(OFFICER, { runId: other }, deps10);
    const otherRows = await stagedRows(other);
    ok(L.M6, s1.ok && s1.kind === "advanced" && s1.view.committedThrough === 10
      && paused.ok && paused.view.status === "PAUSED" && paused.view.pausedBy === "you"
      && !s2.ok && s2.reason === "paused" && cursorPaused === 10
      && resumed.ok && resumed.view.status === "COMMITTING" && s3.ok && s3.view.committedThrough === 20
      && cancelled.ok && cancelled.view.status === "CANCELLED" && cancelled.view.totals.pending === 0 && left.length === 20
      && cancelled.notImported === 20 && written === cancelled.view.totals.create && written > 0
      && !s4.ok && s4.reason === "cancelled"
      && discarded.ok && discarded.view.status === "CANCELLED" && discarded.notImported === 40 && otherRows.length === 0,
      `s1 ${s1.ok ? s1.view.committedThrough : s1.reason} · pause ${paused.ok ? paused.view.status : paused.reason} · s2 ${s2.ok ? s2.kind : s2.reason} · s3 ${s3.ok ? s3.view.committedThrough : s3.reason} · cancel ${cancelled.ok ? `${json(cancelled.view.totals)} notImported ${cancelled.notImported}` : cancelled.reason} · s4 ${s4.ok ? s4.kind : s4.reason} · discard ${discarded.ok ? `${discarded.view.status} notImported ${discarded.notImported}` : discarded.reason}`);
  });

  // ── M13 · a conflict, decided once more — and one that moves twice (a reader's TAKE_FILE) ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    let touches = 0;
    const touch = async (): Promise<void> => {
      touches++;
      await db.marketingContact.update("mc_w_b1", { notes: `touched ${touches}` }, `2026-10-09T08:5${touches}:00.000Z`);
    };
    const runId = await stageFile(READER, fortyRows());
    await checkAndStart(runId, impl.deps, "TAKE_FILE", { kind: "none" }, {}, READER);
    let calls = 0;
    const once: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { if (calls++ === 0) await touch(); return impl.deps.commitBatch(b); } };
    const s = await commitContactImportStep(READER, { runId, fromCursor: 0 }, once);
    const b1 = bookRows().find((c) => c.id === "mc_w_b1");
    const line3 = (await stagedRows(runId)).find((r) => r.line === 3);
    const firstCase = s.ok && b1?.displayName === "Asha Mwakalinga" && b1.notes === "touched 1" && line3?.outcome === "update";

    const again = await stageFile(READER, fortyRows().map((r) => ("cells" in r && r.line === 3 ? { line: 3, cells: [B(1), "Asha Twice", "", "", ""] } : r)));
    await checkAndStart(again, impl.deps, "TAKE_FILE", { kind: "none" }, {}, READER);
    const always: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { await touch(); return impl.deps.commitBatch(b); } };
    const s2 = await commitContactImportStep(READER, { runId: again, fromCursor: 0 }, always);
    const b1Again = bookRows().find((c) => c.id === "mc_w_b1");
    const line3Again = (await stagedRows(again)).find((r) => r.line === 3);
    ok(L.M13, firstCase && s2.ok && b1Again?.displayName === "Asha Mwakalinga" && line3Again?.outcome === "keep"
      && line3Again.outcomeReason === "changed_during_import",
      `first: ${s.ok ? s.kind : s.reason}, B1 "${b1?.displayName}", line 3 ${line3?.outcome} · twice: ${s2.ok ? s2.kind : s2.reason}, line 3 ${line3Again?.outcome}/${line3Again?.outcomeReason}`);
  });

  // ── M14 · the start's checks (a reader's TAKE_FILE) ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    await db.contactList.create(listRow("cl_existing", "Existing"));
    const runId = await stageFile(READER, fortyRows());
    const checked = await checkContactImport(READER, runId, impl.deps);
    if (!checked.ok) {
      ok(L.M14, false, `the check refused: ${checked.reason}`);
      return;
    }
    const base = labelOf(checked.preflight.byChoice.TAKE_FILE);
    const fresh = checked.preflight.checkedAt;
    const body = (o: Record<string, unknown>): Record<string, unknown> => ({
      runId, choice: "TAKE_FILE", exceptions: {}, list: { kind: "none" }, expected: base, checkedAt: fresh, ...o,
    });
    const ask = (o: Record<string, unknown>, deps: ImportCommitDeps = impl.deps) => startContactImport(READER, body(o), deps);
    const reasons = [
      await ask({ choice: "OVERWRITE" }),
      await ask({ exceptions: { "06": "KEEP" } }),
      await ask({ exceptions: Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [String(i + 2), "KEEP"])) }),
      await ask({ exceptions: { "19": "KEEP" } }),
      await ask({ list: { kind: "existing", listId: "cl_gone" } }),
      await ask({ list: { kind: "new", name: "EXISTING" } }),
      await ask({ list: { kind: "new", name: "Call 0712 345 678" } }),
      await ask({ checkedAt: new Date(NOW.getTime() - 31 * 60 * 1000).toISOString() }),
      await ask({ checkedAt: new Date(NOW.getTime() + 3 * 60 * 1000).toISOString() }),
      await ask({ checkedAt: "not a date" }),
      await ask({ expected: { ...base, create: base.create + 1 } }),
    ].map((r) => (r.ok ? "ok" : r.reason));
    const WANT = [
      "bad_choice", "bad_exceptions", "bad_exceptions", "bad_exceptions", "list_gone", "list_name_taken", "bad_list",
      "check_stale", "check_stale", "check_stale", "check_again",
    ];
    const untouched = (await runOf(runId)).status === "STAGED" && mem().contactLists.size === 1;
    // R12 · the name taken between the check and the freeze: the unique index refuses the new list inside the freeze.
    const nameRace = await ask({ list: { kind: "new", name: "Raced Name" } }, {
      ...impl.deps, freeze: async (f) => { await db.contactList.create(listRow("cl_racer", "Raced Name")); return impl.deps.freeze(f); },
    });
    const racedNames = ([...mem().contactLists.values()] as Array<{ name: string }>).filter((l) => l.name === "Raced Name").length;
    // R17 · an existing list deleted between the check and the freeze: the foreign key refuses the freeze.
    await db.contactList.create(listRow("cl_doomed", "Doomed"));
    const goneRace = await ask({ list: { kind: "existing", listId: "cl_doomed" } }, {
      ...impl.deps, freeze: async (f) => { mem().contactLists.delete("cl_doomed"); return impl.deps.freeze(f); },
    });
    const stillStaged = (await runOf(runId)).status === "STAGED";
    // A valid start with ONE exception: row 3 (B1, which TAKE_FILE would change) kept as it is.
    const previews = [];
    const page = await contactImportChanges(READER, { runId, afterLine: 0 }, impl.deps);
    if (page.ok) previews.push(...page.page.rows.map((r) => r.preview));
    const label = labelOf(adjustTally(checked.preflight.byChoice, previews, "TAKE_FILE", { 3: "KEEP" }));
    const valid = await ask({ exceptions: { "3": "KEEP" }, expected: label, list: { kind: "existing", listId: "cl_existing" } });
    const frozen = await runOf(runId);
    ok(L.M14, json(reasons) === json(WANT) && untouched && !nameRace.ok && nameRace.reason === "list_name_taken" && racedNames === 1
      && !goneRace.ok && goneRace.reason === "list_gone" && stillStaged
      && valid.ok && frozen.status === "COMMITTING" && frozen.decisionChoice === "TAKE_FILE"
      && json(frozen.decisionOverrides) === json({ 3: "KEEP" }) && frozen.targetListId === "cl_existing" && label.update === 1,
      `${json(reasons)} · untouched ${untouched} · name race ${nameRace.ok ? "ok" : nameRace.reason} (${racedNames} named) · gone race ${goneRace.ok ? "ok" : goneRace.reason} · valid ${valid.ok ? "ok" : valid.reason} · label ${json(label)}`);
  });

  // ── M15 · the freeze, and R12: a lost start leaves no list ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    const checked = await checkContactImport(OFFICER, runId, impl.deps);
    const label = checked.ok ? labelOf(checked.preflight.byChoice.KEEP) : { create: 0, update: 0, keep: 0 };
    const body = (name: string) => ({
      runId, choice: "KEEP", exceptions: {}, list: { kind: "new", name }, expected: label, checkedAt: checked.ok ? checked.preflight.checkedAt : "",
    });
    const [a, b] = await Promise.all([startContactImport(OFFICER, body("Race A"), impl.deps), startContactImport(ADMIN, body("Race B"), impl.deps)]);
    const wins = [a, b].filter((r) => r.ok).length;
    const loser = [a, b].find((r) => !r.ok);
    const frozen = await runOf(runId);
    const lists = [...mem().contactLists.values()] as Array<{ id: string; name: string }>;
    const winnerName = a.ok ? "Race A" : "Race B";
    ok(L.M15, wins === 1 && loser !== undefined && !loser.ok && loser.reason === "already_started" && frozen.status === "COMMITTING"
      && frozen.decisionChoice === "KEEP" && json(lists.map((l) => l.name)) === json([winnerName]) && frozen.targetListId === lists[0]?.id,
      `${[a, b].map((r) => (r.ok ? "ok" : r.reason)).join(" · ")} · ${frozen.status} · lists [${lists.map((l) => l.name)}]`);
  });

  // ── M20 · S15-10 · a GROWTH officer starts with KEEP alone ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    const checked = await checkContactImport(OFFICER, runId, impl.deps);
    const label = checked.ok ? labelOf(checked.preflight.byChoice.KEEP) : { create: 0, update: 0, keep: 0 };
    const fresh = checked.ok ? checked.preflight.checkedAt : "";
    const ask = (o: Record<string, unknown>) => startContactImport(OFFICER, {
      runId, choice: "KEEP", exceptions: {}, list: { kind: "none" }, expected: label, checkedAt: fresh, ...o,
    }, impl.deps);
    captured.length = 0;
    const refused = [
      await ask({ choice: "TAKE_FILE" }),
      await ask({ choice: "FILL_BLANKS" }),
      await ask({ exceptions: { "3": "KEEP" } }),
      await ask({ exceptions: { "3": "TAKE_FILE" } }),
    ];
    const rowsOf = captured.filter((x) => x.action === "contacts.import.commit_refused" && (x.payload as { reason?: unknown }).reason === "update_needs_reader");
    const keysOk = rowsOf.every((x) => Object.keys(x.payload as Record<string, unknown>).sort().join(",") === "exceptions,reason,step");
    const untouched = (await runOf(runId)).status === "STAGED";
    const keep = await ask({});
    const frozen = await runOf(runId);
    ok(L.M20, checked.ok && checked.preflight.mayUpdateInBook === false
      && refused.every((r) => !r.ok && r.reason === "update_needs_reader") && rowsOf.length === 4 && keysOk && untouched
      && keep.ok && frozen.status === "COMMITTING" && frozen.decisionChoice === "KEEP" && !holdsDigitRun(json(rowsOf)),
      `${refused.map((r) => (r.ok ? "ok" : r.reason)).join(" · ")} · audit rows ${rowsOf.length} (keys ${keysOk}) · keep ${keep.ok ? "ok" : keep.reason}`);
  });

  // ── M21 · S15-12 · an ADMIN's view of other officers' unfinished runs ──
  await inFreshStore(async () => {
    const hourAgo = (h: number): string => new Date(NOW.getTime() - h * 3_600_000).toISOString();
    const OPEN: StoredContactImport["status"][] = ["STAGING", "STAGED", "COMMITTING", "PAUSED"];
    for (let k = 0; k < 22; k++) {
      await db.contactImport.create(runRow(`ci_other${String.fromCharCode(97 + k)}aaaaaaaaaaaaaaaaaaa`.slice(0, 23), `usr_far_${k}`, OPEN[k % 4], hourAgo(30 + k)));
    }
    await db.contactImport.create(runRow("ci_newestaaaaaaaaaaaaaaa", OFFICER, "PAUSED", hourAgo(1)));
    await db.contactImport.create(runRow("ci_adminsownaaaaaaaaaaa", ADMIN, "STAGED", hourAgo(0)));
    await db.contactImport.create(runRow("ci_finisheddaaaaaaaaaaa", "usr_far_x", "DONE", hourAgo(2)));
    await db.contactImport.create(runRow("ci_cancelledaaaaaaaaaaa", "usr_far_y", "CANCELLED", hourAgo(3)));
    captured.length = 0;
    const seen = await importOpenRuns(ADMIN, impl.deps);
    const views = seen.ok ? seen.runs : [];
    const growth = await importOpenRuns(OFFICER, impl.deps);
    const refusedRows = captured.filter((x) => x.action === "contacts.import.commit_refused" && (x.payload as { reason?: unknown }).reason === "forbidden");
    const newestFirst = views.every((v, i) => i === 0 || Date.parse(views[i - 1].createdAt) >= Date.parse(v.createdAt));
    const statuses = new Set(views.map((v) => v.status));
    ok(L.M21, seen.ok && views.length === 20 && newestFirst && views[0]?.id === "ci_newestaaaaaaaaaaaaaaa" && views[0]?.startedBy === "Amina Officer"
      && views.every((v) => !v.mine && v.id !== "ci_adminsownaaaaaaaaaaa") && [...statuses].every((s) => OPEN.includes(s))
      && views.slice(1).every((v) => v.startedBy === "another officer") && !json(views).includes("usr_")
      && !growth.ok && growth.reason === "forbidden" && growth.view === null && refusedRows.length === 1,
      `${seen.ok ? `${views.length} run(s), first ${views[0]?.id ?? "none"} by ${views[0]?.startedBy ?? "nobody"}` : seen.reason} · growth ${growth.ok ? "shown runs" : growth.reason}`);
  });

  // ── M22 · R9 · the erasure race ──
  await inFreshStore(async () => {
    const Z = "0757300001";
    const player = await seedAccount(Z, "usr_r9_player", "Zawadi Mchezaji");
    const file: StageRow[] = [
      { line: 2, cells: [N(1), "One", "", "", ""] },
      { line: 3, cells: [Z, "Zed", "", "", ""] },
      { line: 4, cells: [N(2), "Two", "", "", ""] },
    ];
    const runId = await stageFile(OFFICER, file);
    await checkAndStart(runId, impl.deps, "KEEP", { kind: "none" });
    let erased = false;
    const racing: ImportCommitDeps = {
      ...impl.deps,
      commitBatch: async (b) => {
        if (!erased) {
          erased = true;
          await eraseMarketingFor({ userId: player.id, phoneE164: player.phoneE164, officerId: null });
        }
        return impl.deps.commitBatch(b);
      },
    };
    let step: CommitStepResult | null = null;
    let threw = "";
    try {
      step = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, racing);
    } catch (e) {
      threw = e instanceof Error ? e.name : String(e);
    }
    const z = keyOf(Z);
    const zBook = bookRows().filter((c) => c.msisdn === z).length;
    const created = bookRows().filter((c) => c.importId === runId).map((c) => c.msisdn).sort();
    const staged = await stagedRows(runId);
    ok(L.M22, erased && step !== null && step.ok && step.kind === "done" && zBook === 0 && json(created) === json([keyOf(N(1)), keyOf(N(2))].sort())
      && staged.length === 2 && staged.every((r) => r.msisdn !== z) && step.view.totals.create === 2 && step.view.totals.staged === 2,
      `${threw ? `threw ${threw}` : step === null ? "no answer" : step.ok ? `${step.kind} · ${json(step.view.totals)}` : `refused ${step.reason}`} · Z in the book ${zBook} · created ${created.length}`);
  });

  // ── M23 · R10 · a landed step's mirror and audit rows fail — the step stands, the run's end repairs the caches ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(READER, fortyRows());
    await checkAndStart(runId, impl.deps, "TAKE_FILE", { kind: "none" }, {}, READER);
    let mirrorCalls = 0;
    const flaky: ImportCommitDeps = {
      ...impl.deps,
      mirror: async (m, at) => {
        mirrorCalls++;
        if (mirrorCalls === 1) throw Object.assign(new Error("the cache is down"), { name: "CacheDown" });
        return impl.deps.mirror(m, at);
      },
      audit: (async (entry: Parameters<typeof captureAudit>[0]) => {
        if (entry.action === "contacts.import.batch" || entry.action === "contacts.import.finished") throw new Error("the audit chain is down");
        return impl.deps.audit(entry);
      }) as typeof captureAudit,
    };
    let step: CommitStepResult | null = null;
    let threw = "";
    try {
      step = await commitContactImportStep(READER, { runId, fromCursor: 0 }, flaky);
    } catch (e) {
      threw = e instanceof Error ? e.name : String(e);
    }
    const n = (local: string): StoredMarketingContact | undefined => bookRows().find((c) => c.msisdn === keyOf(local));
    ok(L.M23, threw === "" && step !== null && step.ok && step.kind === "done" && (await runOf(runId)).status === "DONE"
      && n(N(1))?.consentState === "GIVEN" && n(N(4))?.suppressedAt === "2026-09-02T08:00:00.000Z" && mirrorCalls >= 3,
      `${threw ? `threw ${threw}` : step === null ? "no answer" : step.ok ? step.kind : `refused ${step.reason}`} · N1 ${n(N(1))?.consentState} · N4 ${n(N(4))?.suppressedAt} · mirror calls ${mirrorCalls}`);
  });

  // ── M24 · R11 · a deadlock is busy, never server_error ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    await checkAndStart(runId, impl.deps, "KEEP", { kind: "none" });
    let tries = 0;
    const deadlocking: ImportCommitDeps = {
      ...impl.deps,
      commitBatch: async (b: ContactImportCommitBatch) => {
        tries++;
        if (tries === 1) throw Object.assign(new Error("Transaction failed due to a write conflict or a deadlock"), { code: "P2034" });
        return impl.deps.commitBatch(b);
      },
    };
    captured.length = 0;
    let first: CommitStepResult | null = null;
    let threw = "";
    try {
      first = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, deadlocking);
    } catch (e) {
      threw = e instanceof Error ? e.message.slice(0, 40) : String(e);
    }
    const cursor = (await runOf(runId)).committedThrough;
    const busyRows = captured.filter((x) => x.action === "contacts.import.commit_refused" && (x.payload as { reason?: unknown }).reason === "busy");
    const busyCode = busyRows.length === 1 && String((busyRows[0].payload as { error?: unknown }).error).includes("P2034");
    const then = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, deadlocking);
    ok(L.M24, threw === "" && first !== null && !first.ok && first.reason === "busy" && first.retryAfterSec === 5 && first.view !== null
      && cursor === 0 && busyCode && then.ok && then.kind === "done",
      `${threw ? `threw "${threw}"` : first === null ? "no answer" : first.ok ? first.kind : `${first.reason} after ${first.retryAfterSec}s`} · cursor ${cursor} · audit ${busyRows.length} (code ${busyCode}) · then ${then.ok ? then.kind : then.reason}`);
  });

  // ── the 5,000-row file, twice, by a reader: M2 M3 M4 M5 M17 ──
  let interrupted = { book: "", outcomes: "", totals: "", ok: false, detail: "" };
  let replayOk = false;
  let replayDetail = "";
  let driversOk = false;
  let driversDetail = "";
  let firstRowOk = false;
  let firstRowDetail = "";
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(READER, fiveThousandRows());
    let lastBatch: ContactImportCommitBatch | null = null;
    const recording: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { lastBatch = b; return impl.deps.commitBatch(b); } };
    const { start } = await checkAndStart(runId, recording, "TAKE_FILE", { kind: "none" }, {}, READER);
    const step = (from: number, deps: ImportCommitDeps = recording) => commitContactImportStep(READER, { runId, fromCursor: from }, deps);
    const s1 = await step(0);
    const s2 = await step(500);
    const s3 = await step(1000);
    await pauseContactImport(READER, { runId }, recording);
    const refused = await step(1500);
    await resumeContactImport(READER, { runId }, recording);
    const s4 = await step(1500);
    // M4 · the step replayed — by the service (an old cursor) and by the store (the same batch again)
    const beforeReplay = { book: bookProjection(), rows: await outcomesOf(runId), cursor: (await runOf(runId)).committedThrough };
    const replayed = await step(1500);
    const stale = lastBatch as ContactImportCommitBatch | null;
    const storeReplay = stale ? await impl.deps.commitBatch(stale) : null;
    const afterReplay = { book: bookProjection(), rows: await outcomesOf(runId), cursor: (await runOf(runId)).committedThrough };
    replayOk = replayed.ok && replayed.kind === "moved" && storeReplay !== null && storeReplay.kind === "moved" && json(beforeReplay) === json(afterReplay);
    replayDetail = `service ${replayed.ok ? replayed.kind : replayed.reason} · store ${storeReplay?.kind ?? "none"} · unchanged ${json(beforeReplay) === json(afterReplay)}`;
    // M5 · two drivers on one cursor
    const cursor = (await runOf(runId)).committedThrough;
    const [d1, d2] = await Promise.all([step(cursor), step(cursor)]);
    const advanced = [d1, d2].filter((r) => r.ok && r.kind === "advanced").length;
    const moved = [d1, d2].filter((r) => r.ok && r.kind === "moved").length;
    driversOk = advanced === 1 && moved === 1 && (await runOf(runId)).committedThrough === cursor + 500;
    driversDetail = `advanced ${advanced} · moved ${moved} · cursor ${cursor} → ${(await runOf(runId)).committedThrough}`;
    const rest = await drive(runId, recording, READER);
    const last = rest.last;
    interrupted = {
      book: bookProjection(), outcomes: await outcomesOf(runId), totals: last?.ok ? json(last.view.totals) : "",
      ok: start.ok && s1.ok && s2.ok && s3.ok && !refused.ok && refused.reason === "paused" && s4.ok && last?.ok === true && last.kind === "done",
      detail: `start ${start.ok ? "ok" : start.reason} · paused step ${refused.ok ? refused.kind : refused.reason} · last ${last?.ok ? last.kind : last?.reason ?? "none"}`,
    };
    const names = bookRows().map((c) => c.displayName ?? "");
    const createdCount = bookRows().filter((c) => c.importId === runId).length;
    firstRowOk = !names.some((n) => n.startsWith("Repeat ") || n.startsWith("Again ")) && createdCount === 3000 && bookRows().length === 3250
      && names.filter((n) => n.startsWith("File ")).length === 125;
    firstRowDetail = `repeat names ${names.filter((n) => n.startsWith("Repeat ") || n.startsWith("Again ")).length} · created ${createdCount} · File names ${names.filter((n) => n.startsWith("File ")).length}`;

    const failures = await allFailures(runId, recording, READER);
    const totals = failures.pages.every((p) => (p as { ok: boolean; total?: number }).ok && (p as { total: number }).total === 1000);
    ok(L.M17, failures.ok && failures.lines.length === 1000 && ascending(failures.lines) && totals,
      `${failures.lines.length} lines over ${failures.pages.length} page(s) · ascending ${ascending(failures.lines)} · totals ${totals}`);
  });
  let uninterrupted = { book: "", outcomes: "", totals: "" };
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(READER, fiveThousandRows());
    const deps2000: ImportCommitDeps = { ...impl.deps, stepRows: 2000 };
    await checkAndStart(runId, deps2000, "TAKE_FILE", { kind: "none" }, {}, READER);
    const r = await drive(runId, deps2000, READER);
    uninterrupted = { book: bookProjection(), outcomes: await outcomesOf(runId), totals: r.last?.ok ? json(r.last.view.totals) : "" };
  });
  const wantTotals = json({ staged: 5000, unreadable: FIVE_THOUSAND_COUNTS.unreadable, pending: 0, create: 3000, update: 125, keep: 875, fail: 1000 });
  ok(L.M2, interrupted.ok && interrupted.book === uninterrupted.book && interrupted.outcomes === uninterrupted.outcomes
    && interrupted.totals === wantTotals && uninterrupted.totals === wantTotals,
    `${interrupted.detail} · same book ${interrupted.book === uninterrupted.book} · same outcomes ${interrupted.outcomes === uninterrupted.outcomes} · totals ${interrupted.totals} / ${uninterrupted.totals}`);
  ok(L.M3, firstRowOk, firstRowDetail);
  ok(L.M4, replayOk, replayDetail);
  ok(L.M5, driversOk, driversDetail);
}

/* ══ THE PLANTS ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** A store without its cursor's compare-and-set: the batch is moved onto whatever cursor the run holds now. */
const casLess = (inner: ImportCommitDeps["commitBatch"]): ImportCommitDeps["commitBatch"] => async (b) => {
  const now = await db.contactImport.find(b.importId);
  const from = now?.committedThrough ?? b.fromCursor;
  return inner({ ...b, fromCursor: from, toCursor: Math.max(from, b.toCursor) });
};

/**
 * P5's store IGNORES its cursor's compare-and-set outright: the run's cursor is wound back to the batch's own before the
 * real write, so a batch built on a cursor another driver already moved passes and is applied AGAIN — what two drivers do
 * to a store with no compare-and-set. (`casLess` above cannot stand in here: it moves the batch onto the CURRENT cursor and
 * still calls the guarded store, so the second driver met the real compare-and-set and M5 stayed green — the lead's first
 * red run, 2026-10-09.) Memory twin only, which is where this suite runs.
 */
const casIgnored = (inner: ImportCommitDeps["commitBatch"]): ImportCommitDeps["commitBatch"] => async (b) => {
  const store = (globalThis as unknown as { __50PICK_STORE?: { contactImports?: Map<string, { committedThrough: number }> } }).__50PICK_STORE;
  const run = store?.contactImports?.get(b.importId);
  if (run && run.committedThrough !== b.fromCursor) run.committedThrough = b.fromCursor;
  return inner(b);
};

const plants: readonly RedPlant<CommitImpl>[] = [
  {
    name: "P1 · a step settles ten rows — the 40-row file takes four steps, not one",
    expect: L.M1,
    impl: () => withDeps({ stepRows: 10 }),
  },
  {
    name: "P2 · the store hands back one row fewer than a step asks for, and the step reads the short page as the run's END",
    expect: L.M2,
    impl: () => withDeps({ rowsAfter: async (w) => db.contactImportRow.after({ ...w, limit: w.limit > 1 ? w.limit - 1 : w.limit }) }),
  },
  {
    name: "P3 · the first lines are read from the rows NOT YET SETTLED — a number whose first row an earlier step settled reads as first again",
    expect: L.M3,
    impl: () => withDeps({
      firstLines: async (q) => {
        const want = new Set(q.msisdns);
        const first = new Map<string, number>();
        for (const r of await stagedRows(q.importId)) {
          if (r.outcome !== null || r.msisdn === null || !want.has(r.msisdn) || r.readError !== null || r.problems.length !== 0) continue;
          const seen = first.get(r.msisdn);
          if (seen === undefined || r.line < seen) first.set(r.msisdn, r.line);
        }
        return [...first].map(([msisdn, line]) => ({ msisdn, line }));
      },
    }),
  },
  {
    name: "P4 · the store's commit has no compare-and-set on the cursor — a replayed batch is applied again",
    expect: L.M4,
    impl: () => withDeps({ commitBatch: casLess(REAL_DEPS.commitBatch) }),
  },
  {
    name: "P5 · a store that ignores its compare-and-set outright, met by two drivers at once — both advance",
    expect: L.M5,
    impl: () => withDeps({ commitBatch: casIgnored(REAL_DEPS.commitBatch) }),
  },
  {
    name: "P6 · the status transition writes nothing and answers the run — a pause that does not pause",
    expect: L.M6,
    impl: () => withDeps({ transition: async (t) => db.contactImport.find(t.importId) }),
  },
  {
    name: "P6b · R5 · cancel reads what is left once the unsettled rows are gone — every cancel says nothing was left unimported",
    expect: L.M6,
    impl: () => withDeps({ leftUnimported: () => 0 }),
  },
  {
    name: "P7 · the facts loader reads no stop — a stopped contact is updated from the file",
    expect: L.M7,
    impl: () => withDeps({ reads: { ...REAL_DEPS.reads, activeStops: async () => [] } }),
  },
  {
    name: "P7b · S15-11 · the book read drops the account link — the player's registration row is overwritten from the file",
    expect: L.M7,
    impl: () => withDeps({
      reads: { ...REAL_DEPS.reads, snapshots: async (m) => (await REAL_DEPS.reads.snapshots(m)).map((r) => ({ ...r, userId: null })) },
    }),
  },
  {
    name: "P8 · the cache mirror records a consent for the number first — the import writes the ledger",
    expect: L.M8,
    impl: () => withDeps({
      mirror: async (msisdn, at) => {
        if (!mem().messagingConsents.has(`led_planted_${msisdn}`)) {
          await db.messagingConsent.create({
            id: `led_planted_${msisdn}`, channel: "SMS", identifier: msisdn, category: "MARKETING", status: "GIVEN", source: "IMPORT",
            wording: "planted", locale: "EN", evidence: null, recordedBy: null, createdAt: at,
          });
        }
        return REAL_DEPS.mirror(msisdn, at);
      },
    }),
  },
  {
    name: "P9 · the commit drops the failure sentences — a blanked row can no longer say why it failed",
    expect: L.M9,
    impl: () => withDeps({ commitBatch: async (b) => REAL_DEPS.commitBatch({ ...b, sentences: [] }) }),
  },
  {
    name: "P10 · the commit forgets the list — no contact joins it",
    expect: L.M10,
    impl: () => withDeps({ commitBatch: async (b) => REAL_DEPS.commitBatch({ ...b, members: [] }) }),
  },
  {
    name: "P11 · every viewer reads as one who may read numbers — a GROWTH officer is shown the stop split (OD54)",
    expect: L.M11,
    impl: () => withDeps({ readsNumbers: async () => true }),
  },
  {
    name: "P12 · the admission queue is never asked — an import step runs while a bet waits",
    expect: L.M12,
    impl: () => withDeps({ queueDepth: () => 0 }),
  },
  {
    name: "P13 · a conflicting step is never decided again — an edited contact is kept as changed_during_import at once",
    expect: L.M13,
    impl: () => withDeps({ maxRedecides: 0 }),
  },
  {
    name: "P14 · every row may carry an exception — one on a row that does not change is accepted",
    expect: L.M14,
    impl: () => withDeps({ changeable: () => true }),
  },
  {
    name: "P14b · R7 · the check's age is not asked — a start pressed from a screen left open an hour freezes the run",
    expect: L.M14,
    impl: () => withDeps({ checkFreshMs: Number.POSITIVE_INFINITY }),
  },
  {
    name: "P15 · the freeze puts the run back to STAGED first — two starts both freeze it",
    expect: L.M15,
    impl: () => withDeps({
      freeze: async (f) => {
        await db.contactImport.transition({ importId: f.importId, from: ["COMMITTING"], to: "STAGED", by: null, at: f.at, updatedBefore: null });
        return db.contactImport.freezeDecision(f);
      },
    }),
  },
  {
    name: "P15b · R12 · the new list is created BEFORE the freeze, in a write of its own — the start that loses the run leaves its list behind",
    expect: L.M15,
    impl: () => withDeps({
      freeze: async (f) => {
        if (f.newList !== null) await db.contactList.create(f.newList);
        return db.contactImport.freezeDecision({ ...f, newList: null });
      },
    }),
  },
  {
    name: "P16 · a failure's sentence ends with the row's number",
    expect: L.M16,
    impl: () => withDeps({ sentenceOf: (row) => `${failedRowSentence(row)} ${row.msisdn ?? ""}`.trim() }),
  },
  {
    name: "P17 · the failures come back last row first",
    expect: L.M17,
    impl: () => withDeps({
      failedPage: async (q) => {
        const page = await db.contactImportRow.failedPage(q);
        return { ...page, rows: [...page.rows].reverse() };
      },
    }),
  },
  {
    name: "P18 · the cache mirror is a no-op — a created number the ledger knows reads UNKNOWN",
    expect: L.M18,
    impl: () => withDeps({ mirror: async () => "none" }),
  },
  {
    name: "P19 · the commit module imports the consent ledger's writer",
    expect: L.M19,
    impl: () => {
      const r = real();
      return { ...r, sources: { ...r.sources, commit: `import { appendMarketingConsent } from "@/lib/server/marketing/consent-ledger";${LF}${r.sources.commit}` } };
    },
  },
  {
    name: "P20 · S15-10 · the start never asks the matrix — a GROWTH officer's TAKE_FILE start goes ahead",
    expect: L.M20,
    impl: () => withDeps({ readsNumbers: async () => true }),
  },
  {
    name: "P21 · S15-12 · the open-runs read keeps the viewer's own runs",
    expect: L.M21,
    impl: () => withDeps({ openRuns: async (q) => db.contactImport.listOpenByOthers({ ...q, excludeCreatedBy: "nobody" }) }),
  },
  {
    name: "P22 · R9 · the store settles whatever staged rows are left and ignores the missing ones — the erased number is created",
    expect: L.M22,
    impl: () => withDeps({
      commitBatch: async (b) => {
        const live = new Set((await stagedRows(b.importId)).map((r) => r.ordinal));
        return REAL_DEPS.commitBatch({ ...b, outcomes: b.outcomes.filter((o) => live.has(o.ordinal)), sentences: b.sentences.filter((s) => live.has(s.ordinal)) });
      },
    }),
  },
  {
    name: "P23 · R10 · the run's end never mirrors again — a step mirror that failed leaves a created number's cache wrong for good",
    expect: L.M23,
    impl: () => withDeps({ finishCaches: async () => 0 }),
  },
  {
    name: "P23b · R10 · the work after a landed step is not guarded — a cache mirror that throws turns the step into a throw",
    expect: L.M23,
    impl: () => withDeps({ bestEffort: async (_what, work) => { await work(); return true; } }),
  },
  {
    name: "P24 · R11 · no database fault is retryable — a deadlock inside a step is a throw (server_error to the browser)",
    expect: L.M24,
    impl: () => withDeps({ retryable: () => false }),
  },
];

export const COMMIT_SECTION: ImportSection<CommitImpl> = { name: "commit", owner: "S15", real, run, plants };
