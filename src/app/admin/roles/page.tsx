import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { currentSession } from "@/lib/server/auth-service";
import { isAdmin } from "@/lib/server/roles";
import { getGrantMatrix } from "@/lib/server/rbac";
import { RolesMatrix } from "./roles-matrix";

export const metadata = { title: "Admin · Role permissions" };
export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const session = await currentSession();
  if (!session || !isAdmin(session.role)) {
    return <AdminRestricted title="Role permissions" sw="Ruhusa za wajibu" need="Owner (ADMIN) only" />;
  }
  const matrix = await getGrantMatrix();

  return (
    <>
      <AdminPageHead title="Role permissions" sw="Ruhusa za wajibu" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">What this is</p>
            <p>
              The single place that decides what each role may see and do across the admin console. It drives all three
              gates together — the nav, every page, and every action — so a role can never see a page it can&apos;t open,
              nor fire an action it isn&apos;t granted. Assign roles to people at{" "}
              <a href="/admin/staff" className="text-royal-300 hover:underline">/admin/staff</a>.
            </p>
          </div>
        </AdminCard>
        <RolesMatrix matrix={matrix} />
      </div>
    </>
  );
}
