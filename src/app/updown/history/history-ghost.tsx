import { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";
import type { Dict } from "@/lib/i18n-dict";

/**
 * /updown/history loading skeleton, for both shells — the journey's head (Tiketi zangu's name and switch) or today's two
 * lines, by `journey`, the answer `loading.tsx` (this folder) asks on the server (S6 WP9, VODACOM-PLAN §0h point 21).
 * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` draws it with that answer
 * and the words it reads, and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it in the
 * browser, for a journey reader, on a move here. So it reads nothing itself, and its module may load in the browser.
 * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.
 */
export function UpDownHistoryGhost({ t, journey }: { t: Dict; journey: boolean }) {
  return (
    <div className="mx-auto w-full max-w-reading px-3 lg:px-6 py-6" aria-busy="true">
      {journey ? <TicketsHeadGhost t={t} /> : <div className="h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track" aria-hidden />}
      {journey ? null : <div className="mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[80px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track" />)}
      </div>
      <div className="mt-4 h-64 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
