import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceChart } from "@/components/markets/price-chart";
import { listPositionsForUser, getMarket } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.performance.title };
}
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;

export default async function PerformancePage() {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/positions/performance");

  const positions = await listPositionsForUser(session.userId, 5_000).catch(() => []);
  const settled = positions.filter((p) => p.status !== "OPEN");

  // ── Core stats ──────────────────────────────────────────────────────
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

  // Streaks — settled positions sorted newest first (store order)
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
    if (p.status === "WIN" || p.status === "CASHED_OUT") {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // ── P&L over time (cumulative) ─────────────────────────────────────
  const chronological = [...settled].sort(
    (a, b) => new Date(a.settledAt ?? a.placedAt).getTime() - new Date(b.settledAt ?? b.placedAt).getTime(),
  );

  let cumulative = 0;
  const pnlSeries: { t: string; yes: number }[] = [];

  // We need to normalize values to 0-1 range for PriceChart.
  // First compute the raw cumulative P&L series.
  const rawPnl: { label: string; value: number }[] = [];
  for (const p of chronological) {
    const pnl = p.status === "WIN" || p.status === "CASHED_OUT"
      ? (p.finalPayout ?? 0) - p.stake
      : p.status === "LOSS"
        ? -p.stake
        : 0; // VOID
    cumulative += pnl;
    const d = new Date(p.settledAt ?? p.placedAt);
    rawPnl.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: cumulative,
    });
  }

  // Normalize to 0-1 for the chart
  if (rawPnl.length > 0) {
    const minVal = Math.min(...rawPnl.map((d) => d.value));
    const maxVal = Math.max(...rawPnl.map((d) => d.value));
    const range = maxVal - minVal || 1;
    for (const d of rawPnl) {
      pnlSeries.push({ t: d.label, yes: (d.value - minVal) / range });
    }
  }

  // ── Best win market title ──────────────────────────────────────────
  let bestMarketTitle = "";
  if (bestMarket) {
    try {
      const m = await getMarket(bestMarket.marketId);
      if (m) bestMarketTitle = pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh);
    } catch { /* skip */ }
  }

  // ── Recent settled (last 5) ────────────────────────────────────────
  const recentSettled = sortedSettled.slice(0, 5);
  const recentMarketIds = [...new Set(recentSettled.map((p) => p.marketId))];
  const recentMarketMap = new Map<string, Awaited<ReturnType<typeof getMarket>>>();
  for (const mid of recentMarketIds) {
    try { recentMarketMap.set(mid, await getMarket(mid)); } catch { /* skip */ }
  }

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <BackLink fallbackHref="/positions" label={t.positions.title} />
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.performance.title}</p>
        <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.positions.pollsPlayed}</h1>
      </header>

      {totalBets === 0 ? (
        <EmptyState
          kind="positions"
          title={t.performance.noPerformance}
          body={t.performance.noPerformanceBody}
          action={
            <Link href={"/markets" as never} className="btn btn-gold btn-sm">
              {t.positions.browseMarkets}
            </Link>
          }
        />
      ) : (
        <>
          {/* ── Hero stat card ─────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-bg-elevated px-5 py-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              {/* Net P&L hero */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle flex items-center gap-1.5">
                  <I.coins s={11} />
                  {t.performance.netPnl}
                </p>
                <p className={`mt-1 font-mono text-[32px] font-bold tabular-nums leading-tight ${netPnl >= 0 ? "text-gold-300" : "text-no-300"}`}>
                  {netPnl >= 0 ? "+" : "\u2212"}{fmtTzs(Math.abs(netPnl))}
                </p>
              </div>
              {/* Win rate */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle flex items-center gap-1.5">
                  <I.trendingUp s={11} />
                  {t.performance.winRate}
                </p>
                <p className="mt-1 font-mono text-[22px] font-bold tabular-nums leading-tight text-text">
                  {winRate}%
                </p>
              </div>
              {/* Total predictions */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle flex items-center gap-1.5">
                  <I.activity s={11} />
                  {t.performance.totalPredictions}
                </p>
                <p className="mt-1 font-mono text-[22px] font-bold tabular-nums leading-tight text-text">
                  {totalBets.toLocaleString("en-US")}
                </p>
              </div>
            </div>
          </section>

          {/* ── 2-col stat grid ────────────────────────────────────── */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t.performance.avgStake}
              value={fmtTzs(avgStake)}
              icon={<I.coins s={13} />}
            />
            <StatCard
              label={t.performance.bestWin}
              value={bestMarket ? fmtTzs(bestMarket.payout) : "\u2014"}
              sub={bestMarketTitle ? bestMarketTitle.slice(0, 40) : undefined}
              tone="gold"
              icon={<I.trophy s={13} />}
            />
            <StatCard
              label={t.performance.currentStreak}
              value={currentStreak > 0 ? `${currentStreak}` : "\u2014"}
              icon={<I.flame2 s={13} />}
            />
            <StatCard
              label={t.performance.roi}
              value={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
              tone={roi >= 0 ? "gold" : "no"}
              icon={<I.trendingUp s={13} />}
            />
          </section>

          {/* ── Longest streak ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 text-[12px] font-mono text-text-muted">
            <I.trophy s={13} className="text-gold-300" />
            <span>{t.performance.longestStreak}: <strong className="text-text">{longestStreak}</strong></span>
          </div>

          {/* ── P&L chart ──────────────────────────────────────────── */}
          {pnlSeries.length > 1 && (
            <section className="rounded-xl glass-panel p-4 lg:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-3">
                {t.performance.pnlOverTime}
              </p>
              <PriceChart data={pnlSeries} height={200} ariaLabel={t.performance.pnlOverTime} />
            </section>
          )}

          {/* ── Recent settled list ────────────────────────────────── */}
          {recentSettled.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-baseline gap-2">
                <span className="font-display text-[20px] font-semibold text-text">{t.performance.recentSettled}</span>
                <span className="ml-auto font-mono text-[12px] text-text-subtle">{recentSettled.length}</span>
              </h2>
              <div className="rounded-xl border border-border bg-bg-elevated divide-y divide-border">
                {recentSettled.map((p) => {
                  const m = recentMarketMap.get(p.marketId);
                  const pnl = p.status === "WIN" || p.status === "CASHED_OUT"
                    ? (p.finalPayout ?? 0) - p.stake
                    : p.status === "LOSS"
                      ? -p.stake
                      : 0;
                  const pnlPositive = pnl >= 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/markets/${p.marketId}` as never}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-overlay/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-text truncate">
                          {m ? pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh) : p.marketId.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                          {p.side} &middot; {fmtTzs(p.stake)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono text-[13px] font-bold tabular-nums ${pnlPositive ? "text-gold-300" : "text-no-300"}`}>
                          {pnlPositive ? "+" : "\u2212"}{fmtTzs(Math.abs(pnl))}
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-text-muted">
                          {p.status === "WIN" ? t.common.win : p.status === "LOSS" ? t.common.lose : p.status === "CASHED_OUT" ? t.common.cashedOut : t.common.voided}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function StatCard({
  label, value, sub, tone = "neutral", icon,
}: {
  label: string; value: string; sub?: string;
  tone?: "neutral" | "gold" | "no";
  icon?: React.ReactNode;
}) {
  const valueClass =
    tone === "gold" ? "text-gold-300"
    : tone === "no" ? "text-no-300"
    : "text-text";
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-text-subtle">{icon}</span>}
        <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] font-semibold text-text-subtle">{label}</p>
      </div>
      <p className={`mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 font-mono text-[10.5px] tabular-nums text-text-muted truncate">{sub}</p>}
    </div>
  );
}
