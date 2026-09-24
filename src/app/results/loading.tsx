import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { MARKET_CARD_H_CLOSED } from "@/components/markets/card-geometry";

export default async function ResultsLoading() {
  const { t } = await getServerT();
  // Width MUST match results/page.tsx (1280) — a mismatch reflows on every route transition.
  return (
    <PageContainer tier="board" className="space-y-5">
      <header aria-hidden>
        <div className="h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track" />
        <div className="mt-1 h-7 w-48 rounded bg-bg-overlay kp-shimmer-track" />
      </header>

      {/* Filter/search skeleton */}
      <div className="flex items-center gap-2" aria-hidden>
        {/* ⚠️ TOKEN, not `h-9` — spacing is overridden (tailwind.config.ts:200-215) so `h-9`
            drew 64px for a search row that renders at --h-input (44px). */}
        <div className="h-[var(--h-input)] flex-1 rounded-md border border-border bg-bg-elevated kp-shimmer-track" />
        <div className="h-[var(--h-input)] w-[96px] rounded-md bg-bg-overlay kp-shimmer-track" />
      </div>

      {/* Card grid skeleton.
          ⛔ `.market-grid`, NOT A HAND-ROLLED `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`.
          That is what stood here, and it disagreed with the real page twice over: the shared
          class is `gap: 14px` against `gap-3`'s 16 (10px over six rows), and it tracks columns
          with `auto-fill minmax(min(300px,100%),1fr)` rather than counting them at fixed
          breakpoints, so the two laid out a different number of columns on a tablet. The real
          `/results` grid and `ResultsSkeleton` both use `.market-grid`; this was the only one of
          the three that did not. ⭐ It also made the route UNMEASURABLE: `qa:ghost-landing`
          finds the board by `.market-grid > *`, the class the page itself uses, so `/results`
          reported "no skeleton frame was ever captured" — a vacuous pass — rather than a
          number. A ghost that does not speak the page's own class names cannot be compared
          with the page. */}
      <div className="market-grid" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-bg-elevated p-4 kp-shimmer-track" style={{ height: MARKET_CARD_H_CLOSED }}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-14 rounded-pill bg-bg-overlay" />
                {/* ⚠️ WIDTH IS A LITERAL, not `w-10` — spacing is overridden
                    (tailwind.config.ts:200-215) so `w-10` is 80px, far wider than the tiny
                    label it stands for. The h-4 height is a default key and reads as written. */}
                <div className="h-4 w-[40px] rounded-pill bg-bg-overlay" />
              </div>
              <div className="h-4 w-full rounded bg-bg-overlay" />
              <div className="h-4 w-3/4 rounded bg-bg-overlay" />
              <div className="h-2 w-full rounded-full bg-bg-overlay mt-2" />
              <div className="flex gap-2 mt-auto">
                <div className="h-3 w-[64px] rounded bg-bg-overlay" />
                {/* ⚠️ WIDTH IS A LITERAL, not `w-12` (128px on the overridden scale) for a
                    3px-tall micro label. */}
                <div className="h-3 w-[64px] rounded bg-bg-overlay" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
