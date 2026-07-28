import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasTotp } from "@/lib/server/totp";
import { verifySession, signSession } from "@/lib/server/crypto";
import { ConfidentialBand, AdminSidebar, AdminTopBar, type AdminSession } from "@/components/admin/admin-shell";
import { TOTP_COOKIE_NAME, TOTP_TTL_SEC } from "@/lib/server/totp-cookie";
import { isStaffRole, isAdmin, isOwnerOnlyPath, domainForPath, DOMAIN_LABEL } from "@/lib/server/roles";
import { canView, viewableDomains } from "@/lib/server/rbac";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { activeKeyFromPath } from "@/components/admin/admin-nav-groups";

/**
 * RBAC VIEW gate (2026-07-28). Console admission below admits any STAFF role; this
 * gate then decides, per route, whether the viewer's ROLE may SEE it — driven by the
 * data-backed grant matrix (roleGrants), not hardcoded tiers. Every /admin/** route
 * maps to exactly one AdminDomain (domainForPath); `canView(role, domain)` consults
 * the role's grants (ADMIN/Owner bypasses → sees all). Rendering <AdminRestricted>
 * instead of `children` means the page subtree AND its server data-fetch never run,
 * so a role never receives data for a domain it can't view. `/admin/staff` and
 * `/admin/roles` are Owner-only (isOwnerOnlyPath), checked ahead of the domain gate.
 * This is the ROUTE layer of the three-layer gate; it MUST agree with the nav filter
 * (filterNavGroups) and the action guard (requireStaff) — all keyed off the same domains.
 */

/**
 * Routes inside /admin/* that DON'T require an admin TOTP cookie:
 *   - /admin/totp-verify (the verify gate itself)
 *   - /admin/2fa/setup (initial provisioning, before TOTP exists)
 */
const TOTP_EXEMPT = new Set<string>([
  "/admin/totp-verify",
  "/admin/2fa/setup",
]);

// The route→nav-key resolver (`activeKeyFromPath`) lives WITH `NAV_GROUPS` in
// admin-nav-groups.ts. It used to be copy-pasted here AND in admin-sidebar-nav.tsx,
// and the two had already drifted — the sidebar copy was missing /admin/payments,
// /admin/kyc and the /admin/resolver detail route, so those pages highlighted
// nothing. One definition now, guarded by `npm run test:admin-nav`.

/** Segments whose title-cased form is wrong or unreadable. Title-casing turns
 *  "updown" into "Updown", which is not the product's name — the game is "Up & Down"
 *  everywhere it is written. Add a segment here rather than accepting a mangled crumb. */
const CRUMB_LABELS: Record<string, string> = {
  updown: "Up & Down",
  aml: "AML",
  kyc: "KYC",
  "ai-polls": "AI polls",
  "ai-usage": "AI usage",
  "2fa": "2FA",
  dsar: "DSAR",
};

function crumbsFromPath(path: string): string[] {
  const parts = path.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return ["Admin", "Overview"];
  // Title-case + drop dynamic segments like ids
  return ["Admin", ...parts.map((p) =>
    CRUMB_LABELS[p] ?? p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))];
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
  const allowed = u && isStaffRole(u.role);
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

  // TOTP gate — the cookie is HMAC-signed with userId + sessionId to prevent
  // forgery. Set DISABLE_ADMIN_TOTP=true in Railway env vars to bypass entirely.
  if (process.env.DISABLE_ADMIN_TOTP !== "true") {
    // B2: force enrollment — an admin with no TOTP secret must set one up before
    // operating the console (the setup page is TOTP_EXEMPT above, so no loop).
    // Previously a not-yet-enrolled admin ran password-only.
    if (!(await hasTotp(session.userId))) {
      redirect("/admin/2fa/setup");
    }
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

  // RBAC VIEW gate — Owner-only surfaces first, then the route's domain. Uses the
  // live DB role (u.role), the authoritative source. AdminRestricted replaces the
  // subtree so gated data never renders nor fetches.
  const viewerRole = u!.role;
  const ownerOnly = isOwnerOnlyPath(path);
  const domain = domainForPath(path);
  const viewBlocked = ownerOnly ? !isAdmin(viewerRole) : !(await canView(viewerRole, domain));
  const need = ownerOnly ? "Owner (ADMIN) only" : `${DOMAIN_LABEL[domain]} access`;
  const viewDomains = Array.from(await viewableDomains(viewerRole));
  const isOwner = isAdmin(viewerRole);

  return (
    <div className="min-h-screen bg-bg-base text-text">
      <ConfidentialBand session={adminSession} />
      <div className="flex">
        <AdminSidebar activeKey={activeKey} viewDomains={viewDomains} isOwner={isOwner} />
        <main className="flex-1 min-w-0 flex flex-col">
          <AdminTopBar crumbs={crumbs} session={adminSession} activeKey={activeKey} viewDomains={viewDomains} isOwner={isOwner} />
          {/* DESIGN_AUTHORITY B7 — the console measure.
              This div had NO max-width, so all 43 admin pages rendered at
              100vw-216px: 1,704px at 1920 and 2,344px at 2560, while the player
              chrome above them was capped at 1280. Every `w-full` field inherited
              that width, which is why a single-column form like /admin/markets/new
              had ~1,650px-wide text boxes.

              The cap goes on the CONTENT COLUMN, not the shell: `mx-auto` centres
              it while the sidebar stays flush against the left edge, which is what
              a dashboard should do. Boxing the whole shell would float the sidebar
              into the middle of a wide monitor.

              `data-measure` is what lets scripts/responsive-audit.mjs assert the
              upper bound at runtime — see `npm run test:measure`. */}
          <div className="flex-1 mx-auto w-full max-w-console" data-measure="console">
            {viewBlocked
              ? <AdminRestricted title={crumbs[crumbs.length - 1] ?? "Restricted"} need={need} />
              : children}
          </div>
        </main>
      </div>
    </div>
  );
}
