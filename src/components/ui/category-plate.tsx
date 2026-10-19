/** The one category sigil treatment on cards, filter chips and the question page. */
import { IconPlate } from "./icon-plate";
import { I, categoryGlyph, plateGlyph } from "./glyphs";

export function CategoryPlate({
  category,
  size = 26,
  className,
}: {
  /** null means the "All categories" destination, represented by the board's grid. */
  category: string | null;
  size?: 26 | 32 | 36 | 40;
  className?: string;
}) {
  const Glyph = I[category === null ? "layoutGrid" : categoryGlyph(category)];
  return (
    <IconPlate size={size} variant="identity" className={className} aria-hidden>
      <Glyph s={plateGlyph(size)} tier="duo" />
    </IconPlate>
  );
}
