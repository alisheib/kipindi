"use client";

import { PageContainer } from "@/components/layout/page-container";
import { GhostBar, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/**
 * /millionea/register loading skeleton — the index's own bands (`page.tsx`): its head and the week rows, each the row's
 * own height. Wordless but for the screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaRegisterGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[208px]" />
        <div className="flex flex-col" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col justify-center gap-1.5 border-b border-border py-3" style={{ minHeight: "var(--h-control-lg)" }}>
              <GhostBar className="h-3 w-[120px]" />
              <GhostBar className="h-4 w-[60%]" />
            </div>
          ))}
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
