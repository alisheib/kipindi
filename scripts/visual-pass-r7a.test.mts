/**
 * ROUND 7 OF THE VISUAL PASS, FIXER A (2026-10-10) — text: where lines break, names kept whole. Round 6's read
 * (triage-r6.md), the wrapping family; every finding re-measured first, every sibling brought to one convention.
 *
 *   npx tsx scripts/visual-pass-r7a.test.mts        (npm run test:visual-pass-r7a)
 *
 *   §1 R6-1 (a REGRESSION since round 5's H4, tile 244): the white space after a kept run is a text node of its own — every
 *      helper that draws a run before more text; Chromium's balance modelled from its source reproduces tiles 240–248 (r5
 *      and r6) and gives round 5's lines back on every empty-state body, in all three languages, at every measure
 *   §2 R1-1 / R2-2 / R3-1: a settlement source's name, with the connective that introduces it, is one inline block — the
 *      featured card and the board row; the zh 320 tile reproduced and kept whole after
 *   §3 R5-3 / R5-4 (the owner's item 37): no line ends on a connective — `connectiveRanges`, every legal title modelled at
 *      320–412, the page titles, the section heads, the empty-state titles, the hub's labels, the Board's name (its
 *      container conditions, the offline document's copy, global-error's copy)
 *   §4 R6-2: a market title's proper name is NOT held by a rule over capitals — refused with the corpus's numbers
 *   §5 the take-back hazard: every label that takes its tracking back is one line, and every such label fits its site
 *   §6 R5-8: the badge's progress count is a chip on the coin's edge, the tier pip's geometry in the progress inks
 *   §7 the words: no dictionary string changed; no helper inserts or drops a character
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r7/a/mutation-r7a.mjs.
 * The models: S/r7/a/tools (Python, HarfBuzz over the served fonts) — this file carries the same algorithms in TypeScript
 * over unkerned advances (R5-E's Sora tables; the repo's own Inter, identical to the served one on every character used).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const code = (p: string) => decomment(raw(p));
const css = () => decommentCss(raw("src/app/globals.css"));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup, renderToString } = req("react-dom/server") as typeof import("react-dom/server");
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
type Dict = Record<string, Record<string, unknown>>;
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Dict> };
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(dict[l], p) ?? `‹no ${p}›`);

const KW = "../src/components/ui/keep-words.tsx";
const kw = req(KW) as typeof import("../src/components/ui/keep-words.tsx");
const kr = req("../src/components/ui/keep-run.tsx") as typeof import("../src/components/ui/keep-run.tsx");
const est = req("../src/components/ui/empty-state-text.ts") as typeof import("../src/components/ui/empty-state-text.ts");
const conn = req("../src/lib/connectives.ts") as typeof import("../src/lib/connectives.ts");

/* ── the rendered tree, flattened into its text nodes (what a browser lays out as items) ─────────────────────────────── */
type Leaf = { text: string; nowrap: boolean };
function leaves(node: unknown, nowrap = false, out: Leaf[] = []): Leaf[] {
  if (node == null || node === false || node === true) return out;
  if (typeof node === "string" || typeof node === "number") { if (String(node) !== "") out.push({ text: String(node), nowrap }); return out; }
  if (Array.isArray(node)) { for (const n of node) leaves(n, nowrap, out); return out; }
  const el = node as { type?: unknown; props?: { className?: string; children?: unknown; style?: { whiteSpace?: string } } };
  if (el && el.props !== undefined) {
    const cls = String(el.props.className ?? "");
    const nw = nowrap || /\bwhitespace-nowrap\b/.test(cls) || el.props.style?.whiteSpace === "nowrap";
    if (typeof el.type === "function") return leaves((el.type as (p: unknown) => unknown)(el.props), nw, out);
    return leaves(el.props.children, nw, out);
  }
  return out;
}
const textOf = (ls: Leaf[]) => ls.map((l) => l.text).join("");
/** A kept run whose next text node opens with white space and goes on — the shape Chromium's balance mis-reads (§1). */
function fragileJoins(ls: Leaf[]): string[] {
  const bad: string[] = [];
  for (let i = 1; i < ls.length; i++) {
    const prev = ls[i - 1], cur = ls[i];
    if (prev.nowrap && !cur.nowrap && /^[\t\n\f\r ]+\S/.test(cur.text)) bad.push(`[${prev.text}]${cur.text.slice(0, 12)}…`);
  }
  return bad;
}

/* ── metrics: Inter from the repo's own TTF (identical advances to next/font's on every character here), Sora from R5-E's
      tables (next/font's Sora, hmtx + HVAR, 1/1000 em), JetBrains Mono 0.6em; an ideograph or a full-width mark 1em ── */
const fontkit = req("fontkit") as { openSync: (p: string) => { glyphForCodePoint: (c: number) => { advanceWidth: number }; layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number } };
const INTER = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const SORA: Record<600 | 700, number[]> = {
  600: "216,310,473,712,651,877,717,266,387,387,569,594,269,507,269,386,756,425,627,626,662,637,678,596,657,678,269,269,594,590,594,559,1126,773,688,799,785,596,560,832,801,326,642,728,553,954,867,865,658,865,720,674,610,780,729,1062,713,655,650,387,386,387,602,585,300,588,699,610,699,620,381,683,648,325,332,617,305,978,648,679,699,699,417,549,431,639,584,897,587,562,497,387,375,387,527".split(",").map(Number),
  700: "210,317,495,722,651,891,731,268,393,393,570,596,273,509,273,407,763,428,632,632,672,644,687,607,667,687,273,273,596,590,596,563,1127,782,692,800,781,594,560,833,800,332,643,752,558,971,876,864,667,864,730,667,618,776,740,1071,722,657,647,393,407,393,617,590,300,594,703,611,703,624,382,686,652,334,339,639,315,983,652,681,703,703,421,556,434,645,597,922,601,570,502,393,376,393,543".split(",").map(Number),
};
const WIDE = /[㐀-䶿一-鿿豈-﫿　-〿＀-￯]/u;
const IGNORABLE = /[­​-‏⁠-⁤﻿]/u;
type Face = { em: (ch: string) => number };
const interFace: Face = { em: (ch) => INTER.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / INTER.unitsPerEm };
const soraFace = (w: 600 | 700): Face => ({ em: (ch) => { const cp = ch.codePointAt(0)!; return cp >= 0x20 && cp <= 0x7e ? SORA[w][cp - 0x20] / 1000 : ch === " " ? SORA[w][0] / 1000 : 0.6; } });
type Type = { face: Face; size: number; ls: number };
/** Inter as a browser sets a run: whole-string shaping, kerning on (the measure R5-A's F18 thresholds were taken in). */
const interKerned = (s: string, size: number, ls: number) => INTER.layout(s).positions.reduce((w, p) => w + p.xAdvance, 0) / INTER.unitsPerEm * size + ls * Array.from(s).length;
const width = (s: string, ty: Type) => Array.from(s).reduce((w, ch) => IGNORABLE.test(ch) ? w : w + (WIDE.test(ch) ? ty.size : ty.face.em(ch) * ty.size) + ty.ls, 0);

/* ── break opportunities (UAX #14 as these sentences meet it, with CSS word-break: keep-all) ───────────────────────── */
const NBSP = String.fromCharCode(0xa0), WJ = String.fromCharCode(0x2060), EM = "—";
const IDEO = /[㐀-䶿一-鿿豈-﫿]/u;
const CL = /[，。？！：；、）」』]/u;
function opportunities(text: string, keepAll = true): Set<number> {
  const ops = new Set<number>();
  const c = Array.from(text);
  // positions are UTF-16 offsets; every character in these texts is in the BMP
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    if (b === NBSP || b === WJ || a === NBSP || a === WJ) continue;
    if (b === " ") continue;
    if (a === " ") { ops.add(i); continue; }
    if (CL.test(b)) continue;
    if (CL.test(a)) { ops.add(i); continue; }
    if (b === EM) { if (a !== EM) ops.add(i); continue; }
    if (a === EM) { if (b !== EM) ops.add(i); continue; }
    if (a === "/" && /\p{L}/u.test(b)) { ops.add(i); continue; }
    if (a === "-" && /\p{L}/u.test(b) && c[i - 2] !== " ") { ops.add(i); continue; }
    if (IDEO.test(a) || IDEO.test(b)) { if (!keepAll) ops.add(i); continue; }
  }
  return ops;
}
/** The rendered leaves → the paragraph: its text, its opportunities (none inside a nowrap run, none after a run's own
 *  closing space — the `<span>1 </span>2` rule), and the FRAGILE ones — after the white space that opens a text node
 *  following a nowrap run, which Chromium's candidate pass loses unless its greedy pass breaks there. */
function paragraph(ls: Leaf[], keepAll = true) {
  const text = textOf(ls);
  const ops = opportunities(text, keepAll);
  const fragile = new Set<number>();
  let pos = 0;
  ls.forEach((l, i) => {
    const a = pos, b = pos + l.text.length;
    if (l.nowrap) {
      for (let p = a + 1; p < b; p++) ops.delete(p);
      if (/[\t\n\f\r ]$/.test(l.text)) ops.delete(b);
    } else if (i > 0 && ls[i - 1].nowrap) {
      const lead = /^[\t\n\f\r ]+/.exec(l.text)?.[0].length ?? 0;
      if (lead > 0 && lead < l.text.length) fragile.add(a + lead);
    }
    pos = b;
  });
  return { text, ops, fragile };
}

/* ── Chromium's text-wrap: balance, modelled from its source (main, read 2026-10-10): LineBreakStrategy tries the score
      line breaker first (score_line_breaker.cc: kMinCandidates 3, the orphan penalty 10000 on the last candidate, a line
      penalty of 4 × width × font size, delta² on every line when balanced, overfull 1e12, the greedy line count kept),
      and falls back to ParagraphLineBreaker's bisection; an overflowing line disables both. `pretty` scores the last line
      by 4 × its start's penalty and acts only when the greedy last line is under a third and holds no break. ── */
type Para = { text: string; ops: Set<number>; fragile?: Set<number>; ty: Type };
const trimEnd = (t: string, k: number) => { while (k > 0 && t[k - 1] === " ") k--; return k; };
const lineW = (p: Para, a: number, b: number) => width(p.text.slice(a, trimEnd(p.text, b)), p.ty);
function greedy(p: Para, W: number, ops = p.ops): { ends: number[]; over: boolean } {
  const n = p.text.length, pts = [...ops].filter((x) => x > 0 && x < n).sort((x, y) => x - y).concat(n);
  const ends: number[] = []; let start = 0, over = false;
  while (start < n) {
    let best = -1;
    for (const q of pts) { if (q <= start) continue; if (lineW(p, start, q) <= W + 1e-6) best = q; else break; }
    if (best < 0) { best = pts.find((q) => q > start)!; over = true; }
    ends.push(best); start = best;
  }
  return { ends, over };
}
function scored(p: Para, W: number, ops: Set<number>, nLines: number, balanced: boolean): number[] | null {
  const n = p.text.length;
  const cands = [0, ...[...ops].filter((x) => x > 0 && x < n).sort((x, y) => x - y), n];
  if (cands.length < 3 + 2) return null;
  const pen = cands.map(() => 0);
  if (cands.length >= 4) pen[pen.length - 2] += 10000;
  const linePen = 4 * W * p.ty.size;
  const noBreak = cands.map((c) => width(p.text.slice(0, c), p.ty));
  const ifBreak = cands.map((c) => width(p.text.slice(0, trimEnd(p.text, c)), p.ty));
  const best: Array<{ s: number; prev: number }> = [{ s: 0, prev: 0 }];
  for (let e = 1; e < cands.length; e++) {
    const last = e === cands.length - 1;
    let b = Infinity, bp = 0;
    for (let s = 0; s < e; s++) {
      const delta = W - (ifBreak[e] - noBreak[s]);
      const ws = delta < 0 ? 1e12 : last && !balanced ? 4 * pen[s] : delta * delta;
      const sc = best[s].s + ws;
      if (sc <= b) { b = sc; bp = s; }
    }
    best.push({ s: b + pen[e] + linePen, prev: bp });
  }
  const path: number[] = [];
  for (let i = cands.length - 1; i > 0; i = best[i].prev) path.unshift(cands[i]);
  return path.length === nLines ? path : null;
}
function balance(p: Para, W: number): number[] {
  const g = greedy(p, W);
  if (g.ends.length <= 1 || g.over || g.ends.length > 6) return g.ends;
  const lost = new Set([...(p.fragile ?? [])].filter((x) => !g.ends.includes(x)));
  const s = scored(p, W, new Set([...p.ops].filter((x) => !lost.has(x))), g.ends.length, true);
  if (s) return s;
  let lo = 0, hi = W;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; const gg = greedy(p, mid); if (gg.ends.length > g.ends.length || gg.over) lo = mid; else hi = mid; }
  return greedy(p, hi).ends;
}
function pretty(p: Para, W: number): number[] {
  const g = greedy(p, W);
  if (g.ends.length <= 1 || g.over || g.ends.length > 4) return g.ends;
  const start = g.ends[g.ends.length - 2];
  const inside = [...p.ops].some((x) => x > start && x < p.text.length);
  if (!(lineW(p, start, p.text.length) < W / 3 && !inside)) return g.ends;
  return scored(p, W, p.ops, g.ends.length, false) ?? g.ends;
}
const lines = (p: Para, ends: number[]) => ends.map((e, i) => p.text.slice(i ? ends[i - 1] : 0, e).replace(new RegExp(`[${WJ}]`, "gu"), "").replace(new RegExp(NBSP, "gu"), " ").trim());
const show = (ls: string[]) => ls.join(" / ");

/* ══ §1 · R6-1 ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · R6-1 the white space after a kept run is its own text node — Chromium's balance gets round 5's lines back");
const EMPTY_TY: Type = { face: interFace, size: 13, ls: -0.05 };
/** Round 3's emptyStateBody, which round 5's tiles drew: the pair's spaces and the space before a dash no-break spaces,
 *  a word joiner before an em dash (inserted, built here from char codes so this file holds no invisible character). */
const r3Insert = (t: string) => t
  .replace(/\b([A-Z]{2,})[ \t]+(au|or)[ \t]+(?=[A-Z]{2,}\b)/g, `$1${NBSP}$2${NBSP}`)
  .replace(/[ \t]+(?=[—–])/g, NBSP)
  .replace(/([^\s—])(?=—)/g, `$1${WJ}`);
/** The same leaves as before round 7: a white-space node merged back into the text node after it. */
const preR7 = (ls: Leaf[]): Leaf[] => ls.reduce<Leaf[]>((acc, l) => {
  const last = acc[acc.length - 1];
  if (last && !last.nowrap && !l.nowrap && /^[\t\n\f\r ]+$/.test(last.text)) { acc[acc.length - 1] = { text: last.text + l.text, nowrap: false }; return acc; }
  acc.push({ ...l }); return acc;
}, []);
const fillSide = (l: Loc, t: string) => t.replace("{yes}", word(l, "common.yes")).replace("{no}", word(l, "common.no"));
const TICKETS: Record<Loc, string> = { sw: fillSide("sw", word("sw", "journey.ticketsEmptyOpenBody")), en: fillSide("en", word("en", "journey.ticketsEmptyOpenBody")), zh: fillSide("zh", word("zh", "journey.ticketsEmptyOpenBody")) };
/** The `fill` empty state's measure: viewport − 32 (gutters) − 96 (padding) − 2 (border); at 1280 the reading column, 1016. */
const FILL: Record<number, number> = { 320: 190, 390: 260, 1280: 1016 - 98 };
{
  const cells = LOCALES.flatMap((l) => [320, 390, 1280].map((vw) => {
    const text = TICKETS[l];
    const r5 = { text: r3Insert(text), ops: opportunities(r3Insert(text)), ty: EMPTY_TY };
    const now = leaves(est.emptyStateBody(text));
    const r7 = { ...paragraph(now), ty: EMPTY_TY };
    const r6 = { ...paragraph(preR7(now)), ty: EMPTY_TY };
    return { l, vw, r5: lines(r5, balance(r5, FILL[vw])), r6: lines(r6, balance(r6, FILL[vw])), r7: lines(r7, balance(r7, FILL[vw])) };
  }));
  const cell = (l: Loc, vw: number) => cells.find((c) => c.l === l && c.vw === vw)!;
  const en390 = cell("en", 390);
  ok("1.1 CONTROL · the model draws tile 244 as round 6 drew it: \"Pick a question, tap YES or NO — your\" / \"ticket shows up here.\" (234 / 128px ink), where round 5 drew \"…YES or NO —\" / \"your ticket shows up here.\" (202 / 159)",
    show(en390.r6) === "Pick a question, tap YES or NO — your / ticket shows up here." && show(en390.r5) === "Pick a question, tap YES or NO — / your ticket shows up here.", j(en390));
  const others = cells.filter((c) => !(c.l === "en" && c.vw === 390));
  ok("1.1′ CONTROL · …and the other eight tiles (240–248) as round 5 drew them — the reader's \"every other empty state keeps r5's extents\"",
    others.every((c) => show(c.r6) === show(c.r5)), j(others.filter((c) => show(c.r6) !== show(c.r5))));
  ok("1.2 · with the white space its own node, all nine break where round 5 broke them", cells.every((c) => show(c.r7) === show(c.r5)),
    j(cells.filter((c) => show(c.r7) !== show(c.r5))));
  ok("1.3 · the markup: the dash's run, then a text node of white space alone, then the words — \"…YES or NO —\" + \" \" + \"your ticket…\"",
    fragileJoins(leaves(est.emptyStateBody(TICKETS.en))).length === 0 && /YES or NO —<\/span> <!-- -->your/.test(renderToString(h("p", null, est.emptyStateBody(TICKETS.en)))),
    renderToString(h("p", null, est.emptyStateBody(TICKETS.en))));
}
{
  // The census: every dictionary sentence (en sw zh, placeholders filled) that holds a run under the empty state's rules,
  // at every empty-state measure — the boxed variant at 320 / 360 / 390 / ≥392 and the fill variant at 412 and 768.
  const DATE: Record<Loc, string> = { en: "9 Oct, 06:02", sw: "9 Okt, 06:02", zh: "2026年10月9日 06:02" };
  const MEASURES = [190, 230, 260, 262, 282, 638];
  let cellsN = 0, regressed = 0;
  const wrong: string[] = [];
  const all = (t: unknown, p: string[] = []): Array<[string, string]> => t && typeof t === "object" ? Object.entries(t as Record<string, unknown>).flatMap(([k, v]) => typeof v === "string" ? [[[...p, k].join("."), v] as [string, string]] : all(v, [...p, k])) : [];
  const seen = new Set<string>();
  for (const l of LOCALES) for (const [path, v] of all(dict[l])) {
    if (v.length < 12) continue;
    const keep: string[] = [];
    const text = v.replace(/\{(\w+)\}/g, (_, k: string) => k === "yes" ? word(l, "common.yes") : k === "no" ? word(l, "common.no") : /date|until|end/i.test(k) ? (keep.push(DATE[l]), DATE[l]) : "5");
    if (seen.has(l + text)) continue;
    seen.add(l + text);
    if (est.emptyStateRanges(text, keep).length === 0) continue;
    const now = leaves(est.emptyStateBody(keep.length ? { text, keep } : text));
    const r7 = { ...paragraph(now), ty: EMPTY_TY };
    const r6 = { ...paragraph(preR7(now)), ty: EMPTY_TY };
    // The intended lines: round 5's inserted characters, or — for a sentence with a caller's date, which round 5 held as
    // a run too — every candidate offered.
    const r5 = keep.length ? { ...r7, fragile: new Set<number>() } : { text: r3Insert(text), ops: opportunities(r3Insert(text)), ty: EMPTY_TY };
    for (const W of MEASURES) {
      cellsN++;
      const want = show(lines(r5, balance(r5, W)));
      if (show(lines(r6, balance(r6, W))) !== want) regressed++;
      const got = show(lines(r7, balance(r7, W)));
      if (got !== want) wrong.push(`${l} ${path} @${W}: ${got} ≠ ${want}`);
    }
  }
  ok(`1.4 · every dictionary sentence that holds a run, at every empty-state measure (${cellsN} lines): the empty state draws round 5's lines — 0 differ`,
    cellsN > 3000 && wrong.length === 0, wrong.slice(0, 6).join(" | "));
  ok(`1.4′ CONTROL · without the split, ${regressed} of them differ (the regression, tile 244's among them)`, regressed > 100, String(regressed));
}
{
  // One rule for every helper that draws a run before more text.
  const sentences = LOCALES.flatMap((l) => ["rg.breakActive", "rg.exclusionActive", "dialog.estimateDisclaimer", "dialog.payoutCalcBody", "dialog.noExitWindowBody", "dialog.poolSharePayout", "market.crowdedWarning", "market.thinUpsideNote", "auth.selfExclusionBody", "auth.coolingOffBody", "home.emptyBalance", "common.phoneInputTitle"].map((k) => word(l, k)));
  const titles = [
    "Simba watapata TZS 1 bilioni msimu huu?", "Will Ethereum hit a new 30-day high before month-end?", "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?",
    "比特币价格能否在2026年8月底前超过15万美元？", "Simba SC wins the NBC Premier League 2026-27", "Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?",
  ];
  const years = ["Personal Data Protection Act 2022 na kanuni zake", "Sheria ya Ulinzi wa Taarifa Binafsi 2022 and its rules"];
  const { KeepHyphenated } = req("../src/app/live/pulse-grid.tsx") as { KeepHyphenated: (p: { text: string }) => unknown };
  const bad: string[] = [];
  const check = (name: string, input: string, node: unknown) => {
    const ls = leaves(node);
    if (textOf(ls) !== input) bad.push(`${name}: text changed — ${j(textOf(ls))}`);
    for (const f of fragileJoins(ls)) bad.push(`${name}: ${f}`);
  };
  for (const s of sentences) check("keepText", s, kr.keepText(s));
  for (const s of sentences) check("emptyStateBody", s, est.emptyStateBody(s));
  for (const t of titles) check("keepFigures", t, kw.keepFigures(t));
  for (const t of titles) check("KeepHyphenated", t, h(KeepHyphenated, { text: t }));
  for (const y of years) check("keepYears", y, kw.keepYears(y));
  for (const l of LOCALES) check("keepRegulator", word(l, "footer.licensedByGbt"), kw.keepRegulator(word(l, "footer.licensedByGbt")));
  ok("1.5 · keepText, the empty state, keepFigures, /live's KeepHyphenated, keepYears and keepRegulator: no run is followed by a text node that opens with white space, and every text is its own, character for character",
    bad.length === 0 && sentences.length === 36, bad.slice(0, 6).join(" | "));
  const plantText = "Simba watapata TZS 1 bilioni msimu huu?";
  const plant = [plantText.slice(0, 15), h("span", { className: "whitespace-nowrap" }, "TZS 1 bilioni"), plantText.slice(28)];
  ok("1.5′ CONTROL · a run drawn the round-5 way (its white space opening the next node) is reported", fragileJoins(leaves(plant)).length === 1);
  ok("1.6 · `afterRun` splits only white space that more text follows: \" msimu\" → [\" \", \"msimu\"], \" \" and \"msimu\" whole",
    j(kw.afterRun(" msimu")) === j([" ", "msimu"]) && j(kw.afterRun(" ")) === j([" "]) && j(kw.afterRun("msimu")) === j(["msimu"]) && j(kw.afterRun("")) === j([""]));
  ok("1.7 · keepRanges splits the white space after every run (the empty states and every keepText sentence share it), and says why",
    has("src/components/ui/keep-run.tsx", "if (a > 0) { const [lead, rest] = afterRun(text.slice(a, b)); if (rest !== undefined) { out.push(lead); a += lead.length; } }")
      && /AppendCandidates/.test(raw("src/components/ui/keep-words.tsx")) && /HandleTrailingSpaces/.test(raw("src/components/ui/keep-words.tsx")));
}

/* ══ §2 · R1-1 / R2-2 / R3-1 ═════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · R1-1 R2-2 R3-1 a settlement source's name, with its connective, is one inline block");
{
  const rules = css();
  const ruleOf = (sel: string) => [...rules.matchAll(new RegExp(`(?:^|[}\\s])${sel.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]).join(";");
  ok("2.1 · `.mcardp-srcrun` (the featured card) and `.kp-qrow__srcrun` (the board row) are inline blocks; the names inside them are not",
    /display:\s*inline-block/.test(ruleOf(".mcardp-srcrun")) && /display:\s*inline-block/.test(ruleOf(".kp-qrow__srcrun"))
      && !/inline-block/.test(ruleOf(".mcardp-srcname")) && !/inline-block/.test(ruleOf(".kp-qrow__srcname")), j({ run: ruleOf(".mcardp-srcrun"), name: ruleOf(".mcardp-srcname") }));
  const SITES: Array<[string, string, string]> = [
    ["src/components/markets/market-card.tsx", "mcardp-", "{sourceName}"],
    ["src/components/home/landing-hero.tsx", "kp-qrow__", "{row.sourceName}"],
  ];
  const missing = SITES.filter(([f, p, name]) => !has(f, "const [settlesLead, settlesConn] = splitLeadConnective(settlesPre);")
    || !has(f, `{settlesLead} <span className="${p}srcrun"> {settlesConn && <span className="whitespace-nowrap">{settlesConn}</span>} <span className="${p}srcname" data-market-part="source">${name}</span> </span> {settlesPost}`));
  ok("2.2 · both draw \"<the words>\" + [<the connective, held> <the name, the gate's part>] + the rest; the gate's `data-market-part=\"source\"` still holds the name alone",
    missing.length === 0, missing.map(([f]) => f).join(", "));
  const pre = (l: Loc) => word(l, "market.settlesOn").split("{source}")[0];
  ok("2.3 · the connective: sw \"Linatatuliwa kwa \" → \"Linatatuliwa \" + \"kwa \"; en \"Settles on \" and zh \"结算来源：\" carry none",
    j(conn.splitLeadConnective(pre("sw"))) === j(["Linatatuliwa ", "kwa "]) && j(conn.splitLeadConnective(pre("en"))) === j(["Settles on ", ""]) && j(conn.splitLeadConnective(pre("zh"))) === j(["结算来源：", ""]), j(LOCALES.map((l) => conn.splitLeadConnective(pre(l)))));
  // The tile, modelled: the part is the featured card's width at 320 (288 − 2 border − 30 padding = 256), 13px Inter,
  // keep-all, `text-wrap: pretty`.
  const ty: Type = { face: interFace, size: 13, ls: 0 };
  const NAME = "Tanzania Meteorological Authority";
  const before = (l: Loc) => { const t = pre(l) + NAME; return { text: t, ops: opportunities(t), ty }; };
  const zh = before("zh");
  ok("2.4 CONTROL · as one run of text, zh 320's `pretty` part reads \"结算来源：Tanzania\" / \"Meteorological Authority\" (tiles 029 059 074 084 097 109): \"Authority\" alone on the greedy last line (56px of 256) pulled \"Meteorological\" down",
    show(lines(zh, pretty(zh, 256))) === "结算来源：Tanzania / Meteorological Authority", show(lines(zh, pretty(zh, 256))));
  // As an inline block the name is ONE atomic unit: a break before it, none inside while it fits.
  const block = (l: Loc, W: number) => {
    const [lead, c] = conn.splitLeadConnective(pre(l));
    const run = c + NAME, runW = width(run, ty);
    const t = lead + run;
    const ops = new Set([...opportunities(t)].filter((p) => p <= lead.length || runW > W));
    if (lead.length > 0 && !/\s$/.test(lead)) ops.add(lead.length);
    return { p: { text: t, ops, ty }, runW };
  };
  const after = LOCALES.flatMap((l) => [[320, 256], [360, 296], [390, 326]].map(([vw, W]) => { const { p, runW } = block(l, W); return { l, vw, runW: Math.round(runW), lines: lines(p, pretty(p, W)) }; }));
  const split = after.filter((c) => c.runW <= (c.vw === 320 ? 256 : c.vw === 360 ? 296 : 326) && c.lines.length > 1 && !c.lines.some((x) => x.endsWith(NAME)));
  ok("2.5 · as an inline block the name stays whole wherever its line can hold it — zh 320 \"结算来源：\" / \"Tanzania Meteorological Authority\", sw \"Linatatuliwa\" / \"kwa Tanzania Meteorological Authority\" (no line ends on \"kwa\")",
    split.length === 0 && show(after.find((c) => c.l === "zh" && c.vw === 320)!.lines) === "结算来源： / Tanzania Meteorological Authority"
      && show(after.find((c) => c.l === "sw" && c.vw === 320)!.lines) === "Linatatuliwa / kwa Tanzania Meteorological Authority", j(after));
}

/* ══ §3 · R5-3 / R5-4 ════════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · R5-3 R5-4 no line ends on a connective — legal titles, page titles, section heads, empty states, the hub, the Board");
{
  ok("3.1 · connectiveRanges: each connective with the white space after it — \"Sera [ya ]Kuzuia Uoshaji [wa ]Fedha [na ]KYC\", \"AML [& ]KYC Policy\", \"Terms [of ]Service\"; none at the end, none in Chinese, any case",
    j(conn.connectiveRanges("Sera ya Kuzuia Uoshaji wa Fedha na KYC")) === j([[5, 8], [23, 26], [32, 35]]) && j(conn.connectiveRanges("AML & KYC Policy")) === j([[4, 6]])
      && j(conn.connectiveRanges("Terms of Service")) === j([[6, 9]]) && conn.connectiveRanges("Kanuni za").length === 0 && conn.connectiveRanges("反洗钱与 KYC 政策").length === 0
      && j(conn.connectiveRanges("TERMS OF SERVICE")) === j([[6, 9]]) && conn.connectiveRanges("yazidi wala navyo").length === 0);
  const long = "a".repeat(20000);
  const t0 = performance.now(); conn.connectiveRanges(long); conn.connectiveRanges(`${long} ya`); conn.splitLeadConnective(`${long} ya `);
  ok("3.1′ · linear: 20,000 letters with no space, and with one, in under 50ms", performance.now() - t0 < 50, `${(performance.now() - t0).toFixed(1)}ms`);
  const { legalTitle } = req("../src/app/legal/_components.tsx") as { legalTitle: (t: string) => unknown };
  const LEGAL: Record<string, Record<"en" | "sw", string>> = {
    aml: { en: "AML & KYC Policy", sw: "Sera ya Kuzuia Uoshaji wa Fedha na KYC" }, privacy: { en: "Privacy Policy", sw: "Sera ya Faragha" },
    rg: { en: "Responsible Gambling Policy", sw: "Sera ya Mchezo Salama" }, rules: { en: "Game Rules", sw: "Kanuni za Michezo" },
    updown: { en: "Up & Down Rules", sw: "Kanuni za Juu na Chini" }, yesno: { en: "YES/NO Market Rules", sw: "Kanuni za Masoko ya NDIO/HAPANA" },
    terms: { en: "Terms of Service", sw: "Masharti ya Huduma" }, agent: { en: word("en", "agent.termsTitle"), sw: word("sw", "agent.termsTitle") },
  };
  // The pages' own TITLE records, so a title changed there is measured here.
  const pageTitle = (f: string, l: "en" | "sw") => new RegExp(`${l}:\\s*"([^"]+)"`).exec(raw(f).slice(raw(f).indexOf("const TITLE")))?.[1];
  ok("3.2 · the legal pages' titles are the ones measured here",
    pageTitle("src/app/legal/aml/page.tsx", "sw") === LEGAL.aml.sw && pageTitle("src/app/legal/responsible-gambling/page.tsx", "sw") === LEGAL.rg.sw
      && pageTitle("src/app/legal/rules/up-down/page.tsx", "sw") === LEGAL.updown.sw && pageTitle("src/app/legal/terms/page.tsx", "sw") === LEGAL.terms.sw);
  const H1: Type = { face: soraFace(700), size: 28, ls: -0.56 };
  const ENDS = /(?:^|\s)(?:ya|za|wa|la|cha|vya|kwa|na|of|and|&)$/i;
  const legalCells = Object.entries(LEGAL).flatMap(([k, by]) => (["en", "sw"] as const).flatMap((l) => [184, 224, 254, 276].map((W) => {
    const after = { ...paragraph(leaves(legalTitle(by[l])), false), ty: H1 };
    const before = { text: by[l], ops: opportunities(by[l], false), ty: H1 };
    return { k, l, W, before: lines(before, balance(before, W)), after: lines(after, balance(after, W)), over: greedy(after, W).over };
  })));
  const c = (k: string, l: string, W: number) => show(legalCells.find((x) => x.k === k && x.l === l && x.W === W)!.after);
  const b = (k: string, l: string, W: number) => show(legalCells.find((x) => x.k === k && x.l === l && x.W === W)!.before);
  ok("3.3 CONTROL · as round 6 drew them at sw 390 (254px): \"Sera ya / Mchezo Salama\" (tile 206) and \"Sera ya Kuzuia / Uoshaji wa / Fedha na KYC\" (tile 208)",
    b("rg", "sw", 254) === "Sera ya / Mchezo Salama" && b("aml", "sw", 254) === "Sera ya Kuzuia / Uoshaji wa / Fedha na KYC", j([b("rg", "sw", 254), b("aml", "sw", 254)]));
  const endsBad = legalCells.filter((x) => x.after.slice(0, -1).some((line) => ENDS.test(line)));
  ok(`3.4 · every legal title, en and sw, at 320 360 390 412 (${legalCells.length} cells): no line ends on a connective, none overflows`,
    endsBad.length === 0 && legalCells.every((x) => !x.over), j(endsBad));
  ok("3.4′ CONTROL · before round 7, lines ended on one in many of them", legalCells.filter((x) => x.before.slice(0, -1).some((line) => ENDS.test(line))).length >= 15);
  ok("3.5 · the measured lines: \"Sera ya Kuzuia / Uoshaji / wa Fedha na KYC\", \"Sera ya Mchezo / Salama\", \"Kanuni za Juu / na Chini\" (390); \"Kanuni / za Masoko / ya NDIO/ / HAPANA\" (360); \"AML & KYC / Policy\", \"Up & Down / Rules\" (320); \"Kanuni / za Michezo\", \"Terms / of Service\" as before",
    c("aml", "sw", 254) === "Sera ya Kuzuia / Uoshaji / wa Fedha na KYC" && c("rg", "sw", 254) === "Sera ya Mchezo / Salama" && c("updown", "sw", 254) === "Kanuni za Juu / na Chini"
      && c("yesno", "sw", 224) === "Kanuni / za Masoko / ya NDIO/ / HAPANA" && c("aml", "en", 184) === "AML & KYC / Policy" && c("updown", "en", 184) === "Up & Down / Rules"
      && c("rules", "sw", 254) === "Kanuni / za Michezo" && c("terms", "en", 184) === "Terms / of Service",
    j(["aml", "rg", "updown", "yesno"].map((k) => [k, c(k, "sw", 254), c(k, "sw", 224)])));
  // Every title surface draws the rule.
  const { PageHeader } = req("../src/components/ui/page-header.tsx") as { PageHeader: (p: { title: unknown }) => unknown };
  const { LegalSection } = req("../src/app/legal/_components.tsx") as { LegalSection: (p: { n: string; title: string; children: unknown }) => unknown };
  const { EmptyState } = req("../src/components/ui/empty-state.tsx") as { EmptyState: (p: { title: string }) => unknown };
  const held = (m: string, run: string) => m.includes(`<span class="whitespace-nowrap">${run}</span>`);
  ok("3.6 · PageHeader (every page's title): \"Mapendekezo [ya ]Masoko\"; a title handed in as nodes is drawn as given",
    held(renderToStaticMarkup(h(PageHeader, { title: "Mapendekezo ya Masoko" })), "ya ") && !renderToStaticMarkup(h(PageHeader, { title: h("b", null, "Sera ya faragha") })).includes("whitespace-nowrap"));
  ok("3.7 · the legal header and every legal section head: \"Sera [ya ]Kuzuia Uoshaji [wa ]Fedha [na ]KYC\", \"Ulinzi [wa ]Data\"",
    ["ya ", "wa ", "na "].every((r) => held(renderToStaticMarkup(h("h1", null, legalTitle(LEGAL.aml.sw) as never)), r))
      && held(renderToStaticMarkup(h(LegalSection, { n: "3", title: "Ulinzi wa Data", children: null })), "wa "));
  ok("3.8 · the empty state's title: \"Hakuna tiketi inayolingana [na ]vichujio hivi\"; a Chinese title keeps its hung marks",
    held(renderToStaticMarkup(h(EmptyState, { title: word("sw", "journey.ticketsEmptyLens") })), "na ")
      && renderToStaticMarkup(h(EmptyState, { title: "您还没有进行中的注单。" })).includes("kp-cjk-mark"));
  const HUB = [
    ["src/components/journey/account/hub-row.tsx", "<span className=\"kp-hub__label\">{keepConnectives(hubWord(t, row.label))}</span>"],
    ["src/components/journey/account/card-size-row.tsx", "<span className=\"kp-hub__label\">{keepConnectives(t.journey.hubCardSize)}</span>"],
    ["src/components/journey/account/unread-row.tsx", "{keepConnectives(label)}"],
    ["src/app/account/page.tsx", "<span className=\"kp-hub__label\">{keepConnectives(t.common.staffConsole)}</span>"],
  ];
  const hubMissing = HUB.filter(([f, s]) => !has(f, s)).map(([f]) => f);
  const labelSites = walk("src", /\.tsx$/).filter((f) => /kp-hub__label/.test(code(f)));
  const bareLabels = labelSites.flatMap((f) => [...code(f).matchAll(/<span className="kp-hub__label">\{([^}]+)\}/g)].filter((m) => !/^keepConnectives\(/.test(m[1])).map((m) => `${f}: ${m[1]}`))
    .filter((s) => !/t\.common\.(?:language|signOut)|t\("The Needle"/.test(s));
  ok("3.9 · the hub's labels: every row (\"Mapendekezo [ya ]Masoko\", \"Ukubwa [wa ]kadi\", \"Konsoli [ya ]wafanyakazi\"); the one-word labels (Lugha, Toka, Sindano) need none",
    hubMissing.length === 0 && bareLabels.length === 0, j({ hubMissing, bareLabels }));
  // The Board's name carries its connective.
  const reg = (l: Loc) => renderToStaticMarkup(h("p", null, kw.keepRegulator(word(l, "footer.licensedByGbt")) as never));
  ok("3.10 · the Board's name: sw \"Leseni \" + [ya Bodi ya Michezo ya Kubahatisha Tanzania.] with its own connectives held; en and zh as they were",
    reg("sw").startsWith('<p>Leseni <span class="kp-gbt-name"><span class="whitespace-nowrap">ya </span>Bodi <span class="whitespace-nowrap">ya </span>Michezo <span class="whitespace-nowrap">ya </span>Kubahatisha Tanzania</span>.')
      && reg("en").includes('Licensed by the <span class="kp-gbt-name">Gaming Board <span class="whitespace-nowrap">of </span>Tanzania</span>.')
      && reg("zh").includes('<span class="kp-gbt-name">坦桑尼亚'), j([reg("sw"), reg("en")]));
  const unit = interKerned("ya Bodi ya Michezo ya Kubahatisha Tanzania.", 13, -0.05);
  const rules = css();
  const cq = (name: string) => Number(new RegExp(`@container ${name} \\(min-width: (\\d+)px\\) \\{ \\.kp-gbt-name:lang\\(sw\\)`).exec(rules)?.[1]);
  const { OFFLINE_GBT_FROM } = req("../src/lib/offline-document.ts") as { OFFLINE_GBT_FROM: Record<Loc, number> };
  ok(`3.11 · its sw condition is the run's own width (${unit.toFixed(1)}px in Inter 13px) + 3px: 281 for the footer's line, 321 for the trust row (+ its 40px roundel and gap), and the offline document's copy says 281`,
    Math.abs(unit - 277.4) < 0.5 && cq("kp-gbt") === Math.ceil(unit + 3) && cq("kp-gbt-row") === Math.ceil(unit + 3) + 40 && OFFLINE_GBT_FROM.sw === cq("kp-gbt") && OFFLINE_GBT_FROM.en === 168,
    j({ unit, footer: cq("kp-gbt"), row: cq("kp-gbt-row"), offline: OFFLINE_GBT_FROM }));
  const offSrc = code("src/lib/offline-document.ts");
  ok("3.12 · the offline document draws the same: the connective inside the name's span, the name's connectives held (`.kp-nw`)",
    /const \[before, lead\] = splitLeadConnective\(cut\[0\]\);/.test(offSrc) && /heldConnectives\(lead \+ cut\[1\]\)/.test(offSrc) && offSrc.includes("`.kp-nw{white-space:nowrap}`"));
  const ge = raw("src/app/global-error.tsx");
  ok("3.13 · global-error's copy of the connectives is lib/connectives.ts's, and its licence block takes the \"na\" before the name",
    /const CONNECTIVE_WORDS = "ya\|za\|wa\|la\|cha\|vya\|kwa\|na\|of\|and\|&";/.test(ge) && conn.CONNECTIVE_WORDS === "ya|za|wa|la|cha|vya|kwa|na|of|and|&"
      && /if \(lead && CONNECTIVE\.test\(lead\[1\]\.trim\(\)\)\) start -= lead\[1\]\.length;/.test(decomment(ge)));
  ok("3.14 · the connective rule has one home: keep-words.tsx and the offline document import lib/connectives.ts; legal/_components.tsx keeps no list of its own",
    /from "@\/lib\/connectives"/.test(code("src/components/ui/keep-words.tsx")) && /from "@\/lib\/connectives"/.test(offSrc) && !/CONNECTIVE\s*=/.test(code("src/app/legal/_components.tsx")));
}

/* ══ §4 · R6-2 ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · R6-2 a market title's proper name: no rule over capitals (refused with the corpus's numbers)");
{
  // Measured over the 127 seeded titles (52 with a run of capitalised words), 4 title surfaces × 7 widths, in Chromium's
  // balance: holding each run where its line can hold it ends 264 splits but adds a line to 41 cells (the line-clamped
  // featured card at 320 and 360 among them — words would be cut), a short last line to 6, and overflows the market h1
  // at 320 ("…Kariakoo Derby?", the "?" glued to the block). Its capitals also find "Mvua Dar" and "New Diamond
  // Platnumz" and miss "Dar es Salaam" and "Kombe la Shirikisho". The owner's question: names are data.
  const t = "Will Yanga SC top the NBC Premier League at the next round?";
  ok("4.1 · keepFigures holds a title's figures only — no proper name (\"NBC Premier League\" is left to the balance)",
    typeof kw.keepFigures(t) === "string" && typeof kw.keepFigures("Simba SC wins the NBC Premier League") === "string");
}

/* ══ §5 · THE TAKE-BACK HAZARD ═══════════════════════════════════════════════════════════════════════════════════════ */
section("5 · a label that takes its tracking back is one line, and fits its site");
{
  const rules = css();
  const decl = (sel: string) => [...rules.matchAll(/(^|})\s*([^{}]+)\{([^}]*)\}/g)].filter((m) => m[2].split(",").map((s) => s.trim()).includes(sel)).map((m) => m[3]).join(";");
  ok("5.1 · `.kp-track-end` and `.mcardp-pctcap` are `white-space: nowrap`, as `.mcardp-oneside` and the bar's `.tb-no` already were",
    /white-space:\s*nowrap/.test(decl(".kp-track-end")) && /white-space:\s*nowrap/.test(decl(".mcardp-pctcap")) && /white-space:\s*nowrap/.test(decl(".mcardp-oneside")) && /white-space:\s*nowrap/.test(decl(".tipbar-labels .tb-no")),
    j({ kte: decl(".kp-track-end"), pct: decl(".mcardp-pctcap") }));
  const takeBack = /\.(?:mcardp-pctcap|kp-track-end)::after|\.mcardp-moveline \.mcardp-oneside::after|\.tipbar-labels \.tb-no::after/;
  ok("5.1′ · the take-back's own selectors are still the four it was", takeBack.test(rules));
  // Every site, every language: the words at 10px JetBrains Mono (0.6em a glyph, an ideograph 1em) with the site's tracking.
  const SITE: Array<[string, string[], number]> = [
    ["src/app/updown/history/page.tsx", ["market.udNetReturn"], 0.14], ["src/app/updown/[roundId]/page.tsx", ["market.udYourPick", "market.udStake", "market.udPlayers"], 0.14],
    ["src/app/updown/page.tsx", ["market.udStreaming"], 0.10], ["src/app/wallet/withdraw/page.tsx", ["common.balanceFrozen", "wallet.available"], 0.14],
    ["src/app/wallet/money-form-ghost.tsx", ["wallet.available"], 0.14], ["src/app/wallet/wallet-client.tsx", ["wallet.txnStatusReview", "wallet.txnStatusConfirmed", "wallet.txnStatusReversed", "wallet.txnStatusCancelled", "wallet.txnStatusProcessing", "wallet.txnStatusFailed"], 0.14],
    ["src/components/markets/bet-confirm-modal.tsx", ["dialog.stakeLabel"], 0.14], ["src/components/markets/sell-confirm-modal.tsx", ["dialog.earlyExitFee"], 0.14],
    ["src/components/updown/price-hero.tsx", ["market.udOpenPrice"], 0.14], ["src/components/updown/round-countdown.tsx", ["market.udClosesIn", "market.udResultIn"], 0.14],
    ["src/app/positions/performance/page.tsx", ["common.cashedOut", "common.voided", "common.win", "common.lose"], 0.08], ["src/app/results/page.tsx", ["results.notableResult"], 0.16],
  ];
  const sitesWithClass = walk("src", /\.tsx$/).filter((f) => /\bkp-track-end\b/.test(code(f)));
  const listed = new Set(SITE.map(([f]) => f).concat("src/app/results/loading.tsx"));
  ok(`5.2 · the census holds every file that draws a take-back label (${sitesWithClass.length})`, sitesWithClass.every((f) => listed.has(f)), sitesWithClass.filter((f) => !listed.has(f)).join(", "));
  const mono = (s: string, tr: number) => Array.from(s.toUpperCase()).reduce((w, ch) => w + (WIDE.test(ch) ? 10 : 6) + tr * 10, 0);
  const widest = SITE.flatMap(([f, keys, tr]) => keys.flatMap((k) => LOCALES.map((l) => ({ f, k, l, w: mono(k === "market.udYourPick" ? `${word(l, k)} · ${word(l, "market.udStake")}` : word(l, k), tr) }))));
  const max = widest.reduce((a, b2) => (b2.w > a.w ? b2 : a));
  ok(`5.3 · every such label, in all three languages, is narrower than 160px (the widest: ${max.l} "${word(max.l, max.k)}" ${max.w.toFixed(1)}px) — no site's column is narrower than its label`,
    max.w < 160, j(max));
  ok("5.3′ · the wallet's money-form ghost keeps the page's label class (one box, one look)", has("src/app/wallet/money-form-ghost.tsx", '<p className="font-mono text-micro uppercase eyebrow kp-track-end">'));
}

/* ══ §6 · R5-8 ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · R5-8 the badge's progress count is a chip on the coin's edge");
{
  const { Badge } = req("../src/components/badges/Badge.tsx") as { Badge: (p: Record<string, unknown>) => unknown };
  const m = renderToStaticMarkup(h(Badge, { achievement: "sharp", state: "progress", progress: { value: 5, max: 20 }, title: "Sharp · Mahiri" }));
  ok("6.1 · \"5/20\" is drawn as `.badge-tier-pip.badge-count`, not hung 16px under the coin", m.includes('<span class="badge-tier-pip badge-count">5/20</span>') && !/bottom:\s*-16px/.test(m), m.slice(-200));
  const tier = renderToStaticMarkup(h(Badge, { achievement: "connector", state: "progress", progress: { value: 3, max: 5, tier: "I" } }));
  ok("6.2 · the tier pip is as it was (a tiered badge shows its numeral, not a count)", tier.includes('<span class="badge-tier-pip">I</span>') && !tier.includes("badge-count"));
  const rules = css();
  const pip = /\.badge-tier-pip\s*\{([^}]*)\}/.exec(rules)?.[1] ?? "";
  const count = /\.badge-tier-pip\.badge-count\s*\{([^}]*)\}/.exec(rules)?.[1] ?? "";
  ok("6.3 · one geometry (the pip's: absolute, 3px under the coin's edge, centred), the progress inks (the ring's --brand-500 edge, --brand-300 figure)",
    /position:\s*absolute/.test(pip) && /bottom:\s*-3px/.test(pip) && /border-color:\s*var\(--brand-500\)/.test(count) && /color:\s*var\(--brand-300\)/.test(count) && !/position|bottom|font-size/.test(count), j({ pip, count }));
  ok("6.4 · no gold on it (gold is money; R5-C)", !/gilt|gold/.test(count));
}

/* ══ §7 · THE WORDS ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · no dictionary string changed; no helper inserts or drops a character");
{
  let dictSame = false;
  try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", "src/lib/i18n-dict.ts"]); dictSame = true; } catch { dictSame = false; }
  ok("7.1 · src/lib/i18n-dict.ts is the commit's own (every word above is an existing key)", dictSame);
  const samples = LOCALES.flatMap((l) => ["journey.ticketsEmptyLens", "footer.licensedByGbt", "market.settlesOn", "agent.termsTitle"].map((k) => word(l, k)));
  const bad = samples.filter((s) => textOf(leaves(kr.keepConnectives(s))) !== s || /[ ⁠​]/.test(renderToStaticMarkup(h("p", null, kr.keepConnectives(s) as never))) && !/[ ⁠​]/.test(s));
  ok("7.2 · keepConnectives keeps every word: the same text, nothing inserted", bad.length === 0, j(bad));
}

console.log(`\nvisual-pass-r7a: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
