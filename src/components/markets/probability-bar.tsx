/**
 * ProbabilityBar — the heartbeat atom of 50pick.
 * YES grows from the LEFT, NO grows from the RIGHT. Always. Globally.
 * Variants: split (default) · segmented · minimal · resolved.
 */
import { cn } from "@/lib/utils";

type Props = {
  yesPct: number;
  size?: "micro" | "large";
  variant?: "split" | "segmented" | "minimal";
  resolved?: boolean;
  showLabels?: boolean;
  className?: string;
};

export function ProbabilityBar({ yesPct, size = "micro", variant = "split", resolved, showLabels, className }: Props) {
  const yes = Math.max(0, Math.min(100, yesPct));
  const no = 100 - yes;

  if (variant === "minimal") {
    const lead = yes >= 50 ? "yes" : "no";
    const fill = lead === "yes" ? yes : no;
    return (
      <div
        role="progressbar"
        aria-valuenow={yes}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES probability ${yes}%`}
        className={cn("relative w-full overflow-hidden rounded-pill border border-border bg-bg-overlay", size === "large" ? "h-6" : "h-3", className)}
      >
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-stage"
          style={{
            width: `${fill}%`,
            background: lead === "yes"
              ? "linear-gradient(90deg, var(--yes-700), var(--yes-400))"
              : "linear-gradient(90deg, var(--no-700), var(--no-400))",
            transition: "width var(--ease-stage)",
          }}
        />
        {size === "large" && showLabels && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] font-semibold text-white">
            {lead === "yes" ? "YES" : "NO"} {fill}%
          </span>
        )}
      </div>
    );
  }

  if (variant === "segmented") {
    return (
      <div
        role="progressbar"
        aria-valuenow={yes}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`YES probability ${yes}%`}
        className={cn("flex gap-1", size === "large" ? "h-6" : "h-3", className)}
      >
        <div
          className="rounded-pill flex items-center justify-start pl-2 font-mono text-[11px] font-semibold transition-[width]"
          style={{
            width: `${yes}%`,
            background: "linear-gradient(90deg, var(--yes-600), var(--yes-500))",
            color: "oklch(15% 0.04 150)",
            transition: "width var(--ease-stage)",
          }}
        >
          {size === "large" && showLabels && `${yes}%`}
        </div>
        <div
          className="rounded-pill flex items-center justify-end pr-2 font-mono text-[11px] font-semibold transition-[width]"
          style={{
            width: `${no}%`,
            background: "linear-gradient(270deg, var(--no-600), var(--no-500))",
            color: "white",
            transition: "width var(--ease-stage)",
          }}
        >
          {size === "large" && showLabels && `${no}%`}
        </div>
      </div>
    );
  }

  // split (default)
  return (
    <div
      role="progressbar"
      aria-valuenow={yes}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`YES probability ${yes}%`}
      className={cn("pbar", size === "large" ? "pbar-large" : "pbar-micro", resolved && "pbar-resolved", className)}
    >
      <div className="pbar-yes" style={{ width: `${yes}%` }} />
      <div className="pbar-no"  style={{ width: `${no}%` }} />
      {size === "large" && showLabels && (
        <>
          <span className="pbar-label pbar-label-yes">{yes}%</span>
          <span className="pbar-label pbar-label-no">{no}%</span>
        </>
      )}
      <div
        className="absolute inset-y-0 w-[2px] -translate-x-px bg-bg-elevated/60 pointer-events-none"
        style={{ left: `${yes}%` }}
      />
    </div>
  );
}
