"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText } from "@/components/ui/ghost-text";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /profile/sessions opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not
 * shown) — on the page's 24px rung.
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
            <PageHeader tone="info" icon={<I.device s={14} className="text-info-fg" />} eyebrow={t.profile.activeSessions} title={t.profile.activeSessions} />
            <p className="mt-1 text-[13px]" aria-hidden>
              <GhostText>{t.profile.sessionsDescription}</GhostText>
            </p>
          </PageHero>
        </>
      }
    />
  );
}
