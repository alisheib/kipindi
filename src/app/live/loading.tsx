import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

/**
 * `/live` loading skeleton — the ghost a player sees after tapping "Mubashara".
 *
 * 🔴 IT DREW THE WRONG PAGE, AND BY 538 PIXELS. Until 2026-09-24 this file was a slim
 * "MUBASHARA / Inapakia…" header over eight card boxes, so it promised the first market at
 * **y=160**. The real `/live` opens with an aqua `PageHero` carrying the most-contested market
 * — eyebrow, carousel arrows, the question, a tipping bar, a CTA and a dot rail — and then a
 * full-width search box, and its first card lands at **y=698** at 360 in Swahili. Measured on
 * production during a real client-side hop: the ghost put the grid more than half a screen
 * above where it arrived, and the header it drew does not exist on the page at all.
 *
 * ⛔ AND CLS SCORED THAT 0.0000, WHICH IS WHY NO BUDGET CAUGHT IT. `layout-shift` only counts
 * a node present BEFORE and AFTER the frame; a skeleton is REMOVED and different nodes appear,
 * so a ghost can be arbitrarily wrong and never register. The metric is blind to skeleton
 * fidelity by construction — measure the LANDING POSITION (`qa:ghost-landing`), not the score.
 *
 * ⚠️ `loading.tsx` PAINTS ONLY ON A CLIENT-SIDE NAVIGATION. A hard `goto` streams the real
 * page and this file never renders, so any instrument that measures by opening a URL directly
 * is blind to every skeleton on the site. That is how this survived: it is on the path a
 * player takes (tap the bottom nav) and off the path the harness took.
 *
 * ⭐ THE FIXED ROWS ARE STRUCTURE, NOT LITERALS. The arrows are 44px because the real arrows
 * are; the CTA row carries the same `flex-wrap` and the same child widths, so it breaks onto a
 * second line at the SAME width the real one does (100px at ≤360 where the dot rail wraps
 * under the button, 44px from 414 up) without this file knowing where that width is. The
 * tipping bar is 57px at every width — measured at 320/360/414/1280. The search box consumes
 * `search-box-wrap` and `--h-input` rather than restating them.
 *
 * ⚠️ ONE NUMBER IS A JUDGEMENT AND IT IS THE QUESTION'S LINE COUNT. Six lines on a phone,
 * three from `lg` — measured across the six featured markets at each width, and written as the
 * arithmetic (`6 × leading-tight × 19px`) so it can be re-derived rather than re-guessed. The
 * hero now shows the TALLEST of the six on every slide (`featured-contest.tsx` stacks them),
 * so this is a stable target rather than whichever market happened to be up.
 */
export default async function LiveLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="board" className="space-y-5">
      {/* The `<div>` wrapper is load-bearing on the real page (it pairs the `sr-only` h1 with
          the hero so `space-y-5`, a sibling selector, counts the same children). Mirroring it
          here keeps the ghost's rhythm identical to the content's. */}
      <div>
        <header className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated" aria-hidden>
          <div className="relative z-10 p-5">
            {/* Eyebrow row — pulse + LIVE + the live/tipping count. */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="kp-shimmer-track block h-[18px] w-[18px] rounded-full bg-bg-overlay" />
                <p className="font-mono text-label uppercase eyebrow font-bold text-text">{t.home.liveSection}</p>
              </div>
              <div className="kp-shimmer-track h-[13px] w-28 rounded bg-bg-overlay" />
            </div>

            <div className="mt-4">
              {/* Contest eyebrow + the two 44px arrow controls and the `n / N` counter. */}
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="kp-shimmer-track h-3 w-40 min-w-0 rounded bg-bg-overlay" />
                <div className="flex shrink-0 items-center gap-2">
                  <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
                  {/* the `n / N` counter. ⚠️ LITERAL, not `w-7` — spacing is overridden
                      (tailwind.config.ts:200-215), so `w-7` is not 28px and
                      `test:ui-consistency` rejects the numeric utility by name. */}
                  <div className="kp-shimmer-track h-3 w-[32px] rounded bg-bg-overlay" />
                  <div className="kp-shimmer-track h-[44px] w-[44px] rounded-full border border-border" />
                </div>
              </div>

              <div className="max-w-[64ch]">
                {/* The question. `mb-4` is the real h2's margin (20px on this scale) — the same
                    class, not a copy of the number it resolves to. */}
                <div className="mb-4 min-h-[calc(6*1.25*19px)] lg:min-h-[calc(3*1.25*24px)]">
                  <div className="kp-shimmer-track h-[19px] w-full rounded bg-bg-overlay" />
                  <div className="kp-shimmer-track mt-[4.75px] h-[19px] w-full rounded bg-bg-overlay" />
                  <div className="kp-shimmer-track mt-[4.75px] h-[19px] w-[82%] rounded bg-bg-overlay" />
                </div>
                {/* TippingBar with labels — 57px at 320, 360, 414 and 1280 alike. */}
                <div className="kp-shimmer-track h-[57px] w-full rounded bg-bg-overlay" />
                {/* CTA + dot rail. Same wrapper, same gap, same child widths, so it wraps where
                    the real row wraps. `--h-control-md` is the `.btn-md` height. */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="kp-shimmer-track h-[var(--h-control-md)] w-[150px] rounded-md bg-bg-overlay" />
                  <div className="h-[40px] w-[144px]" />
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Search — the real box and its echo row, by class rather than by measurement. */}
      <div aria-hidden className="search-box-wrap">
        <div className="kp-shimmer-track h-[calc(var(--h-input)+2px)] rounded-lg border border-border bg-bg-inset" />
        <p className="mt-1.5 min-h-[17px]" />
      </div>

      {/* The wall. 180px is the PulseCard, measured at 178–183 on production across four widths
          — the one number in this file that was already right. */}
      <div className="market-grid" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="kp-shimmer-track rounded-lg border border-border bg-bg-elevated"
            style={{ height: 180 }}
          />
        ))}
      </div>
    </PageContainer>
  );
}
