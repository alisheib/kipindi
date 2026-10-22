/**
 * THE FACT KEEPER'S RUNS FIT THEIR LINE — `src/components/maswali/maswali-facts.tsx`'s `keepFact` (MASWALI-BUILD S5 round 2,
 * HUB's find, the lead's ruling of 2026-10-22).
 *
 *   npx tsx scripts/maswali-facts.test.mts        (npm run test:maswali-facts)
 *
 * 🔴 WHAT HUB FOUND: a kept run cannot break, and runs that overlap merge into one (`mergeRanges`) — so nothing bounded a
 * merged run's width. In Swahili "Matokeo 5" took the number that opens the cap's count "5 kati ya 15", and with "ya 15" and
 * the last two words "15 yametolewa" the WHOLE line "Matokeo 5 kati ya 15 yametolewa" was one run: 211px in the hub's
 * 216px row at 320, 3px into its chevron. Measuring every line found a second class: a number rule took a money figure's
 * digits ("1,000,000 carried", "1,000,000 滚存至") and the platform's last two words read them as a word ("1,000,000
 * imehamishwa"), gluing the figure to its words — a run that grows with the jackpot ("TZS 12,345,000 carried forward").
 * ⭐ THE RULES (the keeper): a noun before a cap's count stays free; the digits of a money figure start no number phrase;
 * a kept run that starts inside a figure starts after it (the figure is kept whole by the money reader, and a figure and its
 * words share a line wherever they fit, parting only after the figure where the box is too narrow).
 *   §1 the Swahili results line: "Matokeo" free, "5 kati ya 15 yametolewa" one run, its width.
 *   §2 THE CENSUS (2.1): every string of the dictionary's `millionea` namespace in sw, en and zh, filled with worst-case
 *      samples (counts of 15, a TZS 12,345,000 figure, each language's widest weekday and clock), split into its facts,
 *      kept — and every run measured (Inter at body-sm, 13px with its −0.05px tracking, for the words; JetBrains Mono for
 *      the numerals and the money, as `.mono` and `.amount` set them; an ideograph a full em) against the narrowest box a
 *      fact line is drawn in at 320: BUDGET, 180px (the lead's "home card column at 320"; the hub's last-week row measured
 *      211px of run 3px into its chevron, so its words stop near 208px — this model reads about 3.5% under the browser, so
 *      180px keeps a margin under every measured box). Each figure rule read directly: no number phrase offered from a
 *      figure's digits (2.2), no kept run running on past a figure's end into its words (2.3).
 *   §3 NOTHING ELSE MOVED: against the keeper at the release this branch started from (`BASE`), every fact of every string
 *      keeps the same runs, except where one of the rules applies — a Swahili fact with a cap's count, a fact with a money
 *      figure, or a fact with a one-letter word (§5) — and each such fact still keeps every run the base kept that overlaps
 *      no figure and does not open on a cap's noun. (`test:maswali-design` 4.A1c holds the A1 phrases themselves.)
 *   §4 PLANTS, each compiled into the keeper: the old Swahili take of a cap's opener (§1, §2.1), a number rule taking a
 *      figure's digits (§2.2), a kept run left starting inside a figure (§2.3, §2.1), and both figure rules out (§2.1).
 *   §5 A ONE-LETTER WORD NEVER ENDS A LINE (the lead's read of the hub's intro at en 360, "…5 reserve. A" / "ticket is…"):
 *      every one-letter word of every line is one run with the word after it (5.1), the hub's intro among them (5.3);
 *      Swahili and Chinese lines are untouched by the rule, and an English line moves only where such a word stands (5.2);
 *      the rule taken out is caught (5.4).
 * ⛔ It READS, compiles and renders in memory; it writes nothing.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { eatRange, eatWeekdayClock, eatClock } from "../src/components/maswali/maswali-format.ts";
import { formatEatDate } from "../src/lib/eat-day.ts";
import { outcomeWordIn } from "../src/lib/side-label.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);
const LOCALES = ["sw", "en", "zh"] as const;
type L3 = (typeof LOCALES)[number];
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");

/* ── the keeper, as the tree has it and as the base had it, and planted ─────────────────────────────────────────────── */
const FACTS_REL = "src/components/maswali/maswali-facts.tsx";
const BASE = "9b3f23b11";
type Keeper = { keepFact: (l: L3, text: string) => unknown; factsOf: (line: string) => string[]; factRuns: (l: L3, text: string) => string[] };
const compileAt = (rel: string, source: string): Keeper => {
  const out = ts.transpileModule(source, {
    fileName: join(ROOT, rel),
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const live = req.resolve(`../${rel}`);
  const m = new NodeModule(live) as NodeModule & { _compile(s: string, f: string): void };
  m.filename = live;
  m.paths = (NodeModule as unknown as { _nodeModulePaths(d: string): string[] })._nodeModulePaths(dirname(live));
  m._compile(out, live);
  return m.exports as unknown as Keeper;
};
const SRC = raw(FACTS_REL);
const now = compileAt(FACTS_REL, SRC);
const base = compileAt(FACTS_REL, execFileSync("git", ["show", `${BASE}:${FACTS_REL}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n"));
/** The keeper with one text replaced, refusing when the text is not there exactly once. */
const planted = (from: string, to: string): Keeper => {
  if (SRC.split(from).length - 1 !== 1) throw new Error(`PREMISE ABSENT — the plant's anchor "${from.slice(0, 60)}…" is not in the keeper exactly once`);
  return compileAt(FACTS_REL, SRC.replace(from, to));
};

/* ── a kept fact's runs, and their widths ───────────────────────────────────────────────────────────────────────────── */
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** Each `white-space: nowrap` run of the markup, as its inner markup (nesting read, so a run's own spans stay in it). */
const runsOf = (m: string): string[] => {
  const out: string[] = [];
  for (const open of m.matchAll(/<span class="whitespace-nowrap">/g)) {
    const at = open.index ?? 0;
    let depth = 0;
    for (const t of m.slice(at).matchAll(/<span\b[^>]*>|<\/span>/g)) {
      depth += t[0] === "</span>" ? -1 : 1;
      if (depth === 0) { out.push(m.slice(at + open[0].length, at + (t.index ?? 0))); break; }
    }
  }
  return out;
};
const textOf = (m: string) => dec(m.replace(/<[^>]+>/g, ""));
const kept = (k: Keeper, l: L3, fact: string) => runsOf(renderToStaticMarkup(h("p", null, k.keepFact(l, fact) as never)));

const fontkit = req("fontkit") as { openSync: (p: string) => { unitsPerEm: number; layout: (s: string) => { advanceWidth: number } } };
const FONT = (f: string) => fontkit.openSync(join(ROOT, "src/lib/server/reports/fonts", f));
const INTER = FONT("Inter-Regular.ttf"), MONO = FONT("JetBrainsMono-Regular.ttf");
const twCfg = ((m: { default?: unknown }) => (m.default ?? m) as { theme: { extend: { fontSize: Record<string, [string, { letterSpacing: string }]> } } })(req("../tailwind.config.ts"));
const [SIZE, { letterSpacing }] = twCfg.theme.extend.fontSize["body-sm"];
const PX = parseFloat(SIZE), TRACK = parseFloat(letterSpacing);
const IDEO = /[⺀-鿿豈-﫿　-〿＀-￯]/;
const advance = (face: ReturnType<typeof FONT>, s: string) => (s ? (face.layout(s).advanceWidth / face.unitsPerEm) * PX : 0);
/** A run's width: its text in Inter, its `.mono` and `.amount` spans in JetBrains Mono (`.amount` untracked), an ideograph
 *  a full em; the rung's tracking on every other character. */
const widthOf = (run: string) => {
  let w = 0, depth = 0, faceDepth = -1, untracked = false;
  for (const t of run.matchAll(/<span\b[^>]*>|<\/span>|[^<]+/g)) {
    const s = t[0];
    if (s.startsWith("<span")) {
      depth++;
      if (faceDepth < 0 && /class="[^"]*\b(?:mono|amount)\b/.test(s)) { faceDepth = depth; untracked = /\bamount\b/.test(s); }
      continue;
    }
    if (s === "</span>") { if (depth === faceDepth) { faceDepth = -1; untracked = false; } depth--; continue; }
    const text = dec(s), latin = [...text].filter((c) => !IDEO.test(c)).join("");
    w += [...text].filter((c) => IDEO.test(c)).length * PX;
    w += advance(faceDepth >= 0 ? MONO : INTER, latin) + (untracked ? 0 : TRACK * [...latin].length);
  }
  return w;
};
/** The census budget: the narrowest box a fact line is drawn in at 320 (see the header). */
const BUDGET = 180;

/* ── worst-case samples, in each language's own words ───────────────────────────────────────────────────────────────── */
const T = { sw: dict.sw, en: dict.en, zh: dict.zh };
const NOW = Date.parse("2026-12-01T09:00:00.000Z");
const at = (iso: string) => Date.parse(iso);
/** Each language's widest weekday, read by this file's own measure. */
const widestDay = (l: L3) => [...T[l].millionea.weekdays].sort((a, b) => widthOf(b) - widthOf(a))[0];
const samples = (l: L3): Record<string, string | number> => {
  const t = T[l], day = widestDay(l), when = `${day} 18:00`;
  return {
    n: 15, cap: 10, week: 49, prev: 48, pct: 13, a: 10, b: 5, mains: 10, reserves: 5, valid: 3, voided: 7, l: 15, w: 15,
    from: 1, to: 10, score: 10, mins: 10, runway: 10, unused: 4, r: "A5", traPct: 12, gbtPct: 10, list: "1, 2, 3, A1",
    price: formatTzs(1_000), amount: formatTzs(12_345_000), balance: formatTzs(1_234_500), carried: formatTzs(12_345_000),
    paid: formatTzs(12_345_000), fee: formatTzs(1_604_850), tra: formatTzs(192_582), gbt: formatTzs(160_485),
    when, time: eatClock(at("2026-12-01T10:32:00.000Z")), day,
    date: formatEatDate(at("2026-12-07T09:00:00.000Z"), NOW, t.common.monthsShort, l),
    range: eatRange(t, at("2026-11-30T15:01:00.000Z"), at("2026-12-04T15:00:00.000Z")),
    hours: l === "sw" ? "saa 48" : l === "zh" ? "48 小时" : "48 hours",
    source: "nbc.co.tz",
    // S7-OB's objection door (merged into S7 at S7-MERGE 3; the census met it at S7-MERGE 4): a ruling's result is the
    // product's own YES or NO word, as the door fills it (`outcomeWord`, MASWALI) — the wider of the two — and the
    // officer's note is the officer's own words, as the objection seed writes one.
    result: [outcomeWordIn(l, "YES", "MASWALI"), outcomeWordIn(l, "NO", "MASWALI")].sort((a, b) => widthOf(b) - widthOf(a))[0],
    note: "The federation's official report confirms event 2 took place; the result stands.",
    // S7-F9 3 (the lead's ruling (a), DESIGN_AUTHORITY §M8a item 19): How to play's stop rule says the final week's rule in
    // its one wording — `ruleSunset` filled with `finalWeekRule` as {rule}, as how/page.tsx fills it.
    rule: t.millionea.finalWeekRule,
  };
};
/** A placeholder that means something else in one string: `levies` names the two levies' RATES ("TRA {tra}%"), where the
 *  ledger's line names their amounts. */
const BY_KEY: Record<string, Record<string, string | number>> = { levies: { tra: 12, gbt: 10 } };
/** Every fact of every millionea string, filled. A placeholder with no sample stops the census (it would read "{x}"). */
const census = (l: L3) => {
  const out: Array<{ key: string; fact: string }> = [];
  for (const [key, v] of Object.entries(T[l].millionea as unknown as Record<string, unknown>)) {
    if (typeof v !== "string") continue;
    const s = { ...samples(l), ...BY_KEY[key] };
    for (const m of v.matchAll(/\{(\w+)\}/g)) if (!(m[1] in s)) throw new Error(`PREMISE ABSENT — no census sample for {${m[1]}} (millionea.${key})`);
    for (const fact of now.factsOf(fill(v, s as never))) out.push({ key, fact });
  }
  return out;
};
const FACT_SET = Object.fromEntries(LOCALES.map((l) => [l, census(l)])) as Record<L3, Array<{ key: string; fact: string }>>;
/** The census read with a keeper: every run that does not fit the budget, and the widest run per language. */
const measure = (k: Keeper) => {
  const over: string[] = [];
  const widest: Record<string, { run: string; w: number; key: string }> = {};
  let runs = 0;
  for (const l of LOCALES) for (const { key, fact } of FACT_SET[l]) for (const r of kept(k, l, fact)) {
    runs++;
    const w = widthOf(r), run = textOf(r);
    if (!widest[l] || w > widest[l].w) widest[l] = { run, w, key };
    if (w > BUDGET) over.push(`${l} millionea.${key}: "${run}" ${w.toFixed(1)}px`);
  }
  return { over, widest, runs };
};

/* ══ §1 · THE SWAHILI RESULTS LINE ══════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · the Swahili results line keeps the count's own phrase, and its noun free");
const resultsSw = fill(T.sw.millionea.resultsOut, { n: "5" });
const swLine = (k: Keeper) => kept(k, "sw", resultsSw).map((r) => ({ run: textOf(r), w: +widthOf(r).toFixed(1) }));
const before = swLine(base), after = swLine(now);
console.log(`  "${resultsSw}" — base: ${j(before)} · now: ${j(after)}`);
ok(`1.1 · "${resultsSw}": "Matokeo" free, "5 kati ya 15 yametolewa" one run (${after[0]?.w}px; the base kept the whole line, ${before[0]?.w}px by this model, 211px in HUB's browser)`,
  after.length === 1 && after[0].run === "5 kati ya 15 yametolewa" && !after.some((r) => r.run.includes("Matokeo"))
    && before.length === 1 && before[0].run === resultsSw, j({ before, after }));

/* ══ §2 · THE CENSUS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section(`§2 · every run of every Millionea line fits the narrowest box a fact line is drawn in at 320 (${BUDGET}px)`);
const nowCensus = measure(now), baseCensus = measure(base);
for (const l of LOCALES) console.log(`  ${l} widest: "${nowCensus.widest[l].run}" ${nowCensus.widest[l].w.toFixed(1)}px (millionea.${nowCensus.widest[l].key}) · the base's: "${baseCensus.widest[l].run}" ${baseCensus.widest[l].w.toFixed(1)}px (millionea.${baseCensus.widest[l].key})`);
console.log(`  base over budget (${baseCensus.over.length}): ${baseCensus.over.slice(0, 12).join(" | ")}`);
ok(`2.1 · ${FACT_SET.sw.length + FACT_SET.en.length + FACT_SET.zh.length} facts in sw, en and zh, ${nowCensus.runs} kept runs: every one fits ${BUDGET}px — the widest ${Math.max(...LOCALES.map((l) => nowCensus.widest[l].w)).toFixed(1)}px`,
  nowCensus.over.length === 0 && nowCensus.runs > 500, nowCensus.over.join(" | "));
ok(`2.1′ CONTROL · the census reads the defects: at the base ${baseCensus.over.length} runs did not fit, the results line and the figure glued to its words among them`,
  baseCensus.over.some((x) => x.includes("Matokeo 15 kati ya 15 yametolewa")) && baseCensus.over.some((x) => x.includes("TZS 12,345,000 carried forward"))
    && baseCensus.over.some((x) => x.includes("TZS 12,345,000 imehamishwa")), baseCensus.over.join(" | "));
// Each rule read directly, as it stands in a line: where a money figure stands (as `formatTzs` writes one), and where a run
// starts — every place the keeper would find it (`runAndDashRanges` keeps every occurrence of a run it is handed).
const FIGURES = /TZS\s?\d{1,3}(?:,\d{3})*/g;
const figuresIn = (fact: string) => [...fact.matchAll(FIGURES)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const);
const startsInFigure = (fact: string, run: string) => {
  const figs = figuresIn(fact);
  for (let at = fact.indexOf(run); at >= 0; at = fact.indexOf(run, at + 1)) if (figs.some(([a, z]) => at > a && at < z)) return true;
  return false;
};
/** Rule (i): the runs a keeper's number rules offer that start inside a money figure. */
const offeredInFigure = (k: Keeper) => LOCALES.flatMap((l) => FACT_SET[l].flatMap(({ key, fact }) =>
  k.factRuns(l, fact).filter((r) => startsInFigure(fact, r)).map((r) => `${l} millionea.${key}: "${r}" in "${fact}"`)));
/** Rule (ii), as drawn: the kept runs that hold a money figure and run on past its end into the words after it (a figure
 *  glued to its words — the run that grows with the jackpot). The stop or the comma that closes a figure is punctuation, not
 *  a word; a rate before a figure ("TRA 12% TZS 192,582") is the base's own reading and stays (it holds no words after). */
const gluedToFigure = (k: Keeper) => LOCALES.flatMap((l) => FACT_SET[l].flatMap(({ key, fact }) => kept(k, l, fact).map(textOf).filter((r) => {
  const from = fact.indexOf(r), to = from + r.trim().replace(/[.,;:!?。，；：！？]+$/u, "").length;
  return figuresIn(fact).some(([a, z]) => from < z && to > z);
}).map((r) => `${l} millionea.${key}: "${r}"`)));
const figureFacts = LOCALES.reduce((n, l) => n + FACT_SET[l].filter(({ fact }) => figuresIn(fact).length > 0).length, 0);
ok(`2.2 · the digits of a money figure start no number phrase: across the ${figureFacts} facts that hold a figure, Millionea's rules offer no run that starts inside one`,
  figureFacts > 20 && offeredInFigure(now).length === 0, offeredInFigure(now).join(" | "));
ok("2.3 · …and a figure is its own run: no kept run holds a figure and words with it (they share a line wherever they fit, and part only after the figure)",
  gluedToFigure(now).length === 0, gluedToFigure(now).join(" | "));
const glued = gluedToFigure(base);
ok(`2.3′ CONTROL · at the base both happened: "12,345,000 carried" offered, and ${glued.length} figures glued to their words ("TZS 12,345,000 imehamishwa", "TZS 12,345,000 carried forward", "TZS 1,000 a ticket"…)`,
  offeredInFigure(base).some((x) => x.includes('"12,345,000 carried"')) && glued.some((x) => x.includes('"TZS 12,345,000 imehamishwa"'))
    && glued.some((x) => x.includes('"TZS 12,345,000 carried forward"')), j({ offered: offeredInFigure(base).slice(0, 3), glued: glued.slice(0, 6) }));

/* ══ §3 · NOTHING ELSE MOVED ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · against the base keeper, a fact's runs change only where a rule applies — and keep every run the rules leave alone");
const FIGURE = /TZS\s?[\d,]+/;
const CAP_COUNT = /\b\d+ (?:of|kati ya) \d+\b/;
/** A one-letter word and the word after it, as a line holds it (§5): the letter alone between white space (or a line's
 *  start, or an opening bracket or quote), then the next word. */
const ONE_LETTER = /(^|[\s(“])([A-Za-z])\s+(\S+)/g;
const hasOneLetter = (fact: string) => [...fact.matchAll(ONE_LETTER)].length > 0;
const changed: string[] = [], unexplained: string[] = [], lost: string[] = [];
for (const l of LOCALES) for (const { key, fact } of FACT_SET[l]) {
  const b = kept(base, l, fact).map(textOf), n = kept(now, l, fact).map(textOf);
  if (j(b) === j(n)) continue;
  changed.push(`${l} ${key}`);
  const money = FIGURE.test(fact), cap = l === "sw" && CAP_COUNT.test(fact);
  if (!money && !cap && !hasOneLetter(fact)) { unexplained.push(`${l} millionea.${key} "${fact}": ${j(b)} → ${j(n)}`); continue; }
  // Every base run that overlaps no money figure and does not open on a noun before a cap's count is still kept, inside
  // some run now. (A run is a stretch of its fact: it is found where it stands, and a figure where the money reads it.)
  const figures = figuresIn(fact);
  for (const r of b) {
    const from = fact.indexOf(r), to = from + r.length;
    const overFigure = figures.some(([a, z]) => from < z && to > a);
    const capNoun = cap && /^\S+ \d+ kati ya \d+/.test(r);
    if (!overFigure && !capNoun && !n.some((x) => x.includes(r))) lost.push(`${l} millionea.${key}: "${r}" in "${fact}"`);
  }
}
console.log(`  ${changed.length} facts changed: ${changed.join(", ")}`);
ok("3.1 · every fact whose runs changed holds a money figure or a one-letter word, or is a Swahili fact with a cap's count — no other line moved", unexplained.length === 0 && changed.length > 0, unexplained.join(" | "));
ok("3.2 · …and each keeps every run the base kept that the rules do not touch (no phrase lost in sw, en or zh)", lost.length === 0, lost.join(" | "));

/* ══ §4 · PLANTS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§4 · each rule taken out of the keeper is caught");
const oldTake = planted("return !capOpens.has(at) && !inFigure(at);", "return !inFigure(at);");
const oldTakeRuns = kept(oldTake, "sw", resultsSw).map(textOf);
ok("4.1 PLANT · the old Swahili take (a noun before a cap's count): the whole results line one run again — §1 reads it, and the census finds it over budget",
  oldTakeRuns.length === 1 && oldTakeRuns[0] === resultsSw && measure(oldTake).over.some((x) => x.includes("Matokeo 15 kati ya 15 yametolewa")), j(oldTakeRuns));
const digitsTaken = planted(": [...text.matchAll(NUMBER_THEN_NOUN)].filter((m) => !inFigure(m.index ?? 0)).map((m) => m[0]);", ": all(NUMBER_THEN_NOUN);");
ok("4.2 PLANT · a number rule taking a figure's digits (en, zh: \"12,345,000 carried\", \"12,345,000 滚存至\") is caught by 2.2 — the rule offers it again (rule (ii) alone would still trim it from what is drawn: the two rules hold each other)",
  offeredInFigure(digitsTaken).some((x) => x.startsWith("en ") && x.includes('"12,345,000 carried"')) && offeredInFigure(digitsTaken).some((x) => x.startsWith("zh ")));
const untrimmed = planted("for (let fig = money.find(([s, e]) => from > s && from < e); fig;", "for (let fig = money.find(() => false); fig;");
ok("4.3 PLANT · a kept run left starting inside a figure (sw's last two words, \"12,345,000 imehamishwa\") is caught: the figure glued to its word again (2.3), over budget (2.1)",
  gluedToFigure(untrimmed).some((x) => x.startsWith("sw ") && x.includes('"TZS 12,345,000 imehamishwa"')) && measure(untrimmed).over.some((x) => x.startsWith("sw ") && x.includes("TZS 12,345,000 imehamishwa")));
const bothOut = compileAt(FACTS_REL, SRC.replace(": [...text.matchAll(NUMBER_THEN_NOUN)].filter((m) => !inFigure(m.index ?? 0)).map((m) => m[0]);", ": all(NUMBER_THEN_NOUN);")
  .replace("for (let fig = money.find(([s, e]) => from > s && from < e); fig;", "for (let fig = money.find(() => false); fig;"));
ok("4.4 PLANT · both figure rules out (the base's two bridges): en's \"TZS 12,345,000 carried forward\" one run over budget again — the census finds it",
  measure(bothOut).over.some((x) => x.startsWith("en ") && x.includes("TZS 12,345,000 carried forward")));

/* ══ §5 · A ONE-LETTER WORD NEVER ENDS A LINE ══════════════════════════════════════════════════════════════════════════ */
section("§5 · a one-letter word never ends a line: it is one run with the word after it");
/** Every one-letter word of every line the keeper draws loose — not inside one kept run with the word after it. */
const looseLetters = (k: Keeper) => {
  const found: string[] = [], loose: string[] = [];
  for (const l of LOCALES) for (const { key, fact } of FACT_SET[l]) {
    const runs = kept(k, l, fact).map(textOf);
    for (const m of fact.matchAll(ONE_LETTER)) {
      const phrase = m[0].slice(m[1].length);
      found.push(`${l} ${key}: "${phrase}"`);
      if (!runs.some((r) => r.includes(phrase))) loose.push(`${l} millionea.${key}: "${phrase}" in "${fact}" — runs ${j(runs)}`);
    }
  }
  return { found, loose };
};
const letters = looseLetters(now);
const byLocale = (l: L3) => letters.found.filter((x) => x.startsWith(`${l} `)).length;
console.log(`  one-letter words: en ${byLocale("en")}, sw ${byLocale("sw")}, zh ${byLocale("zh")} — ${letters.found.filter((x) => x.startsWith("en ")).slice(0, 8).join(" · ")} …`);
ok(`5.1 · every one-letter word of every line is one run with the word after it (${letters.found.length} in the census: en ${byLocale("en")}, sw ${byLocale("sw")}, zh ${byLocale("zh")})`,
  byLocale("en") > 10 && letters.loose.length === 0, letters.loose.join(" | "));
// The keeper without the rule: what §5.2 compares against, and §5.4's plant.
const noLetter = planted("const ranges = mergeRanges([...kept, ...money, ...oneLetterRanges(text)]);", "const ranges = mergeRanges([...kept, ...money]);");
const swzhMoved: string[] = [], enMoved: string[] = [];
let enChanged = 0;
for (const l of LOCALES) for (const { key, fact } of FACT_SET[l]) {
  const was = j(kept(noLetter, l, fact).map(textOf)), is = j(kept(now, l, fact).map(textOf));
  if (was === is) continue;
  if (l !== "en") swzhMoved.push(`${l} millionea.${key}: ${was} → ${is}`);
  else if (!hasOneLetter(fact)) enMoved.push(`en millionea.${key}: ${was} → ${is}`);
  else enChanged++;
}
ok(`5.2 · Swahili and Chinese are untouched — every sw and zh line keeps exactly the runs it kept without the rule — and an English line moves only where a one-letter word stands (${enChanged} en facts)`,
  swzhMoved.length === 0 && enMoved.length === 0 && enChanged > 0, [...swzhMoved, ...enMoved].join(" | "));
const howOne = fill(T.en.millionea.howOne, { price: formatTzs(1_000) });
const howRuns = kept(now, "en", howOne).map((r) => ({ run: textOf(r), w: +widthOf(r).toFixed(1) }));
console.log(`  the hub's intro (howOne, en): ${j(howRuns)}`);
ok(`5.3 · the hub's intro holds "A ticket" as one run ("…5 reserve. A" / "ticket is…" can no longer be drawn), ${howRuns.find((r) => r.run.includes("A ticket"))?.w}px`,
  howRuns.some((r) => r.run === "A ticket"), j(howRuns));
const loosePlanted = looseLetters(noLetter).loose;
ok(`5.4 PLANT · the rule taken out of the keeper: 5.1 reads ${loosePlanted.length} loose letters again (the rest the platform's last two words hold), the hub's "A ticket" among them`,
  loosePlanted.some((x) => x.startsWith("en millionea.howOne:") && x.includes('"A ticket"')), loosePlanted.join(" | "));

console.log(`\n${"═".repeat(70)}\n  MASWALI FACTS: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run printed (12; §5 brought it to 16). */
const MIN_ASSERTIONS = 16;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
