"use client";

/**
 * /millionea/tickets' error boundary — a failed read is named and retryable (B-1): never "no tickets yet" drawn over a
 * player's money. Its way back is the reader's other tickets, in the reader's own words for that page: Tiketi zangu on
 * a journey phone, the classic word for everybody else (`useJourneyOn`, as the conviction dial's door; r6c 6.6).
 */
import { RouteError } from "@/components/ui/route-error";
import { useJourneyOn } from "@/lib/journey/journey-on";
import { useT } from "@/lib/i18n";

export default function MillioneaTicketsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  const journeyOn = useJourneyOn();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-tickets"
      body={t.error.pageHitSnagBody}
      back={{ href: "/positions", label: journeyOn ? t.journey.tabTickets : t.common.positions }}
    />
  );
}
