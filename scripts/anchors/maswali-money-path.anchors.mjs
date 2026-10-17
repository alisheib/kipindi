/**
 * Anchors for `red:maswali-money-path` (MASWALI-BUILD S3) — each puts back one way Millionea's money could move wrong, in
 * the real source, and names the assertion that must turn red, and in which memory child:
 *   · purchase — `test:maswali-purchase` (`scripts/lib/maswali-purchase-child.mts`)
 *   · settle   — `test:maswali-settle`   (`scripts/lib/maswali-settle-child.mts`)
 *   · void     — `test:maswali-void`     (`scripts/lib/maswali-void-child.mts`, MASWALI-BUILD R1)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const MONEY = "src/lib/server/maswali-money-service.ts";
const SETTLE = "src/lib/server/maswali-settlement.ts";
const SVC = "src/lib/server/maswali-service.ts";
const VOID = "src/lib/server/maswali-void.ts";
/** The week void's one post-commit line (R10d's push), which (6), (6b) and (14) each rewrite. */
const VOID_PUSH = "  if (out.ok && !out.already) await emitWalletBalances(credited.map((c) => c.userId));";

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
  /* ⚠️ RE-TARGETED (MASWALI-BUILD R1): (6) and (6b) quoted `settleMarket`'s MASWALI arms, which a week no longer reaches
     (its fence is total; a week refunds through `maswali-void.ts`). Each now puts its side effect back where a week's
     refund really runs, and is caught by the same purchase-suite assertion. */
  {
    name: "(6) a voided week's ticket gets a poll's refund notice",
    file: VOID,
    from: VOID_PUSH,
    to: "  if (out.ok && !out.already) { await emitWalletBalances(credited.map((c) => c.userId)); const { notifyRefund } = await import(\"./notification-service\"); for (const c of credited) notifyRefund(c.userId, { stake: c.amount, marketTitle: { en: \"x\", sw: \"x\", zh: \"x\" }, marketId }); }",
    expect: "7.5 · ⛔ no Up & Down",
    suite: "purchase",
  },
  {
    name: "(6b) a voided ticket's refund reverses wagering it never accrued",
    file: VOID,
    from: VOID_PUSH,
    to: "  if (out.ok && !out.already) { await emitWalletBalances(credited.map((c) => c.userId)); const { reverseWagering } = await import(\"./bonus-service\"); for (const c of credited) await reverseWagering(c.userId, c.amount); }",
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
  /* MASWALI-BUILD R1 + R10d · the week void's own refund, one defect each, every one caught by `test:maswali-void`. */
  {
    name: "(14) R10d · a voided week's refunds push no balance to the refunded players' open pages",
    file: VOID,
    from: VOID_PUSH,
    to: "  if (out.ok && !out.already) void credited;",
    expect: "1.12 · ⭐ R10d",
    suite: "void",
  },
  {
    name: "(15) the market's settled stamp is not read as the one truth: a refunded week is refunded again",
    file: VOID,
    from: "      if (market.settledAt) return { ok: true, already: true, tickets: 0, players: 0, refunded: 0 };",
    to: "      if (false) return { ok: true, already: true, tickets: 0, players: 0, refunded: 0 };",
    expect: "6.1 · voidWeek on a refunded week answers already",
    suite: "void",
  },
  {
    name: "(16) the void books no ledger group: the week's POOL keeps the refunded stakes",
    file: VOID,
    from: "        for (let i = 0; i < lines.length; i += LINES_PER_POST) await postMaswaliLines(groupId, lines.slice(i, i + LINES_PER_POST), mtx);",
    to: "        void lines;",
    expect: "1.9 · ⭐ the week's POOL is back to exactly 0",
    suite: "void",
  },
  {
    name: "(17) the void leaves its tickets LIVE (the old VOID arm never marked a ticket)",
    file: VOID,
    from: "        const refunded = await ticketStore.refundWeekTickets(week.id, plan.map((x) => x.ticket.id), mtx ?? undefined);",
    to: "        const refunded = plan.length;",
    expect: "1.5 · ⭐ every ticket REFUNDED",
    suite: "void",
  },
];
