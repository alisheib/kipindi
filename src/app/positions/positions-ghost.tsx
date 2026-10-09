"use client";

import { Fragment } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { FilterGroupKey } from "@/components/ui/filter-pill";
import { GhostText, AMOUNT_SHAPE } from "@/components/ui/ghost-text";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_GROUP_CLASS, QUERY_SEARCH_BAND_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";
import { PNL_STRIP } from "@/components/positions/pnl-summary-strip";
import { CountGhost, PillGhost } from "@/app/wallet/money-bar-ghost";
import { categoryLabel } from "@/lib/markets/category-label";
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { useT } from "@/lib/i18n";

/**
 * ⭐ THE SKELETON'S JOB IS THAT NOTHING MOVES WHEN THE DATA LANDS — §B7 rule 3, and the reason it
 * is a rule rather than a nicety: `roles/loading.tsx`'s own note records a rail whose ghost was
 * the wrong height and *"the whole matrix below it jumped up by 41 + the body's 20px rhythm on
 * every load."*
 *
 * ⚠️ IT DREW THE WRONG PAGE UNTIL 2026-09-07. The real page's rail was three pills; the ghost was
 * a `border-b` UNDERLINE rail of three fixed 70px boxes with no counts — a different control
 * language (§K 7c: the underline is the SECTION language, the capsule is the FILTER language),
 * a different width, and no counts, so it mismatched even before the campaign touched it. The
 * page now renders a search box and a two-row query bar above the list, so the ghost draws
 * those, in that order, at those heights.
 *
 * ⛔ THE BAR'S CLASSES ARE IMPORTED, NEVER RETYPED. `QUERY_BAR_CLASS` and its two row classes are
 * the same constants the real bar wears, so a change to the bar's padding or sticky offset moves
 * the ghost in the same commit by construction. A hand-copied class string is how a ghost drifts
 * from the thing it stands in for, silently, for as long as nobody screenshots the first paint.
 * ⭐ TODAY'S PICTURE, AS CLIENT CODE (round 5's follow-up, R5-H · G-2): `loading.tsx` (this folder) asks the server
 * which reader this is and renders this for everybody the journey is not shown to; its words are the client
 * dictionary's, so a refresh of /positions (every 20 s) carries its reference, not this tree —
 * `components/ui/page-loader.tsx` has the convention. ⛔ It loads nothing of the journey's (VODACOM-PLAN §0h point 21).
 * ⭐ AND EVERY BAND IS THE PAGE'S, WORD FOR WORD (round 5's follow-up, R5-K, 2026-10-09; S/r5k/m-positions.mts measured
 * each): the head holds the "View performance" button the page puts beside it, so the title and the line wrap in what
 * the button leaves (the ghost drew the head the column's full width: up to 93.5px short on a phone, 54.5 at 360 in
 * Swahili and English, 19.5 in Chinese); the standing strip is the strip's own grid and type (`PNL_STRIP`: ONE column of
 * four cells on a phone, three then four from 640 — the ghost's fixed 2-then-4 grid of bars was 251–265px short on a
 * phone, 133–147 at 640, 46 from 768); the exposure keys are the page's
 * 14px line (10px bars, wrapping at 320 in Swahili as the keys do); and the bar is the money books' bar ghost's parts
 * (`money-bar-ghost.tsx`, R5-H): every lens and every pill of the side, window and topic groups at the page's own width,
 * in the page's own words, with the page's dividers — so row 2 is the page's three lines at 1024 and 1280 (two in
 * Chinese at 1280) where the ghost drew one, and one line at 320 where the ghost's fixed 180 + 104px boxes made two.
 * ⭐ THE CASE DRAWN: a player with positions and stake on both sides (the page draws the head's button, the strip, the
 * exposure keys and the bar only then); figures as shapes, the default sort ("most recent"), no filter on.
 */
export function PositionsGhost() {
  const { t } = useT();
  // The bar's words, as `positions-bar.tsx` prints them (`lensLabel`, the side, window and topic groups).
  const lenses = [t.common.all, t.common.open, t.common.settled, t.market.posWon, t.market.posLost, t.common.voided, t.common.cashedOut];
  const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
    [t.positions.sideKey, [t.market.oddsAny, t.common.yes, t.common.no]],
    [t.common.when, [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll]],
    [t.common.topic, [t.market.catAll, ...MARKET_CATEGORIES.map((c) => categoryLabel(t, c))]],
  ];
  // The strip's three money cells: label, figure, sub-line (`PnlSummaryStrip`), as shapes.
  const cells: ReadonlyArray<readonly [string, string, string]> = [
    [t.positions.atRisk, AMOUNT_SHAPE, `0 ${t.common.open}`],
    [t.positions.liveValueIfSettled, AMOUNT_SHAPE, `+TZS 0,000 ${t.positions.unrealised}`],
    [t.positions.settledPnl, "+TZS 0,000", "0W · 0L · 0C"],
  ];
  const edge = { borderLeft: "1px solid color-mix(in oklab, var(--border) 60%, transparent)" };
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* Same three strings, in the same order, as the real header — a skeleton that names the
          page differently is a second name for one destination (§L1), and the subtitle is drawn
          here too so what follows does not jump when data lands.
          ⭐ DG-P-03 · §K — AND IT IS THE KIT NOW, NOT A HAND-TYPED COPY OF IT. This block was
          `PageHeader`'s eyebrow / h1 / subtitle recipe retyped by hand, which is why the census
          found **17 distinct literal `<h1>` recipes** against `PageHeader`'s 25 call sites. The
          page renders `<PageHeader>` with these exact three strings, so the skeleton renders the
          same component with the same props and the two cannot drift.
          ⚠️ The `<header>` wrapper takes the real page's own class — and since R5-K what the page puts beside the head:
          the "View performance" button's box (`btn btn-ghost btn-sm`, 4px down; its 13px words set and not shown). */}
      <header className="flex items-start justify-between gap-3">
        <PageHeader eyebrow={t.common.positions} title={t.positions.headline} subtitle={t.positions.headlineBody} />
        <div className="mt-1 inline-flex h-[var(--h-control-sm)] shrink-0 items-center gap-1.5 rounded-control border border-transparent bg-bg-overlay px-2 kp-shimmer-track" aria-hidden>
          <span className="h-[13px] w-[13px] shrink-0" />
          <span className="text-body-sm tracking-normal font-semibold text-transparent">{t.performance.viewPerformance}</span>
        </div>
      </header>

      {/* B-29 / V-2 — "Your standing" PnL strip. It sits ABOVE the rail on the real page, so it
          is drawn above the rail here too; getting the ORDER wrong moves everything below it.
          Its classes are the strip's own (`PNL_STRIP`), its inline styles the strip's. */}
      <div className="glass-panel px-5 pt-4 pb-[18px] kp-shimmer-track" aria-hidden>
        <div className={PNL_STRIP.head}>
          <span className="gilt-eyebrow"><GhostText>{t.positions.yourStanding}</GhostText></span>
          <span className={PNL_STRIP.live}>
            <span className="h-1.5 w-1.5 rounded-full" />
            <GhostText>{t.common.live}</GhostText>
          </span>
        </div>
        <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />
        <div className="grid gap-x-0 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>
          {cells.map(([label, value, sub]) => (
            <div key={label} className={PNL_STRIP.cell} style={edge}>
              <p className={PNL_STRIP.label}><GhostText>{label}</GhostText></p>
              <p className={PNL_STRIP.value}><GhostText>{value}</GhostText></p>
              <p className={PNL_STRIP.sub}><GhostText>{sub}</GhostText></p>
            </div>
          ))}
          <div className={PNL_STRIP.cell} style={edge}>
            <p className={PNL_STRIP.label}><GhostText>{t.positions.winRate}</GhostText></p>
            <div className={PNL_STRIP.winRow}>
              {/* The NeedleDial's 36px. */}
              <span className="h-[36px] w-[36px] shrink-0 rounded-full bg-bg-overlay" />
              <p className={PNL_STRIP.winValue}><GhostText>00%</GhostText></p>
            </div>
            <p className={PNL_STRIP.sub}><GhostText>{`00 ${t.market.tickerSettled}`}</GhostText></p>
          </div>
        </div>
      </div>

      {/* The YES/NO exposure bar — the page's line of keys (14px, `text-micro`; its words set and not shown, so it wraps
          where the keys do) over a 2.5-unit track. */}
      <div className="rounded-lg border border-border bg-bg-elevated/60 p-3 kp-shimmer-track" aria-hidden>
        <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-micro uppercase tracking-[0.12em] tabular-nums">
          <span className="font-bold"><GhostText>{`${t.common.yes} · TZS 00K`}</GhostText></span>
          <span><GhostText>{t.positions.atRisk}</GhostText></span>
          <span className="font-bold"><GhostText>{`${t.common.no} · TZS 00K`}</GhostText></span>
        </div>
        <div className="h-2.5 w-full rounded-pill bg-bg-overlay" />
      </div>

      {/* The search band — the page's own class (round 4, 2026-10-09): 10px over a `search-box-wrap` of the box's
          height (`--h-input` + its border) and its 25px echo row, which lies inside the gap to the bar
          (`QUERY_SEARCH_BAND_CLASS`). It was a bare 44px box standing in for a 71px search. */}
      <div className={QUERY_SEARCH_BAND_CLASS} aria-hidden>
        <div className="search-box-wrap">
          <div className="h-[calc(var(--h-input)+2px)] w-full rounded-lg border border-border-control bg-bg-inset kp-shimmer-track" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>

      {/* The query bar — two rows, the same classes the real bar wears, and the money books' pill and count ghosts.
          ⛔ CAPSULES, NOT AN UNDERLINE RAIL. The lens strip is `FilterPill`s at 44px; a ghost
          drawn as tabs would promise a control language the page does not use. */}
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_CLASS}>
          {/* The seven lenses — scrolling below lg, wrapping from it, as the page's strip does. */}
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden pr-2 lg:flex-wrap lg:overflow-visible lg:pr-0">
            {lenses.map((label) => <PillGhost key={label} label={label} />)}
          </div>
          <CountGhost count={t.positions.nResults.replace("{n}", "00")} />
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          {/* Sort + direction, fused (`QuerySort`): the key from lg, the value, the caret; the 44px direction button.
              A phone's row grows it (flex-1) beside the Filters button; from lg it is its own width. */}
          <div className="flex min-w-0 flex-1 items-center lg:flex-none">
            <div className="flex min-h-[44px] min-w-[var(--tap-min)] shrink items-center gap-1.5 overflow-hidden rounded-l-pill border border-r-0 border-transparent bg-bg-overlay px-1.5 lg:gap-2 lg:px-3 kp-shimmer-track">
              <span className="hidden shrink-0 font-mono text-micro font-bold uppercase eyebrow text-transparent lg:inline">{t.common.sort}</span>
              <span className="min-w-0 truncate text-body-sm tracking-normal font-semibold text-transparent">{t.positions.sortRecent}</span>
              <span className="h-[14px] w-[14px] shrink-0" />
            </div>
            <div className="h-[44px] w-[44px] shrink-0 rounded-r-pill bg-bg-overlay kp-shimmer-track" />
          </div>
          {/* The phone's Filters button (the money books' ghost draws the same box). */}
          <div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden" />
          {/* From lg the three groups along the row, each after the page's divider (the row's 29px gap is keyed on it). */}
          {groups.map(([key, labels]) => (
            <Fragment key={key}>
              <QueryGroupDivider />
              <div className={QUERY_GROUP_CLASS}>
                <FilterGroupKey className="text-transparent">{key}</FilterGroupKey>
                {labels.map((label) => <PillGhost key={label} label={label} />)}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {/* Position card skeletons — the real list is a 2-col grid at md
          (grid-cols-1 md:grid-cols-2), not a single column. */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — 128px on the overridden scale, twice
                    any real chip. */}
                <div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />
                <div className="h-4 w-[96px] rounded bg-bg-overlay" />
              </div>
              <div className="h-4 w-3/4 rounded bg-bg-overlay" />
              <div className="flex gap-4">
                <div className="h-3 w-[80px] rounded bg-bg-overlay" />
                <div className="h-3 w-[64px] rounded bg-bg-overlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
