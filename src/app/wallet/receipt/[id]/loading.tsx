import { PageContainer } from "@/components/layout/page-container";
import { getServerT } from "@/lib/i18n-server";

/**
 * Receipt skeleton (POLISH-BACKLOG §1.9).
 *
 * This route does a DB read before it can paint, and it is the single screen
 * where a player is most anxious about their money — "did my withdrawal
 * actually go through?". With no `loading.tsx`, that wait was a blank page.
 *
 * States `receipt`, the SAME tier the page states (B7 rule 3). The Up & Down
 * round shipped a 1080 skeleton in front of a 1232 page — a 152px jump on every
 * load that nothing could see; `test:measure` now asserts the pair agrees.
 */
export default async function ReceiptLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="receipt" className="space-y-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">
        {t.wallet.receiptEyebrow}
      </p>
      <div className="rounded-card border border-border bg-bg-elevated p-5 space-y-4 kp-shimmer-track">
        <div className="h-3 w-24 rounded bg-bg-overlay" />
        <div className="h-9 w-40 rounded bg-bg-overlay" />
        <div className="h-px w-full bg-border" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-3 w-24 rounded bg-bg-overlay" />
            <div className="h-3 w-28 rounded bg-bg-overlay" />
          </div>
        ))}
      </div>
      <div className="h-10 w-full rounded-control bg-bg-overlay kp-shimmer-track" />
    </PageContainer>
  );
}
