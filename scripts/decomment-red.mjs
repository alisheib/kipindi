/**
 * RED harness for `npm run test:decomment`.          `npm run red:decomment`
 *
 * ⭐ WHY. The gate it proves is a gate about INVISIBLE INFRASTRUCTURE. When a
 * comment stripper silently reads less than it should, every guard built on it
 * prints ALL PASS over the hole — which is indistinguishable from health, and is
 * precisely how `E-186` survived until a red mutation MISSED and exposed it. A
 * guard nobody has watched fail is a guard that may be asserting nothing.
 *
 * ⛔ IT DOES NOT WRITE TO src/ OR scripts/. Two sessions share this working tree.
 * Every mutation goes to a COPY of the repo in the OS temp dir; the gate is aimed
 * at it with `DECOMMENT_ROOT` and prints the root it read on every run, so the
 * harness can require proof that the mutant is what it measured.
 *
 * ⛔ AN UNMATCHED ANCHOR IS A BROKEN HARNESS, reported as such and never as a
 * MISS. And "it exited non-zero" is not evidence: the run must name the CHECK
 * that failed, and that check must be the one the mutation targets.
 *
 * ⛔ ANCHORS GO THROUGH `red-anchor.mjs`, NOT THROUGH `String.includes`. Measured 2026-10-08 on a Windows
 * checkout: six of the twelve anchors reported "anchor not found" and not one line of the code they point
 * at had moved. All six span a line break. `core.autocrlf=true` and there is no `.gitattributes` rule for
 * these files, so the working tree holds CRLF while the anchors are written with `\n` — the verdict
 * depended on how the tree had been checked out, which is the shape `scripts/red-anchor.mjs`'s header
 * records paying for twice already. Meanwhile `test:red-anchors` §3 audited the very same anchors through
 * `resolveAnchor` and called them fine, so the audit and the harness disagreed about one string.
 * `injectDefect` matches in the FILE's own line-ending convention, refuses an anchor that matches twice,
 * and never hands back an unchanged file: the harness now injects with the function §3 audits with.
 *
 * ⛔ THE UNMUTATED TREE IS RUN FIRST, because "the gate failed this check" proves nothing about a plant if
 * the gate fails it anyway. `test:decomment` §2.1 (the private-stripper ratchet) can stand over its ceiling
 * for reasons that have nothing to do with this harness, and `a-private-stripper-escapes-the-population-
 * count` targets exactly that check. For a check the baseline already fails, the mutant must fail it
 * DIFFERENTLY — the line the gate prints has to change, as the count does when a stripper is added — and an
 * identical line is reported as VACUOUS, which counts as a miss. A check the baseline passes is judged as
 * before: the mutant must fail it by name.
 *
 * ⚠️ Each mutation copies `src/` and `scripts/` and spawns `npx tsx`, so a
 * `tsc --noEmit` started in the same breath can fail spuriously on Windows with
 * no diagnostics. Re-run it before believing it.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/decomment.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/decomment.test.mts";

let caught = 0, missed = 0, broken = 0;
const results = [];
const roots = [];
const cleanUp = () => { for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* temp dir */ } } };

/** A fresh COPY of `src/` and `scripts/` in the OS temp dir — the only place anything is ever mutated. */
function copyOfRepo() {
  const root = mkdtempSync(join(tmpdir(), "decomment-red-"));
  roots.push(root);
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });
  return root;
}

/**
 * The gate under test is the COPY's own, so a mutation inside scripts/lib/decomment.mts is the module the gate
 * actually imports. "It exited non-zero" is not evidence: `wrong` is set unless the gate proved it read THIS tree.
 */
function runGate(root) {
  let out = "", exit = 0;
  try {
    out = execSync(`npx tsx "${join(root, GATE)}"`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, DECOMMENT_ROOT: root },
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    exit = e.status ?? 1;
  }
  let wrong = "";
  if (!out.includes("DECOMMENT_ROOT override")) {
    wrong = "the gate never reported reading a mutant tree";
  } else {
    const rootLine = out.split("\n").find((l) => l.trim().startsWith("root:")) ?? "";
    if (!rootLine.includes(root.split("\\").join("/")) && !rootLine.includes(root)) wrong = `it read some other tree: ${rootLine.trim()}`;
  }
  return { exit, wrong, failed: out.split("\n").filter((l) => l.trim().startsWith("FAIL ")) };
}

/** A FAIL line with the tree it was printed from taken out, so two runs over different copies compare equal. */
const bare = (line, root) => line.trim().split(root).join("<root>").split(root.split("\\").join("/")).join("<root>");

// ⛔ THE UNMUTATED TREE FIRST (see the header): what it already fails is not evidence for any plant.
const baseRoot = copyOfRepo();
const base = runGate(baseRoot);
if (base.wrong) {
  console.log(`RED harness — npm run test:decomment\n\n  BROKEN HARNESS  the baseline run on the unmutated tree: ${base.wrong}`);
  cleanUp();
  process.exit(1);
}

for (const [i, m] of MUTATIONS.entries()) {
  const root = copyOfRepo();

  const label = `${String(i + 1).padStart(2)}. ${m.name}\n        ${m.why}`;
  const p = join(root, m.file);

  if (!existsSync(p)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${m.file} does not exist — this proves NOTHING; fix the anchor`);
    continue;
  }
  let mutated;
  try {
    mutated = injectDefect(readFileSync(p, "utf8"), m.from, m.to);
  } catch (e) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${e.message} (${m.file}) — this proves NOTHING; fix the anchor`);
    continue;
  }
  writeFileSync(p, mutated, "utf8");

  const run = runGate(root);
  if (run.wrong) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${run.wrong}`);
    continue;
  }

  const named = run.failed.find((l) => l.includes(m.check));
  const already = base.failed.find((l) => l.includes(m.check));   // the same check, already red on the unmutated tree

  if (run.exit !== 0 && named && already && bare(named, root) === bare(already, baseRoot)) {
    missed++;
    results.push(`  VACUOUS         ${label}\n        the unmutated tree already fails "${m.check}" with this very line — the plant moved nothing it can see`);
  } else if (run.exit !== 0 && named) {
    caught++;
    results.push(`  CAUGHT          ${label}\n        → ${named.trim().slice(0, 130)}` +
      (already ? `\n        ⚠ already red on the unmutated tree; the plant changed what it reports — before: ${already.trim().slice(0, 100)}` : ""));
  } else if (run.exit !== 0) {
    missed++;
    results.push(`  WRONG CHECK     ${label}\n        gate failed, but not on "${m.check}" — it failed on: ` +
      (run.failed.map((l) => l.trim().slice(5, 64)).join(" | ") || "(none named)"));
  } else {
    missed++;
    results.push(`  MISSED          ${label}\n        the gate reported ALL PASS on a mutant tree`);
  }
}

cleanUp();

console.log("RED harness — npm run test:decomment (the shared comment stripper)\n");
console.log(base.failed.length === 0 && base.exit === 0
  ? "  BASELINE        the unmutated tree is green\n"
  : `  BASELINE        the unmutated tree is already RED (not this harness's doing) on: ` +
    `${base.failed.map((l) => l.trim().slice(5, 110)).join(" | ") || "(exit " + base.exit + ", no FAIL line)"}\n`);
console.log(results.join("\n"));
console.log(`\n${caught}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken harness`);
process.exit(missed || broken ? 1 : 0);
