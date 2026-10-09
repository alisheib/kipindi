/**
 * THE GHOST OF TIKETI ZANGU — what a journey reader sees while `/positions` or `/updown/history` loads (the Vodacom plan
 * S6, S6-PLAN WP9 step 7). Chosen ON THE SERVER (VODACOM-PLAN §0h point 21): each loading file asks the per-request
 * resolver beside the words and returns this ghost for a journey request, today's for everybody else.
 *
 * ⭐ THE SKELETON'S JOB IS THAT NOTHING MOVES WHEN THE DATA LANDS (§B7 rule 3), so it draws the view's own order at the
 * view's own heights: the name in the same `PageHeader` the view renders, the switch's underline rail, the lens strip on
 * the shared bar's classes (imported, never retyped) and ticket cards on the card's own surface. The Utendaji link sits
 * below the list, so the head has nothing beside the name to hold room for.
 * ⛔ A server component that reads nothing: the loading file that chose it hands it the words.
 */
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS } from "@/components/ui/query-bar";
import type { Dict } from "@/lib/i18n-dict";

/** The seven lenses, at widths near their labels' (a row of identical boxes reads as a loading bar, not a strip). */
const LENS_WIDTHS = ["w-[64px]", "w-[64px]", "w-[112px]", "w-[96px]", "w-[112px]", "w-[112px]", "w-[96px]"];

/** The head of Tiketi zangu, on both kinds: the name, then the two kinds' underline rail. */
export function TicketsHeadGhost({ t }: { t: Dict }) {
  return (
    <div className="space-y-4">
      <PageHeader title={t.journey.tabTickets} />
      <div className="flex items-end gap-1 border-b border-border" aria-hidden>
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
        <div className={`${QUERY_BAR_ROW1_CLASS} pb-2`}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {LENS_WIDTHS.map((w, i) => (
              <div key={i} className={`h-[44px] ${w} shrink-0 rounded-pill bg-bg-overlay`} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track">
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-[64px] rounded-pill bg-bg-overlay" />
              <div className="h-5 w-[96px] rounded-pill bg-bg-overlay" />
            </div>
            <div className="mt-3 h-4 w-3/4 rounded bg-bg-overlay" />
            <div className="mt-3 grid grid-cols-2 gap-3">
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
