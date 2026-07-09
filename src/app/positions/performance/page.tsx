import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { I } from "@/components/ui/glyphs";
import { GiltCorner } from "@/components/brand";
import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { PnlChart } from "@/components/positions/pnl-chart";
import { listPositionsForUser, getMarket } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.performance.title };
}
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/positions/performance");

  const positions = await listPositionsForUser(session.userId, 5_000).catch(() => []);
  const settled = positions.filter((p) => p.status !== "OPEN");

  // ── Core stats (unchanged real aggregation) ─────────────────────────
  const totalBets = settled.length;
  const totalStaked = settled.reduce((s, p) => s + p.stake, 0);
  const totalPaidOut = settled.reduce((s, p) => s + (p.finalPayout ?? 0), 0);
  const netPnl = totalPaidOut - totalStaked;
  const wins = settled.filter((p) => p.status === "WIN" || p.status === "CASHED_OUT").length;
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
  const avgStake = totalBets > 0 ? Math.round(totalStaked / totalBets) : 0;
  const roi = totalStaked > 0 ? ((netPnl / totalStaked) * 100) : 0;

  // Best single win (highest payout)
  let bestMarket: { payout: number; marketId: string } | null = null;
  for (const p of settled) {
    const payout = p.finalPayout ?? 0;
    if (payout > 0 && (!bestMarket || payout > bestMarket.payout)) {
      bestMarket = { payout, marketId: p.marketId };
    }
  }

  // Streaks — settled positions newest first
  const sortedSettled = [...settled].sort(
    (a, b) => new Date(b.settledAt ?? b.placedAt).getTime() - new Date(a.settledAt ?? a.placedAt).getTime(),
  );
  let currentStreak = 0;
  for (const p of sortedSettled) {
    if (p.status === "WIN" || p.status === "CASHED_OUT") currentStreak++;
    else break;
  }
  let longestStreak = 0;
  let run = 0;
  for (const p of sortedSettled) {
    if (p.status === "WIN" || p.status === "CASHED_OUT") { run++; if (run > longestStreak) longestStreak = run; }
    else run = 0;
  }

  // ── Cumulative realised P&L series — RAW TZS (chronological) ─────────
  const chronological = [...settled].sort(
    (a, b) => new Date(a.settledAt ?? a.placedAt).getTime() - new Date(b.settledAt ?? b.placedAt).getTime(),
  );
  const pnlOf = (p: (typeof settled)[number]) =>
    p.status === "WIN" || p.status === "CASHED_OUT" ? (p.finalPayout ?? 0) - p.stake
    : p.status === "LOSS" ? -p.stake
    : 0; // VOID
  let cumulative = 0;
  const pnlSeries: { label: string; value: number }[] = [];
  for (const p of chronological) {
    cumulative += pnlOf(p);
    const d = new Date(p.settledAt ?? p.placedAt);
    pnlSeries.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: cumulative });
  }

  // Best win title
  let bestTitle = "";
  if (bestMarket) {
    try { const m = await getMarket(bestMarket.marketId); if (m) bestTitle = pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh); } catch { /* skip */ }
  }

  // Recent settled (last 5) + their market titles
  const recent = sortedSettled.slice(0, 5);
  const recentMarketMap = new Map<string, Awaited<ReturnType<typeof getMarket>>>();
  for (const mid of [...new Set(recent.map((p) => p.marketId))]) {
    try { recentMarketMap.set(mid, await getMarket(mid)); } catch { /* skip */ }
  }
  const statusLabel = (s: string) =>
    s === "WIN" ? t.common.win : s === "LOSS" ? t.common.lose : s === "CASHED_OUT" ? t.common.cashedOut : t.common.voided;
  const recentSettled = recent.map((p) => {
    const m = recentMarketMap.get(p.marketId);
    const d = new Date(p.settledAt ?? p.placedAt);
    return {
      id: p.id, marketId: p.marketId,
      title: m ? pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh) : p.marketId.slice(0, 8),
      side: p.side, stake: p.stake,
      date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      pnl: pnlOf(p), statusLabel: statusLabel(p.status),
    };
  });

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <BackLink fallbackHref="/positions" label={t.positions.title} />
      <PageHeader eyebrow={t.positions.title} title={t.performance.title} />

      {totalBets === 0 ? (
        <EmptyState
          kind="positions"
          title={t.performance.noPerformance}
          body={t.performance.noPerformanceBody}
          action={<Link href={"/markets" as never} className="btn btn-gold btn-sm">{t.positions.browseMarkets}</Link>}
        />
      ) : (
        <>
          {/* ── Net P&L ledger panel ──────────────────────────────── */}
          <section aria-label={t.performance.netPnl} className="glass-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="gilt-eyebrow">{t.performance.netPnl} · {t.common.settled}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle">{t.performance.allFiguresFinal}</span>
            </div>
            <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div className="min-w-[220px]">
                <p
                  className={`font-mono text-[34px] font-bold tabular-nums leading-none tracking-[-0.02em] ${netPnl >= 0 ? "text-[var(--gilt)]" : "text-no-300"}`}
                  style={netPnl >= 0 ? { textShadow: "0 0 24px color-mix(in oklab, var(--gilt) 30%, transparent)" } : undefined}
                >
                  {formatTzsSigned(netPnl)}
                </p>
                <p className="mt-2 text-[12.5px] leading-normal text-text-muted">
                  {netPnl >= 0 ? t.performance.netProfitCaption : t.performance.netLossCaption}
                </p>
              </div>
              <div className="flex flex-wrap gap-8">
                <Kpi label={t.performance.winRate} value={`${winRate}%`} />
                <Kpi label={t.performance.marketsSettled} value={String(totalBets)} />
                <Kpi label={t.performance.roi} value={`${roi >= 0 ? "+" : "−"}${Math.abs(roi).toFixed(1)}%`} />
              </div>
            </div>
          </section>

          {/* ── P&L over time ─────────────────────────────────────── */}
          {pnlSeries.length > 1 && (
            <section aria-label={t.performance.pnlOverTime} className="glass-panel p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="gilt-eyebrow">{t.performance.pnlOverTime}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle">{t.performance.cumulativePerSettlement}</span>
              </div>
              <PnlChart data={pnlSeries} ariaLabel={t.performance.pnlOverTime} />
            </section>
          )}

          {/* ── C2d highlights: best-win gilt crest + streak pip-chain ─
              (earned money / earned standing — gold is legitimate here) ── */}
          <section className="grid gap-3 md:grid-cols-2">
            {/* Best-win gilt crest */}
            <div
              className="relative overflow-hidden rounded-xl border border-gold-700/50 p-5"
              style={{ background: "radial-gradient(120% 140% at 100% 0%, oklch(40% 0.11 82 / 0.14), transparent 55%), var(--bg-elevated)" }}
            >
              <GiltCorner size={40} rotate={90} className="absolute right-1.5 top-1.5 opacity-60" />
              <p className="gilt-eyebrow">{t.performance.bestWin}</p>
              <div className="mt-3 flex items-center gap-3.5">
                <span
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold-500 text-gold-300"
                  style={{ background: "radial-gradient(circle at 50% 30%, oklch(45% 0.12 84 / 0.35), oklch(24% 0.06 80 / 0.25))", boxShadow: "0 0 20px -4px color-mix(in oklab, var(--gold-400) 55%, transparent)" }}
                >
                  <I.trophy s={22} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[26px] lg:text-[30px] font-bold leading-none tabular-nums text-gold-300" style={{ textShadow: "0 0 20px color-mix(in oklab, var(--gold-400) 30%, transparent)" }}>
                    {bestMarket ? formatTzsAbs(bestMarket.payout) : "—"}
                  </p>
                  {bestTitle && <p className="mt-1.5 truncate text-[12px] text-text-muted">{bestTitle}</p>}
                </div>
              </div>
            </div>

            {/* Streak pip-chain */}
            <div className="rounded-xl border border-border bg-bg-elevated p-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="gilt-eyebrow" style={{ color: "var(--text-subtle)" }}>{t.performance.currentStreak}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle tabular-nums">{t.performance.longestStreak} {longestStreak}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-display text-[30px] font-bold leading-none tabular-nums text-text">{currentStreak}</span>
                <StreakChain current={currentStreak} longest={longestStreak} />
              </div>
            </div>
          </section>

          {/* ── KPI cards ─────────────────────────────────────────── */}
          <section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>
            <Stat label={t.performance.avgStake} value={formatTzsAbs(avgStake)} />
            <Stat label={t.performance.totalStaked} value={formatTzsAbs(totalStaked)} />
          </section>

          {/* ── Recent settled ledger ─────────────────────────────── */}
          {recentSettled.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-[20px] font-semibold text-text">{t.performance.recentSettled}</span>
                <span className="ml-auto font-mono text-[12px] text-text-subtle">{recentSettled.length}</span>
              </h2>
              <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden divide-y divide-border/50">
                {recentSettled.map((r) => (
                  <Link key={r.id} href={`/markets/${r.marketId}` as never} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-overlay/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text">{r.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">{r.side} &middot; {formatTzsAbs(r.stake)} &middot; {r.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-[13px] font-bold tabular-nums ${r.pnl >= 0 ? "text-[var(--gilt)]" : "text-no-300"}`}>{formatTzsSigned(r.pnl)}</p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">{label}</p>
      <p className="mt-2 font-mono text-[18px] font-bold tabular-nums leading-[1.1] text-text">{value}</p>
    </div>
  );
}

/** C2d streak pip-chain — filled gilt `hot` flames up to the current streak,
 *  muted pips out to the longest streak (your run vs your best). */
function StreakChain({ current, longest }: { current: number; longest: number }) {
  const len = Math.min(Math.max(longest, current, 5), 12);
  return (
    <div className="flex flex-wrap items-center gap-1" role="img" aria-label={`${current} / ${longest}`}>
      {Array.from({ length: len }).map((_, i) => (
        <span key={i} className={i < current ? "text-gold-300" : "text-text-subtle/30"}>
          <I.hot s={15} />
        </span>
      ))}
      {current > 12 && <span className="ml-0.5 font-mono text-[11px] font-bold text-gold-300 tabular-nums">+{current - 12}</span>}
    </div>
  );
}
