import { Tabs } from "@/components/ui/tabs";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { currentSession } from "@/lib/server/auth-service";
import { isAdmin } from "@/lib/server/roles";
import { getGrantMatrix, getReadMatrix } from "@/lib/server/rbac";
import { RolesMatrix } from "./roles-matrix";
import { ReadTiersMatrix } from "./read-tiers-matrix";
import { AdminBody } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Role permissions" };
export const dynamic = "force-dynamic";

/**
 * ⛔ TWO AXES, ONE SCREEN. docs/READ-TIERS.md §6: "two permission screens is how two permission
 * models are born." Access answers "may this role reach this ROUTE?"; Reads answers "may this
 * role read this FIELD?" — and Reads may only ever SUBTRACT from what Access already grants.
 */
/* ⚠️ The `sw` gloss is gone with the hand-rolled rail (DG-S-03) — the kit rail's label is one
   string, and dead data is how a stale fact survives (§0a). `Ufikiaji` still ships at
   `admin-nav-groups.ts:158`. */
const TABS = [
  { id: "access", label: "Access" },
  { id: "reads", label: "Reads" },
] as const;

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await currentSession();
  if (!session || !isAdmin(session.role)) {
    return <AdminRestricted title="Role permissions" sw="Ruhusa za wajibu" need="Owner (ADMIN) only" />;
  }
  const sp = await searchParams;
  const tab = String(sp.tab ?? "") === "reads" ? "reads" : "access";

  // ⚠️ Only the matrix the active tab renders is read. Loading both would double a DB round trip
  // on every visit to pay for a tab most visits never open.
  const grantMatrix = tab === "access" ? await getGrantMatrix() : null;
  const readMatrix = tab === "reads" ? await getReadMatrix() : null;

  return (
    <>
      <AdminPageHead title="Role permissions" sw="Ruhusa za wajibu" />
      <AdminBody>
        <AdminCard className="border-info-border bg-info-bg">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">What this is</p>
            <p>
              The single place that decides what each role may see and do across the admin console.{" "}
              <strong className="text-text">Access</strong> drives all three route gates together — the nav, every
              page, and every action — so a role can never see a page it can&apos;t open, nor fire an action it
              isn&apos;t granted. <strong className="text-text">Reads</strong> is a second, finer question asked of
              individual fields, and it can only ever take away from what Access allows. Assign roles to people at{" "}
              <a href="/admin/staff" className="text-royal-300 hover:underline">/admin/staff</a>.
            </p>
          </div>
        </AdminCard>

        {/* ⭐ THE KIT SECTION RAIL (DG-S-03, 2026-08-31) — DESIGN_AUTHORITY §K rule 7.
            This rail was hand-rolled here, and `/admin/players/[id]:302` hand-rolled it again
            with a BYTE-IDENTICAL container class string and divergent items (40px vs 52px,
            `<Link>` vs raw `<a>`, `aria-current` vs nothing). Two definition sites for one
            control is §K's Definition of Done failing its own test — "a grep for the thing you
            added finds it in exactly ONE definition site" — so this one is deleted INTO the
            primitive (§B9: new design merges in, it never sits beside).
            ⚠️ THE SWAHILI GLOSS GOES. This rail rendered `Access · Ufikiaji`; the primitive's
            label is one string and the console is English-only by design
            (`scripts/failure-reasons.test.mts:1080-1085`), which is what stops a six-tab rail
            from needing 1,400px. `Ufikiaji` survives at `admin-nav-groups.ts:158` as the Access
            domain's own gloss; `Kusoma` does not, and the card above still names and explains
            both axes in prose. That is the one content change here, and it is stated rather
            than absorbed. */}
        <AdminCard padding="p-0">
          <Tabs
            ariaLabel="Permission axes"
            value={tab}
            tabs={TABS.map((t) => ({ value: t.id, labelEn: t.label, href: `/admin/roles?tab=${t.id}` }))}
          />
        </AdminCard>

        {tab === "access" && grantMatrix && <RolesMatrix matrix={grantMatrix} />}
        {tab === "reads" && readMatrix && <ReadTiersMatrix matrix={readMatrix} />}
      </AdminBody>
    </>
  );
}
