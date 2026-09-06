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
import { canAct, canView } from "./rbac";
import type { OperatorRefusal } from "../operator-refusal";
import type { SessionData } from "./session";
import { ADMIN_DOMAINS, type AdminDomain, type Role } from "./roles";

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
 * Strip a refusal's remedy link when THIS viewer cannot open it.
 *
 * 🔴 THE DEFECT THIS CLOSES, found by an adversarial audit and confirmed against the grant
 * matrix. `/admin/ai-polls` is the **trading** domain; `/admin/ai-usage` is **ops**. `MODERATOR`
 * — the role that actually operates poll generation — is granted `overview` and `trading` only,
 * and `defaultGrant` returns `{canView:false}` for any unlisted pair. So a moderator hit the AI
 * spend cap, and the refusal handed them a button to a page they cannot open. Worse: the console
 * gives the remedy the single secondary slot AHEAD of "Try again", so they lost the retry too and
 * were left with a dead link and no way forward — a more complete dead end than the sentence this
 * whole seam replaced.
 *
 * ⛔ IT IS RESOLVED IN THE ACTION LAYER, NOT IN `ai-usage.ts`. The refusal is built where the
 * BLOCK is known; only the action knows WHO asked. Teaching the emitter about roles would put an
 * RBAC lookup behind every budget gate, including the Market Sentinel's, which has no viewer.
 *
 * ⭐ THE FIX IS DROPPED, NOT REWRITTEN. A refusal with no `fix` still renders its title, its
 * figures and its `escalate` line — which names who can lift it — so the operator is told the
 * truth rather than handed a door that will not open.
 */
export async function scopeRefusalToViewer(
  refusal: OperatorRefusal | undefined,
  userId: string,
): Promise<OperatorRefusal | undefined> {
  if (!refusal?.fix?.domain) return refusal;
  try {
    const me = await db.user.findById(userId);
    if (!me) return { ...refusal, fix: undefined };
    if (me.role === "ADMIN") return refusal;
    const allowed = await canView(me.role as Role, refusal.fix.domain as AdminDomain);
    return allowed ? refusal : { ...refusal, fix: undefined };
  } catch {
    // ⛔ FAIL TOWARDS THE TRUTHFUL CARD. If the grant lookup breaks we cannot promise the link
    // works, and showing a dead button is worse than showing none: the escalate line still tells
    // them who to ask. Never fail towards "show the link anyway".
    return { ...refusal, fix: undefined };
  }
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
 * THE CONSOLE guard — for a cross-route action that no single DOMAIN can describe.
 *
 * 🔴 WHY IT EXISTS, AND IT IS A LIVE DEFECT, NOT A REFACTOR (2026-09-06).
 * `revealSensitiveAction` opened with `requireStaff("support")`, which resolves to
 * `canAct(role, "support")`. `DEFAULT_GRANTS.COMPLIANCE` holds `support: { canView: true,
 * canAct: FALSE }` — so a COMPLIANCE officer was refused on EVERY reveal, on every surface,
 * including `/admin/players/[id]` itself. Since ADMIN and COMPLIANCE are the only roles holding
 * `identity.contact: read`, and ADMIN bypasses the domain check, **ADMIN was the only actor for
 * whom the READ axis had ever worked** — while `test:read-tiers` 2.8 asserted at the matrix
 * level that "COMPLIANCE may". A green guard over a broken product.
 *
 * Two further harms, both quiet:
 *   · `requireStaff` THROWS. The reveal control reads `{ ok: false, error }` and renders the
 *     message; a thrown error rejects the transition instead, so the officer saw nothing at all.
 *   · It wrote a SECURITY `privilege_escalation_blocked` row for an officer doing their job,
 *     into the one log a regulator reads after an incident.
 *
 * ⛔ THE FIX IS THE AXIS, NOT THE SEVERITY. A reveal is reachable from wherever `<Sensitive>`
 * renders — support, compliance, trading and accounting routes — so pinning it to ONE domain is
 * a category error, and taking the domain from the CALLER would be client-supplied and therefore
 * forgeable. What this guard asserts is console staff-ness: a real session, a role that can see
 * SOME part of the console, and step-up 2FA. The actual seal on a reveal is `mayReveal`, checked
 * by the caller against the same matrix the UI consulted — so the absent button and the refused
 * request stay one rule rather than two that can drift.
 *
 * ⛔ IT MUST NOT AUDIT ESCALATION FOR A MISSING READ CELL. Being refused a reveal is an ORDINARY
 * outcome of the matrix — that refusal belongs to `mayReveal` and names the class. Logging it as
 * attempted escalation would fill the SECURITY log with COMPLIANCE doing exactly as designed,
 * which is how a real signal gets buried.
 */
export async function softRequireConsole(
  action: string,
  refusal: string,
): Promise<{ ok: true; userId: string; sessionId: string; role: Role } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const me = await db.user.findById(session.userId);
  if (!me) redirect("/auth/admin");
  const role = me.role as Role;

  if (role !== "ADMIN") {
    // Reaching the console at all — ANY domain this role can view. A role with none is not a
    // console user, and `defaultGrant` returns canView:false for every unlisted pair, so a
    // PLAYER or AGENT forging this request fails here.
    const seen = await Promise.all(ADMIN_DOMAINS.map((d) => canView(role, d)));
    if (!seen.some(Boolean)) {
      audit({
        category: "SECURITY",
        action: "privilege_escalation_blocked",
        actorId: session.userId,
        targetType: "Action",
        targetId: action,
        payload: { role, domain: "console", action },
      });
      return { ok: false, error: refusal };
    }
  }
  await requireAdminTotp(session.userId, session.sessionId); // step-up 2FA, as every action guard takes
  return { ok: true, userId: session.userId, sessionId: session.sessionId, role };
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
