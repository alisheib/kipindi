"use client";

/** /millionea/register/[week]'s error boundary — a failed read is named and retryable, with the way back to the register. */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaRegisterWeekError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-register-week"
      body={t.error.pageHitSnagBody}
      back={{ href: "/millionea/register", label: t.millionea.registerTitle }}
    />
  );
}
