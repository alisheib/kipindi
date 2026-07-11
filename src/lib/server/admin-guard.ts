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
export async function checkAdminTotp(userId: string, sessionId: string): Promise<AdminTotpStatus> {
  if (process.env.DISABLE_ADMIN_TOTP === "true") return "ok";
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
