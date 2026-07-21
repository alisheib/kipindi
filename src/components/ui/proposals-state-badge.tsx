import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";
import { MaintenanceBadge } from "@/components/ui/maintenance-badge";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * ProposalsStateBadge — the single decision point for which flag (if any) rides
 * a proposals entry point, keyed off the feature state:
 *   COMING_SOON → gilt <ComingSoonBadge>  (aspirational)
 *   MAINTENANCE → amber <MaintenanceBadge> (temporary)
 *   ACTIVE / DISABLED → nothing            (active shows no flag; disabled is
 *                                           removed entirely by the caller)
 *
 * Presentational (no hooks) so it works in both server and client trees; the
 * caller passes the two localized labels from its own `t` (server or client).
 * `import type` keeps the server-only config module out of the client bundle.
 */
export function ProposalsStateBadge({
  state,
  comingSoonLabel,
  maintenanceLabel,
  size = "sm",
  className,
}: {
  state: ProposalsState;
  comingSoonLabel: string;
  maintenanceLabel: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  if (state === "COMING_SOON") return <ComingSoonBadge label={comingSoonLabel} size={size} className={className} />;
  if (state === "MAINTENANCE") return <MaintenanceBadge label={maintenanceLabel} size={size} className={className} />;
  return null;
}
