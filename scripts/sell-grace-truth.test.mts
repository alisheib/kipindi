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
 *   §5 THE FIT (S6 A8b, A8d, A8g) — a static model of today's button row, from the repo's own font files (the body's
 *      alternates included), stylesheet, pages and words: on a 320 phone (below Tailwind's `xs`) the free row on
 *      /positions holds one line inside the button's content and every other row fits inside it, in en, sw and zh, for
 *      every stake and fee rate on a grid to the platform's maximum; on /positions (S6 A8g) every row fits at eleven
 *      widths from 320 to 639 — today's one line where it fits, its note under its figure where it does not — and on one
 *      line from 640; in the question page's holder block (S6 A8d) the button stacks below 640 — its label on one line,
 *      its figure and note on the next — and every row fits inside it at eight widths from 320 to 639, and on one line
 *      from 640; the free strip above the button (S6 A8g) keeps each of its parts whole on both hosts and wraps only
 *      between them; and the model sees the defects it was written for (the Swahili free row a browser measured too wide
 *      on /positions at 320 before A8b, in the holder block at 360 before A8d, and before A8g the big stakes' rows on
 *      /positions and the strip's parts broken in the holder block at 360) and the measured fit from 360 on /positions;
 *      and (2026-10-06) the ticket's "opened" line on both hosts keeps its date one unit after its word (5.opened).
 *   §6 THE DIALOGS' FIT (S6 A8f) — the same model, given the Sell confirm's and the result's geometry from their own
 *      markup and the Modal's: every money figure in either dialog stays whole and each row reflows. The confirm's figure is
 *      an amount, and its receive row shares a line or wraps, the fee column moving below the figure; every button holds its
 *      label; the result sets the figures in its title as amounts that fit its line, and its detail rows hold theirs — in
 *      en, sw and zh, from 320 to 1280, for every stake and every whole-percent fee on the grid, in both looks — and the
 *      model draws the split a browser drew before A8f (6.control).
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
/** 2026-10-06 · /positions' card, whose "opened" line 5.opened reads beside the holder block's. */
const POSITION_CARD = "src/components/markets/position-card.tsx";
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
 * /positions at 320 the free row holds one line inside the button's content (5.free), and every other row fits inside it
 * (5.paid: since S6 A8g a legacy paid row with a six-figure fee, which ran into the button's padding, puts its fee under
 * its figure). The label carries no class and keeps today's one line at every width (5.classes).
 * ⭐ S6 A8d · in the question page's holder block the host asks for the stacked phone row (`stackOnPhone`). Below the
 * stylesheet's phone bound the button takes the rung that rule names, its label on one line and its figure on the next,
 * the note beside the figure or, when that line cannot hold both, under it — every piece kept whole — so every row sits
 * inside the button's content and nothing is taller than the rung (5.stack); from 640 the row is today's one line, and
 * it fits there too. Every value of the rule is read from its own declaration, by exact property, and its phone block
 * must open with the house phone query alone: a second condition (a pointer, a lower bound) would switch the stack off
 * on a phone the model lays it out for, so 5.model fails it and 5.stack lays that row out on one line. 5.control keeps
 * that block's one-line defect in view: without the stack, the Swahili free row at 360 runs past the button, as the v2
 * baseline measured (VODACOM-PLAN §0h point 37 (h)).
 * ⭐ S6 A8g · every host that does not ask for the stack (/positions) is drawn the wrap class, and below the wrap rule's
 * phone bound its figure is a wrapping row: a row whose label, figure and note fit on one line keeps that line (the
 * rule's column gap where the note's own margin was), and one that does not keeps its label on the line and puts the
 * note under the figure, at the right end, the two lines inside the button (5.list, at eleven widths from 320 to 639;
 * 5.paid holds 320 to the same layout). And the free strip above the button keeps each of its three parts whole — the
 * free word, the countdown (laid out at 60:00, the longest a poll's free window can draw) and the note — and wraps
 * between them when they cannot share a line, on both hosts (5.strip). 5.control keeps both defects in view: on today's
 * one line the Swahili free row for TZS 1,000,000 at 360 and the Chinese legacy paid row at 320 run past the content;
 * and with the strip's classes before A8g the browser shrinks its Swahili parts in the holder block at 360 until the
 * free word and the note break inside (the v2 baseline measured them 112 and 66px wide). On /positions from 360 a row
 * that fits is today's, which `qa:classic-shell-parity`'s Sell cells hold to the pixel but for the wrap's own styles.
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
 *  frozen poll can carry — `cashOutValue` clamps its rate to [0, 0.30]. S6 A8d adds TZS 110,000 and 0.5%: at 0.5%,
 *  TZS 110,000 sells for TZS 109,450 −550 and TZS 1,000,000 for TZS 995,000 −5,000, the widest rows that still keep their
 *  note beside the figure in the holder block's stack at 320 (in Chinese, and in English and Swahili), so the least room
 *  5.stack prints there is the least that any stake and fee can leave. */
const FIT_STAKES = [PLATFORM_MIN_STAKE, 3_600, 9_999, 10_000, 99_999, 100_000, 110_000, 999_999, PLATFORM_MAX_STAKE];
const FIT_RATES = [0, 0.005, 0.01, 0.1, 0.25, 0.3];
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
/**
 * S6 A8d · THE HOLDER BLOCK ASKS FOR THE STACKED PHONE ROW, and §5 reads both halves of it from source: the host's ask
 * (`stackOnPhone`, a bare attribute on the holder block's Sell button and on no other host), the class today's markup
 * adds for it, and the stylesheet's rule for that class — its phone bound, the rung it takes, its line height and row
 * gap, the label's own line, the figure's line (its column gap, and whether its note may go under it) and the note's
 * margin. 5.stack lays every row out at these widths with what it reads.
 */
const FIT_STACK_FLAG = `${NL}                        stackOnPhone${NL}`;
/** The stacked rule's phone block as the stylesheet opens it: the house phone query alone, then its density reason. */
const FIT_STACK_OPENER = `@media (max-width: 639.98px) {${NL}  /* density: general — the question page's Sell button`;
const FIT_STACK_CLASSNAME = 'className={`btn ${shutNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal${stackOnPhone ? " kp-sell-stack" : " kp-sell-wrap"}`}';
const FIT_STACK_RULE = ".btn-md.kp-sell-stack {";
const FIT_STACK_LABEL = ".kp-sell-stack > span:first-child {";
const FIT_STACK_FIGURE = ".kp-sell-stack > span + span {";
const FIT_STACK_NOTE = ".kp-sell-stack > span + span > span {";
const STACK_WIDTHS = [320, 340, 360, 390, 412, 430, 600, 639];
/**
 * S6 A8g · WHERE ITS HOST DOES NOT STACK, TODAY'S BUTTON PUTS ITS NOTE UNDER ITS FIGURE WHEN ONE LINE CANNOT HOLD BOTH, and
 * §5 reads that from source too: the className's two arms (the stack for the host that asks, the wrap for every other
 * host) and the stylesheet's rule for the wrap — its own phone block (the house phone query alone, then its density
 * reason), the figure a wrapping flex row whose column gap is a spacing token, its lines at the right end on one baseline,
 * and the note's own margin given way to that gap. 5.list lays every row out on /positions at these widths with it.
 */
const FIT_STACK_ARM = 'whitespace-normal${stackOnPhone ? " kp-sell-stack" : ';
const FIT_WRAP_ARM = ' : " kp-sell-wrap"}`}';
const FIT_WRAP_OPENER = `@media (max-width: 639.98px) {${NL}  /* density: general — today's Sell button where its host does not stack`;
const FIT_WRAP_FIGURE = ".kp-sell-wrap > span + span {";
const FIT_WRAP_NOTE = ".kp-sell-wrap > span + span > span {";
const LIST_WIDTHS = [320, 324, 340, 360, 366, 383, 390, 412, 430, 600, 639];
/**
 * S6 A8g · THE FREE STRIP ABOVE THE BUTTON KEEPS EACH OF ITS PARTS WHOLE — the free word, the countdown and the note — and
 * wraps between them when they cannot share a line. §5 reads the strip from today's markup (its classes; each part's
 * face, size, tracking and case) and lays it out on both hosts (5.strip), with the countdown at its longest: a poll's free
 * window runs 0 to 60 minutes, so "60:00" — and 5.model reads that bound from market-config's own refusal
 * (FIT_GRACE_GUARD, `g > 60`) and holds FIT_STRIP_CLOCK to it, so a longer window is laid out and recorded before it
 * ships. FIT_STRIP_BEFORE is its class string before A8g, which 5.control lays out where a browser measured its parts
 * broken.
 */
const FIT_STRIP_OPEN = "{inGrace && !shutNow && !repricing && (";
const FIT_STRIP_DIV = '<div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">';
const FIT_STRIP_BEFORE = "mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30";
const FIT_STRIP_CLOCK = "60:00";
const FIT_CONFIG = "src/lib/server/market-config.ts";
const FIT_GRACE_GUARD = "const g = updates.freeExitGraceMinutes;";
const STRIP_WIDTHS = [320, 340, 360, 376, 383, 390, 412, 430, 600, 639];
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
  say(`${NL}§5 · the fit — today's free row holds one line on a 320 phone on /positions, and nothing in the row grows taller than the button on either host (S6 A8b); in the question page's holder block the button stacks on a phone, and every row fits it (S6 A8d); on /positions a row that cannot hold one line puts its note under its figure, and the free strip keeps each of its parts whole (S6 A8g)`);
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
  // ⭐ S6 A8g · A TOKEN THE RULES READ COUNTS ONLY WHEN THE STYLESHEET DECLARES IT ONCE, outside its comments: a rung or
  // a gap is read from its one declaration, and a second one anywhere — a phone block's :root, a setting's — would re-set
  // what the browser draws while the model read the first, so a token declared twice (or never) reads NaN, which 5.model
  // refuses and every layout that needs it fails on.
  const cssBare = css.split("/*").map((part, i) => (i === 0 ? part : part.includes("*/") ? part.slice(part.indexOf("*/") + 2) : "")).join("");
  const nameChar = (c: string) => c === "-" || c === "_" || (c >= "0" && c <= "9") || c.toLowerCase() !== c.toUpperCase();
  const tokenPx = (name: string) => {
    const at: number[] = [];
    for (let a = cssBare.indexOf(`${name}:`); a >= 0; a = cssBare.indexOf(`${name}:`, a + 1)) if (!nameChar(cssBare.charAt(a - 1))) at.push(a);
    return at.length === 1 ? Number.parseFloat(cssBare.slice(at[0] + name.length + 1)) : Number.NaN;
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
    height: tokenPx("--h-control-md"),
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
    // S6 A8d · the stacked phone row's rule must end below `sm`; from `sm` (and at `md`) the holder block's row is one line.
    sm: numAfter(screens, `sm: "`),
    md: numAfter(screens, `md: "`),
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
    // S6 A8d · the holder block asks for the stacked phone row — once, as a bare attribute — today's markup adds its one
    // class for that ask, and no other file asks.
    stackAsked: occurrences(page, "stackOnPhone") === 1 && page.includes(FIT_STACK_FLAG),
    // S6 A8g · the className's two arms, each once: the stack for the host that asks, and the wrap for every other host.
    stackClassed: occurrences(classic, FIT_STACK_ARM) === 1,
    wrapClassed: occurrences(classic, FIT_WRAP_ARM) === 1,
    stackOnHolderOnly: [...W.files].every(([rel, text]) => rel === MARKET || rel === SELL_BUTTON || !text.includes("stackOnPhone")),
  };
  // S6 A8d · THE STACKED PHONE ROW, as the stylesheet writes it: the phone block that holds the rule (its bound; its
  // opener, the house phone query alone, so no second condition — a pointer, a lower bound — can switch the stack off on
  // a phone the model lays it out for; and the density contract's opening reason), the rung the rule takes, its line
  // height and row gap, the figure's column gap, and its shape — the rule sits inside that block, the button wraps its
  // lines, the label takes a line of its own, the note's margin gives way to the gap — and, read apart for 5.stack,
  // whether the figure's line is a wrapping flex row that lets its note go under it. Every value is read from its own
  // declaration, by its exact property: a `max-height` or a `min-height` is not the rule's height.
  const stackAt = css.indexOf(`${NL}  ${FIT_STACK_RULE}`);
  const mediaAt = stackAt < 0 ? -1 : css.lastIndexOf(`${NL}@media (`, stackAt);
  const [mediaLine = "", mediaFirst = ""] = mediaAt < 0 ? [] : css.slice(mediaAt + 1, stackAt).split(NL);
  const stackLine = cssLine(`  ${FIT_STACK_RULE}`);
  const figureLine = cssLine(`  ${FIT_STACK_FIGURE}`);
  /** One declaration of a one-line rule, found by its exact property ("" when the rule does not declare it). */
  const decl = (line: string, prop: string) =>
    line.slice(line.indexOf("{") + 1).split(";").map((d) => d.trim()).find((d) => d.startsWith(`${prop}: `)) ?? "";
  /** The custom property a declaration reads through var(), or "" when it reads none. */
  const declVar = (line: string, prop: string) => {
    const d = decl(line, prop);
    const a = d.indexOf("var(");
    return a < 0 ? "" : d.slice(a + 4, d.indexOf(")", a + 4));
  };
  const heightVar = declVar(stackLine, "height");
  const gapVar = declVar(figureLine, "column-gap");
  const S = {
    bound: numAfter(mediaLine, "max-width: "),
    height: heightVar.startsWith("--h-control-") ? tokenPx(heightVar) : Number.NaN,
    lineHeight: numAfter(decl(stackLine, "line-height"), ": "),
    rowGap: numAfter(decl(stackLine, "row-gap"), ": "),
    colGap: gapVar.startsWith("--sp-") ? tokenPx(gapVar) : Number.NaN,
  };
  const stackShape = {
    block: stackAt >= 0 && mediaAt >= 0 && !css.slice(mediaAt, stackAt).includes(`${NL}}`),
    phone: mediaLine === `@media (max-width: ${S.bound}px) {`,
    general: mediaFirst.trim().startsWith("/* density: general"),
    lines: decl(stackLine, "flex-wrap") === "flex-wrap: wrap",
    label: decl(cssLine(`  ${FIT_STACK_LABEL}`), "flex-basis") === "flex-basis: 100%",
    note: decl(cssLine(`  ${FIT_STACK_NOTE}`), "margin-left") === "margin-left: 0",
  };
  const figureWraps = decl(figureLine, "display") === "display: flex" && decl(figureLine, "flex-wrap") === "flex-wrap: wrap";
  // ⭐ S6 A8g · THE WRAP WHERE A HOST DOES NOT STACK, as the stylesheet writes it: its own phone block (the house phone query
  // alone, then its density reason), the figure's lines at the right end on one baseline, a column gap from the spacing
  // scale, the note's margin given way to it — and, read apart for 5.list, whether the figure is a wrapping flex row that
  // lets its note go under it. Each value from its own declaration, by exact property, as the stack's are.
  const wrapAt = css.indexOf(`${NL}  ${FIT_WRAP_FIGURE}`);
  const wrapMediaAt = wrapAt < 0 ? -1 : css.lastIndexOf(`${NL}@media (`, wrapAt);
  const [wrapMediaLine = "", wrapMediaFirst = ""] = wrapMediaAt < 0 ? [] : css.slice(wrapMediaAt + 1, wrapAt).split(NL);
  const wrapLine = cssLine(`  ${FIT_WRAP_FIGURE}`);
  const wrapGapVar = declVar(wrapLine, "column-gap");
  const L = {
    bound: numAfter(wrapMediaLine, "max-width: "),
    colGap: wrapGapVar.startsWith("--sp-") ? tokenPx(wrapGapVar) : Number.NaN,
  };
  const wrapShape = {
    block: wrapAt >= 0 && wrapMediaAt >= 0 && !css.slice(wrapMediaAt, wrapAt).includes(`${NL}}`),
    phone: wrapMediaLine === `@media (max-width: ${L.bound}px) {`,
    general: wrapMediaFirst.trim().startsWith("/* density: general"),
    end: decl(wrapLine, "justify-content") === "justify-content: flex-end",
    baseline: decl(wrapLine, "align-items") === "align-items: baseline",
    note: decl(cssLine(`  ${FIT_WRAP_NOTE}`), "margin-left") === "margin-left: 0",
  };
  const wrapFigure = decl(wrapLine, "display") === "display: flex" && decl(wrapLine, "flex-wrap") === "flex-wrap: wrap";
  // ⭐ S6 A8g · THE FREE STRIP, as today's markup draws it: its own classes (a flex row, its edge, its padding and its gaps
  // on the spacing scale) and each part's — the free word, the countdown and the note — in the mono face, its size (the
  // type ladder's micro rung, or the size the markup states), its tracking and its case; and, read apart for 5.strip,
  // whether it wraps between its parts and whether a nowrap keeps them whole even where one alone cannot fit.
  const stripCls = classesAt(classic, classic.indexOf("<div", Math.max(0, classic.indexOf(FIT_STRIP_OPEN)))) ?? [];
  const stripParts = ["{t.common.freeExitLabel}</span>", "{graceLabel}</span>", "{`· ${t.dialog.noFee}`}</span>"].map((content) => spanClass(content) ?? []);
  const fontSizes = W.tw.slice(Math.max(0, W.tw.indexOf("fontSize: {")));
  const microRung = fontSizes.slice(Math.max(0, fontSizes.indexOf("micro:")));
  /** A spacing class's value from the Tailwind config's scale, or NaN when the list holds none with that head. */
  const space = (cls: string[], head: string) => {
    const c = cls.find((x) => x.startsWith(head));
    return c ? numAfter(spacing, `"${c.slice(head.length)}": "`) : Number.NaN;
  };
  /** A strip's gap on one axis: its own (gap-x-, gap-y-), or the one both axes share. */
  const stripGap = (cls: string[], axis: string) => {
    const own = space(cls, `gap-${axis}-`);
    return Number.isFinite(own) ? own : space(cls.filter((x) => !x.startsWith("gap-x-") && !x.startsWith("gap-y-")), "gap-");
  };
  const ST = {
    padX: space(stripCls, "px-"), padY: space(stripCls, "py-"), gapX: stripGap(stripCls, "x"), gapY: stripGap(stripCls, "y"),
    micro: numAfter(microRung, `["`), microLine: numAfter(microRung, `lineHeight: "`),
  };
  const stripShape = {
    flex: stripCls.includes("flex"), edge: stripCls.includes("border"), parts: stripParts.every((c) => c.length > 0),
    mono: stripParts.every((c) => c.includes("font-mono")),
  };
  /** Whether a strip with these classes wraps between its parts, and whether a nowrap (its own, or every part's) holds them whole. */
  const stripRules = (cls: string[]) => ({
    whole: cls.includes("whitespace-nowrap") || stripParts.every((c) => c.includes("whitespace-nowrap")),
    wraps: cls.includes("flex-wrap"),
  });
  // S6 A8g · the free window's bound, from market-config's own refusal (`g > 60`, in minutes): the strip's countdown at its
  // longest is `${bound}:00`, which 5.strip lays out and 5.model holds to FIT_STRIP_CLOCK, the longest the records quote.
  const configCode = W.files.get(FIT_CONFIG) ?? "";
  const guardAt = configCode.indexOf(FIT_GRACE_GUARD);
  const graceMax = guardAt < 0 ? Number.NaN : numAfter(configCode.slice(guardAt, configCode.indexOf("return", guardAt)), "g > ");
  const graceClock = Number.isFinite(graceMax) ? `${graceMax}:00` : "";
  const stripClock = graceClock || FIT_STRIP_CLOCK;
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
  say(`     the model: ${j(M)} · the body's features: ${j(features)} · the button's content at ${PHONE}: ${C320}px on /positions, ${H320}px in the holder block · below ${M.xs} the free note is ${noteHidden ? "left out" : "drawn"} and the label ${wraps ? (keep ? "may wrap, CJK kept whole" : "may wrap") : "keeps one line"} · the holder block's stacked row (S6 A8d): ${j(S)}${figureWraps ? ", its note may go under the figure" : ""} · the wrap where a host does not stack (S6 A8g): ${j(L)}${wrapFigure ? ", its note may go under the figure" : ""} · the free strip (S6 A8g): ${j(ST)}, ${j(stripRules(stripCls))}, its countdown at its longest ${graceClock || "unread"} (the free window's bound, ${graceMax} minutes)`);
  const stackValues = Object.entries(S).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  const listValues = Object.entries(L).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  const stripValues = Object.entries(ST).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  ok("5.model · the model reads its facts from source — the button's type, padding, gap, border, letter-spacing and height and the body's font features from the stylesheet, the note's size and margin from today's markup, the page's gutter, `xs` and the holder block's paddings from the Tailwind config and the two pages — and its glyphs and their alternates from the repo's own font files (JetBrains Mono at 0.6em); every word the row draws exists in en, sw and zh, and every glyph is in the fonts; and (S6 A8d) the stacked phone row is read whole: the holder block alone asks for it, today's markup carries its class once, and the stylesheet writes its rule in a phone block opened by the house phone query alone and its density reason, ending below `sm`, each value from its own declaration — its rung (a control-height token), line height, row gap and column gap (a spacing token) — and its shape; and (S6 A8g) the wrap where a host does not stack is read whole: today's markup gives every host that does not ask for the stack the wrap class, and the stylesheet writes its rule in a phone block of its own, opened by the house phone query alone and its density reason, ending below `sm` — the figure's lines at the right end on one baseline, the note's margin given way to a column gap from the spacing scale; and the free strip is read from today's markup: a flex row with its edge, its padding and its gaps on the spacing scale, its three parts in the mono face at sizes the type ladder or the markup states, its countdown at its longest the free window's bound as market-config's own refusal states it, which must be the longest §5 and the records lay out (FIT_STRIP_CLOCK); and every token these rules read (the rungs and the spacing scale) from its one declaration outside the stylesheet's comments — declared twice it reads as none",
    values.length === 0 && Object.values(pinned).every(Boolean) && unworded.length === 0 && glyphless.length === 0 && M.xs > PHONE && H320 > 0
      && stackValues.length === 0 && S.bound < M.sm && Object.values(stackShape).every(Boolean)
      && listValues.length === 0 && L.bound < M.sm && Object.values(wrapShape).every(Boolean) && stripValues.length === 0 && Object.values(stripShape).every(Boolean)
      && graceClock === FIT_STRIP_CLOCK,
    j({ values, pinned, unworded, glyphless: glyphless.slice(0, 3), stackValues, S, stackShape, listValues, L, wrapShape, stripValues, ST, stripShape, graceMax }));
  ok("5.classes · today's markup carries one narrow-phone rule, below `xs` only: the free note is hidden there and inline from it; the label carries no class, so it keeps today's one line at every width (in the holder block's stacked phone row it has a line of its own, 5.stack); and the fee beside a paid price is drawn at every width",
    noteHidden && label !== null && label.length === 0 && feeNote.length > 0 && !feeNote.includes("hidden"), j({ note, label, feeNote }));
  const rowAt = (r: FitRow, C: number) => layout(r, C, wraps, keep);
  // ⭐ S6 A8g · TODAY'S ROW WHERE ITS HOST DOES NOT STACK. Below the wrap rule's phone bound every such host's figure is a
  // wrapping row: a row whose label, figure and note fit on one line keeps that line (the rule's column gap where the
  // note's own margin was), and one that does not keeps its label on the line and puts the note under the figure, at the
  // right end, the two lines (the figure's and the note's, each at its own line height) inside the button. Without the
  // class or the rule, with a second condition on its block, or from the bound up, the row is today's one line.
  const wrapOn = pinned.wrapClassed && wrapShape.block && wrapShape.phone;
  const listLayout = (r: FitRow, C: number, vw: number): { wrapped: boolean; room: number; block: number } => {
    const on = wrapOn && vw <= L.bound;
    const figure = r.figure ? runPx(r.figure, monoEm, M.font, track) : 0;
    const noteWidth = r.figure && r.note ? runPx(r.note, monoEm, M.notePx, track) : 0;
    const label = labelPx(r.label);
    const one = label + (r.figure ? M.gap + figure + (noteWidth ? (on ? L.colGap : M.noteMargin) + noteWidth : 0) : 0);
    if (one <= C || !on || !noteWidth || !wrapFigure) return { wrapped: false, room: C - one, block: M.font * M.lineHeight };
    return { wrapped: true, room: C - (label + M.gap + Math.max(figure, noteWidth)), block: M.font * M.lineHeight + M.notePx * M.lineHeight };
  };
  const freeAt = rows.filter((r) => r.free).map((r) => ({ r, f: rowAt(r, C320) }));
  const freeBad = freeAt.filter(({ f }) => f.lines !== 1 || f.spare < 0).map(({ r }) => `${r.loc} ${r.state} TZS ${r.stake}`);
  const leastFree = Math.min(...freeAt.map(({ f }) => f.spare));
  ok(`5.free · on /positions at ${PHONE} the free row — the free word or the selling word, then the whole stake, its note left out — holds ONE line inside the button's content in en, sw and zh for every stake on the grid, to the platform's maximum (least room left: ${leastFree.toFixed(1)}px)`,
    freeAt.length > 0 && freeBad.length === 0, freeBad.slice(0, 3).join(" | "));
  // S6 A8g · …each inside the button's CONTENT now: a row that cannot hold one line there puts its fee under its figure.
  const otherAt = rows.filter((r) => !r.free).map((r) => ({ r, f: rowAt(r, C320), g: listLayout(r, C320, PHONE) }));
  const otherBad = otherAt.filter(({ f, g }) => f.lines !== 1 || !(g.room >= 0))
    .map(({ r, f, g }) => `${r.loc} ${r.state} TZS ${r.stake}: ${r.figure} ${r.note} (${f.lines} lines, ${g.wrapped ? "its fee under its figure, " : ""}${g.room.toFixed(1)}px)`);
  const leastBy = (loc: string) => Math.min(...otherAt.filter(({ r }) => r.loc === loc).map(({ g }) => g.room)).toFixed(1);
  const under320 = otherAt.filter(({ g }) => g.wrapped).length;
  ok(`5.paid · on /positions at ${PHONE} every other row — a price with its fee (selling or not; a legacy poll's paid window can charge 0), shut, and a lapsed free price — keeps its label on one line and sits inside the button's content: today's one line where it fits, and (S6 A8g) its fee under its figure where it does not (${under320} of them on the grid); the least room left is en ${leastBy("en")}, sw ${leastBy("sw")} and zh ${leastBy("zh")}px`,
    otherAt.length > 0 && otherBad.length === 0, otherBad.slice(0, 3).join(" | "));
  // ⭐ S6 A8d · THE HOLDER BLOCK'S STACKED PHONE ROW (5.stack). The holder block asks for it, so below the stylesheet's
  // phone bound its button takes the rung the rule names and lays the row out in lines, each piece kept whole by the
  // button's nowrap: the label on a line of its own; the figure on the next, with its note beside it when that line holds
  // both (the figure's column gap between them), or under it, on a line of the note's own size, when the figure's line
  // may wrap. Every piece must sit inside the button's content, and the lines, with the row gap between the label's and
  // the figure's, inside the rung less its border. Where nothing asks, where the phone block carries a second condition,
  // or above the bound, the row is today's one line and must fit there; from `sm` (and at `md`) every row is one
  // line inside the content.
  const stackOn = pinned.stackAsked && pinned.stackClassed && stackShape.block && stackShape.phone;
  const limit = S.height - 2 * M.border;
  const monoPx = (s: string, px: number) => runPx(s, monoEm, px, track);
  const stackBad: string[] = [];
  const stackLeast: Array<{ vw: number; loc: string; least: number }> = [];
  let threeLines = 0;
  let tallest = 0;
  for (const vw of STACK_WIDTHS) {
    const C = contentAt(vw, holderInset);
    const atWidth = rowsFor(!noteHidden || vw >= M.xs);
    for (const loc of LOCS) {
      let least = Number.POSITIVE_INFINITY;
      for (const r of atWidth.filter((x) => x.loc === loc)) {
        let room: number;
        if (stackOn && vw <= S.bound) {
          const figureWidth = r.figure ? monoPx(r.figure, M.font) : 0;
          const noteWidth = r.figure && r.note ? monoPx(r.note, M.notePx) : 0;
          let lines = 1;
          let block = M.font * S.lineHeight;
          room = C - Math.max(labelPx(r.label), figureWidth, noteWidth);
          if (r.figure) {
            lines = 2;
            block += S.rowGap + M.font * S.lineHeight;
            if (r.note) {
              const two = figureWidth + S.colGap + noteWidth;
              if (two <= C) room = Math.min(room, C - two);
              else if (figureWraps) { lines = 3; block += M.notePx * S.lineHeight; }
              else room = Math.min(room, C - two);
            }
          }
          if (lines === 3) threeLines++;
          tallest = Math.max(tallest, block);
          if (!(room >= 0) || !(block <= limit)) stackBad.push(`${vw}px ${r.loc} ${r.state} ${r.label} ${r.figure} ${r.note}: ${lines} line(s), ${block}px of ${limit}, ${room.toFixed(1)}px left`);
        } else {
          room = layout(r, C, false, false).spare;
          if (!(room >= 0)) stackBad.push(`${vw}px ${r.loc} ${r.state} ${r.label} ${r.figure} ${r.note}: one line, ${room.toFixed(1)}px left`);
        }
        least = Math.min(least, room);
      }
      stackLeast.push({ vw, loc, least });
    }
  }
  for (const vw of [M.sm, M.md]) {
    const C = contentAt(vw, holderInset);
    for (const r of rowsFor(true)) {
      const spare = layout(r, C, false, false).spare;
      if (!(spare >= 0)) stackBad.push(`${vw}px ${r.loc} ${r.state} ${r.label} ${r.figure} ${r.note}: one line, ${spare.toFixed(1)}px left`);
    }
  }
  const leastAt = (width: number) => LOCS.map((loc) => `${loc} ${(stackLeast.find((c) => c.vw === width && c.loc === loc)?.least ?? Number.NaN).toFixed(1)}`).join(", ");
  ok(`5.stack · in the question page's holder block (S6 A8d) below ${S.bound}px the button takes the ${S.height}px rung and stacks — the label on one line, the figure on the next with its note beside it or under it, every piece whole — and at ${STACK_WIDTHS.join(", ")}px every row on the grid, in en, sw and zh, sits inside the button's content (least room left: at 320 ${leastAt(320)}; at 360 ${leastAt(360)}; at 412 ${leastAt(412)}px), ${threeLines} of them on three lines and none taller than ${tallest.toFixed(2)} of the ${limit}px inside the rung; from ${M.sm} every row is one line inside the content`,
    stackBad.length === 0 && Number.isFinite(limit) && stackLeast.length === STACK_WIDTHS.length * LOCS.length && stackLeast.every((c) => Number.isFinite(c.least)),
    stackBad.slice(0, 3).join(" | "));
  // ⭐ S6 A8g · TODAY'S ROW ON /positions (5.list). Below the wrap rule's bound a row keeps its one line where its label,
  // figure and note fit, and otherwise its note goes under its figure, at the right end; every row must sit inside the
  // button's content and its lines inside the button less its border. From `sm` every row is one line inside the content
  // (one column), and from `md` in each of the page's two columns.
  const listBad: string[] = [];
  const listLeast: Array<{ vw: number; loc: string; least: number }> = [];
  let listUnder = 0;
  let listTallest = 0;
  for (const vw of LIST_WIDTHS) {
    const C = contentAt(vw, 0);
    const atWidth = rowsFor(!noteHidden || vw >= M.xs);
    for (const loc of LOCS) {
      let least = Number.POSITIVE_INFINITY;
      for (const r of atWidth.filter((x) => x.loc === loc)) {
        const f = listLayout(r, C, vw);
        if (f.wrapped) listUnder++;
        listTallest = Math.max(listTallest, f.block);
        if (!(f.room >= 0) || !(f.block <= M.height - 2 * M.border)) listBad.push(`${vw}px ${r.loc} ${r.state} ${r.label} ${r.figure} ${r.note}: ${f.wrapped ? "its note under its figure" : "one line"}, ${f.room.toFixed(1)}px left`);
        least = Math.min(least, f.room);
      }
      listLeast.push({ vw, loc, least });
    }
  }
  for (const vw of [M.sm, M.md]) {
    // From `md` the list is two columns, with the grid's own gap (gap-3, pinned in 5.model) between them.
    const C = vw < M.md ? contentAt(vw, 0) : (vw - 2 * M.gutter - M.gutter) / 2 - 2 * M.border - 2 * M.padding;
    for (const r of rowsFor(true)) {
      const spare = layout(r, C, false, false).spare;
      if (!(spare >= 0)) listBad.push(`${vw}px ${r.loc} ${r.state} ${r.label} ${r.figure} ${r.note}: one line, ${spare.toFixed(1)}px left`);
    }
  }
  const listAt = (width: number) => LOCS.map((loc) => `${loc} ${(listLeast.find((c) => c.vw === width && c.loc === loc)?.least ?? Number.NaN).toFixed(1)}`).join(", ");
  ok(`5.list · on /positions (S6 A8g) below ${L.bound}px a row keeps today's one line where its label, figure and note fit, and where they do not its note goes under its figure, at the right end, inside the button — and at ${LIST_WIDTHS.join(", ")}px every row on the grid, in en, sw and zh, sits inside the button's content (least room left: at 320 ${listAt(320)}; at 360 ${listAt(360)}; at 383 ${listAt(383)}px), ${listUnder} of them with the note under the figure and none taller than ${listTallest.toFixed(2)} of the ${M.height - 2 * M.border}px inside the button; from ${M.sm} every row is one line inside the content, and from ${M.md} in each of the two columns`,
    listBad.length === 0 && listLeast.length === LIST_WIDTHS.length * LOCS.length && listLeast.every((c) => Number.isFinite(c.least)),
    listBad.slice(0, 3).join(" | "));
  // ⭐ S6 A8g · THE FREE STRIP (5.strip), above the button on both hosts and as wide as the button's column. Each of its parts
  // must stay whole, and the strip wraps between them when they cannot share a line, so no part ever breaks inside and
  // every part fits the strip's content. Laid out with the countdown at its longest.
  const stripWord = (loc: string, section: string, key: string): string => {
    const v = (((W.words[loc] ?? {}) as Record<string, Record<string, unknown> | undefined>)[section] ?? {})[key];
    return typeof v === "string" ? v : "";
  };
  /** One language's three parts as the strip draws them: each one's width, the narrowest it can be drawn and its line. */
  const stripRun = (loc: string, clock: string) => [stripWord(loc, "common", "freeExitLabel"), clock, `· ${stripWord(loc, "dialog", "noFee")}`]
    .map((text, i) => {
      const cls = stripParts[i] ?? [];
      const px = cls.includes("text-micro") ? ST.micro : numAfter(cls.find((c) => c.startsWith("text-[")) ?? "", "text-[");
      const trackClass = cls.find((c) => c.startsWith("tracking-["));
      const tracking = trackClass ? numAfter(trackClass, "tracking-[") * px : 0;
      const shown = cls.includes("uppercase") ? text.toUpperCase() : text;
      const run = (s: string) => runPx(s, monoEm, px, tracking);
      return { width: run(shown), min: longestPiece(shown, run), line: cls.includes("text-micro") ? ST.microLine : px * M.lineHeight };
    });
  /** The strip at a viewport, `inset` inside the page's gutter, its parts laid out as the classes `cls` draw them. */
  const stripAt = (vw: number, inset: number, run: Array<{ width: number; min: number; line: number }>, cls: string[]) => {
    const { whole, wraps: wrapsBetween } = stripRules(cls);
    const gapX = stripGap(cls, "x");
    const gapY = stripGap(cls, "y");
    const C = vw - 2 * M.gutter - inset - 2 * HOLDER_EDGE - 2 * space(cls, "px-");
    const total = run.reduce((s, p) => s + p.width, 0) + gapX * (run.length - 1);
    const line = Math.max(...run.map((p) => p.line));
    const tall = (lines: number) => lines * line + (lines - 1) * gapY + 2 * space(cls, "py-") + 2 * HOLDER_EDGE;
    if (total <= C) return { lines: 1, room: C - total, broken: [] as number[], sizes: run.map((p) => p.width), height: tall(1) };
    if (wrapsBetween) {
      // A row that wraps: a part that cannot share a line moves to the next one whole (the browser collects each line by its
      // parts' own widths); a part wider than the whole strip has a line of its own, where it breaks inside, unless a
      // nowrap holds it whole, and then it runs past the strip.
      let lines = 1;
      let cur = -1;
      let room = Number.POSITIVE_INFINITY;
      const broken: number[] = [];
      run.forEach((p, i) => {
        const breaks = !whole && p.width > C;
        if (breaks) broken.push(i);
        const w = breaks ? Math.max(p.min, C) : p.width;
        if (cur >= 0 && cur + gapX + w <= C) cur += gapX + w;
        else {
          if (cur >= 0) { room = Math.min(room, C - cur); lines++; }
          cur = w;
        }
      });
      room = Math.min(room, C - cur);
      return { lines, room, broken, sizes: run.map((p) => p.width), height: tall(lines) };
    }
    if (!whole) {
      // A row that does not wrap: the browser shrinks its parts, each down to its widest word, and a part drawn narrower
      // than itself breaks inside.
      const sizes = flexShrink(run.map((p) => p.width), run.map((p) => p.min), C - gapX * (run.length - 1));
      const broken = sizes.map((x, i) => (x < run[i].width - 1e-9 ? i : -1)).filter((i) => i >= 0);
      return { lines: broken.length ? 2 : 1, room: C - (sizes.reduce((t, x) => t + x, 0) + gapX * (run.length - 1)), broken, sizes, height: tall(broken.length ? 2 : 1) };
    }
    // Whole parts on one line that does not wrap: they run past the strip.
    return { lines: 1, room: C - total, broken: [] as number[], sizes: run.map((p) => p.width), height: tall(1) };
  };
  const stripBad: string[] = [];
  const stripTwo: string[] = [];
  let stripLeast = Number.POSITIVE_INFINITY;
  let stripTallest = 0;
  for (const [host, inset] of [["/positions", 0], ["the holder block", holderInset]] as const) {
    for (const loc of LOCS) {
      const run = stripRun(loc, stripClock);
      const two: number[] = [];
      for (const vw of STRIP_WIDTHS) {
        const s = stripAt(vw, inset, run, stripCls);
        stripLeast = Math.min(stripLeast, s.room);
        stripTallest = Math.max(stripTallest, s.height);
        if (s.lines > 1) two.push(vw);
        if (s.broken.length > 0 || !(s.room >= 0)) stripBad.push(`${host} ${vw}px ${loc}: ${s.broken.length ? `part ${s.broken.join(" and ")} breaks inside` : `${s.room.toFixed(1)}px left`}`);
      }
      if (two.length > 0) stripTwo.push(`${loc} in ${host} at ${two.join(", ")}px`);
    }
  }
  ok(`5.strip · the free strip above the button (S6 A8g) keeps each of its parts whole — the free word, the countdown (at its longest, ${stripClock}) and the note — and wraps only between them: at ${STRIP_WIDTHS.join(", ")}px on /positions and in the question page's holder block, in en, sw and zh, no part breaks inside and every part fits the strip's content (least room left ${stripLeast.toFixed(1)}px); it takes two lines only ${stripTwo.join("; ") || "nowhere"}, at most ${stripTallest.toFixed(1)}px tall`,
    stripRules(stripCls).wraps && stripBad.length === 0 && Number.isFinite(stripLeast), stripBad.slice(0, 3).join(" | "));
  // CONTROL — today's rules from 360 applied at 320 (the note drawn), as the browser measured them.
  const measured = rowsFor(true).filter((r) => r.state === "free" && r.stake === 3_600);
  const at320 = Object.fromEntries(measured.map((r) => [r.loc, layout(r, C320, false, false)]));
  const at360 = Object.fromEntries(measured.map((r) => [r.loc, layout(r, contentAt(M.xs, 0), false, false)]));
  // S6 A8d · and the holder block's half: the same rows on today's one line in the holder block at 360, where the v2
  // baseline (a TZS 1,500 ticket, the same printed width) measured the Swahili row 67px past the button's content and the
  // English row 14px into its padding.
  const H360 = contentAt(M.xs, holderInset);
  const holder360 = Object.fromEntries(measured.map((r) => [r.loc, layout(r, H360, false, false)]));
  // S6 A8g · and the two defects A8g closes: on today's one line on /positions the Swahili free row for TZS 1,000,000 at
  // 360 and the Chinese legacy paid row for TZS 1,000,000 at 30% (TZS 700,000 −300,000) at 320 run past the button's
  // content (VODACOM-PLAN §0h point 37 (h)); and the free strip with the classes it had before A8g (a row that does not
  // wrap), whose Swahili parts the browser shrinks in the holder block at 360 until the free word and the note break
  // inside — the v2 baseline measured them 112 and 66px wide (its countdown four characters, 4:59).
  const bigFree = rowsFor(true).find((r) => r.loc === "sw" && r.state === "free" && r.stake === PLATFORM_MAX_STAKE);
  const bigPaid = rows.find((r) => r.loc === "zh" && r.state === "paid" && r.stake === PLATFORM_MAX_STAKE && r.figure === `TZS ${formatNumber(700_000)}`);
  const bigFree360 = bigFree ? layout(bigFree, contentAt(M.xs, 0), false, false).spare : Number.NaN;
  const bigPaid320 = bigPaid ? layout(bigPaid, C320, false, false).spare : Number.NaN;
  const stripBefore = stripAt(M.xs, holderInset, stripRun("sw", "4:59"), FIT_STRIP_BEFORE.split(" "));
  ok(`5.control · CONTROL · with today's rules at ${PHONE} (the note drawn) the model sees what the browser measured: the Swahili free row for TZS 3,600 is wider than the button's ${C320}px content (the model reads ${at320.sw ? (C320 - at320.sw.spare).toFixed(1) : "?"}px of row; the browser measured 277px), the English and Chinese rows fit, and from ${M.xs} all three fit — so 5.free can see the defect it was written for; and on today's one line in the holder block at ${M.xs} (S6 A8d) the Swahili and English rows run past the button's ${H360}px content (the model reads sw ${holder360.sw ? holder360.sw.spare.toFixed(1) : "?"}px and en ${holder360.en ? holder360.en.spare.toFixed(1) : "?"}px left; the v2 baseline measured 67 and 14px past it) — so 5.stack can see the defect it was written for; and (S6 A8g) on today's one line on /positions the Swahili free row for TZS 1,000,000 at ${M.xs} and the Chinese legacy paid row for TZS 1,000,000 at 30% at ${PHONE} run past the button's content (the model reads ${bigFree360.toFixed(1)} and ${bigPaid320.toFixed(1)}px left) — so 5.list and 5.paid can see the defects they were written for — and the free strip with its classes before A8g, in the holder block at ${M.xs} in Swahili, is squeezed until its free word and its note break inside (the model draws them ${(stripBefore.sizes[0] ?? Number.NaN).toFixed(1)} and ${(stripBefore.sizes[2] ?? Number.NaN).toFixed(1)}px wide; the v2 baseline measured 112 and 66) — so 5.strip can see the defect it was written for`,
    measured.length === 3 && (at320.sw?.spare ?? 0) < 0 && (at320.en?.spare ?? -1) >= 0 && (at320.zh?.spare ?? -1) >= 0
      && LOCS.every((l) => (at360[l]?.spare ?? -1) >= 0)
      && (holder360.sw?.spare ?? 0) < 0 && (holder360.en?.spare ?? 0) < 0
      && bigFree360 < 0 && bigPaid320 < 0 && stripBefore.broken.join() === "0,2"
      && Math.abs((stripBefore.sizes[0] ?? 0) - 112) < 0.5 && Math.abs((stripBefore.sizes[2] ?? 0) - 66) < 0.5,
    j({ at320, at360, holder360, bigFree360, bigPaid320, stripBefore }));

  // ⭐ 2026-10-06 · THE TICKET'S "OPENED" LINE KEEPS ITS DATE WHOLE (5.opened), on both hosts' rows: the question page's
  // holder block and /positions' card. The A8d/A8g tiles measured the holder block's date broken over two lines at 320 in
  // Swahili: the word and the date were one run of text. Now the date is one nowrap unit after the word, joined by a
  // written space OUTSIDE it (a leading space inside a nowrap unit is no break opportunity), so a narrow phone breaks the
  // line before the date and never inside it. Read from source, both hosts, decommented.
  {
    const OPENED_RUN = "{t.market.opened} {";
    const rows: { rel: string; want: string }[] = [
      { rel: MARKET, want: `<span>{t.market.opened}{" "}<span className="whitespace-nowrap">{fmtTime(p.placedAt)}</span></span>` },
      { rel: POSITION_CARD, want: `<span>{t.market.opened}{" "}<span className="whitespace-nowrap">{formatDateTime(placedAt)}</span></span>` },
    ];
    const bad: string[] = [];
    for (const r of rows) {
      const src = W.files.get(r.rel) ?? "";
      const n = src.split(r.want).length - 1;
      if (n !== 1) bad.push(`${r.rel}: the word-then-whole-date units occur ${n} times (want 1)`);
      if (src.includes(OPENED_RUN)) bad.push(`${r.rel}: the word and the date run as one text again`);
    }
    ok("5.opened · the ticket's opened line keeps its date whole on both hosts (the question page's holder block and /positions' card): the date is one nowrap unit after the word, joined by a written space outside it, so a narrow phone breaks the line before the date and never inside it (the A8d/A8g tiles measured the holder block's date broken over two lines at 320 in Swahili)",
      bad.length === 0, bad.join("; "));
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// §6 · THE DIALOGS' FIT (S6 A8f)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * ⭐ EVERY MONEY FIGURE IN THE SELL CONFIRM, AND IN THE RESULT A SALE OPENS, STAYS WHOLE, AND EACH ROW REFLOWS — §5's model of
 * the repo's own fonts, given the two dialogs' geometry from their own markup and the Modal's. Seen in a real browser first
 * (2026-10-03, a question page in Swahili at 390): the confirm drew "Utapokea" over "TZS" over "1,500". Its receive row is the
 * figure's column beside the fee column, and when the two could not share the line the browser shrank both: the fee column
 * stopped at its whole fee and note, and the figure's column broke the figure at its space. The v2 parity baseline
 * (`7c859cdf`) holds the same at 360 — the Swahili figure's column 104px, the figure on two lines; the English one whole,
 * 2.8px to spare — and 6.control reads both. Since A8f (DESIGN_AUTHORITY §M4: money is mono, and it never reflows):
 *   · the confirm's figure is `.amount`, one object, and its row wraps: the fee column moves below the figure and grows to
 *     the box's width, its words still at the right edge; beside the figure the fee keeps a clear space before it, so two
 *     figures never run together; the fee and its note were `.amount` already;
 *   · the result sets every money figure in its title as one amount (`wholeFigures`, which the sale's result asks for, from
 *     its own module since S6 A8h), in the
 *     mono face the model reads — the title's own face, Sora, is not among the repo's fonts; its detail rows already wrap.
 * Over en, sw and zh × 320, 340, 360, 390, 412, 430, 768 and 1280 × §5's stakes to the platform's maximum, free and paid at
 * every whole percent to 30 (`cashOutValue`, the oracle), in both looks (their words differ, never their figures): each
 * line of the receive row holds its unbreakable pieces (6.confirm), each button its label (6.button), and the result's title
 * and detail rows their figures (6.result). The Modal's gutter and padding are read from `ui/modal.tsx`, its panel's edge
 * from the material layer (`.mat-modal`, motion.css), and each dialog's width, padding and classes from its own file.
 */
const SELL_MODAL = "src/components/markets/sell-confirm-modal.tsx";
const RESULT_MODAL = "src/components/markets/operation-result-modal.tsx";
/** S6 A8h — the result a sale opens, out of the Sell button into its own module (`SellResultModal`): what asks for whole figures. */
const SELL_RESULT = "src/components/markets/sell-result.tsx";
const DIALOG_SHELL = "src/components/ui/modal.tsx";
/** The panel's edge is its material's (`.mat-modal`, motion.css): read from source, outside the plantable world. */
const DIALOG_MATERIAL = readRaw("src/app/motion.css");
const { formatTzs } = await import("../src/lib/utils.ts");
const DIALOG_WIDTHS = [320, 340, 360, 390, 412, 430, 768, 1280];
/** Every whole percent a frozen poll's exit fee can be: `cashOutValue` clamps the rate to [0, 0.30]. */
const DIALOG_RATES = Array.from({ length: 31 }, (_, i) => i / 100);
const DIALOG_LOCS = ["en", "sw", "zh"];
/** The words the two dialogs draw, by section: `journey.sellKeep` is the journey look's keep button. */
const DIALOG_WORDS: Record<string, string[]> = {
  dialog: ["youReceive", "earlyExitFee", "noFee", "freeExitWindow", "sellLabel", "selling", "keepPosition"],
  journey: ["sellKeep"],
  common: ["returned", "ticket", "earlyExitFee", "none", "doneSawa", "close"],
};
const DIALOG_MINUS = String.fromCharCode(0x2212);
const DIALOG_DOT = String.fromCharCode(0xb7);
/** The confirm's receive row as A8f writes it — the row, the figure, the fee column, the fee, its note — which §6's plants move. */
const RECEIVE_ROW = `className="flex flex-wrap items-baseline justify-between gap-y-2"`;
const RECEIVE_FIGURE = `className="amount font-bold text-[24px] leading-none text-text"`;
const FEE_COLUMN = `className="grow text-right"`;
const FEE_FIGURE = `className="pl-3 font-bold text-title-sm amount leading-none"`;
const FEE_NOTE = `className="mt-1 amount text-micro text-text-subtle"`;
/** The result's figure pattern and helper, pinned whole as the suite squashes them, so nothing can be added to either. */
const FIGURE_LINE = `const FIGURE = /(${DIALOG_MINUS}?TZS ${DIALOG_MINUS}?[0-9][0-9,]*)/;`;
const WHOLE_FIGURES = `function withWholeFigures(title: string) {return title.split(FIGURE).map((part, i) => (i % 2 === 1 ? <span key={i} className="amount">{part}</span> : part));}`;
const WHOLE_TITLE = ">{wholeFigures ? withWholeFigures(title) : title}<";
/** The confirm's two buttons as today's markup draws them, each with its label: the gold sell and the ghost keep. */
const GOLD_BUTTON = `className="btn btn-gold btn-lg w-full"`;
const GOLD_LABEL = "{pending ? t.dialog.selling : `${t.dialog.sellLabel} · ${formatTzs(value)}`}";
const KEEP_BUTTON = `className="btn btn-ghost btn-lg w-full"`;
const KEEP_LABEL = "{keepLabel ?? t.dialog.keepPosition}";
type DialogPrice = { stake: number; free: boolean; value: number; rate: number | null };
let DIALOG_PRICED: DialogPrice[] | null = null;
/** What `cashOutValue` prices each of §5's stakes at — in its free window, and in a paid one at every whole percent to 30. */
async function dialogPrices(): Promise<DialogPrice[]> {
  if (DIALOG_PRICED) return DIALOG_PRICED;
  const out: DialogPrice[] = [];
  for (const stake of FIT_STAKES) {
    out.push({ stake, free: true, value: (await fitPrice(stake, 0.1, true)).value, rate: null });
    for (const rate of DIALOG_RATES) out.push({ stake, free: false, value: (await fitPrice(stake, rate, false)).value, rate });
  }
  DIALOG_PRICED = out;
  return out;
}
/** Widths measured once per text, size, tracking and face: the grid draws the same words and figures many times over. */
const DIALOG_WIDTH_MEMO = new Map<string, number>();
const memoRun = (face: string, s: string, em: (cp: number) => number, px: number, track: number): number => {
  const key = `${face}|${px}|${track}|${s}`;
  const had = DIALOG_WIDTH_MEMO.get(key);
  if (had !== undefined) return had;
  const w = runPx(s, em, px, track);
  DIALOG_WIDTH_MEMO.set(key, w);
  return w;
};
const monoRun = (s: string, px: number, track: number) => memoRun("mono", s, monoEm, px, track);
/** The class tokens of the tag that opens at `open`: [] for a bare tag, null when there is none. */
function classesAt(markup: string, open: number): string[] | null {
  if (open < 0) return null;
  const head = markup.slice(open, markup.indexOf(">", open) + 1);
  const q = head.indexOf(`className="`);
  return q < 0 ? [] : head.slice(q + 11, head.indexOf(`"`, q + 11)).split(" ").filter(Boolean);
}
/** Where the tag that holds `content` opens: the last `<tag` before it, or -1. */
const openBefore = (markup: string, content: string, tag: string): number => {
  const found = markup.indexOf(content);
  return found < 0 ? -1 : markup.lastIndexOf(`<${tag}`, found);
};
/**
 * CSS flexbox's resolution of a line that overflows — every item flex-shrink 1, each held at its min-content by
 * `min-width: auto` — so the sizes a browser gives the figure's column and the fee column when they must share a line.
 */
function flexShrink(bases: number[], mins: number[], room: number): number[] {
  const n = bases.length;
  const sizes = [...bases];
  const frozen = bases.map(() => false);
  for (let pass = 0; pass <= n && !frozen.every(Boolean); pass++) {
    const free = room - bases.reduce((s, b, i) => s + (frozen[i] ? sizes[i] : b), 0);
    const scaled = bases.reduce((s, b, i) => s + (frozen[i] ? 0 : b), 0);
    const target = bases.map((b, i) => (frozen[i] ? sizes[i] : b + (scaled > 0 ? (free * b) / scaled : 0)));
    const clamped = target.map((x, i) => (frozen[i] ? sizes[i] : Math.max(x, mins[i])));
    const violation = clamped.reduce((s, c, i) => s + (frozen[i] ? 0 : c - target[i]), 0);
    for (let i = 0; i < n; i++) {
      if (frozen[i]) continue;
      if (violation <= 0 || clamped[i] > target[i]) frozen[i] = true;
      sizes[i] = clamped[i];
    }
  }
  return sizes;
}
type Classes = string[] | null;
type DialogFacts = {
  sp: (key: string) => number;
  lg: number; micro: number; microTrack: number; titleSm: number; titleSmTrack: number;
  btnBorder: number; btnNowrap: boolean; btnBody: boolean; btnPad: number; btnFont: number;
  goldTrack: number; primaryTrack: number; noTrack: number; ghostTrack: number;
  eyebrowEm: number; amountWhole: boolean; material: number; features: string[];
  gutter: number; pad: number; padLg: number; confirmMax: number;
  confirm: { eyeL: Classes; eyeR: Classes; figure: Classes; fee: Classes; note: Classes; left: Classes; row: Classes; box: Classes; right: Classes; gold: boolean; keep: boolean };
  result: {
    max: number; flush: boolean; inner: Classes; pad: number; padLg: number; title: Classes; titleWhole: boolean;
    figureRe: boolean; helper: boolean; label: Classes; value: Classes; detailRow: Classes;
  };
  asks: boolean;
  words: Record<string, unknown>;
};
const dialogFrom = (s: string, head: string) => { const a = s.indexOf(head); return a < 0 ? "" : s.slice(a); };
const dialogNum = (s: string, head: string) => { const a = s.indexOf(head); return a < 0 ? Number.NaN : Number.parseFloat(s.slice(a + head.length)); };
const dialogLine = (css: string, head: string) => {
  const a = css.indexOf(NL + head);
  if (a < 0) return "";
  const b = css.indexOf(NL, a + 1);
  return css.slice(a + 1, b < 0 ? css.length : b);
};
const dialogRule = (css: string, head: string) => {
  const a = css.indexOf(NL + head);
  if (a < 0) return "";
  const b = css.indexOf(`${NL}}`, a + 1);
  return b < 0 ? "" : css.slice(a + 1, b + 2);
};
/** Everything §6 reads, from the world handed in: the stylesheet, the Tailwind config, the Modal, both dialogs, the Sell button. */
function dialogFacts(W: World): DialogFacts {
  const css = W.css;
  const spacing = dialogFrom(W.tw, "spacing: {");
  const screens = dialogFrom(W.tw, "screens: {");
  const sizes = dialogFrom(W.tw, "fontSize: {");
  const sp = (key: string) => dialogNum(spacing, `"${key}": "`);
  const btn = dialogRule(css, ".btn {");
  const lgLine = dialogLine(css, ".btn-lg {");
  const amount = dialogLine(css, ".amount.amount {");
  const body = dialogRule(css, "body {");
  const featAt = body.indexOf("font-feature-settings:");
  const features = featAt < 0 ? [] : body.slice(featAt, body.indexOf(";", featAt)).split(`"`).filter((_, i) => i % 2 === 1);
  // The Modal: the centred dialog's gutter, and its panel's padding below and from lg.
  const shell = squash(W.files.get(DIALOG_SHELL) ?? "");
  const wrapAt = shell.indexOf(`sm:py-4" : "`);
  const wrap = wrapAt < 0 ? [] : shell.slice(wrapAt + 12, shell.indexOf(`"`, wrapAt + 12)).split(" ");
  const gutters = wrap.filter((c) => c.startsWith("px-"));
  const panelAt = shell.indexOf("mat-modal relative w-full ");
  const panel = panelAt < 0 ? [] : shell.slice(panelAt + 26, shell.indexOf("$", panelAt)).split(" ");
  const pads = panel.filter((c) => c.startsWith("p-"));
  const lgPads = panel.filter((c) => c.startsWith("lg:p-"));
  // The confirm: its receive row read outward from the two eyebrows, and its two buttons.
  const sq = squash(W.files.get(SELL_MODAL) ?? "");
  const eyeL = openBefore(sq, ">{t.dialog.youReceive}<", "p");
  const eyeR = openBefore(sq, ">{t.dialog.earlyExitFee}<", "p");
  const left = eyeL < 0 ? -1 : sq.lastIndexOf("<div", eyeL);
  const row = left > 0 ? sq.lastIndexOf("<div", left - 1) : -1;
  const box = row > 0 ? sq.lastIndexOf("<div", row - 1) : -1;
  const right = eyeR < 0 ? -1 : sq.lastIndexOf("<div", eyeR);
  const confirm = {
    eyeL: classesAt(sq, eyeL), eyeR: classesAt(sq, eyeR),
    figure: classesAt(sq, openBefore(sq, ">TZS {formatNumber(value)}<", "p")),
    fee: classesAt(sq, openBefore(sq, ">{isFree ? t.dialog.noFee : ", "p")),
    note: classesAt(sq, openBefore(sq, ">{isFree ? t.dialog.freeExitWindow : ", "p")),
    left: classesAt(sq, left), row: classesAt(sq, row), box: classesAt(sq, box), right: classesAt(sq, right),
    gold: sq.includes(GOLD_BUTTON) && sq.includes(GOLD_LABEL),
    keep: sq.includes(KEEP_BUTTON) && sq.includes(KEEP_LABEL),
  };
  // The result: its own padding (the panel's is none), its title and the helper behind it, and a detail row.
  const rq = squash(W.files.get(RESULT_MODAL) ?? "");
  const hold = rq.indexOf("onPointerMove={onPointerMoveHold}");
  const inner = hold < 0 ? null : classesAt(rq, rq.lastIndexOf("<div", hold));
  const innerPads = (inner ?? []).filter((c) => c.startsWith("p-"));
  const innerLg = (inner ?? []).filter((c) => c.startsWith("lg:p-"));
  const titleWhole = rq.includes(WHOLE_TITLE);
  const label = openBefore(rq, ">{d.label}<", "p");
  const column = label < 0 ? -1 : rq.lastIndexOf("<div", label);
  const result = {
    max: dialogNum(rq, "maxWidth={"), flush: rq.includes(`panelClassName="overflow-hidden !p-0"`), inner,
    pad: innerPads.length === 1 ? sp(innerPads[0].slice(2)) : Number.NaN,
    padLg: innerLg.length === 1 ? sp(innerLg[0].slice(5)) : Number.NaN,
    title: classesAt(rq, openBefore(rq, titleWhole ? WHOLE_TITLE : ">{title}<", "h2")), titleWhole,
    figureRe: occurrences(rq, FIGURE_LINE) === 1, helper: occurrences(rq, WHOLE_FIGURES) === 1,
    label: classesAt(rq, label), value: classesAt(rq, openBefore(rq, ">{d.value}<", "p")),
    detailRow: column > 0 ? classesAt(rq, rq.lastIndexOf("<div", column - 1)) : null,
  };
  // The sale's one result asks for whole figures: a bare `wholeFigures`, or `={true}`. Since S6 A8h it is drawn from its own
  // module (`SellResultModal`, which the shell's host and the Sell button's fallback both draw), so that is where it is read.
  const sale = squash(W.files.get(SELL_RESULT) ?? "");
  const resultAt = sale.indexOf("<OperationResultModal");
  const element = resultAt < 0 ? "" : sale.slice(resultAt, sale.indexOf("/>", resultAt) + 2);
  const asks = occurrences(sale, "<OperationResultModal") === 1 && !element.includes("wholeFigures={false}")
    && (element.includes("wholeFigures/>") || element.includes("wholeFigures ") || element.includes("wholeFigures={true}"));
  return {
    sp, lg: dialogNum(screens, `lg: "`),
    micro: dialogNum(dialogFrom(sizes, "micro:"), `["`), microTrack: dialogNum(dialogFrom(sizes, "micro:"), `letterSpacing: "`),
    titleSm: dialogNum(dialogFrom(sizes, `"title-sm":`), `["`), titleSmTrack: dialogNum(dialogFrom(sizes, `"title-sm":`), `letterSpacing: "`),
    btnBorder: dialogNum(btn, "border: "), btnNowrap: btn.includes("white-space: nowrap;"), btnBody: btn.includes("font-family: var(--font-body);"),
    btnPad: dialogNum(lgLine, "padding: 0 "), btnFont: dialogNum(lgLine, "font-size: "),
    goldTrack: dialogNum(dialogRule(css, ".btn-gold {"), "letter-spacing: "),
    primaryTrack: dialogNum(dialogRule(css, ".btn-primary {"), "letter-spacing: "),
    noTrack: dialogNum(dialogRule(css, ".btn-no {"), "letter-spacing: "),
    ghostTrack: dialogRule(css, ".btn-ghost {").includes("letter-spacing") ? Number.NaN : 0,
    eyebrowEm: dialogNum(dialogFrom(css, ".eyebrow.eyebrow,"), "{ letter-spacing: "),
    amountWhole: amount.includes("white-space: nowrap;") && amount.includes("letter-spacing: 0;"),
    material: dialogNum(dialogLine(DIALOG_MATERIAL, ".mat-modal "), "border: "), features,
    gutter: gutters.length === 1 ? sp(gutters[0].slice(3)) : Number.NaN,
    pad: pads.length === 1 ? sp(pads[0].slice(2)) : Number.NaN,
    padLg: lgPads.length === 1 ? sp(lgPads[0].slice(5)) : Number.NaN,
    confirmMax: dialogNum(sq, "maxWidth={"),
    confirm, result, asks, words: W.words,
  };
}
const dialogWord = (F: DialogFacts, loc: string, section: string, key: string): string => {
  const v = (((F.words[loc] ?? {}) as Record<string, Record<string, unknown> | undefined>)[section] ?? {})[key];
  return typeof v === "string" ? v : "";
};
/** A size from the class list: a hand-typed one, or the type ladder's rung. */
const dialogPx = (tokens: string[], F: DialogFacts): number => {
  for (const c of tokens) if (c.startsWith("text-[") && c.endsWith("px]")) return Number.parseFloat(c.slice(6, -3));
  return tokens.includes("text-micro") ? F.micro : tokens.includes("text-title-sm") ? F.titleSm : Number.NaN;
};
/** A run's letter-spacing: `.eyebrow.eyebrow` follows `.amount.amount` in the stylesheet at the same specificity, so it wins
 *  where both sit; then `.amount`'s none; then the rung's own (each rung of the type ladder is a tuple with its tracking). */
const dialogTrack = (tokens: string[], px: number, F: DialogFacts): number =>
  tokens.includes("eyebrow") ? F.eyebrowEm * px : tokens.includes("amount") ? 0
    : tokens.includes("text-micro") ? F.microTrack : tokens.includes("text-title-sm") ? F.titleSmTrack : 0;
const isWhole = (tokens: string[]) => tokens.includes("amount") || tokens.includes("whitespace-nowrap");
const isMono = (tokens: Classes) => !!tokens && (tokens.includes("font-mono") || tokens.includes("amount"));
const textPx = (s: string, tokens: string[], F: DialogFacts) => {
  const px = dialogPx(tokens, F);
  return monoRun(tokens.includes("uppercase") ? s.toUpperCase() : s, px, dialogTrack(tokens, px, F));
};
const longestPiece = (s: string, w: (t: string) => number): number => {
  let best = 0;
  for (const piece of s.split(" ")) {
    const chars = [...piece];
    if (chars.some((ch) => (ch.codePointAt(0) ?? 0) >= CJK_FROM)) {
      for (const ch of chars) best = Math.max(best, w(ch));
    } else best = Math.max(best, w(piece));
  }
  return best;
};
/** The widest piece of `s` no line can split: all of it when its element is whole, else its longest word (a CJK glyph alone). */
const unbreakable = (s: string, tokens: string[], F: DialogFacts) => {
  if (isWhole(tokens)) return textPx(s, tokens, F);
  const px = dialogPx(tokens, F);
  const track = dialogTrack(tokens, px, F);
  return longestPiece(tokens.includes("uppercase") ? s.toUpperCase() : s, (x) => monoRun(x, px, track));
};
/** The space a class list sets before its element's text — a left padding or margin, from the spacing scale. */
const leadOf = (tokens: string[], F: DialogFacts) =>
  tokens.filter((c) => c.startsWith("pl-") || c.startsWith("ml-")).reduce((s, c) => s + F.sp(c.slice(c.indexOf("-") + 1)), 0);
const panelContent = (F: DialogFacts, vw: number, max: number, pad: number, padLg: number) =>
  Math.min(max, vw - 2 * F.gutter) - 2 * F.material - 2 * (vw >= F.lg ? padLg : pad);
/** The confirm's receive row's width at a viewport: the panel's content less the box's edge and padding. */
const receiveWidth = (F: DialogFacts, vw: number) => {
  const box = F.confirm.box ?? [];
  return panelContent(F, vw, F.confirmMax, F.pad, F.padLg) - 2 * (box.includes("border") ? 1 : 0)
    - 2 * F.sp((box.find((x) => x.startsWith("p-")) ?? "p-?").slice(2));
};
type ReceiveRules = { row: string[]; figure: string[]; fee: string[] };
type ReceiveFit = { mode: string; room: number; split: boolean; over: boolean; left: number; right: number };
/**
 * The receive row at a viewport: how it is arranged, the least room left on its lines (below 0: a piece runs out of the box),
 * and whether the figure splits. `rules` stands in for the row's, the figure's and the fee's classes (6.control).
 */
function confirmRow(F: DialogFacts, vw: number, loc: string, p: DialogPrice, rules?: ReceiveRules): ReceiveFit {
  const c = F.confirm;
  const C = receiveWidth(F, vw);
  const row = rules ? rules.row : (c.row ?? []);
  const fig = rules ? rules.figure : (c.figure ?? []);
  const feeT = rules ? rules.fee : (c.fee ?? []);
  const eyeL = c.eyeL ?? [];
  const eyeR = c.eyeR ?? [];
  const noteT = c.note ?? [];
  const fee = Math.max(0, p.stake - p.value);
  const free = fee <= 0;
  const pct = p.stake > 0 ? Math.round((fee / p.stake) * 100) : 0;
  const figure = `TZS ${formatNumber(p.value)}`;
  const feeText = free ? dialogWord(F, loc, "dialog", "noFee") : `${DIALOG_MINUS}${formatTzs(fee)}`;
  const note = free ? dialogWord(F, loc, "dialog", "freeExitWindow") : `${pct}% ${DIALOG_DOT} ${formatTzs(p.stake)}`;
  const youReceive = dialogWord(F, loc, "dialog", "youReceive");
  const feeWord = dialogWord(F, loc, "dialog", "earlyExitFee");
  const lmax = Math.max(leadOf(eyeL, F) + textPx(youReceive, eyeL, F), leadOf(fig, F) + textPx(figure, fig, F));
  const rmax = Math.max(leadOf(eyeR, F) + textPx(feeWord, eyeR, F), leadOf(feeT, F) + textPx(feeText, feeT, F),
    leadOf(noteT, F) + textPx(note, noteT, F));
  const lmin = Math.max(leadOf(eyeL, F) + unbreakable(youReceive, eyeL, F), leadOf(fig, F) + unbreakable(figure, fig, F));
  const rmin = Math.max(leadOf(eyeR, F) + unbreakable(feeWord, eyeR, F), leadOf(feeT, F) + unbreakable(feeText, feeT, F),
    leadOf(noteT, F) + unbreakable(note, noteT, F));
  const figW = textPx(figure, fig, F);
  if (lmax + rmax <= C) return { mode: "shared", room: C - (lmax + rmax), split: false, over: false, left: lmax, right: rmax };
  if (row.includes("flex-wrap")) {
    const room = Math.min(C - lmin, C - rmin);
    return { mode: "wrapped", room, split: !isWhole(fig) && figW > C, over: room < 0, left: Math.min(lmax, C), right: C };
  }
  const [left, right] = flexShrink([lmax, rmax], [lmin, rmin], C);
  return { mode: "squeezed", room: C - (lmax + rmax), split: !isWhole(fig) && left < figW - 1e-9, over: lmin + rmin > C, left, right };
}
type ButtonFit = { row: string; room: number };
/** The confirm's two buttons and the result's one: the room left inside each button's content, every label on one line. */
function dialogButtons(F: DialogFacts, vw: number, loc: string, value: number): ButtonFit[] {
  const content = panelContent(F, vw, F.confirmMax, F.pad, F.padLg) - 2 * F.btnBorder - 2 * F.btnPad;
  const resultContent = panelContent(F, vw, F.result.max, F.result.pad, F.result.padLg) - 2 * F.btnBorder - 2 * F.btnPad;
  const px = F.btnFont;
  const face = `inter:${F.features.join(",")}`;
  const em = labelEmOf(F.features);
  const inside = (row: string, room: number, label: string, track: number) => ({ row, room: room - memoRun(face, label, em, px, track) });
  return [
    inside("confirm.gold", content, `${dialogWord(F, loc, "dialog", "sellLabel")} ${DIALOG_DOT} ${formatTzs(value)}`, F.goldTrack * px),
    inside("confirm.gold.selling", content, dialogWord(F, loc, "dialog", "selling"), F.goldTrack * px),
    inside("confirm.keep", content, dialogWord(F, loc, "dialog", "keepPosition"), F.ghostTrack * px),
    inside("confirm.keep.journey", content, dialogWord(F, loc, "journey", "sellKeep"), F.ghostTrack * px),
    inside("result.primary", resultContent, dialogWord(F, loc, "common", "doneSawa"), F.primaryTrack * px),
    inside("result.primary.refused", resultContent, dialogWord(F, loc, "common", "close"), F.noTrack * px),
  ];
}
type ResultFit = { row: string; room: number; split: boolean; over: boolean };
/** The result a sale opens: the title's figure on the title's line, and each detail row's figure in its row. */
function resultRows(F: DialogFacts, vw: number, loc: string, p: DialogPrice): ResultFit[] {
  const R = F.result;
  const L = panelContent(F, vw, R.max, R.pad, R.padLg);
  const fee = Math.max(0, p.stake - p.value);
  const whole = R.titleWhole && F.asks && R.figureRe && R.helper && F.amountWhole;
  const figW = monoRun(formatTzs(p.value), dialogPx(R.title ?? [], F), 0);
  const out: ResultFit[] = [{ row: "result.title", room: whole ? L - figW : Number.NaN, split: !whole, over: whole && figW > L }];
  const row = R.detailRow ?? [];
  const padX = row.find((c) => c.startsWith("px-"));
  const gapX = row.find((c) => c.startsWith("gap-x-"));
  const RW = L - 2 * (row.includes("border") ? 1 : 0) - 2 * (padX ? F.sp(padX.slice(3)) : Number.NaN);
  const gx = gapX ? F.sp(gapX.slice(6)) : 0;
  const labelT = R.label ?? [];
  const valueT = R.value ?? [];
  const vpx = dialogPx(valueT, F);
  const details: Array<[string, string, string]> = [
    ["result.returned", dialogWord(F, loc, "common", "returned"), formatTzs(p.value)],
    ["result.fee", dialogWord(F, loc, "common", "earlyExitFee"), fee <= 0 ? dialogWord(F, loc, "common", "none") : formatTzs(fee)],
  ];
  for (const [name, label, value] of details) {
    const lw = textPx(label, labelT, F);
    const vw2 = monoRun(value, vpx, dialogTrack(valueT, vpx, F));
    if (lw + gx + vw2 <= RW) out.push({ row: name, room: RW - (lw + gx + vw2), split: false, over: false });
    else if (row.includes("flex-wrap")) out.push({ row: name, room: RW - vw2, split: vw2 > RW && !isWhole(valueT), over: vw2 > RW && isWhole(valueT) });
    else out.push({ row: name, room: RW - (lw + gx + vw2), split: !isWhole(valueT), over: isWhole(valueT) });
  }
  return out;
}
/** S6 A8f · one word of one language and section replaced, for §6's copy plants. */
const withEntry = (w: World, loc: string, section: string, key: string, value: string): World => {
  const lang = (w.words[loc] ?? {}) as Record<string, Record<string, unknown> | undefined>;
  return { ...w, words: { ...w.words, [loc]: { ...lang, [section]: { ...(lang[section] ?? {}), [key]: value } } } };
};

async function g6Dialogs(W: World) {
  say(`${NL}§6 · the dialogs' fit — every money figure in the Sell confirm and in the result a sale opens stays whole, and each row reflows (S6 A8f)`);
  const F = dialogFacts(W);
  const priced = await dialogPrices();
  const c = F.confirm;
  const numbers: Record<string, number> = {
    lg: F.lg, micro: F.micro, microTrack: F.microTrack, titleSm: F.titleSm, titleSmTrack: F.titleSmTrack, btnBorder: F.btnBorder,
    btnPad: F.btnPad, btnFont: F.btnFont, goldTrack: F.goldTrack, primaryTrack: F.primaryTrack, noTrack: F.noTrack,
    ghostTrack: F.ghostTrack, eyebrowEm: F.eyebrowEm, material: F.material, gutter: F.gutter, pad: F.pad, padLg: F.padLg,
    confirmMax: F.confirmMax, resultMax: F.result.max, resultPad: F.result.pad, resultPadLg: F.result.padLg,
  };
  const unread = Object.entries(numbers).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
  const missing = [
    ...Object.entries(c).filter(([, v]) => v === null || v === false).map(([k]) => `confirm.${k}`),
    ...(["inner", "title", "label", "value", "detailRow"] as const).filter((k) => F.result[k] === null).map((k) => `result.${k}`),
    ...(F.result.flush ? [] : ["result.flush"]), ...(F.btnNowrap ? [] : ["btn.nowrap"]), ...(F.btnBody ? [] : ["btn.face"]),
    ...(F.amountWhole ? [] : [".amount"]),
  ];
  // The model measures these in the mono face, so each must be set in it.
  const faces = [["confirm.eyeL", c.eyeL], ["confirm.eyeR", c.eyeR], ["confirm.figure", c.figure], ["confirm.fee", c.fee], ["confirm.note", c.note],
    ["result.label", F.result.label], ["result.value", F.result.value]].filter(([, t]) => !isMono(t as Classes)).map(([k]) => k);
  const unworded = DIALOG_LOCS.flatMap((loc) => Object.entries(DIALOG_WORDS).flatMap(([section, keys]) =>
    keys.filter((k) => !dialogWord(F, loc, section, k)).map((k) => `${loc}.${section}.${k}`)));
  // Every cell of the grid, measured once: the receive row, the buttons, and the result.
  const receive: Array<{ loc: string; vw: number; p: DialogPrice; f: ReceiveFit }> = [];
  const pressed: Array<{ loc: string; vw: number; f: ButtonFit }> = [];
  const resultCells: Array<{ loc: string; vw: number; p: DialogPrice; f: ResultFit }> = [];
  for (const loc of DIALOG_LOCS) {
    for (const vw of DIALOG_WIDTHS) {
      for (const p of priced) {
        receive.push({ loc, vw, p, f: confirmRow(F, vw, loc, p) });
        for (const f of dialogButtons(F, vw, loc, p.value)) pressed.push({ loc, vw, f });
        for (const f of resultRows(F, vw, loc, p)) resultCells.push({ loc, vw, p, f });
      }
    }
  }
  const glyphless = [...receive.filter((x) => !Number.isFinite(x.f.room)).map((x) => `${x.loc} ${x.vw} receive`),
    ...pressed.filter((x) => !Number.isFinite(x.f.room)).map((x) => `${x.loc} ${x.vw} ${x.f.row}`),
    ...resultCells.filter((x) => !Number.isFinite(x.f.room) && !x.f.split).map((x) => `${x.loc} ${x.vw} ${x.f.row}`)];
  say(`     the model: ${j(numbers)} · the receive row's width: ${receiveWidth(F, 320)}px at 320, ${receiveWidth(F, 1280)}px at 1280 · the result's line: ${panelContent(F, 320, F.result.max, F.result.pad, F.result.padLg)}px at 320 · cells: ${receive.length} rows, ${pressed.length} buttons, ${resultCells.length} result rows`);
  ok("6.model · the model reads its facts from source — the Modal's gutter and panel padding from ui/modal.tsx, the panel's edge from .mat-modal (motion.css), each dialog's width, padding and classes from its own markup, the buttons', the eyebrow's and .amount's metrics from the stylesheet, the type ladder and the spacing scale from the Tailwind config — every element it measures in the mono face is set in it, every word both dialogs draw exists in en, sw and zh (the journey's keep word included), and every glyph is in the fonts",
    unread.length === 0 && missing.length === 0 && faces.length === 0 && unworded.length === 0 && glyphless.length === 0 && receive.length > 0,
    j({ unread, missing, faces, unworded, glyphless: glyphless.slice(0, 3) }));
  const fig = c.figure ?? [];
  const row = c.row ?? [];
  const right = c.right ?? [];
  const fee = c.fee ?? [];
  const note = c.note ?? [];
  ok("6.classes · the confirm's receive figure is an amount (one object, DESIGN_AUTHORITY §M4), and so are its fee and the fee's note; its row wraps; the fee column grows to the box's width when it is alone on its line (its words at the right edge); and beside the figure the fee keeps a clear space before it, so two figures never run together",
    isWhole(fig) && row.includes("flex-wrap") && right.includes("grow") && right.includes("text-right") && isWhole(fee) && isWhole(note) && leadOf(fee, F) > 0,
    j({ figure: fig, row, right, fee, note }));
  const receiveBad = receive.filter(({ f }) => f.split || f.over || !Number.isFinite(f.room))
    .map(({ loc, vw, p, f }) => `${loc} ${vw} TZS ${p.stake}${p.free ? " free" : ` at ${p.rate}`}: ${f.mode}, ${f.room.toFixed(1)}px${f.split ? ", split" : ""}`);
  const leastReceive = (loc: string) => Math.min(...receive.filter((x) => x.loc === loc && x.vw === 320).map((x) => x.f.room)).toFixed(1);
  ok(`6.confirm · at every width, in en, sw and zh, for every stake to the platform's maximum, free and paid at every whole percent to 30, the confirm's receive row holds its figure whole: it shares a line where the figure's column and the fee column fit side by side, and wraps where they do not — the figure's column on its own line, the fee column below it — and no unbreakable piece (the whole figure, the fee, its note, an eyebrow's longest word) runs out of its line (least room left at 320: en ${leastReceive("en")}, sw ${leastReceive("sw")}, zh ${leastReceive("zh")}px)`,
    receive.length > 0 && receiveBad.length === 0, receiveBad.slice(0, 3).join(" | "));
  const pressedBad = pressed.filter(({ f }) => !(f.room >= 0)).map(({ loc, vw, f }) => `${loc} ${vw} ${f.row}: ${f.room.toFixed(1)}px`);
  const leastButton = (loc: string) => Math.min(...pressed.filter((x) => x.loc === loc && x.vw === 320).map((x) => x.f.room)).toFixed(1);
  ok(`6.button · every button in both dialogs holds its one-line label inside its padding at every width, in both looks — the gold "Uza · TZS 1,000,000" and "Inauza…", the keep button's words today and the journey's, and the result's own (least room left at 320: en ${leastButton("en")}, sw ${leastButton("sw")}, zh ${leastButton("zh")}px)`,
    F.btnNowrap && pressed.length > 0 && pressedBad.length === 0, pressedBad.slice(0, 3).join(" | "));
  const resultBad = resultCells.filter(({ f }) => f.split || f.over || !Number.isFinite(f.room))
    .map(({ loc, vw, p, f }) => `${loc} ${vw} TZS ${p.stake} ${f.row}: ${f.split ? "can split" : `${f.room.toFixed(1)}px`}`);
  const leastResult = (name: string) => Math.min(...resultCells.filter((x) => x.f.row === name && x.vw === 320).map((x) => x.f.room)).toFixed(1);
  ok(`6.result · the result a sale opens sets every money figure in its title as one amount — the sale's result asks (wholeFigures, in its own module, sell-result.tsx, since S6 A8h), and the pinned helper wraps each figure its pattern finds, a minus before it included — and at every width the title's widest figure, TZS 1,000,000, fits the title's line (least room left at 320: ${leastResult("result.title")}px); each detail row holds its figure whole, its line wrapping before break-all could break it (least room left at 320: ${leastResult("result.returned")} and ${leastResult("result.fee")}px)`,
    resultCells.length > 0 && resultBad.length === 0, resultBad.slice(0, 3).join(" | "));
  // CONTROL — today's rules (the row not wrapping, the figure no amount, the fee keeping no space) on the ticket the v2 parity
  // baseline sells in its confirm cells, a free TZS 1,500, at 360 and 390.
  const ticket: DialogPrice = { stake: 1_500, free: true, value: (await fitPrice(1_500, 0.1, true)).value, rate: null };
  const today: ReceiveRules = {
    row: row.filter((x) => x !== "flex-wrap"),
    figure: fig.filter((x) => x !== "amount" && x !== "whitespace-nowrap"),
    fee: fee.filter((x) => !x.startsWith("pl-") && !x.startsWith("ml-")),
  };
  const en360 = confirmRow(F, 360, "en", ticket, today);
  const sw360 = confirmRow(F, 360, "sw", ticket, today);
  const sw390 = confirmRow(F, 390, "sw", ticket, today);
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
  ok(`6.control · CONTROL · with today's rules (the row not wrapping, the figure no amount) the model draws what the v2 parity baseline (7c859cdf) captured of the classic confirm for a free TZS 1,500 at 360 — the English row on one line, the figure's column ${en360.left.toFixed(1)}px beside a ${en360.right.toFixed(1)}px fee column, ${en360.room.toFixed(1)}px to spare (captured: 129.5 and 103.5), and the Swahili figure's column squeezed to ${sw360.left.toFixed(1)}px beside ${sw360.right.toFixed(1)}px (captured: 104 and 132), its figure on two lines — and the Swahili figure split at 390, as a browser drew it: so 6.confirm can see the defect it was written for`,
    en360.mode === "shared" && near(en360.left, 129.6) && near(en360.right, 103.6) && en360.room > 2 && en360.room < 4
      && sw360.mode === "squeezed" && sw360.split && near(sw360.left, 104) && near(sw360.right, 132) && sw390.split,
    j({ en360, sw360, sw390 }));
}

async function runAll(I: Impl, W: World) {
  await g1Server(I);
  g2Hosts(W);
  g3Button(W);
  g4Wiring(W);
  await g5Fit(W);
  await g6Dialogs(W);
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
  { name: "the label may wrap below 360 (a legacy paid row on /positions at 320 breaks its label over two lines, the Chinese one between its glyphs)", expect: ["5.paid", "5.classes"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_LABEL, FIT_LABEL.replace("<span>", `<span className="whitespace-normal xs:whitespace-nowrap">`)) },
  { name: "the label may wrap below 360 with Chinese kept whole (a Swahili legacy paid row on /positions at 320 breaks `Uza sasa` over two lines)", expect: ["5.paid", "5.classes"],
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
  // §5 — S6 A8d: the question page's holder block stacks its Sell button on a phone
  { name: "the question page stops asking for the stacked phone row (its one-line row runs past the button again)", expect: ["5.model", "5.stack"],
    world: (w) => inFile(w, MARKET, FIT_STACK_FLAG, NL) },
  { name: "/positions asks for the stacked phone row too (only the holder block may)", expect: ["5.model"],
    world: (w) => inFile(w, POSITIONS, "pricedFree={price?.free === true}", `pricedFree={price?.free === true}${NL}                      stackOnPhone`) },
  { name: "the classic button ignores the host's ask (the holder block's button is drawn the wrap and never stacks)", expect: ["5.model", "5.stack"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_STACK_CLASSNAME, FIT_STACK_CLASSNAME.split("${stackOnPhone ? ").join("${false ? ")) },
  { name: "the stacked rule takes the 48px rung (a three-line row is taller than the button)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split("height: var(--h-control-xl); flex-wrap").join("height: var(--h-control-lg); flex-wrap") }) },
  { name: "the stacked rule caps its height instead of taking the rung (a max-height: the button stays 44px and a three-line row runs out of it)", expect: ["5.model", "5.stack"],
    world: (w) => ({ ...w, css: w.css.split("{ height: var(--h-control-xl); flex-wrap").join("{ max-height: var(--h-control-xl); flex-wrap") }) },
  { name: "the stacked rule hand-types its height (56px: no rung, so the token no longer owns it)", expect: ["5.model", "5.stack"],
    world: (w) => ({ ...w, css: w.css.split("height: var(--h-control-xl); flex-wrap").join("height: 56px; flex-wrap") }) },
  { name: "the stacked button no longer wraps its lines (its label and figure squeeze onto one)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("var(--h-control-xl); flex-wrap: wrap; align-content").join("var(--h-control-xl); align-content") }) },
  { name: "the stacked rule's phone block ends at 360 (from 360 the holder block's one-line row runs past the button again)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split(FIT_STACK_OPENER).join(FIT_STACK_OPENER.split("639.98px").join("359.98px")) }) },
  { name: "the stacked rule's phone block reaches 768 (past `sm`, where the holder block's row is one line)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split(FIT_STACK_OPENER).join(FIT_STACK_OPENER.split("639.98px").join("767.98px")) }) },
  { name: "the stacked rule's phone block also asks for a hovering pointer (no touch phone stacks: its one-line row runs past the button again)", expect: ["5.model", "5.stack"],
    world: (w) => ({ ...w, css: w.css.split(FIT_STACK_OPENER).join(FIT_STACK_OPENER.split("639.98px) {").join("639.98px) and (hover: hover) {")) }) },
  { name: "the stacked rule's phone block starts at 400 (from 320 to 399 the holder block's one-line row runs past the button again)", expect: ["5.model", "5.stack"],
    world: (w) => ({ ...w, css: w.css.split(FIT_STACK_OPENER).join(FIT_STACK_OPENER.split("@media (max-width").join("@media (min-width: 400px) and (max-width")) }) },
  { name: "the stacked rule leaves its phone block (the holder block's button would stack at every width)", expect: ["5.model", "5.stack"],
    world: (w) => {
      const at = w.css.indexOf(`${NL}  ${FIT_STACK_RULE}`);
      const end = w.css.indexOf(NL, at + 1);
      const rule = w.css.slice(at + 1, end);
      return { ...w, css: (w.css.slice(0, at) + w.css.slice(end)).split(FIT_STACK_OPENER).join(`${rule}${NL}${FIT_STACK_OPENER}`) };
    } },
  { name: "the stacked lines take line-height 1.5 (a three-line row is taller than the button)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split("row-gap: 2px; line-height: 1.25; }").join("row-gap: 2px; line-height: 1.5; }") }) },
  { name: "the stacked lines take a 12px row gap (a three-line row is taller than the button)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split("row-gap: 2px; line-height: 1.25; }").join("row-gap: 12px; line-height: 1.25; }") }) },
  { name: "the figure's line cannot let its note go under it (a long fee beside its figure runs past the button at 320)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_STACK_FIGURE} display: flex; flex-wrap: wrap;`).join(`${FIT_STACK_FIGURE} display: flex;`) }) },
  { name: "the figure's line is no flex row (its wrap and gap never apply: a long fee stays beside its figure, past the button at 320)", expect: ["5.stack"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_STACK_FIGURE} display: flex; flex-wrap: wrap;`).join(`${FIT_STACK_FIGURE} flex-wrap: wrap;`) }) },
  { name: "the figure's gap is hand-typed (8px, not the spacing token)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("justify-content: center; column-gap: var(--sp-2); margin-left: auto").join("justify-content: center; column-gap: 8px; margin-left: auto") }) },
  { name: "the stacked label no longer takes a line of its own (the figure could ride up beside it, off the line the model lays out)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("{ flex-basis: 100%; text-align: center; }").join("{ text-align: center; }") }) },
  { name: "the note keeps its own margin beside the figure's gap (its line runs 8px wider than the model lays out)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_STACK_NOTE} margin-left: 0; }`).join(`${FIT_STACK_NOTE} margin-right: 0; }`) }) },
  { name: "the stacked rule's phone block loses its density reason (the card-spacing fence would refuse it)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("  /* density: general — the question page's Sell button").join("  /* the question page's Sell button") }) },
  // §5 — S6 A8g: where its host does not stack, a row's note goes under its figure when one line cannot hold both; the free strip keeps its parts whole
  { name: "every host that does not stack draws today's one line again (the className's wrap arm dropped: the Swahili free row for TZS 1,000,000 runs past the button at 360 on /positions, the Chinese legacy paid row at 320)", expect: ["5.model", "5.paid", "5.list"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_WRAP_ARM, ' : ""}`}') },
  { name: "the wrap rule's figure no longer wraps (its note stays beside a seven-figure stake, past the button on /positions)", expect: ["5.paid", "5.list"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_WRAP_FIGURE} display: flex; flex-wrap: wrap;`).join(`${FIT_WRAP_FIGURE} display: flex;`) }) },
  { name: "the wrap rule's figure is no flex row (its wrap and gap never apply: a long fee stays beside its figure, past the button at 320)", expect: ["5.paid", "5.list"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_WRAP_FIGURE} display: flex; flex-wrap: wrap;`).join(`${FIT_WRAP_FIGURE} flex-wrap: wrap;`) }) },
  { name: "the wrap rule's note keeps its own margin beside the gap (its one line runs 8px wider than the model lays out)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split(`${FIT_WRAP_NOTE} margin-left: 0; }`).join(`${FIT_WRAP_NOTE} margin-right: 0; }`) }) },
  { name: "the wrap rule's lines go to the left (a note under its figure no longer ends where the one-line row does)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("justify-content: flex-end; column-gap").join("justify-content: flex-start; column-gap") }) },
  { name: "the wrap rule's gap is hand-typed (8px, not the spacing token)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("justify-content: flex-end; column-gap: var(--sp-2); }").join("justify-content: flex-end; column-gap: 8px; }") }) },
  { name: "the wrap rule's phone block also asks for a hovering pointer (no touch phone wraps: its big rows run past the button again)", expect: ["5.model", "5.paid", "5.list"],
    world: (w) => ({ ...w, css: w.css.split(FIT_WRAP_OPENER).join(FIT_WRAP_OPENER.split("639.98px) {").join("639.98px) and (hover: hover) {")) }) },
  { name: "the wrap rule's phone block ends at 360 (from 360 to 383 the Swahili free row for a big stake runs past the button again)", expect: ["5.list"],
    world: (w) => ({ ...w, css: w.css.split(FIT_WRAP_OPENER).join(FIT_WRAP_OPENER.split("639.98px").join("359.98px")) }) },
  { name: "the wrap rule's phone block reaches 768 (past `sm`)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split(FIT_WRAP_OPENER).join(FIT_WRAP_OPENER.split("639.98px").join("767.98px")) }) },
  { name: "the wrap rule leaves its phone block (it would apply at every width)", expect: ["5.model", "5.paid", "5.list"],
    world: (w) => {
      const at = w.css.indexOf(`${NL}  ${FIT_WRAP_FIGURE}`);
      const end = w.css.indexOf(NL, at + 1);
      const rule = w.css.slice(at + 1, end);
      return { ...w, css: (w.css.slice(0, at) + w.css.slice(end)).split(FIT_WRAP_OPENER).join(`${rule}${NL}${FIT_WRAP_OPENER}`) };
    } },
  { name: "the wrap rule's phone block loses its density reason (the card-spacing fence would refuse it)", expect: ["5.model"],
    world: (w) => ({ ...w, css: w.css.split("  /* density: general — today's Sell button where its host does not stack").join("  /* today's Sell button where its host does not stack") }) },
  { name: "the free strip no longer wraps between its parts (the browser shrinks its Swahili parts in the holder block below 383px until the free word and the note break inside, TOKA BILA over GHARAMA)", expect: ["5.strip"],
    world: (w) => inFile(w, SELL_BUTTON, '<div className="mb-1.5 flex flex-wrap items-center', '<div className="mb-1.5 flex items-center') },
  { name: "the free strip's classes go back to before A8g (the browser shrinks its Swahili parts until the free word and the note break inside)", expect: ["5.strip"],
    world: (w) => inFile(w, SELL_BUTTON, FIT_STRIP_DIV, `<div className="${FIT_STRIP_BEFORE}">`) },
  { name: "the free strip pads 64px each side (its Swahili free word, alone on its line, breaks inside in the holder block at 320)", expect: ["5.strip"],
    world: (w) => inFile(w, SELL_BUTTON, "gap-y-0.5 px-2 py-1 rounded-md", "gap-y-0.5 px-9 py-1 rounded-md") },
  { name: "the free strip's line gap is hand-typed (2px, off the spacing scale)", expect: ["5.model"],
    world: (w) => inFile(w, SELL_BUTTON, "gap-x-1.5 gap-y-0.5 px-2", "gap-x-1.5 gap-y-[2px] px-2") },
  { name: "the free strip's free word leaves the mono face (the model would measure a face it cannot read)", expect: ["5.model"],
    world: (w) => inFile(w, SELL_BUTTON, '<span className="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>', '<span className="font-display text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>') },
  { name: "a phone block re-declares the stack's rung (--h-control-xl: 48px below 640: the browser draws the second declaration, a model that read the first would lay out 56)", expect: ["5.model", "5.stack"],
    world: (w) => ({ ...w, css: `${w.css}${NL}@media (max-width: 639.98px) {${NL}  /* density: general — a planted rung. */${NL}  :root { --h-control-xl: 48px; }${NL}}${NL}` }) },
  { name: "the classic button's rung drops to 36px (a note under its figure no longer fits inside the button on /positions)", expect: ["5.list"],
    world: (w) => ({ ...w, css: w.css.split("--h-control-md: 44px;").join("--h-control-md: 36px;") }) },
  { name: "the free window may run 120 minutes (the strip's countdown can read 120:00, longer than the 60:00 §5 and the records lay out)", expect: ["5.model"],
    world: (w) => inFile(w, FIT_CONFIG, "g < 0 || g > 60)", "g < 0 || g > 120)") },
  // §5 — 2026-10-06: the ticket's opened line keeps its date whole
  { name: "the holder block's opened line runs its word and date as one text again (its date breaks inside at 320 in Swahili, as the tiles measured)", expect: ["5.opened"],
    world: (w) => inFile(w, MARKET, `<span>{t.market.opened}{" "}<span className="whitespace-nowrap">{fmtTime(p.placedAt)}</span></span>`, "{t.market.opened} {fmtTime(p.placedAt)}") },
  { name: "/positions' card loses the date's nowrap (its date may break inside on a narrow card)", expect: ["5.opened"],
    world: (w) => inFile(w, POSITION_CARD, `<span className="whitespace-nowrap">{formatDateTime(placedAt)}</span>`, "<span>{formatDateTime(placedAt)}</span>") },
  { name: "the holder block's word and date become ONE nowrap unit (the line can no longer break at all and runs past the card at 320)", expect: ["5.opened"],
    world: (w) => inFile(w, MARKET, `<span>{t.market.opened}{" "}<span className="whitespace-nowrap">{fmtTime(p.placedAt)}</span></span>`, `<span className="whitespace-nowrap">{t.market.opened}{" "}{fmtTime(p.placedAt)}</span>`) },
  // §4 — the wiring
  { name: "the suite drops out of predeploy", expect: ["4.wired"],
    world: (w) => ({ ...w, scripts: { ...w.scripts, predeploy: (w.scripts.predeploy ?? "").split("npm run test:sell-grace-truth && ").join("") } }) },
  // §6 — S6 A8f: the dialogs' fit
  { name: "the confirm's receive row is today's again — no wrap, the figure no amount, the fee no clear space (the Swahili figure splits at 360 and 390, as a browser drew it)", expect: ["6.confirm", "6.classes"],
    world: (w) => inFile(inFile(inFile(w, SELL_MODAL, RECEIVE_ROW, `className="flex items-baseline justify-between"`),
      SELL_MODAL, RECEIVE_FIGURE, `className="font-mono font-bold text-[24px] tabular-nums leading-none text-text"`),
      SELL_MODAL, FEE_FIGURE, `className="font-bold text-title-sm amount leading-none"`) },
  { name: "the receive row stops wrapping (the whole figure runs out of the box on a phone, beside the fee column)", expect: ["6.confirm", "6.classes"],
    world: (w) => inFile(w, SELL_MODAL, RECEIVE_ROW, RECEIVE_ROW.replace("flex flex-wrap ", "flex ")) },
  { name: "the receive figure is no amount again (its 'TZS' could end a line, held only by the wrap)", expect: ["6.classes"],
    world: (w) => inFile(w, SELL_MODAL, RECEIVE_FIGURE, RECEIVE_FIGURE.replace("amount font-bold", "font-mono font-bold")) },
  { name: "the receive figure is set in the display face (the model would measure a face it cannot read)", expect: ["6.model"],
    world: (w) => inFile(w, SELL_MODAL, RECEIVE_FIGURE, RECEIVE_FIGURE.replace("amount font-bold", "font-display font-bold")) },
  { name: "the fee column does not grow (alone on its line it would sit at the box's left, its words ragged)", expect: ["6.classes"],
    world: (w) => inFile(w, SELL_MODAL, FEE_COLUMN, FEE_COLUMN.replace("grow ", "")) },
  { name: "the fee keeps no clear space before it (beside the figure, two figures can run together)", expect: ["6.classes"],
    world: (w) => inFile(w, SELL_MODAL, FEE_FIGURE, FEE_FIGURE.replace("pl-3 ", "")) },
  { name: "the fee is no amount ('−TZS' could end a line)", expect: ["6.classes"],
    world: (w) => inFile(w, SELL_MODAL, FEE_FIGURE, FEE_FIGURE.replace(" amount", "")) },
  { name: "the fee's note is no amount (its figure could end a line)", expect: ["6.classes"],
    world: (w) => inFile(w, SELL_MODAL, FEE_NOTE, FEE_NOTE.replace(" amount", "")) },
  { name: "the confirm's box pads wider (its content narrows past the whole figure on a 320 phone)", expect: ["6.confirm"],
    world: (w) => inFile(w, SELL_MODAL, `className="rounded-lg border p-4"`, `className="rounded-lg border p-6"`) },
  { name: "the Modal's gutter widens (the confirm's box narrows past the whole figure on a 320 phone)", expect: ["6.confirm"],
    world: (w) => inFile(w, DIALOG_SHELL, `: "px-3 py-4"`, `: "px-5 py-4"`) },
  { name: "a longer Swahili sell word (the gold button's label, with TZS 1,000,000, runs out of its button at 320)", expect: ["6.button"],
    world: (w) => withEntry(w, "sw", "dialog", "sellLabel", "Uza tiketi yako yote sasa hivi") },
  { name: "a longer Swahili keep word in the journey's look (its keep button overflows at 320)", expect: ["6.button"],
    world: (w) => withEntry(w, "sw", "journey", "sellKeep", "Baki na tiketi yako hii hadi matokeo yatoke") },
  { name: "the sale's result stops asking for whole figures (a refusal's 'TZS' can end a line again, and the title's figure is drawn in a face the model cannot read)", expect: ["6.result"],
    world: (w) => inFile(w, SELL_RESULT, `${NL}      wholeFigures${NL}`, NL) },
  { name: "the result draws its title as given (no amount around its figure)", expect: ["6.result"],
    world: (w) => inFile(w, RESULT_MODAL, "{wholeFigures ? withWholeFigures(title) : title}", "{title}") },
  { name: "the result's helper sets its figures in the body's face, not as amounts", expect: ["6.result"],
    world: (w) => inFile(w, RESULT_MODAL, `<span key={i} className="amount">`, `<span key={i} className="font-semibold">`) },
  { name: "the figure pattern misses a minus written before the currency", expect: ["6.result"],
    world: (w) => inFile(w, RESULT_MODAL, `/(${DIALOG_MINUS}?TZS `, "/(TZS ") },
  { name: "a detail row of the result stops wrapping (a long Swahili label squeezes the figure, and break-all breaks it)", expect: ["6.result"],
    world: (w) => inFile(w, RESULT_MODAL, "px-3 py-2 flex flex-wrap items-baseline", "px-3 py-2 flex items-baseline") },
  { name: "the result's title grows to 34px (its widest figure no longer fits a 320 phone's line)", expect: ["6.result"],
    world: (w) => inFile(w, RESULT_MODAL, "font-display text-[22px] font-bold", "font-display text-[34px] font-bold") },
  { name: "a word the dialogs draw is missing in Chinese (the model would measure an empty eyebrow)", expect: ["6.model"],
    world: (w) => withEntry(w, "zh", "dialog", "earlyExitFee", "") },
  { name: "the eyebrow's tracking is misread in the stylesheet (the model no longer draws the boxes the browser drew)", expect: ["6.control"],
    world: (w) => ({ ...w, css: w.css.split(".mcardp-pctcap { letter-spacing: 0.14em; }").join(".mcardp-pctcap { letter-spacing: 0.10em; }") }) },
  { name: "the Modal's panel pads narrower below lg (the model reads a panel the browser did not draw)", expect: ["6.control"],
    world: (w) => inFile(w, DIALOG_SHELL, "mat-modal relative w-full p-5 lg:p-6", "mat-modal relative w-full p-4 lg:p-6") },
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
