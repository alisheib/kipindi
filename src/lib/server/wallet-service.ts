/**
 * Wallet service — deposits, withdrawals, balance management.
 * Compliance:
 *  - All money movements posted via Transaction rows (immutable history)
 *  - Withdrawals require KYC APPROVED
 *  - AML threshold (TZS 1M) holds withdrawal in `AML_REVIEW`
 *  - Daily/weekly/monthly deposit limits enforced (Responsible Gambling)
 *  - Tax line shown to user but actual deduction at confirmation
 */
import { audit } from "./audit";
import { sendEmailToUser, depositConfirmedHtml, withdrawalSentHtml, withdrawalUnderReviewHtml } from "./email";
import { db, type StoredTxn } from "./store";
import { randomId } from "./crypto";
import { dispatchDeposit, dispatchWithdrawal, computeWithdrawalTax } from "./payments";
import { rateCheck } from "./rate-limit";
import { DepositSchema, AdminDepositSchema, WithdrawSchema } from "./validators";
import { checkDepositLimit, isLockedOut } from "./responsible-gambling";
import { notifyDeposit, notifyWithdraw } from "./notification-service";
import { withLock } from "./locks";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";

/** Deposit — debits external (mobile money), credits wallet on success. */
export async function deposit(userId: string, input: z.input<typeof DepositSchema>): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; balance: number }>> {
  const rl = rateCheck(userId, "wallet.deposit");
  if (!rl.allowed) return { ok: false, error: "Too many deposit attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // ── TEMPORARY admin test-funding bypass ────────────────────────────────
  // For ADMIN-role accounts (and while ADMIN_TEST_DEPOSITS isn't "false"),
  // allow uncapped play-money deposits and skip the SOF + responsible-gambling
  // deposit-limit gates, so the operator can fund a wallet to test deposits,
  // referrals and proposals. Withdrawals are unaffected (still fully gated).
  // Disable later by setting ADMIN_TEST_DEPOSITS=false (or remove this block).
  const ADMIN_TEST_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);
  const depositor = await db.user.findById(userId);
  const adminTestEnv = process.env.ADMIN_TEST_DEPOSITS;
  const adminTestAllowed = adminTestEnv === "true" || (adminTestEnv === undefined && process.env.NODE_ENV !== "production");
  const adminTest = !!depositor && ADMIN_TEST_ROLES.has(depositor.role) && adminTestAllowed;

  const parse = (adminTest ? AdminDepositSchema : DepositSchema).safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const wallet = await db.wallet.findByUserId(userId);
  if (!wallet) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
  if (wallet.status !== "ACTIVE") return { ok: false, error: "Wallet frozen.", code: "SUSPENDED" };

  // Self-exclusion / cooling-off lockout — enforced even for admin test-funding
  // so a self-excluded player cannot receive deposits regardless of role.
  const lockout = await isLockedOut(userId);
  if (lockout.locked) {
    await audit({ category: "COMPLIANCE", action: "deposit.lockout_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: lockout.reason, until: lockout.until } });
    return { ok: false, error: `You are in a ${lockout.reason === "self_exclusion" ? "self-exclusion" : "cooling-off"} period until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };
  }

  // Responsible-gambling deposit-limit check (daily / weekly / monthly).
  // Skipped for admin test-funding (see bypass note above).
  if (!adminTest) {
    const limitCheck = await checkDepositLimit(userId, parse.data.amount);
    if (!limitCheck.allowed) {
      await audit({ category: "COMPLIANCE", action: "deposit.limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: limitCheck.reason } });
      return { ok: false, error: limitCheck.reason ?? "Deposit limit reached.", code: "INVALID" };
    }
  }

  // Source-of-Funds gate — Anti-Money-Laundering Act 2006 + LCCP SR 9.2.
  // Two thresholds trigger an SOF requirement:
  //   (a) any single deposit ≥ TZS 1,000,000, OR
  //   (b) rolling 30-day cumulative deposits incl. this one ≥ TZS 5,000,000.
  // If the threshold trips and the player has no ACCEPTED SOF on file
  // (PENDING, REJECTED, or never-submitted), block the deposit with a
  // pointer to the form. UX policy: don't take their money first, then
  // freeze it for AML — make the requirement obvious *before* the call.
  const SOF_SINGLE_TXN_TZS = 1_000_000;
  const SOF_ROLLING_30D_TZS = 5_000_000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;
  const recentDeposits = (await db.txn
    .findByUser(userId, 500))
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED" && Date.parse(t.createdAt) >= thirtyDaysAgo)
    .reduce((s, t) => s + t.amount, 0);
  const cumulativeAfter = recentDeposits + parse.data.amount;
  const triggersSof =
    !adminTest && (parse.data.amount >= SOF_SINGLE_TXN_TZS || cumulativeAfter >= SOF_ROLLING_30D_TZS);
  if (triggersSof) {
    const sof = await db.sourceOfFunds.get(userId);
    if (!sof || sof.reviewStatus !== "ACCEPTED") {
      audit({
        category: "COMPLIANCE",
        action: "deposit.sof_gate_blocked",
        actorId: userId,
        targetType: "User",
        targetId: userId,
        payload: {
          amount: parse.data.amount,
          rolling30dBefore: recentDeposits,
          rolling30dAfter: cumulativeAfter,
          singleTxnThreshold: SOF_SINGLE_TXN_TZS,
          rolling30dThreshold: SOF_ROLLING_30D_TZS,
          sofStatus: sof?.reviewStatus ?? "NOT_SUBMITTED",
        },
      });
      const reasonEn =
        parse.data.amount >= SOF_SINGLE_TXN_TZS
          ? `Deposits of TZS ${SOF_SINGLE_TXN_TZS.toLocaleString()} or more require a Source of Funds declaration on file.`
          : `Your rolling 30-day deposits would exceed TZS ${SOF_ROLLING_30D_TZS.toLocaleString()}, which requires a Source of Funds declaration on file.`;
      return {
        ok: false,
        error: `${reasonEn} Submit one at /profile/source-of-funds and wait for compliance to accept it.`,
        code: "INVALID",
      };
    }
  }

  // Open the transaction in PENDING
  const txnId = `txn_${randomId(12)}`;
  const txn = await db.txn.create({
    id: txnId,
    walletId: wallet.id,
    userId,
    type: "DEPOSIT",
    status: "PROCESSING",
    amount: parse.data.amount,
    fee: 0, taxWithheld: 0,
    balanceAfter: null,
    currency: "TZS",
    provider: parse.data.provider,
    providerRef: null,
    msisdn: parse.data.msisdn ?? null,
    description: `${friendlyProvider(parse.data.provider)} deposit`,
    betId: null,
    amlReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });
  audit({ category: "WALLET", action: "deposit.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount: parse.data.amount } });

  // Dispatch to provider
  const result = await dispatchDeposit({ provider: parse.data.provider, amount: parse.data.amount, msisdn: parse.data.msisdn, userId });
  if (!result.ok) {
    await db.txn.update(txnId, { status: "FAILED", description: `${friendlyProvider(parse.data.provider)} deposit failed: ${result.reason}` });
    audit({ category: "WALLET", action: "deposit.failed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason, correlationId: result.correlationId } });
    return { ok: false, error: friendlyDepositReason(result.reason), code: "INVALID" };
  }

  // Credit wallet — under the per-wallet lock with a FRESH re-read, because the
  // `wallet` captured above is stale after the awaited dispatch: a concurrent
  // cash-out / payout / bet on the same wallet may have changed the balance in
  // the meantime. Applying the +amount delta to the live balance (not the stale
  // snapshot) prevents the deposit from clobbering those concurrent changes.
  const newBalance = await withLock(`wallet:${userId}`, async () => {
    const fresh = await db.wallet.findByUserId(userId);
    if (!fresh) return wallet.balance + parse.data.amount;
    // Atomic +delta on the live row — never writes back a stale absolute balance.
    const updated = await db.wallet.adjust(fresh.id, { balance: parse.data.amount });
    return updated?.balance ?? fresh.balance + parse.data.amount;
  });
  await db.txn.update(txnId, { status: "CONFIRMED", providerRef: result.providerRef, balanceAfter: newBalance, completedAt: new Date().toISOString() });
  audit({ category: "WALLET", action: "deposit.confirmed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, balanceAfter: newBalance } });
  notifyDeposit(userId, parse.data.amount, friendlyProvider(parse.data.provider));

  // Email receipt — best-effort, never blocks deposit
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: `Deposit confirmed · TZS ${Math.round(parse.data.amount).toLocaleString("en-US")}`,
    html: depositConfirmedHtml({ amount: parse.data.amount, method: friendlyProvider(parse.data.provider), reference: txnId, balance: newBalance }),
    tag: "deposit",
  })).catch(() => {});

  // Affiliate program — fire the first-deposit bonus and/or deposit-threshold
  // prize for whoever referred this player. Best-effort; never blocks the
  // deposit. Cumulative includes this just-confirmed deposit.
  try {
    const { onRecruitDeposit } = await import("./affiliate-service");
    const cumulativeDepositsTzs = (await db.txn
      .findByUser(userId, 1000))
      .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED")
      .reduce((sum, t) => sum + t.amount, 0);
    await onRecruitDeposit(userId, { cumulativeDepositsTzs });
  } catch { /* affiliate accrual must never break a deposit */ }

  return { ok: true, data: { txnId, status: "CONFIRMED", balance: newBalance } };
}

/** Withdrawal — debits wallet immediately, dispatches to provider, settles. */
export async function withdraw(userId: string, input: z.input<typeof WithdrawSchema>): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; tax: number; net: number }>> {
  const rl = rateCheck(userId, "wallet.withdraw");
  if (!rl.allowed) return { ok: false, error: "Too many withdrawal attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const parse = WithdrawSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND" };

  const kyc = await db.kyc.findByUserId(userId);
  if (kyc?.status !== "APPROVED") {
    audit({ category: "COMPLIANCE", action: "withdraw.kyc_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { kycStatus: kyc?.status ?? "NOT_STARTED" } });
    return { ok: false, error: "Verify your identity to withdraw.", code: "INVALID" };
  }

  const amount = parse.data.amount;
  // Withholding tax — naïve: assume entire amount is taxable winnings until we wire bet ledger
  const tax = computeWithdrawalTax(amount, amount);
  const net = amount - tax;
  const providerLabel = friendlyProvider(parse.data.provider);
  const txnId = `txn_${randomId(12)}`;

  // ── Phase A (locked): validate balance + place the hold atomically ─────────
  // Re-read inside the lock so the balance check and the debit can't be split
  // by a concurrent withdrawal/bet/payout on the same wallet (double-spend).
  const hold = await withLock(`wallet:${userId}`, async () => {
    const w = await db.wallet.findByUserId(userId);
    if (!w) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" as const };
    if (w.status !== "ACTIVE") return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };
    if (w.balance < amount) return { ok: false as const, error: "Insufficient balance.", code: "INVALID" as const };

    // Move funds from spendable balance into `hold` while in flight — atomic and
    // overdraw-guarded (WHERE balance >= amount) so concurrent debits on the same
    // wallet can't double-spend even across instances.
    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount });
    if (!updated) return { ok: false as const, error: "Insufficient balance.", code: "INVALID" as const };
    const balanceAfter = updated.balance;
    await db.txn.create({
      id: txnId,
      walletId: w.id,
      userId,
      type: "WITHDRAWAL",
      status: "PROCESSING",
      amount: -amount,
      fee: 0,
      taxWithheld: tax,
      balanceAfter,
      currency: "TZS",
      provider: parse.data.provider,
      providerRef: null,
      msisdn: parse.data.msisdn ?? null,
      description: `${providerLabel} withdrawal`,
      betId: null,
      amlReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    });
    audit({ category: "WALLET", action: "withdraw.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount, tax } });
    return { ok: true as const };
  });
  if (!hold.ok) return hold;

  // ── Provider dispatch (UNLOCKED): never hold a wallet lock across network I/O.
  const result = await dispatchWithdrawal({ provider: parse.data.provider, amount: net, msisdn: parse.data.msisdn, userId });

  // ── Phase B (locked): settle by applying DELTAS to a fresh wallet read ──────
  // We must never write back an absolute balance/hold captured before the await
  // above — concurrent deposits/credits would be silently clobbered. Reversing
  // *this* withdrawal's hold delta is the only safe mutation.
  if (!result.ok) {
    await withLock(`wallet:${userId}`, async () => {
      const w = await db.wallet.findByUserId(userId);
      // Reverse exactly this withdrawal's delta: return funds, release the hold.
      if (w) await db.wallet.adjust(w.id, { balance: amount, hold: -amount });
    });
    await db.txn.update(txnId, { status: "FAILED", description: `Withdrawal failed: ${result.reason}` });
    audit({ category: "WALLET", action: "withdraw.failed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason } });
    notifyWithdraw(userId, { status: "FAILED", amount, provider: providerLabel, reason: result.reason });
    return { ok: false, error: "Withdrawal failed. Funds returned to your balance.", code: "INVALID" };
  }

  if (result.status === "AML_REVIEW") {
    // Funds stay in `hold` pending manual review — no settle delta yet.
    await db.txn.update(txnId, { status: "AML_REVIEW", providerRef: result.providerRef, amlReason: "Threshold ≥ TZS 1,000,000" });
    audit({ category: "COMPLIANCE", action: "withdraw.aml_held", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { amount } });
    notifyWithdraw(userId, { status: "AML_REVIEW", amount, net, provider: providerLabel });
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Withdrawal under review · TZS ${Math.round(amount).toLocaleString("en-US")}`,
      html: withdrawalUnderReviewHtml({ amount, reference: txnId }),
      tag: "withdrawal-review",
    })).catch(() => {});
    return { ok: true, data: { txnId, status: "AML_REVIEW", tax, net } };
  }

  // Success — the held funds have left the building; clear this withdrawal's hold.
  await withLock(`wallet:${userId}`, async () => {
    const w = await db.wallet.findByUserId(userId);
    // Funds have left the platform — release this withdrawal's hold.
    if (w) await db.wallet.adjust(w.id, { hold: -amount });
  });
  await db.txn.update(txnId, { status: "CONFIRMED", providerRef: result.providerRef, completedAt: new Date().toISOString() });
  audit({ category: "WALLET", action: "withdraw.confirmed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, net } });
  notifyWithdraw(userId, { status: "CONFIRMED", amount, net, provider: providerLabel });
  sendEmailToUser(userId, (email) => ({
    to: email,
    subject: `Withdrawal sent · TZS ${Math.round(net).toLocaleString("en-US")}`,
    html: withdrawalSentHtml({ amount: net, destination: providerLabel, reference: txnId }),
    tag: "withdrawal",
  })).catch(() => {});

  return { ok: true, data: { txnId, status: "CONFIRMED", tax, net } };
}

export async function listTransactions(userId: string, limit = 50) {
  return await db.txn.findByUser(userId, limit);
}

/**
 * Credit an internal (non-deposit) amount to a wallet — used by promotional
 * money flows: affiliate rewards and player-proposal prizes. Posts a CONFIRMED
 * transaction so the credit has immutable history like every other money
 * movement. Wrapped in withLock to prevent concurrent credits from reading the
 * same stale balance and clobbering each other (e.g. affiliate reward + proposal
 * prize firing simultaneously for the same user).
 *
 * Returns the new balance, or null if the wallet is missing/frozen or the
 * amount is non-positive.
 */
export async function creditInternal(
  userId: string,
  amount: number,
  opts: { description: string; type?: StoredTxn["type"] },
): Promise<number | null> {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return withLock(`wallet:${userId}`, async () => {
    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet || wallet.status !== "ACTIVE") return null;
    const updated = await db.wallet.adjust(wallet.id, { balance: amount });
    const newBalance = updated?.balance ?? wallet.balance + amount;
    const now = new Date().toISOString();
    await db.txn.create({
      id: `txn_${randomId(12)}`,
      walletId: wallet.id,
      userId,
      type: opts.type ?? "BONUS_CREDIT",
      status: "CONFIRMED",
      amount,
      fee: 0,
      taxWithheld: 0,
      balanceAfter: newBalance,
      currency: "TZS",
      provider: "INTERNAL",
      providerRef: null,
      msisdn: null,
      description: opts.description,
      betId: null,
      amlReason: null,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    return newBalance;
  });
}

function friendlyProvider(p: string): string {
  switch (p) {
    case "MPESA": return "M-Pesa";
    case "AIRTEL_MONEY": return "Airtel Money";
    case "HALO_PESA": return "HaloPesa";
    case "MIXX": return "Mixx by Yas";
    case "CARD": return "Card";
    case "BANK_TRANSFER": return "Bank transfer";
    default: return p;
  }
}

function friendlyDepositReason(reason: string): string {
  switch (reason) {
    case "INSUFFICIENT_FUNDS": return "Not enough balance on the source account · Salio halitoshi kwenye akaunti.";
    case "PROVIDER_DOWN":      return "Provider unavailable. Try again in a moment · Jaribu tena baada ya muda.";
    case "TIMEOUT":            return "The provider timed out. Try again · Muda umemalizika. Jaribu tena.";
    case "DECLINED":           return "The provider declined the transaction · Muamala umekataliwa.";
    case "FRAUD":              return "Transaction blocked. Contact support · Muamala umezuiwa. Wasiliana na msaada.";
    default:                   return "Deposit failed · Amana imeshindikana.";
  }
}
