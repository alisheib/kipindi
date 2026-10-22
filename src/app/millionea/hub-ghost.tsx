"use client";

import { PageContainer } from "@/components/layout/page-container";
import { PAGE_HEADER_PILL, PageHeader } from "@/components/ui/page-header";
import { GhostBar, GhostLine } from "@/components/maswali/maswali-ghost";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The fifteen questions' rows, as many as a phone's first screens hold. */
const ROWS = [0, 1, 2, 3, 4, 5];
/**
 * The pool ledger's rows as the one Millionea ledger draws a selling week's (`maswali-ledger.tsx`): the carry, the sales
 * over their note, the pool so far under its hairline, then — a step of space after the total — the floor, the jackpot
 * and the fee.
 */
const LEDGER: Array<{ note?: boolean; total?: boolean; gap?: boolean }> = [{}, { note: true }, { total: true }, { gap: true }, {}, {}];

/**
 * A line of words in the page's own type: the drawing's bar inside the very line box those words fill (`text` names their
 * classes), so each band of the drawing is as tall as the band it stands for — one rule for every band, never a bar of a
 * guessed height (S5-DESIGN-HUB L7, measured by `qa:maswali-hub-states`' "ghost" state).
 */
function Line({ text = "", width, className }: { text?: string; width: string; className?: string }) {
  return <span className={cn("block", text, className)}><GhostLine className={width} /></span>;
}

/**
 * /millionea loading skeleton — the hub's own bands in its own order and on its own grid (`page.tsx`): the head (its
 * eyebrow with the week's chip, its name, its two doors wrapping under the name on a phone, the game's one line), the
 * week strip across the measure, the jackpot's head, the door and its close, the ledger (beside the door from 768, the head
 * and the door in the right column from 1024), then the questions — so the page lands where its drawing stood (S5-DESIGN-
 * HUB L7: the strip's drawing sat in the left column at 1280 and the pool's was a 320px block, ~70px off at 1280 and
 * ~160px at 360). Every band of words is drawn in the page's own type (`Line`), so it is the page's height.
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
              // The game's one line, in the subtitle's own line boxes: two lines on a phone, one from 768.
              <span className="block">
                <Line width="w-full max-w-[420px]" />
                <Line width="w-[200px]" className="md:hidden" />
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
          {/* The strip: three phases, each a dot's place and two lines of the strip's own type (its label over its range),
              a column each from 768, across the measure (`maswali-week-strip.tsx`). */}
          <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:gap-3 lg:col-span-2" data-ghost="strip">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-baseline gap-2 md:border-t-2 md:border-border-strong md:pt-1.5">
                <span className="h-1.5 w-1.5 shrink-0" />
                <span className="min-w-0 text-body-sm">
                  <Line width="w-[96px] max-w-full" />
                  <Line width="w-[208px] max-w-full" />
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-x-6 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:flex lg:flex-col lg:gap-4">
            <div className="contents lg:-mt-3 lg:flex lg:flex-col lg:gap-3 lg:pb-3 lg:pt-3">
              {/* The jackpot's head (`MaswaliPoolHead`): its label, its figure, its rule's two lines, the carry's line. */}
              <div className="mat-flat flex flex-col gap-1 rounded-card p-3 md:col-start-1 md:row-start-1" data-ghost="jackpot">
                <Line text="font-mono text-micro" width="w-[64px]" />
                <Line text="font-mono text-title-sm font-semibold xs:text-title-md" width="w-[220px] max-w-full" />
                <span className="block text-body-sm">
                  <Line width="w-full" />
                  <Line width="w-[140px]" />
                </span>
                <Line text="text-body-sm" width="w-[200px] max-w-full" />
              </div>
              {/* The door and its close. */}
              <div className="flex flex-col gap-3 md:col-start-2 md:row-start-1 md:self-center lg:self-auto">
                <div className="h-[var(--h-control-lg)] w-full rounded-control bg-bg-overlay kp-shimmer-track" data-ghost="door" />
                <GhostBar className="h-4 w-[180px]" />
              </div>
            </div>
            {/* The ledger, as the one Millionea ledger draws its rows (sentence labels, a note, a total's hairline). */}
            <div className="mat-flat flex flex-col gap-1.5 rounded-card p-3 md:col-start-1 md:row-start-2" data-ghost="ledger">
              {LEDGER.map((r, i) => (
                <div key={i} className={cn("flex items-baseline justify-between gap-2 text-body-sm", r.total && "border-t border-border pt-1.5", r.gap && "mt-3")}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <Line width="w-[120px]" />
                    {r.note && <Line width="w-[156px]" />}
                  </span>
                  <Line text={r.total ? "font-mono text-[16px]" : "font-mono text-[13px]"} width="w-[84px]" />
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
