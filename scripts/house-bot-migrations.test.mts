/**
 * 🔴 THE TWO HOUSE MIGRATIONS AND THE HOUSE DAL, PROVEN AGAINST A REAL POSTGRES —
 * `scripts/house-bot-migrations.test.mts`.
 *
 * ⛔ WHY THIS NEEDS A DATABASE. Everything the house bots rely on for exactly-once behaviour lives in
 * SQL the Prisma DSL cannot express: partial unique indexes, named CHECKs, a seed that must survive a
 * replay, a lock timeout that must hold for a whole file. None of it exists in the in-memory store,
 * where every other suite runs. A green memory suite says nothing about any of it, so this suite
 * refuses to skip: with no database URL it prints NOT MEASURED and exits 3 (under `npm run`,
 * db-scratch exits 2 first when the binaries are missing).
 *
 * ⛔ THE MIGRATION LAW IT HOLDS (04 S1, A23; the sealed N1 §2 / N2 §2 names):
 *   §A  source shape, no database — the two folders sort after the KYC migration, tables before
 *       markers, with no other migration between them; each file starts with SET LOCAL lock_timeout; nothing CONCURRENT, dropped, renamed or
 *       made NOT NULL; every CREATE and ADD COLUMN re-runnable; the seven new columns on existing
 *       tables carry no DEFAULT and no NOT NULL; every fixed name is in the files; the KYC migration
 *       is byte-for-byte the file production applied (its recorded LF sha256, no git call).
 *   §a  replay (S1 a) — an empty database and a KYC-only one both take the files, then take them
 *       again twice, with no error; the seed rows are right and the sweep watermark does not move;
 *       every column, index and CHECK equals what the DAL names; every value list equals its
 *       constant; every CHECK refuses its bad row and accepts its boundary.
 *   §b  blocked apply (S1 b) — with a Position row locked, the markers file fails with 55P03 inside
 *       3.5 s and a concurrent Position INSERT commits within 1 s of that failure; and (b.6) a bet
 *       that reads and then writes Position while the file runs meets no deadlock (40P01): its
 *       INSERT succeeds, and the apply succeeds or fails fast with 55P03.
 *   §d  DAL behaviour — `scripts/lib/house-bot-dal-cases.mts` runs once on Postgres and once on the
 *       memory twin; every outcome must equal the expected one on both, and the runs must be identical.
 *
 * ⚠️ WHAT IS NOT HERE, AND WHERE IT IS:
 *   · S1 (c), the pre-merge build on the new schema, needs a second checkout with its own install and
 *     runs the money end-to-end suite — too heavy for every `test:all`. It is
 *     `npm run verify:house-bot-migrations-old-build`, run at the commit-1 gate and at release.
 *   · `houseBotSchemaReady()` lands in build commit 4, with its not-ready cases.
 *   · CI's in-memory job has no embedded Postgres, so db-scratch exits 2 and test:all records this
 *     key as FAIL, as it does test:kyc-restart-docs. It is never green there.
 *
 * ⛔ A DISPOSABLE LOOPBACK CLUSTER ONLY. This suite drops and creates databases. It refuses any host
 * that is not 127.0.0.1, localhost or ::1 — stricter than a hosted-name deny list, which a new
 * provider's hostname walks straight past.
 *
 * RUN IT:
 *   npm run test:house-bot-migrations
 * (`db-scratch` boots PostgreSQL 18.3 on 127.0.0.1:5433 and exports VERIFY_DATABASE_URL.)
 * On Ali-Blade15, run it only inside an agreed heavy window: it applies every migration several times.
 */
import { readFileSync, readdirSync, existsSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import pg from "pg";
import {
  EXPECTED, BOT_CAP_BOUNDS, LIMIT_BOUNDS, diffOutcomes, outcomesOf, submitIdFor, type CaseRun,
} from "./lib/house-bot-dal-cases.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = join(ROOT, "prisma/migrations");
const KYC_FOLDER = "20260913120000_kyc_at_withdrawal";
/** The LF sha256 of the KYC migration production applied (PROGRESS P0.3, matched against
 *  `_prisma_migrations.checksum` on 2026-09-13). */
const KYC_LF_SHA256 = "3f03069239a84c0cefdc1da2cd07a1e18136c358936e9d55747964483f38e5f2";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = ""): boolean => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  return cond;
};
const section = (title: string) => console.log(`\n${title}`);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const sorted = (xs: Iterable<string>): string[] => [...xs].sort();
const sameSet = (a: Iterable<string>, b: Iterable<string>): boolean => {
  const x = sorted(new Set(a)), y = sorted(new Set(b));
  return x.length === y.length && x.every((v, i) => v === y[i]);
};
const setDiff = (want: Iterable<string>, got: Iterable<string>): string => {
  const w = new Set(want), g = new Set(got);
  const missing = [...w].filter((v) => !g.has(v));
  const extra = [...g].filter((v) => !w.has(v));
  return [missing.length ? `missing ${missing.join(", ")}` : "", extra.length ? `extra ${extra.join(", ")}` : ""].filter(Boolean).join(" · ");
};
/** Run one section; an exception is a FAIL with its message, never a crash that hides the rest. */
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    ok(`${name} · ran to completion`, false, e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message : String(e));
  }
}

// ⛔ Never against something that believes it is production.
if (process.env.NODE_ENV === "production") {
  console.error("!! test:house-bot-migrations refuses to run with NODE_ENV=production.");
  process.exit(2);
}

// The names and lists under test come from the code that uses them. Imported in MEMORY mode: this
// process only reads constants and never touches a store.
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
const dal = await import("../src/lib/server/house-bot-dal.ts");
const C = await import("../src/lib/house-bot/constants.ts");
const PR = await import("../src/lib/house-bot/pause-reasons.ts");

const HOUSE_TABLES = [
  "HouseBot", "HouseBotControl", "HouseBotRuntime", "HouseBotAlertOnce",
  "HouseBotEvent", "HouseBotIntent", "HouseBotTarget", "HouseBotPress",
] as const;

/** The DAL's column map for each house table — the database must have exactly these columns. */
const COLUMN_MAPS: Record<(typeof HOUSE_TABLES)[number], Record<string, { col: string; kind: string }>> = {
  HouseBot: dal.HOUSE_BOT_COLUMNS,
  HouseBotControl: dal.HOUSE_BOT_CONTROL_COLUMNS,
  HouseBotRuntime: dal.HOUSE_BOT_RUNTIME_COLUMNS,
  HouseBotAlertOnce: dal.HOUSE_BOT_ALERT_ONCE_COLUMNS,
  HouseBotEvent: dal.HOUSE_BOT_EVENT_COLUMNS,
  HouseBotIntent: dal.HOUSE_BOT_INTENT_COLUMNS,
  HouseBotTarget: dal.HOUSE_BOT_TARGET_COLUMNS,
  HouseBotPress: dal.HOUSE_BOT_PRESS_COLUMNS,
};

/**
 * Every plain (non-unique) index, by table. ⚠️ Stated here a second time on purpose: the migration
 * is the thing under test, so it cannot be the source of its own expected names. The sealed names
 * (hbi_*, hbt_*, hbp_*) are verbatim; the rest are Prisma's defaults, which the migration spells out.
 */
const PLAIN_INDEXES: Record<string, readonly string[]> = {
  HouseBot: ["HouseBot_userId_idx", "HouseBot_status_idx"],
  HouseBotControl: [],
  HouseBotRuntime: [],
  HouseBotAlertOnce: ["HouseBotAlertOnce_createdAt_idx"],
  HouseBotEvent: ["HouseBotEvent_houseBotId_createdAt_idx", "HouseBotEvent_userId_kind_createdAt_idx", "HouseBotEvent_kind_createdAt_idx"],
  HouseBotIntent: [
    "HouseBotIntent_status_dueAt_idx", "HouseBotIntent_houseBotId_createdAt_idx", "HouseBotIntent_triggerUserId_createdAt_idx",
    "HouseBotIntent_marketId_status_idx", "HouseBotIntent_status_finishedAt_idx", "hbi_status_stale_idx",
    "HouseBotIntent_finishedAt_unalerted_idx", "hbi_target_status_idx", "hbi_staff_bot_finished_idx", "hbi_staff_finished_idx",
  ],
  HouseBotTarget: ["hbt_market_idx", "hbt_bot_status_idx", "hbt_bot_created_idx"],
  HouseBotPress: ["hbp_bot_created_idx", "hbp_state_created_idx"],
};
const UNIQUE_TABLE: Record<string, string> = {
  HouseBot_userId_live_key: "HouseBot", HouseBot_labelKey_live_key: "HouseBot", hbe_opener_draw_uq: "HouseBotEvent",
  HouseBotIntent_positionId_key: "HouseBotIntent", HouseBotIntent_idempotencyKey_key: "HouseBotIntent",
  hbi_counter_anchor_uq: "HouseBotIntent", hbi_fill_opener_anchor_uq: "HouseBotIntent", hbi_manual_anchor_uq: "HouseBotIntent",
  hbi_manual_live_market_uq: "HouseBotIntent", hbt_active_market_uq: "HouseBotTarget", hbp_actor_submit_uq: "HouseBotPress",
};
/** The five marker indexes on the two hot existing tables (A23 may build them by hand first). */
const MARKER_INDEXES: Record<string, string> = {
  Position_placedAt_id_idx: "Position",
  Position_houseBotId_placedAt_marked_idx: "Position",
  Position_marketId_marked_idx: "Position",
  Position_houseBotId_open_idx: "Position",
  Transaction_createdAt_marked_idx: "Transaction",
};

/** Each value-list CHECK and the constant that must mirror it exactly. */
const TUPLES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["HouseBot_status_check", C.BOT_STATUSES],
  ["HouseBot_pauseReason_check", PR.PAUSE_REASONS],
  ["HouseBot_pausedFromStatus_check", C.PAUSED_FROM_STATUSES],
  ["HouseBot_credentialChangedVia_check", PR.CREDENTIAL_CHANGED_VIA],
  ["HouseBot_consentVoidCause_check", PR.CONSENT_VOID_CAUSES],
  ["HouseBot_removedCause_check", PR.REMOVE_CAUSES],
  ["HouseBotControl_id_check", [C.HOUSE_CONTROL_ID]],
  ["HouseBotControl_offCause_check", C.OFF_CAUSES],
  ["HouseBotEvent_kind_check", C.EVENT_KINDS],
  ["HouseBotIntent_kind_check", C.INTENT_KINDS],
  ["HouseBotIntent_status_check", C.INTENT_STATUSES],
  ["HouseBotIntent_productLine_check", C.INTENT_PRODUCT_LINES],
  ["HouseBotIntent_side_check", C.INTENT_SIDES],
  ["HouseBotIntent_entryCondition_check", C.ENTRY_CONDITIONS],
  ["HouseBotTarget_productLine_check", C.TARGET_PRODUCT_LINES],
  ["HouseBotTarget_status_check", C.TARGET_STATUSES],
  ["HouseBotTarget_timingFrom_check", C.TIMING_FROM],
  ["HouseBotTarget_reactTo_check", C.REACT_TO],
  ["HouseBotTarget_endCause_check", C.TARGET_END_CAUSES],
  ["HouseBotPress_purpose_check", C.PRESS_PURPOSES],
  ["HouseBotPress_state_check", C.PRESS_STATES],
  ["User_passwordSetVia_check", C.PASSWORD_SET_VIA],
];
/**
 * The quoted literals of a `pg_get_constraintdef` value list: `(ARRAY['A'::text, 'B'::text])`, in the
 * order written. ⛔ Never sorted: `pg_get_constraintdef` keeps the IN-list's order, and the tuple
 * comparison below holds the constant to that order, not just to the same values.
 */
const literalsOf = (def: string): string[] => [...def.matchAll(/'([^']*)'::text/g)].map((m) => m[1]);

// ═══ §A · SOURCE SHAPE (no database) ═════════════════════════════════════════════════════════
section("§A · source shape — no database");
/** SQL `--` comments only. ⛔ Not `decomment.mts`: that is a JS scanner, it leaves `--` comments in
 *  place, and the markers header QUOTES the forbidden statements it explains (CONCURRENTLY, DROP
 *  INDEX). No string literal in either file contains `--`, so the line strip is exact here. */
const stripSql = (s: string) => s.replace(/--.*$/gm, "");
const CONCURRENT = /\bCONCURRENTLY\b/i;
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ["CONCURRENTLY", CONCURRENT], ["DROP", /\bDROP\s/i], ["RENAME", /\bRENAME\b/i], ["SET NOT NULL", /\bSET\s+NOT\s+NULL\b/i],
];
/** Every CREATE TABLE / CREATE [UNIQUE] INDEX / ADD COLUMN that does not say IF NOT EXISTS. */
const withoutIfNotExists = (sql: string): string[] => [
  ...sql.matchAll(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)\S+/gi),
  ...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS\b)\S+/gi),
  ...sql.matchAll(/ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS\b)\S+/gi),
].map((m) => m[0]);
const insertsOf = (sql: string): string[] => [...sql.matchAll(/INSERT\s+INTO[^;]*;/gi)].map((m) => m[0]);
const insertIsIdempotent = (stmt: string) => /ON\s+CONFLICT[\s\S]*DO\s+NOTHING/i.test(stmt);
const markerAdds = (sql: string): string[] =>
  [...sql.matchAll(/ALTER\s+TABLE\s+"(?:User|Position|Transaction|PredictionMarket)"\s+ADD\s+COLUMN[^;]*;/gi)].map((m) => m[0]);
const addIsExpandOnly = (stmt: string) => !/\bDEFAULT\b|\bNOT\s+NULL\b/i.test(stmt);
const KYC_IDENT = /"Kyc[A-Za-z]*"/;
/** CRLF → LF at the BYTE level (latin1 round-trips every byte), then sha256. */
const lfSha256 = (buf: Buffer): string =>
  createHash("sha256").update(Buffer.from(buf.toString("latin1").replace(/\r\n/g, "\n"), "latin1")).digest("hex");

let sqlTables = "", sqlMarkers = "", tablesFolder = "", markersFolder = "";
await step("§A", async () => {
  const folders = readdirSync(MIG_DIR).filter((f) => /^\d{14}_/.test(f)).sort();
  const tables = folders.filter((f) => /^\d{14}_house_bot_tables$/.test(f));
  const markers = folders.filter((f) => /^\d{14}_house_bot_markers$/.test(f));
  ok("A.1a · exactly one house_bot_tables migration folder", tables.length === 1, tables.join(", "));
  ok("A.1b · exactly one house_bot_markers migration folder", markers.length === 1, markers.join(", "));
  tablesFolder = tables[0] ?? "";
  markersFolder = markers[0] ?? "";
  ok("A.1c · the KYC migration is on disk", folders.includes(KYC_FOLDER));
  ok("A.1d · both sort after the KYC migration, tables before markers",
    tablesFolder > KYC_FOLDER && markersFolder > KYC_FOLDER && tablesFolder < markersFolder, `${tablesFolder} · ${markersFolder}`);
  // ⛔ Only the gap between the two house folders stays true for ever. "The house folders are the
  // newest" is a release-time fact (REL-0's migrations diff, the commit-8 preflight), never a test key.
  const between = folders.filter((f) => f > tablesFolder && f < markersFolder);
  ok("A.1e · no other migration sorts between the two house migrations", between.length === 0, between.join(", "));
  if (!tablesFolder || !markersFolder) return;

  const rawTables = readFileSync(join(MIG_DIR, tablesFolder, "migration.sql"), "utf8");
  const rawMarkers = readFileSync(join(MIG_DIR, markersFolder, "migration.sql"), "utf8");
  sqlTables = stripSql(rawTables);
  sqlMarkers = stripSql(rawMarkers);

  // ⛔ CONTROLS FIRST: the stripper must drop comments and keep statements, or every check below
  // is either blind or vacuous.
  ok("A.0a · CONTROL · a commented-out CONCURRENTLY is ignored", !CONCURRENT.test(stripSql("-- CREATE INDEX CONCURRENTLY x ON t (c);\nSELECT 1;")));
  ok("A.0b · CONTROL · a real CONCURRENTLY statement is flagged", CONCURRENT.test(stripSql("CREATE INDEX CONCURRENTLY x ON t (c);")));
  ok("A.0c · CONTROL · stripping left the statements and removed the prose",
    /CREATE TABLE IF NOT EXISTS "HouseBot"/.test(sqlTables) && /ALTER TABLE "Position"/.test(sqlMarkers)
      && !/MIGRATION LAW/.test(sqlTables) && !/EXPAND-ONLY/.test(sqlMarkers) && CONCURRENT.test(rawMarkers),
    "the markers header must still quote CONCURRENTLY in its comments, or A.0a proves nothing about this file");
  ok("A.0d · CONTROL · a CREATE INDEX without IF NOT EXISTS is flagged", withoutIfNotExists("CREATE INDEX x ON t (c);").length === 1);
  ok("A.0e · CONTROL · an INSERT without ON CONFLICT is flagged", !insertIsIdempotent(insertsOf("INSERT INTO t VALUES (1);")[0] ?? "ON CONFLICT DO NOTHING"));
  ok("A.0f · CONTROL · a NOT NULL or DEFAULT column on User is flagged",
    !addIsExpandOnly(markerAdds(`ALTER TABLE "User" ADD COLUMN "a" text NOT NULL;`)[0] ?? "")
      && !addIsExpandOnly(markerAdds(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "a" TEXT DEFAULT 'x';`)[0] ?? ""));
  ok("A.0g · CONTROL · a KYC table name is flagged", KYC_IDENT.test(`ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "x" TEXT;`));

  for (const [name, sql] of [["tables", sqlTables], ["markers", sqlMarkers]] as const) {
    ok(`A.2 · ${name}: the first statement is SET LOCAL lock_timeout = '3s';`, sql.trimStart().startsWith("SET LOCAL lock_timeout = '3s';"));
    for (const [word, re] of FORBIDDEN) ok(`A.3 · ${name}: no ${word}`, !re.test(sql), (sql.match(re) ?? [""])[0]);
    const bad = withoutIfNotExists(sql);
    ok(`A.4 · ${name}: every CREATE TABLE, CREATE INDEX and ADD COLUMN says IF NOT EXISTS`, bad.length === 0, bad.join(" | "));
    ok(`A.5 · ${name}: no KYC table is named`, !KYC_IDENT.test(sql), (sql.match(KYC_IDENT) ?? [""])[0]);
  }
  const insT = insertsOf(sqlTables);
  ok("A.4b · tables: both seed INSERTs say ON CONFLICT … DO NOTHING", insT.length === 2 && insT.every(insertIsIdempotent), `${insT.length} insert(s)`);
  ok("A.4c · markers: no INSERT", insertsOf(sqlMarkers).length === 0);

  const adds = markerAdds(sqlMarkers);
  ok("A.6a · markers: exactly seven columns are added to existing tables", adds.length === 7, adds.join(" | "));
  ok("A.6b · …none with a DEFAULT or NOT NULL (expand-only)", adds.every(addIsExpandOnly), adds.filter((s) => !addIsExpandOnly(s)).join(" | "));
  ok("A.6c · tables: no existing table is altered", !/ALTER\s+TABLE/i.test(sqlTables));

  // A.7 · every fixed name is in the files, and the files name nothing the DAL does not know.
  const all = `${sqlTables}\n${sqlMarkers}`;
  const plain = Object.values(PLAIN_INDEXES).flat();
  const named = [...dal.HOUSE_UNIQUE_INDEXES, ...plain, ...Object.keys(MARKER_INDEXES), ...dal.HOUSE_CHECK_NAMES];
  const absent = named.filter((n) => !all.includes(`"${n}"`));
  ok(`A.7a · all ${named.length} index and CHECK names are in the migrations`, absent.length === 0, absent.join(", "));
  const sqlChecks = [...all.matchAll(/CONSTRAINT\s+"(\w+)"\s+CHECK/gi)].map((m) => m[1]);
  ok("A.7b · the migrations' CHECK names equal HOUSE_CHECK_NAMES", sameSet(sqlChecks, dal.HOUSE_CHECK_NAMES), setDiff(dal.HOUSE_CHECK_NAMES, sqlChecks));
  const sqlIndexes = [...all.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+"(\w+)"/gi)];
  ok("A.7c · the migrations' unique indexes equal HOUSE_UNIQUE_INDEXES",
    sameSet(sqlIndexes.filter((m) => m[1]).map((m) => m[2]), dal.HOUSE_UNIQUE_INDEXES), setDiff(dal.HOUSE_UNIQUE_INDEXES, sqlIndexes.filter((m) => m[1]).map((m) => m[2])));
  ok("A.7d · the migrations' plain indexes equal the expected list",
    sameSet(sqlIndexes.filter((m) => !m[1]).map((m) => m[2]), [...plain, ...Object.keys(MARKER_INDEXES)]),
    setDiff([...plain, ...Object.keys(MARKER_INDEXES)], sqlIndexes.filter((m) => !m[1]).map((m) => m[2])));

  // A.8 · the KYC migration is the file production applied — its recorded LF hash, no git call, so
  // a shallow or CI checkout without origin/main measures it the same way.
  const kycPath = join(MIG_DIR, KYC_FOLDER, "migration.sql");
  const kyc = existsSync(kycPath) ? readFileSync(kycPath) : Buffer.alloc(0);
  ok("A.8 · the KYC migration is byte-unchanged (LF sha256 matches P0.3)", lfSha256(kyc) === KYC_LF_SHA256, lfSha256(kyc));
  ok("A.8c · CONTROL · one changed byte changes the hash",
    kyc.length > 0 && lfSha256(Buffer.concat([kyc, Buffer.from(" ")])) !== KYC_LF_SHA256);
  ok("A.8d · CONTROL · CRLF and LF copies hash alike", lfSha256(Buffer.from("a\r\nb\n")) === lfSha256(Buffer.from("a\nb\n")));
});

// ═══ DATABASE GUARDS ═════════════════════════════════════════════════════════════════════════
const RAW = process.env.VERIFY_DATABASE_URL ?? process.env.HOUSE_BOT_MIGRATIONS_DATABASE_URL ?? "";
const mask = (u: string) => u.replace(/:[^:@/]*@/, ":***@");
if (!RAW) {
  console.error(
    "\n!! NOT MEASURED — test:house-bot-migrations needs a local Postgres. It refuses to skip, because a\n" +
    "   skipped guard prints green. Run it the way package.json does, which boots one:\n\n" +
    "   npm run test:house-bot-migrations\n",
  );
  console.log(`\nhouse-bot-migrations: ${pass} passed, ${fail} failed — §a, §b and §d NOT MEASURED`);
  process.exit(3);
}
{
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* reported below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error(`!! refusing: this suite drops and creates databases and runs only against a loopback cluster (${mask(RAW)}).`);
    process.exit(2);
  }
}
const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const dbUrl = (name: string) => `${BASE}/${name}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end().catch(() => {});
  }
}
/** Drop and create a scratch database, optionally as a copy of another (no one may be connected to it). */
async function recreate(name: string, template?: string): Promise<void> {
  await withClient(RAW, async (c) => {
    await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await c.query(`CREATE DATABASE "${name}"${template ? ` TEMPLATE "${template}"` : ""}`);
  });
}
/** A child process with the given environment on top of ours; returns its exit code. */
function run(cmd: string, args: string[], env: Record<string, string>, cwd = ROOT): number {
  const r = spawnSync(cmd, args, {
    cwd, env: { ...process.env, ...env }, stdio: "inherit", shell: process.platform === "win32", timeout: 30 * 60_000,
  });
  return r.status ?? 1;
}
/**
 * Apply a migration file the way `prisma migrate deploy` sends one: the whole file as ONE simple
 * query, which Postgres runs as one implicit transaction. Returns the error message, or null.
 */
async function applyRaw(url: string, sql: string): Promise<string | null> {
  try {
    await withClient(url, (c) => c.query(sql));
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
async function readSweep(url: string): Promise<{ iso: string | null; ageMs: number }> {
  return withClient(url, async (c) => {
    const row = (await c.query(`SELECT "sweepPlacedAt" AS "at", (extract(epoch FROM (now() - "sweepPlacedAt")) * 1000)::float8 AS "age"
      FROM "HouseBotRuntime" WHERE "key" = 'global'`)).rows[0];
    return { iso: row?.at ? new Date(row.at).toISOString() : null, ageMs: row ? Number(row.age) : NaN };
  });
}
/** Does an information_schema column row have the type a DAL column kind promises? */
function typeMatches(r: Any, kind: string): boolean {
  switch (kind) {
    case "text": return r.data_type === "text";
    case "int": return r.data_type === "integer";
    case "bigint": return r.data_type === "bigint";
    case "bool": return r.data_type === "boolean";
    case "ts": return r.data_type === "timestamp with time zone" && Number(r.datetime_precision) === 3;
    case "json": return r.data_type === "jsonb";
    case "textArray": return r.data_type === "ARRAY" && r.udt_name === "_text";
    default: return false;
  }
}

section("§a0 · controls for the readers below");
ok("a0.1 · CONTROL · literalsOf reads a pg value list, in order",
  JSON.stringify(literalsOf("CHECK ((kind = ANY (ARRAY['A'::text, 'B'::text])))")) === '["A","B"]');
ok("a0.2 · CONTROL · a value list missing one entry does not equal its constant",
  !sameSet(literalsOf("CHECK ((kind = ANY (ARRAY['A'::text])))"), ["A", "B"]));
ok("a0.2b · CONTROL · the same values in another order do not equal the constant",
  JSON.stringify(literalsOf("CHECK ((kind = ANY (ARRAY['B'::text, 'A'::text])))")) !== JSON.stringify(["A", "B"]));
ok("a0.3 · CONTROL · a timestamp without time zone is not a DAL time column",
  !typeMatches({ data_type: "timestamp without time zone", datetime_precision: 3 }, "ts")
    && !typeMatches({ data_type: "timestamp with time zone", datetime_precision: 6 }, "ts"));

let fileTables = "", fileMarkers = "";
if (tablesFolder && markersFolder) {
  fileTables = readFileSync(join(MIG_DIR, tablesFolder, "migration.sql"), "utf8");
  fileMarkers = readFileSync(join(MIG_DIR, markersFolder, "migration.sql"), "utf8");
}

/**
 * What a migrated database must hold, compared with what the code names: the 8 tables, the seeds,
 * every column against the DAL's column maps, the seven marker columns, every index, every CHECK,
 * and every value list against its constant.
 */
async function checkSchema(url: string, label: string): Promise<void> {
  await withClient(url, async (c) => {
    const tables = (await c.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`, [HOUSE_TABLES])).rows.map((r: Any) => r.table_name as string);
    ok(`${label}.tables · all 8 house tables exist`, sameSet(tables, HOUSE_TABLES), setDiff(HOUSE_TABLES, tables));

    const ctl = (await c.query(`SELECT * FROM "HouseBotControl"`)).rows;
    const row: Any = ctl[0] ?? {};
    ok(`${label}.seed · exactly one control row, id global`, ctl.length === 1 && row.id === C.HOUSE_CONTROL_ID, `${ctl.length} row(s)`);
    ok(`${label}.seed · the master switch is seeded OFF, with no off cause`, row.enabled === false && row.offCause === null);
    const NOT_NULL_LIMITS: Record<string, number> = { maxDesignatedBots: 5, bellAlertsPerHour: 20 };
    const setCaps = dal.LIMIT_FIELDS.filter((f) => !(f in NOT_NULL_LIMITS) && row[f] !== null);
    ok(`${label}.seed · every global cap is NULL (not set)`, setCaps.length === 0, setCaps.join(", "));
    ok(`${label}.seed · 5 designated bots, 20 bell alerts and 6 holder notices an hour`,
      Object.entries(NOT_NULL_LIMITS).every(([f, v]) => row[f] === v),
      JSON.stringify(Object.fromEntries(Object.keys(NOT_NULL_LIMITS).map((f) => [f, row[f]]))));
    ok(`${label}.seed · limitsVersion and limitsSchemaVersion are 1`, row.limitsVersion === 1 && row.limitsSchemaVersion === 1);
    // ⛔ D20 (rulings 265, 273 (a)): the staff-edge and Board-disclosure columns are un-built, so the control row has
    // neither — and a migration that re-adds one is reported here, by name, on a real cluster.
    // ⛔ THE ABSENCE IS ANCHORED ON A PRESENCE (C5-5b review, test-strength-06): `row` falls back to `{}` when the seed
    // read returns nothing, and an absence measured on an empty row is no measurement at all. Three columns that MUST be
    // there are asserted in the same breath, so a projected or missing row fails this case instead of passing it.
    const MUST_BE_ON_ROW = ["offCause", "gCapDailyStakeTzs", "limitsVersion"];
    ok(`${label}.seed · the control row has no staff-edge and no Board-disclosure column (D20 un-built both), on a row that really carries its own three`,
      ["gStaffEdgeWinRatePts", "gStaffEdgeNetTzs", "boardDisclosureSentAt", "boardDisclosureSections"].every((c) => !(c in row)) && MUST_BE_ON_ROW.every((c) => c in row),
      JSON.stringify({ struck: Object.keys(row).filter((c) => /staffEdge|boardDisclosure/i.test(c)), missing: MUST_BE_ON_ROW.filter((c) => !(c in row)) }));
    const rt = (await c.query(`SELECT "key", "scopeFrom", "errorStreak" FROM "HouseBotRuntime"`)).rows;
    ok(`${label}.seed · one runtime row, global, out of scope (scopeFrom NULL) with no errors`,
      rt.length === 1 && rt[0].key === "global" && rt[0].scopeFrom === null && rt[0].errorStreak === 0, JSON.stringify(rt));

    const cols = (await c.query(`SELECT table_name, column_name, data_type, udt_name, datetime_precision, is_nullable, column_default
      FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
    [[...HOUSE_TABLES, "User", "Position", "Transaction", "PredictionMarket"]])).rows;
    for (const t of HOUSE_TABLES) {
      const dbCols = cols.filter((r: Any) => r.table_name === t);
      const specs = Object.values(COLUMN_MAPS[t]);
      ok(`${label}.cols · ${t}: the DAL column map names exactly the table's columns`,
        sameSet(dbCols.map((r: Any) => r.column_name), specs.map((s) => s.col)), setDiff(specs.map((s) => s.col), dbCols.map((r: Any) => r.column_name)));
      const wrong = specs.flatMap((s) => {
        const r = dbCols.find((x: Any) => x.column_name === s.col);
        return r && typeMatches(r, s.kind) ? [] : [`${s.col}: map ${s.kind}, database ${r ? `${r.data_type}(${r.datetime_precision ?? ""})` : "missing"}`];
      });
      ok(`${label}.types · ${t}: every column has its map kind's type (times timestamptz(3), TZS caps bigint)`, wrong.length === 0, wrong.join(" · "));
    }
    const MARKER_COLUMNS: ReadonlyArray<readonly [string, string, string]> = [
      ["User", "passwordSetAt", "ts"], ["User", "passwordSetVia", "text"], ["User", "emailSetByOfficerAt", "ts"],
      ["Position", "houseBotId", "text"], ["Transaction", "houseBotId", "text"],
      ["PredictionMarket", "reopenedAt", "ts"], ["PredictionMarket", "reopenCount", "int"],
    ];
    for (const [t, n, kind] of MARKER_COLUMNS) {
      const r = cols.find((x: Any) => x.table_name === t && x.column_name === n);
      ok(`${label}.markers · ${t}.${n} is ${kind}, nullable, with no default`,
        !!r && typeMatches(r, kind) && r.is_nullable === "YES" && r.column_default === null,
        r ? `${r.data_type} nullable=${r.is_nullable} default=${r.column_default}` : "missing");
    }

    const idx = (await c.query(`SELECT t.relname AS "table", i.relname AS "index", x.indisvalid AS "valid", x.indisunique AS "unique"
      FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid JOIN pg_class t ON t.oid = x.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = current_schema() AND t.relname = ANY($1::text[])`, [[...HOUSE_TABLES, "Position", "Transaction"]])).rows;
    const houseIdx = idx.filter((r: Any) => (HOUSE_TABLES as readonly string[]).includes(r.table));
    const wantHouse = [...HOUSE_TABLES.map((t) => `${t}_pkey`), ...dal.HOUSE_UNIQUE_INDEXES, ...Object.values(PLAIN_INDEXES).flat()];
    ok(`${label}.indexes · the indexes on the house tables are exactly the expected names`,
      sameSet(houseIdx.map((r: Any) => r.index), wantHouse), setDiff(wantHouse, houseIdx.map((r: Any) => r.index)));
    const wrongUnique = Object.entries(UNIQUE_TABLE).filter(([n, t]) => !houseIdx.some((r: Any) => r.index === n && r.table === t && r.unique === true))
      .map(([n]) => n);
    ok(`${label}.indexes · each named unique index is UNIQUE and on its own table`, wrongUnique.length === 0, wrongUnique.join(", "));
    const plainUnique = Object.entries(PLAIN_INDEXES).flatMap(([t, names]) => names.filter((n) => houseIdx.some((r: Any) => r.index === n && (r.unique || r.table !== t))));
    ok(`${label}.indexes · no plain index is unique or on the wrong table`, plainUnique.length === 0, plainUnique.join(", "));
    for (const [n, t] of Object.entries(MARKER_INDEXES)) {
      const r = idx.find((x: Any) => x.index === n && x.table === t);
      ok(`${label}.markers · ${n} exists on ${t} and is valid`, !!r && r.valid === true, r ? `indisvalid=${r.valid}` : "missing");
    }

    const checks = (await c.query(`SELECT t.relname AS "table", k.conname AS "name", pg_get_constraintdef(k.oid) AS "def"
      FROM pg_constraint k JOIN pg_class t ON t.oid = k.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = current_schema() AND k.contype = 'c'
        AND (t.relname = ANY($1::text[]) OR (t.relname = 'User' AND k.conname = 'User_passwordSetVia_check'))`, [HOUSE_TABLES])).rows;
    ok(`${label}.checks · the CHECKs on the house tables, plus the User one, equal HOUSE_CHECK_NAMES`,
      sameSet(checks.map((r: Any) => r.name), dal.HOUSE_CHECK_NAMES), setDiff(dal.HOUSE_CHECK_NAMES, checks.map((r: Any) => r.name)));
    for (const [name, list] of TUPLES) {
      const def: string = checks.find((r: Any) => r.name === name)?.def ?? "";
      ok(`${label}.tuple · ${name} lists exactly its constant, in order`,
        def !== "" && JSON.stringify(literalsOf(def)) === JSON.stringify([...list]),
        def ? (setDiff(list, literalsOf(def)) || `order differs: ${literalsOf(def).join(",")}`) : "constraint missing");
    }
  });
}

/** A SQL expression written as-is into a probe row (`now()`), as opposed to a quoted value. */
class RawSql { constructor(readonly sql: string) {} }
const NOW = new RawSql("now()");
const lit = (v: unknown): string => {
  if (v instanceof RawSql) return v.sql;
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
};
const insertOf = (table: string, row: Record<string, unknown>): string =>
  `INSERT INTO "${table}" (${Object.keys(row).map((k) => `"${k}"`).join(", ")}) VALUES (${Object.values(row).map(lit).join(", ")})`;
const long = (n: number) => "r".repeat(n);

/**
 * ⭐ EVERY CHECK REFUSES ITS BAD ROW AND ACCEPTS ITS GOOD ONE, AND EVERY UNIQUE NAMES ITSELF — on the
 * real database, by the constraint name Postgres reports. All inside one transaction that is rolled
 * back, each probe in its own savepoint, so the database is left exactly as migrated.
 *
 * Each bad row breaks ONE rule and satisfies every other, so a refusal can only come from the
 * constraint the label names; a row that tripped a different one reads as a FAIL with that name.
 */
async function probeConstraints(url: string): Promise<void> {
  const OFFICER = "usr_officer";
  const botRow = (id: string, userId: string, o: Record<string, unknown> = {}) => ({
    id, userId, label: "Probe", labelKey: `probe ${id}`, status: "PAUSED", pauseReason: "NEW", passwordFingerprint: "fp",
    verifiedAt: NOW, verifiedById: OFFICER, designatedAt: NOW, designatedById: OFFICER, rules: {}, ...o,
  });
  const intentRow = (id: string, o: Record<string, unknown> = {}) => ({
    id, houseBotId: "hb_probe", botUserId: "usr_probe", kind: "FILL", anchorKey: `mkt_${id}`, marketId: `mkt_${id}`,
    productLine: "MARKET", side: "YES", stakeTzs: 1000, dueAt: NOW, deadlineAt: NOW, staleAt: NOW, status: "PENDING",
    decision: {}, idempotencyKey: `hb:${id}`, ...o,
  });
  const manualRow = (id: string, n: number, o: Record<string, unknown> = {}) =>
    intentRow(id, { kind: "MANUAL", anchorKey: `manual:${OFFICER}:${submitIdFor(n)}`, requestedById: OFFICER, entryCondition: "THIN", ...o });
  const counterRow = (id: string, pos: string, o: Record<string, unknown> = {}) =>
    intentRow(id, { kind: "COUNTER", anchorKey: pos, triggerPositionId: pos, ...o });
  const pressRow = (id: string, n: number, o: Record<string, unknown> = {}) => ({
    id, actorId: OFFICER, submitId: submitIdFor(n), purpose: "ENTER_NOW", houseBotId: "hb_probe", state: "CHECKING", ...o,
  });
  const targetRow = (id: string, o: Record<string, unknown> = {}) => ({
    id, houseBotId: "hb_probe", marketId: `mkt_${id}`, productLine: "MARKET", status: "ACTIVE", delayMinSec: 10, delayMaxSec: 20,
    timingFrom: "STAKE", reactTo: "FIRST", effectiveFrom: new RawSql("now() + interval '12 seconds'"),
    createdById: OFFICER, updatedById: OFFICER, snapshot: {}, ...o,
  });
  const botSet = (set: string) => `UPDATE "HouseBot" SET ${set} WHERE "id" = 'hb_probe'`;
  const controlSet = (set: string) => `UPDATE "HouseBotControl" SET ${set} WHERE "id" = 'global'`;

  // Rows the unique probes collide with. Kept for the whole transaction, never committed.
  const FIXTURES = [
    `INSERT INTO "User" ("id", "phoneE164", "updatedAt") VALUES ('usr_probe', '+255700990101', now()), ('usr_probe2', '+255700990102', now())`,
    insertOf("HouseBot", botRow("hb_probe", "usr_probe")),
    insertOf("HouseBotIntent", counterRow("hbi_u_counter", "pos_u")),
    insertOf("HouseBotIntent", intentRow("hbi_u_fill", { anchorKey: "mkt_u_fill", marketId: "mkt_u_fill" })),
    insertOf("HouseBotIntent", manualRow("hbi_u_manual", 900, { marketId: "mkt_u_manual" })),
    insertOf("HouseBotIntent", intentRow("hbi_u_placed", { status: "PLACED", positionId: "pos_u_placed" })),
    insertOf("HouseBotEvent", { id: "hbe_u_draw", marketId: "mkt_u_draw", kind: "OPENER_SIDE_DRAWN", payload: { side: "YES" } }),
    insertOf("HouseBotTarget", targetRow("hbt_u", { marketId: "mkt_u_target" })),
    insertOf("HouseBotPress", pressRow("hbp_u", 901)),
  ];

  const PROBES: Array<readonly [string, string, string]> = [
    // HouseBot
    ["bot · a second bot for another account", insertOf("HouseBot", botRow("hb_p1", "usr_probe2")), "ok"],
    ["bot · a second live bot for the same account", insertOf("HouseBot", botRow("hb_p2", "usr_probe")), "unique:HouseBot_userId_live_key"],
    ["bot · a live label key already in use", insertOf("HouseBot", botRow("hb_p3", "usr_probe2", { labelKey: "probe hb_probe" })), "unique:HouseBot_labelKey_live_key"],
    ["bot · a one-character label", botSet(`"label" = 'x'`), "check:HouseBot_label_check"],
    ["bot · a 32-character label", botSet(`"label" = '${long(32)}'`), "ok"],
    ["bot · a 33-character label", botSet(`"label" = '${long(33)}'`), "check:HouseBot_label_check"],
    ["bot · an empty label key", botSet(`"labelKey" = ''`), "check:HouseBot_labelKey_check"],
    ["bot · a 301-character note", botSet(`"note" = '${long(301)}'`), "check:HouseBot_note_check"],
    ["bot · an unknown status", botSet(`"status" = 'BOGUS'`), "check:HouseBot_status_check"],
    ["bot · PAUSED with no reason", botSet(`"pauseReason" = NULL`), "check:HouseBot_paused_reason_check"],
    ["bot · an unknown pause reason", botSet(`"pauseReason" = 'BOGUS'`), "check:HouseBot_pauseReason_check"],
    ["bot · paused from AUTO_PAUSED", botSet(`"pausedFromStatus" = 'AUTO_PAUSED'`), "check:HouseBot_pausedFromStatus_check"],
    ["bot · a credential change with no method", botSet(`"credentialChangedAt" = now()`), "check:HouseBot_credentialChanged_pair_check"],
    ["bot · a credential change by an unknown method", botSet(`"credentialChangedAt" = now(), "credentialChangedVia" = 'BOGUS'`), "check:HouseBot_credentialChangedVia_check"],
    ["bot · a credential change by UNKNOWN (a legacy account)", botSet(`"credentialChangedAt" = now(), "credentialChangedVia" = 'UNKNOWN'`), "ok"],
    ["bot · consent void with no cause", botSet(`"consentVoidAt" = now()`), "check:HouseBot_consentVoid_pair_check"],
    ["bot · consent void for an unknown cause", botSet(`"consentVoidAt" = now(), "consentVoidCause" = 'BOGUS'`), "check:HouseBot_consentVoidCause_check"],
    ["bot · REMOVED with no removal stamp", botSet(`"status" = 'REMOVED'`), "check:HouseBot_removed_pair_check"],
    ["bot · REMOVED for an unknown cause", botSet(`"status" = 'REMOVED', "removedAt" = now(), "removedCause" = 'BOGUS'`), "check:HouseBot_removedCause_check"],
    ["bot · REMOVED for SUNSET", botSet(`"status" = 'REMOVED', "removedAt" = now(), "removedCause" = 'SUNSET'`), "ok"],
    ["bot · a 301-character removal reason", botSet(`"removedReason" = '${long(301)}'`), "check:HouseBot_removedReason_check"],
    ["bot · rulesVersion 0", botSet(`"rulesVersion" = 0`), "check:HouseBot_rulesVersion_check"],
    // HouseBotControl
    ["control · a second control row", insertOf("HouseBotControl", { id: "other" }), "check:HouseBotControl_id_check"],
    ["control · an unknown off cause", controlSet(`"offCause" = 'BOGUS'`), "check:HouseBotControl_offCause_check"],
    ["control · a 301-character switch reason", controlSet(`"switchedReason" = '${long(301)}'`), "check:HouseBotControl_switchedReason_check"],
    ["control · limitsSchemaVersion 0", controlSet(`"limitsSchemaVersion" = 0`), "check:HouseBotControl_versions_check"],
    // HouseBotRuntime
    ["runtime · a bot key", insertOf("HouseBotRuntime", { key: "bot:hb_probe" }), "ok"],
    ["runtime · an instance beat key", insertOf("HouseBotRuntime", { key: "beat:poller:i1" }), "ok"],
    ["runtime · an unknown key", insertOf("HouseBotRuntime", { key: "bogus" }), "check:HouseBotRuntime_key_check"],
    ["runtime · a negative counter", `UPDATE "HouseBotRuntime" SET "countInHour" = -1 WHERE "key" = 'global'`, "check:HouseBotRuntime_counts_check"],
    // HouseBotEvent
    ["event · an unknown kind", insertOf("HouseBotEvent", { id: "hbe_p1", kind: "BOGUS" }), "check:HouseBotEvent_kind_check"],
    ["event · a 301-character reason", insertOf("HouseBotEvent", { id: "hbe_p2", kind: "PAUSED", reason: long(301) }), "check:HouseBotEvent_reason_check"],
    ["event · a second opener draw on the market", insertOf("HouseBotEvent", { id: "hbe_p3", marketId: "mkt_u_draw", kind: "OPENER_SIDE_DRAWN" }), "unique:hbe_opener_draw_uq"],
    ["event · an opener draw on another market", insertOf("HouseBotEvent", { id: "hbe_p4", marketId: "mkt_other_draw", kind: "OPENER_SIDE_DRAWN" }), "ok"],
    // HouseBotIntent
    ["intent · a valid Enter now", insertOf("HouseBotIntent", manualRow("hbi_p1", 902)), "ok"],
    ["intent · Enter now on Up and Down", insertOf("HouseBotIntent", manualRow("hbi_p2", 903, { productLine: "UPDOWN" })), "check:HouseBotIntent_manual_polls_check"],
    ["intent · requestedById on a COUNTER", insertOf("HouseBotIntent", counterRow("hbi_p3", "pos_p3", { requestedById: OFFICER })), "check:HouseBotIntent_requestedById_check"],
    ["intent · entryCondition on a FILL", insertOf("HouseBotIntent", intentRow("hbi_p4", { entryCondition: "THIN" })), "check:HouseBotIntent_entryCondition_manual_check"],
    ["intent · an unknown entry condition", insertOf("HouseBotIntent", manualRow("hbi_p4b", 920, { entryCondition: "BOGUS" })), "check:HouseBotIntent_entryCondition_check"],
    ["intent · targetId on a FILL", insertOf("HouseBotIntent", intentRow("hbi_p5", { targetId: "hbt_u" })), "check:HouseBotIntent_targetId_check"],
    ["intent · a targeted COUNTER", insertOf("HouseBotIntent", counterRow("hbi_p6", "pos_p6", { targetId: "hbt_u" })), "ok"],
    ["intent · a malformed Enter now press id", insertOf("HouseBotIntent", intentRow("hbi_p7", { kind: "MANUAL", anchorKey: `manual:${OFFICER}:x`, requestedById: OFFICER, entryCondition: "THIN" })), "check:HouseBotIntent_manual_anchor_check"],
    ["intent · an Enter now anchor naming another officer", insertOf("HouseBotIntent", manualRow("hbi_p8", 904, { requestedById: "usr_other" })), "check:HouseBotIntent_manual_anchor_check"],
    ["intent · a COUNTER whose anchor is not its trigger", insertOf("HouseBotIntent", intentRow("hbi_p9", { kind: "COUNTER", anchorKey: "pos_a", triggerPositionId: "pos_b" })), "check:HouseBotIntent_counter_anchor_check"],
    ["intent · a FILL whose anchor is not its market", insertOf("HouseBotIntent", intentRow("hbi_p10", { anchorKey: "mkt_elsewhere" })), "check:HouseBotIntent_market_anchor_check"],
    ["intent · an idempotency key that is not hb: plus the id", insertOf("HouseBotIntent", intentRow("hbi_p11", { idempotencyKey: "hb:other" })), "check:HouseBotIntent_idempotencyKey_check"],
    ["intent · PLACED without a position", insertOf("HouseBotIntent", intentRow("hbi_p12", { status: "PLACED" })), "check:HouseBotIntent_placed_check"],
    ["intent · a zero stake", insertOf("HouseBotIntent", intentRow("hbi_p13", { stakeTzs: 0 })), "check:HouseBotIntent_stakeTzs_check"],
    ["intent · a stake of 1,000,000,001", insertOf("HouseBotIntent", intentRow("hbi_p14", { stakeTzs: 1_000_000_001 })), "check:HouseBotIntent_stakeTzs_check"],
    ["intent · a stake of exactly 1,000,000,000", insertOf("HouseBotIntent", intentRow("hbi_p15", { stakeTzs: 1_000_000_000 })), "ok"],
    ["intent · negative transient attempts", insertOf("HouseBotIntent", intentRow("hbi_p16", { transientAttempts: -1 })), "check:HouseBotIntent_attempts_check"],
    ["intent · an unknown kind", insertOf("HouseBotIntent", intentRow("hbi_p17", { kind: "BOGUS" })), "check:HouseBotIntent_kind_check"],
    ["intent · an unknown status", insertOf("HouseBotIntent", intentRow("hbi_p18", { status: "BOGUS" })), "check:HouseBotIntent_status_check"],
    ["intent · an unknown side", insertOf("HouseBotIntent", intentRow("hbi_p18b", { side: "MAYBE" })), "check:HouseBotIntent_side_check"],
    ["intent · the same COUNTER trigger twice", insertOf("HouseBotIntent", counterRow("hbi_p19", "pos_u")), "unique:hbi_counter_anchor_uq"],
    ["intent · the same FILL anchor while the first is not CANCELLED", insertOf("HouseBotIntent", intentRow("hbi_p20", { anchorKey: "mkt_u_fill", marketId: "mkt_u_fill" })), "unique:hbi_fill_opener_anchor_uq"],
    ["intent · a CANCELLED FILL beside a live one on the anchor", insertOf("HouseBotIntent", intentRow("hbi_p21", { anchorKey: "mkt_u_fill", marketId: "mkt_u_fill", status: "CANCELLED" })), "ok"],
    ["intent · the same Enter now press id, even CANCELLED", insertOf("HouseBotIntent", manualRow("hbi_p22", 900, { marketId: "mkt_other_manual", status: "CANCELLED" })), "unique:hbi_manual_anchor_uq"],
    ["intent · a second live Enter now on the market", insertOf("HouseBotIntent", manualRow("hbi_p23", 905, { marketId: "mkt_u_manual" })), "unique:hbi_manual_live_market_uq"],
    ["intent · one position behind two intents", insertOf("HouseBotIntent", intentRow("hbi_p24", { status: "PLACED", positionId: "pos_u_placed" })), "unique:HouseBotIntent_positionId_key"],
    // HouseBotTarget
    ["target · delay min 4", insertOf("HouseBotTarget", targetRow("hbt_p1", { delayMinSec: 4 })), "check:HouseBotTarget_delayMinSec_check"],
    ["target · delay max 601", insertOf("HouseBotTarget", targetRow("hbt_p2", { delayMaxSec: 601 })), "check:HouseBotTarget_delayMaxSec_check"],
    ["target · delays 5 and 5", insertOf("HouseBotTarget", targetRow("hbt_p3", { delayMinSec: 5, delayMaxSec: 5 })), "ok"],
    ["target · delays 600 and 600", insertOf("HouseBotTarget", targetRow("hbt_p4", { delayMinSec: 600, delayMaxSec: 600 })), "ok"],
    ["target · min above max", insertOf("HouseBotTarget", targetRow("hbt_p5", { delayMinSec: 30, delayMaxSec: 10 })), "check:HouseBotTarget_delay_order_check"],
    ["target · ENDED with no end time", insertOf("HouseBotTarget", targetRow("hbt_p6", { status: "ENDED", endCause: "DONE" })), "check:HouseBotTarget_ended_pair_check"],
    ["target · ENDED VETOED", insertOf("HouseBotTarget", targetRow("hbt_p7", { status: "ENDED", endedAt: NOW, endCause: "VETOED" })), "ok"],
    ["target · ENDED CONSENT_VOID", insertOf("HouseBotTarget", targetRow("hbt_p8", { status: "ENDED", endedAt: NOW, endCause: "CONSENT_VOID" })), "ok"],
    ["target · an unknown end cause", insertOf("HouseBotTarget", targetRow("hbt_p9", { status: "ENDED", endedAt: NOW, endCause: "BOGUS" })), "check:HouseBotTarget_endCause_check"],
    ["target · REMOVED with no remover", insertOf("HouseBotTarget", targetRow("hbt_p10", { status: "REMOVED", removedAt: NOW })), "check:HouseBotTarget_removed_pair_check"],
    ["target · on Up and Down", insertOf("HouseBotTarget", targetRow("hbt_p11", { productLine: "UPDOWN" })), "check:HouseBotTarget_productLine_check"],
    ["target · armed before it was created", insertOf("HouseBotTarget", targetRow("hbt_p12", { effectiveFrom: new RawSql("now() - interval '1 second'") })), "check:HouseBotTarget_effectiveFrom_check"],
    ["target · an unknown timing", insertOf("HouseBotTarget", targetRow("hbt_p13", { timingFrom: "BOGUS" })), "check:HouseBotTarget_timingFrom_check"],
    ["target · an unknown reaction mode", insertOf("HouseBotTarget", targetRow("hbt_p13b", { reactTo: "BOGUS" })), "check:HouseBotTarget_reactTo_check"],
    ["target · an unknown status", insertOf("HouseBotTarget", targetRow("hbt_p13c", { status: "BOGUS" })), "check:HouseBotTarget_status_check"],
    ["target · version 0", insertOf("HouseBotTarget", targetRow("hbt_p14", { version: 0 })), "check:HouseBotTarget_version_check"],
    ["target · a second ACTIVE target on the poll", insertOf("HouseBotTarget", targetRow("hbt_p15", { marketId: "mkt_u_target" })), "unique:hbt_active_market_uq"],
    // HouseBotPress (the sealed pair: a code exactly when REFUSED; QUEUED only for Enter now with its intent)
    ["press · Enter now QUEUED with its intent", insertOf("HouseBotPress", pressRow("hbp_p1", 910, { state: "QUEUED", intentId: "hbi_x" })), "ok"],
    ["press · a TARGET_ADD row QUEUED", insertOf("HouseBotPress", pressRow("hbp_p2", 911, { purpose: "TARGET_ADD", state: "QUEUED", intentId: "hbi_x" })), "check:HouseBotPress_queued_check"],
    ["press · Enter now QUEUED without its intent", insertOf("HouseBotPress", pressRow("hbp_p3", 912, { state: "QUEUED" })), "check:HouseBotPress_queued_check"],
    ["press · a DONE row carrying a code", insertOf("HouseBotPress", pressRow("hbp_p4", 913, { state: "DONE", code: "OWNER_POSITION" })), "check:HouseBotPress_refused_code_check"],
    ["press · a REFUSED row with no code", insertOf("HouseBotPress", pressRow("hbp_p5", 914, { state: "REFUSED" })), "check:HouseBotPress_refused_code_check"],
    ["press · a REFUSED row with its code", insertOf("HouseBotPress", pressRow("hbp_p6", 915, { state: "REFUSED", code: "INFO_BLACKOUT" })), "ok"],
    ["press · an unknown purpose", insertOf("HouseBotPress", pressRow("hbp_p7", 916, { purpose: "BOGUS" })), "check:HouseBotPress_purpose_check"],
    ["press · an unknown state", insertOf("HouseBotPress", pressRow("hbp_p8", 917, { state: "BOGUS" })), "check:HouseBotPress_state_check"],
    ["press · a malformed submit id", insertOf("HouseBotPress", { ...pressRow("hbp_p9", 918), submitId: "x" }), "check:HouseBotPress_submitId_check"],
    ["press · a 301-character reason", insertOf("HouseBotPress", pressRow("hbp_p10", 919, { reason: long(301) })), "check:HouseBotPress_reason_check"],
    ["press · the same press twice", insertOf("HouseBotPress", pressRow("hbp_p11", 901)), "unique:hbp_actor_submit_uq"],
    // User (the one CHECK the house adds to an existing table)
    ["user · passwordSetVia REHASH", `UPDATE "User" SET "passwordSetVia" = 'REHASH' WHERE "id" = 'usr_probe'`, "ok"],
    ["user · passwordSetVia FOO", `UPDATE "User" SET "passwordSetVia" = 'FOO' WHERE "id" = 'usr_probe'`, "check:User_passwordSetVia_check"],
  ];
  // Every numeric bound at min − 1, min, max and max + 1 (gCounterPerPlayerPerDay: 1,440 in, 1,441 out).
  for (const [f, lo, hi] of BOT_CAP_BOUNDS) {
    PROBES.push([`bot · ${f} = ${lo - 1}`, botSet(`"${f}" = ${lo - 1}`), `check:HouseBot_${f}_check`]);
    PROBES.push([`bot · ${f} = ${lo}`, botSet(`"${f}" = ${lo}`), "ok"]);
    PROBES.push([`bot · ${f} = ${hi}`, botSet(`"${f}" = ${hi}`), "ok"]);
    PROBES.push([`bot · ${f} = ${hi + 1}`, botSet(`"${f}" = ${hi + 1}`), `check:HouseBot_${f}_check`]);
  }
  for (const [f, lo, hi] of LIMIT_BOUNDS) {
    PROBES.push([`control · ${f} = ${lo - 1}`, controlSet(`"${f}" = ${lo - 1}`), `check:HouseBotControl_${f}_check`]);
    PROBES.push([`control · ${f} = ${lo}`, controlSet(`"${f}" = ${lo}`), "ok"]);
    PROBES.push([`control · ${f} = ${hi}`, controlSet(`"${f}" = ${hi}`), "ok"]);
    PROBES.push([`control · ${f} = ${hi + 1}`, controlSet(`"${f}" = ${hi + 1}`), `check:HouseBotControl_${f}_check`]);
  }

  await withClient(url, async (c) => {
    await c.query("BEGIN");
    try {
      for (const f of FIXTURES) await c.query(f);
      let n = 0;
      for (const [label, sql, want] of PROBES) {
        const sp = `probe_${++n}`;
        await c.query(`SAVEPOINT ${sp}`);
        let got = "ok";
        try {
          await c.query(sql);
        } catch (e: Any) {
          got = e?.code === "23514" ? `check:${e.constraint}` : e?.code === "23505" ? `unique:${e.constraint}` : `error:${e?.code} ${e?.message}`;
        }
        await c.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        ok(`a1.probe · ${label}`, got === want, got === want ? "" : `expected ${want}, got ${got}`);
      }
    } finally {
      await c.query("ROLLBACK");
    }
  });
}

// ═══ §a · REPLAY (S1 a) ══════════════════════════════════════════════════════════════════════
section("§a1 · replay on an empty database");
await step("§a1", async () => {
  if (!fileTables || !fileMarkers) { ok("a1.0 · the two house migration files were found", false); return; }
  const url = dbUrl("hb_mig_empty");
  await recreate("hb_mig_empty");
  ok("a1.1 · prisma migrate deploy applies every migration to an empty database", run("npx", ["prisma", "migrate", "deploy"], { DATABASE_URL: url }) === 0);
  const first = await readSweep(url);
  ok("a1.2 · the sweep watermark is seeded at migration time (within 10 s)", first.iso !== null && first.ageMs >= 0 && first.ageMs < 10_000,
    `${first.iso} · ${Math.round(first.ageMs)} ms old`);
  for (let i = 1; i <= 2; i++) {
    const e1 = await applyRaw(url, fileTables);
    const e2 = await applyRaw(url, fileMarkers);
    ok(`a1.3 · replay ${i}: the tables file raises no error`, e1 === null, e1 ?? "");
    ok(`a1.3 · replay ${i}: the markers file raises no error`, e2 === null, e2 ?? "");
  }
  const again = await readSweep(url);
  ok("a1.4 · the replays leave the sweep watermark where the first apply put it (A11)", again.iso === first.iso, `${first.iso} → ${again.iso}`);
  await checkSchema(url, "a1");
  await probeConstraints(url);
});

section("§a2 · replay on a KYC-only database");
await step("§a2", async () => {
  if (!fileTables || !fileMarkers) return;
  const scratch = mkdtempSync(join(tmpdir(), "hb-mig-kyc-"));
  try {
    cpSync(join(ROOT, "prisma/schema.prisma"), join(scratch, "schema.prisma"));
    cpSync(MIG_DIR, join(scratch, "migrations"), { recursive: true, filter: (src) => !/_house_bot_(tables|markers)([\\/]|$)/.test(src) });
    const copied = readdirSync(join(scratch, "migrations"));
    ok("a2.0 · the scratch copy holds the KYC migration and no house folder",
      copied.includes(KYC_FOLDER) && !copied.some((f) => /house_bot/.test(f)), `${copied.length} entries`);
    const url = dbUrl("hb_mig_kyc");
    await recreate("hb_mig_kyc");
    ok("a2.1 · a KYC-only database migrates from the scratch copy",
      run("npx", ["prisma", "migrate", "deploy", "--schema", join(scratch, "schema.prisma")], { DATABASE_URL: url }) === 0);
    const pre = await withClient(url, async (c) =>
      (await c.query(`SELECT to_regclass('"HouseBot"')::text AS "hb", to_regclass('"KycSubmission"')::text AS "kyc"`)).rows[0]);
    ok("a2.2 · CONTROL · it has the KYC tables and no house table yet", pre?.hb === null && pre?.kyc != null, JSON.stringify(pre));
    // §b needs a KYC-only database as well: copy this one before the house files land on it.
    await recreate("hb_mig_block", "hb_mig_kyc");
    const e1 = await applyRaw(url, fileTables);
    ok("a2.3 · the tables file applies to the KYC-only database", e1 === null, e1 ?? "");
    const first = await readSweep(url);
    ok("a2.4 · the sweep watermark is seeded at apply time (within 10 s)", first.iso !== null && first.ageMs >= 0 && first.ageMs < 10_000, `${first.iso}`);
    const e2 = await applyRaw(url, fileMarkers);
    ok("a2.5 · the markers file applies to the KYC-only database", e2 === null, e2 ?? "");
    const e3 = await applyRaw(url, fileTables);
    const e4 = await applyRaw(url, fileMarkers);
    ok("a2.6 · both files replay with no error", e3 === null && e4 === null, [e3, e4].filter(Boolean).join(" | "));
    const again = await readSweep(url);
    ok("a2.7 · the replay leaves the sweep watermark where the first apply put it", again.iso === first.iso, `${first.iso} → ${again.iso}`);
    await checkSchema(url, "a2");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
// ═══ §b · BLOCKED APPLY (S1 b) ═══════════════════════════════════════════════════════════════
section("§b · a blocked apply fails fast and never stalls the write queue");
await step("§b", async () => {
  if (!fileMarkers) return;
  const url = dbUrl("hb_mig_block");
  await withClient(url, async (c) => {
    await c.query(`INSERT INTO "User" ("id", "phoneE164", "updatedAt") VALUES ('usr_hb_block', '+255700990201', now())`);
    await c.query(`INSERT INTO "PredictionMarket" ("id", "titleEn", "titleSw", "category", "sourceUrl", "resolutionCriterion", "resolutionAt", "proposedBy", "updatedAt")
      VALUES ('mkt_hb_block', 'Block', 'Block', 'sports', 'https://example.com', 'Block', now() + interval '30 days', 'usr_hb_block', now())`);
    await c.query(`INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "potentialPayout")
      VALUES ('pos_hb_block', 'usr_hb_block', 'mkt_hb_block', 'YES', 1000, 1900)`);
  });
  const c1 = new pg.Client({ connectionString: url });
  const c2 = new pg.Client({ connectionString: url });
  const c3 = new pg.Client({ connectionString: url });
  await Promise.all([c1.connect(), c2.connect(), c3.connect()]);
  try {
    const pidOf = async (c: pg.Client) => Number((await c.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
    const pid2 = await pidOf(c2), pid3 = await pidOf(c3);
    // A backstop, not the measurement: if lock_timeout did NOT hold, the apply would wait for ever.
    const cancelLater = (pid: number) => setTimeout(() => {
      void withClient(RAW, (a) => a.query("SELECT pg_cancel_backend($1)", [pid])).catch(() => {});
    }, 15_000);

    // conn1 holds a Position row lock, as a bet in flight does.
    await c1.query("BEGIN");
    await c1.query(`SELECT "id" FROM "Position" WHERE "id" = 'pos_hb_block' FOR UPDATE`);

    // conn2 applies the markers file exactly as migrate deploy sends it.
    const t0 = Date.now();
    let tFail = 0, applied = false, err2: Any = null;
    const guard2 = cancelLater(pid2);
    const p2 = c2.query(fileMarkers).then(() => { applied = true; tFail = Date.now(); }, (e) => { err2 = e; tFail = Date.now(); });

    // conn3 writes a Position half a second later, as the next bet would.
    await sleep(500);
    let tCommit = 0, err3: Any = null;
    const guard3 = cancelLater(pid3);
    const p3 = c3.query(`INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "potentialPayout")
      VALUES ('pos_hb_block2', 'usr_hb_block', 'mkt_hb_block', 'NO', 500, 950)`)
      .then(() => { tCommit = Date.now(); }, (e) => { err3 = e; tCommit = Date.now(); });

    await p2;
    clearTimeout(guard2);
    await p3;
    clearTimeout(guard3);
    await c1.query("ROLLBACK");

    ok("b.1 · with a Position row locked, the apply fails with 55P03 (lock_not_available)", !applied && err2?.code === "55P03",
      applied ? "the apply SUCCEEDED while the row lock was held" : `${err2?.code} ${err2?.message}`);
    ok("b.2 · …within 3.5 s of starting: SET LOCAL lock_timeout held for the whole file", tFail - t0 <= 3_500, `${tFail - t0} ms`);
    ok("b.3 · the concurrent Position INSERT commits", err3 === null, err3?.message ?? "");
    ok("b.4 · …within 1 s of the failure: the apply never stalls the write queue", err3 === null && tCommit - tFail <= 1_000, `${tCommit - tFail} ms`);

    // ⭐ One transaction: nothing the file did before or at the block may survive it.
    const left = (await c2.query(`SELECT
      (SELECT count(*)::int FROM pg_indexes WHERE indexname = 'Position_placedAt_id_idx') AS "idx",
      (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'Position' AND column_name = 'houseBotId') AS "col"`)).rows[0];
    ok("b.5 · the failed apply left nothing behind (no index, no column)", left.idx === 0 && left.col === 0, JSON.stringify(left));

    // ⛔ CONTROL: the failure above came from the held lock, not from the file.
    let ctl: Any = null;
    try { await c2.query(fileMarkers); } catch (e) { ctl = e; }
    ok("b.c1 · CONTROL · with no lock held the same apply succeeds", ctl === null, ctl?.message ?? "");
    const col = (await c2.query(`SELECT count(*)::int AS "n" FROM information_schema.columns WHERE table_name = 'Position' AND column_name = 'houseBotId'`)).rows[0].n;
    ok("b.c2 · CONTROL · …and the marker column exists afterwards", col === 1, `${col}`);

    // ⭐ b.6 · a bet that READS Position and then WRITES it, while the file runs. The file re-runs, and
    // ALTER TABLE and CREATE INDEX IF NOT EXISTS still take their table locks on a replay, so this
    // exercises the same lock order as the first apply. A SHARE taken on Position before its ACCESS
    // EXCLUSIVE would deadlock with this bet (40P01); the column first lets the bet's INSERT through.
    await c1.query("BEGIN");
    await c1.query(`SELECT "id" FROM "Position" WHERE "id" = 'pos_hb_block'`);
    let applied6 = false, err6a: Any = null, err6b: Any = null;
    const guard6 = cancelLater(pid2);
    const p6 = c2.query(fileMarkers).then(() => { applied6 = true; }, (e) => { err6a = e; });
    await sleep(500);
    await c1.query(`INSERT INTO "Position" ("id", "userId", "marketId", "side", "stake", "potentialPayout")
      VALUES ('pos_hb_block3', 'usr_hb_block', 'mkt_hb_block', 'NO', 500, 950)`).catch((e) => { err6b = e; });
    await c1.query(err6b ? "ROLLBACK" : "COMMIT");
    await p6;
    clearTimeout(guard6);
    ok("b.6 · a bet reading then writing Position while the file runs: no deadlock (40P01) on either side",
      err6a?.code !== "40P01" && err6b?.code !== "40P01", `apply ${err6a?.code ?? "ok"} · bet ${err6b?.code ?? "ok"}`);
    ok("b.6a · …the bet's INSERT succeeds", err6b === null, err6b?.message ?? "");
    ok("b.6b · …and the apply either succeeds or fails fast with 55P03", applied6 || err6a?.code === "55P03",
      applied6 ? "applied" : `${err6a?.code} ${err6a?.message ?? ""}`);
  } finally {
    for (const c of [c1, c2, c3]) await c.end().catch(() => {});
  }
});

// ═══ §d · THE DAL ON POSTGRES AND ON THE MEMORY TWIN ═════════════════════════════════════════
section("§d · the house DAL on Postgres and on the memory twin");
/** One run of the case list in a child process; its outcomes come back through a file. */
function runCases(label: string, env: Record<string, string>): CaseRun | null {
  const out = join(tmpdir(), `hb-dal-cases-${label}-${process.pid}.json`);
  rmSync(out, { force: true });
  const status = run("npx", ["tsx", "scripts/lib/house-bot-dal-cases.mts"], { HB_DAL_CASES_RUN: "1", HB_DAL_CASES_OUT: out, ...env });
  try {
    if (status !== 0 || !existsSync(out)) {
      ok(`d.0 · the ${label} case run exits 0 and writes its outcomes`, false, `exit ${status}, file ${existsSync(out) ? "written" : "missing"}`);
      return null;
    }
    const r = JSON.parse(readFileSync(out, "utf8")) as CaseRun;
    ok(`d.0 · the ${label} case run exits 0 and writes its outcomes`, Array.isArray(r.lines), `${r.lines?.length ?? 0} outcome(s)`);
    return r;
  } catch (e) {
    ok(`d.0 · the ${label} case run's outcomes parse`, false, e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    rmSync(out, { force: true });
  }
}

await step("§d", async () => {
  // ⛔ CONTROLS for the comparison itself, before it is trusted with anything.
  ok("d.c1 · CONTROL · a wrong outcome is reported", diffOutcomes({ a: "x" }, { a: "y" }).length === 1);
  ok("d.c2 · CONTROL · a missing case and an unexpected one are both reported", diffOutcomes({ a: "x" }, { b: "x" }).length === 2);
  ok("d.c3 · CONTROL · identical maps report nothing", diffOutcomes({ a: "x" }, { a: "x" }).length === 0);
  if (!fileTables) return;

  await recreate("hb_mig_dal", "hb_mig_empty");
  await recreate("hb_mig_dal_tz", "hb_mig_empty");
  await withClient(RAW, async (c) => {
    // Both zones are set explicitly: a scratch cluster takes its default zone from the host, so
    // "the default" would prove nothing about either.
    await c.query(`ALTER DATABASE "hb_mig_dal" SET timezone TO 'UTC'`);
    await c.query(`ALTER DATABASE "hb_mig_dal_tz" SET timezone TO 'Africa/Dar_es_Salaam'`);
  });

  const pgRun = runCases("postgres", { DATABASE_URL: dbUrl("hb_mig_dal"), USE_PRISMA_DAL: "true", HB_DAL_CASES_ONLY: "" });
  const memRun = runCases("memory", { DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_DAL_CASES_ONLY: "" });
  const tzRun = runCases("postgres-eat", { DATABASE_URL: dbUrl("hb_mig_dal_tz"), USE_PRISMA_DAL: "true", HB_DAL_CASES_ONLY: "c13" });
  if (!pgRun || !memRun) return;

  ok("d.1 · the Postgres run ran on Postgres and the memory run on memory", pgRun.store === "postgres" && memRun.store === "memory", `${pgRun.store} · ${memRun.store}`);
  const pgO = outcomesOf(pgRun), memO = outcomesOf(memRun);
  ok("d.2 · no case was recorded twice", pgO.duplicates.length === 0 && memO.duplicates.length === 0, [...pgO.duplicates, ...memO.duplicates].join(", "));
  const keys = Object.keys(EXPECTED);
  ok(`d.3 · the expected list is populated (${keys.length} outcomes)`, keys.length >= 200);
  for (const k of keys) {
    const want = EXPECTED[k], p = pgO.map[k], m = memO.map[k];
    ok(`d · ${k}`, p === want && m === want, p === want && m === want ? "" : `expected ${want} · postgres ${p ?? "(missing)"} · memory ${m ?? "(missing)"}`);
  }
  const unexpected = [...diffOutcomes(EXPECTED, pgO.map), ...diffOutcomes(EXPECTED, memO.map)].filter((d) => d.includes(": not expected"));
  ok("d.4 · neither run recorded a case the list does not expect (a crashed group shows here)", unexpected.length === 0, unexpected.join(" | "));
  const twin = diffOutcomes(pgO.map, memO.map);
  ok("d.5 · ⭐ Postgres and the memory twin produced identical outcomes, case for case", twin.length === 0, twin.slice(0, 10).join(" | "));

  // 04 A4: timestamptz comparisons must not depend on the session time zone.
  const tzOf = (r: CaseRun | null) => r?.pgOnly.find((l) => l.case === "session.timezone")?.outcome ?? "(none)";
  ok("d.6 · the UTC run's session time zone really was UTC", tzOf(pgRun) === "UTC", tzOf(pgRun));
  if (tzRun) {
    const tzO = outcomesOf(tzRun).map;
    ok("d.7 · the EAT run's session time zone really was Africa/Dar_es_Salaam", tzOf(tzRun) === "Africa/Dar_es_Salaam", tzOf(tzRun));
    const claimKeys = keys.filter((k) => k.startsWith("c13."));
    const moved = claimKeys.filter((k) => tzO[k] !== pgO.map[k]);
    /**
     * ⚠️ THE COUNT IS PART OF THE CLAIM, AND IT HAD ROTTED — re-derived 2026-09-20 (C5-8, alerts lane).
     *
     * `moved.length === 0` alone is VACUOUS when nothing is compared, which is the only reason a population
     * count sits in this assertion at all. It was pinned at **3** when §c13 held `a`, `b` and `c`. The reclaim
     * cases `c13.d`–`c13.g` were added to `house-bot-dal-cases.mts` afterwards WITHOUT moving this pin, so the
     * suite has been **660 passed / 1 failed** on this branch ever since — a red clean `origin/main` does not
     * have (measured: `origin/main` carries 3 keys against a pin of 3 and is green).
     *
     * ⛔ Nobody saw it because the detail string described the OTHER half: with `moved` empty the red printed
     * its label and nothing else, so the one line a reader gets said nothing about why. The count is now in the
     * detail unconditionally.
     *
     * ⭐ The substantive claim is UNHARMED and is measured over all seven: under `Africa/Dar_es_Salaam` every
     * one of the seven claim outcomes is byte-identical to the UTC run's (`moved.length === 0`), which is 04
     * A4's rule that a `timestamptz` comparison must not depend on the session zone.
     *
     * ⛔ STILL AN EQUALITY, deliberately. `>=` would let a dropped case hide, which is the failure this pin
     * exists to prevent; raising 3 → 7 makes it stricter, never looser. A future §c13 case moves this number
     * in the SAME commit that adds it.
     */
    ok("d.8 · under an EAT session time zone the claim takes exactly the same rows", claimKeys.length === 7 && moved.length === 0,
      `${claimKeys.length} claim cases (expected 7)${moved.length ? ` · ${moved.map((k) => `${k}: ${tzO[k]} vs ${pgO.map[k]}`).join(" | ")}` : " · none moved"}`);
  }

  // The User CHECK on Postgres, outside the parity comparison: the memory user store does not run it.
  await withClient(dbUrl("hb_mig_dal"), async (c) => {
    const u = (await c.query(`SELECT "id" FROM "User" ORDER BY "id" LIMIT 1`)).rows[0]?.id as string | undefined;
    ok("d.9 · the case run left an account to probe", !!u);
    if (!u) return;
    let err: Any = null;
    try { await c.query(`UPDATE "User" SET "passwordSetVia" = 'FOO' WHERE "id" = $1`, [u]); } catch (e) { err = e; }
    ok("d.10 · passwordSetVia 'FOO' is refused, naming User_passwordSetVia_check",
      err?.code === "23514" && err?.constraint === "User_passwordSetVia_check", err ? `${err.code} ${err.constraint}` : "accepted");
    const r = await c.query(`UPDATE "User" SET "passwordSetVia" = 'REHASH' WHERE "id" = $1`, [u]);
    ok("d.11 · 'REHASH' is accepted", r.rowCount === 1, `${r.rowCount}`);
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-migrations: ${pass} passed, ${fail} failed`);
console.log("Not measured here, by design: S1 (c) — npm run verify:house-bot-migrations-old-build · houseBotSchemaReady() — build commit 4.");
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
