// R5-H · G-2b · /wallet's and /wallet/receipts' after-markup equals the before once the G-2b parts are taken back out:
// wallet — the new bar block removed, the door's `kp-wallet-door ` removed, the spark+list `<section class="space-y-3">`
// unwrapped; the eyebrow key changed with an identical word. receipts — the new bar block replaced by the old one.
const fs = require("fs");
const [bf, af] = process.argv.slice(2);
const B = JSON.parse(fs.readFileSync(bf, "utf8")), A = JSON.parse(fs.readFileSync(af, "utf8"));
/** The outer HTML of the first element whose start tag begins with `startsWith`, balanced on <div>. */
function block(html, startsWith) {
  const at = html.indexOf(startsWith);
  if (at < 0) return null;
  let depth = 0, i = at;
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = at;
  for (let m; (m = re.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(at, re.lastIndex);
  }
  return null;
}
const BAR = '<div class="kp-discovery-bar sticky top-[56px] z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6" aria-hidden="true">';
let ok = 0, bad = [];
for (const l of ["sw", "en", "zh"]) for (const shell of ["journey", "classic"]) {
  {
    const k = `src/app/wallet/loading.tsx|${l}|${shell}`;
    let a = A[k];
    const bar = block(a, BAR);
    if (!bar) { bad.push(`${k}: no bar`); continue; }
    a = a.replace(bar, "").replace('<div class="kp-wallet-door flex justify-end"', '<div class="flex justify-end"');
    a = a.replace('<section class="space-y-3">', "");
    const last = a.lastIndexOf("</section>");
    a = a.slice(0, last) + a.slice(last + "</section>".length);
    if (a === B[k]) ok++; else bad.push(k);
  }
  {
    const k = `src/app/wallet/receipts/loading.tsx|${l}|${shell}`;
    const newBar = block(A[k], BAR), oldBar = block(B[k], BAR);
    if (!newBar || !oldBar) { bad.push(`${k}: no bar`); continue; }
    if (A[k].replace(newBar, oldBar) === B[k]) ok++; else bad.push(k);
  }
}
console.log(`${ok} of 12 renders equal the before once the G-2b parts are taken out${bad.length ? ` — differ: ${bad.join(", ")}` : ""}`);
const k = "src/app/wallet/loading.tsx|sw|classic";
console.log("\nthe new /wallet bar (sw):\n" + block(A[k], BAR).slice(0, 1400));
