/** Static red proof for the classic parity clock calibrations; no server or browser. */
import { createHash } from "node:crypto";
import { maskPositionCountdown, steadyTimeLeftLayout, timeLeftPaths } from "./classic-parity-noise.mjs";

const ring = (dash, value, label = "Selection closes") => `<svg role="img" aria-label="${label}" class="shrink-0"><circle></circle><circle stroke-dashoffset="${dash}"></circle><text>${value}</text></svg>`;
function clockGuard(mask) {
  return mask(ring(12.2, "3d")) === mask(ring(12.6, "2d"))
    && mask(ring(12.2, "3d")) !== mask(ring(12.6, "2d", "Selection closed"))
    && mask(ring(12.2, "3d")) !== mask(ring(12.2, "wrong"));
}

const html = '<main><article><span class="mcardp-meta-right"><span class="mcardp-timeleft">~date</span></span></article></main>';
const parent = "main>article0>span0", child = `${parent}>span0`;
const id = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
function layout(x, width, margin, y = 30, colour = "rgb(1, 2, 3)") {
  const store = {};
  const outer = `display:flex\nmargin-left:${margin}px\ncolor:${colour}`;
  const inner = "display:inline\nmargin-left:0px\ncolor:rgb(1, 2, 3)";
  store[id(outer)] = outer;
  store[id(inner)] = inner;
  return { store, text: `${parent} ${x},${y},${width}x17 ${id(outer)}\n${child} ${x},${y},${width}x17 ${id(inner)}` };
}
function steady(sample, htmlText = html, transform = steadyTimeLeftLayout) {
  return transform(sample.text, htmlText, sample.store);
}
function layoutGuard(transform) {
  const first = steady(layout(20, 70, 12), html, transform);
  return timeLeftPaths(html).size === 2
    && first === steady(layout(18, 72, 14), html, transform)
    && first !== steady(layout(2, 72, 0), html, transform)
    && first !== steady(layout(18, 72, 14, 31), html, transform)
    && first !== steady(layout(18, 72, 14, 30, "rgb(9, 2, 3)"), html, transform)
    && steady(layout(20, 70, 12), html.replace("~date", "Closed"), transform)
      !== steady(layout(18, 72, 14), html.replace("~date", "Closed"), transform);
}

if (!clockGuard(maskPositionCountdown)) throw new Error("the clock mask lost a numeric value or an accessible status");
if (!layoutGuard(steadyTimeLeftLayout)) throw new Error("the date mask lost a stable right edge or a real change");
if (process.argv.includes("--prove-red")) {
  // The retired forms erased the whole accessible label and both horizontal coordinates.
  const oldClock = (s) => maskPositionCountdown(s).replace(/\baria-label="[^"]*"/, 'aria-label="~countdown"');
  const oldLayout = (text, markup, store) => steadyTimeLeftLayout(text, markup, store).replace(/right:-?[\d.]+,/g, "right:~,");
  if (clockGuard(oldClock)) throw new Error("the old accessible-label mask escaped the guard");
  if (layoutGuard(oldLayout)) throw new Error("the old right-edge mask escaped the guard");
  console.log("2/2 parity blind-spot plants caught");
} else console.log("clock value masked · accessible status kept · seeded date width masked · right edge kept");
