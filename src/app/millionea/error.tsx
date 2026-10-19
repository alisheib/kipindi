"use client";

/**
 * /millionea's error boundary — a failed read is named and retryable, never a calm "no week on sale" drawn over a
 * platform fault on a surface that holds players' money (B-1, `/updown`'s UD-15).
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea"
      body={t.error.pageHitSnagBody}
      back={{ href: "/", label: t.common.home }}
    />
  );
}
