"use client";

import { RouteError } from "@/components/ui/route-error";
import { useT } from "@/lib/i18n";

/**
 * 🔴 THE `/agent` TREE WAS THE ONE MAJOR PLAYER-FACING TREE WITH NO ERROR BOUNDARY.
 *
 * `status/page.tsx` documents its own read-failure contract as "a failed read THROWS to the
 * route's error boundary" — and there was none, so a failed read fell all the way to the root
 * boundary, whose recovery links are `/markets` and `/help`. Neither returns an applicant to
 * their application. Fifteen sibling trees (profile, wallet, markets, positions, proposals,
 * notifications, watchlist, leaderboard, live, results, fairness, updown ×3, auth, admin) all
 * had one; this tree did not.
 *
 * ⚠️ AND THE STAKES HERE ARE PARTICULAR. The person most likely to hit this has paid the
 * registration fee out of band and is waiting on a decision. Sending them to the markets board is
 * the least reassuring thing the product could do, so the back link is `/agent/status` — the
 * page that tells them where their money and their application stand.
 */
export default function AgentError({
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
      logTag="agent"
      body={t.error.agentSafe}
      back={{ href: "/agent/status", label: t.error.backToAgentStatus }}
    />
  );
}
