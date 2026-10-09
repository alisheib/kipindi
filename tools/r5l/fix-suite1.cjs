// R5-L · suite fixes before its first run: decoration out of geometry, a page box made of two strings, order-free
// attribute maps, a balanced Suspense scan, the button's words counted where they stand.
const fs = require("fs");
const path = require("path");
const F = path.join(__dirname, "stage/scripts/visual-pass-r5l.test.mts");
let s = fs.readFileSync(F, "utf8");
const once = (from, to, label) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${label}: ${n}`); s = s.replace(from, () => to); };

once(String.raw`|ring.*|kp-shimmer-track|transition.*|cursor-.+|opacity-\d+|content-fade-in)$/;`,
  String.raw`|ring.*|kp-shimmer-track|kp-rise|group|transition.*|cursor-.+|opacity-\d+|content-fade-in|rounded(?:-[\w\[\]%/.-]+)?|select-none)$/;`,
  "INK");
once("type Pair = { band: string; page: string; pageFile: string; ghost: string; ghostFile: string; n?: number; ghostN?: number };",
  "/** `page` may be several strings (a component that joins its box from parts — PageRibbon's `cn(…, …)`). */\ntype Pair = { band: string; page: string | string[]; pageFile: string; ghost: string; ghostFile: string; n?: number; ghostN?: number };",
  "Pair");
once("    const ps = src(p.pageFile), gs = src(p.ghostFile);\n    const pc = count(ps, `\"${p.page}\"`) + count(ps, `\\`${p.page}`) + count(ps, `\"${p.page} `), gc = count(gs, `\"${p.ghost}\"`) + count(gs, `\\`${p.ghost}`);\n    if (pc < (p.n ?? 1)) bad.push(`${p.band}: the page no longer carries \"${p.page}\" (${pc})`);\n",
  "    const ps = src(p.pageFile), gs = src(p.ghostFile);\n    const parts = Array.isArray(p.page) ? p.page : [p.page];\n    const pc = Math.min(...parts.map((x) => count(ps, `\"${x}\"`) + count(ps, `\\`${x}`) + count(ps, `\"${x} `))), gc = count(gs, `\"${p.ghost}\"`) + count(gs, `\\`${p.ghost}`);\n    if (pc < (p.n ?? 1)) bad.push(`${p.band}: the page no longer carries \"${parts.join(\" + \")}\" (${pc})`);\n",
  "held count");
once("    if (geom(p.page) !== geom(p.ghost)) bad.push(`${p.band}: ${geom(p.page)} ≠ ${geom(p.ghost)}`);",
  "    if (geom(parts.join(\" \")) !== geom(p.ghost)) bad.push(`${p.band}: ${geom(parts.join(\" \"))} ≠ ${geom(p.ghost)}`);",
  "held geom");
once("const firstEl = (s: string, tag: string) => { const i = s.search(new RegExp(`<${tag}\\\\b`)); return i < 0 ? \"\" : element(s, i); };\n",
  "/** An element's attributes as one comparable string, whatever their order. */\nconst attrKey = (el: string) => j(Object.entries(attrs(el)).sort(([a], [b]) => a.localeCompare(b)));\n",
  "firstEl");
once("    if (want.header && j(attrs(gHeader)) !== j(attrs(wantHeader))) bad.push(`${f}: header ${j(attrs(gHeader))} ≠ ${j(attrs(wantHeader))}`);\n    if (j(attrs(gHero)) !== j(attrs(want.hero))) bad.push(`${f}: hero ${gHero || \"none\"} ≠ ${want.hero || \"none\"}`);",
  "    if (want.header && attrKey(gHeader) !== attrKey(wantHeader)) bad.push(`${f}: header ${attrKey(gHeader)} ≠ ${attrKey(wantHeader)}`);\n    if (attrKey(gHero) !== attrKey(want.hero)) bad.push(`${f}: hero ${gHero || \"none\"} ≠ ${want.hero || \"none\"}`);",
  "attr compare");
once("    for (const m of s.matchAll(/<Suspense fallback=\\{([^}]*?)\\}>/g)) {\n      const fb = m[1].trim();\n",
  "    for (const m of s.matchAll(/<Suspense fallback=\\{/g)) {\n      // The fallback's own element, its braces balanced (a ghost handed `notable={…}` has braces inside).\n      const open = (m.index ?? 0) + m[0].length - 1;\n      let d = 0, k = open; for (; k < s.length; k++) { if (s[k] === \"{\") d++; else if (s[k] === \"}\" && --d === 0) break; }\n      const fb = s.slice(open + 1, k).trim();\n",
  "suspense scan");
once("      t.statEarn, t.statCost, t.statTime, t.statEarnHint, t.statTimeHint, t.ctaApply];",
  "      t.statEarn, t.statCost, t.statTime, t.statEarnHint, t.statTimeHint];",
  "ctaApply");
once("    if (!html.includes(esc(t.heroSub)) || html.includes(\"TZS 100,000\") || html.includes(\">10%\")) wrong.push(`${l}: header or a figure`);",
  "    if (!html.includes(esc(t.heroSub)) || html.includes(\"TZS 100,000\") || html.includes(\">10%\") || !html.includes(`>${esc(t.ctaApply)}<`)) wrong.push(`${l}: header, a figure or the button's words`);",
  "cta words");
once("  { band: \"the ribbon\", page: \"flex flex-wrap items-baseline gap-x-6 gap-y-2\", pageFile: RIB,",
  "  { band: \"the ribbon\", page: [\"rounded-xl border border-border bg-bg-elevated/60 px-4 py-3\", \"flex flex-wrap items-baseline gap-x-6 gap-y-2\"], pageFile: RIB,",
  "ribbon pair");
once("  { band: \"the table's scroller\", page: \"rounded-xl glass-panel\", pageFile: LB, ghost: \"scrollx overflow-x-auto rounded-xl glass-panel text-transparent\", ghostFile: LBG },\n", "", "scroller pair");
once("  ok(\"5.2 · the bands stand in the page's order",
  "  const scroller = pg.includes('<ScrollX label=\"Leaderboard\" className=\"rounded-xl glass-panel\">') && code(\"src/components/ui/scroll-x.tsx\").includes('\"scrollx overflow-x-auto rounded-md\"') && g.includes('className=\"scrollx overflow-x-auto rounded-xl glass-panel text-transparent\"');\n  ok(\"5.2 · the bands stand in the page's order",
  "scroller check");
once("    order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])) && !/BrandSpinner|t\\.common\\.loading/.test(g) && pg.includes(\"<div className={cn(QUERY_BAR_ROW2_CLASS, \\\"py-0\\\")}>\"), j(order));",
  "    order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])) && !/BrandSpinner|t\\.common\\.loading/.test(g) && pg.includes(\"<div className={cn(QUERY_BAR_ROW2_CLASS, \\\"py-0\\\")}>\") && scroller, j({ order, scroller }));",
  "scroller cond");
once("  ok(\"5.2 · the bands stand in the page's order — header, ribbon, lens, the sort on its own `py-0` row, podium, table — and the spinner box the page does not have is gone\",",
  "  ok(\"5.2 · the bands stand in the page's order — header, ribbon, lens, the sort on its own `py-0` row, podium, the table in ScrollX's own scroller (`scrollx overflow-x-auto`, the page's glass) — and the spinner box the page does not have is gone\",",
  "5.2 label");
// The rhythm: the page container's own class (the first PageContainer, else /fairness' own container).
once("  const rhythm = /className=\"[^\"]*\\b(space-y-[56])\\b/.exec(pageSrc.slice(pageSrc.search(/<PageContainer\\b|className=\"mx-auto max-w-\\[1080px\\]/)))?.[1] ?? \"\";",
  "  const container = /<PageContainer tier=\"\\w+\" className=\"([^\"]*)\"/.exec(pageSrc)?.[1] ?? /<div className=\"(mx-auto max-w-\\[1080px\\][^\"]*space-y-[56][^\"]*)\"/.exec(pageSrc)?.[1] ?? \"\";\n  const rhythm = /\\b(space-y-[56])\\b/.exec(container)?.[1] ?? \"\";",
  "rhythm");
fs.writeFileSync(F, s);
console.log("suite staged");
