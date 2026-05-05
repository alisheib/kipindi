/**
 * 50pick brand-spinner — used wherever we'd otherwise render a generic spinner.
 * The logo's "0" rotates with a faint orbiting gold dot at the top, set at
 * 0.65 opacity over the chrome so it reads as an animation, not chrome.
 *
 * Sizes: 24 (inline), 36 (default), 56 (page), 96 (full-screen).
 */
import { cn } from "@/lib/utils";

type Props = { size?: 24 | 36 | 56 | 96; className?: string; ariaLabel?: string };

export function BrandSpinner({ size = 36, className, ariaLabel = "Loading" }: Props) {
  const stroke = size <= 24 ? 2 : size <= 36 ? 3 : 4;
  const dot = size <= 24 ? 2 : size <= 36 ? 3 : 4.5;
  const r = (size - stroke) / 2;
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn("inline-block relative", className)}
      style={{ width: size, height: size }}
    >
      {/* Static teal arc — the "C" of 50pick's monogram (3/4 ring) */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--teal-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(2 * Math.PI * r) * 0.78} ${(2 * Math.PI * r) * 0.22}`}
          strokeDashoffset={(2 * Math.PI * r) * 0.05}
          opacity={0.65}
        />
      </svg>
      {/* Rotating gold orbit dot — the "i" dot of 50pick */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 [animation:spin_1.4s_linear_infinite]"
        aria-hidden
        style={{ transformOrigin: "center" }}
      >
        <circle cx={size / 2} cy={stroke / 2 + dot} r={dot} fill="var(--gold-400)" />
      </svg>
    </span>
  );
}

/** Full-screen loading wrapper. Centred spinner + optional caption. */
export function BrandLoader({ caption }: { caption?: string }) {
  return (
    <div className="fixed inset-0 z-modal grid place-items-center bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <BrandSpinner size={96} />
        {caption && (
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-muted">{caption}</p>
        )}
      </div>
    </div>
  );
}

/** Inline section-loader. Use it as <Suspense fallback={<SectionLoader/>}>. */
export function SectionLoader({ height = 240 }: { height?: number }) {
  return (
    <div
      className="rounded-lg border border-border bg-bg-elevated grid place-items-center"
      style={{ height }}
    >
      <BrandSpinner size={56} />
    </div>
  );
}
