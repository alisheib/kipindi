"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonGhost, GhostText } from "@/components/ui/ghost-kit";
import { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";
import type { Dict, Locale } from "@/lib/i18n-dict";

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
 * ⭐ THE FIXED ROWS ARE STRUCTURE, NOT LITERALS. The hero is `PageHero` itself, with the page's props. The arrows are
 * 44px because the real arrows are; the tipping bar is 57px at every width (measured at 320/360/414/1280); the search
 * box consumes `search-box-wrap` and `--h-input` rather than restating them.
 * ⭐ AND SINCE ROUND 5'S FOLLOW-UP (R5-L) THE TWO ROWS THAT WRAP ON WORDS CARRY THE PAGE'S WORDS:
 *   · THE CTA ROW. Its button is the button's own box with "Open market" in it (`.btn .btn-md`), beside the dot rail's six
 *     24px targets — so it breaks where the page's breaks. It was a 150px box: the ghost's row took two lines below 392px
 *     where the page's takes one from 375–376 (Swahili and English) and 345 (Chinese) — at 390, the most common phone, the
 *     hero stood 56px taller than the page's and the wall landed that much higher than promised.
 *   · THE WALL'S CARDS. Each is the PulseCard's own stack: its 20px tag row, the title box at the page's own minimum —
 *     three lines in Swahili, two in English and Chinese (`min-h-[4.125em]` / `min-h-[2.75em]` at 13.5px, snug) — the 9px
 *     bar and the 18px price line. They were 180px in every language: 2.7px short in Swahili and 15.9px too tall in
 *     English and Chinese a card (164.1px), 47.6px over the wall's first three rows.
 * ⚠️ ONE NUMBER IS A JUDGEMENT AND IT IS THE QUESTION'S LINE COUNT. The hero shows the TALLEST of the six questions
 * on every slide (`featured-contest.tsx` stacks them), so the stack is the tallest of six titles — since R5-L on the
 * rule /results' notable card takes for its three: the tallest of N is the board's title at the N/(N+1) quantile, from
 * the served fonts (S/r5l/measure-titles-steps.cts) — four lines below 359px in Swahili, three to 489 (to 421 in English
 * and Chinese), two beyond, at 24px from 1024. Drawn on the breakpoints: four below 360 in Swahili (three in English and
 * Chinese), three to 639, two from 640 — a line more than the judgement from 490 (422) to 639. It was six lines on a
 * phone and three from `lg`, measured across one day's six featured markets (2026-09-24): on today's board (tiles 175
 * and 176, whose questions take two lines at 390 and at 1280) that stood 95px over at 390 and 30 at 1280; the rule's
 * three and two stand 24 and 0 over. Written as the arithmetic (`lines × leading-tight × px`) so it is re-derived,
 * not re-guessed.
 * ⚠️ The carousel drawn holds six markets (`liveContest` features at most six): six dots in the rail.
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function LiveLoading() {
  const { t, locale } = useT();
  return (
    <PageContainer tier="board" className="space-y-5">
      {/* The `<div>` wrapper is load-bearing on the real page (it pairs the `sr-only` h1 with
          the hero so `space-y-5`, a sibling selector, counts the same children). Mirroring it
          here keeps the ghost's rhythm identical to the content's. */}
      <div>
        {/* The page's own `PageHero`, the page's props (R5-L): its frame, its glow and its padding, `p-5 lg:p-6`. */}
        <PageHero glow="aqua" watermark={200}>
          {/* Eyebrow row — pulse + LIVE + the live/tipping count. */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="kp-shimmer-track block h-[18px] w-[18px] rounded-full bg-bg-overlay" aria-hidden />
              {/* The page's own eyebrow word since round 5 (`common.live`, F17), so the ghost's row is the page's. */}
              <p className="font-mono text-label uppercase eyebrow font-bold text-text">{t.common.live}</p>
            </div>
            <div className="kp-shimmer-track h-[13px] w-[112px] rounded bg-bg-overlay" aria-hidden />
          </div>

          <div className="mt-4" aria-hidden>
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
              {/* The question stack at the judgement's line count (the header) — `mb-4` is the real stack's margin (20px
                  on this scale), the same class, not a copy of the number it resolves to. Its bars stay inside every
                  minimum: three below 640, two from it. */}
              <div className={`mb-4 ${locale === "sw" ? "min-h-[calc(4*1.25*19px)] xs:min-h-[calc(3*1.25*19px)]" : "min-h-[calc(3*1.25*19px)]"} sm:min-h-[calc(2*1.25*19px)] lg:min-h-[calc(2*1.25*24px)]`}>
                <div className="kp-shimmer-track h-[19px] w-full rounded bg-bg-overlay" />
                <div className="kp-shimmer-track mt-[4.75px] h-[19px] w-full rounded bg-bg-overlay sm:w-[82%]" />
                <div className="kp-shimmer-track mt-[4.75px] h-[19px] w-[82%] rounded bg-bg-overlay sm:hidden" />
              </div>
              {/* TippingBar with labels — 57px at 320, 360, 414 and 1280 alike. */}
              <div className="kp-shimmer-track h-[57px] w-full rounded bg-bg-overlay" />
              {/* CTA + dot rail — the page's row: the button's own box with its words, then the rail's six 24px targets
                  (`featured-contest.tsx`), `flex-wrap` and the same 16px gap, so it wraps where the page's row wraps. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ButtonGhost size="md">{t.market.openMarket}</ButtonGhost>
                <div className="flex items-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="grid h-[40px] w-[24px] place-items-center">
                      <span className="block h-1.5 rounded-full bg-bg-overlay" style={{ width: i === 0 ? 18 : 6 }} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </PageHero>
      </div>

      {/* Search — the real box and its echo row, by class rather than by measurement.
          ⭐ IN THE PAGE'S SEARCH BAND (2026-10-09, the visual pass round 4, R4-J at R4-H's request): the page wraps its
          box in `QUERY_SEARCH_BAND_CLASS` (pulse-grid.tsx) — 10px over the box, and the echo row lying 15px into the gap
          below it — so the ghost wears the same band, imported, never retyped: the wall lands where the ghost's stood. */}
      <div className={QUERY_SEARCH_BAND_CLASS} aria-hidden>
        <div className="search-box-wrap">
          <div className="kp-shimmer-track h-[calc(var(--h-input)+2px)] rounded-lg border border-border bg-bg-inset" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>

      {/* The wall — eight PulseCards' own stacks, in the reader's language (the title box's minimum is the locale's). */}
      <div className="market-grid" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => <PulseCardGhost key={i} t={t} locale={locale} />)}
      </div>
    </PageContainer>
  );
}

/** A PulseCard (`pulse-grid.tsx`) while it loads: its own box (`rounded-xl border p-4`, a column), the tag row — the
 *  topic tag's 13px glyph and word in its 2px-padded, 1px-bordered box beside the time left — the title's box at the
 *  page's own minimum for the language, the 9px bar 16px under it, and the 18px price line 10px under that. */
function PulseCardGhost({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <div className="kp-shimmer-track flex flex-col rounded-xl border border-border bg-bg-elevated p-4 text-transparent">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-micro uppercase eyebrow">
          <span className="inline-flex items-center gap-1.5 py-0.5 border-y border-transparent">
            <span className="h-[13px] w-[13px] shrink-0" /><GhostText>{t.market.catSports}</GhostText>
          </span>
        </span>
        <span className="h-[8px] w-[64px] rounded-sm bg-bg-overlay/40" />
      </div>
      <div className={`font-display text-[13.5px] font-semibold leading-snug ${locale === "sw" ? "min-h-[4.125em]" : "min-h-[2.75em]"}`}>
        <div className="mt-[0.1875em] h-[1em] w-full rounded bg-bg-overlay" />
        <div className="mt-[0.375em] h-[1em] w-3/4 rounded bg-bg-overlay" />
      </div>
      <div className="mt-3 h-[9px] w-full rounded-full bg-bg-overlay" />
      {/* The price line: one 12px line (18px), its two sides at the ends. */}
      <div className="mt-[10px] flex h-[18px] items-center justify-between">
        <span className="h-[8px] w-[72px] rounded-sm bg-bg-overlay/40" />
        <span className="h-[8px] w-[72px] rounded-sm bg-bg-overlay/40" />
      </div>
    </div>
  );
}
