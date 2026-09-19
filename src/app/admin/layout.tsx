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
import { isStaffRole, isAdmin } from "@/lib/server/roles";
import { viewableDomains } from "@/lib/server/rbac";
import { crumbsFromPath, activeKeyFromPath, adminNextDest } from "@/components/admin/admin-nav-groups";

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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) {
    // Preserve the deep-link destination through the login gate so the
    // officer lands back on the exact page after re-authenticating.
    const h0 = await headers();
    const dest = h0.get("x-href") ?? h0.get("x-pathname") ?? "";
    /* ⛔ 551(a) · the destination is the SECTION for a section that masks its record ids — a refusal must not
       hand the record id back out in its own redirect target. */
    const loginUrl = dest.startsWith("/admin") && !dest.startsWith("/auth")
      ? `/auth/admin?next=${encodeURIComponent(adminNextDest(dest))}`
      : "/auth/admin";
    redirect(loginUrl as never);
  }
  const u = await db.user.findById(session.userId);
  const allowed = u && isStaffRole(u.role);
  if (!allowed) {
    // Wrong role (e.g. player session) — send to admin login with deep-link preserved.
    const h0 = await headers();
    const dest = h0.get("x-href") ?? h0.get("x-pathname") ?? "";
    /* ⛔ 551(a) · the destination is the SECTION for a section that masks its record ids — a refusal must not
       hand the record id back out in its own redirect target. */
    const loginUrl = dest.startsWith("/admin") && !dest.startsWith("/auth")
      ? `/auth/admin?next=${encodeURIComponent(adminNextDest(dest))}`
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
  // ⚠️ BOTH OF THESE ARE NOW FALLBACKS, NOT ANSWERS, AND THE DISTINCTION IS THE BUG.
  // `path` comes from the `x-pathname` REQUEST HEADER, and this is a LAYOUT — not re-executed
  // on a client-side soft navigation. Every admin page shares it and the sidebar is all
  // `<Link>`s, so these two values freeze on whatever route the last HARD load saw.
  // `AdminSidebarNav` has always re-derived the key from `usePathname()`; the breadcrumb and
  // the MOBILE nav did not, so the trail read "Admin / Players" on the markets page.
  // They are handed down as first-paint fallbacks and re-derived on the client.
  const activeKey = activeKeyFromPath(path);
  const crumbs = crumbsFromPath(path);

  // Auth-only pages (TOTP verify + 2FA setup) render as standalone pages —
  // no sidebar, no admin topbar. These are gate pages, not console pages.
  //
  // 🔴 THEY HAD NO `<main>` AT ALL, AND NOTHING COULD SEE IT (fixed 2026-08-29, DG-A-18).
  // The console's landmark is at the `<main>` below, and the register's "no `<main>` on any
  // admin route" was answered by pointing at it — true for 38 routes and false for these 2,
  // because this early return sits ABOVE it. ⛔ And `ADMIN_ROUTES` (the 38 every drive walks)
  // contains neither, so the population could not have found them: the two routes without the
  // landmark are exactly the two nobody measures. `/admin/2fa/setup` is the FORCED-ENROLMENT
  // page — every new admin passes through it, so it is not an edge case.
  // ⚠️ Deliberately a bare `<main>`: the console's carries `max-w-console` and
  // `data-measure="console"`, and these pages set their own width (`max-w-md`) — inheriting the
  // console measure would widen a centred gate card. And deliberately NO skip link: there is no
  // nav here to skip, and a bypass link that skips nothing is noise, not access (WCAG 2.4.1 is
  // about repeated blocks).
  if (TOTP_EXEMPT.has(path)) {
    return <main id="main-content">{children}</main>;
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
      /* ⛔ 551(a) · same rule at the TOTP gate: the step-up keeps the officer's place, never the record id. */
      const dest = href.startsWith("/admin") && !href.startsWith("/admin/totp-verify") ? href : "";
      redirect(dest ? `/admin/totp-verify?next=${encodeURIComponent(adminNextDest(dest))}` : "/admin/totp-verify");
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
  // 🔴 E-381 §6 item 10 (2026-09-14) · THE VIEW AND ACT GATES LEFT THIS LAYOUT. Computed here from `x-pathname`, they
  // were frozen at the hard-loaded page for every soft navigation after it. They now live in `AdminSectionGate`, rendered
  // by each section's own layout (re-executed on entry). What stays here only shapes the chrome, and the sidebar and
  // top bar re-derive their active item from `usePathname()`.
  const viewerRole = u!.role;
  const viewDomains = Array.from(await viewableDomains(viewerRole));
  const isOwner = isAdmin(viewerRole);

  return (
    <div className="min-h-screen bg-bg-base text-text">
      {/* ⛔ SKIP-TO-CONTENT — WCAG 2.4.1, and the admin console had NEVER had one.
          `AppShell` carries this for every player route; the console does not use `AppShell`,
          so when the 2026-08-22 landmark cleanup removed 44 nested `<main>` elements under
          `src/app` on the rule "the shell owns the landmark", the console was left with a shell
          that owns nothing. Zero `<main>`, zero skip links, on all 43 admin routes — measured in
          a real browser, `document.querySelectorAll("main").length === 0`, which is ~700 of
          `test:responsive`'s 727 failures. An officer navigating by keyboard had to tab the
          whole sidebar on every single page load. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-semibold focus:outline-none focus:shadow-lg"
      >
        Skip to content
      </a>
      <ConfidentialBand session={adminSession} />
      <div className="flex">
        <AdminSidebar activeKey={activeKey} viewDomains={viewDomains} isOwner={isOwner} />
        <div className="flex-1 min-w-0 flex flex-col">
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
          {/* ⭐ THE CONSOLE'S `<main>`, and it belongs on THIS element rather than on a new
              wrapper: it is already the content column, so the landmark matches exactly what a
              screen reader should be given, and `max-w-console` keeps `data-measure`'s contract
              on the same node the audit already reads. Exactly one per page, id `main-content`,
              which is what the skip link above resolves to and what
              `scripts/responsive-audit.mjs` asserts (B7 / WCAG landmarks). */}
          <main id="main-content" className="flex-1 mx-auto w-full max-w-console" data-measure="console">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
