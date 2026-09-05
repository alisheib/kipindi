/**
 * RED anchors for `npm run red:house-book` — the control for `test:house-book`.
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, so `red-anchors.test.mts` §3 can audit every declared
 * anchor WITHOUT running the injection. Same law as the anchor files beside it.
 *
 * ⛔ EVERY ANCHOR MUST RESOLVE EXACTLY ONCE — `red-anchor.mjs`'s `resolveAnchor` refuses both
 * zero matches (a rotted anchor proves nothing) and two or more (an ambiguous one proves the
 * wrong thing).
 *
 * Each mutation is a way this page could misstate real money to its owner. The one marked ⭐
 * is the mistake most likely to be written here by someone reading the code carefully and
 * still getting it wrong.
 */

export const MUTATIONS = [
  {
    // ⭐ THE DEFECT THIS WHOLE MODULE EXISTS TO PREVENT, and it looks CORRECT.
    // `ledger.ts` debits the TRA and GBT levies straight back out of HOUSE:COMMISSION, so
    // the balance is already net. Subtracting them again understates the owner's profit by
    // the whole levy — silently, on the one number the page exists to state.
    name: "house-book.ts — subtract the levies a SECOND time (the owner's profit understated)",
    file: "src/lib/house-book.ts",
    from: `    netRetained: commission,`,
    to: `    netRetained: commission - leviesPayable,`,
    expect: "2.1",
  },
  {
    // Gross float presented as the owner's money — the number insolvency is built from.
    name: "house-book.ts — drop player liability from free cash (float reported as profit)",
    file: "src/lib/house-book.ts",
    from: `    freeHouseCash: input.custodialCash - input.playerLiability - owedToOthers,`,
    to: `    freeHouseCash: input.custodialCash - owedToOthers,`,
    expect: "3.1",
  },
  {
    // A negative free-cash figure is exactly the condition an owner must be told about;
    // clamping it to zero hides insolvency behind a reassuring floor.
    name: "house-book.ts — clamp free cash at zero (insolvency hidden behind a floor)",
    file: "src/lib/house-book.ts",
    from: `    freeHouseCash: input.custodialCash - input.playerLiability - owedToOthers,`,
    to: `    freeHouseCash: Math.max(0, input.custodialCash - input.playerLiability - owedToOthers),`,
    expect: "3.3",
  },
  {
    // ⭐ THE KIND LIE. Seeded balances made the strict solvency line read −19,555,989 on
    // production, and the tempting fix is to quietly show the flattering ex-adjustments
    // figure under the honest label. Both must exist; neither may stand in for the other.
    name: "house-book.ts — substitute the flattering figure for the strict solvency line",
    file: "src/lib/house-book.ts",
    from: `    freeHouseCash: input.custodialCash - input.playerLiability - owedToOthers,`,
    to: `    freeHouseCash: input.custodialCash - (input.playerLiability - adjusted) - owedToOthers,`,
    expect: "3b.1",
  },
  {
    // The other direction: collapse the split so the owner can never see WHY the strict line
    // is negative, leaving a page that cries wolf with no explanation beside it.
    name: "house-book.ts — collapse the liability split (the alarm loses its explanation)",
    file: "src/lib/house-book.ts",
    from: `    playerLiabilityAdjusted: adjusted,`,
    to: `    playerLiabilityAdjusted: 0,`,
    expect: "3b.3",
  },
  {
    // ⭐ THE SHIPPED DEFECT, RESTORED — and §5.2 pinned `60_000` for it, so 34/0 green was not
    // evidence. `withdrawalEntries` credits the gateway's share STRAIGHT to HOUSE:AGGREGATOR;
    // `feeEarned` reads positive HOUSE:COMMISSION rows only, so the share was never in it.
    // Taking it out here is the file header's own forbidden double-subtraction, one account over.
    name: "house-book.ts — subtract the gateway share that was never in the fee (the header's own ban, one account over)",
    file: "src/lib/house-book.ts",
    from: `    netRetained: input.feeEarned - input.leviesOut - input.bonusCost,`,
    to: `    netRetained: input.feeEarned - input.leviesOut - input.aggregatorOut - input.bonusCost,`,
    expect: "5.2",
  },
  {
    // The other direction: answer the double-subtraction by DELETING the gateway figure. The
    // arithmetic becomes right and the owner can no longer see what the gateway took.
    name: "house-book.ts — drop the gateway pass-through entirely (the fix that hides the fact)",
    file: "src/lib/house-book.ts",
    from: `    handle,
    ggr,`,
    to: `    handle,
    ggr,
    aggregatorOut: 0,`,
    expect: "5.2b",
  },
  {
    // ⭐ THE POOL IS CREDITED TWICE. Reading `STAKE_DEBIT` alone while counting the payouts from
    // that same pool in full understates GGR by every bonus shilling ever staked.
    name: "house-book.ts — count only the REAL stake in the period handle (bonus turnover vanishes)",
    file: "src/lib/house-book.ts",
    from: `  const handle = input.stakeIn + input.bonusIn;`,
    to: `  const handle = input.stakeIn;`,
    expect: "5.6",
  },
  {
    // The same defect per game — and here it is worse, because the book then cannot close and a
    // CORRECT bonus-funded market renders as a variance on the reconciliation panel.
    name: "house-book.ts — count only the REAL stake per game (a correct bonus book reads as broken)",
    file: "src/lib/house-book.ts",
    from: `  const handle = g.poolIn + g.bonusIn;`,
    to: `  const handle = g.poolIn;`,
    expect: "4.4",
  },
  {
    // A voided bonus market returns its stake as BONUS_REFUND to PLAYER_BONUS:, which
    // `LIKE 'PLAYER:%'` cannot match. Dropping the leg leaves the identity short by the bonus.
    name: "house-book.ts — ignore the bonus refund leg (a voided bonus market never closes)",
    file: "src/lib/house-book.ts",
    from: `    closesTo: handle - g.paidOut - g.bonusRefunded - g.feeBooked,`,
    to: `    closesTo: handle - g.paidOut - g.feeBooked,`,
    expect: "4.5",
  },
  {
    // ⭐ MONEY WE HOLD BUT DO NOT OWN, reported as ours. `HOUSE:RG_SUSPENSE` is a self-excluded
    // player's deposit awaiting return; leaving it out of the solvency line calls it free cash.
    name: "house-book.ts — leave RG suspense out of what is owed (a held deposit reported as free cash)",
    file: "src/lib/house-book.ts",
    from: `  const owedToOthers = leviesPayable + aggregator + rgSuspense;`,
    to: `  const owedToOthers = leviesPayable + aggregator;`,
    expect: "3c.1",
  },
  {
    // Deducted, but unnamed — so the owner sees free cash fall and has nothing to act on, and
    // nobody learns there is a player waiting to be repaid.
    name: "house-book.ts — fold RG suspense into the levy line (a deduction nobody can act on)",
    file: "src/lib/house-book.ts",
    from: `    rgSuspensePayable: rgSuspense,`,
    to: `    rgSuspensePayable: 0,`,
    expect: "3c.2",
  },
  {
    // A VOID game refunds and books no fee. Dropping its marker makes it indistinguishable
    // from an ordinary game on a page whose job is completeness.
    name: "house-book.ts — stop marking VOID games as fee-less (a refund reads as a result)",
    file: "src/lib/house-book.ts",
    from: `    noFee: g.outcome === "VOID" || g.feeBooked === 0,`,
    to: `    noFee: false,`,
    expect: "4.2",
  },
  {
    // Bonus cost is real money out. Netting it into GGR flatters the gaming result with
    // money that left the platform.
    name: "house-book.ts — net the bonus cost into GGR (the gaming result flattered)",
    file: "src/lib/house-book.ts",
    from: `  const ggr = handle - input.winningsPaid;`,
    to: `  const ggr = handle - input.winningsPaid - input.bonusCost;`,
    expect: "5.1",
  },
  {
    // ⭐ THE EPSILON. "Within a shilling is fine" is exactly how seven production pools
    // finished NEGATIVE at net −6 TZS while every money suite stayed green.
    name: "house-book.ts — allow a one-shilling reconciliation tolerance (a real disagreement, absorbed)",
    file: "src/lib/house-book.ts",
    from: `  return { booked, computed, variance, clean: variance === 0 };`,
    to: `  return { booked, computed, variance, clean: Math.abs(variance) <= 1 };`,
    expect: "6.2",
  },
  {
    // ⭐ ALI'S FOURTH QUESTION, INVERTED: a rate change today reprices yesterday's games.
    name: "house-book.ts — ignore the game's own snapshot (today's rate reprices old games)",
    file: "src/lib/house-book.ts",
    from: `  if (input.snapshot) return { ...input.snapshot, origin: "snapshot" };`,
    to: `  if (!input.snapshot) return { ...input.legacy, origin: "snapshot" };`,
    expect: "7.1",
  },
  {
    // A reconstruction presented as a frozen fact. The number may even be right; the CLAIM
    // about where it came from is not, and provenance is the whole point of the panel.
    name: "house-book.ts — label the legacy fallback as a real snapshot (a reconstruction sold as truth)",
    file: "src/lib/house-book.ts",
    from: `  return { ...input.legacy, origin: "fallback" };`,
    to: `  return { ...input.legacy, origin: "snapshot" };`,
    expect: "7.3",
  },
];
