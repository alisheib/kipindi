import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

export default async function PositionsLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* Same three strings, in the same order, as the real header — a skeleton that
          names the page differently is a second name for one destination (§L1), and the
          subtitle is drawn here too so the tab rail below does not jump when data lands. */}
      <header>
        <p className="mb-1 font-mono text-caption uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.positions}</p>
        <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.positions.headline}</h1>
        <p className="mt-1 text-[13px] italic text-text-subtle">{t.positions.headlineBody}</p>
      </header>

      {/* Tab skeleton */}
      <nav className="flex items-center gap-1 border-b border-border" aria-hidden>
        {[t.positions.tabAll, t.positions.tabOpen, t.positions.tabSettled].map((tab, i) => (
          <div
            key={tab}
            /* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215) so
               this drew 64px for a tab rail that renders at 44px (FilterPill / Tabs). */
            className={`h-[44px] px-3.5 rounded-t-md ${i === 0 ? "bg-bg-overlay" : ""}`}
            style={{ width: 70 }}
          >
            <span className="font-display text-[13px] text-text-subtle">{tab}</span>
          </div>
        ))}
      </nav>

      {/* B-29 / V-2 — "Your standing" PnL strip: the real page shows it above
          the grid, so the cards must not jump down when it pops in. */}
      <div className="glass-panel px-5 pt-4 pb-[18px] kp-shimmer-track" aria-hidden>
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-28 rounded bg-bg-overlay" />
          <div className="h-2.5 w-16 rounded bg-bg-overlay" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-16 rounded bg-bg-overlay" />
              <div className="h-5 w-20 rounded bg-bg-overlay" />
            </div>
          ))}
        </div>
      </div>

      {/* Position card skeletons — the real list is a 2-col grid at md
          (grid-cols-1 md:grid-cols-2), not a single column. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track"
          >
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                {/* ⚠️ WIDTH IS A LITERAL, not `w-12` — 128px on the overridden scale, twice
                    any real chip. */}
                <div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />
                <div className="h-4 w-24 rounded bg-bg-overlay" />
              </div>
              <div className="h-4 w-3/4 rounded bg-bg-overlay" />
              <div className="flex gap-4">
                <div className="h-3 w-20 rounded bg-bg-overlay" />
                <div className="h-3 w-16 rounded bg-bg-overlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
