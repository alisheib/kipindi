import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { verifySession, signSession } from "@/lib/server/crypto";
import { ConfidentialBand, AdminSidebar, AdminTopBar, type AdminSession } from "@/components/admin/admin-shell";
import { TOTP_COOKIE_NAME, TOTP_TTL_SEC } from "@/lib/server/totp-cookie";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

/**
 * Routes inside /admin/* that DON'T require an admin TOTP cookie:
 *   - /admin/totp-verify (the verify gate itself)
 *   - /admin/2fa/setup (initial provisioning, before TOTP exists)
 */
const TOTP_EXEMPT = new Set<string>([
  "/admin/totp-verify",
  "/admin/2fa/setup",
]);

/**
 * Map the URL to the active sidebar key. Keep this in sync with NAV_GROUPS
 * in `admin-shell.tsx`.
 */
function activeKeyFromPath(path: string): string {
  if (path === "/admin")                              return "overview";
  if (path.startsWith("/admin/live"))                 return "live";
  if (path.startsWith("/admin/finance"))              return "finance";
  if (path.startsWith("/admin/reports"))              return "reports";
  if (path.startsWith("/admin/players/cohorts"))      return "cohorts";
  if (path.startsWith("/admin/players"))              return "players";
  if (path.startsWith("/admin/privacy"))              return "privacy";
  if (path.startsWith("/admin/retention"))            return "retention";
  if (path.startsWith("/admin/sources"))              return "sources";
  if (path.startsWith("/admin/config"))               return "config";
  if (path.startsWith("/admin/house-pool"))           return "house-pool";
  if (path.startsWith("/admin/ai-polls"))             return "ai-polls";
  if (path.startsWith("/admin/candidates"))           return "candidates";
  if (path.startsWith("/admin/proposals"))            return "proposals";
  if (path.startsWith("/admin/markets"))              return "markets";
  if (path.startsWith("/admin/resolver-queue"))       return "resolver";
  if (path.startsWith("/admin/affiliate"))            return "affiliate";
  if (path.startsWith("/admin/moderation"))           return "moderation";
  if (path.startsWith("/admin/compliance"))           return "compliance";
  if (path.startsWith("/admin/aml"))                  return "aml";
  if (path.startsWith("/admin/self-exclusions"))      return "sx";
  if (path.startsWith("/admin/audit"))                return "audit";
  if (path.startsWith("/admin/system"))               return "system";
  if (path.startsWith("/admin/approvals"))            return "approvals";
  if (path.startsWith("/admin/2fa"))                  return "2fa";
  return "overview";
}

function crumbsFromPath(path: string): string[] {
  const parts = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return ["Admin", "Overview"];
  // Title-case + drop dynamic segments like ids
  return ["Admin", ...parts.map((p) => p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))];
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) {
    // Preserve the deep-link destination through the login gate so the
    // officer lands back on the exact page after re-authenticating.
    const h0 = await headers();
    const dest = h0.get("x-href") ?? h0.get("x-pathname") ?? "";
    const loginUrl = dest.startsWith("/admin") && !dest.startsWith("/auth")
      ? `/auth/admin?next=${encodeURIComponent(dest)}`
      : "/auth/admin";
    redirect(loginUrl as never);
  }
  const u = await db.user.findById(session.userId);
  const allowed = u && ADMIN_ROLES.has(u.role);
  if (!allowed) {
    // Wrong role (e.g. player session) — send to admin login with deep-link preserved.
    const h0 = await headers();
    const dest = h0.get("x-href") ?? h0.get("x-pathname") ?? "";
    const loginUrl = dest.startsWith("/admin") && !dest.startsWith("/auth")
      ? `/auth/admin?next=${encodeURIComponent(dest)}`
      : "/auth/admin";
    redirect(loginUrl as never);
  }

  const adminSession: AdminSession = {
    userId: session.userId,
    phoneE164: session.phoneE164,
    role: session.role,
  };

  // Read the request path from headers (set by middleware trace)
  const h = await headers();
  const path = h.get("x-pathname") ?? h.get("x-invoke-path") ?? h.get("x-url") ?? "/admin";
  // Full destination incl. query (e.g. ?tab=kyc) so the TOTP gate can return the
  // officer to the exact page after verifying — e.g. a deep link from an email.
  const href = h.get("x-href") ?? path;
  const activeKey = activeKeyFromPath(path);
  const crumbs = crumbsFromPath(path);

  // Auth-only pages (TOTP verify + 2FA setup) render as standalone pages —
  // no sidebar, no admin topbar. These are gate pages, not console pages.
  if (TOTP_EXEMPT.has(path)) {
    return <>{children}</>;
  }

  // TOTP gate — non-demo admins with TOTP enabled must verify before browsing.
  // The cookie is HMAC-signed with userId + sessionId to prevent forgery.
  // Set DISABLE_ADMIN_TOTP=true in Railway env vars to bypass the gate entirely.
  if (process.env.DISABLE_ADMIN_TOTP !== "true" && await hasTotp(session.userId)) {
    const jar = await cookies();
    const raw = jar.get(TOTP_COOKIE_NAME)?.value;
    const totpData = verifySession<{
      userId: string;
      sessionId: string;
      verifiedAt: number;
      exp: number;
    }>(raw);
    // Reject if missing, tampered, expired, or bound to a different user/session.
    if (
      !totpData ||
      totpData.userId !== session.userId ||
      totpData.sessionId !== session.sessionId
    ) {
      // Clear stale/invalid cookie so the verify page starts clean.
      try { jar.delete(TOTP_COOKIE_NAME); } catch {}
      // Preserve the deep-link destination through the TOTP gate.
      const dest = href.startsWith("/admin") && !href.startsWith("/admin/totp-verify") ? href : "";
      redirect(dest ? `/admin/totp-verify?next=${encodeURIComponent(dest)}` : "/admin/totp-verify");
    }
    // Sliding refresh: re-issue the TOTP cookie on activity so an actively
    // working admin isn't kicked back to the TOTP gate at the hard 8h mark
    // mid-shift. Mirrors the session sliding refresh; best-effort, since a
    // static/read-only render context can't write cookies (it just skips).
    try {
      const refreshed = {
        ...totpData,
        exp: Date.now() + TOTP_TTL_SEC * 1000,
      };
      jar.set(TOTP_COOKIE_NAME, signSession(refreshed), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: TOTP_TTL_SEC,
      });
    } catch { /* read-only render context — next mutable request resyncs */ }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text">
      <ConfidentialBand session={adminSession} />
      <div className="flex">
        <AdminSidebar activeKey={activeKey} />
        <main className="flex-1 min-w-0 flex flex-col">
          <AdminTopBar crumbs={crumbs} session={adminSession} activeKey={activeKey} />
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}
