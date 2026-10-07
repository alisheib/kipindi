/**
 * U33r · THE AGENT-REFEREE KEYS ON A REAL POSTGRES — and the SAME scenario on the memory twin, answer for answer.
 *
 * ⭐ WHY THIS EXISTS. `test:dal-parity` §28 holds both twins' SHAPE, and the suites run only the MEMORY twin. Whether
 * `createMany … skipDuplicates` really skips a key already held (and counts 0), whether the table really holds the KEY AND
 * NOTHING ELSE (the U33r review's MAJOR-1), whether the e-mail lookup on the book really matches case-insensitively on
 * Postgres (MINOR-1), whether the backfill and the gate really refuse a referee through Prisma — those are facts about the
 * database. So the scenario below runs twice — here, through the REAL `db` on a scratch PostgreSQL, and in a child process
 * with no database (the memory twin) — and every answer must be identical between the two AND equal to the answers
 * written here by hand.
 *
 *   0  the migration `…_agent_referee_key` is applied and finished, and the table is EXACTLY one column — `refereeKey`
 *      text, NOT NULL, the primary key — with NO foreign key and no instant (no column links it to an application or an applicant);
 *   1  the scenario on Postgres, through `db`, against the hand-written answers: a key held is skipped (0), the held read
 *      answers one entry per key in key order, a raw number asked or written as a key is REFUSED by the rule set before
 *      any query, a row carrying an INSTANT beside its key is refused and leaves nothing, 2,001 keys are refused, never cut
 *      off, and the book's e-mail lookup matches whatever the case;
 *   2  the backfill end to end: two applications written straight to Postgres (the shape that predates the exclusion) —
 *      one naming two referees by number, one naming a referee by e-mail (whose number only the book holds) and a landline
 *      — are counted missing, keyed, then counted 0 missing; a re-run writes nothing; and the REAL gate refuses each
 *      referee number `agent_referee` while a stranger is refused for no consent;
 *   2a (the third pass's MINOR-2) the e-mail referee's ADDRESS is keyed by the backfill, and read case-insensitively; the
 *      book's addresses for a set of numbers come back in ONE query (marketingContact.emailsAmong: the number and the
 *      address only), and the gate's single book read finds the referee's address on the book row at its number;
 *   2b (the re-review's MINOR-4; the third pass) the two HAND STEPS on the real audit log, each naming referee one: a third application holding a contact the
 *      reader cannot read is counted unreadable; a reason with a numeral is refused; a person's review clears it (counted
 *      reviewed); a number keyed by hand is refused by the real gate; and the two audit rows name the application and
 *      carry no number;
 *   3  the memory twin's transcript of the same scenario equals Postgres', answer for answer.
 *
 * ⚠️ WRITTEN BY THE U33r BUILDER, WHO MAY NOT START POSTGRES ON THIS PC — NOT YET RUN ON POSTGRES (its memory phase was run
 * and gives exactly the answers below). The integrator runs it once, through the heavy-node lock, and fixes the probe
 * (never the expected answers) if it trips over itself.
 * ⛔ A LOOPBACK CLUSTER ONLY: it writes rows. ⛔ No backslash anywhere in this file (the tools that write it decode escapes).
 *
 * Run: npm run db:probe-referee-keys   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this)
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { StoredAgentApplication, StoredMarketingContact, StoredUser } from "../../src/lib/server/store.ts";

process.exitCode = 1;
const PHASE = process.env.REFEREE_KEYS_PROBE_PHASE ?? "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = "scripts/live/referee-keys-pg-probe.mts";
const MARK = "REFEREE_KEYS_TRANSCRIPT ";

/* ═══ THE WORLD — every instant, number and expected answer written HERE, by hand ═════════════════════════════════ */

const T_EARLY = "2026-09-08T10:00:00.000Z";   // the referees were named in the programme's first week
const N = {
  one: "255712300001", two: "255712300002", three: "255712300003",
  refA: "255712300004", refB: "255712300005", stranger: "255712300006", refC: "255712300007", applicant: "255712300009",
  refD: "255712300008",
};
const REF_EMAIL = "Probe.Referee@Example.com";
const U1 = "probe_rk_u1";
const APP1 = "probe_rk_app1";
const APP2 = "probe_rk_app2";
const APP3 = "probe_rk_app3";
const HAND_REASON = "incomplete_number";
const HAND_BY = "probe";
const BOOK1 = "probe_rk_book1";

const user = (id: string, phoneE164: string): StoredUser => ({
  id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
  acceptedTermsVersion: "v1", acceptedTermsAt: T_EARLY, marketingOptIn: false, twoFactorEnabled: false,
  avatarDataUrl: null, createdAt: T_EARLY, updatedAt: T_EARLY, lastLoginAt: null, closedAt: null,
} as StoredUser);
/** An application in the shape that predates the exclusion: its referees written straight to the row, never keyed. */
const application = (id: string, userId: string, one: string, two: string): StoredAgentApplication => ({
  id, userId, status: "REJECTED", source: "SELF_SERVICE",
  refereeOneName: "Probe Referee A", refereeOneContact: one,
  refereeTwoName: "Probe Referee B", refereeTwoContact: two, refereeConsentAt: T_EARLY,
  feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
  feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
  feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null,
  feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
  reviewerId: null, reviewedAt: T_EARLY, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
  approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null,
  submittedAt: T_EARLY, expiresAt: null, createdAt: T_EARLY, updatedAt: T_EARLY,
} as StoredAgentApplication);
/** A contact-book row holding the e-mail referee's number — the only place 50pick holds it. */
const bookRow = (id: string, msisdn: string, email: string): StoredMarketingContact => ({
  id, msisdn, rawInput: `+${msisdn}`, displayName: "Probe Referee C", email, ndc: msisdn.slice(3, 5), operator: null,
  source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
  importId: null, createdAt: T_EARLY, createdBy: null, updatedAt: T_EARLY, updatedBy: null,
});

/** The answers, written by hand — both twins must give exactly these. */
const EXPECTED = {
  r1: 1, r2: 0, r3: 1,
  held: [true, true, false],
  amongShape: [true, true, true], amongHeld: [true, true, false], empty: 0,
  rawAskRefused: true, rawWriteRefused: true, instantWriteRefused: true, instantLeftNothing: true, tooManyRefused: true,
  byEmail: [N.refC], byBlankEmail: 0,
  censusBefore: { applications: 2, promised: 2, withContact: 2, numbers: 3, emails: 1, missing: 4, unreadable: 0, reviewed: 0, notMobile: 1, emailOnlyUnmatched: 0 },
  backfill: { applications: 2, promised: 2, withContact: 2, numbers: 3, emails: 1, missing: 0, unreadable: 0, reviewed: 0, notMobile: 1, emailOnlyUnmatched: 0, written: 4 },
  emailHeld: [true, true, false],
  bookEmails: [{ msisdn: N.refC, email: REF_EMAIL }],
  bookHeld: [true, false],
  again: { written: 0, missing: 0 },
  gate: ["agent_referee", "agent_referee", "agent_referee", "no_consent"],
  handBefore: { unreadable: 1, reviewed: 0, missing: 0, notMobile: 2 },
  handGateBefore: "no_consent",
  handBadReason: { ok: false, why: "bad_reason" },
  handReviewed: { ok: true, written: 0 },
  handAfterReview: { unreadable: 0, reviewed: 1, missing: 0, notMobile: 2 },
  handKeyed: { ok: true, written: 1 },
  handGate: "agent_referee",
  handAudit: [
    { action: "marketing.referee_contact_reviewed", category: "COMPLIANCE", payload: { by: HAND_BY, reason: HAND_REASON, referee: "one", via: "ops" } },
    { action: "marketing.referee_key_added", category: "COMPLIANCE", payload: { by: HAND_BY, referee: "one", via: "ops" } },
  ],
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
  t.r1 = await db.agentRefereeKey.record([{ refereeKey: K.one }]);
  t.r2 = await db.agentRefereeKey.record([{ refereeKey: K.one }]);
  t.r3 = await db.agentRefereeKey.record([{ refereeKey: K.one }, { refereeKey: K.two }]);
  t.held = [await db.agentRefereeKey.holds(K.one), await db.agentRefereeKey.holds(K.two), await db.agentRefereeKey.holds(K.three)];
  const among = await db.agentRefereeKey.heldAmong([K.three, K.one, K.two, K.one]);
  const order = [K.one, K.two, K.three].sort();
  t.amongShape = [among.length === 3, among.map((e) => e.refereeKey).join() === order.join(), among.every((e) => Object.keys(e).sort().join() === "held,refereeKey")];
  const held = new Map(among.map((e) => [e.refereeKey, e.held] as const));
  t.amongHeld = [held.get(K.one) ?? "missing", held.get(K.two) ?? "missing", held.has(K.three) ? held.get(K.three) : "missing"];
  t.empty = (await db.agentRefereeKey.heldAmong([])).length;
  t.rawAskRefused = await refused(async () => db.agentRefereeKey.holds(N.one));
  t.rawWriteRefused = await refused(async () => db.agentRefereeKey.record([{ refereeKey: N.one }]));
  // ⛔ MAJOR-1 · a row carrying an instant beside its key is refused WHOLE, and nothing is written.
  t.instantWriteRefused = await refused(async () => db.agentRefereeKey.record([{ refereeKey: K.three, namedAt: T_EARLY } as unknown as { refereeKey: string }]));
  t.instantLeftNothing = (await db.agentRefereeKey.holds(K.three)) === false;
  const many = Array.from({ length: 2001 }, (_, i) => RX.refereeKeyOf(`2557${String(10000000 + i)}`));
  t.tooManyRefused = await refused(async () => db.agentRefereeKey.heldAmong(many));
  // ── MINOR-1 · the book's e-mail lookup, case-insensitive, key-only ──
  await db.marketingContact.create(bookRow(BOOK1, N.refC, REF_EMAIL));
  t.byEmail = await db.marketingContact.msisdnsByEmail(REF_EMAIL.toLowerCase());
  t.byBlankEmail = (await db.marketingContact.msisdnsByEmail("   ")).length;
  // ── the backfill end to end ──
  await db.user.create(user(U1, `+${N.applicant}`));
  await db.agentApplication.create(application(APP1, U1, `0${N.refA.slice(3, 6)} ${N.refA.slice(6, 9)} ${N.refA.slice(9)}`, `+255 ${N.refB.slice(3)}`));
  await db.agentApplication.create(application(APP2, U1, REF_EMAIL.toUpperCase(), "022 211 5811"));
  t.censusBefore = await RX.refereeKeyCensus();
  t.backfill = await RX.backfillRefereeKeys();
  const again = await RX.backfillRefereeKeys();
  t.again = { written: again.written, missing: again.missing };
  // ── the third pass's MINOR-2 · the referee's ADDRESS is keyed too, read case-insensitively; an unrelated one is not ──
  t.emailHeld = [
    await RX.isPromisedRefereeEmail(REF_EMAIL), await RX.isPromisedRefereeEmail(`  ${REF_EMAIL.toUpperCase()}  `),
    await RX.isPromisedRefereeEmail("somebody.else@example.com"),
  ];
  // ── MINOR-2's last part · the book row's ADDRESS at a number — the bulk read (one query) and the gate's single read ──
  t.bookEmails = await db.marketingContact.emailsAmong([N.stranger, N.refC]);
  t.bookHeld = [await RX.isPromisedRefereeBookAddress(N.refC), await RX.isPromisedRefereeBookAddress(N.stranger)];
  t.gate = [];
  for (const m of [N.refA, N.refB, N.refC, N.stranger]) {
    const v = await mayReceiveMarketingSms(m);
    (t.gate as string[]).push(v.ok ? "ALLOWED" : v.skipReason);
  }
  // ── 2b · MINOR-4 · the hand steps, on the real audit log ──
  const { getAuditForTargetsDurable } = await import("../../src/lib/server/audit.ts");
  const handCounts = (c: { unreadable: number; reviewed: number; missing: number; notMobile: number }) =>
    ({ unreadable: c.unreadable, reviewed: c.reviewed, missing: c.missing, notMobile: c.notMobile });
  const gateOf = async (m: string): Promise<string> => { const v = await mayReceiveMarketingSms(m); return v.ok ? "ALLOWED" : v.skipReason; };
  // A contact with a digit missing (no number the reader can key), and a landline beside it.
  await db.agentApplication.create(application(APP3, U1, `0${N.refD.slice(3, 6)} ${N.refD.slice(6, 9)} ${N.refD.slice(9, 11)}`, "022 211 5812"));
  t.handBefore = handCounts(await RX.refereeKeyCensus());
  t.handGateBefore = await gateOf(N.refD);
  t.handBadReason = await RX.recordRefereeContactReviewed({ applicationId: APP3, referee: "one", reason: "box 7", by: HAND_BY });
  t.handReviewed = await RX.recordRefereeContactReviewed({ applicationId: APP3, referee: "one", reason: HAND_REASON, by: HAND_BY });
  t.handAfterReview = handCounts(await RX.refereeKeyCensus());
  t.handKeyed = await RX.keyRefereeNumberByHand({ applicationId: APP3, referee: "one", typed: `+255 ${N.refD.slice(3)}`, again: `0${N.refD.slice(3)}`, by: HAND_BY });
  t.handGate = await gateOf(N.refD);
  const rows = (await getAuditForTargetsDurable({
    targetType: "AgentApplication", targetIds: [APP3], actions: [RX.REFEREE_CONTACT_REVIEWED_ACTION, RX.REFEREE_KEY_ADDED_ACTION],
    sinceIso: "1970-01-01T00:00:00.000Z",
  })).entries;
  t.handAudit = rows.map((r) => ({ action: r.action, category: r.category, payload: r.payload ?? null }))
    .sort((a, b) => (a.action < b.action ? -1 : a.action > b.action ? 1 : 0));
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
    const want = "refereeKey:text:-:NO";
    ok("0 · the migration is applied and finished, and the table is EXACTLY one column — refereeKey text, NOT NULL, the primary key — with NO instant and NO foreign key",
      applied.rowCount === 1 && shape === want && pk.rows.length === 1 && String(pk.rows[0].def) === 'PRIMARY KEY ("refereeKey")' && fks.rows[0].n === 0,
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
// ── 1b · what the table holds afterwards, read by SQL: the seven keys the scenario wrote (two by the DAL, four by the
//    backfill — three numbers and the e-mail referee's address — one by the hand step), every one thirty-two letters a–p — the refused raw-number write and the refused row with an instant left
//    nothing, and no digit is stored anywhere ──
{
  const client = new pg.Client({ connectionString: URL_RAW });
  await client.connect();
  try {
    const all = await client.query(`select count(*)::int as n from "AgentRefereeKey"`);
    const letters = await client.query(`select count(*)::int as n from "AgentRefereeKey" where "refereeKey" ~ '^[a-p]{32}$'`);
    ok("1b · the table holds exactly the seven keys written, every one thirty-two letters a–p — the refused writes left nothing",
      all.rows[0].n === 7 && letters.rows[0].n === 7, `rows ${all.rows[0].n} · letter keys ${letters.rows[0].n}`);
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
