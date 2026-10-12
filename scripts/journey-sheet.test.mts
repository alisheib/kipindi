/**
 * test:journey-sheet — `GET /api/markets/[id]/sheet` (the Vodacom plan S3, §3.1).
 *
 *   npm run test:journey-sheet     (in predeploy)
 *   npm run red:journey-sheet      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 * On the in-memory store it drives `lib/server/journey-sheet.ts` (the reads the route serves):
 *   1. THE PUBLIC HALF — a LIVE market's pools, its FROZEN rates (not the live config), {pct} 13, the stake bounds the
 *      bet path enforces, when betting closes (selection, not resolution), the server clock, and the card figure per
 *      side (Dodoma: ≈2.8× / ≈1.4×).
 *   2. NOT A SHEET — a missing market, a malformed id, an Up & Down round, a RESOLVED and a DRAFT market are null (404);
 *      a LIVE market whose selection has closed is a sheet that is not bettable, with no figure.
 *   3. THE VIEWER'S HALF — spendable = balance + bonus, the sides they hold OPEN (a cashed-out side is not held), the
 *      bonus line (the market page's B2: the other side held and an active grant with wagering left — S8-PLAN Open
 *      point 21, which retired S3's `bonusWarning`); an unread wallet is null spendable, never zero.
 * And it reads the route as text — the contract a cache and an attacker meet:
 *   4. GET only; force-dynamic on the nodejs runtime; rate-limited per IP on `sheet.ip` (a real rule); the public half
 *      `s-maxage` ≤ 5; the viewer's half `private, no-store` and 401 without a session; 404 and 503 are `no-store`.
 *   5. THE CARD'S FIGURES (the Vodacom plan S7, S7-PLAN WP3 step 5) — `cardFigures`, the one source a journey card and
 *      this public half share: it gives exactly the sheet's bettable, rates and figures; on the markets only a card meets,
 *      an Up & Down round has no figure and a RESOLVED or DRAFT market takes no bet (`bettableAt`'s LIVE test); and, read
 *      as text, `sheetPublic` takes all three from one `cardFigures` call after the stake bounds' await, as before the
 *      extraction, and computes none of them itself. Since S8 WP3 the assembly is `sheetPublicFrom`: it makes the ONE
 *      cardFigures call, and `sheetPublic` hands it the row only after the stake bounds' await.
 * And the Vodacom plan S8 WP3 (S8-PLAN WP3 Gates, A2, A4, A11):
 *   6. THE VIEWER'S FACTS — each equal to the gate it mirrors, on the memory store: a lockout (`isLockedOut`), a session
 *      over its limit (`checkSessionTimeLimit`'s verdict, read with NO play-clock write), a held wallet, a loss limit with
 *      losses (`getRgSettings` + `getLimitUsage`, and `checkLossLimit` at the headroom and one over), the newest
 *      PROCESSING deposit (never a newer confirmed or failed one, a withdrawal, or another player's), a deposit limit
 *      and the windows counting PROCESSING, an unaccepted declaration, a rail paused (`getKillSwitches`); a failed read
 *      is null facts, never zeros. And the OPEN read (A4): past the session limit it runs the gate and writes exactly one
 *      `rg.session_limit.enforced` row (`at: "sheet"`); a blocked account writes `bet.account_blocked`; a loss limit
 *      below the minimum writes `bet.loss_limit_blocked` at the minimum; within the limit, or without `open`, nothing.
 *   7. THE SEED — `sheetPublic` unchanged by the extraction (equal to the pre-extraction assembly, rebuilt here from the
 *      same primitives), and `sheetSeedFor` equal to it less `estimates`, versioned; null where the public half is null.
 *   8. THE ROUTE AND THE KEY — the public half names no viewer (its keys are exactly the public fields, and the session
 *      is read only for `?me=1`); `open`, `side`, `key` and the play clock reach the read only as the plan says; and
 *      `keyPosition` answers the viewer's own key only — never another player's, never a house bot's, and a key that is
 *      not a UUID is never looked up.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: no file is written (the store is in memory).
 */
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import * as SHEET from "../src/lib/server/journey-sheet.ts";
import { getMarket, isSelectionClosed, stakeBoundsForMarket } from "../src/lib/server/market-service.ts";
import { cardEstimate, pickEstimateRates } from "../src/lib/markets/estimate.ts";
import { cardClosesAtMs } from "../src/lib/markets/card-close-label.ts";
import { loserSharePct } from "../src/lib/payout.ts";
import { checkLossLimit, checkSessionTimeLimit, getLimitUsage, getRgSettings, isLockedOut } from "../src/lib/server/responsible-gambling.ts";
import { SOF_ROLLING_30D_TZS, SOF_SINGLE_TXN_TZS } from "../src/lib/server/wallet-service.ts";
import { isPaymentPaused, setKillSwitch } from "../src/lib/server/payment-ops.ts";
import { MOBILE_MONEY_METHODS } from "../src/lib/payment-providers.ts";
import { lossHeadroomFor, shortfallPlan } from "../src/lib/journey/shortfall.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROUTE = readFileSync(join(ROOT, "src/app/api/markets/[id]/sheet/route.ts"), "utf8").replace(/\r\n/g, "\n");
const PROVE_RED = process.argv.includes("--prove-red");

const LF = String.fromCharCode(10);
/** `src/lib/server/journey-sheet.ts` as text, CRLF read as LF: §5 reads `sheetPublic`'s body. */
const SHEET_SRC = readFileSync(join(ROOT, "src/lib/server/journey-sheet.ts"), "utf8").split(String.fromCharCode(13) + LF).join(LF);

type Impl = {
  pub: typeof SHEET.sheetPublic; forUser: typeof SHEET.sheetForUser; route: string; rules: Record<string, unknown>;
  /** §5: the card's figures, and the module's text. */
  figures: typeof SHEET.cardFigures; sheetSrc: string;
  /** §6–§7 (S8 WP3): the viewer's facts, the memory twin of the pending-deposit read, and the card's seed. */
  facts: typeof SHEET.viewerFacts; pending: (userId: string) => Promise<{ amount: number; txnId: string; createdAt: string } | null>;
  seed: typeof SHEET.sheetSeedFor;
};
const REAL: Impl = {
  pub: SHEET.sheetPublic, forUser: SHEET.sheetForUser, route: ROUTE, rules: RATE_RULES, figures: SHEET.cardFigures, sheetSrc: SHEET_SRC,
  facts: SHEET.viewerFacts, pending: async (u) => db.txn.newestProcessingDeposit(u), seed: SHEET.sheetSeedFor,
};

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const iso = (t: number) => new Date(t).toISOString();
const SNAP = snapshotFromConfig({ ...DEFAULT_GLOBAL_CONFIG, feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 });

async function market(id: string, o: { status?: string; productLine?: string; selectionClosedAt?: number | null } = {}) {
  await marketStore.set({
    id, titleEn: "Will Dodoma see rain on Saturday?", titleSw: "Je, Dodoma itanyesha Jumamosi?", titleZh: null, category: "weather",
    sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if TMA records rain at Dodoma on Saturday.",
    resolutionCriterionSw: null, resolutionCriterionZh: null, shortTitleEn: null, shortTitleSw: null, shortTitleZh: null, competition: null,
    status: o.status ?? "LIVE", yesPool: 24_825, noPool: 50_462, predictorCount: 12, feeSnapshot: SNAP, resolvedOutcome: null,
    productLine: o.productLine ?? "MARKET", proposedBy: "usr_author",
    resolutionAt: iso(NOW + 48 * HOUR), selectionClosedAt: o.selectionClosedAt === null ? null : iso(o.selectionClosedAt ?? NOW + 24 * HOUR),
    createdAt: iso(NOW - HOUR), updatedAt: iso(NOW - HOUR),
  } as never);
}
async function player(id: string, balance: number, bonus: number) {
  const now = iso(NOW);
  await db.user.create({
    id, phoneE164: `+2557111${id.slice(-5).padStart(5, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Sheet Player", dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
    acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, bonusBalance: bonus, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
}
async function position(id: string, userId: string, marketId: string, side: "YES" | "NO", status: string, o: { key?: string; houseBotId?: string } = {}) {
  await positionStore.set({
    id, userId, marketId, side, stake: 2_000, potentialPayout: 5_000, status, finalPayout: null, placedAt: iso(NOW - HOUR), settledAt: null,
    idempotencyKey: o.key ?? null, houseBotId: o.houseBotId ?? null,
  } as never);
}
async function grant(userId: string, required: number, wagered: number) {
  const now = iso(NOW);
  await db.bonusGrant.create({
    id: `bg_${userId}`, userId, walletId: `wal_${userId}`, amountTzs: 500, remainingTzs: 500, wagerMultiplier: 10, wagerRequiredTzs: required,
    wageredTzs: wagered, source: "ADMIN", sourceRef: null, status: "ACTIVE", expiresAt: null, fulfilledAt: null, note: null, createdAt: now, updatedAt: now,
  } as never);
}
/** The settings row with every limit off; `patch` sets what a case needs. */
async function rgRow(userId: string, patch: Record<string, unknown>) {
  await db.responsible.upsert({
    userId, dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null,
    sessionTimeLimitMin: null, realityCheckIntervalMin: 30, selfExclusionUntil: null, coolingOffUntil: null,
    selfExclusionStartedAt: null, coolingOffStartedAt: null, pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
    pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null, pendingMonthlyIncreaseTo: null,
    pendingMonthlyIncreaseEffectiveAt: null, pendingLossLimitTo: null, pendingLossLimitEffectiveAt: null,
    pendingSessionLimitTo: null, pendingSessionLimitEffectiveAt: null, playStartedAt: null, playLastSeenAt: null, ...patch,
  } as never);
}
let txSeq = 0;
async function txn(userId: string, type: string, status: string, amount: number, agoMs: number) {
  const at = iso(Date.now() - agoMs);
  await db.txn.create({
    id: `txn_sheet_${String(++txSeq).padStart(5, "0")}`, walletId: `wal_${userId}`, userId, type, status, amount, fee: 0, taxWithheld: 0,
    balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: null, positionId: null,
    amlReason: null, createdAt: at, updatedAt: at, completedAt: null,
  } as never);
  return { id: `txn_sheet_${String(txSeq).padStart(5, "0")}`, at };
}
/** The audit rows `action` wrote for `userId`, after the queue drains. */
async function rows(action: string, userId: string) {
  await sleep(30);
  await auditFlush();
  return getAuditPage({ limit: 5_000 }).filter((e) => e.action === action && e.actorId === userId);
}
/** The play clock on the settings row: what `checkSessionTimeLimit` writes and a read must not. */
async function clock(userId: string) {
  const r = await db.responsible.get(userId);
  return JSON.stringify({ s: r?.playStartedAt ?? null, l: r?.playLastSeenAt ?? null });
}
const KEY_MINE = "6f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a00";
const KEY_THEIRS = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
const KEY_HOUSE = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

async function fixtures() {
  await market("mkt_sheet0live");
  await market("mkt_sheet0closed", { selectionClosedAt: NOW - HOUR });
  await market("mkt_sheet0updown", { productLine: "UPDOWN" });
  await market("mkt_sheet0resolved", { status: "RESOLVED" });
  await market("mkt_sheet0draft", { status: "DRAFT" });
  await market("mkt_sheet0legacy", { selectionClosedAt: null });
  await player("usr_sheet_1", 3_000, 500);
  await position("pos_sheet_1", "usr_sheet_1", "mkt_sheet0live", "YES", "OPEN");
  await position("pos_sheet_2", "usr_sheet_1", "mkt_sheet0live", "NO", "CASHED_OUT");
  await position("pos_sheet_3", "usr_sheet_1", "mkt_sheet0closed", "NO", "OPEN");
  await grant("usr_sheet_1", 5_000, 1_000);
  // §8 · the key's positions: the viewer's own, another player's, a house bot's on the viewer's account, and a row whose
  // key is not a UUID (it must never be looked up).
  await player("usr_sheet_2", 1_000, 0);
  await position("pos_sheet_k1", "usr_sheet_1", "mkt_sheet0live", "YES", "OPEN", { key: KEY_MINE });
  await position("pos_sheet_k2", "usr_sheet_2", "mkt_sheet0live", "YES", "OPEN", { key: KEY_THEIRS });
  await position("pos_sheet_k3", "usr_sheet_1", "mkt_sheet0live", "NO", "CASHED_OUT", { key: KEY_HOUSE, houseBotId: "hb_sheet" });
  await position("pos_sheet_k4", "usr_sheet_1", "mkt_sheet0live", "YES", "CASHED_OUT", { key: "not-a-uuid" });
}

/** The public half as it was assembled before S8 WP3's extraction — the same primitives, in the same order. */
async function preExtraction(marketId: string, nowMs: number) {
  if (!/^mkt_[A-Za-z0-9]{1,64}$/.test(marketId)) return null;
  const m = await getMarket(marketId);
  if (!m || m.productLine === "UPDOWN" || m.status !== "LIVE") return null;
  const bounds = await stakeBoundsForMarket(m);
  const { bettable, rates, estimates } = SHEET.cardFigures(m, nowMs);
  const closes = cardClosesAtMs(m);
  return {
    id: m.id, bettable, yesPool: m.yesPool, noPool: m.noPool, rates, feePct: rates ? loserSharePct(rates) : null,
    min: bounds.min, max: bounds.max, closesAt: closes === null ? null : new Date(closes).toISOString(), serverNow: nowMs, estimates,
  };
}

async function run(impl: Impl, log: (l: string) => void, tag = "real"): Promise<string[]> {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const j = (v: unknown) => JSON.stringify(v);

  /* 1 · the public half */
  const p = await impl.pub("mkt_sheet0live", NOW);
  ok("1.public · a LIVE market: bettable, its pools, its FROZEN rates, {pct} 13, when betting closes (the selection), the server clock",
    !!p && p.bettable && p.yesPool === 24_825 && p.noPool === 50_462 && j(p.rates) === j(pickEstimateRates(SNAP)) && p.feePct === 13
      && p.closesAt === iso(NOW + 24 * HOUR) && p.serverNow === NOW, j(p));
  ok("1.figures · the card figure per side is the engine's: Dodoma ≈2.8× / ≈1.4×",
    p?.estimates.YES?.multText === "2.8" && p?.estimates.NO?.multText === "1.4", j(p?.estimates));
  ok("1.bounds · the stake bounds are the bet path's (the platform's default window — 500 – 1,000,000 since 2026-10-12, read from the config)",
    p?.min === DEFAULT_GLOBAL_CONFIG.minStake && p?.max === DEFAULT_GLOBAL_CONFIG.maxStake, j({ min: p?.min, max: p?.max }));
  const legacy = await impl.pub("mkt_sheet0legacy", NOW);
  ok("1.legacy · no selection close: betting closes at resolution", legacy?.closesAt === iso(NOW + 48 * HOUR), j(legacy?.closesAt));

  /* 2 · not a sheet */
  const nulls = await Promise.all(["mkt_sheet0updown", "mkt_sheet0resolved", "mkt_sheet0draft", "mkt_nothere", "not an id", "mkt_a/../b"].map((id) => impl.pub(id, NOW)));
  ok("2.not-a-sheet · an Up & Down round, a RESOLVED market, a DRAFT market, a missing one and a malformed id are all null (404)", nulls.every((n) => n === null), j(nulls.map((n) => n?.id ?? null)));
  const closed = await impl.pub("mkt_sheet0closed", NOW);
  ok("2.closed · a LIVE market whose selection has closed is a sheet that is NOT bettable, with no figure",
    !!closed && closed.bettable === false && closed.estimates.YES?.state === "closed" && closed.estimates.YES?.multText === null, j(closed));

  /* 3 · the viewer's half */
  const me = await impl.forUser("mkt_sheet0live", "usr_sheet_1");
  ok("3.me · spendable = 3,000 + 500 bonus; held = YES only (the cashed-out NO is not held; another market's NO is not this one's)",
    me.spendable === 3_500 && me.balance === 3_000 && me.bonusBalance === 500 && j(me.heldSides) === j(["YES"]), j(me));
  const onNo = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { side: "NO" });
  const onYes = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { side: "YES" });
  ok("3.bonus · the market page's B2: a sheet on NO, with YES held and an active grant 4,000 short of its wagering, says { remaining: 4,000 }; on the side already held, or with no side, it says nothing; S3's bonusWarning boolean is gone",
    j(onNo.bonusWager) === j({ remaining: 4_000 }) && onYes.bonusWager === null && me.bonusWager === null && !("bonusWarning" in me),
    j({ onNo: onNo.bonusWager, onYes: onYes.bonusWager, none: me.bonusWager }));
  const nobody = await impl.forUser("mkt_sheet0live", "usr_sheet_nobody");
  ok("3.unread · no wallet: spendable is null (\"Salio lako —\"), never zero; nothing held", nobody.spendable === null && nobody.heldSides.length === 0, j(nobody));

  /* 4 · the route's contract */
  const r = impl.route;
  const code = r.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const sMax = /"Cache-Control": "public, s-maxage=(\d+)/.exec(code);
  ok("4.verbs · GET only — no POST, PUT, PATCH or DELETE handler", /export async function GET\(/.test(code) && !/export (?:async )?function (?:POST|PUT|PATCH|DELETE)\b/.test(code));
  ok("4.runtime · force-dynamic on the nodejs runtime", /export const dynamic = "force-dynamic";/.test(code) && /export const runtime = "nodejs";/.test(code));
  ok("4.rate · rate-limited per IP on `sheet.ip`, a rule that exists", /rateCheckAsync\(ip, "sheet\.ip"\)/.test(code) && Object.prototype.hasOwnProperty.call(impl.rules, "sheet.ip"));
  ok("4.cache · the public half is shared-cacheable for at most 5 seconds; the viewer's half is private, no-store",
    !!sMax && Number(sMax[1]) <= 5 && /const PRIVATE = \{ "Cache-Control": "private, no-store" \};/.test(code)
      && /const mine = await sheetForUser\(pub\.id, session\.userId, \{/.test(code) && /\{ \.\.\.pub, me: mine \}, \{ headers: PRIVATE \}/.test(code)
      && /NextResponse\.json\(pub, \{ headers: PUBLIC \}\)/.test(code), sMax?.[0] ?? "no public cache header");
  ok("4.errors · ?me=1 without a session is 401; a non-sheet is 404; a store failure is 503 — each no-store",
    /status: 401, headers: NO_STORE/.test(code) && /status: 404, headers: NO_STORE/.test(code) && /status: 503, headers: NO_STORE/.test(code)
      && /const NO_STORE = \{ "Cache-Control": "no-store" \};/.test(code));

  /* 5 · the card's figures (S7 WP3 step 5): the one source a journey card and the public half share */
  const figuresOf = async (id: string) => { const m = await marketStore.get(id); return m ? impl.figures(m, NOW) : null; };
  const differ: string[] = [];
  for (const id of ["mkt_sheet0live", "mkt_sheet0closed", "mkt_sheet0legacy"]) {
    const f = await figuresOf(id), s = await impl.pub(id, NOW);
    const same = !!f && !!s && j({ bettable: f.bettable, rates: f.rates, estimates: f.estimates }) === j({ bettable: s.bettable, rates: s.rates, estimates: s.estimates });
    if (!same) differ.push(id);
  }
  ok("5.figures · the card's figures are the sheet's: for a LIVE market, one whose selection has closed and one with no selection close, cardFigures gives exactly sheetPublic's bettable, rates and estimates",
    differ.length === 0, j({ differ }));
  const ud = await figuresOf("mkt_sheet0updown"), rs = await figuresOf("mkt_sheet0resolved"), dr = await figuresOf("mkt_sheet0draft");
  const closedBoth = (f: Awaited<ReturnType<typeof figuresOf>>) => !!f && f.bettable === false && f.estimates.YES?.state === "closed" && f.estimates.NO?.state === "closed";
  ok("5.card-only · the markets only a card meets: an Up & Down round has no figure on either side; a RESOLVED and a DRAFT market take no bet (the LIVE test) and their figures are the closed state",
    !!ud && ud.estimates.YES === null && ud.estimates.NO === null && closedBoth(rs) && closedBoth(dr),
    j({ updown: ud?.estimates ?? null, resolved: rs && [rs.bettable, rs.estimates.YES?.state], draft: dr && [dr.bettable, dr.estimates.YES?.state] }));
  const src = decomment(impl.sheetSrc);
  const fnBody = (head: string) => { const at = src.indexOf(head); return at < 0 ? "" : src.slice(at, src.indexOf(LF + "}" + LF, at) + 2); };
  const body = fnBody("export async function sheetPublic(");
  const from = fnBody("export function sheetPublicFrom(");
  const awaitAt = body.indexOf("await stakeBoundsForMarket(m)"), assembleAt = body.indexOf("sheetPublicFrom(");
  const ownCopy = ["isSelectionClosed(", "pickEstimateRates(", "cardEstimate(", "bettableAt("].filter((name) => body.includes(name) || from.includes(name));
  ok("5.one-source · the public half takes its bettable, rates and figures from ONE cardFigures call (in sheetPublicFrom, its pure assembly since S8 WP3), which sheetPublic reaches only after the stake bounds' await (the pools it returns and the figures priced from them come from one moment), and neither computes any of them itself",
    body.length > 0 && from.length > 0 && from.split("cardFigures(").length - 1 === 1 && body.split("cardFigures(").length - 1 === 0
      && body.split("sheetPublicFrom(").length - 1 === 1 && awaitAt >= 0 && assembleAt > awaitAt && ownCopy.length === 0,
    j({ calls: from.split("cardFigures(").length - 1, inPublic: body.split("cardFigures(").length - 1, awaitAt, assembleAt, ownCopy }));

  await facts(impl, ok, tag);
  await seedAndRoute(impl, ok);
  return failed;
}

type Ok = (label: string, cond: boolean, extra?: string) => void;
const MIN = DEFAULT_GLOBAL_CONFIG.minStake;

/** §6 · the viewer's facts, each equal to its gate; the OPEN read's records (S8-PLAN A4). Fresh players per run. */
async function facts(impl: Impl, ok: Ok, tag: string) {
  const j = (v: unknown) => JSON.stringify(v);
  const u = (n: string) => `usr_f${tag}_${n}`;
  const PLAY = Date.now() - 45 * 60_000;

  // a lockout — cooling-off, and self-exclusion asked first
  await player(u("cool"), 5_000, 0);
  await rgRow(u("cool"), { coolingOffUntil: iso(Date.now() + 6 * HOUR) });
  await player(u("selfex"), 5_000, 0);
  await rgRow(u("selfex"), { selfExclusionUntil: iso(Date.now() + 30 * 24 * HOUR), coolingOffUntil: iso(Date.now() + HOUR) });
  const fc = await impl.facts(u("cool"), null), fs = await impl.facts(u("selfex"), null);
  const lc = await isLockedOut(u("cool")), ls = await isLockedOut(u("selfex"));
  ok("6.lockout · a break is isLockedOut's own answer: cooling-off with its end; self-exclusion first when both run, with its end; the account carries the cooling-off end the bet path's account test reads",
    j(fc?.lockout) === j({ kind: "cooling_off", until: lc.until }) && j(fs?.lockout) === j({ kind: "self_exclusion", until: ls.until })
      && fc?.account.coolingOffUntil === lc.coolingUntil && fc?.account.status === "ACTIVE",
    j({ cool: fc?.lockout, selfex: fs?.lockout, gate: [lc.until, ls.until] }));

  // the session limit — past it, read with no play-clock write; the gate's own verdict afterwards
  await player(u("over"), 5_000, 0);
  await rgRow(u("over"), { sessionTimeLimitMin: 30, playStartedAt: iso(Date.now() - 50 * 60_000), playLastSeenAt: iso(Date.now() - 5 * 60_000) });
  const before = await clock(u("over"));
  const fo = await impl.facts(u("over"), PLAY);
  const afterRead = await clock(u("over"));
  const gate = await checkSessionTimeLimit(u("over"), PLAY);
  const afterGate = await clock(u("over"));
  ok("6.session · past a 30-minute limit, the fact is checkSessionTimeLimit's own verdict (the sitting held per player: the earlier start counts)",
    !!fo?.session && j(fo.session) === j(gate) && fo.session.exceeded === true && fo.session.playedMin === 50, j({ fact: fo?.session, gate }));
  ok("6.session.nowrite · reading the facts writes neither playStartedAt nor playLastSeenAt — and the gate, run after, does (the control: the write is visible to this check)",
    before === afterRead && afterGate !== afterRead, j({ before, afterRead, afterGate }));
  await player(u("noclock"), 5_000, 0);
  await rgRow(u("noclock"), { sessionTimeLimitMin: 30 });
  ok("6.session.null · no play clock is no opinion (null), as the gate says", (await impl.facts(u("noclock"), null))?.session === null);

  // a held wallet
  await player(u("held"), 7_000, 250);
  await db.wallet.update(`wal_${u("held")}`, { status: "FROZEN" } as never);
  const fh = await impl.facts(u("held"), null);
  const planH = fh && shortfallPlan({ ...fh, stake: MIN, market: { live: true, selectionClosed: false }, bounds: { min: MIN, max: 1_000_000 }, nowMs: Date.now() });
  ok("6.wallet · the wallet row is the viewer's own, as the bet path reads it: FROZEN, 7,000 and 250 bonus — and the plan blocks it (wallet_held)",
    j(fh?.wallet) === j({ status: "FROZEN", balance: 7_000, bonusBalance: 250 }) && planH?.kind === "blocked" && planH.reason === "wallet_held", j({ wallet: fh?.wallet, plan: planH }));

  // a loss limit with losses
  await player(u("loss"), 5_000, 0);
  await rgRow(u("loss"), { dailyLossLimit: 20_000 });
  await txn(u("loss"), "BET_PLACED", "CONFIRMED", -15_000, 2 * HOUR);
  await txn(u("loss"), "BET_PAYOUT", "CONFIRMED", 4_000, HOUR);
  await txn(u("loss"), "BET_PLACED", "CONFIRMED", -3_000, 25 * HOUR);
  const fl = await impl.facts(u("loss"), null);
  const usageL = await getLimitUsage(u("loss"));
  const h = fl ? lossHeadroomFor(fl.loss) : null;
  const atH = h === null ? null : await checkLossLimit(u("loss"), h), overH = h === null ? null : await checkLossLimit(u("loss"), h + 1);
  ok("6.loss · the loss fact is getRgSettings' limit and getLimitUsage's lossToday (11,000 over the rolling 24 hours), and the real checkLossLimit allows the headroom it gives and refuses one shilling more",
    j(fl?.loss) === j({ dailyLossLimit: 20_000, lossToday: usageL.lossToday }) && usageL.lossToday === 11_000 && h === 9_000 && atH?.allowed === true && overH?.allowed === false,
    j({ fact: fl?.loss, h, atH, overH }));

  // the pending deposit: the newest PROCESSING deposit of this player only
  await player(u("pend"), 1_000, 0);
  await player(u("pendx"), 1_000, 0);
  await txn(u("pend"), "DEPOSIT", "PROCESSING", 3_000, 2 * HOUR);
  const want = await txn(u("pend"), "DEPOSIT", "PROCESSING", 5_000, HOUR);
  await txn(u("pend"), "DEPOSIT", "CONFIRMED", 9_000, 10 * 60_000);
  await txn(u("pend"), "DEPOSIT", "FAILED", 8_000, 5 * 60_000);
  await txn(u("pend"), "WITHDRAWAL", "PROCESSING", -2_000, 60_000);
  await txn(u("pendx"), "DEPOSIT", "PROCESSING", 7_000, 30_000);
  const fp = await impl.facts(u("pend"), null);
  const twin = await impl.pending(u("pend"));
  const none = await impl.pending(u("loss"));
  ok("6.pending · the pending deposit is the player's newest DEPOSIT in PROCESSING with its age (5,000, an hour old) — never a newer confirmed or failed deposit, a withdrawal in flight, or another player's; a player with none reads null",
    j(fp?.pendingDeposit) === j({ amount: 5_000, txnId: want.id, createdAt: want.at }) && j(twin) === j(fp?.pendingDeposit) && none === null,
    j({ fact: fp?.pendingDeposit, twin, none }));

  // the deposit side: a deposit limit, the windows counting PROCESSING, the declaration, the thresholds
  await rgRow(u("pend"), { dailyDepositLimit: 50_000, weeklyDepositLimit: 80_000 });
  const fd = await impl.facts(u("pend"), null);
  const usageD = await getLimitUsage(u("pend"));
  const rgD = await getRgSettings(u("pend"));
  ok("6.deposit · the deposit limits are the settings row's and the windows getLimitUsage's (17,000 today: the two PROCESSING and the CONFIRMED, never the FAILED); with no declaration the source-of-funds standing is not accepted, at wallet-service's own thresholds",
    j(fd?.deposit.limits) === j({ daily: rgD.dailyDepositLimit, weekly: rgD.weeklyDepositLimit, monthly: rgD.monthlyDepositLimit }) && fd?.deposit.limits.daily === 50_000
      && j(fd?.deposit.usage) === j({ day: usageD.depositDay, week: usageD.depositWeek, month: usageD.depositMonth }) && usageD.depositDay === 17_000
      && j(fd?.deposit.sof) === j({ accepted: false, singleTxn: SOF_SINGLE_TXN_TZS, rolling30d: SOF_ROLLING_30D_TZS }),
    j(fd?.deposit));
  const sofRow = (status: string) => db.sourceOfFunds.upsert({
    userId: u("pend"), declaredSource: "salary", declaredOccupation: "Engineer", declaredEmployer: null, declaredAnnualIncomeBand: "50m-200m",
    declaredOther: null, reviewStatus: status, reviewerId: status === "PENDING" ? null : "usr_officer", reviewedAt: status === "PENDING" ? null : iso(NOW), submittedAt: iso(NOW),
  } as never);
  await sofRow("PENDING");
  const fPend = await impl.facts(u("pend"), null);
  await sofRow("ACCEPTED");
  const fAcc = await impl.facts(u("pend"), null);
  ok("6.sof · a declaration under review is not accepted; an ACCEPTED one is — the gate's own test (reviewStatus === \"ACCEPTED\")",
    fPend?.deposit.sof.accepted === false && fAcc?.deposit.sof.accepted === true, j({ pending: fPend?.deposit.sof, accepted: fAcc?.deposit.sof }));

  // the rails: every mobile-money rail open, one paused, all paused
  const names = MOBILE_MONEY_METHODS.map((m) => m.name);
  const open0 = await impl.facts(u("pend"), null);
  await setKillSwitch("MPESA", "deposits", true, "usr_officer");
  const one = await impl.facts(u("pend"), null);
  const mpesaPaused = await isPaymentPaused("MPESA", "deposits");
  for (const m of MOBILE_MONEY_METHODS) await setKillSwitch(m.id as never, "deposits", true, "usr_officer");
  const all = await impl.facts(u("pend"), null);
  for (const m of MOBILE_MONEY_METHODS) await setKillSwitch(m.id as never, "deposits", false, "usr_officer");
  const mpesaName = MOBILE_MONEY_METHODS.find((m) => m.id === "MPESA")?.name;
  ok("6.rails · the rails are the mobile-money rows the kill switch leaves open for deposits, in chooser order: all four open; M-Pesa paused (as isPaymentPaused says) drops it alone; all four paused is no rail open",
    j(open0?.deposit.railNames) === j(names) && open0?.deposit.railsOpen === true && mpesaPaused
      && j(one?.deposit.railNames) === j(names.filter((n) => n !== mpesaName)) && one?.deposit.railsOpen === true
      && j(all?.deposit.railNames) === j([]) && all?.deposit.railsOpen === false,
    j({ open: open0?.deposit.railNames, one: one?.deposit.railNames, all: all?.deposit.railNames }));

  // a failed read is unknown, never zero; a missing account is unknown
  const realPending = db.txn.newestProcessingDeposit;
  (db.txn as { newestProcessingDeposit: unknown }).newestProcessingDeposit = () => { throw new Error("planted outage"); };
  let failedRead: unknown = "unset";
  try { failedRead = await impl.facts(u("pend"), null); } finally { (db.txn as { newestProcessingDeposit: unknown }).newestProcessingDeposit = realPending; }
  ok("6.failed · one failed read makes the facts null — unknown, never a set of zeros — and so does a missing account",
    failedRead === null && (await impl.facts(u("nobody"), null)) === null, j({ failedRead }));

  // ── the OPEN read (S8-PLAN A4): what a refused tap records, and nothing else ──
  const pubNow = await impl.pub("mkt_sheet0live", Date.now());
  const openAt = pubNow ? { bettable: pubNow.bettable, min: pubNow.min, max: pubNow.max } : null;
  // past the limit: an ordinary read writes nothing; the open read runs the gate and writes ONE enforced row
  await player(u("ovA"), 5_000, 0);
  await rgRow(u("ovA"), { sessionTimeLimitMin: 30 });
  const c0 = await clock(u("ovA"));
  await impl.forUser("mkt_sheet0live", u("ovA"), { playStartedAt: PLAY });
  const c1 = await clock(u("ovA")), r1 = await rows("rg.session_limit.enforced", u("ovA"));
  ok("6.open.closed · past the limit, a read WITHOUT open (a refresh, a focus, a balance event, the key read) writes nothing: no enforced row, the play clock untouched",
    c0 === c1 && r1.length === 0, j({ c0, c1, rows: r1.length }));
  await impl.forUser("mkt_sheet0live", u("ovA"), { playStartedAt: PLAY, open: openAt });
  const c2 = await clock(u("ovA")), r2 = await rows("rg.session_limit.enforced", u("ovA"));
  const p2 = (r2[0]?.payload ?? {}) as Record<string, unknown>;
  ok("6.open.session · past the limit, the OPEN read runs the gate (the sitting is held: the play clock is written) and writes exactly one rg.session_limit.enforced row, the bet path's payload plus at: \"sheet\"",
    !!openAt && c2 !== c1 && r2.length === 1 && p2.limitMin === 30 && p2.playedMin === 45 && p2.at === "sheet", j({ c2, rows: r2.map((r) => r.payload) }));
  await player(u("within"), 5_000, 0);
  await rgRow(u("within"), { sessionTimeLimitMin: 30 });
  const w0 = await clock(u("within"));
  await impl.forUser("mkt_sheet0live", u("within"), { playStartedAt: Date.now() - 10 * 60_000, open: openAt });
  const w1 = await clock(u("within"));
  ok("6.open.within · within the limit the open read writes nothing: no enforced row, the play clock untouched",
    w0 === w1 && (await rows("rg.session_limit.enforced", u("within"))).length === 0, j({ w0, w1 }));
  // a blocked account, and a loss limit below the minimum stake
  await player(u("susp"), 5_000, 0);
  await db.user.update(u("susp"), { status: "SUSPENDED" } as never);
  await impl.forUser("mkt_sheet0live", u("susp"), {});
  const a0 = await rows("bet.account_blocked", u("susp"));
  await impl.forUser("mkt_sheet0live", u("susp"), { open: openAt });
  const a1 = await rows("bet.account_blocked", u("susp"));
  ok("6.open.account · a suspended account: no row on an ordinary read; the open read writes exactly one bet.account_blocked, the bet path's payload plus at: \"sheet\"",
    a0.length === 0 && a1.length === 1 && j(a1[0]?.payload) === j({ status: "SUSPENDED", at: "sheet" }), j(a1.map((r) => r.payload)));
  await player(u("lossb"), 5_000, 0);
  await rgRow(u("lossb"), { dailyLossLimit: MIN - 1 });
  await impl.forUser("mkt_sheet0live", u("lossb"), {});
  const l0 = await rows("bet.loss_limit_blocked", u("lossb"));
  await impl.forUser("mkt_sheet0live", u("lossb"), { open: openAt });
  const l1 = await rows("bet.loss_limit_blocked", u("lossb"));
  const lp = (l1[0]?.payload ?? {}) as Record<string, unknown>;
  const gateLoss = await checkLossLimit(u("lossb"), MIN);
  ok("6.open.loss · a loss limit below the minimum stake: no row on an ordinary read; the open read writes exactly one bet.loss_limit_blocked at the market's minimum, with checkLossLimit's own reason and at: \"sheet\"",
    l0.length === 0 && l1.length === 1 && lp.stake === MIN && lp.at === "sheet" && !gateLoss.allowed && lp.reason === gateLoss.reason, j(l1.map((r) => r.payload)));
}

/** §7–§8 · the seed, the route's contract for the new parameters, and the key's position. */
async function seedAndRoute(impl: Impl, ok: Ok) {
  const j = (v: unknown) => JSON.stringify(v);
  /* 7 · the seed */
  const ids = ["mkt_sheet0live", "mkt_sheet0closed", "mkt_sheet0legacy"];
  const drift: string[] = [];
  for (const id of ids) if (j(await impl.pub(id, NOW)) !== j(await preExtraction(id, NOW))) drift.push(id);
  ok("7.unchanged · sheetPublic is unchanged by the extraction: for a LIVE market, one whose selection has closed and one with no selection close, it equals the pre-extraction assembly field for field",
    drift.length === 0, j({ drift }));
  const seedDrift: string[] = [];
  for (const id of ids) {
    const m = await marketStore.get(id), p = await impl.pub(id, NOW);
    const sd = m ? await impl.seed(m, NOW) : null;
    const { estimates: _e, ...rest } = (p ?? {}) as Record<string, unknown>;
    if (!p || !sd || j(sd) !== j({ v: 1, ...rest })) seedDrift.push(id);
  }
  const seedNulls = await Promise.all(["mkt_sheet0updown", "mkt_sheet0resolved", "mkt_sheet0draft"].map(async (id) => { const m = await marketStore.get(id); return m ? impl.seed(m, NOW) : "no row"; }));
  ok("7.seed · the card's seed is the public half less its estimates, versioned (v: 1), field for field; and null exactly where the public half is null (an Up & Down round, a RESOLVED and a DRAFT market)",
    seedDrift.length === 0 && seedNulls.every((x) => x === null), j({ seedDrift, seedNulls }));

  /* 8 · the route and the key */
  const p = await impl.pub("mkt_sheet0live", NOW);
  const PUBLIC_KEYS = ["id", "bettable", "yesPool", "noPool", "rates", "feePct", "min", "max", "closesAt", "serverNow", "estimates"];
  const code = impl.route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("8.anon · the public half names no viewer: its fields are exactly the market's, and the route reads the session only for ?me=1",
    !!p && j(Object.keys(p).sort()) === j([...PUBLIC_KEYS].sort()) && /const session = me \? await getSession\(\) : null;/.test(code)
      && (code.match(/getSession\(/g) ?? []).length === 1, j(p ? Object.keys(p) : null));
  ok("8.params · the viewer's read takes the session's play clock, the side only as YES or NO, the key as given (the read checks its shape), and `open` only from open=1 — handed the public half it just read",
    /playStartedAt: session\.playStartedAt \?\? null,/.test(code) && /side: side === "YES" \|\| side === "NO" \? side : null,/.test(code)
      && /key: q\.get\("key"\),/.test(code) && /open: q\.get\("open"\) === "1" \? pub : null,/.test(code)
      && /\{ \.\.\.pub, me: mine \}, \{ headers: PRIVATE \}/.test(code));
  const mine = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { key: KEY_MINE });
  ok("8.key.mine · the viewer's own key names its position", j(mine.keyPosition) === j({ positionId: "pos_sheet_k1" }), j(mine.keyPosition));
  const theirs = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { key: KEY_THEIRS });
  ok("8.key.theirs · another player's key is answered null — a key never reveals someone else's bet", theirs.keyPosition === null, j(theirs.keyPosition));
  const house = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { key: KEY_HOUSE });
  ok("8.key.house · a house bot's key on the viewer's own account is answered null — a house stake is not the player's bet", house.keyPosition === null, j(house.keyPosition));
  const bad = await impl.forUser("mkt_sheet0live", "usr_sheet_1", { key: "not-a-uuid" });
  const none = await impl.forUser("mkt_sheet0live", "usr_sheet_1", {});
  ok("8.key.shape · a key that is not a UUID is never looked up (a row stored under it is not found), and no key is null",
    bad.keyPosition === null && none.keyPosition === null, j({ bad: bad.keyPosition, none: none.keyPosition }));
}

await fixtures();
if (!PROVE_RED) {
  console.log("journey-sheet — the Vodacom plan S3 sheet API (in-memory store + the route's contract)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`\nJOURNEY SHEET — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  type Plant = { name: string; expect: RegExp; impl: Impl };
  const swap = (from: string, to: string): Impl => ({ ...REAL, route: REAL.route.replace(from, to) });
  const plants: Plant[] = [
    { name: "the public half priced at the LIVE config, not the frozen snapshot", expect: /^1\.public /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, rates: pickEstimateRates({ ...SNAP, operatorFeeRate: 0.2 }) }; } } },
    { name: "betting closes at resolution even when the selection closes first", expect: /^1\.public /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, closesAt: iso(NOW + 48 * HOUR) }; } } },
    { name: "an Up & Down round served as a sheet", expect: /^2\.not-a-sheet /,
      impl: { ...REAL, pub: async (id, now) => (await REAL.pub(id, now)) ?? (id === "mkt_sheet0updown" ? ((await REAL.pub("mkt_sheet0live", now)) as never) : null) } },
    { name: "a closed selection still bettable", expect: /^2\.closed /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, bettable: true }; } } },
    { name: "spendable leaves the bonus out", expect: /^3\.me /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, spendable: r.balance }; } } },
    { name: "a cashed-out side counted as held", expect: /^3\.me /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, heldSides: ["YES", "NO"] }; } } },
    { name: "an unread wallet read as zero", expect: /^3\.unread /,
      impl: { ...REAL, forUser: async (m, u) => { const r = await REAL.forUser(m, u); return { ...r, spendable: r.spendable ?? 0 }; } } },
    { name: "a POST handler added", expect: /^4\.verbs /, impl: swap("export async function GET(", "export async function POST() { return null; }\nexport async function GET(") },
    { name: "the rate limit removed", expect: /^4\.rate /, impl: swap('rateCheckAsync(ip, "sheet.ip")', "({ allowed: true })") },
    { name: "the public half cached for a minute", expect: /^4\.cache /, impl: swap("s-maxage=5,", "s-maxage=60,") },
    { name: "the viewer's half served with the public cache header", expect: /^4\.cache /, impl: swap("{ headers: PRIVATE }", "{ headers: PUBLIC }") },
    { name: "a 503 that a cache may keep", expect: /^4\.errors /, impl: swap("status: 503, headers: NO_STORE", "status: 503, headers: PUBLIC") },
    // §5 · the card's figures (S7 WP3 step 5)
    { name: "the card's figures drop the selection close (a closed market still prices its card)", expect: /^5[.]figures /,
      impl: { ...REAL, figures: (m, now) => REAL.figures({ ...m, selectionClosedAt: null }, now) } },
    { name: "an Up & Down round priced on its card as if it were a market", expect: /^5[.]card-only /,
      impl: { ...REAL, figures: (m, now) => REAL.figures({ ...m, productLine: "MARKET" }, now) } },
    { name: "the card's bettable test drops its LIVE conjunct (a DRAFT market takes bets on its card; a RESOLVED one is still shut by isSelectionClosed)", expect: /^5[.]card-only /,
      impl: { ...REAL, figures: (m, now) => {
        const f = REAL.figures(m, now);
        const open = !isSelectionClosed(m) && Date.parse(m.resolutionAt) > now;
        return { ...f, bettable: open, estimates: { YES: cardEstimate(m, f.rates, "YES", open), NO: cardEstimate(m, f.rates, "NO", open) } };
      } } },
    { name: "the public half re-inlined: its own copy of the figures beside cardFigures, free to drift from the card's", expect: /^5[.]one-source /,
      impl: { ...REAL, sheetSrc: REAL.sheetSrc.replace("  const { bettable, rates, estimates } = cardFigures(m, nowMs);", [
        "  const bettable = !isSelectionClosed(m) && Date.parse(m.resolutionAt) > nowMs;",
        "  const rates = pickEstimateRates(ratesFor(m));",
        '  const estimates = { YES: cardEstimate(m, rates, "YES", bettable), NO: cardEstimate(m, rates, "NO", bettable) };',
      ].join(LF)) } },
    // ⚠️ RE-PINNED by S8 WP3: the cardFigures call moved, unchanged, into `sheetPublicFrom`; sheetPublic now reaches the
    // assembly after its await. The defect is the same: the figures read before the bounds' await.
    { name: "the figures read before the stake bounds' await again (the returned pools and the figures from two moments)", expect: /^5[.]one-source /,
      impl: { ...REAL, sheetSrc: REAL.sheetSrc.replace("  const bounds = await stakeBoundsForMarket(m);" + LF, "  const early = sheetPublicFrom(m, { min: 0, max: 0 }, nowMs);" + LF
        + "  const bounds = await stakeBoundsForMarket(m);" + LF).replace("  return sheetPublicFrom(m, bounds, nowMs);" + LF, "  return early && { ...early, min: bounds.min, max: bounds.max };" + LF) } },
    // §3 · the bonus line (S8 WP3 step 2; Open point 21)
    { name: "the bonus line on the side already held, not the other one", expect: /^3[.]bonus /,
      impl: { ...REAL, forUser: (m, u, o = {}) => REAL.forUser(m, u, { ...o, side: o.side === "YES" ? "NO" : o.side === "NO" ? "YES" : o.side }) } },
    // §6 · the viewer's facts (S8 WP3 step 1)
    { name: "a fact read from the wrong row (another player's wallet)", expect: /^6[.]wallet /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl), o = await REAL.facts("usr_sheet_2", pl); return r && o ? { ...r, wallet: o.wallet } : r; } } },
    { name: "checkSessionTimeLimit called from the read (the play clock written by a read)", expect: /^6[.]session[.]nowrite /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl); return r && { ...r, session: await checkSessionTimeLimit(u, pl) }; } } },
    { name: "the pending read ignoring status (the newest deposit of any status)", expect: /^6[.]pending /,
      impl: { ...REAL,
        pending: async (u) => {
          const all = (await db.txn.findByUser(u, 500)).filter((t) => t.type === "DEPOSIT").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          return all[0] ? { amount: all[0].amount, txnId: all[0].id, createdAt: all[0].createdAt } : null;
        },
        facts: async (u, pl) => {
          const r = await REAL.facts(u, pl);
          const all = (await db.txn.findByUser(u, 500)).filter((t) => t.type === "DEPOSIT").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
          return r && { ...r, pendingDeposit: all[0] ? { amount: all[0].amount, txnId: all[0].id, createdAt: all[0].createdAt } : null };
        } } },
    { name: "today's losses left out of the loss fact", expect: /^6[.]loss /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl); return r && { ...r, loss: { ...r.loss, lossToday: 0 } }; } } },
    { name: "the deposit windows read confirmed-only (the gate counts PROCESSING)", expect: /^6[.]deposit /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl); return r && { ...r, deposit: { ...r.deposit, usage: { ...r.deposit.usage, day: await db.txn.sumDepositsSince(u, Date.now() - 24 * HOUR) } } }; } } },
    { name: "the source-of-funds standing read as \"any declaration\" (the gate asks ACCEPTED)", expect: /^6[.]sof /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl); return r && { ...r, deposit: { ...r.deposit, sof: { ...r.deposit.sof, accepted: (await db.sourceOfFunds.get(u)) != null } } }; } } },
    { name: "a paused rail still named", expect: /^6[.]rails /,
      impl: { ...REAL, facts: async (u, pl) => { const r = await REAL.facts(u, pl); return r && { ...r, deposit: { ...r.deposit, railNames: MOBILE_MONEY_METHODS.map((m) => m.name), railsOpen: true } }; } } },
    { name: "a failed read answered as zeros", expect: /^6[.]failed /,
      impl: { ...REAL, facts: async (u, pl) => (await REAL.facts(u, pl)) ?? ({ maintenance: false, lockout: null, session: null, account: { status: "ACTIVE" },
        wallet: { status: "ACTIVE", balance: 0, bonusBalance: 0 }, loss: { dailyLossLimit: null, lossToday: 0 }, pendingDeposit: null,
        deposit: { limits: { daily: null, weekly: null, monthly: null }, usage: { day: 0, week: 0, month: 0 }, sof: { accepted: false, singleTxn: 0, rolling30d: 0 }, railsOpen: true, railNames: [] } } as never) } },
    // §6 · the OPEN read (S8-PLAN A4)
    { name: "an enforced open read with no audit row (the gate run, the row never written)", expect: /^6[.]open[.]session /,
      impl: { ...REAL, forUser: async (m, u, o = {}) => { if (o.open) { await checkSessionTimeLimit(u, o.playStartedAt); return REAL.forUser(m, u, { ...o, open: null }); } return REAL.forUser(m, u, o); } } },
    { name: "a write within the limit (the open read always runs the gate)", expect: /^6[.]open[.]within /,
      impl: { ...REAL, forUser: async (m, u, o = {}) => { if (o.open) await checkSessionTimeLimit(u, o.playStartedAt); return REAL.forUser(m, u, o); } } },
    { name: "a write on a read without open=1 (every read records)", expect: /^6[.]open[.]closed /,
      impl: { ...REAL, forUser: (m, u, o = {}) => REAL.forUser(m, u, { ...o, open: o.open ?? { bettable: true, min: MIN, max: 1_000_000 } }) } },
    // §7 · the seed (S8 WP3 step 4)
    { name: "the extraction drops {pct} (sheetPublic no longer what it was)", expect: /^7[.]unchanged /,
      impl: { ...REAL, pub: async (id, now) => { const p = await REAL.pub(id, now); return p && { ...p, feePct: null }; } } },
    { name: "the seed carries the estimates", expect: /^7[.]seed /,
      impl: { ...REAL, seed: async (m, now) => { const sd = await REAL.seed(m, now), p = await REAL.pub(m.id, now); return sd && p ? ({ ...sd, estimates: p.estimates } as never) : sd; } } },
    { name: "an Up & Down round seeded", expect: /^7[.]seed /,
      impl: { ...REAL, seed: async (m, now) => (await REAL.seed(m, now)) ?? (await REAL.seed({ ...m, productLine: "MARKET", status: "LIVE" }, now)) } },
    // §8 · the route and the key (S8 WP3 step 5; S8-PLAN A2)
    { name: "the session read on the public half too", expect: /^8[.]anon /, impl: swap("const session = me ? await getSession() : null;", "const session = await getSession();") },
    { name: "open on every viewer read", expect: /^8[.]params /, impl: swap('open: q.get("open") === "1" ? pub : null,', "open: pub,") },
    { name: "another player's key answered", expect: /^8[.]key[.]theirs /,
      impl: { ...REAL, forUser: async (m, u, o = {}) => { const r = await REAL.forUser(m, u, o); const p = o.key ? await positionStore.findByIdempotencyKey(o.key) : null; return p && p.houseBotId == null ? { ...r, keyPosition: { positionId: p.id } } : r; } } },
    { name: "a house bot's key answered", expect: /^8[.]key[.]house /,
      impl: { ...REAL, forUser: async (m, u, o = {}) => { const r = await REAL.forUser(m, u, o); const p = o.key ? await positionStore.findByIdempotencyKey(o.key) : null; return p && p.userId === u ? { ...r, keyPosition: { positionId: p.id } } : r; } } },
    { name: "a key that is not a UUID looked up", expect: /^8[.]key[.]shape /,
      impl: { ...REAL, forUser: async (m, u, o = {}) => { const r = await REAL.forUser(m, u, o); const p = o.key ? await positionStore.findByIdempotencyKey(o.key) : null; return p && p.userId === u && p.houseBotId == null ? { ...r, keyPosition: { positionId: p.id } } : r; } } },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const clean = await run(REAL, quiet, "red0");
  ok("the REAL sheet passes every check", clean.length === 0, clean.join(" | "));
  for (const [n, p] of plants.entries()) {
    const failures = await run(p.impl, quiet, `red${n + 1}`);
    const hit = failures.some((f) => p.expect.test(f));
    if (hit) caught++;
    ok(p.name, hit, hit ? "" : failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }
  console.log(`\nRED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
