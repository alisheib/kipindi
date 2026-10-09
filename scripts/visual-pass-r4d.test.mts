/**
 * ROUND 4 OF THE VISUAL PASS, HELPER D (2026-10-09) — every fix a later edit could silently undo, held, each beside a
 * control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4d.test.mts        (npm run test:visual-pass-r4d)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the round-4 tiles the
 * defect was measured on (S/visual/tiles-r4) and the file that fixes it; the measurements are in those files' notes.
 *   §1 the Up & Down chart's price scale speaks the page's price ("$2,896.04", `usd()`)
 *   §2 the chart's controls keep one 12px rhythm on a phone, measured to the key's ink
 *   §3 the round page's panel: the stake is money, the × note hangs like the ⓘ note, the quote stamp opens on a capital
 *   §4 /live: a card's top row is 20px in either state; the market grid's gutter is a rung of the space scale
 *   §5 the probability bar's caption centres on the bar
 *   §6 the market page: the star midway between its neighbours' ink; the question opens on the page's edge
 *   §7 /results: the tally reads in one case
 *   §8 /markets on a phone: the count line has air on both sides
 *   §9 the lean word is upright
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { usd } from "../src/lib/usd-price.ts";
import { EstimateNote } from "../src/components/updown/updown-stake-controls.tsx";
import twConfigModule from "../tailwind.config.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
// Source and the stylesheet are read through the shared scanners (scripts/lib/decomment.mts) — test:decomment's
// private-stripper ratchet; decommentCss for CSS, whose strings and urls a JS scanner must not judge.
const code = (p: string) => decomment(read(p));
const css = decommentCss(read("src/app/globals.css"));
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

/** One rule's declarations, by its exact selector at the start of a line (comments already out); the first match. */
function rule(src: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`).exec(src);
  return m ? m[1] : "";
}
/** The CSS custom properties of :root that are px. */
const ROOT_PX: Record<string, number> = {};
for (const m of read("src/app/globals.css").matchAll(/(--sp-[0-9]+):\s*([0-9.]+)px/g)) ROOT_PX[m[1]] ??= Number(m[2]);
// tsx hands a .ts default export through CommonJS interop, so it may arrive one level down.
const twConfig = ((twConfigModule as unknown as { default?: typeof twConfigModule }).default ?? twConfigModule);
/** The OVERRIDDEN Tailwind spacing scale (tailwind.config.ts) — `gap-2` is 12px here, never 8. */
const SPACE = (twConfig.theme?.extend?.spacing ?? {}) as Record<string, string>;
const tw = (key: string) => parseFloat(SPACE[key] ?? "NaN");
const MICRO = (twConfig.theme?.extend?.fontSize as Record<string, [string, { lineHeight: string }]>).micro;

// The repo's own JetBrains Mono (src/lib/server/reports/fonts) — the face `--font-mono` loads, read for its metrics.
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { unitsPerEm: number; hhea: { ascent: number; descent: number; lineGap: number }; "OS/2": { capHeight: number } };
};
const jbm = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const ASC = jbm.hhea.ascent / jbm.unitsPerEm, DESC = -jbm.hhea.descent / jbm.unitsPerEm, CAP = jbm["OS/2"].capHeight / jbm.unitsPerEm;
/** Where a JetBrains Mono line's ink sits in its line box: caps from the top, baseline from the bottom. */
const monoInsets = (size: number, lineHeight: number) => {
  const half = (lineHeight - (ASC + DESC) * size) / 2;
  return { capTop: half + (ASC - CAP) * size, baseBottom: half + DESC * size };
};

/** An SVG path's x extent from its segment end points (enough for the kit's glyphs: straight runs and corner arcs). */
function pathXs(d: string): { min: number; max: number } {
  let at = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  const xs: number[] = [];
  const skip = () => { while (at < d.length && /[\s,]/.test(d[at])) at++; };
  const num = () => { skip(); const m = /^-?(?:\d+\.?\d*|\.\d+)/.exec(d.slice(at)); if (!m) throw new Error(`pathXs: no number at ${at} in ${d}`); at += m[0].length; return Number(m[0]); };
  // An arc's two flags are single digits and may be written run together ("a2 2 0 002 2" is flags 0, 0 then x = 2).
  const flag = () => { skip(); const c = d[at++]; if (c !== "0" && c !== "1") throw new Error(`pathXs: bad arc flag at ${at - 1}`); return Number(c); };
  for (skip(); at < d.length; skip()) {
    if (/[a-zA-Z]/.test(d[at])) cmd = d[at++];
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": case "L": { const nx = num(), ny = num(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; if (cmd.toUpperCase() === "M") { sx = x; sy = y; cmd = rel ? "l" : "L"; } break; }
      case "H": { const nx = num(); x = rel ? x + nx : nx; break; }
      case "V": { const ny = num(); y = rel ? y + ny : ny; break; }
      case "A": { num(); num(); num(); flag(); flag(); const nx = num(), ny = num(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; break; }
      case "Z": { x = sx; y = sy; break; }
      default: throw new Error(`pathXs: unhandled command ${cmd}`);
    }
    xs.push(x);
  }
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

/* ══ §1 · THE CHART'S PRICE SCALE ════════════════════════════════════════════════════════════════════════════════════ */
section("1 · the Up & Down chart's price scale speaks the page's price (tiles 164 202)");
{
  const term = code("src/components/charts/terminal-chart.tsx");
  const SHIPPED = /const priceFormat = \{ type: "custom" as const, minMove: 1 \/ 10 \*\* data\.decimals, formatter: \(p: number\) => usd\(p, data\.decimals\) \};/;
  ok("1.1 · every series is formatted by the ONE usd spelling — scale, live-line tag and crosshair label", SHIPPED.test(term));
  ok("1.2 · ⛔ …and the engine's own grouping-free \"price\" format is gone", !/type: "price" as const/.test(term));
  ok("1.3 · that spelling is the band's: 2896.04 → \"$2,896.04\", 2895.95 → \"$2,895.95\"",
    usd(2896.04, 2) === "$2,896.04" && usd(2895.95, 2) === "$2,895.95", `${usd(2896.04, 2)} ${usd(2895.95, 2)}`);
  ok("1.4 · the scale's ink stays --text-subtle (6.3:1 measured on tile 202; tile 164's 1.44:1 was the canvas caught mid-fade)",
    term.includes(`textColor: ink("--text-subtle"),`));
  ok("1.1′ PLANT · the format as it shipped is reported",
    !SHIPPED.test(`const priceFormat = { type: "price" as const, precision: data.decimals, minMove: 1 / 10 ** data.decimals };`));
}

/* ══ §2 · THE CHART'S CONTROLS ═══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · the chart's controls keep one 12px rhythm on a phone (tile 202)");
{
  const lab = code("src/components/charts/updown-chart-lab.tsx");
  const KEY_WRAP = `<span aria-hidden="true" className="flex mb-[calc(var(--sp-3)_-_3.4px)] sm:mb-0">`;
  ok("2.1 · the rails wrap 12px apart (`gap-y-2`) and the block stands 12px over the chart card (`mb-2`)",
    lab.includes(`<div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">`) && tw("2") === 12);
  ok("2.2 · the key's wrapper is a flex box — its height is the key's 14px line, not the page's 22.4px strut",
    lab.includes(KEY_WRAP) && lab.includes(`<div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-1.5">`));
  // The 3.4px is the font's, not a guess: the micro line's baseline above its foot.
  const size = parseFloat(MICRO[0]), lh = parseFloat(MICRO[1].lineHeight);
  const { baseBottom, capTop } = monoInsets(size, lh);
  ok("2.3 · ⭐ 3.4px is JetBrains Mono's baseline-to-foot in the 10/14 micro line (descender 0.300em + half-leading)",
    Math.abs(baseBottom - 3.4) < 0.005, `${baseBottom.toFixed(3)}px (asc ${ASC}, desc ${DESC}, ${size}/${lh})`);
  ok("2.4 · so the key's INK stands --sp-3 (12px) over the rail's border, the same 12 as rail → rail and rail → card",
    Math.abs((ROOT_PX["--sp-3"] - 3.4) + baseBottom - 12) < 0.005 && ROOT_PX["--sp-3"] === tw("2"),
    `${ROOT_PX["--sp-3"]} − 3.4 + ${baseBottom.toFixed(2)}`);
  ok("2.5 · on desktop the key's 14px line centres beside the rail, its caps level with the rail's labels (cap top inset ≈ foot inset)",
    Math.abs(capTop - baseBottom) < 0.2, `cap top ${capTop.toFixed(2)} · foot ${baseBottom.toFixed(2)}`);
  ok("2.2′ PLANT · the shape as it shipped (a bare span on the strut, a 4px gap, 8px between the rails) is reported",
    !`<div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">\n          <span aria-hidden="true">`.includes(KEY_WRAP)
      && !/gap-y-2">/.test(`<div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">`));
}

/* ══ §3 · THE ROUND PAGE'S PANEL ═════════════════════════════════════════════════════════════════════════════════════ */
section("3 · the round page: the stake is money, the × note hangs, the quote stamp opens on a capital (tiles 165 166)");
{
  const ctl = code("src/components/updown/updown-stake-controls.tsx");
  ok("3.1 · \"Gusa Juu au Chini kuweka dau · TZS 1,000\": the stake is an .amount, inside ONE flex item",
    ctl.includes(`<span>{t.market.udTapToBet} · <span className="amount">{formatTzs(bet.stake)}</span></span>`));
  ok("3.2 · …and so is the stake on the line that streams a bet", ctl.includes(`<span><span className="amount">{formatTzs(bet.stake)}</span> · {t.market.udStreaming}</span>`));
  ok("3.1′ PLANT · the line as it shipped — the figure in the sentence's face — is reported",
    !`<>{t.market.udTapToBet} · {formatTzs(bet.stake)}</>`.includes(`<span className="amount">{formatTzs(bet.stake)}</span>`));

  // The × note: the sign takes the ⓘ glyph's column in every language.
  const COLUMN = `<span class="w-[11px] shrink-0 text-center">×</span>`;
  for (const loc of ["sw", "en", "zh"] as const) {
    const s = DICTS[loc].market.udEstimateNote;
    const out = html(h(EstimateNote, { text: s }));
    ok(`3.3.${loc} · the "×" sits in an 11px column and the sentence hangs beside it, every word as written`,
      out.includes(COLUMN) && out.replace(/<[^>]+>/g, "") === s.replace(/^×\s+/u, "×") && /^<p class="flex items-start gap-1 /.test(out), out.slice(0, 160));
  }
  ok("3.4 · the column is the ⓘ glyph's own width — the sibling notes draw `I.info s={11}`",
    ctl.includes(`<I.info s={11} className="mt-[2px] shrink-0" />`));
  const plain = html(h(EstimateNote, { text: "hubadilika kwa kila dau jipya" }));
  ok("3.5 CONTROL · a sentence that does not open on the sign renders whole, no column",
    !plain.includes("w-[11px]") && plain.replace(/<[^>]+>/g, "") === "hubadilika kwa kila dau jipya", plain);
  const sites = [
    ["the two-way panel", "src/components/updown/updown-stake-controls.tsx", `<EstimateNote className="mt-1" text={t.market.udEstimateNote} />`],
    ["the board card", "src/components/updown/updown-card.tsx", `<EstimateNote className="mt-1" text={t.market.udEstimateNote} />`],
    ["the locked-side panel (was 10px)", "src/components/updown/round-stake-panel.tsx", `<EstimateNote className="mt-2" text={t.market.udEstimateNote} />`],
  ] as const;
  for (const [what, file, call] of sites) ok(`3.6 · ${what} sets the note through EstimateNote`, code(file).includes(call), file);
  const FLUSH = /<p className="[^"]*">\{t\.market\.udEstimateNote\}<\/p>/;
  ok("3.7 · ⛔ no flush <p> of the note is left in the three panels", !sites.some(([, f]) => FLUSH.test(code(f))));
  ok("3.7′ PLANT · the flush shape as it shipped is what 3.7 reads",
    FLUSH.test(`<p className="mt-1 text-body-sm leading-[1.45] text-text-faint break-keep [overflow-wrap:anywhere]">{t.market.udEstimateNote}</p>`));

  // The quote stamp: a mid-sentence word ("imenukuliwa", "quoted") that opens a line when there is no move before it.
  ok("3.8 CONTROL · the premise: the stamp's word is written in lower case in sw and en (it follows \"… · \")",
    /^[a-z]/.test(DICTS.sw.market.udQuoted) && /^[a-z]/.test(DICTS.en.market.udQuoted));
  const page = code("src/app/updown/[roundId]/page.tsx");
  // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, review 3 H4's sweep): the stamp was a string whose spaces were no-break
  // spaces (characters in the page's text, copied and searched); it is one nowrap span now, the same word first, so the
  // capital the line opens on (3.10, 3.11: `::first-letter` reaches into an inline child) is unchanged.
  ok("3.9 · the round page still composes the stamp from that word",
    page.includes(`const stamp = quotedAt ? <span className="whitespace-nowrap">{t.market.udQuoted} {quotedAt}</span> : null;`));
  const hero = code("src/components/updown/price-hero.tsx");
  ok("3.10 · the hero's detail line carries `ud-cap-first`", hero.includes(`<p className="ud-cap-first mt-1.5 mb-0 text-body-sm text-text-muted">{copy.aboveBelow}</p>`));
  ok("3.11 · …whose first letter is set as a capital, and below 400 each stacked clause's is too",
    /text-transform:\s*uppercase/.test(rule(css, ".ud-cap-first::first-letter")) && /\.ud-hero-chunk::first-letter\s*\{\s*text-transform:\s*uppercase;/.test(css));
  ok("3.12 · the settlement proof's label of the same word opens on a capital beside \"Chanzo\" and \"Ilionekana\"",
    page.includes(`<dt className="ud-cap-first text-text-faint">{t.market.udQuoted}</dt>`));
  ok("3.13 · ⛔ by the class, never Tailwind's `first-letter:uppercase` — one capital is not an all-caps site (test:eyebrow-roles)",
    ![page, hero].some((s) => /first-letter:uppercase/.test(s)));
  ok("3.10′ PLANT · the detail line as it shipped is reported", !`<p className="mt-1.5 mb-0 text-body-sm text-text-muted">`.includes("ud-cap-first"));
}

/* ══ §4 · /live's CARDS AND THE MARKET GRID ══════════════════════════════════════════════════════════════════════════ */
section("4 · /live: one top-row height for both tags; the grid's gutter on the space scale (tiles 178 196)");
{
  const grid = code("src/app/live/pulse-grid.tsx");
  ok("4.1 · one vertical box for the tag, written once", grid.includes(`const TAG_BOX_Y = "py-0.5 border-y";`));
  ok("4.2 · the Up & Down chip wears it (with its 1px rule all round)",
    grid.includes("className={`inline-flex items-center gap-1 rounded-sm px-1.5 ${TAG_BOX_Y} font-bold tracking-[0.10em]`}")
      && grid.includes(`border: "1px solid var(--brand-500)"`));
  ok("4.3 · …and so does the bare category label, its rule clear", grid.includes("<span className={`inline-flex items-center gap-1.5 ${TAG_BOX_Y} border-transparent`}>"));
  const lh = parseFloat(MICRO[1].lineHeight);
  ok("4.4 · both boxes are 20px: the micro line 14 + 2×2 padding + 2×1 rule (the chip measured y690–709 on tile 178)",
    lh + 2 * tw("0.5") + 2 === 20, `${lh} + 2×${tw("0.5")} + 2`);
  ok("4.3′ PLANT · the bare label as it shipped (14px, no box) is reported",
    !"<><Cat s={13} />{marketCategoryLabel(t, market.category)}</>".includes("${TAG_BOX_Y}"));

  const g = rule(css, ".market-grid");
  ok("4.5 · the market grid's gutter is --sp-4 — 16px, Tiketi zangu's `gap-3` and the hub's --sp-4",
    /gap:\s*var\(--sp-4\)/.test(g) && ROOT_PX["--sp-4"] === 16 && tw("3") === 16
      && /className="kp-tickets grid grid-cols-1 gap-3 md:grid-cols-2"/.test(code("src/components/journey/tickets/tickets-view.tsx"))
      && /gap:\s*var\(--sp-4\)/.test(rule(css, ".kp-hub__grid")), g.trim());
  ok("4.5′ PLANT · the bare 14px is reported", !/gap:\s*var\(--sp-4\)/.test("display: grid; gap: 14px;"));
}

/* ══ §5 · THE BAR'S CAPTION ══════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the probability bar's caption centres on the bar (tiles 162 177 178)");
{
  const labels = rule(css, ".tipbar-labels");
  const CENTRED = (r: string) => /display:\s*grid/.test(r) && /grid-template-columns:\s*1fr auto 1fr/.test(r) && !/space-between/.test(r);
  ok("5.1 · two equal tracks around the caption: `1fr auto 1fr`", CENTRED(labels), labels.trim());
  const yes = rule(css, ".tipbar-labels .tb-yes"), no = rule(css, ".tipbar-labels .tb-no");
  ok("5.2 · each side keeps its edge and never wraps — a figure and its side are one reading",
    /justify-self:\s*start/.test(yes) && /white-space:\s*nowrap/.test(yes) && /justify-self:\s*end/.test(no) && /white-space:\s*nowrap/.test(no));
  ok("5.2b · when the row is tight the CAPTION gives way: it may wrap, centred in its track, and --sp-1 keeps the three from touching",
    /column-gap:\s*var\(--sp-1\)/.test(labels) && /text-align:\s*center/.test(rule(css, ".tipbar-lean"))
      && !/white-space:\s*nowrap/.test(rule(css, ".tipbar-lean")) && !/\.tipbar-labels > \*\s*\{[^}]*nowrap/.test(css));
  const bar = code("src/components/brand.tsx");
  ok("5.3 · the bar still renders three children in that order: yes · lean · no",
    /<div className="tipbar-labels">\s*<span className="tb-yes">[\s\S]*?<span className="tipbar-lean">[\s\S]*?<span className="tb-no">/.test(bar));
  ok("5.1′ PLANT · the rule as it shipped (`flex` + `space-between`) is reported",
    !CENTRED("display: flex; justify-content: space-between; margin-top: 8px;"));
}

/* ══ §6 · THE MARKET PAGE ════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · the market page: the star midway between its neighbours' ink; the question on the page's edge (tiles 161 162)");
{
  const glyphs = read("src/components/ui/glyphs.tsx");
  const d = (name: string) => new RegExp(`\\b${name}: \\(p: GlyphProps\\) => <G \\{\\.\\.\\.p\\}><path d="([^"]+)"`).exec(glyphs)?.[1] ?? "";
  const STROKE = Number(/const G = [\s\S]*?strokeWidth="([0-9.]+)"/.exec(glyphs)?.[1]);
  const ext = pathXs(d("ext")), star = pathXs(d("star"));
  const extRight = (24 - (ext.max + STROKE / 2)) / 24 * 12; // the 12px source glyph's right side bearing
  const starSide = (star.min - STROKE / 2) / 24 * 16 + (40 - 16) / 2; // the 16px star's bearing inside its 40px box
  ok("6.locate · the glyphs are the ones the arithmetic reads: ext ends at x19, the star spans x3–21 (centred), stroke 1.9",
    ext.max === 19 && star.min === 3 && star.max === 21 && STROKE === 1.9, `ext ${ext.min}–${ext.max} · star ${star.min}–${star.max}`);
  const page = code("src/app/markets/[id]/page.tsx");
  const link = /<a\s+href=\{m\.sourceUrl\}[\s\S]*?className="([^"]+)"/.exec(page)?.[1] ?? "";
  const mr = /-mr-\[(\d+)px\]/.exec(link);
  const GAP = tw("2"); // the group's gap-2
  const before = extRight + GAP + starSide, after = starSide + GAP;
  ok("6.1 · the source link gives its glyph's 2px bearing back, so star ↔ Chanzo and star ↔ SHIRIKI are one ink gap",
    !!mr && Math.abs(before - Number(mr[1]) - after) < 0.1 && /<div className="ml-auto flex items-center gap-2">/.test(page),
    `${before.toFixed(2)} − ${mr?.[1]} vs ${after.toFixed(2)}`);
  ok("6.1′ PLANT · without it the gaps differ by the bearing — the 27 | 25 the tiles measured", before - after > 1.9, `${(before - after).toFixed(2)}px`);

  ok("6.2 · the question's stem letters are the ones measured: B D E F H I K L M N P R (Sora 700: 0.082em outline, 0.075em ink)",
    page.includes("const QUESTION_STEM = /^[BDEFHIKLMNPR]/u;"));
  ok("6.3 · the h1 is set back on its FIRST line only, by the letter it opens on — never by the locale",
    page.includes("<h1 data-stem={QUESTION_STEM.test(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)) ? \"\" : undefined}")
      && page.includes("data-[stem]:indent-[-0.075em]") && !/data-stem=\{[^}]*locale ===/.test(page));
  const STEM = /^[BDEFHIKLMNPR]/u;
  ok("6.4 CONTROL · \"Mvua Dar es Salaam…\" and \"NBC…\" are set back; \"Je, …\", \"Yanga…\" and 是否 are not",
    STEM.test("Mvua Dar es Salaam yazidi 200mm Julai") && STEM.test("NBC Premier League") && !STEM.test("Je, Simba SC")
      && !STEM.test("Yanga SC") && !STEM.test("是否"));
  ok("6.3′ PLANT · an h1 with no set-back is reported", !`<h1 className="font-display text-title-lg md:text-display-3">`.includes("data-[stem]:indent-"));
}

/* ══ §7 · /results' TALLY ════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · /results: the tally reads in one case (tile 172)");
{
  const res = code("src/app/results/page.tsx");
  // Round 5 (R5-A, F12) moved this pin: the count before its word is grouped (`formatNumber`), as every count line is —
  // the words are this section's, unchanged.
  ok("7.1 · \"0 imetatuliwa · TZS 0 imekamilika\" — the figure's sentence word, not the tab's label",
    res.includes("{formatNumber(totalCount)} {t.results.resolved} · {formatTzsCompact(totalVolume)} {t.market.tickerSettled}"));
  ok("7.2 · …and each result card's \"TZS 6K imekamilika\" beside \"2 watabiri\"",
    res.includes("{formatTzsCompact(m.yesPool + m.noPool)} {t.market.tickerSettled}"));
  ok("7.3 · ⛔ the tab label is no longer read for a sentence on this page", !res.includes("{t.common.settled}"));
  // Re-pinned by R5-J (round 5, G-4): the count is grouped as every count is (`formatNumber`) — the sentence word unchanged.
  ok("7.3b · …nor for the classic Tiketi zangu's win-rate hint, which said \"3 Imekamilika\" by the same composition",
    code("src/app/positions/page.tsx").includes("ofSettled: `${formatNumber(settled.length)} ${t.market.tickerSettled}`,")
      && !code("src/app/positions/page.tsx").includes("${t.common.settled}"));
  ok("7.4 CONTROL · the premise in the dictionary: the label is capitalised, the sentence word is not — in sw and en",
    /^[A-Z]/.test(DICTS.sw.common.settled) && /^[a-z]/.test(DICTS.sw.market.tickerSettled)
      && /^[A-Z]/.test(DICTS.en.common.settled) && /^[a-z]/.test(DICTS.en.market.tickerSettled)
      && /^[a-z]/.test(DICTS.sw.results.resolved), `${DICTS.sw.common.settled} / ${DICTS.sw.market.tickerSettled}`);
  ok("7.1′ PLANT · the tally as it shipped is reported",
    !"{totalCount} {t.results.resolved} · {formatTzsCompact(totalVolume)} {t.common.settled}".includes("{t.market.tickerSettled}"));
}

/* ══ §8 · /markets' COUNT LINE ON A PHONE ════════════════════════════════════════════════════════════════════════════ */
section("8 · /markets on a phone: the count line has air on both sides (tile 195)");
{
  const bar = rule(css, `html:not([data-density="comfortable"]) .kp-discovery-bar:has(> [data-bar-row])`);
  const AIRED = (r: string) => /row-gap:\s*var\(--sp-2\)/.test(r) && /padding-bottom:\s*var\(--sp-2\)/.test(r);
  ok("8.1 · the Compact bar's rows stand --sp-2 apart and its foot pads --sp-2", AIRED(bar) && /display:\s*grid/.test(bar), bar.slice(0, 200));
  // The count line: 11.5px JetBrains Mono on the page's 1.5 line.
  const { capTop, baseBottom } = monoInsets(11.5, 11.5 * 1.5);
  ok("8.2 · its caps stand 12px under the sort pill and its baseline 12px over the hairline (was 6 and 10)",
    Math.round(ROOT_PX["--sp-2"] + capTop) === 12 && Math.round(ROOT_PX["--sp-2"] + baseBottom) === 12
      && Math.round(2 + capTop) === 6 && Math.round(6 + baseBottom) === 10,
    `cap ${capTop.toFixed(2)} · base ${baseBottom.toFixed(2)}`);
  const qb = code("src/components/ui/query-bar.tsx");
  ok("8.locate · the count line is still 11.5px mono", /className="shrink-0 font-mono text-\[11\.5px\] tabular-nums text-text-subtle"/.test(qb));
  ok("8.1′ PLANT · the rule as it shipped is reported", !AIRED("display: grid; row-gap: 2px; padding-top: 6px; padding-bottom: 6px;"));
}

/* ══ §9 · THE LEAN WORD ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · the lean word is upright (tiles 177 178 205)");
{
  const lean = rule(css, ".tipbar-lean");
  ok("9.1 · `.tipbar-lean` sets no italic", lean.length > 0 && !/font-style:\s*italic/.test(lean), lean.trim());
  const layout = code("src/app/layout.tsx");
  const jbmDecl = /const jbm = JetBrains_Mono\(\{([\s\S]*?)\}\);/.exec(layout)?.[1] ?? "";
  ok("9.2 CONTROL · the premise: JetBrains Mono is loaded upright only — an italic there could only be sheared",
    jbmDecl.length > 0 && !/style:/.test(jbmDecl), jbmDecl.trim());
  ok("9.1′ PLANT · the rule as it shipped is reported", /font-style:\s*italic/.test("color: var(--bar-label-tipping); font-style: italic;"));
}

console.log(`\nvisual-pass-r4d: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
