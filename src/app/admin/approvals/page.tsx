import { AdminPageHead, AdminCard, AdminKpi, FeedRow } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { db, type StoredTxn, type StoredSourceOfFunds } from "@/lib/server/store";
import { getAuditPage } from "@/lib/server/audit";

export const metadata = { title: "Admin · Two-person approvals" };
export const dynamic = "force-dynamic";

export default function AdminApprovalsPage() {
  const aml = db.txn.listByStatus("AML_REVIEW") as StoredTxn[];
  const sof = db.sourceOfFunds.listPending() as StoredSourceOfFunds[];
  const recent = getAuditPage({ category: "ADMIN", limit: 60 });

  return (
    <>
      <AdminPageHead
        title="Two-person approvals"
        sw="Idhini ya watu wawili"
        actions={
          <span className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 h-7 inline-flex items-center gap-1.5 rounded-md border border-gold bg-gold/10 text-gold">
            <ShieldCheck size={12} aria-hidden /> Co-sign required
          </span>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="AML pending" sw="Inasubiri ukaguzi" value={aml.length} pulse={aml.length > 0} />
          <AdminKpi label="SOF declarations" sw="Asili ya pesa" value={sof.length} pulse={sof.length > 0} />
          <AdminKpi label="Player overrides" sw="Mabadiliko"  value="0" delta="freeze · refund · close" />
          <AdminKpi label="Avg cosign time" sw="Wastani"      value="—"  delta="last 7d" />
        </div>

        {/* AML queue */}
        <AdminCard
          title="AML queue · awaiting first signature"
          sw="Foleni ya AML"
          action={<a href="/admin/aml" className="font-mono text-micro tracking-[0.10em] uppercase text-royal">go to AML →</a>}
        >
          {aml.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <ShieldCheck size={18} className="text-success" />
              <p className="text-caption text-text-secondary">Queue empty. New AML triggers appear here for first review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-caption min-w-[640px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <th className="text-left py-2 pr-3">When</th>
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-right py-2 pr-3">Amount</th>
                    <th className="text-left py-2 pl-3">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {aml.map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle/50 last:border-b-0">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{t.createdAt.replace("T", " ").slice(0, 16)}</td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${t.userId}`} className="font-mono text-royal hover:underline">{t.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3 font-medium text-text">{t.type}</td>
                      <td className="py-2 pr-3 font-mono tabular text-right">{(Math.abs(t.amount) / 1_000_000).toFixed(2)}M</td>
                      <td className="py-2 pl-3 text-text-secondary">{t.amlReason ?? "review"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* SOF declarations */}
        <AdminCard title="Source-of-funds declarations · pending review" sw="Tamko za asili ya pesa">
          {sof.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <ShieldCheck size={18} className="text-success" />
              <p className="text-caption text-text-secondary">No SOF declarations pending. Players auto-trigger this when cumulative deposits exceed TZS 5M / 30 days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-caption min-w-[600px]">
                <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                  <tr>
                    <th className="text-left py-2 pr-3">Submitted</th>
                    <th className="text-left py-2 pr-3">User</th>
                    <th className="text-left py-2 pr-3">Source</th>
                    <th className="text-left py-2 pr-3">Income band</th>
                    <th className="text-left py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sof.map((s) => (
                    <tr key={s.userId} className="border-b border-border-subtle/50 last:border-b-0">
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{s.submittedAt.replace("T", " ").slice(0, 16)}</td>
                      <td className="py-2 pr-3"><a href={`/admin/players/${s.userId}`} className="font-mono text-royal hover:underline">{s.userId.slice(0, 14)}…</a></td>
                      <td className="py-2 pr-3 font-medium text-text">{s.declaredSource}</td>
                      <td className="py-2 pr-3 font-mono">{s.declaredAnnualIncomeBand}</td>
                      <td className="py-2 pl-3"><Chip size="sm" variant="warning">{s.reviewStatus}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        {/* Approval log */}
        <AdminCard title="Recent approval activity" sw="Kumbukumbu ya idhini">
          <div className="max-h-[300px] overflow-y-auto">
            {recent.filter((e) => e.action.startsWith("aml.") || e.action.startsWith("sof.") || e.action.startsWith("player.")).slice(0, 30).map((e) => (
              <FeedRow
                key={e.id}
                ts={e.createdAt.replace("T", " ").slice(0, 19)}
                category="ADMIN"
                variant="warning"
                body={`${e.action} · ${e.actorId?.slice(0, 12) ?? "system"} → ${e.targetType ?? ""}#${e.targetId?.slice(0, 12) ?? ""}`}
              />
            ))}
            {recent.length === 0 && <p className="text-caption text-text-tertiary py-4 text-center">No approval activity yet.</p>}
          </div>
        </AdminCard>

        <AdminCard className="border-warning-border bg-warning-bg/15">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="text-caption text-text-secondary space-y-1">
              <p className="text-text font-bold">Production rule</p>
              <p>
                Two-person approval is mandatory for any single transaction ≥ TZS 5M, all KYC overrides, all wallet
                freezes, and all forced account closures. The first reviewer enters the action with a reason; the
                second reviewer must counter-sign within 30 minutes from a different session and IP. Both clicks
                are recorded in the <code>ADMIN</code> audit category with both reviewers&apos; user-ids.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
