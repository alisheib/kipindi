/**
 * DID THE RING ACTUALLY LAND ON THE GLASS? — the raster half of an M1 atom.
 *
 *   node scripts/material-ring-delta.mjs before-corner.png after-corner.png label
 *
 * The material probe's geometry line proves the COMPUTED VALUE changed. It cannot
 * prove a human would see anything: a 1px inner ring at 9% alpha is four device
 * pixels tall at dsf 4 and perhaps two levels of brightness. So this pairs the
 * BEFORE and AFTER corner crops — identical geometry, same production surface,
 * minutes apart — and reports where the light actually moved.
 *
 * ⛔ IT PRINTS A DEPTH PROFILE INSTEAD OF ASSERTING A ROW, AND THAT IS THE WHOLE
 * DESIGN. Its first version sampled device rows 0-3 as "the ring" and rows 10-13
 * as "the surface", and reported ⛔ NOT EVEN on a change that had plainly landed.
 * Row 0 is not the ring — `boundingBox()` returns the BORDER box, an inset
 * box-shadow paints inside the border, and these panels carry `border: 1px solid`.
 * So at dsf 4 the border owns rows 0-3 and the ring owns 4-7: the probe measured
 * the border on both edges, got the same number on all four sides because a border
 * is uniform, and called a real ring missing. ⭐ The tell was a magic number
 * repeating across unrelated cells (72.04 as `left` on three surfaces at once).
 * A profile cannot lie that way — if nothing moved, every row reads 0.00.
 *
 * ⛔ NO SCALE IS ASSUMED ANYWHERE. Both images are read at their own size and only
 * ever compared to each other, so CSS-vs-device pixels cancel; the run REFUSES if
 * the two differ in size, because then they do not cancel. (Mixing those two units
 * is what condemned a correct `.btn-claret` at 2.73 — §6b ATOM 4.)
 *
 * ⛔ AND IT SAMPLES ALONG THE EDGE, INSIDE THE CORNER RADIUS. The first rows and
 * columns AT a rounded corner are page background, not surface.
 */
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const [beforePath, afterPath, label = "cell"] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("usage: material-ring-delta.mjs <before.png> <after.png> [label]");
  process.exit(2);
}
const B = PNG.sync.read(readFileSync(beforePath));
const A = PNG.sync.read(readFileSync(afterPath));
if (B.width !== A.width || B.height !== A.height) {
  console.log(`⛔ ${label}: ${B.width}x${B.height} vs ${A.width}x${A.height} — different geometry, not comparable.`);
  process.exit(2);
}

const px = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
const dec = (v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const luma = ([r, g, b]) => 0.2126 * dec(r) + 0.7152 * dec(g) + 0.0722 * dec(b);

const DEPTH = 16;                                   // device px inward to profile
const IN = Math.min(96, Math.floor(B.width / 3));   // clear the corner radius
const RUN = Math.min(64, Math.floor(B.width / 4));  // how much edge to average

/** Mean luminance at each depth d along one edge. */
function profile(img, kind) {
  const out = [];
  for (let d = 0; d < DEPTH; d++) {
    let sum = 0;
    for (let k = 0; k < RUN; k++) sum += luma(kind === "top" ? px(img, IN + k, d) : px(img, d, IN + k));
    out.push(sum / RUN);
  }
  return out;
}

console.log(`\n${label}  (${A.width}x${A.height} device px · ${RUN}px runs, ${IN}px in from the corner)`);
console.log(`  depth │ ${Array.from({ length: DEPTH }, (_, d) => String(d).padStart(6)).join("")}`);

/**
 * ⛔ THE READING IS RELATIVE TO THE SURFACE, NEVER ABSOLUTE. Three of these panels
 * are `backdrop-filter: blur()` over the live page, so whatever sat behind them
 * moved between the two runs and the WHOLE interior shifts with it: `sheet-768-zh`
 * read a uniform −2.0 at every depth from 8 inward, which dragged its top-edge
 * delta from +3.3 to +1.3 and made the peak land on background noise at depth 15.
 * Subtracting the interior baseline — the median of the depths past the ring —
 * removes the wallpaper and leaves the ring. Without it this probe reports the
 * page behind the glass as if it were the light on the glass.
 */
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const moved = {};
for (const kind of ["top", "left"]) {
  const pb = profile(B, kind), pa = profile(A, kind);
  const raw = pa.map((v, i) => (v - pb[i]) * 1000);
  const baseline = median(raw.slice(8));
  const delta = raw.map((v) => v - baseline);
  console.log(`  ${kind.padEnd(5)} │ ${delta.map((v) => v.toFixed(2).padStart(6)).join("")}` +
    (Math.abs(baseline) >= 0.1 ? `   (interior baseline ${baseline.toFixed(2)} removed)` : ""));
  // ⛔ The peak is looked for in the RING BAND ONLY (depths 0-7 — a 1px border plus
  // a 1px ring at dsf 4). Scanning all 16 lets ordinary content noise deep inside
  // the panel win the "peak", which is how the anomaly above was first read.
  const band = delta.slice(0, 8);
  const peak = band.reduce((m, v, i) => (Math.abs(v) > Math.abs(band[m]) ? i : m), 0);
  moved[kind] = { peak, value: band[peak] };
}

const fmt = (k) => `${k} peaks at depth ${moved[k].peak} (${moved[k].value > 0 ? "+" : ""}${moved[k].value.toFixed(2)})`;
console.log(`  → ${fmt("top")} · ${fmt("left")}`);

// The verdict is about EVENNESS, which is the whole of M1's geometry half: a
// one-sided lamp changes the top and leaves the left alone. Anything below 0.1
// (×1000 luminance) is noise on an 8-bit raster — a full 8-bit step at this
// luminance is about 0.6.
const LIT = 0.1;
const lit = { top: Math.abs(moved.top.value) >= LIT, left: Math.abs(moved.left.value) >= LIT };
const ok = lit.top && lit.left;
// ⛔ THE VERDICT NAMES WHAT IT SAW. "One edge moved and the other did not" printed
// over a pair where NEITHER moved is a check describing a defect it did not
// observe — and a run whose failure text is wrong gets disbelieved on the day it
// is right. Three outcomes, three sentences.
console.log(
  ok
    ? "  ✅ BOTH edges moved — the light wraps rather than sitting on one side"
    : !lit.top && !lit.left
      ? "  ⛔ NOTHING moved on either edge — these two images are the same surface; the atom changed no light here"
      : `  ⛔ only the ${lit.top ? "TOP" : "LEFT"} edge moved: that is a one-sided lamp, which is what M1 bans`,
);
process.exit(ok ? 0 : 1);
