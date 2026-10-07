/**
 * U33r · THE AGENT-REFEREE KEYS ON A REAL POSTGRES — and the SAME scenario on the memory twin, answer for answer.
 *
 * ⭐ WHY THIS EXISTS. `test:dal-parity` §28 holds both twins' SHAPE, and the suites run only the MEMORY twin. Whether
 * `createMany … skipDuplicates` really skips a pair already held (and counts 0), whether the composite key really keeps a
 * second naming of one referee as a second row, whether the earliest naming really comes back from Timestamptz(3), whether
 * the backfill and the gate really refuse a referee through Prisma — those are facts about the database. So the scenario
 * below runs twice — here, through the REAL `db` on a scratch PostgreSQL, and in a child process with no database (the
 * memory twin) — and every answer must be identical between the two AND equal to the answers written here by hand.
 *
 *   0  the migration `…_agent_referee_key` is applied and finished, and the table is EXACTLY its three columns, NOT NULL,
 *      with the composite primary key and NO foreign key (no link to an application or an applicant);
 *   1  the scenario on Postgres, through `db`, against the hand-written answers: a pair held is skipped (0), an earlier
 *      naming of one key is a second row and wins, a bulk read answers one entry per key in key order, a raw number asked
 *      or written as a key is REFUSED by the rule set before any query, and 2,001 keys are refused, never cut off;
 *   2  the backfill end to end: an application written straight to Postgres (the shape that predates the exclusion) is
 *      counted missing, keyed, then counted 0 missing; a re-run writes nothing; and the REAL gate refuses each referee
 *      number `agent_referee` while a stranger is refused for no consent;
 *   3  the memory twin's transcript of the same scenario equals Postgres', answer for answer.
 *
 * ⚠️ WRITTEN BY THE U33r BUILDER, WHO MAY NOT START POSTGRES ON THIS PC — NOT YET RUN. The integrator runs it once, through
 * the heavy-node lock, and fixes the probe (never the expected answers) if it trips over itself.
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes rows. ⛔ No backslash anywhere in this file (the tools that write it decode escapes).
 *
 * Run: npm run db:probe-referee-keys   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { StoredAgentApplication, StoredUser } from "../../src/lib/server/store.ts";

process.exitCode = 1;
const PHASE = process.env.REFEREE_KEYS_PROBE_PHASE ?? "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = "scripts/live/referee-keys-pg-probe.mts";
const MARK = "REFEREE_KEYS_TRANSCRIPT ";

/* ═══ THE WORLD — every instant, number and expected answer written HERE, by hand ═════════════════════════════════ */

const T_EARLY = "2026-09-08T10:00:00.000Z";   // a referee named in the programme's first week
const T_LATE = "2026-10-08T10:00:00.000Z";    // the same referee named again a month later
const T_REC = "2026-10-08T12:00:00.000Z";     // a row written
const T_REC2 = "2026-10-08T13:00:00.000Z";    // another row written
const N = {
  one: "255712300001", two: "255712300002", three: "255712300003",
  refA: "255712300004", refB: "255712300005", stranger: "255712300006", applicant: "255712300009",
};
const U1 = "probe_rk_u1";
const APP1 = "probe_rk_app1";

const user = (id: string, phoneE164: string): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
  acceptedTermsVersion: "v1", acceptedTermsAt: T_EARLY, marketingOptIn: false, twoFactorEnabled: false,
  avatarDataUrl: null, createdAt: T_EARLY, updatedAt: T_EARLY, lastLoginAt: null, closedAt: null,
} as StoredUser);
/** An application in the shape that predates the exclusion: its referees written straight to the row, never keyed. */
const application = (id: string, userId: string): StoredAgentApplication => ({
  id, userId, status: "REJECTED", source: "SELF_SERVICE",
  refereeOneName: "Probe Referee A", refereeOneContact: `0${N.refA.slice(3, 6)} ${N.refA.slice(6, 9)} ${N.refA.slice(9)}`,
  refereeTwoName: "Probe Referee B", refereeTwoContact: `+255 ${N.refB.slice(3)}`, refereeConsentAt: T_EARLY,
  feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
  feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
  feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null,
  feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
  reviewerId: null, reviewedAt: T_EARLY, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
  approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  submittedAt: T_EARLY, expiresAt: null, createdAt: T_EARLY, updatedAt: T_EARLY,
} as StoredAgentApplication);

/** The answers, written by hand — both twins must give exactly these. */
const EXPECTED = {
  r1: 1, r2: 0, r3: 2,
  e1: T_EARLY, e2: T_LATE, e3: null,
  amongShape: [true, true, true], amongNamed: [T_EARLY, T_LATE, null], empty: 0,
  rawAskRefused: true, rawWriteRefused: true, tooManyRefused: true,
  censusBefore: { applications: 1, withContact: 1, numbers: 2, missing: 2 },
  backfill: { applications: 1, withContact: 1, numbers: 2, missing: 0, written: 2 },
  again: { written: 0, missing: 0 },
  gate: ["agent_referee", "agent_referee", "no_consent"],
};

/* ═══ THE SCENARIO — the same code on either twin; it answers a transcript ═══════════════════════════════════════════ */

async function refused(fn: () => Promise<unknown>): Promise<boolean> {
  try { await fn(); return false; } catch { return true; }
}

async function scenario(): Promise<Record<string, unknown>> {
  const { db } = await import("../../src/lib/server/store.ts");
  const RX = await import("../../src/lib/server/marketing/referee-exclusion.ts");
  const { mayReceiveMarketingSms } = await import("../../src/lib/server/marketing/consent.ts");
  const K = { one: RX.refereeKeyOf(N.one), two: RX.refereeKeyOf(N.two), three: RX.refereeKeyOf(N.three) };
  const t: Record<string, unknown> = {};
  t.r1 = await db.agentRefereeKey.record([{ refereeKey: K.one, namedAt: T_LATE, recordedAt: T_REC }]);
  t.r2 = await db.agentRefereeKey.record([{ refereeKey: K.one, namedAt: T_LATE, recordedAt: T_REC2 }]);
  t.r3 = await db.agentRefereeKey.record([
    { refereeKey: K.one, namedAt: T_EARLY, recordedAt: T_REC2 }, { refereeKey: K.two, namedAt: T_LATE, recordedAt: T_REC2 },
  ]);
  t.e1 = await db.agentRefereeKey.earliestFor(K.one);
  t.e2 = await db.agentRefereeKey.earliestFor(K.two);
  t.e3 = await db.agentRefereeKey.earliestFor(K.three);
  const among = await db.agentRefereeKey.earliestAmong([K.three, K.one, K.two, K.one]);
  const order = [K.one, K.two, K.three].sort();
  t.amongShape = [among.length === 3, among.map((e) => e.refereeKey).join() === order.join(), among.every((e) => typeof e.refereeKey === "string")];
  const named = new Map(among.map((e) => [e.refereeKey, e.namedAt] as const));
  t.amongNamed = [named.get(K.one) ?? "missing", named.get(K.two) ?? "missing", named.has(K.three) ? named.get(K.three) : "missing"];
  t.empty = (await db.agentRefereeKey.earliestAmong([])).length;
  t.rawAskRefused = await refused(async () => db.agentRefereeKey.earliestFor(N.one));
  t.rawWriteRefused = await refused(async () => db.agentRefereeKey.record([{ refereeKey: N.one, namedAt: T_EARLY, recordedAt: T_REC }]));
  const many = Array.from({ length: 2001 }, (_, i) => RX.refereeKeyOf(`2557${String(10000000 + i)}`));
  t.tooManyRefused = await refused(async () => db.agentRefereeKey.earliestAmong(many));
  // ── the backfill end to end ──
  await db.user.create(user(U1, `+${N.applicant}`));
  await db.agentApplication.create(application(APP1, U1));
  t.censusBefore = await RX.refereeKeyCensus();
  t.backfill = await RX.backfillRefereeKeys(T_REC);
  const again = await RX.backfillRefereeKeys(T_REC);
  t.again = { written: again.written, missing: again.missing };
  t.gate = [];
  for (const m of [N.refA, N.refB, N.stranger]) {
    const v = await mayReceiveMarketingSms(m);
    (t.gate as string[]).push(v.ok ? "ALLOWED" : v.skipReason);
  }
  return t;
}

/* ═══ THE MEMORY PHASE — the child: no database, the same scenario, one transcript line ═════════════════════════════ */

if (PHASE === "memory") {
  const t = await scenario();
  console.log(MARK + JSON.stringify(t));
  process.exit(0);
}

/* ═══ THE POSTGRES PHASE ════════════════════════════════════════════════════════════════════════════════════════════ */

const URL_RAW = process.env.DATABASE_URL ?? "";
if (!URL_RAW) {
  console.error("referee-keys-pg-probe: needs DATABASE_URL (a scratch Postgres) — the memory twin alone proves nothing about Postgres.");
  process.exit(2);
}
{
  let host = "";
  try { host = new URL(URL_RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("referee-keys-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x !== null && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
  : x));

// ── 0 · the migration and the table ──
{
  const client = new pg.Client({ connectionString: URL_RAW });
  await client.connect();
  try {
    const applied = await client.query(`select migration_name from "_prisma_migrations" where migration_name like '%_agent_referee_key' and finished_at is not null and rolled_back_at is null`);
    const cols = await client.query(`select column_name, data_type, datetime_precision, is_nullable from information_schema.columns where table_name = 'AgentRefereeKey' order by column_name`);
    const pk = await client.query(`select pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class t on t.oid = c.conrelid where t.relname = 'AgentRefereeKey' and c.contype = 'p'`);
    const fks = await client.query(`select count(*)::int as n from pg_constraint c join pg_class t on t.oid = c.conrelid where t.relname = 'AgentRefereeKey' and c.contype = 'f'`);
    const shape = cols.rows.map((r) => `${r.column_name}:${r.data_type}:${r.datetime_precision ?? "-"}:${r.is_nullable}`).join(" ");
    const want = "namedAt:timestamp with time zone:3:NO recordedAt:timestamp with time zone:3:NO refereeKey:text:-:NO";
    ok("0 · the migration is applied and finished, and the table is EXACTLY refereeKey text, namedAt and recordedAt timestamptz(3), all NOT NULL, the primary key (refereeKey, namedAt) and NO foreign key",
      applied.rowCount === 1 && shape === want && pk.rows.length === 1 && String(pk.rows[0].def) === 'PRIMARY KEY ("refereeKey", "namedAt")' && fks.rows[0].n === 0,
      `applied ${applied.rowCount} · columns ${shape} · pk ${pk.rows.map((r) => r.def).join()} · fks ${fks.rows[0]?.n}`);
  } finally {
    await client.end();
  }
}

// ── 1 · 2 · the scenario on Postgres ──
const onPostgres = await scenario();
for (const [k, want] of Object.entries(EXPECTED)) {
  const got = onPostgres[k];
  ok(`1 · Postgres · ${k} is the hand-written answer`, canon(got) === canon(want), `got ${canon(got)} · want ${canon(want)}`);
}
// ── 1b · what the table holds afterwards, read by SQL: the five rows the scenario wrote (K.one twice, K.two once, the two
//    backfilled referees), every key thirty-two letters a–p — the refused raw-number write left nothing, and no digit is
//    stored anywhere ──
{
  const client = new pg.Client({ connectionString: URL_RAW });
  await client.connect();
  try {
    const all = await client.query(`select count(*)::int as n from "AgentRefereeKey"`);
    const letters = await client.query(`select count(*)::int as n from "AgentRefereeKey" where "refereeKey" ~ '^[a-p]{32}$'`);
    ok("1b · the table holds exactly the five rows written, every key thirty-two letters a–p — the refused raw-number write left nothing",
      all.rows[0].n === 5 && letters.rows[0].n === 5, `rows ${all.rows[0].n} · letter keys ${letters.rows[0].n}`);
  } finally {
    await client.end();
  }
}

// ── 3 · the memory twin, in a child with NO database ──
{
  const env: Record<string, string | undefined> = { ...process.env, REFEREE_KEYS_PROBE_PHASE: "memory", USE_PRISMA_DAL: "false" };
  delete env.DATABASE_URL;
  const child = spawnSync("npx", ["tsx", SELF], { cwd: ROOT, env: env as NodeJS.ProcessEnv, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000 });
  const line = (child.stdout ?? "").split(String.fromCharCode(10)).find((l) => l.startsWith(MARK)) ?? "";
  let onMemory: Record<string, unknown> | null = null;
  try { onMemory = line ? JSON.parse(line.slice(MARK.length)) as Record<string, unknown> : null; } catch { onMemory = null; }
  ok("3 · the memory twin's transcript of the SAME scenario equals Postgres', answer for answer",
    onMemory !== null && canon(onMemory) === canon(onPostgres),
    onMemory === null ? `the child gave no transcript (exit ${child.status}): ${(child.stderr ?? "").slice(0, 300)}` : `${Object.keys(onMemory).length} answers`);
}

console.log(`${String.fromCharCode(10)}referee-keys-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
process.exit(process.exitCode);
