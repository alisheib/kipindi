"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";

/**
 * ⭐ IT READS NOTHING (2026-10-09, the visual pass round 5, review G1): it asked for the words and drew none of them, and
 * that read was all that kept this file off the browser. The journey's root loading state
 * (`components/journey/route-ghost.tsx`) now draws this very skeleton there, on a move to a question.
 * ⭐ CLIENT CODE (round 5's follow-up, R5-H · G-2): so a refresh of a question (every 15 s) carries this skeleton's
 * reference, not its tree — `components/ui/page-loader.tsx` has the convention.
 */
export default function MarketDetailLoading() {
  // Width MUST match markets/[id]/page.tsx (1080). It was 1100, so every navigation
  // to a market detail page reflowed by 20px the moment the real page took over.
  return (
    <PageContainer tier="reading" className="space-y-5">
      {/* The back link and the header as the page stands them: the header 16px (`mt-3`) under the BackLink's 44px box,
          on no rhythm of the container's (R5-H · G-2b: a 16px bar sat 24px over the header, which stood 20px high). */}
      <div>
        <BackLinkGhost />
        {/* Header skeleton */}
        <header className="mt-3" aria-hidden>
          {/* ⭐ THE PAGE'S HEADER BANDS (R5-H · G-2b): the chips beside the 40px watch and share buttons (a 40px row), 16px,
              the 1px hairline (neutral here: the page's is the gilt seal of a real question), 16px, then the question — one
              line of it, 35px, 45px from `md` (`text-title-lg` / `md:text-display-3`, leading-tight); a longer question
              wraps, which a ghost cannot know. It drew 24px chips, a 40px title bar and a subtitle the page does not have. */}
          <div className="mb-3 flex h-[40px] items-center gap-2">
            <div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" />
            {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — spacing is overridden
                (tailwind.config.ts:200-215) so `w-12` is 128px, twice any real chip. */}
            <div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" />
          </div>
          <div className="mb-3 h-px w-full bg-border" />
          <div className="h-[35px] rounded bg-bg-overlay kp-shimmer-track md:h-[45px]" style={{ width: "min(620px, 90%)" }} />
        </header>
      </div>

      {/* B-29 / V-2 — mirror the REAL layout: content LEFT, bet widget RIGHT
          (and widget FIRST on mobile). The old skeleton painted the dial in the
          left column, so the bet widget visibly jumped sides when the page
          resolved — the single most jarring paint on the product's core page. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        {/* Left — content: tipping bar + info + chart */}
        <div className="order-2 lg:order-1 min-w-0 space-y-4" aria-hidden>
          {/* Tipping bar skeleton */}
          <div className="h-2 w-full rounded-full bg-bg-overlay kp-shimmer-track" />

          {/* Info card skeletons */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 96 }}>
              <div className="space-y-2">
                <div className="h-2.5 w-[64px] rounded bg-bg-overlay" />
                <div className="h-4 w-full rounded bg-bg-overlay" />
                <div className="h-3 w-3/4 rounded bg-bg-overlay" />
              </div>
            </div>
          ))}

          {/* Chart skeleton */}
          <div className="rounded-lg border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 180 }}>
            <div className="h-3 w-[96px] rounded bg-bg-overlay mb-3" />
            <div className="h-full w-full rounded bg-bg-overlay/10" />
          </div>
        </div>

        {/* Right — the bet widget (dial), sticky column on desktop, FIRST on mobile.
            The sticky offset MUST match page.tsx's aside (56px header + 16px air). */}
        <div className="order-1 lg:order-2 space-y-3 lg:sticky lg:top-[72px]" aria-hidden>
          <div className="rounded-xl border border-border bg-bg-elevated p-6 kp-shimmer-track" style={{ height: 260 }}>
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-[128px] w-[128px] rounded-full bg-bg-overlay/20" />
              <div className="h-4 w-[80px] rounded bg-bg-overlay/20" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 96 }}>
            <div className="space-y-2">
              <div className="h-2.5 w-[64px] rounded bg-bg-overlay" />
              <div className="h-4 w-full rounded bg-bg-overlay" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
