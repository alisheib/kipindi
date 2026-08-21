import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { ScrollX } from "@/components/ui/scroll-x";
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { formatDate } from "@/lib/utils";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { STAFF_ROLES, ROLE_LABEL, roleLabel, isAdmin, type Role } from "@/lib/server/roles";
import { staffRoleInfos } from "@/lib/server/rbac";
import { AddStaffForm } from "./staff-forms";

export const metadata = { title: "Admin · Staff" };
export const dynamic = "force-dynamic";

/** Owner colour = gold seal discipline; everyone else a calm neutral chip. */
function roleChipVariant(role: string): "gold" | "info" | "neutral" {
  if (role === "ADMIN") return "gold";
  if (role === "COMPLIANCE" || role === "AUDITOR") return "info";
  return "neutral";
}

export default async function AdminStaffPage() {
  // Owner-only (the layout already enforces isOwnerOnlyPath; belt-and-suspenders here).
  const session = await currentSession();
  if (!session || !isAdmin(session.role)) {
    return <AdminRestricted title="Staff" sw="Wafanyakazi" need="Owner (ADMIN) only" />;
  }

  let staff: Awaited<ReturnType<typeof db.user.listByRoles>> = [];
  let failed = false;
  try { staff = await db.user.listByRoles([...STAFF_ROLES]); } catch { failed = true; }
  staff.sort((a, b) => (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? ""));

  const byRole: Record<string, number> = {};
  for (const u of staff) byRole[u.role] = (byRole[u.role] ?? 0) + 1;

  const roleInfos = await staffRoleInfos();

  return (
    <>
      <AdminPageHead title="Staff" sw="Wafanyakazi" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Headcount by the roles that actually carry authority. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Total staff" sw="Jumla" value={failed ? "" : String(staff.length)} unavailable={failed} />
          <AdminKpi label="Owners" sw="Wamiliki" value={failed ? "" : String(byRole.ADMIN ?? 0)} unavailable={failed} gold />
          <AdminKpi label="Compliance + Auditor" value={failed ? "" : String((byRole.COMPLIANCE ?? 0) + (byRole.AUDITOR ?? 0))} unavailable={failed} />
          <AdminKpi label="Finance + Growth + Support + Trading" value={failed ? "" : String((byRole.FINANCE ?? 0) + (byRole.GROWTH ?? 0) + (byRole.SUPPORT ?? 0) + (byRole.MODERATOR ?? 0))} unavailable={failed} />
        </div>

        <AdminCard title="Add staff" sw="Ongeza mfanyakazi">
          <p className="text-caption text-text-tertiary mb-3">
            Promote an <strong>existing</strong> 50pick account to a staff role by phone. Owner-only, step-up 2FA, and recorded in the compliance log.
          </p>
          <AddStaffForm roleInfos={roleInfos} />
        </AdminCard>

        <AdminCard padding="p-0">
          <ScrollX label="Staff" className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-left">Person</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Last login</th>
                  <th className="text-left">Manage</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {staff.map((u) => {
                  const label = displayLabel(u);
                  return (
                    <tr key={u.id}>
                      <td>
                        <a href={`/admin/staff/${u.id}`} className="flex items-center gap-2.5 min-w-0 hover:text-royal-300">
                          <Avatar initials={displayInitials(u)} size="sm" seed={u.id} />
                          <div className="min-w-0">
                            <p className="text-body-sm font-medium text-text truncate">{label}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{u.id}</p>
                          </div>
                        </a>
                      </td>
                      <td className="font-mono whitespace-nowrap">{u.phoneE164.length > 6 ? `${u.phoneE164.slice(0, 4)}****${u.phoneE164.slice(-2)}` : u.phoneE164}</td>
                      <td><Chip size="sm" variant={roleChipVariant(u.role)}>{roleLabel(u.role)}</Chip></td>
                      <td><Chip size="sm" variant={u.status === "ACTIVE" ? "success" : "neutral"}>{u.status}</Chip></td>
                      <td className="font-mono whitespace-nowrap">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                      <td>
                        <a href={`/admin/staff/${u.id}`} className="text-royal-300 hover:underline font-medium font-mono text-micro tracking-[0.10em] uppercase">manage →</a>
                      </td>
                    </tr>
                  );
                })}
                {staff.length === 0 && (
                  failed ? (
                    <tr><td colSpan={6} className="p-4"><AdminLoadError what="the staff list" /></td></tr>
                  ) : (
                    <AdminTableEmpty colSpan={6} kind="admin" title="No staff yet" body="Only the Owner has access. Add staff above to delegate." />
                  )
                )}
              </tbody>
            </table>
          </ScrollX>
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">How roles work</p>
            <p>Each person has <strong>one role</strong>. A role decides which admin sections they can see and which actions they can take. Roles: <strong>{STAFF_ROLES.map((r) => ROLE_LABEL[r as Role]).join(" · ")}</strong>. The Owner can fine-tune exactly what each role may see and do at <a href="/admin/roles" className="text-royal-300 hover:underline">/admin/roles</a>. Changing a role signs the person out so the new access applies immediately.</p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
