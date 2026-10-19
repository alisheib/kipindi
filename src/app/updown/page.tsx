/**
 * /updown — the Up & Down board.
 *
 * Per `Markets Appearing.txt`: this destination holds ONLY the short-term price rounds.
 * `/markets` holds long-form polls; `/live` shows both. That split is enforced at the
 * data layer (`listMarkets()` defaults to `productLine: "MARKET"`), not by filtering
 * here.
 *
 * Built to `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D2-updown-board-spec.md`, with one
 * correction to the brief: the grid stays 3-across at 1920 rather than widening to 4 —
 * the platform has a fixed 3-tier max-width system (1280 grid / 1080 content / 640
 * forms) and the board must not break it.
 */
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { I } from "@/components/ui/glyphs";
import { getBoard } from "@/lib/server/updown-board";
import { currentSession } from "@/lib/server/auth-service";
import { getServerT } from "@/lib/i18n-server";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { judViewerFor } from "@/lib/server/journey-updown";
import { pickLocalized } from "@/lib/localized";
import { UpDownCard } from "@/components/updown/updown-card";
import { UpDownResultAnnouncer } from "@/components/updown/updown-result-announcer";
import { UpDownBoardTabs } from "@/components/updown/updown-board-tabs";
import { BoardViz } from "@/components/charts/board-viz";
import { OutcomeCubes } from "@/components/charts/outcome-cubes";
import { UpDownChartLab } from "@/components/charts/updown-chart-lab";
import { SOURCE_CLASS_KEY, fmtEATClock } from "@/lib/updown-source-label";
import { msOrNull, roundIsSettled } from "@/lib/updown-card-phase";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakSentence, breakStateOf } from "@/lib/break-end";
import { bettableFirst } from "@/lib/updown-board-order";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.udTitle };
}

// usd() → the ONE spelling in @/lib/usd-price (session 80 — six private copies unified).

/** The board header's pill recipe — ONE definition, because the two pills must match each other
 *  and because a second copy of its `tracking-[0.10em]` is what took the arbitrary-tracking
 *  ratchet 236 → 237. `test:type-scale` §6 caught it. */
const HEADER_PILL =
  "ud-header-action inline-flex shrink-0 items-center gap-1 rounded-pill border border-border bg-bg-elevated font-mono text-caption text-text-muted hover:text-text hover:border-brand-400 transition-colors";

export default async function UpDownPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string; d?: string }>;
}) {
  const sp = await searchParams;
  const { t, locale } = await getServerT();
  const session = await currentSession();
  /* ⭐ R6-A (2026-10-09, reviewer A's A2) · THE READER'S OWN BREAK. A bettable card offered its one-tap stakes to a player who
     had paused betting (the server refused each tap); the card now draws the break's notice in their place (`breakBody`,
     below). Read beside the board, and failing OPEN — it gates an invitation (`feature-state.ts` LAW 1): a failed read
     shows the stakes, and the server still refuses the bet. */
  const breakRead = session
    ? Promise.resolve().then(() => isLockedOut(session.userId)).then(breakStateOf).catch(() => null)
    : Promise.resolve(null);
  // ⛔ UD-15 · NO `.catch(() => null)` HERE ANY MORE. Swallowing the read rendered a
  // DB outage as a calm "No rounds open right now" — an empty state is a statement
  // about the WORLD ("nothing scheduled"), not about the PLATFORM. A real throw now
  // reaches error.tsx: named, retryable, honest. The empty branch below remains for
  // the query that SUCCEEDED and found nothing.
  const board = await getBoard({
    assetKey: sp.asset,
    /* ⛔ A URL-SUPPLIED NUMBER IS NOT A NUMBER UNTIL IT IS CHECKED (2026-09-18). `?d=abc` made
       `Number(sp.d)` **NaN** and `?d=-5` a negative duration, and both were passed straight
       into the board query as a real filter value. Anything unreadable is now simply absent,
       which is the same thing as "no duration filter" and the branch below already handles it. */
    durationMinutes: Number.isInteger(Number(sp.d)) && Number(sp.d) > 0 ? Number(sp.d) : undefined,
    userId: session?.userId,
  });

  if (board.assets.length === 0) {
    return (
      <div className="mx-auto w-full max-w-board px-3 lg:px-6 py-6">
        <PageHeader title={t.market.udTitle} subtitle={t.market.udTagline} />
        <div className="mt-6">
          <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
        </div>
      </div>
    );
  }

  const { assets, activeAsset, activeDuration, rounds, recent, chainPaused, nextMarketOpenAtMs, stakeBounds, walletBalance } = board;
  const marketReopensAt = nextMarketOpenAtMs != null && nextMarketOpenAtMs > Date.now()
    ? fmtEATClock(nextMarketOpenAtMs)
    : null;
  const displayedRounds = bettableFirst(rounds, Date.now());
  const href = (assetKey: string, d?: number) => `/updown?asset=${assetKey}${d ? `&d=${d}` : ""}`;
  // The terminal's reference is the same frozen opening price shown by the round card.
  const inPlay = rounds.find((r) => !roundIsSettled(r.state) && r.openPrice != null) ?? null;
  // Immutable observations used by the cards take precedence over a vendor bar
  // revised later at the same quoted minute. The chart receives only these
  // real receipts; its renderer leaves a gap if today's bar disagrees.
  const chartPricePins = displayedRounds.flatMap((round) => [
    { quotedAt: round.openQuotedAt, price: round.openPrice },
    { quotedAt: round.readQuotedAt, price: round.readPrice },
    { quotedAt: round.closeQuotedAt, price: round.closePrice },
  ]);
  const isAuthed = !!session;
  // ⛔ NO IDENTITY READ ON THE BOARD SINCE 2026-09-13 — a stake asks no identity question
  // (`kyc-gate.ts`), so quick-bet is armed for every signed-in player. The `kycBlocked` read and prop
  // that switched it off from 2026-09-05 are deleted; do not restore them.
  // ⭐ ONE PAGE, ONE NAME (R5-G, 2026-10-09, G-1's sweep): for a journey request the history pill opens Tiketi zangu's
  // Up & Down kind, whose h1 and tab say "Tiketi zangu" (`updown/history/page.tsx`), so the pill names that page and wears
  // its sign — the ticket the Tiketi zangu tab draws (`JOURNEY_TABS`); everybody else's pill keeps "Juu na Chini zako"
  // and the portfolio sign, the name its page gives itself for them. The shell's own cached answer for this request.
  const { journey } = await resolveSimpleJourney();
  const historyName = journey ? t.journey.tabTickets : t.market.udHistoryTitle;
  // S12 WP10 · a journey reader's own facts for Juu/Chini's journey arm, re-read on every render (the poll); classic: none.
  const judViewer = journey && session ? await judViewerFor(session.userId, session.playStartedAt) : null;
  // R6-A · the break's approved sentence with its end, one kept run (`breakSentence`, the one formatter), for every card.
  const breakEnd = await breakRead;
  const breakBody = breakEnd
    ? breakSentence(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, breakEnd.until, Date.now(), t.common.monthsShort, locale)
    : null;

  return (
    <div className="ud-board-page mx-auto w-full max-w-board px-3 lg:px-6 py-6">
      {/* Rounds turn over in minutes, so the board refreshes itself. */}
      <RefreshPoller intervalMs={20_000} />

      {/* U43 B3: the two destinations have visible names, including on a phone. */}
      <PageHeader
        className="ud-board-header"
        title={t.market.udTitle}
        subtitle={t.market.udTagline}
        actions={
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/legal/rules/up-down"
            aria-label={t.common.readFullRules}
            className={HEADER_PILL}
          >
            <I.tippingScales s={13} />
            <span>{t.market.udRulesShort}</span>
          </Link>
          {/* This game's own portfolio — separate from the long-form Bets page. */}
          <Link
            href="/updown/history"
            aria-label={historyName}
            className={HEADER_PILL}
          >
            {journey ? <I.ticket s={13} /> : <I.portfolio s={13} />}
            <span>{t.common.myBets}</span>
          </Link>
        </div>
        }
      />

      {/* ⭐ UD-13 · asset/duration tabs are a FILTER: the client shell below runs the
          navigation in a transition and keeps the live board on screen (dimmed) while
          the filtered one streams in — no skeleton flash, no countdown restart. */}
      <UpDownBoardTabs
        /* 🔴 PLAYER-FILTERS 2026-09-09 · AN ASSET CHIP NOW CARRIES THE DURATION THE PLAYER IS ON.
           ⛔ IT USED TO BE `href(a.key)` — ASSET ONLY, NO `d`. So every asset tap threw the
           player's chosen round length away and the server re-picked one
           (`updown-board.ts`: `runningDurations(...)[0] ?? durations[0]`, i.e. the SHORTEST
           running chain). Two consequences, both of which read to a player as the control doing
           something other than what it says:
             · tapping Gold while on Bitcoin 15 min lands on Gold 15 min only by luck — the
               fixture's gold runs 15/30/60, so it did; BTC's shortest is 3, so coming back
               landed on **3 min**, not the 15 the player had chosen and could still see;
             · tapping the asset ALREADY IN FORCE — the most natural "nothing should happen" tap
               there is — silently moved a player from 15 min to 3 min.
           ⭐ Ali, relaying players: *"they click a time, maybe 15mins, and it clicks something
           else."* This is one of the two mechanisms that produces exactly that sentence, and it
           is the one that needs no race and no slow network to reproduce.
           ⛔ THE DURATION IS CARRIED ONLY WHEN THE TARGET ASSET ACTUALLY RUNS IT. Gold does not
           run a 3-minute chain, so `?asset=XAU&d=3` would ask for a chain that does not exist and
           `getBoard` would fall through to a default anyway — the difference being that the URL
           would then be a false statement about what the player asked for. Where the duration
           does not carry, we omit it and let the server choose, which is the old behaviour kept
           for exactly the case it was right about. */
        assetTabs={assets.map((a) => ({
          key: a.key,
          href: href(a.key, activeDuration != null && a.durations.includes(activeDuration) ? activeDuration : undefined),
          label: pickLocalized(locale, a.nameEn, a.nameSw, a.nameZh),
        }))}
        durationTabs={activeAsset ? activeAsset.durations.map((d) => ({ d, href: href(activeAsset.key, d) })) : []}
        activeAssetKey={activeAsset?.key ?? null}
        activeDuration={activeDuration}
        assetsLabel={t.market.udAssets}
        durationsLabel={t.market.udDurations}
        minLabel={t.market.udMin}
        sheetTitle={t.market.udFilterTitle}
        /* UD-13c · the trigger's key. ⛔ `filtersOpen` is the EXISTING word the /markets
           trigger already uses in all three languages — not a second key for one noun. */
        sheetLabel={t.market.filtersOpen}
        sheetAria={t.market.udFilterAria}
        sheetClose={t.market.filtersClose}
        sheetDone={t.common.done}
      >

      <div className="ud-board-stage">
      <div className="ud-board-lab">
      {(recent.length > 0 || activeAsset != null) && (
        <BoardViz
          labels={{
            chart: t.market.udPriceChart,
            cubesEyebrow: t.market.udLastRounds,
          }}
          cubes={recent.length > 0 ? (
            <OutcomeCubes
              outcomes={recent}
              labels={{ up: t.market.udUp, down: t.market.udDown, void: t.market.statusVoid, oldestNewest: t.market.udOldestNewest }}
            />
          ) : null}
          // CHART-SPRINT-2 · chart mode is offered whenever an asset is active.
          // ⚠️ The ROUND frame was REMOVED by Ali's closing order (2026-09-04
          // evening, §B12.6): the terminal is history-only; the round's own
          // numbers live on the cards below and the detail hero.
          chart={activeAsset != null ? (
            <UpDownChartLab
              assetKey={activeAsset.key}
              locale={locale}
              labels={{
                railAria: t.market.udRangeAria,
                styleAria: t.market.udStyleAria,
                curve: t.market.udStyleCurve,
                candles: t.market.udStyleCandles,
                noCandles: t.market.udNoCandles,
                empty: t.market.udNoReads,
                loading: t.common.loading,
                error: t.market.udChartError,
                chartAria: `${pickLocalized(locale, activeAsset.nameEn, activeAsset.nameSw, activeAsset.nameZh)} ${t.market.udLiveChart}`,
                // E-53 grammar for the terminal's receipt footer — the KIND of
                // market, never the vendor; the quote time is per-poll client data.
                sourceLabel: t.market[SOURCE_CLASS_KEY[activeAsset.sourceClass]],
                quotedWord: t.market.udQuoted,
                confirmedPrice: t.market.udConfirmedPrice,
              }}
              priceToBeat={inPlay?.openPrice ?? null}
              pinnedReads={chartPricePins}
            />
          ) : null}
        />
      )}
      </div>

      <div className="ud-board-rounds">
        {/* ⛔ E-67 · THE GATE IS "ARE THERE ROUNDS", NOT "IS THE CHAIN RUNNING".
            This read `chainPaused || rounds.length === 0`, which was survivable only while a
            chain being STOPPED implied no rounds existed. Since Ali stopped automatic emission
            (*"my admins will enter and generate every 5 min"*) EVERY chain is STOPPED and rounds
            are created by hand — so that condition hid a real, live, playable round behind
            "No rounds open right now". Measured: `udr_cd386bbaeaf63be696f5`, open price
            63,719.98, targets set, live until 21:15 UTC, and completely invisible to players.
            A chain's state says whether MORE rounds will appear; it says nothing about whether
            the one on the board can be played. */}
        {/* ⭐ THE RESULT MOMENT (Ali, 2026-08-05). Announces on the OBSERVED transition of a
            round this viewer holds from unsettled → settled, which the RefreshPoller above
            delivers by re-rendering this server tree without remounting client children.
            ⛔ In-app only — no email, no push, no inbox row. Ali's 2026-07-24 suppression of
            per-round Up & Down notifications STANDS; this renders data the page already has. */}
        <UpDownResultAnnouncer rounds={rounds.map((r) => ({ roundId: r.roundId, settledAtMs: r.resolvedAtMs, myResult: r.myResult }))} />
        {rounds.length === 0 ? (
          // ⭐ UD-22 · a chain between rounds is NOT an idle market. Rounds are
          // operator-generated (E-67), so the gap between them showed the same copy as
          // "nothing here today" and a player could not tell "wait a bit" from "leave".
          // When the asset+duration resolves to a real chain, say the honest thing —
          // the next round is being prepared — without promising a cadence manual
          // generation does not guarantee. (Copy flagged for Ali's sign-off in §9.)
          marketReopensAt != null ? (
            <EmptyState
              title={t.market.udNoRounds}
              body={t.market.udMarketClosedUntil.replace("{time}", `${marketReopensAt} EAT`)}
            />
          ) : chainPaused ? (
            <EmptyState title={t.market.udNoRounds} body={t.market.udNextMatchNoneBody} />
          ) : activeDuration != null ? (
            <EmptyState
              title={t.market.udNoRounds}
              body={t.market.udNoRoundsBody}
            />
          ) : (
            <EmptyState title={t.market.udNoRounds} body={t.market.udNoRoundsBody} />
          )
        ) : (
          /* ⭐ A TRACK NEVER WIDER THAN THE COLUMN (round 6, 2026-10-09, review C8 — `.market-grid`'s own guard, globals.css):
             the 300px floor made the one track 300px inside a 288px column at 320, so every round card ran 12px past it
             (4px from the screen's edge) until 332px. `min(300px, 100%)` keeps the floor wherever it fits. */
          <div className="grid items-start gap-4"
               style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))" }}>
            {displayedRounds.map((r) => (
              <UpDownCard
                key={r.roundId}
                roundId={r.roundId}
                // UD-22 · assembled server-side on the round itself, so the card and
                // `/updown/[roundId]` confirm a bet with the same sentences.
                receipt={r.receipt}
                assetName={pickLocalized(locale, activeAsset!.nameEn, activeAsset!.nameSw, activeAsset!.nameZh)}
                assetTicker={activeAsset!.key}
                assetIcon={activeAsset!.iconKey}
                assetKey={activeAsset!.key}
                durationMinutes={r.durationMinutes}
                decimals={activeAsset!.decimals}
                /* This price and its stamp belong to this round. The asset's latest quote may
                   belong to a later round; a settled card uses its frozen close instead. */
                readPrice={r.readPrice}
                readUnavailable={r.readUnavailable}
                openPrice={r.openPrice}
                upTarget={r.upTarget}
                downTarget={r.downTarget}
                opensAtMs={Date.parse(r.opensAt)}
                closesAtMs={Date.parse(r.closesAt)}
                /* ⛔ `msOrNull`, NOT `x ? Date.parse(x) : null` (2026-09-18). `Date.parse` answers
                   **NaN** for a string it cannot read, and NaN is not null, so the old spelling
                   handed NaN straight to the card. ✅ What that fixes: `formatClock(NaN)` threw
                   `RangeError` out of render into the route error boundary, losing the whole board
                   to a clock caption. ⛔ What it does NOT fix: `roundPhase`'s `pastLock` collapses
                   for null exactly as it did for NaN, so an unreadable lock instant still reads as
                   "no betting window" — see `msOrNull`'s own header. */
                selectionClosesAtMs={msOrNull(r.selectionClosedAt)}
                serverNowMs={r.serverNowMs}
                expectedResultAtMs={/* E-99 · null under the sample floor → no clock, never a
                                        guessed one. */ r.expectedResultAtMs}
                /* ⭐ E-166 · what this card says once its round is finished. The instants are
                   the SERVER's — the chain's own next boundary and the successor market's own
                   lock — so the card never invents "when does the next match start". */
                resolvedAtMs={r.resolvedAtMs}
                successor={r.successor}
                successorOnBoard={rounds.some((card) => card.roundId === r.successor?.roundId)}
                nextMarketOpenAtMs={nextMarketOpenAtMs}
                chainPaused={chainPaused}
                myExactPayout={r.myExactPayout}
                myPayoutIfUp={r.myPayoutIfUp}
                myPayoutIfDown={r.myPayoutIfDown}
                volumeTzs={r.volumeTzs}
                players={r.players}
                pricing={r.pricing}
                state={r.state}
                outcome={r.outcome === "VOID" ? null : r.outcome}
                closePrice={r.closePrice}
                voidReason={r.voidReason as never}
                sourceClass={activeAsset!.sourceClass}
                openQuotedAt={r.openQuotedAt}
                readQuotedAt={r.readQuotedAt}
                closeQuotedAt={r.closeQuotedAt}
                marketId={r.marketId}
                isAuthed={isAuthed}
                minStake={stakeBounds.min}
                maxStake={stakeBounds.max}
                walletBalance={judViewer ? judViewer.spendable : walletBalance}
                myUpStake={r.myUpStake}
                myDownStake={r.myDownStake}
                myRefundedStake={r.myRefundedStake}
                myResults={r.myResults}
                breakBody={breakBody}
                /* S12 · spread only for a journey reader: a classic card's props (and the page's flight data) gain no key. */
                {...(judViewer ? { journey: judViewer } : {})}
              />
            ))}
          </div>
        )}
      </div>
      </div>
      </UpDownBoardTabs>
    </div>
  );
}
