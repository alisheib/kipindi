"use client";

import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { BackLinkGhost } from "@/components/ui/back-link";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";
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
  const { t } = useT();
  return (
    <div className="mx-auto w-full max-w-reading px-3 lg:px-6 py-6" aria-busy="true">
      {journeyHead ? journeyHead : <BackLinkGhost />}
      {journeyHead ? null : <div className="mt-3"><PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} /></div>}
      {/* ⭐ THE SEARCH BAND AND THE BAR, AS THE PAGE DRAWS THEM for a player with rounds (R5-H · G-2b: neither was drawn,
          so the strip landed about 300px lower than this ghost promised): the band on the page's own classes (`mt-5 pb-5`,
          its echo row inside the gap to the bar), then the bar's two rows — the lenses with the count's 17.25px line, then
          sort and the phone's Filters (from lg the asset, duration and day groups, which wrap by their words). */}
      <div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`} aria-hidden>
        <div className="search-box-wrap">
          <div className="h-[calc(var(--h-input)+2px)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <p className="mt-1.5 min-h-[17px]" />
        </div>
      </div>
      <div className={QUERY_BAR_CLASS} aria-hidden>
        <div className={QUERY_BAR_ROW1_CLASS}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {[56, 76, 76, 76].map((w, i) => <div key={i} className="h-[44px] shrink-0 rounded-pill bg-bg-elevated kp-shimmer-track" style={{ width: w }} />)}
          </div>
          <div className="flex h-[17.25px] shrink-0 items-center"><div className="h-3 w-[80px] rounded bg-bg-elevated" /></div>
        </div>
        <div className={QUERY_BAR_ROW2_CLASS}>
          <div className="h-[44px] w-[180px] rounded-pill bg-bg-elevated kp-shimmer-track" />
          <div className="h-[44px] w-[104px] rounded-pill bg-bg-elevated kp-shimmer-track lg:hidden" />
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
