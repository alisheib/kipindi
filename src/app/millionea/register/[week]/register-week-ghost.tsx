"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, GhostLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/register/[week] loading skeleton — the week page's own bands (`page.tsx`), in its order: the back link's box;
 * the head with its state chip and code under the title (S5 VIS R4), its facts and its times (the critic's M1); the
 * ledger's card at the receipt's measure (M4); the commitments' titled card (M12); the questions' heading and the first
 * questions as the page draws them — a ticket's clause on a card below 1024 (category, question, criterion, event and
 * source, outcome), the six-column table on its panel from 1024 (R1, L18). Wordless but for the screen reader's "loading"
 * (`maswali-ghost.tsx`).
 */
export function MillioneaRegisterWeekGhost() {
  const { t } = useT();
  const H2 = <span className="font-display text-title-sm font-bold"><GhostLine className="w-[160px]" /></span>;
  return (
    <PageContainer tier="reading">
      {/* `data-ghost-page`: which page's drawing this is, for `qa:millionea-ghost-hops` (a hop shows only its own). */}
      <div className="flex flex-col gap-6" aria-busy="true" data-ghost-page="week">
        <BackLinkGhost />
        <div className="flex flex-col gap-2">
          <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[132px]" />
          <div className="flex items-center gap-3" aria-hidden>
            <GhostBar className="h-[23px] w-[96px] rounded-pill" />
            <GhostBar className="h-3 w-[112px]" />
          </div>
          <GhostBar className="h-4 w-[70%] max-w-[420px]" />
          <GhostBar className="h-3 w-[60%] max-w-[360px]" />
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {H2}
          <div className="mat-flat flex max-w-receipt flex-col gap-2.5 rounded-card p-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={i === 2 ? "mt-3 flex items-center justify-between gap-3" : "flex items-center justify-between gap-3"}>
                <GhostBar className="h-4 w-[45%]" />
                <GhostBar className="h-4 w-[96px]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {H2}
          <div className="mat-flat flex max-w-receipt flex-col gap-4 rounded-card p-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <GhostBar className="h-3 w-[140px]" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-3 w-[55%]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {H2}
          <div className="flex max-w-receipt flex-col lg:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-2 border-t border-border px-1 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-3 w-[72px]" />
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[85%]" />
                  <GhostBar className="h-3 w-[60%]" />
                  <GhostBar className="h-5 w-[64px] rounded-pill" />
                </div>
              </div>
            ))}
          </div>
          <div className="glass-panel hidden flex-col lg:flex">
            <GhostBar className="h-[36px] w-full" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)_96px_120px_120px_140px] gap-x-8 border-b border-border px-5 py-3">
                <GhostBar className="h-4 w-4" />
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-4 w-full" />
                  <GhostBar className="h-3 w-[80%]" />
                  <GhostBar className="h-3 w-[72px]" />
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
