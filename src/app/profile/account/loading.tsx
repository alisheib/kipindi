"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /profile/account opens on its back link and its hero (the page's own `PageHeader`), on the page's 24px rung. The
 * back link's words follow `?back=` on the page; its ghost is the link's 44px box, whatever it says.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader icon={<I.user s={14} />} eyebrow={t.profile.myAccount} title={t.profile.myAccount} />
          </PageHero>
        </>
      }
    />
  );
}
