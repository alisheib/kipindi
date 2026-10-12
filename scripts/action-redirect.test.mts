/**
 * test:action-redirect — A SESSION THAT ENDS MID-BET IS A SIGN-IN, NEVER A FAILED BET (live fix L3, the Vodacom plan's
 * S8-PLAN A23 item 2, Ali's ruling of 2026-10-12: "fix now").
 *
 *   npm run test:action-redirect     (in predeploy)
 *   npm run red:action-redirect      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT IT CLOSES, FOR EVERY PLAYER, ON THREE MONEY CONTROLS. A money action whose session has ended (signed in
 * on another device, or expired) redirects to the sign-in door, and in Next 16 the client's call REJECTS with that
 * redirect while the router is already navigating. The dial, the sell button and Up & Down's quick bet each waited for
 * the redirect as an answer of NOTHING (`r == null`), which never comes, so the rejection fell to the catch that maps a
 * thrown call to an unknown outcome. Measured on a dev server at `6da7f936`, the session ended from a second sign-in
 * before the commit: the dial said "Could not place — Something went wrong at our end", the sell button "Couldn't cash
 * out — We're busy right now" with its ✗ "CASH-OUT FAILED", the quick bet "Bet not placed — The game is busy right now"
 * — each sticky, on top of the sign-in page, about money the server never touched.
 *
 *   §1 THE FRAMEWORK — Next's own reducer (`server-action-reducer.js`) REJECTS an action's redirect, internal and external,
 *      and resolves nothing on that branch; its error is Next's `getRedirectError`, marked `handled`. The fix assumes
 *      exactly this, so a Next upgrade that changes it fails here first.
 *   §2 THE RULE — `isActionRedirect` (src/lib/action-redirect.ts, built from its text) agrees with Next's own
 *      `isRedirectError` over real redirect errors made by Next's `getRedirectError` (push and replace; 303, 307 and 308;
 *      a destination holding ";"; an external one; the reducer's `handled` one) and over the near misses (not-found, an
 *      Error with no digest, a malformed status, another type, a longer code, a number for a digest, a bare string, an
 *      empty object, null).
 *   §3 THE CONTROLS — the dial, the sell button and the quick bet, as syntax trees: the call to their money action sits in
 *      ONE try whose catch binds the error and asks `isActionRedirect` of it before any failure is said (a toast, a
 *      result, a busy or unknown verdict, a live line, a block); the branch returns, rethrows nothing and says nothing;
 *      the two with a confirm close it first, and the quick bet's own entry is out before it returns; each imports the
 *      rule from its one module.
 *   §4 THE WIRING — this suite in predeploy; its red twin and its drive (`qa:auth-loss-mid-bet`) declared.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: nothing on disk changes. `--prove-red` plants each defect in a copy of the text held in
 * memory and requires the check named for it to fail, and a GREEN control — sound variants of the real tree (the test
 * written `=== true`, a braced branch) — under which nothing may fail. The real-browser half is `qa:auth-loss-mid-bet`.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import ts from "typescript";
import { transformSync } from "esbuild";
import { decomment } from "./lib/decomment.mts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readRaw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const require = createRequire(join(ROOT, "package.json"));

const RULE = "src/lib/action-redirect.ts";
const REDUCER = "node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js";
const PKG = "package.json";
/** The three money controls, the action each calls, and what each must do before it returns on a redirect. */
const CONTROLS = [
  { file: "src/components/markets/conviction-dial.tsx", action: "buyPositionAction", closes: "setConfirmOpen(false)" },
  { file: "src/components/markets/sell-button.tsx", action: "cashOutPositionAction", closes: "setConfirmOpen(false)" },
  { file: "src/components/updown/use-quick-bet.ts", action: "buyPositionAction", closes: "m.delete(key)" },
] as const;
/** What "saying a failure" is on these controls: a toast, a result, a verdict a refusal is mapped from, a live line, a block. */
const SAYS = ["toast(", "showResult(", "setResultOpen(", "setResultData(", "setLiveMessage(", "setBlocked(", "\"BUSY\"", "\"system_error\""];

type World = { read: (rel: string) => string };
const REAL: World = { read: readRaw };

// ── §2's corpus: Next's own errors, and the near misses ────────────────────────────────────────────────────────────────
const nextRedirect = require("next/dist/client/components/redirect") as { getRedirectError: (url: string, type: string, status?: number) => Error };
const nextRedirectError = require("next/dist/client/components/redirect-error") as { isRedirectError: (e: unknown) => boolean };
const handled = (() => { const e = nextRedirect.getRedirectError("/auth/login?next=%2Fpositions", "push") as Error & { handled?: boolean }; e.handled = true; return e; })();
const REDIRECTS: [string, unknown][] = [
  ["replace to the sign-in door (signInPathForAction's shape)", nextRedirect.getRedirectError("/auth/login?next=%2Fmarkets%2Fmkt_1%3Fside%3DYES", "replace")],
  ["push, 303", nextRedirect.getRedirectError("/auth/login", "push", 303)],
  ["push, 308", nextRedirect.getRedirectError("/auth/login", "push", 308)],
  ["a destination holding \";\"", nextRedirect.getRedirectError("/a;b?c=1;2", "replace")],
  ["an external destination", nextRedirect.getRedirectError("https://example.test/x", "replace")],
  ["the reducer's own, marked handled", handled],
];
const NEAR_MISSES: [string, unknown][] = [
  ["not-found", { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }],
  ["an Error with no digest, named NEXT_REDIRECT", new Error("NEXT_REDIRECT")],
  ["a malformed status", { digest: "NEXT_REDIRECT;push;/x;999;" }],
  ["another type", { digest: "NEXT_REDIRECT;other;/x;307;" }],
  ["a longer code", { digest: "NEXT_REDIRECTED;push;/x;307;" }],
  ["no trailing field", { digest: "NEXT_REDIRECT;replace;/x;307" }],
  ["a number for a digest", { digest: 307 }],
  ["a bare string", "NEXT_REDIRECT;push;/x;307;"],
  ["an empty object", {}],
  ["null", null],
  ["undefined", undefined],
];

/** The rule built from the world's text (esbuild, CommonJS), so a plant in the text is what runs. */
function buildRule(world: World): (e: unknown) => boolean {
  const js = transformSync(world.read(RULE), { loader: "ts", format: "cjs" }).code;
  const mod = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", js)(mod, mod.exports);
  const f = mod.exports.isActionRedirect;
  if (typeof f !== "function") throw new Error(`${RULE} exports no isActionRedirect`);
  return f as (e: unknown) => boolean;
}

/** Every statement of a block, read without its comments. */
const textOf = (node: ts.Node, sf: ts.SourceFile) => decomment(node.getText(sf));
const says = (text: string) => SAYS.filter((m) => text.includes(m));

/** The condition asks `isActionRedirect(<name>)` — bare, or compared `=== true` / `== true`. */
function asksRedirect(cond: ts.Expression, name: string): boolean {
  let c = cond;
  while (ts.isParenthesizedExpression(c)) c = c.expression;
  const isCall = (x: ts.Expression) => {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    return ts.isCallExpression(x) && ts.isIdentifier(x.expression) && x.expression.text === "isActionRedirect"
      && x.arguments.length === 1 && ts.isIdentifier(x.arguments[0]) && x.arguments[0].text === name;
  };
  if (isCall(c)) return true;
  if (ts.isBinaryExpression(c) && (c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)) {
    const isTrue = (x: ts.Expression) => x.kind === ts.SyntaxKind.TrueKeyword;
    return (isCall(c.left) && isTrue(c.right)) || (isCall(c.right) && isTrue(c.left));
  }
  return false;
}

/** Each `await action(...)` with the try that guards it: the NEAREST enclosing try whose try block holds it, looked for
 *  no further than the function it is in (an outer try/finally around the whole submit is not the one that answers). */
function awaitsOf(sf: ts.SourceFile, action: string): { at: ts.AwaitExpression; guard: ts.TryStatement | null }[] {
  const out: { at: ts.AwaitExpression; guard: ts.TryStatement | null }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isAwaitExpression(n) && ts.isCallExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === action) {
      let guard: ts.TryStatement | null = null;
      for (let child: ts.Node = n, p = n.parent; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
        if (ts.isTryStatement(p) && p.tryBlock === child) { guard = p; break; }
      }
      out.push({ at: n, guard });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function run(world: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (id: string, label: string, cond: boolean, extra = "") => {
    log(`${cond ? "  ✓" : "  ✗"} ${id} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
    if (!cond) failed.push(`${id} ${label}`);
  };

  // ── §1 the framework ──
  log("§1 the framework: Next's reducer rejects an action's redirect");
  const reducer = world.read(REDUCER);
  const start = reducer.indexOf("if (redirectLocation !== undefined) {");
  const end = start < 0 ? -1 : reducer.indexOf("resolve(actionResult)", start);
  const branch = start >= 0 && end > start ? reducer.slice(start, end) : "";
  ok("1.1", "the redirect branch of the action's answer is found", branch.length > 0, `${REDUCER}: no "if (redirectLocation !== undefined) {" before "resolve(actionResult)"`);
  ok("1.2", "it REJECTS the call with the redirect, internal and external (two rejections)", (branch.match(/reject\(redirectError\)/g) ?? []).length === 2,
    `${(branch.match(/reject\(redirectError\)/g) ?? []).length} found`);
  ok("1.3", "and resolves nothing on that branch", branch.length > 0 && !/\bresolve\(/.test(branch));
  const maker = reducer.slice(reducer.indexOf("function createRedirectErrorForAction"));
  ok("1.4", "its error is Next's getRedirectError, marked handled", /getRedirectError\)?\(/.test(maker.slice(0, 400)) && /\.handled = true/.test(maker.slice(0, 400)));

  // ── §2 the rule ──
  log("§2 the rule: isActionRedirect is Next's isRedirectError");
  let rule: ((e: unknown) => boolean) | null = null;
  try { rule = buildRule(world); } catch (e) { ok("2.0", "the rule builds from its text", false, (e as Error).message); }
  if (rule) {
    const f = rule;
    const wrong = REDIRECTS.filter(([, e]) => !f(e)).map(([n]) => n);
    ok("2.1", "every real redirect error is a redirect", wrong.length === 0, wrong.join("; "));
    const loose = NEAR_MISSES.filter(([, e]) => f(e)).map(([n]) => n);
    ok("2.2", "no near miss is", loose.length === 0, loose.join("; "));
    const apart = [...REDIRECTS, ...NEAR_MISSES].filter(([, e]) => f(e) !== nextRedirectError.isRedirectError(e)).map(([n]) => n);
    ok("2.3", "and it answers as Next's own isRedirectError on every one", apart.length === 0, apart.join("; "));
  }

  // ── §3 the controls ──
  log("§3 the controls: the redirect is asked first, and said by nothing");
  for (const c of CONTROLS) {
    const text = world.read(c.file);
    const sf = ts.createSourceFile(c.file, text, ts.ScriptTarget.Latest, true, c.file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const short = c.file.split("/").pop();
    const imports = sf.statements.filter(ts.isImportDeclaration).filter((d) => ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === "@/lib/action-redirect"
      && !!d.importClause?.namedBindings && ts.isNamedImports(d.importClause.namedBindings) && d.importClause.namedBindings.elements.some((e) => e.name.text === "isActionRedirect" && !e.propertyName));
    ok("3.0", `${short}: imports isActionRedirect from @/lib/action-redirect`, imports.length === 1);
    const calls = awaitsOf(sf, c.action);
    ok("3.1", `${short}: ${c.action} is awaited once, inside a try`, calls.length === 1 && calls[0].guard !== null,
      calls.length !== 1 ? `${calls.length} awaits found` : "the await is in no try");
    if (calls.length !== 1 || !calls[0].guard) continue;
    const clause = calls[0].guard.catchClause;
    const name = clause?.variableDeclaration && ts.isIdentifier(clause.variableDeclaration.name) ? clause.variableDeclaration.name.text : null;
    ok("3.2", `${short}: its catch binds the error`, !!clause && name !== null);
    if (!clause || name === null) continue;
    const stmts = [...clause.block.statements];
    const at = stmts.findIndex((s) => ts.isIfStatement(s) && asksRedirect(s.expression, name));
    ok("3.3", `${short}: the catch asks isActionRedirect(${name})`, at >= 0);
    if (at < 0) continue;
    const before = stmts.slice(0, at).flatMap((s) => says(textOf(s, sf)));
    const assigns = stmts.slice(0, at).some((s) => /^\s*r\s*=/.test(textOf(s, sf)));
    ok("3.4", `${short}: before any failure is said or a verdict made`, before.length === 0 && !assigns, [...before, ...(assigns ? ["a verdict assigned"] : [])].join(", "));
    const branch = (stmts[at] as ts.IfStatement).thenStatement;
    const inside = ts.isBlock(branch) ? [...branch.statements] : [branch];
    const said = inside.flatMap((s) => says(textOf(s, sf)));
    const last = inside[inside.length - 1];
    const returns = !!last && ts.isReturnStatement(last) && !last.expression;
    const throws = inside.some((s) => /\bthrow\b/.test(textOf(s, sf)));
    ok("3.5", `${short}: the branch returns, rethrows nothing and says nothing`, returns && !throws && said.length === 0,
      [!returns ? "it does not end in a bare return" : "", throws ? "it rethrows" : "", ...said].filter(Boolean).join(", "));
    const branchText = inside.map((s) => textOf(s, sf)).join("\n");
    const priorText = stmts.slice(0, at).map((s) => textOf(s, sf)).join("\n");
    const closesAt = c.closes === "m.delete(key)" ? priorText + "\n" + branchText : branchText;
    ok("3.6", `${short}: ${c.closes === "m.delete(key)" ? "the tap's own entry is out" : "the confirm closes"} before it returns`, closesAt.includes(c.closes), `no ${c.closes}`);
  }

  // ── §4 the wiring ──
  log("§4 the wiring");
  const pkg = JSON.parse(world.read(PKG)) as { scripts: Record<string, string> };
  const sc = pkg.scripts;
  ok("4.1", "test:action-redirect runs this suite", sc["test:action-redirect"] === "tsx scripts/action-redirect.test.mts");
  ok("4.2", "red:action-redirect is its red twin", sc["red:action-redirect"] === "tsx scripts/action-redirect.test.mts --prove-red");
  ok("4.3", "predeploy runs it", (sc.predeploy ?? "").split("&&").map((s) => s.trim()).includes("npm run test:action-redirect"));
  let driveThere = false;
  try { driveThere = sc["qa:auth-loss-mid-bet"] === "node scripts/qa-auth-loss-mid-bet.mjs" && world.read("scripts/qa-auth-loss-mid-bet.mjs").length > 0; } catch { driveThere = false; }
  ok("4.4", "its drive qa:auth-loss-mid-bet is declared and on disk", driveThere);
  return failed;
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────────────────────────────

if (!PROVE_RED) {
  console.log("action-redirect — live fix L3: a session that ends mid-bet is a sign-in, never a failed bet");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nACTION REDIRECT — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /** The real tree with one file's text replaced: `from` must occur exactly once, so a plant can never land twice. */
  const plantIn = (file: string, from: string, to: string, base: World = REAL): World => {
    const raw = base.read(file);
    const n = raw.split(from).length - 1;
    if (n !== 1) throw new Error(`plant anchor in ${file} occurs ${n} times, not once: ${JSON.stringify(from.slice(0, 60))}`);
    const planted = raw.replace(from, to);
    return { read: (rel) => (rel === file ? planted : base.read(rel)) };
  };
  const [DIAL, SELL, QUICK] = CONTROLS.map((c) => c.file);
  const DIAL_TEST = "if (isActionRedirect(e)) { setConfirmOpen(false); return; }";
  const SELL_TEST = "if (isActionRedirect(e)) { setConfirmOpen(false); return; }";
  const QUICK_TEST = "if (isActionRedirect(e)) return;";
  const DIAL_VERDICT = "r = { ok: false as const, error: \"\", code: \"BUSY\", reason: \"system_error\" } as Awaited<ReturnType<typeof buyPositionAction>>;";
  const QUICK_TOAST = "toast({ title: copy.failed, description: errCopy.udErrBusy, variant: \"danger\", durationMs: 0 });";
  type Plant = { name: string; expect: RegExp; world: () => World };
  const plants: Plant[] = [
    { name: "the dial without the test — the defect as it was (the redirect said as an unknown outcome)", expect: /^3\.3 /,
      world: () => plantIn(DIAL, DIAL_TEST, "") },
    { name: "the dial asks only after its verdict is made", expect: /^3\.4 /,
      world: () => plantIn(DIAL, `${DIAL_TEST}\n        ${DIAL_VERDICT}`, `${DIAL_VERDICT}\n        ${DIAL_TEST}`) },
    { name: "the dial asks of the wrong name", expect: /^3\.3 /,
      world: () => plantIn(DIAL, DIAL_TEST, "if (isActionRedirect(r)) { setConfirmOpen(false); return; }") },
    { name: "the dial's catch binds nothing (`catch {`)", expect: /^3\.2 /,
      world: () => plantIn(DIAL, `} catch (e) {\n        // ⭐ L3 · AUTH LOSS IS NOT A FAILED BET`, `} catch {\n        // ⭐ L3 · AUTH LOSS IS NOT A FAILED BET`) },
    { name: "the sell button's branch toasts before it returns", expect: /^3\.5 /,
      world: () => plantIn(SELL, SELL_TEST, "if (isActionRedirect(e)) { toast({ title: t.toast.couldntCashOut }); setConfirmOpen(false); return; }") },
    { name: "the sell button's branch leaves the confirm open", expect: /^3\.6 /,
      world: () => plantIn(SELL, SELL_TEST, "if (isActionRedirect(e)) { return; }") },
    { name: "the sell button's rule imported from elsewhere", expect: /^3\.0 /,
      world: () => plantIn(SELL, "import { isActionRedirect } from \"@/lib/action-redirect\";", "import { isActionRedirect } from \"@/lib/somewhere-else\";") },
    { name: "the quick bet asks only after its toast", expect: /^3\.4 /,
      world: () => plantIn(QUICK, QUICK_TOAST, `${QUICK_TOAST}\n        ${QUICK_TEST}`, plantIn(QUICK, QUICK_TEST, "")) },
    { name: "the quick bet rethrows the redirect", expect: /^3\.5 /,
      world: () => plantIn(QUICK, QUICK_TEST, "if (isActionRedirect(e)) throw e;") },
    { name: "the rule loosened to a prefix", expect: /^2\.(2|3) /,
      world: () => plantIn(RULE, "return parts[0] === \"NEXT_REDIRECT\" && (parts[1] === \"push\" || parts[1] === \"replace\") && (status === 303 || status === 307 || status === 308);",
        "return digest.startsWith(\"NEXT_REDIRECT\");") },
    { name: "the rule that never says yes", expect: /^2\.1 /,
      world: () => plantIn(RULE, "if (typeof digest !== \"string\") return false;", "if (typeof digest === \"string\" || digest !== \"string\") return false;") },
    { name: "a framework that resolves the redirect to nothing", expect: /^1\.(2|3) /,
      world: () => plantIn(REDUCER, "                const redirectError = createRedirectErrorForAction(redirectHref, navigateType);\n                reject(redirectError);\n            }",
        "                const redirectError = createRedirectErrorForAction(redirectHref, navigateType);\n                resolve(undefined);\n            }") },
    { name: "predeploy without the suite", expect: /^4\.3 /,
      world: () => plantIn(PKG, "npm run test:action-redirect && ", "") },
  ];
  // ⭐ THE GREEN CONTROL: sound variants of the real tree — the dial's test compared `=== true`, the quick bet's braced —
  // under which nothing may fail, so a check that is merely strict cannot pass for one that is right.
  const green = plantIn(QUICK, QUICK_TEST, "if (isActionRedirect(e)) { return; }",
    plantIn(DIAL, DIAL_TEST, "if (isActionRedirect(e) === true) { setConfirmOpen(false); return; }"));
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const quiet = () => {};
  const clean = run(REAL, quiet);
  ok("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  const greenFails = run(green, quiet);
  ok("GREEN: sound variants (`=== true`, a braced branch) pass every check", greenFails.length === 0, greenFails.join(" | "));
  for (const p of plants) {
    let failures: string[];
    try { failures = run(p.world(), quiet); } catch (e) { ok(p.name, false, `the plant could not be made: ${(e as Error).message}`); continue; }
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
