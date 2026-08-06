/**
 * RED PROOF for G1 — the duration gate's second axis.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report ≥1 failure, and every mutation is a REVERT verified byte-for-byte.
 *
 * ⭐ THE FOUR THAT MATTER MOST:
 *  · `axis-removed` restores the world before this build — a gate that asks only whether the
 *    asset can be PRICED in time. If that is ever MISSED the axis is decorative.
 *  · `blocks-on-an-inference` lets a verdict computed from a LONGER window refuse an operator's
 *    write. That is a model refusing a human, and it is the thing §2 exists to forbid.
 *  · `judges-by-a-shorter-window` claims more movement than a round can produce — the
 *    optimistic direction, the one that costs players their round.
 *  · `gap-list-returns` reinstates the query bug that made gold look unmeasured: filtering the
 *    pair gaps to the durations we expected, when real boundaries sit 18 minutes apart.
 *
 *   npm run red:updown-movement
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const MOVE = "src/lib/updown-movement.ts";
const SYMBOLS = "src/lib/server/updown-symbols.ts";
const CONFIG = "src/lib/server/updown-config.ts";
const CONSOLE = "src/app/admin/updown/page.tsx";
const HISTORY = "src/lib/server/updown-feed-history.ts";
const SUITE = "scripts/updown-movement.test.mts";

const MUTATIONS = [
  {
    name: "⭐ axis-removed — the gate asks only 'can it be priced', as it did before this build",
    file: SYMBOLS,
    find: `  if (movement && movement.level === 3) return { level: 3, reason: movement.message };`,
    with: `  void movement;`,
  },
  {
    name: "⭐ blocks-on-an-inference — a longer window refuses a write it has no evidence about",
    file: MOVE,
    find: `    if (!inferred) {`,
    with: `    if (true) {`,
  },
  {
    name: "⭐ judges-by-a-shorter-window — claims more movement than the round can produce",
    file: MOVE,
    find: `    .filter((w) => w.gapMinutes >= durationMinutes && w.samples >= MIN_MOVE_SAMPLES)`,
    with: `    .filter((w) => w.samples >= MIN_MOVE_SAMPLES)`,
  },
  {
    name: "⭐ gap-list-returns — the query asks the data only about the gaps we expected",
    file: HISTORY,
    find: `     where gap_min > 0`,
    with: `     where gap_min in (1,3,5,10,15,30,60)`,
  },
  {
    name: "the sample floor is dropped, so two readings become a verdict",
    file: MOVE,
    find: `export const MIN_MOVE_SAMPLES = 20;`,
    with: `export const MIN_MOVE_SAMPLES = 1;`,
  },
  {
    name: "a thin mover stops being a caution — gold's 2.1× reads as fine",
    file: MOVE,
    find: `export const MOVE_CAUTION_HEADROOM = 3;`,
    with: `export const MOVE_CAUTION_HEADROOM = 0;`,
  },
  {
    name: "the caution sentence stops naming the window it was measured over",
    file: MOVE,
    find: `    : \`over \${w.gapMinutes} minutes (\${w.samples} samples)\`;`,
    with: `    : "";`,
  },
  {
    name: "the server write path stops passing the movement record (console greys, server accepts)",
    file: CONFIG,
    find: `  const durationErr = validateSymbolDuration(asset.symbol, input.durationMinutes, measured, movement);`,
    with: `  const durationErr = validateSymbolDuration(asset.symbol, input.durationMinutes, measured);`,
  },
  {
    name: "the console stops passing it, so a greyed option and the server disagree",
    file: CONSOLE,
    find: `const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d), feed?.movement(a.key, d));`,
    with: `const r = symbolReadiness(findSymbol(a.symbol), d, feed?.advise(a.key, d));`,
  },
  {
    name: "an UNMEASURED movement verdict is pinned to every option as a warning",
    file: SYMBOLS,
    find: `  if (movement && movement.level === 2 && !movement.unmeasured) caveats.push(movement.message);`,
    with: `  if (movement && movement.level === 2) caveats.push(movement.message);`,
  },
  {
    name: "the rolling window is removed, so the query's cost grows with the table for ever",
    file: HISTORY,
    find: `         and o."boundaryAt" >= now() - interval '30 days'`,
    with: `         and o."boundaryAt" >= now() - interval '3000 days'`,
  },
  {
    name: "⭐ stripComments returns EMPTY — §5's wiring checks would pass over \"\"",
    file: SUITE,
    find: `const stripComments = (s: string) => s.replace`,
    with: `const stripComments = (s: string) => ("" && s).replace`,
  },
];

function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}  ${before.stdout.match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) { console.error("   ✗ not green to begin with"); process.exit(2); }

let proven = 0, documented = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  const find = resolve(original, m.find);
  if (!find) { console.error(`   ✗ ANCHOR NOT FOUND in ${m.file} — THIS MUTATION PROVES NOTHING.`); continue; }
  const mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (mutated === original) { console.error(`   ✗ FILE UNCHANGED — PROVES NOTHING.`); continue; }
  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^updown-movement: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${m.expectMiss ? (caught ? "⚠️ CAUGHT (better than documented)" : "· missed, AS DOCUMENTED") : caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 3)) console.log(`     ${line.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error("   🔴 REVERT FAILED"); process.exit(2); }
  if (m.expectMiss) documented++; else if (caught) proven++;
}

const required = MUTATIONS.filter((m) => !m.expectMiss).length;
console.log(`\n${proven}/${required} required mutations caught (+${documented} documented-miss) — files restored byte-for-byte.`);
process.exit(proven === required ? 0 : 1);
