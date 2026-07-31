import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasTotp } from "./totp";
import { verifySession } from "./crypto";
import { TOTP_COOKIE_NAME } from "./totp-cookie";

/**
 * Step-up 2FA gate for sensitive admin SERVER ACTIONS / route handlers.
 *
 * The admin layout enforces TOTP on page *render*, but Server Actions and API
 * routes bypass the layout — a direct POST to an action would otherwise skip 2FA
 * entirely (audit finding B3). Call this inside money / compliance / config /
 * credential actions so a valid TOTP cookie is REQUIRED at the action layer too.
 *
 * Throws NEXT_REDIRECT when 2FA isn't satisfied:
 *   - not enrolled            → /admin/2fa/setup
 *   - missing/invalid/expired → /admin/totp-verify
 * Bound to userId+sessionId, so it can't be replayed across logins. No-op when
 * DISABLE_ADMIN_TOTP=true (matches the layout bypass switch).
 */
export type AdminTotpStatus = "ok" | "not-enrolled" | "unverified";

/**
 * Non-throwing TOTP step-up check. Returns the status instead of redirecting, so
 * API route handlers (which stream images / downloads, where a NEXT_REDIRECT
 * would corrupt the response) can map it to a 403. `requireAdminTotp` wraps this
 * for the Server-Action / page path where a redirect is the right UX.
 */
/**
 * Is admin 2FA actually being enforced right now?
 *
 * 🔴 The ONE place this question is answered, so `/api/health`, the boot checks and the guard
 * cannot disagree. Until 2026-07-31 `DISABLE_ADMIN_TOTP=true` was set in production and **nothing
 * anywhere said so** — not health, not the boot checks, not `/admin/system`. An admin console that
 * is password-only while looking exactly like one that is not is the same defect as the compliance
 * card that showed a hardcoded green tick for backups that did not exist.
 *
 * Deliberately a read, not an enforcement change: flipping the env var blind would lock the owner
 * out of his own console if no admin has enrolled. Making the state visible is the safe half, and
 * it is the half that was missing.
 */
export function isAdminTotpEnforced(): boolean {
  return process.env.DISABLE_ADMIN_TOTP !== "true";
}

export async function checkAdminTotp(userId: string, sessionId: string): Promise<AdminTotpStatus> {
  if (!isAdminTotpEnforced()) return "ok";
  if (!(await hasTotp(userId))) return "not-enrolled";
  const jar = await cookies();
  const raw = jar.get(TOTP_COOKIE_NAME)?.value;
  const data = verifySession<{ userId: string; sessionId: string; verifiedAt: number; exp: number }>(raw);
  if (!data || data.userId !== userId || data.sessionId !== sessionId) return "unverified";
  return "ok";
}

export async function requireAdminTotp(userId: string, sessionId: string): Promise<void> {
  const status = await checkAdminTotp(userId, sessionId);
  if (status === "not-enrolled") redirect("/admin/2fa/setup");
  if (status === "unverified") redirect("/admin/totp-verify");
}
