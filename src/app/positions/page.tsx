import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
// E-101b · a fragment names a row; this is what actually scrolls to it.
import { HashFocus } from "@/components/ui/hash-focus";
import { PageHeader } from "@/components/ui/page-header";
import { PositionCard } from "@/components/markets/position-card";
import { PnlSummaryStrip } from "@/components/positions/pnl-summary-strip";
import { CountdownRing } from "@/components/positions/countdown-ring";
import { SellButton } from "@/components/markets/sell-button";
import { formatTzsCompact, formatDeadline } from "@/lib/utils";
import { listPositionsForUser, getMarket, cashOutValue, isSelectionClosed } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { ensureAffiliateAccount } from "@/lib/server/affiliate-service";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/filter-pill";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";
import { PageContainer } from "@/components/layout/page-container";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.positions };
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
  // MARKET only — Positions is the long-form-poll portfolio. Up & Down bets are a
  // separate game with their own history at /updown/history (Ali, 2026-07-25). The
  // page's own subtitle states that split to the player, so this scope is not a secret
  // the reader has to infer from the third argument.
  // B-1: a failed read must NOT render as "No open positions yet" — held money
  // vanishing on a DB blip reads as theft. Throw to positions/error.tsx instead.
  const positions = await listPositionsForUser(session.userId, 5_000, "MARKET");
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
    // B-1: a swallowed per-market read made that HELD position vanish from the
    // list (stake invisible). Let a failure reach the error boundary.
    marketMap.set(mid, await getMarket(mid));
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
          // Passed for consistency with the two `sellable` call sites. It does not
          // move this total — `value` does not depend on it. ⚠️ But see F7 in
          // docs/POLL-OPEN-FINDINGS.md: this total discounts a cash-out fee off a
          // position that can never BE cashed out, which understates the holding.
          { side: p.side, stake: p.stake, placedAt: p.placedAt, bonusStakeTzs: p.bonusStakeTzs },
          { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot: m.feeSnapshot },
        )).value;
      } catch { openLiveValue += p.potentialPayout; }
    } else {
      openLiveValue += p.potentialPayout;
    }
  }
  // Pre-compute cash-out values for open positions (cashOutValue is async).
  // `sellable` is false once the exit window has passed (or never opened for a
  // too-short poll) — the button must then show "rides to settlement", not a price.
  const openCashOutValues = new Map<string, number | null>();
  const openSellable = new Map<string, boolean>();
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      try {
        // `bonusStakeTzs` — see the note in markets/[id]/page.tsx. Without it this
        // page offers a priced Sell on a position cashOutPosition always refuses.
        const co = await cashOutValue({ side: p.side, stake: p.stake, placedAt: p.placedAt, bonusStakeTzs: p.bonusStakeTzs }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot: m.feeSnapshot });
        openCashOutValues.set(p.id, co.sellable ? co.value : null);
        openSellable.set(p.id, co.sellable);
      } catch { openCashOutValues.set(p.id, null); openSellable.set(p.id, false); }
    } else {
      openCashOutValues.set(p.id, null);
      openSellable.set(p.id, false);
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
    <PageContainer tier="reading" className="space-y-6">
      <RefreshPoller intervalMs={20_000} />
      <HashFocus />
      {/* Positions is a primary destination (bottom-nav + top-nav tab), not a
          leaf — no Back-to-markets link (IA review R3). */}
      <header className="flex items-start justify-between gap-3">
        {/* §L1 — ONE NAME FOR ONE DESTINATION. The eyebrow is the same word the top nav,
            the bottom-nav overflow and the avatar menu use (`common.positions`); it used to
            be `positions.title` ("History"), which was a third name for a page whose primary
            section is LIVE, at-risk money — not history.
            §L4 — and the headline used to read "Polls you've played". "Poll" is the poll
            product's own word, so it cannot serve as the name of a portfolio page, and this
            page's every other string already says "market". `headline` is the cross-product
            noun; `headlineBody` states the scope out loud, mirroring /updown/history, which
            says the same split from its side. */}
        <PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />
        {positions.length > 0 && (
          <Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0 mt-1">
            <I.chart s={13} />
            {t.performance.viewPerformance}
          </Link>
        )}
      </header>

      {/* Tab filter — All / Open / Settled (matches markets page filter pattern) */}
      {positions.length > 0 && (
        <nav
          /* ⚠️ The `-mx-1 px-1 overflow-x-auto` this used to carry was vestigial: the rail wraps,
             so a horizontal scroller never engages, and the 4px bleed pushed the row past its own
             container. Removed with the identical pair on /results. */
          className="flex flex-wrap items-center gap-1.5"
          aria-label={t.positions.filterAria}
          data-filter-rail
        >
          {([
            { id: "all", label: t.positions.tabAll, count: positions.length },
            { id: "open", label: t.positions.tabOpen, count: open.length },
            { id: "settled", label: t.positions.tabSettled, count: settled.length },
          ] as const).map((tab) => (
            <FilterPill
              key={tab.id}
              href={`/positions${tab.id === "all" ? "" : `?tab=${tab.id}`}`}
              label={tab.label}
              count={tab.count}
              on={activeTab === tab.id}
              semantics="tab"
            />
          ))}
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
              // Selling is shut if selections closed OR the exit window has passed.
              const sellShut = isSelectionClosed(m) || openSellable.get(p.id) === false;
              return (
                <div key={p.id} className="space-y-2">
                  <PositionCard
                    marketId={p.marketId}
                    marketTitle={pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
                    side={p.side}
                    // §L2 — stated, not assumed. This page filters to long-form at line 41,
                    // so YES/NO really is this position's vocabulary.
                    productLine="MARKET"
                    stake={p.stake}
                    current={liveValue ?? p.potentialPayout}
                    payout={p.potentialPayout}
                    status="OPEN"
                    // Once selections close, the pools are frozen and
                    // `potentialPayout` has been restamped with the EXACT amount
                    // (notifySelectionClosedMarkets → settledPayoutFor). Before
                    // that it is a moving projection and the card shows no figure.
                    // 🔴 THE STAMP, NOT THE CLOCK. `bettingClosed` makes the card
                    // promise "Exact — betting is closed and the pools are final"
                    // over `potentialPayout`. But that figure is only REPLACED with
                    // the exact settled amount when `notifySelectionClosedForMarket`
                    // runs, and that is a separate sweep — `isSelectionClosed()` is a
                    // pure time comparison that knows nothing about whether it fired.
                    //
                    // So between the cutoff instant and the sweep, the card presented
                    // the stale BET-TIME projection as a frozen exact figure. And the
                    // sweep is barred forever once the market leaves LIVE
                    // (market-service.ts:1220), so a market an officer resolves early
                    // never gets its restamp at all. Measured on production:
                    // pos_5c8d70dc0431d40ad699 was shown 6,911 and paid 6,723.
                    //
                    // `selectionClosedNotifiedAt` is written INSIDE the same function
                    // that restamps every position, so it is the only honest witness
                    // that the freeze happened. Without it the card falls back to
                    // "you'll get the number when betting closes" — which is true, and
                    // is a far better failure than a confident wrong number.
                    bettingClosed={isSelectionClosed(m) && !!m.selectionClosedNotifiedAt}
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
                            : `${t.positions.selectionCloses} ${formatDeadline(cutoffIso, serverNow)}`}
                        </p>
                      </div>
                    ) : null;
                  })()}
                  {(liveValue !== null || sellShut) && (
                    <SellButton
                      positionId={p.id}
                      stake={p.stake}
                      value={liveValue ?? 0}
                      placedAt={p.placedAt}
                      closesAt={m.selectionClosedAt ?? m.resolutionAt}
                      alreadyClosed={sellShut}
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
                    productLine="MARKET"
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
                <Pagination total={settled.length} page={settledPage} perPage={PLAYER_PER_PAGE} baseHref={settledBaseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />
              </div>
            )}
          </>
        )}
      </Section>}
    </PageContainer>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2">
        <span className="font-display text-[20px] font-semibold text-text">{title}</span>
        {/* ⚠️ `ml-auto` used to fling this number to the far right edge of the 1080px
            container, a whole screen-width away from the word it counts — at which distance
            a lone "0" reads as a stray character, not as a quantity. A count belongs beside
            its noun. And at zero it is suppressed entirely: the empty state directly below
            already says "No open positions yet" in words, so the digit adds nothing but the
            question of what it refers to. `tabular-nums` keeps 9 and 10 the same width. */}
        {count > 0 && (
          <span className="font-mono text-[12px] tabular-nums text-text-subtle">{count}</span>
        )}
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
