/**
 * Mutation anchors for `red:withdraw-email-gate` — the confirmed email moved from deposit to withdrawal (2026-10-07).
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on every run WITHOUT executing
 * the harness, so a rewritten source line is caught the day it lands rather than the next time somebody runs the fleet.
 *
 * ── ⭐ WHAT THIS FLEET HAS TO PROVE ───────────────────────────────────────────────────────────────────────────────
 * The owner's ruling has two halves and a consequence, and each can break while everything else keeps working:
 *   1. the withdrawal gate cannot disappear, move in front of identity, swallow the officer's refused-funds return, or
 *      quietly exempt an officer's retry;
 *   2. 🔴 the DEPOSIT email gate cannot come back unseen — the regression a reader of an older document reintroduces;
 *   3. money mail stays off unconfirmed addresses (and off the operator's phone→email map), and a card deposit with no
 *      address still reaches Selcom with the placeholder.
 *
 * ⚠️ The suite runs on the IN-MEMORY store, so every file below is product code that path really executes. `to` strings
 * are plain JavaScript (tsx strips types without checking them; a syntax error would crash, not fail a named check).
 */
const WALLET = "src/lib/server/wallet-service.ts";
const EMAIL = "src/lib/server/email.ts";
const SELCOM = "src/lib/server/selcom.ts";

export const MUTATIONS = [
  {
    name: "withdraw-email-gate-removed",
    why: "The gate deleted outright: a withdrawal leaves an account whose only contact nobody ever confirmed.",
    file: WALLET,
    from: `  if (!refundReturn && !user.emailVerifiedAt) {`,
    to: `  if (false) {`,
    check: "2.1 ★ refused with EMAIL_UNVERIFIED / email_unverified",
  },
  {
    name: "email-gate-before-identity",
    why: "The email asked FIRST. Every refusal still fires, but a player who has done neither is sent to confirm an "
       + "email the screen never asked for (it shows identity first), and `withdraw.kyc_blocked` — the harm count the "
       + "identity queue is ranked by — stops seeing them.",
    file: WALLET,
    from: `  const withdrawGate = await assertIdentityForPayout(userId);`,
    to: `  if (!refundReturn && !user.emailVerifiedAt) return { ok: false, error: "Confirm your email.", code: "EMAIL_UNVERIFIED", reason: "email_unverified" };\n`
      + `  const withdrawGate = await assertIdentityForPayout(userId);`,
    check: "5.1 ★ unverified AND unconfirmed: refused on IDENTITY",
  },
  {
    name: "refused-funds-return-gated",
    why: "The exemption dropped: an officer's return to a finally refused player — whose forfeit has ALREADY committed — "
       + "is refused for an inbox that player can no longer use, turning a return into 'forfeited, payout failed'.",
    file: WALLET,
    from: `  if (!refundReturn && !user.emailVerifiedAt) {`,
    to: `  if (!user.emailVerifiedAt) {`,
    check: "7.1 ★ a return to a finally refused player with an UNCONFIRMED email still leaves",
  },
  {
    name: "operator-retry-exempted",
    why: "It reads as kindness to support staff: an officer's retry slips past the rule that governs the player whose "
       + "money it re-sends.",
    file: WALLET,
    from: `  if (!refundReturn && !user.emailVerifiedAt) {`,
    to: `  if (!refundReturn && !operatorInitiated && !user.emailVerifiedAt) {`,
    check: "4.retry · ★ an officer re-sending a player's withdrawal meets the same rule",
  },
  {
    name: "email-refusal-unrecorded",
    why: "The refusal stops writing its COMPLIANCE row: players are still refused, and nobody can count how many.",
    file: WALLET,
    from: `      action: "withdraw.email_unverified_blocked",`,
    to: `      action: "withdraw.refused",`,
    check: "2.4 ⭐ one COMPLIANCE row withdraw.email_unverified_blocked, citing the 2026-10-07 ruling",
  },
  {
    name: "deposit-email-gate-restored",
    why: "🔴 The pre-2026-10-07 deposit door, put back where it stood (before the reserving lock). It reads as prudence "
       + "and reverses the owner's ruling: \"even if no mail was there\", a deposit must go through.",
    file: WALLET,
    from: `  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;`,
    to: `  if (!depositor?.emailVerifiedAt) return { ok: false, error: "Confirm your email before you deposit.", code: "EMAIL_UNVERIFIED" };\n`
      + `  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600_000;`,
    check: "1.weg_dep_none · the deposit goes through",
  },
  {
    name: "money-mail-to-unconfirmed",
    why: "`confirmedOnly` ignored: a statement of a player's money goes to an address nobody proved is theirs.",
    file: EMAIL,
    from: `    if (opts.confirmedOnly && user?.email && !user.emailVerifiedAt && !CANNOT_SIGN_IN.has(String(user.status))) {`,
    to: `    if (false) {`,
    check: "8.1 ★ a money mail to an UNCONFIRMED address is withheld",
  },
  {
    name: "locked-out-player-silenced",
    why: "The exception for accounts that cannot sign in is dropped: a deposit reversed during a self-exclusion is told to nobody (no bell they can open, no letter).",
    file: EMAIL,
    from: `    if (opts.confirmedOnly && user?.email && !user.emailVerifiedAt && !CANNOT_SIGN_IN.has(String(user.status))) {`,
    to: `    if (opts.confirmedOnly && user?.email && !user.emailVerifiedAt) {`,
    check: "8.7 ★ an account that cannot sign in",
  },
  {
    name: "break-counted-as-locked-out",
    why: "A cooling-off break is treated as a locked-out account: money mail goes to an unconfirmed address for a player who can sign in and read the bell.",
    file: EMAIL,
    from: `export const CANNOT_SIGN_IN: ReadonlySet<string> = new Set(["SELF_EXCLUDED", "CLOSED", "SUSPENDED"]);`,
    to: `export const CANNOT_SIGN_IN: ReadonlySet<string> = new Set(["SELF_EXCLUDED", "CLOSED", "SUSPENDED", "COOLED_OFF"]);`,
    check: "8.8 control · a player on a BREAK",
  },
  {
    name: "phone-map-for-money-mail",
    why: "The operator's phone→email override answers for a money mail — an address no player ever confirmed.",
    file: EMAIL,
    from: `    const email = user?.email || (opts.confirmedOnly ? "" : resolvePhoneEmail(user?.phoneE164 ?? ""));`,
    to: `    const email = user?.email || resolvePhoneEmail(user?.phoneE164 ?? "");`,
    check: "8.5 ⛔ PHONE_EMAIL_MAP is never used for money mail",
  },
  {
    name: "card-placeholder-dropped",
    why: "A card order with no address on file goes to Selcom with an empty buyer_email — the field the gateway requires.",
    file: SELCOM,
    from: `    buyer_email: opts.buyerEmail || selcomPlaceholderEmail(opts.userId),`,
    to: `    buyer_email: opts.buyerEmail,`,
    check: "9.1 ★ no address on file: the order still goes, carrying the placeholder",
  },
];
