"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar } from "@/components/maswali/maswali-ghost";
import { GhostText } from "@/components/ui/ghost-text";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";

/** The mains a phone's first screens hold. */
const ROWS = [0, 1, 2, 3];

/**
 * /millionea/slip loading skeleton — the slip's own bands (`maswali-slip.tsx`): its head (the title and the two times),
 * the three-line rules strip, the question rows with their two 44px controls, and the sticky rail on the tab bar below
 * 1280 (the panel beside the questions from 1280). ONE DRAWING, TWO READERS: this route's `loading.tsx` and the journey's
 * root loading state. Its words are set and not shown (`maswali-ghost.tsx`).
 */
export function MillioneaSlipGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="grid w-full grid-cols-1 items-start gap-7 py-5 xl:grid-cols-[minmax(0,640px)_400px]" aria-busy="true">
        <div className="flex min-w-0 flex-col gap-4" aria-hidden>
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-title-lg font-bold"><GhostText>{fill(t.millionea.slipTitle, { week: 42 })}</GhostText></p>
            <GhostBar className="h-4 w-[220px]" />
            <GhostBar className="h-4 w-[200px]" />
          </div>
          <div className="mat-inset flex flex-col gap-1.5 rounded-control px-3 py-2">
            <GhostBar className="h-4 w-full" />
            <GhostBar className="h-4 w-[70%]" />
            <GhostBar className="h-4 w-[40%]" />
          </div>
          {ROWS.map((i) => (
            <div key={i} className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-1.5 border-t border-border py-3 md:grid-cols-[28px_1fr_248px]">
              <GhostBar className="h-4 w-4" />
              <div className="flex flex-col gap-1">
                <GhostBar className="h-3 w-[72px]" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-3 w-[60%]" />
              </div>
              <div className="col-start-2 grid grid-cols-2 gap-2 md:col-start-3 md:row-start-1">
                <div className="h-[var(--h-control-md)] rounded-pill bg-bg-overlay kp-shimmer-track" />
                <div className="h-[var(--h-control-md)] rounded-pill bg-bg-overlay kp-shimmer-track" />
              </div>
            </div>
          ))}
        </div>
        <div className="mat-raised sticky top-5 hidden h-[480px] rounded-card kp-shimmer-track xl:block" aria-hidden />
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </PageContainer>
  );
}
