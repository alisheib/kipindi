"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, GhostCard, GhostLine, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/how loading skeleton — the page's own bands (`page.tsx`), in its order (the critic's L12, L15): its head; the
 * four numbered steps at /fairness's reading measure; the week's timeline under its heading; the examples' heading and
 * the swap's card at the receipt's measure (its title, the line of sockets, the caption, the button). Wordless but for the
 * screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaHowGhost() {
  const { t } = useT();
  const H2 = <span className="font-display text-title-sm font-bold"><GhostLine className="w-[176px]" /></span>;
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[176px]" />
        <div className="flex max-w-[68ch] flex-col gap-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[24px_1fr] gap-2">
              <GhostBar className="h-4 w-3" />
              <div className="flex flex-col gap-1.5">
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-[70%]" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          {H2}
          <GhostCard className="h-[132px]" />
        </div>
        <div className="flex flex-col gap-3" aria-hidden>
          {H2}
          <GhostCard className="flex max-w-receipt flex-col gap-3 p-3">
            <GhostBar className="h-5 w-[180px]" />
            <GhostBar className="h-6 w-full" />
            <GhostBar className="h-4 w-[60%]" />
            <GhostBar className="h-3 w-full" />
            <GhostBar className="h-3 w-[80%]" />
            <GhostBar className="h-[var(--h-control-md)] w-[160px] rounded-control" />
          </GhostCard>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
