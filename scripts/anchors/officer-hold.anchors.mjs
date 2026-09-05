/**
 * RED anchors for `npm run test:settlement-gate` §14 — the officer hold.
 *
 * ⛔ DECLARED AS DATA, NOT BURIED IN THE HARNESS, and that is the whole point of this
 * directory. `red-anchors.test.mts` §3 re-resolves every anchor below against the real file
 * on every run, using the SAME resolver the harness injects with — so an anchor that rots
 * (the line it names gets reworded, or comes to match twice) is reported the day it rots,
 * rather than the day someone finally runs this harness and sees five ANCHOR FAILs. §4's
 * ratchet counts harnesses that do not declare; this file is what keeps it from growing.
 *
 * ── WHAT THESE FIVE ARE ──────────────────────────────────────────────────────────────
 * Each one is a decision from `holdSettlementAsOfficer`'s own header, inverted into the
 * defect it exists to prevent. §14 of the gate must go red on that case's OWN assertion —
 * "something went red" is not a proof, and a mutation that merely breaks the file's syntax
 * would satisfy a weaker harness while testing nothing.
 *
 * ⚠️ THE FIFTH IS THE SUBTLE ONE. Making the officer obey the player's `WINDOW_CLOSED` rule
 * looks like consistency and is the opposite: the settle timer can lag its own deadline (a
 * five-minute back-off, a boot grace, a queued burst), and that lag is exactly the gap in
 * which an officer who has spotted a wrong verdict must still be able to stop the money. The
 * gate pairs it with a positive control — a PLAYER in the same market, at the same instant,
 * IS refused — so the case cannot pass by the rule quietly applying to nobody.
 */

const SVC = "src/lib/server/objections-service.ts";
const MKT = "src/lib/server/market-service.ts";

export const MUTATIONS = [
  /* ── §15 · the seal notice (management ruling ①) ───────────────────────────────────────
     ⛔ THE FIRST OF THESE IS THE MOST IMPORTANT MUTATION IN THIS FILE. It deletes the CALL
     while leaving the emitter, its registry row and all 1,038 of `test:cert-c3`'s assertions
     perfectly intact — which is exactly the state `PRESENCE-2` shipped in, and every gate was
     green for it. If §15 does not go red here, the platform can ship a notice nobody sends. */
  {
    name: "🔴 the seal stops calling the notice — every gate stays green and no player is told",
    file: MKT,
    expect: "15: the WINNING side is told a verdict was recorded",
    from: `  if (result.ok && result.data?.stage === "complete") {
    void notifyVerdictRecordedForMarket(opts.marketId).catch(() => {});
  }`,
    to: `  // defect: the seal tells nobody`,
  },
  {
    /* ⚠️ THE ANCHOR CARRIES ITS COMMENT, AND THAT IS NOT PADDING. The dedupe line is
       byte-identical to `notifySelectionClosedForMarket`'s at market-service.ts:1760 — two
       functions doing the same correct thing — and `resolveAnchor` REFUSES an anchor that
       matches twice rather than injecting into whichever comes first. Found by this harness
       reporting ANCHOR FAIL on its first run, which is the failure mode it exists to have. */
    name: "the fan-out messages POSITIONS instead of PLAYERS (a hedged holder is told twice)",
    file: MKT,
    expect: "15: two positions for one player produce ONE notice, not two",
    from: `  // One message per PLAYER, not per position — a hedged holder with six positions on one
  // market gets one notice about one verdict.
  const bettors = Array.from(new Set(open.map((p) => p.userId)));`,
    to: `  const bettors = open.map((p) => p.userId);`,
  },
  {
    name: "🔴 the notice reaches players who never staked on the market",
    file: MKT,
    expect: "15: a bystander who never staked is not told",
    from: `  const open = (await listPositionsForMarket(marketId)).filter((p) => p.status === "OPEN");`,
    to: `  const open = (await db.user.list()).map((u) => ({ userId: u.id, status: "OPEN" as const }));`,
  },
  {
    /* ⚠️ RE-AIMED, AND THE FIRST VERSION IS WORTH RECORDING. It mutated the OUTCOME guard
       (`outcome !== "YES" && …`) and the gate stayed GREEN — correctly. An unsealed market has
       no `objectionsClosedAt` either, so the deadline guard below already returns 0 and the
       outcome guard never decides that case. The control exercises the DEADLINE guard, so that
       is what this mutation must remove; claiming it proved the outcome guard would have been
       a harness agreeing with itself. The outcome guard stays in the code as law 25's
       defensive half — read, never inferred — and is simply not what §15 proves. */
    name: "the notice is sent for a market that has no payout deadline to name",
    file: MKT,
    expect: "15: CONTROL · a verdict with no payout deadline sends nothing (isolates the deadline guard)",
    from: `  if (!m.objectionsClosedAt) return { bettors: 0 };`,
    to: `  if (false) return { bettors: 0 };`,
  },
  {
    name: "law 25 · the notice names an outcome the market does not hold",
    file: MKT,
    expect: "15: CONTROL · a deadline with no recorded verdict sends nothing (isolates the outcome guard)",
    from: `  if (outcome !== "YES" && outcome !== "NO" && outcome !== "VOID") return { bettors: 0 };`,
    to: `  if (false) return { bettors: 0 };`,
  },

  {
    name: "the role gate is gone — any signed-in player can freeze a payout",
    file: SVC,
    expect: "14: a player cannot hold a settlement",
    from: `  if (!(await requireRulingOfficer(officerId, "objection.officer_hold"))) {
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to hold a settlement.", code: "INVALID" };
  }`,
    to: `  // defect: the hold is open to anyone`,
  },
  {
    name: "the hold inherits the player's stake requirement, so it helps exactly nobody",
    file: SVC,
    expect: "14: an officer with no stake CAN hold the payout",
    from: `    const mine = (await db.objection.listForUser(officerId)).filter(
      (o) => o.marketId === input.marketId && o.status === "OPEN",
    );`,
    to: `    const holdsPosition = (await listPositionsForMarket(input.marketId)).some((p) => p.userId === officerId);
    if (!holdsPosition) return { ok: false, error: "Only a player who staked on this market can object to its result.", code: "INVALID" };
    const mine = (await db.objection.listForUser(officerId)).filter(
      (o) => o.marketId === input.marketId && o.status === "OPEN",
    );`,
  },
  {
    name: "the settled wall is gone — a hold is accepted on money that has already moved",
    file: SVC,
    expect: "14: a settled market cannot be held",
    from: `    if (m.settledAt) {
      return { ok: false, error: "This market has already paid out — a hold cannot recall money. Use the reversal path.", code: "INVALID" };
    }`,
    to: `    // defect: no wall once the money has moved`,
  },
  {
    name: "the one-per-officer rule is gone — a double-click manufactures two frozen cases",
    file: SVC,
    expect: "14: a repeat by the SAME officer is refused",
    from: `    if (mine.length > 0) {
      return { ok: false, error: "You already have a hold open on this market.", code: "INVALID" };
    }`,
    to: `    // defect: repeats allowed`,
  },
  {
    name: "the officer is timed out by the player's window — exactly when the timer is lagging",
    file: SVC,
    expect: "14: an officer CAN still hold after the window closes",
    from: `    const mine = (await db.objection.listForUser(officerId)).filter(`,
    to: `    if (m.objectionsClosedAt && Date.now() > Date.parse(m.objectionsClosedAt)) {
      return { ok: false, error: "The objection window for this market has closed.", code: "INVALID" };
    }
    const mine = (await db.objection.listForUser(officerId)).filter(`,
  },
];
