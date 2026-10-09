// G4: the journey bell's count badge clears the dome — 1px higher, and no rose glow on the opaque journey bar.
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
const SHADOW = "0 2px 4px color-mix(in oklab, var(--royal-950) 40%, transparent)";

ed("src/app/globals.css", [
  ["   touch (A1, `qa:bell-untouched`). The selector names the journey's slot, so the classic bar is served what it was. */\n.kp-jhdr__bell .count-badge { top: -2px !important; right: auto !important; left: 21px !important; }",
   "   touch (A1, `qa:bell-untouched`). The selector names the journey's slot, so the classic bar is served what it was.\n" +
   "   ⭐ …AND IT CLEARS THE DOME, NOT ONLY LEAVES IT (round 4, 2026-10-09, tiles 268 269 276 277 278). At top −2 the ring\n" +
   "   still touched the dome's top-right shoulder (no gap at 1024: red x919–938 y8–21 against the dome's x911–921 y22–31),\n" +
   "   and the rose lift's 8px glow (`.count-badge[data-lift=\"rose\"]`) dyed the shoulder's stroke (x918–921 y21–24). The\n" +
   "   pip rises 1px (−3), which opens a 1px gap between its ring and the dome. It cannot move right: \"99+\" at the pulse's\n" +
   "   peak already ends 1px from the avatar. In this slot it also drops the glow and keeps the lift's dark drop: the glow is\n" +
   "   there because the classic bar is GLASS, where a flat drop disappears (the lift's own note), and the journey's bar\n" +
   "   is an opaque panel (7.frame). Classic pips keep both. */\n" +
   `.kp-jhdr__bell .count-badge { top: -3px !important; right: auto !important; left: 21px !important; box-shadow: ${SHADOW}; }`],
]);

ed("scripts/journey-shell.test.mts", [
  [`pip: pip.includes("top: -2px !important") && pip.includes("right: auto !important") && pip.includes("left: 21px !important"),`,
   `pip: pip.includes("top: -3px !important") && pip.includes("right: auto !important") && pip.includes("left: 21px !important")\n` +
   `      // round 4: no rose glow in the journey's slot (the lift's glow dyed the dome) — the dark drop only.\n` +
   `      && pip.includes("box-shadow: ${SHADOW};") && !/box-shadow:[^;]*8px/.test(pip),`],
  [`    const pipInlineWins = withCss(inRule(".kp-jhdr__bell .count-badge", "top: -2px !important;", "top: -2px;"));\n`,
   `    const pipInlineWins = withCss(inRule(".kp-jhdr__bell .count-badge", "top: -3px !important;", "top: -3px;"));\n` +
   `    const pipGlowBack = withCss(inRule(".kp-jhdr__bell .count-badge", "box-shadow: ${SHADOW};", "box-shadow: 0 0 8px var(--no-500), ${SHADOW};"));\n`],
]);
console.log("ok");
