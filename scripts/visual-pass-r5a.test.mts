/**
 * ROUND 5 OF THE VISUAL PASS, HELPER A (2026-10-09) — the home, the cards, /markets, /results, the legal pages, the footer,
 * the hub, the channels panel and the capture harness: every fix held, each beside a control or a plant that proves the
 * check can fail.
 *
 *   npx tsx scripts/visual-pass-r5a.test.mts        (npm run test:visual-pass-r5a)
 *
 * The owner's rules (Ali): only perfect visual and logical results (2026-10-08); consistency and perfection in each move —
 * a finding is fixed with every sibling it has (2026-10-09). The findings, their tiles and measurements are in
 * S/visual/triage-r5.md; the measuring scripts in S/r5a (S = the session scratchpad).
 *   §1  F2  the featured card hangs from the claim's capitals at every desktop width, in both shells
 *   §2  F12 a count line says its noun in the sentence word, grouped — never a capitalised label mid-line
 *   §3  F16 a legal title never leaves its last word alone behind a connective
 *   §4  F15 a pool floor is written as money ("TZS 10K+"), from the floor the filter applies
 *   §5  F17 one page, one name: every hub row, and the journey's other doors, against the page they open
 *   §6  F18 the Gaming Board's name is one name wherever its line can hold it
 *   §7  F19 a right-aligned tracked label ends where its neighbours end
 *   §8  F20 one convention for every close ✕: on its title's first-line capitals, 16px inside a dialog's edge
 *   §9  F5  the capture harness parks the pointer before every shot
 *   §10 §A5 /results withholds its search and bar over an empty archive
 *   §11 the checks: /markets' 34px, the hub's two glyphs, the chart's deadline, the grid card's pool word, two by-design
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { keepLastWords, keepRegulator } from "../src/components/ui/keep-words.tsx";
import { legalTitle } from "../src/app/legal/_components.tsx";
import { hubRowsFor, HUB_WORDS, hubWord, type HubGroup, type HubRow } from "../src/components/journey/account/hub-rows.ts";
import { PublicFooter } from "../src/components/layout/public-footer.tsx";
import { I } from "../src/components/ui/glyphs.tsx";
import { POOL_FLOORS } from "../src/lib/markets/discovery.ts";
import { CloseX } from "../src/components/ui/modal.tsx";
import { stakeChipLabel } from "../src/components/updown/stake-math.ts";
import { formatTzsCompact } from "../src/lib/utils.ts";
import { sideWordIn } from "../src/lib/side-label.ts";
import { dict as DICTS, DEFAULT_LOCALE } from "../src/lib/i18n-dict.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS_RAW = raw("src/app/globals.css");
const CSS = decommentCss(CSS_RAW);
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const squash = (s: string) => s.replace(/\s+/g, " ");
const show = (o: unknown) => JSON.stringify(o);
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(DICTS[l], p) ?? "");

/** One rule's declarations, by its exact selector (or one member of a selector list) at the start of a line. */
function rule(src: string, selector: string): string {
  const m = new RegExp(`(?:^|\\n)\\s*(?:[^{}\\n]*,\\s*)?${esc(selector)}(?![\\w-])\\s*(?:,[^{}\\n]*)?\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** The body of the first `@media (<cond>) { … }` block that mentions `needle`. */
function mediaBlock(src: string, cond: string, needle: string): string {
  const opener = `@media (${cond}) {`;
  let pos = src.indexOf(opener);
  while (pos >= 0) {
    let depth = 0, i = pos + opener.length - 1;
    for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}" && --depth === 0) break; }
    const body = src.slice(pos + opener.length, i);
    if (body.includes(needle)) return body;
    pos = src.indexOf(opener, i);
  }
  return "";
}
/** :root's px custom properties. */
const ROOT_PX: Record<string, number> = {};
for (const m of CSS_RAW.matchAll(/(--(?:sp|type|h-control|r)-[a-z0-9-]+):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);
const px = (v: string) => ROOT_PX[v] ?? NaN;
const TW = raw("tailwind.config.ts");
/** A step of this repo's OVERRIDDEN spacing scale; the stock keys it leaves alone (2.5, 3.5) are Tailwind's rem steps. */
const twStep = (k: string) => {
  const own = new RegExp(`"${esc(k)}":\\s*"([0-9.]+)px"`).exec(TW)?.[1];
  if (own) return Number(own);
  const stock: Record<string, number> = { "2.5": 10, "3.5": 14 };
  return stock[k] ?? NaN;
};
/** A margin utility's signed px — a scale step ("-mt-1" → −4) or an arbitrary px ("mt-[2.8px]" → 2.8) — 0 when absent. */
const margin = (cls: string, side: string) => {
  const m = new RegExp(`(?:^|\\s)(-?)${side}-(?:\\[([0-9.]+)px\\]|([0-9.]+))(?=\\s|$)`).exec(cls);
  return m ? (m[1] ? -1 : 1) * (m[2] !== undefined ? Number(m[2]) : twStep(m[3])) : 0;
};

// Font metrics: Next's capsize table (the faces next/font loads), and the repo's own TTFs for advances.
const CAPSIZE = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { capHeight: number; ascent: number; descent: number; unitsPerEm: number }>;
/** Where a face's capitals are centred below the top of a line of height `lh` (em): half-leading + ascent − cap/2. */
const capCentreEm = (face: string, lh: number) => {
  const f = CAPSIZE[face];
  const a = f.ascent / f.unitsPerEm, d = -f.descent / f.unitsPerEm, cap = f.capHeight / f.unitsPerEm;
  return (lh - (a + d)) / 2 + a - cap / 2;
};
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => {
    layout: (s: string) => { positions: { xAdvance: number }[] };
    glyphsForString: (s: string) => { advanceWidth: number; bbox: { maxX: number } }[];
    unitsPerEm: number;
  };
};
const interReg = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
const monoReg = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const IDEO = /[㐀-鿿豈-﫿　-〿＀-￯]/;
/** Inter 13px with `text-body-sm`'s −0.05px tracking; an ideograph is 1em; a zero-width space is nothing. */
const interW = (s: string, size = 13, track = -0.05) => {
  const chars = [...s].filter((c) => c !== "​");
  const ideo = chars.filter((c) => IDEO.test(c)).length;
  const latin = chars.filter((c) => !IDEO.test(c)).join("");
  const adv = latin ? interReg.layout(latin).positions.reduce((a, p) => a + p.xAdvance, 0) / interReg.unitsPerEm * size : 0;
  return adv + ideo * size + track * chars.length;
};

/* ══ §1 · F2 · THE FEATURED CARD ON THE CLAIM'S CAPITALS ══════════════════════════════════════════════════════════ */
section("1 · F2 · the featured card hangs from the claim's capitals at 1024–1280, both shells (tiles 018–112, 002–012)");
{
  const heroGrid = (css: string) => {
    const m1024 = mediaBlock(css, "min-width: 1024px", ".kp-hero__card {");
    const inner = rule(m1024, ".kp-hero__inner");
    return {
      rows: /grid-template-rows:\s*auto 1fr;/.test(inner),
      start: /align-items:\s*start;/.test(inner) && !/align-items:\s*center/.test(inner),
      noEnd: !/\.kp-hero__intro\s*\{\s*align-self:\s*end/.test(m1024),
      latin: Number(/margin-top:\s*([0-9.]+)px/.exec(rule(m1024, ".kp-hero__card"))?.[1]),
      zh: Number(/margin-top:\s*([0-9.]+)px/.exec(rule(m1024, ":lang(zh) .kp-hero__card"))?.[1]),
    };
  };
  const g = heroGrid(CSS);
  ok("1.1 · from 1024 the intro's row is its own height and the act's takes the rest (`auto 1fr`), and every block hangs from its row's top — so the claim always starts on the grid's top line, a card taller than the column included",
    g.rows && g.start && g.noEnd, show(g));
  // The claim's capitals, from its own CSS and JetBrains Mono's metrics.
  const claim = rule(CSS, ".kp-hero__claim-text");
  const size = px("--type-small"), lh = Number(/line-height:\s*([0-9.]+)/.exec(claim)?.[1]);
  const J = CAPSIZE.jetBrainsMono, a = J.ascent / J.unitsPerEm, d = -J.descent / J.unitsPerEm, cap = J.capHeight / J.unitsPerEm;
  const capTop = ((lh - (a + d)) / 2 + a - cap) * size;
  ok(`1.2 · the card's edge stands ${g.latin}px under the claim's line: its capitals start ${capTop.toFixed(3)}px down (13px mono, 1.35 line) — hinted, on that line's 4th pixel row`,
    claim.includes("font-size: var(--type-small)") && lh === 1.35 && size === 13 && Math.abs(capTop - 3.965) < 0.005 && g.latin === Math.floor(capTop), show({ claim, capTop }));
  ok("1.2′ · Chinese: 2px — the CJK face's ink starts a row above the Latin capitals on every zh tile (y192 / y123)", g.zh === 2);
  // The tiles (S/r5a/f2-sweep.ps1, f2zh.ps1): the claim's line top, its first ink row, the card's edge before this round.
  const J0 = 190, C0 = 121;
  const TILES: Array<[string, Loc, number, number]> = [
    ["002 classic sw 1280", "sw", C0, 169], ["004 classic en 1280", "en", C0, 133], ["006 classic zh 1280", "zh", C0, 136],
    ["008 classic sw 1280", "sw", C0, 177], ["010 classic en 1280", "en", C0, 128], ["012 classic zh 1280", "zh", C0, 132],
    ["018 sw 1024", "sw", J0, 222], ["019 sw 1150", "sw", J0, 234], ["020 sw 1280", "sw", J0, 238], ["026 en 1024", "en", J0, 202],
    ["027 en 1150", "en", J0, 196], ["028 en 1280", "en", J0, 202], ["034 zh 1024", "zh", J0, 208], ["035 zh 1150", "zh", J0, 199],
    ["036 zh 1280", "zh", J0, 205], ["038 sw 1280", "sw", J0, 246], ["040 en 1280", "en", J0, 197], ["042 zh 1280", "zh", J0, 201],
    ["048 sw 1024", "sw", J0, 231], ["049 sw 1150", "sw", J0, 243], ["050 sw 1280", "sw", J0, 246], ["056 en 1024", "en", J0, 210],
    ["057 en 1150", "en", J0, 191], ["058 en 1280", "en", J0, 197], ["064 zh 1024", "zh", J0, 217], ["065 zh 1150", "zh", J0, 194],
    ["066 zh 1280", "zh", J0, 201], ["071 sw 1024", "sw", J0, 231], ["073 en 1024", "en", J0, 210], ["075 zh 1024", "zh", J0, 217],
    ["078 sw 1024", "sw", J0, 231], ["079 sw 1280", "sw", J0, 246], ["082 en 1024", "en", J0, 210], ["083 en 1280", "en", J0, 210],
    ["086 zh 1024", "zh", J0, 217], ["087 zh 1280", "zh", J0, 201], ["090 sw 1024", "sw", J0, 244], ["091 sw 1280", "sw", J0, 259],
    ["095 en 1024", "en", J0, 223], ["096 en 1280", "en", J0, 223], ["099 zh 1024", "zh", J0, 230], ["100 zh 1280", "zh", J0, 227],
    ["103 sw 1024", "sw", J0, 231], ["104 sw 1280", "sw", J0, 246], ["107 en 1024", "en", J0, 210], ["108 en 1280", "en", J0, 197],
    ["111 zh 1024", "zh", J0, 217], ["112 zh 1280", "zh", J0, 201],
  ];
  const inkTop = (l: Loc, top: number) => top + (l === "zh" ? 2 : 3); // measured: y193 / y124 Latin, y192 / y123 zh
  const after = (l: Loc, top: number, css = g) => top + (l === "zh" ? css.zh : css.latin);
  const missed = TILES.filter(([, l, top]) => after(l, top) !== inkTop(l, top)).map(([n]) => n);
  const before = TILES.map(([, l, top, card]) => card - inkTop(l, top));
  ok(`1.3 · on all ${TILES.length} desktop home tiles the card's edge lands on the claim's first ink row (it stood ${Math.min(...before)}–${Math.max(...before)}px from it)`,
    missed.length === 0 && Math.min(...before) === -2 && Math.max(...before) === 66, missed.join(", "));
  const centred = heroGrid(CSS.replace(/grid-template-rows: auto 1fr;\s*(grid-template-areas: "intro card" "act card";)/, "$1")
    .replace(/(row-gap: var\(--sp-8\);\s*)align-items: start;/, "$1align-items: center;")
    .replace(".kp-hero__card { margin-top: 3px; }", ".kp-hero__intro { align-self: end; } .kp-hero__card { margin-top: 3px; }"));
  ok("1.3′ PLANT · the card centred on the column again (round 4's rule) is reported", !(centred.rows && centred.start && centred.noEnd));
  const unhinted = { ...g, latin: Math.round(capTop) };
  ok(`1.3″ PLANT · the unhinted ${Math.round(capTop)}px is reported: the edge one row under the capitals`, TILES.some(([, l, t]) => after(l, t, unhinted) !== inkTop(l, t)));
  ok("1.4 · the loading ghost wears the same `.kp-hero__card` box, so it lands where the page does",
    read("src/components/journey/route-ghost.tsx").includes('<div className="kp-hero__card">'));
}

/* ══ §2 · F12 · THE COUNT LINES ════════════════════════════════════════════════════════════════════════════════════ */
section("2 · F12 · a count line: the grouped count and the sentence word (tile 170: \"⚇ 2 Watabiri\")");
{
  const res = read("src/app/results/page.tsx");
  ok("2.1 · the /results spotlight says \"2 watabiri\" as the cards do: `formatNumber`, `predictorsCount` / `predictorsCountOne`",
    res.includes("{formatNumber(m.predictorCount)} {m.predictorCount === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}")
      && !/\{m\.predictorCount\}\s*\{t\.market\.predictors\}/.test(res));
  ok("2.2 · …and the page's tally groups its count: \"12,479 imetatuliwa\" (production's archive), `data-result-count` still the bare integer",
    res.includes("{formatNumber(totalCount)} {t.results.resolved}") && res.includes("data-result-count={totalCount}"));
  const card = read("src/components/markets/market-card.tsx");
  ok("2.3 · the card's count line groups with `formatNumber`, not the runtime locale's `toLocaleString()`",
    card.includes("<b>{formatNumber(predictors)}</b>") && !card.includes("predictors.toLocaleString()"));
  const lb = read("src/app/leaderboard/page.tsx");
  ok("2.4 · the leaderboard's row: the sentence key (`results.resolved`), never a column label lower-cased in code",
    lb.includes("{formatNumber(r.resolved)} {t.results.resolved}") && !lb.includes("tableResolved.toLowerCase()"));
  ok("2.4′ CONTROL · …which reads exactly as before in every language (the label lower-cased IS the sentence word)",
    LOCALES.every((l) => word(l, "leaderboard.tableResolved").toLowerCase() === word(l, "results.resolved")));
  ok("2.5 CONTROL · the premise: the column label is capitalised, the count words are not (sw and en)",
    ["sw", "en"].every((l) => /^\p{Lu}/u.test(word(l as Loc, "market.predictors")) && /^\p{Ll}/u.test(word(l as Loc, "market.predictorsCount"))
      && /^\p{Ll}/u.test(word(l as Loc, "market.predictorsCountOne"))));
  // The population: every player source line that writes a count and then a dictionary word.
  const files: string[] = [];
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) { if (!/admin/.test(f)) walk(p); } else if (/\.tsx?$/.test(f) && !/i18n-dict/.test(f)) files.push(p); } };
  walk("src/app"); walk("src/components");
  const COUNT = /count|Count|length|total|Total|formatNumber|toLocaleString|predictor|\d/;
  const capitalMidLine = (src: string) => {
    const hits: string[] = [];
    for (const m of src.matchAll(/\{([^{}]{1,80})\}(?:\s|\{" "\})+\{t\.(\w+)\.(\w+)\}/g)) {
      if (!COUNT.test(m[1])) continue;
      if (["sw", "en"].some((l) => /^\p{Lu}/u.test(word(l as Loc, `${m[2]}.${m[3]}`)))) hits.push(`{${m[1]}} t.${m[2]}.${m[3]}`);
    }
    return hits;
  };
  const found = files.flatMap((f) => capitalMidLine(read(f)).map((x) => `${f}: ${x}`));
  ok(`2.6 · not one of ${files.length} player files writes a count followed by a capitalised label`, found.length === 0, found.join(" · "));
  ok("2.6′ PLANT · the spotlight's line as it shipped is found", capitalMidLine("<span>{m.predictorCount} {t.market.predictors}</span>").length === 1);
}

/* ══ §3 · F16 · THE LEGAL TITLES ═══════════════════════════════════════════════════════════════════════════════════ */
section("3 · F16 · a legal title never leaves its last word alone behind a connective (tile 210: \"Kanuni za / Michezo\")");
{
  // Every legal title, from the pages' own records (the yes-no title is the sides' words, `sideWordIn`).
  const titles: Array<[string, Loc, string]> = [];
  for (const p of ["terms", "privacy", "responsible-gambling", "aml", "rules", "rules/up-down"]) {
    const block = /const TITLE: Record<Locale, string> = \{([\s\S]*?)\};/.exec(raw(`src/app/legal/${p}/page.tsx`))?.[1] ?? "";
    for (const m of block.matchAll(/\b(en|sw|zh):\s*"([^"]*)"/g)) titles.push([p, m[1] as Loc, m[2]]);
  }
  for (const l of LOCALES) {
    const yes = sideWordIn(l, "YES", "MARKET"), no = sideWordIn(l, "NO", "MARKET");
    titles.push(["rules/yes-no", l, l === "sw" ? `Kanuni za Masoko ya ${yes}/${no}` : l === "zh" ? `${yes}/${no} 市场规则` : `${yes}/${no} Market Rules`]);
    titles.push(["agent-terms", l, word(l, "agent.termsTitle")]);
  }
  ok(`3.1 · every legal title is read: ${titles.length} (8 documents × 3 languages)`, titles.length === 24, show(titles.map((x) => x[2])));
  ok("3.2 · the legal header passes its title through `legalTitle`", read("src/app/legal/_components.tsx").includes("title={legalTitle(title)}"));
  const pairOf = (node: ReturnType<typeof legalTitle>) => /<span class="whitespace-nowrap">([^<]*)<\/span>/.exec(html(h("h1", null, node)))?.[1] ?? null;
  // Measured in Sora 700 at 28px with the h1's −0.56px tracking (S/r5a/sora-w.cjs, the woff2 next/font serves; within 2px
  // of tiles 206–210). The narrowest title line: 320 − 32 (the page) − 2 (border) − 48 (px-5) − 40 (sigil) − 14 = 184px.
  const WIDTH: Record<string, number> = { "za Michezo": 153.2, "ya Huduma": 155.6, "ya Faragha": 147.0, "of Service": 139.1, "ya wakala": 135.5, "na KYC": 98.1, "na Chini": 113.9 };
  const narrow = 320 - 2 * twStep("3") - 2 - 2 * twStep("5") - 40 - twStep("3.5");
  const bound = titles.map(([p, l, s]) => [`${p}.${l}`, pairOf(legalTitle(s))] as const);
  const EXPECT: Record<string, string> = {
    "rules.sw": "za Michezo", "terms.en": "of Service", "terms.sw": "ya Huduma", "privacy.sw": "ya Faragha",
    "agent-terms.sw": "ya wakala", "aml.sw": "na KYC", "rules/up-down.sw": "na Chini",
  };
  const wrong = bound.filter(([k, pair]) => (EXPECT[k] ?? null) !== pair);
  ok("3.3 · exactly the connective endings are bound — \"Kanuni / za Michezo\", \"Terms / of Service\", \"Sera / ya Faragha\" … — and no name is split (Up & Down, Mchezo Salama, NDIO/HAPANA stay free)",
    wrong.length === 0 && narrow === 184, show({ wrong, narrow }));
  const tooWide = bound.filter(([, pair]) => pair !== null && !(pair in WIDTH && WIDTH[pair] <= narrow));
  ok(`3.4 · every bound pair is measured and fits the narrowest title line (${narrow}px): the widest, "ya Huduma", 155.6px`, tooWide.length === 0, show(tooWide));
  const column390 = 390 - 2 * twStep("3") - 2 - 2 * twStep("5") - 40 - twStep("3.5");
  ok(`3.5 CONTROL · "Kanuni za Michezo" (256.7px) is ${(256.7 - column390).toFixed(1)}px wider than its ${column390}px line at 390 — the wrap the tile shows — and fits at 412 (${column390 + 22}px)`,
    column390 === 254 && 256.7 > column390 && 256.7 <= column390 + 22);
  const always = titles.map(([p, l, s]) => [`${p}.${l}`, pairOf(keepLastWords(s))] as const).filter(([, pair]) => pair !== null && !(pair in WIDTH && WIDTH[pair] <= narrow));
  ok(`3.5′ PLANT · binding EVERY last pair (plain keepLastWords) is reported: ${always.length} pairs would overflow or are unmeasured (Mchezo Salama 216px, Gambling Policy 229px …)`, always.length > 0, show(always));
  const none = titles.map(([p, l, s]) => [`${p}.${l}`, pairOf(s)] as const).filter(([k, pair]) => (EXPECT[k] ?? null) !== pair);
  ok("3.5″ PLANT · the title passed through untouched is reported (\"Kanuni za / Michezo\" again)", none.length > 0);
}

/* ══ §4 · F15 · THE POOL FLOORS ════════════════════════════════════════════════════════════════════════════════════ */
section("4 · F15 · a pool floor is a sum, written as one (tile 194: \"TZS 10k+\" in the sans)");
{
  const bar = read("src/components/markets/discovery-bar.tsx");
  const money = (src: string) =>
    src.includes('const poolFloor = (p: Exclude<PoolId, "any">) => <span className="amount">{formatTzsCompact(POOL_FLOORS[p])}+</span>;')
      && /"10k":\s*poolFloor\("10k"\)/.test(src) && /"50k":\s*poolFloor\("50k"\)/.test(src) && !/t\.market\.pool(10|50)k/.test(src);
  ok("4.1 · each floor's chip is the floor itself (`POOL_FLOORS`, what `matchesPool` tests) through the money formatter, set as money (`.amount`)", money(bar));
  ok("4.1′ PLANT · the dictionary's own strings back on the chips are reported", !money(bar.replace('"10k": poolFloor("10k")', '"10k": t.market.pool10k')));
  const labels = (["10k", "50k"] as const).map((p) => `${formatTzsCompact(POOL_FLOORS[p])}+`);
  ok(`4.2 · they read ${labels.join(" / ")} — the capital K of every compact sum ("${formatTzsCompact(49_000)}" over the bar)`,
    labels[0] === "TZS 10K+" && labels[1] === "TZS 50K+" && formatTzsCompact(49_000) === "TZS 49K");
  ok("4.2′ CONTROL · the premise: the dictionary writes \"TZS 10k+\" / \"TZS 50k+\", a lower-case k, in all three languages",
    LOCALES.every((l) => word(l, "market.pool10k") === "TZS 10k+" && word(l, "market.pool50k") === "TZS 50k+"));
  ok("4.3 · `.amount` is the money face: mono, tabular, untracked, whole", /\.amount\.amount \{ font-family: var\(--font-mono\); font-variant-numeric: tabular-nums; letter-spacing: 0; white-space: nowrap; \}/.test(CSS));
  // The siblings: every other money chip already writes a capital K in the mono face.
  const field = read("src/components/wallet/amount-field.tsx");
  ok("4.4 · siblings already in the convention: the deposit/withdraw quick chips (\"10K\", mono) and Up & Down's stake chips (\"10K\", mono)",
    field.includes("v >= 1_000 ? `${v / 1_000}K`") && /font-mono text-\[11\.5px\] font-bold tabular-nums/.test(field)
      && stakeChipLabel(10_000) === "10K" && read("src/components/updown/round-stake-panel.tsx").includes("font-mono text-[11px] font-semibold tabular-nums"));
}

/* ══ §5 · F17 · ONE PAGE, ONE NAME ═════════════════════════════════════════════════════════════════════════════════ */
section("5 · F17 · one page, one name — the hub's rows and the journey's doors (tile 331: \"Thibitisha ID\")");
{
  const member = { signedIn: true as const, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: false, proposalsState: "OPEN" as const,
    doors: { inviteVisible: true, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } };
  const rows = [...hubRowsFor({ signedIn: false }), ...hubRowsFor(member as never)].flatMap((g: HubGroup) => g.rows).filter((r): r is Extract<HubRow, { kind: "link" }> => r.kind === "link");
  const labelOf = (id: string) => rows.find((r) => r.id === id)?.label ?? null;
  // Round 6 (2026-10-09, review C13): the KYC row says the page's tab and eyebrow ("Uthibitisho wa kitambulisho"), the name
  // every state of the page carries — its h1 is a headline that changes with the reader's state, as /help's and the
  // leaderboard's are (and those rows say the tab too). R5-A had named it after the h1 ("Thibitisha kitambulisho").
  const NOW = { kyc: "profile.kycIdentityVerification", leaderboard: "leaderboard.title", proposals: "proposals.title", privacy: "common.consentMore" } as const;
  const OLD = ["common.verifyId", "common.leaderboard", "common.proposeEarn", "footer.privacyNotice"];
  ok("5.1 · the four rows take their pages' words: KYC, the leaderboard, the proposals page, the privacy policy",
    Object.entries(NOW).every(([id, k]) => labelOf(id) === k) && Object.values(NOW).every((k) => (HUB_WORDS as readonly string[]).includes(k))
      && OLD.every((k) => !(HUB_WORDS as readonly string[]).includes(k)), show(Object.keys(NOW).map((id) => [id, labelOf(id)])));
  // …and those words ARE the pages' own: their h1, their eyebrow, their <title>.
  const kyc = read("src/app/profile/kyc/page.tsx"), lb = read("src/app/leaderboard/page.tsx"), props = read("src/app/proposals/page.tsx");
  const privacyTitle = Object.fromEntries([...(/const TITLE: Record<Locale, string> = \{([\s\S]*?)\};/.exec(raw("src/app/legal/privacy/page.tsx"))?.[1] ?? "").matchAll(/\b(en|sw|zh):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
  ok("5.2 · …and they are the pages' own names: the KYC page's <title> and eyebrow, the leaderboard's eyebrow and <title>, the proposals' eyebrow and h1, the privacy page's title (in every language)",
    kyc.includes("return { title: t.profile.kycIdentityVerification };") && kyc.includes("eyebrow={t.profile.kycIdentityVerification}")
      && lb.includes("const title = t.leaderboard.title;") && lb.includes("<PageHeader eyebrow={t.leaderboard.title}")
      && props.includes('<h1 className="sr-only">{t.proposals.title}</h1>') && props.includes("eyebrow={t.proposals.title}")
      && LOCALES.every((l) => privacyTitle[l]?.toLowerCase() === word(l, "common.consentMore").toLowerCase()), show(privacyTitle));
  ok("5.2′ CONTROL · the words did differ: \"Thibitisha ID\" against \"Uthibitisho wa kitambulisho\", \"Jedwali la Washindi\" against \"Bingwa\", \"Propose & earn\" against \"Market Proposals\", \"Privacy notice\" against \"Privacy policy\"",
    word("sw", "common.verifyId") !== word("sw", "profile.kycIdentityVerification") && word("sw", "common.leaderboard") !== word("sw", "leaderboard.title")
      && word("en", "common.proposeEarn") !== word("en", "proposals.title") && word("en", "footer.privacyNotice") !== word("en", "common.consentMore"));
  const menu = squash(read("src/components/layout/avatar-menu.tsx"));
  // Round 6 (reviews C1, C13): the map gained the invite row's one name and the KYC row the page's tab.
  ok("5.3 · the journey's avatar menu names the three pages the same way (classic rows keep their words)",
    menu.includes('const journeyName: Partial<Record<string, string>> = journey ? { "/profile/kyc": t.profile.kycIdentityVerification, "/leaderboard": t.leaderboard.title, "/proposals": t.proposals.title, "/profile/invite": inviteName(t, { agent: inviteAgent, paid: invitePaid }), } : {};'));
  const props0 = { proposalsState: "COMING_SOON" as const, agentDoorVisible: true, inviteVisible: true, supportEmail: "desk@example.test", supportPhone: "0700000000", supportPhoneTel: "+255700000000" };
  const classic = text(html(h(PublicFooter, props0))), journey = text(html(h(PublicFooter, { ...props0, journeyShown: true })));
  const W = (p: string) => word(DEFAULT_LOCALE as Loc, p);
  ok(`5.4 · the journey's footer names /proposals, /legal/privacy and /help as they name themselves (${DEFAULT_LOCALE}: "${W("proposals.title")}", "${W("common.consentMore")}", "${W("common.help")}")`,
    journey.includes(W("proposals.title")) && journey.includes(W("common.consentMore")) && !journey.includes(W("footer.privacyNotice")) && !journey.includes(W("footer.proposeGetPaid"))
      // the help link's words coincide in Swahili ("Msaada"), so its switch is read from the source
      && read("src/components/layout/public-footer.tsx").includes("{journeyShown ? t.common.help : t.footer.helpSupport}"));
  ok("5.4′ CONTROL · the classic footer keeps its words (frozen chrome)",
    classic.includes(W("footer.proposeGetPaid")) && classic.includes(W("footer.privacyNotice")) && classic.includes(W("footer.helpSupport")) && !classic.includes(W("proposals.title")));
  ok("5.5 · the profile page's KYC row and /live's eyebrow (page and ghost) use the page's own word",
    read("src/app/profile/page.tsx").includes("title={t.profile.kycIdentityVerification}") && !read("src/app/profile/page.tsx").includes("t.common.verifyId")
      && ["src/app/live/page.tsx", "src/app/live/loading.tsx"].every((f) => read(f).includes('eyebrow font-bold text-text">{t.common.live}</p>') && !read(f).includes("t.home.liveSection")));
  ok("5.5′ CONTROL · /live named itself \"Mubashara\" in its <title> and h1 and \"Hai\" in its eyebrow",
    read("src/app/live/page.tsx").includes("return { title: t.common.live };") && word("sw", "common.live") === "Mubashara" && word("sw", "home.liveSection") === "Hai");
  const harness = raw("scripts/qa-journey-shell.mjs");
  ok("5.6 · the capture harness holds the KYC row to the page's words",
    LOCALES.every((l) => harness.includes(`${l}: '${word(l, "profile.kycIdentityVerification")}'`)) && harness.includes("verifyId: { sw: 'Uthibitisho wa kitambulisho'"));
  // What cannot be fixed by composition: no key holds the rules page's name — an S12 item. This control flips if one is added.
  const allValues = new Set<string>();
  const collect = (o: unknown) => { if (typeof o === "string") allValues.add(o); else if (o && typeof o === "object") Object.values(o).forEach(collect); };
  collect(DICTS);
  ok("5.7 CONTROL · S12: no dictionary key yet holds \"Kanuni za Michezo\" / \"Game Rules\" / \"游戏规则\", so the rules row keeps \"RTP ya mchezo na sheria\"",
    !allValues.has("Kanuni za Michezo") && !allValues.has("Game Rules") && !allValues.has("游戏规则") && labelOf("rules") === "footer.gameRtp");
  const planted = { ...Object.fromEntries(rows.map((r) => [r.id, r.label])), kyc: "common.verifyId" } as Record<string, string>;
  ok("5.1′ PLANT · the KYC row's old key is reported", planted.kyc !== NOW.kyc);
}

/* ══ §6 · F18 · THE GAMING BOARD'S NAME ════════════════════════════════════════════════════════════════════════════ */
section("6 · F18 · the Gaming Board's name is one name wherever its line can hold it (tile 307: \"…the Gaming / Board of Tanzania.\")");
{
  const NAME: Record<Loc, string> = { en: "Gaming Board of Tanzania", sw: "Bodi ya Michezo ya Kubahatisha Tanzania", zh: "坦桑尼亚​博彩委员会" };
  const kept = LOCALES.map((l) => {
    const s = word(l, "footer.licensedByGbt"), mk = html(h("p", null, keepRegulator(s)));
    return { l, span: new RegExp(`<span class="kp-gbt-name">${esc(NAME[l])}</span>`).test(mk), same: text(mk) === s };
  });
  ok("6.1 · `keepRegulator` finds the name in each language's sentence and changes not a character of it", kept.every((k) => k.span && k.same), show(kept));
  // The thresholds: the name and its full stop (no line may start with it) in Inter 13px, plus 3px.
  const need: Record<Loc, number> = { en: interW(`${NAME.en}.`), sw: interW(`${NAME.sw}.`), zh: interW(NAME.zh) };
  const at_ = (name: string, l: Loc) => Number(new RegExp(`@container ${name} \\(min-width: ([0-9.]+)px\\) \\{ \\.kp-gbt-name:lang\\(${l}\\) \\{ white-space: nowrap; \\} \\}`).exec(CSS)?.[1]);
  const trust = rule(CSS, ".kp-hero__trust > li");
  const marker = Number(/grid-template-columns:\s*([0-9]+)px/.exec(trust)?.[1]) + px("--sp-3");
  const th = LOCALES.map((l) => ({ l, need: +need[l].toFixed(1), footer: at_("kp-gbt", l), row: at_("kp-gbt-row", l) }));
  ok(`6.2 · each container keeps the name nowrap only from its width + 2px or more (en ${need.en.toFixed(1)}, sw ${need.sw.toFixed(1)}, zh ${need.zh.toFixed(1)}px); the trust row's own widths add its ${marker}px roundel column`,
    /\.kp-gbt \{ container: kp-gbt \/ inline-size; \}/.test(CSS) && /\.kp-hero__trust > li\.kp-gbt-row \{ container: kp-gbt-row \/ inline-size; \}/.test(CSS)
      && marker === 40 && th.every((t) => t.footer >= t.need + 2 && t.footer <= t.need + 6 && t.row === t.footer + marker), show(th));
  const col = (vw: number) => vw < 768 ? vw - 2 * twStep("3") : vw < 1024 ? (vw - 2 * twStep("3") - 3 * twStep("6")) / 4 : (Math.min(vw, 1280) - 2 * twStep("6") - 3 * twStep("6")) / 4;
  ok(`6.3 · en 1024: the ${col(1024)}px column holds the name (${need.en.toFixed(1)}px) → "Licensed by the" / "Gaming Board of Tanzania."; at 768 (${col(768)}px) no column can, and it wraps as before`,
    col(1024) === 216 && col(1024) >= th[1].footer && interW(word("en", "footer.licensedByGbt")) > col(1024) && col(768) === 160 && col(768) < th[1].footer);
  const classicMk = html(h(PublicFooter, { proposalsState: "COMING_SOON", agentDoorVisible: true, inviteVisible: true, supportEmail: "d@x.t", supportPhone: "0", supportPhoneTel: "+0" }));
  const journeyMk = html(h(PublicFooter, { proposalsState: "COMING_SOON", agentDoorVisible: true, inviteVisible: true, supportEmail: "d@x.t", supportPhone: "0", supportPhoneTel: "+0", journeyShown: true }));
  ok("6.4 · the journey's footer wears it; the classic footer does not (frozen chrome, main's bytes)",
    /class="[^"]*\bkp-gbt\b[^"]*"/.test(journeyMk) && journeyMk.includes('class="kp-gbt-name"') && !classicMk.includes("kp-gbt"));
  const intro = read("src/components/home/hero-intro.tsx");
  ok("6.5 · the hero's trust row (a shared body) keeps the name the same way", intro.includes('<li className="kp-gbt-row">') && intro.includes("<span>{keepRegulator(t.footer.licensedByGbt)}</span>"));
  const lowered = CSS.replace("@container kp-gbt (min-width: 168px)", "@container kp-gbt (min-width: 150px)");
  ok("6.2′ PLANT · a threshold under the name's width (150px for English) is reported — it would overflow a 160px column",
    !(Number(/@container kp-gbt \(min-width: ([0-9.]+)px\) \{ \.kp-gbt-name:lang\(en\)/.exec(lowered)?.[1]) >= need.en + 2));
  ok("6.4′ PLANT · the sentence plain in the journey (no name span) is reported", !html(h("p", null, word("en", "footer.licensedByGbt"))).includes("kp-gbt-name"));
}

/* ══ §7 · F19 · RIGHT-ALIGNED TRACKED LABELS ═══════════════════════════════════════════════════════════════════════ */
section("7 · F19 · a right-aligned tracked label ends where its neighbours end (tile 327: NDIO x355, the rest x357–358)");
{
  const list = /((?:[^{}\n]+,\s*\n)*)\.kp-track-end::after \{ content: ""; display: inline-block; margin-inline-end: calc\(-1 \* var\(--track-end, 0\.14em\)\); \}/.exec(CSS);
  const sels = (list?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = [".mcardp-pctcap::after", ".mcardp-moveline .mcardp-oneside::after", ".tipbar-labels .tb-no::after"];
  ok("7.1 · one take-back for the kind: the price caption, the card's one-sided label on its right-aligned move line, the bar's right side label, `kp-track-end`",
    !!list && want.every((s) => sels.includes(s)), show(sels));
  ok("7.1′ PLANT · the price caption left out is reported", !want.every((s) => sels.filter((x) => x !== ".mcardp-pctcap::after").includes(s)));
  // Each take-back equals its label's own tracking.
  const eyebrowList = /((?:[^{}\n]+,\s*\n)+)\.mcardp-pctcap \{ letter-spacing: 0\.14em; \}/.exec(CSS)?.[1] ?? "";
  const res = read("src/app/results/page.tsx"), ud = read("src/app/updown/page.tsx");
  ok("7.2 · each takes back exactly its own tracking: 0.14em (the caption and the one-sided label), 0.05em (the bar's labels), 0.16em (the spotlight's flag), 0.10em (Up & Down's live note)",
    eyebrowList.includes(".mcardp-oneside,") && /letter-spacing:\s*0\.05em/.test(rule(CSS, ".tipbar-labels")) && /\.tipbar-labels \.tb-no \{ --track-end: 0\.05em; \}/.test(CSS)
      && /--track-end:\s*0\.16em/.test(rule(CSS, ".kp-track-end--16")) && /--track-end:\s*0\.10em/.test(rule(CSS, ".kp-track-end--10"))
      && res.includes("uppercase tracking-[0.16em] font-bold text-brand-300") /* the ink R5-C's gold audit gave the flag (merged 2026-10-09) */ && res.includes('<I.crown s={13} /> <span className="kp-track-end kp-track-end--16">{t.results.notableResult}</span>')
      && ud.includes("uppercase tracking-[0.10em] text-text-faint") && ud.includes('<span className="live-dot" /> <span className="kp-track-end kp-track-end--10">{t.market.udStreaming}</span>'));
  ok("7.3 · the one-sided label keeps its tracking where it is centred or left-aligned (the market page, /results, Up & Down)",
    !/(^|\n)\s*\.mcardp-oneside::after/.test(CSS) && read("src/app/results/page.tsx").includes('<p className="mt-1.5 flex justify-center"><span className="mcardp-oneside">'));
  // The prediction, from JetBrains Mono: the caption's O ends its cell 0.84px in; the trailing tracking was 1.33px.
  const O = monoReg.glyphsForString("O")[0];
  const rsb = (O.advanceWidth - O.bbox.maxX) / monoReg.unitsPerEm * 9.5, track = 0.14 * 9.5, edge = 358;
  ok(`7.4 · "NDIO" ended at ${(edge - track - rsb).toFixed(2)} (the tile: x355); it ends at ${(edge - rsb).toFixed(2)} (x357, on the time left's and the bar's edge) — what remains is the O's own ${rsb.toFixed(2)}px side bearing, as R3-C left it`,
    Math.floor(edge - track - rsb) === 355 && Math.floor(edge - rsb) === 357);
}

/* ══ §8 · F20 · ONE CONVENTION FOR EVERY CLOSE ✕ ═══════════════════════════════════════════════════════════════════ */
section("8 · F20 · every close ✕ of a panel, a sheet or a dialog: on its title's first-line capitals (channels panel 1.7px off)");
{
  const sora = (lh: number) => capCentreEm("sora", lh);
  const MOD = read("src/components/ui/modal.tsx");
  const BOX = twStep("8");
  const cornerCentre = twStep("3") + BOX / 2;
  ok(`8.1 · Modal pins its ✕'s ${BOX}px box at the corner — its centre ${cornerCentre}px under the panel's padding edge — and CloseX is the one ✕ (exported, 16px glyph)`,
    MOD.includes('{showClose && <CloseX onClick={onClose} label={t.common.close} className="absolute right-3 top-3" />}') && MOD.includes("export function CloseX(")
      && /className=\{`\$\{className\} inline-flex h-8 w-8 items-center justify-center rounded-md/.test(MOD) && /<I\.x s=\{16\} \/>/.test(MOD) && cornerCentre === 40);
  // The corner ✕'s titles: `.kp-modal-title` puts the first line's capitals on it at both of the panel's paddings.
  const mt = rule(CSS, ".kp-modal-title"), lgMt = rule(mediaBlock(CSS, "min-width: 1024px", ".kp-modal-title"), ".kp-modal-title");
  const pad = { phone: twStep("5"), lg: twStep("6") };
  const panelPads = MOD.includes("mat-modal relative w-full p-5 lg:p-6");
  const titleCaps = (size: number, padPx: number, sub: number) => padPx + (px("--sp-10") - sub - 0.6 * size) + sora(1.25) * size;
  const callers: Array<[string, string, number]> = [
    ["src/components/markets/market-card.tsx", '<p className="kp-modal-title mb-1.5 font-display text-[13px] font-bold text-text">{t.common.howItWorks}</p>', 13],
    ["src/components/markets/share-button.tsx", '<p className="kp-modal-title mb-2 font-display text-[14px] font-semibold text-text">{t.dialog.shareMarket}</p>', 14],
    ["src/components/markets/objection-dialog.tsx", '<h2 id="objection-title" className="kp-modal-title font-display text-[16px] font-semibold text-text">', 16],
  ];
  const caps = callers.map(([, , s]) => [titleCaps(s, pad.phone, px("--sp-6")), titleCaps(s, pad.lg, px("--sp-8"))]);
  ok(`8.2 · how-it-works, share and objection titles wear .kp-modal-title: their capitals at ${caps.map((c) => c.map((v) => v.toFixed(2)).join("/")).join(", ")}px — the ✕'s ${cornerCentre}`,
    panelPads && /margin-top:\s*calc\(var\(--sp-10\) - var\(--sp-6\) - 0\.6em\)/.test(mt) && /line-height:\s*1\.25/.test(mt) && /padding-right:\s*var\(--sp-12\)/.test(mt)
      && /margin-top:\s*calc\(var\(--sp-10\) - var\(--sp-8\) - 0\.6em\)/.test(lgMt) && Math.abs(sora(1.25) - 0.6) < 1e-9
      && callers.every(([f, s]) => read(f).includes(s)) && caps.flat().every((c) => Math.abs(c - cornerCentre) < 1e-9), show({ mt, lgMt }));
  const before = callers.map(([, , s]) => (pad.phone + sora(1.5) * s).toFixed(1));
  ok(`8.2′ CONTROL · before, on a phone (a 1.5 line at the padding): ${before.join(", ")}px — the ✕ 6.6, 5.9 and 4.4px under them`, before.join() === "33.4,34.1,35.6");
  // ConfirmModal, the sell confirm and the bet confirm: the ✕ in the header row, on the title under its eyebrow.
  const conf = MOD.slice(MOD.indexOf("export function ConfirmModal("));
  const cxCls = /<CloseX withheld=\{loading\} onClick=\{onClose\} label=\{t\.common\.close\} className="([^"]+)" \/>/.exec(conf)?.[1] ?? "";
  const confCaps = 14 + twStep("0.5") + sora(1.25) * 18;
  const cx = { centre: margin(cxCls, "mt") + BOX / 2, occupies: BOX + margin(cxCls, "mt") + margin(cxCls, "mb") };
  ok(`8.3 · ConfirmModal: the ✕ centres ${cx.centre}px down — the 18px title's capitals under its eyebrow (${confCaps.toFixed(2)}) — taking ${cx.occupies}px, the medallion's 38`,
    Math.abs(cx.centre - confCaps) < 0.01 && cx.occupies === 38 && /-mr-1\.5 lg:-mr-3/.test(cxCls), cxCls);
  const scm = read("src/components/markets/sell-confirm-modal.tsx");
  /** The money dialogs' ✕: the one CloseX, withheld while a request is in flight, closing through the guarded close. */
  const GUARDED_X = /<CloseX withheld=\{pending\} onClick=\{\(\) => \{ if \(!pending\) onCancel\(\); \}\} label=\{t\.common\.close\} className="([^"]+)" \/>/;
  const sCls = GUARDED_X.exec(scm)?.[1] ?? "";
  const sellCaps = 14 + twStep("1") + sora(1.375) * 16, sellHead = 14 + twStep("1") + 1.375 * 16;
  const sx = { centre: margin(sCls, "mt") + BOX / 2, occupies: BOX + margin(sCls, "mt") + margin(sCls, "mb"), phone: twStep("5") + margin(sCls, "mr"), lg: twStep("6") - 16 };
  ok(`8.4 · the sell confirm: its ✕ moved from the corner (beside the eyebrow) to the header row — centred ${sx.centre.toFixed(1)}px down, on the question's capitals (${sellCaps.toFixed(2)}); ${sx.occupies.toFixed(1)}px of the header's ${sellHead}; 16px in`,
    /showClose=\{false\}/.test(scm) && scm.includes('import { CloseX, Modal } from "@/components/ui/modal";') && Math.abs(sx.centre - sellCaps) < 0.01
      && Math.abs(sx.occupies - sellHead) < 0.01 && sx.phone === 16 && /lg:-mr-3/.test(sCls), sCls);
  const bcm = read("src/components/markets/bet-confirm-modal.tsx");
  const bCls = GUARDED_X.exec(bcm)?.[1] ?? "";
  ok("8.5 · the bet confirm's ✕ (already on its title's capitals, R4-I) stands 16px inside the panel's edge like every dialog's: 24 − 8 on a phone, 32 − 16 from 1024",
    bcm.includes("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4 lg:px-6") && twStep("5") + margin(bCls, "mr") === 16 && /lg:-mr-3/.test(bCls)
      && margin(bCls, "mt") === 4 && margin(bCls, "mb") === -4, bCls);
  // The follow-up (integrator's review): the bet confirm drew its own ✕ — the box and glyph copied, named "Ghairi" like the
  // Cancel under it, straight to onCancel. It is the one CloseX now, named as every ✕ is, through the guarded close.
  const betIsCloseX = (src: string) => GUARDED_X.test(src) && src.includes('import { CloseX, Modal } from "@/components/ui/modal";')
    && !/<I\.x\b/.test(src) && !/aria-label=\{t\.common\.cancel\}/.test(src);
  ok(`8.5‴ · …and it is the one ✕, CloseX: named "${word("sw", "common.close")}" as every ✕ is (it said "${word("sw", "common.cancel")}", the name of the Cancel under it — two of them to a screen reader), closing through the dialog's guarded close as the sell confirm's does; no ✕ drawn by hand`,
    betIsCloseX(bcm) && word("sw", "common.close") !== word("sw", "common.cancel"));
  const handBet = bcm.replace(GUARDED_X, '<button type="button" onClick={onCancel} aria-label={t.common.cancel} className="mt-1 -mb-1 -mr-1.5 lg:-mr-3 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"><I.x s={16} /></button>');
  ok("8.5⁗ PLANT · round 4's hand-drawn ✕ (its own <button>, \"Ghairi\", straight to onCancel) is reported", handBet !== bcm && !betIsCloseX(handBet));
  // The filter sheet, the channels panel, the install card, the reality check.
  const fs = read("src/components/markets/filter-sheet.tsx");
  const FS_X = /<CloseX onClick=\{close\} label=\{closeLabel\} className="([^"]+)" \/>/;
  const fCls = FS_X.exec(fs)?.[1] ?? "";
  const fx = { centre: margin(fCls, "mt") + BOX / 2, occupies: BOX + margin(fCls, "mt") + margin(fCls, "mb"), inset: px("--sp-5") + margin(fCls, "mr") };
  ok(`8.6 · the filter sheet: ✕ centred ${fx.centre.toFixed(1)}px down the header row — the 16px title's capitals (${(sora(1.25) * 16).toFixed(1)}) — and the row still ${fx.occupies.toFixed(1)}px (it centred 20, 10.4px low)`,
    fs.includes('<h2 id={titleId} className="font-display text-[16px] font-bold leading-tight text-text">') && Math.abs(fx.centre - sora(1.25) * 16) < 0.01 && Math.abs(fx.occupies - 44) < 0.01, fCls);
  const sheetPad = /padding:\s*var\(--sp-3\) var\(--sp-5\) calc\(env\(safe-area-inset-bottom, 0px\) \+ var\(--sp-4\)\);/.test(rule(CSS, ".kp-fsheet-panel"));
  ok(`8.6″ · …and it is the one ✕, CloseX (it drew its own: the same box, glyph and inks), its box ${fx.inset}px inside the sheet's edge — where every dialog's and the guest sheet's stands (it stood ${px("--sp-5") - 16}px in, the glyph on the heading's gutter, the one ✕ placed so)`,
    sheetPad && fx.inset === 16 && fs.includes('import { CloseX, exitBeatMs } from "@/components/ui/modal";') && !/<I\.x\b/.test(fs), show({ fCls, sheetPad, sp5: px("--sp-5") }));
  ok("8.6‴ PLANT · the box back at the screen's edge (`-mr-3`: 4px in) is reported", px("--sp-5") + margin(fCls.replace("-mr-1 ", "-mr-3 "), "mr") !== 16);
  const ch = read("src/components/social/channels-panel.tsx");
  const chOk = (src: string) => src.includes('<div className="flex items-start gap-3">') && src.includes('className="mt-[calc(22px-0.6em)] min-w-0 flex-1 font-display text-body font-semibold leading-tight text-text"')
    && src.includes('className="shrink-0 inline-flex h-[44px] w-[44px] items-center justify-center rounded-md text-text-subtle hover:text-text transition-colors"') && src.includes("<I.x s={16} aria-hidden />")
    && src.includes("Math.max(stack, Math.round(bar + 12))");
  ok(`8.7 · the channels panel: the title's capitals on the 44px box's centre (22 − 0.6em + 0.6em = 22), an even 16px glyph, a whole-pixel top — tiles 320–324 measured the ✕ 1.70px low (cap centre 234.82, ✕ 236.52)`,
    chOk(ch) && Math.abs(236.52 - 234.82 - 1.7) < 0.01);
  ok("8.7′ PLANT · the title centred on the box again (round 4) is reported", !chOk(ch.replace('<div className="flex items-start gap-3">', '<div className="flex items-center gap-3">')));
  const inv = read("src/components/pwa/install-invite.tsx");
  const iCls = /className="(-mt-\[[0-9.]+px\]) shrink-0 inline-flex h-\[44px\] w-\[44px\]/.exec(inv)?.[1] ?? "";
  ok(`8.8 · the install card: its ✕ rises ${-margin(iCls, "mt")}px, centring on the 14px title's capitals (${(sora(1.25) * 14).toFixed(1)}px down the row, where it centred 22), 16px glyph`,
    inv.includes('<p id="install-invite-title" className="font-display text-body font-semibold leading-tight text-text">') && Math.abs(22 + margin(iCls, "mt") - sora(1.25) * 14) < 0.01
      && /<I\.x s=\{16\} aria-hidden \/>/.test(inv), iCls);
  const rc = read("src/components/rg/reality-check.tsx");
  const rRow = /<div className="(-mt-\[[0-9.]+px\] lg:-mt-\[[0-9.]+px\]) flex items-start gap-2\.5 pr-8">/.exec(rc)?.[1] ?? "";
  const rPhone = -Number(/^-mt-\[([0-9.]+)px\]/.exec(rRow)?.[1]), rLg = -Number(/lg:-mt-\[([0-9.]+)px\]/.exec(rRow)?.[1]);
  const rCapsInRow = 20 - 0.625 * 15.5 + sora(1.25) * 15.5;
  ok(`8.9 · the reality check (a position only, no word of the notice): its title's first line hangs from the badge's centre and its capitals land at ${(pad.phone + rPhone + rCapsInRow).toFixed(2)} / ${(pad.lg + rLg + rCapsInRow).toFixed(2)}px — the corner ✕'s 40 (they were 43.6 / 51.6)`,
    rc.includes('className="mt-[calc(20px-0.625em)] font-display text-[15.5px] font-bold leading-tight text-text"')
      && Math.abs(pad.phone + rPhone + rCapsInRow - 40) < 0.05 && Math.abs(pad.lg + rLg + rCapsInRow - 40) < 0.05, rRow);
  /** A JSX opening tag from `at` to its closing `>`, braces and strings respected. */
  const openingTag = (src: string, at: number) => {
    let depth = 0, i = at, q = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
      if (c === '"' || (depth > 0 && (c === "'" || c === "`"))) { q = c; continue; }
      if (c === "{") depth++; else if (c === "}") depth--; else if (c === ">" && depth === 0) break;
    }
    return src.slice(at, i + 1);
  };
  /** One prop's value as written (`{…}` or `"…"`), or null. */
  const propOf = (tag: string, name: string) => {
    const m = new RegExp(`\\s${name}=`).exec(tag);
    if (!m) return null;
    const i = m.index + m[0].length;
    if (tag[i] === '"') return tag.slice(i, tag.indexOf('"', i + 1) + 1);
    let depth = 0, j = i;
    for (; j < tag.length; j++) { if (tag[j] === "{") depth++; else if (tag[j] === "}" && --depth === 0) break; }
    return tag.slice(i, j + 1);
  };
  /** Every `.tsx` under src, its comments out. */
  const SRC: Array<[string, string]> = [];
  const walkAll = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walkAll(p); else if (/\.tsx$/.test(f)) SRC.push([p.replace(/\\/g, "/"), read(p)]); } };
  walkAll("src");
  // THE CENSUS (round 5, widened by the integrator's review): every ✕ glyph in src — admin too — SITE BY SITE, and what it
  // is. "CloseX" is the one ✕ (modal.tsx); "hand ✕" closes the surface it stands on but is drawn by hand, each with why;
  // "row ✕" dismisses a row or clears a field — no surface's close; "glyph" is an ✕ that closes nothing. A new ✕ anywhere
  // fails until it is classified, and a ✕ drawn by hand in a file that hosts a dialog CloseX serves fails outright.
  type Kind = "CloseX" | "hand ✕" | "row ✕" | "glyph";
  const C = (kind: Kind, why: string) => ({ kind, why });
  const CENSUS: Record<string, Array<{ kind: Kind; why: string }>> = {
    "src/components/ui/modal.tsx": [C("CloseX", "the one ✕: Modal's corner, ConfirmModal's, the sell and bet confirms' and the filter sheet's (8.1–8.6)")],
    "src/components/ui/toast.tsx": [C("hand ✕", "a toast's dismiss, no dialog: a 14px glyph and the stack's `data-toast-dismiss` hook; on its title's capitals (8.11)")],
    "src/components/ui/notice-bar.tsx": [C("hand ✕", "a bar's dismiss, no dialog: a 40px box reaching into its 32px row, on its one line")],
    "src/components/wallet/kyc-first-deposit-notice.tsx": [C("hand ✕", "a notice's dismiss, no dialog: centred on the notice (R5-B's wallet; named)")],
    "src/components/social/channels-panel.tsx": [C("hand ✕", "a non-modal card's close, no scrim: its 44px box sets the card's row; on its title's capitals (8.7)")],
    "src/components/pwa/install-invite.tsx": [C("hand ✕", "a non-modal card's close, the channels card's twin: 44px; on its title's capitals (8.8)")],
    "src/components/onboarding/first-visit-primer.tsx": [C("hand ✕", "the primer's SKIP, a 40px box in its step-dots row — no title beside it to stand on")],
    // Round 6 (2026-10-09, review C2) classified the bell's ✕ by its geometry, where R5-A had only named it ("not changed").
    "src/components/layout/notifications-panel.tsx": [C("hand ✕", "the bell panel's close: centred on its title's line and 16px inside the panel — F20's place — in a 40px box with a 13px glyph, CloseX's own proportion (16/48), because it stands in the panel's 44px toolbar beside Read all | Clear all (40px controls), where CloseX's 48px box would outgrow the bar; classic chrome (frozen), and the journey mounts the same panel from 1024"), C("row ✕", "a notification row's dismiss")],
    "src/components/admin/admin-mobile-nav.tsx": [C("hand ✕", "the admin drawer's close — admin chrome, a 44px box")],
    "src/app/notifications/row-actions.tsx": [C("row ✕", "a notification row's delete")],
    // Round 6 (review C2): seen once the census read the ✕ in any spelling — two <line>s inside a circle.
    "src/components/ui/empty-state.tsx": [C("glyph", "`ErrorMark`, an error state's circled ✕ illustration — it closes nothing")],
    "src/components/ui/search-box.tsx": [C("row ✕", "clears the field")],
    "src/components/ui/query-bar.tsx": [C("row ✕", "a link that clears the query, worded beside its ✕")],
    "src/components/ui/date-select.tsx": [C("row ✕", "back to the calendar")],
    "src/app/admin/invites/invite-admin-client.tsx": [C("row ✕", "removes a staged row")],
    "src/components/admin/kyc-review-controls.tsx": [C("row ✕", "removes a document request"), C("glyph", "the rejecting state of a button"), C("glyph", "Reject…")],
    "src/app/admin/approvals/sof-review-client.tsx": [C("glyph", "Reject")],
    "src/app/admin/ai-polls/poll-actions.tsx": [C("glyph", "a refused medallion"), C("glyph", "an error mark")],
    "src/app/admin/aml/aml-actions-client.tsx": [C("glyph", "Reject")],
    "src/app/admin/agents/[id]/doc-grid.tsx": [C("glyph", "a missing document")],
    "src/app/admin/kyc/[id]/kyc-decision-rail.tsx": [C("glyph", "a failed check"), C("glyph", "Reject")],
    "src/app/admin/payments/reconcile-controls.tsx": [C("glyph", "Write off")],
    "src/app/admin/payments/retry-controls.tsx": [C("glyph", "Cancel the payout")],
    "src/app/admin/payments/stuck-payout-controls.tsx": [C("glyph", "Return to player")],
    "src/app/admin/players/[id]/page.tsx": [C("glyph", "a missing document"), C("glyph", "a missing requested document")],
  };
  /**
   * ⭐ THE ✕ IN ANY SPELLING (round 6, 2026-10-09, review C2). The census looked only for the kit glyph (`<I.x`), so two
   * dialogs that drew their ✕ as an <svg> of their own — the Needle drawer (`M6 6l12 12M18 6L6 18`) and the chat panel
   * (`M6 6 L18 18 M18 6 L6 18`) — were invisible to it, and so to its rule that a dialog closes with CloseX. An <svg> whose
   * strokes are exactly one square's two diagonals is a ✕ however it is written: one path or two, absolute or relative,
   * spaced or not, or two <line>s (lucide's and feather's spellings). The glyph's own definition (`glyphs.tsx`) is no site.
   */
  const segmentsOf = (svg: string): number[][] => {
    const segs: number[][] = [];
    for (const m of svg.matchAll(/<path\b[^>]*?\sd=(?:"([^"]*)"|\{"([^"]*)"\})/g)) {
      const toks = (m[1] ?? m[2] ?? "").match(/[MmLlZz]|-?\d*\.?\d+/g) ?? [];
      let cmd = "M", x = 0, y = 0, sx = 0, sy = 0;
      for (let i = 0; i < toks.length;) {
        if (/[A-Za-z]/.test(toks[i])) {
          cmd = toks[i++];
          if (cmd === "Z" || cmd === "z") { segs.push([x, y, sx, sy]); x = sx; y = sy; }
          continue;
        }
        const a = Number(toks[i++]), b = Number(toks[i++]);
        if (cmd === "M" || cmd === "m") { x = cmd === "m" ? x + a : a; y = cmd === "m" ? y + b : b; sx = x; sy = y; cmd = cmd === "m" ? "l" : "L"; }
        else { const nx = cmd === "l" ? x + a : a, ny = cmd === "l" ? y + b : b; segs.push([x, y, nx, ny]); x = nx; y = ny; }
      }
    }
    for (const m of svg.matchAll(/<line\b([^>]*)>/g)) {
      const at = (k: string) => Number(new RegExp(`\\b${k}=(?:"|\\{)([-\\d.]+)`).exec(m[1])?.[1]);
      segs.push([at("x1"), at("y1"), at("x2"), at("y2")]);
    }
    return segs;
  };
  /** Exactly a square's two diagonals: one falling, one rising, over the same span. */
  const isCross = (segs: number[][]) => {
    if (segs.length !== 2 || segs.flat().some((n) => !Number.isFinite(n))) return false;
    const [p, q] = segs.map(([a, b, c, d]) => (a <= c ? [a, b, c, d] : [c, d, a, b]));
    const diag = (s: number[]) => s[2] !== s[0] && Math.abs(s[2] - s[0]) === Math.abs(s[3] - s[1]);
    return diag(p) && diag(q) && p[0] === q[0] && p[2] === q[2] && p[1] === q[3] && p[3] === q[1];
  };
  /** Where a source draws the ✕: every `<I.x`, and every <svg> that is a ✕ in another spelling. */
  const crossesIn = (src: string) => [
    ...[...src.matchAll(/<I\.x\b/g)].map((m) => m.index ?? 0),
    ...[...src.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].filter((m) => isCross(segmentsOf(m[0]))).map((m) => m.index ?? 0),
  ].sort((a, b) => a - b);
  /** Each ✕ site of a source: what holds it (an open button or link, a Button's `leading`, or neither) and what names the
   *  holder (its aria-label; a link with no label is named by its own words, as the query bar's "clear" is). */
  const xSites = (src: string) => crossesIn(src).map((index) => ({ index })).map((m) => {
    const before = src.slice(0, m.index);
    if (/leading=\{\s*$/.test(before)) return { holder: "leading", label: "" };
    const open = Math.max(...["<button", "<Button", "<Link", "<a "].map((t) => before.lastIndexOf(t)));
    const shut = Math.max(...["</button>", "</Button>", "</Link>", "</a>"].map((t) => before.lastIndexOf(t)));
    if (open < 0 || open < shut || openingTag(src, open).endsWith("/>")) return { holder: "none", label: "" };
    const tag = openingTag(src, open);
    return { holder: "button", label: propOf(tag, "aria-label") ?? (/^<(?:Link|a)\s/.test(tag) ? "(its own words)" : "") };
  });
  const DIALOG_HOST = /<(?:Modal|ConfirmModal)[\s>]|role="(?:alert)?dialog"/;
  // The closes drawn by hand that a dialog file may keep, each named in the census with why.
  const NAMED_HAND = ["src/components/onboarding/first-visit-primer.tsx", "src/components/layout/notifications-panel.tsx", "src/components/admin/admin-mobile-nav.tsx",
    "src/components/social/channels-panel.tsx", "src/components/pwa/install-invite.tsx"];
  const census = (files: Array<[string, string]>) => {
    const found: Record<string, ReturnType<typeof xSites>> = {};
    for (const [f, s] of files) { const sites = xSites(s); if (sites.length) found[f] = sites; }
    const problems: string[] = [];
    for (const [f, sites] of Object.entries(found)) {
      const kinds = CENSUS[f];
      if (!kinds) { problems.push(`${f}: ${sites.length} ✕ unclassified`); continue; }
      if (kinds.length !== sites.length) { problems.push(`${f}: ${sites.length} ✕ drawn, ${kinds.length} classified`); continue; }
      sites.forEach((site, i) => {
        const k = kinds[i].kind;
        // A close or a dismiss is never filed as a mere glyph; a hand-drawn or row ✕ is a button that says what it does.
        if (k === "glyph" && site.holder === "button" && /close|dismiss|skip|Close/.test(site.label)) problems.push(`${f} #${i + 1}: a ${site.label} filed as a glyph`);
        if ((k === "hand ✕" || k === "row ✕") && (site.holder !== "button" || !site.label)) problems.push(`${f} #${i + 1}: a ${k} that is no labelled button`);
        if (k === "CloseX" && f !== "src/components/ui/modal.tsx") problems.push(`${f} #${i + 1}: a second CloseX`);
      });
    }
    for (const f of Object.keys(CENSUS)) if (!found[f]) problems.push(`${f}: classified, but draws no ✕`);
    // ⛔ No ✕ drawn by hand where CloseX serves: a file that hosts a Modal, a ConfirmModal or a dialog closes with CloseX.
    for (const [f, s] of files) {
      if (!DIALOG_HOST.test(s) || NAMED_HAND.includes(f)) continue;
      const hand = (found[f] ?? []).filter((site, i) => site.holder === "button" && (CENSUS[f]?.[i]?.kind ?? "hand ✕") === "hand ✕");
      if (hand.length) problems.push(`${f}: a dialog's ✕ drawn by hand (${hand.map((x) => x.label || "no label").join(", ")})`);
    }
    return { found, problems };
  };
  const cz = census(SRC);
  const siteCount = Object.values(cz.found).reduce((n, s) => n + s.length, 0);
  ok(`8.10 · the census: ${siteCount} ✕ drawn in ${Object.keys(cz.found).length} files of src, admin too, each SITE classified — one CloseX; ${Object.values(CENSUS).flat().filter((c) => c.kind === "hand ✕").length} closes drawn by hand, each named with why; no dialog's ✕ drawn by hand`,
    cz.problems.length === 0, cz.problems.join(" | "));
  const swapIn = (file: string, from: string | RegExp, to: string) => SRC.map(([f, s]): [string, string] => [f, f.endsWith(file) ? s.replace(from, to) : s]);
  const plantBet = swapIn("bet-confirm-modal.tsx", GUARDED_X, '<button type="button" onClick={onCancel} aria-label={t.common.cancel} className="mt-1 -mb-1 -mr-1.5 lg:-mr-3 shrink-0 inline-flex h-8 w-8"><I.x s={16} /></button>');
  const plantToast = swapIn("ui/toast.tsx", "<I.x s={14} />", '<I.x s={14} /></button><button type="button" aria-label={t.common.close} onClick={onDismiss}><I.x s={16} />');
  ok("8.10′ PLANT · round 4's hand-drawn ✕ back in the bet confirm (a dialog CloseX serves), and a second ✕ drawn in the toast, are each reported; the census unplanted is clean",
    census(plantBet).problems.some((p) => p.includes("bet-confirm-modal.tsx")) && census(plantToast).problems.some((p) => p.includes("toast.tsx")) && cz.problems.length === 0,
    show({ bet: census(plantBet).problems, toast: census(plantToast).problems }));
  const misfiled = (() => { const keep = CENSUS["src/components/ui/toast.tsx"]; CENSUS["src/components/ui/toast.tsx"] = [C("glyph", "planted")]; const p = census(SRC).problems; CENSUS["src/components/ui/toast.tsx"] = keep; return p; })();
  ok("8.10″ PLANT · a toast's dismiss filed as a mere glyph is reported", misfiled.some((p) => p.includes("filed as a glyph")), misfiled.join(" | "));
  // Round 6 (review C2): the census reads the ✕ in any spelling — controls first, then the two dialogs' old ✕s planted back.
  const spelt = (d: string) => isCross(segmentsOf(`<svg viewBox="0 0 24 24">${d}</svg>`));
  ok("8.10‴ CONTROL · the ✕ is read in every spelling — the kit's path, the chat panel's spaced one, lucide's two paths, feather's two lines — and a plus, a chevron, a check and a single stroke are not ✕s",
    spelt('<path d="M6 6l12 12M18 6L6 18" />') && spelt('<path d="M6 6 L18 18 M18 6 L6 18" />') && spelt('<path d="M18 6 6 18" /><path d="m6 6 12 12" />')
      && spelt('<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />')
      && !spelt('<path d="M12 5v14M5 12h14" />') && !spelt('<path d="M9 6l6 6-6 6" />') && !spelt('<path d="M5 12l5 5L20 7" />') && !spelt('<path d="M6 6l12 12" />'));
  const plantNeedle = swapIn("layout/needle-drawer.tsx", /<CloseX onClick=\{\(\) => setOpen\(false\)\}[^\n]*\/>/, '<button type="button" onClick={() => setOpen(false)} aria-label="Funga" className="shrink-0 grid h-[40px] w-[40px] place-items-center rounded-lg"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg></button>');
  const plantChat = swapIn("chat/ChatPanel.tsx", /<CloseX onClick=\{onClose\}[^\n]*\/>/, '<button type="button" className="cm-close" aria-label={i18n.common.close} onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>');
  ok("8.10⁗ PLANT · round 5's two invisible ✕s back — the Needle drawer's own <svg> and the chat panel's (here in lucide's spelling) — are each seen and refused as a dialog's ✕ drawn by hand (round 6, C2)",
    census(plantNeedle).problems.some((p) => p.includes("needle-drawer.tsx")) && census(plantChat).problems.some((p) => p.includes("ChatPanel.tsx"))
      && !cz.problems.some((p) => /needle-drawer|ChatPanel/.test(p)),
    show({ needle: census(plantNeedle).problems, chat: census(plantChat).problems }));
  // ⭐ ONE RULE WHILE A REQUEST IS IN FLIGHT (the integrator's review): the ✕ is there exactly when the dialog's own way out
  // is. While a request the dialog sent is in flight (its close guarded on the flag), the ✕ is withheld: a corner ✕ is not
  // drawn (`showClose={!flag}`); a header-row ✕ is `CloseX withheld` — not drawn, not pressable, its box kept, so nothing
  // moves. ConfirmModal withholds on `loading` alone; `confirmHeld` (busy, the way out open) keeps it live.
  const xMarkup = (withheld: boolean) => html(h(CloseX, { onClick: () => {}, label: "Funga", className: "mt-1 -mb-1", withheld }));
  const shown = xMarkup(false), held = xMarkup(true);
  const boxOf = (m: string) => (/class="([^"]*)"/.exec(m)?.[1] ?? "").replace(/\s*\binvisible\b/, "");
  ok("8.12 · CloseX withheld is not drawn (`invisible`) and not pressable (`disabled`, which the focus trap skips), in the very box it has when drawn — so the row and the title never move",
    /\bdisabled=""/.test(held) && /\binvisible\b/.test(held) && !/disabled/.test(shown) && !/\binvisible\b/.test(shown) && boxOf(held) === boxOf(shown)
      && /\bh-8 w-8\b/.test(boxOf(held)) && /aria-label="Funga"/.test(held), show({ shown, held }));
  /** A named handler's text (`const close = () => { … }`, or `=> expr` to the line's end), for a prop that passes it by name. */
  const handlerOf = (src: string, value: string | null) => {
    const name = /^\{(\w+)\}$/.exec(value ?? "")?.[1];
    if (!name) return value ?? "";
    const at = new RegExp(`const ${name} = (?:async )?\\([^)]*\\) => `).exec(src);
    if (!at) return "";
    const i = at.index + at[0].length;
    if (src[i] !== "{") return src.slice(i, src.indexOf("\n", i));
    let depth = 0, j = i;
    for (; j < src.length; j++) { if (src[j] === "{") depth++; else if (src[j] === "}" && --depth === 0) break; }
    return src.slice(i, j + 1);
  };
  const IN_FLIGHT = /^(?:pending|loading|inFlight|busy|awaiting|posting|submitting|running|saving)$/;
  const flagsIn = (text: string) => [...new Set([...text.matchAll(/!\s*(\w+)\b|\b(\w+)\s*\?\s*\(/g)].map((m) => m[1] ?? m[2]).filter((f) => IN_FLIGHT.test(f)))];
  const inFlightRule = (files: Array<[string, string]>) => {
    const problems: string[] = [];
    let modals = 0, confirms = 0;
    for (const [f, s] of files) {
      // A header-row ✕ keeps its box: never `{!flag && <CloseX …>}` nor `{flag ? null : <CloseX …>}`.
      if (/\{\s*!\s*\w+\s*&&\s*<CloseX\b|\?\s*null\s*:\s*<CloseX\b/.test(s)) problems.push(`${f}: a ✕ taken out of its row while in flight`);
      for (const m of s.matchAll(/<(Modal|ConfirmModal)(?=[\s>])/g)) {
        const tag = openingTag(s, m.index ?? 0);
        const flags = flagsIn([propOf(tag, "onClose"), propOf(tag, "closeOnScrim"), propOf(tag, "closeOnEsc")].map((v) => handlerOf(s, v)).join(" "));
        const line = s.slice(0, m.index).split("\n").length;
        if (m[1] === "Modal") {
          if (!flags.length) continue;
          modals++;
          const sc = propOf(tag, "showClose");
          if (sc === "{false}") {
            // The dialog draws its own ✕, in a header row: withheld on the same flag.
            for (const x of s.matchAll(/<CloseX\b/g)) {
              const xt = openingTag(s, x.index ?? 0);
              if (/className="absolute /.test(xt)) continue;
              const w = propOf(xt, "withheld") ?? "";
              if (!flags.some((fl) => new RegExp(`\\b${fl}\\b`).test(w))) problems.push(`${f}:${line} its header ✕ is not withheld on ${flags.join("/")}`);
            }
          } else if (!sc || !flags.some((fl) => new RegExp(`^\\{!${fl}\\b`).test(sc))) problems.push(`${f}:${line} its ✕ is drawn while ${flags.join("/")} (showClose=${sc})`);
        } else {
          // A ConfirmModal kept open across its own request — its close guarded on a flag, or its setter called only after
          // the answer comes back — wears `loading`, which withholds its ✕ (and holds Cancel, the scrim and Esc).
          const confirmBody = handlerOf(s, propOf(tag, "onConfirm"));
          const setter = /^\{\(\) => (set\w+)\((?:false|null)\)\}$/.exec(propOf(tag, "onClose") ?? "")?.[1];
          const awaitAt = confirmBody.search(/\bawait\b/);
          const closesAfter = !!setter && awaitAt >= 0 && confirmBody.indexOf(`${setter}(`, awaitAt) > awaitAt && !confirmBody.slice(0, awaitAt).includes(`${setter}(`);
          if (!flags.length && !closesAfter) continue;
          confirms++;
          const loading = propOf(tag, "loading") ?? "";
          const want = flags.length ? flags : ["pending", "loading", "busy", "posting", "awaiting"];
          if (!want.some((fl) => new RegExp(`\\b${fl}\\b`).test(loading))) problems.push(`${f}:${line} a ConfirmModal open across its request, its ✕ not withheld (loading=${loading || "none"})`);
        }
      }
    }
    return { problems, modals, confirms };
  };
  // The sweep's own count on 2026-10-09 (27 dialogs whose close waits on a request; 4 confirms open across one): fewer
  // means the detector went blind, not that the tree got better.
  const MODALS_FLOOR = 27, CONFIRMS_FLOOR = 4;
  const rule8 = inFlightRule(SRC);
  ok(`8.13 · the one in-flight rule, held everywhere: ${rule8.modals} dialogs whose close waits on a request withhold their ✕ (in the corner, or in the header with its box kept), and ${rule8.confirms} confirms kept open across their request wear \`loading\``,
    rule8.problems.length === 0 && rule8.modals >= MODALS_FLOOR && rule8.confirms >= CONFIRMS_FLOOR, rule8.problems.join(" | "));
  ok("8.13′ · ConfirmModal withholds its ✕ on `loading` alone — a held confirm (`confirmHeld`: busy, every way out open) keeps it drawn and live",
    /<CloseX withheld=\{loading\} onClick=\{onClose\}/.test(conf) && /closeOnScrim=\{!loading\}/.test(conf) && /onClose=\{loading \? \(\) => \{\} : onClose\}/.test(conf) && !/withheld=\{[^}]*confirmHeld/.test(conf));
  const plants: Array<[string, Array<[string, string]>]> = [
    ["the sell confirm's ✕ drawn but dead again", swapIn("sell-confirm-modal.tsx", "<CloseX withheld={pending} ", "<CloseX ")],
    ["ConfirmModal's ✕ taken out of its row again", swapIn("ui/modal.tsx", /<CloseX withheld=\{loading\} (onClick=\{onClose\}[^\n]*\/>)/, "{!loading && <CloseX $1}")],
    ["the objection dialog's corner ✕ drawn while filing", swapIn("objection-dialog.tsx", "showClose={!pending}", "")],
    ["the settle dialog's corner ✕ drawn while settling", swapIn("settlement/settle-button.tsx", "showClose={!pending}", "")],
    ["the arm confirm open across its request without `loading`", swapIn("proposal-actions.tsx", /(onConfirm=\{arm\})\s*loading=\{pending\}/, "$1")],
  ];
  const planted = plants.map(([what, files]) => [what, inFlightRule(files).problems.length, files.some(([f, s]) => SRC.find(([g]) => g === f)?.[1] !== s)] as const);
  ok(`8.13″ PLANT · each is reported: ${planted.map(([w, n]) => `${w} (${n})`).join("; ")}`,
    planted.every(([, n, moved]) => n > 0 && moved), show(planted));
  const toast = read("src/components/ui/toast.tsx");
  const toastTop = /className="absolute right-1\.5 top-([0-9.]+) inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle/.exec(toast)?.[1];
  const toastCaps = twStep("3") + sora(1.25) * 13, toastX = (toastTop === "0" ? 0 : twStep(toastTop ?? "")) + BOX / 2;
  ok(`8.11 · a toast's ✕ centres ${toastX}px down — its 13px title's capitals under the row's 16px are ${toastCaps.toFixed(1)} (it centred 32, 8.2px low)`,
    toast.includes('<div className="flex items-start gap-3 py-3 pl-4 pr-8">') && /font-display text-\[13px\] font-semibold text-text leading-tight/.test(toast)
      && Math.abs(toastX - toastCaps) < 0.5, String(toastTop));
  const onMedallion = { centre: margin("-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0", "mt") + BOX / 2 };
  ok(`8.3′ PLANT · ConfirmModal's ✕ back on the medallion (${onMedallion.centre}px, round 4) is reported: ${(confCaps - onMedallion.centre).toFixed(1)}px above the capitals`, Math.abs(onMedallion.centre - confCaps) >= 0.5);
  ok("8.6′ PLANT · the filter sheet's old `-mt-1` (centre 20) is reported", Math.abs(margin("-mr-3 -mt-1", "mt") + 24 - sora(1.25) * 16) >= 0.5);
}

/* ══ §9 · F5 · THE HARNESS PARKS THE POINTER ═══════════════════════════════════════════════════════════════════════ */
section("9 · F5 · the capture harness parks the pointer before every shot (tiles 095 099 327)");
{
  const QA = decomment(raw("scripts/qa-journey-shell.mjs"));
  const park = "const parkPointer = (page) => page.mouse.move(2, Math.round((page.viewportSize()?.height ?? viewport(390).height) / 2)).catch(() => {});";
  const shootOf = (src: string) => src.slice(src.indexOf("async function shoot("), src.indexOf("\n}\n", src.indexOf("async function shoot(")));
  const parksFirst = (src: string) => {
    const s = shootOf(src);
    const p = s.indexOf("await parkPointer(page);"), w = s.indexOf("await settle(page, PARK_SETTLE_MS);"), shot = s.indexOf("page.screenshot(");
    return p >= 0 && w > p && shot > w;
  };
  const settleMs = Number(/const PARK_SETTLE_MS = ([0-9_]+);/.exec(QA)?.[1]?.replace(/_/g, ""));
  const tBase = Number(/--t-base:\s*([0-9]+)ms/.exec(raw("src/app/motion.css"))?.[1]);
  ok(`9.1 · R4-G's parkPointer, the same expression as the edges drive, and every tile shot after it and a ${settleMs}ms beat (> --t-base ${tBase}ms)`,
    QA.includes(park) && parksFirst(QA) && settleMs > tBase && tBase === 220);
  ok("9.2 · one screenshot site (shoot) and no hand-written pointer move left — the focus cells and the viewer step park through the helper",
    QA.split("page.screenshot(").length - 1 === 1 && QA.split("page.mouse.move(").length - 1 === 1 && QA.split("await parkPointer(page);").length - 1 === 3);
  ok("9.1′ PLANT · a shot without the park is reported", !parksFirst(QA.replace("await parkPointer(page);\n  await settle(page, PARK_SETTLE_MS);", "await settle(page, 150);")));
  const check = spawnSync(process.execPath, ["--check", "scripts/qa-journey-shell.mjs"], { encoding: "utf8" });
  ok("9.3 · `node --check` passes on the harness", check.status === 0, check.stderr);
}

/* ══ §10 · §A5 · /results OVER AN EMPTY ARCHIVE ════════════════════════════════════════════════════════════════════ */
section("10 · §A5 · /results withholds its search and its bar over an empty archive (R5-F's audit)");
{
  const res = read("src/app/results/page.tsx");
  const gated = (src: string) => /\{archiveRows\.length > 0 && \(\s*<div className=\{QUERY_SEARCH_BAND_CLASS\}>/.test(src)
    && src.includes("{archiveRows.length > 0 && <ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />}")
    && src.split("<ResultsBar ").length - 1 === 1;
  ok("10.1 · the search band and the bar render only when the archive holds a row — before any filter or search", gated(res));
  ok("10.1′ PLANT · the bar drawn over an empty archive again is reported",
    !gated(res.replace("{archiveRows.length > 0 && <ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />}", "<ResultsBar state={state} counts={counts} resultCount={totalCount} t={t} />")));
  // (A JSX comment between the fragment and its first child reads `{}` once comments are out — hence the short gap.)
  ok("10.2 · …the rule its siblings keep: /positions, /watchlist and /proposals withhold theirs on an empty book",
    /\{positions\.length > 0 && \(\s*<>[\s\S]{0,40}?<SearchBox/.test(read("src/app/positions/page.tsx"))
      && /\{rows\.length > 0 && \(\s*<>[\s\S]{0,40}?<div className=\{QUERY_SEARCH_BAND_CLASS\}>/.test(read("src/app/watchlist/page.tsx"))
      && /\{rows\.length > 0 && \(\s*<>[\s\S]{0,40}?<div className=\{QUERY_SEARCH_BAND_CLASS\}>/.test(read("src/app/proposals/page.tsx")));
}

/* ══ §11 · THE CHECKS ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("11 · the checks: /markets' 34px, the hub's two glyphs, the chart's deadline, the grid card's pool, two by design");
{
  // /markets: the echo row (8 + 17) + the bar's own top, less or plus what the wrapper gives.
  const sb = read("src/components/ui/search-box.tsx");
  const echo = twStep("1.5") + Number(/mt-1\.5 min-h-\[([0-9]+)px\]/.exec(sb)?.[1]);
  const row1 = read("src/components/ui/query-bar.tsx").includes('export const QUERY_BAR_ROW1_CLASS = "flex items-center gap-x-3 pt-2.5";') ? twStep("2.5") : NaN;
  const compactTop = Number(/padding-top:\s*([0-9]+)px/.exec(rule(mediaBlock(CSS, "max-width: 639.98px", ".kp-discovery-bar:has(> [data-bar-row]) {"), 'html:not([data-density="comfortable"]) .kp-discovery-bar:has(> [data-bar-row])'))?.[1]);
  const wide = Number(/margin-bottom:\s*(-?[0-9]+)px/.exec(rule(CSS, ".kp-markets-search"))?.[1]);
  const compact = Number(/html:not\(\[data-density="comfortable"\]\) \.kp-markets-search \{ margin-bottom: (-?[0-9]+)px; \}/.exec(mediaBlock(CSS, "max-width: 639.98px", ".kp-markets-search"))?.[1]);
  ok(`11.1 · /markets: the box stands ${echo + row1 + wide}px over its pills from 640 and ${echo + compactTop + compact}px in the compact phone bar — 34, as every bar (it was ${echo + row1} and ${echo + compactTop}; tile 193 measured 31)`,
    echo === 25 && row1 === 10 && compactTop === 6 && echo + row1 + wide === 34 && echo + compactTop + compact === 34
      && read("src/app/markets/page.tsx").includes('className="kp-markets-search"') && read("src/app/markets/loading.tsx").includes('className="search-box-wrap kp-markets-search"'));
  // The hub: Matokeo and Uthibitisho wa utatuzi drew one sign.
  const svg = (k: keyof typeof I) => html(h(I[k] as never, { s: 20 } as never));
  const shape = (k: keyof typeof I) => (svg(k).match(/<(circle|path|line)\b/g) ?? []).map((tag) => tag.slice(1)).join(" ");
  const member = { signedIn: true as const, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: false, proposalsState: "OPEN" as const,
    doors: { inviteVisible: true, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } };
  const glyphOf = (id: string) => hubRowsFor(member as never).flatMap((g) => g.rows).find((r) => r.id === id) as { glyph?: string } | undefined;
  ok(`11.2 · the hub: Matokeo wears the results page's own sign (\`resolved\`), no longer the circled check Uthibitisho wa utatuzi wears (\`sealCheck\`)`,
    glyphOf("results")?.glyph === "resolved" && glyphOf("fairness")?.glyph === "sealCheck" && svg("resolved") !== svg("sealCheck")
      && read("src/app/results/page.tsx").includes("<I.resolved s={18} />"));
  ok(`11.2′ CONTROL · the old pair was one sign: checkCircle and sealCheck are each a circle and a check (${shape("checkCircle")} | ${shape("sealCheck")})`,
    shape("checkCircle") === "circle path" && shape("sealCheck") === "circle path");
  // The Up & Down chart: "loading" has a deadline, then the existing honest sentence.
  const tc = read("src/components/charts/terminal-chart.tsx");
  const deadline = Number(/export const HISTORY_DEADLINE_MS = ([0-9_]+);/.exec(tc)?.[1]?.replace(/_/g, ""));
  const vendor = Number(/AbortSignal\.timeout\(([0-9_]+)\)/.exec(read("src/lib/server/updown-terminal-vendor.ts"))?.[1]?.replace(/_/g, ""));
  const loadOf = (src: string) => src.slice(src.indexOf("const load = async () => {"), src.indexOf("rangeRef.current = range;"));
  const deadlined = (src: string) => {
    const l = loadOf(src);
    return /const deadline = setTimeout\(\(\) => \{\s*if \(alive && seq === seqRef\.current\) setStatus\(\(s\) => \(s === "loading" \? "error" : s\)\);\s*\}, HISTORY_DEADLINE_MS\);/.test(l)
      && /finally \{\s*clearTimeout\(deadline\);\s*\}/.test(l);
  };
  ok(`11.3 · the chart says "loading" for ${deadline / 1000}s at most (the route's vendor read aborts at ${vendor / 1000}s), then "${word("sw", "market.udChartError")}" while it keeps retrying`,
    deadlined(tc) && deadline > vendor && vendor === 8000 && tc.includes('{status === "empty" ? labels.empty : status === "error" ? labels.error : labels.loading}')
      && read("src/app/updown/page.tsx").includes("error: t.market.udChartError,") && LOCALES.every((l) => word(l, "market.udChartError").length > 0));
  ok("11.3′ PLANT · the load without its deadline is reported", !deadlined(tc.replace(/const deadline = setTimeout\([\s\S]*?HISTORY_DEADLINE_MS\);/, "const deadline = 0;")));
  // The grid card's pool figure: the word for a screen reader; on screen, no room (the row's worst case at 320).
  const mono11 = 0.6 * 11, content320 = 320 - 2 * twStep("3") - 2 * 15;
  const worst = 13 * mono11 + 7 + "dakika 59 zimebaki".length * mono11 + 6 + 40;
  ok(`11.4 · a grid card names its pool to a screen reader in the featured card's word; on screen the 320 row's worst case is ${worst.toFixed(1)} of ${content320}px, so a word (+${(6 * mono11).toFixed(1)}) or a glyph (+16) would wrap a fixed-height card — an owner question`,
    read("src/components/markets/market-card.tsx").includes(': <><span className="sr-only">{t.common.pool}{" "}</span>{formatTzs(volume)}</>}') && content320 === 258 && worst <= content320 && worst + 16 > content320);
  // By design: the two chips' heights, the rail's shadow.
  const chip = read("src/components/ui/chip.tsx");
  ok("11.5 BY DESIGN · the spotlight's state chip is 20px beside the 18px category chip: status chips are 2px taller at every size (chip.tsx, the kit's metrics), centred 1px each way",
    /sm: \{\s*base:\s*\{ height: 18,[\s\S]*?status: \{ height: 20,/.test(chip) && /v === "resolved"/.test(chip.slice(chip.indexOf("const isStatus")))
      && read("src/app/results/page.tsx").includes('<Chip variant="cat" size="sm">') && read("src/app/results/page.tsx").includes('<Chip variant="resolved" size="sm">'));
  ok("11.6 BY DESIGN · the AML title's third line is under the bottom rail's elevation shadow at that scroll (232 against 245 at most), not a gradient of its own",
    /\.kp-rail \{\s*background: var\(--panel\);\s*border-top: 1px solid var\(--border\);\s*box-shadow: var\(--shadow-overlay-up\);/.test(CSS));
}

console.log(`\nvisual-pass-r5a: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
