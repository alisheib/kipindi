"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { GhostBar, GhostLine } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The fifteen questions' rows, as many as a phone's first screens hold. */
const ROWS = [0, 1, 2, 3, 4, 5];
/**
 * The pool ledger's rows as the one Millionea ledger draws a selling week's (`maswali-ledger.tsx`): the carry (a link row,
 * 40px), the sales over their note, the pool so far under its hairline, then — a step of space after the totals — the
 * floor, the jackpot and the fee.
 */
const LEDGER: Array<{ h: string; note?: boolean; total?: boolean; gap?: boolean }> = [
  { h: "min-h-[var(--h-control-md)]" }, { h: "", note: true }, { h: "", total: true }, { h: "", gap: true }, { h: "" }, { h: "" },
];

/**
 * /millionea loading skeleton — the hub's own bands in its own order and on its own grid (`page.tsx`): the head (its
 * eyebrow, its name, its two doors wrapping under the name on a phone, the game's one line), the week strip across the
 * measure, the jackpot's head, the door and its close, the ledger (beside the door from 768, the head and the door in the
 * right column from 1024), then the questions — so the page lands where its drawing stood (S5-DESIGN-HUB L7: the strip's
 * drawing sat in the left column at 1280 and the pool's was a 320px block, ~70px off at 1280 and ~160px at 360).
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` renders it, and the journey's root loading state draws it on a move
 * to /millionea (`route-ghost.tsx`). Client code, wordless but for the screen reader's "loading" (`maswali-ghost.tsx`).
 */
export function MillioneaHubGhost() {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      <div className="flex flex-col gap-6" aria-busy="true">
        <div aria-hidden>
          <PageHeader
            eyebrow={(
              // The week and its state — the register's chip (`WeekStateChip`, 23px tall): the page's eyebrow row, its height.
              <span className="inline-flex items-center gap-2">
                <GhostLine className="w-[56px]" />
                <span className="inline-block h-[23px] w-[72px] rounded-pill bg-bg-overlay" />
              </span>
            )}
            title={<GhostLine className="w-[248px]" />}
            subtitle={(
              // The game's one line: two lines on a phone, one from 768.
              <span className="flex flex-col gap-1.5 pt-1">
                <GhostLine className="w-full max-w-[420px]" />
                <GhostLine className="w-[200px] md:hidden" />
              </span>
            )}
            actionsWrap
            actions={(
              <span className="flex shrink-0 items-center gap-1">
                <span className={cn(PAGE_HEADER_PILL, "w-[112px] kp-shimmer-track")} />
                <span className={cn(PAGE_HEADER_PILL, "w-[104px] kp-shimmer-track")} />
              </span>
            )}
          />
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-hidden>
          {/* The strip: three phases, a label over its range, a column each from 768, across the measure. */}
          <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3 lg:col-span-2" data-ghost="strip">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 md:border-t-2 md:border-border-strong md:pt-1.5">
                <GhostBar className="h-4 w-[96px] max-w-full" />
                <GhostBar className="h-4 w-[208px] max-w-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-6 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:flex lg:flex-col lg:gap-4">
            <div className="contents lg:flex lg:flex-col lg:gap-3">
              {/* The jackpot's head: its label, its figure, its rule's two lines. */}
              <div className="mat-flat flex flex-col gap-1.5 rounded-card p-3 md:col-start-1 md:row-start-1" data-ghost="jackpot">
                <GhostBar className="h-3 w-[64px]" />
                <GhostBar className="h-7 w-[220px] max-w-full" />
                <GhostBar className="h-4 w-full" />
                <GhostBar className="h-4 w-[160px] max-w-full" />
              </div>
              {/* The door and its close. */}
              <div className="flex flex-col gap-3 md:col-start-2 md:row-start-1">
                <div className="h-[var(--h-control-lg)] w-full rounded-control bg-bg-overlay kp-shimmer-track" data-ghost="door" />
                <GhostBar className="h-4 w-[180px]" />
              </div>
            </div>
            {/* The ledger, as the one Millionea ledger draws its rows (sentence labels, a note, a total's hairline). */}
            <div className="mat-flat flex flex-col gap-1.5 rounded-card p-3 md:col-start-1 md:row-start-2" data-ghost="ledger">
              {LEDGER.map((r, i) => (
                <div key={i} className={cn("flex items-center justify-between gap-2", r.h, r.total && "border-t border-border pt-1.5", r.gap && "mt-3")}>
                  <span className="flex flex-col gap-1.5">
                    <GhostBar className="h-3.5 w-[120px]" />
                    {r.note && <GhostBar className="h-3.5 w-[156px]" />}
                  </span>
                  <GhostBar className={cn("w-[84px]", r.total ? "h-4" : "h-3.5")} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col lg:col-start-1 lg:row-start-2" data-ghost="questions">
            <GhostBar className="mb-3 h-6 w-[200px]" />
            {ROWS.map((i) => (
              <div key={i} className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1.5 border-t border-border py-3 md:grid-cols-[32px_104px_minmax(0,1fr)_auto]">
                <GhostBar className="h-4 w-4" />
                <GhostBar className="h-3 w-[72px] md:mt-0.5" />
                <GhostBar className="col-start-2 h-4 w-full md:col-start-auto" />
                <GhostBar className="col-start-2 h-3 w-[136px] md:col-start-auto" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
