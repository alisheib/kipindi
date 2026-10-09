"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { MARKET_CARD_H } from "@/components/markets/card-geometry";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_STRIP_CLASS,
  QueryGroupDivider,
} from "@/components/ui/query-bar";
import { FiltersGhost, GroupGhost, MenuGhost, PillGhost, SortGhost } from "@/components/ui/query-bar-ghost";
import { POOL_FLOORS } from "@/lib/markets/discovery";
import { formatTzsCompact } from "@/lib/utils";

/**
 * /markets loading skeleton.
 *
 * 🔴 A SKELETON'S ONLY JOB IS TO BE THE RIGHT SHAPE. This one was not, and the mismatch was
 * measured in a real browser at 1280 on 2026-08-10, not estimated:
 *
 *   · cards          220px  →  the real card is 349.4px  (129px deficit PER ROW)
 *   · filter rail    6 pills at 32px  →  the real rail was 13 pills at 48px, 750px tall
 *   · promo block    absent          →  84px on the real page
 *   · search         inside the right column → the real one was FULL WIDTH above both columns
 *
 * So the page it drew was not the page that arrived: over four rows the grid alone jumped by
 * more than 500px, and the whole board shifted sideways as the search bar moved out of the
 * column. That is the B-29 finding recurring — a skeleton that lies about the page is worse
 * than no skeleton, because it commits the layout to a shape and then breaks the commitment
 * while the reader's eye is already moving.
 *
 * ⚠️ REWRITTEN 2026-08-13 with the round-2 discovery bar. The 13-pill vertical rail and the
 * two-column split are GONE; so is the propose promo, which the kit removes from this route.
 * The shape is now: header row → search → sticky two-row filter bar → full-width grid.
 * Drawing the old rail here would have re-created the exact defect this file documents.
 *
 * ⚠️ THE STRUCTURE BELOW MIRRORS `page.tsx` WRAPPER-FOR-WRAPPER — same `PageContainer` tier,
 * same header row, same search, same bar height, same `.market-grid`. The shimmer blocks are
 * the only difference. Keep it that way, and in the same commit.
 *
 * ⛔ Card height and count are NOT re-typed here: `MARKET_CARD_H` is the one shared definition
 * (`components/markets/card-geometry.ts`) and the count comes from `PLAYER_PER_PAGE`. That is
 * how the two skeletons stay equal — the previous pair drifted to 220 vs 349 precisely because
 * each carried its own literal.
 * ⭐ AND SINCE ROUND 5'S FOLLOW-UP (R5-L) THERE IS ONE SKELETON, NOT TWO. The page's Suspense fallback was
 * `GridSkeleton` — the skeleton a DOCUMENT load paints first — and it drew the grid alone, `mt-3`: no bar at all, so the
 * first card stood 92px above where the page puts it on a phone (the one-line bar's 84 and the grid's 8 more) and 180px
 * at 1280 in Swahili. The bar and the grid below are `MarketsBoardGhost`, this file's drawing and the page's fallback.
 * ⭐ AND ROW 2 FROM `lg` CARRIES THE PAGE'S WORDS: the sort, the odds and pool groups (each behind the page's own divider,
 * with its key and pills — `query-bar-ghost.tsx`) and the topic menu wrap where the page's do — two lines at 1024 and
 * 1280 in Swahili and English (and at 1024 in Chinese), measured from the served fonts (S/r5l/measure-routes.cts), where
 * five typed boxes drew one: the grid landed 56px below the ghost's promise.
 */
/**
 * The status segment widths, in `STATUS_IDS` order: open · today · new · progress · watch · all.
 * Exported so a guard can count them against the real status list without parsing JSX.
 */
export const STATUS_PILL_W = [64, 104, 60, 92, 84, 52];

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function MarketsLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="board">
      {/* Header row — title left, the live-count + volume line right. The real page renders
          both; drawing only the title made the row a different height. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-caption font-bold uppercase eyebrow text-text-subtle">{t.market.title}</p>
        <div className="kp-shimmer-track h-4 w-40 rounded bg-bg-elevated" aria-hidden />
      </div>

      {/* Search — full width, with the echo row reserved exactly as the real box reserves it.
          ⚠️ THE BOX IS `--h-input` PLUS 2px, NOT `--h-input`. The real `.input-group` renders
          **46px**: globals.css's own note says its PADDING box is 44 (`--h-input`), and Tailwind
          borders sit outside a padding box but inside a border-box height — so a ghost given
          `h-[var(--h-input)]` with a `border` draws 44 where the field draws 46. Measured on
          production: `.search-box-wrap` 71px = 46 + 8 (`mt-1.5`) + 17 (the echo row). */}
      <div aria-hidden className="search-box-wrap kp-markets-search">
        {/* ⚠️ TOKEN, not `h-11` — spacing is overridden (tailwind.config.ts:200-215) so `h-11`
            drew 96px. This ghosts `<Input size="md">`, which reads --h-input (44px); consume the
            same token so the ghost and the field can never drift apart. */}
        <div className="kp-shimmer-track h-[calc(var(--h-input)+2px)] rounded-lg border border-border bg-bg-inset" />
        <p className="mt-1.5 min-h-[17px]" />
      </div>

      <MarketsBoardGhost />
    </PageContainer>
  );
}

/**
 * The board while it loads — the bar, then the grid: this file's drawing AND `markets/page.tsx`'s Suspense fallback, so a
 * document's first paint and a move's are one drawing (R5-L). Drawn for a board with a page of cards.
 */
export function MarketsBoardGhost() {
  const { t } = useT();
  return (
    <>
      {/* The discovery bar — TWO rows at the real 44px control height, so the grid below starts
          where it will actually start. Row 1: status segments + count. Row 2: sort + direction,
          odds, pool, topic.
          ⛔ EVERY WRAPPER CLASS HERE IS IMPORTED, NOT RE-TYPED. Each one of them was a literal
          until 2026-09-24, and the copies had drifted: row 1 said `flex-wrap` where the real
          strip says `overflow-x-auto`, so at 360 the six status pills (456px of them) stacked
          into THREE lines and row 2's six controls into three more. Measured on production
          during a real client-side hop, the ghost put the first card at y=557 and the board put
          it at y=318 — the grid jumped **239px upward** as the content arrived. CLS scored that
          0.0000, because layout-shift only counts nodes present BEFORE and AFTER and the ghost
          nodes are removed rather than moved. The metric is blind here; the eye is not. */}
      {/* 🔴 THE FOUR HOOKS BELOW ARE LOAD-BEARING AND THEY ARE WHY THIS BAR IS 76px AND NOT 172 (84px since round 4
          gave the count line its 12px of air, 2026-10-09 — the ghost follows by the same construction).
          Under 640px in Compact, `globals.css` re-lays THIS bar as a GRID — strip | sort | filters
          on one line, with the result count spanning a second — and it gates that on
          `.kp-discovery-bar:has(> [data-bar-row])`, placing each cell by `[data-strip-autoscroll]`,
          `[data-bar-cell="sort"]`, `.kp-fsheet` and `[data-result-count]`. A ghost that copies the
          CLASSES but not the ATTRIBUTES misses the gate, falls back to two flex rows, and at 360
          its 210 + 170px row-2 pills then wrap into a third: measured on production, ghost bar
          **172px against a real 76px**, putting the board 95px too low. ⛔ Opting in is not
          decoration — it is how the ghost inherits the compaction by construction instead of being
          told a number that the density switch and the 300px branch would both invalidate. */}
      <div aria-hidden className={QUERY_BAR_CLASS}>
        <div className={QUERY_BAR_ROW1_CLASS} data-bar-row>
          <div className={QUERY_STRIP_CLASS} data-strip-autoscroll>
            {/* ⛔ ONE WIDTH PER STATUS, IN `STATUS_IDS` ORDER — open · today · new · progress ·
                watch · all. The widths are per-LABEL so they stay literal, but the COUNT is not
                allowed to drift: `test:board-discovery` §7 asserts this array is exactly as long
                as `STATUS_IDS`. It was five entries when a sixth status shipped on 2026-09-06,
                which would have drawn a bar one pill short and then widened it under the
                reader's eye — the B-29 shape this file's own header exists to document. */}
            {STATUS_PILL_W.map((w, i) => (
              <div key={i} className="kp-shimmer-track h-[44px] rounded-pill bg-bg-elevated" style={{ width: w }} />
            ))}
          </div>
          {/* The count as tall as its line — `QueryResultCount`'s 11.5px × 1.5 = 17.25px, its bar centred in it (R5-H · G-2b:
              a 20px bar made the phone grid's count row 2.75px taller than the page's, the board 4px low). */}
          <div className="flex h-[17.25px] shrink-0 items-center" data-result-count=""><div className="kp-shimmer-track h-3 w-[80px] rounded bg-bg-elevated" /></div>
        </div>
        <div className={QUERY_BAR_ROW2_CLASS} data-bar-row>
          {/* Sort + direction, and the phone's single Filters button — the two controls this row renders below `lg`,
              each the page's own box with its words (`query-bar-ghost.tsx`, R5-L): under 640 the phone grid places them by
              the page's own hooks (`data-bar-cell`, `.kp-fsheet`) and folds the Filters label away as it folds the page's.
              They were a 210px and a 170px box: wider than the page's cells, they pushed the phone grid past the bar's
              edge. The Filters button is `lg:hidden`, as `FilterSheet` is (R5-H · G-2b). */}
          <SortGhost label={t.common.sort} value={t.market.sortPool} />
          <FiltersGhost label={t.market.filtersOpen} />
          {/* ⛔ ODDS, POOL AND TOPIC ARE DESKTOP-ONLY. On a phone the real bar folds all three
              behind the button above (`FilterSheet`), and their desktop rows carry
              `QUERY_GROUP_CLASS`, which is `hidden … lg:flex`. Ghosting them unconditionally drew
              four 44px pills a phone never receives. Consume the SAME visibility class rather
              than re-stating the breakpoint, so a change to one moves both.
              ⭐ AND THEY ARE THE PAGE'S GROUPS (R5-L): each behind the page's divider (the row's 29px gap is keyed on it),
              its key and its pills with the page's words — the pool's floors set as money, as the page sets them — then
              the topic menu's own box. Four typed boxes drew one line where the page's row takes two. */}
          <QueryGroupDivider />
          <GroupGhost label={t.market.oddsKey}>
            {[t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong].map((o) => <PillGhost key={o} label={o} />)}
          </GroupGhost>
          <QueryGroupDivider />
          <GroupGhost label={t.market.poolKey}>
            <PillGhost label={t.market.poolAny} />
            <PillGhost label={`${formatTzsCompact(POOL_FLOORS["10k"])}+`} amount />
            <PillGhost label={`${formatTzsCompact(POOL_FLOORS["50k"])}+`} amount />
          </GroupGhost>
          <QueryGroupDivider />
          <MenuGhost label={t.common.topic} value={t.market.catAll} />
        </div>
      </div>

      {/* `mt-5`, the page's own margin over its grid (round 4, 2026-10-09). */}
      <div className="market-grid mt-5" aria-hidden>
        {Array.from({ length: PLAYER_PER_PAGE }).map((_, i) => (
          <div
            key={i}
            className="kp-shimmer-track rounded-md border border-border bg-bg-elevated"
            style={{ height: MARKET_CARD_H }}
          />
        ))}
      </div>
    </>
  );
}
