"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

// B-1 — route boundary so a failed attestation read renders a retryable error,
// never a fabricated "no resolved markets yet" state.
export default function FairnessError({
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
      logTag="fairness"
      body={t.error.pageHitSnagBody}
      back={{ href: "/markets", label: t.error.backToMarkets }}
    />
  );
}
