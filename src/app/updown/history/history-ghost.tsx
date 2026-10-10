"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { BackLinkGhost } from "@/components/ui/back-link";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS, QUERY_STRIP_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";
import { CountGhost, FiltersGhost, GroupGhost, PillGhost, SortGhost } from "@/components/ui/query-bar-ghost";
import { PageHeader } from "@/components/ui/page-header";

/**
 * /updown/history loading skeleton, for both shells — today's two head lines, or the head it is handed in their place
 * (`journeyHead`: Tiketi zangu's name and switch, for a reader the server put in the journey — S6 WP9, VODACOM-PLAN §0h
 * point 21; `loading.tsx` (this folder) asks which reader this is).
 * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` renders it for a classic
 * reader, and the journey's route ghost (`components/journey/route-ghost.tsx`) draws it with the journey's head — on a
 * move here from the root, and from this folder's own loading file for a journey reader.
 * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): a refresh carries its reference, not this
 * tree — `components/ui/page-loader.tsx` has the convention.
 * ⛔ IT LOADS NOTHING OF THE JOURNEY'S: a classic reader's loading file renders it, so its code joins this segment's first
 * load for every reader, and §0h point 21 sends a classic reader no script for the journey's picture. The journey's head
 * comes in through `journeyHead`, from the one module that draws it.
 * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.
 * ⭐ TODAY'S HEAD IS THE PAGE'S (R5-H · G-2b): the BackLink's 44px box and the page's own PageHeader in its `mt-3`
 * wrapper, same props — a 20px bar and a 40px block stood there, the page landing some 60px lower than promised.
 */
export function UpDownHistoryGhost({ journeyHead }: { journeyHead?: ReactNode }) {
  const { t, locale } = useT();
  // ⭐ THE BAR'S OWN WORDS, IN ITS ORDER (2026-10-10, R5-L's note for the integrator): the six lenses (`UD_LENSES`,
  // `lensLabel` in `history-bar.tsx`) and the five windows (`UD_WHEN_IDS`, `whenLabel`). The asset and duration groups are
  // the player's own rounds, so the case drawn is the smallest a player with rounds has (R5-L's model,
  // S/r5l/measure-history.cts): "All" and one asset — the product's first, Bitcoin, in each language's name
  // (`updown-symbols.ts`) — and "All" and one duration; every real player's row is at least this tall.
  const lenses = [t.common.all, t.market.udInPlay, t.market.udUpWins, t.market.udDownWins, t.market.udVoided, t.market.udConfirmingPrice];
  const windows = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll];
  const asset = locale === "zh" ? "比特币" : "Bitcoin";
  return (
    <div className="mx-auto w-full max-w-reading px-3 lg:px-6 py-6" aria-busy="true">
      {journeyHead ? journeyHead : <BackLinkGhost />}
      {journeyHead ? null : <div className="mt-3"><PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} /></div>}
      {/* ⭐ THE SEARCH BAND AND THE BAR, AS THE PAGE DRAWS THEM for a player with rounds (R5-H · G-2b: neither was drawn,
          so the strip landed about 300px lower than this ghost promised): the band on the page's own classes (`mt-5 pb-5`,
          its echo row inside the gap to the bar), then the bar's two rows in the bar kit's parts (`query-bar-ghost.tsx`,
          the page's own boxes with its words set and not shown — 2026-10-10): the lens strip in the strip's own class
          (scrolling below lg, wrapping from it) beside the count's phrase, then the sort and the phone's Filters, and from lg
          the asset, duration and day groups behind the page's dividers. Measured from the served fonts (S/r7/measure-
          history2.cts): from lg that row is two lines in sw, en and zh where the typed 180px box drew one — the list
          landed 56px lower than promised — and the lenses one line, now each pill the page's own width. */}
      <div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`} aria-hidden>
        <div className="search-box-wrap">
          <div className="h-[calc(var(--h-input)+2px)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_CLASS}>
          <div className={QUERY_STRIP_CLASS}>
            {lenses.map((label) => <PillGhost key={label} label={label} />)}
          </div>
          <CountGhost count={t.market.udNRounds.replace("{n}", "00")} />
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          <SortGhost label={t.common.sort} value={t.positions.sortRecent} />
          <FiltersGhost label={t.market.filtersOpen} />
          <QueryGroupDivider />
          <GroupGhost label={t.market.udAssets}><PillGhost label={t.common.all} /><PillGhost label={asset} /></GroupGhost>
          <QueryGroupDivider />
          <GroupGhost label={t.market.udDurations}><PillGhost label={t.common.all} /><PillGhost label={`5 ${t.market.udMin}`} /></GroupGhost>
          <QueryGroupDivider />
          <GroupGhost label={t.common.when}>{windows.map((label) => <PillGhost key={label} label={label} />)}</GroupGhost>
        </div>
      </div>
      {/* The P&L strip: each tile the page's (14px padding, a 1px border, the 14px label, 2px, the 19px figure's 28.5px
          line, the 15px sub-line) — 89.5px, where 80 stood. */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[89.5px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track" />)}
      </div>
      <div className="mt-4 h-64 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
