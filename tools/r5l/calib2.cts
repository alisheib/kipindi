/* R5-L · calibrate: the served Inter variable face (next/font's latin woff2) at 600, with and without layout/kerning. */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const fontkit = req("fontkit");
const DIR = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/";
const words: Array<[string, number]> = [["Mpya zaidi", 66], ["Muda wote", 67.4], ["NDIO / HAPANA", 98.4]];
for (const wght of [500, 600, 700]) {
  const f = fontkit.openSync(DIR + "inter-latin-var.woff2");
  f.variationCoords = [wght];
  const vp = f._variationProcessor;
  const adv = (s: string) => Array.from(s).reduce((a: number, ch: string) => { const gid = f._cmapProcessor.lookup(ch.codePointAt(0)); return a + f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0); }, 0) / f.unitsPerEm * 13;
  let lay = "";
  try {
    lay = words.map(([s]) => { const run = f.layout(s, ["ss01", "cv11"]); return (run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0) / f.unitsPerEm * 13).toFixed(2); }).join(" / ");
  } catch (e) { lay = "layout ERR " + String(e).slice(0, 60); }
  console.log(`wght ${wght}: cmap+HVAR ${words.map(([s]) => adv(s).toFixed(2)).join(" / ")}   layout(ss01,cv11) ${lay}   measured ${words.map((w) => w[1]).join(" / ")}`);
}
