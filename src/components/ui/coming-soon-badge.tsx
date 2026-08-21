import { StatusFlag } from "@/components/ui/status-flag";
import { cn } from "@/lib/utils";

/**
 * ComingSoonBadge — the single shiny-gilt "coming soon" flag.
 *
 * Used on every propose-a-pool entry point so players see, unmistakably, that
 * the feature is not open for submissions yet while the link itself stays
 * functional (it's informational). Presentational only (no hooks) so it renders
 * in both server and client components; the caller passes the localized label.
 * The gilt sweep lives in `.cs-badge` (globals.css) and honours reduced motion.
 *
 * ⭐ The metrics moved to <StatusFlag> (2026-08-21): this file and
 * maintenance-badge.tsx each carried the SAME size table. Only the skin is local
 * now. Signature unchanged — no call site moves.
 */
export function ComingSoonBadge({
  label,
  size = "sm",
  className,
}: {
  label: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  return <StatusFlag label={label} glyph="clock" size={size} className={cn("cs-badge", className)} />;
}
