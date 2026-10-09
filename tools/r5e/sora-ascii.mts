import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5e/package.json");
const fontkit = req("fontkit");
const FILE = new URL("./sora-latin-var.woff2", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
for (const w of [600, 700]) {
  const f = fontkit.openSync(FILE); f.variationCoords = [w];
  const vp = f._variationProcessor;
  const row: number[] = [];
  for (let c = 0x20; c <= 0x7e; c++) {
    const gid = f._cmapProcessor.lookup(c);
    row.push(Math.round(f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0)));
  }
  console.log(`${w}: "${row.join(",")}"`);
}
