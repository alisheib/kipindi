/** The locked-pool payout quote's disk mutation, shared by its red runner and fleet audit. */
export const MUTATIONS = [{
  name: "receipt quote reverts to the pre-lock pool",
  file: "src/lib/server/market-service.ts",
  from: "const payoutIfWinAtCommit = await projectedPayout(fresh, opts.side, opts.stake);",
  to: "const payoutIfWinAtCommit = await projectedPayout(market, opts.side, opts.stake);",
}];
