"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { Words } from "@/components/ui/ghost-kit";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

/**
 * /profile/responsible-gambling opens on its back link and its hero — the page's own `PageHeader` and its sentence (set
 * and not shown, in the page's type and measure, balanced as the page balances it) — on the page's 24px rung. Drawn for a
 * player with no break running (the page shows a running break's notice above the hero); every RG notice, the helpline
 * and the limit controls are the page's, drawn only when it lands.
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
            <PageHeader tone="info" icon={<I.shieldcheck s={14} />} eyebrow={t.rg.playerProtection} title={t.profile.responsibleGambling} />
            <p className="mt-2 text-[13px] leading-snug max-w-prose text-balance" aria-hidden>
              <Words>{t.rg.pageDescription}</Words>
            </p>
          </PageHero>
        </>
      }
    />
  );
}
