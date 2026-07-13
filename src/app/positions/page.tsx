import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PageHeader } from "@/components/ui/page-header";
import { PositionCard } from "@/components/markets/position-card";
import { PnlSummaryStrip } from "@/components/positions/pnl-summary-strip";
import { CountdownRing } from "@/components/positions/countdown-ring";
import { SellButton } from "@/components/markets/sell-button";
import { formatTzsCompact } from "@/lib/utils";
import { listPositionsForUser, getMarket, cashOutValue, isSelectionClosed } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { ensureAffiliateAccount } from "@/lib/server/affiliate-service";
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

export default async function PositionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/positions");
  const sp = await searchParams;
  const activeTab: "open" | "settled" | "all" = (["open", "settled", "all"] as const).includes(sp.tab as "open" | "settled" | "all") ? (sp.tab as "open" | "settled" | "all") : "all";

  // Fetch the full history (no silent 100-cap), then paginate the settled
  // archive with the shared player page size so older positions stay reachable.
  const positions = await listPositionsForUser(session.userId, 5_000).catch(() => []);
  // F5 — the viewer's affiliate code, so a shared pick/win carries their link.
  const myRefCode = await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined);
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
    try { marketMap.set(mid, await getMarket(mid)); } catch { /* skip unavailable market */ }
  }

  // P&L summary — open at-risk + live cash-out value, settled net.
  const openStake = open.reduce((s, p) => s + p.stake, 0);
  // C2c — YES/NO exposure split of open stake (green/rose bar).
  const openYesStake = open.filter((p) => p.side === "YES").reduce((s, p) => s + p.stake, 0);
  const openNoStake = openStake - openYesStake;
  const serverNow = Date.now();
  let openLiveValue = 0;
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    // Compute for CLOSED markets too — not so the player can sell (they cannot),
    // but so the SellButton still renders and TELLS them selling has shut. Silently
    // removing the control leaves them guessing where their exit went.
    if (m && (m.status === "LIVE" || m.status === "CLOSED")) {
      try {
        openLiveValue += (await cashOutValue(
          { side: p.side, stake: p.stake, placedAt: p.placedAt },
          { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt },
        )).value;
      } catch { openLiveValue += p.potentialPayout; }
    } else {
      openLiveValue += p.potentialPayout;
    }
  }
  // Pre-compute cash-out values for open positions (cashOutValue is async)
  const openCashOutValues = new Map<string, number | null>();
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      try {
        openCashOutValues.set(p.id, (await cashOutValue({ side: p.side, stake: p.stake, placedAt: p.placedAt }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt })).value);
      } catch { openCashOutValues.set(p.id, null); }
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
      {/* Positions is a primary destination (bottom-nav + top-nav tab), not a
          leaf — no Back-to-markets link (IA review R3). */}
      <header className="flex items-start justify-between gap-3">
        <PageHeader eyebrow={t.positions.title} title={t.positions.pollsPlayed} />
        {positions.length > 0 && (
          <Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0 mt-1">
            <I.chart s={13} />
            {t.performance.viewPerformance}
          </Link>
        )}
      </header>

      {/* Tab filter — All / Open / Settled (matches markets page filter pattern) */}
      {positions.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5 -mx-1 px-1 overflow-x-auto" aria-label={t.positions.filterAria}>
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
                style={on ? { background: "var(--pill-active)" } : undefined}
                aria-current={on ? "page" : undefined}
              >
                {tab.label}
                <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-60">{tab.count}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* "Your standing" ledger strip — only when the user has any positions */}
      {positions.length > 0 && (
        <PnlSummaryStrip
          openCount={open.length}
          openStake={openStake}
          openLiveValue={openLiveValue}
          settledNet={settledNet}
          wins={wins}
          losses={losses}
          cashOuts={cashOuts}
          settledCount={settled.length}
          t={{
            yourStanding: t.positions.yourStanding,
            live: t.common.live,
            atRisk: t.positions.atRisk,
            open: t.common.open,
            liveValueIfSettled: t.positions.liveValueIfSettled,
            unrealised: t.positions.unrealised,
            settledPnl: t.positions.settledPnl,
            winRate: t.positions.winRate,
            ofSettled: `${settled.length} ${t.common.settled}`,
          }}
        />
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
          <>
          {/* C2c — YES/NO exposure bar: green/rose split of open stake, with
              end-labels (a11y §6b — never colour-only). */}
          {openStake > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-bg-elevated/60 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums">
                <span className="font-bold text-yes-300">{t.common.yes} · {formatTzsCompact(openYesStake)}</span>
                <span className="text-text-subtle">{t.positions.atRisk}</span>
                <span className="font-bold text-no-300">{t.common.no} · {formatTzsCompact(openNoStake)}</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-pill bg-bg-overlay" role="img" aria-label={`${t.common.yes} ${formatTzsCompact(openYesStake)}, ${t.common.no} ${formatTzsCompact(openNoStake)}`}>
                {openYesStake > 0 && <div style={{ width: `${(openYesStake / openStake) * 100}%`, background: "var(--yes-500)" }} />}
                {openNoStake > 0 && <div style={{ width: `${(openNoStake / openStake) * 100}%`, background: "var(--no-500)" }} />}
              </div>
            </div>
          )}
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
                    refCode={myRefCode}
                  />
                  {(() => {
                    const cutoffIso = m.selectionClosedAt ?? m.resolutionAt;
                    const closed = isSelectionClosed(m);
                    return m.status === "LIVE" ? (
                      <div className="flex items-center gap-2">
                        <CountdownRing
                          deadlineIso={cutoffIso}
                          startIso={p.placedAt}
                          serverNow={serverNow}
                          size={40}
                          ariaLabel={closed ? t.positions.selectionClosed : t.positions.selectionCloses}
                        />
                        <p className={`flex items-center gap-1.5 text-[11px] font-mono ${closed ? "text-gold-300" : "text-text-subtle"}`}>
                          <I.calendarClock s={11} />
                          {closed
                            ? t.positions.selectionClosed
                            : `${t.positions.selectionCloses} ${new Date(cutoffIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  {(liveValue !== null || isSelectionClosed(m)) && (
                    <SellButton
                      positionId={p.id}
                      stake={p.stake}
                      value={liveValue ?? 0}
                      placedAt={p.placedAt}
                      closesAt={m.selectionClosedAt ?? m.resolutionAt}
                      alreadyClosed={isSelectionClosed(m)}
                      serverNow={Date.now()}
                    />
                  )}
                </div>
              );
            })}
          </div>
          </>
        )}
      </Section>}

      {(activeTab === "all" || activeTab === "settled") && <Section title={t.common.settled} count={settled.length}>
        {settled.length === 0 ? (
          <Empty
            kind="positions"
            title={t.positions.noSettledYet}
            body={t.positions.noSettledBody}
            browseLabel={t.positions.browseMarkets}
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
                    refCode={myRefCode}
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
          <Link href={"/markets" as never} className="btn btn-primary btn-sm">
            {browseLabel}
          </Link>
        ) : null
      }
    />
  );
}
