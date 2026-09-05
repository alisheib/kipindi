/**
 * DEPOSIT EMAIL GATE + CARD RETURN LEG — the two new money-in guards.
 *
 * Part A — the email gate. A confirmed address is required before the first
 * deposit (browse free → verify email to deposit → KYC to withdraw). What must
 * hold: a blocked deposit creates NO transaction row, consumes NO deposit cap,
 * and never reaches the gateway; admins are not exempt; and changing an address
 * re-gates depositing (because it clears the verified flag).
 *
 * Part B — the return leg. Selcom sends the buyer back with UNSIGNED query
 * params. The load-bearing property is that those params decide nothing: the
 * outcome comes only from the signed order-status re-query. So a forged return
 * cannot credit, another player's reference cannot be read, a still-moving
 * payment reports PENDING (never FAILED — that is what makes people pay twice),
 * and refresh / back-button / double-submit credit exactly once.
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, settleDepositFromReturn } from "../src/lib/server/wallet-service.ts";
import { setUserEmail } from "../src/lib/server/email-verification.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const now = () => new Date().toISOString();
let seq = 0;

/**
 * ⛔ `kyc` DEFAULTS TO APPROVED, AND THE DEFAULT IS THE INTERESTING PART.
 *
 * From 2026-09-05 identity is checked BEFORE email on the deposit path. Every fixture in
 * PART A is about the EMAIL gate, so each one needs to be past the identity gate or it
 * never reaches the door under test — an unverified default turned all eleven email
 * assertions into KYC refusals, including *"verified email → deposit accepted"*, which
 * then proved the opposite of its own name.
 *
 * ⚠️ A test fixture that cannot reach the gate it is named after is worse than a failing
 * one: it goes green the moment somebody "fixes" the expectation. PART C below drives the
 * identity gate deliberately, with `kyc` set to each refusing state.
 */
async function mkUser(id: string, opts: { verified: boolean; email?: string | null; role?: string; kyc?: "APPROVED" | "NOT_STARTED" | "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "REJECTED" }): Promise<void> {
  await db.user.create({
    id,
    phoneE164: `+25578${String(++seq).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: opts.role ?? "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Test Player", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: opts.email === undefined ? `${id}@t.tz` : opts.email,
    emailVerifiedAt: opts.verified ? now() : null,
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
  const kycStatus = opts.kyc ?? "APPROVED";
  // `NOT_STARTED` writes NO row at all — that is what a brand-new account really looks
  // like, and defaulting a missing row to "fine" is the exact hole the gate exists to
  // close. Writing a row that merely SAYS NOT_STARTED would test a state the product
  // does not produce at sign-up.
  if (kycStatus !== "NOT_STARTED") {
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: kycStatus, rejectReason: null, rejectNote: null,
      idType: "NIDA", idNumber: `199001011${String(seq).padStart(11, "0")}`, idExpiry: null,
      idVerifiedAt: now(), fullName: "Test Player", dob: "1990-01-01", documents: [],
      reviewerId: null, reviewedAt: now(), submittedAt: now(),
      // Only an APPROVED fixture carries the first-approval stamp. The re-verification
      // case — approved once, currently not — is built explicitly in PART C.
      approvedAt: kycStatus === "APPROVED" ? now() : null,
      createdAt: now(), updatedAt: now(),
    });
  }
}

const txnsFor = async (uid: string) => (await db.txn.findByUser(uid)).length;

// ═══ PART A — THE EMAIL GATE ════════════════════════════════════════════════

// A1 — unverified email blocks the deposit, and leaves NO trace behind.
await mkUser("usr_gate_unverified", { verified: false });
{
  const before = await txnsFor("usr_gate_unverified");
  const r = await deposit("usr_gate_unverified", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("unverified email → deposit refused", !r.ok);
  ok("refusal carries the actionable EMAIL_UNVERIFIED code (not a generic INVALID)",
    !r.ok && r.code === "EMAIL_UNVERIFIED", !r.ok ? String(r.code) : "");
  ok("refusal message tells the player what to do", !r.ok && /confirm your email/i.test(r.error));
  // The gate sits BEFORE the reserving lock on purpose: a blocked deposit must
  // not create a PROCESSING row that eats the player's daily cap.
  ok("blocked deposit creates NO transaction row", (await txnsFor("usr_gate_unverified")) === before);
  ok("blocked deposit credits nothing", (await db.wallet.findByUserId("usr_gate_unverified"))?.balance === 0);
}

// A2 — verified email lets the same deposit through.
await mkUser("usr_gate_verified", { verified: true });
{
  const r = await deposit("usr_gate_verified", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("verified email → deposit accepted", r.ok, !r.ok ? r.error : "");
  ok("accepted deposit created a transaction", (await txnsFor("usr_gate_verified")) === 1);
}

// A3 — no email at all is refused too, with its own message.
await mkUser("usr_gate_noemail", { verified: false, email: null });
{
  const r = await deposit("usr_gate_noemail", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("no email on file → deposit refused", !r.ok && r.code === "EMAIL_UNVERIFIED");
  ok("message asks them to ADD an address, not confirm a missing one",
    !r.ok && /add and confirm/i.test(r.error), !r.ok ? r.error : "");
}

// A4 — admins are NOT exempt. An exemption here is how a gate rots.
for (const role of ["ADMIN", "COMPLIANCE", "MODERATOR"]) {
  const id = `usr_gate_${role.toLowerCase()}`;
  await mkUser(id, { verified: false, role });
  const r = await deposit(id, { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok(`${role} with an unverified email is ALSO blocked`, !r.ok && r.code === "EMAIL_UNVERIFIED");
}

// A5 — changing the address clears verification, which re-gates depositing.
// setUserEmail is the single writer, so this property can't drift per call site.
await mkUser("usr_gate_changed", { verified: true, email: "first@example.com" });
{
  const before = await deposit("usr_gate_changed", { provider: "MPESA", amount: 1_000, msisdn: "712345678" });
  ok("deposits work while the address is confirmed", before.ok);
  const changed = await setUserEmail("usr_gate_changed", "second@example.com");
  ok("email change accepted", changed.ok);
  ok("changing the address cleared the verified flag",
    !(await db.user.findById("usr_gate_changed"))?.emailVerifiedAt);
  const after = await deposit("usr_gate_changed", { provider: "MPESA", amount: 1_000, msisdn: "712345678" });
  ok("changing the address re-gates depositing", !after.ok && after.code === "EMAIL_UNVERIFIED");
}

// ═══ PART B — THE CARD RETURN LEG ═══════════════════════════════════════════
// The mock provider settles synchronously, so a deposit here lands CONFIRMED and
// gives us a real transaction + providerRef to exercise the return leg against.
await setPaymentControls({ provider: "mock" }, "test").catch(() => {});

await mkUser("usr_ret_owner", { verified: true });
await mkUser("usr_ret_other", { verified: true });

const made = await deposit("usr_ret_owner", { provider: "CARD", amount: 25_000, msisdn: "712345678" });
ok("seed deposit created", made.ok, !made.ok ? made.error : "");
const seededTxn = (await db.txn.findByUser("usr_ret_owner"))[0]!;
const ref = seededTxn.providerRef!;

// B1 — the happy path reports PAID with the full proof the player needs.
{
  const out = await settleDepositFromReturn("usr_ret_owner", ref);
  ok("settled deposit → PAID", out.state === "PAID", out.state);
  ok("return leg exposes the amount", out.txn?.amount === 25_000, String(out.txn?.amount));
  ok("return leg exposes OUR transaction id", out.txn?.id === seededTxn.id);
  ok("return leg exposes the gateway reference (the id support/the bank will ask for)",
    out.txn?.providerRef === ref);
  ok("return leg names the method", out.txn?.providerLabel === "Card", out.txn?.providerLabel);
  ok("PAID reports the balance the money landed in", out.balance === 25_000, String(out.balance));
}

// B2 — IDEMPOTENCE. Refresh, back-button and double-submit are the normal case,
// not the exception. None of them may credit twice.
{
  const balanceBefore = (await db.wallet.findByUserId("usr_ret_owner"))!.balance;
  for (let i = 0; i < 5; i++) await settleDepositFromReturn("usr_ret_owner", ref);
  const after = (await db.wallet.findByUserId("usr_ret_owner"))!.balance;
  ok("5 further return-leg loads credit NOTHING extra", after === balanceBefore, `${balanceBefore} → ${after}`);
  ok("still exactly one transaction row", (await db.txn.findByUser("usr_ret_owner")).length === 1);
}
{
  // Concurrent hits (double-tap on a slow 2G connection) must also converge.
  const balanceBefore = (await db.wallet.findByUserId("usr_ret_owner"))!.balance;
  await Promise.all(Array.from({ length: 8 }, () => settleDepositFromReturn("usr_ret_owner", ref)));
  ok("8 CONCURRENT return-leg loads credit nothing extra",
    (await db.wallet.findByUserId("usr_ret_owner"))!.balance === balanceBefore);
}

// B3 — OWNERSHIP. Another player's reference must be unreadable, and must not
// be distinguishable from a reference that doesn't exist (that would confirm the
// existence of someone else's transaction).
{
  const foreign = await settleDepositFromReturn("usr_ret_other", ref);
  ok("another player's reference → UNKNOWN", foreign.state === "UNKNOWN", foreign.state);
  ok("another player's reference leaks NO transaction detail", foreign.txn === undefined);
  const bogus = await settleDepositFromReturn("usr_ret_other", "dep_does_not_exist");
  ok("a non-existent reference is INDISTINGUISHABLE from a foreign one",
    bogus.state === foreign.state && bogus.txn === foreign.txn);
  ok("reading a foreign reference credits the reader nothing",
    (await db.wallet.findByUserId("usr_ret_other"))!.balance === 0);
}

// B4 — FORGED RETURN. The whole point of the design: the URL says COMPLETED, but
// nothing in our system was ever initiated, so nothing may be created or credited.
{
  const before = await txnsFor("usr_ret_other");
  const forged = await settleDepositFromReturn("usr_ret_other", "dep_forged_by_attacker");
  ok("forged order_id → UNKNOWN", forged.state === "UNKNOWN");
  ok("forged order_id creates no transaction", (await txnsFor("usr_ret_other")) === before);
  ok("forged order_id credits nothing", (await db.wallet.findByUserId("usr_ret_other"))!.balance === 0);
}

// B5 — MISSING / EMPTY reference (player opened the URL bare, or Selcom dropped it).
{
  const empty = await settleDepositFromReturn("usr_ret_owner", "");
  ok("empty order_id → UNKNOWN, no crash", empty.state === "UNKNOWN");
  ok("empty order_id still reports the real balance", empty.balance === 25_000, String(empty.balance));
}

// B6 — PENDING IS NOT FAILURE. A transaction still PROCESSING (webhook not yet
// arrived, buyer closed the tab mid-payment) must report PENDING so the player
// is never told a live payment failed.
{
  await mkUser("usr_ret_pending", { verified: true });
  const wallet = await db.wallet.findByUserId("usr_ret_pending");
  const pendingRef = "dep_still_moving";
  await db.txn.create({
    id: "txn_pending_ret", walletId: wallet!.id, userId: "usr_ret_pending",
    type: "DEPOSIT", status: "PROCESSING", amount: 7_500,
    fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "CARD", providerRef: pendingRef, msisdn: null,
    description: "Card deposit", positionId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: null, idempotencyKey: null,
  } as never);

  const out = await settleDepositFromReturn("usr_ret_pending", pendingRef);
  // The mock provider reports UNSUPPORTED to the verify path, so the row is left
  // PROCESSING — exactly the "still in flight" case we must not terminalise.
  ok("in-flight deposit → PENDING, never FAILED", out.state === "PENDING", out.state);
  ok("PENDING still shows the amount so the player can identify the payment", out.txn?.amount === 7_500);
  ok("PENDING credits nothing", (await db.wallet.findByUserId("usr_ret_pending"))!.balance === 0);
  ok("PENDING leaves the transaction PROCESSING for the webhook/reconcile sweep",
    (await db.txn.findById("txn_pending_ret"))!.status === "PROCESSING");
}

// B7 — A genuinely FAILED deposit reports FAILED and stays uncredited.
{
  await mkUser("usr_ret_failed", { verified: true });
  const wallet = await db.wallet.findByUserId("usr_ret_failed");
  await db.txn.create({
    id: "txn_failed_ret", walletId: wallet!.id, userId: "usr_ret_failed",
    type: "DEPOSIT", status: "FAILED", amount: 3_000,
    fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "CARD", providerRef: "dep_declined", msisdn: null,
    description: "Card deposit failed", positionId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: now(), idempotencyKey: null,
  } as never);
  const out = await settleDepositFromReturn("usr_ret_failed", "dep_declined");
  ok("declined deposit → FAILED", out.state === "FAILED", out.state);
  ok("FAILED credits nothing", (await db.wallet.findByUserId("usr_ret_failed"))!.balance === 0);
  ok("FAILED still shows the reference so the player can quote it to support",
    out.txn?.providerRef === "dep_declined");
}

// ═══ PART C — THE IDENTITY GATE, AND THE ORDER THE DOORS ARE ASKED IN ═══════
//
// Owner ruling, Ali, 2026-09-05: no deposit until we approve the player's identity.
// PART A proves the email door. This proves the identity door AND — the half that has no
// other home — that the two are asked in the right order, after the responsible-gambling
// break. Rationale for all of it: `src/lib/server/kyc-gate.ts`.

// C1 — each refusing state is refused, with its OWN reason, and leaves NO trace.
// ⛔ FOUR STATES, NOT ONE. "Unverified" is four different sentences with four different
// next actions; a single `kyc_not_verified` for all of them is the E-232 shape — one
// token standing in for four meanings, so the player is told the wrong next step three
// times out of four.
{
  const CASES: { id: string; kyc: "NOT_STARTED" | "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "REJECTED"; reason: string }[] = [
    { id: "usr_kyc_none",    kyc: "NOT_STARTED",              reason: "kyc_not_verified" },
    { id: "usr_kyc_pending", kyc: "PENDING_REVIEW",           reason: "kyc_pending_review" },
    { id: "usr_kyc_more",    kyc: "ADDITIONAL_INFO_REQUIRED", reason: "kyc_more_info" },
    { id: "usr_kyc_rej",     kyc: "REJECTED",                 reason: "kyc_rejected" },
  ];
  for (const c of CASES) {
    // `verified: true` — the email door is OPEN, so anything refused here was refused on
    // identity and nothing else.
    await mkUser(c.id, { verified: true, kyc: c.kyc });
    const before = await txnsFor(c.id);
    const r = await deposit(c.id, { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
    ok(`C1.${c.kyc} · deposit refused`, !r.ok);
    ok(`C1.${c.kyc} · …carrying reason "${c.reason}"`,
      !r.ok && (r as { reason?: string }).reason === c.reason,
      !r.ok ? String((r as { reason?: string }).reason) : "accepted");
    // The three facts PART A pins for the email gate, on the new door. A refusal that
    // still created a row would consume a deposit cap and leave a PROCESSING txn for the
    // reconcile sweep to puzzle over.
    ok(`C1.${c.kyc} · …and left NO transaction behind`, (await txnsFor(c.id)) === before);
    ok(`C1.${c.kyc} · …and credited nothing`, (await db.wallet.findByUserId(c.id))!.balance === 0);
  }
}

// C2 — THE POSITIVE CONTROL. Without this, every assertion above is satisfied by a
// `deposit()` that refuses everybody.
{
  await mkUser("usr_kyc_ok", { verified: true, kyc: "APPROVED" });
  const r = await deposit("usr_kyc_ok", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("C2 · ★ an APPROVED player still deposits — the gate is not a blanket refusal", r.ok, r.ok ? "" : (r as { error: string }).error);
}

// C3 — ADMINS ARE NOT EXEMPT. Same rule PART A applies to the email door, same reason:
// the off-production bypass relaxes caps and SOF for test funding, and an exemption on an
// identity control is exactly how a gate rots.
{
  for (const role of ["ADMIN", "COMPLIANCE", "MODERATOR"]) {
    await mkUser(`usr_kyc_${role}`, { verified: true, role, kyc: "NOT_STARTED" });
    const r = await deposit(`usr_kyc_${role}`, { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
    ok(`C3 · ${role} with no identity is ALSO blocked`, !r.ok, r.ok ? "DEPOSITED" : "");
  }
}

// C4 — ⛔ PRECEDENCE: A RESPONSIBLE-GAMBLING BREAK OUTRANKS BOTH DOORS.
//
// 🔴 THIS IS THE ONE THAT HAD NO GUARD AND WAS ALREADY WRONG. Before 2026-09-05 the email
// gate sat ABOVE the lockout check while its own comment claimed it sat *"AFTER the
// wallet/lockout checks"* — so a SELF-EXCLUDED player with an unconfirmed address was sent
// off to go and confirm their email. Nothing measured the sequence, so the code and the
// comment disagreed silently for as long as both existed.
//
// A break is the player's own protective decision and it carries an end date they are
// entitled to be told. Being handed an errand instead is the worst available answer on
// the responsible-gambling path — it reads as an operator problem and it invites them
// back. Both other doors must lose to it.
// ⚠️ COOLING-OFF, NOT SELF-EXCLUSION, AND THE FIRST DRAFT USED THE WRONG ONE. `selfExclude`
// also FREEZES THE WALLET (`responsible-gambling.ts` — `db.wallet.update(..., FROZEN)`), so
// a self-excluded player is stopped by the `wallet.status !== "ACTIVE"` check several lines
// ABOVE the lockout branch, and never reaches the doors this section is about. The draft
// asserted `reason === "self_excluded"` and got `undefined` — it was measuring the wallet
// freeze while claiming to measure precedence. `coolOff` sets the user status and leaves the
// wallet ACTIVE, so it is the instrument that actually exercises the ordering.
{
  const { coolOff } = await import("../src/lib/server/responsible-gambling.ts");
  // Neither other door is open: no identity, no confirmed address. If precedence is
  // wrong, this refusal comes back as an identity or email errand instead of the break.
  await mkUser("usr_rg_wins", { verified: false, kyc: "NOT_STARTED" });
  await coolOff("usr_rg_wins", "24h");
  const r = await deposit("usr_rg_wins", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("C4 · a player on a break is refused", !r.ok);
  ok("C4 · ★ …told about THEIR BREAK, not sent on an identity or email errand",
    !r.ok && (r as { reason?: string }).reason === "cooling_off",
    !r.ok ? String((r as { reason?: string }).reason) : "accepted");
  ok("C4 · …and the refusal carries the END DATE the break promised them",
    !r.ok && !!(r as { detail?: { until?: string } }).detail?.until);
}

// C5 — ⚠️ WHAT ACTUALLY STOPS A SELF-EXCLUDED DEPOSIT, RECORDED BECAUSE IT SURPRISED ME.
// It is not the lockout branch: `selfExclude` freezes the wallet, and `wallet.status !==
// "ACTIVE"` is checked first. The refusal is therefore correct and immediate — but it
// carries `code: "SUSPENDED"` and NO `reason`, so `error-copy.ts` renders its generic
// *"This service is temporarily paused. Try again shortly."* to a player whose own
// protective choice is what stopped them. That is E-232's exact shape on the deposit path,
// it PRE-DATES this change, and it is pinned here so it is a known, measured fact rather
// than a surprise — the fix belongs with the wallet-frozen reason token, not with this gate.
{
  const { selfExclude } = await import("../src/lib/server/responsible-gambling.ts");
  await mkUser("usr_rg_se", { verified: true, kyc: "APPROVED" });
  await selfExclude("usr_rg_se", "6m");
  const r = await deposit("usr_rg_se", { provider: "MPESA", amount: 5_000, msisdn: "712345678" });
  ok("C5 · a self-excluded player is refused (by the wallet freeze)", !r.ok);
  ok("C5 · …and it is NOT an identity or email errand — the doors below still lose to it",
    !r.ok && (r as { reason?: string }).reason !== "kyc_not_verified"
          && (r as { code?: string }).code !== "EMAIL_UNVERIFIED",
    !r.ok ? `${(r as { code?: string }).code}/${(r as { reason?: string }).reason}` : "accepted");
}

console.log(`\ndeposit-gate-return: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
