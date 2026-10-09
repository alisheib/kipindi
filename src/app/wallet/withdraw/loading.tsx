"use client";

import { BrandSpinner } from "@/components/brand";
import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { PageHero } from "@/components/ui/page-hero";
import { I } from "@/components/ui/glyphs";

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function WithdrawLoading() {
  const { t } = useT();
  /* ⭐ DG-P-04 · §S1 — see the note on `wallet/deposit/loading.tsx`. Same defect, same 8px:
     `mb-6` (32) typed onto one child against `page.tsx`'s container `space-y-5` (24). */
  return (
    <PageContainer tier="form" className="space-y-5">
      {/* 🔴 DG-P-03 · §L1 · §K — same defect as `wallet/deposit/loading.tsx`, same money-form
          stakes: the h1 read **"Loading"** while `page.tsx:106` names the page
          "Move funds out", and the hand-typed h1 was missing the `leading-tight
          tracking-[-0.02em]` `PageHeader` carries. It now renders the page's own components
          with the page's own props — BackLink ghost, `PageHero` with the page's
          `contentClassName`, `PageHeader` (plain since 2026-10-07, §M3a D1 / §B2a).
          ⚠️ The page's hero also holds an "Available" balance block on the right, which a
          skeleton must NOT draw: it would be a number a player could read as their balance
          before one has been fetched (§C — the interface never states a money fact it does not
          have). The hero renders one child here and two there; that asymmetry is deliberate. */}
      {/* The back link: the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b) — a 20px bar stood here, 24px short. */}
      <BackLinkGhost />

      <PageHero contentClassName="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
        <PageHeader
          icon={<I.arrowUpFromLine s={14} className="text-text-subtle" />}
          eyebrow={t.wallet.withdrawTitle}
          title={t.wallet.moveFundsOut}
          subtitle={t.wallet.mobileMoneyOnly}
        />
      </PageHero>
      <div className="grid place-items-center py-10 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
    </PageContainer>
  );
}
