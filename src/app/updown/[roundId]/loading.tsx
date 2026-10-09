"use client";

import { useT } from "@/lib/i18n";
import { BackLinkGhost } from "@/components/ui/back-link";

/**
 * /updown/[roundId] loading skeleton.
 *
 * ⛔ UD-14 · MIRRORS THE REAL GEOMETRY, or it is the B7 defect class again. The old
 * skeleton was a single stacked column (`h-40` + `h-36`, `py-6`) while the page it
 * precedes is `pt-[22px] pb-14` with a 2-column
 * `xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]` layout — so on
 * desktop the entire page reflowed the moment content arrived, which is exactly the
 * "152px layout jump" B7 removed from the widths and this file reintroduced in the
 * columns. Same paddings, same grid (two columns from `lg`), same slot order as `page.tsx`: back-link,
 * header row (title block left, countdown pod right), then hero ghost left with the
 * pool + action ghosts stacked right. The proof ghost is deliberately absent — it
 * only exists once a round is decided, and a ghost for a panel that may never come
 * would promise a result (A-5).
 * ⭐ CLIENT CODE, ITS WORDS ITS OWN (round 5's follow-up, R5-H · G-2): the words are the client dictionary's (`useT`), so
 * a refresh of this page carries the drawing's reference, not its tree, and the server's HTML is what it was —
 * `components/ui/page-loader.tsx` has the convention.
 */
export default function UpDownRoundLoading() {
  const { t } = useT();
  return (
    <div className="mx-auto w-full max-w-board px-3 lg:px-6 pt-[22px] pb-14" aria-busy="true">
      <div className="flex flex-col gap-[18px]">
        {/* back-link — the BackLink's own 44px box (`BackLinkGhost`, R5-H · G-2b: a 20px bar stood here, 24px short) */}
        <BackLinkGhost />
        {/* header: title block · countdown pod */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {/* ⚠️ LITERALS, not `h-11 w-11` — spacing is overridden
                (tailwind.config.ts:200-215) so this medallion ghost drew 96px. */}
            <div className="h-[44px] w-[44px] rounded-full bg-bg-elevated kp-shimmer-track" aria-hidden />
            <div>
              <div className="h-6 w-56 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />
              <div className="mt-2 h-3 w-[128px] rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
            </div>
          </div>
          <div className="h-[52px] w-44 rounded-md border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
        </div>
        {/* grid: price hero (left) · action rail + pool (right). ⭐ R5-H · G-2b: two columns from `lg`, as the page (E-193;
            `xl` stacked everything between 1024 and 1279), and the action panel FIRST, the pool after it (the page's order
            since 2026-09-27 — a pick lands on #stake with the countdown in view). */}
        <div className="grid grid-cols-1 items-start gap-4 lg:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="h-[300px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
          <div className="flex min-w-0 flex-col gap-4">
            <div className="h-56 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
            <div className="h-40 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
          </div>
        </div>
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
