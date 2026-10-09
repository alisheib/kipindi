// R6-A · predicted "after" for BetBreakNotice in its three hosts: the md Callout's text column (host − 2 border − 40 padding −
// 17 glyph − 16 gap), the sentence at 13px Inter (the repo's own font files, kerned advances), greedy-wrapped with the end
// kept as one run; zh at 13px per ideograph (no CJK font in the repo — an estimate). Line box 13 × 1.375 = 17.875px.
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r6a/src/lib/i18n-dict.ts";
import { breakSentence } from "file:///F:/kipindi-r6a/src/lib/break-end.ts";
const fontkit = createRequire(import.meta.url)("F:/kipindi-r6a/node_modules/fontkit") as { openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number } };
const inter = fontkit.openSync("F:/kipindi-r6a/src/lib/server/reports/fonts/Inter-Regular.ttf");
const w = (s: string) => /[\u3000-\u9fff\uff00-\uffef]/.test(s) ? [...s].reduce((a, c) => a + (/[\u3000-\u9fff\uff00-\uffef]/.test(c) ? 13 : inter.layout(c).positions[0].xAdvance / inter.unitsPerEm * 13), 0) : inter.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / inter.unitsPerEm * 13;
const NOW = Date.UTC(2026, 9, 9, 11, 0); const UNTIL = new Date(NOW + 26 * 3_600_000).toISOString();
const HOSTS: Record<string, number> = {
  "market column lg (360)": 360, "market column 390 (358)": 358, "board card 1024 (3 cols, 306.7 − 32)": 274.7,
  "board card 1280 (3 cols, 392 − 32)": 360, "board card 390 (358 − 32)": 326, "round panel 1024 (~375)": 375, "round panel 390 (358)": 358,
};
for (const l of ["sw", "en", "zh"] as const) for (const ex of [false, true]) {
  const T = dict[l];
  const b = breakSentence(ex ? T.rg.exclusionActive : T.rg.breakActive, UNTIL, NOW, T.common.monthsShort, l);
  // tokens: the kept run whole, else words (zh: characters)
  const at = b.text.indexOf(b.keep[0]);
  const before = b.text.slice(0, at), run = b.keep[0], after = b.text.slice(at + run.length);
  const split = (s: string) => l === "zh" ? [...s] : s.split(/(?<= )/);
  const tokens = [...split(before), run, ...split(after)].filter(Boolean);
  const out: string[] = [];
  for (const [name, host] of Object.entries(HOSTS)) {
    const col = host - 2 - 40 - 17 - 16;
    let lines = 1, cur = 0;
    for (const tk of tokens) { const tw = w(tk); if (cur + tw > col + 0.5 && cur > 0) { lines++; cur = w(tk.trimStart()); } else cur += tw; }
    out.push(`${name}: col ${col.toFixed(1)}px → ${lines} lines, box ${(28 + lines * 17.875 + 2).toFixed(0)}px`);
  }
  console.log(`${l} ${ex ? "exclusion" : "break"} (${b.text.length} ch, end "${run}"):\n  ${out.join("\n  ")}`);
}
