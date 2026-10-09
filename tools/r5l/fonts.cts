/* R5-L · the width model every measurement here uses — the faces the app serves (next/font's latin variable woff2s, copied
 * from F:/kipindi-main/.next/dev/static/media into S/r5l: Inter 83afe278…, JetBrains Mono 051742360…, Sora 6bd983bd… —
 * the same Sora file R5-E pinned, sha256 3902474d…):
 *   · Inter (`--font-body`) and Sora (`--font-display`): hmtx + the HVAR delta at the weight (fontkit cannot lay out a
 *     variable WOFF2, R5-E's note), plus Inter's GPOS kerning delta taken from the repo's static Inter (the mean of Medium and
 *     Bold for 600). Calibrated on tile 170 (results, 1280, sw): three pill and control labels measure 66 / 67.4 / 98.4px
 *     against 67.9 / 69.6 / 99.6 here — the model reads 1–2.2px (≤3%) wide, so a wrap it reports at the margin is said as such.
 *   · JetBrains Mono (`--font-mono`): a monospace face, every glyph 0.6em at every weight; letter-spacing per character.
 *   · CJK and full-width marks: 1em (the system CJK fallback face, `--font-cjk`).
 * Greedy wrapping at spaces (and between ideographs), the way a browser breaks a line; `text-balance` keeps greedy's line
 * count (it narrows the lines it has), so a line COUNT from greedy is the balanced one's too. */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const fontkit = req("fontkit");
const HERE = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/";
const STATIC = "F:/kipindi-r5l/src/lib/server/reports/fonts/";
const varAt: Record<string, any> = {};
const varFont = (file: string, wght: number) => { const k = `${file}@${wght}`; if (!varAt[k]) { const f = fontkit.openSync(HERE + file); f.variationCoords = [wght]; varAt[k] = f; } return varAt[k]; };
const sR = fontkit.openSync(STATIC + "Inter-Regular.ttf"), sM = fontkit.openSync(STATIC + "Inter-Medium.ttf"), sB = fontkit.openSync(STATIC + "Inter-Bold.ttf");

export const HAN = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;
const cache = new Map<string, number>();
function varAdv(file: string, wght: number, s: string): number {
  const f = varFont(file, wght), vp = f._variationProcessor;
  let w = 0;
  for (const ch of Array.from(s)) {
    const gid = f._cmapProcessor.lookup(ch.codePointAt(0));
    w += f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0);
  }
  return w / f.unitsPerEm;
}
function kern(font: any, s: string): number {
  const run = font.layout(s);
  const laid = run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0);
  const plain = Array.from(s).reduce((a: number, ch: string) => a + font.glyphForCodePoint(ch.codePointAt(0)).advanceWidth, 0);
  return (laid - plain) / font.unitsPerEm;
}
function interEm(s: string, wght: number): number {
  const k = `${wght}|${s}`;
  let v = cache.get(k);
  if (v === undefined) {
    const kd = wght >= 650 ? kern(sB, s) : wght >= 550 ? (kern(sM, s) + kern(sB, s)) / 2 : wght >= 450 ? kern(sM, s) : kern(sR, s);
    v = varAdv("inter-latin-var.woff2", wght, s) + kd;
    cache.set(k, v);
  }
  return v;
}

export type Face = "sans" | "mono" | "display";
export type Run = { face: Face; px: number; wght?: number; ls?: number /* px per character */; upper?: boolean };

/** The advance of a string in one run's face, size, weight and letter-spacing. */
export function width(s: string, r: Run): number {
  const text = r.upper ? s.toUpperCase() : s;
  const wght = r.wght ?? 400;
  let w = 0, latin = "";
  const flush = () => {
    if (!latin) return;
    if (r.face === "mono") w += [...latin].length * 0.6 * r.px;
    else if (r.face === "display") w += varAdv("sora-latin-var.woff2", wght, latin) * r.px;
    else w += interEm(latin, wght) * r.px;
    latin = "";
  };
  for (const ch of Array.from(text)) {
    if (HAN.test(ch)) { flush(); w += r.px; } else latin += ch;
  }
  flush();
  return w + (r.ls ?? 0) * Array.from(text).length;
}

/** Break opportunities: after a space, and around an ideograph (a mark that may not start a line keeps with the one
 *  before it). */
function pieces(s: string, r: Run): Array<{ w: number; space: number }> {
  const out: Array<{ w: number; space: number }> = [];
  const NO_START = /[，。、；：！？）」』】〉》”’,.!?;:)\]}%]/;
  let cur = "";
  const push = (space: string) => { if (cur || out.length === 0) out.push({ w: width(cur, r), space: space ? width(space, r) : 0 }); else out[out.length - 1].space += width(space, r); cur = ""; };
  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === " ") { push(" "); continue; }
    if (HAN.test(ch) && cur && !NO_START.test(ch)) push("");
    cur += ch;
    if (HAN.test(ch) && i + 1 < chars.length && chars[i + 1] !== " " && !NO_START.test(chars[i + 1])) push("");
  }
  if (cur) push("");
  return out.filter((p) => p.w > 0 || p.space > 0);
}

/** Greedy line count of a sentence in a box `room` px wide. */
export function lines(s: string, r: Run, room: number): number {
  const ps = pieces(s, r);
  let n = 1, x = 0;
  for (const p of ps) {
    if (x > 0 && x + p.w > room + 0.01) { n++; x = p.w + p.space; }
    else x += p.w + p.space;
  }
  return n;
}

/** How many lines a wrapping flex row of these item widths takes in `room`, `gap` apart. */
export function flexLines(items: number[], room: number, gap: number): number {
  let n = 1, x = 0;
  for (const it of items) { if (x > 0 && x + gap + it > room + 0.01) { n++; x = it; } else x = x === 0 ? it : x + gap + it; }
  return n;
}
