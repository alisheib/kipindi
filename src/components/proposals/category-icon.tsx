/** Category → kit glyph. Delegates to the app-wide `categoryGlyph()` so a
 *  proposal card shows the SAME glyph per category as market/live cards
 *  (previously this used a divergent map — e.g. sports=trophy vs football). */
import { I, categoryGlyph } from "@/components/ui/glyphs";
import type { ProposalCategory } from "@/lib/server/store";
import type { Dict } from "@/lib/i18n-dict";

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
  const Glyph = I[categoryGlyph(category)];
  return <Glyph s={size} />;
}
