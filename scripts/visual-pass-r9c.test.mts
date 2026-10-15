/**
 * ROUND 9 OF THE VISUAL PASS, FIXER C (2026-10-11, ALI-BLADE15) — components: the winner stands highest, like things are
 * drawn alike, nothing points at an empty lens. The S6 close-out read (rounds 7 + 8 live, 333 tiles) found these; each is
 * re-measured here, fixed with every sibling it has, and held beside a control or a plant that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r9c.test.mts        (npm run test:visual-pass-r9c)
 *
 *   §1  C1 · R5-F1  the podium's #1 raised by layout, where no keyframe writes — and THE CENSUS: no element that wears an
 *               entrance writing `transform` (its own class, or a parent's `> *` rule) carries a transform of its own
 *               (a utility, an inline style, a stylesheet rule in any state); the three siblings it found, fixed
 *   §2  C2 · R5-F5  every pager's dots equally spaced, the pill growing in place, round, on the ladder — the two carousels,
 *               their loading drawings and the first-visit primer's step dots
 *   §3  C3 · R5-F4  the invite dial's caption in the one section ink — and the WRAPPER CENSUS R8-B could not see into: every
 *               component that renders an `.eyebrow` with a class its caller passes, every call site, every inked child
 *   §4  C4 · R3-D1 / R6-D1  the journey rail stacks from the top only where a label wraps: each language's width, derived
 *   §5  C5 · R7-F2 / R8-F3  the stacked INAKUJA flag lands on a whole pixel, so its caps sit as the beside-its-label flag's
 *   §6  C6 · R4-F2  the guest Tiketi sheet's Ingia is the ghost secondary, `btn-outline` retired
 *   §7  C7 · R4-D8  the wallet's Bonus lens offered only to an account that has a bonus row (or while it is on)
 *   §8  the record: no dictionary word changed; the classic chrome's files are the commit's own
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r9/c/mutation-r9c.py
 * (S = the session scratchpad): each defect planted on disk, caught on its named check, every file restored byte-identical.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import postcss from "postcss";
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
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});
/** The player's code: the admin console, the server's artefacts and the campaign tooling are out of the visual pass. */
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const ALL_TSX = walk("src", /\.tsx$/);
const PLAYER_TSX = ALL_TSX.filter((f) => !OUT.test(f));
const GLOBALS = "src/app/globals.css";
const CSS = decommentCss(raw(GLOBALS));
const SHEETS = walk("src", /\.css$/);
const HEAD = (p: string) => { try { return execFileSync("git", ["show", `HEAD:${p}`], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { return "‹git unavailable›"; } };

/* ── the scales: this repo's overridden Tailwind spacing, the CSS tokens ─────────────────────────────────────────────── */
const TW = raw("tailwind.config.ts");
const tw = (k: string) => Number(new RegExp(`"${k.replace(".", "\\.")}":\\s*"([0-9.]+)px"`).exec(TW)?.[1] ?? NaN);
const token = (name: string, css = CSS) => Number(new RegExp(`${name}:\\s*([0-9.]+)px`).exec(css)?.[1] ?? NaN);

/* ── React, for the parts drawn here ─────────────────────────────────────────────────────────────────────────────────── */
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
type Dict = Record<string, Record<string, unknown>>;
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Dict> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inLocale = (l: Loc, path: string, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l }, el as never))));
const word = (l: Loc, p: string) => String(p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), dict[l]) ?? `‹no ${p}›`);

/* ══ THE AST READER (round 8's, with each element's children and attributes) ════════════════════════════════════════ */
type Consts = Map<string, ts.Expression>;
/** Every class string an expression can produce: each branch of a condition, a constant (this file's, or one imported by
 *  name from `src`), a property of a constant object. What cannot be resolved is kept as a ‹placeholder›, never dropped. */
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
  if (ts.isIdentifier(n)) { const c = consts.get(n.text); return c && !object(n) ? strs(c, consts, depth + 1) : [`‹${n.text}›`]; }
  if (ts.isPropertyAccessExpression(n)) {
    const o = object(n.expression);
    const p = o?.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText() === n.name.text) as ts.PropertyAssignment | undefined;
    return p ? strs(p.initializer, consts, depth + 1) : [`‹${n.getText()}›`];
  }
  if (ts.isElementAccessExpression(n)) {
    const o = object(n.expression);
    return o ? o.properties.flatMap((q) => (ts.isPropertyAssignment(q) ? strs(q.initializer, consts, depth + 1) : [])) : [`‹${n.getText()}›`];
  }
  if (ts.isJsxExpression(n)) return strs(n.expression, consts, depth + 1);
  return [];
}
function constsOf(file: string, src: string): Consts {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const consts: Consts = new Map();
  sf.forEachChild(function v(n: ts.Node) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) consts.set(n.name.text, n.initializer);
    n.forEachChild(v);
  });
  return consts;
}
type El = {
  file: string; line: number; tag: string; cls: string[]; clsSrc: string; style: string; attrs: Map<string, ts.JsxAttribute>;
  parent: El | null; kids: El[]; node: ts.JsxElement | ts.JsxSelfClosingElement; text: string; fn: string | null;
};
const parseCache = new Map<string, El[]>();
/** Every JSX element of one source, with its parent and children inside its own component, its class tokens (every
 *  branch), its inline style and the component it is written in. */
function parse(file: string, src: string = raw(file)): El[] {
  const key = `${file}\u0000${src.length}\u0000${src.slice(0, 64)}${src.slice(-64)}`;
  const hit = parseCache.get(key);
  if (hit && src === raw(file)) return hit;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const consts = constsOf(file, src);
  const out: El[] = [];
  const fnName = (n: ts.Node): string | null => {
    for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
      if (ts.isFunctionDeclaration(p) && p.name) return p.name.text;
      if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
    }
    return null;
  };
  const visit = (n: ts.Node, parent: El | null) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const attrs = new Map<string, ts.JsxAttribute>();
      for (const p of open.attributes.properties) if (ts.isJsxAttribute(p)) attrs.set(p.name.getText(sf), p);
      const cA = attrs.get("className"), sA = attrs.get("style");
      const el: El = {
        file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, tag: open.tagName.getText(sf),
        cls: (cA?.initializer ? strs(cA.initializer, consts) : []).flatMap((s) => s.split(/\s+/)).filter(Boolean),
        clsSrc: cA?.initializer ? squash(cA.initializer.getText(sf)) : "",
        style: sA?.initializer ? squash(sA.initializer.getText(sf)) : "", attrs, parent, kids: [], node: n,
        text: ts.isJsxElement(n) ? squash(n.children.map((c) => c.getText(sf)).join("")).trim() : "", fn: fnName(n),
      };
      out.push(el);
      if (parent) parent.kids.push(el);
      if (ts.isJsxElement(n)) for (const c of n.children) visit(c, el);
      for (const p of open.attributes.properties) if (ts.isJsxAttribute(p) && p.initializer && ts.isJsxExpression(p.initializer)) p.initializer.forEachChild((k) => visit(k, null));
      return;
    }
    if (ts.isJsxFragment(n)) { n.children.forEach((c) => visit(c, parent)); return; }
    n.forEachChild((k) => visit(k, parent));
  };
  sf.forEachChild((n) => visit(n, null));
  if (src === raw(file)) parseCache.set(key, out);
  return out;
}

/* ══ §1 · C1 · THE PODIUM, AND EVERY TRANSFORM UNDER AN ENTRANCE ═══════════════════════════════════════════════════════ */
section("1 · C1 the podium's #1 stands 16px above #2/#3 by layout — and no element's own transform sits under an entrance that writes `transform`");

/* ── the stylesheets, read with PostCSS: keyframes, animation rules, transform rules ───────────────────────────────── */
type Sheet = { name: string; css: string };
/** Every stylesheet of `src` and every inline `<style>{`…`}</style>` block in a component (`test:dead-css`'s corpus). */
function sheetsOf(over: Record<string, string> = {}): Sheet[] {
  const out: Sheet[] = SHEETS.map((f) => ({ name: f, css: over[f] ?? raw(f) }));
  for (const f of ALL_TSX) {
    const src = over[f] ?? raw(f);
    for (const m of src.matchAll(/<style[^>]*>\{`([\s\S]*?)`\}<\/style>/g)) out.push({ name: `${f}#style`, css: m[1] });
  }
  return out;
}
const PSEUDO_ELEMENT = /::|:(?:before|after|placeholder|marker|selection|first-letter|first-line|backdrop)\b/;
/** A selector cut into its compounds and the combinators between them, at the top level only (`:not(…)` stays whole). */
function compounds(sel: string): Array<{ text: string; comb: string }> {
  const out: Array<{ text: string; comb: string }> = [];
  let depth = 0, cur = "", comb = "";
  const flush = () => { if (cur.trim()) out.push({ text: cur.trim(), comb }); cur = ""; };
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (depth === 0 && (c === ">" || c === "+" || c === "~")) { flush(); comb = c; continue; }
    if (depth === 0 && /\s/.test(c)) { if (cur.trim()) { flush(); comb = " "; } continue; }
    cur += c;
  }
  flush();
  return out;
}
/** The classes a compound REQUIRES (those inside `:not(…)`/`:has(…)`/`:is(…)`/`:where(…)` are conditions, not the subject). */
const classesOf = (compound: string) => [...compound.replace(/:(?:not|has|is|where)\((?:[^()]|\([^()]*\))*\)/g, "").matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
/** The four properties that place a box: `transform` and its three independent parts. */
const PLACEMENT = ["transform", "translate", "rotate", "scale"] as const;
type Prop = (typeof PLACEMENT)[number];
type Anim = { sheet: string; sel: string; subject: string[]; parent: string[] | null; kfs: string[]; fill: string; infinite: boolean; rule: postcss.Rule };
type Xform = { sheet: string; sel: string; subject: string[]; prop: Prop; value: string; rule: postcss.Rule };
type Read = { kfFrames: Map<string, Array<{ key: string; decls: Map<string, string> }>>; anims: Anim[]; xforms: Xform[] };
/** The placement properties a keyframe writes in any frame. */
const kfProps = (R: Read, name: string) => new Set<Prop>(PLACEMENT.filter((p) => (R.kfFrames.get(name) ?? []).some((f) => f.decls.has(p))));
const animProps = (R: Read, kfs: string[]) => new Set<Prop>(kfs.flatMap((k) => [...kfProps(R, k)]));
/** A rule the motion gates switch off — reduced motion, the low-end tiers — states what holds when no animation runs. */
const motionOff = (r: postcss.Rule, sel: string) => {
  for (let p = r.parent; p; p = p.parent) if (p.type === "atrule" && /prefers-reduced-motion:\s*reduce/.test((p as postcss.AtRule).params)) return true;
  return /kp-reduce-motion|\[data-motion/.test(sel);
};
function readSheets(sheets: Sheet[]): Read {
  const kfFrames: Read["kfFrames"] = new Map();
  const roots = sheets.map((s) => ({ s, root: postcss.parse(s.css, { from: s.name }) }));
  for (const { root } of roots) root.walkAtRules(/keyframes$/, (a) => {
    // A reduced-motion redefinition of a keyframe is the calm branch's; the running animation is the one outside it.
    for (let p = a.parent; p; p = p.parent) if (p.type === "atrule" && /prefers-reduced-motion:\s*reduce/.test((p as postcss.AtRule).params)) return;
    const frames: Array<{ key: string; decls: Map<string, string> }> = [];
    a.walkRules((r) => { const d = new Map<string, string>(); r.walkDecls((x) => { d.set(x.prop, x.value); }); frames.push({ key: r.selector, decls: d }); });
    kfFrames.set(a.params.trim(), [...(kfFrames.get(a.params.trim()) ?? []), ...frames]);
  });
  const anims: Anim[] = [], xforms: Xform[] = [];
  for (const { s, root } of roots) root.walkRules((r) => {
    for (let p = r.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/.test((p as postcss.AtRule).name)) return;
    const decls = new Map<string, string>();
    r.walkDecls((d) => { if (d.parent === r) decls.set(d.prop, d.value); });
    const anim = decls.get("animation") ?? decls.get("animation-name");
    for (const sel of r.selectors) {
      if (motionOff(r, sel)) continue;
      const cs = compounds(sel);
      const subj = cs[cs.length - 1];
      if (!subj || PSEUDO_ELEMENT.test(subj.text)) continue;
      const subject = classesOf(subj.text);
      const parent = subj.comb === ">" && cs.length > 1 ? classesOf(cs[cs.length - 2].text) : null;
      if (anim && !/^\s*none\b/.test(anim)) {
        const kfs = anim.split(/[\s,]+/).filter((w) => kfFrames.has(w));
        const fill = /\bboth\b/.test(anim) ? "both" : /\bforwards\b/.test(anim) ? "forwards" : /\bbackwards\b/.test(anim) ? "backwards" : "none";
        if (kfs.length) anims.push({ sheet: s.name, sel, subject, parent, kfs, fill, infinite: /\binfinite\b/.test(anim), rule: r });
      }
      for (const prop of PLACEMENT) {
        const v = decls.get(prop);
        if (v !== undefined && v.trim() !== "none") xforms.push({ sheet: s.name, sel, subject, prop, value: v.trim(), rule: r });
      }
    }
  });
  return { kfFrames, anims, xforms };
}
/** A utility that writes `transform` (Tailwind 3: every translate, rotate, scale and skew utility, in any variant). */
const TW_TRANSFORM = /^(?:[\w-]+:|\[[^\]]*\]:)*!?-?(?:translate-[xy]-|rotate-|scale-|skew-[xy]-|transform$|transform-(?:gpu|cpu)$|\[(?:transform|translate|rotate|scale):)/;
const INLINE_ANIMATION = /(?:^|[{,\s])animation(?:Name)?\s*:\s*["'`]([^"'`]+)["'`]/;
/** The root elements a function component returns (every `return <…>` of its own body), read from the file it lives in. */
function rootsOf(name: string, file: string, src: string): El[] {
  const els = parse(file, src);
  return els.filter((e) => e.fn === name && e.parent === null && (() => {
    for (let p: ts.Node | undefined = e.node.parent; p; p = p.parent) {
      if (ts.isReturnStatement(p) || ts.isArrowFunction(p)) return true;
      if (ts.isJsxAttribute(p)) return false;
    }
    return false;
  })());
}
/** Where a capitalised tag's component is defined: this file, or the `@/` module it is imported from by name. */
function definitionOf(tag: string, file: string, srcOf: (f: string) => string): string | null {
  const src = srcOf(file);
  if (new RegExp(`function ${tag}\\b`).test(src)) return file;
  const m = new RegExp(`import\\s*\\{[^}]*\\b${tag}\\b[^}]*\\}\\s*from\\s*["']@/([^"']+)["']`).exec(src);
  if (!m) return null;
  return [`src/${m[1]}.tsx`, `src/${m[1]}.ts`, `src/${m[1]}/index.tsx`].find((p) => { try { return statSync(p).isFile(); } catch { return false; } }) ?? null;
}
/** An un-prefixed translate utility as its CSS length: `-translate-x-1/2` → x −50%, `translate-y-full` → y 100%. */
function utilityTranslate(cls: string[]): { x: string; y: string } | null {
  let x = "0", y = "0", any = false;
  for (const c of cls) {
    const m = /^(-?)translate-([xy])-(1\/2|full|\d+(?:\.\d+)?)$/.exec(c);
    if (!m) continue;
    any = true;
    const v = m[3] === "1/2" ? "50%" : m[3] === "full" ? "100%" : `${tw(m[3])}px`;
    const signed = m[1] ? `-${v}` : v;
    if (m[2] === "x") x = signed; else y = signed;
  }
  return any ? { x, y } : null;
}
type Hit = { at: string; anim: string; own: string[] };
/** An entrance whose keyframes CARRY the element's own placement in every frame is not a conflict: the frames say it.
 *  The general form is checked from the frames (`utilityTranslate`); a placement that holds only from a width is named. */
const CARRIED: Array<{ file: string; cls: string; why: string; verify: (r: Read) => boolean }> = [
  { file: "src/components/layout/needle-drawer.tsx", cls: "needle-sheet",
    why: "the needle sheet centres from 640 (`sm:-translate-x-1/2 sm:-translate-y-1/2`), and from 640 its pop and sink carry `translate(-50%, -50%)` in every frame",
    verify: (r) => ["needle-sheet-pop", "needle-sheet-sink"].every((k) => (r.kfFrames.get(k) ?? []).length >= 2
      && (r.kfFrames.get(k) ?? []).every((f) => (f.decls.get("transform") ?? "").startsWith("translate(-50%, -50%)"))) },
];
/** An animation class a component ADDS AT RUNTIME (`classList.add`) — invisible to a class census — and the classes of the
 *  element it lands on. Every runtime-added animation class in `src` must be named here (1.9). */
const RUNTIME: Array<{ file: string; cls: string; on: string[]; also?: string[][]; why: string }> = [
  { file: "src/components/markets/market-card.tsx", cls: "press-pop", on: ["btn"], why: "a card's YES / NO button calls playPressPop on tap; the helper plays captured kit frames without retaining a React-owned class" },
  { file: "src/components/journey/bet-sheet/bet-sheet-host.tsx", cls: "press-pop", on: ["btn"], also: [["kp-jcard__pick"]], why: "S8's delegated click calls that same helper on the actual kit btn or card pick before opening the sheet" },
  { file: "src/components/journey/bet-sheet/guest-sheet-host.tsx", cls: "press-pop", on: ["btn"], also: [["kp-jcard__pick"]], why: "the public guest sheet uses the same delegated pick feedback before opening its sign-in frame" },
  { file: "src/components/ui/route-transition.tsx", cls: "route-enter", on: ["route-enter"], why: "the route frame re-arms its own entrance" },
  { file: "src/components/layout/needle.tsx", cls: "on", on: [], why: "the needle's wake halo breathes while it is awake (`#needle-root #wake.on`; the halo is placed by `inset`)" },
];
const PRESS_HELPER = "src/lib/press-feedback.ts";
/** Follow the exact helper import, including named aliases/namespaces. A new caller must have its element profile
 * registered above; an unresolved or unused helper import is reported, never silently dropped from the census. */
function pressCaller(f: string, text: string): string[] {
  const ast = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set<string>(), namespaces = new Set<string>(); let imported = false, called = false;
  for (const node of ast.statements) if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@/lib/press-feedback") {
    imported = true;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const spec of bindings.elements) if ((spec.propertyName ?? spec.name).text === "playPressPop") names.add(spec.name.text);
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
  }
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const e = node.expression;
      if (ts.isIdentifier(e) && names.has(e.text) || ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && namespaces.has(e.expression.text) && e.name.text === "playPressPop") called = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return called ? [`${f}#press-pop`] : imported ? [`${f}#‹unresolved press helper caller›`] : [];
}
/** Run the actual shared helper against stylesheet-animation/platform seams: capture timing/frames, remove the
 * temporary class before WAAPI, cancel a repeated tap, and leave no class even where browser APIs throw. */
async function pressHelperHolds(text: string): Promise<boolean> {
  try {
    const frames = [{ offset: 0, scale: "1" }, { offset: 0.5, scale: "0.955" }, { offset: 1, scale: "1" }], timing = { duration: 160, fill: "none" };
    class SheetAnimation { animationName = "press-pop"; effect = { getKeyframes: () => frames, getTiming: () => timing }; }
    const compiled = ts.transpile(text.replace(/\bexport\s+/g, ""), { target: ts.ScriptTarget.ES2020 });
    const observers = new Set<{ callback: () => void }>(), mediaListeners = new Set<() => void>();
    let dataMotion = "full"; const rootClasses = new Set<string>();
    const root = { classList: { contains: (name: string) => rootClasses.has(name) }, getAttribute: () => dataMotion };
    const media = { matches: false, addEventListener: (_name: string, callback: () => void) => mediaListeners.add(callback), removeEventListener: (_name: string, callback: () => void) => mediaListeners.delete(callback) };
    let observedCorrectly = true;
    class Observer {
      constructor(public callback: () => void) {}
      observe(node: unknown, options: { attributes: boolean; attributeFilter: string[] }) { observedCorrectly &&= node === root && options.attributes && options.attributeFilter.join() === "class,data-motion"; observers.add(this); }
      disconnect() { observers.delete(this); }
    }
    const play = new Function("CSSAnimation", "MutationObserver", `${compiled}\nreturn playPressPop;`)(SheetAnimation, Observer) as (el: unknown) => void;
    const classes = new Set<string>(); let cancelled = 0, played = 0, captured = true, throws = false;
    const animations: Array<{ finish: () => void; cancel: () => void }> = [];
    const el = {
      classList: { add: (cls: string) => classes.add(cls), remove: (cls: string) => classes.delete(cls) },
      getAnimations: () => { if (throws) throw new Error("unsupported"); return [new SheetAnimation()]; },
      ownerDocument: { documentElement: root, defaultView: { matchMedia: () => media } },
      animate: (f: unknown, t: unknown) => {
        captured &&= f === frames && t === timing && classes.size === 0; played++;
        let resolve = () => {}, done = false;
        const finished = new Promise<void>(r => { resolve = r; });
        const animation = { finished, finish: () => { done = true; resolve(); }, cancel: () => { if (!done) { cancelled++; done = true; resolve(); } } };
        animations.push(animation); return animation;
      },
    };
    const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
    const mutate = () => { for (const observer of observers) observer.callback(); };
    play(el); play(el); await flush();
    const repeated = played === 2 && cancelled === 1 && observers.size === 1 && mediaListeners.size === 1;
    dataMotion = "reduced"; mutate(); for (const callback of mediaListeners) callback();
    const throttleKept = cancelled === 1;
    play(el); await flush(); // A prior finished callback must not delete the newly active WeakMap entry.
    const thirdReplaced = played === 3 && cancelled === 2 && observers.size === 1 && mediaListeners.size === 1;
    rootClasses.add("kp-reduce-motion"); mutate(); await flush();
    const classStopped = cancelled === 3 && observers.size === 0 && mediaListeners.size === 0;
    rootClasses.clear(); dataMotion = "full"; play(el); media.matches = true; for (const callback of mediaListeners) callback(); await flush();
    const systemStopped = cancelled === 4 && observers.size === 0 && mediaListeners.size === 0;
    media.matches = false; play(el); dataMotion = "minimal"; mutate(); await flush();
    const minimalStopped = cancelled === 5 && observers.size === 0 && mediaListeners.size === 0;
    dataMotion = "full"; play(el); animations.at(-1)!.finish(); await flush();
    const finishedClean = observers.size === 0 && mediaListeners.size === 0;
    play(el); const oldCancelled = cancelled; throws = true; play(el); await flush();
    return repeated && throttleKept && thirdReplaced && classStopped && systemStopped && minimalStopped && finishedClean
      && cancelled === oldCancelled + 1 && captured && observedCorrectly && classes.size === 0 && observers.size === 0 && mediaListeners.size === 0
      && !/\b(?:setTimeout|requestAnimationFrame)\(/.test(text);
  } catch { return false; }
}
/** THE CENSUS — every element that wears an animation writing a placement property, against its own placements. */
function census(over: Record<string, string> = {}): { hits: Hit[]; animated: number; carried: string[] } {
  const R = readSheets(sheetsOf(over));
  const srcOf = (f: string) => over[f] ?? raw(f);
  const placing = R.anims.filter((a) => animProps(R, a.kfs).size > 0);
  const own = (el: { cls: string[]; style: string }, viaRule: postcss.Rule | null) => {
    const out: Array<{ prop: Prop; what: string }> = [];
    for (const c of el.cls) if (TW_TRANSFORM.test(c)) out.push({ prop: "transform", what: `utility ${c}` });
    for (const m of el.style.matchAll(/(?:^|[{,\s])(transform|translate|rotate|scale)\s*:/g)) out.push({ prop: m[1] as Prop, what: `inline ${m[1]}` });
    for (const x of R.xforms) {
      if (x.rule === viaRule) continue;   // declared with the animation itself: the keyframe's own subject (a countdown's bar)
      if (x.subject.length && x.subject.every((c) => el.cls.includes(c))) out.push({ prop: x.prop, what: `${x.sheet.replace(/^src\//, "")} ${x.sel} { ${x.prop}: ${x.value} }` });
    }
    return out;
  };
  const hits: Hit[] = [], carried = new Set<string>();
  let animated = 0;
  const judge = (el: { file: string; cls: string[]; style: string }, kfs: string[], label: string, viaRule: postcss.Rule | null, at: string) => {
    animated++;
    const props = animProps(R, kfs);
    const clash = own(el, viaRule).filter((o) => props.has(o.prop));
    if (!clash.length) return;
    const named = CARRIED.find((k) => el.file === k.file && el.cls.includes(k.cls));
    if (named && named.verify(R)) { carried.add(`${at} (${named.why})`); return; }
    const t = utilityTranslate(el.cls);
    const framesCarry = !!t && clash.every((o) => o.what.startsWith("utility ") && /translate-[xy]-/.test(o.what))
      && kfs.every((k) => (R.kfFrames.get(k) ?? []).filter((f) => f.decls.has("transform")).every((f) => (f.decls.get("transform") ?? "").replace(/\s+/g, " ").startsWith(`translate(${t.x}, ${t.y})`)));
    if (framesCarry) { carried.add(`${at} (every frame of ${kfs.join(", ")} carries translate(${t!.x}, ${t!.y}))`); return; }
    hits.push({ at, anim: label, own: clash.map((o) => o.what) });
  };
  for (const f of ALL_TSX) {
    const src = srcOf(f);
    if (!/className|style=/.test(src)) continue;
    for (const el of parse(f, src)) {
      const at = `${f}:${el.line} <${el.tag}>`;
      // the element's own animation: a class rule with no parent condition, or an inline `animation` naming a keyframe
      for (const a of placing) if (!a.parent && a.subject.length && a.subject.every((c) => el.cls.includes(c))) judge(el, a.kfs, `${a.kfs.join(",")} ${a.infinite ? "infinite" : a.fill} via ${a.sel}`, a.rule, at);
      const inl = INLINE_ANIMATION.exec(el.style);
      if (inl) {
        const kfs = inl[1].split(/[\s,]+/).filter((w) => animProps(R, [w]).size > 0);
        if (kfs.length) judge({ ...el, style: el.style.replace(INLINE_ANIMATION, "") }, kfs, `${kfs.join(",")} (inline)`, null, at);
      }
      // a parent's `.P > *` rule reaches this element — or, for a component, the element(s) it returns
      for (const a of placing) {
        if (!a.parent || !el.parent || !a.parent.every((c) => el.parent!.cls.includes(c))) continue;
        if (/^[A-Z]/.test(el.tag) && !el.tag.includes(".")) {
          const def = definitionOf(el.tag, f, srcOf);
          for (const root of def ? rootsOf(el.tag, def, srcOf(def)) : []) {
            if (a.subject.every((c) => root.cls.includes(c))) judge(root, a.kfs, `${a.kfs.join(",")} ${a.fill} via ${a.sel}`, a.rule, `${at} → ${def}:${root.line} <${root.tag}>`);
          }
        } else if (a.subject.every((c) => el.cls.includes(c))) judge(el, a.kfs, `${a.kfs.join(",")} ${a.fill} via ${a.sel}`, a.rule, at);
      }
    }
  }
  // the classes code adds at runtime, judged on the element they land on
  for (const r of RUNTIME) for (const on of [r.on, ...(r.also ?? [])]) for (const a of placing) {
    if (!a.parent && a.subject.length && a.subject.every((c) => [r.cls, ...on].includes(c)) && a.subject.includes(r.cls)) {
      judge({ file: r.file, cls: [r.cls, ...on], style: "" }, a.kfs, `${a.kfs.join(",")} ${a.fill} via ${a.sel} (added at runtime)`, a.rule, `${r.file} <${on.join(".") || "el"}> + ${r.cls} (${r.why})`);
    }
  }
  return { hits, animated, carried: [...carried] };
}
const NOW = census();
const show = (hs: Hit[]) => hs.map((x) => `${x.at} [${x.anim}] ${x.own.join(" | ")}`);
ok(`1.1 · THE CENSUS: of the ${NOW.animated} animations (any fill, infinite ones, runtime-added) on elements whose keyframes write a placement property, none meets a placement of the element's own in the SAME property (a utility in any variant, an inline style, a stylesheet rule in any state) — ${NOW.carried.length} carry their own placement in every frame: ${NOW.carried.map((c) => c.replace(/ \(.*$/, "")).join(" · ")}`,
  NOW.animated >= 40 && NOW.hits.length === 0 && NOW.carried.length === 2, j({ hits: show(NOW.hits), carried: NOW.carried }));
{
  const LB = "src/app/leaderboard/page.tsx";
  const els = parse(LB).filter((e) => e.fn === "Podium");
  const col = els.find((e) => e.cls.includes("kp-rise"));
  const grid = els.find((e) => e.cls.includes("grid-cols-3"));
  ok("1.2 · the podium's column carries its raise as LAYOUT: #1 `-mt-3`, #2/#3 `mt-1.5`, no transform utility on any branch; the grid hangs its columns from the top (`items-start`)",
    !!col && col.cls.includes("-mt-3") && col.cls.includes("mt-1.5") && !col.cls.some((c) => TW_TRANSFORM.test(c))
      && !!grid && grid.cls.includes("items-start") && !grid.cls.includes("items-end"), j({ col: col?.cls, grid: grid?.cls }));
  // THE NUMBERS. Above the name every column is: the crown or its 22px spacer (+ mb-1), the crest in its 3px ring
  // (`Avatar` xl for #1, lg for #2/#3), then mt-2. Below the name nothing reaches back up: the columns hang from the top.
  const sizes = Object.fromEntries([...(/const sizePx: Record<Size, number> = \{([^}]*)\}/.exec(raw("src/components/ui/avatar.tsx"))?.[1] ?? "").matchAll(/"?(\w+)"?:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
  const crownRow = 22 + tw("1"), ring = 2 * 3, nameGap = tw("2");
  const top1 = -tw("3"), top23 = tw("1.5");
  const name1 = top1 + crownRow + sizes.xl + ring + nameGap, name23 = top23 + crownRow + sizes.lg + ring + nameGap;
  const crest1 = top1 + crownRow + sizes.xl + ring, crest23 = top23 + crownRow + sizes.lg + ring;
  ok(`1.3 · at EVERY width #1's name row stands ${name23 - name1}px above #2's and #3's (${name1} against ${name23} from the grid's top), its crest's foot ${crest23 - crest1}px and its crown ${top23 - top1}px above their spacer — a chip or a wrapped handle below a name moves nothing above it`,
    sizes.xl === 56 && sizes.lg === 48 && name23 - name1 === 16 && crest23 - crest1 === 16 && top23 - top1 === 24, j({ sizes, name1, name23 }));
  // Tile 178 (1280, sw): the panel's top border y478, its content y511 (+1 +32). Before: bottom-aligned, the winner's name
  // y631 against y604 (27px LOW: its 8px larger crest, less the chip row's 4 + 23 it lacks). After, from the top:
  const content = 478 + 1 + tw("6");
  const after = { name1: content + name1, name23: content + name23, crown1: content + top1, spacer23: content + top23 };
  ok(`1.4 · tile 178 re-predicted (1280, sw): #1's name row y${after.name1} (was y631), #2/#3's y${after.name23} (was y604) — #1 16px ABOVE where it stood 27px below; #1's crown box y${after.crown1}–${after.crown1 + 22} inside the panel's 32px top padding, as A10's \`pt-6\` was set for; CONFIRM IN BROWSER (/leaderboard, 1280 and 390: the podium names' tops differ by 16, #1 higher)`,
    content === 511 && after.name1 === 595 && after.name23 === 611 && after.crown1 === 495);
  // The premise the census rests on, as a CONTROL: kp-rise does write `transform` and does fill `both`.
  const R = readSheets(sheetsOf());
  const rise = R.anims.find((a) => a.sel === ".kp-rise");
  ok("1.5 · CONTROL · `.kp-rise` fills `both` with keyframes that write `transform` (why a static `-translate-y-3` lost), and no keyframe anywhere writes `margin-top` (where the raise lives now)",
    !!rise && rise.fill === "both" && kfProps(R, "kp-rise").has("transform")
      && [...R.kfFrames.values()].every((fs) => fs.every((f) => !f.decls.has("margin-top") && !f.decls.has("margin-block-start") && !f.decls.has("margin"))));
  // Every class a component adds at runtime that names an animation is in RUNTIME, so the census sees it.
  const animatedSites = (source: (f: string) => string = code) => {
    const added = new Set(walk("src", /\.(?:tsx|ts)$/).flatMap((f) => [...source(f).matchAll(/classList\.(?:add|toggle)\("([\w-]+)"/g)].map((m) => `${f}#${m[1]}`)));
    if (added.delete(`${PRESS_HELPER}#press-pop`)) for (const f of walk("src", /\.(?:tsx|ts)$/)) for (const site of pressCaller(f, source(f))) added.add(site);
    return [...added].filter((k) => { const cls = k.split("#")[1]; return R.anims.some((a) => !a.parent && a.subject.includes(cls) && animProps(R, a.kfs).size > 0); });
  };
  const runtimeHolds = (animated: string[]) => animated.every(k => RUNTIME.some(r => `${r.file}#${r.cls}` === k)) && RUNTIME.every(r => animated.includes(`${r.file}#${r.cls}`));
  const animated = animatedSites();
  ok(`1.9 · every animation class a component adds at runtime is in the census (${RUNTIME.map((r) => r.cls).join(", ")}): ${j(animated)}`,
    runtimeHolds(animated), j({ animated }));
  const extraHostAnimation = animatedSites(f => f === "src/components/journey/bet-sheet/bet-sheet-host.tsx" ? `${code(f)}\nexport const wrong = () => anchor.classList.add("route-enter");` : code(f));
  const missingHostAnimation = animatedSites(f => f === "src/components/journey/bet-sheet/bet-sheet-host.tsx" ? code(f).replaceAll('playPressPop(anchor)', 'plainPress(anchor)') : code(f));
  ok("1.9′ PLANT · the S8 host's extra animated class and a stale press-pop registration both fail the same runtime census", !runtimeHolds(extraHostAnimation) && !runtimeHolds(missingHostAnimation));
  const extraHelperCaller = animatedSites(f => f === "src/components/ui/toast.tsx" ? `${code(f)}\nimport { playPressPop } from "@/lib/press-feedback"; export const wrong = () => playPressPop(toast);` : code(f));
  const extraHelperClass = animatedSites(f => f === PRESS_HELPER ? `${code(f)}\nexport const wrong = () => node.classList.add("route-enter");` : code(f));
  ok("1.9″ PLANT · a new shared-helper caller or another animation in that helper still needs its own runtime registration", !runtimeHolds(extraHelperCaller) && !runtimeHolds(extraHelperClass));
  const helper = code(PRESS_HELPER);
  ok("1.9a · actual shared press helper captures stylesheet frames/timing, clears React classes, replaces taps, stops on changed calm gates, permits the throttled tier and cleans listeners/observers on finish or cancel", await pressHelperHolds(helper));
  ok("1.9a′ PLANT · leaving a class, copying timing or deferring class removal all fail the same actual helper control",
    !await pressHelperHolds(helper.replace('finally { element.classList.remove("press-pop"); }', 'finally {}'))
      && !await pressHelperHolds(helper.replace('element.animate(frames, timing)', 'element.animate(frames, { duration: 160 })'))
      && !await pressHelperHolds(helper.replace('finally { element.classList.remove("press-pop"); }', 'finally { setTimeout(() => element.classList.remove("press-pop"), 160); }')));
  ok("1.9b′ PLANT · absent calm observer/system listener, cancelling the allowed throttled tier, or leaked cleanup fail the same actual helper control",
    !await pressHelperHolds(helper.replace('observer.observe(root, { attributes: true, attributeFilter: ["class", "data-motion"] });', ''))
      && !await pressHelperHolds(helper.replace('media?.addEventListener("change", stopForCalm);', ''))
      && !await pressHelperHolds(helper.replace('=== "minimal"', '=== "reduced"'))
      && !await pressHelperHolds(helper.replace('observer?.disconnect();', ''))
      && !await pressHelperHolds(helper.replace('media?.removeEventListener("change", stopForCalm);', '')));
}
{
  // THE THREE SIBLINGS THE CENSUS FOUND, each fixed the same way: the static or stateful placement leaves `transform`.
  const card = /\.mcardp:hover \{([^}]*)\}/.exec(CSS)?.[1] ?? "", cardBase = /\.mcardp \{[^}]*transition:([^;]*);/.exec(CSS)?.[1] ?? "";
  ok("1.6 · the board card's hover lift rides `translate` (a `.market-grid > *` entrance held `transform: none`, so the lift never drew on /markets) and its transition names `translate`",
    /translate: 0 var\(--m-lift\)/.test(card) && !/transform/.test(card) && /\btranslate var\(--t-base\)/.test(cardBase) && !/\btransform\b/.test(cardBase), j({ card, cardBase }));
  const CHAT = decommentCss(raw("src/styles/chat/chat-styles.css"));
  const starter = /\.cm-empty-starter:active \{([^}]*)\}/.exec(CHAT)?.[1] ?? "", starterBase = /\.cm-empty-starter \{[^}]*transition:([^;]*);/.exec(CHAT)?.[1] ?? "";
  ok("1.7 · the chat's starter presses with `scale` (its `cm-starter-in` filled `both` on `transform: translateY(0)`) and its transition names `scale`",
    /scale: 0\.97/.test(starter) && !/transform/.test(starter) && /\bscale var\(--cm-dur-glide\)/.test(starterBase) && !/\btransform\b/.test(starterBase), j({ starter, starterBase }));
  const WC = "src/components/markets/win-celebration.tsx";
  const btn = parse(WC).find((e) => e.tag === "button" && e.cls.includes("gilt-metal"));
  ok("1.8 · the win's Continue keeps the kit's hover and press: its arrival (`g-settle`, `--i: 5`) is its wrapper's, not the button's",
    !!btn && !btn.cls.includes("g-settle") && !!btn.parent && btn.parent.cls.includes("g-settle") && /"--i": 5/.test(btn.parent.style), j({ btn: btn?.cls, parent: btn?.parent?.cls }));
  // The two one-shot feedbacks on a `.btn` (whose hover lift and press are `transform`s) swell on `scale`: while they ran
  // on `transform`, a hovered button dropped its 2px lift for their length and jumped back.
  const frames = (name: string, css: string) => new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";
  const flash = frames("ud-side-flash", CSS), pop = frames("press-pop", CSS);
  const calmPop = /@keyframes press-pop\s*\{ from, to \{ ([^}]*) \} \}/.exec(CSS)?.[1] ?? "";
  ok("1.10 · Up & Down's side flash and the card's press pop swell on `scale` (composing with the button's lift and press), and the press pop's calm branch rests on `scale: none` — no `transform` in either",
    /scale: 1\.035;/.test(flash) && !/transform/.test(flash) && /scale: 0\.955;/.test(pop) && !/transform/.test(pop) && calmPop.trim() === "scale: none;", j({ flash, pop, calmPop }));
  // The podium's loading drawing: it wore `-translate-y-3` as well, and with no entrance there to hold `transform` its #1
  // WAS raised (11px below its neighbours, the page's 27) — so the page's arrival dropped the winner 16px.
  const ghost = parse("src/app/leaderboard/loading.tsx").filter((e) => e.fn === "PodiumGhost");
  const gcol = ghost.find((e) => e.cls.includes("flex-col") && e.cls.includes("text-center")), ggrid = ghost.find((e) => e.cls.includes("grid-cols-3"));
  ok("1.11 · the podium's loading drawing stands as the page does: its columns hang from the top, #1 `-mt-3`, its neighbours `mt-1.5`, no transform — so the page arrives where the drawing stood",
    !!gcol && gcol.cls.includes("-mt-3") && gcol.cls.includes("mt-1.5") && !gcol.cls.some((c) => TW_TRANSFORM.test(c)) && !!ggrid && ggrid.cls.includes("items-start") && !ggrid.cls.includes("items-end"),
    j({ col: gcol?.cls, grid: ggrid?.cls }));
}
{
  // PLANTS — each defect put back in memory, each reported by the census on its own element.
  const swap = (f: string, from: string, to: string) => { const s = raw(f); if (!s.includes(from)) throw new Error(`plant anchor missing in ${f}: ${from}`); return { [f]: s.replace(from, to) }; };
  const P: Array<[string, Record<string, string>, RegExp]> = [
    ["the journey card's delegated pop back on its hover transform", swap(GLOBALS, "40%  { scale: 0.955; }", "40%  { transform: scale(0.955); }"), /bet-sheet-host\.tsx <kp-jcard__pick> \+ press-pop.*\.kp-jcard__pick:hover.*transform/],
    ["the podium's `-translate-y-3` back on #1", swap("src/app/leaderboard/page.tsx", '${first ? "-mt-3" : "mt-1.5"}', '${first ? "-translate-y-3" : ""}'), /leaderboard\/page\.tsx:\d+ <div> \[kp-rise both via \.kp-rise\] utility -translate-y-3/],
    ["a hover lift on /live's pulse card (`hover:-translate-y-0.5`)", swap("src/app/live/pulse-grid.tsx", "kp-rise group flex flex-col", "kp-rise group flex flex-col hover:-translate-y-0.5"), /pulse-grid\.tsx:\d+ <Link>.*utility hover:-translate-y-0\.5/],
    ["Up & Down's side flash back on `transform`", swap(GLOBALS, "30%  { scale: 1.035; filter: brightness(1.28); }", "30%  { transform: scale(1.035); filter: brightness(1.28); }"), /updown-stake-controls\.tsx:\d+ <button> \[ud-side-flash none via \.ud-side-flash\].*\.btn:hover/],
    ["the card's press pop back on `transform`", swap(GLOBALS, "40%  { scale: 0.955; }", "40%  { transform: scale(0.955); }"), /market-card\.tsx <btn> \+ press-pop.*added at runtime.*\.btn:hover/],
    ["the board card's lift back on `transform`", swap(GLOBALS, ".mcardp:hover { translate: 0 var(--m-lift);", ".mcardp:hover { transform: translateY(var(--m-lift));"), /<MarketCard> → src\/components\/markets\/market-card\.tsx:\d+ <article> \[kp-rise both via \.market-grid > \*\].*\.mcardp:hover \{ transform/],
    ["the chat starter's press back on `transform`", swap("src/styles/chat/chat-styles.css", ".cm-empty-starter:active { scale: 0.97; }", ".cm-empty-starter:active { transform: scale(0.97); }"), /EmptyState\.tsx:\d+.*cm-starter-in both.*\.cm-empty-starter:active \{ transform/],
    ["`g-settle` back on the Continue button", swap("src/components/markets/win-celebration.tsx", 'className="btn gilt-metal btn-md w-full"', 'className="g-settle btn gilt-metal btn-md w-full"'), /win-celebration\.tsx:\d+ <button> \[glyph-settle both via \.g-settle\].*\.btn:hover/],
  ];
  const missed = P.filter(([, over, re]) => !show(census(over).hits).some((s) => re.test(s))).map(([n]) => n);
  ok(`1.1′ PLANT · ${P.length} defects, each reported on its own element: ${P.map(([n]) => n).join(" · ")}`, missed.length === 0, j(missed));
  const sheetOnly = census(swap("src/app/live/pulse-grid.tsx", "kp-rise group flex flex-col", "kp-rise group flex flex-col transform-gpu"));
  ok("1.1″ PLANT · even a bare `transform-gpu` under an entrance is a transform of its own (it writes `transform`) — reported on the pulse card under both rules that animate it (its own `.kp-rise` and the wall's `.market-grid > *`)",
    sheetOnly.hits.length === 2 && sheetOnly.hits.every((x) => /pulse-grid\.tsx:\d+ <Link>/.test(x.at) && x.own.includes("utility transform-gpu")), j(show(sheetOnly.hits)));
}

/* ══ §2 · C2 · EVERY PAGER'S DOTS ══════════════════════════════════════════════════════════════════════════════════════ */
section("2 · C2 every carousel target meets the 40px floor and its dot stays centred");
type Rail = { pads: number[]; mins: number[]; widths: number[]; heights: number[]; boxH: number[]; drawCls: string[]; railCls: string };
/** A rendered rail: each target's horizontal padding, its drawing's width (inline) and height (class). */
function railOf(html: string, railClassRe: RegExp): Rail | null {
  const m = railClassRe.exec(html);
  if (!m) return null;
  const body = html.slice(m.index);
  const targets = [...body.matchAll(/<(?:button|span)[^>]*class="(grid h-\[(\d+)px\][^"]*)"[^>]*><span class="([^"]*)" style="width:(\d+)px[^"]*"><\/span><\/(?:button|span)>/g)];
  if (!targets.length) return null;
  return {
    railCls: m[1] ?? "",
    pads: targets.map((t) => Number(/(?:^|\s)px-\[(\d+)px\]/.exec(t[1])?.[1] ?? NaN)),
    mins: targets.map((t) => Number(/(?:^|\s)min-w-\[(\d+)px\]/.exec(t[1])?.[1] ?? NaN)),
    boxH: targets.map((t) => Number(t[2])),
    drawCls: targets.map((t) => t[3]),
    heights: targets.map((t) => Number(/(?:^|\s)h-\[(\d+)px\]/.exec(t[3])?.[1] ?? NaN)),
    widths: targets.map((t) => Number(t[4])),
  };
}
/** The drawings' edges for a rail of `n`; the 40px boxes own the hit area. */
function edges(pad: number, on: number, off: number, n: number, cur: number, floor = 40) {
  let x = 0;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) { const w = i === cur ? on : off; const box = Math.max(floor, w + 2 * pad); out.push([x + (box - w) / 2, x + (box + w) / 2]); x += box; }
  return { out, length: x };
}
{
  const markets = Array.from({ length: 4 }, (_, i) => ({ id: `m${i}`, title: `Swali ${i + 1}`, yesPct: 40 + i, productLine: "MARKET" as const, roundId: null }));
  const { FeaturedContest } = req("../src/app/live/featured-contest.tsx") as { FeaturedContest: unknown };
  const { NotableCarousel } = req("../src/app/results/notable-carousel.tsx") as { NotableCarousel: unknown };
  const live = railOf(inLocale("sw", "/live", h(FeaturedContest as never, { markets, eyebrow: "x", openLabel: word("sw", "market.openMarket") } as never)), /<div class="(flex basis-full items-center justify-center sm:-ml-\[9px\] sm:basis-auto)">/);
  const notable = railOf(inLocale("sw", "/results", h(NotableCarousel as never, { slides: [h("i", { key: 1 }, "a"), h("i", { key: 2 }, "b"), h("i", { key: 3 }, "c")], label: "l", prevLabel: "p", nextLabel: "n" } as never)), /<div class="(mt-2\.5 flex items-center justify-center)" aria-hidden="true">/);
  const rails = { live, notable };
  const shape = (r: Rail | null, n: number) => !!r && r.widths.length === n && r.widths[0] === 18 && r.widths.slice(1).every((w) => w === 6)
    && r.pads.every((p) => p === 9) && r.mins.every((w) => w === 40) && r.heights.every((x) => x === 6) && r.boxH.every((x) => x === 40);
  ok("2.1 · RENDERED: /live and /results targets are at least 40×40, with a 6px dot and an 18px active pill",
    shape(live, 4) && shape(notable, 3), j(rails));
  // Every current slide, every rail length the carousels can hold (liveContest's six; /results' three): equal gaps, a
  // constant length — so a change of slide moves only the dots between the two that trade width.
  const bad: string[] = [];
  for (let n = 2; n <= 6; n++) {
    const lengths = new Set<number>();
    for (let cur = 0; cur < n; cur++) {
      const { out, length } = edges(9, 18, 6, n, cur);
      lengths.add(length);
      const centres = out.map(([a, b]) => (a + b) / 2);
      if (!centres.slice(1).every((c, i) => c - centres[i] === 40)) bad.push(`n${n} cur${cur} centres ${j(centres)}`);
    }
    if (lengths.size !== 1 || [...lengths][0] !== 40 * n) bad.push(`n${n} lengths ${j([...lengths])}`);
  }
  ok("2.2 · for every rail of 2–6 slides and every current slide: centres stand 40px apart and the rail's width never changes", bad.length === 0, j(bad));
  const before = edges(9, 18, 6, 4, 0);   // the 390 tile's geometry, as a CONTROL: fixed 24px targets, the pill centred in one
  const fixed = [[3, 21], [33, 39], [57, 63], [81, 87]];
  const fixedGaps = fixed.slice(1).map((e, i) => e[0] - fixed[i][1]);
  ok(`2.2′ CONTROL · the old 24px targets drew uneven gaps ${j(fixedGaps)}; fixed 40px targets centre the dots at 20, 60, 100, 140`,
    j(fixedGaps) === j([12, 18, 18]) && j(before.out.map(([a, b]) => (a + b) / 2)) === j([20, 60, 100, 140]));
  const DRAW = "block h-[6px] rounded-full transition-[width,background-color] duration-quick ease-glide";
  const cfgOk = /quick: "var\(--t-quick\)"/.test(TW) && /glide: "var\(--m-glide\)"/.test(TW);
  ok("2.3 · the pill and the dot it trades with change width together on the ladder (`duration-quick` = --t-quick, `ease-glide` = --m-glide) — `transition-all`'s off-ladder 150ms gone from every dot",
    cfgOk && [live, notable].every((r) => !!r && r.drawCls.every((c) => c === DRAW)), j([live?.drawCls[0], notable?.drawCls[0]]));
  // The wider hit targets make six slides too wide beside the action at 390, so the phone rail
  // deliberately takes a centred second line. The desktop rail keeps its old -9px alignment.
  const rowGap = /<div className="mt-4 flex flex-wrap items-center gap-(\d+(?:\.\d+)?)">/.exec(code("src/app/live/featured-contest.tsx"))?.[1] ?? "";
  const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { glyphs: Array<{ advanceWidth: number }> }; unitsPerEm: number } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}`);
  const interM = F("Inter-Medium.ttf"), interB = F("Inter-Bold.ttf");
  const wOf = (font: ReturnType<typeof F>, s: string, px: number) => font.layout(s).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / font.unitsPerEm * px;
  const HAN = /[　-鿿＀-￯]/;
  const sans = (s: string, px: number) => [...s].reduce((a, ch) => a + (HAN.test(ch) ? px : (wOf(interM, ch, px) + wOf(interB, ch, px)) / 2), 0);
  const six = edges(9, 18, 6, 6, 0).length;
  const room = 390 - 82;   // the hero at 390: its frame and padding (visual-pass-r5l §10.2)
  const rows = LOCALES.map((l) => ({ l, need: Math.ceil(2 + 32 + sans(word(l, "market.openMarket"), 14) + tw(rowGap) + six) }));
  ok(`2.4 · /live's 240px six-slide rail takes a centred second line on phones; at 390 it needs ${rows.map((r) => `${r.l} ${r.need}`).join(" · ")} of ${room}px beside the action`,
    live?.railCls === "flex basis-full items-center justify-center sm:-ml-[9px] sm:basis-auto" && tw(rowGap) === 16 && six === 240 && rows.every((r) => r.need > room), j(rows));
  // The loading drawings reserve the same targets and phone line as the loaded pages.
  const LG = code("src/app/live/loading.tsx"), RG = code("src/app/results/loading.tsx");
  ok("2.5 · both loading drawings reserve 40×40 dot targets; /live's drawing uses the same centred phone row",
    [LG, RG].every((g) => g.includes('className="grid h-[40px] min-w-[40px] place-items-center px-[9px]"') && g.includes('className="block h-[6px] rounded-full bg-bg-overlay" style={{ width: i === 0 ? 18 : 6 }}'))
      && LG.includes('<div className="flex basis-full items-center justify-center sm:-ml-[9px] sm:basis-auto">') && !/w-\[24px\]|h-1\.5 rounded-full/.test(LG + RG));
  // The first-visit primer's step dots: the same convention (they are not targets, so their gap is the row's own 8px).
  const PR = "src/components/onboarding/first-visit-primer.tsx";
  const dots = parse(PR).filter((e) => e.tag === "span" && e.cls.includes("rounded-full") && /width: i === step/.test(e.style));
  const dotRow = dots[0]?.parent;
  ok("2.6 · the primer's step dots are the pager's: a 6px round dot, the current step an 18px pill grown in its own box (no `scale(1.4)` transform, which drew 7px in a 5px box and stood 7 from its neighbours against 8), every two 8px apart, on the ladder, `--border-strong` / `--brand-400`",
    dots.length === 1 && dots[0].cls.join(" ") === "inline-block h-[6px] rounded-full transition-[width,background-color] duration-quick ease-glide"
      && /width: i === step \? 18 : 6/.test(dots[0].style) && !/transform/.test(dots[0].style) && /"var\(--border-strong\)"/.test(dots[0].style) && /"var\(--brand-400\)"/.test(dots[0].style)
      && !!dotRow && dotRow.cls.includes("gap-1.5") && tw("1.5") === 8, j(dots.map((d) => [d.cls, d.style])));
  // The census of dot rails: every element in player code that draws a width-switching dot (`width: i === … ? 18 : 6`),
  // and every target box that holds one — read from source, so a plant on any file is read the same way.
  const railCensus = (over: Record<string, string> = {}) => {
    const srcOf = (f: string) => over[f] ?? raw(f);
    const dotsIn = PLAYER_TSX.flatMap((f) => parse(f, srcOf(f)).filter((e) => /width: i === \w+ \? 18 : 6/.test(e.style)).map((e) => ({ f, cls: e.cls.join(" "), box: e.parent?.cls.join(" ") ?? "" })));
    const bad = dotsIn.filter((d) => !d.cls.includes("h-[6px]") || d.cls.includes("h-1.5") || (d.f !== "src/components/onboarding/first-visit-primer.tsx" && (!/(?:^| )px-\[9px\](?: |$)/.test(d.box) || !/(?:^| )min-w-\[40px\](?: |$)/.test(d.box))) || /w-\[24px\]/.test(d.box));
    return { dotsIn, bad };
  };
  const RC = railCensus();
  ok(`2.7 · all ${RC.dotsIn.length} player dot rails use 6px drawings; carousel targets hold the 40px floor`,
    RC.dotsIn.length === 5 && RC.bad.length === 0, j(RC));
  // PLANTS — on the source, read by the same census
  const FCP = "src/app/live/featured-contest.tsx";
  const fixedBack = railCensus({ [FCP]: raw(FCP).replace('className="grid h-[40px] min-w-[40px] place-items-center rounded-md px-[9px]"', 'className="grid h-[40px] place-items-center rounded-md px-[9px]"') });
  ok("2.2″ PLANT · removing /live's 40px width floor is reported", fixedBack.bad.some((d) => d.f === FCP && !/min-w-\[40px\]/.test(d.box)), j(fixedBack.bad));
  const capsule = railCensus({ "src/app/results/notable-carousel.tsx": raw("src/app/results/notable-carousel.tsx").replace('"block h-[6px] rounded-full transition-[width,background-color] duration-quick ease-glide"', '"block h-1.5 rounded-full transition-all"') });
  ok("2.7′ PLANT · /results' 6 × 8 capsule back (`h-1.5` is 8px here) is reported", capsule.bad.some((d) => /notable-carousel/.test(d.f)), j(capsule.bad));
  const oval = railOf(inLocale("sw", "/results", h(NotableCarousel as never, { slides: [h("i", { key: 1 }, "a"), h("i", { key: 2 }, "b")], label: "l", prevLabel: "p", nextLabel: "n" } as never)).replace(/h-\[6px\]/g, "h-1.5"), /<div class="(mt-2\.5 flex items-center justify-center)" aria-hidden="true">/);
  ok("2.1′ PLANT · `h-1.5` (8px here) back on the drawing is reported — the dot reads as no height of its own", !shape(oval, 2));
}

/* ══ §3 · C3 · SECTION HEADS THROUGH WRAPPERS ══════════════════════════════════════════════════════════════════════════ */
section("3 · C3 the invite dial's caption in the one section ink — and every wrapper of `.eyebrow`, every caller, every inked child");
const ONE_INK = "text-text-subtle";
const NOT_INK = /^(?:micro|caption|label|body-sm|body|body-lg|title-sm|title-md|title-lg|display-[123]|\[[0-9.]+px\]|left|right|center|justify|start|end|balance|pretty|wrap|nowrap|ellipsis|clip)$/;
const INTERACTION = /(?:^|:)(?:hover|focus|focus-visible|focus-within|active|visited|disabled|group-hover|peer-hover|group-focus|aria-[\w-]+|data-[\w-]+|placeholder|selection|marker|file|open):/;
const inkOf = (c: string): string | null => {
  const m = /^((?:[a-z0-9-]+:)*)!?text-(.+)$/.exec(c);
  if (!m || NOT_INK.test(m[2]) || INTERACTION.test(m[1])) return null;
  return c;
};
const inksOf = (cls: string[]) => [...new Set(cls.map(inkOf).filter((x): x is string => !!x))].sort();
const styleColor = (style: string) => /\bcolor:\s*([^,}]+?)\s*(?:,|\}|$)/.exec(style)?.[1]?.trim() ?? "";
type Wrapper = { file: string; name: string; prop: string; exported: boolean };
/** A WRAPPER: a function component that renders an `.eyebrow` whose class list takes one of its own props. */
function wrappersIn(file: string, src: string): Wrapper[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Wrapper[] = [];
  const consider = (name: string, fn: ts.FunctionLikeDeclaration, exported: boolean) => {
    const p0 = fn.parameters[0];
    if (!p0 || !ts.isObjectBindingPattern(p0.name)) return;
    const props = p0.name.elements.map((e) => (e.propertyName ?? e.name).getText(sf));
    const locals = new Map(p0.name.elements.map((e) => [e.name.getText(sf), (e.propertyName ?? e.name).getText(sf)]));
    /** The identifiers that flow into a class string AS ITS VALUE: a template's `${x}`, a `cn(…, x)` argument, a branch
     *  of a condition (never its test), an operand of `||` / `??` / `+` — not a member read (`tone.ink`, a table the
     *  component owns) and not a test (`tight ? "a" : "b"`, a boolean that picks among the component's own classes). */
    const valueIdents = (e: ts.Node | undefined): string[] => {
      if (!e) return [];
      if (ts.isIdentifier(e)) return [e.text];
      if (ts.isJsxExpression(e) || ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)) return valueIdents(e.expression);
      if (ts.isTemplateExpression(e)) return e.templateSpans.flatMap((s) => valueIdents(s.expression));
      if (ts.isCallExpression(e)) return e.arguments.flatMap((a) => valueIdents(a));
      if (ts.isConditionalExpression(e)) return [...valueIdents(e.whenTrue), ...valueIdents(e.whenFalse)];
      if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.PlusToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind))
        return e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ? valueIdents(e.right) : [...valueIdents(e.left), ...valueIdents(e.right)];
      return [];
    };
    fn.forEachChild(function v(n: ts.Node) {
      if (ts.isJsxAttribute(n) && n.name.getText(sf) === "className" && n.initializer && /\beyebrow\b/.test(n.initializer.getText(sf))) {
        for (const id of valueIdents(n.initializer)) { const prop = locals.get(id); if (prop && props.includes(prop) && !out.some((w) => w.name === name && w.prop === prop)) out.push({ file, name, prop, exported }); }
      }
      n.forEachChild(v);
    });
  };
  sf.forEachChild((st) => {
    const exported = !!ts.getModifiers?.(st as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isFunctionDeclaration(st) && st.name) consider(st.name.text, st, exported);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) consider(d.name.text, d.initializer, exported);
    }
  });
  return out;
}
type Call = { at: string; wrapper: string; inks: string[]; transparent: boolean; childInks: string[] };
/** Every call site of every wrapper: the classes its caller passes, judged as the eyebrow's own. */
function wrapperCensus(over: Record<string, string> = {}): { wrappers: Wrapper[]; calls: Call[] } {
  const srcOf = (f: string) => over[f] ?? raw(f);
  const wrappers = PLAYER_TSX.flatMap((f) => (/\beyebrow\b/.test(srcOf(f)) ? wrappersIn(f, srcOf(f)) : []));
  const calls: Call[] = [];
  for (const f of PLAYER_TSX) {
    const src = srcOf(f);
    const mine = wrappers.filter((w) => w.file === f || (w.exported && new RegExp(`import\\s*\\{[^}]*\\b${w.name}\\b`).test(src)));
    if (!mine.length) continue;
    for (const el of parse(f, src)) for (const w of mine) {
      if (el.tag !== w.name) continue;
      const a = el.attrs.get(w.prop);
      const cls = a?.initializer ? strs(a.initializer, constsOf(f, src)).flatMap((s) => s.split(/\s+/)).filter(Boolean) : [];
      // the words a caller passes render INSIDE the wrapper's eyebrow: an ink on one of them paints part of the head
      const down = (e: El): El[] => e.kids.flatMap((k) => [k, ...down(k)]);
      const childInks = down(el).flatMap((d) => [...inksOf(d.cls).filter((i) => i !== ONE_INK && i !== "text-transparent"), ...(styleColor(d.style) ? [`style:${styleColor(d.style)}`] : [])]);
      calls.push({ at: `${f}:${el.line} <${w.name} ${w.prop}>`, wrapper: `${w.file}#${w.name}`, inks: inksOf(cls), transparent: cls.includes("text-transparent"), childInks });
    }
  }
  return { wrappers, calls };
}
{
  const INV = "src/app/profile/invite/page.tsx";
  const dial = parse(INV).find((e) => e.tag === "Cap" && /t\.profile\.inviteEarn/.test(e.text));
  const capP = parse(INV).find((e) => e.fn === "Cap" && e.cls.includes("eyebrow"));
  ok("3.1 · the invite dial's caption (\"Marafiki waliojiunga\" / \"Earn …\") passes `Cap` layout only — `!text-royal-300` gone — and `Cap` paints `--text-subtle`",
    !!dial && inksOf(dial.cls).length === 0 && !dial.cls.some((c) => /royal/.test(c)) && !!capP && j(inksOf(capP.cls)) === j([ONE_INK]), j({ dial: dial?.cls, cap: capP?.cls }));
  const W = wrapperCensus();
  /** A caller's inked child kept for its role (each entry must match a call site exactly once). */
  const CALL_REGISTRY: Array<{ at: RegExp; ink: string; role: string; why: string }> = [
    { at: /^src\/app\/profile\/account\/close-account-form\.tsx:\d+ <FieldLegend className>$/, ink: "text-danger-fg", role: "FORM",
      why: "the account closure's type-to-confirm label: the phrase to type in the danger ink of an act that cannot be taken back (the confirm modal's hard tier, staff-only, is its claret twin) — a form field's label, not a section head" },
  ];
  /** A call is clean when it passes no ink (or `text-transparent` on a drawing whose words are not shown) and no word of its
   *  children is inked — or its children's ink is registered with its role. */
  const regUse = new Map<number, number>();
  const clean = (c: Call, count = false) => {
    const own = c.inks.length === 0 || (c.inks.length === 1 && c.inks[0] === "text-transparent" && c.transparent);
    const ri = CALL_REGISTRY.findIndex((r) => r.at.test(c.at) && c.childInks.every((i) => i === r.ink));
    if (count && ri >= 0 && c.childInks.length) regUse.set(ri, (regUse.get(ri) ?? 0) + 1);
    return own && (c.childInks.length === 0 || ri >= 0);
  };
  const badCalls = W.calls.filter((c) => !clean(c, true));
  const staleCalls = CALL_REGISTRY.filter((_, i) => regUse.get(i) !== 1).map((r) => r.role);
  const names = [...new Set(W.wrappers.map((w) => `${w.name}.${w.prop}`))].sort();
  ok(`3.2 · THE WRAPPER CENSUS: ${W.wrappers.length} components render an \`.eyebrow\` with a class their caller passes (${names.join(", ")}); all ${W.calls.length} call sites pass layout only — or \`text-transparent\` on a drawing whose words are not shown — and no caller inks the words it passes, but the ${CALL_REGISTRY.length} registered (${CALL_REGISTRY.map((r) => r.role).join(", ")})`,
    W.wrappers.length >= 4 && W.calls.length >= 40 && badCalls.length === 0 && staleCalls.length === 0 && names.includes("Cap.className") && names.includes("FieldLegend.className") && names.includes("FilterGroupKey.className"),
    j({ bad: badCalls.map((c) => `${c.at} ${j(c.inks)} ${j(c.childInks)}`), staleCalls }));
  // The other way round: an `.eyebrow` whose OWN children paint another ink (the census read the element and above it).
  // A child with its own box (a fill and an edge or padding) is a chip, and a chip keeps its own ink — the pulse wall's
  // game tag. The rest must be registered with the role that keeps them.
  const CHILD_REGISTRY: Array<{ file: string; key: string; role: string; why: string }> = [
    { file: "src/components/markets/conviction-dial.tsx", key: "", role: "SIDE", why: "the dial's poles, per span (R8-B's SIDE entry)" },
    { file: "src/app/updown/[roundId]/page.tsx", key: "· staff only", role: "STAFF", why: "the evidence excerpt's \"· staff only\" aside — the line renders only for staff (`evidence && viewerIsStaff`)" },
  ];
  const isChip = (d: El) => (/background/.test(d.style) || d.cls.some((c) => /^bg-(?!transparent)/.test(c))) && (/border|padding/.test(d.style) || d.cls.some((c) => /^(?:border|px-|py-|p-)/.test(c)));
  const inked: string[] = [], chips: string[] = [];
  const used = new Map<(typeof CHILD_REGISTRY)[number], number>();
  for (const f of PLAYER_TSX) {
    if (!/\beyebrow\b/.test(raw(f))) continue;
    for (const el of parse(f)) {
      if (!el.cls.includes("eyebrow")) continue;
      const down = (e: El): El[] => e.kids.flatMap((k) => [k, ...down(k)]);
      for (const d of down(el)) {
        const ink = inksOf(d.cls).filter((i) => i !== ONE_INK && i !== "text-transparent");
        const sc = styleColor(d.style);
        if (!(ink.length || (sc && sc !== "\"var(--text-subtle)\""))) continue;
        if (isChip(d)) { chips.push(`${f}:${d.line}`); continue; }
        const reg = CHILD_REGISTRY.find((r) => r.file === f && d.text.includes(r.key));
        if (reg) { used.set(reg, (used.get(reg) ?? 0) + 1); continue; }
        inked.push(`${f}:${d.line} <${d.tag}> ${j(ink)} ${sc}`);
      }
    }
  }
  const staleReg = CHILD_REGISTRY.filter((r) => !used.get(r)).map((r) => `${r.file} ${r.role}`);
  ok(`3.3 · no \`.eyebrow\` in player code paints part of its words in another ink through a child — ${chips.length} chip(s) inside an eyebrow row keep their own ink (the pulse wall's game tag), and ${CHILD_REGISTRY.length} registered: ${CHILD_REGISTRY.map((r) => r.role).join(", ")} — none stale`,
    inked.length === 0 && chips.length === 1 && staleReg.length === 0, j({ inked, chips, staleReg }));
  // PLANTS
  const p1 = wrapperCensus({ [INV]: raw(INV).replace('<Cap className="sm:mb-1.5">', '<Cap className="sm:mb-1.5 !text-royal-300">') });
  const p2 = wrapperCensus({ "src/app/proposals/new/create-form.tsx": raw("src/app/proposals/new/create-form.tsx").replace('<FieldLegend className="block mb-1.5">{t.common.whyItMatters}', '<FieldLegend className="block mb-1.5 text-gold-300">{t.common.whyItMatters}') });
  const bad = (w: ReturnType<typeof wrapperCensus>) => w.calls.filter((c) => !clean(c));
  ok("3.1′ PLANT · `!text-royal-300` back on the dial's `Cap` is reported at its call site", bad(p1).some((c) => /invite\/page\.tsx:\d+ <Cap className>/.test(c.at) && c.inks.includes("!text-royal-300")));
  ok("3.2′ PLANT · a gold ink passed to a shared wrapper (`FieldLegend`, from another file) is reported", bad(p2).some((c) => /create-form\.tsx/.test(c.at)));
  const p3 = wrapperCensus({ [INV]: raw(INV).replace("{paid ? t.profile.yourReferrals : t.profile.yourFriends}", '<span className="text-gold-300">{paid ? t.profile.yourReferrals : t.profile.yourFriends}</span>') });
  ok("3.3′ PLANT · a gold word passed as a wrapper's CHILD (`<Cap><span className=\"text-gold-300\">…`) is reported at its call site — the words a caller passes render inside the eyebrow",
    bad(p3).some((c) => /invite\/page\.tsx:\d+ <Cap className>/.test(c.at) && c.childInks.includes("text-gold-300")), j(bad(p3)));
}

/* ══ §4 · C4 · THE JOURNEY RAIL ════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · C4 the journey rail stacks from the top only where a label wraps — each language's width, derived from its words");
{
  const TAB = req("../src/lib/nav/active-tab.ts") as { JOURNEY_TABS: ReadonlyArray<{ key: string; label: string }>; tabLabel: (t: unknown, k: string) => string };
  const micro = token("--type-micro");
  const labelPad = 2 * Number(/\.kp-rail__label \{[^}]*padding-inline: ([0-9.]+)px/.exec(CSS)?.[1] ?? NaN);
  // `test:journey-shell` §8's measure: the rail's 11px mono at 0.6em a letter, a Chinese character 1em, plus the label's padding.
  const mono = (s: string) => [...s].reduce((w, ch) => w + ((ch.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : 0.6) * micro, 0);
  const fitsFrom = (l: Loc, labels = TAB.JOURNEY_TABS.map((d) => TAB.tabLabel(dict[l], d.label))) => Number((4 * Math.max(...labels.map((s) => mono(s) + labelPad))).toFixed(1));
  const W = Object.fromEntries(LOCALES.map((l) => [l, fitsFrom(l)])) as Record<Loc, number>;
  ok(`4.1 · each language's longest label fits its quarter of the phone from: sw ${W.sw}px ("${TAB.tabLabel(dict.sw, "journey.tabTickets")}"), en ${W.en}px, zh ${W.zh}px — so only Swahili wraps at 320`,
    micro === 11 && labelPad === 4 && W.sw === 332.8 && W.en === 280 && W.zh === 192, j({ micro, labelPad, W }));
  /** The rail's rules as one predicate over a stylesheet, so a plant is judged by the very check. */
  const railRules = (css: string, widths: Record<Loc, number> = W) => {
    const rule = (px: number, sel: string) => { const head = `@media (min-width: ${px}px) { ${sel} {`; const at = css.indexOf(head); return at < 0 ? "" : css.slice(at + head.length, css.indexOf("}", at + head.length)); };
    const base = /\n\.kp-rail--journey \.kp-rail__item \{([^}]*)\}/.exec(css)?.[1] ?? "";
    const per = Object.fromEntries(LOCALES.map((l) => [l, rule(widths[l], `.kp-rail--journey:lang(${l}) .kp-rail__item`)]));
    const capped = [...css.matchAll(/@media[^{]*(?:max-width|width\s*<)[^{]*\{[^@]*?kp-rail--journey/g)].map((m) => m[0].slice(0, 60));
    const holds = /justify-content: flex-start/.test(base) && LOCALES.every((l) => /justify-content: center/.test(per[l])) && /justify-content: center/.test(rule(360, ".kp-rail--journey .kp-rail__item")) && capped.length === 0;
    return { holds, base, per, capped };
  };
  const RR = railRules(CSS);
  ok("4.2 · the stylesheet holds exactly those widths: the slots stack from the top (the base rule), each language centres them from its width (`:lang()`), and from 360 every slot centres; mobile-first — no width-capping query reaches the rail",
    RR.holds, j(RR));
  // THE NUMBERS. A slot is 64px with 6px of padding; below 360 a label's line is 1.15 × 11, from 360 it is 1 × 11.
  const slot = 64, pad = 6, pip = 26, gap = token("--sp-1");
  const oneLine = (lh: number) => pip + gap + lh;
  const centred = (lh: number) => (slot - 2 * pad - oneLine(lh)) / 2 + pad;
  const en320 = centred(1.15 * micro), at390 = centred(micro);
  ok(`4.3 · English and Chinese at 320: the items centred ${en320.toFixed(3)} | ${en320.toFixed(3)} under the rail's edge and over its foot (the tiles read 6 | 15); at 390 ${at390.toFixed(1)} | ${at390.toFixed(1)} as before; Swahili at 320 still stacks (its Tiketi slot is 26 + 4 + 2 × 12.65 = ${(pip + gap + 2 * 1.15 * micro).toFixed(1)}px) and centres from 332.8 — CONFIRM IN BROWSER (any journey page, 320 × 780, en and zh: the pip 10.7px under the rail's top border)`,
    near(en320, 10.675, 1e-9) && near(at390, 11.5) && near(pip + gap + 2 * 1.15 * micro, 55.3, 1e-9));
  // PLANTS: a longer label moves its language's width, so the stylesheet no longer matches it; the old one-language rule.
  const longer = fitsFrom("en", TAB.JOURNEY_TABS.map((d) => TAB.tabLabel(dict.en, d.label)).map((s) => (s === "My tickets" ? "My open tickets" : s)));
  ok(`4.1′ PLANT · English's Tiketi label grown to "My open tickets" moves its width to ${longer}px: the very check fails on today's stylesheet`, longer > W.en && !railRules(CSS, { ...W, en: longer }).holds);
  const stale = CSS.replace("@media (min-width: 332.8px) { .kp-rail--journey:lang(sw)", "@media (min-width: 360px) { .kp-rail--journey:lang(sw)");
  ok("4.2′ PLANT · Swahili keyed at 360 is reported", stale !== CSS && !railRules(stale).holds);
  const allLangs = CSS.replace(/@media \(min-width: (?:192|280|332\.8)px\) \{ \.kp-rail--journey:lang\(\w+\) \.kp-rail__item \{ justify-content: center; \} \}\n/g, "");
  ok("4.2″ PLANT · the round-8 rule (every language stacked below 360) is reported", allLangs !== CSS && !railRules(allLangs).holds);
}

/* ══ §5 · C5 · THE STACKED FLAG ON A WHOLE PIXEL ═══════════════════════════════════════════════════════════════════════ */
section("5 · C5 stacked under its label, the INAKUJA flag lands on a whole pixel — its caps sit as the beside-its-label flag's");
{
  const ROW = token("--h-control-xl"), PAD = token("--sp-2"), BOX = ROW - 2 * PAD, body = token("--type-body");
  const head = /\.kp-hub__head \{ display: flex;[^}]*gap: (\d+)px var\(--sp-3\);/.exec(CSS);
  const rowGap = Number(head?.[1]);
  const L0 = 1.3 * body;                                                           // the label's own line (`.kp-hub__label`)
  const FLAG = Number(/\.kp-flag-xs \{ height: (\d+)px; \}/.exec(CSS)?.[1] ?? NaN);
  const air = (L0 - body * 0.7275) / 2;                                            // `--hub-flag-air`
  const stackedTop = (l: number) => PAD + (BOX - (l + rowGap + FLAG)) / 2 + l + rowGap;
  const besideTop = PAD + (BOX - FLAG) / 2;
  /** The label's line inside the head, as a stylesheet sets it: the head's own rule, else the label's 1.3. */
  const headLine = (css: string) => { const m = /\.kp-hub__head > \.kp-hub__label \{ line-height: (\d+(?:\.\d+)?)px; \}/.exec(css); return m ? Number(m[1]) : L0; };
  const whole = (css: string) => Number.isInteger(stackedTop(headLine(css))) && Number.isInteger(besideTop);
  const L = headLine(CSS);
  ok(`5.1 · stacked, the flag's box stands ${stackedTop(L).toFixed(2)}px into its row (it stood ${stackedTop(L0).toFixed(2)}) and beside its label ${besideTop.toFixed(2)} — both whole pixels`,
    ROW === 56 && PAD === 8 && rowGap === 2 && FLAG === 18 && whole(CSS) && stackedTop(L) === 30 && besideTop === 19 && near(stackedTop(L0), 29.75), j({ ROW, PAD, rowGap, L, FLAG }));
  ok(`5.2 · the label's line inside the head is ${L}px: 1.3 × ${body} = ${L0} rounded up to the next even pixel (the flag stands at 20 + L / 2, a whole pixel only for an even L)`,
    L === 2 * Math.ceil(L0 / 2) && L % 2 === 0);
  // The label's words do not move: its line keeps its centre, stacked and beside.
  const textTop = PAD + (BOX - (L0 + rowGap + FLAG)) / 2 - air;                    // the head's top, stacked, before
  const centreBefore = textTop + L0 / 2, centreAfter = PAD + (BOX - (L + rowGap + FLAG)) / 2 - air + L / 2;
  const besideLine = FLAG + 2 * air, besideHeadTop = PAD + (BOX - (besideLine - 2 * air)) / 2 - air;
  ok(`5.3 · the label's words do not move: stacked its line's centre stays ${centreBefore.toFixed(4)}px (now ${centreAfter.toFixed(4)}); beside, the head's line is the flag's ${besideLine.toFixed(2)}px either way, so its centre stays ${(besideHeadTop + besideLine / 2).toFixed(2)}`,
    near(centreBefore, centreAfter) && besideLine > L);
  // The block's ink: from the label's capitals (centred in its 1.3 line: `air` over them) to the flag's foot.
  const capTop = centreAfter - (L0 / 2) + air, foot = stackedTop(L) + FLAG;
  ok(`5.4 · the stacked block's ink stands ${capTop.toFixed(2)} | ${(ROW - foot).toFixed(2)} in the 56px row (8.25 | 8.25 before: the flag moved a quarter pixel down), and the row keeps its rung`,
    near(capTop, 8.25) && ROW - foot === 8 && stackedTop(L) + FLAG + PAD <= ROW);
  // TILE 297 (sw 390): the row y314–369. The model the readers' numbers fit: a box paints on the nearest row, words on the
  // row their baseline falls in. The flag's caps sit 12.06px under its box top (JetBrains Mono 8.5px in its 18px box).
  const capsBase = 1 + 3 + (18 - 2 - 6 - 9.5) / 2 + (9.5 - 8.5) / 2 + 7.31;
  const paint = (y: number) => ({ box: Math.round(y), base: Math.floor(y + capsBase) });
  const was = paint(314 + stackedTop(L0)), now = paint(314 + stackedTop(L));
  ok(`5.5 · tile 297 re-read: the box at ${(314 + stackedTop(L0)).toFixed(2)} painted on row ${was.box}, its caps' baseline on ${was.base} — ${was.base - was.box} rows under the box, a row short (the tile: box y344–361, caps 348.85–355.0); now ${now.box} and ${now.base}, ${now.base - now.box} rows, as the beside-its-label flag's 5.85 | 6.0 — CONFIRM IN BROWSER (/account, a signed-in player, sw, 390 × 780: the proposals row's INAKUJA box y344–361, its caps' baseline on y356)`,
    was.box === 344 && was.base === 355 && now.box === 344 && now.base === 356 && near(capsBase, 12.06, 0.01));
  // Every other journey flag lands on a whole pixel: the account menu's row (`py-2`, an 18px `text-body-sm` line), the
  // footer's (beside its link, measured centred 5.83 | 6.0).
  const bodySm = /"body-sm":\s*\["13px", \{ lineHeight: "(\d+)px"/.exec(TW)?.[1];
  ok(`5.6 · the account menu's flag lands on a whole pixel too: its row's line is ${bodySm}px, the flag's 18, so it stands ${(Number(bodySm) - 18) / 2}px into the line, one line or two`,
    Number(bodySm) === 18 && has("src/components/layout/avatar-menu.tsx", '"flex items-center gap-2.5 px-3 py-2 font-display text-body-sm text-text transition-colors"'));
  // PLANTS — on the stylesheet, read by the very check
  const noRule = CSS.replace(".kp-hub__head > .kp-hub__label { line-height: 20px; }", "");
  ok(`5.1′ PLANT · without the rule the stacked flag is back on ${stackedTop(headLine(noRule)).toFixed(2)}`, noRule !== CSS && !whole(noRule));
  const odd = CSS.replace(".kp-hub__head > .kp-hub__label { line-height: 20px; }", ".kp-hub__head > .kp-hub__label { line-height: 21px; }");
  ok(`5.2′ PLANT · an odd line (21px) lands it on ${stackedTop(headLine(odd)).toFixed(2)}`, odd !== CSS && !whole(odd));
}

/* ══ §6 · C6 · THE GUEST SHEET'S INGIA ═════════════════════════════════════════════════════════════════════════════════ */
section("6 · C6 the guest Tiketi sheet's Ingia is the ghost secondary its siblings are — `btn-outline` retired");
{
  const GS = "src/components/journey/tickets-guest-sheet.tsx", WS = "src/components/layout/wallet-sheet.tsx";
  const acts = (f: string) => parse(f).filter((e) => e.cls.includes("kp-wsheet__act"));
  const guest = acts(GS), wallet = acts(WS);
  ok("6.1 · Ingia is `btn btn-ghost btn-lg kp-wsheet__act` — the Wallet sheet's second action, exactly — and Jisajili the primary",
    guest.length === 2 && guest[0].cls.join(" ") === "btn btn-primary btn-lg kp-wsheet__act" && guest[1].cls.join(" ") === "btn btn-ghost btn-lg kp-wsheet__act"
      && wallet.some((e) => e.cls.join(" ") === guest[1].cls.join(" ")), j({ guest: guest.map((e) => e.cls), wallet: wallet.map((e) => e.cls) }));
  const header = parse("src/components/journey/journey-top-bar.tsx").find((e) => /t\.common\.signIn/.test(e.text) && e.tag === "Link");
  ok("6.2 · the header's Ingia is the ghost too: one sign-in action, one face", !!header && header.cls.includes("btn-ghost"), j(header?.cls));
  const users = walk("src", /\.(?:tsx|ts)$/).filter((f) => /\bbtn-outline\b/.test(code(f)));
  const rules = SHEETS.filter((f) => /\.btn-outline\b/.test(decommentCss(raw(f))));
  ok("6.3 · `btn-outline` is gone: no source draws it and no stylesheet defines it (its 1px `--brand-500` edge was the focus ring's own blue); the kit's spec says it is retired",
    users.length === 0 && rules.length === 0 && /RETIRED 2026-10-11[^\n]*`outline` variant/.test(raw("docs/design-system/v2-2026-07-27/02-components/buttons/spec.md")), j({ users, rules }));
  // Every action in the two sheets' pair is the primary, the struck gilt or the ghost — no third secondary.
  const pair = [...guest, ...wallet].map((e) => e.cls.find((c) => /^(?:btn-(?:primary|ghost|outline|aqua-ghost)|gilt-metal)$/.test(c)) ?? "‹none›");
  ok(`6.4 · every sheet action is the primary, the gilt or the ghost: ${j(pair)}`, pair.every((p) => ["btn-primary", "btn-ghost", "gilt-metal"].includes(p)));
  const planted = parse(GS, raw(GS).replace('className="btn btn-ghost btn-lg kp-wsheet__act"', 'className="btn btn-outline btn-lg kp-wsheet__act"')).filter((e) => e.cls.includes("kp-wsheet__act"));
  ok("6.1′ PLANT · `btn-outline` back on Ingia is reported", planted[1]?.cls.join(" ") !== wallet.find((e) => e.cls.includes("btn-ghost"))?.cls.join(" "));
}

/* ══ §7 · C7 · THE BONUS LENS ══════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · C7 the wallet's Bonus lens: offered when the book holds a bonus row (or while it is on), never as \"Bonasi 0\"");
{
  type Row = { id: string; type: string; status: string; token: string; amount: number; description: string; createdAtMs: number };
  const L = req("../src/lib/wallet/ledger.ts") as { visibleLedgerLenses: (r: Row[], current?: string) => readonly string[]; LEDGER_LENSES: readonly string[]; CONDITIONAL_LENSES: readonly string[] };
  const row = (type: string, i = 0): Row => ({ id: `t${i}`, type, status: "CONFIRMED", token: type, amount: 1000, description: "", createdAtMs: Date.UTC(2026, 9, 1) + i });
  const book = ["DEPOSIT", "BET_PLACED", "BET_PAYOUT", "BET_REFUND", "WITHDRAWAL"].map(row);
  type Rule = (r: Row[], current?: string) => readonly string[];
  /** 7.1's and 7.2's predicates over a rule, so a planted rule is judged by the very checks. */
  const hidesEmpty = (f: Rule) => { const w = f(book), b = f([...book, row("BONUS_CREDIT", 9)]); return !w.includes("bonus") && b.includes("bonus") && b.indexOf("bonus") === b.indexOf("refund") + 1; };
  const keepsCurrent = (f: Rule) => f(book, "bonus").includes("bonus") && !f(book, "all").includes("bonus");
  const without = L.visibleLedgerLenses(book), withBonus = L.visibleLedgerLenses([...book, row("BONUS_CREDIT", 9)]);
  ok(`7.1 · a book with no bonus row is offered ${without.length} lenses, no "bonus" (tile 172: "Bonasi 0" on a 19-row book); one with a \`BONUS_CREDIT\` row is offered "bonus", in its place`,
    hidesEmpty(L.visibleLedgerLenses) && j(L.CONDITIONAL_LENSES) === j(["bonus", "commission", "agentfee"]), j({ without, withBonus }));
  ok("7.2 · the lens being shown is always offered: `?type=bonus` on a window holding none keeps its pill (at 0), so the rail says which lens is on",
    keepsCurrent(L.visibleLedgerLenses) && has("src/app/wallet/page.tsx", "lenses={visibleLedgerLenses(bookRows, state.type)}"));
  ok("7.3 · CONTROL · the agent lenses keep their rule: `commission` with a commission row, `agentfee` with the fee, neither otherwise",
    L.visibleLedgerLenses([row("AGENT_COMMISSION")]).includes("commission") && L.visibleLedgerLenses([row("AGENT_REGISTRATION_FEE")]).includes("agentfee")
      && !without.includes("commission") && !without.includes("agentfee"));
  const { lensLabel } = req("../src/app/wallet/wallet-bar.tsx") as { lensLabel: (t: unknown, l: string) => string };
  const ghost = /<MoneyBarGhost t=\{t\} lenses=\{\[([^\]]*)\]\}/.exec(code("src/app/wallet/wallet-ghost.tsx"))?.[1] ?? "";
  const ghostKeys = [...ghost.matchAll(/t\.(\w+)\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`);
  const want = L.visibleLedgerLenses([]).map((l) => lensLabel(dict.sw, l));
  ok(`7.4 · the loading drawing's lenses are an empty book's: ${ghostKeys.length} (${want.join(" · ")})`,
    j(ghostKeys.map((k) => word("sw", k))) === j(want) && !ghostKeys.includes("wallet.typeBonus"), j({ ghostKeys, want }));
  // PLANTS: a rule as a source states it — its tables and its function, transpiled and run on their own.
  const LEDGER = raw("src/lib/wallet/ledger.ts");
  const ruleOf = (src: string): Rule => {
    const grab = (re: RegExp) => re.exec(src)?.[0] ?? "";
    const parts = [grab(/export const LEDGER_LENSES = [^\n]*\n/), grab(/export const LENS_TYPES[\s\S]*?\n\};\n/), grab(/export const CONDITIONAL_LENSES = [^\n]*\n/),
      grab(/export function visibleLedgerLenses[\s\S]*?\n\}\n/)].join("\n").replace(/^export /gm, "");
    const js = ts.transpileModule(parts, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
    return new Function(`${js}\nreturn visibleLedgerLenses;`)() as Rule;
  };
  ok("7.0 · CONTROL · the rule read from the source and run on its own agrees with the module", hidesEmpty(ruleOf(LEDGER)) && keepsCurrent(ruleOf(LEDGER)));
  // The rule before R9-C (the agent lenses only; `bonus` always offered), built from the source as the plants below are — never
  // read from git HEAD, which holds the old rule only until this change is committed.
  const agentOnly = LEDGER.replace("CONDITIONAL_LENSES.filter((lens) => lens !== current && !has(lens))", "CONDITIONAL_LENSES.filter((lens) => lens !== \"bonus\" && lens !== current && !has(lens))");
  ok("7.1′ PLANT · the rule before R9-C (the agent lenses only) offers \"bonus\" to the empty book — reported by 7.1", agentOnly !== LEDGER && !hidesEmpty(ruleOf(agentOnly)));
  const always = LEDGER.replace("CONDITIONAL_LENSES.filter((lens) => lens !== current && !has(lens))", "CONDITIONAL_LENSES.filter((lens) => lens === \"bonus\" || (lens !== current && !has(lens)))");
  ok("7.2′ PLANT · a rule that hides \"bonus\" whatever the rows is reported by 7.1 — a player with a prize or an invitation reward must still find it", always !== LEDGER && !hidesEmpty(ruleOf(always)));
  const deaf = LEDGER.replace("CONDITIONAL_LENSES.filter((lens) => lens !== current && !has(lens))", "CONDITIONAL_LENSES.filter((lens) => !has(lens))");
  ok("7.2″ PLANT · a rule deaf to the lens being shown is reported by 7.2", deaf !== LEDGER && hidesEmpty(ruleOf(deaf)) && !keepsCurrent(ruleOf(deaf)));
}

/* ══ §8 · THE RECORD ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · the record — no dictionary word changed; the classic chrome's files are the commit's own; the guard registered");
{
  ok("8.1 · src/lib/i18n-dict.ts is the commit's own — every word above is an existing key", HEAD("src/lib/i18n-dict.ts") === raw("src/lib/i18n-dict.ts"));
  const frozen = ["src/components/layout/top-app-bar.tsx", "src/components/layout/bottom-nav.tsx", "src/components/layout/live-ticker.tsx", "src/components/layout/nav-more.tsx",
    "src/components/layout/notifications-panel.tsx", "src/components/layout/wallet-balance-pill.tsx", "src/components/layout/avatar-menu.tsx", "src/components/layout/public-footer.tsx"];
  const changed = frozen.filter((f) => HEAD(f) !== raw(f));
  ok("8.2 · the classic chrome's files (header, rail, ticker, More, bell, capsule, avatar menu, footer) are the commit's own, byte for byte", changed.length === 0, j(changed));
  const pkg = JSON.parse(raw("package.json")) as { scripts: Record<string, string> };
  ok("8.3 · `test:visual-pass-r9c` is registered beside the other visual-pass guards", pkg.scripts["test:visual-pass-r9c"] === "tsx scripts/visual-pass-r9c.test.mts");
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
