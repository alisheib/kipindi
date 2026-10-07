import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { I } from "@/components/ui/glyphs";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";

/**
 * The Receipts page while it loads (2026-10-07). ⭐ THE SAME TIER AND THE SAME SHAPE as the page (B7 rule 3 — the page and
 * its skeleton state one width), so nothing jumps when the list lands: the real header with its real words, the bar's
 * two rows in the bar's OWN classes (imported, never retyped — `positions/loading.tsx`'s rule; a single 44px block
 * stood in for a two-row bar until the design review of 2026-10-07 measured the 70–90px jump), and rows with the row's
 * own anatomy — two lines (type · method and amount; date and chip), the plate from `sm` up.
 * ⚠️ Sizes are LITERALS (`h-[40px]`), never the overridden spacing keys (`h-10` paints 80px here).
 */
export default async function ReceiptsLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-5">
      <div className="h-[44px] w-[120px] rounded-control bg-bg-overlay kp-shimmer-track" aria-hidden />
      <PageHeader tone="info" icon={<I.receipt s={22} />} eyebrow={t.wallet.title} title={t.receipts.title} subtitle={t.receipts.subtitle} />
      <div className={QUERY_BAR_CLASS} aria-hidden>
        {/* Row 1 — the three lenses (their own line below lg), then the result count. */}
        <div className={`${QUERY_BAR_ROW1_CLASS} flex-wrap justify-end gap-y-1 lg:flex-nowrap`}>
          <div className="flex basis-full items-center gap-1 lg:flex-1">
            {[56, 92, 112].map((w, i) => (
              <div key={i} className="h-[44px] shrink-0 rounded-pill bg-bg-overlay kp-shimmer-track" style={{ width: w }} />
            ))}
          </div>
          <div className="h-3 w-[80px] shrink-0 rounded bg-bg-overlay" />
        </div>
        {/* Row 2 — one Filters button on a phone; the status and date groups along the bar from lg. */}
        <div className={QUERY_BAR_ROW2_CLASS}>
          <div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden" />
          <div className="hidden items-center gap-1 lg:flex">
            {[44, 64, 72, 84, 58, 60, 64, 52, 60, 56, 64, 48].map((w, i) => (
              <div key={i} className="h-[44px] shrink-0 rounded-pill bg-bg-overlay kp-shimmer-track" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl glass-panel overflow-hidden" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 lg:px-4">
            <div className="hidden h-[40px] w-[40px] shrink-0 rounded-control bg-bg-overlay kp-shimmer-track sm:block" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="h-[14px] w-[150px] max-w-full rounded bg-bg-overlay kp-shimmer-track" />
                <div className="h-[16px] w-[88px] shrink-0 rounded bg-bg-overlay kp-shimmer-track" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="h-[12px] w-[104px] rounded bg-bg-overlay/70 kp-shimmer-track" />
                <div className="h-[22px] w-[88px] rounded-pill bg-bg-overlay/60 kp-shimmer-track" />
              </div>
            </div>
            <div className="h-[16px] w-[16px] shrink-0 rounded bg-bg-overlay/60" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
