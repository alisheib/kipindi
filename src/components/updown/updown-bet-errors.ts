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
 * ⚠️ THE ONE STRING TEST IN HERE, AND WHY. The RG daily-loss refusal returns
 * `code: "INVALID"` — the same code as a stake-bounds error — and the §5 matrix
 * routes it to the acknowledge-modal (LCCP informed consent), not a toast. The
 * guardrails forbid adding a distinct code server-side from this session, so the
 * classifier matches the refusal's own stable phrase. If that phrase ever moves,
 * the failure mode is a sticky toast instead of a modal — quieter than intended,
 * never silent. Flagged for Ali in MASTER-PLAN §9: a dedicated code would be cleaner.
 */

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
): UdBetFailure {
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
      // The RG daily-loss refusal — see the header for why this is a string test.
      if (serverError && /daily loss limit|loss limit/i.test(serverError)) {
        return { kind: "blocked", title: m.udErrRgLimitTitle, body: m.udErrRgLimitBody };
      }
      return { kind: "transient", description: m.udErrInvalid, lockNow: false };
    default:
      // No code at all → the server string is the only truth we have. Demoted to
      // fallback, exactly as UD-4 prescribes — never preferred over the dictionary.
      return { kind: "transient", description: serverError ?? m.udErrBusy, lockNow: false };
  }
}
