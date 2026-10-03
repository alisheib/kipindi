import { getServerT } from "@/lib/i18n-server";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";

export default async function UpDownHistoryLoading() {
  /* ⭐ S6 WP9 (VODACOM-PLAN §0h point 21): the head is chosen on the server, from the answer the page will give —
     Tiketi zangu's name and switch for a journey request, today's two lines for everybody else; the rest is everybody's.
     ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree. */
  const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);
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
