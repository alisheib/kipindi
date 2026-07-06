/** Category → kit glyph, shared across proposal screens. */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import type { ProposalCategory } from "@/lib/server/store";
import type { Dict } from "@/lib/i18n-dict";

const MAP: Record<ProposalCategory, GlyphKey> = {
  sports: "trophy",
  macro: "trendingUp",
  weather: "weather",
  crypto: "crypto",
  culture: "entertainment",
  infrastructure: "politics", // columned-building glyph
  tech: "tech",
  mixed: "shuffle", // matches the ai-poll "Mixed / All" shuffle glyph
};

export const CATEGORY_LABEL: Record<ProposalCategory, string> = {
  sports: "Sports",
  macro: "Macro",
  weather: "Weather",
  crypto: "Crypto",
  culture: "Culture",
  infrastructure: "Infrastructure",
  tech: "Tech",
  mixed: "Mixed / All",
};

/** Translation-aware category label. */
export function categoryLabel(t: Dict, c: ProposalCategory): string {
  switch (c) {
    case "sports": return t.market.catSports;
    case "macro": return t.market.catMacro;
    case "weather": return t.market.catWeather;
    case "crypto": return t.market.catCrypto;
    case "culture": return t.market.catCulture;
    case "infrastructure": return t.market.catInfrastructure;
    case "tech": return t.market.catTech;
    case "mixed": return t.market.catMixed;
  }
}

export function CategoryIcon({ category, size = 12 }: { category: ProposalCategory; size?: number }) {
  const Glyph = I[MAP[category] ?? "trophy"];
  return <Glyph s={size} />;
}
