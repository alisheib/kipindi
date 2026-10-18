"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, GhostCard, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/how loading skeleton — the page's own bands (`page.tsx`): its head, the four numbered sentences, the example
 * card and the first worked ledger. Wordless but for the screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaHowGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[176px]" />
        <div className="flex flex-col gap-3" aria-hidden>
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
        <GhostCard className="h-[200px]" />
        <GhostCard className="h-[180px]" />
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
