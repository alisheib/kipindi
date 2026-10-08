/**
 * test:contacts-import · section "commit" — S15 C4: the import's start and commit (`src/lib/server/contacts/import-commit.ts`)
 * and the action file over them (`src/app/admin/contacts/import/import-actions.ts`).            (S15, 2026-10-09)
 *
 * ⭐ EXECUTED, NOT READ. The REAL start, step, pause, resume, cancel, failures and result run over files staged through
 * the REAL staging service on the memory twin (`scripts/lib/contacts-import-world.mts`): the 40-row file committed in ONE
 * step, the deterministic 5,000-row file committed 500 rows a step — with a pause, a resume, a replayed step and two
 * drivers on one cursor — and again 2,000 a step without a break, the two ending identical. Only what only the source can
 * show is read from it (M19): what the cores import and what the action file exports.
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
import type { ContactImportCommitBatch, StoredContactImportRow, StoredMarketingContact } from "../../src/lib/server/store.ts";
import type { CommitStepResult, PreflightView, StartImportResult } from "../../src/lib/contacts/import-flow.ts";
import type { ImportChoice, ShownTally } from "../../src/lib/contacts/import-decide.ts";
import { adjustTally } from "../../src/lib/contacts/import-decide.ts";
import {
  ADMIN, B, FIVE_THOUSAND_COUNTS, N, NOW, OFFICER, captureAudit, captured, checkModule, commitModule, db, fiveThousandRows,
  fortyRows, holdsDigitRun, inFreshStore, keyOf, mem, runOf, seedFiveThousandBook, seedFortyWorld, stageFile, stagedRows,
  truthCounts,
} from "../lib/contacts-import-world.mts";
import { SAMPLE_ROW_SENTENCE } from "../../src/lib/contacts/sample-sheet.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

const {
  IMPORT_COMMIT_DEPS, cancelContactImport, commitContactImportStep, contactImportFailures, contactImportResult, failedRowSentence,
  pauseContactImport, resumeContactImport, startContactImport,
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
  M1: "M1 · ⭐ the 40-row file commits in ONE step under TAKE_FILE: done, the cursor at 40, the totals COUNTED from the rows (22 created · 2 updated · 7 kept · 9 failed), and the book gains exactly 22 rows — source IMPORT, sourceRef and importId the run (X6), no account link",
  M2: "M2 · ⭐ 5,000 rows committed 500 a step — with a pause, a resume, a replayed step and two drivers on one cursor — end EXACTLY as 2,000 a step without a break: the same book, the same outcome on every line, and the counts built into the file (3,000 · 125 · 875 · 1,000)",
  M3: "M3 · ⛔ OD33 · the first row wins ACROSS steps: an in-book number repeated two thousand rows later keeps its FIRST row's values (no book name is a repeat's), and a new number repeated in a later step is created ONCE",
  M4: "M4 · a replayed step is 'moved' and changes NOTHING — the service answers moved for an old cursor, and the store refuses the same batch replayed by its cursor's compare-and-set: the book, the rows and the cursor are as they were",
  M5: "M5 · two drivers on ONE cursor at once: exactly one advances, the other is told moved — nothing is counted twice",
  M6: "M6 · ⭐ S15-9 · pause, resume, cancel: a paused run refuses a step (paused) and moves nothing; resume carries on from the cursor; cancel keeps the contacts already written, deletes the unsettled staged rows, and a later step is refused cancelled; before the start, cancel is the discard",
  M7: "M7 · ⛔ the stopped contact and the erased tombstone are NEVER changed, under TAKE_FILE with the file's values differing — every field and the stamp as they were; the player's row too",
  M8: "M8 · ⛔ an import writes NO consent and NO stop: the ledger and the stop list hold exactly the rows they held, and no row it touched carries an account link it set",
  M9: "M9 · ⭐ S15-8 · every settled row is BLANKED — name, email, notes, tags and the raw cell emptied; line, number, outcome and reason kept — and a failed row keeps its ONE sentence (the number's, the sample sheet's, a field's, the read error)",
  M10: "M10 · the list: the created and in-book contacts join the chosen new list ONCE each (27) — never the erased tombstone — and importing the same file again into that list adds no duplicate and moves no member's addedAt",
  M11: "M11 · ⛔ S15-3 · OD54 · the result splits the kept rows by reason ONLY for a viewer who may read numbers (an ADMIN: 3 unchanged · 1 on the stop list · 3 repeated · 0 kept by choice) and gives a GROWTH officer null; the list reads not covered (no basis)",
  M12: "M12 · ⭐ bets come first: while a bet waits for an admission slot a step is refused busy, retryAfterSec 5, and nothing moves; when the queue clears the step runs",
  M13: "M13 · X3 · a contact edited between the decision and the write is decided ONCE MORE from fresh facts and written from its new state; one that moves again is kept as changed_during_import (E9: never failed)",
  M14: "M14 · the start's checks: an unknown choice is bad_choice; a malformed exception key, a 5,001st exception or one on a row that does not change is bad_exceptions; a gone list is list_gone, a held name list_name_taken, a name holding a phone number bad_list; an old check or a moved label check_again — none writes anything — and a valid start freezes the choice, the exceptions and the list",
  M15: "M15 · the freeze is a compare-and-set: of two starts at once exactly one freezes the run, the other is told already_started, and the run is COMMITTING with the winner's decision",
  M16: "M16 · ⛔ D19 · no answer — the start, the steps, the failures pages, the results — nor any audit row carries a contact id, the word player, an erasure, a consent fact, or a run of seven digits",
  M17: "M17 · the failures pages: by FILE row, ascending, at most 50 a page, the true total on every page, nextAfterLine null only at the end — all 1,000 of the 5,000-row file's",
  M18: "M18 · ⭐ C4 · a created number the ledger or the stop list knows has its cache MIRRORED (N1 said yes → GIVEN; N4 is stopped → suppressedAt the stop's own time); one they do not know stays UNKNOWN with no stop",
  M19: "M19 · ⛔ what only the source can show: the cores import nothing that sends or writes consent (no sms, dispatch, opt-out, consent-ledger or ledger-stamp module; from the gate's module only userPhoneKeyFor) and call no ledger or stop writer; the action file is \"use server\" and exports EXACTLY the fifteen actions, each async",
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

/** Every failures page from the top, until nextAfterLine is null. */
async function allFailures(runId: string, deps: ImportCommitDeps): Promise<{ lines: number[]; sentences: Map<number, string>; ok: boolean; pages: unknown[] }> {
  const lines: number[] = [];
  const sentences = new Map<number, string>();
  const pages: unknown[] = [];
  let after = 0;
  let ok = true;
  for (let i = 0; i < 100; i++) {
    const r = await contactImportFailures(OFFICER, { runId, afterLine: after }, deps);
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
      "importFailuresAction", "importListsAction", "importResultAction", "importViewAction", "openImportAction", "pauseImportAction",
      "readXlsxImportAction", "resumeImportAction", "stageImportRowsAction", "startImportAction",
    ];
    const exported = [...actions.matchAll(/^export\s+(async\s+)?function\s+(\w+)/gm)].map((m) => ({ name: m[2], isAsync: Boolean(m[1]) }));
    const otherExports = [...actions.matchAll(/^export\s+(?!async\s+function|type\s|function)/gm)].length;
    ok(L.M19, sends.length === 0 && gateImports.length === 1 && gateImports[0] === "{ userPhoneKeyFor }" && writes === null
      && /^\s*"use server";/.test(actions) && json(exported.map((e) => e.name).sort()) === json(EXPECTED_ACTIONS)
      && exported.every((e) => e.isAsync) && otherExports === 0,
      `sends [${sends}] · gate imports [${gateImports}] · writes ${writes?.[0] ?? "none"} · actions ${exported.length}`);
  }

  // ── the 40-row file under TAKE_FILE, into a NEW list, in ONE step: M1 M7 M8 M9 M10 M11 M16 M18 ──
  let answers: unknown[] = [];
  await inFreshStore(async () => {
    await seedFortyWorld();
    const truth0 = truthCounts();
    const runId = await stageFile(OFFICER, fortyRows());
    const before = { b3: rowJson("mc_w_b3"), b4: rowJson("mc_w_b4"), b5: rowJson("mc_w_b5") };
    const { start } = await checkAndStart(runId, impl.deps, "TAKE_FILE", { kind: "new", name: "October file" });
    const step = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, impl.deps);
    const view = step.ok ? step.view : null;
    const created = bookRows().filter((c) => c.importId === runId);
    log(`40-row commit: ${step.ok ? `${step.kind} · ${json(view?.totals)}` : `refused ${step.reason}`}`);
    ok(L.M1, start.ok && step.ok && step.kind === "done" && view !== null && view.committedThrough === 40 && view.status === "DONE"
      && json(view.totals) === json({ staged: 40, unreadable: 2, pending: 0, create: 22, update: 2, keep: 7, fail: 9 })
      && created.length === 22 && created.every((c) => c.source === "IMPORT" && c.sourceRef === runId && c.userId === null)
      && bookRows().length === 6 + 22,
      `start ${start.ok ? "ok" : start.reason} · ${json(view?.totals ?? null)} · created ${created.length}`);

    ok(L.M7, before.b3 === rowJson("mc_w_b3") && before.b4 === rowJson("mc_w_b4") && before.b5 === rowJson("mc_w_b5")
      && rowJson("mc_w_b3") !== "null",
      `B3 ${before.b3 === rowJson("mc_w_b3")} · B4 ${before.b4 === rowJson("mc_w_b4")} · B5 ${before.b5 === rowJson("mc_w_b5")}`);

    const linked = bookRows().filter((c) => c.userId !== null).map((c) => c.id);
    ok(L.M8, json(truthCounts()) === json(truth0) && json(linked) === json(["mc_w_b5"]), `${json(truth0)} → ${json(truthCounts())} · linked [${linked}]`);

    const rows = await stagedRows(runId);
    const at = (line: number): StoredContactImportRow | undefined => rows.find((r) => r.line === line);
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

    const masked = await contactImportResult(OFFICER, runId, impl.deps);
    const reader = await contactImportResult(ADMIN, runId, impl.deps);
    ok(L.M11, masked.ok && masked.result.kept === null && reader.ok
      && json(reader.result.kept) === json({ inBookUnchanged: 3, onStopList: 1, repeated: 3, chosenKeep: 0 })
      && reader.result.list !== null && reader.result.list.name === "October file" && reader.result.list.covered === false,
      `masked ${masked.ok ? json(masked.result.kept) : masked.reason} · reader ${reader.ok ? json(reader.result.kept) : reader.reason}`);

    const n = (local: string): StoredMarketingContact | undefined => bookRows().find((c) => c.msisdn === keyOf(local));
    ok(L.M18, n(N(1))?.consentState === "GIVEN" && n(N(4))?.suppressedAt === "2026-09-02T08:00:00.000Z" && n(N(4))?.consentState === "UNKNOWN"
      && n(N(2))?.suppressedAt === null && n(N(5))?.consentState === "UNKNOWN" && n(N(5))?.suppressedAt === null,
      `N1 ${n(N(1))?.consentState} · N4 ${n(N(4))?.suppressedAt} · N2 ${n(N(2))?.suppressedAt}`);

    const failures = await allFailures(runId, impl.deps);
    answers = [start, step, masked, reader, failures.pages];

    // ── the same file AGAIN, into the same list: no duplicate, no addedAt moved ──
    const addedBefore = json(onList.map((m) => [m.contactId, m.addedAt]).sort());
    const again = await stageFile(OFFICER, fortyRows());
    const second = await checkAndStart(again, impl.deps, "TAKE_FILE", { kind: "existing", listId: list?.id ?? "cl_none" });
    const secondRun = await drive(again, impl.deps);
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

  // ── M12 · bets come first ──
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
  });

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
    const cancelled = await cancelContactImport(OFFICER, { runId }, deps10);
    const s4 = await commitContactImportStep(OFFICER, { runId, fromCursor: 20 }, deps10);
    const left = await stagedRows(runId);
    const written = bookRows().filter((c) => c.importId === runId).length;
    const other = await stageFile(OFFICER, fortyRows());
    const discarded = await cancelContactImport(OFFICER, { runId: other }, deps10);
    const otherRows = await stagedRows(other);
    ok(L.M6, s1.ok && s1.kind === "advanced" && s1.view.committedThrough === 10
      && paused.ok && paused.view.status === "PAUSED" && paused.view.pausedBy === "you"
      && !s2.ok && s2.reason === "paused" && cursorPaused === 10
      && resumed.ok && resumed.view.status === "COMMITTING" && s3.ok && s3.view.committedThrough === 20
      && cancelled.ok && cancelled.view.status === "CANCELLED" && cancelled.view.totals.pending === 0 && left.length === 20
      && written === cancelled.view.totals.create && written > 0
      && !s4.ok && s4.reason === "cancelled"
      && discarded.ok && discarded.view.status === "CANCELLED" && otherRows.length === 0,
      `s1 ${s1.ok ? s1.view.committedThrough : s1.reason} · pause ${paused.ok ? paused.view.status : paused.reason} · s2 ${s2.ok ? s2.kind : s2.reason} · s3 ${s3.ok ? s3.view.committedThrough : s3.reason} · cancel ${cancelled.ok ? json(cancelled.view.totals) : cancelled.reason} · s4 ${s4.ok ? s4.kind : s4.reason} · discard ${discarded.ok ? discarded.view.status : discarded.reason}`);
  });

  // ── M13 · a conflict, decided once more — and one that moves twice ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    let touches = 0;
    const touch = async (): Promise<void> => {
      touches++;
      await db.marketingContact.update("mc_w_b1", { notes: `touched ${touches}` }, `2026-10-09T08:5${touches}:00.000Z`);
    };
    const runId = await stageFile(OFFICER, fortyRows());
    await checkAndStart(runId, impl.deps, "TAKE_FILE", { kind: "none" });
    let calls = 0;
    const once: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { if (calls++ === 0) await touch(); return impl.deps.commitBatch(b); } };
    const s = await commitContactImportStep(OFFICER, { runId, fromCursor: 0 }, once);
    const b1 = bookRows().find((c) => c.id === "mc_w_b1");
    const line3 = (await stagedRows(runId)).find((r) => r.line === 3);
    const firstCase = s.ok && b1?.displayName === "Asha Mwakalinga" && b1.notes === "touched 1" && line3?.outcome === "update";

    const again = await stageFile(OFFICER, fortyRows().map((r) => ("cells" in r && r.line === 3 ? { line: 3, cells: [B(1), "Asha Twice", "", "", ""] } : r)));
    await checkAndStart(again, impl.deps, "TAKE_FILE", { kind: "none" });
    const always: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { await touch(); return impl.deps.commitBatch(b); } };
    const s2 = await commitContactImportStep(OFFICER, { runId: again, fromCursor: 0 }, always);
    const b1Again = bookRows().find((c) => c.id === "mc_w_b1");
    const line3Again = (await stagedRows(again)).find((r) => r.line === 3);
    ok(L.M13, firstCase && s2.ok && b1Again?.displayName === "Asha Mwakalinga" && line3Again?.outcome === "keep"
      && line3Again.outcomeReason === "changed_during_import",
      `first: ${s.ok ? s.kind : s.reason}, B1 "${b1?.displayName}", line 3 ${line3?.outcome} · twice: ${s2.ok ? s2.kind : s2.reason}, line 3 ${line3Again?.outcome}/${line3Again?.outcomeReason}`);
  });

  // ── M14 · the start's checks — M15 · the freeze ──
  await inFreshStore(async () => {
    await seedFortyWorld();
    await db.contactList.create({ id: "cl_existing", name: "Existing", description: null, createdAt: NOW.toISOString(), createdBy: null, updatedAt: NOW.toISOString(), updatedBy: null });
    const runId = await stageFile(OFFICER, fortyRows());
    const checked = await checkContactImport(OFFICER, runId, impl.deps);
    if (!checked.ok) {
      ok(L.M14, false, `the check refused: ${checked.reason}`);
      return;
    }
    const base = labelOf(checked.preflight.byChoice.TAKE_FILE);
    const fresh = checked.preflight.checkedAt;
    const ask = (o: Record<string, unknown>) => startContactImport(OFFICER, {
      runId, choice: "TAKE_FILE", exceptions: {}, list: { kind: "none" }, expected: base, checkedAt: fresh, ...o,
    }, impl.deps);
    const reasons = [
      await ask({ choice: "OVERWRITE" }),
      await ask({ exceptions: { "06": "KEEP" } }),
      await ask({ exceptions: Object.fromEntries(Array.from({ length: 5001 }, (_, i) => [String(i + 2), "KEEP"])) }),
      await ask({ exceptions: { "19": "KEEP" } }),
      await ask({ list: { kind: "existing", listId: "cl_gone" } }),
      await ask({ list: { kind: "new", name: "EXISTING" } }),
      await ask({ list: { kind: "new", name: "Call 0712 345 678" } }),
      await ask({ checkedAt: new Date(NOW.getTime() - 31 * 60 * 1000).toISOString() }),
      await ask({ expected: { ...base, create: base.create + 1 } }),
    ].map((r) => (r.ok ? "ok" : r.reason));
    const WANT = ["bad_choice", "bad_exceptions", "bad_exceptions", "bad_exceptions", "list_gone", "list_name_taken", "bad_list", "check_again", "check_again"];
    const untouched = (await runOf(runId)).status === "STAGED" && mem().contactLists.size === 1;
    // A valid start with ONE exception: row 3 (B1, which TAKE_FILE would change) kept as it is.
    const previews = [];
    const page = await contactImportChanges(OFFICER, { runId, afterLine: 0 }, impl.deps);
    if (page.ok) previews.push(...page.page.rows.map((r) => r.preview));
    const label = labelOf(adjustTally(checked.preflight.byChoice, previews, "TAKE_FILE", { 3: "KEEP" }));
    const valid = await ask({ exceptions: { "3": "KEEP" }, expected: label, list: { kind: "existing", listId: "cl_existing" } });
    const frozen = await runOf(runId);
    ok(L.M14, json(reasons) === json(WANT) && untouched && valid.ok && frozen.status === "COMMITTING" && frozen.decisionChoice === "TAKE_FILE"
      && json(frozen.decisionOverrides) === json({ 3: "KEEP" }) && frozen.targetListId === "cl_existing" && label.update === 1,
      `${json(reasons)} · untouched ${untouched} · valid ${valid.ok ? "ok" : valid.reason} · label ${json(label)}`);
  });
  await inFreshStore(async () => {
    await seedFortyWorld();
    const runId = await stageFile(OFFICER, fortyRows());
    const checked = await checkContactImport(OFFICER, runId, impl.deps);
    const label = checked.ok ? labelOf(checked.preflight.byChoice.KEEP) : { create: 0, update: 0, keep: 0 };
    const body = { runId, choice: "KEEP", exceptions: {}, list: { kind: "none" }, expected: label, checkedAt: checked.ok ? checked.preflight.checkedAt : "" };
    const [a, b] = await Promise.all([startContactImport(OFFICER, body, impl.deps), startContactImport(ADMIN, body, impl.deps)]);
    const wins = [a, b].filter((r) => r.ok).length;
    const loser = [a, b].find((r) => !r.ok);
    const frozen = await runOf(runId);
    ok(L.M15, wins === 1 && loser !== undefined && !loser.ok && loser.reason === "already_started" && frozen.status === "COMMITTING"
      && frozen.decisionChoice === "KEEP",
      `${[a, b].map((r) => (r.ok ? "ok" : r.reason)).join(" · ")} · ${frozen.status}`);
  });

  // ── the 5,000-row file, twice: M2 M3 M4 M5 M17 ──
  let interrupted = { book: "", outcomes: "", totals: "", ok: false, detail: "" };
  let replayOk = false;
  let replayDetail = "";
  let driversOk = false;
  let driversDetail = "";
  let firstRowOk = false;
  let firstRowDetail = "";
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(OFFICER, fiveThousandRows());
    let lastBatch: ContactImportCommitBatch | null = null;
    const recording: ImportCommitDeps = { ...impl.deps, commitBatch: async (b) => { lastBatch = b; return impl.deps.commitBatch(b); } };
    const { start } = await checkAndStart(runId, recording, "TAKE_FILE", { kind: "none" });
    const step = (from: number, deps: ImportCommitDeps = recording) => commitContactImportStep(OFFICER, { runId, fromCursor: from }, deps);
    const s1 = await step(0);
    const s2 = await step(500);
    const s3 = await step(1000);
    await pauseContactImport(OFFICER, { runId }, recording);
    const refused = await step(1500);
    await resumeContactImport(OFFICER, { runId }, recording);
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
    const rest = await drive(runId, recording);
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

    const failures = await allFailures(runId, recording);
    const totals = failures.pages.every((p) => (p as { ok: boolean; total?: number }).ok && (p as { total: number }).total === 1000);
    ok(L.M17, failures.ok && failures.lines.length === 1000 && ascending(failures.lines) && totals,
      `${failures.lines.length} lines over ${failures.pages.length} page(s) · ascending ${ascending(failures.lines)} · totals ${totals}`);
  });
  let uninterrupted = { book: "", outcomes: "", totals: "" };
  await inFreshStore(async () => {
    await seedFiveThousandBook();
    const runId = await stageFile(OFFICER, fiveThousandRows());
    const deps2000: ImportCommitDeps = { ...impl.deps, stepRows: 2000 };
    await checkAndStart(runId, deps2000, "TAKE_FILE", { kind: "none" });
    const r = await drive(runId, deps2000);
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
  const mem = (globalThis as unknown as { __50PICK_STORE?: { contactImports?: Map<string, { committedThrough: number }> } }).__50PICK_STORE;
  const run = mem?.contactImports?.get(b.importId);
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
    name: "P7 · the facts loader reads no stop — a stopped contact is updated from the file",
    expect: L.M7,
    impl: () => withDeps({ reads: { ...REAL_DEPS.reads, activeStops: async () => [] } }),
  },
  {
    name: "P8 · the cache mirror records a consent for the number first — the import writes the ledger",
    expect: L.M8,
    impl: () => withDeps({
      mirror: async (msisdn, at) => {
        await db.messagingConsent.create({
          id: `led_planted_${msisdn}`, channel: "SMS", identifier: msisdn, category: "MARKETING", status: "GIVEN", source: "IMPORT",
          wording: "planted", locale: "EN", evidence: null, recordedBy: null, createdAt: at,
        });
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
];

export const COMMIT_SECTION: ImportSection<CommitImpl> = { name: "commit", owner: "S15", real, run, plants };
