/**
 * Mutation anchors for `red:rg-doors` — the sign-in gate (E-240), the self-exclusion
 * ruling (E-238 login half), and the session limit that was never enforced (E-235).
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` re-resolves every anchor below on every
 * run WITHOUT executing the harness, so an anchor that rots against edited source is caught
 * statically in a second rather than surfacing later as a phantom catch.
 *
 * ── ⭐ WHAT THIS FLEET IS AIMED AT ─────────────────────────────────────────────────────────
 * Three families, and the first is the one the guard exists for:
 *
 *   1. A DOOR STOPS CALLING THE GATE. This is the E-240 defect exactly: the gate was correct,
 *      `verifyOtpAndAuth` simply never called it, and every behavioural test of the gate stayed
 *      green while a self-excluded player signed in through the OTP door. A mutation that
 *      deletes a call — not one that breaks the gate — is the only honest test of §2.
 *   2. THE ASYMMETRY COLLAPSES. Cooling-off ends on its timer; self-exclusion does not. Both
 *      directions are mutated, because collapsing them EITHER way is a real defect: bar a
 *      cooled-off player from their own account, or readmit an excluded one.
 *   3. THE LIMIT GOES BACK TO BEING DECORATION. E-235's whole finding was a value that was
 *      stored, displayed and REPORTED while nothing consulted it, so the mutation makes the
 *      check answer "no opinion" — which is what it did for the platform's entire life.
 */
const AUTH = "src/lib/server/auth-service.ts";
const RG = "src/lib/server/responsible-gambling.ts";
const MARKET = "src/lib/server/market-service.ts";
const LOGIN_ACTION = "src/app/auth/login/actions.ts";
const LOGIN_PAGE = "src/app/auth/login/page.tsx";
const MKT_RG = "src/lib/server/marketing/rg.ts";
const MKT_GATE = "src/lib/server/marketing/consent.ts";

export const MUTATIONS = [
  // ── 1 · a door stops calling the gate ────────────────────────────────────────────────────
  {
    name: "the-otp-door-stops-reading-account-status",
    why: "🔴 E-240 ITSELF, RESTORED. `verifyOtpAndAuth` mints a session for an existing user; "
       + "removing this call is precisely the state the platform shipped in, and it is invisible "
       + "to any test of the gate function because the gate is untouched and still correct.",
    file: AUTH,
    from: `    const otpGate = await assertSignInAllowed(user);
    if (otpGate) return otpGate;`,
    to: `    const otpGate = null;
    if (otpGate) return otpGate;`,
    check: "2.1 verifyOtpAndAuth() mints a session AND consults the gate",
  },
  {
    name: "the-password-door-stops-reading-account-status",
    why: "The same deletion on the door that DID have a gate before this work. If §2 only "
       + "noticed the OTP door it would be a check written to the one bug it already knew about.",
    file: AUTH,
    from: `  const passwordGate = await assertSignInAllowed(freshUser);
  if (passwordGate) return passwordGate;`,
    to: `  const passwordGate = null;
  if (passwordGate) return passwordGate;`,
    check: "2.1 loginWithPassword() mints a session AND consults the gate",
  },
  {
    name: "the-2fa-door-stops-reading-account-status",
    why: "⭐ THE QUIETEST OF THE THREE. 2FA completion runs after the password step has already "
       + "passed, so it is the easiest place to argue a gate is redundant — and it is not: the "
       + "account can be self-excluded between the password and the code.",
    file: AUTH,
    from: `  const twoFactorGate = await assertSignInAllowed(user);
  if (twoFactorGate) return twoFactorGate;`,
    to: `  const twoFactorGate = null;
  if (twoFactorGate) return twoFactorGate;`,
    check: "2.1 completeTwoFactorLogin() mints a session AND consults the gate",
  },

  // ── 2 · the asymmetry collapses, in both directions ──────────────────────────────────────
  {
    name: "a-cooling-off-break-locks-the-player-out-of-their-own-account",
    why: "⛔ THE KIND, WRONG EDIT. Adding COOLED_OFF to the sign-in gate looks like consistency "
       + "and is a harm: a player who took a one-hour break to protect themselves could not read "
       + "its end date, see their balance, or withdraw. §2.5 exists to make this unmergeable.",
    file: AUTH,
    from: `  if (user.status !== "SELF_EXCLUDED") return null;`,
    to: `  if (user.status === "COOLED_OFF") {
    return { ok: false, error: "Account unavailable. Contact support.", code: "SUSPENDED" };
  }
  if (user.status !== "SELF_EXCLUDED") return null;`,
    check: "2.5 ⛔ the sign-in gate does NOT block COOLED_OFF",
  },
  {
    name: "a-served-self-exclusion-reports-itself-as-over",
    why: "🔴 ALI'S RULING REVERSED IN ONE LINE. Returning `none` once the timer passes is the "
       + "auto-lift he ruled against — and it is the shape cooling-off legitimately has, so it "
       + "is the mistake a tidy-minded refactor actually makes.",
    file: RG,
    from: `  return { state: "minimum_served", until };`,
    to: `  return { state: "none" };`,
    check: "1.5 ⭐ a period that has RUN OUT is minimum_served",
  },

  // ── 3 · the limit goes back to being decoration ──────────────────────────────────────────
  {
    name: "the-session-limit-stops-having-an-opinion",
    why: "🔴 E-235's ORIGINAL STATE. The value stays settable, stays on the player page and stays "
       + "counted by the Board-facing RG report — and nothing consults it. The report goes on "
       + "saying the player set a limit while six hours of play go through.",
    file: RG,
    // ⚠️ RE-ANCHORED 2026-09-23. E-408's per-player play clock (2026-09-14) renamed `Date.now()` to `now`
    //    and `playStartedAt` to `start` in this return, and this anchor was never moved with it. `injectDefect`
    //    throws on an anchor it cannot find, so the case was LOUD rather than silently green — but the whole
    //    suite was red for other reasons, so nobody read it. ⛔ A RED control for a Board-facing responsible
    //    gambling guarantee had been unable to fire for nine days. The mutation is unchanged: `exceeded` is
    //    pinned false, so the limit keeps its value, keeps showing on the player page and keeps being reported,
    //    and simply stops refusing anything.
    from: `  const playedMin = Math.floor((now - start) / 60_000);
  return { exceeded: playedMin >= limitMin, limitMin, playedMin };`,
    to: `  const playedMin = Math.floor((now - start) / 60_000);
  return { exceeded: false, limitMin, playedMin };`,
    check: "4.1 ⭐ forty-five minutes into a thirty-minute limit, the bet is REFUSED",
  },
  {
    name: "the-login-screen-goes-back-to-matching-prose",
    why: "🔴 MEASURED ON PRODUCTION 2026-08-28. Choosing the banner with `/self-exclusion/i` over "
       + "the refusal's English sentence showed a player whose period had ENDED *\"you will not be "
       + "able to sign in until the period ends\"*, and dropped a player still SERVING onto the "
       + "generic blocked screen — because their sentence says \"self-excluded\". One regex, two "
       + "wrong answers, in opposite directions. This is the `E-234` shape at the auth door.",
    file: LOGIN_ACTION,
    from: `    const standing = result.detail?.standing;
    if (result.code === "SUSPENDED" && standing && standing !== "diverged") {`,
    to: `    const standing = /self-exclusion/i.test(result.error) ? "1" : undefined;
    if (result.code === "SUSPENDED" && standing && standing !== "diverged") {`,
    check: "6.1 ⛔ the password door does NOT phrase-match",
  },
  {
    name: "the-otp-door-flattens-an-exclusion-into-that-didnt-work",
    why: "⛔ THE REGRESSION `E-240`'s OWN FIX INTRODUCED, and the one a checkup found rather than "
       + "a test. Moving the exclusion check off the OTP REQUEST onto the VERIFY is right — the "
       + "code is the proof of ownership — but the verify hop maps unknown codes to "
       + "`error=failed`, so the player who had JUST proved the number was theirs was told only "
       + "*\"that didn't work\"*: no exclusion, no end date, no way back. Fixing one screen must "
       + "not darken the one beside it.",
    file: LOGIN_ACTION,
    from: `    if (result.code === "SUSPENDED") {`,
    to: `    if (result.code === "__never__") {`,
    check: "6.8 a SUSPENDED refusal on the OTP door routes to the exclusion panels",
  },
  {
    name: "a-served-exclusion-is-told-to-wait-for-a-date-that-has-passed",
    why: "⛔ ALI'S RULING ERASED FROM THE ONE SCREEN THE PLAYER ACTUALLY SEES. Collapsing the "
       + "three panels back into one leaves somebody who has served their period waiting for a "
       + "date that is already behind them, with no way back offered.",
    file: LOGIN_PAGE,
    from: `    if (sp.excluded === "minimum_served") return {`,
    to: `    if (sp.excluded === "__never__") return {`,
    check: "6.4 the screen has a distinct panel for a period that has ENDED",
  },
  {
    name: "the-session-limit-becomes-unbounded-again",
    why: "⭐ THE STATE THIS FIELD WAS IN UNTIL ENFORCEMENT SHIPPED. `ResponsibleLimitsSchema` has "
       + "declared min(15).max(480) for it the whole time and NOTHING EVER USED THAT SCHEMA, so "
       + "the only check was 'a non-negative integer'. Harmless while nothing enforced the value; "
       + "now it lets a player set 1 and stop themselves betting a minute into every session.",
    file: RG,
    // ⚠️ RE-ANCHORED 2026-09-23, same cause as the case above: the pending-session-limit flow moved this clamp
    //    off `next.sessionTimeLimitMin` and onto a local `requested`, and the anchor stayed behind.
    from: `    const requested = v === null || v <= 0 ? null : Math.max(15, Math.min(480, v));`,
    to: `    const requested = v === null || v <= 0 ? null : v;`,
    check: "5.1 a 1-minute limit is raised to the platform's stated floor of 15",
  },
  {
    name: "the-bet-path-stops-consulting-the-session-limit",
    why: "The other half of family 3, and the one a merge conflict resolves badly: the check "
       + "still works perfectly, the money path just stops asking it. Same defect class as E-240, "
       + "one floor down.",
    file: MARKET,
    // Re-anchored 2026-09-14 (house bots build commit 2): the session clock now arrives on the bet context,
    // and a house stake has none (04 A7); the injected defect — the bet path stops asking — is unchanged.
    from: `  const sessionLimit = ctx.kind === "player" ? await checkSessionTimeLimit(userId, ctx.playStartedAt) : null;`,
    to: `  const sessionLimit = null as { exceeded: boolean; limitMin: number; playedMin: number } | null;`,
    check: "4.1 ⭐ forty-five minutes into a thirty-minute limit, the bet is REFUSED",
  },

  // ── 4 · the MARKETING predicate lifts itself, or writes (marketing U10 · D9 · OD12 · OD13) ─────
  // ⭐ Each is the edit a tidy-minded change would actually make, aimed at `test:rg-doors` §8. Added
  // 2026-09-25; the file they quote is `src/lib/server/marketing/rg.ts` (and one, the gate).
  {
    name: "marketing-reads-a-served-exclusion-as-over",
    why: "🔴 D9 ITSELF, IN THE MARKETING LANE. Skipping the minimum-served branch is `isLockedOut`'s "
       + "shape: the period ends and the player is marketable again, with no officer and no consent.",
    file: MKT_RG,
    from: `  if (se.state === "minimum_served") {`,
    to: `  if (se.state === "__never__") {`,
    check: "8.3 ⭐ a 24-hour exclusion that ELAPSED A YEAR AGO",
  },
  {
    name: "the-self-excluded-status-stops-being-evidence",
    why: "A row can be missing or carry an unreadable end date; the status is the one thing that says "
       + "no officer has reopened the account. Dropping it trusts the timer alone.",
    file: MKT_RG,
    from: `  if (user.status === "SELF_EXCLUDED") {`,
    to: `  if (user.status === "__never__") {`,
    check: "8.3c a SELF_EXCLUDED account with NO RG row",
  },
  {
    name: "the-six-month-floor-is-dropped",
    why: "⛔ GN 478T reg 48(3) REMOVED IN ONE LINE. A 24-hour exclusion, reopened the next day and "
       + "re-consented, would be marketed inside a week.",
    file: MKT_RG,
    from: `    if (now < floorMs) {`,
    to: `    if (false) {`,
    check: "8.5 ⭐ reopened and re-consented, but INSIDE six months",
  },
  {
    name: "a-consent-older-than-the-restore-counts",
    why: "⛔ THE TOGGLE LEFT ON THROUGH THE EXCLUSION. Any GIVEN row would do — including one given "
       + "years before the player excluded, or an old opt-out link tapped while still excluded.",
    file: MKT_RG,
    from: `    if (!(await consentedSince(rec.restoredAt as string))) {`,
    to: `    if (!(await consentedSince("1970-01-01T00:00:00.000Z"))) {`,
    check: "8.6b ⛔ a consent given BEFORE the restore",
  },
  {
    name: "an-ended-break-reopens-marketing-by-itself",
    why: "🔴 THE LIFT, FOR BREAKS. Deleting the consent check makes cooling-off exactly `isLockedOut`: "
       + "the promotion arrives the minute the break ends.",
    file: MKT_RG,
    from: `    if (!(await consentedSince(co))) return refuse("rg_cooling_off", \`break ended on \${co}, and no consent given since\`, co);`,
    to: `    // (consent-after-the-break check removed)`,
    check: "8.8 ⭐ a break that ENDED yesterday",
  },
  {
    name: "a-harm-check-that-cannot-read-permits",
    why: "⛔ THE COMPLIANCE PANEL'S `.catch(() => [])`, COPIED. A failed read becomes \"no flags\", and "
       + "the player the platform could not assess is the one it markets to.",
    file: MKT_RG,
    from: `    return refuse("rg_harm_marker", "the harm-marker check could not be read, so it refuses", null);`,
    to: `    flags = [];`,
    check: "8.12 ⛔ a harm check that cannot be READ refuses",
  },
  {
    name: "the-predicate-reads-through-the-writer",
    why: "🔴 U7's DEFECT, THE HALF ITS FIX MISSED. `getRgSettings` creates a row for a user with none "
       + "and rewrites one whose pending limit has come due — once per recipient, 150,000 per campaign.",
    file: MKT_RG,
    from: `  const row = await Promise.resolve(db.responsible.get(user.id));`,
    to: `  const row = await (await import("../responsible-gambling")).getRgSettings(user.id);`,
    check: "8.13 🔴 a row whose pending limit change has come due is NOT rewritten",
  },
  {
    name: "the-gate-stops-asking-the-rg-predicate",
    why: "⭐ E-240's SHAPE, ONE LANE OVER. The predicate stays perfect and every behavioural test of it "
       + "stays green; the gate simply stops calling it.",
    file: MKT_GATE,
    from: `    const rg = await marketingRgStanding(user, identifier);`,
    to: `    const rg = { ok: true, coolingOffEnded: false, skipReason: "rg_self_excluded", detail: "" } as const;`,
    check: "8.18 ⭐ the gate CALLS marketingRgStanding",
  },
];
