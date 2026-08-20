/**
 * RED PROOF for the dead schema (F-05) — every assertion in `test:erasure` broken on purpose.
 *
 *   node scripts/dead-schema-red.mjs        (npm run red:dead-schema)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ THE TWO WAYS F-05 GOES WRONG SIT ON OPPOSITE SIDES OF A ROLLING DEPLOY, and both are
 * here. Cases 1-2 put a DECLARATION back without its table, which is a 42703 on every read of
 * that model once the DDL has run - and `prisma generate` bakes the column list from
 * schema.prisma, so it is the previously-deployed container that carries it. Cases 6-7 put the
 * DDL itself in the two shapes that take the boot down: a statement that is not re-runnable
 * (green in CI, fatal on a hand-applied production), and a CONCURRENTLY inside the transaction
 * `migrate deploy` wraps every migration in.
 *
 * ⚠️ AND CASE 3 BREAKS NOTHING AT ALL, which is why it is here: it deletes the note that says
 * `Session` is dormant ON PURPOSE. Nothing fails, and the next reader deletes an empty table
 * that has code paths. An annotation IS a control when the alternative is a plausible guess.
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
import { MUTATIONS } from "./anchors/dead-schema.anchors.mjs";

const SUITE = "scripts/dead-schema.test.mts";

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
