/**
 * Security test — identity uniqueness across the platform. A single identity
 * may NOT exist twice: email, NIDA, and phone are each unique. This is a P0
 * AML / multi-accounting control for a licensed book.
 *
 *   npx tsx scripts/kyc-security.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { startKyc, submitNidaStep, getKycStatus } from "../src/lib/server/kyc-service.ts";
import { setUserEmail } from "../src/lib/server/email-verification.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.error(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();
console.log = () => {}; // silence email stubs

async function mkUser(id: string, phone: string) {
  await db.user.create({
    id, phoneE164: phone, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}

// ─── 1. EMAIL uniqueness ───
await mkUser("usr_e_a", "+255710000201");
await mkUser("usr_e_b", "+255710000202");
let r = await setUserEmail("usr_e_a", "Shared.Email@Example.com");
ok("email A set ok", r.ok && (r as { changed: boolean }).changed);
r = await setUserEmail("usr_e_b", "shared.email@example.com"); // same, different case
ok("duplicate email (case-insensitive) blocked", !r.ok && /already linked/.test((r as { error: string }).error));
ok("user B email NOT set", !(await db.user.findById("usr_e_b"))?.email);
r = await setUserEmail("usr_e_a", "shared.email@example.com"); // same owner, unchanged
ok("same owner re-set is a no-op (not blocked)", r.ok);
r = await setUserEmail("usr_e_b", "unique.b@example.com");
ok("different email for B ok", r.ok);

// ─── 2. NIDA uniqueness ───
const NIDA = "19900101456712345671";
await mkUser("usr_n_a", "+255710000211");
await mkUser("usr_n_b", "+255710000212");
await startKyc("usr_n_a");
r = await submitNidaStep("usr_n_a", { nida: NIDA, fullName: "Alpha One", dob: "1990-01-01" });
ok("NIDA verifies for A", r.ok && (r as { data?: { verified: boolean } }).data?.verified === true);
await startKyc("usr_n_b");
r = await submitNidaStep("usr_n_b", { nida: NIDA, fullName: "Beta Two", dob: "1990-01-01" });
ok("duplicate NIDA blocked for B", !r.ok && /already linked to another account/.test((r as { error: string }).error));
ok("B kyc did NOT verify", !(await getKycStatus("usr_n_b"))?.nidaVerifiedAt);

// 2b. If A is REJECTED, the NIDA frees up for B.
const ka = await getKycStatus("usr_n_a");
await db.kyc.upsert({ ...ka!, status: "REJECTED", updatedAt: now });
r = await submitNidaStep("usr_n_b", { nida: NIDA, fullName: "Beta Two", dob: "1990-01-01" });
ok("freed NIDA (A rejected) now verifies for B", r.ok && (r as { data?: { verified: boolean } }).data?.verified === true);

// 2c. Re-submitting your OWN NIDA is fine (not a self-conflict).
r = await submitNidaStep("usr_n_b", { nida: NIDA, fullName: "Beta Two", dob: "1990-01-01" });
ok("own NIDA re-submit ok", r.ok && (r as { data?: { verified: boolean } }).data?.verified === true);

// ─── 3. PHONE uniqueness (the lookup the registration guard relies on) ───
// requestRegisterOtp() blocks a duplicate via `db.user.findByPhone(phone)` →
// ALREADY_EXISTS (auth-service.ts:108-112), and Postgres enforces @unique on
// phoneE164. We assert the lookup key behaves correctly (can't run the full
// request-scoped action in a plain script).
const TAKEN = "+255712345699";
ok("fresh phone is free", !(await db.user.findByPhone(TAKEN)));
await mkUser("usr_phone_taken", TAKEN);
ok("phone lookup finds existing account (dup guard would fire)", (await db.user.findByPhone(TAKEN))?.id === "usr_phone_taken");
ok("a different phone stays free", !(await db.user.findByPhone("+255712340000")));

console.error(`\n${fail === 0 ? "ALL KYC-SECURITY SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
