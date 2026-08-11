/**
 * RBAC action guards — the server-action gate layer. Kept separate from the grant
 * loader (`rbac.ts`) so the loader stays unit-testable with no Next runtime; these
 * pull in the session + step-up-2FA + audit deps.
 *
 * `requireStaff(domain)` REPLACES the per-file `ensureAdmin()`/`requireAdmin()` copied
 * across every admin `actions.ts`. `requireOwner()` gates the two Owner-only surfaces
 * (staff-role assignment + the grant matrix), which are never routed through the grant
 * table (ADMIN hardcoded) so the Owner can't be locked out and no role can self-grant.
 */
import { redirect } from "next/navigation";
import { currentSession } from "./auth-service";
import { db } from "./store";
import { audit } from "./audit";
import { requireAdminTotp } from "./admin-guard";
import { canAct } from "./rbac";
import type { SessionData } from "./session";
import type { AdminDomain, Role } from "./roles";

/**
 * The single shared ACTION guard — replaces the per-file `ensureAdmin()`/`requireAdmin()`.
 * session → live DB role → ADMIN passes → else `canAct(role, domain)` → else SECURITY
 * audit + throw → step-up 2FA. Returns the officer's SESSION (so call sites keep using
 * `.userId` / `.sessionId` exactly as before). `action` (optional) is recorded on a
 * blocked attempt for traceability.
 */
export async function requireStaff(domain: AdminDomain, action?: string): Promise<SessionData> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const me = await db.user.findById(session.userId);
  if (!me) redirect("/auth/admin");
  if (me.role !== "ADMIN") {
    const allowed = await canAct(me.role as Role, domain);
    if (!allowed) {
      audit({
        category: "SECURITY",
        action: "privilege_escalation_blocked",
        actorId: session.userId,
        targetType: "Action",
        targetId: action ?? domain,
        payload: { role: me.role, domain, action: action ?? null },
      });
      throw new Error("Forbidden: your role cannot perform this action.");
    }
  }
  await requireAdminTotp(session.userId, session.sessionId); // step-up 2FA at the action layer
  return session;
}

/**
 * The SOFT form of `requireStaff` — for surfaces that RETURN `{ ok: false, error }`
 * instead of throwing, because their controls render the message inline.
 *
 * ⛔ WHY THIS EXISTS (finding A2, 2026-08-11). Four admin surfaces had hand-rolled this
 * same gate — `payments/payment-actions.ts` `gate()`, `kyc/[id]/kyc-actions.ts` `gate()`,
 * `reports/pack-actions.ts` `requireSigningOfficer()` and `privacy/actions.ts`
 * `requireOfficer()` — and **the four copies had drifted in two different ways**:
 *
 *   · **privacy did not AUDIT its refusal.** Every other gate in this codebase writes
 *     `privilege_escalation_blocked` at SECURITY severity; privacy returned
 *     *"Not authorised."* and recorded nothing. Driven and measured: a role without
 *     `compliance` canAct clicked Export bundle and the counter went 0 → 0. ⭐ That is the
 *     PDPA surface — a data-subject export is exactly the attempt a regulator expects to
 *     find recorded, successful or not.
 *   · **reports did not take STEP-UP 2FA.** `requireAdminTotp` is the second factor at the
 *     action layer; the report-pack signing ceremony skipped it while payments and KYC
 *     took it.
 *
 * ⭐ Neither drift is visible from any one file — you only see it by putting the four side
 * by side, which is the argument for there being one. The call sites keep their own thin
 * wrapper so their local error wording survives; what they must not keep is their own copy
 * of the DECISION.
 *
 * Returns the officer's session on success. Redirects (rather than soft-refusing) when
 * there is no session at all, exactly like `requireStaff` — a signed-out visitor needs the
 * login page, not an inline message they cannot act on.
 */
export async function softRequireStaff(
  domain: AdminDomain,
  action: string,
  refusal: string,
): Promise<{ ok: true; userId: string; sessionId: string } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const me = await db.user.findById(session.userId);
  if (!me) redirect("/auth/admin");
  if (me.role !== "ADMIN" && !(await canAct(me.role as Role, domain))) {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me.role, domain, action },
    });
    return { ok: false, error: refusal };
  }
  await requireAdminTotp(session.userId, session.sessionId); // step-up 2FA, as requireStaff does
  return { ok: true, userId: session.userId, sessionId: session.sessionId };
}

/**
 * Owner-only ACTION guard — for staff-role assignment + grant-matrix edits. Returns
 * the Owner's session. Never routed through the grant table (ADMIN hardcoded).
 */
export async function requireOwner(action: string): Promise<SessionData> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const me = await db.user.findById(session.userId);
  if (!me || me.role !== "ADMIN") {
    audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: session.userId,
      targetType: "Action",
      targetId: action,
      payload: { role: me?.role ?? "unknown", ownerOnly: true },
    });
    throw new Error("Forbidden: Owner (ADMIN) only.");
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return session;
}
