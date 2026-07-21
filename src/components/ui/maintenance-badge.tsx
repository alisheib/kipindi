import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

/**
 * MaintenanceBadge — the amber "temporarily unavailable" flag.
 *
 * The deliberate counterpart to the gilt <ComingSoonBadge>: where "coming soon"
 * is aspirational (shiny gold, a gear-free clock), maintenance is *temporary and
 * functional* — a FLAT amber `--warning` tag with a gear glyph and NO shimmer, so
 * the two states are unmistakable at a glance and never confused with each other
 * or with the NO-rose danger hue. Presentational only (no hooks) so it renders in
 * both server and client components; the caller passes the localized label.
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
  const d =
    size === "xs"
      ? { fontSize: 8.5, padding: "3px 8px", gap: 4, icon: 9.5, tracking: "0.08em" }
      : { fontSize: 9.5, padding: "4px 10px", gap: 5, icon: 11, tracking: "0.11em" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill font-mono font-bold uppercase whitespace-nowrap leading-none align-middle",
        className,
      )}
      style={{
        fontSize: d.fontSize,
        padding: d.padding,
        letterSpacing: d.tracking,
        color: "var(--warning-500)",
        background: "color-mix(in oklab, var(--warning-500) 16%, transparent)",
        border: "1px solid color-mix(in oklab, var(--warning-500) 42%, transparent)",
      }}
    >
      <span className="inline-flex items-center" style={{ gap: d.gap }}>
        <I.pause s={d.icon} aria-hidden />
        {label}
      </span>
    </span>
  );
}
