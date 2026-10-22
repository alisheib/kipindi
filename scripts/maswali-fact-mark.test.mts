/**
 * A FACT'S MARK NEVER STANDS ALONE ON A LINE — `.kp-mln-fact::before` in globals.css, measured in the browser (MASWALI-BUILD
 * S5 round 2: HUB's read of the graded week's door row at sw 320; the lead's ruling of 2026-10-22).
 *
 *   npx tsx scripts/maswali-fact-mark.test.mts        (npm run test:maswali-fact-mark — Chromium, and WebKit where installed)
 *
 * 🔴 WHAT HUB SAW: "Matokeo 15 kati ya 15 yametolewa" a line LOW in its row, under the chevron, an empty line above it. The
 * fact's mark was an inline-block — an atomic inline, which a line may always break after — so when a fact's first run did
 * not fit its line, the line broke between the mark and the run: the mark alone on the first line (cut away by the list's
 * clip, so the line read empty) and the words on the next. `test:maswali-facts` keeps every run within its line; this suite
 * holds what a run wider than its line does all the same.
 * ⭐ THE RULE: the mark stands outside the line's flow — absolutely positioned in its fact's own gap, the fact its containing
 * block — so it offers no break, and a fact's first run opens its first line however wide it is.
 *   §1 a fact whose first run is wider than its line holds that run on its FIRST line — en, sw, zh, each a fact of its own
 *      that opens on a kept run ("Tiketi zako 15 zimerejeshwa", HUB's shape: one run), in a line 8px narrower than the run.
 *   §2 nothing else moved: on a line of facts every mark is drawn pixel for pixel where the release's inline-block mark drew
 *      it (the release's rules rendered beside the shipped ones, the words made transparent so only the marks paint).
 *   §3 the mark of a fact that opens a line is still cut away (the list's clip).
 *   §4 PLANTS, each a rule of the stylesheet put back or taken out: the release's inline-block mark (§1 reads the empty line
 *      again), the fact no longer its mark's containing block (§2), the list unclipped (§3).
 * Every section runs in every engine present: Chromium always (CI installs it), WebKit where installed (iOS's engine).
 * The page is about:blank: the shipped rules (every rule of globals.css that names `.kp-mln-fact`, and `.mono`, `.amount`
 * and `.kp-mln-zh`), the keeper's own markup (`MaswaliFacts`, `keepFact`, the dictionary) and the census' faces (Inter,
 * JetBrains Mono) as data. No server, no network, nothing written.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { weekWord } from "../src/components/maswali/maswali-format.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const FACTS = req("../src/components/maswali/maswali-facts.tsx") as typeof import("../src/components/maswali/maswali-facts.tsx");
type CssNode = { type: string; name?: string; params?: string; parent?: CssNode; toString(): string };
const postcss = req("postcss") as { parse: (css: string) => { walkRules(cb: (r: CssNode & { selector: string }) => void): void } };
const { chromium, webkit } = req("playwright") as typeof import("playwright");
const j = (v: unknown) => JSON.stringify(v);
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const premise = (cond: boolean, what: string) => { if (!cond) throw new Error(`PREMISE ABSENT — ${what}`); };

/* ── the shipped rules, and the plants ───────────────────────────────────────────────────────────────────────────────── */
const CSS = readFileSync(join(ROOT, "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const picked: Array<{ selector: string; text: string }> = [];
postcss.parse(CSS).walkRules((r) => {
  if (!/kp-mln-fact/.test(r.selector) && ![".mono", ".amount.amount", ".kp-mln-zh:lang(zh)"].includes(r.selector)) return;
  const at = r.parent?.type === "atrule" ? r.parent : null;
  picked.push({ selector: r.selector, text: at ? `@${at.name} ${at.params} { ${r.toString()} }` : r.toString() });
});
const SHIPPED = picked.map((p) => p.text).join("\n");
const ruleOf = (selector: string) => {
  const found = picked.filter((p) => p.selector === selector && !p.text.startsWith("@"));
  premise(found.length === 1, `the stylesheet holds one top-level \`${selector}\` rule (found ${found.length})`);
  return found[0].text;
};
for (const s of [".kp-mln-facts", ".kp-mln-fact", ".kp-mln-fact::before", ".mono", ".amount.amount", ".kp-mln-zh:lang(zh)"]) ruleOf(s);
/** The shipped rules with rules rewritten, and whether that changed them (a plant that changes nothing proves nothing). */
const swap = (edits: Array<[selector: string, edit: (text: string) => string]>) => {
  let css = SHIPPED;
  for (const [selector, edit] of edits) css = css.replace(ruleOf(selector), edit(ruleOf(selector)));
  return { css, applied: css !== SHIPPED };
};
/** The release's own rules (9b3f23b11, as `test:maswali-design` 4.A1b pinned them): the mark an inline-block in the flow.
 *  It is also §2's measure of what "nothing moved" means. */
const RELEASE = swap([
  [".kp-mln-fact", () => ".kp-mln-fact { min-width: 0; padding-inline-start: var(--mln-sep); }"],
  [".kp-mln-fact::before", () => '.kp-mln-fact::before { content: "·"; content: "·" / ""; display: inline-block; width: var(--mln-sep); margin-inline-start: calc(-1 * var(--mln-sep)); text-align: center; }'],
]);
const NO_HOLDER = swap([[".kp-mln-fact", (s) => s.replace(/position: relative;\s*/, "")]]);
const NO_CLIP = swap([[".kp-mln-facts", (s) => s.replace(/clip-path: [^;]+;\s*/, "")]]);

/* ── the page: the keeper's markup in the census' faces ──────────────────────────────────────────────────────────────── */
const face = (f: string) => `data:font/ttf;base64,${readFileSync(join(ROOT, "src/lib/server/reports/fonts", f)).toString("base64")}`;
const BASE = `
@font-face { font-family: "Inter"; src: url(${face("Inter-Regular.ttf")}); }
@font-face { font-family: "JetBrains Mono"; src: url(${face("JetBrainsMono-Regular.ttf")}); }
:root { --font-mono: "JetBrains Mono", monospace; }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 48px; background: #fff; color: #000; font: 13px/18px "Inter", sans-serif; letter-spacing: -0.05px; }
.box { margin: 0 0 24px; }
.whitespace-nowrap { white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.ink .kp-mln-fact { color: transparent; }
.ink .kp-mln-fact::before { color: rgb(200, 0, 0); }`;
const LOCALES = ["sw", "en", "zh"] as const;
type L3 = (typeof LOCALES)[number];
const T = { sw: dict.sw, en: dict.en, zh: dict.zh };
const list = (facts: unknown[]) => renderToStaticMarkup(h(FACTS.MaswaliFacts as never, { facts } as never));
/** A fact that opens on a kept run, in each language's own words: "Tiketi zako 15 zimerejeshwa" (one run, as HUB's line
 *  was), "Week 49 opens Wednesday" (one run), "周五 18:00 EAT 锁定" (the clock's run, then its word). */
const OPENS: Record<L3, string> = {
  sw: FACTS.factsOf(fill(T.sw.millionea.weekVoidModalBody, { n: 15, amount: formatTzs(15_000) }))[0] ?? "",
  en: fill(T.en.millionea.nextWeekOpens, { week: 49, day: T.en.millionea.weekdays[2] }),
  zh: FACTS.factsOf(fill(T.zh.millionea.lockedAt, { when: `${T.zh.millionea.weekdays[4]} 18:00` }))[0] ?? "",
};
const opens = (l: L3) => FACTS.keepFact(l, OPENS[l]);
const results = (l: L3) => FACTS.keepFact(l, fill(T[l].millionea.resultsOut, { n: 5 }));
// The shared lines first, so where they stand never depends on how the boxes after them wrap. Chinese is set as every
// Millionea root sets it (`.kp-mln-zh`: its runs break only at spaces and punctuation).
const BOXES = [
  ...LOCALES.map((l) => ({ id: `line-${l}`, l, markup: list([FACTS.keepFact(l, weekWord(T[l], 49)), opens(l), results(l)]) })),
  ...LOCALES.map((l) => ({ id: `open-${l}`, l, markup: list([opens(l), results(l)]) })),
  ...LOCALES.map((l) => ({ id: `run-${l}`, l, markup: list([opens(l)]) })),
];
const html = (rules: string) => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}\n${rules}</style></head><body>${BOXES.map((b) => `<div class="box${b.l === "zh" ? " kp-mln-zh" : ""}" id="${b.id}" lang="${b.l}" style="width: 1000px">${b.markup}</div>`).join("")}</body></html>`;
/** In the page, plain script (no transpiled helpers): each box's measure. */
const IN_PAGE = `window.mln = {
  run(id) {
    const box = document.getElementById(id), fact = box.querySelector(".kp-mln-fact"), run = fact.querySelector(".whitespace-nowrap");
    if (!run || fact.firstChild !== run) return { premise: false };
    box.style.width = "4000px";
    const w = run.getBoundingClientRect().width;
    box.style.width = (Math.floor(w) - 8) + "px";
    const f = fact.getBoundingClientRect(), r = run.getBoundingClientRect();
    return { premise: true, run: run.textContent, w: Math.round(w * 10) / 10, box: Math.floor(w) - 8, drop: Math.round((r.top - f.top) * 100) / 100, lineH: parseFloat(getComputedStyle(fact).lineHeight) };
  },
  oneLine(id) {
    const tops = [...document.getElementById(id).querySelectorAll(".kp-mln-fact")].map((f) => Math.round(f.getBoundingClientRect().top));
    return tops.length > 1 && new Set(tops).size === 1;
  },
  eachOpens(id) {
    const box = document.getElementById(id), facts = [...box.querySelectorAll(".kp-mln-fact")];
    box.style.width = "4000px";
    const widths = facts.map((f) => f.getBoundingClientRect().width), sep = parseFloat(getComputedStyle(facts[0]).paddingLeft);
    box.style.width = (Math.ceil(Math.max(...widths) - sep) + 2) + "px";
    const tops = facts.map((f) => Math.round(f.getBoundingClientRect().top));
    return facts.length > 1 && new Set(tops).size === facts.length;
  },
  async ink(b64) {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, at = [];
    for (let i = 0; i < d.length; i += 4) if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) at.push((i / 4) % c.width + "," + Math.floor(i / 4 / c.width) + ":" + d[i] + "/" + d[i + 1] + "/" + d[i + 2]);
    return { n: at.length, sig: at.join(" ") };
  },
};`;

type Run = { premise: boolean; run?: string; w?: number; box?: number; drop?: number; lineH?: number };
type Ink = { n: number; sig: string };
type Read = { runs: Record<L3, Run>; line: Record<L3, Ink>; open: Record<L3, Ink>; oneLine: Record<L3, boolean>; eachOpens: Record<L3, boolean> };
type Page = import("playwright").Page;
/** One stylesheet, read in one engine: §1's runs, then the marks' ink on the shared lines (§2) and the opened ones (§3). */
const readWith = async (page: Page, rules: string): Promise<Read> => {
  await page.setContent(html(rules));
  await page.addScriptTag({ content: IN_PAGE });
  await page.evaluate(() => document.fonts.ready);
  premise(await page.evaluate(() => document.fonts.check('13px "Inter"') && document.fonts.check('13px "JetBrains Mono"')), "the census' faces loaded");
  const out = { runs: {}, line: {}, open: {}, oneLine: {}, eachOpens: {} } as Read;
  for (const l of LOCALES) {
    out.runs[l] = await page.evaluate((id) => (window as unknown as { mln: { run(id: string): Run } }).mln.run(id), `run-${l}`);
    out.oneLine[l] = await page.evaluate((id) => (window as unknown as { mln: { oneLine(id: string): boolean } }).mln.oneLine(id), `line-${l}`);
    out.eachOpens[l] = await page.evaluate((id) => (window as unknown as { mln: { eachOpens(id: string): boolean } }).mln.eachOpens(id), `open-${l}`);
  }
  await page.evaluate(() => document.body.classList.add("ink"));
  for (const l of LOCALES) for (const [key, id] of [["line", `line-${l}`], ["open", `open-${l}`]] as const) {
    const bb = await (await page.$(`#${id}`))!.boundingBox();
    premise(bb !== null, `the box ${id} is drawn`);
    const shot = await page.screenshot({ clip: { x: bb!.x - 32, y: bb!.y - 4, width: bb!.width + 64, height: bb!.height + 8 } });
    out[key][l] = await page.evaluate((b64) => (window as unknown as { mln: { ink(b: string): Promise<Ink> } }).mln.ink(b64), shot.toString("base64"));
  }
  return out;
};

const ENGINES: Array<[string, typeof chromium]> = [["Chromium", chromium]];
if (existsSync(webkit.executablePath())) ENGINES.push(["WebKit", webkit]);
else console.log("  WebKit is not installed here: Chromium alone runs (CI installs Chromium only).");
const PER_ENGINE = 6;
for (const [name, engine] of ENGINES) {
  console.log(`\n── ${name}`);
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
    const now = await readWith(page, SHIPPED), was = await readWith(page, RELEASE.css);
    const noHolder = await readWith(page, NO_HOLDER.css), noClip = await readWith(page, NO_CLIP.css);
    for (const l of LOCALES) {
      premise(now.runs[l].premise && was.runs[l].premise, `${l}: the fact opens on its kept run`);
      premise(now.oneLine[l] && was.oneLine[l], `${l}: the shared line's facts share one line`);
      premise(now.eachOpens[l] && was.eachOpens[l], `${l}: each fact of the opened box opens its own line`);
      console.log(`  ${l} "${now.runs[l].run}" ${now.runs[l].w}px in a ${now.runs[l].box}px line: drops ${now.runs[l].drop}px now, ${was.runs[l].drop}px with the release's mark (a line is ${now.runs[l].lineH}px) · marks' ink on the shared line ${now.line[l].n}px now, ${was.line[l].n}px at the release`);
    }
    // §1 — the run on the fact's first line: its top within the first line (an empty line above it drops it a whole line).
    ok(`§1 ${name} · a fact whose first run is wider than its line holds the run on its FIRST line — en, sw, zh (${LOCALES.map((l) => `${l} ${now.runs[l].drop}px`).join(", ")} below the fact's top; a line is ${now.runs.en.lineH}px)`,
      LOCALES.every((l) => (now.runs[l].drop ?? 99) < (now.runs[l].lineH ?? 0) / 2), j(now.runs));
    // §2 — the marks drawn pixel for pixel as the release drew them.
    ok(`§2 ${name} · on a line of facts every mark is drawn pixel for pixel where the release's inline-block mark drew it — en, sw, zh (${LOCALES.map((l) => `${l} ${now.line[l].n}px of ink`).join(", ")})`,
      LOCALES.every((l) => now.line[l].n > 0 && now.line[l].sig === was.line[l].sig), j(LOCALES.map((l) => [l, now.line[l].n, was.line[l].n])));
    // §3 — a line-opening fact's mark still cut away.
    ok(`§3 ${name} · the mark of a fact that opens a line is cut away (no ink beside a box whose every fact opens its own line) — en, sw, zh`,
      LOCALES.every((l) => now.open[l].n === 0), j(LOCALES.map((l) => [l, now.open[l].n])));
    // §4 — plants.
    ok(`§4.1 PLANT ${name} · the release's inline-block mark: §1 reads the empty line again — the run a whole line low in every language (${LOCALES.map((l) => `${l} ${was.runs[l].drop}px`).join(", ")})`,
      RELEASE.applied && LOCALES.every((l) => (was.runs[l].drop ?? 0) >= (was.runs[l].lineH ?? 99) - 2), RELEASE.applied ? j(was.runs) : "the shipped rules ARE the release's: nothing to plant");
    ok(`§4.2 PLANT ${name} · the fact no longer its mark's containing block: §2 sees the marks leave their gaps`,
      NO_HOLDER.applied && LOCALES.some((l) => noHolder.line[l].sig !== was.line[l].sig), NO_HOLDER.applied ? j(LOCALES.map((l) => [l, noHolder.line[l].n])) : "the fact holds no `position: relative` to take out");
    ok(`§4.3 PLANT ${name} · the list unclipped: §3 sees the opening facts' marks`,
      NO_CLIP.applied && LOCALES.every((l) => noClip.open[l].n > 0), NO_CLIP.applied ? j(LOCALES.map((l) => [l, noClip.open[l].n])) : "the list holds no clip to take out");
  } finally {
    await browser.close();
  }
}

console.log(`\n${"═".repeat(70)}\n  MASWALI FACT MARK: ${pass} passed, ${fail} failed (${ENGINES.map(([n]) => n).join(" + ")})\n${"═".repeat(70)}`);
/** The floor is the count a green run printed: six checks in each engine that ran. */
const MIN_ASSERTIONS = PER_ENGINE * ENGINES.length;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
