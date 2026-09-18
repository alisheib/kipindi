import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The two caption props are a PAIR, and the type refuses one without the other (C7-SPEC ruling 362).
 *
 * ⛔ WHY TWO AND NOT ONE. The draft asked for a single `caption` feeding both the painted line and `aria-valuetext`.
 * `aria-valuetext` is a STRING attribute; a caption that must carry `.amount` spans is a `ReactNode`, and
 * `aria-valuetext={caption}` stamps `[object Object]` into the DOM for every screen-reader user and into any served
 * body a scanner reads. So the painted node and the announced sentence are separate, and the caller builds both from
 * ONE server expression so they can never disagree.
 */
export type ProgressBarCaption =
  | { caption?: undefined; captionText?: undefined }
  | {
      /** REPLACES the built-in numeric line. The cap's NAME first, each figure in its own `<span className="amount">`. */
      caption: ReactNode;
      /** The same sentence as plain text, for `aria-valuetext`. Required whenever `caption` is given. */
      captionText: string;
    };

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
  caption,
  captionText,
}: {
  value: number;
  max: number;
  /** Announced to assistive tech. Say what is progressing, not just "progress". */
  label: string;
  tone?: "brand" | "claret";
  className?: string;
} & ProgressBarCaption) {
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
        aria-valuetext={captionText}
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
      {/* ⛔ THE BUILT-IN LINE RENDERS ONLY WHEN THERE IS NO CAPTION — never both. The kit's own line is
          `font-mono text-micro uppercase tracking-widest` over `toLocaleString()`: a bare, letter-spaced number with
          no currency unit, which §M4 forbids over an amount. A caller that needs to name what is being measured
          REPLACES it rather than printing a second line beneath it. */}
      {caption ? (
        /* ⛔ THE SENTENCE IS NOT `.amount`. That class is `white-space: nowrap`, so a whole nowrap sentence overflows
           a 360 card; the caller puts each FIGURE in its own `.amount` span and lets the words wrap around them. */
        <p className="text-body-sm text-text-muted">{caption}</p>
      ) : (
        <p className="font-mono text-micro uppercase tracking-widest text-text-tertiary tabular-nums">
          {value.toLocaleString()} of {safeMax.toLocaleString()} · {pct.toFixed(0)}%
        </p>
      )}
    </div>
  );
}
