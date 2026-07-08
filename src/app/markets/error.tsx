"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MarketsError({
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
      logTag="markets"
      body={t.error.pageHitSnagBody}
      back={{ href: "/markets", label: t.error.backToMarkets }}
    />
  );
}
