/* R5-L · calibrate the width model against tile 170 (results, 1280, sw): measured text widths from the pill boxes. */
const { width } = require("./fonts.cts");
const words: Array<[string, number]> = [["Mpya zaidi", 66], ["Muda wote", 67.4], ["NDIO / HAPANA", 98.4]];
for (const [s, want] of words) {
  const r = [500, 600, 700].map((w) => width(s, { face: "sans", px: 13, wght: w }).toFixed(2));
  console.log(`${s.padEnd(16)} measured ${want}  model 500/600/700: ${r.join(" / ")}`);
}
