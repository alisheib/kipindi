import { BrandSpinner } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

export default async function WithdrawLoading() {
  const { t } = await getServerT();
  /* ⭐ DG-P-04 · §S1 — see the note on `wallet/deposit/loading.tsx`. Same defect, same 8px:
     `mb-6` (32) typed onto one child against `page.tsx`'s container `space-y-5` (24). */
  return (
    <PageContainer tier="form" className="space-y-5">
      <header>
        <p className="font-mono text-caption uppercase tracking-[0.16em] font-bold text-text-subtle">{t.wallet.withdrawTitle}</p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.common.loading}</h1>
      </header>
      <div className="grid place-items-center py-20 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
    </PageContainer>
  );
}
