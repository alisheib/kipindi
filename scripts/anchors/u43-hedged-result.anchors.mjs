/** Anchors shared by the U43 hedged-result red proof and the fleet anchor audit. */
export const MUTATIONS = [
  { name: "mixed result called WIN", file: "src/app/updown/[roundId]/page.tsx", from: 'result === "MIXED" ? (myPosition?.hedged ? t.market.udBothSides : t.market.udPositionsOnRound)', to: 'result === "MIXED" ? t.market.resolvedWin' },
  { name: "mixed chip given WIN tone", file: "src/app/updown/[roundId]/page.tsx", from: 'result === "MIXED" || result === "CASHED_OUT" ? "neutral"', to: 'result === "MIXED" || result === "CASHED_OUT" ? "resolved"' },
  { name: "mixed payout gilded", file: "src/app/updown/[roundId]/page.tsx", from: 'const payoutStruck = result === "WIN";', to: 'const payoutStruck = result === "WIN" || result === "MIXED";' },
  { name: "hedged aggregate announces WIN", file: "src/app/updown/[roundId]/page.tsx", from: 'myPosition && !myPosition.hedged', to: 'myPosition' },
  { name: "each side row removed", file: "src/components/updown/updown-card.tsx", from: '{myResults.map((result) => (', to: '{myResults.filter((result) => false).map((result) => (' },
  { name: "losing side called WIN", file: "src/components/updown/updown-card.tsx", from: 'result.status === "WIN" ? t.market.udWon', to: 'true ? t.market.udWon' },
  { name: "side amount loses the stake meaning", file: "src/components/updown/updown-card.tsx", from: 'formatTzs(result.status === "LOSS" ? result.stake : result.payout)', to: 'formatTzs(result.payout)' },
  { name: "aggregate amount drops a side", file: "src/components/updown/updown-card.tsx", from: 'myResults.reduce((sum, result) => sum + result.payout, 0)', to: 'myResults[0].payout' },
  { name: "any winning leg becomes aggregate WIN", file: "src/lib/server/updown-board.ts", from: '? null : settledStatuses.size === 1 ? [...settledStatuses][0] : "MIXED";', to: '? null : settledStatuses.has("WIN") ? "WIN" : settledStatuses.has("VOID") ? "VOID" : "LOSS";' },
];
