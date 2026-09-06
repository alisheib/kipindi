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
import { MUTATIONS } from "./anchors/discovery-contract.anchors.mjs";

const SRC = "src/lib/markets/discovery.ts";

/**
 * ⛔ THE MUTATIONS ARE DECLARED AS DATA IN `scripts/anchors/discovery-contract.anchors.mjs`.
 *
 * They were inline until 2026-09-06. `test:red-anchors` §3 audits declaration FILES, so an
 * inline anchor is one nobody can check without running a harness that rewrites real source —
 * and on that same day its sibling `board-discovery-red.mjs` proved the cost: an anchor rotted
 * against a repaired line, the harness printed `anchor missing`, and the gate above it went on
 * printing green.
 */

const original = readFileSync(SRC, "utf8");
let failures = 0;

/**
 * 🔴 THIS USED TO RETURN THE EXIT CODE ALONE, AND EVERY MUTATION ALREADY CARRIED AN `expect`
 * THAT NOTHING READ — corrected 2026-09-06. The data declared "this defect must break THAT
 * assertion" and the runner checked only that something, somewhere, went red. A syntax error, an
 * unrelated regression, or a suite that crashed before reaching the leg in question all look
 * identical to a proof under exit-code matching, and the file's own header claimed the stronger
 * property. It now matches the FAILING LINE.
 */
function runGate() {
  try {
    const out = execFileSync("npx", ["tsx", "scripts/discovery-contract.test.mts"], { stdio: "pipe", shell: true });
    return { code: 0, out: String(out) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}
const gateExits = () => runGate().code;

/** A line that FAILED and carries the distinctive phrase — see board-discovery-red.mjs. */
const failedOn = (out, expect) =>
  out.split(/\r?\n/).some((l) => /^\s*FAIL\b/.test(l) && l.includes(expect));

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
    const { code, out } = runGate();
    if (code === 0) {
      console.log(`  FAIL gate stayed GREEN with: ${m.name}\n       ${m.why ?? ""}`);
      failures++;
    } else if (m.expect && !failedOn(out, m.expect)) {
      console.log(`  FAIL gate went red for the WRONG REASON on: ${m.name}\n       expected a FAIL line containing: ${m.expect}`);
      failures++;
    } else {
      console.log(`  PASS gate went red on its own assertion (${m.expect}): ${m.name}`);
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
