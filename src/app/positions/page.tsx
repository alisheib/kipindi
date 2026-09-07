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
import { listPositionsForUser, positionCardMarkets, cashOutValue, isSelectionClosed } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { ensureAffiliateAccount, inviteViewerFor } from "@/lib/server/affiliate-service";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, matchesQuery, parseQuery, POSITION_SEARCH } from "@/lib/search";
import { PositionsBar, type PortfolioCounts } from "./positions-bar";
import {
  buildPortfolioHref,
  filterPortfolio,
  parsePortfolioParams,
  portfolioCounts,
  portfolioEmptyCause,
  portfolioExits,
  sortPortfolio,
  type PortfolioRow,
} from "@/lib/positions/portfolio";
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

export default async function PositionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/positions");
  const sp = await searchParams;

  /**
   * ⭐ EVERY AXIS IS IN THE URL — §3 rule 6. Shareable, refresh-safe, back-button-safe, and
   * narrowed against closed sets, so a hand-edited link renders a page rather than a 500.
   * ⚠️ It replaced a bespoke ternary over `["open","settled","all"]`. `?tab=open` and
   * `?tab=settled` still mean exactly what they meant, so every link already in the wild —
   * shared, bookmarked, or sitting in a notification — keeps working.
   */
  const state = parsePortfolioParams(sp);

  // Fetch the full history (no silent 100-cap), then paginate with the shared player page size
  // so older positions stay reachable.
  // MARKET only — Positions is the long-form-poll portfolio. Up & Down bets are a separate game
  // with their own history at /updown/history (Ali, 2026-07-25). The page's own subtitle states
  // that split to the player, so this scope is not a secret the reader has to infer.
  // B-1: a failed read must NOT render as "No open positions yet" — held money vanishing on a DB
  // blip reads as theft. Throw to positions/error.tsx instead.
  const positions = await listPositionsForUser(session.userId, 5_000, "MARKET");

  /**
   * 🔴 A SHARE LINK USED TO CARRY A LIVE REFERRAL CODE FOR EVERY PLAYER, AND THE BIND IS
   * PERMANENT. `ensureAffiliateAccount` mints a code for whoever asks, so this line attached one
   * to every shared position — and anyone registering through it was bound by `bindRecruit`,
   * which sets `recruitedBy` ONCE and never re-attributes. It paid nothing, so nothing showed; it
   * was a standing liability that would begin paying the moment the programme was re-enabled,
   * against attributions nobody chose.
   *
   * ⭐ Now a code is minted and attached ONLY for someone the programme actually belongs to.
   */
  const myRefCode = inviteIsLiveFor(await inviteViewerFor(session.userId))
    ? await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined)
    : undefined;

  /**
   * ⛔ EVERY POSITION'S MARKET, IN ONE QUERY — AND OVER THE WHOLE PORTFOLIO, NOT THE PAGE.
   *
   * This replaced `for (const mid of marketIds) marketMap.set(mid, await getMarket(mid))`, which
   * was one full-row `findUnique` per rendered position, awaited in series. Two reasons, and the
   * second is correctness rather than speed:
   *   · `market-dal.ts`'s own measurements put a full-row read of this very wide table at
   *     2,534 ms for ONE of them on an admin page;
   *   · the old loop was fed from `open + pagedSettled` — the rows that survived PAGING. Filtering
   *     and sorting by market TITLE needs titles for every position a player holds, so a map built
   *     after paging would search only the twelve rows already on screen. ⛔ **A filter computed
   *     over the rendered page is not a filter.**
   */
  const marketMap = await positionCardMarkets([...new Set(positions.map((p) => p.marketId))]);

  /**
   * The decorated rows the contract reasons about.
   *
   * ⚠️ A position whose market is missing is DROPPED, and that is the existing behaviour made
   * explicit rather than a new rule: the old render did `if (!m) return null` inside the grid, so
   * such a row was already invisible. Doing it HERE is what makes the counts agree with the list —
   * a row that cannot render must not be counted on a pill that promises to show it.
   */
  const rows: PortfolioRow[] = positions.flatMap((p) => {
    const m = marketMap.get(p.marketId);
    if (!m) return [];
    return [{
      id: p.id,
      marketId: p.marketId,
      status: p.status as PortfolioRow["status"],
      side: p.side,
      stake: p.stake,
      // ⛔ `null`, never 0, while OPEN — an open bet has no return yet, and that is not a return
      //    of zero. `sortPortfolio` partitions on exactly this and puts them last BOTH ways.
      finalPayout: p.status === "OPEN" ? null : (p.finalPayout ?? 0),
      placedAtMs: Date.parse(p.placedAt) || 0,
      // The clock the CARD shows is the clock it is sorted and windowed by.
      closesAtMs: Date.parse(m.selectionClosedAt ?? m.resolutionAt) || 0,
      category: m.category,
      title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh),
      titleEn: m.titleEn,
      titleSw: m.titleSw ?? "",
      titleZh: m.titleZh ?? "",
    }];
  });

  /**
   * The shared search grammar — quoted phrases, `-exclude`, `field:`. ⛔ Not re-implemented here.
   * `POSITION_SEARCH` is a `viewModel` schema, so it may only ever meet `matchesQuery`; handing it
   * to `queryToWhere` would emit a `where` on columns that do not exist on `Position`.
   */
  const parsed = parseQuery(state.q);
  const matchesText = (row: PortfolioRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, POSITION_SEARCH);

  const serverNow = Date.now();
  /**
   * ⚠️ ONE COLLATOR, BUILT ONCE. `new Intl.Collator(locale).compare` is expensive and a sort calls
   * it O(n log n) times. ⛔ And it is built from the VIEWER's locale — a bare `localeCompare()`
   * with no argument orders by the SERVER's, which is one answer for every player and the wrong
   * one for most of them.
   */
  const collate = new Intl.Collator(locale).compare;

  const counts = portfolioCounts(rows, state, serverNow, matchesText) as PortfolioCounts;
  const matched = sortPortfolio(filterPortfolio(rows, state, serverNow, matchesText), state, collate);

  // Paging. ⛔ The pager total IS the bar's result count — same variable, never recomputed.
  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / PLAYER_PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const paged = matched.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE);

  const byId = new Map(positions.map((p) => [p.id, p]));

  /**
   * P&L summary — the WHOLE portfolio, never the filtered view.
   *
   * ⭐ §K 7d's rule applied to a filter rather than a tab: a money figure a player acts on is a
   * STATE, and a state may not move because a control was pressed. "Your standing" answers *"how
   * am I doing"*, not *"how am I doing among the eleven rows I just filtered to"* — a strip that
   * re-totalled on every pill would let a player believe they had lost money by pressing `Won`.
   * It therefore sits ABOVE the rail and reads from `positions`.
   */
  const open = positions.filter((p) => p.status === "OPEN");
  const settled = positions.filter((p) => p.status !== "OPEN");
  const openStake = open.reduce((s, p) => s + p.stake, 0);
  // C2c — YES/NO exposure split of open stake (green/rose bar).
  const openYesStake = open.filter((p) => p.side === "YES").reduce((s, p) => s + p.stake, 0);
  const openNoStake = openStake - openYesStake;

  /**
   * Live cash-out value per open position — priced once, read three times (the strip's total, the
   * card's `current`, and the Sell button).
   *
   * ⚠️ They resolve TOGETHER rather than in series, and that is safe rather than bold:
   * `cashOutValue` is pure arithmetic over the arguments it is handed, and `ratesFor(market)`
   * reads the market's OWN frozen snapshot, never live config — a mid-poll retune must not change
   * the exit terms a player was promised when they bet.
   */
  const priced = await Promise.all(open.map(async (p) => {
    const m = marketMap.get(p.marketId);
    // Computed for CLOSED markets too — not so the player can sell (they cannot), but so the
    // SellButton still renders and TELLS them selling has shut. Silently removing the control
    // leaves them guessing where their exit went.
    if (!m || (m.status !== "LIVE" && m.status !== "CLOSED")) {
      return { id: p.id, value: null as number | null, sellable: false, live: p.potentialPayout };
    }
    try {
      const co = await cashOutValue(
        { side: p.side, stake: p.stake, placedAt: p.placedAt, bonusStakeTzs: p.bonusStakeTzs },
        { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot: m.feeSnapshot },
      );
      const sellable = m.status === "LIVE" && co.sellable;
      // ⚠️ A price is offered only when the exit is actually open. Otherwise the button must say
      //    "rides to settlement" — never a number nobody can take.
      return { id: p.id, value: sellable ? co.value : null, sellable, live: co.value };
    } catch {
      return { id: p.id, value: null as number | null, sellable: false, live: p.potentialPayout };
    }
  }));
  const pricedById = new Map(priced.map((x) => [x.id, x]));
  // ⚠️ F7 in docs/POLL-OPEN-FINDINGS.md: this total discounts a cash-out fee off a position that
  //    can never BE cashed out, which understates the holding. Unchanged here; recorded there.
  const openLiveValue = priced.reduce((s, x) => s + x.live, 0);

  const settledNet = settled.reduce((s, p) => {
    if (p.status === "WIN" || p.status === "CASHED_OUT") return s + ((p.finalPayout ?? 0) - p.stake);
    if (p.status === "LOSS") return s - p.stake;
    return s; // VOID = 0
  }, 0);
  const wins = settled.filter((p) => p.status === "WIN").length;
  const losses = settled.filter((p) => p.status === "LOSS").length;
  const cashOuts = settled.filter((p) => p.status === "CASHED_OUT").length;

  /**
   * ⛔ AN EMPTY LIST NAMES ITS OWN CAUSE AND OFFERS A WAY OUT THAT WORKS — §3 rule 8. Five causes,
   * never one generic message, and never an exit whose real count is zero.
   *
   * ⚠️ `no-rows` offers no exits, because there is nothing to widen TO: a player with no positions
   * needs a market, not a filter. Same reason `/markets` withholds them on an empty platform — an
   * exit that leads to another empty page is worse than no exit at all.
   */
  const cause = portfolioEmptyCause(state, serverNow, matchesText, matched.length, rows.length);
  const exits = cause && cause !== "no-rows" ? portfolioExits(rows, state, serverNow, matchesText) : [];
  const EXIT_LABEL: Record<string, string> = {
    side: t.positions.exitSide, topic: t.positions.exitTopic, when: t.positions.exitWhen,
    q: t.positions.exitSearch, tab: t.positions.exitLens,
  };
  const LENS_EMPTY: Record<string, string> = {
    open: t.positions.emptyOpenLens, settled: t.positions.emptySettledLens,
    win: t.positions.emptyWon, loss: t.positions.emptyLost,
    void: t.positions.emptyRefunded, cashed: t.positions.emptyCashed,
  };
  const emptyTitle =
    cause === "no-rows" ? t.positions.noOpenYet
    : cause === "search-miss" ? t.positions.emptySearch
    : cause === "window-miss" ? t.positions.emptyWindow
    : cause === "lens-empty" ? (LENS_EMPTY[state.tab] ?? t.positions.emptyFilter)
    : t.positions.emptyFilter;
  /* ⚠️ EVERY CAUSE GETS ITS OWN BODY. "Widen one of them to see more" is the right sentence for a
     filter miss and the wrong one for a SEARCH miss — there is nothing to widen, only words to
     change — which is exactly the "never one generic message" rule applied one level down from
     the title. Caught by reading the rendered empty state rather than by any assertion. */
  const emptyBody =
    cause === "no-rows" ? t.positions.noOpenBody
    : cause === "lens-empty" ? t.positions.emptyLensBody
    : cause === "search-miss" ? t.positions.emptySearchBody
    : cause === "window-miss" ? t.positions.emptyWindowBody
    : t.positions.emptyFilterBody;

  return (
    <PageContainer tier="reading" className="space-y-6">
      <RefreshPoller intervalMs={20_000} />
      <HashFocus />
      {/* Positions is a primary destination (bottom-nav + top-nav tab), not a
          leaf — no Back-to-markets link (IA review R3). */}
      <header className="flex items-start justify-between gap-3">
        {/* §L1 — ONE NAME FOR ONE DESTINATION. The eyebrow is the same word the top nav, the
            bottom-nav overflow and the avatar menu use (`common.positions`); it used to be
            `positions.title` ("History"), a third name for a page whose primary content is LIVE,
            at-risk money.
            §L4 — and the headline used to read "Polls you've played". "Poll" is the poll product's
            own word, so it cannot serve as the name of a portfolio page. */}
        <PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />
        {positions.length > 0 && (
          <Link href={"/positions/performance" as never} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5 shrink-0 mt-1">
            <I.chart s={13} />
            {t.performance.viewPerformance}
          </Link>
        )}
      </header>

      {/* "Your standing" — a STATE, so it sits above the rail and never moves when a filter is
          pressed. See the note on its inputs above. */}
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

      {/* C2c — YES/NO exposure bar: green/rose split of open stake, with end-labels
          (a11y §6b — never colour-only). Part of the standing, so it stays above the rail. */}
      {positions.length > 0 && openStake > 0 && (
        <div className="rounded-lg border border-border bg-bg-elevated/60 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.12em] tabular-nums">
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

      {positions.length > 0 && (
        <>
          {/* ⭐ Search sits OUTSIDE the sheet at every width — a player who can see the box knows
              the page is searchable. `helpFields` teaches the grammar by clickable example. */}
          <SearchBox
            placeholder={t.positions.searchPlaceholder}
            ariaLabel={t.positions.searchPlaceholder}
            helpFields={fieldNames(POSITION_SEARCH)}
          />
          <PositionsBar state={state} counts={counts} resultCount={matched.length} t={t} />
        </>
      )}

      {paged.length === 0 ? (
        <Empty
          kind="positions"
          title={emptyTitle}
          body={emptyBody}
          browseLabel={cause === "no-rows" ? t.positions.browseMarkets : undefined}
          exits={exits.map((e) => ({
            id: e.id,
            // ⛔ The count is REAL and cross-filtered — `portfolioExits` never offers an exit whose
            //    count is zero, so no way out here leads to another empty page.
            label: `${EXIT_LABEL[e.id] ?? e.id} (${e.count})`,
            href: buildPortfolioHref(state, e.patch),
          }))}
        />
      ) : (
        <>
          {/* ⭐ ONE LIST, NOT TWO SECTIONS. The Open/Settled headings were this page's only way to
              separate what is running from what is finished — which is exactly what the lens strip
              now does, with counts, and with four more answers than the headings could give. Two
              sections plus a global sort would also have had to disagree about what "most recent"
              means. An OPEN row keeps its ring and its Sell button, because those are properties
              of the CARD, not of a section. */}
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            {paged.map((row) => {
              const p = byId.get(row.id);
              const m = marketMap.get(row.marketId);
              if (!p || !m) return null;
              if (row.status !== "OPEN") {
                return (
                  <PositionCard
                    key={p.id}
                    marketId={p.marketId}
                    marketTitle={row.title}
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
              }
              const price = pricedById.get(p.id);
              const liveValue = price?.value ?? null;
              // Selling is shut if selections closed OR the exit window has passed.
              const sellShut = isSelectionClosed(m) || price?.sellable === false;
              const cutoffIso = m.selectionClosedAt ?? m.resolutionAt;
              const closed = isSelectionClosed(m);
              return (
                <div key={p.id} className="space-y-2">
                  <PositionCard
                    marketId={p.marketId}
                    marketTitle={row.title}
                    side={p.side}
                    // §L2 — stated, not assumed. This page filters to long-form above, so YES/NO
                    // really is this position's vocabulary.
                    productLine="MARKET"
                    stake={p.stake}
                    current={liveValue ?? p.potentialPayout}
                    payout={p.potentialPayout}
                    status="OPEN"
                    // 🔴 THE STAMP, NOT THE CLOCK. `bettingClosed` makes the card promise "Exact —
                    // betting is closed and the pools are final" over `potentialPayout`. That
                    // figure is only REPLACED with the exact settled amount when
                    // `notifySelectionClosedForMarket` runs, and that is a separate sweep;
                    // `isSelectionClosed()` is a pure time comparison that knows nothing about
                    // whether it fired. Between the cutoff and the sweep the card presented a
                    // stale BET-TIME projection as a frozen exact figure — measured on production,
                    // pos_5c8d70dc0431d40ad699 was shown 6,911 and paid 6,723.
                    // `selectionClosedNotifiedAt` is written INSIDE the function that restamps
                    // every position, so it is the only honest witness that the freeze happened.
                    bettingClosed={closed && !!m.selectionClosedNotifiedAt}
                    placedAt={p.placedAt}
                    positionId={p.id}
                    refCode={myRefCode}
                  />
                  {m.status === "LIVE" && (
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
                  )}
                  {(liveValue !== null || sellShut) && (
                    <SellButton
                      positionId={p.id}
                      stake={p.stake}
                      value={liveValue ?? 0}
                      placedAt={p.placedAt}
                      closesAt={cutoffIso}
                      alreadyClosed={sellShut}
                      serverNow={serverNow}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination
                total={matched.length}
                page={safePage}
                perPage={PLAYER_PER_PAGE}
                /* ⛔ The pager's base carries every ACTIVE filter, so page 2 of "Won" is page 2 of
                   "Won" — and `buildPortfolioHref` omits defaults, so an unfiltered pager URL
                   stays clean. */
                baseHref={buildPortfolioHref(state)}
                ofLabel={t.common.of}
                prevLabel={t.common.previousPage}
                nextLabel={t.common.nextPage}
                firstLabel={t.common.firstPage}
                lastLabel={t.common.lastPage}
              />
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

function Empty({
  kind,
  title,
  body,
  browseLabel,
  exits,
}: {
  kind: "positions" | "default";
  title: string;
  body?: string;
  browseLabel?: string;
  /** ⛔ Each carries a REAL, cross-filtered count — never an exit to another empty page. */
  exits?: Array<{ id: string; label: string; href: string }>;
}) {
  return (
    /* ⭐ PV-03 — `fill` because this page's list is FULL-WIDTH. The page declares `tier="reading"`
       and gets its 1016px container correctly; what was wrong is that the default `mx-auto`
       centred a 360px card while the heading above it sat left, reading as two unrelated things.
       ⛔ Not a width fix: the measure was always right (see the record, PV-03 "re-derived"). */
    <EmptyState
      fill
      kind={kind}
      title={title}
      body={body}
      action={
        browseLabel ? (
          <Link href={"/markets" as never} className="btn btn-primary btn-sm">
            {browseLabel}
          </Link>
        ) : exits && exits.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {exits.map((e) => (
              <Link key={e.id} href={e.href as never} replace scroll={false} className="btn btn-ghost btn-sm">
                {e.label}
              </Link>
            ))}
          </div>
        ) : null
      }
    />
  );
}
