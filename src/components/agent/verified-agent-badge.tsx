import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";

/**
 * The "Verified 50pick Agent" trust mark — the kit's success Chip carrying the shield glyph.
 * ⛔ Not a hand-rolled pill: one chip family, one set of heights and inks (§B2). The mark is
 * shown only for an agent in good standing; a paused agent gets the neutral chip instead.
 * ⛔ NOT GOLD (R5-C, the second gold audit, 2026-10-09). "Verified" is an approval, and DESIGN_AUTHORITY §B11 decides
 * that word once: "APPROVED is success-green everywhere … an approval is not money, it is permission". It was the kit's
 * gilt chip, the ink of earned money (§M3, Q5). The KYC rail's done nodes and the KYC approval wear the same success.
 */
export function VerifiedAgentBadge({ label, size = "md", className }: { label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <Chip variant="success" className={className}>
      <I.shieldcheck s={size === "sm" ? 12 : 14} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Chip>
  );
}
