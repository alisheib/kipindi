// Advance widths (with kerning) in the repo's own Inter / JetBrains Mono. node wd.cjs <face> <px> <text> [<text>...]
// face: r (Inter Regular), m (Inter Medium), b (Inter Bold), mono, monob. Optional letter-spacing: px like 13:0.5
const fontkit = require("F:/kipindi-r3c/node_modules/fontkit");
const dir = "F:/kipindi-r3c/src/lib/server/reports/fonts/";
const F = {
  r: "Inter-Regular.ttf", m: "Inter-Medium.ttf", b: "Inter-Bold.ttf", mono: "JetBrainsMono-Regular.ttf", monob: "JetBrainsMono-Bold.ttf",
};
const [, , face, pxArg, ...texts] = process.argv;
const [px, ls] = pxArg.split(":").map(Number);
const f = fontkit.openSync(dir + F[face]);
for (const text of texts) {
  const run = f.layout(text);
  const adv = run.positions.reduce((s, p) => s + p.xAdvance, 0);
  const w = (adv / f.unitsPerEm) * px + (ls || 0) * [...text].length;
  console.log(`${w.toFixed(1)}  "${text}"`);
}
