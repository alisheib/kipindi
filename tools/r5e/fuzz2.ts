import { markup, textOf, a11yTextOf, keyIssues, captureWarnings } from "./h.ts";
import { keepLastWords, keepSentences, keepYears } from "F:/kipindi-r5e/src/components/ui/keep-words.tsx";
import { hangCjkMarks } from "F:/kipindi-r5e/src/lib/cjk-marks.tsx";
let seed = 31337; const r = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; };
const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
const LAT = ["Act", "2022", "1999", "2026", "3000", "1799", "Toleo", "na", "kanuni", "Phones", "only.", "Hidden!", "Why?", "e.g.", "2026-10-07", "16221", "(Act", "2022)", "2022.", "2022;", "x", "TZS", "4,200.", "Yes!", "Wait...", "U.S.", "1.5", "a.b"];
const WS = [" ", " ", " ", "  ", "\t", "\n", "\u00a0", "\u2003"];
const ZH = ["你好", "世界", "链接可能已失效", "市场", "或URL", "请选择", "Simba", "200", "毫米", "「好」", "（注）", "“引号”"];
const MK = ["。", "，", "、", "；", "：", "！", "？", "？！", "。”", "，」", "。）", "…", "——", " ", "\u3000"];
let n = 0, fails = 0, shaped = { lw: 0, s: 0, y: 0, c: 0 };
const fail = (m: string) => { fails++; if (fails < 8) console.log("FAIL", m); };
for (let i = 0; i < 6000; i++) {
  let s = ""; const k = Math.floor(r() * 10);
  for (let j = 0; j < k; j++) s += pick(LAT) + (r() < 0.85 ? pick(WS) : "");
  for (const [name, f] of [["lw", keepLastWords], ["s", keepSentences], ["y", keepYears]] as const) {
    let html = ""; let node: unknown;
    const w = captureWarnings(() => { node = f(s); html = markup(node); });
    n++;
    if (w.warnings.length) fail(`${name} warn ${w.warnings[0].slice(0, 80)}`);
    if (textOf(html) !== s) fail(`${name} text ${JSON.stringify(s)}`);
    if (keyIssues(node).length) fail(`${name} keys ${JSON.stringify(s)}`);
    const spans = [...html.matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => textOf(m[1]));
    if (spans.length) shaped[name]++;
    if (name === "lw" && spans.length && !/^\S+\s+\S+\s*$/.test(spans[0])) fail(`lw span ${JSON.stringify(spans[0])}`);
    if (name === "y" && spans.some((x) => !/^\S+\s+(?:1[89]|2\d)\d\d$/.test(x))) fail(`y span ${JSON.stringify(spans)}`);
    if (name === "s" && spans.length > 1 && spans.slice(0, -1).some((x) => !/[.!?]$/.test(x))) fail(`s span ${JSON.stringify(spans)}`);
  }
  let z = ""; const q = Math.floor(r() * 12);
  for (let j = 0; j < q; j++) z += r() < 0.55 ? pick(ZH) : pick(MK);
  let html = ""; let node: unknown;
  const w = captureWarnings(() => { node = hangCjkMarks(z); html = markup(node); });
  n++;
  if (w.warnings.length) fail(`c warn`);
  if (a11yTextOf(html) !== z) fail(`c a11y text ${JSON.stringify(z)}`);
  if (keyIssues(node).length) fail(`c keys`);
  if (/kp-cjk-mark/.test(html)) shaped.c++;
  // a gap only directly after a mark span
  if (/<\/span>(?!<span aria-hidden)[^<]*<span aria-hidden="true" class="kp-cjk-gap/.test(html)) fail(`c gap not after mark ${JSON.stringify(z)}`);
  // a hung mark is never followed by white space, a closer or another mark
  for (const m of html.matchAll(/<span class="kp-cjk-mark[^"]*">(.)<\/span>(?:<span aria-hidden="true"[^>]*> <\/span>)?(.?)/gu)) {
    if (m[2] && /[\s”’」』）》】〉〕)\]}。，、；：！？]/u.test(m[2])) fail(`c hung before ${JSON.stringify(m[2])} in ${JSON.stringify(z)}`);
  }
}
console.log(`checks ${n}, fails ${fails}, shaped`, shaped);
