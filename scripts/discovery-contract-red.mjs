/**
 * RED PROOF for `npm run test:discovery-contract`.
 *
 * A gate that has never been seen to fail is not evidence. This reintroduces, one at a time,
 * the exact defects the contract exists to prevent — every one of them a real behaviour of the
 * design kit that shipped, not an invented mutation — and asserts the gate goes red for each.
 *
 * Run: npm run red:discovery-contract
 *
 * ⛔ It edits `src/lib/markets/discovery.ts` in place and restores it from an in-memory copy in
 * a `finally`, so an interrupted run still leaves the tree clean. Verify with `git diff` after.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const SRC = "src/lib/markets/discovery.ts";

/** Each mutation is a real defect, with the source of the behaviour it restores. */
const MUTATIONS = [
  {
    name: "absent move24h coerced to 0 (the kit prototype's own `Math.abs(m.move||0)`)",
    from: "return row.move24h == null ? null : Math.abs(row.move24h);",
    to: "return Math.abs(row.move24h ?? 0);",
    expect: "Biggest move",
  },
  {
    name: "cold-start markets admitted to the odds buckets on impliedYesPct's hardcoded 50",
    from: "  const pct = row.yesPct;\n  if (pct == null) return false;",
    to: "  const pct = row.yesPct ?? 50;",
    expect: "no pool is in NO odds bucket",
  },
  {
    name: "`open` counts a selection-closed market (the branch that makes Open lie)",
    from: '      return row.status === "LIVE" && !row.selectionClosed;',
    to: '      return row.status === "LIVE";',
    expect: "open EXCLUDES a selection-closed market",
  },
  {
    name: "`all` reaches into the settled archive /results already owns",
    from: '      return row.status === "LIVE" || row.status === "CLOSED";',
    to: '      return row.status !== "DRAFT";',
    expect: "all EXCLUDES RESOLVED",
  },
  {
    name: "counts computed over the census instead of cross-filtered (the 2026-08-10 shape)",
    from: "  const next = { ...state, ...patch };",
    to: "  const next = { ...state, ...patch, pool: 'any', odds: 'any', topic: 'all' };",
    expect: "respects the ACTIVE pool filter",
  },
  {
    name: "a default written into the URL, so a clean board no longer has a clean URL",
    from: '  if (s.status !== DEFAULTS.status) p.set("status", s.status);',
    to: '  p.set("status", s.status);',
    expect: "clean board has a clean URL",
  },
  {
    name: "ties left to JS sort stability (the grid reshuffles under the reader on refresh)",
    from: "  return TIE_BREAK[sort](a, b) || byId(a, b);\n}",
    to: "  return 0;\n}",
    expect: "ties are broken deterministically",
  },
];

const original = readFileSync(SRC, "utf8");
let failures = 0;

function gateExits() {
  try {
    execFileSync("npx", ["tsx", "scripts/discovery-contract.test.mts"], { stdio: "pipe", shell: true });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

try {
  console.log("\n── baseline: the gate must be GREEN before anything is broken ──");
  const base = gateExits();
  console.log(base === 0 ? "  PASS baseline green" : `  FAIL baseline is already red (exit ${base})`);
  if (base !== 0) { failures++; }

  for (const m of MUTATIONS) {
    let mutated;
    try {
      // ⛔ Line-ending agnostic ON PURPOSE. Two of these seven anchors span a line break, and with
      // `core.autocrlf=true` and no `.gitattributes` the working tree is CRLF — so a `\n` anchor
      // matched nothing and this harness called the product unprovable on a normal Windows clone.
      // See `scripts/red-anchor.mjs`.
      mutated = injectDefect(original, m.from, m.to);
    } catch (e) {
      console.log(`  FAIL ${e.message}: ${m.name}`);
      failures++;
      continue;
    }
    writeFileSync(SRC, mutated, "utf8");
    const code = gateExits();
    if (code === 0) {
      console.log(`  FAIL gate stayed GREEN with: ${m.name}`);
      failures++;
    } else {
      console.log(`  PASS gate went red (exit ${code}) on: ${m.name}`);
    }
  }
} finally {
  writeFileSync(SRC, original, "utf8");
  const restored = readFileSync(SRC, "utf8") === original;
  console.log(restored ? "\n  restored " + SRC : "\n  ⛔ RESTORE FAILED — check git diff " + SRC);
  if (!restored) failures++;
}

console.log(failures === 0
  ? `\n✅ every one of the ${MUTATIONS.length} defects is caught by test:discovery-contract`
  : `\n❌ ${failures} problem(s) — the gate does not catch everything it claims to`);
process.exit(failures === 0 ? 0 : 1);
