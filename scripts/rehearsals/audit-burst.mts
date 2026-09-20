/**
 * S4 REHEARSAL 4 — THE AUDIT CHAIN UNDER A BURST (scenario register CRA-29).
 *
 *   npm run rehearse:audit-burst
 *
 * ⛔ WHAT IS BEING REHEARSED, AND WHY IT CANNOT BE REPAIRED AFTERWARDS. This platform's audit log is append-only in
 * the strongest sense the code can express: across all of `src/`, the only write is `auditLog.create` — there is no
 * `update`, no `delete`, no `updateMany`, no `deleteMany` and no raw UPDATE or DELETE against `"AuditLog"` anywhere
 * (§5 pins that, and a mutated copy of `audit.ts` proves the pin can see one). Every row is HMAC-chained to its
 * predecessor. That design is what makes the log evidence rather than a diary — and it is also why a burst that
 * loses a row or breaks a link is not a bug to be fixed later: there is no sanctioned code path that could put the
 * row back, and a hand-repaired chain is indistinguishable from a covered-up one. So the burst is rehearsed BEFORE
 * house bots are switched on, not diagnosed after.
 *
 * THE SCENARIO (01-scenario-register.md CRA-29, and 04-amendments.md §S4 drill 4):
 *   Trigger — 5 bots at `freqMaxPerDay` 200 add about 1,000 bets a day; the nightly backup runs `verifyChainFull`.
 *   Expected — each house bet writes ONLY the existing `market.position.opened` row, with `houseBotId` and
 *   `intentId` FIELDS (PLAN §3 H5–H9: "never a second row"); no per-intent, per-skip or per-alert rows;
 *   `verifyChainFull` reports 1 genesis, 0 dangling, 1 tail.
 *
 * ⛔ FIVE PROCESSES, NOT FIVE PROMISES. `audit()` serialises every write inside a process through one promise queue,
 * so a burst fired with `Promise.all` in one process has exactly one append in flight at a time and exercises none
 * of what CRA-29 is about: the `pg_advisory_xact_lock` that serialises the chain head across instances, the
 * DB-authoritative `selectHead`, the `@@unique([prevHash])` fork backstop and the P2002 retry are all CROSS-PROCESS
 * controls. This rehearsal spawns five real OS processes — one per bot, matching the scenario's "5 bots" — and then
 * MEASURES that they actually interleaved (§1 A2) instead of assuming it.
 *
 * ⛔ EVERY ASSERTION HAS A PLANTED CONTROL AND EVERY REFUSAL A POSITIVE CONTROL. Four of the controls are real
 * mutations of the scratch database — a row removed, the TAIL row removed, a payload tampered with, a fork
 * attempted — each restored afterwards and each followed by a green re-read, because "this is refused" assertions
 * on this branch have passed in a row while the feature underneath was broken. The source-pin control mutates a
 * COPY of `audit.ts` in a temp directory and PARSE-CHECKS it first: a mutation that does not compile is not a
 * caught defect.
 *
 * ⛔ IT NEVER TOUCHES ANYTHING BUT ITS OWN SCRATCH DATABASE. It refuses any host that is not loopback, creates
 * `hb_reh_audit_<pid>`, and drops only that.
 *
 * Exit: 0 all pass · 1 a failure · 2 refused (wrong target) · 3 NOT MEASURED (no local Postgres).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { GENESIS, hashMismatches, linkCounts, recomputeEntryHash, walkFromGenesis, type ChainRow } from "./lib/chain-independent.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = ""): boolean => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  return cond;
};
const section = (t: string) => console.log(`\n${t}`);
const nap = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How big the burst is, and why. See §1's header. */
const BETS = Number(process.env.REH_BETS ?? 200);
const WORKERS = Number(process.env.REH_WORKERS ?? 5);
const STAKE = 1_000;
const PER_WORKER = Math.floor(BETS / WORKERS);
/** ⛔ The chain's signing key must be the SAME in the parent and every worker, or the independent recompute in §4
 *  would read a healthy chain as forged. Fixed here and passed down explicitly rather than inherited by luck. */
const SECRET = "rehearsal-audit-chain-secret-do-not-use-anywhere-else";

// ═══ §5 · THE SOURCE PIN — runs first, because it needs no database ═════════════════════════════════════════
// (Printed first so that a NOT MEASURED exit below still leaves this measurement on the record.)
section("§5 · the append-only pin: across src/, the only AuditLog write is `create`");
{
  const FORBIDDEN = ["update", "updateMany", "upsert", "delete", "deleteMany"];
  const RAW_WRITE = /\b(UPDATE|DELETE)\s+(FROM\s+)?"AuditLog"/i;
  const CALL = /auditLog\s*\.\s*([A-Za-z]+)/g;

  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(p); }
      else if (/\.(ts|tsx|mts|mjs|js)$/.test(e.name)) files.push(p);
    }
  };
  walk(join(ROOT, "src"));

  /** The scanner, as a function, so the planted control can run the SAME code over a mutated file. */
  const scan = (code: string): { verbs: string[]; raw: boolean } => {
    const verbs: string[] = [];
    for (const m of code.matchAll(CALL)) verbs.push(m[1]);
    return { verbs, raw: RAW_WRITE.test(code) };
  };

  const hits: Array<{ file: string; verb: string }> = [];
  const rawHits: string[] = [];
  for (const f of files) {
    const code = readFileSync(f, "utf8");
    const r = scan(code);
    for (const v of r.verbs) hits.push({ file: relative(ROOT, f), verb: v });
    if (r.raw) rawHits.push(relative(ROOT, f));
  }
  const verbCount = hits.reduce<Record<string, number>>((a, h) => ({ ...a, [h.verb]: (a[h.verb] ?? 0) + 1 }), {});
  const violations = hits.filter((h) => FORBIDDEN.includes(h.verb));

  // ⭐ PRINT THE POPULATION. A sweep over zero files passes, and so does a sweep whose regex never matched.
  console.log(`     population: ${files.length} files under src/ · ${hits.length} \`auditLog.<verb>\` sites · verbs ${JSON.stringify(verbCount)}`);

  ok("5.1 · no forbidden AuditLog verb anywhere in src/ (update/updateMany/upsert/delete/deleteMany)",
    violations.length === 0, violations.map((v) => `${v.file}:${v.verb}`).join(", ") || "none");
  ok("5.2 · no raw UPDATE/DELETE against \"AuditLog\" in src/", rawHits.length === 0, rawHits.join(", ") || "none");

  // POSITIVE CONTROL — the scanner is not simply blind. The shapes that MUST still be allowed have to be FOUND.
  ok("5.3 · POSITIVE CONTROL · the same scan still finds the writes and reads that are ALLOWED (create ≥ 1, read verbs ≥ 3)",
    (verbCount.create ?? 0) >= 1 && ((verbCount.findMany ?? 0) + (verbCount.findFirst ?? 0) + (verbCount.count ?? 0)) >= 3,
    `create ${verbCount.create ?? 0} · findMany ${verbCount.findMany ?? 0} · count ${verbCount.count ?? 0}`);

  // PLANTED CONTROL — a shape the REAL code could contain, injected into a COPY of the real file.
  // ⛔ It must PARSE first. Four injections were once counted as caught when all they had produced was a syntax
  // error, which proves nothing about the scanner.
  const tmp = mkdtempSync(join(tmpdir(), "reh-audit-pin-"));
  try {
    const realPath = join(ROOT, "src", "lib", "server", "audit.ts");
    const real = readFileSync(realPath, "utf8");
    const INJECTION = [
      "",
      "/** retention sweep (INJECTED BY THE REHEARSAL'S PLANTED CONTROL — never committed) */",
      "export async function purgeOldAuditRows(cutoff: Date): Promise<number> {",
      "  const db = prisma();",
      "  if (!db) return 0;",
      "  const r = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });",
      "  return r.count;",
      "}",
      "",
    ].join("\n");
    const mutated = real + INJECTION;
    const mutatedPath = join(tmp, "audit.mutated.ts");
    writeFileSync(mutatedPath, mutated, "utf8");

    const tsMod: Any = await import("typescript");
    const ts: Any = tsMod.default ?? tsMod;
    const out = ts.transpileModule(mutated, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    const syntaxErrors = (out.diagnostics ?? []).filter((d: Any) => d.category === ts.DiagnosticCategory.Error);
    ok("5.4 · PLANTED CONTROL (a) · the injected `auditLog.deleteMany` retention sweep PARSES — it is a real shape, not a syntax error",
      syntaxErrors.length === 0, syntaxErrors.map((d: Any) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ") || "0 syntax diagnostics");

    const mres = scan(readFileSync(mutatedPath, "utf8"));
    const caught = mres.verbs.filter((v) => FORBIDDEN.includes(v));
    ok("5.5 · PLANTED CONTROL (b) · the SAME scanner flags it — the pin would go red on this shape",
      caught.length === 1 && caught[0] === "deleteMany", `caught ${JSON.stringify(caught)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ═══ PREFLIGHT · the target ═════════════════════════════════════════════════════════════════════════════════
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error(`\n!! NOT MEASURED — the burst needs a local Postgres. Run \`npm run rehearse:audit-burst\`, which boots one.`);
  console.log(`\naudit-burst: ${pass} passed, ${fail} failed — the BURST was NOT MEASURED`);
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this rehearsal creates and drops a database and runs only against a loopback cluster (saw ${host || "an unparseable URL"}).`);
  process.exit(2);
}
if (process.env.NODE_ENV === "production") { console.error("!! refusing to run with NODE_ENV=production."); process.exit(2); }

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_reh_audit_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
// ⚠️ Only ever this process's own database. Four lanes share this cluster; nothing else is dropped, ever.
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`\nscratch database: ${DB} (created by this run, dropped at the end)`);

let cli: pg.Client | null = null;
let prismaRef: Any = null;
try {
  // ── migrate ────────────────────────────────────────────────────────────────────────────────────────────
  const mig = await new Promise<number>((done) => {
    const c = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "ignore",
      shell: process.platform === "win32",
    });
    c.on("exit", (x) => done(x ?? 1));
    c.on("error", () => done(1));
  });
  if (!ok("0.migrate · prisma migrate deploy applies every migration to the scratch database", mig === 0, `exit ${mig}`)) {
    throw new Error("migrate failed");
  }

  // ⛔ IMPORT ORDER IS THE CONTRACT (house-bot-world.mts header): the stores bind to Postgres or memory when they
  // are FIRST imported, so the environment is set before anything is awaited.
  process.env.DATABASE_URL = URL_DB;
  process.env.USE_PRISMA_DAL = "true";
  process.env.AUDIT_CHAIN_SECRET = SECRET;

  const { loadWorld, OFFICER }: Any = await import("../lib/house-bot-world.mts");
  const w: Any = await loadWorld();
  const { verifyChainFull, audit, auditFlush }: Any = await import("../../src/lib/server/audit.ts");
  prismaRef = w.prisma();

  cli = new pg.Client({ connectionString: `${BASE}/${DB}` });
  await cli.connect();

  /** Read the whole chain, with `createdAt` rendered as the exact UTC ISO string the hash was taken over.
   *  ⚠️ `TIMESTAMP(3)` has no time zone, and node-postgres would parse it as LOCAL time — which would shift every
   *  recomputed hash by the machine's UTC offset and report a healthy chain as forged.
   *  🔴 AND THE ALIAS IS NOT `seq`. It was, on the first run of this rehearsal, and that is a trap worth leaving a
   *  sign on: in PostgreSQL an `ORDER BY <name>` resolves against the OUTPUT COLUMN first, so `seq::text AS seq`
   *  made `ORDER BY seq` sort LEXICOGRAPHICALLY — 1, 10, 11, 2, 20, 9. The baseline's "last" row was then seq 9 of
   *  10, a seeding row leaked into the burst window, and the "tail" the controls deleted was not the tail. Eleven
   *  assertions went red and every one of them was right to. */
  const readChain = async (): Promise<ChainRow[]> => {
    const { rows } = await cli!.query(
      `SELECT seq::text AS seq_text, id, category::text AS category, action, "actorId", "targetType", "targetId",
              payload, ip, "userAgent",
              to_char("createdAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
              "prevHash", "entryHash"
         FROM "AuditLog" ORDER BY seq ASC`);
    return (rows as Any[]).map((r) => ({ ...r, seq: r.seq_text })) as ChainRow[];
  };

  // ── SEED (before the baseline, so the burst window holds bet rows and nothing else) ──────────────────────
  section("§0 · the world, seeded before the baseline is taken");
  const t0seed = Date.now();
  await w.user({ id: OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  const bots: Array<{ botId: string; userId: string }> = [];
  for (let i = 0; i < WORKERS; i++) bots.push(await w.bot({ balance: 20_000_000 }));

  // One market per bet. A poll can hold only one OPENER intent (partial unique `(kind, anchorKey)`), so the burst
  // needs its own market per stake; they are created HERE, in the parent, so that `createMarket`'s own audit rows
  // are on the far side of the baseline and the burst window is nothing but bets.
  const markets: string[] = [];
  const CONC = 6;
  for (let i = 0; i < BETS; i += CONC) {
    const batch = await Promise.all(Array.from({ length: Math.min(CONC, BETS - i) }, () => w.poll({ graceMin: 0 })));
    for (const m of batch) markets.push(m.id);
  }
  await auditFlush();
  ok(`0.seed · ${WORKERS} bots and ${BETS} polls exist before the baseline`, bots.length === WORKERS && markets.length === BETS,
    `${bots.length} bots · ${markets.length} polls · ${((Date.now() - t0seed) / 1000).toFixed(1)} s`);

  const baseline = await readChain();
  const baseSeq = baseline.reduce((m, r) => (BigInt(r.seq as string) > m ? BigInt(r.seq as string) : m), BigInt(0));
  console.log(`     baseline: ${baseline.length} audit rows, max seq ${baseSeq}`);
  // ⛔ The burst window must hold bets and NOTHING ELSE, or every count in §2 is a count of the wrong population.
  ok("0.window · the seeding is entirely on the far side of the baseline — no bet row in it, and its seq is contiguous",
    baseline.every((r) => r.action !== "market.position.opened") && BigInt(baseline.length) === baseSeq,
    `${baseline.length} rows, max seq ${baseSeq}, actions ${JSON.stringify([...new Set(baseline.map((r) => r.action))])}`);

  // ═══ §1 · THE BURST ═══════════════════════════════════════════════════════════════════════════════════════
  //
  // ⛔ WHY N = 200 AND W = 5, SAID OUT LOUD. CRA-29's trigger is "5 bots at freqMaxPerDay 200 add about 1,000 bets
  // a day", and §S4 drill 4 fixes the figure: "200 house bets add exactly 200 `market.position.opened` rows". So
  // the bot count is the scenario's own, and 200 is the scenario's own. 200/5 = 40 each, which also fits under the
  // per-bot `freqMaxPerHour`, whose CHECK constraint caps it at 60 — one bot physically cannot place 200 in an
  // hour, which is itself why the drill needs five.
  //
  // ⛔ AND WHY IT IS ENOUGH TO EXERCISE THE CONTENTION, MEASURED RATHER THAN CLAIMED: A2 below counts how many of
  // the 199 adjacent pairs in the chain were written by DIFFERENT processes. A burst that did not overlap scores
  // near zero and fails. "It places two bets" would score zero and would not be a burst.
  section(`§1 · the burst — ${BETS} house bets, ${WORKERS} OS processes, ${PER_WORKER} bets each`);
  const dbNow = async (): Promise<number> => {
    const { rows } = await cli!.query(`SELECT clock_timestamp() AS now`);
    return new Date(rows[0].now as Date).getTime();
  };
  const t0 = new Date((await dbNow()) + 6_000).toISOString();

  const runWorker = (index: number): Promise<Any> => new Promise((done) => {
    const job = {
      index, botId: bots[index].botId, userId: bots[index].userId,
      marketIds: markets.slice(index * PER_WORKER, (index + 1) * PER_WORKER),
      t0Iso: t0, stakeTzs: STAKE,
    };
    let out = "";
    const c = spawn("npx", ["tsx", "scripts/rehearsals/audit-burst-worker.mts"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: URL_DB, USE_PRISMA_DAL: "true", AUDIT_CHAIN_SECRET: SECRET, REH_JOB: JSON.stringify(job) },
      shell: process.platform === "win32",
    });
    c.stdout.on("data", (d) => { out += String(d); });
    c.stderr.on("data", (d) => process.stderr.write(String(d)));
    c.on("exit", () => {
      const m = /@@RESULT (\{.*\})/.exec(out);
      done(m ? JSON.parse(m[1]) : { error: `worker ${index} printed no result`, placed: [], refusals: {} });
    });
    c.on("error", (e) => done({ error: `worker ${index}: ${e.message}`, placed: [], refusals: {} }));
  });

  const tBurst = Date.now();
  const reports: Any[] = await Promise.all(Array.from({ length: WORKERS }, (_, i) => runWorker(i)));
  const burstMs = Date.now() - tBurst;

  const placedAll: Array<{ marketId: string; intentId: string; positionId: string; atMs: number }> = reports.flatMap((r) => r.placed ?? []);
  const errors = reports.filter((r) => r.error).map((r) => r.error);
  const retries = reports.reduce((n, r) => n + Object.entries(r.refusals ?? {}).reduce((m, [, v]) => m + Number(v), 0), 0);

  // The rate that matters is over the window in which the workers were actually placing — not over `burstMs`,
  // which includes five `loadWorld()` start-ups and the barrier wait before T0.
  const spans = reports.filter((r) => r.startedAtMs && r.finishedAtMs).map((r) => [Number(r.startedAtMs), Number(r.finishedAtMs)] as const);
  const spanMs = spans.length ? Math.max(...spans.map((s) => s[1])) - Math.min(...spans.map((s) => s[0])) : 0;
  console.log(`     population: ${placedAll.length} bets placed by ${reports.length} processes · wall ${(burstMs / 1000).toFixed(1)} s ` +
    `· placing window ${(spanMs / 1000).toFixed(1)} s (${(placedAll.length / Math.max(spanMs / 1000, 0.001)).toFixed(1)} bets/s) · rolling-window retries ${retries}`);
  for (const r of reports) {
    console.log(`       worker ${r.index} pid ${r.worker}: placed ${(r.placed ?? []).length}/${r.asked} · refusals ${JSON.stringify(r.refusals ?? {})} · age calls ${r.ageCalls}`);
  }

  /** The aggregator, as a function, so the planted control can run the SAME code over a doctored report set. */
  const shortfall = (rs: Any[]): number => rs.reduce((n, r) => n + (Number(r.asked ?? 0) - (r.placed ?? []).length), 0);

  ok(`1.1 · every worker placed its full quota — ${BETS} bets, no unretryable refusal`,
    errors.length === 0 && shortfall(reports) === 0 && placedAll.length === BETS,
    errors.length ? errors.join(" | ") : `${placedAll.length}/${BETS} placed, shortfall ${shortfall(reports)}`);

  // PLANTED CONTROL — a shape the real thing could produce: one worker quietly places one bet fewer.
  {
    const doctored = reports.map((r, i) => (i === 0 ? { ...r, placed: (r.placed ?? []).slice(0, -1) } : r));
    ok("1.1.control · PLANTED · the same aggregator over a report set with one bet missing reports the shortfall",
      shortfall(doctored) === 1, `shortfall ${shortfall(doctored)} (expected 1)`);
  }

  // ⛔ EVERY WORKER MUST HAVE DRAINED ITS AUDIT QUEUE BEFORE EXITING. The bet's audit row is written with an
  // un-awaited `audit({…})` (market-service.ts:1699), so a worker that exits on the last bet's return takes that
  // append with it — measured on this rehearsal's first run: 10 bets, 8 rows, one lost per process. If a worker
  // ever reports without this flag, §2 and §3 below are counting a teardown artefact and must not be read as a
  // statement about the product.
  ok("1.3 · every worker drained its audit queue before exiting (the bet's audit row is not awaited by the seam)",
    reports.every((r) => r.flushed === true), `${reports.filter((r: Any) => r.flushed).length}/${reports.length} flushed`);

  const burstAll = await readChain();
  const burst = burstAll.filter((r) => BigInt(r.seq as string) > baseSeq);

  // A2 · WAS IT ACTUALLY A BURST? Adjacent rows in chain order written by different bots = the processes really
  // interleaved inside the chain's advisory lock.
  const botOf = (r: ChainRow): string => String((r.payload as Any)?.houseBotId ?? "");
  const adjacency = (rows: ChainRow[]): number => {
    let n = 0;
    for (let i = 1; i < rows.length; i++) if (botOf(rows[i]) !== botOf(rows[i - 1])) n++;
    return n;
  };
  const interleaved = adjacency(burst);
  const distinctBots = new Set(burst.map(botOf)).size;
  // Maximum number of worker processes whose [start, finish] windows overlapped at one instant.
  const edges = spans.flatMap(([a, b]) => [a, b]);
  const maxConcurrent = edges.reduce((best, t) => Math.max(best, spans.filter(([a, b]) => a <= t && t <= b).length), 0);
  const FLOOR = Math.floor((BETS - 1) * 0.25);
  console.log(`     contention: ${interleaved}/${burst.length - 1} adjacent chain pairs written by different processes · ` +
    `${distinctBots} distinct bots in the window · ${maxConcurrent}/${WORKERS} workers active at once`);
  ok(`1.2 · the burst genuinely contended: ≥ ${FLOOR} adjacent chain pairs from different processes, all ${WORKERS} bots present, ≥ ${WORKERS - 1} workers live at once`,
    interleaved >= FLOOR && distinctBots === WORKERS && maxConcurrent >= WORKERS - 1,
    `interleaved ${interleaved} (floor ${FLOOR}) · bots ${distinctBots} · concurrent ${maxConcurrent}`);

  // PLANTED CONTROL — the shape of a burst that was not a burst: each process's rows in one unbroken run.
  {
    const serial = [...burst].sort((a, b) => (botOf(a) < botOf(b) ? -1 : botOf(a) > botOf(b) ? 1 : 0));
    ok(`1.2.control · PLANTED · the same counter over a SERIALISED ordering scores ${WORKERS - 1} and fails the floor`,
      adjacency(serial) === WORKERS - 1 && adjacency(serial) < FLOOR, `serialised score ${adjacency(serial)} vs floor ${FLOOR}`);
  }

  // ═══ §2 · ONE ROW PER BET, AND NOTHING ELSE ═══════════════════════════════════════════════════════════════
  section("§2 · CRA-29 · one audit row per house bet, fields not rows (PLAN §3 H5–H9)");
  const histogram = (rows: ChainRow[]): Record<string, number> =>
    rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.action]: (a[r.action] ?? 0) + 1 }), {});
  const hist = histogram(burst);
  console.log(`     population: ${burst.length} new audit rows in the burst window · actions ${JSON.stringify(hist)}`);
  const onlyOpened = (h: Record<string, number>): boolean => Object.keys(h).length === 1 && h["market.position.opened"] === BETS;
  ok(`2.1 · the burst window holds exactly ${BETS} audit rows and every one is \`market.position.opened\``,
    burst.length === BETS && onlyOpened(hist), JSON.stringify(hist));

  // PLANTED CONTROL — the shape CRA-29 forbids: a second, per-intent row alongside the bet's own.
  {
    const withExtra = { ...hist, "house_bot.intent_skipped": 1 };
    ok("2.1.control · PLANTED · one extra per-intent row makes the same check red",
      !onlyOpened(withExtra), `${JSON.stringify(withExtra)} → ${onlyOpened(withExtra) ? "still accepted" : "rejected"}`);
  }

  const { rows: posRows } = await cli.query(
    `SELECT id, "houseBotId" FROM "Position" WHERE id = ANY($1::text[])`, [placedAll.map((p) => p.positionId)]);
  const posBot = new Map(posRows.map((r: Any) => [r.id as string, r.houseBotId as string | null]));
  const fieldCheck = (rows: ChainRow[]): string[] =>
    rows.filter((r) => {
      const p = (r.payload ?? {}) as Any;
      return !p.houseBotId || !p.intentId || posBot.get(String(r.targetId)) !== p.houseBotId;
    }).map((r) => r.id);
  const badFields = fieldCheck(burst);
  ok("2.2 · every row carries `houseBotId` and `intentId` as FIELDS, and the marker matches the Position row",
    badFields.length === 0, badFields.slice(0, 5).join(", ") || `all ${burst.length} rows carry both, markers agree`);

  // PLANTED CONTROL — a marker that silently failed to reach the audit payload.
  {
    const doctored = burst.map((r, i) => (i === 7 ? { ...r, payload: { ...(r.payload as Any), houseBotId: null } } : r));
    ok("2.2.control · PLANTED · one row with a null `houseBotId` is named by the same check",
      fieldCheck(doctored).length === 1, `${fieldCheck(doctored).length} named`);
  }

  // ═══ §3 · NOTHING LOST UNDER CONCURRENCY ══════════════════════════════════════════════════════════════════
  section("§3 · nothing lost: every bet the workers placed has its row, and no row has no bet");
  const placedIntents = new Set(placedAll.map((p) => p.intentId));
  const placedPositions = new Set(placedAll.map((p) => p.positionId));
  const missingFrom = (rows: ChainRow[]): { missingIntents: string[]; missingPositions: string[]; extra: number } => {
    const seenIntents = new Set(rows.map((r) => String((r.payload as Any)?.intentId)));
    const seenPositions = new Set(rows.map((r) => String(r.targetId)));
    return {
      missingIntents: [...placedIntents].filter((i) => !seenIntents.has(i)),
      missingPositions: [...placedPositions].filter((p) => !seenPositions.has(p)),
      extra: [...seenIntents].filter((i) => !placedIntents.has(i)).length,
    };
  };
  const m0 = missingFrom(burst);
  console.log(`     population: ${placedIntents.size} distinct intents, ${placedPositions.size} distinct positions placed`);
  ok(`3.1 · the ${BETS} intent ids and ${BETS} position ids in the chain are EXACTLY the ones the workers placed`,
    m0.missingIntents.length === 0 && m0.missingPositions.length === 0 && m0.extra === 0
      && placedIntents.size === BETS && placedPositions.size === BETS,
    `missing intents ${m0.missingIntents.length} · missing positions ${m0.missingPositions.length} · unaccounted rows ${m0.extra}`);

  // ═══ §4 · THE CHAIN ═══════════════════════════════════════════════════════════════════════════════════════
  section("§4 · the chain: the platform's own verdict, and an independent one taken a different way");
  const vc = await verifyChainFull();
  console.log(`     verifyChainFull: ${JSON.stringify({ valid: vc.valid, linkBroken: vc.linkBroken, total: vc.total, verified: vc.verified, unverifiable: vc.unverifiable })}`);
  ok("4.1 · verifyChainFull reports the chain valid and the LINKS unbroken over the whole table",
    vc.valid === true && vc.linkBroken === false && vc.total === burstAll.length,
    `valid ${vc.valid} · linkBroken ${vc.linkBroken} · total ${vc.total} vs ${burstAll.length} rows`);

  const lc0 = linkCounts(burstAll);
  console.log(`     independent link counts: ${JSON.stringify(lc0)}`);
  ok("4.2 · independently: exactly 1 GENESIS root, 0 dangling predecessors, exactly 1 tail",
    lc0.genesisRows === 1 && lc0.dangling === 0 && lc0.unreferenced === 1, JSON.stringify(lc0));

  const walk0 = walkFromGenesis(burstAll);
  ok("4.3 · a walk from GENESIS reaches EVERY row exactly once and ends on the one tail (the check verifyChainFull deliberately does not make)",
    walk0.order.length === burstAll.length && walk0.unreached.length === 0 && walk0.revisited === 0,
    `reached ${walk0.order.length}/${burstAll.length} · unreached ${walk0.unreached.length} · revisits ${walk0.revisited}`);

  const mism0 = hashMismatches(burstAll, SECRET);
  ok("4.4 · every stored entryHash recomputes under an INDEPENDENT HMAC of the canonical row — end to end, all rows",
    mism0.length === 0, mism0.length ? `${mism0.length} rows do not recompute, first ${mism0[0].id} (${mism0[0].action})` : `${burstAll.length} rows recompute`);

  const burstMism = hashMismatches(burst, SECRET);
  ok(`4.5 · and specifically all ${BETS} burst rows recompute — the links written under contention are valid`,
    burstMism.length === 0, `${burst.length - burstMism.length}/${burst.length} recompute`);

  // ═══ §6 · THE CONTROLS THAT MUTATE THE REAL CHAIN, EACH RESTORED ══════════════════════════════════════════
  //
  // ⛔ Everything above is a measurement that PASSED. None of it proves the instruments can FAIL. These four do,
  // on this database, and each is followed by a POSITIVE CONTROL — the same reading, green again after the repair.
  section("§6 · planted controls on the real chain (each mutation is restored, each restore re-read)");

  const cols = `id, category, action, "actorId", "targetType", "targetId", payload, ip, "userAgent", "createdAt", seq, "prevHash", "entryHash"`;
  const snapshot = async (id: string): Promise<Any> => (await cli!.query(`SELECT ${cols} FROM "AuditLog" WHERE id = $1`, [id])).rows[0];
  const restore = async (r: Any): Promise<void> => {
    await cli!.query(
      `INSERT INTO "AuditLog" (${cols}) VALUES ($1,$2::"AuditCategory",$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::bigint,$12,$13)`,
      [r.id, r.category, r.action, r.actorId, r.targetType, r.targetId, r.payload === null ? null : JSON.stringify(r.payload),
        r.ip, r.userAgent, r.createdAt, String(r.seq), r.prevHash, r.entryHash]);
  };

  // ── C-HOLE · the FAIL-OPEN hole. `audit()` catches a persist failure and keeps the entry in the ring only
  //    ("Fail open: a DB outage must never break the request path"), so a lost row leaves NO trace in the chain:
  //    nothing pointed at it, so there is no dangling link and still exactly one tail. This is the one loss the
  //    chain cannot see — and the reason §3 exists at all.
  {
    // ⛔ THE VICTIM IS THE WALK'S TAIL, NOT THE LAST ROW BY seq. They are the same for every append THIS code makes
    // (seq is assigned inside the same advisory lock that picks the predecessor), and 6.0 asserts that they are —
    // but the control is about the LINK structure, so it takes its victim from the links.
    const tail = walk0.tail!;
    ok("6.0 · the chain's tail by LINK is also the last row by seq — the two orders agree on this chain",
      tail.id === burstAll[burstAll.length - 1].id, `${tail.id} vs ${burstAll[burstAll.length - 1].id}`);
    const snap = await snapshot(tail.id);
    await cli.query(`DELETE FROM "AuditLog" WHERE id = $1`, [tail.id]);
    const after = await readChain();
    const vcHole = await verifyChainFull();
    const mHole = missingFrom(after.filter((r) => BigInt(r.seq as string) > baseSeq));
    ok("6.1 · PLANTED · a lost TAIL row (the fail-open shape) leaves verifyChainFull still reporting VALID — the chain cannot see it",
      vcHole.valid === true && vcHole.linkBroken === false && vcHole.total === burstAll.length - 1,
      `valid ${vcHole.valid} · linkBroken ${vcHole.linkBroken} · total ${vcHole.total}`);
    ok("6.2 · PLANTED · but §3's bet-to-row comparison NAMES the lost bet — which is why that assertion is not redundant",
      mHole.missingIntents.length + mHole.missingPositions.length > 0,
      `missing intents ${mHole.missingIntents.length} · missing positions ${mHole.missingPositions.length}`);
    await restore(snap);
    const backM = missingFrom((await readChain()).filter((r) => BigInt(r.seq as string) > baseSeq));
    const backV = await verifyChainFull();
    ok("6.3 · POSITIVE CONTROL · restored: the row is back, nothing is missing, and the chain verifies again",
      backM.missingIntents.length === 0 && backM.missingPositions.length === 0 && backV.valid === true && backV.total === burstAll.length,
      `total ${backV.total} · missing ${backM.missingIntents.length + backM.missingPositions.length}`);
  }

  // ── C-REMOVE · a row taken out of the MIDDLE. This one the chain does see: the row that followed it now points
  //    at an entryHash that no longer exists.
  {
    const mid = walk0.order[Math.floor(walk0.order.length / 2)];
    const snap = await snapshot(mid.id);
    await cli.query(`DELETE FROM "AuditLog" WHERE id = $1`, [mid.id]);
    const after = await readChain();
    const lc = linkCounts(after);
    const vcRm = await verifyChainFull();
    const walkRm = walkFromGenesis(after);
    ok("6.4 · PLANTED · a MIDDLE row removed → verifyChainFull reports linkBroken and says entries were REMOVED",
      vcRm.valid === false && vcRm.linkBroken === true && /REMOVED/i.test(String(vcRm.firstBreakAt)),
      `${JSON.stringify({ valid: vcRm.valid, linkBroken: vcRm.linkBroken, reason: vcRm.firstBreakAt })}`);
    ok("6.5 · PLANTED · and independently: 1 dangling predecessor, 2 tails, and the walk stops short of the table",
      lc.dangling === 1 && lc.unreferenced === 2 && walkRm.unreached.length > 0,
      `${JSON.stringify(lc)} · unreached ${walkRm.unreached.length}`);
    await restore(snap);
    const lcBack = linkCounts(await readChain());
    const vcBack = await verifyChainFull();
    ok("6.6 · POSITIVE CONTROL · restored: 1 genesis, 0 dangling, 1 tail, and verifyChainFull valid again",
      lcBack.dangling === 0 && lcBack.unreferenced === 1 && lcBack.genesisRows === 1 && vcBack.valid === true,
      JSON.stringify(lcBack));
  }

  // ── C-TAMPER · a payload edited in place. ⚠️ The honest expectation, not the flattering one: `verifyChainFull`
  //    counts a row that recomputes under NO known key as UNVERIFIABLE and keeps `valid: true`, on purpose — see
  //    its header on why a key rotation must not read as a forgery. The independent recompute is what names it.
  {
    const victim = burst[Math.floor(burst.length / 2)];
    const snap = await snapshot(victim.id);
    const tampered = { ...(victim.payload as Any), stake: Number((victim.payload as Any).stake ?? 0) + 1 };
    await cli.query(`UPDATE "AuditLog" SET payload = $1::jsonb WHERE id = $2`, [JSON.stringify(tampered), victim.id]);
    const after = await readChain();
    const mism = hashMismatches(after, SECRET);
    const vcT = await verifyChainFull();
    ok("6.7 · PLANTED · a stake edited in place → the independent HMAC names EXACTLY that row",
      mism.length === 1 && mism[0].id === victim.id, `${mism.length} mismatch(es)${mism[0] ? `, ${mism[0].id}` : ""}`);
    ok("6.8 · PLANTED · and verifyChainFull counts it UNVERIFIABLE while the LINKS stay intact — the documented behaviour, not a wished one",
      vcT.unverifiable === 1 && vcT.linkBroken === false,
      `unverifiable ${vcT.unverifiable} · verified ${vcT.verified} · linkBroken ${vcT.linkBroken}`);
    await cli.query(`UPDATE "AuditLog" SET payload = $1::jsonb WHERE id = $2`, [JSON.stringify(snap.payload), victim.id]);
    const backMism = hashMismatches(await readChain(), SECRET);
    const vcTBack = await verifyChainFull();
    ok("6.9 · POSITIVE CONTROL · restored: 0 mismatches and verifyChainFull reports 0 unverifiable",
      backMism.length === 0 && vcTBack.unverifiable === 0, `mismatches ${backMism.length} · unverifiable ${vcTBack.unverifiable}`);
  }

  // ── C-FORK · a REFUSAL, so it gets a positive control of its own. Two rows may never share a predecessor.
  {
    const victim = walk0.order[walk0.order.length - 2];
    let refused = "";
    try {
      await cli.query(
        `INSERT INTO "AuditLog" (id, category, action, "prevHash", "entryHash", "createdAt")
         VALUES ($1, 'SYSTEM', 'rehearsal.fork_attempt', $2, $3, now())`,
        [`aud_fork_${process.pid}`, victim.prevHash, `fork_${process.pid}`]);
    } catch (e) {
      refused = `${(e as Any).code}:${(e as Any).constraint ?? ""}`;
    }
    ok("6.10 · REFUSAL · a second row claiming an existing predecessor is refused by @@unique([prevHash]) — the chain cannot fork",
      refused.startsWith("23505"), refused || "THE INSERT WAS ACCEPTED");

    // POSITIVE CONTROL for that refusal — the thing that must still be ALLOWED: an ordinary append through
    // `audit()`, against the true tail, after every mutation above. A guard that swept in too much would refuse
    // this too, and all ten "is refused" lines above would still be green.
    const before = (await readChain()).length;
    await audit({ category: "SYSTEM", action: "rehearsal.positive_control", actorId: null, targetType: "Rehearsal", targetId: "audit-burst", payload: { note: "an ordinary append must still be allowed" } });
    await auditFlush();
    await nap(200);
    const afterRows = await readChain();
    const lcEnd = linkCounts(afterRows);
    const walkEnd = walkFromGenesis(afterRows);
    const mismEnd = hashMismatches(afterRows, SECRET);
    ok("6.11 · POSITIVE CONTROL · an ordinary `audit()` append is still ALLOWED, lands, and leaves the chain whole",
      afterRows.length === before + 1
        && afterRows[afterRows.length - 1].action === "rehearsal.positive_control"
        && lcEnd.genesisRows === 1 && lcEnd.dangling === 0 && lcEnd.unreferenced === 1
        && walkEnd.unreached.length === 0 && mismEnd.length === 0,
      `${before} → ${afterRows.length} rows · ${JSON.stringify(lcEnd)} · unreached ${walkEnd.unreached.length} · mismatches ${mismEnd.length}`);
    ok("6.12 · POSITIVE CONTROL · and the appended row links onto the tail the chain already had (prevHash = the old tail)",
      afterRows[afterRows.length - 1].prevHash === afterRows[afterRows.length - 2].entryHash
        && afterRows[afterRows.length - 1].prevHash !== GENESIS,
      `prevHash ${afterRows[afterRows.length - 1].prevHash.slice(0, 12)}…`);
  }
} finally {
  if (cli) await cli.end().catch(() => {});
  // Close Prisma's pool BEFORE the drop: `DROP DATABASE … WITH (FORCE)` terminates its backends, and the client
  // prints a page of FATAL 57P01 lines that read like a failure and are not one.
  if (prismaRef) await prismaRef.$disconnect().catch(() => {});
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  await drop.end();
  console.log(`\nscratch database ${DB} dropped. (Only this run's own database is ever touched.)`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — rehearsal 4 (audit burst, CRA-29): ${pass} passed, ${fail} failed`);
console.log(`@@SUMMARY ${JSON.stringify({ pass, fail })}`);
process.exit(fail === 0 ? 0 : 1);
