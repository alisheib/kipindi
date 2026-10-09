const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r4k/package.json");
const fontkit = req("fontkit");
const base = fontkit.openSync("F:/kipindi-main/.next/dev/static/media/6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2");
const sora = base.variationAxes && base.variationAxes.wght ? base.getVariation({ wght: 700 }) : base;
const inter = fontkit.openSync("F:/kipindi-r4k/src/lib/server/reports/fonts/Inter-Regular.ttf");
const w = (f, s, px, track = 0) => { const run = f.layout(s); return run.advanceWidth / f.unitsPerEm * px + track * px * Array.from(s).length; };
for (const s of ["We couldn\u2019t find that page", "We couldn\u2019t find", "that page", "Hatukupata ukurasa huo", "Hatukupata", "ukurasa huo", "Hatukupata ukurasa"]) {
  console.log(JSON.stringify(s), w(sora, s, 28, -0.02).toFixed(1), "px at 28 (Sora 700, -0.02em)");
}
console.log("URL Inter 13px", w(inter, "URL", 13).toFixed(2), "px =", (w(inter, "URL", 13) / 13).toFixed(3), "em");
console.log("axes", JSON.stringify(base.variationAxes));
