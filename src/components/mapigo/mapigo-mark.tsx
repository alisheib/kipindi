import { cn } from "@/lib/utils";

/**
 * Mapigo glyph — abstract waveform fragment with a clear spike, contained in a circle.
 * Distinct from but visually compatible with Kipindi.
 */
export function MapigoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="kp-mp-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#946D17" />
          <stop offset="60%" stopColor="#DEBC54" />
          <stop offset="100%" stopColor="#F4EAC9" />
        </linearGradient>
      </defs>
      <circle cx={32} cy={32} r={28} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.6} />
      {/* waveform fragment with one clear spike */}
      <path
        d="M 8 36 L 16 36 L 22 34 L 28 36 L 32 14 L 36 36 L 42 34 L 48 36 L 56 36"
        stroke="url(#kp-mp-stroke)"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MapigoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display font-bold tracking-[-0.02em]", className)}>
      <MapigoMark size={20} className="text-gold" />
      mapigo
    </span>
  );
}
