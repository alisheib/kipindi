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
  | "bonus_wagering_one_side";

export interface ReasonSpec {
  severity: Severity;
  channel: Channel;
  /** The dictionary key under `t.fail`. */
  key: string;
  /** Figures this reason's copy interpolates. Declared so the guard can check them. */
  needs?: readonly ("min" | "max" | "balance" | "needed" | "retryAfterSec" | "until" | "remaining")[];
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
};

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

/** True when `r` carries a reason this registry knows. */
export function hasReason(r: { reason?: string } | null | undefined): r is { reason: FailureReason } {
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
  if (!hasReason(r)) {
    // ⚠️ NOT an "error": a refusal we cannot classify is most often an old response shape
    // or a transport blip, and shouting is worse than saying plainly that it did not go
    // through. It is a WARNING with the caller's own generic line.
    return { severity: "warning", channel: "toast", body: fallback, reason: null };
  }
  const spec = REASONS[r.reason];
  const template = dict[spec.key] ?? fallback;
  const d = (r as ReasonedFailure).detail ?? {};
  const values: Record<string, string> = {
    min: d.min != null ? money(d.min) : "—",
    max: d.max != null ? money(d.max) : "—",
    balance: d.balance != null ? money(d.balance) : "—",
    needed: d.needed != null ? money(d.needed) : "—",
    remaining: d.remaining != null ? money(d.remaining) : "—",
    sec: String(Math.max(1, Math.ceil((r as ReasonedFailure).retryAfterSec ?? d.retryAfterSec ?? 60))),
    until: d.until ?? "—",
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
  return { severity: spec.severity, channel: spec.channel, body, reason: r.reason };
}
