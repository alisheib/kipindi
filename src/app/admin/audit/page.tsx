import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
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
    <>
      <AdminPageHead
        title="Audit log"
        sw="Kumbukumbu · append-only HMAC-chained"
        period={false}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <a href="/admin/audit" className={chipClass(!category)}>All</a>
          {CATEGORIES.map((c) => (
            <a key={c} href={`/admin/audit?category=${c}`} className={chipClass(category === c)}>{c}</a>
          ))}
          {actorId && (
            <span className="ml-2 font-mono text-micro text-text-tertiary">
              actor: <span className="text-text">{actorId}</span>
              <a href={`/admin/audit${category ? `?category=${category}` : ""}`} className="text-royal hover:underline ml-2">clear</a>
            </span>
          )}
          <span className="ml-auto font-mono text-micro tracking-wider text-text-tertiary">{entries.length} entries</span>
        </div>

        <AdminCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary bg-bg-sunken/50 border-b border-border-subtle">
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
                  <tr key={e.id} className="border-b border-border-subtle/40 last:border-b-0 hover:bg-surface-hover">
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
        </AdminCard>
      </div>
    </>
  );
}

function chipClass(active: boolean) {
  return [
    "inline-flex items-center px-2.5 h-7 rounded-md border font-mono text-micro tracking-[0.10em] uppercase transition-colors",
    active ? "bg-bg-sunken text-onBrand border-bg-sunken" : "border-border bg-bg-elevated text-text-tertiary hover:bg-surface-hover hover:text-text",
  ].join(" ");
}
