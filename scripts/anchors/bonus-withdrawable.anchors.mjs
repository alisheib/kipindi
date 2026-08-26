/**
 * Mutation anchors for `red:bonus-withdrawable` — the bonus/payout boundary.
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on
 * every run, WITHOUT executing the harness, and holds a ceiling of undeclared harnesses that
 * may only shrink. This file exists because inline anchors rot silently: three in
 * `updown-push-red.mjs` went stale against rewritten code on 2026-08-22 and the harness went
 * on reporting catches.
 *
 * 🔴 AND THIS FLEET PROVED THE POINT ON THE DAY IT WAS WRITTEN. `E-223` rewrote
 * `wallet-service.ts`'s insufficient-balance refusal from an inline object literal to
 * `return shortOfFunds(w, amount)` — the exact text two of these mutations anchored on. Both
 * reported **`HARNESS ERROR: anchor not found`** rather than silently editing nothing and
 * calling the guard weak. With the anchors declared here, `test:red-anchors` would have caught
 * the same drift statically, in under a second, without anyone running the harness at all.
 *
 * ⭐ THE ONE TO READ FIRST is `the-bonus-becomes-spendable`. It is the defect the guarded suite
 * exists for, and it is a change somebody would make on purpose: *"the player's wallet shows
 * 13,000 — let them withdraw 13,000"* is a reasonable-sounding ticket that repeals the entire
 * wagering requirement in one edit. ⛔ Note it carries a `combineInto` partner: the balance is
 * guarded TWICE, and a mutation that removes only the first control leaves the second standing,
 * the suite green, and the harness reporting a miss against a platform that is safe. **A
 * mutation must remove the whole control, not the first line of it.**
 */
const WALLET = "src/lib/server/wallet-service.ts";
const BONUS = "src/lib/server/bonus-service.ts";

export const MUTATIONS = [
  {
    name: "the-bonus-becomes-spendable",
    why: "⭐ THE DEFECT THIS SUITE EXISTS FOR — both balance controls move to balance+bonus, so "
       + "every grant is cash on arrival and the wagering requirement is repealed platform-wide.",
    file: WALLET,
    from: "    if (w.balance < amount) return shortOfFunds(w, amount);",
    to: "    const spendable = w.balance + (w.bonusBalance ?? 0);\n"
      + "    if (spendable < amount) return shortOfFunds(w, amount);",
    check: "1.1 · ★★ a wallet holding 10,000 of BONUS is refused a 10,000 payout",
  },
  {
    // ⛔ THE SECOND HALF OF THE MUTATION ABOVE, not a mutation of its own. Applied together
    // with it, never alone — see the header: one control removed is not a repealed rule.
    name: "the-atomic-debit-spends-the-bonus-too",
    combineInto: "the-bonus-becomes-spendable",
    why: "the atomic `requireBalanceGte` guard is the SECOND control and returns the identical "
       + "refusal; without this half the rule still holds and the harness would report a miss "
       + "against a working platform.",
    file: WALLET,
    from: "    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount });",
    to: "    const updated = await db.wallet.adjust(w.id, { balance: -Math.min(amount, w.balance), bonusBalance: -Math.max(0, amount - w.balance), hold: amount });",
  },
  {
    name: "fulfilment-credits-nothing",
    why: "the grant still FULFILS on turnover but the unspent remainder never reaches the real "
       + "balance — a player completes the requirement and is paid nothing, which no "
       + "balance-only assertion elsewhere in the repository can see.",
    file: BONUS,
    from: "      const moved = g.remainingTzs;",
    to: "      const moved = 0; void g.remainingTzs;",
    check: "3.3 · the money changed BUCKET — bonusBalance 10,000 → 0, balance 0 → 10,000",
  },
  {
    name: "requirement-off-by-one",
    why: "★ turnover must EXCEED the requirement rather than meet it, so a player who wagers "
       + "exactly what was asked is never released — the support-ticket defect nobody reports "
       + "as a bug.",
    file: BONUS,
    from: "    if (newWagered >= g.wagerRequiredTzs) {",
    to: "    if (newWagered > g.wagerRequiredTzs) {",
    check: "4.3 · the fiftieth-thousandth shilling FULFILS it",
  },
  {
    name: "unlock-is-not-a-bonus-credit",
    why: "the money moves but the ledger calls it something else — the balance is right and the "
       + "platform can no longer say WHY it changed, which is the provenance rule unit I states "
       + "for the Selcom page one product over.",
    file: BONUS,
    from: `          type: "BONUS_CREDIT",`,
    to: `          type: "ADJUSTMENT",`,
    check: "5.4 · ★★ exactly ONE BONUS_CREDIT was written, CONFIRMED, for the unspent remainder",
  },
  {
    name: "the-refusal-says-nothing-again",
    why: "⭐ `E-223` VERBATIM — the reason is dropped, `errorCopy` falls through to the generic "
       + `"That didn't go through. Check the details and try again.", and the commonest refusal `
       + "on the money-out screen explains nothing. This is what production actually answered.",
    file: WALLET,
    from: `    reason: bonusExplainsIt ? ("withdraw_bonus_locked" as const) : ("withdraw_balance_insufficient" as const),`,
    to: `    /* reason removed */`,
    check: "7.1 · ★★ the refusal carries a machine reason, so it can be minted in the player's language",
  },
  {
    name: "the-refusal-names-the-wallet-total",
    why: "🔴 THE WORST VERSION OF THE FIX — the sentence offers `balance + bonusBalance`, so a "
       + "player holding 3,000 of cash and 10,000 of locked bonus is told they may withdraw "
       + "13,000. A false money figure, stated confidently, on a money screen.",
    file: WALLET,
    from: "    detail: { balance: w.balance, needed: amount },",
    to: "    detail: { balance: w.balance + bonus, needed: amount },",
    check: "7.3 · ★★ the figure offered is the WITHDRAWABLE balance, not the wallet total",
  },
  {
    name: "every-shortfall-blames-the-bonus",
    why: "⚠️ THE OVER-CORRECTION — the bonus branch drops its \"does it actually close the gap\" "
       + "test, so a player asking for far more than cash AND bonus is lectured about a wagering "
       + "requirement that is not why they were refused.",
    file: WALLET,
    from: "  const bonusExplainsIt = bonus > 0 && amount <= w.balance + bonus;",
    to: "  const bonusExplainsIt = bonus > 0;",
    check: "7.10 · ★ CONTROL — asking beyond cash+bonus is the plain shortfall",
  },
  {
    name: "the-two-sentences-swap",
    why: "★ the branches invert, so a player with a locked bonus gets the plain shortfall and a "
       + "player with none is told about a wagering requirement they do not have — green on any "
       + "check that only asks whether SOME reason was returned.",
    file: WALLET,
    from: `    reason: bonusExplainsIt ? ("withdraw_bonus_locked" as const) : ("withdraw_balance_insufficient" as const),`,
    to: `    reason: bonusExplainsIt ? ("withdraw_balance_insufficient" as const) : ("withdraw_bonus_locked" as const),`,
    check: "7.2 · ★ …and it is the BONUS one, because the locked bonus is exactly what closes the gap",
  },
  {
    name: "identity-gate-restored",
    why: "⚠️ Board comment #1 silently reverts — withdrawal is KYC-gated again. Every money rule "
       + "in the suite would still pass; only §6 can see it.",
    file: WALLET,
    from: `    if (w.status !== "ACTIVE") return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };`,
    to: `    if ((w.status !== "ACTIVE")) return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };\n`
      + `    if (kycStatus !== "APPROVED") return { ok: false as const, error: "Verify your identity first.", code: "INVALID" as const };`,
    check: "6.2 · ★★ …and an account with no identity record at all is still paid",
  },
];
