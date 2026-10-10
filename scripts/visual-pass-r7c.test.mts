/**
 * ROUND 7 OF THE VISUAL PASS, FIXER C (2026-10-10) — edges and alignment: round 6's read, the geometry family. Each finding
 * re-measured from the code (CONFIRMED with numbers), fixed with every sibling it has, and held here beside a control or a
 * plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r7c.test.mts        (npm run test:visual-pass-r7c)
 *
 * The owner's rules (Ali): only perfect visual and logical results; consistency in each move — a finding is fixed with
 * every sibling it has, or the sibling is ruled where it stands (2026-10-09). The page's edge is 16px below 1024 and 32px
 * from it: the header's edge is the page's edge (2026-10-08).
 *   §1  R8-4   every notice band's words on the page's edge (`NoticeBar`, the one band, in both shells)
 *   §2  R5-9   every tracked label that ends on an edge takes its trailing tracking back: the census reads every way a label
 *              can end on an edge (alignment, flex, grid, position, stylesheet classes, inline styles, SVG anchors), and the
 *              take-back is the label's own end margin, which cannot wrap its words
 *   §3  R6-3   every display heading opens on its column's edge: the letter decides (`lib/display-stem.ts`), never the locale
 *   §4  R2-D5  every selection ring is drawn inside its box
 *   §5  R7-3 / R8-5  the stacked flag: a whole-pixel box, and the pair centred in its row by its ink
 *   §6  composition only (no dictionary word changed) and the classic chrome's arms as they were
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r7/c/mutation-r7c.mjs
 * (S = the session scratchpad).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const PLAYER_TSX = walk("src", /\.tsx$/).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));

/* ── the scales: this repo's overridden Tailwind spacing, the CSS tokens ─────────────────────────────────────────────── */
const TW = raw("tailwind.config.ts");
const tw = (k: string) => Number(new RegExp(`"${k.replace(".", "\\.")}":\\s*"([0-9.]+)px"`).exec(TW)?.[1] ?? NaN);
const token = (name: string) => Number(new RegExp(`${name}:\\s*([0-9.]+)px`).exec(CSS)?.[1] ?? NaN);
const sp = (n: number) => token(`--sp-${n}`);

/* ── React, for the parts drawn here ─────────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
type Dict = Record<string, Record<string, unknown>>;
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Dict> };
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(dict[l], p) ?? `‹no ${p}›`);
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inLocale = (l: Loc, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l }, el as never))));
const fontkit = req("fontkit") as { openSync: (p: string) => { glyphsForString: (s: string) => Array<{ advanceWidth: number; bbox: { minX: number; maxX: number } }>; unitsPerEm: number; capHeight: number; ["OS/2"]: { capHeight: number } } };
const MONO = fontkit.openSync("src/lib/server/reports/fonts/JetBrainsMono-Regular.ttf");
const INTER = fontkit.openSync("src/lib/server/reports/fonts/Inter-Medium.ttf");

/* ══ §1 · R8-4 · THE NOTICE BAND'S WORDS ON THE PAGE'S EDGE ═════════════════════════════════════════════════════════════ */
section("1 · R8-4 every notice band draws its words on the page's edge — 16px below 1024, 32px from it (tile 326: x21 / x369)");
{
  const NB = "src/components/ui/notice-bar.tsx";
  const pageX = /pad === "page" && "([^"]+)"/.exec(code("src/components/layout/page-container.tsx"))?.[1] ?? "";
  const pxOf = (cls: string) => cls.split(/\s+/).filter((c) => /^(?:[a-z]+:)?p[xlr]-/.test(c)).sort();
  const { NoticeBar, NoticeBarAction } = req("../src/components/ui/notice-bar.tsx") as { NoticeBar: unknown; NoticeBarAction: unknown };
  const bar = renderToStaticMarkup(h(NoticeBar as never, { tone: "warning", glyph: "alertCircle", testId: "session-ended-notice",
    action: h(NoticeBarAction as never, { href: "/auth/login", tone: "warning" }, word("sw", "common.signIn")) } as never,
    `${word("sw", "auth.signedOut")}. ${word("sw", "auth.sessionEndedBody")}`));
  const row = /<div class="(mx-auto flex max-w-board[^"]*)"/.exec(bar)?.[1] ?? "";
  ok(`1.1 · RENDERED: the band's row pads exactly as a page does — ${j(pxOf(row))}, PageContainer's ${j(pxOf(pageX))}`,
    pxOf(row).length > 0 && j(pxOf(row)) === j(pxOf(pageX)), row);
  const below = tw("3"), from = tw("6");
  const jrow = /\.kp-jhdr__row \{[^}]*padding-inline: var\(--sp-(\d+)\)/.exec(CSS)?.[1], jrowLg = /@media \(min-width: 1024px\) \{ \.kp-jhdr__row \{[^}]*padding-inline: var\(--sp-(\d+)\)/.exec(CSS)?.[1];
  ok(`1.2 · on the header's edge: ${below}px below 1024 (the journey row's --sp-${jrow} = ${sp(Number(jrow))}px), ${from}px from it (--sp-${jrowLg} = ${sp(Number(jrowLg))}px)`,
    below === 16 && from === 32 && sp(Number(jrow)) === below && sp(Number(jrowLg)) === from);
  // At 390 the glyph's box starts at x16 (its ink 0.6px in, as every 15px glyph's), and the action's box ends at x374 —
  // the last inked column x373 — where the tile measured x21 and x369 (20px of padding).
  ok("1.3 · at sw 390 the glyph's box opens at x16 and the Ingia box closes at x374 (last column x373); the tile read x21 / x369 under 20px",
    below === 16 && 390 - below === 374 && 390 - tw("4") - 1 === 369 && tw("4") + 1 === 21);
  ok("1.3′ PLANT · the row as it was (`px-4`) is reported", j(pxOf(row.replace("px-3", "px-4"))) !== j(pxOf(pageX)));
  // Every band of the kind renders through the one component.
  const users = PLAYER_TSX.filter((f) => /<NoticeBar\b/.test(code(f)) && f !== NB).sort();
  ok(`1.4 · the session-ended notice, the offline notice, the announcement and maintenance bars, the away summary and the preview marker all draw through it (${users.length} files)`,
    j(users) === j(["src/components/layout/announcement-banner.tsx", "src/components/layout/app-shell.tsx", "src/components/layout/away-summary-bar.tsx", "src/components/layout/preview-marker.tsx", "src/components/ui/offline-banner.tsx"]), j(users));
  // The census of full-bleed rows: every `max-w-board` row in player code pads as the page does, or is ruled.
  const RULED: Record<string, string> = {
    "src/components/layout/top-app-bar.tsx": "the classic header — frozen chrome until the flip (12px below 640, 24px from it)",
    "src/components/layout/app-shell.tsx#header": "the opt-out page's own header (16px, 24px from 640) — a header, named for the integrator",
    "src/components/auth/auth-shell.tsx": "the auth grid takes the header's box from 1024; its columns pad themselves",
  };
  const rows: string[] = [];
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(/className="([^"]*\bmx-auto\b[^"]*\bmax-w-board\b[^"]*|[^"]*\bmax-w-board\b[^"]*\bmx-auto\b[^"]*)"/g)) {
    const px = pxOf(m[1]);
    if (j(px) === j(pxOf(pageX)) || px.length === 0) continue;
    const key = f === "src/components/layout/app-shell.tsx" && /sm:px-5/.test(m[1]) ? `${f}#header` : f;
    rows.push(RULED[key] ? `ruled:${key}` : `LOOSE:${f}:${m[1]}`);
  }
  ok(`1.5 · every full-bleed row pads as the page does, or is ruled (${rows.length} ruled: the classic header, the opt-out header, the auth grid)`,
    rows.every((r) => r.startsWith("ruled:")) && rows.length === 3, j(rows));
  ok("1.6 · CONTROL · the journey's ticker keeps the page's edge from 1024 (round 3's rule, unchanged)",
    /@media \(min-width: 1024px\) \{\s*:root:has\(#kp-journey-shell\) \.ticker-strip \{ padding-inline: calc\(max\(0px, \(100% - var\(--w-board\)\) \/ 2\) \+ var\(--sp-4\)\); \}/.test(CSS));
}

/* ══ §2 · R5-9 · EVERY TRACKED LABEL THAT ENDS ON AN EDGE TAKES ITS TRACKING BACK ═══════════════════════════════════════ */
section("2 · R5-9 every tracked label that ends on an edge takes its trailing tracking back — the census, the technique, the steps");

/* The stylesheet: which classes track, which align or push to the end, which take the tracking back. */
type Rule = { sel: string; body: string };
const RULES: Rule[] = [];
for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) for (const s of m[1].split(",")) RULES.push({ sel: s.trim().replace(/\s+/g, " "), body: m[2] });
const lastClasses = (sel: string) => {
  const last = sel.split(/[ >+~]+/).filter(Boolean).pop() ?? "";
  if (/::?(?:before|after|placeholder|marker|first-letter|first-line)/.test(last)) return [];
  return [...last.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
};
const emOf = (v: string) => { const m = /^(-?[0-9.]+)(em|px)$/.exec(v.trim()); return !m ? 0 : m[2] === "em" ? Number(m[1]) : Number(m[1]) / 10; };
const CSS_TRACK = new Map<string, number>();
const CSS_ALIGN_END = new Set<string>(), CSS_PUSH = new Set<string>(), CSS_ROWEND = new Set<string>(), CSS_COLEND = new Set<string>(), CSS_SELFEND = new Set<string>(), CSS_FLEX = new Set<string>();
for (const r of RULES) {
  const cls = lastClasses(r.sel);
  const ls = /letter-spacing:\s*([^;]+)/.exec(r.body);
  if (ls) for (const c of cls) CSS_TRACK.set(c, emOf(ls[1]));
  const add = (set: Set<string>, ok_: boolean) => { if (ok_) for (const c of cls) set.add(c); };
  add(CSS_ALIGN_END, /text-align:\s*(?:right|end)\b/.test(r.body));
  add(CSS_PUSH, /margin-(?:left|inline-start):\s*auto/.test(r.body));
  add(CSS_FLEX, /display:\s*(?:inline-)?(?:flex|grid)\b/.test(r.body));
  add(CSS_ROWEND, /display:\s*(?:inline-)?flex\b/.test(r.body) && /justify-content:\s*(?:space-between|flex-end|end)\b/.test(r.body) && !/flex-direction:\s*column/.test(r.body));
  add(CSS_COLEND, /flex-direction:\s*column/.test(r.body) && /align-items:\s*(?:flex-end|end)\b/.test(r.body));
  add(CSS_SELFEND, /(?:justify-self|align-self):\s*(?:end|flex-end)\b/.test(r.body));
}
/** The stylesheet's own take-backs: the label's end margin (the rule this round wrote) and the table head's empty box. */
const CSS_TAKE = RULES.filter((r) => (/margin-inline-end:\s*calc\(-1 \* var\(--track-end/.test(r.body)) || (/::after/.test(r.sel) && /margin-(?:right|inline-end):\s*(?:calc\(-|-)/.test(r.body)))
  .map((r) => r.sel.replace(/::after$/, ""));

/* JSX: every element with the static class tokens its className can produce, its parent, its children, its words. */
type Consts = Map<string, ts.Expression>;
function strs(n: ts.Node | undefined, consts: Consts, depth = 0): string[] {
  if (!n || depth > 10) return [];
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
  if (ts.isTemplateExpression(n)) return [n.head.text, ...n.templateSpans.flatMap((s) => [s.literal.text, ...strs(s.expression, consts, depth + 1)])];
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || ts.isSatisfiesExpression(n)) return strs(n.expression, consts, depth + 1);
  if (ts.isConditionalExpression(n)) return [...strs(n.whenTrue, consts, depth + 1), ...strs(n.whenFalse, consts, depth + 1)];
  if (ts.isBinaryExpression(n)) return [...strs(n.left, consts, depth + 1), ...strs(n.right, consts, depth + 1)];
  if (ts.isCallExpression(n)) return n.arguments.flatMap((a) => strs(a, consts, depth + 1));
  if (ts.isArrayLiteralExpression(n)) return n.elements.flatMap((e) => strs(e, consts, depth + 1));
  const object = (id: ts.Expression) => {
    let o = ts.isIdentifier(id) ? consts.get(id.text) : undefined;
    while (o && (ts.isAsExpression(o) || ts.isParenthesizedExpression(o) || ts.isSatisfiesExpression(o))) o = o.expression;
    return o && ts.isObjectLiteralExpression(o) ? o : undefined;
  };
  if (ts.isIdentifier(n)) { const c = consts.get(n.text); return c && !object(n) ? strs(c, consts, depth + 1) : []; }
  if (ts.isPropertyAccessExpression(n)) {
    const o = object(n.expression);
    const p = o?.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText() === n.name.text) as ts.PropertyAssignment | undefined;
    return p ? strs(p.initializer, consts, depth + 1) : [];
  }
  if (ts.isElementAccessExpression(n)) return object(n.expression)?.properties.flatMap((q) => (ts.isPropertyAssignment(q) ? strs(q.initializer, consts, depth + 1) : [])) ?? [];
  if (ts.isJsxExpression(n)) return strs(n.expression, consts, depth + 1);
  return [];
}
type El = {
  file: string; line: number; tag: string; cls: Set<string>; style: string; attrs: Map<string, string>;
  parent: El | null; kids: El[]; text: boolean; textAfterKids: boolean; lastIsGlyph: boolean;
};
const GLYPH_TAG = /^(?:I\.\w+|svg|Glyph|Ico|CloseX)$/;
/** A file's top-level constants, and the ones it imports by name from another module of `src` (a class table such as
 *  `PNL_STRIP`, read by the page and its loading drawing alike). */
const constCache = new Map<string, Consts>();
function constsOf(file: string, src: string, depth = 0): Consts {
  const hit = constCache.get(file);
  if (hit) return hit;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const consts: Consts = new Map();
  constCache.set(file, consts);
  sf.forEachChild(function v(n: ts.Node) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) consts.set(n.name.text, n.initializer);
    n.forEachChild(v);
  });
  if (depth < 2) for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause?.namedBindings || !ts.isNamedImports(st.importClause.namedBindings)) continue;
    const spec = st.moduleSpecifier.text;
    const basePath = spec.startsWith("@/") ? `src/${spec.slice(2)}` : null;
    if (!basePath) continue;
    const target = [`${basePath}.ts`, `${basePath}.tsx`, `${basePath}/index.ts`].find((p) => { try { return statSync(p).isFile(); } catch { return false; } });
    if (!target) continue;
    const theirs = constsOf(target, raw(target), depth + 1);
    for (const el of st.importClause.namedBindings.elements) {
      const name = (el.propertyName ?? el.name).text;
      const found = theirs.get(name);
      if (found && !consts.has(el.name.text)) consts.set(el.name.text, found);
    }
  }
  return consts;
}
function parseTsx(file: string, src: string): El[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const consts: Consts = file.endsWith(".tsx") && !file.startsWith("x") ? constsOf(file, src) : new Map();
  if (!consts.size) sf.forEachChild(function v(n: ts.Node) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) consts.set(n.name.text, n.initializer);
    n.forEachChild(v);
  });
  const out: El[] = [];
  const visit = (n: ts.Node, parent: El | null) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const attrs = new Map<string, string>();
      for (const p of open.attributes.properties) if (ts.isJsxAttribute(p)) attrs.set(p.name.getText(sf), p.initializer ? p.initializer.getText(sf) : "");
      const cA = open.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === "className") as ts.JsxAttribute | undefined;
      const el: El = {
        file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, tag: open.tagName.getText(sf),
        cls: new Set((cA?.initializer ? strs(cA.initializer, consts) : []).flatMap((s) => s.split(/\s+/)).filter(Boolean)),
        style: attrs.get("style") ?? "", attrs, parent, kids: [], text: false, textAfterKids: false, lastIsGlyph: false,
      };
      out.push(el);
      if (parent) parent.kids.push(el);
      if (ts.isJsxElement(n)) for (const c of n.children) {
        if (ts.isJsxText(c)) { if (c.text.trim()) { el.text = true; el.textAfterKids = true; el.lastIsGlyph = false; } continue; }
        if (ts.isJsxExpression(c)) {
          let jsx = false;
          c.forEachChild(function v(k: ts.Node) { if (ts.isJsxElement(k) || ts.isJsxSelfClosingElement(k) || ts.isJsxFragment(k)) jsx = true; else k.forEachChild(v); });
          if (c.expression && !jsx) { el.text = true; el.textAfterKids = true; el.lastIsGlyph = false; }
          c.forEachChild((k) => visit(k, el));
          continue;
        }
        el.textAfterKids = false;
        visit(c, el);
        const last = el.kids[el.kids.length - 1];
        // A glyph, an info hint (its words then its ⓘ), or a box that holds only a glyph (the settled row's ↗).
        el.lastIsGlyph = !!last && (GLYPH_TAG.test(last.tag) || last.tag === "InfoHint"
          || (!last.text && last.kids.length > 0 && last.kids.every((k) => GLYPH_TAG.test(k.tag))));
      }
      for (const p of open.attributes.properties) if (ts.isJsxAttribute(p) && p.initializer && ts.isJsxExpression(p.initializer)) p.initializer.forEachChild((k) => visit(k, null));
      return;
    }
    if (ts.isJsxFragment(n)) { n.children.forEach((c) => visit(c, parent)); return; }
    n.forEachChild((k) => visit(k, parent));
  };
  sf.forEachChild((n) => visit(n, null));
  return out;
}
const V = "(?:[a-z0-9-]+:)*";
const base = (c: string) => c.replace(new RegExp(`^${V}`), "");
const hasCls = (el: El | null, re: RegExp) => !!el && [...el.cls].some((c) => re.test(c));
const T = (s: string) => new RegExp(`^${V}(?:${s})$`);
const twTrack = (c: string): number | null => {
  const b = base(c);
  if (b === "eyebrow") return 0.14;
  if (b === "tracking-wide") return 0.025;
  if (b === "tracking-wider") return 0.05;
  if (b === "tracking-widest") return 0.1;
  if (/^tracking-(?:normal|tight|tighter)$/.test(b)) return 0;
  const m = /^tracking-\[(-?[0-9.]+)(em|px)\]$/.exec(b);
  if (m) return m[2] === "em" ? Number(m[1]) : Number(m[1]) / 10;
  return CSS_TRACK.has(b) ? CSS_TRACK.get(b)! : null;
};
/** The letter-spacing a label's words wear (em): its own, or the nearest ancestor's that sets one. `.eyebrow.eyebrow` wins. */
function trackOf(el: El): number {
  for (let e: El | null = el; e; e = e.parent) {
    if (e.cls.has("eyebrow")) return 0.14;
    const vals = [...e.cls].map(twTrack).filter((v): v is number => v !== null);
    const st = /letterSpacing:\s*"(-?[0-9.]+)(em|px)"/.exec(e.style);
    if (st) vals.push(st[2] === "em" ? Number(st[1]) : Number(st[1]) / 10);
    if (vals.length) return Math.max(...vals);
  }
  return 0;
}
const ALIGN_END = T("text-right|text-end"), ALIGN_ANY = T("text-left|text-center|text-right|text-start|text-end|text-justify");
const PUSH = T("ml-auto|ms-auto"), BETWEEN = T("justify-between"), JEND = T("justify-end"), FLEX = T("flex|inline-flex"), GRID = T("grid|inline-grid");
const COL = T("flex-col|flex-col-reverse"), GROW = T("flex-1|grow|flex-auto|flex-grow|grow-\\[[^\\]]+\\]");
const SELF_END = T("self-end|justify-self-end|place-self-end"), ITEMS_END = T("items-end"), GRID_ITEMS_END = T("justify-items-end|place-items-end");
const POS = T("absolute|fixed"), RIGHT_POS = T("-?right-[^ ]+|-?end-[^ ]+"), LEFT_POS = T("-?left-[^ ]+|-?start-[^ ]+|-?inset-x-[^ ]+|-?inset-[0-9a-z[\\]-]+");
const FLOAT_END = T("float-right|float-end");
const BOX = T("bg-(?!transparent\\b)[^ ]+|border|border-[xlr]|border-\\[[^\\]]+\\]|rounded-pill|rounded-full|btn|btn-[a-z-]+");
const PADX = T("px-[^ ]+|pl-[^ ]+|pr-[^ ]+|p-[^ ]+|ps-[^ ]+|pe-[^ ]+");
const cssHas = (el: El | null, set: Set<string>) => !!el && [...el.cls].some((c) => set.has(base(c)));
const isFlex = (el: El | null) => !!el && (hasCls(el, FLEX) || hasCls(el, GRID) || cssHas(el, CSS_FLEX) || /display:\s*"(?:inline-)?(?:flex|grid)"/.test(el.style));
const isLast = (el: El) => !!el.parent && el.parent.kids[el.parent.kids.length - 1] === el && !el.parent.textAfterKids;
const isOnly = (el: El) => !!el.parent && el.parent.kids.length === 1 && !el.parent.text;
/** Where the words are aligned to the end: the label itself or the nearest ancestor that sets an alignment. */
function alignedEnd(el: El): El | null {
  for (let e: El | null = el; e; e = e.parent) {
    if (hasCls(e, ALIGN_ANY)) return hasCls(e, ALIGN_END) ? e : null;
    if (/textAlign:\s*"(?:right|end)"/.test(e.style) || cssHas(e, CSS_ALIGN_END)) return e;
    if (/textAlign:\s*"(?:left|center|start)"/.test(e.style)) return null;
  }
  return null;
}
/** Pushed to its row's end by its own placement or its parent's. */
function placedEnd(el: El): string | null {
  const p = el.parent;
  if (hasCls(el, PUSH) || cssHas(el, CSS_PUSH) || /marginLeft:\s*"auto"/.test(el.style)) return "pushed (ml-auto)";
  if (hasCls(el, SELF_END) || cssHas(el, CSS_SELFEND)) return "self-end";
  if (hasCls(el, FLOAT_END)) return "float-right";
  if (hasCls(el, POS) && hasCls(el, RIGHT_POS) && !hasCls(el, LEFT_POS)) return "positioned at the right";
  if (!p) return null;
  const row = isFlex(p) && !hasCls(p, COL);
  if (row && isLast(el) && (hasCls(p, JEND) || /justifyContent:\s*"(?:flex-end|end)"/.test(p.style))) return "last of justify-end";
  if (row && isLast(el) && (p.kids.length > 1 || p.text) && (hasCls(p, BETWEEN) || cssHas(p, CSS_ROWEND) || /justifyContent:\s*"space-between"/.test(p.style))) return "last of justify-between";
  if (row && isLast(el) && p.kids.slice(0, -1).some((k) => hasCls(k, GROW))) return "after a growing sibling";
  if (isFlex(p) && hasCls(p, COL) && hasCls(p, ITEMS_END)) return "a column's items-end";
  if (cssHas(p, CSS_COLEND)) return "a column's items-end (stylesheet)";
  if (hasCls(p, GRID_ITEMS_END)) return "a grid's items-end";
  return null;
}
const INLINE_TAG = /^(?:span|a|button|Link|strong|b|em|label|code|abbr|time|GhostText|small)$/;
/** Does the label end on an edge, and where is that decided? `at` is the element whose box meets the edge. */
function endsOnEdge(el: El): { why: string; at: El } | null {
  const a = alignedEnd(el);
  if (a) return { why: a === el ? "text-right" : `text-right (on <${a.tag}>:${a.line})`, at: a };
  for (let e: El | null = el; e; e = e.parent) {
    const why = placedEnd(e);
    if (why) return { why: e === el ? why : `${why} (via <${e.tag}>:${e.line})`, at: e };
    if (!e.parent || !(isLast(e) || isOnly(e))) return null;
    // The parent's end is the label's end only while the parent sizes itself to what it holds: an inline, a flex or grid
    // item, or a flex/grid container (a shrink-to-fit box). A block in the flow fills its column, so the walk stops there.
    const shrinks = INLINE_TAG.test(e.parent.tag) || isFlex(e.parent) || (!!e.parent.parent && isFlex(e.parent.parent));
    if (!shrinks) return null;
  }
  return null;
}
function matchesSel(el: El, sel: string): boolean {
  const parts = sel.split(" ").filter(Boolean);
  const comp = (e: El, c: string) => {
    const tag = /^[a-z][a-z0-9]*/.exec(c)?.[0];
    const classes = [...c.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
    return (!tag || e.tag === tag) && classes.every((k) => e.cls.has(k));
  };
  if (!comp(el, parts[parts.length - 1])) return false;
  let i = parts.length - 2;
  for (let e = el.parent; e && i >= 0; e = e.parent) if (comp(e, parts[i])) i--;
  return i < 0;
}
const takesBack = (e: El) => CSS_TAKE.some((s) => matchesSel(e, s));
function taken(el: El, at: El): boolean {
  for (let e: El | null = el; e; e = e.parent) { if (takesBack(e)) return true; if (e === at) break; }
  const down = (e: El): boolean => e.kids.some((k) => takesBack(k) || down(k));
  return down(el);
}
function boxed(el: El, at: El): boolean {
  for (let e: El | null = el; e; e = e.parent) {
    if (hasCls(e, BOX) && (hasCls(e, PADX) || [...e.cls].some((c) => /^btn(?:-|$)/.test(base(c))))) return true;
    if (/(?:background|border)[A-Za-z]*:/.test(e.style) && (hasCls(e, PADX) || /padding/.test(e.style))) return true;
    if (e === at) break;
  }
  return false;
}
type Row = { kind: "TAKEN" | "GLYPH" | "BOXED" | "LOOSE"; file: string; line: number; tag: string; track: number; why: string; el: El; at: El };
/** THE CENSUS: every element that holds words, wears tracking of 0.05em or more and ends on an edge. */
function census(files: Array<[string, string]>): Row[] {
  const rows: Row[] = [];
  for (const [file, src] of files) for (const el of parseTsx(file, src)) {
    if (!el.text || el.tag === "text" || el.tag === "tspan") continue;
    const track = trackOf(el);
    if (track < 0.05) continue;
    const e = endsOnEdge(el);
    if (!e) continue;
    const kind = taken(el, e.at) ? "TAKEN" : el.lastIsGlyph || e.at.lastIsGlyph || el.tag === "InfoHint" ? "GLYPH" : boxed(el, e.at) ? "BOXED" : "LOOSE";
    rows.push({ kind, file, line: el.line, tag: el.tag, track, why: e.why, el, at: e.at });
  }
  return rows;
}
const FILES: Array<[string, string]> = PLAYER_TSX.map((f) => [f, raw(f)]);
const rows = census(FILES);
const show = (r: Row) => `${r.file}:${r.line} <${r.tag}> ${r.track}em [${r.why}]`;
/** `R7C_LIST=1 npx tsx scripts/visual-pass-r7c.test.mts` prints the census, row by row (for a reader; checks are unchanged). */
if (process.env.R7C_LIST) for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind) || a.file.localeCompare(b.file) || a.line - b.line)) console.log(`  · ${r.kind.padEnd(5)} ${show(r)}`);
{
  const loose = rows.filter((r) => r.kind === "LOOSE");
  const count = (k: Row["kind"]) => rows.filter((r) => r.kind === k).length;
  ok(`2.1 · THE CENSUS: no tracked label that ends on an edge keeps its trailing tracking — ${count("TAKEN")} take it back, ${count("GLYPH")} end on a glyph, ${count("BOXED")} sit padded in a box, 0 loose`,
    loose.length === 0, j(loose.map(show)));
  // The finding itself, and C11's census beside it: R5-9's label is the census's, not C11's.
  const fair = rows.find((r) => r.file === "src/app/fairness/page.tsx" && r.el.cls.has("eyebrow"));
  ok("2.2 · /fairness' reference \"FATF R.10 · POCA CAP 423 §16\" is in the census (the last of a justify-between row, which C11 read as left-aligned) and takes its 0.14em back",
    !!fair && fair.kind === "TAKEN" && /justify-between/.test(fair.why));
  // The numbers, from the repo's JetBrains Mono: 11px, tracked 0.14em; its trailing gap was the tracking and the 6's bearing.
  const six = MONO.glyphsForString("6")[0];
  const rsb = (six.advanceWidth - six.bbox.maxX) / MONO.unitsPerEm * 11, trackPx = 0.14 * 11;
  ok(`2.3 · at 1280 its last letter stood ${(trackPx + rsb).toFixed(2)}px short of the panel's edge (the tile: x1113 against x1115); it stands ${rsb.toFixed(2)}px short — the 6's own bearing in its cell, as R3-C and F19 left every such letter`,
    Math.abs(trackPx + rsb - 2.24) < 0.01 && rsb < 1);
  // The ruled ones: a padded box meets the edge and its words sit in its padding; a glyph ends the label.
  const ruled = (k: Row["kind"]) => rows.filter((r) => r.kind === k).map((r) => `${r.file}<${r.tag}>`).sort();
  ok(`2.4 · the padded boxes are boxes — their edge is the box's, their words padded: the Wallet's bonus pill and the cashback pill, the dial's lock pill and its bet button's stake, the home row's NO button, the handover's ghost button, the time field's suffix: ${j(ruled("BOXED"))}`,
    j(ruled("BOXED")) === j(["src/app/wallet/wallet-client.tsx<span>", "src/components/home/landing-hero.tsx<Link>", "src/components/markets/conviction-dial.tsx<button>", "src/components/markets/conviction-dial.tsx<span>", "src/components/ui/cashback-promo.tsx<span>", "src/components/ui/time-select.tsx<span>", "src/components/updown/updown-handover.tsx<a>"]));
  ok(`2.5 · the labels that end on a glyph end on the glyph's edge (C11's two, the landing's "see all ›" links): ${j(ruled("GLYPH"))}`,
    j(ruled("GLYPH")) === j(["src/components/home/landing-hero.tsx<Link>", "src/components/home/topic-tiles.tsx<Link>", "src/components/home/trust-band.tsx<Link>", "src/components/markets/conviction-dial.tsx<InfoHint>", "src/components/updown/updown-card.tsx<div>"]));
  // The step each label takes back is its own tracking.
  const STEP: Record<string, number> = { "": 0.14, "--16": 0.16, "--12": 0.12, "--10": 0.1, "--08": 0.08, "--06": 0.06, "--05": 0.05 };
  const stepOf = (r: Row): number | null => {
    for (let e: El | null = r.el; e; e = e.parent) {
      if (e.cls.has("kp-track-end")) { const s = [...e.cls].find((c) => /^kp-track-end--\d+$/.test(c)); return STEP[s ? s.slice("kp-track-end".length) : ""] ?? NaN; }
      if (e === r.at) break;
    }
    const down = (e: El): El | null => { for (const k of e.kids) { if (k.cls.has("kp-track-end")) return k; const d = down(k); if (d) return d; } return null; };
    const d = down(r.el);
    if (d) { const s = [...d.cls].find((c) => /^kp-track-end--\d+$/.test(c)); return STEP[s ? s.slice("kp-track-end".length) : ""] ?? NaN; }
    return null;   // a stylesheet take-back (the caption, the one-sided label, the bar's side, the table head)
  };
  const mismatched = rows.filter((r) => r.kind === "TAKEN").map((r) => ({ r, s: stepOf(r) })).filter((x) => x.s !== null && Math.abs((x.s as number) - x.r.track) > 1e-9).map((x) => `${show(x.r)} takes back ${x.s}`);
  ok("2.6 · each label takes back exactly its own tracking (0.14em by default; the --16, --12, --10, --08, --06 and --05 steps)", mismatched.length === 0, j(mismatched));
  const stepCss = Object.entries(STEP).filter(([k]) => k).every(([k, v]) => new RegExp(`\\.kp-track-end${k} \\{ --track-end: ${v.toFixed(2).replace(/0$/, "")}0?em; \\}`).test(CSS));
  ok("2.7 · the steps are the stylesheet's: --16 0.16em, --12 0.12em, --10 0.10em, --08 0.08em, --06 0.06em, --05 0.05em", stepCss);
}
{
  // THE TECHNIQUE: the label's own end margin. The empty box after the words took the tracking out of the label's width and
  // wrapped a two-word label that sizes itself to its words (R5-1, /results' flag, 34245fd4).
  const rule = /\.mcardp-pctcap,\s*\.mcardp-moveline \.mcardp-oneside,\s*\.tipbar-labels \.tb-no,\s*\.kp-track-end \{ margin-inline-end: calc\(-1 \* var\(--track-end, 0\.14em\)\); \}/.test(CSS);
  ok("2.8 · ONE TECHNIQUE: the price caption, the one-sided label, the bar's side label and `kp-track-end` take their tracking back with their own end margin — no empty box after the words",
    rule && !/\.kp-track-end::after/.test(CSS) && !/\.mcardp-pctcap::after|\.mcardp-oneside::after|\.tb-no::after/.test(CSS));
  ok("2.9 · the one exception is ruled: a right-aligned table head keeps R3-C's empty box (a table cell takes no margin; the heads never wrap)",
    /\.admin-tbl thead th\.text-right::after \{ content: ""; display: inline-block; margin-right: -0\.14em; \}/.test(CSS) && /\.admin-tbl th \{[^}]*white-space: nowrap/.test(CSS));
  // Where the class may stand: on the label's own box — a block, or a flex/grid item — never on a bare inline that a
  // shrink-to-fit box holds (its end margin would wrap the words as the empty box did), never beside a margin-right utility.
  const BLOCK = /^(?:p|div|h[1-6]|li|dt|dd|section|header|footer|figcaption|td|th)$/;
  const misplaced: string[] = [];
  for (const [file, src] of FILES) for (const el of parseTsx(file, src)) {
    if (!el.cls.has("kp-track-end")) continue;
    const flexItem = isFlex(el.parent);
    const displayed = hasCls(el, T("block|inline-block|flex|inline-flex|grid|inline-grid"));
    if (!BLOCK.test(el.tag) && !flexItem && !displayed) misplaced.push(`${file}:${el.line} <${el.tag}> a bare inline`);
    // An end-margin utility would fight the class (a plain `m-0` loses to it on the stylesheet's order and is harmless; a
    // responsive one would win).
    if ([...el.cls].some((c) => /^(?:[a-z0-9-]+:)*-?(?:mr|mx|me)-/.test(c) || /^(?:[a-z0-9-]+:)+-?m-/.test(c))) misplaced.push(`${file}:${el.line} <${el.tag}> beside a margin-right utility`);
    // Its box now reaches its tracking past the edge, so it may paint nothing there: no fill, edge, ring or shadow.
    if (hasCls(el, T("bg-(?!transparent\\b)[^ ]+|border|border-[^ ]+|rounded-[^ ]+|ring-[^ ]+|shadow-[^ ]+"))) misplaced.push(`${file}:${el.line} <${el.tag}> paints a box`);
  }
  ok("2.10 · every `kp-track-end` is the label's own box (a block, or a flex or grid item), carries no margin-right utility and paints no box (its box reaches its tracking past the edge)", misplaced.length === 0, j(misplaced));
  // SVG labels anchored at their end carry their trailing tracking in the anchored advance: each is anchored that much
  // further out, so its last letter ends where its line (or its mirror) ends.
  const ANCHORS: Array<{ file: string; nominal: number; size: number; track: number; at: string }> = [
    { file: "src/components/updown/price-hero.tsx", nominal: 606, size: 8.5, track: 0.10, at: "the dashed target lines' end (x2=606)" },
    { file: "src/components/onboarding/first-visit-primer.tsx", nominal: 274, size: 8.5, track: 0.08, at: "6 in from the track's end (YES starts 6 in)" },
  ];
  const svg: string[] = [];
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(/<text\b([^>]*)>/g)) {
    const a = m[1];
    if (!/textAnchor="end"/.test(a)) continue;
    const ls = /letterSpacing="([0-9.]+)em"/.exec(a);
    if (!ls || Number(ls[1]) <= 0) continue;
    const x = Number(/\bx="([0-9.]+)"/.exec(a)?.[1]);
    const fsz = Number(/fontSize="([0-9.]+)"/.exec(a)?.[1]);
    const reg = ANCHORS.find((r) => r.file === f && Math.abs(r.size - fsz) < 1e-9 && Math.abs(r.track - Number(ls[1])) < 1e-9);
    svg.push(!reg ? `UNRULED ${f}: ${a.trim().slice(0, 80)}` : Math.abs(x - (reg.nominal + reg.track * reg.size)) < 1e-6 ? `ok ${f}` : `SHORT ${f}: x=${x}, wants ${reg.nominal + reg.track * reg.size}`);
  }
  ok(`2.11 · every end-anchored tracked SVG label is anchored its tracking further out (the round chart's two targets at x606.85, the primer's NO at x274.68): ${svg.length} labels`,
    svg.length === 3 && svg.every((s) => s.startsWith("ok ")), j(svg));
  // PLANTS, in memory.
  const FAIR = "src/app/fairness/page.tsx";
  const p1 = census([[FAIR, raw(FAIR).replace("text-text-subtle kp-track-end\">FATF", "text-text-subtle\">FATF")]]).filter((r) => r.kind === "LOOSE");
  ok("2.1′ PLANT · /fairness' reference without its take-back is reported LOOSE", p1.length === 1 && p1[0].file === FAIR, j(p1.map(show)));
  const p2 = census([["x.tsx", `export const X = () => <div className="flex items-center justify-between"><span>A</span><span className="font-mono uppercase eyebrow">Two words</span></div>;`]]);
  ok("2.2′ PLANT · a tracked label at the end of a justify-between row is found (C11's census, reading only `text-right`, missed it)", p2.length === 1 && p2[0].kind === "LOOSE");
  const p3 = census([["x.tsx", `export const X = () => <div className="flex justify-between"><p className="eyebrow">Only child</p></div>;`]]);
  ok("2.3′ CONTROL · a justify-between row's ONLY item stands at the row's start — not an end label", p3.length === 0, j(p3.map(show)));
  const p4 = census([["x.tsx", `export const X = () => <div className="flex"><b>A</b><div className="ml-auto"><span className="eyebrow">Pushed</span></div></div>;`]]);
  ok("2.4′ PLANT · a label pushed to the end by its wrapper (`ml-auto`) is found through the wrapper", p4.length === 1 && p4[0].kind === "LOOSE" && /via <div>/.test(p4[0].why));
  const p5 = census([["x.tsx", `export const X = () => <div className="text-center"><p className="eyebrow">Centred</p></div>;`]]);
  ok("2.5′ CONTROL · a centred label keeps its tracking (F19: centred and left-aligned labels are untouched)", p5.length === 0);
  const p6 = census([["x.tsx", `export const X = () => <div className="flex justify-between"><b>A</b><span className="eyebrow">Ends<I.chevronRight s={14} /></span></div>;`]]);
  ok("2.6′ CONTROL · a label that ends on a glyph is ruled GLYPH", p6.length === 1 && p6[0].kind === "GLYPH");
  const misPlant = parseTsx("x.tsx", `export const X = () => <p className="ml-auto"><span className="kp-track-end">Two words</span></p>;`).filter((e) => e.cls.has("kp-track-end") && !/^(?:p|div)$/.test(e.tag) && !isFlex(e.parent));
  ok("2.10′ PLANT · `kp-track-end` on a bare inline inside a block that sizes itself to it is reported", misPlant.length === 1);
  const wrongStep = census([["x.tsx", `export const X = () => <div className="flex justify-between"><b>A</b><span className="tracking-[0.12em] kp-track-end kp-track-end--10">B</span></div>;`]]);
  ok("2.6″ PLANT · a 0.12em label taking back 0.10em is a mismatch the step check reads", wrongStep.length === 1 && wrongStep[0].track === 0.12);
  const oldRule = CSS.replace(/\.kp-track-end \{ margin-inline-end:[^}]*\}/, '.kp-track-end::after { content: ""; display: inline-block; margin-inline-end: calc(-1 * var(--track-end, 0.14em)); }');
  ok("2.8′ PLANT · the empty box after the words, put back, is reported", /\.kp-track-end::after/.test(oldRule));
}

/* ══ §3 · R6-3 · EVERY DISPLAY HEADING OPENS ON ITS COLUMN'S EDGE ═══════════════════════════════════════════════════════ */
section("3 · R6-3 every display heading opens on its column's edge — the letter decides, never the locale (\"My tickets\" x18.17 / x16.39 / x16.17)");
{
  const DS = "src/lib/display-stem.ts";
  const { DISPLAY_STEM, stemOf, leadingText } = req("../src/lib/display-stem.ts") as {
    DISPLAY_STEM: RegExp; stemOf: (n: unknown, w?: 600 | 700) => string | undefined; leadingText: (n: unknown) => string;
  };
  const { GhostText } = req("../src/components/ui/ghost-text.tsx") as { GhostText: unknown };
  const { keepText } = req("../src/components/ui/keep-run.tsx") as { keepText: (s: string, r?: string[]) => unknown };
  ok("3.1 · the straight-stem capitals: round 4's B D E F H I K L M N P R, and U (Sora 700: 0.068em of outline, measured)", String(DISPLAY_STEM) === "/^[BDEFHIKLMNPRU]/u");
  // The three tickets titles, through the module.
  const tickets = LOCALES.map((l) => [l, word(l, "journey.tabTickets"), stemOf(word(l, "journey.tabTickets"))] as const);
  ok(`3.2 · "My tickets" is set back; "Tiketi zangu" and the Chinese title are not: ${j(tickets)}`,
    tickets.find(([l]) => l === "en")?.[2] === "" && tickets.find(([l]) => l === "sw")?.[2] === undefined && tickets.find(([l]) => l === "zh")?.[2] === undefined);
  ok("3.3 · it reads a heading through what a heading is given: a run (`keepText`), a loading drawing's `GhostText`, an array, a number",
    stemOf(keepText("Mvua kubwa Dar es Salaam", [])) === "" && stemOf(h(GhostText as never, null, "My tickets")) === ""
      && stemOf(["", " ", "Bingwa"]) === "" && stemOf(2026) === undefined && stemOf(null) === undefined && leadingText(h("b", null, h("i", null, "Pochi"))) === "Pochi");
  ok("3.4 · the 600 heading asks for 600's amount; the letter still decides", stemOf("Uchaguzi Mkuu", 600) === "600" && stemOf("Yanga SC", 600) === undefined);
  // The rule, one home.
  ok("3.5 · ONE RULE in globals.css: 0.075em at 700, 0.085em at 600; the hero's groups keep their own; round 4's Tailwind utility is retired",
    /\[data-stem=""\]:where\(:not\(\.kp-hero__grp\)\) \{ text-indent: -0\.075em; \}/.test(CSS) && /\[data-stem="600"\] \{ text-indent: -0\.085em; \}/.test(CSS)
      && PLAYER_TSX.every((f) => !/data-\[stem\]:indent/.test(code(f))) && /\.kp-hero__grp\[data-stem\] \{ margin-inline-start: calc\(-1 \* var\(--hero-stem\)\); \}/.test(CSS));
  // The numbers (Sora v17, the served static instances, read with fontkit outside the repo — no font file is vendored):
  // 700's straight stems 0.082em of outline, round 4's tiles 0.0775em of ink; 600's 0.090em; U 0.068em (600: 0.076em).
  const SORA700 = { stem: 0.082, ink: 0.0775, U: 0.068, T: 0.022 }, SET700 = 0.075, SET600 = 0.085, SORA600 = 0.090;
  const en = 16 + SORA700.ink * 28, after = en - SET700 * 28;
  ok(`3.6 · "My tickets" inked from x${en.toFixed(2)} (the tile: x18.17); it inks from x${after.toFixed(2)} — on the column's x16 at 390, x${(132 + after - 16).toFixed(2)} at 1280`,
    Math.abs(en - 18.17) < 0.01 && Math.abs(after - 16) < 0.1);
  const uInk = SORA700.U - (SORA700.stem - SORA700.ink);
  ok(`3.7 · U: ${(uInk * 28).toFixed(2)}px inside at 28px before, ${((uInk - SET700) * 28).toFixed(2)}px after — a third of a pixel past the edge, where it stood 1.8px inside; 600's stem leaves ${((SORA600 - (SORA700.stem - SORA700.ink) - SET600) * 24).toFixed(2)}px at 24px`,
    Math.abs((uInk - SET700) * 28) < 0.35 && Math.abs((SORA600 - (SORA700.stem - SORA700.ink) - SET600) * 24) < 0.05);
  // Rendered: the page title in the three languages.
  const { PageHeader } = req("../src/components/ui/page-header.tsx") as { PageHeader: unknown };
  const heads = LOCALES.map((l) => [l, /<h1 data-stem=""/.test(renderToStaticMarkup(h(PageHeader as never, { title: word(l, "journey.tabTickets") } as never)))] as const);
  ok(`3.8 · RENDERED: PageHeader's h1 carries data-stem for "My tickets" only: ${j(heads)}`, j(heads) === j([["sw", false], ["en", true], ["zh", false]]));

  // THE CENSUS of display headings: the display face at 24px or more, at some width, holding words, not centred.
  const SIZE = (c: string): number => {
    const b = base(c);
    const named: Record<string, number> = { "text-title-lg": 28, "text-display-3": 36, "text-display-2": 48, "text-display-1": 64 };
    if (named[b]) return named[b];
    const m = /^text-\[([0-9.]+)px\]$/.exec(b);
    return m ? Number(m[1]) : 0;
  };
  const typeVar = (v: string) => token(v);
  const CSS_DISPLAY = new Map<string, number>();
  for (const r of RULES) {
    if (!/font-family:\s*var\(--font-display\)/.test(r.body)) continue;
    const fsz = /font-size:\s*([^;]+)/.exec(r.body)?.[1].trim() ?? "";
    const px = /^([0-9.]+)px$/.exec(fsz) ? Number(/^([0-9.]+)px$/.exec(fsz)![1]) : /^var\((--type-[\w-]+)\)$/.exec(fsz) ? typeVar(/^var\((--type-[\w-]+)\)$/.exec(fsz)![1]) : 0;
    for (const c of lastClasses(r.sel)) CSS_DISPLAY.set(c, Math.max(CSS_DISPLAY.get(c) ?? 0, px));
  }
  const OWN_RULE = new Set(["kp-hero__headline"]);   // the hero: its groups are inline and each can open a line (round 3)
  const display = (el: El) => {
    const sora = el.cls.has("font-display") || [...el.cls].some((c) => CSS_DISPLAY.has(base(c)));
    const size = Math.max(0, ...[...el.cls].map(SIZE), ...[...el.cls].map((c) => CSS_DISPLAY.get(base(c)) ?? 0));
    return sora && size >= 24;
  };
  const centred = (el: El) => {
    for (let e: El | null = el; e; e = e.parent) { if (hasCls(e, ALIGN_ANY)) return hasCls(e, T("text-center")); if (/textAlign:\s*"center"/.test(e.style)) return true; }
    return false;
  };
  const headings = (files: Array<[string, string]>) => files.flatMap(([file, src]) => parseTsx(file, src)
    .filter((el) => display(el) && (el.text || el.kids.length > 0) && !centred(el) && ![...el.cls].some((c) => OWN_RULE.has(c)))
    .map((el) => ({ file, line: el.line, tag: el.tag, stem: el.attrs.get("data-stem") ?? "", semibold: el.cls.has("font-semibold") })));
  const found = headings(FILES);
  if (process.env.R7C_LIST) for (const x of found) console.log(`  · DISPLAY ${x.file}:${x.line} <${x.tag}> ${x.stem}${x.semibold ? " (600)" : ""}`);
  const bad = found.filter((x) => !/^\{stemOf\(/.test(x.stem) || (x.semibold && !/, 600\)\}$/.test(x.stem)) || (!x.semibold && /, 600\)\}$/.test(x.stem)));
  ok(`3.9 · THE CENSUS: every display heading in player code asks the one stem question (${found.length} headings: PageHeader's h1, the market question, a proposal, the round page, the hub and its drawing, the auth panel and rail, the bet confirm's side word, the primer, /live's title, the landing's heads and claim)`,
    bad.length === 0 && found.length >= 15, j(bad));
  const cents = FILES.flatMap(([file, src]) => parseTsx(file, src).filter((el) => display(el) && el.text && centred(el)).map((el) => `${file}<${el.tag}>`)).sort();
  ok(`3.10 · the centred display headings keep their bearing (a stem's is the same on both sides): ${j(cents)}`,
    j(cents) === j(["src/app/auth/admin/page.tsx<h1>", "src/components/ui/not-found-view.tsx<h1>", "src/components/ui/route-error.tsx<h1>"]));
  const PH = "src/components/ui/page-header.tsx";
  const plant1 = headings([[PH, raw(PH).replace(" data-stem={stemOf(title)}", "")]]).filter((x) => !/^\{stemOf\(/.test(x.stem));
  ok("3.9′ PLANT · PageHeader's h1 without its question is reported", plant1.length === 1);
  const plant2 = headings([["x.tsx", `export const X = () => <h2 className="font-display text-[26px] font-bold">Mvua</h2>;`]]).filter((x) => !/^\{stemOf\(/.test(x.stem));
  ok("3.9″ PLANT · a new 26px display heading that does not ask is reported", plant2.length === 1);
  const plant3 = headings([["x.tsx", `export const X = () => <h2 data-stem={stemOf(t)} className="font-display lg:text-[24px] font-semibold">Mvua</h2>;`]]);
  ok("3.9‴ PLANT · a 600 heading asking for 700's amount is reported", plant3.length === 1 && plant3[0].semibold && !/, 600\)\}$/.test(plant3[0].stem));
  ok("3.1′ CONTROL · T is not a stem (0.022em) — set back it would hang 1.5px past the edge at 28px", !DISPLAY_STEM.test("Tiketi") && Math.abs((SORA700.T - SET700) * 28 + 1.48) < 0.01);
  ok("3.11 · the market question asks the shared module (round 4's local letters and its Tailwind utility retired)",
    has("src/app/markets/[id]/page.tsx", "<h1 data-stem={stemOf(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}") && !/QUESTION_STEM/.test(code("src/app/markets/[id]/page.tsx"))
      && /export function stemOf/.test(code(DS)));
}

/* ══ §4 · R2-D5 · EVERY SELECTION RING INSIDE ITS BOX ═══════════════════════════════════════════════════════════════════ */
section("4 · R2-D5 every selection ring is drawn inside its box (the payment tile's ring stood 1px past its column: x40 / x41, gap 11)");
{
  const PG = "src/components/wallet/provider-radio-grid.tsx";
  const ring = /<span\s+aria-hidden\s+className="(pointer-events-none absolute [^"]*ring-2[^"]*)"/.exec(code(PG))?.[1] ?? "";
  const tile = /className=\{`(group\/tile [^`$]*)/.exec(code(PG))?.[1] ?? "";
  ok("4.1 · the ring's box covers the tile's border box (`-inset-px` over its 1px border) and is drawn inward (`ring-inset`)",
    /(?:^|\s)-inset-px(?:\s|$)/.test(ring) && /(?:^|\s)ring-inset(?:\s|$)/.test(ring) && /(?:^|\s)ring-2(?:\s|$)/.test(ring) && /(?:^|\s)border(?:\s|$)/.test(tile), ring);
  const gap = /\.kp-provgrid \{[^}]*gap: var\(--sp-(\d+)\)/.exec(CSS)?.[1];
  // Before: an outer 2px ring on the padding box (1px in from the border box) spanned [edge − 1, edge + 1]: 1px outside.
  // After: a 2px inward ring on the border box spans [edge, edge + 2].
  const BORDER = 1, RING = 2;
  const before = { out: RING - BORDER }, after = { out: 0 };
  ok(`4.2 · the ring's outer edge is the tile's edge (it stood ${before.out}px outside), so the selected tile meets the column and stands ${sp(Number(gap))}px from its neighbour (it stood ${sp(Number(gap)) - before.out})`,
    after.out === 0 && sp(Number(gap)) === 12);
  const { ProviderRadioGrid } = req("../src/components/wallet/provider-radio-grid.tsx") as { ProviderRadioGrid: unknown };
  const grid = renderToStaticMarkup(h(ProviderRadioGrid as never, { providers: [{ id: "MPESA", name: "M-Pesa", hue: 0 }, { id: "AIRTEL", name: "Airtel Money", hue: 10 }], unavailableLabel: "x" } as never));
  ok("4.3 · RENDERED: both tiles draw the inward ring", (grid.match(/-inset-px rounded-md ring-2 ring-inset ring-brand-500/g) ?? []).length === 2);
  ok("4.4 · the targeted ticket's hard ring is drawn inward too; its 18% halo stays a wash outside",
    /\.ticket-target:target,\s*\.ticket-scope:has\(\.ticket-anchor:target\) \{\s*border-color: var\(--brand-400\) !important;\s*box-shadow: inset 0 0 0 1px var\(--brand-400\),\s*0 0 0 5px color-mix\(in oklab, var\(--brand-400\) 18%, transparent\),/.test(CSS));
  // The census of rings in player code: every hard ring on a selectable box is inside it, or ruled where it stands.
  const RULED: Record<string, string> = {
    "src/components/ui/chip.tsx": "`selected` draws an offset ring — admin's filter rows only; named for the integrator",
    "src/components/profile/avatar-uploader.tsx": "the crest's separation ring on its photo, not a selection",
    "src/components/ui/date-select.tsx": "today's marker inside the picker's grid, not on a column",
  };
  const rings: string[] = [];
  // Every string a player file can put in a class list (attributes, `cn()` arguments, class tables), not only attributes.
  for (const f of PLAYER_TSX) for (const m of code(f).matchAll(/"([^"\n]*)"|`([^`]*)`/g)) {
    const all = m[1] ?? m[2] ?? "";
    const cls = all.split(/\s+/).filter((c) => /^(?:[a-z-]+:)*ring-(?:1|2|4|\[[^\]]+\])$/.test(c) && !/(?:focus|focus-visible|focus-within|hover|group-hover):/.test(c));
    if (!cls.length) continue;
    rings.push(/(?:^|\s)ring-inset(?:\s|$)/.test(all) ? `inside ${f}` : RULED[f] ? `ruled ${f}` : `OUTSIDE ${f}: ${all.slice(0, 80)}`);
  }
  if (process.env.R7C_LIST) for (const r of rings) console.log(`  · RING ${r}`);
  ok(`4.5 · every hard ring in player code is inside its box or ruled (the chip's admin-only selected ring, the crest's photo ring, the picker's today): ${rings.length}`,
    rings.every((r) => !r.startsWith("OUTSIDE")), j(rings.filter((r) => r.startsWith("OUTSIDE"))));
  // The other selection marks are borders (inside by definition): the source-of-funds tiles, the quick amounts, Up & Down's stakes.
  ok("4.6 · CONTROL · the quick amounts, the source-of-funds tiles and Up & Down's stakes select with their own 1px border — inside their box",
    has("src/components/wallet/amount-field.tsx", '? "border-brand-500 bg-brand-500/15 text-brand-300"') && has("src/app/profile/source-of-funds/page.tsx", "has-[:checked]:border-brand-500")
      && has("src/components/updown/round-stake-panel.tsx", 'border: `1px solid ${on ? "var(--brand-500)" : "var(--border)"}`'));
  ok("4.1′ PLANT · the ring as it was (`inset-0`, an outer ring) is reported", !/(?:^|\s)ring-inset(?:\s|$)/.test(ring.replace(" ring-inset", "").replace("-inset-px", "inset-0")));
}

/* ══ §5 · R7-3 / R8-5 · THE STACKED FLAG ═══════════════════════════════════════════════════════════════════════════════ */
section("5 · R7-3 / R8-5 the stacked flag: a whole-pixel box (17 vs 18 rows), and the pair centred by its ink (12 above / 8.5 below)");
{
  const { STATUS_FLAG_SIZE } = req("../src/components/ui/status-flag.tsx") as { STATUS_FLAG_SIZE: Record<string, { fontSize: number; padding: string; icon: number }> };
  const xs = STATUS_FLAG_SIZE.xs;
  const [padY] = xs.padding.split(" ").map((v) => Number(v.replace("px", "")));
  const natural = Math.max(xs.icon, xs.fontSize) + 2 * padY + 2;   // the content (its 9.5px glyph), the padding, the 1px edge
  ok(`5.1 · the xs flag is ${natural}px tall as drawn (a ${xs.icon}px glyph, ${padY}px + ${padY}px, a 1px edge) — 17 or 18 rows by where its top falls`, natural === 17.5);
  ok("5.2 · `.kp-flag-xs` gives it a whole 18px box", /\.kp-flag-xs \{ height: 18px; \}/.test(CSS));
  // Where its words sit in 18px: content 10px, the 9.5 glyph row centred, the 8.5px line centred in it (JetBrains Mono's
  // 1.02 / 0.30 / 0.73 em ascent / descent / capitals, Next's metrics table).
  const CAP = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { capHeight: number; ascent: number; descent: number; unitsPerEm: number }>;
  const jb = CAP.jetBrainsMono;
  const lineTop = 1 + padY + (18 - 2 - 2 * padY - xs.icon) / 2 + (xs.icon - xs.fontSize) / 2;
  const baseline = lineTop + (xs.fontSize - (jb.ascent - jb.descent) / jb.unitsPerEm * xs.fontSize) / 2 + jb.ascent / jb.unitsPerEm * xs.fontSize;
  const capTop = baseline - jb.capHeight / jb.unitsPerEm * xs.fontSize;
  ok(`5.3 · in 18px its capitals stand ${capTop.toFixed(2)} | ${(18 - baseline).toFixed(2)} from its top and bottom — the tile's 5 | 5 everywhere it was 18`,
    Math.floor(capTop) === 5 && Math.floor(18 - baseline) === 5 && Math.abs(capTop - (18 - baseline)) < 0.2);
  // The journey's flags wear it; the classic chrome's keep theirs.
  ok("5.4 · the hub's row, the journey menu's and the journey footer's flags wear it; the classic menu's and footer's class strings are today's",
    has("src/components/journey/account/hub-row.tsx", 'size="xs" className="kp-flag-xs" />') && has("src/components/layout/avatar-menu.tsx", 'className={journey ? "ml-auto kp-flag-xs" : "ml-auto"}')
      && has("src/components/layout/public-footer.tsx", 'className={journeyShown ? "ml-1.5 kp-flag-xs" : "ml-1.5"}'));
  // THE CENTRING, from the tokens and the repo's Inter (the label's face: its capitals are centred in its line).
  const body = token("--type-body");
  const label = /\.kp-hub__label \{[^}]*font-size: var\(--type-body\);[^}]*line-height: ([0-9.]+);/.exec(CSS);
  const lh = Number(label?.[1]) * body, cap = INTER["OS/2"].capHeight / INTER.unitsPerEm;
  const air = (lh - cap * body) / 2;
  ok(`5.5 · the label's line keeps ${air.toFixed(3)}px over its capitals ((${lh} − ${body} × ${cap.toFixed(4)}) / 2) — the air the stylesheet gives the flag`,
    /\.kp-hub__head \{ --hub-flag-air: calc\(\(var\(--type-body\) \* 1\.3 - var\(--type-body\) \* 0\.7275\) \/ 2\); \}/.test(CSS) && Math.abs(cap - 0.7275) < 1e-4 && Math.abs(lh - 19.5) < 1e-9);
  const ROW = token("--h-control-xl"), PAD = sp(2), BOX = ROW - 2 * PAD, GAP = 2;
  // Before: the stacked block centred by its boxes (17.5px flag, no air).
  const b0 = (BOX - (lh + GAP + natural)) / 2;
  const beforeTop = PAD + b0 + air, beforeBottom = ROW - (PAD + b0 + lh + GAP + natural);
  ok(`5.6 · before: its ink ${beforeTop.toFixed(2)}px under the row's top and ${beforeBottom.toFixed(2)}px over its bottom — ${((beforeTop - beforeBottom) / 2).toFixed(2)}px low (the tiles: 12 | 8–9)`,
    Math.floor(beforeTop) === 12 && beforeBottom > 8 && beforeBottom < 9);
  // After: the flag carries the air above and below; the head gives it back as a negative margin.
  const H = lh + GAP + 18 + 2 * air, top = PAD + (BOX - H) / 2;
  const afterTop = top + air, afterBottom = ROW - (top + lh + GAP + air + 18);
  ok(`5.7 · after: ${afterTop.toFixed(2)} | ${afterBottom.toFixed(2)} — centred by its ink, and the row stays ${ROW}px (the head's ${(H - 2 * air).toFixed(1)}px within the ${BOX}px between its padding)`,
    Math.abs(afterTop - afterBottom) < 1e-9 && H - 2 * air <= BOX);
  // Beside its label (one line) nothing moves: the air is the same on both sides.
  const one0 = { label: PAD + (BOX - lh) / 2, flag: PAD + (BOX - lh) / 2 + (lh - natural) / 2 };
  const H1 = Math.max(lh, 18 + 2 * air), head1 = PAD + (BOX - (H1 - 2 * air)) / 2 - air;
  const one1 = { label: head1 + (H1 - lh) / 2, flag: head1 + air };
  ok(`5.8 · beside its label nothing moves: the label at ${one1.label.toFixed(2)} (was ${one0.label.toFixed(2)}), the flag at ${one1.flag.toFixed(2)} (its 18px box centred, was ${one0.flag.toFixed(2)} at 17.5)`,
    Math.abs(one1.label - one0.label) < 1e-9 && Math.abs(one1.flag - (PAD + (BOX - 18) / 2)) < 1e-9);
  ok("5.9 · the head returns the air only as its text's one line, and the flag takes it only there",
    /\.kp-hub__head:only-child \{ margin-block: calc\(-1 \* var\(--hub-flag-air\)\); \}/.test(CSS) && /\.kp-hub__head:only-child > \.kp-flag-xs \{ margin-block: var\(--hub-flag-air\); \}/.test(CSS));
  // Rendered: the proposals row, coming soon.
  const { HubRowItem } = req("../src/components/journey/account/hub-row.tsx") as { HubRowItem: unknown };
  const viewer = { signedIn: true, userId: "u", name: "Jina", initials: "J", phone: "+255••••78", balance: 0, walletHeld: false, kycOffered: false,
    agentInStanding: false, proposalsState: "COMING_SOON", doors: {}, breakEnd: null };
  const rowSw = renderToStaticMarkup(h(HubRowItem as never, { row: { id: "proposals", kind: "link", href: "/proposals", label: "proposals.title", glyph: "sparkle", extra: "proposals" }, t: dict.sw, viewer, locale: "sw" } as never));
  ok("5.10 · RENDERED: the row's text holds the head alone, and the head holds the label and the 18px flag",
    // The label may hold R7-A's kept connective ("Mapendekezo <span class=…>ya </span>Masoko", lib/connectives.ts).
    /<span class="kp-hub__text"><span class="kp-hub__head"><span class="kp-hub__label">(?:[^<]|<span[^>]*>[^<]*<\/span>)*<\/span><span class="[^"]*cs-badge kp-flag-xs"/.test(rowSw), rowSw.slice(0, 400));
  const noAir = CSS.replace(/\.kp-hub__head:only-child > \.kp-flag-xs \{ margin-block: var\(--hub-flag-air\); \}/, "");
  ok("5.7′ PLANT · without the flag's air the ink is 2px low again", !/\.kp-hub__head:only-child > \.kp-flag-xs/.test(noAir) && (beforeTop - beforeBottom) / 2 > 2);
  ok("5.2′ PLANT · without the whole-pixel box the flag is 17.5px again", natural % 1 !== 0 && !/\.kp-flag-xs \{ height: 18px; \}/.test(CSS.replace(".kp-flag-xs { height: 18px; }", "")));
}

/* ══ §6 · COMPOSITION ONLY, AND THE CLASSIC CHROME'S ARMS ════════════════════════════════════════════════════════════════ */
section("6 · composition only: the dictionary is the tip's, byte for byte; the classic arms of the shared chrome are today's");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { head = "‹git unavailable›"; }
  ok("6.1 · src/lib/i18n-dict.ts is the commit's own (every word above is an existing key)", head === raw("src/lib/i18n-dict.ts"));
  const frozen = ["src/components/layout/top-app-bar.tsx", "src/components/layout/bottom-nav.tsx", "src/components/layout/live-ticker.tsx", "src/components/layout/nav-more.tsx", "src/components/layout/notifications-panel.tsx", "src/components/layout/wallet-balance-pill.tsx"];
  const changed = frozen.filter((f) => {
    let was = "";
    try { was = execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { was = "‹git unavailable›"; }
    return was !== raw(f);
  });
  ok("6.2 · the classic header, rail, ticker, More menu, bell and capsule are the commit's own, byte for byte", changed.length === 0, j(changed));
  // The two shared files this round touched carry the journey's class in the journey arm only.
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: unknown };
  const props = { proposalsState: "COMING_SOON", agentDoorVisible: true, inviteVisible: true, supportEmail: "d@x.t", supportPhone: "0", supportPhoneTel: "+0" };
  const classic = inLocale("sw", h(PublicFooter as never, props as never)), journey = inLocale("sw", h(PublicFooter as never, { ...props, journeyShown: true } as never));
  ok("6.3 · RENDERED: the classic footer's flag is today's (no `kp-flag-xs`); the journey's wears it", !classic.includes("kp-flag-xs") && journey.includes("kp-flag-xs") && classic.includes("cs-badge ml-1.5"));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
