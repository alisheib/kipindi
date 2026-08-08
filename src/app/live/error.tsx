"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

// B-1 — route boundary so a failed board read renders a retryable error,
// never a fabricated "no live markets right now" wall.
export default function LiveError({
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
      logTag="live"
      body={t.error.pageHitSnagBody}
      back={{ href: "/markets", label: t.error.backToMarkets }}
    />
  );
}
