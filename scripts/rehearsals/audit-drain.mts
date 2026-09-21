/**
 * THE SHUTDOWN DRAIN, PROVEN BY KILLING A REAL PROCESS.
 *
 * ⛔ WHAT WAS MEASURED BEFORE THIS EXISTED (`npm run rehearse:audit-loss-window`, 2026-09-21):
 * 10 bare `audit()` appends followed by production's own SIGTERM chain landed **0 of 10**. Next's
 * handler is registered first, finishes its cleanup about 30 ms in, and calls `process.exit(143)`
 * itself — so the platform's grace period bought nothing. `verifyChainFull()` returned
 * `{valid:true, linkBroken:false}` over a chain with 40 known-lost appends, because a lost append
 * consumes no sequence number. The table is append-only, so the hole is permanent.
 *
 * ⭐ WHAT THIS DRIVES. The same ordering, the same appends, the same real Postgres, the same real
 * `process.exit` — once WITHOUT the drain (the before number) and once WITH it (the after number),
 * then again with the budget deliberately too small to prove the bound is real and LOUD.
 *
 * ⛔ EVERY ASSERTION HAS A CONTROL:
 *   · §2 POSITIVE CONTROL — the un-drained run must LOSE rows. If it does not, this harness cannot
 *     see the defect and every "landed" number below would be meaningless.
 *   · §3 the drained run must land them all, and must have lived LONGER than the un-drained one.
 *   · §4 PLANTED CONTROL — a budget far too small must abandon rows AND print the loud block; a
 *     bound that is never exceeded is a bound that has never been shown to exist.
 *   · §5 PLANTED CONTROL — the chain verifier must react to one row tampered in place, otherwise
 *     its "valid" over the drained chain proves nothing.
 *
 * ⚠️ Lanes share the loopback cluster. This run creates ONE database named after its own pid and
 * drops only that one. The count is printed at open and at close.
 *
 * Run: npm run rehearse:audit-drain     (or set VERIFY_DATABASE_URL to a loopback cluster already up)
 */
import pg from "pg";
import { spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const ROOT = resolve(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const emitted: string[] = [];
function ok(label: string, cond: boolean, detail = ""): boolean {
  emitted.push(label);
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ""}`); }
  return cond;
}
const section = (t: string) => console.log(`\n${t}\n${"─".repeat(Math.min(96, t.length))}`);

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error("!! needs a local Postgres — run `npm run rehearse:audit-drain`, which boots one.");
  process.exit(3);
}
let host = "";
try { host = new globalThis.URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this rehearsal creates and drops a database and runs only against a loopback cluster (saw ${host || "an unparseable URL"}).`);
  process.exit(2);
}
if (process.env.NODE_ENV === "production") { console.error("!! refusing to run with NODE_ENV=production."); process.exit(2); }

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `audit_drain_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
const dbCountAtOpen = Number((await admin.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
console.log(`\n  scratch cluster database count at open: ${dbCountAtOpen}`);
// ⚠️ Only ever this process's own database. Lanes share this cluster; nothing else is dropped, ever.
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`  scratch database: ${DB} (created by this run, dropped at the end)`);

const OUT = mkdtempSync(join(tmpdir(), "rehearse-audit-drain-"));
const CHILD = join(import.meta.dirname, "audit-drain-child.mts");
type Run = { code: number; out: string; err: string; fired: Any; ms: number };

function child(args: string[], extraEnv: Record<string, string> = {}): Promise<Run> {
  return new Promise((done) => {
    // ⚠️ FILE descriptors, never pipes: on Windows `process.stdout` is ASYNCHRONOUS when it is a
    // pipe, so the drain's loud block — written immediately before the real exit — can be dropped.
    const stem = join(OUT, args.join("_").replace(/[^\w.-]/g, ""));
    const ofd = openSync(`${stem}.out`, "w"), efd = openSync(`${stem}.err`, "w");
    const t0 = Date.now();
    const c = spawn(process.execPath, [join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"), CHILD, ...args], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: URL_DB, NODE_ENV: "test", AUDIT_CHAIN_SECRET: "audit-drain-drill", ...extraEnv },
      stdio: ["ignore", ofd, efd],
    });
    const finish = (code: number) => {
      const ms = Date.now() - t0;
      try { closeSync(ofd); } catch { /* already closed */ }
      try { closeSync(efd); } catch { /* already closed */ }
      const out = readFileSync(`${stem}.out`, "utf8"), err = readFileSync(`${stem}.err`, "utf8");
      const l = out.split("\n").find((x) => x.startsWith("FIRED "));
      done({ code, out, err, ms, fired: l ? JSON.parse(l.slice(6)) : null });
    };
    c.on("close", (code) => finish(code ?? -1));
    c.on("error", () => finish(-1));
  });
}
/** Both streams. The drain's success line is `console.log` (stdout) and its loud block is
 *  `console.error` (stderr); an assertion that reads only one of them is reading half the evidence,
 *  which is exactly how this rehearsal's first run reported a drain that had in fact worked. */
const all = (r: Run) => `${r.out}\n${r.err}`;
const show = (r: Run) => all(r).split("\n").filter((l) => l.startsWith("[child") || l.startsWith("[audit-drain]")).map((l) => `         ${l}`).join("\n");
/** How long the child lived, stamped by the child from its own `exit` handler. ⛔ NOT the spawn's
 *  wall clock (tsx costs 400-600 ms of start-up that has nothing to do with the drain) and NOT the
 *  last `[child]` line either — the whole point is the time that passes AFTER the child's last line. */
const lived = (r: Run): number => {
  const l = r.out.split("\n").find((x) => x.startsWith("LIVED "));
  return l ? Number(JSON.parse(l.slice(6)).ms) : NaN;
};

let cli: pg.Client | null = null;
try {
  section("§1 · the schema — the real table, from the real migrations");
  const mig = await new Promise<number>((done) => {
    const c = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "ignore",
      shell: process.platform === "win32",
    });
    c.on("exit", (x) => done(x ?? 1));
    c.on("error", () => done(1));
  });
  if (!ok("1.1 · prisma migrate deploy applies every migration to the scratch database", mig === 0, `exit ${mig}`)) {
    throw new Error("migrate failed");
  }
  cli = new pg.Client({ connectionString: URL_DB });
  await cli.connect();
  const landed = async (tag: string): Promise<number> => Number((await cli!.query(
    `SELECT count(*)::int n FROM "AuditLog" WHERE "payload"->>'drill' = $1`, [tag])).rows[0].n);

  const N = 10;

  /* ═══ §2 · THE BEFORE NUMBER — the POSITIVE CONTROL ══════════════════════════════════════════ */
  section("§2 · BEFORE — production's shutdown with no drain (the POSITIVE CONTROL)");
  console.log(`  POPULATION: ${N} bare, un-awaited appends in the shape market-service.ts:1699 writes`);
  const before = await child(["no-drain", String(N), "before"]);
  const beforeLanded = await landed("before");
  console.log(show(before));
  ok("2.1 · the un-drained process exits 143 — Next's own handler, exactly as production has it",
    before.code === 143, `exit ${before.code}`);
  ok("2.c1 · POSITIVE CONTROL — it LOSES rows. If this ever passes with 0 lost, every 'landed' below is meaningless",
    beforeLanded < N,
    `landed ${beforeLanded} of ${N}`);
  console.log(`  ⭐ BEFORE: ${beforeLanded} of ${N} compliance rows landed — ${N - beforeLanded} lost, permanently.`);

  /* ═══ §3 · THE AFTER NUMBER ══════════════════════════════════════════════════════════════════ */
  section("§3 · AFTER — the same shutdown, with the drain installed where instrumentation.ts installs it");
  const after = await child(["drain", String(N), "after"]);
  const afterLanded = await landed("after");
  console.log(show(after));
  ok("3.1 · every queued compliance row landed before the process died",
    afterLanded === N, `landed ${afterLanded} of ${N}`);
  ok("3.2 · and the exit code a platform sees is still 143 — the deferral must not change what killed it",
    after.code === 143, `exit ${after.code}`);
  /* ⛔ THE DEFERRAL IS MEASURED INSIDE THE CHILD, not by comparing two spawns. The number that
   * matters is how long the process lived AFTER Next asked it to die, and both children stamp that
   * moment themselves. Comparing two whole lifetimes instead would be comparing two `tsx` start-ups
   * and two Prisma pool warm-ups, which is noise of the same order as the effect. */
  const cleanupAt = (r: Run) => Number(/\[child [^\]]*\] \+(\d+)ms Next cleanup finished/.exec(all(r))?.[1] ?? NaN);
  const heldFor = (r: Run) => lived(r) - cleanupAt(r);
  console.log(`  deferral: un-drained held the exit for ${heldFor(before)}ms, drained held it for ${heldFor(after)}ms`);
  ok("3.3 · the drain really HELD THE EXIT — the drained process lived on after process.exit(143) was called, and the un-drained one did not",
    heldFor(after) > heldFor(before) && heldFor(before) <= 20,
    `drained held ${heldFor(after)}ms (lived ${lived(after)}ms, exit called at +${cleanupAt(after)}ms); un-drained held ${heldFor(before)}ms`);
  ok("3.4 · and it said so, in one line, with the count and the cost",
    /\[audit-drain\] SIGTERM — audit queue drained before exit: \d+ append\(s\) in \d+ms/.test(all(after)),
    all(after).split("\n").filter((l) => l.startsWith("[audit-drain]")).join(" | "));
  const drainMs = Number(/drained before exit: \d+ append\(s\) in (\d+)ms/.exec(all(after))?.[1] ?? NaN);
  console.log(`  ⭐ AFTER: ${afterLanded} of ${N} landed. The drain cost ${drainMs}ms of the ${5000}ms budget.`);
  ok("3.5 · the real cost is a small fraction of the budget — the number chosen is not being scraped",
    Number.isFinite(drainMs) && drainMs < 5_000 / 2, `${drainMs}ms against a 5000ms budget`);

  /* ═══ §3b · THE BUDGET'S HEADROOM, AT A DEPTH WORTH BOUNDING ═════════════════════════════════ */
  section("§3b · the budget's headroom — the same drain at a burst depth, so 5,000ms is a measured choice");
  const BURST = 50;
  const burst = await child(["drain", String(BURST), "burst"]);
  const burstLanded = await landed("burst");
  console.log(show(burst));
  const burstMs = Number(/drained before exit: \d+ append\(s\) in (\d+)ms/.exec(all(burst))?.[1] ?? NaN);
  const perAppend = Number.isFinite(burstMs) ? burstMs / BURST : NaN;
  console.log(`  ⭐ BURST: ${burstLanded} of ${BURST} landed, drained in ${burstMs}ms — ${perAppend.toFixed(1)}ms per append on loopback.`);
  console.log(`     At that rate the 5,000ms budget covers ~${Math.floor(5_000 / perAppend)} queued appends;`);
  console.log(`     at a pessimistic 20ms per append against a networked Postgres it still covers ~250.`);
  ok("3b.1 · a 50-append burst — deeper than anything this platform has been observed to queue — drains completely",
    burstLanded === BURST && burst.code === 143, `landed ${burstLanded} of ${BURST}, exit ${burst.code}`);
  ok("3b.2 · and it uses under a fifth of the budget, so the number is chosen with room and not scraped",
    Number.isFinite(burstMs) && burstMs < 5_000 / 5, `${burstMs}ms against a 5000ms budget`);

  /* ═══ §4 · THE BOUND, DRIVEN ═════════════════════════════════════════════════════════════════ */
  section("§4 · the BOUND — a budget too small to finish must give up, exit anyway, and be LOUD");
  const tight = await child(["budget", String(N), "tight"], { AUDIT_DRAIN_BUDGET_MS: "1" });
  const tightLanded = await landed("tight");
  console.log(show(tight));
  ok("4.c1 · PLANTED CONTROL — with a 1ms budget the drain gives up and rows ARE lost, so §3 is measuring the drain and not a database that happens to be fast",
    tightLanded < N, `landed ${tightLanded} of ${N}`);
  ok("4.1 · the process still EXITS — a drain that could hang a deploy would be a worse defect than the one it fixes",
    tight.code === 143, `exit ${tight.code}`);
  ok("4.2 · and the give-up is LOUD, delimited, and names the number abandoned",
    /AUDIT DRAIN BUDGET EXCEEDED/.test(tight.err) && /ABANDONED:\s+\d+ append/.test(tight.err),
    tight.err.split("\n").filter((l) => /ABANDONED|EXCEEDED|waited/.test(l)).join(" | "));
  const abandoned = Number(/ABANDONED:\s+(\d+) append/.exec(tight.err)?.[1] ?? NaN);
  ok("4.3 · the abandoned COUNT matches the rows that are actually missing from the table — the loud block is a measurement, not a slogan",
    Number.isFinite(abandoned) && abandoned === N - tightLanded,
    `block says ${abandoned}, table is missing ${N - tightLanded}`);

  /* ═══ §5 · THE CHAIN IS STILL SOUND ══════════════════════════════════════════════════════════ */
  section("§5 · the chain — draining must not fork or break it, and the verifier must still bite");
  const ver = await child(["verify", "0", "verify"]);
  const v = (ver.out.split("\n").find((l) => l.startsWith("VERIFY ")) ?? "").slice(7);
  const parsed: Any = v ? JSON.parse(v) : null;
  console.log(`  ${JSON.stringify(parsed?.clean ?? null)}`);
  ok("5.1 · after two drained shutdowns the whole chain verifies, end to end",
    parsed?.clean?.valid === true && parsed?.clean?.linkBroken === false && parsed?.clean?.unverifiable === 0,
    JSON.stringify(parsed?.clean));
  ok("5.2 · and the sequence is contiguous over what exists",
    parsed?.seqContiguous === true);
  ok("5.c1 · PLANTED CONTROL — one row edited in place DOES move the verifier, so 5.1's 'valid' is a result and not a dead check",
    JSON.stringify(parsed?.tampered) !== JSON.stringify(parsed?.clean),
    JSON.stringify(parsed?.tampered));
  console.log("  ⚠️ NOTE, and it is the reason `audit-reconcile.ts` exists: §2 lost rows and this same");
  console.log("     verifier still reports the chain valid. A lost append consumes no sequence number,");
  console.log("     so the integrity check can never see a hole. The drain PREVENTS the loss; it does");
  console.log("     not make an already-lost row visible.");
} finally {
  if (cli) await cli.end().catch(() => {});
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  const dbCountAtClose = Number((await drop.query(`SELECT count(*)::int n FROM pg_database WHERE NOT datistemplate`)).rows[0].n);
  await drop.end();
  console.log(`\n  scratch cluster database count at close: ${dbCountAtClose} (was ${dbCountAtOpen} at open)`);
}

console.log(`\n${"─".repeat(78)}`);
console.log(`  audit-drain rehearsal: ${pass} passed, ${fail} failed, ${emitted.length} assertion(s) emitted`);
console.log(`  controls among them: ${emitted.filter((l) => /CONTROL/.test(l)).length}`);
console.log(`${"─".repeat(78)}`);
if (emitted.length === 0) { console.error("!! no assertion ran — a rehearsal over zero passes."); process.exit(3); }
process.exit(fail > 0 ? 1 : 0);
