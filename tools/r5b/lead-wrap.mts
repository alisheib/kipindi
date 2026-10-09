// R5-B · CHECK: where the home's zero-balance lead breaks (17px Inter, `text-wrap: balance`), with and without the payment
// term kept whole. Balance = the narrowest width that keeps the greedy line count (Chrome's binary search), then greedy.
import { createRequire } from "node:module";
import { dict } from "file:///F:/kipindi-r5b/src/lib/i18n-dict.ts";
const fontkit = createRequire("F:/kipindi-r5b/package.json")("fontkit");
const inter = fontkit.openSync("F:/kipindi-r5b/src/lib/server/reports/fonts/Inter-Regular.ttf");
const w = (s: string) => inter.layout(s).positions.reduce((a: number, p: { xAdvance: number }) => a + p.xAdvance, 0) / inter.unitsPerEm * 17;
type Tok = { text: string; glue: boolean };
function tokens(text: string, keep: string | null): string[] {
  // words separated by spaces; a kept run's spaces are not break opportunities
  const words = text.split(" ");
  if (!keep) return words;
  const k = keep.split(" ");
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (words.slice(i, i + k.length).join(" ").toLowerCase() === keep.toLowerCase()) { out.push(words.slice(i, i + k.length).join(" ")); i += k.length - 1; }
    else out.push(words[i]);
  }
  return out;
}
function greedy(toks: string[], width: number): string[] {
  const lines: string[] = []; let cur = "";
  for (const t of toks) { const next = cur ? `${cur} ${t}` : t; if (w(next) <= width || !cur) cur = next; else { lines.push(cur); cur = t; } }
  if (cur) lines.push(cur);
  return lines;
}
function balanced(toks: string[], width: number): string[] {
  const n = greedy(toks, width).length;
  let lo = 0, hi = width;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (greedy(toks, mid).length > n) lo = mid; else hi = mid; }
  return greedy(toks, hi);
}
const cols: Record<string, number> = { "320": 288, "390": 358, "1024": 578, "1280": 578 };
for (const [loc, keep] of [["sw", dict.sw.wallet.mobileMoneyOnly], ["en", dict.en.wallet.mobileMoneyOnly]] as const) {
  const text = dict[loc].home.emptyBalance;
  for (const [vw, col] of Object.entries(cols)) {
    const a = balanced(tokens(text, null), col), b = balanced(tokens(text, keep), col);
    console.log(`${loc} ${vw} (col ${col}) now: ${a.map((l) => `[${l}] ${w(l).toFixed(0)}`).join(" / ")}`);
    console.log(`${loc} ${vw} (col ${col}) kept: ${b.map((l) => `[${l}] ${w(l).toFixed(0)}`).join(" / ")}`);
  }
}
