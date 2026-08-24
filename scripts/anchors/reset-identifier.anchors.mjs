/**
 * THE ANCHORS `red:reset-identifier` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Recovery accepts a phone OR an email as of 2026-08-25. Each mutation restores one
 * of the four ways that can silently regress, and `test:reset-identifier` must go RED
 * on every one.
 *
 * ⭐ THE THIRD IS THE ONE TO READ. `enumeration-oracle` makes the function THROW on an
 * unknown address instead of returning ok. That is not a crash — the action would still
 * redirect — but the timing and error shape differ from a hit, and one unauthenticated
 * request per address would then reveal whether a Tanzanian mobile has a gambling
 * account. A guard that only checked "the happy path sends a link" would stay green
 * through it, which is why §5 asserts the NEGATIVE branches and carries its own control.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF and these declarations are LF, so a
 * multi-line anchor cannot match and the replace becomes a silent no-op — which reads
 * as "the guard failed to catch the defect" rather than "the harness never ran".
 * `red:payout-alloc` hit exactly that and REFUSED; the lesson is copied here.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

const PR = "src/lib/server/password-reset.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "phone-only-lookup",
    why: "⭐ THE PRE-2026-08-25 STATE: an address never reaches an account, so a player who registered with an email and remembers only that has no route back in — while sign-in one click away offers them a Phone/Email switcher",
    file: PR,
    suite: "reset-identifier",
    from: `      ? await db.user.findAllByEmail(resolved.value, RESET_EMAIL_CANDIDATE_CAP)`,
    to: `      ? []`,
  },
  {
    name: "first-account-only",
    why: "a shared address resolves to whichever account comes back first, silently stranding every other owner of that address — and one production address is on FOUR accounts",
    file: PR,
    suite: "reset-identifier",
    from: `      ? await db.user.findAllByEmail(resolved.value, RESET_EMAIL_CANDIDATE_CAP)`,
    to: `      ? (await db.user.findAllByEmail(resolved.value, RESET_EMAIL_CANDIDATE_CAP)).slice(0, 1)`,
  },
  {
    name: "enumeration-oracle",
    why: "⛔ an unknown identifier THROWS instead of returning ok — the page still redirects, so nothing looks broken, but the error shape and timing now differ from a hit and one request per address reveals whether that person has a gambling account",
    file: PR,
    suite: "reset-identifier",
    // ⚠️ The replacement must NOT contain the anchor. A first draft used
    // `if (!users.length) { throw …`, which is a SUPERSET of the anchor — the
    // mutation applied correctly but the harness's did-it-reach-disk check still
    // found the anchor and refused. Refusing was right; the mutation was wrong.
    from: `  if (!users.length) {`,
    to: `  if (users.length === 0) { throw new Error("no such account");`,
  },
  {
    name: "no-email-guard-removed",
    why: "an account with NO address on file no longer short-circuits, so the mailer is handed an empty recipient — the send is attempted, the `password_reset.no_email` audit row is never written, and an operator loses the only signal that a player is stuck with no recovery route at all",
    file: PR,
    suite: "reset-identifier",
    from: `    if (!email) {`,
    to: `    if (false) {`,
  },
];
