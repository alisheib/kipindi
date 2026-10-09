"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText } from "@/components/ui/ghost-text";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /profile/source-of-funds opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and
 * not shown, in the page's type and measure) — on the page's 24px rung.
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
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.fileSignature s={14} className="text-info-fg" />} eyebrow="AML" title={t.profile.sourceOfFunds} />
            <p className="mt-2 text-[13px] leading-snug max-w-prose" aria-hidden>
              <GhostText>{t.profile.sofDescription}</GhostText>
            </p>
          </PageHero>
        </>
      }
    />
  );
}
