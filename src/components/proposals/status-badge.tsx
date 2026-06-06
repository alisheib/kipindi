/**
 * StatusBadge — maps a proposal status (+ Hot flag) to a kit Chip variant +
 * kit glyph. Gold for Hot/Resolved, indigo for Listed, pending for review,
 * claret for declined. Never betting green/red.
 */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import type { ProposalStatus } from "@/lib/server/store";

type Variant = React.ComponentProps<typeof Chip>["variant"];

export function StatusBadge({ status, isHot }: { status: ProposalStatus; isHot?: boolean }) {
  let variant: Variant = "neutral";
  let icon: GlyphKey = "clock";
  let label = "Under review";
  let sw = "Inakaguliwa";

  if (isHot && (status === "REVIEW" || status === "CHANGES_REQUESTED")) {
    variant = "resolved"; icon = "flame2"; label = "Hot"; sw = "Maarufu";
  } else if (status === "REVIEW") {
    variant = "pending"; icon = "clock"; label = "Under review"; sw = "Inakaguliwa";
  } else if (status === "CHANGES_REQUESTED") {
    variant = "pending"; icon = "edit"; label = "Changes requested"; sw = "Mabadiliko";
  } else if (status === "LISTED") {
    variant = "active"; icon = "check"; label = "Listed"; sw = "Imeorodheshwa";
  } else if (status === "RESOLVED") {
    variant = "resolved"; icon = "trophy"; label = "Resolved"; sw = "Imetatuliwa";
  } else if (status === "DECLINED") {
    variant = "claret"; icon = "x"; label = "Declined"; sw = "Imekataliwa";
  }

  const Icon = I[icon];
  return (
    <Chip variant={variant} aria-label={`${label} · ${sw}`}>
      <Icon s={12} />
      {label}
    </Chip>
  );
}
