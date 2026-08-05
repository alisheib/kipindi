/**
 * RED PROOF for E-98's guard (`combobox-trigger-truncates` in ui-consistency).
 *
 * ⛔ A MUTATION MUST LOCATE ITS TARGET EXACTLY AS THE GUARD DOES, or the harness edits text
 * the guard never reads and a real defect goes unproven while the run looks orderly (§0.1a).
 * The guard slices from `role="combobox"` to the next `</button>` and strips comments, so
 * this puts `truncate` back on the trigger's VALUE SPAN — inside that window, in code.
 *
 * ⛔ AND "THE FILE CHANGED" IS NOT A RED. The suite must EXIT NON-ZERO and name the rule.
 * A previous harness printed "✓ RED" for three mutations the guard silently passed because
 * it only checked that the bytes moved.
 *
 *   railway run -s 50pick -- node .qa-s28/red-e98.cjs
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const FILE = "src/components/ui/select.tsx";
const ANCHOR = '<span className="min-w-0 flex-1 [overflow-wrap:anywhere]">';
const MUTANT = '<span className="truncate">';

const original = readFileSync(FILE, "utf8");
if (!original.includes(ANCHOR)) {
  console.error(`ANCHOR NOT FOUND in ${FILE} — the mutation would have proven nothing.`);
  console.error(`(CRLF has broken anchors here four times; this file is checked, not assumed.)`);
  process.exit(2);
}

const run = () => spawnSync("npx", ["tsx", "scripts/ui-consistency.test.mts"],
  { encoding: "utf8", shell: true });

// ⛔ "THE OUTPUT MENTIONS THE RULE" IS NOT A SIGNAL. The suite prints every rule id in its
// baseline table whether or not it fired, so `includes("combobox-trigger-truncates")` is TRUE
// on a perfectly clean tree — it discriminates nothing, and the first version of this harness
// reported it as though it did. What discriminates is the DRIFT LINE the suite emits only when
// a rule's count rises above baseline: `... in <file>: 0 → 1`.
const drifted = (out) => /combobox-trigger-truncates[^\n]*:\s*0\s*→\s*1/.test(out);

console.log("── 1 · the guard on the FIXED tree (must be green, and must NOT report drift) ──");
const before = run();
const beforeOut = before.stdout + before.stderr;
console.log(`   exit=${before.status}  reports drift on this rule: ${drifted(beforeOut)}`);

console.log("\n── 2 · put the defect back, exactly where the guard looks ──");
writeFileSync(FILE, original.replace(ANCHOR, MUTANT), "utf8");
const after = run();
const out = after.stdout + after.stderr;
const named = drifted(out);
console.log(`   exit=${after.status}  reports drift on this rule: ${named}`);
for (const line of out.split(/\r?\n/).filter((l) => /combobox-trigger-truncates|FAIL|failed/i.test(l)).slice(0, 8))
  console.log(`     ${line.trim()}`);

console.log("\n── 3 · REVERT (every mutation is a revert, always) ──");
writeFileSync(FILE, original, "utf8");
const restored = readFileSync(FILE, "utf8") === original;
console.log(`   file restored byte-for-byte: ${restored}`);

const RED = after.status !== 0 && named && restored;
console.log(`\n${RED ? "✓ RED PROVEN" : "✗ NOT PROVEN"} — guard exits non-zero AND names the rule when the defect returns.`);
process.exit(RED ? 0 : 1);
