import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PositionCard } from "@/components/markets/position-card";
import { SellButton } from "@/components/markets/sell-button";
import { listPositionsForUser, getMarket, cashOutValue, isSelectionClosed } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.positions.title };
}
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;

export default async function PositionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/positions");
  const sp = await searchParams;
  const activeTab: "open" | "settled" | "all" = (["open", "settled", "all"] as const).includes(sp.tab as "open" | "settled" | "all") ? (sp.tab as "open" | "settled" | "all") : "all";

  // Fetch the full history (no silent 100-cap), then paginate the settled
  // archive with the shared player page size so older positions stay reachable.
  const positions = await listPositionsForUser(session.userId, 5_000);
  const open = positions.filter((p) => p.status === "OPEN");
  const settled = positions.filter((p) => p.status !== "OPEN");

  const settledTotalPages = Math.max(1, Math.ceil(settled.length / PLAYER_PER_PAGE));
  const settledPage = Math.min(Math.max(1, parseInt(sp.page ?? "1", 10) || 1), settledTotalPages);
  const pagedSettled = settled.slice((settledPage - 1) * PLAYER_PER_PAGE, settledPage * PLAYER_PER_PAGE);
  const settledBaseHref = activeTab === "all" ? "/positions" : `/positions?tab=${activeTab}`;

  // Pre-fetch only the markets actually rendered (open + the visible settled
  // page) so a long history doesn't fan out into thousands of getMarket calls.
  const marketIds = [...new Set([...open, ...pagedSettled].map((p) => p.marketId))];
  const marketMap = new Map<string, Awaited<ReturnType<typeof getMarket>>>();
  for (const mid of marketIds) {
    marketMap.set(mid, await getMarket(mid));
  }

  // P&L summary — open at-risk + live cash-out value, settled net.
  const openStake = open.reduce((s, p) => s + p.stake, 0);
  let openLiveValue = 0;
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      openLiveValue += (await cashOutValue(
        { side: p.side, stake: p.stake, placedAt: p.placedAt },
        { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt },
      )).value;
    } else {
      openLiveValue += p.potentialPayout;
    }
  }
  // Pre-compute cash-out values for open positions (cashOutValue is async)
  const openCashOutValues = new Map<string, number | null>();
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      openCashOutValues.set(p.id, (await cashOutValue({ side: p.side, stake: p.stake, placedAt: p.placedAt }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt })).value);
    } else {
      openCashOutValues.set(p.id, null);
    }
  }

  const settledNet = settled.reduce((s, p) => {
    if (p.status === "WIN" || p.status === "CASHED_OUT") return s + ((p.finalPayout ?? 0) - p.stake);
    if (p.status === "LOSS") return s - p.stake;
    return s; // VOID = 0
  }, 0);
  const wins = settled.filter((p) => p.status === "WIN").length;
  const losses = settled.filter((p) => p.status === "LOSS").length;
  const cashOuts = settled.filter((p) => p.status === "CASHED_OUT").length;

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <RefreshPoller intervalMs={20_000} />
      <Link
        href="/markets"
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.common.markets}
      </Link>
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.positions.title}</p>
        <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.positions.pollsPlayed}</h1>
      </header>

      {/* Tab filter — All / Open / Settled (matches markets page filter pattern) */}
      {positions.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label={t.positions.filterAria}>
          {([
            { id: "all", label: t.positions.tabAll, count: positions.length },
            { id: "open", label: t.positions.tabOpen, count: open.length },
            { id: "settled", label: t.positions.tabSettled, count: settled.length },
          ] as const).map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/positions${tab.id === "all" ? "" : `?tab=${tab.id}`}` as never}
                className={
                  "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all " +
                  (on
                    ? "border-brand-500 text-text"
                    : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                }
                style={on ? { background: "oklch(40% 0.12 262 / 0.35)", boxShadow: "0 0 10px oklch(63% 0.18 262 / 0.15)" } : undefined}
                aria-current={on ? "page" : undefined}
              >
                {tab.label}
                <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-60">{tab.count}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* P&L summary strip — only render when the user has any positions */}
      {positions.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCell
            label={t.positions.atRisk}
            value={fmtTzs(openStake)}
            sub={`${open.length} ${t.common.open}`}
            icon={<I.clock s={13} />}
          />
          <SummaryCell
            label={t.positions.liveValue}
            value={fmtTzs(openLiveValue)}
            sub={openLiveValue >= openStake
              ? `+${fmtTzs(openLiveValue - openStake)} ${t.positions.unrealised}`
              : `−${fmtTzs(openStake - openLiveValue)} ${t.positions.unrealised}`}
            tone={openLiveValue >= openStake ? "yes" : "no"}
            icon={openLiveValue >= openStake
              ? <I.trendingUp s={13} />
              : <I.trendingDown s={13} />}
          />
          <SummaryCell
            label={t.positions.settledPnl}
            value={(settledNet >= 0 ? "+" : "−") + fmtTzs(Math.abs(settledNet))}
            sub={`${wins}${t.common.win.charAt(0)} · ${losses}${t.common.lose.charAt(0)} · ${cashOuts}C`}
            tone={settledNet >= 0 ? "gold" : "no"}
            icon={<I.coins s={13} />}
          />
          <SummaryCell
            label={t.positions.winRate}
            value={settled.length > 0 ? `${Math.round((wins / settled.length) * 100)}%` : "—"}
            sub={`${settled.length} ${t.common.settled}`}
            icon={<I.trendingUp s={13} />}
          />
        </section>
      )}

      {(activeTab === "all" || activeTab === "open") && <Section title={t.common.open} count={open.length}>
        {open.length === 0 ? (
          <Empty
            kind="positions"
            title={t.positions.noOpenYet}
            body={t.positions.noOpenBody}
            browseLabel={t.positions.browseMarkets}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {open.map((p) => {
              const m = marketMap.get(p.marketId);
              if (!m) return null;
              const liveValue = openCashOutValues.get(p.id) ?? null;
              return (
                <div key={p.id} className="space-y-2">
                  <PositionCard
                    marketId={p.marketId}
                    marketTitle={pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
                    side={p.side}
                    stake={p.stake}
                    current={liveValue ?? p.potentialPayout}
                    payout={p.potentialPayout}
                    status="OPEN"
                    placedAt={p.placedAt}
                    positionId={p.id}
                  />
                  {(() => {
                    const cutoffIso = m.selectionClosedAt ?? m.resolutionAt;
                    const closed = isSelectionClosed(m);
                    return m.status === "LIVE" ? (
                      <p className={`flex items-center gap-1.5 text-[11px] font-mono ${closed ? "text-gold-300" : "text-text-subtle"}`}>
                        <I.calendarClock s={11} />
                        {closed
                          ? t.positions.selectionClosed
                          : `${t.positions.selectionCloses} ${new Date(cutoffIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    ) : null;
                  })()}
                  {liveValue !== null && (
                    <SellButton
                      positionId={p.id}
                      stake={p.stake}
                      value={liveValue}
                      placedAt={p.placedAt}
                      resolutionAt={m.resolutionAt}
                      serverNow={Date.now()}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>}

      {(activeTab === "all" || activeTab === "settled") && <Section title={t.common.settled} count={settled.length}>
        {settled.length === 0 ? (
          <Empty
            kind="default"
            title={t.positions.noSettledYet}
            body={t.positions.noSettledBody}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pagedSettled.map((p) => {
                const m = marketMap.get(p.marketId);
                if (!m) return null;
                return (
                  <PositionCard
                    key={p.id}
                    marketId={p.marketId}
                    marketTitle={pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
                    side={p.side}
                    stake={p.stake}
                    current={p.finalPayout ?? 0}
                    payout={p.finalPayout ?? 0}
                    status={p.status as "WIN" | "LOSS" | "VOID" | "CASHED_OUT"}
                    placedAt={p.placedAt}
                    positionId={p.id}
                  />
                );
              })}
            </div>
            {settledTotalPages > 1 && (
              <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
                <Pagination total={settled.length} page={settledPage} perPage={PLAYER_PER_PAGE} baseHref={settledBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} />
              </div>
            )}
          </>
        )}
      </Section>}
    </main>
  );
}

function SummaryCell({
  label, value, sub, tone = "neutral", icon,
}: {
  label: string; value: string; sub: string;
  tone?: "neutral" | "yes" | "no" | "gold";
  icon?: React.ReactNode;
}) {
  const valueClass =
    tone === "yes"  ? "text-yes-300"
    : tone === "no"   ? "text-no-300"
    : tone === "gold" ? "text-gold-300"
    : "text-text";
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-text-subtle">{icon}</span>}
        <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] font-semibold text-text-subtle">{label}</p>
      </div>
      <p className={`mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      <p className="mt-1 font-mono text-[10.5px] tabular-nums text-text-muted">{sub}</p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2">
        <span className="font-display text-[20px] font-semibold text-text">{title}</span>
        <span className="ml-auto font-mono text-[12px] text-text-subtle">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ kind, title, body, browseLabel }: { kind: "positions" | "default"; title: string; body?: string; browseLabel?: string }) {
  return (
    <EmptyState
      kind={kind}
      title={title}
      body={body}
      action={
        browseLabel ? (
          <Link href={"/markets" as never} className="btn btn-gold btn-sm">
            {browseLabel}
          </Link>
        ) : null
      }
    />
  );
}
