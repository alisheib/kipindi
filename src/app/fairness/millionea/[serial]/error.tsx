"use client";

/**
 * /fairness/millionea/[serial]'s error boundary — a failed read is named and retryable (B-1), with the way back to the
 * Fairness page; never a not-found drawn over a proof that exists. ⛔ No word of the product here either: an error can only
 * follow the gate's admission, but the boundary is written to say nothing a hidden product would not.
 */
import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

export default function MillioneaProofError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <RouteError
      error={error}
      reset={reset}
      logTag="millionea-proof"
      body={t.error.pageHitSnagBody}
      back={{ href: "/fairness", label: t.footer.fairness }}
    />
  );
}
