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
 *
 * ⭐ RE-POINTED 2026-10-10 (owner ruling: players verify with TYPED details, agents keep photo ID + selfie —
 * docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details"):
 *   · every decision carries the row VERSION the officer was shown (`kycRowVersion`); a stale or missing one is refused (§1b);
 *   · the fixtures here hold the full NIDA photo set, so an approval is an officer's PHOTO approval and stamps
 *     `photoVerifiedAt` — the agent programme's identity gate (§1);
 *   · `BLURRY_DOC` ("the photo was too blurry") is REFUSED for a new decision — no player sends a photo now — and stays
 *     only for display (§8); the three recoverable codes an officer may choose are DETAILS_MISMATCH, EXPIRED_ID, OTHER;
 *   · §10: the REQUEST_INFO decision is gone; a REJECT may come from an APPROVED identity and from one waiting on the
 *     player's corrections (review R1.1), never from a row with nothing sent; "Also freeze the wallet" is offered on a
 *     rejection. §11: it is REQUIRED on a recoverable refusal of an AUTOMATIC approval no officer has checked (R1.2).
 *     §12: a positive act needs the row exactly as seen, a refusal-type act only the identity as seen (R1.6).
 */
import { reviewKyc, listPendingKyc, startKyc, kycRowVersion } from "../src/lib/server/kyc-service.ts";
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
  // ⛔ Every column named (2026-10-10). The full NIDA photo set is on file, so this is a PHOTO case — the kind every
  // submission was before that day, and an agent applicant's now.
  await db.kyc.upsert({ id:`kyc_${userId}`, userId, status, rejectReason:null, rejectNote:null, idType:"NIDA", idNumber:"19900101", idExpiry:null, idVerifiedAt:now, fullName:"Jay Tester", dob:"1990-01-01", documents:[{docType:"NIDA_FRONT",storageKey:"a",uploadedAt:now},{docType:"NIDA_BACK",storageKey:"b",uploadedAt:now},{docType:"SELFIE",storageKey:"c",uploadedAt:now}], extraRequests:[], reviewerId:null, reviewedAt:null, submittedAt:now, approvedAt:null, photoVerifiedAt:null, autoApprovedAt:null, autoFlags:[], postCheckedAt:null, postCheckedById:null, priorIdentities:[], createdAt:now, updatedAt:now } as never);
}
/** The row version the officer's form posts (`kycRowVersion`). A user with no row gets a placeholder, so the
 *  decision reaches the service's own NOT_FOUND rather than stopping at "no version". */
const v = async (userId: string) => { const k = await db.kyc.findByUserId(userId); return k ? kycRowVersion(k) : "no-row"; };
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

// 1b. ⛔ THE VERSION (2026-10-10) — a decision on a row the officer did not see is refused, and nothing moves.
await mkUser("usr_p0001","PENDING_KYC","jay@example.com"); await mkKyc("usr_p0001","PENDING_REVIEW");
let r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE", version:"" });
ok("1b · approve with NO version is refused", !r.ok && r.code === "INVALID", JSON.stringify(r));
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE", version:"2000-01-01T00:00:00.000Z" });
ok("1b · approve on a STALE version is refused, and the case is still pending",
  !r.ok && r.code === "INVALID" && (await db.kyc.findByUserId("usr_p0001"))?.status === "PENDING_REVIEW", JSON.stringify(r));

// 1. Happy approve
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE", version: await v("usr_p0001") });
ok("approve returns ok", r.ok);
ok("kyc -> APPROVED", (await db.kyc.findByUserId("usr_p0001"))?.status === "APPROVED");
// ⭐ An officer's approval of a PHOTO case is the agent programme's identity gate (2026-10-10) — and it is not an
// automatic approval, so it never joins the post-check list.
ok("⭐ a photo case approved by an officer stamps photoVerifiedAt, and is not an automatic approval",
  !!(await db.kyc.findByUserId("usr_p0001"))?.photoVerifiedAt && !(await db.kyc.findByUserId("usr_p0001"))?.autoApprovedAt);
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
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0001", decision:"APPROVE", version: await v("usr_p0001") });
ok("double-approve blocked", !r.ok && r.code === "INVALID");

// 3. Self-review blocked
await mkUser("usr_self01","PENDING_KYC"); await mkKyc("usr_self01","PENDING_REVIEW");
r = await reviewKyc({ officerId:"usr_self01", userId:"usr_self01", decision:"APPROVE", version: await v("usr_self01") });
ok("self-review blocked", !r.ok && r.code === "INVALID");
ok("self-review left status PENDING_REVIEW", (await db.kyc.findByUserId("usr_self01"))?.status === "PENDING_REVIEW");

// 4. Reject requires reason
await mkUser("usr_p0002","PENDING_KYC"); await mkKyc("usr_p0002","PENDING_REVIEW"); await mkWallet("usr_p0002");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", version: await v("usr_p0002"), reason:"no" });
ok("reject w/ short reason blocked", !r.ok && r.code === "INVALID");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_p0002", decision:"REJECT", version: await v("usr_p0002"), reason:"Name mismatch with NIDA records." });
ok("reject w/ reason ok", r.ok);
ok("kyc -> REJECTED + reason", (await db.kyc.findByUserId("usr_p0002"))?.status === "REJECTED" && !!(await db.kyc.findByUserId("usr_p0002"))?.rejectReason);
// A refusal does not touch the account status either way — nothing gates on it (2026-09-13).
ok("rejected user stays PENDING_KYC", (await db.user.findById("usr_p0002"))?.status === "PENDING_KYC");
ok("an uncategorised (OTHER) refusal is RECOVERABLE — the wallet stays ACTIVE",
  (await db.wallet.findByUserId("usr_p0002"))?.status === "ACTIVE" && freezeReasonsOf(await db.wallet.findByUserId("usr_p0002")).length === 0);

// 5. Approving a SUSPENDED user does NOT unlock them
await mkUser("usr_susp01","SUSPENDED"); await mkKyc("usr_susp01","PENDING_REVIEW");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_susp01", decision:"APPROVE", version: await v("usr_susp01") });
ok("approve suspended ok (kyc APPROVED)", r.ok && (await db.kyc.findByUserId("usr_susp01"))?.status === "APPROVED");
ok("suspended NOT unlocked", (await db.user.findById("usr_susp01"))?.status === "SUSPENDED");

// 6. No KYC record
await mkUser("usr_nokyc","PENDING_KYC");
r = await reviewKyc({ officerId:OFFICER, userId:"usr_nokyc", decision:"APPROVE", version: await v("usr_nokyc") });
ok("no-kyc -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");

// 8. ⭐ WHAT A REFUSAL DOES TO THE WALLET — FINAL freezes it, RECOVERABLE does not (2026-09-13, S1/S15).
// "We have refused you, please keep paying" is the one outcome no compliance argument survives, so a final
// code stops money moving in both directions in the same step. A freeze moves no money: what happens to the
// balance is an officer's recorded decision (`refused-funds.ts`), never a side effect of the refusal.
const FINAL = ["UNDERAGE", "SANCTIONED", "DUPLICATE_IDENTITY"] as const;
// ⭐ 2026-10-10: the recoverable codes an officer may CHOOSE. `BLURRY_DOC` left the list — it is driven below as a refusal.
const RECOVERABLE = ["DETAILS_MISMATCH", "EXPIRED_ID", "OTHER"] as const;
for (const code of [...FINAL, ...RECOVERABLE]) {
  const uid = `usr_rj_${code.toLowerCase()}`;
  const isFinal = (FINAL as readonly string[]).includes(code);
  await mkUser(uid, "ACTIVE"); await mkWallet(uid); await mkKyc(uid, "PENDING_REVIEW");
  const d = await decide({ officerId:OFFICER, userId:uid, decision:"REJECT", rejectCode:code, version: await v(uid),
    reason: code === "OTHER" ? "The details do not match the document." : undefined });
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
// ⛔ BLURRY_DOC IS REFUSED FOR A NEW DECISION (2026-10-10). A player no longer sends a photo, so "too blurry" can describe
// no new refusal; the code stays in the enum and on every screen that DISPLAYS a refusal decided before that day.
{
  const uid = "usr_rj_blurry_doc";
  await mkUser(uid, "ACTIVE"); await mkWallet(uid); await mkKyc(uid, "PENDING_REVIEW");
  const d = await decide({ officerId:OFFICER, userId:uid, decision:"REJECT", rejectCode:"BLURRY_DOC", version: await v(uid), reason:"The photo is too blurry to read." });
  const k = await db.kyc.findByUserId(uid);
  ok("8.BLURRY_DOC · ⛔ refused for a new decision", !d.threw && d.r?.ok === false && d.r?.code === "INVALID", d.threw ? String(d.threw) : JSON.stringify(d.r));
  ok("8.BLURRY_DOC · ⛔ …and nothing was written: still PENDING_REVIEW, no code, wallet untouched",
    k?.status === "PENDING_REVIEW" && !k?.rejectReason && (await db.wallet.findByUserId(uid))?.status === "ACTIVE", `${k?.status}/${k?.rejectReason}`);
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
  // ⭐ 2026-10-10 — the officer who refused it travels through the restart, so the player's next typed send goes back
  // to an officer instead of being approved automatically.
  const k = await db.kyc.findByUserId(`usr_rj_${code.toLowerCase()}`);
  ok(`9.${code} · …and the restart carries the refusing officer (officer provenance)`,
    k?.status === "IN_PROGRESS" && k?.reviewerId === OFFICER, `${k?.status} · reviewer ${String(k?.reviewerId)}`);
}

// 10. ⭐ THE DECISIONS THAT MOVED ON 2026-10-10.
{
  // REQUEST_INFO is gone: an officer's one ask is a correction of the details (`askForCorrections`, kyc-flow-stress §5c).
  await mkUser("usr_rq01","ACTIVE"); await mkKyc("usr_rq01","PENDING_REVIEW");
  const rq = await decide({ officerId:OFFICER, userId:"usr_rq01", decision:"REQUEST_INFO" as never, version: await v("usr_rq01"), reason:"Please send a clearer photo." });
  ok("10.1 ⛔ the REQUEST_INFO decision is refused, and the case is untouched",
    rq.r?.ok === false && rq.r?.code === "INVALID" && (await db.kyc.findByUserId("usr_rq01"))?.status === "PENDING_REVIEW" && ((await db.kyc.findByUserId("usr_rq01"))?.extraRequests?.length ?? 0) === 0,
    JSON.stringify(rq.r));

  // A REJECT may now come from an APPROVED identity (the officer's check afterwards found a problem) — and it keeps the
  // first approval, so withdrawals stay open unless the officer also freezes the wallet.
  await mkUser("usr_rjap01","ACTIVE"); await mkWallet("usr_rjap01"); await mkKyc("usr_rjap01","PENDING_REVIEW");
  await reviewKyc({ officerId:OFFICER, userId:"usr_rjap01", decision:"APPROVE", version: await v("usr_rjap01") });
  const firstApproval = (await db.kyc.findByUserId("usr_rjap01"))?.approvedAt;
  const noReason = await decide({ officerId:OFFICER, userId:"usr_rjap01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_rjap01"), alsoFreeze:true, freezeReason:"" });
  ok("10.2 ⛔ 'Also freeze the wallet' without a reason is refused BEFORE anything is written",
    noReason.r?.ok === false && (await db.kyc.findByUserId("usr_rjap01"))?.status === "APPROVED" && (await db.wallet.findByUserId("usr_rjap01"))?.status === "ACTIVE",
    JSON.stringify(noReason.r));
  const rjap = await decide({ officerId:OFFICER, userId:"usr_rjap01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_rjap01"), alsoFreeze:true, freezeReason:"Details do not match — hold while we check." });
  const kap = await db.kyc.findByUserId("usr_rjap01");
  const wap = await db.wallet.findByUserId("usr_rjap01");
  ok("10.3 ⭐ an APPROVED identity can be refused (recoverably) — and the first approval stays on the row",
    rjap.r?.ok === true && kap?.status === "REJECTED" && kap?.rejectReason === "DETAILS_MISMATCH" && !!firstApproval && kap?.approvedAt === firstApproval,
    `${JSON.stringify(rjap.r)} · ${kap?.status} · ${String(kap?.approvedAt)}`);
  ok("10.4 ⭐ …and 'Also freeze the wallet' put an OFFICER hold on it (a money control, not an identity status)",
    wap?.status === "FROZEN" && freezeReasonsOf(wap).includes("OFFICER") && !freezeReasonsOf(wap).includes("IDENTITY_REFUSED"),
    `${wap?.status} [${freezeReasonsOf(wap)}]`);

  // ⭐ ALSO FROM ADDITIONAL_INFO_REQUIRED (2026-10-10, review R1.1). Corrections are now asked of APPROVED identities,
  // and a player who never answers kept withdrawal open while no refusal — a final one included — could be recorded.
  await mkUser("usr_rjmi01","ACTIVE"); await mkKyc("usr_rjmi01","ADDITIONAL_INFO_REQUIRED");
  // …but APPROVE stays PENDING_REVIEW-only: an officer never approves details the player is still correcting.
  const ap = await decide({ officerId:OFFICER, userId:"usr_rjmi01", decision:"APPROVE", version: await v("usr_rjmi01") });
  ok("10.5 ⛔ an APPROVE while the player holds the file (ADDITIONAL_INFO_REQUIRED) is refused",
    ap.r?.ok === false && (await db.kyc.findByUserId("usr_rjmi01"))?.status === "ADDITIONAL_INFO_REQUIRED", JSON.stringify(ap.r));
  const mi = await decide({ officerId:OFFICER, userId:"usr_rjmi01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_rjmi01") });
  ok("10.6 ⭐ a REJECT of a file waiting on the player's corrections is recorded (a player who never answers can be refused)",
    mi.r?.ok === true && (await db.kyc.findByUserId("usr_rjmi01"))?.status === "REJECTED", JSON.stringify(mi.r));
  // ⛔ …and never from IN_PROGRESS or an existing refusal: nothing an officer decided on is there.
  await mkUser("usr_rjip01","ACTIVE"); await mkKyc("usr_rjip01","IN_PROGRESS");
  const ip = await decide({ officerId:OFFICER, userId:"usr_rjip01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_rjip01") });
  ok("10.7 ⛔ a REJECT of an IN_PROGRESS row (nothing sent) is refused", ip.r?.ok === false && (await db.kyc.findByUserId("usr_rjip01"))?.status === "IN_PROGRESS", JSON.stringify(ip.r));
}

// 11. ⭐ AN AUTOMATIC APPROVAL NO OFFICER HAS CHECKED (2026-10-10, review R1.2). Its `approvedAt` was stamped by the
// machine and keeps withdrawal open for good, so a RECOVERABLE refusal of it must also hold the wallet — or a stolen
// number refused by an officer would still pay out. A FINAL code freezes the wallet by itself.
async function mkAutoApproved(userId: string) {
  await mkUser(userId, "ACTIVE"); await mkWallet(userId);
  await mkKyc(userId, "APPROVED");
  const k = (await db.kyc.findByUserId(userId))!;
  // A TYPED automatic approval: no documents, no officer, the post-check still open.
  await db.kyc.upsert({ ...k, documents: [], reviewerId: null, approvedAt: now, autoApprovedAt: now, autoFlags: [], postCheckedAt: null, postCheckedById: null } as never);
}
{
  await mkAutoApproved("usr_auto01");
  const noFreeze = await decide({ officerId:OFFICER, userId:"usr_auto01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_auto01") });
  ok("11.1 ⛔ a RECOVERABLE refusal of an unchecked automatic approval WITHOUT a freeze is refused, and nothing is written",
    noFreeze.r?.ok === false && (await db.kyc.findByUserId("usr_auto01"))?.status === "APPROVED" && (await db.wallet.findByUserId("usr_auto01"))?.status === "ACTIVE",
    JSON.stringify(noFreeze.r));
  const withFreeze = await decide({ officerId:OFFICER, userId:"usr_auto01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_auto01"), alsoFreeze:true, freezeReason:"number reported as someone else's" });
  const wf = await db.wallet.findByUserId("usr_auto01");
  ok("11.2 …and WITH the freeze it is recorded, the wallet held by an officer",
    withFreeze.r?.ok === true && (await db.kyc.findByUserId("usr_auto01"))?.status === "REJECTED" && wf?.status === "FROZEN" && freezeReasonsOf(wf).includes("OFFICER"),
    JSON.stringify(withFreeze.r));
  await mkAutoApproved("usr_auto02");
  const fin = await decide({ officerId:OFFICER, userId:"usr_auto02", decision:"REJECT", rejectCode:"DUPLICATE_IDENTITY", version: await v("usr_auto02") });
  ok("11.3 control · a FINAL code needs no tick — its own freeze holds the wallet",
    fin.r?.ok === true && (await db.wallet.findByUserId("usr_auto02"))?.status === "FROZEN" && freezeReasonsOf(await db.wallet.findByUserId("usr_auto02")).includes("IDENTITY_REFUSED"),
    JSON.stringify(fin.r));
  // control · an OFFICER's approval refused recoverably needs no tick (an officer accepted that identity) — §10.3 above
  // refused one WITH a freeze by choice; here, without.
  await mkUser("usr_offappr01","ACTIVE"); await mkWallet("usr_offappr01"); await mkKyc("usr_offappr01","PENDING_REVIEW");
  await reviewKyc({ officerId:OFFICER, userId:"usr_offappr01", decision:"APPROVE", version: await v("usr_offappr01") });
  const offRj = await decide({ officerId:OFFICER, userId:"usr_offappr01", decision:"REJECT", rejectCode:"DETAILS_MISMATCH", version: await v("usr_offappr01") });
  ok("11.4 control · an OFFICER's approval refused recoverably needs no freeze — the rule is the unchecked automatic one",
    offRj.r?.ok === true && (await db.wallet.findByUserId("usr_offappr01"))?.status === "ACTIVE", JSON.stringify(offRj.r));
}

// 12. ⭐ TWO HALVES OF ONE VERSION (2026-10-10, review R1.6). A POSITIVE act (approve, mark checked) needs the row EXACTLY
// as the officer saw it; a REFUSAL-type act (reject, ask for corrections) needs only the IDENTITY they saw — a write that
// changes no identity fact (a photo attached on the agent track) must never void a refusal.
{
  await mkAutoApproved("usr_ver01");
  const seen = await v("usr_ver01");
  // The player adds a photo (allowed on an APPROVED identity with no officer's photo approval) — no identity fact moves.
  const { attachDocument } = await import("../src/lib/server/kyc-service.ts");
  const PNG1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await new Promise((r) => setTimeout(r, 5)); // a later `updatedAt`, never the same millisecond
  const att = await attachDocument("usr_ver01", "NIDA_FRONT", PNG1);
  ok("12.0 fixture · the photo was attached and the row moved on", att.ok && (await v("usr_ver01")) !== seen, JSON.stringify(att));
  const { markPostChecked, askForCorrections } = await import("../src/lib/server/kyc-service.ts");
  const PASS4 = { details_genuine: "pass", number_reviewed: "pass", no_other_account: "pass", sanctions_clear: "pass" } as const;
  const mark = await markPostChecked(OFFICER, "usr_ver01", { version: seen, attestations: PASS4 });
  ok("12.1 ⛔ a POSITIVE act on the version from before the photo is refused (the officer did not see that row)", !mark.ok, JSON.stringify(mark));
  const ask = await askForCorrections(OFFICER, "usr_ver01", { note: "Please check the spelling of your name.", version: seen });
  ok("12.2 ⭐ a REFUSAL-type act on the same version is accepted — the identity it asks about has not changed",
    ask.ok && (await db.kyc.findByUserId("usr_ver01"))?.status === "ADDITIONAL_INFO_REQUIRED", JSON.stringify(ask));
}

// 7. listPendingKyc excludes decided
const pend = await listPendingKyc();
ok("listPendingKyc excludes approved/rejected", !pend.some(k => ["APPROVED","REJECTED"].includes(k.status)));

console.log(`\n${fail===0?"ALL KYC SCENARIOS PASS":"SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
