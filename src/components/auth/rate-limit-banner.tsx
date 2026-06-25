"use client";

/**
 * RateLimitBanner — shows a rate-limit warning with a countdown pill.
 * Automatically clears itself when the countdown expires by navigating
 * to the same page without the error params, so the player sees a
 * clean form ready for a fresh attempt.
 */

import { useRouter } from "next/navigation";
import { CountdownPill } from "@/components/ui/countdown-pill";

export function RateLimitBanner({
  seconds,
  clearHref,
}: {
  seconds: number;
  /** URL to navigate to when the countdown expires (strips error params). */
  clearHref: string;
}) {
  const router = useRouter();

  return (
    <span>
      You can try again in{" "}
      <CountdownPill
        seconds={seconds}
        suffix="· Subiri"
        onExpire={() => router.replace(clearHref as never)}
      />
      .
    </span>
  );
}
