/**
 * RED PROOF for `hand-rolled-split-bar` — the ui-consistency rule minted for PV-06.
 *
 * ⛔ "THE SUITE WENT RED" IS NOT ENOUGH HERE. `test:ui-consistency` carries 75 baselined
 * (rule,file) pairs, so a mutation that trips ANY other rule turns it red while proving nothing
 * about this one. Every mutation below therefore asserts that the output names
 * **hand-rolled-split-bar in the mutated file** — the value, not the symptom.
 *
 * The two mutations, and why each exists:
 *   1. THE DEFECT RETURNS — the Up & Down card draws its own two-span bar again, exactly as it
 *      shipped. This is the shape that advertised "Up 50% · 50% Down" on an empty round.
 *   2. ⭐ THE EXEMPTION IS PATH-PRECISE, NOT BASENAME-WIDE. `SPLIT_BAR_ALLOW` names
 *      `src/app/positions/page.tsx`. Every other allow-list in that file keys on `basename(f)`,
 *      and copying that idiom here would have exempted **every `page.tsx` in the App Router** —
 *      a list that silently stops policing the thing it names. So this plants the defect in a
 *      DIFFERENT `page.tsx` and requires it to still fire.
 *
 * Run: npm run red:split-bar
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => join(ROOT, ...s);

// ⛔ THE MUTATIONS LIVE IN `scripts/anchors/split-bar.anchors.mjs`, not here — that is what
// lets `test:red-anchors` statically prove each anchor still resolves EXACTLY ONCE against its
// file. An anchor that has drifted is an ABSENT test that fails in the direction of looking fine.
import { MUTATIONS } from "./anchors/split-bar.anchors.mjs";

const run = () =>
  spawnSync("npx", ["tsx", join(ROOT, "scripts", "ui-consistency.test.mts")], { encoding: "utf8", shell: true });

console.log("\nRED PROOF — hand-rolled-split-bar (DESIGN_AUTHORITY §B9 · one pool-split bar)\n");
const baseline = run();
if (baseline.status !== 0) {
  console.error("🔴 BASELINE IS ALREADY RED — a mutation cannot prove anything against it.");
  console.error((baseline.stdout + baseline.stderr).split(/\r?\n/).filter((l) => /drift|FAIL/.test(l)).slice(0, 6).join("\n"));
  process.exit(2);
}
console.log("  baseline: test:ui-consistency is GREEN — each mutation below must name THIS rule.\n");

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`▶ ${m.name}`);
  const target = p(...m.file.split("/"));
  const original = readFileSync(target, "utf8");
  let mutated;
  try {
    mutated = injectDefect(original, m.from, m.to);
  } catch (e) {
    console.error(`   ✗ ANCHOR PROBLEM — THIS MUTATION PROVES NOTHING: ${e.message}`);
    continue;
  }
  writeFileSync(target, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  // ⛔ THE SPECIFIC RULE, IN THE SPECIFIC FILE. `r.status !== 0` alone would be satisfied by any
  //    of the other 75 baselined pairs drifting.
  const named = out.includes("hand-rolled-split-bar") && out.includes(m.expect);
  const caught = r.status !== 0 && named;
  console.log(`   exit=${r.status}  names-this-rule-in-this-file=${named}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => /hand-rolled-split-bar/.test(l)).slice(0, 2)) {
    console.log(`     ${line.trim().slice(0, 140)}`);
  }
  writeFileSync(target, original, "utf8");
  if (readFileSync(target, "utf8") !== original) {
    console.error(`   🔴 REVERT FAILED on ${target} — stop and restore by hand`);
    process.exit(2);
  }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
