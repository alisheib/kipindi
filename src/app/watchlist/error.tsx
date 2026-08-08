"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

// B-1 — route boundary so a failed watchlist read renders a retryable error,
// never a fabricated "your watchlist is empty" state.
export default function WatchlistError({
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
      logTag="watchlist"
      body={t.error.pageHitSnagBody}
      back={{ href: "/markets", label: t.error.backToMarkets }}
    />
  );
}
