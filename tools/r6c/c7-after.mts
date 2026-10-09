// C7 after: the invalid state's line = Inter 10px sentence + " · " + the range (mono 10px, one nowrap run of 150px).
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r6c/src/lib/i18n-dict.ts";
import { formatTzs } from "file:///F:/kipindi-r6c/src/lib/utils.ts";
const req = createRequire("F:/kipindi-r6c/package.json");
const fontkit = req("fontkit");
const inter = fontkit.openSync("F:/kipindi-r6c/src/lib/server/reports/fonts/Inter-Regular.ttf");
const iw = (s: string, size: number) => [...s].reduce((w, ch) => w + (/[㐀-鿿]/.test(ch) ? size : inter.layout(ch).positions.reduce((a: number, p: { xAdvance: number }) => a + p.xAdvance, 0) / inter.unitsPerEm * size), 0);
const range = `${formatTzs(1000)} – ${formatTzs(1_000_000)}`;
const rangeW = [...range].length * 6;
for (const loc of ["sw", "en", "zh"] as const) {
  const sentence = `${(dict as any)[loc].market.udStakeRange} · `;
  const sw = iw(sentence, 10);
  const cells = [320, 360, 390, 412].map((vw) => { const box = vw - 32 - 2 - 30; const one = sw + rangeW <= box; return `${vw}: ${one ? "one line" : "the range on a line of its own"} (${(sw + rangeW).toFixed(0)} vs ${box})`; });
  console.log(`[${loc}] sentence ${sw.toFixed(1)}px + range ${rangeW}px → ${cells.join(" · ")}`);
}
