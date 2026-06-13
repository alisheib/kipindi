/**
 * Integration test — KYC submission/review notifications, identity propagation,
 * and email-address verification. In-memory store, email stub (no Postmark key).
 *
 * Run: npx tsx scripts/kyc-submit-notify.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.KYC_NOTIFY_EMAILS = "Compliance@50pick.tz, ops@50pick.tz , compliance@50pick.tz"; // dupes + case + spaces

import { submitForReview, reviewKyc, kycNotifyEmails } from "../src/lib/server/kyc-service.ts";
import { setUserEmail, verifyEmailToken, buildEmailVerifyUrl } from "../src/lib/server/email-verification.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.error(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

// Capture console.log (the email stub + skip-notices) without losing visibility.
let logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const flush = () => new Promise((r) => setTimeout(r, 60)); // let fire-and-forget sends settle
const clearLogs = () => { logs = []; };

async function mkUser(id: string, status: string, role: string, opts: { email?: string | null; displayName?: string | null } = {}) {
  await db.user.create({
    id, phoneE164: `+25570000${id.slice(-4)}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: role as never, status: status as never, locale: "EN", displayName: opts.displayName ?? ("Handle " + id.slice(-3)),
    dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, email: opts.email ?? null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}
async function mkKyc(userId: string, status: string, fullName = "Asha Mwamba Juma") {
  await db.kyc.upsert({
    id: `kyc_${userId}`, userId, status: status as never, rejectReason: null, rejectNote: null, nidaNumber: "19900101456712340000",
    nidaVerifiedAt: now, fullName, dob: "1990-01-01",
    documents: [{ docType: "NIDA_FRONT", storageKey: "a", uploadedAt: now }, { docType: "NIDA_BACK", storageKey: "b", uploadedAt: now }, { docType: "SELFIE", storageKey: "c", uploadedAt: now }],
    reviewerId: null, reviewedAt: null, submittedAt: null, createdAt: now, updatedAt: now,
  });
}

const OFFICER = "usr_officer0001";
await mkUser(OFFICER, "ACTIVE", "COMPLIANCE", { email: "officer@50pick.tz" });

// ── 1. kycNotifyEmails: KYC_NOTIFY_EMAILS override (deduped + lowercased) ──
let recips = await kycNotifyEmails();
ok("override: deduped + lowercased", recips.length === 2 && recips.includes("compliance@50pick.tz") && recips.includes("ops@50pick.tz"), JSON.stringify(recips));

// ── 2. kycNotifyEmails: all-admins fallback when override unset ──
delete process.env.KYC_NOTIFY_EMAILS;
await mkUser("usr_admin01", "ACTIVE", "ADMIN", { email: "Admin1@50pick.tz" });
await mkUser("usr_mod01", "ACTIVE", "MODERATOR", { email: "mod@50pick.tz" });
await mkUser("usr_noemail", "ACTIVE", "ADMIN", { email: null }); // no resolvable email → dropped
await mkUser("usr_player99", "ACTIVE", "PLAYER", { email: "player99@example.com" }); // not an admin → excluded
recips = await kycNotifyEmails();
ok("all-admins: includes admin/mod/compliance emails", recips.includes("admin1@50pick.tz") && recips.includes("mod@50pick.tz") && recips.includes("officer@50pick.tz"), JSON.stringify(recips));
ok("all-admins: excludes players", !recips.includes("player99@example.com"));
ok("all-admins: drops emailless admin (no crash)", recips.every((e) => !!e));
// Restore override for the submit test (deterministic recipient set).
process.env.KYC_NOTIFY_EMAILS = "compliance@50pick.tz,ops@50pick.tz";

// ── 3. submitForReview fires player + admin emails ──
await mkUser("usr_p0001", "PENDING_KYC", "PLAYER", { email: "jay@example.com" });
await mkKyc("usr_p0001", "IN_PROGRESS");
clearLogs();
let r = await submitForReview("usr_p0001");
await flush();
ok("submit returns ok", r.ok);
ok("kyc -> PENDING_REVIEW", (await db.kyc.findByUserId("usr_p0001"))?.status === "PENDING_REVIEW");
const playerStub = logs.filter((l) => l.includes("[email-stub]") && l.includes("jay@example.com") && l.includes("Documents received"));
ok("player 'documents received' email sent", playerStub.length === 1, JSON.stringify(playerStub));
const adminStubs = logs.filter((l) => l.includes("[email-stub]") && l.includes("New KYC to verify · kyc_usr_p0001"));
const toCompliance = adminStubs.some((l) => l.includes("compliance@50pick.tz"));
const toOps = adminStubs.some((l) => l.includes("ops@50pick.tz"));
ok("one admin email per recipient", adminStubs.length === 2 && toCompliance && toOps, JSON.stringify(adminStubs));

// ── 4. Idempotency: re-submitting does NOT resend ──
clearLogs();
r = await submitForReview("usr_p0001");
await flush();
ok("re-submit returns ok (idempotent)", r.ok);
ok("re-submit sends NO emails", logs.filter((l) => l.includes("[email-stub]")).length === 0, JSON.stringify(logs));

// ── 5. reviewKyc APPROVE: name overwrite + reference + unlock ──
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0001", decision: "APPROVE" });
await flush();
ok("approve ok", r.ok);
ok("displayName overwritten from fullName", (await db.user.findById("usr_p0001"))?.displayName === "Asha Mwamba Juma");
ok("user PENDING_KYC -> ACTIVE", (await db.user.findById("usr_p0001"))?.status === "ACTIVE");
ok("approved email carries reference", logs.some((l) => l.includes("[email-stub]") && l.includes("jay@example.com") && l.includes("fully verified")));

// 5b. ALWAYS overwrite, even over a chosen handle.
await mkUser("usr_p0002", "PENDING_KYC", "PLAYER", { email: "kay@example.com", displayName: "LuckyStriker" });
await mkKyc("usr_p0002", "PENDING_REVIEW", "Bakari Hassan Omari");
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0002", decision: "APPROVE" });
ok("chosen handle is overwritten by legal name", (await db.user.findById("usr_p0002"))?.displayName === "Bakari Hassan Omari");

// ── 6. reviewKyc REJECT email ──
await mkUser("usr_p0003", "PENDING_KYC", "PLAYER", { email: "ray@example.com" });
await mkKyc("usr_p0003", "PENDING_REVIEW");
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0003", decision: "REJECT", reason: "Name mismatch with NIDA records." });
await flush();
ok("reject ok", r.ok);
ok("rejected email sent", logs.some((l) => l.includes("[email-stub]") && l.includes("ray@example.com") && l.includes("Identity check needs attention")));

// ── 7. Email verification token round-trip ──
await mkUser("usr_v0001", "ACTIVE", "PLAYER", { email: null });
clearLogs();
let sr = await setUserEmail("usr_v0001", "  New.User@Example.COM ");
await flush();
ok("setUserEmail stores normalized address", (await db.user.findById("usr_v0001"))?.email === "new.user@example.com");
ok("setUserEmail leaves email unverified", !(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
ok("setUserEmail reports a verification send", sr.ok && sr.changed && sr.verificationSent);
ok("verification email stub sent to new address", logs.some((l) => l.includes("[email-stub]") && l.includes("new.user@example.com") && l.includes("Confirm your email")));

const token = new URL(buildEmailVerifyUrl("usr_v0001", "new.user@example.com")).searchParams.get("token") ?? undefined;
let vr = await verifyEmailToken(token);
ok("valid token -> verified", vr.status === "verified");
ok("emailVerifiedAt now set", !!(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await verifyEmailToken(token);
ok("second click -> already (idempotent)", vr.status === "already");
vr = await verifyEmailToken("garbage.token.value");
ok("garbage token -> invalid", vr.status === "invalid");

// Changing the email invalidates the old verified flag AND the old token.
sr = await setUserEmail("usr_v0001", "changed@example.com");
ok("changing email clears verified flag", !(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await verifyEmailToken(token); // old token still names new.user@…
ok("stale token (email changed) -> mismatch", vr.status === "mismatch");

// Unchanged address is a no-op (no re-send, stays unverified-without-resend).
clearLogs();
const before = (await db.user.findById("usr_v0001"))?.email;
sr = await setUserEmail("usr_v0001", "changed@example.com");
await flush();
ok("unchanged email is a no-op", sr.ok && !sr.changed && !sr.verificationSent && (await db.user.findById("usr_v0001"))?.email === before);

console.log = realLog;
console.log(`\n${fail === 0 ? "ALL KYC-NOTIFY SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
