"use client";

import { PageLoader } from "@/components/ui/page-loader";
import { PageHero } from "@/components/ui/page-hero";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText } from "@/components/ui/ghost-text";
import { I } from "@/components/ui/glyphs";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { durationHours } from "@/lib/duration-phrase";
import { useT } from "@/lib/i18n";

/**
 * /profile/kyc opens on its back link and its hero — the page's own `PageHeader` and its sentence (set and not shown,
 * in the page's type and measure) — on the page's 24px rung. The hero is the unverified player's ("Verify your identity"
 * and its review-time sentence), the reader this page is for; a pending, approved or refused account reads its own.
 * ⛔ THE TITLE IS SET AND NOT SHOWN (2026-10-09, after round 6's C13): it states the reader's verification — "Verify your
 * identity", "Your identity is verified", "We couldn't verify you" — which this drawing cannot know, and a verified
 * player read "Verify your identity" until the page arrived. It keeps the unverified title's width (the case drawn); the
 * eyebrow, the page's name in every state, stays shown.
 * The generic body below — `components/ui/page-loader.tsx` has the rule (R5-L): a loader opens on its page's own opening
 * bands, in the page's rhythm, and its spinner panel stands where the page's first band of data begins.
 */
export default function Loading() {
  const { t, locale } = useT();
  return (
    <PageLoader
      tier="form"
      rows={4}
      rhythm="space-y-5"
      lead={
        <>
          <BackLinkGhost />
          <PageHero glow="info">
            <PageHeader tone="info" icon={<I.shieldcheck s={14} />} eyebrow={t.profile.kycIdentityVerification} title={<GhostText>{t.profile.verifyIdentity}</GhostText>} />
            <p className={`mt-2 text-[13px] leading-snug max-w-prose text-balance ${locale === "zh" ? "break-keep [overflow-wrap:anywhere]" : ""}`} aria-hidden>
              <GhostText>{t.profile.verifyBody.replace("{hours}", durationHours(locale, KYC_REVIEW_SLA_HOURS))}</GhostText>
            </p>
          </PageHero>
        </>
      }
    />
  );
}
