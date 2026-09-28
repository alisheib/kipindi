import type { Metadata } from "next";
import { ROOT_OPEN_GRAPH } from "./layout";

import {
  listMarkets, isClosedByTime, isSelectionClosed, traderSeedsByMarket,
  MARKET_CATEGORIES, resolvePublishCategory,
} from "@/lib/server/market-service";
import { listSources, sourceNameFor, type TrustedSource } from "@/lib/server/source-registry";

import { getCardCharts } from "@/lib/server/market-history";
import { getSession } from "@/lib/server/session";
import { getPlatformStats } from "@/lib/server/platform-stats";
import { LandingHero, LandingProof, QuestionBoard } from "@/components/home/landing-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { TopicTiles } from "@/components/home/topic-tiles";
import { TrustBand } from "@/components/home/trust-band";
import { UpdownBand } from "@/components/home/updown-band";
import { roundStore } from "@/lib/server/updown-dal";
import { getRoundDetail } from "@/lib/server/updown-board";
import { pickBandCandidates, walkBandCandidates, toUpdownBandRound } from "@/lib/server/updown-band-round";
import { Reveal } from "@/components/layout/reveal";
import { shownYesPct } from "@/lib/markets/price-state";
import { BOARD_LENSES, heroFigures, type BoardLens, type HeroRow } from "@/lib/markets/hero";
import { landingComposition } from "@/lib/markets/landing";
import { getServerT } from "@/lib/i18n-server";
import { getGlobalConfig } from "@/lib/server/market-config";
import { ratesFrom } from "@/app/legal/rules/_shared";
import { landingPicks } from "@/lib/server/landing-picks";
import { db } from "@/lib/server/store";
import { getKillSwitches } from "@/lib/server/payment-ops";
import { heroRailNames, heroRails } from "@/lib/server/payout-rails";
import type { LandingMine } from "@/components/home/landing-hero";

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
 * hero → the proof rail + conviction → THE BOARD → how it works → browse by topic → Up & Down →
 * why it can be trusted (+ the settled strip inside that last act) → footer. The RG line that closed
 * the act is gone since landing v3 (R4(5)); since 2026-09-27 (R7(2)) the hero keeps the 18+ roundel,
 * the licence line and the helpline in its trust rows, and the RG motto itself lives in the footer,
 * on every page.
 *
 * The purpose is a funnel: show what Tanzania is actually predicting today, THEN teach the
 * mechanic, THEN prove the results are trustworthy. Up & Down moves BELOW the board — it was
 * directly under the hero, which put a second product line in front of a visitor who had not yet
 * seen a single market of the first one.
 *
 * ── 🔴 WP9 · ONE BOARD (ruling R15, 2026-09-28) ────────────────────────────────────────────────
 * This page used to state the same open book in THREE shapes: the hero's featured card, a four-row
 * board, and a `.market-grid` of three cards under "Pick a side now". The grid band is GONE — the
 * class stays, because `/markets`, `/results`, `/watchlist` and `/live` all use it; only the
 * landing's use goes — and the board grew 4 → 7, so the page still draws exactly EIGHT markets
 * (1 featured + 7 rows), the budget `landing.ts` chose deliberately. The board took the band's
 * section header and gained an ordering rail; it is `QuestionBoard` in `landing-hero.tsx`.
 * ⭐ THE TOPIC TILES STAY (R15) and now hold the band the grid used to share with them. They list
 * TOPICS, a different axis, and repeat no market, so the delivery's own reason for deleting them
 * with the grid ("three lists of one thing") does not reach them.
 * 🔴 AND THEIR RENDER CONDITION WAS A FACT ABOUT THE GRID. Both surfaces sat inside one
 * `comp.grid.length > 0 &&`, so with 1–5 open markets the grid was empty and the tiles disappeared
 * with it although `comp.topics` was full (MOBILE-VISUAL-FINDINGS-2026-09 §444). The tiles now gate
 * on their own population, which also keeps the landing gate's V14 landmark `.kp-topic` alive.
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
 * ── 🔴 THE REPETITION THIS PAGE WAS BUILT AROUND, AND WHY IT IS NOW STRUCTURAL ────────────────
 * Batch 2's re-validation pass recorded that the hero no longer repeated itself but the PAGE still
 * did: the hero's four questions were also the first four cards of the grid, because both were
 * closing-soonest over the same book. Batch 3 answered it by giving the grid a different lens and
 * subtracting the hero's ids from it. WP9 answers it by ARITHMETIC — there is one list, so there is
 * nothing to repeat — and the law survives inside it: `HeroFigures.board` excludes the featured
 * card by id, at every lens (`hero.ts`).
 */
export default async function LandingPage({ searchParams }: {
  /**
   * `?sort=` — which of the two orderings the board is in (WP9). ⛔ NARROWED, NEVER TRUSTED: an
   * unknown value falls back to the default rather than ordering the list by nothing, and
   * `heroFigures` narrows a second time against what THIS book can honestly offer (a money lens on a
   * cold book is a superlative about zeros). `/profile/account` shipped the other way once — `?act=lol`
   * emptied the table and drew no control that could clear it.
   * ⚠️ `alternates.canonical` above stays "/" , so a sorted board is not a second page to a crawler.
   */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ t, locale }, liveRaw, updownLiveRaw, session, stats, rules, railPauses, sources, sp] = await Promise.all([
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
    // The hero's wallet row names only rails that pay out and that no officer has paused (R8(6),
    // `server/payout-rails.ts`). The kill-switch map is read once per process and then held in
    // memory; a failed read is null, and null names the static list — the money path's own
    // fail-open direction, so the hero and the withdraw form cannot disagree about a rail.
    getKillSwitches().catch(() => null),
    // The source registry, read ONCE for every market on the page (landing v3 WP3/WP4, gate V18): each card
    // and board row NAMES the source it settles on. All sources, not `enabledOnly` — naming a source is not
    // trusting it. A failed read falls back to the host, which is still a true name.
    listSources().catch(() => [] as TrustedSource[]),
    // ⭐ Awaited BESIDE the reads, not before them: it depends on nothing they return, and awaiting it
    // first would make every database read wait on a value that was already in hand.
    searchParams,
  ]);
  const nowMs = Date.now();
  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const requestedLens: BoardLens =
    (BOARD_LENSES as readonly string[]).includes(rawSort ?? "") ? (rawSort as BoardLens) : "closing";
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
    // The printable price, or null — the same rule as the card and `/markets` (`price-state.ts`, WP6).
    yesPct: shownYesPct(m.yesPool, m.noPool),
    // The hero's lens (price tier, then `close` / `closing`) never reads move24h — and we have no
    // 24h baseline at this point in the render. A-5: absent, not invented.
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
    // The registry's label for the source's host, else the host (`sourceNameFor` — the one host rule).
    sourceName: sourceNameFor(sources, m.sourceUrl, resolvePublishCategory(m.category)) ?? undefined,
  }));
  const figures = heroFigures(heroRows, nowMs, requestedLens);

  // The eight markets this page draws: the featured card plus the board's rows.
  const heroIds = [
    ...(figures.featured ? [figures.featured.id] : []),
    ...figures.board.map((r) => r.id),
  ];
  const comp = landingComposition(heroRows, nowMs, { categories: MARKET_CATEGORIES });

  // ⚠️ Deliberately sequential, and it is cheaper this way. The crest-stack lookup used
  // to run inside the Promise.all above, which meant it could not know which markets
  // the landing page would draw — so it read the ENTIRE Position table, every render.
  // Waiting one round-trip to learn the ids buys an indexed lookup instead of an
  // unbounded scan that grows forever (positions are never pruned).
  // ⚠️ Since WP9 this IS `heroIds` — one list, so one id set. Only the featured card draws a chart
  // and a crest stack today; the board's rows carry neither. The whole set is still passed rather
  // than the featured id alone, because the reads are indexed by id either way and a row that later
  // gains a sparkline must not need a second query to get one.
  const drawnIds = [...new Set(heroIds)];
  // ── The Up & Down band's live round (landing v3, WP12 · R5, the Match) ─────────────────────────
  // A round a reader can still ACT on (≥ 2 minutes of betting left — the band is five sections down)
  // that has something to SHOW (a confirmed read after its open); the shortest duration wins, the kick-off
  // state is the fallback. The rule and the walk live in `updown-band-round.ts` (`test:updown-match` §9).
  // Each read goes through the same `getRoundDetail` the round page renders from, so the band and
  // /updown/[id] cannot describe one round two ways — usually one read, never more than three. A failed
  // read is not a zero: with no readable round the band keeps its copy and its link to /updown.
  // ⭐ Started beside the cards' reads rather than after them — it depends on nothing they return.
  const readUdRound = () => walkBandCandidates(pickBandCandidates(updownOpen, nowMs), nowMs, (m) =>
    roundStore.getByMarketId(m.id).then((r) => (r ? getRoundDetail(r.id) : null)));
  const [traderMap, cardCharts, udDetail] = await Promise.all([
    traderSeedsByMarket(drawnIds).catch(() => new Map() as Awaited<ReturnType<typeof traderSeedsByMarket>>),
    // One query for the whole board — never map getCardChart across a list.
    getCardCharts(drawnIds).catch(() => new Map()),
    readUdRound().catch(() => null),
  ]);
  const udRound = udDetail ? toUpdownBandRound(udDetail, locale) : null;
  const isAuthed = !!session;
  // ⭐ WP14 part 2 · the signed-in hero's own reads, in parallel. Each fails to NULL on its own, and a
  // null part renders nothing (B-1: a failed read is not a zero). The wallet row is the same one the
  // header reads (app-shell), so the hero's balance and the chip cannot disagree.
  const mine: LandingMine | null = session
    ? await Promise.all([
        landingPicks(session.userId, nowMs).catch(() => null),
        Promise.resolve().then(() => db.wallet.findByUserId(session.userId)).catch(() => undefined),
      ]).then(([picks, wallet]) => ({
        picks,
        balance: wallet === undefined ? null : (wallet?.balance ?? 0),
        held: !!wallet && wallet.status !== "ACTIVE",
      }))
    : null;

  // ⚠️ `timeLeftStr` LEFT THIS FILE WITH THE GRID (WP9). It was the shared wrapper around
  // `timeLeftLabel` for the grid cards; the featured card and the board rows each build their own
  // from the same one definition in `src/lib/markets/time-left.ts`, so nothing was duplicated by
  // its removal and this page now reads no dictionary key of its own.

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
        mine={mine}
        rails={heroRailNames(railPauses)}
      />

      {/* ── §1a′ THE PROOF — the three figures, the whole board's conviction, the closing-soonest
          board. Directly under the hero since v3, so the hero's first screen is the pitch and a
          live market (WP2 / V15). */}
      <LandingProof figures={figures} t={t} paidOutTzs={stats.paidOutTzs} />

      {/* ── §1a″ THE BOARD — the landing's ONE market list (WP9 · R15). Its section header and its
          ordering rail are `QuestionBoard`'s; the rail's two lenses are computed on the server from
          the same board read these figures came from. */}
      <QuestionBoard figures={figures} t={t} locale={locale} nowMs={nowMs} />

      {/* ── §1b HOW IT WORKS — chapter break: tinted band, 144 from the hero ───────────────── */}
      <HowItWorks t={t} feePct={rules.commissionPct} />

      {/* ── §1d BROWSE BY TOPIC ────────────────────────────────────────────────────────────────
          ⭐ THE TILES NOW HOLD THIS BAND ALONE (WP9 · R15). They shared it with the `.market-grid`
          of "Pick a side now", which is deleted: the grid and the board were the same open book in
          two shapes, while the tiles list TOPICS and repeat no market, so the delivery's reason for
          removing both reaches only one of them. The tiles keep their own `.kp-shead` and their own
          "All topics" link, so nothing of the band's header is lost with the grid's.
          🔴 THE CONDITION IS THE TILES' OWN NOW, AND IT WAS THE GRID'S BEFORE. One
          `comp.grid.length > 0` gated both, so a book of 1–5 open markets emptied the grid and took
          the populated tiles down with it — and with them the landing gate's V14 landmark
          `.kp-topic`, which asserts the page rendered its topics at all.
          2026-09-13 — threshold 0: on a phone this band was so tall that 12% of it never fits the
          viewport, so it never revealed and the landing showed a blank band. Same rise, and it fires
          once the band's top is 10% above the viewport bottom. ⚠️ The band is much shorter now that
          it holds six tiles instead of three cards AND six tiles; the threshold stays 0 rather than
          returning to the kit's 0.12, because 0 is correct at every height and 0.12 is only correct
          below ~7.7 viewports. */}
      {comp.topics.length > 0 && (
        <Reveal band="topics" className="kp-band kp-band--tight" threshold={0} rootMargin="0px 0px -10% 0px">
          <div className="kp-band__inner">
            <TopicTiles topics={comp.topics} t={t} />
          </div>
        </Reveal>
      )}

      {/* ── §1e UP & DOWN — one live round as a match, full width (landing v3, WP12; R4(6), R5) ── */}
      <UpdownBand t={t} locale={locale} liveCount={updownLiveCount} round={udRound} />

      {/* ── §1f WHY THE RESULT CAN BE TRUSTED + §1g SETTLED ────────────────────────────────────
          Chapter break: tinted band, 144 from Up & Down, and it runs continuously into the
          footer's own claret rule (hence `--seam`). The settled strip is part of this act, not
          another section. */}
      <TrustBand t={t} locale={locale} settlements={stats.recentSettlements.slice(0, 5)} nowMs={nowMs} rails={heroRails(railPauses)} />
      {/* ⛔ NO RG LINE HERE ANY MORE (landing v3, R4(5)). The 18+ roundel and the RG motto sit in the
          hero's trust lines — on the first screen — and in the footer, which follows directly. */}
    </div>
  );
}
