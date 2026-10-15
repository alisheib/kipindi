"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";
import { useJourneyOn } from "@/lib/journey/journey-on";

// B-1 — route boundary so a failed archive read renders a retryable error,
// never a fabricated "no results yet" board.
export default function ResultsError({
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
      logTag="results"
      body={t.error.pageHitSnagBody}
      back={{ href: journeyOn ? "/" : "/markets", label: journeyOn ? t.journey.tabQuestions : t.error.backToMarkets }}
    />
  );
}
