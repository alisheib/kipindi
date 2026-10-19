"use client";

/**
 * /millionea/slip's error boundary — a failed read is named and retryable, with the way back to the hub (B-1). Nothing
 * was bought: a purchase is the confirm sheet's own act, and its refusals are said where it was pressed.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaSlipError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-slip"
      body={t.error.pageHitSnagBody}
      back={{ href: "/millionea", label: t.millionea.productTitle }}
    />
  );
}
