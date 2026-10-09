"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function PerformanceLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* The back link: the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b) — a 20px bar stood here, 24px short. */}
      <BackLinkGhost />

      {/* ⚠️ THE TWO WERE SWAPPED. This skeleton drew the eyebrow "Performance" over the
          headline "Polls you've played"; the real page renders the parent destination as
          the eyebrow and "Performance" as the H1, so the words changed places the instant
          the data arrived. Same pair, same order as `performance/page.tsx`.
          ⭐ DG-P-03 · §K — and it is the KIT now, which is what stops that from recurring: the
          pair cannot be swapped again without swapping it at `performance/page.tsx:125` too,
          because both call the same component with the same prop names. The hand-typed copy
          also had no `mb-1` under the eyebrow, where `PageHeader` does — a 4px gap the page had
          and the skeleton did not. ⛔ NOT wrapped in a `<header>`: the real page renders
          `<PageHeader>` as a direct child of the container, after the BackLink. */}
      <PageHeader eyebrow={t.common.positions} title={t.performance.title} />

      {/* Hero stat card skeleton */}
      <div className="rounded-xl border border-border bg-bg-elevated px-5 py-5 kp-shimmer-track" aria-hidden>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="h-3 w-[64px] rounded bg-bg-overlay" />
            {/* ⚠️ LITERAL, not `h-9` — 64px on the overridden scale (tailwind.config.ts:200-215)
                for a headline stat figure. */}
            <div className="mt-2 h-[36px] w-48 rounded bg-bg-overlay" />
          </div>
          <div>
            <div className="h-3 w-14 rounded bg-bg-overlay" />
            <div className="mt-2 h-7 w-[64px] rounded bg-bg-overlay" />
          </div>
          <div>
            <div className="h-3 w-[80px] rounded bg-bg-overlay" />
            {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — 128px on the overridden scale, wider than
                the stat bar beside it. The h-7 HEIGHT is deliberate (40px stat bar). */}
            <div className="mt-2 h-7 w-[64px] rounded bg-bg-overlay" />
          </div>
        </div>
      </div>

      {/* 2-col stat grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5 kp-shimmer-track"
          >
            <div className="h-3 w-[64px] rounded bg-bg-overlay" />
            <div className="mt-2 h-5 w-[80px] rounded bg-bg-overlay" />
          </div>
        ))}
      </div>

      {/* Streak line skeleton */}
      <div className="h-4 w-40 rounded bg-bg-overlay kp-shimmer-track" aria-hidden />

      {/* Chart skeleton */}
      <div className="rounded-xl glass-panel p-4 lg:p-5 kp-shimmer-track" aria-hidden>
        <div className="h-3 w-[96px] rounded bg-bg-overlay mb-3" />
        <div className="h-[200px] w-full rounded bg-bg-overlay" />
      </div>

      {/* Recent settled skeleton */}
      <div aria-hidden>
        <div className="h-6 w-[128px] rounded bg-bg-overlay mb-3 kp-shimmer-track" />
        <div className="rounded-xl border border-border bg-bg-elevated divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 kp-shimmer-track">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-bg-overlay" />
                <div className="h-3 w-[96px] rounded bg-bg-overlay" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-4 w-[80px] rounded bg-bg-overlay ml-auto" />
                {/* ⚠️ WIDTH IS A LITERAL, not `w-10` — 80px on the overridden scale for a
                    2.5px-tall micro label. */}
                <div className="h-2.5 w-[40px] rounded bg-bg-overlay ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
