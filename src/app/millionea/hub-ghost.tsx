"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, GhostCard, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/** The fifteen questions' rows, as many as a phone's first screens hold. */
const ROWS = [0, 1, 2, 3, 4, 5];

/**
 * /millionea loading skeleton — the hub's own bands in its own order (`page.tsx`): the head, the week strip, the pool
 * block and the buy block (on the right and sticky from 1280), then the questions. ONE DRAWING, TWO READERS: this route's
 * `loading.tsx` renders it, and the journey's root loading state draws it on a move to /millionea (`route-ghost.tsx`).
 * Client code, wordless but for the screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaHubGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <MaswaliGhostHead eyebrowWidth="w-[128px]" titleWidth="w-[248px]" />
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,640px)_400px] xl:gap-8" aria-hidden>
          <div className="flex flex-col gap-2 xl:col-start-1">
            <GhostBar className="h-4 w-[240px] max-w-full" />
            <GhostBar className="h-4 w-[208px] max-w-full" />
            <GhostBar className="h-4 w-[224px] max-w-full" />
          </div>
          <div className="flex flex-col gap-4 xl:col-start-2 xl:row-span-3 xl:row-start-1">
            <GhostCard className="h-[320px]" />
            <div className="h-[var(--h-control-lg)] w-full rounded-pill bg-bg-overlay kp-shimmer-track" />
            <GhostBar className="h-4 w-[180px]" />
          </div>
          <div className="flex flex-col xl:col-start-1">
            <GhostBar className="mb-3 h-6 w-[200px]" />
            {ROWS.map((i) => (
              <div key={i} className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1.5 border-t border-border py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[136px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
