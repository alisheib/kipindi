/**
 * RED PROOF for D2 — the honest multiplier and the empty-side state.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report ≥1 failure, and every mutation is a REVERT verified byte-for-byte.
 *
 * ⭐ THE FOUR THAT MATTER MOST:
 *  · `flat-constant-returns` restores the exact defect: one number for both sides, whatever the
 *    pool holds. If that is ever MISSED this guard has stopped guarding the feature.
 *  · `empty-side-silent` removes the sentence — the round then refunds a player who was never
 *    told it might, which is the post-hoc disappointment D2 exists to convert into a choice.
 *  · `warns-the-filler` is the subtle one: warn the player who is about to FILL the empty side
 *    and the sentence becomes false the instant they tap.
 *  · `rounds-up` makes the printed figure round rather than floor — a payout estimate nudged
 *    upwards on a money surface.
 *
 *   npm run red:updown-pricing
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const PRICING = "src/lib/updown-pricing.ts";
const BOARD = "src/lib/server/updown-board.ts";
const CONTROLS = "src/components/updown/updown-stake-controls.tsx";
const PANEL = "src/components/updown/round-stake-panel.tsx";
const SUITE = "scripts/updown-pricing.test.mts";

const MUTATIONS = [
  {
    name: "⭐ flat-constant-returns — THE DEFECT ITSELF: one number for both sides, whatever the pool holds",
    file: PRICING,
    find: `    const ratio = payout / stake;`,
    with: `    const ratio = 1.5; void payout;`,
  },
  {
    name: "⭐ empty-side-silent — the round stops naming the side nobody has backed",
    file: PRICING,
    find: `  if (up <= 0 && down <= 0) return "BOTH";`,
    with: `  if (true) return null;\n  if (up <= 0 && down <= 0) return "BOTH";`,
  },
  {
    name: "⭐ warns-the-filler — the player about to FILL the empty side is told their stake comes back",
    file: PRICING,
    find: `  return empty === side ? null : empty;`,
    with: `  return empty;`,
  },
  {
    name: "⭐ rounds-up — a payout estimate nudged UPWARDS on a money surface",
    file: PRICING,
    find: `  return (Math.floor(m * f + 1e-9) / f).toFixed(digits);`,
    with: `  return m.toFixed(digits);`,
  },
  {
    name: "pools-from-the-rounded-percentage — 0 and 400 on a 100,000 pool become the same number",
    file: BOARD,
    find: `      upPool: m.yesPool,`,
    with: `      upPool: Math.round((m.yesPool + m.noPool) * impliedYesPct(m) / 100),`,
  },
  {
    name: "live-rates-instead-of-the-round's-frozen-snapshot (a retune would reprice a placed bet)",
    file: BOARD,
    find: `        feeModel: rates.feeModel,`,
    with: `        feeModel: "capped-commission" as const,`,
  },
  {
    name: "the display switch is assumed ON rather than read from the poll",
    file: BOARD,
    find: `      show: rates.showEstimatedWinnings === true,`,
    with: `      show: true,`,
  },
  {
    name: "both buttons share ONE multiplier again (the two sides stop disagreeing)",
    file: CONTROLS,
    find: `  const multDown = impliedMultiplier(pricing, "DOWN", bet.stake);`,
    with: `  const multDown = multUp;`,
  },
  {
    name: "the round panel projects from a rate again instead of the pool",
    file: PANEL,
    find: `  const projected = bet.stakeReady ? projectedReturn(pricing, lockedSide, bet.stake) : null;`,
    with: `  const projected = bet.stakeReady ? Math.round(bet.stake * 1.5) : null;`,
  },
  {
    name: "the panel uses the round-wide rule instead of the side-aware one",
    file: PANEL,
    find: `  const warn = refundWarningFor(pricing, lockedSide);`,
    with: `  const warn = refundWarningFor(pricing, lockedSide === "UP" ? "UP" : "UP");`,
    // ⚠️ EXPECTED TO BE MISSED: §5.11 asserts the CALL SHAPE `refundWarningFor(pricing, lockedSide`
    // and this mutation keeps a `lockedSide` token inside the parentheses. It is here to be
    // reported honestly — the check guards that the side-aware function is called with the
    // locked side, not that no expression can be smuggled into the argument.
    expectMiss: true,
  },
  {
    // ⚠️ RE-ANCHORED 2026-09-03 (PV-10). The old anchor carried `opacity-85` AND a
    // trailing " est." that had not existed in this file for a while — this mutation
    // has been reporting "ANCHOR NOT FOUND" (proving nothing) since before PV-10 ever
    // touched this line; PV-10 dropped `opacity-85` for a real AA contrast fix
    // (test:contrast §P-u2) and made the drift worth fixing rather than re-measuring
    // past. Re-anchored to the literal that actually ships.
    name: "⭐ the multiplier escapes into gold — earned-money ink on an unplaced bet (RG)",
    file: CONTROLS,
    find: `<span className="font-mono text-[12.5px]">× {formatMultiplier(multUp)}</span>`,
    with: `<span className="font-mono text-[12.5px]" style={{ color: "var(--gold-300)" }}>× {formatMultiplier(multUp)}</span>`,
  },
  {
    name: "⭐ stripComments returns EMPTY — every absence check would pass over \"\"",
    file: SUITE,
    find: `function stripComments(src: string): string {\n  return src`,
    with: `function stripComments(src: string): string {\n  return "" && src`,
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
  const failed = Number(out.match(/^updown-pricing: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
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
