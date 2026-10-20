/** Real card-money reversals consumed by red:u43-card-money-readout. */
export const MUTATIONS = [
  { name: "pending verdict takes a side's winning ink",
    from: '!settled || state === "void" ? "var(--text-muted)"',
    to: 'state === "void" ? "var(--text-muted)"',
    failure: "a known verdict with money unsettled has neutral result ink" },
  { name: "an unknown single payout gets a second amount slot",
    from: 'cardResults[0].payout != null && <>',
    to: 'cardResults[0].payout == null && <>',
    failure: "an unknown single payout appears once, with no invented amount" },
  { name: "a loss prints the lost stake as paid out",
    from: 'formatTzs(cardResults[0].payout)',
    to: 'formatTzs(cardResults[0].status === "LOSS" ? cardResults[0].stake : cardResults[0].payout)',
    failure: "a realized LOSS names zero paid out rather than restating stake" },
  { name: "a mixed result prints the losing leg's stake as return",
    from: 'formatTzs(result.payout)',
    to: 'formatTzs(result.status === "LOSS" ? result.stake : result.payout)',
    failure: "each realized leg uses its actual payout, including zero for a loss" },
].map((item) => ({ file: "src/components/updown/updown-card.tsx", ...item }));
