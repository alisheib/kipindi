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
 *      throws; a stopped guard stops; one dialog's confirm never lets another dialog's form submit; and ONE GUARD PER
 *      FORM: a second guard on a guarded form is refused (it throws in development, and in production says so and
 *      stays out), so the first still sends, and the first's stop frees the form for a remount.
 *   §2 THE MARKUP — `ConfirmDialog submitsForm` drawn by the server inside a form, read by each engine's own
 *      implicit-submission rule, from their sources: Chromium, Firefox, WebKit from Safari 16.4, and WebKit before
 *      Safari 16.4 (which presses only a RENDERED submit control). Before the guard listens Enter submits nothing in any
 *      of the four. Once it listens Enter submits in the first three (the submit the guard turns into the dialog), in a
 *      form of one text field and in one of eight; in WebKit before Safari 16.4 it submits nothing, before or after
 *      (inert, and safe: the trigger still opens the dialog — and Next 16 builds for Safari 16.4 and later, so such a
 *      device may never wake the page at all). What the prop adds is unseen, unreachable, posts nothing and is kept out
 *      of Firefox's form-state restoration; without the prop the dialog draws its trigger alone. A control runs the same
 *      rules over the form as it was, over each half of the fix alone, and over a form holding one more submit control
 *      after the guard's, and requires each to fall short.
 *   §3 THE DIALOG — `confirm-dialog.tsx` as a syntax tree: the caller's `onConfirm` runs only inside the guard's
 *      `confirm`; the trigger's click and a refused submit open the dialog by ONE function, a refused submit only where
 *      the trigger could; the default control is enabled only once the guard listens — never where the guard refused
 *      to — on that control's own form.
 *   §4 THE CENSUS — every ConfirmDialog and ConfirmModal in `src/`, its `onConfirm` resolved BY SCOPE (through a
 *      wrapper's callers in its file) to what it runs: the local functions it calls or hands on by name, the server
 *      actions (imports from a module whose first statement is "use server") those reach, and every other function
 *      imported from src/ that it calls, READ ONE HOP DEEP in its own module. A confirm SUBMITS A FORM when it reaches
 *      `requestSubmit()`, `submit()`, a submit event dispatched by hand, or a `click()` on a control its file binds as a
 *      ref to something that submits — in its own file or inside such an imported function. Every dialog whose confirm
 *      submits a form carries `submitsForm`, the five that do today among them by name; each submits in the confirm's
 *      own turn (4.6); no ConfirmModal submits one; a handler the census cannot read FAILS, and so does a confirm that
 *      calls an imported function the census cannot read one hop deep, unless IMPORTED_READ names it with a reason.
 *      Every form whose submit OPENS a confirm keeps it so: its submit (`onSubmit`, or `action={…}`) never reaches what a
 *      confirm of its file confirms — the confirm's own function (named or inline) and the local functions it calls,
 *      and the server actions those call — save two forms named with the call that asks, each read from its syntax
 *      tree to ask before it saves (the question in an `if` that returns, every save after it; or every save in an `if`
 *      that returns, the question after it). And across ALL of src/: no `<form action={X}>` names a server action some
 *      confirm calls itself, unless it is a host or ledgered — the cross-file shape three of the hosts use. And THE
 *      HOSTS (4.5), by name: each of the six host forms (in five files) holds exactly one guarded dialog, the one named
 *      for it, and NOTHING ELSE that can submit, ahead of it or after it.
 *      ⚠️ WHAT IT STILL CANNOT SEE, STATED RATHER THAN HIDDEN: what an imported function hands on to a SECOND import
 *      (one hop only); an imported function HANDED ON as a value rather than called; a submit control drawn by another
 *      component inside a host form (4.5 reads the host's own JSX, not the components it draws — the drive asks the
 *      page itself for every submit control of the form); and a submit spelt in a way it does not parse
 *      (`HTMLFormElement.prototype.requestSubmit.call(form)`) — which is why the five are ALSO required by name (4.1).
 *   §5 THE WIRING — this suite in predeploy; its red twin and its drive declared.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: nothing on disk changes. `--prove-red` plants each defect in a copy of the source held
 * in memory (in one file or several, a helper module among them), builds `confirm-dialog.tsx` from that copy (a plant
 * that breaks the build is reported as MISSED, never counted), and requires the check named for it to fail; every
 * plant's failed checks are printed. A GREEN control rides with them — a sound variant of the real tree (a guard clause
 * written the other way round) under which nothing may fail — so a check that is merely strict cannot pass for one that
 * is right. The real-browser half is `qa:implicit-submit`.
 * ⚠️ This file carries no backslash (line breaks are built from their code points), so a tool that decodes escapes on
 * the way to disk cannot change what it tests.
 */
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
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
const WITHDRAW_PAGE = "src/app/wallet/withdraw/page.tsx";
const DEPOSIT_PAGE = "src/app/wallet/deposit/page.tsx";
const RG_PAGE = "src/app/profile/responsible-gambling/page.tsx";
const ACCOUNT_PAGE = "src/app/profile/account/page.tsx";
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
 * deleted, never inherited. "Asks before it saves" is read from the syntax tree (4.3): the opener is called in the
 * then-block of an `if` that ENDS IN A RETURN, and nothing that saves is called before that `if` is done. A third form
 * may not join without a reason as good as these.
 */
const DIRECT_BY_DESIGN = [
  { file: CONFIG, component: "GlobalConfigForm", opener: "setConfirmFd(fd)",
    why: "only a change to the money model asks (the fee model, its two rate slices, the estimate): it reprices every future poll; any other rate saves on Save" },
  { file: UPDOWN, component: "ReadingMethodForm", opener: "setConfirmOpen(true)",
    why: "only the simulated feed asks, behind its typed word; a real source saves on Save" },
];

/**
 * ⭐ THE HOSTS (4.5) — every form a `submitsForm` dialog guards, BY NAME, with the dialog it must hold. The fix works only
 * while two things stay true of each: the dialog sits INSIDE the form its confirm submits, and NOTHING AHEAD of it in the
 * form can submit (the guard's control must be the form's first submit control, or Enter before the page wakes presses
 * another and posts the form natively). Three of the five files are pages no dialog census ever opens, so they are read
 * here, by name.
 */
type Host = { file: string; action: string; consumer: string; what: string };
const HOSTS: Host[] = [
  { file: WITHDRAW_PAGE, action: "{withdrawAction}", consumer: "WithdrawConfirm", what: "the withdrawal" },
  { file: DEPOSIT_PAGE, action: "{depositAction}", consumer: "DepositConfirm", what: "the deposit" },
  { file: RG_PAGE, action: "{coolOffAction}", consumer: "RgConfirmSubmit", what: "the break" },
  { file: RG_PAGE, action: "{selfExcludeAction}", consumer: "RgConfirmSubmit", what: "self-exclusion" },
  { file: CLOSE, action: "{closeAccountAction}", consumer: "ConfirmDialog", what: "closing the account" },
  { file: SIGN_OUT, action: QUOTE + "/auth/logout" + QUOTE, consumer: "ConfirmDialog", what: "the hub's sign-out" },
];
/** The components that draw a `submitsForm` dialog for a form their HOST draws, each with its file: every use of one is
 *  inside a host form above. */
const WRAPPERS: Record<string, string> = { WithdrawConfirm: WITHDRAW, DepositConfirm: DEPOSIT, RgConfirmSubmit: RG };
const isWrapper = (name: string) => Object.hasOwn(WRAPPERS, name);

/**
 * ⛔ THE IMPORTED FUNCTIONS THE CENSUS CANNOT READ ONE HOP DEEP, AND WHY EACH IS SAFE (A8j review) — keyed by export name
 * AND module. A function a confirm imports from elsewhere in src/ could submit a form on its behalf
 * (`submitClosestForm(btn)`), so the census READS it: finds its declaration in its module (an exported function or
 * const, or an arrow property of an exported object) and runs the same submit detector over it and the functions of its
 * own module it calls. Only one it cannot find that way — a re-export from a further module, a class's method, a module
 * outside src/ — must be named here, read by a person, with the reason it submits nothing; otherwise the confirm is
 * UNREAD (4.0). An entry no confirm needs any more is printed as a note to delete, never a failure: a harmless edit to
 * an admin screen must not stop a deploy. (Empty on 2026-10-07: all eleven imported functions confirms call are read.)
 */
const IMPORTED_READ: Record<string, string> = {};

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
type Guard = { confirm<T>(act: () => T): T; listen(form: EventTarget, refused: () => void): (() => void) | null };
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

/** Runs `act` as a production build runs it (NODE_ENV "production"), counting what it says on console.error, and puts
 *  both back exactly as they were. */
function asProduction<T>(act: () => T): { value: T | undefined; errors: number; threw: string } {
  const env = process.env as Record<string, string | undefined>;
  const had = Object.hasOwn(env, "NODE_ENV");
  const before = env.NODE_ENV;
  const realError = console.error;
  let errors = 0;
  console.error = () => { errors++; };
  env.NODE_ENV = "production";
  try {
    const value = act();
    return { value, errors, threw: "" };
  } catch (e) {
    return { value: undefined, errors, threw: String((e as Error)?.message ?? e) };
  } finally {
    if (had) env.NODE_ENV = before; else delete env.NODE_ENV;
    console.error = realError;
  }
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
const rendered = (c: Control) => !c.attrs.has("hidden");
type Engine = "chromium" | "firefox" | "webkit" | "webkit-legacy";
/** The engines that open the dialog on Enter once the guard listens. */
const MODERN: Engine[] = ["chromium", "firefox", "webkit"];
/** Every engine a player's phone or computer may run, the old WebKit among them. */
const ALL: Engine[] = [...MODERN, "webkit-legacy"];
/**
 * Does Enter in a text field submit this form? Each engine's own rule, read from its source on 2026-10-07:
 *  · Chromium, `HTMLFormElement::SubmitImplicitly`: the FIRST submit control in tree order decides. Enabled, it is
 *    clicked; disabled, "Default (submit) button is not activated; no implicit submission". With none, the form submits
 *    when exactly one field can trigger implicit submission. Nothing reads layout: a hidden control counts.
 *  · Firefox, `HTMLInputElement::MaybeSubmitForm`: the default submit element is clicked (a disabled one takes no
 *    click); with none, the form submits unless `ImplicitSubmissionIsDisabled()`, a count of text fields other than one.
 *  · WebKit from Safari 16.4 (`safari-7615-branch` on, and main), `HTMLFormElement::submitImplicitly`: the first
 *    SUCCESSFUL submit control is clicked; a disabled one is skipped and the walk goes on counting text fields
 *    (`canTriggerImplicitSubmission() { return isTextField(); }`), and the form submits when exactly one was counted.
 *  · WebKit BEFORE Safari 16.4 (to `safari-7614-branch`; the check is long-standing): the same walk, but a successful
 *    submit control is clicked only `if (formElement.renderer())` — a `hidden` one has no renderer, so it is skipped and
 *    NOT counted. (Next 16 builds for Safari 16.4 and later, `modern-browserslist-target.js`: such a device may never
 *    wake the page at all, and there Enter stays inert either way.)
 * ⚠️ Every WebKit presses the first ENABLED submit control wherever it stands in the form, skipping a disabled one: so
 * one more submit control anywhere in a guarded form — after the guard's control as much as before it — is pressed by
 * Enter on an iPhone before the page wakes. That is why 4.5 allows none.
 * ⭐ THE WEBKIT RULES HERE ARE THE STRICTER READING, KEPT ON PURPOSE. A real browser was kinder: in Playwright's WebKit
 * 2272 (OMEGA-COMPILE01, 2026-10-07) a form of one text field whose only submit control is disabled did NOT submit on
 * Enter before the page woke (`qa:implicit-submit` P1x, the second field taken out), while the same Enter on a form with
 * no submit control at all did (its P1 on the tree before A8j). A device whose WebKit follows the source as read is held
 * by the second field; one that honours the disabled control is held by the control alone. Modelling the stricter rule
 * keeps the field required.
 */
function enterSubmits(engine: Engine, cs: Control[]): boolean {
  const fields = cs.filter(isTextField).length;
  if (engine === "webkit") return cs.some((c) => isSubmitControl(c) && !off(c)) || fields === 1;
  if (engine === "webkit-legacy") return cs.some((c) => isSubmitControl(c) && !off(c) && rendered(c)) || fields === 1;
  const first = cs.find(isSubmitControl);
  return first ? !off(first) : fields === 1;
}
const inEvery = (es: Engine[], cs: Control[]) => es.every((e) => enterSubmits(e, cs));
const inNone = (es: Engine[], cs: Control[]) => es.every((e) => !enterSubmits(e, cs));
const byEngine = (cs: Control[]) => Object.fromEntries(ALL.map((e) => [e, enterSubmits(e, cs)]));
/** The controls as the guard leaves them once it listens: its default control enabled. (These forms are drawn by this
 *  suite and hold no submit control but the guard's, so every submit control in them is the guard's.) */
const awake = (cs: Control[]): Control[] =>
  cs.map((c) => (isSubmitControl(c) ? { tag: c.tag, attrs: new Map([...c.attrs].filter(([k]) => k !== "disabled")) } : c));
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
/** An attribute's text when it is a literal: "" when absent, the string when written as one, null when an expression. */
function attrString(t: Tag, name: string): string | null {
  const a = attrOf(t, name);
  if (!a) return "";
  const init = a.initializer;
  if (init && ts.isStringLiteral(init)) return init.text;
  const e = attrExpr(a);
  if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))) return e.text;
  return null;
}
type Fn = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
/** An expression with its parentheses, `!`, `as` and `satisfies` taken off. */
function strip(e: ts.Expression): ts.Expression {
  let x = e;
  while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isSatisfiesExpression(x) || ts.isNonNullExpression(x)) x = x.expression;
  return x;
}

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
  if (!e) return null;
  const x = strip(e);
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

// ── THE MODULES AN IMPORT NAMES — a server action ("use server"), another function of src/, or a package's ──────────
type Env = { read: (rel: string) => string; has: (rel: string) => boolean };
const POPULATION = srcFiles();
const POP_SET = new Set(POPULATION);
/** The modules of a world as its imports read them — so a plant in a helper module is the helper the census reads. */
const envOf = (w: World): Env => ({ read: w.read, has: (rel) => POP_SET.has(rel) });
/** An Env that also writes down every module it was asked for, and the text it gave (null: none), so a census result
 *  can be reused only while every module it read still reads the same. */
function tracking(env: Env, deps: Map<string, string | null>): Env {
  return {
    has: env.has,
    read: (rel) => {
      let text: string | null = null;
      try { text = env.read(rel); return text; } finally { deps.set(rel, text); }
    },
  };
}
const parsedModules = new Map<string, Map<string, ts.SourceFile>>();
/** A module's syntax tree, parsed once per text it has held. */
function parsedModule(rel: string, text: string): ts.SourceFile {
  let byText = parsedModules.get(rel);
  if (!byText) { byText = new Map(); parsedModules.set(rel, byText); }
  let sf = byText.get(text);
  if (!sf) { sf = parse(rel, text); byText.set(text, sf); }
  return sf;
}
const MODULE_TRIES = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
/** The src/ module an import specifier names (`@/…`, or relative to the importing file), or null for a package. */
function moduleOf(spec: string, from: string, env: Env): string | null {
  const base = spec.startsWith("@/") ? "src/" + spec.slice(2)
    : spec.startsWith("./") || spec.startsWith("../") ? posix.normalize(posix.join(posix.dirname(from), spec))
    : null;
  if (base === null) return null;
  return MODULE_TRIES.map((t) => base + t).find((p) => env.has(p)) ?? base;
}
/** Whether a module's FIRST STATEMENT is the "use server" directive: then every function it exports is a server action. */
function isUseServer(rel: string, env: Env): boolean {
  let text: string;
  try { text = env.read(rel); } catch { return false; }
  const first = parsedModule(rel, text).statements[0];
  return !!first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === "use server";
}
/** The import a binding is, or null: its module specifier and the name it imports ("default", or "*" for a namespace). */
function importOf(decl: ts.Node | null): { spec: string; name: string; ns: boolean } | null {
  if (!decl) return null;
  let d: ts.Node | undefined = decl;
  while (d && !ts.isImportDeclaration(d)) d = d.parent;
  if (!d || !ts.isImportDeclaration(d) || !ts.isStringLiteral(d.moduleSpecifier) || d.importClause?.isTypeOnly) return null;
  const spec = d.moduleSpecifier.text;
  if (ts.isImportSpecifier(decl)) return decl.isTypeOnly ? null : { spec, name: (decl.propertyName ?? decl.name).text, ns: false };
  if (ts.isImportClause(decl)) return { spec, name: "default", ns: false };
  if (ts.isNamespaceImport(decl)) return { spec, name: "*", ns: true };
  return null;
}

type Ctx = { sf: ts.SourceFile; rel: string; env: Env };
/** An imported callee is keyed `exportName@module` (`X.y` for a member of an exported object), whatever the importing
 *  file calls it locally. */
type Callee =
  | { kind: "local"; fn: Fn }
  | { kind: "action"; key: string; name: string }
  | { kind: "imported"; key: string; name: string; exportName: string; module: string }
  | { kind: "none" };
function fromModule(spec: string, exportName: string, shown: string, ctx: Ctx): Callee {
  const mod = moduleOf(spec, ctx.rel, ctx.env);
  if (mod === null) return { kind: "none" };
  if (isUseServer(mod, ctx.env)) return { kind: "action", key: exportName + "@" + mod, name: shown };
  return { kind: "imported", key: exportName + "@" + mod, name: shown, exportName, module: mod };
}
/**
 * What an expression names when it is called, or handed on to be called: a function of this file; a SERVER ACTION (an
 * import from a module whose first statement is "use server"); another function imported from src/; or nothing this
 * census follows (a package's export, a hook's helper, a state setter, a member of a local object).
 */
function calleeOf(expr: ts.Expression, ctx: Ctx, hops = 0): Callee {
  const e = strip(expr);
  if (ts.isIdentifier(e)) {
    const decl = bindingOf(e.text, e);
    const f = fnOf(decl);
    if (f) return { kind: "local", fn: f };
    // an alias of another name (`const act = saveAction`) is that name
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer && hops < 3) {
      const init = strip(decl.initializer);
      if (ts.isIdentifier(init)) return calleeOf(init, ctx, hops + 1);
    }
    const imp = importOf(decl);
    return imp && !imp.ns ? fromModule(imp.spec, imp.name, e.text, ctx) : { kind: "none" };
  }
  if (ts.isPropertyAccessExpression(e)) {
    const root = strip(e.expression);
    if (ts.isIdentifier(root)) {
      const imp = importOf(bindingOf(root.text, root));
      if (imp) return fromModule(imp.spec, imp.ns ? e.name.text : imp.name + "." + e.name.text, root.text + "." + e.name.text, ctx);
    }
  }
  return { kind: "none" };
}

/** An imported function READ ONE HOP DEEP: its declaration in its own module, with that module as its context — or why
 *  it cannot be read that way. */
type Hop = { fn: Fn; ctx: Ctx; why: null } | { fn: null; ctx: null; why: string };
const isExported = (st: ts.Node) => (ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
/** The declaration a module exports under `name` — an exported function or const, or a local one exported by name — or
 *  why there is none to read: a re-export from a further module is a further hop, and is not followed. */
function exportedDecl(sf: ts.SourceFile, name: string): ts.Node | string {
  const local = (n: string): ts.Node | null => {
    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && st.name?.text === n) return st;
      if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === n) return d;
    }
    return null;
  };
  for (const st of sf.statements) {
    if (name === "default" && ts.isExportAssignment(st)) {
      const e = strip(st.expression);
      return ts.isIdentifier(e) ? local(e.text) ?? "its default export is not declared in its module" : fnOfExpr(e) ?? "its default export is not a function";
    }
    if (isExported(st)) {
      const isDefault = (ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
      if (ts.isFunctionDeclaration(st) && (name === "default" ? isDefault : st.name?.text === name)) return st;
      if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name) return d;
    }
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) {
        if (el.name.text !== name) continue;
        if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) return `it is re-exported from ${st.moduleSpecifier.text}, a further hop`;
        return local((el.propertyName ?? el.name).text) ?? "it is exported but not declared in its module";
      }
    }
  }
  return "its module does not export it";
}
function readImported(exportName: string, module: string, env: Env): Hop {
  let text: string;
  try { text = env.read(module); } catch { return { fn: null, ctx: null, why: `its module ${module} is not a file of src/` }; }
  const sf = parsedModule(module, text);
  const ctx: Ctx = { sf, rel: module, env };
  const dot = exportName.indexOf(".");
  const root = dot < 0 ? exportName : exportName.slice(0, dot);
  const member = dot < 0 ? null : exportName.slice(dot + 1);
  const decl = exportedDecl(sf, root);
  if (typeof decl === "string") return { fn: null, ctx: null, why: decl };
  const asFn = (d: ts.Node): Fn | null => fnOf(d) ?? (ts.isArrowFunction(d) || ts.isFunctionExpression(d) ? d : null);
  if (member === null) {
    const fn = asFn(decl);
    return fn ? { fn, ctx, why: null } : { fn: null, ctx: null, why: "it is exported as something other than a function" };
  }
  const init = ts.isVariableDeclaration(decl) && decl.initializer ? strip(decl.initializer) : null;
  if (!init || !ts.isObjectLiteralExpression(init)) return { fn: null, ctx: null, why: `${root} is not an object literal of functions` };
  for (const p of init.properties) {
    if (p.name?.getText(sf) !== member) continue;
    const fn = ts.isPropertyAssignment(p) ? fnOfExpr(p.initializer) : null;
    return fn ? { fn, ctx, why: null } : { fn: null, ctx: null, why: `${exportName} is a method or a value, not an arrow or function property` };
  }
  return { fn: null, ctx: null, why: `${exportName} is not found in its module` };
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
  const id = strip(e);
  if (!ts.isIdentifier(id)) return { runs: [], why: `a handler this census cannot read: ${e.getText(sf).slice(0, 60)}` };
  const decl = bindingOf(id.text, id);
  const named = fnOf(decl);
  if (named) return { runs: [{ fn: named, named: true }], why: null };
  if (decl && ts.isBindingElement(decl) && ts.isObjectBindingPattern(decl.parent) && ts.isParameter(decl.parent.parent) && depth < 3) {
    const owner = ownerName(decl.parent.parent.parent);
    const prop = (decl.propertyName ?? decl.name).getText(sf);
    if (!owner) return { runs: [], why: `${id.text} is a prop of a component this census cannot name` };
    const sites: Tag[] = [];
    walkTree(sf, (n) => { if (isTag(n) && n.tagName.getText(sf) === owner) sites.push(n); });
    if (sites.length === 0) return { runs: [], why: `${id.text} is a prop of ${owner}, and nothing in this file hands it one` };
    const out: Resolved = { runs: [], why: null };
    for (const s of sites) {
      const sub = resolveHandler(attrExpr(attrOf(s, prop)), sf, depth + 1);
      out.runs.push(...sub.runs);
      if (sub.why) out.why = `${owner} at line ${lineOf(sf, s)}: ${sub.why}`;
    }
    return out;
  }
  return { runs: [], why: `${id.text} is bound to no function this census can read` };
}

type Reached = { fns: Set<Fn>; actions: Map<string, string>; imported: Map<string, string> };
/**
 * A function and everything it may run: the local functions it calls, or hands on by name to be called (a timer, a
 * `.then`, a transition), to three calls deep — the calls inside its closures included, as they run when it runs or
 * later on its behalf — the server actions any of them calls or hands on, and the other imported src/ functions any of
 * them CALLS (keyed `name@module`; a value handed on is not one, as a constant handed to a formatter is no call).
 */
function reach(fn: Fn, ctx: Ctx, depth = 3, out: Reached = { fns: new Set(), actions: new Map(), imported: new Map() }): Reached {
  if (out.fns.has(fn)) return out;
  out.fns.add(fn);
  if (depth === 0) return out;
  const take = (c: Callee, called: boolean) => {
    if (c.kind === "local") reach(c.fn, ctx, depth - 1, out);
    else if (c.kind === "action") out.actions.set(c.key, c.name);
    else if (c.kind === "imported" && called) out.imported.set(c.key, c.name);
  };
  walkTree(fn, (n) => {
    if (!ts.isCallExpression(n)) return;
    take(calleeOf(n.expression, ctx), true);
    for (const a of n.arguments) take(calleeOf(a, ctx), false);
  });
  return out;
}
/**
 * The server actions a function calls or hands on ITSELF — in its own body and its closures, not through another local
 * function: what it commits. ⭐ A confirm CONFIRMS the commit its own target makes. Followed further, the bulk contacts
 * confirm (which asks the server for a fresh count when the audience moved under it) would "confirm" the very preview
 * its form's submit runs to OPEN it — and the form would read as committing past its confirm when it only asks.
 */
function directActions(fn: Fn, ctx: Ctx): Map<string, string> {
  const out = new Map<string, string>();
  walkTree(fn, (n) => {
    if (!ts.isCallExpression(n)) return;
    for (const x of [n.expression, ...n.arguments]) {
      const c = calleeOf(x, ctx);
      if (c.kind === "action") out.set(c.key, c.name);
    }
  });
  return out;
}

// ── WHAT SUBMITS A FORM ───────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Whether a JSX element can submit the form it sits in, and how, or null: a submit or image input; a button, or a kit
 * `Button` (which draws a `<button>` and sets no type), of type submit or of NO type (a submit button inside a form);
 * a `SubmitButton`. ⛔ A type the census cannot read (an expression) counts as one that submits.
 */
function submitCapable(t: Tag, sf: ts.SourceFile): string | null {
  const name = t.tagName.getText(sf);
  const type = attrString(t, "type");
  if (name === "SubmitButton") return "a SubmitButton";
  if (name === "button" || name === "Button") {
    if (type === null) return `a ${name} whose type is an expression`;
    const ty = type.toLowerCase();
    return ty === "" ? `a ${name} with no type, which inside a form is a submit button` : ty === "submit" ? `a ${name} of type submit` : null;
  }
  if (name === "input") {
    if (type === null) return "an input whose type is an expression";
    const ty = type.toLowerCase();
    return ty === "submit" || ty === "image" ? `an input of type ${ty}` : null;
  }
  return null;
}
/** Whether `recv` is a form this function made itself (`document.createElement("form")`): nothing else can submit it. */
function madeHere(recv: ts.Expression): boolean {
  const r = strip(recv);
  const decl = ts.isIdentifier(r) ? bindingOf(r.text, r) : null;
  const init = decl && ts.isVariableDeclaration(decl) && decl.initializer ? strip(decl.initializer).getText() : "";
  return /^document[.]createElement[(]["']form["'][)]$/.test(init);
}
/** `new Event("submit", …)` or `new SubmitEvent("submit", …)`. */
function isSubmitEvent(a: ts.Expression | undefined): boolean {
  const x = a ? strip(a) : null;
  if (!x || !ts.isNewExpression(x) || !/^(Event|SubmitEvent)$/.test(x.expression.getText())) return false;
  const first = x.arguments?.[0];
  return !!first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) && first.text === "submit";
}
/** What a `.click()` receiver is, when its file binds it as a ref to a control that submits (`saveRef.current`, or a
 *  local alias of it), or null. */
function clickedControl(recv: ts.Expression, ctx: Ctx): string | null {
  let r = strip(recv);
  if (ts.isIdentifier(r)) {
    const d = bindingOf(r.text, r);
    if (d && ts.isVariableDeclaration(d) && d.initializer) r = strip(d.initializer);
  }
  if (ts.isPropertyAccessExpression(r) && r.name.text === "current") r = strip(r.expression);
  if (!ts.isIdentifier(r)) return null;
  const bound = bindingOf(r.text, r);
  if (!bound) return null;
  let found = null as string | null;
  walkTree(ctx.sf, (n) => {
    if (found !== null || !isTag(n)) return;
    const ref = attrExpr(attrOf(n, "ref"));
    if (!ref || !ts.isIdentifier(ref) || bindingOf(ref.text, ref) !== bound) return;
    const how = submitCapable(n, ctx.sf);
    if (how) found = `${r.getText(ctx.sf)}, ${how}`;
  });
  return found;
}
type SubmitAt = { how: string; created: boolean };
/**
 * Whether a call SUBMITS A FORM, and how: `x.requestSubmit()` and `x.submit()`; `x.dispatchEvent(new Event("submit"…))`;
 * and `x.click()` on a control the file binds as a ref to something that submits — the very control Enter presses in
 * that form. A form the function made itself is marked as such.
 */
function submitAt(n: ts.Node, ctx: Ctx): SubmitAt | null {
  if (!ts.isCallExpression(n)) return null;
  const callee = strip(n.expression);
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const m = callee.name.text;
  const recv = callee.expression;
  if (m === "requestSubmit" || m === "submit") return { how: m + "()", created: madeHere(recv) };
  if (m === "dispatchEvent" && isSubmitEvent(n.arguments[0])) return { how: "a submit event dispatched by hand", created: madeHere(recv) };
  if (m === "click" && n.arguments.length === 0) {
    const what = clickedControl(recv, ctx);
    if (what) return { how: `click() on ${what}`, created: false };
  }
  return null;
}
/**
 * Whether `n` runs AFTER an await of `fn` (not of a function inside it), and which: an await or yield that ends before
 * `n` starts; one in a loop around both (the loop's next pass runs after it); or a `for await` around `n`.
 */
function afterAwait(n: ts.Node, fn: ts.Node, sf: ts.SourceFile): string | null {
  const start = n.getStart(sf);
  const loops: ts.Node[] = [];
  for (let p = n.parent; p && p !== fn; p = p.parent) if (ts.isIterationStatement(p, false)) loops.push(p);
  let hit = null as string | null;
  const go = (m: ts.Node) => {
    if (hit !== null) return;
    if (m !== fn && ts.isFunctionLike(m)) return;
    const forAwait = ts.isForOfStatement(m) && !!m.awaitModifier;
    if (forAwait && m.statement.pos <= n.pos && n.end <= m.statement.end) hit = `inside the for await at line ${lineOf(sf, m)}`;
    else if (ts.isAwaitExpression(m) || ts.isYieldExpression(m) || forAwait) {
      if (m.getEnd() <= start) hit = `after the await at line ${lineOf(sf, m)}`;
      else if (loops.some((l) => l.pos <= m.pos && m.end <= l.end)) hit = `after the await at line ${lineOf(sf, m)}, on its loop's next pass`;
    }
    ts.forEachChild(m, go);
  };
  go(fn);
  return hit;
}
type Site = { where: string; how: string; late: string | null; created: boolean };
/**
 * ⭐ (4.1, 4.6) Every submit a handler reaches, each with WHEN it happens: in the confirm's own turn (`late` null), or
 * later — inside a function the handler hands on (a `.then`, a timer, a transition), after an await, or in a local
 * function handed on by name. The guard lets through only a submit fired inside `confirm()`. It reads the handler's own
 * file three calls deep, and each function imported from src/ that the file calls ONE HOP deep, in that function's own
 * module (what that function in turn imports is a further hop, and is not read).
 */
function submitSites(root: Fn, rootCtx: Ctx): Site[] {
  const out: Site[] = [];
  const seen = new Set<string>();
  const visit = (fn: Fn, ctx: Ctx, late: string | null, depth: number) => {
    const key = `${ctx.rel}:${fn.pos}:${fn.end}:${late === null ? "now" : "late"}`;
    if (seen.has(key)) return;
    seen.add(key);
    const at = (n: ts.Node) => `${ctx.rel === rootCtx.rel ? "line " : ctx.rel + ":"}${lineOf(ctx.sf, n)}`;
    const go = (n: ts.Node, lateHere: string | null) => {
      if (n !== fn && ts.isFunctionLike(n)) {
        const why = lateHere ?? `inside a function handed on at ${at(n)}`;
        ts.forEachChild(n, (k) => go(k, why));
        return;
      }
      if (ts.isCallExpression(n)) {
        const when = lateHere ?? afterAwait(n, fn, ctx.sf);
        const s = submitAt(n, ctx);
        if (s) out.push({ where: at(n), how: s.how, late: when, created: s.created });
        if (depth > 0) {
          const c = calleeOf(n.expression, ctx);
          if (c.kind === "local") visit(c.fn, ctx, when, depth - 1);
          else if (c.kind === "imported" && ctx.rel === rootCtx.rel) {
            const hop = readImported(c.exportName, c.module, ctx.env);
            if (hop.fn) visit(hop.fn, hop.ctx, when, depth - 1);
          }
          for (const a of n.arguments) {
            const g = calleeOf(a, ctx);
            if (g.kind === "local") visit(g.fn, ctx, when ?? `in ${fnName(g.fn)}, handed on by name at ${at(a)}`, depth - 1);
          }
        }
      }
      ts.forEachChild(n, (k) => go(k, lateHere));
    };
    go(fn, late);
  };
  visit(root, rootCtx, null, 3);
  return out;
}
/**
 * What a confirm CONFIRMS of its own file: its own function when it is named, and — named or inline alike — the local
 * functions it calls or hands on by name directly, one level (not inside a closure of its own). ⛔ One level for a NAMED
 * handler too: `onConfirm={confirmRun}` that calls `run()` confirms `run`, and a form whose submit calls `run()` itself
 * commits past the question exactly as it would beside an inline `onConfirm={() => run()}`.
 */
function targetsOf(r: Run, ctx: Ctx): Fn[] {
  const out: Fn[] = r.named ? [r.fn] : [];
  const go = (n: ts.Node) => {
    if (n !== r.fn && ts.isFunctionLike(n)) return;
    if (ts.isCallExpression(n)) {
      for (const x of [n.expression, ...n.arguments]) {
        const c = calleeOf(x, ctx);
        if (c.kind === "local") out.push(c.fn);
      }
    }
    ts.forEachChild(n, go);
  };
  go(r.fn);
  return out;
}
function callsIn(root: ts.Node | null, test: (c: ts.CallExpression) => boolean): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  if (root) walkTree(root, (n) => { if (ts.isCallExpression(n) && test(n)) out.push(n); });
  return out;
}
/** Whether an if's then-branch ends in a return (a block whose last statement returns, or a bare return). */
const returnsAtEnd = (s: ts.IfStatement) => {
  const then = s.thenStatement;
  const last = ts.isBlock(then) ? then.statements[then.statements.length - 1] : then;
  return !!last && ts.isReturnStatement(last);
};
/** The if, in `fn` itself (not in a function it hands on), whose then-branch holds `n` and ends in a return; or null. */
function returningIfAround(n: ts.Node, fn: Fn): ts.IfStatement | null {
  for (let p: ts.Node | undefined = n.parent; p && p !== fn; p = p.parent) {
    if (!ts.isIfStatement(p) || !(p.thenStatement.pos <= n.pos && n.end <= p.thenStatement.end) || !returnsAtEnd(p)) continue;
    let own = true;
    for (let q: ts.Node | undefined = p.parent; q && q !== fn; q = q.parent) if (ts.isFunctionLike(q)) own = false;
    if (own) return p;
  }
  return null;
}
/**
 * ⭐ (4.3) Whether a ledgered submit ASKS BEFORE IT SAVES, read from its syntax tree rather than from the order of its
 * text, in either of the two shapes a guard clause takes:
 *  · THE QUESTION RETURNS FIRST — the opener is called in the then-branch of an `if` that ENDS IN A RETURN, in the
 *    submit itself, and every call that reaches what a confirm confirms comes after that `if`;
 *  · THE SAVE RETURNS FIRST — every such call sits in the then-branch of an `if` that ends in a return (the changes
 *    that need no question), and the opener comes after it.
 * Null when it does; else what is wrong with each shape. (A `return` deleted after the opener once left the form asking
 * AND saving, and a text-order check passed it.)
 */
function asksFirst(runs: Run[], opener: string, ctx: Ctx, saves: (c: ts.CallExpression) => boolean): string | null {
  const sf = ctx.sf;
  for (const rr of runs) {
    const fn = rr.fn;
    const op = callsIn(fn, (c) => c.getText(sf) === opener)[0] ?? null;
    if (!op) return `${opener} is not called by the submit`;
    for (let p: ts.Node | undefined = op.parent; p && p !== fn; p = p.parent) {
      if (ts.isFunctionLike(p)) return `${opener} sits in a function the submit hands on (line ${lineOf(sf, p)}), not in the submit itself`;
    }
    const saving = callsIn(fn, saves);
    // the question returns first
    const asks = returningIfAround(op, fn);
    const early = asks ? saving.filter((c) => c.getStart(sf) < asks.getEnd()) : [];
    const first = asks === null
      ? `the question (${opener}) sits in no if that returns, so the submit asks and then saves as well`
      : early.length > 0 ? `it reaches the save at line ${early.map((c) => lineOf(sf, c)).join(", ")} before the if that asks (line ${lineOf(sf, asks)}) is done` : null;
    if (first === null) continue;
    // the save returns first
    const held = saving.map((c) => ({ c, s: returningIfAround(c, fn) }));
    const loose = held.filter((x) => x.s === null).map((x) => lineOf(sf, x.c));
    const second = saving.length === 0 ? "nothing in it saves"
      : loose.length > 0 ? `the save at line ${loose.join(", ")} sits in no if that returns`
      : held.some((x) => op.getStart(sf) < x.s!.getEnd()) ? `the question (line ${lineOf(sf, op)}) comes before the if that saves has returned`
      : null;
    if (second === null) continue;
    return `${first}; and ${second}`;
  }
  return null;
}

type DialogRow = {
  file: string; line: number; kind: string; component: string | null;
  submits: boolean; created: boolean; guarded: boolean; late: string[];
  actions: string[]; actionKeys: string[]; imported: string[]; unreadImports: string[]; why: string | null;
};
type FormRow = { file: string; line: number; component: string; reaches: string[]; why: string | null; asks: (opener: string) => string | null };
/** A `<form action={X}>` anywhere in src/ whose X is a server action: the cross-file host shape (4.3). */
type ActionForm = { file: string; line: number; component: string; key: string; name: string; attr: string };
type Found = { dialogs: DialogRow[]; forms: FormRow[]; actionForms: ActionForm[] };
type Census = { files: number } & Found;
function censusOfFile(rel: string, code: string, env: Env): Found {
  const sf = parse(rel, code);
  const ctx: Ctx = { sf, rel, env };
  const tags: Tag[] = [];
  walkTree(sf, (n) => { if (isTag(n)) tags.push(n); });
  const dialogs: DialogRow[] = [];
  /** What the confirms of this file confirm: their local functions, and the server actions those call themselves. */
  const targets = new Set<Fn>();
  const actionTargets = new Set<string>();
  for (const t of tags) {
    const kind = t.tagName.getText(sf);
    if (kind !== "ConfirmDialog" && kind !== "ConfirmModal") continue;
    const r = resolveHandler(attrExpr(attrOf(t, "onConfirm")), sf);
    let submits = false;
    let created = false;
    const late: string[] = [];
    const actions = new Map<string, string>();
    const imported = new Map<string, string>();
    for (const rr of r.runs) {
      for (const [k, v] of reach(rr.fn, ctx).imported) imported.set(k, v);
      const tgs = targetsOf(rr, ctx);
      for (const f of tgs) targets.add(f);
      for (const f of [rr.fn, ...tgs]) for (const [k, v] of directActions(f, ctx)) { actions.set(k, v); actionTargets.add(k); }
      for (const s of submitSites(rr.fn, ctx)) {
        if (s.created) { created = true; continue; }
        submits = true;
        if (s.late !== null) late.push(`${s.where}, ${s.how} ${s.late}`);
      }
    }
    // ⛔ (A8j review) Every imported function the confirm calls is READ ONE HOP DEEP (above, by submitSites). One the census
    // cannot read that way may submit a form on the confirm's behalf, unseen: the confirm is UNREAD unless IMPORTED_READ
    // names that function with the reason it submits nothing.
    const unreadImports: string[] = [];
    const unread: string[] = [];
    for (const [key, shown] of imported) {
      const at = key.indexOf("@");
      const hop = readImported(key.slice(0, at), key.slice(at + 1), env);
      if (hop.fn !== null) continue;
      unreadImports.push(key);
      if (!Object.hasOwn(IMPORTED_READ, key)) unread.push(`${shown} (${key}: ${hop.why})`);
    }
    const why = r.why ?? (unread.length > 0
      ? `it calls ${unread.join("; ")}, which this census cannot read one hop deep — read it, and if it submits no form, name it in IMPORTED_READ with that reason`
      : null);
    dialogs.push({ file: rel, line: lineOf(sf, t), kind, component: componentOf(t), submits, created, guarded: isOn(attrOf(t, "submitsForm")),
      late, actions: [...actions.values()], actionKeys: [...actions.keys()], imported: [...imported.keys()], unreadImports, why });
  }
  /** Whether a call reaches what a confirm of this file confirms: the call itself, or a function it hands on. */
  const saves = (c: ts.CallExpression): boolean => {
    for (const x of [c.expression, ...c.arguments]) {
      const k = calleeOf(x, ctx);
      if (k.kind === "action" && actionTargets.has(k.key)) return true;
      if (k.kind === "local") {
        const got = reach(k.fn, ctx);
        if ([...got.fns].some((f) => targets.has(f)) || [...got.actions.keys()].some((a) => actionTargets.has(a))) return true;
      }
    }
    return false;
  };
  const forms: FormRow[] = [];
  const actionForms: ActionForm[] = [];
  for (const t of tags) {
    if (t.tagName.getText(sf) !== "form") continue;
    // ⭐ `action={…}` is read the same way as onSubmit: an imported server action is the commit itself; a local function
    // or an arrow is what the submit runs; any other import is a function this census does not read, and says so.
    const actAttr = attrOf(t, "action");
    const act = attrExpr(actAttr);
    const actFn = act && !ts.isStringLiteral(strip(act)) && !ts.isNoSubstitutionTemplateLiteral(strip(act)) ? calleeOf(act, ctx) : null;
    // Every form in src/ whose action is a server action is written down, whether or not its file draws a confirm.
    if (actFn?.kind === "action") {
      actionForms.push({ file: rel, line: lineOf(sf, t), component: componentOf(t) ?? "(unnamed)", key: actFn.key, name: actFn.name, attr: actAttr!.initializer!.getText(sf) });
    }
    if (dialogs.length === 0) continue;
    const handlers: ts.Expression[] = [];
    const direct = new Map<string, string>();
    let why = null as string | null;
    const on = attrExpr(attrOf(t, "onSubmit"));
    if (on) handlers.push(on);
    if (act && actFn) {
      if (actFn.kind === "action") direct.set(actFn.key, actFn.name);
      else if (actFn.kind === "imported") why = `the form's action ${actFn.name} is a function of ${actFn.module} this census does not read`;
      else handlers.push(act);
    }
    if (handlers.length === 0 && direct.size === 0 && why === null) continue;
    const runs: Run[] = [];
    for (const h of handlers) {
      const r = resolveHandler(h, sf);
      runs.push(...r.runs);
      if (r.why) why = r.why;
    }
    const hits = new Set<string>();
    for (const rr of runs) {
      const got = reach(rr.fn, ctx);
      for (const f of got.fns) if (targets.has(f)) hits.add(fnName(f));
      for (const [k, v] of got.actions) if (actionTargets.has(k)) hits.add(v);
    }
    for (const [k, v] of direct) if (actionTargets.has(k)) hits.add(v);
    forms.push({ file: rel, line: lineOf(sf, t), component: componentOf(t) ?? "(unnamed)", reaches: [...hits], why,
      asks: (opener) => asksFirst(runs, opener, ctx, saves) });
  }
  return { dialogs, forms, actionForms };
}
const readOr = (w: World, rel: string): string | null => { try { return w.read(rel); } catch { return null; } };
const realCensus = new Map<string, { code: string; deps: Map<string, string | null>; found: Found }>();
/** The census over all of `src/`, reusing each file's result while its text, and the text of every module it read for
 *  it (a server action's module, an imported function's), are the ones already read. */
function census(w: World): Census {
  const out: Census = { files: 0, dialogs: [], forms: [], actionForms: [] };
  for (const rel of POPULATION) {
    const code = w.read(rel);
    if (!code.includes("<ConfirmDialog") && !code.includes("<ConfirmModal") && !code.includes("<form")) continue;
    out.files++;
    let hit = realCensus.get(rel);
    if (!hit || hit.code !== code || [...hit.deps].some(([dep, text]) => readOr(w, dep) !== text)) {
      const deps = new Map<string, string | null>();
      hit = { code, deps, found: censusOfFile(rel, code, tracking(envOf(w), deps)) };
      if (w === REAL) realCensus.set(rel, hit);
    }
    out.dialogs.push(...hit.found.dialogs);
    out.forms.push(...hit.found.forms);
    out.actionForms.push(...hit.found.actionForms);
  }
  return out;
}

/** A src/ tree of its own for the fixtures: a "use server" module, a helper module, and a barrel that re-exports. */
const FIXTURE = "src/fixture/fixture.tsx";
const FIXTURE_MODULES: Record<string, string> = {
  "src/fixture/actions.ts": [QUOTE + "use server" + QUOTE + ";",
    "export async function saveAction(fd) { return fd; }",
    "export async function dropAction(fd) { return fd; }",
    "export async function keepAction(fd) { return fd; }"].join(NL),
  "src/fixture/helpers.ts": [
    "export function submitClosestForm(el) { el.closest(" + QUOTE + "form" + QUOTE + ")?.requestSubmit(); }",
    "export async function submitLater(el) { await Promise.resolve(); el.requestSubmit(); }",
    "export const tidy = (s) => s.trim();"].join(NL),
  "src/fixture/barrel.ts": "export { submitClosestForm as relay } from " + QUOTE + "./helpers" + QUOTE + ";",
};
const FIXTURE_ENV: Env = {
  read: (rel) => { const t = FIXTURE_MODULES[rel]; if (t === undefined) throw new Error(`no fixture module ${rel}`); return t; },
  has: (rel) => Object.hasOwn(FIXTURE_MODULES, rel),
};
/** The census run over shapes it must tell apart, so its own discrimination is proven, not assumed. */
function fixtureCensus(): { pass: boolean; detail: string } {
  const src = [
    'import { saveAction, dropAction, keepAction } from "./actions";',
    'import { submitClosestForm, submitLater, tidy } from "@/fixture/helpers";',
    'import { relay } from "@/fixture/barrel";',
    'function Named() { const formRef = useRef(null); const go = () => formRef.current?.requestSubmit(); return <form ref={formRef}><ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" /></form>; }',
    'function Made() { return <ConfirmDialog onConfirm={() => { const f = document.createElement("form"); f.submit(); }} trigger={<button />} title="" body="" />; }',
    'function Wrap({ onConfirm }) { return <ConfirmModal open onClose={() => {}} onConfirm={onConfirm} title="" body="" />; }',
    'function Host() { const ref = useRef(null); return <Wrap onConfirm={() => ref.current?.submit()} />; }',
    'function Quiet() { const go = () => {}; return <ConfirmDialog onConfirm={go} trigger={<button />} title="" body="" />; }',
    'function Unread({ handlers }) { return <ConfirmDialog onConfirm={handlers.go} trigger={<button />} title="" body="" />; }',
    'function Clicker() { const saveRef = useRef(null); return <form><Button ref={saveRef}>Save</Button><ConfirmDialog onConfirm={() => saveRef.current?.click()} trigger={<button />} title="" body="" /></form>; }',
    'function Plain() { const r = useRef(null); return <><button ref={r} type="button" /><ConfirmDialog onConfirm={() => r.current?.click()} trigger={<button />} title="" body="" /></>; }',
    'function Dispatcher() { const f = useRef(null); return <form ref={f}><ConfirmDialog onConfirm={() => f.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))} trigger={<button />} title="" body="" /></form>; }',
    'function Prompt() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => { f.current?.requestSubmit(); }} trigger={<button />} title="" body="" /></form>; }',
    'function Later() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => { Promise.resolve().then(() => f.current?.requestSubmit()); }} trigger={<button />} title="" body="" /></form>; }',
    'function Awaits() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={async () => { await check(); f.current?.requestSubmit(); }} trigger={<button />} title="" body="" /></form>; }',
    'function Handed() { const f = useRef(null); const go = () => f.current?.requestSubmit(); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => setTimeout(go, 0)} trigger={<button />} title="" body="" /></form>; }',
    'function Direct() { const run = () => saveAction(new FormData()); const onSubmit = (e) => { e.preventDefault(); saveAction(new FormData(e.currentTarget)); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={run} title="" body="" /></form>; }',
    'function ActionForm() { return <form action={dropAction}><ConfirmDialog onConfirm={() => dropAction(new FormData())} trigger={<button />} title="" body="" /></form>; }',
    'function Other() { const onSubmit = (e) => { e.preventDefault(); keepAction(new FormData()); }; return <form onSubmit={onSubmit} />; }',
    'function Helped() { const b = useRef(null); return <ConfirmDialog onConfirm={() => submitClosestForm(b.current)} trigger={<button ref={b} />} title="" body="" />; }',
    'function HelpedLate() { const f = useRef(null); return <form ref={f}><ConfirmDialog submitsForm onConfirm={() => submitLater(f.current)} trigger={<button />} title="" body="" /></form>; }',
    'function Relayed() { const b = useRef(null); return <ConfirmDialog onConfirm={() => relay(b.current)} trigger={<button ref={b} />} title="" body="" />; }',
    'function Tidy() { return <ConfirmDialog onConfirm={() => { tidy(" x "); }} trigger={<button />} title="" body="" />; }',
    'function NamedHides() { const [open, setOpen] = useState(false); const runIt = () => {}; const confirmRun = () => { setOpen(false); runIt(); }; const onSubmit = (e) => { e.preventDefault(); runIt(); }; return <form onSubmit={onSubmit}><ConfirmModal open={open} onClose={() => {}} onConfirm={confirmRun} title="" body="" /></form>; }',
    'function Inverse({ changed }) { const [fd, setAsk] = useState(null); const save = (x) => saveAction(x); const onSubmit = (e) => { e.preventDefault(); const f = new FormData(); if (!changed) { save(f); return; } setAsk(f); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={() => save(fd)} title="" body="" /></form>; }',
    'function Leaky({ changed }) { const [fd, setAsk] = useState(null); const store = (x) => dropAction(x); const onSubmit = (e) => { e.preventDefault(); const f = new FormData(); if (changed) { setAsk(f); } store(f); }; return <form onSubmit={onSubmit}><ConfirmModal open onClose={() => {}} onConfirm={() => store(fd)} title="" body="" /></form>; }',
  ].join(NL);
  const r = censusOfFile(FIXTURE, src, FIXTURE_ENV);
  const d = (name: string) => r.dialogs.find((x) => x.component === name);
  const f = (name: string) => r.forms.find((x) => x.component === name);
  const expect: [string, boolean][] = [
    ["a submit through a named local is found", !!d("Named")?.submits && d("Named")?.why === null],
    ["a form the confirm made itself is not one to guard", !!d("Made") && !d("Made")!.submits && d("Made")!.created],
    ["a submit through a wrapper's prop is found", d("Wrap")?.kind === "ConfirmModal" && !!d("Wrap")?.submits && d("Wrap")?.why === null],
    ["a same-named handler in another component is not mistaken for it", !!d("Quiet") && !d("Quiet")!.submits && d("Quiet")!.why === null],
    ["a handler it cannot read is reported, never passed", !!d("Unread")?.why],
    ["a click on a ref'd button of no type (a submit button) submits", !!d("Clicker")?.submits],
    ["a click on a type=button control does not", !!d("Plain") && !d("Plain")!.submits],
    ["a submit event dispatched by hand submits", !!d("Dispatcher")?.submits],
    ["a submit in the confirm's own turn is in time", !!d("Prompt")?.submits && d("Prompt")?.late.length === 0],
    ["a submit in a .then is late", !!d("Later")?.submits && (d("Later")?.late.length ?? 0) > 0],
    ["a submit after an await is late", !!d("Awaits")?.submits && (d("Awaits")?.late.length ?? 0) > 0],
    ["a submitting local handed to a timer is found, and late", !!d("Handed")?.submits && (d("Handed")?.late.length ?? 0) > 0],
    ["a confirm's server action is read through its import", JSON.stringify(d("Direct")?.actions) === JSON.stringify(["saveAction"])],
    ["a form whose submit calls the server action a confirm confirms reaches it", JSON.stringify(f("Direct")?.reaches) === JSON.stringify(["saveAction"])],
    ["a form whose action= is that server action reaches it", JSON.stringify(f("ActionForm")?.reaches) === JSON.stringify(["dropAction"])],
    ["a form whose action= is a server action is written down src-wide, by its key", r.actionForms.some((a) => a.component === "ActionForm" && a.key === "dropAction@src/fixture/actions.ts")],
    ["a form that calls an action no confirm confirms reaches nothing", !!f("Other") && f("Other")!.reaches.length === 0 && f("Other")!.why === null],
    ["a submit made inside an imported helper is read one hop deep and found", !!d("Helped")?.submits && d("Helped")?.why === null],
    ["…with its timing: a helper that submits after its own await is late", !!d("HelpedLate")?.submits && (d("HelpedLate")?.late.length ?? 0) > 0],
    ["an import it cannot read one hop deep (a re-export from a further module) leaves the confirm UNREAD", /relay/.test(d("Relayed")?.why ?? "")],
    ["a readable helper that submits nothing is read and passed", !!d("Tidy") && !d("Tidy")!.submits && d("Tidy")!.why === null],
    ["a NAMED confirm confirms the local functions it calls, one level: a submit calling one of them reaches it", !!f("NamedHides")?.reaches.includes("runIt")],
    ["a guard clause the other way round (the save in an if that returns, the question after it) asks first", (f("Inverse")?.reaches.length ?? 0) > 0 && f("Inverse")?.asks("setAsk(f)") === null],
    ["a question whose if does not return does not ask first", (f("Leaky")?.reaches.length ?? 0) > 0 && f("Leaky")?.asks("setAsk(f)") !== null],
  ];
  const missed = expect.filter(([, okay]) => !okay).map(([name]) => name);
  return { pass: missed.length === 0, detail: missed.length === 0 ? `${expect.length} shapes told apart` : `MISSED: ${missed.join("; ")}` };
}

// ── THE HOSTS (4.5) ───────────────────────────────────────────────────────────────────────────────────────────────────
type HostForm = { start: number; end: number; host: Host };
/** Whether two nodes stand in the two arms of one ternary — never drawn together. */
function otherArms(a: ts.Node, b: ts.Node): boolean {
  for (let p: ts.Node | undefined = a.parent; p; p = p.parent) {
    if (!ts.isConditionalExpression(p)) continue;
    const { whenTrue, whenFalse } = p;
    const inT = (n: ts.Node) => whenTrue.pos <= n.pos && n.end <= whenTrue.end;
    const inF = (n: ts.Node) => whenFalse.pos <= n.pos && n.end <= whenFalse.end;
    if ((inT(a) && inF(b)) || (inF(a) && inT(b))) return true;
  }
  return false;
}
/** Each host form read by name, every use of a wrapper placed, every `submitsForm` dialog accounted for. */
function hostsOf(w: World, c: Census): { problems: string[]; read: string[] } {
  const problems: string[] = [];
  const read: string[] = [];
  const formsIn = new Map<string, HostForm[]>();
  for (const h of HOSTS) {
    let sf: ts.SourceFile;
    try { sf = parse(h.file, w.read(h.file)); } catch { problems.push(`${h.file}: it could not be read`); continue; }
    const forms: ts.JsxElement[] = [];
    walkTree(sf, (n) => {
      if (ts.isJsxElement(n) && n.openingElement.tagName.getText(sf) === "form"
        && attrOf(n.openingElement, "action")?.initializer?.getText(sf) === h.action) forms.push(n);
    });
    if (forms.length !== 1) { problems.push(`${h.file}: ${forms.length} forms with action=${h.action}, not one`); continue; }
    const form = forms[0];
    const at = `${h.file}:${lineOf(sf, form)}`;
    formsIn.set(h.file, [...(formsIn.get(h.file) ?? []), { start: form.getStart(sf), end: form.getEnd(), host: h }]);
    const inside: Tag[] = [];
    walkTree(form, (n) => { if (isTag(n) && n !== form.openingElement) inside.push(n); });
    const guarded = inside.filter((t) => isWrapper(t.tagName.getText(sf)) || (t.tagName.getText(sf) === "ConfirmDialog" && isOn(attrOf(t, "submitsForm"))));
    if (guarded.length !== 1) {
      problems.push(`${at} (${h.what}) holds ${guarded.length} guarded dialogs, not one${guarded.length ? `: ${guarded.map((t) => `${t.tagName.getText(sf)} at line ${lineOf(sf, t)}`).join(", ")}` : ""}`);
      continue;
    }
    const consumer = guarded[0];
    if (consumer.tagName.getText(sf) !== h.consumer) { problems.push(`${at} (${h.what}) holds ${consumer.tagName.getText(sf)}, not ${h.consumer}`); continue; }
    // ⛔ ANYWHERE in the form, ahead of the dialog or after it: WebKit skips the guard's disabled control and presses the
    // first ENABLED submit control wherever it stands. Not counted: what the dialog itself draws (its trigger is forced to
    // type=button, its body is portalled out of the form), and a control in the other arm of a ternary from the dialog,
    // never drawn with it (the withdraw form's disabled SubmitButton, shown only when the form cannot submit at all).
    const own = ts.isJsxOpeningElement(consumer) ? consumer.parent : consumer;
    const others = inside
      .filter((t) => !(own.pos <= t.pos && t.end <= own.end))
      .map((t) => ({ t, how: submitCapable(t, sf) }))
      .filter((x) => x.how !== null && !otherArms(x.t, consumer));
    for (const x of others) {
      problems.push(`${h.file}:${lineOf(sf, x.t)} ${x.how} stands in the form for ${h.what} beside ${h.consumer}: WebKit skips the guard's disabled control and presses it, before the page wakes`);
    }
    if (others.length === 0) read.push(`${at} ${h.consumer}`);
  }
  for (const rel of POPULATION) {
    const code = w.read(rel);
    if (!Object.keys(WRAPPERS).some((n) => code.includes("<" + n))) continue;
    const sf = parse(rel, code);
    walkTree(sf, (n) => {
      if (!isTag(n) || !isWrapper(n.tagName.getText(sf))) return;
      const name = n.tagName.getText(sf);
      const pos = n.getStart(sf);
      if (!(formsIn.get(rel) ?? []).some((f) => f.host.consumer === name && f.start <= pos && pos < f.end)) {
        problems.push(`${rel}:${lineOf(sf, n)} <${name}> is drawn outside every host form listed for it`);
      }
    });
  }
  for (const d of c.dialogs.filter((x) => x.guarded)) {
    const wrapper = Object.entries(WRAPPERS).find(([, file]) => file === d.file);
    const inFile = c.dialogs.filter((x) => x.guarded && x.file === d.file).length;
    const own = (formsIn.get(d.file) ?? []).filter((f) => f.host.consumer === "ConfirmDialog").length;
    const accounted = wrapper ? inFile === 1 && d.component === wrapper[0] : own > 0 && inFile === own;
    if (!accounted) problems.push(`${d.file}:${d.line} a submitsForm dialog that no host row accounts for`);
  }
  return { problems, read };
}

function findFunction(root: ts.Node, name: string): ts.FunctionDeclaration | null {
  let hit = null as ts.FunctionDeclaration | null;
  walkTree(root, (n) => { if (!hit && ts.isFunctionDeclaration(n) && n.name?.text === name) hit = n; });
  return hit;
}
function declIn(root: ts.Node | null, name: string): ts.VariableDeclaration | null {
  let hit = null as ts.VariableDeclaration | null;
  if (root) walkTree(root, (n) => { if (!hit && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) hit = n; });
  return hit;
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
    if (typeof stop === "function") stop();
    const s = submitEvent();
    form.dispatchEvent(s.e);
    return { pass: typeof stop === "function" && !s.e.defaultPrevented && !s.stopped() && asked === 0, detail: JSON.stringify({ stop: typeof stop, prevented: s.e.defaultPrevented, stopped: s.stopped(), asked }) };
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
  const p15b = probe((mk) => {
    const form = new EventTarget();
    let askedA = 0;
    let askedB = 0;
    const ga = mk();
    const gb = mk();
    const stopA = ga.listen(form, () => { askedA++; });
    // development (NODE_ENV not "production", as under `next dev` and here): the second listen throws, loudly
    let threw = "";
    let devStop: unknown = "not handed back";
    try { devStop = gb.listen(form, () => { askedB++; }); } catch (e) { threw = String((e as Error)?.message ?? e); }
    // production: it says so on the console, hands back no stop (so its dialog keeps its control disabled), stays out
    const prod = asProduction(() => gb.listen(form, () => { askedB++; }));
    const s = submitEvent();
    ga.confirm(() => form.dispatchEvent(s.e));
    const t = submitEvent();
    form.dispatchEvent(t.e);
    // and once the first lets go (an unmount, or React's second effect in development) the form may be guarded again
    if (typeof stopA === "function") stopA();
    const again = gb.listen(form, () => { askedB++; });
    const detail = JSON.stringify({ threw: threw.slice(0, 50), devStop: typeof devStop, prodStop: prod.value === null ? null : typeof prod.value,
      prodErrors: prod.errors, prodThrew: prod.threw.slice(0, 40), confirmSent: !s.e.defaultPrevented && !s.stopped(), enterRefused: t.e.defaultPrevented, askedA, askedB, again: typeof again });
    return { pass: typeof stopA === "function" && threw !== "" && devStop === "not handed back" && prod.value === null && prod.errors === 1 && prod.threw === ""
      && !s.e.defaultPrevented && !s.stopped() && t.e.defaultPrevented && askedA === 1 && askedB === 0 && typeof again === "function", detail };
  });
  ok("1.5b · ★ ONE GUARD PER FORM: a second guard on a guarded form is refused — it throws in development; in production it says so on the console, hands back no stop and stays out — so the first dialog's confirm still sends (two would refuse each other's, and nothing would ever send) and Enter is refused once; and the first one's stop frees the form, so a dialog that remounts (React's second effect) guards it again",
    p15b.pass, p15b.detail);

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
  const guardControl = C("input", { type: "submit", hidden: "", disabled: "" });
  const secondField = C("input", { type: "text", hidden: "" });
  const controlAlone = [field, guardControl, trigger];
  const fieldAlone = [field, secondField, trigger];
  const trailing = [field, guardControl, secondField, trigger, C("button", {})];
  ok("2.0 · control · the model sees the defect and why each half of the fix exists: the form as it was submits on Enter in every engine (the old WebKit too); a disabled default control alone stops Chromium and Firefox but neither WebKit; a second text field alone stops all four, and stays stopped once the page wakes, so Enter would never reach the guard to open the dialog; and why NOTHING ELSE in the form may submit: one more submit button AFTER the guard's control leaves Chromium and Firefox stopped, but both WebKits press it before the page wakes",
    inEvery(ALL, asItWas) && !enterSubmits("chromium", controlAlone) && !enterSubmits("firefox", controlAlone)
      && enterSubmits("webkit", controlAlone) && enterSubmits("webkit-legacy", controlAlone)
      && inNone(ALL, fieldAlone) && inNone(ALL, awake(fieldAlone))
      && !enterSubmits("chromium", trailing) && !enterSubmits("firefox", trailing) && enterSubmits("webkit", trailing) && enterSubmits("webkit-legacy", trailing),
    JSON.stringify({ asItWas: byEngine(asItWas), controlAlone: byEngine(controlAlone), fieldAlone: byEngine(fieldAlone), trailing: byEngine(trailing) }));
  const one = markup ? controlsIn(markup.one) : [];
  const eight = markup ? controlsIn(markup.eight) : [];
  const plain = markup ? controlsIn(markup.plain) : [];
  ok("2.1 · ★ before the guard listens (the server's markup: the page still loading, or hydrating) Enter submits nothing — in Chromium, Firefox, WebKit from Safari 16.4 and WebKit before it — in a form of one text field and in one of eight",
    markup !== null && one.length > 0 && inNone(ALL, one) && inNone(ALL, eight),
    markup ? JSON.stringify({ one: byEngine(one), eight: byEngine(eight) }) : `the dialog did not draw: ${renderError}`);
  ok("2.2 · ★ once it listens (its default control enabled) Enter submits in Chromium, Firefox and WebKit from Safari 16.4 — the submit the guard turns into the dialog — in a form of one text field and in one of eight (the deposit form, where Enter used to do nothing)",
    markup !== null && inEvery(MODERN, awake(one)) && inEvery(MODERN, awake(eight)), JSON.stringify({ one: byEngine(awake(one)), eight: byEngine(awake(eight)) }));
  const added = one.filter((c) => c.attrs.has("hidden"));
  const dflt = added.filter(isSubmitControl);
  const second = added.filter(isTextField);
  const unseen = (c: Control) => c.attrs.has("hidden") && c.attrs.get("tabindex") === "-1" && c.attrs.get("aria-hidden") === "true";
  ok("2.3 · what it adds is unseen, out of reach and posts nothing: ONE default control — a submit INPUT (hidden, out of the tab order, unnamed, disabled in the server's markup, formnovalidate so bad input meets the kit's toast and never the browser's bubble, autocomplete=off so Firefox never restores it enabled before the page wakes) — and ONE second text field (hidden, out of the tab order, unnamed, autocomplete=off)",
    added.length === 2 && dflt.length === 1 && second.length === 1
      && dflt[0].tag === "input" && typeOf(dflt[0]) === "submit"
      && unseen(dflt[0]) && off(dflt[0]) && dflt[0].attrs.has("formnovalidate") && dflt[0].attrs.get("autocomplete") === "off" && !dflt[0].attrs.has("name")
      && unseen(second[0]) && !second[0].attrs.has("name") && second[0].attrs.get("autocomplete") === "off",
    JSON.stringify(added.map((c) => [c.tag, Object.fromEntries(c.attrs)])));
  ok("2.4 · without submitsForm the dialog draws its trigger and nothing else, so no other consumer's markup moves",
    markup !== null && plain.length === 2 && plain[0].tag === "input" && plain[1].tag === "button" && typeOf(plain[1]) === "button" && !markup.plain.includes("hidden"),
    markup ? markup.plain : renderError);
  const drawnRendered = [field, C("input", { type: "submit" }), C("input", { type: "text", hidden: "" }), trigger];
  ok("2.5 · WebKit BEFORE Safari 16.4 presses a submit control only if it is rendered, and the guard's is hidden: there Enter in these forms submits nothing before the page wakes AND after (one field, eight fields) — inert, never unsafe: no post, no dialog, and the trigger still opens it (and Next 16 builds for Safari 16.4 on, so such a device may never wake the page at all). The model's renderer rule is shown to bite: the same control drawn rendered is pressed there",
    markup !== null && !enterSubmits("webkit-legacy", one) && !enterSubmits("webkit-legacy", awake(one)) && !enterSubmits("webkit-legacy", awake(eight))
      && enterSubmits("webkit-legacy", drawnRendered),
    JSON.stringify({ asleep: enterSubmits("webkit-legacy", one), awakeOne: enterSubmits("webkit-legacy", awake(one)), awakeEight: enterSubmits("webkit-legacy", awake(eight)), drawnRendered: enterSubmits("webkit-legacy", drawnRendered) }));

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
  let refuse = null as ts.BinaryExpression | null;
  if (comp) walkTree(comp, (n) => {
    if (!refuse && ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && n.left.getText(cdTree) === "refuseRef.current") refuse = n;
  });
  const rhs = refuse ? refuse.right : null;
  const decides = !!rhs && ts.isConditionalExpression(rhs)
    && /triggerDisabled/.test(rhs.condition.getText(cdTree)) && /(^|[^A-Za-z])open([^A-Za-z]|$)/.test(rhs.condition.getText(cdTree))
    && ts.isArrowFunction(rhs.whenTrue) && ts.isBlock(rhs.whenTrue.body) && rhs.whenTrue.body.statements.length === 0
    && ts.isIdentifier(rhs.whenFalse) && rhs.whenFalse.text === "requestOpen";
  ok("3.2 · ★ ONE WAY IN: the trigger's click and a refused submit open the dialog by one function (its openGuard, then its onOpen, then the dialog), a refused submit only where the trigger could (not disabled, not already open), and the trigger wears that same disabled value",
    order.every((i) => i >= 0) && order[0] < order[1] && order[1] < order[2]
      && /requestOpen[(][)]/.test(onClickText) && !/setOpen|onOpen|openGuard/.test(onClickText)
      && disabledText === "triggerDisabled" && decides,
    JSON.stringify({ order, onClick: onClickText.slice(0, 120), disabled: disabledText, refuse: rhs ? rhs.getText(cdTree).slice(0, 100) : null }));
  let control = null as ts.JsxSelfClosingElement | null;
  if (comp) walkTree(comp, (n) => {
    if (!control && ts.isJsxSelfClosingElement(n) && n.tagName.getText(cdTree) === "input"
      && attrOf(n, "type")?.initializer?.getText(cdTree) === QUOTE + "submit" + QUOTE) control = n;
  });
  const disabledAttr = control ? attrExpr(attrOf(control, "disabled"))?.getText(cdTree) ?? "" : "";
  const refAttr = control ? attrExpr(attrOf(control, "ref"))?.getText(cdTree) ?? "" : "";
  const effects = callsIn(comp, (c) => /^(React[.])?useEffect$/.test(c.expression.getText(cdTree)));
  const guardEffect = effects.find((c) => c.arguments.length > 0 && /[.]listen[(]/.test(c.arguments[0].getText(cdTree))) ?? null;
  const effectFn = guardEffect && ts.isArrowFunction(guardEffect.arguments[0]) ? guardEffect.arguments[0] : null;
  const effectText = effectFn ? effectFn.getText(cdTree) : "";
  const listenAt = effectText.search(/[.]listen[(]/);
  const onAt = effectText.indexOf("setListening(true)");
  const heldBack = listenAt >= 0 && onAt > listenAt && /if [(]!stop[)] return/.test(effectText.slice(listenAt, onAt));
  const effectBody = effectFn && ts.isBlock(effectFn.body) ? effectFn.body : null;
  const cleanup = effectBody
    ? effectBody.statements.filter((s) => ts.isReturnStatement(s)).map((s) => (s as ts.ReturnStatement).expression?.getText(cdTree) ?? "").find((t) => t.includes("setListening(false)")) ?? ""
    : "";
  ok("3.3 · ★ the default control (a submit input) is enabled only once the guard listens: its disabled reads the listening state, set true after listen() — and only where listen() did not refuse, so a form another dialog guards keeps this one's control disabled — and false when it stops, the stop called in the effect's cleanup: no Enter reaches a form that nothing guards",
    control !== null && disabledAttr === "!listening" && listenAt >= 0 && onAt > listenAt && heldBack && /stop[(][)]/.test(cleanup),
    JSON.stringify({ control: control !== null, disabled: disabledAttr, listenAt, onAt, heldBack, cleanup: cleanup.slice(0, 80) }));
  const listenCall = callsIn(effectFn, (c) => ts.isPropertyAccessExpression(c.expression) && c.expression.name.text === "listen")[0] ?? null;
  const formArg = listenCall ? listenCall.arguments[0] : undefined;
  const formDecl = formArg && ts.isIdentifier(formArg) ? declIn(effectFn, formArg.text) : null;
  const refusedArg = listenCall && listenCall.arguments[1] ? listenCall.arguments[1].getText(cdTree) : "";
  ok("3.4 · the guard listens on the default control's own form (the form whose implicit submission that control decides, which is the form its trigger sits in) and hands a refusal to refuseRef",
    formDecl?.initializer?.getText(cdTree) === "defaultRef.current?.form" && refAttr === "defaultRef" && /refuseRef[.]current[(][)]/.test(refusedArg),
    JSON.stringify({ form: formDecl?.initializer?.getText(cdTree) ?? null, ref: refAttr, refused: refusedArg }));

  log("§4 · the census — every ConfirmDialog and ConfirmModal in src/, by scope");
  let c: Census = { files: 0, dialogs: [], forms: [], actionForms: [] };
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
  const importedSeen = [...new Set(c.dialogs.flatMap((d) => d.imported))].sort();
  const unreadSeen = new Set(c.dialogs.flatMap((d) => d.unreadImports));
  const staleRead = Object.keys(IMPORTED_READ).filter((k) => !unreadSeen.has(k));
  ok("4.0 · the census reads: at least 30 ConfirmDialogs and 20 ConfirmModals in 20 files, every onConfirm, onSubmit and form action resolved by scope to what it runs, and every function a confirm imports from src/ read one hop deep in its own module (or named in IMPORTED_READ with its reason); and its fixtures tell apart a submit through a named local, a wrapper's prop, a click on a ref'd submit button, a submit event dispatched by hand, a submit inside an imported helper (and when it happens there); a form the confirm made itself; a same-named handler in another component; a submit in the confirm's own turn from one in a .then, after an await or in a local handed to a timer; a form submit reaching the server action a confirm confirms, by onSubmit and by action=, or the local function a NAMED confirm calls; both shapes of a guard clause that asks first, and one that does not; and a handler it cannot read — or an import it cannot read one hop deep — is reported, never passed",
    censusError === "" && cds.length >= 30 && cms.length >= 20 && c.files >= 20 && unread.length === 0 && fx.pass,
    `${censusError ? `the census threw: ${censusError} · ` : ""}${cds.length} ConfirmDialog · ${cms.length} ConfirmModal · ${c.files} files · unread: ${unread.join(" | ") || "none"} · fixtures: ${fx.detail}`);
  log(`     population: ${cds.length} ConfirmDialog, ${cms.length} ConfirmModal, ${c.forms.length} forms beside a confirm, in ${c.files} files`);
  log(`     imported src/ functions confirms call: ${importedSeen.length}, read one hop deep: ${importedSeen.filter((k) => !unreadSeen.has(k)).map((k) => k.split("@")[0]).join(", ") || "none"}`
    + `${unreadSeen.size ? ` · named in IMPORTED_READ: ${[...unreadSeen].join(", ")}` : ""}`);
  if (staleRead.length) log(`     NOTE · IMPORTED_READ names what no confirm needs any more — delete it (a note, never a failure): ${staleRead.join(", ")}`);
  const submitting = cds.filter((d) => d.submits);
  const unguarded = submitting.filter((d) => !d.guarded);
  const missing = SUBMITTERS.filter((f) => !submitting.some((d) => d.file === f));
  ok("4.1 · ★ every ConfirmDialog whose confirm submits a form (requestSubmit, submit, a dispatched submit event, or a click on the form's own submit control) carries submitsForm, so Enter in that form opens the dialog and never submits it; and the five that do today are among them by name: withdraw, deposit, close-account, the RG break and self-exclusion confirm, the hub's sign-out",
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
  const reaching = c.forms.filter((f) => f.reaches.length > 0);
  const verdict = (f: FormRow): string | null => { const x = ledger(f); return x === null ? "UNNAMED" : f.asks(x.opener); };
  const broken = reaching.filter((f) => verdict(f) !== null);
  // ⛔ ACROSS ALL OF src/ (the cross-file shape three of the hosts use: a page's `<form action={X}>`, a client dialog
  // drawn inside it): a form whose action IS a server action some confirm calls itself runs that commit on Enter, with no
  // confirm, from whatever file it is drawn in — unless it is a host row (its dialog submits the form and guards it) or
  // ledgered.
  const confirmedBy = new Map<string, string>();
  for (const d of c.dialogs) for (const k of d.actionKeys) if (!confirmedBy.has(k)) confirmedBy.set(k, `${d.file}:${d.line}`);
  const crossFile = c.actionForms.filter((f) => confirmedBy.has(f.key)
    && !HOSTS.some((h) => h.file === f.file && h.action === f.attr)
    && !DIRECT_BY_DESIGN.some((x) => x.file === f.file && x.component === f.component));
  ok("4.3 · ★ every form whose submit OPENS a confirm keeps it so: no form's submit (onSubmit, or action=), nor a function of its file the submit calls or hands on, reaches what a confirm of its file confirms — the confirm's own function, named or inline, the local functions it calls, and the server actions those call; and across all of src/, no form's action= is a server action some confirm calls itself, unless it is a host or ledgered; the two forms that ask only about some changes are named, and each ASKS BEFORE IT SAVES, read from its syntax tree — the question in an if that returns, every save after it, or every save in an if that returns, the question after it",
    c.forms.length >= 10 && c.actionForms.length >= 10 && broken.length === 0 && crossFile.length === 0,
    `${c.forms.length} forms read beside a confirm, ${c.actionForms.length} form actions read src-wide · reaching: ${reaching.map((f) => `${f.file}:${f.line} ${f.component} reaches ${f.reaches.join("/")}${verdict(f) === null ? "" : ` — ${verdict(f)}`}`).join(", ") || "none"}`
      + `${crossFile.length ? ` · a form whose action is a confirm's commit: ${crossFile.map((f) => `${f.file}:${f.line} action=${f.attr}, which ${confirmedBy.get(f.key)} confirms`).join(", ")}` : ""}`);
  log(`     src-wide: ${c.actionForms.length} forms whose action= is a server action, in ${new Set(c.actionForms.map((f) => f.file)).size} files; ${confirmedBy.size} server actions some confirm calls itself`);
  const stale = DIRECT_BY_DESIGN.filter((x) => !reaching.some((f) => f.file === x.file && f.component === x.component));
  ok("4.4 · the two named forms still save directly for the changes they do not ask about — an exemption that no longer matches is deleted, not inherited",
    stale.length === 0, stale.map((x) => `${x.file} ${x.component}`).join(", "));
  let hosts = { problems: [] as string[], read: [] as string[] };
  try { hosts = hostsOf(w, c); } catch (e) { hosts = { problems: [`the host check threw: ${String((e as Error)?.message ?? e)}`], read: [] }; }
  ok("4.5 · ★ THE HOSTS, by name — the withdraw and deposit forms, the RG break and self-exclusion forms, the close-account form, the hub's sign-out: each holds exactly one guarded dialog, the one named for it, and NOTHING ELSE in the form that can submit, ahead of it or after it (no button or kit Button without type=button, no SubmitButton, no submit or image input — save one in the other arm of a ternary from the dialog, never drawn with it): WebKit skips the guard's disabled control and presses the first enabled one wherever it stands; every use of WithdrawConfirm, DepositConfirm and RgConfirmSubmit sits in one of these forms; and every submitsForm dialog in src/ is one this table accounts for",
    hosts.problems.length === 0 && hosts.read.length === HOSTS.length,
    hosts.problems.join(" | ") || `read ${hosts.read.length} of ${HOSTS.length}`);
  log(`     host forms read: ${hosts.read.join(", ") || "none"}`);
  const guardedSubmitting = cds.filter((d) => d.guarded && d.submits);
  const lateOnes = guardedSubmitting.filter((d) => d.late.length > 0);
  ok("4.6 · ★ every submitsForm dialog submits its form in the confirm's own turn — never after an await, nor inside a .then, a timer or a transition, nor in a function handed on: the guard lets through only a submit fired inside confirm(), so a later one is refused as Enter's (the dialog reopens), and a held-open dialog would spin over a round-trip that never started",
    guardedSubmitting.length >= SUBMITTERS.length && lateOnes.length === 0,
    lateOnes.map((d) => `${d.file}:${d.line} — ${d.late.join("; ")}`).join(" | ") || `${guardedSubmitting.length} guarded dialogs read`);

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
  /** The real tree with some files' text replaced: each `from` must occur exactly once in its file, so a plant can never
   *  land twice; edits to one file apply in order. */
  const plantFiles = (...edits: [string, string, string][]): World => {
    const texts = new Map<string, string>();
    for (const [file, from, to] of edits) {
      const now = texts.get(file) ?? readRaw(file);
      const n = now.split(from).length - 1;
      if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 70))}`);
      texts.set(file, now.split(from).join(to));
    }
    return { read: (rel) => texts.get(rel) ?? readRaw(rel) };
  };
  const plantIn = (file: string, ...edits: [string, string][]): World => plantFiles(...edits.map(([from, to]) => [file, from, to] as [string, string, string]));
  const one = (file: string, from: string, to: string): World => plantIn(file, [from, to]);
  /** The same, for a text that may stand in more than one place (a script named in more than one chain). */
  const everywhere = (file: string, from: string, to: string): World => {
    const raw = readRaw(file);
    if (!raw.includes(from)) throw new Error(`plant anchor ${JSON.stringify(from)} is not in ${file}`);
    const planted = raw.split(from).join(to);
    return { read: (rel) => (rel === file ? planted : readRaw(rel)) };
  };
  const L = (...lines: string[]) => lines.join(NL);
  const Q = (s: string) => QUOTE + s + QUOTE;
  const CONTROL_LINE = "          <input type=" + Q("submit") + " ref={defaultRef} hidden disabled={!listening} formNoValidate tabIndex={-1} aria-hidden autoComplete=" + Q("off") + " />";
  const FIELD_LINE = "          <input type=" + Q("text") + " hidden tabIndex={-1} aria-hidden autoComplete=" + Q("off") + " />";
  const LISTEN = "    const stop = guard.listen(form, () => refuseRef.current());";
  /** A plant names the check that must fall; `held: true` marks a GREEN control instead — a sound variant of the real
   *  tree under which nothing may fail, so a check that is merely strict cannot pass for one that is right. */
  type Plant = { name: string; expect: RegExp; world: () => World; held?: true };
  const IMPORT_WITHDRAW = "import { withdrawAction } from " + Q("@/app/wallet/withdraw/actions") + ";";
  const plants: Plant[] = [
    { name: "a refused submit is not cancelled — the browser posts the form (the defect)", expect: /^1[.]1 /,
      world: () => one(CD, L("        e.preventDefault();", "        e.stopPropagation();"), "        e.stopPropagation();") },
    { name: "a refused submit is cancelled but not stopped — React's root still hears it and marks the form pending", expect: /^1[.]1 /,
      world: () => one(CD, L("        e.stopPropagation();", "        refused();"), "        refused();") },
    { name: "a refused submit is swallowed and the dialog never opens — Enter does nothing at all", expect: /^1[.]1 /,
      world: () => one(CD, L("        refused();", "      };"), "      };") },
    { name: "every submit refused, the confirm's own too — the withdrawal can never be sent", expect: /^1[.]2 /,
      world: () => one(CD, "        if (confirming) return;" + NL, "") },
    { name: "the confirm's window never closes — after one confirm, Enter submits the form again", expect: /^1[.]3 /,
      world: () => one(CD, L("      } finally {", "        confirming = false;", "      }"), L("      } finally {", "      }")) },
    { name: "the guard's stop stops nothing — a dialog that has gone still refuses its form", expect: /^1[.]4 /,
      world: () => one(CD, "        form.removeEventListener(" + Q("submit") + ", onSubmit);" + NL, "") },
    { name: "one flag for every dialog — one dialog's confirm lets another form submit", expect: /^1[.]5 /,
      world: () => one(CD, L("export function formGuard(): FormGuard {", "  let confirming = false;"), L("let confirming = false;", "export function formGuard(): FormGuard {")) },
    { name: "two dialogs may guard one form — each refuses the other's confirm, and the withdrawal never leaves", expect: /^1[.]5b /,
      world: () => one(CD, "      if (guardedForms.has(form)) {", "      if (false) {") },
    { name: "the stop leaves the form marked as guarded — a remount (React's second effect in development) is refused", expect: /^1[.]5b /,
      world: () => one(CD, "        guardedForms.delete(form);" + NL, "") },
    { name: "the default control drawn enabled by the server — before the page wakes, Enter posts the form", expect: /^2[.]1 /,
      world: () => one(CD, "disabled={!listening}", "disabled={false}") },
    { name: "the default control dropped — once the page wakes Enter submits nothing, so it never opens the dialog", expect: /^2[.]2 /,
      world: () => one(CD, CONTROL_LINE + NL, "") },
    { name: "the second text field dropped — WebKit (every iPhone) submits the form before the page wakes", expect: /^2[.]1 /,
      world: () => one(CD, FIELD_LINE + NL, "") },
    { name: "the default control without formNoValidate — Enter meets the browser's bubble, not the kit's toast", expect: /^2[.]3 /,
      world: () => one(CD, "disabled={!listening} formNoValidate tabIndex", "disabled={!listening} tabIndex") },
    { name: "the default control left in the tab order", expect: /^2[.]3 /,
      world: () => one(CD, "formNoValidate tabIndex={-1} aria-hidden", "formNoValidate aria-hidden") },
    { name: "the default control read out by a screen reader", expect: /^2[.]3 /,
      world: () => one(CD, "formNoValidate tabIndex={-1} aria-hidden autoComplete", "formNoValidate tabIndex={-1} autoComplete") },
    { name: "the second text field left in the tab order", expect: /^2[.]3 /,
      world: () => one(CD, "<input type=" + Q("text") + " hidden tabIndex={-1}", "<input type=" + Q("text") + " hidden") },
    { name: "the default control without autocomplete=off — Firefox restores it enabled before the page wakes, and Enter posts", expect: /^2[.]3 /,
      world: () => one(CD, "aria-hidden autoComplete=" + Q("off") + " />" + NL + "          <input type=" + Q("text"), "aria-hidden />" + NL + "          <input type=" + Q("text")) },
    { name: "the second text field given a name — it posts with the form", expect: /^2[.]3 /,
      world: () => one(CD, "<input type=" + Q("text") + " hidden", "<input type=" + Q("text") + " name=" + Q("decoy") + " hidden") },
    { name: "the second text field read out by a screen reader", expect: /^2[.]3 /,
      world: () => one(CD, "<input type=" + Q("text") + " hidden tabIndex={-1} aria-hidden", "<input type=" + Q("text") + " hidden tabIndex={-1}") },
    { name: "the additions drawn for every dialog — every other consumer's markup moves", expect: /^2[.]4 /,
      world: () => one(CD, "{submitsForm && (", "{(") },
    { name: "the default control drawn rendered — WebKit before 16.4 now presses it, and the record of that engine no longer holds", expect: /^2[.]5 /,
      world: () => one(CD, "ref={defaultRef} hidden disabled", "ref={defaultRef} disabled") },
    { name: "the held-open confirm calls onConfirm bare — its own submit is refused as Enter's and the withdrawal never leaves", expect: /^3[.]1 /,
      world: () => one(CD, "const started = guard.confirm(onConfirm);", "const started = onConfirm();") },
    { name: "the classic confirm calls onConfirm bare — close-account's own submit is refused as Enter's", expect: /^3[.]1 /,
      world: () => one(CD, L("            setOpen(false);", "            guard.confirm(onConfirm);"), L("            setOpen(false);", "            onConfirm();")) },
    { name: "the trigger's click opens without its pre-flight — an invalid form earns a dialog", expect: /^3[.]2 /,
      world: () => one(CD, L("      requestOpen();", "    },"), L("      setOpen(true);", "    },")) },
    { name: "a refused submit opens the dialog where the trigger is disabled — Enter gets past the close-account phrase", expect: /^3[.]2 /,
      world: () => one(CD, "refuseRef.current = triggerDisabled || open ? () => {} : requestOpen;", "refuseRef.current = requestOpen;") },
    { name: "the snapshot taken before the pre-flight — a refused amount still runs onOpen (the payee lookup)", expect: /^3[.]2 /,
      world: () => one(CD, L("    if (openGuard && !openGuard()) return;", "    onOpen?.();"), L("    onOpen?.();", "    if (openGuard && !openGuard()) return;")) },
    { name: "the default control enabled before the guard listens — a moment where Enter reaches a form nothing guards", expect: /^3[.]3 /,
      world: () => one(CD, LISTEN, L("    setListening(true);", LISTEN)) },
    { name: "a refused listen still enables the default control — the second dialog's control is what Enter presses", expect: /^3[.]3 /,
      world: () => one(CD, "    if (!stop) return undefined;" + NL, "") },
    { name: "the cleanup forgets the stop — the guard outlives its dialog", expect: /^3[.]3 /,
      world: () => one(CD, L("      stop();", "      setListening(false);"), "      setListening(false);") },
    { name: "the guard listens on the document — it would refuse every form's submit on the page", expect: /^3[.]4 /,
      world: () => one(CD, "const form = defaultRef.current?.form;", "const form = document;") },
    { name: "the withdraw confirm loses submitsForm — Enter in the amount box sends the money again", expect: /^4[.]1 /,
      world: () => one(WITHDRAW, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the deposit confirm loses submitsForm", expect: /^4[.]1 /,
      world: () => one(DEPOSIT, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the close-account confirm loses submitsForm — Enter in the phrase box closes the account again", expect: /^4[.]1 /,
      world: () => one(CLOSE, L("        submitsForm", "        trigger={"), "        trigger={") },
    { name: "the RG confirm loses submitsForm", expect: /^4[.]1 /,
      world: () => one(RG, L("      submitsForm", "      trigger={"), "      trigger={") },
    { name: "the hub's sign-out loses submitsForm", expect: /^4[.]1 /,
      world: () => one(SIGN_OUT, L("        submitsForm", "        trigger={"), "        trigger={") },
    { name: "a new dialog wired to submit its form with no submitsForm (credit-controls)", expect: /^4[.]1 /,
      world: () => one(CREDIT, "        onConfirm={onReset}", "        onConfirm={() => formRef.current?.requestSubmit()}") },
    { name: "a confirm that clicks the form's own Save with no submitsForm (credit-controls) — Enter presses that very Save", expect: /^4[.]1 /,
      world: () => one(CREDIT, "        onConfirm={onReset}", "        onConfirm={() => saveRef.current?.click()}") },
    { name: "the withdraw confirm submits in a way the census cannot read — still required, by name", expect: /^4[.]1 /,
      world: () => one(WITHDRAW, "    form.requestSubmit();", "    HTMLFormElement.prototype.requestSubmit.call(form);") },
    { name: "an onConfirm the census cannot read (a member of an object) — reported, never passed", expect: /^4[.]0 /,
      world: () => one(SET_EMAIL, "        onConfirm={submit}", "        onConfirm={handlers.submit}") },
    { name: "the withdraw confirm submits through a helper the census cannot read one hop deep (its module is not in src/) — reported, never passed", expect: /^4[.]0 /,
      world: () => plantIn(WITHDRAW,
        ["import { lookupWithdrawPayeeAction } from " + Q("./actions") + ";", L("import { lookupWithdrawPayeeAction } from " + Q("./actions") + ";", "import { submitClosestForm } from " + Q("@/lib/client/submit-closest-form") + ";")],
        ["    form.requestSubmit();", "    submitClosestForm(form);"]) },
    { name: "focusFirstInvalid made to submit the form it is handed — every confirm that calls it now submits, read one hop deep", expect: /^4[.]1 /,
      world: () => one("src/lib/client/focus-first-invalid.ts", "  if (!form) return { ok: false, reason: " + Q("no-form") + " };",
        L("  if (!form) return { ok: false, reason: " + Q("no-form") + " };", "  (form as HTMLFormElement).requestSubmit();")) },
    { name: "a ConfirmModal wired to submit a page form (the desk rules' clear)", expect: /^4[.]2 /,
      world: () => one(RULES, "        onConfirm={() => { setClearing(false); emptyEveryLimit(); }}", "        onConfirm={() => { setClearing(false); formRef.current?.requestSubmit(); }}") },
    { name: "the staff role form's submit commits directly — Enter changes a role with no confirm", expect: /^4[.]3 /,
      world: () => one(STAFF, L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    setConfirming(true);"), L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    run();")) },
    { name: "the staff role form's submit calls the server action itself — Enter changes a role with no confirm", expect: /^4[.]3 /,
      world: () => one(STAFF, L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    setConfirming(true);"),
        L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    start(async () => { await runAdminAction(() => setStaffRoleAction(new FormData())); });")) },
    { name: "the staff role confirm made a NAMED handler that calls run(), and the form's submit calls run() itself — Enter changes a role with no confirm", expect: /^4[.]3 /,
      world: () => plantIn(STAFF,
        ["  const assignFormRef = useRef<HTMLFormElement>(null);", L("  const assignFormRef = useRef<HTMLFormElement>(null);", "  const confirmRun = () => { setConfirming(false); run(); };")],
        [L("        onConfirm={() => { setConfirming(false); run(); }}", "        title={isRevoke ?"), L("        onConfirm={confirmRun}", "        title={isRevoke ?")],
        [L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    setConfirming(true);"), L("focusFirstInvalid(assignFormRef.current, fields); return; }", "    run();")]) },
    { name: "the close-account confirm runs the action itself — the form's own submit (Enter) runs what the confirm confirms", expect: /^4[.]3 /,
      world: () => one(CLOSE, "        onConfirm={() => formRef.current?.requestSubmit()}", "        onConfirm={() => closeAccountAction(new FormData(formRef.current!))}") },
    { name: "a confirm in one file calls withdrawAction itself, and another page draws <form action={withdrawAction}> with an amount box — Enter there withdraws with no confirm", expect: /^4[.]3 /,
      world: () => plantFiles(
        [CREDIT, "import { setCreditLimitAction, startTopUpWindowAction } from " + Q("./actions") + ";", L("import { setCreditLimitAction, startTopUpWindowAction } from " + Q("./actions") + ";", IMPORT_WITHDRAW)],
        [CREDIT, "        onConfirm={onReset}", "        onConfirm={() => withdrawAction(new FormData())}"],
        [ACCOUNT_PAGE, "import { CloseAccountForm } from " + Q("./close-account-form") + ";", L("import { CloseAccountForm } from " + Q("./close-account-form") + ";", IMPORT_WITHDRAW)],
        [ACCOUNT_PAGE, "<FormColumn measure=" + Q("field") + "><CloseAccountForm /></FormColumn>",
          "<FormColumn measure=" + Q("field") + "><CloseAccountForm /><form action={withdrawAction}><input name=" + Q("amount") + " /></form></FormColumn>"]) },
    { name: "the fee-model confirm dropped — a money-model change saves on Enter", expect: /^4[.]3 /,
      world: () => one(CONFIG, L("    if (changed) {", "      setConfirmFd(fd);", "      return;", "    }", ""), "") },
    { name: "the fee-model question asked but the save not held back (its return dropped) — it asks AND saves", expect: /^4[.]3 /,
      world: () => one(CONFIG, L("      setConfirmFd(fd);", "      return;"), "      setConfirmFd(fd);") },
    { name: "the simulated-feed question asked but the save not held back — the simulated feed saves unasked", expect: /^4[.]3 /,
      world: () => one(UPDOWN, "if (simulated) { setConfirmOpen(true); return; }", "if (simulated) { setConfirmOpen(true); }") },
    { name: "the fee-model form made to ask about every change — its exemption goes stale", expect: /^4[.]4 /,
      world: () => one(CONFIG, L("    if (changed) {", "      setConfirmFd(fd);", "      return;", "    }", "    runSave(fd);"), "    setConfirmFd(fd);") },
    { name: "GREEN · the fee-model guard clause turned the other way round (the save in an if that returns, the question after it) — it still asks first, and nothing may fail", expect: /^$/, held: true,
      world: () => one(CONFIG, L("    if (changed) {", "      setConfirmFd(fd);", "      return;", "    }", "    runSave(fd);"),
        L("    if (!changed) {", "      runSave(fd);", "      return;", "    }", "    setConfirmFd(fd);")) },
    { name: "a button drawn ahead of WithdrawConfirm in the withdraw form — before the page wakes, Enter presses it and posts", expect: /^4[.]5 /,
      world: () => one(WITHDRAW_PAGE, "        {canSubmit ? <WithdrawConfirm", "        <button>Max</button>{canSubmit ? <WithdrawConfirm") },
    { name: "a kit Button of no type drawn AFTER WithdrawConfirm in the withdraw form — WebKit skips the guard's disabled control and presses it before the page wakes", expect: /^4[.]5 /,
      world: () => one(WITHDRAW_PAGE, L("disabled={!canSubmit} />}", "      </form>"), L("disabled={!canSubmit} />}", "        <Button variant=" + Q("ghost") + ">Back</Button>", "      </form>")) },
    { name: "a second guarded dialog in the RG break form — the two would refuse each other's confirm", expect: /^4[.]5 /,
      world: () => one(RG_PAGE, "          <RgConfirmSubmit label={t.common.startABreak}",
        L("          <RgConfirmSubmit label={t.common.selfExclude} body={t.rg.selfExcludeDescription} />", "          <RgConfirmSubmit label={t.common.startABreak}")) },
    { name: "DepositConfirm drawn outside every host form — its confirm submits no form at all", expect: /^4[.]5 /,
      world: () => one(ACCOUNT_PAGE, "<FormColumn measure=" + Q("field") + "><CloseAccountForm /></FormColumn>", "<FormColumn measure=" + Q("field") + "><CloseAccountForm /><DepositConfirm /></FormColumn>") },
    { name: "a new submitsForm dialog that no host row accounts for (credit-controls)", expect: /^4[.]5 /,
      world: () => one(CREDIT, "        onConfirm={onReset}", L("        onConfirm={() => formRef.current?.requestSubmit()}", "        submitsForm")) },
    { name: "the RG confirm submits after an await — the guard refuses it as Enter's, and the held-open dialog spins", expect: /^4[.]6 /,
      world: () => one(RG, "  const submitForm = () => buttonRef.current?.closest(" + Q("form") + ")?.requestSubmit();",
        "  const submitForm = async () => { await Promise.resolve(); buttonRef.current?.closest(" + Q("form") + ")?.requestSubmit(); };") },
    { name: "the withdraw confirm submits from a timer — refused as Enter's, and the withdrawal never leaves", expect: /^4[.]6 /,
      world: () => one(WITHDRAW, "    form.requestSubmit();", "    setTimeout(() => form.requestSubmit(), 0);") },
    { name: "this suite dropped from predeploy", expect: /^5[.]1 /,
      world: () => everywhere(PKG, "npm run test:implicit-submit", "npm run test:enter-where-pressed") },
    { name: "its red twin undeclared", expect: /^5[.]1 /,
      world: () => one(PKG, Q("red:implicit-submit"), Q("red:implicit-submit-gone")) },
    { name: "its drive undeclared", expect: /^5[.]2 /,
      world: () => one(PKG, Q("qa:implicit-submit"), Q("qa:implicit-submit-gone")) },
  ];
  let caught = 0;
  let held = 0;
  let fail = 0;
  const reds = plants.filter((p) => !p.held).length;
  const greens = plants.length - reds;
  const say = (label: string, cond: boolean, extra = "", word = "PROVED  ") => {
    if (!cond) fail++;
    console.log(`${cond ? word : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`);
  };
  const quiet = () => {};
  const clean = await run(REAL, quiet);
  say("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    let world: World;
    try { world = p.world(); } catch (e) { say(p.name, false, `the plant could not be made: ${String((e as Error)?.message ?? e)}`); continue; }
    // ⛔ A plant in the dialog must still BUILD: one that broke it would fail every §1 and §2 check, and read as caught.
    if (world.read(CD) !== readRaw(CD)) {
      let builtOk = false;
      let why = "";
      try {
        const m = await dialogFrom(world.read(CD));
        builtOk = typeof m.formGuard === "function" && typeof m.ConfirmDialog === "function";
        if (!builtOk) why = "it yields no formGuard or no ConfirmDialog";
      } catch (e) { why = String((e as Error)?.message ?? e).split(NL)[0]; }
      if (!builtOk) { say(p.name, false, `the plant broke the build of ${CD}: ${why}`); continue; }
    }
    const failures = await run(world, quiet);
    if (p.held) {
      const ok = failures.length === 0;
      if (ok) held++;
      say(p.name, ok, ok ? "" : "a sound variant FAILED — the gate is stricter than the rule", "HELD    ");
    } else {
      const hit = failures.some((f) => p.expect.test(f));
      if (hit) caught++;
      say(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : "the check named for it held");
    }
    console.log(`           failed: ${failures.map((f) => f.split(" ")[0]).join(", ") || "nothing"}`);
  }
  console.log(`${NL}RED CONTROL — ${caught}/${reds} caught · ${held}/${greens} green held${fail === 0 ? "" : ` · ${fail} FAILED`}${NL}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
