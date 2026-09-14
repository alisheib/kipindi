/**
 * KYC REVIEW — the officer's decision, what it does to the account, and what it must NOT do.
 *
 *   npx tsx scripts/kyc-review.test.mts     (the first file of `npm run test:kyc`)
 *
 * ⭐ ALIGNED WITH THE OWNER'S 2026-09-13 RULINGS (docs/COMPLIANCE-DECISIONS.md, the top 2026-09-13
 * entries). Identity is now asked before a WITHDRAWAL and before nothing else, so a decision can land
 * on an account that has been depositing and playing for weeks. Three things this suite measures
 * changed with that:
 *   · §1  approval LEAVES THE DISPLAY NAME ALONE. It used to overwrite it with the legal name, which
 *         would now publish a leaderboard regular's legal name at the moment they cash out.
 *   · §1  `User.status = PENDING_KYC` gates nothing and new accounts are created ACTIVE; approval only
 *         normalises a straggler row written before the migration.
 *   · §8  a refusal on a FINAL code (`UNDERAGE`, `SANCTIONED`, `DUPLICATE_IDENTITY`) freezes the wallet
 *         (`IDENTITY_REFUSED`) before the refusal is written, and §9 the player cannot restart it; a
 *         RECOVERABLE refusal does neither. The same checks run on both halves, so neither is vacuous.
 *         `scripts/kyc-security.test.mts` §2e (run by `test:kyc`) proves the final refusal also keeps the document number held.
 */
import { reviewKyc, listPendingKyc, startKyc } from "../src/lib/server/kyc-service.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: unknown, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

// Monotonic, NOT derived from the id: `id.slice(-4)` collided
// ("usr_officer0001" and "usr_p0001" both end "0001"), which the in-memory Map
// never noticed because it keys on id, while Postgres rejects it on the
// phoneE164 unique index. That collision is why this suite could not run
// against a real database.
let phoneSeq = 0;
async function mkUser(id: string, status: string, email: string | null = null) {
  await db.user.create({ id, phoneE164:`+25570${String(++phoneSeq).padStart(6,"0")}`, passwordHash:null, passwordSalt:null, failedLoginCount:0, lockedUntil:null, role:"PLAYER", status, locale:"EN", displayName:"Test "+id.slice(-3), dob:"1990-01-01", region:"TZ", acceptedTermsVersion:"v1", acceptedTermsAt:now, marketingOptIn:false, twoFactorEnabled:false, avatarDataUrl:null, email, createdAt:now, updatedAt:now, lastLoginAt:now, closedAt:null } as never);
}
async function mkKyc(userId: string, status: string) {
  await db.kyc.upsert({ id:`kyc_${userId}`, userId, status, rejectReason:null, rejectNote:null, idType:"NIDA", idNumber:"19900101", idExpiry:null, idVerifiedAt:now, fullName:"Jay Tester", dob:"1990-01-01", documents:[{docType:"NIDA_FRONT",storageKey:"a",uploadedAt:now},{docType:"NIDA_BACK",storageKey:"b",uploadedAt:now},{docType:"SELFIE",storageKey:"c",uploadedAt:now}], reviewerId:null, reviewedAt:null, submittedAt:now, createdAt:now, updatedAt:now } as never);
}
/** A wallet holding money — from 2026-09-13 a refusal can land on an account that has been playing. */
async function mkWallet(userId: string, balance = 25_000) {
  await db.wallet.create({ id:`wal_${userId}`, userId, balance, pending:0, hold:0, bonusBalance:0, freezeReasons:[], currency:"TZS", status:"ACTIVE", createdAt:now, updatedAt:now } as never);
}
const freezeReasonsOf = (w: unknown): string[] => ((w as { freezeReasons?: string[] } | null)?.freezeReasons ?? []);
/**
 * ⚠️ A DECISION THAT THROWS IS COUNTED, NOT ALLOWED TO END THE RUN. On 2026-09-13 every FINAL refusal
 * threw from `recordFinalRefusal` under the in-memory store (`kyc-service.ts`: `.catch` chained straight
 * onto `db.wallet.findByUserId`, which that store returns synchronously). A crash would silence every
 * section after it; a FAIL carrying the error does not.
 */
async function decide(opts: Parameters<typeof reviewKyc>[0]) {
  try { return { r: await reviewKyc(opts), threw: null as unknown }; }
  catch (e) { return { r: null, threw: e as unknown }; }
}
const OFFICER = "usr_officer0001";
await mkUser(OFFICER, "ACTIVE");

// 1. Happy approve
await mkUser("usr_p0001","PENDING_KYC","jay@example.com"); await mkKyc("usr_p0001","PENDING_REVIEW");
let r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE" });
ok("approve returns ok", r.ok);
ok("kyc -> APPROVED", (await db.kyc.findByUserId("usr_p0001"))?.status === "APPROVED");
// ⚠️ LEGACY NORMALISATION ONLY (2026-09-13). PENDING_KYC was written at registration until then and
// gated nothing; the migration normalised existing rows and new accounts are created ACTIVE. Approval
// still lifts a straggler, so a verified account never wears a pending label.
ok("user PENDING_KYC -> ACTIVE (a straggler row is normalised)", (await db.user.findById("usr_p0001"))?.status === "ACTIVE");
ok("reviewerId recorded", (await db.kyc.findByUserId("usr_p0001"))?.reviewerId === OFFICER);
ok("the first-approval stamp is written — the question the withdrawal gate asks", !!(await db.kyc.findByUserId("usr_p0001"))?.approvedAt);
// 🔴 INVERTED 2026-09-13 (docs/COMPLIANCE-DECISIONS.md 2026-09-13, the display-name entry), which reverses
// the 2026-06-14 rule that approval sets the display name to the legal name "even over a chosen handle".
// ⛔ Do not restore the overwrite from the service's history: it would publish a legal name unannounced.
ok("⛔ approval leaves the display name alone", (await db.user.findById("usr_p0001"))?.displayName === "Test 001",
  String((await db.user.findById("usr_p0001"))?.displayName));
// ⭐ CONTROL · the line above only means something if a DIFFERENT legal name was there to be copied.
ok("control · …while the submission records a different legal name, for the officer",
  (await db.kyc.findByUserId("usr_p0001"))?.fullName === "Jay Tester");

// 2. Idempotent: approve again -> rejected (already decided)
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE" });
ok("double-approve blocked", !r.ok && r.code === "INVALID");

// 3. Self-review blocked
await mkUser("usr_self01","PENDING_KYC"); await mkKyc("usr_self01","PENDING_REVIEW");
r = await reviewKyc({ officerId:"usr_self01", userId:"usr_self01", decision:"APPROVE" });
ok("self-review blocked", !r.ok && r.code === "INVALID");
ok("self-review left status PENDING_REVIEW", (await db.kyc.findByUserId("usr_self01"))?.status === "PENDING_REVIEW");

// 4. Reject requires reason
await mkUser("usr_p0002","PENDING_KYC"); await mkKyc("usr_p0002","PENDING_REVIEW"); await mkWallet("usr_p0002");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", reason:"no" });
ok("reject w/ short reason blocked", !r.ok && r.code === "INVALID");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", reason:"Name mismatch with NIDA records." });
ok("reject w/ reason ok", r.ok);
ok("kyc -> REJECTED + reason", (await db.kyc.findByUserId("usr_p0002"))?.status === "REJECTED" && !!(await db.kyc.findByUserId("usr_p0002"))?.rejectReason);
// A refusal does not touch the account status either way — nothing gates on it (2026-09-13).
ok("rejected user stays PENDING_KYC", (await db.user.findById("usr_p0002"))?.status === "PENDING_KYC");
ok("an uncategorised (OTHER) refusal is RECOVERABLE — the wallet stays ACTIVE",
  (await db.wallet.findByUserId("usr_p0002"))?.status === "ACTIVE" && freezeReasonsOf(await db.wallet.findByUserId("usr_p0002")).length === 0);

// 5. Approving a SUSPENDED user does NOT unlock them
await mkUser("usr_susp01","SUSPENDED"); await mkKyc("usr_susp01","PENDING_REVIEW");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_susp01", decision:"APPROVE" });
ok("approve suspended ok (kyc APPROVED)", r.ok && (await db.kyc.findByUserId("usr_susp01"))?.status === "APPROVED");
ok("suspended NOT unlocked", (await db.user.findById("usr_susp01"))?.status === "SUSPENDED");

// 6. No KYC record
await mkUser("usr_nokyc","PENDING_KYC");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_nokyc", decision:"APPROVE" });
ok("no-kyc -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");

// 8. ⭐ WHAT A REFUSAL DOES TO THE WALLET — FINAL freezes it, RECOVERABLE does not (2026-09-13, S1/S15).
// "We have refused you, please keep paying" is the one outcome no compliance argument survives, so a final
// code stops money moving in both directions in the same step. A freeze moves no money: what happens to the
// balance is an officer's recorded decision (`refused-funds.ts`), never a side effect of the refusal.
const FINAL = ["UNDERAGE", "SANCTIONED", "DUPLICATE_IDENTITY"] as const;
const RECOVERABLE = ["BLURRY_DOC", "DETAILS_MISMATCH", "EXPIRED_ID", "OTHER"] as const;
for (const code of [...FINAL, ...RECOVERABLE]) {
  const uid = `usr_rj_${code.toLowerCase()}`;
  const isFinal = (FINAL as readonly string[]).includes(code);
  await mkUser(uid, "ACTIVE"); await mkWallet(uid); await mkKyc(uid, "PENDING_REVIEW");
  const d = await decide({ officerId:OFFICER, userId:uid, decision:"REJECT", rejectCode:code,
    reason: code === "OTHER" ? "The photo does not show the whole document." : undefined });
  ok(`8.${code} · the refusal completes without throwing`, !d.threw && d.r?.ok, d.threw ? String(d.threw) : JSON.stringify(d.r));
  const k = await db.kyc.findByUserId(uid);
  ok(`8.${code} · kyc -> REJECTED carrying ${code}`, k?.status === "REJECTED" && k?.rejectReason === code, `${k?.status}/${k?.rejectReason}`);
  const w = await db.wallet.findByUserId(uid);
  if (isFinal) {
    ok(`8.${code} · 🔴 a FINAL refusal FREEZES the wallet, held for IDENTITY_REFUSED`,
      w?.status === "FROZEN" && freezeReasonsOf(w).includes("IDENTITY_REFUSED"), `${w?.status} [${freezeReasonsOf(w)}]`);
    ok(`8.${code} · …and moves no money — a freeze is not a forfeit`, w?.balance === 25_000 && w?.hold === 0, `balance=${w?.balance} hold=${w?.hold}`);
  } else {
    ok(`8.${code} · ⭐ CONTROL — a RECOVERABLE refusal leaves the wallet ACTIVE, with no hold on it`,
      w?.status === "ACTIVE" && freezeReasonsOf(w).length === 0, `${w?.status} [${freezeReasonsOf(w)}]`);
  }
}

// 9. ⛔ THE PLAYER CANNOT RESTART A FINAL REFUSAL — and can restart a recoverable one (2026-09-13, S1).
// A restart nulls the document number (`restartedSubmission`), which on a final refusal would release a
// number the refusal keeps reserved; and it would re-open an unbounded submit loop while the wallet sits
// frozen. The door back after a final call is an officer (`reopenFinalRefusal`), with a written reason.
for (const code of FINAL) {
  const uid = `usr_rj_${code.toLowerCase()}`;
  const s = await startKyc(uid);
  ok(`9.${code} · startKyc is refused — kyc_refused_final`,
    !s.ok && (s as { reason?: string }).reason === "kyc_refused_final", JSON.stringify(s));
  const k = await db.kyc.findByUserId(uid);
  ok(`9.${code} · …and the refusal is still on the row, number and all`,
    k?.status === "REJECTED" && k?.rejectReason === code && k?.idNumber === "19900101", `${k?.status}/${k?.rejectReason}/${k?.idNumber}`);
}
for (const code of RECOVERABLE) {
  const s = await startKyc(`usr_rj_${code.toLowerCase()}`);
  ok(`9.${code} · CONTROL — a recoverable refusal restarts`, s.ok, JSON.stringify(s));
}

// 7. listPendingKyc excludes decided
const pend = await listPendingKyc();
ok("listPendingKyc excludes approved/rejected", !pend.some(k => ["APPROVED","REJECTED"].includes(k.status)));

console.log(`\n${fail===0?"ALL KYC SCENARIOS PASS":"SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
