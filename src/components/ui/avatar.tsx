/**
 * Avatar — direct port of kit/atoms.jsx → Avatar. Royal-gradient default
 * with pearl ink (per kit). The `seed` prop drives a deterministic hue
 * shift so two predictors with different ids get visibly different
 * avatars without leaving the royal axis. `src` overrides for uploaded
 * profile photos.
 */
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClass: Record<Size, string> = {
  xs:   "h-5 w-5 text-[10px]",
  sm:   "h-7 w-7 text-[11px]",
  md:   "h-10 w-10 text-[14px]",
  lg:   "h-12 w-12 text-[16px]",
  xl:   "h-14 w-14 text-[18px]",
  "2xl":"h-20 w-20 text-[22px]",
};

/** Hash a string to a deterministic offset 0..40. The avatar gradient
 *  always lives on the royal axis (hue 258); we only nudge the hue by a
 *  small amount so each avatar reads as part of the same family. */
function offsetFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 41) - 20; // -20..+20 around 258
}

export function Avatar({
  initials,
  size = "md",
  src,
  seed,
  className,
}: {
  initials: string;
  size?: Size;
  src?: string;
  /** legacy, kept for compat — replaced by `seed`. */
  hue?: number;
  seed?: string;
  className?: string;
}) {
  const offset = seed ? offsetFor(seed) : offsetFor(initials);
  const hue = 258 + offset;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-pill font-display font-semibold tabular-nums select-none overflow-hidden flex-shrink-0",
        sizeClass[size],
        className,
      )}
      style={
        src
          ? { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" }
          : {
              background: `linear-gradient(135deg, oklch(54% 0.18 ${hue}), oklch(28% 0.15 ${hue}))`,
              color: "var(--pearl-50)",
              boxShadow: "0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset",
            }
      }
      aria-label={`Avatar ${initials}`}
    >
      {!src && initials}
    </span>
  );
}

/** Tier badge — kit/atoms.jsx → TierBadge. Sovereign sits above Diamond. */
type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  // Kit class names — let globals.css drive the actual look so badges
  // automatically match the rest of the heraldic chord.
  const cls = `tier-${tier}`;
  const letter = { sovereign: "S", diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  return (
    <span title={tier} className={cn("tier-badge", cls, className)}>
      {letter}
    </span>
  );
}
