/**
 * RED PROOF for E-99's result clock.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. A previous harness in this repo printed "✓ RED" for three
 * mutations the guard silently passed, because it only checked that the bytes moved. Each
 * mutation here must make the suite EXIT NON-ZERO *and* report at least one FAIL, and every
 * mutation is a REVERT.
 *
 *   node .qa-s28/red-e99.cjs
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const FILE = "src/lib/updown-card-phase.ts";
const SUITE = "scripts/updown-result-clock.test.mts";

const MUTATIONS = [
  {
    name: "no-result-clock (the behaviour before E-99 shipped)",
    // The whole point: with the feature absent the card falls back to a dead 0:00.
    find: `  return { awaiting, targetMs: expectedResultAtMs, counting: nowMs < expectedResultAtMs };`,
    with: `  return { awaiting, targetMs: null, counting: false };`,
  },
  {
    name: "hardcoded-90s (a constant instead of the asset's own median)",
    find: `  return { awaiting, targetMs: expectedResultAtMs, counting: nowMs < expectedResultAtMs };`,
    with: `  return { awaiting, targetMs: closesAtMs + 90_000, counting: nowMs < closesAtMs + 90_000 };`,
  },
  {
    name: "counts-past-the-overrun (renders a dead 0:00 again)",
    find: `  return { awaiting, targetMs: expectedResultAtMs, counting: nowMs < expectedResultAtMs };`,
    with: `  return { awaiting, targetMs: expectedResultAtMs, counting: true };`,
  },
  {
    name: "invents-a-median-for-an-unmeasured-asset (A-5 fabrication)",
    find: `  if (!awaiting || expectedResultAtMs == null) {\n    return { awaiting, targetMs: null, counting: false };\n  }`,
    with: `  if (!awaiting) {\n    return { awaiting, targetMs: null, counting: false };\n  }\n  if (expectedResultAtMs == null) {\n    return { awaiting, targetMs: closesAtMs + 90_000, counting: true };\n  }`,
  },
];

const original = readFileSync(FILE, "utf8");
const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) { console.error("   the suite is not green to begin with — nothing can be proven"); process.exit(2); }

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN. CRLF has broken anchors in this repo four
  // times, and an anchor that is not found edits nothing while the run still looks orderly.
  if (!original.includes(m.find)) {
    console.error(`   ANCHOR NOT FOUND — this mutation proves NOTHING. Fix the anchor.`);
    continue;
  }
  writeFileSync(FILE, original.replace(m.find, m.with), "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failLine = out.match(/^(\d+) passed, (\d+) failed$/m);
  const failed = failLine ? Number(failLine[2]) : 0;
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 4)) console.log(`     ${line.trim()}`);
  writeFileSync(FILE, original, "utf8");
  if (readFileSync(FILE, "utf8") !== original) { console.error("   🔴 REVERT FAILED"); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
