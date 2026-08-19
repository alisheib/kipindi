/**
 * RED PROOF for E-166 — round N ends, round N+1 takes the screen.
 *
 *   node scripts/updown-handover-red.mjs        (npm run red:updown-handover)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ MUTATION 1 IS THE PRODUCT AS IT SHIPPED THIS MORNING. `handoverClock` returning idle for
 * everything IS the pre-fix behaviour: on production 2026-08-19 a settled round rendered
 * `Round settled 00:00` under the header word "Resolved", with the poller already disabled
 * behind it. If the suite can be green over that, it is guarding nothing.
 *
 * ⛔ AND MUTATION 4 IS THE ONE THAT MATTERS MOST. `ready` is the single gate on a navigation;
 * loosening it to "the open instant has passed" sends a player to a round that does not exist,
 * because a boundary can arrive minutes before the bar that opens it. That mutation is
 * plausible, it is what a reasonable person would write, and it must be caught.
 *
 * ⚠️ THE ANCHORS ARE THE FRAGILE PART, and this harness has already watched its sibling rot:
 * `red-e102.cjs` lost three of five anchors the moment the handover arm reshaped their subjects,
 * and printed "ANCHOR NOT FOUND … proves NOTHING" rather than a false green. Keep that report —
 * a harness that scores itself out of the mutations it managed to apply is E-108 all over again.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
// ⛔ ONE DEFINITION. The sidecar is DATA and `test:red-anchors` imports the same array, so a
// mutation added here is audited in the same keystroke — see the sidecar's own header.
import { MUTATIONS } from "./anchors/updown-handover.anchors.mjs";

const SUITE = "scripts/updown-handover.test.mts";

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) { console.error("   the suite is not green to begin with — nothing can be proven"); process.exit(2); }

let proven = 0, anchorless = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN — and try its CRLF form, because most files in
  // this repo are CRLF and a multi-line `\n` anchor silently edits nothing.
  const find = original.includes(m.from) ? m.from : m.from.replace(/\n/g, "\r\n");
  const repl = find === m.from ? m.to : m.to.replace(/\n/g, "\r\n");
  if (!original.includes(find)) {
    console.error(`   ANCHOR NOT FOUND in ${m.file} — this mutation proves NOTHING. Fix the anchor.`);
    anchorless++;
    continue;
  }
  writeFileSync(m.file, original.replace(find, repl), "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const line = out.match(/^(?:ALL PASS|FAILURES) — (\d+) passed, (\d+) failed$/m);
  const failed = line ? Number(line[2]) : 0;
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const l of out.split(/\r?\n/).filter((x) => x.includes("FAIL")).slice(0, 3)) console.log(`     ${l.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error(`   🔴 REVERT FAILED on ${m.file}`); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
// ⛔ A MISSING ANCHOR IS A FAILURE, NOT A SKIP. Scoring out of the mutations that happened to
// apply is exactly how E-108's guards validated a dead block and stayed green for eight sessions.
if (anchorless > 0) console.error(`🔴 ${anchorless} mutation(s) had no anchor — repair them before trusting this harness.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
