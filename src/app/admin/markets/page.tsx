import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { I } from "@/components/ui/glyphs";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { listMarkets, impliedYesPct, seedDemoMarkets, type MarketCategory } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { formatDateTime } from "@/lib/utils";
import { EmergencyVoidControl } from "./emergency-void-control";

export const metadata = { title: "Admin · Markets curation" };
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
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
  await seedDemoMarkets();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  // Validate against closed sets so a typo'd ?status=LIV doesn't silently
  // erase the table — fall back to "no filter" instead.
  const statusFilter = (STATUS_OPTIONS as readonly string[]).includes(sp.status ?? "") ? sp.status : "";
  const categoryFilter = (CATEGORY_OPTIONS as readonly string[]).includes(sp.category ?? "")
    ? (sp.category as MarketCategory)
    : "";

  const all = await listMarkets();
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
  const totalVolume = all.reduce((s, m) => s + m.yesPool + m.noPool, 0);
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
          <AdminKpi label="Total volume" sw="Jumla ya ujazo" value={fmtTzs(totalVolume)} />
        </div>

        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title (EN / SW) or mkt_… id"
                aria-label="Search markets"
                className="w-full h-9 pl-9 pr-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
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
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>
              Search
            </button>
            {hasFilter && (
              <a href="/admin/markets" className="btn btn-ghost btn-sm" style={{ height: 36 }}>
                Clear
              </a>
            )}
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
                  <SortTh field="volume" label="Volume" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" align="right" />
                  <SortTh field="closes" label="Closes" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <SortTh field="status" label="Status" current={sort} dir={dir} sp={sp} baseHref="/admin/markets" />
                  <th className="text-left">Source</th>
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
                      </td>
                      <td className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">{m.category}</td>
                      <td>
                        <ProbabilityBar yesPct={yes} size="micro" resolved={m.status === "RESOLVED"} />
                        <p className="mt-1 font-mono text-[10px] text-text-subtle">{yes}% YES</p>
                      </td>
                      <td className="text-right font-mono tabular-nums text-text">{fmtTzs(m.yesPool + m.noPool)}</td>
                      <td className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {m.status === "LIVE" ? `${timeLeftStr(m.resolutionAt)}` : fmtTime(m.resolutionAt)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          m.status === "LIVE" ? "border-yes-700 bg-yes-500/15 text-yes-300"
                          : m.status === "RESOLVED" ? "border-gold-subtleHover bg-gold-subtle text-gold-300"
                          : m.status === "CLOSED" ? "border-warning-border bg-warning-bg/40 text-warning-fg"
                          : "border-border bg-bg-overlay text-text-muted"
                        }`}>{m.status}</span>
                      </td>
                      <td>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                          <I.ext size={11} />
                        </a>
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
                    <td colSpan={8} className="!py-6 text-center text-text-tertiary">No markets match the current filter.</td>
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
