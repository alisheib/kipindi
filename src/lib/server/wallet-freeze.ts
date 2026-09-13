/**
 * THE WALLET FREEZE — the only writer of `Wallet.status = FROZEN` and of `Wallet.freezeReasons`.
 *
 * ⭐ WHAT A FREEZE IS. `wallet.status !== "ACTIVE"` already refuses at `wallet-service.deposit()`,
 * inside `withdraw()`'s lock, and in `creditBonus`; the bet path refuses a frozen wallet too. It
 * stops money moving in both directions and it is not an identity gate — it is an account control.
 *
 * ⭐ WHY A REASON SET, NOT A FLAG (2026-09-13). Until then self-exclusion was the only writer of
 * FROZEN, and the officer's "reopen a served self-exclusion" set the wallet straight back to
 * ACTIVE. From 2026-09-13 two more holds exist — a FINAL identity refusal (`kyc-service.ts`) and an
 * officer's own freeze (docs/COMPLIANCE-DECISIONS.md 2026-09-13, ruling 6: re-verification no longer
 * blocks money, so the officer needs a lever that does) — and a flag cannot say which of three
 * independent decisions is still standing. So every writer ADDS its own reason, every lifter
 * REMOVES only its own, and the wallet is ACTIVE again only when none remain.
 *
 * ⛔ WHAT THIS MUST NEVER DO:
 *   · re-open a CLOSED wallet — closure is terminal and ignores freezes entirely;
 *   · lift a reason it was not asked to lift — "unfreeze" is never "clear the column";
 *   · touch a balance. A freeze moves no money; what happens to a refused player's balance is an
 *     officer's recorded decision in `refused-funds.ts`.
 *
 * ⚠️ SERIALISED ON `wallet:<userId>`, the same key `withdraw()` holds while it places a hold, so a
 * freeze cannot interleave with a payout already inside its locked phase. The write takes no `tx`:
 * nothing else in this lock writes the row first, so there is no uncommitted row to block on.
 */
import { db } from "./store";
import { audit } from "./audit";
import { withLock } from "./locks";
import {
  currentFreezeReasons,
  statusForFreezeReasons,
  FREEZE_REASON_LABEL,
  type WalletFreezeReason,
} from "@/lib/wallet-freeze-reasons";

type WalletStatus = "ACTIVE" | "FROZEN" | "CLOSED";

export type FreezeOutcome =
  | { ok: true; changed: boolean; status: WalletStatus; reasons: WalletFreezeReason[] }
  | { ok: false; error: string; code: "NOT_FOUND" | "INVALID" };

type FreezeMeta = {
  /** Who pulled the lever. `null` only for a system actor. */
  actorId: string | null;
  /** The human reason, where there is one (an officer's words, a self-exclusion period). */
  note?: string | null;
  /** Anything that joins this row to the decision that caused it (a KYC id, a refusal code). */
  ref?: Record<string, unknown>;
};

async function applyFreeze(userId: string, reason: WalletFreezeReason, add: boolean, meta: FreezeMeta): Promise<FreezeOutcome> {
  return withLock(`wallet:${userId}`, async (): Promise<FreezeOutcome> => {
    const w = await db.wallet.findByUserId(userId);
    if (!w) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
    const before = currentFreezeReasons(w);
    const has = before.includes(reason);
    // Idempotent in both directions: adding a hold that stands, or lifting one that does not,
    // changes nothing and writes nothing. A double click must not produce a second audit row.
    if (add === has) return { ok: true, changed: false, status: w.status, reasons: before };

    const after = add ? [...before, reason] : before.filter((r) => r !== reason);
    const status = statusForFreezeReasons(w.status, after);
    const updated = await db.wallet.update(w.id, { status, freezeReasons: after });
    if (!updated) return { ok: false, error: "The wallet could not be updated.", code: "INVALID" };

    // ⛔ AWAITED. A freeze is a compliance act; its record must not be a fire-and-forget.
    await audit({
      category: "COMPLIANCE",
      action: add ? "wallet.freeze_added" : "wallet.freeze_removed",
      actorId: meta.actorId,
      targetType: "User",
      targetId: userId,
      payload: {
        reason,
        reasonLabel: FREEZE_REASON_LABEL[reason],
        note: meta.note ?? null,
        statusBefore: w.status,
        statusAfter: status,
        reasonsBefore: before,
        reasonsAfter: after,
        ...(meta.ref ?? {}),
      },
    });
    return { ok: true, changed: true, status, reasons: after };
  });
}

/** Add one hold. The wallet becomes FROZEN (unless CLOSED). */
export function addWalletFreeze(userId: string, reason: WalletFreezeReason, meta: FreezeMeta): Promise<FreezeOutcome> {
  return applyFreeze(userId, reason, true, meta);
}

/** Lift one hold. The wallet becomes ACTIVE only if no other hold remains. */
export function removeWalletFreeze(userId: string, reason: WalletFreezeReason, meta: FreezeMeta): Promise<FreezeOutcome> {
  return applyFreeze(userId, reason, false, meta);
}

/** The officer's written reason must be at least this long — the same floor as force-reverify. */
export const OFFICER_FREEZE_REASON_MIN = 5;

function officerGuard(officerId: string, userId: string, reason: string): { ok: true; clean: string } | { ok: false; error: string } {
  if (!userId) return { ok: false, error: "Missing player." };
  if (officerId === userId) return { ok: false, error: "You cannot freeze or unfreeze your own wallet." };
  const clean = (reason ?? "").trim().slice(0, 300);
  if (clean.length < OFFICER_FREEZE_REASON_MIN) return { ok: false, error: `A reason (at least ${OFFICER_FREEZE_REASON_MIN} characters) is required.` };
  return { ok: true, clean };
}

/**
 * An officer stops this account's money moving — deposits, bets and withdrawals alike.
 *
 * ⭐ This is the lever ruling 6 (2026-09-13) hands the officer in place of re-verification, which
 * no longer blocks anything. It is offered on the re-verify control itself, so an officer with a
 * doubt reaches for the lever that works.
 */
export async function freezeWalletByOfficer(officerId: string, userId: string, reason: string): Promise<FreezeOutcome> {
  const g = officerGuard(officerId, userId, reason);
  if (!g.ok) {
    if (officerId === userId) audit({ category: "SECURITY", action: "wallet.freeze.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: g.error, code: "INVALID" };
  }
  return addWalletFreeze(userId, "OFFICER", { actorId: officerId, note: g.clean });
}

/**
 * An officer lifts THEIR OWN kind of hold. ⛔ It cannot lift a self-exclusion (that is re-opened on
 * its own control, which checks the minimum period) and it cannot lift a final identity refusal
 * (that is re-opened on the identity case, which resets the verification). The refusal names which
 * holds remain, so the officer is never left guessing why the wallet is still frozen.
 */
export async function unfreezeWalletByOfficer(officerId: string, userId: string, reason: string): Promise<FreezeOutcome> {
  const g = officerGuard(officerId, userId, reason);
  if (!g.ok) {
    if (officerId === userId) audit({ category: "SECURITY", action: "wallet.freeze.self_blocked", actorId: officerId, targetType: "User", targetId: userId });
    return { ok: false, error: g.error, code: "INVALID" };
  }
  const w = await db.wallet.findByUserId(userId);
  if (!w) return { ok: false, error: "Wallet not found.", code: "NOT_FOUND" };
  const reasons = currentFreezeReasons(w);
  if (!reasons.includes("OFFICER")) {
    const others = reasons.map((r) => FREEZE_REASON_LABEL[r]).join(", ");
    return {
      ok: false,
      code: "INVALID",
      error: others
        ? `This wallet has no officer freeze to lift. It is held for: ${others}.`
        : "This wallet is not frozen.",
    };
  }
  return removeWalletFreeze(userId, "OFFICER", { actorId: officerId, note: g.clean });
}
