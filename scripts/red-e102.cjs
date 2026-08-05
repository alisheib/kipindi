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
  {
    name: "round-page-has-no-poller (the product as it shipped this morning)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `      <RefreshPoller {...refreshCadence({ settled: decided, awaitingResult })} />\n`,
    with: ``,
  },
  {
    name: "settled-round-keeps-polling-forever (the waste the rule exists to stop)",
    file: "src/lib/refresh-cadence.ts",
    find: `  if (settled) return { enabled: false, intervalMs: LIVE_ROUND_MS };`,
    with: `  if (settled) return { enabled: true, intervalMs: LIVE_ROUND_MS };`,
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
    find: `refreshCadence({ settled: decided, awaitingResult })`,
    with: `refreshCadence({ settled: false, awaitingResult: false })`,
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
