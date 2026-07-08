"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function ProposalsError({
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
      logTag="proposals"
      body={t.error.pageHitSnagBody}
      back={{ href: "/proposals", label: t.error.backToProposals }}
    />
  );
}
