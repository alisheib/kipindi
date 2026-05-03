import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import { AlertTriangle, Activity, Users } from "lucide-react";
import { AmlActionRow } from "./aml-actions-client";
import { detectSuspiciousBets } from "@/lib/server/analytics";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { getAuditPage } from "@/lib/server/audit";

export const metadata = { title: "Admin · AML queue" };
export const dynamic = "force-dynamic";

export default function AdminAmlPage() {
  const inReview = db.txn.listByStatus("AML_REVIEW");
  const flags = detectSuspiciousBets();
  // Track which txns already have a stage-1 signature (waiting on second officer)
  const stage1 = new Map<string, { actorId: string | null; at: string }>();
  for (const e of getAuditPage({ category: "ADMIN", limit: 200 })) {
    if (e.action === "aml.approve.stage1" && e.targetId) stage1.set(e.targetId, { actorId: e.actorId, at: e.at });
  }

  return (
    <>
      <AdminPageHead
        title="AML · EDD queue"
        sw="Foleni ya AML"
        period={false}
        actions={<Chip size="md" variant={inReview.length > 0 ? "warning" : "neutral"}>{inReview.length} pending</Chip>}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <AdminCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="text-text-tertiary uppercase tracking-wide bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Provider</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {inReview.map((t) => {
                  const requiresTwo = Math.abs(t.amount) >= TWO_PERSON_THRESHOLD_TZS;
                  const sig = stage1.get(t.id);
                  return (
                    <tr key={t.id} className="border-t border-border-subtle/50">
                      <td className="p-3 font-mono whitespace-nowrap">{t.createdAt.replace("T", " ").slice(0, 19)}</td>
                      <td className="p-3 font-medium text-text">{t.type}</td>
                      <td className="p-3 font-mono">
                        <a href={`/admin/players?q=${encodeURIComponent(t.userId)}`} className="hover:text-royal hover:underline">
                          {t.userId.slice(0, 16)}
                        </a>
                      </td>
                      <td className="p-3 font-mono tabular text-right">
                        {formatTzs(Math.abs(t.amount))}
                        {requiresTwo && (
                          <Chip size="sm" variant="warning" className="ml-2">
                            <Users size={10} className="mr-1" /> 2-officer
                          </Chip>
                        )}
                        {sig && (
                          <span className="block font-mono text-micro text-warning mt-1">
                            stage 1 by {sig.actorId?.slice(0, 12) ?? "—"}…
                          </span>
                        )}
                      </td>
                      <td className="p-3">{t.provider ?? "—"}</td>
                      <td className="p-3">{t.amlReason ?? "—"}</td>
                      <td className="p-3">
                        <AmlActionRow txnId={t.id} amount={Math.abs(t.amount)} />
                      </td>
                    </tr>
                  );
                })}
                {inReview.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-text-tertiary">No transactions awaiting review.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary">
              <p className="text-text font-bold">Two-person approval (production)</p>
              <p>In production, approve / reject for amounts ≥ TZS 5M requires (a) the on-shift compliance officer, plus (b) the AML lead. Both clicks are recorded in the <code>ADMIN</code> audit category with the reviewer&apos;s user-id, IP, and reason. This build records the single approval in audit so the workflow can be lifted directly when the second-officer flow is wired.</p>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding="p-0">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-warning" />
              <p className="font-bold text-text">Suspicious-bet detector · Tabia za shaka</p>
              <span className="text-caption text-text-tertiary">stake spike ≥ 10× user 30-day median; or velocity ≥ 100/24h</span>
            </div>
            <Chip size="md" variant={flags.length > 0 ? "warning" : "neutral"}>{flags.length} flags</Chip>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="text-text-tertiary uppercase tracking-wide bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Stake</th>
                  <th className="text-right p-3">Median</th>
                  <th className="text-right p-3">×</th>
                  <th className="text-left p-3">Detail</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {flags.map((f) => (
                  <tr key={`${f.userId}-${f.txnId}-${f.type}`} className="border-t border-border-subtle/50">
                    <td className="p-3 font-mono">
                      <a href={`/admin/players?q=${encodeURIComponent(f.userId)}`} className="hover:text-royal hover:underline">
                        {f.userId.slice(0, 16)}
                      </a>
                    </td>
                    <td className="p-3">
                      <Chip size="sm" variant={f.type === "STAKE_SPIKE" ? "warning" : "danger"}>
                        {f.type}
                      </Chip>
                    </td>
                    <td className="p-3 font-mono tabular text-right">{formatTzs(f.stake)}</td>
                    <td className="p-3 font-mono tabular text-right text-text-tertiary">{formatTzs(f.median)}</td>
                    <td className="p-3 font-mono tabular text-right text-warning">{f.multiple.toFixed(1)}×</td>
                    <td className="p-3 text-text-tertiary">{f.detail}</td>
                  </tr>
                ))}
                {flags.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-text-tertiary">No suspicious patterns detected.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
