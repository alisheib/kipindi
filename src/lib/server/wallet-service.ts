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
import { sendEmailToUser, depositConfirmedHtml, withdrawalSentHtml, withdrawalUnderReviewHtml, amlRejectRefundHtml } from "./email";
import { db, type StoredTxn } from "./store";
import { randomId } from "./crypto";
import { dispatchDeposit, dispatchWithdrawal, computeWithdrawalTax } from "./payments";
import { rateCheck } from "./rate-limit";
import { DepositSchema, AdminDepositSchema, WithdrawSchema } from "./validators";
import { checkDepositLimit, isLockedOut } from "./responsible-gambling";
import { notifyDeposit, notifyWithdraw, notifyAdminsAmlReview } from "./notification-service";
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
  // Hard rule: the uncapped, gate-skipping admin test-deposit path can NEVER be
  // active in production — not even if ADMIN_TEST_DEPOSITS="true" leaks into the
  // prod env. Off-prod it defaults on (unless explicitly disabled).
  const adminTestAllowed = process.env.NODE_ENV !== "production" && adminTestEnv !== "false";
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

  // Record the provider reference NOW so an asynchronous confirmation webhook
  // can correlate back to this transaction (and so reconciliation can find it).
  await db.txn.update(txnId, { providerRef: result.providerRef });

  if (result.status === "PENDING") {
    // Real mobile-money / card collection is ASYNCHRONOUS: the initiate call only
    // pushes a prompt to the customer's handset. Money has NOT moved yet, so we
    // must NOT credit the wallet here. Leave the txn PROCESSING — the webhook is
    // the SOLE authority that credits it, exactly once, on a confirmed callback.
    audit({ category: "WALLET", action: "deposit.pending", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef } });
    const cur = await db.wallet.findByUserId(userId);
    return { ok: true, data: { txnId, status: "PROCESSING", balance: cur?.balance ?? 0 } };
  }

  // Synchronous provider (or the dev mock): the collection already settled, so
  // credit immediately. settleDepositConfirmed is the SAME exactly-once path the
  // webhook uses, so the two can never double-credit.
  const settled = await settleDepositConfirmed(txnId, result.providerRef);
  return { ok: true, data: { txnId, status: "CONFIRMED", balance: settled.balance } };
}

/**
 * Credit a deposit and mark it CONFIRMED — EXACTLY ONCE. Called from the
 * synchronous provider path AND the async webhook. Idempotent: a second call
 * once the txn is no longer PROCESSING is a no-op (status-gated under the
 * per-wallet lock, so concurrent webhook retries serialize and only one wins).
 * The receipt / notification / affiliate side-effects fire only on the call
 * that actually credits.
 */
async function settleDepositConfirmed(txnId: string, providerRef?: string): Promise<{ credited: boolean; balance: number }> {
  const pre = await db.txn.findById(txnId);
  if (!pre) return { credited: false, balance: 0 };

  const outcome = await withLock(`wallet:${pre.userId}`, async (): Promise<{ credited: boolean; balance: number; txn?: StoredTxn }> => {
    const t = await db.txn.findById(txnId);
    if (!t) return { credited: false, balance: 0 };
    if (t.status !== "PROCESSING") {
      // Already settled — idempotent no-op. Return the live balance.
      const w = await db.wallet.findByUserId(t.userId);
      return { credited: false, balance: w?.balance ?? 0 };
    }
    const fresh = await db.wallet.findByUserId(t.userId);
    if (!fresh) return { credited: false, balance: 0 };
    // Atomic +delta on the live row — never writes back a stale absolute balance.
    const updated = await db.wallet.adjust(fresh.id, { balance: t.amount });
    const newBalance = updated?.balance ?? fresh.balance + t.amount;
    await db.txn.update(txnId, { status: "CONFIRMED", providerRef: providerRef ?? t.providerRef, balanceAfter: newBalance, completedAt: new Date().toISOString() });
    return { credited: true, balance: newBalance, txn: t };
  });

  if (outcome.credited && outcome.txn) {
    const t = outcome.txn;
    audit({ category: "WALLET", action: "deposit.confirmed", actorId: t.userId, targetType: "Transaction", targetId: t.id, payload: { providerRef: providerRef ?? t.providerRef, balanceAfter: outcome.balance } });
    notifyDeposit(t.userId, t.amount, friendlyProvider(t.provider));
    sendEmailToUser(t.userId, (email) => ({
      to: email,
      subject: `Deposit confirmed · TZS ${Math.round(t.amount).toLocaleString("en-US")}`,
      html: depositConfirmedHtml({ amount: t.amount, method: friendlyProvider(t.provider), reference: t.id, balance: outcome.balance }),
      tag: "deposit",
    })).catch(() => {});
    // Affiliate accrual (first-deposit bonus / threshold prize) — best-effort.
    try {
      const { onRecruitDeposit } = await import("./affiliate-service");
      const cumulativeDepositsTzs = (await db.txn.findByUser(t.userId, 1000))
        .filter((x) => x.type === "DEPOSIT" && x.status === "CONFIRMED")
        .reduce((sum, x) => sum + x.amount, 0);
      await onRecruitDeposit(t.userId, { cumulativeDepositsTzs });
    } catch { /* affiliate accrual must never break a deposit */ }

    // Deposit cashback — AUTO mode only (Management Bonus Rules §2).
    // In REQUEST mode (default), cashback is not automatic: the player must lose
    // the deposited amount, submit a request, and management approves (10% of the
    // qualifying deposit). In AUTO (legacy) mode, every confirmed deposit credits
    // cashbackPercentage% into the bonus wallet automatically.
    try {
      const { getBonusConfig } = await import("./bonus-config");
      const cfg = getBonusConfig();
      if (cfg.enabled && cfg.cashbackEnabled && cfg.cashbackMode === "AUTO" && cfg.cashbackPercentage > 0) {
        const cashbackTzs = Math.floor((t.amount * cfg.cashbackPercentage) / 100);
        if (cashbackTzs > 0) {
          const { creditBonus } = await import("./bonus-service");
          await creditBonus(t.userId, {
            amountTzs: cashbackTzs,
            source: "CASHBACK",
            sourceRef: `deposit:${t.id}`,
            note: `${cfg.cashbackPercentage}% cashback on deposit ${t.id}`,
          });
        }
      }
    } catch (err) {
      audit({ category: "WALLET", action: "cashback.failed", actorId: t.userId, targetType: "Transaction", targetId: t.id, payload: { error: String((err as Error)?.message ?? err) } });
    }
  }
  return { credited: outcome.credited, balance: outcome.balance };
}

/** Mark a still-pending deposit FAILED (webhook failure / reconciliation
 *  timeout). No wallet movement — a PENDING deposit was never credited.
 *  Idempotent: only acts while the txn is PROCESSING. */
async function settleDepositFailed(txnId: string, reason: string): Promise<boolean> {
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "PROCESSING") return false;
  await db.txn.update(txnId, { status: "FAILED", description: `${friendlyProvider(t.provider)} deposit failed: ${reason}` });
  audit({ category: "WALLET", action: "deposit.failed", actorId: t.userId, targetType: "Transaction", targetId: txnId, payload: { reason } });
  return true;
}

/** Finalize a held withdrawal once the payout is confirmed: release the hold
 *  (funds have left the platform) and mark CONFIRMED. Exactly-once / idempotent
 *  under the per-wallet lock. */
async function settleWithdrawalConfirmed(txnId: string): Promise<boolean> {
  const pre = await db.txn.findById(txnId);
  if (!pre) return false;
  const done = await withLock(`wallet:${pre.userId}`, async (): Promise<StoredTxn | null> => {
    const t = await db.txn.findById(txnId);
    if (!t || t.status !== "PROCESSING") return null;
    const amt = Math.abs(t.amount);
    const w = await db.wallet.findByUserId(t.userId);
    if (w) await db.wallet.adjust(w.id, { hold: -amt });
    await db.txn.update(txnId, { status: "CONFIRMED", completedAt: new Date().toISOString() });
    return t;
  });
  if (done) {
    const net = Math.abs(done.amount) - done.taxWithheld;
    audit({ category: "WALLET", action: "withdraw.confirmed", actorId: done.userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: done.providerRef, net } });
    notifyWithdrawalSent(done);
  }
  return !!done;
}

/**
 * Player-facing "withdrawal sent" receipt (in-app + email). Shared by the normal
 * settle path AND the AML-approval release path (admin/aml/actions.ts), so a
 * large (≥ TZS 1M) two-officer-approved withdrawal gets the same confirmation as
 * an ordinary one — previously the AML approve path released the funds silently.
 */
export function notifyWithdrawalSent(txn: { id: string; userId: string; amount: number; taxWithheld: number; provider: string | null }): void {
  const gross = Math.abs(txn.amount);
  const net = gross - txn.taxWithheld;
  notifyWithdraw(txn.userId, { status: "CONFIRMED", amount: gross, net, provider: friendlyProvider(txn.provider) });
  sendEmailToUser(txn.userId, (email) => ({
    to: email,
    subject: `Withdrawal sent · TZS ${Math.round(net).toLocaleString("en-US")}`,
    html: withdrawalSentHtml({ amount: net, destination: friendlyProvider(txn.provider), reference: txn.id }),
    tag: "withdrawal",
  })).catch(() => {});
}

/** Reverse a held withdrawal whose payout failed: return the funds to spendable
 *  balance, release the hold, mark FAILED. Exactly-once under the wallet lock. */
async function settleWithdrawalFailed(txnId: string, reason: string): Promise<boolean> {
  const pre = await db.txn.findById(txnId);
  if (!pre) return false;
  const done = await withLock(`wallet:${pre.userId}`, async (): Promise<StoredTxn | null> => {
    const t = await db.txn.findById(txnId);
    if (!t || t.status !== "PROCESSING") return null;
    const amt = Math.abs(t.amount);
    const w = await db.wallet.findByUserId(t.userId);
    if (w) await db.wallet.adjust(w.id, { balance: amt, hold: -amt });
    await db.txn.update(txnId, { status: "FAILED", description: `Withdrawal failed: ${reason}` });
    return t;
  });
  if (done) {
    const refunded = Math.abs(done.amount);
    audit({ category: "WALLET", action: "withdraw.failed", actorId: done.userId, targetType: "Transaction", targetId: txnId, payload: { reason } });
    notifyWithdraw(done.userId, { status: "FAILED", amount: refunded, provider: friendlyProvider(done.provider), reason });
    // Dual-channel parity with every other money event: the funds came back to
    // the wallet, so the player gets an email too (purpose-built refund template).
    sendEmailToUser(done.userId, (email) => ({
      to: email,
      subject: `Withdrawal returned · TZS ${Math.round(refunded).toLocaleString("en-US")}`,
      html: amlRejectRefundHtml({ amount: refunded, reason }),
      tag: "withdrawal",
    })).catch(() => {});
  }
  return !!done;
}

/**
 * Settle a payment from a verified provider webhook. The single entry point the
 * webhook route calls; routes by transaction type and confirmed/failed status.
 * All underlying settle fns are idempotent, so a retried (at-least-once) webhook
 * is safe. Returns a small verdict for the route to log.
 */
export async function settlePaymentWebhook(input: { providerRef: string; status: "CONFIRMED" | "FAILED" }): Promise<{ handled: boolean; reason: string }> {
  const txn = await db.txn.findByProviderRef(input.providerRef);
  if (!txn) return { handled: false, reason: "unknown-reference" };
  if (txn.status !== "PROCESSING") return { handled: true, reason: `already-${txn.status.toLowerCase()}` };

  if (txn.type === "DEPOSIT") {
    if (input.status === "CONFIRMED") await settleDepositConfirmed(txn.id, txn.providerRef ?? input.providerRef);
    else await settleDepositFailed(txn.id, "provider-reported-failure");
    return { handled: true, reason: `deposit-${input.status.toLowerCase()}` };
  }
  if (txn.type === "WITHDRAWAL") {
    if (input.status === "CONFIRMED") await settleWithdrawalConfirmed(txn.id);
    else await settleWithdrawalFailed(txn.id, "provider-reported-failure");
    return { handled: true, reason: `withdrawal-${input.status.toLowerCase()}` };
  }
  return { handled: false, reason: `untracked-type-${txn.type.toLowerCase()}` };
}

/**
 * Sweep deposits/withdrawals stuck in PROCESSING past `olderThanMs` (no webhook
 * ever arrived) into a terminal state — deposits FAIL (never credited),
 * withdrawals reverse the hold. Intended to be run on a schedule (cron). Returns
 * how many of each it swept.
 */
export async function reconcileStalePayments(olderThanMs = 30 * 60 * 1000): Promise<{ depositsFailed: number; withdrawalsReversed: number }> {
  const cutoff = Date.now() - olderThanMs;
  const stale = (await db.txn.listByStatus("PROCESSING")).filter((t) => Date.parse(t.createdAt) < cutoff);
  let depositsFailed = 0;
  let withdrawalsReversed = 0;
  for (const t of stale) {
    if (t.type === "DEPOSIT") { if (await settleDepositFailed(t.id, "reconcile-timeout")) depositsFailed++; }
    else if (t.type === "WITHDRAWAL") { if (await settleWithdrawalFailed(t.id, "reconcile-timeout")) withdrawalsReversed++; }
  }
  if (stale.length) audit({ category: "WALLET", action: "payments.reconcile_sweep", actorId: null, targetType: null, targetId: null, payload: { olderThanMs, depositsFailed, withdrawalsReversed } });
  return { depositsFailed, withdrawalsReversed };
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
    // Reverse the hold (return funds) + mark FAILED — shared, idempotent path.
    await settleWithdrawalFailed(txnId, result.reason);
    return { ok: false, error: "Withdrawal failed. Funds returned to your balance.", code: "INVALID" };
  }

  // Record the provider reference for webhook correlation / reconciliation.
  await db.txn.update(txnId, { providerRef: result.providerRef });

  if (result.status === "AML_REVIEW") {
    // Funds stay in `hold` pending manual review — no settle delta yet.
    await db.txn.update(txnId, { status: "AML_REVIEW", amlReason: "Threshold ≥ TZS 1,000,000" });
    audit({ category: "COMPLIANCE", action: "withdraw.aml_held", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { amount } });
    notifyWithdraw(userId, { status: "AML_REVIEW", amount, net, provider: providerLabel });
    // Alert compliance officers (bell + email) so they act on the queue.
    notifyAdminsAmlReview({ txnKind: "WITHDRAWAL", amountTzs: amount, reference: txnId }).catch(() => {});
    sendEmailToUser(userId, (email) => ({
      to: email,
      subject: `Withdrawal under review · TZS ${Math.round(amount).toLocaleString("en-US")}`,
      html: withdrawalUnderReviewHtml({ amount, reference: txnId }),
      tag: "withdrawal-review",
    })).catch(() => {});
    return { ok: true, data: { txnId, status: "AML_REVIEW", tax, net } };
  }

  if (result.status === "PENDING") {
    // Async payout: funds stay in `hold` until the provider's payout webhook
    // confirms (release hold) or fails (reverse) the disbursement. The webhook
    // is the authority — we don't release the hold here.
    audit({ category: "WALLET", action: "withdraw.pending", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, net } });
    notifyWithdraw(userId, { status: "INITIATED", amount, net, provider: providerLabel });
    return { ok: true, data: { txnId, status: "PROCESSING", tax, net } };
  }

  // CONFIRMED (synchronous provider / mock): release the hold + finalize. Same
  // exactly-once path the payout webhook uses — they can't double-settle.
  await settleWithdrawalConfirmed(txnId);
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
    const txnId = `txn_${randomId(12)}`;
    const txnType = opts.type ?? "BONUS_CREDIT";
    await db.txn.create({
      id: txnId,
      walletId: wallet.id,
      userId,
      type: txnType,
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
    audit({
      category: "WALLET",
      action: "wallet.credit_internal",
      actorId: null,
      targetType: "Wallet",
      targetId: wallet.id,
      payload: { userId, txnId, type: txnType, amount, balanceAfter: newBalance, description: opts.description },
    });
    return newBalance;
  });
}

function friendlyProvider(p: string | null | undefined): string {
  switch (p) {
    case "MPESA": return "M-Pesa";
    case "AIRTEL_MONEY": return "Airtel Money";
    case "HALO_PESA": return "HaloPesa";
    case "MIXX": return "Mixx by Yas";
    case "CARD": return "Card";
    case "BANK_TRANSFER": return "Bank transfer";
    default: return p ?? "Mobile money";
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
