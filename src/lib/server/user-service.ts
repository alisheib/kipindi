/**
 * Player self-service: account closure, data export, activity history.
 *
 * Compliance:
 *  - GDPR Art 15 (right of access) — `exportUserData` returns a structured copy
 *    of every record about the user.
 *  - GDPR Art 17 (right to erasure / be forgotten) — `closeAccount` flips status,
 *    freezes wallet, optionally redacts PII after the AML retention window.
 *  - Tanzania Personal Data Protection Act 2022 — same shape, same controls.
 *  - AML retention overrides: financial + KYC records persist for 7 years even
 *    after closure (handled in production by a scheduled redaction job).
 */
import { audit, getAuditForActorDurable, type AuditEntry } from "./audit";
import { db } from "./store";
import { dsarUserView } from "./privacy";
import { destroySession } from "./session";
import { revokeUserSessions } from "./session-registry";
import { sendEmailToUser, accountClosedHtml } from "./email";
import { notify } from "./notification-service";
import { displayLabel } from "@/lib/display-label";
import type { ServiceResult } from "./auth-service";

export type UserDataExport = {
  generatedAt: string;
  /** Projected through `dsarUserView` — never the raw row. See exportUserData. */
  user: ReturnType<typeof dsarUserView> | null;
  kyc: ReturnType<typeof db.kyc.findByUserId>;
  wallet: ReturnType<typeof db.wallet.findByUserId>;
  responsibleGambling: ReturnType<typeof db.responsible.get>;
  transactions: ReturnType<typeof db.txn.findByUser>;
  auditEntries: AuditEntry[];
};

/**
 * GDPR Art 15 — return a structured snapshot of all data we hold on this user.
 *
 * 🔴 `user` GOES THROUGH `dsarUserView`, NEVER STRAIGHT OUT OF THE DAL. This used to be
 * `user: await db.user.findById(userId)` — the whole row — so the JSON a player downloads
 * from /profile/account carried their own scrypt `passwordHash` and `passwordSalt`
 * (measured 2026-08-20, both values present in the file). The officer-side bundle in
 * privacy.ts had always field-picked correctly; only this door was wrong, which is exactly
 * why the projection now lives in ONE place that both doors call. See dsarUserView's own
 * comment for why it is an allowlist and must stay one.
 */
export async function exportUserData(userId: string) {
  const user = await db.user.findById(userId);
  return {
    generatedAt: new Date().toISOString(),
    user: user ? dsarUserView(user) : null,
    kyc: await db.kyc.findByUserId(userId),
    wallet: await db.wallet.findByUserId(userId),
    responsibleGambling: await db.responsible.get(userId),
    transactions: await db.txn.findByUser(userId, 1000),
    /**
     * 🔴 THIS READ WAS THE RING, ON THE GDPR ART. 15 DOOR. The file a player downloads to
     * exercise a statutory right of access contained only whatever of their events happened to
     * survive inside a 10,000-row GLOBAL sliding window on whichever container answered — and
     * empty after a deploy. ⛔ `audit.ts:494-508` records this EXACT defect against the ISO 27001
     * export ("described itself as 'genesis → now' … returned at most 10,000 rows from one
     * container") and repaired it there with `getAuditPageDurable`; the player-facing door was
     * left behind.
     *
     * ⚠️ `truncated` AND `total` ARE IN THE ARTIFACT, not discarded. A 1,000-row cap on a right-of-
     * access export is defensible; a capped export that does not say it is capped is not — the
     * recipient cannot tell an empty history from a withheld one.
     */
    auditEntries: await getAuditForActorDurable(userId, { limit: 1000 }),
  };
}

/**
 * Self-initiated account closure. One-way until manually reopened by support.
 *
 * - Account status → CLOSED, closedAt set.
 * - Wallet status → CLOSED (no further deposits/withdrawals/bets).
 * - Active bets remain in place to settle out (compliance: cannot void existing
 *   stakes unilaterally; payouts must complete or refund per the operating rules).
 * - Session destroyed.
 * - Marketing opt-in cleared.
 *
 * The user can re-register (different account) but the closed userId is retained
 * for AML/audit traceability for 7 years.
 */
export async function closeAccount(userId: string, reason?: string): Promise<ServiceResult<{ closedAt: string }>> {
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND" };
  if (user.status === "CLOSED") return { ok: true, data: { closedAt: user.closedAt ?? user.updatedAt } };

  const closedAt = new Date().toISOString();
  await db.user.update(userId, {
    status: "CLOSED",
    closedAt,
    marketingOptIn: false,
  });
  const wallet = await db.wallet.findByUserId(userId);
  if (wallet && wallet.status !== "CLOSED") {
    await db.wallet.update(wallet.id, { status: "CLOSED" });
  }

  // Closure confirmation — dual-channel (email + in-app), best-effort. Sent
  // before the session is destroyed; both swallow their own errors so a mail
  // hiccup can never block the closure. The userId remains valid for the inbox.
  await sendEmailToUser(userId, (email) => ({
    to: email,
    subject: "Your 50pick account is closed",
    html: accountClosedHtml({ name: displayLabel(user), time: new Date(closedAt).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" }) }),
    tag: "account-closed",
    trackLinks: false,
  }));
  await notify({
    userId,
    kind: "SECURITY",
    titleEn: "Account closed",
    titleSw: "Akaunti imefungwa",
    bodyEn: "Your 50pick account has been closed as requested. If this wasn't you, contact support immediately.",
    bodySw: "Akaunti yako ya 50pick imefungwa kama ulivyoomba. Kama si wewe, wasiliana na usaidizi.",
    href: null,
  });

  await destroySession();
  await revokeUserSessions(userId); // kill any session on any device, not just this one

  audit({
    category: "COMPLIANCE",
    action: "user.account.closed",
    actorId: userId,
    targetType: "User",
    targetId: userId,
    payload: { reason: reason ?? null },
  });

  return { ok: true, data: { closedAt } };
}

/**
 * A user's own activity feed — what they themselves have done.
 *
 * 🔴 IT WAS THE RING, AND `audit.ts` HAD ALREADY RULED THAT OUT FOR THIS SHAPE. `getAuditForActor`
 * reads a 10,000-row, GLOBAL, per-container sliding window that empties on every deploy; that
 * file's own note on `getAuditForTargetDurable` says a "who did what, when" panel served from it
 * *"would show a full history on a warm instance and an empty one an hour later, which is worse
 * than showing nothing."* This feed is that panel — and `getAuditForActor`'s doc line names it as
 * the caller, so the file argued against itself.
 *
 * ⛔ THE PLAYER QUERY CAMPAIGN IS WHAT FORCED IT (task 4.6). `/profile/account` now renders a
 * cross-filtered COUNT on every category pill. Over the ring those counts are an accident of
 * uptime — `WALLET 40` on a warm container, `WALLET 3` after a restart, same player, same minute —
 * and a busy hour evicts a quiet player's history entirely because the cap is platform-wide.
 *
 * ⚠️ NOW ASYNC, AND THAT IS THE VISIBLE COST. One indexed read on `@@index([actorId, createdAt])`
 * replaces a full scan of a 10,000-element in-memory array per request, so the page should end up
 * faster — the same argument task 2.3 made for `titlesByIds`. ⛔ Measure it rather than trust it:
 * `AuditLog` is the largest table in the product.
 *
 * ⚠️ `total` AND `truncated` ARE RETURNED AND THE CALLER MUST RENDER THEM. A history that quietly
 * stops at `limit` reads as a complete one — the silent-truncation failure this repo has now been
 * bitten by on the Decided table, the ISO export and `/updown/history`.
 */
export async function getOwnActivity(
  userId: string,
  limit = 100,
): Promise<{ entries: AuditEntry[]; total: number; truncated: boolean }> {
  return getAuditForActorDurable(userId, { limit });
}
