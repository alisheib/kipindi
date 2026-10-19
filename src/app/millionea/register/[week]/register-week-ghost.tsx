"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, GhostLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/register/[week] loading skeleton — the week page's own bands (`page.tsx`): the back link's box, the head with
 * its state chip under the title (S5 VIS R4), the commitments block, the questions' heading, and the first questions as
 * the page draws them — cards below 1024, the table from 1024 (R1). Wordless but for the screen reader's "loading"
 * (`maswali-ghost.tsx`).
 */
export function MillioneaRegisterWeekGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <BackLinkGhost />
        <div className="flex flex-col gap-2">
          <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[132px]" />
          <GhostBar className="h-[23px] w-[96px] rounded-pill" />
        </div>
        <div className="mat-flat flex flex-col gap-3 rounded-card p-3" aria-hidden>
          <div className="flex flex-col gap-1.5">
            <GhostBar className="h-3 w-[240px] max-w-full" />
            <GhostBar className="h-4 w-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <GhostBar className="h-3 w-[200px] max-w-full" />
            <GhostBar className="h-4 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          <span className="font-display text-title-sm font-bold"><GhostLine className="w-[200px]" /></span>
          <div className="flex flex-col lg:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 border-t border-border px-1 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                  {[0, 1, 2, 3, 4].map((f) => (
                    <div key={f} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                      <GhostBar className="h-3 w-[56px]" />
                      <GhostBar className="h-3 w-[60%]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden flex-col lg:flex">
            <GhostBar className="h-[36px] w-full" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)_96px_120px_120px_140px] gap-x-8 border-b border-border px-5 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                </div>
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-5 w-[64px]" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
