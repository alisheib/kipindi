/**
 * StatusBadge — maps a proposal status (+ Hot flag) to a kit Chip variant +
 * lucide icon. Gold for Hot/Resolved, indigo for Listed, pending for review,
 * claret for declined. Never betting green/red.
 */
import { Flame, Check, Trophy, Clock, XCircle, Pencil } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { ProposalStatus } from "@/lib/server/store";

type Variant = React.ComponentProps<typeof Chip>["variant"];

export function StatusBadge({ status, isHot }: { status: ProposalStatus; isHot?: boolean }) {
  let variant: Variant = "neutral";
  let Icon = Clock;
  let label = "Under review";
  let sw = "Inakaguliwa";

  if (isHot && (status === "REVIEW" || status === "CHANGES_REQUESTED")) {
    variant = "resolved"; Icon = Flame; label = "Hot"; sw = "Maarufu";
  } else if (status === "REVIEW") {
    variant = "pending"; Icon = Clock; label = "Under review"; sw = "Inakaguliwa";
  } else if (status === "CHANGES_REQUESTED") {
    variant = "pending"; Icon = Pencil; label = "Changes requested"; sw = "Mabadiliko";
  } else if (status === "LISTED") {
    variant = "active"; Icon = Check; label = "Listed"; sw = "Imeorodheshwa";
  } else if (status === "RESOLVED") {
    variant = "resolved"; Icon = Trophy; label = "Resolved"; sw = "Imetatuliwa";
  } else if (status === "DECLINED") {
    variant = "claret"; Icon = XCircle; label = "Declined"; sw = "Imekataliwa";
  }

  return (
    <Chip variant={variant} aria-label={`${label} · ${sw}`}>
      <Icon size={12} strokeWidth={2} />
      {label}
    </Chip>
  );
}
