// The Sora advances (em) the r5e suite pins for its F1/F4 wrap model: next/font's Sora latin variable (sha256 3902474d…,
// F:/kipindi-main/.next/dev/static/media/6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2), hmtx + HVAR at each weight.
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5e/package.json");
const fontkit = req("fontkit");
const FILE = new URL("./sora-latin-var.woff2", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const titles = ["Dar es Salaam rainfall exceeds 200mm in July", "Mvua Dar es Salaam yazidi 200mm Julai"];
const chars = [...new Set(titles.join("").split(""))].sort();
const out: Record<string, Record<string, number>> = {};
for (const w of [600, 700]) {
  const f = fontkit.openSync(FILE); f.variationCoords = [w];
  const vp = f._variationProcessor;
  out[w] = {};
  for (const c of chars) {
    const gid = f._cmapProcessor.lookup(c.codePointAt(0));
    const adv = f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0);
    out[w][c] = Math.round(adv) / f.unitsPerEm;
  }
}
console.log(JSON.stringify(out));
