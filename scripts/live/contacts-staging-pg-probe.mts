/**
 * U29 · STAGING ON A REAL POSTGRES — the redeploy half of the Accept, and the twin no laptop suite executes.
 *
 * ⭐ WHY THIS EXISTS. `test:contacts-staging` drives the staging service on the MEMORY twin, which cannot survive a
 * process restart and cannot race. The Accept's third leg — "a redeploy (a fresh process on real Postgres) resumes at
 * stagedThrough + 1 with totals equal to a recount" — and every compare-and-set's loser are only real on Postgres. So:
 *   0  the PARENT makes its own database on the scratch cluster and runs `prisma migrate deploy` into it from EMPTY —
 *      every migration, 20261002130000_contact_import_staging among them;
 *   A  process A seeds two officers, opens a 10,000-record run (three of them unreadable), stages 3 of its 5 batches,
 *      prints where it stopped, and EXITS — a closed tab, or a deploy taking the server down;
 *   B  a FRESH process B finds the run by the officer ALONE, checks it resumes at stagedThrough + 1 with totals equal to
 *      a recount over the keyset, re-packs the rest of the same file from there and finishes it; then, on Postgres:
 *      the same digest adopting, two calls racing one batch at the store (exactly one lands), a line already staged
 *      rolling the whole batch back, two transitions racing (one winner), the keyset across a deleted middle row, the
 *      idle sweep (a PAUSED commit untouched) and the purge, a held id refused; and the p50/p95 of a 2,000-row batch.
 * Every expectation is written HERE BY HAND — an oracle independent of either twin.
 *
 * Run (through the heavy-node lock: it applies every migration to an empty database and spawns two processes):
 *   npm run test:contacts-staging-db
 * `db-scratch` boots PostgreSQL 18.3 on a loopback port and exports VERIFY_DATABASE_URL; this file refuses any other
 * host, because it drops and creates a database. ⚠️ The Prisma client must be generated from this schema first
 * (`npx prisma generate`). Kept OUT of `predeploy`, on the `test:house-bot-migrations` precedent.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

process.exitCode = 1;
const PHASE = process.env.STAGING_PROBE_PHASE ?? "";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SELF = "scripts/live/contacts-staging-pg-probe.mts";
const DB_NAME = "contacts_staging_probe";
const OFFICER = "probe_officer_u29";
const ADMIN = "probe_admin_u29";
const T0 = Date.parse("2026-10-02T06:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
const DIGEST = "c".repeat(64);
const RACE_DIGEST = "d".repeat(64);
const HEADERS = ["Phone", "Name", "Email", "Tags", "Notes"];
const MAPPING = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
const TOTAL = 10_000;
const UNREADABLE_AT = new Set([17, 4_242, 9_001]);

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

type Record5 = { line: number; cells: string[] } | { line: number; readError: string };
/** The same file every time it is read: 10,000 records, three of them unreadable, numbers 0716 000 000 upward. */
function fileRows(): Record5[] {
  const out: Record5[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const line = i + 2;
    if (UNREADABLE_AT.has(i)) out.push({ line, readError: "This card is cut off before its end, so it was not read." });
    else out.push({ line, cells: [`0716${String(i).padStart(6, "0")}`, `Probe ${i}`, i % 10 === 0 ? `p${i}@example.com` : "", i % 7 === 0 ? "vip" : "", ""] });
  }
  return out;
}
const openBody = (o: Record<string, unknown> = {}) => ({
  format: "csv", fileName: "probe.csv", fileDigest: DIGEST, headers: HEADERS, mapping: MAPPING, totalRows: TOTAL,
  unreadable: UNREADABLE_AT.size, ...o,
});
const percentile = (xs: number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};

/* ═══ THE PARENT — a database of its own, every migration from EMPTY, then two fresh processes ═══════════════════ */

async function parent(): Promise<void> {
  const RAW = process.env.VERIFY_DATABASE_URL ?? "";
  if (!RAW) {
    console.error("NOT MEASURED — test:contacts-staging-db needs a scratch Postgres. Run it the way package.json does, which boots one.");
    process.exit(3);
  }
  let host = "";
  try { host = new URL(RAW).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("refusing: this probe drops and creates a database, and runs only against a loopback cluster.");
    process.exit(2);
  }
  const url = `${RAW.replace(/\/[^/?]*(\?.*)?$/, "")}/${DB_NAME}`;
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
  ok("0 · prisma migrate deploy applies EVERY migration to an EMPTY database — 20261002130000_contact_import_staging among them",
    migrate.status === 0, `exit ${migrate.status}`);
  if (migrate.status === 0) {
    const child = (phase: "A" | "B", extra: Record<string, string> = {}) => {
      const r = spawnSync("npx", ["tsx", SELF], {
        cwd: ROOT, encoding: "utf8", shell: process.platform === "win32", timeout: 30 * 60_000, maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, DATABASE_URL: url, USE_PRISMA_DAL: "true", STAGING_PROBE_PHASE: phase, ...extra },
      });
      process.stdout.write(r.stdout ?? "");
      process.stderr.write(r.stderr ?? "");
      const state = /^STATE (.+)$/m.exec(r.stdout ?? "");
      return { code: r.status ?? 1, state: state ? (JSON.parse(state[1]) as Record<string, unknown>) : null };
    };
    const a = child("A");
    ok("A · process A opened a run on Postgres, staged 3 of its 5 batches and EXITED — a closed tab, or a deploy taking the server down",
      a.code === 0 && typeof a.state?.importId === "string" && a.state?.stagedThrough === 6000, JSON.stringify(a.state));
    if (a.code === 0 && a.state) {
      const b = child("B", { STAGING_PROBE_RUN: String(a.state.importId), STAGING_PROBE_TIMINGS: JSON.stringify(a.state.timings ?? []) });
      ok("B · ⭐ a FRESH process — the redeploy — resumed the run from the officer alone at stagedThrough + 1 with totals equal to a recount, finished it, and every compare-and-set held on real Postgres",
        b.code === 0, `exit ${b.code}`);
    }
  }
  console.log(`\ncontacts-staging-pg-probe: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
}

/* ═══ THE CHILDREN — each a fresh process on the probe database ══════════════════════════════════════════════════ */

async function load() {
  if (!process.env.DATABASE_URL) throw new Error("a probe phase needs DATABASE_URL — the parent passes the probe database");
  const { db } = await import("../../src/lib/server/store.ts");
  const staging = await import("../../src/lib/server/contacts/import-staging.ts");
  const limits = await import("../../src/lib/contacts/import-limits.ts");
  const { auditFlush } = await import("../../src/lib/server/audit.ts");
  return { db, staging, limits, auditFlush };
}
type Loaded = Awaited<ReturnType<typeof load>>;

async function recountRows(L: Loaded, importId: string) {
  const out: Array<{ ordinal: number; line: number; readError: string | null; msisdn: string | null }> = [];
  let after = 0;
  for (;;) {
    const rows = await L.db.contactImportRow.after({ importId, afterOrdinal: after, limit: 2000 });
    if (rows.length === 0) return out;
    out.push(...rows);
    after = rows[rows.length - 1].ordinal;
  }
}

async function phaseA(): Promise<void> {
  const L = await load();
  for (const [id, phone, role] of [[OFFICER, "+255754990001", "GROWTH"], [ADMIN, "+255754990002", "ADMIN"]] as const) {
    await L.db.user.create({
      id, phoneE164: phone, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
      lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: null,
      acceptedTermsVersion: "v3", acceptedTermsAt: iso(T0 - DAY), marketingOptIn: false, twoFactorEnabled: true,
      avatarDataUrl: null, createdAt: iso(T0 - DAY), updatedAt: iso(T0 - DAY), lastLoginAt: null, closedAt: null,
    } as never);
  }
  const deps = { ...L.staging.IMPORT_STAGING_DEPS, now: () => new Date(T0) };
  const rows = fileRows();
  const batches = L.limits.packStageBatches(rows as never);
  ok("A.0 · CONTROL · the file packs into five batches of 2,000 (both caps hold)", batches.length === 5 && batches.every((b) => b.length === 2000),
    batches.map((b) => b.length).join(","));
  const opened = await L.staging.openContactImport(OFFICER, openBody(), deps);
  if (!opened.ok) {
    ok("A.1 · the run opens on Postgres", false, `${opened.reason}: ${opened.message}`);
    process.exit(1);
  }
  const run = await L.db.contactImport.find(opened.view.id);
  // ⚠️ JSONB keeps a mapping's VALUES but orders its KEYS its own way (by length, then bytes) — so it is compared as sorted
  // entries. Nothing in the product compares a mapping by its text (adoption asks the digest and the two counts).
  const canonMapping = (m: unknown): string => JSON.stringify(Object.entries((m ?? {}) as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  ok("A.1 · the run opens on Postgres: STAGING, both cursors 0, the lower-case format and U28's mapping round-tripped through the enum and JSONB (keys compared sorted)",
    opened.view.status === "STAGING" && run?.stagedThrough === 0 && run?.committedThrough === 0 && run?.format === "csv"
      && canonMapping(run?.mapping) === canonMapping(MAPPING) && run?.createdBy === OFFICER, JSON.stringify(run?.mapping));
  const timings: number[] = [];
  let from = 1;
  for (const batch of batches.slice(0, 3)) {
    const started = performance.now();
    const r = await L.staging.stageContactRows(OFFICER, { importId: opened.view.id, fileDigest: DIGEST, from, rows: batch }, deps);
    timings.push(Math.round(performance.now() - started));
    ok(`A.2 · the batch from ${from} lands on Postgres`, r.ok && r.view.stagedThrough === from - 1 + batch.length,
      r.ok ? `stagedThrough ${r.view.stagedThrough}` : `${r.reason}: ${r.message}`);
    from += batch.length;
  }
  console.log(`STATE ${JSON.stringify({ importId: opened.view.id, stagedThrough: from - 1, timings })}`);
  await L.auditFlush();
  process.exit(fail === 0 ? 0 : 1);
}

async function phaseB(): Promise<void> {
  const L = await load();
  const S = L.staging;
  const expected = process.env.STAGING_PROBE_RUN ?? "";
  const timings: number[] = JSON.parse(process.env.STAGING_PROBE_TIMINGS ?? "[]") as number[];
  const deps = { ...S.IMPORT_STAGING_DEPS, now: () => new Date(T0 + 60_000) };

  // ── B.1 · ⭐ THE RESUME READ, from the officer alone ──
  const back = await S.contactImportView(OFFICER, null, deps);
  const held = await recountRows(L, expected);
  ok("B.1 · ⭐ a FRESH process finds the run by the officer ALONE: the same id, STAGING at 6,000, nextFrom 6,001",
    back?.id === expected && back.status === "STAGING" && back.stagedThrough === 6000 && back.nextFrom === 6001,
    `${back?.id} ${back?.status} ${back?.stagedThrough} → ${back?.nextFrom}`);
  ok("B.2 · …and its totals are the server's recount of the rows on Postgres: 6,000 staged, the unreadable among them counted, none settled",
    !!back && back.totals.staged === held.length && held.length === 6000
      && back.totals.unreadable === held.filter((r) => r.readError !== null).length && back.totals.unreadable === 2 && back.totals.pending === 6000,
    JSON.stringify(back?.totals));

  // ── B.3 · resume: the SAME file read again, the staged prefix skipped, the rest packed from nextFrom ──
  const rows = fileRows();
  const nextFrom = back?.nextFrom ?? 0;
  let from = nextFrom;
  for (const batch of L.limits.packStageBatches(rows.slice(nextFrom - 1) as never)) {
    const started = performance.now();
    const r = await S.stageContactRows(OFFICER, { importId: expected, fileDigest: DIGEST, from, rows: batch }, deps);
    timings.push(Math.round(performance.now() - started));
    if (!r.ok) ok(`B.3 · the resumed batch from ${from} lands`, false, `${r.reason}: ${r.message}`);
    from += batch.length;
  }
  const done = await S.contactImportView(OFFICER, expected, deps);
  const all = await recountRows(L, expected);
  ok("B.3 · it finishes STAGED: 10,000 rows, every ordinal once and in file order, totals equal to the recount, three unreadable",
    done?.status === "STAGED" && done.totals.staged === TOTAL && all.length === TOTAL && all.every((r, k) => r.ordinal === k + 1 && r.line === k + 2)
      && done.totals.unreadable === 3 && all.filter((r) => r.readError !== null).length === 3,
    `${done?.status} · ${done?.totals.staged} / recount ${all.length}`);
  ok("B.3b · the keys were derived on the server: every readable row carries its 255 key, every unreadable one none",
    all.every((r, k) => (UNREADABLE_AT.has(k) ? r.msisdn === null : r.msisdn === `255716${String(k).padStart(6, "0")}`)));

  // ── B.4 · the same file opened again, from this fresh process, ADOPTS the run ──
  const again = await S.openContactImport(OFFICER, openBody(), deps);
  ok("B.4 · the same file opened again from the fresh process ADOPTS the run — nothing created",
    again.ok && again.adopted && again.view.id === expected && again.view.status === "STAGED", again.ok ? again.view.id : again.reason);

  // ── B.5 · ⭐ TWO CALLS RACE ONE BATCH AT THE STORE — the conditional update's loser counts 0 ──
  const race = await S.openContactImport(ADMIN, openBody({ fileDigest: RACE_DIGEST, totalRows: 4000, unreadable: 0 }), deps);
  if (!race.ok) {
    ok("B.5 · the race run opens", false, race.reason);
  } else {
    const at = iso(T0 + 120_000);
    const batch = Array.from({ length: 2000 }, (_, k) => ({
      importId: race.view.id, ordinal: k + 1, line: k + 2, rawPhone: `0717${String(k).padStart(6, "0")}`,
      msisdn: `255717${String(k).padStart(6, "0")}`, displayName: `Race ${k}`, email: null, tags: [], notes: null, problems: [],
      readError: null, outcome: null, outcomeReason: null, stagedAt: at,
    }));
    const [x, y] = await Promise.all([
      L.db.contactImport.stageRows({ importId: race.view.id, from: 1, rows: batch, completes: false, at }),
      L.db.contactImport.stageRows({ importId: race.view.id, from: 1, rows: batch, completes: false, at }),
    ]);
    const outcomes = [x, y].map((r) => (r.ok ? "ok" : r.reason)).sort().join(",");
    const raceRows = await recountRows(L, race.view.id);
    const raceRun = await L.db.contactImport.find(race.view.id);
    ok("B.5 · ⭐ two stageRows for one batch AT ONCE on Postgres: exactly one lands and the other is already_staged; 2,000 rows, the cursor at 2,000",
      outcomes === "already_staged,ok" && raceRows.length === 2000 && raceRun?.stagedThrough === 2000, `${outcomes} · ${raceRows.length} · ${raceRun?.stagedThrough}`);

    // ── B.6 · a line already staged rolls the WHOLE batch back, the cursor included ──
    const dup = await L.db.contactImport.stageRows({
      importId: race.view.id, from: 2001, completes: false, at,
      rows: [{ ...batch[0], ordinal: 2001, line: 9_001 }, { ...batch[1], ordinal: 2002, line: 2 }],
    });
    const afterDup = await L.db.contactImport.find(race.view.id);
    ok("B.6 · a batch carrying a line already staged is refused duplicate_line by the unique index, and rolls back whole: no row, the cursor still 2,000",
      !dup.ok && dup.reason === "duplicate_line" && afterDup?.stagedThrough === 2000 && (await recountRows(L, race.view.id)).length === 2000,
      dup.ok ? "LANDED" : dup.reason);

    // ── B.7 · the keyset across a deleted middle row ──
    const page1 = await L.db.contactImportRow.after({ importId: race.view.id, afterOrdinal: 0, limit: 2 });
    const gone = await L.db.contactImportRow.deleteByMsisdn("255717000001");
    const page2 = await L.db.contactImportRow.after({ importId: race.view.id, afterOrdinal: 2, limit: 2 });
    const totals = await L.db.contactImport.totals(race.view.id);
    ok("B.7 · after() is a keyset on Postgres: 1,2 · erasure deletes ordinal 2 · after(2) is 3,4 — and the groupBy counts 1,999",
      page1.map((r) => r.ordinal).join(",") === "1,2" && gone === 1 && page2.map((r) => r.ordinal).join(",") === "3,4" && totals.staged === 1999,
      `${page1.map((r) => r.ordinal)} | ${gone} | ${page2.map((r) => r.ordinal)} | ${totals.staged}`);
  }

  // ── B.8 · two transitions race on the finished run: one winner ──
  const [m1, m2] = await Promise.all([
    L.db.contactImport.transition({ importId: expected, from: ["STAGED"], to: "COMMITTING", by: OFFICER, at: iso(T0 + 180_000), updatedBefore: null }),
    L.db.contactImport.transition({ importId: expected, from: ["STAGED"], to: "COMMITTING", by: ADMIN, at: iso(T0 + 180_000), updatedBefore: null }),
  ]);
  ok("B.8 · two STAGED → COMMITTING transitions at once on Postgres: exactly one wins", [m1, m2].filter((r) => r !== null).length === 1,
    `${m1?.status ?? "null"} / ${m2?.status ?? "null"}`);

  // ── B.9 · the idle sweep (X29) and the purge, on Postgres, on a fixed clock ──
  const ago = (days: number) => iso(T0 - days * DAY);
  const runOf = (id: string, at: string) => ({
    id, status: "STAGING" as const, format: "csv" as const, fileName: null, fileDigest: DIGEST, mapping: MAPPING, totalRows: 2,
    unreadable: 0, stagedThrough: 0, committedThrough: 0, decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null,
    decisionConfirmedBy: null, consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null,
    consentBasisSetBy: null, consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: null, createdAt: at,
    createdBy: ADMIN, updatedAt: at,
  });
  const rowOf = (id: string, ordinal: number, at: string) => ({
    importId: id, ordinal, line: ordinal + 1, rawPhone: `0718${String(ordinal).padStart(6, "0")}`,
    msisdn: `255718${String(ordinal).padStart(6, "0")}`, displayName: `Sweep ${ordinal}`, email: null, tags: [], notes: null,
    problems: [], readError: null, outcome: null, outcomeReason: null, stagedAt: at,
  });
  const seed = async (id: string, at: string, n: 1 | 2, moves: Array<"COMMITTING" | "PAUSED" | "DONE">) => {
    await L.db.contactImport.create(runOf(id, at));
    await L.db.contactImport.stageRows({ importId: id, from: 1, rows: n === 2 ? [rowOf(id, 1, at), rowOf(id, 2, at)] : [rowOf(id, 1, at)], completes: n === 2, at });
    let from: "STAGING" | "STAGED" | "COMMITTING" | "PAUSED" | "DONE" = n === 2 ? "STAGED" : "STAGING";
    for (const to of moves) {
      await L.db.contactImport.transition({ importId: id, from: [from], to, by: ADMIN, at, updatedBefore: null });
      from = to;
    }
  };
  await seed("probe_sweep_staging", ago(20), 1, []);
  await seed("probe_sweep_staged", ago(20), 2, []);
  await seed("probe_sweep_paused", ago(20), 2, ["COMMITTING", "PAUSED"]);
  await seed("probe_sweep_done_old", ago(95), 2, ["COMMITTING", "DONE"]);
  await seed("probe_sweep_done_recent", ago(85), 2, ["COMMITTING", "DONE"]);
  const swept = await S.sweepStaleContactImports(T0 + 3_600_000, deps);
  const statusOf = async (id: string) => (await L.db.contactImport.find(id))?.status ?? "GONE";
  const rowsOf = async (id: string) => (await recountRows(L, id)).length;
  const states = [];
  for (const id of ["probe_sweep_staging", "probe_sweep_staged", "probe_sweep_paused", "probe_sweep_done_old", "probe_sweep_done_recent"]) {
    states.push(`${await statusOf(id)}:${await rowsOf(id)}`);
  }
  ok("B.9 · ⭐ the sweep on Postgres: the idle STAGING and STAGED runs CANCELLED with their rows deleted, the idle PAUSED commit UNTOUCHED, the run finished 95 days ago purged with its rows (the FK cascade), the one finished 85 days ago kept — and the live runs above untouched",
    swept.cancelled === 2 && swept.rowsDeleted === 3 && swept.runsPurged === 1
      && states.join(",") === "CANCELLED:0,CANCELLED:0,PAUSED:2,GONE:0,DONE:2" && (await statusOf(expected)) !== "CANCELLED",
    `${JSON.stringify(swept)} · ${states.join(",")}`);

  // ── B.10 · create never upserts: a held id is refused ──
  const twice = await L.db.contactImport.create(runOf("probe_sweep_paused", ago(1)));
  ok("B.10 · a held id is refused with null (P2002), never upserted — the PAUSED run is unchanged",
    twice === null && (await statusOf("probe_sweep_paused")) === "PAUSED");

  // ── B.timing · the 2,000-row batch, measured rather than assumed ──
  const p50 = percentile(timings, 0.5);
  const p95 = percentile(timings, 0.95);
  console.log(`TIMING · a 2,000-row stage call on PostgreSQL 18.3 (n = ${timings.length}): p50 ${p50} ms, p95 ${p95} ms`);
  ok("B.timing · every 2,000-row batch committed well inside the 15 s transaction timeout", timings.length >= 5 && Math.max(...timings) < 15_000,
    `${timings.join(", ")} ms`);

  await L.auditFlush();
  process.exit(fail === 0 ? 0 : 1);
}

if (PHASE === "A") await phaseA();
else if (PHASE === "B") await phaseB();
else await parent();
