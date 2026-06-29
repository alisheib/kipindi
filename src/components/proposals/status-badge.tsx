"use client";

/**
 * StatusBadge — maps a proposal status (+ Hot flag) to a kit Chip variant +
 * kit glyph. Gold for Hot/Resolved, indigo for Listed, pending for review,
 * claret for declined. Never betting green/red.
 */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { useT } from "@/lib/i18n";
import type { ProposalStatus } from "@/lib/server/store";

type Variant = React.ComponentProps<typeof Chip>["variant"];

export function StatusBadge({ status, isHot }: { status: ProposalStatus; isHot?: boolean }) {
  const { t } = useT();
  let variant: Variant = "neutral";
  let icon: GlyphKey = "clock";
  let label: string = t.common.underReview;

  if (isHot && (status === "REVIEW" || status === "CHANGES_REQUESTED")) {
    variant = "resolved"; icon = "flame2"; label = t.common.hot;
  } else if (status === "REVIEW") {
    variant = "pending"; icon = "clock"; label = t.common.underReview;
  } else if (status === "CHANGES_REQUESTED") {
    variant = "pending"; icon = "edit"; label = t.common.changesRequested;
  } else if (status === "LISTED") {
    variant = "active"; icon = "check"; label = t.proposals.filterListed;
  } else if (status === "RESOLVED") {
    variant = "resolved"; icon = "trophy"; label = t.market.statusResolved;
  } else if (status === "DECLINED") {
    variant = "claret"; icon = "x"; label = t.common.declined;
  }

  const Icon = I[icon];
  return (
    <Chip variant={variant} aria-label={label}>
      <Icon s={12} />
      {label}
    </Chip>
  );
}
