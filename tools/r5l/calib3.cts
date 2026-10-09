/* R5-L · calibrate: the served Inter variable advances + the static Inter's GPOS kerning delta (layout − plain advances). */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const fontkit = req("fontkit");
const DIR = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/";
const FONTS = "F:/kipindi-r5l/src/lib/server/reports/fonts/";
const words: Array<[string, number]> = [["Mpya zaidi", 66], ["Muda wote", 67.4], ["NDIO / HAPANA", 98.4]];
const sM = fontkit.openSync(FONTS + "Inter-Medium.ttf"), sB = fontkit.openSync(FONTS + "Inter-Bold.ttf");
const kernDelta = (font: any, s: string, feats: string[]) => {
  const run = font.layout(s, feats);
  const laid = run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0);
  const plain = Array.from(s).reduce((a: number, ch: string) => a + font.glyphForCodePoint(ch.codePointAt(0)).advanceWidth, 0);
  return (laid - plain) / font.unitsPerEm;
};
const f = fontkit.openSync(DIR + "inter-latin-var.woff2");
f.variationCoords = [600];
const vp = f._variationProcessor;
const adv = (s: string) => Array.from(s).reduce((a: number, ch: string) => { const gid = f._cmapProcessor.lookup(ch.codePointAt(0)); return a + f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0); }, 0) / f.unitsPerEm;
for (const [s, want] of words) {
  const k0 = (kernDelta(sM, s, []) + kernDelta(sB, s, [])) / 2, k1 = (kernDelta(sM, s, ["ss01", "cv11"]) + kernDelta(sB, s, ["ss01", "cv11"])) / 2;
  console.log(`${s.padEnd(15)} var600 ${(adv(s) * 13).toFixed(2)}  kern ${(k0 * 13).toFixed(2)}  kern+feat ${(k1 * 13).toFixed(2)}  → ${((adv(s) + k0) * 13).toFixed(2)} / ${((adv(s) + k1) * 13).toFixed(2)}  measured ${want}`);
}
