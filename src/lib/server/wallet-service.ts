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
import { dispatchDeposit, dispatchWithdrawal, verifyDepositStatus, verifyWithdrawalStatus, type CardCheckoutContext, type PaymentProvider, type LadderResult } from "./payments";
import { payoutRailLabel, payoutRailNote } from "./selcom";
import { isPaymentPaused } from "./payment-ops";
import { isLiveMoneyMode } from "./runtime-mode";
import { isMaintenanceMode, maintenanceMessage } from "./platform-config";
import { rateCheckAsync } from "./rate-limit";
import { DepositSchema, AdminDepositSchema, WithdrawSchema } from "./validators";
import { checkDepositLimit, isLockedOut } from "./responsible-gambling";
import type { FailureReason, FailureDetail } from "@/lib/failure-reasons";
import { paymentMethodName } from "@/lib/payment-providers";
import { notifyDeposit, notifyWithdraw, notifyAdminsAmlReview } from "./notification-service";
import { withLock } from "./locks";
import { emit } from "./event-bus";
import { postLedgerEntries, depositEntries, rgSuspenseEntries, withdrawalEntries, internalCreditEntries, adjustmentEntries, withMoneyTx } from "./ledger";
import { getEffectiveConfig } from "./market-config";
import { computeWithdrawalFee, minWithdrawalForRate, PROVIDER_MIN_PAYOUT_TZS } from "@/lib/payout";
import { payoutDestinationFor } from "@/lib/payout-destination";
import type { z } from "zod";
import type { ServiceResult } from "./auth-service";
import { formatTzs } from "@/lib/utils";

/**
 * Source-of-Funds thresholds (AML Act 2006 + LCCP SR 9.2). An accepted SoF
 * declaration is required when a single deposit reaches SINGLE, or when the
 * rolling 30-day cumulative (including the deposit being attempted) reaches
 * ROLLING_30D.
 *
 * Module-scope and EXPORTED so the certification gate asserts the same constants
 * the deposit path enforces, rather than re-typing the numbers — a second copy is
 * a second thing to forget. Changing these still needs a deploy; they are not
 * operator-tunable, which is a deliberate note in docs/NEXT-PLAN.md, not an
 * oversight.
 */
export const SOF_SINGLE_TXN_TZS = 1_000_000;
export const SOF_ROLLING_30D_TZS = 5_000_000;

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
  // ⭐ `reason: "maintenance"` — see the twin site in `market-service.ts` for why the code
  // stays `SUSPENDED` and the reason is what makes this refusal distinguishable.
  if (await isMaintenanceMode()) {
    return { ok: false, error: await maintenanceMessage(), code: "SUSPENDED", reason: "maintenance" as const };
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
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;

  // ⭐ C2 SECOND TRANCHE · the refusal carries a machine `reason` beside the code. `code` stays
  // "INVALID" — it is API and audit truth and callers depend on it — but INVALID means four
  // things here (cap, SOF, bad input, …), so the copy layer used to recover the meaning by
  // substring-matching this English prose. `reason` makes that exact.
  type Reservation =
    | { ok: true; txn: StoredTxn; reused: boolean }
    | { ok: false; error: string; code: "INVALID"; reason?: FailureReason };

  const reservation: Reservation = await withLock(`wallet:${userId}`, async (): Promise<Reservation> => {
    // Responsible-gambling deposit-limit (daily / weekly / monthly), re-read
    // INSIDE the lock. Skipped for admin test-funding (see bypass note above).
    if (!adminTest) {
      const limitCheck = await checkDepositLimit(userId, parse.data.amount);
      if (!limitCheck.allowed) {
        await audit({ category: "COMPLIANCE", action: "deposit.limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { reason: limitCheck.reason } });
        return { ok: false, error: limitCheck.reason ?? "Deposit limit reached.", code: "INVALID", reason: "deposit_limit" };
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
        return { ok: false, error: `${reasonEn} Submit one at /profile/source-of-funds and wait for compliance to accept it.`, code: "INVALID", reason: "sof_required" };
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

  if (!reservation.ok) return { ok: false, error: reservation.error, code: reservation.code, reason: reservation.reason };
  const txn = reservation.txn;
  const txnId = txn.id;
  if (reservation.reused) {
    // Idempotent replay — the deposit was already initiated; don't dispatch again.
    const w = await db.wallet.findByUserId(userId);
    return { ok: true, data: { txnId, status: txn.status, balance: w?.balance ?? 0 } };
  }
  audit({ category: "WALLET", action: "deposit.initiated", actorId: userId, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount: parse.data.amount } });

  // Mint the correlation id and PERSIST it BEFORE dispatching.
  //
  // It used to be written only after dispatch returned, so a crash, a redeploy or a
  // DB blip in that window left a genuinely paid deposit with no reference at all —
  // nothing for reconcile or the fast-credit poll to re-query, and reconcile read
  // "no reference" as "never pushed" and failed it. Persisting first means the
  // reference always exists from the moment the gateway could possibly have been
  // told about it.
  const correlationId = `dep_${randomId(10)}`;
  // Best-effort: if this write fails we still dispatch, and the post-dispatch write
  // below is the authoritative one. It must never block a deposit.
  try { await db.txn.update(txnId, { providerRef: correlationId }); } catch { /* non-fatal */ }
  // Dispatch to provider
  const result = await dispatchDeposit({ provider: parse.data.provider, amount: parse.data.amount, msisdn: parse.data.msisdn, userId, card, correlationId });
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

  // Overwrite with the reference the adapter actually returned. The pre-dispatch
  // write above guarantees SOME reference exists even if we crash here; this write
  // makes it the authoritative one, because the mock and AML branches return a
  // different value from the correlation id we minted. Keep both writes.
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
      // The comment above was written when the only rail was the INTERNAL stub, where
      // "no money actually moved, so this IS the refund". That is no longer true: on a
      // live gateway the player HAS been debited. Marking the deposit REVERSED and
      // returning here wrote NO ledger entry at all — so the cash sat in the provider
      // float, the platform quietly kept it, and the trial balance still reconciled
      // clean precisely because nothing had been posted on either side.
      //
      // Record it instead. The external side is booked exactly as for a normal
      // deposit; the money is parked in HOUSE:RG_SUSPENSE because it can neither be
      // credited (the account is excluded) nor yet returned (that needs the outbound
      // disbursement rail). Balanced, so the books stay true — and visible, so a
      // non-zero suspense balance is a standing "we owe a player money" signal.
      //
      // Status is AML_REVIEW, not REVERSED: REVERSED reads as "settled, nothing owed"
      // and would drop out of every operator queue. This must stay in front of a human
      // until the money is actually returned.
      await withMoneyTx(async (tx) => {
        await db.txn.update(txnId, {
          status: "AML_REVIEW",
          amlReason: `rg_refund_due_${rgLock.reason}`,
          description: `${t.description ?? "Deposit"} · held for return (account excluded)`,
        }, tx);
        await postLedgerEntries(
          `rgsusp_${t.id}`,
          rgSuspenseEntries({ txnId: t.id, userId: t.userId, amount: Math.abs(t.amount), provider: t.provider ?? "INTERNAL" }),
          tx,
        );
      });
      audit({
        category: "COMPLIANCE",
        action: "deposit.rg_refund_due",
        actorId: t.userId,
        targetType: "Transaction",
        targetId: t.id,
        payload: { amount: Math.abs(t.amount), reason: rgLock.reason, note: "Deposit arrived after exclusion — held in HOUSE:RG_SUSPENSE pending return to the player." },
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
export function notifyWithdrawalSent(txn: { id: string; userId: string; amount: number; fee: number; provider: string | null; msisdn?: string | null; providerRef?: string | null; payoutRail?: string | null }): void {
  const gross = Math.abs(txn.amount);
  // Net of the 1% withdrawal fee — the only deduction. There is no withholding tax.
  const net = gross - (txn.fee ?? 0);
  notifyWithdraw(txn.userId, { status: "CONFIRMED", amount: gross, net, provider: friendlyProvider(txn.provider) });
  sendEmailToUser(txn.userId, (email) => ({
    to: email,
    subject: `Withdrawal sent · ${formatTzs(net)}`,
    // The player's MNO keys off the gateway reference; print both like deposits do.
    // The rail is printed only when it is NOT the obvious one, and it brings its own
    // instructions with it — a Huduma payout must never be described as "arriving on
    // your phone", because it never will: the cash is at an agent.
    html: withdrawalSentHtml({
      amount: net,
      destination: friendlyProvider(txn.provider),
      destinationPhone: txn.msisdn ?? null,
      reference: txn.id,
      gatewayRef: txn.providerRef ?? null,
      railLabel: payoutRailLabel(txn.payoutRail),
      railNote: payoutRailNote(txn.payoutRail),
    }),
    tag: "withdrawal",
  })).catch(() => {});
}

/**
 * Dispatch a withdrawal that has PASSED AML review (officer-approved) to the payment
 * gateway. Called ONLY from admin/aml/actions.ts, AFTER the two-officer approval gate.
 *
 * This is the missing half of the large-payout flow. Previously a ≥ TZS 1M withdrawal
 * entered AML_REVIEW and could only be *rejected* (refunded) — approving it would have
 * released the hold and marked it "sent" WITHOUT ever contacting the gateway (destroyed
 * money). This function does the honest thing: move the held txn AML_REVIEW → PROCESSING,
 * send the payout to the gateway with a REAL provider reference (bypassing the AML hold —
 * review already happened), and let the SAME exactly-once webhook/reconcile path settle it.
 *
 * MONEY-SAFETY:
 *  - The `hold` placed by withdraw() is KEPT throughout. Money only leaves the platform on
 *    the authoritative settleWithdrawalConfirmed (webhook / walletcashin/query re-query),
 *    exactly like an ordinary payout — never on the strength of this call alone.
 *  - A provider refusal (PROVIDER_DOWN / definitive reject) reverts the txn to AML_REVIEW
 *    with the hold intact, so the officer can retry once the rail is up or reject-refund
 *    explicitly. A just-approved large payout is never silently auto-refunded to the player.
 *  - AMBIGUOUS (maybe-in-flight) comes back as PENDING → the txn stays PROCESSING and is
 *    resolved by the signed re-query; it is never blind-reversed (that would double-pay).
 */
/**
 * Persist the payout ladder's attempt trail — one audit row per rail that was tried
 * or deliberately skipped.
 *
 * 🔴 WHY AN AUDIT ROW AND NOT `providerStatus`. `providerStatus` holds ONE line and is
 * overwritten by every status re-query, so by the time an operator looks at a stuck
 * payout the dispatch story is long gone. On 2026-07-29 that is exactly what happened:
 * the row said "still pending" and nothing anywhere recorded that Selcom had refused
 * the product outright. With a ladder there is more to lose — "we paid you on Selcom
 * Pesa because mobile money was refused" is a sentence the platform must be able to
 * prove months later, to the player and to a regulator.
 *
 * Fire-and-forget by design: an audit write must never fail or delay a money movement.
 * Each detail is already log-safe (no credentials, payee masked, truncated).
 */
function recordRailAttempts(txnId: string, userId: string, result: LadderResult): void {
  if (!result.attempts?.length) return;
  for (const a of result.attempts) {
    audit({
      category: "WALLET",
      action: "withdraw.rail_attempt",
      actorId: userId,
      targetType: "Transaction",
      targetId: txnId,
      payload: { rail: a.rail, transid: a.transid, outcome: a.outcome, detail: a.detail.slice(0, 500) },
    });
  }
}

export async function dispatchApprovedWithdrawal(
  txnId: string,
): Promise<{ ok: true; status: "PROCESSING" | "CONFIRMED" } | { ok: false; error: string }> {
  const pre = await db.txn.findById(txnId);
  if (!pre) return { ok: false, error: "Transaction not found." };
  if (pre.type !== "WITHDRAWAL") return { ok: false, error: "Not a withdrawal." };
  if (pre.status !== "AML_REVIEW") return { ok: false, error: `Withdrawal is ${pre.status}, not under review.` };

  const gross = Math.abs(pre.amount);
  const fee = pre.fee ?? 0;
  const net = gross - fee; // what the gateway actually disburses (the payee receives net)
  const provider = (pre.provider ?? "INTERNAL") as PaymentProvider;

  // Claim: AML_REVIEW → PROCESSING under the wallet lock so a double-approve or a
  // concurrent reject can't both act. The hold stays exactly where withdraw() put it.
  const claimed = await withLock(`wallet:${pre.userId}`, async () => {
    const t = await db.txn.findById(txnId);
    if (!t || t.status !== "AML_REVIEW") return null;
    await db.txn.update(txnId, { status: "PROCESSING" });
    return t;
  });
  if (!claimed) return { ok: false, error: "Withdrawal already actioned." };

  // Dispatch to the gateway OUTSIDE the wallet lock — never hold a lock across network I/O.
  const result = await dispatchWithdrawal({
    provider,
    amount: net,
    grossAmount: gross,
    msisdn: claimed.msisdn ?? undefined,
    userId: claimed.userId,
    reviewed: true, // already AML-reviewed: skip the hold, go straight to the gateway
  });

  if (!result.ok) {
    // The gateway did not accept it (config down or a definitive reject). Do NOT
    // auto-refund a just-approved large payout — put it back under review, hold intact,
    // so an officer can retry once the rail is up or reject-refund deliberately.
    await withLock(`wallet:${claimed.userId}`, async () => {
      const t = await db.txn.findById(txnId);
      if (t && t.status === "PROCESSING") await db.txn.update(txnId, { status: "AML_REVIEW" });
    });
    audit({ category: "COMPLIANCE", action: "withdraw.approved_dispatch_failed", actorId: null, targetType: "Transaction", targetId: txnId, payload: { reason: result.reason, providerRef: result.correlationId } });
    return { ok: false, error: "The payment provider did not accept the payout. It stays under review — retry once the rail is available, or return the funds." };
  }

  // Record the REAL provider reference + the rail so the webhook + reconcile can
  // correlate/settle it against the endpoint that actually holds it.
  //
  // `providerStatus` is persisted here too. It was not before: an approve-dispatch
  // wrote only the ref, so a payout that went out through compliance review carried
  // no record of what Selcom said — the exact blind spot the 2026-07-29 incident was
  // made of, reproduced on the one path a human had already touched.
  await db.txn.update(txnId, {
    providerRef: result.providerRef,
    ...(result.rail ? { payoutRail: result.rail } : {}),
    ...(result.detail ? { providerStatus: result.detail.slice(0, 500) } : {}),
  });
  recordRailAttempts(txnId, claimed.userId, result);
  audit({ category: "COMPLIANCE", action: "withdraw.approved_dispatched", actorId: null, targetType: "Transaction", targetId: txnId, payload: { providerRef: result.providerRef, rail: result.rail ?? null, gross, net, status: result.status } });

  if (result.status === "CONFIRMED") {
    // Synchronous provider (mock / demo) — settle now via the exactly-once path.
    await settleWithdrawalConfirmed(txnId);
    return { ok: true, status: "CONFIRMED" };
  }
  // PENDING (real async payout): stays PROCESSING; the walletcashin/query webhook +
  // reconcile sweep confirm or reverse it. Tell the player their payout is on its way.
  notifyWithdraw(claimed.userId, { status: "INITIATED", amount: gross, net, provider: friendlyProvider(provider) });
  return { ok: true, status: "PROCESSING" };
}

/** Reverse a held withdrawal whose payout failed: return the funds to spendable
 *  balance, release the hold, mark FAILED. Exactly-once under the wallet lock.
 *
 *  Exported for the officer-driven release at `/admin/payments` ("Return to
 *  player"), which is the ONLY way to free a payout the provider refused outright —
 *  a 403 never becomes terminal, so no automatic path can resolve it. That action
 *  re-queries the provider and refuses on a COMPLETED verdict before calling this,
 *  and the idempotency here is what makes a race with the sweep or a late callback
 *  safe. */
export async function settleWithdrawalFailed(txnId: string, reason: string): Promise<boolean> {
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
      html: amlRejectRefundHtml({ amount: refunded, reason, reference: done.id, gatewayRef: done.providerRef ?? null, railLabel: payoutRailLabel(done.payoutRail) }),
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
/**
 * FAST CREDIT LANE — the reason a player does not wait half an hour.
 *
 * The intended fast path is Selcom's callback, which credits in seconds. When that
 * callback does not arrive (observed on the live rail 2026-07-20: a paid deposit sat
 * PROCESSING with no webhook at all), the only other authority is the signed
 * order-status re-query — and that used to live exclusively in the 30-minute stale
 * sweep. A player who has already been debited will not wait 30 minutes, and will
 * very reasonably pay again.
 *
 * So this runs on every lifecycle tick and re-queries deposits that have been in
 * flight for more than a few seconds.
 *
 * ⚠️ It can ONLY confirm. It never fails, never reverses, never terminalises
 * anything. That asymmetry is the whole safety argument: running a re-query every
 * minute cannot turn a slow-but-valid deposit into a failed one, no matter what the
 * provider or the network does. Every terminal decision stays with
 * `reconcileStalePayments` and its deliberately patient 30-minute cutoff.
 *
 * Crediting goes through `settlePaymentWebhook`, so it is exactly-once and
 * amount-tamper-checked — identical to the webhook path. A callback arriving later
 * for the same reference is a no-op.
 */
export async function creditConfirmedDeposits(
  olderThanMs = 8_000,
  fastWindowMs = 10 * 60 * 1000,
): Promise<{ checked: number; confirmed: number }> {
  const now = Date.now();
  const cutoff = now - olderThanMs;
  // Poll only deposits inside the fast window. A deposit older than that is no
  // longer someone staring at a spinner, and the 5-minute sweep plus the 30-minute
  // reconcile already own it — so the number of gateway calls per poll stays bounded
  // by CONCURRENT deposits, not by the size of the transaction table.
  const windowStart = now - fastWindowMs;
  const inFlight = (await db.txn.listByStatus("PROCESSING")).filter((t) => {
    if (t.type !== "DEPOSIT" || !t.providerRef) return false;
    const at = Date.parse(t.createdAt);
    return at < cutoff && at >= windowStart;
  });
  let confirmed = 0;
  for (const t of inFlight) {
    try {
      const v = await verifyDepositStatus(t.providerRef!);
      if (v.status !== "CONFIRMED") continue; // PENDING / FAILED / UNSUPPORTED — not ours to act on
      const r = await settlePaymentWebhook({ providerRef: t.providerRef!, status: "CONFIRMED", amount: v.amount });
      // `handled` is ALSO true for "already-confirmed" — the idempotent no-op when
      // another path settled first. Counting that as a credit inflates the metric and
      // makes a duplicate poll look like a duplicate payment in the audit log, which
      // is exactly the wrong signal on a money surface. Count only a fresh settle.
      if (r.handled && r.reason === "deposit-confirmed") confirmed++;
    } catch (err) {
      // A provider blip must not stop the lane for the other in-flight deposits.
      console.error("[payments] fast credit re-query failed", { txnId: t.id, err: (err as Error)?.message });
    }
  }
  if (confirmed) {
    audit({ category: "WALLET", action: "payments.fast_credit", actorId: null, targetType: null, targetId: null,
      payload: { checked: inFlight.length, confirmed, olderThanMs } });
  }
  return { checked: inFlight.length, confirmed };
}

/**
 * FAST PAYOUT LANE — the same courtesy for money going OUT.
 *
 * 🔴 WHY THIS EXISTS. On 2026-07-29 a real 10,000 TZS withdrawal
 * (`txn_8ad70b448950261a60fc860a`) sat in PROCESSING while its owner watched the
 * balance already gone from their wallet. Nothing was wrong — Selcom genuinely had
 * it in progress — but NOTHING re-queried it for the first 30 minutes, because the
 * stale sweep is the only thing that asks and it ignores anything younger than that.
 * Deposits got a 15-second re-query lane in July for exactly this reason
 * (`creditConfirmedDeposits`); payouts never did. The asymmetry was invisible until
 * real money went out.
 *
 * ⚠️ CONFIRM-ONLY, DELIBERATELY. This lane can settle a payout as COMPLETE and
 * release the hold. It can NEVER fail or reverse one. That is the property that
 * makes it safe to run every 15 seconds: the worst case is that it does nothing.
 * A reversal refunds a player whose money may already be on its way to their
 * handset — a double-pay — so reversals stay exclusively with the 30-minute
 * `reconcileStalePayments`, which is written to be conservative about exactly that
 * (see its UNSUPPORTED arm). A payout that genuinely FAILED therefore still takes
 * up to 30 minutes to return to the wallet; that delay is the cost of never paying
 * twice, and it is the right trade.
 *
 * The window is [olderThanMs, fastWindowMs] = [8s, 30min], which meets the stale
 * sweep exactly at its 30-minute cutoff — no gap where nobody is asking, and no
 * overlap where both are. Gateway calls per poll are bounded by CONCURRENT payouts,
 * not by the size of the transaction table.
 *
 * Settlement goes through `settlePaymentWebhook`, the same exactly-once path the
 * real callback uses, so a callback and this lane racing cannot double-release.
 */
/**
 * Which in-flight payouts the fast lane is allowed to touch.
 *
 * Exported so `test:fast-payout` can drive the window boundaries directly — the
 * selection is where an off-by-one silently means "nobody is asking about this
 * payout", which is the exact failure that left a real withdrawal unqueried for
 * 38 minutes. A test that could only observe the lane's aggregate result would
 * not distinguish "correctly skipped" from "wrongly skipped".
 */
export function isFastPayoutCandidate(
  t: { type: string; providerRef?: string | null; createdAt: string },
  nowMs: number,
  olderThanMs: number,
  fastWindowMs: number,
): boolean {
  if (t.type !== "WITHDRAWAL" || !t.providerRef) return false;
  const at = Date.parse(t.createdAt);
  if (!Number.isFinite(at)) return false;
  return at < nowMs - olderThanMs && at >= nowMs - fastWindowMs;
}

export async function settleConfirmedWithdrawals(
  olderThanMs = 8_000,
  fastWindowMs = 30 * 60 * 1000,
): Promise<{ checked: number; confirmed: number }> {
  const now = Date.now();
  const inFlight = (await db.txn.listByStatus("PROCESSING")).filter((t) =>
    isFastPayoutCandidate(t, now, olderThanMs, fastWindowMs),
  );
  let confirmed = 0;
  for (const t of inFlight) {
    try {
      const v = await verifyWithdrawalStatus(t.providerRef!, t.payoutRail);
      // Keep the LATEST provider answer on the row, every pass. A payout that stalls
      // for an hour should be able to tell an operator what it has been hearing that
      // whole time — the 2026-07-29 incident had no such trail, so "still in flight"
      // and "the gateway is refusing us" were indistinguishable.
      if (v.detail && v.detail !== t.providerStatus) {
        try { await db.txn.update(t.id, { providerStatus: `${v.status}: ${v.detail}`.slice(0, 500) }); } catch { /* non-fatal */ }
      }
      // PENDING is also what a FAILED QUERY looks like (verifyWithdrawalStatus maps
      // an unreachable/rejected provider call to PENDING), and FAILED is left to the
      // stale sweep. Only a definitive CONFIRMED is actionable here.
      if (v.status !== "CONFIRMED") continue;
      const r = await settlePaymentWebhook({ providerRef: t.providerRef!, status: "CONFIRMED" });
      // `handled` is also true for the idempotent already-settled no-op. Counting
      // that would make a duplicate poll look like a duplicate payout in the audit
      // log — precisely the wrong signal on a money surface.
      if (r.handled && r.reason === "withdrawal-confirmed") confirmed++;
    } catch (err) {
      // One provider blip must not stop the lane for the other in-flight payouts.
      console.error("[payments] fast payout re-query failed", { txnId: t.id, err: (err as Error)?.message });
    }
  }
  if (confirmed) {
    audit({ category: "WALLET", action: "payments.fast_payout", actorId: null, targetType: null, targetId: null,
      payload: { checked: inFlight.length, confirmed, olderThanMs } });
  }
  return { checked: inFlight.length, confirmed };
}

/**
 * E-134 — "this one needs a human", said ONCE per transaction rather than once per sweep.
 *
 * 🔴 MEASURED ON PRODUCTION 2026-08-10. A single withdrawal that had been waiting for an
 * officer since 2026-08-07 had written **1,329 byte-identical audit rows** — one every ~5
 * minutes for 69 hours — and `payments.reconcile_needs_review` as a whole was **1,363 rows,
 * 3.4% of the entire audit chain**, with `payments.reconcile_sweep` another **5.3%** beside
 * it. The reconcile machinery alone was **8.7% of 40,052 rows**.
 *
 * ⛔ NOTHING IS WRONG WITH THE MONEY LOGIC BELOW, and this changes none of it. Every one of
 * those rows was TRUE: refusing to auto-reverse a payout with no `providerRef` is correct,
 * and it is the reason no player was ever wrongly refunded. They are the same truth,
 * restated 1,329 times. The harm is dilution of evidence a regulator reads — an officer
 * scanning a day of WALLET activity scrolls past hundreds of copies of one open item.
 *
 * ⭐ The pattern is already in this function, eleven lines below the worst offender: the
 * payout arm writes `providerStatus` only when the gateway's answer CHANGED. This is that
 * rule applied to the announcement itself.
 *
 * ⚠️ It removes noise and NO information. `/admin/payments` derives its stuck count from the
 * TRANSACTION table (`derivePayoutStatus` → `db.txn.search`), never from these rows, and the
 * per-sweep `reconcile_sweep` summary still carries `leftPending` every cycle.
 *
 * ⚠️ Pinned on `globalThis`, not a module-level `const` — route handlers and the chore runner
 * land on different module instances, so a plain module Set would dedupe per-instance and let
 * the spam straight back in. A process restart re-announces each open item exactly once,
 * which is intended: a fresh process should state what it inherited.
 */
const NEEDS_REVIEW_SEEN: Set<string> = ((globalThis as unknown as Record<string, unknown>).__kpNeedsReviewSeen ??=
  new Set<string>()) as Set<string>;

/** Beyond this the set is dropped and every open item re-announces once. A stale-payment
 *  queue is small by nature; this only exists so a pathological run cannot grow it forever. */
const NEEDS_REVIEW_CAP = 5_000;

function auditNeedsReviewOnce(txnId: string, reason: string, payload: Record<string, unknown>): void {
  // Keyed on the REASON as well as the id: a transaction that moves from "no providerRef" to
  // "status unavailable" has genuinely changed state, and that transition deserves a row.
  const key = `${txnId}::${reason}`;
  if (NEEDS_REVIEW_SEEN.has(key)) return;
  if (NEEDS_REVIEW_SEEN.size >= NEEDS_REVIEW_CAP) NEEDS_REVIEW_SEEN.clear();
  NEEDS_REVIEW_SEEN.add(key);
  audit({ category: "WALLET", action: "payments.reconcile_needs_review", actorId: null, targetType: "Transaction", targetId: txnId, payload: { ...payload, reason } });
}

/** Forget a transaction once it reaches a terminal state, so a LATER stall speaks again. */
function clearNeedsReview(txnId: string): void {
  const prefix = `${txnId}::`;
  for (const k of NEEDS_REVIEW_SEEN) if (k.startsWith(prefix)) NEEDS_REVIEW_SEEN.delete(k);
}

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
      if (!ref) {
        // "No providerRef" is NOT proof the deposit never reached the gateway. The
        // reference is written just AFTER dispatch returns, so a crash, a redeploy or
        // a DB blip in that window leaves a genuinely PAID deposit with no reference —
        // and failing it here tells the player "the payment was never started with
        // your provider" about money that has already left their handset.
        //
        // In live money mode, refuse to guess: leave it PROCESSING and put it in front
        // of an operator, exactly as the withdrawal arm below already does. Only the
        // mock/test rail, where nothing can have been charged, still auto-fails.
        if (isLiveMoneyMode()) {
          leftPending++;
          auditNeedsReviewOnce(t.id, "deposit has no providerRef — cannot prove it was never dispatched; not auto-failed", { amount: t.amount });
        } else if (await settleDepositFailed(t.id, "reconcile-timeout-no-ref")) {
          depositsFailed++;
          clearNeedsReview(t.id);
        }
        continue;
      }
      const v = await verifyDepositStatus(ref);
      if (v.status === "CONFIRMED") {
        const r = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED", amount: v.amount }); // exactly-once + amount-tamper check
        if (r.handled) { depositsConfirmed++; clearNeedsReview(t.id); }
      } else if (v.status === "FAILED") {
        if (await settleDepositFailed(t.id, "reconcile-verified-failed")) { depositsFailed++; clearNeedsReview(t.id); }
      } else if (v.status === "UNSUPPORTED") {
        // UNSUPPORTED means "we could not ask" — the mock rail, or a live provider
        // whose credentials are missing. Terminalising on that is only safe when no
        // real money can be in flight. In LIVE money mode a missing/So-broken
        // credential would otherwise blind-FAIL genuinely paid deposits within one
        // sweep, with the audit reason indistinguishable from a real timeout.
        if (isLiveMoneyMode()) {
          leftPending++;
          auditNeedsReviewOnce(t.id, "provider status unavailable in LIVE mode — not auto-failed", { providerRef: ref });
        } else if (await settleDepositFailed(t.id, "reconcile-timeout")) {
          depositsFailed++; // mock/test — no money credited, safe
          clearNeedsReview(t.id);
        }
      } else {
        leftPending++; // PENDING — still in flight; leave PROCESSING for the next sweep
      }
    } else if (t.type === "WITHDRAWAL") {
      // ⚠️ THE 1,329-ROW SITE. One withdrawal sat here from 2026-08-07 to 2026-08-10 and this
      // line fired on every sweep. The refusal is right; the repetition was not.
      if (!ref) { leftPending++; auditNeedsReviewOnce(t.id, "stale withdrawal has no providerRef — not auto-reversed", {}); continue; }
      // 🔴 `t.payoutRail` is load-bearing here, not decoration. This is the ONLY path
      // that can auto-reverse a payout, so querying the wrong rail's endpoint would
      // read a stranger's envelope as FAILED and refund a player whose money is gone.
      const v = await verifyWithdrawalStatus(ref, t.payoutRail);
      // Same trail as the fast lane: a payout stuck across many sweeps must record
      // what the gateway keeps telling us, not just that it is still stuck.
      if (v.detail && `${v.status}: ${v.detail}` !== t.providerStatus) {
        try { await db.txn.update(t.id, { providerStatus: `${v.status}: ${v.detail}`.slice(0, 500) }); } catch { /* non-fatal */ }
        console.log(`[payments] payout ${t.id} (${ref}) — ${v.status}: ${v.detail}`);
      }
      if (v.status === "CONFIRMED") {
        const r = await settlePaymentWebhook({ providerRef: ref, status: "CONFIRMED" }); // release the hold, exactly-once
        if (r.handled) { withdrawalsConfirmed++; clearNeedsReview(t.id); }
      } else if (v.status === "FAILED") {
        if (await settleWithdrawalFailed(t.id, "reconcile-verified-failed")) { withdrawalsReversed++; clearNeedsReview(t.id); }
      } else if (v.status === "UNSUPPORTED") {
        // UNSUPPORTED means "we could not ask", NOT "nothing happened". It is
        // reachable with no operator action at all: any PAYMENT_API_* variable
        // dropped makes selcomEnv() null, and a single transient DB error while
        // hydrating the payment control-plane pins the provider to the env fallback
        // for the life of the process. Reversing on that refunds a payout that may
        // already be on its way to the customer's handset — paying twice.
        //
        // Deliberately NOT mode-gated like the deposit arm above: a withdrawal that
        // has a providerRef is never auto-reversed in ANY mode. Gating it would leave
        // a branch shaped exactly like the bug, waiting for someone to flip a flag.
        leftPending++;
        auditNeedsReviewOnce(t.id, "payout status unavailable — never auto-reversed", { providerRef: ref });
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
/**
 * 🔴 `E-223` · ONE SENTENCE FOR "there isn't enough", minted at both places that can say it.
 *
 * `withdraw()` refuses a short payout in TWO places — the explicit balance check and the
 * atomic `requireBalanceGte` debit that catches a concurrent spend — and both used to return
 * a bare `INVALID` with no `reason`, which `errorCopy` renders as the generic *"That didn't
 * go through. Check the details and try again."* on the money-out screen.
 *
 * ⭐ AND THE SHORTFALL HAS TWO CAUSES THAT NEED DIFFERENT SENTENCES. A player holding cash
 * AND an unfulfilled bonus sees one total in their wallet and is refused when they ask for
 * it — "you don't have that" is not an answer they can act on, because they can see that
 * they do. When the gap is exactly the locked bonus, the refusal says so and points at the
 * wagering requirement; otherwise it is the ordinary shortfall.
 *
 * ⚠️ THE FIGURE IS `w.balance` IN BOTH. Never `balance + bonusBalance`: that is a number the
 * player cannot withdraw, and stating it on a money screen is the defect class the
 * Player-View Audit shipped five blockers for.
 */
function shortOfFunds(w: { balance: number; bonusBalance?: number | null }, amount: number) {
  const bonus = w.bonusBalance ?? 0;
  // Only claim the bonus explains the gap when it actually closes it. A player asking for far
  // more than cash + bonus is simply short, and blaming the wagering requirement would be a
  // confident wrong answer.
  const bonusExplainsIt = bonus > 0 && amount <= w.balance + bonus;
  return {
    ok: false as const,
    // The English service string stays the audit/API truth; the player reads the localized
    // line minted from the reason (same split as `payout_destination_not_registered`).
    error: "Insufficient balance.",
    code: "INVALID" as const,
    reason: bonusExplainsIt ? ("withdraw_bonus_locked" as const) : ("withdraw_balance_insufficient" as const),
    detail: { balance: w.balance, needed: amount },
  };
}

/** `actorId` — WHO initiated this payout, when that is not the account holder.
 *  Two OPERATOR paths call this function directly (`admin/payments/payment-actions.ts`
 *  `retryWithdrawalAction` and `bulkRetryAction`), and without this the compliance
 *  record would name the PLAYER as the actor on an operator-initiated payout. Defaults
 *  to `userId` — a player withdrawing for themselves. The account holder is never lost:
 *  it is the txn's `userId` and is carried as `onBehalfOf` in both audit payloads. */
export async function withdraw(userId: string, input: z.input<typeof WithdrawSchema>, idempotencyKey?: string, actorId?: string): Promise<ServiceResult<{ txnId: string; status: StoredTxn["status"]; fee: number; net: number }>> {
  const actor = actorId ?? userId;
  const operatorInitiated = !!actorId && actorId !== userId;
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

  // 🔴 `E-215` · THE PAYOUT MAY ONLY GO TO THE NUMBER ON THE ACCOUNT. This is the
  // owner’s law (2026-08-25) and until this line existed NOTHING enforced it: `phoneE164`
  // appeared exactly once anywhere on the withdrawal path — in the form PREFILL — while this
  // function stored and dispatched whatever the form sent, uncompared. Re-derived from
  // production the day it was written: 7 of 25 lifetime withdrawals went elsewhere, 6
  // CONFIRMED, and one pair (`…979354` → `…939754`) is a DIGIT TRANSPOSITION — a player who
  // almost certainly mistyped their own number and paid a stranger. See
  // `src/lib/payout-destination.ts` for the full census and why it refuses rather than
  // corrects.
  //
  // ⛔ IT SITS HERE, BEFORE THE HOLD, AND THE ORDER IS THE POINT. Everything below this
  // line moves money: `db.wallet.adjust` takes the balance into `hold` and `db.txn.create`
  // writes the ledger row. Refusing after either would leave a player debited for a payout
  // that was never allowed to leave — the stranded-funds shape `reconcileStalePayments`
  // exists to clean up. Nothing has moved when this returns.
  //
  // ⚠️ IT BINDS THE OPERATOR PATHS TOO, and that is deliberate rather than overlooked.
  // `admin/payments` `retryWithdrawalAction` and `bulkRetryAction` replay the ORIGINAL
  // `t.msisdn`, so retrying one of the historical mismatched rows is now refused — which is
  // correct: a retry of a payout to a non-registered number is the very act the law
  // forbids, and it does not strand anything, because a refused retry creates no
  // replacement txn and the money comes back through *Return to player* as it always did.
  const destination = payoutDestinationFor(user.phoneE164, parse.data.msisdn);
  if (!destination.ok) {
    // ⛔ THE AUDIT FACT IS WRITTEN BEFORE THE RETURN, and it carries the SUBMITTED number.
    // A refusal nobody can count is how `E-215` stayed invisible for 25 withdrawals: the
    // rows were all in the ledger and no query asked whether the destination matched.
    // ⚠️ There is no txnId to join to — the point is that no transaction exists — so this
    // is keyed on the USER, and `submittedMsisdn` is recorded in full because "somebody
    // tried to send this account’s money to THAT number" is exactly the fact a regulator
    // asks for. The player never sees it; `failPayoutDestination` names only the last four.
    audit({
      category: "WALLET", action: "withdraw.destination_refused", actorId: actor,
      targetType: "User", targetId: userId,
      payload: {
        refusal: destination.refusal, amount: parse.data.amount, provider: parse.data.provider,
        submittedMsisdn: parse.data.msisdn ?? null, onBehalfOf: userId, operatorInitiated,
      },
    });
    return {
      ok: false,
      // The English service string is audit/API truth; the player reads
      // `failPayoutDestination` in their own language, minted from the reason below.
      error: `Payouts may only be sent to the number registered on this account (ending ${destination.last4}).`,
      code: "INVALID",
      reason: "payout_destination_not_registered" as const,
      detail: { last4: destination.last4 },
    };
  }

  // ⛔ IDENTITY IS RECORDED HERE, IT IS NO LONGER ENFORCED — and the read stays for
  // exactly that reason. Identity verification stopped being a precondition of
  // withdrawal on the Gaming Board's instruction (comment #1, relayed by the owner
  // 2026-08-19). Deleting this read would leave the platform unable to answer the one
  // question the regulator asks: "which payouts went to unverified accounts?"
  //
  // What replaced the refusal is a RECORD, in two parts:
  //   1. `kycStatus` on `withdraw.initiated`, for EVERY payout — so the verified and
  //      the unverified are distinguishable in the ledger, and only by that stamp.
  //   2. a COMPLIANCE fact when the payer is unverified, emitted AFTER the txn exists
  //      and carrying `txnId`, so it can be joined to the payout it explains. It is
  //      awaited, like every other money/compliance write on this path.
  //
  // ⚠️ WHAT REMAINS, because a future reader will ask: the AML ≥ TZS 1,000,000
  // two-officer hold (`payments.ts`, which contains no identity reference at all and
  // therefore cannot be weakened by this change), the wallet freeze below, the
  // per-provider kill-switch, the gateway floor, and the payout pause — the last of
  // which lives in the ROUTE (`wallet/withdraw/actions.ts`), not here. After this
  // change `w.status !== "ACTIVE"` is the ONLY account-level control inside this
  // function: there is no `user.status` check and no self-exclusion check on the
  // withdraw path. Full statement: `docs/BOARD-DISCLOSURE-B-E.md` §5-§6.
  const kyc = await db.kyc.findByUserId(userId);
  const kycStatus = kyc?.status ?? "NOT_STARTED";

  const amount = parse.data.amount;
  // The withdrawal fee — the ONLY thing a player is charged here. Admin-tunable,
  // never hardcoded.
  const wcfg = await getEffectiveConfig();
  const fee = computeWithdrawalFee(amount, wcfg.withdrawalFeeRate);
  const gatewayShare = Math.min(fee, Math.max(0, Math.round(amount * Math.max(0, wcfg.withdrawalGatewayShareRate))));
  const net = amount - fee;
  // 🔴 THE GATEWAY FLOOR IS ON THE NET, SO THE CHECK IS ON THE NET (found live 2026-07-31).
  // A TZS 1,000 withdrawal passed our gross minimum, lost 15 to the fee, and Selcom refused
  // the 985 with `013 "Payment amount must be greater than or equal to TZS 1,000"`. Refusing
  // here — before the hold is placed — is the honest direction: the player keeps a spendable
  // balance instead of watching it vanish into a payout that cannot be delivered.
  if (net < PROVIDER_MIN_PAYOUT_TZS) {
    const minGross = minWithdrawalForRate(wcfg.withdrawalFeeRate);
    return {
      ok: false,
      error: `The smallest amount we can send is TZS ${PROVIDER_MIN_PAYOUT_TZS.toLocaleString()} after the fee. Withdraw at least TZS ${minGross.toLocaleString()}.`,
      code: "INVALID",
      // ⛔ THE FIGURES ARE NUMBERS, AND THIS IS THE ONE THAT PROVES WHY. `errorCopy` used to
      // recover both of them by running a regex over the sentence above (`tzsFigures`) and
      // feeding match[0] into {net} and match[1] into {min}. Reword the sentence, add a third
      // TZS figure, or translate it, and the player silently gets the wrong number — or a bare
      // "{net}" — on a money screen, with every "does it name the minimum" assertion still
      // green. docs/RULES.md §2.9 records that exact defect shipping in all three languages.
      reason: "withdraw_below_min" as FailureReason,
      detail: { net: PROVIDER_MIN_PAYOUT_TZS, min: minGross } satisfies FailureDetail,
    };
  }
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
    // 🔴 `E-223` · THIS REFUSAL USED TO SAY NOTHING. It returned `INVALID` with no `reason`,
    // so `errorCopy` fell through to the generic `errInvalid` — *"That didn't go through.
    // Check the details and try again."* — on the most common refusal of the money-out
    // screen. Measured on production 2026-08-26 by replaying the real server action with the
    // amount rewritten to `balance + 1`: that generic sentence is what came back.
    // ⚠️ THE FIGURE IS `w.balance`, NOT `w.balance + w.bonusBalance`. The player's wallet
    // shows one total; the withdrawable part is only the first half, and naming the sum would
    // promise money they cannot have.
    if (w.balance < amount) return shortOfFunds(w, amount);

    // Move funds from spendable balance into `hold` while in flight — atomic and
    // overdraw-guarded (WHERE balance >= amount) so concurrent debits on the same
    // wallet can't double-spend even across instances.
    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount });
    // ⭐ THE SECOND CONTROL, and it must say the SAME thing as the first. This is the atomic
    // `WHERE balance >= amount` guard catching a concurrent debit that landed between the
    // check above and this write. A player who loses that race is in exactly the situation
    // the sentence above describes, so leaving this one on the generic copy would make one
    // refusal speak with two voices depending on a race they cannot see.
    if (!updated) return shortOfFunds(w, amount);
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
    // `kycStatus` is stamped on EVERY withdrawal, verified or not. A stamp that only
    // appeared on unverified payouts would make its own absence ambiguous — indis-
    // tinguishable from an audit write that failed (see the fail-open note below).
    audit({ category: "WALLET", action: "withdraw.initiated", actorId: actor, targetType: "Transaction", targetId: txnId, payload: { provider: parse.data.provider, amount, fee, gatewayShare, net, kycStatus, onBehalfOf: userId, operatorInitiated } });
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

  // ── THE COMPLIANCE RECORD THAT REPLACED THE GATE ───────────────────────────
  // A FACT, not a refusal: this payout is going to an account that has not proved its
  // identity, the Board instructed that on 2026-08-19, and here is the instance.
  //
  // Placed HERE for three reasons, each of which was a way to get it wrong:
  //   · AFTER the txn exists and carrying `txnId` — an event that cannot be joined to
  //     the payout it explains answers nothing.
  //   · AFTER the duplicate check — an idempotent replay is not a second payout, and
  //     recording it as one would inflate the count the regulator is given.
  //   · OUTSIDE the wallet lock — this is an awaited write, and this function
  //     deliberately never holds the lock across I/O.
  //
  // ⚠️ FAIL-OPEN, AND THIS IS THE ONE PATH WHERE IT MATTERS. `audit()` keeps the entry
  // in a per-instance in-memory ring and lets the request proceed if the database write
  // throws (audit.ts). So under a DB outage this payout can succeed while the record
  // explaining it does not durably persist. Disclosed to the Board rather than dressed
  // up as durability we have not built — `docs/BOARD-DISCLOSURE-B-E.md` §6.3.
  if (kycStatus !== "APPROVED") {
    await audit({
      category: "COMPLIANCE",
      action: "withdraw.unverified_payer",
      actorId: actor,
      targetType: "Transaction",
      targetId: txnId,
      payload: {
        kycStatus,
        onBehalfOf: userId,
        operatorInitiated,
        amount,
        net,
        provider: parse.data.provider,
        // The authority of record, in the row itself. An auditor reading this event
        // should not have to be handed a separate document to learn why it is not a
        // refusal — and a future engineer should not "fix" it back into one.
        instruction: "TZ Gaming Board comment #1, relayed by the owner 2026-08-19",
      },
    });
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
    // Every rung that was tried, before the row is reversed and the evidence is
    // gone. "All rails refused" is a one-line summary; the trail is what says which
    // ones were skipped as unprovisioned and which actually answered.
    recordRailAttempts(txnId, userId, result);
    // Record WHAT THE GATEWAY SAID before reversing, or the reason dies with the
    // request. `providerStatus` is written first so it survives even if the
    // settle path below throws.
    if (result.detail) {
      try { await db.txn.update(txnId, { providerStatus: result.detail.slice(0, 500) }); } catch { /* non-fatal */ }
    }
    // Reverse the hold (return funds) + mark FAILED — shared, idempotent path.
    await settleWithdrawalFailed(txnId, result.reason);
    // PROVIDER_DOWN is not the player's doing and not their account — it is our
    // rail being unavailable. Telling them "withdrawal failed" invites them to
    // retry immediately, fail again, and conclude their money is stuck. Say what
    // is true: the payout rail is down and their balance never moved.
    return result.reason === "PROVIDER_DOWN"
      ? { ok: false, error: "Withdrawals are temporarily unavailable. Your balance is unchanged — please try again later.", code: "INVALID" }
      : { ok: false, error: "Withdrawal failed. Funds returned to your balance.", code: "INVALID" };
  }

  // Record the provider reference for webhook correlation / reconciliation, and
  // WHAT SELCOM ACTUALLY SAID when it accepted.
  //
  // 🔴 `providerStatus` had never been written by any code path in this repo — the
  // column existed and was dead. On 2026-07-29 two real payouts sat PROCESSING and
  // the platform could not say whether Selcom had queued them, refused them for an
  // empty float, or rejected the utility code, because the envelope was discarded
  // at the adapter. "Accepted" is exactly the state that stalls, so the accepted
  // detail is the one most worth keeping.
  // `payoutRail` rides alongside the ref because the two are only meaningful
  // together: the ref identifies the payout, the rail identifies WHICH endpoint can
  // be asked about it. Persist one without the other and every later re-query is a
  // coin flip between the right answer and a refund on top of a completed payment.
  await db.txn.update(txnId, {
    providerRef: result.providerRef,
    ...(result.rail ? { payoutRail: result.rail } : {}),
    ...(result.detail ? { providerStatus: result.detail.slice(0, 500) } : {}),
  });
  recordRailAttempts(txnId, userId, result);

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

/**
 * The rail, spelled the way its owner spells it.
 *
 * ⛔ THE SPELLINGS ARE NOT WRITTEN HERE. This was one of eight hand-kept copies of
 * the same id → brand-name map — the receipt page's version even called itself "a
 * local mirror of wallet-service's label map", i.e. a mirror of THIS function. The
 * catalogue is `@/lib/payment-providers`; the wallet surfaces under `src/app/wallet/`
 * still hold their own copies and are the next to migrate.
 * ⚠️ Deliberate behaviour change in the tail: the old switch listed six ids and
 * printed the RAW TOKEN for the rest, so a legacy row said "TIGO_PESA" to a player.
 * The catalogue knows all nine, so those now read "Tigo Pesa" / "TTCL Pesa" /
 * "Internal". `"Mobile money"` is kept as this module's own last resort — the other
 * call sites disagree about that word, which is why the helper returns `null`.
 */
function friendlyProvider(p: string | null | undefined): string {
  return paymentMethodName(p) ?? p ?? "Mobile money";
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
