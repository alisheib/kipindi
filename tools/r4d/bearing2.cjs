// Sora's left side bearing per capital, per weight — the glyph's own outline with the variable font's gvar deltas applied
// by hand (fontkit's WOFF2 path never applies them to a transformed glyf table).
const fs = require("fs");
const fk = require("F:/kipindi-main/node_modules/fontkit");
const file = process.argv[2] || "F:/kipindi-main/.next/dev/static/media/6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2";
const letters = (process.argv[3] || "MHNBDEPRKLFIU").split("");
const weights = (process.argv[4] || "400,700,800").split(",").map(Number);
const buf = fs.readFileSync(file);
for (const w of weights) {
  const f = fk.create(buf);
  f._transformGlyfTable();
  const f2 = fk.create(buf);
  f2.variationCoords = [w];
  const vp = f2._variationProcessor;
  const out = [];
  for (const ch of letters) {
    const id = f.glyphForCodePoint(ch.codePointAt(0)).id;
    const tg = f._transformedGlyphs[id];
    if (!tg.points) { out.push(`${ch} composite`); continue; }
    const pts = tg.points.map((p) => ({ x: p.x, y: p.y, onCurve: p.onCurve, endContour: p.endContour, copy() { return { ...this }; } }));
    const phantom = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, onCurve: false, endContour: true, copy() { return { ...this }; } }));
    const all = pts.concat(phantom);
    if (w !== 400 && vp) vp.transformPoints(id, all);
    const minX = Math.min(...all.slice(0, pts.length).map((p) => p.x));
    out.push(`${ch} ${(minX / f.unitsPerEm).toFixed(4)}`);
  }
  console.log(`wght ${w}: ${out.join("  ")}`);
}
