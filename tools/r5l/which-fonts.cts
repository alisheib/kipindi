/* R5-L · which served woff2 is which face (next/font's own files, F:/kipindi-main/.next/dev/static/media). */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const fontkit = req("fontkit");
const fs = require("fs");
const DIR = "F:/kipindi-main/.next/dev/static/media/";
for (const f of fs.readdirSync(DIR).filter((n: string) => n.endsWith(".woff2"))) {
  try {
    const font = fontkit.openSync(DIR + f);
    const axes = font.variationAxes ? Object.keys(font.variationAxes).join(",") : "";
    const hasA = font.hasGlyphForCodePoint(0x61), hasHan = font.hasGlyphForCodePoint(0x4e2d), hasCyr = font.hasGlyphForCodePoint(0x0416);
    console.log(`${f}  ${font.familyName} / ${font.subfamilyName}  axes[${axes}]  latin:${hasA} cyr:${hasCyr} han:${hasHan} glyphs:${font.numGlyphs} upm:${font.unitsPerEm} size:${fs.statSync(DIR + f).size}`);
  } catch (e) { console.log(`${f}  ERR ${String(e).slice(0, 80)}`); }
}
