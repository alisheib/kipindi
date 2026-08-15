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
/** The paths that differ between two `git status --porcelain` snapshots, plus — for a
 *  content-only change on an already-dirty path — whatever `git diff --name-only` names. */
function residuePaths(before, after) {
  const set = (s) => new Set(s.trim().split("\n").filter(Boolean).map((l) => l.slice(3)));
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

const npmCli = process.platform === "win32" ? "npm.cmd" : "npm";
const results = [];
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
    env: { ...process.env, FORCE_COLOR: "0" },
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
  });
  const ms = Date.now() - start;
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const after = fingerprint();

  const timedOut = r.error?.code === "ETIMEDOUT" || (r.status === null && r.signal);
  const counts = [...out.matchAll(COUNT)];
  const last = counts.at(-1);
  const caught = last ? Number(last[1]) : null;
  const total = last ? Number(last[2]) : null;
  const anchors = (out.match(ANCHOR) ?? []).length;
  const residue = before && after && before.hash !== after.hash ? residuePaths(before, after) : [];

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
console.log(`${hr()}\n`);

process.exit(failed.length ? 1 : 0);
