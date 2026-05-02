import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { Database, ShieldCheck } from "lucide-react";
import { SystemActions } from "./system-client";
import { db } from "@/lib/server/store";
import { verifyChain, getAuditPage } from "@/lib/server/audit";
import { feedHealth } from "@/lib/server/match-feed";
import { smsHealthSnapshot } from "@/lib/server/sms";

export const metadata = { title: "Admin · System" };
export const dynamic = "force-dynamic";

export default function AdminSystemPage() {
  const chain = verifyChain();
  const auditCount = getAuditPage({ limit: 100_000 }).length;
  const feed = feedHealth();
  const sms = smsHealthSnapshot();
  const totalUsers = db.user.list().length;

  return (
    <>
      <AdminPageHead title="System" sw="Mfumo" period={false} />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Health KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Audit chain"   sw="Mlolongo wa ukaguzi" value={chain.valid ? "Valid" : "BROKEN"} delta={`${auditCount.toLocaleString()} entries`} deltaDir={chain.valid ? "up" : "down"} pulse={!chain.valid} />
          <AdminKpi label="Total users"   sw="Watumiaji"            value={totalUsers.toLocaleString()} />
          <AdminKpi label="Match-feed"    sw="Mlisho wa mechi"       value={feed.calls === 0 ? "Idle" : `${(feed.failRate * 100).toFixed(1)}% fail`} delta={`${feed.calls} calls`} />
          <AdminKpi label="SMS provider"  sw="Watoa SMS"            value={sms.sent + sms.failed === 0 ? "Idle" : `${(sms.successRate * 100).toFixed(1)}% ok`} delta={`${sms.sent} sent`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminCard title="Backup" sw="Nakala">
            <div className="flex items-start gap-2 mb-3">
              <Database size={16} className="text-royal mt-0.5 shrink-0" />
              <p className="text-caption text-text-secondary">
                The in-memory store auto-snapshots to disk on every mutation (debounced 1.5s, last 12 snapshots kept).
                Click below to force an immediate snapshot — useful before a planned restart.
              </p>
            </div>
            <SystemActions kind="backup" />
          </AdminCard>

          <AdminCard title="Audit chain integrity" sw="Mlolongo · uadilifu">
            <div className="flex items-start gap-2 mb-3">
              <ShieldCheck size={16} className="text-success mt-0.5 shrink-0" />
              <p className="text-caption text-text-secondary">
                Each audit entry is HMAC-chained to the previous one. Walking the chain from genesis to head should return
                valid; any break would indicate tampering or restoration from a non-matching backup.
              </p>
            </div>
            <SystemActions kind="verify-chain" />
          </AdminCard>
        </div>

        <AdminCard className="border-info-border bg-info-bg/15">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Production posture</p>
            <p>
              Backup → Postgres point-in-time recovery + audit log replicated synchronously across two regions.
              Audit chain → same HMAC scheme persisted as <code>prevHash</code> + <code>entryHash</code> columns;
              nightly cron re-verifies the entire chain and pages on-call if a break is detected.
              Match-feed + SMS adapters are env-switched (<code>SPORTS_API_PROVIDER</code>, <code>SMS_PROVIDER</code>);
              health metrics above come from in-memory counters that get replaced by Prometheus in production.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
