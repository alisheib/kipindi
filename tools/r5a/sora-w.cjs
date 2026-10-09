// Width of strings in a variable woff2 (Sora by default) at a weight. Glyph ids and kerning come from the default-weight
// layout (GPOS kerning at 400 — the bold's kerning differs by a fraction of a pixel per pair); each advance is hmtx plus
// the HVAR delta at the requested weight (fontkit cannot outline-instance this woff2, but advances need no outlines).
// Env: FAMILY (Sora), WGHT (700), SIZE (28), TRACK (-0.56 px per glyph, the h1's -0.02em).
const fontkit = require("F:/kipindi-r5a/node_modules/fontkit");
const { DecodeStream } = require("F:/kipindi-main/node_modules/restructure");
const fs = require("fs");
const dir = "F:/kipindi-main/.next/dev/static/media";
const family = process.env.FAMILY || "Sora";
let base = null, buf = null;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".woff2"))) {
  const b = fs.readFileSync(dir + "/" + f);
  const font = fontkit.create(b);
  if (font.familyName === family) { const g = font.glyphsForString("K")[0]; if (g && g.bbox && g.bbox.maxX > 0) { base = font; buf = b; } }
}
const wght = Number(process.env.WGHT || 700), size = Number(process.env.SIZE || 28), track = Number(process.env.TRACK ?? -0.56);
const coords = base.fvar.axis.map((a) => (a.axisTag.trim() === "wght" ? Math.max(a.minValue, Math.min(a.maxValue, wght)) : a.defaultValue));
const inst = new base.constructor(new DecodeStream(buf), coords);
const vp = inst._variationProcessor;
const hvar = inst.HVAR;
if (!vp || !hvar) throw new Error("no HVAR / variation processor");
const adv400 = (gid) => base.hmtx.metrics.get(gid).advance;
const advW = (gid) => adv400(gid) + vp.getAdvanceAdjustment(gid, hvar);
const w = (s) => {
  const run = base.layout(s);
  let total = 0;
  run.glyphs.forEach((g, i) => { const kern = run.positions[i].xAdvance - adv400(g.id); total += advW(g.id) + kern; });
  return total / base.unitsPerEm * size + track * [...s].length;
};
module.exports = { w };
if (require.main === module) for (const s of process.argv.slice(2)) console.log(w(s).toFixed(1).padStart(7), JSON.stringify(s));
