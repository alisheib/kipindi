#!/usr/bin/env node
/**
 * RED PROOF for `npm run test:query-core`.
 *
 * ⛔ A GATE NOBODY HAS SEEN FAIL IS A SUGGESTION. This reintroduces, one at a time, each defect
 * `src/lib/query/` exists to prevent, and asserts the gate goes red **on that defect's own
 * assertion** — not merely red. A syntax error, an unrelated regression, or a suite that crashed
 * before reaching the leg in question all look identical to a proof under exit-code matching.
 *
 * ⭐ AND IT WAS BUILT BEFORE THE GATE WAS BELIEVED, which is `DESIGN-BASELINE.md`'s rule and this
 * campaign's §8. The Stage-1 baseline is what taught it again: `red:filter-language` had been
 * ANCHOR-FAILING since `c977204e`, so assertion 5.6 — a bare `/\}, \[open\]\);/` over a file that
 * had grown a second `[open]` effect — would have stayed GREEN over the money-dialog focus defect
 * it names. The gate and its own proof agreed with each other and both were wrong.
 *
 * ⛔ IT EDITS REAL SOURCE and restores it from an in-memory copy in a `finally`, so an interrupted
 * run still leaves the tree clean. It re-reads every file afterwards and refuses to claim success
 * if one byte differs. Verify with `git diff` after.
 *
 * ⚠️ MUTATIONS ARE DECLARED AS DATA in `scripts/anchors/query-core.anchors.mjs`, so
 * `test:red-anchors` §3 can audit that every anchor still resolves EXACTLY ONCE without running
 * this. An inline anchor is one nobody can check without executing a harness that rewrites the
 * product.
 *
 * Run: npm run red:query-core
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/query-core.anchors.mjs";

const GATE = "scripts/query-core.test.mts";

function runGate() {
  try {
    const out = execFileSync("npx", ["tsx", GATE], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: String(out) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** A line that FAILED and carries the distinctive phrase — never merely "output contains it". */
const failedOn = (out, expect) =>
  out.split(/\r?\n/).some((l) => /^\s*FAIL\b/.test(l) && l.includes(expect));

const problems = [];

console.log("\n── baseline: the gate must be GREEN before anything is broken ──");
const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING: test:query-core is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1500));
  process.exit(1);
}
console.log("  PASS baseline green\n");

// Read every target ONCE, up front — the restore must not depend on a mutated read.
const FILES = [...new Set(MUTATIONS.map((m) => m.file))];
const originals = new Map(FILES.map((f) => [f, readFileSync(f, "utf8")]));

try {
  for (const [i, m] of MUTATIONS.entries()) {
    const original = originals.get(m.file);
    let mutated;
    try {
      // ⛔ Line-ending agnostic, through the shared helper: with `core.autocrlf=true` and no
      //    `.gitattributes` the working tree is CRLF, so a `\n` anchor matches nothing and the
      //    harness would call the product unprovable on a normal Windows clone.
      mutated = injectDefect(original, m.from, m.to);
    } catch (e) {
      problems.push(`case ${i + 1} (${m.name}): ANCHOR — ${e.message}`);
      console.log(`  ${i + 1}. ANCHOR FAIL  ${m.name}`);
      continue;
    }

    writeFileSync(m.file, mutated, "utf8");
    const r = runGate();
    writeFileSync(m.file, original, "utf8");

    if (r.code === 0) {
      problems.push(`case ${i + 1} (${m.name}): stayed GREEN`);
      console.log(`  ${i + 1}. NOT CAUGHT   ${m.name}`);
    } else if (!failedOn(r.out, m.expect)) {
      const lines = r.out.split(/\r?\n/).filter((l) => /^\s*FAIL\b/.test(l)).slice(0, 3);
      problems.push(`case ${i + 1} (${m.name}): red, but not on "${m.expect}" — ${lines.join(" | ")}`);
      console.log(`  ${i + 1}. WRONG REASON ${m.name}`);
    } else {
      console.log(`  ${i + 1}. ✓ RED on "${m.expect}"  ${m.name}`);
    }
  }
} finally {
  for (const [f, original] of originals) writeFileSync(f, original, "utf8");
}

// ⛔ The tree must be exactly as it was found. A harness that leaves a defect behind is worse than
//    no harness — the next run's precondition would refuse, and the next COMMIT would ship it.
let dirty = 0;
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) { console.error(`🔴 NOT RESTORED: ${f}`); dirty++; }
}
if (dirty === 0) console.log("\ntree restored byte-identical");

const after = runGate();
if (after.code !== 0) problems.push("the gate is RED on the restored tree — the restore did not restore");

console.log(`\n${MUTATIONS.length - problems.length}/${MUTATIONS.length} defects caught, each on its own assertion`);
if (problems.length || dirty) {
  console.error("");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log(`✅ every one of the ${MUTATIONS.length} defects is caught by test:query-core`);
