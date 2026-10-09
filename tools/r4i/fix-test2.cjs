const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/visual-pass-r4i.test.mts", [
  [`const soraW = (s: string, size: number, track = 0) => widthMixed(interBold, s, size) * (0.517 / 0.492) + track * size * ([...s].length - 1);`,
   `const SORA_CAL = 1.03; // the measured headings' ink + their 2–3px of side bearing, over the bare ratio (2.7′)
const soraW = (s: string, size: number, track = 0) => widthMixed(interBold, s, size) * (0.517 / 0.492) * SORA_CAL + track * size * ([...s].length - 1);`],
  [`  ok(\`2.7′ · the heading model is calibrated on the tiles: "Karibu tena" \${cal[0].toFixed(0)}px (ink 158), "Welcome back" \${cal[1].toFixed(0)}px (ink 208) — never narrower than the ink, within 6%\`,
    cal[0] >= 158 && cal[0] <= 158 * 1.06 && cal[1] >= 208 && cal[1] <= 208 * 1.06);`,
   `  ok(\`2.7′ · the heading model is calibrated on the tiles: "Karibu tena" \${cal[0].toFixed(0)}px (ink 158), "Welcome back" \${cal[1].toFixed(0)}px (ink 208) — never narrower than ink + 2px, within 6%\`,
    cal[0] >= 160 && cal[0] <= 158 * 1.06 && cal[1] >= 210 && cal[1] <= 208 * 1.06);`],
  [`      return [t.rg.breakLength, t.rg.exclusionPeriod].every((s) => legendPx(s) <= widths[l])
        && [t.rg.dur1hour, t.rg.dur24h, t.rg.dur1week, t.rg.dur1month, t.rg.dur6months, t.common.permanent].every((s) => selectPx(s) <= widths[l]);`,
   `      return [t.rg.breakLength, t.rg.exclusionPeriod].every((s) => legendPx(s) <= widths[l] + 1e-6)
        && [t.rg.dur1hour, t.rg.dur24h, t.rg.dur1week, t.rg.dur1month, t.rg.dur6months, t.common.permanent].every((s) => selectPx(s) <= widths[l] + 1e-6);`],
]);
