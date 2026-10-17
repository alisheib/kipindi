"use client";

/**
 * /millionea/tickets/[serial]'s error boundary — a failed read is named and retryable, with the way back to the reader's
 * tickets (B-1); never a not-found drawn over a ticket that may hold the reader's money.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaTicketError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-ticket"
      body={t.error.pageHitSnagBody}
      back={{ href: "/millionea/tickets", label: t.millionea.myTicketsTitle }}
    />
  );
}
