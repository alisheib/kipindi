/**
 * R5-K's measuring kit — text widths from the repo's own fonts (fontkit), the way R5-H's measure-bars.cts and R5-E's
 * Sora table measured: Inter (body) Regular/Medium/Bold (600 = the mean of Medium and Bold), JetBrains Mono Regular/Bold,
 * Sora (display) from next/font's latin variable file at 600/700; a CJK ideograph or full-width mark is 1em (every CJK
 * face); U+2060 is zero-width and joins. Line counts by greedy wrapping (CSS `text-wrap: balance` keeps the greedy count).
 */
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const fontkit = req("fontkit");
export const { dict } = req("F:/kipindi-r5k/src/lib/i18n-dict.ts") as { dict: Record<string, any> };
const FD = "F:/kipindi-r5k/src/lib/server/reports/fonts/";
const SORA = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5e/sora-latin-var.woff2";
const open = (p: string) => fontkit.openSync(p);
const F = {
  interR: open(FD + "Inter-Regular.ttf"), interM: open(FD + "Inter-Medium.ttf"), interB: open(FD + "Inter-Bold.ttf"),
  monoR: open(FD + "JetBrainsMono-Regular.ttf"), monoB: open(FD + "JetBrainsMono-Bold.ttf"),
};
const soraAt = (w: number) => {
  const f = open(SORA); f.variationCoords = [w];
  const vp = f._variationProcessor;
  return (ch: string) => {
    const gid = f._cmapProcessor.lookup(ch.codePointAt(0));
    const adv = f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0);
    return adv / f.unitsPerEm;
  };
};
const SORA6 = soraAt(600), SORA7 = soraAt(700);
const CJK = /[\u2E80-\u9FFF\u3000-\u303F\uFF00-\uFFEF\u2014\u2026]/;
const em = (font: any, ch: string) => font.layout(ch).glyphs.reduce((a: number, g: any) => a + g.advanceWidth, 0) / font.unitsPerEm;
export type Face = "inter" | "mono" | "sora";
export type Spec = { face: Face; px: number; weight?: number; track?: number /* em */; upper?: boolean };
/** One character's advance in px (letter-spacing included). */
export function adv(ch: string, s: Spec): number {
  if (ch === "\u2060" || ch === "\u200b") return 0;
  const t = (s.track ?? 0) * s.px;
  if (CJK.test(ch) && !(s.face === "inter" && (ch === "\u2014" || ch === "\u2026"))) return s.px + t;
  const w = s.weight ?? 400;
  let e: number;
  if (s.face === "sora") e = w >= 700 ? SORA7(ch) : SORA6(ch);
  else if (s.face === "mono") e = em(w >= 600 ? F.monoB : F.monoR, ch);
  else e = w >= 700 ? em(F.interB, ch) : w >= 600 ? (em(F.interM, ch) + em(F.interB, ch)) / 2 : w >= 500 ? em(F.interM, ch) : em(F.interR, ch);
  return e * s.px + t;
}
export function width(text: string, s: Spec): number {
  const str = s.upper ? text.toUpperCase() : text;
  return [...str].reduce((a, ch) => a + adv(ch, s), 0);
}
/**
 * Greedy line count. Break opportunities: after a space, between two CJK characters (unless `keepAll`, CSS
 * `word-break: keep-all`, where only spaces and CJK punctuation break), never next to U+2060. `nowrapRuns` keeps given
 * substrings whole (a `whitespace-nowrap` span). A word longer than the line overflows (counted as one line).
 */
export function lines(text: string, s: Spec, room: number, opts: { keepAll?: boolean } = {}): number {
  const str = s.upper ? text.toUpperCase() : text;
  const chars = [...str];
  // Segment into unbreakable pieces, each with the space that follows it.
  const pieces: Array<{ w: number; trail: number }> = [];
  let cur = 0, i = 0;
  const flush = (trail: number) => { pieces.push({ w: cur, trail }); cur = 0; };
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === " ") { flush(adv(" ", s)); i++; continue; }
    cur += adv(ch, s);
    const next = chars[i + 1];
    const cjkHere = CJK.test(ch), cjkNext = next !== undefined && CJK.test(next);
    const punct = /[，。、；：！？）」』】]/;
    if (!opts.keepAll && next !== undefined && next !== " " && next !== "\u2060" && ch !== "\u2060" && (cjkHere || cjkNext) && !punct.test(next)) flush(0);
    else if (opts.keepAll && next !== undefined && punct.test(ch)) flush(0);
    i++;
  }
  if (cur > 0) flush(0);
  let n = 1, x = 0;
  for (const p of pieces) {
    if (p.w === 0 && p.trail > 0) { x += p.trail; continue; }
    if (x > 0 && x + p.w > room + 0.01) { n++; x = p.w + p.trail; }
    else x += p.w + p.trail;
  }
  return n;
}
/** The overridden spacing scale (tailwind.config.ts) — and the stock keys it does not override. */
export const SP: Record<string, number> = { "0": 0, px: 1, "0.5": 2, "1": 4, "1.5": 8, "2": 12, "2.5": 10, "3": 16, "3.5": 14, "4": 20, "5": 24, "6": 32, "7": 40, "8": 48, "9": 64, "10": 80, "11": 96, "12": 128 };
export const WIDTHS = [320, 360, 390, 640, 768, 1024, 1280];
export const LOCALES = ["sw", "en", "zh"] as const;
/** The content width of a PageContainer tier at a viewport width (px-3 lg:px-6; border-box max-width). */
export function column(tier: "form" | "receipt" | "reading", vw: number): number {
  const max = { form: 640, receipt: 560, reading: 1080 }[tier];
  const pad = vw >= 1024 ? 64 : 32;
  return Math.min(vw, max) - pad;
}
/** Greedy line count over runs of different faces (e.g. a sentence with `.amount` figures in mono). */
export function linesSeg(segs: Array<[string, Spec]>, room: number, opts: { keepAll?: boolean } = {}): number {
  type P = { w: number; trail: number };
  const pieces: P[] = [];
  let cur = 0;
  const punct = /[，。、；：！？）」』】]/;
  const flat: Array<[string, Spec]> = [];
  for (const [text, s] of segs) for (const ch of (s.upper ? text.toUpperCase() : text)) flat.push([ch, s]);
  for (let i = 0; i < flat.length; i++) {
    const [ch, s] = flat[i];
    if (ch === " ") { pieces.push({ w: cur, trail: adv(" ", s) }); cur = 0; continue; }
    cur += adv(ch, s);
    const next = flat[i + 1]?.[0];
    const cjk = /[⺀-鿿　-〿＀-￯]/;
    if (!opts.keepAll && next !== undefined && next !== " " && next !== "⁠" && ch !== "⁠" && (cjk.test(ch) || cjk.test(next)) && !punct.test(next)) { pieces.push({ w: cur, trail: 0 }); cur = 0; }
    else if (opts.keepAll && next !== undefined && punct.test(ch)) { pieces.push({ w: cur, trail: 0 }); cur = 0; }
  }
  if (cur > 0) pieces.push({ w: cur, trail: 0 });
  let n = 1, x = 0;
  for (const p of pieces) {
    if (p.w === 0 && p.trail > 0) { x += p.trail; continue; }
    if (x > 0 && x + p.w > room + 0.01) { n++; x = p.w + p.trail; } else x += p.w + p.trail;
  }
  return n;
}
/** A sentence split into its money runs (`moneyRuns`' pattern) — figures in the 13px mono `.amount` face. */
export function moneySegs(text: string, base: Spec): Array<[string, Spec]> {
  const re = /[+−]?TZS[  ]−?\d+(?:,\d{3})*(?:\.\d+)?[KMB]?/g;
  const out: Array<[string, Spec]> = []; let last = 0;
  for (const m of text.matchAll(re)) { const at = m.index ?? 0; if (at > last) out.push([text.slice(last, at), base]); out.push([m[0], { ...base, face: "mono", weight: 400 }]); last = at + m[0].length; }
  if (last < text.length) out.push([text.slice(last), base]);
  return out;
}
