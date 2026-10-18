"use client";

/** /millionea/how's error boundary — a failed read of the rules is named and retryable, with the way back to the hub. */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaHowError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-how"
      body={t.error.pageHitSnagBody}
      back={{ href: "/millionea", label: t.millionea.productTitle }}
    />
  );
}
