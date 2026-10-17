"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { GhostCard, MaswaliGhostHead } from "@/components/maswali/maswali-ghost";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_ALONE_CLASS } from "@/components/ui/query-bar";
import { useT } from "@/lib/i18n";

/** The four lenses, at widths near their labels'. */
const LENS_WIDTHS = ["w-[64px]", "w-[56px]", "w-[112px]", "w-[104px]"];

/**
 * /millionea/tickets loading skeleton — the list's own bands (`page.tsx`): the head, the four lenses on the query bar's own
 * classes, and the ticket cards in the list's grid (one column, two from 768). ONE DRAWING, TWO READERS: this route's
 * `loading.tsx` draws it for a classic reader with the page's own head, and the journey's root loading state draws it with
 * Tiketi zangu's head (`journeyHead`, handed in, so this module loads nothing of the journey's — `history-ghost.tsx`'s
 * pattern). Wordless but for the screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaTicketsGhost({ journeyHead }: { journeyHead?: ReactNode }) {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {journeyHead ?? <MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[224px]" />}
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_ALONE_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {LENS_WIDTHS.map((w, i) => <div key={i} className={`h-[44px] ${w} shrink-0 rounded-pill bg-bg-overlay`} />)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => <GhostCard key={i} className="h-[216px]" />)}
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </PageContainer>
  );
}
