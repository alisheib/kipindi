/**
 * /positions/performance — redesigned page body.
 * Server component skeleton showing exactly how the new pieces compose;
 * data fetching/aggregation is identical to the current page (see
 * current-state/positions-performance-page.tsx) and is elided here as
 * `aggregates` — every value shown is derived from real settled positions.
 *
 * Changes vs current:
 *  - Hero + KPIs merge into one "Net P&L" glass-panel ledger (gilt-eyebrow
 *    + gilt-rule header, matching the /positions "Your standing" strip).
 *  - Chart replaced by <PnlChart> (raw TZS axis, gilt break-even line)
 *    instead of a 0–1-normalised PriceChart — no more axis-less line.
 *  - Loss state reads with dignity: rose ink + calm, final copy. No red
 *    panels, no alarm styling.
 *  - Gold: earned-money values only (net profit, best win, positive rows).
 *  - Streak chip: number only, line-art — the previous flame emoji idiom
 *    is not allowed (no emojis rule).
 */
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PnlChart } from "@/components/positions/pnl-chart";
import { getServerT } from "@/lib/i18n-server";

const fmtTzs = (n: number) => `TZS ${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const signedTzs = (n: number) => `${n >= 0 ? "+" : "\u2212"}${fmtTzs(n)}`;

export default async function PerformancePage() {
  const { t } = await getServerT();
  // ── identical aggregation to the current page ─────────────────────
  // const positions = await listPositionsForUser(...); const settled = ...
  // netPnl, winRate, totalBets, totalStaked, avgStake, roi, best,
  // currentStreak, longestStreak, pnlSeries (RAW cumulative TZS, chrono),
  // recentSettled (last 5 with market titles)
  const a = {} as never as Aggregates; // ← wire to real service calls

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <BackLink fallbackHref="/positions" label={t.positions.title} />
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.positions.title}</p>
        <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.performance.title}</h1>
      </header>

      {a.totalBets === 0 ? (
        <EmptyState
          kind="positions"
          title={t.performance.noPerformance}
          body={t.performance.noPerformanceBody}
          action={<Link href={"/markets" as never} className="btn btn-gold btn-sm">{t.positions.browseMarkets}</Link>}
        />
      ) : (
        <>
          {/* ── Net P&L ledger panel ──────────────────────────────── */}
          <section aria-label={t.performance.netPnl} className="glass-panel px-5 pt-[18px] pb-5">
            <div className="flex items-center justify-between gap-3">
              <span className="gilt-eyebrow">{t.performance.netPnl} · {t.common.settled}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle">{t.performance.allFiguresFinal}</span>
            </div>
            <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div className="min-w-[220px]">
                <p
                  className={`font-mono text-[34px] font-bold tabular-nums leading-none tracking-[-0.02em] ${a.netPnl >= 0 ? "text-[var(--gilt)]" : "text-no-300"}`}
                  style={a.netPnl >= 0 ? { textShadow: "0 0 24px color-mix(in oklab, var(--gilt) 30%, transparent)" } : undefined}
                >
                  {signedTzs(a.netPnl)}
                </p>
                <p className="mt-2 text-[12.5px] leading-normal text-text-muted">
                  {a.netPnl >= 0 ? t.performance.netProfitCaption : t.performance.netLossCaption}
                </p>
              </div>
              <div className="flex flex-wrap gap-8">
                <Kpi label={t.performance.winRate} value={`${a.winRate}%`} />
                <Kpi label={t.performance.marketsSettled} value={String(a.totalBets)} />
                <Kpi label={t.performance.roi} value={`${a.roi >= 0 ? "+" : "\u2212"}${Math.abs(a.roi).toFixed(1)}%`} />
              </div>
            </div>
          </section>

          {/* ── P&L over time ─────────────────────────────────────── */}
          {a.pnlSeries.length > 1 && (
            <section aria-label={t.performance.pnlOverTime} className="glass-panel px-5 pt-4 pb-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="gilt-eyebrow">{t.performance.pnlOverTime}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle">{t.performance.cumulativePerSettlement}</span>
              </div>
              <PnlChart data={a.pnlSeries} ariaLabel={t.performance.pnlOverTime} />
            </section>
          )}

          {/* ── KPI cards ─────────────────────────────────────────── */}
          <section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>
            <Stat label={t.performance.avgStake} value={fmtTzs(a.avgStake)} />
            <Stat label={t.performance.bestWin} value={a.best ? fmtTzs(a.best.payout) : "\u2014"} sub={a.best?.title} gold />
            <Stat label={t.performance.currentStreak} value={a.currentStreak > 0 ? String(a.currentStreak) : "\u2014"} sub={`${t.performance.longestStreak} ${a.longestStreak}`} />
            <Stat label={t.performance.totalStaked} value={fmtTzs(a.totalStaked)} />
          </section>

          {/* ── Recent settled ledger ─────────────────────────────── */}
          {a.recentSettled.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-[20px] font-semibold text-text">{t.performance.recentSettled}</span>
                <span className="ml-auto font-mono text-[12px] text-text-subtle">{a.recentSettled.length}</span>
              </h2>
              <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden divide-y divide-border/50">
                {a.recentSettled.map((r) => (
                  <Link key={r.id} href={`/markets/${r.marketId}` as never} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-overlay/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text">{r.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">{r.side} \u00b7 {fmtTzs(r.stake)} \u00b7 {r.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-[13px] font-bold tabular-nums ${r.pnl >= 0 ? "text-[var(--gilt)]" : "text-no-300"}`}>{signedTzs(r.pnl)}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">{r.statusLabel}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">{label}</p>
      <p className="mt-1.5 font-mono text-[21px] font-bold tabular-nums leading-none text-text">{value}</p>
    </div>
  );
}

function Stat({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">{label}</p>
      <p className={`mt-2 font-mono text-[18px] font-bold tabular-nums leading-[1.1] ${gold ? "text-[var(--gilt)]" : "text-text"}`}>{value}</p>
      {sub && <p className="mt-1.5 truncate font-mono text-[10.5px] text-text-muted">{sub}</p>}
    </div>
  );
}

type Aggregates = {
  totalBets: number; netPnl: number; winRate: number; roi: number;
  avgStake: number; totalStaked: number;
  best: { payout: number; title: string } | null;
  currentStreak: number; longestStreak: number;
  pnlSeries: { label: string; value: number }[];
  recentSettled: { id: string; marketId: string; title: string; side: string; stake: number; date: string; pnl: number; statusLabel: string }[];
};
