/**
 * Multi-segment progress — ported from the 50pick kit.
 * Used on /admin/markets/new wizard, KYC, and any multi-step ops flow.
 */
import { cn } from "@/lib/utils";

export function SteppedProgress({ steps, current, className }: { steps: number; current: number; className?: string }) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {Array.from({ length: steps }).map((_, i) => (
        <div
          key={i}
          className={cn("flex-1 h-1 rounded-pill transition-colors", i === current && "prog-sweep")}
          style={{
            background: i < current ? "var(--royal-400)" : i === current ? "var(--royal-500)" : "var(--bg-overlay)",
            boxShadow: i === current ? "0 0 8px -1px color-mix(in oklab, var(--royal-400) 60%, transparent)" : "none",
            transition: "background var(--dur-quick) var(--ease-stage)",
          }}
        />
      ))}
    </div>
  );
}
