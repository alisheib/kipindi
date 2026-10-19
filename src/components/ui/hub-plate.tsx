/**
 * A HUB ROW'S PLATE — the identity plate every row of the Akaunti hub leads with (PHOSPHOR-MIGRATION release 2, W5: "hub
 * rows: Duotone on plates on the phone too"). The specimen's choice 2B, which Ali chose on 2026-10-17
 * (docs/design-brief/phosphor-2026-10/phosphor-specimen-w0.html): a 36px plate of the soft royal surface under the lit
 * edge, the row's glyph on it in Duotone, its tone at `--glyph-tone`. It was a bare 20px glyph in the muted ink, which the
 * specimen named "thin icons and no plates on phones".
 * ⭐ ONE DEFINITION FOR EVERY ROW: the link rows (`hub-row.tsx`), Tafuta, Arifa, Lugha, the card size, the Needle, the staff
 * console's row and Toka all draw this, so a row cannot lead with a plate of its own. Toka's plate is the danger family's,
 * as its label (R5-I: Sign out is in the danger ink wherever it stands).
 * ⭐ IT LIVES IN THE KIT, NOT IN THE HUB'S FOLDER: the Needle's drawer (`layout/needle-drawer.tsx`) draws the hub's row too, and
 * a classic layout file never loads a journey component (`test:journey-shell` 8.mount: a classic visitor's first bundle
 * carries no journey code).
 * ⭐ 36px IN A 56px ROW: the row's 8px padding leaves 40px, so the plate keeps 2px of air above and below it inside the
 * rung, and the row stays 56px (`hubColumnCut` counts 57 per row, hub-rows.ts).
 */
import { I, plateGlyph, type DuoGlyphKey } from "@/components/ui/glyphs";
import { IconPlate, type PlateVariant } from "@/components/ui/icon-plate";

/** The plate's edge, the one size every hub row's plate is. */
export const HUB_PLATE = 36;

export function HubPlate({ glyph, variant = "identity" }: { glyph: DuoGlyphKey; variant?: PlateVariant }) {
  const Glyph = I[glyph];
  return (
    <IconPlate size={HUB_PLATE} variant={variant} className="kp-hub__glyph" aria-hidden>
      <Glyph s={plateGlyph(HUB_PLATE)} tier="duo" />
    </IconPlate>
  );
}
