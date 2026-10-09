// A model of Chromium's line breaking for one title box — greedy, `text-wrap: pretty` and `text-wrap: balance` — after
// third_party/blink/renderer/core/layout/inline/score_line_breaker.cc (main, read 2026-10-09):
//   · ShouldOptimize (pretty only): the greedy last line is shorter than available / 3 AND has no break opportunity
//     inside it ("optimize only when the last line has a single word").
//   · Optimize: needs >= 3 break opportunities; adds kOrphansPenalty = 10000 (x zoom) to the LAST candidate.
//   · ComputeScores: a line's score is delta^2 (delta = available - line width; overfull = huge), plus the end
//     candidate's penalty and line_penalty_ (non-justified: 4 x available x font-size); for pretty the LAST line has no
//     width score, only kLastLinePenaltyMultiplier (4) x its start candidate's penalty; balance scores the last line too.
//   · kMaxLinesForOptimal = 4, kMaxLinesForBalance = 6.
// Balance is also modelled the older way (bisection: the narrowest width that keeps greedy's line count), so a verdict
// that holds under both does not depend on which one a given Chromium ships.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const req = createRequire("F:/kipindi-r5e/package.json");
const fontkit = req("fontkit");

// fontkit cannot instance a WOFF2 variable font (getVariation re-reads the WOFF2 stream as TTF), so each weight is its own
// open font with `variationCoords` set before first use, and an advance is hmtx + the HVAR delta (no GPOS kerning).
const SORA = fileURLToPath(new URL("./sora-latin-var.woff2", import.meta.url));
const soraAt: Record<number, any> = {};
const soraFont = (wght: number) => { if (!soraAt[wght]) { const f = fontkit.openSync(SORA); f.variationCoords = [wght]; soraAt[wght] = f; } return soraAt[wght]; };
const sora = (wght: number) => ({
  layout(s: string) {
    const f = soraFont(wght), vp = f._variationProcessor;
    return { positions: Array.from(s).map((ch) => {
      const gid = f._cmapProcessor.lookup(ch.codePointAt(0));
      return { xAdvance: f.hmtx.metrics.get(gid).advance + (vp ? vp.getAdvanceAdjustment(gid, f.HVAR) : 0) };
    }) };
  },
});

export const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
/** Full-width marks, drawn 1em by the CJK fallback face. */
const FW = /[\u3000-\u303f\uff00-\uffef]/;
const NO_BREAK_BEFORE = /[，。、；：！？）」』】〉》”’,.!?;:)\]}%]/;
const NO_BREAK_AFTER = /[（「『【〈《“‘(\[{$€£]/;
const wide = (c: string) => HAN.test(c) || FW.test(c);

export type Box = { size: number; wght: number; ls: number /* em */ };

/** Advance of one string in px (Sora for Latin, 1em for Han and full-width), letter-spacing after every character. */
export function adv(s: string, b: Box): number {
  let w = 0;
  let latin = "";
  const flush = () => {
    if (!latin) return;
    const run = sora(b.wght).layout(latin);
    w += run.positions.reduce((a: number, p: any) => a + p.xAdvance, 0) / 1000 * b.size;
    latin = "";
  };
  for (const c of Array.from(s)) {
    if (wide(c)) { flush(); w += b.size; }
    else latin += c;
    w += b.ls * b.size;
  }
  flush();
  return w;
}

/** A piece never breaks inside; `space` is the collapsible space after it (it hangs at a line end); `brk` says whether a
 *  line may end after it. */
export type Piece = { text: string; w: number; space: number; brk: boolean };

/** Pieces from a rendered fragment: each nowrap span whole, the plain text split at its break opportunities (UAX #14 as
 *  it applies to this text: after a space, around an ideograph unless a closing mark follows or an opening mark
 *  precedes, after a hyphen before a letter; never inside a Latin word or a number). */
export function pieces(segments: Array<{ text: string; nowrap: boolean }>, b: Box): Piece[] {
  const chars: Array<{ c: string; id: number }> = [];
  segments.forEach((s, k) => { for (const c of Array.from(s.text)) chars.push({ c, id: s.nowrap ? k : -1 }); });
  const canBreak = (i: number) => {
    const a = chars[i - 1], z = chars[i];
    if (a.id >= 0 && a.id === z.id) return false;
    if (z.c === " ") return false;
    if (a.c === " ") return !NO_BREAK_BEFORE.test(z.c);
    if (NO_BREAK_BEFORE.test(z.c) || NO_BREAK_AFTER.test(a.c)) return false;
    if (wide(a.c) || wide(z.c)) return true;
    return a.c === "-" && /\p{L}/u.test(z.c);
  };
  const out: Piece[] = [];
  let cur = { text: "", spaces: 0 };
  const close = (brk: boolean) => {
    if (cur.text === "" && out.length) { out[out.length - 1].space += cur.spaces * adv(" ", b); out[out.length - 1].brk = brk; }
    else if (cur.text !== "") out.push({ text: cur.text, w: adv(cur.text, b), space: cur.spaces * adv(" ", b), brk });
    cur = { text: "", spaces: 0 };
  };
  chars.forEach((ch, i) => {
    if (i > 0 && canBreak(i)) close(true);
    // A space inside a nowrap span is part of the run ("dakika 28:00"); any other space is a collapsible gap.
    if (ch.c === " " && !(ch.id >= 0 && chars[i + 1]?.id === ch.id)) cur.spaces++;
    else cur.text += ch.c;
  });
  close(false);
  if (out.length) out[out.length - 1].brk = false;
  return out;
}

const lineW = (ps: Piece[], i: number, j: number) => { let w = 0; for (let k = i; k < j; k++) w += ps[k].w + ps[k].space; return w + ps[j].w; };
const lineText = (ps: Piece[], i: number, j: number) => ps.slice(i, j + 1).map((p, k) => p.text + (k < j - i && p.space > 0 ? " " : "")).join("");

/** Greedy: as much on each line as fits; a piece wider than the line takes a line of its own. Returns the index of the
 *  LAST piece of each line. */
export function greedy(ps: Piece[], W: number): number[] {
  const ends: number[] = [];
  let start = 0, lastBreak = -1;
  for (let j = 0; j < ps.length; j++) {
    if (j > start && lineW(ps, start, j) > W + 1e-6 && lastBreak >= start) {
      ends.push(lastBreak);
      start = lastBreak + 1;
      lastBreak = -1;
      j = start - 1;
      continue;
    }
    if (ps[j].brk) lastBreak = j;
  }
  ends.push(ps.length - 1);
  return ends;
}

function scoreDP(ps: Piece[], W: number, b: Box, balanced: boolean): number[] | null {
  const cands = ps.map((p, i) => (p.brk ? i : -1)).filter((i) => i >= 0);
  if (cands.length < 3) return null; // kMinCandidates
  const penalty = new Map<number, number>();
  for (const c of cands) penalty.set(c, 0);
  penalty.set(cands[cands.length - 1], 10000); // kOrphansPenalty on the last candidate
  const linePenalty = 4 * W * b.size; // hyphen_penalty_ = W x size x 2; line_penalty_ = 2 x that
  const OVER = 1e12;
  const ends = [...cands, ps.length - 1];
  const best = new Map<number, { s: number; prev: number }>();
  best.set(-1, { s: 0, prev: NaN });
  for (const e of ends) {
    const isLast = e === ps.length - 1;
    let bestHere: { s: number; prev: number } | null = null;
    for (const [sIdx, sv] of best) {
      if (sIdx >= e) continue;
      const delta = W - lineW(ps, sIdx + 1, e);
      const startPen = sIdx === -1 ? 0 : penalty.get(sIdx) ?? 0;
      let widthScore = 0, extra = 0;
      if (isLast && !balanced) { if (delta < 0) widthScore = OVER; else extra = 4 * startPen; }
      else widthScore = delta < 0 ? OVER : delta * delta;
      const endPen = isLast ? 0 : penalty.get(e) ?? 0;
      const s = sv.s + widthScore + extra + endPen + linePenalty;
      if (!bestHere || s < bestHere.s) bestHere = { s, prev: sIdx };
    }
    if (bestHere) best.set(e, bestHere);
  }
  const out: number[] = [];
  for (let e = ps.length - 1; e !== -1; e = best.get(e)!.prev) out.unshift(e);
  return out;
}

export function pretty(ps: Piece[], W: number, b: Box): number[] {
  const g = greedy(ps, W);
  if (g.length <= 1 || g.length > 4) return g;
  const lastStart = g[g.length - 2] + 1;
  const last = lineW(ps, lastStart, ps.length - 1);
  let breakInside = false;
  for (let k = lastStart; k < ps.length - 1; k++) if (ps[k].brk) breakInside = true;
  if (!(last < W / 3 && !breakInside)) return g;
  return scoreDP(ps, W, b, false) ?? g;
}

export function balanceScore(ps: Piece[], W: number, b: Box): number[] {
  const g = greedy(ps, W);
  if (g.length <= 1 || g.length > 6) return g;
  return scoreDP(ps, W, b, true) ?? g;
}

export function balanceBisect(ps: Piece[], W: number): number[] {
  const g = greedy(ps, W);
  if (g.length <= 1 || g.length > 6) return g;
  let lo = 0, hi = W;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (greedy(ps, mid).length > g.length) lo = mid; else hi = mid; }
  return greedy(ps, hi);
}

export function render(ps: Piece[], ends: number[]): Array<{ text: string; w: number }> {
  const out: Array<{ text: string; w: number }> = [];
  let s = 0;
  for (const e of ends) { out.push({ text: lineText(ps, s, e), w: lineW(ps, s, e) }); s = e + 1; }
  return out;
}
