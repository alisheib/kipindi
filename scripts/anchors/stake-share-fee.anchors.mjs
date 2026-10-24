// FEE-TAX-2026-10 · the disk plants for `red:stake-share-fee` (`tsx scripts/stake-share-fee.test.mts --prove-red`), and the
// declarations `test:red-anchors` §3 resolves exactly once each — one definition, imported by both, so the audit certifies
// exactly what the harness injects.
//
// Each plant restores ONE way the stake-share law could be got wrong, and `test:stake-share-fee` must go RED on it — on its
// OWN assertion (`failure`), never on a loader error or a neighbour's line.
export const MUTATIONS = [
  {
    name: "rounding half-down",
    why: "the fee and the tax round half DOWN — T on the document's 30,450 is 4,567.5 and must be 4,568",
    file: "src/lib/payout.ts",
    from: "  const n = amount * bp + 5_000;",
    to: "  const n = amount * bp + 4_999;",
    failure: /FAIL 1\.3 /,
  },
  {
    name: "the tax on the whole pool",
    why: "the 15% is taken of the WHOLE pool instead of the prize fund (the losers' net stakes)",
    file: "src/lib/payout.ts",
    from: "  const winningsTax = roundHalfUpBp(prizeFund, taxBp);",
    to: "  const winningsTax = roundHalfUpBp(yesPool + noPool, taxBp);",
    failure: /FAIL 1\.3 /,
  },
  {
    name: "the fee on the losing side only",
    why: "the fee is charged on the LOSING side's stakes alone — loser-share wearing the new law's name",
    file: "src/lib/payout.ts",
    from: "  const feeYes = roundHalfUpBp(yesPool, feeBp), feeNo = roundHalfUpBp(noPool, feeBp);",
    to: "  const feeYes = outcome === \"NO\" ? roundHalfUpBp(yesPool, feeBp) : 0, feeNo = outcome === \"YES\" ? roundHalfUpBp(noPool, feeBp) : 0;",
    failure: /FAIL 1\.1 /,
  },
  {
    name: "the payout floor raised back to the stake",
    why: "the settlement split refuses a winner paid below their STAKE — refusing the lopsided market ruling 1 allows (94,395 on 100,000)",
    file: "src/lib/payout.ts",
    from: "    assertNetStakeFloor(payout, net, `stake-share split, position ${id}, pools ${yesPool}/${noPool}, ${outcome} won`);",
    to: "    assertWinnerFloor(payout, stakeOf.get(id) as number, \"stake-share split\");",
    failure: /FAIL 2\.1 /,
  },
  {
    name: "the projection's floor raised back to the stake",
    why: "a projection onto a lopsided market refuses instead of quoting the true below-stake figure",
    file: "src/lib/payout.ts",
    from: "  assertNetStakeFloor(payout, opts.stake - roundHalfUpBp(opts.stake, feeBp) - 1, `projection, pools ${yes}/${no}, side ${opts.side}`);",
    to: "  assertWinnerFloor(payout, opts.stake, \"projection\");",
    failure: /FAIL 2\.3 /,
  },
  {
    name: "the one-sided mirror dropped",
    why: "a bet on a market nobody has taken the other side of is quoted 87% of its stake — settlement would refund it whole",
    file: "src/lib/payout.ts",
    from: "  if (otherPool <= 0) return { payout: opts.stake, net: 0, share: opts.stake / winningPool, ratio: 1, fee: stakeShareBreakdown(yes, no, 0, 0, yes + no) };",
    to: "  // (the one-sided mirror, dropped)",
    failure: /FAIL 7\.1 /,
  },
  {
    name: "the coercion to capped-commission restored",
    why: "`snapshotOrLegacy` folds a stake-share snapshot into the retired capped-commission law — the silent fall-back this release ends",
    file: "src/lib/server/market-config.ts",
    from: "      feeModel: isLoserShare ? \"loser-share\" : isJackpot ? \"jackpot-payout\" : isStakeShare ? \"stake-share\" : \"capped-commission\",",
    to: "      feeModel: isLoserShare ? \"loser-share\" : isJackpot ? \"jackpot-payout\" : \"capped-commission\",",
    failure: /FAIL 9\.1 /,
  },
];
