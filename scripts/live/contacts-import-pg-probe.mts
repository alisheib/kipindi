/**
 * S15 · THE CONTACTS IMPORTER'S SIX NEW DAL MEMBERS ON A REAL POSTGRES — the Prisma twin no suite on this laptop executes.
 *
 * ⭐ WHY THIS EXISTS. `test:contacts-import` drives the check and the commit on the MEMORY twin, and `test:dal-parity` §29
 * holds the Prisma twin to its shape by reading it as TEXT — neither sends one statement to Postgres. Yet each rule that
 * keeps a 200,000-row import exact is a fact about the database, and each check below exists for one of them:
 *   0  the PARENT makes its own database on the scratch cluster and runs `prisma migrate deploy` into it from EMPTY —
 *      every migration, 20261009120000_contact_import_target_list among them: a hand-written file is evidence only once
 *      it has been applied from empty with every other;
 *   C  a FRESH process on that database, the REAL `db` (USE_PRISMA_DAL=true) on a client whose query census it reads:
 *      1  the migration's column, index and foreign key exist as typed, and deleting a list SETS the run's list to NULL
 *         and keeps the run — ⛔ never cascade: a run is the record of what an import wrote — and the key is enforced;
 *      2  snapshotsAmong reads the ten columns decide() needs (the account link since S15-11) and nothing else, the ERASED tombstone INCLUDED (X22 —
 *         without it an erased number would be created again), §25's bound refused and never cut off, duplicates
 *         folded, an empty set answered with no statement;
 *      3  firstLinesAmong (S15-7) answers the smallest line among the run's DECIDABLE rows — a row with a problem or a
 *         read error never claims a number (CONTROL: the same rows without them do), another run never counts — and
 *         Prisma's Json `equals: []` is held against Postgres' own `problems = '[]'::jsonb` (the builder was unsure);
 *      4  freezeDecision moves STAGED → COMMITTING with the decision and the list in ONE write; a second freeze, one of
 *         a run still staging and one of no run answer null and change nothing; of two racing starts, one wins;
 *      5  commitBatch (X3 · S15-6 · S15-8) — a  an advanced step: creates, a guarded update, outcomes, the blanking,
 *         the memberships, the cursor; b  a replay is `moved` and writes nothing, every row byte-identical; c  two steps
 *         on ONE cursor at once — really at once: a third connection holds the run's row lock until both wait on it —
 *         exactly one advances; d  a create whose number reached the book meanwhile and e  a guard that moved are
 *         `conflict`, the WHOLE step rolled back, the statements already executed included; f  the NULL-arm trap: the
 *         tombstone refused while a row whose sourceRef is NULL is updated; g  the last step moves the run to DONE;
 *         h  a membership already held is never doubled and keeps its addedAt; i  a step naming a list deleted since
 *         the start throws, nothing written;
 *      6  failedPage is a keyset on the FILE LINE, 50 a page, with a separate true total; keptSplit counts by reason;
 *   S  a second FRESH process stages 20,000 rows and settles them in 500-row steps — p50/p95 per call printed, every
 *      row settled exactly once asserted.
 * Every expectation is written HERE BY HAND — an oracle independent of either twin.
 *
 * Run (through the heavy-node lock: it applies every migration to an empty database and spawns two processes):
 *   npm run test:contacts-import-db
 * `db-scratch` boots PostgreSQL 18.3 on a loopback port and exports VERIFY_DATABASE_URL; this file refuses any other
 * host, because it drops and creates a database, and each phase refuses any database but the probe's own. ⚠️ The Prisma
 * client must be generated from this schema first (`npx prisma generate`). Kept OUT of `predeploy`, on the
 * `test:house-bot-migrations` precedent. It writes no file. The probe database is dropped again when every check passed
 * (CONTACTS_IMPORT_PROBE_KEEP=1 keeps it) and kept for a post-mortem when one failed; the next run drops it first.
 * ⛔ No backslash anywhere in this file — the tools that write it decode escapes; a line break is String.fromCharCode(10).
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import type { Prisma } from "@prisma/client";
import type {
  ContactImportCommitBatch, ContactImportCommitCreate, ContactImportCommitOutcome, ContactImportCommitResult,
  ContactImportCommitUpdate, ContactImportFailSentence, MarketingContactSnapshot, StoredContactImport,
  StoredContactImportRow, StoredContactList, StoredMarketingContact,
} from "../../src/lib/server/store.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

process.exitCode = 1;
const PHASE = process.env.CONTACTS_IMPORT_PROBE_PHASE ?? "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = "scripts/live/contacts-import-pg-probe.mts";
const DB_NAME = "contacts_import_probe";
const MIGRATIONS = join(ROOT, "prisma", "migrations");
const TARGET_MIGRATION = "20261009120000_contact_import_target_list";
const NL = String.fromCharCode(10);
const OFFICER = "probe_officer_s15";
const T0 = Date.parse("2026-10-09T06:00:00.000Z");
/** An instant `minutes` after T0, spelled as the store writes it. */
const at = (minutes: number): string => new Date(T0 + minutes * 60_000).toISOString();
const STAGED_AT = at(1);
/** The sentences a staged row can carry — never a cell, never a number. */
const S_KENYA = "This is a Kenyan number, so it was not imported.";
const S_EMAIL = "This email address is not complete.";
const R_CUT = "This card is cut off before its end, so it was not read.";
/** The commit's own transaction ceiling (`CONTACT_IMPORT_COMMIT_TX_TIMEOUT_MS`): the scale run's only bound, never a budget. */
const COMMIT_CEILING_MS = 30_000;

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
const json = (v: unknown): string => JSON.stringify(v);
/** JSON with every object's keys sorted — JSONB hands an object back in its own key order (by length, then bytes). */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x !== null && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
  : x));
const eq = (a: unknown, b: unknown): boolean => canon(a) === canon(b);
/** Equal AND present — a fingerprint that failed to read must never compare equal to another that failed. */
const same = (a: unknown, b: unknown): boolean => a !== null && a !== undefined && eq(a, b);
const percentile = (xs: number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Thrown = { threw: boolean; name: string; code: string; message: string };
/** What a call did when it threw: the error's name, its Prisma code if any, and its message. */
async function thrown(fn: () => Promise<unknown>): Promise<Thrown> {
  try {
    await fn();
    return { threw: false, name: "", code: "", message: "" };
  } catch (e) {
    const x = e as { name?: unknown; code?: unknown; message?: unknown } | null;
    return {
      threw: true, name: typeof x?.name === "string" ? x.name : typeof e, code: typeof x?.code === "string" ? x.code : "",
      message: typeof x?.message === "string" ? x.message : String(e),
    };
  }
}
const errText = (e: unknown): string => {
  const x = e as { name?: unknown; code?: unknown; message?: unknown } | null;
  const message = typeof x?.message === "string" ? x.message : String(e);
  return `${typeof x?.name === "string" ? x.name : typeof e}${typeof x?.code === "string" ? ` ${x.code}` : ""}: ${message.split(NL)[0].slice(0, 300)}`;
};

/* ═══ THE WORLD — every number, id, instant and expected answer written HERE, by hand ═════════════════════════════ */

/** A Tanzanian mobile key in a block of its own — 2557 · three block digits · five — so no two checks share a number. */
const num = (block: string, i: number): string => `2557${block}${String(i).padStart(5, "0")}`;
/** n distinct keys nothing here writes to the book (block 500) — §25's bound. */
const many = (n: number): string[] => Array.from({ length: n }, (_, i) => `25575${String(i).padStart(7, "0")}`);
const N = {
  goneA: num("551", 1), goneB: num("551", 2), nolist: num("551", 3),
  snapLive: num("541", 1), snapErased: num("541", 2), snapMarked: num("541", 3), snapOther: num("541", 4), snapAbsent: num("541", 99),
  f1: num("542", 1), f2: num("542", 2), f3: num("542", 3), f4: num("542", 4), f5: num("542", 5), f6: num("542", 6), f7: num("542", 7),
  new1: num("543", 1), upd: num("543", 2), keep: num("543", 3), pre: num("543", 4), badmail: num("543", 8), new2: num("543", 9),
  new5: num("543", 10), erased: num("543", 11),
  r1: num("544", 1), r2: num("544", 2), r3: num("544", 3),
  d1: num("545", 1), d2: num("545", 2), dUpd: num("545", 3),
  e1: num("546", 1), eUpd: num("546", 2),
  fNull: num("547", 2), fMark: num("547", 3),
  i1: num("548", 1),
} as const;
const R = {
  gone: "ci_probe_gone", nolist: "ci_probe_nolist", first: "ci_probe_first", firstCtrl: "ci_probe_first_ctrl",
  firstOther: "ci_probe_first_other", freeze: "ci_probe_freeze", staging: "ci_probe_staging", freezeRace: "ci_probe_freeze_race",
  main: "ci_probe_main", race: "ci_probe_race", d: "ci_probe_conflict_create", e: "ci_probe_conflict_guard", f: "ci_probe_null_arm",
  i: "ci_probe_list_gone", fails: "ci_probe_fails", failsOther: "ci_probe_fails_other", failsNone: "ci_probe_fails_none",
  scale: "ci_probe_scale",
} as const;
const L = {
  gone: "cl_probe_gone", freezeA: "cl_probe_freeze_a", freezeB: "cl_probe_freeze_b", main: "cl_probe_main", race: "cl_probe_race",
  d: "cl_probe_conflict", i: "cl_probe_deleted", scale: "cl_probe_scale",
} as const;

type Db = typeof import("../../src/lib/server/store.ts").db;
type Outcome = NonNullable<StoredContactImportRow["outcome"]>;
type Tally = { pass: number; fail: number };
/** One file row as a check writes it: the line, the server's key, and whatever cells and problems it carries. */
type RowSpec = {
  line: number; msisdn: string | null; rawPhone?: string; name?: string | null; email?: string | null; tags?: string[];
  notes?: string | null; problems?: StoredContactImportRow["problems"]; readError?: string | null;
};

const runOf = (id: string, totalRows: number, unreadable: number): StoredContactImport => ({
  id, status: "STAGING", format: "csv", fileName: null, fileDigest: "e".repeat(64), mapping: { phone: 0, name: 1, email: 2, tags: 3, notes: 4 },
  totalRows, unreadable, stagedThrough: 0, committedThrough: 0, decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null,
  decisionConfirmedBy: null, consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null,
  consentBasisSetBy: null, consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: null, createdAt: at(0),
  createdBy: OFFICER, updatedAt: at(0), targetListId: null,
});
/** A staged row exactly as staging writes it — unsettled. */
const stagedRow = (importId: string, ordinal: number, s: RowSpec, stagedAt: string): StoredContactImportRow => ({
  importId, ordinal, line: s.line, rawPhone: s.rawPhone ?? (s.msisdn === null ? "" : `0${s.msisdn.slice(3)}`), msisdn: s.msisdn,
  displayName: s.name ?? null, email: s.email ?? null, tags: s.tags ?? [], notes: s.notes ?? null, problems: s.problems ?? [],
  readError: s.readError ?? null, outcome: null, outcomeReason: null, stagedAt,
});
/** ⭐ S15-8 · the same row once a step settled it: the outcome and reason written, the cells BLANKED — raw phone, name,
 *  email, notes, tags — and the line, the key, the read error and the problems (a failure's sentence) kept. */
const settledRow = (
  importId: string, ordinal: number, s: RowSpec, outcome: Outcome, reason: string | null, problems?: StoredContactImportRow["problems"],
): StoredContactImportRow => ({
  ...stagedRow(importId, ordinal, s, STAGED_AT), rawPhone: "", displayName: null, email: null, tags: [], notes: null,
  problems: problems ?? s.problems ?? [], outcome, outcomeReason: reason,
});
/** A book row an officer typed in before the import — the guard every update below reads is its `updatedAt`, at(-50). */
const contactOf = (id: string, msisdn: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact => ({
  id, msisdn, rawInput: `0${msisdn.slice(3)}`, displayName: null, email: null, ndc: msisdn.slice(3, 5), operator: null, source: "OPERATOR",
  sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
  createdAt: at(-60), createdBy: null, updatedAt: at(-50), updatedBy: null, ...o,
});
/** A row a step CREATES, as the one create builder (`newContactRow`, X6) would: source IMPORT, the run as sourceRef and importId. */
const bornOf = (id: string, msisdn: string, importId: string, when: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact =>
  contactOf(id, msisdn, { source: "IMPORT", sourceRef: importId, importId, createdAt: when, createdBy: OFFICER, updatedAt: when, updatedBy: OFFICER, ...o });
const listOf = (id: string): StoredContactList => ({
  id, name: `Probe ${id}`, description: null, createdAt: at(-120), createdBy: OFFICER, updatedAt: at(-120), updatedBy: OFFICER,
});
/** import-commit.ts's rule: a write in the guard's own millisecond must still move the stamp. */
const stampAfter = (stamp: string, guard: string): string => new Date(Math.max(Date.parse(stamp), Date.parse(guard) + 1)).toISOString();

/** The runs and rows every check stands on, written through the store's own members (so they are on Postgres too). */
function kit(db: Db) {
  /** A run staged whole (STAGED) — or, with `complete` false, left STAGING — through staging's compare-and-set. */
  const stagedRun = async (id: string, specs: RowSpec[], complete = true): Promise<StoredContactImport> => {
    const made = await db.contactImport.create(runOf(id, specs.length, specs.filter((s) => (s.readError ?? null) !== null).length));
    if (made === null) throw new Error(`the run ${id} could not be created`);
    const staged = await db.contactImport.stageRows({
      importId: id, from: 1, rows: specs.map((s, i) => stagedRow(id, i + 1, s, STAGED_AT)), completes: complete, at: STAGED_AT,
    });
    if (!staged.ok) throw new Error(`staging ${id} was refused: ${staged.reason}`);
    return staged.run;
  };
  /** A staged run frozen by the start's compare-and-set — TAKE_FILE, no exceptions, adding to `listId`. */
  const frozenRun = async (id: string, specs: RowSpec[], listId: string | null): Promise<StoredContactImport> => {
    await stagedRun(id, specs);
    const frozen = await db.contactImport.freezeDecision({ importId: id, choice: "TAKE_FILE", overrides: {}, targetListId: listId, by: OFFICER, at: at(2) });
    if (frozen === null) throw new Error(`the run ${id} could not be frozen`);
    return frozen;
  };
  const mustContact = async (c: StoredMarketingContact): Promise<void> => {
    if ((await db.marketingContact.create(c)) === null) throw new Error(`the book refused ${c.id}`);
  };
  const mustList = async (id: string): Promise<void> => {
    if ((await db.contactList.create(listOf(id))) === null) throw new Error(`the list ${id} could not be created`);
  };
  return { stagedRun, frozenRun, mustContact, mustList };
}

/** ⛔ A PHASE RUNS ONLY ON THE PROBE'S OWN DATABASE, ON A LOOPBACK CLUSTER, ON THE PRISMA TWIN — the parent passes all
 *  three; anything else (a developer's .env, production's URL, the memory twin) is refused before the store loads. */
function phaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "";
  let host = "", name = "";
  try {
    const u = new URL(raw);
    host = u.hostname;
    name = u.pathname.slice(1);
  } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host) || name !== DB_NAME || process.env.USE_PRISMA_DAL !== "true") {
    console.error(`refusing: a probe phase runs only on "${DB_NAME}" on a loopback cluster with USE_PRISMA_DAL=true — the parent passes them.`);
    process.exit(2);
  }
  return raw;
}

/** A phase's summary, and the machine line the parent reads. */
function report(phase: "C" | "S"): void {
  console.log(`${NL}contacts-import-pg-probe · phase ${phase}: ${pass} passed, ${fail} failed`);
  console.log(`TALLY ${json({ pass, fail })}`);
  process.exitCode = fail === 0 ? 0 : 1;
  // A module the store loads may hold the event loop open: the exit is forced after a grace period, never relied on.
  setTimeout(() => process.exit(fail === 0 ? 0 : 1), 10_000).unref();
}

/* ═══ PHASE C — the six members, one by one, on Postgres ═════════════════════════════════════════════════════════ */

async function phaseC(): Promise<void> {
  const raw = phaseUrl();
  const P = await import("../../src/lib/server/prisma.ts");
  const { PrismaClient } = await import("@prisma/client");
  // ⭐ THE DAL'S OWN CLIENT, WITH A QUERY CENSUS. `prisma()` hands back `globalThis.__50PICK_PRISMA` when it is set (the
  // load spikes' precedent), so the client built here — production's pool, `pooledDatabaseUrl()`'s two parameters — is
  // the one every member below sends its statements through, and its query events let a check say "no statement".
  const pooled = new URL(raw);
  if (!pooled.searchParams.has("connection_limit")) pooled.searchParams.set("connection_limit", String(P.connectionLimit()));
  if (!pooled.searchParams.has("pool_timeout")) pooled.searchParams.set("pool_timeout", "10");
  const census: { on: boolean; queries: string[] } = { on: false, queries: [] };
  const client = new PrismaClient({
    datasources: { db: { url: pooled.toString() } },
    log: [{ emit: "event", level: "query" }, { emit: "stdout", level: "error" }, { emit: "stdout", level: "warn" }],
  });
  client.$on("query", (e: Prisma.QueryEvent) => { if (census.on) census.queries.push(e.query); });
  (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = client;
  const { db } = await import("../../src/lib/server/store.ts");
  const K = kit(db);
  const sql = <T>(text: string, ...params: unknown[]): Promise<T[]> => client.$queryRawUnsafe<T[]>(text, ...params);
  const exec = (text: string, ...params: unknown[]): Promise<number> => client.$executeRawUnsafe(text, ...params);
  /** Runs `fn` with the census listening and hands back its answer and every statement the client sent meanwhile. The
   *  query events arrive on the event loop, so the census listens a moment longer after the call returns. */
  const counted = async <T>(fn: () => Promise<T>): Promise<{ value: T; queries: string[] }> => {
    census.queries = [];
    census.on = true;
    try {
      const value = await fn();
      await sleep(150);
      return { value, queries: [...census.queries] };
    } finally {
      census.on = false;
    }
  };
  type Print = { runs: string; staged: string; book: string; lists: string; members: string; n: string };
  /** ⭐ "NOTHING WRITTEN", MEASURED: an md5 of every row of the five tables (row_to_json, in key order) and their counts. */
  const fingerprint = async (): Promise<Print | null> => (await sql<Print>(
    `select coalesce((select md5(string_agg(row_to_json(t)::text, '|' order by t.id)) from "ContactImport" t), '-') as runs,
            coalesce((select md5(string_agg(row_to_json(t)::text, '|' order by t."importId", t.ordinal)) from "ContactImportRow" t), '-') as staged,
            coalesce((select md5(string_agg(row_to_json(t)::text, '|' order by t.id)) from "MarketingContact" t), '-') as book,
            coalesce((select md5(string_agg(row_to_json(t)::text, '|' order by t.id)) from "ContactList" t), '-') as lists,
            coalesce((select md5(string_agg(row_to_json(t)::text, '|' order by t."listId", t."contactId")) from "ContactListMember" t), '-') as members,
            concat_ws('/', (select count(*) from "ContactImport"), (select count(*) from "ContactImportRow"), (select count(*) from "MarketingContact"),
                      (select count(*) from "ContactList"), (select count(*) from "ContactListMember")) as n`))[0] ?? null;
  /** One row, byte for byte, as Postgres renders it. */
  const textOf = async (table: "ContactImport" | "MarketingContact", id: string): Promise<string | null> =>
    (await sql<{ j: string }>(`select row_to_json(t)::text as j from "${table}" t where t.id = $1`, id))[0]?.j ?? null;
  /** A list's members as contact id → "addedAt|addedBy". */
  const memberMap = async (listId: string): Promise<Record<string, string>> =>
    Object.fromEntries((await db.contactListMember.listMembers(listId)).map((m) => [m.contactId, `${m.addedAt}|${m.addedBy ?? "-"}`]));
  /** A section that throws is ONE failure, and the sections after it still run. */
  const section = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try { await fn(); } catch (e) { ok(`${name} · the section ran to its end`, false, errText(e)); }
  };

  try {
    // ── C.0 · the controls every check below stands on ──
    ok("C.0 · CONTROL · the DAL's Prisma client IS this phase's own — the store reads Postgres (USE_PRISMA_DAL=true) through the client whose query census the checks below read",
      P.hasDatabase() && Object.is(P.prisma(), client), `same client: ${Object.is(P.prisma(), client)}`);
    const folders = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const applied = await sql<{ name: string; finished: boolean; rolled: boolean }>(
      `select migration_name as name, finished_at is not null as finished, rolled_back_at is not null as rolled from "_prisma_migrations"`);
    const appliedOk = applied.filter((m) => m.finished && !m.rolled).map((m) => m.name).sort();
    ok(`1.0 · every migration on disk is applied to the probe database — finished, none rolled back, none extra — ${TARGET_MIGRATION} among them (the parent applied them all to an EMPTY database)`,
      folders.includes(TARGET_MIGRATION) && json(appliedOk) === json(folders) && applied.length === folders.length,
      `${appliedOk.length} applied of ${folders.length} on disk`);
    const EMPTY = { runs: 0, staged: 0, book: 0, lists: 0, members: 0 };
    const start = (await sql<typeof EMPTY>(
      `select (select count(*)::int from "ContactImport") as runs, (select count(*)::int from "ContactImportRow") as staged,
              (select count(*)::int from "MarketingContact") as book, (select count(*)::int from "ContactList") as lists,
              (select count(*)::int from "ContactListMember") as members`))[0] ?? null;
    ok("C.1 · CONTROL · the five tables this phase writes start EMPTY — every row below is its own", eq(start, EMPTY), json(start));
    if (!eq(start, EMPTY)) return;

    /* ── 1 · THE MIGRATION — the column, its index, its foreign key; SET NULL, never cascade ── */
    await section("1", async () => {
      const col = await sql<{ type: string; nullable: string; dflt: string | null }>(
        `select data_type::text as type, is_nullable::text as nullable, column_default::text as dflt from information_schema.columns
          where table_schema = current_schema() and table_name = 'ContactImport' and column_name = 'targetListId'`);
      const idx = await sql<{ def: string }>(
        `select indexdef::text as def from pg_indexes
          where schemaname = current_schema() and tablename = 'ContactImport' and indexname = 'ContactImport_targetListId_idx'`);
      const fk = await sql<{ kind: string; del: string; upd: string; target: string; source: string; def: string }>(
        `select c.contype::text as kind, c.confdeltype::text as del, c.confupdtype::text as upd, c.confrelid::regclass::text as target,
                c.conrelid::regclass::text as source, pg_get_constraintdef(c.oid) as def
           from pg_constraint c where c.conname = 'ContactImport_targetListId_fkey'`);
      const c0 = col[0], i0 = idx[0], f0 = fk[0];
      ok("1.1 · the migration's three objects exist as typed — ContactImport.targetListId a NULLABLE text column with no default, its own plain btree index, and ContactImport_targetListId_fkey to ContactList(id) ON DELETE SET NULL (never cascade), ON UPDATE CASCADE",
        col.length === 1 && c0 !== undefined && c0.type === "text" && c0.nullable === "YES" && c0.dflt === null
          && idx.length === 1 && i0 !== undefined && i0.def.includes('USING btree ("targetListId")') && !i0.def.includes("UNIQUE")
          && fk.length === 1 && f0 !== undefined && f0.kind === "f" && f0.del === "n" && f0.upd === "c" && f0.target === '"ContactList"'
          && f0.source === '"ContactImport"' && f0.def.includes('FOREIGN KEY ("targetListId") REFERENCES "ContactList"(id)')
          && f0.def.includes("ON DELETE SET NULL"),
        `${json(col)} · ${i0?.def ?? "NO INDEX"} · ${f0?.def ?? "NO FOREIGN KEY"}`);

      await K.mustList(L.gone);
      const frozen = await K.frozenRun(R.gone, [{ line: 2, msisdn: N.goneA }, { line: 3, msisdn: N.goneB }], L.gone);
      const before = await db.contactImport.find(R.gone);
      const removed = await exec(`delete from "ContactList" where id = $1`, L.gone);
      const after = await db.contactImport.find(R.gone);
      const kept = await db.contactImportRow.after({ importId: R.gone, afterOrdinal: 0, limit: 10 });
      ok("1.2 · ⭐ SET NULL, NEVER CASCADE — deleting (by SQL, so Postgres alone acts) the list a frozen run adds to leaves the run in place, its targetListId NULL and every other column as it was (the decision, the cursors, updatedAt), its two staged rows kept; CONTROL: the column held the list before the delete",
        frozen.targetListId === L.gone && before !== null && before.targetListId === L.gone && removed === 1
          && after !== null && after.targetListId === null && eq({ ...before, targetListId: null }, after) && kept.length === 2,
        `before ${before?.targetListId ?? "null"} · deleted ${removed} · after ${after === null ? "THE RUN IS GONE" : `${after.status}, list ${after.targetListId ?? "null"}`} · ${kept.length} rows`);

      await K.stagedRun(R.nolist, [{ line: 2, msisdn: N.nolist }]);
      const refused = await thrown(() => db.contactImport.freezeDecision({
        importId: R.nolist, choice: "KEEP", overrides: {}, targetListId: "cl_probe_never_made", by: OFFICER, at: at(3),
      }));
      const still = await db.contactImport.find(R.nolist);
      ok("1.3 · the foreign key is ENFORCED — a freeze naming a list that does not exist is refused by Postgres (P2003; the memory twin has no such check) and the run stays STAGED, nothing frozen",
        refused.threw && (refused.code === "P2003" || /foreign key/i.test(refused.message)) && still !== null && still.status === "STAGED"
          && still.decisionChoice === null && still.targetListId === null,
        refused.threw ? `${refused.name} ${refused.code}` : "FROZEN ONTO A LIST THAT DOES NOT EXIST");
    });

    /* ── 2 · snapshotsAmong — the book rows decide() reads, the tombstone included ── */
    await section("2", async () => {
      const live = contactOf("mc_probe_snap_live", N.snapLive, {
        displayName: "Asha Mwakalinga", email: "asha@example.tz", notes: "met at the stand", tags: ["vip", "dar"], rawInput: "0754 100 001",
        operator: "Vodacom", createdBy: "probe_seed", updatedBy: "probe_seed", updatedAt: at(-30),
      });
      const erased = contactOf("mc_probe_snap_erased", N.snapErased, { sourceRef: ERASURE_EVIDENCE, rawInput: "", updatedAt: at(-20) });
      const marked = contactOf("mc_probe_snap_marked", N.snapMarked, { displayName: "Juma", sourceRef: "ci_probe_older", importId: "ci_probe_older", updatedAt: at(-10) });
      const other = contactOf("mc_probe_snap_other", N.snapOther, { displayName: "Never asked" });
      for (const c of [live, erased, marked, other]) await K.mustContact(c);
      const snap = (c: StoredMarketingContact): MarketingContactSnapshot => ({
        id: c.id, msisdn: c.msisdn, displayName: c.displayName, email: c.email, notes: c.notes, tags: c.tags,
        sourceRef: c.sourceRef, importId: c.importId, updatedAt: c.updatedAt, userId: c.userId,
      });
      // S15-11 (the review round): the account link is the TENTH column — decide() keeps a row linked to an account.
      const SNAP_KEYS = json(["id", "msisdn", "displayName", "email", "notes", "tags", "sourceRef", "importId", "updatedAt", "userId"].sort());
      const asked = await counted(() => db.marketingContact.snapshotsAmong([N.snapMarked, N.snapLive, N.snapErased, N.snapAbsent, N.snapLive, N.snapMarked]));
      ok("2.1 · ⭐ snapshotsAmong answers EXACTLY the asked numbers the book holds — three rows for six keys (the absent number left out, the two asked twice answered once), ordered by number, each EXACTLY the ten snapshot columns as written (the account link among them, S15-11 — never the raw input, the consent cache or the provenance) — the ERASED tombstone among them with sourceRef 'erasure' (X22) — in ONE statement",
        eq(asked.value, [snap(live), snap(erased), snap(marked)]) && asked.value.every((s) => json(Object.keys(s).sort()) === SNAP_KEYS)
          && asked.queries.length === 1,
        `${asked.value.map((s) => `${s.id}:${s.sourceRef ?? "null"}`).join(", ")} · ${asked.queries.length} statement(s)`);
      const none = await counted(() => db.marketingContact.snapshotsAmong([]));
      ok("2.2 · an EMPTY set is answered [] with NO statement — the census heard none; CONTROL: the same census heard the call above",
        json(none.value) === "[]" && none.queries.length === 0 && asked.queries.length > 0,
        `${json(none.value)} · ${none.queries.length} statement(s) · the control heard ${asked.queries.length}`);
      const at2000 = await db.marketingContact.snapshotsAmong([...many(1999), N.snapLive]);
      const dup2001 = await db.marketingContact.snapshotsAmong([...many(1999), N.snapLive, N.snapLive]);
      const over = await counted(() => thrown(() => db.marketingContact.snapshotsAmong([...many(2000), N.snapLive])));
      ok("2.3 · ⭐ THE BOUND (§25, BULK_KEYED_READ_MAX) — 2,000 distinct keys are ANSWERED (only the held one comes back); 2,001 entries holding 2,000 distinct are answered too (folded BEFORE the bound); 2,001 distinct are REFUSED — a throw naming the read and the bound, before any statement — never cut off",
        at2000.length === 1 && at2000[0]?.id === live.id && dup2001.length === 1 && over.value.threw
          && over.value.message.includes("marketingContact.snapshotsAmong") && over.value.message.includes("2000") && over.queries.length === 0,
        `2,000 → ${at2000.length} · 2,001 with a duplicate → ${dup2001.length} · 2,001 distinct → ${over.value.threw ? `${over.value.name}: ${over.value.message.slice(0, 100)}` : "ANSWERED"} · ${over.queries.length} statement(s)`);
    });

    /* ── 3 · firstLinesAmong — S15-7, each number's first DECIDABLE line in ONE grouped read ── */
    await section("3", async () => {
      const EMAIL_PROBLEM: StoredContactImportRow["problems"] = [{ field: "email", sentence: S_EMAIL }];
      const NAME_PROBLEM: StoredContactImportRow["problems"] = [{ field: "name", sentence: "This name is longer than the book keeps." }];
      // ⭐ f3's line 6 carries a read error AND the key (a shape the readers never stage, so the filter itself is what is
      // asked); f6 is staged LINE 30 FIRST, then line 25 — the answer is the smallest line, never the first ordinal.
      const FIRST: RowSpec[] = [
        { line: 2, msisdn: N.f1 }, { line: 3, msisdn: N.f2, problems: EMAIL_PROBLEM }, { line: 4, msisdn: N.f1 }, { line: 5, msisdn: N.f2 },
        { line: 6, msisdn: N.f3, readError: R_CUT }, { line: 7, msisdn: N.f3 }, { line: 8, msisdn: N.f4, problems: NAME_PROBLEM },
        { line: 9, msisdn: N.f5, readError: R_CUT }, { line: 30, msisdn: N.f6 }, { line: 25, msisdn: N.f6 },
      ];
      await K.stagedRun(R.first, FIRST);
      await K.stagedRun(R.firstCtrl, FIRST.map((s) => ({ ...s, problems: [], readError: null })));
      await K.stagedRun(R.firstOther, [{ line: 1, msisdn: N.f1 }, { line: 2, msisdn: N.f7 }]);
      const ASK = [N.f1, N.f2, N.f3, N.f4, N.f5, N.f6, N.f7];
      const got = await db.contactImportRow.firstLinesAmong({ importId: R.first, msisdns: ASK });
      ok("3.1 · ⭐ S15-7 · firstLinesAmong answers each number's SMALLEST line among the run's DECIDABLE rows — f1 at 2 (not its later 4), f2 at 5 (its line 3 carries a field problem), f3 at 7 (its line 6 carries a read error), f6 at 25 (the smaller LINE, staged after line 30) — while a number whose every row has a problem or a read error (f4, f5) or that the run does not hold (f7) is ABSENT; ordered by number",
        eq(got, [{ msisdn: N.f1, line: 2 }, { msisdn: N.f2, line: 5 }, { msisdn: N.f3, line: 7 }, { msisdn: N.f6, line: 25 }]), json(got));
      const control = await db.contactImportRow.firstLinesAmong({ importId: R.firstCtrl, msisdns: ASK });
      ok("3.2 · CONTROL · the SAME rows staged with no problem and no read error DO claim their numbers — f2 at 3, f3 at 6, f4 at 8, f5 at 9 — so the filter, and nothing else, left them out above",
        eq(control, [
          { msisdn: N.f1, line: 2 }, { msisdn: N.f2, line: 3 }, { msisdn: N.f3, line: 6 }, { msisdn: N.f4, line: 8 }, { msisdn: N.f5, line: 9 },
          { msisdn: N.f6, line: 25 },
        ]), json(control));
      const scoped = await db.contactImportRow.firstLinesAmong({ importId: R.first, msisdns: [N.f1, N.f7] });
      ok("3.3 · another run's rows are never counted — a run holding f1 at line 1 and f7 at line 2 leaves this run's answer f1 at 2 and f7 absent",
        eq(scoped, [{ msisdn: N.f1, line: 2 }]), json(scoped));
      const bySql = await sql<{ msisdn: string; line: number }>(
        `select msisdn, min(line)::int as line from "ContactImportRow"
          where "importId" = $1 and msisdn is not null and "readError" is null and problems = '[]'::jsonb
          group by msisdn order by msisdn`, R.first);
      const shape = (await sql<{ empty: number; filled: number; other: number }>(
        `select (count(*) filter (where problems = '[]'::jsonb))::int as empty,
                (count(*) filter (where jsonb_typeof(problems) = 'array' and problems <> '[]'::jsonb))::int as filled,
                (count(*) filter (where jsonb_typeof(problems) <> 'array'))::int as other
           from "ContactImportRow" where "importId" = $1`, R.first))[0] ?? null;
      ok("3.4 · ⭐ Prisma's Json `equals: []` REALLY filters the jsonb column — the member's answer equals Postgres' own grouped read with `problems = '[]'::jsonb`, and the run stores problems as real jsonb arrays (8 empty, 2 holding a problem, nothing else)",
        got.length > 0 && eq(got, bySql) && eq(shape, { empty: 8, filled: 2, other: 0 }), `${json(bySql)} · ${json(shape)}`);
      const none = await counted(() => db.contactImportRow.firstLinesAmong({ importId: R.first, msisdns: [] }));
      const over = await counted(() => thrown(() => db.contactImportRow.firstLinesAmong({ importId: R.first, msisdns: many(2001) })));
      ok("3.5 · §25's bound and shape on firstLinesAmong — an empty set answered [] with NO statement; 2,001 distinct keys refused by a throw naming the read, before any statement",
        json(none.value) === "[]" && none.queries.length === 0 && over.value.threw && over.value.message.includes("contactImportRow.firstLinesAmong")
          && over.queries.length === 0,
        `${json(none.value)} · ${none.queries.length} statement(s) · 2,001 → ${over.value.threw ? over.value.name : "ANSWERED"}`);
    });

    /* ── 4 · freezeDecision — the start's ONE compare-and-set ── */
    await section("4", async () => {
      await K.mustList(L.freezeA);
      await K.mustList(L.freezeB);
      await K.stagedRun(R.freeze, [{ line: 2, msisdn: num("550", 1) }, { line: 3, msisdn: num("550", 2) }, { line: 4, msisdn: num("550", 3) }]);
      const first = await counted(() => db.contactImport.freezeDecision({
        importId: R.freeze, choice: "FILL_BLANKS", overrides: { 4: "TAKE_FILE" }, targetListId: L.freezeA, by: OFFICER, at: at(5),
      }));
      const f = first.value;
      const writes = first.queries.filter((q) => /^(UPDATE|INSERT|DELETE)/i.test(q.trim()));
      const stored = (await sql<{ status: string; choice: string | null; overrides: unknown; confirmedAt: boolean; confirmedBy: string | null; list: string | null; stamped: boolean }>(
        `select status::text as status, "decisionChoice"::text as choice, "decisionOverrides" as overrides,
                ("decisionConfirmedAt" = $2::timestamptz) as "confirmedAt", "decisionConfirmedBy" as "confirmedBy",
                "targetListId" as list, ("updatedAt" = $2::timestamptz) as stamped
           from "ContactImport" where id = $1`, R.freeze, at(5)))[0] ?? null;
      ok("4.1 · ⭐ the start's freeze on Postgres: STAGED → COMMITTING with the choice, the overrides (keyed by file row, through JSONB), who confirmed and when, and the target list — in ONE write (the census heard exactly one UPDATE, of ContactImport, and no other write) — and SQL reads the same row back",
        f !== null && f.status === "COMMITTING" && f.decisionChoice === "FILL_BLANKS" && eq(f.decisionOverrides, { 4: "TAKE_FILE" })
          && f.decisionConfirmedAt === at(5) && f.decisionConfirmedBy === OFFICER && f.targetListId === L.freezeA && f.updatedAt === at(5)
          && f.stagedThrough === 3 && f.committedThrough === 0 && writes.length === 1 && (writes[0] ?? "").includes('"ContactImport"')
          && stored !== null && stored.status === "COMMITTING" && stored.choice === "FILL_BLANKS" && eq(stored.overrides, { 4: "TAKE_FILE" })
          && stored.confirmedAt && stored.confirmedBy === OFFICER && stored.list === L.freezeA && stored.stamped,
        `${f?.status ?? "null"} · ${writes.length} write(s) · SQL ${json(stored)}`);

      const textBefore = await textOf("ContactImport", R.freeze);
      const second = await db.contactImport.freezeDecision({ importId: R.freeze, choice: "KEEP", overrides: {}, targetListId: L.freezeB, by: "probe_admin", at: at(6) });
      const textAfter = await textOf("ContactImport", R.freeze);
      ok("4.2 · a SECOND freeze of the now-committing run answers null and changes NOTHING — the run row byte-identical (row_to_json), the first choice and list standing",
        second === null && textBefore !== null && textBefore === textAfter, second === null ? "null" : `FROZE AGAIN: ${second.decisionChoice ?? "?"}`);

      await K.stagedRun(R.staging, [{ line: 2, msisdn: num("550", 11) }, { line: 3, msisdn: num("550", 12) }], false);
      const stagingBefore = await textOf("ContactImport", R.staging);
      const early = await db.contactImport.freezeDecision({ importId: R.staging, choice: "KEEP", overrides: {}, targetListId: null, by: OFFICER, at: at(6) });
      const stagingAfter = await textOf("ContactImport", R.staging);
      const nobody = await db.contactImport.freezeDecision({ importId: "ci_probe_never_opened", choice: "KEEP", overrides: {}, targetListId: null, by: OFFICER, at: at(6) });
      const stagingRun = await db.contactImport.find(R.staging);
      ok("4.3 · a freeze of a run still STAGING answers null and changes nothing (byte-identical, still STAGING); a freeze of a run that does not exist answers null",
        early === null && stagingBefore !== null && stagingBefore === stagingAfter && stagingRun?.status === "STAGING" && nobody === null,
        `${early === null ? "null" : "FROZE"} · ${stagingRun?.status ?? "?"} · ${nobody === null ? "null" : "FROZE A RUN THAT DOES NOT EXIST"}`);

      await K.stagedRun(R.freezeRace, [{ line: 2, msisdn: num("550", 21) }]);
      const raced = await Promise.all([
        db.contactImport.freezeDecision({ importId: R.freezeRace, choice: "KEEP", overrides: {}, targetListId: L.freezeA, by: OFFICER, at: at(7) }),
        db.contactImport.freezeDecision({ importId: R.freezeRace, choice: "TAKE_FILE", overrides: {}, targetListId: L.freezeB, by: "probe_admin", at: at(7) }),
      ]);
      const winners = raced.filter((r): r is StoredContactImport => r !== null);
      const w0 = winners[0];
      const stood = await db.contactImport.find(R.freezeRace);
      ok("4.4 · two starts racing on one STAGED run: exactly ONE freezes it, and the stored decision, list and officer are the winner's — never a mix of the two",
        winners.length === 1 && w0 !== undefined && stood !== null && stood.decisionChoice === w0.decisionChoice && stood.targetListId === w0.targetListId
          && stood.decisionConfirmedBy === w0.decisionConfirmedBy
          && ((stood.decisionChoice === "KEEP" && stood.targetListId === L.freezeA) || (stood.decisionChoice === "TAKE_FILE" && stood.targetListId === L.freezeB)),
        `${winners.length} winner(s) · stored ${stood?.decisionChoice ?? "?"} → ${stood?.targetListId ?? "?"}`);
    });

    /* ── 5 · commitBatch — X3 · S15-6 · S15-8: ONE step, ONE transaction, all or nothing ── */
    // The main run: eleven rows — two new numbers, one in the book to update, one kept, one already on the list, three
    // that fail (a Kenyan number, an unreadable card, a field problem), a repeat, and two more for the last step.
    const upd0 = contactOf("mc_probe_upd", N.upd, { displayName: "Asha", email: "asha.old@example.tz", tags: ["old"] });
    const MAIN: RowSpec[] = [
      { line: 2, msisdn: N.new1, name: "Neema Juma", email: "neema@example.tz", tags: ["vip"], notes: "met at the stand" },
      { line: 3, msisdn: N.upd, name: "Asha Mwakalinga", tags: ["dar"] },
      { line: 4, msisdn: N.keep, name: "Juma Bakari" },
      { line: 5, msisdn: N.pre, name: "Pre" },
      { line: 6, msisdn: null, rawPhone: "+254 712 345 678" },
      { line: 7, msisdn: null, rawPhone: "", readError: R_CUT },
      { line: 8, msisdn: N.badmail, email: "badmail@", problems: [{ field: "email", sentence: S_EMAIL }] },
      { line: 9, msisdn: N.new2, name: "Rehema" },
      { line: 10, msisdn: N.new1, name: "Neema again" },
      { line: 11, msisdn: N.new5, name: "Baraka" },
      { line: 12, msisdn: N.erased, name: "Somebody" },
    ];
    const A_AT = at(10), G_AT = at(20);
    const new1 = bornOf("mc_probe_new1", N.new1, R.main, A_AT, { displayName: "Neema Juma", email: "neema@example.tz", tags: ["vip"], notes: "met at the stand" });
    const new2 = bornOf("mc_probe_new2", N.new2, R.main, A_AT, { displayName: "Rehema" });
    const batchA: ContactImportCommitBatch = {
      importId: R.main, fromCursor: 0, toCursor: 9, at: A_AT, by: OFFICER,
      creates: [{ ordinal: 1, row: new1 }, { ordinal: 8, row: new2 }],
      updates: [{ ordinal: 2, contactId: "mc_probe_upd", guard: at(-50), at: A_AT, by: OFFICER, patch: { displayName: "Asha Mwakalinga", tags: ["dar"] } }],
      outcomes: [
        { ordinal: 1, outcome: "create", reason: null }, { ordinal: 2, outcome: "update", reason: null },
        { ordinal: 3, outcome: "keep", reason: "chosen_keep" }, { ordinal: 4, outcome: "keep", reason: "no_change" },
        { ordinal: 5, outcome: "fail", reason: "invalid" }, { ordinal: 6, outcome: "fail", reason: "invalid" },
        { ordinal: 7, outcome: "fail", reason: "invalid" }, { ordinal: 8, outcome: "create", reason: null },
        { ordinal: 9, outcome: "keep", reason: "same_run" },
      ],
      sentences: [{ ordinal: 5, sentence: S_KENYA }],
      listId: L.main,
      // ⛔ The tombstone and an id the book does not hold are named on purpose: the store adds neither.
      members: ["mc_probe_new1", "mc_probe_upd", "mc_probe_keep", "mc_probe_pre", "mc_probe_new2", "mc_probe_erased", "mc_probe_missing"],
    };
    let committingAfterA = false;

    await section("5 · the world", async () => {
      for (const id of [L.main, L.race, L.d, L.i]) await K.mustList(id);
      for (const c of [
        upd0,
        contactOf("mc_probe_keep", N.keep, { displayName: "Juma" }),
        contactOf("mc_probe_pre", N.pre, { displayName: "Listed before the import" }),
        contactOf("mc_probe_erased", N.erased, { sourceRef: ERASURE_EVIDENCE, rawInput: "" }),
        contactOf("mc_probe_d_upd", N.dUpd, { displayName: "Before" }),
        contactOf("mc_probe_e_upd", N.eUpd, { displayName: "Before" }),
        contactOf("mc_probe_f_null", N.fNull, { displayName: "Before" }),
        contactOf("mc_probe_f_mark", N.fMark, { displayName: "Before", sourceRef: "ci_probe_older", importId: "ci_probe_older" }),
      ]) await K.mustContact(c);
      await db.contactListMember.add({ listId: L.main, contactId: "mc_probe_pre", addedAt: at(-40), addedBy: "probe_seed" });
    });

    // ── 5a · an ADVANCED step · 5b · its replay ──
    await section("5a · 5b", async () => {
      await K.frozenRun(R.main, MAIN, L.main);
      const keepText = await textOf("MarketingContact", "mc_probe_keep");
      const erasedText = await textOf("MarketingContact", "mc_probe_erased");
      const a = await db.contactImport.commitBatch(batchA);
      committingAfterA = a.kind === "advanced" && a.run.status === "COMMITTING" && a.run.finishedAt === null;
      ok("5a · ⭐ a step ADVANCES on Postgres — the cursor 0 → 9 by its compare-and-set, the run COMMITTING with no finishedAt, stamped with the step's instant; the two creates in the book exactly as built, every column; the guarded update applied (name and tags from the file, the address it did not name kept, the stamp and the officer); a kept contact and the tombstone untouched",
        a.kind === "advanced" && a.run.committedThrough === 9 && committingAfterA && a.run.updatedAt === A_AT && eq(await db.contactImport.find(R.main), a.run)
          && eq(await db.marketingContact.findByMsisdn(N.new1), new1) && eq(await db.marketingContact.findByMsisdn(N.new2), new2)
          && eq(await db.marketingContact.find("mc_probe_upd"), { ...upd0, displayName: "Asha Mwakalinga", tags: ["dar"], updatedAt: A_AT, updatedBy: OFFICER })
          && keepText !== null && (await textOf("MarketingContact", "mc_probe_keep")) === keepText
          && erasedText !== null && (await textOf("MarketingContact", "mc_probe_erased")) === erasedText,
        a.kind === "advanced" ? `cursor ${a.run.committedThrough} · ${a.run.status}` : a.kind === "conflict" ? `conflict ${json(a.ordinals)}` : "moved");
      const rows = await db.contactImportRow.after({ importId: R.main, afterOrdinal: 0, limit: 50 });
      const want: StoredContactImportRow[] = [
        settledRow(R.main, 1, MAIN[0], "create", null),
        settledRow(R.main, 2, MAIN[1], "update", null),
        settledRow(R.main, 3, MAIN[2], "keep", "chosen_keep"),
        settledRow(R.main, 4, MAIN[3], "keep", "no_change"),
        settledRow(R.main, 5, MAIN[4], "fail", "invalid", [{ field: "phone", sentence: S_KENYA }]),
        settledRow(R.main, 6, MAIN[5], "fail", "invalid"),
        settledRow(R.main, 7, MAIN[6], "fail", "invalid"),
        settledRow(R.main, 8, MAIN[7], "create", null),
        settledRow(R.main, 9, MAIN[8], "keep", "same_run"),
        stagedRow(R.main, 10, MAIN[9], STAGED_AT),
        stagedRow(R.main, 11, MAIN[10], STAGED_AT),
      ];
      const off = want.filter((w, i) => !eq(rows[i], w)).map((w) => w.ordinal);
      ok("5a.rows · ⭐ S15-8 · the nine settled rows carry X4's outcome and reason and are BLANKED in the same write — raw cell, name, email, notes and tags emptied — while the line, the number, the read error and the problems stay; the unknown number's sentence was written into its problems BEFORE the blanking; rows 10–11, past the cursor, untouched",
        rows.length === 11 && off.length === 0,
        off.length === 0 ? "11 rows as written by hand" : `rows ${off.join(", ")} differ — e.g. ${json(rows[(off[0] ?? 1) - 1]).slice(0, 320)}`);
      const listed = await memberMap(L.main);
      ok("5a.members · the list memberships land in the same write — the two created, the updated, the kept and the already-listed contact, five in all — never the erased tombstone, never an id the book does not hold",
        eq(listed, {
          mc_probe_new1: `${A_AT}|${OFFICER}`, mc_probe_upd: `${A_AT}|${OFFICER}`, mc_probe_keep: `${A_AT}|${OFFICER}`,
          mc_probe_pre: `${at(-40)}|probe_seed`, mc_probe_new2: `${A_AT}|${OFFICER}`,
        }), json(listed));

      const before = await fingerprint();
      const replay = await db.contactImport.commitBatch(batchA);
      const after = await fingerprint();
      ok("5b · ⭐ a REPLAY of the same step with the OLD cursor answers `moved` — the run reported at 9 — and writes NOTHING: every row of the five tables byte-identical before and after (row_to_json digests), every count unchanged",
        replay.kind === "moved" && replay.run !== null && replay.run.committedThrough === 9 && same(before, after),
        `${replay.kind} · ${before?.n ?? "?"} → ${after?.n ?? "?"}`);
    });

    // ── 5c · TWO steps from ONE cursor, really at once ──
    await section("5c", async () => {
      await K.frozenRun(R.race, [{ line: 2, msisdn: N.r1, name: "Rashidi" }, { line: 3, msisdn: N.r2, name: "Rukia" }, { line: 4, msisdn: N.r3, name: "Rose" }], L.race);
      const RACE_AT = at(30);
      const raceStep: ContactImportCommitBatch = {
        importId: R.race, fromCursor: 0, toCursor: 2, at: RACE_AT, by: OFFICER,
        creates: [
          { ordinal: 1, row: bornOf("mc_probe_r1", N.r1, R.race, RACE_AT, { displayName: "Rashidi" }) },
          { ordinal: 2, row: bornOf("mc_probe_r2", N.r2, R.race, RACE_AT, { displayName: "Rukia" }) },
        ],
        updates: [], outcomes: [{ ordinal: 1, outcome: "create", reason: null }, { ordinal: 2, outcome: "create", reason: null }],
        sentences: [], listId: L.race, members: ["mc_probe_r1", "mc_probe_r2"],
      };
      // ⭐ THE RACE IS MADE REAL: a third connection takes the run's row lock FIRST, both steps are sent, and the lock is
      // released only once Postgres shows two backends waiting on it — so both compare-and-sets are in flight at once on
      // two pooled connections, and the loser's is decided by Postgres re-checking its where after the winner commits.
      const holder = new pg.Client({ connectionString: raw });
      await holder.connect();
      let waiting = 0;
      let racing: Promise<ContactImportCommitResult[]> | null = null;
      try {
        await holder.query("begin");
        await holder.query(`select 1 from "ContactImport" where id = $1 for update`, [R.race]);
        const pid = (await holder.query<{ pid: number }>("select pg_backend_pid() as pid")).rows[0]?.pid ?? -1;
        racing = Promise.all([db.contactImport.commitBatch(raceStep), db.contactImport.commitBatch(raceStep)]);
        racing.catch(() => { /* awaited below — this only keeps a rejection during the wait from going unhandled */ });
        for (let i = 0; i < 200 && waiting < 2; i++) {
          await sleep(50);
          waiting = (await sql<{ n: number }>(
            `select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> $1::int`,
            pid))[0]?.n ?? 0;
        }
      } finally {
        await holder.query("commit").catch(() => {});
        await holder.end().catch(() => {});
      }
      const results: ContactImportCommitResult[] = racing === null ? [] : await racing;
      const won = results.filter((r): r is Extract<ContactImportCommitResult, { kind: "advanced" }> => r.kind === "advanced");
      const lost = results.filter((r): r is Extract<ContactImportCommitResult, { kind: "moved" }> => r.kind === "moved");
      const run = await db.contactImport.find(R.race);
      const rows = await db.contactImportRow.after({ importId: R.race, afterOrdinal: 0, limit: 10 });
      const inBook = (await sql<{ n: number }>(`select count(*)::int as n from "MarketingContact" where msisdn in ($1, $2, $3)`, N.r1, N.r2, N.r3))[0]?.n ?? -1;
      const listed = await memberMap(L.race);
      ok("5c.0 · CONTROL · the race was REAL — two backends were blocked on the run's row lock at the same time before it was released",
        waiting >= 2, `${waiting} backend(s) waiting`);
      ok("5c · ⭐ TWO steps from the SAME cursor at once, on two connections: exactly ONE advances and the other answers `moved` with the cursor the winner left (2) — each new number in the book once, rows 1–2 settled once and row 3 untouched, two members, the run COMMITTING at 2",
        results.length === 2 && won.length === 1 && lost.length === 1 && lost[0]?.run?.committedThrough === 2 && run !== null
          && run.committedThrough === 2 && run.status === "COMMITTING" && inBook === 2
          && rows.map((r) => r.outcome ?? "-").join(",") === "create,create,-" && Object.keys(listed).length === 2,
        `${results.map((r) => r.kind).join(" + ")} · cursor ${run?.committedThrough ?? "?"} · ${inBook} in the book · ${rows.map((r) => r.outcome ?? "-").join(",")}`);
    });

    // ── 5d · a create the unique index refuses ──
    await section("5d", async () => {
      await K.frozenRun(R.d, [{ line: 2, msisdn: N.d1, name: "Dee one" }, { line: 3, msisdn: N.d2, name: "Dee two" }, { line: 4, msisdn: N.dUpd, name: "Dee updated" }], L.d);
      const D_AT = at(40);
      const d1 = bornOf("mc_probe_d1", N.d1, R.d, D_AT, { displayName: "Dee one" });
      const d2 = bornOf("mc_probe_d2", N.d2, R.d, D_AT, { displayName: "Dee two" });
      const step = (two: "create" | "keep"): ContactImportCommitBatch => ({
        importId: R.d, fromCursor: 0, toCursor: 3, at: D_AT, by: OFFICER,
        creates: two === "create" ? [{ ordinal: 1, row: d1 }, { ordinal: 2, row: d2 }] : [{ ordinal: 1, row: d1 }],
        updates: [{ ordinal: 3, contactId: "mc_probe_d_upd", guard: at(-50), at: D_AT, by: OFFICER, patch: { displayName: "Dee updated" } }],
        outcomes: [
          { ordinal: 1, outcome: "create", reason: null },
          two === "create" ? { ordinal: 2, outcome: "create", reason: null } : { ordinal: 2, outcome: "keep", reason: "changed_during_import" },
          { ordinal: 3, outcome: "update", reason: null },
        ],
        sentences: [], listId: L.d,
        members: two === "create" ? ["mc_probe_d1", "mc_probe_d2", "mc_probe_d_upd"] : ["mc_probe_d1", "mc_probe_d_upd"],
      });
      // ⭐ BETWEEN THE STEP'S READ AND ITS WRITE, another officer types row 2's number into the book.
      await K.mustContact(contactOf("mc_probe_d2_typed", N.d2, { displayName: "Typed by hand" }));
      const before = await fingerprint();
      const d = await db.contactImport.commitBatch(step("create"));
      const after = await fingerprint();
      const run = await db.contactImport.find(R.d);
      ok("5d · ⭐ a create whose number reached the book between the read and the write answers `conflict` naming ITS ordinal (2) — and the WHOLE step is rolled back: the cursor's compare-and-set and the other create (both already executed) undone, the guarded update, the outcomes and the members never kept — every row byte-identical, the cursor still 0",
        d.kind === "conflict" && json(d.ordinals) === "[2]" && same(before, after) && run !== null && run.committedThrough === 0
          && run.status === "COMMITTING" && (await db.marketingContact.findByMsisdn(N.d1)) === null,
        `${d.kind}${d.kind === "conflict" ? ` ${json(d.ordinals)}` : ""} · cursor ${run?.committedThrough ?? "?"} · ${after?.n ?? "?"}`);
      const retry = await db.contactImport.commitBatch(step("keep"));
      ok("5d' · …and the step decided again (row 2 now kept as changed_during_import, E9) ADVANCES from the SAME cursor — nothing the conflict left behind blocks it: the create, the update and two members land, the run DONE",
        retry.kind === "advanced" && retry.run.committedThrough === 3 && retry.run.status === "DONE"
          && eq(await db.marketingContact.findByMsisdn(N.d1), d1) && (await db.marketingContact.find("mc_probe_d_upd"))?.displayName === "Dee updated"
          && eq(Object.keys(await memberMap(L.d)).sort(), ["mc_probe_d1", "mc_probe_d_upd"]),
        retry.kind);
    });

    // ── 5e · an update whose guard moved ──
    await section("5e", async () => {
      await K.frozenRun(R.e, [{ line: 2, msisdn: N.e1, name: "Eliya" }, { line: 3, msisdn: N.eUpd, name: "From the file" }], null);
      const E_AT = at(50);
      // ⭐ AFTER THE STEP READ THE CONTACT, another officer saves it: its updatedAt moves on from the step's guard.
      const edited = await db.marketingContact.update("mc_probe_e_upd", { notes: "edited by another officer" }, at(45));
      const before = await fingerprint();
      const e = await db.contactImport.commitBatch({
        importId: R.e, fromCursor: 0, toCursor: 2, at: E_AT, by: OFFICER,
        creates: [{ ordinal: 1, row: bornOf("mc_probe_e1", N.e1, R.e, E_AT, { displayName: "Eliya" }) }],
        updates: [{ ordinal: 2, contactId: "mc_probe_e_upd", guard: at(-50), at: E_AT, by: OFFICER, patch: { displayName: "From the file" } }],
        outcomes: [{ ordinal: 1, outcome: "create", reason: null }, { ordinal: 2, outcome: "update", reason: null }],
        sentences: [], listId: null, members: [],
      });
      const after = await fingerprint();
      const held = await db.marketingContact.find("mc_probe_e_upd");
      ok("5e · ⭐ an update whose row's updatedAt MOVED since the step read it answers `conflict` naming its ordinal (2), and the step rolls back WHOLE — the create executed before it undone, the other officer's edit standing, the cursor still 0",
        edited?.updatedAt === at(45) && e.kind === "conflict" && json(e.ordinals) === "[2]" && same(before, after)
          && (await db.marketingContact.findByMsisdn(N.e1)) === null && held?.notes === "edited by another officer" && held.displayName === "Before"
          && (await db.contactImport.find(R.e))?.committedThrough === 0,
        `${e.kind}${e.kind === "conflict" ? ` ${json(e.ordinals)}` : ""} · ${after?.n ?? "?"}`);
    });

    // ── 5f · the NULL-arm trap ──
    await section("5f", async () => {
      await K.frozenRun(R.f, [{ line: 2, msisdn: N.erased, name: "Should never land" }, { line: 3, msisdn: N.fNull, name: "Null arm" }, { line: 4, msisdn: N.fMark, name: "Other mark" }], null);
      const F_AT = at(60);
      const guardOf = async (id: string): Promise<string> => (await db.marketingContact.find(id))?.updatedAt ?? "missing";
      // Every guard is the row's OWN current stamp, so the only thing that can refuse the tombstone's update is its mark.
      const update = async (ordinal: number, contactId: string, displayName: string): Promise<ContactImportCommitUpdate> =>
        ({ ordinal, contactId, guard: await guardOf(contactId), at: F_AT, by: OFFICER, patch: { displayName } });
      const tomb = await db.marketingContact.find("mc_probe_erased");
      const before = await fingerprint();
      const trap = await db.contactImport.commitBatch({
        importId: R.f, fromCursor: 0, toCursor: 3, at: F_AT, by: OFFICER, creates: [],
        updates: [await update(1, "mc_probe_erased", "Should never land"), await update(2, "mc_probe_f_null", "Null arm")],
        outcomes: [{ ordinal: 1, outcome: "update", reason: null }, { ordinal: 2, outcome: "update", reason: null }, { ordinal: 3, outcome: "keep", reason: "chosen_keep" }],
        sentences: [], listId: null, members: [],
      });
      const after = await fingerprint();
      ok("5f · ⛔ THE NULL-ARM TRAP — in one step, the update of the ERASED tombstone (its guard exact) is refused while the update of a row whose sourceRef is NULL passes: the conflict names ordinal 1 ALONE (a where without the NULL arm would name 1 and 2 — `sourceRef <> 'erasure'` is NULL there), and nothing is written",
        tomb?.sourceRef === ERASURE_EVIDENCE && trap.kind === "conflict" && json(trap.ordinals) === "[1]" && same(before, after),
        `${trap.kind}${trap.kind === "conflict" ? ` ${json(trap.ordinals)}` : ""}`);
      const control = await db.contactImport.commitBatch({
        importId: R.f, fromCursor: 0, toCursor: 3, at: F_AT, by: OFFICER, creates: [],
        updates: [await update(2, "mc_probe_f_null", "Null arm"), await update(3, "mc_probe_f_mark", "Other mark")],
        outcomes: [{ ordinal: 1, outcome: "keep", reason: "chosen_keep" }, { ordinal: 2, outcome: "update", reason: null }, { ordinal: 3, outcome: "update", reason: null }],
        sentences: [], listId: null, members: [],
      });
      const nullRow = await db.marketingContact.find("mc_probe_f_null");
      const markRow = await db.marketingContact.find("mc_probe_f_mark");
      ok("5f' · CONTROL · the same step without the tombstone's update ADVANCES — the row whose sourceRef is NULL and the row carrying another import's mark both updated (name, stamp, officer) — and the tombstone untouched",
        control.kind === "advanced" && nullRow?.displayName === "Null arm" && nullRow.updatedAt === F_AT && nullRow.updatedBy === OFFICER
          && markRow?.displayName === "Other mark" && markRow.updatedAt === F_AT && tomb !== null && eq(await db.marketingContact.find("mc_probe_erased"), tomb),
        control.kind);
    });

    // ── 5g · the LAST step · 5h · a membership already held ──
    await section("5g · 5h", async () => {
      const new5 = bornOf("mc_probe_new5", N.new5, R.main, G_AT, { displayName: "Baraka" });
      const g = await db.contactImport.commitBatch({
        importId: R.main, fromCursor: 9, toCursor: 11, at: G_AT, by: OFFICER, creates: [{ ordinal: 10, row: new5 }], updates: [],
        outcomes: [{ ordinal: 10, outcome: "create", reason: null }, { ordinal: 11, outcome: "keep", reason: "chosen_keep" }],
        sentences: [], listId: L.main, members: ["mc_probe_new5", "mc_probe_new1", "mc_probe_erased"],
      });
      const done = await db.contactImport.find(R.main);
      ok("5g · ⭐ the LAST step — its cursor reaching stagedThrough (11) — moves the run to DONE in the same write, finishedAt and updatedAt both the step's instant; CONTROL: the step before left it COMMITTING with no finishedAt",
        g.kind === "advanced" && g.run.status === "DONE" && g.run.committedThrough === 11 && g.run.finishedAt === G_AT && g.run.updatedAt === G_AT
          && eq(done, g.run) && committingAfterA,
        g.kind === "advanced" ? `${g.run.status} at ${g.run.committedThrough} · finished ${g.run.finishedAt ?? "null"} · before it COMMITTING ${committingAfterA}` : g.kind);
      const listed = await memberMap(L.main);
      ok("5h · ⭐ a membership already on the list is NEVER doubled and keeps its FIRST addedAt — the contact listed before the import keeps its own instant and adder, the one the first step added and the last named again keeps the first step's — while the new contact joins at the last step's instant and the tombstone named again stays off",
        eq(listed, {
          mc_probe_new1: `${A_AT}|${OFFICER}`, mc_probe_upd: `${A_AT}|${OFFICER}`, mc_probe_keep: `${A_AT}|${OFFICER}`,
          mc_probe_pre: `${at(-40)}|probe_seed`, mc_probe_new2: `${A_AT}|${OFFICER}`, mc_probe_new5: `${G_AT}|${OFFICER}`,
        }), json(listed));
    });

    // ── 5i · a list deleted under a step ──
    await section("5i", async () => {
      await K.frozenRun(R.i, [{ line: 2, msisdn: N.i1, name: "Imani" }], L.i);
      const I_AT = at(70);
      const step = (listId: string | null): ContactImportCommitBatch => ({
        importId: R.i, fromCursor: 0, toCursor: 1, at: I_AT, by: OFFICER,
        creates: [{ ordinal: 1, row: bornOf("mc_probe_i1", N.i1, R.i, I_AT, { displayName: "Imani" }) }], updates: [],
        outcomes: [{ ordinal: 1, outcome: "create", reason: null }], sentences: [], listId, members: listId === null ? [] : ["mc_probe_i1"],
      });
      const removed = await exec(`delete from "ContactList" where id = $1`, L.i);
      const orphaned = await db.contactImport.find(R.i);
      const before = await fingerprint();
      const refused = await thrown(() => db.contactImport.commitBatch(step(L.i)));
      const after = await fingerprint();
      ok("5i · a step still naming a list deleted since the start (the run itself already reads NULL — SET NULL again) is refused by the membership's foreign key and THROWS, and NOTHING is written — the create already executed rolled back, the cursor still 0, every row byte-identical",
        removed === 1 && orphaned !== null && orphaned.targetListId === null && refused.threw && same(before, after)
          && (await db.marketingContact.findByMsisdn(N.i1)) === null,
        `${refused.threw ? `${refused.name} ${refused.code}` : "IT WROTE"} · ${after?.n ?? "?"}`);
      const retry = await db.contactImport.commitBatch(step(null));
      ok("5i' · …and the same step with the run's own NULL list advances, adding to no list (the run DONE)",
        retry.kind === "advanced" && retry.run.status === "DONE" && (await db.marketingContact.findByMsisdn(N.i1))?.id === "mc_probe_i1", retry.kind);
    });

    /* ── 6 · failedPage and keptSplit — the result screen's two reads ── */
    await section("6", async () => {
      const KN = 130;
      const failed = (k: number): boolean => k % 5 !== 0;
      const keepReason = (j: number): string | null => (j <= 10 ? "chosen_keep" : j <= 15 ? "suppressed" : j <= 18 ? "same_run"
        : j <= 20 ? "no_change" : j === 21 ? "changed_during_import" : j === 22 ? null : "chosen_keep");
      // ⭐ The lines run AGAINST the ordinals (ordinal 1 is line 999), so a page in ordinal order, not line order, cannot pass.
      const specs: RowSpec[] = Array.from({ length: KN }, (_, i) => ({ line: 1000 - (i + 1), msisdn: num("549", i + 1) }));
      await K.frozenRun(R.fails, specs, null);
      const settled = await db.contactImport.commitBatch({
        importId: R.fails, fromCursor: 0, toCursor: KN, at: at(80), by: OFFICER, creates: [], updates: [],
        outcomes: specs.map((_, i): ContactImportCommitOutcome => {
          const k = i + 1;
          return failed(k) ? { ordinal: k, outcome: "fail", reason: "invalid" } : { ordinal: k, outcome: "keep", reason: keepReason(k / 5) };
        }),
        sentences: [], listId: null, members: [],
      });
      await K.frozenRun(R.failsOther, [
        { line: 6, msisdn: num("552", 1) }, { line: 7, msisdn: num("552", 2) }, { line: 8, msisdn: num("552", 3) }, { line: 9, msisdn: num("552", 4) },
      ], null);
      const settledOther = await db.contactImport.commitBatch({
        importId: R.failsOther, fromCursor: 0, toCursor: 4, at: at(81), by: OFFICER, creates: [], updates: [],
        outcomes: [
          { ordinal: 1, outcome: "fail", reason: "invalid" }, { ordinal: 2, outcome: "fail", reason: "invalid" },
          { ordinal: 3, outcome: "fail", reason: "invalid" }, { ordinal: 4, outcome: "keep", reason: "chosen_keep" },
        ],
        sentences: [], listId: null, members: [],
      });
      await K.stagedRun(R.failsNone, [{ line: 2, msisdn: num("552", 9) }]);
      ok("6.0 · CONTROL · the runs were settled by commitBatch itself — 130 rows (104 failed, 26 kept) and 4 rows (3 failed, 1 kept) — and a third left unsettled",
        settled.kind === "advanced" && settled.run.status === "DONE" && settledOther.kind === "advanced", `${settled.kind} · ${settledOther.kind}`);

      const failLines = specs.map((s, i) => ({ line: s.line, k: i + 1 })).filter((x) => failed(x.k)).map((x) => x.line).sort((x, y) => x - y);
      const lines = (p: { rows: StoredContactImportRow[] }): number[] => p.rows.map((r) => r.line);
      const lastLine = (p: { rows: StoredContactImportRow[] }): number => p.rows[p.rows.length - 1]?.line ?? 0;
      const p1 = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: 0, limit: 50 });
      const p2 = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: lastLine(p1), limit: 50 });
      const p3 = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: lastLine(p2), limit: 50 });
      ok("6.1 · ⭐ failedPage walks the run's FAILED rows by FILE LINE — ascending (here the reverse of their ordinals), 50 a page, each page after the last line of the one before: 50 + 50 + 4 = the 104 failures exactly once, every row a fail of THIS run — and every page's total the TRUE 104, counted apart from the page",
        failLines.length === 104 && json(lines(p1)) === json(failLines.slice(0, 50)) && json(lines(p2)) === json(failLines.slice(50, 100))
          && json(lines(p3)) === json(failLines.slice(100))
          && [p1, p2, p3].every((p) => p.total === 104 && p.rows.every((r) => r.outcome === "fail" && r.importId === R.fails)),
        `pages ${p1.rows.length}/${p2.rows.length}/${p3.rows.length} · lines ${lines(p1)[0] ?? "?"}…${lastLine(p3)} · totals ${p1.total}/${p2.total}/${p3.total}`);
      const clamped = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: 0, limit: 500 });
      const zero = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: 0, limit: 0 });
      const past = await db.contactImportRow.failedPage({ importId: R.fails, afterLine: 5000, limit: 50 });
      const other = await db.contactImportRow.failedPage({ importId: R.failsOther, afterLine: 0, limit: 50 });
      const unsettled = await db.contactImportRow.failedPage({ importId: R.failsNone, afterLine: 0, limit: 50 });
      ok("6.2 · the page is CLAMPED to 50 (a limit of 500 answers 50) and a limit of 0 answers none; past the last line the page is empty while the total stays 104; runs never mix — another run's three failures (lines 6, 7, 8) total 3 beside these 104, and an unsettled run answers no row and a total of 0",
        clamped.rows.length === 50 && clamped.total === 104 && zero.rows.length === 0 && zero.total === 104 && past.rows.length === 0
          && past.total === 104 && json(lines(other)) === "[6,7,8]" && other.total === 3 && unsettled.rows.length === 0 && unsettled.total === 0,
        `${clamped.rows.length} · ${zero.rows.length} · ${past.rows.length}/${past.total} · ${json(lines(other))}/${other.total} · ${unsettled.rows.length}/${unsettled.total}`);
      const split = await db.contactImportRow.keptSplit(R.fails);
      const otherSplit = await db.contactImportRow.keptSplit(R.failsOther);
      const noneSplit = await db.contactImportRow.keptSplit(R.failsNone);
      ok("6.3 · ⭐ keptSplit counts the run's KEPT rows by their stored reason, from the rows — the NULL reason (1) first, then changed_during_import (1), chosen_keep (14), no_change (2), same_run (3), suppressed (5): the 26 keeps and none of the 104 failures — another run's one keep counted only there, and an unsettled run answers []",
        eq(split, [
          { reason: null, count: 1 }, { reason: "changed_during_import", count: 1 }, { reason: "chosen_keep", count: 14 },
          { reason: "no_change", count: 2 }, { reason: "same_run", count: 3 }, { reason: "suppressed", count: 5 },
        ]) && eq(otherSplit, [{ reason: "chosen_keep", count: 1 }]) && eq(noneSplit, []),
        `${json(split)} · ${json(otherSplit)} · ${json(noneSplit)}`);
    });
  } catch (e) {
    ok("C · the phase ran to its end", false, errText(e));
  } finally {
    // ⛔ BOUNDED, as db-scratch bounds its stop: a disconnect that never settles must not keep the TALLY from printing.
    await Promise.race([client.$disconnect().catch(() => {}), sleep(5_000)]);
    report("C");
  }
}

/* ═══ PHASE S — 20,000 rows, settled in 500-row steps ════════════════════════════════════════════════════════════ */

async function phaseS(): Promise<void> {
  phaseUrl();
  const { db } = await import("../../src/lib/server/store.ts");
  const { prisma } = await import("../../src/lib/server/prisma.ts");
  // The production-shaped client, exactly as the DAL builds it (`pooledDatabaseUrl()`), with no census in the way.
  const maybe = prisma();
  if (maybe === null) {
    ok("S · the store has a Prisma client", false, "prisma() answered null");
    report("S");
    return;
  }
  const client = maybe;
  const sql = <T>(text: string, ...params: unknown[]): Promise<T[]> => client.$queryRawUnsafe<T[]>(text, ...params);
  const K = kit(db);
  const ROWS = 20_000, STEP = 500, STAGE = 2_000;
  type Bucket = "unreadable" | "kenyan" | "problem" | "inBook" | "repeat" | "create";
  /** ⭐ THE FILE, ROW BY ROW: every 50th card unreadable, the 49th of each fifty not a mobile number, the 48th with a field
   *  problem; every number ending in 3 (of ten) already in the book; the 77th of each hundred repeating the row before. */
  const bucket = (k: number): Bucket => (k % 50 === 0 ? "unreadable" : k % 50 === 49 ? "kenyan" : k % 50 === 48 ? "problem"
    : k % 10 === 3 ? "inBook" : k % 100 === 77 ? "repeat" : "create");
  const numberOf = (k: number): string => `25576${String(k).padStart(7, "0")}`;
  const spec = (k: number): RowSpec => {
    const b = bucket(k);
    if (b === "unreadable") return { line: k + 1, msisdn: null, rawPhone: "", readError: R_CUT };
    if (b === "kenyan") return { line: k + 1, msisdn: null, rawPhone: `+254 7${String(k).padStart(8, "0")}` };
    if (b === "problem") return { line: k + 1, msisdn: numberOf(k), email: "broken@", problems: [{ field: "email", sentence: S_EMAIL }] };
    if (b === "repeat") return { line: k + 1, msisdn: numberOf(k - 1), name: `Scale repeat ${k}` };
    return { line: k + 1, msisdn: numberOf(k), name: `Scale ${k}`, email: k % 7 === 0 ? `s${k}@example.tz` : null, tags: k % 11 === 0 ? ["scale"] : [] };
  };
  try {
    const counts: Record<Bucket, number> = { unreadable: 0, kenyan: 0, problem: 0, inBook: 0, repeat: 0, create: 0 };
    for (let k = 1; k <= ROWS; k++) counts[bucket(k)]++;
    ok("S.0 · CONTROL · the file is what this phase says — 20,000 rows: 400 unreadable, 400 not a mobile number, 400 with a field problem, 2,000 already in the book, 200 repeating the row before, 16,600 new",
      eq(counts, { unreadable: 400, kenyan: 400, problem: 400, inBook: 2000, repeat: 200, create: 16600 }), json(counts));

    // ── S.1 · stage it, put its in-book numbers in the book, freeze it ──
    await K.mustList(L.scale);
    if ((await db.contactImport.create(runOf(R.scale, ROWS, counts.unreadable))) === null) throw new Error("the scale run could not be created");
    const stageMs: number[] = [];
    let staged: StoredContactImport | null = null;
    for (let from = 1; from <= ROWS; from += STAGE) {
      const rows = Array.from({ length: Math.min(STAGE, ROWS - from + 1) }, (_, i) => stagedRow(R.scale, from + i, spec(from + i), at(101)));
      const t0 = performance.now();
      const r = await db.contactImport.stageRows({ importId: R.scale, from, rows, completes: from + rows.length - 1 === ROWS, at: at(101) });
      stageMs.push(Math.round(performance.now() - t0));
      if (!r.ok) throw new Error(`staging the batch from ${from} was refused: ${r.reason}`);
      staged = r.run;
    }
    const seeds: StoredMarketingContact[] = [];
    for (let k = 1; k <= ROWS; k++) if (bucket(k) === "inBook") seeds.push(contactOf(`mc_scale_seed_${k}`, numberOf(k), { updatedAt: at(90) }));
    for (let i = 0; i < seeds.length; i += 50) await Promise.all(seeds.slice(i, i + 50).map((c) => K.mustContact(c)));
    const frozen = await db.contactImport.freezeDecision({ importId: R.scale, choice: "TAKE_FILE", overrides: {}, targetListId: L.scale, by: OFFICER, at: at(102) });
    const landed = (await sql<{ staged: number; seeded: number }>(
      `select (select count(*)::int from "ContactImportRow" where "importId" = $1) as staged,
              (select count(*)::int from "MarketingContact" where starts_with(id, 'mc_scale_seed_')) as seeded`, R.scale))[0] ?? null;
    ok("S.1 · the 20,000 rows were staged through db INTO POSTGRES — ten 2,000-row batches, the run STAGED at 20,000, the rows counted back by SQL — 2,000 of their numbers put in the book first, and the run frozen onto the scale list",
      staged !== null && staged.status === "STAGED" && staged.stagedThrough === ROWS && landed !== null && landed.staged === ROWS
        && landed.seeded === 2000 && frozen !== null && frozen.status === "COMMITTING" && frozen.targetListId === L.scale,
      `${staged?.status ?? "?"} at ${staged?.stagedThrough ?? "?"} · ${json(landed)} · ${frozen?.status ?? "NOT FROZEN"}`);
    if (frozen === null) throw new Error("the scale run could not be frozen");

    // ── S.2 · the steps: each reads its window, its numbers' first lines and their book rows, and writes ONE batch ──
    const callMs: number[] = [], stepMs: number[] = [];
    let cursor = 0, steps = 0, advancedAll = true, cursorExact = true, plannedAll = true;
    let lastRun: StoredContactImport | null = null;
    let lastAt = "";
    const began = performance.now();
    while (cursor < ROWS && steps < 2 * (ROWS / STEP)) {
      steps++;
      const stepAt = at(200 + steps);
      const t0 = performance.now();
      const stepRows = await db.contactImportRow.after({ importId: R.scale, afterOrdinal: cursor, limit: STEP });
      if (stepRows.length === 0) { plannedAll = false; break; }
      // The service's rule: a window shorter than the step reaches the run's end (erasure may have deleted a row).
      const toCursor = stepRows.length < STEP ? ROWS : stepRows[stepRows.length - 1].ordinal;
      const creates: ContactImportCommitCreate[] = [];
      const updates: ContactImportCommitUpdate[] = [];
      const outcomes: ContactImportCommitOutcome[] = [];
      const sentences: ContactImportFailSentence[] = [];
      const members: string[] = [];
      const decidable: Array<{ row: StoredContactImportRow; msisdn: string }> = [];
      for (const row of stepRows) {
        if (row.readError === null && row.msisdn !== null && row.problems.length === 0) { decidable.push({ row, msisdn: row.msisdn }); continue; }
        outcomes.push({ ordinal: row.ordinal, outcome: "fail", reason: "invalid" });
        if (row.readError === null && row.problems.length === 0) sentences.push({ ordinal: row.ordinal, sentence: S_KENYA });
      }
      const numbers = Array.from(new Set(decidable.map((d) => d.msisdn)));
      const first = new Map((await db.contactImportRow.firstLinesAmong({ importId: R.scale, msisdns: numbers })).map((f) => [f.msisdn, f.line] as const));
      const inBook = new Map((await db.marketingContact.snapshotsAmong(numbers)).map((s) => [s.msisdn, s] as const));
      for (const { row, msisdn } of decidable) {
        const firstLine = first.get(msisdn);
        // ⛔ The service refuses a step whose number has no first line at or before its own row; here that is a failure.
        if (firstLine === undefined || firstLine > row.line) { plannedAll = false; continue; }
        if (firstLine < row.line) { outcomes.push({ ordinal: row.ordinal, outcome: "keep", reason: "same_run" }); continue; }
        const held = inBook.get(msisdn);
        if (held !== undefined) {
          updates.push({
            ordinal: row.ordinal, contactId: held.id, guard: held.updatedAt, at: stampAfter(stepAt, held.updatedAt), by: OFFICER,
            patch: { displayName: row.displayName ?? "Scale" },
          });
          outcomes.push({ ordinal: row.ordinal, outcome: "update", reason: null });
          members.push(held.id);
        } else {
          const id = `mc_scale_${row.ordinal}`;
          creates.push({
            ordinal: row.ordinal,
            row: bornOf(id, msisdn, R.scale, stepAt, { displayName: row.displayName, email: row.email, tags: row.tags, notes: row.notes, rawInput: row.rawPhone }),
          });
          outcomes.push({ ordinal: row.ordinal, outcome: "create", reason: null });
          members.push(id);
        }
      }
      const t1 = performance.now();
      const r = await db.contactImport.commitBatch({
        importId: R.scale, fromCursor: cursor, toCursor, at: stepAt, by: OFFICER, creates, updates, outcomes, sentences, listId: L.scale,
        members: Array.from(new Set(members)),
      });
      const t2 = performance.now();
      callMs.push(Math.round(t2 - t1));
      stepMs.push(Math.round(t2 - t0));
      if (r.kind !== "advanced") { advancedAll = false; break; }
      if (r.run.committedThrough !== toCursor) cursorExact = false;
      cursor = r.run.committedThrough;
      lastRun = r.run;
      lastAt = stepAt;
    }
    const allMs = Math.round(performance.now() - began);
    const done = await db.contactImport.find(R.scale);
    ok("S.2 · ⭐ 40 steps of 500, EVERY one advanced, each cursor exactly its window's last ordinal, every decidable row planned from the one-read first lines — and the last step moved the run to DONE at 20,000, stamped with its instant",
      steps === ROWS / STEP && advancedAll && cursorExact && plannedAll && done !== null && done.status === "DONE" && done.committedThrough === ROWS
        && done.finishedAt === lastAt && eq(done, lastRun),
      `${steps} steps · advanced ${advancedAll} · exact ${cursorExact} · planned ${plannedAll} · ${done?.status ?? "?"} at ${done?.committedThrough ?? "?"}`);

    // ── S.3 · every row settled exactly once ──
    const totals = await db.contactImport.totals(R.scale);
    const book = (await sql<{ created: number; updated: number; members: number; unblanked: number; sentenced: number }>(
      `select (select count(*)::int from "MarketingContact" where "importId" = $1) as created,
              (select count(*)::int from "MarketingContact" where starts_with(id, 'mc_scale_seed_') and "updatedBy" = $2) as updated,
              (select count(*)::int from "ContactListMember" where "listId" = $3) as members,
              (select count(*)::int from "ContactImportRow" where "importId" = $1 and (outcome is null or "rawPhone" <> ''
                 or "displayName" is not null or email is not null or notes is not null or cardinality(tags) > 0)) as unblanked,
              (select count(*)::int from "ContactImportRow" where "importId" = $1 and problems = $4::jsonb) as sentenced`,
      R.scale, OFFICER, L.scale, json([{ field: "phone", sentence: S_KENYA }])))[0] ?? null;
    ok("S.3 · ⭐ EVERY ROW SETTLED EXACTLY ONCE — the counted totals add up to the file (16,600 created + 2,000 updated + 200 kept + 1,200 failed = 20,000, none pending, 400 unreadable); the book holds each created number once and every in-book one updated; 18,600 list members; no settled row left unblanked; the 400 unknown numbers' sentence kept",
      eq(totals, { staged: 20000, unreadable: 400, pending: 0, create: 16600, update: 2000, keep: 200, fail: 1200 })
        && eq(book, { created: 16600, updated: 2000, members: 18600, unblanked: 0, sentenced: 400 }),
      `${json(totals)} · ${json(book)}`);

    // ── S.timing · measured, never assumed ──
    const version = (await sql<{ v: string }>("select version() as v"))[0]?.v.split(" on ")[0] ?? "PostgreSQL";
    const slowest = callMs.length === 0 ? 0 : Math.max(...callMs);
    console.log(`TIMING · a 500-row commitBatch on ${version} (n = ${callMs.length}): p50 ${percentile(callMs, 0.5)} ms, p95 ${percentile(callMs, 0.95)} ms, max ${slowest} ms`
      + ` · the whole step with its three reads: p50 ${percentile(stepMs, 0.5)} ms, p95 ${percentile(stepMs, 0.95)} ms`
      + ` · all ${ROWS} rows settled in ${allMs} ms · a 2,000-row stage call: p50 ${percentile(stageMs, 0.5)} ms (n = ${stageMs.length})`);
    ok("S.timing · every 500-row step committed well inside the commit's own 30 s transaction ceiling (the figures printed above are measured, not assumed)",
      callMs.length === ROWS / STEP && slowest < COMMIT_CEILING_MS, `${callMs.length} calls · slowest ${slowest} ms`);
  } catch (e) {
    ok("S · the phase ran to its end", false, errText(e));
  } finally {
    await Promise.race([client.$disconnect().catch(() => {}), sleep(5_000)]);
    report("S");
  }
}

/* ═══ THE PARENT — a database of its own, every migration from EMPTY, then two fresh processes ═══════════════════ */

async function parent(): Promise<void> {
  const RAW = process.env.VERIFY_DATABASE_URL ?? "";
  if (!RAW) {
    console.error("NOT MEASURED — test:contacts-import-db needs a scratch Postgres. Run it the way package.json does, which boots one.");
    process.exit(3);
  }
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("refusing: this probe drops and creates a database, and runs only against a loopback cluster.");
    process.exit(2);
  }
  // The probe's own database on the same cluster — named with the URL API (the staging probe's regex needs a backslash,
  // and this file holds none); the query string goes, as the regex drops it.
  const target = new URL(RAW);
  target.pathname = `/${DB_NAME}`;
  target.search = "";
  const url = target.toString();
  const client = new pg.Client({ connectionString: RAW });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${DB_NAME}"`);
  } finally {
    await client.end().catch(() => {});
  }
  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: "inherit", shell: process.platform === "win32", timeout: 30 * 60_000,
  });
  ok(`0 · prisma migrate deploy applies EVERY migration to an EMPTY database — ${TARGET_MIGRATION} among them`,
    migrate.status === 0, `exit ${migrate.status}`);
  const phases: Tally = { pass: 0, fail: 0 };
  if (migrate.status === 0) {
    const child = (phase: "C" | "S"): { code: number; tally: Tally | null } => {
      const r = spawnSync("npx", ["tsx", SELF], {
        cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", timeout: 30 * 60_000, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, DATABASE_URL: url, USE_PRISMA_DAL: "true", CONTACTS_IMPORT_PROBE_PHASE: phase },
      });
      process.stdout.write(r.stdout ?? "");
      process.stderr.write(r.stderr ?? "");
      const m = /^TALLY (.+)$/m.exec(r.stdout ?? "");
      let tally: Tally | null = null;
      try { tally = m ? (JSON.parse(m[1]) as Tally) : null; } catch { tally = null; }
      return { code: r.status ?? 1, tally };
    };
    const c = child("C");
    ok("C · a FRESH process on the probe database checked the six members on Postgres through the REAL db, and every check passed",
      c.code === 0 && c.tally !== null && c.tally.pass > 0 && c.tally.fail === 0, `exit ${c.code} · ${json(c.tally)}`);
    const s = child("S");
    ok("S · a FRESH process staged 20,000 rows and settled them in 500-row steps on Postgres — every row once — and every check passed",
      s.code === 0 && s.tally !== null && s.tally.pass > 0 && s.tally.fail === 0, `exit ${s.code} · ${json(s.tally)}`);
    for (const t of [c.tally, s.tally]) {
      phases.pass += t?.pass ?? 0;
      phases.fail += t?.fail ?? 0;
    }
  }
  const clean = fail === 0 && phases.fail === 0;
  console.log(`${NL}contacts-import-pg-probe: ${pass + phases.pass} passed, ${fail + phases.fail} failed (the parent's ${pass + fail} checks and the two phases' own)`);
  if (migrate.status === 0) {
    if (clean && process.env.CONTACTS_IMPORT_PROBE_KEEP !== "1") {
      const tidy = new pg.Client({ connectionString: RAW });
      try {
        await tidy.connect();
        await tidy.query(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE)`);
        console.log(`the probe database "${DB_NAME}" was dropped again — nothing of this run is left on the cluster.`);
      } catch (e) {
        console.log(`the probe database "${DB_NAME}" could not be dropped (${errText(e)}) — the next run drops it first.`);
      } finally {
        await tidy.end().catch(() => {});
      }
    } else {
      console.log(`the probe database "${DB_NAME}" is KEPT on the scratch cluster for a post-mortem — the next run drops it first.`);
    }
  }
  process.exitCode = clean ? 0 : 1;
}

if (PHASE === "C") await phaseC();
else if (PHASE === "S") await phaseS();
else await parent();
