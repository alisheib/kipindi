/**
 * MASWALI MILLIONEA — THE WEEK'S ARITHMETIC (MASWALI-BUILD S2; MASWALI-PLAN §3 MR-20…MR-26, §5).
 *
 * Pure and isomorphic: whole shillings in, whole shillings out, no clock, no config read. The caller passes the week's
 * FROZEN figures (the floor and the fee rate from its snapshots; the levy rates from its `feeSnapshot`), so a config
 * change can never re-price a week that already opened.
 *
 *   S = the week's live sales · R = the carry it claims · k = its winning tickets
 *   k = 0 → no fee, no top-up; S rolls to the jackpot, R stays (MR-21)
 *   k ≥ 1 → J = max(floor, R + S); F = round(rate × J); (TRA, GBT, net) = levySplit(F) once;
 *           share = ⌊(J − F) / k⌋; U = max(0, F + k·share − (R + S)); carryOut = R + S + U − F − k·share
 *
 * ⭐ EVERY IDENTITY IS ASSERTED HERE, BEFORE A FIGURE LEAVES (MR-26): S + R + U = F + k·share + carryOut;
 *    F = TRA + GBT + net; U = 0 when k = 0; carryOut = 0 whenever U > 0 (house money never carries forward). A figure that
 *    breaks one throws — `ledger.ts → maswaliSettlementEntries` re-checks the same identities on the booked lines.
 * ⛔ NO WINNER FLOOR (OD-19): a share may be below a ticket's price when k is large. Millionea is exempt from Invariant 1,
 *    and nothing here may "fix" a small share.
 */
import { levySplit } from "@/lib/payout";

export type LevyRates = { traTaxOnCommissionRate: number; gbtLevyOnCommissionRate: number };

export type WeekArithmetic =
  | {
      kind: "ROLLOVER";
      k: 0;
      /** The whole of S, to the jackpot. */
      rolled: number;
      /** The jackpot after this week: R + S. */
      jackpotAfter: number;
    }
  | {
      kind: "PAYOUT";
      k: number;
      J: number;
      F: number;
      tra: number;
      gbt: number;
      net: number;
      share: number;
      /** k × share — what the winners are paid in all. */
      paid: number;
      U: number;
      /** The rounding left after k equal shares, (J − F) − k·share; always < k. */
      dust: number;
      /** What goes back to the jackpot: the dust when the week needed no top-up, 0 when it did (U already excludes it). */
      carryOut: number;
      /** The jackpot after this week: carryOut. */
      jackpotAfter: number;
    };

const whole = (v: number, what: string) => {
  if (!Number.isSafeInteger(v) || v < 0) throw new Error(`[maswali-money] ${what} must be a whole non-negative TZS amount, got ${v}`);
  return v;
};

/** ⭐ MR-20…MR-25 for one week. Throws on any input that is not whole shillings, and on any identity that fails. */
export function settleArithmetic(input: {
  /** R — the carry this week claims. */
  rolloverIn: number;
  /** S — the week's live sales (cancelled tickets excluded). */
  sales: number;
  /** k — the winning tickets (10 of 10). */
  winners: number;
  /** The week's frozen floor. */
  floor: number;
  /** The week's frozen fee share of J (0.13). */
  feeRate: number;
  /** The week's frozen levy rates. */
  rates: LevyRates;
}): WeekArithmetic {
  const R = whole(input.rolloverIn, "R"), S = whole(input.sales, "S"), floor = whole(input.floor, "the floor");
  const k = input.winners;
  if (!Number.isSafeInteger(k) || k < 0) throw new Error(`[maswali-money] k must be a whole number of tickets, got ${k}`);
  if (typeof input.feeRate !== "number" || !Number.isFinite(input.feeRate) || input.feeRate < 0 || input.feeRate >= 1) {
    throw new Error(`[maswali-money] the fee rate must be in [0, 1), got ${input.feeRate}`);
  }
  if (k === 0) return { kind: "ROLLOVER", k: 0, rolled: S, jackpotAfter: R + S };

  const J = Math.max(floor, R + S);
  const F = Math.round(input.feeRate * J);
  const lv = levySplit(F, input.rates);
  const share = Math.floor((J - F) / k);
  const paid = k * share;
  const U = Math.max(0, F + paid - (R + S));
  const carryOut = R + S + U - F - paid;
  const dust = J - F - paid;

  // MR-26 — every identity, before a figure leaves.
  if (lv.fee !== F || lv.traLevy + lv.gbtLevy + lv.operatorNet !== F) throw new Error(`[maswali-money] the levy split of ${F} does not add up`);
  if (S + R + U !== F + paid + carryOut) throw new Error(`[maswali-money] the week does not close: ${S} + ${R} + ${U} ≠ ${F} + ${paid} + ${carryOut}`);
  if (carryOut < 0) throw new Error(`[maswali-money] a negative carry (${carryOut}) means the arithmetic is wrong`);
  if (U > 0 && carryOut !== 0) throw new Error(`[maswali-money] a topped-up week carries nothing forward, got ${carryOut}`);
  if (dust < 0 || dust >= k) throw new Error(`[maswali-money] the dust ${dust} must be in [0, k)`);
  if (J < floor) throw new Error(`[maswali-money] the jackpot ${J} is below its floor ${floor}`);

  return { kind: "PAYOUT", k, J, F, tra: lv.traLevy, gbt: lv.gbtLevy, net: lv.operatorNet, share, paid, U, dust, carryOut, jackpotAfter: carryOut };
}

/**
 * ⭐ OD-02 · how much guarantee must be held before a week may open: Σ max(0, floor − confirmed carry-in) over EVERY
 * unsettled week, the new one included. A week whose carry is not yet confirmed (its predecessor unsettled) counts its
 * whole floor — the guarantee covers the worst case, never the hoped-for one.
 */
export function guaranteeRequirement(unsettledWeeks: ReadonlyArray<{ floor: number; confirmedCarryIn: number | null }>): number {
  let need = 0;
  for (const w of unsettledWeeks) {
    const floor = whole(w.floor, "a week's floor");
    const carry = w.confirmedCarryIn === null ? 0 : whole(w.confirmedCarryIn, "a confirmed carry");
    need += Math.max(0, floor - carry);
  }
  return need;
}
