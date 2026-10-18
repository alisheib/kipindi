"use client";

/** /millionea/register's error boundary — a failed read of the record is named and retryable, never an empty register. */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaRegisterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-register"
      body={t.error.pageHitSnagBody}
      back={{ href: "/millionea", label: t.millionea.productTitle }}
    />
  );
}
