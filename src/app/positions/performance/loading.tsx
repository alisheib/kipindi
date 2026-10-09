"use client";

import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostText, AMOUNT_SHAPE } from "@/components/ui/ghost-text";
import { Stat } from "@/components/ui/stat";

/** A line that cannot wrap, as a box of the page's line height with a bar on it (the receipts list's way, R5-H). */
function LineBar({ height, width, className = "" }: { height: number; width: number | string; className?: string }) {
  return (
    <div className={`flex items-center ${className}`} style={{ height }}>
      <div className="max-w-full rounded-sm bg-bg-overlay" style={{ height: Math.round(height * 0.7), width }} />
    </div>
  );
}

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 * ⭐ THE PAGE'S BANDS IN THE PAGE'S ORDER (round 5's follow-up, R5-K, 2026-10-09). The ghost stood in for an older page —
 * a stat card, four boxes in a grid, a streak line, a 200px chart, three rows — and the page is the net P&L panel, the
 * chart (the svg is a third as tall as it is wide), the best-win and streak cards, the two stake tiles and the five
 * recent rows: 202–434px apart (S/r5k/m-rest.mts), every band in a different place. Each is now the page's own block in
 * its classes and the kit's `Stat`, the words set and not shown wherever a line can wrap, a box of the line's height
 * where it cannot.
 * ⭐ THE CASE DRAWN: a player with settled positions in one product (the page withholds its rail until a second has
 * any — a player with both sees the product rail over the panel, one 44px row more), a net loss (the common book, with
 * its longer caption), a best win (its question on two lines, `line-clamp-2`), five recent rows.
 */
export default function PerformanceLoading() {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* The back link: the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b) — a 20px bar stood here, 24px short. */}
      <BackLinkGhost />

      {/* ⚠️ THE TWO WERE SWAPPED. This skeleton drew the eyebrow "Performance" over the
          headline "Polls you've played"; the real page renders the parent destination as
          the eyebrow and "Performance" as the H1, so the words changed places the instant
          the data arrived. Same pair, same order as `performance/page.tsx`.
          ⭐ DG-P-03 · §K — and it is the KIT now, which is what stops that from recurring: the
          pair cannot be swapped again without swapping it at `performance/page.tsx:125` too,
          because both call the same component with the same prop names. The hand-typed copy
          also had no `mb-1` under the eyebrow, where `PageHeader` does — a 4px gap the page had
          and the skeleton did not. ⛔ NOT wrapped in a `<header>`: the real page renders
          `<PageHeader>` as a direct child of the container, after the BackLink. */}
      <PageHeader eyebrow={t.common.positions} title={t.performance.title} />

      {/* The net P&L panel: its key and the "all figures final" sentence, the rule, the 34px figure (one line) over its
          caption, and the three `2xl` stats. */}
      <section className="glass-panel p-5 kp-shimmer-track" aria-hidden>
        <div className="flex items-center justify-between gap-3">
          <span className="gilt-eyebrow"><GhostText>{`${t.performance.netPnl} · ${t.common.settled}`}</GhostText></span>
          <span className="text-body-sm leading-normal"><GhostText>{t.performance.allFiguresFinal}</GhostText></span>
        </div>
        <div className="gilt-rule" style={{ margin: "10px 0 14px" }} />
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div className="min-w-[220px]">
            <LineBar height={34} width={200} />
            <p className="mt-2 text-body-sm leading-normal"><GhostText>{t.performance.netLossCaption}</GhostText></p>
          </div>
          <div className="flex flex-wrap gap-8">
            <Stat size="2xl" labelStyle="caps" label={<GhostText>{t.performance.winRate}</GhostText>} value={<GhostText>00%</GhostText>} />
            <Stat size="2xl" labelStyle="caps" label={<GhostText>{t.performance.marketsSettled}</GhostText>} value={<GhostText>00</GhostText>} />
            <Stat size="2xl" labelStyle="caps" label={<GhostText>{t.performance.roi}</GhostText>} value={<GhostText>+0.0%</GhostText>} />
          </div>
        </div>
      </section>

      {/* P&L over time: the head (its key and the micro line, which wraps on a phone), the chart — a 720 × 240 svg at the
          panel's width, so a third as tall — and under `sm` the svg's HTML twin line. */}
      <section className="glass-panel p-5 kp-shimmer-track" aria-hidden>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="gilt-eyebrow"><GhostText>{t.performance.pnlOverTime}</GhostText></span>
          <span className="font-mono text-micro uppercase tracking-[0.08em]"><GhostText>{t.performance.cumulativePerSettlement}</GhostText></span>
        </div>
        <div className="aspect-[3/1] w-full rounded bg-bg-overlay" />
        <p className="sm:hidden mt-1.5 mb-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-body-sm tabular-nums">
          <GhostText>{t.performance.breakEven.toUpperCase()}</GhostText>
          <GhostText>{"+0.0K · −0.0K"}</GhostText>
          <GhostText>{"0/00 – 0/00"}</GhostText>
        </p>
      </section>

      {/* The best win (the 48px crest, its figure — 26px, 30 from lg — and the question's two lines) and the streak (its
          key and the longest, the 30px figure and the pips). */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-elevated p-5 kp-shimmer-track">
          <p className="gilt-eyebrow"><GhostText>{t.performance.bestWin}</GhostText></p>
          <div className="mt-3 flex items-center gap-[14px]">
            <span className="inline-flex h-[48px] w-[48px] shrink-0 rounded-full bg-bg-overlay" />
            <div className="min-w-0 flex-1">
              <div className="h-[26px] w-[160px] max-w-full rounded-sm bg-bg-overlay lg:h-[30px]" />
              <div className="mt-1.5 h-[36px] w-full rounded-sm bg-bg-overlay/60" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-elevated p-5 kp-shimmer-track">
          <div className="flex items-baseline justify-between gap-2">
            <p className="gilt-eyebrow"><GhostText>{t.performance.currentStreak}</GhostText></p>
            <p className="font-mono text-micro uppercase tracking-[0.12em] tabular-nums"><GhostText>{`${t.performance.longestStreak} 0`}</GhostText></p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <LineBar height={30} width={20} />
            <LineBar height={15} width={95} />
          </div>
        </div>
      </section>

      {/* The two stake tiles — the kit Stat as the page sets it (`xl`, `caps`, `panel`, the money face). */}
      <section className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }} aria-hidden>
        <Stat size="xl" labelStyle="caps" boxed="panel" font="mono" label={<GhostText>{t.performance.avgStake}</GhostText>} value={<GhostText>{AMOUNT_SHAPE}</GhostText>} />
        <Stat size="xl" labelStyle="caps" boxed="panel" font="mono" label={<GhostText>{t.performance.totalStaked}</GhostText>} value={<GhostText>{AMOUNT_SHAPE}</GhostText>} />
      </section>

      {/* Recent settled: the heading (20px, its 30px line, the count beside it) and five rows — each a one-line title
          (19.5px, truncated) over its 15px line, the figure (18px) over the status word (14px). */}
      <section aria-hidden>
        <h2 className="mb-3 flex items-baseline gap-2">
          <span className="font-display text-[20px] font-semibold"><GhostText>{t.performance.recentSettled}</GhostText></span>
          <span className="ml-auto h-[12px] w-[8px] rounded-sm bg-bg-overlay" />
        </h2>
        <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden divide-y divide-border/50">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 kp-shimmer-track">
              <div className="min-w-0 flex-1">
                <LineBar height={19.5} width="75%" />
                <LineBar height={15} width={120} className="mt-0.5" />
              </div>
              <div className="shrink-0">
                <LineBar height={18} width={72} className="justify-end" />
                <LineBar height={14} width={40} className="justify-end" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
