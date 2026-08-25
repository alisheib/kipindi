/**
 * WHERE A PAYOUT IS ALLOWED TO GO — `E-215`, and it is the owner's law, not a preference.
 *
 * > *"For withdrawal the only accepted number is his registered number — that is the law.
 * >  But deposit he can: put by default the one he registered with, and an option to use
 * >  another number."*  — Ali, 2026-08-25
 *
 * ⭐ THE ARGUMENT FOR THE RULE CAME OUT OF THE DATA, NOT THE STATUTE. Re-derived from
 * production on 2026-08-25: of 25 lifetime withdrawals, **7 went to a number other than the
 * account's registered one and 6 of those CONFIRMED** — money actually left. Read the roles
 * before quoting that as harm, because three of the seven are one operator's two ADMIN
 * accounts (`+255757619808` and `+255772619619` are both Jaykishan Kaba) moving test money
 * between numbers he owns. The genuine exposure is smaller and worse:
 *
 *   · `+255690979354` → `+255690939754` · 2 confirmed · TZS 7,000 · ⭐ A DIGIT TRANSPOSITION
 *   · `+255769434985` → `+255783160044` · 2 confirmed · TZS 8,000
 *
 * — 4 confirmed payouts, TZS 15,000, from two real PLAYER accounts, to numbers belonging to
 * no account on this platform. ⭐ **Read the first row again: `979354` → `939754` swaps two
 * digits.** That is not a player choosing another wallet, it is a player who mistyped their
 * own number and paid a stranger — and the platform had no reason to stop them, because a
 * free-text destination has no correct value to compare against. This file gives it one.
 *
 * ⛔ IT REFUSES; IT DOES NOT CORRECT. Coercing a mismatched destination to the registered
 * number would "keep the law" and be the worse product: the player would be told their
 * payout succeeded, having asked for something else, with nothing anywhere recording that
 * they asked. That is exactly the `resolvePublishCategory` trap this campaign paid for in
 * session 62 — **being quietly given something else is not the same as being told no.**
 *
 * ⛔ AND IT FAILS CLOSED. An account with no usable registered number cannot have a
 * destination verified, so it cannot withdraw. On a money-OUT path the safe direction of an
 * unanswerable question is refusal; every other choice pays somebody on a guess.
 *
 * ⚠️ THE COMPARISON IS ON THE NUMBER, NEVER ON ITS SPELLING. `+255712000101`,
 * `255712000101`, `0712000101` and `712000101` are ONE number written four ways — the four
 * shapes `tzPhone` accepts — so both sides are reduced through `normalizeTzLocalDigits`
 * first. A string compare would refuse a player their own money for typing the leading zero,
 * and "a count keyed on a spelling" is a mistake this campaign has now made in three separate
 * places. The normaliser is not re-implemented here; there is one of it.
 *
 * ⛔ DEPOSITS DO NOT COME THROUGH HERE, DELIBERATELY. Money arriving from a friend's handset
 * is ordinary and blocking it would break real top-ups. The asymmetry IS the rule: the risk
 * is money leaving to a number the account holder does not control, and only one direction
 * has that risk. Deposit prefills the registered number and offers "use another number";
 * withdrawal states it and enforces it.
 *
 * PURE and EXPORTED so a guard can drive every branch without a browser or a database —
 * `npm run test:payout-destination`, proven by `npm run red:payout-destination`.
 */
import { normalizeTzLocalDigits } from "./phone-normalize";

/** Why a destination was refused. One machine token per branch; never prose. */
export type PayoutDestinationRefusal =
  /** The submitted destination is not the account's registered number. The rule. */
  | "not_registered"
  /** Nothing was submitted at all. */
  | "missing"
  /** The ACCOUNT has no usable registered number, so nothing can be verified. Fail closed. */
  | "no_registered_number";

export type PayoutDestination =
  | { ok: true; msisdn: string; last4: string }
  | { ok: false; refusal: PayoutDestinationRefusal; last4: string };

/**
 * The last four digits of a number, for naming it in a refusal without reprinting it whole.
 *
 * ⚠️ FOUR, AND IT IS NOT ARBITRARY — it is the width that separates the real cases. The
 * transposition on production is `…979354` against `…939754`: last-4 reads `9354` against
 * `9754`, which a player can tell apart at a glance. Returns whatever is there when the
 * number is shorter, rather than padding a fiction.
 */
export function last4Of(phone: string | null | undefined): string {
  return normalizeTzLocalDigits(phone ?? "").slice(-4);
}

/**
 * Decide where this payout may go.
 *
 * @param registeredPhoneE164 the number ON THE ACCOUNT — the only correct answer.
 * @param submitted whatever the form sent, in any of the four shapes `tzPhone` accepts.
 * @returns the canonical 9-digit destination, or a refusal naming the registered last four.
 *
 * ⚠️ `last4` is ALWAYS the REGISTERED number's, on success and on refusal alike — including
 * the `missing` and `no_registered_number` branches, where the caller has nothing else to
 * name. A refusal that echoed the digits the player just typed would be telling them what
 * they already know instead of where the money is actually allowed to go.
 */
export function payoutDestinationFor(
  registeredPhoneE164: string | null | undefined,
  submitted: string | null | undefined,
): PayoutDestination {
  const registered = normalizeTzLocalDigits(registeredPhoneE164 ?? "");
  const last4 = registered.slice(-4);

  // Fail closed: no verifiable registered number means no verifiable destination.
  // ⚠️ 9 digits exactly — `normalizeTzLocalDigits` truncates but does not pad, so a
  // short or empty stored value arrives here as a short string, not as a throw.
  if (registered.length !== 9) return { ok: false, refusal: "no_registered_number", last4 };

  const want = normalizeTzLocalDigits(submitted ?? "");
  if (!want) return { ok: false, refusal: "missing", last4 };
  if (want !== registered) return { ok: false, refusal: "not_registered", last4 };

  // ⛔ Return the REGISTERED digits, not the submitted ones. They are equal as numbers by
  // the line above, and they can still differ as strings (`0712…` vs `712…`); handing back
  // the canonical form means the value written to the ledger and dispatched to the rail is
  // the account's own, in one shape, whatever the player typed.
  return { ok: true, msisdn: registered, last4 };
}
