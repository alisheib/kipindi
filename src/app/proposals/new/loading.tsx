"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { StatusFlag } from "@/components/ui/status-flag";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /proposals/new opens on its back link and its hero — the page's own `PageHeader` (the trophy, 18px) over the
 * programme's state flag — on the page's 24px rung. Drawn for the programme's default state, COMING_SOON
 * (`proposals-config.ts`): the flag's box (`ComingSoonBadge`, its words not shown).
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero>
            <div className="flex flex-col items-start gap-2">
              <PageHeader eyebrow={t.common.submitProposal} title={t.common.suggestMarket} icon={<I.trophy s={18} />} />
              <StatusFlag label={t.proposals.comingSoonTag} glyph="clock" size="sm" className="cs-badge" style={{ color: "transparent" }} />
            </div>
          </PageHero>
        </>
      }
    />
  );
}
