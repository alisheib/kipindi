/**
 * RED DRIVE for the identity gate — delete the product, prove the suite notices.
 *
 * ⭐ WHY THIS FILE EXISTS. `test:kyc-gate` is almost entirely NEGATIVE assertions: "an
 * unverified player is refused". Negative assertions are the ones that pass for free. A
 * `deposit()` that threw on every call, a `buyPosition()` that always returned an error, a
 * `withdraw()` deleted outright — all three would leave that suite green on its refusal
 * checks. The positive controls (§2) catch the crudest version of that; this catches the
 * targeted version, where only the gate is gone and everything else still works.
 *
 * ⛔ THE ONLY PROOF THAT COUNTS IS DELETING THE REAL CODE. Each injection below neuters ONE
 * gate — makes `assertKycForMoney` answer "eligible" for that action, exactly as it did
 * before 2026-09-05 — runs the suite, and requires it to FAIL. Then the tree is restored
 * and compared byte for byte.
 *
 * ⚠️ WRITES ARE TEMP-FILE + RENAME, DELIBERATELY. A plain `writeFileSync` on a source file
 * was interrupted between NTFS extending the length and the data reaching disk once before
 * on this platform (campaign E-173): 34,466 NUL bytes, and `grep` answers "no match" on a
 * NUL-bearing file — so every "is my edit still there?" check read as REVERTED rather than
 * DESTROYED. Never write a source file in place from a harness.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
// ⛔ THE MUTATIONS LIVE IN A SIDECAR, not inline here. `test:red-anchors` §3 re-resolves
// every one of them on every run WITHOUT executing this harness, so a rewritten source line
// is caught the day it lands instead of the next time somebody runs the fleet — and §4's
// ceiling of undeclared harnesses may only shrink. The first draft of this file declared
// them inline, which pushed that count from 67 to 68 and was correctly refused.
import { MUTATIONS as DEFECTS } from "./anchors/kyc-gate.anchors.mjs";

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  // Read back — a rename that lands on a full disk is still a rename.
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};

const original = new Map();
for (const d of DEFECTS) original.set(d.file, readFileSync(d.file, "utf8"));
const shaBefore = new Map([...original.keys()].map((p) => [p, sha(p)]));

let caught = 0, missed = 0;
for (const d of DEFECTS) {
  const path = d.file;
  const src = original.get(path);
  // ⛔ AN ANCHOR THAT NO LONGER RESOLVES IS A FAILURE, NOT A SKIP. A stale harness reports
  // nothing and reads as healthy — the exact rot `test:red-anchors` §3 exists to catch, and
  // it must not be survivable here either.
  const hits = src.split(d.from).length - 1;
  if (hits !== 1) {
    console.log(`STALE ${d.name} — anchor resolves ${hits}× (need exactly 1); the harness is measuring nothing`);
    missed++;
    continue;
  }
  write(path, src.replace(d.from, d.to));
  let red = false, output = "";
  try {
    // ⚠️ `maxBuffer` IS LOAD-BEARING, and its absence produced the most misleading result
    // this harness can produce. Node's default is 1 MB; the suite prints every audit line
    // it provokes, and the BET mutation makes seventeen assertions fail at once — which
    // pushed the output past 1 MB, made `execSync` throw ENOBUFS with `stdout` EMPTY, and
    // reported "went red, but not on its own assertion" with nothing after the arrow. The
    // mutation was caught perfectly; the harness could not read the evidence. ⛔ A harness
    // that loses output reports the wrong verdict, not no verdict.
    execSync("npm run test:kyc-gate", { stdio: "pipe", encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    red = true;
    // ⚠️ STDERR TOO. The first version read only `stdout`, so a mutation that made the
    // suite CRASH rather than fail reported "suite went red, but not on its own assertion"
    // with an EMPTY explanation — the harness could see that something happened and not
    // what. A crash is also not a catch: §0.1a's rule is that a harness which only checks
    // "did it change?" prints comfort. Both streams are read so the distinction is visible.
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  } finally {
    write(path, src);
  }
  const fails = output.split("\n").filter((l) => l.startsWith("FAIL"));
  // ⛔ CAUGHT ON ITS *OWN* ASSERTION, not merely caught. A mutation that reddens the suite
  // via some unrelated check has proved the suite is fragile, not that this defect is
  // detected — and `withdraw-asks-current-status` is the whole reason that distinction
  // matters: it is invisible to every assertion except §3.5, so "something went red" would
  // have let it through if another check happened to be brittle.
  const onOwn = fails.some((l) => l.includes(d.check));
  if (red && onOwn) {
    caught++;
    console.log(`CAUGHT ${d.name}\n        ↳ ${fails.find((l) => l.includes(d.check)).trim()}`);
  } else if (red) {
    missed++;
    console.log(`WRONG-ASSERTION ${d.name} — suite went red, but NOT on "${d.check}"\n        ↳ ${(fails[0] ?? "").trim()}`);
  } else {
    missed++;
    console.log(`MISSED ${d.name} — the suite stayed GREEN with this defect injected`);
  }
}

// ⛔ The tree must come back EXACTLY as it was. A harness that leaves a source file altered
// has done more damage than the defect it was hunting.
let dirty = 0;
for (const [p, before] of shaBefore) {
  if (sha(p) !== before) { dirty++; console.log(`DIRTY ${p} — NOT restored byte-identically`); }
  try { unlinkSync(`${p}.red-tmp`); } catch { /* already gone */ }
}
console.log(`\nkyc-gate RED: ${caught} caught, ${missed} missed, ${dirty} files left dirty`);
if (missed > 0 || dirty > 0) process.exit(1);
