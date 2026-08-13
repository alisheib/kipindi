/**
 * RED proof for `npm run test:hero-contract`.
 *
 * A gate nobody has watched fail is a gate nobody should trust. This reintroduces, one at a time,
 * the six defects the hero contract exists to stop — and asserts not merely that the gate goes red
 * but that it goes red ON THE ASSERTION THAT NAMES THAT DEFECT. A guard failing for the wrong
 * reason is not a proof (`qa:results-board` reds against production because its premise is absent,
 * which proves nothing about the defect it was written for).
 *
 * ⭐ CASE 2 BREAKS THE POSITIVE CONTROL ON PURPOSE. `pricedYesPct` is made to return null for
 * everything — the "an empty pool has NO price" assertion still passes, and the run must still go
 * red, via the control beside it. That is the difference between a check and a check that cannot
 * fail: without the control, a hero that priced NOTHING would satisfy every cold-start assertion
 * in the file.
 *
 * Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's own line-ending convention
 * (a `\n` anchor cannot match a CRLF checkout, which once made a harness call the product
 * unprovable), and refused outright if they match twice.
 *
 * Run: npm run red:hero-contract
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const DISCOVERY = "src/lib/markets/discovery.ts";
const HERO = "src/lib/markets/hero.ts";

/** Each case: the file, the exact code to replace, the defect, and the assertion that must break. */
const CASES = [
  {
    name: "an empty pool is priced at 50 again (the licence-condition-1 defect itself)",
    file: DISCOVERY,
    from: "  if (pool <= 0) return null;",
    to: "  if (pool <= 0) return 50;",
    expect: "an empty pool has NO price",
  },
  {
    name: "NOTHING is ever priced — must be caught by the POSITIVE CONTROL, not the null checks",
    file: DISCOVERY,
    from: "  if (pool <= 0) return null;\n  return Math.round((yesPool / pool) * 100);",
    to: "  if (pool <= 0) return null;\n  return null;",
    expect: "a staked market IS priced (positive control)",
  },
  {
    name: "the aggregate share becomes the MEAN of the per-market percentages",
    file: HERO,
    from: "    yesShare: pricedYesPct(sumYes, sumNo),",
    to: "    yesShare: open.length === 0 ? null : Math.round(open.reduce((s, r) => s + (r.yesPct ?? 0), 0) / open.length),",
    expect: "weights by the money on each market",
  },
  {
    name: "the pool total counts shut, closed and settled markets as 'in play'",
    file: HERO,
    from: "  const open = rows.filter((r) => matchesStatus(r, \"open\", nowMs));",
    to: "  const open = rows.slice();",
    expect: "counts only markets a player can bet on now",
  },
  {
    name: "the question board stops ordering by closing-soonest",
    file: HERO,
    from: "  const ordered = sortRows(open, { sort: \"closing\", dir: null });",
    to: "  const ordered = open.slice();",
    expect: "soonest first",
  },
  {
    name: "the card is pinned to the LAST market instead of coming from the ordering",
    file: HERO,
    from: "    featured: ordered[0] ?? null,",
    to: "    featured: ordered[ordered.length - 1] ?? null,",
    expect: "the featured card is the soonest-closing market",
  },
  {
    // 🔴 THE DUPLICATION DEFECT, REINTRODUCED. This is precisely what shipped in `1de3b38d`: the
    // board started at [0], so the hero stated its lead market TWICE — row 1 and the featured card,
    // same title and same price, 400px apart. Every gate was green over it and the per-band clips
    // could not show it; it was found by reading a whole-page frame. Now it cannot come back
    // silently.
    name: "the board starts at the featured market again (the hero states its lead twice)",
    file: HERO,
    from: "    board: ordered.slice(1, 1 + QUESTION_BOARD_SIZE),",
    to: "    board: ordered.slice(0, QUESTION_BOARD_SIZE),",
    expect: "the featured market is NEVER also a board row",
  },
];

function runGate() {
  const r = spawnSync("npx", ["tsx", "scripts/hero-contract.test.mts"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** The FAIL lines only — so "went red" can be checked against WHICH assertion broke. */
const failedLabels = (out) =>
  out.split(/\r?\n/).filter((l) => l.trim().startsWith("FAIL ")).map((l) => l.trim().slice(5));

let bad = 0;
const say = (m) => console.log(m);

say("RED proof — the hero contract must fail on each reintroduced defect\n");

// ── the gate must be GREEN before we start, or every "went red" below is meaningless ──────────
const before = runGate();
if (before.code !== 0) {
  say("  FAIL the gate is not green before any mutation — nothing below would prove anything");
  say(before.out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 8).map((l) => "    " + l).join("\n"));
  process.exit(1);
}
say("  PASS the gate is green before any mutation (the premise)\n");

for (const c of CASES) {
  const original = readFileSync(c.file, "utf8");
  let mutated;
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
    say(`  FAIL ${c.name}`);
    say(`       anchor problem in ${c.file}: ${e.message}`);
    bad++;
    continue;
  }

  try {
    writeFileSync(c.file, mutated, "utf8");
    const { code, out } = runGate();
    const labels = failedLabels(out);
    const hit = labels.some((l) => l.includes(c.expect));
    if (code !== 0 && hit) {
      say(`  PASS ${c.name}`);
      say(`       → red on: ${labels.find((l) => l.includes(c.expect))}`);
    } else if (code === 0) {
      say(`  FAIL ${c.name}`);
      say("       the gate stayed GREEN with the defect in place — it does not guard this");
      bad++;
    } else {
      say(`  FAIL ${c.name}`);
      say(`       the gate went red, but on the WRONG assertion(s): ${labels.join(" | ") || "(none parsed)"}`);
      say(`       expected an assertion containing: ${c.expect}`);
      bad++;
    }
  } finally {
    // Always restore, even if the gate run threw — a harness that leaves a defect in the tree is
    // worse than no harness.
    writeFileSync(c.file, original, "utf8");
  }
}

// ── and green again afterwards, so the restore is proven rather than assumed ──────────────────
const after = runGate();
if (after.code === 0) say("\n  PASS the gate is green again — every mutation was restored");
else {
  say("\n  FAIL the gate is RED after restore — the tree was left mutated");
  bad++;
}

say(`\n${bad === 0 ? "PASS" : "FAIL"} — ${CASES.length - bad}/${CASES.length} defects provably caught`);
process.exit(bad ? 1 : 0);
