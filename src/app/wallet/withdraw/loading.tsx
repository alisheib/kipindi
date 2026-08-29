import { BrandSpinner } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { I } from "@/components/ui/glyphs";

export default async function WithdrawLoading() {
  const { t } = await getServerT();
  /* ⭐ DG-P-04 · §S1 — see the note on `wallet/deposit/loading.tsx`. Same defect, same 8px:
     `mb-6` (32) typed onto one child against `page.tsx`'s container `space-y-5` (24). */
  return (
    <PageContainer tier="form" className="space-y-5">
      {/* 🔴 DG-P-03 · §L1 · §K — same defect as `wallet/deposit/loading.tsx`, same money-form
          stakes: the h1 read **"Loading"** while `page.tsx:106` names the page
          "Move funds out", and the hand-typed h1 was missing the `leading-tight
          tracking-[-0.02em]` `PageHeader` carries. It now renders the page's own components
          with the page's own props — BackLink ghost, `PageHero glow="rose"` with the page's
          `contentClassName`, `PageHeader tone="gold"`.
          ⚠️ The page's hero also holds an "Available" balance block on the right, which a
          skeleton must NOT draw: it would be a number a player could read as their balance
          before one has been fetched (§C — the interface never states a money fact it does not
          have). The hero renders one child here and two there; that asymmetry is deliberate. */}
      {/* WIDTH IS A LITERAL, not `w-16` — the Tailwind spacing scale is OVERRIDDEN and
          INVERTS at the keys it does not cover: `w-16` is stock 64px while `w-12` is an
          overridden 128px, so the bigger number paints the smaller box. `test:spacing-scale`
          derives that forbidden set from the two scales and ratchets it. Same 64px, on a key
          that cannot invert. */}
      <div className="h-4 w-[64px] rounded bg-bg-overlay kp-shimmer-track" aria-hidden />

      <PageHero glow="rose" contentClassName="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
        <PageHeader
          tone="gold"
          icon={<I.arrowUpFromLine s={14} className="text-gold-300" />}
          eyebrow={t.wallet.withdrawTitle}
          title={t.wallet.moveFundsOut}
          subtitle={t.wallet.mobileMoney}
        />
      </PageHero>
      <div className="grid place-items-center py-20 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
    </PageContainer>
  );
}
