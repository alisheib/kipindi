/**
 * S17 — THE FRIDAY 18:00 RUSH (MB-31; MASWALI-PLAN §7b S7: "the Friday 18:00 rush at 10× the expected rate with Up & Down
 * running (cross-instance on real PostgreSQL, scripts/load)"). Written for the lead to run: it measures and records; the
 * latency targets are set from what it measures.
 *
 *   npm run load:maswali-rush                                         (boots the on-box Postgres through db-scratch)
 *   RUSH_TEST_REFERENCE_PER_MIN=40 RUSH_MINUTES=15 RUSH_INSTANCES=3 npm run load:maswali-rush
 *
 * WHAT IT DOES. One scratch database and RUSH_INSTANCES OS processes, each a container: its own Prisma pool (RUSH_POOL),
 * its own admission gate and in-process rate limits, and the week timer armed as a container's boot arms it — so the
 * close is stamped by whichever instance's tick wins, exactly as on two Railway replicas. A Millionea week opens and its
 * close is moved to RUSH_MINUTES (plus a boot margin) from the database's now (MB-28's move), so the rush meets the close
 * on the REAL clock, the one a purchase reads. The weekday is not what is measured; the close is.
 *   · Until the close the instances buy tickets as Poisson arrivals at RUSH_MULTIPLIER × RUSH_TEST_REFERENCE_PER_MIN purchases a
 *     minute between them (the minute before the close RUSH_LAST_MINUTE_FACTOR times denser), each purchase 1 to 10
 *     tickets of fifteen random answers on an account with room under the cap, a BUSY retried with the same key as the
 *     slip retries it (RUSH_RETRIES).
 *   · Up & Down runs throughout at its own rate (RUSH_UPDOWN_PER_MIN, not multiplied: the rush is Millionea's), as bets on
 *     an open round of a 60-minute chain. Its price feed is not part of this measurement; its bet path, its pool and its
 *     wallets are, on the same database, the same pools and the same admission gates.
 *   · For RUSH_AFTER_CLOSE_SEC after the close, purchases keep arriving (each must be refused as closed), and a sample of
 *     the purchases that landed in the last minute is retried with their own keys (each must be answered with its
 *     receipt — MB-31: "a retry after the close must return the receipt").
 *
 * WHAT IT RECORDS. Latency percentiles (p50 p90 p95 p99 max) of the purchases that landed, of the refusals and of the Up &
 * Down bets, overall and per instance; refusals by reason, before, at and after the close; the arrivals and what landed a
 * minute; the close's lag (the timer's start, and the stamp's audit row, against the close). Then the identities, judged
 * on every run: the commitment (count, sales and root from one set of live tickets), the pool three ways (the ledger's
 * POOL, the market, tickets × price), no ticket placed at or after the close on the database clock, no account above the
 * cap, every account's tickets and balance against what the instances were told, every after-close retry answered with
 * its receipt, the trial balance (no drifting wallet, no unbalanced group), every Millionea invariant, and Up & Down's pool
 * against its positions and its bettors' wallets.
 *
 * ⏱ TARGETS. Each latency target below is a named constant at TBD-BASELINE: S7's acceptance sets them from the baseline
 * the lead measures with this script, and records them beside their results (MASWALI-PLAN §7b S7). Until a constant is a
 * number its line prints the measurement and judges nothing.
 *
 * Knobs (environment): RUSH_TEST_REFERENCE_PER_MIN (30 — synthetic test reference, not measured production traffic),
 * RUSH_MULTIPLIER (10), RUSH_MINUTES (10), RUSH_LAST_MINUTE_FACTOR (3), RUSH_AFTER_CLOSE_SEC (60), RUSH_INSTANCES (2),
 * RUSH_POOL (20), RUSH_PLAYERS (sized from the rate), RUSH_UPDOWN_PER_MIN (300), RUSH_UPDOWN_PLAYERS (300),
 * RUSH_RETRIES (3), RUSH_RETRY_SAMPLE (50), RUSH_BOOT_MARGIN_SEC (120).
 * ⛔ Loopback clusters only: the database is created and dropped here. ⛔ A load test: run it detached under the
 *    heavy-node lock, alone, never in `test:all` or `predeploy` (scripts/load/README.md).
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { arrivalFloor, DEFAULT_RUSH, rushShape, rushTargetLabel } from "./s17-maswali-rush-target.mts";

// ⏱ THE TARGETS — TBD-BASELINE until the lead's measured baseline sets them (S7 acceptance). Lower is better for each.
type Target = number | "TBD-BASELINE";
/** A purchase that landed, from the first send to its answer (BUSY retries included), at the 95th percentile. */
const TARGET_PURCHASE_P95_MS: Target = "TBD-BASELINE";
/** …at the 99th percentile. */
const TARGET_PURCHASE_P99_MS: Target = "TBD-BASELINE";
/** A refusal, at the 95th percentile (a refusal is an answer too: a slow "closed" is a slip that hangs at 18:00). */
const TARGET_REFUSAL_P95_MS: Target = "TBD-BASELINE";
/** An Up & Down bet during the rush, at the 95th percentile. */
const TARGET_UPDOWN_P95_MS: Target = "TBD-BASELINE";
/** From the close to the close's audit row: how long the commitment waited behind the purchases in flight. */
const TARGET_CLOSE_STAMP_LAG_MS: Target = "TBD-BASELINE";
/** The share of purchases answered BUSY after every retry, in percent. */
const TARGET_BUSY_PERCENT: Target = "TBD-BASELINE";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKER = "scripts/load/s17-maswali-rush-worker.mts";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const num = (name: string, dflt: number): number => {
  const v = Number(process.env[name] ?? dflt);
  if (!Number.isFinite(v) || v < 0) { console.error(`!! ${name} must be a number of 0 or more (got ${process.env[name]}).`); process.exit(2); }
  return v;
};

const TEST_REFERENCE_PER_MIN = num("RUSH_TEST_REFERENCE_PER_MIN", DEFAULT_RUSH.testReferencePerMin);
const MULTIPLIER = num("RUSH_MULTIPLIER", DEFAULT_RUSH.multiplier);
const MINUTES = num("RUSH_MINUTES", DEFAULT_RUSH.minutes);
const LAST_MINUTE_FACTOR = num("RUSH_LAST_MINUTE_FACTOR", DEFAULT_RUSH.lastMinuteFactor);
const AFTER_CLOSE_SEC = num("RUSH_AFTER_CLOSE_SEC", DEFAULT_RUSH.afterCloseSec);
const INSTANCES = Math.round(num("RUSH_INSTANCES", 2));
const POOL = Math.round(num("RUSH_POOL", 20));
const UPDOWN_PER_MIN = num("RUSH_UPDOWN_PER_MIN", 300);
const UPDOWN_PLAYERS = Math.round(num("RUSH_UPDOWN_PLAYERS", 300));
const RETRIES = Math.round(num("RUSH_RETRIES", 3));
const RETRY_SAMPLE = Math.round(num("RUSH_RETRY_SAMPLE", 50));
const BOOT_MARGIN_SEC = num("RUSH_BOOT_MARGIN_SEC", 120);
const target = { testReferencePerMin: TEST_REFERENCE_PER_MIN, multiplier: MULTIPLIER, minutes: MINUTES, lastMinuteFactor: LAST_MINUTE_FACTOR, afterCloseSec: AFTER_CLOSE_SEC };
const { rate: RATE, plannedBefore: PLANNED_BEFORE, plannedAfter: PLANNED_AFTER } = rushShape(target);
/** Accounts enough that the cap is never what refuses (about three tickets a purchase, half the cap an account). */
const PLAYERS = Math.round(num("RUSH_PLAYERS", Math.max(200, Math.ceil(((PLANNED_BEFORE + PLANNED_AFTER) * 3) / 5))));
const PLAYER_BALANCE = 100_000, BETTOR_BALANCE = 1_000_000;
/** The stake of every Up & Down bet (the worker's `UD_STAKE`). */
const UD_STAKE = 1_000;
/** The edge of the close: a purchase sent within this of it may land or be refused, by the database clock against the instance's. */
const EDGE_MS = 2_000;
if (INSTANCES < 1 || POOL < 6 || MINUTES < 1 || TEST_REFERENCE_PER_MIN <= 0 || MULTIPLIER <= 0 || LAST_MINUTE_FACTOR <= 0
  || AFTER_CLOSE_SEC <= 0 || UPDOWN_PER_MIN <= 0 || UPDOWN_PLAYERS < Math.max(2, INSTANCES) || PLAYERS < INSTANCES) {
  console.error("!! the rush rates, multiplier, burst and after-close window must be positive; RUSH_INSTANCES ≥ 1, RUSH_POOL ≥ 6, RUSH_MINUTES ≥ 1, with accounts and Up & Down bettors for every instance.");
  process.exit(2);
}
// The Up & Down round takes bets for its first 48 minutes (a 60-minute chain closes its selections in the last 20%).
if (MINUTES + (BOOT_MARGIN_SEC + AFTER_CLOSE_SEC) / 60 > 40) { console.error("!! the run must fit 40 minutes: RUSH_MINUTES + the boot margin + the after-close window."); process.exit(2); }

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("!! NOT MEASURED — run `npm run load:maswali-rush`, which boots a local cluster."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: loopback clusters only."); process.exit(2); }
const noQuery = RAW.split("?")[0];
const BASE = noQuery.slice(0, noQuery.lastIndexOf("/"));
const DB = `mlw_s17_${process.pid}`;
const URL_ = `${BASE}/${DB}?connect_timeout=30`;
const ENV = { ...process.env, DATABASE_URL: URL_, USE_PRISMA_DAL: "true", HB_MONEY_STORE: "postgres" };

const killTree = (pid: number | undefined) => {
  if (!pid) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch { /* already gone */ }
};
const TMP = mkdtempSync(join(tmpdir(), "s17-"));
const STATE_FILE = join(TMP, "state.json");
let jobSeq = 0;

/** One worker: READY and the RESULT read from its output as it comes. */
function launch(job: Record<string, unknown>, extraEnv: Record<string, string>, timeoutMs: number) {
  const file = join(TMP, `job-${++jobSeq}.json`);
  writeFileSync(file, J({ stateFile: STATE_FILE, ...job }));
  const child = spawn("npx", ["tsx", WORKER], { cwd: ROOT, env: { ...ENV, ...extraEnv, RUSH_JOB: file }, shell: process.platform === "win32" });
  let text = "", buf = "", result: any = null;
  let readyFn: (v: boolean) => void = () => {};
  const ready = new Promise<boolean>((resolve) => { readyFn = resolve; });
  const onLine = (raw: string) => {
    const l = raw.trim();
    if (l.startsWith("@@READY")) readyFn(true);
    else if (l.startsWith("@@RESULT ")) { try { result = JSON.parse(l.slice("@@RESULT ".length)); } catch { result = null; } }
    else if (l.startsWith("…")) console.log(`   ${l}`);
  };
  child.stdout.on("data", (d) => {
    const s = String(d);
    text += s; buf += s;
    for (let i = buf.indexOf(NL); i >= 0; i = buf.indexOf(NL)) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
    if (text.length > 4_000_000) text = text.slice(-1_000_000);
  });
  child.stderr.on("data", (d) => { text += String(d); if (text.length > 4_000_000) text = text.slice(-1_000_000); });
  const timer = setTimeout(() => killTree(child.pid), timeoutMs);
  const done = new Promise<any>((resolve) => child.on("exit", (code) => {
    clearTimeout(timer);
    if (buf) onLine(buf);
    readyFn(false);
    if (!result || result.threw) console.error(`!! the ${String(job.role)} worker ${result?.threw ? "threw" : `ended (${code}) without a result`}:${NL}${String(result?.threw ?? text.slice(-3_000))}`);
    resolve(result ?? { ok: false, crashed: true, code });
  }));
  return { ready, done };
}

const pct = (xs: number[], q: number): number | null => {
  if (xs.length === 0) return null;
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))];
};
const dist = (xs: number[]) => ({ n: xs.length, p50: pct(xs, 0.5), p90: pct(xs, 0.9), p95: pct(xs, 0.95), p99: pct(xs, 0.99), max: xs.length ? xs.reduce((m, x) => (x > m ? x : m), xs[0]) : null });
const row = (label: string, d: ReturnType<typeof dist>) =>
  `  ${label.padEnd(34)} n ${String(d.n).padStart(6)}   p50 ${String(d.p50 ?? "—").padStart(6)}   p90 ${String(d.p90 ?? "—").padStart(6)}   p95 ${String(d.p95 ?? "—").padStart(6)}   p99 ${String(d.p99 ?? "—").padStart(6)}   max ${String(d.max ?? "—").padStart(6)}  ms`;
const tally = (xs: any[], key: (x: any) => string) => xs.reduce((m: Record<string, number>, x) => { const k = key(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
/** A target line: the measurement always; a verdict only once the target is a number. */
function judge(label: string, measured: number | null, target: Target): void {
  if (target === "TBD-BASELINE") { console.log(`TARGET ${label}: measured ${measured ?? "—"} — target TBD-BASELINE, not judged`); return; }
  ok(`TARGET ${label}: at most ${target}`, measured !== null && measured <= target, `measured ${measured ?? "—"}`);
}

console.log(`${NL}S17 — the Friday 18:00 rush on ${DB}: ${rushTargetLabel(target)}, `
  + `the last minute ×${LAST_MINUTE_FACTOR}, ${MINUTES} min to the close and ${AFTER_CLOSE_SEC} s after it, ${INSTANCES} instance(s) of pool ${POOL}, `
  + `Up & Down at ${UPDOWN_PER_MIN}/min`);
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
const maxConnections = Number((await admin.query("SHOW max_connections")).rows[0]?.max_connections ?? 0);
await admin.end();
try {
  ok("0.0 · the instances' pools fit the cluster (each instance's pool, plus room for the prep, the check and the cluster's own)",
    INSTANCES * POOL + 15 <= maxConnections, `${INSTANCES} × ${POOL} + 15 against max_connections ${maxConnections}`);
  if (INSTANCES * POOL + 15 > maxConnections) throw new Error("lower RUSH_POOL or RUSH_INSTANCES");
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: ENV, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000 });
  ok("0.1 · prisma migrate deploy applies every migration", mig.status === 0, (mig.stderr ?? "").split(NL).slice(-3).join(" "));
  if (mig.status !== 0) throw new Error("migrate failed");

  const prep = await launch({ role: "prep", guarantee: 10_000_000, players: PLAYERS, playerBalance: PLAYER_BALANCE, bettors: UPDOWN_PLAYERS,
    bettorBalance: BETTOR_BALANCE, closeInSec: MINUTES * 60 + BOOT_MARGIN_SEC }, { MASWALI_SCHEDULER: "false", PRISMA_CONNECTION_LIMIT: "10" }, 60 * 60_000).done;
  ok("0.2 · the accounts, an open Up & Down round and the week, its close brought to the run", prep?.ok === true, J(prep));
  if (!prep?.ok) throw new Error("the prep failed");
  const st = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  const closeMs = Date.parse(st.closesAt), price: number = st.price, cap: number = st.cap;
  const rushStartAt = closeMs - MINUTES * 60_000, endAt = closeMs + AFTER_CLOSE_SEC * 1_000;
  ok("0.3 · the instances have time to boot before the rush starts", rushStartAt - Date.now() > 20_000, `${Math.round((rushStartAt - Date.now()) / 1000)} s to the start — raise RUSH_BOOT_MARGIN_SEC if this is short`);

  // ── The rush ───────────────────────────────────────────────────────────────────────────────────────────────────
  const go = join(TMP, "go.json");
  const kids = Array.from({ length: INSTANCES }, (_, i) => launch({
    role: "instance", index: i, instances: INSTANCES, outFile: join(TMP, `out-${i}.json`), rushStartAt, endAt,
    perMin: RATE / INSTANCES, lastMinuteFactor: LAST_MINUTE_FACTOR, updownPerMin: UPDOWN_PER_MIN / INSTANCES, retries: RETRIES, retrySample: Math.ceil(RETRY_SAMPLE / INSTANCES),
  }, { RUSH_GO: go, PRISMA_CONNECTION_LIMIT: String(POOL), MASWALI_SCHEDULER: "true" }, (MINUTES * 60 + BOOT_MARGIN_SEC + AFTER_CLOSE_SEC + 15 * 60) * 1_000));
  const ready = await Promise.all(kids.map((k) => k.ready));
  ok("1.0 · every instance booted and reached the barrier", ready.every(Boolean), J(ready));
  writeFileSync(`${go}.tmp`, J({ at: Date.now() + 400 }));
  renameSync(`${go}.tmp`, go);
  console.log(`${NL}… the rush runs until ${new Date(endAt).toISOString()} (the close at ${st.closesAt})`);
  const results = await Promise.all(kids.map((k) => k.done));
  const outs: any[] = results.map((r, i) => {
    try { return JSON.parse(readFileSync(join(TMP, `out-${i}.json`), "utf8")); } catch { return { index: i, buys: [], bets: [], retries: [], missing: true, result: r }; }
  });
  ok("1.1 · every instance ran the rush to its end and reported", outs.every((o) => !o.missing) && results.every((r) => r?.ok === true), J(results));
  ok("1.2 · every instance started on time", outs.every((o) => (o.lateStartMs ?? 0) < 5_000), J(outs.map((o) => o.lateStartMs)));
  ok("1.3 · everything sent was answered before the instances reported", outs.every((o) => o.unanswered === 0), J(outs.map((o) => o.unanswered)));
  const noRoom = outs.reduce((s, o) => s + (o.noRoom ?? 0), 0);
  ok("1.4 · the cap was never what refused: every arrival found an account with room (RUSH_PLAYERS is large enough)", noRoom === 0, `${noRoom} arrival(s) found no account with room`);

  const check = await launch({ role: "check" }, { MASWALI_SCHEDULER: "false", PRISMA_CONNECTION_LIMIT: "10" }, 30 * 60_000).done;
  if (!check?.ok) throw new Error("the check failed");

  // ── What it recorded ───────────────────────────────────────────────────────────────────────────────────────────
  const buys: any[] = outs.flatMap((o) => o.buys ?? []), bets: any[] = outs.flatMap((o) => o.bets ?? []), retries: any[] = outs.flatMap((o) => o.retries ?? []);
  const phase = (b: any) => (b.toClose < -EDGE_MS ? "before" : b.toClose > EDGE_MS ? "after" : "edge");
  const landed = buys.filter((b) => b.ok), refused = buys.filter((b) => !b.ok);
  const preCloseSent = buys.filter((b) => b.at >= rushStartAt && b.at < closeMs).length;
  const lastMinuteSent = buys.filter((b) => b.at >= closeMs - 60_000 && b.at < closeMs).length;
  const updownSent = bets.filter((b) => b.at >= rushStartAt && b.at < closeMs).length;
  ok("1.5 · the planned Millionea load actually reached the purchase path before the close",
    preCloseSent >= arrivalFloor(PLANNED_BEFORE), `${preCloseSent} sent; ${Math.round(PLANNED_BEFORE)} planned; floor ${arrivalFloor(PLANNED_BEFORE)}`);
  ok("1.6 · the final-minute burst actually reached the purchase path",
    lastMinuteSent >= arrivalFloor(RATE * LAST_MINUTE_FACTOR), `${lastMinuteSent} sent; ${Math.round(RATE * LAST_MINUTE_FACTOR)} planned; floor ${arrivalFloor(RATE * LAST_MINUTE_FACTOR)}`);
  ok("1.7 · Up & Down ran on the same database throughout the pre-close rush",
    updownSent >= arrivalFloor(UPDOWN_PER_MIN * MINUTES), `${updownSent} sent; ${Math.round(UPDOWN_PER_MIN * MINUTES)} planned; floor ${arrivalFloor(UPDOWN_PER_MIN * MINUTES)}`);
  console.log(`${NL}LATENCY (ms) — every purchase from its first send to its answer, BUSY retries included`);
  console.log(row("Millionea · landed", dist(landed.map((b) => b.totalMs))));
  console.log(row("Millionea · refused", dist(refused.map((b) => b.totalMs))));
  console.log(row("Millionea · last minute, landed", dist(landed.filter((b) => b.toClose >= -60_000).map((b) => b.totalMs))));
  console.log(row("Up & Down · bets", dist(bets.map((b) => b.ms))));
  for (const o of outs) {
    console.log(row(`  instance ${o.index} · Millionea landed`, dist((o.buys ?? []).filter((b: any) => b.ok).map((b: any) => b.totalMs))));
    console.log(row(`  instance ${o.index} · Up & Down`, dist((o.bets ?? []).map((b: any) => b.ms))));
  }
  console.log(`${NL}REFUSALS BY REASON`);
  for (const p of ["before", "edge", "after"]) console.log(`  Millionea · ${p.padEnd(6)} the close: ${J(tally(refused.filter((b) => phase(b) === p), (b) => b.reason))}`);
  console.log(`  Up & Down:                    ${J(tally(bets.filter((b) => !b.ok), (b) => b.reason))}`);
  const minutes = Math.max(1, Math.ceil((endAt - rushStartAt) / 60_000));
  const perMinute: Array<{ minute: number; sent: number; landed: number }> = Array.from({ length: minutes }, (_, m) => ({ minute: m - MINUTES, sent: 0, landed: 0 }));
  for (const b of buys) {
    const m = Math.floor((b.at - rushStartAt) / 60_000);
    if (perMinute[m]) { perMinute[m].sent++; if (b.ok) perMinute[m].landed++; }
  }
  console.log(`${NL}THROUGHPUT — Millionea purchases a minute (minute 0 starts at the close; the plan is ${RATE}, ×${LAST_MINUTE_FACTOR} in minute −1)`);
  console.log(`  ${perMinute.map((p) => `${p.minute}: ${p.sent} sent / ${p.landed} landed`).join(" · ")}`);
  const closeAudit: string[] = check.closedAudit ?? [];
  const timerLagMs = check.week?.closedAt ? Date.parse(check.week.closedAt) - closeMs : null;
  const stampLagMs = closeAudit.length ? Date.parse(closeAudit[closeAudit.length - 1]) - closeMs : null;
  console.log(`${NL}THE CLOSE — the timer started the close ${timerLagMs ?? "—"} ms after it; the stamp's audit row followed ${stampLagMs ?? "—"} ms after it`);
  const busy = buys.filter((b) => !b.ok && (b.reason === "BUSY" || b.reason === "system_busy")).length;
  const busyPercent = buys.length ? Math.round((busy / buys.length) * 10_000) / 100 : 0;

  // ── The identities (judged on every run) ───────────────────────────────────────────────────────────────────────
  console.log(`${NL}THE IDENTITIES`);
  // Load may shed anywhere (BUSY moved nothing, the rate limit neither); the close refuses only at or after the close.
  const shed = new Set(["BUSY", "system_busy", "rate_limited"]);
  const odd = buys.filter((b) => !b.ok && !shed.has(b.reason) && (phase(b) === "before" || b.reason !== "millionea_sales_closed"));
  ok("2.1 · every refusal is one the rush can give: load shed (BUSY, the rate limit) anywhere, the close only at or after it",
    odd.length === 0, `${odd.length} other(s): ${J(tally(odd, (b) => `${phase(b)}:${b.reason}${b.error ? ` (${String(b.error).slice(0, 80)})` : ""}`))}`);
  ok("2.2 · ⭐ no purchase sent after the close landed (by more than the edge)", buys.filter((b) => b.ok && phase(b) === "after").length === 0,
    `${buys.filter((b) => b.ok && phase(b) === "after").length} landed after the close`);
  ok("2.3 · ⭐ no ticket was placed at or after the close, on the database clock (MB-31)", check.tickets?.atOrAfterClose === 0, `${check.tickets?.atOrAfterClose}`);
  ok("2.4 · ⭐ the week closed exactly once, by one instance's timer", check.week?.state === "CLOSED" && closeAudit.length === 1, J({ state: check.week?.state, closedAudit: closeAudit }));
  const reported = new Set(landed.flatMap((b) => b.tickets as string[]));
  ok("2.5 · ⭐ the commitment counts exactly what landed: the count, the sales and the root from one set of live tickets",
    check.tickets.live === reported.size && check.week.ticketCount === check.tickets.live && check.week.salesAtClose === check.tickets.live * price
      && check.week.ticketMerkleRoot === check.rootOfLive && (check.tickets.ids as string[]).every((id) => reported.has(id)),
    J({ live: check.tickets.live, reported: reported.size, ticketCount: check.week.ticketCount, salesAtClose: check.week.salesAtClose }));
  ok("2.6 · ⭐ the pool agrees three ways: the ledger's POOL, the market and the tickets × the price",
    check.pool.ledger === check.tickets.live * price && check.pool.market === check.tickets.live * price && check.pool.other === 0, J(check.pool));
  const overCap = Object.entries(check.liveByUser as Record<string, number>).filter(([, n]) => n > cap);
  ok("2.7 · no account holds more than the cap (MR-11)", overCap.length === 0, `${overCap.length} over ${cap}`);
  const landedByUser = new Map<string, number>();
  for (const b of landed) landedByUser.set(b.userId, (landedByUser.get(b.userId) ?? 0) + b.tickets.length);
  const disagree = (st.players as string[]).filter((u) => {
    const n = check.liveByUser[u] ?? 0;
    return n !== (landedByUser.get(u) ?? 0) || check.balanceOf[u] !== PLAYER_BALANCE - n * price;
  });
  ok("2.8 · ⭐ every account paid exactly for the tickets it was told it has: nothing moved without an answer, nothing twice",
    disagree.length === 0, `${disagree.length} account(s) disagree${disagree.length ? `: ${J(disagree.slice(0, 5).map((u) => ({ u, live: check.liveByUser[u] ?? 0, told: landedByUser.get(u) ?? 0, balance: check.balanceOf[u] })))}` : ""}`);
  ok("2.9 · ⭐ every retry after the close of a purchase that landed was answered with its receipt (MB-31)",
    (RETRY_SAMPLE === 0 || retries.length > 0) && retries.every((r) => r.ok === true && r.replayed === true && r.same === true),
    `${retries.filter((r) => r.ok && r.replayed && r.same).length} of ${retries.length}: ${J(tally(retries.filter((r) => !(r.ok && r.replayed && r.same)), (r) => `${r.reason ?? "answered"}`))}`);
  const udLanded = bets.filter((b) => b.ok).length;
  const udBettorsOff = (st.bettors as string[]).filter((u) => check.balanceOf[u] + (check.updown.stakesByUser[u] ?? 0) !== BETTOR_BALANCE);
  ok("2.10 · Up & Down kept its books while the rush ran: its pool is its positions' stakes, one per bet that landed, and every bettor's wallet plus stakes is what it started with",
    check.updown.pool === check.updown.stakes && check.updown.positions === udLanded && check.updown.stakes === udLanded * UD_STAKE && udBettorsOff.length === 0,
    J({ pool: check.updown.pool, stakes: check.updown.stakes, positions: check.updown.positions, landed: udLanded, bettorsOff: udBettorsOff.length }));
  ok("2.11 · ⭐ the trial balance reconciles: no drifting wallet, no unbalanced ledger group", check.trialBalance?.ok === true && check.trialBalance.drifting === 0
    && check.trialBalance.imbalanced === 0 && check.trialBalance.globalBalanced === true, J(check.trialBalance));
  ok("2.12 · ⭐ every Millionea invariant holds", check.invariants?.ok === true, J(check.invariants?.problems));

  // ── The targets (TBD-BASELINE until the baseline sets them) ────────────────────────────────────────────────────
  console.log(`${NL}THE TARGETS`);
  judge("purchase p95 (ms)", pct(landed.map((b) => b.totalMs), 0.95), TARGET_PURCHASE_P95_MS);
  judge("purchase p99 (ms)", pct(landed.map((b) => b.totalMs), 0.99), TARGET_PURCHASE_P99_MS);
  judge("refusal p95 (ms)", pct(refused.map((b) => b.totalMs), 0.95), TARGET_REFUSAL_P95_MS);
  judge("Up & Down p95 (ms)", pct(bets.map((b) => b.ms), 0.95), TARGET_UPDOWN_P95_MS);
  judge("close stamp lag (ms)", stampLagMs, TARGET_CLOSE_STAMP_LAG_MS);
  judge("BUSY after retries (%)", busyPercent, TARGET_BUSY_PERCENT);
  console.log(`${NL}RECORD — ${buys.length} purchases sent (${landed.length} landed, ${reported.size} tickets), ${bets.length} Up & Down bets (${udLanded} landed), `
    + `${retries.length} after-close retries; planned ${Math.round(PLANNED_BEFORE)} before the close and ${Math.round(PLANNED_AFTER)} after it`);
} catch (e) {
  ok("0.run · the rush completed", false, String((e as Error)?.message ?? e));
} finally {
  const drop = new pg.Client({ connectionString: RAW });
  try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
  catch (e) { console.error(`!! SCRATCH DATABASE NOT DROPPED — "${DB}" on ${BASE}: ${(e as Error).message}. Drop it by hand.`); }
  finally { try { await drop.end(); } catch { /* gone */ } }
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* the temp folder is not the measurement */ }
}
console.log(`${NL}${fail === 0 ? "ALL PASS" : "FAILURES"} — load:maswali-rush: ${pass} passed, ${fail} failed (the targets judged only where set)`);
process.exit(fail === 0 ? 0 : 1);
