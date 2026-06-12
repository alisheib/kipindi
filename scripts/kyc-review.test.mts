import { reviewKyc, listPendingKyc } from "../src/lib/server/kyc-service.ts";
import { db } from "../src/lib/server/store.ts";

let pass=0, fail=0; const ok=(l,c,x="")=>{ c?pass++:fail++; console.log(`${c?"PASS":"FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

async function mkUser(id, status, email=null) {
  await db.user.create({ id, phoneE164:`+25570000${id.slice(-4)}`, passwordHash:null, passwordSalt:null, failedLoginCount:0, lockedUntil:null, role:"PLAYER", status, locale:"EN", displayName:"Test "+id.slice(-3), dob:"1990-01-01", region:"TZ", acceptedTermsVersion:"v1", acceptedTermsAt:now, marketingOptIn:false, twoFactorEnabled:false, avatarDataUrl:null, email, createdAt:now, updatedAt:now, lastLoginAt:now, closedAt:null });
}
async function mkKyc(userId, status) {
  await db.kyc.upsert({ id:`kyc_${userId}`, userId, status, rejectReason:null, rejectNote:null, nidaNumber:"19900101", nidaVerifiedAt:now, fullName:"Jay Tester", dob:"1990-01-01", documents:[{docType:"NIDA_FRONT",storageKey:"a",uploadedAt:now},{docType:"NIDA_BACK",storageKey:"b",uploadedAt:now},{docType:"SELFIE",storageKey:"c",uploadedAt:now}], reviewerId:null, reviewedAt:null, submittedAt:now, createdAt:now, updatedAt:now });
}
const OFFICER = "usr_officer0001";
await mkUser(OFFICER, "ACTIVE");

// 1. Happy approve
await mkUser("usr_p0001","PENDING_KYC","jay@example.com"); await mkKyc("usr_p0001","PENDING_REVIEW");
let r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE" });
ok("approve returns ok", r.ok);
ok("kyc -> APPROVED", (await db.kyc.findByUserId("usr_p0001"))?.status === "APPROVED");
ok("user PENDING_KYC -> ACTIVE", (await db.user.findById("usr_p0001"))?.status === "ACTIVE");
ok("reviewerId recorded", (await db.kyc.findByUserId("usr_p0001"))?.reviewerId === OFFICER);

// 2. Idempotent: approve again -> rejected (already decided)
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE" });
ok("double-approve blocked", !r.ok && r.code === "INVALID");

// 3. Self-review blocked
await mkUser("usr_self01","PENDING_KYC"); await mkKyc("usr_self01","PENDING_REVIEW");
r = await reviewKyc({ officerId:"usr_self01", userId:"usr_self01", decision:"APPROVE" });
ok("self-review blocked", !r.ok && r.code === "INVALID");
ok("self-review left status PENDING_REVIEW", (await db.kyc.findByUserId("usr_self01"))?.status === "PENDING_REVIEW");

// 4. Reject requires reason
await mkUser("usr_p0002","PENDING_KYC"); await mkKyc("usr_p0002","PENDING_REVIEW");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", reason:"no" });
ok("reject w/ short reason blocked", !r.ok && r.code === "INVALID");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", reason:"Name mismatch with NIDA records." });
ok("reject w/ reason ok", r.ok);
ok("kyc -> REJECTED + reason", (await db.kyc.findByUserId("usr_p0002"))?.status === "REJECTED" && !!(await db.kyc.findByUserId("usr_p0002"))?.rejectReason);
ok("rejected user stays PENDING_KYC", (await db.user.findById("usr_p0002"))?.status === "PENDING_KYC");

// 5. Approving a SUSPENDED user does NOT unlock them
await mkUser("usr_susp01","SUSPENDED"); await mkKyc("usr_susp01","PENDING_REVIEW");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_susp01", decision:"APPROVE" });
ok("approve suspended ok (kyc APPROVED)", r.ok && (await db.kyc.findByUserId("usr_susp01"))?.status === "APPROVED");
ok("suspended NOT unlocked", (await db.user.findById("usr_susp01"))?.status === "SUSPENDED");

// 6. No KYC record
await mkUser("usr_nokyc","PENDING_KYC");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_nokyc", decision:"APPROVE" });
ok("no-kyc -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");

// 7. listPendingKyc excludes decided
const pend = await listPendingKyc();
ok("listPendingKyc excludes approved/rejected", !pend.some(k => ["APPROVED","REJECTED"].includes(k.status)));

console.log(`\n${fail===0?"ALL KYC SCENARIOS PASS":"SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
