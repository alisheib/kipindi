/**
 * red:id-documents — proves `test:id-documents` (and the D1 certification it leans
 * on) actually CATCH the defects the four-document unit exists to prevent.
 *
 * ⛔ WHY THIS FILE EXISTS. Every assertion in `id-documents.test.mts` is phrased as a
 * REFUSAL — "a duplicate passport is blocked", "an expired licence is refused", "the
 * licence declares no published format". A refusal is green on an empty array, on a
 * deleted feature, and on a validator that refuses everything. The gate answers half
 * of that with positive controls in its own run; this harness answers the other half:
 * it puts each REAL defect back, one at a time, and asserts the gate goes red **on
 * that case's own assertion** rather than on some incidental collapse. Then it
 * restores the tree and re-runs the gate to prove it was put back.
 *
 * ⭐ SOME DEFECTS ARE TWO-SITE, AND SAYING SO IS THE POINT. The age gate is held by
 * TWO independent locks — `validators.dateOfBirth` refuses an under-18 at parse time,
 * and `kyc-service` refuses again above the per-document branch. Making it NIDA-only
 * therefore requires editing BOTH, and a case that edited one would report "not
 * caught" while the product was, correctly, still safe. So a case carries a LIST of
 * edits, and the list is the honest description of the defect.
 *
 * ⛔ Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's own
 * line-ending convention, and refused if they match twice. A `\n` anchor cannot match
 * a CRLF checkout, which once made a harness declare the product unprovable on a
 * normal Windows clone.
 *
 * Run: npm run red:id-documents
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

/**
 * 🔴 EVERY WRITE IN THIS HARNESS IS ATOMIC, AND THAT IS NOT CAUTION — IT IS A REPAIR.
 *
 * Measured 2026-08-20 on this very file: a plain `writeFileSync` onto
 * `src/app/profile/kyc/page.tsx` was interrupted between NTFS extending the file's
 * length and the data reaching the disk. The result was **34,466 NUL bytes** where a
 * React page used to be — and the working copy was the ONLY copy of an hour's edits.
 *
 * ⚠️ It also hid itself: `grep` prints "Binary file matches" (or nothing) for a file
 * containing a 0x00, so every "is my change still there?" check answered "no matches"
 * and read as *the edit was reverted* rather than *the file was destroyed*.
 *
 * So: write to a sibling temp file, `rename` it into place (atomic on one volume),
 * and READ IT BACK before letting anything run against it. A harness that mutates
 * real source must never be able to leave a half-written one.
 */
function safeWrite(file, body) {
  const tmp = `${file}.red.tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, file);
  const back = readFileSync(file, "utf8");
  if (back !== body) {
    try { unlinkSync(tmp); } catch { /* already renamed */ }
    throw new Error(`write to ${file} did not land intact — refusing to continue`);
  }
}

/**
 * ⛔ THE CASES LIVE IN A SIDECAR, AND THAT IS WHAT MAKES THEM AUDITABLE.
 * `test:red-anchors` §3 re-checks every anchor below on EVERY `test:all` run — in under a
 * second, and without executing a single mutation — so a harness whose anchor has rotted is
 * caught by the cheap gate rather than by a 13-minute fleet run that then reports a defect it
 * invented. Its §4 ratchet counts the harnesses that do NOT declare; adding this one to that
 * gap instead of to the audit is the one edit that file forbids.
 */
import { CASES, GATE_ID, GATE_D1 } from "./anchors/id-documents.anchors.mjs";

const runGate = (gate) => {
  try {
    execFileSync("npx", gate, { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

// ⭐ THE PRECONDITION. If a gate is not green on the untouched tree, every "it went
// red" below is meaningless — it was already red. Refuse rather than report.
for (const [label, gate] of [["test:id-documents", GATE_ID], ["test:cert-d1", GATE_D1]]) {
  const base = runGate(gate);
  if (base.code !== 0) {
    console.error(`REFUSING TO RUN: ${label} is already RED on the untouched tree.`);
    console.error(base.out.slice(0, 2000));
    process.exit(1);
  }
}
console.log("precondition: both gates are GREEN on the untouched tree\n");

const FILES = new Set(CASES.flatMap((c) => c.edits.map((e) => e.file)));
const originals = new Map();
for (const f of FILES) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];

for (const [i, c] of CASES.entries()) {
  const touched = [...new Set(c.edits.map((e) => e.file))];
  let failedAnchor = null;
  const staged = new Map();
  for (const e of c.edits) {
    const current = staged.get(e.file) ?? originals.get(e.file);
    try {
      staged.set(e.file, injectDefect(current, e.from, e.to));
    } catch (err) {
      failedAnchor = `${e.file}: ${err.message}`;
      break;
    }
  }
  if (failedAnchor) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR PROBLEM — ${failedAnchor}`);
    console.log(`  ${String(i + 1).padStart(2)}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  for (const [f, body] of staged) safeWrite(f, body);
  const r = runGate(c.gate);
  for (const f of touched) safeWrite(f, originals.get(f));

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): gate stayed GREEN with the defect present`);
    console.log(`  ${String(i + 1).padStart(2)}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    // ⛔ Red for the WRONG reason is not a proof. This is what separates "the gate
    // caught my defect" from "the gate fell over".
    const lines = r.out.split("\n").filter((l) => l.startsWith("FAIL")).map((l) => l.trim()).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): went red, but NOT on "${c.expect}" — got: ${lines.join(" | ") || "(no FAIL lines)"}`);
    console.log(`  ${String(i + 1).padStart(2)}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${String(i + 1).padStart(2)}. caught       ${c.name}`);
  }
}

// The tree must be exactly as it was found — a harness that leaks a mutation into a
// commit is how `if (true)` once reached production and told every hedging player a
// false statement about their own money.
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} was NOT restored byte-identically`);
}

const afterId = runGate(GATE_ID);
const afterD1 = runGate(GATE_D1);
if (afterId.code !== 0 || afterD1.code !== 0) problems.push("a gate is RED after restore — the tree was not put back");

console.log(`\n${caught}/${CASES.length} real defects caught, each on its own assertion`);
console.log(`tree restored byte-identically · gates green after restore: ${afterId.code === 0 && afterD1.code === 0}`);
if (problems.length) {
  console.error("\nPROBLEMS:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("RED PROOF COMPLETE");
