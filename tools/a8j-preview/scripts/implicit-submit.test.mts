/**
 * test:implicit-submit — ENTER IN A FORM NEVER SKIPS ITS CONFIRM (the Vodacom plan S6 A8j, 2026-10-07).
 *
 *   npm run test:implicit-submit     (in predeploy)
 *   npm run red:implicit-submit      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT IT CLOSES, FOR EVERY PLAYER, ON A MONEY SCREEN. `ConfirmDialog` forces its trigger to `type="button"`,
 * so a form whose only commit is that dialog has no submit button, and a browser SUBMITS a form with no submit button
 * and ONE text field when Enter is pressed in that field (HTML's implicit submission; a phone's Go key is the same
 * Enter). On /wallet/withdraw an amount typed and entered left the account with no "Confirm withdrawal": no fee, no
 * "You receive", no recipient. On /profile/account the phrase typed and entered closed the account and its wallet with
 * no "Close your account permanently". And before the page woke, its scripts still coming down a slow line, the same
 * Enter posted the server action as a plain HTML form, where no listener can stop it because none is there yet.
 *
 *   §1 THE GUARD — `formGuard`, the rule `ConfirmDialog` runs, on a real EventTarget with real submit events: a submit
 *      the dialog's own confirm did not start is cancelled, stopped before React's root can hear it, and handed to the
 *      dialog to open; the confirm's own submit passes untouched; the confirm's window closes with it, even when it
 *      throws; a stopped guard stops; one dialog's confirm never lets another dialog's form submit.
 *   §2 THE MARKUP — `ConfirmDialog submitsForm` drawn by the server inside a form, read by each engine's own
 *      implicit-submission rule (Chromium, Firefox, WebKit, from their sources): before the guard listens Enter submits
 *      nothing in any of them; once it listens Enter submits in all of them (the submit the guard turns into the
 *      dialog), in a form of one text field and in one of eight; what the prop adds is unseen, unreachable and posts
 *      nothing; without it the dialog draws its trigger alone. A control runs the same rules over the form as it was and
 *      over each half of the fix alone, and requires each to fall short.
 *   §3 THE DIALOG — `confirm-dialog.tsx` as a syntax tree: the caller's `onConfirm` runs only inside the guard's
 *      `confirm`; the trigger's click and a refused submit open the dialog by ONE function, a refused submit only where
 *      the trigger could; the default button is enabled only once the guard listens, on that button's own form.
 *   §4 THE CENSUS — every ConfirmDialog and ConfirmModal in `src/`, its `onConfirm` resolved BY SCOPE (through a
 *      wrapper's callers in its file) to what it runs and to the local functions that calls: every dialog whose confirm
 *      submits a form carries `submitsForm`, the five that do today among them by name; no ConfirmModal submits one; a
 *      handler the census cannot read FAILS. And every form whose submit OPENS a confirm keeps it so: its submit never
 *      reaches what a confirm of its file confirms, save two forms named with the call that asks before they save.
 *   §5 THE WIRING — this suite in predeploy; its red twin and its drive declared.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: nothing on disk changes. `--prove-red` plants each defect in a copy of the source held
 * in memory, builds `confirm-dialog.tsx` from that copy, and requires the check named for it to fail. The real-browser
 * half is `qa:implicit-submit`.
 * ⚠️ This file carries no backslash (line breaks are built from their code points), so a tool that decodes escapes on
 * the way to disk cannot change what it tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { decomment } from "./lib/decomment.mts";
import { REPO_ROOT, srcFiles } from "./lib/tracked-files.mts";

const PROVE_RED = process.argv.includes("--prove-red");
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const QUOTE = String.fromCharCode(34);

const CD = "src/components/ui/confirm-dialog.tsx";
const WITHDRAW = "src/app/wallet/withdraw/withdraw-confirm.tsx";
const DEPOSIT = "src/app/wallet/deposit/deposit-confirm.tsx";
const CLOSE = "src/app/profile/account/close-account-form.tsx";
const RG = "src/components/rg/rg-confirm-submit.tsx";
const SIGN_OUT = "src/components/journey/account/sign-out-row.tsx";
/** The dialogs whose confirm submits the form their trigger sits in, by name (2026-10-07): a census that stops finding
 *  one of them has gone blind, or the dialog has gone, and either is said here by its path. */
const SUBMITTERS = [WITHDRAW, DEPOSIT, CLOSE, RG, SIGN_OUT];
const PKG = "package.json";
const SUITE = "scripts/implicit-submit.test.mts";
const DRIVE = "scripts/qa-implicit-submit.mjs";
const CREDIT = "src/app/admin/ai-usage/credit-controls.tsx";
const SET_EMAIL = "src/app/admin/players/[id]/set-email-form.tsx";
const RULES = "src/app/admin/desk/[id]/rules-form.tsx";
const STAFF = "src/app/admin/staff/staff-forms.tsx";
const CONFIG = "src/app/admin/config/config-form.tsx";
const UPDOWN = "src/app/admin/updown/updown-controls.tsx";

/**
 * ⛔ THE TWO FORMS WHOSE SUBMIT SAVES DIRECTLY FOR SOME CHANGES, BY DESIGN — named, each with the call that asks before
 * it saves, and each still a real finding (4.4): a form that stops saving directly leaves its row stale, and the row is
 * deleted, never inherited. A third form may not join without a reason as good as these.
 */
const DIRECT_BY_DESIGN = [
  { file: CONFIG, component: "GlobalConfigForm", opener: "setConfirmFd(fd)",
    why: "only a change to the money model asks (the fee model, its two rate slices, the estimate): it reprices every future poll; any other rate saves on Save" },
  { file: UPDOWN, component: "ReadingMethodForm", opener: "setConfirmOpen(true)",
    why: "only the simulated feed asks, behind its typed word; a real source saves on Save" },
];

const rawCache = new Map<string, string>();
const readRaw = (rel: string): string => {
  let text = rawCache.get(rel);
  if (text === undefined) {
    text = readFileSync(join(REPO_ROOT, rel), "utf8").split(CR).join("");
    rawCache.set(rel, text);
  }
  return text;
};
type World = { read: (rel: string) => string };
const REAL: World = { read: readRaw };

// ── THE DIALOG, BUILT FROM ITS SOURCE TEXT — so the copy a plant edited is the code that runs ─────────────────────────
type Guard = { confirm<T>(act: () => T): T; listen(form: EventTarget, refused: () => void): () => void };
type DialogModule = { formGuard?: () => Guard; ConfirmDialog?: unknown };
let bootError = "";
let React: any = null;
let toMarkup: ((el: unknown) => string) | null = null;
let I18nProvider: unknown = null;
let RouterContext: any = null;
let build: ((src: string, opts: Record<string, unknown>) => Promise<{ code: string }>) | null = null;
const DEPS: Record<string, unknown> = {};
try {
  const reactMod: any = await import("react");
  React = reactMod.default ?? reactMod;
  const serverMod: any = await import("react-dom/server");
  toMarkup = serverMod.renderToStaticMarkup ?? serverMod.default?.renderToStaticMarkup ?? null;
  const i18n: any = await import("../src/lib/i18n.tsx");
  I18nProvider = i18n.I18nProvider;
  const router: any = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
  RouterContext = router.AppRouterContext;
  const esbuild: any = await import("esbuild");
  build = esbuild.transform;
  DEPS.react = React;
  DEPS["@/components/ui/modal"] = await import("../src/components/ui/modal.tsx");
} catch (e) {
  bootError = String((e as Error)?.message ?? e);
}
const built = new Map<string, Promise<DialogModule>>();
/** `confirm-dialog.tsx` from `text`, built with esbuild and evaluated in memory against the real modules it imports. */
function dialogFrom(text: string): Promise<DialogModule> {
  let hit = built.get(text);
  if (!hit) {
    hit = (async () => {
      if (!build) throw new Error(`the suite could not load its tools: ${bootError}`);
      const code = (await build(text, { loader: "tsx", format: "cjs", target: "es2022", charset: "utf8" })).code;
      const mod: { exports: Record<string, unknown> } = { exports: {} };
      const need = (spec: string) => {
        if (spec in DEPS) return DEPS[spec];
        throw new Error(`the copy of ${CD} imports ${spec}, which this suite does not provide`);
      };
      new Function("require", "module", "exports", code)(need, mod, mod.exports);
      return mod.exports as DialogModule;
    })();
    built.set(text, hit);
  }
  return hit;
}

/** A submit event as a browser fires one (bubbling, cancelable) that remembers whether it was stopped. */
function submitEvent(): { e: Event; stopped: () => boolean } {
  const e = new Event("submit", { bubbles: true, cancelable: true });
  let stopped = false;
  for (const m of ["stopPropagation", "stopImmediatePropagation"] as const) {
    const real = e[m].bind(e);
    Object.defineProperty(e, m, { value: () => { stopped = true; real(); } });
  }
  return { e, stopped: () => stopped };
}

// ── THE ENGINES' OWN RULES — what Enter in a text field does to a form, by its controls in tree order ────────────────
type Control = { tag: string; attrs: Map<string, string> };
const TAG = new RegExp("<(button|input|textarea|select)(?=[ />])([^>]*)>", "g");
const ATTR = new RegExp(" ([a-zA-Z-]+)(=" + QUOTE + "([^" + QUOTE + "]*)" + QUOTE + ")?", "g");
/** The form controls a server's markup draws, in tree order, each with its attributes (names lower-cased). */
function controlsIn(markup: string): Control[] {
  const out: Control[] = [];
  for (const m of markup.matchAll(TAG)) {
    const attrs = new Map<string, string>();
    for (const a of (m[2] ?? "").matchAll(ATTR)) attrs.set(a[1].toLowerCase(), a[3] ?? "");
    out.push({ tag: m[1], attrs });
  }
  return out;
}
const typeOf = (c: Control) => (c.attrs.get("type") ?? "").toLowerCase();
const isSubmitControl = (c: Control) =>
  (c.tag === "button" && (typeOf(c) === "" || typeOf(c) === "submit")) || (c.tag === "input" && (typeOf(c) === "submit" || typeOf(c) === "image"));
const TEXT_TYPES = new Set(["", "text", "search", "tel", "url", "email", "password", "number"]);
const isTextField = (c: Control) => c.tag === "input" && TEXT_TYPES.has(typeOf(c));
const off = (c: Control) => c.attrs.has("disabled");
type Engine = "chromium" | "firefox" | "webkit";
const ENGINES: Engine[] = ["chromium", "firefox", "webkit"];
/**
 * Does Enter in a text field submit this form? Each engine's own rule, read from its source on 2026-10-07:
 *  · Chromium, `HTMLFormElement::SubmitImplicitly`: the FIRST submit control in tree order decides. Enabled, it is
 *    clicked; disabled, "Default (submit) button is not activated; no implicit submission". With none, the form submits
 *    when exactly one field can trigger implicit submission. Nothing reads layout: a hidden button counts.
 *  · Firefox, `HTMLInputElement::MaybeSubmitForm`: the default submit element is clicked (a disabled button takes no
 *    click); with none, the form submits unless `ImplicitSubmissionIsDisabled()`, a count of text fields other than one.
 *  · WebKit, `HTMLFormElement::submitImplicitly`: the first SUCCESSFUL submit button is clicked; a disabled one is
 *    skipped and the walk goes on counting text fields (`canTriggerImplicitSubmission() { return isTextField(); }`),
 *    and the form submits when exactly one was counted.
 */
function enterSubmits(engine: Engine, cs: Control[]): boolean {
  const fields = cs.filter(isTextField).length;
  if (engine === "webkit") return cs.some((c) => isSubmitControl(c) && !off(c)) || fields === 1;
  const first = cs.find(isSubmitControl);
  return first ? !off(first) : fields === 1;
}
const inAll = (cs: Control[]) => ENGINES.every((e) => enterSubmits(e, cs));
const inNone = (cs: Control[]) => ENGINES.every((e) => !enterSubmits(e, cs));
const byEngine = (cs: Control[]) => Object.fromEntries(ENGINES.map((e) => [e, enterSubmits(e, cs)]));
/** The controls as the guard leaves them once it listens: its hidden default button enabled. */
const awake = (cs: Control[]): Control[] =>
  cs.map((c) => (isSubmitControl(c) && c.attrs.has("hidden") ? { tag: c.tag, attrs: new Map([...c.attrs].filter(([k]) => k !== "disabled")) } : c));
const C = (tag: string, attrs: Record<string, string>): Control => ({ tag, attrs: new Map(Object.entries(attrs)) });

// ── SYNTAX-TREE HELPERS (parsed, never type-checked) ──────────────────────────────────────────────────────────────────
const parse = (rel: string, code: string): ts.SourceFile =>
  ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
function walkTree(root: ts.Node, visit: (n: ts.Node) => void): void {
  const go = (n: ts.Node) => { visit(n); ts.forEachChild(n, go); };
  go(root);
}
const lineOf = (sf: ts.SourceFile, n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
type Tag = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
const isTag = (n: ts.Node): n is Tag => ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n);
function attrOf(t: Tag, name: string): ts.JsxAttribute | null {
  for (const a of t.attributes.properties) if (ts.isJsxAttribute(a) && a.name.getText() === name) return a;
  return null;
}
function attrExpr(a: ts.JsxAttribute | null): ts.Expression | null {
  const init = a?.initializer;
  return init && ts.isJsxExpression(init) && init.expression ? init.expression : null;
}
/** A boolean attribute that is on: written bare, or as {true}. */
const isOn = (a: ts.JsxAttribute | null) => a !== null && (a.initializer === undefined || attrExpr(a)?.kind === ts.SyntaxKind.TrueKeyword);
type Fn = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;

/** The node that binds `name` inside a binding pattern, or null. */
function bindsIn(b: ts.BindingName, name: string): ts.Node | null {
  if (ts.isIdentifier(b)) return b.text === name ? b : null;
  for (const el of b.elements) {
    if (ts.isOmittedExpression(el)) continue;
    const hit = bindsIn(el.name, name);
    if (hit) return hit === el.name ? el : hit;
  }
  return null;
}
/**
 * The node that binds `name` where `at` stands: the nearest enclosing scope's parameter, const/let/var (destructured or
 * not), function declaration or import — or null. ⛔ BY SCOPE, NEVER BY THE FIRST NAME IN THE FILE: two components that
 * each bind `onClick` (`dsar-controls.tsx`) are two bindings, and reading the first for both is the blind spot the
 * A8i census was found with.
 */
function bindingOf(name: string, at: ts.Node): ts.Node | null {
  for (let n: ts.Node | undefined = at.parent; n; n = n.parent) {
    if (ts.isFunctionLike(n)) {
      for (const p of n.parameters) {
        const hit = bindsIn(p.name, name);
        if (hit) return hit === p.name ? p : hit;
      }
      if ((ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) && n.name?.text === name) return n;
    }
    if (ts.isBlock(n) || ts.isSourceFile(n) || ts.isModuleBlock(n) || ts.isCaseClause(n) || ts.isDefaultClause(n)) {
      for (const st of n.statements) {
        if (ts.isFunctionDeclaration(st) && st.name?.text === name) return st;
        if (ts.isVariableStatement(st)) {
          for (const d of st.declarationList.declarations) {
            const hit = bindsIn(d.name, name);
            if (hit) return hit === d.name ? d : hit;
          }
        }
        if (ts.isImportDeclaration(st) && st.importClause) {
          const ic = st.importClause;
          if (ic.name?.text === name) return ic;
          const nb = ic.namedBindings;
          if (nb && ts.isNamespaceImport(nb) && nb.name.text === name) return nb;
          if (nb && ts.isNamedImports(nb)) for (const s of nb.elements) if (s.name.text === name) return s;
        }
      }
    }
  }
  return null;
}
/** The function an expression is: an arrow, a function expression, or `useCallback(fn, deps)`. */
function fnOfExpr(e: ts.Expression | undefined): Fn | null {
  let x = e;
  while (x && (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isSatisfiesExpression(x) || ts.isNonNullExpression(x))) x = x.expression;
  if (!x) return null;
  if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return x;
  if (ts.isCallExpression(x) && /^(React[.])?useCallback$/.test(x.expression.getText()) && x.arguments.length > 0) return fnOfExpr(x.arguments[0]);
  return null;
}
/** The function a binding names — `function f`, `const f = () => …`, `const f = useCallback(…)` — or null (a hook's
 *  helper, a state setter, an import: none of them a function of this file). */
function fnOf(decl: ts.Node | null): Fn | null {
  if (!decl) return null;
  if (ts.isFunctionDeclaration(decl)) return decl;
  if (ts.isVariableDeclaration(decl)) return fnOfExpr(decl.initializer);
  return null;
}
function fnName(f: Fn): string {
  if (ts.isFunctionDeclaration(f)) return f.name?.text ?? "(anonymous)";
  let p: ts.Node = f.parent;
  if (ts.isCallExpression(p)) p = p.parent;
  return ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) ? p.name.text : "(inline)";
}
const ownerName = (fn: ts.Node): string | null =>
  ts.isFunctionDeclaration(fn) && fn.name ? fn.name.text
    : (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) && ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name) ? fn.parent.name.text
    : null;
/** The component a node is drawn by: the nearest enclosing function whose name is a component's. */
function componentOf(at: ts.Node): string | null {
  for (let n: ts.Node | undefined = at.parent; n; n = n.parent) {
    const name = ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) ? ownerName(n) : null;
    if (name && /^[A-Z]/.test(name)) return name;
  }
  return null;
}

type Run = { fn: Fn; named: boolean };
type Resolved = { runs: Run[]; why: string | null };
/**
 * What a handler runs: inline, a named function of its scope, or (a prop of the component it sits in) whatever that
 * component's callers in the same file hand it. Anything else is UNREAD and says why — a census that cannot read a
 * handler fails, it never passes it.
 */
function resolveHandler(e: ts.Expression | null, sf: ts.SourceFile, depth = 0): Resolved {
  if (!e) return { runs: [], why: "no handler at all" };
  const inline = fnOfExpr(e);
  if (inline) return { runs: [{ fn: inline, named: false }], why: null };
  if (!ts.isIdentifier(e)) return { runs: [], why: `a handler this census cannot read: ${e.getText(sf).slice(0, 60)}` };
  const decl = bindingOf(e.text, e);
  const named = fnOf(decl);
  if (named) return { runs: [{ fn: named, named: true }], why: null };
  if (decl && ts.isBindingElement(decl) && ts.isObjectBindingPattern(decl.parent) && ts.isParameter(decl.parent.parent) && depth < 3) {
    const owner = ownerName(decl.parent.parent.parent);
    const prop = (decl.propertyName ?? decl.name).getText(sf);
    if (!owner) return { runs: [], why: `${e.text} is a prop of a component this census cannot name` };
    const sites: Tag[] = [];
    walkTree(sf, (n) => { if (isTag(n) && n.tagName.getText(sf) === owner) sites.push(n); });
    if (sites.length === 0) return { runs: [], why: `${e.text} is a prop of ${owner}, and nothing in this file hands it one` };
    const out: Resolved = { runs: [], why: null };
    for (const s of sites) {
      const sub = resolveHandler(attrExpr(attrOf(s, prop)), sf, depth + 1);
      out.runs.push(...sub.runs);
      if (sub.why) out.why = `${owner} at line ${lineOf(sf, s)}: ${sub.why}`;
    }
    return out;
  }
  return { runs: [], why: `${e.text} is bound to no function this census can read` };
}
/** A function and every local function it calls by name, to three calls deep (calls inside its closures included: they
 *  run when it runs, or later on its behalf). */
function reach(fn: Fn, depth = 3, seen = new Set<Fn>()): Set<Fn> {
  if (seen.has(fn)) return seen;
  seen.add(fn);
  if (depth === 0) return seen;
  walkTree(fn, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const f = fnOf(bindingOf(n.expression.text, n.expression));
      if (f) reach(f, depth - 1, seen);
    }
  });
  return seen;
}
const SUBMIT_CALLS = new Set(["requestSubmit", "submit"]);
/** Whether a function submits a form (`x.requestSubmit()`, `x.submit()`), and whether the form is one it made itself
 *  (`document.createElement("form")`: nothing else can submit that one, so there is nothing to guard). */
function submissionsIn(fn: Fn): { submits: boolean; created: boolean } {
  let submits = false;
  let created = false;
  walkTree(fn, (n) => {
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || !SUBMIT_CALLS.has(n.expression.name.text)) return;
    const recv = n.expression.expression;
    const decl = ts.isIdentifier(recv) ? bindingOf(recv.text, recv) : null;
    const init = decl && ts.isVariableDeclaration(decl) ? decl.initializer?.getText() ?? "" : "";
    if (/^document[.]createElement[(]["']form["'][)]$/.test(init)) created = true;
    else submits = true;
  });
  return { submits, created };
}
/** What a confirm CONFIRMS: a named handler is itself; an inline one, the local functions it calls by name directly. */
function targetsOf(r: Run): Fn[] {
  if (r.named) return [r.fn];
  const out: Fn[] = [];
  const go = (n: ts.Node) => {
    if (n !== r.fn && (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n))) return;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const f = fnOf(bindingOf(n.expression.text, n.expression));
      if (f) out.push(f);
    }
    ts.forEachChild(n, go);
  };
  go(r.fn);
  return out;
}

type DialogRow = { file: string; line: number; kind: string; submits: boolean; created: boolean; guarded: boolean; why: string | null };
type FormRow = { file: string; line: number; component: string; handler: string; reaches: string[]; why: string | null };
type Census = { files: number; dialogs: DialogRow[]; forms: FormRow[] };
function censusOfFile(rel: string, code: string): { dialogs: DialogRow[]; forms: FormRow[] } {
  const sf = parse(rel, code);
  const tags: Tag[] = [];
  walkTree(sf, (n) => { if (isTag(n)) tags.push(n); });
  const dialogs: DialogRow[] = [];
  const targets = new Set<Fn>();
  for (const t of tags) {
    const kind = t.tagName.getText(sf);
    if (kind !== "ConfirmDialog" && kind !== "ConfirmModal") continue;
    const r = resolveHandler(attrExpr(attrOf(t, "onConfirm")), sf);
    let submits = false;
    let created = false;
    for (const rr of r.runs) {
      for (const f of reach(rr.fn)) {
        const s = submissionsIn(f);
        submits = submits || s.submits;
        created = created || s.created;
      }
      for (const f of targetsOf(rr)) targets.add(f);
    }
    dialogs.push({ file: rel, line: lineOf(sf, t), kind, submits, created, guarded: isOn(attrOf(t, "submitsForm")), why: r.why });
  }
  const forms: FormRow[] = [];
  if (dialogs.length > 0) {
    for (const t of tags) {
      if (t.tagName.getText(sf) !== "form") continue;
      const on = attrExpr(attrOf(t, "onSubmit"));
      if (!on) continue;
      const r = resolveHandler(on, sf);
      const hits = new Set<string>();
      for (const rr of r.runs) for (const f of reach(rr.fn)) if (targets.has(f)) hits.add(fnName(f));
      forms.push({ file: rel, line: lineOf(sf, t), component: componentOf(t) ?? "(unnamed)",
        handler: r.runs.map((x) => x.fn.getText(sf)).join(NL), reaches: [...hits], why: r.why });
    }
  }
  return { dialogs, forms };
}
const POPULATION = srcFiles();
const realCensus = new Map<string, { code: string; found: { dialogs: DialogRow[]; forms: FormRow[] } }>();
/** The census over all of `src/`, reusing each file's result while its text is the one already read. */
function census(w: World): Census {
  const out: Census = { files: 0, dialogs: [], forms: [] };
  for (const rel of POPULATION) {
    const code = w.read(rel);
    if (!code.includes("<ConfirmDialog") && !code.includes("<ConfirmModal") && !code.includes("<form")) continue;
    out.files++;
    let hit = realCensus.get(rel);
    if (!hit || hit.code !== code) {
      hit = { code, found: censusOfFile(rel, code) };
      if (w === REAL) realCensus.set(rel, hit);
    }
    out.dialogs.push(...hit.found.dialogs);
    out.forms.push(...hit.found.forms);
  }
  return out;
}
/** The census run over shapes it must tell apart, so its own discrimination is proven, not assumed. */
function fixtureCensus(): { pass: boolean; detail: string } {
  const src = [
    'function Named() { const formRef = useRef(null); const go = () => formRef.current?.requestSubmit(); return <form ref={formRef}><ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" /></form>; }',
    'function Made() { return <ConfirmDialog onConfirm={() => { const f = document.createElement("form"); f.submit(); }} trigger={<button />} title="" body="" />; }',
    'function Wrap({ onConfirm }) { return <ConfirmModal open onClose={() => {}} onConfirm={onConfirm} title="" body="" />; }',
    'function Host() { const ref = useRef(null); return <Wrap onConfirm={() => ref.current?.submit()} />; }',
    'function Quiet() { const go = () => {}; return <ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" />; }',
    'function Unread({ handlers }) { return <ConfirmDialog onConfirm={handlers.go} trigger={<button />} title="" body="" />; }',
  ].join(NL);
  const r = censusOfFile("fixture.tsx", src);
  const d = r.dialogs;
  const pass = d.length === 5
    && d[0].submits && !d[0].guarded && d[0].why === null
    && !d[1].submits && d[1].created
    && d[2].kind === "ConfirmModal" && d[2].submits && d[2].why === null
    && !d[3].submits && d[3].why === null
    && d[4].why !== null;
  return { pass, detail: JSON.stringify(d.map((x) => [x.kind, x.submits, x.created, x.why === null ? "read" : "UNREAD"])) };
}

function findFunction(root: ts.Node, name: string): ts.FunctionDeclaration | null {
  let hit: ts.FunctionDeclaration | null = null;
  walkTree(root, (n) => { if (!hit && ts.isFunctionDeclaration(n) && n.name?.text === name) hit = n; });
  return hit;
}
function declIn(root: ts.Node | null, name: string): ts.VariableDeclaration | null {
  let hit: ts.VariableDeclaration | null = null;
  if (root) walkTree(root, (n) => { if (!hit && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) hit = n; });
  return hit;
}
function callsIn(root: ts.Node | null, test: (c: ts.CallExpression) => boolean): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  if (root) walkTree(root, (n) => { if (ts.isCallExpression(n) && test(n)) out.push(n); });
  return out;
}

// ── THE CHECKS ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function run(w: World, log: (l: string) => void): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  let mod: DialogModule | null = null;
  let loadError = "";
  try { mod = await dialogFrom(w.read(CD)); } catch (e) { loadError = String((e as Error)?.message ?? e); }
  const make = typeof mod?.formGuard === "function" ? mod.formGuard : null;
  type Probe = { pass: boolean; detail: string };
  const probe = (p: (mk: () => Guard) => Probe): Probe => {
    if (!make) return { pass: false, detail: `confirm-dialog.tsx yields no formGuard${loadError ? `: ${loadError}` : ""}` };
    try { return p(make); } catch (e) { return { pass: false, detail: `it threw: ${String((e as Error)?.message ?? e)}` }; }
  };

  log("§1 · the guard — formGuard, on a real EventTarget");
  const p11 = probe((mk) => {
    const form = new EventTarget();
    let asked = 0;
    mk().listen(form, () => { asked++; });
    const s = submitEvent();
    form.dispatchEvent(s.e);
    return { pass: s.e.defaultPrevented && s.stopped() && asked === 1, detail: JSON.stringify({ prevented: s.e.defaultPrevented, stopped: s.stopped(), asked }) };
  });
  ok("1.1 · ★ a submit the dialog's own confirm did not start (Enter in a field) is refused: cancelled, so the browser posts nothing; stopped, so React's root never hears it; and handed to the dialog to open, once",
    p11.pass, p11.detail);
  const p12 = probe((mk) => {
    const form = new EventTarget();
    let asked = 0;
    const g = mk();
    g.listen(form, () => { asked++; });
    const s = submitEvent();
    const back = g.confirm(() => { form.dispatchEvent(s.e); return "sent"; });
    return { pass: !s.e.defaultPrevented && !s.stopped() && asked === 0 && back === "sent", detail: JSON.stringify({ prevented: s.e.defaultPrevented, stopped: s.stopped(), asked, back }) };
  });
  ok("1.2 · ★ the confirm's own submit passes untouched — requestSubmit() fires it inside confirm — and confirm hands back what the confirm returned (a refused pre-flight's false)",
    p12.pass, p12.detail);
  const p13 = probe((mk) => {
    const form = new EventTarget();
    let asked = 0;
    const g = mk();
    g.listen(form, () => { asked++; });
    g.confirm(() => false);
    const a = submitEvent();
    form.dispatchEvent(a.e);
    try { g.confirm(() => { throw new Error("the confirm failed"); }); } catch { /* the window it leaves is the question */ }
    const b = submitEvent();
    form.dispatchEvent(b.e);
    return { pass: a.e.defaultPrevented && b.e.defaultPrevented && asked === 2, detail: JSON.stringify({ afterConfirm: a.e.defaultPrevented, afterThrow: b.e.defaultPrevented, asked }) };
  });
  ok("1.3 · the confirm's window closes with it: an Enter after a confirm that submitted nothing, and after one that threw, is refused again",
    p13.pass, p13.detail);
  const p14 = probe((mk) => {
    const form = new EventTarget();
    let asked = 0;
    const stop = mk().listen(form, () => { asked++; });
    stop();
    const s = submitEvent();
    form.dispatchEvent(s.e);
    return { pass: !s.e.defaultPrevented && !s.stopped() && asked === 0, detail: JSON.stringify({ prevented: s.e.defaultPrevented, stopped: s.stopped(), asked }) };
  });
  ok("1.4 · a stopped guard listens no more — a dialog that has gone refuses nothing on a form it no longer guards",
    p14.pass, p14.detail);
  const p15 = probe((mk) => {
    const a = new EventTarget();
    const b = new EventTarget();
    let askedA = 0;
    let askedB = 0;
    const ga = mk();
    const gb = mk();
    ga.listen(a, () => { askedA++; });
    gb.listen(b, () => { askedB++; });
    const s = submitEvent();
    ga.confirm(() => b.dispatchEvent(s.e));
    return { pass: s.e.defaultPrevented && askedB === 1 && askedA === 0, detail: JSON.stringify({ prevented: s.e.defaultPrevented, askedA, askedB }) };
  });
  ok("1.5 · one guard per dialog: a confirm in one dialog never lets another dialog's form submit", p15.pass, p15.detail);

  log("§2 · the markup — what the server draws, read by each engine's own rule");
  let markup: { one: string; eight: string; plain: string } | null = null;
  let renderError = "";
  if (mod && mod.ConfirmDialog && toMarkup && React) {
    try {
      const h = React.createElement;
      const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
      const draw = (el: unknown) => toMarkup!(h(RouterContext.Provider, { value: router }, h(I18nProvider, { initial: "en" }, el)));
      const dialog = (guarded: boolean) => h(mod!.ConfirmDialog, {
        title: "T", body: "B", onConfirm: () => {}, trigger: h("button", { type: "button" }, "Go"), ...(guarded ? { submitsForm: true } : {}),
      });
      const fields = (n: number) => Array.from({ length: n }, (_, i) => h("input", { key: "f" + i, name: "f" + i }));
      markup = {
        one: draw(h("form", null, ...fields(1), dialog(true))),
        eight: draw(h("form", null, ...fields(8), dialog(true))),
        plain: draw(h("form", null, ...fields(1), dialog(false))),
      };
    } catch (e) { renderError = String((e as Error)?.message ?? e); }
  } else renderError = loadError || bootError || "confirm-dialog.tsx yields no ConfirmDialog";
  const field = C("input", { name: "amount" });
  const trigger = C("button", { type: "button" });
  const asItWas = [field, trigger];
  const buttonAlone = [field, C("button", { type: "submit", hidden: "", disabled: "" }), trigger];
  const fieldAlone = [field, C("input", { type: "text", hidden: "" }), trigger];
  ok("2.0 · control · the model sees the defect and why each half of the fix exists: the form as it was submits on Enter in every engine; a disabled default button alone stops Chromium and Firefox but not WebKit; a second text field alone stops all three, and stays stopped once the page wakes, so Enter would never reach the guard to open the dialog",
    inAll(asItWas) && !enterSubmits("chromium", buttonAlone) && !enterSubmits("firefox", buttonAlone) && enterSubmits("webkit", buttonAlone)
      && inNone(fieldAlone) && inNone(awake(fieldAlone)),
    JSON.stringify({ asItWas: byEngine(asItWas), buttonAlone: byEngine(buttonAlone), fieldAlone: byEngine(fieldAlone) }));
  const one = markup ? controlsIn(markup.one) : [];
  const eight = markup ? controlsIn(markup.eight) : [];
  const plain = markup ? controlsIn(markup.plain) : [];
  ok("2.1 · ★ before the guard listens (the server's markup: the page still loading, or hydrating) Enter in the form's one text field submits nothing, in Chromium, Firefox and WebKit",
    markup !== null && one.length > 0 && inNone(one), markup ? JSON.stringify(byEngine(one)) : `the dialog did not draw: ${renderError}`);
  ok("2.2 · ★ once it listens (its default button enabled) Enter submits in all three — the submit the guard turns into the dialog — in a form of one text field and in one of eight (the deposit form, where Enter used to do nothing)",
    markup !== null && inAll(awake(one)) && inAll(awake(eight)), JSON.stringify({ one: byEngine(awake(one)), eight: byEngine(awake(eight)) }));
  const added = one.filter((c) => c.attrs.has("hidden"));
  const dflt = added.filter(isSubmitControl);
  const second = added.filter(isTextField);
  const unseen = (c: Control) => c.attrs.has("hidden") && c.attrs.get("tabindex") === "-1" && c.attrs.get("aria-hidden") === "true";
  ok("2.3 · what it adds is unseen, out of reach and posts nothing: ONE default button (hidden, out of the tab order, disabled in the server's markup, formnovalidate so bad input meets the kit's toast and never the browser's bubble) and ONE second text field (hidden, out of the tab order, with no name)",
    added.length === 2 && dflt.length === 1 && second.length === 1
      && unseen(dflt[0]) && off(dflt[0]) && dflt[0].attrs.has("formnovalidate")
      && unseen(second[0]) && !second[0].attrs.has("name"),
    JSON.stringify(added.map((c) => [c.tag, Object.fromEntries(c.attrs)])));
  ok("2.4 · without submitsForm the dialog draws its trigger and nothing else, so no other consumer's markup moves",
    markup !== null && plain.length === 2 && plain[0].tag === "input" && plain[1].tag === "button" && typeOf(plain[1]) === "button" && !markup.plain.includes("hidden"),
    markup ? markup.plain : renderError);

  log("§3 · the dialog — confirm-dialog.tsx as a syntax tree");
  const cdTree = parse(CD, decomment(w.read(CD)));
  const comp = findFunction(cdTree, "ConfirmDialog");
  const bare = callsIn(comp, (c) => ts.isIdentifier(c.expression) && c.expression.text === "onConfirm");
  const through = callsIn(comp, (c) => ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === "confirm"
    && c.arguments.length === 1 && ts.isIdentifier(c.arguments[0]) && c.arguments[0].text === "onConfirm");
  ok("3.1 · ★ the caller's onConfirm runs only inside the guard's confirm, in the held-open and the classic branch — a bare call's submit would be refused as Enter's, and the dialog would open again instead of sending",
    comp !== null && bare.length === 0 && through.length >= 2, JSON.stringify({ found: comp !== null, bare: bare.length, through: through.length }));
  const req = declIn(comp, "requestOpen");
  const reqText = req?.initializer?.getText(cdTree) ?? "";
  const order = ["openGuard()", "onOpen?.()", "setOpen(true)"].map((s) => reqText.indexOf(s));
  const clone = callsIn(comp, (c) => c.expression.getText(cdTree) === "React.cloneElement")[0] ?? null;
  const props = clone && clone.arguments[1] && ts.isObjectLiteralExpression(clone.arguments[1]) ? clone.arguments[1] : null;
  const prop = (name: string) => props?.properties.find((p) => p.name?.getText(cdTree) === name) ?? null;
  const onClickText = prop("onClick")?.getText(cdTree) ?? "";
  const disabledProp = prop("disabled");
  const disabledText = disabledProp && ts.isPropertyAssignment(disabledProp) ? disabledProp.initializer.getText(cdTree) : "";
  let refuse: ts.BinaryExpression | null = null;
  if (comp) walkTree(comp, (n) => {
    if (!refuse && ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(cdTree) === "refuseRef.current") refuse = n;
  });
  const rhs = refuse ? (refuse as ts.BinaryExpression).right : null;
  const decides = !!rhs && ts.isConditionalExpression(rhs)
    && /triggerDisabled/.test(rhs.condition.getText(cdTree)) && /(^|[^A-Za-z])open([^A-Za-z]|$)/.test(rhs.condition.getText(cdTree))
    && ts.isArrowFunction(rhs.whenTrue) && ts.isBlock(rhs.whenTrue.body) && rhs.whenTrue.body.statements.length === 0
    && ts.isIdentifier(rhs.whenFalse) && rhs.whenFalse.text === "requestOpen";
  ok("3.2 · ★ ONE WAY IN: the trigger's click and a refused submit open the dialog by one function (its openGuard, then its onOpen, then the dialog), a refused submit only where the trigger could (not disabled, not already open), and the trigger wears that same disabled value",
    order.every((i) => i >= 0) && order[0] < order[1] && order[1] < order[2]
      && /requestOpen[(][)]/.test(onClickText) && !/setOpen|onOpen|openGuard/.test(onClickText)
      && disabledText === "triggerDisabled" && decides,
    JSON.stringify({ order, onClick: onClickText.slice(0, 120), disabled: disabledText, refuse: rhs ? rhs.getText(cdTree).slice(0, 100) : null }));
  let defaultButton: ts.JsxSelfClosingElement | null = null;
  if (comp) walkTree(comp, (n) => {
    if (!defaultButton && ts.isJsxSelfClosingElement(n) && n.tagName.getText(cdTree) === "button"
      && attrOf(n, "type")?.initializer?.getText(cdTree) === QUOTE + "submit" + QUOTE) defaultButton = n;
  });
  const button = defaultButton as ts.JsxSelfClosingElement | null;
  const disabledAttr = button ? attrExpr(attrOf(button, "disabled"))?.getText(cdTree) ?? "" : "";
  const refAttr = button ? attrExpr(attrOf(button, "ref"))?.getText(cdTree) ?? "" : "";
  const effects = callsIn(comp, (c) => /^(React[.])?useEffect$/.test(c.expression.getText(cdTree)));
  const guardEffect = effects.find((c) => c.arguments.length > 0 && /[.]listen[(]/.test(c.arguments[0].getText(cdTree))) ?? null;
  const effectFn = guardEffect && ts.isArrowFunction(guardEffect.arguments[0]) ? guardEffect.arguments[0] : null;
  const effectText = effectFn ? effectFn.getText(cdTree) : "";
  const listenAt = effectText.search(/[.]listen[(]/);
  const onAt = effectText.indexOf("setListening(true)");
  const effectBody = effectFn && ts.isBlock(effectFn.body) ? effectFn.body : null;
  const cleanup = effectBody
    ? effectBody.statements.filter((s) => ts.isReturnStatement(s)).map((s) => (s as ts.ReturnStatement).expression?.getText(cdTree) ?? "").find((t) => t.includes("setListening(false)")) ?? ""
    : "";
  ok("3.3 · ★ the default button is enabled only once the guard listens: its disabled reads the listening state, set true after listen() and false when it stops — no Enter reaches a form that nothing guards",
    disabledAttr === "!listening" && listenAt >= 0 && onAt > listenAt && /stop[(][)]/.test(cleanup),
    JSON.stringify({ disabled: disabledAttr, listenAt, onAt, cleanup: cleanup.slice(0, 80) }));
  const listenCall = callsIn(effectFn, (c) => ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === "listen")[0] ?? null;
  const formArg = listenCall ? listenCall.arguments[0] : undefined;
  const formDecl = formArg && ts.isIdentifier(formArg) ? declIn(effectFn, formArg.text) : null;
  const refusedArg = listenCall && listenCall.arguments[1] ? listenCall.arguments[1].getText(cdTree) : "";
  ok("3.4 · the guard listens on the default button's own form (the form whose implicit submission that button decides, which is the form its trigger sits in) and hands a refusal to refuseRef",
    formDecl?.initializer?.getText(cdTree) === "defaultRef.current?.form" && refAttr === "defaultRef" && /refuseRef[.]current[(][)]/.test(refusedArg),
    JSON.stringify({ form: formDecl?.initializer?.getText(cdTree) ?? null, ref: refAttr, refused: refusedArg }));

  log("§4 · the census — every ConfirmDialog and ConfirmModal in src/, by scope");
  let c: Census = { files: 0, dialogs: [], forms: [] };
  let censusError = "";
  try { c = census(w); } catch (e) { censusError = String((e as Error)?.stack ?? e).split(NL).slice(0, 3).join(" "); }
  let fx = { pass: false, detail: "" };
  try { fx = fixtureCensus(); } catch (e) { fx = { pass: false, detail: `the fixtures threw: ${String((e as Error)?.message ?? e)}` }; }
  const cds = c.dialogs.filter((d) => d.kind === "ConfirmDialog");
  const cms = c.dialogs.filter((d) => d.kind === "ConfirmModal");
  const unread = [
    ...c.dialogs.filter((d) => d.why !== null).map((d) => `${d.file}:${d.line} ${d.why}`),
    ...c.forms.filter((f) => f.why !== null).map((f) => `${f.file}:${f.line} ${f.why}`),
  ];
  ok("4.0 · the census reads: at least 30 ConfirmDialogs and 20 ConfirmModals in 20 files, every onConfirm and every onSubmit resolved by scope to what it runs; and its fixtures: a confirm submitting through a named local is found, one through a wrapper's prop is found, a form the confirm made itself is not one to guard, a same-named handler in another component is not mistaken for it, and a handler it cannot read is reported, never passed",
    censusError === "" && cds.length >= 30 && cms.length >= 20 && c.files >= 20 && unread.length === 0 && fx.pass,
    `${censusError ? `the census threw: ${censusError} · ` : ""}${cds.length} ConfirmDialog · ${cms.length} ConfirmModal · ${c.files} files · unread: ${unread.join(" | ") || "none"} · fixtures: ${fx.detail}`);
  log(`     population: ${cds.length} ConfirmDialog, ${cms.length} ConfirmModal, ${c.forms.length} forms beside a confirm, in ${c.files} files`);
  const submitting = cds.filter((d) => d.submits);
  const unguarded = submitting.filter((d) => !d.guarded);
  const missing = SUBMITTERS.filter((f) => !submitting.some((d) => d.file === f));
  ok("4.1 · ★ every ConfirmDialog whose confirm submits a form carries submitsForm, so Enter in that form opens the dialog and never submits it; and the five that do today are among them by name: withdraw, deposit, close-account, the RG break and self-exclusion confirm, the hub's sign-out",
    submitting.length >= SUBMITTERS.length && unguarded.length === 0 && missing.length === 0,
    `submitting: ${submitting.map((d) => `${d.file}:${d.line}${d.guarded ? "" : " UNGUARDED"}`).join(", ")}${missing.length ? ` · missing by name: ${missing.join(", ")}` : ""}`);
  log(`     submitting, guarded: ${submitting.map((d) => `${d.file}:${d.line}`).join(", ") || "none"}`);
  const modalSubmits = cms.filter((d) => d.submits);
  const stray = cds.filter((d) => d.guarded && !d.submits);
  const ownMade = c.dialogs.filter((d) => d.created).map((d) => `${d.file}:${d.line}`);
  ok("4.2 · no ConfirmModal's confirm submits a form (ConfirmModal has no guard: such a form belongs to ConfirmDialog submitsForm), and submitsForm sits on no dialog whose confirm submits none, or only a form of its own making that nothing else can submit",
    modalSubmits.length === 0 && stray.length === 0,
    JSON.stringify({ modalSubmits: modalSubmits.map((d) => `${d.file}:${d.line}`), stray: stray.map((d) => `${d.file}:${d.line}`), madeTheirOwn: ownMade }));
  log(`     a form of their own making (nothing to guard): ${ownMade.join(", ") || "none"}`);
  const ledger = (f: FormRow) => DIRECT_BY_DESIGN.find((x) => x.file === f.file && x.component === f.component) ?? null;
  const asksFirst = (f: FormRow, opener: string) => {
    const at = f.handler.indexOf(opener);
    const direct = Math.min(...f.reaches.map((n) => { const i = f.handler.indexOf(n + "("); return i < 0 ? Infinity : i; }));
    return at >= 0 && at < direct;
  };
  const reaching = c.forms.filter((f) => f.reaches.length > 0);
  const broken = reaching.filter((f) => { const x = ledger(f); return x === null || !asksFirst(f, x.opener); });
  ok("4.3 · ★ every form whose submit OPENS a confirm keeps it so: no form's submit, nor a function of its file that the submit calls, reaches what a confirm of its file confirms; the two forms that ask only about some changes are named, and each asks before it saves",
    c.forms.length >= 10 && broken.length === 0,
    `${c.forms.length} forms read beside a confirm · reaching: ${reaching.map((f) => `${f.file}:${f.line} ${f.component} reaches ${f.reaches.join("/")}${ledger(f) ? "" : " UNNAMED"}`).join(", ") || "none"}`);
  const stale = DIRECT_BY_DESIGN.filter((x) => !reaching.some((f) => f.file === x.file && f.component === x.component));
  ok("4.4 · the two named forms still save directly for the changes they do not ask about — an exemption that no longer matches is deleted, not inherited",
    stale.length === 0, stale.map((x) => `${x.file} ${x.component}`).join(", "));

  log("§5 · the wiring");
  let scripts: Record<string, string> = {};
  try { scripts = (JSON.parse(w.read(PKG)) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { /* reported below */ }
  const predeploy = scripts["predeploy"] ?? "";
  ok("5.1 · this suite runs in predeploy, and its red twin is declared — in-process, with --prove-red",
    scripts["test:implicit-submit"] === "tsx " + SUITE && scripts["red:implicit-submit"] === "tsx " + SUITE + " --prove-red"
      && predeploy.includes("npm run test:implicit-submit"),
    JSON.stringify({ test: scripts["test:implicit-submit"] ?? null, red: scripts["red:implicit-submit"] ?? null, inPredeploy: predeploy.includes("npm run test:implicit-submit") }));
  ok("5.2 · the real-browser half is declared beside it: a local drive, outside predeploy, because it withdraws",
    scripts["qa:implicit-submit"] === "node " + DRIVE && !predeploy.includes("qa:implicit-submit"), scripts["qa:implicit-submit"] ?? "missing");
  return failed;
}

// ── THE RUN ────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!PROVE_RED) {
  console.log("implicit-submit — the Vodacom plan S6 A8j");
  if (bootError) console.log(`  (the suite's tools did not all load: ${bootError})`);
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`${NL}IMPLICIT SUBMIT — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${NL}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /** The real tree with one file's text replaced: `from` must occur exactly once, so a plant can never land twice. */
  const plantIn = (file: string, from: string, to: string): World => {
    const raw = readRaw(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 70))}`);
    const planted = raw.split(from).join(to);
    return { read: (rel) => (rel === file ? planted : readRaw(rel)) };
  };
  /** The same, for a text that may stand in more than one place (a script named in more than one chain). */
  const everywhere = (file: string, from: string, to: string): World => {
    const raw = readRaw(file);
    if (!raw.includes(from)) throw new Error(`plant anchor ${JSON.stringify(from)} is not in ${file}`);
    const planted = raw.split(from).join(to);
    return { read: (rel) => (rel === file ? planted : readRaw(rel)) };
  };
  const L = (...lines: string[]) => lines.join(NL);
  type Plant = { name: string; expect: RegExp; world: () => World };
  const plants: Plant[] = [
    { name: "a refused submit is not cancelled — the browser posts the form (the defect)", expect: /^1[.]1 /,
      world: () => plantIn(CD, L("        e.preventDefault();", "        e.stopPropagation();"), "        e.stopPropagation();") },
    { name: "a refused submit is cancelled but not stopped — React's root still hears it and marks the form pending", expect: /^1[.]1 /,
      world: () => plantIn(CD, L("        e.stopPropagation();", "        refused();"), "        refused();") },
    { name: "a refused submit is swallowed and the dialog never opens — Enter does nothing at all", expect: /^1[.]1 /,
      world: () => plantIn(CD, L("        refused();", "      };"), "      };") },
    { name: "every submit refused, the confirm's own too — the withdrawal can never be sent", expect: /^1[.]2 /,
      world: () => plantIn(CD, "        if (confirming) return;" + NL, "") },
    { name: "the confirm's window never closes — after one confirm, Enter submits the form again", expect: /^1[.]3 /,
      world: () => plantIn(CD, L("      } finally {", "        confirming = false;", "      }"), L("      } finally {", "      }")) },
    { name: "the guard's stop stops nothing — a dialog that has gone still refuses its form", expect: /^1[.]4 /,
      world: () => plantIn(CD, '      return () => form.removeEventListener("submit", onSubmit);', "      return () => {};") },
    { name: "one flag for every dialog — one dialog's confirm lets another form submit", expect: /^1[.]5 /,
      world: () => plantIn(CD, L("export function formGuard(): FormGuard {", "  let confirming = false;"), L("let confirming = false;", "export function formGuard(): FormGuard {")) },
    { name: "the default button drawn enabled by the server — before the page wakes, Enter posts the form", expect: /^2[.]1 /,
      world: () => plantIn(CD, "disabled={!listening}", "disabled={false}") },
    { name: "the default button dropped — once the page wakes Enter submits nothing, so it never opens the dialog", expect: /^2[.]2 /,
      world: () => plantIn(CD, '          <button ref={defaultRef} type="submit" formNoValidate hidden disabled={!listening} tabIndex={-1} aria-hidden />' + NL, "") },
    { name: "the second text field dropped — WebKit (every iPhone) submits the form before the page wakes", expect: /^2[.]1 /,
      world: () => plantIn(CD, '          <input type="text" hidden tabIndex={-1} aria-hidden autoComplete="off" />' + NL, "") },
    { name: "the default button without formNoValidate — Enter meets the browser's bubble, not the kit's toast", expect: /^2[.]3 /,
      world: () => plantIn(CD, 'type="submit" formNoValidate hidden', 'type="submit" hidden') },
    { name: "the second text field given a name — it posts with the form", expect: /^2[.]3 /,
      world: () => plantIn(CD, '<input type="text" hidden', '<input type="text" name="decoy" hidden') },
    { name: "the additions drawn for every dialog — every other consumer's markup moves", expect: /^2[.]4 /,
      world: () => plantIn(CD, "{submitsForm && (", "{(") },
    { name: "the held-open confirm calls onConfirm bare — its own submit is refused as Enter's and the withdrawal never leaves", expect: /^3[.]1 /,
      world: () => plantIn(CD, "const started = guard.confirm(onConfirm);", "const started = onConfirm();") },
    { name: "the trigger's click opens without its pre-flight — an invalid form earns a dialog", expect: /^3[.]2 /,
      world: () => plantIn(CD, L("      requestOpen();", "    },"), L("      setOpen(true);", "    },")) },
    { name: "a refused submit opens the dialog where the trigger is disabled — Enter gets past the close-account phrase", expect: /^3[.]2 /,
      world: () => plantIn(CD, "refuseRef.current = triggerDisabled || open ? () => {} : requestOpen;", "refuseRef.current = requestOpen;") },
    { name: "the default button enabled before the guard listens — a moment where Enter reaches a form nothing guards", expect: /^3[.]3 /,
      world: () => plantIn(CD, L("    const stop = guard.listen(form, () => refuseRef.current());", "    setListening(true);"), L("    setListening(true);", "    const stop = guard.listen(form, () => refuseRef.current());")) },
    { name: "the guard listens on the document — it would refuse every form's submit on the page", expect: /^3[.]4 /,
      world: () => plantIn(CD, "const form = defaultRef.current?.form;", "const form = document;") },
    { name: "the withdraw confirm loses submitsForm — Enter in the amount box sends the money again", expect: /^4[.]1 /,
      world: () => plantIn(WITHDRAW, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the deposit confirm loses submitsForm", expect: /^4[.]1 /,
      world: () => plantIn(DEPOSIT, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the close-account confirm loses submitsForm — Enter in the phrase box closes the account again", expect: /^4[.]1 /,
      world: () => plantIn(CLOSE, L("        submitsForm", "        trigger={"), "        trigger={") },
    { name: "the RG confirm loses submitsForm", expect: /^4[.]1 /,
      world: () => plantIn(RG, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the hub's sign-out loses submitsForm", expect: /^4[.]1 /,
      world: () => plantIn(SIGN_OUT, L("        submitsForm", "        trigger={"), "        trigger={") },
    { name: "a new dialog wired to submit its form with no submitsForm (credit-controls)", expect: /^4[.]1 /,
      world: () => plantIn(CREDIT, "        onConfirm={onReset}", "        onConfirm={() => formRef.current?.requestSubmit()}") },
    { name: "an onConfirm the census cannot read (a member of an object) — reported, never passed", expect: /^4[.]0 /,
      world: () => plantIn(SET_EMAIL, "        onConfirm={submit}", "        onConfirm={handlers.submit}") },
    { name: "a ConfirmModal wired to submit a page form (the desk rules' clear)", expect: /^4[.]2 /,
      world: () => plantIn(RULES, "        onConfirm={() => { setClearing(false); emptyEveryLimit(); }}", "        onConfirm={() => { setClearing(false); formRef.current?.requestSubmit(); }}") },
    { name: "the staff role form's submit commits directly — Enter changes a role with no confirm", expect: /^4[.]3 /,
      world: () => plantIn(STAFF, L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    setConfirming(true);"), L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    run();")) },
    { name: "the fee-model confirm dropped — a money-model change saves on Enter", expect: /^4[.]3 /,
      world: () => plantIn(CONFIG, L("    if (changed) {", "      setConfirmFd(fd);", "      return;", "    }", ""), "") },
    { name: "the fee-model form made to ask about every change — its exemption goes stale", expect: /^4[.]4 /,
      world: () => plantIn(CONFIG, L("    if (changed) {", "      setConfirmFd(fd);", "      return;", "    }", "    runSave(fd);"), "    setConfirmFd(fd);") },
    { name: "this suite dropped from predeploy", expect: /^5[.]1 /,
      world: () => everywhere(PKG, "npm run test:implicit-submit", "npm run test:enter-where-pressed") },
    { name: "its red twin undeclared", expect: /^5[.]1 /,
      world: () => plantIn(PKG, QUOTE + "red:implicit-submit" + QUOTE, QUOTE + "red:implicit-submit-gone" + QUOTE) },
    { name: "its drive undeclared", expect: /^5[.]2 /,
      world: () => plantIn(PKG, QUOTE + "qa:implicit-submit" + QUOTE, QUOTE + "qa:implicit-submit-gone" + QUOTE) },
  ];
  let caught = 0;
  let fail = 0;
  const say = (label: string, cond: boolean, extra = "") => {
    if (!cond) fail++;
    console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`);
  };
  const quiet = () => {};
  const clean = await run(REAL, quiet);
  say("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    let failures: string[];
    try { failures = await run(p.world(), quiet); } catch (e) { say(p.name, false, `the plant could not be made: ${String((e as Error)?.message ?? e)}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`${NL}RED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}${NL}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
