import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { ConfidentialBand, AdminSidebar, AdminTopBar, type AdminSession } from "@/components/admin/admin-shell";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);
const TOTP_COOKIE = "kp_admin_totp";
const TOTP_TTL_SEC = 60 * 60 * 8; // 8h — must match totp-verify/actions.ts

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
  if (!session) redirect("/auth/admin");
  const u = db.user.findById(session.userId);
  const allowed = u && ADMIN_ROLES.has(u.role);
  if (!allowed) redirect("/auth/admin");

  const adminSession: AdminSession = {
    userId: session.userId,
    phoneE164: session.phoneE164,
    role: session.role,
  };

  // Read the request path from headers (set by middleware trace)
  const h = await headers();
  const path = h.get("x-pathname") ?? h.get("x-invoke-path") ?? h.get("x-url") ?? "/admin";
  const activeKey = activeKeyFromPath(path);
  const crumbs = crumbsFromPath(path);

  // TOTP gate — non-demo admins with TOTP enabled must verify before browsing
  if (hasTotp(session.userId) && !TOTP_EXEMPT.has(path)) {
    const jar = await cookies();
    if (!jar.get(TOTP_COOKIE)) {
      redirect("/admin/totp-verify");
    }
    // Sliding refresh: re-issue the TOTP cookie on activity so an actively
    // working admin isn't kicked back to the TOTP gate at the hard 8h mark
    // mid-shift. Mirrors the session sliding refresh; best-effort, since a
    // static/read-only render context can't write cookies (it just skips).
    try {
      jar.set(TOTP_COOKIE, "1", {
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
