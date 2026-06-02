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

/** Curated on-brand avatar palettes. Each is a 2-stop gradient drawn ONLY from
 *  the heraldic chord (royal / teal / aqua / plum / claret / bronze), so two
 *  predictors get visibly different avatars while every one still belongs to the
 *  same family — distinctive, never off-theme. */
const PALETTES: Array<{ a: string; b: string }> = [
  { a: "oklch(56% 0.17 268)", b: "oklch(27% 0.15 268)" }, // royal
  { a: "oklch(56% 0.13 232)", b: "oklch(26% 0.12 232)" }, // royal·teal
  { a: "oklch(60% 0.11 200)", b: "oklch(26% 0.10 200)" }, // aqua
  { a: "oklch(53% 0.16 312)", b: "oklch(26% 0.14 300)" }, // plum
  { a: "oklch(52% 0.16 15)",  b: "oklch(24% 0.12 15)"  }, // claret
  { a: "oklch(58% 0.12 78)",  b: "oklch(31% 0.10 70)"  }, // bronze
];

/** Stable 32-bit hash of the seed. */
function hashFor(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Normalise initials — trim, uppercase, cap at 2 characters. Empty
 *  / whitespace input falls back to "?". Keeps every avatar in the
 *  same visual rhythm across the app regardless of what the caller
 *  passes in. */
function normInitials(raw: string): string {
  const trimmed = (raw ?? "").replace(/\s+/g, "").slice(0, 2).toUpperCase();
  return trimmed || "?";
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
  const cleaned = normInitials(initials);
  const h = hashFor(seed || cleaned);
  const pal = PALETTES[h % PALETTES.length];
  const angle = 108 + (h % 64); // 108–172°, deterministic per seed
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
              // gem sheen (top-left) over the deterministic on-brand gradient
              background: `radial-gradient(120% 100% at 28% 0%, color-mix(in oklab, white 16%, transparent), transparent 56%), linear-gradient(${angle}deg, ${pal.a}, ${pal.b})`,
              color: "var(--pearl-50)",
              boxShadow: "0 0 0 1px color-mix(in oklab, var(--gilt) 34%, transparent) inset",
            }
      }
      aria-label={`Avatar ${cleaned}`}
    >
      {!src && cleaned}
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
