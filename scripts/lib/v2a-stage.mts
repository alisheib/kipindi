/**
 * THE V2a STAGE — the visual lane's one way to MEASURE a classic board page in a guard, in process.
 *
 * ⭐ WHY IT EXISTS. The lane's items are geometry: a control drawn through its neighbour, a line running past the viewport, a
 * column that moves from row to row, a target under the floor. A guard that reads class names passes the day someone
 * spells the same defect differently (DESIGN_AUTHORITY §5b, "assert the value, not the symbol"). So every V2a guard draws
 * the REAL component (React, server-rendered, the real dictionary in sw · en · zh), lays it out with the REAL stylesheet
 * (`src/app/globals.css` compiled by the repo's own Tailwind config, then `state-tokens.css` and `motion.css`, in the
 * root layout's order) in a REAL Chromium at the widths the owner names, and asserts what the boxes measure.
 *
 * ⛔ WHAT IT CANNOT SEE, STATED RATHER THAN HIDDEN. The brand faces are served by next/font from a build, so the stage
 * sets the same stacks with metric-alike system faces behind them (Inter → Arial, Sora → Arial, JetBrains Mono →
 * Consolas/Courier New): a width that depends on the exact glyph advance is read ON THE SERVED PAGE by the lane's drive,
 * not here. A V2a guard therefore asserts MECHANISMS that hold for any face — no overlap, a shared column, a floor kept,
 * a line that breaks only between its facts — and stresses them with the longest words the dictionary holds.
 * ⛔ It never touches the app's server, the store or the network: `about:blank` plus `setContent`, every request refused.
 *
 * PLANTS. A guard proves it can fail by planting the defect IN MEMORY — an edit to the stylesheet's text before it is
 * compiled, or to the drawn markup before it is laid out — and requiring its own check to report it. Nothing on disk
 * changes, so the plants are safe to run beside other sessions.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const req = createRequire(import.meta.url);

export type Loc = "sw" | "en" | "zh";
export const LOCALES: Loc[] = ["sw", "en", "zh"];
/** The owner's matrix (2026-10-15): every change is verified at these six widths in all three languages. */
export const WIDTHS = [320, 360, 390, 768, 1280, 1920] as const;

export const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/* ── React, for the real components ─────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
export const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type DictT = Record<string, unknown>;
export const { dict } = req(join(ROOT, "src/lib/i18n-dict.ts")) as { dict: Record<Loc, DictT> };
const { I18nProvider } = req(join(ROOT, "src/lib/i18n.tsx")) as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };

/** Draw a real element as the server would, inside the providers the client components read. */
export function draw(l: Loc, el: unknown, path = "/"): string {
  return renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
    h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l }, el as never))));
}
/** A dictionary word by path ("market.liveCount"). */
export const word = (l: Loc, p: string): string =>
  String(p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), dict[l]) ?? `‹no ${p}›`);
export const load = <T,>(p: string): T => req(join(ROOT, p)) as T;

/* ── the stylesheet, compiled as the app compiles it ────────────────────────────────────────────────────────────── */
const cssCache = new Map<string, string>();
/**
 * `globals.css` through the repo's own Tailwind config (content = the markup to be laid out), then the root layout's two
 * plain sheets. `edit` rewrites the globals text BEFORE it is compiled — the plants' door. The chat sheets' `@import`s
 * are dropped (no V2a surface draws the chat). Cached per (markup, globals text).
 */
export async function stylesheet(html: string, edit?: (globals: string) => string): Promise<string> {
  const globalsRaw = read("src/app/globals.css");
  const globals = (edit ? edit(globalsRaw) : globalsRaw).replace(/^@import\s+"[^"]+";\s*$/gm, "");
  const key = `${html.length}:${hash(html)}:${hash(globals)}`;
  const hit = cssCache.get(key);
  if (hit) return hit;
  const postcss = (await import("postcss")).default;
  const tailwindcss = (await import("tailwindcss")).default;
  const cfgMod = await import(pathToFileURL(join(ROOT, "tailwind.config.ts")).href);
  const cfg = ((cfgMod as Record<string, unknown>).default ?? cfgMod) as Record<string, unknown>;
  const { css } = await postcss([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tailwindcss as any)({ ...cfg, content: [{ raw: html, extension: "html" }] }),
  ]).process(globals, { from: join(ROOT, "src/app/globals.css") });
  const out = `${css}\n${read("src/app/state-tokens.css")}\n${read("src/app/motion.css")}`;
  cssCache.set(key, out);
  return out;
}
function hash(s: string): string {
  let a = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619) >>> 0; }
  return a.toString(36);
}

/* ── the browser ────────────────────────────────────────────────────────────────────────────────────────────────── */
/** The brand stacks with metric-alike system faces behind them (see the header). */
const FONT_STACKS = `:root{--font-sans:"Inter",Arial,Helvetica,sans-serif;--font-body:"Inter",Arial,Helvetica,sans-serif;--font-display:"Sora",Arial,Helvetica,sans-serif;--font-mono:"JetBrains Mono",Consolas,"Courier New",monospace;}`;

export type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
type PageLike = { evaluate<R, A>(fn: (a: A) => R, a: A): Promise<R>; setViewportSize(s: { width: number; height: number }): Promise<void>; setContent(html: string, o?: unknown): Promise<void>; route(u: string, f: (r: { abort(): Promise<void> }) => Promise<void>): Promise<void>; close(): Promise<void> };
type BrowserLike = { newPage(o?: unknown): Promise<PageLike>; close(): Promise<void> };

export class Stage {
  private constructor(private browser: BrowserLike) {}
  static async open(): Promise<Stage> {
    const { chromium } = await import("playwright");
    const executablePath = process.env.QA_CHROMIUM_PATH || undefined;
    const browser = await chromium.launch(executablePath ? { executablePath } : {});
    return new Stage(browser as unknown as BrowserLike);
  }
  /**
   * Lay `body` out at `width` with `css`, in a document whose `<html lang>` is the locale's (the stylesheet keys some rules
   * off `:lang()`), then run `fn` in it. `density` sets `<html data-density>` when a rule is density-gated.
   */
  async measure<R, A = undefined>(o: { body: string; css: string; width: number; height?: number; lang: Loc; density?: "comfortable"; arg?: A; fn: (a: A) => R }): Promise<R> {
    const page = await this.browser.newPage({ viewport: { width: o.width, height: o.height ?? 900 }, deviceScaleFactor: 1 });
    try {
      await page.route("**/*", (r) => r.abort());
      const lang = o.lang === "zh" ? "zh" : o.lang;
      await page.setContent(`<!doctype html><html lang="${lang}"${o.density ? ` data-density="${o.density}"` : ""}><head><meta charset="utf-8"><script>var __name = (f) => f;</script><style>${FONT_STACKS}</style><style>${o.css}</style></head><body class="bg-bg-base text-text">${o.body}</body></html>`, { waitUntil: "load" });
      return await page.evaluate(o.fn as (a: A) => R, o.arg as A);
    } finally {
      await page.close();
    }
  }
  async close() { await this.browser.close(); }
}

/* ── the report ─────────────────────────────────────────────────────────────────────────────────────────────────── */
export function reporter(title: string) {
  let pass = 0;
  const fails: string[] = [];
  console.log(`\n${title}\n${"═".repeat(Math.min(110, title.length))}`);
  return {
    section(s: string) { console.log(`\n── ${s} ${"─".repeat(Math.max(0, 108 - s.length))}`); },
    ok(name: string, cond: boolean, detail = "") {
      if (cond) { pass++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`); }
      else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
    },
    done(): never {
      console.log(`\n${pass} passed, ${fails.length} failed`);
      if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
      process.exit(0);
    },
  };
}
/** The browser-side box reader every probe shares (serialised into the page). */
export const BOX_SRC = `(el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom }; }`;
