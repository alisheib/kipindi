import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { MARKET_CARD_H } from "@/components/markets/card-geometry";

/**
 * /markets loading skeleton.
 *
 * 🔴 A SKELETON'S ONLY JOB IS TO BE THE RIGHT SHAPE. This one was not, and the mismatch was
 * measured in a real browser at 1280 on 2026-08-10, not estimated:
 *
 *   · cards          220px  →  the real card is 349.4px  (129px deficit PER ROW)
 *   · filter rail    6 pills at 32px  →  the real rail was 13 pills at 48px, 750px tall
 *   · promo block    absent          →  84px on the real page
 *   · search         inside the right column → the real one was FULL WIDTH above both columns
 *
 * So the page it drew was not the page that arrived: over four rows the grid alone jumped by
 * more than 500px, and the whole board shifted sideways as the search bar moved out of the
 * column. That is the B-29 finding recurring — a skeleton that lies about the page is worse
 * than no skeleton, because it commits the layout to a shape and then breaks the commitment
 * while the reader's eye is already moving.
 *
 * ⚠️ REWRITTEN 2026-08-13 with the round-2 discovery bar. The 13-pill vertical rail and the
 * two-column split are GONE; so is the propose promo, which the kit removes from this route.
 * The shape is now: header row → search → sticky two-row filter bar → full-width grid.
 * Drawing the old rail here would have re-created the exact defect this file documents.
 *
 * ⚠️ THE STRUCTURE BELOW MIRRORS `page.tsx` WRAPPER-FOR-WRAPPER — same `PageContainer` tier,
 * same header row, same search, same bar height, same `.market-grid`. The shimmer blocks are
 * the only difference. Keep it that way, and in the same commit.
 *
 * ⛔ Card height and count are NOT re-typed here: `MARKET_CARD_H` is the one shared definition
 * (`components/markets/card-geometry.ts`) and the count comes from `PLAYER_PER_PAGE`. That is
 * how the two skeletons stay equal — the previous pair drifted to 220 vs 349 precisely because
 * each carried its own literal.
 */
export default async function MarketsLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="board">
      {/* Header row — title left, the live-count + volume line right. The real page renders
          both; drawing only the title made the row a different height. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle">{t.market.title}</p>
        <div className="kp-shimmer-track h-4 w-40 rounded bg-bg-elevated" aria-hidden />
      </div>

      {/* Search — full width, with the echo row reserved exactly as the real box reserves it. */}
      <div aria-hidden className="search-box-wrap">
        {/* ⚠️ TOKEN, not `h-11` — spacing is overridden (tailwind.config.ts:200-215) so `h-11`
            drew 96px. This ghosts `<Input size="md">`, which reads --h-input (44px); consume the
            same token so the ghost and the field can never drift apart. */}
        <div className="kp-shimmer-track h-[var(--h-input)] rounded-lg border border-border bg-bg-inset" />
        <p className="mt-1.5 min-h-[17px]" />
      </div>

      {/* The discovery bar — TWO rows at the real 44px control height, so the grid below starts
          where it will actually start. Row 1: status segments + count. Row 2: sort + direction,
          odds, pool, topic. */}
      <div aria-hidden className="sticky top-[56px] z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {[64, 104, 60, 84, 52].map((w, i) => (
              <div key={i} className="kp-shimmer-track h-[44px] rounded-pill bg-bg-elevated" style={{ width: w }} />
            ))}
          </div>
          <div className="kp-shimmer-track h-4 w-20 shrink-0 rounded bg-bg-elevated" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2.5 pt-1.5">
          <div className="kp-shimmer-track h-[44px] w-[210px] rounded-pill bg-bg-elevated" />
          {[56, 92, 88, 84].map((w, i) => (
            <div key={i} className="kp-shimmer-track h-[44px] rounded-pill bg-bg-elevated" style={{ width: w }} />
          ))}
          <div className="kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated" />
        </div>
      </div>

      <div className="market-grid mt-3" aria-hidden>
        {Array.from({ length: PLAYER_PER_PAGE }).map((_, i) => (
          <div
            key={i}
            className="kp-shimmer-track rounded-md border border-border bg-bg-elevated"
            style={{ height: MARKET_CARD_H }}
          />
        ))}
      </div>
    </PageContainer>
  );
}
