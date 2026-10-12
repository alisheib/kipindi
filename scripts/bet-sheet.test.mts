/**
 * test:bet-sheet — the journey bet sheet's pure core (the Vodacom plan S8 WP2;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md` WP2, with A2, A3, A6, A8, A9, A10, A22 and A24).
 *
 *   npm run test:bet-sheet     (in predeploy)
 *   npm run red:bet-sheet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * What it holds `src/lib/journey/sheet-state.ts` and `src/lib/journey/sheet-refusal.ts` to:
 *   §1 THE FRAMES on the deck's Dodoma pools (YES 24,825 / NO 50,462 at the default loser-share): the deck's figures,
 *      the chips and the preset at the minimum stake read PER MARKET (A24), and every estimate state, each from
 *      `estimateFor`.
 *   §2 THE REFUSAL MATRIX — every row as a golden (an answer and its re-read in, the settled view out), and the CENSUS:
 *      every `reason:` and `code:` literal on the player bet path (`buyPosition`, `landedKeyAnswer`, `buyPositionInner`,
 *      `buyPositionAction`) has a row, so a new refusal cannot go unclassified.
 *   §3 EXACTLY ONCE — the key table, the in-doubt table (A2), the frozen quote, the request builder, the watchdog, the
 *      keyed marker (A3), and DOUBT_SETTLE_MS against the ceiling recomputed from the server's own timeouts.
 *   §4 THE LOW-BALANCE BRANCHES → frames, `leftAfter` included, and a pending deposit's age bands (A10).
 *   §5 THE CLOCK AND THE CUE — the closed flip across `closesAt` on a skewed phone clock; "Makadirio yamesasishwa" on a
 *      pool change, never on a keystroke; the pages whose address opens a sheet (A3 item 1).
 *   §6 THE SOURCE — the two modules import only what WP2 names; no rate, multiple or shilling amount typed; no clock but
 *      the caller's; client-safe.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written, so `test:red-anchors` counts the twin as in-process.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as SS from "../src/lib/journey/sheet-state.ts";
import * as SR from "../src/lib/journey/sheet-refusal.ts";
import * as SF from "../src/lib/journey/shortfall.ts";
import { REASONS } from "../src/lib/failure-reasons.ts";
import { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } from "../src/lib/payout.ts";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS } from "../src/lib/server/validators.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

type Sources = { state: string; refusal: string; service: string; actions: string; admission: string; retry: string; prisma: string; locks: string };
const SOURCES: Sources = {
  state: read("src/lib/journey/sheet-state.ts"),
  refusal: read("src/lib/journey/sheet-refusal.ts"),
  service: read("src/lib/server/market-service.ts"),
  actions: read("src/app/markets/actions.ts"),
  admission: read("src/lib/server/admission.ts"),
  retry: read("src/lib/server/retry.ts"),
  prisma: read("src/lib/server/prisma.ts"),
  locks: read("src/lib/server/locks.ts"),
};

type Impl = {
  SS: typeof SS;
  SR: { refusalOutcome: typeof SR.refusalOutcome; settleRefusal: typeof SR.settleRefusal; CLASSIFIED_REASONS: readonly string[]; CLASSIFIED_CODES: readonly string[]; HOUSE_ONLY_REASONS: readonly string[] };
  plan: typeof SF.shortfallPlan;
  src: Sources;
};
const REAL: Impl = {
  SS,
  SR: { refusalOutcome: SR.refusalOutcome, settleRefusal: SR.settleRefusal, CLASSIFIED_REASONS: SR.CLASSIFIED_REASONS, CLASSIFIED_CODES: SR.CLASSIFIED_CODES, HOUSE_ONLY_REASONS: SR.HOUSE_ONLY_REASONS },
  plan: SF.shortfallPlan,
  src: SOURCES,
};

/* ─── The world ───────────────────────────────────────────────────────────────────────────────────────────────── */

const NOW = Date.UTC(2026, 9, 13, 9, 0);
const RATES = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true } as const;
const MIN = PLATFORM_MIN_STAKE, MAX = PLATFORM_MAX_STAKE;
const MKT = "mkt_dodoma01";
const K1 = "0f8b6a52-3c1d-4e7a-9b2f-5d6c7e8f9a01";
const K2 = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function seed(o: Partial<SS.SheetSeed> = {}): SS.SheetSeed {
  return { v: 1, id: MKT, yesPool: 24_825, noPool: 50_462, rates: { ...RATES }, feePct: 13, min: MIN, max: MAX, closesAt: new Date(NOW + 3_600_000).toISOString(), serverNow: NOW, bettable: true, ...o };
}
function facts(o: Partial<SS.SheetFacts> = {}): SS.SheetFacts {
  return {
    maintenance: false, lockout: null, session: null, account: { status: "ACTIVE", coolingOffUntil: null },
    wallet: { status: "ACTIVE", balance: 50_000, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
    deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: false, singleTxn: 1_000_000, rolling30d: 5_000_000 }, railsOpen: true },
    ...o,
  };
}
const viewer = (f: SS.SheetFacts | null, o: Partial<SS.SheetViewer> = {}): SS.SheetViewerRead => {
  const w = f?.wallet;
  const spendable = w && w.balance !== null ? Math.max(0, w.balance) + Math.max(0, w.bonusBalance ?? 0) : null;
  return { state: "read", viewer: { spendable, heldSides: [], bonusWager: null, facts: f, ...o } };
};
const wallet = (balance: number | null, bonusBalance = 0) => ({ status: "ACTIVE", balance, bonusBalance });
const q = (stake: number, side: "YES" | "NO" = "YES"): SS.Quote => ({ marketId: MKT, side, stake });
const ctx = (o: Partial<SR.SettleContext> = {}): SR.SettleContext => ({ inDoubt: false, seed: seed(), stake: 5_000, nowMs: NOW, ...o });
const R = (value: unknown): SR.ActionAnswer => ({ kind: "resolved", value });
const T = (error: unknown): SR.ActionAnswer => ({ kind: "rejected", error });
const fail = (o: Record<string, unknown>) => ({ ok: false, error: "an English sentence the sheet never reads", ...o });

/** The keys WP4 adds (S8-PLAN "New dictionary keys", with A5, A7, A10 and A20) — every journey key the modules name. */
const WP4_KEYS = new Set([
  "placeCta", "placeCtaBare", "retryCta", "sheetBusy", "sheetRateLimited", "sheetSessionLimit", "sheetBlocked", "sheetFrozen",
  "sheetClosedBody", "sheetNotTaking", "sheetBelowMin", "sheetAboveMax", "sheetPlacingSlow", "lowPendingTitle",
  "lowPendingWaitBody", "lowPendingLateTitle", "lowPendingLateBody",
]);

/* ─── The census: the player bet path's refusals, read from the source ───────────────────────────────────────── */

/** The body of `function <name>(` in `text` (comments stripped; braces matched outside strings and templates). */
function functionBody(text: string, head: string): string | null {
  const at = text.indexOf(head);
  if (at < 0) return null;
  const open = text.indexOf("{", text.indexOf(")", at));
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") { i = skipQuote(text, i); continue; }
    if (c === "`") { i = skipTemplate(text, i); continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(open, i + 1);
  }
  return null;
}
function skipQuote(t: string, i: number): number {
  for (let j = i + 1; j < t.length; j++) { if (t[j] === "\\") { j++; continue; } if (t[j] === t[i] || t[j] === "\n") return j; }
  return t.length;
}
function skipTemplate(t: string, i: number): number {
  for (let j = i + 1; j < t.length; j++) {
    if (t[j] === "\\") { j++; continue; }
    if (t[j] === "`") return j;
    if (t[j] === "$" && t[j + 1] === "{") {
      let d = 0;
      for (let k = j + 1; k < t.length; k++) { if (t[k] === "{") d++; else if (t[k] === "}" && --d === 0) { j = k; break; } }
    }
  }
  return t.length;
}
/** Every `{ ok: false … }` literal in a body, as its text (braces matched the same way). */
function refusalSites(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/\{\s*ok:\s*false\b/g)) {
    const start = m.index as number;
    let depth = 0;
    for (let i = start; i < body.length; i++) {
      const c = body[i];
      if (c === '"' || c === "'") { i = skipQuote(body, i); continue; }
      if (c === "`") { i = skipTemplate(body, i); continue; }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { out.push(body.slice(start, i + 1)); break; }
    }
  }
  return out;
}
/** A site's code and every reason literal its `reason:` value can take (a ternary's branches included, A22 item 2). */
function siteTokens(site: string): { code: string | null; reasons: string[]; reasonExpr: boolean } {
  const code = /\bcode:\s*"([A-Z_]+)"/.exec(site)?.[1] ?? null;
  const rm = /\breason:\s*([^,}]*(?:\([^)]*\)[^,}]*)?)/.exec(site);
  const reasons = rm ? [...rm[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]) : [];
  return { code, reasons, reasonExpr: !!rm };
}
function census(src: Sources): { sites: { fn: string; code: string | null; reasons: string[]; reasonExpr: boolean }[]; missing: string[] } {
  const svc = decomment(src.service), act = decomment(src.actions);
  const bodies: [string, string | null][] = [
    ["buyPosition", functionBody(svc, "export async function buyPosition(")],
    ["landedKeyAnswer", functionBody(svc, "async function landedKeyAnswer(")],
    ["buyPositionInner", functionBody(svc, "async function buyPositionInner(")],
    ["buyPositionAction", functionBody(act, "export async function buyPositionAction(")],
  ];
  const missing = bodies.filter(([, b]) => b === null).map(([n]) => n);
  const sites = bodies.flatMap(([fn, b]) => (b ? refusalSites(b).map((s) => ({ fn, ...siteTokens(s) })) : []));
  return { sites, missing };
}

/* ─── The ceiling a doubt must outlast (A2 item 3) ────────────────────────────────────────────────────────────── */

function doubtCeiling(src: Sources): { ms: number; parts: Record<string, number> } | null {
  const admission = /maxWaitMs:\s*Math\.min\(\s*([\d_]+)/.exec(src.admission)?.[1];
  const delays = /const DELAYS_MS = \[([^\]]*)\]/.exec(src.retry)?.[1];
  const jitter = /const JITTER = ([\d.]+)/.exec(src.retry)?.[1];
  const pool = /searchParams\.set\("pool_timeout", "(\d+)"\)/.exec(src.prisma)?.[1];
  const run = /timeout:\s*([\d_]+),\s*\/\/ 30s/.exec(src.locks)?.[1];
  const wait = /maxWait:\s*([\d_]+),\s*\/\/ 10s/.exec(src.locks)?.[1];
  const inner = functionBody(decomment(src.service), "async function buyPositionInner(");
  if (!admission || !delays || !jitter || !pool || !run || !wait || !inner) return null;
  const n = (s: string) => Number(s.replace(/_/g, ""));
  const beforeLock = inner.slice(0, inner.indexOf("withLock(`wallet:"));
  // The awaited reads a player's bet makes before the wallet lock (the house branch's are not a player's).
  const playerPart = beforeLock.replace(/if \(ctx\.kind === "house"\) \{[\s\S]*?\n {2}\}\n/, "");
  const reads = (playerPart.match(/\bawait\b/g) ?? []).length;
  const d = delays.split(",").map((x) => n(x.trim())).filter(Number.isFinite);
  const attempts = d.length + 1;
  const parts = {
    admissionMs: n(admission), attempts, reads, poolMs: n(pool) * 1000, lockWaitMs: n(wait), lockRunMs: n(run),
    backoffMs: Math.ceil(d.reduce((a, b) => a + b, 0) * (1 + Number(jitter))),
  };
  return { ms: parts.admissionMs + parts.attempts * (parts.reads * parts.poolMs + parts.lockWaitMs + parts.lockRunMs) + parts.backoffMs, parts };
}

/* ─── The checks ──────────────────────────────────────────────────────────────────────────────────────────────── */

function run(impl: Impl, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);
  const safe = <T,>(f: () => T): T | { threw: string } => { try { return f(); } catch (e) { return { threw: String(e) }; } };
  const { SS: S, SR: M } = impl;
  const frame = (o: Partial<SS.SheetFrameInput> = {}) => S.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: viewer(facts()), nowMs: NOW, intent: null, settled: null, ...o });
  const settle = (a: SR.ActionAnswer, rr: SR.Reread = { state: "none" }, c: Partial<SR.SettleContext> = {}) => M.settleRefusal(M.refusalOutcome(a), rr, ctx(c));

  /* §1 · the frames on the deck's pools */
  const e = (stake: number | null, s: Partial<SS.SheetSeed> = {}, side: "YES" | "NO" = "YES") => S.sheetEstimate(seed(s), side, stake);
  const deck = [e(1_000), e(5_000)];
  ok("1.deck · Dodoma at TZS 1,000 → TZS 2,700 ≈2.7×; at 5,000 → TZS 12,360 ≈2.5× (the §3.1 goldens), and the frame reads exactly six fields",
    j(deck.map((x) => x && [x.state, x.payout, x.multText])) === j([["priced", 2_700, "2.7"], ["priced", 12_360, "2.5"]])
      && j(Object.keys(deck[0] ?? {}).sort()) === j(["emptySide", "lean", "multText", "overCap", "payout", "state"]), j(deck));
  const low = frame({ stakeText: "5000", viewer: viewer(facts({ wallet: wallet(2_000) })) });
  const insteadEst = low.betInsteadQuote ? S.sheetEstimate(seed(), "YES", low.betInsteadQuote.stake) : null;
  ok("1.pick3 · a balance of 2,000 at a stake of 5,000: the low frame, short by 3,000, a deposit of 3,000 and \"bet 2,000 instead\" at ≈ TZS 5,273 ≈2.6×",
    low.frame === "low" && low.low?.spendable === 2_000 && low.low?.shortfall === 3_000 && low.low?.deposit?.amount === 3_000
      && low.low?.betInstead?.stake === 2_000 && low.low?.eyebrow === true && low.betInsteadQuote?.stake === 2_000
      && insteadEst?.payout === 5_273 && insteadEst?.multText === "2.6" && low.cta?.enabled === false && low.cta?.describedBy === "callout"
      && low.showEstimate === false && low.chips === null && low.stakeInvalid && low.attention, j({ low: low.low, cta: low.cta, insteadEst }));
  const chips500 = S.sheetChips({ min: MIN, max: MAX }, null), chips1000 = S.sheetChips({ min: 1_000, max: MAX }, null);
  const open = frame({ stakeText: String(S.sheetPreset({ min: MIN, max: MAX }, null)) });
  const open1000 = S.sheetPreset({ min: 1_000, max: MAX }, null);
  ok("1.chips · A24: the chips are quickStakes(500, max) = 500 · 1,000 · 2,500 · 5,000 and the preset is 500; a market whose minimum still says 1,000 starts there (the minimum read per market)",
    MIN === 500 && j(chips500) === j([500, 1_000, 2_500, 5_000]) && j(chips1000) === j([1_000, 2_000, 5_000, 10_000])
      && open.stake === 500 && open.cta?.enabled === true && j(open.cta?.label) === j({ key: "journey.placeCta", vars: { amount: 500 } }) && open1000 === 1_000
      && S.sheetPreset({ min: MIN, max: MAX }, 2_500) === 2_500 && S.sheetPreset({ min: MIN, max: MAX }, 100) === MIN, j({ chips500, chips1000, open: open.cta }));
  const states = {
    overCap: e(MIN, { yesPool: 1_000, noPool: 500_000 }),
    thin: e(MIN, { yesPool: 500_000, noPool: 20_000 }),
    legacy: e(MIN, { rates: { feeModel: "capped-commission", commissionRate: 0.1, feeCeilingRate: 0.333 } }),
    off: e(MIN, { rates: { ...RATES, showEstimatedWinnings: false } }),
    emptyPool: e(MIN, { yesPool: 0, noPool: 0 }),
    emptySide: e(MIN, { yesPool: 0, noPool: 3_000 }),
    oneSide: e(MIN, { yesPool: 3_000, noPool: 0 }),
    noStake: e(null),
  };
  ok("1.states · over the cap a figure and overCap (the sheet prints the TZS figure); a thin side; a legacy fee and the display switch off hidden; an empty pool; an empty side priced; one side refunded; no stake priced at nothing — each from estimateFor",
    states.overCap?.overCap === true && states.overCap.payout !== null && states.overCap.multText === "100"
      && states.thin?.lean === "thin" && states.legacy?.state === "hidden" && states.off?.state === "hidden"
      && states.emptyPool?.state === "emptyPool" && states.emptyPool.emptySide === "BOTH"
      && states.emptySide?.state === "fillsEmptySide" && states.emptySide.payout !== null && states.emptySide.emptySide === "YES"
      && states.oneSide?.state === "oneSidedRefund" && states.oneSide.emptySide === "NO" && states.noStake?.state === "invalidStake" && states.noStake.payout === null, j(states));
  const bare = [frame({ stakeText: "" }), frame({ stakeText: "499" }), frame({ stakeText: String(MAX + 1) }), frame({ stakeText: "1500.5" })];
  ok("1.cta · the CTA is bare and disabled with no stake and out of bounds, and the bounds line names the break (below · above · not whole); a stake with grouping marks is read whole",
    bare.every((f) => f.frame === "edit" && f.cta?.enabled === false && j(f.cta?.label) === j({ key: "journey.placeCtaBare" }) && f.quote === null)
      && j(bare.map((f) => f.breaks)) === j(["empty", "below", "above", "notWhole"]) && bare[1].stakeInvalid && bare[1].cta?.describedBy === "bounds"
      && j(S.sheetStake("TZS 5,000", { min: MIN, max: MAX })) === j({ stake: 5_000, breaks: null }) && j(S.sheetStake("5000.00", { min: MIN, max: MAX })) === j({ stake: 5_000, breaks: null }),
    j(bare.map((f) => [f.breaks, f.cta])));
  const holders = [S.holderLine([], "YES"), S.holderLine(["YES"], "YES"), S.holderLine(["NO"], "YES"), S.holderLine(["YES", "NO"], "NO")];
  ok("1.holder · none · this side · the other side (the hedge note) · both", j(holders) === j(["none", "this", "other", "both"]), j(holders));

  /* §2 · the refusal matrix */
  const busyKey = S.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: viewer(facts()), nowMs: NOW, intent: { quote: q(5_000), key: K1, phase: "retry", sentAt: null, settledAt: NOW }, settled: settle(R(fail({ code: "BUSY", retryAfterSec: 1 }))) });
  type G = { name: string; a: SR.ActionAnswer; rr?: SR.Reread; c?: Partial<SR.SettleContext>; want: Record<string, unknown> };
  const okRead = (bettable: boolean, f: SS.SheetFacts | null = facts()): SR.Reread => ({ state: "read", market: { found: true, bettable }, viewer: f ? (viewer(f) as { viewer: SS.SheetViewer }).viewer : null });
  const gone: SR.Reread = { state: "read", market: { found: false }, viewer: null };
  const goldens: G[] = [
    { name: "1 BUSY", a: R(fail({ code: "BUSY", retryAfterSec: 1 })), want: { row: 1, view: "inline", line: "journey.sheetBusy", retry: "same", doubt: "none", marker: "dropKey" } },
    { name: "2 throw", a: T(new Error("dropped line")), want: { row: 2, view: "inDoubt", retry: "same", doubt: "enter", marker: "keepKey" } },
    { name: "3 skew", a: T(Object.assign(new Error("Server Action x was not found"), { name: "UnrecognizedActionError" })), want: { row: 3, view: "skew", reload: true, retry: "none", doubt: "none", marker: "dropKey" } },
    { name: "3 skew spent", a: T(Object.assign(new Error("x"), { name: "UnrecognizedActionError" })), c: { reloadSpent: true }, want: { row: 3, view: "skew", reload: false } },
    { name: "4 redirect", a: T(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/auth/login?next=%2F;307;" })), want: { row: 4, view: "redirect", retry: "none", doubt: "none", marker: "dropKey" } },
    { name: "5 rate", a: R(fail({ code: "RATE_LIMITED", reason: "rate_limited", retryAfterSec: 7 })), want: { row: 5, view: "inline", line: "journey.sheetRateLimited", vars: { sec: 7 }, retry: "new" } },
    { name: "6 maintenance", a: R(fail({ code: "SUSPENDED", reason: "maintenance" })), want: { row: 6, view: "inline", line: "error.failMaintenance", retry: "new" } },
    { name: "7 cooling", a: R(fail({ code: "SUSPENDED", reason: "cooling_off", detail: { until: "8 Oct 2026, 14:30", untilAt: "2026-10-08T11:30:00.000Z" } })), want: { row: 7, view: "block", block: "cooling_off", body: "error.failCoolingOff", actions: ["setLimits", "gotIt"], untilAt: "2026-10-08T11:30:00.000Z", retry: "none" } },
    { name: "8 self-ex", a: R(fail({ code: "SUSPENDED", reason: "self_excluded", detail: { until: "1 Apr 2027", untilAt: "2027-04-01T00:00:00.000Z" } })), want: { row: 8, view: "block", block: "self_excluded", body: "error.failSelfExcluded", actions: ["gotIt"] } },
    { name: "9 session", a: R(fail({ code: "SUSPENDED", reason: "session_limit_reached", detail: { limitMin: 30, playedMin: 31 } })), want: { row: 9, view: "inline", line: "journey.sheetSessionLimit", vars: { limitMin: 30 }, retry: "new" } },
    { name: "10 account not found (the market bets)", a: R(fail({ code: "NOT_FOUND" })), rr: okRead(true), want: { row: 10, view: "block", block: "not_found", body: "journey.sheetBlocked", actions: ["contactSupport", "gotIt"] } },
    { name: "10/12 NOT_FOUND, the market gone", a: R(fail({ code: "NOT_FOUND" })), rr: gone, want: { row: 10, view: "closed", body: "journey.sheetNotTaking" } },
    { name: "11 account blocked", a: R(fail({ code: "SUSPENDED", reason: "account_blocked" })), want: { row: 11, view: "block", block: "account_blocked", body: "journey.sheetBlocked", actions: ["contactSupport", "gotIt"] } },
    { name: "12 not accepting, not bettable", a: R(fail({ code: "INVALID" })), rr: okRead(false), want: { row: 12, view: "closed", body: "journey.sheetNotTaking", retry: "new" } },
    { name: "12 not accepting, after the close", a: R(fail({ code: "INVALID" })), rr: okRead(false), c: { nowMs: NOW + 3_600_000 }, want: { row: 12, view: "closed", body: "journey.sheetClosedBody" } },
    { name: "12 not accepting, still bettable", a: R(fail({ code: "INVALID" })), rr: okRead(true), want: { row: 12, view: "inline", line: "journey.sheetNotTaking" } },
    { name: "12 not accepting, a failed read", a: R(fail({ code: "INVALID" })), rr: { state: "failed" }, want: { row: 12, view: "inline", line: "journey.sheetNotTaking" } },
    { name: "13 selection closed (pre-lock)", a: R(fail({ code: "SELECTION_CLOSED" })), want: { row: 13, view: "closed", body: "journey.sheetClosedBody", retry: "none" } },
    { name: "14 below min", a: R(fail({ code: "INVALID", reason: "stake_below_min", detail: { min: 1_000, max: MAX } })), want: { row: 14, view: "bounds", bounds: { min: 1_000, max: MAX }, retry: "new" } },
    { name: "14 not whole", a: R(fail({ code: "INVALID", reason: "stake_not_whole", detail: { min: MIN, max: MAX } })), want: { row: 14, view: "bounds" } },
    { name: "15 market_not_live, bettable", a: R(fail({ code: "INVALID", reason: "market_not_live" })), rr: okRead(true), want: { row: 15, view: "inline", line: "journey.sheetNotTaking", retry: "new" } },
    { name: "16 key conflict", a: R(fail({ code: "INVALID", reason: "idempotency_key_conflict" })), want: { row: 16, view: "inline", line: "error.failIdempotencyKeyConflict", retry: "new" } },
    { name: "17 frozen", a: R(fail({ code: "NOT_FOUND", reason: "wallet_frozen" })), want: { row: 17, view: "block", block: "wallet_held", body: "journey.sheetFrozen", actions: ["contactSupport", "gotIt"] } },
    { name: "18 wallet missing", a: R(fail({ code: "NOT_FOUND", reason: "wallet_missing" })), want: { row: 18, view: "inline", line: "error.failWalletMissing", retry: "new" } },
    { name: "19 loss, room left", a: R(fail({ code: "INVALID", reason: "loss_limit_daily" })), rr: okRead(true, facts({ loss: { dailyLossLimit: 10_000, lossToday: 8_000 } })), want: { row: 19, view: "lossRoom", headroom: 2_000 } },
    { name: "19 loss, below the minimum", a: R(fail({ code: "INVALID", reason: "loss_limit_daily" })), rr: okRead(true, facts({ loss: { dailyLossLimit: 10_000, lossToday: 9_800 } })), want: { row: 19, view: "block", block: "loss_limit", body: "error.failLossLimitDaily", actions: ["setLimits", "gotIt"] } },
    { name: "19 loss, a failed read", a: R(fail({ code: "INVALID", reason: "loss_limit_daily" })), rr: { state: "failed" }, want: { row: 19, view: "block", block: "loss_limit" } },
    { name: "20 balance, with figures", a: R(fail({ code: "INVALID", reason: "balance_insufficient", detail: { balance: 2_000, needed: 5_000 } })), rr: okRead(true, facts({ wallet: wallet(2_000) })), want: { row: 20, view: "plan", plan: "short", retry: "new" } },
    { name: "21 balance, the abort", a: R(fail({ code: "INVALID", reason: "balance_insufficient" })), rr: okRead(true, facts({ wallet: wallet(2_000) })), want: { row: 21, view: "plan", plan: "short" } },
    { name: "21 balance, a failed read", a: R(fail({ code: "INVALID", reason: "balance_insufficient" })), rr: { state: "failed" }, want: { row: 21, view: "lowNoRead" } },
    { name: "22 selection closed (in flight)", a: R(fail({ code: "SELECTION_CLOSED", reason: "selection_closed" })), want: { row: 22, view: "closed", body: "journey.sheetClosedBody", retry: "none" } },
    { name: "23 the action's own refusal", a: R({ ok: false, error: "Invalid side." }), want: { row: 23, view: "inDoubt", retry: "same", doubt: "enter", marker: "keepKey" } },
    { name: "24 replayed (L2)", a: R({ ok: true, data: { positionId: "pos_1", balance: 0, payoutIfWin: 0, placedAt: "", bonusStakeTzs: 0, replayed: true } }), want: { row: 24, view: "receipt", positionId: "pos_1", replayed: true, retry: "none", marker: "clear" } },
    { name: "25 placed", a: R({ ok: true, data: { positionId: "pos_2", balance: 0, payoutIfWin: 0, placedAt: "", bonusStakeTzs: 0 } }), want: { row: 25, view: "receipt", positionId: "pos_2", replayed: false, marker: "clear" } },
    { name: "unknown: a reason no row knows", a: R(fail({ code: "INVALID", reason: "a_reason_from_the_future" })), want: { row: 2, view: "inDoubt", doubt: "enter" } },
    { name: "unknown: ok with no ticket", a: R({ ok: true, data: {} }), want: { row: 2, view: "inDoubt", doubt: "enter" } },
    { name: "unknown: nothing at all", a: R(undefined), want: { row: 2, view: "inDoubt", doubt: "enter" } },
  ];
  const flat = (s: SS.Settled) => {
    const v = s.view as Record<string, unknown> & SS.SettledView;
    const o: Record<string, unknown> = { row: s.row, view: v.kind, retry: s.retry, doubt: s.doubt, marker: s.marker };
    if (v.kind === "inline") { o.line = v.line.key; o.vars = v.line.vars; }
    if (v.kind === "block") { o.block = v.block.reason; o.body = v.block.body.key; o.actions = v.block.actions; o.untilAt = v.block.body.vars?.untilAt; }
    if (v.kind === "closed") o.body = v.body;
    if (v.kind === "bounds") o.bounds = v.bounds;
    if (v.kind === "lossRoom") o.headroom = v.headroom;
    if (v.kind === "plan") o.plan = v.plan.kind;
    if (v.kind === "receipt") { o.positionId = v.positionId; o.replayed = v.replayed; }
    if (v.kind === "skew") o.reload = v.reload;
    return o;
  };
  const off = goldens.map((g) => {
    const got = safe(() => flat(settle(g.a, g.rr ?? { state: "none" }, g.c ?? {})));
    const bad = "threw" in got ? ["threw"] : Object.keys(g.want).filter((k) => j(got[k]) !== j(g.want[k]));
    return { name: g.name, bad, got };
  }).filter((x) => x.bad.length > 0);
  ok(`2.matrix · every row as a golden (${goldens.length} answers and their re-reads → the settled view, the retry, the doubt and the marker)`,
    off.length === 0, j(off.slice(0, 3)));
  const prose = [M.refusalOutcome(R(fail({ code: "INVALID", error: "Daily loss limit reached." }))), M.refusalOutcome(R(fail({ error: "Wallet unavailable." })))];
  ok("2.prose · the matrix never reads `error`: an INVALID whose sentence names the loss limit is row 12, and a bare sentence is row 23",
    prose[0].row === 12 && prose[1].row === 23, j(prose.map((p) => p.row)));
  const orders = [M.refusalOutcome(T(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;push;/auth/login;303;", name: "UnrecognizedActionError" })))];
  ok("2.order · A6: a rejection is asked about the redirect first (isActionRedirect), then the deploy skew, and only then mapped to system_error",
    orders[0].row === 4 && M.refusalOutcome(T({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" })).row === 2, j(orders));
  ok("2.busy-cta · after BUSY the CTA is \"Jaribu tena · {amount}\" with the same key, enabled; the busy line shows",
    busyKey.frame === "edit" && j(busyKey.cta?.label) === j({ key: "journey.retryCta", vars: { amount: 5_000 } }) && busyKey.cta?.enabled === true
      && busyKey.lines.some((l) => l.key === "journey.sheetBusy"), j({ cta: busyKey.cta, lines: busyKey.lines }));
  const cen = census(impl.src);
  const classifiedR = new Set(impl.SR.CLASSIFIED_REASONS), classifiedC = new Set(impl.SR.CLASSIFIED_CODES), house = new Set(impl.SR.HOUSE_ONLY_REASONS);
  const unclassified = cen.sites.filter((s) => s.reasons.length === 0 ? s.code !== null && !classifiedC.has(s.code) : s.reasons.some((r) => !classifiedR.has(r) && !house.has(r)));
  const seenR = new Set(cen.sites.flatMap((s) => s.reasons)), seenC = new Set(cen.sites.map((s) => s.code).filter(Boolean) as string[]);
  const positive = ["maintenance", "rate_limited", "cooling_off", "self_excluded", "session_limit_reached", "account_blocked", "stake_not_whole", "stake_below_min", "stake_above_max", "market_not_live",
    "idempotency_key_conflict", "wallet_frozen", "wallet_missing", "loss_limit_daily", "balance_insufficient", "selection_closed"].every((r) => seenR.has(r))
    && ["BUSY", "RATE_LIMITED", "SUSPENDED", "NOT_FOUND", "INVALID", "SELECTION_CLOSED"].every((c) => seenC.has(c))
    && cen.sites.filter((s) => s.code === null && s.reasons.length === 0).length === 2 && cen.sites.length >= 25;
  ok("2.census · every reason and code literal on the player bet path (buyPosition, landedKeyAnswer, buyPositionInner, buyPositionAction; ternaries read) has a row — the house seam's two reasons excepted, by name — and the reader found them all",
    cen.missing.length === 0 && unclassified.length === 0 && positive && [...house].every((r) => seenR.has(r)), j({ missing: cen.missing, unclassified, sites: cen.sites.length }));
  // The house seam's two reasons are excepted by name above and are not the registry's (they never reach a player).
  const unreal = [...classifiedR].filter((r) => !Object.prototype.hasOwnProperty.call(REASONS, r));
  ok("2.registry · the matrix classifies only reasons the registry already has (no reason added), and no classified reason is one the path never sends (system_busy is BUSY's, by its code)",
    unreal.length === 0 && [...classifiedR].every((r) => seenR.has(r) || r === "system_busy"), j({ unreal, never: [...classifiedR].filter((r) => !seenR.has(r)) }));

  /* §3 · exactly once */
  let n = 0;
  const mint = () => [K1, K2][n++ % 2];
  n = 0;
  const first = S.nextKey(null, q(5_000), mint);
  const placing: SS.SheetIntent = { quote: q(5_000), key: first.key, phase: "placing", sentAt: NOW, settledAt: null };
  const dbl = S.nextKey(placing, q(5_000), mint);
  const keyAfter = (a: SR.ActionAnswer, quote = q(5_000)) => { const s = settle(a); const next = S.afterSettle(placing, s, NOW + 500); return S.nextKey(next, quote, () => K2); };
  const afterBusy = keyAfter(R(fail({ code: "BUSY" }))), afterBusyEdit = keyAfter(R(fail({ code: "BUSY" })), q(2_500));
  const afterThrow = keyAfter(T(new Error("x")), q(2_500));
  const afterOthers = [R(fail({ code: "SUSPENDED", reason: "maintenance" })), R(fail({ code: "INVALID", reason: "stake_below_min", detail: { min: MIN, max: MAX } })), R(fail({ code: "NOT_FOUND", reason: "wallet_missing" })), R(fail({ code: "RATE_LIMITED", reason: "rate_limited" }))].map((a) => keyAfter(a));
  ok("3.keys · mint for a first tap; a double tap while placing reuses; BUSY reuses for the same stake and mints for an edited one; a throw (in doubt) reuses the key AND the frozen quote; every other refusal mints a new key",
    first.key === K1 && !first.reused && dbl.key === K1 && dbl.reused && afterBusy.key === K1 && afterBusy.reused && afterBusyEdit.key === K2 && !afterBusyEdit.reused
      && afterThrow.key === K1 && afterThrow.quote.stake === 5_000 && afterOthers.every((k) => k.key === K2 && !k.reused), j({ first, dbl, afterBusy, afterBusyEdit, afterThrow, afterOthers }));
  const doubt: SS.SheetIntent = { quote: q(5_000), key: K1, phase: "inDoubt", sentAt: null, settledAt: NOW };
  const preLock = [R(fail({ code: "SUSPENDED", reason: "maintenance" })), R(fail({ code: "BUSY" })), R(fail({ code: "RATE_LIMITED", reason: "rate_limited" })), R(fail({ code: "SUSPENDED", reason: "session_limit_reached", detail: { limitMin: 30 } })),
    R(fail({ code: "SUSPENDED", reason: "cooling_off", detail: { until: "x" } })), R(fail({ code: "INVALID" })), R(fail({ code: "SELECTION_CLOSED" })), R(fail({ code: "INVALID", reason: "stake_above_max", detail: { min: MIN, max: MAX } })), T(new Error("x")),
    T(Object.assign(new Error("x"), { name: "UnrecognizedActionError" })), T({ digest: "NEXT_REDIRECT;replace;/auth/login;307;" }), R({ ok: false, error: "Invalid bet parameters." })];
  const held = preLock.map((a) => settle(a, { state: "failed" }, { inDoubt: true }));
  const heldFrames = held.map((s) => S.sheetFrame({ seed: seed(), side: "YES", stakeText: "2500", viewer: viewer(facts({ wallet: wallet(100) })), nowMs: NOW, intent: S.afterSettle(doubt, s, NOW + 1_000), settled: s }));
  const claims = heldFrames.flatMap((f) => f.lines.map((l) => l.key)).filter((k) => k === "journey.sheetBusy" || k === "error.failMaintenance");
  ok("3.doubt · in doubt, every refusal made before the wallet lock (and a throw, a skew, a redirect, the action's own refusal) HOLDS the doubt: the key kept, the marker keeps it, the frame stays in doubt over a low balance, the stake locked to the frozen quote, and no line claims nothing was charged",
    held.every((s) => s.doubt === "hold" && s.retry === "same" && s.marker === "keepKey") && claims.length === 0
      && heldFrames.every((f) => f.frame === "inDoubt" && f.stake === 5_000 && f.stakeLocked && f.lines[0]?.key === "error.failSystemError" && j(f.cta?.label) === j({ key: "journey.retryCta", vars: { amount: 5_000 } }))
      && heldFrames[3].lines.some((l) => l.key === "journey.sheetSessionLimit"), j({ held: held.map((s) => [s.row, s.doubt, s.marker]), claims, lines: heldFrames.map((f) => f.lines.map((l) => l.key)) }));
  const ends = [R(fail({ code: "INVALID", reason: "idempotency_key_conflict" })), R(fail({ code: "NOT_FOUND", reason: "wallet_frozen" })), R(fail({ code: "NOT_FOUND", reason: "wallet_missing" })), R(fail({ code: "INVALID", reason: "loss_limit_daily" })),
    R(fail({ code: "INVALID", reason: "balance_insufficient" })), R(fail({ code: "SELECTION_CLOSED", reason: "selection_closed" })), R({ ok: true, data: { positionId: "pos_9", replayed: true } })]
    .map((a) => settle(a, okRead(true, facts({ wallet: wallet(100) })), { inDoubt: true }));
  ok("3.doubt-ends · in doubt, a refusal from inside the wallet lock (rows 16–22) and a receipt end the doubt; a replay is one ticket and clears the marker",
    ends.every((s) => s.doubt === "end") && ends.slice(0, 6).every((s) => s.marker === "dropKey") && ends[6].view.kind === "receipt" && ends[6].marker === "clear"
      && S.afterSettle(doubt, ends[6], NOW) === null, j(ends.map((s) => [s.row, s.doubt, s.view.kind, s.marker])));
  const editedFrame = S.sheetFrame({ seed: seed(), side: "YES", stakeText: "2500", viewer: viewer(facts()), nowMs: NOW, intent: doubt, settled: null });
  const sentAfterEdit = S.nextKey(doubt, q(2_500), () => K2);
  const fd = S.requestFor(sentAfterEdit.quote, sentAfterEdit.key);
  ok("3.frozen · a stake edited after the tap is not sent: in doubt the frame shows the frozen stake and the request carries it under the old key",
    editedFrame.stake === 5_000 && fd?.get("stake") === "5000" && fd?.get("idempotencyKey") === K1, j({ stake: editedFrame.stake, sent: fd && Object.fromEntries(fd.entries()) }));
  const good = S.requestFor(q(5_000), K1);
  const fields = good ? [...good.keys()].sort() : [];
  const refused = [S.requestFor({ marketId: MKT, side: "UP" as never, stake: 5_000 }, K1), S.requestFor(q(1_500.5), K1), S.requestFor(q(0), K1), S.requestFor(q(5_000), `hb:${K1}`), S.requestFor(q(5_000), "not-a-uuid"), S.requestFor({ marketId: "udr_x", side: "YES", stake: 5_000 }, K1)];
  ok("3.request · exactly marketId, side, stake as digits, idempotencyKey and funnelBetFields(fd, \"sheet\")'s three fields; YES or NO only, a whole positive stake, never a house key",
    j(fields) === j(["funnelOrigin", "funnelUtmCampaign", "funnelUtmSource", "idempotencyKey", "marketId", "side", "stake"])
      && good?.get("side") === "YES" && good?.get("stake") === "5000" && good?.get("funnelOrigin") === "sheet" && good?.get("marketId") === MKT
      && refused.every((r) => r === null) && S.isIntentKey(S.mintIntentKey()) && !S.isIntentKey(`hb:${K1}`), j({ fields, refused: refused.map((r) => r === null) }));
  const stages = [S.placingStage(NOW, NOW + 1_499), S.placingStage(NOW, NOW + 1_500), S.placingStage(NOW, NOW + 19_999), S.placingStage(NOW, NOW + 20_000)];
  const dog = S.watchdog(placing, NOW + 20_000);
  const dogFrame = S.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: viewer(facts()), nowMs: NOW + 20_000, intent: dog, settled: null });
  const slowFrame = S.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: viewer(facts()), nowMs: NOW + 1_600, intent: placing, settled: null });
  ok("3.watchdog · the wait line at 1.5 s, in doubt at 20 s with the request still out: the ✕ returns and \"Jaribu tena\" stays disabled until it settles; placing locks everything and withholds the ✕",
    j(stages) === j(["placing", "slow", "slow", "doubt"]) && dog.phase === "inDoubt" && dog.settledAt === null && dogFrame.frame === "inDoubt" && dogFrame.cta?.enabled === false && dogFrame.closable
      && slowFrame.frame === "placing" && !slowFrame.closable && slowFrame.stakeLocked && slowFrame.cta?.enabled === false && slowFrame.lines.some((l) => l.key === "journey.sheetPlacingSlow")
      && S.quoteAt(slowFrame) === null, j({ stages, dog, dogCta: dogFrame.cta }));
  const settles = [S.afterKeyRead(doubt, { positionId: "pos_x" }, NOW + 1), S.afterKeyRead(doubt, null, NOW + S.DOUBT_SETTLE_MS - 1), S.afterKeyRead(doubt, null, NOW + S.DOUBT_SETTLE_MS),
    S.afterKeyRead({ ...doubt, settledAt: null }, null, NOW + 10 * S.DOUBT_SETTLE_MS), S.afterKeyRead(placing, null, NOW + 10 * S.DOUBT_SETTLE_MS)];
  ok("3.settle · a position from the key read is the receipt; none ends the doubt only DOUBT_SETTLE_MS after the last attempt SETTLED — never while a request is out, never counted from the send",
    j(settles) === j(["receipt", "holds", "ended", "holds", "holds"]) && S.keyReadDelay(NOW, NOW + 59_999) === 5_000 && S.keyReadDelay(NOW, NOW + 60_000) === 30_000, j(settles));
  const ceil = doubtCeiling(impl.src);
  ok("3.ceiling · DOUBT_SETTLE_MS (10 min) is at least the ceiling recomputed from the server's own timeouts: admission's clamp + attempts × (pre-lock reads × the pool wait + the lock's wait and run) + the backoff",
    ceil !== null && ceil.parts.reads >= 5 && ceil.parts.attempts === 4 && S.DOUBT_SETTLE_MS >= ceil.ms, j(ceil));
  const bet = { kind: "market" as const, id: MKT, side: "YES" as const, stake: 5_000 };
  const marker = (k?: string, b = "mkt_dodoma01.YES.5000") => JSON.stringify({ bet: b, at: NOW - 1_000, ...(k === undefined ? {} : { k }) });
  const mk = [S.markerKeyFor(marker(K1), bet, NOW), S.markerKeyFor(marker(), bet, NOW), S.markerKeyFor(marker("hb:x"), bet, NOW), S.markerKeyFor(marker(K1, "mkt_dodoma01.YES.2500"), bet, NOW),
    S.markerKeyFor(marker(K1), bet, NOW + 25 * 3_600_000)];
  const reopened = S.reopenInDoubt(q(5_000), K1, NOW);
  ok("3.marker · A3: a reopened sheet reads its key from this browser's marker only for the same bet, a well-formed key and a fresh marker; it reopens in doubt, its window from the page's load",
    j(mk) === j([K1, null, null, null, null]) && reopened.phase === "inDoubt" && reopened.settledAt === NOW && S.nextKey(reopened, q(500), () => K2).key === K1, j(mk));

  /* §4 · the low-balance branches */
  const F = (f: Partial<SS.SheetFacts>, stakeText = "5000", s: Partial<SS.SheetSeed> = {}, nowMs = NOW) => frame({ viewer: viewer(facts(f)), stakeText, seed: seed(s), nowMs });
  const branch = {
    maintenance: F({ maintenance: true }),
    selfex: F({ lockout: { kind: "self_exclusion", until: "1 Apr 2027" } }),
    cooling: F({ lockout: { kind: "cooling_off", until: "8 Oct 2026, 14:30" } }),
    session: F({ session: { exceeded: true, limitMin: 30, playedMin: 31 } }),
    blocked: F({ account: { status: "SUSPENDED" } }),
    closed: frame({ seed: seed({ bettable: false }) }),
    held: F({ wallet: { status: "FROZEN", balance: 50_000, bonusBalance: 0 } }),
    lossRoom: F({ loss: { dailyLossLimit: 10_000, lossToday: 8_000 } }),
    lossBlock: F({ loss: { dailyLossLimit: 10_000, lossToday: 9_800 } }),
    unknown: F({ wallet: wallet(null) }),
    loading: frame({ viewer: { state: "loading" } }),
    failed: frame({ viewer: { state: "failed" } }),
    enough: F({}),
  };
  const tagOf = (f: SS.SheetFrame) => `${f.frame}${f.block ? `:${f.block.reason}` : ""}${f.cta ? (f.cta.enabled ? "+" : "-") : ""}`;
  const tags = Object.fromEntries(Object.entries(branch).map(([k, f]) => [k, tagOf(f)]));
  ok("4.blocks · maintenance and the session limit: the edit frame, CTA disabled, their line; a break, the account and a held wallet: their block; a closed market: closed; the loss room above the minimum, its block below; unknown, loading and a failed read: the CTA enabled",
    j(tags) === j({ maintenance: "edit-", selfex: "blocked:self_excluded", cooling: "blocked:cooling_off", session: "edit-", blocked: "blocked:account_blocked", closed: "closed", held: "blocked:wallet_held",
      lossRoom: "lossRoom-", lossBlock: "blocked:loss_limit", unknown: "edit+", loading: "edit+", failed: "edit+", enough: "edit+" })
      && branch.maintenance.lines[0]?.key === "error.failMaintenance" && branch.session.lines[0]?.key === "journey.sheetSessionLimit" && branch.session.lines[0]?.vars?.limitMin === 30
      && branch.cooling.block?.body.vars?.until === "8 Oct 2026, 14:30" && j(branch.cooling.block?.actions) === j(["setLimits", "gotIt"])
      && j(branch.lossRoom.chips) === j([500, 1_000]) && branch.lossRoom.lossRoom?.headroom === 2_000 && j(branch.lossRoom.cta?.label) === j({ key: "journey.placeCtaBare" }) && branch.lossRoom.attention,
    j(tags));
  const b0 = { min: MIN, max: MAX };
  const planAt = (f: Partial<SS.SheetFacts>) => S.sheetPlan(viewer(facts(f)), seed(), MIN, NOW);
  const recs = {
    session: S.openReadRecord(planAt({ session: { exceeded: true, limitMin: 30, playedMin: 31 } }), true, b0),
    sessionRefresh: S.openReadRecord(planAt({ session: { exceeded: true, limitMin: 30, playedMin: 31 } }), false, b0),
    sessionUnderMaintenance: S.openReadRecord(planAt({ maintenance: true, session: { exceeded: true, limitMin: 30, playedMin: 31 } }), true, b0),
    account: S.openReadRecord(planAt({ account: { status: "SUSPENDED" } }), true, b0),
    lossBlock: S.openReadRecord(planAt({ loss: { dailyLossLimit: 10_000, lossToday: 9_800 } }), true, b0),
    lossRoom: S.openReadRecord(S.sheetPlan(viewer(facts({ loss: { dailyLossLimit: 10_000, lossToday: 8_000 } })), seed(), 5_000, NOW), true, b0),
    breakNone: S.openReadRecord(planAt({ lockout: { kind: "cooling_off", until: "x" } }), true, b0),
    heldNone: S.openReadRecord(planAt({ wallet: { status: "FROZEN", balance: 1, bonusBalance: 0 } }), true, b0),
    within: S.openReadRecord(planAt({}), true, b0),
  };
  ok("4.open-read · A4: the open's read writes what a refused tap writes — the session limit's enforced row, the account's and the loss block's (at the minimum stake), each marked at: sheet — in the bet path's order; nothing for a refresh, a break, maintenance, a held wallet, the loss room or a viewer within every limit",
    j(recs) === j({
      session: { action: "rg.session_limit.enforced", payload: { at: "sheet" } }, sessionRefresh: null, sessionUnderMaintenance: null,
      account: { action: "bet.account_blocked", payload: { at: "sheet" } }, lossBlock: { action: "bet.loss_limit_blocked", payload: { stake: MIN, at: "sheet" } },
      lossRoom: null, breakNone: null, heldNone: null, within: null,
    }), j(recs));
  ok("4.balance · A9: loading is not unavailable (the row loads, no words); a failed read and an unread wallet are unknown; a read shows the server's spendable figure, never one the sheet computed",
    branch.loading.balance.kind === "loading" && branch.failed.balance.kind === "unknown" && branch.unknown.balance.kind === "unknown"
      && j(F({ wallet: wallet(3_000, 2_000) }).balance) === j({ kind: "known", spendable: 5_000 }), j([branch.loading.balance, branch.failed.balance, branch.unknown.balance]));
  const lowOf = (f: SS.SheetFrame) => f.low && { d: f.low.deposit?.amount ?? null, below: f.low.deposit?.belowDepositMin ?? null, left: f.low.deposit?.leftAfter ?? null, instead: f.low.betInstead?.stake ?? null, why: f.low.depositRefusal, eyebrow: f.low.eyebrow };
  const lows = {
    zero500: lowOf(F({ wallet: wallet(0) }, String(MIN))),
    min1500: lowOf(F({ wallet: wallet(1_200) }, "1500")),
    depositOnly: lowOf(F({ wallet: wallet(0) })),
    paused: lowOf(F({ wallet: wallet(2_000), deposit: { ...facts().deposit, railsOpen: false } })),
    limit: lowOf(F({ wallet: wallet(2_000), deposit: { ...facts().deposit, limits: { daily: 10_000, weekly: null, monthly: null }, usage: { day: 8_000, week: 8_000, month: 8_000 } } })),
    sofNone: lowOf(F({ wallet: wallet(100), deposit: { ...facts().deposit, usage: { day: 0, week: 0, month: 4_999_000 } } })),
    sofInstead: lowOf(F({ wallet: wallet(2_000), deposit: { ...facts().deposit, usage: { day: 0, week: 0, month: 4_999_000 } } })),
    max: lowOf(F({ wallet: wallet(0), deposit: { ...facts().deposit, sof: { accepted: true, singleTxn: 1_000_000, rolling30d: 5_000_000 } } }, String(DEPOSIT_MAX_TZS + 1_000), { max: DEPOSIT_MAX_TZS * 2 })),
  };
  ok("4.low · A24: at the minimum stake a zero balance is short by less than the deposit minimum (deposit 1,000, 500 left after); 1,500 on 1,200 → deposit 1,000 with 700 left, or bet 1,200 instead; deposit only; paused rails, the deposit limit and source of funds with or without bet instead; the deposit maximum",
    j(lows) === j({
      zero500: { d: DEPOSIT_MIN_TZS, below: true, left: 500, instead: null, why: null, eyebrow: false },
      min1500: { d: DEPOSIT_MIN_TZS, below: true, left: 700, instead: 1_200, why: null, eyebrow: true },
      depositOnly: { d: 5_000, below: false, left: 0, instead: null, why: null, eyebrow: false },
      paused: { d: null, below: null, left: null, instead: 2_000, why: "rails_paused", eyebrow: false },
      limit: { d: null, below: null, left: null, instead: 2_000, why: "deposit_limit", eyebrow: false },
      sofNone: { d: null, below: null, left: null, instead: null, why: "sof_required", eyebrow: false },
      sofInstead: { d: null, below: null, left: null, instead: 2_000, why: "sof_required", eyebrow: false },
      max: { d: null, below: null, left: null, instead: null, why: "deposit_max", eyebrow: false },
    }), j(lows));
  const pend = (ageMs: number, phoneSkewMs = 0) => {
    const created = new Date(NOW - ageMs).toISOString();
    return S.sheetFrame({ seed: seed(), side: "YES", stakeText: "5000", viewer: viewer(facts({ wallet: wallet(2_000), pendingDeposit: { amount: 3_000, txnId: "txn_p", createdAt: created } })),
      nowMs: NOW + phoneSkewMs, offsetMs: -phoneSkewMs, intent: null, settled: null });
  };
  const bands = [pend(9 * 60_000 + 59_000, 3_600_000), pend(10 * 60_000, 3_600_000), pend(29 * 60_000 + 59_000, -7_200_000), pend(30 * 60_000, -7_200_000)];
  ok("4.pending · A10 on a phone clock an hour fast or two hours slow: under 10 minutes the live sentence, then \"up to 30 minutes\", from 30 the late title and body with \"bet instead\" beside it — the deposit offer withheld at every age, the CTA disabled",
    j(bands.map((f) => [f.frame, f.pending?.band, f.pending?.title.key, f.pending?.body.key, f.pending?.betInstead?.stake ?? null, f.cta?.enabled, f.low])) === j([
      ["pending", "fresh", "journey.lowPendingTitle", "common.depositPendingBody", null, false, null],
      ["pending", "long", "journey.lowPendingTitle", "journey.lowPendingWaitBody", null, false, null],
      ["pending", "long", "journey.lowPendingTitle", "journey.lowPendingWaitBody", null, false, null],
      ["pending", "late", "journey.lowPendingLateTitle", "journey.lowPendingLateBody", 2_000, false, null],
    ]) && bands[0].pending?.title.vars?.amount === 3_000 && bands[3].betInsteadQuote?.stake === 2_000 && bands[0].betInsteadQuote === null,
    j(bands.map((f) => f.pending)));
  const leftPlan = impl.plan({ ...facts({ wallet: wallet(800) }), market: { live: true, selectionClosed: false }, stake: 2_000, bounds: { min: MIN, max: MAX }, nowMs: NOW });
  const lp = leftPlan.kind === "short" ? leftPlan.options.find((o) => o.kind === "deposit") as SF.DepositOption | undefined : undefined;
  ok("4.leftAfter · every deposit option carries leftAfter = spendable + D − stake (800 + 1,200 − 2,000 = 0; 1,200 + 1,000 − 1,500 = 700)",
    lp?.amount === 1_200 && lp.leftAfter === 0 && lows.min1500?.left === 700, j(leftPlan));

  /* §5 · the clock, the cue and the pages */
  const closeAt = NOW + 60_000;
  const skewed = seed({ closesAt: new Date(closeAt).toISOString(), serverNow: NOW });
  const phoneAhead = 5 * 60_000; // the phone's clock runs five minutes fast
  const off5 = S.clockOffset(NOW, NOW + phoneAhead);
  const flips = [S.closedAt(skewed, closeAt + phoneAhead - 1, off5), S.closedAt(skewed, closeAt + phoneAhead, off5), S.closedAt(skewed, closeAt, off5), S.closedAt(seed({ bettable: false }), NOW, 0)];
  const flipFrame = S.sheetFrame({ seed: skewed, side: "YES", stakeText: "5000", viewer: viewer(facts()), nowMs: closeAt + phoneAhead, offsetMs: off5, intent: null, settled: null });
  ok("5.closed · the sheet closes at closesAt on the SERVER's clock: a phone five minutes fast does not close it early, and the frame flips to closed with \"Muda wa kuchagua umekwisha\"",
    j(flips) === j([false, true, false, true]) && off5 === -phoneAhead && flipFrame.frame === "closed" && flipFrame.closedBody === "journey.sheetClosedBody", j({ flips, off5 }));
  const est = (stake: number | null, s: Partial<SS.SheetSeed> = {}) => ({ stake, estimate: S.sheetEstimate(seed(s), "YES", stake) });
  const moved = [S.estimateMoved(est(5_000), est(5_000, { noPool: 60_000 })), S.estimateMoved(est(5_000), est(5_100)), S.estimateMoved(est(5_000), est(5_000)), S.estimateMoved(null, est(5_000)),
    S.estimateMoved(est(5_000), est(5_000, { yesPool: 0, noPool: 0 }))];
  ok("5.updated · \"Makadirio yamesasishwa\" when the pool moves under an unchanged stake — never on a keystroke, never unchanged, never on the first read, never to a state with no figure",
    j(moved) === j([true, false, false, false, false]), j(moved));
  const pages = ["/", "/markets/mkt_abc123", "/live", "/watchlist", "/wallet/deposit", "/profile/kyc", "/positions/pos_1", "/help", "/auth/login", "/markets", "/markets/mkt_abc/extra", "/live/"].map((p) => S.sheetOpensOn(p));
  const addr = [S.withBet("?cat=sport&q=mvua&page=2&from=home", bet), S.withoutBet("?cat=sport&q=mvua&page=2&from=home&bet=mkt_dodoma01.YES.5000&side=YES", true), S.withoutBet("?bet=x&side=YES", false)];
  ok("5.pages · A3 item 1: the address opens a sheet only on /, a question page, /live and /watchlist; the bet's push and its removal keep cat, q, page and from, and strip side only for a ?side= sheet",
    j(pages) === j([true, true, true, true, false, false, false, false, false, false, false, true])
      && addr[0] === "?cat=sport&q=mvua&page=2&from=home&bet=mkt_dodoma01.YES.5000" && addr[1] === "?cat=sport&q=mvua&page=2&from=home" && addr[2] === "?side=YES", j({ pages, addr }));

  /* §6 · the source */
  const strip = (t: string) => decomment(t);
  const imports = (t: string) => [...strip(t).matchAll(/^\s*import\s+(?:type\s+)?[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]).sort();
  const ALLOWED = new Set(["@/lib/markets/estimate", "./shortfall", "@/lib/failure-reasons", "./pending-bet", "./funnel-beacon", "@/components/updown/stake-math", "./sheet-state", "@/lib/action-redirect"]);
  const imp = { state: imports(impl.src.state), refusal: imports(impl.src.refusal) };
  const bareImports = [impl.src.state, impl.src.refusal].flatMap((t) => [...strip(t).matchAll(/^\s*import\s+"([^"]+)"/gm)].map((m) => m[1]));
  ok("6.imports · sheet-state imports only estimate, shortfall, failure-reasons (types), pending-bet, funnel-beacon and stake-math; sheet-refusal those, the sheet's own rules and action-redirect (A6)",
    imp.state.every((m) => ALLOWED.has(m) && m !== "./sheet-state" && m !== "@/lib/action-redirect") && imp.refusal.every((m) => ALLOWED.has(m)) && bareImports.length === 0
      && /^import type \{ FailureReason \} from "@\/lib\/failure-reasons";$/m.test(impl.src.state) && imp.refusal.includes("@/lib/action-redirect"), j(imp));
  const code = (t: string) => strip(t);
  const typed = [impl.src.state, impl.src.refusal].flatMap((t) => {
    const c = code(t);
    const bad: string[] = [];
    if (c.includes("%")) bad.push("a % sign");
    if (c.includes("×")) bad.push("a × sign");
    if (/TZS\s*[\d.,]/.test(t)) bad.push("a TZS amount");
    for (const line of c.split("\n")) {
      if (/_MS\s*=|^\s*export const (KEY_READ|PENDING|PLACING|DOUBT)/.test(line)) continue;
      for (const m of line.matchAll(/(?<![\w.])(\d[\d_]*)(?![\w.])/g)) if (Number(m[1].replace(/_/g, "")) >= 500) bad.push(`the number ${m[1]} in: ${line.trim().slice(0, 80)}`);
    }
    return bad;
  });
  ok("6.typed · no rate (no % sign), no multiple (no ×) and no shilling amount is typed in either module — a number of 500 or more stands only in a named *_MS time constant",
    typed.length === 0, j(typed));
  const clocks = [impl.src.state, impl.src.refusal].flatMap((t) => [...code(t).matchAll(/Date\.now\(|new Date\(\s*\)|performance\.now|setTimeout|setInterval|\bwindow\b|\bdocument\b|sessionStorage|localStorage/g)].map((m) => m[0]));
  ok("6.clock · neither module reads a clock (every now is the caller's), a timer, the window, the document or storage", clocks.length === 0, j(clocks));
  const srv = [impl.src.state, impl.src.refusal].filter((t) => /from\s+"@\/lib\/server|server-only|"use server"|next\//.test(code(t)));
  const wp4 = [...new Set([impl.src.state, impl.src.refusal].flatMap((t) => [...code(t).matchAll(/"((?:journey|error|common|market|dialog|rg|kycGate)\.[A-Za-z]+)"/g)].map((m) => m[1])))];
  const en = dict.en as unknown as Record<string, Record<string, unknown>>;
  const missingKeys = wp4.filter((k) => { const [ns, key] = k.split("."); return ns === "journey" ? !WP4_KEYS.has(key) && !(key in (en.journey ?? {})) : !(key in (en[ns] ?? {})); });
  ok("6.client-safe · neither module imports a server module, `server-only`, a Server Action or Next; every key either names a live dictionary entry or is one of WP4's new journey keys",
    srv.length === 0 && missingKeys.length === 0 && wp4.length >= 25, j({ srv: srv.length, missingKeys, keys: wp4.length }));
  return failed;
}

if (!PROVE_RED) {
  console.log("bet-sheet — the Vodacom plan S8 WP2 (pure)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`\nBET-SHEET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const withSS = (o: Partial<typeof SS>): Impl => ({ ...REAL, SS: { ...SS, ...o } as typeof SS });
  const withSR = (o: Partial<Impl["SR"]>): Impl => ({ ...REAL, SR: { ...REAL.SR, ...o } });
  const withSrc = (o: Partial<Sources>): Impl => ({ ...REAL, src: { ...SOURCES, ...o } });
  const settleWith = (f: (s: SS.Settled, o: SR.RefusalOutcome, c: SR.SettleContext) => SS.Settled) =>
    withSR({ settleRefusal: (o, rr, c) => f(SR.settleRefusal(o, rr, c), o, c) });
  const plants: Plant[] = [
    // §1
    { name: "the sheet's figure from a second formula (stake × the card's multiple)", expect: /^1\.deck /,
      impl: withSS({ sheetEstimate: (s, side, stake) => { const e = SS.sheetEstimate(s, side, stake); return e && stake ? { ...e, payout: Math.round(stake * 2.8) } : e; } }) },
    { name: "the low frame offering no \"bet instead\"", expect: /^1\.pick3 /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.low ? { ...f, low: { ...f.low, betInstead: null }, betInsteadQuote: null } : f; } }) },
    { name: "the chips cut at the platform's old 1,000 minimum (A24)", expect: /^1\.chips /,
      impl: withSS({ sheetChips: (b, p) => SS.sheetChips({ min: Math.max(1_000, b.min), max: b.max }, p) }) },
    { name: "the preset at the platform minimum, not the market's own", expect: /^1\.chips /,
      impl: withSS({ sheetPreset: () => PLATFORM_MIN_STAKE }) },
    { name: "an empty side read as no figure", expect: /^1\.states /,
      impl: withSS({ sheetEstimate: (s, side, stake) => { const e = SS.sheetEstimate(s, side, stake); return e && e.state === "fillsEmptySide" ? { ...e, payout: null } : e; } }) },
    { name: "the CTA enabled below the minimum", expect: /^1\.cta /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.breaks === "below" && f.cta ? { ...f, cta: { ...f.cta, enabled: true } } : f; } }) },
    { name: "a fractional stake rounded to a whole one", expect: /^1\.cta /,
      impl: withSS({ sheetFrame: (i) => SS.sheetFrame({ ...i, stakeText: i.stakeText.replace(/\.\d+$/, "") }) }) },
    { name: "the hedge read as \"this side\"", expect: /^1\.holder /,
      impl: withSS({ holderLine: (h) => (h.length ? "this" : "none") }) },
    // §2
    { name: "rows 10 and 12 swapped (A8)", expect: /^2\.matrix /,
      impl: withSR({ refusalOutcome: (a) => { const o = SR.refusalOutcome(a); return o.row === 10 ? { ...o, row: 12 } : o.row === 12 ? { ...o, row: 10 } : o; } }) },
    { name: "a cached re-read trusted: a market that says bettable answered as closed", expect: /^2\.matrix /,
      impl: settleWith((s, o) => (o.frame === "decide" && o.reread === "public" ? { ...s, view: { kind: "closed", body: "journey.sheetClosedBody" } } : s)) },
    { name: "the loss room offered from a failed read", expect: /^2\.matrix /,
      impl: withSR({ settleRefusal: (o, rr, c) => SR.settleRefusal(o, o.row === 19 && rr.state === "failed" ? { state: "read", market: { found: true, bettable: true }, viewer: { spendable: 0, heldSides: [], bonusWager: null, facts: facts({ loss: { dailyLossLimit: 10_000, lossToday: 0 } }) } } : rr, c) }) },
    { name: "a replay treated as an unknown outcome (a second ticket risked, L2)", expect: /^2\.matrix /,
      impl: withSR({ refusalOutcome: (a) => { const o = SR.refusalOutcome(a); return o.row === 24 ? SR.refusalOutcome({ kind: "rejected", error: new Error("x") }) : o; } }) },
    { name: "the skew's spent reload still reloading", expect: /^2\.matrix /,
      impl: settleWith((s) => (s.view.kind === "skew" ? { ...s, view: { kind: "skew", reload: true } } : s)) },
    { name: "the refusal read from its English sentence", expect: /^2\.prose /,
      impl: withSR({ refusalOutcome: (a) => { const v = a.kind === "resolved" ? a.value as { error?: string } : null; return v && /loss limit/i.test(v.error ?? "") ? SR.refusalOutcome({ kind: "resolved", value: { ok: false, code: "INVALID", reason: "loss_limit_daily" } }) : SR.refusalOutcome(a); } }) },
    { name: "the redirect tested after the system_error mapping (A6)", expect: /^2\.order /,
      impl: withSR({ refusalOutcome: (a) => {
        if (a.kind !== "rejected") return SR.refusalOutcome(a);
        // skew, then the catch-all — the redirect test never reached
        const skew = (a.error as { name?: string })?.name === "UnrecognizedActionError";
        return SR.refusalOutcome({ kind: "rejected", error: skew ? Object.assign(new Error("x"), { name: "UnrecognizedActionError" }) : new Error("x") });
      } }) },
    { name: "BUSY's retry with no amount in the CTA", expect: /^2\.busy-cta /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.cta?.label.key === "journey.retryCta" ? { ...f, cta: { ...f.cta, label: { key: "journey.placeCtaBare" } } } : f; } }) },
    { name: "a row removed from the matrix (wallet_missing unclassified)", expect: /^2\.census /,
      impl: withSR({ CLASSIFIED_REASONS: SR.CLASSIFIED_REASONS.filter((r) => r !== "wallet_missing") }) },
    { name: "a new refusal added to the bet path with no row", expect: /^2\.census /,
      impl: withSrc({ service: SOURCES.service.replace('if (!u) return { ok: false, error: "Account not found.", code: "NOT_FOUND" };', 'if (!u) return { ok: false, error: "Account not found.", code: "NOT_FOUND" };\n  if (u.flagged) return { ok: false, error: "New.", code: "INVALID", reason: "a_new_refusal" };') }) },
    { name: "a ternary's reason missed by the reader (A22 item 2)", expect: /^2\.census /,
      impl: withSrc({ service: SOURCES.service.replace(': opts.stake < minStake ? "stake_below_min" : "stake_above_max"', ': opts.stake < minStake ? "stake_below_min" : "stake_way_above_max"') }) },
    { name: "the census blind to the action's own refusals", expect: /^2\.census /,
      impl: withSrc({ actions: SOURCES.actions.replace("export async function buyPositionAction(", "export async function buyPositionActionRenamed(") }) },
    { name: "a reason invented for the matrix (one the registry does not have)", expect: /^2\.registry /,
      impl: withSR({ CLASSIFIED_REASONS: [...SR.CLASSIFIED_REASONS, "sheet_only_reason"] }) },
    // §3
    { name: "a pre-replay refusal that mints a new key (the intent ended in doubt)", expect: /^3\.doubt /,
      impl: settleWith((s, o, c) => (c.inDoubt && !o.inLock && s.doubt === "hold" && o.frame === "inline" ? { ...s, retry: "new", doubt: "end", marker: "dropKey" } : s)) },
    { name: "sheetBusy or failMaintenance shown in doubt", expect: /^3\.doubt /,
      impl: settleWith((s, o) => (s.view.kind === "inDoubt" && o.line ? { ...s, view: { kind: "inDoubt", extra: o.line } } : s)) },
    { name: "a derived frame replacing inDoubt (a low balance)", expect: /^3\.doubt /,
      impl: withSS({ sheetFrame: (i) => SS.sheetFrame(i.intent?.phase === "inDoubt" ? { ...i, intent: null, settled: null } : i) }) },
    { name: "an in-lock refusal left holding the doubt", expect: /^3\.doubt-ends /,
      impl: settleWith((s, o, c) => (c.inDoubt && o.inLock && o.frame !== "receipt" ? { ...s, doubt: "hold", marker: "keepKey" } : s)) },
    { name: "the key minted afresh after admission's BUSY", expect: /^3\.keys /,
      impl: withSS({ nextKey: (p, quote, mint) => (p?.phase === "retry" ? { key: (mint ?? SS.mintIntentKey)(), quote, reused: false } : SS.nextKey(p, quote, mint)) }) },
    { name: "a fresh key after an unknown outcome (in doubt)", expect: /^3\.keys /,
      impl: withSS({ nextKey: (p, quote, mint) => (p?.phase === "inDoubt" ? { key: (mint ?? SS.mintIntentKey)(), quote, reused: false } : SS.nextKey(p, quote, mint)) }) },
    { name: "an edited stake sent under the old key", expect: /^3\.frozen /,
      impl: withSS({ nextKey: (p, quote, mint) => { const k = SS.nextKey(p, quote, mint); return { ...k, quote }; } }) },
    { name: "the request carrying the expected payout too", expect: /^3\.request /,
      impl: withSS({ requestFor: (qt, k) => { const fd = SS.requestFor(qt, k); fd?.set("expectedPayout", "12360"); return fd; } }) },
    { name: "the request accepting a house key", expect: /^3\.request /,
      impl: withSS({ requestFor: (qt, k) => SS.requestFor(qt, k.startsWith("hb:") ? k.slice(3) : k) }) },
    { name: "\"Jaribu tena\" enabled while the first request is still out", expect: /^3\.watchdog /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.frame === "inDoubt" && f.cta ? { ...f, cta: { ...f.cta, enabled: true } } : f; } }) },
    { name: "the settle window counted from the send", expect: /^3\.settle /,
      impl: withSS({ afterKeyRead: (it, kp, at) => SS.afterKeyRead(it.settledAt === null ? { ...it, settledAt: it.sentAt ?? 0 } : it, kp, at) }) },
    { name: "DOUBT_SETTLE_MS below the pinned ceiling (30 s)", expect: /^3\.ceiling /,
      impl: withSS({ DOUBT_SETTLE_MS: 30_000 } as Partial<typeof SS>) },
    { name: "a keyed reopen that trusts another bet's key", expect: /^3\.marker /,
      impl: withSS({ markerKeyFor: (raw) => { try { const k = (JSON.parse(raw ?? "") as { k?: string }).k; return SS.isIntentKey(k) ? k : null; } catch { return null; } } }) },
    // §4
    { name: "the session limit shown as a block instead of the inline line", expect: /^4\.blocks /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.lines[0]?.key === "journey.sheetSessionLimit" ? { ...f, frame: "blocked", block: SS.blockFor("account_blocked") } : f; } }) },
    { name: "the loss room drawn below the minimum", expect: /^4\.blocks /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.block?.reason === "loss_limit" ? { ...f, frame: "lossRoom", block: null, lossRoom: { headroom: 200 } } : f; } }) },
    { name: "the open's read writing nothing for a session past its limit (A4)", expect: /^4\.open-read /,
      impl: withSS({ openReadRecord: (p, o, b) => (p.kind === "blocked" && p.reason === "session_limit" ? null : SS.openReadRecord(p, o, b)) }) },
    { name: "a write on a read without open=1", expect: /^4\.open-read /,
      impl: withSS({ openReadRecord: (p, _o, b) => SS.openReadRecord(p, true, b) }) },
    { name: "a row written for a break (the bet path writes none)", expect: /^4\.open-read /,
      impl: withSS({ openReadRecord: (p, o, b) => (o && p.kind === "blocked" && p.reason === "cooling_off" ? { action: "bet.account_blocked", payload: { at: "sheet" } } : SS.openReadRecord(p, o, b)) }) },
    { name: "loading drawn as unavailable (A9)", expect: /^4\.balance /,
      impl: withSS({ sheetFrame: (i) => SS.sheetFrame(i.viewer.state === "loading" ? { ...i, viewer: { state: "failed" } } : i) }) },
    { name: "the balance computed by the sheet (cash only, the bonus left out)", expect: /^4\.balance /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); const w = i.viewer.state === "read" ? i.viewer.viewer.facts?.wallet : null; return f.balance.kind === "known" && w?.balance != null ? { ...f, balance: { kind: "known", spendable: w.balance } } : f; } }) },
    { name: "leftAfter dropped from the deposit option", expect: /^4\.low /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.low?.deposit ? { ...f, low: { ...f.low, deposit: { ...f.low.deposit, leftAfter: f.low.deposit.amount } } } : f; } }) },
    { name: "the zero balance at the 500 preset not below the deposit minimum", expect: /^4\.low /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.low?.deposit ? { ...f, low: { ...f.low, deposit: { ...f.low.deposit, belowDepositMin: false } } } : f; } }) },
    { name: "the age read on the phone's clock, not the server's", expect: /^4\.pending /,
      impl: withSS({ sheetFrame: (i) => SS.sheetFrame({ ...i, offsetMs: 0 }) }) },
    { name: "\"bet instead\" offered beside a fresh pending deposit", expect: /^4\.pending /,
      impl: withSS({ sheetFrame: (i) => { const f = SS.sheetFrame(i); return f.pending && i.viewer.state === "read" ? { ...f, pending: { ...f.pending, betInstead: { kind: "betInstead", stake: 2_000 } } } : f; } }) },
    { name: "leftAfter computed without the stake (spendable + D)", expect: /^4\.leftAfter /,
      impl: { ...REAL, plan: (i) => { const p = SF.shortfallPlan(i); return p.kind === "short" ? { ...p, options: p.options.map((o) => (o.kind === "deposit" ? { ...o, leftAfter: p.spendable + o.amount } : o)) } : p; } } },
    // §5
    { name: "the closed flip on the phone's clock", expect: /^5\.closed /,
      impl: withSS({ closedAt: (s, now) => SS.closedAt(s, now, 0) }) },
    { name: "\"Makadirio yamesasishwa\" on a keystroke", expect: /^5\.updated /,
      impl: withSS({ estimateMoved: (p, nx) => !!p && !!p.estimate && !!nx.estimate && (p.estimate.payout !== nx.estimate.payout) }) },
    { name: "`bet=` on /wallet/deposit opens a sheet (A3)", expect: /^5\.pages /,
      impl: withSS({ sheetOpensOn: (p) => SS.sheetOpensOn(p) || p.startsWith("/wallet") }) },
    { name: "the bet's removal dropping the home's page and filter", expect: /^5\.pages /,
      impl: withSS({ withoutBet: (s, d) => { const r = SS.withoutBet(s, d); return r.replace(/&?page=\d+/, ""); } }) },
    // §6
    { name: "a server import in sheet-state", expect: /^6\.imports /,
      impl: withSrc({ state: SOURCES.state.replace('import { funnelBetFields } from "./funnel-beacon";', 'import { funnelBetFields } from "./funnel-beacon";\nimport { db } from "@/lib/server/store";') }) },
    { name: "a rate typed into a module", expect: /^6\.typed /,
      impl: withSrc({ refusal: SOURCES.refusal + '\nexport const FEE_LINE = "13%";\n' }) },
    { name: "a shilling amount typed into a module", expect: /^6\.typed /,
      impl: withSrc({ state: SOURCES.state + "\nexport const DEFAULT_STAKE = 1_000;\n" }) },
    { name: "the module reading its own clock", expect: /^6\.clock /,
      impl: withSrc({ state: SOURCES.state + "\nexport const nowish = () => Date.now();\n" }) },
    { name: "a key named that neither the dictionary nor WP4 has", expect: /^6\.client-safe /,
      impl: withSrc({ refusal: SOURCES.refusal + '\nexport const STRAY = { key: "journey.sheetNoSuchKey" };\n' }) },
  ];
  let caught = 0, failN = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) failN++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = run(REAL, quiet);
  ok("the REAL modules pass every check", clean.length === 0, clean.join(" | "));
  for (const p of plants) {
    const failures = run(p.impl, quiet);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  // Every check must have at least one plant that it catches.
  const labels: string[] = [];
  run(REAL, (l) => { const m = /^\s+PASS (\S+)/.exec(l); if (m) labels.push(m[1]); });
  const planted = new Set(plants.map((p) => p.expect.source.replace(/^\^/, "").replace(/\\\./g, ".").replace(/ $/, "")));
  const orphans = labels.filter((l) => !planted.has(l));
  ok(`every one of the ${labels.length} checks has a plant`, orphans.length === 0, orphans.join(", "));
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${failN === 0 ? "" : ` · ${failN} FAILED`}\n`);
  process.exitCode = failN === 0 ? 0 : 1;
}
