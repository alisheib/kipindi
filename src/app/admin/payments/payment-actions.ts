"use server";

/**
 * ADM4 — Payments-ops actions. All gated to ADMIN/COMPLIANCE + 2FA and audited.
 *
 * Money-safety: deposit retry requires a stored, verified provider-negative result
 * and a stable child key. Legacy failures enter review without another collection.
 * "Cancel & refund" cannot hide an unproven failed deposit.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import { setKillSwitch, type Mno, MNOS } from "@/lib/server/payment-ops";
import { setPaymentControls, type ControlsUpdate, type PaymentProviderId } from "@/lib/server/payment-control";
import { setPayoutStatus, PAYOUT_STATUSES, type PayoutStatus } from "@/lib/server/payout-status";
import { selcomEnv, selcomPing } from "@/lib/server/selcom";
import { retryFailedDepositFromAdmin } from "@/lib/server/admin-deposit-retry";
import { withLock } from "@/lib/server/locks";
import { hasDepositFinalNegative, hasDepositStatusReview } from "@/lib/wallet/deposit-review";

/* DG-S-05 — `field` is optional and additive: every refusal below keeps its exact sentence and
   its exact shape; what is new is that three of them can now say WHICH control to fix. */
type Result = { ok: true } | { ok: false; error: string; field?: string };

// ⛔ ONE GATE, NOT A COPY (finding A2). This wrapper keeps the local error wording and the
// `"error" in g` shape every call site below already uses; the DECISION — grant lookup,
// SECURITY audit on refusal, step-up 2FA — lives in `softRequireStaff`. Four surfaces had
// hand-rolled this and two had drifted: privacy lost the audit, reports lost the 2FA.
async function gate(action: string): Promise<{ userId: string; sessionId: string } | { error: string }> {
  const g = await softRequireStaff("accounting", action, "Forbidden: your role cannot manage payments.");
  return g.ok ? { userId: g.userId, sessionId: g.sessionId } : { error: g.error };
}

/** Kill-switch — pause/resume deposits or withdrawals for one MNO (hard tier). */
export async function toggleKillSwitchAction(formData: FormData): Promise<Result> {
  const g = await gate("toggleKillSwitch");
  if ("error" in g) return { ok: false, error: g.error };
  const provider = String(formData.get("provider") ?? "") as Mno;
  const kind = String(formData.get("kind") ?? "") as "deposits" | "withdrawals";
  const paused = String(formData.get("paused") ?? "") === "true";
  if (!MNOS.some((m) => m.id === provider)) return { ok: false, error: "Unknown provider." };
  if (kind !== "deposits" && kind !== "withdrawals") return { ok: false, error: "Invalid flow." };
  await setKillSwitch(provider, kind, paused, g.userId);
  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * Operations control-plane — set the active payment provider and demo-async at
 * runtime. Gated to ADMIN/COMPLIANCE + 2FA and audited. The LIVE-mode hard-locks
 * (no mock on real money, real provider must be configured, no demo-async on real
 * money) are enforced in `setPaymentControls`, which refuses an invalid write —
 * this action just carries the officer id and revalidates. (Settlement is no longer
 * a control here — it is timer-driven per market; see market-scheduler.ts.)
 */
export async function setPaymentControlsAction(formData: FormData): Promise<Result> {
  const g = await gate("setPaymentControls");
  if ("error" in g) return { ok: false, error: g.error };
  const updates: ControlsUpdate = {};
  const provider = formData.get("provider");
  if (typeof provider === "string" && provider) updates.provider = provider as PaymentProviderId;
  const demoAsync = formData.get("demoAsync");
  if (typeof demoAsync === "string" && demoAsync) updates.demoAsync = demoAsync === "true";
  if (Object.keys(updates).length === 0) return { ok: false, error: "No change requested." };
  const r = await setPaymentControls(updates, g.userId);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * Declare what we tell players about withdrawals.
 *
 * 🔴 This exists because an officer usually knows before the queue does. When Selcom's upstream
 * went down on 2026-07-29, the first payout had to sit for 30 minutes before it counted as
 * "stuck" and the derived signal caught up — and in that window the withdraw form still looked
 * completely normal. This lets an officer say so immediately.
 *
 * It can only make the player-facing picture WORSE, never better: `getPayoutStatus()` takes
 * `worstOf(declared, derived)`, so declaring "operational" over a stuck queue changes nothing.
 * That asymmetry is deliberate and it is guarded by `test:cert-f1` — a banner an officer can
 * force green is the same defect as the hardcoded backup tick, pointed at players.
 */
export async function setPayoutStatusAction(formData: FormData): Promise<Result> {
  const g = await gate("setPayoutStatus");
  if ("error" in g) return { ok: false, error: g.error };
  const declared = String(formData.get("declared") ?? "") as PayoutStatus;
  if (!PAYOUT_STATUSES.includes(declared)) return { ok: false, error: "Unknown payout status." };
  // An empty note means "use the localised default" — a blank string would otherwise be shown
  // to players in place of the real explanation.
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote : null;
  const r = setPayoutStatus({ declared, note }, g.userId);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath("/admin/payments");
  revalidatePath("/wallet/withdraw");
  revalidatePath("/wallet/deposit");
  return { ok: true };
}

/**
 * Test the Selcom connection WITHOUT moving money — a signed order-status probe.
 * Confirms the credentials + signature are accepted and that this server's IP is
 * on Selcom's allow-list (the call must originate from the allow-listed egress).
 * Audited; no order is created and nothing is charged.
 */
export async function testSelcomConnectionAction(): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const g = await gate("testSelcomConnection");
  if ("error" in g) return { ok: false, error: g.error };
  const env = selcomEnv();
  if (!env) return { ok: false, error: "Selcom is not configured — set PAYMENT_API_KEY / PAYMENT_API_SECRET / PAYMENT_VENDOR_ID / PAYMENT_API_URL." };
  const r = await selcomPing(env);
  audit({ category: "WALLET", action: "payments.selcom.ping", actorId: g.userId, targetType: "PaymentProvider", targetId: "selcom", payload: { reachable: r.reachable, authOk: r.authOk, httpStatus: r.httpStatus, resultcode: r.resultcode } });
  if (!r.reachable) return { ok: false, error: `Could not reach Selcom (${r.error}). If prod, this server's IP must be on Selcom's allow-list.` };
  if (!r.authOk) return { ok: false, error: `Reached Selcom but auth was rejected (HTTP ${r.httpStatus}). Check the API key/secret/vendor and that this IP is allow-listed.` };
  return { ok: true, detail: `Reached Selcom · HTTP ${r.httpStatus}${r.resultcode ? ` · code ${r.resultcode}` : ""}${r.message ? ` · ${r.message.slice(0, 90)}` : ""}` };
}

/** Retry only an authoritative failed DEPOSIT. The same helper owns bulk retry. */
export async function retryDepositAction(formData: FormData): Promise<Result> {
  const g = await gate("retryDeposit");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const r = await retryFailedDepositFromAdmin(txnId, g.userId, "single");
  revalidatePath("/admin/payments");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** Cancel & refund — close a failed money movement. */
export async function cancelRefundTxnAction(formData: FormData): Promise<Result> {
  const g = await gate("cancelRefund");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "FAILED") return { ok: false, error: "Only a FAILED transaction can be cancelled." };
  if (t.type === "DEPOSIT") {
    const closed = await withLock(`wallet:${t.userId}`, async (tx) => {
      const fresh = await db.txn.findById(txnId, tx);
      if (!fresh || fresh.userId !== t.userId || !hasDepositFinalNegative(fresh) || hasDepositStatusReview(fresh)) return false;
      const saved = await db.txn.update(txnId,
        { status: "CANCELLED", description: `${fresh.description ?? "failed"} · cancelled by operator` }, tx);
      return saved?.status === "CANCELLED";
    });
    if (!closed) return { ok: false, error: "This deposit needs payment review or has an unresolved retry. Refresh before closure." };
  } else {
    await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "failed"} · cancelled by operator` });
  }
  audit({
    category: "WALLET",
    action: "payments.cancel_refund",
    actorId: g.userId,
    targetType: "Transaction",
    targetId: txnId,
    payload: { type: t.type, amount: Math.abs(t.amount), note: t.type === "WITHDRAWAL" ? "failed withdrawal already auto-refunded at fail-time; record closed" : "verified provider-negative deposit closed" },
  });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Retry a failed WITHDRAWAL via the tested withdraw() flow; cancel the old
 *  record (A4). A failed withdrawal was auto-refunded to spendable balance at
 *  fail-time, so re-initiating debits from the restored balance — no double-pay. */
export async function retryWithdrawalAction(formData: FormData): Promise<Result> {
  const g = await gate("retryWithdrawal");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const t = await db.txn.findById(txnId);
  if (!t || t.type !== "WITHDRAWAL" || t.status !== "FAILED") return { ok: false, error: "Not a retryable failed withdrawal." };
  const { withdraw } = await import("@/lib/server/wallet-service");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // ⛔ THE 4th ARGUMENT IS THE OPERATOR, AND IT IS NOT OPTIONAL IN PRACTICE. `withdraw()`
  // records who initiated a payout; without this argument the compliance record would name
  // the PLAYER for an action an officer took. `undefined` is the idempotencyKey this path has
  // never passed.
  // ⚠️ THE ORIGINAL REASON IS DATED. It was written for 2026-08-19, when identity was NOT a
  // precondition of withdrawal (Board comment #1; docs/BOARD-DISCLOSURE-B-E.md §6.2), so this
  // path could push a payout for a never-verified account. Since 2026-09-05 — and unchanged by
  // the 2026-09-13 ruling — `withdraw()` refuses an account that was never approved
  // (`kyc-gate.ts`), for an operator retry exactly as for the player. The argument still
  // matters: an account under re-verification (approved once, not APPROVED now) IS paid, and
  // its `withdraw.unverified_payer` row must name the officer (`operatorInitiated`).
  // docs/COMPLIANCE-DECISIONS.md 2026-09-13, S10.
  const r = await withdraw(t.userId, { provider: (t.provider ?? "MPESA"), amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined } as any, undefined, g.userId);
  if (r.ok) {
    await db.txn.update(txnId, { status: "CANCELLED", description: `${t.description ?? "withdrawal failed"} · superseded by retry` });
  } else {
    // Retry refused — withdraw() created no replacement txn; the FAILED row (the
    // record that money is still owed) must stay in the retry queue. Status unchanged.
    await db.txn.update(txnId, { description: `${t.description ?? "withdrawal failed"} · retry refused: ${r.error ?? "unknown"}` });
  }
  audit({ category: "WALLET", action: "payments.retry.withdrawal", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { retried: r.ok, newStatus: r.ok ? r.data?.status : null } });
  revalidatePath("/admin/payments");
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? "Retry failed again." };
}

/** PSP reconciliation — manually MATCH an unmatched CONFIRMED money movement to a
 *  provider settlement id (A3). The ref removes it from reconcile() drift. */
export async function reconcileMatchAction(formData: FormData): Promise<Result> {
  const g = await gate("reconcileMatch");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const providerRef = String(formData.get("providerRef") ?? "").trim().slice(0, 120);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (providerRef.length < 3) return fieldError("providerRef", "Enter the provider settlement reference.");
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "CONFIRMED" || (t.type !== "DEPOSIT" && t.type !== "WITHDRAWAL")) return { ok: false, error: "Not an unmatched settled money movement." };
  if (t.providerRef) return { ok: false, error: "Already matched." };
  const matched = await db.txn.update(txnId, { providerRef });
  if (matched?.providerRef !== providerRef) return { ok: false, error: "Reference could not be saved. Check whether it is already in use, then retry." };
  audit({ category: "COMPLIANCE", action: "payments.reconcile.matched", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { providerRef, reason, type: t.type, amount: Math.abs(t.amount) } });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/**
 * RETURN A FROZEN PAYOUT — reverse a WITHDRAWAL stuck in PROCESSING and give the
 * player their money back.
 *
 * 🔴 WHY THIS EXISTS. On 2026-07-29 Selcom refused every wallet-cashin call with
 * `HTTP 403 · "API endpoint not enabled for the vendor (4035)"` — the disbursement
 * product had never been switched on for the account. The dispatch path classified
 * that HTTP error as AMBIGUOUS ("might be in flight — never blind-reverse"), which
 * is the right instinct for a timeout but wrong for a permanent refusal: a 403
 * never becomes terminal, so the stale sweep could not resolve it either. Two real
 * payouts (10,000 + 5,000 TZS) sat frozen with the player's balance held, and there
 * was NO operator action anywhere that could release them — `reconcileMatch` and
 * `reconcileWriteOff` both require `status === "CONFIRMED"`. A licensed operator
 * must always be able to give a player their own money back.
 *
 * MONEY-SAFETY — the machine check, not just the officer's word:
 * before reversing we RE-QUERY the provider, and refuse outright if it reports
 * CONFIRMED. Reversing a payout that actually settled would pay the player twice.
 * A non-terminal answer (PENDING / UNSUPPORTED / a 403 we cannot get past) is what
 * this action is FOR, so it proceeds there — that is a deliberate officer decision,
 * carrying their id, their typed reason, and a watched COMPLIANCE audit entry.
 *
 * The reversal itself goes through `settleWithdrawalFailed`, the same idempotent
 * path a genuine provider failure uses — so a race with the reconcile sweep or a
 * late callback cannot refund twice.
 */
export async function reverseStuckPayoutAction(formData: FormData): Promise<Result> {
  const g = await gate("reverseStuckPayout");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (reason.length < 10) return fieldError("reason", "A reason of at least 10 characters is required — this returns real money.");

  const t = await db.txn.findById(txnId);
  if (!t) return { ok: false, error: "Transaction not found." };
  if (t.type !== "WITHDRAWAL") return { ok: false, error: "Only a withdrawal can be reversed here." };
  if (t.status !== "PROCESSING") return { ok: false, error: `This payout is ${t.status}, not PROCESSING — nothing to release.` };

  // ── The machine check. An officer may be wrong; the provider is authoritative.
  let providerSays = "not asked (no provider reference)";
  if (t.providerRef) {
    const { verifyWithdrawalStatus } = await import("@/lib/server/payments");
    // The rail matters even here: this check is the last thing standing between an
    // officer and a double payment, and it is only as good as asking the endpoint
    // that actually holds this payout.
    const v = await verifyWithdrawalStatus(t.providerRef, t.payoutRail);
    providerSays = `${v.status}${v.detail ? `: ${v.detail}` : ""}`;
    if (v.status === "CONFIRMED") {
      audit({ category: "COMPLIANCE", action: "payments.payout_reverse_refused", actorId: g.userId, targetType: "Transaction", targetId: txnId,
        payload: { reason, providerSays, note: "REFUSED — the provider reports this payout as COMPLETED; reversing would pay the player twice." } });
      return { ok: false, error: "Refused: the provider reports this payout COMPLETED. Reversing it would pay twice." };
    }
  }

  const { settleWithdrawalFailed } = await import("@/lib/server/wallet-service");
  const done = await settleWithdrawalFailed(txnId, "officer-reversed-stuck-payout");
  if (!done) return { ok: false, error: "Could not reverse — it may have just settled. Refresh and re-check." };

  audit({ category: "COMPLIANCE", action: "payments.payout_reversed", actorId: g.userId, targetType: "Transaction", targetId: txnId,
    payload: { reason, providerSays, amount: Math.abs(t.amount), providerRef: t.providerRef, userId: t.userId } });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/transactions");
  return { ok: true };
}

/** PSP reconciliation — WRITE OFF an unmatched item with no PSP correlation
 *  (e.g. a manual/internal movement), with a mandatory reason (A3). Records a
 *  sentinel ref so it clears drift + a watched COMPLIANCE audit. No money moves. */
export async function reconcileWriteOffAction(formData: FormData): Promise<Result> {
  const g = await gate("reconcileWriteOff");
  if ("error" in g) return { ok: false, error: g.error };
  const txnId = String(formData.get("txnId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (reason.length < 5) return fieldError("reason", "A write-off reason (≥ 5 chars) is required.");
  const t = await db.txn.findById(txnId);
  if (!t || t.status !== "CONFIRMED" || (t.type !== "DEPOSIT" && t.type !== "WITHDRAWAL")) return { ok: false, error: "Not an unmatched settled money movement." };
  if (t.providerRef) return { ok: false, error: "Already matched." };
  // One officer can write off several rows; an officer-based sentinel collides
  // with the globally unique settlement-reference namespace on the second row.
  const writeOffRef = `WRITEOFF-${txnId}`;
  const writtenOff = await db.txn.update(txnId, { providerRef: writeOffRef, amlReason: reason });
  if (writtenOff?.providerRef !== writeOffRef || writtenOff.amlReason !== reason) return { ok: false, error: "Write-off could not be saved. Refresh and retry." };
  audit({ category: "COMPLIANCE", action: "payments.reconcile.written_off", actorId: g.userId, targetType: "Transaction", targetId: txnId, payload: { reason, type: t.type, amount: Math.abs(t.amount) } });
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** Bulk-retry delegates every deposit to the exact single-row safety path. Capped per run. */
export async function bulkRetryAction(): Promise<{ ok: true; retried: number; stillFailed: number } | { ok: false; error: string }> {
  const g = await gate("bulkRetry");
  if ("error" in g) return { ok: false, error: g.error };
  const failed = (await db.txn.listByStatus("FAILED")).filter((t) => t.type === "DEPOSIT" || t.type === "WITHDRAWAL").slice(0, 50);
  const { withdraw } = await import("@/lib/server/wallet-service");
  let retried = 0, stillFailed = 0;
  for (const t of failed) {
    try {
      if (t.type === "DEPOSIT") {
        const r = await retryFailedDepositFromAdmin(t.id, g.userId, "bulk");
        if (r.ok) retried++; else stillFailed++;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // 4th argument names the officer who made a withdrawal retry decision.
        const r = await withdraw(t.userId, { provider: (t.provider ?? "MPESA"), amount: Math.abs(t.amount), msisdn: t.msisdn ?? undefined } as any, undefined, g.userId);
        if (r.ok) {
          await db.txn.update(t.id, { status: "CANCELLED", description: `${t.description ?? "failed"} · superseded by bulk retry` });
          retried++;
        } else {
          await db.txn.update(t.id, { description: `${t.description ?? "failed"} · bulk retry refused: ${r.error ?? "unknown"}` });
          stillFailed++;
        }
      }
    } catch { stillFailed++; }
  }
  audit({ category: "WALLET", action: "payments.retry.bulk", actorId: g.userId, targetType: null, targetId: null, payload: { attempted: failed.length, retried, stillFailed } });
  revalidatePath("/admin/payments");
  return { ok: true, retried, stillFailed };
}
