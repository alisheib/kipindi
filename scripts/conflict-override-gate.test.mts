/**
 * Solo-resolution REAL-MONEY hard-lock gate (Ali's 2026-07-17 decision).
 *
 * The POCA §16 override is permitted ONLY while the platform handles no real money
 * (pre-launch: TEST_FUNDING=true) or outside production, and it HARD-LOCKS the
 * instant real money is live (production + TEST_FUNDING unset). This test pins that
 * matrix so nobody can silently re-widen or re-lock it. Pure env logic — no store.
 */
import {
  isConflictOverrideHardLocked,
  getConflictedResolutionAllowed,
  setConflictedResolutionAllowed,
} from "../src/lib/server/test-overrides.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); } };

const origEnv = process.env.NODE_ENV;
const origTf = process.env.TEST_FUNDING;
function setEnv(nodeEnv: string | undefined, testFunding: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (testFunding === undefined) delete process.env.TEST_FUNDING;
  else process.env.TEST_FUNDING = testFunding;
}

// ── isConflictOverrideHardLocked() matrix ────────────────────────────────────
setEnv("production", undefined);   ok("prod + TEST_FUNDING unset → HARD LOCKED", isConflictOverrideHardLocked() === true);
setEnv("production", "false");     ok("prod + TEST_FUNDING=false → HARD LOCKED", isConflictOverrideHardLocked() === true);
setEnv("production", "true");      ok("prod + TEST_FUNDING=true → NOT locked (pre-launch)", isConflictOverrideHardLocked() === false);
setEnv("development", undefined);  ok("dev → NOT locked", isConflictOverrideHardLocked() === false);
setEnv("test", "true");            ok("test → NOT locked", isConflictOverrideHardLocked() === false);

// ── getConflictedResolutionAllowed() honours both the flag AND the lock ───────
// Real money live: forced OFF even with the flag ON.
setEnv("production", undefined);
await setConflictedResolutionAllowed(true, "tester");
ok("REAL MONEY: flag ON but effective OFF (hard lock wins)", (await getConflictedResolutionAllowed()) === false);

// Pre-launch production: the flag governs.
setEnv("production", "true");
await setConflictedResolutionAllowed(true, "tester");
ok("PRE-LAUNCH: flag ON → effective ON", (await getConflictedResolutionAllowed()) === true);
await setConflictedResolutionAllowed(false, "tester");
ok("PRE-LAUNCH: flag OFF → effective OFF", (await getConflictedResolutionAllowed()) === false);

// Go-live transition: turning real money on (unset TEST_FUNDING) auto-locks even
// though the flag was left ON.
setEnv("production", "true");
await setConflictedResolutionAllowed(true, "tester");
ok("go-live sim: ON pre-launch", (await getConflictedResolutionAllowed()) === true);
setEnv("production", undefined); // ← the go-live step
ok("go-live sim: unset TEST_FUNDING → auto HARD LOCK (flag still ON)", (await getConflictedResolutionAllowed()) === false);

setEnv(origEnv, origTf);
console.log(`\nconflict-override-gate: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
