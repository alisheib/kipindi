/**
 * red:kyc-typed-only — proves `test:kyc-typed-only` CATCHES the defects the 2026-10-10 typed-only identity change
 * exists to prevent.   `npm run red:kyc-typed-only`
 *
 * ⛔ WHY THIS FILE EXISTS. Half of `kyc-typed-only.test.mts` is phrased as a refusal or an absence — "the typed track
 * draws no uploader", "a changed number is refused", "the machine never lifts a hold". An absence is green on a deleted
 * feature and a refusal is green on a service that refuses everything. The suite answers half of that with its own
 * positive controls; this harness answers the other half: it puts each REAL defect back, one at a time, and requires
 * the suite to go red ON THAT CASE'S OWN ASSERTION (a FAIL line carrying the case's `expect`), rather than on some
 * incidental collapse. Then it restores the tree byte for byte and re-runs the suite to prove it was put back.
 *
 * ⭐ MODELLED ON `id-documents-red.mjs` (cases with edit LISTS in a declared sidecar, atomic writes read back, the
 * gate green first, the FAIL-line rule) and on `kyc-gate-red.mjs` (a lock file, and the tree compared with git HEAD
 * before the first injection).
 *
 * ⛔ Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's own line endings, refused if they match twice.
 *
 * Run: npm run red:kyc-typed-only   (heavy: one full suite run per case — on this laptop, under the heavy-node lock)
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { injectDefect } from "./red-anchor.mjs";
/**
 * ⛔ THE CASES LIVE IN A SIDECAR, AND THAT IS WHAT MAKES THEM AUDITABLE. `test:red-anchors` §3 re-checks every anchor
 * below on EVERY `test:all` run without executing a single mutation, and its §4 ratchet counts the harnesses that do
 * not declare.
 */
import { CASES, GATE } from "./anchors/kyc-typed-only.anchors.mjs";

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

/**
 * 🔴 EVERY WRITE IS ATOMIC AND READ BACK. A plain `writeFileSync` onto `src/app/profile/kyc/page.tsx` was once
 * interrupted between NTFS extending the file and the data reaching the disk: 34,466 NUL bytes where a React page
 * used to be, and `grep` answering "no match" so the destruction read as a revert (`id-documents-red.mjs`, E-173).
 * Write a sibling temp file (`*.red-tmp`, git-ignored), rename it into place, and read it back before anything runs.
 */
function safeWrite(file, body) {
  const tmp = `${file}.red-tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, file);
  if (readFileSync(file, "utf8") !== body) {
    try { unlinkSync(tmp); } catch { /* already renamed */ }
    throw new Error(`write to ${file} did not land intact — refusing to continue`);
  }
}

const runGate = (gate) => {
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING (kyc-gate-red, ENOBUFS): a mutation that fails many checks at once printed more
    // than Node's 1 MB default and the harness lost the very lines it judges by.
    const out = execFileSync("npx", gate, { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    // STDERR TOO: a mutation that CRASHES the suite must be visible as a crash.
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};
const failLines = (out) => out.split(NL).map((l) => l.trim()).filter((l) => l.startsWith("FAIL"));

/**
 * 🔴 REFUSE TO START TWICE, AND REFUSE TO START ON A TREE THAT DIFFERS FROM HEAD (`kyc-gate-red.mjs`, which records the
 * day two overlapping runs left `return { eligible: true };` in the WITHDRAW branch). Two instances restore each
 * other's injections; and a run that starts from an uncommitted edit BAKES that edit in as its baseline — or, worse,
 * restores over a parallel session's work. So: a lock file, and every target compared with git HEAD first.
 * ⚠️ The lock lives where `.gitignore` must name it (`scripts/.kyc-typed-only-red.lock`), so a run killed mid-flight
 * never leaves a file a later commit sweeps up.
 */
const LOCK = "scripts/.kyc-typed-only-red.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another red drive is in flight. Two instances editing the same ` +
    "source WILL leave an injection behind. If you are sure no other run is active, delete the lock file and re-run.");
  process.exit(1);
}
const FILES = [...new Set(CASES.flatMap((c) => c.edits.map((e) => e.file)))];
for (const f of FILES) {
  let head;
  try {
    head = execSync(`git show HEAD:${f}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    console.error(`REFUSING TO RUN — ${f} is not in git HEAD. Commit the change this harness proves, then run it.`);
    process.exit(1);
  }
  // Line endings normalised: a CRLF checkout of an LF blob is not a modification.
  if (head.split(CR).join("") !== readFileSync(f, "utf8").split(CR).join("")) {
    console.error(`REFUSING TO RUN — ${f} differs from git HEAD. This harness restores files to the state it found ` +
      "them in, so starting from an uncommitted edit would bake that edit in as the baseline. Commit first.");
    process.exit(1);
  }
}
writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}${NL}`);
const releaseLock = () => { try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", releaseLock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLock(); process.exit(1); });

// ⭐ THE PRECONDITION. If the gate is not green on the untouched tree, every "it went red" below is meaningless.
const base = runGate(GATE);
if (base.code !== 0) {
  console.error("REFUSING TO RUN: test:kyc-typed-only is already RED on the untouched tree.");
  console.error((failLines(base.out).join(NL) || base.out).slice(0, 3000));
  process.exit(1);
}
console.log("precondition: test:kyc-typed-only is GREEN on the untouched tree");
console.log("");

const originals = new Map(FILES.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(FILES.map((f) => [f, sha(f)]));
let caught = 0;
const problems = [];

for (const [i, c] of CASES.entries()) {
  const n = String(i + 1).padStart(2);
  const touched = [...new Set(c.edits.map((e) => e.file))];
  // ⭐ A CASE IS A LIST OF EDITS, applied to one staged copy per file, so a two-site defect is planted whole.
  const staged = new Map();
  let anchorProblem = null;
  for (const e of c.edits) {
    try {
      staged.set(e.file, injectDefect(staged.get(e.file) ?? originals.get(e.file), e.from, e.to));
    } catch (err) {
      anchorProblem = `${e.file}: ${err.message}`;
      break;
    }
  }
  // ⛔ AN ANCHOR THAT NO LONGER RESOLVES IS A FAILURE, NOT A SKIP: a stale harness reports nothing and reads as healthy.
  if (anchorProblem) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR PROBLEM — ${anchorProblem}`);
    console.log(`  ${n}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  let r;
  try {
    for (const [f, body] of staged) safeWrite(f, body);
    r = runGate(c.gate);
  } finally {
    for (const f of touched) safeWrite(f, originals.get(f));
  }
  const fails = failLines(r.out);
  const own = fails.find((l) => l.includes(c.expect));
  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): the suite stayed GREEN with the defect present`);
    console.log(`  ${n}. NOT CAUGHT   ${c.name}`);
  } else if (!own) {
    // ⛔ Red for the WRONG reason is not a proof — only a FAIL line carrying the case's own words counts (a PASS line
    // bearing the same words once satisfied a looser check; `id-documents-red.mjs` records it).
    problems.push(`case ${i + 1} (${c.name}): went red, but NOT on "${c.expect}" — got: ${fails.slice(0, 3).join(" | ") || r.out.split(NL).slice(-4).join(" ")}`);
    console.log(`  ${n}. WRONG REASON ${c.name}`);
  } else {
    caught++;
    console.log(`  ${n}. caught       ${c.name}`);
    console.log(`        ↳ ${own}`);
  }
}

// The tree must be exactly as it was found — byte for byte, and the gate green again.
for (const [f, before] of shaBefore) {
  if (sha(f) !== before) problems.push(`${f} was NOT restored byte-identically`);
  try { unlinkSync(`${f}.red-tmp`); } catch { /* already gone */ }
}
const after = runGate(GATE);
if (after.code !== 0) problems.push("test:kyc-typed-only is RED after restore — the tree was not put back");

console.log("");
console.log(`${caught}/${CASES.length} real defects caught, each on its own assertion`);
console.log(`tree restored byte-identically · gate green after restore: ${after.code === 0}`);
if (problems.length) {
  console.error("");
  console.error("PROBLEMS:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("RED PROOF COMPLETE");
