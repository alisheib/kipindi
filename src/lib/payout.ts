/**
 * Pari-mutuel fee + payout math — THE single source of truth.
 *
 * Imported by BOTH the client (dial, confirm modal, position card) and the
 * server (settlement, cash-out, ledger, admin simulator). Nothing in here may
 * import from `server/` — keep it isomorphic, and keep the formula in ONE place.
 * `server/market-config.ts` re-exports these rather than restating them; the old
 * code carried two copies of the formula and two sets of rate constants, and
 * they drifted.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 *   "Our commission is 10% of the pool, but never more than a third of the
 *    smaller side."
 *
 *   pool       = yesPool + noPool
 *   smaller    = min(yesPool, noPool)          // the prize — all the winners can win
 *   commission = commissionRate * pool         // 10%
 *   ceiling    = feeCeilingRate  * smaller     // a third
 *   fee        = min(commission, ceiling)      // <- the whole thing
 *   netPool    = pool - fee
 *   payout(p)  = round(p.stake / winningPool * netPool)
 *
 * WHY THE CEILING EXISTS. The smaller side IS the prize. A flat 10%-of-pool fee
 * on a lopsided poll grows LARGER THAN THE ENTIRE PRIZE, so the balance can only
 * come out of the winners' own returned stakes — and every winner takes a loss on
 * a correct call. That is not a hypothetical: on a real poll (YES 300,000 /
 * NO 10,500) the old 9%-of-pool fee was 31,050 against a prize of 10,500, and a
 * 100,000 stake on the winning side paid back 93,150. The ceiling is what makes
 * that arithmetically impossible.
 *
 * WHY A THIRD. At a ceiling of one half we would take exactly as much as all the
 * winners put together; above a half we take more than they do. At a third the
 * winners always keep at least twice what we take — a promise we can print:
 * "We never take more than a third of what you win."
 *
 * NO CLIFF, NO BRANCH. "The full 10% whenever the smaller side is >= 30% of the
 * pool" and "never more than a third of the smaller side" are the SAME RULE. They
 * cross over seamlessly at exactly 70/30 (10% of 100,000 = 10,000; a third of
 * 30,000 = 10,000). `min()` finds the seam by itself. Do not reintroduce a
 * threshold `if` — a threshold is a step function, and a step function is gameable
 * by a bettor who nudges the pools across the line.
 *
 * ── THE INVARIANTS (see scripts/money-invariants.test.mts) ─────────────────
 *
 *  1. A WIN IS NEVER PAID BELOW ITS STAKE. Because fee <= (1/3)*smaller:
 *       - if the winning side is the BIGGER one, smaller == losingPool, so
 *         netPool >= winningPool + (2/3)*losingPool  ->  ratio >= 1 + (2/3)*L/W > 1
 *       - if the winning side is the SMALLER one, fee <= (1/3)*winningPool, so
 *         netPool >= (2/3)*winningPool + losingPool  ->  ratio >= 2/3 + L/W > 5/3
 *     This holds for ANY commissionRate an admin can type — the ceiling seals the
 *     system against admin error too. It needs only feeCeilingRate <= 1, which
 *     validation enforces. `assertWinnerFloor` re-checks it at runtime and THROWS,
 *     because refusing to settle is safe and paying a winner less than he staked
 *     is not.
 *
 *  2. OUTCOME-NEUTRAL. `poolFee` reads the two pool numbers and nothing else. It
 *     cannot see the outcome, so it is byte-identical for a YES win and a NO win
 *     on the same final pools. The pari-mutuel licence rests on this
 *     (docs/F6-LIQUIDITY-DESIGN.md §3.1) — do not pass an outcome into it.
 *
 *  3. NO MINT / NO LEAK. sum(payouts) + fee == pool, to rounding dust.
 *
 *  4. BALANCED POLL. yesPool == noPool -> fee == commissionRate * pool exactly
 *     (the ceiling is slack: a third of half the pool > a tenth of the pool).
 *
 *  5. ONE-SIDED. smaller == 0 -> fee == 0 -> everybody is refunded. This now falls
 *     out of the maths; settlement keeps an explicit branch only for audit clarity.
 *
 * Taxes (TRA/GBT) come out of OUR fee, never out of the player — see `levySplit`.
 */

// ── Rates ───────────────────────────────────────────────────────────────────
// Cold-start fallbacks only. The live values are RateConfig (admin-tunable,
// persisted in SystemConfig) and, for a poll that already exists, the immutable
// `feeSnapshot` stamped on it at creation. Never read these constants in a money
// path — read the snapshot.

/** Our cut, as a share of the whole pool. */
export const DEFAULT_COMMISSION_RATE = 0.10;
/** The fee can never exceed this share of the SMALLER side. A third. */
export const DEFAULT_FEE_CEILING_RATE = 1 / 3;
/** Early exit after the grace window; goes to the house. */
export const DEFAULT_CASHOUT_FEE_RATE = 0.10;
/** Minutes after placing a bet during which an exit is FREE (full refund). */
export const DEFAULT_FREE_EXIT_GRACE_MINUTES = 5;
/**
 * Minutes AFTER the free window during which an exit is allowed but charged
 * `cashOutFeeRate`. After free + paid, the exit is LOCKED and the position rides
 * to settlement.
 *
 * This is the timer that kills the "watch it lose, then bail" attack. A real-world
 * event resolves hours/days after the bet, so by the time a player could know the
 * outcome, their exit window (free + paid = 20 min by default) has long closed. No
 * late exit → no way to gut a winner's prize or void a poll you're losing.
 */
export const DEFAULT_PAID_EXIT_WINDOW_MINUTES = 15;
/** Charged to the player on withdrawal. */
export const DEFAULT_WITHDRAWAL_FEE_RATE = 0.01;
/** The slice of the withdrawal fee that goes to the payment gateway. */
export const DEFAULT_WITHDRAWAL_GATEWAY_SHARE_RATE = 0.005;
/** Of OUR fee, to TRA. */
export const DEFAULT_TRA_TAX_ON_COMMISSION_RATE = 0.10;
/** Of OUR fee, to GBT. */
export const DEFAULT_GBT_LEVY_ON_COMMISSION_RATE = 0.05;
/** Warn "thin upside" below this payout/stake ratio. */
export const THIN_PROFIT_RATIO = 1.05;

// ── Admin bounds ────────────────────────────────────────────────────────────

export const MAX_COMMISSION_RATE = 0.30;
/**
 * The ceiling may not exceed 100% of the smaller side. This is the ONE bound that
 * invariant 1 actually depends on: at exactly 100% a winner on a thin poll breaks
 * even (profits nothing), and above it he would lose. It is a hard stop, not a
 * preference.
 */
export const MAX_FEE_CEILING_RATE = 1.0;
/**
 * Warn (do not block) above a half: at a ceiling of one half we take exactly as
 * much as all the winners combined, and above it we take more than they do.
 */
export const FEE_CEILING_WARN_ABOVE = 0.50;

// ── Types ───────────────────────────────────────────────────────────────────

export type Side = "YES" | "NO";

/**
 * `negative` is GONE. A winning position can no longer be paid below its stake,
 * so the level that meant "you won but you lost money" is now unreachable. It was
 * deleted from the union deliberately so the compiler finds every consumer.
 */
export type LeanLevel = "fair" | "thin";

/** The two rates the fee is made of. Everything money-side takes exactly this. */
export interface FeeRates {
  commissionRate: number;
  feeCeilingRate: number;
}

/**
 * The rates frozen onto a poll at creation, so that retuning admin config can
 * never reprice a bet that has already been placed. Settlement, cash-out and
 * every payout preview read THIS, never the live config.
 * Stored as `PredictionMarket.feeSnapshot` (Json).
 */
export interface FeeSnapshot extends FeeRates {
  cashOutFeeRate: number;
  freeExitGraceMinutes: number;
  /** Minutes of paid (10%) exit AFTER the free window. Then exit locks. */
  paidExitWindowMinutes: number;
  traTaxOnCommissionRate: number;
  gbtLevyOnCommissionRate: number;
  thinProfitRatio: number;
  /** Schema version of this snapshot — bump if the shape ever changes. */
  v: 1;
  /** ISO timestamp the snapshot was stamped. Audit only; never read by the math. */
  stampedAt: string;
}

/**
 * The subset of a poll's frozen rates the CLIENT needs: enough to project a
 * payout, categorise the lean, and state the early-exit terms honestly.
 *
 * Threaded from the server (`market.feeSnapshot`) into the dial / confirm modal /
 * sell modal, so every number and every sentence those surfaces show is the
 * poll's own — not a hardcoded "9%" that starts lying the moment admin retunes.
 */
export type PollRates = Pick<
  FeeSnapshot,
  "commissionRate" | "feeCeilingRate" | "cashOutFeeRate" | "freeExitGraceMinutes" | "paidExitWindowMinutes" | "thinProfitRatio"
>;

export interface FeeBreakdown {
  /** yesPool + noPool. */
  pool: number;
  /** min(yesPool, noPool) — the prize. */
  smaller: number;
  /** max(yesPool, noPool). */
  larger: number;
  /** commissionRate * pool — what we'd take with no ceiling. */
  commission: number;
  /** feeCeilingRate * smaller — the most we are ever allowed to take. */
  ceiling: number;
  /** min(commission, ceiling) — what we actually take. */
  fee: number;
  /** pool - fee — what is shared out among the winners. */
  netPool: number;
  /** True when the ceiling bound (the poll is lopsided enough that 10% would bite the winners). */
  capped: boolean;
  /** Our fee as a share of the LOSERS' money — the honest "house take". Caps at feeCeilingRate. */
  shareOfLosers: number;
}

export interface PayoutResult {
  /** TZS, rounded. Includes return of stake. */
  payout: number;
  /** payout - stake. */
  net: number;
  /** This position's share of the winning pool. */
  share: number;
  /** payout / stake. Guaranteed >= 1 for a winner (invariant 1). */
  ratio: number;
  /** The fee maths this payout came out of — for disclosure UI and the ledger. */
  fee: FeeBreakdown;
}

export interface LevySplit {
  /** The whole fee we charged. */
  fee: number;
  /** traTaxOnCommissionRate * fee -> TRA. */
  traLevy: number;
  /** gbtLevyOnCommissionRate * fee -> GBT. */
  gbtLevy: number;
  /** What the operator actually keeps. */
  operatorNet: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number): number =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

/** Defensive read of the two rates. A NaN/absent rate must never become a big fee. */
function readRates(rates: Partial<FeeRates> | undefined): FeeRates {
  return {
    commissionRate: clamp(rates?.commissionRate ?? DEFAULT_COMMISSION_RATE, 0, 1),
    feeCeilingRate: clamp(rates?.feeCeilingRate ?? DEFAULT_FEE_CEILING_RATE, 0, MAX_FEE_CEILING_RATE),
  };
}

// ── THE FEE ─────────────────────────────────────────────────────────────────

/**
 * The commission on a pool. Outcome-neutral by construction: it takes the two
 * pool sizes and nothing else — there is no outcome parameter and there must
 * never be one (invariant 2).
 *
 * Note `feeCeilingRate` is clamped to <= 100% here as well as in admin
 * validation. Two locks on the one thing invariant 1 depends on.
 */
export function poolFee(yesPool: number, noPool: number, rates: Partial<FeeRates>): FeeBreakdown {
  const { commissionRate, feeCeilingRate } = readRates(rates);
  const yes = Math.max(0, yesPool);
  const no = Math.max(0, noPool);
  const pool = yes + no;
  const smaller = Math.min(yes, no);
  const larger = Math.max(yes, no);

  const commission = commissionRate * pool;
  const ceiling = feeCeilingRate * smaller;
  const fee = Math.min(commission, ceiling);

  return {
    pool,
    smaller,
    larger,
    commission,
    ceiling,
    fee,
    netPool: pool - fee,
    capped: ceiling < commission,
    shareOfLosers: smaller > 0 ? fee / smaller : 0,
  };
}

/**
 * The withdrawal fee a player is charged: `round(amount * rate)`, floored at 0.
 * Isomorphic — the confirm modal (client) and wallet-service (server) both call
 * this, so what the player is shown before confirming equals what leaves the
 * wallet, to the shilling (audit H12). `net = amount - fee`.
 */
export function computeWithdrawalFee(amount: number, rate: number): number {
  return Math.max(0, Math.round(amount * Math.max(0, rate)));
}

/**
 * Invariant 1, enforced. Throws rather than paying a winner less than he staked.
 *
 * Refusing to settle is the safe direction: the pool stays intact, the market
 * stays OPEN, an officer sees the failure. Paying the winner 93,150 on a 100,000
 * stake — the bug this whole change exists to kill — is not recoverable, because
 * by the time anyone notices, the money is gone.
 */
export function assertWinnerFloor(payout: number, stake: number, ctx: string): void {
  if (stake > 0 && payout < stake) {
    throw new Error(
      `[payout] WINNER FLOOR BREACHED (${ctx}): a WIN position staked ${stake} would be paid ${payout}. ` +
        `This must be impossible — fee <= feeCeilingRate * smallerSide guarantees payout >= stake for any ` +
        `commissionRate, provided feeCeilingRate <= 1. Refusing to settle. Check the poll's feeSnapshot.`,
    );
  }
}

// ── Payouts ─────────────────────────────────────────────────────────────────

/**
 * SETTLEMENT payout. The pools are final and ALREADY CONTAIN this position's
 * stake. This is the function that moves money, and every projection/disclosure
 * surface must route through it (or `projectedPayout`, which just adds the stake
 * and calls it) so that what we tell a player equals what we pay him, exactly.
 */
export function settledPayoutFor(
  opts: { yesPool: number; noPool: number; side: Side; stake: number },
  rates: Partial<FeeRates>,
): PayoutResult {
  const fee = poolFee(opts.yesPool, opts.noPool, rates);
  const winningPool = opts.side === "YES" ? opts.yesPool : opts.noPool;

  if (winningPool <= 0 || opts.stake <= 0) {
    return { payout: 0, net: 0, share: 0, ratio: 0, fee };
  }

  const share = opts.stake / winningPool;
  const payout = Math.max(0, Math.round(share * fee.netPool));

  assertWinnerFloor(payout, opts.stake, `pools ${opts.yesPool}/${opts.noPool}, side ${opts.side}`);

  return {
    payout,
    net: payout - opts.stake,
    share,
    ratio: payout / opts.stake,
    fee,
  };
}

/**
 * PROJECTION for a bet not yet placed: the stake is added to the chosen side
 * first, then the settlement function runs on the resulting pools. Same maths,
 * one code path — a projection that used its own formula is how the old code
 * ended up quoting one number and paying another.
 */
export function payoutFor(
  opts: { yesPool: number; noPool: number; side: Side; stake: number },
  rates: Partial<FeeRates>,
): PayoutResult {
  return settledPayoutFor(
    {
      yesPool: opts.side === "YES" ? opts.yesPool + opts.stake : opts.yesPool,
      noPool: opts.side === "NO" ? opts.noPool + opts.stake : opts.noPool,
      side: opts.side,
      stake: opts.stake,
    },
    rates,
  );
}

/**
 * Categorise the payout/stake ratio for the inline notice.
 *
 * There is no `negative` any more — the honest message on a lopsided poll is
 * "your upside is thin because the other side is small", NEVER "you may lose".
 */
export function leanFor(ratio: number, thinRatio: number = THIN_PROFIT_RATIO): LeanLevel {
  return ratio < thinRatio ? "thin" : "fair";
}

// ── Taxes — out of OUR fee, never the player's payout ────────────────────────

/**
 * TRA + GBT levies. These are charged on the COMMISSION WE EARNED and are
 * invisible to the player: his payout is `netPool * share` whether or not we owe
 * a levy on our own cut. Applies identically to a settlement fee and a cash-out
 * fee.
 */
export function levySplit(
  fee: number,
  rates: { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number },
): LevySplit {
  const f = Math.max(0, Math.round(fee));
  const traLevy = Math.round(f * clamp(rates.traTaxOnCommissionRate, 0, 1));
  const gbtLevy = Math.round(f * clamp(rates.gbtLevyOnCommissionRate, 0, 1));
  return { fee: f, traLevy, gbtLevy, operatorNet: f - traLevy - gbtLevy };
}

// ── Admin guardrail ─────────────────────────────────────────────────────────

/**
 * The worst payout/stake ratio any winner could suffer under these rates, swept
 * across the whole lean range. Used by the admin config simulator to refuse a
 * save that could pay a winner below his stake.
 *
 * The minimum sits where the winning side is the BIGGER one and the poll is at
 * its most lopsided, so it approaches `1 + (2/3)*L/W` as L/W -> 0 — i.e. it tends
 * to 1 from ABOVE and never crosses it. We sweep numerically anyway rather than
 * trusting the algebra, because this is the check that stops a bad config
 * reaching production.
 */
export function worstCaseWinnerRatio(rates: Partial<FeeRates>): { ratio: number; atYes: number; atNo: number } {
  const POOL = 1_000_000;
  let worst = Number.POSITIVE_INFINITY;
  let atYes = POOL / 2;
  let atNo = POOL / 2;

  // Sweep the lean from 50/50 to 99.9/0.1, both directions, and take the floor.
  for (let i = 500; i <= 999; i++) {
    const yes = (POOL * i) / 1000;
    const no = POOL - yes;
    for (const side of ["YES", "NO"] as const) {
      const winningPool = side === "YES" ? yes : no;
      if (winningPool <= 0) continue;
      const { netPool } = poolFee(yes, no, rates);
      const ratio = netPool / winningPool; // stake-independent
      if (ratio < worst) {
        worst = ratio;
        atYes = yes;
        atNo = no;
      }
    }
  }
  return { ratio: Number.isFinite(worst) ? worst : 1, atYes, atNo };
}
