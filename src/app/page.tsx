import Link from "next/link";
import { fill } from "@/lib/utils";
import { I } from "@/components/ui/glyphs";
import { MarketCard } from "@/components/markets/market-card";

import {
  listMarkets, impliedYesPct, isClosedByTime, isSelectionClosed, traderSeedsByMarket,
  MARKET_CATEGORIES,
} from "@/lib/server/market-service";

import { getCardCharts } from "@/lib/server/market-history";
import { getSession } from "@/lib/server/session";
import { getPlatformStats } from "@/lib/server/platform-stats";
import { LandingHero } from "@/components/home/landing-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { TopicTiles } from "@/components/home/topic-tiles";
import { TrustBand } from "@/components/home/trust-band";
import { RgLine } from "@/components/home/rg-line";
import { Reveal } from "@/components/layout/reveal";
import { pricedYesPct } from "@/lib/markets/discovery";
import { heroFigures, type HeroRow } from "@/lib/markets/hero";
import { landingComposition, LANDING_GRID_SIZE } from "@/lib/markets/landing";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

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
 * Section gaps are 144 · 96 · 96 · 144 and they come from PAIRS OF PADDING, never a margin — see
 * the `.kp-band` block in `globals.css` and the `--rh-*` comment in §Spacing. Batch 3 is the first
 * consumer those four tokens have ever had.
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
  const [{ t, locale }, liveRaw, updownLiveRaw, session, stats] = await Promise.all([
    getServerT(),
    listMarkets({ status: "LIVE" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
    // The fast game is its own product line, so it never appears in the poll list above.
    // Count its LIVE rounds for the home discovery band (real data — no fabricated count).
    listMarkets({ status: "LIVE", productLine: "UPDOWN" }).catch(() => [] as Awaited<ReturnType<typeof listMarkets>>),
    getSession(),
    getPlatformStats(),
  ]);
  const nowMs = Date.now();
  const liveAll = liveRaw.filter((m) => !isClosedByTime(m));
  const updownLiveCount = updownLiveRaw.filter((m) => !isClosedByTime(m)).length;

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
    selectionClosed: isSelectionClosed(m),
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
  const traderMap = await traderSeedsByMarket(drawnIds)
    .catch(() => new Map() as Awaited<ReturnType<typeof traderSeedsByMarket>>);
  // One query for the whole board — never map getCardChart across a list.
  const cardCharts = await getCardCharts(drawnIds).catch(() => new Map());
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

      {/* ── §1b HOW IT WORKS — chapter break: tinted band, 144 from the hero ───────────────── */}
      <HowItWorks t={t} />

      {/* ── §1c PICK A SIDE NOW + §1d BROWSE BY TOPIC — one section, one surface, 48 between ── */}
      {comp.grid.length > 0 && (
        <Reveal band="board" className="kp-band kp-band--tight">
          <div className="kp-band__inner">
            <div className="kp-shead">
              <div>
                <p className="kp-hero__eyebrow">
                  <span className="kp-hero__tick" aria-hidden />
                  {/* The eyebrow NAMES THE ORDERING. `pool` when there is money on the book,
                      `new` when there is not — because "biggest pools" over a book of empty pools
                      is a claim about a number nobody produced, and it would also order the grid
                      identically to the hero. See `gridLensFor`. */}
                  {comp.lens === "pool" ? t.home.gridEyebrowPool : t.home.gridEyebrowNew}
                </p>
                <h2 className="kp-shead__h">{t.home.pickASideNow}</h2>
              </div>
              <Link href={`/markets?sort=${comp.lens}` as never} className="kp-shead__link">
                {fill(t.home.gridSeeAll, { n: figures.openCount })}
                <I.chevronRight s={14} />
              </Link>
            </div>

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
                       50 would look like a price and ship, a 0 is visibly absurd and gets caught. */
                    yesPct={r.yesPct ?? impliedYesPct({ yesPool: r.yesPool, noPool: r.noPool })}
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

            {/* 48px below the grid, same surface — it belongs to this section (kit §1d). */}
            <div style={{ marginTop: "var(--rh-close)" }}>
              <TopicTiles topics={comp.topics} t={t} openCount={figures.openCount} />
            </div>
          </div>
        </Reveal>
      )}

      {/* ── §1e UP & DOWN — 920 centred inside the 1280 column ────────────────────────────────
          The fast game is a separate product line and never appears in the poll lists, so the
          landing promotes it explicitly (it was otherwise invisible to a new visitor). Its
          max-width is the whole fix for the ~500px hole a full-width two-item flex row left
          at 1440. */}
      <Reveal band="updown" className="kp-band kp-band--tight kp-band--closes">
        <div className="kp-band__inner">
          <Link href={"/updown" as never} className="kp-updown group">
            <div className="kp-updown__row">
              <div className="min-w-0">
                <p className="kp-hero__eyebrow" style={{ marginBottom: "var(--sp-1)" }}>
                  <span className="live-dot" /> {t.home.updownEyebrow}
                </p>
                <h2 className="kp-shead__h" style={{ marginTop: 0 }}>{t.market.udTitle}</h2>
                <p className="kp-trust__b" style={{ maxWidth: "52ch" }}>{t.market.udTagline}</p>
                <p className="kp-topic__m" style={{ paddingLeft: 0, marginTop: "var(--sp-2)" }}>
                  {updownLiveCount > 0
                    ? <span className="kp-topic__live">{updownLiveCount} {t.home.updownRoundsLive}</span>
                    : t.home.updownStartsSoon}
                </p>
              </div>
              <span className="btn btn-primary btn-lg shrink-0">
                <I.trendingUp s={16} /> {t.home.updownCta}
                <I.chevronRight s={14} />
              </span>
            </div>
          </Link>
        </div>
      </Reveal>

      {/* ── §1f WHY THE RESULT CAN BE TRUSTED + §1g SETTLED + §1h RG ──────────────────────────
          Chapter break: tinted band, 144 from Up & Down, and it runs continuously into the
          footer's own claret rule (hence `--seam`). The settled strip and the RG line are parts
          of this act, not two more sections. */}
      <TrustBand t={t} locale={locale} settlements={stats.recentSettlements.slice(0, 5)} />

      {/* The RG line sits inside the trust surface, above the footer. Rendered in its own
          container so the band above can close its own padding.
          ⭐ NO `paddingBottom` HERE — batch 4. `<PublicFooter>` (rendered by `app-shell.tsx`,
          outside this page) opens with `mt-12`, and on THIS project's spacing scale that is
          **128px**, not the 48px the Tailwind default would suggest (`tailwind.config.ts:176`).
          A `--rh-close` here stacked on top of it, giving 176px of measured blank below a
          one-line strip. The gap into the footer is the footer's own margin, on every page. */}
      <div className="kp-band kp-band--overlay kp-band--seam" style={{ paddingBlock: 0, borderTop: 0 }}>
        <div className="kp-band__inner">
          <RgLine />
        </div>
      </div>
    </div>
  );
}
