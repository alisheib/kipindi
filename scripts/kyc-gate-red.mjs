/**
 * RED DRIVE for the identity gate — break the product, prove the suite notices.   `npm run red:kyc-gate`
 *
 * ⭐ WHY THIS FILE EXISTS. `test:kyc-gate` is half NEGATIVE assertions ("a never-approved account cannot
 * withdraw", "a bet writes no second identity row"), and negative assertions pass for free. Its
 * positive controls catch the crude version of that; this catches the targeted one, where one rule is
 * broken and everything else still works.
 *
 * ⛔ THE RULE INVERTED ON 2026-09-13 AND SO DID THIS FLEET. Identity is now required before WITHDRAWAL
 * only (docs/COMPLIANCE-DECISIONS.md). The 2026-09-05 fleet's "deposit gate removed" and "bet gate
 * removed" planted what is now the correct product; the cases in `anchors/kyc-gate.anchors.mjs` were
 * re-derived from current source, and two of them plant those old gates BACK.
 *
 * ⛔ THE ONLY PROOF THAT COUNTS IS BREAKING THE REAL CODE. Each injection edits ONE product line, runs
 * the suite, and requires it to FAIL ON THAT CASE'S OWN NAMED CHECK. Then the file is restored and
 * compared byte for byte.
 *
 * ⚠️ WRITES ARE TEMP-FILE + RENAME, DELIBERATELY. A plain `writeFileSync` on a source file was
 * interrupted between NTFS extending the length and the data reaching disk once before on this
 * platform (campaign E-173): 34,466 NUL bytes, and `grep` answers "no match" on a NUL-bearing file —
 * so every "is my edit still there?" check read as REVERTED rather than DESTROYED.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
// ⛔ THE MUTATIONS LIVE IN A SIDECAR, not inline here. `test:red-anchors` §3 re-resolves every one of
// them on every run WITHOUT executing this harness, and §4's ceiling of undeclared harnesses may only
// shrink.
import { MUTATIONS as DEFECTS } from "./anchors/kyc-gate.anchors.mjs";
// ⛔ THE SAME RESOLVER `test:red-anchors` §3 AUDITS WITH — never a second implementation.
import { injectDefect } from "./red-anchor.mjs";

const SUITE = "npm run test:kyc-gate";
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  // Read back — a rename that lands on a full disk is still a rename.
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};

/**
 * 🔴 REFUSE TO START ON A DIRTY TREE, AND REFUSE TO RUN TWICE AT ONCE.
 *
 * This harness edits PRODUCT SOURCE and restores it. Two instances overlapping is therefore not a race
 * that produces a wrong result — it is a race that CORRUPTS THE REPOSITORY: one run restores its own
 * snapshot over the other's injection, and whatever was in flight is left behind.
 *
 * ⛔ IT HAPPENED. A shell line ending in `&` backgrounded one run while a second was started in the
 * foreground, and the pair left `return { eligible: true };` sitting in the WITHDRAW branch — the
 * identity gate on payouts, DISABLED, in the working tree. The suites kept passing because each restore
 * made the file look plausible.
 *
 * ⚠️ The "0 files left dirty" check at the bottom cannot see that: it compares each file to the
 * snapshot THIS run took at startup, and that snapshot was already poisoned. And a dirty tree is also
 * how a PARALLEL SESSION's uncommitted edit gets overwritten by this run's restore. So: a lock file,
 * and a comparison against git HEAD before the first injection.
 */
const LOCK = "scripts/.kyc-gate-red.lock";
if (existsSync(LOCK)) {
  console.error(`REFUSING TO RUN — ${LOCK} exists, so another red drive is in flight.\n` +
    "Two instances editing the same source WILL leave an injection behind. If you are sure " +
    "no other run is active, delete the lock file and re-run.");
  process.exit(1);
}
// One comparison per FILE, not per case: several cases share a target.
const files = [...new Set(DEFECTS.map((d) => d.file))];
for (const f of files) {
  const head = execSync(`git show HEAD:${f}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const disk = readFileSync(f, "utf8");
  // Compare with line endings normalised — the repo can check out CRLF on Windows while `git show`
  // yields LF, and that difference is not a modification.
  if (head.replace(/\r\n/g, "\n") !== disk.replace(/\r\n/g, "\n")) {
    console.error(`REFUSING TO RUN — ${f} differs from git HEAD.\n` +
      "This harness restores files to the state it found them in, so starting from an " +
      "uncommitted edit would BAKE that edit in as the baseline. Commit first.");
    process.exit(1);
  }
}
writeFileSync(LOCK, `${process.pid} ${new Date().toISOString()}\n`);
const releaseLock = () => { try { unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", releaseLock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { releaseLock(); process.exit(1); });

const original = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const shaBefore = new Map(files.map((f) => [f, sha(f)]));

// ⭐ THE UNMUTATED SUITE MUST BE GREEN FIRST (added 2026-09-13, after `red:refused-funds-race`). A named
// check that already fails at baseline makes the case that names it print CAUGHT for a defect nobody
// planted — the one false verdict the own-assertion rule below cannot rule out on its own.
try {
  execSync(SUITE, { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  const fails = out.split("\n").filter((l) => l.startsWith("FAIL"));
  console.error(`REFUSING TO RUN — the suite is RED before any mutation:\n${(fails.join("\n") || out.slice(-2000))}`);
  process.exit(1);
}

let caught = 0, missed = 0;
for (const d of DEFECTS) {
  const path = d.file;
  const src = original.get(path);
  // ⛔ AN ANCHOR THAT NO LONGER RESOLVES IS A FAILURE, NOT A SKIP. A stale harness reports nothing and
  // reads as healthy. 🔴 And it must use the shared resolver, not `String.split`: a hand-rolled matcher
  // here once reported both multi-line anchors as resolving 0× the moment `git checkout` restored CRLF.
  let mutated;
  try {
    mutated = injectDefect(src, d.from, d.to);
  } catch (err) {
    console.log(`STALE ${d.name} — ${err.message}; the harness is measuring nothing`);
    missed++;
    continue;
  }
  write(path, mutated);
  let red = false, output = "";
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING. Node's default is 1 MB; the suite prints every audit line it
    // provokes, and a mutation that fails many checks at once overflowed it — `execSync` threw ENOBUFS
    // with `stdout` EMPTY and the harness reported "went red, but not on its own assertion" with
    // nothing after the arrow. ⛔ A harness that loses output reports the wrong verdict, not no verdict.
    execSync(SUITE, { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    red = true;
    // ⚠️ STDERR TOO: a mutation that makes the suite CRASH rather than fail must be visible as such.
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  } finally {
    write(path, src);
  }
  const fails = output.split("\n").filter((l) => l.startsWith("FAIL"));
  // ⛔ CAUGHT ON ITS *OWN* ASSERTION, not merely caught. A mutation that reddens the suite via some
  // unrelated check has proved the suite is fragile, not that this defect is detected — and
  // `withdraw-asks-current-status` and `bet-record-becomes-its-own-event` are each visible to one
  // assertion only, so "something went red" would let either through the day another check is brittle.
  const own = fails.find((l) => l.includes(d.check));
  if (red && own) {
    caught++;
    console.log(`CAUGHT ${d.name}\n        ↳ ${own.trim()}`);
  } else if (red) {
    missed++;
    console.log(`WRONG-ASSERTION ${d.name} — suite went red, but NOT on "${d.check}"\n        ↳ ${(fails[0] ?? output.split("\n").slice(-3).join(" ")).trim()}`);
  } else {
    missed++;
    console.log(`MISSED ${d.name} — the suite stayed GREEN with this defect injected`);
  }
}

// ⛔ The tree must come back EXACTLY as it was. A harness that leaves a source file altered has done
// more damage than the defect it was hunting.
let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nkyc-gate RED: ${caught} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0) process.exit(1);
