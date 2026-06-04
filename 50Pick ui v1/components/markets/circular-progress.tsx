/** Re-export ConfidenceDial from the brand kit as CircularProgress. */
import { ConfidenceDial } from "@/components/brand";

type Props = {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "teal" | "yes" | "no" | "gold" | "warning";
  label?: string;
  className?: string;
};

export function CircularProgress({ value, size = 56, label, className }: Props) {
  return <ConfidenceDial yesPct={value} size={size} label={label} className={className} />;
}
