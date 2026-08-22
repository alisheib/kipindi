import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

export default async function MarketDetailLoading() {
  const { t } = await getServerT();
  // Width MUST match markets/[id]/page.tsx (1080). It was 1100, so every navigation
  // to a market detail page reflowed by 20px the moment the real page took over.
  return (
    <PageContainer tier="reading" className="space-y-5">
      {/* Back link skeleton */}
      <div className="h-3 w-16 rounded bg-bg-overlay kp-shimmer-track" aria-hidden />

      {/* Header skeleton */}
      <header className="space-y-2" aria-hidden>
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-pill bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — spacing is overridden
              (tailwind.config.ts:200-215) so `w-12` is 128px, twice any real chip. */}
          <div className="h-5 w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" />
        </div>
        <div className="h-7 rounded bg-bg-overlay kp-shimmer-track" style={{ width: "min(620px, 90%)" }} />
        <div className="h-5 w-48 rounded bg-bg-overlay kp-shimmer-track" />
      </header>

      {/* B-29 / V-2 — mirror the REAL layout: content LEFT, bet widget RIGHT
          (and widget FIRST on mobile). The old skeleton painted the dial in the
          left column, so the bet widget visibly jumped sides when the page
          resolved — the single most jarring paint on the product's core page. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        {/* Left — content: tipping bar + info + chart */}
        <div className="order-2 lg:order-1 min-w-0 space-y-4" aria-hidden>
          {/* Tipping bar skeleton */}
          <div className="h-2 w-full rounded-full bg-bg-overlay kp-shimmer-track" />

          {/* Info card skeletons */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 96 }}>
              <div className="space-y-2">
                <div className="h-2.5 w-16 rounded bg-bg-overlay" />
                <div className="h-4 w-full rounded bg-bg-overlay" />
                <div className="h-3 w-3/4 rounded bg-bg-overlay" />
              </div>
            </div>
          ))}

          {/* Chart skeleton */}
          <div className="rounded-lg border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 180 }}>
            <div className="h-3 w-24 rounded bg-bg-overlay mb-3" />
            <div className="h-full w-full rounded bg-bg-overlay/10" />
          </div>
        </div>

        {/* Right — the bet widget (dial), sticky column on desktop, FIRST on mobile */}
        <div className="order-1 lg:order-2 space-y-3 lg:sticky lg:top-6" aria-hidden>
          <div className="rounded-xl border border-border bg-bg-elevated p-6 kp-shimmer-track" style={{ height: 260 }}>
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="h-32 w-32 rounded-full bg-bg-overlay/20" />
              <div className="h-4 w-20 rounded bg-bg-overlay/20" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: 96 }}>
            <div className="space-y-2">
              <div className="h-2.5 w-16 rounded bg-bg-overlay" />
              <div className="h-4 w-full rounded bg-bg-overlay" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
