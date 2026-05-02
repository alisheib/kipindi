import { Card, CardBody } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Chip } from "@/components/ui/chip";
import { getAuditPage, type AuditCategory } from "@/lib/server/audit";

export const metadata = { title: "Admin · Audit log" };
export const dynamic = "force-dynamic";

const CATEGORIES: AuditCategory[] = ["AUTH", "KYC", "WALLET", "BET", "ADMIN", "COMPLIANCE", "SECURITY", "SYSTEM"];

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ category?: string; actorId?: string }> }) {
  const sp = await searchParams;
  const category = (sp.category as AuditCategory | undefined) ?? undefined;
  const actorId = sp.actorId ?? undefined;
  const entries = getAuditPage({ limit: 500, category, actorId });

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]} />
      <header>
        <h1 className="font-display font-bold text-title-lg text-text">Audit log · Kumbukumbu</h1>
        <p className="text-body text-text-secondary">Append-only. Each row = one state change in the system.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <a href="/admin/audit" className={chipClass(!category)}>All</a>
        {CATEGORIES.map((c) => (
          <a key={c} href={`/admin/audit?category=${c}`} className={chipClass(category === c)}>{c}</a>
        ))}
      </div>

      {actorId && (
        <p className="text-caption text-text-secondary">
          Filtered by actor <span className="font-mono">{actorId}</span>{" "}
          <a href={`/admin/audit${category ? `?category=${category}` : ""}`} className="text-royal hover:underline ml-2">clear</a>
        </p>
      )}

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="text-text-tertiary uppercase tracking-wide bg-bg-sunken/50">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Cat.</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Actor</th>
                  <th className="text-left p-3">Target</th>
                  <th className="text-left p-3">Payload</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border-subtle/50 hover:bg-surface-2/40">
                    <td className="p-3 font-mono whitespace-nowrap">{e.createdAt.replace("T", " ").slice(0, 19)}</td>
                    <td className="p-3"><span className="font-mono text-micro tracking-wide">{e.category}</span></td>
                    <td className="p-3 font-medium text-text">{e.action}</td>
                    <td className="p-3 font-mono">
                      {e.actorId ? <a href={`/admin/audit?actorId=${e.actorId}`} className="hover:text-royal hover:underline">{e.actorId.slice(0, 16)}</a> : "—"}
                    </td>
                    <td className="p-3 font-mono">{e.targetType ? `${e.targetType}#${e.targetId?.slice(0, 12)}` : "—"}</td>
                    <td className="p-3 font-mono text-text-tertiary max-w-[360px] truncate">{e.payload ? JSON.stringify(e.payload) : "—"}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-text-tertiary">No entries match the current filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function chipClass(active: boolean) {
  return [
    "inline-flex items-center px-3 h-7 rounded-full border text-caption font-medium transition-colors",
    active ? "bg-royal text-onBrand border-royal" : "border-border bg-surface text-text-secondary hover:bg-surface-2 hover:text-text",
  ].join(" ");
}
