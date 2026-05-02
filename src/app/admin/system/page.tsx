import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Database, ShieldCheck } from "lucide-react";
import { SystemActions } from "./system-client";

export const metadata = { title: "Admin · System" };

export default function AdminSystemPage() {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "System" }]} />
      <header>
        <h1 className="font-display font-bold text-title-lg text-text">System · Mfumo</h1>
        <p className="text-body text-text-secondary">Backup now, verify the audit chain, run health checks. Every click is logged to <code>ADMIN</code>.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-royal" />
              <h2 className="font-display font-bold text-title-sm text-text">Backup</h2>
            </div>
            <p className="text-caption text-text-secondary">
              The in-memory store auto-snapshots to disk on every mutation (debounced 1.5s, last 12 snapshots kept).
              Click below to force an immediate snapshot — useful before a planned restart.
            </p>
            <SystemActions kind="backup" />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-success" />
              <h2 className="font-display font-bold text-title-sm text-text">Audit chain integrity</h2>
            </div>
            <p className="text-caption text-text-secondary">
              Each audit entry is HMAC-chained to the previous one. Walking the chain from genesis to head should return
              valid; any break would indicate tampering or restoration from a non-matching backup.
            </p>
            <SystemActions kind="verify-chain" />
          </CardBody>
        </Card>
      </div>

      <Card className="border border-info-border bg-info-bg/15">
        <CardBody className="p-4 text-caption text-text-secondary space-y-1">
          <p className="text-text font-bold">Production posture</p>
          <p>Backup → Postgres point-in-time recovery + audit log replicated synchronously across two regions. Audit chain → same HMAC scheme persisted as `prevHash` + `entryHash` columns; nightly cron re-verifies the entire chain and pages on-call if a break is detected.</p>
        </CardBody>
      </Card>
    </div>
  );
}
