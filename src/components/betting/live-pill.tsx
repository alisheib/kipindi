import { cn } from "@/lib/utils";

/** Live indicator — gold pulsing dot + tabular minute. Broadcast-style but brand-aligned. */
export function LivePill({ minute, size = "md", className }: { minute?: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = size === "sm"
    ? "h-5 px-1.5 text-micro gap-1"
    : size === "lg"
      ? "h-7 px-2.5 text-label gap-1.5"
      : "h-6 px-2 text-caption gap-1.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm font-bold tabular tracking-[0.12em] uppercase border bg-bg-elevated/40 backdrop-blur-sm border-gold-subtleHover/40 text-gold",
        sizeClass,
        className,
      )}
    >
      <span aria-hidden className="relative inline-flex items-center justify-center">
        <span className="absolute h-2 w-2 rounded-pill bg-gold kp-ping" />
        <span className="h-1.5 w-1.5 rounded-pill bg-gold" />
      </span>
      <span>Live</span>
      {typeof minute === "number" && (
        <>
          <span className="text-text-tertiary opacity-50 normal-case">·</span>
          <span className="text-text font-bold normal-case">{minute}&prime;</span>
        </>
      )}
    </span>
  );
}
