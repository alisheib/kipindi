"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n";

/**
 * /help opens on its hero — the page's own `PageHeader` in the info `PageHero` — on the page's 24px rung.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function HelpLoading() {
  const { t } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-5"
      lead={
        <PageHero glow="info">
          <PageHeader tone="info" eyebrow={t.help.pageTitle} title={t.help.heading} />
        </PageHero>
      }
    />
  );
}
