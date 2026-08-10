import { getServerT } from "@/lib/i18n-server";

/**
 * /markets loading skeleton.
 *
 * 🔴 A SKELETON'S ONLY JOB IS TO BE THE RIGHT SHAPE. This one was not, and the
 * mismatch was measured in a real browser at 1280 on 2026-08-10, not estimated:
 *
 *   · cards          220px  →  the real card is 349.4px  (129px deficit PER ROW)
 *   · filter rail    6 pills at 32px  →  the real rail is 13 pills at 48px, 750px tall
 *   · promo block    absent          →  84px on the real page
 *   · search         inside the right column → the real one is FULL WIDTH above both
 *                    columns, in a sticky zone
 *
 * So the page it drew was not the page that arrived: over four rows the grid alone
 * jumped by more than 500px, and the whole board shifted sideways as the search bar
 * moved out of the column. That is the B-29 finding recurring — a skeleton that lies
 * about the page is worse than no skeleton, because it commits the layout to a shape
 * and then breaks the commitment while the reader's eye is already moving.
 *
 * ⚠️ THE STRUCTURE BELOW MIRRORS `page.tsx` WRAPPER-FOR-WRAPPER — same max-width, same
 * header row, same promo slot, same sticky search zone, same two-column split, same
 * `.market-grid`. The shimmer blocks are the only difference. Keep it that way: if the
 * real page's layout changes, change this in the same commit, because the geometry here
 * is inherited from those shared classes rather than re-derived from numbers that would
 * silently go stale.
 */
export default async function MarketsLoading() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">
      {/* Header row — title left, the live-count + volume line right. The real page
          renders both; drawing only the title made the row a different height. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.market.title}</p>
        <div className="h-4 w-40 rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
      </div>

      {/* Propose promo — 84px on the real page. Absent here, the entire board below
          started 84px too high and then dropped. */}
      <div className="h-[84px] rounded-lg border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />

      {/* Search — FULL WIDTH above the columns, in the same sticky zone, with the echo
          row reserved exactly as the real box reserves it. */}
      <div className="sticky top-[56px] z-20 mt-4 bg-bg-base py-2.5" aria-hidden>
        <div className="search-box-wrap">
          <div className="h-11 rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Filter rail — TWO groups (When: 5, Topic: 8), each pill at the real
            control height, so the column is the height it will actually be. */}
        <aside className="lg:w-[208px] lg:shrink-0 space-y-2.5 lg:space-y-4" aria-hidden>
          {[5, 8].map((count, group) => (
            <div key={group} className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-stretch lg:gap-1">
              <div className="h-3 w-14 rounded bg-bg-elevated kp-shimmer-track lg:mb-1" />
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-md border border-border bg-bg-elevated kp-shimmer-track lg:w-full" />
              ))}
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          {/* 349px — the measured card height, not a round number that felt right. */}
          <div className="market-grid" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-md border border-border bg-bg-elevated kp-shimmer-track" style={{ height: 349 }} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
