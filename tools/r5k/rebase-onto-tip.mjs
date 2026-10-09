// R5-K's change, RE-BASED onto vodacom-visual's tip (89893725d, R5-G merged) in the scratchpad only — no worktree, index
// or ref is touched. Everything is in git's own form (LF: the repo is autocrlf, so the blobs are LF and the worktree CRLF).
// Each file is a three-way merge (git merge-file): R5-K's file (the worktree, CRLF → LF), its base (9677a3f54) and the
// integration tip's. theirs/ = the tip's files; ours/ = the merge, its three overlaps resolved:
//   1. package.json — R5-G's "test:visual-pass-r5g" line and R5-K's "test:visual-pass-r5k" line, both, in that order;
//   2. scripts/visual-pass-r5d.test.mts — 2.8's PAGES: R5-G's "/wallet/deposit" row (its h1) and R5-K's return row;
//   3. src/app/wallet/withdraw/* — R5-G moved the drawing into withdraw-ghost.tsx: its loading.tsx is kept as R5-G wrote
//      it, and R5-K's withdraw hunk lands on withdraw-ghost.tsx (port/withdraw-ghost.r5k.tsx = R5-G's file + the hunk);
//   + src/app/profile/loading.tsx — the help row takes the page's new title key (R5-G renamed it: `t.common.help`).
// Then a git patch (full index lines, so `git apply -3` can fall back) is written: rebase/r5k-on-89893725d.patch.
//   node rebase-onto-tip.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/";
const R = S + "r5k/rebase/";
const BASE = "9677a3f54", TIP = "89893725d";
const REPO = "F:/kipindi-r5k/";
const show = (rev, p) => { try { return execFileSync("git", ["show", `${rev}:${p}`], { cwd: REPO, maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const lf = (b) => Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const once = (s, from, to, what) => { if (s.split(from).length !== 2) throw new Error(`${what}: not found once`); return s.replace(from, () => to); };
rmSync(R, { recursive: true, force: true });
mkdirSync(R + "tmp", { recursive: true });
const put = (side, p, buf) => { mkdirSync(dirname(R + side + "/" + p), { recursive: true }); writeFileSync(R + side + "/" + p, buf); };
const patch = readFileSync(S + "r5k.patch", "utf8");
const paths = [...patch.matchAll(/^diff --git a\/(\S+) b\/\S+$/gm)].map((m) => m[1]);
const report = [];
for (const p of paths) {
  const mine = lf(readFileSync(REPO + p)), base = show(BASE, p), theirs = show(TIP, p);
  if (base && !lf(base).equals(base)) throw new Error(`${p}: a CRLF blob — not expected`);
  if (theirs) put("theirs", p, theirs);
  if (p === "src/app/wallet/withdraw/loading.tsx") { put("ours", p, theirs); report.push(`${p}: R5-G's file kept (the drawing moved to withdraw-ghost.tsx)`); continue; }
  if (!base && !theirs) { put("ours", p, mine); report.push(`${p}: new`); continue; }
  if (theirs && base && theirs.equals(base)) { put("ours", p, mine); report.push(`${p}: R5-K's (the tip did not touch it)`); continue; }
  writeFileSync(R + "tmp/mine", mine); writeFileSync(R + "tmp/base", base); writeFileSync(R + "tmp/theirs", theirs);
  const r = spawnSync("git", ["merge-file", "-p", "-L", "r5k", "-L", "base", "-L", "tip", R + "tmp/mine", R + "tmp/base", R + "tmp/theirs"], { maxBuffer: 64 << 20 });
  if (r.status === 0) { put("ours", p, r.stdout); report.push(`${p}: three-way merge, clean`); continue; }
  const s = theirs.toString("utf8");
  if (p === "package.json") {
    // R5-K's one line (its diff from the base is that line alone), after R5-G's.
    const g = '    "test:visual-pass-r5g": "tsx scripts/visual-pass-r5g.test.mts",\n';
    put("ours", p, Buffer.from(once(s, g, g + '    "test:visual-pass-r5k": "tsx scripts/visual-pass-r5k.test.mts",\n', "package.json r5g line"), "utf8"));
    report.push(`${p}: ${r.status} adjacent conflict — resolved: R5-G's suite line, then R5-K's`);
    continue;
  }
  if (p === "scripts/visual-pass-r5d.test.mts") {
    // R5-K's change here is that return row alone (its diff from the base): the tip's file with its return row replaced.
    const theirsRow = `    ["/wallet/deposit/return", () => 'class="rounded-card border border-border bg-bg-elevated p-6 space-y-4 kp-shimmer-track"'],\n`;
    const oursRows = "    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-K): the provider's return ghost draws the page's bands now — the hero, the\n"
      + "    // receipt's rows, the footnote — not the centred card; its footnote is the page's sentence, set and not shown.\n"
      + `    ["/wallet/deposit/return", (l) => dict[l].wallet.returnFootnote],\n`;
    put("ours", p, Buffer.from(once(s, theirsRow, oursRows, "r5d return row"), "utf8"));
    report.push(`${p}: ${r.status} adjacent conflict — resolved: R5-G's deposit row, then R5-K's return row`);
    continue;
  }
  throw new Error(`${p}: ${r.status} conflict(s) — not expected`);
}
// The two single-hunk resolutions above assume R5-K's diff in those files is that hunk alone — check it.
for (const [p, want] of [["package.json", 1], ["scripts/visual-pass-r5d.test.mts", 1]]) {
  const d = execFileSync("git", ["diff", "-U0", BASE, "--", p], { cwd: REPO, encoding: "utf8" });
  const hunks = (d.match(/^@@ /gm) ?? []).length;
  if (hunks !== want) throw new Error(`${p}: R5-K's diff has ${hunks} hunks, the resolution assumes ${want}`);
}
// withdraw-ghost.tsx: R5-G's file + R5-K's hunk (the port).
{
  const p = "src/app/wallet/withdraw/withdraw-ghost.tsx";
  const tip = show(TIP, p);
  if (!tip || !tip.equals(readFileSync(S + "r5k/port/withdraw-ghost.r5g.tsx"))) throw new Error("withdraw-ghost.tsx moved since the port was made");
  put("theirs", p, tip);
  put("ours", p, readFileSync(S + "r5k/port/withdraw-ghost.r5k.tsx"));
  report.push(`${p}: R5-G's drawing + R5-K's withdraw hunk (the port)`);
}
// The profile ghost's help row in the page's (R5-G's) words.
{
  const f = R + "ours/src/app/profile/loading.tsx";
  writeFileSync(f, once(readFileSync(f, "utf8"), "  [t.profile.helpSupport, t.profile.helpSupportSub],\n", "  [t.common.help, t.profile.helpSupportSub],\n", "profile ghost help row"));
  report.push("src/app/profile/loading.tsx: + the help row's title `t.common.help` (R5-G renamed the page's row)");
}
rmSync(R + "tmp", { recursive: true, force: true });
// Nothing in ours/ may carry a conflict marker or a CR.
for (const p of [...paths, "src/app/wallet/withdraw/withdraw-ghost.tsx"]) {
  const s = readFileSync(R + "ours/" + p, "utf8");
  if (/^(<<<<<<<|=======|>>>>>>>)( |$)/m.test(s)) throw new Error(`${p}: a conflict marker is left`);
  if (s.includes("\r")) throw new Error(`${p}: a CR in git's form`);
}
// The patch: tip → ours, in git's own format with full index lines.
const d = spawnSync("git", ["diff", "--no-index", "--full-index", "--binary", "theirs", "ours"], { cwd: R, maxBuffer: 64 << 20, encoding: "utf8" });
if (d.status !== 1) throw new Error(`git diff --no-index: status ${d.status} ${d.stderr}`);
const fixed = d.stdout.split("\n").map((line) => (line.startsWith("diff --git ") || line.startsWith("--- ") || line.startsWith("+++ ")) ? line.replace(/\b([ab])\/(?:theirs|ours)\//g, "$1/") : line).join("\n");
writeFileSync(R + "r5k-on-89893725d.patch", fixed);
const files = [...fixed.matchAll(/^diff --git a\/(\S+) /gm)].map((m) => m[1]);
for (const line of report) console.log("  " + line);
console.log(`rebase: ${files.length} files in rebase/r5k-on-89893725d.patch (${fixed.length} bytes)`);
