/**
 * C2/C3 · THE REASON REGISTRY — why a refusal happened, what to do about it, and how loud.
 *
 * ⛔ THE PROBLEM THIS REPLACES. `INVALID` is returned from **108 server sites** and carries
 * no reason: bad input, stake bounds, RG deposit limits, daily loss limits, source-of-funds,
 * four KYC families, "not your position", "market already resolved", insufficient balance.
 * Four different copy mappers then tried to recover the meaning by **substring-matching
 * English prose**, and `docs/FAILURE-INVENTORY.md` §1.6 records what that cost:
 *
 *   · `RATE_LIMITED` never matched, because the server sends "Slow down." — which contains
 *     neither "rate" nor "limit" — and `retryAfterSec` was discarded;
 *   · "Wallet unavailable." (a NOT_FOUND) matched the *balance* branch and told the player
 *     to top up;
 *   · the fallback rendered the raw English server string as the TITLE of a money-failure
 *     dialog, so a Swahili or Chinese player got an English sentence.
 *
 * ⛔ SO: THE SERVER SAYS WHY, IN A MACHINE TOKEN, AND CARRIES THE FIGURES AS DATA.
 * The `code` STAYS — it is API and audit truth and callers depend on it. The `reason` is
 * additive and drives the copy. **Never phrase-match English prose to decide what to show.**
 *
 * ⛔ AND INTERPOLATED FIGURES COME FROM `detail`, NEVER FROM THE PROSE. `errorCopy` today
 * pulls "TZS 1,234" out of the server sentence with a regex (`tzsFigures`); a reworded
 * sentence silently drops the number out of the player's screen. `detail.min` is a number.
 *
 * ⚠️ SCOPE, STATED HONESTLY. This registry covers the BETTING and CASH-OUT paths — the ones
 * `docs/RULES.md` §2.9 and the programme's definition of done actually name. The wallet /
 * KYC / auth / proposals reasons are enumerated in `docs/FAILURE-INVENTORY.md` §2.3 and are
 * the next tranche; until they emit a `reason`, they fall through to `errorCopy` exactly as
 * before. `test:failure-reasons` fails if a reason is added here without copy or severity,
 * so the seam cannot rot.
 */

/**
 * How loud, and what it means. `docs/RULES.md` §2.9 and `docs/FAILURE-INVENTORY.md` §0.
 *
 *  info     nothing is wrong; we are telling them something
 *  warning  THE PLAYER CAN FIX IT, and their money did not move
 *  error    a genuine fault, or a hard block they cannot lift themselves
 */
export type Severity = "info" | "warning" | "error";

/**
 * Where it belongs on screen.
 *
 * ⛔ `warning` MAY NOT BE A GOLD TOAST. `toast.tsx` paints the `warning` variant gold, and
 * gold on this platform means EARNED MONEY only. A warning-severity refusal uses an inline
 * NoticeBar/Callout or a `default` toast — never `toast("warning")`.
 */
export type Channel =
  /** In the surface the player is already looking at, beside the control that failed. */
  | "inline"
  /** A sticky toast — a money refusal stays until it is read. */
  | "toast"
  /** Must be acknowledged. Compliance and hard account blocks only. */
  | "modal";

/** Every reason the betting and cash-out paths can emit. */
export type FailureReason =
  // ── buyPosition ──────────────────────────────────────────────────────────
  | "stake_below_min"
  | "stake_above_max"
  | "stake_not_whole"
  | "balance_insufficient"
  | "market_not_live"
  | "selection_closed"
  | "loss_limit_daily"
  | "rate_limited"
  | "system_busy"
  | "system_error"
  | "maintenance"
  | "account_blocked"
  | "self_excluded"
  /**
   * 🔴 ADDED 2026-08-27 (E-232). `self_excluded` and `break_active` were already here, with
   * copy in three languages — and `isLockedOut` distinguishes TWO states: a self-exclusion and
   * a COOLING-OFF period. There was no row for the second, so a cooled-off player could only
   * ever be told about a self-exclusion they had not chosen. The two are different lengths,
   * different commitments and different conversations, and the player set one of them
   * deliberately; calling it by the other name is not a rounding error.
   * ⛔ Severity `error` and channel `modal` deliberately match `self_excluded`: by this file's
   * own definitions a cooling-off is "a hard block they cannot lift themselves", and a
   * compliance block is the one case `modal` exists for.
   */
  | "cooling_off"
  /**
   * 🔴 ADDED 2026-08-27 (E-235). The player’s OWN session time limit, finally enforced.
   *
   * ⛔ `warning` + `toast`, and getting here took two corrections worth recording. I first wrote
   * `warning` + `modal`; §6.2 refused it, because a warning may not seize the screen. I then
   * wrote `error` + `modal` and justified it with a claim I had not checked — that `setLimits`
   * defers every increase 24 hours, so the player could not lift this in the moment. **That is
   * false for THIS field.** `responsible-gambling.ts:189` writes `sessionTimeLimitMin`
   * immediately in both directions; only the three DEPOSIT caps are deferred (`dailyLossLimit`
   * is immediate too). A player who hits this can raise their own limit and bet again at once.
   *
   * ⭐ SO `warning` IS THE HONEST ROW, BY THIS FILE'S OWN DEFINITION: the player CAN fix it and
   * their money did not move. `toast` is sticky and stays until it is read, which is the
   * interruption this control is for. ⚠️ Whether an INCREASE here should be deferred the way
   * LCCP SR 3.4.3 defers deposit-limit increases is an open product question — a limit you can
   * wave away in the moment is a weaker control than it looks. It needs a column, so it is
   * filed rather than smuggled in here.
   */
  | "session_limit_reached"
  | "wallet_frozen"
  | "wallet_missing"
  // ── cashOutPosition ──────────────────────────────────────────────────────
  | "not_your_position"
  | "position_not_open"
  | "bonus_funded_no_exit"
  | "market_settled"
  | "cashout_value_zero"
  | "exit_window_closed"
  // ── B2 · a WARNING shown before confirming, not a refusal ─────────────────
  | "bonus_wagering_one_side"
  // ── C2 SECOND TRANCHE · wallet, KYC, auth, proposals, objections ──────────
  // `docs/FAILURE-INVENTORY.md` §2.3. ⭐ EVERY ONE OF THESE ALREADY HAS A DISTINCT SERVER
  // CODE — the services were never the problem here. What was missing is what §1.4 counts:
  // "five tone vocabularies, and no shared `Severity` type", so each of these refusals was
  // rendered at whatever volume its surface happened to choose. Mapping the CODE to a row in
  // this registry gives every one of them a severity and a channel, without changing a single
  // service and without inventing copy that already exists in three languages.
  | "deposit_limit"
  | "sof_required"
  /**
   * `E-215` · the payout destination is not the number on the account. ⛔ NOT a
   * validation failure — the number may be perfectly well-formed and belong to
   * somebody else. The copy names the registered last four so the refusal says WHERE
   * the money may go, not merely that it may not go here.
   */
  | "payout_destination_not_registered"
  /**
   * 🔴 `E-223` · the two ways a payout can be short of funds, and they are DIFFERENT
   * SENTENCES because they have different next steps.
   *
   * `withdraw_balance_insufficient` is the ordinary shortfall: the player asked for more
   * than they hold. ⛔ It is NOT `balance_insufficient`, whose copy reads *"this BET needs
   * {needed}. Top up under Wallet → Deposit"* — the wrong noun and the wrong instruction on
   * a screen whose whole purpose is taking money OUT.
   *
   * `withdraw_bonus_locked` is the one this platform actually needed. A player holding
   * TZS 194,740 of cash and TZS 10,000 of bonus sees ONE total on their wallet, asks for it,
   * and is refused — and the honest answer is not "you don't have that", because they can
   * see that they do. It is that a bonus is not withdrawable until its wagering requirement
   * is met. ⚠️ THE FIGURE IN BOTH SENTENCES IS `w.balance` ALONE. Naming
   * `balance + bonusBalance` would state a number the player cannot have, on a money screen,
   * which is the defect class the Player-View Audit already shipped five blockers for.
   */
  | "withdraw_balance_insufficient"
  | "withdraw_bonus_locked"
  // ⛔ `kyc_required` WAS RETIRED 2026-08-20 AND IS STILL RETIRED — the four reasons
  // below are NOT it coming back under a new spelling, and the distinction is the
  // history, not the semantics.
  //
  // THEN: `kyc_required` was the WITHDRAWAL identity refusal, and identity verification
  // stopped being a precondition of withdrawal on the Gaming Board's instruction
  // (comment #1, relayed by the owner 2026-08-19; `docs/BOARD-DISCLOSURE-B-E.md` §1).
  // Its union member, registry row, three dictionary keys and its single emitter in
  // `wallet-service.withdraw()` went in one commit, replaced by a RECORD rather than a
  // code: an identity stamp on every withdrawal's audit entry, and a COMPLIANCE fact
  // when the payer was unverified.
  //
  // NOW: on 2026-09-05 the owner ruled that a player may not deposit, bet OR withdraw
  // until we approve their identity (`docs/COMPLIANCE-DECISIONS.md`; re-disclosed to the
  // Board). Two thirds of that is new policy the Board never spoke to — deposits and
  // staking. One third, withdrawal, is a deliberate reversal, taken as a control
  // STRICTER than instructed and disclosed as such.
  //
  // ⛔ THE OLD NAME STAYS DEAD ANYWAY. A retired token carries its retirement note into
  // every future reader's head; reviving it for a differently-scoped gate would make
  // both decisions unreadable. Four names, because the refusal is four different asks —
  // and one token cannot tell a player waiting on US from a player we are waiting on.
  /** Identity not yet proven — no submission, or one still being filled in. */
  | "kyc_not_verified"
  /** Submitted and sitting with an officer. ⚠️ The player has nothing to do; the copy
   *  must not imply they do. This is the one of the four that is our delay, not theirs. */
  | "kyc_pending_review"
  /** An officer asked for more or clearer documents. The ask itself is on /profile/kyc. */
  | "kyc_more_info"
  /** Turned down. `humanizeRejectReason` renders the categorised reason on /profile/kyc. */
  | "kyc_rejected"
  // ⛔ RENAMED 2026-08-20, and the rename is the point. `nida_taken` /
  // `nida_not_verified` were named for the only document the product accepted.
  // From 2026-08-20 a player proves identity with any ONE of four, so leaving
  // `nida_taken` firing for a rejected PASSPORT would be a lie in the audit
  // trail — the one record a regulator asks for. The union member, the registry
  // row below and the dictionary key moved in a single commit; `test:failure-reasons`
  // fails on a mapped code with no emitter, so a half-move cannot ship.
  | "id_taken"
  | "id_not_verified"
  /** The number failed the rule recorded for THAT document in `id-documents.ts`. */
  | "id_number_format"
  /** A passport / driving licence whose expiry date has passed. */
  | "id_expired"
  /** A passport / driving licence submitted with no expiry date at all. */
  | "id_expiry_required"
  | "doc_image_type"
  | "doc_too_large"
  | "docs_locked"
  | "docs_required"
  | "extra_docs_required"
  | "no_extra_request"
  | "withdraw_below_min"
  | "email_invalid"
  | "email_taken"
  | "email_unverified"
  | "name_invalid"
  | "avatar_type"
  | "avatar_size"
  | "password_wrong"
  | "password_weak"
  | "voting_closed"
  | "proposals_paused"
  // ⛔ `break_active` WAS DELETED HERE (E-232, 2026-08-27) AND MUST NOT COME BACK.
  // It said "a break you set" without saying WHICH break or WHEN it lifts, and nothing had
  // ever emitted it. `self_excluded` and `cooling_off` say both, carry the end date as data,
  // and are emitted by all three refusal sites. A generic row beside two specific ones is a
  // second plausible destination for a reader — the shape §9b already deleted six codes over.
  | "account_suspended"
  | "not_found"
  | "signin_required"
  // ── C2 THIRD TRANCHE · the BANNER channel (docs/FAILURE-INVENTORY.md §1.5's note) ────────
  // A form-action page cannot hand a toast an object — it redirects, and a redirect carries a
  // string. These are the reasons those five surfaces send as a KEY instead of as prose.
  | "rg_limit_invalid"
  | "rg_period_invalid"
  | "sof_incomplete"
  | "sof_locked"
  | "close_confirm_required"
  | "password_mismatch"
  | "reset_link_invalid"
  | "unknown_failure";

export interface ReasonSpec {
  severity: Severity;
  channel: Channel;
  /** The dictionary key under `t.fail`. */
  key: string;
  /** Figures this reason's copy interpolates. Declared so the guard can check them. */
  needs?: readonly ("min" | "max" | "balance" | "needed" | "retryAfterSec" | "until" | "remaining" | "net" | "last4" | "limitMin" | "playedMin")[];
}

/**
 * ⛔ ONE ROW PER REASON, AND THE GUARD READS THIS OBJECT. `test:failure-reasons` enumerates
 * these keys and asserts each has copy in ALL THREE languages and a declared severity —
 * so adding a reason without copy fails the build rather than shipping a blank screen.
 * A count of "mapped surfaces" would pass by never growing; this cannot.
 */
export const REASONS: Record<FailureReason, ReasonSpec> = {
  // ⭐ The two the stake-bounds rule turns on. `docs/RULES.md` §2.3 requires a refusal that
  // NAMES the bound, and before 2026-08-14 neither player surface showed one: polls fell
  // through to "That didn't go through", and Up & Down discarded the server string BY DESIGN.
  stake_below_min:      { severity: "warning", channel: "inline", key: "failStakeBelowMin", needs: ["min"] },
  stake_above_max:      { severity: "warning", channel: "inline", key: "failStakeAboveMax", needs: ["max"] },
  stake_not_whole:      { severity: "warning", channel: "inline", key: "failStakeNotWhole" },
  balance_insufficient: { severity: "warning", channel: "inline", key: "failBalanceInsufficient", needs: ["balance", "needed"] },
  market_not_live:      { severity: "info",    channel: "toast",  key: "failMarketNotLive" },
  selection_closed:     { severity: "info",    channel: "toast",  key: "failSelectionClosed" },
  // ⛔ ERROR, not warning, and a MODAL. LCCP informed consent: a player who has hit their own
  // daily loss cap must acknowledge it, on both products. It is the one betting refusal that
  // is deliberately loud.
  loss_limit_daily:     { severity: "error",   channel: "modal",  key: "failLossLimitDaily" },
  rate_limited:         { severity: "warning", channel: "toast",  key: "failRateLimited", needs: ["retryAfterSec"] },
  // ⭐ C4 · `system_busy` and `system_error` are DIFFERENT and must never be merged again.
  // Busy means admission shed the request and THE STAKE NEVER MOVED — retrying is safe and
  // is what the idempotency key is for. An unexpected throw means we do not know what
  // happened, and telling that player "we're busy, your stake hasn't moved" is a claim we
  // cannot support.
  system_busy:          { severity: "warning", channel: "toast",  key: "failSystemBusy" },
  system_error:         { severity: "error",   channel: "toast",  key: "failSystemError" },
  maintenance:          { severity: "error",   channel: "toast",  key: "failMaintenance" },
  account_blocked:      { severity: "error",   channel: "modal",  key: "failAccountBlocked" },
  self_excluded:        { severity: "error",   channel: "modal",  key: "failSelfExcluded", needs: ["until"] },
  cooling_off:          { severity: "error",   channel: "modal",  key: "failCoolingOff", needs: ["until"] },
  session_limit_reached: { severity: "warning", channel: "toast",  key: "failSessionLimit", needs: ["limitMin"] },
  // 🔴 FAILURE-INVENTORY §3.1 · a FROZEN wallet used to return NOT_FOUND, which `errorCopy`
  // renders as "We couldn't find that. Refresh and try again." — so a player whose wallet had
  // been frozen was told to refresh the page. Wrong reason, wrong severity, wrong next step.
  wallet_frozen:        { severity: "error",   channel: "modal",  key: "failWalletFrozen" },
  wallet_missing:       { severity: "error",   channel: "toast",  key: "failWalletMissing" },

  not_your_position:    { severity: "error",   channel: "toast",  key: "failNotYourPosition" },
  position_not_open:    { severity: "info",    channel: "toast",  key: "failPositionNotOpen" },
  bonus_funded_no_exit: { severity: "warning", channel: "toast",  key: "failBonusFundedNoExit" },
  market_settled:       { severity: "info",    channel: "toast",  key: "failMarketSettled" },
  cashout_value_zero:   { severity: "warning", channel: "toast",  key: "failCashoutValueZero" },
  exit_window_closed:   { severity: "info",    channel: "toast",  key: "failExitWindowClosed" },

  bonus_wagering_one_side: { severity: "warning", channel: "inline", key: "failBonusWageringOneSide", needs: ["remaining"] },

  // ── C2 SECOND TRANCHE ─────────────────────────────────────────────────────
  // ⭐ THESE POINT AT THE EXISTING `error.*` KEYS, ON PURPOSE. The copy is already written,
  // already translated into all three languages, and already proven by `test:i18n`. Inventing
  // 72 new strings to say the same things would be the "a number written twice" defect
  // (RULES.md §7) applied to sentences: two wordings for one refusal, drifting apart.
  // ⛔ The severity is the NEW information, and it is the whole point — §0's standard is that
  // a fixable problem is a WARNING and only a genuine block is an ERROR.
  //
  // Fixable by the player, right now → warning:
  deposit_limit:        { severity: "warning", channel: "inline", key: "errDepositLimit" },
  // 🔴 `E-215` · ERROR and INLINE. An error rather than a warning because the player
  // cannot fix it by changing the amount or by waiting — the destination is fixed by the
  // account. Inline rather than a toast because it belongs beside the destination it is
  // about, and ⛔ a warning-severity money refusal may not be a gold toast at all (see
  // `Channel` above: gold means EARNED MONEY on this platform).
  payout_destination_not_registered:
                        { severity: "error",   channel: "inline", key: "failPayoutDestination", needs: ["last4"] },
  // 🔴 `E-223` · both INLINE and both WARNING: the player CAN fix either by changing the
  // amount, which is the difference between these and the destination refusal above.
  // ⚠️ Both declare `balance` AND `needed`; declaring one leaves a literal `{needed}` on a
  // money screen, which is the `withdraw_below_min` defect noted a few lines down.
  withdraw_balance_insufficient:
                        { severity: "warning", channel: "inline", key: "failWithdrawBalance", needs: ["balance", "needed"] },
  withdraw_bonus_locked:
                        { severity: "warning", channel: "inline", key: "failWithdrawBonusLocked", needs: ["balance", "needed"] },
  sof_required:         { severity: "warning", channel: "inline", key: "errSofRequired" },
  // ⚠️  DECLARES BOTH FIGURES, and the guard is why.  interpolates
  // {net} AND {min}; declaring only one leaves a literal placeholder on screen — the exact
  // defect §7 of the work order records shipping in all three languages.
  withdraw_below_min:   { severity: "warning", channel: "inline", key: "errWithdrawMin", needs: ["net", "min"] },
  email_invalid:        { severity: "warning", channel: "inline", key: "errEmailInvalid" },
  email_taken:          { severity: "warning", channel: "inline", key: "errEmailTaken" },
  // ⛔ NOT an error, and not a money fault: the deposit was refused because the address that
  // will carry the receipt is not confirmed yet. The player fixes it by opening a link that is
  // already in their inbox, so it is a WARNING with the next step named — never a red failure
  // on the money-in path. `EMAIL_UNVERIFIED` has been a distinct server code since the
  // email gate shipped, and until now nothing rendered it: `errorCopy` had no branch for it, so
  // it fell to `default:` and printed the SERVER'S OWN ENGLISH SENTENCE to a SW/ZH player.
  email_unverified:     { severity: "warning", channel: "inline", key: "errEmailUnverified" },

  // ── THE IDENTITY GATE ON THE MONEY PATH (2026-09-05) ──────────────────────────────
  // Emitted by `deposit()`, `buyPositionInner()` and `withdraw()` through
  // `assertKycForMoney` (`src/lib/server/kyc-gate.ts`), which carries the whole rationale.
  //
  // ⛔ `channel: "modal"` FOR ALL FOUR, and it is a deliberate cost. A betting refusal is
  // normally a sticky toast; these seize the screen because they are hard blocks the player
  // cannot clear in the moment, and because the fix lives on ANOTHER PAGE. A toast that
  // scrolls away is how a player learns nothing and taps again. Same reasoning the registry
  // already applies to `wallet_frozen` and `account_blocked`.
  //
  // 🔴 A `modal` REASON MUST ALSO GET A ROW IN `MODAL_TITLE_BY_REASON`
  // (`src/components/updown/updown-bet-errors.ts`) OR IT INHERITS THE FALLBACK HEADING
  // "Betting unavailable" — which, over a body reading "verify your identity to play", is
  // the exact loss-cap defect that map was written to fix. Four reasons, four title rows.
  //
  // ⚠️ ALL FOUR ARE `error`, AND MY FIRST PASS GOT THIS WRONG — §6.2 caught it.
  // "Warning" reads like the right word for something the player can go and fix, and three
  // of these ARE eventually fixable by them. But this file's own definition is narrower:
  // *"warning — THE PLAYER CAN FIX IT, and their money did not move"* versus *"error — a
  // genuine fault, OR A HARD BLOCK THEY CANNOT LIFT THEMSELVES"*. A player cannot approve
  // their own identity; only an officer can. Every one of these is therefore a hard block,
  // and §6.2 exists precisely to stop a "fixable" label being attached to a modal.
  //
  // ⛔ SEVERITY DOES NOT DECIDE THE MODAL'S COLOUR. That would make `kyc_pending_review` —
  // our own review queue — arrive as a red `danger` crest with an ✗ and
  // `role="alertdialog"`, an emergency about nothing the player did. Tone is chosen
  // separately, by reason, in `MODAL_TONE_BY_REASON` (`updown-bet-errors.ts`), for exactly
  // the argument `MODAL_TITLE_BY_REASON` already makes one screen over: severity answers
  // *how loud*, which is a real and separate question from *whose decision was this*.
  kyc_not_verified:     { severity: "error",   channel: "modal",  key: "errKycNotVerified" },
  kyc_pending_review:   { severity: "error",   channel: "modal",  key: "errKycPendingReview" },
  kyc_more_info:        { severity: "error",   channel: "modal",  key: "errKycMoreInfo" },
  kyc_rejected:         { severity: "error",   channel: "modal",  key: "errKycRejected" },

  name_invalid:         { severity: "warning", channel: "inline", key: "errNameInvalid" },
  avatar_type:          { severity: "warning", channel: "inline", key: "errAvatarType" },
  avatar_size:          { severity: "warning", channel: "inline", key: "errAvatarSize" },
  doc_image_type:       { severity: "warning", channel: "inline", key: "errDocImage" },
  doc_too_large:        { severity: "warning", channel: "inline", key: "errDocTooLarge" },
  docs_required:        { severity: "warning", channel: "inline", key: "errDocsRequired" },
  extra_docs_required:  { severity: "warning", channel: "inline", key: "errExtraDocsRequired" },
  password_wrong:       { severity: "warning", channel: "inline", key: "errPwCurrentWrong" },
  password_weak:        { severity: "warning", channel: "inline", key: "errPwWeak" },
  // Nothing is wrong; a state the player cannot change and does not need to act on:
  docs_locked:          { severity: "info",    channel: "inline", key: "errDocsLocked" },
  no_extra_request:     { severity: "info",    channel: "inline", key: "errNoExtraRequest" },
  voting_closed:        { severity: "info",    channel: "toast",  key: "errVotingClosed" },
  proposals_paused:     { severity: "info",    channel: "toast",  key: "errProposalsPaused" },
  not_found:            { severity: "info",    channel: "toast",  key: "errNotFound" },
  // A hard block the player cannot lift, or an identity/compliance gate:
  // ⛔ `id_taken` is an ERROR and a MODAL: the identity document is already linked to
  // another account, which is a fraud-shaped fact, not a typo to fix in place. It covers
  // all four document types — a DUPLICATE_IDENTITY block on a NIDA that a passport could
  // walk around would not be a uniqueness rule at all.
  id_taken:             { severity: "error",   channel: "modal",  key: "errIdTaken" },
  id_not_verified:      { severity: "warning", channel: "inline", key: "errIdNotVerified" },
  // ⭐ The player can fix all three of these, and their money did not move — so
  // `warning`, and `inline`, beside the field they must correct. ⛔ The copy is
  // deliberately type-NEUTRAL: `/profile/kyc` knows which document was chosen and
  // prints THAT document's rule underneath, so the player reads the real rule
  // rather than the word "invalid" (§F4 — a refusal states the reason AND the step).
  id_number_format:     { severity: "warning", channel: "inline", key: "errIdNumberFormat" },
  id_expired:           { severity: "warning", channel: "inline", key: "errIdExpired" },
  id_expiry_required:   { severity: "warning", channel: "inline", key: "errIdExpiryRequired" },
  // ⛔ A BREAK THE PLAYER SET THEMSELVES IS NOT A FAULT — it is the tool working. Error
  // severity, because they cannot lift it, but never phrased or coloured as a malfunction.
  account_suspended:    { severity: "error",   channel: "modal",  key: "errSuspended" },
  signin_required:      { severity: "warning", channel: "toast",  key: "errSignIn" },

  // ── C2 THIRD TRANCHE · the banner channel ─────────────────────────────────
  // ⛔ ALL `inline`, AND THAT IS THE POINT OF THE CHANNEL. These render beside the form the
  // player is still looking at, so they are never a toast that can be missed — and never
  // `warning`-as-gold, which on this platform means money that was EARNED.
  rg_limit_invalid:      { severity: "warning", channel: "inline", key: "errRgLimitInvalid" },
  rg_period_invalid:     { severity: "warning", channel: "inline", key: "errRgPeriodInvalid" },
  sof_incomplete:        { severity: "warning", channel: "inline", key: "errSofIncomplete" },
  // Nothing is wrong — an accepted declaration is deliberately not editable in place.
  sof_locked:            { severity: "info",    channel: "inline", key: "errSofLocked" },
  close_confirm_required:{ severity: "warning", channel: "inline", key: "errCloseConfirm" },
  password_mismatch:     { severity: "warning", channel: "inline", key: "errPasswordMismatch" },
  reset_link_invalid:    { severity: "warning", channel: "inline", key: "errResetLinkInvalid" },
  // ⭐ THE ONE THAT MAKES THE CHANNEL CONVERTIBLE AT ALL. A banner surface must send SOME key
  // for a refusal the registry does not classify, or it falls back to echoing the server's
  // prose and the channel can never reach zero. It points at the dictionary line the callers
  // already used as their generic fallback, so it invents no copy.
  unknown_failure:       { severity: "warning", channel: "inline", key: "somethingDidntWork" },
};

/**
 * The reason a KNOWN server code implies, when the service has not yet been taught to emit
 * a `reason` of its own.
 *
 * ⛔ THIS IS NOT PHRASE-MATCHING, AND THE DIFFERENCE IS THE WHOLE POINT. `errorCopy` recovers
 * meaning by substring-matching English prose, and `docs/FAILURE-INVENTORY.md` §1.6 records
 * what that cost: `RATE_LIMITED` never matched because the server says "Slow down.", and
 * "Wallet unavailable." matched the *balance* branch and told the player to top up. A CODE is
 * a machine token the service already commits to — mapping it is exact and cannot drift with
 * a reworded sentence.
 *
 * ⚠️ Codes that genuinely overload several meanings (`INVALID`, `SUSPENDED`) are deliberately
 * ABSENT: mapping them here would pick one meaning for a token that has four. Those stay with
 * `errorCopy`'s disambiguation until each service emits its own reason — and
 * `test:failure-reasons` §8 now pins every one of those phrase tests against the real server
 * string, so the seam cannot rot silently while it waits.
 */
const REASON_BY_CODE: Readonly<Record<string, FailureReason>> = {
  RATE_LIMITED: "rate_limited",
  BUSY: "system_busy",
  NOT_FOUND: "not_found",
  PAUSED: "proposals_paused",
  AUTH: "signin_required",
  EMAIL_INVALID: "email_invalid",
  EMAIL_TAKEN: "email_taken",
  EMAIL_UNVERIFIED: "email_unverified",
  NAME_INVALID: "name_invalid",
  AVATAR_TYPE: "avatar_type",
  AVATAR_SIZE: "avatar_size",
  PW_CURRENT_WRONG: "password_wrong",
  PW_WEAK: "password_weak",
  VOTING_CLOSED: "voting_closed",
  // ⛔ SIX ROWS WERE DELETED HERE (2026-08-15), AND NOT BECAUSE THEIR REFUSALS WENT AWAY.
  //   · DOC_IMAGE · DOC_TOO_LARGE · DOCS_LOCKED · NO_EXTRA_REQUEST · NIDA_TAKEN
  //   · MAINTENANCE
  // ⭐ Measured, not assumed: **no service or action anywhere emitted any of those six codes**
  // — not on the day they were added, not since. The five KYC families reach the registry
  // through the `reason` that `kyc-service.ts` emits at the same eight sites, which is the
  // better route and the one that works. Maintenance is refused with `code: "SUSPENDED"`
  // (four families share it), and its services now emit `reason: "maintenance"` instead.
  //
  // ⛔ A MAPPING FOR A CODE NOBODY SENDS IS NOT HARMLESS DEFENCE. It is a second, plausible
  // route to a refusal that the code has never taken, so a reader answering *"how does a
  // too-large document reach the player?"* finds this table and stops — which is exactly how
  // the previous session concluded those refusals were handled when they were arriving
  // through phrase tests. `test:failure-reasons` §9b now walks the tree and fails on any row
  // here whose code no service emits, so a dead row cannot be added back silently.
};

/**
 * Every code this table maps, for the guard that proves each one is really emitted.
 *
 * ⛔ EXPORTED SO `test:failure-reasons` §9b CANNOT HAND-LIST THEM. A guard that enumerates the
 * codes it checks from its own literal is the exact shape that let six dead rows sit here
 * unnoticed while the suite reported them working.
 */
export const REASON_BY_CODE_KEYS: readonly string[] = Object.keys(REASON_BY_CODE);

/** The reason for a code, or null when the code is absent, unknown, or overloaded. */
export function reasonForCode(code: string | null | undefined): FailureReason | null {
  if (!code) return null;
  return Object.prototype.hasOwnProperty.call(REASON_BY_CODE, code) ? REASON_BY_CODE[code] : null;
}

/**
 * The figures a refusal carries. ⛔ NUMBERS, not formatted strings, and never recovered
 * from the English prose — that is `tzsFigures`, and it is the defect being retired.
 */
export interface FailureDetail {
  min?: number;
  max?: number;
  balance?: number;
  needed?: number;
  retryAfterSec?: number;
  /** ISO instant a self-exclusion or break ends. */
  until?: string;
  /** TZS still to be wagered before a bonus can be withdrawn. */
  remaining?: number;
  /** What would actually land after the withdrawal fee — the NET, beside the minimum. */
  net?: number;
  /**
   * `E-215` · the last four digits of the account’s REGISTERED number — never of the
   * number that was submitted. A string, and it must stay one: `"0044"` is a real suffix
   * on production and a number would render it `44`, naming a different phone on a
   * refusal whose whole job is to name the right one.
   */
  last4?: string;
  /**
   * `E-240` · WHICH self-exclusion state a sign-in refusal is about, as a MACHINE TOKEN.
   *
   * 🔴 The login action used to choose its banner by running `/self-exclusion/i` over the
   * refusal's English prose. That is the defect `failure-reasons.ts` exists to retire, and it
   * mis-fired the moment the gate's wording improved: a player still SERVING their period got
   * the generic "blocked · contact support" screen (their message says "self-excluded"), while
   * a player whose period had ENDED got a banner reading *"you will not be able to sign in
   * until the period ends"* — about a period that ended an hour earlier.
   */
  standing?: "serving" | "minimum_served" | "permanent" | "diverged";
  /** `E-235` · the session time limit the player set for themselves, in minutes. */
  limitMin?: number;
  /** `E-235` · how long this play session has actually run, in minutes. */
  playedMin?: number;
}

/** What every refusing service returns. `code` is unchanged; `reason`/`detail` are additive. */
export interface ReasonedFailure {
  ok: false;
  error: string;
  code?: string;
  reason?: FailureReason;
  detail?: FailureDetail;
  retryAfterSec?: number;
}

/**
 * True when `r` carries a reason this registry knows.
 *
 * ⚠️ GENERIC ON PURPOSE. The first version narrowed to the bare `{ reason: FailureReason }`,
 * which REPLACES the caller's type instead of refining it — so inside the `if`, every other
 * field (`error`, `code`, `detail`, `retryAfterSec`) vanished from the type and the narrowed
 * value could no longer be passed to `renderFailure` at all. Intersecting keeps the object the
 * caller actually has.
 */
export function hasReason<T extends { reason?: string }>(r: T | null | undefined): r is T & { reason: FailureReason } {
  return !!r?.reason && Object.prototype.hasOwnProperty.call(REASONS, r.reason);
}

export interface RenderedFailure {
  severity: Severity;
  channel: Channel;
  /** The localized sentence. Never a raw server string, never a bare code. */
  body: string;
  /** The reason, for tests and telemetry. Null when we fell back. */
  reason: FailureReason | null;
}

/** The formatter a surface hands in — its own locale-aware TZS formatter. */
export type MoneyFormat = (tzs: number) => string;

/**
 * ONE renderer. Given a refusal and the dictionary, produce the sentence, the severity and
 * the channel.
 *
 * ⛔ IT NEVER RENDERS `r.error`. When a refusal carries no reason we fall back to the
 * caller's own generic localized line — the server's English prose is API/audit truth and
 * has no business being a headline in front of a Swahili or Chinese player.
 *
 * @param fallback the caller's generic localized sentence, used when no reason is present.
 */
export function renderFailure(
  r: ReasonedFailure | null | undefined,
  dict: Record<string, string>,
  fallback: string,
  money: MoneyFormat,
): RenderedFailure {
  // ⭐ C2 SECOND TRANCHE · fall back to the CODE before falling back to nothing. Most of the
  // wallet / KYC / auth / proposals refusals already carry a distinct machine code; until
  // their services emit a `reason` of their own, the code is an exact, non-prose way to reach
  // the same registry row — so those surfaces get a severity and a channel today instead of
  // whichever volume each one happened to pick.
  const reason: FailureReason | null = hasReason(r) ? r.reason : reasonForCode(r?.code);
  if (!reason) {
    // ⚠️ NOT an "error": a refusal we cannot classify is most often an old response shape
    // or a transport blip, and shouting is worse than saying plainly that it did not go
    // through. It is a WARNING with the caller's own generic line.
    return { severity: "warning", channel: "toast", body: fallback, reason: null };
  }
  const spec = REASONS[reason];
  const template = dict[spec.key] ?? fallback;
  const d = (r as ReasonedFailure).detail ?? {};
  const values: Record<string, string> = {
    min: d.min != null ? money(d.min) : "—",
    max: d.max != null ? money(d.max) : "—",
    balance: d.balance != null ? money(d.balance) : "—",
    needed: d.needed != null ? money(d.needed) : "—",
    remaining: d.remaining != null ? money(d.remaining) : "—",
    net: d.net != null ? money(d.net) : "—",
    sec: String(Math.max(1, Math.ceil((r as ReasonedFailure).retryAfterSec ?? d.retryAfterSec ?? 60))),
    until: d.until ?? "—",
    // ⚠️ Passed through as a STRING with no formatting at all. Every other value here goes
    // through `money()` or `String(Math…)`; a phone suffix is neither a quantity nor a
    // currency, and `"0044"` — a real suffix on production — must survive as `0044`.
    last4: d.last4 ?? "—",
    // ⚠️ MINUTES, NOT MONEY — and that is why they are not routed through `money()` like every
    // numeric above them. `money(30)` renders "TZS 30", which on a sentence about a thirty-minute
    // session limit reads as a stake. `E-235`.
    limitMin: d.limitMin != null ? String(d.limitMin) : "—",
    playedMin: d.playedMin != null ? String(d.playedMin) : "—",
  };
  // 🔴 A GLOBAL SUBSTITUTION, AND IT HAS TO BE. This was a chain of `String.replace(str, …)`
  // calls, and `replace` with a STRING pattern substitutes only the FIRST occurrence — so
  // "Minimum bet is {min}. Enter {min} or more and try again." rendered as
  // **"Minimum bet is TZS 1,000. Enter {min} or more and try again."** with a literal
  // placeholder in front of the player, on the exact sentence docs/RULES.md §2.3 turns on.
  // Every assertion about it was GREEN: the sentence did name the minimum, in all three
  // languages. Only reading the rendered output caught it.
  const body = template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole);
  return { severity: spec.severity, channel: spec.channel, body, reason };
}
