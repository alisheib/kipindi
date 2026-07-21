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
      ? { fontSize: 8.5, padding: "1.5px 6px", gap: 3, icon: 9 }
      : { fontSize: 9.5, padding: "2.5px 8px", gap: 4, icon: 11 };
  return (
    <span
      className={cn(
        "cs-badge inline-flex items-center rounded-pill font-mono font-bold uppercase tracking-[0.1em] whitespace-nowrap leading-none align-middle",
        className,
      )}
      style={{ fontSize: d.fontSize, padding: d.padding }}
    >
      <span className="inline-flex items-center" style={{ gap: d.gap }}>
        <I.sparkle s={d.icon} aria-hidden />
        {label}
      </span>
    </span>
  );
}
