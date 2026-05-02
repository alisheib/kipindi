import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Activity, Wallet, ShieldCheck, AlertTriangle } from "lucide-react";
import { db } from "@/lib/server/store";
import { getAuditPage } from "@/lib/server/audit";
import { formatTzs } from "@/lib/utils";

export const metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  // Aggregate live metrics from in-memory store
  const users = db.user;
  const wallets = db.wallet;
  const txns = db.txn;

  // Iterate maps via reading the underlying global (since db API doesn't expose iteration directly)
  // Use the public API: list audit entries to count by category in last 24h
  const recent = getAuditPage({ limit: 1000 });
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const last24h = recent.filter((e) => new Date(e.createdAt).getTime() > cutoff);

  const counts = {
    auth:        last24h.filter((e) => e.category === "AUTH").length,
    kyc:         last24h.filter((e) => e.category === "KYC").length,
    wallet:      last24h.filter((e) => e.category === "WALLET").length,
    bet:         last24h.filter((e) => e.category === "BET").length,
    compliance:  last24h.filter((e) => e.category === "COMPLIANCE").length,
    security:    last24h.filter((e) => e.category === "SECURITY").length,
  };

  // Sample reads — will be Prisma queries in production
  const sampleUserId = recent.find((e) => e.actorId)?.actorId ?? null;
  const sampleWallet = sampleUserId ? wallets.findByUserId(sampleUserId) : null;
  void users; void txns; // present in scope for production swap

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Overview" }]} />
      <header>
        <h1 className="font-display font-bold text-title-lg text-text">Overview · Muhtasari</h1>
        <p className="text-body text-text-secondary">Last 24 hours · in-memory metrics. Production: replace with Postgres queries.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Activity size={16} className="text-royal" />} label="Audit events / 24h" value={String(last24h.length)} />
        <KpiCard icon={<ShieldCheck size={16} className="text-success" />} label="Auth events" value={String(counts.auth)} />
        <KpiCard icon={<Wallet size={16} className="text-gold" />} label="Wallet events" value={String(counts.wallet)} />
        <KpiCard icon={<AlertTriangle size={16} className="text-warning" />} label="Compliance events" value={String(counts.compliance)} />
      </div>

      <Card>
        <CardBody className="p-5 space-y-3">
          <h2 className="font-display font-bold text-title-sm text-text">Latest audit entries</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="text-text-tertiary uppercase tracking-wide">
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 pr-3">Time</th>
                  <th className="text-left py-2 pr-3">Category</th>
                  <th className="text-left py-2 pr-3">Action</th>
                  <th className="text-left py-2 pr-3">Actor</th>
                  <th className="text-left py-2 pr-3">Target</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {recent.slice(0, 25).map((e) => (
                  <tr key={e.id} className="border-b border-border-subtle/50">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{e.createdAt.split("T")[1]?.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3"><span className="font-mono text-micro tracking-wide">{e.category}</span></td>
                    <td className="py-1.5 pr-3 font-medium text-text">{e.action}</td>
                    <td className="py-1.5 pr-3 font-mono">{e.actorId?.slice(0, 14) ?? "—"}</td>
                    <td className="py-1.5 pr-3 font-mono">{e.targetType ? `${e.targetType}#${e.targetId?.slice(0, 10)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && <p className="text-body-sm text-text-tertiary py-3">No audit entries yet.</p>}
          </div>
        </CardBody>
      </Card>

      {sampleWallet && (
        <Card>
          <CardBody className="p-5 space-y-2">
            <h2 className="font-display font-bold text-title-sm text-text">Sample wallet</h2>
            <p className="text-body-sm text-text-secondary">User <span className="font-mono">{sampleWallet.userId}</span> — balance <strong>{formatTzs(sampleWallet.balance)}</strong>, status <strong>{sampleWallet.status}</strong></p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardBody className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-text-tertiary">{icon}<span className="text-caption uppercase tracking-wide">{label}</span></div>
        <p className="font-display font-bold text-title-md tabular text-text leading-none">{value}</p>
      </CardBody>
    </Card>
  );
}
