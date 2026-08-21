import { I, type GlyphKey } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

/**
 * StatusFlag — the shell behind <ComingSoonBadge> and <MaintenanceBadge>.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). Those two files carried the SAME
 * size dictionary, byte for byte:
 *
 *   xs → 8.5px / 3px 8px / gap 4 / icon 9.5 / 0.08em
 *   sm → 9.5px / 4px 10px / gap 5 / icon 11  / 0.11em
 *
 * Two copies of one table is a table that will disagree with itself the first
 * time one badge is nudged. It is written ONCE here; both badges are now thin
 * wrappers that keep their existing exports and prop signatures unchanged, so no
 * call site moves and no pixel moves.
 *
 * What stays SPLIT is the only thing that was ever meant to differ: the skin.
 * "Coming soon" is aspirational and wears the gilt sweep (`.cs-badge`, which owns
 * its own reduced-motion branch); "maintenance" is temporary and functional, so
 * it is a FLAT amber tag with no shimmer. That contrast is the whole point — a
 * player must never read one as the other, and neither as the NO-rose danger hue.
 */

export type StatusFlagSize = "xs" | "sm";

/** THE size table. One home. */
export const STATUS_FLAG_SIZE: Record<StatusFlagSize, {
  fontSize: number;
  padding: string;
  gap: number;
  icon: number;
  tracking: string;
}> = {
  xs: { fontSize: 8.5, padding: "3px 8px", gap: 4, icon: 9.5, tracking: "0.08em" },
  sm: { fontSize: 9.5, padding: "4px 10px", gap: 5, icon: 11, tracking: "0.11em" },
};

export function StatusFlag({
  label,
  glyph,
  size = "sm",
  className,
  style,
}: {
  label: string;
  /** Which kit glyph rides in front of the label. */
  glyph: GlyphKey;
  size?: StatusFlagSize;
  /** Skin classes — e.g. `cs-badge` for the gilt sweep. */
  className?: string;
  /** Skin colours for a flat tag (maintenance). Merged AFTER the metrics. */
  style?: React.CSSProperties;
}) {
  const d = STATUS_FLAG_SIZE[size];
  const Glyph = I[glyph];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill font-mono font-bold uppercase whitespace-nowrap leading-none align-middle",
        className,
      )}
      style={{ fontSize: d.fontSize, padding: d.padding, letterSpacing: d.tracking, ...style }}
    >
      <span className="inline-flex items-center" style={{ gap: d.gap }}>
        <Glyph s={d.icon} aria-hidden />
        {label}
      </span>
    </span>
  );
}
