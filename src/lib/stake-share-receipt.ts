/**
 * ⭐ WHAT A STAKE-SHARE RESULT READS AS — the figures every surface states about one, taken from the records settlement
 * wrote (programme FEE-TAX-2026-10, release R3 lane b; `docs/FEE-TAX-PLAN.md` §3).
 *
 * Under `stake-share` a winner is paid its NET stake (its stake less its own fee) plus its share of the prize after the
 * winnings tax. Settlement writes the parts once each, in the winner's own transaction (`market-service.ts → settleMarket`):
 *   · `Position.feeTzs`                                   — the stake's own fee (its share of its side's fee);
 *   · `Position.winningsTaxTzs` = `BET_PAYOUT.taxWithheld` — the winnings tax withheld for TRA;
 *   · `Position.finalPayout`    = `BET_PAYOUT.amount`      — the NET credited.
 * The gross winnings are DERIVED from those and the stake — paid − (stake − fee) + tax — never re-priced from a rate, so a
 * receipt can never state a figure the books do not hold. Read as one column, it adds up by eye:
 *
 *     stake − our fee + your winnings − winnings tax = paid
 *     10,000 − 1,300 + 8,700 − 1,305 = 16,095       a balanced 10,000 against 10,000
 *     100,000 − 13,000 + 8,700 − 1,305 = 94,395     100,000 against 10,000 — paid BELOW the stake (ruling 1)
 *
 * ⛔ A WIN PAID BELOW ITS STAKE IS NEVER WORDED AS A GAIN. Its side won and less than the stake came back, so every surface
 * that states it — the bell, the e-mail, the digest, the wallet, the ticket, the celebration, the share card — asks
 * `belowStake` / `isBelowStakeWin` and says "returned X of your Y stake" in a neutral ink: never "You won … +", never gold,
 * never a seal, never a public "Won on 50pick" card. Under the two older pool models the winner floor
 * (`assertWinnerFloor`) makes it unreachable, so every market frozen under them reads exactly as it always has.
 *
 * Pure and isomorphic — the wallet, the ticket and the Up & Down card read it in the browser, the notices on the server —
 * so it imports nothing but `payout.ts`'s arithmetic. `test:stake-share-receipts` drives every function below against a
 * real settlement.
 */
import {
  chargedFee, roundHalfUpBp, stakeFeeBp, stakeSharePct, winningsTaxPct,
  type FeeRates, type Side,
} from "./payout";

/** A whole, non-negative, exactly representable number of shillings — what every record under this model holds. */
const isWhole = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

// ── One winner ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The records one settled winner carries — a position's, or its payout row's with the position's stake and fee. */
export interface StakeShareWinRecord {
  /** `Position.stake` — the gross stake. */
  stake: number;
  /** `Position.feeTzs` — the stake's own fee. NULL/absent on every older model's row, which therefore reads as itself. */
  fee: number | null | undefined;
  /** `Position.winningsTaxTzs` or `BET_PAYOUT.taxWithheld` — the tax withheld (absent reads as 0). */
  tax: number | null | undefined;
  /** `Position.finalPayout` or `BET_PAYOUT.amount` — the NET credited. */
  paid: number;
}

/** A settled stake-share win, part by part, in whole shillings. */
export interface StakeShareWinReceipt {
  stake: number;
  /** Our fee on this stake. */
  fee: number;
  /** stake − fee: what came back of the stake itself. */
  netStake: number;
  /** Its share of the losing side's net stakes BEFORE the tax: paid − netStake + tax. */
  grossWinnings: number;
  /** The winnings tax withheld from it for TRA. */
  tax: number;
  /** What was credited: netStake + grossWinnings − tax. */
  paid: number;
  /** paid − stake: the money result of the bet — NEGATIVE on a win paid below its stake. */
  net: number;
  /** paid < stake (ruling 1): the side won and less than the stake came back. Never worded as a gain. */
  belowStake: boolean;
}

/**
 * A settled winner's parts, or `null` when the record is not a stake-share winner's — no `fee` on it (every older model's
 * row, every refund) — or does not hold together: a figure that is not whole shillings, a fee above the stake, or a payout
 * under the net stake (the split's own floor, `assertNetStakeFloor`). ⛔ A record that cannot be read is NOT re-derived
 * from a rate here: the caller says less ("show nothing rather than guess", AGENTS.md §6).
 */
export function stakeShareWinReceipt(r: StakeShareWinRecord): StakeShareWinReceipt | null {
  if (r.fee == null) return null;
  const tax = r.tax ?? 0;
  if (!isWhole(r.stake) || r.stake === 0 || !isWhole(r.fee) || !isWhole(tax) || !isWhole(r.paid)) return null;
  const netStake = r.stake - r.fee;
  if (netStake < 0 || r.paid < netStake) return null;
  return {
    stake: r.stake, fee: r.fee, netStake, grossWinnings: r.paid - netStake + tax, tax, paid: r.paid,
    net: r.paid - r.stake, belowStake: r.paid < r.stake,
  };
}

/**
 * ⛔ THE ONE BELOW-STAKE PREDICATE — a settled WIN that returned LESS than its stake (ruling 1). Every surface that would
 * otherwise celebrate a win asks this and words the result as returned, never won. Reachable only under `stake-share`: the
 * older models' winner floor holds payout ≥ stake for every market frozen under them. A malformed figure is not "below".
 */
export function isBelowStakeWin(paid: number | null | undefined, stake: number): boolean {
  return typeof paid === "number" && Number.isFinite(paid) && Number.isFinite(stake) && stake > 0 && paid >= 0 && paid < stake;
}

// ── One bet, at entry ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What a stake-share bet receipt states at entry: our fee on this stake — round-half-up of the frozen rate, the per-stake
 * figure of `docs/FEE-TAX-PLAN.md` §3 — and the rest, its stake in the pool. `null` under every other model.
 * ⚠️ Settlement rounds each SIDE's fee once and shares it by largest remainder, so the fee a position finally carries can
 * differ from this by one shilling; the receipt says the share is settled to the shilling with the other stakes.
 */
export function stakeShareEntryFee(stake: number, rates: Partial<FeeRates>): { fee: number; net: number; feePct: number; taxPct: number | null } | null {
  try {
    const bp = stakeFeeBp(rates);
    const feePct = stakeSharePct(rates);
    if (bp === null || feePct === null || !isWhole(stake) || stake === 0) return null;
    const fee = roundHalfUpBp(stake, bp);
    return { fee, net: stake - fee, feePct, taxPct: winningsTaxPct(rates) };
  } catch {
    return null;
  }
}

// ── One market ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A settled stake-share market's figures, as its public resolution panel states them. Whole shillings. */
export interface StakeShareMarketFigures {
  /** F — our fee on every stake, both sides. */
  fee: number;
  feeYes: number;
  feeNo: number;
  /** P — the losing side's stakes after their fee: the prize fund, before the tax. */
  prizeFund: number;
  /** T — the winnings tax withheld from the prize fund for TRA. */
  winningsTax: number;
  /** pool − F − T — what the winners were paid (their net stakes back plus the prize after tax). */
  paidToWinners: number;
  /** The frozen rates as copy prints them (13 · 15). */
  feePct: number;
  taxPct: number;
}

/**
 * The market's figures under its FROZEN model — `chargedFee`, the reader that mirrors settlement branch for branch (so a
 * void or a one-sided market, refunded in full at no fee, answers `null` here and the panel says "refunded"). `null` under
 * every other model, and when the market's rates cannot be read: a panel that cannot stand behind a figure prints none.
 */
export function stakeShareMarketFigures(
  m: { yesPool: number; noPool: number; resolvedOutcome: Side | "VOID"; productLine?: string | null },
  rates: Partial<FeeRates>,
): StakeShareMarketFigures | null {
  try {
    // Stake-share's own fee rate, or null under every other model (`stakeFeeBp`) — never a model guessed from a field.
    if (stakeFeeBp(rates) === null) return null;
    const c = chargedFee({ yesPool: m.yesPool, noPool: m.noPool, resolvedOutcome: m.resolvedOutcome, productLine: m.productLine ?? null }, rates);
    if (c.refunded || c.winningsTax === undefined || c.prizeFund === undefined) return null;
    const feePct = stakeSharePct(rates);
    const taxPct = winningsTaxPct(rates);
    if (feePct === null || taxPct === null) return null;
    const yes = Math.max(0, m.yesPool), no = Math.max(0, m.noPool);
    const bp = stakeFeeBp(rates) ?? 0;
    return {
      fee: c.fee, feeYes: roundHalfUpBp(yes, bp), feeNo: roundHalfUpBp(no, bp), prizeFund: c.prizeFund,
      winningsTax: c.winningsTax, paidToWinners: c.netPool, feePct, taxPct,
    };
  } catch {
    return null;
  }
}

/** What the positions' own records add up to, beside the market's arithmetic — the officer's check of a settled market. */
export interface StakeShareBooked {
  /** Σ `feeTzs` over every settled winner and loser. */
  feeBooked: number;
  /** Σ `winningsTaxTzs` over the winners. */
  taxBooked: number;
  /** Σ `finalPayout` over the winners. */
  paidBooked: number;
  /** Winners and losers that carry their parts. */
  positions: number;
  /** Settled WIN / LOSS rows with no `feeTzs` — a stake-share settlement always writes one, so any here is a fault. */
  missing: number;
  /** The three sums equal the arithmetic's F, T and pool − F − T, and nothing is missing. */
  agrees: boolean;
}

/**
 * The positions' booked parts summed and held against `figures` (the same market's `stakeShareMarketFigures`).
 * Only WIN and LOSS rows are summed: a cashed-out or refunded stake left the pool before settlement and carries no parts.
 */
export function stakeShareBooked(
  positions: ReadonlyArray<{ status: string; finalPayout?: number | null; feeTzs?: number | null; winningsTaxTzs?: number | null }>,
  figures: StakeShareMarketFigures,
): StakeShareBooked {
  let feeBooked = 0, taxBooked = 0, paidBooked = 0, counted = 0, missing = 0;
  for (const p of positions) {
    if (p.status !== "WIN" && p.status !== "LOSS") continue;
    if (p.feeTzs == null) { missing++; continue; }
    counted++;
    feeBooked += p.feeTzs;
    if (p.status === "WIN") { taxBooked += p.winningsTaxTzs ?? 0; paidBooked += p.finalPayout ?? 0; }
  }
  return {
    feeBooked, taxBooked, paidBooked, positions: counted, missing,
    agrees: missing === 0 && feeBooked === figures.fee && taxBooked === figures.winningsTax && paidBooked === figures.paidToWinners,
  };
}
