import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

/**
 * ComingSoonBadge — the single shiny-gilt "coming soon" flag.
 *
 * Used on every propose-a-pool entry point so players see, unmistakably, that
 * the feature is not open for submissions yet while the link itself stays
 * functional (it's informational). Presentational only (no hooks) so it renders
 * in both server and client components; the caller passes the localized label.
 * The gilt sweep lives in `.cs-badge` (globals.css) and honours reduced motion.
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
  const d =
    size === "xs"
      ? { fontSize: 8.5, padding: "3px 8px", gap: 4, icon: 9.5, tracking: "0.08em" }
      : { fontSize: 9.5, padding: "4px 10px", gap: 5, icon: 11, tracking: "0.11em" };
  return (
    <span
      className={cn(
        "cs-badge inline-flex items-center rounded-pill font-mono font-bold uppercase whitespace-nowrap leading-none align-middle",
        className,
      )}
      style={{ fontSize: d.fontSize, padding: d.padding, letterSpacing: d.tracking }}
    >
      <span className="inline-flex items-center" style={{ gap: d.gap }}>
        <I.sparkle s={d.icon} aria-hidden />
        {label}
      </span>
    </span>
  );
}
