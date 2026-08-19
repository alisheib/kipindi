/**
 * RED PROOF for E-102 — a result that arrives must arrive on the screen.
 *
 *   node scripts/red-e102.cjs        (npm run red:refresh-cadence)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ MUTATION 1 IS THE PRODUCT AS IT SHIPPED: `/updown/[roundId]` genuinely had no poller. The
 * primary RED is the pre-fix tree itself, recorded at **11 passed, 5 failed, exit 1**. The rest
 * exist so the three ways this can silently regress — polling a decided round forever, losing
 * the tightened cadence, and accepting `enabled` without honouring it — each stay caught.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const SUITE = "scripts/refresh-cadence.test.mts";

const MUTATIONS = [
  // ⚠️ THREE ANCHORS WERE RE-CUT 2026-08-19 (E-166) AND THAT IS THE WHOLE E-108 LESSON PLAYING
  // OUT AGAIN. The handover arm reshaped all three subjects — the poller call grew a nested
  // `handover`, and the settled branch became an `if` block with a bounded exception inside it —
  // so every one of these anchors stopped matching. The harness did NOT fail: it printed
  // "ANCHOR NOT FOUND … proves NOTHING" and reported 2/5, which is the only reason this was
  // caught. ⛔ A mutation that cannot find its target is a mutation that proves nothing, and a
  // harness that scores itself out of the mutations it managed to apply would have read green.
  {
    name: "round-page-has-no-poller (the product as it shipped before E-102)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `      <RefreshPoller {...refreshCadence({`,
    with: `      <RefreshPoller {...({ enabled: false, intervalMs: 0 } as never)} {...(({`,
  },
  {
    name: "settled-round-keeps-polling-forever (the waste the rule exists to stop)",
    file: "src/lib/refresh-cadence.ts",
    find: `    return { enabled: false, intervalMs: LIVE_ROUND_MS };\n  }`,
    with: `    return { enabled: true, intervalMs: LIVE_ROUND_MS };\n  }`,
  },
  {
    // ⭐ E-166's OWN RED. The bounded exception is the one edit that could re-create the defect
    // above while looking like a feature: drop the deadline and a decided round polls for ever.
    name: "handover-poll-is-unbounded (the exception swallowing the rule)",
    file: "src/lib/refresh-cadence.ts",
    find: `    if (handover?.active && handover.nowMs <= handover.untilMs) {`,
    with: `    if (handover?.active) {`,
  },
  {
    // ⭐ …and the other half: a bound that is not really a bound.
    name: "handover-bound-is-infinite (a ceiling that is not one)",
    file: "src/lib/refresh-cadence.ts",
    find: `  if (successorOpensAtMs == null) return ceiling;`,
    with: `  if (successorOpensAtMs == null) return Number.POSITIVE_INFINITY;`,
  },
  {
    name: "result-phase-loses-its-tighter-cadence (a finished clock, then 20s of nothing)",
    file: "src/lib/refresh-cadence.ts",
    find: `  if (awaitingResult) return { enabled: true, intervalMs: AWAITING_RESULT_MS };`,
    with: `  if (awaitingResult) return { enabled: true, intervalMs: LIVE_ROUND_MS };`,
  },
  {
    name: "poller-ACCEPTS-enabled-but-ignores-it (the symbol without the behaviour)",
    file: "src/components/ui/refresh-poller.tsx",
    find: `    if (!enabled) return;`,
    with: `    if (!enabled) { /* honoured elsewhere */ }`,
  },
  {
    name: "cadence-called-with-constants (one cadence for every phase, rule-shaped)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `        settled: decided,\n        awaitingResult,`,
    with: `        settled: false,\n        awaitingResult: false,`,
  },
  {
    // ⭐ E-166 · the same mutation one level down, in the field that was added after §3.3 was
    // written. `active: true` is a permanent handover poll on a decided round.
    name: "handover-active-is-a-constant (a permanent poll wearing a new field name)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `          active: decided && round.successor.chainRunning && round.successor.roundId == null,`,
    with: `          active: true,`,
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
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN — and try its CRLF form, because most files
  // in this repo are CRLF and a multi-line `\n` anchor silently edits nothing (six occurrences).
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
