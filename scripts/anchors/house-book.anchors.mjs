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
    from: `    freeHouseCash: input.custodialCash - input.playerLiability - leviesPayable - aggregator,`,
    to: `    freeHouseCash: input.custodialCash - leviesPayable - aggregator,`,
    expect: "3.1",
  },
  {
    // A negative free-cash figure is exactly the condition an owner must be told about;
    // clamping it to zero hides insolvency behind a reassuring floor.
    name: "house-book.ts — clamp free cash at zero (insolvency hidden behind a floor)",
    file: "src/lib/house-book.ts",
    from: `    freeHouseCash: input.custodialCash - input.playerLiability - leviesPayable - aggregator,`,
    to: `    freeHouseCash: Math.max(0, input.custodialCash - input.playerLiability - leviesPayable - aggregator),`,
    expect: "3.3",
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
    from: `  const ggr = input.handle - input.winningsPaid;`,
    to: `  const ggr = input.handle - input.winningsPaid - input.bonusCost;`,
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
