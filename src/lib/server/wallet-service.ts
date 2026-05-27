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
import { db, type StoredTxn } from "./store";
import { randomId } from "./crypto";
import { dispatchDeposit, dispatchWithdrawal, computeWithdrawalTax } from "./payments";
import { rateCheck } from "./rate-limit";
import { DepositSchema, WithdrawSchema } from "./validators";
import { checkDepositLimit, isLockedOut } from "./responsible-gambling";
import { notifyDeposit, notifyWithdraw } from "./notification-service";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";

/** Deposit — debits external (mobile money), credits wallet on success. */
export async function deposit(userId: string, input: z.input<typeof DepositSchema>): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; balance: number }>> {
  const rl = rateCheck(userId, "wallet.deposit");
  if (!rl.allowed) return { ok: false, error: "Too many deposit attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const parse = DepositSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const wallet = db.wallet.findByUserId(userId);
  if (!wallet) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
  if (wallet.status !== "ACTIVE") return { ok: false, error: "Wallet frozen.", code: "SUSPENDED" };

  // Self-exclusion / cooling-off lockout
  const lockout = isLockedOut(userId);
  if (lockout.locked) {
    audit({ category: "COMPLIANCE", action: "deposit.lockout_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: lockout.reason, until: lockout.until } });
    return { ok: false, error: `You are in a ${lockout.reason === "self_exclusion" ? "self-exclusion" : "cooling-off"} period until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };
  }

  // Responsible-gambling deposit-limit check (daily / weekly / monthly)
  const limitCheck = checkDepositLimit(userId, parse.data.amount);
  if (!limitCheck.allowed) {
    audit({ category: "COMPLIANCE", action: "deposit.limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: limitCheck.reason } });
    return { ok: false, error: limitCheck.reason ?? "Deposit limit reached.", code: "INVALID" };
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
  const recentDeposits = db.txn
    .findByUser(userId, 500)
    .filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED" && Date.parse(t.createdAt) >= thirtyDaysAgo)
    .reduce((s, t) => s + t.amount, 0);
  const cumulativeAfter = recentDeposits + parse.data.amount;
  const triggersSof =
    parse.data.amount >= SOF_SINGLE_TXN_TZS || cumulativeAfter >= SOF_ROLLING_30D_TZS;
  if (triggersSof) {
    const sof = db.sourceOfFunds.get(userId);
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
  const txn = db.txn.create({
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
    db.txn.update(txnId, { status: "FAILED", description: `${friendlyProvider(parse.data.provider)} deposit failed: ${result.reason}` });
    audit({ category: "WALLET", action: "deposit.failed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason, correlationId: result.correlationId } });
    return { ok: false, error: friendlyDepositReason(result.reason), code: "INVALID" };
  }

  // Credit wallet
  const newBalance = wallet.balance + parse.data.amount;
  db.wallet.update(wallet.id, { balance: newBalance });
  db.txn.update(txnId, { status: "CONFIRMED", providerRef: result.providerRef, balanceAfter: newBalance, completedAt: new Date().toISOString() });
  audit({ category: "WALLET", action: "deposit.confirmed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, balanceAfter: newBalance } });
  notifyDeposit(userId, parse.data.amount, friendlyProvider(parse.data.provider));

  return { ok: true, data: { txnId, status: "CONFIRMED", balance: newBalance } };
}

/** Withdrawal — debits wallet immediately, dispatches to provider, settles. */
export async function withdraw(userId: string, input: z.input<typeof WithdrawSchema>): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; tax: number; net: number }>> {
  const rl = rateCheck(userId, "wallet.withdraw");
  if (!rl.allowed) return { ok: false, error: "Too many withdrawal attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const parse = WithdrawSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  const user = db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND" };

  const kyc = db.kyc.findByUserId(userId);
  if (kyc?.status !== "APPROVED") {
    audit({ category: "COMPLIANCE", action: "withdraw.kyc_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { kycStatus: kyc?.status ?? "NOT_STARTED" } });
    return { ok: false, error: "Verify your identity to withdraw.", code: "INVALID" };
  }

  const wallet = db.wallet.findByUserId(userId);
  if (!wallet) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
  if (wallet.status !== "ACTIVE") return { ok: false, error: "Wallet frozen.", code: "SUSPENDED" };
  if (wallet.balance < parse.data.amount) {
    return { ok: false, error: "Insufficient balance.", code: "INVALID" };
  }

  // Withholding tax — naïve: assume entire amount is taxable winnings until we wire bet ledger
  const tax = computeWithdrawalTax(parse.data.amount, parse.data.amount);
  const net = parse.data.amount - tax;

  // Hold the funds while in flight
  db.wallet.update(wallet.id, { balance: wallet.balance - parse.data.amount, hold: wallet.hold + parse.data.amount });

  const txnId = `txn_${randomId(12)}`;
  db.txn.create({
    id: txnId,
    walletId: wallet.id,
    userId,
    type: "WITHDRAWAL",
    status: "PROCESSING",
    amount: -parse.data.amount,
    fee: 0,
    taxWithheld: tax,
    balanceAfter: wallet.balance - parse.data.amount,
    currency: "TZS",
    provider: parse.data.provider,
    providerRef: null,
    msisdn: parse.data.msisdn ?? null,
    description: `${friendlyProvider(parse.data.provider)} withdrawal`,
    betId: null,
    amlReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  });
  audit({ category: "WALLET", action: "withdraw.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount: parse.data.amount, tax } });

  const providerLabel = friendlyProvider(parse.data.provider);

  const result = await dispatchWithdrawal({ provider: parse.data.provider, amount: net, msisdn: parse.data.msisdn, userId });
  if (!result.ok) {
    // refund the hold
    db.wallet.update(wallet.id, { balance: wallet.balance, hold: wallet.hold });
    db.txn.update(txnId, { status: "FAILED", description: `Withdrawal failed: ${result.reason}` });
    audit({ category: "WALLET", action: "withdraw.failed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason } });
    notifyWithdraw(userId, { status: "FAILED", amount: parse.data.amount, provider: providerLabel, reason: result.reason });
    return { ok: false, error: "Withdrawal failed. Funds returned to your balance.", code: "INVALID" };
  }

  if (result.status === "AML_REVIEW") {
    db.txn.update(txnId, { status: "AML_REVIEW", providerRef: result.providerRef, amlReason: "Threshold ≥ TZS 1,000,000" });
    audit({ category: "COMPLIANCE", action: "withdraw.aml_held", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { amount: parse.data.amount } });
    notifyWithdraw(userId, { status: "AML_REVIEW", amount: parse.data.amount, net, provider: providerLabel });
    return { ok: true, data: { txnId, status: "AML_REVIEW", tax, net } };
  }

  // Release hold, complete withdrawal
  db.wallet.update(wallet.id, { hold: wallet.hold });
  db.txn.update(txnId, { status: "CONFIRMED", providerRef: result.providerRef, completedAt: new Date().toISOString() });
  audit({ category: "WALLET", action: "withdraw.confirmed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, net } });
  notifyWithdraw(userId, { status: "CONFIRMED", amount: parse.data.amount, net, provider: providerLabel });

  return { ok: true, data: { txnId, status: "CONFIRMED", tax, net } };
}

export function listTransactions(userId: string, limit = 50) {
  return db.txn.findByUser(userId, limit);
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
