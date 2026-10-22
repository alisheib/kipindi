"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, GhostLine } from "@/components/maswali/maswali-ghost";
import { BackLinkGhost } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n";

/** The mains a phone's first screens hold. */
const ROWS = [0, 1, 2, 3];

/**
 * /millionea/slip loading skeleton — the slip's own bands (`maswali-slip.tsx`), at the slip's own measure (the form tier's
 * `max-w-form`, and its grid track `var(--w-form)`, as the page's): its head
 * (the title and the two times), the rules strip (the price, the cap), the question rows with their two 44px controls on
 * the controls' own radius (`rounded-control`, never a pill), and the pay control's place — the rail docked full-bleed on
 * the tab bar below 1280 (its meter row, the counts and the control), the panel beside the questions from 1280, standing
 * under the top bar as the page's does (`top-[72px]`). Ali 2026-10-21 10/10 pass (the slip critic's M13, the motion
 * critic's M6): the drawing had no rail and pill-shaped controls, so the page moved under the reader as it arrived.
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` and the journey's root loading state. Wordless but for the screen
 * reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaSlipGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). It names a
          box-less wrapper (`contents`) round EVERY part of the drawing — the back link and the docked rail stand outside the
          busy root — so no bar of it is unnamed; the layout is the page container's, as before. */}
      <div className="contents" data-ghost-page="slip">
        <BackLinkGhost />
        <div className="grid w-full grid-cols-1 items-start gap-7 py-5 xl:grid-cols-[minmax(0,var(--w-form))_400px]" aria-busy="true" data-testid="slip-ghost">
          <div className="flex min-w-0 max-w-form flex-col gap-4" aria-hidden>
            <div className="flex flex-col gap-1.5">
              {/* The title's line box (text-title-lg's 28/34) holding a bar, never words: no display face, so no display stem —
                  the stem corrects a first glyph's ink (r7c 3.9), and a drawing reads no Millionea word at all (maswali-ui 1.3). */}
              <p className="text-title-lg font-bold"><GhostLine className="w-[264px]" /></p>
              <GhostBar className="h-4 w-[220px]" />
              <GhostBar className="h-4 w-[200px]" />
            </div>
            <div className="mat-inset flex flex-col gap-1.5 rounded-control px-3 py-2">
              <GhostBar className="h-4 w-[70%]" />
              <GhostBar className="h-4 w-[55%] xl:hidden" />
            </div>
            {ROWS.map((i) => (
              <div key={i} className="kp-mln-row--main grid grid-cols-[28px_1fr] gap-x-2 gap-y-1.5 border-t border-border py-3 md:grid-cols-[28px_1fr_248px]">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[60%]" />
                  <GhostBar className="h-3 w-[45%] md:hidden" />
                </div>
                <div className="col-start-2 grid grid-cols-2 gap-2 md:col-start-3 md:row-start-1">
                  <div className="h-[var(--h-control-md)] rounded-control bg-bg-overlay kp-shimmer-track" />
                  <div className="h-[var(--h-control-md)] rounded-control bg-bg-overlay kp-shimmer-track" />
                </div>
              </div>
            ))}
          </div>
          <div className="mat-raised sticky top-[72px] hidden h-[480px] rounded-card kp-shimmer-track xl:block" aria-hidden />
        </div>
        {/* The rail's place below 1280, docked where the page's docks (`.kp-mln-rail`), so nothing rises when it arrives. */}
        <div className="kp-mln-rail sticky bottom-[calc(65px+env(safe-area-inset-bottom,0px))] z-30 -mx-3 lg:-mx-6 lg:bottom-0 xl:hidden" aria-hidden>
          <div className="border-t border-border-strong px-3 py-2 shadow-overlay-up lg:px-6" style={{ background: "var(--panel)" }}>
            <div className="flex max-w-form flex-col gap-2">
              <div className="flex h-5 items-center"><GhostBar className="h-[6px] w-full" /></div>
              <div className="flex items-center gap-2">
                <GhostBar className="h-4 min-w-0 flex-1" />
                <div className="h-[var(--h-control-md)] w-[132px] shrink-0 rounded-control bg-bg-overlay kp-shimmer-track" />
              </div>
            </div>
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
