/**
 * THE HOUSE BOOK — what the platform holds, what is actually the owner's, and what each
 * game contributed. The arithmetic only; the reading of it lives in `/admin/house`.
 *
 * ── WHY THIS MODULE IS PURE ───────────────────────────────────────────────────────────
 *
 * ⛔ NO PRISMA, NO REACT, NO DOM, NO CLOCK. Every input arrives as an argument, for the same
 * reason `outcome-announcement.ts` is pure and states it: a guard can then CALL this and
 * assert what it RETURNS. These are money decisions, and a suite that greps the source for
 * the word `levy` proves nothing about which way the sign went. §5b — assert the value, not
 * the symbol.
 *
 * ═══ THE ONE FACT THIS WHOLE FILE EXISTS TO GET RIGHT ═════════════════════════════════
 *
 * 🔴 **`HOUSE:COMMISSION` IS ALREADY NET OF THE LEVIES.** Read `ledger.ts` →
 * `settlementPayoutEntries` and `cashoutEntries`: the commission account is credited the
 * fee, and then the TRA and GBT levies are **debited straight back out of it** —
 *
 *     { account: acct.commission, entryType: "SETTLEMENT_COMMISSION", amount: +commAmt }
 *     { account: acct.commission, entryType: "SETTLEMENT_TRA_LEVY",   amount: -traLevyAmt }
 *     { account: acct.traLevy,    entryType: "SETTLEMENT_TRA_LEVY",   amount: +traLevyAmt }
 *
 * ⛔ **SO `netRetained = commission`, FULL STOP. Writing `commission − levies` SUBTRACTS THEM
 * TWICE** and understates the owner's money by the whole levy — on a page whose only job is
 * to state that number correctly. It is the most natural-looking line anyone will write here,
 * it reads as obviously right, and it is wrong. `test:house-book` §2 and the RED anchor
 * `double-subtract-levies` exist for this single line.
 *
 * ⛔ **AND `HOUSE:AGGREGATOR` WAS NEVER INSIDE COMMISSION EITHER.** The gateway's share is
 * credited directly to its own account from the withdrawal fee (`withdrawalEntries`), so
 * subtracting it from commission is the same error a second time.
 *
 * ⭐ The levies and the aggregator share are therefore **not deductions from our revenue —
 * they are balances we HOLD AND OWE.** They reduce free cash, never net retained.
 *
 * @see docs/SESSION-PROMPT-HOUSE-LEDGER.md · docs/DESIGN_AUTHORITY.md
 */

/** Where a figure came from. ⛔ Mirrors `selcom-statement.ts`: a number and its provenance
 *  travel together so a ledger total cannot be rendered under a rail heading. */
export type BookSource = "ledger" | "rail";

/**
 * House account balances, read straight off `LedgerEntry` with no arithmetic applied.
 *
 * ⚠️ `commission` is the account's BALANCE — already net of levies (see the header). Do not
 * pre-adjust it before passing it in; this module is the only place that reasons about it.
 */
export type HouseAccounts = {
  /** `HOUSE:COMMISSION` — our fee, ALREADY net of TRA and GBT. */
  commission: number;
  /** `HOUSE:TRA_LEVY` — held, owed to TRA. */
  traLevy: number;
  /** `HOUSE:GBT_LEVY` — held, owed to GBT. */
  gbtLevy: number;
  /** `HOUSE:AGGREGATOR` — held, owed to the payment gateway. Never ours. */
  aggregator: number;
};

export type HousePosition = {
  /** ⭐ What the owner actually keeps. Equals `commission` — see the header. */
  netRetained: number;
  /** What the fee was before the levies came out of it. Presentation only. */
  grossFeeEarned: number;
  /** Held and owed to TRA + GBT. ⛔ Ali's ruling 2026-09-04: a LIABILITY. */
  leviesPayable: number;
  /** Held and owed to the gateway. */
  aggregatorPayable: number;
  /** Owed to players — Σ ACTIVE wallet balance + hold. */
  playerLiability: number;
  /** ⭐ The solvency line: custodial cash minus everything owed to somebody else. */
  freeHouseCash: number;
  source: BookSource;
};

/**
 * The balance sheet at an instant.
 *
 * ⭐ **THE SOLVENCY LINE IS THE POINT OF THIS FUNCTION.** Gross float is not profit. A
 * platform holding 100M of which 92M is player balances and 3M is unremitted levies has 5M,
 * and an owner shown "100M" makes decisions that insolvency is built from. Every claim on
 * the cash is subtracted here, explicitly, so no caller can present a gross figure as the
 * owner's money.
 *
 * ⚠️ `custodialCash` is an INPUT, not something this module can derive. The DAL must pass the
 * ledger's view of cash actually held. ⛔ It is NOT the Selcom rail balance — that is the
 * disbursement float alone, deposits never touch it, and the two are never summed (§1e of the
 * brief). Anything sourced from the rail keeps `source: "rail"` and is rendered separately.
 */
export function housePosition(input: {
  accounts: HouseAccounts;
  playerLiability: number;
  custodialCash: number;
}): HousePosition {
  const { commission, traLevy, gbtLevy, aggregator } = input.accounts;
  const leviesPayable = traLevy + gbtLevy;

  return {
    // ⛔ NOT `commission - leviesPayable`. See the header: the levies are already out.
    netRetained: commission,
    // The gross is RECONSTRUCTED by adding the levies back — the inverse of the booking.
    grossFeeEarned: commission + leviesPayable,
    leviesPayable,
    aggregatorPayable: aggregator,
    playerLiability: input.playerLiability,
    freeHouseCash: input.custodialCash - input.playerLiability - leviesPayable - aggregator,
    source: "ledger",
  };
}

/** One settled game's contribution, summed from that game's own ledger rows. */
export type GameBookInput = {
  marketId: string;
  /** `VOID` books no fee and MUST still be listed — a missing row reads as data loss. */
  outcome: "YES" | "NO" | "VOID";
  /** Σ `STAKE_DEBIT` for this market. */
  poolIn: number;
  /** Σ `PAYOUT_CREDIT` + `REFUND` credited to players. */
  paidOut: number;
  /** Σ `SETTLEMENT_COMMISSION` + `CASHOUT_FEE` booked against this market. GROSS. */
  feeBooked: number;
  /** Σ `SETTLEMENT_TRA_LEVY` + `SETTLEMENT_GBT_LEVY` credited to the levy accounts. */
  leviesBooked: number;
};

export type GameBook = GameBookInput & {
  /** ⭐ What this game left the owner: gross fee minus the levies it generated. */
  netRetained: number;
  /** ⚠️ `true` for a VOID — refunded, no fee. Rendered as `VOID · no fee`, never filtered. */
  noFee: boolean;
};

/**
 * Close one game's book.
 *
 * ⚠️ NOTE THE ASYMMETRY WITH `housePosition`, AND IT IS NOT AN INCONSISTENCY. There,
 * `commission` is an ACCOUNT BALANCE that the levy debits have already reduced. Here,
 * `feeBooked` is the sum of the POSITIVE fee entries only, so the levies for this game have
 * NOT been taken out of it and must be. Same money, two different reads of the ledger — which
 * is exactly why both live in one file with the difference written down rather than being
 * rediscovered at two call sites.
 */
export function gameBook(g: GameBookInput): GameBook {
  return {
    ...g,
    netRetained: g.feeBooked - g.leviesBooked,
    noFee: g.outcome === "VOID" || g.feeBooked === 0,
  };
}

export type Waterfall = {
  handle: number;
  winningsPaid: number;
  ggr: number;
  feeEarned: number;
  leviesOut: number;
  aggregatorOut: number;
  bonusCost: number;
  netRetained: number;
};

/**
 * The earnings waterfall — the shape of "what did we make".
 *
 * ⛔ EVERY STEP IS A BOOKED LEDGER SUM. Nothing here is recomputed from a rate: that is the
 * defect this page exists not to inherit (`settlementFeesByPoll` recomputes and can therefore
 * report revenue the books never recorded).
 *
 * ⚠️ `bonusCost` is REAL MONEY OUT and is its own labelled step — ⛔ never silently netted
 * into GGR, where it would quietly flatter the gaming result.
 */
export function waterfall(input: {
  handle: number;
  winningsPaid: number;
  feeEarned: number;
  leviesOut: number;
  aggregatorOut: number;
  bonusCost: number;
}): Waterfall {
  const ggr = input.handle - input.winningsPaid;
  return {
    ...input,
    ggr,
    netRetained: input.feeEarned - input.leviesOut - input.aggregatorOut - input.bonusCost,
  };
}

export type Reconciliation = {
  booked: number;
  computed: number;
  variance: number;
  /** ⛔ `true` only at EXACTLY zero. See below. */
  clean: boolean;
};

/**
 * Booked against recomputed — the check that keeps this page honest.
 *
 * ⭐ **THE LEDGER IS THE TRUTH AND THE RECOMPUTE IS A CHECK.** The two agree only while the
 * fee formula, its rounding and the snapshot fallback all still agree with what the
 * settlement writer did on the day. When they diverge, the honest product of this page is a
 * VISIBLE VARIANCE — an investigable row — not a quietly wrong number.
 *
 * ⛔ **NO TOLERANCE, AND THAT IS DELIBERATE.** A "within 1 TZS is fine" epsilon is exactly how
 * the negative-pool defect stayed invisible: independent per-winner rounding did not sum to
 * the whole, seven production pools finished NEGATIVE at net −6 TZS, and every money suite
 * stayed green because the ledger still summed to zero. A one-shilling variance is a real
 * disagreement about real money and the owner is shown it.
 */
export function reconcile(booked: number, computed: number): Reconciliation {
  const variance = booked - computed;
  return { booked, computed, variance, clean: variance === 0 };
}

/**
 * Which rate a game actually used, and where that answer came from — Ali's fourth question.
 *
 * ⛔ `"fallback"` IS NOT A DETAIL TO ROUND OFF. A game with no `feeSnapshot` predates rate
 * snapshotting and is charged the LEGACY rate by `snapshotOrLegacy()` — that is what those
 * players were quoted. Presenting it under today's rate would misstate the revenue of every
 * game settled before the last rate change, which is the single defect this page must not
 * ship. The provenance is carried beside the rate so the page cannot render one without the
 * other.
 */
export type RateProvenance = {
  commissionRate: number;
  feeModel: "loser-share" | "capped-commission";
  /** `"snapshot"` = the game's own frozen rates. `"fallback"` = legacy, reconstructed. */
  origin: "snapshot" | "fallback";
};

export function rateProvenance(input: {
  /** The game's `feeSnapshot`, already parsed. `null` when it has none. */
  snapshot: { commissionRate: number; feeModel: "loser-share" | "capped-commission" } | null;
  legacy: { commissionRate: number; feeModel: "loser-share" | "capped-commission" };
}): RateProvenance {
  if (input.snapshot) return { ...input.snapshot, origin: "snapshot" };
  return { ...input.legacy, origin: "fallback" };
}
