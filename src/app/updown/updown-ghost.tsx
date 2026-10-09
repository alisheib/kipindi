"use client";

import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/lib/i18n";

/**
 * /updown loading skeleton. Mirrors the board's real header + card grid so there is no
 * layout jump when the page swaps in — same max-width, same grid, same card height.
 * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) renders it,
 * and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it on a move to /updown.
 * ⭐ CLIENT CODE THAT READS ITS OWN WORDS (round 5's follow-up, R5-H · G-2): so the loading file hands it nothing and a
 * refresh of /updown carries its reference, not this tree — `components/ui/page-loader.tsx` has the convention.
 */
export function UpDownGhost() {
  const { t } = useT();
  return (
    <div className="mx-auto w-full max-w-board px-3 lg:px-6 py-6" aria-busy="true">
      {/* ⭐ THE PAGE'S OWN HEADER, SAME PROPS (R5-H · G-2b): eyebrow, title and tagline as `updown/page.tsx` draws them, so
          the tagline wraps where the page's does in every language (its two pills sit beside the title row, 45px in a
          54px row, and set no height). A 40px bar stood for the title and nothing for the tagline: 18.5px short at 1280. */}
      <div className="mb-4">
        <PageHeader eyebrow={t.market.udStreaming} title={t.market.udTitle} subtitle={t.market.udTagline} />
      </div>
      {/* price tape */}
      {/* ⚠️ LITERAL, not `h-10` — spacing is overridden (tailwind.config.ts:200-215) so the
          price tape ghost drew 80px. 41.5px is the tape's one row (1 + 10 + 19.5 + 10 + 1, R5-H · G-2b; it was 44); a
          phone with many assets wraps the tape to more rows, which a ghost cannot know. */}
      <div className="mt-4 h-[41.5px] rounded-xl bg-bg-inset kp-shimmer-track" aria-hidden />
      {/* ⭐ A PHONE'S ONE TRIGGER (R5-H · G-2b): below `sm` the board shows a single 48px field that names the asset and the
          duration (`updown-board-tabs.tsx`, `mt-4 sm:hidden`); the two pill rows are `hidden sm:flex`. The ghost drew both
          rows at every width — 116px where a phone has 68. */}
      <div className="mt-4 sm:hidden" aria-hidden>
        <div className="h-[var(--h-control-lg)] w-full rounded-control bg-bg-inset kp-shimmer-track" />
      </div>
      {/* asset + duration tabs, from `sm` */}
      <div className="mt-4 hidden gap-2 sm:flex" aria-hidden>
        {/* ⚠️ LITERAL, not `h-9`. This skeleton was the LAST surviving copy of a bug the code
            already fixed: the asset tabs migrated to FilterPill's deliberate `min-h-[44px]`,
            but the ghost still reproduced the old 64px that `h-9` renders on this repo's
            overridden scale (tailwind.config.ts:200-215). */}
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[44px] w-[96px] rounded-md bg-bg-elevated kp-shimmer-track" />)}
      </div>
      {/* The durations are 44px FilterPills too (R5-H · G-2b: `h-7` drew 40). */}
      <div className="mt-2 hidden gap-1.5 sm:flex" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[44px] w-[64px] rounded-md bg-bg-inset kp-shimmer-track" />)}
      </div>
      {/* ⭐ THE BOARD'S HEARTBEAT, `BoardViz` (R5-H · G-2b: missing, 100px): its eyebrow beside the cubes | chart toggle — the
          rail's 44px buttons in a 2px pad and a 1px border, 50px — then `mt-2` and the strip of the last rounds' 18px cubes
          (one line; a phone with many rounds may wrap it). Drawn when the board has both, the page's common case. */}
      <div className="mt-4" aria-hidden>
        <div className="flex items-center justify-between gap-3">
          <div className="h-3 w-[96px] rounded bg-bg-elevated kp-shimmer-track" />
          <div className="h-[50px] w-[136px] rounded-pill bg-bg-elevated kp-shimmer-track" />
        </div>
        <div className="mt-2 h-[18px] w-[240px] max-w-full rounded-sm bg-bg-inset kp-shimmer-track" />
      </div>
      {/* card grid — same shape as the live grid so nothing shifts */}
      <div className="mt-4 grid items-stretch gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }} aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-elevated kp-shimmer-track" style={{ height: 360 }} />
        ))}
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
