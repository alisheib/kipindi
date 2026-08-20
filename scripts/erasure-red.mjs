/**
 * RED PROOF for erasure — every assertion in `test:erasure` broken on purpose.
 *
 *   node scripts/erasure-red.mjs        (npm run red:erasure)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ MUTATION 1 IS THE 2026-08-21 DECISION IMPLEMENTED AS WRITTEN. "Replace the number with a
 * keyed HMAC of itself, so the same document still hashes to the same value and the index
 * still rejects the second account." The first half is right and the second does not follow:
 * a unique index compares STORED STRINGS, so the erased row's hash never meets the next
 * applicant's raw number. That mutation is what a careful person would build from the brief,
 * and `test:erasure` §5.5 must report a SECOND ACCOUNT on one national ID over it. If it does
 * not, the item shipped a hole with a suite blessing it.
 *
 * ⚠️ THE ANCHORS ARE THE FRAGILE PART. A missing anchor is reported as a FAILURE, never as a
 * skip: scoring out of the mutations that happened to apply is how a harness comes to certify
 * a dead block. `test:red-anchors` §3 re-checks every anchor on every `test:all` run, in under
 * a second, without executing a single mutation.
 */

import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
// ⛔ ONE DEFINITION. The sidecar is DATA and `test:red-anchors` imports the same array, so a
// mutation added here is audited in the same keystroke — see the sidecar's own header.
import { MUTATIONS } from "./anchors/erasure.anchors.mjs";

const SUITE = "scripts/erasure.test.mts";

/**
 * 🔴 ATOMIC WRITES, AND THAT IS A REPAIR RATHER THAN CAUTION. Measured 2026-08-20 in this
 * repo: a plain `writeFileSync` onto a source file was interrupted between NTFS extending
 * the file and the data landing, leaving 34,466 NUL bytes where a page used to be — and
 * `grep` then answers "no match" for a file full of 0x00, so it reads as *the edit was
 * reverted* rather than *the file was destroyed*. Write to a sibling, rename into place,
 * read it back.
 */
function safeWrite(file, body) {
  const tmp = `${file}.red.tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, file);
  if (readFileSync(file, "utf8") !== body) {
    try { unlinkSync(tmp); } catch { /* already renamed */ }
    throw new Error(`write to ${file} did not land intact — refusing to continue`);
  }
}

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) {
  console.error("   the suite is not green to begin with — nothing can be proven");
  console.error((before.stdout ?? "").slice(-2000));
  process.exit(2);
}

let proven = 0, anchorless = 0;
const missed = [];
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN — and try its CRLF form, because most files
  // in this repo are CRLF and a multi-line `\n` anchor silently edits nothing.
  const find = original.includes(m.from) ? m.from : m.from.replace(/\n/g, "\r\n");
  const repl = find === m.from ? m.to : m.to.replace(/\n/g, "\r\n");
  if (!original.includes(find)) {
    console.error(`   ANCHOR NOT FOUND in ${m.file} — this mutation proves NOTHING. Fix the anchor.`);
    anchorless++;
    continue;
  }
  const hits = original.split(find).length - 1;
  if (hits > 1) {
    console.error(`   ANCHOR MATCHES ${hits} TIMES in ${m.file} — ambiguous, refusing to inject.`);
    anchorless++;
    continue;
  }
  safeWrite(m.file, original.replace(find, repl));
  const r = run();
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  const line = out.match(/^(?:ALL PASS|FAILURES) — (\d+) passed, (\d+) failed$/m);
  const failed = line ? Number(line[2]) : 0;
  // ⚠️ A CRASH IS NOT A CATCH. A mutation that makes the suite throw exits non-zero without
  // any assertion having fired, which is indistinguishable from the gate falling over — so a
  // named FAIL line is required, not just a bad exit code.
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const l of out.split(/\r?\n/).filter((x) => x.startsWith("FAIL")).slice(0, 3)) console.log(`     ${l.trim()}`);
  if (!caught && failed === 0 && r.status !== 0) console.log("     (exited non-zero with NO failing assertion — a crash, not a catch)");
  safeWrite(m.file, original);
  if (readFileSync(m.file, "utf8") !== original) { console.error(`   🔴 REVERT FAILED on ${m.file}`); process.exit(2); }
  if (caught) proven++; else missed.push(m.name);
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
for (const name of missed) console.log(`   ✗ MISSED: ${name}`);
// ⛔ A MISSING ANCHOR IS A FAILURE, NOT A SKIP.
if (anchorless > 0) console.error(`🔴 ${anchorless} mutation(s) had no usable anchor — repair them before trusting this harness.`);
process.exit(proven === MUTATIONS.length && anchorless === 0 ? 0 : 1);
