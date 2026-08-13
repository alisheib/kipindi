/**
 * RED PROOF for `npm run test:board-discovery`.
 *
 * A gate nobody has watched fail is not evidence. This reintroduces the defects that gate
 * exists to prevent — each one a thing that actually shipped, or the kit's own proposal —
 * and asserts the gate goes red for every one.
 *
 * ⚠️ RE-ANCHORED 2026-08-13. The previous harness mutated `markets/page.tsx` by exact string
 * anchors (`const DEFAULT_WHEN: WhenFilter = "all";`, the `WHEN_CUTOFFS` table, the `sp.when`
 * readers). The round-2 discovery work deleted the 5-window rail those belonged to, so five of
 * its six cases could no longer find their anchor and silently reported "ANCHOR MISSING"
 * instead of failing — a red harness that has stopped proving anything is worse than none,
 * because the gate above it still prints green. The defects now live where the logic does:
 * mostly in the pure contract module, which is also why they can be injected precisely.
 *
 * Run: npm run red:board-discovery
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const CONTRACT = "src/lib/markets/discovery.ts";
const PAGE = "src/app/markets/page.tsx";

const originals = new Map([
  [CONTRACT, readFileSync(CONTRACT, "utf8")],
  [PAGE, readFileSync(PAGE, "utf8")],
]);

/** Every case is a defect with a provenance, not an invented mutation. */
const CASES = [
  {
    name: 'the landing board goes back to a 24-hour window (THE 2026-08-10 BUG)',
    file: CONTRACT,
    from: '  status: "open" as StatusId,',
    to: '  status: "today" as StatusId,',
  },
  {
    name: 'the default status quietly gains a clock (same harm, different spelling)',
    file: CONTRACT,
    from: '      return row.status === "LIVE" && !row.selectionClosed;',
    to: '      return row.status === "LIVE" && !row.selectionClosed && row.bettableUntilMs - nowMs <= DAY_MS;',
  },
  {
    name: 'counts computed over the census instead of the active filters',
    file: CONTRACT,
    from: "  const next = { ...state, ...patch };",
    to: "  const next = { ...state, ...patch, pool: 'any', odds: 'any', topic: 'all' };",
  },
  {
    name: '`New` drifts back to the kit\'s clock ("added in the last four days")',
    file: CONTRACT,
    from: '      return row.status === "LIVE" && row.pool === 0 && row.predictors === 0;',
    to: '      return row.status === "LIVE" && nowMs - row.createdAtMs <= 4 * DAY_MS;',
  },
  {
    name: '"recently resolved" goes back to slicing the ascending board order',
    file: PAGE,
    from: "    .sort((a, b) => b.resolutionAt.localeCompare(a.resolutionAt));",
    to: "    .slice();",
  },
  {
    name: "the page falls back to its own bare status literal again",
    file: PAGE,
    from: "  const state = parseDiscoveryParams(sp, MARKET_CATEGORIES);",
    to: '  const state = { ...parseDiscoveryParams(sp, MARKET_CATEGORIES), status: (sp.status as never) ?? "open" };',
  },
];

let failures = 0;

function gateExits() {
  try {
    execFileSync("npx", ["tsx", "scripts/board-discovery.test.mts"], { stdio: "pipe", shell: true });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

const restore = () => {
  for (const [f, s] of originals) writeFileSync(f, s, "utf8");
};

console.log("\nRED proof — board discovery\n");
try {
  const base = gateExits();
  console.log(base === 0 ? "  baseline: GREEN" : `  baseline: ⛔ ALREADY RED (exit ${base})`);
  if (base !== 0) failures++;
  console.log("");

  for (const c of CASES) {
    const src = originals.get(c.file);
    let mutated;
    try {
      // Shared with `discovery-contract-red.mjs` so a line-ending convention can never decide
      // whether this harness proves anything — see `scripts/red-anchor.mjs`.
      mutated = injectDefect(src, c.from, c.to);
    } catch (e) {
      console.log(`  ⛔ ${e.message} — ${c.name}\n     could not inject: ${c.from}`);
      failures++;
      continue;
    }
    writeFileSync(c.file, mutated, "utf8");
    const code = gateExits();
    restore();
    if (code === 0) {
      console.log(`  ⛔ NOT CAUGHT — ${c.name}`);
      failures++;
    } else {
      console.log(`  ✔ CAUGHT  ${c.name}`);
    }
  }
} finally {
  restore();
  const clean = [...originals].every(([f, s]) => readFileSync(f, "utf8") === s);
  console.log(`\n  files restored byte-for-byte: ${clean ? "yes" : "NO — check git diff"}`);
  if (!clean) failures++;
  console.log(`  suite green again: ${gateExits() === 0 ? "yes" : "NO"}`);
}

console.log(
  failures === 0
    ? `\n  ${CASES.length}/${CASES.length} cases correct\n`
    : `\n  ${failures} wrong — the gate does not catch everything it claims to\n`,
);
process.exit(failures === 0 ? 0 : 1);
