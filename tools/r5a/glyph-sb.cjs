const fontkit = require("F:/kipindi-r5a/node_modules/fontkit");
const fs = require("fs");
const dir = "F:/kipindi-main/.next/dev/static/media";
const files = fs.readdirSync(dir).filter((x) => x.endsWith(".woff2"));
for (const f of files) {
  const font = fontkit.openSync(dir + "/" + f);
  if (!/JetBrains/.test(font.familyName)) continue;
  const axes = font.variationAxes ? JSON.stringify(font.variationAxes) : "-";
  const out = [];
  for (const ch of ["O", "I", "D", "N", "S", "E", "A", "%", "i", "K"]) {
    const g = font.glyphsForString(ch)[0];
    if (!g || !g.bbox) { out.push(ch + ":?"); continue; }
    out.push(`${ch}:adv${g.advanceWidth} x${g.bbox.minX}..${g.bbox.maxX} rsb${g.advanceWidth - g.bbox.maxX}`);
  }
  console.log(f.slice(0, 18), font.subfamilyName, axes.slice(0, 80), out.join(" "));
}
