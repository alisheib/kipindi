"use client";

/**
 * UD-15 · the error boundary this route never had. A DB outage used to render as a
 * calm empty state (the data fetch swallowed to null) — "no games today" over a
 * platform fault, on a surface holding players' money. Real throws now reach THIS
 * boundary: named, retryable, never disguised as an empty board or a 404.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function UpDownError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="updown-round"
      body={t.error.pageHitSnagBody}
      back={{ href: "/updown", label: t.market.udBackToBoard }}
    />
  );
}
