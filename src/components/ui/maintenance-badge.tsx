import { StatusFlag } from "@/components/ui/status-flag";
import { MAINTENANCE_AMBER } from "@/components/ui/callout";

/**
 * MaintenanceBadge — the amber "temporarily unavailable" flag.
 *
 * The deliberate counterpart to the gilt <ComingSoonBadge>: where "coming soon"
 * is aspirational (shiny gold, a gear-free clock), maintenance is *temporary and
 * functional* — a FLAT amber `--warning` tag with a gear glyph and NO shimmer, so
 * the two states are unmistakable at a glance and never confused with each other
 * or with the NO-rose danger hue. Presentational only (no hooks) so it renders in
 * both server and client components; the caller passes the localized label.
 *
 * ⭐ CONSOLIDATION (stage 9, 2026-08-21). Two things left this file:
 *  • the size table → <StatusFlag> (it was byte-identical to coming-soon's);
 *  • the amber itself → `MAINTENANCE_AMBER` in callout.tsx, because there were
 *    THREE drifted maintenance ambers in the product (this one at 16%/42%,
 *    proposals-state-views at 14%/38%, and Callout's `--warning-bg`/`-border`
 *    at 18%/36%). ⚠️ This badge now paints the 18%/36% token pair — a small,
 *    deliberate shift, and the ONLY rendered change in the amber consolidation.
 *    Its FOREGROUND is unchanged: `--warning-500`, not `--warning-fg`, because a
 *    flat tag needs the amber itself, not the gilt the Callout icon uses.
 */
export function MaintenanceBadge({
  label,
  size = "sm",
  className,
}: {
  label: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  return (
    <StatusFlag
      label={label}
      glyph="pause"
      size={size}
      className={className}
      style={{
        color: "var(--warning-500)",
        background: MAINTENANCE_AMBER.bg,
        border: `1px solid ${MAINTENANCE_AMBER.border}`,
      }}
    />
  );
}
