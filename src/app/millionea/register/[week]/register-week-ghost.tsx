"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/register/[week] loading skeleton — the week page's own bands (`page.tsx`): the back link's box, the head, the
 * commitments block and the first question rows. Its words are set and not shown (`maswali-ghost.tsx`).
 */
export function MillioneaRegisterWeekGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <BackLinkGhost />
        <MaswaliGhostHead eyebrow={t.millionea.registerTitle} title={`${t.millionea.registerTitle} · ${t.millionea.weekStatusSettled}`} />
        <div className="mat-flat flex flex-col gap-2 rounded-card p-3" aria-hidden>
          <GhostBar className="h-3 w-[200px]" />
          <GhostBar className="h-4 w-full" />
          <GhostBar className="h-3 w-[180px]" />
          <GhostBar className="h-4 w-full" />
        </div>
        <div className="flex flex-col" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1.5 border-t border-border py-3">
              <GhostBar className="h-4 w-4" />
              <div className="flex flex-col gap-1.5">
                <GhostBar className="h-3 w-[72px]" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-3 w-[60%]" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
