"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

/**
 * Root error boundary — the shared RouteError surface (FiftyMark + BrandTopo
 * frame). Recovery paths: retry the route, go to markets, or reach support.
 * We never echo the raw error/stack to the player; the digest lets the
 * operator correlate a user report with the server log.
 */
export default function GlobalError({
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
      body={t.error.pageHitSnagBody}
      back={[
        { href: "/markets", label: t.error.backToMarkets },
        { href: "/help", label: t.error.contactSupport },
      ]}
    />
  );
}
