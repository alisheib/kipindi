/**
 * ROUND 5 OF THE VISUAL PASS, HELPER E (2026-10-09) — text wrapping and the keep-words helpers: review 3's H1–H5 and its
 * doubts, and triage-r5's F1 and F4. Every fix is held beside a control or a planted defect that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r5e.test.mts            (npm run test:visual-pass-r5e)
 *
 * The owner's rule (Ali, 2026-10-09): consistency and perfection in each move — a finding is fixed on every surface that
 * shares its pattern, never only on the tile that showed it.
 *   §1 H1   a title's figure keeps its OWN unit (a closed Chinese list, longest first) and its currency code
 *   §2 F1 F4 + H1's siblings: every market title is balanced and keeps its figures whole, on every surface
 *   §3 F1 F4 the mechanism: Chromium's greedy / pretty / balance, modelled from its source, reproduces the tiles
 *   §4 H2 H3 a name's end is two whole characters (grapheme clusters, as ICU cuts them) and a bounded gap
 *   §5 H2's rule for every keep helper: a kept run holds at most one wide white space
 *   §6 H4   nothing is inserted into the words: the empty state, the dates, the toasts, the stamps, the CJK gap
 *   §7      moneyRuns reads a signed figure whole (review 3's doubt)
 *   §8 H5   keep-units.tsx is gone, and nothing names it as live code
 *   §9      the widest figure run fits the narrowest title line
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createElement as h, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import {
  keepFigures, figureRanges, figureRuns, keepNameEnd, characterSpans, keepLastWords, keepYears, KEPT_GAP, KEPT_SPACE,
} from "../src/components/ui/keep-words.tsx";
import { keepText, keptRanges, digitChoice } from "../src/components/ui/keep-run.tsx";
import { emptyStateBody, emptyStateRanges } from "../src/components/ui/empty-state-text.ts";
import { hangCjkMarks } from "../src/lib/cjk-marks.tsx";
import { moneyRuns } from "../src/lib/fill-nodes.tsx";
import { breakSentence } from "../src/lib/break-end.ts";
import { formatTzs, formatTzsCompact, formatTzsSigned } from "../src/lib/utils.ts";
import { KeepHyphenated } from "../src/app/live/pulse-grid.tsx";

const require = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
// Source and the stylesheet through the shared scanners (scripts/lib/decomment.mts) — never a private stripper.
const code = (p: string) => decomment(read(p));
const CSS = decommentCss(read("src/app/globals.css"));
const show = (x: unknown) => JSON.stringify(x).replace(/[\u00a0\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff]/g, (c) => `\\u${c.codePointAt(0)!.toString(16).padStart(4, "0")}`);
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
/** A node's markup inside a div, the div left out. */
const html = (n: unknown) => renderToStaticMarkup(h("div", null, n as never)).replace(/^<div>|<\/div>$/g, "");
/** The text a copy, a search and a screen reader read (every text node). */
const textOf = (markup: string) => decode(markup.replace(/<[^>]*>/g, ""));
/** The nowrap runs a node draws, in order. */
const runsOf = (n: unknown) => [...html(n).matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>/g)].map((m) => decode(m[1]));
/** The text with each nowrap run in [brackets]. */
const br = (n: unknown) => decode(html(n).replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]"));
/** Every array a helper BUILT (React freezes JSX's static ones) carries unique keys on its elements. */
function keyIssues(node: unknown): number {
  let bad = 0;
  const visit = (n: unknown) => {
    if (Array.isArray(n)) {
      const seen = new Set<string>();
      for (const c of n) {
        if (!Object.isFrozen(n) && isValidElement(c)) { if (c.key == null || seen.has(c.key)) bad++; else seen.add(c.key); }
        visit(c);
      }
    } else if (isValidElement(n)) visit((n.props as { children?: unknown }).children);
  };
  visit(node);
  return bad;
}
/** Every CSS rule, as [selector, body]. */
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]] as const);
const rulesFor = (selector: string) => RULES.filter(([s]) => s.split(",").map((x) => x.trim()).includes(selector)).map(([, b]) => b);
const IDEO = /[㐀-䶿一-鿿豈-﫿]/u;
const SEG = new Intl.Segmenter("en", { granularity: "grapheme" });
function xorshift(seed: number) { return () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6; }; }
const D = DICTS as unknown as Record<"sw" | "en" | "zh", Record<string, Record<string, unknown>>>;
const allStrings = (loc: "sw" | "en" | "zh") => {
  const out: string[] = [];
  const walk = (o: unknown) => { if (typeof o === "string") out.push(o); else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v); };
  walk(D[loc]);
  return out;
};
const YES_NO = { sw: ["NDIO", "HAPANA"], en: ["YES", "NO"], zh: ["是", "否"] } as const;
const filled = (loc: "sw" | "en" | "zh") => allStrings(loc).map((s) => s.replace(/\{yes\}/g, YES_NO[loc][0]).replace(/\{no\}/g, YES_NO[loc][1]));

/** Every title the repo seeds (the in-memory fixtures, the AI examples, the dev seed, R4-H's catalogue), with a digit. */
const SEEDED = (() => {
  const set = new Set<string>();
  for (const f of ["src/lib/server/market-service.ts", "src/lib/server/ai-provider.ts", "src/app/api/dev-test/seed-real-markets/route.ts"]) {
    for (const m of read(f).matchAll(/(?:(?:short)?[tT]itle(?:En|Sw|Zh)|\ben|\bsw|\bzh):\s*"((?:[^"\\\n]|\\.)*)"/g)) if (/\d/.test(m[1])) set.add(m[1]);
  }
  // R4-H's catalogue (visual-pass-r4h §4), its titles only.
  const r4h = read("scripts/visual-pass-r4h.test.mts");
  const cat = r4h.slice(r4h.indexOf("const CATALOGUE = ["), r4h.indexOf("];", r4h.indexOf("const CATALOGUE = [")));
  for (const m of cat.matchAll(/"([^"\n]+)"/g)) if (/\d/.test(m[1])) set.add(m[1]);
  return [...set];
})();

/* ══ §1 · H1 ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · H1 a title's figure keeps its OWN unit — a closed Chinese list, longest first — and its currency code");
{
  // Review 3 (a): the tail took "the next one or two ideographs, whatever they are". The seeded Chinese titles, whole.
  const ZH: Array<[string, string]> = [
    ["超过15万美元？", "超过[15万美元]？"],
    ["比特币8月1日收于10万美元以上", "比特币[8月1日]收于[10万美元]以上"],
    ["Simba SC能否赢得2026年坦桑尼亚超级联赛？", "Simba SC能否赢得[2026年]坦桑尼亚超级联赛？"],
    ["坦桑尼亚2026年第三季度GDP增长能否超过6%？", "坦桑尼亚[2026年]第三季度GDP增长能否超过6%？"],
    ["达累斯萨拉姆2026年7月降雨量能否超过200毫米？", "达累斯萨拉姆[2026年][7月]降雨量能否超过[200毫米]？"],
    ["Diamond Platnumz能否在2026年10月前发行新专辑？", "Diamond Platnumz能否在[2026年][10月]前发行新专辑？"],
    ["比特币价格能否在2026年8月底前超过15万美元？", "比特币价格能否在[2026年][8月底]前超过[15万美元]？"],
    ["SGR多多马-辛吉达段能否在2026年12月前投入运营？", "SGR多多马-辛吉达段能否在[2026年][12月]前投入运营？"],
    ["达累斯萨拉姆七月降雨超过200毫米", "达累斯萨拉姆七月降雨超过[200毫米]"],
    ["辛巴俱乐部赢得2026-27赛季NBC超级联赛", "辛巴俱乐部赢得[2026-27赛季]NBC超级联赛"],
    ["美元兑坦桑尼亚先令二季度末收于2,650以下", "美元兑坦桑尼亚先令二季度末收于2,650以下"],
  ];
  const wrongZh = ZH.filter(([t, want]) => br(keepFigures(t)) !== want).map(([t]) => `${t} → ${br(keepFigures(t))}`);
  ok("1.1 · the run ends at the unit: \"[15万美元]？\" (美元 whole), \"[2026年]坦桑尼亚\" (年|坦 free), \"[7月]降雨量\", \"[10月]前\", \"[8月1日]收于\", and \"2,650以下\" plain (以下 is no unit)",
    wrongZh.length === 0, wrongZh.join(" | "));
  // The old rule in miniature: any one or two ideographs after a number.
  ok("1.1′ CONTROL · the round-4 tail (\"one or two ideographs, whatever they are\") takes 雨量's 降 and 美元's 美",
    /\d+\s?[㐀-鿿]{1,2}/u.exec("7月降雨量")?.[0] === "7月降" && /\d+(?:[.,]\d+)*\s?[㐀-鿿]{1,2}/u.exec("超过15万美元？")?.[0] === "15万美");
  // Review 3 (b): the currency code was left out whenever a unit followed.
  const HEAD: Array<[string, string]> = [
    ["Simba watapata TZS 1 bilioni?", "Simba watapata [TZS 1 bilioni]?"],
    ["TZS 4,200以上", "[TZS 4,200]以上"],
    ["奖金会超过TZS 1,000,000吗？", "奖金会超过[TZS 1,000,000]吗？"],
    ["Bei ya TZS 4,200", "Bei ya [TZS 4,200]"],
    ["Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti", "Bitcoin yafunga juu ya $100,000 tarehe [1 Agosti]"],
  ];
  const wrongHead = HEAD.filter(([t, want]) => br(keepFigures(t)) !== want).map(([t]) => `${t} → ${br(keepFigures(t))}`);
  ok("1.2 · a currency code is part of its figure, unit or not (\"[TZS 1 bilioni]\", \"[TZS 4,200]以上\"); any other word before stays out when a unit follows (\"tarehe [1 Agosti]\")",
    wrongHead.length === 0, wrongHead.join(" | "));
  // The doubts: a capitalised unit word opens a sentence; a Swahili noun AFTER the number is the next phrase.
  const CAP: Array<[string, string]> = [
    ["Dakika 90 za mwisho?", "[Dakika 90] za mwisho?"], ["Saa 3 usiku?", "[Saa 3] usiku?"],
    ["Will Ethereum hit a new 30-Day high?", "Will Ethereum hit a new [30-Day] high?"], ["Je, atavunja dakika 28:00 kwenye 10K?", "Je, atavunja [dakika 28:00] kwenye 10K?"],
  ];
  const wrongCap = CAP.filter(([t, want]) => br(keepFigures(t)) !== want).map(([t]) => `${t} → ${br(keepFigures(t))}`);
  ok("1.3 · a unit word that opens a sentence keeps its number (\"[Dakika 90]\", \"[Saa 3]\", \"[30-Day]\"), as its lower-case twin does",
    wrongCap.length === 0, wrongCap.join(" | "));
  ok("1.3′ CONTROL (decided) · \"28:00 dakika\" stays plain: Swahili names the unit first, and a noun after a number opens the next phrase (\"mabao 2 siku ya mwisho\")",
    keepFigures("Atavunja 28:00 dakika?") === "Atavunja 28:00 dakika?" && keepFigures("mabao 2 siku ya mwisho") === "mabao 2 siku ya mwisho");
  const MONTHS_CASES: Array<[string, string]> = [
    ["Will the SGR Dodoma-Singida section begin operations before December 2026?", "Will the SGR Dodoma-Singida section begin operations before December 2026?"],
    ["Je, sehemu ya SGR Dodoma-Singida itaanza huduma kabla ya Desemba 2026?", "Je, sehemu ya SGR Dodoma-Singida itaanza huduma kabla ya Desemba 2026?"],
    ["Will the long rains begin in Dar es Salaam before April 15?", "Will the long rains begin in Dar es Salaam before [April 15]?"],
    ["Je, masika yataisha kabla ya Mei 31 Dar es Salaam?", "Je, masika yataisha kabla ya [Mei 31] Dar es Salaam?"], ["msimu wa Agosti 2026-27", "msimu wa Agosti [2026-27]"],
  ];
  const wrongMonth = MONTHS_CASES.filter(([t, want]) => br(keepFigures(t)) !== want).map(([t]) => `${t} → ${br(keepFigures(t))}`);
  ok("1.3″ · a month keeps its DAY (\"[April 15]\", \"[Mei 31]\") and never a year: \"December 2026\" is no run (225px at the market h1's 28px, wider than its 220px line at 320 — §9)",
    wrongMonth.length === 0, wrongMonth.join(" | "));

  // The reviewer's prototype (review/fix.ts), verbatim lists, against the worktree over the reviewer's own corpus.
  const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Machi|Aprili|Mei|Juni|Julai|Agosti|Septemba|Oktoba|Novemba|Desemba";
  const RZH = "万美元|亿美元|万先令|亿先令|美元|先令|欧元|英镑|毫米|厘米|公里|千米|公斤|千克|毫升|分钟|小时|赛季|季度|百分点|摄氏度|个月|年底|年初|月底|月初|月中|[年月日号时分秒天周岁米克吨升元万亿场球届次名个度轮局倍]";
  const RFIG = new RegExp(`(?:\\b(dakika|saa|sekunde|siku|wiki|mwezi|miezi|mwaka|miaka|nyuzi|asilimia|tarehe|milioni|bilioni|TZS|USD|KES|${MONTHS})(\\s+))?([$€£]?\\d+(?:[.,:]\\d+)*(?:[-–/]\\d+(?:[.,:]\\d+)*)*%?)`
    + `(?:(\\s?(?:${RZH}))|(-[a-z]+)\\b|(\\s+)(minutes?|hours?|seconds?|days?|weeks?|months?|years?|degrees?|percent|million|billion|milioni|bilioni|${MONTHS})\\b)?`, "g");
  const reviewer = (t: string): string[] => {
    const out: string[] = [];
    for (const m of t.matchAll(RFIG)) {
      const [, before, gap, num, ideo, hyph, space, after] = m;
      const tail = ideo ?? hyph ?? (after !== undefined ? space + after : "");
      const head = before !== undefined && (tail === "" || /^(?:TZS|USD|KES)$/.test(before)) ? before + gap : "";
      const run = head + num + tail;
      if (/[\s\-–/㐀-䶿一-鿿豈-﫿]/u.test(run)) out.push(run);
    }
    return out;
  };
  const r = xorshift(5);
  const P = ["TZS ", "USD ", "dakika ", "1", "200", "2026-27", "28:00", "万美元", "美元", "年", "月底", "坦桑尼亚", "以上", " ", "超过", "bilioni", " minutes", "-day", "%", "，", "Agosti ", "\u00a0", "Simba", "?"];
  let textBad = 0, keysBad = 0, unexplained = 0, wideGap = 0, monthYear = 0;
  const odd: string[] = [];
  // A prototype run that pairs a month with a number that is no day (1–31): the rule 1.3″ no longer keeps.
  const MONTH_WORD = new RegExp(`(?:^|\\s)(?:${MONTHS})(?:\\s|$)`);
  const MONTH_DAY = new RegExp(`^(?:(?:${MONTHS})\\s+(?:0?[1-9]|[12]\\d|3[01])|(?:0?[1-9]|[12]\\d|3[01])\\s+(?:${MONTHS}))$`);
  const pairsAMonthWithANonDay = (s: string) => reviewer(s).some((run) => MONTH_WORD.test(` ${run} `) && !MONTH_DAY.test(run));
  for (let i = 0; i < 20000; i++) {
    let s = ""; const k = Math.floor(r() * 12);
    for (let j = 0; j < k; j++) s += P[Math.floor(r() * P.length)];
    const node = keepFigures(s);
    if (textOf(html(node)) !== s) textBad++;
    keysBad += keyIssues(node);
    if (show(runsOf(node)) !== show(reviewer(s))) {
      // The intended differences on this corpus: a gap of two or more wide spaces is no longer held (§5), and a month
      // holds a day, never another number (1.3″).
      if (/[^\S\t\n\f\r ][\t\n\f\r ]*[^\S\t\n\f\r ]/u.test(s)) wideGap++;
      else if (pairsAMonthWithANonDay(s)) monthYear++;
      else { unexplained++; if (odd.length < 3) odd.push(`${show(s)}: ${show(runsOf(node))} vs ${show(reviewer(s))}`); }
    }
  }
  ok(`1.4 · over the reviewer's own corpus (review/fix.ts, seed 5, 20,000 titles) the words are unchanged, the keys unique, and the runs are the reviewer's prototype's — but where a gap holds two or more wide spaces (${wideGap}, §5) or a month stands by a number that is no day (${monthYear}, 1.3″)`,
    textBad === 0 && keysBad === 0 && unexplained === 0, `text ${textBad} keys ${keysBad} unexplained ${unexplained}: ${odd.join(" | ")}`);
  const seededBad = SEEDED.filter((t) => textOf(html(keepFigures(t))) !== t || keyIssues(keepFigures(t)) > 0);
  ok(`1.5 · every seeded title (${SEEDED.length}) keeps its words, character for character, with unique keys`, SEEDED.length > 60 && seededBad.length === 0, show(seededBad));
  // The shared helper behind the bet dialog's title (§2): the same runs as the cards.
  ok("1.6 · `figureRuns` is `keepFigures`' runs, as words (what `keepText` takes), and `figureRanges` their places",
    SEEDED.every((t) => show(figureRuns(t)) === show(runsOf(keepFigures(t))) && figureRanges(t).every(([a, b], i) => t.slice(a, b) === figureRuns(t)[i])));
  const LOOKBEHIND = /\(\?<[=!]/;
  const helpers = ["src/components/ui/keep-words.tsx", "src/components/ui/keep-run.tsx", "src/components/ui/empty-state-text.ts", "src/lib/cjk-marks.tsx", "src/lib/fill-nodes.tsx"];
  ok("1.7 · no lookbehind in any keep helper (a client bundle holding one fails to parse on Safari before 16.4)",
    helpers.every((f) => !LOOKBEHIND.test(code(f))), helpers.filter((f) => LOOKBEHIND.test(code(f))).join(", "));
  ok("1.7′ PLANT · a lookbehind in the figure pattern is reported", LOOKBEHIND.test(code(helpers[0]).replace("(?:\\\\b(${UNIT_BEFORE})", "(?<=\\\\s)(?:(${UNIT_BEFORE})")));
}

/* ══ §2 · EVERY MARKET TITLE ═════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · F1 F4 + H1's siblings: every market title is balanced and keeps its figures whole, on every surface");
{
  type Surface = { name: string; file: string; draws: string[]; balanced: (src: string) => boolean };
  const cls = (src: string, needle: string) => src.includes(needle);
  const SURFACES: Surface[] = [
    { name: "the grid and featured cards", file: "src/components/markets/market-card.tsx",
      draws: [`{featured ? <h2 className="mcardp-q">{keepFigures(title)}</h2> : <h3 className="mcardp-q">{keepFigures(title)}</h3>}`],
      balanced: () => rulesFor(".mcardp-q").some((b) => /text-wrap:\s*balance/.test(b)) && rulesFor(".mcardp--featured .mcardp-q").every((b) => !/text-wrap/.test(b)) },
    { name: "the landing board's rows", file: "src/components/home/landing-hero.tsx", draws: [`<span className="kp-qrow__q">{keepFigures(title)}</span>`],
      balanced: () => rulesFor(".kp-qrow__q").some((b) => /text-wrap:\s*balance/.test(b)) },
    { name: "the market page's h1", file: "src/app/markets/[id]/page.tsx", draws: [`{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}</h1>`],
      balanced: (s) => /<h1 data-stem=[\s\S]{0,200}?className="[^"]*\btext-balance\b[^"]*"\s*>(?:\{\})?\{keepFigures\(pickLocalized/.test(s) },
    { name: "the journey's ticket card", file: "src/components/journey/tickets/ticket-card.tsx", draws: [`{keepFigures(title.text)}</Link>`],
      balanced: (s) => cls(s, `<h2 className="mt-3 font-display text-body-lg font-semibold leading-tight text-text text-balance">`) },
    { name: "/live's featured carousel", file: "src/app/live/featured-contest.tsx", draws: [`{keepFigures(mm.title)}`],
      balanced: (s) => cls(s, `className="font-display text-[19px] lg:text-[24px] font-semibold leading-tight text-text text-balance group-hover:text-aqua-100"`) },
    { name: "/live's wall", file: "src/app/live/pulse-grid.tsx", draws: [`<Fragment key={i}>{keepFigures(part)}</Fragment>`, `<KeepHyphenated text={title} />`],
      balanced: (s) => /font-display text-\[13\.5px\] font-semibold leading-snug text-text text-balance/.test(s) },
    { name: "/results' notable result", file: "src/app/results/page.tsx", draws: [`{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}`],
      // The hover ink is R5-C's (the second gold audit moved it gold-100 → brand-200 on this title; merged 2026-10-09).
      balanced: (s) => cls(s, `font-semibold leading-tight text-text text-balance group-hover:text-brand-200">`) },
    { name: "the proposals board", file: "src/app/proposals/page.tsx", draws: [`text-balance">{keepFigures(pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh))}</p>`],
      balanced: (s) => cls(s, `tracking-[-0.01em] text-text text-balance">{keepFigures(`) },
    { name: "a proposal's page", file: "src/app/proposals/[id]/page.tsx", draws: [`text-balance">{keepFigures(pickLocalized(locale, p.titleEn, p.titleSw, p.titleZh))}</h1>`],
      balanced: (s) => cls(s, `tracking-[-0.02em] text-balance">{keepFigures(`) },
    { name: "the classic ticket (PositionCard)", file: "src/components/markets/position-card.tsx", draws: [`{keepFigures(marketTitle)}`],
      balanced: (s) => cls(s, `tracking-[-0.005em] text-text line-clamp-2 text-balance">`) },
    { name: "/fairness' resolved table", file: "src/app/fairness/page.tsx", draws: [`{keepFigures(titleOf(m))}</Link>`],
      balanced: (s) => cls(s, `line-clamp-2 text-balance">{keepFigures(titleOf(m))}</Link>`) },
    { name: "the bet dialog's title", file: "src/components/markets/bet-confirm-modal.tsx", draws: [`{keepText(marketTitle, figureRuns(marketTitle))}`],
      balanced: (s) => cls(s, `<p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug text-balance">`) },
  ];
  const surfaceFault = (s: Surface, src: string) => [
    !s.draws.every((d) => src.includes(d)) && "does not draw the title through keepFigures",
    !s.balanced(src) && "is not balanced",
    /\btext-pretty\b/.test(src.slice(Math.max(0, src.indexOf(s.draws[0]) - 400), src.indexOf(s.draws[0]))) && "wears text-pretty",
  ].filter(Boolean) as string[];
  const faults = SURFACES.map((s) => [s.name, surfaceFault(s, code(s.file))] as const).filter(([, f]) => f.length);
  ok(`2.1 · ${SURFACES.length} title surfaces draw the title through keepFigures and balance its lines — the seven of round 4 and /results' notable card, the proposals board and page, the classic ticket, /fairness, the bet dialog`,
    faults.length === 0, faults.map(([n, f]) => `${n}: ${f.join(", ")}`).join(" | "));
  // ⛔ No market title is set `pretty`: Chromium's orphan rule pulls ONE character down in Chinese (F1).
  const PRETTY_ON_TITLE = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((m) => /mcardp-q|kp-qrow__q/.test(m[1]) && /text-wrap(?:-style)?:\s*pretty/.test(m[2]));
  ok("2.2 · no rule sets a market title `text-wrap: pretty` (the featured card wore it — F1's mechanism, §3)", !PRETTY_ON_TITLE(CSS));
  ok("2.2′ PLANT · the featured question back on `pretty` is reported",
    PRETTY_ON_TITLE(CSS.replace(".mcardp--featured .mcardp-q { -webkit-line-clamp: 3;", ".mcardp--featured .mcardp-q { text-wrap: pretty; -webkit-line-clamp: 3;")));
  ok("2.2″ PLANT · a surface that loses its balance or its keepFigures is reported",
    surfaceFault(SURFACES[4], code(SURFACES[4].file).replace("text-text text-balance group-hover:text-aqua-100", "text-text group-hover:text-aqua-100")).length > 0
      && surfaceFault(SURFACES[6], code(SURFACES[6].file).replace("{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}", "{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}")).length > 0);
  // The bet dialog draws its title with keepText (its last two words, R4-I) AND the cards' figure runs.
  const dialog = keptRanges("Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?", figureRuns("Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?"))
    .map(([a, b]) => "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?".slice(a, b));
  ok("2.3 · the bet dialog's title keeps \"dakika 28:00\" whole as the cards do, and its last two words as R4-I did", show(dialog) === show(["dakika 28:00", "Athletics ijayo?"]), show(dialog));
  // /live's wall: KeepHyphenated hands every non-hyphen part to keepFigures.
  ok("2.4 · /live's wall keeps the same runs: \"[2026-27赛季]\", \"[dakika 28:00]\"",
    br(h(KeepHyphenated, { text: "辛巴俱乐部赢得2026-27赛季NBC超级联赛" })) === "辛巴俱乐部赢得[2026-27赛季]NBC超级联赛"
      && br(h(KeepHyphenated, { text: "Je, atavunja dakika 28:00?" })) === "Je, atavunja [dakika 28:00]?");
  // Every player file that names a market (or proposal) title is either a surface above, hands it to one, or is not a
  // place a title wraps — classified here, so a new surface cannot appear without being set the same way.
  const ROLE: Record<string, string> = {
    "src/app/fairness/page.tsx": "surface", "src/app/live/pulse-grid.tsx": "surface", "src/app/markets/[id]/page.tsx": "surface",
    "src/app/proposals/[id]/page.tsx": "surface", "src/app/proposals/page.tsx": "surface", "src/app/results/page.tsx": "surface",
    "src/components/home/landing-hero.tsx": "surface", "src/components/markets/bet-confirm-modal.tsx": "surface",
    "src/components/markets/market-card.tsx": "surface", "src/components/markets/position-card.tsx": "surface",
    "src/app/live/page.tsx": "hands it to featured-contest.tsx and pulse-grid.tsx", "src/app/markets/page.tsx": "hands it to MarketCard",
    "src/app/page.tsx": "hands it to the landing hero", "src/app/positions/page.tsx": "hands it to PositionCard and the tickets view",
    "src/app/watchlist/page.tsx": "hands it to MarketCard", "src/components/markets/side-picker.tsx": "hands it to the dial and the notify prompt",
    "src/app/markets/actions.ts": "a server action: no drawing",
    "src/app/notifications/page.tsx": "a notice's own title, not a market's", "src/components/layout/notifications-panel.tsx": "a notice's own title, not a market's",
    "src/app/proposals/new/create-form.tsx": "an input", "src/components/markets/notify-prompt.tsx": "a system notification's body",
    "src/components/markets/position-share.tsx": "the words a share sends", "src/components/home/trust-band.tsx": "one line, ellipsised — it never wraps",
    "src/app/positions/performance/page.tsx": "a reference in body text — its figures whole (keepFigures), not a title to balance",
    "src/components/markets/conviction-dial.tsx": "the bet result's subtitle, body text — its figures whole (keepFigures), not a title to balance",
  };
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const n of readdirSync(dir)) {
      const p = `${dir}/${n}`;
      if (statSync(p).isDirectory()) { if (!/^src\/(?:app\/admin|components\/admin|app\/api)$/.test(p)) walk(p, out); }
      else if (/\.tsx?$/.test(n)) out.push(p);
    }
    return out;
  };
  const population = [...walk("src/app"), ...walk("src/components")].filter((f) => /titleZh|marketTitle/.test(code(f)));
  const unclassified = population.filter((f) => !(f in ROLE));
  ok(`2.5 · every player file that names a market title (${population.length}) is classified — a surface held by 2.1, one that hands it on, or not a wrapping title`,
    unclassified.length === 0 && population.length >= 20, unclassified.join(", "));
  const refs = ["src/app/positions/performance/page.tsx", "src/components/markets/conviction-dial.tsx"];
  ok("2.6 · the two references in body text keep the figures whole too (the best market's line, the bet result's subtitle)",
    code(refs[0]).includes("{keepFigures(bestTitle)}") && code(refs[1]).includes("? (marketTitle != null ? keepFigures(marketTitle) : t.common.positionOpenNotify)"));
}

/* ══ §3 · F1 F4 — THE MECHANISM ══════════════════════════════════════════════════════════════════════════════════════ */
section("3 · F1 F4 Chromium's greedy / pretty / balance, modelled from its source, reproduce the tiles and give the after");
/*
 * The model (third_party/blink/renderer/core/layout/inline/score_line_breaker.cc, read 2026-10-09):
 *   · `pretty` acts only when the greedy LAST line is under a third of the line (kShortLineDenominator = 3) and has no
 *     break opportunity inside it (`ShouldOptimize`); it needs ≥ 3 candidates (kMinCandidates), sets kOrphansPenalty =
 *     10000 on the last one, scores each line delta² plus a line penalty, the last line by its start's penalty only;
 *   · `balance` scores every line, the last too (`is_balanced_`), over at most 6 lines;
 *   · neither is suspended by `-webkit-line-clamp` in shipping Chrome (only behind CSSLineClampLineBreakingEllipsis).
 * Sora's advances are next/font's own Sora (latin, variable; sha256 3902474d…, the dev build's
 * 6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2), hmtx + HVAR at 600 and 700, in 1/1000 em, for U+0020–U+007E; an ideograph
 * is 1em. The model reproduced tiles 029, 023 and 026 to within 2px (below).
 */
const SORA: Record<600 | 700, number[]> = {
  600: "216,310,473,712,651,877,717,266,387,387,569,594,269,507,269,386,756,425,627,626,662,637,678,596,657,678,269,269,594,590,594,559,1126,773,688,799,785,596,560,832,801,326,642,728,553,954,867,865,658,865,720,674,610,780,729,1062,713,655,650,387,386,387,602,585,300,588,699,610,699,620,381,683,648,325,332,617,305,978,648,679,699,699,417,549,431,639,584,897,587,562,497,387,375,387,527".split(",").map(Number),
  700: "210,317,495,722,651,891,731,268,393,393,570,596,273,509,273,407,763,428,632,632,672,644,687,607,667,687,273,273,596,590,596,563,1127,782,692,800,781,594,560,833,800,332,643,752,558,971,876,864,667,864,730,667,618,776,740,1071,722,657,647,393,407,393,617,590,300,594,703,611,703,624,382,686,652,334,339,639,315,983,652,681,703,703,421,556,434,645,597,922,601,570,502,393,376,393,543".split(",").map(Number),
};
type Box = { size: number; wght: 600 | 700; ls: number };
const WIDE = /[㐀-䶿一-鿿豈-﫿\u3000-\u303f\uff00-\uffef]/u;
const adv = (s: string, b: Box) => Array.from(s).reduce((w, c) => {
  const cp = c.codePointAt(0)!;
  return w + (WIDE.test(c) ? 1 : cp >= 0x20 && cp <= 0x7e ? SORA[b.wght][cp - 0x20] / 1000 : 0.6) * b.size + b.ls * b.size;
}, 0);
/** A piece never breaks inside; `space` is the collapsible space after it (it hangs at a line end); `brk` says whether a
 *  line may end after it; `at` is where its text starts in the title, in code points. */
type Piece = { text: string; w: number; space: number; brk: boolean; at: number };
const NO_BREAK_BEFORE = /[，。、；：！？）」』】〉》”’,.!?;:)\]}%]/u;
const NO_BREAK_AFTER = /[（「『【〈《“‘(\[{$€£]/u;
/** Pieces of a drawn title: each nowrap run whole, the rest split where UAX #14 lets a line end in it. */
function pieces(markup: string, b: Box): Piece[] {
  const chars: Array<{ c: string; id: number }> = [];
  let k = 0;
  for (const m of markup.matchAll(/<span class="whitespace-nowrap">([^<]*)<\/span>|([^<]+)/g)) {
    const id = m[1] !== undefined ? k++ : -1;
    for (const c of Array.from(decode(m[1] ?? m[2]))) chars.push({ c, id });
  }
  const canBreak = (i: number) => {
    const a = chars[i - 1], z = chars[i];
    if (a.id >= 0 && a.id === z.id) return false;
    if (z.c === " ") return false;
    if (a.c === " ") return !NO_BREAK_BEFORE.test(z.c);
    if (NO_BREAK_BEFORE.test(z.c) || NO_BREAK_AFTER.test(a.c)) return false;
    if (WIDE.test(a.c) || WIDE.test(z.c)) return true;
    return a.c === "-" && /\p{L}/u.test(z.c);
  };
  const out: Piece[] = [];
  let cur = { text: "", spaces: 0, at: 0 };
  const close = (brk: boolean) => {
    if (cur.text === "" && out.length) { out[out.length - 1].space += cur.spaces * adv(" ", b); out[out.length - 1].brk = brk; }
    else if (cur.text !== "") out.push({ text: cur.text, w: adv(cur.text, b), space: cur.spaces * adv(" ", b), brk, at: cur.at });
    cur = { text: "", spaces: 0, at: 0 };
  };
  chars.forEach((ch, i) => {
    if (i > 0 && canBreak(i)) close(true);
    if (ch.c === " " && !(ch.id >= 0 && chars[i + 1]?.id === ch.id)) cur.spaces++;
    else { if (cur.text === "") cur.at = i; cur.text += ch.c; }
  });
  close(false);
  if (out.length) out[out.length - 1].brk = false;
  return out;
}
const lineW = (ps: Piece[], i: number, j: number) => { let w = 0; for (let k = i; k < j; k++) w += ps[k].w + ps[k].space; return w + ps[j].w; };
function greedy(ps: Piece[], W: number): number[] {
  const ends: number[] = [];
  let start = 0, last = -1;
  for (let j = 0; j < ps.length; j++) {
    if (j > start && lineW(ps, start, j) > W + 1e-6 && last >= start) { ends.push(last); start = last + 1; last = -1; j = start - 1; continue; }
    if (ps[j].brk) last = j;
  }
  ends.push(ps.length - 1);
  return ends;
}
function scored(ps: Piece[], W: number, b: Box, balanced: boolean): number[] | null {
  const cands = ps.map((p, i) => (p.brk ? i : -1)).filter((i) => i >= 0);
  if (cands.length < 3) return null;
  const pen = new Map<number, number>(cands.map((c) => [c, 0]));
  pen.set(cands[cands.length - 1], 10000);
  const linePenalty = 4 * W * b.size;
  const best = new Map<number, { s: number; prev: number }>([[-1, { s: 0, prev: NaN }]]);
  for (const e of [...cands, ps.length - 1]) {
    const isLast = e === ps.length - 1;
    let here: { s: number; prev: number } | null = null;
    for (const [sIdx, sv] of best) {
      if (sIdx >= e) continue;
      const delta = W - lineW(ps, sIdx + 1, e);
      const startPen = sIdx === -1 ? 0 : pen.get(sIdx) ?? 0;
      const width = delta < 0 ? 1e12 : isLast && !balanced ? 4 * startPen : delta * delta;
      const s = sv.s + width + (isLast ? 0 : pen.get(e) ?? 0) + linePenalty;
      if (!here || s < here.s) here = { s, prev: sIdx };
    }
    if (here) best.set(e, here);
  }
  const out: number[] = [];
  for (let e = ps.length - 1; e !== -1; e = best.get(e)!.prev) out.unshift(e);
  return out;
}
function pretty(ps: Piece[], W: number, b: Box): number[] {
  const g = greedy(ps, W);
  if (g.length <= 1 || g.length > 4) return g;
  const start = g[g.length - 2] + 1;
  const inside = ps.slice(start, ps.length - 1).some((p) => p.brk);
  return lineW(ps, start, ps.length - 1) < W / 3 && !inside ? scored(ps, W, b, false) ?? g : g;
}
const balance = (ps: Piece[], W: number, b: Box) => { const g = greedy(ps, W); return g.length <= 1 || g.length > 6 ? g : scored(ps, W, b, true) ?? g; };
const lines = (ps: Piece[], ends: number[]) => {
  const out: Array<{ text: string; w: number }> = [];
  let s = 0;
  for (const e of ends) { out.push({ text: ps.slice(s, e + 1).map((p, k) => p.text + (k < e - s && p.space > 0 ? " " : "")).join(""), w: lineW(ps, s, e) }); s = e + 1; }
  return out;
};
/** The featured card's question column: the card (viewport - 32, the hero's 456px from 1024) - 2 border - 30 padding -
 *  14 gap - the 22px mono dash (0.6em - 0.02em tracking); its type 15px/600 below 640, h4 (17px) 700, h3 (20px) from 1024. */
const FEAT_COL = (vw: number) => (vw >= 1024 ? 456 : vw - 32) - 2 - 30 - 14 - 22 * (0.6 - 0.02);
const FEAT_BOX = (vw: number): Box => (vw >= 1024 ? { size: 20, wght: 700, ls: -0.015 } : vw >= 640 ? { size: 17, wght: 700, ls: -0.015 } : { size: 15, wght: 600, ls: -0.015 });
const feat = (t: string, vw: number, mode: "greedy" | "pretty" | "balance") => {
  const b = FEAT_BOX(vw), W = FEAT_COL(vw), ps = pieces(html(keepFigures(t)), b);
  return lines(ps, mode === "greedy" ? greedy(ps, W) : mode === "pretty" ? pretty(ps, W, b) : balance(ps, W, b));
};
{
  const ZH = "达累斯萨拉姆七月降雨超过200毫米", EN = "Dar es Salaam rainfall exceeds 200mm in July", SW = "Mvua Dar es Salaam yazidi 200mm Julai";
  ok("3.locate · the stylesheet the model reads: the card's question 15px/600 with \u22120.015em, h4 700 from 640, h3 from 1024",
    rulesFor(".mcardp-q").some((x) => /font-weight:\s*600/.test(x) && /font-size:\s*15px/.test(x) && /letter-spacing:\s*-0\.015em/.test(x))
      && /font-size: var\(--type-h4\); font-weight: 700;/.test(CSS) && /\.mcardp--featured \.mcardp-q \{ font-size: var\(--type-h3\);/.test(CSS));
  // CONTROL — the tiles as they were drawn (ink measured with System.Drawing: 029 x32–194 / 32–107; 023 33–318 / 32–80; 026 553–936 / 552–617).
  const z = feat(ZH, 320, "pretty"), e = feat(EN, 390, "pretty"), e2 = feat(EN, 1024, "pretty");
  const near = (got: number, ink: number) => Math.abs(got - ink) <= 2.5;
  ok("3.1 CONTROL · `pretty` draws tile 029 (zh 320): \"达累斯萨拉姆七月降雨超\" / \"过200毫米\" — 162.5 / 75.7px against ink 163 / 76 — because the greedy last line was the one unbreakable run \"200毫米\", 61px of 229 (under a third)",
    show(z.map((l) => l.text)) === show(["达累斯萨拉姆七月降雨超", "过200毫米"]) && near(z[0].w, 163) && near(z[1].w, 76)
      && feat(ZH, 320, "greedy")[1].text === "200毫米" && feat(ZH, 320, "greedy")[1].w < FEAT_COL(320) / 3, show(z));
  ok("3.2 CONTROL · and is plain greedy in English (tile 023, 390: 287.6 / 48.5 against ink 286 / 49; tile 026, 1024: 386.0 / 65.2 against 384 / 66) — \"in July\" has a break inside, so the orphan rule never acts",
    show(e.map((l) => l.text)) === show(["Dar es Salaam rainfall exceeds 200mm", "in July"]) && near(e[0].w, 286) && near(e[1].w, 49)
      && show(e2.map((l) => l.text)) === show(e.map((l) => l.text)) && near(e2[0].w, 384) && near(e2[1].w, 66), show([e, e2]));
  // AFTER — balance.
  const want: Array<[string, number, string[]]> = [
    [ZH, 320, ["达累斯萨拉姆七月", "降雨超过200毫米"]], [ZH, 360, [ZH]], [ZH, 390, [ZH]],
    [EN, 390, ["Dar es Salaam rainfall", "exceeds 200mm in July"]], [EN, 1024, ["Dar es Salaam rainfall", "exceeds 200mm in July"]],
    [SW, 320, ["Mvua Dar es Salaam", "yazidi 200mm Julai"]], [SW, 360, ["Mvua Dar es Salaam", "yazidi 200mm Julai"]], [SW, 390, [SW]],
  ];
  const wrongAfter = want.filter(([t, vw, w]) => show(feat(t, vw, "balance").map((l) => l.text)) !== show(w)).map(([t, vw]) => `${vw} ${show(feat(t, vw, "balance"))}`);
  ok("3.3 · balanced, the featured question reads \"达累斯萨拉姆七月 / 降雨超过200毫米\" at 320 (one line at 360 and 390), \"Dar es Salaam rainfall / exceeds 200mm in July\" at 390 and 1024, \"Mvua Dar es Salaam / yazidi 200mm Julai\" at 320 and 360",
    wrongAfter.length === 0, wrongAfter.join(" | "));
  // Every width 320–1023: balance never cuts 超过 and never leaves a short last line; pretty and greedy do.
  const split: Record<string, number[]> = { pretty: [], balance: [] }, short: Record<string, number[]> = { greedy: [], balance: [] };
  for (let vw = 320; vw < 1024; vw++) {
    for (const m of ["pretty", "balance"] as const) if (feat(ZH, vw, m).some((l, i, a) => i < a.length - 1 && l.text.endsWith("超"))) split[m].push(vw);
    for (const t of [EN, SW, ZH]) for (const m of ["greedy", "balance"] as const) {
      const ls = feat(t, vw, m);
      if (ls.length > 1 && ls[ls.length - 1].w < FEAT_COL(vw) / 3) short[m].push(vw);
    }
  }
  ok("3.4 · at every width from 320 to 1023 the balanced question never cuts 超过 and never ends on a line under a third wide (en, sw, zh)",
    split.balance.length === 0 && short.balance.length === 0, show({ split: split.balance, short: short.balance }));
  ok(`3.4′ CONTROL · pretty cuts 超过 at ${split.pretty.length} widths (${split.pretty[0]}–${split.pretty[split.pretty.length - 1]}), and greedy leaves a short last line at ${new Set(short.greedy).size} widths`,
    split.pretty.length > 0 && split.pretty[0] === 320 && short.greedy.length > 0);
  // The Chinese titles on four surfaces at the phone widths: where does each mode cut a word? (ICU's dictionary
  // segmentation, an analysis aid only.) Balance must cut no more words than greedy on any surface, and none on the cards.
  const words = new Intl.Segmenter("zh", { granularity: "word" });
  const inside = (t: string) => { const s = new Set<number>(); for (const w of words.segment(t)) { const n = Array.from(w.segment).length; if (n > 1 && w.isWordLike) { const at = Array.from(t.slice(0, w.index)).length; for (let k = 1; k < n; k++) s.add(at + k); } } return s; };
  const ZH_TITLES = SEEDED.filter((t) => IDEO.test(t));
  const SURF: Array<[string, Box, (vw: number) => number]> = [
    // The grid card's column is R4-H's (visual-pass-r4h §5): the card less its border and padding, the 28px mono "—" price column and 14px.
    ["featured", { size: 15, wght: 600, ls: -0.015 }, FEAT_COL], ["board row", { size: 17, wght: 700, ls: -0.01 }, (vw) => vw - 32],
    ["grid card", { size: 15, wght: 600, ls: -0.015 }, (vw) => vw - 32 - 2 - 30 - 0.6 * 28 - 14], ["/live carousel", { size: 19, wght: 600, ls: 0 }, (vw) => vw - 32 - 2 - 40],
  ];
  const tally: Record<string, Record<string, number>> = {};
  for (const [name, b, col] of SURF) {
    tally[name] = { greedy: 0, pretty: 0, balance: 0 };
    for (const t of ZH_TITLES) for (const vw of [320, 360, 390, 412]) {
      const ps = pieces(html(keepFigures(t)), b), W = col(vw), bad = inside(t);
      for (const [m, ends] of [["greedy", greedy(ps, W)], ["pretty", pretty(ps, W, b)], ["balance", balance(ps, W, b)]] as const) {
        // Each line after the first starts where its first piece starts in the title.
        const cuts = ends.slice(0, -1).map((e) => ps[e + 1].at);
        if (cuts.some((c) => bad.has(c))) {
          tally[name][m]++;
          if (m === "balance" && process.env.R5E_VERBOSE) console.log(`       balance cuts a word: ${name} ${vw} ${lines(ps, ends).map((l) => l.text).join(" / ")}`);
        }
      }
    }
  }
  console.log(`       (Chinese titles cut inside a word, ${ZH_TITLES.length} titles × 4 widths: ${Object.entries(tally).map(([n, t]) => `${n} ${show(t)}`).join(" · ")})`);
  // ⚠️ Not none: Chinese may break between any two ideographs (UAX #14, and Chinese typesetting), and no engine offers a
  // phrase-aware break for Chinese (`word-break: auto-phrase` is Chromium's, for Japanese). Balance halves the cuts.
  ok("3.5 · on every title surface balance cuts fewer Chinese words than greedy and than pretty — why balance, and not `:lang(zh)` greedy, is the one rule (pretty cuts the most)",
    Object.values(tally).every((t) => t.balance < t.greedy && t.balance < t.pretty) && Object.values(tally).every((t) => t.pretty >= t.greedy), show(tally));
}

/* ══ §4 · H2 H3 ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · H2 H3 a name ends on two whole characters — clusters as ICU cuts them — with a bounded gap");
{
  const FAMILY = "\u{1F468}\u200d\u{1F469}\u200d\u{1F467}", TECH = "\u{1F469}\u200d\u{1F4BB}", RAINBOW = "\u{1F3F3}\ufe0f\u200d\u{1F308}";
  const THUMB = "\u{1F44D}\u{1F3FD}", TZ = "\u{1F1F9}\u{1F1FF}", KE = "\u{1F1F0}\u{1F1EA}", KEYCAP = "1\ufe0f\u20e3";
  const kept = (n: string) => { const x = keepNameEnd(n); return Array.isArray(x) ? textOf(html(x[1])) : null; };
  const CASES: Array<[string, string | null]> = [
    ["Juma K", "a K"], ["Mwanaisha Khamis", "is"], ["AB", null], [`Ali ${FAMILY}`, `i ${FAMILY}`], [`Neema ${TECH}`, `a ${TECH}`],
    [`Juma ${RAINBOW}`, `a ${RAINBOW}`], [`Asha ${THUMB}`, `a ${THUMB}`], [`Ali ${TZ}`, `i ${TZ}`], [`ab${TZ}${KE}`, `${TZ}${KE}`],
    ["Zoe\u0308", "oe\u0308"], [`Namba ${KEYCAP}`, `a ${KEYCAP}`], ["Player #A3F2K8", "K8"],
    // the joiners and vowels that are not marks, and the clusters that open on more than one code point
    ["Name \u0e01\u0e33", "e \u0e01\u0e33"], ["Name \u0eaa\u0eb3", "e \u0eaa\u0eb3"], ["Name \uff76\uff9e", "e \uff76\uff9e"], ["Name \u1100\uac00", "e \u1100\uac00"],
    [`Name ${TZ}\ufe0f`, `e ${TZ}\ufe0f`], ["Name \u0915\u094d\u0951\u0937", "e \u0915\u094d\u0951\u0937"], ["Ali \u{113D1}a", "i \u{113D1}a"],
    // H2: the gap is bounded
    ["AB" + "\u3000".repeat(37) + "C", null], ["AB" + "\u2003".repeat(37) + "C", null], ["AB" + " ".repeat(37) + "C", "B" + " ".repeat(37) + "C"],
    ["张三\u3000丰", "三\u3000丰"], ["AB\u3000\u3000C", null],
  ];
  const wrong = CASES.filter(([n, w]) => kept(n) !== w).map(([n, w]) => `${show(n)} kept ${show(kept(n))}, want ${show(w)}`);
  ok("4.1 · the end is the last two user-perceived characters: \"a 👩\u200d💻\" whole, a flag's pair, a letter with its marks, Thai and Lao AM, the half-width voiced mark, old-Hangul jamo, a conjunct; and a gap of 37 ideographic spaces is never one unbreakable run",
    wrong.length === 0, wrong.join(" | "));
  // The round-4 rule in miniature: two CODE POINTS.
  const tip = /\S\s*\S\s*$/u.exec(`Neema ${TECH}`)?.[0] ?? "";
  ok("4.1′ CONTROL · two code points cut the technologist emoji (its ZWJ and 💻 kept, 👩 left out), and their gap ran over 37 ideographic spaces",
    tip === "\u200d\u{1F4BB}" && (/\S\s*\S\s*$/u.exec("AB" + "\u3000".repeat(37) + "C")?.[0].length ?? 0) === 39);
  // The pattern against Node's ICU, code point by code point (planes 0, 1 and 14), in the contexts that join.
  const icuBounds = (s: string) => new Set([...SEG.segment(s)].map((g) => g.index).concat(s.length));
  const splitsCluster = (s: string) => { const b = icuBounds(s); return characterSpans(s).some(([a, z]) => !b.has(a) || !b.has(z)); };
  const CTX: Array<(x: string) => string> = [(x) => "a" + x, (x) => x + "a", (x) => "\u0915\u094d" + x, (x) => "\u1100" + x, (x) => "\uac00" + x,
    (x) => "\uac01" + x, (x) => "\u{1F469}\u200d" + x, (x) => "\u{1F1F9}" + x, (x) => " " + x];
  const under: string[] = [];
  let probed = 0;
  for (const [from, to] of [[0, 0xd7ff], [0xe000, 0x1ffff], [0xe0000, 0xe01ef]]) {
    for (let cp = from; cp <= to; cp++) {
      const x = String.fromCodePoint(cp);
      for (const c of CTX) { probed++; if (splitsCluster(c(x)) && under.length < 8) under.push(`U+${cp.toString(16).toUpperCase()} in ${show(c("X"))}`); }
    }
  }
  console.log(`       (Node ${process.version}, ICU ${process.versions.icu}, Unicode ${process.versions.unicode}; ${probed} strings)`);
  ok("4.2 · no character the pattern reads ever parts what ICU keeps together — every code point of planes 0, 1 and 14, in nine contexts (after a letter, before one, after a virama, after each Hangul jamo shape, after a ZWJ, after a lone flag letter, after a space)",
    under.length === 0, under.join(" | "));
  ok("4.2′ CONTROL · code points as characters part Thai AM, a trailing ZWJ, a flag and its mark (what a one-code-point rule would cut)",
    ["\u0e01\u0e33", "a\u200d", `${TZ}\ufe0f`].every((s) => [...s.matchAll(/\S/gu)].length > [...SEG.segment(s)].length));
  // A fuzzed name corpus: the cut always on an ICU boundary, and two visible characters at least.
  const r = xorshift(9);
  const TOK = ["Juma", "K", "Mwanaisha", "a", "B", "百里", "呼延", TECH, FAMILY, THUMB, TZ, KE, KEYCAP, RAINBOW, "e\u0301", "Zoe\u0308",
    "\u0915\u094d\u0937", "\u092a\u094d\u0930\u0915\u093e\u0936", "\ud55c\uad6d\uc5b4", "\u1100\u1161\u11a8", "\u0e01\u0e33", "\uff76\uff9e", "\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645", "\u0600\u0661", "#A3F2K8"];
  const WS = [" ", " ", "  ", "\u3000", "\u00a0", "\u2003", ""];
  let shaped = 0, bad = 0, textBad = 0;
  const odd: string[] = [];
  for (let i = 0; i < 4000; i++) {
    let s = ""; const k = 1 + Math.floor(r() * 6);
    for (let j = 0; j < k; j++) s += TOK[Math.floor(r() * TOK.length)] + WS[Math.floor(r() * WS.length)];
    const node = keepNameEnd(s);
    if (textOf(html(node)) !== s || keyIssues(node) > 0) textBad++;
    if (!Array.isArray(node)) continue;
    shaped++;
    const cut = (node[0] as string).length;
    const visible = [...SEG.segment(s.slice(cut))].filter((g) => !/^\s+$/u.test(g.segment)).length;
    if (!icuBounds(s).has(cut) || visible < 2) { bad++; if (odd.length < 3) odd.push(show(s)); }
  }
  ok(`4.3 · over 4,000 fuzzed names (${shaped} shaped) the cut is always an ICU grapheme boundary, two visible characters at least are kept, and the words and keys are intact`,
    bad === 0 && textBad === 0 && shaped > 2000, `bad ${bad} text ${textBad}: ${odd.join(" | ")}`);
  // The two call sites, as R4-H left them.
  ok("4.4 · the hub and the name editor draw keepNameEnd, balanced and free to break anywhere when they must",
    code("src/app/account/page.tsx").includes("<span className=\"kp-hub__name\">{keepNameEnd(viewer.name)}</span>")
      && rulesFor(".kp-hub__name").some((b) => /text-wrap:\s*balance/.test(b) && /overflow-wrap:\s*anywhere/.test(b))
      && /\? keepNameEnd\(currentName\) :/.test(code("src/components/profile/name-editor.tsx")));
  // Linear time, whatever the name (a 40-unit limit holds the real ones; the pattern holds its own).
  const t0 = performance.now();
  for (const s of ["a".repeat(20000), "a" + "\u0301".repeat(19999), "\u0915" + "\u094d".repeat(19999), "\u1100".repeat(20000), "\u{1F1F9}".repeat(10000), "a\u200d".repeat(10000), " \u0301".repeat(10000)]) keepNameEnd(s);
  ok("4.5 · seven adversarial 20,000-unit names (marks, viramas, jamo, flag letters, joiners) take under a second together", performance.now() - t0 < 1000, `${(performance.now() - t0).toFixed(0)} ms`);
}

/* ══ §5 · ONE GAP RULE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · H2's rule for every keep helper: a kept run holds at most one wide white space");
{
  const kw = code("src/components/ui/keep-words.tsx"), kr = code("src/components/ui/keep-run.tsx");
  const uses = [
    ["the last two words' space (keepLastWords, keepText)", kw.includes("const SPACE_KEPT = new RegExp(`^${KEPT_SPACE}$`);")
      && kw.includes("!SPACE_KEPT.test(text.slice(gap, second))") && kw.includes("const at = lastTwo(text, \"kept\")?.[0] ?? -1;") && kr.includes("} else tail = lastTwo(text, \"any\");")],
    ["keepYears' word and year", kw.includes("const SPACE_YEAR = new RegExp(`\\\\S(${KEPT_SPACE}(?:1[89]|2\\\\d)\\\\d{2})")],
    ["keepFigures' unit before", kw.includes("(?:\\\\b(${UNIT_BEFORE})(${KEPT_SPACE}))?")],
    ["keepFigures' unit after", kw.includes("|(${KEPT_SPACE})(${UNIT_AFTER})\\\\b)?")],
    ["keepNameEnd's gap", kw.includes("const NAME_GAP = new RegExp(`^${KEPT_GAP}$`);")],
    ["keepText's dash", kr.includes("const DASH = new RegExp(`${KEPT_SPACE}[—–](?=\\\\s|$)|—+`, \"gu\");")],
    ["digitChoice", kr.includes("const DIGIT_CHOICE = new RegExp(`(^|\\\\D)(\\\\d+${KEPT_SPACE}\\\\S{1,3}${KEPT_SPACE}\\\\d+)`, \"g\");")],
  ] as const;
  ok("5.1 · every kept pattern takes its spaces from `KEPT_SPACE` / `KEPT_GAP`: keepLastWords, keepYears, keepFigures (both sides), keepNameEnd, keepText (its dash and its last two), digitChoice",
    uses.every(([, u]) => u), uses.filter(([, u]) => !u).map(([n]) => n).join(", "));
  const GAP = new RegExp(`^${KEPT_GAP}$`);
  ok("5.2 · the rule: collapsible spaces however many (they render as one), and one other white space at most",
    ["", " ", "   ", "\t \n", "\u00a0", " \u3000 ", "\u2003"].every((g) => GAP.test(g)) && ["\u00a0\u00a0", "\u3000\u3000", " \u3000 \u3000"].every((g) => !GAP.test(g))
      && new RegExp(KEPT_SPACE).exec("x")?.index === undefined);
  const CASES: Array<[string, () => unknown, string]> = [
    ["dakika\u00a028:00", () => keepFigures("dakika\u00a028:00"), "[dakika\u00a028:00]"], ["dakika  28:00", () => keepFigures("dakika  28:00"), "[dakika  28:00]"],
    ["dakika\u3000\u300028:00", () => keepFigures("dakika\u3000\u300028:00"), "dakika\u3000\u300028:00"],
    ["Act  2022", () => keepYears("Act  2022"), "[Act  2022]"], ["Act\u3000\u30002022", () => keepYears("Act\u3000\u30002022"), "Act\u3000\u30002022"],
    ["kwa simu tu.", () => keepLastWords("Hakuna kwa simu tu."), "Hakuna kwa [simu tu.]"], ["simu\u3000\u3000tu.", () => keepLastWords("Hakuna simu\u3000\u3000tu."), "Hakuna simu\u3000\u3000tu."],
    ["neno —", () => keepText("neno — kisha baadaye sana"), "[neno —] kisha [baadaye sana]"],
    ["neno\u3000\u3000—", () => keepText("neno\u3000\u3000— kisha baadaye sana"), "neno\u3000\u3000— kisha [baadaye sana]"],
    ["6 au 7", () => keepText("Anza na 6 au 7 kwanza sasa", digitChoice("Anza na 6 au 7 kwanza sasa")), "Anza na [6 au 7] [kwanza sasa]"],
    ["6\u3000\u3000au 7", () => keepText("Anza na 6\u3000\u3000au 7 kwanza sasa", digitChoice("Anza na 6\u3000\u3000au 7 kwanza sasa")), "Anza na 6\u3000\u3000au 7 [kwanza sasa]"],
  ];
  const wrong = CASES.filter(([, f, w]) => br(f()) !== w).map(([n, f]) => `${show(n)} → ${show(br(f()))}`);
  ok("5.3 · a figure, a year, the last two words, a dash and a digit choice hold one wide space but not two (\"dakika\\u00a028:00\" whole, \"dakika\" + two U+3000 + \"28:00\" left to wrap)",
    wrong.length === 0, wrong.join(" | "));
  ok("5.3′ CONTROL · `\\s+` would hold 37 ideographic spaces in one run (~600px)", /dakika\s+28:00/.exec("dakika" + "\u3000".repeat(37) + "28:00")?.[0].length === 48);
  // The rule changes nothing in the real copy: no dictionary string and no seeded title has a gap of two wide spaces.
  const twoWide = /[^\S\t\n\f\r ][\t\n\f\r ]*[^\S\t\n\f\r ]/u;
  const hits = [...(["sw", "en", "zh"] as const).flatMap((l) => allStrings(l)), ...SEEDED].filter((s) => twoWide.test(s));
  ok("5.4 · no dictionary string and no seeded title holds two wide spaces in one gap, so every one of them draws exactly as before", hits.length === 0, show(hits.slice(0, 3)));
  // Linear, whatever the text: the last two words read back from the end, a year found from its space, a digit choice
  // tried only where a run of digits starts (round 5). The patterns they replaced were quadratic on a long word.
  const LONG = ["a".repeat(20000), "1".repeat(20000), "。".repeat(20000), "1" + " ".repeat(20000) + "x", "Act ".repeat(5000), "2022,".repeat(4000)];
  const t0 = performance.now();
  for (const s of LONG) { keepLastWords(s); keepYears(s); keepText(s, digitChoice(s)); }
  const took = performance.now() - t0;
  const oldLast = new RegExp(`\\S+${KEPT_SPACE}\\S+(?:${KEPT_SPACE})?$`), t1 = performance.now();
  "a".repeat(10000).search(oldLast);
  const oldTook = performance.now() - t1, t2 = performance.now();
  keepLastWords("a".repeat(10000));
  const newTook = performance.now() - t2;
  ok(`5.5 · keepLastWords, keepYears, keepText and digitChoice are linear: six adversarial 20,000-character texts take ${took.toFixed(0)}ms together`,
    took < 150, `${took.toFixed(0)} ms`);
  ok(`5.5′ CONTROL · the "word, space, word, end" pattern they replaced takes ${oldTook.toFixed(0)}ms on 10,000 letters (the reader ${newTook.toFixed(1)}ms)`,
    oldTook > 10 * newTook && oldTook > 20, `${oldTook.toFixed(1)} vs ${newTook.toFixed(1)} ms`);
}

/* ══ §6 · H4 NOTHING INSERTED ════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · H4 nothing is inserted into the words — the empty state, the dates, the toasts, the stamps, the Chinese gap");
{
  const INSERTED = /[\u00a0\u2060]/u;
  const bodies = (["sw", "en", "zh"] as const).flatMap((l) => filled(l));
  const changed = bodies.filter((s) => { const m = html(emptyStateBody(s)); return textOf(m) !== s || (INSERTED.test(m) && !INSERTED.test(s)); });
  ok(`6.1 · every dictionary sentence (${bodies.length}, placeholders filled) keeps its words through the empty state's body, character for character — no U+00A0, no U+2060`,
    changed.length === 0, show(changed.slice(0, 2)));
  // The breaks are the round-3 rule's, exactly: its no-break spaces and word joiner, now spans (UAX #14, `linebreak`).
  const LineBreaker = require("linebreak") as new (s: string) => { nextBreak: () => { position: number } | null };
  const breaks = (s: string) => { const b = new Set<number>(); const lb = new LineBreaker(s); let x; while ((x = lb.nextBreak())) if (x.position < s.length) b.add(x.position); return b; };
  const NB = String.fromCharCode(0xa0), WJ = String.fromCharCode(0x2060);
  const round3 = (s: string) => s.replace(/\b([A-Z]{2,})[ \t]+(au|or)[ \t]+(?=[A-Z]{2,}\b)/g, `$1${NB}$2${NB}`).replace(/[ \t]+(?=[—–])/g, NB).replace(/([^\s—])(?=—)/g, `$1${WJ}`);
  const oldBreaks = (s: string) => {
    const o = round3(s), map: number[] = [];
    for (let i = 0, j = 0; i <= o.length; i++) { map.push(j); if (o[i] !== WJ || s[j] === WJ) j++; }
    return new Set([...breaks(o)].map((p) => map[p]));
  };
  const newBreaks = (s: string) => { const spans = emptyStateRanges(s); return new Set([...breaks(s)].filter((p) => !spans.some(([a, b]) => a < p && p < b))); };
  const differ = bodies.filter((s) => { const a = oldBreaks(s), b = newBreaks(s); return a.size !== b.size || [...a].some((p) => !b.has(p)); });
  ok("6.2 · and it breaks exactly where the round-3 rule let it: the same UAX #14 break opportunities in every dictionary sentence, no-break spaces and word joiner replaced by nowrap spans",
    differ.length === 0, show(differ.slice(0, 2)));
  ok("6.2′ CONTROL · the round-3 rule did insert them: \"NDIO au HAPANA —\" with three U+00A0, \"否——\" with a U+2060",
    round3("bonyeza NDIO au HAPANA — tiketi").split(NB).length === 4 && round3("“否”——您").includes(WJ));
  const sw = fill(D.sw.journey.ticketsEmptyOpenBody as string, YES_NO.sw), zh = fill(D.zh.journey.ticketsEmptyOpenBody as string, YES_NO.zh);
  const dash = zh.indexOf("——"), zhRun = zh.slice(dash - 1, dash + 2);
  ok(`6.3 · Tiketi zangu's empty body: "[NDIO au HAPANA —]" one run, the zh dash held to the character before it ("[${zhRun}]") and its last 。 hung`,
    br(emptyStateBody(sw)).includes("[NDIO au HAPANA —]") && dash > 0 && html(emptyStateBody(zh)).includes(`<span class="whitespace-nowrap">${zhRun}</span>`)
      && html(emptyStateBody(zh)).endsWith(`<span class="kp-cjk-mark">。</span>`), show([br(emptyStateBody(sw)), html(emptyStateBody(zh)).slice(-80)]));
  // A break's end, filled into the approved sentence: a run the body keeps, never no-break spaces in the words.
  const NOW = Date.parse("2026-10-09T09:00:00Z"), END = "2026-10-10T02:05:00Z";
  const dates = (["sw", "en", "zh"] as const).map((l) => {
    const s = breakSentence(D[l].rg.breakActive as string, END, NOW, D[l].common.monthsShort as unknown as string[], l);
    return { l, s, m: html(emptyStateBody(s)) };
  });
  ok("6.4 · a break's end is ONE nowrap run in the empty state, in sw, en and zh (zh's \"2026年10月10日 05:05\" no longer breaks inside), its words the formatter's",
    dates.every(({ s, m }) => s.keep.length === 1 && textOf(m) === s.text && !INSERTED.test(m) && runsOf(emptyStateBody(s)).some((r) => r.includes(s.keep[0]))), show(dates.map((d) => d.m.slice(0, 120))));
  // The sweep: no player-facing helper or component inserts an invisible character for layout. The files that hold one
  // are listed with their reason; a new one fails until it is classified.
  const ESC = /\\u00[aA]0|\\u2060|\\u200[bB]|\\u202[fF]|&nbsp;|&#160;|fromCharCode\((?:160|0x00?[aA]0|0x2060|8288|0x200[bB])\)|[\u00a0\u2060\u200b\u202f]/;
  const REASON: Record<string, string> = {
    "src/lib/fill-nodes.tsx": "reads a typed U+00A0 inside a figure (MONEY_RUN); inserts none",
    "src/app/legal/responsible-gambling/page.tsx": "owner-approved RG copy, authored with &nbsp; (byte-pinned legal tree)",
    "src/app/legal/rules/page.tsx": "the legal version line, authored (byte-pinned legal tree)",
    "src/lib/legal/policy-lines.ts": "models the legal pages' own &nbsp;", "src/lib/legal/kept-promises.ts": "models the legal pages' own &nbsp;",
    // R5-J (round 5's follow-up, G-6): the four empty slots named here for the integrator — the analytics choice, the search
    // box's echo, the time field's preview, a settled row's empty cell — hold none now (their line is `.kp-keep-line`'s
    // generated space), so they left this list for 6.5′'s, where a typed space coming back fails.
    "src/components/updown/use-quick-bet.ts": "a live region's re-announce nonce (U+200B), not layout",
    "src/lib/markets/short-title.ts": "strips invisible characters from titles; the admin's form hint", "src/lib/server/ai-poll-generation.ts": "strips them from AI titles",
    "src/lib/server/ai-provider.ts": "a fixture that feeds the stripper", "src/lib/contacts/import-parse.ts": "reads them in imported numbers",
    "src/lib/contacts/import-read.ts": "reads them in imported numbers", "src/lib/house-bot/rules.ts": "reads them out of figures", "src/lib/sms-compose.ts": "folds them out of SMS text",
    "src/lib/server/tax-report-doc.ts": "a PDF (no CSS to keep a run whole)", "src/lib/server/house-console-read.ts": "the operator console (admin)",
    "src/lib/admin-status-lexicon.ts": "the operator console (admin)", "src/lib/marketing/sms-settings.ts": "the operator console (admin)",
    "src/lib/marketing/campaign-confirm.ts": "the operator console (admin)", "src/lib/marketing/campaign-estimate.ts": "the operator console (admin)",
    "src/lib/server/marketing/campaign-confirm-service.ts": "the operator console (admin)", "src/lib/server/marketing/owner-save.ts": "the operator console (admin)",
  };
  const walkAll = (dir: string, out: string[] = []): string[] => { for (const n of readdirSync(dir)) { const p = join(dir, n).replace(/\\/g, "/"); if (statSync(p).isDirectory()) walkAll(p, out); else if (/\.(tsx?|css)$/.test(n)) out.push(p); } return out; };
  const scan = (f: string) => (f.endsWith(".css") ? decommentCss(read(f)) : decomment(read(f)));
  const holders = walkAll("src").filter((f) => f !== "src/lib/i18n-dict.ts" && !/^src\/(?:app|components)\/admin\//.test(f) && ESC.test(scan(f)));
  const unexplained = holders.filter((f) => !(f in REASON));
  ok(`6.5 · outside the dictionary, the admin console and the legal tree, no player code inserts a no-break space, word joiner or zero-width space for layout — the ${holders.length} files that hold one each have a reason`,
    unexplained.length === 0, unexplained.join(", "));
  const MINE = ["src/components/ui/empty-state-text.ts", "src/components/ui/empty-state.tsx", "src/lib/break-end.ts", "src/components/markets/sell-result.tsx",
    "src/components/markets/sell-button.tsx", "src/components/ui/toast.tsx", "src/app/updown/[roundId]/page.tsx", "src/lib/cjk-marks.tsx", "src/components/ui/keep-run.tsx", "src/components/ui/keep-words.tsx",
    "src/components/analytics/analytics-choice.tsx", "src/components/ui/search-box.tsx", "src/components/ui/time-select.tsx", "src/components/home/trust-band.tsx"];
  ok("6.5′ · the files round 5 cleared hold none (the empty state, the break sentence, the sell toast, the toaster, the Up & Down stamp, the CJK gap, the keep helpers, and R5-J's four empty slots)",
    MINE.every((f) => !ESC.test(decomment(read(f)))), MINE.filter((f) => ESC.test(decomment(read(f)))).join(", "));
  // The toaster draws every amount its words state as an `.amount` — the sell refusal's among them, every other too.
  const toast = code("src/components/ui/toast.tsx");
  ok("6.6 · the toast draws its title and its sentence through moneyRuns: every amount mono and whole (§M4), no character slipped in",
    toast.includes(`<p className="font-display text-[13px] font-semibold text-text leading-tight">{moneyRuns(toast.title)}</p>`)
      && toast.includes(`<p className="mt-0.5 text-body-sm text-text-muted leading-snug">{moneyRuns(toast.description)}</p>`)
      && toast.includes(`import { moneyRuns } from "@/lib/fill-nodes";`) && /description\?: string;/.test(toast)
      && code("src/components/markets/sell-button.tsx").includes("description: msg, variant: fault ?"));
  const toasts = [`Dau limewekwa · NDIO ${formatTzs(1000)}`, `Imeuzwa · ${formatTzs(9000)} imerudishwa`, `${formatTzs(450)} ada ya kutoka mapema`, `Juu · ${formatTzs(12345)}`];
  ok("6.6′ · the toasts' figures (\"Bet placed · YES TZS 1,000\", \"Sold · TZS 9,000 returned\", a fee, a payout) are each one `.amount`",
    toasts.every((s) => [...html(moneyRuns(s)).matchAll(/<span class="amount">([^<]*)<\/span>/g)].length === 1 && textOf(html(moneyRuns(s))) === s));
  const ud = code("src/app/updown/[roundId]/page.tsx");
  ok("6.7 · the Up & Down quote stamp (\"imenukuliwa 18:55:02 EAT\") is one nowrap span, not no-break spaces",
    ud.includes(`const stamp = quotedAt ? <span className="whitespace-nowrap">{t.market.udQuoted} {quotedAt}</span> : null;`) && !/\\u00A0/i.test(ud));
  // The CJK gap: its space is the stylesheet's, generated, so the text is the dictionary's.
  const hint = D.zh.market.chooseSideHelp as string, hm = html(hangCjkMarks(D.zh.market.whichWay as string)) + html(hangCjkMarks(hint));
  ok("6.8 · a mid-line Chinese mark's gap is an EMPTY span whose space is `.kp-cjk-gap::after` — the page's text (copy, find-in-page, textContent) is the dictionary's",
    /<span aria-hidden="true" class="kp-cjk-gap(?: kp-cjk-gap--q)?"><\/span>/.test(html(hangCjkMarks("选择一个问题，点击"))) && textOf(html(hangCjkMarks(hint))) === hint
      && rulesFor(".kp-cjk-gap::after").some((b) => /content:\s*" "/.test(b)) && !/kp-cjk-gap[^>]*> </.test(hm));
  ok("6.8′ CONTROL · the round-4 gap held a real space: \"，\" + \" \" + \"点击\" in the text, which a find for \"，点击\" misses",
    textOf(`选择一个问题<span class="kp-cjk-mark">，</span><span aria-hidden="true" class="kp-cjk-gap"> </span>点击`).includes("， 点击"));
  // The dash rule is found from the dash (keep-run's `dashRanges`): linear, where a "unit, then a dash" pattern backtracked.
  const t0 = performance.now();
  for (const s of ["。".repeat(10000), "word ".repeat(2000) + "— x", "a".repeat(10000) + " — b"]) emptyStateBody(s);
  const took = performance.now() - t0;
  ok(`6.9 · the empty state's dash rule is linear: three adversarial 10,000-character bodies take ${took.toFixed(0)}ms together (the round-5 pattern took ~600ms on the first alone)`,
    took < 150, `${took.toFixed(0)} ms`);
  ok("6.9′ · and a spaced dash right after another dash is held to it too (\"作 — — x\": no line opens on the second dash)",
    br(emptyStateBody("作 — — x")) === "[作 — —] x", br(emptyStateBody("作 — — x")));
}

/* ══ §7 · SIGNED FIGURES ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · moneyRuns reads a signed figure whole, in the platform's own spellings (review 3's doubt)");
{
  const fig = (s: string) => [...html(moneyRuns(s)).matchAll(/<span class="amount">([^<]*)<\/span>/g)].map((m) => decode(m[1]));
  const neg = formatTzs(-4200), compact = formatTzsCompact(-1_234_567), minus = formatTzsSigned(-1234), plus = formatTzsSigned(1234);
  ok(`7.1 · "${neg}", "${compact}" (formatTzs, formatTzsCompact: the minus after the code) and "${minus}", "${plus}" (formatTzsSigned: the sign before it) are each one amount in a sentence`,
    [neg, compact, minus, plus].every((x) => show(fig(`Salio ${x} leo.`)) === show([x])) && neg === "TZS \u22124,200" && minus === "\u2212TZS 1,234", show([neg, compact, minus, plus].map((x) => fig(`Salio ${x} leo.`))));
  ok("7.1′ CONTROL · a hyphen is never read as a sign (\"TZS -4,200\", \"Juu-TZS 5\" are not amounts), and a sentence's comma stays out",
    fig("TZS -4,200").length === 0 && show(fig("Juu-TZS 5")) === show(["TZS 5"]) && show(fig("hadi TZS 5,000,000, inahitaji")) === show(["TZS 5,000,000"]));
}

/* ══ §8 · H5 ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · H5 keep-units.tsx is gone, and nothing names it as live code");
{
  const files = [...(function* walk(d: string): Generator<string> { for (const n of readdirSync(d)) { const p = `${d}/${n}`; if (statSync(p).isDirectory()) yield* walk(p); else if (/\.(tsx?|mts|mjs|cjs)$/.test(n)) yield p; } })("src"), ...readdirSync("scripts").filter((n) => /\.(mts|mjs|cjs|ts)$/.test(n)).map((n) => `scripts/${n}`)];
  const importers = files.filter((f) => /from ["'][^"']*keep-units["']|keepUnits\(/.test(decomment(read(f))));
  ok("8.1 · src/components/ui/keep-units.tsx does not exist, nothing imports it and nothing calls keepUnits", !existsSync("src/components/ui/keep-units.tsx") && importers.length === 0, importers.join(", "));
}

/* ══ §9 · THE WIDEST RUN FITS ════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · the widest figure run fits the narrowest title line (a run is nowrap: wider, it would overflow)");
{
  // The narrowest title line is the market page's h1 at 320: 28px Sora 700, -0.02em, in 320 - 2 × 16 - (2em + 12px).
  const H1 = { size: 28, wght: 700 as const, ls: -0.02 }, h1Line = 320 - 32 - (2 * 28 + 12);
  const page = code("src/app/markets/[id]/page.tsx");
  ok("9.locate · the market h1: text-title-lg (28px), bold, tracking \u22120.02em, pr-[calc(2em+12px)]",
    /className="font-display text-title-lg md:text-display-3 font-bold leading-tight tracking-\[-0\.02em\] text-text text-balance pr-\[calc\(2em\+12px\)\]/.test(page) && h1Line === 220);
  // Every seeded title's runs, and the platform's own ways of putting a figure in a question.
  const PLATFORM = ["TZS 1 bilioni", "TZS 2.5 bilioni", "TZS 100 milioni", "TZS 4,200", "TZS 500,000", "TZS 1,000,000", "$100,000", "$5.5 bilioni", "USD 5.5 billion",
    "dakika 28:00", "Septemba 30", "asilimia 100", "nyuzi 35", "2026-27赛季", "15万美元", "8月31日"];
  const all = [...new Set([...SEEDED.flatMap(figureRuns), ...PLATFORM.flatMap(figureRuns)])];
  const widest = all.map((r) => [r, adv(r, H1)] as const).sort((a, b) => b[1] - a[1]);
  ok(`9.1 · every seeded title's runs (${SEEDED.flatMap(figureRuns).length}) and the platform's phrasings of a figure fit: the widest, "${widest[0][0]}", is ${widest[0][1].toFixed(1)}px at the h1's 28px, inside its ${h1Line}px line at 320`,
    widest.length > 15 && widest[0][1] <= h1Line, show(widest.slice(0, 3)));
  ok("9.1′ CONTROL · \"December 2026\" would not (225px) — why a month keeps only its day (1.3″) — nor would an absurd figure (\"TZS 10,000,000 bilioni\")",
    adv("December 2026", H1) > h1Line && keepFigures("before December 2026?") === "before December 2026?" && adv("TZS 10,000,000 bilioni", H1) > h1Line);
  // Measured, not asserted — named in round 5's report as an owner question: a 14-character figure is as wide as a
  // 14-letter word at that h1 (which has no overflow-wrap), and reaches into the 8px before its 7%-opacity watermark.
  console.log(`       (wider than the 220px line at 320: ${["TZS 10,000,000", "USD 100 million"].map((x) => `"${x}" ${adv(x, H1).toFixed(1)}px`).join(", ")}; "?" after one adds ${adv("?", H1).toFixed(1)}px)`);
}

/* ══ the end ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function fill(template: string, [yes, no]: readonly [string, string]): string { return template.replace(/\{yes\}/g, yes).replace(/\{no\}/g, no); }
console.log(`\nvisual-pass-r5e: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
