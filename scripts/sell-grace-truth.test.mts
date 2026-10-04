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
 *      time built beside it — and the journey's card hands one (2.label). Every SellButton is handed `pricedFree`, read
 *      strictly (`=== true`), and the two pages that price an exit hand `cashOutValue`'s own `inGracePeriod` for an open
 *      exit on a LIVE question, off the very `co` that priced it, each expression pinned whole (S6 A8b, 2.priced).
 *      Since S6 A8e every SellButton is handed `serverNow`, the server's instant of its render — `Date.now()`, the one
 *      const the file binds to it, or a required number prop (2.now) — and each page that draws them draws its
 *      RefreshPoller before them, so the one ask a restored page makes as it mounts finds the poller listening (2.poller).
 *   §3 THE BUTTON — `sell-button.tsx` as a syntax tree: no `GRACE_MS`, no five-minute constant, nothing multiplied
 *      out of minutes; the countdown's one time source is `Date.parse(freeUntil)`, parsed once (memoised since S6 A8e),
 *      an instant that is withdrawn zeroes it, and the free/fee state and the m:ss label both read that countdown and
 *      nothing else but the server's own verdicts. In the journey's look (S6 WP10) the free offer is that countdown
 *      narrowed by the server's own pricing (`pricedFree`), lapsed the moment it has run out (3.journey). Since S6 A8b
 *      the lapse is both looks': one effect, pinned whole, that names no look; the verdict declared once above the
 *      journey's look; and today's button reading it — nothing to press, 'Inapakia…' for its words and its spoken name,
 *      no figure — and reading the server's shut verdict, never the phone's clock alone (3.classic). Since S6 A8e the
 *      countdown's first value is the server's, from the props alone, so the server's paint and every first render draw
 *      the arm the countdown then keeps (3.first); a price the page priced with a fee is never drawn free (3.state); and a
 *      render brought back by Back or Forward is no offer until a fresh one arrives (3.restore): the record of the renders
 *      this tab has drawn lives at module level, declared once and counted by one effect; a button reads it at its first
 *      render and in every render that hands it a new serverNow; one owner makes the restore's one ask, claimed above the
 *      lapse effect; and the answer that ends a restore re-arms the ask.
 *   §4 THE WIRING — this suite is in predeploy and its red twin is declared; and (S6 A8e) the router premise the restore
 *      read rests on: next.config.ts turns on no cacheComponents, so Back or Forward mounts a page again (4.premise).
 *   §5 THE FIT (S6 A8b) — a static model of today's button row, from the repo's own font files (the body's alternates
 *      included), stylesheet, pages and words: on a 320 phone (below Tailwind's `xs`) the free row on /positions holds
 *      one line inside the button's content and every other row one line inside the button, in en, sw and zh, for every
 *      stake and fee rate on a grid to the platform's maximum; in the question page's holder block no label grows taller
 *      than the button; and the model sees the defect it was written for (the Swahili free row a browser measured too
 *      wide at 320 before A8b) and the measured fit from 360.
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
const { DEFAULT_FREE_EXIT_GRACE_MINUTES, PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } = await import("../src/lib/payout.ts");
// S6 A8b · §5's model draws the row with the product's own number format and words.
const { formatNumber } = await import("../src/lib/utils.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");

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
/** S6 A8b — the page gutter both classic hosts sit in, which §5 reads. */
const PAGE_CONTAINER = "src/components/layout/page-container.tsx";
/** S6 A8e — Tiketi zangu's page body, which draws the journey's ticket cards and its RefreshPoller (2.poller). */
const TICKETS_VIEW = "src/components/journey/tickets/tickets-view.tsx";
/** S6 A8e — read beside src for the router premise the restore read rests on (4.premise). */
const NEXT_CONFIG = "next.config.ts";
const readRaw = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8").split(CR).join("");
/** S6 A8b · §5 also reads the stylesheet, the Tailwind config and the three languages' words, so a plant can move each. */
type World = {
  files: Map<string, string>; rawSellButton: string; scripts: Record<string, string>;
  css: string; tw: string; words: Record<string, unknown>;
};
const WORLD: World = {
  files: new Map([...srcFiles(), NEXT_CONFIG].map((rel) => [rel, decomment(readRaw(rel))])),
  rawSellButton: readRaw(SELL_BUTTON),
  scripts: (JSON.parse(readRaw("package.json")) as { scripts: Record<string, string> }).scripts,
  css: readRaw("src/app/globals.css"),
  tw: readRaw("tailwind.config.ts"),
  words: { en: dict.en, sw: dict.sw, zh: dict.zh },
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
  els: Array<{ line: number; passes: boolean; placed: boolean; spread: boolean; label: "none" | "ok" | "bad"; priced: boolean; now: "ok" | "missing" | "bad" }>;
};
/** S6 A8e — each page that draws Sell buttons, and the element they sit in there: its RefreshPoller must come first. */
const POLLER_FIRST: ReadonlyArray<readonly [string, string]> = [[POSITIONS, "<SellButton"], [MARKET, "<SellButton"], [TICKETS_VIEW, "<TicketCard"]];
/**
 * S6 A8b — the two pages that price an exit, each handing its Sell button the verdict `cashOutValue` priced it with, for
 * an open exit on a LIVE question: [the file, the flag as its element reads it, the flag's own expression, whole — so no
 * clause can be added to either end of it]. The journey's ticket card reads `/positions`' own prices
 * (`test:journey-tickets` 9.look pins its element).
 */
const PRICED_FROM: ReadonlyArray<readonly [string, string, string]> = [
  [POSITIONS, "pricedFree={price?.free === true}", "free: sellable && co.inGracePeriod };"],
  [MARKET, "pricedFree={positionPricedFree.get(p.id) === true}", `positionPricedFree.set(p.id, m.status === "LIVE" && co.sellable && co.inGracePeriod);`],
];
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
/**
 * S6 A8e — the server's instant of a render, as a host hands it: a name the file binds once, to `Date.now()` in a const,
 * or as a prop its component is handed as a REQUIRED number (so every page that draws the component must hand one).
 */
function nowBinding(sf: ts.SourceFile, name: string): "ok" | "bad" {
  const sites = bindingSites(sf, name);
  const only = sites.length === 1 ? sites[0] : undefined;
  if (only && ts.isVariableDeclaration(only)) {
    const list = only.parent;
    return ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0 && only.initializer?.getText(sf) === "Date.now()" ? "ok" : "bad";
  }
  if (only && ts.isBindingElement(only) && ts.isObjectBindingPattern(only.parent) && ts.isParameter(only.parent.parent)) {
    const type = only.parent.parent.type;
    const member = type && ts.isTypeLiteralNode(type) ? type.members.find((m) => ts.isPropertySignature(m) && m.name.getText(sf) === name) : undefined;
    return !!member && ts.isPropertySignature(member) && !member.questionToken && member.type?.getText(sf) === "number" ? "ok" : "bad";
  }
  return "bad";
}
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
    let priced = false;
    let now: "ok" | "missing" | "bad" = "missing";
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
      // S6 A8b · the page's own verdict that it priced the exit inside its free window, read strictly (`… === true`).
      if (name === "pricedFree") {
        const init = a.initializer;
        const expr = init && ts.isJsxExpression(init) ? init.expression : undefined;
        priced = !!expr && ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
          && expr.right.kind === ts.SyntaxKind.TrueKeyword;
      }
      // S6 A8e · the server's instant of the render: `Date.now()` in the attribute, or a name bound to it (nowBinding).
      if (name === "serverNow") {
        const init = a.initializer;
        const expr = init && ts.isJsxExpression(init) ? init.expression : undefined;
        now = !expr ? "bad" : expr.getText(sf) === "Date.now()" ? "ok" : ts.isIdentifier(expr) ? nowBinding(sf, expr.text) : "bad";
      }
    }
    const label = !labelled ? "none" : bound !== null && isClockOf(sf, labelExpr, bound) ? "ok" : "bad";
    els.push({ line: lineOf(sf, n), passes, placed, spread, label, priced, now });
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
  // ⭐ S6 A8b · the free-price flag is every host's: a host that never says its price is the free window's leaves today's
  // button offering that price after its countdown has run out, until the page's next refresh.
  const unpriced = hosts.flatMap((h) => h.els.filter((e) => !e.priced).map((e) => `${h.rel}:${e.line}`));
  const unsourced = PRICED_FROM.filter(([rel, element, source]) => {
    const file = W.files.get(rel) ?? "";
    return occurrences(file, element) !== 1 || occurrences(file, source) !== 1;
  }).map(([rel]) => rel);
  ok("2.priced · every SellButton is handed pricedFree, read strictly (=== true), so a free price its countdown has outlived is withdrawn on every host (S6 A8b) — and the two pages that price an exit hand cashOutValue's own inGracePeriod for an open exit on a LIVE question, off the very `co` that priced it, each expression whole",
    hosts.length > 0 && unpriced.length === 0 && unsourced.length === 0, j({ unpriced, unsourced }));
  // ⭐ S6 A8e · the countdown's first value and the record of the renders a tab has drawn both read the server's instant
  // of the render: a button handed none would serve a free price as 'Inapakia…', ask at every mount, and never see a
  // render brought back by Back or Forward.
  const nowless = hosts.flatMap((h) => h.els.filter((e) => e.now !== "ok").map((e) => `${h.rel}:${e.line} (${e.now})`));
  ok("2.now · every SellButton is handed serverNow, the server's instant of its render — `Date.now()` in the attribute, the one const the file binds to it, or a required number prop the host is itself handed — which the countdown's first value and the record of drawn renders read (S6 A8e)",
    hosts.length > 0 && nowless.length === 0, j(nowless));
  // ⭐ S6 A8e · a restored page's one ask is made by a Sell button's effect in the flush that mounts the page, so the
  // page's RefreshPoller must already be listening: React runs a page's effects in its order, so the poller is drawn
  // before the buttons (or the cards that hold them).
  const pollerLate = POLLER_FIRST.filter(([rel, list]) => {
    const file = W.files.get(rel) ?? "";
    const at = file.indexOf("<RefreshPoller");
    return at < 0 || file.indexOf(list) < 0 || at > file.indexOf(list);
  }).map(([rel]) => rel);
  ok("2.poller · each page that draws Sell buttons — /positions, the question page and Tiketi zangu — draws its RefreshPoller before them, so the one ask a restored page makes as it mounts finds the poller listening (S6 A8e)",
    pollerLate.length === 0, j(pollerLate));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §3 · THE BUTTON
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * S6 WP10 — the journey look's free offer and its lapse: each the countdown, narrowed by the server's own pricing
 * (`pricedFree`, cashOutValue's `inGracePeriod` as the page priced the exit). Since S6 A8e the countdown has its value from
 * the first render, the server's own (3.first), so no mount flag holds anything back until a commit: the server's paint
 * draws the offer the countdown then keeps, and a restored render (`stale`, 3.restore) lapses as a run-out one does.
 */
const OFFER_FREE = "const offerFree = pricedFree === true && inGrace;";
const LAPSED = "const lapsed = (pricedFree === true && !inGrace) || stale;";
/**
 * S6 A8e — the countdown's first value is the server's: the time the instant had left at the server's own render, from
 * the props alone (the one parse and `serverNow`), never a clock of this device, so the server's paint and the hydrating
 * render read one value and draw one arm. The clock that recalibrates it re-runs on that parse and on `serverNow`.
 */
const FIRST_VALUE = "const [graceRemainMs, setGraceRemainMs] = useState<number>(() => (Number.isFinite(freeEndTs) && serverNow != null ? Math.max(0, freeEndTs - serverNow) : 0));";
const CLOCK_DEPS = "}, [freeEndTs, serverNow]);";
/**
 * S6 A8e — the free/fee state: the countdown, never against the server's own verdicts — not once the page has priced the
 * exit with a fee (`pricedFree !== false`: a host that passes no flag reads the countdown alone), and not for a restored
 * render (`!stale`).
 */
const IN_GRACE = "const inGrace = graceRemainMs > 0 && pricedFree !== false && !stale;";
/**
 * S6 A8e — a render brought back by Back or Forward is no offer until a fresh one arrives. The record of the renders this
 * tab's Sell buttons have drawn (`position@serverNow`, each counted while a button draws it, kept uncounted after) lives
 * at module level, declared once (MODULE_STATE, read off the syntax tree: a record made inside the component would be a
 * new, empty one every render); only its one effect writes it, after a commit (never on the server, never by a first
 * load's own renders); a button reads it at its first render and in every render that hands it a new serverNow, so a
 * Back or Forward that keeps the page's buttons mounted is read too (REREAD); a fresh render ends the restore in an effect
 * and re-arms the ask; and one owner, claimed above the lapse effect by the first of the buttons that can sell, makes the
 * restore's one ask (CLAIM).
 */
const RESTORE = [
  "const drawnRenders = new Map<string, number>();",
  "const DRAWN_KEPT = 512;",
  "const renderKey = (positionId: string, serverNow: number) => `${positionId}@${serverNow}`;",
  "let restoreAsker: object | null = null;",
  "const [restoredAt, setRestoredAt] = useState<number | null>(() => restoredOf(positionId, serverNow));",
  "const [drawnNow, setDrawnNow] = useState(serverNow);",
  "const stale = restoredAt !== null;",
  "const restoreAsk = useRef<number | null>(null);",
];
/** [name, how the file declares it directly in its body, its initializer]: the module-level state the restore reads. */
const MODULE_STATE: ReadonlyArray<readonly [string, string, string]> = [
  ["drawnRenders", "const", "new Map<string, number>()"], ["DRAWN_KEPT", "const", "512"], ["restoreAsker", "let", "null"],
];
/** How often each name the restore rests on is written in the code, declarations included: a second writer shows here. */
const RESTORE_NAMES: ReadonlyArray<readonly [string, number]> = [["drawnRenders", 9], ["restoreAsker", 6], ["restoredOf", 3], ["setRestoredAt", 3]];
const RESTORED_OF = [
  "const restoredOf = (positionId: string, serverNow: number | undefined) =>",
  "serverNow != null && drawnRenders.get(renderKey(positionId, serverNow)) === 0 ? serverNow : null;",
].join("");
const REREAD = [
  "if (serverNow !== drawnNow) {",
  "setDrawnNow(serverNow);",
  "const back = restoredOf(positionId, serverNow);",
  "if (back !== null) setRestoredAt(back);",
  "}",
].join("");
const RECORD = [
  "useEffect(() => {",
  "if (serverNow == null) return;",
  "const key = renderKey(positionId, serverNow);",
  "drawnRenders.set(key, (drawnRenders.get(key) ?? 0) + 1);",
  "for (const [k, live] of drawnRenders) {",
  "if (drawnRenders.size <= DRAWN_KEPT) break;",
  "if (live === 0) drawnRenders.delete(k);",
  "}",
  "return () => { drawnRenders.set(key, (drawnRenders.get(key) ?? 1) - 1); };",
  "}, [positionId, serverNow]);",
].join("");
const RESTORE_ENDS = [
  "useEffect(() => {",
  "if (restoredAt === null || serverNow === restoredAt) return;",
  "lapseArmed.current = true;",
  "setRestoredAt(null);",
  "}, [serverNow, restoredAt]);",
].join("");
const CLAIM = [
  "useEffect(() => {",
  "if (restoredAt === null || closedNow || alreadyClosed) return;",
  "if (restoreAsker !== null && restoreAsker !== restoreAsk) { lapseArmed.current = false; return; }",
  "restoreAsker = restoreAsk;",
  "if (restoreAsk.current !== restoredAt) { restoreAsk.current = restoredAt; lapseArmed.current = true; }",
  "return () => { if (restoreAsker === restoreAsk) restoreAsker = null; };",
  "}, [restoredAt, closedNow, alreadyClosed]);",
].join("");
const occurrences = (s: string, x: string) => s.split(x).length - 1;
/** Each line trimmed and the lines joined, so a check reads the code and not its layout (`test:journey-tickets`' own). */
const squash = (s: string) => s.split(NL).map((l) => l.trim()).join("");
/**
 * S6 A8b — today's look withdraws a lapsed free price too. The one lapse effect is pinned WHOLE — its opening, the ask line
 * by line, its dependencies — so it names no look and nothing can be added before, inside or after the ask; the verdict is
 * declared once ABOVE the journey's look, so both returns read it; today's return reads it four times (nothing to press,
 * 'Inapakia…' for its words and its spoken name — 'Inauza…' while a sale is in flight — and no figure); and today's return
 * reads the server's shut verdict from its first render (`shutNow`; since S6 A8e the server's paint draws it too), so a
 * refresh that brings it is never drawn as one pressable 'Uza sasa · TZS 0' render, and reads the phone's clock nowhere
 * else. Since S6 A8e the effect's guard is the shut verdicts alone, the price it withdraws is `lapsed` (a run-out free
 * price, or any price of a restored render), and it runs again whenever a restore begins or ends (`restoredAt`).
 */
const LAPSE_GUARD = "if (closedNow || alreadyClosed) return;";
const LAPSE_DEPS = "}, [lapsed, inGrace, restoredAt, closedNow, alreadyClosed, pending]);";
const LAPSE_EFFECT = [
  "useEffect(() => {",
  LAPSE_GUARD,
  "if (inGrace) { lapseArmed.current = true; return; }",
  "if (!lapsed) return;",
  "if (!pending) setConfirmOpen(false);",
  "if (!lapseArmed.current) return;",
  "lapseArmed.current = false;",
  `window.dispatchEvent(new Event("50pick:refresh"));`,
  LAPSE_DEPS,
].join("");
const CLASSIC_HEAD = `const btnVariant = "btn-primary";`;
const SHUT_NOW = "const shutNow = closedNow || alreadyClosed === true;";
/**
 * ⭐ S6 A8c — and a price the server refused because it moved waits the same way, ahead of a sale in flight (`repricing`,
 * set by that refusal and cleared when the refreshed page is drawn): nothing to press, 'Inapakia…' for its words and its
 * spoken name, no figure — re-pinned in the open, each read a plant below removes.
 */
const CLASSIC_LAPSE = [
  "disabled={pending || shutNow || lapsed || repricing}",
  "aria-label={shutNow? t.common.sellLockedHint: repricing? t.common.loading: lapsed? (pending ? t.common.selling : t.common.loading): inGrace?",
  "{shutNow ? t.common.sellLocked: repricing ? t.common.loading: pending ? t.common.selling: lapsed ? t.common.loading: inGrace ? t.common.freeExitLabel: t.common.sellNow}",
  "{!shutNow && !lapsed && !repricing && (",
];

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
  // S6 A8e · …bound to a const directly, or memoised once, `useMemo(() => (<it>), [freeUntil])`, so the countdown's first
  // value and its clock read one parse, made again only when the instant itself changes.
  const outOf = (n: ts.Node | undefined): ts.Node | undefined => (n && ts.isParenthesizedExpression(n) ? outOf(n.parent) : n);
  const lambda = guarded && guard ? outOf(guard.parent) : undefined;
  const memo = lambda && ts.isArrowFunction(lambda) && lambda.parent && ts.isCallExpression(lambda.parent)
    && lambda.parent.expression.getText(sf) === "useMemo" && lambda.parent.arguments.length === 2 && lambda.parent.arguments[0] === lambda
    && lambda.parent.arguments[1].getText(sf) === "[freeUntil]" ? lambda.parent : undefined;
  const decl = memo ? memo.parent : guarded && guard ? guard.parent : undefined;
  const holder = decl && ts.isVariableDeclaration(decl) && (decl.initializer === guard || (!!memo && decl.initializer === memo)) && ts.isIdentifier(decl.name) ? decl.name.text : null;
  const setters = calls("setGraceRemainMs");
  const setter = setters.length === 1 && setters[0].arguments.length === 1 ? setters[0] : undefined;
  const setArg = setter ? setter.arguments[0].getText(sf) : "";
  const props: string[] = [];
  walkTree(sf, (n) => { if (ts.isPropertySignature(n)) props.push(n.name.getText(sf)); });
  ok("3.source · the countdown's ONE time source is the server's instant: freeUntil is a prop, parsed exactly once (no instant is NaN; memoised since S6 A8e, so the countdown's first value and its clock read one parse) into the value the one setGraceRemainMs call counts down to (server-calibrated); the placement is not read, and nothing is parsed but freeUntil and the selection cutoff",
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
  ok("3.state · the free/fee state is that countdown and, since S6 A8e, the server's own verdicts — inGrace is `graceRemainMs > 0`, never once the page has priced the exit with a fee (`pricedFree !== false`, so a refresh bringing a paid price is drawn paid in that commit; a host passing no flag reads the countdown alone) and never for a restored render (`!stale`) — with no second clock beside it",
    inGrace.length === 1 && inGrace[0] === IN_GRACE.slice("const inGrace = ".length, -1) && occurrences(code, IN_GRACE) === 1, j(inGrace));
  const gMin = initOf("graceMin");
  const gSec = initOf("graceSec");
  const gLabel = initOf("graceLabel");
  const fromCountdown = (s: string[]) => s.length === 1 && s[0].includes("graceRemainMs") && !s[0].includes("Date") && !s[0].includes("freeUntil");
  ok("3.label · the m:ss label reads the SAME countdown as the state: its minutes and seconds come from graceRemainMs, and from no clock of their own",
    fromCountdown(gMin) && fromCountdown(gSec) && gLabel.length === 1 && gLabel[0].includes("graceMin") && gLabel[0].includes("graceSec"),
    j({ gMin, gSec, gLabel }));
  ok("3.render · the strip draws that label only while the state holds and the exit is not shut (S6 A8b: by the shut verdict today's button reads, shutNow), nor while a price the server refused because it moved waits for the server (S6 A8c, repricing), and the button's free label reads the same state",
    code.includes("{inGrace && !shutNow && !repricing && (") && code.includes("{graceLabel}") && code.includes(": inGrace ? t.common.freeExitLabel"));
  // ⭐ S6 WP10 · THE JOURNEY'S FREE OFFER is that countdown, narrowed by the server's own pricing — never the instant
  // alone, never the fee, never a clock of its own. Offered while the page priced the exit free and the countdown runs,
  // from the server's paint on (S6 A8e: the countdown's first value is the server's, so no mount flag is left); lapsed
  // the moment it has run out, so a default poll's locked exit and a paid window's fee are never sold as free.
  // `test:journey-tickets` §12 holds what the look draws under each.
  const offer = initOf("offerFree");
  const lapse = initOf("lapsed");
  ok("3.journey · the journey look's free offer is the countdown narrowed by the server's own pricing: offered while the page priced the exit free and the countdown runs, from the server's paint on — the countdown's first value is the server's, so no mount flag holds anything back (S6 A8e) — and lapsed the moment it has run out, or while a restored render waits for a fresh one; nothing else decides it",
    occurrences(code, OFFER_FREE) === 1 && occurrences(code, LAPSED) === 1 && offer.length === 1 && lapse.length === 1
      && !ids.has("mounted") && !ids.has("setMounted") && props.includes("pricedFree"),
    j({ offer, lapse, mountFlag: ids.has("mounted") || ids.has("setMounted") }));
  // ⭐ S6 A8b · TODAY'S LOOK WITHDRAWS A LAPSED FREE PRICE TOO, AND DRAWS THE SERVER'S SHUT VERDICT FROM ITS FIRST COMMIT.
  // Until A8b it turned that price into 'Uza sasa · TZS 3,600 −0 ada' until the page's next refresh, its confirm said
  // 'Hakuna ada' while the server charged the fee, and the server's 'shut' answer was first drawn as one pressable
  // 'Uza sasa · TZS 0 −3,600 ada' render while an effect copied it into the clock's state.
  const flat = squash(code);
  const classic = squash(code.slice(Math.max(0, code.indexOf(CLASSIC_HEAD))));
  const lapseAt = code.indexOf(LAPSED);
  const lookAt = code.indexOf("if (journey) {");
  const missing = CLASSIC_LAPSE.filter((x) => occurrences(classic, x) !== 1);
  ok("3.classic · today's look withdraws a lapsed free price too (S6 A8b): the one lapse effect is exactly the ask — no look named, nothing added — the verdict is declared once, above the journey's look, and today's button reads it (nothing to press, 'Inapakia…' for its words and its spoken name, no figure); and it draws the server's shut verdict from its first render (shutNow: a prop, so since S6 A8e the server's paint says it too), reading the phone's clock nowhere else",
    code.includes(CLASSIC_HEAD) && occurrences(flat, LAPSE_EFFECT) === 1 && occurrences(code, LAPSED) === 1 && lapseAt >= 0 && lookAt > lapseAt
      && occurrences(classic, SHUT_NOW) === 1 && occurrences(classic, "closedNow") === 1
      && missing.length === 0,
    j({ effect: occurrences(flat, LAPSE_EFFECT), lapseAt, lookAt, shutNow: occurrences(classic, SHUT_NOW), clock: occurrences(classic, "closedNow"), missing }));
  // ⭐ S6 A8e · THE COUNTDOWN'S FIRST VALUE IS THE SERVER'S. Before A8e it started at 0, so inside the free window the
  // server's paint, the hydrating render and every later mount drew 'Uza sasa · TZS 3,600 −0 ada' with no strip, and the
  // strip arrived a commit later, pushing the button down (on a slow phone, seconds later). It now starts at the time the
  // instant had left at the server's own render, from the props alone — no clock of this device, which would make the
  // server's paint and the hydrating render disagree.
  ok("3.first · the countdown's first value is the server's (S6 A8e): useState starts from the time the instant had left at the server's own render — the one parse and serverNow, from the props alone, no clock of this device — so the server's paint and the browser's hydrating render read one value and draw one arm, and every mount starts on the arm the clock then keeps; that clock re-runs on the parse and on serverNow",
    occurrences(flat, FIRST_VALUE) === 1 && occurrences(code, "useState<number>(") === 1 && occurrences(flat, CLOCK_DEPS) === 1 && holder === "freeEndTs",
    j({ first: occurrences(flat, FIRST_VALUE), countdownStates: occurrences(code, "useState<number>("), clockDeps: occurrences(flat, CLOCK_DEPS), holder }));
  // ⭐ S6 A8e · A RENDER BROUGHT BACK BY BACK OR FORWARD IS NO OFFER. Next draws such a render again with its old props, so
  // its countdown ran from the old serverNow and its prices were as old as that render — a free offer the server had
  // ended was shown for up to one poll (the A8b drive measured 20.3 s on /positions). The record is read off the syntax
  // tree as well as the text: declared once, directly in the file's body (a record made in the component would be a new,
  // empty one at every render, and Back would never be read), and each name it rests on written exactly as often as the
  // code above writes it (a second writer — a cleanup that clears the record, say — shows in the count).
  const declaredAt = (name: string): string | null => {
    const sites = bindingSites(sf, name);
    const only = sites.length === 1 ? sites[0] : undefined;
    const list = only && ts.isVariableDeclaration(only) ? only.parent : undefined;
    const statement = list && ts.isVariableDeclarationList(list) ? list.parent : undefined;
    if (!only || !ts.isVariableDeclaration(only) || !only.initializer || !list || !statement || !ts.isVariableStatement(statement) || statement.parent !== sf) return null;
    return `${(list.flags & ts.NodeFlags.Const) !== 0 ? "const" : (list.flags & ts.NodeFlags.Let) !== 0 ? "let" : "var"} ${only.initializer.getText(sf)}`;
  };
  const written = (name: string) => { let n = 0; walkTree(sf, (x) => { if (ts.isIdentifier(x) && x.text === name) n++; }); return n; };
  const restore = RESTORE.filter((x) => occurrences(code, x) !== 1);
  const modular = MODULE_STATE.filter(([name, kind, init]) => declaredAt(name) !== `${kind} ${init}`).map(([name]) => `${name}: ${declaredAt(name)}`);
  const counts = RESTORE_NAMES.filter(([name, n]) => written(name) !== n).map(([name, n]) => `${name} ${written(name)}/${n}`);
  const claimAt = flat.indexOf(CLAIM);
  ok("3.restore · a render brought back by Back or Forward is no offer until a fresh one arrives (S6 A8e): the record of the renders this tab's Sell buttons have drawn (position@serverNow, counted while drawn, kept after) is declared once at module level and written only by its one effect — after a commit, so never on the server and never by a first load's own renders; a button reads it at its first render and in every render that hands it a new serverNow, so a Back between two addresses of one page is read too; a fresh render ends the restore and re-arms the ask; the restored render narrows the free state (3.state) and lapses (3.journey, 3.classic); and one owner, claimed above the lapse effect by the first of its buttons that can sell, makes the restore's one ask",
    restore.length === 0 && modular.length === 0 && counts.length === 0
      && occurrences(flat, RESTORED_OF) === 1 && occurrences(flat, REREAD) === 1 && occurrences(flat, RECORD) === 1
      && occurrences(flat, RESTORE_ENDS) === 1 && occurrences(flat, CLAIM) === 1 && claimAt >= 0 && claimAt < flat.indexOf(LAPSE_EFFECT),
    j({ restore, modular, counts, restoredOf: occurrences(flat, RESTORED_OF), reread: occurrences(flat, REREAD), record: occurrences(flat, RECORD),
      ends: occurrences(flat, RESTORE_ENDS), claim: occurrences(flat, CLAIM), claimAt, lapseAt: flat.indexOf(LAPSE_EFFECT) }));
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
  // ⭐ S6 A8e · the Sell button reads a render brought back by Back or Forward when the page mounts again (and when only the
  // address's query differs, in the render that brings it). With cacheComponents Next keeps earlier pages mounted and
  // hidden, and Back would show one with its old props and no render to read them in.
  const config = W.files.get(NEXT_CONFIG) ?? "";
  ok("4.premise · next.config.ts turns on no cacheComponents (nor its earlier name, dynamicIO), so Back or Forward mounts a page again and the Sell button reads a render brought back (S6 A8e)",
    config.includes("const config: NextConfig = {") && !config.includes("cacheComponents") && !config.includes("dynamicIO"),
    j({ read: config.length, cacheComponents: config.includes("cacheComponents"), dynamicIO: config.includes("dynamicIO") }));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §5 · THE FIT (S6 A8b)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * ⭐ TODAY'S FREE ROW HOLDS ONE LINE ON A 320 PHONE ON /positions, IN EVERY LANGUAGE, AND NOTHING IN THE ROW GROWS TALLER
 * THAN THE BUTTON — a static model of the row, mirroring how `test:journey-shell` 8.label.measure models the rail label
 * from its font's advance widths. Measured in a browser first (2026-10-03, classic /positions, the demo player's seeded
 * tickets): at 320 in Swahili the free row "Toka bila gharama · TZS 3,600 pesa yote" was 277px of text in the button's
 * 254px content, its end past the button's edge, while English and Chinese fitted, and every language fitted from 360.
 * A8b leaves the free note out below 360 (Tailwind's `xs`; the strip above it already says there is no fee) and moves
 * nothing else in the row: the label keeps one line at every width, as today. The row is the label, the button's gap,
 * then the figure and its note:
 *   · the label is Inter at the button's 600. The repo carries Inter's 500 and 700 (the report fonts); a weight between
 *     them draws no glyph wider than the wider of the two. Each glyph is also bounded by its alternates under the body's
 *     `font-feature-settings` (cv11's single-storey a is wider), read from the font's own substitutions, so the model
 *     holds whether or not the served font draws them (the measured row shows it draws the plain a today);
 *   · the figure and its note are JetBrains Mono, read from its own file (0.6em a glyph);
 *   · a CJK glyph is drawn by the platform's CJK face (the stacks end in `--font-cjk`), a full em;
 *   · `.btn-primary`'s letter-spacing adds to every glyph. Kerning is not read: the model reads the measured Swahili row
 *     a few pixels WIDE (5.control prints its reading).
 * Two hosts draw this button, each one column below 768, inside the page's gutter: /positions' classic list directly, and
 * the question page's holder block inside its section's and its row's border and padding, each read from the page. On
 * /positions at 320 the free row holds one line inside the button's content (5.free), and every other row — drawn as
 * today — one line inside the button (5.paid; a Chinese legacy paid row with a six-figure fee runs into its padding, as it
 * does today). In the holder block no label takes more lines than the button holds (5.holder): letting the label wrap
 * there stacks Chinese one glyph a line, and that block's row overflows at 320 and, in Swahili, from 360 to about 430px,
 * today and after A8b — VODACOM-PLAN §0h point 37 (h), its own measured step. From 360 the row is today's, which
 * `qa:classic-shell-parity`'s Sell cells hold to the pixel.
 */
const FIT_FONTS = "src/lib/server/reports/fonts/";
const CJK_FROM = 0x2e80;
type Face = { upm: number; advance: (cp: number, features: readonly string[]) => number | null };
/**
 * A TrueType file's advance widths, read the way a shaper reads them before kerning: the table directory,
 * `head.unitsPerEm`, `hhea.numberOfHMetrics`, `hmtx`, the Windows Unicode `cmap` (format 4), and the one-for-one
 * substitutions a feature asks for (`GSUB` lookup type 1, through extension lookups). A glyph's advance under a list of
 * features is the widest of its own and its alternates'. Null when unreadable.
 */
function fontFace(rel: string): Face | null {
  try {
    const buf = readFileSync(join(REPO_ROOT, rel));
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const tagAt = (at: number) => String.fromCharCode(dv.getUint8(at), dv.getUint8(at + 1), dv.getUint8(at + 2), dv.getUint8(at + 3));
    const tables = new Map<string, number>();
    for (let i = 0; i < dv.getUint16(4); i++) tables.set(tagAt(12 + 16 * i), dv.getUint32(12 + 16 * i + 8));
    const upm = dv.getUint16((tables.get("head") ?? 0) + 18);
    const metrics = dv.getUint16((tables.get("hhea") ?? 0) + 34);
    const hmtx = tables.get("hmtx") ?? 0;
    const cmap = tables.get("cmap") ?? 0;
    let sub = -1;
    for (let i = 0; i < dv.getUint16(cmap + 2); i++) {
      const rec = cmap + 4 + 8 * i;
      const at = cmap + dv.getUint32(rec + 4);
      if (dv.getUint16(rec) === 3 && dv.getUint16(rec + 2) === 1 && dv.getUint16(at) === 4) sub = at;
    }
    if (sub < 0 || upm === 0) return null;
    const segX2 = dv.getUint16(sub + 6);
    const ends = sub + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    const glyph = (cp: number): number => {
      for (let s = 0; s < segX2; s += 2) {
        if (cp > dv.getUint16(ends + s)) continue;
        const start = dv.getUint16(starts + s);
        if (cp < start) return 0;
        const ro = dv.getUint16(ranges + s);
        if (ro === 0) return (cp + dv.getInt16(deltas + s)) & 0xffff;
        const g = dv.getUint16(ranges + s + ro + 2 * (cp - start));
        return g === 0 ? 0 : (g + dv.getInt16(deltas + s)) & 0xffff;
      }
      return 0;
    };
    // One feature's one-for-one substitutions: its records in the FeatureList, their lookups, and each single-substitution
    // subtable (format 1 a delta, format 2 a list), an extension lookup followed to the subtable it wraps.
    const gsub = tables.get("GSUB") ?? 0;
    const known = new Map<string, Map<number, number>>();
    const substitutions = (feature: string): Map<number, number> => {
      const had = known.get(feature);
      if (had) return had;
      const out = new Map<number, number>();
      known.set(feature, out);
      if (gsub === 0) return out;
      const features = gsub + dv.getUint16(gsub + 6);
      const lookups = gsub + dv.getUint16(gsub + 8);
      for (let i = 0; i < dv.getUint16(features); i++) {
        const rec = features + 2 + 6 * i;
        if (tagAt(rec) !== feature) continue;
        const table = features + dv.getUint16(rec + 4);
        for (let k = 0; k < dv.getUint16(table + 2); k++) {
          const lookup = lookups + dv.getUint16(lookups + 2 + 2 * dv.getUint16(table + 4 + 2 * k));
          for (let s = 0; s < dv.getUint16(lookup + 4); s++) {
            let at = lookup + dv.getUint16(lookup + 6 + 2 * s);
            let type = dv.getUint16(lookup);
            if (type === 7) { type = dv.getUint16(at + 2); at += dv.getUint32(at + 4); }
            if (type !== 1) continue;
            const cov = at + dv.getUint16(at + 2);
            const covered: number[] = [];
            if (dv.getUint16(cov) === 1) {
              for (let c = 0; c < dv.getUint16(cov + 2); c++) covered.push(dv.getUint16(cov + 4 + 2 * c));
            } else {
              for (let c = 0; c < dv.getUint16(cov + 2); c++) {
                for (let g = dv.getUint16(cov + 4 + 6 * c); g <= dv.getUint16(cov + 6 + 6 * c); g++) covered.push(g);
              }
            }
            const one = at;
            covered.forEach((g, idx) => out.set(g, dv.getUint16(one) === 1 ? (g + dv.getInt16(one + 4)) & 0xffff : dv.getUint16(one + 6 + 2 * idx)));
          }
        }
      }
      return out;
    };
    const widthOf = (g: number) => dv.getUint16(hmtx + 4 * Math.min(g, metrics - 1));
    // Read lazily, so an unreadable table fails closed: no advance, so 5.model reports the glyph missing.
    const advance = (cp: number, features: readonly string[]): number | null => {
      try {
        const g = glyph(cp);
        return g === 0 ? null : Math.max(widthOf(g), ...features.map((f) => widthOf(substitutions(f).get(g) ?? g)));
      } catch {
        return null;
      }
    };
    return { upm, advance };
  } catch {
    return null;
  }
}
const FIT_INTER = [fontFace(`${FIT_FONTS}Inter-Medium.ttf`), fontFace(`${FIT_FONTS}Inter-Bold.ttf`)];
const FIT_MONO = fontFace(`${FIT_FONTS}JetBrainsMono-Bold.ttf`);
const emOf = (f: Face | null, cp: number, features: readonly string[] = []): number => {
  const a = f ? f.advance(cp, features) : null;
  return f && a !== null ? a / f.upm : Number.NaN;
};
/** One glyph of the label, in ems: a CJK glyph a full em, any other the widest of Inter's 500 and 700 and of their
 *  alternates under the body's features. */
const labelEmOf = (features: readonly string[]) => (cp: number): number =>
  (cp >= CJK_FROM ? 1 : Math.max(...FIT_INTER.map((f) => emOf(f, cp, features))));
/** One glyph of the figure or its note, in ems: a CJK glyph a full em, any other JetBrains Mono's own advance. */
const monoEm = (cp: number): number => (cp >= CJK_FROM ? 1 : emOf(FIT_MONO, cp));
const runPx = (s: string, em: (cp: number) => number, px: number, track: number): number =>
  [...s].reduce((w, ch) => w + em(ch.codePointAt(0) ?? 0) * px + track, 0);
/**
 * The label's lines when its classes let it wrap: the browser's flex layout gives it the room left beside the figure, or
 * its widest unbreakable piece if that is wider (it cannot shrink below it), and breaks greedily between words — and
 * between CJK glyphs, unless `break-keep` keeps them whole (an ellipsis stays with the glyph before it). A line's
 * trailing space hangs.
 */
function wrapped(s: string, avail: number, keep: boolean, w: (t: string) => number): { lines: number; room: number } {
  const toks: Array<[string, boolean]> = [];
  s.split(" ").forEach((word, i) => {
    const chars = [...word];
    if (keep || !chars.some((ch) => (ch.codePointAt(0) ?? 0) >= CJK_FROM)) { toks.push([word, i > 0]); return; }
    chars.forEach((ch, k) => {
      if (ch === "…" && k > 0) toks[toks.length - 1][0] += ch;
      else toks.push([ch, k === 0 && i > 0]);
    });
  });
  const room = Math.max(avail, ...toks.map(([t]) => w(t)));
  let lines = 1;
  let cur = "";
  for (const [t, spaced] of toks) {
    const next = cur === "" ? t : `${cur}${spaced ? " " : ""}${t}`;
    if (cur !== "" && w(next) > room) { lines++; cur = t; } else cur = next;
  }
  return { lines, room };
}
/** Stakes on every digit-length boundary to the platform's maximum (the measured ticket's among them), and the fee rates a
 *  frozen poll can carry — `cashOutValue` clamps its rate to [0, 0.30]. */
const FIT_STAKES = [PLATFORM_MIN_STAKE, 3_600, 9_999, 10_000, 99_999, 100_000, 999_999, PLATFORM_MAX_STAKE];
const FIT_RATES = [0, 0.01, 0.1, 0.25, 0.3];
const FIT_WORDS = ["freeExitLabel", "selling", "sellNow", "fee", "fullRefund", "sellLocked", "loading"];
/** Today's markup for the spans the narrow-phone rule touches or leaves (S6 A8b), as `test:journey-tickets` §12 pins them. */
const FIT_NOTE = `<span className="ml-1.5 hidden opacity-80 text-[11px] xs:inline">{t.common.fullRefund}</span>`;
const FIT_FEE = `<span className="ml-1.5 opacity-80 text-[11px]">−{formatNumber(fee)} {t.common.fee}</span>`;
const FIT_LABEL = `<span>${NL}          {shutNow ? t.common.sellLocked`;
/** The question page's holder block: the page, the section and the row the button sits in (S6 A8b, read by §5). */
const HOLDER_PAGE = `<PageContainer tier="reading">`;
const HOLDER_SECTION = `<section className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3">`;
const HOLDER_ROW = `<div key={p.id} id={p.id} className="ticket-target scroll-mt-24 rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">`;
/** Tailwind's own `border` is 1px: the config overrides no border width (5.model pins that). */
const HOLDER_EDGE = 1;
/** What `cashOutValue` prices a stake at — in its free window, or in a paid one at `rate` — the oracle, never re-implemented. */
async function fitPrice(stake: number, rate: number, free: boolean) {
  const position = { side: "YES" as const, stake, placedAt: new Date(T0).toISOString(), bonusStakeTzs: 0 };
  const market = {
    id: "mkt_sell_fit",
    yesPool: 10_000,
    noPool: 5_000,
    resolutionAt: new Date(T0 + 24 * 60 * MIN).toISOString(),
    selectionClosedAt: new Date(T0 + 60 * MIN).toISOString(),
    feeSnapshot: {
      commissionRate: 0.13,
      feeCeilingRate: 0.5,
      cashOutFeeRate: rate,
      freeExitGraceMinutes: 2,
      paidExitWindowMinutes: 2,
      traTaxOnCommissionRate: 0,
      gbtLevyOnCommissionRate: 0,
    } as never,
  };
  return at(T0 + (free ? 1 : 3) * MIN, () => SVC.cashOutValue(position, market));
}
type FitRow = { loc: string; state: string; stake: number; label: string; figure: string; note: string; free: boolean };

async function g5Fit(W: World) {
  say(`${NL}§5 · the fit — today's free row holds one line on a 320 phone on /positions, and nothing in the row grows taller than the button on either host (S6 A8b)`);
  const css = W.css;
  const cssLine = (head: string) => {
    const a = css.indexOf(NL + head);
    if (a < 0) return "";
    const b = css.indexOf(NL, a + 1);
    return css.slice(a + 1, b < 0 ? css.length : b);
  };
  const cssRule = (head: string) => {
    const a = css.indexOf(NL + head);
    if (a < 0) return "";
    const b = css.indexOf(`${NL}}`, a + 1);
    return b < 0 ? "" : css.slice(a + 1, b + 2);
  };
  const numAfter = (s: string, head: string) => {
    const a = s.indexOf(head);
    return a < 0 ? Number.NaN : Number.parseFloat(s.slice(a + head.length));
  };
  const md = cssLine(".btn-md {");
  const btn = cssRule(".btn {");
  const primary = cssRule(".btn-primary {");
  const body = cssRule("body {");
  const spacing = W.tw.slice(Math.max(0, W.tw.indexOf("spacing: {")));
  const screens = W.tw.slice(Math.max(0, W.tw.indexOf("screens: {")));
  // The body's font features, which the button inherits: each a tag between double quotes.
  const featureAt = body.indexOf("font-feature-settings:");
  const features = featureAt < 0 ? [] : body.slice(featureAt, body.indexOf(";", featureAt)).split(`"`).filter((_, i) => i % 2 === 1);
  const code = W.files.get(SELL_BUTTON) ?? "";
  const classic = squash(code.slice(Math.max(0, code.indexOf(CLASSIC_HEAD))));
  /** The class list of the span in today's markup whose content starts with `content`: [] for a bare span, null for none. */
  const spanClass = (content: string): string[] | null => {
    const atContent = classic.indexOf(`>${content}`);
    const open = atContent < 0 ? -1 : classic.lastIndexOf("<span", atContent);
    if (open < 0) return null;
    const tag = classic.slice(open, atContent + 1);
    const q = tag.indexOf(`className="`);
    return q < 0 ? [] : tag.slice(q + 11, tag.indexOf(`"`, q + 11)).split(" ").filter(Boolean);
  };
  const note = spanClass("{t.common.fullRefund}") ?? [];
  const feeNote = spanClass("−{formatNumber(fee)}") ?? [];
  const label = spanClass("{shutNow ? t.common.sellLocked");
  const has = (cls: string[], ...want: string[]) => want.every((x) => cls.includes(x));
  const noteHidden = has(note, "hidden", "xs:inline");
  // The label wraps below `xs` only if its classes say so; `break-keep` then keeps CJK words whole.
  const wraps = !!label && label.includes("whitespace-normal");
  const keep = !!label && label.includes("break-keep");
  const M = {
    font: numAfter(md, "font-size: "),
    padding: numAfter(md, "padding: 0 "),
    height: numAfter(css, "--h-control-md: "),
    border: numAfter(btn, "border: "),
    gap: numAfter(btn, "gap: "),
    tracking: numAfter(primary, "letter-spacing: "),
    lineHeight: numAfter(body, "line-height: "),
    notePx: numAfter(note.find((c) => c.startsWith("text-[")) ?? "", "text-["),
    noteMargin: note.includes("ml-1.5") ? numAfter(spacing, `"1.5": "`) : Number.NaN,
    gutter: numAfter(spacing, `"3": "`),
    sectionPad: numAfter(spacing, `"5": "`),
    rowPad: numAfter(spacing, `"3": "`),
    xs: numAfter(screens, `xs: "`),
  };
  const list = W.files.get(POSITIONS) ?? "";
  const page = W.files.get(MARKET) ?? "";
  const pinned = {
    gutter: (W.files.get(PAGE_CONTAINER) ?? "").includes(`pad === "page" && "px-3 lg:px-6 py-6"`),
    oneColumn: list.includes(`<div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">`) && list.includes(`<div key={p.id} className="space-y-2">`),
    holder: page.includes(HOLDER_PAGE) && occurrences(page, HOLDER_SECTION) === 1 && occurrences(page, HOLDER_ROW) === 1,
    borders: !W.tw.includes("borderWidth"),
    fonts: FIT_INTER.every((f) => f !== null) && FIT_MONO !== null,
    mono: monoEm(0x30) === 0.6,
  };
  // The prices the rows draw, from the oracle: each stake in its free window, and in a paid one at every rate.
  const priced: Array<{ stake: number; free: boolean; value: number; fee: number }> = [];
  for (const stake of FIT_STAKES) {
    const f = await fitPrice(stake, 0.1, true);
    priced.push({ stake, free: true, value: f.value, fee: f.fee });
    for (const rate of FIT_RATES) {
      const p = await fitPrice(stake, rate, false);
      priced.push({ stake, free: false, value: p.value, fee: p.fee });
    }
  }
  const word = (loc: string, key: string): string => {
    const v = ((W.words[loc] as { common?: Record<string, unknown> } | undefined)?.common ?? {})[key];
    return typeof v === "string" ? v : "";
  };
  const LOCS = ["en", "sw", "zh"];
  const unworded = LOCS.flatMap((loc) => FIT_WORDS.filter((k) => !word(loc, k)).map((k) => `${loc}.common.${k}`));
  const rowsFor = (noteDrawn: boolean): FitRow[] => LOCS.flatMap((loc) => {
    const out: FitRow[] = [];
    for (const p of priced) {
      const figure = `TZS ${formatNumber(p.value)}`;
      if (p.free) {
        const freeNote = noteDrawn ? word(loc, "fullRefund") : "";
        out.push({ loc, state: "free", stake: p.stake, label: word(loc, "freeExitLabel"), figure, note: freeNote, free: true });
        out.push({ loc, state: "free, selling", stake: p.stake, label: word(loc, "selling"), figure, note: freeNote, free: true });
        // Since S6 A8e the server's paint draws the free row itself; a price with no fee, "−0 ada", is a legacy poll's paid
        // window at a rate of 0, a paid row below (VODACOM-PLAN §0h point 37 (f)).
      } else {
        const feeLine = `−${formatNumber(p.fee)} ${word(loc, "fee")}`;
        out.push({ loc, state: "paid", stake: p.stake, label: word(loc, "sellNow"), figure, note: feeLine, free: false });
        out.push({ loc, state: "paid, selling", stake: p.stake, label: word(loc, "selling"), figure, note: feeLine, free: false });
      }
    }
    out.push({ loc, state: "shut", stake: 0, label: word(loc, "sellLocked"), figure: "", note: "", free: false });
    out.push({ loc, state: "lapsed", stake: 0, label: word(loc, "loading"), figure: "", note: "", free: false });
    return out;
  });
  const track = M.tracking * M.font;
  const labelEm = labelEmOf(features);
  const labelPx = (s: string) => runPx(s, labelEm, M.font, track);
  const restPx = (r: FitRow) => (r.figure
    ? M.gap + runPx(r.figure, monoEm, M.font, track) + (r.note ? M.noteMargin + runPx(r.note, monoEm, M.notePx, track) : 0)
    : 0);
  /** The row in a button whose content is `C` wide: the label's lines, and the room left at the content's end (below 0: past it). */
  const layout = (r: FitRow, C: number, wrap: boolean, keepWhole: boolean): { lines: number; spare: number } => {
    const avail = C - restPx(r);
    const whole = labelPx(r.label);
    if (whole <= avail || !wrap) return { lines: 1, spare: avail - whole };
    const { lines, room } = wrapped(r.label, avail, keepWhole, labelPx);
    return { lines, spare: avail - room };
  };
  const contentAt = (viewport: number, inset: number) => viewport - 2 * M.gutter - inset - 2 * M.border - 2 * M.padding;
  const holderInset = 2 * (HOLDER_EDGE + M.sectionPad) + 2 * (HOLDER_EDGE + M.rowPad);
  const PHONE = 320;
  const C320 = contentAt(PHONE, 0);
  const H320 = contentAt(PHONE, holderInset);
  const rows = rowsFor(!noteHidden);
  const glyphless = rows.filter((r) => !Number.isFinite(labelPx(r.label) + restPx(r))).map((r) => `${r.loc} ${r.state} ${r.stake}`);
  const values = Object.entries(M).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  say(`     the model: ${j(M)} · the body's features: ${j(features)} · the button's content at ${PHONE}: ${C320}px on /positions, ${H320}px in the holder block · below ${M.xs} the free note is ${noteHidden ? "left out" : "drawn"} and the label ${wraps ? (keep ? "may wrap, CJK kept whole" : "may wrap") : "keeps one line"}`);
  ok("5.model · the model reads its facts from source — the button's type, padding, gap, border, letter-spacing and height and the body's font features from the stylesheet, the note's size and margin from today's markup, the page's gutter, `xs` and the holder block's paddings from the Tailwind config and the two pages — and its glyphs and their alternates from the repo's own font files (JetBrains Mono at 0.6em); every word the row draws exists in en, sw and zh, and every glyph is in the fonts",
    values.length === 0 && Object.values(pinned).every(Boolean) && unworded.length === 0 && glyphless.length === 0 && M.xs > PHONE && H320 > 0,
    j({ values, pinned, unworded, glyphless: glyphless.slice(0, 3) }));
  ok("5.classes · today's markup carries one narrow-phone rule, below `xs` only: the free note is hidden there and inline from it; the label carries no class, so it keeps today's one line at every width (a label let wrap stacks taller than the button in the holder block, 5.holder); and the fee beside a paid price is drawn at every width",
    noteHidden && label !== null && label.length === 0 && feeNote.length > 0 && !feeNote.includes("hidden"), j({ note, label, feeNote }));
  const rowAt = (r: FitRow, C: number) => layout(r, C, wraps, keep);
  const freeAt = rows.filter((r) => r.free).map((r) => ({ r, f: rowAt(r, C320) }));
  const freeBad = freeAt.filter(({ f }) => f.lines !== 1 || f.spare < 0).map(({ r }) => `${r.loc} ${r.state} TZS ${r.stake}`);
  const leastFree = Math.min(...freeAt.map(({ f }) => f.spare));
  ok(`5.free · on /positions at ${PHONE} the free row — the free word or the selling word, then the whole stake, its note left out — holds ONE line inside the button's content in en, sw and zh for every stake on the grid, to the platform's maximum (least room left: ${leastFree.toFixed(1)}px)`,
    freeAt.length > 0 && freeBad.length === 0, freeBad.slice(0, 3).join(" | "));
  const otherAt = rows.filter((r) => !r.free).map((r) => ({ r, f: rowAt(r, C320) }));
  const otherBad = otherAt.filter(({ f }) => f.lines !== 1 || f.spare < -M.padding)
    .map(({ r, f }) => `${r.loc} ${r.state} TZS ${r.stake}: ${r.figure} ${r.note} (${f.lines} lines, ${f.spare.toFixed(1)}px)`);
  const leastBy = (loc: string) => Math.min(...otherAt.filter(({ r }) => r.loc === loc).map(({ f }) => f.spare)).toFixed(1);
  ok(`5.paid · on /positions at ${PHONE} every other row — a price with its fee (selling or not; a legacy poll's paid window can charge 0), shut, and a lapsed free price — is drawn as today, on ONE line inside the button: the least room left at its content's end is en ${leastBy("en")}, sw ${leastBy("sw")} and zh ${leastBy("zh")}px, where below 0 runs into the button's ${M.padding}px padding and never past its edge`,
    otherAt.length > 0 && otherBad.length === 0, otherBad.slice(0, 3).join(" | "));
  const holderAt = rows.map((r) => ({ r, f: rowAt(r, H320) }));
  const tall = holderAt.filter(({ f }) => f.lines * M.font * M.lineHeight > M.height - 2 * M.border)
    .map(({ r, f }) => `${r.loc} ${r.state} TZS ${r.stake}: ${f.lines} lines`);
  const worstBy = (loc: string) => Math.min(...holderAt.filter(({ r }) => r.loc === loc).map(({ f }) => f.spare)).toFixed(1);
  ok(`5.holder · in the question page's holder block at ${PHONE} (a ${H320}px content box: its section's and its row's border and padding, read from the page) no label takes more lines than the button's ${M.height}px holds, so nothing in the row is taller than the button; the row's overflow at its content's end (at the worst en ${worstBy("en")}, sw ${worstBy("sw")}, zh ${worstBy("zh")}px) is VODACOM-PLAN §0h point 37 (h), its own step`,
    holderAt.length > 0 && H320 > 0 && tall.length === 0, tall.slice(0, 3).join(" | "));
  // CONTROL — today's rules from 360 applied at 320 (the note drawn), as the browser measured them.
  const measured = rowsFor(true).filter((r) => r.state === "free" && r.stake === 3_600);
  const at320 = Object.fromEntries(measured.map((r) => [r.loc, layout(r, C320, false, false)]));
  const at360 = Object.fromEntries(measured.map((r) => [r.loc, layout(r, contentAt(M.xs, 0), false, false)]));
  ok(`5.control · CONTROL · with today's rules at ${PHONE} (the note drawn) the model sees what the browser measured: the Swahili free row for TZS 3,600 is wider than the button's ${C320}px content (the model reads ${at320.sw ? (C320 - at320.sw.spare).toFixed(1) : "?"}px of row; the browser measured 277px), the English and Chinese rows fit, and from ${M.xs} all three fit — so 5.free can see the defect it was written for`,
    measured.length === 3 && (at320.sw?.spare ?? 0) < 0 && (at320.en?.spare ?? -1) >= 0 && (at320.zh?.spare ?? -1) >= 0
      && LOCS.every((l) => (at360[l]?.spare ?? -1) >= 0),
    j({ at320, at360 }));
}

async function runAll(I: Impl, W: World) {
  await g1Server(I);
  g2Hosts(W);
  g3Button(W);
  g4Wiring(W);
  await g5Fit(W);
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
/** S6 A8b · one word of one language replaced, for §5's copy plants. */
const withWord = (w: World, loc: string, key: string, value: string): World => {
  const lang = (w.words[loc] ?? {}) as { common?: Record<string, unknown> };
  return { ...w, words: { ...w.words, [loc]: { ...lang, common: { ...(lang.common ?? {}), [key]: value } } } };
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
const FREE_END = "const freeEndTs = useMemo(() => (freeUntil ? Date.parse(freeUntil) : NaN), [freeUntil]);";
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
      SELL_BUTTON, IN_GRACE, `${IN_GRACE.slice(0, -1)} && (closesAt ? Date.parse(closesAt) - Date.now() : Infinity) > GRACE_MS;`) },
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
    world: (w) => inFile(w, SELL_BUTTON, IN_GRACE, `${IN_GRACE.slice(0, -1)} && Date.now() < Date.parse(closesAt ?? "");`) },
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
  { name: "a mount flag comes back to the journey's free offer (the server's paint offers it whatever the countdown says)", expect: ["3.journey"],
    world: (w) => inFile(w, SELL_BUTTON, OFFER_FREE, "const offerFree = pricedFree === true && (inGrace || !mounted);") },
  // §3 — S6 A8b: today's look withdraws a lapsed free price too, and draws the server's shut verdict from its first commit
  { name: "today's button can still be pressed over a lapsed free price", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, "disabled={pending || shutNow || lapsed || repricing}", "disabled={pending || shutNow || repricing}") },
  { name: "today's button keeps the stale figure while it waits for the server", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, "{!shutNow && !lapsed && !repricing && (", "{!shutNow && !repricing && (") },
  { name: "today's button says 'Uza sasa' over a lapsed free price (nothing says it is waiting)", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, `            : lapsed ? t.common.loading${NL}`, "") },
  { name: "today's button names the stale figure to a screen reader while it waits", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, `            : lapsed${NL}            ? (pending ? t.common.selling : t.common.loading)${NL}`, "") },
  { name: "the lapse is the journey's alone again (today's button keeps a stale free price until the next refresh)", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSE_GUARD, `if (look !== "journey" || closedNow || alreadyClosed) return;`) },
  { name: "the lapse effect skips today's look through the look prop, after its guard (its confirm stays open on the free price, and nothing asks the server)", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSE_GUARD, `${LAPSE_GUARD}${NL}    if (!look) return;`) },
  { name: "the lapse effect skips today's look before its guard", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, `    ${LAPSE_GUARD}`, `    if (look !== "journey") return;${NL}    ${LAPSE_GUARD}`) },
  { name: "a mount flag holds the lapse back until a commit again (the server's paint draws a lapsed free price as 'Uza sasa · TZS 3,600 −0 ada')", expect: ["3.journey", "3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSED, "const lapsed = (pricedFree === true && mounted && !inGrace) || stale;") },
  { name: "the lapse verdict moves inside the journey's look (today's return can no longer read it)", expect: ["3.classic"],
    world: (w) => inFile(inFile(w, SELL_BUTTON, LAPSED, ""), SELL_BUTTON, "if (journey) {", `if (journey) {${NL}    ${LAPSED}`) },
  { name: "today's button waits an effect for the server's shut verdict (a bright, pressable 'Uza sasa · TZS 0' between 'Inapakia…' and 'Kuuza kumefungwa')", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, SHUT_NOW, "const shutNow = closedNow;") },
  { name: "today's button waits for its first commit for the server's shut verdict again (its server paint offers 'Uza sasa · TZS 0 −1,000 ada')", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, SHUT_NOW, "const shutNow = closedNow || (mounted && alreadyClosed === true);") },
  { name: "today's free strip reads the phone's clock alone (it outlives the server's shut verdict for a render)", expect: ["3.render", "3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, "{inGrace && !shutNow && !repricing && (", "{inGrace && !closedNow && !repricing && (") },
  // §3 — S6 A8c: a price the server refused because it moved waits the same way, ahead of a sale in flight
  { name: "today's button says 'Inauza…' while a moved price waits for the server (under a result that says nothing was sold)", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, `            : repricing ? t.common.loading${NL}`, "") },
  { name: "today's free strip keeps counting down over a price the server refused because it moved", expect: ["3.render"],
    world: (w) => inFile(w, SELL_BUTTON, "{inGrace && !shutNow && !repricing && (", "{inGrace && !shutNow && (") },
  // §3 — S6 A8e: the countdown's first value is the server's, a price with a fee is never drawn free, and a render brought
  // back by Back or Forward is no offer until a fresh one arrives
  { name: "the countdown starts at 0 again (inside the free window the server paints 'Uza sasa · TZS 3,600 −0 ada', and the strip pushes the button down once the page has started)", expect: ["3.first"],
    world: (w) => inFile(w, SELL_BUTTON, FIRST_VALUE, "const [graceRemainMs, setGraceRemainMs] = useState<number>(0);") },
  { name: "the countdown's first value reads this device's clock (the server's paint and the hydrating render disagree)", expect: ["3.first"],
    world: (w) => inFile(w, SELL_BUTTON, FIRST_VALUE, FIRST_VALUE.replace("freeEndTs - serverNow", "freeEndTs - Date.now()")) },
  { name: "the countdown's first value parses the instant again on its own (two parses that can disagree)", expect: ["3.source", "3.first"],
    world: (w) => inFile(w, SELL_BUTTON, FIRST_VALUE, FIRST_VALUE.replace("Number.isFinite(freeEndTs) && serverNow != null ? Math.max(0, freeEndTs - serverNow)", "freeUntil && serverNow != null ? Math.max(0, Date.parse(freeUntil) - serverNow)")) },
  { name: "the clock no longer re-runs on a new serverNow (a refresh's own instant never recalibrates the countdown)", expect: ["3.first"],
    world: (w) => inFile(w, SELL_BUTTON, CLOCK_DEPS, "}, [freeEndTs]);") },
  { name: "a price the server priced with a fee is drawn free while the countdown catches up (the free words over the paid figure, for a commit)", expect: ["3.state"],
    world: (w) => inFile(w, SELL_BUTTON, IN_GRACE, IN_GRACE.replace(" && pricedFree !== false", "")) },
  { name: "a host that passes no flag loses its free offer (the flag read strictly where the countdown should stand alone)", expect: ["3.state"],
    world: (w) => inFile(w, SELL_BUTTON, IN_GRACE, IN_GRACE.replace("pricedFree !== false", "pricedFree === true")) },
  { name: "a restored render keeps its free offer (Back to /positions offers its old free price until the poller's next beat)", expect: ["3.state"],
    world: (w) => inFile(w, SELL_BUTTON, IN_GRACE, IN_GRACE.replace(" && !stale", "")) },
  { name: "a restored render's price with a fee is offered (only a free one waits for the server's answer)", expect: ["3.journey", "3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSED, "const lapsed = pricedFree === true && !inGrace;") },
  { name: "the record is keyed by the position alone (every fresh visit to a ticket reads as a restore: 'Inapakia…' and an ask each time)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, RESTORE[2], RESTORE[2].replace("@${serverNow}", "")) },
  { name: "the record is written during render (a first load's own render counts itself and can read as a restore)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, RESTORE[4], "const [restoredAt, setRestoredAt] = useState<number | null>(() => { const k = renderKey(positionId, serverNow ?? 0); const was = drawnRenders.get(k); drawnRenders.set(k, 0); return was === 0 ? serverNow ?? null : null; });") },
  { name: "the record moves inside the component (a new, empty record at every render: Back is never read)", expect: ["3.restore"],
    world: (w) => inFile(inFile(w, SELL_BUTTON, `${RESTORE[0]}${NL}`, ""), SELL_BUTTON, `  const [pending, start] = useTransition();${NL}`, `  const [pending, start] = useTransition();${NL}  ${RESTORE[0]}${NL}`) },
  { name: "the record is cleared when a button unmounts (the page Back returns to finds nothing: its old prices are offered)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `  }, [positionId, serverNow]);${NL}`, `  }, [positionId, serverNow]);${NL}  useEffect(() => () => { drawnRenders.clear(); }, []);${NL}`) },
  { name: "the record forgets a render its button moves on from (a Back between two addresses of one page is never read)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, "return () => { drawnRenders.set(key, (drawnRenders.get(key) ?? 1) - 1); };", "return () => { drawnRenders.delete(key); };") },
  { name: "the record no longer counts who draws a render (a second button drawing a render on screen reads as brought back)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, "drawnRenders.get(renderKey(positionId, serverNow)) === 0", "drawnRenders.has(renderKey(positionId, serverNow))") },
  { name: "the record keeps every render for as long as the tab is open (it grows with every refresh of every ticket)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    for (const [k, live] of drawnRenders) {${NL}      if (drawnRenders.size <= DRAWN_KEPT) break;${NL}      if (live === 0) drawnRenders.delete(k);${NL}    }${NL}`, "") },
  { name: "a render that hands a button already on the page an old serverNow is not read (a Back between two addresses of one page offers its old prices)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    const back = restoredOf(positionId, serverNow);${NL}    if (back !== null) setRestoredAt(back);${NL}`, "") },
  { name: "a fresh render never ends a restore (the button says 'Inapakia…' for good)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    setRestoredAt(null);${NL}`, "") },
  { name: "the answer that ends a restore re-arms nothing (an answer that is itself no offer waits for the poller)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    lapseArmed.current = true;${NL}    setRestoredAt(null);${NL}`, `    setRestoredAt(null);${NL}`) },
  { name: "a restore asks once per button (four tickets, four refreshes queued on a 2G phone)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    if (restoreAsker !== null && restoreAsker !== restoreAsk) { lapseArmed.current = false; return; }${NL}`, "") },
  { name: "the button that claims a restore's ask is not armed for it (after an earlier ask was answered, a Back between two addresses of one page never asks)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, `    if (restoreAsk.current !== restoredAt) { restoreAsk.current = restoredAt; lapseArmed.current = true; }${NL}`, "") },
  { name: "a shut ticket claims a restore's ask and never makes it (the restore is never asked about)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, "if (restoredAt === null || closedNow || alreadyClosed) return;", "if (restoredAt === null || alreadyClosed) return;") },
  { name: "a ticket this phone's clock has shut claims a restore's ask and never makes it (after a Back between two addresses of one page)", expect: ["3.restore"],
    world: (w) => inFile(w, SELL_BUTTON, "if (restoredAt === null || closedNow || alreadyClosed) return;", "if (restoredAt === null || closedNow) return;") },
  { name: "the claim moves below the lapse effect (each button's lapse asks before its claim can disarm it: one ask per button)", expect: ["3.restore"],
    world: (w) => {
      const raw = w.files.get(SELL_BUTTON) ?? "";
      const head = `  useEffect(() => {${NL}    if (restoredAt === null || closedNow || alreadyClosed) return;`;
      const at = raw.indexOf(head);
      const end = raw.indexOf(`  }, [restoredAt, closedNow, alreadyClosed]);${NL}`, at);
      if (at < 0 || end < 0) return w;
      const claim = raw.slice(at, end + `  }, [restoredAt, closedNow, alreadyClosed]);${NL}`.length);
      const lifted = raw.slice(0, at) + raw.slice(at + claim.length);
      return withFile(w, SELL_BUTTON, lifted.split(`${LAPSE_DEPS}${NL}`).join(`${LAPSE_DEPS}${NL}${claim}`));
    } },
  { name: "the lapse no longer runs when a restore ends (an answer that is itself no offer is not asked about)", expect: ["3.classic"],
    world: (w) => inFile(w, SELL_BUTTON, LAPSE_DEPS, "}, [lapsed, inGrace, closedNow, alreadyClosed, pending]);") },
  // §2 — S6 A8e: every host hands the server's instant of its render, and draws its RefreshPoller before its buttons
  { name: "/positions stops handing its classic Sell button serverNow (its countdown starts at 0, and the record never sees its renders)", expect: ["2.now"],
    world: (w) => inFile(w, POSITIONS, `alreadyClosed={sellShut}${NL}                      serverNow={serverNow}`, "alreadyClosed={sellShut}") },
  { name: "the journey's ticket card takes serverNow as an optional prop (a page could hand it none)", expect: ["2.now"],
    world: (w) => inFile(w, JOURNEY_CARD, `  serverNow: number;${NL}}) {`, `  serverNow?: number;${NL}}) {`) },
  { name: "/positions draws its RefreshPoller after its tickets (a restored page's one ask, made as it mounts, finds nothing listening)", expect: ["2.poller"],
    world: (w) => inFile(inFile(w, POSITIONS, `      <RefreshPoller intervalMs={20_000} />${NL}`, ""), POSITIONS, "    </PageContainer>", `      <RefreshPoller intervalMs={20_000} />${NL}    </PageContainer>`) },
  { name: "Tiketi zangu draws its RefreshPoller after its cards", expect: ["2.poller"],
    world: (w) => inFile(inFile(w, TICKETS_VIEW, `      <RefreshPoller intervalMs={20_000} />${NL}`, ""), TICKETS_VIEW, "    </PageContainer>", `      <RefreshPoller intervalMs={20_000} />${NL}    </PageContainer>`) },
  // §4 — S6 A8e: the router premise
  { name: "next.config.ts turns on cacheComponents (Back shows a kept page with its old props, and no render reads them)", expect: ["4.premise"],
    world: (w) => inFile(w, NEXT_CONFIG, "reactStrictMode: true,", `reactStrictMode: true,${NL}  cacheComponents: true,`) },
  // §2 — S6 A8b: every host hands the free-price flag, from cashOutValue's own verdict
  { name: "the question page stops telling its Sell button whether the price is the free window's (a lapsed free price is offered until the next refresh)", expect: ["2.priced"],
    world: (w) => inFile(w, MARKET, "pricedFree={positionPricedFree.get(p.id) === true}", "") },
  { name: "/positions' classic list hands the flag loosely (any price would read as free)", expect: ["2.priced"],
    world: (w) => inFile(w, POSITIONS, "pricedFree={price?.free === true}", "pricedFree={!!price}") },
  { name: "the question page reads its flag off the fee, not cashOutValue's verdict", expect: ["2.priced"],
    world: (w) => inFile(w, MARKET, PRICED_FROM[1][2], "positionPricedFree.set(p.id, co.sellable && co.fee === 0);") },
  { name: "/positions' flag gains a clause (a paid window with no fee would read as free, and lapse into 'Inapakia…' for good)", expect: ["2.priced"],
    world: (w) => inFile(w, POSITIONS, PRICED_FROM[0][2], "free: sellable && co.inGracePeriod || co.fee === 0 };") },
  { name: "the question page's flag drops the LIVE gate /positions reads (a CLOSED question's free price would be flagged)", expect: ["2.priced"],
    world: (w) => inFile(w, MARKET, PRICED_FROM[1][2], "positionPricedFree.set(p.id, co.sellable && co.inGracePeriod);") },
  // §5 — S6 A8b: the fit
  { name: "the free note is drawn below 360 again (the Swahili free row overflows a 320 phone on /positions, as measured)", expect: ["5.free", "5.classes"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_NOTE, FIT_NOTE.replace("ml-1.5 hidden opacity-80 text-[11px] xs:inline", "ml-1.5 opacity-80 text-[11px]")) },
  { name: "the label may wrap below 360 (in the holder block Chinese stacks one glyph a line, taller than the button)", expect: ["5.holder", "5.classes"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_LABEL, FIT_LABEL.replace("<span>", `<span className="whitespace-normal xs:whitespace-nowrap">`)) },
  { name: "the label may wrap below 360 with Chinese kept whole (in the holder block Swahili's three words stack taller than the button)", expect: ["5.holder", "5.classes"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_LABEL, FIT_LABEL.replace("<span>", `<span className="whitespace-normal break-keep xs:whitespace-nowrap">`)) },
  { name: "the fee beside a paid price is hidden below 360 too (a price shown without its fee)", expect: ["5.classes"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_FEE, FIT_FEE.replace("ml-1.5 opacity-80 text-[11px]", "ml-1.5 hidden opacity-80 text-[11px] xs:inline")) },
  { name: "the stylesheet spreads the button's letters ten times wider (the row the model reads no longer fits)", expect: ["5.free"],
    world: (w) => ({ ...w, css: w.css.split("letter-spacing: 0.005em;").join("letter-spacing: 0.05em;") }) },
  { name: "a longer Swahili free word (copy the row cannot hold on one line at 320)", expect: ["5.free"],
    world: (w) => withWord(w, "sw", "freeExitLabel", "Toka bila gharama yoyote") },
  { name: "a word the row draws is missing in Chinese (the model would measure an empty label)", expect: ["5.model"],
    world: (w) => withWord(w, "zh", "loading", "") },
  { name: "the holder block's row changes its padding (the model would measure a button that is not there)", expect: ["5.model"],
    world: (w) => inFile(w, MARKET, HOLDER_ROW, HOLDER_ROW.replace(" p-3 ", " p-4 ")) },
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
    && a.rawSellButton === b.rawSellButton && j(a.scripts) === j(b.scripts)
    && a.css === b.css && a.tw === b.tw && a.words === b.words;
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
