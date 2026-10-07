#!/usr/bin/env node
/**
 * red:all — the RED fleet's reporting runner.
 *
 *   node scripts/red-all.mjs                 # every harness, table, exit 1 iff any failed
 *   node scripts/red-all.mjs --list          # enumerate without running
 *   node scripts/red-all.mjs --only updown   # harnesses whose key contains "updown"
 *   node scripts/red-all.mjs --filter a,b    # any of these substrings
 *   node scripts/red-all.mjs --skip contrast # drop these
 *   node scripts/red-all.mjs --bail          # stop at the first failure
 *   node scripts/red-all.mjs --timeout 600   # per-harness seconds (default 300)
 *   node scripts/red-all.mjs --orphan-wait 900  # Windows: how long a timed-out harness may run on (default 1800)
 *
 * ⛔ WHY THIS FILE EXISTS AT ALL. `red:all` used to be a 41-segment `&&` chain in
 * package.json. `&&` stops at the first non-zero exit, so the chain reported the FIRST
 * failure and then went silent — and a RED harness exits non-zero for two entirely
 * different reasons: the guard failed to catch a defect (a real finding), or the harness
 * could not find its own anchor (the harness is broken, not the guard). On 2026-08-15
 * `red:updown-readiness` was failing on five stale anchors at segment 32, so roughly thirty
 * harnesses after it had not run in days. Nobody knew, because the chain printed one red
 * line and exited 1 — which is exactly what a chain with one real failure looks like.
 *
 * ⛔ AND WHY IT STILL EXITS NON-ZERO. A runner that always exits 0 so that CI stays green
 * is the same disease one layer up: it converts thirty silent failures into thirty
 * *reported* failures that nothing acts on. This runs everything AND fails the build.
 *
 * ⭐ THE ENUMERATION IS STRUCTURAL, NEVER A HAND-LIST. Every `red:*` in package.json runs,
 * because the last hand-maintained list left `red:updown-bet-feedback` (`red-e64.cjs`) out
 * of the runner for eight days while it sat broken and honest, exiting 1 into a void
 * (FAILURE-INVENTORY §6.2.3). A list beside the thing it lists can only go stale, and it
 * goes stale silently. `npm run test:red-anchors` asserts this property separately, so the
 * enumeration cannot regress back into a literal.
 *
 * ⭐ AND IT MEASURES THE TREE, NOT THE HARNESS'S CLAIM ABOUT THE TREE. Every harness here
 * rewrites real source and restores it; `red:failure-reasons` once printed `tree restored`
 * while leaving two mutations on disk, because its restore set was a hard-coded list of six
 * files that did not include the seventh it had started mutating (§3.9). One of those
 * escapes — a bare `if (true)` — was swept into a commit and deployed to 50pick.tz, where
 * for two hours every hedging player read a false statement about their own money (§3.8).
 * So this runner fingerprints the working tree before and after EACH harness and reports
 * any harness that hands it back changed. ⛔ It never repairs the tree itself: a runner
 * that ran `git checkout` would destroy the uncommitted work of the session running it.
 * It names the paths and fails.
 *
 * ⛔ SEQUENTIAL, DELIBERATELY. These harnesses mutate real files in `src/`. Two running at
 * once would inject into each other's snapshots and restore each other's mutations, and the
 * verdicts would depend on scheduling. Slow and true beats fast and meaningless.
 *
 * ⚠️ SOME HARNESSES NEED AN ENVIRONMENT, AND THEIR FAILURE IS EXPECTED WITHOUT ONE — the same
 * shape `test-all.mjs` documents for `test:responsive` / `test:motion`. ⛔ Do not write the
 * number of them here; it drifted the first time this note was updated. They are the ones whose
 * defect is only observable in a laid-out page, and each refuses on its absent premise rather
 * than guessing:
 *
 *   · `red:results-filter` drives a real browser against a running board and needs **≥2 settled
 *     markets in ≥1 category** — on an empty board every promise/delivery pair is `0 ≤ 0` and
 *     proves nothing.
 *         npm run red:results-filter -- http://localhost:3017
 *   · `red:header-fit` (E-190) rewrites the top app bar and asks a real 1024px viewport whether
 *     a control went off the screen. It needs a **DEV** server on this working tree, because it
 *     signs in through `/auth/demo` — the header renders the bell and the avatar only when
 *     signed in, and those are the two controls the mutation severs.
 *         DATABASE_URL="" npx next dev -p 3011
 *         BASE=http://localhost:3011 npm run red:header-fit
 *   · `red:journey-header-fit` (Vodacom S6, A5 and A6) rewrites the journey header's rules in `globals.css` and asks real
 *     viewports from 320 to 1279, in sw, en and zh, through a staff preview pass, whether each S4 rule still holds. It
 *     needs an IN-MEMORY dev server on this tree started with DISABLE_ADMIN_TOTP=true, and it runs ONLY ALONE: it
 *     refuses without `--alone` on its own command line (its package script never passes it, so this runner cannot)
 *     and whenever KP_RED_ALL is set, which this runner sets for every harness it starts. Both refusals exit 2 before
 *     anything is written, so here it reads FAIL, premise absent — it runs for minutes, and on Windows this runner's
 *     timeout ends only npm's shell (see `outlived` below). Run it alone, detached, then `git diff --exit-code`:
 *         KP_BASE=http://localhost:3041 npm run red:journey-header-fit -- --alone
 *
 * Or drop them from a serverless run. `--skip` matches a SUBSTRING, so `header-fit` drops both header harnesses:
 *     npm run red:all -- --skip results-filter,header-fit
 * ⛔ They are NOT silently excused here. A runner that hides an unrunnable guard is the disease
 * this file exists to cure; they fail, and they say why.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const listOnly = args.includes("--list");
const bail = args.includes("--bail");
const timeoutMs = Number(flagValue("--timeout") ?? 300) * 1000;
const only = flagValue("--only");
const csv = (v) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const filterList = args.includes("--filter") ? csv(flagValue("--filter")) : null;
const skipList = args.includes("--skip") ? csv(flagValue("--skip")) : null;

// ⛔ Structural. Every `red:*` except this aggregator — see the header.
let harnesses = Object.keys(pkg.scripts)
  .filter((k) => k.startsWith("red:") && k !== "red:all")
  .map((k) => ({ key: k, cmd: pkg.scripts[k] }));

const declared = harnesses.length;
if (only) harnesses = harnesses.filter((h) => h.key.includes(only));
if (filterList) harnesses = harnesses.filter((h) => filterList.some((f) => h.key.includes(f)));
if (skipList) harnesses = harnesses.filter((h) => !skipList.some((f) => h.key.includes(f)));

if (listOnly) {
  for (const h of harnesses) console.log(`${h.key.padEnd(34)} ${h.cmd}`);
  console.log(`\n${harnesses.length} of ${declared} declared red:* harness(es)`);
  process.exit(0);
}

/* ── the working-tree fingerprint ────────────────────────────────────────────────────────
 * `git status --porcelain` alone is not enough: a file already modified by the session
 * shows as ` M path` both before and after, so a harness that corrupted it would compare
 * equal. Hashing the full patch as well makes the fingerprint sensitive to CONTENT, which
 * is the property §3.9 needed and did not have. */
function git(argv) {
  const r = spawnSync("git", argv, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? (r.stdout ?? "") : null;
}
const gitAvailable = git(["rev-parse", "--is-inside-work-tree"]) !== null;
function fingerprint() {
  if (!gitAvailable) return null;
  const status = git(["status", "--porcelain"]);
  const diff = git(["diff", "HEAD", "--no-ext-diff"]);
  if (status === null || diff === null) return null;
  return { status, hash: createHash("sha256").update(status).update(diff).digest("hex") };
}
/** The paths that differ between two `git status --porcelain` snapshots — or, when the same
 *  paths are dirty before and after (a content-only change on an already-dirty path), every
 *  path that is dirty after. */
function residuePaths(before, after) {
  // ⚠️ Never trim the status: a porcelain line is `XY path`, and a file changed only in the worktree reads ` M path`.
  // A trim() took that leading space off the FIRST line, so slice(3) printed `rc/lib/...` for `src/lib/...`.
  const set = (s) => new Set(s.split("\n").filter(Boolean).map((l) => l.slice(3)));
  const [b, a] = [set(before.status), set(after.status)];
  const appeared = [...a].filter((p) => !b.has(p));
  const vanished = [...b].filter((p) => !a.has(p));
  const named = appeared.length || vanished.length ? [...appeared, ...vanished] : [...a];
  return [...new Set(named)];
}

/* ── reading a harness's own verdict ─────────────────────────────────────────────────────
 * The fleet grew across many sessions and its summary lines are not uniform — `12/12
 * caught`, `RED HARNESS — 7/7 caught`, `tree restored · 18/18 defects caught`,
 * `9/11 required mutations caught (+2 documented-miss)`. Rather than impose one format on
 * 68 files, read the LAST `N/M …caught` on the stream. ⛔ The exit code, not this number,
 * decides pass/fail — the count is for the table, so a `10/16` reads as a measurement and
 * not merely as "red". A harness that prints no count still reports its exit code. */
const COUNT = /(\d+)\s*\/\s*(\d+)(?=[^\n]{0,60}caught)/g;
const ANCHOR = /ANCHOR NOT FOUND|anchor missing|anchor not found|anchor matches \d+/gi;

/* ── a timed-out harness, on Windows ─────────────────────────────────────────────────────
 * ⛔ ON WINDOWS THE TIMEOUT DOES NOT STOP THE HARNESS. spawnSync kills the shell it started (npm.cmd needs one), and
 * Windows does not take that shell's children with it: npm and the harness's own node process run on, still injecting
 * defects, while this loop starts the next harness beside them — exactly what "SEQUENTIAL, DELIBERATELY" forbids.
 * MEASURED 2026-10-07 (the Vodacom lane's WP12 turn A, in F:\kipindi-wp12): `red:house-bot-console` read TIME at 300 s
 * and went on mutating for twelve more minutes; the eleven harnesses that ran in that time all read DIRTY on its files,
 * and `red:house-bot-c5` refused to start because one of them was off HEAD. Killing it is no answer: a Windows kill
 * runs no handler, so the defect it was measuring stays on disk (`scripts/lib/red-restore-guard.mjs`). So the runner
 * WAITS for what the shell left behind — a harness puts its own files back on its way out — before it reads the tree or
 * starts the next one; and if that has not ended within --orphan-wait seconds, it stops the fleet and names the
 * processes. The default (4 h) is longer than any harness's own full run (red:house-bot-c5's header measures ~45 min),
 * so a default run on Windows waits a slow harness out rather than stopping at it; the cap is a backstop for one that
 * never ends. A TIME row still says the harness outran --timeout; give it room, as red:house-bot-c5's header says.
 */
const orphanWaitMs = Number(flagValue("--orphan-wait") ?? 14400) * 1000;
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** Every process now: pid → { parent, at (start, ms), name }. Null when the list cannot be read. */
function processTable() {
  const r = spawnSync("powershell", ["-NoProfile", "-Command",
    "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2} {3}' -f $_.ProcessId, $_.ParentProcessId, ([DateTimeOffset]$_.CreationDate).ToUnixTimeMilliseconds(), $_.Name }"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 60_000 });
  if (r.status !== 0) return null;
  const table = new Map();
  for (const line of (r.stdout ?? "").split(/\r?\n/)) {
    const [pid, parent, at, ...name] = line.trim().split(" ");
    if (/^\d+$/.test(pid) && /^\d+$/.test(parent) && /^\d+$/.test(at)) {
      table.set(Number(pid), { parent: Number(parent), at: Number(at), name: name.join(" ").toLowerCase() });
    }
  }
  return table;
}
/** The node processes descended from the (dead) shell `root`. Windows keeps an orphan's parent pid; a process older
 *  than the harness's own start is a stranger that reused a pid, never its child. Only node runs harness code: a
 *  leftover that never ends but writes nothing (a Postgres worker, esbuild's service) must not hold the fleet.
 *  ⚠️ The walk bridges ONE dead process, the root: the chain is shell → npm (node) → shell → [tsx →] harness (node),
 *  every link waits for its child, and only the root is killed. A link that died early would hide its children (they
 *  keep its pid, which nothing alive names) — then the next harness would start beside them, as before this block. */
function descendants(table, root, since) {
  const found = [];
  const queue = [root];
  while (queue.length) {
    const parent = queue.shift();
    for (const [pid, p] of table) {
      if (p.parent === parent && p.at >= since - 2000 && !found.includes(pid)) { found.push(pid); queue.push(pid); }
    }
  }
  return found.filter((pid) => table.get(pid).name === "node.exe");
}
/** Windows only: wait for what a timed-out harness left running → { pids, alive, names, waited, unreadable }; null
 *  elsewhere. A pid counts as still the harness's only while its start time is EXACTLY the one first read: a suite
 *  child that exits early frees its pid, and Windows hands pids out again within about a minute on a busy machine. One
 *  unreadable process list proves nothing either way, so it is asked again until the cap. */
function outlived(shellPid, since) {
  if (process.platform !== "win32" || !shellPid) return null;
  const t = Date.now();
  let table = processTable();
  while (!table && Date.now() - t < orphanWaitMs) { pause(5000); table = processTable(); }
  if (!table) return { pids: [], alive: [], names: new Map(), waited: Date.now() - t, unreadable: true };
  const pids = descendants(table, shellPid, since);
  const born = new Map(pids.map((pid) => [pid, table.get(pid).at]));
  const names = new Map(pids.map((pid) => [pid, table.get(pid).name]));
  let alive = pids;
  while (alive.length && Date.now() - t < orphanWaitMs) {
    pause(5000);
    const now = processTable();
    if (!now) continue; // keep the last answer and ask again
    alive = pids.filter((pid) => now.get(pid)?.at === born.get(pid));
  }
  return { pids, alive, names, waited: Date.now() - t, unreadable: false };
}

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
const results = [];
let stoppedBy = null;
const t0 = Date.now();
const hr = (n = 78) => "─".repeat(n);
const C = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", dim: "\x1b[90m", off: "\x1b[0m" };

console.log(`\n${hr()}\n  red:all — ${harnesses.length} harness(es)${harnesses.length === declared ? "" : ` of ${declared} declared`}\n${hr()}`);
if (!gitAvailable) console.log(`  ${C.yellow}⚠ not a git work tree — residue detection is OFF${C.off}`);

for (const h of harnesses) {
  const before = fingerprint();
  const start = Date.now();
  const r = spawnSync(npmCli, ["run", h.key], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32", // npm.cmd needs a shell on Windows
    // ⛔ KP_RED_ALL marks every harness this runner starts, so one that must never run from here can refuse
    // (`red:journey-header-fit`, Vodacom S6 A6): a rule written in this header is prose; a mark is a fact.
    env: { ...process.env, FORCE_COLOR: "0", KP_RED_ALL: "1" },
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
  });
  const ms = Date.now() - start;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const timedOut = r.error?.code === "ETIMEDOUT" || (r.status === null && r.signal);
  // ⛔ Before the tree is read: on Windows a timed-out harness is still running (see `outlived`).
  const ranOn = timedOut ? outlived(r.pid, start) : null;
  const after = fingerprint();

  const counts = [...out.matchAll(COUNT)];
  const last = counts.at(-1);
  const caught = last ? Number(last[1]) : null;
  const total = last ? Number(last[2]) : null;
  const anchors = (out.match(ANCHOR) ?? []).length;
  // A harness still running (or not known to have ended) is mid-write: its tree says nothing about its restore.
  const inFlight = Boolean(ranOn && (ranOn.alive.length || ranOn.unreadable));
  const residue = !inFlight && before && after && before.hash !== after.hash ? residuePaths(before, after) : [];

  const passed = r.status === 0 && !timedOut && residue.length === 0;
  results.push({ ...h, passed, ms, out, caught, total, anchors, residue, timedOut, status: r.status });

  const tag = timedOut
    ? `${C.yellow}TIME${C.off}`
    : residue.length
      ? `${C.red}DIRTY${C.off}`
      : passed
        ? `${C.green}PASS${C.off}`
        : `${C.red}FAIL${C.off}`;
  const score = last ? `${caught}/${total}`.padStart(7) : "      ·";
  const note = anchors ? `${C.yellow} ${anchors} anchor(s) unresolved${C.off}` : "";
  console.log(`  ${tag.padEnd(residue.length || timedOut ? 14 : 13)} ${h.key.padEnd(32)} ${score}  ${(ms / 1000).toFixed(1)}s${note}`);
  if (residue.length) {
    console.log(`${C.red}        │ ⛔ the harness handed back a CHANGED tree — restore is broken (§3.9):${C.off}`);
    for (const p of residue.slice(0, 8)) console.log(`${C.red}        │    ${p}${C.off}`);
  }
  if (!passed) {
    const tail = out.trim().split("\n").filter(Boolean).slice(-14).join("\n");
    console.log(`${C.dim}${tail.split("\n").map((l) => "        │ " + l).join("\n")}${C.off}`);
  }
  if (ranOn?.pids.length && !inFlight) {
    console.log(`${C.yellow}        │ ⏳ the timeout ended only npm's shell: ${ranOn.pids.length} process(es) of this harness ran on, and the runner waited ${(ranOn.waited / 1000).toFixed(0)}s for them before reading the tree${C.off}`);
  }
  if (inFlight) {
    const why = ranOn.unreadable
      ? `the process list could not be read for ${(ranOn.waited / 1000).toFixed(0)}s, so whether this harness still runs is unknown`
      : `still running after --orphan-wait ${orphanWaitMs / 1000}s: ${ranOn.alive.map((pid) => `${pid} (${ranOn.names.get(pid)})`).join(", ")}`;
    stoppedBy = { key: h.key, why };
    console.log(`${C.red}        │ ⛔ ${why}. Nothing may run beside a red drive, so the fleet STOPS here, and this${C.off}`);
    console.log(`${C.red}        │    harness's tree is not judged while it may still be writing. Let it finish (it puts its own${C.off}`);
    console.log(`${C.red}        │    files back), or stop it the way scripts/lib/red-restore-guard.mjs reads a stop — never by${C.off}`);
    console.log(`${C.red}        │    killing it — then check the tree with git status.${C.off}`);
    break;
  }
  if (bail && !passed) { console.log(`\n  --bail: stopping at the first failure`); break; }
}

const failed = results.filter((r) => !r.passed);
const dirty = results.filter((r) => r.residue.length);
const broken = results.filter((r) => r.anchors > 0);
const totalMs = Date.now() - t0;

console.log(`\n${hr()}`);
console.log(`  ${results.length - failed.length}/${results.length} harness(es) green · ${(totalMs / 1000).toFixed(1)}s total`);
if (broken.length) {
  console.log(`  ${C.yellow}UNRESOLVED ANCHORS${C.off} (the harness is broken, not the guard): ${broken.map((b) => `${b.key}(${b.anchors})`).join(", ")}`);
}
if (dirty.length) {
  console.log(`  ${C.red}LEFT THE TREE DIRTY${C.off}: ${dirty.map((d) => d.key).join(", ")}`);
  console.log(`  ${C.red}⛔ inspect and restore by hand before committing — this is how if (true) reached production.${C.off}`);
}
if (failed.length) console.log(`  ${C.red}FAILED${C.off}: ${failed.map((f) => f.key).join(", ")}`);
if (stoppedBy) {
  console.log(`  ${C.red}STOPPED${C.off} after ${stoppedBy.key} (${stoppedBy.why}), so ${harnesses.length - results.length} harness(es) did not run`);
}
console.log(`${hr()}\n`);

process.exit(failed.length || stoppedBy ? 1 : 0);
