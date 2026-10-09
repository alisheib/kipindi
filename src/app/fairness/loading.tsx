"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { GhostText } from "@/components/ui/ghost-kit";
import { keepLastWords } from "@/components/ui/keep-words";
import { I } from "@/components/ui/glyphs";
import { durationHours } from "@/lib/duration-phrase";
import { fill } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** The objection window the lead sentence names — the configuration's default (`market-config.ts`,
 *  `objectionWindowHours`). */
const OBJECTION_WINDOW_HOURS = 1;

/**
 * /fairness opens on its header — the hero with the attestation's own `PageHeader`, then the lead sentence (its words set
 * and not shown, as the page sets them: 15px, relaxed, 68ch, its last two words kept together) — on the page's 32px rung.
 * ⚠️ The page pads 48px from 1024 (`py-6 lg:py-8`, its own container — `test:measure`'s allowlist); this loader stands in
 * `PageContainer`'s 32, so the header band takes the other 16 (`lg:pt-3`) and lands where the page's does.
 * ⚠️ The sentence names the objection window: drawn at the configuration's default, one hour (`market-config.ts`); a
 * longer window is a few characters wider.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function FairnessLoading() {
  const { t, locale } = useT();
  return (
    <PageLoader
      tier="reading"
      rhythm="space-y-6"
      lead={
        <div className="lg:pt-3">
          <header className="space-y-3">
            <PageHero glow="info">
              <PageHeader eyebrow={t.common.resolutionAttestation} title={t.common.howAMarketResolves} tone="info" icon={<I.shieldcheck s={18} />} />
            </PageHero>
            <p className="text-[15px] leading-relaxed max-w-[68ch]" aria-hidden>
              <GhostText>{keepLastWords(fill(t.common.fairnessIntro, { hours: durationHours(locale, OBJECTION_WINDOW_HOURS) }))}</GhostText>
            </p>
          </header>
        </div>
      }
    />
  );
}
