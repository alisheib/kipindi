/** Category → kit glyph, shared across proposal screens. */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import type { ProposalCategory } from "@/lib/server/store";

const MAP: Record<ProposalCategory, GlyphKey> = {
  sports: "trophy",
  macro: "trendingUp",
  weather: "weather",
  crypto: "crypto",
  culture: "entertainment",
  infrastructure: "politics", // columned-building glyph
};

export const CATEGORY_LABEL: Record<ProposalCategory, string> = {
  sports: "Sports",
  macro: "Macro",
  weather: "Weather",
  crypto: "Crypto",
  culture: "Culture",
  infrastructure: "Infrastructure",
};

export function CategoryIcon({ category, size = 12 }: { category: ProposalCategory; size?: number }) {
  const Glyph = I[MAP[category] ?? "trophy"];
  return <Glyph s={size} />;
}
