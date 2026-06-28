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
export async function requireAdminTotp(userId: string, sessionId: string): Promise<void> {
  if (process.env.DISABLE_ADMIN_TOTP === "true") return;
  if (!(await hasTotp(userId))) redirect("/admin/2fa/setup");
  const jar = await cookies();
  const raw = jar.get(TOTP_COOKIE_NAME)?.value;
  const data = verifySession<{ userId: string; sessionId: string; verifiedAt: number; exp: number }>(raw);
  if (!data || data.userId !== userId || data.sessionId !== sessionId) {
    redirect("/admin/totp-verify");
  }
}
