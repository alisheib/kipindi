"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { StatusFlag } from "@/components/ui/status-flag";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /proposals opens on its hero — the page's own `PageHeader` (the trophy, 18px) over the programme's state flag, in the
 * hero's own content box — on the page's 32px rung. Drawn for the programme's default state, COMING_SOON
 * (`proposals-config.ts`): the flag's box (`ComingSoonBadge`, its words not shown) and no Create button, which the page
 * draws only while proposals are open.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-6"
      lead={
        <PageHero contentClassName="relative z-10 p-5 lg:p-6 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col items-start gap-2">
            <PageHeader icon={<I.trophy s={18} />} eyebrow={t.proposals.title} title={t.proposals.voteForMarkets} />
            <StatusFlag label={t.proposals.comingSoonTag} glyph="clock" size="sm" className="cs-badge" style={{ color: "transparent" }} />
          </div>
        </PageHero>
      }
    />
  );
}
