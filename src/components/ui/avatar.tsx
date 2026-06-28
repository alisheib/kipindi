/**
 * Avatar — now backed by the generative heraldic identity (IdentityAvatar).
 * Keeps the original API (initials / size / src / seed) so every call site
 * upgrades for free: a deterministic on-royal crest with the gilt soloist,
 * legible from 20→80px, with an uploaded-photo fallback. Default crest is the
 * Royal Monogram (calmest + most legible in dense lists).
 */
import { cn } from "@/lib/utils";
import { IdentityAvatar, type CrestKind } from "@/components/ui/identity-avatar";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizePx: Record<Size, number> = { xs: 20, sm: 28, md: 40, lg: 48, xl: 56, "2xl": 80 };

export function Avatar({
  initials,
  size = "md",
  src,
  seed,
  kind = "monogram",
  className,
}: {
  initials: string;
  size?: Size;
  src?: string;
  /** legacy, kept for compat — no longer used (hue is seeded inside the crest). */
  hue?: number;
  seed?: string;
  kind?: CrestKind;
  className?: string;
}) {
  return (
    <IdentityAvatar
      seed={seed || initials || "?"}
      initials={initials}
      size={sizePx[size]}
      kind={kind}
      src={src}
      className={cn(className)}
    />
  );
}

/** Tier badge — kit/atoms.jsx → TierBadge. Sovereign sits above Diamond. */
type Tier = "bronze" | "silver" | "gold" | "diamond" | "sovereign";

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  // Kit class names — let globals.css drive the actual look so badges
  // automatically match the rest of the heraldic chord.
  const cls = `tier-${tier}`;
  // Sovereign gets a star, not "S" — otherwise it collides with Silver's "S".
  const letter = { sovereign: "★", diamond: "D", gold: "G", silver: "S", bronze: "B" }[tier];
  return (
    <span title={tier} className={cn("tier-badge", cls, className)}>
      {letter}
    </span>
  );
}
