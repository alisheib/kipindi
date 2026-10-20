/** Physical corruption-fixture reversals consumed by the red runner. */
const FILES = {
  route: "src/app/api/dev-test/u43-failclosed-fixture/route.ts",
  card: "src/components/updown/updown-card.tsx",
  detail: "src/app/updown/[roundId]/page.tsx",
};
export const MUTATIONS = [
  ["production gate", "route", 'process.env.NODE_ENV !== "development"', 'process.env.NODE_ENV === "development"', "development-only"],
  ["localhost gate", "route", "if (!localHost(req))", "if (false)", "localhost-only"],
  ["database gate", "route", "process.env.DATABASE_URL || hasDatabase()", "false", "no database"],
  ["own position premise", "route", "position.userId !== session.userId", "false", "only own existing position"],
  ["settled premise", "route", "!round.settledAt || !market.settledAt", "false", "only own existing position"],
  ["concurrent apply restore ownership", "route", "if (globalThis.__u43FailclosedFixture != null)", "if (false)", "concurrent apply cannot overwrite"],
  ["invalid payout remains invalid", "route", 'input.mode === "null-payout" ? null : -1', 'input.mode === "null-payout" ? null : 0', "null and invalid payout"],
  ["restored position readback", "route", "restoredPosition.finalPayout !== active.position.finalPayout", "false", "one active mutation"],
  ["restored market readback", "route", "restoredMarket.settledAt !== active.marketSettledAt", "false", "one active mutation"],
  ["restored round readback", "route", "restoredRound.settledAt !== active.roundSettledAt", "false", "one active mutation"],
  ["synthetic label", "route", "LOCAL SYNTHETIC DISPLAY STATE · NOT A MONEY LEDGER OR PRODUCTION FACT", "LOCAL UNLABELLED DISPLAY STATE", "self-labels synthetic"],
  ["board payment pending copy", "card", "t.market.udPaymentPending", "t.market.udAwaitingResult", "board card renders pending"],
  ["board payout unavailable copy", "card", "cardResults[0].payout == null ? t.market.udPayoutUnavailable", "cardResults[0].payout == null ? t.market.udPaidOut", "board card renders unavailable"],
  ["board payout fragment loses null gate", "card", "cardResults[0].payout != null && <>", "true && <>", "board card renders unavailable", true],
  ["board LOSS receives WIN gold", "card", 'cardResults[0].status === "WIN" ? "var(--gold-300)"', 'cardResults[0].status === "LOSS" ? "var(--gold-300)"', "board card renders unavailable", true],
  ["detail payment pending copy", "detail", "t.market.udPaymentPending", "t.market.udAwaitingResult", "detail renders pending"],
  ["detail payout unavailable copy", "detail", "myPosition?.incompletePayout ? t.market.udPayoutUnavailable", "myPosition?.incompletePayout ? t.market.udPaidOut", "detail gives invalid payout"],
].map(([name, key, from, to, expected, goldProof = false]) => ({ name, key, file: FILES[key], from, to, expected, goldProof }));
