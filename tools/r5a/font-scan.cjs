const fontkit = require("F:/kipindi-r5a/node_modules/fontkit");
const fs = require("fs");
const dir = "F:/kipindi-main/.next/dev/static/media";
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".woff2"))) {
  try {
    const font = fontkit.openSync(dir + "/" + f);
    const os2 = font["OS/2"], hhea = font.hhea;
    console.log(f.slice(0, 18), font.familyName, "upm", font.unitsPerEm, "hhea", hhea.ascent, hhea.descent, hhea.lineGap,
      "typo", os2.typoAscender, os2.typoDescender, os2.typoLineGap, "win", os2.winAscent, os2.winDescent, "useTypo", !!(os2.fsSelection && os2.fsSelection.useTypoMetrics), "cap", os2.capHeight);
  } catch (e) { console.log(f, "ERR", e.message); }
}
