/** Re-export ConfidenceDial from the brand kit as CircularProgress. */
import { ConfidenceDial } from "@/components/brand";

type Props = {
  /** The YES share, 0 to 100. Absent means there is no crowd price: the dial draws its own empty state,
   *  never the kit's default figure (62), which would be a price nobody's money stated. */
  value?: number;
  size?: number;
  stroke?: number;
  tone?: "teal" | "yes" | "no" | "gold" | "warning";
  label?: string;
  className?: string;
  /** No crowd price (an empty or one-sided pool): the dial's own empty state (see `ConfidenceDial`). */
  empty?: boolean;
};

export function CircularProgress({ value, size = 56, label, className, empty }: Props) {
  return <ConfidenceDial yesPct={value} size={size} label={label} className={className} empty={empty || value === undefined} />;
}
