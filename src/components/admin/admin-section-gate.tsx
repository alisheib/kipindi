import { cache } from "react";
import { headers } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { isStaffRole, isAdmin, isOwnerOnlyPath, domainForPath, DOMAIN_LABEL, DOMAIN_SUMMARY, roleLabel } from "@/lib/server/roles";
import { canView, canAct } from "@/lib/server/rbac";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminActProvider, ActReadOnlyBanner } from "@/components/admin/act-gate";
import { crumbsFromPath } from "@/components/admin/admin-nav-groups";

/**
 * 🔴 E-381 §6 item 10 (2026-09-14) · THE CONSOLE'S VIEW AND ACT GATES, DECIDED WHERE A NAVIGATION RE-RUNS THEM.
 *
 * These gates lived in `app/admin/layout.tsx`, computed from `x-pathname`. A layout is NOT re-executed on a soft
 * navigation, so the verdict of the page an officer hard-loaded governed every page they clicked to afterwards:
 * a SUPPORT officer who landed on /admin/players (allowed) and followed an in-page link into an accounting page
 * had that page's children rendered — and the `AdminActProvider` handing ~20 money and compliance controls their
 * "may act" answer kept the previous domain's answer. Live, not latent: non-owner staff personas exist on production.
 *
 * ⭐ A SECTION'S OWN LAYOUT IS re-executed when a navigation enters it (measured: `/admin/players` → `/admin/finance`
 * → `/admin/players` re-rendered each section layout with its own path; an `/admin/template.tsx` did NOT re-render).
 * So every top-level console section has a `layout.tsx` that renders this, and the two pages without a section
 * layout of their own (`/admin`, `/admin/players`) wrap themselves in it. `test:admin-section-gate` enumerates the
 * console's pages from disk and fails for any page not under this gate.
 *
 * ⚠️ One nested case is FAIL-CLOSED, stated: `/admin/players/cohorts` (growth) sits under the players routes
 * (support). Its gate is its own layout, and the players list and `/admin/players/[id]` carry theirs, so no gate
 * wraps another and every entry re-decides.
 * ⛔ A missing session, a non-staff account or a missing `x-pathname` renders the restricted panel: never children.
 *
 * ⭐ `title` — ONE optional server-passed word, and it exists for an ID, not for a style (C7-SPEC ruling 301).
 * This gate titles its own restricted panel from the LAST URL SEGMENT, and `looksLikeId` keeps a prefixed,
 * digit-bearing segment VERBATIM — so on a detail route whose last segment is a record id, the panel's heading is that
 * raw id, in a body this layout streams to whoever asked (ruling 259 measured a signed-in PLAYER receiving a console
 * page's whole server payload). A section whose detail route ends in an id therefore passes its own section word here
 * and the id never becomes a heading. ⛔ The default is today's behaviour exactly, so no other section changes.
 */
/**
 * W25 BELT 2 — the page-level gate, which REFUSES but does not decorate.
 *
 * ⛔ WHY A SECOND ENTRY POINT AND NOT JUST A SECOND `<AdminSectionGate>`. W25 puts this gate inside every admin
 * page as well as its section layout, because a layout is skippable: a flight whose `Next-Router-State-Tree` names
 * the admin layouts skips them and the page under them still runs and streams. But the gate does two jobs — it
 * REFUSES an unentitled viewer, and it DECORATES an entitled-but-read-only one with `ActReadOnlyBanner`. Only the
 * first job needs repeating. Measured after the retrofit: 51 of the 53 gated pages sit under a section layout that
 * already renders this gate, so a read-only officer would have been shown the same banner twice, on every one of
 * them. The two pages with no section layout (`/admin`, `/admin/players`) still use `AdminSectionGate` itself and
 * still carry the banner, because for them the page gate IS the only gate.
 *
 * So: a section LAYOUT renders `AdminSectionGate` (refuse + banner); a PAGE renders `AdminPageGate` (refuse only).
 * The refusal, the Owner-only rule, the domain view check and the `AdminActProvider` value are identical in both —
 * only the banner differs, so a skipped layout never costs a page its gate.
 */
export function AdminPageGate({ children, title }: { children: React.ReactNode; title?: string }) {
  return <AdminSectionGate title={title} banner={false}>{children}</AdminSectionGate>;
}

/**
 * THE VIEWER'S STORED ROW, RESOLVED ONCE PER RENDER PASS.
 *
 * ⛔ WHY THIS IS CACHED, measured rather than assumed. W25 put this gate inside every admin page as well as its
 * section layout — deliberately, because a flight skips the layout and the page gate is the one that cannot be
 * skipped. But on an ordinary document request BOTH now run, so every admin page render was paying a SECOND
 * `SELECT … FROM "User" WHERE id = <the viewer>`, and `<Sensitive>` already pays a third for the same row on any
 * page with a masked cell. `sensitive.tsx:48-52` documents why that query is not cheap: `db.user.findById` is a real
 * `findUnique` returning the WHOLE row including `avatarDataUrl`, a column `user.list()` explicitly omits for this
 * reason. React's `cache()` is per render pass, so this memoises the LOOKUP and decides nothing — the layout gate,
 * the page gate and any nested gate now share one read, and the double-gating costs nothing but a function call.
 */
const viewerRow = cache(async (userId: string) => Promise.resolve(db.user.findById(userId)).catch(() => null));

export async function AdminSectionGate({ children, title: titleProp, banner = true }: { children: React.ReactNode; title?: string; banner?: boolean }) {
  const h = await headers();
  const path = h.get("x-pathname") ?? "";
  const title = titleProp ?? crumbsFromPath(path || "/admin").at(-1) ?? "Restricted";
  const session = await currentSession();
  const user = session ? await viewerRow(session.userId) : null;
  if (!session || !user || !isStaffRole(user.role) || !path.startsWith("/admin")) {
    return <AdminRestricted title={title} need="a staff sign-in" />;
  }
  const role = user.role;
  const ownerOnly = isOwnerOnlyPath(path);
  const domain = domainForPath(path);
  const viewBlocked = ownerOnly ? !isAdmin(role) : !(await canView(role, domain));
  if (viewBlocked) {
    return <AdminRestricted title={title} need={ownerOnly ? "Owner (ADMIN) only" : `${DOMAIN_LABEL[domain]} access`} />;
  }
  const mayAct = ownerOnly ? isAdmin(role) : await canAct(role, domain);
  const readOnly = !mayAct && DOMAIN_SUMMARY[domain].act !== "—";
  return (
    <AdminActProvider mayAct={mayAct} role={roleLabel(role)} domainLabel={DOMAIN_LABEL[domain]}>
      {readOnly && banner && <ActReadOnlyBanner role={roleLabel(role)} domainLabel={DOMAIN_LABEL[domain]} />}
      {children}
    </AdminActProvider>
  );
}
