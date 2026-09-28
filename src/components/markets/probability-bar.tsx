/**
 * Re-export the kit's TippingBar as `ProbabilityBar` so existing call-sites
 * don't break. The signature element is the tilting needle in the middle —
 * it leans in the direction of the leading side. Pure kit; no freelance.
 */
import { TippingBar } from "@/components/brand";

type Props = {
  /** Omitted when there is no price — pass `empty` instead (landing v3 C1). */
  yesPct?: number;
  /** The kit's cold-start rail: no pool, or money on one side only (`priceState`). */
  empty?: boolean;
  /** What the empty rail is — "No bets", "No pool", "One side only". Its accessible name. */
  emptyLabel?: string;
  size?: "micro" | "large";
  variant?: "split" | "segmented" | "minimal";
  resolved?: boolean;
  showLabels?: boolean;
  className?: string;
};

export function ProbabilityBar({ yesPct, size = "micro", resolved, showLabels, className, empty, emptyLabel }: Props) {
  const height = size === "large" ? 28 : 14;
  return <TippingBar yesPct={yesPct} height={height} resolved={!!resolved} showLabels={!!showLabels} className={className} empty={!!empty} emptyLabel={emptyLabel} />;
}
