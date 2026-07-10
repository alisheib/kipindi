import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { Select } from "@/components/ui/select";
import { I } from "@/components/ui/glyphs";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { getMarket, listPositionsForMarket, impliedYesPct } from "@/lib/server/market-service";
import { db } from "@/lib/server/store";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { formatTzs, formatDateTime } from "@/lib/utils";
import { SELECTION } from "@/lib/admin-status-lexicon";
import { MarketStatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let m: Awaited<ReturnType<typeof getMarket>> | null = null;
  try { m = await getMarket(id); } catch { /* graceful */ }
  if (!m) return { title: "Market not found" };
  return { title: `Admin · Predictors — ${m.titleEn.slice(0, 50)}` };
}

const SIDE_OPTIONS = [
  { value: "", label: "Both sides" },
  { value: "YES", label: "YES only" },
  { value: "NO", label: "NO only" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "WIN", label: "Win" },
  { value: "LOSS", label: "Loss" },
  { value: "VOID", label: "Void" },
  { value: "CASHED_OUT", label: "Cashed out" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  OPEN: "info",
  WIN: "success",
  LOSS: "danger",
  VOID: "neutral",
  CASHED_OUT: "warning",
};

function maskPhone(p: string) {
  if (p.length <= 6) return p;
  return `${p.slice(0, 4)}*****${p.slice(-2)}`;
}

export default async function MarketPredictorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; side?: string; status?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const { id } = await params;
  let m: Awaited<ReturnType<typeof getMarket>> | null = null;
  try { m = await getMarket(id); } catch { /* graceful */ }
  if (!m) notFound();

  const sp = await searchParams;
  const query = (sp.q ?? "").trim().toLowerCase();
  const sideFilter = ["YES", "NO"].includes(sp.side ?? "") ? sp.side! : "";
  const statusFilter = ["OPEN", "WIN", "LOSS", "VOID", "CASHED_OUT"].includes(sp.status ?? "") ? sp.status! : "";

  const allPositions = await listPositionsForMarket(id).catch(() => []);

  // Enrich with user data — batched to avoid N+1 on large markets
  const userIds = [...new Set(allPositions.map((p) => p.userId))];
  const userMap = new Map<string, { displayName: string | null; phoneE164: string; id: string }>();
  for (const uid of userIds) {
    try {
      const u = await db.user.findById(uid);
      if (u) userMap.set(uid, { displayName: u.displayName, phoneE164: u.phoneE164, id: u.id });
    } catch { /* graceful */ }
  }

  // Filter
  const filtered = allPositions.filter((p) => {
    if (sideFilter && p.side !== sideFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (query) {
      const u = userMap.get(p.userId);
      if (!u) return false;
      const label = displayLabel(u).toLowerCase();
      if (
        !u.phoneE164.includes(query) &&
        !u.id.toLowerCase().includes(query) &&
        !label.includes(query)
      ) return false;
    }
    return true;
  });

  // Sort
  const { sort, dir } = parseSort(sp, ["stake", "payout", "placed", "side", "status"] as const, "placed", "desc");
  const sorted = applySort(filtered, sort, dir, {
    stake:   (p) => p.stake,
    payout:  (p) => p.finalPayout ?? p.potentialPayout,
    placed:  (p) => p.placedAt,
    side:    (p) => p.side,
    status:  (p) => p.status,
  });

  // Paginate
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref(`/admin/markets/${id}`, { q: sp.q, side: sp.side, status: sp.status, sort: sp.sort, dir: sp.dir });
  const hasFilter = !!query || !!sideFilter || !!statusFilter;

  // KPIs
  const yes = impliedYesPct(m);
  const yesPositions = allPositions.filter((p) => p.side === "YES");
  const noPositions  = allPositions.filter((p) => p.side === "NO");
  const yesStaked    = yesPositions.reduce((s, p) => s + p.stake, 0);
  const noStaked     = noPositions.reduce((s,  p) => s + p.stake, 0);
  const openCount    = allPositions.filter((p) => p.status === "OPEN").length;
  const totalPool    = m.yesPool + m.noPool;

  return (
    <>
      <AdminPageHead
        title="Market predictors"
        sw="Watabiri wa soko"
        period={false}
        actions={
          <Link href="/admin/markets" className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
            <I.chevronLeft s={13} />
            All markets
          </Link>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">

        {/* Market summary */}
        <AdminCard padding="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <MarketStatusBadge status={m.status} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{m.category}</span>
              </div>
              <h2 className="font-display text-[17px] font-semibold text-text leading-snug">{m.titleEn}</h2>
              {m.titleSw && <p className="mt-0.5 text-[12px] italic text-text-subtle">{m.titleSw}</p>}
              {m.titleZh && <p className="mt-0.5 text-[12px] italic text-text-subtle">{m.titleZh}</p>}
              <p className="mt-1.5 font-mono text-[11px] text-text-subtle">
                {SELECTION.betsClose.en} {formatDateTime(m.selectionClosedAt ?? m.resolutionAt)} · Resolves {formatDateTime(m.resolutionAt)}
                {m.resolvedOutcome && (
                  <span className={`ml-3 font-bold ${m.resolvedOutcome === "YES" ? "text-yes-300" : m.resolvedOutcome === "NO" ? "text-no-300" : "text-text-muted"}`}>
                    → {m.resolvedOutcome}
                  </span>
                )}
              </p>
            </div>
            <a
              href={m.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200"
            >
              Source <I.ext size={11} />
            </a>
          </div>
          <div className="mt-3">
            <ProbabilityBar yesPct={yes} size="micro" resolved={m.status === "RESOLVED"} />
            <p className="mt-1 font-mono text-[10px] text-text-subtle">{yes}% YES · {100 - yes}% NO</p>
          </div>
          {/* Pool breakdown — YES/NO/total player volume */}
          <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 font-mono text-[10.5px]">
            <div>
              <span className="text-text-subtle uppercase tracking-[0.12em]">YES pool · </span>
              <span className="text-yes-300 font-semibold">{formatTzs(m.yesPool)}</span>
            </div>
            <div>
              <span className="text-text-subtle uppercase tracking-[0.12em]">NO pool · </span>
              <span className="text-no-300 font-semibold">{formatTzs(m.noPool)}</span>
            </div>
            <div>
              <span className="text-text-subtle uppercase tracking-[0.12em]">Total pool · </span>
              <span className="text-text font-semibold">{formatTzs(totalPool)}</span>
            </div>
          </div>
        </AdminCard>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Predictors"     sw="Watabiri"   value={String(m.predictorCount)} />
          <AdminKpi label="Open positions" sw="Wazi"       value={String(openCount)} />
          <AdminKpi label="YES staked"     sw="Dau la NDIO"  value={formatTzs(yesStaked)} />
          <AdminKpi label="NO staked"      sw="Dau la HAPANA" value={formatTzs(noStaked)} />
        </div>

        {/* Filters */}
        <AdminCard padding="p-3">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
              <I.search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Phone, display name or usr_…"
                aria-label="Search predictors"
                className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-inset border border-border text-text font-mono text-body-sm focus:outline-none admin-focus transition-colors"
              />
            </div>
            <div className="w-full sm:w-[140px]">
              <Select name="side" defaultValue={sideFilter} size="xs" placeholder="Both sides" options={SIDE_OPTIONS} />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select name="status" defaultValue={statusFilter} size="xs" placeholder="All statuses" options={STATUS_OPTIONS} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Filter</button>
            {hasFilter && (
              <a href={`/admin/markets/${id}`} className="btn btn-ghost btn-sm">Clear</a>
            )}
          </form>
          <p className="mt-2 font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
            {filtered.length} of {allPositions.length} {allPositions.length === 1 ? "position" : "positions"}
          </p>
        </AdminCard>

        {/* Table */}
        <AdminCard padding="p-0">
          <ScrollX label="Market positions">
            <table className="admin-tbl">
              <thead>
                <tr>
                  <th className="text-left">Ref</th>
                  <th className="text-left">Predictor</th>
                  <th className="text-left">Phone</th>
                  <SortTh field="side"   label="Side"    current={sort} dir={dir} sp={sp} baseHref={`/admin/markets/${id}`} />
                  <SortTh field="stake"  label="Stake"   current={sort} dir={dir} sp={sp} baseHref={`/admin/markets/${id}`} align="right" />
                  <SortTh field="payout" label="Payout"  current={sort} dir={dir} sp={sp} baseHref={`/admin/markets/${id}`} align="right" />
                  <SortTh field="status" label="Status"  current={sort} dir={dir} sp={sp} baseHref={`/admin/markets/${id}`} />
                  <SortTh field="placed" label="Placed"  current={sort} dir={dir} sp={sp} baseHref={`/admin/markets/${id}`} />
                  <th className="text-left">Profile</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const u = userMap.get(p.userId);
                  const label = u ? displayLabel(u) : p.userId;
                  const initials = u ? displayInitials(u) : "?";
                  const isAutoHandle = !((u?.displayName ?? "").trim().length > 0);
                  const payoutVal = p.status === "OPEN"
                    ? p.potentialPayout
                    : (p.finalPayout ?? null);
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-[10px] tracking-[0.04em] text-text-muted tabular-nums whitespace-nowrap">{p.id}</td>
                      <td>
                        <a href={`/admin/players/${p.userId}`} className="flex items-center gap-2.5 min-w-0 hover:text-royal-300">
                          <Avatar initials={initials} size="sm" seed={p.userId} />
                          <div className="min-w-0">
                            <p className={`text-body-sm font-medium text-text truncate ${isAutoHandle ? "font-mono" : ""}`}>{label}</p>
                            <p className="text-micro font-mono text-text-tertiary truncate">{p.userId}</p>
                          </div>
                        </a>
                      </td>
                      <td className="font-mono whitespace-nowrap text-text-muted">
                        {u ? maskPhone(u.phoneE164) : "—"}
                      </td>
                      <td>
                        <Chip size="sm" variant={p.side === "YES" ? "yes" : "no"}>{p.side}</Chip>
                      </td>
                      <td className="text-right font-mono tabular-nums text-text whitespace-nowrap">
                        {formatTzs(p.stake)}
                      </td>
                      <td className="text-right font-mono tabular-nums whitespace-nowrap">
                        {payoutVal !== null ? (
                          <span className={p.status === "OPEN" ? "text-text-muted" : p.status === "WIN" ? "text-yes-300" : "text-text-muted"}>
                            {formatTzs(payoutVal)}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <Chip size="sm" variant={STATUS_VARIANT[p.status] ?? "neutral"}>
                          {p.status === "CASHED_OUT" ? "Cashed out" : p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </Chip>
                      </td>
                      <td className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {formatDateTime(p.placedAt)}
                      </td>
                      <td>
                        <a href={`/admin/players/${p.userId}`} className="text-royal-300 hover:underline font-medium font-mono text-micro tracking-[0.10em] uppercase">
                          profile →
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="!py-8 text-center text-text-tertiary font-mono text-[11px] uppercase tracking-[0.14em]">
                      {allPositions.length === 0 ? "No positions on this market yet." : "No positions match the current filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollX>
          <AdminPagination total={filtered.length} page={page} baseHref={baseHref} />
        </AdminCard>
      </div>
    </>
  );
}
