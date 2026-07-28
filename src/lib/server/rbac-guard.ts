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
