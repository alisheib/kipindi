/**
 * WHAT THE BET SHEET SAYS WHEN THE STAKE IS MORE THAN THE WALLET HOLDS — `shortfallPlan` (the Vodacom plan S3,
 * `docs/VODACOM-PLAN.md` §3.1; the deck's low-balance screen).
 *
 * ⭐ IT ASKS THE REAL GATES' QUESTIONS, IN THEIR ORDER, BEFORE IT OFFERS ANYTHING. A plan that offered "Weka pesa TZS
 * 3,000" to a player the bet path would refuse anyway (a break, a closed market, a held wallet, their own loss limit)
 * sends them to pay for a bet they cannot place. So the checks run exactly as `buyPosition` runs them
 * (`lib/server/market-service.ts`), then as `deposit()` runs them (`lib/server/wallet-service.ts`):
 *    1 maintenance · 2 self-exclusion / cooling-off (with the date) · 3 the session limit · 4 the account blocked ·
 *    5 the market not LIVE / selection closed · 6 the stake bounds · 7 the wallet not ACTIVE · 8 the loss limit ·
 *    9 ENOUGH · 10 a deposit already pending · 11 D = max(shortfall, DEPOSIT_MIN_TZS) · 12 an unconfirmed email (the
 *    code is the deposit screen's first step, still an ordinary deposit) · 13 the deposit-limit headroom ·
 *    14 source of funds · 15 deposit.
 * Every input is a fact the server already reads for those gates (`getRgSettings`, `getLimitUsage`, `isLockedOut`,
 * `checkSessionTimeLimit`, the wallet row, the source-of-funds row); this module decides nothing they would decide
 * differently — `test:deposit-ceiling` drives the REAL `deposit()` and `checkLossLimit` to prove it.
 *
 * ⛔ UNKNOWN IS NOT ZERO. A balance the page could not read is `unknown`: the sheet shows "Salio lako —" and lets the
 * server decide, never a shortfall computed from a guess.
 *
 * SPENDABLE = balance + (bonusBalance ?? 0) — the very figure `buyPosition` refuses against.
 *
 * THE DEPOSIT OFFER — D first and selected, then the next two amounts of `DEPOSIT_QUICK_AMOUNTS` strictly above D;
 * a chip above `depositCeilingFor` (DEPOSIT_MAX, the RG day/week/month headroom counting PROCESSING deposits, the
 * source-of-funds headroom) is dropped, never shown — and there is no per-rail ceiling (E-231). 3,000 → [3,000, 5,000,
 * 10,000]; 5,000 → [5,000, 10,000, 25,000]; 300 → [500, 1,000, 5,000] with `belowDepositMin`.
 *
 * "BET INSTEAD" — a second option, the bet the wallet CAN place now: min(spendable, the stake maximum, the loss
 * headroom), offered only when that is at least the market's minimum stake.
 *
 * ⚠️ A RECORDED DEPARTURE FROM §3.1 STEP 7. §3.1 offered "bet instead" beside a wallet that is not ACTIVE; the bet
 * path refuses a non-ACTIVE wallet outright (`wallet_frozen`), so that offer could only ever fail. A held wallet is
 * `blocked` (the notice + /help) with no option; the "deposits paused" notice with "bet instead" belongs to the case
 * where every deposit rail is paused, which is where it can be kept.
 *
 * Pure: the only import is the deposit bounds from `validators.ts`, which the deposit form already ships to the
 * browser. The source-of-funds thresholds are INPUTS (declared in `wallet-service.ts`, a server module, where
 * `test:kyc-cert-d3` requires them to stay).
 */
import { DEPOSIT_MAX_TZS, DEPOSIT_MIN_TZS } from "@/lib/server/validators";

/** The deposit screen's quick amounts — ONE ladder, read by `/wallet/deposit` and by the shortfall's chips. */
export const DEPOSIT_QUICK_AMOUNTS: readonly number[] = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

/* ─── The two headroom helpers — each proven equal to its gate in `test:deposit-ceiling` ─────────────────────── */

export type DepositLimits = { daily: number | null; weekly: number | null; monthly: number | null };
/** `getLimitUsage()`'s deposit sums: CONFIRMED + PROCESSING over rolling 24 h / 7 d / 30 d — what the gate sums. */
export type DepositUsage = { day: number; week: number; month: number };
export type SofStanding = {
  /** A declaration on file with `reviewStatus === "ACCEPTED"`. */
  accepted: boolean;
  /** `SOF_SINGLE_TXN_TZS` — a single deposit at or above it needs an accepted declaration. */
  singleTxn: number;
  /** `SOF_ROLLING_30D_TZS` — 30-day deposits (this one included) at or above it need one too. */
  rolling30d: number;
};

/**
 * THE LARGEST DEPOSIT `deposit()` WOULD ACCEPT right now, and what binds it. An amount is accepted iff it is ≤ `max`
 * (and ≥ DEPOSIT_MIN_TZS): the schema's cap; each RG window refuses iff `used + amount > limit`; source of funds
 * refuses iff not accepted and `amount ≥ singleTxn || usage.month + amount ≥ rolling30d`.
 */
export function depositCeilingFor(input: { limits: DepositLimits; usage: DepositUsage; sof: SofStanding }): {
  max: number;
  binding: "deposit_max" | "deposit_limit" | "sof_required";
} {
  let max = DEPOSIT_MAX_TZS;
  let binding: "deposit_max" | "deposit_limit" | "sof_required" = "deposit_max";
  const tighten = (cap: number, why: typeof binding) => { if (cap < max) { max = cap; binding = why; } };
  const { limits, usage } = input;
  if (limits.daily !== null) tighten(limits.daily - usage.day, "deposit_limit");
  if (limits.weekly !== null) tighten(limits.weekly - usage.week, "deposit_limit");
  if (limits.monthly !== null) tighten(limits.monthly - usage.month, "deposit_limit");
  if (!input.sof.accepted) {
    tighten(input.sof.singleTxn - 1, "sof_required");
    tighten(input.sof.rolling30d - 1 - usage.month, "sof_required");
  }
  return { max: Math.max(0, max), binding };
}

/**
 * THE LARGEST STAKE `checkLossLimit` WOULD ALLOW: `dailyLossLimit − lossToday` (a stake equal to it is allowed);
 * `null` = no loss limit set. `lossToday` is `getLimitUsage().lossToday` — max(0, −net gambling over 24 h).
 */
export function lossHeadroomFor(input: { dailyLossLimit: number | null; lossToday: number }): number | null {
  return input.dailyLossLimit === null ? null : input.dailyLossLimit - input.lossToday;
}

/* ─── The plan ────────────────────────────────────────────────────────────────────────────────────────────────── */

export type ShortfallInput = {
  maintenance: boolean;
  /** `isLockedOut()` — self-exclusion is asked first, then cooling-off. */
  lockout: { kind: "self_exclusion" | "cooling_off"; until: string } | null;
  /** `checkSessionTimeLimit()` — null when no limit or no play clock. */
  session: { exceeded: boolean; limitMin: number; playedMin: number } | null;
  /** The account's status, and the cooling-off end the account gate compares against. */
  account: { status: string; coolingOffUntil?: string | null };
  /** The market takes bets: LIVE, and `isSelectionClosed` is false. */
  market: { live: boolean; selectionClosed: boolean };
  stake: number;
  /** `stakeBoundsForMarket()`. */
  bounds: { min: number; max: number };
  /** Null when the page could not read the wallet. A null `balance` is UNKNOWN, never zero. */
  wallet: { status: string; balance: number | null; bonusBalance: number | null } | null;
  loss: { dailyLossLimit: number | null; lossToday: number };
  /** The player's newest PROCESSING deposit, if one is still in flight. */
  pendingDeposit: { amount: number; txnId: string } | null;
  emailVerified: boolean;
  deposit: {
    limits: DepositLimits;
    usage: DepositUsage;
    sof: SofStanding;
    /** At least one deposit rail is open (not paused by the payment kill switch). */
    railsOpen: boolean;
  };
  nowMs: number;
};

export type ShortfallBlock =
  | "maintenance" | "self_excluded" | "cooling_off" | "session_limit" | "account_blocked" | "market_closed"
  | "stake_not_whole" | "stake_below_min" | "stake_above_max" | "wallet_held" | "loss_limit";

export type DepositOption = {
  kind: "deposit";
  /** D — first and selected. */
  amount: number;
  /** D, then up to two ladder amounts strictly above it, none above the ceiling. */
  chips: number[];
  /** The shortfall is below DEPOSIT_MIN_TZS, so D is the minimum deposit, not the shortfall. */
  belowDepositMin: boolean;
  /** The email is not confirmed: the deposit screen opens on its 6-digit code (still an ordinary deposit). */
  emailCodeFirst: boolean;
};
export type BetInsteadOption = { kind: "betInstead"; stake: number };
export type ShortfallOption = DepositOption | BetInsteadOption;

export type ShortfallPlan =
  | { kind: "blocked"; reason: ShortfallBlock; until?: string; min?: number; max?: number; headroom?: number; limitMin?: number }
  | { kind: "unknown" }
  | { kind: "enough"; spendable: number }
  | { kind: "pending"; amount: number; txnId: string; spendable: number }
  | {
    kind: "short";
    spendable: number;
    shortfall: number;
    /** 0, 1 or 2 entries: the deposit (when `deposit()` would take it) and/or "bet instead". */
    options: ShortfallOption[];
    /** Why no deposit is offered, when none is. */
    depositRefusal?: "rails_paused" | "deposit_limit" | "sof_required" | "deposit_max";
  };

const ACCOUNT_BLOCKED = new Set(["SUSPENDED", "CLOSED", "SELF_EXCLUDED"]);

/** The chips: D, then the next two ladder amounts strictly above it — none above the ceiling. */
export function depositChips(d: number, ceiling: number): number[] {
  const above = DEPOSIT_QUICK_AMOUNTS.filter((a) => a > d).slice(0, 2);
  return [d, ...above].filter((a) => a <= ceiling);
}

/** ⭐ THE PLAN. Total: never throws. */
export function shortfallPlan(i: ShortfallInput): ShortfallPlan {
  const blocked = (reason: ShortfallBlock, extra: Omit<Extract<ShortfallPlan, { kind: "blocked" }>, "kind" | "reason"> = {}): ShortfallPlan =>
    ({ kind: "blocked", reason, ...extra });

  // 1–4 · the player may not bet at all right now.
  if (i.maintenance) return blocked("maintenance");
  if (i.lockout) return blocked(i.lockout.kind === "cooling_off" ? "cooling_off" : "self_excluded", { until: i.lockout.until });
  if (i.session?.exceeded) return blocked("session_limit", { limitMin: i.session.limitMin });
  const coolingActive = i.account.status === "COOLED_OFF"
    && (!i.account.coolingOffUntil || Date.parse(i.account.coolingOffUntil) > i.nowMs);
  if (ACCOUNT_BLOCKED.has(i.account.status) || coolingActive) return blocked("account_blocked");

  // 5–6 · the market and the stake.
  if (!i.market.live || i.market.selectionClosed) return blocked("market_closed");
  if (!Number.isInteger(i.stake)) return blocked("stake_not_whole", { min: i.bounds.min, max: i.bounds.max });
  if (i.stake < i.bounds.min) return blocked("stake_below_min", { min: i.bounds.min, max: i.bounds.max });
  if (i.stake > i.bounds.max) return blocked("stake_above_max", { min: i.bounds.min, max: i.bounds.max });

  // 7 · the wallet — no bet and no deposit through a held wallet.
  if (i.wallet && i.wallet.status !== "ACTIVE") return blocked("wallet_held");

  // 8 · the player's own daily loss limit.
  const lossRoom = lossHeadroomFor(i.loss);
  if (lossRoom !== null && i.stake > lossRoom) return blocked("loss_limit", { headroom: Math.max(0, lossRoom) });

  // 9 · enough? An unread balance is unknown — the server decides.
  if (!i.wallet || i.wallet.balance === null || !Number.isFinite(i.wallet.balance)) return { kind: "unknown" };
  const spendable = Math.max(0, i.wallet.balance) + Math.max(0, i.wallet.bonusBalance ?? 0);
  if (spendable >= i.stake) return { kind: "enough", spendable };

  // 10 · a deposit already in flight — wait for it, never a second one.
  if (i.pendingDeposit) return { kind: "pending", amount: i.pendingDeposit.amount, txnId: i.pendingDeposit.txnId, spendable };

  // "Bet instead": what the wallet can place now, within the stake maximum and the loss headroom.
  const insteadStake = Math.min(Math.floor(spendable), i.bounds.max, lossRoom ?? Number.POSITIVE_INFINITY);
  const betInstead: BetInsteadOption[] = insteadStake >= i.bounds.min ? [{ kind: "betInstead", stake: insteadStake }] : [];

  // 11–15 · the deposit that covers the shortfall.
  const shortfall = i.stake - spendable;
  const d = Math.max(shortfall, DEPOSIT_MIN_TZS);
  if (!i.deposit.railsOpen) return { kind: "short", spendable, shortfall, options: betInstead, depositRefusal: "rails_paused" };
  const ceiling = depositCeilingFor({ limits: i.deposit.limits, usage: i.deposit.usage, sof: i.deposit.sof });
  if (d > ceiling.max) return { kind: "short", spendable, shortfall, options: betInstead, depositRefusal: ceiling.binding };
  const deposit: DepositOption = {
    kind: "deposit",
    amount: d,
    chips: depositChips(d, ceiling.max),
    belowDepositMin: shortfall < DEPOSIT_MIN_TZS,
    emailCodeFirst: !i.emailVerified,
  };
  return { kind: "short", spendable, shortfall, options: [deposit, ...betInstead] };
}
