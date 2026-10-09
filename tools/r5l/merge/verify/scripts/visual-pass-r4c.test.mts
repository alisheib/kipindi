/**
 * ROUND 4 OF THE VISUAL PASS, HELPER C (2026-10-09) — every fix a later edit could silently undo, held, each beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4c.test.mts        (npm run test:visual-pass-r4c)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the tiles the defect was
 * measured on (S/visual/tiles-r4) and the file that fixes it; the measurements are in those files' notes.
 *   §1 a filter bar's rhythm: the search and its bar are one band (rung + 10 on every side), rows 12px apart
 *   §2 the group divider stands in the middle of the gap the eye sees
 *   §3 notifications: money whole and mono in a title, a body's last two words together, the actions on the icon's line
 *   §4 the capture waits for the unread sign on the tickets tiles too
 * Sources are read through the shared scanners (scripts/lib/decomment.mts): decomment for code, decommentCss for CSS.
 */
import { readFileSync } from "node:fs";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  QUERY_BAR_ROW1_ALONE_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_SEARCH_BAND_CLASS,
} from "../src/components/ui/query-bar.tsx";
import { moneyRuns, moneySentence } from "../src/lib/fill-nodes.tsx";
import { DotSeq } from "../src/components/ui/dot-seq.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const code = (p: string) => decomment(read(p));
const RAW_CSS = read("src/app/globals.css");
const css = decommentCss(RAW_CSS);
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const show = (v: unknown) => JSON.stringify(v);

/** This repo's spacing scale: the overridden keys from tailwind.config.ts, then Tailwind's own for the keys it leaves. */
const SCALE: Record<string, number> = { "2.5": 10 };
{
  const block = /spacing:\s*\{([^}]*)\}/.exec(read("tailwind.config.ts"))?.[1] ?? "";
  for (const m of block.matchAll(/"([0-9.]+)":\s*"(\d+)px"/g)) SCALE[m[1]] = Number(m[2]);
}
/** The px of a padding/margin/gap utility in a class list ("pt-2" → 12, "pt-[10px]" → 10), or NaN. */
const px = (classes: string, prefix: string) => {
  const m = new RegExp(`(?:^|\\s)${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(?:([0-9.]+)|\\[(\\d+)px\\])(?=\\s|$)`).exec(classes);
  return m ? (m[1] !== undefined ? (SCALE[m[1]] ?? NaN) : Number(m[2])) : NaN;
};

/** Specificity (b, c) of a simple selector list member — classes, attributes and pseudo-classes, the functional ones
 *  (:has, :not, :is) by their most specific argument, :where by nothing; elements and pseudo-elements in c. */
function specificity(sel: string): [number, number] {
  let b = 0, c = 0, i = 0;
  const s = sel.trim();
  while (i < s.length) {
    const ch = s[i];
    if (ch === "." || ch === "[") {
      b++;
      if (ch === "[") i = s.indexOf("]", i) + 1;
      else { i++; while (i < s.length && /[\w-]/.test(s[i])) i++; }
    } else if (s.startsWith("::", i)) {
      c++; i += 2; while (i < s.length && /[\w-]/.test(s[i])) i++;
    } else if (ch === ":") {
      const name = /^:([\w-]+)/.exec(s.slice(i))?.[1] ?? "";
      i += 1 + name.length;
      if (s[i] === "(") {
        let depth = 0, j = i;
        for (; j < s.length; j++) { if (s[j] === "(") depth++; else if (s[j] === ")" && --depth === 0) break; }
        const inner = s.slice(i + 1, j);
        i = j + 1;
        if (name === "where") continue;
        if (["has", "not", "is"].includes(name)) {
          const best = inner.split(",").map((x) => specificity(x.replace(/^\s*[>+~]\s*/, ""))).sort((x, y) => y[0] - x[0] || y[1] - x[1])[0];
          b += best[0]; c += best[1];
        } else b++;
      } else b++;
    } else if (/[a-z]/i.test(ch)) {
      c++; while (i < s.length && /[\w-]/.test(s[i])) i++;
    } else i++;
  }
  return [b, c];
}
const beats = (x: [number, number], y: [number, number]) => x[0] > y[0] || (x[0] === y[0] && x[1] >= y[1]);

/* ══ §1 · THE FILTER BAR'S RHYTHM ═══════════════════════════════════════════════════════════════════════════════════ */
section("1 · a filter bar: the search and its bar one band, rung + 10 on every side, rows 12px apart (tiles 171 172 174 193 194 196)");
const glow = /--glow-selected:\s*0 0 ([0-9.]+)px (-?[0-9.]+)px/.exec(RAW_CSS);
const HALO = glow ? Number(glow[1]) + Number(glow[2]) : NaN;
const ROW1_PT = px(QUERY_BAR_ROW1_CLASS, "pt");
const ROW2_PT = px(QUERY_BAR_ROW2_CLASS, "pt");
const ROW2_PB = px(QUERY_BAR_ROW2_CLASS, "pb");
const ROW2_GAP = px(QUERY_BAR_ROW2_CLASS, "gap");
const BAND_PT = px(QUERY_SEARCH_BAND_CLASS, "pt");
const searchBox = code("src/components/ui/search-box.tsx");
const echoClasses = /className=\{`(mt-[0-9.]+) min-h-\[(\d+)px\]/.exec(searchBox);
const ECHO = echoClasses ? px(echoClasses[1], "mt") + Number(echoClasses[2]) : NaN;
const hangRule = /\.kp-search-band\.kp-search-band:has\(\+ \.kp-discovery-bar\)\s*\{\s*margin-bottom:\s*-(\d+)px;\s*\}/.exec(css);
const restRule = /\.kp-search-band\.kp-search-band:not\(:has\(\+ \.kp-discovery-bar\)\)\s*\{\s*margin-bottom:\s*-(\d+)px;\s*\}/.exec(css);
const HANG = hangRule ? Number(hangRule[1]) : NaN;
const HANG_REST = restRule ? Number(restRule[1]) : NaN;
{
  ok("1.locate · the scale reads the overridden keys (2 → 12, 5 → 24, 6 → 32) and the halo reaches 11px (12px of blur, −1 spread)",
    SCALE["2"] === 12 && SCALE["5"] === 24 && SCALE["6"] === 32 && SCALE["1.5"] === 8 && HALO === 11, show({ SCALE, HALO }));
  ok("1.1 · row 2 stands 12px under row 1 (pt-2), the gap its own wrapped lines keep (gap-2), and the selected pill's 11px halo clears it",
    ROW2_PT === 12 && ROW2_PT === ROW2_GAP && ROW2_PT > HALO, show({ ROW2_PT, ROW2_GAP, HALO }));
  const old = QUERY_BAR_ROW2_CLASS.replace(/(^|\s)pt-2(?=\s|$)/, "$1pt-1.5");
  ok("1.1′ PLANT · round 3's pt-1.5 put back (8px: /markets' chips → PANGA 8 against PANGA → BWAWA 12, the halo on PANGA's border) is reported",
    old !== QUERY_BAR_ROW2_CLASS && !(px(old, "pt") === ROW2_GAP && px(old, "pt") > HALO), px(old, "pt").toString());
  ok("1.2 · the search band pads 10px over the box — the bar's own 10px over its pills (row 1's pt-2.5), as the literal pt-[10px] (2.5 is an inverted key, test:spacing-scale) — and is the CSS hook kp-search-band",
    BAND_PT === 10 && BAND_PT === ROW1_PT && /(^|\s)kp-search-band(\s|$)/.test(QUERY_SEARCH_BAND_CLASS) && !/-2\.5(\s|$)/.test(QUERY_SEARCH_BAND_CLASS),
    QUERY_SEARCH_BAND_CLASS);
  ok("1.3 · the echo row (mt-1.5 + min-h-[17px] = 25px) lies inside the gap below the box: −25px over a query bar, whose 10px top padding is the clearance; −15px over anything else",
    ECHO === 25 && HANG === ECHO && HANG_REST === ECHO - ROW1_PT, show({ ECHO, HANG, HANG_REST }));
  const spaceY: [number, number] = specificity(".space-y-5 > :not([hidden]) ~ :not([hidden])");
  const band = specificity(".kp-search-band.kp-search-band:has(+ .kp-discovery-bar)");
  const rest = specificity(".kp-search-band.kp-search-band:not(:has(+ .kp-discovery-bar))");
  const utilitiesAt = RAW_CSS.indexOf("@tailwind utilities;");
  const ruleAt = RAW_CSS.indexOf(".kp-search-band.kp-search-band:has(");
  ok("1.4 · the band's rules weigh (0,3,0), as much as space-y's later-sibling rule that zeroes a child's margin-bottom, and come after the utilities, so they win",
    beats(band, spaceY) && beats(rest, spaceY) && spaceY[0] === 3 && utilitiesAt > 0 && ruleAt > utilitiesAt, show({ spaceY, band, rest }));
  ok("1.4′ PLANT · the same rule with one class (0,2,0) loses to space-y and is reported",
    !beats(specificity(".kp-search-band:has(+ .kp-discovery-bar)"), spaceY));

  // ⭐ THE MODEL, page by page: the gap a reader sees over the box, between the box and the pills, and under the bar's last
  // row. The rung is the page's own (its container's class); the band and the bar add their 10px; the echo row is lent
  // to the gap below the box. Equal on every page, and the rung + 10 of each.
  type Page = { file: string; rung: string; band: RegExp };
  const BAND_ON_WRAPPER = /<div className=\{QUERY_SEARCH_BAND_CLASS\}>\s*<Suspense>\s*<SearchBox/;
  const BAND_ON_BOX = /<SearchBox[^>]*className=\{QUERY_SEARCH_BAND_CLASS\}/;
  const PAGES: Page[] = [
    { file: "src/app/results/page.tsx", rung: `<div className="flex flex-col gap-5">`, band: BAND_ON_WRAPPER },
    { file: "src/app/notifications/page.tsx", rung: `<PageContainer tier="reading" className="space-y-5">`, band: BAND_ON_BOX },
    { file: "src/app/watchlist/page.tsx", rung: `<PageContainer tier="board" className="space-y-5">`, band: BAND_ON_WRAPPER },
    { file: "src/app/proposals/page.tsx", rung: `<PageContainer tier="reading" className="space-y-6">`, band: BAND_ON_WRAPPER },
    { file: "src/app/positions/page.tsx", rung: `<PageContainer tier="reading" className="space-y-6">`, band: BAND_ON_BOX },
    { file: "src/app/fairness/page.tsx", rung: `<section className="flex flex-col gap-5">`, band: BAND_ON_WRAPPER },
  ];
  const rungOf = (s: string) => SCALE[/(?:space-y|gap)-([0-9.]+)/.exec(s)?.[1] ?? ""] ?? NaN;
  const gaps = (rung: number, banded: boolean, wrapperPb = 0) => ({
    over: rung + (banded ? BAND_PT : 0),
    boxToPills: ECHO - (banded ? HANG : 0) + wrapperPb + rung + ROW1_PT,
    under: ROW2_PB + rung,
  });
  const report: Record<string, unknown> = {};
  const bad: string[] = [];
  for (const p of PAGES) {
    const src = code(p.file);
    const rung = rungOf(p.rung);
    const g = gaps(rung, p.band.test(src));
    report[p.file.split("/")[2]] = g;
    if (!src.includes(p.rung) || !p.band.test(src) || !(g.over === g.boxToPills && g.boxToPills === g.under && g.under === rung + 10)) bad.push(p.file);
    if (/<div className="(?:py-2\.5|pb-2|py-\[10px\])">\s*<Suspense>\s*<SearchBox/.test(src)) bad.push(`${p.file}: an old wrapper`);
  }
  ok("1.5 · on every page with a search over its bar the box sits rung + 10 under the block above it, the pills rung + 10 under the box, the next block rung + 10 under the sort — 34 · 34 · 34 on a 24px rung, 42 · 42 · 42 on 32",
    bad.length === 0, bad.length ? bad.join(" · ") : show(report));
  const before = gaps(24, false, 10);
  ok("1.5′ CONTROL · /results as round 4 found it (no band, `py-2.5` round the box) puts 69px between the box and the pills (tiles 171 172), and /notifications 59",
    before.boxToPills === 69 && gaps(24, false).boxToPills === 59, show({ results: before.boxToPills, notifications: gaps(24, false).boxToPills }));

  // The ghosts stand in with the same band, so nothing moves when the page lands.
  const ghosts = [
    ["src/app/results/loading.tsx", /<div className=\{QUERY_SEARCH_BAND_CLASS\} aria-hidden>\s*<div className="search-box-wrap">[\s\S]{0,260}?<p className="mt-1\.5 min-h-\[17px\]" \/>/],
    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the page's Suspense fallback IS the loading file's drawing (`ResultsGhostBands`,
    // imported from ./loading) — one ghost for the document's first paint and a move's, so its band is the one above.
    ["src/app/results/page.tsx", /import \{ ResultsGhostBands \} from "\.\/loading";[\s\S]*<Suspense fallback=\{<ResultsGhostBands /],
    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): today's /positions picture is drawn in the browser, beside its loading file.
    ["src/app/positions/positions-ghost.tsx", /<div className=\{QUERY_SEARCH_BAND_CLASS\} aria-hidden>\s*<div className="search-box-wrap">[\s\S]{0,260}?<p className="mt-1\.5 min-h-\[17px\]" \/>/],
  ] as const;
  const lostGhosts = ghosts.filter(([f, re]) => !re.test(code(f))).map(([f]) => f);
  ok("1.6 · the three ghosts of a banded search draw the band — the box's height and its echo row in a search-box-wrap — over the bar's ghost",
    lostGhosts.length === 0, lostGhosts.join(", "));

  // /markets keeps no rung between its search and its bar: its echo row IS the gap (25 + 10 = 35), and its grid now
  // stands as far under the bar.
  const markets = code("src/app/markets/page.tsx");
  const marketsGhost = code("src/app/markets/loading.tsx");
  const gridMt = SCALE[/<section data-board="grid" className="market-grid mt-([0-9.]+)">/.exec(markets)?.[1] ?? ""] ?? NaN;
  ok("1.7 · /markets wears no band (no rung between its search and its bar: 25 + 10 = 35 to the pills) and its cards stand 34 under the bar (pb 10 + mt-5), its ghost's grid likewise (tile 196 read 26)",
    !markets.includes("QUERY_SEARCH_BAND_CLASS") && Math.abs(ECHO + ROW1_PT - (ROW2_PB + gridMt)) <= 1 && marketsGhost.includes(`<div className="market-grid mt-5" aria-hidden>`),
    show({ above: ECHO + ROW1_PT, below: ROW2_PB + gridMt }));
  ok("1.7′ CONTROL · its old mt-3 left 26 under the bar against 35 over it", ROW2_PB + SCALE["3"] === 26);

  // Tiketi zangu: row 1 drawn alone, with row 2's bottom padding.
  const bar = code("src/app/positions/positions-bar.tsx");
  const ghost = code("src/components/journey/tickets/tickets-ghost.tsx");
  const alonePb = px(QUERY_BAR_ROW1_ALONE_CLASS, "pb");
  const rung = rungOf(`className="space-y-6"`);
  ok("1.8 · Tiketi zangu's bar (row 1 alone) pads 10 under its pills as over them, so the tab rule stands 42 over the pills and the first ticket 42 under them (tiles 169 170 214–228 read 42 / 44)",
    QUERY_BAR_ROW1_ALONE_CLASS.startsWith(QUERY_BAR_ROW1_CLASS) && alonePb === ROW2_PB && rung + ROW1_PT === alonePb + rung
      && /<div className=\{QUERY_BAR_ROW1_ALONE_CLASS\}>/.test(bar) && /<div className=\{QUERY_BAR_ROW1_ALONE_CLASS\}>/.test(ghost)
      && !/QUERY_BAR_ROW1_CLASS\} pb-/.test(bar + ghost) && code("src/components/journey/tickets/tickets-view.tsx").includes(`<PageContainer tier="reading" className="space-y-6">`),
    show({ over: rung + ROW1_PT, under: alonePb + rung }));
  ok("1.8′ PLANT · the hand-typed pb-2 put back (12px) leaves 42 over and 44 under, and is reported", rung + ROW1_PT !== px(`${QUERY_BAR_ROW1_CLASS} pb-2`, "pb") + rung);

  // Fairness: the section's own gap, nothing typed per element.
  const fair = code("src/app/fairness/page.tsx");
  const sectionBody = fair.slice(fair.indexOf(`<section className="flex flex-col gap-5">`), fair.indexOf("</section>", fair.indexOf(`<section className="flex flex-col gap-5">`)));
  ok("1.9 · /fairness' record section spaces itself by its gap alone: no mb under the heading, no py round the exits, no mt over the pager",
    sectionBody.length > 0 && !/<h2 className="[^"]*\bmb-/.test(sectionBody) && !/gap-1\.5 py-2"/.test(sectionBody) && !/"mt-4 rounded-lg/.test(sectionBody),
    sectionBody.slice(0, 120));
}

/* ══ §2 · THE GROUP DIVIDER ══════════════════════════════════════════════════════════════════════════════════════════ */
section("2 · the group divider stands in the middle of the gap the eye sees (tile 196, row 3: 31 | 1 | 14)");
{
  const block = /@supports selector\(:has\(a\)\)\s*\{\s*@media \(min-width: 1024px\)\s*\{([\s\S]*?)\n\s*\}\s*\n\}/.exec(css)?.[1] ?? "";
  const colGap = Number(/\.kp-qbar-row:has\(\.kp-qdiv\)\s*\{\s*column-gap:\s*(\d+)px/.exec(block)?.[1] ?? NaN);
  const base = Number(/\.kp-qdiv \+ \*::before\s*\{[^}]*left:\s*(-?\d+)px/.exec(block)?.[1] ?? NaN);
  const unsel = /:has\(> \.kp-fchip:last-child:not\(\[data-on\]\)\) \+ \.kp-qdiv \+ \*::before\s*\{\s*left:\s*(-?\d+)px;\s*\}/.exec(block);
  const shifted = Number(unsel?.[1] ?? NaN);
  // An unselected pill: its border is transparent and its padding px-3, so its ink stops border + padding inside the box.
  const pill = code("src/components/ui/filter-pill.tsx");
  const inset = 1 + (/rank === "dense" \? "px-2\.5" : "px-3"/.test(pill) ? SCALE["3"] : NaN);
  const sides = (left: number, gapFromInk: number) => ({ before: left + gapFromInk, after: -left - 1 });
  const boxed = sides(base, colGap);
  const inked = sides(shifted, colGap + inset);
  ok("2.locate · the row's column gap is 29px, the rule 1px at 14px into it, and an unselected pill's ink stops 17px inside its box (border 1 + px-3 16)",
    colGap === 29 && base === -15 && inset === 17 && /"border-transparent text-text-muted/.test(pill), show({ colGap, base, inset }));
  ok("2.1 · after a selected (bordered) last pill the rule stands 14 | 1 | 14 between the boxes, clear of the pill's 11px halo",
    boxed.before === boxed.after && boxed.before > HALO, show(boxed));
  ok("2.2 · after an UNSELECTED last pill it moves to the middle of the 46px from that pill's ink to the next box: 22 | 1 | 23 (the half pixel cannot be split without blurring a 1px rule)",
    !!unsel && Math.abs(inked.before - inked.after) <= 1 && inked.before + inked.after + 1 === colGap + inset, show(inked));
  ok("2.2′ CONTROL · without the move the same rule stands 31 | 1 | 14 from what the eye sees (tile 196: x412 after ink to x380, box from x427)",
    sides(base, colGap + inset).before === 31 && sides(base, colGap + inset).after === 14);
  ok("2.3 · the rule is keyed on the group's own last pill (`:has(> .kp-fchip:last-child:not([data-on]))`) — never on the bar's row class, which globals.css may style only through the divider's :has (test:density-contract 4q)",
    !!unsel && !/\.kp-qbar-row[^{,]*:last-child/.test(css) && specificity(":has(> .kp-fchip:last-child:not([data-on])) + .kp-qdiv + *::before")[0] > specificity(".kp-qdiv + *::before")[0]);
}

/* ══ §3 · NOTIFICATIONS ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · notifications: a figure whole and mono, a body's last two words together, the actions on the icon's line (tiles 193 194)");
{
  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  const title = "Soko limefutwa · TZS 4,200 imerejeshwa";
  const t = html(h(DotSeq, { text: title, renderPart: (p: string) => moneyRuns(p) }));
  ok("3.1 · the title is two items — \"Soko limefutwa\" and \"TZS 4,200 imerejeshwa\" — so it breaks between them, never after its dot, and its figure is one .amount (mono, untracked, nowrap)",
    t === `<span class="kp-seq"><span class="kp-seq__item">Soko limefutwa</span><span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> <span class="amount">TZS 4,200</span> imerejeshwa</span></span>`,
    t);
  ok("3.1′ CONTROL · without renderPart DotSeq is byte for byte what it was (round 3's 9.1 shape), and a title with no dot is one span",
    html(h(DotSeq, { text: "A · B" })) === `<span class="kp-seq"><span class="kp-seq__item">A</span><span class="kp-seq__item"> <span class="kp-seq__dot" aria-hidden="true">·</span> B</span></span>`
      && html(h(DotSeq, { text: "Dau limepotea TZS 3,500", renderPart: (p: string) => moneyRuns(p) })) === `<span>Dau limepotea <span class="amount">TZS 3,500</span></span>`);
  const body = "Dau lako lote limerejeshwa kwenye pochi yako.";
  const b = html(h("p", null, moneySentence(body)));
  ok("3.2 · a body's last two words move to the next line together: \"…kwenye\" / \"pochi yako.\" (tile 194 ended on \"yako.\" alone)",
    b === `<p>Dau lako lote limerejeshwa kwenye <span class="inline-block max-w-full">pochi yako.</span></p>` && strip(b) === body, b);
  const money = "Soko limefutwa kwa dharura. TZS 4,200 imerejeshwa.";
  const m = html(h("p", null, moneySentence(money)));
  ok("3.3 · …never cutting a figure: when the last two words would split \"TZS 4,200\", the kept end starts at its TZS",
    m === `<p>Soko limefutwa kwa dharura. <span class="inline-block max-w-full"><span class="amount">TZS 4,200</span> imerejeshwa.</span></p>` && strip(m) === money, m);
  ok("3.4 · Chinese, and a text of two words or fewer, take moneyRuns alone (keepLastWords' own rules)",
    html(h("p", null, moneySentence("已退还 TZS 4,200 到你的钱包"))) === `<p>已退还 <span class="amount">TZS 4,200</span> 到你的钱包</p>`
      && html(h("p", null, moneySentence("Imesomwa yote"))) === `<p>Imesomwa yote</p>`);
  const fn = read("src/lib/fill-nodes.tsx");
  ok("3.5 · the kept end is an INLINE BLOCK, never a nowrap span: a pair wider than the 100px column at 320 wraps inside itself instead of running under the ✓",
    /className="inline-block max-w-full"/.test(code("src/lib/fill-nodes.tsx")) && !/whitespace-nowrap/.test(code("src/lib/fill-nodes.tsx")) && fn.includes("export function moneySentence("));
  const page = code("src/app/notifications/page.tsx");
  ok("3.6 · /notifications draws both title branches through DotSeq + moneyRuns and the body through moneySentence",
    (page.match(/<DotSeq text=\{pickTitle\(n\)\} renderPart=\{moneyRuns\} \/>/g) ?? []).length === 2 && !/(?<!=)\{pickTitle\(n\)\}/.test(page)
      && page.includes("{moneySentence(pickBody(n))}") && !/>\{pickBody\(n\)\}</.test(page));
  ok("3.6′ PLANT · the bare title put back is reported", /(?<!=)\{pickTitle\(n\)\}/.test(page.replace("<DotSeq text={pickTitle(n)} renderPart={moneyRuns} />", "{pickTitle(n)}")));
  // The action column: the row is items-start; the plate is 32px at mt-0.5; each control is 44px.
  const actions = code("src/app/notifications/row-actions.tsx");
  const plateTop = /<IconPlate size=\{32\} className=\{cn\("mt-0\.5 border"/.test(page) ? SCALE["0.5"] : NaN;
  const plateMid = plateTop + 32 / 2;
  const lift = px(/<span className="([^"]*)"/.exec(actions)?.[1] ?? "", "-mt");
  const restoreLift = px(/className="(-mt-[^"]*min-h-\[44px\] px-2[^"]*)"/.exec(actions)?.[1] ?? "", "-mt");
  ok("3.7 · the ✓ and × centre on the leading icon: a 44px control lifted 4px (−mt-1) has its middle 18px down, the plate's middle (2 + 16) — and Restore likewise",
    -lift + 44 / 2 === plateMid && -restoreLift + 44 / 2 === plateMid && /className="flex items-start gap-3 p-3"/.test(page)
      && (actions.match(/min-h-\[44px\]/g) ?? []).length === 3,
    show({ plateMid, controlMid: -lift + 22, restoreMid: -restoreLift + 22 }));
  ok("3.7′ CONTROL · unlifted, the controls' middle sat 22px down — 4px under the icon's 18 (tile 194: glyph y674 against the plate's 669.5)",
    0 + 44 / 2 - plateMid === 4);
}

/* ══ §4 · THE CAPTURE ════════════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · the capture waits for the demo player's unread sign on the tickets tiles too (217 218 219)");
{
  const drive = read("scripts/qa-journey-shell.mjs");
  const ticket = drive.slice(drive.indexOf("async function ticketState("), drive.indexOf("async function tabTour("));
  const loop = ticket.slice(ticket.indexOf("for (const width of widths)"));
  const waitAt = loop.indexOf("if (viewer === 'player') await unreadLanded(page, width);");
  ok("4.1 · each tickets tile of the demo player waits for the counter mounted at its width before it is judged and shot — the tab tiles' rule, logged and never failed",
    ticket.length > 0 && waitAt > loop.indexOf("await toTop(page);") && waitAt < loop.indexOf("await checkShell(page, cell") && waitAt < loop.indexOf("await shoot(page, cell"),
    loop.slice(0, 400));
  ok("4.2 · …and unreadLanded still only says a missing sign (§3 of the drive judges the counts)",
    /async function unreadLanded\(page, width/.test(drive) && /if \(!sign \|\| !row\) say\(/.test(drive) && !/if \(!sign \|\| !row\) (?:ok|fail)\(/.test(drive));
  const planted = ticket.replace("if (viewer === 'player') await unreadLanded(page, width);", "");
  ok("4.1′ PLANT · the wait taken out of the tickets loop is reported", !planted.includes("await unreadLanded(page, width)"));

  // ⭐ An Up & Down chart is shot after its canvas's 520ms arrival (R4-D: tile 164 was shot ~26% into it, every ink at a
  // quarter of tile 202's). The wait sits in shoot(), so every tile that shows a chart takes it.
  const shoot = drive.slice(drive.indexOf("async function shoot("), drive.indexOf("\n}\n", drive.indexOf("async function shoot(")));
  const waitChart = shoot.indexOf("await page.waitForFunction(CHART_ARRIVED, CHART_CANVAS");
  ok("4.3 · shoot() waits for every chart canvas to arrive before the screenshot, and only SAYS one that has not (an empty or failed feed is the chart's own state)",
    waitChart > 0 && waitChart < shoot.indexOf("await page.screenshot(") && /if \(!arrived\) say\(/.test(shoot) && !/if \(!arrived\) problems\.push/.test(shoot)
      && /const CHART_CANVAS = '\[role="img"\] > \[style\*="--dur-arrive"\]';/.test(drive) && /const CHART_ARRIVE_MS = 5_000;/.test(drive),
    shoot.slice(0, 200));
  ok("4.3′ CONTROL · a wait, not an override: the capture never emulates reduced motion and never restyles the chart",
    !/reducedMotion|prefers-reduced-motion|emulateMedia/.test(drive) && !/--dur-arrive[^\n]*(?:0ms|0s)/.test(drive));
  // The selector finds the chart's own markup: the role="img" box's first child carries the arrival transition and
  // states its target inline, and React writes that transition into the style attribute the selector reads.
  const chart = code("src/components/charts/terminal-chart.tsx");
  const styled = html(h("div", { style: { opacity: 1, transition: "opacity var(--dur-arrive) var(--ease-glide)" } }));
  ok("4.4 · …and finds the terminal chart's canvas container: the role=\"img\" box's child whose inline style fades on --dur-arrive (terminal-chart.tsx), as React serialises it",
    /<div role="img"[^>]*>\s*<div\s+ref=\{wrapRef\}\s+className="absolute inset-0"\s+style=\{\{ opacity: feed \? 1 : 0, transition: "opacity var\(--dur-arrive\) var\(--ease-glide\)" \}\}/.test(chart)
      && /style="[^"]*--dur-arrive/.test(styled), styled);
  // The probe itself, run on a stand-in document: arrived only when the COMPUTED opacity is 1.
  const probeSrc = /const CHART_ARRIVED = (\(sel\) => [^\n]+);/.exec(drive)?.[1] ?? "";
  const run = (src: string, computed: string[]) => {
    const els = computed.map((o) => ({ o }));
    const doc = { querySelectorAll: () => els };
    const fn = new Function("document", "getComputedStyle", `return ${src};`)(doc, (el: { o: string }) => ({ opacity: el.o })) as (s: string) => boolean;
    return fn(CHART_CANVAS_SEL);
  };
  const CHART_CANVAS_SEL = '[role="img"] > [style*="--dur-arrive"]';
  ok("4.5 · the probe holds a canvas caught mid-fade (computed 0.25, tile 164's) and one with no feed yet, and lets an arrived one (1) or a page with no chart through",
    probeSrc !== "" && run(probeSrc, ["0.25"]) === false && run(probeSrc, ["0"]) === false && run(probeSrc, ["1"]) === true && run(probeSrc, []) === true
      && run(probeSrc, ["1", "0.6"]) === false, probeSrc);
  const inline = probeSrc.replace("getComputedStyle(el).opacity === '1'", "(el.target ?? '1') === '1'");
  ok("4.5′ PLANT · a probe that reads the INLINE target (1 from the first frame of the fade) lets tile 164's mid-fade canvas through, and is reported",
    inline !== probeSrc && run(inline, ["0.25"]) === true);
}

console.log(`\nvisual-pass-r4c: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
