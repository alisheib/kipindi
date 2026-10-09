"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";
import { PillGhost, SortGhost } from "@/components/ui/query-bar-ghost";
import { GhostText } from "@/components/ui/ghost-text";

/**
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 *
 * ⭐ THE BOARD THAT IS COMING, BAND FOR BAND (2026-10-09, round 5's follow-up, R5-L). The ghost drew the header, then a
 * 193px spinner box the page does not have (`p-8` is 48px here, around the 64px spinner, its 16px and its 15px word), then
 * eight 56px boxes with no table head — where the page draws, on its 32px rung (`space-y-6`): the ribbon (51px at 1280,
 * measured on tile 178; two lines, 80px, on a phone), the product lens (44), the sort (44), the podium (236 on tile 178)
 * and the table with its 35px head. So the page's first row landed 313px below the ghost's at 1280 and 368px at 390 —
 * and the table head appeared from nothing; below 768 the page's rows are 53px (no 32px sparkline), the ghost's 57.
 * Every band below is the page's own box — `PageRibbon`'s, the kit pill's, `QuerySort`'s, the podium's columns, the
 * `admin-tbl` table (its own CSS pads the cells: 12px over each row, 10 over the head) — with the page's own words set
 * and not shown (`GhostText`, `query-bar-ghost.tsx`), so each wraps where the page's does.
 * ⚠️ WHERE THE DATA DECIDES A HEIGHT, THE CASE DRAWN:
 *   · the podium is the measured board's (tiles 177, 178 and 203, the one board this round read): the leader WITHOUT a
 *     hot streak and the two beside it on one each, short handles on one line, a silver leader. A streak is the data's
 *     (the player's latest settled prediction won), and the tallest column sets the band (`items-end`): a leader on a
 *     streak makes the page's podium 8px taller than this one, a podium with no streak at all 18.5px shorter; a longer
 *     handle wraps on a phone.
 *   · the rows are a full page, twelve (`PLAYER_PER_PAGE`): they are the last band, so a shorter board (the measured one
 *     ranks seven) moves nothing but the footer below them. The cap sentence (a board of fifty) and the pager are not
 *     drawn — how many pages there are is the data's.
 */
export default function LeaderboardLoading() {
  const { t } = useT();
  // Width MUST match leaderboard/page.tsx (1080). It was 1280, so the skeleton was
  // 200px wider than the board that replaced it — a visible snap on every visit.
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-03 · §K — THIS COPY OF `PageHeader` WAS NOT EVEN AN ACCURATE ONE, which is the
          argument for adopting the kit rather than retyping it. The h1 read
          `font-display text-[28px] font-bold text-text` — **missing `leading-tight` and
          `tracking-[-0.02em]`** — so the heading changed its line-height AND its letter-spacing
          the instant the board replaced the skeleton, and the eyebrow had no `mb-1` either.
          `leaderboard/page.tsx:210` renders `<PageHeader>` as a direct child of the container,
          so this does too, with the same two strings. ⛔ No `<header>` wrapper: the page has
          none, and adding one here would put the skeleton a level deeper than the thing it
          stands in for. (The width mismatch this file's own header records was the same class
          of defect, found the same way.) */}
      <PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />

      {/* The ribbon — `PageRibbon`'s box: three stats, each its label beside its figure, wrapping as the page's. */}
      <div className="rounded-xl border border-border bg-bg-elevated/60 px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-transparent" aria-hidden>
        {[
          [t.leaderboard.topTier, t.leaderboard.tierSilver.split(" ")[0]],
          [t.leaderboard.bestRoi, "00.0%"],
          [t.leaderboard.predictorsCount, "00"],
        ].map(([label, value], i) => (
          <div key={i} className="flex items-baseline gap-2 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="font-mono text-micro uppercase eyebrow font-bold whitespace-nowrap"><GhostText>{label}</GhostText></p>
            </div>
            <p className="font-mono text-body-lg font-bold tabular-nums whitespace-nowrap leading-none"><GhostText>{value}</GhostText></p>
          </div>
        ))}
      </div>

      {/* The product lens — the page's three pills, their words. */}
      <div className="flex flex-wrap items-center gap-1.5 -mx-1 px-1" aria-hidden>
        <PillGhost label={t.common.all} />
        <PillGhost label={t.common.markets} />
        <PillGhost label={t.market.udTitle} />
      </div>

      {/* The sort — its own row on the page's rhythm (`py-0`, as the page's). */}
      <div className={cn(QUERY_BAR_ROW2_CLASS, "py-0")} aria-hidden>
        <SortGhost label={t.common.sort} value={t.leaderboard.bestRoi} />
      </div>

      <PodiumGhost />

      {/* The table — the page's own `admin-tbl` in its glass scroller: the head, then the page's rows. */}
      <div className="scrollx overflow-x-auto rounded-xl glass-panel text-transparent" aria-hidden>
        <table className="admin-tbl min-w-[640px]">
          <thead className="border-b border-border bg-bg-overlay">
            <tr className="font-mono text-micro uppercase eyebrow">
              <th className="text-left p-3 w-[56px]"><GhostText>#</GhostText></th>
              <th className="text-left p-3"><GhostText>{t.leaderboard.tablePredictor}</GhostText></th>
              <th className="text-right p-3"><GhostText>{t.leaderboard.tableRoi}</GhostText></th>
              <th className="text-left p-3 hidden md:table-cell"><GhostText>{t.leaderboard.tableStakes}</GhostText></th>
              <th className="text-right p-3 hidden md:table-cell"><GhostText>{t.leaderboard.tableStreak}</GhostText></th>
              <th className="text-right p-3"><GhostText>{t.leaderboard.tableResolved}</GhostText></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PLAYER_PER_PAGE }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                <td className="p-3 font-mono font-bold tabular-nums"><GhostText>{String(i + 1)}</GhostText></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {/* The 28px crest (`Avatar size="sm"`, `.crest-holder`), the handle, the 22px tier badge. */}
                    <span className="crest-holder h-[28px] w-[28px] rounded-full bg-bg-overlay kp-shimmer-track" />
                    <span className="font-medium"><GhostText>@handle</GhostText></span>
                    <span className="tier-badge bg-bg-overlay" />
                  </div>
                </td>
                <td className="p-3 text-right font-mono tabular-nums font-bold"><GhostText>+00.0%</GhostText></td>
                {/* The 14-day sparkline's 32px (`VolumeSparkline height={32}`), from 768 — it sets the row there. */}
                <td className="p-3 hidden md:table-cell"><div className="h-[32px] w-[140px] rounded-sm bg-bg-overlay/40 kp-shimmer-track" /></td>
                <td className="p-3 text-right hidden md:table-cell font-mono tabular-nums"><GhostText>—</GhostText></td>
                <td className="p-3 text-right font-mono tabular-nums"><GhostText>00</GhostText></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

/** The podium — the page's own section, grid and columns: #2, #1 (its crown, the 56px crest; 12px raised, which moves
 *  no box) and #3 (48px crests), each its handle and 22px tier badge (stacked below 640), the rate, a hot streak (the two
 *  beside the leader: the measured board's — the file's note) and the resolved count. The bottoms align (`items-end`), so
 *  the tallest column sets the band: here a neighbour's, 18.5px taller than the leader's without its streak line. */
function PodiumGhost() {
  return (
    <section className="rounded-xl glass-panel px-4 pt-6 pb-4 text-transparent" aria-hidden>
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {[2, 1, 3].map((rank) => {
          const first = rank === 1;
          // The crest's own box (`.crest-holder`: inline-flex, middle-aligned, its line 0) — 56px for the leader, 48
          // beside it.
          const crest = first ? "h-[56px] w-[56px]" : "h-[48px] w-[48px]";
          return (
            <div key={rank} className={`flex min-w-0 flex-col items-center text-center ${first ? "-translate-y-3" : ""}`}>
              <span className="mb-1 block h-[22px]" />
              <div className="relative rounded-full" style={{ padding: 3 }}>
                <span className={`crest-holder ${crest} rounded-full bg-bg-overlay kp-shimmer-track`} />
              </div>
              <div className="mt-2 flex max-w-full flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
                <span className="min-w-0 break-words font-medium"><GhostText>@handle</GhostText></span>
                <span className="tier-badge bg-bg-overlay" />
              </div>
              <span className="mt-0.5 font-mono text-[13px] font-bold tabular-nums"><GhostText>+00.0%</GhostText></span>
              {/* The streak's line, beside the leader only (the measured board): the column's 15px type on its 22.5px line
                  box, the 21px chip inside it (1px border, 2px padding, its 10px words on their 15px line) — then the
                  resolved count's own 15px line (10px × 1.5). One line each, so the line's box is the ghost; the words
                  would size nothing. */}
              {!first && <span className="mt-1 flex h-[22.5px] items-center"><span className="h-[21px] w-[72px] rounded-pill bg-bg-overlay" /></span>}
              <span className="mt-1 flex h-[15px] items-center"><span className="h-[8px] w-[80px] rounded-sm bg-bg-overlay/40" /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
