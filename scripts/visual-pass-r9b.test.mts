/**
 * ROUND 9 OF THE VISUAL PASS, FIXER B (2026-10-11) — line breaks: no label or title line ends on a word that leads into
 * the next. Round 8's read (S/r78/read/triage.md: R6-F1, R1-D2, R5-F2, R8-F2, R3-D2), every finding re-measured on its
 * tiles first, every sibling found and brought to one convention.
 *
 *   npx tsx scripts/visual-pass-r9b.test.mts        (npm run test:visual-pass-r9b)
 *
 *   §1 B1 · a possessive stays with its noun ("your ticket", "tiketi yako"), with the connective that introduces it — the
 *      rule, the Questions body's markup and lines (tiles 243 240 241 reproduced, then fixed), every empty-state body and
 *      every keepText sentence (no possessive torn, no line over its measure), the bet dialog's data title left out
 *   §2 B2 · the -enye relatives and "kwenye" are connectives — both copies of the list, the hero claim (tile 013
 *      reproduced) and wallet.emptyAdjust before → after, the pair that cannot break measured on every real surface
 *   §3 B3 · /live's caption (tiles 175 202) and the label family route through the keep — every routed site, one flex item
 *      where its row is flex, their lines, and the census: no raw eyebrow / caption / label holding a connective is left
 *      unless it is listed with the reason it cannot wrap
 *   §4 B4 · FooterLink holds connectives in the journey's footer (tile 299 reproduced); the classic footer keeps its
 *      bytes, and none of its links ends on a connective in any column
 *   §5 B5 · the comments that quoted the Board's old lines say what renders, and globals.css's F18 record of the journey
 *      footer's columns (B4's other columns at 1024/1280) is derived from the source: from 768 on, none holds the sw name
 *   §6 the words: no dictionary string changed; no helper inserts or drops a character
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r9/b/mutation-r9b.py.
 * The models: S/r9/b/tools (Python, HarfBuzz over the served fonts). This file carries R7-A's port of Chromium's balance
 * (`visual-pass-r7a.test.mts`) over unkerned advances — the repo's Inter, JetBrains Mono's fixed 0.6em, R5-E's Sora.
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
const section = (s: string) => console.log(`${String.fromCharCode(10)}── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const NL = String.fromCharCode(10);
const raw = (p: string) => readFileSync(p, "utf8").split(String.fromCharCode(13) + NL).join(NL);
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.split("\\").join("/")] : [];
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

const kr = req("../src/components/ui/keep-run.tsx") as typeof import("../src/components/ui/keep-run.tsx");
const est = req("../src/components/ui/empty-state-text.ts") as typeof import("../src/components/ui/empty-state-text.ts");
const conn = req("../src/lib/connectives.ts") as typeof import("../src/lib/connectives.ts");

/* ── the rendered tree, flattened into its text nodes (what a browser lays out as items) — R7-A's ───────────────────── */
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
/** Each nowrap run's text, in order. */
const runsOf = (node: unknown) => leaves(node).filter((l) => l.nowrap).map((l) => l.text);

/* ── metrics: Inter from the repo's own TTF (R7-A's: identical advances to next/font's on every character here), Sora from
      R5-E's tables, JetBrains Mono 0.6em; an ideograph or a full-width mark 1em; "￼" an atomic box (a flag) of the width
      the caller sets ── */
const fontkit = req("fontkit") as { openSync: (p: string) => { glyphForCodePoint: (c: number) => { advanceWidth: number }; unitsPerEm: number } };
const INTER = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const SORA_600 = "216,310,473,712,651,877,717,266,387,387,569,594,269,507,269,386,756,425,627,626,662,637,678,596,657,678,269,269,594,590,594,559,1126,773,688,799,785,596,560,832,801,326,642,728,553,954,867,865,658,865,720,674,610,780,729,1062,713,655,650,387,386,387,602,585,300,588,699,610,699,620,381,683,648,325,332,617,305,978,648,679,699,699,417,549,431,639,584,897,587,562,497,387,375,387,527".split(",").map(Number);
const WIDE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/u;
const IGNORABLE = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF]/u;
const BOX = String.fromCharCode(0xfffc);
type Face = { em: (ch: string) => number };
const interFace: Face = { em: (ch) => INTER.glyphForCodePoint(ch.codePointAt(0)!).advanceWidth / INTER.unitsPerEm };
const sora600: Face = { em: (ch) => { const cp = ch.codePointAt(0)!; return cp >= 0x20 && cp <= 0x7e ? SORA_600[cp - 0x20] / 1000 : 0.6; } };
const monoFace: Face = { em: () => 0.6 };
type Type = { face: Face; size: number; ls: number; box?: number };
const width = (s: string, ty: Type) => Array.from(s).reduce((w, ch) => ch === BOX ? w + (ty.box ?? 0) : IGNORABLE.test(ch) ? w : w + (WIDE.test(ch) ? ty.size : ty.face.em(ch) * ty.size) + ty.ls, 0);
const MONO = (size: number, tracking: number): Type => ({ face: monoFace, size, ls: tracking * size });

/* ── break opportunities (UAX #14 as these texts meet it, with CSS word-break: keep-all) — R7-A's, and a box breaks on
      both sides ── */
const NBSP = String.fromCharCode(0xa0), WJ = String.fromCharCode(0x2060), EM = "—";
const IDEO = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;
const CL = /[，。？！：；、）」』]/u;
function opportunities(text: string, keepAll = true): Set<number> {
  const ops = new Set<number>();
  const c = Array.from(text);
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    if (b === NBSP || b === WJ || a === NBSP || a === WJ) continue;
    if (b === BOX || a === BOX) { ops.add(i); continue; }
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
const SPACE_END = /[\t\n\f\r ]$/;
const SPACE_LEAD = /^[\t\n\f\r ]+/;
function paragraph(ls: Leaf[], keepAll = true) {
  const text = textOf(ls);
  const ops = opportunities(text, keepAll);
  const fragile = new Set<number>();
  let pos = 0;
  ls.forEach((l, i) => {
    const a = pos, b = pos + l.text.length;
    if (l.nowrap) {
      for (let p = a + 1; p < b; p++) ops.delete(p);
      if (SPACE_END.test(l.text)) ops.delete(b);
    } else if (i > 0 && ls[i - 1].nowrap) {
      const lead = SPACE_LEAD.exec(l.text)?.[0].length ?? 0;
      if (lead > 0 && lead < l.text.length) fragile.add(a + lead);
    }
    pos = b;
  });
  return { text, ops, fragile };
}

/* ── Chromium's text-wrap: balance (score line breaker, then the bisection) and the greedy fill — R7-A's port ─────── */
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
function scored(p: Para, W: number, ops: Set<number>, nLines: number): number[] | null {
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
    let b = Infinity, bp = 0;
    for (let s = 0; s < e; s++) {
      const delta = W - (ifBreak[e] - noBreak[s]);
      const sc = best[s].s + (delta < 0 ? 1e12 : delta * delta);
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
  const s = scored(p, W, new Set([...p.ops].filter((x) => !lost.has(x))), g.ends.length);
  if (s) return s;
  let lo = 0, hi = W;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; const gg = greedy(p, mid); if (gg.ends.length > g.ends.length || gg.over) lo = mid; else hi = mid; }
  return greedy(p, hi).ends;
}
const lines = (p: Para, ends: number[]) => ends.map((e, i) => p.text.slice(i ? ends[i - 1] : 0, e).trim());
const widths = (p: Para, ends: number[]) => ends.map((e, i) => lineW(p, i ? ends[i - 1] : 0, e));
const show = (ls: string[]) => ls.join(" / ");
type Mode = "balance" | "greedy";
/** A text laid out: its leaves (a node as drawn, or a raw string), the type, the line, the wrap. */
function layout(node: unknown, ty: Type, W: number, mode: Mode, keepAll = false) {
  const p: Para = { ...paragraph(typeof node === "string" ? [{ text: node, nowrap: false }] : leaves(node), keepAll), ty };
  const ends = mode === "balance" ? balance(p, W) : greedy(p, W).ends;
  return { lines: lines(p, ends), widths: widths(p, ends), over: widths(p, ends).some((w) => w > W + 0.5) };
}
const CONN_END = new RegExp(`(?:^|\\s)(?:${conn.CONNECTIVE_WORDS})$`, "i");
const endsOnConnective = (ls: string[]) => ls.slice(0, -1).some((l) => CONN_END.test(l));
const up = (s: string) => s.toUpperCase();

/* ══ §1 · B1 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · B1 a possessive stays with its noun — the rule, the Questions body, every empty-state body, every keepText sentence");
const EN_DET = /(?:^|\s)(?:your|my|our|their|its)$/i;
const SW_POSS = /^(?:w|y|z|l|ch|vy)(?:angu|ako|ake|etu|enu|ao)(?![\p{L}\p{M}])/iu;
/** A possessive torn from its noun: a line (not the last) ending on an en determiner, or a line (not the first) opening on a
 *  sw possessive. */
const torn = (ls: string[]) => ls.some((l, i) => (i < ls.length - 1 && EN_DET.test(l)) || (i > 0 && SW_POSS.test(l)));
{
  const held = (s: string) => kr.possessiveRanges(s).map(([a, b]) => s.slice(a, b));
  ok("1.1 · possessiveRanges: en determiner + word (\"your ticket\", \"Your break\", \"their play\"); sw word + possessive (\"tiketi yako\", \"salio lako\", \"Kiasi chako\", \"usalama wako\")",
    j(held("Pick a question, tap YES or NO — your ticket shows up here.")) === j(["your ticket"]) && j(held("Your break ends soon.")) === j(["Your break"])
      && j(held("fee 50pick keeps from their play — paid")) === j(["their play"]) && j(held("Chagua swali — tiketi yako itaonekana hapa.")) === j(["tiketi yako"])
      && j(held("kuona salio lako na kutoa")) === j(["salio lako"]) && j(held("Kiasi chako kamili")) === j(["Kiasi chako"]) && j(held("Kwa usalama wako akaunti")) === j(["Kwa usalama wako"]));
  ok("1.1′ · the connective that introduces the phrase travels with it (R7-A's rule for a name): \"wa fedha zako\", \"kwenye akaunti yako.\", \"of your stake\"",
    j(held("dau, muhtasari wa fedha zako utaonekana hapa.")) === j(["wa fedha zako"]) && j(held("iliyo kwenye akaunti yako.")) === j(["kwenye akaunti yako."])
      && j(held("the size of your stake")) === j(["of your stake"]));
  ok("1.1″ CONTROL · none for kw- p- mw- (\"tumetuma kwako\", \"pako\"), across a comma (\"hapa, yako\"), at the end (\"…your\"), in a longer word (\"yours\", \"wakoo\"), in Chinese (\"您的注单\")",
    held("tumetuma kwako sasa").length === 0 && held("mahali pako hapa").length === 0 && held("hapa, yako").length === 0 && held("this is your").length === 0
      && held("yours truly").length === 0 && held("tiketi wakoo").length === 0 && held("选择一个问题，点击是或否——您的注单将显示在这里。").length === 0, j([held("tumetuma kwako sasa"), held("hapa, yako")]));
  const long = "a".repeat(20000);
  const t0 = performance.now(); kr.possessiveRanges(long); kr.possessiveRanges(`${long} your ${long}`); kr.possessiveRanges(`your `.repeat(4000));
  ok("1.1‴ · linear: 20,000 letters, and 4,000 determiners, in under 80ms", performance.now() - t0 < 80, `${(performance.now() - t0).toFixed(1)}ms`);
}
const BODY_TY: Type = { face: interFace, size: 13, ls: -0.05 };
const fillSide = (l: Loc, t: string) => t.replace("{yes}", word(l, "common.yes")).replace("{no}", word(l, "common.no"));
const TICKETS: Record<Loc, string> = { sw: fillSide("sw", word("sw", "journey.ticketsEmptyOpenBody")), en: fillSide("en", word("en", "journey.ticketsEmptyOpenBody")), zh: fillSide("zh", word("zh", "journey.ticketsEmptyOpenBody")) };
/** The body as round 8 drew it (HEAD): its runs with no possessive — the dash with its unit, the YES/NO pair, the caller's runs. */
const PAIR = /\b[A-Z]{2,}[ \t]+(?:au|or)[ \t]+(?=([A-Z]{2,})\b)/g;
const pairRanges = (s: string) => [...s.matchAll(PAIR)].map((m): [number, number] => [m.index ?? 0, (m.index ?? 0) + m[0].length + m[1].length]);
const bodyBefore = (s: string, keep: string[] = []) => kr.keepRanges(s, kr.mergeRanges([...kr.runAndDashRanges(s, keep), ...pairRanges(s)]));
const bodyAfter = (s: string, keep: string[] = []) => est.emptyStateBody(keep.length ? { text: s, keep } : s);
/** The boxed empty state: min(vw − 32, 360) − 98; the `fill` box (the Questions body): vw − 32 − 98, 918 in the 1016 column. */
const BOXED: Record<string, number> = { "320": 190, "360": 230, "390": 260, "412": 262 };
const FILLED: Record<string, number> = { "320": 190, "360": 230, "390": 260, "412": 282, "768": 638, "1280": 918 };
{
  const m = (l: Loc) => renderToString(h("p", null, bodyAfter(TICKETS[l]) as never));
  ok("1.2 · the Questions body's markup: [YES or NO —] then a white-space node then [your ticket]; sw [NDIO au HAPANA —] … [tiketi yako]; zh as before (no space: no phrase)",
    /YES or NO —<\/span> <span class="whitespace-nowrap">your ticket<\/span>/.test(m("en")) && /NDIO au HAPANA —<\/span> <span class="whitespace-nowrap">tiketi yako<\/span>/.test(m("sw"))
      && kr.possessiveRanges(TICKETS.zh).length === 0 && j(est.emptyStateRanges(TICKETS.zh)) === j(kr.mergeRanges([...kr.runAndDashRanges(TICKETS.zh), ...pairRanges(TICKETS.zh)])), j([m("en"), m("sw")]));
  const cell = (l: Loc, vw: string, mk: (s: string) => unknown) => show(layout(mk(TICKETS[l]), BODY_TY, FILLED[vw], "balance", true).lines);
  ok("1.3 CONTROL · as round 8 drew it: en 320 \"Pick a question, tap / YES or NO — your / ticket shows up here.\" (tile 243), sw 320 and 390 \"Chagua swali, bonyeza / NDIO au HAPANA — tiketi / yako itaonekana hapa.\" (240 241)",
    cell("en", "320", bodyBefore) === "Pick a question, tap / YES or NO — your / ticket shows up here." && cell("sw", "320", bodyBefore) === "Chagua swali, bonyeza / NDIO au HAPANA — tiketi / yako itaonekana hapa."
      && cell("sw", "390", bodyBefore) === "Chagua swali, bonyeza / NDIO au HAPANA — tiketi / yako itaonekana hapa.", j([cell("en", "320", bodyBefore), cell("sw", "320", bodyBefore), cell("sw", "390", bodyBefore)]));
  const want: Record<string, string> = {
    "en 320": "Pick a question, tap / YES or NO — your ticket / shows up here.", "en 360": "Pick a question, tap YES or NO — / your ticket shows up here.",
    "en 390": "Pick a question, tap YES or NO — / your ticket shows up here.", "en 412": "Pick a question, tap YES or NO — / your ticket shows up here.",
    "sw 320": "Chagua swali, bonyeza / NDIO au HAPANA — / tiketi yako itaonekana hapa.", "sw 360": "Chagua swali, bonyeza / NDIO au HAPANA — / tiketi yako itaonekana hapa.",
    "sw 390": "Chagua swali, bonyeza / NDIO au HAPANA — / tiketi yako itaonekana hapa.", "sw 412": "Chagua swali, bonyeza NDIO au HAPANA — / tiketi yako itaonekana hapa.",
    "zh 320": "选择一个问题，点击是或否—— / 您的注单将显示在这里。", "zh 390": "选择一个问题，点击是或否—— / 您的注单将显示在这里。",
  };
  const got = Object.keys(want).map((k) => { const [l, vw] = k.split(" ") as [Loc, string]; return [k, cell(l, vw, bodyAfter)]; });
  ok("1.4 · the Questions body after: en 320 \"Pick a question, tap / YES or NO — your ticket / shows up here.\"; sw 320–390 \"Chagua swali, bonyeza / NDIO au HAPANA — / tiketi yako itaonekana hapa.\"; en 360–412, sw 412 (the 282px fill) and zh as before",
    got.every(([k, v]) => v === want[k]), j(got.filter(([k, v]) => v !== want[k])));
}
{
  // Every dictionary sentence (a superset of every empty-state body), placeholders filled, at every empty-state measure.
  const DATE: Record<Loc, string> = { en: "9 Oct, 06:02", sw: "9 Okt, 06:02", zh: "2026年10月9日 06:02" };
  const all = (t: unknown, p: string[] = []): Array<[string, string]> => t && typeof t === "object" ? Object.entries(t as Record<string, unknown>).flatMap(([k, v]) => typeof v === "string" ? [[[...p, k].join("."), v] as [string, string]] : all(v, [...p, k])) : [];
  let cells = 0, tornBefore = 0, tornAfter = 0, overAfter = 0;
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const l of LOCALES) for (const [path, v] of all(dict[l])) {
    if (v.length < 12) continue;
    const keep: string[] = [];
    const text = v.replace(/\{(\w+)\}/g, (_, k: string) => k === "yes" ? word(l, "common.yes") : k === "no" ? word(l, "common.no") : /date|until|end/i.test(k) ? (keep.push(DATE[l]), DATE[l]) : "5");
    if (seen.has(l + text) || kr.possessiveRanges(text).length === 0) continue;
    seen.add(l + text);
    for (const W of [190, 230, 260, 262, 282, 638]) {
      cells++;
      const b = layout(bodyBefore(text, keep), BODY_TY, W, "balance", true), a = layout(bodyAfter(text, keep), BODY_TY, W, "balance", true);
      if (torn(b.lines)) tornBefore++;
      if (torn(a.lines)) { tornAfter++; bad.push(`${l} ${path} @${W}: ${show(a.lines)}`); }
      if (a.over && !b.over) { overAfter++; bad.push(`OVER ${l} ${path} @${W}: ${show(a.lines)}`); }
    }
  }
  ok(`1.5 · every dictionary sentence holding a possessive, drawn as an empty-state body at every measure (${cells} cells): no possessive torn from its noun, no line over its measure`,
    cells > 2000 && tornAfter === 0 && overAfter === 0, bad.slice(0, 6).join(" | "));
  ok(`1.5′ CONTROL · as round 8 drew them, ${tornBefore} cells tore one`, tornBefore > 100, String(tornBefore));
  const act = (vw: string) => show(layout(bodyAfter(word("sw", "activity.emptyBody")), BODY_TY, BOXED[vw], "balance", true).lines);
  ok("1.5″ · /profile/activity's body at sw 320–360: \"Ukiweka fedha au kuweka / dau, muhtasari wa fedha zako / utaonekana hapa.\" — the phrase whole and no line ending on \"wa\" in its place",
    act("320") === "Ukiweka fedha au kuweka / dau, muhtasari wa fedha zako / utaonekana hapa." && act("360") === act("320") && j(runsOf(bodyAfter(word("sw", "activity.emptyBody")))).includes("wa fedha zako"), act("320"));
}
{
  // keepText: every sentence R4-I measured on its surfaces (test:visual-pass-r4i §2.8) with a possessive, at 320–412.
  const DATE: Record<Loc, string> = { en: "9 Oct, 06:02", sw: "9 Okt, 06:02", zh: "2026年10月9日 06:02" };
  const withDate = (l: Loc, k: string) => { const s = word(l, k).replace(/\{(date|until)\}/g, DATE[l]); return { s, runs: s.includes(DATE[l]) ? [DATE[l]] : [] }; };
  const SURF: Array<[string, number, Type, Mode, string[]]> = [
    ["sign-in panel body", 168, BODY_TY, "greedy", ["auth.selfExclusionUntilBody", "rg.breakActive", "auth.selfExclusionBody", "auth.selfExclusionEndedBody", "auth.selfExclusionPermanentBody", "auth.coolingOffBody"]],
    ["deposit-paused notice", 222, BODY_TY, "balance", ["rg.breakActive", "rg.exclusionActive"]],
    ["limits-page callout", 213, BODY_TY, "greedy", ["rg.breakActive", "rg.exclusionActive"]],
    ["Wallet sheet notice", 248, BODY_TY, "greedy", ["rg.breakActive"]],
    ["home break notice", 254, BODY_TY, "greedy", ["rg.breakActive"]],
    ["market Your positions", 238, BODY_TY, "greedy", ["rg.breakActive"]],
    ["RG confirm body", 240, { face: interFace, size: 13.5, ls: 0 }, "greedy", ["rg.breakDescription", "rg.selfExcludeDescription"]],
    ["bet confirm disclosures", 181, BODY_TY, "greedy", ["dialog.estimateDisclaimer", "dialog.payoutCalcBody", "market.thinUpsideNote", "market.crowdedWarning", "dialog.poolSharePayout"]],
    ["auth subtitle", 224, { face: interFace, size: 13.5, ls: 0 }, "greedy", ["auth.emailOrPhoneHint"]],
    ["login hint", 224, BODY_TY, "greedy", ["auth.emailSignInHint", "common.phoneInputTitle"]],
  ];
  let cells = 0, tornBefore = 0, tornAfter = 0, overAfter = 0;
  const bad: string[] = [];
  for (const [name, w320, ty, mode, keys] of SURF) for (const l of LOCALES) for (const k of keys) {
    const { s, runs } = withDate(l, k);
    if (kr.possessiveRanges(s).length === 0) continue;
    for (const vw of [320, 360, 390, 412]) {
      cells++;
      const W = w320 + vw - 320;
      const b = layout(kr.keepText(s, runs, { phrases: false }), ty, W, mode, true), a = layout(kr.keepText(s, runs), ty, W, mode, true);
      if (torn(b.lines)) tornBefore++;
      if (torn(a.lines)) { tornAfter++; bad.push(`${name} ${l} ${k} @${vw}: ${show(a.lines)}`); }
      if (a.over && !b.over) { overAfter++; bad.push(`OVER ${name} ${l} ${k} @${vw}`); }
    }
  }
  ok(`1.6 · every keepText sentence with a possessive on R4-I's surfaces (${cells} cells at 320–412): none torn, none over its line`, cells >= 40 && tornAfter === 0 && overAfter === 0, bad.slice(0, 6).join(" | "));
  ok(`1.6′ CONTROL · without the phrase rule ${tornBefore} cells tore one`, tornBefore >= 4, String(tornBefore));
  const hint = (vw: number) => show(layout(kr.keepText(word("sw", "auth.emailSignInHint")), BODY_TY, 224 + vw - 320, "greedy", true).lines);
  ok("1.6″ · the sw sign-in hint: \"Anwani ya barua pepe iliyo / kwenye akaunti yako.\" at 320–390 (round 8 ended its first line on \"kwenye\")",
    hint(320) === "Anwani ya barua pepe iliyo / kwenye akaunti yako." && hint(390) === hint(320)
      && show(layout(kr.keepText(word("sw", "auth.emailSignInHint"), [], { phrases: false }), BODY_TY, 224, "greedy", true).lines) === "Anwani ya barua pepe iliyo kwenye / akaunti yako.", hint(320));
}
{
  const BCM = "src/components/markets/bet-confirm-modal.tsx";
  const t = "Je, Simba watashinda mechi yao ijayo dhidi ya Yanga?";
  ok("1.7 · a market's title is DATA: the bet dialog draws it with `phrases: false` — its figures, dash and last two words held, no phrase",
    has(BCM, "{keepText(marketTitle, figureRuns(marketTitle), { phrases: false })}") && !/mechi yao/.test(j(runsOf(kr.keepText(t, [], { phrases: false }))))
      && /mechi yao/.test(j(runsOf(kr.keepText(t)))));
  ok("1.7′ · the empty state and keepText take the phrases from ONE rule (`possessiveRanges`, keep-run.tsx)",
    has("src/components/ui/empty-state-text.ts", "const ranges = [...runAndDashRanges(text, keep), ...possessiveRanges(text)];")
      && has("src/components/ui/keep-run.tsx", "if (opts.phrases !== false) ranges.push(...possessiveRanges(text));"));
}

/* ══ §2 · B2 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · B2 the -enye relatives and kwenye are connectives — both lists, the claim, the empty title, the pair that cannot break");
const NEW_WORDS = ["lenye", "yenye", "wenye", "zenye", "chenye", "vyenye", "penye", "mwenye", "kwenye"];
{
  const list = conn.CONNECTIVE_WORDS.split("|");
  ok("2.1 · lib/connectives.ts holds R5-A's words and the nine: lenye yenye wenye zenye chenye vyenye penye mwenye kwenye — not \"lwenye\" (class 11 takes w-)",
    conn.CONNECTIVE_WORDS === "ya|za|wa|la|cha|vya|kwa|na|lenye|yenye|wenye|zenye|chenye|vyenye|penye|mwenye|kwenye|of|and|&" && NEW_WORDS.every((w) => list.includes(w)) && !list.includes("lwenye")
      && conn.isConnective("Kwenye") && conn.isConnective("LENYE") && !conn.isConnective("kwenyewe") && !conn.isConnective("wenyewe"), conn.CONNECTIVE_WORDS);
  const ge = raw("src/app/global-error.tsx");
  ok("2.2 · global-error.tsx's copy is the same list, character for character",
    new RegExp(`const CONNECTIVE_WORDS = "${conn.CONNECTIVE_WORDS.replace(/[|&]/g, (c) => "\\" + c)}";`).test(ge));
  const cr = (s: string) => conn.connectiveRanges(s).map(([a, b]) => s.slice(a, b));
  ok("2.3 · connectiveRanges holds each new word with its space: \"Soko [la ]kwanza [la ]utabiri [lenye ]leseni Tanzania\", \"Hakuna marekebisho [kwenye ]akaunti yako\"; none at the end, none inside a longer word",
    j(cr(word("sw", "home.heroClaimFirst"))) === j(["la ", "la ", "lenye "]) && j(cr(word("sw", "wallet.emptyAdjust"))) === j(["kwenye "])
      && cr("Rudi kwenye").length === 0 && cr("mwenyewe atakuja").length === 0);
}
const CLAIM_TY = MONO(13, 0.14);
/** The claim's text column, measured on round 8's tiles 013–020: it opens at x86 (x103 at 1024–1150), ends on the page's
 *  16px gutter below 1024, in the hero's column from 1024; from 1280 the mark and rule are gone and it is one line. */
const CLAIM_W: Record<string, number> = { "320": 218, "360": 258, "390": 288, "412": 310, "768": 666, "1024": 402, "1280": 1000 };
{
  const claim = (k: string, vw: string, after: boolean) => show(layout(after ? kr.keepConnectives(up(word("sw", k))) : up(word("sw", k)), CLAIM_TY, CLAIM_W[vw], "balance").lines);
  ok("2.4 CONTROL · as round 8 drew the claim (no keep): sw 320 \"SOKO LA KWANZA / LA UTABIRI LENYE / LESENI TANZANIA\" (tile 013), 360–390 \"…LA UTABIRI / LENYE LESENI TANZANIA\" (014 015), 768 one line (017), 1024 two (018)",
    claim("home.heroClaimFirst", "320", false) === "SOKO LA KWANZA / LA UTABIRI LENYE / LESENI TANZANIA" && claim("home.heroClaimFirst", "360", false) === "SOKO LA KWANZA LA UTABIRI / LENYE LESENI TANZANIA"
      && claim("home.heroClaimFirst", "390", false) === "SOKO LA KWANZA LA UTABIRI / LENYE LESENI TANZANIA" && claim("home.heroClaimFirst", "768", false) === "SOKO LA KWANZA LA UTABIRI LENYE LESENI TANZANIA"
      && claim("home.heroClaimFirst", "1024", false) === "SOKO LA KWANZA LA UTABIRI / LENYE LESENI TANZANIA", claim("home.heroClaimFirst", "320", false));
  const after = Object.keys(CLAIM_W).map((vw) => [vw, claim("home.heroClaimFirst", vw, true), claim("home.heroClaim", vw, true)]);
  const two = "SOKO LA KWANZA LA UTABIRI / LENYE LESENI TANZANIA";
  ok("2.5 · the claim after: 320 \"SOKO LA KWANZA / LA UTABIRI / LENYE LESENI TANZANIA\", 360–412 and 1024 as before, 768 and 1280 one line; the claim without \"first\" never ends on LENYE (\"SOKO LA UTABIRI / LENYE LESENI TANZANIA\" at 320–412)",
    after[0][1] === "SOKO LA KWANZA / LA UTABIRI / LENYE LESENI TANZANIA" && after.slice(1, 4).every((r) => r[1] === two) && after[5][1] === two
      && after[4][1] === up(word("sw", "home.heroClaimFirst")) && after[6][1] === up(word("sw", "home.heroClaimFirst"))
      && after.slice(0, 4).every((r) => r[2] === "SOKO LA UTABIRI / LENYE LESENI TANZANIA") && after.every((r) => !endsOnConnective(r[1].split(" / ")) && !endsOnConnective(r[2].split(" / "))), j(after));
  ok("2.5′ CONTROL · without the keep the claim without \"first\" ended on LENYE at 320–412", ["320", "360", "390", "412"].every((vw) => claim("home.heroClaim", vw, false) === "SOKO LA UTABIRI LENYE / LESENI TANZANIA"));
  const EMPTY_TITLE: Type = { face: sora600, size: 15.5, ls: 0 };
  const adj = Object.entries(BOXED).map(([vw, W]) => [vw, show(layout(kr.keepConnectives(word("sw", "wallet.emptyAdjust")), EMPTY_TITLE, W, "balance").lines)]);
  ok("2.6 · wallet.emptyAdjust (an EmptyState title): \"Hakuna marekebisho / kwenye akaunti yako\" at 320–412, as before — no line on \"kwenye\"",
    adj.every(([, v]) => v === "Hakuna marekebisho / kwenye akaunti yako"), j(adj));
  // The pair that cannot break: each new connective and the word after it, against the narrowest line of every real surface.
  const pairs: Array<[string, number]> = [];
  for (const s of [up(word("sw", "home.heroClaimFirst")), up(word("sw", "home.heroClaim"))]) for (const m of s.matchAll(/(?:^|\s)((?:LENYE|KWENYE|YENYE|WENYE|ZENYE|CHENYE|VYENYE|PENYE|MWENYE)\s+\S+)/g)) pairs.push([m[1], width(m[1], CLAIM_TY) / CLAIM_W["320"]]);
  for (const m of word("sw", "wallet.emptyAdjust").matchAll(/(kwenye\s+\S+)/g)) pairs.push([m[1], width(m[1], EMPTY_TITLE) / BOXED["320"]]);
  ok(`2.7 · what cannot break — a new connective and the word after it — is narrower than its surface's narrowest line (widest: ${pairs.map(([p, r]) => `${p} ${(r * 100).toFixed(0)}%`).join(", ")})`,
    pairs.length === 3 && pairs.every(([, r]) => r < 0.75), j(pairs));
  const enzh = (["en", "zh"] as Loc[]).flatMap((l) => Object.values(dict[l]).flatMap((sec) => Object.entries(sec as Record<string, unknown>)).filter(([k, v]) => typeof v === "string" && NEW_WORDS.some((w) => new RegExp(`(^|\\s)${w}\\s`, "i").test(String(v))) && k !== "signOutConfirmBodySw"));
  ok("2.8 · en and zh: no string holds a new word (en's `profile.signOutConfirmBodySw` is a Swahili sentence, drawn as prose) — the keep changes nothing there", enzh.length === 0, j(enzh.slice(0, 3)));
}

/* ══ §3 · B3 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · B3 /live's caption and the label family — every eyebrow, caption and label that can wrap draws through the keep");
const CAP_TY = MONO(10, 0.14);
{
  ok("3.1 · /live's caption draws through the keep, in its balanced block (a flex row's item, its words inline)",
    has("src/app/live/featured-contest.tsx", '<p className="min-w-0 text-balance break-words font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{keepConnectives(eyebrow)}</p>'));
  const cap = (vw: number, after: boolean) => show(layout(after ? kr.keepConnectives(up(word("sw", "market.mostContested"))) : up(word("sw", "market.mostContested")), CAP_TY, 84 + vw - 320, "balance").lines);
  ok("3.2 CONTROL · as round 8 drew it: \"LILILO NA / SHAKA ZAIDI\" at sw 390 (tiles 175 202) and 320 (the row leaves the caption 84px there, its comment's measure)",
    cap(390, false) === "LILILO NA / SHAKA ZAIDI" && cap(320, false) === "LILILO NA / SHAKA ZAIDI", cap(390, false));
  ok("3.3 · after: \"LILILO / NA SHAKA ZAIDI\" at 360–390, \"LILILO / NA SHAKA / ZAIDI\" at 320 (3 × 14px = 42, inside the arrows' 44px row), one line from 412; en and zh unchanged",
    cap(390, true) === "LILILO / NA SHAKA ZAIDI" && cap(360, true) === cap(390, true) && cap(320, true) === "LILILO / NA SHAKA / ZAIDI" && cap(412, true) === "LILILO NA SHAKA ZAIDI"
      && renderToStaticMarkup(h("p", null, kr.keepConnectives(word("en", "market.mostContested")) as never)) === `<p>${word("en", "market.mostContested")}</p>`, j([cap(320, true), cap(360, true), cap(390, true), cap(412, true)]));
  ok("3.4 · the hero claim draws through the keep (B2's tile), its span its flex row's item",
    has("src/components/home/hero-intro.tsx", '<span className="kp-hero__claim-text">{keepConnectives(FIRST_LICENSED_EVIDENCE() ? t.home.heroClaimFirst : t.home.heroClaim)}</span>'));
  const item = kr.keepConnectivesItem("Mpango wa mawakala");
  const flexRow = renderToStaticMarkup(h("p", { className: "flex gap-2" }, h("i"), item as never));
  ok("3.5 · keepConnectivesItem: words in a flex row stay ONE item — \"<i></i><span>Mpango <span…>wa </span>mawakala</span>\"; words with no connective come back as the string",
    flexRow === '<p class="flex gap-2"><i></i><span>Mpango <span class="whitespace-nowrap">wa </span>mawakala</span></p>' && kr.keepConnectivesItem("Ulinzi") === "Ulinzi", flexRow);
  const plant = renderToStaticMarkup(h("p", { className: "flex gap-2" }, h("i"), kr.keepConnectives("Mpango wa mawakala") as never));
  ok("3.5′ CONTROL · keepConnectives alone puts three items in that row (\"Mpango \", [wa ], \"mawakala\")", (plant.match(/<\/i>(Mpango )<span/) ?? []).length === 2, plant);
}
// Every site this round routes: its source, the keep drawn where its row needs it.
const ROUTED: Array<[string, string]> = [
  ["src/components/home/trust-band.tsx", "{keepConnectivesItem(t.home.trustEyebrow)}"],
  ["src/components/home/landing-hero.tsx", '<span className="kp-proof__cap">{keepConnectives(t.home.heroProofPaid)}</span>'],
  ["src/components/home/landing-hero.tsx", '<span className="kp-proof__cap">{keepConnectives(t.home.heroProofOpen)}</span>'],
  ["src/components/home/landing-hero.tsx", '<span className="kp-proof__cap">{keepConnectives(t.home.heroProofPool)}</span>'],
  ["src/app/live/page.tsx", "{keepConnectives(t.market.priceCompetition)}"],
  ["src/app/agent/apply/apply-client.tsx", "{keepConnectives(t.agent.missingTitle)}"],
  ["src/app/agent/status/page.tsx", "{keepConnectives(t.agent.officerNote)}"],
  ["src/components/agent/commission-waterfall.tsx", "{keepConnectives(t.agent.wfColParam)}"],
  ["src/app/agent/loading.tsx", "<GhostText>{keepConnectives(t.agent.wfColParam)}</GhostText>"],
  ["src/app/profile/invite/agent-dashboard.tsx", "{keepConnectives(t.agent.verifiedBadge)}</p>"],
  ["src/app/auth/2fa/page.tsx", "{keepConnectives(backup ? t.security.useAuthenticator : t.security.useBackupCode)}"],
  ["src/components/markets/resolution-panel.tsx", "{keepConnectivesItem(t.market.resEvidence)}"],
  ["src/components/charts/chart-toggle.tsx", "{keepConnectivesItem(t.market.probOverTime)}"],
  ["src/app/wallet/wallet-client.tsx", "{keepConnectives(t.wallet.transactionId)}"],
  ["src/app/wallet/wallet-client.tsx", "{keepConnectives(t.wallet.gatewayReference)}"],
  ["src/app/positions/performance/page.tsx", '<span className="gilt-eyebrow">{keepConnectives(t.performance.pnlOverTime)}</span>'],
  ["src/app/positions/performance/page.tsx", "{keepConnectives(t.performance.cumulativePerSettlement)}"],
  ["src/app/positions/performance/performance-ghost.tsx", "<GhostText>{keepConnectives(t.performance.pnlOverTime)}</GhostText>"],
  ["src/app/positions/performance/performance-ghost.tsx", "<GhostText>{keepConnectives(t.performance.cumulativePerSettlement)}</GhostText>"],
  ["src/app/profile/sessions/page.tsx", "{keepConnectives(t.profile.ipAddress)}"],
  ["src/app/fairness/page.tsx", "{keepConnectives(s.label)}"],
  ["src/app/help/page.tsx", "{keepConnectives(title)}"],
  ["src/app/profile/kyc/page.tsx", "{keepConnectives(node.label)}"],
  ["src/app/profile/activity/page.tsx", '<span className="text-text-muted">{keepConnectives(label)}</span>'],
  ["src/components/ui/receipt-row.tsx", '{typeof label === "string" ? keepConnectives(label) : label}'],
  ["src/components/ui/page-header.tsx", '{typeof eyebrow === "string" ? keepConnectivesItem(eyebrow) : eyebrow}'],
  ["src/app/leaderboard/page.tsx", '<th className="text-left p-3 hidden md:table-cell">{keepConnectives(t.leaderboard.tableStakes)}</th>'],
  ["src/app/leaderboard/loading.tsx", "<GhostText>{keepConnectives(t.leaderboard.tableStakes)}</GhostText>"],
];
{
  const missing = ROUTED.filter(([f, s]) => !has(f, s));
  ok(`3.6 · the label family's ${ROUTED.length} routed sites draw through the keep (a flex row's direct words through keepConnectivesItem)`, missing.length === 0, j(missing));
  // Their lines, from each site's measure (S/r9/b/tools/b3_predict.py documents each; mono labels are exact here).
  type Cell = [string, Type, number, Mode, string, string];
  const CELLS: Cell[] = [
    ["agent.missingTitle", CAP_TY, 248, "greedy", "BADO YANAHITAJIKA KABLA YA / KUWASILISHA", "BADO YANAHITAJIKA KABLA / YA KUWASILISHA"],
    ["agent.officerNote", CAP_TY, 248, "greedy", "UJUMBE KUTOKA KWA AFISA WA / UZINGATIAJI", "UJUMBE KUTOKA KWA AFISA / WA UZINGATIAJI"],
    ["market.priceCompetition", MONO(11, 0.14), 240, "greedy", "MASHINDANO YA BEI · MFUMO WA / BWAWA", "MASHINDANO YA BEI · MFUMO / WA BWAWA"],
    ["agent.wfColParam", CAP_TY, 231, "greedy", "KIPENGELE CHA FEDHA / HATUA YA / MAKATO", "KIPENGELE CHA FEDHA / HATUA / YA MAKATO"],
    ["agent.verifiedBadge", CAP_TY, 170, "greedy", "WAKALA / ALIYETHIBITISHWA WA / 50PICK", "WAKALA / ALIYETHIBITISHWA / WA 50PICK"],
    ["market.resEvidence", CAP_TY, 220, "greedy", "USHAHIDI ULIOREKODIWA NA / AFISA", "USHAHIDI ULIOREKODIWA / NA AFISA"],
    // ⚠️ RE-PINNED IN THE OPEN 2026-10-14 (S12 WP2): `market.probOverTime` left this list — see 3.8″ below.
    ["wallet.gatewayReference", CAP_TY, 98, "greedy", "KUMBUKUMBU YA / LANGO", "KUMBUKUMBU / YA LANGO"],
    ["help.liveChat", CAP_TY, 188, "greedy", "MAZUNGUMZO YA MOJA KWA / MOJA", "MAZUNGUMZO YA MOJA / KWA MOJA"],
    ["home.heroProofPaid", MONO(11, 0.14), 172, "greedy", "YALIYOLIPWA KWA / WACHEZAJI", "YALIYOLIPWA / KWA WACHEZAJI"],
    ["profile.idTypeDriverLicence", MONO(10, 0), 93.3, "balance", "LESENI YA / UDEREVA", "LESENI / YA UDEREVA"],
  ];
  const got = CELLS.map(([k, ty, W, mode]) => [k, show(layout(up(word("sw", k)), ty, W, mode).lines), show(layout(kr.keepConnectives(up(word("sw", k))), ty, W, mode).lines)]);
  ok("3.7 CONTROL · drawn raw at sw 320–360 each of these ended a line on a connective (\"…KABLA YA\", \"…AFISA WA\", \"…MFUMO WA\", \"…HATUA YA\", \"…MOJA KWA\", \"LESENI YA\", \"TUMIA MSIMBO WA\", \"FAIDA KWA\"…)",
    got.every(([k, b], i) => b === CELLS[i][4] && endsOnConnective(b.split(" / "))), j(got.filter(([, b], i) => b !== CELLS[i][4])));
  ok("3.8 · through the keep none does — \"…KABLA / YA KUWASILISHA\", \"…AFISA / WA UZINGATIAJI\", \"…MFUMO / WA BWAWA\", \"LESENI / YA UDEREVA\", \"TUMIA MSIMBO / WA AKIBA\", \"FAIDA / KWA WAKATI\"…",
    got.every(([, , a], i) => a === CELLS[i][5] && !endsOnConnective(a.split(" / "))), j(got.filter(([, , a], i) => a !== CELLS[i][5])));
  const kadi = [93.3, 106.7].map((W) => show(layout(kr.keepConnectives(up(word("sw", "profile.idTypeVoterCard"))), MONO(10, 0), W, "balance").lines));
  ok("3.8′ · the voter's card on the KYC rail (two break candidates: Chromium's balance falls back to its bisection): \"KADI YA MPIGA / KURA\" at 320–360 — no line on \"ya\"; the owner's question (\"KADI / YA MPIGA KURA\" needs \"mpiga kura\" held)",
    kadi.every((v) => v === "KADI YA MPIGA / KURA"), j(kadi));
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-14 (S12 WP2). Spelt "NDIYO", the chart's title measured 199.8px against the
  // toggle's 199px at sw 320 and wrapped — "UWEZEKANO WA NDIYO KWA / MUDA" raw, "UWEZEKANO WA NDIYO / KWA MUDA" through
  // the keep (3.7/3.8's old cell). Spelt "NDIO", the product's side word, it measures 192.4px and draws on ONE line, so
  // it has no line to end on a connective and 3.7's premise no longer holds for it. What is pinned now is that fact:
  // one line, raw and through the keep, inside the measure. The site still draws through the keep (3.6), and a return
  // of the misspelling fails here as well as in `test:labels` §12.
  const pot = up(word("sw", "market.probOverTime"));
  const potRaw = layout(pot, CAP_TY, 199, "greedy");
  const potKept = layout(kr.keepConnectives(pot), CAP_TY, 199, "greedy");
  ok("3.8″ · the chart's title, spelt NDIO (S12 WP2): \"UWEZEKANO WA NDIO KWA MUDA\" is ONE line in the toggle's 199px at sw 320 (192.4px), raw and through the keep",
    show(potRaw.lines) === "UWEZEKANO WA NDIO KWA MUDA" && show(potKept.lines) === "UWEZEKANO WA NDIO KWA MUDA"
      && !potRaw.over && !potKept.over && Math.abs(width(pot, CAP_TY) - 192.4) < 0.05,
    j([show(potRaw.lines), show(potKept.lines), width(pot, CAP_TY)]));
}
{
  // The census: every raw dictionary string drawn as the direct words of an eyebrow / caption / label on a player surface,
  // holding a connective, is either routed (above) or listed here with the measured reason it cannot wrap.
  const FAMILY = /(?:^|[\s"`])(?:eyebrow|gilt-eyebrow|kp-hero__eyebrow|kp-hero__claim-text|kp-proof__cap|mcardp-cat|kp-wsheet__label|kp-mine__eyebrow|kp-hub__label)(?=[\s"`]|$)/;
  const EXEMPT: Record<string, string> = {
    "src/app/agent/page.tsx agent.feeTitle": "sw \"Ada ya usajili\" 104px (en holds none) in the fee panel's 248px at 320",
    "src/app/agent/loading.tsx agent.feeTitle": "the same eyebrow's ghost",
    "src/components/agent/commission-waterfall.tsx agent.wfEyebrow": "\"Mfano wa hesabu\" 111px in a flex-WRAP row: it takes a line of its own before it would shrink",
    "src/app/agent/loading.tsx agent.wfEyebrow": "the same eyebrow's ghost",
    "src/app/agent/apply/apply-client.tsx agent.payTitle": "sw \"Lipa ada ya usajili\" 141px in the panel's 248px at 320",
    "src/app/profile/invite/invite-client.tsx profile.yourReferralLink": "\"Kiungo chako cha rufaa\" 163px in a column of 240px or more",
    "src/components/home/updown-band.tsx home.updownEyebrow": "\"Mchezo wa kasi · hai\" 163px beside its dot in 278px or more",
    "src/app/updown/[roundId]/page.tsx market.udSettlementProof": "\"Uthibitisho wa malipo\" 155px in a flex-WRAP row of 252px or more",
    "src/app/updown/history/page.tsx market.udWinRate": "\"Kiwango cha ushindi\" 141px in a stat card of 167px or more",
    "src/app/profile/activity/page.tsx activity.moneyEyebrow": "\"Muhtasari wa fedha\" 133px in the panel's 240px",
    "src/app/profile/invite/page.tsx profile.bonusRequirements": "\"Masharti ya bonasi\" 133px beside its glyph in 229px or more",
    "src/app/proposals/[id]/page.tsx common.resolutionCriterion": "\"Vigezo vya utatuzi\" / en \"Resolution criterion\" 148px in the panel's 248px",
    "src/app/wallet/wallet-client.tsx common.unlockProgress": "\"Maendeleo ya kufungua\" 155px beside its figure in 196px or more",
    "src/components/markets/sell-confirm-modal.tsx dialog.earlyExitFee": "its column is a flex-WRAP item: beside the figure at its full 148px, or a full-width line of its own",
    "src/components/pay/lipa-qr-panel.tsx lipa.amountLabel": "phones stack the QR above the column (flex-col: 248px); from 640 the column is ~306px — \"Kiasi cha kulipa\" is 118px",
    "src/components/pay/lipa-qr-panel.tsx lipa.title": "\"Lipa kwa QR\" 81px beside its glyph in the panel's 248px",
    "src/app/live/pulse-grid.tsx market.udTitle": "the Up & Down game tag \"Juu na Chini\" (~107px with its glyph) beside the time left (108px at most) in a card row of 256px or more",
    "src/app/profile/security/security-client.tsx security.backupTitle": "\"Hifadhi misimbo yako ya akiba\" 215px in the panel's 240px at 320",
  };
  const sites: string[] = [];
  for (const f of [...walk("src/app", /\.tsx$/), ...walk("src/components", /\.tsx$/)]) {
    if (/^src\/(?:app\/(?:admin|resolver|api)|components\/admin)\//.test(f) || /(?:opengraph|twitter)-image/.test(f)) continue;
    const src = code(f);
    for (const m of src.matchAll(/<([a-z][a-zA-Z0-9]*)\b[^<>]*?className=(?:"([^"]*)"|\{`([^`]*)`\})[^<>]*>/g)) {
      const cls = m[2] ?? m[3] ?? "";
      if (!FAMILY.test(cls)) continue;
      const rest = src.slice((m.index ?? 0) + m[0].length);
      const close = rest.indexOf(`</${m[1]}>`);
      const body = rest.slice(0, close < 0 ? 300 : Math.min(close, 600));
      for (const km of body.matchAll(/(^|[^(\w.])\{\s*t\.([a-zA-Z]+)\.([a-zA-Z0-9_]+)\s*\}/g)) {
        const key = `${km[2]}.${km[3]}`;
        const holds = (["sw", "en"] as Loc[]).some((l) => conn.connectiveRanges(word(l, key)).length > 0);
        if (holds) sites.push(`${f} ${key}`);
      }
    }
  }
  const unlisted = [...new Set(sites)].filter((s) => !(s in EXEMPT));
  const stale = Object.keys(EXEMPT).filter((s) => !sites.includes(s));
  ok(`3.9 · the census: every raw eyebrow / caption / label on a player surface holding a connective is routed or listed with why it cannot wrap (${new Set(sites).size} raw, all listed)`,
    unlisted.length === 0, j(unlisted));
  ok("3.9′ · and the list holds nothing that is no longer raw (a routed site leaves it)", stale.length === 0, j(stale));
}
{
  // The performance pair and the 2FA row: two items shrinking in one flex row, each by its share of the shortfall (CSS
  // flexbox), above its longest word. "←" is outside JetBrains Mono's Latin subset; a monospace fallback draws it about
  // 0.6em (the Python model took 1em: 3px less for the link, the same lines).
  const shrink = (box: number, gap: number, a: number, b: number) => { const over = a + b + gap - box; return over <= 0 ? [a, b] : [a - over * a / (a + b), b - over * b / (a + b)]; };
  const pa = MONO(10, 0.14), pb = MONO(10, 0.08), t2 = MONO(12, 0.14);
  const [A] = shrink(320 - 32 - 48, 16, width(up(word("sw", "performance.pnlOverTime")), pa), width(up(word("sw", "performance.cumulativePerSettlement")), pb));
  const back = width(up(`← ${word("sw", "common.back")}`), t2);
  const [, B1] = shrink(320 - 32 - 64, 0, back, width(up(word("sw", "security.useBackupCode")), t2));
  const [, B2] = shrink(320 - 32 - 64, 0, back, width(up(word("sw", "security.useAuthenticator")), t2));
  const rows: Array<[string, Type, number, string, string]> = [
    ["performance.pnlOverTime", pa, A, "FAIDA KWA / WAKATI", "FAIDA / KWA WAKATI"],
    ["security.useBackupCode", t2, B1, "TUMIA MSIMBO WA / AKIBA", "TUMIA MSIMBO / WA AKIBA"],
    ["security.useAuthenticator", t2, B2, "TUMIA PROGRAMU YA / UTHIBITISHAJI", "TUMIA PROGRAMU / YA UTHIBITISHAJI"],
  ];
  const got = rows.map(([k, ty, W]) => [show(layout(up(word("sw", k)), ty, W, "greedy").lines), show(layout(kr.keepConnectives(up(word("sw", k))), ty, W, "greedy").lines)]);
  ok(`3.10 · the shrinking rows at sw 320: the performance eyebrow gets ${A.toFixed(1)}px ("FAIDA KWA / WAKATI" before, "FAIDA / KWA WAKATI" after); the 2FA link ${B1.toFixed(1)} and ${B2.toFixed(1)}px ("TUMIA MSIMBO WA / AKIBA" → "TUMIA MSIMBO / WA AKIBA", "TUMIA PROGRAMU YA / UTHIBITISHAJI" → "TUMIA PROGRAMU / YA UTHIBITISHAJI")`,
    rows.every((r, i) => got[i][0] === r[3] && got[i][1] === r[4]), j(got));
}

/* ══ §4 · B4 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · B4 FooterLink holds connectives in the journey's footer; the classic footer keeps its bytes");
{
  const FOOT = "src/components/layout/public-footer.tsx";
  const calls = [...code(FOOT).matchAll(/<FooterLink href="[^"]+"([^>]*)>/g)];
  ok(`4.1 · every FooterLink (${calls.length}) passes keep={journeyShown}, and FooterLink draws each string child through the keep only when kept`,
    calls.length === 12 && calls.every((m) => m[1].includes("keep={journeyShown}")) && has(FOOT, "{keep ? keptLabel(children) : children}")
      && has(FOOT, 'return Children.toArray(children).map((c, i) => (typeof c === "string" ? <Fragment key={`k${i}`}>{keepConnectives(c)}</Fragment> : c));'));
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: (p: Record<string, unknown>) => unknown };
  const props = { proposalsState: "COMING_SOON", agentDoorVisible: true, inviteVisible: true, supportEmail: "desk@example.test", supportPhone: "0700000000", supportPhoneTel: "+255700000000" };
  const journey = renderToStaticMarkup(h(PublicFooter as never, { ...props, journeyShown: true } as never));
  const classic = renderToStaticMarkup(h(PublicFooter as never, props as never));
  const linkSpans = (html: string) => [...html.matchAll(/<a [^>]*min-h-\[44px\] group[^>]*><span class="[^"]*">([\s\S]*?)<\/span><\/a>/g)].map((m) => m[1]);
  const jl = linkSpans(journey), cl = linkSpans(classic);
  ok("4.2 · the journey's footer (sw): \"<span…>Mapendekezo ya Masoko</span>\" (the name whole, round 9's read) + its flag, \"Uthibitisho <span…>wa </span>utatuzi\", \"RTP <span…>ya </span>mchezo <span…>na </span>sheria\", \"Sera <span…>ya </span>faragha\"…",
    jl.some((s) => s.startsWith('<span class="whitespace-nowrap">Mapendekezo ya Masoko</span><')) && jl.includes('Uthibitisho <span class="whitespace-nowrap">wa </span>utatuzi')
      && jl.includes('RTP <span class="whitespace-nowrap">ya </span>mchezo <span class="whitespace-nowrap">na </span>sheria') && jl.includes('Sera <span class="whitespace-nowrap">ya </span>faragha'), j(jl));
  ok("4.3 · the classic footer is frozen chrome: none of its links holds a run, each label is its words as main drew them",
    cl.length >= 10 && cl.every((s) => !s.includes('<span class="whitespace-nowrap">')) && cl.includes("Uthibitisho wa utatuzi") && cl.includes("Notisi ya faragha"), j(cl));
  // The proposals link's lines: Inter 12px and its flag (measured on tile 307: the flag 92px for COMING SOON's 11 letters at
  // 5.78px a letter, so 28.4 + 5.78 n, set 16.5px after the words), in the 160px column at 768, 216 at 1024, 280 at 1280.
  const LINK: Type = { face: interFace, size: 12, ls: 0 };
  const flag = (label: string) => 16.5 + 28.4 + 5.78 * Array.from(label).length;
  const link = (l: Loc, title: string, W: number, kept: boolean, mode: Mode) => {
    const ty: Type = { ...LINK, box: flag(word(l, "proposals.comingSoonTag")) };
    const node = kept ? [kr.keepConnectives(title), BOX] : title + BOX;
    return show(layout(node, ty, W, mode).lines).split(BOX).join("[flag]");
  };
  ok("4.4 CONTROL · drawn as round 8 drew it, the journey's sw link read \"Mapendekezo ya / Masoko[flag]\" at 1024 (tile 299: \"Mapendekezo ya\" x528–624) and 768; en and zh one line at 1024 (tiles 307 315)",
    link("sw", word("sw", "proposals.title"), 216, false, "balance") === "Mapendekezo ya / Masoko[flag]" && link("sw", word("sw", "proposals.title"), 160, false, "balance") === "Mapendekezo ya / Masoko[flag]"
      // Re-pinned 2026-10-14 (S12 WP5, word-ledger row 50): en "Market Proposals" is "Market proposals" (sentence case,
      // as the rows beside it) — re-measured: one line at 1024 still (the lower-case "p" is the narrower glyph).
      && link("en", word("en", "proposals.title"), 216, false, "balance") === "Market proposals[flag]" && link("zh", word("zh", "proposals.title"), 216, false, "balance") === "市场提议[flag]",
    j([link("sw", word("sw", "proposals.title"), 216, false, "balance"), link("en", word("en", "proposals.title"), 216, false, "balance")]));
  // ⛔ ROUND 9'S READ REFUTED THIS MODEL'S BISECTION (reader 8, tile 302, sw 1024): with only "ya" held the browser drew
  // "Mapendekezo" / "ya Masoko [INAKUJA]" — the flag here was modelled at 85.4px (COMING SOON's per-letter rate), the real
  // one is 72px plus its 8.4px gap, and at that width the two-line fill after "Mapendekezo" is the narrower. So the
  // journey's name is ONE unit now (public-footer.tsx): one break candidate, before the flag, whatever the flag measures.
  const whole = (l: Loc, W: number, flagW: number, mode: Mode) =>
    show(layout([h("span", { className: "whitespace-nowrap" }, word(l, "proposals.title")), BOX], { ...LINK, box: flagW }, W, mode).lines).split(BOX).join("[flag]");
  const FLAGS = [60, 70, 80.4, 85.4, 95];
  const okLines = (r: string) => r === "Mapendekezo ya Masoko[flag]" || r === "Mapendekezo ya Masoko / [flag]";
  ok("4.5 · the name held whole: for EVERY flag width from 60 to 95px, at 768 (160px), 1024 (216px) and 1280 (280px), one line where the name and its flag fit, else \"Mapendekezo ya Masoko / [flag]\" — never \"Mapendekezo\" alone, never a line on \"ya\"; with tile 302's flag (80.4px) at 1024 the name over its flag",
    FLAGS.every((f) => [160, 216, 280].every((W) => okLines(whole("sw", W, f, "balance")))) && whole("sw", 216, 80.4, "balance") === "Mapendekezo ya Masoko / [flag]"
      && whole("sw", 280, 80.4, "balance") === "Mapendekezo ya Masoko[flag]",
    j(FLAGS.map((f) => [f, whole("sw", 160, f, "balance"), whole("sw", 216, f, "balance"), whole("sw", 280, f, "balance")])));
  ok("4.5′ · the whole name never overflows a footer column: its widest locale fits the narrowest column (160px at 768)",
    LOCALES.every((l) => width(word(l, "proposals.title"), LINK) <= 160), j(LOCALES.map((l) => [l, Math.round(width(word(l, "proposals.title"), LINK) * 10) / 10])));
  ok("4.5″ CONTROL · drawn with only \"ya\" held and the flag tile 302 measured (80.4px), the balance tears the name — the round-9 read's defect, reproduced",
    link("sw", word("sw", "proposals.title"), 216, true, "balance").startsWith("Mapendekezo / ") || layout([kr.keepConnectives(word("sw", "proposals.title")), BOX], { ...LINK, box: 80.4 }, 216, "balance").lines[0] === "Mapendekezo",
    j(layout([kr.keepConnectives(word("sw", "proposals.title")), BOX], { ...LINK, box: 80.4 }, 216, "balance").lines));
  // Every other link, in both footers: no line on a connective in any column — the phones' single column (288+), 160, 216, 280.
  const JOURNEY = ["footer.setLimits", "footer.resolutionAttestation", "footer.gameRtp", "profile.inviteFriends", "profile.inviteEarn", "agent.dashTitle", "agent.footerLink", "common.help", "common.consentMore", "footer.amlKyc", "footer.terms", "footer.exportClose"];
  const CLASSIC = ["footer.setLimits", "footer.resolutionAttestation", "footer.gameRtp", "profile.inviteFriends", "agent.footerLink", "footer.helpSupport", "footer.privacyNotice", "footer.amlKyc", "footer.terms", "footer.exportClose"];
  const bad: string[] = [];
  for (const l of LOCALES) for (const W of [288, 160, 216, 280]) {
    for (const k of JOURNEY) { const r = layout(kr.keepConnectives(word(l, k)), LINK, W, "greedy").lines; if (endsOnConnective(r)) bad.push(`journey ${l} ${k} @${W}: ${show(r)}`); }
    for (const k of CLASSIC) { const r = layout(word(l, k), LINK, W, "greedy").lines; if (endsOnConnective(r)) bad.push(`classic ${l} ${k} @${W}: ${show(r)}`); }
    const cp = link(l, word(l, "footer.proposeGetPaid"), W, false, "greedy");
    if (endsOnConnective(cp.split(" / "))) bad.push(`classic ${l} proposeGetPaid @${W}: ${cp}`);
  }
  ok("4.6 · no other footer link — the journey's through the keep, the classic one's as drawn, its proposals link with its flag — ends a line on a connective in any column",
    bad.length === 0, bad.slice(0, 4).join(" | "));
}

/* ══ §5 · B5 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · B5 the comments that quoted the Board's old lines say what renders");
{
  const intro = raw("src/components/home/hero-intro.tsx");
  ok("5.1 · hero-intro.tsx: the trust row's comment no longer says it reads \"Leseni ya\" / \"Bodi…\"; it records sw 320, 360–390 (the stub, K34) and 412+",
    !intro.includes('it now reads "Leseni ya" / "Bodi ya Michezo ya Kubahatisha Tanzania."') && intro.includes('sw 360–390: "Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania."')
      && intro.includes('sw 320 (a 288px row, under 321): "Leseni ya Bodi ya Michezo" / "ya Kubahatisha Tanzania."') && intro.includes("sw 412 and wider: one line."));
  const shell = raw("src/components/layout/app-shell.tsx"), off = raw("src/lib/offline-document.ts");
  ok("5.2 · the opt-out shell's footer and the offline document: since round 7 the stub runs from 351 (281 + 70), no record says the name holds from 333 now",
    shell.includes('"Leseni" / "ya Bodi ya Michezo ya Kubahatisha Tanzania." at sw 351–390') && !shell.includes('and "Leseni ya" / "Bodi ya Michezo ya Kubahatisha Tanzania."; a line narrower')
      && off.includes("(sw under 333 then; under 351 since round 7, below)") && off.includes('"Leseni ya Bodi ya Michezo" / "ya Kubahatisha Tanzania." under 351'));
  // 5.3 — B4 asked for the footer's other columns at 1024/1280: the brand column's licence line wraps there in sw (tiles 299
  // at 1024, 301 at 1280), and round 5's F18 record (globals.css) said a footer column holds the Swahili name up from 1200,
  // which round 7's 281 made untrue. The numbers are read from the source — the spacing scale, the board's width, the
  // footer's grid, the sw condition — so the record cannot drift from them unseen.
  const cssRaw = raw("src/app/globals.css"), cssCode = decommentCss(cssRaw);
  const tw = code("tailwind.config.ts");
  const spacingAt = tw.indexOf("spacing: {"), spacing = tw.slice(spacingAt, tw.indexOf("}", spacingAt));
  const pxOf = (re: RegExp, s: string) => Number((s.match(re) ?? [])[1]);
  const s3 = pxOf(/"3":\s*"(\d+)px"/, spacing), s6 = pxOf(/"6":\s*"(\d+)px"/, spacing);
  const board = pxOf(/--w-board:\s*(\d+)px/, cssCode);
  const swNeed = pxOf(/@container kp-gbt \(min-width: (\d+)px\) \{ \.kp-gbt-name:lang\(sw\)/, cssCode);
  const footer = "src/components/layout/public-footer.tsx";
  const gridOk = has(footer, 'className="mx-auto max-w-board px-3 lg:px-6 pt-2 pb-7 grid grid-cols-1 md:grid-cols-4 gap-6 text-[12px]"')
    && !/col-span/.test(code(footer)) && code(footer).includes('${journeyShown ? " kp-gbt" : ""}');
  const col = (W: number) => (Math.min(W, board) - 2 * (W >= 1024 ? s6 : s3) - 3 * s6) / 4;
  const widest = Math.max(...Array.from({ length: 2561 - 768 }, (_, i) => col(768 + i)));
  ok("5.3′ CONTROL · the footer's grid read from the source gives the record's own 160px column at 768 and the tiles' 216px (299, sw 1024) and 280px (301, sw 1280)",
    gridOk && col(768) === 160 && col(1024) === 216 && col(1280) === 280, j({ gridOk, s3, s6, board, c768: col(768), c1024: col(1024), c1280: col(1280) }));
  ok("5.3 · globals.css's F18 record says what renders: from 768 on, no footer column holds the sw name (the widest is 280px, the condition 281); the round-9 note records the lines and the 1px",
    swNeed > 0 && widest < swNeed && !cssRaw.includes("from 768 to 1199") && cssRaw.includes("from 768 on, no footer column holds the Swahili one")
      && cssRaw.includes(`caps them at ${widest}px`) && cssRaw.includes(`and ${swNeed} keeps it out by ${swNeed - widest}px`), j({ widest, swNeed }));
}

/* ══ §6 · THE WORDS ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · no dictionary string changed; no helper inserts or drops a character");
{
  let dictSame = false;
  try { execFileSync("git", ["diff", "--quiet", "HEAD", "--", "src/lib/i18n-dict.ts"]); dictSame = true; } catch { dictSame = false; }
  ok("6.1 · src/lib/i18n-dict.ts is the commit's own (every word above is an existing key)", dictSame);
  const INSERTED = new RegExp(`[${[0xa0, 0x2060, 0x200b, 0xfeff].map((c) => String.fromCharCode(c)).join("")}]`);
  const samples = LOCALES.flatMap((l) => ["journey.ticketsEmptyOpenBody", "activity.emptyBody", "home.heroClaimFirst", "market.mostContested", "proposals.title", "auth.emailSignInHint", "agent.missingTitle"].map((k) => fillSide(l, word(l, k))));
  const changed = samples.filter((s) => [est.emptyStateBody(s), kr.keepText(s), kr.keepConnectives(s), kr.keepConnectivesItem(s)].some((n) => textOf(leaves(n)) !== s || (INSERTED.test(renderToStaticMarkup(h("p", null, n as never))) && !INSERTED.test(s))));
  ok("6.2 · the empty state, keepText, keepConnectives and keepConnectivesItem keep every word: the same text, nothing inserted", changed.length === 0, j(changed));
}

console.log(`${NL}visual-pass-r9b: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
