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

async function mkUser(id: string, opts: { verified: boolean; email?: string | null; role?: string }): Promise<void> {
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

console.log(`\ndeposit-gate-return: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
