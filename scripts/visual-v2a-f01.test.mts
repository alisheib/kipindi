/**
 * V2a · F01 (HIGH) — THE /markets PHONE BAR NEVER DRAWS ONE CONTROL THROUGH ANOTHER: the sort keeps its words, the
 * lens strip yields.
 *
 *   npx tsx scripts/visual-v2a-f01.test.mts --source   (light source/markup preflight)
 *   npx tsx scripts/visual-v2a-f01.test.mts            (real component in Chromium)
 *
 * 🔴 THE DEFECT (visual audit 2026-10-14, F01 — measured again on this tree before the fix): at 320 the one-line phone
 * bar (`globals.css` [COMPACT], `minmax(160px, 1fr) auto auto`) gave the sort cell what the strip's 160px floor left —
 * 71px — and the cell's 44px direction link left the `<details>` 27. The summary keeps its 40px tap floor (D79), so it
 * ran 13px under the direction link (summary 182→222, link 209→253), its key "PANGA" started 5.5px left of its own box
 * and its caret sat 9.5px inside the direction half — in all three languages. At 360 the two touched (249/249).
 * ⭐ THE RULE THE FIX STATES (DESIGN_AUTHORITY §K 6c: two controls never occupy the same pixels; lens and sort never go
 * behind a click): the CONTROLS take their content and the STRIP takes the rest. The sort track is `max-content`, so the
 * summary is never narrower than its key and caret and never runs under its direction link; the strip is `minmax(0, 1fr)`,
 * so where 160px no longer fits beside the controls the strip — `overflow-x: auto`, masked — scrolls instead (D58's own
 * ruling: "a 0px control is dead; a scrolling strip is a thing a player can still use"). Where the controls already fit
 * beside 160px (≥ 352px), the tracks resolve exactly as before.
 *
 *   §1  the real bar (DiscoveryBar, sw · en · zh; a guest, a signed-in player, a player with a filter on) laid out with the
 *       real stylesheet at every phone width from 246 to 600, and at 768 and 1280: no two controls overlap, the summary
 *       holds its own key and caret, the first status pill remains readable, the open menu stays in the viewport
 *   §2  nothing moved where it already fit: from 360 the strip keeps its 160px (a guest's default bar)
 *   §3  PLANTS (in memory): the shipped track and a larger strip floor make the sort overlap at 320;
 *       restoring the left-anchored listbox makes its open panel leave the viewport
 */
import { Stage, stylesheet, draw, h, load, read, reporter, LOCALES, dict, type Loc } from "./lib/v2a-stage.mts";

type DiscoveryState = { status: string; sort: string; dir: null | string; odds: string; pool: string; topic: string; q: string };
const { DiscoveryBar } = load<{ DiscoveryBar: unknown }>("src/components/markets/discovery-bar.tsx");
const { PageContainer } = load<{ PageContainer: unknown }>("src/components/layout/page-container.tsx");
const { DEFAULT_STATE } = load<{ DEFAULT_STATE: DiscoveryState }>("src/lib/markets/discovery.ts");
const { MARKET_CATEGORIES } = load<{ MARKET_CATEGORIES: readonly string[] }>("src/lib/markets/categories.ts");
const { categoryLabel } = load<{ categoryLabel: (t: unknown, c: string) => string }>("src/lib/markets/category-label.ts");

const R = reporter("V2a · F01 — the /markets phone bar: the sort keeps its words, the strip yields");

type Case = { id: string; state: DiscoveryState; signedIn: boolean };
const CASES: Case[] = [
  { id: "guest", state: DEFAULT_STATE, signedIn: false },
  { id: "player", state: DEFAULT_STATE, signedIn: true },
  { id: "filtered", state: { ...DEFAULT_STATE, odds: "call", pool: "10k" }, signedIn: true },
];
const counts = {
  status: { open: 62, today: 9, new: 14, progress: 5, watch: 3, all: 80 },
  odds: { any: 62, call: 21, cont: 30, long: 11 },
  pool: { any: 62, "10k": 18, "50k": 4 },
  topic: Object.fromEntries(["all", ...MARKET_CATEGORIES].map((c, i) => [c, 62 - i * 5])),
};
function drawBar(l: Loc, c: Case): string {
  const t = dict[l];
  const topics = [{ id: "all", label: (t as { market: { catAll: string } }).market.catAll }, ...MARKET_CATEGORIES.map((id) => ({ id, label: categoryLabel(t, id) }))];
  return draw(l, h(PageContainer as never, { tier: "board" }, h(DiscoveryBar as never, { state: c.state, counts, resultCount: 62, topics, t, signedIn: c.signedIn })), "/markets");
}

/** In the page: every box the verdict needs, read from the bar the page drew. */
const probe = (openMenu = false) => {
  const B = (el: Element | null | undefined) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const bar = document.querySelector(".kp-discovery-bar");
  const cell = bar?.querySelector('[data-bar-cell="sort"]');
  const details = cell?.querySelector("details") as HTMLDetailsElement | null | undefined;
  if (openMenu && details) details.open = true;
  const sum = cell?.querySelector("details > summary");
  const key = sum?.querySelector("span");
  const value = sum?.querySelector(".kp-menu-value");
  const caret = sum?.querySelector("svg");
  const dir = cell?.querySelector(":scope > a");
  const strip = bar?.querySelector("[data-strip-autoscroll]");
  const firstPill = strip?.querySelector('[data-chip^="status:"]');
  const countSort = bar?.querySelector("[data-count-sort]");
  const fs = bar?.querySelector(".kp-fsheet > summary");
  const panel = details?.querySelector('[role="listbox"]');
  const visible = (el: Element | null | undefined) => !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
  const barBox = B(bar);
  const pad = bar ? parseFloat(getComputedStyle(bar).paddingRight) : 0;
  return {
    sum: B(sum), key: visible(key) ? B(key) : null, value: visible(value) ? B(value) : null,
    caret: B(caret), dir: B(dir), strip: B(strip), firstPill: B(firstPill),
    countSort: visible(countSort) ? B(countSort) : null, filters: visible(fs) ? B(fs) : null,
    panelOpen: openMenu, panel: openMenu ? B(panel) : null,
    barRight: (barBox?.r ?? 0) - pad, barScroll: bar ? bar.scrollWidth - bar.clientWidth : 0,
    viewport: innerWidth,
    docOverflow: document.documentElement.scrollWidth - innerWidth,
    cols: bar ? getComputedStyle(bar).gridTemplateColumns : "",
    compact: innerWidth < 640 && bar ? getComputedStyle(bar).display === "grid" : false,
    stripOverflow: strip ? getComputedStyle(strip).overflowX : "",
  };
};
type Got = Awaited<ReturnType<typeof probe>>;

/** The verdict on one laid-out bar: the list of what is wrong with it (empty = right). */
function wrongs(g: Got): string[] {
  const out: string[] = [];
  if (!g.sum || !g.dir || !g.strip) return ["no sort summary, direction link or status strip was drawn"];
  // The summary and the direction link share a row; one pixel of anti-aliasing is not an overlap.
  if (Math.abs(g.sum.y - g.dir.y) < 1 && g.sum.r > g.dir.x + 1) out.push(`summary runs ${(g.sum.r - g.dir.x).toFixed(1)}px under the direction link`);
  if (g.key && g.key.x < g.sum.x - 0.5) out.push(`the key starts ${(g.sum.x - g.key.x).toFixed(1)}px left of its own box`);
  if (g.key && g.caret && g.key.r > g.caret.x + 0.5) out.push("the sort key runs into its caret");
  if (g.caret && g.caret.r > g.sum.r + 0.5) out.push(`the caret ends ${(g.caret.r - g.sum.r).toFixed(1)}px past its own box`);
  if (g.sum.w < 40 - 0.5) out.push(`the summary is ${g.sum.w.toFixed(1)}px wide, under the 40px floor`);
  if (g.compact) {
    if (!g.key || g.value) out.push("the compact sort loses its visible key or keeps its wide value");
    if (!g.countSort) out.push("the active sort is not on the compact count line");
    if (g.strip.w < 40 - 0.5 || g.stripOverflow !== "auto") out.push("the status strip is too narrow or cannot scroll");
    const visiblePill = g.firstPill ? Math.max(0, Math.min(g.strip.r, g.firstPill.r) - Math.max(g.strip.x, g.firstPill.x)) : 0;
    if (!g.firstPill || visiblePill < Math.min(32, g.firstPill.w / 2)) out.push("the first status pill has no readable opening");
  }
  if (g.filters && g.strip && Math.abs(g.filters.y - g.dir.y) < 1 && g.dir.r > g.filters.x + 1) out.push(`the direction link runs ${(g.dir.r - g.filters.x).toFixed(1)}px under the filter trigger`);
  if (g.filters && g.filters.r > g.barRight + 0.5) out.push(`the filter trigger ends ${(g.filters.r - g.barRight).toFixed(1)}px past the bar's content edge`);
  if (g.dir.r > g.barRight + 0.5) out.push(`the direction link ends ${(g.dir.r - g.barRight).toFixed(1)}px past the bar's content edge`);
  if (g.panelOpen && (!g.panel || g.panel.x < -0.5 || g.panel.r > g.viewport + 0.5))
    out.push(`the open sort listbox crosses the viewport (${g.panel?.x.toFixed(1)}…${g.panel?.r.toFixed(1)} of ${g.viewport})`);
  if (g.docOverflow > 0.5) out.push(`the page scrolls sideways by ${g.docOverflow}px`);
  return out;
}

const PHONE = [246, 277, 300, 320, 340, 360, 390, 412, 600];
const WIDE = [768, 1280];
const bodies = new Map<string, string>();
for (const l of LOCALES) for (const c of CASES) bodies.set(`${l}:${c.id}`, drawBar(l, c));
const allHtml = [...bodies.values()].join("\n") + `<body class="bg-bg-base text-text">`;
const globals = read("src/app/globals.css");
const queryBar = read("src/components/ui/query-bar.tsx");
const NOW = /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content\s+auto;/;
const compactRule = (s: string) => {
  const at = s.indexOf('html:not([data-density="comfortable"]) .kp-discovery-bar:has(> [data-bar-row]) {');
  return at < 0 ? "" : s.slice(at, s.indexOf("}", at) + 1);
};
const sourceWrongs = (s: string, q: string): string[] => {
  const out: string[] = [];
  if (!NOW.test(compactRule(s))) out.push("compact grid allocation is not minmax(0,1fr) max-content auto");
  if (!/QUERY_STRIP_CLASS\s*=\s*[\s\S]{0,180}overflow-x-auto/.test(q)) out.push("status strip cannot scroll");
  if (!q.includes('className="w-full min-w-[var(--tap-min)] rounded-l-pill')) out.push("sort summary lost its width floor");
  if (!s.includes('[data-bar-cell="sort"] .kp-menu-value { display: none; }')
    || !s.includes('[data-bar-cell="sort"] summary > span:first-of-type { display: inline; }')
    || !s.includes('[data-count-sort] { display: inline;')) out.push("compact sort labels are not preserved");
  if (!s.includes('[data-bar-cell="sort"] [role="listbox"] { left: auto; right: 0; }'))
    out.push("open sort listbox is not anchored to the right edge");
  for (const [id, body] of bodies) {
    if (!/data-strip-autoscroll/.test(body) || !/data-chip="status:open"/.test(body)
      || !/data-bar-cell="sort"/.test(body) || !/data-result-count="62"/.test(body)
      || !/class="kp-fsheet/.test(body)) out.push(`${id} lost a bar control or its count`);
  }
  return out;
};
R.section("0 · source preflight — the real component still draws each control and compact CSS preserves its meaning");
R.ok("0.1 · nine locale/state renders have the strip, sort, count and sheet", sourceWrongs(globals, queryBar).length === 0,
  sourceWrongs(globals, queryBar).join(" · "));
R.ok("0.2 · PLANT old grid allocation is caught", sourceWrongs(globals.replace(NOW, "grid-template-columns: minmax(160px, 1fr) auto auto;"), queryBar).some((w) => w.includes("grid allocation")));
R.ok("0.3 · PLANT strip no longer scrolls is caught", sourceWrongs(globals, queryBar.replace("gap-1 overflow-x-auto pr-2", "gap-1 overflow-x-hidden pr-2")).some((w) => w.includes("cannot scroll")));
R.ok("0.4 · PLANT sort width floor is caught", sourceWrongs(globals, queryBar.replace("w-full min-w-[var(--tap-min)] rounded-l-pill", "w-full min-w-0 rounded-l-pill")).some((w) => w.includes("width floor")));
R.ok("0.5 · PLANT listbox left anchor is caught", sourceWrongs(globals.replace('[role="listbox"] { left: auto; right: 0; }', '[role="listbox"] { left: 0; right: auto; }'), queryBar).some((w) => w.includes("anchored")));
if (process.argv.includes("--source")) R.done();

const stage = await Stage.open();
try {
  const css = await stylesheet(allHtml);

  /* ══ §1 · no control is drawn through another, at any width ═══════════════════════════════════════════════════════ */
  R.section("1 · the real bar at every phone width (246–600) and at 768 / 1280: no overlap, the summary holds its words");
  const strip360: Record<string, number> = {};
  for (const l of LOCALES) for (const c of CASES) {
    const bad: string[] = [];
    const widths: string[] = [];
    for (const width of [...PHONE, ...WIDE]) {
      const g = await stage.measure({ body: bodies.get(`${l}:${c.id}`)!, css, width, lang: l, fn: probe });
      for (const w of wrongs(g)) bad.push(`${width}: ${w}`);
      if (width === 320 || width === 360) widths.push(`${width} sum ${g.sum?.w.toFixed(0)} strip ${g.strip?.w.toFixed(0)}`);
      if (width === 360 && c.id === "guest") strip360[l] = g.strip?.w ?? 0;
    }
    R.ok(`1 · ${l} ${c.id}`, bad.length === 0, bad.length ? bad.slice(0, 4).join(" · ") : widths.join(" · "));
  }
  for (const l of LOCALES) {
    const bad: string[] = [];
    for (const width of [246, 320, 360, 390]) {
      const g = await stage.measure({ body: bodies.get(`${l}:guest`)!, css, width, lang: l, arg: true, fn: probe });
      for (const w of wrongs(g)) bad.push(`${width}: ${w}`);
    }
    R.ok(`1 · ${l} open sort panel stays inside the bar at 246/320/360/390`, bad.length === 0, bad.slice(0, 3).join(" · "));
  }

  /* ══ §2 · where it already fit, nothing moved ══════════════════════════════════════════════════════════════════════ */
  R.section("2 · from 360 the strip keeps its 160px beside the controls (a guest's default bar, the shape that already fit)");
  for (const l of LOCALES) R.ok(`2 · ${l} at 360 the strip is ≥ 160px`, strip360[l] >= 160 - 0.5, `${strip360[l]?.toFixed(1)}px`);

  /* ══ §3 · plants ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
  R.section("3 · PLANTS — the shipped track, a large strip floor, and a left-anchored menu are caught");
  R.ok("3.0 · locate · the compact bar's track list is the fix's (`minmax(0, 1fr) max-content auto`)", NOW.test(read("src/app/globals.css")));
  const shipped = (g: string) => g.replace(NOW, "grid-template-columns: minmax(160px, 1fr) auto auto;");
  const floored = (g: string) => g.replace(NOW, "grid-template-columns: minmax(200px, 1fr) auto auto;");
  for (const [name, edit] of [["the shipped track", shipped], ["a 200px strip floor", floored]] as const) {
    const pcss = await stylesheet(allHtml, edit);
    R.ok(`3 · PLANT ${name} · the stylesheet really changed`, pcss !== css);
    for (const l of LOCALES) {
      const g = await stage.measure({ body: bodies.get(`${l}:guest`)!, css: pcss, width: 320, lang: l, fn: probe });
      const w = wrongs(g);
      R.ok(`3 · PLANT ${name} · sort overlap caught at 320 in ${l}`,
        w.some((x) => /summary runs|key starts|caret ends|sort key runs/.test(x)), w.slice(0, 2).join(" · ") || `NOT CAUGHT (${g.cols})`);
    }
  }
  // The pre-fix positioning was relative to the sort details element. Mutating
  // only its left/right declarations now anchors to the whole bar at x=0 and
  // leaves the menu visible, so restore both old declarations as one plant.
  const oldPanel = (g: string) => g
    .replace('> details { position: static; }', '> details { position: relative; }')
    .replace('[role="listbox"] { left: auto; right: 0; }', '[role="listbox"] { left: 0; right: auto; }');
  const panelCss = await stylesheet(allHtml, oldPanel);
  R.ok("3 · PLANT left-anchored menu · stylesheet changed", panelCss !== css);
  for (const l of LOCALES) {
    const g = await stage.measure({ body: bodies.get(`${l}:guest`)!, css: panelCss, width: 320, lang: l, arg: true, fn: probe });
    const w = wrongs(g);
    R.ok(`3 · PLANT left-anchored menu · caught at 320 in ${l}`, w.some((x) => x.includes("sort listbox crosses the viewport")), w.slice(0, 2).join(" · "));
  }
} finally {
  await stage.close();
}
R.done();
