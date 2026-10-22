/**
 * S18 — THE MILLIONEA OBJECTION DOOR ACROSS INSTANCES (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23). S16's sibling
 * (`s16-maswali-cross-instance.mts`), for the same reason: inside one process a lock that is a promise chain agrees with
 * itself; only two processes on one Postgres show that the chain lock, the conditional decision, the reviewed-seal check
 * and the partial unique index hold between two containers.
 *
 *   npm run load:maswali-objection-cross-instance                   (boots the on-box Postgres through db-scratch)
 *   S18_SECTIONS=3,4 npm run load:maswali-objection-cross-instance  (those acts alone, by number; the identities always run)
 *
 * Every act is two OS processes (`s18-maswali-objection-worker.mts`), each its own Prisma pool, started at one instant by
 * S16's barrier, on ONE scratch database. Each act has its own week, opened in calendar order (MR-3: a release waits for
 * every earlier week, so the two acts that release come first):
 *   §1 a filing at the window's last millisecond on one instance, and the release on another whose clock is past the
 *      window's end: exactly one lands — a filing first leaves an OPEN objection the release refuses; a release first
 *      leaves a SETTLED week the filing refuses (WEEK_FINAL);
 *   §2 an upheld REVERSE and the release at once: the release never lands — before the ruling an objection stands, after
 *      it the restarted window is open — and once that window ends the week pays on the final record;
 *   §3 two officers ruling one case at once (REVERSE against REJECT): exactly one ruling lands, and the record is its own;
 *   §4 two officers each upholding a REVERSE of the same question on two cases at once: the question flips ONCE — the
 *      second ruling was made on a seal that changed;
 *   §5 one player filing on one question from two instances at once: one objection; two players on one question: two;
 *   §6 the identities over everything: the trial balance, every Millionea invariant.
 * Knobs: S18_SECTIONS ("1,2,3,4,5"), S18_JOB_TIMEOUT_MIN (10).
 * ⛔ Loopback clusters only: the database is created and dropped here. ⛔ A load harness: run it detached under the
 *    slot helper, alone, never in `test:all` or `predeploy` (scripts/load/README.md).
 * ⚠️ This file carries no backslash: line breaks are built from their code points.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORKER = "scripts/load/s18-maswali-objection-worker.mts";
const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const minutes = Number(process.env.S18_JOB_TIMEOUT_MIN ?? 10);
if (!Number.isSafeInteger(minutes) || minutes < 1) { console.error("!! S18_JOB_TIMEOUT_MIN must be a whole number of minutes."); process.exit(2); }
const JOB_TIMEOUT_MS = minutes * 60_000;
const SECTIONS = (process.env.S18_SECTIONS ?? "1,2,3,4,5").split(",").map((s) => s.trim()).filter(Boolean);
if (SECTIONS.some((s) => !["1", "2", "3", "4", "5"].includes(s))) { console.error(`!! S18_SECTIONS names acts 1-5 (got ${process.env.S18_SECTIONS}).`); process.exit(2); }
const wants = (n: number) => SECTIONS.includes(String(n));
const BALANCE = 20_000;
const MIN = 60_000;

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("!! NOT MEASURED — run `npm run load:maswali-objection-cross-instance`, which boots a local cluster."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: loopback clusters only."); process.exit(2); }
const noQuery = RAW.split("?")[0];
const BASE = noQuery.slice(0, noQuery.lastIndexOf("/"));
const DB = `mlw_s18_${process.pid}`;
const URL_ = `${BASE}/${DB}?connect_timeout=30`;
const ENV = {
  ...process.env, DATABASE_URL: URL_, USE_PRISMA_DAL: "true", HB_MONEY_STORE: "postgres",
  // Each worker is a small container: its own pool, and no week timer of its own — the acts run at the instants they name.
  PRISMA_CONNECTION_LIMIT: "8", MASWALI_SCHEDULER: "false",
};

const killTree = (pid: number | undefined) => {
  if (!pid) return;
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch { /* already gone */ }
};

const TMP = mkdtempSync(join(tmpdir(), "s18-"));
const PLAYERS_FILE = join(TMP, "players.json");
let jobSeq = 0;
type Kid = { ready: Promise<boolean>; done: Promise<any> };

/** One worker for one job: READY and the RESULT read from its output as it comes (S16's `launch`). */
function launch(job: Record<string, unknown>, go: string): Kid {
  const file = join(TMP, `job-${++jobSeq}.json`);
  writeFileSync(file, J({ playersFile: PLAYERS_FILE, ...job }));
  const child = spawn("npx", ["tsx", WORKER], { cwd: ROOT, env: { ...ENV, S18_JOB: file, S18_GO: go }, shell: process.platform === "win32" });
  let text = "", buf = "", result: any = null;
  let readyFn: (v: boolean) => void = () => {};
  const ready = new Promise<boolean>((resolve) => { readyFn = resolve; });
  const onLine = (raw: string) => {
    const l = raw.trim();
    if (l.startsWith("@@READY")) readyFn(true);
    else if (l.startsWith("@@RESULT ")) { try { result = JSON.parse(l.slice("@@RESULT ".length)); } catch { result = null; } }
  };
  child.stdout.on("data", (d) => {
    const s = String(d);
    text += s; buf += s;
    for (let i = buf.indexOf(NL); i >= 0; i = buf.indexOf(NL)) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); }
  });
  child.stderr.on("data", (d) => { text += String(d); });
  const timer = setTimeout(() => killTree(child.pid), JOB_TIMEOUT_MS);
  const done = new Promise<any>((resolve) => child.on("exit", (code) => {
    clearTimeout(timer);
    if (buf) onLine(buf);
    readyFn(false);
    if (!result || result.threw) {
      console.error(`!! the ${String(job.kind)} worker ${result?.threw ? "threw" : `ended (${code}) without a result`}:${NL}${String(result?.threw ?? text.slice(-3_000))}`);
    }
    resolve(result ?? { ok: false, crashed: true, code });
  }));
  return { ready, done };
}
/** A job on its own, no barrier. */
const runJob = (job: Record<string, unknown>) => launch(job, "").done;
let goSeq = 0;
/** Two jobs at ONE instant: each loads, says READY, and both start together once both have. */
async function race(jobs: Array<Record<string, unknown>>): Promise<any[]> {
  const go = join(TMP, `go-${++goSeq}.json`);
  const kids = jobs.map((j) => launch({ ...j, race: true }, go));
  const ready = await Promise.all(kids.map((k) => k.ready));
  if (!ready.every(Boolean)) console.error("!! a worker of this act ended before the barrier; the other started alone, and the act is NOT RACED");
  writeFileSync(`${go}.tmp`, J({ at: Date.now() + 400 }));
  renameSync(`${go}.tmp`, go);
  return Promise.all(kids.map((k) => k.done));
}
const iso = (ms: number) => new Date(ms).toISOString();
/** A week sold and sealed all YES, or the act stops here with the worker's own words. */
async function weekOf(weeksAhead: number, lots: Array<{ group: string; tickets: number; slip: string; perPlayer: number }>) {
  const w = await runJob({ kind: "week", weeksAhead, lots });
  if (!w?.ok) throw new Error(`the week ${weeksAhead} ahead could not be prepared: ${J(w)}`);
  return { ...w, g: Date.parse(w.gradedSetFinalAt), E: Date.parse(w.windowEnd) };
}
const measured: string[] = [];

console.log(`${NL}S18 — the Millionea objection door across instances, on ${DB} (acts ${SECTIONS.join(", ")})`);
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
try {
  const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: ENV, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000 });
  ok("0.1 · prisma migrate deploy applies every migration", mig.status === 0, (mig.stderr ?? "").split(NL).slice(-3).join(" "));
  if (mig.status !== 0) throw new Error("migrate failed");

  // ── §0 · the licence, the guarantee, every player and both officers, made by ONE process ──────────────────────────
  const groups: Record<string, { count: number; balance: number }> = {
    aWin: { count: 2, balance: BALANCE }, aLose: { count: 1, balance: BALANCE },
    bWin: { count: 2, balance: BALANCE }, bObj: { count: 1, balance: BALANCE }, bLose: { count: 1, balance: BALANCE },
    cWin: { count: 2, balance: BALANCE }, cObj: { count: 1, balance: BALANCE }, cLose: { count: 1, balance: BALANCE },
    dWin: { count: 2, balance: BALANCE }, dObj: { count: 2, balance: BALANCE }, dLose: { count: 1, balance: BALANCE },
    eObj: { count: 1, balance: BALANCE }, eTwo: { count: 2, balance: BALANCE }, eLose: { count: 1, balance: BALANCE },
  };
  // Two officers with the ruling role (COMPLIANCE): neither sealed a question (the world's sealer did) nor holds a ticket.
  const setup = await runJob({ kind: "setup", guarantee: 30_000_000, groups, officers: { COMP_A: "COMPLIANCE", COMP_B: "COMPLIANCE" } });
  ok("0.2 · the licence, the Owner's guarantee, every player and both officers, through their own doors", setup?.ok === true, `${setup?.accounts} accounts`);
  if (!setup?.ok) throw new Error("setup failed");
  const P: Record<string, string[]> = JSON.parse(readFileSync(PLAYERS_FILE, "utf8"));
  const COMP_A = P.COMP_A[0], COMP_B = P.COMP_B[0];

  // ── §1 · a filing at the window's last millisecond against the release ──────────────────────────────────────────
  if (wants(1)) {
    console.log(`${NL}§1 · a filing at the window's last millisecond on one instance, the release on another past its end`);
    const A = await weekOf(2, [{ group: "aWin", tickets: 2, slip: "WIN", perPlayer: 1 }, { group: "aLose", tickets: 8, slip: "LOSE", perPlayer: 8 }]);
    const [f, r] = await race([
      { kind: "file", userId: P.aWin[0], weekId: A.weekId, slot: 2, at: iso(A.E - 1) },
      { kind: "release", weekId: A.weekId, at: iso(A.E + MIN) },
    ]);
    const filedFirst = f?.ok === true, releasedFirst = r?.ok === true && r.already === false;
    measured.push(`§1 · ${filedFirst ? "the filing" : releasedFirst ? "the release" : "neither"} landed (filing ${f?.ms} ms, release ${r?.ms} ms)`);
    ok("1.1 · ⭐ exactly one landed: the filing or the release, never both", [filedFirst, releasedFirst].filter(Boolean).length === 1, J({ f, r }));
    const c1 = await runJob({ kind: "check", weekId: A.weekId });
    ok("1.2 · ⭐ …and the other was refused for what the first left: an OPEN objection the release will not pass, or a SETTLED week no filing reaches",
      filedFirst
        ? /objection is standing/.test(String(r?.error)) && c1?.week?.state === "RESOLVING" && c1.payouts === 0 && c1.objections?.length === 1 && c1.objections[0].status === "OPEN"
        : f?.why === "WEEK_FINAL" && c1?.week?.state === "SETTLED" && c1.objections?.length === 0,
      J({ f, r, week: c1?.week, objections: c1?.objections }));
    if (filedFirst) {
      const rej = await runJob({ kind: "rule", objectionId: f.objectionId, officerId: COMP_A, ruling: "REJECT", weekId: A.weekId, slot: 2, at: iso(A.E + 2 * MIN) });
      const again = await runJob({ kind: "release", weekId: A.weekId, at: iso(A.E + 3 * MIN) });
      ok("1.3 · the objection decided (REJECT: no restart), the week settles once", rej?.ok === true && rej.restarted === false && again?.ok === true && again.already === false, J({ rej, again }));
    }
    const c1b = await runJob({ kind: "check", weekId: A.weekId, users: [...P.aWin, ...P.aLose] });
    ok("1.4 · the winners are the record's: both all-YES tickets paid one share each, the losing buyer nothing",
      c1b?.week?.state === "SETTLED" && J(c1b.winners) === J([...P.aWin].sort()) && c1b.payouts === 2
        && P.aWin.every((u) => c1b.users?.[u] === BALANCE - A.price + c1b.week.share) && c1b.users?.[P.aLose[0]] === BALANCE - 8 * A.price,
      J({ week: c1b?.week, winners: c1b?.winners, users: c1b?.users }));
  }

  // ── §2 · an upheld REVERSE against the release ──────────────────────────────────────────────────────────────────
  if (wants(2)) {
    console.log(`${NL}§2 · an upheld REVERSE on one instance and the release on another, at once`);
    const B = await weekOf(3, [{ group: "bWin", tickets: 2, slip: "WIN", perPlayer: 1 }, { group: "bObj", tickets: 1, slip: "M4NO", perPlayer: 1 },
      { group: "bLose", tickets: 7, slip: "LOSE", perPlayer: 7 }]);
    const filed = await runJob({ kind: "file", userId: P.bObj[0], weekId: B.weekId, slot: 4, at: iso(B.g + MIN) });
    if (!filed?.ok) throw new Error(`§2's filing was refused: ${J(filed)}`);
    const [u, r] = await race([
      { kind: "rule", objectionId: filed.objectionId, officerId: COMP_A, ruling: "REVERSE", weekId: B.weekId, slot: 4, at: iso(B.E + 30_000) },
      { kind: "release", weekId: B.weekId, at: iso(B.E + MIN) },
    ]);
    const c2 = await runJob({ kind: "check", weekId: B.weekId, slot: 4 });
    const E2 = Date.parse(c2?.week?.objectionsCloseAt ?? "");
    measured.push(`§2 · the release was refused as ${/objection is standing/.test(String(r?.error)) ? "the objection standing (the release ran first)" : /objection window/.test(String(r?.error)) ? "the restarted window (the ruling ran first)" : `"${r?.error}"`}`);
    ok("2.1 · ⭐ the ruling landed and the release did not: an objection stood before the ruling, and the restarted window after it",
      u?.ok === true && u.changed === true && u.restarted === true && r?.ok === false && /objection is standing|objection window is still open/.test(String(r?.error)) && c2?.payouts === 0,
      J({ u, r, payouts: c2?.payouts }));
    ok("2.2 · the record is the ruling's: M4 is NO, the window restarted once and ends after the old end",
      c2?.question?.outcome === "NO" && c2.week.objectionRestarted === true && E2 > B.E + MIN && c2.week.state === "RESOLVING", J({ question: c2?.question, week: c2?.week }));
    const settled = await runJob({ kind: "release", weekId: B.weekId, at: iso(E2 + MIN) });
    const c2b = await runJob({ kind: "check", weekId: B.weekId, users: [...P.bWin, ...P.bObj] });
    ok("2.3 · ⭐ once the restarted window ends the week pays on the final record: the M4-NO ticket wins its share, the all-YES tickets nothing",
      settled?.ok === true && settled.already === false && J(c2b?.winners) === J(P.bObj) && c2b.payouts === 1
        && c2b.users?.[P.bObj[0]] === BALANCE - B.price + c2b.week.share && P.bWin.every((x) => c2b.users?.[x] === BALANCE - B.price),
      J({ settled, winners: c2b?.winners, users: c2b?.users, share: c2b?.week?.share }));
  }

  // ── §3 · two officers, one case ─────────────────────────────────────────────────────────────────────────────────
  if (wants(3)) {
    console.log(`${NL}§3 · two officers ruling one case at once: a REVERSE on one instance, a REJECT on another`);
    const C = await weekOf(4, [{ group: "cWin", tickets: 2, slip: "WIN", perPlayer: 1 }, { group: "cObj", tickets: 1, slip: "M4NO", perPlayer: 1 },
      { group: "cLose", tickets: 7, slip: "LOSE", perPlayer: 7 }]);
    const filed = await runJob({ kind: "file", userId: P.cObj[0], weekId: C.weekId, slot: 4, at: iso(C.g + MIN) });
    if (!filed?.ok) throw new Error(`§3's filing was refused: ${J(filed)}`);
    const at = iso(C.g + 2 * MIN);
    const [ra, rb] = await race([
      { kind: "rule", objectionId: filed.objectionId, officerId: COMP_A, ruling: "REVERSE", weekId: C.weekId, slot: 4, at },
      { kind: "rule", objectionId: filed.objectionId, officerId: COMP_B, ruling: "REJECT", weekId: C.weekId, slot: 4, at },
    ]);
    const reversed = ra?.ok === true, rejected = rb?.ok === true;
    const loser = reversed ? rb : ra;
    measured.push(`§3 · the ${reversed ? "REVERSE" : rejected ? "REJECT" : "—"} landed; the other read: "${loser?.error}"`);
    ok("3.1 · ⭐ exactly one ruling landed; the other found the case decided", [reversed, rejected].filter(Boolean).length === 1
      && /already been decided|decided a moment ago/.test(String(loser?.error)), J({ ra, rb }));
    const c3 = await runJob({ kind: "check", weekId: C.weekId, slot: 4 });
    const o = c3?.objections?.find((x: any) => x.id === filed.objectionId);
    ok("3.2 · ⭐ the record is the one ruling's own: its status, remedy and officer; M4 flipped and the window restarted only for a REVERSE",
      reversed
        ? o?.status === "UPHELD" && o.remedy === "REVERSE" && o.reviewedBy === COMP_A && c3.question?.outcome === "NO" && c3.week.objectionRestarted === true
        : o?.status === "REJECTED" && o.remedy === null && o.reviewedBy === COMP_B && c3?.question?.outcome === "YES" && c3.week.objectionRestarted === false,
      J({ o, question: c3?.question, restarted: c3?.week?.objectionRestarted }));
    ok("3.3 · one ruling on the record: the filing's audit row and exactly one ruling row, the one that landed",
      J(o?.audits) === J(["maswali.objection.filed", reversed ? "maswali.objection.upheld" : "maswali.objection.rejected"].sort()), J(o?.audits));
  }

  // ── §4 · two REVERSEs of one question ───────────────────────────────────────────────────────────────────────────
  if (wants(4)) {
    console.log(`${NL}§4 · two officers each upholding a REVERSE of the same question, on two cases, at once`);
    const D = await weekOf(5, [{ group: "dWin", tickets: 2, slip: "WIN", perPlayer: 1 }, { group: "dObj", tickets: 2, slip: "M4NO", perPlayer: 1 },
      { group: "dLose", tickets: 6, slip: "LOSE", perPlayer: 6 }]);
    const f1 = await runJob({ kind: "file", userId: P.dObj[0], weekId: D.weekId, slot: 4, at: iso(D.g + MIN) });
    const f2 = await runJob({ kind: "file", userId: P.dObj[1], weekId: D.weekId, slot: 4, at: iso(D.g + MIN + 1_000) });
    if (!f1?.ok || !f2?.ok) throw new Error(`§4's filings were refused: ${J({ f1, f2 })}`);
    const at = iso(D.g + 2 * MIN);
    const [ra, rb] = await race([
      { kind: "rule", objectionId: f1.objectionId, officerId: COMP_A, ruling: "REVERSE", weekId: D.weekId, slot: 4, at },
      { kind: "rule", objectionId: f2.objectionId, officerId: COMP_B, ruling: "REVERSE", weekId: D.weekId, slot: 4, at },
    ]);
    const landed = [ra, rb].filter((x) => x?.ok === true), refused = [ra, rb].filter((x) => x?.ok !== true);
    ok("4.1 · ⭐ exactly one REVERSE landed; the other was ruled on a seal that had changed, and refused",
      landed.length === 1 && refused.length === 1 && /changed since you reviewed it/.test(String(refused[0]?.error)), J({ ra, rb }));
    const c4 = await runJob({ kind: "check", weekId: D.weekId, slot: 4 });
    const statuses = (c4?.objections ?? []).map((x: any) => x.status).sort();
    ok("4.2 · ⭐ M4 flipped ONCE (NO, never back to YES), the window restarted once, and the other case still stands OPEN for review",
      c4?.question?.outcome === "NO" && c4.week.objectionRestarted === true && J(statuses) === J(["OPEN", "UPHELD"]), J({ question: c4?.question, statuses }));
  }

  // ── §5 · two filings on one question ────────────────────────────────────────────────────────────────────────────
  if (wants(5)) {
    console.log(`${NL}§5 · one player filing on one question from two instances at once; then two players on one question`);
    const E = await weekOf(6, [{ group: "eObj", tickets: 1, slip: "WIN", perPlayer: 1 }, { group: "eTwo", tickets: 2, slip: "WIN", perPlayer: 1 },
      { group: "eLose", tickets: 7, slip: "LOSE", perPlayer: 7 }]);
    const at = iso(E.g + MIN);
    const [fa, fb] = await race([
      { kind: "file", userId: P.eObj[0], weekId: E.weekId, slot: 5, at },
      { kind: "file", userId: P.eObj[0], weekId: E.weekId, slot: 5, at },
    ]);
    const c5 = await runJob({ kind: "check", weekId: E.weekId });
    const mine = (c5?.objections ?? []).filter((x: any) => x.userId === P.eObj[0] && x.slot === 5);
    ok("5.1 · ⭐ one player, one question, two instances at once: one objection; the other filing refused as already objected",
      [fa, fb].filter((x) => x?.ok === true).length === 1 && [fa, fb].filter((x) => x?.why === "ALREADY_OBJECTED").length === 1 && mine.length === 1,
      J({ fa, fb, rows: mine.length }));
    const [ga, gb] = await race([
      { kind: "file", userId: P.eTwo[0], weekId: E.weekId, slot: 6, at },
      { kind: "file", userId: P.eTwo[1], weekId: E.weekId, slot: 6, at },
    ]);
    const c5b = await runJob({ kind: "check", weekId: E.weekId });
    const six = (c5b?.objections ?? []).filter((x: any) => x.slot === 6);
    ok("5.2 · two players on one question at once: both stand, one objection each", ga?.ok === true && gb?.ok === true && six.length === 2
      && new Set(six.map((x: any) => x.userId)).size === 2, J({ ga, gb, rows: six.length }));
  }

  // ── §6 · the identities ─────────────────────────────────────────────────────────────────────────────────────────
  console.log(`${NL}§6 · the identities over everything above`);
  const c6 = await runJob({ kind: "check", ledger: true });
  ok("6.1 · ⭐ the trial balance reconciles: no drifting wallet, no unbalanced ledger group", c6?.trialBalance?.ok === true && c6.trialBalance.checked > 0
    && c6.trialBalance.drifting === 0 && c6.trialBalance.imbalanced === 0 && c6.trialBalance.globalBalanced === true, J(c6?.trialBalance));
  ok("6.2 · ⭐ every Millionea invariant holds", c6?.invariants?.ok === true, J(c6?.invariants?.problems));
} catch (e) {
  ok("0.run · the drive completed", false, String((e as Error)?.message ?? e));
} finally {
  const drop = new pg.Client({ connectionString: RAW });
  try { await drop.connect(); await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); }
  catch (e) { console.error(`!! SCRATCH DATABASE NOT DROPPED — "${DB}" on ${BASE}: ${(e as Error).message}. Drop it by hand.`); }
  finally { try { await drop.end(); } catch { /* gone */ } }
  try { rmSync(TMP, { recursive: true, force: true }); } catch { /* the temp folder is not the measurement */ }
}
if (measured.length) console.log(`${NL}MEASURED · which side of each race landed first:${NL}${measured.map((m) => `  ${m}`).join(NL)}`);
console.log(`${NL}${fail === 0 ? "ALL PASS" : "FAILURES"} — load:maswali-objection-cross-instance: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
