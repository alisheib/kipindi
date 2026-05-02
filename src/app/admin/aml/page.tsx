import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/server/store";
import { formatTzs } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Admin · AML queue" };
export const dynamic = "force-dynamic";

export default function AdminAmlPage() {
  const inReview = db.txn.listByStatus("AML_REVIEW");

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "AML / EDD queue" }]} />
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-title-lg text-text">AML / EDD queue</h1>
          <p className="text-body text-text-secondary">Transactions in <code>AML_REVIEW</code> awaiting compliance officer sign-off.</p>
        </div>
        <Chip size="md" variant={inReview.length > 0 ? "warning" : "neutral"}>{inReview.length} pending</Chip>
      </header>

      <Card>
        <CardBody className="p-0">
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
                {inReview.map((t) => (
                  <tr key={t.id} className="border-t border-border-subtle/50">
                    <td className="p-3 font-mono whitespace-nowrap">{t.createdAt.replace("T", " ").slice(0, 19)}</td>
                    <td className="p-3 font-medium text-text">{t.type}</td>
                    <td className="p-3 font-mono">{t.userId.slice(0, 16)}</td>
                    <td className="p-3 font-mono tabular text-right">{formatTzs(t.amount)}</td>
                    <td className="p-3">{t.provider ?? "—"}</td>
                    <td className="p-3">{t.amlReason ?? "—"}</td>
                    <td className="p-3 space-x-2">
                      <button type="button" className="text-success hover:underline font-semibold" disabled>Approve</button>
                      <button type="button" className="text-danger hover:underline font-semibold" disabled>Reject</button>
                    </td>
                  </tr>
                ))}
                {inReview.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-text-tertiary">No transactions awaiting review.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-warning-border bg-warning-bg/15">
        <CardBody className="p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
          <div className="text-caption text-text-secondary">
            <p className="text-text font-bold">Two-person approval</p>
            <p>Approve / Reject are disabled in this build. In production, approval requires (a) the on-shift compliance officer, plus (b) the AML lead for amounts ≥ TZS 5M. Both clicks are recorded in <code>ADMIN</code> audit with the reviewer's user-id, IP, and reason.</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
