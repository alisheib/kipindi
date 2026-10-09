const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r4k/package.json");
const fontkit = req("fontkit");
for (const name of ["JetBrainsMono-Regular", "JetBrainsMono-Bold", "Inter-Regular", "Inter-Bold"]) {
  const f = fontkit.openSync(`F:/kipindi-r4k/src/lib/server/reports/fonts/${name}.ttf`);
  const sp = f.glyphForCodePoint(0x20);
  console.log(name, "upem", f.unitsPerEm, "space", sp.advanceWidth, "=", (sp.advanceWidth / f.unitsPerEm).toFixed(4), "em");
}
