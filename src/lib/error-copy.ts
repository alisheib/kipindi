/**
 * B-7 · ONE mapper from a server action's refusal to the player's own language.
 *
 * The pattern is `verifyErrorMessage` (email codes) and `udBetErrorCopy` (UD-4)
 * generalised: server actions return `{ code, error, retryAfterSec }`; the code is
 * API/audit truth, the English `error` string is written for the record. Rendering
 * that string raw meant a SW/ZH player read English — or a machine token — at the
 * exact moment something failed. Every player surface now renders ITS OWN localized
 * sentence keyed off `code`; the server string survives only as a fallback when the
 * code is missing (an old response shape, a transport error), never in preference
 * to the dictionary.
 *
 * ⚠️ THE STRING TESTS IN HERE, AND WHY. Some services overload one code (INVALID
 * covers bad input, RG deposit limits, source-of-funds, KYC). Where the distinction
 * changes what the player should DO, we disambiguate on the server's own stable
 * wording — the UD-4 precedent ("a wrong guess costs a slightly-off hint rather
 * than a mistranslated headline"). If a phrase moves, the failure mode is the
 * generic localized line — never silence, never a raw token.
 *
 * ⚠️ Deposit-gateway reasons (`friendlyDepositReason`) are DELIBERATE bilingual
 * EN·SW player copy (the "·" separator is the tell) — same recorded position as
 * email (no ZH variant exists there by decision). Those pass through unchanged.
 */
import type { Dict } from "@/lib/i18n-dict";
import { hasReason, renderFailure, type FailureReason, type FailureDetail } from "@/lib/failure-reasons";
import { formatTzs } from "@/lib/utils";

export type ActionFailure = {
  code?: string;
  error?: string;
  retryAfterSec?: number;
  /** The machine reason, when the service emits one. Beats every phrase test below. */
  reason?: string;
  /** The figures, as NUMBERS. Never parsed back out of `error`. */
  detail?: FailureDetail;
};

export function errorCopy(t: Dict, r: ActionFailure): string {
  // ⭐ THE REGISTRY FIRST, AND THIS IS WHAT LETS A PHRASE TEST BE DELETED RATHER THAN LEFT
  // BESIDE ITS REPLACEMENT. Once a service says WHY in a machine token, nothing below needs to
  // guess it back out of English prose — same row, same copy, same figures as `renderFailure`
  // hands every other surface, so the two mappers cannot drift into two wordings for one refusal.
  if (hasReason(r)) {
    return renderFailure(
      { ok: false, error: r.error ?? "", code: r.code, reason: r.reason as FailureReason, detail: r.detail, retryAfterSec: r.retryAfterSec },
      t.error as unknown as Record<string, string>,
      t.error.somethingDidntWork,
      formatTzs,
    ).body;
  }
  const err = r.error ?? "";
  switch (r.code) {
    case "RATE_LIMITED":
      return t.error.errRateLimited.replace("{sec}", String(Math.max(1, Math.ceil(r.retryAfterSec ?? 60))));
    case "BUSY":
      return t.error.errBusy;
    case "NOT_FOUND":
      return t.error.errNotFound;
    case "PAUSED":
      return t.error.errProposalsPaused;
    case "AUTH":
      return t.error.errSignIn;
    case "EMAIL_INVALID":
      return t.error.errEmailInvalid;
    case "EMAIL_TAKEN":
      return t.error.errEmailTaken;
    case "NAME_INVALID":
      return t.error.errNameInvalid;
    case "AVATAR_TYPE":
      return t.error.errAvatarType;
    case "AVATAR_SIZE":
      return t.error.errAvatarSize;
    case "DOC_IMAGE":
      return t.error.errDocImage;
    case "DOC_TOO_LARGE":
      return t.error.errDocTooLarge;
    case "DOCS_LOCKED":
      return t.error.errDocsLocked;
    case "NO_EXTRA_REQUEST":
      return t.error.errNoExtraRequest;
    case "NIDA_TAKEN":
      return t.error.errNidaTaken;
    case "PW_CURRENT_WRONG":
      return t.error.errPwCurrentWrong;
    case "PW_WEAK":
      return t.error.errPwWeak;
    case "VOTING_CLOSED":
      return t.error.errVotingClosed;
    case "SUSPENDED": {
      // Three families share this code: an RG break the player set, a frozen
      // wallet, and an operator pause. Different next actions → disambiguate.
      if (/self-exclusion|cooling-off/i.test(err)) return t.error.errBreakActive;
      if (/frozen/i.test(err)) return t.error.errWalletFrozen;
      return t.error.errSuspended;
    }
    case "INVALID": {
      // Bilingual EN·SW gateway copy passes through (see header).
      if (err.includes("·")) return err;
      // ⛔ THREE PHRASE TESTS WERE DELETED HERE, and their services now emit a `reason`:
      //   · `deposit limit … exceeded`      → wallet-service, reason "deposit_limit"
      //   · `source.of.funds`               → wallet-service, reason "sof_required"
      //   · `smallest amount we can send`   → wallet-service, reason "withdraw_below_min"
      // The last one took `tzsFigures` with it — a regex that pulled "TZS 1,234" figures OUT OF
      // THE ENGLISH SENTENCE and fed match[0] into {net} and match[1] into {min}. A reworded
      // sentence, a third TZS figure, or a translated one and the player got the wrong number,
      // or a literal "{net}", on a money screen. The figures are `detail` numbers now.
      // ⛔ Do not re-add a phrase test for any of the three: a reason beats prose, and two
      // routes to one refusal is how they drift apart.
      if (/loss limit/i.test(err)) return t.error.errLossLimit;
      // ⛔ AND THE WHOLE KYC BLOCK IS GONE — eight phrase tests, replaced by reasons that
      // `kyc-service.ts` now emits at the same eight sites: nida_taken · doc_image_type ·
      // doc_too_large · docs_locked · no_extra_request · nida_not_verified · docs_required ·
      // extra_docs_required.
      //
      // 🔴 THOSE EIGHT WERE THE LAST ROUTE. `REASON_BY_CODE` maps DOC_IMAGE, DOC_TOO_LARGE,
      // DOCS_LOCKED, NIDA_TAKEN and NO_EXTRA_REQUEST — and measuring it 2026-08-15 found that
      // **no service anywhere emitted any of those five codes**. `kyc-service.ts` emits only
      // INVALID, NOT_FOUND and RATE_LIMITED. So those registry rows were unreachable and every
      // KYC refusal in front of a player was arriving through the phrase tests below and
      // nothing else. Now the service says which, and the code stays INVALID for the API.
      return t.error.errInvalid;
    }
    default:
      // No code at all → the server string is the only truth we have. Demoted to
      // fallback, exactly as UD-4 prescribes — never preferred over the dictionary.
      return err || t.error.somethingDidntWork;
  }
}
