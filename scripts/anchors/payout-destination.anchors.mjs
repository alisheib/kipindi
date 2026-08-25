/**
 * THE ANCHORS `red:payout-destination` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once WITHOUT
 * executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * `E-215` — a withdrawal may only be paid to the number the account is registered to. Until
 * 2026-08-25 nothing enforced it and 7 of 25 lifetime withdrawals had already gone elsewhere,
 * 6 CONFIRMED, one of them a digit transposition.
 *
 * ⭐ THE LAST ONE IS THE POSITIVE CONTROL AND IT IS THE OWNER'S OWN SUGGESTION:
 * `refuse-everything` refuses EVERY destination including the registered one. It keeps the law
 * perfectly — no payout can ever reach a wrong number — and breaks withdrawals entirely. A
 * suite that only ever asks "was the wrong number refused?" scores it as a triumph. §1 is what
 * stands between that and a green report on a product nobody can take money out of.
 *
 * ⭐ AND `coerce-instead-of-refuse` IS THE ONE WORTH READING TWICE. It makes a mismatched
 * destination silently succeed *to the registered number* — the law is kept, the money lands
 * in the right place, and the player is never told that what they asked for was not what
 * happened. That is `resolvePublishCategory`'s trap, which this campaign paid for in session
 * 62: **being quietly given something else is not the same as being told no.** Every
 * "the payout went to the registered number" assertion passes.
 *
 * ⭐ `hold-before-seal` is the one the ordering assertion exists for. It moves a debit ABOVE the
 * check, which is the shape that debits a player for a payout that was never allowed to leave
 * — and it is invisible to every behavioural assertion in §1–§3, because the RULE is still
 * perfect. Only the order is wrong.
 *
 * ⚠️ Anchors are resolved through `red-anchor.mjs`, which normalises line endings, so a
 * multi-line anchor is safe here; none is needed. ⛔ No replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const SVC = "src/lib/server/wallet-service.ts";
const RULE = "src/lib/payout-destination.ts";
const DICT = "src/lib/i18n-dict.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "accept-any",
    why: "🔴 THE ORIGINAL `E-215` DEFECT, restored exactly: the service stops comparing the destination to the account and dispatches whatever the form sent. This is what production did for 25 withdrawals",
    file: SVC,
    suite: "payout-destination",
    from: `  const destination = payoutDestinationFor(user.phoneE164, parse.data.msisdn);`,
    to: `  const destination = { ok: true as const, msisdn: parse.data.msisdn ?? "", last4: "" };`,
    expect: "4: `withdraw()` calls the rule",
  },
  {
    name: "seal-never-fires",
    why: "the rule is still called and its answer is still computed — it is simply never acted on. The import, the call and the audit block all survive a source review; only the branch is dead",
    file: SVC,
    suite: "payout-destination",
    from: `  if (!destination.ok) {`,
    to: `  if (destination.ok === undefined) {`,
    expect: "4: …and refuses when it says no",
  },
  {
    name: "hold-before-seal",
    why: "⭐ the RULE stays perfect and only the ORDER is wrong — a debit lands above the check, so a refused payout has already taken the player's balance into `hold` with no txn row to reverse it. Every assertion in §1–§3 still passes",
    file: SVC,
    suite: "payout-destination",
    from: `  const destination = payoutDestinationFor(user.phoneE164, parse.data.msisdn);`,
    to: `  await db.wallet.adjust("premature", { balance: -1 });\n  const destination = payoutDestinationFor(user.phoneE164, parse.data.msisdn);`,
    expect: "4: ⭐ the seal runs BEFORE the balance is moved into hold",
  },
  {
    name: "refusal-not-recorded",
    why: "the refusal works and nothing counts it. This is how `E-215` stayed invisible: every mismatched payout was in the ledger and no query anywhere asked whether the destination matched the account",
    file: SVC,
    suite: "payout-destination",
    from: `      category: "WALLET", action: "withdraw.destination_refused", actorId: actor,`,
    to: `      category: "WALLET", action: "withdraw.refused", actorId: actor,`,
    expect: "4: the refusal is recorded as a compliance fact",
  },
  {
    name: "deposit-sealed-too",
    why: "⛔ THE MISTAKE IN THE OTHER DIRECTION, and a well-meaning one: the payout rule is applied to DEPOSITS, so a player topping up from a relative's handset is refused their own money. Every withdrawal assertion stays green — a guard that only knew one direction would call this a hardening",
    file: SVC,
    suite: "payout-destination",
    from: `  const result = await dispatchDeposit({ provider: parse.data.provider, amount: parse.data.amount, msisdn: parse.data.msisdn, userId, card, correlationId });`,
    to: `  if (!payoutDestinationFor("", parse.data.msisdn).ok) return { ok: false as const, error: "no", code: "INVALID" as const };\n  const result = await dispatchDeposit({ provider: parse.data.provider, amount: parse.data.amount, msisdn: parse.data.msisdn, userId, card, correlationId });`,
    expect: "6: ⛔ `deposit()` does NOT apply the payout-destination rule",
  },
  {
    name: "coerce-instead-of-refuse",
    why: "⭐ a mismatch quietly SUCCEEDS to the registered number. The law is kept and the money lands correctly; the player is simply never told that what they asked for is not what happened. `resolvePublishCategory`'s trap, on a payout",
    file: RULE,
    suite: "payout-destination",
    from: `  if (want !== registered) return { ok: false, refusal: "not_registered", last4 };`,
    to: `  if (want !== registered) return { ok: true, msisdn: registered, last4 };`,
    expect: "3: ⛔ a mismatch REFUSES; it is never corrected to the registered number",
  },
  {
    name: "fails-open-no-account",
    why: "an account with no usable registered number stops being refused as unverifiable and falls through to the ordinary comparison — so the one case where nothing CAN be checked is the one case that is not checked",
    file: RULE,
    suite: "payout-destination",
    from: `  if (registered.length !== 9) return { ok: false, refusal: "no_registered_number", last4 };`,
    to: `  if (registered.length !== 9 && submitted === "__unreachable__") return { ok: false, refusal: "no_registered_number", last4 };`,
    expect: `3: ⛔ an account whose number is "" cannot withdraw at all`,
  },
  {
    name: "compare-the-spelling",
    why: "🔴 the comparison keys on the SPELLING instead of the number, so a player who types the leading zero on their own number is refused their own money. `+255712000101`, `255712000101`, `0712000101` and `712000101` are one number written the four ways `tzPhone` accepts — and this campaign has now keyed a count on a spelling and been wrong three separate times",
    file: RULE,
    suite: "payout-destination",
    from: `  const want = normalizeTzLocalDigits(submitted ?? "");`,
    to: `  const want = String(submitted ?? "");`,
    expect: "1: the registered number is accepted written as 0712000101",
  },
  {
    name: "last4-of-submitted",
    why: "the refusal names the last four of the number that was JUST TYPED instead of the registered one — so it tells the player what they already know and never says where the money is actually allowed to go. On the real transposition it would read `9754` for an account ending `9354`",
    file: RULE,
    suite: "payout-destination",
    from: `  const last4 = registered.slice(-4);`,
    to: `  const last4 = normalizeTzLocalDigits(submitted ?? "").slice(-4);`,
    expect: "2: ⭐ …naming the REGISTERED last four (9354), never the submitted one (9754)",
  },
  {
    name: "copy-drops-last4",
    why: "one translation loses the `{last4}` placeholder, so a Swahili reader gets a refusal that never names the number the money may go to — exactly the bare 'invalid' the owner ruled out. `test:i18n` counts KEYS and stays green",
    file: DICT,
    suite: "payout-destination",
    from: `      failPayoutDestination: "Kwa usalama wako, malipo yanaweza kwenda tu kwenye namba iliyosajiliwa kwenye akaunti hii, inayoishia {last4}. Wasiliana na msaada ikiwa namba hiyo imebadilika.",`,
    to: `      failPayoutDestination: "Kwa usalama wako, malipo yanaweza kwenda tu kwenye namba iliyosajiliwa kwenye akaunti hii. Wasiliana na msaada ikiwa namba hiyo imebadilika.",`,
    expect: "5: ⛔ sw copy names the registered last four",
  },
  {
    // ⭐ THE POSITIVE CONTROL, and it is the owner's own: "refuse every destination, including
    // the registered one". It keeps the law perfectly and breaks withdrawals entirely.
    name: "refuse-everything",
    why: "⭐ POSITIVE CONTROL · EVERY destination is refused, the registered number included. No payout can ever reach a wrong number, so a suite that only asks 'was the wrong number refused?' scores this as a total success — while nobody on the platform can withdraw at all",
    file: RULE,
    suite: "payout-destination",
    from: `  if (want !== registered) return { ok: false, refusal: "not_registered", last4 };`,
    to: `  if (want !== registered || true) return { ok: false, refusal: "not_registered", last4 };`,
    expect: "1: the registered number is accepted written as 712000101",
  },
];
