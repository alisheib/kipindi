/**
 * ROUND 8 OF THE VISUAL PASS, FIXER B (2026-10-10, ALI-BLADE15) — every section heading in one ink. Ali's ruling (3) of
 * 2026-10-10: "Small section headings inside pages use about nine colours → one colour, like the page headings; status
 * words (errors, successes) keep their own colours." R7-B gave the page heads one ink, `--text-subtle` (§T3); this round
 * gives it to every heading inside the page, and to every label that names the figure beside it.
 *
 *   npx tsx scripts/visual-pass-r8b.test.mts        (npm run test:visual-pass-r8b)
 *
 *   §1  THE CENSUS — every `.eyebrow` element in player code, read through the TypeScript AST: every class its className
 *       can produce (each branch of a condition, a constant, an imported class table), its inline colour, the nearest ink
 *       above it in its own component, and whether its words are shown. Each computes the one section ink, or is a
 *       loading drawing whose words are not shown, or is REGISTERED with its role and its own inks: a status word, a bet's
 *       side, a stepper's state, a form field's label, a staff-only part of the kit. A new eyebrow in any other ink fails.
 *   §2  the stylesheet's eyebrows — the shared 0.14em list and every uppercase rule tracked like one — and every element
 *       that wears one: the one ink, or registered
 *   §3  the data labels: the system rules them no role of their own (read from the role gate and the census), so the
 *       `<Stat>` kit's labels wear the one ink too — rendered, every label style
 *   §4  the KYC gate panel: a state word keeps its tone's ink, a heading that names the step takes the one ink
 *   §5  rendered in sw, en and zh: Up & Down's card, the agent's worked example, the board's viz, the field label
 *   §6  contrast — the one ink on every surface a moved label sits on (≥ 4.5:1)
 *   §7  the record: DESIGN_AUTHORITY §T3, the superseded spec lines, no dictionary word changed
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r8/b/mutation-r8b.py
 * (S = the session scratchpad): each defect planted on disk, caught on its named check, every file restored byte-identical.
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
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const j = (v: unknown) => JSON.stringify(v);
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});
/** The player's code: the admin console, the server's artefacts and the campaign tooling are out of the visual pass. */
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const PLAYER_TSX = walk("src", /\.tsx$/).filter((f) => !OUT.test(f));
const CSS = decommentCss(raw("src/app/globals.css"));
const CHAT_CSS = decommentCss(raw("src/styles/chat/chat-styles.css"));
const ONE_INK = "text-text-subtle";

/* ══ THE AST READER ═════════════════════════════════════════════════════════════════════════════════════════════════ */
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
  if (ts.isIdentifier(n)) { const c = consts.get(n.text); return c && !object(n) ? strs(c, consts, depth + 1) : []; }
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
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : null;
    if (!base) continue;
    const target = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((p) => { try { return statSync(p).isFile(); } catch { return false; } });
    if (!target) continue;
    const theirs = constsOf(target, raw(target), depth + 1);
    for (const el of st.importClause.namedBindings.elements) {
      const found = theirs.get((el.propertyName ?? el.name).text);
      if (found && !consts.has(el.name.text)) consts.set(el.name.text, found);
    }
  }
  return consts;
}
type El = { file: string; line: number; tag: string; cls: string[]; clsSrc: string; style: string; parent: El | null; node: ts.JsxElement | ts.JsxSelfClosingElement; text: string };
/** Every JSX element of one source (comments are not elements: the AST does not see them), with its parent inside its own
 *  component — a `.map(…)` callback keeps the element it is written in as the parent; an attribute's JSX starts afresh. */
function parse(file: string, src: string): El[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // ⛔ A PLANTED SOURCE READS ITS OWN CONSTANTS. The cache is keyed by file, so a plant that edits a class constant (the
  // round page's `eyebrow` table) was read through the file's cached, unplanted one — and the plant went unseen.
  const planted = src !== raw(file);
  const consts = constsOf(planted ? `${file}#planted` : file, src);
  if (planted) constCache.delete(`${file}#planted`);
  const out: El[] = [];
  const visit = (n: ts.Node, parent: El | null) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n;
      const attr = (name: string) => open.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === name) as ts.JsxAttribute | undefined;
      const cA = attr("className"), sA = attr("style");
      const el: El = {
        file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, tag: open.tagName.getText(sf),
        cls: (cA?.initializer ? strs(cA.initializer, consts) : []).flatMap((s) => s.split(/\s+/)).filter(Boolean),
        clsSrc: cA?.initializer ? squash(cA.initializer.getText(sf)) : "",
        style: sA?.initializer ? squash(sA.initializer.getText(sf)) : "", parent, node: n,
        text: ts.isJsxElement(n) ? squash(n.children.map((c) => c.getText(sf)).join("")).trim() : "",
      };
      out.push(el);
      if (ts.isJsxElement(n)) for (const c of n.children) visit(c, el);
      for (const p of open.attributes.properties) if (ts.isJsxAttribute(p) && p.initializer && ts.isJsxExpression(p.initializer)) p.initializer.forEachChild((k) => visit(k, null));
      return;
    }
    if (ts.isJsxFragment(n)) { n.children.forEach((c) => visit(c, parent)); return; }
    n.forEachChild((k) => visit(k, parent));
  };
  sf.forEachChild((n) => visit(n, null));
  return out;
}
/** A class that paints the words' ink — at rest or at some width (an interaction variant is not the resting ink). */
const NOT_INK = /^(?:micro|caption|label|body-sm|body|body-lg|title-sm|title-md|title-lg|display-[123]|\[[0-9.]+px\]|left|right|center|justify|start|end|balance|pretty|wrap|nowrap|ellipsis|clip)$/;
const INTERACTION = /(?:^|:)(?:hover|focus|focus-visible|focus-within|active|visited|disabled|group-hover|peer-hover|group-focus|aria-[\w-]+|data-[\w-]+|placeholder|selection|marker|file|open):/;
const inkOf = (c: string): string | null => {
  if (c.startsWith("‹")) return c;
  const m = /^((?:[a-z0-9-]+:)*)text-(.+)$/.exec(c);
  if (!m || NOT_INK.test(m[2]) || INTERACTION.test(m[1])) return null;
  return c;
};
const inksOf = (cls: string[]) => [...new Set(cls.map(inkOf).filter((x): x is string => !!x))].sort();
const styleColor = (style: string) => /\bcolor:\s*([^,}]+?)\s*(?:,|\}|$)/.exec(style)?.[1]?.trim() ?? "";
/** Are the element's words drawn? Not when every child is a GhostText (words set and not shown), an empty box, or such
 *  an element in turn — the R5-K ghosts — and not when an ancestor in the component is `text-transparent` with no ink
 *  between it and the words. */
function wordsShown(el: El): boolean {
  const hiddenNode = (n: ts.Node): boolean => {
    if (ts.isJsxText(n)) return !n.text.trim();
    if (ts.isJsxSelfClosingElement(n)) return true;
    if (ts.isJsxElement(n)) {
      if (n.openingElement.tagName.getText() === "GhostText") return true;
      return n.children.every(hiddenNode);
    }
    if (ts.isJsxExpression(n)) return !n.expression;
    return false;
  };
  if (ts.isJsxElement(el.node) && el.node.children.every(hiddenNode)) return false;
  if (inksOf(el.cls).length || styleColor(el.style)) return true;
  for (let p = el.parent; p; p = p.parent) {
    if (p.cls.includes("text-transparent")) return false;
    if (inksOf(p.cls).length || styleColor(p.style)) return true;
  }
  return true;
}
type Site = { file: string; line: number; tag: string; text: string; clsSrc: string; inks: string[]; via: string; shown: boolean; ghost: boolean };
/** What one eyebrow element computes: its own ink (all branches), else its inline colour, else the nearest ink above it. */
function siteOf(el: El): Site {
  const own = inksOf(el.cls), sc = styleColor(el.style);
  let inks: string[] = [], via = "own";
  if (sc) { inks = [`style:${sc}`]; via = "style"; }
  else if (own.length) inks = own;
  else {
    via = "root";
    for (let p = el.parent; p; p = p.parent) {
      const pi = inksOf(p.cls), ps = styleColor(p.style);
      if (ps || pi.length) { inks = ps ? [`style:${ps}`] : pi; via = `inherited@${p.line}`; break; }
    }
  }
  const ghost = /(?:^|\/)loading\.tsx$|ghost/i.test(el.file);
  return { file: el.file, line: el.line, tag: el.tag, text: el.text, clsSrc: el.clsSrc, inks, via, shown: wordsShown(el), ghost };
}
const eyebrowSites = (file: string, src: string) => parse(file, src).filter((e) => e.cls.includes("eyebrow")).map(siteOf);

/* ══ §1 · THE CENSUS ════════════════════════════════════════════════════════════════════════════════════════════════ */
section("1 · THE CENSUS — every `.eyebrow` in player code computes the one section ink, or is registered with its role");
type Role = "STATUS" | "STEPPER" | "SIDE" | "FORM" | "STAFF";
const ST = req("../src/lib/status-tone.ts") as { playerStatusInk: (w: string) => string | null };
const CLOSED_INK = ST.playerStatusInk("CLOSED") ?? "‹none›";
/** The sites that keep an ink of their own, each with the role that keeps it (the census's other answer). `key` is a
 *  snippet of the element's words or class source that names it in its file; `inks` is exactly what it computes. */
const REGISTRY: Array<{ file: string; key: string; role: Role; inks: string[]; why: string }> = [
  { file: "src/app/markets/[id]/page.tsx", key: "{t.market.selectionClosedBadge}", role: "STATUS", inks: [CLOSED_INK],
    why: "\"Selection closed\" — the market's state, in the CLOSED word's own ink (`playerStatusInk(\"CLOSED\")`, royal)" },
  { file: "src/app/markets/[id]/page.tsx", key: "{t.market.closedAwaitingSettlement}", role: "STATUS", inks: [CLOSED_INK],
    why: "\"Closed · awaiting settlement\" — the market's state, in the CLOSED word's ink" },
  { file: "src/components/auth/auth-panel.tsx", key: "{icon}{eyebrow}", role: "STATUS", inks: ["text-danger-fg", "text-success-fg", ONE_INK],
    why: "AuthHeader: a page's name in the one ink by default; \"Link expired\" / \"Email confirmed\" in their state's (R7-B)" },
  { file: "src/components/kyc/kyc-gate-panel.tsx", key: "{copy.eyebrow}", role: "STATUS", inks: [ONE_INK, "‹tone.ink›"],
    why: "a state word (\"Your move\", \"With our team\", \"Withdrawals paused\") in its tone's ink; a heading in the one ink (§4)" },
  { file: "src/components/markets/operation-result-modal.tsx", key: "{eyebrow}", role: "STATUS", inks: ["style:tone.fg"],
    why: "the result's outcome line (\"Bet placed\", a failure) — said in its crest's tone" },
  { file: "src/components/ui/unsaved-changes.tsx", key: "{savedNow?.text}", role: "STATUS", inks: ["text-success-fg"], why: "\"Saved\" — a success" },
  { file: "src/components/ui/unsaved-changes.tsx", key: "{shownLabel}", role: "STATUS", inks: ["text-warning-fg"], why: "\"Unsaved changes\" — somebody must act" },
  { file: "src/app/profile/kyc/page.tsx", key: "{node.label}", role: "STEPPER", inks: ["text-brand-300", "text-text", ONE_INK],
    why: "the KYC rail: a done step `--text`, the current step brand, a step to come the one ink — the step's state" },
  { file: "src/app/fairness/page.tsx", key: "{s.label}", role: "STEPPER", inks: ["text-brand-300", ONE_INK],
    why: "the provably-fair chain: drawn as the KYC rail's current step (R5-C) — the seal brand, every other step the one ink" },
  { file: "src/components/markets/conviction-dial.tsx", key: "t.market.sideYesWord.toUpperCase()", role: "SIDE", inks: [],
    why: "the dial's poles: the side the stake leans to in its betting ink, the rest `var(--text-subtle)` (inline, per span)" },
  { file: "src/components/onboarding/first-visit-primer.tsx", key: "{poolYes}", role: "SIDE", inks: ["style:\"oklch(70% 0.12 152)\""], why: "the YES pool — a bet's side" },
  { file: "src/components/onboarding/first-visit-primer.tsx", key: "{poolNo}", role: "SIDE", inks: ["style:\"oklch(70% 0.14 22)\""], why: "the NO pool — a bet's side" },
  { file: "src/components/updown/updown-card.tsx", key: "{t.market.udUp}", role: "SIDE", inks: ["style:\"var(--yes-300)\""], why: "UP — a bet's side, over its target" },
  { file: "src/components/updown/updown-card.tsx", key: "{t.market.udDown}", role: "SIDE", inks: ["style:\"var(--no-300)\""], why: "DOWN — a bet's side, over its target" },
  { file: "src/components/ui/field-legend.tsx", key: "{children}", role: "FORM", inks: ["text-text-muted"],
    why: "the form field's label (the Field atom's): it names a control, not a block — the kit's form-label ink" },
  { file: "src/components/ui/modal.tsx", key: "{typeLabel}", role: "STAFF", inks: ["text-claret-300"],
    why: "the hard tier's type-to-confirm label (claret: an act that cannot be taken back, §B4a) — no player caller" },
  { file: "src/components/ui/datetime-range-filter.tsx", key: "{t.common.rangeFrom}", role: "STAFF", inks: ["text-text-faint"], why: "the range filter's \"From\" — only the console draws it" },
  { file: "src/components/ui/datetime-range-filter.tsx", key: "{t.common.rangeTo}", role: "STAFF", inks: ["text-text-faint"], why: "the range filter's \"To\" — only the console draws it" },
];
const keyed = (s: Site, key: string) => s.text.includes(key) || s.clsSrc.includes(key);
/** The words a loading drawing SHOWS: its page's name, where the drawing knows it (R5-K's one rule; R7-B's heads) — every
 *  other line of a drawing is set and not shown. */
const GHOST_HEADS: Array<[string, string]> = [
  ["src/app/live/loading.tsx", "{t.common.live}"],
  ["src/app/markets/loading.tsx", "{t.market.title}"],
  ["src/app/results/loading.tsx", "{t.results.title}"],
];
type Verdict = { site: Site; verdict: string; bad?: string };
/** The census's judgement over a set of sites: the one ink, a drawing whose words are not shown, or a registered role. */
function judge(sites: Site[]): { verdicts: Verdict[]; stale: string[] } {
  const used = new Map<number, number>();
  const verdicts = sites.map((s): Verdict => {
    const ri = REGISTRY.findIndex((r) => r.file === s.file && keyed(s, r.key));
    if (ri >= 0) {
      used.set(ri, (used.get(ri) ?? 0) + 1);
      const r = REGISTRY[ri];
      return j(s.inks) === j([...r.inks].sort()) ? { site: s, verdict: r.role } : { site: s, verdict: r.role, bad: `registered ${j(r.inks)}, computes ${j(s.inks)}` };
    }
    if (!s.shown) {
      // A drawing whose words are set and not shown: it may carry no ink but the one (R5-L: the ghost's row is the page's
      // classes, and r5l pairs them WITHOUT the ink) — never a stale copy of another.
      const own = s.via === "own" ? s.inks : [];
      return own.every((i) => i === ONE_INK) ? { site: s, verdict: "GHOST" } : { site: s, verdict: "GHOST", bad: `a drawing carries ${j(own)}` };
    }
    if (s.ghost && !GHOST_HEADS.some(([f, k]) => f === s.file && keyed(s, k))) return { site: s, verdict: "GHOST", bad: "a drawing shows words that are not its page's name" };
    if (j(s.inks) === j([ONE_INK])) return { site: s, verdict: "ONE INK" };
    return { site: s, verdict: "?", bad: s.inks.length ? `computes ${j(s.inks)} (${s.via})` : "no ink of its own or above it — it would wear its caller's" };
  });
  const stale = REGISTRY.filter((_, i) => (used.get(i) ?? 0) !== 1).map((r) => `${r.file} · ${r.key} matched ${used.get(REGISTRY.indexOf(r)) ?? 0}×`);
  return { verdicts, stale };
}
const SITES = PLAYER_TSX.flatMap((f) => (/\beyebrow\b/.test(raw(f)) ? eyebrowSites(f, raw(f)) : []));
const census = judge(SITES);
const bad = census.verdicts.filter((v) => v.bad);
const count = (v: string) => census.verdicts.filter((x) => x.verdict === v).length;
console.log(`     ${SITES.length} eyebrow elements in ${new Set(SITES.map((s) => s.file)).size} player files: ${count("ONE INK")} the one ink · ${count("GHOST")} drawings (words not shown) · `
  + `${count("STATUS")} status · ${count("STEPPER")} stepper · ${count("SIDE")} side · ${count("FORM")} form label · ${count("STAFF")} staff-only`);
ok(`1.1 · CENSUS · every one of the ${SITES.length} eyebrow elements in player code computes \`--text-subtle\` (all branches, inherited or own), is a drawing whose words are not shown, or is registered with its role`,
  SITES.length >= 150 && bad.length === 0, j(bad.map((b) => `${b.site.file}:${b.site.line} ${b.bad}`)));
ok(`1.2 · the registry is exact — each of its ${REGISTRY.length} entries names one site, none stale`, census.stale.length === 0, j(census.stale));
ok("1.3 · the section heads the round moved are in it, in the one ink: /live's two, the invite cards' two, the bell's panel title, the Lipa panel's four",
  ["src/app/live/featured-contest.tsx", "src/app/live/page.tsx", "src/app/profile/invite/agent-dashboard.tsx", "src/app/profile/invite/page.tsx",
    "src/components/layout/notifications-panel.tsx", "src/components/pay/lipa-qr-panel.tsx"].every((f) => {
    const own = census.verdicts.filter((v) => v.site.file === f);
    return own.length > 0 && own.every((v) => v.verdict === "ONE INK");
  }));
ok("1.4 · the data labels the round moved are in it, in the one ink: Up & Down's (card, round, history, pods), the wallet's rows, the agent's worked example, the board's viz",
  ["src/app/updown/[roundId]/page.tsx", "src/app/updown/history/page.tsx", "src/app/wallet/wallet-client.tsx", "src/components/agent/commission-waterfall.tsx",
    "src/components/charts/board-viz.tsx", "src/components/updown/price-hero.tsx", "src/components/updown/round-countdown.tsx", "src/components/updown/round-stake-panel.tsx",
    "src/components/updown/updown-stake-controls.tsx"].every((f) => census.verdicts.filter((v) => v.site.file === f).every((v) => v.verdict === "ONE INK"))
    && census.verdicts.filter((v) => v.site.file === "src/components/updown/updown-card.tsx" && v.verdict !== "SIDE").every((v) => v.verdict === "ONE INK"));
{
  // Plants, each through the census's own reader: an old ink back on a section head, a data label, a new head in a new ink,
  // a ghost that would show its words, a registered state line whose state ink is gone.
  const plant = (file: string, from: string, to: string) => {
    const src = raw(file);
    if (!src.includes(from)) return `‹${file} no longer holds the plant's anchor›`;
    const r = judge(eyebrowSites(file, src.replace(from, to)));
    return r.verdicts.filter((v) => v.bad).map((v) => `${v.site.line} ${v.bad}`).join(" | ") || "";
  };
  const P: Array<[string, string, string, string]> = [
    ["/live's heading back in aqua", "src/app/live/page.tsx", "eyebrow font-bold text-text-subtle\">{t.market.priceCompetition}", "eyebrow font-bold text-aqua-300\">{t.market.priceCompetition}"],
    ["the wallet row's data label back in faint", "src/app/wallet/wallet-client.tsx", "uppercase eyebrow text-text-subtle\">{t.wallet.amount}", "uppercase eyebrow text-text-faint\">{t.wallet.amount}"],
    ["the round page's label table back in faint", "src/app/updown/[roundId]/page.tsx", "uppercase eyebrow text-text-subtle\";", "uppercase eyebrow text-text-faint\";"],
    ["a royal invite label", "src/app/profile/invite/page.tsx", "eyebrow font-bold text-text-subtle\">{t.common.invite}", "eyebrow font-bold text-royal-300/80\">{t.common.invite}"],
    ["the bell panel's title back in the text's white", "src/components/layout/notifications-panel.tsx", "uppercase eyebrow text-text-subtle min-w-0 truncate", "uppercase eyebrow text-text min-w-0 truncate"],
    ["the fairness chain's plain steps back in muted", "src/app/fairness/page.tsx", "\"text-brand-300\" : \"text-text-subtle\"", "\"text-brand-300\" : \"text-text-muted\""],
    ["a new eyebrow with no ink of its own (it would wear its caller's)", "src/components/agent/commission-waterfall.tsx", "uppercase eyebrow text-text-subtle kp-track-end\">{t.agent.wfEyebrow}", "uppercase eyebrow kp-track-end\">{t.agent.wfEyebrow}"],
    ["a ghost row that would show its words (an ink on the hidden label)", "src/components/ui/query-bar-ghost.tsx", "shrink-0 font-mono text-micro font-bold uppercase eyebrow\">{label}", "shrink-0 font-mono text-micro font-bold uppercase eyebrow text-text-muted\">{label}"],
    ["a ghost row that would show its words even in the one ink", "src/components/ui/query-bar-ghost.tsx", "shrink-0 font-mono text-micro font-bold uppercase eyebrow\">{label}", "shrink-0 font-mono text-micro font-bold uppercase eyebrow text-text-subtle\">{label}"],
    ["a section head at one width only (`sm:text-text-faint`)", "src/app/updown/history/page.tsx", "uppercase eyebrow text-text-subtle\">{t.market.udRoundsPlayed}", "uppercase eyebrow text-text-subtle sm:text-text-faint\">{t.market.udRoundsPlayed}"],
  ];
  const missed = P.filter(([, f, a, b]) => plant(f, a, b) === "").map(([n]) => n);
  ok(`1.1′ PLANT · ${P.length} defects, each reported by the census: ${P.map(([n]) => n).join(" · ")}`, missed.length === 0, j(missed));
  const closedNow = raw("src/app/markets/[id]/page.tsx");
  const r = judge(eyebrowSites("src/app/markets/[id]/page.tsx", closedNow.replace(/eyebrow font-bold text-brand-300">(\s*\{t\.market\.selectionClosedBadge\})/, 'eyebrow font-bold text-text-muted">$1')));
  ok("1.2′ PLANT · a registered state line in another ink than its state's (the CLOSED word's) is reported",
    r.verdicts.some((v) => v.bad && /selectionClosedBadge/.test(v.site.text)));
  ok("1.2″ CONTROL · the CLOSED word's ink is the dictionary's royal word ink, `TONE_INK.royal`", CLOSED_INK === "text-brand-300", CLOSED_INK);
  // The staff-only kit parts stay staff-only: no player file draws the hard tier, none imports the range filter.
  const hardTier = PLAYER_TSX.filter((f) => f !== "src/components/ui/modal.tsx" && /tier[=:]\s*["{]?\s*"?hard\b|\btypedWord[=:]/.test(code(f)));
  const range = PLAYER_TSX.filter((f) => f !== "src/components/ui/datetime-range-filter.tsx" && /from "@\/components\/ui\/datetime-range-filter"|<DateTimeRangeFilter\b/.test(code(f)));
  ok("1.5 · the STAFF entries are staff-only: no player file asks for the confirm's hard tier or draws the range filter (else their labels need a ruling)",
    hardTier.length === 0 && range.length === 0, j({ hardTier, range }));
  ok("1.5′ PLANT · a player page drawing the range filter is reported", /<DateTimeRangeFilter\b/.test("<DateTimeRangeFilter value={v} />"));
}

/* ══ §2 · THE STYLESHEET'S EYEBROWS ═════════════════════════════════════════════════════════════════════════════════ */
section("2 · the stylesheet's eyebrows — the shared 0.14em list and every uppercase rule tracked like one — wear the one ink");
type Rule = { sel: string; body: string; sheet: string };
const rulesOf = (css: string, sheet: string): Rule[] => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap((m) => m[1].split(",").map((s) => ({ sel: s.trim().replace(/\s+/g, " "), body: m[2], sheet })));
const RULES = [...rulesOf(CSS, "globals.css"), ...rulesOf(CHAT_CSS, "chat-styles.css")];
/** The shared 0.14em rule's own selectors (the list beside `.eyebrow.eyebrow`). */
const SHARED = (() => {
  const m = /\.eyebrow\.eyebrow,([^{]*)\{\s*letter-spacing:\s*0\.14em;\s*\}/.exec(CSS);
  return m ? m[1].split(",").map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean) : [];
})();
/** A stylesheet eyebrow: a selector in the shared list, or an uppercase rule tracked at §T3's 0.14em. */
const CSS_EYEBROWS = [...new Set([...SHARED, ...RULES.filter((r) => /text-transform:\s*uppercase/.test(r.body) && /letter-spacing:\s*0\.14em/.test(r.body)).map((r) => r.sel)])];
/** The colour a stylesheet eyebrow paints: the last `color` its exact selector declares, else its base class's. */
const cssInk = (sel: string): string => {
  const base = sel.replace(/::?[\w-]+(?:\([^)]*\))?$/, "");
  const decl = RULES.filter((r) => (r.sel === sel || r.sel === base) && /(?:^|[;\s])color:/.test(r.body)).map((r) => /(?:^|[;\s])color:\s*([^;]+)/.exec(r.body)?.[1]?.trim() ?? "");
  return decl.length ? decl[decl.length - 1] : "‹inherits›";
};
const CSS_REGISTRY: Record<string, { ink: string; why: string }> = {
  ".admin-tbl thead": { ink: "var(--text-subtle)", why: "the console's table heads (out of the visual pass; in the one ink all the same)" },
  ".kp-hero__claim-text": { ink: "‹inherits›", why: "the landing's brand claim beside the 50 mark, in `.kp-hero__claim`'s `--text` — a claim, not a label over a block (R7-B's register)" },
  ".mcardp-pctcap": { ink: "var(--yes-400)", why: "the YES side's word under its price (`.mcardp-pctcap--result`, the settled card's \"Result\", is the one ink)" },
  ".cm-handoff-rule": { ink: "var(--chat-text-subtle)", why: "the chat layer's own vocabulary (§0d): the handoff divider — OWNER QUESTION, R8-B report" },
  ".cm-rg-label": { ink: "var(--pearl)", why: "the chat's responsible-gambling card label, pearl as its edge — an RG surface: OWNER QUESTION, R8-B report" },
};
{
  const wrong = CSS_EYEBROWS.filter((sel) => {
    const ink = cssInk(sel), reg = CSS_REGISTRY[sel];
    return reg ? reg.ink !== ink : ink !== "var(--text-subtle)";
  }).map((sel) => `${sel} → ${cssInk(sel)}`);
  ok(`2.1 · the ${CSS_EYEBROWS.length} stylesheet eyebrows paint \`--text-subtle\`, or are registered (${Object.keys(CSS_REGISTRY).length}: the console's table head, the landing's claim, the YES caption, the chat layer's two)`,
    SHARED.length >= 11 && CSS_EYEBROWS.length >= 14 && wrong.length === 0, j({ wrong, shared: SHARED.length, all: CSS_EYEBROWS.length }));
  ok("2.1′ CONTROL · the settled card's caption is the one ink; the chat's two are read (an owner question, not silence)",
    /\.mcardp-pctcap--result \{ color: var\(--text-subtle\); \}/.test(CSS) && CSS_EYEBROWS.includes(".cm-rg-label") && CSS_EYEBROWS.includes(".cm-handoff-rule"));
  // Every element that wears a stylesheet eyebrow keeps its ink: no utility or inline colour other than the one ink.
  const cssEyebrowClasses = CSS_EYEBROWS.map((s) => /^\.([\w-]+)$/.exec(s)?.[1]).filter((c): c is string => !!c && !(c in CSS_REGISTRY));
  const overrides: string[] = [];
  for (const f of PLAYER_TSX) {
    const src = raw(f);
    if (!cssEyebrowClasses.some((c) => src.includes(c))) continue;
    for (const el of parse(f, src)) {
      if (!el.cls.some((c) => cssEyebrowClasses.includes(c))) continue;
      const own = inksOf(el.cls), sc = styleColor(el.style);
      if (own.some((i) => i !== ONE_INK) || (sc && sc !== "\"var(--text-subtle)\"")) overrides.push(`${f}:${el.line} ${j(own)} ${sc}`);
    }
  }
  ok("2.2 · no element that wears a stylesheet eyebrow (`.gilt-eyebrow`, `.kp-mine__eyebrow`, `.kp-wsheet__label`…) paints over it in another ink", overrides.length === 0, j(overrides));
  const planted = CSS.replace(/\.gilt-eyebrow \{([^}]*)color: var\(--text-subtle\);/, ".gilt-eyebrow {$1color: var(--text-faint);");
  const plantedInk = (() => { const decl = rulesOf(planted, "globals.css").filter((r) => r.sel === ".gilt-eyebrow" && /color:/.test(r.body)); return /color:\s*([^;]+)/.exec(decl[decl.length - 1]?.body ?? "")?.[1]?.trim(); })();
  ok("2.1″ PLANT · `.gilt-eyebrow` in faint is read as faint", planted !== CSS && plantedInk === "var(--text-faint)", String(plantedInk));
}

/* ══ §3 · THE DATA LABELS ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · a data label is no role of its own — it wears the one ink, the `<Stat>` kit's labels included");
{
  // THE READ, IN NUMBERS (S/r8/b/census-before.tsv and table.md, at 3884bce3): the 76 `.eyebrow` labels that name a figure
  // beside or under them (a table's column heads included) wore four inks — 39 `--text-subtle` (2 by inheritance), 32
  // `--text-faint` (Up & Down, the wallet's rows, the worked example's columns), 3 `--text-tertiary` (the Lipa panel; =
  // `--text-muted`), 2 royal-300 at 80% (the share cards) — and the kit's own `<Stat>` labels two: 37 player call sites
  // subtle, 11 faint (its default `micro`, the wallet's dialect). No ink was the data label's, and the role gate names no
  // such role: its roles are below, and a label with `.eyebrow` IS its section eyebrow.
  const roles = new Set([...raw("scripts/design-gate/eyebrow-roles.mjs").matchAll(/"([A-Z][A-Z_]+)"\]/g)].map((m) => m[1]));
  ok(`3.1 · the role gate's roles are ${j([...roles].sort())} — none is a data label (a \`.eyebrow\` site is the gate's section eyebrow)`,
    roles.size >= 5 && ![...roles].some((r) => /DATA|LABEL$/.test(r) && r !== "CONTROL_LABEL") && roles.has("CONTROL_LABEL") && roles.has("STATUS_CHIP"), j([...roles]));
  const STAT = code("src/components/ui/stat.tsx");
  const labelMap = Object.fromEntries([...(/const LABEL: Record<StatLabel, string> = \{([^}]*)\}/.exec(STAT)?.[1] ?? "").matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const statInks = (map: Record<string, string>) => Object.entries(map).filter(([, cls]) => j(inksOf(cls.split(/\s+/))) !== j([ONE_INK])).map(([k]) => k);
  ok(`3.2 · the \`<Stat>\` kit: all ${Object.keys(labelMap).length} label styles wear the one ink (\`micro\`, the default, and the wallet's were faint)`,
    Object.keys(labelMap).length === 8 && statInks(labelMap).length === 0, j(statInks(labelMap)));
  ok("3.2′ PLANT · a style back in faint is reported", statInks({ ...labelMap, micro: "text-[9px] tracking-[0.10em] text-text-faint" }).join() === "micro");
  ok("3.3 · no label style is named for an ink it does not draw: the wallet's `faint` is `plain` (9.5px, regular, 0.10em), and its two callers say so",
    !("faint" in labelMap) && labelMap.plain === "text-[9.5px] tracking-[0.10em] text-text-subtle" && /export type StatLabel = "micro" \| "tiny" \| "plain" \|/.test(STAT)
      && (code("src/app/wallet/wallet-client.tsx").match(/labelStyle="plain"/g) ?? []).length === 2 && !PLAYER_TSX.some((f) => /labelStyle="faint"/.test(code(f))));
  const React = req("react") as typeof import("react");
  const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
  const { Stat } = req("../src/components/ui/stat.tsx") as { Stat: (p: Record<string, unknown>) => unknown };
  const rendered = Object.keys(labelMap).map((style) => {
    const html = renderToStaticMarkup(React.createElement(Stat as never, { label: "STAKE", value: "TZS 1,000", labelStyle: style } as never));
    const cls = /<p class="(stat-label [^"]*)">STAKE<\/p>/.exec(html)?.[1] ?? "";
    return { style, inks: inksOf(cls.split(/\s+/)) };
  });
  ok("3.4 EXECUTED · every `<Stat>` label renders in the one ink and no other", rendered.every((r) => j(r.inks) === j([ONE_INK])), j(rendered.filter((r) => j(r.inks) !== j([ONE_INK]))));
  ok("3.5 CONTROL · the figure keeps its own ink (`--text`) and the hint the one ink", (() => {
    const html = renderToStaticMarkup(React.createElement(Stat as never, { label: "x", value: "1", hint: "h" } as never));
    return /class="[^"]*\btext-text\b[^"]*">1<\/p>/.test(html) && /class="[^"]*\btext-text-subtle\b[^"]*">h<\/p>/.test(html);
  })());
}

/* ══ §4 · THE KYC GATE PANEL ════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · the KYC gate panel — a state word keeps its tone's ink; a heading that names the step takes the one ink");
{
  const F = "src/components/kyc/kyc-gate-panel.tsx";
  /** The dictionary keys that ARE a state: "Your move" (an act is owed), "With our team" (the case is with us),
   *  "Withdrawals paused" (a hold). The others name the step: "Before you withdraw", "One step first", "Identity check". */
  const STATE_KEYS = new Set(["eyebrowAction", "eyebrowPending", "frozenEyebrow"]);
  const HEADING_KEYS = new Set(["eyebrowPayout", "eyebrowVerify", "eyebrowIdentity"]);
  const readCopy = (src: string) => {
    const sf = ts.createSourceFile(F, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let obj: ts.ObjectLiteralExpression | undefined;
    sf.forEachChild(function v(n: ts.Node) {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "copy" && n.initializer && ts.isElementAccessExpression(n.initializer)
        && ts.isObjectLiteralExpression(n.initializer.expression)) obj = n.initializer.expression;
      n.forEachChild(v);
    });
    return (obj?.properties ?? []).filter(ts.isPropertyAssignment).map((p) => {
      const o = p.initializer as ts.ObjectLiteralExpression;
      const get = (k: string) => (o.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText(sf) === k) as ts.PropertyAssignment | undefined)?.initializer;
      return { state: p.name.getText(sf), eyebrow: get("eyebrow"), stateWord: get("stateWord")?.getText(sf) ?? "‹none›", sf };
    });
  };
  /** What `stateWord` must say for an eyebrow expression: true / false, or `!payout` / `payout` for a conditional pair. */
  const expected = (e: ts.Expression | undefined, sf: ts.SourceFile): string => {
    const key = (x: ts.Expression) => /t\.kycGate\.(\w+)$/.exec(x.getText(sf))?.[1] ?? "?";
    const isState = (k: string) => (STATE_KEYS.has(k) ? true : HEADING_KEYS.has(k) ? false : null);
    if (!e) return "‹no eyebrow›";
    if (ts.isConditionalExpression(e) && e.condition.getText(sf) === "payout") {
      const a = isState(key(e.whenTrue)), b = isState(key(e.whenFalse));
      if (a === null || b === null) return "‹unread key›";
      return a === b ? String(a) : a ? "payout" : "!payout";
    }
    const s = isState(key(e));
    return s === null ? "‹unread key›" : String(s);
  };
  const verify = (src: string) => readCopy(src).map((c) => ({ state: c.state, want: expected(c.eyebrow, c.sf), got: c.stateWord })).filter((r) => r.want !== r.got);
  const SRC = raw(F);
  const states = readCopy(SRC).map((c) => c.state);
  ok(`4.1 · each of the ${states.length} states says which its eyebrow is: a state word (pending review, more info, rejected, a hold, the agent's upload) keeps the tone, a heading (not started, the payout's upload, the final refusal, the e-mail, the agent's photo upgrade) does not`,
    // 8 → 9 on 2026-10-10 (typed-only identity): `photo_upgrade` — an applicant verified from typed details, asked for the
    // photos — opens "One step first", a heading.
    states.length === 9 && verify(SRC).length === 0, j(verify(SRC)));
  ok("4.2 · the eyebrow draws the tone's ink only for a state word: `${copy.stateWord ? tone.ink : \"text-text-subtle\"}`",
    has(F, '<p className={`mt-3 font-mono text-micro uppercase eyebrow font-bold ${copy.stateWord ? tone.ink : "text-text-subtle"}`}>{copy.eyebrow}</p>'));
  ok("4.2′ PLANT · the round-7 line (every eyebrow in the tone's ink) is reported",
    !squash(decomment(SRC.replace('${copy.stateWord ? tone.ink : "text-text-subtle"}', "${tone.ink}"))).includes(squash('${copy.stateWord ? tone.ink : "text-text-subtle"}')));
  ok("4.1′ PLANT · \"Before you withdraw\" marked a state word, and \"Your move\" marked a heading, are each reported",
    verify(SRC.replace("eyebrow: t.kycGate.eyebrowPayout,   stateWord: false", "eyebrow: t.kycGate.eyebrowPayout,   stateWord: true")).length === 1
      && verify(SRC.replace("eyebrow: t.kycGate.eyebrowAction,  stateWord: true, title: t.kycGate.titleMoreInfo", "eyebrow: t.kycGate.eyebrowAction,  stateWord: false, title: t.kycGate.titleMoreInfo")).length === 1);
  const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<string, { kycGate: Record<string, string> }> };
  const words = (keys: Set<string>) => ["sw", "en", "zh"].flatMap((l) => [...keys].map((k) => dict[l].kycGate[k]));
  const all = [...words(STATE_KEYS), ...words(HEADING_KEYS)];
  ok(`4.3 · the six eyebrows are distinct words in sw, en and zh (a state word is never a heading's words): ${["sw", "en"].map((l) => [...STATE_KEYS].map((k) => dict[l].kycGate[k]).join(" / ")).join(" · ")}`,
    all.every(Boolean) && new Set(all).size === all.length);
}

/* ══ §5 · RENDERED IN THREE LANGUAGES ═══════════════════════════════════════════════════════════════════════════════ */
section("5 · rendered in sw, en and zh — every eyebrow a player reads on these surfaces is in the one ink (or a side)");
{
  const React = req("react") as typeof import("react");
  const h = React.createElement;
  const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
  type Loc = "sw" | "en" | "zh";
  const LOCALES: Loc[] = ["sw", "en", "zh"];
  const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Record<string, unknown>> };
  const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
  const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
  const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
  const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
  const inLocale = (l: Loc, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
    h(PathnameContext.Provider, { value: "/updown" }, h(I18nProvider as never, { initial: l }, el as never))));
  /** Every element of a rendered page whose class list holds `eyebrow`: its inks and its inline colour. */
  const eyebrowsIn = (html: string) => [...html.matchAll(/<(\w+)\s+class="((?:[^"]*\s)?eyebrow(?:\s[^"]*)?)"(?:\s+style="([^"]*)")?/g)]
    .map((m) => ({ inks: inksOf(m[2].split(/\s+/)), style: m[3] ?? "" }));
  const offInk = (rows: Array<{ inks: string[]; style: string }>, sides = false) =>
    rows.filter((r) => !(j(r.inks) === j([ONE_INK]) || (sides && !r.inks.length && /^color:var\(--(?:yes|no)-300\)$/.test(r.style.replace(/\s+/g, "")))));
  // Up & Down's card, open, as the board draws it (the props test:updown-match renders).
  const { UpDownCard } = req("../src/components/updown/updown-card.tsx") as { UpDownCard: unknown };
  const NOW = Date.UTC(2026, 8, 27, 11, 26), MIN = 60_000;
  const CARD = {
    roundId: "udr_r8b", assetName: "Bitcoin", assetTicker: "BTC", assetIcon: "crypto", durationMinutes: 10, decimals: 2,
    openPrice: 85000, upTarget: 85000.02, downTarget: 84999.98, movePct: null, livePrice: 85010.5,
    closesAtMs: NOW + 6 * MIN, selectionClosesAtMs: NOW + 4 * MIN, serverNowMs: NOW, volumeTzs: 120_000, players: 4,
    pricing: { upPool: 0, downPool: 0, rates: {}, show: false }, state: "open", sourceClass: "crypto", sourceQuotedAt: new Date(NOW - 26_000).toISOString(),
  };
  const card = LOCALES.map((l) => ({ l, rows: eyebrowsIn(inLocale(l, h(UpDownCard as never, CARD as never))) }));
  ok(`5.1 EXECUTED · Up & Down's card in sw, en and zh: its ${card[0].rows.length} eyebrows — the price's name, the countdown's, "Vol", the target heading — in the one ink; UP and DOWN in their sides' inks`,
    card.every((c) => c.rows.length >= 5 && offInk(c.rows, true).length === 0 && c.rows.filter((r) => /yes-300|no-300/.test(r.style)).length === 2), j(card.map((c) => ({ l: c.l, off: offInk(c.rows, true) }))));
  const { CommissionWaterfall } = req("../src/components/agent/commission-waterfall.tsx") as { CommissionWaterfall: unknown };
  const RATES = { platformFeeRate: 0.05, operatorFeeRate: 0.05, traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05, agentPct: 10, withholdingPct: 5 };
  const wf = LOCALES.map((l) => eyebrowsIn(renderToStaticMarkup(h(CommissionWaterfall as never, { t: dict[l], rates: RATES } as never))));
  ok("5.2 EXECUTED · the agent's worked example in sw, en and zh: its title's eyebrow and its two column heads in the one ink (they were faint)",
    wf.every((rows) => rows.length === 3 && offInk(rows).length === 0), j(wf.map(offInk)));
  const { BoardViz } = req("../src/components/charts/board-viz.tsx") as { BoardViz: unknown };
  const viz = LOCALES.map((l) => {
    const m = (dict[l] as { market: Record<string, string> }).market;
    return eyebrowsIn(renderToStaticMarkup(h(BoardViz as never, { cubes: h("i", null, "c"), chart: null, labels: { aria: "a", cubes: "c", chart: "h", cubesEyebrow: m.udLastRounds, chartEyebrow: m.udConfirmedPrice } } as never)));
  });
  ok("5.3 EXECUTED · the Up & Down board's \"last rounds\" label in sw, en and zh in the one ink (it was faint)", viz.every((rows) => rows.length === 1 && offInk(rows).length === 0), j(viz));
  const { FieldLegend } = req("../src/components/ui/field-legend.tsx") as { FieldLegend: unknown };
  const legend = renderToStaticMarkup(h(FieldLegend as never, { as: "p" } as never, "NENOSIRI"));
  ok("5.4 EXECUTED · CONTROL · a form field's label keeps the kit's form-label ink and weight (`--text-muted`, bold) — the password row now draws through it, as the e-mail row beside it",
    /class="[^"]*\btext-text-muted\b[^"]*\bfont-bold\b|class="[^"]*\bfont-bold\b[^"]*\btext-text-muted\b/.test(legend)
      && has("src/components/profile/password-section.tsx", "<FieldLegend as=\"p\">{t.common.passwordLabel}</FieldLegend>")
      && has("src/components/profile/email-editor.tsx", "<FieldLegend as=\"p\">{t.common.contactEmail}</FieldLegend>")
      && !/text-text-muted">\{t\.common\.passwordLabel\}/.test(code("src/components/profile/password-section.tsx")), legend);
  ok("5.1′ PLANT · a card eyebrow back in faint is reported by the rendered reader", offInk(eyebrowsIn('<span class="font-mono text-micro font-semibold uppercase eyebrow text-text-faint">x</span>')).length === 1);
}

/* ══ §6 · CONTRAST ══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · contrast — the one ink on every surface a moved label sits on (≥ 4.5:1 text)");
{
  type RGB = [number, number, number];
  const lin2srgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const oklch = (L: number, C: number, H: number): RGB => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [r, g, bl].map((c) => Math.min(1, Math.max(0, lin2srgb(c)))) as RGB;
  };
  const token = (name: string): RGB => {
    const v = new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim() ?? "";
    const via = /^var\(--([\w-]+)\)$/.exec(v);
    if (via) return token(via[1]);
    const m = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(v);
    if (!m) throw new Error(`token --${name} unreadable: ${v}`);
    return oklch(Number(m[1]) / 100, Number(m[2]), Number(m[3]));
  };
  const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
  const lum = (c: RGB) => { const f = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const S = token("text-subtle");
  const PAIRS: Array<[string, number]> = [
    ["the invite and agent share cards' label on `--royal-950`", ratio(S, token("royal-950"))],
    ["a card, the KYC panel, the bell's panel: `--bg-elevated`", ratio(S, token("bg-elevated"))],
    ["Up & Down's pods and the round page's insets: `--bg-inset`", ratio(S, token("bg-inset"))],
    ["a ticket's or the wallet's inset tile: `--bg-overlay` at 40% over a card", ratio(S, over(token("bg-overlay"), 0.4, token("bg-elevated")))],
    ["the page itself: `--bg`", ratio(S, token("bg"))],
  ];
  for (const [what, r] of PAIRS) ok(`6 · the one ink on ${what} — ${r.toFixed(2)}:1`, r >= 4.5);
  const was = ratio(over(token("royal-300"), 0.8, token("royal-950")), token("royal-950"));
  ok(`6′ CONTROL · the share card's old label (royal-300 at 80% on --royal-950) measured ${was.toFixed(2)}:1 — the one ink reads ${ratio(S, token("royal-950")).toFixed(2)}`,
    was < ratio(S, token("royal-950")) && was > 4.5);
}

/* ══ §7 · THE RECORD ════════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · the record — the rule where the page heads' is, the old spec lines marked, no dictionary word changed");
{
  const DA = raw("docs/DESIGN_AUTHORITY.md");
  const t3 = DA.slice(DA.indexOf("A PAGE HEAD'S EYEBROW HAS ONE INK"), DA.indexOf("THE EYEBROW'S TRACKING IS 0.14em"));
  ok("7.1 · DESIGN_AUTHORITY §T3 carries the section heads beside the page heads, with Ali's ruling (3) of 2026-10-10 and this census",
    /AND EVERY SECTION HEAD \(2026-10-10, Ali's ruling \(3\)/.test(t3) && /`test:visual-pass-r8b` §1 is the census/.test(t3) && /a status word, a form field's label/.test(t3));
  const SPECS = ["docs/design-system/v2-2026-07-27/02-components/updown-card/spec.md", "docs/design-system/v2-2026-07-27/02-components/countdown/spec.md",
    "docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D1-updown-card-spec.md", "docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D2-updown-board-spec.md",
    "docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D3-updown-round-spec.md", "docs/design-system/v2-2026-07-27/01-foundations/colour.md"];
  const unmarked = SPECS.filter((p) => !/SUPERSEDED 2026-10-10[^\n]*Ali's ruling \(3\)/.test(raw(p)));
  ok(`7.2 · the ${SPECS.length} spec lines that drew a label in --text-faint are marked superseded where they are written`, unmarked.length === 0, j(unmarked));
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { head = "‹git unavailable›"; }
  ok("7.3 · src/lib/i18n-dict.ts is the commit's own — every word above is an existing key", head === raw("src/lib/i18n-dict.ts"));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
