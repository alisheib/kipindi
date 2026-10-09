"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { ChipGhost, GhostText } from "@/components/ui/ghost-kit";
import { formatEatDay } from "@/lib/eat-day";
import { fill } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * /agent/status — the back link, the page's own `PageHeader` (eyebrow and title), then the application's two panels as
 * the page draws them (round 5's follow-up, R5-L): "where you are" — the reference's eyebrow and its id beside the status
 * chip, the date it was submitted — and "what happens next", its title and two terms.
 *
 * 🔴 THE HEADER WAS A 32px BAR AND THE PANELS WERE ANY PANELS (R5-H's audit). The page opens on `PageHeader` (a 15px
 * eyebrow, 4px, the 35px title: 54px), so the ghost's bar (`h-6`, 32px on this scale) stood 22px short and every panel
 * under it landed 22px lower than promised (57 at 320 in Swahili, where the title takes two lines); and both panels were
 * one title bar over two lines, where the page's first is a two-line block beside a chip and a date, and its second a
 * title over two bulleted terms. Every band here is the page's own box with the page's own
 * words, set and not shown (`GhostText`), so it wraps where the page's does in every language.
 * ⚠️ THE APPLICATION DRAWN IS ONE UNDER REVIEW — the state the form's "submitted" dialog sends an applicant here in: its
 * chip, its submitted date, the review term and the decision term; no button (the page shows "continue" only to an
 * application still in progress). A decided application reads its own panel.
 */

/** An application's reference: `agp_` and ten characters (`agent-application-service.ts`). */
const REFERENCE = "agp_0000000000";

export default function AgentStatusLoading() {
  const { t, locale } = useT();
  const date = formatEatDay("2026-09-28", t.common.monthsShort, locale);
  return (
    <PageContainer tier="reading" className="space-y-5" aria-busy="true">
      <BackLinkGhost />
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />

      {/* Where you are — the reference beside the status chip, then the submitted date. */}
      <section className="rounded-xl glass-panel p-4 space-y-3 text-transparent" aria-hidden>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-micro uppercase eyebrow font-bold"><GhostText>{t.agent.statusReference}</GhostText></p>
            <p className="font-mono text-body-sm break-all"><GhostText>{REFERENCE}</GhostText></p>
          </div>
          <ChipGhost metrics="status">{t.agent.statusUnderReview}</ChipGhost>
        </div>
        <p className="text-body-sm"><GhostText>{fill(t.agent.submittedOn, { date })}</GhostText></p>
      </section>

      {/* What happens next — its title and the two terms. */}
      <section className="rounded-xl glass-panel p-4 space-y-2 text-transparent" aria-hidden>
        <p className="font-display text-title-sm font-bold leading-tight"><GhostText>{t.agent.nextTitle}</GhostText></p>
        <ul className="space-y-1.5 text-body-sm leading-snug list-disc pl-4">
          <li><GhostText>{fill(t.agent.nextReview, { days: "0" })}</GhostText></li>
          <li><GhostText>{t.agent.nextDecision}</GhostText></li>
        </ul>
      </section>
    </PageContainer>
  );
}
