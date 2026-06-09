import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { I } from "@/components/ui/glyphs";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { listMarkets, impliedYesPct, seedDemoMarkets, type MarketCategory } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";

export const metadata = { title: "Admin · Markets curation" };
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

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
  searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }>;
}) {
  seedDemoMarkets();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  // Validate against closed sets so a typo'd ?status=LIV doesn't silently
  // erase the table — fall back to "no filter" instead.
  const statusFilter = (STATUS_OPTIONS as readonly string[]).includes(sp.status ?? "") ? sp.status : "";
  const categoryFilter = (CATEGORY_OPTIONS as readonly string[]).includes(sp.category ?? "")
    ? (sp.category as MarketCategory)
    : "";

  const all = listMarkets();
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

  // Paginate
  const page = parsePage(sp.page, filtered.length);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/markets", { q: sp.q, status: sp.status, category: sp.category });

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
          <Link
            href="/admin/markets/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-500 px-3 font-semibold text-white text-[12px] hover:bg-teal-400 transition-colors"
          >
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

        <AdminCard>
          <form className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[260px]">
              <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title (EN / SW) or mkt_… id"
                aria-label="Search markets"
                className="w-full h-10 pl-9 pr-3 rounded-md bg-surface border border-border text-text font-mono text-body-sm focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
              />
            </div>
            <div className="w-[160px]">
              <Select name="status" defaultValue={statusFilter} size="sm" placeholder="All statuses"
                options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]} />
            </div>
            <div className="w-[160px]">
              <Select name="category" defaultValue={categoryFilter} size="sm" placeholder="All categories"
                options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]} />
            </div>
            <button type="submit" className="h-10 px-4 rounded-md bg-royal text-onBrand font-semibold text-body-sm hover:bg-royal-hover transition-colors">
              Search
            </button>
            {hasFilter && (
              <a href="/admin/markets" className="h-10 px-4 inline-flex items-center rounded-md border border-border text-text-secondary text-body-sm hover:bg-surface-hover">
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
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-bg-overlay">
                <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                  <th className="text-left p-3">Market</th>
                  <th className="text-left p-3">Cat.</th>
                  <th className="text-left p-3 min-w-[140px]">Probability</th>
                  <th className="text-right p-3">Volume</th>
                  <th className="text-left p-3">Closes</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((m) => {
                  const yes = impliedYesPct(m);
                  return (
                    <tr key={m.id} className="border-b border-border last:border-b-0 align-top">
                      <td className="p-3 max-w-[360px]">
                        <Link href={`/markets/${m.id}` as never} className="font-display font-semibold text-text hover:text-teal-300 line-clamp-2">{m.titleEn}</Link>
                        {m.titleSw && <p className="mt-0.5 text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>}
                      </td>
                      <td className="p-3 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">{m.category}</td>
                      <td className="p-3">
                        <ProbabilityBar yesPct={yes} size="micro" resolved={m.status === "RESOLVED"} />
                        <p className="mt-1 font-mono text-[10px] text-text-subtle">{yes}% YES</p>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-text">{fmtTzs(m.yesPool + m.noPool)}</td>
                      <td className="p-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {m.status === "LIVE" ? `${timeLeftStr(m.resolutionAt)}` : fmtTime(m.resolutionAt)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          m.status === "LIVE" ? "border-yes-700 bg-yes-500/15 text-yes-300"
                          : m.status === "RESOLVED" ? "border-gold-subtleHover bg-gold-subtle text-gold-300"
                          : m.status === "CLOSED" ? "border-warning-border bg-warning-bg/40 text-warning-fg"
                          : "border-border bg-bg-overlay text-text-muted"
                        }`}>{m.status}</span>
                      </td>
                      <td className="p-3">
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                          <I.ext size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-text-tertiary">No markets match the current filter.</td>
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
