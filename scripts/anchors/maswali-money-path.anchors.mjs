/**
 * Anchors for `red:maswali-money-path` (MASWALI-BUILD S3) — each puts back one way Millionea's money could move wrong, in
 * the real source, and names the assertion that must turn red, and in which memory child:
 *   · purchase — `test:maswali-purchase` (`scripts/lib/maswali-purchase-child.mts`)
 *   · settle   — `test:maswali-settle`   (`scripts/lib/maswali-settle-child.mts`)
 *   · closerace — `test:maswali-close-race` (`scripts/lib/maswali-close-race-child.mts`; R2 of the review, 2026-10-17)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const MONEY = "src/lib/server/maswali-money-service.ts";
const SETTLE = "src/lib/server/maswali-settlement.ts";
const SVC = "src/lib/server/maswali-service.ts";

export const MUTATIONS = [
  {
    name: "(1) the cap is not counted inside the wallet lock (only the one purchase's own size is checked)",
    file: MONEY,
    from: "      if (held + n > rules.ticketCapPerWeek) {",
    to: "      if (false) {",
    expect: "4.2 · ⭐ 20 concurrent purchases",
    suite: "purchase",
  },
  {
    name: "(2) bonus money may buy a ticket (the real-balance check counts the bonus wallet)",
    file: MONEY,
    from: "      if (wallet.balance < total) {",
    to: "      if (wallet.balance + (wallet.bonusBalance ?? 0) < total) {",
    expect: "5.1 · ⛔ bonus money cannot buy a ticket",
    suite: "purchase",
  },
  {
    name: "(3) the replay forgets the picks: the same key with other answers is answered as a receipt",
    file: MONEY,
    from: "    if (!p || !t || t.picksKey !== picksKey(slips[i])) return { kind: \"conflict\" };",
    to: "    if (!p || !t) return { kind: \"conflict\" };",
    expect: "3.3 · ⛔ the same key with other picks is a conflict",
    suite: "purchase",
  },
  {
    name: "(4) the sales pause is ignored by the purchase",
    file: MONEY,
    from: "  if ((await readSalesPauseFresh()).paused) {",
    to: "  if (false) {",
    expect: "5b.3 · ⛔ a purchase while paused is refused",
    suite: "purchase",
  },
  {
    name: "(5) the rollout is not asked: a WITHDRAWN product sells",
    file: SVC,
    from: "  if (!rolloutSells(state, week.visibility)) {",
    to: "  if (false) {",
    expect: "1.2 · ⛔ WITHDRAWN sells nothing",
    suite: "purchase",
  },
  {
    name: "(6) a voided week's ticket gets the Up & Down \"round voided\" notice",
    file: "src/lib/server/market-service.ts",
    from: "        if (switchLine(m.productLine, { MARKET: () => false, UPDOWN: () => true, MASWALI: () => false })) {\n          notifyUpDownRefund(p.userId, {",
    to: "        if (switchLine(m.productLine, { MARKET: () => false, UPDOWN: () => true, MASWALI: () => true })) {\n          notifyUpDownRefund(p.userId, {",
    expect: "7.5 · ⛔ no Up & Down",
    suite: "purchase",
  },
  {
    name: "(6b) a voided ticket's refund reverses wagering it never accrued",
    file: "src/lib/server/market-service.ts",
    from: "      const accruedTurnover = switchLine(m.productLine, { MARKET: () => true, UPDOWN: () => true, MASWALI: () => false });",
    to: "      const accruedTurnover = switchLine(m.productLine, { MARKET: () => true, UPDOWN: () => true, MASWALI: () => true });",
    expect: "7.3b · ⭐ …and the void's refund reverses no turnover",
    suite: "purchase",
  },
  {
    name: "(7) S agrees to within a shilling: a pool tolerance of 1",
    file: SETTLE,
    from: "byLedger !== byTickets ||",
    to: "Math.abs(byLedger - byTickets) > 1 ||",
    expect: "6b.1 · ⛔ the ledger one shilling above the tickets",
    suite: "settle",
  },
  {
    name: "(8) the guarantee is not read before paying: a week pays its top-up from a guarantee that cannot cover it",
    file: SETTLE,
    from: "            if (held === null || held < a.U) throw new SettleAbort(`GUARANTEE:${held ?? \"unreadable\"}:${a.U}`);",
    to: "            if (held === null) throw new SettleAbort(`GUARANTEE:${held ?? \"unreadable\"}:${a.U}`);",
    expect: "6.1 · ⭐ (f) refused",
    suite: "settle",
  },
  {
    name: "(9) a second release is not answered as already settled",
    file: SETTLE,
    from: "  if (first.state === \"SETTLED\") return { ok: true, week: first, already: true };",
    to: "  if (false) return { ok: true, week: first, already: true };",
    expect: "1.10 · a second release settles nothing",
    suite: "settle",
  },
  {
    name: "(10) a suspended winner is paid free (roles and status are not re-checked at settlement, MB-43)",
    file: SETTLE,
    from: "  if (user.status === \"SUSPENDED\") return \"account suspended\";",
    to: "",
    expect: "7.1 · released; one winner held",
    suite: "settle",
  },
  {
    name: "(11) a forfeited share goes to the house instead of the jackpot (OD-07)",
    file: SETTLE,
    from: "amount, jackpot: maswaliJackpotOf(w.week.visibility) }), tx);",
    to: "amount, jackpot: acct.commission }), tx);",
    expect: "7.6 · ⭐ forfeited",
    suite: "settle",
  },
  {
    name: "(12) the drive's money rolls into the PUBLIC jackpot (OD-21)",
    file: SETTLE,
    from: "        const jackpot = maswaliJackpotOf(week.visibility);",
    to: "        const jackpot: string = acct.maswaliJackpot;",
    expect: "9.2 · ⭐ its 10,000 went to the DRIVE jackpot",
    suite: "settle",
  },
  {
    name: "(13) a Millionea win offsets the 24-hour loss limit (OD-17)",
    file: "src/lib/server/responsible-gambling.ts",
    from: "  return net - excluded;",
    to: "  return net + excluded - excluded;",
    expect: "8.2 · ⭐ the loss today",
    suite: "settle",
  },
  {
    name: "(R2) the close does not wait for a purchase in flight (no market lock inside the chain lock)",
    file: SVC,
    from: "    return week.marketId ? withLock(`market:${week.marketId}`, seal) : seal();",
    to: "    return seal();",
    expect: "1.2 · ⭐ the close WAITED",
    suite: "closerace",
  },
];
