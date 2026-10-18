/**
 * Anchors for `red:maswali-money-path` (MASWALI-BUILD S3) — each puts back one way Millionea's money could move wrong, in
 * the real source, and names the assertion that must turn red, and in which memory child:
 *   · purchase — `test:maswali-purchase` (`scripts/lib/maswali-purchase-child.mts`)
 *   · settle   — `test:maswali-settle`   (`scripts/lib/maswali-settle-child.mts`)
 *   · closerace — `test:maswali-close-race` (`scripts/lib/maswali-close-race-child.mts`; R2 of the review, 2026-10-17)
 *   · void     — `test:maswali-void`     (`scripts/lib/maswali-void-child.mts`, MASWALI-BUILD R1)
 *   · adversarial — `test:maswali-adversarial` (`scripts/lib/maswali-adversarial-child.mts`, MASWALI-BUILD S7), named
 *     `adversarial:<ids>` so the drive runs only the plant's own sections (`--only <ids>`)
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const MONEY = "src/lib/server/maswali-money-service.ts";
const SETTLE = "src/lib/server/maswali-settlement.ts";
const SVC = "src/lib/server/maswali-service.ts";
const VOID = "src/lib/server/maswali-void.ts";
/** A line break, built from its code point: an anchor spanning two lines joins them with it (the resolver matches either ending). */
const LF = String.fromCharCode(10);
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
  /* ── The adversarial review's findings of 2026-10-17 (the R-plants, as R2's). R4a and R4b are Postgres-only (a read
     outside the joined transaction), so no memory child can show them red; their cases run in the Postgres half of
     `test:maswali-purchase` (§8). ── */
  {
    name: "(R10a) the ticket arm does not ask the rollout itself: a caller past purchaseMaswaliTickets sells at WITHDRAWN",
    file: MONEY,
    from: `  if (!rolloutSells(rollout, week.visibility)) {`,
    to: `  if (false) {`,
    expect: "R10a.1 · ⛔",
    suite: "purchase",
  },
  {
    name: "(R10b-buy) the desk check fails open at the purchase again: an unreadable lookup buys the ticket",
    file: MONEY,
    from: `    return refuse("We're busy right now — your stake hasn't moved. Try again in a moment.", { code: "BUSY", reason: "system_busy", retryAfterSec: 1 });`,
    to: `    desk = null;`,
    expect: "R10b.1 · ⛔",
    suite: "purchase",
  },
  {
    name: "(R10b-hold) the desk check fails open at the settlement again: an unreadable lookup pays the share free",
    file: SETTLE,
    from: `    return "unreadable" as const;`,
    to: `    return null;`,
    expect: "R10b.5 · ⛔",
    suite: "purchase",
  },
  {
    name: "(R7) a guarantee reference books twice (the booked-reference check answers new for every reference)",
    file: MONEY,
    from: `  if (seen.at === null) return null;`,
    to: `  return null;`,
    expect: "R7.1 · ⛔",
    suite: "purchase",
  },
  {
    name: "(R5) the activity page's loss panel sums the raw gambling net again (a win and an old ticket's refund add headroom)",
    file: "src/lib/server/activity-summary.ts",
    from: `    lossLimitNetSince(userId, now - DAY_MS),`,
    to: `    db.txn.sumGamblingNetSince(userId, now - DAY_MS),`,
    expect: "R5.2 · ⭐",
    suite: "purchase",
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
  {
    name: "(R2) the close does not wait for a purchase in flight (no market lock inside the chain lock)",
    file: SVC,
    from: "    return week.marketId ? withLock(`market:${week.marketId}`, seal) : seal();",
    to: "    return seal();",
    expect: "1.2 · ⭐ the close WAITED",
    suite: "closerace",
  },
  /* ── Review lane B, round 2 (2026-10-17): R3, R6, R9. R8 (a forfeit's or a hold's mark inside its transaction) is a
     ROLLBACK, which only Postgres makes: a plant dropping the `tx` changes nothing a memory child can see, so its red twin
     is the Postgres half of test:maswali-settle (R8.1, R8.2: the commit fails at its last statement and neither half
     lands), as R4a/R4b's is test:maswali-purchase's. ── */
  {
    name: "(R3-claim) the carry is claimed before the guarantee's refusal: a refused release leaves its claim standing",
    file: SETTLE,
    from: "          if (a.kind === \"PAYOUT\" && a.U > 0) {\n            const held = await maswaliAccountBalance(acct.maswaliGuarantee, mtx);\n            if (held === null || held < a.U) throw new SettleAbort(`GUARANTEE:${held ?? \"unreadable\"}:${a.U}`);\n          }\n          if (!f.carryClaimed && !(await weekStore.claimCarry(week.id, f.rolloverIn, mtx ?? undefined))) throw new SettleAbort(\"CARRY\");",
    to: "          if (!f.carryClaimed && !(await weekStore.claimCarry(week.id, f.rolloverIn, mtx ?? undefined))) throw new SettleAbort(\"CARRY\");\n          if (a.kind === \"PAYOUT\" && a.U > 0) {\n            const held = await maswaliAccountBalance(acct.maswaliGuarantee, mtx);\n            if (held === null || held < a.U) throw new SettleAbort(`GUARANTEE:${held ?? \"unreadable\"}:${a.U}`);\n          }",
    expect: "6.2b · R3 · ⭐",
    suite: "settle",
  },
  {
    name: "(R3-jackpot) the jackpot is not read before the carry is drawn: a claim above what it holds is paid",
    file: SETTLE,
    from: "            if (inJackpot === null || inJackpot < f.rolloverIn) throw new SettleAbort(`JACKPOT:${inJackpot ?? \"unreadable\"}:${f.rolloverIn}`);",
    to: "            void inJackpot;",
    expect: "R3.4 · ⭐ (iii)",
    suite: "settle",
  },
  {
    name: "(R6-lift) the lift takes no chain lock: a forfeit's lift reads \"nothing held\" while a held share is landing",
    file: SETTLE,
    from: "async function liftHoldIfClear(userId: string, actorId: string | null, note: string): Promise<boolean> {\n  return withLock(MASWALI_CHAIN_LOCK, async () => {",
    to: "async function liftHoldIfClear(userId: string, actorId: string | null, note: string): Promise<boolean> {\n  return (async (fn: () => Promise<boolean>) => fn())(async () => {",
    expect: "R6.2b · ⭐",
    suite: "settle",
  },
  {
    name: "(R9) the winners are paid one by one: a WIN statement per winner instead of one per batch",
    file: SETTLE,
    from: "            const won = await positionStore.settleMaswaliWinners(marketId, winners.map((w) => w.ticket.positionId), a.share, settledAt, mtx);",
    to: "            let won = 0; for (const w of winners) won += await positionStore.settleMaswaliWinners(marketId, [w.ticket.positionId], a.share, settledAt, mtx);",
    expect: "R9.6 · ⭐",
    suite: "settle",
  },
  {
    name: "(R6-already) a release that waited behind another places its holds before re-reading the week",
    file: SETTLE,
    from: "      if (current?.state === \"SETTLED\") return { ok: true, week: current, already: true };",
    to: "      void current;",
    expect: "R6.7 · ⭐",
    suite: "settle",
  },
  {
    name: "(R6-already-lift) an `already` answer lifts none of its winners' holds: a hold with no held share stands",
    file: SETTLE,
    from: "      await liftHoldsIfClear(heldAccounts, `Millionea ${first.code} · already settled`);",
    to: "",
    expect: "R6.8 · ⭐",
    suite: "settle",
  },
  /* ── MASWALI-BUILD S7 · the adversarial suite's fixes, one plant each, every one caught by `test:maswali-adversarial`'s
     memory child run on the plant's own section alone (`adversarial:<ids>` passes `--only <ids>`, so a plant costs seconds,
     and §1's minute on the real clock is spent once). ── */
  {
    name: "(S7-move-clock) a move of the close reads the container's clock alone: a slow container moves a close the database passed",
    file: SVC,
    from: "    const atMs = Math.max(nowMs, await dbNowMs(lockTx));",
    to: "    const atMs = nowMs;",
    expect: "CS.3 · ⭐",
    suite: "adversarial:CS",
  },
  {
    name: "(S7-move-names) a close moved past the first event is refused without naming the question (MR-4)",
    file: SVC,
    from: "      return refuse(`The close must stay at least ${rules.minLockBufferMinutes} minutes before the first event. ${slotLabel(first.slot)} starts at ${first.eventStartsAt}.`);",
    to: "      return refuse(`The close must stay at least ${rules.minLockBufferMinutes} minutes before the first event.`);",
    expect: "HF.4",
    suite: "adversarial:HF",
  },
  {
    name: "(S7-correct-ground) a correction voids on 'not played' before the void deadline a seal refuses (MR-15)",
    file: SVC,
    from: [
      "    if (q.sealedBy !== input.officerId) return refuse(\"Only the officer who sealed a question may correct it; anyone else files an objection.\");",
      "    if (input.outcome === \"VOID\" && !voidGroundAvailable(input.voidReason as MaswaliVoidReason, Date.parse(q.voidDeadlineAt), nowMs)) {",
    ].join(LF),
    to: [
      "    if (q.sealedBy !== input.officerId) return refuse(\"Only the officer who sealed a question may correct it; anyone else files an objection.\");",
      "    if (false) {",
    ].join(LF),
    expect: "CV.1",
    suite: "adversarial:RP",
  },
  {
    name: "(S7-correct-evidence) a correction lands with no evidence (MR-14)",
    file: SVC,
    from: "  if (evidence.length < 10) return refuse(\"A correction records its evidence (at least 10 characters).\");",
    to: "",
    expect: "CV.2",
    suite: "adversarial:RP",
  },
  {
    name: "(S7-confirm-holder) an officer holding a ticket in the week gives a seal its second signature (MR-14)",
    file: SVC,
    from: "    if (holds) return refuse(\"An officer who holds a ticket in this week cannot confirm its seals.\");",
    to: "",
    expect: "IN.6 · ⭐",
    suite: "adversarial:IN",
  },
  {
    name: "(S7-week-line) a week whose market is no longer MASWALI is sold as a one-sided Yes/No stake on its pool (MB-01)",
    file: SVC,
    from: "  if (!isFencedMaswali(market)) {",
    to: "  if (false) {",
    expect: "PL.4",
    suite: "adversarial:PL",
  },
  {
    name: "(S7-deposit-hold) a winner whose credited deposit the provider reversed is paid free (MB-74)",
    file: SETTLE,
    from: "  const winners: Winner[] = [], disputed = await depositHolds(winnersGraded.map((g) => g.ticket.userId));",
    to: "  const winners: Winner[] = [], disputed = (_userId: string): HoldReason | null => null;",
    expect: "RD.1",
    suite: "adversarial:RD",
  },
  {
    name: "(S7-memory-set) the memory market store reclassifies a Millionea week on a full-row write from a copy",
    file: "src/lib/server/market-dal.ts",
    from: "    if (cur && cur !== m && (m.productLine ?? \"MARKET\") !== (cur.productLine ?? \"MARKET\") && (m.productLine === \"MASWALI\" || cur.productLine === \"MASWALI\")) return memoryMarkets.set({ ...m, productLine: cur.productLine }, _tx);",
    to: "",
    expect: "PL.2",
    suite: "adversarial:PL",
  },
  {
    name: "(S7-memory-stamp) the memory market store stamps a product line the Postgres twin refuses",
    file: "src/lib/server/market-dal.ts",
    from: "    if (\"productLine\" in fields) throw new Error(\"marketStore.stamp: 'productLine' is not a stampable column (pool/title fields must not be written this way)\");",
    to: "",
    expect: "PL.1",
    suite: "adversarial:PL",
  },
  {
    name: "(S7-promotion) the Owner's staff role change no longer asks OD-12's question before it writes the role",
    file: "src/app/admin/staff/actions.ts",
    from: "      const held = await millioneaPromotionBlock(target.id);",
    to: "      const held = null as string | null;",
    expect: "IN.1b",
    suite: "adversarial:IN",
  },
  /* ── MASWALI-BUILD S7-F · the follow-ups to A7's KNOWN-RED, one plant each, caught on the plant's own section. PL.3 (the
     database's product-line trigger, `20261018130000_maswali_product_line_fence`) is POSTGRES-ONLY, as R4a/R4b and R8 are:
     no memory child can show a trigger red, so its red twin is the Postgres half of test:maswali-adversarial — KNOWN-RED
     before the migration, PL.3 and PL.3c green after it. ── */
  {
    name: "(S7-close-db-clock) a close that is not early is stamped on the container's clock: a fast container closes the sales early (MB-84)",
    file: SVC,
    from: "    if (!input.early && Date.parse(week.closesAt) > atMs) return refuse(\"The close has not arrived on the database's clock (MB-84).\");",
    to: "    if (!input.early && Date.parse(week.closesAt) > nowMs) return refuse(\"The close has not arrived on the database's clock (MB-84).\");",
    expect: "CS.4 · ⭐",
    suite: "adversarial:CS",
  },
  {
    name: "(S7-float-alert) a short payout float reaches the audit trail only, never the console (MB-63)",
    file: "src/lib/server/maswali-console.ts",
    from: "  out.push(...await floatShortAlerts());",
    to: "  void floatShortAlerts;",
    expect: "FL.4 · ⭐",
    suite: "adversarial:GU",
  },
  {
    name: "(S7-designate-ticket) a desk designation meets no Millionea row: an account holding a live ticket is designated (OD-12)",
    file: "src/lib/server/house-bot/eligibility.ts",
    from: "      if (held) blocking.push(row(\"MILLIONEA_TICKET\", \"Holds a Millionea ticket\", held));",
    to: "      void held;",
    expect: "IN.9 · ⭐",
    suite: "adversarial:IN",
  },
  {
    name: "(S7-holiday-review) the pre-open checklist never reads the Owner's holiday list (MB-85)",
    file: "src/lib/server/maswali-console.ts",
    from: "    const holiday = holidayOn(Date.parse(week.closesAt));",
    to: "    const holiday = null as string | null;",
    expect: "HF.2 · ⭐",
    suite: "adversarial:HF",
  },
  {
    name: "(S7-sunset-closed) a week whose sales have closed is made final mid-results (MR-30, the lead's decision of 2026-10-18)",
    file: SVC,
    from: "    if (salesClosed(week, clockMs)) {",
    to: "    if (false) {",
    expect: "SU.2 · ⭐",
    suite: "adversarial:SU",
  },
  {
    name: "(S7-sunset-next-only) any draft, not only the next week to open, is made final at short notice after a close (OD-03)",
    file: SVC,
    from: "        if (onSale || !deciding || next?.id !== week.id) {",
    to: "        if (onSale || !deciding) {",
    expect: "SU.4 · ⛔",
    suite: "adversarial:SU",
  },
  {
    name: "(SF-final-early-open) a final week opens before the time it was announced with (MR-30, OD-03; the S6 legal review)",
    file: SVC,
    from: "    if (week.isFinal && nowMs < Date.parse(week.opensAt)) {",
    to: "    if (false && week.isFinal && nowMs < Date.parse(week.opensAt)) {",
    expect: "SU.5c · ⛔",
    suite: "adversarial:SU",
  },
  {
    name: "(SF-objection-on-sale) a question voids on 'objection upheld' while its week is still on sale (MR-15, MR-16)",
    file: SVC,
    from: "    if (input.outcome === \"VOID\" && input.voidReason === \"criterion_objection\" && week.state === \"OPEN\") {",
    to: "    if (false && input.outcome === \"VOID\" && input.voidReason === \"criterion_objection\" && week.state === \"OPEN\") {",
    expect: "VG.1 · ⛔",
    suite: "adversarial:RP",
  },
  {
    name: "(S7-deadlines-refrozen) the open keeps the deadlines the draft computed: a week runs on figures its frozen rules do not state",
    file: SVC,
    from: "    const { week: due, questions } = deadlinesUnderRules(week, drafted, rules);",
    to: "    const { week: due, questions } = { week, questions: drafted };",
    expect: "DL.1 · ⭐",
    suite: "adversarial:DL",
  },
];
