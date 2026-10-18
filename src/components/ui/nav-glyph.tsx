/**
 * NavGlyph — a destination's glyph in the platform's one selected language (PHOSPHOR-MIGRATION W3; R-INDICATOR 3B,
 * Ali 2026-10-17): Line while the destination is not the current one, Fill while it is, on the surface's opaque royal
 * pill (`--nav-pill`, globals.css). Worn by the classic rail, the journey's tabs and the admin sidebar and drawer.
 *
 * The change INTO the current destination morphs with M5's swap (`GlyphSwap`, `.g-swap-in`); the destination left
 * behind cuts back to Line at once (`onlyOn`), so one destination is lit in every frame, as the journey's rail already
 * holds for its pill and its ink (R4-J). A first render is an arrival, not a morph: it draws still.
 */
import { I, type GlyphKey } from "@/components/ui/glyphs";
import { GlyphSwap } from "@/components/ui/glyph-swap";

export function NavGlyph({ glyph, on, s }: { glyph: GlyphKey; on: boolean; s: number }) {
  const Ico = I[glyph];
  return (
    <GlyphSwap state={on} onlyOn>
      {on ? <Ico s={s} tier="fill" /> : <Ico s={s} />}
    </GlyphSwap>
  );
}
