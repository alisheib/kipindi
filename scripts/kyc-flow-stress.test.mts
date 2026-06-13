/**
 * Stress test — the WHOLE KYC flow end to end against the real services:
 * upload validation, NIDA reject paths, the submit/review state machine, the
 * request-more-info loop, re-upload + resubmit, idempotency, and that the
 * right in-app notification + email fires on EVERY transition.
 *
 * In-memory store, email stub (no Postmark key). Run:
 *   npx tsx scripts/kyc-flow-stress.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";
process.env.KYC_NOTIFY_EMAILS = "compliance@50pick.tz,ops@50pick.tz";

import {
  startKyc, submitNidaStep, attachDocument, attachExtraDocument, submitForReview, reviewKyc, validateDocImage, getKycStatus,
} from "../src/lib/server/kyc-service.ts";
import { db } from "../src/lib/server/store.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.error(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

let logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const flush = () => new Promise((r) => setTimeout(r, 60));
const clearLogs = () => { logs = []; };
const stubTo = (frag: string) => logs.filter((l) => l.includes("[email-stub]") && l.includes(frag));
const latestKycNote = async (uid: string) => (await listForUser(uid, 50)).find((n) => n.kind === "KYC")?.titleEn ?? "";

// Valid small image data URL + an oversized one.
const VALID_IMG = "data:image/jpeg;base64," + Buffer.from("a".repeat(2048)).toString("base64");
const HUGE_IMG = "data:image/jpeg;base64," + "A".repeat(4_200_004); // ~3.15 MB decoded > 3 MB cap

async function mkPlayer(id: string, email: string | null = null) {
  await db.user.create({
    id, phoneE164: `+25571${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}
const OFFICER = "usr_officer_stress";
await db.user.create({
  id: OFFICER, phoneE164: "+255710000000", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: "1985-01-01", region: "TZ",
  acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  email: "compliance@50pick.tz", emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
});

const GOOD_NIDA = "19900101456712345678"; // 20 digits, not ...0000/...9999
// Each player needs a UNIQUE NIDA now that one-NIDA-per-account is enforced.
let nidaSeq = 0;
async function getToVerified(uid: string) {
  await startKyc(uid);
  nidaSeq++;
  const nida = "1990010100000000" + String(nidaSeq).padStart(4, "0"); // 20 digits, unique, not ...0000/...9999
  const r = await submitNidaStep(uid, { nida, fullName: "Asha Mwamba Juma", dob: "1990-01-01" });
  return r;
}
async function attach3(uid: string) {
  await attachDocument(uid, "NIDA_FRONT", VALID_IMG);
  await attachDocument(uid, "NIDA_BACK", VALID_IMG);
  await attachDocument(uid, "SELFIE", VALID_IMG);
}

// ─── 1. Upload validation — multiple rejection shapes ───
ok("validate: empty rejected", !validateDocImage("").ok);
ok("validate: non-dataurl rejected", !validateDocImage("hello world").ok);
ok("validate: wrong mime (gif) rejected", !validateDocImage("data:image/gif;base64,AAAA").ok);
ok("validate: pdf rejected", !validateDocImage("data:application/pdf;base64,AAAA").ok);
ok("validate: oversized rejected", !validateDocImage(HUGE_IMG).ok);
ok("validate: valid jpeg accepted", validateDocImage(VALID_IMG).ok);

// ─── 2. NIDA reject paths (each a distinct user; NIDA tail drives the mock) ───
await mkPlayer("usr_nida_san");
await startKyc("usr_nida_san");
let r = await submitNidaStep("usr_nida_san", { nida: "19900101456712340000", fullName: "Sani Test", dob: "1990-01-01" });
ok("NIDA sanctioned -> verified:false", r.ok && (r as { data?: { verified: boolean } }).data?.verified === false);
ok("NIDA sanctioned -> kyc REJECTED", (await getKycStatus("usr_nida_san"))?.status === "REJECTED");

await mkPlayer("usr_nida_mis");
await startKyc("usr_nida_mis");
r = await submitNidaStep("usr_nida_mis", { nida: "19900101456712349999", fullName: "Miss Match", dob: "1990-01-01" });
ok("NIDA mismatch -> verified:false", r.ok && (r as { data?: { verified: boolean } }).data?.verified === false);

// Underage + bad format are caught by zod BEFORE the NIDA call.
await mkPlayer("usr_nida_under");
await startKyc("usr_nida_under");
r = await submitNidaStep("usr_nida_under", { nida: GOOD_NIDA, fullName: "Too Young", dob: "2015-01-01" });
ok("underage DOB blocked by validation", !r.ok && r.code === "INVALID");
r = await submitNidaStep("usr_nida_under", { nida: "123", fullName: "Bad Nida", dob: "1990-01-01" });
ok("short NIDA blocked by validation", !r.ok && r.code === "INVALID");

// ─── 3. attachDocument guards ───
r = await attachDocument("usr_ghost_none", "SELFIE", VALID_IMG);
ok("attach without KYC -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");
await mkPlayer("usr_attach01");
await startKyc("usr_attach01");
r = await attachDocument("usr_attach01", "SELFIE", "not-an-image");
ok("attach invalid image -> INVALID", !r.ok && r.code === "INVALID");
r = await attachDocument("usr_attach01", "SELFIE", VALID_IMG);
ok("attach valid image ok", r.ok);

// ─── 4. submitForReview guards ───
await mkPlayer("usr_guard01");
await startKyc("usr_guard01");
r = await submitForReview("usr_guard01");
ok("submit before NIDA -> INVALID", !r.ok && r.code === "INVALID");
r = await getToVerified("usr_guard01");
ok("NIDA verify ok", r.ok && (r as { data?: { verified: boolean } }).data?.verified === true);
r = await submitForReview("usr_guard01");
ok("submit with <3 docs -> INVALID", !r.ok && r.code === "INVALID");

// ─── 5. FULL LOOP: verify → submit → request-info → re-upload → resubmit → reject → resubmit → approve ───
await mkPlayer("usr_loop01", "loop@example.com");
await getToVerified("usr_loop01");
await attach3("usr_loop01");

// 5a. Submit → PENDING_REVIEW, player + admin emails
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("loop submit ok", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");
ok("loop submit: player email", stubTo("loop@example.com").some((l) => l.includes("Documents received")));
ok("loop submit: admin emails (2)", stubTo("New KYC to verify").length === 2);
ok("loop submit: in-app 'Identity submitted'", (await latestKycNote("usr_loop01")) === "Identity submitted");

// 5b. attach blocked while PENDING_REVIEW
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("attach blocked during PENDING_REVIEW", !r.ok && r.code === "INVALID");

// 5c. Officer requests more info → ADDITIONAL_INFO_REQUIRED + email + in-app
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REQUEST_INFO", reason: "The back of your ID is blurry — re-upload a clearer photo." });
await flush();
ok("request-info ok", r.ok);
ok("status -> ADDITIONAL_INFO_REQUIRED", (await getKycStatus("usr_loop01"))?.status === "ADDITIONAL_INFO_REQUIRED");
ok("request-info: note stored for player", (await getKycStatus("usr_loop01"))?.rejectNote?.includes("blurry"));
ok("request-info: email sent", stubTo("loop@example.com").some((l) => l.includes("More information needed")));
ok("request-info: in-app 'More information needed'", (await latestKycNote("usr_loop01")) === "More information needed");
ok("request-info: requires a note", !(await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REQUEST_INFO", reason: "x" })).ok);

// 5d. Player re-uploads (allowed now) and resubmits → back to PENDING_REVIEW + re-notify
r = await attachDocument("usr_loop01", "NIDA_BACK", VALID_IMG);
ok("re-upload allowed in ADDITIONAL_INFO_REQUIRED", r.ok);
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("resubmit ok -> PENDING_REVIEW", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");
ok("resubmit re-notifies player + admins", stubTo("loop@example.com").length >= 1 && stubTo("New KYC to verify").length === 2);

// 5e. Idempotency: re-submitting while PENDING_REVIEW sends nothing
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("double-submit idempotent (no emails)", r.ok && stubTo("[email-stub]").length === 0 && logs.filter((l) => l.includes("[email-stub]")).length === 0);

// 5f. Reject → REJECTED + email
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REJECT", reason: "Photo still unreadable after re-upload." });
await flush();
ok("reject ok -> REJECTED", r.ok && (await getKycStatus("usr_loop01"))?.status === "REJECTED");
ok("reject: email sent", stubTo("loop@example.com").some((l) => l.includes("Identity check needs attention")));
ok("reject: in-app 'Identity needs review'", (await latestKycNote("usr_loop01")) === "Identity needs review");

// 5g. After reject, player can re-upload + resubmit again
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("re-upload allowed after REJECTED", r.ok);
r = await submitForReview("usr_loop01");
ok("resubmit after reject -> PENDING_REVIEW", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");

// 5h. Approve → APPROVED, name backfilled, account unlocked, email
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "APPROVE" }); await flush();
ok("approve ok -> APPROVED", r.ok && (await getKycStatus("usr_loop01"))?.status === "APPROVED");
ok("approve: displayName = legal name", (await db.user.findById("usr_loop01"))?.displayName === "Asha Mwamba Juma");
ok("approve: account ACTIVE", (await db.user.findById("usr_loop01"))?.status === "ACTIVE");
ok("approve: email with reference", stubTo("loop@example.com").some((l) => l.includes("fully verified")));

// 5i. Decisions are final once APPROVED
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REJECT", reason: "should be blocked now" });
ok("decide-after-approve blocked", !r.ok && r.code === "INVALID");
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("attach blocked when APPROVED", !r.ok && r.code === "INVALID");

// ─── 7. EXTRA DOCUMENTS: officer requests specific docs with descriptions ───
await mkPlayer("usr_extra01", "extra@example.com");
await getToVerified("usr_extra01"); await attach3("usr_extra01"); await submitForReview("usr_extra01");
r = await reviewKyc({ officerId: OFFICER, userId: "usr_extra01", decision: "REQUEST_INFO",
  reason: "Need two more documents to verify.", requestedDocs: ["Clearer photo of ID back", "Proof of address (utility bill)", "  "] });
ok("request-info with docs ok", r.ok);
let ek = await getKycStatus("usr_extra01");
ok("extraRequests created (blank filtered out)", (ek?.extraRequests?.length ?? 0) === 2, JSON.stringify(ek?.extraRequests?.map((x) => x.description)));
ok("each extra request has a description", (ek?.extraRequests ?? []).every((x) => x.description.length > 0));
ok("each extra request starts unfulfilled", (ek?.extraRequests ?? []).every((x) => x.storageKey === null));

// Can't resubmit while requested docs are missing.
r = await submitForReview("usr_extra01");
ok("submit blocked while extra docs missing", !r.ok && r.code === "INVALID" && /requested document/.test(r.error));

// Upload the requested docs.
const reqIds = (ek?.extraRequests ?? []).map((x) => x.id);
r = await attachExtraDocument("usr_extra01", reqIds[0], VALID_IMG);
ok("attach extra doc #1 ok", r.ok);
r = await attachExtraDocument("usr_extra01", "req_nonexistent", VALID_IMG);
ok("unknown request id -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");
r = await attachExtraDocument("usr_extra01", reqIds[1], "not-an-image");
ok("invalid extra image -> INVALID", !r.ok && r.code === "INVALID");
r = await attachExtraDocument("usr_extra01", reqIds[1], VALID_IMG);
ok("attach extra doc #2 ok", r.ok);
ek = await getKycStatus("usr_extra01");
ok("both extra docs now fulfilled", (ek?.extraRequests ?? []).every((x) => !!x.storageKey));

// Now resubmit works → PENDING_REVIEW, content preserved for the officer.
r = await submitForReview("usr_extra01");
ok("resubmit ok once extra docs uploaded", r.ok && (await getKycStatus("usr_extra01"))?.status === "PENDING_REVIEW");
ok("uploaded extra-doc content preserved for officer", (await getKycStatus("usr_extra01"))?.extraRequests?.every((x) => !!x.storageKey));

// Extra-doc upload is blocked when not in ADDITIONAL_INFO_REQUIRED.
r = await attachExtraDocument("usr_extra01", reqIds[0], VALID_IMG);
ok("extra upload blocked outside ADDITIONAL_INFO state", !r.ok && r.code === "INVALID");

// A note-only request (no docs) still works and clears prior slots.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_extra01", decision: "REQUEST_INFO", reason: "Actually, just re-take the selfie." });
ok("note-only request-info ok", r.ok);
ok("note-only clears extra-doc slots", ((await getKycStatus("usr_extra01"))?.extraRequests?.length ?? 0) === 0);

// ─── 8. Self-review still blocked across the new decision too ───
await mkPlayer("usr_self_si");
await getToVerified("usr_self_si"); await attach3("usr_self_si"); await submitForReview("usr_self_si");
r = await reviewKyc({ officerId: "usr_self_si", userId: "usr_self_si", decision: "REQUEST_INFO", reason: "trying to self-review" });
ok("self request-info blocked", !r.ok && r.code === "INVALID");

console.log = realLog;
console.log(`\n${fail === 0 ? "ALL KYC-FLOW STRESS SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
