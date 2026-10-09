/**
 * THE GHOST OF TIKETI ZANGU — what a journey reader sees while `/positions` or `/updown/history` loads (the Vodacom plan
 * S6, S6-PLAN WP9 step 7). Chosen ON THE SERVER (VODACOM-PLAN §0h point 21): each loading file asks the per-request
 * resolver beside the words and returns this ghost for a journey request, today's for everybody else.
 *
 * ⭐ THE SKELETON'S JOB IS THAT NOTHING MOVES WHEN THE DATA LANDS (§B7 rule 3), so it draws the view's own order at the
 * view's own heights: the name in the same `PageHeader` the view renders, the switch's underline rail, the lens strip on
 * the shared bar's classes (imported, never retyped) and ticket cards on the card's own surface. The Utendaji link sits
 * below the list, so the head has nothing beside the name to hold room for.
 * ⛔ It reads nothing: it is handed the words. ⭐ Since round 5's follow-up (R5-H · G-2) it is drawn in the browser, by the
 * journey's route ghost alone (`route-ghost.tsx`) — the root's, and the one `/positions`' and `/updown/history`'s loading
 * files hand a journey reader pinned to their page — so no server file imports it and a classic reader is sent none of
 * it (§0h point 21). It stays a module with no directive: only client code loads it.
 */
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_ALONE_CLASS } from "@/components/ui/query-bar";
import type { Dict } from "@/lib/i18n-dict";

/** The seven lenses, at widths near their labels' (a row of identical boxes reads as a loading bar, not a strip). */
const LENS_WIDTHS = ["w-[64px]", "w-[64px]", "w-[112px]", "w-[96px]", "w-[112px]", "w-[112px]", "w-[96px]"];

/** The head of Tiketi zangu, on both kinds: the name, then the two kinds' underline rail. */
export function TicketsHeadGhost({ t }: { t: Dict }) {
  return (
    <div className="space-y-4">
      <PageHeader title={t.journey.tabTickets} />
      {/* `data-rail-ghost` (R5-B's hook, globals.css): the journey's rail rule draws this ghost as it draws the page's rail —
          bled 12px into the gutter, the rule from the column's edge — so the switch lands where its ghost stood (R5-H · G-2b:
          without it the ghost's boxes stood 12px right of the page's options). */}
      <div className="flex items-end gap-1 border-b border-border" data-rail-ghost="" aria-hidden>
        <div className="h-[44px] w-[96px] rounded-md bg-bg-overlay kp-shimmer-track" />
        <div className="h-[44px] w-[96px] rounded-md bg-bg-overlay kp-shimmer-track" />
      </div>
    </div>
  );
}

/** The whole of Maswali's view, while it loads. */
export function TicketsGhost({ t }: { t: Dict }) {
  return (
    <PageContainer tier="reading" className="space-y-6">
      <TicketsHeadGhost t={t} />
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_ALONE_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {LENS_WIDTHS.map((w, i) => (
              <div key={i} className={`h-[44px] ${w} shrink-0 rounded-pill bg-bg-overlay`} />
            ))}
          </div>
        </div>
      </div>
      {/* The view's own grid and the card's own stake/payout split (2026-10-08): rows stretch, the payout takes 3 parts. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track">
            {/* The card's two pills are 18px (`Chip size="sm"`, the state at the side pill's `metrics="base"`, G1): these drew
                `h-5`, 24px on this scale, so every ghost card's question bar stood 6px below where the page's question lands
                (round 6, 2026-10-09, review C18). */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-[18px] w-[64px] rounded-pill bg-bg-overlay" />
              <div className="h-[18px] w-[96px] rounded-pill bg-bg-overlay" />
            </div>
            <div className="mt-3 h-4 w-3/4 rounded bg-bg-overlay" />
            <div className="mt-3 grid grid-cols-[minmax(max-content,2fr)_minmax(0,3fr)] gap-3">
              <div className="h-[44px] rounded bg-bg-overlay" />
              <div className="h-[44px] rounded bg-bg-overlay" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-[112px] rounded bg-bg-overlay" />
              <div className="h-3 w-[80px] rounded bg-bg-overlay" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
