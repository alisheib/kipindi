"use client";

import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, GhostCard } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";

/** The clauses a phone's first screen holds. */
const CLAUSES = [0, 1, 2, 3];

/**
 * /millionea/tickets/[serial] loading skeleton — the ticket's own bands (`maswali-ticket.tsx`) in the receipt tier: the
 * back link's box, then the document — the state chip and the week, the serial, the Seal Line's rule-bounded row, the
 * clauses. ONE DRAWING, TWO READERS: this route's `loading.tsx` and the journey's root loading state. Wordless but for
 * the screen reader's "loading".
 */
export function MillioneaTicketGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="receipt" className="space-y-5">
      <BackLinkGhost />
      <GhostCard className="flex flex-col gap-3 px-3 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <GhostBar className="h-[23px] w-[112px] rounded-pill" />
          <GhostBar className="h-3 w-[96px]" />
        </div>
        <GhostBar className="h-6 w-[220px] max-w-full" />
        <div className="border-y border-border py-2">
          <GhostBar className="h-[44px] w-full" />
        </div>
        {CLAUSES.map((i) => (
          <div key={i} className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-1 border-t border-border py-2">
            <GhostBar className="h-4 w-4" />
            <div className="flex flex-col gap-1">
              <GhostBar className="h-3 w-[96px]" />
              <GhostBar className="h-4 w-full" />
              <GhostBar className="h-4 w-[60%]" />
            </div>
          </div>
        ))}
      </GhostCard>
      <span className="sr-only">{t.common.loading}</span>
    </PageContainer>
  );
}
