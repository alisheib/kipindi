/**
 * Re-export the kit's TippingBar as `ProbabilityBar` so existing call-sites
 * don't break. The signature element is the tilting needle in the middle —
 * it leans in the direction of the leading side. Pure kit; no freelance.
 */
import { TippingBar } from "@/components/brand";

type Props = {
  yesPct: number;
  size?: "micro" | "large";
  variant?: "split" | "segmented" | "minimal";
  resolved?: boolean;
  showLabels?: boolean;
  className?: string;
};

export function ProbabilityBar({ yesPct, size = "micro", resolved, showLabels, className }: Props) {
  const height = size === "large" ? 28 : 14;
  return <TippingBar yesPct={yesPct} height={height} resolved={!!resolved} showLabels={!!showLabels} className={className} />;
}
