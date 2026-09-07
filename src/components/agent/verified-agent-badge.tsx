import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";

/**
 * The "Verified 50pick Agent" trust mark — the kit's gold Chip carrying the shield glyph.
 * ⛔ Not a hand-rolled gilt pill: one chip family, one set of heights and inks (§B2). The mark is
 * shown only for an agent in good standing; a paused agent gets the warning chip instead.
 */
export function VerifiedAgentBadge({ label, size = "md", className }: { label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <Chip variant="gold" className={className}>
      <I.shieldcheck s={size === "sm" ? 12 : 14} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Chip>
  );
}
