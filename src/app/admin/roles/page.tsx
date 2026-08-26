import Link from "next/link";
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
const TABS = [
  { id: "access", label: "Access", sw: "Ufikiaji" },
  { id: "reads", label: "Reads", sw: "Kusoma" },
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

        <AdminCard padding="p-0">
          <nav aria-label="Permission axes" className="flex gap-4 px-4 border-b border-border-subtle overflow-x-auto">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={`/admin/roles?tab=${t.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 border-b-2 py-2.5 text-body-sm transition-colors ${
                    active
                      ? "border-brand-500 text-text font-semibold"
                      : "border-transparent text-text-tertiary hover:text-text"
                  }`}
                >
                  {t.label} · {t.sw}
                </Link>
              );
            })}
          </nav>
        </AdminCard>

        {tab === "access" && grantMatrix && <RolesMatrix matrix={grantMatrix} />}
        {tab === "reads" && readMatrix && <ReadTiersMatrix matrix={readMatrix} />}
      </AdminBody>
    </>
  );
}
