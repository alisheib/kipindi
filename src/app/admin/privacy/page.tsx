/**
 * Privacy operations · /admin/privacy
 * - DSAR queue (PDPA + GDPR)
 * - Per-user export bundle (machine-readable JSON)
 */
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { listDsarRequests } from "@/lib/server/privacy";
import { ExportDsarBundleButton, FulfillDsarButton } from "./dsar-controls";
import { I } from "@/components/ui/glyphs";

export const metadata = { title: "Admin · Privacy / DSAR" };
export const dynamic = "force-dynamic";

export default async function AdminPrivacyPage() {
  const requests = listDsarRequests();
  const pending = requests.filter((r) => r.status === "PENDING");
  const fulfilled = requests.filter((r) => r.status === "FULFILLED");
  const recentUsers = (await db.user.list()).slice(0, 8);

  return (
    <>
      <AdminPageHead
        title="Privacy · DSAR queue"
        sw="Faragha · Maombi ya data"
        period={false}
        actions={<Chip size="md" variant={pending.length > 0 ? "warning" : "neutral"}>{pending.length} pending · 30d SLA</Chip>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Pending"  sw="Inasubiri"  value={String(pending.length)}   delta="< 30 days SLA" />
          <AdminKpi label="Fulfilled" sw="Imekamilika" value={String(fulfilled.length)} delta="lifetime" />
          <AdminKpi label="Access"    sw="Kupata"     value={String(requests.filter((r) => r.type === "ACCESS").length)} delta="GDPR Art. 15" />
          <AdminKpi label="Erasure"   sw="Kufuta"     value={String(requests.filter((r) => r.type === "ERASURE").length)} delta="GDPR Art. 17" />
        </div>

        <AdminCard
          title="Open requests"
          sw="Maombi yaliyofunguliwa"
          padding="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">Filed</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-border-subtle/50 align-top">
                    <td className="p-3 font-mono whitespace-nowrap">{r.requestedAt.replace("T", " ").slice(0, 19)}</td>
                    <td className="p-3 font-mono">{r.userId.slice(0, 16)}…</td>
                    <td className="p-3">
                      <Chip size="sm" variant={r.type === "ERASURE" ? "danger" : "neutral"}>{r.type}</Chip>
                    </td>
                    <td className="p-3 text-text-tertiary max-w-[260px] truncate">{r.reason ?? "—"}</td>
                    <td className="p-3">
                      <Chip size="sm" variant={r.status === "PENDING" ? "warning" : r.status === "FULFILLED" ? "success" : "danger"}>{r.status}</Chip>
                    </td>
                    <td className="p-3">
                      {r.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <ExportDsarBundleButton userId={r.userId} />
                          <FulfillDsarButton id={r.id} />
                        </div>
                      ) : (
                        <span className="font-mono text-micro text-text-tertiary uppercase tracking-[0.10em]">{r.fulfilledAt?.slice(0, 10) ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-text-tertiary">No DSAR requests on file.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard
          title="On-behalf export · officer-initiated"
          sw="Toa data badala ya mtumiaji"
          action={<span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">{recentUsers.length} recent users</span>}
        >
          <p className="text-caption text-text-tertiary mb-2">
            For walk-in or phone-in DSAR requests where the player has authenticated by phone OTP at the front-desk and the
            officer needs to hand them a copy of their data right now. Generates a JSON bundle with everything we hold.
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-caption min-w-[640px]">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                <tr>
                  <th className="text-left py-2 pr-3">Player</th>
                  <th className="text-left py-2 pr-3">Phone</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Created</th>
                  <th className="text-left py-2 pl-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle/40 last:border-b-0">
                    <td className="py-2 pr-3">
                      <a href={`/admin/players/${u.id}`} className="font-medium text-text hover:text-royal hover:underline">
                        {u.displayName ?? "—"}
                      </a>
                      <span className="block font-mono text-micro text-text-tertiary">{u.id.slice(0, 14)}…</span>
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{u.phoneE164}</td>
                    <td className="py-2 pr-3">
                      <Chip size="sm" variant={u.status === "ACTIVE" ? "success" : "neutral"}>{u.status}</Chip>
                    </td>
                    <td className="py-2 pr-3 font-mono whitespace-nowrap">{u.createdAt.slice(0, 10)}</td>
                    <td className="py-2 pl-3">
                      <ExportDsarBundleButton userId={u.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="flex items-start gap-3">
            <I.shieldQuestion size={18} className="text-info shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Legal frame</p>
              <p>
                Tanzania Personal Data Protection Act (2022) §29 grants the right of access, §30 correction, §31 erasure.
                GDPR Art. 15 + 17 mirror those rights for European residents using 50pick via roaming SIMs. Both regimes
                set a 30-day fulfilment window. AML retention (POCA Cap 423 §16) takes precedence over erasure for 7 years
                after closure on financial records.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
