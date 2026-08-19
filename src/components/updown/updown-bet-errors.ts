/**
 * UD-4 · ONE map from the money path's refusal `code` to the player's own language.
 *
 * The server's error strings are API/audit truth — English (sometimes EN·SW service
 * copy), written for the record, not for the screen. Rendering them raw meant a ZH
 * player read untranslated copy at the exact moment their money was refused. The
 * client now renders ITS OWN localized sentence keyed off `code`; the server string
 * survives only as a fallback when the code is missing (an old response shape or a
 * transport error), never in preference to the dictionary.
 *
 * Lives beside the hook, used by all three bet surfaces, so the mapping cannot drift
 * per surface. ⛔ The server is NOT edited for this (handover §6 rule 6): the codes
 * are what `buyPosition` already returns.
 *
 * ⭐ THERE IS NO LONGER A STRING TEST IN HERE (2026-08-15). This header used to describe
 * one and explain why it was unavoidable: the RG daily-loss refusal returns
 * `code: "INVALID"` — the same code as a stake-bounds error — and the §5 matrix routes it
 * to the acknowledge-modal (LCCP informed consent), not a toast, so the classifier matched
 * the refusal's own English phrase. `buyPosition` has emitted `reason: "loss_limit_daily"`
 * since `19ac78ec`, the reason branch below consults it first, and the phrase test is gone.
 * `docs/RULES.md` §2.9's ⏳ named this as the last INVALID family recovered from prose.
 *
 * ⛔ AND REMOVING IT EXPOSED A SECOND DEFECT THAT THE DEAD TEST HAD BEEN MASKING. See
 * `MODAL_TITLE_BY_REASON` below: the reason branch chose the modal's HEADING from the
 * refusal's SEVERITY, and `error` covers both "we have blocked you" and "the limit you set
 * yourself has been reached". Those are opposite statements about someone's account.
 */
import { renderFailure, hasReason, type FailureDetail, type FailureReason } from "@/lib/failure-reasons";

/**
 * Which heading a `modal`-channel refusal gets — keyed on the REASON, never on the severity.
 *
 * 🔴 THE DEFECT THIS REPLACES. The reason branch read
 *     `title: f.severity === "error" ? m.udErrSuspendedTitle : m.udErrRgLimitTitle`
 * and every `modal`-channel reason in the registry is severity `error` — `self_excluded`,
 * `account_blocked`, `wallet_frozen`, `loss_limit_daily`, `break_active`, `kyc_required`,
 * `id_taken`, `account_suspended`. So `udErrRgLimitTitle` ("Daily loss limit reached")
 * was UNREACHABLE through this branch, and a player who hit the cap they set themselves
 * read **"Betting unavailable"** over a body saying they had reached their own limit — a
 * heading that describes an operator block, on the one refusal that is the player's own
 * tool working correctly. The registry says so in as many words at `break_active`:
 * *"A BREAK THE PLAYER SET THEMSELVES IS NOT A FAULT — it is the tool working."*
 *
 * ⚠️ It was invisible because the deleted phrase test above ran FIRST for the loss cap in
 * every real refusal shape before `19ac78ec`, and produced the right title. Removing the
 * dead route is what made the live one observable.
 *
 * ⛔ NOT FIXED BY SPLITTING ON SEVERITY DIFFERENTLY. Severity answers "how loud", which is
 * a real and separate question; it cannot also answer "whose decision was this".
 *
 * ⚠️ ONE ROW, AND THE OMISSIONS ARE DELIBERATE. `break_active` and `self_excluded` are also
 * the player's own tools, but the only other heading this dictionary has is
 * `udErrRgLimitTitle` — *"Daily loss limit reached"* — which would be a FALSE statement over
 * a cooling-off or a self-exclusion body. They keep the neutral heading, which is at least
 * true (betting genuinely is unavailable) while their body says whose decision it was.
 * Inventing two more headings is a copy decision, and it is filed rather than guessed.
 * ⛔ This map restores exactly what the deleted phrase test achieved and nothing more.
 */
const MODAL_TITLE_BY_REASON: Partial<Record<FailureReason, keyof UdErrDict>> = {
  loss_limit_daily: "udErrRgLimitTitle",
};

/** How the surface must present the refusal (§5 decision matrix). */
export type UdBetFailure =
  | {
      kind: "transient";
      /** Toast body, localized. Sticky (durationMs 0) — a money refusal stays until read. */
      description: string;
      /** SELECTION_CLOSED also flips the local surface to locked — the server has spoken. */
      lockNow: boolean;
    }
  | {
      kind: "blocked";
      /** OperationResultModal (danger, no gold): compliance/account blocks must be acknowledged. */
      title: string;
      body: string;
    };

type UdErrDict = {
  udErrSelectionClosed: string;
  udErrRateLimited: string;
  udErrBusy: string;
  udErrNotFound: string;
  udErrInvalid: string;
  udErrSuspendedTitle: string;
  udErrSuspendedBody: string;
  udErrRgLimitTitle: string;
  udErrRgLimitBody: string;
};

export function udBetErrorCopy(
  code: string | undefined,
  serverError: string | undefined,
  m: UdErrDict,
  /** C2/C3 — the machine reason and its figures, when the service emits them. */
  r?: { reason?: string; detail?: FailureDetail; retryAfterSec?: number },
  /** The `t.error` dictionary and a TZS formatter, for the reason-driven copy. */
  reasonDict?: Record<string, string>,
  money?: (n: number) => string,
): UdBetFailure {
  // ── C3 · THE REASON WINS, WHEN THERE IS ONE ────────────────────────────────
  //
  // 🔴 THIS IS THE SURFACE docs/RULES.md §2.3 WAS FAILING ON. The rule requires a 999 stake
  // to be refused "with a message NAMING the minimum". The server has always named both
  // bounds — and the INVALID branch below maps every one of them to "The bet was refused —
  // check the amount and your balance" and DISCARDS the server string BY DESIGN (correctly:
  // it is English audit prose, and rendering it raw is how a ZH player got an English
  // sentence). The fix was never to render the prose; it was for the server to say WHY in a
  // token and carry the figures as NUMBERS.
  //
  // ⚠️ The `switch` below stays and is NOT dead code: it still serves every service that
  // has not been converted (docs/FAILURE-INVENTORY.md §2.3). ⛔ It no longer carries a phrase
  // test of any kind — see the header.
  if (r?.reason && reasonDict && money && hasReason(r)) {
    const f = renderFailure(r as never, reasonDict, m.udErrInvalid, money);
    // ⛔ THE CHANNEL DECIDES THE SHAPE, and `modal` is reserved for what must be
    // acknowledged: the RG daily-loss cap (LCCP informed consent) and hard account blocks.
    // Everything a player can fix stays a sticky toast — a money refusal stays until read,
    // but it does not seize the screen.
    if (f.channel === "modal") {
      // ⛔ THE HEADING COMES FROM THE REASON, NOT THE SEVERITY — `MODAL_TITLE_BY_REASON`
      // above records what titling by severity did to the loss cap.
      const titleKey = (f.reason && MODAL_TITLE_BY_REASON[f.reason]) ?? "udErrSuspendedTitle";
      return { kind: "blocked", title: m[titleKey], body: f.body };
    }
    return { kind: "transient", description: f.body, lockNow: f.reason === "selection_closed" };
  }
  switch (code) {
    case "SELECTION_CLOSED":
      return { kind: "transient", description: m.udErrSelectionClosed, lockNow: true };
    case "RATE_LIMITED":
      return { kind: "transient", description: m.udErrRateLimited, lockNow: false };
    case "BUSY":
      return { kind: "transient", description: m.udErrBusy, lockNow: false };
    case "NOT_FOUND":
      return { kind: "transient", description: m.udErrNotFound, lockNow: false };
    case "SUSPENDED":
      return { kind: "blocked", title: m.udErrSuspendedTitle, body: m.udErrSuspendedBody };
    case "INVALID":
      // ⭐ THE RG DAILY-LOSS PHRASE TEST STOOD HERE AND IS DELETED (2026-08-15).
      // It read `if (serverError && /daily loss limit|loss limit/i.test(serverError))` and was
      // the LAST INVALID family on this surface recovered from the server's English prose.
      //
      // ⛔ IT WAS ALREADY UNREACHABLE, WHICH IS WORSE THAN IT SOUNDS. `buyPosition` has emitted
      // `reason: "loss_limit_daily"` since `19ac78ec`, and the reason branch ABOVE returns
      // before this switch is consulted — so every real refusal has taken the reason route for
      // a day, and this test could only ever have fired on a response shape the server does not
      // produce. A dead phrase test is not harmless: it reads as the live route, so a reader
      // checking "how does the loss cap reach the player?" finds the wrong answer, and any
      // rewording of the service sentence looks like it would break something when it would not.
      //
      // ⚠️ The channel it produced is PRESERVED, not lost: the registry rows `loss_limit_daily`
      // as `channel: "modal"`, and the reason branch above turns a `modal` channel into exactly
      // this `kind: "blocked"` — with `m.udErrRgLimitTitle` as the heading, because the severity
      // is `error`. Same dialog, reached by a token instead of by a sentence.
      return { kind: "transient", description: m.udErrInvalid, lockNow: false };
    default:
      // No code at all → the server string is the only truth we have. Demoted to
      // fallback, exactly as UD-4 prescribes — never preferred over the dictionary.
      return { kind: "transient", description: serverError ?? m.udErrBusy, lockNow: false };
  }
}
