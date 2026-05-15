import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { GenerateButton } from "../reports/generate-button";
import { getAuditPage, verifyChain, type AuditCategory } from "@/lib/server/audit";
import { MarketStats, type Stat } from "@/components/markets/market-stats";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";

export const metadata = { title: "Admin · Audit log" };
export const dynamic = "force-dynamic";

const CATEGORIES: AuditCategory[] = ["AUTH", "KYC", "WALLET", "BET", "ADMIN", "COMPLIANCE", "SECURITY", "SYSTEM"];

const CAT_VARIANT: Record<AuditCategory, "yes" | "no" | "live" | "resolved" | "pending" | "objection" | "neutral"> = {
  AUTH:       "pending",
  KYC:        "pending",
  WALLET:     "neutral",
  BET:        "yes",
  ADMIN:      "objection",
  COMPLIANCE: "objection",
  SECURITY:   "live",
  SYSTEM:     "neutral",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; actorId?: string }>;
}) {
  const sp = await searchParams;
  // Validate against the closed CATEGORIES set so a stray ?category=BOGUS
  // does not silently render an empty page (operator wonders why).
  const rawCategory = sp.category;
  const category: AuditCategory | undefined =
    rawCategory && (CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as AuditCategory)
      : undefined;
  const invalidCategory = !!rawCategory && !category;
  // actorId: shape-check (usr_…) so the panel doesn't try to render a
  // hostile string back into the page.
  const actorId = typeof sp.actorId === "string" && /^[a-zA-Z0-9_]{4,40}$/.test(sp.actorId) ? sp.actorId : undefined;
  const entries = getAuditPage({ limit: 500, category, actorId });
  const allEntries = getAuditPage({ limit: 100_000 });
  const chain = verifyChain();

  // KPI stats — last 24h activity by category
  const cutoff = Date.now() - 24 * 3600_000;
  const recent24 = allEntries.filter((e) => Date.parse(e.createdAt) >= cutoff);
  const byCat: Record<string, number> = {};
  for (const e of recent24) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const stats: Stat[] = [
    { k: "Total entries",   v: allEntries.length.toLocaleString(), tone: "neutral",  delta: "lifetime" },
    { k: "Last 24h",         v: recent24.length.toLocaleString(),    tone: "yes",       delta: topCat ? `top: ${topCat[0]}` : "no activity" },
    { k: "Chain integrity", v: chain.valid ? "Valid" : "BROKEN",     tone: chain.valid ? "yes" : "no", delta: chain.valid ? "HMAC-chained" : "tampering detected" },
  ];

  return (
    <>
      <AdminPageHead
        title="Audit log"
        sw="Kumbukumbu · append-only HMAC-chained"
        period={false}
        actions={<GenerateButton id="iso-audit" />}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        <MarketStats stats={stats} />

        {/* Category filters — kit pill row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <a href="/admin/audit" className={chipClass(!category)}>All</a>
          {CATEGORIES.map((c) => (
            <a key={c} href={`/admin/audit?category=${c}`} className={chipClass(category === c)}>{c}</a>
          ))}
          {actorId && (
            <span className="ml-2 font-mono text-[10px] tracking-[0.10em] text-text-subtle">
              actor: <span className="text-text">{actorId.slice(0, 14)}…</span>
              <a href={`/admin/audit${category ? `?category=${category}` : ""}`} className="text-yes-300 hover:text-yes-200 ml-2">clear</a>
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
            {entries.length} entries
          </span>
        </div>
        {invalidCategory && (
          <p className="font-mono text-[11px] text-warning-fg bg-warning-bg/15 border border-warning-border rounded-md px-3 py-2">
            Unknown audit category &mdash; showing all entries. Pick one from the chip row above.
          </p>
        )}

        <AdminCard padding="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle bg-bg-overlay border-b border-border">
                <tr>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">Cat.</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Actor</th>
                  <th className="text-left p-3">Target</th>
                  <th className="text-left p-3">Payload</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-b-0 hover:bg-bg-overlay/50 transition-colors">
                    <td className="p-3 font-mono whitespace-nowrap text-text-subtle">{e.createdAt.replace("T", " ").slice(0, 19)}</td>
                    <td className="p-3">
                      <Chip size="sm" variant={CAT_VARIANT[e.category]}>{e.category}</Chip>
                    </td>
                    <td className="p-3 font-medium text-text">{e.action}</td>
                    <td className="p-3 font-mono">
                      {e.actorId ? (
                        <a href={`/admin/audit?actorId=${e.actorId}`} className="hover:text-yes-300 hover:underline">
                          {e.actorId.slice(0, 16)}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="p-3 font-mono">{e.targetType ? `${e.targetType}#${e.targetId?.slice(0, 12)}` : "—"}</td>
                    <td className="p-3 font-mono text-text-subtle max-w-[360px] truncate">{e.payload ? JSON.stringify(e.payload) : "—"}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        kind="audit"
                        title="No audit entries match this filter"
                        titleSw="Hakuna kumbukumbu zinazolingana na chujio hili"
                        body="Try clearing the actor or category filter to see the full chain."
                      />
                    </td>
                  </tr>
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
    "inline-flex items-center px-3 h-7 rounded-pill border font-mono text-[10px] tracking-[0.14em] uppercase font-semibold transition-colors",
    active
      ? "border-teal-500 bg-teal-500/15 text-teal-300"
      : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text",
  ].join(" ");
}
