// Simulate Chromium's `text-wrap: balance`: the narrowest width that keeps greedy's line count, then greedy at it.
// `glueLast` binds the last two words (a nowrap pair); an unbreakable unit wider than W overflows (reported "OVERFLOW").
const { w } = require("./sora-w.cjs");
function greedy(units, W) {
  const lines = []; let cur = null;
  for (const u of units) {
    const cand = cur == null ? u : `${cur} ${u}`;
    if (cur != null && w(cand) > W + 0.01) { lines.push(cur); cur = u; } else cur = cand;
  }
  if (cur != null) lines.push(cur);
  return lines;
}
function balance(text, W, glueLast = false) {
  let units = text.split(" ");
  if (glueLast && units.length >= 3) units = [...units.slice(0, -2), units.slice(-2).join(" ")];
  const n = greedy(units, W).length;
  let lo = 0, hi = W;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (greedy(units, mid).length <= n) hi = mid; else lo = mid; }
  const lines = greedy(units, hi);
  const overflow = lines.some((l) => w(l) > W + 0.01);
  return { lines, overflow };
}
module.exports = { balance, greedy };
