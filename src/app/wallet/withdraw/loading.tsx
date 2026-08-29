import { BrandSpinner } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

export default async function WithdrawLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="form">
      <header className="mb-6">
        <p className="font-mono text-caption uppercase tracking-[0.16em] font-bold text-text-subtle">{t.wallet.withdrawTitle}</p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.common.loading}</h1>
      </header>
      <div className="grid place-items-center py-20 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
    </PageContainer>
  );
}
