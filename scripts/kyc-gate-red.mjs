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

const GATE = "src/lib/server/kyc-gate.ts";
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const write = (p, s) => {
  const tmp = `${p}.red-tmp`;
  writeFileSync(tmp, s);
  renameSync(tmp, p);
  // Read back — a rename that lands on a full disk is still a rename.
  if (readFileSync(p, "utf8") !== s) throw new Error(`read-back mismatch on ${p}`);
};

/**
 * Each defect makes ONE action answer "eligible" unconditionally. That is precisely the
 * pre-2026-09-05 behaviour for that action, so a green suite means the guard cannot tell
 * the gate from its own absence.
 */
const DEFECTS = [
  {
    name: "DEPOSIT gate removed",
    find: `  if (kycStatus === "APPROVED") return { eligible: true };`,
    repl: `  if (action === "DEPOSIT") return { eligible: true };\n  if (kycStatus === "APPROVED") return { eligible: true };`,
  },
  {
    name: "BET gate removed",
    find: `  if (kycStatus === "APPROVED") return { eligible: true };`,
    repl: `  if (action === "BET") return { eligible: true };\n  if (kycStatus === "APPROVED") return { eligible: true };`,
  },
  {
    name: "WITHDRAW gate removed",
    find: `    if (k?.approvedAt) return { eligible: true };`,
    repl: `    return { eligible: true };\n    if (k?.approvedAt) return { eligible: true };`,
  },
  {
    // 🔴 THE SUBTLE ONE, AND THE WHOLE REASON THE COLUMN EXISTS. Not a missing gate — a
    // gate asking the WRONG QUESTION. Withdrawal checks current status instead of "was
    // this account ever approved", which reads as stricter and is the money trap:
    // a re-verifying player loses access to money they already earned. §3.5 is the only
    // assertion in the suite that can see this.
    name: "WITHDRAW asks current status instead of approvedAt (the money trap)",
    find: `    if (k?.approvedAt) return { eligible: true };`,
    repl: `    if (kycStatus === "APPROVED") return { eligible: true };`,
  },
  {
    // The other half of the same trap, written into the write path rather than the read.
    name: "first-approval stamp cleared by startKyc's reset",
    file: "src/lib/server/kyc-service.ts",
    find: `    approvedAt: existing?.approvedAt ?? null,`,
    repl: `    approvedAt: null,`,
  },
];

const original = new Map();
for (const d of DEFECTS) original.set(d.file ?? GATE, readFileSync(d.file ?? GATE, "utf8"));
const shaBefore = new Map([...original.keys()].map((p) => [p, sha(p)]));

let caught = 0, missed = 0;
for (const d of DEFECTS) {
  const path = d.file ?? GATE;
  const src = original.get(path);
  if (!src.includes(d.find)) {
    console.log(`SKIP ${d.name} — anchor not found; the harness is stale, which is itself a failure`);
    missed++;
    continue;
  }
  write(path, src.replace(d.find, d.repl));
  let red = false, output = "";
  try {
    execSync("npm run test:kyc-gate", { stdio: "pipe", encoding: "utf8" });
  } catch (e) {
    red = true;
    output = `${e.stdout ?? ""}`;
  } finally {
    write(path, src);
  }
  const firstFail = output.split("\n").find((l) => l.startsWith("FAIL")) ?? "";
  if (red) { caught++; console.log(`CAUGHT ${d.name}\n        ↳ ${firstFail.trim()}`); }
  else { missed++; console.log(`MISSED ${d.name} — the suite stayed GREEN with this gate gone`); }
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
