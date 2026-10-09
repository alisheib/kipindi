// Greedy + balance (Chromium-style: the narrowest width that keeps the greedy line count) line-break simulator.
// node wrap.cjs <face> <px> <width> <mode:greedy|balance|pretty> <text>   ("~" in text = no-break space)
const fontkit = require("F:/kipindi-r3c/node_modules/fontkit");
const dir = "F:/kipindi-r3c/src/lib/server/reports/fonts/";
const F = { r: "Inter-Regular.ttf", m: "Inter-Medium.ttf", b: "Inter-Bold.ttf", mono: "JetBrainsMono-Regular.ttf", monob: "JetBrainsMono-Bold.ttf" };
const [, , face, pxArg, widthArg, mode, ...rest] = process.argv;
const text = rest.join(" ").replace(/~/g, "\u00a0");
const [px, ls] = pxArg.split(":").map(Number);
const f = fontkit.openSync(dir + F[face]);
const w = (s) => { const run = f.layout(s); return run.positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * px + (ls || 0) * [...s].length; };
const words = text.split(" ");
function greedy(width) {
  const lines = [];
  let cur = "";
  for (const word of words) {
    const cand = cur ? cur + " " + word : word;
    if (!cur || w(cand) <= width + 0.01) cur = cand; else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}
const W = Number(widthArg);
let lines = greedy(W);
if (mode === "balance") {
  const n = lines.length;
  let lo = 0, hi = W;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (greedy(mid).length <= n && greedy(mid).every((l) => w(l) <= mid + 0.01 || !l.includes(" "))) hi = mid; else lo = mid; }
  lines = greedy(hi);
}
for (const l of lines) console.log(`${w(l).toFixed(1).padStart(6)}  ${l.replace(/\u00a0/g, "~")}`);
