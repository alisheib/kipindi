import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { RefreshButton } from "@/components/admin/refresh-button";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { formatTzs, formatDateTime } from "@/lib/utils";
import { EmergencyVoidControl } from "./emergency-void-control";

export const metadata = { title: "Admin · Markets curation" };
export const dynamic = "force-dynamic";

const fmtTime = (iso: string) => formatDateTime(iso);

const STATUS_OPTIONS = ["LIVE", "CLOSED", "RESOLVED", "VOIDED"] as const;
const CATEGORY_OPTIONS: readonly MarketCategory[] = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"];

function timeLeftStr(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / (24 * 3600_000));
  if (d > 0) return `${d}d`;
  const h = Math.floor(ms / 3600_000);
  return `${h}h`;
}

export default async function AdminMarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  // Validate against closed sets so a typo'd ?status=LIV doesn't silently
  // erase the table — fall back to "no filter" instead.
  const statusFilter = (STATUS_OPTIONS as readonly string[]).includes(sp.status ?? "") ? sp.status : "";
  const categoryFilter = (CATEGORY_OPTIONS as readonly string[]).includes(sp.category ?? "")
    ? (sp.category as MarketCategory)
    : "";

  const all = await listMarkets().catch(() => []);
  const filtered = all.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (!query) return true;
    return (
      m.id.toLowerCase().includes(query) ||
      m.titleEn.toLowerCase().includes(query) ||
      (m.titleSw ?? "").toLowerCase().includes(query)
    );
  });

  // Sort (URL-driven), then paginate.
  const { sort, dir } = parseSort(sp, ["volume", "closes", "status", "category", "market"] as const, "closes", "asc");
  const sorted = applySort(filtered, sort, dir, {
    volume: (m) => m.yesPool + m.noPool,
    closes: (m) => m.resolutionAt,
    status: (m) => m.status,
    category: (m) => m.category,
    market: (m) => m.titleEn.toLowerCase(),
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/markets", { q: sp.q, status: sp.status, category: sp.category, sort: sp.sort, dir: sp.dir });

  const live = all.filter((m) => m.status === "LIVE");
  const closed = all.filter((m) => m.status === "CLOSED");
  const resolved = all.filter((m) => m.status === "RESOLVED");
  const totalPool = all.reduce((s, m) => s + m.yesPool + m.noPool, 0);
  const hasFilter = !!query || !!statusFilter || !!categoryFilter;

  return (
    <>
      <AdminPageHead
        title="Markets · curation queue"
        sw="Soko · foleni ya uongozaji"
        period={false}
        actions={
          <Link href="/admin/markets/new" className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
            <I.plus s={14} />
            New market
          </Link>
        }
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Live"      sw="Hai"           value={String(live.length)} />
          <AdminKpi label="Awaiting resolution" sw="Inangoja" value={String(closed.length)} />
          <AdminKpi label="Resolved"  sw="Imetatuliwa"   value={String(resolved.length)} />
          <AdminKpi label="Total pool" sw="Jumla ya dimbwi" value={formatTzs(totalPool)} />
        </div>

        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search size={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title (EN / SW) or mkt_… id"
                aria-label="Search markets"
                className="h-8 w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Select name="status" defaultValue={statusFilter} size="xs" placeholder="All statuses"
                options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]} />
            </div>
            <div className="w-full sm:w-[160px]">
              <Select name="category" defaultValue={categoryFilter} size="xs" placeholder="All categories"
                options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm h-8">
              Search
            </button>
            {hasFilter && (
              <a href="/admin/markets" className="btn btn-ghost btn-sm h-8">
                Clear
              </a>
            )}
            <RefreshButton className="ml-auto" />
          </form>
          <p className="mt-2 font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
            {filtered.length} of {all.length} {all.length === 1 ? "market" : "markets"}
          </p>
        </AdminCard>

        <AdminCard title="All markets" sw="Soko zote" padding="p-0">
          <div className="overflow-x-auto">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <SortTh field="market" label="Market" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <SortTh field="category" label="Cat." current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <th className="text-left min-w-[140px]">Probability</th>
                  <SortTh field="volume" label="Pool" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" align="right" />
                  <SortTh field="closes" label="Bets close · Resolves" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <SortTh field="status" label="Status" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <th className="text-left">Source</th>
                  <th className="text-left">Predictors ↗</th>
                  <th className="text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((m) => {
                  const yes = impliedYesPct(m);
                  return (
                    <tr key={m.id} className="align-top">
                      <td className="max-w-[360px]">
                        <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-teal-300 line-clamp-2">{m.titleEn}</Link>
                        {m.titleSw && <p className="mt-0.5 text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>}
                        {m.titleZh && <p className="mt-0.5 text-[12px] italic text-text-subtle line-clamp-1">{m.titleZh}</p>}
                        <Link href={`/admin/markets/${m.id}` as never} className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-400 hover:text-brand-300 transition-colors">
                          <I.users size={10} /> View predictors
                        </Link>
                      </td>
                      <td className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">{m.category}</td>
                      <td>
                        <ProbabilityBar yesPct={yes} size="micro" resolved={m.status === "RESOLVED"} />
                        <p className="mt-1 font-mono text-[10px] text-text-subtle">{yes}% YES</p>
                      </td>
                      <td className="text-right font-mono tabular-nums text-text">{formatTzs(m.yesPool + m.noPool)}</td>
                      <td className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                        <div>
                          <span className="text-text-subtle">Bets:</span>{" "}
                          {fmtTime(m.selectionClosedAt ?? m.resolutionAt)}
                          {m.status === "LIVE" && <span className="ml-1 text-text-subtle">({timeLeftStr(m.selectionClosedAt ?? m.resolutionAt)})</span>}
                        </div>
                        <div className="mt-0.5">
                          <span className="text-text-subtle">Res:</span> {fmtTime(m.resolutionAt)}
                        </div>
                      </td>
                      <td>
                        <Chip size="sm" variant={
                          m.status === "LIVE" ? "success"
                          : m.status === "RESOLVED" ? "gold"
                          : m.status === "CLOSED" ? "warning"
                          : "neutral"
                        }>{m.status}</Chip>
                      </td>
                      <td>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                          <I.ext size={11} />
                        </a>
                      </td>
                      <td>
                        <Link
                          href={`/admin/markets/${m.id}` as never}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-overlay px-2 py-1 font-mono text-[10.5px] font-semibold text-text-muted hover:border-brand-500 hover:text-text transition-colors whitespace-nowrap"
                        >
                          <I.users size={11} />
                          {m.predictorCount} {m.predictorCount === 1 ? "predictor" : "predictors"}
                        </Link>
                      </td>
                      <td>
                        {(m.status === "LIVE" || m.status === "CLOSED") ? (
                          <EmergencyVoidControl marketId={m.id} title={m.titleEn} />
                        ) : (
                          <span className="font-mono text-[10.5px] text-text-tertiary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="!py-6 text-center text-text-tertiary">No markets match the current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination total={filtered.length} page={page} baseHref={baseHref} />
        </AdminCard>
      </div>
    </>
  );
}
