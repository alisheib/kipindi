import type { Metadata } from "next";
import { ROOT_OPEN_GRAPH } from "./layout";
import Link from "next/link";
import { fill } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";

import {
  listMarkets, isClosedByTime, isSelectionClosed, traderSeedsByMarket,
  MARKET_CATEGORIES,
} from "@/lib/server/market-service";

import { getCardCharts } from "@/lib/server/market-history";
import { getSession } from "@/lib/server/session";
import { getPlatformStats } from "@/lib/server/platform-stats";
import { LandingHero, LandingProof } from "@/components/home/landing-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { TopicTiles } from "@/components/home/topic-tiles";
import { TrustBand } from "@/components/home/trust-band";
import { UpdownBand, type UpdownBandRound } from "@/components/home/updown-band";
import { roundStore } from "@/lib/server/updown-dal";
import { getRoundDetail } from "@/lib/server/updown-board";
import { pickLocalized } from "@/lib/localized";
import { Reveal } from "@/components/layout/reveal";
import { pricedYesPct } from "@/lib/markets/discovery";
import { heroFigures, type HeroRow } from "@/lib/markets/hero";
import { landingComposition, LANDING_GRID_SIZE } from "@/lib/markets/landing";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { getServerT } from "@/lib/i18n-server";
import { getGlobalConfig } from "@/lib/server/market-config";
import { ratesFrom } from "@/app/legal/rules/_shared";

export const dynamic = "force-dynamic";

/**
 * The landing page had NO canonical URL and NO og:url, so every variant a link picked up on the
 * way here — a utm tag, a cache-buster, a trailing slash — was a separate page to a crawler and
 * an unnamed page to a link preview.
 *
 * ⛔ DECLARED HERE, ON THE ROUTE, AND NOT IN THE ROOT LAYOUT. A canonical in the layout is
 * inherited by every page under it, so the whole site would claim to be "/" — which is worse than
 * having none at all. Metadata that names a URL belongs to exactly one route.
 * `metadataBase` in the layout resolves these to the absolute site URL, which is why they are
 * written relative and there is no second copy of the base URL here to drift.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  // ⛔ SPREAD, NEVER REPLACE. `openGraph: { url: "/" }` on its own wiped og:image, og:locale,
  // og:site_name and og:type from this page — Next merges metadata per FIELD, so a partial
  // openGraph object replaces the layout’s entire one. Measured 0 of each on "/" against 6 on
  // /markets, on the same deploy.
  // ⚠️ `url` is KEPT rather than dropped: nothing here isolates whether Next synthesises og:url
  // from `alternates.canonical`, and dropping it would risk re-deleting the tag this replaces.
  openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },
};

/**
 * THE LANDING PAGE — round-2 kit README §1 / SPEC §1 + §3, applied in batch 3.
 *
 * ── THE COMPOSITION, AND WHY IT IS IN THIS ORDER ──────────────────────────────────────────────
 * hero → how it works → pick a side (grid) → browse by topic → Up & Down → why it can be trusted
 * (+ the settled strip and the RG line inside that last act) → footer.
 *
 * The purpose is a funnel: show what Tanzania is actually predicting today, THEN teach the
 * mechanic, THEN prove the results are trustworthy. Up & Down moves BELOW the grid — it was
 * directly under the hero, which put a second product line in front of a visitor who had not yet
 * seen a single market of the first one.
 *
 * Section gaps come from PAIRS OF PADDING, never a margin — see the `.kp-band` block in
 * `globals.css` and the `--rh-*` comment in §Spacing, which now carry the measured per-band and
 * per-seam tables for BOTH rungs of the rhythm (the phone rungs step down below 768, 2026-08-21).
 * ⚠️ This line used to assert a flat "144 · 96 · 96 · 144". That was the KIT's rhythm, not this
 * page's: `.kp-hero__inner` pads `--sp-12` / `--sp-16` and never consumes `--rh-section`, so the
 * first gap has never been 144 at any width. The numbers are deliberately NOT restated here —
 * they are measured, they differ per width band, and a number written twice disagrees with
 * itself. Batch 3 is the first consumer those four tokens have ever had.
 *
 * ── WHAT WAS DELETED ──────────────────────────────────────────────────────────────────────────
 * `StatsBand` (the two zero-counters, gated `settledCount > 0`) is GONE, component and call. Its
 * job is done twice over by things that are above the fold or that prove more: the hero's proof
 * rail carries the live figures, and the settled strip proves the platform finishes what it starts.
 * A number whose purpose is to show the platform is alive is worthless 4,900px down the page.
 *
 * ── 🔴 THE REPETITION THIS FIXES ──────────────────────────────────────────────────────────────
 * Batch 2's re-validation pass recorded that the hero no longer repeated itself but the PAGE still
 * did: the hero's four questions were also the first four cards of this grid, because both were
 * closing-soonest over the same book — the same markets twice within two screens. The grid now has
 * a DIFFERENT LENS and is disjoint from the hero by construction (`landingGrid`), so a visitor
 * scrolling two screens reads ten different markets instead of five markets twice. The eyebrow
 * NAMES the lens, so the grid is a claim rather than a sample (kit §1c).
 */
export default async function LandingPage() {
  const [{ t, locale }, liveRaw, updownLiveRaw, session, stats, rules] = await Promise.all([
    getServerT(),
    listMarkets({ status: "LIVE" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
    // The fast game is its own product line, so it never appears in the poll list above.
    // Count its LIVE rounds for the home discovery band (real data — no fabricated count).
    listMarkets({ status: "LIVE", productLine: "UPDOWN" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
    getSession(),
    getPlatformStats(),
    // The rates every rule on this page quotes — the fee in "how it works" — from the SAME function
    // the binding /legal/rules page reads them through (landing v3, WP11). Never a literal.
    getGlobalConfig().then(ratesFrom),
  ]);
  const nowMs = Date.now();
  const liveAll = liveRaw.filter((m) => !isClosedByTime(m));
  // 🔴 ONE PAGE WAS CARRYING TWO DEFINITIONS OF "LIVE". This counted `!isClosedByTime`, which is
  // the RESOLUTION clock, while every other figure on this page — the open-markets count, the pool,
  // the conviction bar, the grid — comes from `matchesStatus(..., "open")`, which is the BETTING
  // clock (`!selectionClosed`). So the same word meant two different things a few hundred pixels
  // apart, on a surface whose whole job is to state the size of the book.
  // ⭐ The betting clock is the right one HERE and not merely the consistent one: the band it feeds
  // is a CTA that says "play", and a round whose betting has shut is not one a reader can act on.
  // ⚠️ THIS DOES NOT CLOSE THE WHOLE GAP, AND SAYING SO IS THE POINT. Measured on production
  // 2026-09-24 at 08:00, over three uncached reads: the landing said 6 while /updown showed 9 rounds
  // across its 12 asset x duration chains still taking bets. The resolution clock is the LOOSER of
  // the two, so it should have over-counted and instead returned fewer — which means rows are also
  // being dropped for a reason not visible from any public surface, and that needs a database read
  // this change cannot make. What is fixed here is the contradiction the page could see about
  // itself; the residual is recorded, not papered over.
  const updownOpen = updownLiveRaw.filter((m) => !isSelectionClosed(m));
  const updownLiveCount = updownOpen.length;

  // ── ONE decorated board read, four consumers ────────────────────────────────────────────────
  // The hero's figures, the grid, the topic tiles and the cards all fold over THIS array. Every
  // predicate and ordering comes from `discovery.ts`, so the landing cannot drift from `/markets`
  // about what "open" means — two surfaces disagreeing about someone's money is what B6 exists for.
  const heroRows: HeroRow[] = liveAll.map((m) => ({
    id: m.id,
    category: m.category,
    pool: m.yesPool + m.noPool,
    predictors: m.predictorCount,
    yesPct: pricedYesPct(m.yesPool, m.noPool),
    // The hero sorts by `closing` only, which never reads move24h — and we have no 24h baseline
    // at this point in the render. A-5: absent, not invented.
    move24h: undefined,
    createdAtMs: Date.parse(m.createdAt),
    bettableUntilMs: Date.parse(m.selectionClosedAt ?? m.resolutionAt),
    resolvesAtMs: Date.parse(m.resolutionAt),
    selectionClosed: isSelectionClosed(m),
    // The landing hero shows `open` only, which cannot contain a decided market — but the field
    // is required rather than optional precisely so this is a stated fact and not an omission.
    verdictRecorded: m.resolvedOutcome != null,
    status: m.status as HeroRow["status"],
    // No watchlist on the landing page; `matchesStatus(…, "open")` does not read this field.
    watched: false,
    titleEn: m.titleEn,
    titleSw: m.titleSw,
    titleZh: m.titleZh,
    yesPool: m.yesPool,
    noPool: m.noPool,
    sourceUrl: m.sourceUrl,
  }));
  const figures = heroFigures(heroRows, nowMs);

  // The hero draws the featured card plus its question board; the grid must show none of them.
  const heroIds = [
    ...(figures.featured ? [figures.featured.id] : []),
    ...figures.board.map((r) => r.id),
  ];
  const comp = landingComposition(heroRows, nowMs, {
    openPoolTzs: figures.poolTzs,
    heroIds,
    categories: MARKET_CATEGORIES,
  });

  // ⚠️ Deliberately sequential, and it is cheaper this way. The crest-stack lookup used
  // to run inside the Promise.all above, which meant it could not know which markets
  // the landing page would draw — so it read the ENTIRE Position table, every render.
  // Waiting one round-trip to learn the ids buys an indexed lookup instead of an
  // unbounded scan that grows forever (positions are never pruned).
  // ⛔ The hero's featured market is chosen by "closing soonest" across the whole open book, so
  // it is not necessarily one of the grid's — it joins the id list explicitly rather than being
  // fetched separately, which would be a second unbounded read.
  const drawnIds = [...new Set([...comp.grid.map((r) => r.id), ...heroIds])];
  // ── The Up & Down band's live round (landing v3, WP12) ────────────────────────────────────────
  // The soonest round still taking bets that a reader can still ACT on: rounds with under a minute of
  // betting left are skipped — the band is five sections down, and a round picked for having the least
  // time left had usually shut by the time anyone scrolled to it (v3 review). Up to three candidates are
  // tried in order, so one failed or already-locked read does not blank the band while others are open.
  // Each read goes through the same `getRoundDetail` the round page renders from, so the band and
  // /updown/[id] cannot describe one round two ways. A failed read is not a zero: with no readable round
  // the band keeps its copy and its link to /updown, and prints no round it could not read.
  // ⭐ Started beside the cards' reads rather than after them — it depends on nothing they return.
  const UD_MIN_LEFT_MS = 60_000;
  const udCandidates = [...updownOpen]
    .filter((m) => Date.parse(m.selectionClosedAt ?? m.resolutionAt) - nowMs >= UD_MIN_LEFT_MS)
    .sort((x, y) => Date.parse(x.selectionClosedAt ?? x.resolutionAt) - Date.parse(y.selectionClosedAt ?? y.resolutionAt))
    .slice(0, 3);
  const readUdRound = async () => {
    for (const m of udCandidates) {
      const d = await roundStore.getByMarketId(m.id)
        .then((r) => (r ? getRoundDetail(r.id) : null))
        .catch(() => null);
      if (d && d.round.state === "open") return d;
    }
    return null;
  };
  const [traderMap, cardCharts, udDetail] = await Promise.all([
    traderSeedsByMarket(drawnIds).catch(() => new Map() as Awaited<ReturnType<typeof traderSeedsByMarket>>),
    // One query for the whole board — never map getCardChart across a list.
    getCardCharts(drawnIds).catch(() => new Map()),
    readUdRound(),
  ]);
  const udRound: UpdownBandRound | null = udDetail
    ? {
        roundId: udDetail.round.roundId,
        assetName: pickLocalized(locale, udDetail.asset.nameEn, udDetail.asset.nameSw, udDetail.asset.nameZh),
        durationMinutes: udDetail.round.durationMinutes,
        decimals: udDetail.asset.decimals,
        openPrice: udDetail.round.openPrice,
        // The round's own rule: UP if the price reaches upTarget, DOWN if it reaches downTarget, and a
        // finish between them is VOID with every stake refunded — the band draws both lines (v3 review).
        upTarget: udDetail.round.upTarget,
        downTarget: udDetail.round.downTarget,
        series: udDetail.priceSeries?.map((p) => ({ ms: Date.parse(p.t), price: p.price })) ?? null,
        opensAtMs: Date.parse(udDetail.round.opensAt),
        betsCloseAtMs: Date.parse(udDetail.round.selectionClosedAt ?? udDetail.round.closesAt),
        serverNowMs: udDetail.round.serverNowMs,
      }
    : null;
  const isAuthed = !!session;

  // ONE definition, shared with the hero and /markets — this was a fifth copy of the same nine
  // lines, and the copies had drifted (three could render "0m left" on a market still taking
  // bets). See src/lib/markets/time-left.ts.
  const timeLeftStr = (ms: number): string =>
    timeLeftLabel(ms, nowMs, {
      closed: t.market.closed,
      days: t.market.timeLeftD,
      hours: t.market.timeLeftH,
      minutes: t.market.timeLeftM,
    }, fill);

  return (
    <div>
      {/* ── §1a HERO — the question board (kit §1a) ───────────────────────────────────────────
          Built from the brand mark, the type and REAL market data; `public/hero/hero-bg.webp` and
          the 75vh photograph it filled went out in the same commit this landed. */}
      <LandingHero
        figures={figures}
        t={t}
        locale={locale}
        isAuthed={isAuthed}
        nowMs={nowMs}
        cards={{ charts: cardCharts, traders: traderMap }}
      />

      {/* ── §1a′ THE PROOF — the three figures, the whole board's conviction, the closing-soonest
          board. Directly under the hero since v3, so the hero's first screen is the pitch and a
          live market (WP2 / V15). */}
      <LandingProof figures={figures} t={t} locale={locale} paidOutTzs={stats.paidOutTzs} />

      {/* ── §1b HOW IT WORKS — chapter break: tinted band, 144 from the hero ───────────────── */}
      <HowItWorks t={t} feePct={rules.commissionPct} />

      {/* ── §1c PICK A SIDE NOW + §1d BROWSE BY TOPIC — one section, one surface, 48 between ── */}
      {/* 2026-09-13 — threshold 0: on a phone this band is so tall that 12% of it never fits the
          viewport, so it never revealed and the landing showed a blank band. Same rise, and it
          fires once the band's top is 10% above the viewport bottom. */}
      {comp.grid.length > 0 && (
        <Reveal band="board" className="kp-band kp-band--tight" threshold={0} rootMargin="0px 0px -10% 0px">
          <div className="kp-band__inner">
            <div className="kp-shead">
              <div>
                <p className="kp-hero__eyebrow text-balance">
                  <span className="kp-hero__tick" aria-hidden />
                  {/* The eyebrow NAMES THE ORDERING. `pool` when there is money on the book,
                      `new` when there is not — because "biggest pools" over a book of empty pools
                      is a claim about a number nobody produced, and it would also order the grid
                      identically to the hero. See `gridLensFor`. */}
                  {comp.lens === "pool" ? t.home.gridEyebrowPool : t.home.gridEyebrowNew}
                </p>
                {/* `text-balance` for the same reason how-it-works.tsx carries it: without it this heading
                    breaks with its last word alone on line two ("Chagua upande / sasa" at 360 sw,
                    measured on production 2026-09-24). A one-word last line under a 32px display
                    face is the most visible raggedness on the page. */}
                <h2 className="kp-shead__h text-balance">{t.home.pickASideNow}</h2>
              </div>
              <Link href={`/markets?sort=${comp.lens}` as never} className="kp-shead__link">
                {fill(t.home.gridSeeAll, { n: figures.openCount })}
                <I.chevronRight s={14} />
              </Link>
            </div>

            {/* Same orphan-row fix as the topic tiles, for the same measured reason: at 768 the
                grid is two columns with three cards, and the lone card in the final row came out
                320px against its neighbours’ 354px. Scoped to the landing page by being written
                here rather than on `.market-grid`, which /markets also uses.
                🔴 IT SHIPPED UNCONDITIONALLY AND COST 44px ON EVERY PHONE. Equal row heights are
                worth having when cards sit BESIDE each other; in one column they sit BELOW each
                other and there are no row-mates to match, so `1fr` only stretches the short cards
                into dead space. Measured on production 2026-09-24 by removing the rule and
                re-reading the same three cards:
                    320 / 360 / 412 / 560   with 1fr [302,302,302]   without [280,302,280]   +22,0,+22
                    768                     with 1fr [354,354,354]   without [354,354,320]   the fix earning its keep
                    1024 / 1280             identical either way
                ⭐ THE CONDITION IS WRITTEN IN THE SAME TERMS AS THE RULE THAT CREATES IT. The grid is
                `repeat(auto-fill, minmax(min(300px,100%), 1fr))` with a 14px gap, so a second column
                appears at exactly 300+14+300 = 614px OF GRID WIDTH — measured: 608px wide is one
                column, 618px is two. A viewport media query would encode 646px instead, which is
                that same 614 plus today’s 32px of page padding, and would silently drift the day
                the padding changes. A container query asks the question the grid actually answers.
                ⚠️ Where @container is unsupported the query never matches, so the rule simply does
                not apply and the board renders as it did before this fix — the orphan row returns,
                nothing breaks. */}
            <style>{`.kp-lgw{container-type:inline-size}@container (min-width:614px){.kp-lgw .market-grid{grid-auto-rows:1fr}}`}</style>
            <div className="kp-lgw">
            <div className="market-grid">
              {comp.grid.slice(0, LANDING_GRID_SIZE).map((r) => {
                const cc = cardCharts.get(r.id) ?? { spark: [] };
                return (
                  <MarketCard
                    productLine={"MARKET"}
                    key={r.id}
                    id={r.id}
                    titleEn={r.titleEn}
                    titleSw={r.titleSw}
                    titleZh={r.titleZh}
                    category={r.category}
                    /* The card owns its own cold-start gate (`noPrice = volume === 0`), so the
                       fallback here is unreachable — and it is 0 rather than 50 deliberately: a
                       50 would look like a price and ship, a 0 is visibly absurd and gets caught.
                       🔴 THE COMMENT WAS TRUE AND THE CODE WAS NOT (fixed 2026-09-03, PV-06
                       sweep). This read `?? impliedYesPct({…})`, which returns exactly the
                       hardcoded **50** the sentence above says it deliberately avoids — so the
                       one safeguard here was a stale note describing code that had drifted out
                       from under it. `?? 0` is now what it claims to be, and this file no longer
                       reaches for the fabricating function at all. */
                    yesPct={r.yesPct ?? 0}
                    volume={r.pool}
                    predictors={r.predictors}
                    timeLeft={r.selectionClosed ? t.home.waitingForResults : timeLeftStr(r.bettableUntilMs)}
                    status="LIVE"
                    selectionClosed={r.selectionClosed}
                    sourceUrl={r.sourceUrl}
                    spark={cc.spark}
                    move24h={cc.move24h}
                    traders={traderMap.get(r.id)}
                  />
                );
              })}
            </div>
            </div>

            {/* 48px below the grid, same surface — it belongs to this section (kit §1d). */}
            <div style={{ marginTop: "var(--rh-close)" }}>
              <TopicTiles topics={comp.topics} t={t} />
            </div>
          </div>
        </Reveal>
      )}

      {/* ── §1e UP & DOWN — the soonest live round, full width (landing v3, WP12; R4(6)) ──────── */}
      <UpdownBand t={t} liveCount={updownLiveCount} round={udRound} />

      {/* ── §1f WHY THE RESULT CAN BE TRUSTED + §1g SETTLED + §1h RG ──────────────────────────
          Chapter break: tinted band, 144 from Up & Down, and it runs continuously into the
          footer's own claret rule (hence `--seam`). The settled strip and the RG line are parts
          of this act, not two more sections. */}
      <TrustBand t={t} locale={locale} settlements={stats.recentSettlements.slice(0, 5)} nowMs={nowMs} />
      {/* ⛔ NO RG LINE HERE ANY MORE (landing v3, R4(5)). The 18+ roundel and the RG motto sit in the
          hero's trust lines — on the first screen — and in the footer, which follows directly. */}
    </div>
  );
}
