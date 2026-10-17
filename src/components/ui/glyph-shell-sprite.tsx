import { GLYPH_SHELL_SYMBOLS } from "./glyph-shell-sprite.generated";

/**
 * The chrome's glyph symbols, inlined once per page (PHOSPHOR-MIGRATION W2). The tab bars and the headers draw their
 * glyphs with `<use href="#…">` against these, so the chrome paints with the first bytes of HTML on a slow first visit
 * instead of waiting for the sprite file every other glyph uses. The symbols are generated (`npm run glyphs:gen`) from
 * `scripts/glyphs/map.ts`'s SHELL_KEYS and carry Phosphor's MIT notice. Zero-sized and hidden from assistive technology;
 * not `display:none`, which would stop `<use>` resolving in some browsers.
 */
export function GlyphShellSprite() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute" }}
      dangerouslySetInnerHTML={{ __html: GLYPH_SHELL_SYMBOLS }}
    />
  );
}
