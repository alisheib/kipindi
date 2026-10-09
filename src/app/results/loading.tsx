"use client";

import { PageContainer } from "@/components/layout/page-container";
import { MARKET_CARD_H_CLOSED } from "@/components/markets/card-geometry";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { CHIP_GHOST, Words } from "@/components/ui/ghost-kit";
import { FiltersGhost, GroupGhost, PillGhost, SortGhost } from "@/components/ui/query-bar-ghost";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_SEARCH_BAND_CLASS,
  QUERY_STRIP_CLASS,
  QueryGroupDivider,
} from "@/components/ui/query-bar";
import { MARKET_CATEGORIES } from "@/lib/markets/categories";
import { categoryLabel } from "@/lib/markets/category-label";
import { outcomeWord, sideWord } from "@/lib/side-label";
import { useT } from "@/lib/i18n";

/**
 * `/results` loading skeleton — the ghost after tapping "Matokeo".
 *
 * 🔴 IT DREW A THIRD OF THE PAGE AND PROMISED THE BOARD 647px TOO HIGH. Until 2026-09-24 this
 * file was a header stub, one 44px search row, and cards — so it put the first result at
 * **y=272**. The real `/results` lands it at **y=919** at 360 in Swahili, because between the
 * header and the grid it renders three bands this ghost did not have at all:
 *
 *   · header row (eyebrow + the NDIO/HAPANA donut and counts)      38px at 320, 360 and 414
 *   · the STICKY search band — `py-2.5` around the search box      91px  (not 44; 56 since round 4, see below)
 *   · the discovery bar — lens strip + sort/filter, two rows      116px
 *   · the notable-results carousel                          497 / 458 / 436px at 320 / 360 / 414
 *
 * ⚠️ THE 91 WAS ALREADY KNOWN AND ALREADY WRITTEN DOWN. `ResultsSkeleton` in `results/page.tsx`
 * carried a note reading *"FILED, NOT FIXED (DG-P-13 / DG-A-20): this bar is 44px and the band
 * it stands in for renders 91px on production"* — about its own copy of this band. The finding
 * was recorded, the fix was deferred, and the SECOND skeleton on the same route never learned
 * about it. Two ghosts for one page is how that happens — and since round 5's follow-up (R5-L) there is ONE: the page's
 * Suspense fallback is `ResultsGhostBands` below, the very bands this file draws.
 *
 * ⛔ AND CLS SCORED THE WHOLE THING 0.0000. `layout-shift` counts only nodes present BEFORE and
 * AFTER a frame, and a skeleton is REMOVED rather than moved — so ghost fidelity is invisible to
 * the metric by construction. `qa:ghost-landing` measures where the board LANDS instead.
 *
 * ⛔ THE ROUTE WAS ALSO UNMEASURABLE UNTIL TODAY, WHICH IS WHY THE NUMBER IS NEW RATHER THAN
 * LARGE. The grid below used a hand-rolled `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
 * instead of `.market-grid`, the class the page uses, so the guard
 * could not find the board and reported "no skeleton frame was ever captured" — a vacuous pass.
 * A ghost that does not speak the page's class names cannot be compared with the page.
 *
 * ⭐ EVERY BAND BELOW IS STRUCTURE, NOT A MEASUREMENT. The search band and the bar are built from
 * the page's own wrappers and tokens (`search-box-wrap`, `--h-input`, `QUERY_BAR_*`, `QUERY_STRIP_CLASS`,
 * `QUERY_GROUP_CLASS` through `query-bar-ghost.tsx`), so they compute to the page's heights rather than being told to.
 * ⭐ AND SINCE ROUND 5'S FOLLOW-UP (R5-L), THE TWO MEASURED NUMBERS ARE GONE TOO:
 *   · ROW 2 FROM `lg` CARRIES THE PAGE'S WORDS. It drew the sort and two typed boxes in ONE line; the page lays its sort
 *     and three groups — the game, the window, the topic with its glyphs — along a row that wraps on their words: four
 *     lines at 1024 in Swahili and English (the topic group wraps inside itself there) and three at 1280 — three and two
 *     in Chinese — measured from the served fonts with two-digit counts (S/r5l/measure-routes.cts; tile 170 shows two at
 *     1280 with the QA board's one-digit counts). The grid landed 56 to 168px below the ghost's promise. Each group is now
 *     the page's own wrapper, divider, key and pills.
 *   · THE CAROUSEL IS THE NOTABLE CARD'S OWN BOX. It was reserved at 458px — measured at 360 on 2026-09-24, against
 *     cards that have since lost lines — and drawn at every width: at 1280 the page's carousel is 340px (the 44px
 *     arrows and their 12px, the card's 234 — tile 170 — and the dots' 10 + 40), so the grid landed 118px HIGHER than
 *     promised (68px at 390). The ghost card is the card's own stack (`p-5 lg:p-6`, the chip row with the page's words,
 *     the title, the 28px bar with its 24.5px label row, the stats line), and the title's line count is the one
 *     judgement left: the tallest of three notable titles, on the rule /live's hero takes for its six — the tallest of
 *     N is the board's title at the N/(N+1) quantile, here the 75th percentile, from the served fonts
 *     (S/r5l/measure-titles-steps.cts): three lines to 401px, two to 685 (657 in English), one beyond, at 22px from
 *     1024. Drawn on the breakpoints — three below 640, two to 767, one from 768 — it holds a line more than the
 *     judgement from 402 to 639 and from 686 (658) to 767.
 * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): a refresh of /results carries this drawing's reference, not its
 * tree — and the page's own Suspense fallback is the same reference since R5-L. `components/ui/page-loader.tsx` has the
 * convention.
 */
export default function ResultsLoading() {
  // Width MUST match results/page.tsx (1280) — a mismatch reflows on every route transition.
  return (
    /* ⛔ THE WRAPPER STRUCTURE IS THE PAGE'S, NOT AN APPROXIMATION OF IT: `<PageContainer
       tier="board">` with NO rhythm class, then the bands inside a `flex flex-col gap-5` div,
       then the carousel and the grid inside a SECOND nested one — exactly as `results/page.tsx`
       is built. Its own note explains why the rhythm is on a wrapper rather than the container
       (`space-y-*` and `gap` both mis-count an absolutely-positioned `sr-only` h1), and a ghost
       that flattens the nesting pays a different number of gaps than the page it stands in for. */
    <PageContainer tier="board">
      <div className="flex flex-col gap-5">
        <ResultsGhostBands />
      </div>
    </PageContainer>
  );
}

/**
 * The bands inside the page's `flex flex-col gap-5` wrapper — this file's drawing AND the page's own Suspense fallback
 * (`results/page.tsx`), so the first paint of a document and the first paint of a move are one drawing.
 * The page hands it what it knows: whether the notable carousel shows (page one with no search — the move's own case,
 * drawn by default) and whether a search's line stands over the grid.
 * ⚠️ The board drawn is the common one, an archive of eight results or more: rows (the bar and search shown), three
 * notable results on page one (the carousel with its arrows and dots), two-digit counts, and `PLAYER_PER_PAGE` less
 * those three in the grid. A smaller archive is another case — today's QA board (tile 170: six results) shows one
 * notable, a carousel without arrows or dots (106px shorter), and one-digit counts, which take row 2 a line shorter
 * at 1280 in Swahili and English and at 1024 in English (56px): its grid lands 106 to 162px higher than this ghost
 * promises.
 */
export function ResultsGhostBands({ notable = true, searching = false }: { notable?: boolean; searching?: boolean }) {
  const { t } = useT();
  const lenses = [t.common.all, outcomeWord(t, "YES", "MARKET"), outcomeWord(t, "NO", "MARKET"), t.common.voided];
  const product = [t.market.catAll, `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`, `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}`];
  const when = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll];
  const topics = [t.market.catAll, ...MARKET_CATEGORIES.map((c) => categoryLabel(t, c))];
  return (
    <>
      {/* Header row — the page's eyebrow (its glyph and its word, printed: the page's name), and the 38px donut beside
          the tally's lines. ⚠️ 38px is what makes this row 38px tall — measured at 320, 360 and 414 alike: the eyebrow
          and the tally beside the ring are shorter, so the ring sets the height. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <span className="text-text-subtle"><I.resolved s={18} /></span>
          <p className="font-mono text-caption uppercase eyebrow font-bold text-text-subtle">{t.results.title}</p>
        </div>
        <div className="flex items-center gap-3" aria-hidden>
          {/* The donut's 38px, the tally's lines beside it (12.5px each, shorter than the ring), the count line from 640 —
              one line each, so their boxes are the ghost. */}
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-[38px] w-[38px] shrink-0 rounded-full bg-bg-overlay kp-shimmer-track" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="h-[8px] w-[96px] rounded-sm bg-bg-elevated" />
              <span className="h-[8px] w-[64px] rounded-sm bg-bg-elevated" />
            </div>
          </div>
          <div className="hidden h-[14px] w-[176px] items-center sm:flex"><span className="h-[8px] w-full rounded-sm bg-bg-elevated" /></div>
        </div>
      </div>

      {/* The search band — the page's own class (round 4, 2026-10-09). ⛔ It is the band, not decoration: 10px over
        a 71px `search-box-wrap`, whose 25px echo row lies inside the gap to the bar below (`globals.css`,
        `.kp-search-band`), so it takes 56px of the column, as the page's does. It was `py-[10px]`, 91px. */}
      <div className={QUERY_SEARCH_BAND_CLASS} aria-hidden>
        <div className="search-box-wrap">
          <div className="kp-shimmer-track h-[calc(var(--h-input)+2px)] rounded-lg border border-border bg-bg-inset" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>

      {/* The discovery bar — the page's wrappers and the page's words (`query-bar-ghost.tsx`). */}
      <div aria-hidden className={QUERY_BAR_CLASS}>
        <div className={QUERY_BAR_ROW1_CLASS}>
          <div className={QUERY_STRIP_CLASS}>
            {lenses.map((l) => <PillGhost key={l} label={l} />)}
          </div>
          {/* The count as tall as its line — `QueryResultCount`'s 11.5px × 1.5 = 17.25px (/markets' ghost's own box). */}
          <div className="flex h-[17.25px] shrink-0 items-center"><div className="kp-shimmer-track h-3 w-[80px] rounded bg-bg-elevated" /></div>
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          {/* The sort fills a phone's row beside the Filters button; from lg it is its own width and the three groups
              follow it, each behind the page's divider (the row's 29px gap is keyed on it), wrapping as the page's. */}
          <SortGhost label={t.common.sort} value={t.results.sortNewest} />
          {/* The Filters button is a phone's alone (`FilterSheet` is `lg:hidden`, filter-sheet.tsx) — R5-H · G-2b: the
              ghost drew it at 1280 too, a 134px pill in a row the page does not have. Since R5-L it is the trigger's own box
              with its word, as wide as the page's in every language. */}
          <FiltersGhost label={t.market.filtersOpen} />
          <QueryGroupDivider />
          <GroupGhost label={t.market.gameKey}>{product.map((p) => <PillGhost key={p} label={p} />)}</GroupGhost>
          <QueryGroupDivider />
          <GroupGhost label={t.common.when}>{when.map((w) => <PillGhost key={w} label={w} />)}</GroupGhost>
          <QueryGroupDivider />
          <GroupGhost label={t.common.topic}>{topics.map((c) => <PillGhost key={c} label={c} glyph />)}</GroupGhost>
        </div>
      </div>

      {/* ⭐ THE PAGE'S OWN TWO WRAPPERS (R5-H · G-2b): `results/page.tsx` stands the carousel and the grid in a BLOCK
          (`min-w-0 flex-1`) inside a `flex flex-col gap-5 lg:flex-row` row of one child, so only the carousel's own
          `mb-5` (24px) parts them. This was one `flex flex-col gap-5` AND the `mb-5` — 48px: the grid stood 24px low. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        <div className="min-w-0 flex-1">
          {/* A search's line over the grid (the page's `mb-3` 11px line), when the page says one is running. */}
          {searching && <div className="mb-3 h-[16.5px]" aria-hidden />}
          {notable && <NotableGhost />}

          {/* Card grid skeleton.
          ⛔ `.market-grid`, NOT A HAND-ROLLED `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.
          That is what stood here, and it disagreed with the real page twice over: the shared
          class is `gap: 14px` against `gap-3`'s 16 (10px over six rows), and it tracks columns
          with `auto-fill minmax(min(300px,100%),1fr)` rather than counting them at fixed
          breakpoints, so the two laid out a different number of columns on a tablet.
          ⭐ It also made the route UNMEASURABLE — see the header. The grid holds a page of results less the three the
          carousel lifts out of it (`PLAYER_PER_PAGE`, `results/page.tsx`'s `notableList`). */}
          <div className="market-grid" aria-hidden>
            {Array.from({ length: notable ? PLAYER_PER_PAGE - 3 : PLAYER_PER_PAGE }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-bg-elevated p-4 kp-shimmer-track"
                style={{ height: MARKET_CARD_H_CLOSED }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-[56px] rounded-pill bg-bg-overlay" />
                    {/* ⚠️ WIDTH IS A LITERAL, not `w-10` — spacing is overridden
                    (tailwind.config.ts:200-215) so `w-10` is 80px, far wider than the tiny
                    label it stands for. The h-4 height is a default key and reads as written. */}
                    <div className="h-4 w-[40px] rounded-pill bg-bg-overlay" />
                  </div>
                  <div className="h-4 w-full rounded bg-bg-overlay" />
                  <div className="h-4 w-3/4 rounded bg-bg-overlay" />
                  <div className="h-2 w-full rounded-full bg-bg-overlay mt-2" />
                  <div className="flex gap-2 mt-auto">
                    <div className="h-3 w-[64px] rounded bg-bg-overlay" />
                    {/* ⚠️ WIDTH IS A LITERAL, not `w-12` (128px on the overridden scale) for a
                    3px-tall micro label. */}
                    <div className="h-3 w-[64px] rounded bg-bg-overlay" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** The notable carousel (`notable-carousel.tsx`), three slides: the 44px arrows and their counter (12px over the card),
 *  the notable card's own box, then the dot rail's 10px and 40px. The card is `FeaturedResult`'s stack in its own classes
 *  with the page's words: the chip row (a topic, the verdict, the crown's flag — it wraps on a phone, as the page's), the
 *  title's lines, the 28px bar and its 24.5px label row, and the stats line. */
function NotableGhost() {
  const { t } = useT();
  return (
    <div className="mb-5" aria-hidden>
      <div className="mb-2 flex items-center justify-end gap-2">
        <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
        <div className="kp-shimmer-track h-3 w-[32px] rounded bg-bg-overlay" />
        <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
      </div>
      <div className="relative block overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 lg:p-6 kp-shimmer-track text-transparent">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Chip variant="cat" size="sm" style={CHIP_GHOST}>{t.market.catSports}</Chip>
          {/* The verdict chip's box: the `resolved` variant's status metrics (`metrics="status"`), not its gold. */}
          <Chip variant="neutral" metrics="status" size="sm" style={CHIP_GHOST}>{t.market.resolvedOutcome} · {outcomeWord(t, "NO", "MARKET")}</Chip>
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] font-bold">
            <span className="h-[13px] w-[13px] shrink-0" /> <span className="kp-track-end kp-track-end--16"><Words>{t.results.notableResult}</Words></span>
          </span>
        </div>
        {/* The title: the judgement's line count (the header) — its lines' box, each line a bar 1em tall on the 1.25em
            pitch (the third on a phone only, the second below 768). */}
        <div className="mb-4 max-w-[70ch] font-display text-[18px] lg:text-[22px] font-semibold leading-tight min-h-[calc(3*1.25*18px)] sm:min-h-[calc(2*1.25*18px)] md:min-h-[calc(1.25*18px)] lg:min-h-[calc(1.25*22px)]">
          <div className="mt-[0.125em] h-[1em] w-full rounded bg-bg-overlay" />
          <div className="mt-[0.25em] h-[1em] w-full rounded bg-bg-overlay md:hidden" />
          <div className="mt-[0.25em] h-[1em] w-3/5 rounded bg-bg-overlay sm:hidden" />
        </div>
        {/* `TippingBar height={28} showLabels`: the rail, then `.tipbar-labels`' 8px and its 11px line. */}
        <div className="h-[28px] w-full rounded-full bg-bg-overlay" />
        <div className="mt-1.5 h-[16.5px]" />
        {/* The stats line: one 11px line (16.5px) — the pool and the predictors fit it at every width. */}
        <div className="mt-3 flex h-[16.5px] items-center gap-4">
          <span className="h-[8px] w-[120px] rounded-sm bg-bg-overlay/40" />
          <span className="h-[8px] w-[88px] rounded-sm bg-bg-overlay/40" />
        </div>
      </div>
      <div className="mt-[10px] flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className="grid h-[40px] w-[24px] place-items-center">
            <span className="block h-1.5 rounded-full bg-bg-overlay" style={{ width: i === 0 ? 18 : 6 }} />
          </span>
        ))}
      </div>
    </div>
  );
}
