"use client";

/**
 * /millionea/tickets' error boundary — a failed read is named and retryable (B-1): never "no tickets yet" drawn over a
 * player's money. Its way back is the reader's other tickets.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaTicketsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-tickets"
      body={t.error.pageHitSnagBody}
      back={{ href: "/positions", label: t.common.positions }}
    />
  );
}
