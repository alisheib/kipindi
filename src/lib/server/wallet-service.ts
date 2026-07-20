/**
 * Wallet service — deposits, withdrawals, balance management.
 * Compliance:
 *  - All money movements posted via Transaction rows (immutable history)
 *  - Withdrawals require KYC APPROVED
 *  - AML threshold (TZS 1M) holds withdrawal in `AML_REVIEW`
 *  - Daily/weekly/monthly deposit limits enforced (Responsible Gambling)
 *  - A withdrawal is charged ONE fee: `withdrawalFeeRate` (1%), part of which
 *    (`withdrawalGatewayShareRate`) is the payment gateway's. There is NO
 *    withholding tax — see the note in payments.ts. Taxes are only ever levied
 *    on OUR commission, never on a player's money.
 */
import { audit } from "./audit";
import { sendEmailToUser, depositConfirmedHtml, depositPendingHtml, depositFailedHtml, depositReversedHtml, withdrawalSentHtml, withdrawalUnderReviewHtml, amlRejectRefundHtml } from "./email";
import { db, type StoredTxn } from "./store";
import { randomId } from "./crypto";
import { dispatchDeposit, dispatchWithdrawal, verifyDepositStatus, verifyWithdrawalStatus, type CardCheckoutContext } from "./payments";
import { isPaymentPaused } from "./payment-ops";
import { isMaintenanceMode, maintenanceMessage } from "./platform-config";
import { rateCheckAsync } from "./rate-limit";
import { DepositSchema, AdminDepositSchema, WithdrawSchema } from "./validators";
import { checkDepositLimit, isLockedOut } from "./responsible-gambling";
import { notifyDeposit, notifyWithdraw, notifyAdminsAmlReview } from "./notification-service";
import { withLock } from "./locks";
import { emit } from "./event-bus";
import { postLedgerEntries, depositEntries, withdrawalEntries, internalCreditEntries, adjustmentEntries, withMoneyTx } from "./ledger";
import { getEffectiveConfig } from "./market-config";
import { computeWithdrawalFee } from "@/lib/payout";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";
import { formatTzs } from "@/lib/utils";

/** Deposit — debits external (mobile money), credits wallet on success. */
export async function deposit(
  userId: string,
  input: z.input<typeof DepositSchema>,
  idempotencyKey?: string,
  /** CARD only — buyer + billing details and the return URLs for Selcom's hosted
   *  checkout. Ignored on the mobile-money rails, which push to the handset. */
  card?: CardCheckoutContext,
): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; balance: number; redirectUrl?: string }>> {
  const rl = await rateCheckAsync(userId, "wallet.deposit");
  if (!rl.allowed) return { ok: false, error: "Too many deposit attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Idempotency: if this key was already used, return the existing txn result.
  // (Returned even during maintenance — it's an already-made deposit, not a new one.)
  if (idempotencyKey) {
    const existing = await db.txn.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const w = await db.wallet.findByUserId(userId);
      return { ok: true, data: { txnId: existing.id, status: existing.status, balance: w?.balance ?? 0 } };
    }
  }

  // Global maintenance switch (§9.3 #1) — new deposits are paused platform-wide.
  // Withdrawals + cash-outs deliberately stay open so funds are never trapped.
  if (await isMaintenanceMode()) {
    return { ok: false, error: await maintenanceMessage(), code: "SUSPENDED" };
  }

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

  // ADM4 kill-switch — deposits for this provider may be paused by an operator.
  if (await isPaymentPaused(parse.data.provider, "deposits")) {
    return { ok: false, error: "Deposits for this provider are temporarily paused. Try another method or check back shortly.", code: "SUSPENDED" };
  }

  const wallet = await db.wallet.findByUserId(userId);
  if (!wallet) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
  if (wallet.status !== "ACTIVE") return { ok: false, error: "Wallet frozen.", code: "SUSPENDED" };

  // ── EMAIL-VERIFICATION GATE (the middle rung of the trust ladder) ───────────
  // browse free → VERIFY EMAIL TO DEPOSIT → KYC to withdraw.
  //
  // Why deposit and not sign-up: blocking sign-up costs conversion for no safety
  // gain, whereas the first deposit is the first moment a real inbox actually
  // matters — that address is where the receipt goes, and it is the evidence we
  // rely on in a chargeback or a regulator dispute. Withdrawal stays KYC-gated
  // (a heavier check for money leaving).
  //
  // Deliberately placed AFTER the wallet/lockout checks and BEFORE the reserving
  // lock: a blocked deposit must not create a PROCESSING row, consume a deposit
  // cap, or reach the gateway. `depositor` is already loaded above.
  //
  // ⚠️ Admins are NOT exempt. The bypass above only relaxes caps/SOF for test
  // funding off-production; the ownership signal is cheap to satisfy and an
  // exemption here is exactly how a gate rots.
  if (!depositor?.emailVerifiedAt) {
    audit({
      category: "COMPLIANCE",
      action: "deposit.email_unverified_blocked",
      actorId: userId, targetType: "User", targetId: userId,
      payload: { hasEmail: !!depositor?.email },
    });
    return {
      ok: false,
      code: "EMAIL_UNVERIFIED",
      error: depositor?.email
        ? "Confirm your email address before your first deposit. We sent a link to your inbox — open it, then come back."
        : "Add and confirm your email address before your first deposit.",
    };
  }

  // Self-exclusion / cooling-off lockout — enforced even for admin test-funding
  // so a self-excluded player cannot receive deposits regardless of role.
  const lockout = await isLockedOut(userId);
  if (lockout.locked) {
    await audit({ category: "COMPLIANCE", action: "deposit.lockout_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: lockout.reason, until: lockout.until } });
    return { ok: false, error: `You are in a ${lockout.reason === "self_exclusion" ? "self-exclusion" : "cooling-off"} period until ${new Date(lockout.until!).toLocaleString("en-GB")}.`, code: "SUSPENDED" };
  }

  // ── Atomic reservation: RG deposit-cap + SOF gate + PROCESSING row (audit C4) ──
  // These read the deposit history and then commit a PROCESSING row, so they MUST
  // be atomic per wallet — otherwise N concurrent deposits each read the
  // pre-deposit total and all clear a cap only one should (10× the daily limit by
  // double-tapping). The wallet lock serialises the read-then-reserve, and
  // sumDepositsSince(..., includePending=true) counts the just-reserved PROCESSING
  // rows so the next deposit sees the earlier ones. The ~1.5s provider dispatch is
  // deliberately kept OUT of the lock (below) — a network call must never hold it.
  const SOF_SINGLE_TXN_TZS = 1_000_000;
  const SOF_ROLLING_30D_TZS = 5_000_000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;

  type Reservation =
    | { ok: true; txn: StoredTxn; reused: boolean }
    | { ok: false; error: string; code: "INVALID" };

  const reservation: Reservation = await withLock(`wallet:${userId}`, async (): Promise<Reservation> => {
    // Responsible-gambling deposit-limit (daily / weekly / monthly), re-read
    // INSIDE the lock. Skipped for admin test-funding (see bypass note above).
    if (!adminTest) {
      const limitCheck = await checkDepositLimit(userId, parse.data.amount);
      if (!limitCheck.allowed) {
        await audit({ category: "COMPLIANCE", action: "deposit.limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: limitCheck.reason } });
        return { ok: false, error: limitCheck.reason ?? "Deposit limit reached.", code: "INVALID" };
      }
    }

    // Source-of-Funds gate — AML Act 2006 + LCCP SR 9.2. An SOF on file is required
    // when (a) a single deposit ≥ 1,000,000, or (b) rolling 30-day cumulative (incl.
    // this one) ≥ 5,000,000. Same rolling sum as the cap → kept atomic here.
    const recentDeposits = await db.txn.sumDepositsSince(userId, thirtyDaysAgo, true);
    const cumulativeAfter = recentDeposits + parse.data.amount;
    const triggersSof = !adminTest && (parse.data.amount >= SOF_SINGLE_TXN_TZS || cumulativeAfter >= SOF_ROLLING_30D_TZS);
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
            ? `Deposits of ${formatTzs(SOF_SINGLE_TXN_TZS)} or more require a Source of Funds declaration on file.`
            : `Your rolling 30-day deposits would exceed ${formatTzs(SOF_ROLLING_30D_TZS)}, which requires a Source of Funds declaration on file.`;
        return { ok: false, error: `${reasonEn} Submit one at /profile/source-of-funds and wait for compliance to accept it.`, code: "INVALID" };
      }
    }

    // Reserve the PROCESSING row while still holding the lock, so the next
    // concurrent deposit's sumDepositsSince counts it and can be capped.
    const newTxnId = `txn_${randomId(12)}`;
    try {
      const created = await db.txn.create({
        id: newTxnId,
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
        positionId: null,
        amlReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        idempotencyKey: idempotencyKey ?? null,
      });
      return { ok: true, txn: created, reused: false };
    } catch (err) {
      // A concurrent same-key deposit created the txn first (the @unique
      // idempotencyKey constraint fires in prod). Return THAT txn instead of a
      // 500 — exactly-once, no duplicate PROCESSING row. Mirrors withdraw.
      if (idempotencyKey) {
        const existing = await db.txn.findByIdempotencyKey(idempotencyKey);
        if (existing) return { ok: true, txn: existing, reused: true };
      }
      throw err;
    }
  });

  if (!reservation.ok) return { ok: false, error: reservation.error, code: reservation.code };
  const txn = reservation.txn;
  const txnId = txn.id;
  if (reservation.reused) {
    // Idempotent replay — the deposit was already initiated; don't dispatch again.
    const w = await db.wallet.findByUserId(userId);
    return { ok: true, data: { txnId, status: txn.status, balance: w?.balance ?? 0 } };
  }
  audit({ category: "WALLET", action: "deposit.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount: parse.data.amount } });

  // Dispatch to provider
  const result = await dispatchDeposit({ provider: parse.data.provider, amount: parse.data.amount, msisdn: parse.data.msisdn, userId, card });
  if (!result.ok) {
    // NOTE: deliberately no notification/email here, unlike settleDepositFailed.
    // This failure is SYNCHRONOUS — we return `friendlyDepositReason` and the
    // player reads it on screen in the same breath, with the FAILED row already
    // visible in their wallet history. An inbox entry and an email about
    // something they were just told, and have very likely already retried, is
    // noise. The gap G2 closed was the ASYNCHRONOUS failure, where the player is
    // no longer looking. Don't "make this consistent" — the two are different.
    await db.txn.update(txnId, { status: "FAILED", description: `${friendlyProvider(parse.data.provider)} deposit failed: ${result.reason}` });
    // `detail` carries the provider's own explanation (HTTP status, result code,
    // message). Without it a failed real-money deposit is undiagnosable once the
    // container's logs rotate — which is exactly what happened to the 5,000 TZS
    // MIXX deposit on 2026-07-20: the audit row said only "PROVIDER_DOWN".
    audit({ category: "WALLET", action: "deposit.failed", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason, correlationId: result.correlationId, detail: result.detail } });
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
    audit({ category: "WALLET", action: "deposit.pending", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, hosted: !!result.redirectUrl } });
    // Put the in-flight deposit in the player's inbox NOW (G3). Until this, a
    // PROCESSING deposit produced no player-visible signal anywhere except a row
    // in wallet history labelled "pending" — and a mobile-money collection can
    // sit unresolved for up to 30 minutes. That silence is the exact condition
    // that makes a player pay a second time, so the body leads with "don't pay
    // again" and the entry deep-links to this deposit's own receipt.
    //
    // The in-app entry is free and instant, so it fires on EVERY pending deposit.
    // The pending EMAIL deliberately does not fire here — see the reconcile sweep
    // (`notifyStillPendingDeposits`), which sends it only once a deposit has
    // actually been slow. Emailing at t=0 would put a "we're waiting" mail in the
    // inbox of every card payer who completes in eight seconds.
    notifyDeposit(userId, { status: "PROCESSING", amount: parse.data.amount, provider: friendlyProvider(parse.data.provider), txnId });
    const cur = await db.wallet.findByUserId(userId);
    // `redirectUrl` (card/hosted checkout) is passed straight through for the
    // caller to send the buyer to. It carries NO money meaning — the txn is
    // PROCESSING either way, and only the signed order-status re-query credits.
    return { ok: true, data: { txnId, status: "PROCESSING", balance: cur?.balance ?? 0, redirectUrl: result.redirectUrl } };
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

  const outcome = await withLock(`wallet:${pre.userId}`, async (): Promise<{ credited: boolean; balance: number; txn?: StoredTxn; rgReversed?: boolean }> => {
    const t = await db.txn.findById(txnId);
    if (!t) return { credited: false, balance: 0 };
    if (t.status !== "PROCESSING") {
      // Already settled — idempotent no-op. Return the live balance.
      const w = await db.wallet.findByUserId(t.userId);
      return { credited: false, balance: w?.balance ?? 0 };
    }
    const fresh = await db.wallet.findByUserId(t.userId);
    if (!fresh) return { credited: false, balance: 0 };
    // Responsible-gambling gate (GLI-19 / LCCP): if the player self-excluded or
    // cooled-off AFTER this deposit was initiated (or the provider pushed it late),
    // we must NOT credit an excluded account. Reverse it instead — mark the deposit
    // REVERSED and leave the balance untouched. On the stub INTERNAL provider no
    // money actually moved, so this IS the refund; a real aggregator (Appendix D1)
    // plugs an outbound reversal in right here.
    const rgLock = await isLockedOut(t.userId);
    if (rgLock.locked) {
      await db.txn.update(txnId, {
        status: "REVERSED",
        completedAt: new Date().toISOString(),
        amlReason: `rg_${rgLock.reason}`,
        description: `${t.description ?? "Deposit"} · auto-reversed (account excluded)`,
      });
      return { credited: false, balance: fresh.balance, txn: t, rgReversed: true };
    }
    // Atomic (audit C3): the wallet credit, the txn → CONFIRMED, and the ledger
    // DEPOSIT group commit together, or none do. A ledger failure now rolls the
    // credit back (the deposit stays PROCESSING and is retried) instead of moving
    // the money with no ledger evidence. Still inside the wallet advisory lock, so
    // the balance can't change under us.
    const newBalance = await withMoneyTx(async (tx) => {
      const updated = await db.wallet.adjust(fresh.id, { balance: t.amount }, undefined, tx);
      if (!updated) throw new Error(`deposit ${txnId}: wallet ${fresh.id} row missing`);
      await db.txn.update(txnId, { status: "CONFIRMED", providerRef: providerRef ?? t.providerRef, balanceAfter: updated.balance, completedAt: new Date().toISOString() }, tx);
      await postLedgerEntries(`dep_${t.id}`, depositEntries({ txnId: t.id, userId: t.userId, amount: t.amount, provider: t.provider ?? "INTERNAL" }), tx);
      return updated.balance;
    });
    return { credited: true, balance: newBalance, txn: t };
  });

  if (outcome.credited && outcome.txn) {
    const t = outcome.txn;
    // Ledger DEPOSIT was posted atomically with the credit inside the lock (C3).
    audit({ category: "WALLET", action: "deposit.confirmed", actorId: t.userId, targetType: "Transaction", targetId: t.id, payload: { providerRef: providerRef ?? t.providerRef, balanceAfter: outcome.balance } });
    emit("wallet:balance", { userId: t.userId, balance: outcome.balance });
    // The gateway ref is what the player's BANK and Selcom's support desk key
    // off; t.id is what WE key off. The receipt, the return page, the admin table
    // and this email must all show the same pair — one payment, one identity.
    const gatewayRef = providerRef ?? t.providerRef;
    notifyDeposit(t.userId, { status: "CONFIRMED", amount: t.amount, provider: friendlyProvider(t.provider), txnId: t.id });
    sendEmailToUser(t.userId, (email) => ({
      to: email,
      subject: `Deposit confirmed · ${formatTzs(t.amount)}`,
      html: depositConfirmedHtml({ amount: t.amount, method: friendlyProvider(t.provider), reference: t.id, gatewayRef, balance: outcome.balance }),
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
  } else if (outcome.rgReversed && outcome.txn) {
    // Deposit was auto-reversed because the account is self-excluded / cooling-off.
    // No credit and no CONFIRMATION email — but the player must still be TOLD.
    // Staying silent here was the worst of the notification gaps: a self-excluded
    // player who sees money leave their bank and never arrive has every reason to
    // believe the platform kept it. We tell them it was reversed and why, without
    // inviting them back into the deposit flow (see depositReversedHtml).
    const t = outcome.txn;
    const gatewayRef = providerRef ?? t.providerRef;
    audit({ category: "COMPLIANCE", action: "deposit.auto_reversed.rg_lockout", actorId: t.userId, targetType: "Transaction", targetId: t.id, payload: { amount: t.amount, provider: t.provider ?? "INTERNAL" } });
    emit("wallet:balance", { userId: t.userId, balance: outcome.balance });
    notifyDeposit(t.userId, { status: "REVERSED", amount: t.amount, provider: friendlyProvider(t.provider), txnId: t.id });
    sendEmailToUser(t.userId, (email) => ({
      to: email,
      subject: `Deposit reversed · ${formatTzs(t.amount)}`,
      html: depositReversedHtml({ amount: t.amount, method: friendlyProvider(t.provider), reference: t.id, gatewayRef }),
      tag: "deposit",
    })).catch(() => {});
  }
  return { credited: outcome.credited, balance: outcome.balance };
}

/**
 * Turn an internal settlement reason into something a player can act on.
 *
 * Deliberately separate from `friendlyDepositReason`, which maps the gateway's
 * DISPATCH-time codes. These are OUR post-dispatch settlement reasons, and they
 * are a different vocabulary — collapsing the two would leave one of them
 * silently unmapped as it grew. Anything unrecognised falls through to a
 * truthful generic rather than leaking an internal token into an inbox.
 */
function friendlyFailureReason(reason: string): string | undefined {
  switch (reason) {
    case "provider-reported-failure": return "Your payment provider declined the payment.";
    case "reconcile-verified-failed": return "Your payment provider confirmed the payment did not complete.";
    case "reconcile-timeout-no-ref":  return "The payment was never started with your provider.";
    case "reconcile-timeout":         return "The payment wasn't confirmed in time and has been cancelled.";
    default:                          return undefined;
  }
}

/** Mark a still-pending deposit FAILED (webhook failure / reconciliation
 *  timeout). No wallet movement — a PENDING deposit was never credited.
 *  Idempotent: only acts while the txn is PROCESSING — which is also what makes
 *  the player-facing notification + email below fire EXACTLY ONCE. */
async function settleDepositFailed(txnId: string, reason: string): Promise<boolean> {
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "PROCESSING") return false;
  await db.txn.update(txnId, { status: "FAILED", description: `${friendlyProvider(t.provider)} deposit failed: ${reason}` });
  audit({ category: "WALLET", action: "deposit.failed", actorId: t.userId, targetType: "Transaction", targetId: txnId, payload: { reason } });
  // Tell the player. This path used to write an audit row and stop — so a player
  // whose card was declined, or whose deposit was reconciled to failed half an
  // hour later, was never informed at all. The one thing both messages lead with
  // is that NO MONEY WAS TAKEN: a silent failure reads as a charge that vanished,
  // and sends the player to their bank to open a dispute against us.
  const friendly = friendlyFailureReason(reason);
  notifyDeposit(t.userId, { status: "FAILED", amount: t.amount, provider: friendlyProvider(t.provider), txnId: t.id, reason: friendly });
  sendEmailToUser(t.userId, (email) => ({
    to: email,
    subject: `Deposit failed · ${formatTzs(t.amount)}`,
    html: depositFailedHtml({ amount: t.amount, method: friendlyProvider(t.provider), reference: t.id, gatewayRef: t.providerRef, reason: friendly }),
    tag: "deposit",
  })).catch(() => {});
  return true;
}

/** Finalize a held withdrawal once the payout is confirmed: release the hold
 *  (funds have left the platform) and mark CONFIRMED. Exactly-once / idempotent
 *  under the per-wallet lock. */
async function settleWithdrawalConfirmed(txnId: string): Promise<boolean> {
  const pre = await db.txn.findById(txnId);
  if (!pre) return false;
  const done = await withLock(`wallet:${pre.userId}`, async (): Promise<{ txn: StoredTxn; gatewayShare: number } | null> => {
    const t = await db.txn.findById(txnId);
    if (!t || t.status !== "PROCESSING") return null;
    const amt = Math.abs(t.amount);
    const w = await db.wallet.findByUserId(t.userId);
    // The fee was frozen onto the txn row at initiation — read it back, never
    // recompute (a rate change mid-flight would reprice a withdrawal in flight).
    const fee = t.fee ?? 0;
    // The gateway's slice, clamped to the fee so the ledger group can't unbalance.
    const wcfg = await getEffectiveConfig().catch(() => null);
    const gatewayShare = wcfg
      ? Math.min(fee, Math.max(0, Math.round(amt * Math.max(0, wcfg.withdrawalGatewayShareRate))))
      : 0;
    // Atomic (audit C3): release the hold, mark CONFIRMED, and post the ledger
    // WITHDRAWAL group together — a ledger failure rolls the whole thing back
    // (the withdrawal stays PROCESSING and retries) rather than dropping the hold
    // with no ledger record.
    await withMoneyTx(async (tx) => {
      if (w) {
        const upd = await db.wallet.adjust(w.id, { hold: -amt }, undefined, tx);
        if (!upd) throw new Error(`withdraw ${txnId}: wallet ${w.id} row missing`);
      }
      await db.txn.update(txnId, { status: "CONFIRMED", completedAt: new Date().toISOString() }, tx);
      await postLedgerEntries(`wdr_${t.id}`, withdrawalEntries({ txnId: t.id, userId: t.userId, grossAmount: amt, fee, gatewayShare, provider: t.provider ?? "INTERNAL" }), tx);
    });
    return { txn: t, gatewayShare };
  });
  if (done) {
    const t = done.txn;
    const gross = Math.abs(t.amount);
    const fee = t.fee ?? 0;
    const net = gross - fee;
    // Ledger WITHDRAWAL was posted atomically with the hold-release inside the lock.
    audit({ category: "WALLET", action: "withdraw.confirmed", actorId: t.userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: t.providerRef, gross, fee, gatewayShare: done.gatewayShare, net } });
    notifyWithdrawalSent(t);
  }
  return !!done;
}

/**
 * Player-facing "withdrawal sent" receipt (in-app + email). Shared by the normal
 * settle path AND the AML-approval release path (admin/aml/actions.ts), so a
 * large (≥ TZS 1M) two-officer-approved withdrawal gets the same confirmation as
 * an ordinary one — previously the AML approve path released the funds silently.
 */
export function notifyWithdrawalSent(txn: { id: string; userId: string; amount: number; fee: number; provider: string | null }): void {
  const gross = Math.abs(txn.amount);
  // Net of the 1% withdrawal fee — the only deduction. There is no withholding tax.
  const net = gross - (txn.fee ?? 0);
  notifyWithdraw(txn.userId, { status: "CONFIRMED", amount: gross, net, provider: friendlyProvider(txn.provider) });
  sendEmailToUser(txn.userId, (email) => ({
    to: email,
    subject: `Withdrawal sent · ${formatTzs(net)}`,
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
    // Read live balance for SSE push (funds were returned to spendable).
    const liveWallet = await db.wallet.findByUserId(done.userId);
    if (liveWallet) emit("wallet:balance", { userId: done.userId, balance: liveWallet.balance });
    audit({ category: "WALLET", action: "withdraw.failed", actorId: done.userId, targetType: "Transaction", targetId: txnId, payload: { reason } });
    notifyWithdraw(done.userId, { status: "FAILED", amount: refunded, provider: friendlyProvider(done.provider), reason });
    // Dual-channel parity with every other money event: the funds came back to
    // the wallet, so the player gets an email too (purpose-built refund template).
    sendEmailToUser(done.userId, (email) => ({
      to: email,
      subject: `Withdrawal returned · ${formatTzs(refunded)}`,
      html: amlRejectRefundHtml({ amount: refunded, reason }),
      tag: "withdrawal",
    })).catch(() => {});
  }
  return !!done;
}

/** What the card return leg renders. `state` is derived ONLY from the signed
 *  re-query + the stored transaction — never from the return URL's parameters. */
export type DepositReturnOutcome = {
  state: "PAID" | "PENDING" | "FAILED" | "UNKNOWN";
  balance: number;
  txn?: {
    id: string;
    amount: number;
    providerRef: string | null;
    providerLabel: string;
    createdAt: string;
  };
};

/**
 * Resolve the outcome of a card deposit for the RETURN LEG, authoritatively.
 *
 * Selcom appends `payment_status` + `transid` to the return URL, but those are
 * unsigned and browser-supplied — anyone can type `?payment_status=COMPLETED`.
 * So this function ignores them entirely. It takes only the `order_id` we
 * pre-seeded, and:
 *
 *   1. loads OUR transaction row for that providerRef,
 *   2. checks the row actually belongs to the signed-in user (an attacker must
 *      not be able to read another player's deposit by guessing a reference),
 *   3. if it is still PROCESSING, asks Selcom's SIGNED order-status endpoint and
 *      settles through `settlePaymentWebhook` — the same exactly-once, amount-
 *      tamper-checked path the webhook uses, so a return leg racing a webhook
 *      credits exactly once,
 *   4. re-reads the row and reports what is now true.
 *
 * Safe to call repeatedly: refresh, back-button, or returning hours later all
 * land on step 3/4 and converge on the same answer. A deposit that is genuinely
 * still in flight reports PENDING, never FAILED — telling a player their payment
 * failed while it is still moving is what makes them pay twice.
 */
export async function settleDepositFromReturn(userId: string, orderId: string): Promise<DepositReturnOutcome> {
  const wallet = await db.wallet.findByUserId(userId);
  const balanceOf = async () => (await db.wallet.findByUserId(userId))?.balance ?? wallet?.balance ?? 0;

  if (!orderId) return { state: "UNKNOWN", balance: await balanceOf() };

  let txn = await db.txn.findByProviderRef(orderId);
  // Unknown reference, or someone else's — same answer either way. We do NOT
  // distinguish them: confirming "that reference exists but isn't yours" would
  // leak the existence of other players' transactions.
  if (!txn || txn.userId !== userId) {
    if (txn && txn.userId !== userId) {
      audit({
        category: "SECURITY",
        action: "deposit.return_ownership_mismatch",
        actorId: userId, targetType: "Transaction", targetId: txn.id,
        payload: { providerRef: orderId },
      });
    }
    return { state: "UNKNOWN", balance: await balanceOf() };
  }

  // Still open → ask the authority. verifyDepositStatus returns PENDING for
  // anything non-terminal (incl. INPROGRESS and unrecognised values), so an
  // in-flight payment stays PROCESSING rather than being failed here.
  if (txn.status === "PROCESSING" && txn.providerRef) {
    const v = await verifyDepositStatus(txn.providerRef);
    if (v.status === "CONFIRMED") {
      await settlePaymentWebhook({ providerRef: txn.providerRef, status: "CONFIRMED", amount: v.amount });
    } else if (v.status === "FAILED") {
      await settlePaymentWebhook({ providerRef: txn.providerRef, status: "FAILED" });
    }
    // PENDING / UNSUPPORTED → leave it PROCESSING for the webhook + reconcile sweep.
    txn = (await db.txn.findById(txn.id)) ?? txn;
  }

  const state: DepositReturnOutcome["state"] =
    txn.status === "CONFIRMED" ? "PAID" :
    txn.status === "PROCESSING" ? "PENDING" :
    "FAILED"; // FAILED / REVERSED / anything terminal-but-not-credited

  return {
    state,
    balance: await balanceOf(),
    txn: {
      id: txn.id,
      amount: Math.abs(txn.amount),
      providerRef: txn.providerRef,
      providerLabel: friendlyProvider(txn.provider),
      createdAt: txn.createdAt,
    },
  };
}

/**
 * Settle a payment from a verified provider webhook. The single entry point the
 * webhook route calls; routes by transaction type and confirmed/failed status.
 * All underlying settle fns are idempotent, so a retried (at-least-once) webhook
 * is safe. Returns a small verdict for the route to log.
 */
export async function settlePaymentWebhook(input: { providerRef: string; status: "CONFIRMED" | "FAILED"; amount?: number }): Promise<{ handled: boolean; reason: string }> {
  const txn = await db.txn.findByProviderRef(input.providerRef);
  if (!txn) return { handled: false, reason: "unknown-reference" };
  if (txn.status !== "PROCESSING") return { handled: true, reason: `already-${txn.status.toLowerCase()}` };

  // M4: verify the provider-reported amount against what we initiated. We only
  // ever credit txn.amount (so tampering the webhook amount can't over-credit),
  // but a mismatch means the provider settled a DIFFERENT amount than we asked
  // for — a reconciliation/fraud signal. Fail closed and alert; never settle it.
  if (input.amount != null && Math.abs(input.amount) !== Math.abs(txn.amount)) {
    audit({ category: "SECURITY", action: "webhook.amount_mismatch", actorId: null, targetType: "Transaction", targetId: txn.id, payload: { expected: txn.amount, got: input.amount, providerRef: input.providerRef } });
    return { handled: false, reason: "amount-mismatch" };
  }

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
 * Sweep deposits/withdrawals stuck in PROCESSING past `olderThanMs` (the webhook
 * was delayed or lost). Intended to run on a schedule (cron).
 *
 * ⚠️ MONEY-SAFETY: it must NEVER terminalize a payment on a timer alone. A withdrawal
 * that is genuinely in flight at the gateway, blind-reversed here, would refund the
 * player AND still pay out → double-pay; a deposit the customer actually paid,
 * blind-failed here, is money taken with no credit. So for each stale txn we ask the
 * provider's AUTHORITATIVE signed status endpoint (the same re-query the webhook
 * trusts) and only settle on a definitive answer:
 *   CONFIRMED → credit/release (via the exactly-once settlePaymentWebhook path),
 *   FAILED    → fail/reverse,
 *   PENDING   → LEAVE PROCESSING and re-check next sweep (never auto-terminalize),
 *   UNSUPPORTED (no real gateway — mock/test) → fall back to the timer terminal,
 *     which is safe there because no real money moved.
 * A withdrawal with no providerRef (dispatch never got one) is left for manual
 * review rather than blind-reversed.
 */
export async function reconcileStalePayments(olderThanMs = 30 * 60 * 1000): Promise<{ depositsFailed: number; withdrawalsReversed: number; depositsConfirmed: number; withdrawalsConfirmed: number; leftPending: number }> {
  const cutoff = Date.now() - olderThanMs;
  const stale = (await db.txn.listByStatus("PROCESSING")).filter((t) => Date.parse(t.createdAt) < cutoff);
  let depositsFailed = 0;
  let withdrawalsReversed = 0;
  let depositsConfirmed = 0;
  let withdrawalsConfirmed = 0;
  let leftPending = 0;
  for (const t of stale) {
    const ref = t.providerRef;
    if (t.type === "DEPOSIT") {
      if (!ref) { if (await settleDepositFailed(t.id, "reconcile-timeout-no-ref")) depositsFailed++; continue; } // never pushed → nothing charged
      const v = await verifyDepositStatus(ref);
      if (v.status === "CONFIRMED") {
        const r = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED", amount: v.amount }); // exactly-once + amount-tamper check
        if (r.handled) depositsConfirmed++;
      } else if (v.status === "FAILED") {
        if (await settleDepositFailed(t.id, "reconcile-verified-failed")) depositsFailed++;
      } else if (v.status === "UNSUPPORTED") {
        if (await settleDepositFailed(t.id, "reconcile-timeout")) depositsFailed++; // mock/test — no money credited, safe
      } else {
        leftPending++; // PENDING — still in flight; leave PROCESSING for the next sweep
      }
    } else if (t.type === "WITHDRAWAL") {
      if (!ref) { leftPending++; audit({ category: "WALLET", action: "payments.reconcile_needs_review", actorId: null, targetType: "Transaction", targetId: t.id, payload: { reason: "stale withdrawal has no providerRef — not auto-reversed" } }); continue; }
      const v = await verifyWithdrawalStatus(ref);
      if (v.status === "CONFIRMED") {
        const r = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED" }); // release the hold, exactly-once
        if (r.handled) withdrawalsConfirmed++;
      } else if (v.status === "FAILED") {
        if (await settleWithdrawalFailed(t.id, "reconcile-verified-failed")) withdrawalsReversed++;
      } else if (v.status === "UNSUPPORTED") {
        if (await settleWithdrawalFailed(t.id, "reconcile-timeout")) withdrawalsReversed++; // mock/test only — no real payout in flight
      } else {
        leftPending++; // PENDING — payout may be in flight; NEVER blind-reverse
      }
    }
  }
  if (stale.length) audit({ category: "WALLET", action: "payments.reconcile_sweep", actorId: null, targetType: null, targetId: null, payload: { olderThanMs, depositsFailed, withdrawalsReversed, depositsConfirmed, withdrawalsConfirmed, leftPending } });
  return { depositsFailed, withdrawalsReversed, depositsConfirmed, withdrawalsConfirmed, leftPending };
}

/**
 * Email players whose deposit is STILL in flight after `olderThanMs` (G3).
 *
 * Why this is separate from the notification fired at initiate: the in-app entry
 * is free, so it goes out on every pending deposit. An email is not free — a
 * "we're waiting on your payment" mail sent to every card payer who completes in
 * eight seconds is noise, and noise is how a player learns to ignore the mail
 * that actually matters. So the email is reserved for the case that genuinely
 * hurts: a collection that has gone quiet for half an hour, where the player has
 * long since closed the tab and is deciding whether to pay again.
 *
 * ⚠️ This moves NO money and terminalizes NOTHING. It only informs. It is kept
 * out of `reconcileStalePayments` on purpose: that function's contract is "settle
 * from the gateway's authoritative status", and mixing a notification concern
 * into it would make a money-critical function harder to reason about.
 *
 * Exactly-once via `pendingNotifiedAt`, claimed with a conditional update so two
 * concurrent sweeps (or two app instances) can't both mail the same player.
 */
export async function notifyStillPendingDeposits(olderThanMs = 30 * 60 * 1000): Promise<{ notified: number }> {
  const cutoff = Date.now() - olderThanMs;
  const stuck = (await db.txn.listByStatus("PROCESSING")).filter(
    (t) => t.type === "DEPOSIT" && !t.pendingNotifiedAt && Date.parse(t.createdAt) < cutoff,
  );
  let notified = 0;
  for (const t of stuck) {
    // Claim under the wallet lock and re-read, so a deposit that settled between
    // the list above and here is not mailed "still waiting" after it has already
    // been confirmed — the single most confusing mail we could send.
    const claimed = await withLock(`wallet:${t.userId}`, async () => {
      const cur = await db.txn.findById(t.id);
      if (!cur || cur.status !== "PROCESSING" || cur.pendingNotifiedAt) return false;
      await db.txn.update(t.id, { pendingNotifiedAt: new Date().toISOString() });
      return true;
    });
    if (!claimed) continue;
    notified++;
    sendEmailToUser(t.userId, (email) => ({
      to: email,
      subject: `Still waiting on your deposit · ${formatTzs(t.amount)}`,
      html: depositPendingHtml({ amount: t.amount, method: friendlyProvider(t.provider), reference: t.id, gatewayRef: t.providerRef }),
      tag: "deposit",
    })).catch(() => {});
    audit({ category: "WALLET", action: "deposit.pending_notified", actorId: null, targetType: "Transaction", targetId: t.id, payload: { olderThanMs, amount: t.amount } });
  }
  return { notified };
}

/** Withdrawal — debits wallet immediately, dispatches to provider, settles. */
/**
 * Withdrawal.
 *
 * The player is charged ONE thing: `withdrawalFeeRate` (1% of the amount). Of
 * that, `withdrawalGatewayShareRate` (0.5%) is what the payment gateway costs us
 * and the rest is ours.
 *
 * ⚠️ THE 15% WITHHOLDING TAX IS GONE. It applied to every withdrawal, including a
 * player's own untouched deposit — deposit 100,000, bet nothing, withdraw, get
 * 85,000. Taxes are only ever on OUR commission (see payments.ts).
 */
export async function withdraw(userId: string, input: z.input<typeof WithdrawSchema>, idempotencyKey?: string): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; fee: number; net: number }>> {
  const rl = await rateCheckAsync(userId, "wallet.withdraw");
  if (!rl.allowed) return { ok: false, error: "Too many withdrawal attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Idempotency: if this key was already used, return the existing txn result.
  // Read the fee off the STORED ROW rather than recomputing it — recomputing
  // would silently reprice a replayed withdrawal at today's rate.
  if (idempotencyKey) {
    const existing = await db.txn.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const f = existing.fee ?? 0;
      return { ok: true, data: { txnId: existing.id, status: existing.status, fee: f, net: Math.abs(existing.amount) - f } };
    }
  }

  const parse = WithdrawSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };

  // ADM4 kill-switch — withdrawals for this provider may be paused by an operator.
  if (await isPaymentPaused(parse.data.provider, "withdrawals")) {
    return { ok: false, error: "Withdrawals for this provider are temporarily paused. Try another method or check back shortly.", code: "SUSPENDED" };
  }

  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND" };

  const kyc = await db.kyc.findByUserId(userId);
  if (kyc?.status !== "APPROVED") {
    audit({ category: "COMPLIANCE", action: "withdraw.kyc_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { kycStatus: kyc?.status ?? "NOT_STARTED" } });
    return { ok: false, error: "Verify your identity to withdraw.", code: "INVALID" };
  }

  const amount = parse.data.amount;
  // The withdrawal fee — the ONLY thing a player is charged here. Admin-tunable,
  // never hardcoded.
  const wcfg = await getEffectiveConfig();
  const fee = computeWithdrawalFee(amount, wcfg.withdrawalFeeRate);
  const gatewayShare = Math.min(fee, Math.max(0, Math.round(amount * Math.max(0, wcfg.withdrawalGatewayShareRate))));
  const net = amount - fee;
  const providerLabel = friendlyProvider(parse.data.provider);
  const txnId = `txn_${randomId(12)}`;

  // ── Phase A (locked): validate balance + place the hold atomically ─────────
  // Re-read inside the lock so the balance check and the debit can't be split
  // by a concurrent withdrawal/bet/payout on the same wallet (double-spend).
  const hold = await withLock(`wallet:${userId}`, async () => {
    // Re-check idempotency INSIDE the lock. The pre-lock check above is only a
    // fast-path; a concurrent same-key withdrawal (2G double-tap) may have created
    // the txn between that read and our acquiring the lock. Without this re-check
    // the second caller debits AGAIN and then db.txn.create throws on the @unique
    // idempotencyKey — AFTER the debit — stranding funds in `hold` with no txn row
    // (reconcileStalePayments scans txns, so it never finds/reverses them). Mirrors
    // the in-lock re-check buyPosition already does.
    if (idempotencyKey) {
      const dup = await db.txn.findByIdempotencyKey(idempotencyKey);
      if (dup) return { ok: true as const, duplicate: dup };
    }
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
      fee,
      taxWithheld: 0,   // no withholding tax — deleted 2026-07
      balanceAfter,
      currency: "TZS",
      provider: parse.data.provider,
      providerRef: null,
      msisdn: parse.data.msisdn ?? null,
      description: `${providerLabel} withdrawal`,
      positionId: null,
      amlReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      idempotencyKey: idempotencyKey ?? null,
    });
    audit({ category: "WALLET", action: "withdraw.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount, fee, gatewayShare, net } });
    emit("wallet:balance", { userId, balance: balanceAfter });
    return { ok: true as const, duplicate: null };
  });
  if (!hold.ok) return hold;
  // Idempotent replay: a concurrent same-key withdrawal already created the txn.
  // Return its result WITHOUT debiting or dispatching again (exactly-once).
  if (hold.duplicate) {
    const dup = hold.duplicate;
    const f = dup.fee ?? 0;
    return { ok: true, data: { txnId: dup.id, status: dup.status, fee: f, net: Math.abs(dup.amount) - f } };
  }

  // ── Provider dispatch (UNLOCKED): never hold a wallet lock across network I/O.
  // `amount: net` is what the gateway disburses; `grossAmount: amount` is the full
  // withdrawal value the AML ≥1M second-officer hold is evaluated against.
  const result = await dispatchWithdrawal({ provider: parse.data.provider, amount: net, grossAmount: amount, msisdn: parse.data.msisdn, userId });

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
      subject: `Withdrawal under review · ${formatTzs(amount)}`,
      html: withdrawalUnderReviewHtml({ amount, reference: txnId }),
      tag: "withdrawal-review",
    })).catch(() => {});
    return { ok: true, data: { txnId, status: "AML_REVIEW", fee, net } };
  }

  if (result.status === "PENDING") {
    // Async payout: funds stay in `hold` until the provider's payout webhook
    // confirms (release hold) or fails (reverse) the disbursement. The webhook
    // is the authority — we don't release the hold here.
    audit({ category: "WALLET", action: "withdraw.pending", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, net } });
    notifyWithdraw(userId, { status: "INITIATED", amount, net, provider: providerLabel });
    return { ok: true, data: { txnId, status: "PROCESSING", fee, net } };
  }

  // CONFIRMED (synchronous provider / mock): release the hold + finalize. Same
  // exactly-once path the payout webhook uses — they can't double-settle.
  await settleWithdrawalConfirmed(txnId);
  return { ok: true, data: { txnId, status: "CONFIRMED", fee, net } };
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
      positionId: null,
      amlReason: null,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
    });
    // Dual-write: post internal credit to double-entry ledger (fire-and-forget).
    postLedgerEntries(`int_${txnId}`, internalCreditEntries({ txnId, userId, amount, description: opts.description })).catch(() => {});
    audit({
      category: "WALLET",
      action: "wallet.credit_internal",
      actorId: null,
      targetType: "Wallet",
      targetId: wallet.id,
      payload: { userId, txnId, type: txnType, amount, balanceAfter: newBalance, description: opts.description },
    });
    emit("wallet:balance", { userId, balance: newBalance });
    return newBalance;
  });
}

/**
 * Manual admin balance adjustment (audit §9.3 #4) — an officer credits or debits
 * a player's real balance with a mandatory reason (disputes, goodwill, clawback,
 * correction). `amountTzs` is SIGNED: positive = credit, negative = debit.
 *
 * MONEY-SAFE: the wallet mutation, the CONFIRMED Transaction, and the ledger
 * ADJUSTMENT group commit ATOMICALLY (withMoneyTx, C3) inside the wallet lock, so
 * the trial balance stays reconciled and a ledger failure rolls the money back.
 * A debit is overdraw-guarded (never drives the balance negative). Every
 * adjustment raises a WATCHED `COMPLIANCE` audit — an officer moving money by
 * hand must always be traceable. Bounded by a per-adjustment cap.
 *
 * NOTE (hardening): like AML withdrawals ≥1M, large adjustments should ideally
 * require a second officer (maker-checker). v1 is single-officer + audit + cap;
 * two-officer is a documented follow-up.
 */
const ADJUSTMENT_CAP_TZS = 50_000_000;
export async function adminAdjustBalance(
  userId: string,
  officerId: string,
  amountTzs: number,
  reason: string,
): Promise<{ ok: true; balance: number } | { ok: false; error: string; code?: string }> {
  const amount = Math.round(amountTzs);
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: "Enter a non-zero whole-shilling amount." };
  if (Math.abs(amount) > ADJUSTMENT_CAP_TZS) return { ok: false, error: `Amount exceeds the single-adjustment cap (${formatTzs(ADJUSTMENT_CAP_TZS)}).` };
  const cleanReason = (reason ?? "").trim().slice(0, 300);
  if (cleanReason.length < 5) return { ok: false, error: "A reason (≥ 5 chars) is required." };

  return withLock(`wallet:${userId}`, async () => {
    const wallet = await db.wallet.findByUserId(userId);
    if (!wallet) return { ok: false as const, error: "Wallet not found.", code: "NOT_FOUND" };
    if (wallet.status !== "ACTIVE") return { ok: false as const, error: `Wallet is ${wallet.status}, not ACTIVE.`, code: "INVALID" };

    const txnId = `txn_${randomId(12)}`;
    const now = new Date().toISOString();
    let newBalance = wallet.balance;

    const committed = await withMoneyTx(async (tx) => {
      // Overdraw-guarded on a debit; a credit needs no guard.
      const updated = await db.wallet.adjust(
        wallet.id,
        { balance: amount },
        amount < 0 ? { requireBalanceGte: -amount } : undefined,
        tx,
      );
      if (!updated) return false; // insufficient balance for the debit, or row vanished
      newBalance = updated.balance;
      await db.txn.create({
        id: txnId,
        walletId: wallet.id, userId,
        type: amount >= 0 ? "ADJUSTMENT_CREDIT" : "ADJUSTMENT_DEBIT",
        status: "CONFIRMED",
        amount, fee: 0, taxWithheld: 0,
        balanceAfter: updated.balance, currency: "TZS",
        provider: "INTERNAL", providerRef: null, msisdn: null,
        description: `Admin adjustment · ${cleanReason.slice(0, 120)}`,
        positionId: null, amlReason: cleanReason,
        createdAt: now, updatedAt: now, completedAt: now,
      }, tx);
      await postLedgerEntries(`adj_${txnId}`, adjustmentEntries({ txnId, userId, amount, description: `Admin adjustment: ${cleanReason.slice(0, 120)}` }), tx);
      return true;
    });

    if (!committed) {
      return { ok: false as const, error: amount < 0 ? "Insufficient balance for this debit." : "Adjustment failed.", code: "INVALID" };
    }

    await audit({
      category: "COMPLIANCE",
      action: "wallet.admin_adjustment",
      actorId: officerId,
      targetType: "User",
      targetId: userId,
      payload: { txnId, amount, direction: amount >= 0 ? "credit" : "debit", balanceAfter: newBalance, reason: cleanReason },
    });
    emit("wallet:balance", { userId, balance: newBalance });
    return { ok: true as const, balance: newBalance };
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
