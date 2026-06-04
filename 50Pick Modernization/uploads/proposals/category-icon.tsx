/** Category → lucide icon, shared across proposal screens. */
import { Trophy, TrendingUp, CloudSun, Bitcoin, Music, Building2 } from "lucide-react";
import type { ProposalCategory } from "@/lib/server/store";

const MAP = {
  sports: Trophy,
  macro: TrendingUp,
  weather: CloudSun,
  crypto: Bitcoin,
  culture: Music,
  infrastructure: Building2,
} as const;

export const CATEGORY_LABEL: Record<ProposalCategory, string> = {
  sports: "Sports",
  macro: "Macro",
  weather: "Weather",
  crypto: "Crypto",
  culture: "Culture",
  infrastructure: "Infrastructure",
};

export function CategoryIcon({ category, size = 12 }: { category: ProposalCategory; size?: number }) {
  const Icon = MAP[category] ?? Trophy;
  return <Icon size={size} strokeWidth={2} />;
}
