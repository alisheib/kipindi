// The strips' trailing fade: 64px, so it always reaches a hidden chip's neighbour (cwd = F:/kipindi-vis).
const fs = require("fs");
const ed = (p, pairs) => {
  let s = fs.readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: anchor ×${n}: ${a.slice(0, 70)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};

ed("src/app/globals.css", [
  ["   that keeps a focused chip clear of it. */\n@media (max-width: 1023.98px) {\n  .kp-strip-fade {",
   "   that keeps a focused chip clear of it. */\n" +
   "/* ⭐ 2026-10-09 · round 3 [326] · …AND THE TRAILING RAMP IS 64px, SO IT ALWAYS REACHES INK. At 32px it could fall wholly on\n" +
   "   the padding of a chip that sits past the strip's end: on /results at sw 390 the fourth lens (\"Batili 1\") began at\n" +
   "   x284 with its label from x300, the strip ending at 302 and its ramp transparent from 294, so the only thing the ramp\n" +
   "   dimmed was HAPANA's \"2\" — the row read as finished, and its chips added up to 5 of the legend's 6. A 64px ramp (opaque\n" +
   "   to 100% − 72px, transparent 8px inside the edge, as before) always lies over the last visible label, so \"there is more\n" +
   "   this way\" shows whenever something is hidden. A strip with nothing hidden, or scrolled to its end, is still not\n" +
   "   masked; the keyboard's scroll padding at the end grows to the ramp's 72px, so a focused chip stops clear of it. */\n" +
   "@media (max-width: 1023.98px) {\n  .kp-strip-fade {"],
  ["    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent calc(100% - 8px));\n    mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent calc(100% - 8px));\n    scroll-padding-inline: 44px 40px;",
   "    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 72px), transparent calc(100% - 8px));\n    mask-image: linear-gradient(to right, #000 calc(100% - 72px), transparent calc(100% - 8px));\n    scroll-padding-inline: 44px 72px;"],
  ["    -webkit-mask-image: linear-gradient(to right, transparent 12px, #000 44px, #000 calc(100% - 40px), transparent calc(100% - 8px));\n    mask-image: linear-gradient(to right, transparent 12px, #000 44px, #000 calc(100% - 40px), transparent calc(100% - 8px));",
   "    -webkit-mask-image: linear-gradient(to right, transparent 12px, #000 44px, #000 calc(100% - 72px), transparent calc(100% - 8px));\n    mask-image: linear-gradient(to right, transparent 12px, #000 44px, #000 calc(100% - 72px), transparent calc(100% - 8px));"],
]);

ed("scripts/visual-pass-r3c.test.mts", [
  ["    start && both && /scroll-padding-inline:\\s*44px 40px/.test(css));\n",
   "    start && both && /scroll-padding-inline:\\s*44px 72px/.test(css));\n" +
   "  // The trailing ramp (round 3, tile 326): at least 64px, ending 8px inside, in the \"end\" and \"both\" masks alike, and the\n" +
   "  // keyboard's end padding covers it. Measured from the mask strings the stylesheet ships.\n" +
   "  const ramps = (src: string) => [...src.matchAll(/#000 calc\\(100% - (\\d+)px\\), transparent calc\\(100% - (\\d+)px\\)/g)]\n" +
   "    .map((m) => ({ ramp: Number(m[1]) - Number(m[2]), inset: Number(m[2]) }));\n" +
   "  const real = ramps(css);\n" +
   "  const endPad = Number(/scroll-padding-inline:\\s*44px (\\d+)px/.exec(css)?.[1] ?? NaN);\n" +
   "  ok(\"3.5 · the trailing ramp is at least 64px and ends 8px inside the strip, in every mask that has one (4: end and both, -webkit- and plain), and the keyboard's end padding reaches past it\",\n" +
   "    real.length === 4 && real.every((r) => r.ramp >= 64 && r.inset === 8) && endPad >= Math.max(...real.map((r) => r.ramp + r.inset)), JSON.stringify({ real, endPad }));\n" +
   "  const old = ramps(css.split(\"calc(100% - 72px)\").join(\"calc(100% - 40px)\"));\n" +
   "  ok(\"3.5′ PLANT · G1's 32px ramp put back is reported (it fell wholly on a hidden chip's padding at sw 390, tile 326)\",\n" +
   "    old.length === 4 && old.some((r) => r.ramp < 64));\n"],
]);
console.log("ok");
