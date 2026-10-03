"use client";

/**
 * UD-15 · the error boundary this route never had. A DB outage used to render as a
 * calm empty state (the data fetch swallowed to null) — "no games today" over a
 * platform fault, on a surface holding players' money. Real throws now reach THIS
 * boundary: named, retryable, never disguised as an empty board or a 404.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";
import { useJourneyOn } from "@/lib/journey/journey-on";

export default function UpDownError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  // S6 WP9 (A7): this page is Tiketi zangu's Up & Down kind for a journey reader, whose error must not say "nafasi"
  // (the classic body does, in Swahili), so only the BODY changes for them; the back link and RouteError's own eyebrow
  // and headline are everybody's. Never drawn on the server (React's server renderer cannot run an error boundary): it
  // mounts in the browser as a fresh render, where `useJourneyOn` reads the shell's mark, already in the page — so a
  // journey reader's first sight of it already has the tickets' body.
  const journeyOn = useJourneyOn();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="updown-history"
      body={journeyOn ? t.journey.ticketsErrorBody : t.error.pageHitSnagBody}
      back={{ href: "/updown", label: t.market.udBackToBoard }}
    />
  );
}
