import { markup, textOf, show } from "./h.ts";
import { keepNameEnd, keepFigures, keepLastWords } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { hangCjkMarks } from "F:/kipindi-vis/src/lib/cjk-marks.tsx";
import { moneyRuns, moneySentence } from "F:/kipindi-vis/src/lib/fill-nodes.tsx";
import { emptyStateBody } from "F:/kipindi-vis/src/components/ui/empty-state-text.ts";
import { dict } from "F:/kipindi-vis/src/lib/i18n-dict.ts";

const body = (html: string) => html.replace(/^<div>|<\/div>$/g, "");
const esc = (s: string) => s.replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufe0f]/g, (c) => "\\u" + c.codePointAt(0)!.toString(16).padStart(4, "0"));

console.log("== keepNameEnd: grapheme clusters (ZWJ emoji, flags, keycaps)");
for (const n of ["Ali 👨‍👩‍👧", "Neema 👩‍💻", "Juma 🏳️‍🌈", "Rehema ❤️‍🔥", "Asha 👍🏽", "Ali 🇹🇿", "Zoe\u0308", "Namba 1️⃣"]) {
  const m = body(markup(keepNameEnd(n)));
  const span = m.match(/<span class="whitespace-nowrap">([^<]*)<\/span>/)?.[1] ?? "(none)";
  const segs = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(n)].map((s) => s.segment);
  const lastG = segs[segs.length - 1];
  console.log(`  ${esc(n)}  →  span ${esc(span)}  (cps ${Array.from(span).length})  splits the last grapheme ${esc(lastG)}: ${!span.startsWith(lastG) && lastG.length > span.length || (span.length < lastG.length && lastG.endsWith(span)) ? "YES" : "no"}`);
}

console.log("== keepNameEnd: the glue is unbounded when the gap is non-collapsing white space (zod: trim + max 40 UTF-16)");
for (const n of ["AB" + "\u3000".repeat(37) + "C", "AB" + "\u2003".repeat(37) + "C", "AB" + "\u00a0".repeat(37) + "C", "AB" + " ".repeat(37) + "C"]) {
  const z = n.trim();
  const m = body(markup(keepNameEnd(z)));
  const span = textOf(m.match(/<span class="whitespace-nowrap">([^<]*)<\/span>/)?.[1] ?? "");
  console.log(`  len ${z.length} (trim keeps it: ${z === n})  nowrap run = ${Array.from(span).length} chars: ${esc(span).slice(0, 60)}…`);
}

console.log("== keepFigures: what the ideograph tail glues (zh titles) and the TZS head it drops");
for (const t of ["坦桑尼亚2026年世界杯预选赛", "达累斯萨拉姆7月降雨超过200毫米", "辛巴本赛季能赢5场比赛吗？", "奖金会超过TZS 1,000,000吗？", "TZS 4,200以上", "比分2比1", "Simba watapata TZS 1 bilioni?", "Bei ya TZS 4,200 milioni"]) {
  const runs = [...body(markup(keepFigures(t))).matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((x) => x[1]);
  console.log(`  ${t}  →  runs ${JSON.stringify(runs)}`);
}

console.log("== moneySentence: every figure whole (fuzz vs moneyRuns)");
let bad = 0; let n = 0;
const W = ["Soko", "limefutwa", "TZS", "4,200", "TZS 4,200", "TZS\u00a05,000,000", "imerejeshwa", "kwenye", "pochi", "yako.", "(TZS 1,015)", "TZS 9.9M.", "na", "x"];
let seed = 7; const r = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let i = 0; i < 3000; i++) {
  const k = 1 + Math.floor(r() * 7); const parts: string[] = [];
  for (let j = 0; j < k; j++) parts.push(W[Math.floor(r() * W.length)]);
  const s = parts.join(r() < 0.8 ? " " : "\u00a0");
  const a = [...markup(moneySentence(s)).matchAll(/<span class="amount">([^<]*)<\/span>/g)].map((x) => x[1]).join("|");
  const b = [...markup(moneyRuns(s)).matchAll(/<span class="amount">([^<]*)<\/span>/g)].map((x) => x[1]).join("|");
  n++; if (a !== b) { bad++; if (bad < 4) console.log("   MISMATCH", show(s), a, "vs", b); }
}
console.log(`  ${n - bad}/${n} sentences: moneySentence's figures == moneyRuns' figures`);

console.log("== hangCjkMarks: the DOM text (textContent / innerText) of real zh strings");
const D = dict as unknown as Record<string, Record<string, Record<string, string>>>;
for (const v of [D.zh.market.whichWay, D.zh.market.chooseSideHelp, D.zh.common.notFoundHint ?? "链接可能已失效，市场可能已结算，或URL输入有误。请选择以下目的地继续。"]) {
  const m = body(markup(hangCjkMarks(v)));
  console.log(`  ${v}\n     textContent: ${JSON.stringify(textOf(m))}  (+${textOf(m).length - v.length} chars)`);
}

console.log("== emptyStateBody: dictionary strings that reach EmptyState bodies with a U+2060 / U+00A0 inserted (zh/sw/en samples)");
const samples: string[] = [];
const walk = (o: unknown, p: string) => {
  if (typeof o === "string") { if (/——/.test(o) && samples.length < 4) { const b = emptyStateBody(o); if (b !== o) samples.push(`${p}: ${esc(b).slice(0, 90)}`); } }
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
};
walk(D.zh, "zh");
for (const s of samples) console.log("  ", s);
void keepLastWords;
