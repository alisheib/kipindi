/**
 * Avatar — kit-faithful (kit/atoms.jsx → Avatar).
 * Initials-on-gradient by default; supports a photo `src` if given.
 * The hue prop seeds an OKLCH gradient, deterministic per user when called
 * with a stable string input → so two predictors with different ids always
 * get visually different avatars.
 */
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClass: Record<Size, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[12px]",
  lg: "h-10 w-10 text-[13px]",
  xl: "h-14 w-14 text-[16px]",
  "2xl": "h-20 w-20 text-[22px]",
};

/** Hash a string to a deterministic hue 0..359. */
function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Avatar({
  initials,
  size = "md",
  src,
  hue,
  seed,
  className,
}: {
  initials: string;
  size?: Size;
  src?: string;
  hue?: number;
  seed?: string;
  className?: string;
}) {
  const finalHue = hue ?? (seed ? hueFor(seed) : hueFor(initials));
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-display font-semibold tabular-nums select-none overflow-hidden",
        sizeClass[size],
        className,
      )}
      style={
        src
          ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {
              background: `linear-gradient(135deg, oklch(55% 0.10 ${finalHue}), oklch(35% 0.08 ${finalHue}))`,
              color: "oklch(96% 0.005 240)",
            }
      }
      aria-label={`Avatar ${initials}`}
    >
      {!src && initials}
    </span>
  );
}

/** Tier badge — kit/atoms.jsx → TierBadge.
 *  Sovereign sits above Diamond — claret field, gilt ring. Heraldic chord. */
type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const map: Record<Tier, { letter: string; cls: string }> = {
    bronze:    { letter: "B", cls: "bg-gold-700 text-gold-50 border border-gold-500" },
    silver:    { letter: "S", cls: "bg-slate-300 text-slate-900 border border-slate-400" },
    gold:      { letter: "G", cls: "bg-gold-700 text-gold-100 border border-gold-500" },
    diamond:   { letter: "D", cls: "bg-gradient-to-br from-cyan-300 to-blue-400 text-slate-900 border border-blue-400" },
    sovereign: { letter: "S", cls: "tier-sovereign" },
  };
  const { letter, cls } = map[tier];
  return (
    <span
      title={tier}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-pill font-mono text-[10px] font-bold",
        cls,
        className,
      )}
    >
      {letter}
    </span>
  );
}
