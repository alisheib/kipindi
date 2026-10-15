"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { GhostText } from "@/components/ui/ghost-text";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/** The result is unknown while its owned read loads; the ghost never paints a paid or failed verdict. */
export default function DepositWaitLoading() {
  return <DepositWaitGhost />;
}

export function DepositWaitGhost() {
  const { t } = useT();
  return <PageContainer tier="receipt" className="space-y-5 pb-16">
    <div aria-hidden><PageHero><PageHeader icon={<I.clock s={14} className="text-transparent" />}
      eyebrow={<GhostText>{t.journey.depositWaitEyebrow}</GhostText>}
      title={<GhostText>{t.wallet.returnPendingTitle}</GhostText>}
      subtitle={<GhostText>{t.wallet.returnPendingBody}</GhostText>} /></PageHero></div>
    <div className="rounded-xl glass-panel divide-y divide-border" aria-hidden>
      <div className="h-[48px] bg-bg-inset kp-shimmer-track" />
      <div className="h-[48px] bg-bg-inset kp-shimmer-track" />
    </div>
    <div className="h-[var(--h-control-lg)] rounded-pill bg-bg-overlay kp-shimmer-track" aria-hidden />
  </PageContainer>;
}
