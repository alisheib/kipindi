/**
 * test:sell-grace-truth — THE FREE-SELL PROMISE COMES FROM THE SERVER (the Vodacom plan S6, amendment A8's live half:
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` A8, `docs/VODACOM-PLAN.md` §0i).
 *
 *   npm run test:sell-grace-truth     (in predeploy)
 *   npm run red:sell-grace-truth      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * 🔴 THE DEFECT THIS GATE CLOSED, ON EVERY PLAYER'S SELL BUTTON. The button counted its free exit down from the
 * placement with a constant five-minute grace. The server sells free for each poll's FROZEN `freeExitGraceMinutes`,
 * read through `exitWindowFacts(ratesFor(market))` inside `cashOutValue`. So a poll frozen at 2 minutes was told it
 * could sell free for three more minutes after the server had locked the exit, and a poll frozen at 10 lost half of
 * its free window on screen. Beside the constant sat a second clock — "closes in more than five minutes from now", on
 * the device — which the server never asks, and which took the free label and countdown off sales the server was
 * still granting free.
 *
 *   §1 THE SERVER'S INSTANT — `freeExitEndsAt` against `cashOutValue` itself, over a grid of frozen graces (0, 2, 5
 *      and 10 minutes) × paid windows × runways × both kinds of close × instants on every boundary: a sale is shown
 *      free exactly when the server sells free. Named for 5, 2 and 10 minutes; no runway or a zero grace is no
 *      instant; it never outlives the close; it reads no clock. A control runs the old rule over the same grid and
 *      requires it to disagree, so the grid can see the defect it exists for.
 *   §2 THE HOSTS — every file that renders SellButton, derived from `src/` on disk: each is a server component,
 *      imports the one helper, and hands every SellButton `freeUntil={freeExitEndsAt(…)}` — asked with the
 *      position's own placement and the market as read, in the attribute or through the one `const` the host binds it
 *      to (S6 WP10: the file binds that name nowhere else, so no parameter can shadow it, and binds it in the block that
 *      holds the element) — and never a placement. Three must be among them, by name: `/positions`, the holder block of
 *      `/markets/[id]`, and (S6 WP9) the journey's ticket card on Tiketi zangu. A clock label beside the countdown
 *      (WP10's `freeUntilLabel`) is that one binding's own reading on the server, `X ? formatClock(X) : null`, never a
 *      time built beside it — and the journey's card hands one (2.label).
 *   §3 THE BUTTON — `sell-button.tsx` as a syntax tree: no `GRACE_MS`, no five-minute constant, nothing multiplied
 *      out of minutes; the countdown's one time source is `Date.parse(freeUntil)`, an instant that is withdrawn
 *      zeroes it, and the free/fee state and the m:ss label both read that countdown and nothing else. In the journey's
 *      look (S6 WP10) the free offer is that countdown narrowed by the server's own pricing (`pricedFree`): drawn on the
 *      server's paint before the countdown first runs, and lapsed the moment it has run out (3.journey).
 *   §4 THE WIRING — this suite is in predeploy and its red twin is declared.
 *
 * ⛔ DISPLAY TRUTH ONLY. `cashOutValue` is not edited and its golden grid stays `test:house-bot-seam`'s; this suite
 * calls it as the oracle and never re-implements it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` hands §1 defective helpers and §2–§4 edited source TEXT held in memory,
 * and requires the check named for each defect to fail. Nothing here changes a file, so `test:red-anchors` §4 counts
 * it in the in-process class.
 * ⚠️ This file carries no escape sequences (line breaks are built from their code points), so a tool that decodes
 * escapes on the way to disk cannot change what it tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";
import { REPO_ROOT, srcFiles } from "./lib/tracked-files.mts";

// The in-memory store, always. Nothing here reads or writes a row, but the service module is loaded, and a suite
// that only computes must never be the one that finds a database (`test:house-bot-seam` does the same).
process.env.DATABASE_URL = "";
process.env.USE_PRISMA_DAL = "false";

const PROVE_RED = process.argv.includes("--prove-red");
const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const SVC = await import("../src/lib/server/market-service.ts");
const { exitWindowFacts } = await import("../src/lib/exit-window.ts");
const { DEFAULT_FREE_EXIT_GRACE_MINUTES } = await import("../src/lib/payout.ts");

// ── OUTPUT ────────────────────────────────────────────────────────────────────────────────────────────────
type Result = { label: string; ok: boolean; detail: string };
let results: Result[] = [];
let quiet = false;
const ok = (label: string, cond: boolean, detail = "") => {
  results.push({ label, ok: !!cond, detail });
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
};
const say = (line: string) => { if (!quiet) console.log(line); };
const j = (v: unknown) => JSON.stringify(v);

// ── THE IMPLEMENTATION UNDER TEST — passed in, so the red twin can hand in defective ones ─────────────────────
type Position = Parameters<typeof SVC.freeExitEndsAt>[0];
type Market = Parameters<typeof SVC.freeExitEndsAt>[1];
type Impl = { freeExitEndsAt: (position: Position, market: Market) => string | null };
const REAL: Impl = { freeExitEndsAt: SVC.freeExitEndsAt };

// ── THE SOURCE WORLD — read once, comments stripped by the shared helper, so the red twin can plant in memory ─
const SELL_BUTTON = "src/components/markets/sell-button.tsx";
const POSITIONS = "src/app/positions/page.tsx";
const MARKET = "src/app/markets/[id]/page.tsx";
/** S6 WP9 — the journey's ticket card renders the button on Tiketi zangu: a host like the two above, held to the same call. */
const JOURNEY_CARD = "src/components/journey/tickets/ticket-card.tsx";
const readRaw = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8").split(CR).join("");
type World = { files: Map<string, string>; rawSellButton: string; scripts: Record<string, string> };
const WORLD: World = {
  files: new Map(srcFiles().map((rel) => [rel, decomment(readRaw(rel))])),
  rawSellButton: readRaw(SELL_BUTTON),
  scripts: (JSON.parse(readRaw("package.json")) as { scripts: Record<string, string> }).scripts,
};

// ── SYNTAX-TREE HELPERS (parsed, never type-checked) ───────────────────────────────────────────────────────
const parse = (rel: string, code: string): ts.SourceFile =>
  ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true,
    rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS);
function walkTree(root: ts.Node, visit: (n: ts.Node) => void): void {
  const go = (n: ts.Node) => { visit(n); ts.forEachChild(n, go); };
  go(root);
}
const lineOf = (sf: ts.SourceFile, n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
/** The value of a constant numeric expression (`5 * 60_000`, `(300_000)`, `60_000 * 5` …), or null. */
function fold(n: ts.Node): number | null {
  if (ts.isNumericLiteral(n)) return Number(n.text.split("_").join(""));
  if (ts.isParenthesizedExpression(n)) return fold(n.expression);
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken) { const v = fold(n.operand); return v === null ? null : -v; }
  if (ts.isBinaryExpression(n)) {
    const a = fold(n.left);
    const b = fold(n.right);
    if (a === null || b === null) return null;
    switch (n.operatorToken.kind) {
      case ts.SyntaxKind.AsteriskToken: return a * b;
      case ts.SyntaxKind.PlusToken: return a + b;
      case ts.SyntaxKind.MinusToken: return a - b;
      case ts.SyntaxKind.SlashToken: return a / b;
      default: return null;
    }
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §1 · THE SERVER'S INSTANT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const MIN = 60_000;
/** A fixed placement instant, so the grid never depends on when it runs. */
const T0 = Date.UTC(2026, 9, 1, 9, 0, 0, 0);
/** The rule this gate replaced, kept ONLY as §1's control: placement + five minutes, and "closes in more than
 *  five minutes from now". */
const OLD_GRACE_MS = 5 * MIN;
type Row = { id: string; graceMin: number; paidMin: number; runwayMs: number; selectionClose: boolean; emptyPlacedAt?: boolean };
const GRID: Row[] = [];
for (const graceMin of [0, 2, 5, 10]) {
  for (const paidMin of [0, 2]) {
    const g = graceMin * MIN;
    // Below, at and just past the grace; the stretch where the old rule hid a free sale (grace + 3:00); an hour.
    const runways = graceMin === 0 ? [0, 60 * MIN] : [g - 1, g, g + 1, g + 3 * MIN, 60 * MIN];
    for (const runwayMs of runways) {
      for (const selectionClose of [true, false]) {
        GRID.push({ id: `g${graceMin}-p${paidMin}-r${runwayMs}-${selectionClose ? "sel" : "res"}`, graceMin, paidMin, runwayMs, selectionClose });
      }
    }
  }
}
// An empty placement, which `cashOutValue` reads as "now".
for (const graceMin of [2, 5, 10]) {
  GRID.push({ id: `g${graceMin}-empty-placedAt`, graceMin, paidMin: 0, runwayMs: 60 * MIN, selectionClose: true, emptyPlacedAt: true });
}

function caseOf(r: Row) {
  const closesMs = T0 + r.runwayMs;
  const closesIso = new Date(closesMs).toISOString();
  const position = { side: "YES" as const, stake: 10_000, placedAt: r.emptyPlacedAt ? "" : new Date(T0).toISOString(), bonusStakeTzs: 0 };
  const market = {
    id: "mkt_sell_grace",
    yesPool: 10_000,
    noPool: 5_000,
    // With no selection close the exit shuts at resolutionAt; with one, resolution is a day later and must not count.
    resolutionAt: r.selectionClose ? new Date(closesMs + 24 * 60 * MIN).toISOString() : closesIso,
    selectionClosedAt: r.selectionClose ? closesIso : null,
    feeSnapshot: {
      commissionRate: 0.13,
      feeCeilingRate: 0.5,
      cashOutFeeRate: 0.09,
      freeExitGraceMinutes: r.graceMin,
      paidExitWindowMinutes: r.paidMin,
      traTaxOnCommissionRate: 0,
      gbtLevyOnCommissionRate: 0,
    } as never,
  };
  return { position, market, closesMs };
}
const sincesFor = (r: Row) => {
  const g = r.graceMin * MIN;
  const w = g + r.paidMin * MIN;
  return [...new Set([-1000, 0, 1, g - 1, g, g + 1, w - 1, w, w + 1, w + 60 * MIN])];
};
const realNow = Date.now;
/** Run `fn` with the clock stopped at `nowMs`; both functions under test read `Date.now()` synchronously. */
async function at<T>(nowMs: number, fn: () => T | Promise<T>): Promise<T> {
  Date.now = () => nowMs;
  try { return await fn(); } finally { Date.now = realNow; }
}

async function g1Server(I: Impl) {
  say(`${NL}§1 · the server's instant — freeExitEndsAt against cashOutValue itself`);
  const mismatches: string[] = [];
  const outlives: string[] = [];
  const clockRead: string[] = [];
  const oldDiffs = new Map<number, number>();
  let probes = 0;
  for (const r of GRID) {
    const { position, market, closesMs } = caseOf(r);
    for (const since of sincesFor(r)) {
      const nowMs = T0 + since;
      const co = await at(nowMs, () => SVC.cashOutValue(position, market));
      const end = await at(nowMs, () => I.freeExitEndsAt(position, market));
      const endMs = end === null ? null : Date.parse(end);
      // What SellButton shows: free while the instant is still ahead (its countdown is end − now, floored at 0).
      const shownFree = endMs !== null && nowMs < endMs;
      probes++;
      if (co.inGracePeriod !== shownFree) mismatches.push(`${r.id} at ${since} ms: server ${co.inGracePeriod}, shown ${shownFree} (end ${end})`);
      if (endMs !== null && !(endMs <= closesMs)) outlives.push(`${r.id}: ${end}`);
      if (!r.emptyPlacedAt) {
        const oldFree = nowMs < T0 + OLD_GRACE_MS && closesMs - nowMs > OLD_GRACE_MS;
        if (oldFree !== co.inGracePeriod) oldDiffs.set(r.graceMin, (oldDiffs.get(r.graceMin) ?? 0) + 1);
      }
    }
    if (!r.emptyPlacedAt) {
      const early = await at(T0 - 7 * MIN, () => I.freeExitEndsAt(position, market));
      const late = await at(T0 + 90 * MIN, () => I.freeExitEndsAt(position, market));
      if (early !== late) clockRead.push(`${r.id}: ${early} then ${late}`);
    }
  }
  ok(`1.grid · on all ${probes} probes (${GRID.length} polls: frozen grace 0/2/5/10 min × paid 0/2 × runway × selection close or resolution, at every boundary instant) the window the page passes is open exactly when cashOutValue sells free`,
    probes >= 400 && mismatches.length === 0, `${mismatches.length} disagree: ${mismatches.slice(0, 3).join(" | ")}`);

  for (const g of [5, 2, 10]) {
    const { position, market } = caseOf({ id: `named-g${g}`, graceMin: g, paidMin: 0, runwayMs: 60 * MIN, selectionClose: true });
    const want = new Date(T0 + g * MIN).toISOString();
    const end = await at(T0, () => I.freeExitEndsAt(position, market));
    const before = await at(T0 + g * MIN - 1, () => SVC.cashOutValue(position, market));
    const after = await at(T0 + g * MIN, () => SVC.cashOutValue(position, market));
    ok(`1.named.g${g} · a poll frozen at ${g} minutes: the instant is the placement + ${g}:00 (${want}), and the server sells free — the full stake, no fee — 1 ms before it and not at it`,
      end === want && before.inGracePeriod && before.value === 10_000 && before.fee === 0 && !after.inGracePeriod,
      j({ end, want, before: { free: before.inGracePeriod, value: before.value, fee: before.fee }, atEnd: { free: after.inGracePeriod, sellable: after.sellable } }));
    if (g === 2) {
      ok("1.named.g2.locked · …and at +2:00 the server has LOCKED that exit (no paid window), where the five-minute constant still promised 3:00 of free selling",
        end === want && !after.sellable && after.reason === "WINDOW_PASSED", j({ end, sellable: after.sellable, reason: after.reason }));
    }
    if (g === 10) {
      const half = await at(T0 + OLD_GRACE_MS, () => SVC.cashOutValue(position, market));
      ok("1.named.g10.half · …and at +5:00, where the constant stopped promising, the server still sells free for five minutes more",
        end === want && half.inGracePeriod, j({ end, free: half.inGracePeriod }));
    }
  }
  {
    const { position, market } = caseOf({ id: "named-paid", graceMin: 2, paidMin: 2, runwayMs: 60 * MIN, selectionClose: true });
    const end = await at(T0, () => I.freeExitEndsAt(position, market));
    const after = await at(T0 + 2 * MIN, () => SVC.cashOutValue(position, market));
    ok("1.named.paid · a poll frozen at 2 free minutes + 2 paid: the instant is +2:00 (the FREE window, not the paid one), and there the server starts CHARGING a fee",
      end === new Date(T0 + 2 * MIN).toISOString() && !after.inGracePeriod && after.sellable && after.fee > 0,
      j({ end, free: after.inGracePeriod, sellable: after.sellable, fee: after.fee }));
  }

  const noneRows: Row[] = [
    { id: "none-zero-grace", graceMin: 0, paidMin: 2, runwayMs: 60 * MIN, selectionClose: true },
    { id: "none-short-5", graceMin: 5, paidMin: 0, runwayMs: 5 * MIN - 1, selectionClose: true },
    { id: "none-short-10", graceMin: 10, paidMin: 2, runwayMs: 9 * MIN, selectionClose: false },
  ];
  const noneEnds: Array<string | null> = [];
  for (const r of noneRows) {
    const { position, market } = caseOf(r);
    noneEnds.push(await at(T0, () => I.freeExitEndsAt(position, market)));
  }
  ok("1.none · no instant at all (null, so no countdown is drawn) where the server never offered a free window: a poll frozen at 0 minutes, and bets placed with less than the grace left before selling shuts",
    noneEnds.every((e) => e === null), j(noneEnds));
  ok("1.close · no instant outlives the moment selling shuts (selection close, or resolution when there is none) — the runway rule guarantees it, and it is measured here",
    outlives.length === 0, outlives.slice(0, 3).join(" | "));
  ok("1.clock · the instant reads no clock: asked 7 minutes before the bet and 90 minutes after it, every poll gets the same instant",
    clockRead.length === 0, clockRead.slice(0, 3).join(" | "));
  ok("1.control · CONTROL · the old rule (placement + 5:00, and 'closes in more than 5:00 from now') run over the same grid disagrees with the server on the 2- and 10-minute polls — so 1.grid can see the defect it exists for",
    (oldDiffs.get(2) ?? 0) > 0 && (oldDiffs.get(10) ?? 0) > 0, j(Object.fromEntries(oldDiffs)));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §2 · THE HOSTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
type Host = {
  rel: string; client: boolean; importsHelper: boolean; importsClock: boolean;
  els: Array<{ line: number; passes: boolean; placed: boolean; spread: boolean; label: "none" | "ok" | "bad" }>;
};
/** The helper is asked about the bet's OWN placement: the position itself, or `{ placedAt: <it>.placedAt }` with
 *  nothing beside it. A call on an instant made at render time names the helper and still answers a window the
 *  server never offered. */
const asksAboutPlacement = (arg: ts.Expression): boolean => {
  if (ts.isIdentifier(arg)) return true;
  if (!ts.isObjectLiteralExpression(arg) || arg.properties.length !== 1) return false;
  const only = arg.properties[0];
  return ts.isPropertyAssignment(only) && ts.isIdentifier(only.name) && only.name.text === "placedAt"
    && ts.isPropertyAccessExpression(only.initializer) && only.initializer.name.text === "placedAt";
};
/** The helper's own call, `freeExitEndsAt(<the bet's placement>, <the market, as read>)`. */
const isHelperCall = (sf: ts.SourceFile, call: ts.CallExpression | undefined): boolean =>
  !!call && call.expression.getText(sf) === "freeExitEndsAt" && call.arguments.length === 2
    && asksAboutPlacement(call.arguments[0]) && ts.isIdentifier(call.arguments[1]);
/**
 * S6 WP10 — every place a file BINDS a name: a variable, a parameter, a destructured element, a function, a class or an
 * import. A name the file binds once cannot be shadowed, so an element that names it reads that one binding.
 */
function bindingSites(sf: ts.SourceFile, name: string): ts.Node[] {
  const out: ts.Node[] = [];
  walkTree(sf, (n) => {
    const p = n.parent;
    if (!ts.isIdentifier(n) || n.text !== name || !p) return;
    const binds = (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p) || ts.isFunctionDeclaration(p)
      || ts.isClassDeclaration(p) || ts.isImportSpecifier(p) || ts.isNamespaceImport(p) || ts.isImportClause(p)) && p.name === n;
    if (binds) out.push(p);
  });
  return out;
}
/**
 * S6 WP10 — the call a name is bound to, when the file binds that name exactly once — as a `const`, with a call, in the
 * block (or file) that holds the element. The journey's ticket card binds the instant once so it can hand the SAME
 * instant to the countdown and to its clock label. A `let`, a second binding anywhere in the file (a callback's
 * parameter that shadows it included), a binding the element cannot see, or anything but a call leaves the name
 * unbound here, so it cannot pass.
 */
function boundCall(sf: ts.SourceFile, name: string, at: ts.Node): ts.CallExpression | undefined {
  const sites = bindingSites(sf, name);
  const only = sites.length === 1 ? sites[0] : undefined;
  const d = only && ts.isVariableDeclaration(only) ? only : undefined;
  const list = d?.parent;
  const isConst = !!list && ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0;
  const scope = list?.parent?.parent;
  const holds = !!scope && scope.pos <= at.pos && at.end <= scope.end;
  return isConst && holds && d && d.initializer && ts.isCallExpression(d.initializer) ? d.initializer : undefined;
}
/** S6 WP10 — `X ? formatClock(X) : null`: the clock reading of exactly the binding handed as freeUntil, or no label. */
const isClockOf = (sf: ts.SourceFile, e: ts.Expression | undefined, name: string): boolean =>
  !!e && ts.isConditionalExpression(e) && ts.isIdentifier(e.condition) && e.condition.text === name
    && ts.isCallExpression(e.whenTrue) && e.whenTrue.expression.getText(sf) === "formatClock" && e.whenTrue.arguments.length === 1
    && ts.isIdentifier(e.whenTrue.arguments[0]) && e.whenTrue.arguments[0].text === name
    && e.whenFalse.kind === ts.SyntaxKind.NullKeyword;
function hostOf(rel: string, code: string): Host {
  const sf = parse(rel, code);
  const locals = new Set<string>();
  let importsHelper = false;
  let importsClock = false;
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const spec = st.moduleSpecifier.text;
    const named = st.importClause?.namedBindings;
    const names = named && ts.isNamedImports(named) ? [...named.elements] : [];
    for (const e of names) {
      const imported = (e.propertyName ?? e.name).text;
      if (spec.endsWith("/sell-button") && imported === "SellButton") locals.add(e.name.text);
      if (spec === "@/lib/server/market-service" && imported === "freeExitEndsAt") importsHelper = true;
      if (spec === "@/lib/utils" && imported === "formatClock") importsClock = true;
    }
  }
  if (locals.size === 0) locals.add("SellButton");
  const els: Host["els"] = [];
  walkTree(sf, (n) => {
    if (!(ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) || !locals.has(n.tagName.getText(sf))) return;
    let passes = false;
    let placed = false;
    let spread = false;
    let bound: string | null = null;
    let labelled = false;
    let labelExpr: ts.Expression | undefined;
    for (const a of n.attributes.properties) {
      if (!ts.isJsxAttribute(a)) { spread = true; continue; }
      const name = a.name.getText(sf);
      if (name === "placedAt") placed = true;
      if (name === "freeUntil") {
        const init = a.initializer;
        const expr = init && ts.isJsxExpression(init) ? init.expression : undefined;
        // The helper's call in the attribute, or (S6 WP10) the one const the file binds it to, nowhere else. The market
        // goes in as read (a name), so its frozen rates reach the helper untouched.
        if (expr && ts.isIdentifier(expr)) bound = expr.text;
        const call = expr && ts.isCallExpression(expr) ? expr : bound !== null ? boundCall(sf, bound, n) : undefined;
        passes = isHelperCall(sf, call);
      }
      if (name === "freeUntilLabel") {
        labelled = true;
        const init = a.initializer;
        labelExpr = init && ts.isJsxExpression(init) ? init.expression : undefined;
      }
    }
    const label = !labelled ? "none" : bound !== null && isClockOf(sf, labelExpr, bound) ? "ok" : "bad";
    els.push({ line: lineOf(sf, n), passes, placed, spread, label });
  });
  return { rel, client: isDirective(code, "use client"), importsHelper, importsClock, els };
}

function g2Hosts(W: World) {
  say(`${NL}§2 · the hosts — every file that renders SellButton hands it the server's instant`);
  const mentions = [...W.files].filter(([rel, code]) => rel !== SELL_BUTTON && (code.includes("SellButton") || code.includes("/sell-button")));
  const hosts = mentions.map(([rel, code]) => hostOf(rel, code)).filter((h) => h.els.length > 0);
  say(`     src files read: ${W.files.size} · files naming SellButton: ${mentions.length} · hosts that render it (${hosts.length}): ${hosts.map((h) => `${h.rel} ×${h.els.length}`).join(", ")}`);
  ok("2.pop · the hosts are derived from disk, and they include the two this fix was written for — /positions and the holder block of /markets/[id] — and the journey's ticket card (S6 WP9)",
    W.files.size >= 500 && [POSITIONS, MARKET, JOURNEY_CARD].every((f) => hosts.some((h) => h.rel === f)), j({ files: W.files.size, hosts: hosts.map((h) => h.rel) }));
  const clientHosts = hosts.filter((h) => h.client).map((h) => h.rel);
  ok("2.server · every host is a SERVER component, so the instant is computed where the poll's frozen rates are read — never in the browser",
    hosts.length > 0 && clientHosts.length === 0, j(clientHosts));
  const notPassing = hosts.flatMap((h) => h.els.filter((e) => !e.passes).map((e) => `${h.rel}:${e.line}`));
  ok("2.passes · every SellButton is handed freeUntil={freeExitEndsAt(…)} — the helper's own call, asked about the bet's own placement and the market as read, in the attribute or through the one const the file binds it to (bound nowhere else, so nothing shadows it) — not an instant built beside it",
    hosts.length > 0 && notPassing.length === 0, j(notPassing));
  const placed = hosts.flatMap((h) => h.els.filter((e) => e.placed || e.spread).map((e) => `${h.rel}:${e.line}${e.spread ? " (a spread)" : ""}`));
  ok("2.no-placed · no SellButton is handed the placement (or a spread that could carry it), so the button has nothing to build a window from",
    hosts.length > 0 && placed.length === 0, j(placed));
  const noImport = hosts.filter((h) => !h.importsHelper).map((h) => h.rel);
  ok("2.import · every host imports freeExitEndsAt from @/lib/server/market-service, the module cashOutValue lives in",
    hosts.length > 0 && noImport.length === 0, j(noImport));
  const labels = hosts.flatMap((h) => h.els.filter((e) => e.label !== "none").map((e) => ({ h, e })));
  const badLabels = labels.filter(({ h, e }) => e.label !== "ok" || !h.importsClock).map(({ h, e }) => `${h.rel}:${e.line}`);
  ok("2.label · every clock label beside the countdown (S6 WP10's freeUntilLabel) is the server's reading of THE instant handed as freeUntil — `X ? formatClock(X) : null` over the one const the host binds the helper's call to, formatClock from @/lib/utils — never a time built beside it; the journey's ticket card hands one",
    labels.length > 0 && badLabels.length === 0 && labels.some(({ h }) => h.rel === JOURNEY_CARD),
    j({ labels: labels.map(({ h, e }) => `${h.rel}:${e.line}`), bad: badLabels }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §3 · THE BUTTON
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * S6 WP10 — the journey look's free offer and its lapse: each the countdown, narrowed by the server's own pricing
 * (`pricedFree`, cashOutValue's `inGracePeriod` as the page priced the exit). `mounted` turns true at the browser's first
 * commit, in the journey's look only, and is set nowhere else: before it the countdown has not run, so the server's
 * pricing alone draws the offer (the server's paint).
 */
const OFFER_FREE = "const offerFree = pricedFree === true && (inGrace || !mounted);";
const LAPSED = "const lapsed = pricedFree === true && mounted && !inGrace;";
const MOUNTED = "const [mounted, setMounted] = useState(false);";
const MOUNT_EFFECT = "useEffect(() => { if (journey) setMounted(true); }, [journey]);";
const occurrences = (s: string, x: string) => s.split(x).length - 1;

function g3Button(W: World) {
  say(`${NL}§3 · the button — sell-button.tsx counts down to one instant and builds no window of its own`);
  const code = W.files.get(SELL_BUTTON) ?? "";
  const sf = parse(SELL_BUTTON, code);
  const ids = new Set<string>();
  walkTree(sf, (n) => { if (ts.isIdentifier(n)) ids.add(n.text); });
  ok("3.grace-ms · no GRACE_MS in sell-button.tsx — not in its code, not in its comments",
    code.length > 0 && !ids.has("GRACE_MS") && !code.includes("GRACE_MS") && !W.rawSellButton.includes("GRACE_MS"));

  const fiveMinute: number[] = [];
  const multiplied: number[] = [];
  walkTree(sf, (n) => {
    const v = fold(n);
    if (v === OLD_GRACE_MS && !(n.parent && fold(n.parent) !== null)) fiveMinute.push(lineOf(sf, n));
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.AsteriskToken && (fold(n.left) !== null || fold(n.right) !== null)) {
      multiplied.push(lineOf(sf, n));
    }
  });
  ok("3.literal · no five-minute constant in any spelling (5 * 60_000, 300_000, 60_000 * 5, 5 * 60 * 1000 …)",
    fiveMinute.length === 0, `lines ${j(fiveMinute)}`);
  ok("3.minute-math · nothing is multiplied by a number — the button builds no duration out of minutes; the window's length is the server's to know",
    multiplied.length === 0, `lines ${j(multiplied)}`);

  const calls = (callee: string) => {
    const out: ts.CallExpression[] = [];
    walkTree(sf, (n) => { if (ts.isCallExpression(n) && n.expression.getText(sf) === callee) out.push(n); });
    return out;
  };
  const argName = (c: ts.CallExpression) => (c.arguments.length === 1 && ts.isIdentifier(c.arguments[0]) ? c.arguments[0].text : null);
  const parses = calls("Date.parse");
  const fromServer = parses.filter((c) => argName(c) === "freeUntil");
  const strayParses = parses.filter((c) => argName(c) !== "freeUntil" && argName(c) !== "closesAt").map((c) => c.getText(sf));
  // The one parse sits in `freeUntil ? Date.parse(freeUntil) : NaN`: no instant is NaN, never a window of the button's own.
  const guard = fromServer.length === 1 ? fromServer[0].parent : undefined;
  const guarded = !!guard && ts.isConditionalExpression(guard) && guard.whenTrue === fromServer[0]
    && guard.condition.getText(sf) === "freeUntil" && guard.whenFalse.getText(sf) === "NaN";
  const decl = guarded && guard ? guard.parent : undefined;
  const holder = decl && ts.isVariableDeclaration(decl) && decl.initializer === guard && ts.isIdentifier(decl.name) ? decl.name.text : null;
  const setters = calls("setGraceRemainMs");
  const setter = setters.length === 1 && setters[0].arguments.length === 1 ? setters[0] : undefined;
  const setArg = setter ? setter.arguments[0].getText(sf) : "";
  const props: string[] = [];
  walkTree(sf, (n) => { if (ts.isPropertySignature(n)) props.push(n.name.getText(sf)); });
  ok("3.source · the countdown's ONE time source is the server's instant: freeUntil is a prop, parsed exactly once (no instant is NaN) into the value the one setGraceRemainMs call counts down to (server-calibrated); the placement is not read, and nothing is parsed but freeUntil and the selection cutoff",
    props.includes("freeUntil") && fromServer.length === 1 && holder !== null && setters.length === 1
      && setArg.includes(holder) && setArg.includes("clockOffset") && !setArg.includes("Date.parse")
      && !ids.has("placedAt") && strayParses.length === 0,
    j({ freeUntilProp: props.includes("freeUntil"), parsedOnce: fromServer.length, guarded, holder, setters: setters.length, setArg, placedAt: ids.has("placedAt"), strayParses }));

  // An instant WITHDRAWN while the button is mounted (a cutoff moved earlier, so the bet no longer had its runway)
  // must zero the countdown, never freeze it at the last value it showed. Both hosts also lock the button then
  // (`alreadyClosed`), which hides the strip today; the button's own state must not lean on that. So the one setter
  // answers 0 when there is no instant, and the effect runs it before it can return.
  const arg = setter ? setter.arguments[0] : undefined;
  const zeroes = !!arg && holder !== null && ts.isConditionalExpression(arg)
    && arg.condition.getText(sf) === `Number.isFinite(${holder})` && arg.whenFalse.getText(sf) === "0";
  let tick: ts.VariableDeclaration | undefined;
  for (let n: ts.Node | undefined = setter; n; n = n.parent) if (ts.isVariableDeclaration(n)) { tick = n; break; }
  const tickName = tick && ts.isIdentifier(tick.name) ? tick.name.text : null;
  const effectBody = tick?.parent?.parent?.parent;
  const stmts = effectBody && ts.isBlock(effectBody) ? [...effectBody.statements] : [];
  const returnsHere = (s: ts.Node): boolean => {
    let r = false;
    const go = (n: ts.Node) => { if (ts.isReturnStatement(n)) r = true; else if (!ts.isFunctionLike(n)) ts.forEachChild(n, go); };
    go(s);
    return r;
  };
  const firstRun = stmts.findIndex((s) => ts.isExpressionStatement(s) && s.expression.getText(sf) === `${tickName}()`);
  const firstReturn = stmts.findIndex(returnsHere);
  ok("3.withdrawn · an instant withdrawn while the button is mounted zeroes the countdown: the one setter answers 0 when there is no instant, and the effect runs it before it can return",
    zeroes && tickName !== null && firstRun >= 0 && (firstReturn < 0 || firstRun < firstReturn),
    j({ zeroes, setArg, tick: tickName, firstRun, firstReturn }));

  const initOf = (name: string) => {
    const out: string[] = [];
    walkTree(sf, (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) out.push(n.initializer.getText(sf));
    });
    return out;
  };
  const inGrace = initOf("inGrace");
  ok("3.state · the free/fee state is that countdown and nothing else — inGrace is `graceRemainMs > 0`, with no second clock beside it",
    inGrace.length === 1 && inGrace[0] === "graceRemainMs > 0", j(inGrace));
  const gMin = initOf("graceMin");
  const gSec = initOf("graceSec");
  const gLabel = initOf("graceLabel");
  const fromCountdown = (s: string[]) => s.length === 1 && s[0].includes("graceRemainMs") && !s[0].includes("Date") && !s[0].includes("freeUntil");
  ok("3.label · the m:ss label reads the SAME countdown as the state: its minutes and seconds come from graceRemainMs, and from no clock of their own",
    fromCountdown(gMin) && fromCountdown(gSec) && gLabel.length === 1 && gLabel[0].includes("graceMin") && gLabel[0].includes("graceSec"),
    j({ gMin, gSec, gLabel }));
  ok("3.render · the strip draws that label only while the state holds, and the button's free label reads the same state (the classic markup, unchanged)",
    code.includes("{inGrace && !closedNow && (") && code.includes("{graceLabel}") && code.includes(": inGrace ? t.common.freeExitLabel"));
  // ⭐ S6 WP10 · THE JOURNEY'S FREE OFFER is that countdown, narrowed by the server's own pricing — never the instant
  // alone, never the fee, never a clock of its own. Offered while the page priced the exit free and the countdown runs
  // (or has not yet run: the server's paint); lapsed the moment it has run out, so a default poll's locked exit and a paid
  // window's fee are never sold as free. `test:journey-tickets` §12 holds what the look draws under each.
  const offer = initOf("offerFree");
  const lapse = initOf("lapsed");
  ok("3.journey · the journey look's free offer is the countdown narrowed by the server's own pricing: offered while the page priced the exit free and the countdown runs — or has not yet run, on the server's paint — and lapsed the moment it has run out; nothing else decides it, and `mounted` is set once, by the look's own mount",
    occurrences(code, OFFER_FREE) === 1 && occurrences(code, LAPSED) === 1 && offer.length === 1 && lapse.length === 1
      && occurrences(code, MOUNTED) === 1 && occurrences(code, MOUNT_EFFECT) === 1 && occurrences(code, "setMounted(") === 1
      && props.includes("pricedFree"),
    j({ offer, lapse, mounted: occurrences(code, MOUNTED), mountEffect: occurrences(code, MOUNT_EFFECT), setMounted: occurrences(code, "setMounted(") }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §4 · THE WIRING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
function g4Wiring(W: World) {
  say(`${NL}§4 · the wiring`);
  ok("4.wired · test:sell-grace-truth runs this file and is in predeploy; red:sell-grace-truth runs it with --prove-red",
    W.scripts["test:sell-grace-truth"] === "tsx scripts/sell-grace-truth.test.mts"
      && W.scripts["red:sell-grace-truth"] === "tsx scripts/sell-grace-truth.test.mts --prove-red"
      && (W.scripts.predeploy ?? "").includes("npm run test:sell-grace-truth && "),
    j({ test: W.scripts["test:sell-grace-truth"], red: W.scripts["red:sell-grace-truth"] }));
}

async function runAll(I: Impl, W: World) {
  await g1Server(I);
  g2Hosts(W);
  g3Button(W);
  g4Wiring(W);
}

if (!PROVE_RED) {
  await runAll(REAL, WORLD);
  const fails = results.filter((r) => !r.ok);
  const passes = results.length - fails.length;
  console.log(`${NL}sell-grace-truth: ${passes} passed, ${fails.length} failed`);
  if (passes === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RED TWIN — every plant must be caught by the check named for it
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
type Plant = { name: string; expect: string[]; impl?: Partial<Impl>; world?: (w: World) => World };
const inFile = (w: World, rel: string, from: string, to: string): World => {
  const files = new Map(w.files);
  files.set(rel, (files.get(rel) ?? "").split(from).join(to));
  return { ...w, files };
};
const withFile = (w: World, rel: string, code: string): World => {
  const files = new Map(w.files);
  files.set(rel, code);
  return { ...w, files };
};
/** The real reading with exactly ONE input or step swapped, so each §1 plant is one defect and nothing else. */
type Variant = {
  grace?: (cfg: ReturnType<typeof SVC.ratesFor>) => number;
  closesAtMs?: (m: Market) => number;
  anyGrace?: boolean;
  noWindow?: (placedAtMs: number) => string | null;
  endMs?: (placedAtMs: number, graceMs: number, windowMs: number) => number;
};
const variant = (v: Variant) => (p: Position, m: Market): string | null => {
  const cfg = SVC.ratesFor(m);
  const placedAtMs = p.placedAt ? Date.parse(p.placedAt) : Date.now();
  const f = exitWindowFacts({
    placedAtMs,
    closesAtMs: v.closesAtMs ? v.closesAtMs(m) : Date.parse(m.selectionClosedAt ?? m.resolutionAt),
    freeExitGraceMinutes: v.grace ? v.grace(cfg) : cfg.freeExitGraceMinutes,
    paidExitWindowMinutes: cfg.paidExitWindowMinutes,
  });
  const open = v.anyGrace ? f.graceMs > 0 : f.hadRunway;
  if (!open) return v.noWindow ? v.noWindow(placedAtMs) : null;
  return new Date(v.endMs ? v.endMs(placedAtMs, f.graceMs, f.windowMs) : placedAtMs + f.graceMs).toISOString();
};
const HOST_CALL = "freeUntil={freeExitEndsAt({ placedAt: p.placedAt }, m)}";
/** S6 WP10 — the journey card binds the instant once, and hands its clock reading beside it. */
const CARD_BINDING = "const freeUntil = freeExitEndsAt({ placedAt: p.placedAt }, m);";
const CARD_LABEL = "freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}";
const FREE_END = "const freeEndTs = freeUntil ? Date.parse(freeUntil) : NaN;";
const FREE_END_GUARD = "    if (!Number.isFinite(freeEndTs)) return;";
const PLANTS: Plant[] = [
  // §1 — the server's instant
  { name: "the frozen grace is ignored (the platform default, five minutes, for every poll)", expect: ["1.grid", "1.named"],
    impl: { freeExitEndsAt: variant({ grace: () => DEFAULT_FREE_EXIT_GRACE_MINUTES }) } },
  { name: "the runway rule is dropped (a bet placed too late is promised a free window)", expect: ["1.grid", "1.none"],
    impl: { freeExitEndsAt: variant({ anyGrace: true }) } },
  { name: "no window answers with the placement instant, so a clock behind the bet reads 'free'", expect: ["1.grid", "1.none"],
    impl: { freeExitEndsAt: variant({ noWindow: (placedAtMs) => new Date(placedAtMs).toISOString() }) } },
  { name: "the window is measured to resolution, not to selection close", expect: ["1.grid", "1.close"],
    impl: { freeExitEndsAt: variant({ closesAtMs: (m) => Date.parse(m.resolutionAt) }) } },
  { name: "the instant ends with the PAID window (free + paid), not the free one", expect: ["1.grid", "1.named"],
    impl: { freeExitEndsAt: variant({ endMs: (placedAtMs, _graceMs, windowMs) => placedAtMs + windowMs }) } },
  { name: "the instant is read off the clock (now + grace) instead of the placement", expect: ["1.clock", "1.grid"],
    impl: { freeExitEndsAt: variant({ endMs: (_placedAtMs, graceMs) => Date.now() + graceMs }) } },
  // §2 — the hosts
  { name: "the market page stops passing the server's instant", expect: ["2.passes"],
    world: (w) => inFile(w, MARKET, HOST_CALL, "") },
  { name: "/positions builds the instant in JSX from the placement and a constant", expect: ["2.passes"],
    world: (w) => inFile(w, POSITIONS, HOST_CALL, "freeUntil={new Date(Date.parse(p.placedAt) + 5 * 60_000).toISOString()}") },
  { name: "/positions asks the helper about an instant made at render time, not the bet's placement", expect: ["2.passes"],
    world: (w) => inFile(w, POSITIONS, HOST_CALL, "freeUntil={freeExitEndsAt({ placedAt: new Date().toISOString() }, m)}") },
  { name: "the market page asks the helper about a market with its frozen rates stripped", expect: ["2.passes"],
    world: (w) => inFile(w, MARKET, HOST_CALL, "freeUntil={freeExitEndsAt({ placedAt: p.placedAt }, { ...m, feeSnapshot: null })}") },
  { name: "the market page hands SellButton the placement again", expect: ["2.no-placed"],
    world: (w) => inFile(w, MARKET, HOST_CALL, `${HOST_CALL}${NL}placedAt={p.placedAt}`) },
  { name: "a client component renders SellButton (the instant would be computed in the browser)", expect: ["2.server"],
    world: (w) => withFile(w, "src/components/markets/zz-planted-sell-host.tsx", [
      `"use client";`,
      `import { SellButton } from "./sell-button";`,
      `import { freeExitEndsAt } from "@/lib/server/market-service";`,
      `export function PlantedHost({ p, m }: { p: never; m: never }) {`,
      `  return <SellButton positionId="x" stake={1} value={1} freeUntil={freeExitEndsAt(p, m)} />;`,
      `}`,
    ].join(NL)) },
  { name: "the market page takes its instant from another module", expect: ["2.import"],
    world: (w) => inFile(w, MARKET, "import { cashOutValue, freeExitEndsAt, getMarket,", `import { freeExitEndsAt } from "@/lib/free-exit";${NL}import { cashOutValue, getMarket,`) },
  // §2 — the journey's ticket card (S6 WP9, WP10): a host in the open, held to the same call as the classic two, bound once
  { name: "the journey ticket card builds the instant from the placement and a constant", expect: ["2.passes"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_BINDING, "const freeUntil = new Date(Date.parse(p.placedAt) + 5 * 60_000).toISOString();") },
  { name: "the journey ticket card binds the instant with let (a later line could move it)", expect: ["2.passes"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_BINDING, CARD_BINDING.replace("const ", "let ")) },
  { name: "the journey ticket card hands a callback's own freeUntil, a parameter that shadows the binding (read by name alone, it would pass)", expect: ["2.passes"],
    world: (w) => inFile(inFile(w, JOURNEY_CARD, "<SellButton", "{[cutoffIso].map((freeUntil) => <SellButton key={freeUntil}"),
      JOURNEY_CARD, `${CARD_LABEL}${NL}          />`, `${CARD_LABEL}${NL}          />)}`) },
  { name: "the journey ticket card becomes a client component (the instant would be computed in the browser)", expect: ["2.server"],
    world: (w) => withFile(w, JOURNEY_CARD, `"use client";${NL}${w.files.get(JOURNEY_CARD) ?? ""}`) },
  { name: "the journey ticket card stops rendering SellButton (a journey reader could no longer sell)", expect: ["2.pop"],
    world: (w) => inFile(w, JOURNEY_CARD, "<SellButton", "<SellButtonGone") },
  // §2 — S6 WP10: the clock label beside the countdown is the one binding's own reading, made on the server
  { name: "the journey card's clock label names the selection cutoff, not the free window's end", expect: ["2.label"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_LABEL, "freeUntilLabel={formatClock(cutoffIso)}") },
  { name: "the journey card's clock label is built from the placement and a constant", expect: ["2.label"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_LABEL, "freeUntilLabel={formatClock(new Date(Date.parse(p.placedAt) + 5 * 60_000).toISOString())}") },
  { name: "the journey card formats its clock label the device's way", expect: ["2.label"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_LABEL, "freeUntilLabel={freeUntil ? new Date(freeUntil).toLocaleTimeString() : null}") },
  { name: "the journey card stops handing the clock label (its line would name no time)", expect: ["2.label"],
    world: (w) => inFile(w, JOURNEY_CARD, CARD_LABEL, "") },
  // §3 — the button
  { name: "GRACE_MS comes back and gates the free state again", expect: ["3.grace-ms"],
    world: (w) => inFile(
      inFile(w, SELL_BUTTON, "export function SellButton({", `const GRACE_MS = 5 * 60_000;${NL}export function SellButton({`),
      SELL_BUTTON, "const inGrace = graceRemainMs > 0;", "const inGrace = graceRemainMs > 0 && (closesAt ? Date.parse(closesAt) - Date.now() : Infinity) > GRACE_MS;") },
  { name: "the instant is computed client-side (the placement plus a grace the button picks)", expect: ["3.source"],
    world: (w) => inFile(w, SELL_BUTTON, FREE_END, `const freeEndTs = Date.parse(placedAt ?? "") + graceMinutes * 60_000;`) },
  { name: "the countdown runs from the server's render time plus a window the button keeps", expect: ["3.source"],
    world: (w) => inFile(w, SELL_BUTTON, FREE_END, "const freeEndTs = (serverNow ?? Date.now()) + freeWindowMs;") },
  { name: "a missing instant falls back to a window the button invents", expect: ["3.source"],
    world: (w) => inFile(w, SELL_BUTTON, FREE_END, "const freeEndTs = freeUntil ? Date.parse(freeUntil) : (serverNow ?? Date.now()) + freeWindowMs;") },
  { name: "a five-minute fallback is written in as a literal", expect: ["3.literal"],
    world: (w) => inFile(w, SELL_BUTTON, FREE_END, "const freeEndTs = freeUntil ? Date.parse(freeUntil) : Date.now() + 300_000;") },
  { name: "an instant withdrawn while the button is mounted freezes the strip (the effect returns before zeroing it)", expect: ["3.withdrawn"],
    world: (w) => inFile(w, SELL_BUTTON, `    update();${NL}${FREE_END_GUARD}`, `${FREE_END_GUARD}${NL}    update();`) },
  { name: "the free/fee state consults a second clock (the device's, against the cutoff)", expect: ["3.state"],
    world: (w) => inFile(w, SELL_BUTTON, "const inGrace = graceRemainMs > 0;", `const inGrace = graceRemainMs > 0 && Date.now() < Date.parse(closesAt ?? "");`) },
  { name: "the m:ss label reads a clock of its own", expect: ["3.label"],
    world: (w) => inFile(w, SELL_BUTTON, "const graceMin = Math.floor(graceRemainMs / 60_000);", `const graceMin = Math.floor((Date.parse(freeUntil ?? "") - Date.now()) / 60_000);`) },
  // §3 — S6 WP10: the journey's free offer is the countdown narrowed by the server's own pricing, and nothing else
  { name: "the journey's free offer is read off the free instant alone (it outlives the countdown)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, OFFER_FREE, "const offerFree = !!freeUntil;") },
  { name: "the journey's free offer is read off the fee (a free price outlives the free window)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, OFFER_FREE, "const offerFree = fee <= 0;") },
  { name: "the journey's free offer ignores the countdown (offered for as long as the page's price was free)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, OFFER_FREE, "const offerFree = pricedFree === true;") },
  { name: "the journey's lapse is read off the fee (a no-fee paid window would never come back)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSED, "const lapsed = fee <= 0 && !inGrace;") },
  { name: "the journey's mount flag waits on a timer, not the first commit (the server's paint outstays the countdown)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, MOUNT_EFFECT, "useEffect(() => { if (journey) setTimeout(() => setMounted(true), 5_000); }, [journey]);") },
  // §4 — the wiring
  { name: "the suite drops out of predeploy", expect: ["4.wired"],
    world: (w) => ({ ...w, scripts: { ...w.scripts, predeploy: (w.scripts.predeploy ?? "").split("npm run test:sell-grace-truth && ").join("") } }) },
];

{
  quiet = true;
  results = [];
  await runAll(REAL, WORLD);
  const cleanFails = results.filter((r) => !r.ok);
  if (cleanFails.length) {
    console.log(`INCONCLUSIVE: the clean run already fails (${cleanFails[0].label} — ${cleanFails[0].detail})`);
    process.exit(1);
  }
  const sameWorld = (a: World, b: World) =>
    a.files.size === b.files.size && [...b.files].every(([k, v]) => a.files.get(k) === v)
    && a.rawSellButton === b.rawSellButton && j(a.scripts) === j(b.scripts);
  let caught = 0;
  for (const plant of PLANTS) {
    results = [];
    const impl: Impl = { ...REAL, ...(plant.impl ?? {}) };
    const world = plant.world ? plant.world(WORLD) : WORLD;
    const planted = !!plant.impl || !sameWorld(WORLD, world);
    await runAll(impl, world);
    const fired = results.some((r) => !r.ok && plant.expect.some((p) => r.label.startsWith(p)));
    if (planted && fired) caught++;
    // A blind plant says what failed in its place, so the check that missed is found without a re-run.
    const failed = results.filter((r) => !r.ok).map((r) => r.label.split(" · ")[0]);
    const why = !planted || fired ? ""
      : failed.length === 0 ? " — NOTHING failed: the gate cannot see this defect" : ` — failed instead: ${failed.slice(0, 2).join(" | ")}`;
    console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${plant.name}${why}`);
  }
  console.log(`${NL}${caught}/${PLANTS.length} caught`);
  process.exit(caught === PLANTS.length ? 0 : 1);
}
