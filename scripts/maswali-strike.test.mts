/**
 * A STRUCK QUESTION'S STRIKE ENDS AT ITS INK — `MaswaliStrike` (`src/components/maswali/maswali-strike.tsx`) and
 * `.kp-mln-strike-end` (globals.css). MASWALI-BUILD S5 round 2, the lead's read of the zh tiles: "…吗？-".
 *
 *   npx tsx scripts/maswali-strike.test.mts        (npm run test:maswali-strike)
 *
 * 🔴 A full-width closing mark is a whole em wide and a Simplified Chinese face draws its ink in the left of it, so a
 * line-through that ran the whole advance drew half an em past "？" on the ticket and the hub.
 *   §1 THE DRAWING, rendered: a struck text that ends on a full-width mark draws that mark in `.kp-mln-strike-end` (`--q`
 *      for ？) and only that one; a Latin "?" is drawn as it came; the text reads as written in every language.
 *   §2 THE TRIMS: the stylesheet cuts the mark back by exactly the platform's measured trims (`CJK_TRIM_EM`, cjk-marks.tsx).
 *   §3 ONE DRAWING: every Millionea file that strikes text strikes it through `MaswaliStrike` — the hub's page adopts it
 *      at the merge (`ADOPTS_AT_MERGE`, a list that may only shrink: the entry goes when the hub draws it).
 *   §4 PLANTS: the drawing without its end mark (§1), a trim that is not the platform's (§2), the ticket's own strike
 *      put back (§3).
 *   §5 IN THE BROWSER (Chromium always, WebKit where installed; the platform's CJK face stack at 13px): the strike ends at
 *      the last mark's ink, the ink is whole, the lines lie where the plain text's lie — and, the control, a plain strike
 *      runs on past the ink. ⚠️ Only where the machine's Chinese face draws ？ in the LEFT half of its em, as the platform's
 *      own measurement (Microsoft YaHei, SimSun) and every Simplified Chinese face do: elsewhere (a CI box with a Japanese
 *      or a centred face) the section says so and does not run.
 * ⛔ It reads, compiles and renders in memory, and draws on about:blank; it writes nothing.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { CJK_TRIM_EM } from "../src/lib/cjk-marks.tsx";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const j = (v: unknown) => JSON.stringify(v);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s}`);
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");

/* ── the component, as the tree has it and planted ──────────────────────────────────────────────────────────────────── */
const STRIKE_REL = "src/components/maswali/maswali-strike.tsx";
type Strike = { MaswaliStrike: (p: { text: string }) => unknown };
const compileAt = (rel: string, source: string): Strike => {
  const out = ts.transpileModule(source, {
    fileName: join(ROOT, rel),
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const live = req.resolve(`../${rel}`);
  const m = new NodeModule(live) as NodeModule & { _compile(s: string, f: string): void };
  m.filename = live;
  m.paths = (NodeModule as unknown as { _nodeModulePaths(d: string): string[] })._nodeModulePaths(dirname(live));
  m._compile(out, live);
  return m.exports as unknown as Strike;
};
const SRC = raw(STRIKE_REL);
const now = compileAt(STRIKE_REL, SRC);
const planted = (from: string, to: string): Strike => {
  if (SRC.split(from).length - 1 !== 1) throw new Error(`PREMISE ABSENT — the plant's anchor "${from.slice(0, 60)}…" is not in ${STRIKE_REL} exactly once`);
  return compileAt(STRIKE_REL, SRC.replace(from, to));
};
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const textOf = (m: string) => dec(m.replace(/<[^>]+>/g, ""));
const drawn = (k: Strike, text: string) => renderToStaticMarkup(h(k.MaswaliStrike as never, { text } as never));

/* ══ §1 · THE DRAWING ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · a struck text that ends on a full-width mark draws that mark, alone, cut back to its ink");
const INK = '<span class="line-through decoration-border-strong">';
const CASES: Array<{ lang: string; text: string; want: string }> = [
  { lang: "zh", text: "本周末第 1 个事件会发生吗？", want: `${INK}本周末第 1 个事件会发生吗<span class="kp-mln-strike-end kp-mln-strike-end--q">？</span></span>` },
  { lang: "zh", text: "周日达累斯萨拉姆的降雨量会达到至少 1 毫米吗（以 TMA 测量为准）？", want: `${INK}周日达累斯萨拉姆的降雨量会达到至少 1 毫米吗（以 TMA 测量为准）<span class="kp-mln-strike-end kp-mln-strike-end--q">？</span></span>` },
  { lang: "zh", text: "如果第 1 个事件得到来源确认则为是。", want: `${INK}如果第 1 个事件得到来源确认则为是<span class="kp-mln-strike-end">。</span></span>` },
  { lang: "zh", text: "真的吗？！", want: `${INK}真的吗？<span class="kp-mln-strike-end">！</span></span>` },
  { lang: "en", text: "Will event 1 happen this weekend?", want: `${INK}Will event 1 happen this weekend?</span>` },
  { lang: "sw", text: "Je, tukio la 1 litatokea wikendi hii?", want: `${INK}Je, tukio la 1 litatokea wikendi hii?</span>` },
];
const drawingDefects = (k: Strike) => CASES.flatMap(({ lang, text, want }) => {
  const m = drawn(k, text);
  const d: string[] = [];
  if (m !== want) d.push(`${lang} "${text}": drew ${m}`);
  if (textOf(m) !== text) d.push(`${lang} "${text}": reads "${textOf(m)}"`);
  return d;
});
const d1 = drawingDefects(now);
ok(`1.1 · zh: the last ？ (after a closing bracket too), 。 or ！ in \`.kp-mln-strike-end\` (\`--q\` for ？), the mark before a last mark left whole; en and sw "?" drawn as they came; every text reads as written (${CASES.length} cases)`,
  d1.length === 0, d1.join(" | "));

/* ══ §2 · THE TRIMS ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · the stylesheet cuts the last mark back by the platform's own measured trims");
const CSS = raw("src/app/globals.css");
type CssNode = { type: string; parent?: CssNode; toString(): string; walkDecls?: (cb: (d: { prop: string; value: string }) => void) => void };
const postcss = req("postcss") as { parse: (css: string) => { walkRules(cb: (r: CssNode & { selector: string; walkDecls(cb: (d: { prop: string; value: string }) => void): void }) => void): void } };
const clipOf = (css: string) => {
  const out: Record<string, string[]> = {};
  postcss.parse(css).walkRules((r) => {
    if (!r.selector.includes("kp-mln-strike-end")) return;
    r.walkDecls((d) => { (out[r.selector] ??= []).push(`${d.prop}: ${d.value}`); });
  });
  return out;
};
const trimDefects = (css: string) => {
  const c = clipOf(css), d: string[] = [];
  const want = { ".kp-mln-strike-end": CJK_TRIM_EM.mark, ".kp-mln-strike-end--q": CJK_TRIM_EM.question };
  for (const [sel, em] of Object.entries(want)) {
    if (j(c[sel]) !== j([`clip-path: inset(0 ${em}em 0 0)`])) d.push(`${sel}: ${j(c[sel] ?? null)}, the platform's trim is ${em}em`);
  }
  if (Object.keys(c).length !== 2) d.push(`${Object.keys(c).length} rules name .kp-mln-strike-end: ${j(Object.keys(c))}`);
  return d;
};
const d2 = trimDefects(CSS);
ok(`2.1 · \`.kp-mln-strike-end\` clips ${CJK_TRIM_EM.mark}em and \`--q\` ${CJK_TRIM_EM.question}em off the mark's right — the platform's measured trims (cjk-marks.tsx), and no other rule names them`,
  d2.length === 0, d2.join(" | "));

/* ══ §3 · ONE DRAWING ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · every Millionea file that strikes text strikes it through MaswaliStrike");
/** ⛔ MAY ONLY SHRINK: a file here still draws its own strike and adopts `MaswaliStrike` at the merge (the lead's ruling of
 *  2026-10-22). When it draws through the component, its entry goes. */
const ADOPTS_AT_MERGE = new Set(["src/app/millionea/page.tsx"]);
const MLN_DIRS = ["src/app/millionea", "src/components/maswali", "src/app/results"];
const files = (dir: string): string[] => {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((e) => {
    const p = join(abs, e);
    return statSync(p).isDirectory() ? files(relative(ROOT, p)) : /\.tsx?$/.test(e) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
  });
};
const MLN_FILES = MLN_DIRS.flatMap(files).filter((f) => f !== STRIKE_REL);
/** The class strings of a source that ask for a line-through (a string or template piece holding `line-through`). */
const strikesIn = (rel: string, src: string) => {
  const found: string[] = [];
  const tree = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) && /\bline-through\b/.test(n.text)) found.push(n.text);
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return found;
};
const usesStrike = (src: string) => /<MaswaliStrike\b/.test(src);
const oneDrawingDefects = (readAt: (rel: string) => string) => {
  const d: string[] = [];
  for (const f of MLN_FILES) {
    const src = readAt(f), own = strikesIn(f, src);
    if (own.length && !ADOPTS_AT_MERGE.has(f)) d.push(`${f} draws its own strike: ${j(own)}`);
  }
  for (const f of ADOPTS_AT_MERGE) if (!strikesIn(f, readAt(f)).length) d.push(`${f} no longer draws its own strike: take it off ADOPTS_AT_MERGE`);
  return d;
};
const d3 = oneDrawingDefects(raw);
const TICKET = "src/components/maswali/maswali-ticket.tsx";
ok(`3.1 · the ticket strikes a voided question through MaswaliStrike, and no Millionea file but ${[...ADOPTS_AT_MERGE].join(", ")} (it adopts it at the merge) draws a strike of its own (${MLN_FILES.length} files read)`,
  d3.length === 0 && usesStrike(raw(TICKET)) && !strikesIn(TICKET, raw(TICKET)).length, d3.join(" | "));

/* ══ §4 · PLANTS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§4 · each part taken out is caught");
const unwrapped = planted("if (!trim) return <span className={STRIKE_INK}>{text}</span>;", "return <span className={STRIKE_INK}>{text}</span>;");
ok("4.1 PLANT · the drawing without its end mark (the whole text under one strike, as before): §1 reports every zh case",
  drawingDefects(unwrapped).filter((x) => x.startsWith("zh ")).length === 4);
ok("4.2 PLANT · ？ cut back by the dot family's 0.65em (the ink of ？ runs to 0.47em: it would be cut): §2 reports",
  trimDefects(CSS.replace(".kp-mln-strike-end--q { clip-path: inset(0 0.5em 0 0); }", ".kp-mln-strike-end--q { clip-path: inset(0 0.65em 0 0); }")).some((x) => x.startsWith(".kp-mln-strike-end--q")));
const ticketBack = (rel: string) => rel === TICKET
  ? raw(rel).replace('voided || inert ? "text-text-muted" : "text-text")}>{voided ? <MaswaliStrike text={c.text} /> : c.text}', 'voided ? "text-text-muted line-through decoration-border-strong" : inert ? "text-text-muted" : "text-text")}>{c.text}')
  : raw(rel);
ok("4.3 PLANT · the ticket's own strike put back (the release's line): §3 reports it",
  ticketBack(TICKET) !== raw(TICKET) && oneDrawingDefects(ticketBack).some((x) => x.startsWith(TICKET)));

/* ══ §5 · IN THE BROWSER ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("§5 · in the browser: the strike ends at the last mark's ink, and nothing moves");
const { chromium, webkit } = req("playwright") as typeof import("playwright");
const face = (f: string) => `data:font/ttf;base64,${readFileSync(join(ROOT, "src/lib/server/reports/fonts", f)).toString("base64")}`;
/** The platform's CJK faces, as globals.css lists them (`--font-cjk`). */
const CJK_STACK = /--font-cjk:\s*([^;]+);/.exec(CSS)?.[1]?.trim() ?? "";
if (!CJK_STACK) throw new Error("PREMISE ABSENT — globals.css names no --font-cjk");
const SHIPPED_RULES = [".kp-mln-strike-end { clip-path: inset(0 0.65em 0 0); }", ".kp-mln-strike-end--q { clip-path: inset(0 0.5em 0 0); }"];
for (const r of SHIPPED_RULES) if (!CSS.includes(r)) throw new Error(`PREMISE ABSENT — globals.css no longer holds "${r}" (§2 says why)`);
const BASE = `@font-face { font-family: "Inter"; src: url(${face("Inter-Regular.ttf")}); }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px 24px; background: #fff; color: #000; font: 13px/18px "Inter", ${CJK_STACK}, sans-serif; letter-spacing: -0.05px; }
p { margin: 0 0 12px; width: 640px; }
.line-through { text-decoration-line: line-through; }
.decoration-border-strong { text-decoration-color: rgb(0, 0, 255); }
.strike-only p { color: transparent; }
.ink-only .decoration-border-strong { text-decoration-color: transparent; }
${SHIPPED_RULES.join("\n")}`;
const ZH = CASES.filter((c) => c.lang === "zh").slice(0, 3);
const html = (plain: boolean) => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head><body lang="zh">${
  ZH.map((c, i) => `<p id="p${i}">${plain ? `${INK}${c.text}</span>` : drawn(now, c.text)}</p>`).join("")}<p id="probe"><span id="mark">？</span></p></body></html>`;
const IN_PAGE = `window.mln = {
  async rows(b64) {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let right = -1, left = 1e9;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) { right = Math.max(right, x); left = Math.min(left, x); }
    }
    return { left, right };
  },
  lines(id) {
    // Each line's extent: the range's boxes grouped by their top (an element's box and its text's share a line).
    const r = document.createRange(); r.selectNodeContents(document.getElementById(id));
    const byTop = new Map();
    for (const x of r.getClientRects()) {
      if (x.width === 0) continue;
      const top = Math.round(x.top), was = byTop.get(top);
      byTop.set(top, was ? [Math.min(was[0], x.left), top, Math.max(was[2], x.right)] : [x.left, top, x.right]);
    }
    return [...byTop.values()].map(([l, t, rr]) => [Math.round(l * 100) / 100, t, Math.round(rr * 100) / 100]);
  },
};`;
type Ext = { left: number; right: number };
type Page = import("playwright").Page;
const DPR = 2;
/** One page, read: per paragraph its strike's and its ink's right edges (CSS px) and its line boxes; and ？'s own ink. */
const readPage = async (page: Page, plain: boolean) => {
  await page.setContent(html(plain));
  await page.addScriptTag({ content: IN_PAGE });
  await page.evaluate(() => document.fonts.ready);
  const shot = async (sel: string, mode: string) => {
    await page.evaluate((m) => { document.body.className = m; }, mode);
    const bb = (await (await page.$(sel))!.boundingBox())!;
    const png = await page.screenshot({ clip: { x: bb.x - 4, y: bb.y - 2, width: bb.width + 40, height: bb.height + 4 } });
    const e = await page.evaluate((b64) => (window as unknown as { mln: { rows(b: string): Promise<Ext> } }).mln.rows(b64), png.toString("base64"));
    return { left: e.left / DPR + bb.x - 4, right: e.right / DPR + bb.x - 4 };
  };
  const out: Array<{ strike: number; ink: number; lines: number[][] }> = [];
  for (let i = 0; i < ZH.length; i++) {
    out.push({ strike: (await shot(`#p${i}`, "strike-only")).right, ink: (await shot(`#p${i}`, "ink-only")).right,
      lines: await page.evaluate((id) => (window as unknown as { mln: { lines(id: string): number[][] } }).mln.lines(id), `p${i}`) });
  }
  const mark = await shot("#mark", "ink-only");
  const markBox = (await (await page.$("#mark"))!.boundingBox())!;
  return { paras: out, markInk: (mark.right - markBox.x) / markBox.width };
};
const ENGINES: Array<[string, typeof chromium]> = [["Chromium", chromium]];
if (existsSync(webkit.executablePath())) ENGINES.push(["WebKit", webkit]);
const PER_ENGINE = 4;
let browserRan = 0;
const ranIn: string[] = [];
for (const [name, engine] of ENGINES) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 760, height: 400 }, deviceScaleFactor: DPR });
    const struck = await readPage(page, false), plain = await readPage(page, true);
    console.log(`  ${name}: ？ inks to ${struck.markInk.toFixed(3)}em of its advance; ${ZH.map((c, i) => `"…${c.text.slice(-3)}" strike ${struck.paras[i].strike.toFixed(1)} · ink ${struck.paras[i].ink.toFixed(1)} (plain strike ${plain.paras[i].strike.toFixed(1)})`).join("; ")}`);
    if (!(struck.markInk > 0 && struck.markInk < CJK_TRIM_EM.question)) {
      console.log(`  ${name}: PREMISE — this machine's Chinese face draws ？ past half its em (${struck.markInk.toFixed(3)}em): not the Simplified Chinese placement the trims are measured for; §5 does not run here.`);
      continue;
    }
    browserRan++;
    ranIn.push(name);
    ok(`5.1 ${name} · the strike ends at the last mark's ink — ${ZH.map((c, i) => `${c.text.slice(-1)} ${(struck.paras[i].strike - struck.paras[i].ink).toFixed(1)}px`).join(", ")} (within 1px)`,
      struck.paras.every((p) => Math.abs(p.strike - p.ink) <= 1), j(struck.paras));
    ok(`5.2 ${name} · the ink is whole: each text's ink ends where the plain text's does`,
      struck.paras.every((p, i) => Math.abs(p.ink - plain.paras[i].ink) <= 0.5), j({ struck: struck.paras.map((p) => p.ink), plain: plain.paras.map((p) => p.ink) }));
    // Within 0.1px: the text drawn in two runs (its body, then its last mark) sums its advances a hundredth apart.
    const same = (a: number[][], b: number[][]) => a.length === b.length && a.every((l, k) => l.every((v, m) => Math.abs(v - b[k][m]) <= 0.1));
    ok(`5.3 ${name} · nothing moved: every line box of the struck text lies where the plain text's lies (within 0.1px)`,
      struck.paras.every((p, i) => same(p.lines, plain.paras[i].lines)), j({ struck: struck.paras.map((p) => p.lines), plain: plain.paras.map((p) => p.lines) }));
    ok(`5.4 CONTROL ${name} · a plain strike runs on past the ink — ${ZH.map((c, i) => `${c.text.slice(-1)} ${(plain.paras[i].strike - plain.paras[i].ink).toFixed(1)}px`).join(", ")} (≥ 0.4em, 5.2px at 13px)`,
      plain.paras.every((p) => p.strike - p.ink >= 0.4 * 13), j(plain.paras));
  } finally {
    await browser.close();
  }
}

console.log(`\n${"═".repeat(70)}\n  MASWALI STRIKE: ${pass} passed, ${fail} failed (browser: ${ranIn.length ? ranIn.join(" + ") : "did not run"})\n${"═".repeat(70)}`);
/** The floor is the count a green run printed: 6 in memory, and 4 in each engine whose face §5 runs on. */
const MIN_ASSERTIONS = 6 + PER_ENGINE * browserRan;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
