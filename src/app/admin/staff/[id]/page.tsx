import { notFound } from "next/navigation";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { getAuditForTarget } from "@/lib/server/audit";
import { isAdmin, roleLabel } from "@/lib/server/roles";
import { staffRoleInfos } from "@/lib/server/rbac";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { formatDate } from "@/lib/utils";
import { accountStatusLabel } from "@/components/admin/status-badge";
import { AssignRoleForm } from "../staff-forms";

export const metadata = { title: "Admin · Staff member" };
export const dynamic = "force-dynamic";

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session || !isAdmin(session.role)) {
    return <AdminRestricted title="Staff member" need="Owner (ADMIN) only" />;
  }
  const { id } = await params;
  const u = await db.user.findById(id);
  if (!u) notFound();

  const roleInfos = await staffRoleInfos();
  const audit = await getAuditForTarget("User", id, 100);
  const roleChanges = audit.filter((e) => e.action === "staff.role_changed");
  const isSelf = id === session.userId;

  return (
    <>
      <AdminPageHead title="Staff member" sw="Mfanyakazi" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Identity + current role */}
        <AdminCard>
          <div className="flex items-center gap-3 flex-wrap">
            <Avatar initials={displayInitials(u)} size="lg" seed={u.id} />
            <div className="min-w-0">
              <p className="font-display font-bold text-title-sm text-text truncate">{displayLabel(u)}</p>
              <p className="font-mono text-caption text-text-tertiary">{u.phoneE164}{u.email ? ` · ${u.email}` : ""}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Chip size="sm" variant={u.role === "ADMIN" ? "gold" : "info"}>Current: {roleLabel(u.role)}</Chip>
              <Chip size="sm" variant={u.status === "ACTIVE" ? "success" : "neutral"}>{accountStatusLabel(u.status)}</Chip>
            </div>
          </div>
        </AdminCard>

        {/* Assign role */}
        <AdminCard title="Role" sw="Wajibu">
          {isSelf ? (
            <p className="text-caption text-text-secondary">
              This is your own account. You cannot change your own role — that guard is what stops the Owner locking themselves out. Ask another Owner if you need your role changed.
            </p>
          ) : (
            <AssignRoleForm userId={u.id} currentRole={u.role} roleInfos={roleInfos} />
          )}
        </AdminCard>

        {/* Role-change history — straight from the immutable, hash-chained audit log. */}
        <AdminCard title="Role history" sw="Historia" padding="p-0">
          <div className="px-4 pt-0 pb-2">
            {roleChanges.length === 0 ? (
              <p className="text-caption text-text-tertiary py-3">No role changes recorded for this account.</p>
            ) : (
              /* ⚠️ This was the ONE admin table of 52 not wrapped in <ScrollX>. Every
                 cell here is `whitespace-nowrap` or a 14-char mono id, so below ~600px
                 the four columns pushed the CARD wider than the page instead of
                 scrolling inside it. `-mx-4 px-4` lets the scroll edge reach the card
                 edge (the same idiom as /admin/transactions). */
              <ScrollX label="Role history" className="-mx-4 px-4">
                <table className="admin-tbl">
                  <thead>
                    <tr>
                      <th className="text-left">When</th>
                      <th className="text-left">Change</th>
                      <th className="text-left">By</th>
                      <th className="text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    {roleChanges.map((e) => {
                      const p = (e.payload ?? {}) as { prevRole?: string; newRole?: string; reason?: string };
                      return (
                        <tr key={e.id}>
                          <td className="font-mono whitespace-nowrap text-micro">{formatDate(e.createdAt)}</td>
                          <td className="whitespace-nowrap">{roleLabel(p.prevRole)} → <strong className="text-text">{roleLabel(p.newRole)}</strong></td>
                          <td className="font-mono text-micro truncate">{(e.actorId ?? "—").slice(0, 14)}…</td>
                          <td className="text-caption">{p.reason ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
