"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

// B-1 — route boundary so a failed ranking read renders a retryable error,
// never an empty (or synthetic) board.
export default function LeaderboardError({
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
      logTag="leaderboard"
      body={t.error.pageHitSnagBody}
      back={{ href: "/markets", label: t.error.backToMarkets }}
    />
  );
}
