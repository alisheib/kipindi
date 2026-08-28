import { cn } from "@/lib/utils";

/**
 * A DETERMINATE progress bar — the first one in this kit, and deliberately determinate.
 *
 * ⛔ WHY THIS EXISTS. Every long admin job on this platform is a single blocking server action
 * behind an INDETERMINATE spinner, which tells an operator only "something is happening". For
 * a job that deletes thousands of rows one batch at a time, that is not good enough: the
 * officer needs to know how far it has got, because the honest answer to "can I close this
 * tab?" depends on it. The chain purge writes its progress to a durable row, so a real
 * fraction exists and this renders it.
 *
 * ⚠️ NOT `AiProgress`. That is an AI-generation overlay that happens to accept a percentage; it
 * announces itself as `role="status"` with `aria-live="polite"`, which is right for "we are
 * thinking" and wrong for "27 of 412 done" — a live region would read every batch aloud. This
 * is a `role="progressbar"` with `aria-valuenow`, which a screen reader reports ON REQUEST.
 *
 * ⛔ The `.pbar*` atom in globals.css is documented DEAD CSS with zero consumers; it is not
 * revived here, because reviving an unused atom to serve one caller is how two bars end up
 * meaning the same thing.
 *
 * ⭐ REDUCED MOTION. The only animation is the width transition, and it is expressed through
 * `motion-safe:` so `prefers-reduced-motion` removes it — the bar then JUMPS to each new value
 * rather than sliding, which loses nothing: the number beside it is the actual information.
 * Every keyframe in this repo ships a reduced-motion branch and this does not become the first
 * one that does not.
 */
export function ProgressBar({
  value,
  max,
  label,
  tone = "brand",
  className,
}: {
  value: number;
  max: number;
  /** Announced to assistive tech. Say what is progressing, not just "progress". */
  label: string;
  tone?: "brand" | "claret";
  className?: string;
}) {
  /* ⛔ A ZERO MAX IS NOT 100% DONE. `value/max` with max 0 is NaN or Infinity, and an
     unguarded bar renders full — telling an officer a job with nothing in it has finished
     everything. An empty job is 0%, and the caption beside it says "0 of 0". */
  const safeMax = max > 0 ? max : 0;
  const pct = safeMax === 0 ? 0 : Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.max(0, Math.min(value, safeMax))}
        aria-label={label}
        className="h-[10px] w-full overflow-hidden rounded-pill border border-border bg-bg-sunken"
      >
        <div
          className={cn(
            "h-full rounded-pill motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out",
            tone === "claret" ? "bg-[color:var(--claret-500)]" : "bg-[color:var(--brand-500)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-micro uppercase tracking-widest text-text-tertiary tabular-nums">
        {value.toLocaleString()} of {safeMax.toLocaleString()} · {pct.toFixed(0)}%
      </p>
    </div>
  );
}
