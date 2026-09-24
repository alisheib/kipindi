import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { MARKET_CARD_H_CLOSED } from "@/components/markets/card-geometry";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_GROUP_CLASS,
  QUERY_STRIP_CLASS,
} from "@/components/ui/query-bar";

/**
 * `/results` loading skeleton — the ghost after tapping "Matokeo".
 *
 * 🔴 IT DREW A THIRD OF THE PAGE AND PROMISED THE BOARD 647px TOO HIGH. Until 2026-09-24 this
 * file was a header stub, one 44px search row, and cards — so it put the first result at
 * **y=272**. The real `/results` lands it at **y=919** at 360 in Swahili, because between the
 * header and the grid it renders three bands this ghost did not have at all:
 *
 *   · header row (eyebrow + the NDIO/HAPANA donut and counts)      38px at 320, 360 and 414
 *   · the STICKY search band — `py-2.5` around the search box      91px  (not 44)
 *   · the discovery bar — lens strip + sort/filter, two rows      116px
 *   · the notable-results carousel                          497 / 458 / 436px at 320 / 360 / 414
 *
 * ⚠️ THE 91 WAS ALREADY KNOWN AND ALREADY WRITTEN DOWN. `ResultsSkeleton` in `results/page.tsx`
 * carries a note reading *"FILED, NOT FIXED (DG-P-13 / DG-A-20): this bar is 44px and the band
 * it stands in for renders 91px on production"* — about its own copy of this band. The finding
 * was recorded, the fix was deferred, and the SECOND skeleton on the same route never learned
 * about it. Two ghosts for one page is how that happens; both now consume the same classes.
 *
 * ⛔ AND CLS SCORED THE WHOLE THING 0.0000. `layout-shift` counts only nodes present BEFORE and
 * AFTER a frame, and a skeleton is REMOVED rather than moved — so ghost fidelity is invisible to
 * the metric by construction. `qa:ghost-landing` measures where the board LANDS instead.
 *
 * ⛔ THE ROUTE WAS ALSO UNMEASURABLE UNTIL TODAY, WHICH IS WHY THE NUMBER IS NEW RATHER THAN
 * LARGE. The grid below used a hand-rolled `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
 * instead of `.market-grid`, the class the page and `ResultsSkeleton` both use, so the guard
 * could not find the board and reported "no skeleton frame was ever captured" — a vacuous pass.
 * A ghost that does not speak the page's class names cannot be compared with the page.
 *
 * ⭐ EVERY BAND BELOW IS STRUCTURE, NOT A MEASUREMENT, WITH ONE EXCEPTION. The search band and
 * the discovery bar are built from the page's own wrappers and tokens (`search-box-wrap`,
 * `--h-input`, `QUERY_BAR_*`, `QUERY_STRIP_CLASS`, `QUERY_GROUP_CLASS`), so they compute to 91
 * and 116 rather than being told to. ⚠️ The exception is the carousel's height: its content is a
 * market question, so no arrangement of empty boxes can derive it. It is reserved at the
 * measured 458 and **guarded** — `qa:ghost-landing` fails this route if the board lands more
 * than 120px from where the ghost promised, which is what makes a single measured number safe to
 * keep here rather than a thing to remember.
 */
export default async function ResultsLoading() {
  const { t } = await getServerT();
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
        {/* Header row — eyebrow left, the NDIO/HAPANA donut and counts right. Drawing only the
          eyebrow made this row a different height; the real one is 38px at every phone width. */}
        <div className="flex items-center justify-between gap-3" aria-hidden>
          <div className="h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track" />
          <div className="flex items-center gap-2">
            {/* The NDIO/HAPANA donut. ⚠️ 38px is what makes this row 38px tall — measured at
                320, 360 and 414 alike; the eyebrow and the count text beside it are only 18px, so
                the ring sets the height. A 26px ghost drew a 26px row and the board inherited it. */}
            <div className="h-[38px] w-[38px] rounded-full bg-bg-overlay kp-shimmer-track" />
            <div className="h-3 w-[120px] rounded bg-bg-overlay kp-shimmer-track" />
          </div>
        </div>

        {/* The STICKY search band. ⛔ `py-2.5` is the band, not decoration: it is the 20px that
          turns a 71px `search-box-wrap` into the 91px the page actually reserves. */}
        <div className="py-2.5" aria-hidden>
          <div className="search-box-wrap">
            <div className="kp-shimmer-track h-[calc(var(--h-input)+2px)] rounded-lg border border-border bg-bg-inset" />
            <p className="mt-1.5 min-h-[17px]" />
          </div>
        </div>

        {/* The discovery bar. Same wrappers as the real one, so it is two rows on a phone rather
          than however many a re-typed `flex-wrap` would have produced. */}
        <div aria-hidden className={QUERY_BAR_CLASS}>
          <div className={QUERY_BAR_ROW1_CLASS}>
            <div className={QUERY_STRIP_CLASS}>
              {[64, 74, 96].map((w, i) => (
                <div
                  key={i}
                  className="kp-shimmer-track h-[44px] shrink-0 rounded-pill bg-bg-elevated"
                  style={{ width: w }}
                />
              ))}
            </div>
            <div className="kp-shimmer-track h-4 w-[80px] shrink-0 rounded bg-bg-elevated" />
          </div>
          <div className={QUERY_BAR_ROW2_CLASS}>
            {/* ⛔ 182 AND 134 ARE MEASURED, AND THE PAIR MUST FIT ON ONE LINE. The real row renders
              182×44 (sort) + 134×44 (filters) = 316 plus a 16px gap = 332, inside 336px of content
              width at 360 — by four pixels. Ghosting them at 210 and 130 overflowed that, so
              `flex-wrap` broke the row in two and the bar drew **172px against a real 116**,
              putting the board 56px too low. ⚠️ Unlike `/markets`, THIS bar does not opt into the
              phone grid (it carries no `data-bar-row`), so nothing rescues a row that wraps. */}
            <div className="kp-shimmer-track h-[44px] w-[182px] rounded-pill bg-bg-elevated" />
            <div className="kp-shimmer-track h-[44px] w-[134px] rounded-pill bg-bg-elevated" />
            {/* ⛔ Desktop-only groups — the real ones carry `QUERY_GROUP_CLASS` (`hidden … lg:flex`),
              so a phone never receives them and neither does its ghost. */}
            {[88, 84].map((w, i) => (
              <div key={i} className={QUERY_GROUP_CLASS}>
                <div
                  className="kp-shimmer-track h-[44px] rounded-pill bg-bg-elevated"
                  style={{ width: w }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* The notable-results carousel: a 44px arrow row over the featured result card.
          ⚠️ THE ONE MEASURED NUMBER IN THIS FILE (see the header). 458px is 360's; 320 renders
          497 and 414 renders 436, both inside `qa:ghost-landing`'s 120px tolerance. */}
          <div className="mb-5 min-h-[458px]" aria-hidden>
            <div className="mb-2 flex items-center justify-end gap-2">
              <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
              <div className="kp-shimmer-track h-3 w-[32px] rounded bg-bg-overlay" />
              <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
            </div>
            <div
              className="kp-shimmer-track rounded-xl border border-border bg-bg-elevated"
              style={{ height: 370 }}
            />
          </div>

          {/* Card grid skeleton.
          ⛔ `.market-grid`, NOT A HAND-ROLLED `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.
          That is what stood here, and it disagreed with the real page twice over: the shared
          class is `gap: 14px` against `gap-3`'s 16 (10px over six rows), and it tracks columns
          with `auto-fill minmax(min(300px,100%),1fr)` rather than counting them at fixed
          breakpoints, so the two laid out a different number of columns on a tablet. The real
          `/results` grid and `ResultsSkeleton` both use `.market-grid`; this was the only one of
          the three that did not. ⭐ It also made the route UNMEASURABLE — see the header. */}
          <div className="market-grid" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-bg-elevated p-4 kp-shimmer-track"
                style={{ height: MARKET_CARD_H_CLOSED }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-14 rounded-pill bg-bg-overlay" />
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
    </PageContainer>
  );
}
