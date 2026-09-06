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
import { MUTATIONS } from "./anchors/board-discovery.anchors.mjs";

// (The file paths live with the mutations, in scripts/anchors/board-discovery.anchors.mjs.)

/**
 * ⛔ DERIVED FROM THE MUTATIONS, NOT HAND-LISTED. It was a two-entry literal until 2026-09-06,
 * so a case naming a third file would have read `undefined` as its source and thrown somewhere
 * unhelpful — and, worse, that file would never have been snapshotted, so the restore-and-verify
 * in the `finally` would have reported a clean tree while leaving a real edit on disk. A red
 * harness that mutates the repo and then certifies it clean is the failure this fleet has
 * already paid for once.
 */
const originals = new Map(MUTATIONS.map((m) => [m.file, readFileSync(m.file, "utf8")]));

/**
 * ⛔ THE CASES ARE DECLARED AS DATA IN `scripts/anchors/board-discovery.anchors.mjs`, NOT HERE.
 *
 * 🔴 They were inline until 2026-09-06, and that cost exactly what the sidecar convention exists
 * to prevent. Repairing a live defect in `matchesStatus`'s `new` arm moved the line the
 * `new-drifts-to-a-clock` case anchored on; this harness printed `anchor missing` in the middle
 * of an otherwise healthy-looking run, and `test:red-anchors` §3 could not audit it because it
 * audits declaration FILES and this harness had none. A red proof that has stopped proving
 * anything is worse than no proof, because the gate above it still prints green.
 */
const CASES = MUTATIONS;

let failures = 0;

/**
 * Run the gate and return BOTH its exit code and what it printed.
 *
 * ⭐ THE OUTPUT IS THE POINT. Matching on a non-zero exit alone cannot distinguish a defect
 * caught by the assertion that exists to catch it from a syntax error, an unrelated regression,
 * or a suite that crashed before it ever reached that leg — all three "go red". So every case
 * declares the assertion it must break and this harness matches `FAIL <expect>`.
 */
function runGate() {
  try {
    const out = execFileSync("npx", ["tsx", "scripts/board-discovery.test.mts"], { stdio: "pipe", shell: true });
    return { code: 0, out: String(out) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}
const gateExits = () => runGate().code;

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
    const { code, out } = runGate();
    restore();
    if (code === 0) {
      console.log(`  ⛔ NOT CAUGHT — ${c.name}\n     ${c.why}`);
      failures++;
    // ⚠️ MATCHED PER LINE, not as `FAIL ${expect}`. The gate's labels carry section numbers and
    // markers ("6.5 · ⛔ getBoard does not…"), so a naive prefix match forces every `expect` to
    // restate a label verbatim — and then a label reworded for clarity silently turns a proof
    // into a "wrong reason". A line that FAILED and contains the distinctive phrase is the
    // property actually meant.
    } else if (c.expect && !out.split(/\r?\n/).some((l) => /^\s*FAIL\b/.test(l) && l.includes(c.expect))) {
      // ⛔ RED FOR THE WRONG REASON IS NOT A PASS. The gate fell over, but not on the assertion
      // this defect was supposed to break — so this case is proving something else, or nothing.
      console.log(`  ⛔ WRONG REASON — ${c.name}\n     expected the gate to print: FAIL ${c.expect}`);
      failures++;
    } else {
      console.log(`  ✔ CAUGHT  ${c.name} — on its own assertion`);
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
