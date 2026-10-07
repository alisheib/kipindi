"use client";

/**
 * RateLimitBanner — shows a rate-limit warning with a countdown pill.
 * Given a `clearHref`, it clears itself when the countdown expires by
 * navigating to the same page without the error params, so the player
 * sees a clean form ready for a fresh attempt. Without `clearHref` the
 * pill simply reaches Ready: the sign-up form holds its refusal in the
 * mounted form, not in the URL, so there is nothing to navigate away
 * from (auth/register/register-form.tsx, 2026-10-06).
 */

import { useRouter } from "next/navigation";
import { CountdownPill } from "@/components/ui/countdown-pill";
import { useT } from "@/lib/i18n";

export function RateLimitBanner({
  seconds,
  clearHref,
}: {
  seconds: number;
  /** URL to navigate to when the countdown expires (strips error params). Without it the pill simply reaches Ready. */
  clearHref?: string;
}) {
  const router = useRouter();
  const { t } = useT();

  return (
    <span>
      {t.common.tooManyAttempts}{" "}
      <CountdownPill
        seconds={seconds}
        onExpire={clearHref ? () => router.replace(clearHref as never) : undefined}
      />
    </span>
  );
}
