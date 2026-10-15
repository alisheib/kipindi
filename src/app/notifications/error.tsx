"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";
import { useJourneyOn } from "@/lib/journey/journey-on";

/**
 * B-1 — a route boundary so a failed read renders a retryable error.
 *
 * ⛔ NEVER an empty state. "You have no notifications" over a query that threw is a false
 * statement about a player's money history, and it is indistinguishable from the truth.
 */
export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  const journeyOn = useJourneyOn();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="notifications"
      body={t.error.pageHitSnagBody}
      back={{ href: journeyOn ? "/" : "/markets", label: journeyOn ? t.journey.tabQuestions : t.error.backToMarkets }}
    />
  );
}
