/**
 * RED PROOF for E-104 — the phase must change at the boundary, not at the next poll.
 *
 *   node scripts/red-e104.cjs        (npm run red:updown-result-clock-boundary)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT.
 *
 * ⭐ THE PRIMARY RED IS THE PRE-FIX TREE, and it is not synthetic: before this shipped the pod
 * had no `useServerNow`, no `resultClock` call and no boundary props, so all SIX checks in §8
 * of `updown-result-clock.test.mts` failed against the product exactly as it was serving
 * production at 17:56 UTC, when it showed a dead `00:00` for fourteen seconds. These mutations
 * keep each half of the wiring honest afterwards.
 *
 * ⚠️ Separate from `red-e99.cjs` on purpose: that harness mutates ONE file (the pure rule) and
 * this one mutates the two call sites. Bolting a multi-file mode onto it would have rewritten a
 * harness that is currently 4/4 green, to save a file.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const SUITE = "scripts/updown-result-clock.test.mts";

const MUTATIONS = [
  {
    name: "pod-trusts-a-frozen-clock-again (a dead 0:00 at every close)",
    file: "src/components/updown/round-countdown.tsx",
    find: "  const now = useServerNow(serverNowMs);",
    with: "  const now: number | null = null;",
  },
  {
    // ⚠️ The first version of this mutation PREFIXED the call instead of removing it, so
    // `resultClock({` was still in the file and the check matched. A mutation that leaves the
    // thing it claims to remove proves nothing — it must actually delete the assignment.
    name: "pod-stops-asking-the-shared-rule (a second definition of the phase)",
    file: "src/components/updown/round-countdown.tsx",
    find: "  const clock = roundClosesAtMs != null && now != null\n    ? resultClock({",
    with: "  const clock = roundClosesAtMs != null && now != null\n    ? ({ awaiting: now >= roundClosesAtMs, targetMs: resultTargetMs, counting: true })\n    : null;\n  const unusedClock = false ? resultClockUnused({",
  },
  {
    name: "round-page-withholds-the-boundary (the pod cannot switch by itself)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: "            roundClosesAtMs={Date.parse(round.closesAt)}\n",
    with: "",
  },
  {
    name: "round-page-withholds-the-captions (the stale caption survives the switch)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: "            resultLabels={{",
    with: "            data-was-resultLabels={{",
  },
  {
    name: "live-clock-drops-its-server-anchor (the player runs on their own device clock)",
    file: "src/components/updown/round-countdown.tsx",
    find: "    const offset = serverNowMs != null ? serverNowMs - Date.now() : 0;\n    const tick = () => setNow(Date.now() + offset);",
    with: "    const tick = () => setNow(Date.now());",
  },
];

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) { console.error("   the suite is not green to begin with — nothing can be proven"); process.exit(2); }

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  // ⛔ CHECK THE ANCHOR, AND TRY ITS CRLF FORM — most files here are CRLF and a multi-line
  // `\n` anchor silently edits nothing while the run still looks orderly (six occurrences).
  const find = original.includes(m.find) ? m.find : m.find.replace(/\n/g, "\r\n");
  const repl = find === m.find ? m.with : m.with.replace(/\n/g, "\r\n");
  if (!original.includes(find)) {
    console.error(`   ANCHOR NOT FOUND in ${m.file} — this mutation proves NOTHING. Fix the anchor.`);
    continue;
  }
  writeFileSync(m.file, original.replace(find, repl), "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const line = out.match(/^(\d+) passed, (\d+) failed$/m);
  const failed = line ? Number(line[2]) : 0;
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const l of out.split(/\r?\n/).filter((x) => x.includes("FAIL")).slice(0, 3)) console.log(`     ${l.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error(`   🔴 REVERT FAILED on ${m.file}`); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
