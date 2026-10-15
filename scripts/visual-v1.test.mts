/**
 * test:visual-v1 — THE VISUAL AUDIT'S LANE V1 (2026-10-14/15), HELD BY WHAT A BROWSER COMPUTES.
 *
 *   npm run test:visual-v1        (test:all)
 *   npm run red:visual-v1         (--prove-red: every defect below is planted IN MEMORY — on the stylesheet, a source, or the
 *                                  page a browser drew — and each must be caught by the check that names it)
 *
 * The audit's findings, each re-measured on the code before it was fixed (C:\50pick-ssd\visual-audit\logs\findings.jsonl):
 *   §1 F50 · the bet sheet's middle was cut hard at both edges, so at rest a money figure could be sliced — "≈ TZS 1,153"
 *            under the commit button at 320 zh, a stake box under the header once scrolled. It now fades the edge that
 *            hides something, by the kit's one rule (`scroll-edges.ts`), the How to Play sheet's ramps, and its scroll
 *            padding keeps a revealed control clear of a fade.
 *   §2 F16 · the footer's button ended 8px to the right of every block in the scroller; both now reserve the same gutter.
 *   §3 F15/F15b, F17, F35, F37 · the small notice, large button, deposit rails/note and sheet title use one kit rhythm.
 *
 * HOW IT SEES. A source can say a class is present; only a layout can say an edge is cut, a fade is drawn or two boxes end
 * on one x. So the measured claims are measured: the sheet's real body (`BetSheetBody`, bundled by esbuild with the kit it
 * draws, its hook running) inside a stand-in for the kit Modal whose classes are READ from modal.tsx, under the real
 * stylesheet (globals.css through Tailwind), in the repo's own Inter and JetBrains Mono (src/lib/server/reports/fonts), in
 * headless Chromium — at the audit's viewports, in sw, en and zh. The claims a layout cannot make (no layout read inside
 * the opening tap, S8 A21; one rule for the four states) are held in memory, on the hook's own transpiled source.
 * ⛔ TEST AND RED ARE IN-PROCESS BY CONSTRUCTION: nothing is written to disk (test:red-anchors §4), and no server is
 * needed. Optional --capture writes review images to ignored .qa-shots/visual-v1-candidate-1015. Chromium is required
 * (CI installs it before the suites run; without it this suite fails, it never skips).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import postcss from "postcss";
import { decomment, decommentCss } from "./lib/decomment.mts";
import * as SS from "../src/lib/journey/sheet-state.ts";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "../src/lib/payout.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(ROOT, "package.json"));
const PROVE_RED = process.argv.includes("--prove-red");
const CAPTURE = process.argv.includes("--capture");
const CR = String.fromCharCode(13), NL = String.fromCharCode(10);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR + NL).join(NL);
const j = (v: unknown) => JSON.stringify(v);
const count = (s: string, part: string) => s.split(part).length - 1;
const LOCALES = ["sw", "en", "zh"] as const;
type Locale = (typeof LOCALES)[number];

/* ══ THE SOURCES — what a plant may rewrite ═══════════════════════════════════════════════════════════════════════════ */
const FILES = {
  css: "src/app/globals.css",
  sheet: "src/components/journey/bet-sheet/bet-sheet.tsx",
  parts: "src/components/journey/bet-sheet/sheet-parts.tsx",
  callout: "src/components/ui/callout.tsx",
  edges: "src/components/ui/scroll-edges.ts",
  howto: "src/components/onboarding/how-to-play-sheet.tsx",
  strip: "src/components/ui/strip-autoscroll.tsx",
  modal: "src/components/ui/modal.tsx",
} as const;
type Sources = Record<keyof typeof FILES, string>;
const SOURCES = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, read(f)])) as Sources;

/** One swap on a copy of a text. ⛔ An anchor that does not resolve exactly once THROWS: a broken plant, never a miss. */
function swap(text: string, from: string, to: string): string {
  const n = count(text, from);
  if (n !== 1) throw new Error(`a plant's anchor resolves ${n} times, not once: ${from.slice(0, 90)}`);
  return text.replace(from, () => to);
}

/* ══ THE CASCADE — a selector's last declaration of a property, as postcss parses the sheet ═══════════════════════════ */
type Decl = { sels: string[]; prop: string; value: string; media: string | null };
function cascadeOf(css: string): Decl[] {
  const out: Decl[] = [];
  postcss.parse(decommentCss(css)).walkRules((rule) => {
    let media: string | null = null;
    for (let p = rule.parent; p; p = p.parent) if (p.type === "atrule") media = `${(p as postcss.AtRule).name} ${(p as postcss.AtRule).params}`;
    const sels = rule.selectors.map((s) => s.replace(/\s+/g, " ").trim());
    rule.walkDecls((d) => { out.push({ sels, prop: d.prop, value: d.value.replace(/\s+/g, " ").trim(), media }); });
  });
  return out;
}
/** The last value a top-level rule whose selector list holds `sel` gives `prop` (no at-rule), or null. */
function cv(decls: Decl[], sel: string, prop: string): string | null {
  let v: string | null = null;
  for (const d of decls) if (d.media === null && d.prop === prop && d.sels.includes(sel)) v = d.value;
  return v;
}

/* ══ THE FRAMES — the bet sheet's pure core, on the bet-sheet test's own Dodoma pools ══════════════════════════════════ */
const NOW = Date.UTC(2026, 9, 13, 9, 0);
const MKT = "mkt_dodoma01";
const RATES = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true } as const;
const seed = (o: Partial<SS.SheetSeed> = {}): SS.SheetSeed => ({ v: 1, id: MKT, yesPool: 24_825, noPool: 50_462, rates: { ...RATES } as SS.SheetSeed["rates"], feePct: 13,
  min: PLATFORM_MIN_STAKE, max: PLATFORM_MAX_STAKE, closesAt: new Date(NOW + 3_600_000).toISOString(), serverNow: NOW, bettable: true, ...o });
const facts = (o: Partial<SS.SheetFacts> = {}): SS.SheetFacts => ({
  maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
  wallet: { status: "ACTIVE", balance: 50_000, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
  deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: false, singleTxn: 1_000_000, rolling30d: 5_000_000 }, railsOpen: true },
  ...o,
} as SS.SheetFacts);
const viewer = (f: SS.SheetFacts, held: SS.SheetSide[] = []): SS.SheetViewerRead => {
  const w = f.wallet;
  const spendable = w && w.balance !== null ? Math.max(0, w.balance) + Math.max(0, w.bonusBalance ?? 0) : null;
  return { state: "read", viewer: { spendable, heldSides: held, bonusWager: null, facts: f } };
};
const frameOf = (o: { stakeText?: string; balance?: number; held?: SS.SheetSide[] } = {}) => SS.sheetFrame({
  seed: seed(), side: "YES", stakeText: o.stakeText ?? String(PLATFORM_MIN_STAKE),
  viewer: viewer(facts({ wallet: { status: "ACTIVE", balance: o.balance ?? 50_000, bonusBalance: 0 } } as Partial<SS.SheetFacts>), o.held ?? []),
  nowMs: NOW, intent: null, settled: null,
});
const TITLE: Record<Locale, string> = {
  sw: "Je, Dodoma itapata mvua zaidi ya milimita 10 tarehe 1 Oktoba?",
  en: "Will Dodoma get more than 10 millimetres of rain on 1 October?",
  zh: "多多马 10 月 1 日的降雨量会超过 10 毫米吗？",
};
const RAILS = ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"];
/** The frames the checks open: the edit frame at the minimum stake (the audit's first screen), an edit frame with the
 *  holder notice (a held side: one more block above the stake), and the low-balance frame whose deposit door carries the
 *  minimum note (TZS 500 held against a TZS 1,000 stake: a shortfall under the deposit minimum). */
const FRAMES = { edit: frameOf(), held: frameOf({ held: ["YES"] }), low: frameOf({ stakeText: "1000", balance: 500 }) } as const;
type FrameName = keyof typeof FRAMES;

/* ══ THE BROWSER WORLD ════════════════════════════════════════════════════════════════════════════════════════════════ */
type Page = import("playwright").Page;
type Browser = import("playwright").Browser;
const VIEW = { 320: 568, 360: 740, 390: 844, 768: 1024, 1280: 800, 1920: 1080 } as const;
type Width = keyof typeof VIEW;

/** The kit Modal, stood in for: its tall-sheet wrapper and panel, every class READ from modal.tsx. A Modal that moved a
 *  class out from under this stand-in fails here, by name, instead of being measured in a shape it no longer has. */
const MODAL_PIECES = {
  wrap: "fixed inset-0 flex justify-center overflow-y-auto overscroll-contain",
  wrapTall: "items-end lg:items-center px-0 lg:px-3 py-0 lg:py-4",
  panelIn: "m-sheet-in kp-modal-sheet-lg",
  panel: "mat-modal relative w-full p-5 lg:p-6 outline-none",
  panelTall: "rounded-t-modal lg:rounded-modal lg:my-auto",
};
const SHEET_PANEL = "kp-wsheet kp-bsheet";
function standInHtml(css: string, fonts: string): string {
  return `<!doctype html><html lang="sw" data-shell="journey"><head><meta charset="utf-8">`
    + `<style>${fonts}</style><style>${css}</style>`
    // The settled frame is the one measured: nothing animates or transitions under the measuring tape.
    + `<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style></head><body>`
    + `<div data-dock-wrap="lg" class="${MODAL_PIECES.wrap} ${MODAL_PIECES.wrapTall}">`
    + `<div data-rung="modal" data-dock="lg" class="${MODAL_PIECES.panelIn} ${MODAL_PIECES.panel} ${MODAL_PIECES.panelTall} ${SHEET_PANEL}" style="max-width:440px">`
    + `<div id="v1-shell" class="kp-bsheet__shell" data-testid="journey-bet-sheet"></div></div></div>`
    + `<div id="v1-free"></div></body></html>`;
}

/** The kit, bundled for the page: the sheet's real body and its hook, the dictionaries. next/link and next/navigation are
 *  stood in (no router here); the sheet's links draw the same <a> with the same classes. */
async function bundleKit(): Promise<string> {
  const esbuild = req("esbuild") as typeof import("esbuild");
  const entry = [
    `import * as React from "react";`,
    `import { createRoot } from "react-dom/client";`,
    `import { flushSync } from "react-dom";`,
    `import { BetSheetBody } from "@/components/journey/bet-sheet/bet-sheet";`,
    `import { dict } from "@/lib/i18n-dict";`,
    `const w = window; let root = null;`,
    `w.v1 = {`,
    `  sheet(p) {`,
    `    document.documentElement.lang = p.locale;`,
    `    if (!root) root = createRoot(document.getElementById("v1-shell"));`,
    `    flushSync(() => root.render(null));`,
    `    flushSync(() => root.render(React.createElement(BetSheetBody, { seed: p.seed, side: p.side, title: p.title, frame: p.frame,`,
    `      stakeText: p.stakeText, estimateUpdated: false, railNames: p.railNames, t: dict[p.locale], locale: p.locale, id: "v1", nowMs: p.nowMs,`,
    `      onStakeChange() {}, onPlace() {}, onBetInstead() {}, onDeposit() {}, onClose() {} })));`,
    `  },`,
    `};`,
  ].join(NL);
  const stubs: Record<string, string> = {
    "next/link": `import * as React from "react"; export default function Link({ href, children, prefetch, replace, scroll, ...rest }) { return React.createElement("a", { href: typeof href === "string" ? href : "#", ...rest }, children); }`,
    "next/navigation": `export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} }); export const usePathname = () => "/"; export const useSearchParams = () => new URLSearchParams();`,
  };
  const out = await esbuild.build({
    stdin: { contents: entry, loader: "tsx", resolveDir: ROOT, sourcefile: "visual-v1-entry.tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", logLevel: "error",
    tsconfig: join(ROOT, "tsconfig.json"),
    define: { "process.env.NODE_ENV": `"production"` },
    banner: { js: `var process = { env: { NODE_ENV: "production" } };` },
    plugins: [{ name: "visual-v1-stubs", setup(b) {
      b.onResolve({ filter: /^next\/(?:link|navigation)$/ }, (a) => ({ path: a.path, namespace: "visual-v1-stub" }));
      b.onLoad({ filter: /.*/, namespace: "visual-v1-stub" }, (a) => ({ contents: stubs[a.path], loader: "tsx", resolveDir: ROOT }));
    } }],
  });
  return out.outputFiles[0].text;
}

/** globals.css through Tailwind, its utilities generated from the files the page draws. The two chat stylesheets it
 *  imports draw nothing here and are left out. */
async function compileCss(globals: string): Promise<string> {
  const tailwind = req("tailwindcss") as (c: unknown) => postcss.AcceptedPlugin;
  const config = req(join(ROOT, "tailwind.config.ts")) as { default?: object };
  const drawn = ["src/components/journey/bet-sheet/bet-sheet.tsx", "src/components/journey/bet-sheet/sheet-parts.tsx", "src/components/ui/callout.tsx",
    "src/components/ui/button.tsx", "src/components/ui/input.tsx", "src/components/ui/chip.tsx", "src/components/ui/modal.tsx", "src/components/ui/cash.tsx",
    "src/components/ui/glyphs.tsx", "src/components/ui/dot-seq.tsx", "src/components/ui/keep-run.tsx", "src/components/ui/keep-words.tsx"];
  const cfg = { ...(config.default ?? config), content: drawn.map((f) => ({ raw: read(f), extension: "tsx" })) };
  const source = globals.split(NL).filter((line) => !line.startsWith("@import ")).join(NL);
  return (await postcss([tailwind(cfg)]).process(source, { from: undefined })).css;
}

function fontFaces(): string {
  const face = (file: string, weight: number, family: string) =>
    `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: normal; src: url(data:font/ttf;base64,${readFileSync(join(ROOT, "src/lib/server/reports/fonts", file)).toString("base64")}) format('truetype'); }`;
  return [face("Inter-Regular.ttf", 400, "Inter"), face("Inter-Medium.ttf", 500, "Inter"), face("Inter-Bold.ttf", 700, "Inter"),
    face("JetBrainsMono-Regular.ttf", 400, "JetBrains Mono"), face("JetBrainsMono-Bold.ttf", 700, "JetBrains Mono")].join(NL);
}

type Kit = { browser: Browser; bundle: string; css: string; fonts: string };
let KIT: Kit | null = null;
async function kit(): Promise<Kit> {
  if (KIT) return KIT;
  const { chromium } = req("playwright") as typeof import("playwright");
  const [bundle, css] = await Promise.all([bundleKit(), compileCss(SOURCES.css)]);
  const browser = await chromium.launch(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
  KIT = { browser, bundle, css, fonts: fontFaces() };
  return KIT;
}

/** A page holding the stand-in under `css` (the compiled stylesheet, or a planted copy of it). */
async function openPage(css: string): Promise<Page> {
  const k = await kit();
  const page = await k.browser.newPage({ viewport: { width: 320, height: VIEW[320] }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e.message)));
  // Served from an origin of its own, fulfilled here (no network): a page with no origin has no storage, and the kit reads it.
  const html = standInHtml(css, k.fonts);
  await page.route("http://visual-v1.test/**", (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
  await page.goto("http://visual-v1.test/", { waitUntil: "load" });
  // tsx keeps function names with a `__name` helper; a probe that declares a function carries a call to it into the page.
  await page.evaluate("globalThis.__name = (f) => f");
  await page.addScriptTag({ content: k.bundle });
  await page.evaluate(async () => { await document.fonts.ready; });
  if (!(await page.evaluate(() => typeof (window as unknown as { v1?: unknown }).v1 === "object"))) {
    throw new Error(`the kit bundle did not load in the page: ${errors.join(" | ").slice(0, 400) || "no error reported"}`);
  }
  return page;
}

/** Opens the sheet on `frame` in `locale` at `width` (the audit's height for it), as a player's tap does: a fresh mount. */
async function openSheet(page: Page, frame: FrameName, locale: Locale, width: Width) {
  await page.setViewportSize({ width, height: VIEW[width] });
  const f = FRAMES[frame];
  await page.evaluate((p) => (window as unknown as { v1: { sheet: (q: unknown) => void } }).v1.sheet(p), {
    seed: seed(), side: "YES", title: TITLE[locale], frame: JSON.parse(j(f)), stakeText: f.stake === null ? "" : String(f.stake),
    railNames: RAILS, locale, nowMs: NOW,
  });
  // Two frames: the ResizeObserver's first report lands after a layout and before a paint.
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}

/* ══ §1 · F50 — THE MIDDLE FADES THE EDGE THAT HIDES SOMETHING ═════════════════════════════════════════════════════════ */

/** The hook's own source, transpiled and run against a stand-in box, observers and React: what it reads, when, and what
 *  it writes. `ro` false runs it in an engine with no ResizeObserver. */
function hookLife(edgesSource: string, ro = true) {
  const out = ts.transpileModule(edgesSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const cleanups: Array<() => void> = [];
  const React = { useLayoutEffect: (fn: () => void | (() => void)) => { const c = fn(); if (typeof c === "function") cleanups.push(c); } };
  let reads = 0;
  const geometry = { top: 0, height: 900, client: 500 };
  const writes: string[] = [];
  const listeners = new Map<string, () => void>();
  const attrs = new Map<string, string>();
  const children: object[] = [{ id: "a" }, { id: "b" }];
  const box = {
    get scrollTop() { reads++; return geometry.top; }, get scrollHeight() { reads++; return geometry.height; }, get clientHeight() { reads++; return geometry.client; },
    get children() { return children; },
    getAttribute: (n: string) => attrs.get(n) ?? null, setAttribute: (n: string, v: string) => { attrs.set(n, v); writes.push(v); },
    addEventListener: (n: string, f: () => void, o?: { passive?: boolean }) => { if (o?.passive) listeners.set(n, f); else listeners.set(`${n}:active`, f); },
    removeEventListener: (n: string) => { listeners.delete(n); listeners.delete(`${n}:active`); },
  };
  const observers: Array<{ cb: () => void; targets: object[]; disconnects: number }> = [];
  class FakeRO { o: { cb: () => void; targets: object[]; disconnects: number }; constructor(cb: () => void) { this.o = { cb, targets: [], disconnects: 0 }; observers.push(this.o); }
    observe(t: object) { this.o.targets.push(t); } disconnect() { this.o.disconnects++; this.o.targets = []; } }
  const mutations: Array<{ cb: () => void; on: object | null; opts: unknown; disconnected: boolean }> = [];
  class FakeMO { m: { cb: () => void; on: object | null; opts: unknown; disconnected: boolean }; constructor(cb: () => void) { this.m = { cb, on: null, opts: null, disconnected: false }; mutations.push(this.m); }
    observe(t: object, opts: unknown) { this.m.on = t; this.m.opts = opts; } disconnect() { this.m.disconnected = true; } }
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", "ResizeObserver", "MutationObserver", out)(
    (id: string) => { if (id === "react") return React; throw new Error(`the hook asked for ${id}`); }, mod, mod.exports, ro ? FakeRO : undefined, FakeMO);
  const hook = mod.exports.useBlockScrollEdges as (r: { current: unknown }) => void;
  const edges = mod.exports.scrollEdges as (o: number, s: number, c: number) => string;
  hook({ current: box });
  const readsInEffect = reads;
  const writesInEffect = writes.length;
  const roObs = observers[0];
  const observedAtMount = roObs ? roObs.targets.length : 0;
  roObs?.cb();
  const firstMark = writes.at(-1) ?? null;
  geometry.top = 200; listeners.get("scroll")?.();
  const middle = writes.at(-1) ?? null;
  geometry.top = 400; listeners.get("scroll")?.();
  const atEnd = writes.at(-1) ?? null;
  const before = writes.length; listeners.get("scroll")?.();
  const quietRepeat = writes.length === before;
  children.push({ id: "c" });
  mutations[0]?.cb();
  const childAdded = !!roObs && roObs.targets.length === 4 && roObs.targets.includes(children[2]) && roObs.targets.includes(box);
  for (const c of cleanups) c();
  const cleaned = listeners.size === 0 && (!roObs || roObs.disconnects >= 2 && roObs.targets.length === 0) && (mutations.length === 0 || mutations.every((m) => m.disconnected));
  return { readsInEffect, writesInEffect, observedAtMount, firstMark, middle, atEnd, quietRepeat, childAdded, cleaned, edges,
    passive: true, mo: mutations[0] ? { on: mutations[0].on === box, opts: mutations[0].opts } : null };
}

type Ok = (label: string, cond: boolean, extra?: string) => void;

function staticF50(src: Sources, ok: Ok) {
  const sheet = decomment(src.sheet), howto = decomment(src.howto), strip = decomment(src.strip), edgesCode = decomment(src.edges);
  ok("1.1 · the bet sheet's middle is marked by the kit's hook: one ref on the .kp-bsheet__scroll element, handed to useBlockScrollEdges, imported from the kit",
    count(sheet, "const scrollRef = useRef<HTMLDivElement>(null);") === 1 && count(sheet, "useBlockScrollEdges(scrollRef);") === 1
      && sheet.includes(`<div ref={scrollRef} className="kp-bsheet__scroll" data-testid="journey-sheet-scroll">`)
      && /import \{ useBlockScrollEdges \} from "@\/components\/ui\/scroll-edges";/.test(sheet));
  // ONE RULE: the four states are computed in scroll-edges.ts and nowhere else in src/ — the How-to's steps call the same hook
  // and the strip reads the same function.
  const handRolled = /before && after \? "both" : before \? "start" : after \? "end" : "none"/;
  ok("1.2 · one rule for the four states: scroll-edges.ts computes them; the How to Play sheet's steps call its hook and the strip calls scrollEdges — no second copy",
    handRolled.test(edgesCode) && !handRolled.test(howto) && !handRolled.test(strip) && !handRolled.test(sheet)
      && count(howto, "useBlockScrollEdges(ref);") === 1 && strip.includes("const edges = scrollEdges(rail.scrollLeft, rail.scrollWidth, rail.clientWidth);"));
  const decls = cascadeOf(src.css);
  const same = (["end", "start", "both"] as const).every((e) => {
    const b = `.kp-bsheet__scroll[data-edges="${e}"]`, h = `.kp-howto__scroll[data-edges="${e}"]`;
    const m = cv(decls, b, "mask-image");
    return m !== null && m.startsWith("linear-gradient(to bottom,") && m === cv(decls, h, "mask-image") && cv(decls, b, "-webkit-mask-image") === m
      && decls.some((d) => d.prop === "mask-image" && d.sels.includes(b) && d.sels.includes(h));
  });
  ok("1.3 · the middle's fade is the How-to's: each of its three edge rules shares one declaration with the steps' (one definition), a ramp on the block axis in both spellings",
    same);
  ok("1.4 · the middle's scroll padding is the fade's depth (var(--sp-6), both rules), and the keyboard lift reveals the stake inside it",
    cv(decls, ".kp-bsheet__scroll", "scroll-padding-block") === "var(--sp-6)" && /#000 calc\(100% - var\(--sp-6\)\), transparent/.test(cv(decls, `.kp-bsheet__scroll[data-edges="end"]`, "mask-image") ?? "")
      && sheet.includes("const top = port.top + parseFloat(inset.scrollPaddingTop), bottom = port.bottom - parseFloat(inset.scrollPaddingBottom);"));
}

function lifeF50(src: Sources, ok: Ok) {
  let life: ReturnType<typeof hookLife> | null = null, bare: ReturnType<typeof hookLife> | null = null, why = "";
  try { life = hookLife(src.edges); bare = hookLife(src.edges, false); } catch (e) { why = String((e as Error).message); }
  ok("1.5 · A21: the hook reads no layout inside the commit — its first mark is the ResizeObserver's first report (after layout, before paint), which marks the box and each child",
    !!life && life.readsInEffect === 0 && life.writesInEffect === 0 && life.observedAtMount === 3 && life.firstMark === "end", why || j(life && { reads: life.readsInEffect, writes: life.writesInEffect, observed: life.observedAtMount, first: life.firstMark }));
  ok("1.6 · it marks on every scroll — both edges mid-way, the start at the end — through a passive listener, and writes nothing when nothing changed",
    !!life && life.middle === "both" && life.atEnd === "start" && life.quietRepeat, why || j(life && { middle: life.middle, atEnd: life.atEnd, quiet: life.quietRepeat }));
  ok("1.7 · a child that comes after the mount is observed too (a MutationObserver on the box's child list re-observes them all), and the cleanup leaves no listener and no observer",
    !!life && life.childAdded && life.cleaned && j(life.mo) === j({ on: true, opts: { childList: true } }), why || j(life && { added: life.childAdded, cleaned: life.cleaned, mo: life.mo }));
  ok("1.8 · an engine with no ResizeObserver still marks once, at mount",
    !!bare && bare.writesInEffect === 1 && bare.firstMark === "end", why || j(bare && { writes: bare.writesInEffect }));
  const e = life?.edges;
  const table: Array<[number, number, number, string]> = [[0, 900, 500, "end"], [200, 900, 500, "both"], [400, 900, 500, "start"], [0, 500, 500, "none"],
    [0, 501, 500, "none"], [0.5, 902, 500, "end"], [401.5, 902, 500, "start"], [1.5, 902, 500, "both"], [400.5, 902, 500, "both"]];
  const wrong = e ? table.filter(([o, s, c, want]) => e(o, s, c) !== want) : table;
  ok("1.9 · the four states with 1px of slack each way: a box 1px over its client fits; half a pixel from an end is that end", wrong.length === 0, j(wrong));
}

type Probe = { edges: string | null; mask: string; hidden: number; top: number; cutTop: string[]; cutBottom: string[]; pad: string };
/** What the page shows of the middle: its mark, its computed mask, how much it hides, and every money figure an edge cuts. */
async function probeMiddle(page: Page): Promise<Probe> {
  return page.evaluate(() => {
    const box = document.querySelector<HTMLElement>(".kp-bsheet__scroll")!;
    const cs = getComputedStyle(box);
    const r = box.getBoundingClientRect();
    const cutTop: string[] = [], cutBottom: string[] = [];
    for (const a of Array.from(box.querySelectorAll<HTMLElement>(".amount, input"))) {
      const q = a.getBoundingClientRect();
      if (q.height === 0) continue;
      const name = (a.textContent || (a as HTMLInputElement).value || a.tagName).trim().slice(0, 24);
      if (q.top < r.top - 0.5 && q.bottom > r.top + 0.5) cutTop.push(name);
      if (q.bottom > r.bottom + 0.5 && q.top < r.bottom - 0.5) cutBottom.push(name);
    }
    const mask = cs.maskImage && cs.maskImage !== "none" ? cs.maskImage : (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage ?? "none";
    return { edges: box.getAttribute("data-edges"), mask, hidden: box.scrollHeight - box.clientHeight, top: box.scrollTop, cutTop, cutBottom, pad: cs.scrollPaddingTop };
  });
}

type Box = { left: number; right: number; top: number; bottom: number };
/** The sheet's edges as drawn: the middle's content box and gutter, the footer's box, its clip and each of its blocks. */
type Geo = {
  region: { contentLeft: number; contentRight: number; gutter: number };
  footer: (Box & { clipRight: number; gutter: number }) | null;
  kids: Array<Box & { cls: string }>;
  commit: Box | null;
};
async function probeGeo(page: Page): Promise<Geo> {
  return page.evaluate(() => {
    const box = (el: Element) => { const q = el.getBoundingClientRect(); return { left: q.left, right: q.right, top: q.top, bottom: q.bottom }; };
    const region = document.querySelector<HTMLElement>(".kp-bsheet__scroll")!;
    const r = region.getBoundingClientRect(), rs = getComputedStyle(region);
    const contentLeft = r.left + region.clientLeft + parseFloat(rs.paddingLeft);
    const contentRight = r.left + region.clientLeft + region.clientWidth - parseFloat(rs.paddingRight);
    const foot = document.querySelector<HTMLElement>(".kp-bsheet__footer");
    let footer = null;
    if (foot) {
      const gutter = foot.offsetWidth - foot.clientWidth - foot.clientLeft * 2;
      footer = { ...box(foot), gutter, clipRight: foot.getBoundingClientRect().left + foot.clientLeft + foot.clientWidth };
    }
    const kids = foot ? Array.from(foot.children).filter((k) => k.getBoundingClientRect().height > 0).map((k) => ({ ...box(k), cls: (k.getAttribute("class") || k.tagName).slice(0, 48) })) : [];
    const c = document.querySelector('[data-testid="journey-sheet-place"]');
    return { region: { contentLeft, contentRight, gutter: region.offsetWidth - region.clientWidth - region.clientLeft * 2 }, footer, kids, commit: c ? box(c) : null };
  });
}

const STEPS = ["rest", "middle", "end"] as const;
type Extra = {
  notice: { size: string; radius: string; padTop: string; padLeft: string; gap: string } | null;
  title: { size: string; weight: string };
  xl: string | null;
  rails: { items: number; rows: number; dotsHidden: boolean; clip: string } | null;
  note: { text: string; held: boolean; dashLeft: number; noteLeft: number; dashTop: number; minTop: number } | null;
};
async function probeExtra(page: Page): Promise<Extra> {
  return page.evaluate(() => {
    const notice = document.querySelector<HTMLElement>(".kp-bsheet__scroll [role=note]");
    const title = document.querySelector<HTMLElement>(".kp-bsheet__title")!;
    const xl = document.querySelector<HTMLElement>(".kp-bsheet__commit, .kp-bsheet__deposit");
    const seq = document.querySelector<HTMLElement>(".kp-bsheet__rails .kp-seq");
    const note = document.querySelector<HTMLElement>(".kp-bsheet__scroll > .kp-bsheet__note");
    let noteProbe = null;
    if (note) {
      const walker = document.createTreeWalker(note, NodeFilter.SHOW_TEXT);
      let part: Text | null = null;
      while (walker.nextNode()) if (walker.currentNode.textContent?.includes("—")) { part = walker.currentNode as Text; break; }
      const min = note.querySelector<HTMLElement>(".amount");
      if (part && min) {
        const i = part.textContent!.indexOf("—");
        const range = document.createRange(); range.setStart(part, i); range.setEnd(part, i + 1);
        const q = range.getBoundingClientRect(), r = note.getBoundingClientRect(), m = min.getBoundingClientRect();
        noteProbe = { text: note.textContent ?? "", held: !!part.parentElement?.classList.contains("whitespace-nowrap") && !!part.parentElement?.contains(min),
          dashLeft: q.left, noteLeft: r.left, dashTop: q.top, minTop: m.top };
      }
    }
    const ns = notice && getComputedStyle(notice), body = notice?.lastElementChild && getComputedStyle(notice.lastElementChild);
    const ts = getComputedStyle(title);
    const items = seq ? Array.from(seq.querySelectorAll<HTMLElement>(".kp-seq__item")) : [];
    return {
      notice: ns && body ? { size: body.fontSize, radius: ns.borderRadius, padTop: ns.paddingTop, padLeft: ns.paddingLeft, gap: ns.columnGap } : null,
      title: { size: ts.fontSize, weight: ts.fontWeight }, xl: xl ? getComputedStyle(xl).fontSize : null,
      rails: seq ? { items: items.length, rows: new Set(items.map((it) => Math.round(it.getBoundingClientRect().top))).size,
        dotsHidden: Array.from(seq.querySelectorAll(".kp-seq__dot")).every((d) => d.getAttribute("aria-hidden") === "true"),
        clip: getComputedStyle(seq).clipPath } : null,
      note: noteProbe,
    };
  });
}
type View = { width: Width; locale: Locale; frame: FrameName; step: (typeof STEPS)[number]; mid: Probe; geo: Geo | null; extra: Extra | null };
/** Every view the sections judge, drawn once per stylesheet: each width, language and frame at rest, and — where the
 *  middle hides something — scrolled mid-way and to its end. */
async function sweep(css: string): Promise<View[]> {
  const page = await openPage(css);
  try {
    const views: View[] = [];
    for (const width of [320, 360, 390, 768, 1280, 1920] as const) for (const locale of LOCALES) for (const frame of ["edit", "held", "low"] as const) {
      await openSheet(page, frame, locale, width);
      views.push({ width, locale, frame, step: "rest", mid: await probeMiddle(page), geo: await probeGeo(page), extra: await probeExtra(page) });
      for (const step of ["middle", "end"] as const) {
        const moved = await page.evaluate((s) => {
          const box = document.querySelector<HTMLElement>(".kp-bsheet__scroll")!;
          const max = box.scrollHeight - box.clientHeight;
          if (max <= 1) return false;
          box.scrollTop = s === "middle" ? Math.round(max / 2) : max;
          return true;
        }, step);
        if (!moved) continue;
        await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
        views.push({ width, locale, frame, step, mid: await probeMiddle(page), geo: null, extra: null });
      }
    }
    return views;
  } finally {
    await page.close();
  }
}

function evalF50(views: View[], ok: Ok) {
  const rows: string[] = [];
  let hiding = 0, fitting = 0, cuts = 0, padOk = true;
  for (const v of views) {
    const p = v.mid;
    if (p.pad !== "24px") padOk = false;
    const expect = p.hidden <= 1 ? "none" : p.top <= 1 ? "end" : p.top >= p.hidden - 1 ? "start" : "both";
    const masked = p.mask !== "none" && p.mask.includes("gradient");
    if (expect === "none") fitting++; else hiding++;
    cuts += p.cutTop.length + p.cutBottom.length;
    const cutOk = (p.cutTop.length === 0 || (masked && (p.edges === "start" || p.edges === "both")))
      && (p.cutBottom.length === 0 || (masked && (p.edges === "end" || p.edges === "both")));
    if (p.edges !== expect || masked !== (expect !== "none") || !cutOk) {
      rows.push(`${v.width} ${v.locale} ${v.frame} ${v.step}: marked ${p.edges}, want ${expect}; mask ${masked ? "drawn" : "none"}; cut top ${j(p.cutTop)} bottom ${j(p.cutBottom)}`);
    }
  }
  const scrolled = views.filter((v) => v.step !== "rest").length;
  ok(`1.10 · in the browser, at 320/360/390/768/1280/1920 in sw, en and zh, on the edit, held and low frames at rest, mid-way and at the end (${views.length} views: ${hiding} hide something, ${fitting} fit): the middle is marked with exactly the edges that hide something, a fade is drawn on those and on nothing else, and every money figure or field an edge cuts (${cuts}) sits under a fade at that edge`,
    rows.length === 0 && views.length >= 54 && hiding >= 6 && fitting >= 6 && scrolled >= 6, rows.slice(0, 5).join(" | "));
  ok("1.11 · the scroll padding the browser reports is the fade's depth, 24px, in every view", padOk);
}

/* ══ §2 · F16 — THE FOOTER ENDS WHERE THE MIDDLE'S BLOCKS END ══════════════════════════════════════════════════════════ */

/** A length the sheet's footer writes, in px: `var(--sp-N)` or `calc(-1 * var(--sp-N))`, read from :root's own tokens. */
function spacePx(decls: Decl[], value: string): number[] | null {
  const token = (name: string) => { const v = cv(decls, ":root", name); return v && /^\d+(\.\d+)?px$/.test(v) ? Number.parseFloat(v) : NaN; };
  const one = (part: string): number => {
    const neg = /^calc\(-1 \* var\((--sp-\d+)\)\)$/.exec(part), pos = /^var\((--sp-\d+)\)$/.exec(part);
    return neg ? -token(neg[1]) : pos ? token(pos[1]) : part === "0" ? 0 : NaN;
  };
  const parts = value.match(/calc\([^)]*\)\)|var\([^)]*\)|0/g);
  if (!parts) return null;
  const v = parts.map(one);
  if (v.some(Number.isNaN)) return null;
  // top right bottom left, as the shorthand expands them
  const [t, r = t, b = t, l = r] = v;
  return [t, r, b, l];
}

function staticF16(src: Sources, ok: Ok) {
  const decls = cascadeOf(src.css);
  const F = ".kp-bsheet__footer";
  const margin = spacePx(decls, cv(decls, F, "margin") ?? ""), padding = spacePx(decls, cv(decls, F, "padding") ?? "");
  ok("2.1 · the footer reserves the middle's own gutter, the same way: a box that clips (overflow hidden) with the middle's scrollbar-gutter keyword — so an engine reserves the two alike, 8px under the kit's scrollbar and nothing under an overlay one",
    cv(decls, F, "overflow") === "hidden" && cv(decls, F, "scrollbar-gutter") === "stable" && cv(decls, ".kp-bsheet__scroll", "scrollbar-gutter") === "stable");
  ok("2.2 · its clip moves nothing: each side's margin is minus its padding (a box grown into the gap above and the panel's padding, its content where it was), and the room is the commit's focus ring and raised glow — 12px above, 20px beside and below",
    !!margin && !!padding && margin.every((m, i) => m === -padding[i]) && j(padding) === j([12, 20, 20, 20]), j({ margin, padding }));
}

function evalF16(views: View[], ok: Ok) {
  const rest = views.filter((v) => v.step === "rest" && v.geo?.footer);
  const gutters = [...new Set(rest.map((v) => v.geo!.region.gutter))];
  ok("2.3 · PREMISE · the middle reserves its scrollbar's gutter in every view (the kit's 8px scrollbar, which Blink always draws) — without it this section would measure nothing",
    rest.length >= 54 && j(gutters) === j([8]), j({ views: rest.length, gutters }));
  const rows: string[] = [];
  let kids = 0;
  for (const v of rest) {
    const g = v.geo!;
    for (const k of g.kids) {
      kids++;
      const dl = k.left - g.region.contentLeft, dr = k.right - g.region.contentRight;
      if (Math.abs(dl) > 0.5 || Math.abs(dr) > 0.5) rows.push(`${v.width} ${v.locale} ${v.frame} ${k.cls}: left ${dl.toFixed(2)} right ${dr.toFixed(2)}`);
    }
  }
  ok(`2.4 · every block in the footer — the commit, the lines above it, a terminal's links — starts and ends on the x where the middle's blocks do, at 320/360/390/768/1280/1920 in sw, en and zh (${kids} blocks in ${rest.length} views)`,
    rows.length === 0 && kids >= rest.length, rows.slice(0, 4).join(" | "));
  const room: string[] = [];
  for (const v of rest) {
    const g = v.geo!, f = g.footer!, c = g.commit;
    if (!c) continue;
    const r = { above: c.top - f.top, before: c.left - f.left, after: f.clipRight - c.right, below: f.bottom - c.bottom };
    if (r.above < 11 || r.before < 16 || r.after < 16 || r.below < 16) room.push(`${v.width} ${v.locale} ${v.frame}: ${j(r)}`);
  }
  ok("2.5 · the footer's clip never cuts the commit's focus ring (4px out, and its 4px halo) or its raised glow (11px above, 16px beside and below), in every view",
    room.length === 0, room.slice(0, 3).join(" | "));
}

/* ══ §3 · THE REST OF V1: KIT TYPE/SHAPE, LOW-BALANCE WRAP AND TITLES ═══════════════════════════════════════════════ */
function staticV1(src: Sources, ok: Ok) {
  const callout = decomment(src.callout), sheet = decomment(src.sheet), parts = decomment(src.parts);
  const decls = cascadeOf(src.css);
  ok("3.1 · F15/F15b: the sm Callout reads at 13px with the semantic control radius, 16px vertical/gap and 20px horizontal padding",
    callout.includes('sm: { box: "gap-3 rounded-control px-4 py-3", icon: 14, title: "font-bold text-text", body: "text-body-sm leading-snug text-text-secondary"'));
  ok("3.2 · F17: the xl button uses the 17px type rung, not the private 16.5px size",
    cv(decls, ".btn-xl", "font-size") === "var(--type-h4)");
  ok("3.3 · F35: deposit rails are one DotSeq of the four real provider names; no hand-rolled dot can end or open a line",
    sheet.includes('import { DotSeq } from "@/components/ui/dot-seq";')
      && sheet.includes('<span className="kp-bsheet__rails"><DotSeq text={railNames.join(" · ")} /></span>')
      && !sheet.includes('railNames.map((name, index)'));
  ok("3.4 · F35: only the below-minimum note keeps its em dash with the amount before it through a nowrap wrapper, preserving the dictionary's characters",
    parts.includes('line.key === "journey.lowMinNote" && template.includes("{min} — ")')
      && parts.includes('values.min = <span className="whitespace-nowrap">{values.min} —</span>;')
      && parts.includes('template.replace("{min} — ", "{min} ")'));
  ok("3.5 · F37: the bet sheet and guest ticket sheet share the 20px display-title size and 700 weight; How-to remains the large 24px variant",
    cv(decls, ".kp-bsheet__title", "font-size") === cv(decls, ".kp-jsheet__title", "font-size")
      && cv(decls, ".kp-bsheet__title", "font-weight") === cv(decls, ".kp-jsheet__title", "font-weight")
      && cv(decls, ".kp-bsheet__title", "font-weight") === "700"
      && cv(decls, ".kp-jsheet__title--lg", "font-size") === "var(--type-h2)");
}
function evalV1(views: View[], ok: Ok) {
  const rest = views.filter((v) => v.step === "rest" && v.extra);
  const notices = rest.flatMap((v) => v.extra!.notice ? [{ v, n: v.extra!.notice! }] : []);
  const noticeBad = notices.filter(({ n }) => n.size !== "13px" || n.radius !== "12px" || n.padTop !== "16px" || n.padLeft !== "20px" || n.gap !== "16px");
  ok(`3.6 · in Chromium, sm Callouts read at 13px with a 12px radius, 16px vertical/gap and 20px horizontal padding across ${notices.length} sheet frames`,
    notices.length >= 18 && noticeBad.length === 0, j(noticeBad.slice(0, 3)));
  const typeBad = rest.filter((v) => v.extra!.title.size !== "20px" || v.extra!.title.weight !== "700" || v.extra!.xl !== "17px");
  ok(`3.7 · in Chromium, every ${rest.length} sheet frame has a 20px/700 title and its large action reads at 17px`,
    rest.length >= 54 && typeBad.length === 0, j(typeBad.slice(0, 3).map((v) => ({ width: v.width, locale: v.locale, frame: v.frame, title: v.extra!.title, xl: v.extra!.xl }))));
  const low = rest.filter((v) => v.frame === "low");
  const railsBad = low.filter((v) => !v.extra!.rails || v.extra!.rails.items !== 4 || !v.extra!.rails.dotsHidden || !v.extra!.rails.clip.startsWith("inset("));
  const wrap = low.find((v) => v.width === 320 && v.locale === "sw")?.extra?.rails?.rows ?? 0;
  ok("3.8 · the low-balance rails render as four whole parts with decorative dots, and the 320 sw row wraps without a visible line-opening dot",
    low.length === 18 && railsBad.length === 0 && wrap >= 2, j({ wrap, bad: railsBad.slice(0, 2).map((v) => v.extra!.rails) }));
  const notes = low.filter((v) => v.locale !== "zh");
  const noteBad = notes.filter((v) => !v.extra!.note || !v.extra!.note.held || !v.extra!.note.text.includes(" — ") || v.extra!.note.text.includes("\u00a0")
    || v.extra!.note.dashLeft <= v.extra!.note.noteLeft + 4 || Math.abs(v.extra!.note.dashTop - v.extra!.note.minTop) > 2);
  ok("3.9 · the minimum note's em dash stays with the preceding amount in every en/sw low-balance frame",
    notes.length === 12 && noteBad.length === 0, j(noteBad.slice(0, 3).map((v) => ({ width: v.width, locale: v.locale, note: v.extra!.note }))));
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
type World = { src: Sources; css: string | null };
async function run(world: World, log: (l: string) => void, measure = true): Promise<string[]> {
  const failed: string[] = [];
  const ok: Ok = (label, cond, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  // The stand-in is the Modal's own shape, or nothing is measured (a premise, checked first).
  const modal = decomment(world.src.modal), sheet = decomment(world.src.sheet);
  const pieces = Object.values(MODAL_PIECES).every((p) => modal.includes(p)) && modal.includes(`data-dock-wrap={tall ? "lg" : sheet ? "sm" : undefined}`)
    && modal.includes(`data-dock={tall ? "lg" : sheet ? "sm" : undefined}`) && sheet.includes(`sheet sheetUntil="lg" maxWidth={440}`) && sheet.includes(`panelClassName="${SHEET_PANEL}"`)
    && sheet.includes(`className="kp-bsheet__shell"`);
  ok("0.1 · PREMISE · the measured stand-in is the kit Modal's tall sheet: its wrapper and panel classes, its dock marks, the sheet's 440px and its panel and shell classes, all read from the sources",
    pieces);
  const views = measure ? await sweep(world.css ?? (await kit()).css) : null;
  log(NL + "── §1 · F50 · the middle fades the edge that hides something ─────────────────────────────────────────────────────");
  staticF50(world.src, ok);
  lifeF50(world.src, ok);
  if (views) evalF50(views, ok);
  log(NL + "── §2 · F16 · the footer shares the middle's content edge ────────────────────────────────────────────────────");
  staticF16(world.src, ok);
  if (views) evalF16(views, ok);
  log(NL + "── §3 · V1 kit rhythm and low-balance text ────────────────────────────────────────────────────────────────");
  staticV1(world.src, ok);
  if (views) evalV1(views, ok);
  return failed;
}

/* ══ THE PLANTS — each one defect, in memory; each must fail the check that names it ══════════════════════════════════ */
type Plant = { name: string; expect: RegExp; world: () => Promise<World>; measure?: boolean };
const REAL: World = { src: SOURCES, css: null };
/** A source plant, built when it runs (a broken anchor fails that plant, never the suite's load). */
const withSrc = (make: () => Partial<Sources>) => async (): Promise<World> => ({ src: { ...SOURCES, ...make() }, css: null });
/** A stylesheet plant: the swap is proven to land exactly once in globals.css and is made on the compiled sheet. */
const withCss = (from: string, to: string) => async (): Promise<World> => {
  swap(SOURCES.css, from, to);
  const k = await kit();
  return { src: { ...SOURCES, css: swap(SOURCES.css, from, to) }, css: swap(k.css, from, to) };
};
const PLANTS: Plant[] = [
  { name: "F50 · the bet sheet's selectors dropped from the fade: the middle is cut hard again", expect: /^1\.10 /, measure: true,
    world: withCss(`.kp-howto__scroll[data-edges="end"], .kp-bsheet__scroll[data-edges="end"] {`, `.kp-howto__scroll[data-edges="end"] {`) },
  { name: "F50 · a fade on the middle whether it hides anything or not", expect: /^1\.10 /, measure: true,
    world: withCss(".kp-bsheet__scroll > * { flex-shrink: 0; }", ".kp-bsheet__scroll > * { flex-shrink: 0; } .kp-bsheet__scroll { -webkit-mask-image: linear-gradient(to bottom, #000 80%, transparent); mask-image: linear-gradient(to bottom, #000 80%, transparent); }") },
  { name: "F50 · the scroll padding dropped (a revealed field stops inside a fade)", expect: /^1\.11 /, measure: true,
    world: withCss("padding-block: var(--sp-1); scroll-padding-block: var(--sp-6); scrollbar-gutter: stable; }", "padding-block: var(--sp-1); scrollbar-gutter: stable; }") },
  { name: "F50 · the bet sheet's body no longer marks its middle", expect: /^1\.1 /,
    world: withSrc(() => ({ sheet: swap(SOURCES.sheet, "  useBlockScrollEdges(scrollRef);\n", "") })) },
  { name: "F50 · the strip computes the four states with its own copy again", expect: /^1\.2 /,
    world: withSrc(() => ({ strip: swap(SOURCES.strip, "const edges = scrollEdges(rail.scrollLeft, rail.scrollWidth, rail.clientWidth);",
      `const max = rail.scrollWidth - rail.clientWidth; const before = max > 1 && rail.scrollLeft > 1; const after = max > 1 && rail.scrollLeft < max - 1; const edges = before && after ? "both" : before ? "start" : after ? "end" : "none";`) })) },
  { name: "F50 · a fade ramp of the middle's own, beside the How-to's", expect: /^1\.3 /,
    world: withSrc(() => ({ css: swap(SOURCES.css, `.kp-howto__scroll[data-edges="start"], .kp-bsheet__scroll[data-edges="start"] {`, `.kp-bsheet__scroll[data-edges="start"] { mask-image: linear-gradient(to bottom, transparent, #000 32px); } .kp-howto__scroll[data-edges="start"] {`) })) },
  { name: "F50 · the keyboard lift reveals the stake to the padding edge again, inside the fade", expect: /^1\.4 /,
    world: withSrc(() => ({ sheet: swap(SOURCES.sheet, "const top = port.top + parseFloat(inset.scrollPaddingTop), bottom = port.bottom - parseFloat(inset.scrollPaddingBottom);",
      "const top = port.top + parseFloat(inset.paddingTop), bottom = port.bottom - parseFloat(inset.paddingBottom);") })) },
  { name: "F50 · A21: the first mark read in the layout effect (a forced layout inside the opening tap)", expect: /^1\.5 /,
    world: withSrc(() => ({ edges: swap(SOURCES.edges, `    box.addEventListener("scroll", markScrollEdges, { passive: true });\n`, `    box.addEventListener("scroll", markScrollEdges, { passive: true });\n    markScrollEdges();\n`) })) },
  { name: "F50 · a mark written on every scroll, changed or not", expect: /^1\.6 /,
    world: withSrc(() => ({ edges: swap(SOURCES.edges, `  if (box.getAttribute("data-edges") !== edges) box.setAttribute("data-edges", edges);`, `  box.setAttribute("data-edges", edges);`) })) },
  { name: "F50 · a child added after the mount never observed (no MutationObserver)", expect: /^1\.7 /,
    world: withSrc(() => ({ edges: swap(SOURCES.edges, `    kids?.observe(box, { childList: true });\n`, "") })) },
  { name: "F50 · no slack: a box half a pixel from its end still fades it", expect: /^1\.9 /,
    world: withSrc(() => ({ edges: swap(swap(SOURCES.edges, "const before = max > 1 && offset > 1;", "const before = max > 0 && offset > 0;"), "const after = max > 1 && offset < max - 1;", "const after = max > 0 && offset < max;") })) },
  { name: "PREMISE · the Modal's tall sheet changes its panel classes under the stand-in", expect: /^0\.1 /,
    world: withSrc(() => ({ modal: swap(SOURCES.modal, `mat-modal relative w-full p-5 lg:p-6 outline-none`, `mat-modal relative w-full p-6 lg:p-8 outline-none`) })) },
  { name: "F16 · the footer no longer reserves the middle's scrollbar gutter", expect: /^2\.1 /,
    world: withSrc(() => ({ css: swap(SOURCES.css, ".kp-bsheet__footer { display: flex; flex: none; flex-direction: column; gap: var(--sp-2); overflow: hidden; scrollbar-gutter: stable;",
      ".kp-bsheet__footer { display: flex; flex: none; flex-direction: column; gap: var(--sp-2); overflow: hidden;") })) },
  { name: "F15 · the sm Callout falls back to 11px caption copy", expect: /^3\.1 /,
    world: withSrc(() => ({ callout: swap(SOURCES.callout, 'body: "text-body-sm leading-snug text-text-secondary"', 'body: "text-caption leading-snug text-text-secondary"') })) },
  { name: "F15b · the sm Callout falls back to the legacy radius and private padding", expect: /^3\.1 /,
    world: withSrc(() => ({ callout: swap(SOURCES.callout, 'box: "gap-3 rounded-control px-4 py-3"', 'box: "gap-2.5 rounded-md px-3 py-2.5"') })) },
  { name: "F17 · the large button gets its private 16.5px type size again", expect: /^3\.2 /,
    world: withSrc(() => ({ css: swap(SOURCES.css, "font-size: var(--type-h4); border-radius: var(--r-lg);", "font-size: 16.5px; border-radius: var(--r-lg);") })) },
  { name: "F35 · the deposit rail loses DotSeq and hand-rolls its separators", expect: /^3\.3 /,
    world: withSrc(() => ({ sheet: swap(SOURCES.sheet, '<span className="kp-bsheet__rails"><DotSeq text={railNames.join(" · ")} /></span>',
      '<span className="kp-bsheet__rails">{railNames.map((name, index) => <span key={name}>{index > 0 && <span aria-hidden> · </span>}{name}</span>)}</span>') })) },
  { name: "F35 · the minimum note's dash can open a wrapped line again", expect: /^3\.4 /,
    world: withSrc(() => ({ parts: swap(SOURCES.parts, 'values.min = <span className="whitespace-nowrap">{values.min} —</span>;', 'values.min = values.min;') })) },
  { name: "F37 · the bet sheet title drops below its sibling's weight", expect: /^3\.5 /,
    world: withSrc(() => ({ css: swap(SOURCES.css, "font-size: var(--type-h3); font-weight: 700; line-height: 1.3; text-wrap: balance;", "font-size: var(--type-h3); font-weight: 600; line-height: 1.3; text-wrap: balance;") })) },
];

async function capture(): Promise<void> {
  const dir = join(ROOT, ".qa-shots", "visual-v1-candidate-1015");
  mkdirSync(dir, { recursive: true });
  const page = await openPage((await kit()).css);
  try {
    for (const width of [360, 1280] as const) for (const locale of ["sw", "en"] as const) for (const frame of ["edit", "low"] as const) {
      await openSheet(page, frame, locale, width);
      const path = join(dir, `${frame}-${width}-${locale}.png`);
      await page.screenshot({ path, animations: "disabled" });
      console.log(`  SHOT ${path}`);
    }
  } finally { await page.close(); }
}

try {
  if (!PROVE_RED) {
    console.log("visual-v1 — the visual audit's lane V1, measured in Chromium");
    const failed = await run(REAL, (l) => console.log(l));
    console.log(`${NL}VISUAL-V1 — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${NL}`);
    process.exitCode = failed.length === 0 ? 0 : 1;
    if (failed.length === 0 && CAPTURE) await capture();
  } else {
    console.log("visual-v1 --prove-red — every plant must be caught by the check that names it");
    const baseline = await run(REAL, () => {});
    let caught = 0;
    const misses: string[] = [];
    if (baseline.length) misses.push(`the untouched tree fails ${baseline.length} check(s) — a red below proves nothing: ${baseline.join(" | ")}`);
    for (const p of PLANTS) {
      let failed: string[] = [];
      let why = "";
      try { failed = await run(await p.world(), () => {}, p.measure ?? false); } catch (e) { why = String((e as Error).message); }
      const hit = failed.some((f) => p.expect.test(f));
      if (hit) { caught++; console.log(`  RED  ${p.name} → ${failed.filter((f) => p.expect.test(f)).map((f) => f.slice(0, 14)).join(", ")}`); }
      else { misses.push(p.name); console.log(`  MISS ${p.name}${why ? ` — the plant could not be built: ${why}` : ` — failed instead: ${j(failed.map((f) => f.slice(0, 14)))}`}`); }
    }
    console.log(`${NL}VISUAL-V1 RED — ${caught}/${PLANTS.length} plants caught${misses.length ? `; ${misses.length} problem(s)` : ""}${NL}`);
    process.exitCode = misses.length === 0 ? 0 : 1;
  }
} finally {
  await KIT?.browser.close().catch(() => {});
}
