import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { GenerateButton } from "../reports/generate-button";
import Link from "next/link";
import { getAuditPage, verifyChain, type AuditCategory } from "@/lib/server/audit";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { formatDateTime } from "@/lib/utils";

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
  searchParams: Promise<{ category?: string; actorId?: string; page?: string; sort?: string; dir?: string }>;
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
  const allFiltered = getAuditPage({ limit: 100_000, category, actorId });
  const allEntries = getAuditPage({ limit: 100_000 });
  const { sort, dir } = parseSort(sp, ["time", "category", "action", "actor"] as const, "time", "desc");
  const sortedFiltered = applySort(allFiltered, sort, dir, {
    time: (e) => e.createdAt,
    category: (e) => e.category,
    action: (e) => e.action,
    actor: (e) => e.actorId ?? "",
  });
  const page = parsePage(sp.page, sortedFiltered.length);
  const entries = sortedFiltered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/audit", { category: sp.category, actorId: sp.actorId, sort: sp.sort, dir: sp.dir });
  const chain = verifyChain();

  // KPI stats — last 24h activity by category
  const cutoff = Date.now() - 24 * 3600_000;
  const recent24 = allEntries.filter((e) => Date.parse(e.createdAt) >= cutoff);
  const byCat: Record<string, number> = {};
  for (const e of recent24) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <AdminPageHead
        title="Audit log"
        sw="Kumbukumbu · append-only HMAC-chained"
        period={false}
        actions={<GenerateButton id="iso-audit" />}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Summary KPIs — kit AdminKpi grid, consistent with every other admin
            screen (this page previously used the player-side MarketStats shell). */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AdminKpi label="Total entries" sw="Jumla" value={allEntries.length.toLocaleString()} delta="lifetime" spark={false} />
          <AdminKpi label="Last 24h" sw="Saa 24" value={recent24.length.toLocaleString()} delta={topCat ? `top: ${topCat[0]}` : "no activity"} spark={false} />
          <AdminKpi
            label="Chain integrity"
            sw="Uadilifu"
            value={chain.valid ? "Valid" : "BROKEN"}
            tone={chain.valid ? "success" : "danger"}
            delta={chain.valid ? "HMAC-chained" : "tampering detected"}
            deltaDir={chain.valid ? "up" : "down"}
            spark={false}
          />
        </div>

        {/* Category filters — kit Chip pills wrapped as nav links */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href="/admin/audit" className="transition-opacity hover:opacity-80">
            <Chip size="lg" variant={!category ? "brand" : "neutral"} selected={!category}>All</Chip>
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/admin/audit?category=${c}`} className="transition-opacity hover:opacity-80">
              <Chip size="lg" variant={category === c ? "brand" : "neutral"} selected={category === c}>{c}</Chip>
            </Link>
          ))}
          {actorId && (
            <span className="ml-2 font-mono text-[10px] tracking-[0.10em] text-text-subtle">
              actor: <span className="text-text">{actorId.slice(0, 14)}…</span>
              <a href={`/admin/audit${category ? `?category=${category}` : ""}`} className="text-yes-300 hover:text-yes-200 ml-2">clear</a>
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
            {allFiltered.length.toLocaleString()} entries
          </span>
        </div>
        {invalidCategory && (
          <p className="font-mono text-[11px] text-warning-fg bg-warning-bg/15 border border-warning-border rounded-md px-3 py-2">
            Unknown audit category &mdash; showing all entries. Pick one from the chip row above.
          </p>
        )}

        <AdminCard padding="p-0">
          <ScrollX label="Audit log">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <SortTh field="time" label="Time" current={sort} dir={dir} sp={sp} baseHref="/admin/audit" />
                  <SortTh field="category" label="Cat." current={sort} dir={dir} sp={sp} baseHref="/admin/audit" />
                  <SortTh field="action" label="Action" current={sort} dir={dir} sp={sp} baseHref="/admin/audit" />
                  <SortTh field="actor" label="Actor" current={sort} dir={dir} sp={sp} baseHref="/admin/audit" />
                  <th className="text-left">Target</th>
                  <th className="text-left">Payload</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono whitespace-nowrap text-text-subtle">{formatDateTime(e.createdAt)}</td>
                    <td>
                      <Chip size="sm" variant={CAT_VARIANT[e.category]}>{e.category}</Chip>
                    </td>
                    <td className="font-medium text-text">{e.action}</td>
                    <td className="font-mono">
                      {e.actorId ? (
                        <a href={`/admin/audit?actorId=${e.actorId}`} className="hover:text-yes-300 hover:underline">
                          {e.actorId.slice(0, 16)}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="font-mono">{e.targetType ? `${e.targetType}#${e.targetId?.slice(0, 12)}` : "—"}</td>
                    <td className="font-mono text-text-subtle max-w-[360px] truncate">{e.payload ? JSON.stringify(e.payload) : "—"}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="!p-0">
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
          </ScrollX>
          <AdminPagination total={allFiltered.length} page={page} baseHref={baseHref} />
        </AdminCard>
      </div>
    </>
  );
}
