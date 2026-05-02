import { cn, hexToRgba } from "@/lib/utils";
import type { Team } from "@/lib/mock-data";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "h-7 w-7 text-caption",
  md: "h-10 w-10 text-label",
  lg: "h-14 w-14 text-body",
  xl: "h-20 w-20 text-body-lg",
};

export function TeamBadge({ team, size = "md", glow = false, className }: { team: Team; size?: Size; glow?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-pill font-display font-bold text-white select-none",
        sizeClass[size],
        className,
      )}
      style={{
        backgroundColor: team.color,
        backgroundImage: [
          "radial-gradient(120% 120% at 30% 18%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)",
          "radial-gradient(120% 120% at 80% 90%, rgba(0,0,0,0.20), rgba(0,0,0,0) 55%)",
        ].join(", "),
        boxShadow: glow
          ? `0 0 0 2px ${hexToRgba(team.color, 0.35)}, 0 0 24px ${hexToRgba(team.color, 0.55)}, inset 0 1px 0 rgba(255,255,255,0.25)`
          : `0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)`,
      }}
      aria-label={team.name}
    >
      <span className="relative z-10 drop-shadow-sm">{team.initials}</span>
    </div>
  );
}
