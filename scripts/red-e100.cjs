/**
 * RED PROOF for E-100's guard (`unwrappable-identifier` in ui-consistency).
 *
 * ⛔ The mutation restores THE EXACT SYMPTOM ALI PHOTOGRAPHED — the wallet's TICKET box without
 * `break-all` — so the proof is about the reported defect, not a lookalike.
 * ⛔ "The output mentions the rule" is NOT a signal: every rule id prints in the baseline table
 * whether or not it fired. The discriminating signal is the drift line `…: 0 → 1`.
 *
 *   node .qa-s28/red-e100.cjs
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const FILE = "src/app/wallet/wallet-client.tsx";
const ANCHOR = `className="font-mono text-[11px] tracking-[0.04em] text-brand-300 break-all underline-offset-2 hover:underline">{tx.positionId}`;
const MUTANT = `className="font-mono text-[11px] tracking-[0.04em] text-brand-300 tabular-nums underline-offset-2 hover:underline">{tx.positionId}`;

const original = readFileSync(FILE, "utf8");
if (!original.includes(ANCHOR)) {
  console.error(`ANCHOR NOT FOUND in ${FILE} — the mutation would prove nothing.`);
  process.exit(2);
}

const run = () => spawnSync("npx", ["tsx", "scripts/ui-consistency.test.mts"], { encoding: "utf8", shell: true });
const drifted = (out) => /unwrappable-identifier[^\n]*:\s*0\s*→\s*1/.test(out);

console.log("── 1 · the guard on the FIXED tree (green, no drift) ──");
const before = run();
console.log(`   exit=${before.status}  drift on this rule: ${drifted(before.stdout + before.stderr)}`);

console.log("\n── 2 · restore the exact defect Ali photographed (ticket box loses break-all) ──");
writeFileSync(FILE, original.replace(ANCHOR, MUTANT), "utf8");
const after = run();
const out = after.stdout + after.stderr;
const caught = drifted(out);
console.log(`   exit=${after.status}  drift on this rule: ${caught}`);
for (const l of out.split(/\r?\n/).filter((l) => /unwrappable-identifier|wallet-client/.test(l)).slice(0, 6)) console.log(`     ${l.trim()}`);

console.log("\n── 3 · REVERT ──");
writeFileSync(FILE, original, "utf8");
const restored = readFileSync(FILE, "utf8") === original;
console.log(`   restored byte-for-byte: ${restored}`);

const RED = after.status !== 0 && caught && restored && before.status === 0;
console.log(`\n${RED ? "✓ RED PROVEN" : "✗ NOT PROVEN"}`);
process.exit(RED ? 0 : 1);
