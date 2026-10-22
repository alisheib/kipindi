/**
 * S16 — MILLIONEA ACROSS INSTANCES (MASWALI-BUILD S7; MASWALI-PLAN §7b S7: "two instances settling at once", "a 10,000-ticket
 * settlement"; MB-06, MB-31, MR-3, MR-11). The sibling of S10 (one wallet, two processes) and S12 (the leader lease), for
 * the same reason they exist: what one process cannot prove. Inside one process a lock that is a promise chain agrees
 * with itself; only two processes on one Postgres show that the advisory locks, the conditional writes and the in-lock
 * re-reads hold between two containers.
 *
 *   npm run load:maswali-cross-instance                 (boots the on-box Postgres through db-scratch)
 *   S16_WIDE_WINNERS=9000 npm run load:maswali-cross-instance     (the wide shape's distinct winning players)
 *   S16_SHAPES=held npm run load:maswali-cross-instance            (7,000 winning accounts suspended after purchase)
 *   S16_SHAPES=refused npm run load:maswali-cross-instance         (the same, its release refused after every hold — S7-F8)
 *   S16_SHAPES=none npm run load:maswali-cross-instance            (§1–§5, §6b, §6c and §7 only: minutes, not the 10,000s)
 *
 * Every act is two or three OS processes (`s16-maswali-worker.mts`), each its own Prisma pool, started at one instant by a
 * barrier, on ONE scratch database:
 *   §1 the cap (MR-11), one request key (L2) and one guarantee reference (R7), each sent by two instances at once;
 *   §2 the close against purchases in flight on two instances, with a second closer — the scheduler's tick — on a third;
 *   §3 two weeks released at once (MR-3: the later never settles on a carry the earlier has not committed), then one week
 *      released by two instances at once (exactly once);
 *   §4 a correction and the release on two instances whose clocks straddle the objection window's end: exactly one lands,
 *      and the winners are the record's;
 *   §5 a week void sent by two instances, one by `voidWeek` and one by the scheduler's tick: refunded once;
 *   §6 ⭐ 10,000 tickets settled inside the 30-second transaction budget, in the few- and wide-winner shapes; the optional
 *      all-held wide shape suspends the winners after purchase and reads back every freeze, ticket and audit count. Its
 *      holds take several sections of the chain lock (S7-F8): each section is a transaction, and EACH must close inside
 *      the budget — the release as a whole runs longer;
 *   §6b S7-F9 · RD.5 (MB-74): deposits reversed after their winners were paid — each reversal heard by two instances at
 *      once holds each share exactly once, nothing moving; then a reversal racing the release: held exactly once, by the
 *      release or by the reversal, never paid out free;
 *   §6c S6-MONEY · OD-13: a share owed to a winner whose account cannot sign in, paid by two Compliance officers on two
 *      instances at the same instant — paid once, to the shilling; then a payment racing Compliance's hold of the same share
 *      on another instance — the share leaves once or is held, never both paid and held free;
 *   §7 the identities over everything: the trial balance (no drifting wallet, no unbalanced group), every invariant.
 *
 *   ⭐ S7-F8 · the optional refused shape: the same 7,000 held winners, its release made to fail at its last statement so
 *      it lifts every hold again (the lifts measured: time, sections, wallets left frozen); then a second refused attempt
 *      whose process ends after S16_LIFT_STOP_AFTER lift sections, the heal finishing the rest, and the week settled once;
 * Knobs: S16_TICKETS (10000), S16_WIDE_WINNERS (7000), S16_SHAPES ("few,wide" | "few" | "wide" | "held" | "refused" |
 * "none"), S16_LIFT_STOP_AFTER (3; 0: no stop), S16_CLOSE_BUYERS (120), S16_CLOSE_DELAY_MS (1500: how long the closers wait
 * behind the buyers' stream), S16_JOB_TIMEOUT_MIN (60).
 * ⛔ Loopback clusters only: the database is created and dropped here. ⛔ A load harness: run it detached under the
 *    heavy-node lock, alone, never in `test:all` or `predeploy` (scripts/load/README.md).
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { heldWideProblems } from "./s16-maswali-held-verdict.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKER = "scripts/load/s16-maswali-worker.mts";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const num = (name: string, dflt: number): number => {
  const v = Number(process.env[name] ?? dflt);
  if (!Number.isSafeInteger(v) || v < 0) { console.error(`!! ${name} must be a whole number (got ${process.env[name]}).`); process.exit(2); }
  return v;
};

const TICKETS = num("S16_TICKETS", 10_000);
const WIDE = num("S16_WIDE_WINNERS", 7_000);
const FEW = 3;
/** S7-F9 · RD.5 (§6b): the winners of each reversal week. */
const RD_WIN = 3;
/** S6-MONEY · OD-13 (§6c): the self-excluded winners of the locked-share week. */
const LOCK_WIN = 2;
const CLOSE_BUYERS = num("S16_CLOSE_BUYERS", 120);
const CLOSE_DELAY_MS = num("S16_CLOSE_DELAY_MS", 1_500);
const JOB_TIMEOUT_MS = num("S16_JOB_TIMEOUT_MIN", 60) * 60_000;
const SHAPES = (process.env.S16_SHAPES ?? "few,wide").split(",").map((s) => s.trim()).filter(Boolean);
const wantFew = SHAPES.includes("few"), wantWide = SHAPES.includes("wide"), wantHeld = SHAPES.includes("held");
const wantRefused = SHAPES.includes("refused");
/** S7-F8 · the refused shape's second attempt ends its process after this many lift sections (0: no stop, no heal act). */
const LIFT_STOP_AFTER = num("S16_LIFT_STOP_AFTER", 3);
/** The release's whole transaction must fit the lock's own timeout (`src/lib/server/locks.ts`: `timeout: 30000`). */
const SETTLE_BUDGET_MS = 30_000;
/** What R9 recorded (MASWALI-PLAN §0, the S3 review's R9 row): about this many distinct winning players fit the budget. */
const R9_RECORDED_WINNERS = 7_000;
const BALANCE = 20_000;
if (WIDE > TICKETS || FEW > TICKETS || TICKETS < 20) { console.error("!! S16_TICKETS must be at least 20 and at least S16_WIDE_WINNERS."); process.exit(2); }

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("!! NOT MEASURED — run `npm run load:maswali-cross-instance`, which boots a local cluster."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: loopback clusters only."); process.exit(2); }
const noQuery = RAW.split("?")[0];
const BASE = noQuery.slice(0, noQuery.lastIndexOf("/"));
const DB = `mlw_s16_${process.pid}`;
const URL_ = `${BASE}/${DB}?connect_timeout=30`;
const ENV = {
  ...process.env, DATABASE_URL: URL_, USE_PRISMA_DAL: "true", HB_MONEY_STORE: "postgres",
  // Each worker is a small container: its own pool, its admission gate sized from it (pool − 4), and no week timer of
  // its own — the acts call the tick themselves, at the instant they name.
  PRISMA_CONNECTION_LIMIT: "12", MASWALI_SCHEDULER: "false",
};

const killTree = (pid: number | undefined) => {
  if (!pid) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch { /* already gone */ }
};

const TMP = mkdtempSync(join(tmpdir(), "s16-"));
const PLAYERS_FILE = join(TMP, "players.json");
let jobSeq = 0;
type Kid = { ready: Promise<boolean>; done: Promise<any>; kind: string };

/** One worker for one job: READY and the RESULT read from its output as it comes. */
function launch(job: Record<string, unknown>, go: string): Kid {
  const file = join(TMP, `job-${++jobSeq}.json`);
  writeFileSync(file, J({ playersFile: PLAYERS_FILE, ...job }));
  const child = spawn("npx", ["tsx", WORKER], { cwd: ROOT, env: { ...ENV, S16_JOB: file, S16_GO: go }, shell: process.platform === "win32" });
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
  });
  child.stderr.on("data", (d) => { text += String(d); });
  const timer = setTimeout(() => killTree(child.pid), Number(job.timeoutMs ?? JOB_TIMEOUT_MS));
  const done = new Promise<any>((resolve) => child.on("exit", (code) => {
    clearTimeout(timer);
    if (buf) onLine(buf);
    readyFn(false);
    if (!result || result.threw) {
      console.error(`!! the ${String(job.kind)} worker ${result?.threw ? "threw" : `ended (${code}) without a result`}:${NL}${String(result?.threw ?? text.slice(-3_000))}`);
    }
    resolve(result ?? { ok: false, crashed: true, code });
  }));
  return { ready, done, kind: String(job.kind) };
}

/** A job on its own, no barrier. */
const runJob = (job: Record<string, unknown>) => launch(job, "").done;

let goSeq = 0;
/** Two or three jobs at ONE instant: each loads, says READY, and all start together once every one of them has. */
async function race(jobs: Array<Record<string, unknown>>): Promise<any[]> {
  const go = join(TMP, `go-${++goSeq}.json`);
  const kids = jobs.map((j) => launch({ ...j, race: true }, go));
  const ready = await Promise.all(kids.map((k) => k.ready));
  if (!ready.every(Boolean)) console.error(`!! a worker of this act ended before the barrier; the others start alone, and the act is NOT RACED`);
  writeFileSync(`${go}.tmp`, J({ at: Date.now() + 400 }));
  renameSync(`${go}.tmp`, go);
  return Promise.all(kids.map((k) => k.done));
}

const tally = (rs: any[]) => rs.reduce((m: Record<string, number>, r) => { const k = String(r?.reason ?? "?"); m[k] = (m[k] ?? 0) + 1; return m; }, {});
type Figures = { k: number; J: number | null; F: number; tra: number; gbt: number; share: number | null; paid: number; U: number; carry: number };
const roll = (S: number): Figures => ({ k: 0, J: null, F: 0, tra: 0, gbt: 0, share: null, paid: 0, U: 0, carry: S });
const same = (a: Figures | undefined, b: Figures) => !!a && (Object.keys(b) as Array<keyof Figures>).every((k) => a[k] === b[k]);
/** §5b, re-derived here from the week's frozen rates — never imported from the module under test. */
function expect5b(R: number, S: number, k: number, f: { floor: number; rate: number; tra: number; gbt: number }): Figures {
  if (k === 0) return roll(S);
  const Jk = Math.max(f.floor, R + S), F = Math.round(f.rate * Jk), tra = Math.round(F * f.tra), gbt = Math.round(F * f.gbt);
  const share = Math.floor((Jk - F) / k), paid = k * share, U = Math.max(0, F + paid - (R + S));
  return { k, J: Jk, F, tra, gbt, share, paid, U, carry: R + S + U - F - paid };
}
const measured: string[] = [];

console.log(`${NL}S16 — Millionea across instances, on ${DB}`);
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: ENV, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000 });
  ok("0.1 · prisma migrate deploy applies every migration", mig.status === 0, (mig.stderr ?? "").split(NL).slice(-3).join(" "));
  if (mig.status !== 0) throw new Error("migrate failed");

  // ── §0 · the licence, the guarantee, and every account, made by ONE process ────────────────────────────────────
  const groups: Record<string, { count: number; balance: number }> = {
    cap: { count: 1, balance: 100_000 }, key: { count: 1, balance: 100_000 }, close: { count: CLOSE_BUYERS, balance: BALANCE },
    w2win: { count: 40, balance: BALANCE }, w2lose: { count: 16, balance: BALANCE },
    w3win: { count: 5, balance: BALANCE }, w3lose: { count: 15, balance: BALANCE }, w4: { count: 10, balance: BALANCE },
    // S7-F9 · RD.5 (§6b): the winners whose deposits are reversed after the payout, and the week's losers.
    rdA: { count: RD_WIN, balance: BALANCE }, rdB: { count: RD_WIN, balance: BALANCE }, rdLose: { count: 7, balance: BALANCE },
    // S6-MONEY · OD-13 (§6c): the winners who self-exclude after the payout, and the week's losers.
    lockWin: { count: LOCK_WIN, balance: BALANCE }, lockLose: { count: 10 - LOCK_WIN, balance: BALANCE },
    ...(wantFew ? { fewWin: { count: FEW, balance: BALANCE }, fewLose: { count: Math.ceil((TICKETS - FEW) / 10), balance: BALANCE } } : {}),
    ...(wantWide ? { wideWin: { count: WIDE, balance: BALANCE }, wideLose: { count: Math.ceil((TICKETS - WIDE) / 10), balance: BALANCE } } : {}),
    ...(wantHeld ? { heldWin: { count: WIDE, balance: BALANCE }, heldLose: { count: Math.ceil((TICKETS - WIDE) / 10), balance: BALANCE } } : {}),
    ...(wantRefused ? { refusedWin: { count: WIDE, balance: BALANCE }, refusedLose: { count: Math.ceil((TICKETS - WIDE) / 10), balance: BALANCE } } : {}),
  };
  const t0 = Date.now();
  const setup = await runJob({ kind: "setup", guarantee: 30_000_000, groups });
  ok("0.2 · the licence, the Owner's guarantee and every account, through their own doors", setup?.ok === true, `${setup?.accounts} accounts in ${Math.round((Date.now() - t0) / 1000)} s`);
  if (!setup?.ok) throw new Error("setup failed");
  const P: Record<string, string[]> = JSON.parse(readFileSync(PLAYERS_FILE, "utf8"));

  // ── §1 · one account, one key, one reference — each from two instances at once ─────────────────────────────────
  console.log(`${NL}§1 · the cap, a request key and a guarantee reference, each sent by two instances at once`);
  const w1 = await runJob({ kind: "open", weeksAhead: 2 });
  if (!w1?.ok) throw new Error("week 1 did not open");
  const price: number = w1.price, cap: number = w1.cap;
  const capUser = P.cap[0], keyUser = P.key[0];
  const capPlan = Array.from({ length: 6 }, () => ({ userId: capUser, n: 3, slip: "LOSE" }));
  const [ca, cb] = await race([{ kind: "buy", weekId: w1.weekId, plan: capPlan, concurrency: 6 }, { kind: "buy", weekId: w1.weekId, plan: capPlan, concurrency: 6 }]);
  const capResults: any[] = [...(ca?.results ?? []), ...(cb?.results ?? [])];
  const capLanded = capResults.filter((r) => r.ok), capRefused = capResults.filter((r) => !r.ok);
  ok("1.0 · the act can measure the cap: twelve purchases of three tickets ask for more than it", 12 * 3 > cap, `cap ${cap}`);
  ok("1.1 · ⭐ the cap holds across two instances: exactly as many purchases landed as fit under it (MR-11)",
    capResults.length === 12 && capLanded.length === Math.floor(cap / 3), `${capLanded.length} of 12 landed; ${Math.floor(cap / 3)} fit under ${cap}`);
  ok("1.2 · …and every other attempt was refused as the cap", capRefused.length === 12 - capLanded.length && capRefused.every((r) => r.reason === "millionea_cap_reached"), J(tally(capRefused)));

  const KEY = `s16-key-${process.pid}`;
  const keyPlan = [{ userId: keyUser, n: 2, slip: "LOSE", key: KEY }];
  const [ka, kb] = await race([{ kind: "buy", weekId: w1.weekId, plan: keyPlan, concurrency: 1 }, { kind: "buy", weekId: w1.weekId, plan: keyPlan, concurrency: 1 }]);
  const k1 = ka?.results?.[0], k2 = kb?.results?.[0];
  ok("1.3 · ⭐ one request key from two instances is ONE purchase: both answered with the same two tickets, one as the replay (L2)",
    k1?.ok === true && k2?.ok === true && k1.tickets.length === 2 && J([...k1.tickets].sort()) === J([...k2.tickets].sort()) && [k1, k2].filter((r) => r.replayed).length === 1,
    J({ k1, k2 }));

  const REF = `S16-RAIL-${process.pid}`;
  const [fa, fb] = await race([{ kind: "fund", amount: 1_000_000, reference: REF }, { kind: "fund", amount: 1_000_000, reference: REF }]);
  ok("1.4 · ⭐ one guarantee reference from two instances books once: one funding landed, the other was refused (R7)",
    [fa, fb].filter((r) => r?.ok === true).length === 1 && [fa, fb].filter((r) => r?.ok === false && !!r.error).length === 1, J([fa, fb]));
  const c1 = await runJob({ kind: "check", weekId: w1.weekId, users: [capUser, keyUser] });
  ok("1.5 · …and the guarantee rose by that one funding", c1?.guarantee - setup.guarantee === 1_000_000, `${setup.guarantee} → ${c1?.guarantee}`);
  ok("1.6 · each account holds what landed and paid for it once",
    c1?.users?.[capUser]?.live === 3 * capLanded.length && c1.users[capUser].balance === 100_000 - 3 * capLanded.length * price
      && c1.users[keyUser]?.live === 2 && c1.users[keyUser].balance === 100_000 - 2 * price, J(c1?.users));

  // ── §2 · the close against purchases in flight ─────────────────────────────────────────────────────────────────
  console.log(`${NL}§2 · the close against purchases in flight on two instances, and a second closer on a third`);
  // A stream, not a batch: each buyer cycles its accounts one ticket at a time (at most the cap each) until the close
  // refuses it, so the close lands in the middle of purchases in flight however fast the machine is.
  const half = Math.ceil(P.close.length / 2);
  const stream = (us: string[]) => Array.from({ length: cap }, () => us.map((u) => ({ userId: u, n: 1, slip: "LOSE" }))).flat();
  const closeAt = new Date(Date.parse(w1.closesAt) + 60_000).toISOString();
  const [ba, bb, cl, tk] = await race([
    { kind: "buy", weekId: w1.weekId, plan: stream(P.close.slice(0, half)), concurrency: 4, stopOn: "millionea_sales_closed" },
    { kind: "buy", weekId: w1.weekId, plan: stream(P.close.slice(half)), concurrency: 4, stopOn: "millionea_sales_closed" },
    { kind: "close", weekId: w1.weekId, at: closeAt, delayMs: CLOSE_DELAY_MS },
    { kind: "tick", at: closeAt, delayMs: CLOSE_DELAY_MS },
  ]);
  const buys: any[] = [...(ba?.results ?? []), ...(bb?.results ?? [])];
  const landed = buys.filter((r) => r.ok), closedOut = buys.filter((r) => !r.ok && r.reason === "millionea_sales_closed");
  ok("2.1 · the race happened: purchases landed on both sides of the close", landed.length > 0 && closedOut.length > 0,
    `${landed.length} landed, ${closedOut.length} refused as closed${landed.length && closedOut.length ? "" : " — NOT RACED: move S16_CLOSE_DELAY_MS"}`);
  ok("2.2 · every refusal is the close's own", buys.length > 0 && buys.filter((r) => !r.ok).every((r) => r.reason === "millionea_sales_closed"), J(tally(buys.filter((r) => !r.ok))));
  ok("2.3 · ⭐ the week closed exactly once — by the close or by the tick on another instance, never both",
    [cl?.ok === true && cl.already === false, tk?.report?.closed === 1].filter(Boolean).length === 1 && cl?.ok === true && tk?.report?.failures === 0,
    J({ close: cl, tick: tk?.report }));
  const c2 = await runJob({ kind: "check", weekId: w1.weekId, users: P.close });
  const expectLive = 3 * capLanded.length + 2 + landed.length;
  ok("2.4 · ⭐ the commitment counts exactly what committed: the count, the sales and the root from one set of live tickets",
    c2?.week?.state === "CLOSED" && c2.tickets.live === expectLive && c2.week.ticketCount === expectLive && c2.week.salesAtClose === expectLive * price
      && c2.week.ticketMerkleRoot === c2.rootOfLive, J({ expectLive, week: c2?.week, tickets: c2?.tickets }));
  ok("2.5 · the pool agrees three ways: the market, the ledger and the tickets", c2?.pool?.market === expectLive * price && c2.pool.ledger === expectLive * price && c2.pool.other === 0, J(c2?.pool));
  const landedBy = new Map<string, number>();
  for (const r of landed) landedBy.set(r.userId, (landedBy.get(r.userId) ?? 0) + 1);
  const wrong = P.close.filter((u) => { const x = c2?.users?.[u]; const n = landedBy.get(u) ?? 0; return !x || x.live !== n || x.balance !== BALANCE - n * price; });
  ok("2.6 · every buyer paid exactly for what landed: a refused purchase moved nothing", wrong.length === 0,
    `${wrong.length} account(s) disagree${wrong.length ? `: ${J(wrong.slice(0, 5).map((u) => ({ u, ...(c2?.users?.[u] ?? {}), landed: landedBy.get(u) ?? 0 })))}` : ""}`);
  const s1 = await runJob({ kind: "seal", weekId: w1.weekId, start: w1.start });
  if (!s1?.ok) throw new Error("week 1 could not be sealed");

  // ── §3 · two weeks released at once, then one week by two instances ───────────────────────────────────────────
  console.log(`${NL}§3 · two weeks released at once (MR-3), then one week released by two instances at once`);
  const w2 = await runJob({ kind: "week", weeksAhead: 3, seal: "YES", lots: [
    { group: "w2win", tickets: 40, slip: "WIN", perPlayer: 1 }, { group: "w2lose", tickets: 160, slip: "LOSE", perPlayer: 10 }] });
  if (!w2?.ok) throw new Error("week 2 could not be prepared");
  const [r1, r2] = await race([{ kind: "release", weekId: w1.weekId, at: s1.releaseAt }, { kind: "release", weekId: w2.weekId, at: w2.releaseAt }]);
  ok("3.1 · ⭐ week 1 settled once, by its own release", r1?.ok === true && r1.already === false, J(r1));
  const c3w1 = await runJob({ kind: "check", weekId: w1.weekId });
  const jW1 = (c3w1?.week?.rolloverIn ?? 0) + (c3w1?.week?.figures?.carry ?? 0);
  ok("3.2 · week 1 had no winner: its sales rolled into the jackpot whole (MR-21)",
    c3w1?.week?.state === "SETTLED" && same(c3w1.week.figures, roll(expectLive * price)) && c3w1.week.rolloverIn === 0, J(c3w1?.week));
  const w2InRace = r2?.ok === true && r2.already === false;
  const c3a = await runJob({ kind: "check", weekId: w2.weekId });
  ok("3.3 · ⭐ week 2, released at the same instant, never settled on a carry week 1 had not committed: refused, or settled on what week 1 left",
    w2InRace ? c3a?.week?.rolloverIn === jW1 : (r2?.ok === false && /not settled yet|changed since it was prepared/.test(String(r2.error))), J({ r2, rolloverIn: c3a?.week?.rolloverIn, jW1 }));
  const [r3, r4] = await race([{ kind: "release", weekId: w2.weekId, at: w2.releaseAt }, { kind: "release", weekId: w2.weekId, at: w2.releaseAt }]);
  ok("3.4 · ⭐ one week released by two instances at once settles exactly once; the other answers already settled",
    [r3, r4].every((r) => r?.ok === true) && [r3, r4].filter((r) => r?.already === false).length === (w2InRace ? 0 : 1), J([r3, r4]));
  const c3 = await runJob({ kind: "check", weekId: w2.weekId, users: [...P.w2win, ...P.w2lose] });
  const f2 = expect5b(c3?.week?.rolloverIn ?? NaN, 200 * price, 40, c3?.rates ?? {});
  ok("3.5 · ⭐ week 2's figures are §5b's, re-derived here from its carry, its sales and its 40 winning tickets",
    c3?.week?.state === "SETTLED" && c3.week.rolloverIn === jW1 && same(c3.week.figures, f2), J({ got: c3?.week?.figures, want: f2 }));
  ok("3.6 · each winner was paid one share and each loser nothing; one payout row per winning ticket; the pool at 0",
    P.w2win.every((u) => c3?.users?.[u]?.balance === BALANCE - price + (f2.share ?? 0)) && P.w2lose.every((u) => c3?.users?.[u]?.balance === BALANCE - 10 * price)
      && c3?.payouts === 40 && c3.pool.ledger === 0, J({ payouts: c3?.payouts, pool: c3?.pool }));
  ok("3.7 · the guarantee paid exactly the top-up, and the jackpot holds the carry",
    c1?.guarantee - c3?.guarantee === f2.U && c3?.jackpot === f2.carry, J({ guarantee: [c1?.guarantee, c3?.guarantee], U: f2.U, jackpot: c3?.jackpot, carry: f2.carry }));

  // ── §4 · a correction against the release, on clocks that straddle the window's end ───────────────────────────
  console.log(`${NL}§4 · a correction and the release on two instances whose clocks straddle the objection window's end`);
  const w3 = await runJob({ kind: "week", weeksAhead: 4, seal: "YES", lots: [
    { group: "w3win", tickets: 5, slip: "WIN", perPlayer: 1 }, { group: "w3lose", tickets: 15, slip: "LOSE", perPlayer: 1 }] });
  if (!w3?.ok) throw new Error("week 3 could not be prepared");
  const E = Date.parse(w3.windowEnd);
  const [rel, cor] = await race([
    { kind: "release", weekId: w3.weekId, at: new Date(E + 60_000).toISOString() },
    { kind: "correct", weekId: w3.weekId, slot: 1, outcome: "NO", evidence: "The official result for event 1 was misread: it is NO.", at: new Date(E - 1_000).toISOString() },
  ]);
  const relLanded = rel?.ok === true && rel.already === false, corLanded = cor?.ok === true;
  ok("4.1 · ⭐ exactly one landed: the release or the correction, never both", [relLanded, corLanded].filter(Boolean).length === 1, J({ rel, cor }));
  if (corLanded) {
    const c4a = await runJob({ kind: "check", weekId: w3.weekId });
    const E2 = Date.parse(c4a?.week?.objectionsCloseAt ?? "");
    ok("4.2 · the correction landed first: the week waits again, its restarted window ending after the old one (OD-09)",
      c4a?.week?.state === "RESOLVING" && E2 > E && /objection window is still open|graded set is not final|changed since it was prepared/.test(String(rel?.error)),
      J({ week: c4a?.week, rel }));
    const again = await runJob({ kind: "release", weekId: w3.weekId, at: new Date(E2 + 60_000).toISOString() });
    ok("4.3 · …and it settles once the restarted window closes", again?.ok === true && again.already === false, J(again));
  } else {
    ok("4.2 · the release landed first: the correction was refused because the week is settled", /SETTLED/.test(String(cor?.error)), J(cor));
  }
  const expectWinners = [...(corLanded ? P.w3lose : P.w3win)].sort();
  const c4 = await runJob({ kind: "check", weekId: w3.weekId, users: [...P.w3win, ...P.w3lose], listWinners: true });
  const f3 = expect5b(c4?.week?.rolloverIn ?? NaN, 20 * price, expectWinners.length, c4?.rates ?? {});
  ok("4.4 · ⭐ the winners are the record's: the tickets that score 10 of 10 on the outcome the settlement read",
    J(c4?.winnerUsers) === J(expectWinners) && c4.week.rolloverIn === c3?.jackpot && same(c4.week.figures, f3),
    J({ winners: c4?.winnerUsers?.length, want: expectWinners.length, got: c4?.week?.figures, f3 }));
  ok("4.5 · each winner paid one share, once; every other ticket nothing",
    [...P.w3win, ...P.w3lose].every((u) => c4?.users?.[u]?.balance === BALANCE - price + (expectWinners.includes(u) ? (f3.share ?? 0) : 0)) && c4?.payouts === expectWinners.length,
    J({ payouts: c4?.payouts }));

  // ── §5 · a week void from two instances ───────────────────────────────────────────────────────────────────────
  console.log(`${NL}§5 · a week void sent by two instances: the void, and the scheduler's tick`);
  const w4 = await runJob({ kind: "week", weeksAhead: 5, seal: "ALL_VOID", lots: [{ group: "w4", tickets: 30, slip: "LOSE", perPlayer: 3 }] });
  if (!w4?.ok) throw new Error("week 4 could not be prepared");
  const [vd, vt] = await race([{ kind: "void", weekId: w4.weekId, at: w4.releaseAt }, { kind: "tick", at: w4.releaseAt }]);
  ok("5.1 · ⭐ the week's refunds ran exactly once — by the void or by the tick, never both (MR-18)",
    [vd?.ok === true && vd.already === false, vt?.report?.voided === 1].filter(Boolean).length === 1 && vd?.ok === true && vt?.report?.failures === 0,
    J({ void: vd, tick: vt?.report }));
  const c5 = await runJob({ kind: "check", weekId: w4.weekId, users: P.w4 });
  ok("5.2 · every ticket refunded once, in full: 30 REFUNDED, one refund row each, every position VOID, every buyer whole, the pool at 0",
    c5?.week?.state === "VOIDED" && c5.tickets.refunded === 30 && c5.refunds === 30 && c5.positions.void === 30 && P.w4.every((u) => c5.users?.[u]?.balance === BALANCE) && c5.pool.ledger === 0,
    J({ state: c5?.week?.state, tickets: c5?.tickets, refunds: c5?.refunds, pool: c5?.pool }));
  ok("5.3 · R untouched: the voided week claimed nothing, and the jackpot is as week 3 left it", c5?.week?.rolloverIn === null && c5.jackpot === c4?.jackpot, J({ R: c5?.week?.rolloverIn, jackpot: [c4?.jackpot, c5?.jackpot] }));

  // ── §6 · 10,000 tickets in each selected shape ──────────────────────────────────────────────────────────────────
  const shapes = [
    ...(wantFew ? [{ tag: "few", win: FEW, winGroup: "fewWin", loseGroup: "fewLose", ahead: 6, held: false, refused: false }] : []),
    ...(wantWide ? [{ tag: "wide", win: WIDE, winGroup: "wideWin", loseGroup: "wideLose", ahead: 7, held: false, refused: false }] : []),
    ...(wantHeld ? [{ tag: "held", win: WIDE, winGroup: "heldWin", loseGroup: "heldLose", ahead: 8, held: true, refused: false }] : []),
    ...(wantRefused ? [{ tag: "refused", win: WIDE, winGroup: "refusedWin", loseGroup: "refusedLose", ahead: 9, held: true, refused: true }] : []),
  ];
  /** A hold or lift trail (`check`'s `held.added` / `held.removed`): its rows, its accounts, and the most any one account has. */
  const trailIs = (t: any, rows: number, users: number, maxPer: number) => t?.rows === rows && t?.users === users && t?.maxPer === maxPer;
  for (const [i, s] of shapes.entries()) {
    const label = `${TICKETS.toLocaleString("en")} tickets, ${s.win.toLocaleString("en")} distinct winning player(s)${s.refused ? ", all held, refused before it settles" : s.held ? ", all held" : ""}`;
    console.log(`${NL}§6.${i + 1} · ${label}: sold, sealed and released in one transaction`);
    const wk = await runJob({ kind: "week", weeksAhead: s.ahead, seal: "YES", lots: [
      { group: s.winGroup, tickets: s.win, slip: "WIN", perPlayer: 1 }, { group: s.loseGroup, tickets: TICKETS - s.win, slip: "LOSE", perPlayer: 10 }] });
    ok(`6.${i + 1}.1 · sold through the one bet path, closed and sealed`, wk?.ok === true, wk?.ok ? `${Math.round(wk.sellMs / 1000)} s to sell` : J(wk));
    if (!wk?.ok) continue;
    if (s.held) {
      const suspended = await runJob({ kind: "suspend", group: s.winGroup });
      ok(`6.${i + 1}.hold · every winning account suspended AFTER its purchase`, suspended?.ok === true && suspended.confirmed === s.win,
        J({ requested: suspended?.requested, confirmed: suspended?.confirmed }));
      if (!suspended?.ok || suspended.confirmed !== s.win) continue;
    }
    if (s.refused) {
      // ── S7-F8 · THE LIFTS, MEASURED. Attempt 1: every hold placed, then the release fails at its last statement (a
      //    TEST-FAULT: rolled back, nothing paid) and lifts them all again. Attempt 2 (S16_LIFT_STOP_AFTER > 0): the same,
      //    but its process ENDS after that many lift sections, and the heal finishes the rest. Then the week settles once.
      const attempt = async (tag: string, extra: Record<string, unknown>) => {
        const crashFile = join(TMP, `crash-${tag}.json`);
        const r = await runJob({ kind: "release", weekId: wk.weekId, at: wk.releaseAt, failAtCommit: true, crashFile,
          timeoutMs: Math.min(JOB_TIMEOUT_MS, 30 * 60_000), ...extra });
        const crash = existsSync(crashFile) ? JSON.parse(readFileSync(crashFile, "utf8")) : null;
        const c = await runJob({ kind: "check", weekId: wk.weekId, sumUsers: P[s.winGroup], heldGroup: s.winGroup });
        return { r, crash, c };
      };
      const untouched = (c: any) => c?.payouts === 0 && c?.week?.state === "RESOLVING" && c?.tickets?.live === TICKETS
        && c?.pool?.ledger === TICKETS * price && c?.sum === s.win * (BALANCE - price);
      const a1 = await attempt("a1", {});
      const ends1: number[] = Array.isArray(a1.r?.liftSectionEnds) ? a1.r.liftSectionEnds : [];
      measured.push(`  refused · attempt 1 (fails at its last statement): ${a1.r?.error ?? "no result"} · its holds in ${a1.r?.spans?.length ?? "?"} section(s) · `
        + `the lifts ${a1.r?.liftMs ?? "?"} ms, ${ends1.length ? `${ends1.length + 1} section(s) of the chain lock` : "no lift section marked (one chain-lock transaction per account)"} · `
        + `left frozen ${a1.c?.held?.frozenWallets}`);
      ok(`6.${i + 1}.r1 · ⭐ a release refused after its ${s.win.toLocaleString("en")} holds lifts them all again: no wallet left frozen, each hold placed once and lifted once, nothing paid`,
        a1.r?.ok === false && /TEST-FAULT/.test(String(a1.r?.error)) && a1.c?.held?.frozenWallets === 0
          && trailIs(a1.c?.held?.added, s.win, s.win, 1) && trailIs(a1.c?.held?.removed, s.win, s.win, 1) && untouched(a1.c),
        J({ error: a1.r?.error, liftMs: a1.r?.liftMs, liftSections: ends1.length ? ends1.length + 1 : null, held: a1.c?.held, payouts: a1.c?.payouts, pool: a1.c?.pool }));
      if (LIFT_STOP_AFTER > 0) {
        const a2 = await attempt("a2", { stopAfterLiftSections: LIFT_STOP_AFTER });
        const liftedBeforeStop = (a2.c?.held?.removed?.rows ?? 0) - s.win;
        ok(`6.${i + 1}.r2 · ⭐ a lift whose process ends after ${LIFT_STOP_AFTER} section(s) leaves every account whole — lifted and recorded, or still held`,
          a2.crash?.crashed === true && a2.crash.stoppedAfterLiftSections === LIFT_STOP_AFTER && a2.c?.held?.frozenWallets > 0 && liftedBeforeStop > 0
            && a2.c.held.frozenWallets + liftedBeforeStop === s.win && trailIs(a2.c.held.added, 2 * s.win, s.win, 2) && a2.c.held.removed.maxPer <= 2 && untouched(a2.c),
          J({ crash: a2.crash, held: a2.c?.held }));
        const healed = await runJob({ kind: "heal" });
        const c3 = await runJob({ kind: "check", weekId: wk.weekId, sumUsers: P[s.winGroup], heldGroup: s.winGroup });
        measured.push(`  refused · attempt 2 ended its process after ${LIFT_STOP_AFTER} lift section(s): ${liftedBeforeStop} lifted, ${a2.c?.held?.frozenWallets} left frozen · `
          + `the heal lifted ${healed?.lifted} in ${healed?.ms} ms, ${healed?.liftSections} section(s) · left frozen ${c3?.held?.frozenWallets}`);
        ok(`6.${i + 1}.r3 · ⭐ …and the heal lifts exactly the rest: no wallet left frozen, each account's two holds lifted exactly twice`,
          healed?.ok === true && healed.lifted === a2.c?.held?.frozenWallets && c3?.held?.frozenWallets === 0
            && trailIs(c3?.held?.added, 2 * s.win, s.win, 2) && trailIs(c3?.held?.removed, 2 * s.win, s.win, 2) && untouched(c3),
          J({ healed, held: c3?.held }));
      }
    }
    // The held shape has a thirty-minute process watchdog (S7-F8: its 7,000 holds take sections of the chain lock, each
    // hold its own committed write and audit row — minutes in all). A failed settlement may need to lift its already
    // committed holds; a missing worker result is a failure, then the independent check names whatever the database retained.
    const settled = await runJob({ kind: "release", weekId: wk.weekId, at: wk.releaseAt,
      ...(s.held ? { timeoutMs: Math.min(JOB_TIMEOUT_MS, 30 * 60_000) } : {}) });
    const timing = `the release ${settled?.settleMs} ms, its preparation ${settled?.previewMs} ms`;
    // S7-F8 · the worker's marks, in ms after the preparation: the chain lock's first section opens, every section that let
    // the lock go with holds still to place ends, the last section's holds are placed, its last write is made (the commit
    // follows), the release returns. `spans` is each section's length — each section is its own transaction of the lock.
    const m = settled?.marks;
    const spans: Array<number | null> = Array.isArray(settled?.spans) ? settled.spans : [];
    const spanText = spans.length ? `${spans.length} section(s) of the chain lock: ${spans.map((x) => (x === null ? "never closed" : `${x} ms`)).join(", ")}` : "no section measured";
    measured.push(`${label}: ${settled?.ok ? timing : `FAILED — ${settled?.error} (${timing})`} · ${spanText} · marks ${J(m ?? null)} · budget ${SETTLE_BUDGET_MS} ms a transaction`);
    // A section whose transaction ran past the budget is rolled back by the database client: one that landed fit it, and
    // its span says by how much. A release of few holds is ONE section, so its span is the whole transaction.
    const inBudget = spans.length > 0 && spans.every((x) => typeof x === "number" && x < SETTLE_BUDGET_MS);
    ok(`6.${i + 1}.2 · ⭐ settled once, every transaction of the release inside the ${SETTLE_BUDGET_MS / 1000}-second budget${s.held ? " (the holds in sections of the chain lock)" : " (one section)"}`,
      settled?.ok === true && settled.already === false && inBudget && (s.held || spans.length === 1),
      `${timing} · ${spanText}${s.tag === "wide" ? ` (R9 recorded about ${R9_RECORDED_WINNERS.toLocaleString("en")} distinct winning players inside it)` : ""}${settled?.ok ? "" : ` — ${settled?.error}`}`);
    const c6 = await runJob({ kind: "check", weekId: wk.weekId, sumUsers: P[s.winGroup], ...(s.held ? { heldGroup: s.winGroup } : {}) });
    const f6 = expect5b(c6?.week?.rolloverIn ?? NaN, TICKETS * price, s.win, c6?.rates ?? {});
    measured.push(`  ${s.tag} · rows: ${c6?.payouts} BET_PAYOUT, ${c6?.settleLedgerRows} ledger lines in the group, positions ${J(c6?.positions)}, `
      + `tickets ${J(c6?.tickets)}, pool ${J(c6?.pool)}, winners' balances ${c6?.sum} (want ${s.win * (BALANCE - price + (f6.share ?? 0))})${s.held ? `, held ${J(c6?.held)}` : ""}`);
    ok(`6.${i + 1}.3 · exactly once: ${s.win} WIN, ${TICKETS - s.win} LOSS, one payout row per winning ticket, the pool at 0, §5b's figures`,
      c6?.positions?.win === s.win && c6.positions.loss === TICKETS - s.win && c6.payouts === s.win && c6.pool.ledger === 0 && same(c6.week.figures, f6),
      J({ positions: c6?.positions, payouts: c6?.payouts, pool: c6?.pool, got: c6?.week?.figures, want: f6 }));
    ok(`6.${i + 1}.4 · every winning player was paid one share: their balances sum to what they had, less a ticket, plus a share each`,
      c6?.sum === s.win * (BALANCE - price + (f6.share ?? 0)), `${c6?.sum} against ${s.win * (BALANCE - price + (f6.share ?? 0))}`);
    if (s.refused) {
      const attempts = LIFT_STOP_AFTER > 0 ? 3 : 2, lifted = attempts - 1;
      ok(`6.${i + 1}.r4 · ⭐ the refused week then settles once: every account held with its share, its ${attempts} holds and ${lifted} lift(s) each exactly`,
        settled?.ok === true && c6?.held?.frozenWallets === s.win && c6.held.heldTickets === s.win
          && trailIs(c6.held.added, attempts * s.win, s.win, attempts) && trailIs(c6.held.removed, lifted * s.win, s.win, lifted),
        J({ held: c6?.held }));
    } else if (s.held) {
      const problems = heldWideProblems(s.win, settled, c6?.held ?? null);
      ok(`6.${i + 1}.5 · every winning account and ticket is held, with one durable freeze audit per account`, problems.length === 0,
        J({ problems, held: c6?.held, previewHeld: settled?.previewHeld, settleMs: settled?.settleMs }));
      if (!settled?.ok) {
        ok(`6.${i + 1}.6 · a timed-out or refused release left no partial payout`,
          c6?.week?.state === "RESOLVING" && c6?.tickets?.live === TICKETS && c6?.positions?.open === TICKETS
            && c6?.payouts === 0 && c6?.pool?.ledger === TICKETS * price && c6?.sum === s.win * (BALANCE - price),
          J({ error: settled?.error, week: c6?.week?.state, tickets: c6?.tickets, positions: c6?.positions, payouts: c6?.payouts,
            pool: c6?.pool, held: c6?.held }));
      } else {
        const replay = await runJob({ kind: "release", weekId: wk.weekId, at: wk.releaseAt });
        const twice = await runJob({ kind: "check", weekId: wk.weekId, sumUsers: P[s.winGroup], heldGroup: s.winGroup });
        ok(`6.${i + 1}.6 · replay pays nothing and adds no second freeze audit`,
          replay?.ok === true && replay.already === true && twice?.payouts === c6?.payouts && twice?.sum === c6?.sum
            && twice?.held?.auditRows === c6?.held?.auditRows && twice?.held?.frozenWallets === s.win,
          J({ replay, payouts: [c6?.payouts, twice?.payouts], audits: [c6?.held?.auditRows, twice?.held?.auditRows] }));
      }
    }
  }

  // ── §6b · RD.5 — deposits reversed after their winners were paid, across instances (S7-F9, MB-74) ─────────────────
  console.log(`${NL}§6b · RD.5 · deposits reversed after their winners were paid: each reversal heard by two instances at once; then a reversal racing the release`);
  const MARK = "deposit-terminal-review:v1";
  const DEPOSIT_HOLD = "deposit under review";
  /** One hold record per share at most, each naming its own winner's deposit; `exactly` asks for one on every share. */
  const recordsOk = (h: any, refs: Record<string, { txnId: string }>, exactly: boolean) => (h?.tickets ?? []).every((t: any) => {
    const mine = (h.records ?? []).filter((r: any) => r.ticketId === t.id);
    return (exactly ? mine.length === 1 : mine.length <= 1) && mine.every((r: any) => r.deposit === refs[t.userId]?.txnId);
  });
  const depA = await runJob({ kind: "deposit", group: "rdA", amount: BALANCE });
  const w5 = await runJob({ kind: "week", weeksAhead: 10, seal: "YES", lots: [
    { group: "rdA", tickets: RD_WIN, slip: "WIN", perPlayer: 1 }, { group: "rdLose", tickets: 7, slip: "LOSE", perPlayer: 1 }] });
  if (!depA?.ok || !w5?.ok) throw new Error("the first RD.5 week could not be prepared");
  const txA = P.rdA.map((u) => depA.refs[u].txnId), refA = P.rdA.map((u) => depA.refs[u].providerRef);
  const rel5 = await runJob({ kind: "release", weekId: w5.weekId, at: w5.releaseAt });
  const paid5 = await runJob({ kind: "reversal", weekId: w5.weekId, group: "rdA", txnIds: txA });
  ok("6b.1 · the week paid its winners free first: no deposit was contradicted at its release",
    rel5?.ok === true && paid5?.tickets?.length === RD_WIN && paid5.tickets.every((t: any) => t.won === true && t.payout > 0 && t.frozenReason === null)
      && paid5.wallets.every((w: any) => !w.held), J({ rel5: rel5?.error ?? rel5?.ok, tickets: paid5?.tickets }));
  const [ra, rb] = await race([{ kind: "reverse", refs: refA }, { kind: "reverse", refs: refA }]);
  const h5 = await runJob({ kind: "reversal", weekId: w5.weekId, group: "rdA", txnIds: txA });
  ok("6b.2 · ⭐ each reversal, heard by two instances at the same instant, marked its deposit once and held its winner's paid share exactly once, in the release's words — one hold record per share, naming that winner's own deposit (MB-74)",
    h5?.deposits?.length === RD_WIN && h5.deposits.every((d: any) => d.status === "CONFIRMED" && d.providerStatus === MARK)
      && h5.tickets.every((t: any) => t.frozenReason === DEPOSIT_HOLD) && recordsOk(h5, depA.refs, true) && h5.wallets.every((w: any) => w.held),
    J({ answers: [ra?.answers, rb?.answers], tickets: h5?.tickets?.map((t: any) => t.frozenReason), records: h5?.records }));
  ok("6b.3 · nothing moved: every winner's balance is what its payout left",
    h5?.wallets?.every((w: any) => w.balance === paid5?.wallets?.find((x: any) => x.userId === w.userId)?.balance), J({ before: paid5?.wallets, after: h5?.wallets }));
  // The reversal against the release: the mark lands before the release reads the deposits (the release holds the share) or
  // after it paid (the reversal does). Either way the share ends held exactly once, never paid out free.
  const depB = await runJob({ kind: "deposit", group: "rdB", amount: BALANCE });
  const w6 = await runJob({ kind: "week", weeksAhead: 11, seal: "YES", lots: [
    { group: "rdB", tickets: RD_WIN, slip: "WIN", perPlayer: 1 }, { group: "rdLose", tickets: 7, slip: "LOSE", perPlayer: 1 }] });
  if (!depB?.ok || !w6?.ok) throw new Error("the second RD.5 week could not be prepared");
  const txB = P.rdB.map((u) => depB.refs[u].txnId), refB = P.rdB.map((u) => depB.refs[u].providerRef);
  const [relB, revB] = await race([{ kind: "release", weekId: w6.weekId, at: w6.releaseAt }, { kind: "reverse", refs: refB }]);
  // A mark landing between the release's preparation and its last read of the deposits refuses that release ("changed
  // since it was prepared") — nothing paid; the officer prepares again, and that release holds the share itself.
  const refusedB = relB?.ok !== true && /changed since it was prepared/.test(String(relB?.error));
  const relB2 = refusedB ? await runJob({ kind: "release", weekId: w6.weekId, at: w6.releaseAt }) : relB;
  const h6 = await runJob({ kind: "reversal", weekId: w6.weekId, group: "rdB", txnIds: txB });
  const c6b = await runJob({ kind: "check", weekId: w6.weekId });
  ok("6b.4 · ⭐ a reversal racing the release: the week settled once, and every winner's share ended HELD exactly once — by the release (the mark first) or by the reversal (the payout first) — never paid out free, never held twice",
    relB2?.ok === true && c6b?.week?.state === "SETTLED" && h6?.tickets?.length === RD_WIN
      && h6.tickets.every((t: any) => t.won === true && t.payout > 0 && t.frozenReason === DEPOSIT_HOLD) && recordsOk(h6, depB.refs, false)
      && h6.wallets.every((w: any) => w.held) && h6.deposits.every((d: any) => d.providerStatus === MARK),
    J({ relB: relB?.error ?? relB?.ok, preparedAgain: refusedB ? (relB2?.error ?? relB2?.ok) : null, revB: revB?.answers,
      tickets: h6?.tickets?.map((t: any) => t.frozenReason), records: h6?.records }));
  ok("6b.5 · and the money is the payout's alone: each winner holds its balance less a ticket plus one share, the pool at 0",
    h6?.wallets?.every((w: any) => w.balance === BALANCE - w6.price + (c6b?.week?.figures?.share ?? NaN)) && c6b?.pool?.ledger === 0,
    J({ wallets: h6?.wallets, share: c6b?.week?.figures?.share, pool: c6b?.pool }));

  // ── §6c · OD-13 — a share owed to a winner who cannot sign in, paid across instances (S6-MONEY) ─────────────────────
  console.log(`${NL}§6c · OD-13 · a locked winner's share paid by two officers on two instances at once; then a payment racing a hold`);
  const w7 = await runJob({ kind: "week", weeksAhead: 12, seal: "YES", lots: [
    { group: "lockWin", tickets: LOCK_WIN, slip: "WIN", perPlayer: 1 }, { group: "lockLose", tickets: 10 - LOCK_WIN, slip: "LOSE", perPlayer: 1 }] });
  if (!w7?.ok) throw new Error("the OD-13 week could not be prepared");
  const rel7 = await runJob({ kind: "release", weekId: w7.weekId, at: w7.releaseAt });
  const prep7 = await runJob({ kind: "lockprep", weekId: w7.weekId, group: "lockWin" });
  const c7w = await runJob({ kind: "check", weekId: w7.weekId });
  const share7: number = c7w?.week?.figures?.share ?? NaN;
  ok("6c.1 · the week paid its winners, each then self-excluded with its identity and email in order: each share stranded in a wallet the self-exclusion froze",
    rel7?.ok === true && prep7?.tickets?.length === LOCK_WIN && prep7.tickets.every((t: any) => t.payout === share7 && t.frozenReason === null)
      && prep7.wallets.every((w: any) => w.status === "FROZEN" && J(w.reasons) === J(["SELF_EXCLUSION"]) && w.balance === BALANCE - w7.price + share7),
    J({ rel7: rel7?.error ?? rel7?.ok, share7, tickets: prep7?.tickets, wallets: prep7?.wallets }));
  const [tkA, tkB] = (prep7?.tickets ?? []) as any[];
  if (!tkA || !tkB) throw new Error("the OD-13 week has no two winning tickets");
  const [pa, pb] = await race([
    { kind: "paylocked", ticketId: tkA.id, officerId: `usr_s16_od13_a_${process.pid}` },
    { kind: "paylocked", ticketId: tkA.id, officerId: `usr_s16_od13_b_${process.pid}` }]);
  const afterA = await runJob({ kind: "paidlocked", ticketId: tkA.id, userId: tkA.userId });
  ok("6c.2 · ⭐ two officers on two instances at the same instant pay ONE share once: one withdrawal of exactly the share, one record — the other officer told nothing was paid again",
    [pa, pb].filter((r) => r?.ok === true && r.status === "CONFIRMED" && !r.replayed && !r.already).length === 1
      && [pa, pb].filter((r) => r?.ok === true && (r.replayed || r.already)).length === 1
      && afterA?.payments?.length === 1 && afterA.payments[0].status === "CONFIRMED" && afterA.payments[0].amount === -share7
      && afterA.withdrawals === 1 && afterA.records?.length === 1,
    J({ pa, pb, payments: afterA?.payments, withdrawals: afterA?.withdrawals, records: afterA?.records }));
  ok("6c.3 · the wallet is down by exactly the share, and stays frozen by the self-exclusion alone",
    afterA?.wallet?.balance === BALANCE - w7.price && afterA.wallet.status === "FROZEN" && J(afterA.wallet.reasons) === J(["SELF_EXCLUSION"]),
    J(afterA?.wallet));
  // A payment racing Compliance's hold of the same share: whichever takes the Millionea chain lock first decides. The hold
  // first: the payment is refused inside the locks and nothing leaves. The payment first: the share leaves once, and the
  // later hold marks a share already paid (its forfeit then refuses: the wallet no longer holds it) — never both free.
  const [pc7, hc7] = await race([
    { kind: "paylocked", ticketId: tkB.id, officerId: `usr_s16_od13_c_${process.pid}` },
    { kind: "holdshare", ticketId: tkB.id, officerId: `usr_s16_od13_d_${process.pid}` }]);
  const afterB = await runJob({ kind: "paidlocked", ticketId: tkB.id, userId: tkB.userId });
  const paidFirst = pc7?.ok === true && pc7.status === "CONFIRMED";
  // The hold first: the act refuses on the held share, on the wallet's new hold, or inside withdraw's own gate.
  const heldFirst = pc7?.ok === false && !/^THREW/.test(String(pc7?.error)) && /held|Wallet frozen/.test(String(pc7?.error));
  ok("6c.4 · ⭐ a payment racing a hold on another instance: the hold landed and nothing left, or the share left once — the wallet holds exactly what that outcome leaves",
    hc7?.ok === true && /^compliance · /.test(String(afterB?.ticket?.frozenReason)) && (paidFirst !== heldFirst)
      && (paidFirst
        ? afterB?.payments?.length === 1 && afterB.payments[0].amount === -share7 && afterB.withdrawals === 1 && afterB.records?.length === 1
          && afterB.wallet?.balance === BALANCE - w7.price
        : afterB?.payments?.length === 0 && afterB.withdrawals === 0 && afterB.records?.length === 0 && afterB.wallet?.balance === BALANCE - w7.price + share7),
    J({ pay: pc7, hold: hc7, paidFirst, heldFirst, payments: afterB?.payments, wallet: afterB?.wallet, ticket: afterB?.ticket }));
  measured.push(`  §6c · the payment-against-hold race: ${paidFirst ? "the payment took the chain lock first" : heldFirst ? "the hold took the chain lock first" : "neither outcome was read"}`);

  // ── §7 · the identities ────────────────────────────────────────────────────────────────────────────────────────
  console.log(`${NL}§7 · the identities over everything above`);
  const c7 = await runJob({ kind: "check", ledger: true });
  ok("7.1 · ⭐ the trial balance reconciles: no drifting wallet, no unbalanced ledger group", c7?.trialBalance?.ok === true && c7.trialBalance.checked > 0
    && c7.trialBalance.drifting === 0 && c7.trialBalance.imbalanced === 0 && c7.trialBalance.globalBalanced === true, J(c7?.trialBalance));
  ok("7.2 · ⭐ every Millionea invariant holds", c7?.invariants?.ok === true, J(c7?.invariants?.problems));
} catch (e) {
  ok("0.run · the drive completed", false, String((e as Error)?.message ?? e));
} finally {
  const drop = new pg.Client({ connectionString: RAW });
  try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
  catch (e) { console.error(`!! SCRATCH DATABASE NOT DROPPED — "${DB}" on ${BASE}: ${(e as Error).message}. Drop it by hand.`); }
  finally { try { await drop.end(); } catch { /* gone */ } }
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* the temp folder is not the measurement */ }
}
if (measured.length) console.log(`${NL}MEASURED · the release of one week, in one transaction:${NL}${measured.map((m) => `  ${m}`).join(NL)}`);
console.log(`${NL}${fail === 0 ? "ALL PASS" : "FAILURES"} — load:maswali-cross-instance: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
