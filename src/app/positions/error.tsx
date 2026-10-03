"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";
import { useJourneyOn } from "@/lib/journey/journey-on";

/**
 * S6 WP9 step 7 — a journey reader is told about their TICKETS: the body and the back link's words
 * (`journey.ticketsErrorBody`, `journey.ticketsBack`: no "nafasi", A7); RouteError's own eyebrow and headline are
 * everybody's, and everybody else reads today's words. An error page is a client component (Next requires it) and is
 * never drawn on the server — React's server renderer cannot run an error boundary — so it mounts in the browser as a
 * fresh render, where `useJourneyOn` reads the shell's mark, already in the page: a journey reader's first sight of it
 * is already in the tickets' words.
 */
export default function PositionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  const journeyOn = useJourneyOn();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="positions"
      body={journeyOn ? t.journey.ticketsErrorBody : t.error.positionsSafe}
      back={{ href: "/positions", label: journeyOn ? t.journey.ticketsBack : t.error.backToPositions }}
    />
  );
}
