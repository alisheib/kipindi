// Prints each woff2's family + axes, then for Sora the left side bearing (glyph bbox minX / unitsPerEm) of capitals at
// the weights the product sets, so a title's optical edge is computed from the font and not guessed off a screenshot.
const fs = require("fs");
const path = require("path");
const fontkit = require("F:/kipindi-main/node_modules/fontkit");
const dir = "F:/kipindi-main/.next/dev/static/media";
const letters = (process.argv[2] || "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split("");
const weights = (process.argv[3] || "600,700,800").split(",").map(Number);
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".woff2"))) {
  let font;
  try { font = fontkit.create(fs.readFileSync(path.join(dir, f))); } catch (e) { console.log(f, "ERR", e.message); continue; }
  const axes = font.variationAxes ? Object.keys(font.variationAxes).join(",") : "";
  const has = font.hasGlyphForCodePoint(0x4d);
  console.log(`${f}  ${font.familyName}  axes[${axes}]  M:${has}  upm ${font.unitsPerEm}`);
  if (!/Sora/i.test(font.familyName) || !has) continue;
  for (const w of weights) {
    const v = font.variationAxes && font.variationAxes.wght ? font.getVariation({ wght: w }) : font;
    const row = letters.map((ch) => {
      const g = v.getGlyph(font.glyphForCodePoint(ch.codePointAt(0)).id);
      const bb = g.bbox;
      return `${ch} ${(bb.minX / v.unitsPerEm).toFixed(4)}`;
    });
    console.log(`  wght ${w}: ${row.join("  ")}`);
  }
}
