/**
 * WHAT THE BET SHEET READS — `GET /api/markets/[id]/sheet` (the Vodacom plan S3, `docs/VODACOM-PLAN.md` §3.1). The
 * route is a thin door; the two reads live here so a suite can drive them without HTTP.
 *
 *   · `sheetPublic` — the market's public facts: whether it takes bets now, its pools, its FROZEN rates (the ones a
 *     bet placed now is priced at, `ratesFor`), the loser-share `{pct}`, the stake bounds (`stakeBoundsForMarket`, the
 *     one resolver the bet path enforces), when betting closes, the server's clock, and the card's figure for each
 *     side (`cardEstimate`). Identical for every viewer, so the route may cache it for a few seconds.
 *   · `sheetForUser` — the signed-in viewer's own: what they can spend (balance + bonus, the figure `buyPosition`
 *     refuses against), the sides they already hold on this market (OPEN positions), the bonus line (the market page's
 *     own B2 rule), every fact `shortfallPlan` asks (`viewerFacts`), and — asked with a bet's key — whether that key
 *     placed a position. Never cached. (The Vodacom plan S8 WP3.)
 *   · `sheetSeedFor` — the public half a journey card hands the sheet, so the sheet draws on the tap frame (S8 WP3 step 4).
 *   · `cardFigures` — what a journey card prints for a market (S7 WP3 step 5): whether it takes a bet now, its frozen
 *     rates and the figure for each side. `sheetPublic` serves exactly these, so the card and the sheet cannot disagree
 *     about a market. `bettableAt` is the bet path's own test, which the journey home (WP7) hands to `homeBook`.
 *
 * ⛔ AN UP & DOWN ROUND, OR A MARKET THAT IS NOT LIVE, IS NOT A SHEET: `sheetPublic` returns null and the route
 * answers 404. "Bettable" mirrors the bet path exactly: LIVE, not `isSelectionClosed`, and before `resolutionAt`.
 *
 * ⭐ THE VIEWER'S FACTS ARE THE GATES' OWN READS (S8 WP3 step 1). Each fact is read by the very function the bet path or
 * `deposit()` decides with — never a re-derivation that could disagree with it — and a read that fails makes `facts`
 * null: UNKNOWN, never zero (`shortfall.ts`). The one exception to "a read writes nothing" is the sheet's OPEN read of a
 * viewer already blocked (`open: true`, S8-PLAN A4): it records exactly what a refused tap would record, in the bet
 * path's order — the session limit's sitting and its `rg.session_limit.enforced` row, `bet.account_blocked`, or
 * `bet.loss_limit_blocked` at the market's minimum stake — each with `at: "sheet"`. Every other read writes nothing
 * but `getRgSettings`' own lazy default row and due-limit apply, which every RG read makes (A4 item 5).
 * ⛔ SERVER-ONLY: it reads the stores, the RG gates and the deposit gate. No client module may import it.
 */
import { getMarket, isSelectionClosed, ratesFor, stakeBoundsForMarket, type StoredMarket } from "./market-service";
import { positionStore } from "./market-dal";
import { db } from "./store";
import { audit } from "./audit";
import { isMaintenanceMode } from "./platform-config";
import { checkLossLimit, checkSessionTimeLimit, getLimitUsage, getRgSettings, isLockedOut, readSessionStanding } from "./responsible-gambling";
import { SOF_ROLLING_30D_TZS, SOF_SINGLE_TXN_TZS } from "./wallet-service";
import { getKillSwitches } from "./payment-ops";
import { getBonusSummary } from "./bonus-service";
import { MOBILE_MONEY_METHODS } from "@/lib/payment-providers";
import { shortfallPlan, type ShortfallInput } from "@/lib/journey/shortfall";
import { cardEstimate, pickEstimateRates, type Estimate, type EstimateRates } from "@/lib/markets/estimate";
import { cardClosesAtMs } from "@/lib/markets/card-close-label";
import { loserSharePct } from "@/lib/payout";

export type SheetPublic = {
  id: string;
  /** The market takes a bet at this moment (the bet path's own test). */
  bettable: boolean;
  yesPool: number;
  noPool: number;
  /** The frozen rates the estimate reads — nothing more (`EstimateRates`). */
  rates: EstimateRates | null;
  /** `{pct}` — the frozen loser-share total; null under capped-commission. */
  feePct: number | null;
  min: number;
  max: number;
  /** When betting closes (`selectionClosedAt ?? resolutionAt`), ISO; null when the market carries neither. */
  closesAt: string | null;
  /** The server's clock, so a sheet counts down against it rather than the phone's. */
  serverNow: number;
  /** The card's figure for each side (stake 0, SJ-1). */
  estimates: { YES: Estimate | null; NO: Estimate | null };
};

export type SheetForUser = {
  /** balance + bonus — null when the wallet could not be read (the sheet shows "Salio lako —"). */
  spendable: number | null;
  balance: number | null;
  bonusBalance: number;
  /** The sides this viewer already holds OPEN positions on, on this market. */
  heldSides: Array<"YES" | "NO">;
  /**
   * The market page's B2 (`bonus_wagering_one_side`, docs/RULES.md §2.5): the viewer holds the side opposite the
   * sheet's and an active grant with wagering left, so this stake accrues no turnover. Null otherwise, with no side
   * asked, and on a failed read (S8-PLAN Open point 21: S3's `bonusWarning` boolean left the route).
   */
  bonusWager: { remaining: number } | null;
  /** Every fact `shortfallPlan` asks but the stake, the market and its bounds — null when any read failed (unknown). */
  facts: SheetFacts | null;
  /**
   * Asked with a bet's key (`?key=`, S8-PLAN A2 item 2): the position that key placed, when it is this viewer's own and
   * not a house bot's; null when it placed none, or the key is not a UUID (no lookup). ⛔ A failed lookup is NOT null:
   * it throws, and the route answers 503, so a doubt is never settled by a read that did not happen.
   */
  keyPosition: { positionId: string } | null;
};

/**
 * ⭐ THE VIEWER'S FACTS — every `ShortfallInput` field but the stake, the market, its bounds and the clock (the sheet
 * brings those). The pending deposit carries its `createdAt` (S8-PLAN A10), and the deposit side the names of the open
 * rails, in chooser order (Open point 36).
 */
export type SheetFacts = Omit<ShortfallInput, "stake" | "market" | "bounds" | "nowMs" | "pendingDeposit" | "deposit"> & {
  pendingDeposit: { amount: number; txnId: string; createdAt: string } | null;
  deposit: ShortfallInput["deposit"] & { railNames: string[] };
};

/** What the card hands the sheet (`data-sheet`): the public half without `estimates`, which the sheet computes from the same rates. */
export type SheetSeed = Omit<SheetPublic, "estimates"> & { v: 1 };

/** What a journey card prints for one market at `nowMs`; the sheet's public half serves the same three. */
export type CardFigures = {
  /** The market takes a bet at this moment (`bettableAt`, the bet path's own test). */
  bettable: boolean;
  /** The frozen rates the estimate reads. */
  rates: EstimateRates | null;
  /** The figure for each side (stake 0, SJ-1); null on each side of an Up & Down round. */
  estimates: { YES: Estimate | null; NO: Estimate | null };
};

/**
 * The bet path's own test: LIVE, the selection still open, and before resolution. ⚠️ Only the resolution half reads
 * `nowMs`: `isSelectionClosed` reads the wall clock itself (market-service.ts), exactly as `sheetPublic` always has, so
 * a caller's clock decides `resolutionAt > nowMs` and nothing else.
 */
export function bettableAt(m: Pick<StoredMarket, "status" | "selectionClosedAt" | "resolutionAt">, nowMs: number): boolean {
  return m.status === "LIVE" && !isSelectionClosed(m) && Date.parse(m.resolutionAt) > nowMs;
}

/** ⭐ THE CARD'S FIGURES — whether it takes a bet, its frozen rates, and `cardEstimate` for YES and for NO. */
export function cardFigures(
  m: Pick<StoredMarket, "status" | "selectionClosedAt" | "resolutionAt" | "feeSnapshot" | "yesPool" | "noPool" | "productLine">,
  nowMs: number,
): CardFigures {
  const bettable = bettableAt(m, nowMs);
  const rates = pickEstimateRates(ratesFor(m));
  return {
    bettable,
    rates,
    estimates: {
      YES: cardEstimate(m, rates, "YES", bettable),
      NO: cardEstimate(m, rates, "NO", bettable),
    },
  };
}

/** A sheet's market: not an Up & Down round, and LIVE. Anything else answers null (the route's 404). */
function isSheetMarket(m: Pick<StoredMarket, "productLine" | "status">): boolean {
  return m.productLine !== "UPDOWN" && m.status === "LIVE";
}

/**
 * ⭐ THE PUBLIC HALF'S ASSEMBLY — pure: the market row, its stake bounds and the clock in, the public half out (S8 WP3).
 * `sheetPublic` and `sheetSeedFor` both build through it, so the card's seed, the sheet and the API cannot disagree.
 */
export function sheetPublicFrom(m: StoredMarket, bounds: { min: number; max: number }, nowMs: number): SheetPublic | null {
  if (!isSheetMarket(m)) return null;
  // The pools returned below and the figures priced from them come from the same moment (the in-memory store moves a
  // row's pools in place): both are read here, after every await of the caller.
  const { bettable, rates, estimates } = cardFigures(m, nowMs);
  const closes = cardClosesAtMs(m);
  return {
    id: m.id,
    bettable,
    yesPool: m.yesPool,
    noPool: m.noPool,
    rates,
    feePct: rates ? loserSharePct(rates) : null,
    min: bounds.min,
    max: bounds.max,
    closesAt: closes === null ? null : new Date(closes).toISOString(),
    serverNow: nowMs,
    estimates,
  };
}

/** The public half, or null for a missing market, an Up & Down round, or a market that is not LIVE. */
export async function sheetPublic(marketId: string, nowMs: number = Date.now()): Promise<SheetPublic | null> {
  if (typeof marketId !== "string" || !/^mkt_[A-Za-z0-9]{1,64}$/.test(marketId)) return null;
  const m = await getMarket(marketId);
  if (!m || !isSheetMarket(m)) return null;
  const bounds = await stakeBoundsForMarket(m);
  // AFTER the await: `sheetPublicFrom` reads the figures, so the pools and the figures priced from them are one moment.
  return sheetPublicFrom(m, bounds, nowMs);
}

/**
 * ⭐ THE CARD'S SEED (S8 WP3 step 4; S8-PLAN Open point 4) — `sheetPublicFrom`'s fields without `estimates`, versioned,
 * for a journey card to hand the sheet so it draws on the tap frame. Null exactly where `sheetPublic` is null.
 */
export async function sheetSeedFor(m: StoredMarket, nowMs: number = Date.now()): Promise<SheetSeed | null> {
  if (!isSheetMarket(m)) return null;
  const bounds = await stakeBoundsForMarket(m);
  const p = sheetPublicFrom(m, bounds, nowMs);
  if (!p) return null;
  const { estimates: _estimates, ...rest } = p;
  return { v: 1, ...rest };
}

/** A position key as the sheet mints it (`crypto.randomUUID()`); anything else is answered null with no lookup. */
const KEY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ⭐ THE VIEWER'S FACTS, FROM THE GATES' OWN READS, IN ONE `Promise.all` (S8 WP3 step 1). Null when any read fails.
 *   maintenance  `isMaintenanceMode()` — the bet path's own.
 *   lockout      `isLockedOut()` — self-exclusion asked first, then cooling-off, with the end.
 *   session      `readSessionStanding()` — `checkSessionTimeLimit`'s verdict with NO play-clock write.
 *   account      the user's status and the cooling-off end the bet path's account test compares against.
 *   wallet       `db.wallet.findByUserId` — status, balance, bonus (null when there is no wallet row: unknown).
 *   loss         `getRgSettings().dailyLossLimit` and `getLimitUsage().lossToday` — `checkLossLimit`'s very sums.
 *   pending      `db.txn.newestProcessingDeposit()` — the newest DEPOSIT in PROCESSING, with its age.
 *   deposit      the three limits and windows (PROCESSING counted, as the gate counts them), the source-of-funds standing
 *                (`db.sourceOfFunds.get`, `reviewStatus === "ACCEPTED"`, as `deposit()` reads it) and its thresholds, and
 *                the mobile-money rails `getKillSwitches()` does not pause for deposits.
 */
export async function viewerFacts(userId: string, playStartedAt: number | null | undefined): Promise<SheetFacts | null> {
  try {
    const [maintenance, lockout, session, user, wallet, rg, usage, pendingDeposit, sof, kill] = await Promise.all([
      isMaintenanceMode(),
      isLockedOut(userId),
      readSessionStanding(userId, playStartedAt),
      db.user.findById(userId),
      db.wallet.findByUserId(userId),
      getRgSettings(userId),
      getLimitUsage(userId),
      db.txn.newestProcessingDeposit(userId),
      db.sourceOfFunds.get(userId),
      getKillSwitches(),
    ]);
    if (!user) return null;
    const paused = kill as Readonly<Record<string, { deposits: boolean } | undefined>>;
    const railNames = MOBILE_MONEY_METHODS.filter((m) => !paused[m.id]?.deposits).map((m) => m.name);
    return {
      maintenance,
      lockout: lockout.locked && lockout.until
        ? { kind: lockout.reason === "cooling_off" ? "cooling_off" : "self_exclusion", until: lockout.until }
        : null,
      session,
      account: { status: user.status, coolingOffUntil: lockout.coolingUntil },
      wallet: wallet ? { status: wallet.status, balance: Number.isFinite(wallet.balance) ? wallet.balance : null, bonusBalance: wallet.bonusBalance ?? null } : null,
      loss: { dailyLossLimit: rg.dailyLossLimit, lossToday: usage.lossToday },
      pendingDeposit: pendingDeposit ? { amount: pendingDeposit.amount, txnId: pendingDeposit.txnId, createdAt: pendingDeposit.createdAt } : null,
      deposit: {
        limits: { daily: rg.dailyDepositLimit, weekly: rg.weeklyDepositLimit, monthly: rg.monthlyDepositLimit },
        usage: { day: usage.depositDay, week: usage.depositWeek, month: usage.depositMonth },
        sof: { accepted: sof?.reviewStatus === "ACCEPTED", singleTxn: SOF_SINGLE_TXN_TZS, rolling30d: SOF_ROLLING_30D_TZS },
        railsOpen: railNames.length > 0,
        railNames,
      },
    };
  } catch {
    return null;
  }
}

/** The market half the open's record needs: whether it takes a bet now, and its stake bounds (the public half's). */
export type SheetMarketNow = Pick<SheetPublic, "bettable" | "min" | "max">;

/**
 * ⭐ THE OPEN'S RECORD (S8-PLAN A4): what a refused tap at the market's minimum stake would record, and nothing else.
 * The plan at that stake answers in the bet path's order; only three of its blocks have a bet-path row:
 *   · session_limit — the gate itself runs (its play-clock write holds the sitting) and, past the limit, the bet path's
 *     `rg.session_limit.enforced` row is written with `at: "sheet"`;
 *   · account_blocked — `bet.account_blocked`, the bet path's payload plus `at: "sheet"`;
 *   · loss_limit — `checkLossLimit` at the minimum stake, and on its refusal `bet.loss_limit_blocked` with that stake,
 *     its reason and `at: "sheet"`.
 * Maintenance, a break, a closed market and a held wallet write nothing, because the bet path writes nothing for them.
 * Unknown facts record nothing: the sheet then lets the tap through to the gates themselves.
 */
async function recordOpenBlock(userId: string, playStartedAt: number | null | undefined, facts: SheetFacts | null, market: SheetMarketNow): Promise<void> {
  if (!facts) return;
  const plan = shortfallPlan({
    ...facts,
    stake: market.min,
    market: { live: market.bettable, selectionClosed: false },
    bounds: { min: market.min, max: market.max },
    nowMs: Date.now(),
  });
  if (plan.kind !== "blocked") return;
  if (plan.reason === "session_limit") {
    const s = await checkSessionTimeLimit(userId, playStartedAt);
    if (s?.exceeded) {
      audit({
        category: "COMPLIANCE",
        action: "rg.session_limit.enforced",
        actorId: userId,
        targetType: "User",
        targetId: userId,
        payload: { limitMin: s.limitMin, playedMin: s.playedMin, at: "sheet" },
      });
    }
  } else if (plan.reason === "account_blocked") {
    audit({
      category: "COMPLIANCE",
      action: "bet.account_blocked",
      actorId: userId,
      targetType: "User",
      targetId: userId,
      payload: { status: facts.account.status, at: "sheet" },
    });
  } else if (plan.reason === "loss_limit") {
    const loss = await checkLossLimit(userId, market.min);
    if (!loss.allowed) {
      audit({ category: "COMPLIANCE", action: "bet.loss_limit_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { stake: market.min, reason: loss.reason, at: "sheet" } });
    }
  }
}

export type SheetForUserOpts = {
  /** The session's play clock (`session.playStartedAt`), for the session limit. */
  playStartedAt?: number | null;
  /** The sheet's side (`?side=`), for the bonus line. */
  side?: "YES" | "NO" | null;
  /** A bet's key (`?key=`), for `keyPosition`. */
  key?: string | null;
  /** The sheet's OPEN read (`?open=1`) of this market now: the one read that may record a block (S8-PLAN A4). */
  open?: SheetMarketNow | null;
};

/** The signed-in half, for `userId` only — the caller names the market, never the user or a position. */
export async function sheetForUser(marketId: string, userId: string, opts: SheetForUserOpts = {}): Promise<SheetForUser> {
  // ⚠️ try/catch, not `.catch()`: the in-memory twin answers synchronously, and a read that fails is "unknown", not 0.
  let wallet: Awaited<ReturnType<typeof db.wallet.findByUserId>> | null = null;
  try { wallet = await db.wallet.findByUserId(userId); } catch { wallet = null; }
  const balance = wallet && Number.isFinite(wallet.balance) ? wallet.balance : null;
  const bonusBalance = Math.max(0, wallet?.bonusBalance ?? 0);
  let positions: Awaited<ReturnType<typeof positionStore.listForUserAndMarket>> = [];
  try { positions = await positionStore.listForUserAndMarket(userId, marketId); } catch { positions = []; }
  const held = new Set<"YES" | "NO">();
  for (const p of positions) if (p.status === "OPEN" && (p.side === "YES" || p.side === "NO")) held.add(p.side);

  const facts = await viewerFacts(userId, opts.playStartedAt);
  if (opts.open) await recordOpenBlock(userId, opts.playStartedAt, facts, opts.open);

  // B2, the market page's own rule ([id]/page.tsx): the other side held, and an active grant with wagering left.
  let bonusWager: SheetForUser["bonusWager"] = null;
  const other = opts.side === "YES" ? "NO" : opts.side === "NO" ? "YES" : null;
  if (other && held.has(other)) {
    try {
      const b = await getBonusSummary(userId);
      if (b.activeCount > 0 && b.activeWagerRemainingTzs > 0) bonusWager = { remaining: b.activeWagerRemainingTzs };
    } catch { bonusWager = null; }
  }

  // A2: the key's position — this viewer's own, never a house bot's. ⛔ No try/catch: a failed lookup is no answer.
  let keyPosition: SheetForUser["keyPosition"] = null;
  if (typeof opts.key === "string" && KEY_UUID.test(opts.key)) {
    const p = await positionStore.findByIdempotencyKey(opts.key);
    if (p && p.userId === userId && p.houseBotId == null) keyPosition = { positionId: p.id };
  }

  return {
    spendable: balance === null ? null : Math.max(0, balance) + bonusBalance,
    balance,
    bonusBalance,
    heldSides: (["YES", "NO"] as const).filter((s) => held.has(s)),
    bonusWager,
    facts,
    keyPosition,
  };
}
