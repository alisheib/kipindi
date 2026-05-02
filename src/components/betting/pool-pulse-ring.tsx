import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The signature differentiator — a gold ring that breathes around the pool number,
 * with intensity tied to live match momentum / event frequency.
 * Spec §2.12 PoolPulseRing.
 */
export function PoolPulseRing({
  intensity = 0.5,
  active = false,
  className,
  children,
}: {
  intensity?: number; // 0..1
  active?: boolean;   // true = faster pulse (live event window)
  className?: string;
  children?: React.ReactNode;
}) {
  const opacity = 0.4 + Math.min(1, Math.max(0, intensity)) * 0.4;
  const blur = 24 + intensity * 32;
  const ringStyle: CSSProperties = {
    ["--ring-opacity" as string]: opacity,
    ["--ring-shadow" as string]: `0 0 ${blur}px rgba(222, 188, 84, ${0.4 + intensity * 0.3}), 0 0 ${blur * 2}px rgba(181, 138, 33, ${0.2 + intensity * 0.2})`,
  };
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full pointer-events-none",
          active ? "kp-pool-pulse-active" : "kp-pool-pulse",
        )}
        style={{ ...ringStyle, border: "3px solid var(--gold)" }}
      />
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(80% 80% at 50% 50%, rgba(222,188,84,0.10) 0%, transparent 70%)" }}
      />
      {children}
    </div>
  );
}
