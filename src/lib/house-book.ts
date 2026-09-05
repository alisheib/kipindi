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
 *
 * 🔴 **`all` IS THE POPULATION; THE NAMED FIELDS ARE A CONVENIENCE OVER IT.** The reader takes
 * `account LIKE 'HOUSE:%'` as a GROUP, exactly as `ledger.ts → houseAccountBalances()` does.
 * Enumerating four accounts by name was the shipped defect: `acct` also mints `HOUSE:RG_SUSPENSE`
 * (money we hold and owe a self-excluded player), and the retired `HOUSE:TAX` / `HOUSE:RESERVE`
 * still carry historical rows. A named read silently drops every shilling on an account it has
 * not heard of, and the page then disagrees with `/admin/finance` with no error anywhere.
 * ⛔ The page renders every non-zero entry of `all`, not just the four below.
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
  /**
   * ⭐ `HOUSE:RG_SUSPENSE` — a deposit that landed after the player self-excluded. `ledger.ts`
   * names it *"money the platform HOLDS but does not own"*. It cannot be credited and has not
   * been returned, so it is a LIABILITY and comes out of free cash like any other.
   * ⚠️ Measured 0 on production 2026-09-05 — this is a latent defect, not a live misstatement,
   * and the account is one self-excluded deposit away from being real money.
   */
  rgSuspense: number;
  /** Every `HOUSE:%` account with a balance, keyed by the raw account string. */
  all: Readonly<Record<string, number>>;
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
  /** ⭐ Held for a self-excluded player, awaiting return. Ours to hold, never ours to keep. */
  rgSuspensePayable: number;
  /** Owed to players — Σ ACTIVE wallet balance + hold. */
  playerLiability: number;
  /** ⚠️ The part of that credited by an ADMIN, with no deposit behind it. */
  playerLiabilityAdjusted: number;
  /** The part actually funded by money that came through the payment rail. */
  playerLiabilityFunded: number;
  /** ⭐ The solvency line: custodial cash minus everything owed to somebody else. */
  freeHouseCash: number;
  /** ⭐ The same line with admin-credited balances excluded — see `housePosition`. */
  freeHouseCashExAdjustments: number;
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
  /**
   * ⭐ THE PART OF PLAYER LIABILITY AN ADMIN CREATED — Σ `ADJUSTMENT` credited to players.
   *
   * 🔴 MEASURED ON PRODUCTION 2026-09-04, AND IT IS WHY THIS PARAMETER EXISTS. Player
   * liability was **20,105,687**, of which **ADJUSTMENT accounted for 20,600,000** while real
   * `DEPOSIT` was only **680,000**. Custodial cash — which counts only money that crossed the
   * external boundary — was 605,110. So the strict solvency line read **−19,555,989**, and a
   * page that showed that alone would have told the owner his platform was insolvent by
   * nineteen million shillings when what it actually held was seeded test balances.
   *
   * ⛔ **A FALSE ALARM IS AS SERIOUS AS A MISSED ONE HERE.** An owner who learns the solvency
   * line cries wolf stops reading it, and then it cannot warn him on the day it matters. So
   * both figures are produced: the strict one, which is arithmetically correct and never
   * softened, and the ex-adjustments one, which says what the position would be if only
   * genuinely funded balances were owed. ⛔ The page shows BOTH, labelled — it must never
   * quietly substitute the flattering one.
   */
  adjustmentBackedLiability: number;
}): HousePosition {
  const { commission, traLevy, gbtLevy, aggregator, rgSuspense } = input.accounts;
  const leviesPayable = traLevy + gbtLevy;
  // ⛔ `rgSuspense` BELONGS HERE. It is a player's deposit we are holding to return; leaving it
  // out reports it as free cash, which is the one thing it certainly is not.
  const owedToOthers = leviesPayable + aggregator + rgSuspense;

  // ⚠️ Clamped at zero: admin credits can exceed the wallet total (a credit later staked and
  // lost still happened), and a NEGATIVE funded liability is not a thing the owner can act on.
  const adjusted = Math.max(0, Math.min(input.adjustmentBackedLiability, input.playerLiability));

  return {
    // ⛔ NOT `commission - leviesPayable`. See the header: the levies are already out.
    netRetained: commission,
    // The gross is RECONSTRUCTED by adding the levies back — the inverse of the booking.
    grossFeeEarned: commission + leviesPayable,
    leviesPayable,
    aggregatorPayable: aggregator,
    rgSuspensePayable: rgSuspense,
    playerLiability: input.playerLiability,
    playerLiabilityAdjusted: adjusted,
    playerLiabilityFunded: input.playerLiability - adjusted,
    freeHouseCash: input.custodialCash - input.playerLiability - owedToOthers,
    freeHouseCashExAdjustments: input.custodialCash - (input.playerLiability - adjusted) - owedToOthers,
    source: "ledger",
  };
}

/** One game's contribution, summed from that game's own ledger rows. */
export type GameBookInput = {
  marketId: string;
  /**
   * `VOID` books no fee and MUST still be listed — a missing row reads as data loss.
   *
   * 🔴 **`null` IS A REAL ARM, NOT A MISSING VALUE.** The window is ENTRY-TIME, so an
   * unsettled market can appear here having genuinely moved money — a live poll whose player
   * took an early exit books a real `CASHOUT_FEE`. A market whose row has been redacted by the
   * purge ceremony has no outcome either, and its fees are still ours. ⛔ Both must render; the
   * page derives the WORD from `outcomeWord(t, outcome ?? "VOID", productLine)` and never from
   * a literal, because Up & Down stores `YES`/`NO` and reads them back as Up and Down.
   */
  outcome: "YES" | "NO" | "VOID" | null;
  /** Σ `STAKE_DEBIT` for this market — REAL money only. See `bonusIn`. */
  poolIn: number;
  /**
   * ⭐ Σ `BONUS_SPEND` credited to this market's pool — the BONUS-funded half of the stake.
   *
   * 🔴 `stakeEntries` credits the pool TWICE: `STAKE_DEBIT` for the real part and `BONUS_SPEND`
   * for the bonus part. Counting only the first while counting the payouts from that same pool
   * IN FULL understates the handle and makes a bonus-funded game's book impossible to close —
   * so the reconciliation panel would cry wolf on a correct book, which is the failure mode this
   * page can least afford. ⚠️ Measured 0 on production 2026-09-05: no bonus stake has ever been
   * placed. Latent, not live — and one bonus bet away from breaking the by-game column.
   */
  bonusIn: number;
  /** Σ `PAYOUT_CREDIT` + `REFUND` + `CASHOUT` credited to players, in REAL money. */
  paidOut: number;
  /**
   * Σ `BONUS_REFUND` credited back to `PLAYER_BONUS:` when this market voided.
   *
   * ⛔ NOT part of `paidOut`, and it cannot be: `paidOut` filters `PLAYER:%`, which by design
   * does not match `PLAYER_BONUS:`. A voided bonus-funded market returns its stake down this
   * path alone, so without it the identity below is short by exactly the bonus that came back.
   */
  bonusRefunded: number;
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
  /** Real + bonus. The money that actually entered this pool. */
  handle: number;
  /**
   * ⭐ THE PER-GAME IDENTITY, AND IT MUST BE ZERO ON A SETTLED BOOK:
   * `handle − paidOut − bonusRefunded − feeBooked`.
   *
   * A LIVE market holds its pool by design and will show its whole handle here — that is not a
   * defect and the page must not label it one. ⛔ No tolerance: measured on production
   * 2026-09-05, 405 of 419 settled markets close EXACTLY, twelve differ by ±1–2 (the documented
   * per-winner allocation dust), one by +15, and one — `mkt_037b284976b9dd2bd9e2` — by −19,999,
   * because its ledger recorded 10,500 of stakes while its pool columns said 30,500 and
   * settlement paid out against the columns. An epsilon would have hidden that.
   */
  closesTo: number;
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
  const handle = g.poolIn + g.bonusIn;
  return {
    ...g,
    netRetained: g.feeBooked - g.leviesBooked,
    noFee: g.outcome === "VOID" || g.feeBooked === 0,
    handle,
    closesTo: handle - g.paidOut - g.bonusRefunded - g.feeBooked,
  };
}

export type Waterfall = {
  /** ⭐ `stakeIn + bonusIn`. Both halves stay visible — see `GameBookInput.bonusIn`. */
  handle: number;
  /** Real money staked (`STAKE_DEBIT` into a pool). */
  stakeIn: number;
  /** Bonus money staked (`BONUS_SPEND` into a pool). Real handle, not real cash. */
  bonusIn: number;
  winningsPaid: number;
  ggr: number;
  feeEarned: number;
  leviesOut: number;
  /**
   * ⚠️ A LABELLED PASS-THROUGH, NOT A DEDUCTION — see `netRetained`. Rendered beside the
   * waterfall, outside the subtraction, so the owner can see what the gateway took without the
   * page taking it out of his profit a second time.
   */
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
 *
 * ═══ 🔴 WHY THE GATEWAY SHARE IS **NOT** SUBTRACTED HERE ══════════════════════════════
 *
 * This function shipped as `feeEarned − leviesOut − aggregatorOut − bonusCost`, and that is the
 * double-subtraction the file header forbids, one account over. `feeEarned` reads **positive
 * `HOUSE:COMMISSION` entries only**, and `withdrawalEntries` splits the withdrawal fee at the
 * point of booking — `gatewayShare` goes straight to `HOUSE:AGGREGATOR` and only `houseShare`
 * ever reaches `HOUSE:COMMISSION`. The gateway's slice was therefore **never inside `feeEarned`
 * to begin with**, and taking it out again charged the owner for it twice.
 *
 * ⚠️ MEASURED ON PRODUCTION 2026-09-05: `feeEarned` 367,131 (`SETTLEMENT_COMMISSION` 366,371 +
 * `WITHDRAWAL_FEE` 760); `HOUSE:AGGREGATOR` 380, credited by `WITHDRAWAL_FEE` alone and never by
 * settlement. The shipped line reported 309,719 where the books say 310,099.
 *
 * ⭐ NOTE THE ASYMMETRY WITH `housePosition`, AND IT IS THE SAME ASYMMETRY AS `gameBook`'s.
 * There, `commission` is an ACCOUNT BALANCE the levy debits have already reduced, so
 * `netRetained = commission`. Here, `feeEarned` is a sum of POSITIVE fee entries with the levies
 * still in it, so they must come out exactly once. Same money, two reads of the ledger, and the
 * difference is written down here rather than rediscovered at a call site.
 */
export function waterfall(input: {
  stakeIn: number;
  bonusIn: number;
  winningsPaid: number;
  feeEarned: number;
  leviesOut: number;
  aggregatorOut: number;
  bonusCost: number;
}): Waterfall {
  const handle = input.stakeIn + input.bonusIn;
  const ggr = handle - input.winningsPaid;
  return {
    ...input,
    handle,
    ggr,
    // ⛔ NOT `− input.aggregatorOut`. See the block above: it was never in `feeEarned`.
    netRetained: input.feeEarned - input.leviesOut - input.bonusCost,
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
