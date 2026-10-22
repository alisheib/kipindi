/**
 * MASWALI MILLIONEA — HOW FAR THE PRODUCT HAS ROLLED OUT (MASWALI-BUILD S1; MASWALI-PLAN §7b S1 item 5 and the
 * "Corrections of 2026-10-17").
 *
 * THREE positions, the journey's words (`rollout-state.ts → RolloutState`), and each is a different thing a person sees:
 *   · WITHDRAWN     — nobody. Every `/millionea` route 404s; no card, no nav door, no notice anywhere.
 *   · STAFF_PREVIEW — a signed-in STAFF session (its stored role re-checked), or a browser holding a Millionea preview
 *                     pass a staff member set (`server/millionea-preview.ts`), in EITHER shell, under a "Preview" mark.
 *   · ACTIVE        — everyone.
 *
 *     state = lowerRollout(millioneaCeiling(), the Owner's stored switch)        (`server/millionea-switch.ts`)
 *
 * ⛔ ITS OWN MODULE, OUTSIDE `feature-state.ts`, ON PURPOSE: the Vodacom S15 flip edits that file, and two lanes editing
 *    one rollout block is how a merge turns one product on by accident. It imports the rollout's TYPE, `isRolloutState`
 *    and `lowerRollout` from the pure `rollout-state.ts` and nothing else (2026-10-18: the privacy page's version reads
 *    this module from a client bundle, and `feature-state.ts` must never be client-reachable).
 * ⛔ DIFFERENT FROM THE JOURNEY'S AUDIENCE, ON PURPOSE: there a staff role alone sees nothing new (the preview is opt-in,
 *    because the journey REPLACES the shell). Millionea adds a product beside the others in both shells, so a staff
 *    session sees it at STAFF_PREVIEW without a pass, and the pass exists for the non-staff QA players of the S8 drive.
 * ⛔ THE SWITCH CONTROLS VISIBILITY ONLY. Selling is separately gated: the licence basis (`maswali-licence.ts`), the
 *    funded guarantee, an open week, and the sales pause (S4). A visible product can still sell nothing.
 *
 * Isomorphic: no Prisma, no `server-only`. On the client `process.env.FEATURE_MILLIONEA` is undefined, so the ceiling
 * reads as the shipped constant — a client never decides visibility; the server resolves it and renders the answer.
 */
import { isRolloutState, lowerRollout, type RolloutState } from "@/lib/rollout-state";

export type { RolloutState } from "@/lib/rollout-state";

/**
 * ⭐ THE SHIPPED CEILING: WITHDRAWN until Ali decides. M7 raises it to STAFF_PREVIEW on production through the env
 * (`FEATURE_MILLIONEA=STAFF_PREVIEW`, a restart, instantly reversible); ACTIVE is the launch commit after Gate B.
 */
export const MILLIONEA_SHIPPED: RolloutState = "WITHDRAWN";

/** The environment variable that sets the ceiling, by its exact name (read by `/api/health` and the boot log). */
export const MILLIONEA_ENV = "FEATURE_MILLIONEA";

/**
 * THE OUTER CEILING — what the code and the server's environment allow, before the Owner's stored switch is asked.
 * `FEATURE_MILLIONEA` is the hard override: exactly `WITHDRAWN`, `STAFF_PREVIEW` or `ACTIVE`. ⛔ Anything else — a
 * typo, lower case, blank — falls back to the shipped constant: a typo can neither launch Millionea nor lift a kill.
 */
export function millioneaCeiling(): { ceiling: RolloutState; source: "ENV" | "CODE" } {
  const raw = typeof process !== "undefined" ? process.env?.[MILLIONEA_ENV] : undefined;
  if (isRolloutState(raw)) return { ceiling: raw, source: "ENV" };
  return { ceiling: MILLIONEA_SHIPPED, source: "CODE" };
}

/**
 * ⭐ IS MILLIONEA NAMED IN THE PUBLISHED LEGAL TEXT? (the lead's decisions of 2026-10-18, under Ali's delegation): only at an
 * ACTIVE ceiling, when the public can open the slip. A STAFF_PREVIEW ceiling keeps production's notice: the public notice
 * never names a product the public cannot see, and the staff testing the preview are told internally. Privacy §7's slip paragraph, and the version it moves the
 * notice to, print then and only then (`server/legal/millionea-wording.tsx`, `POLICY_PAGES.privacy`); below it — on
 * production today — the notice is the one production has always printed, byte for byte. The ceiling, never the Owner's
 * stored switch: the slip's tab key can exist only where the ceiling has let someone open the slip, and a kill pauses the
 * product without unwriting what a tab already holds — the notice keeps saying what is true.
 */
export function millioneaWordingPublished(): boolean {
  return millioneaCeiling().ceiling === "ACTIVE";
}

/**
 * The Owner's stored switch, as the read side knows it:
 *   · ABSENT    — nobody has pressed anything: no cap, the ceiling decides;
 *   · UNREAD    — the read failed or has not landed: WITHDRAWN;
 *   · MALFORMED — not a correctly sealed record: WITHDRAWN;
 *   · SET       — the Owner's cap: the lower of it and the ceiling.
 */
export type MillioneaStoredCap = { kind: "ABSENT" } | { kind: "UNREAD" } | { kind: "MALFORMED" } | { kind: "SET"; cap: RolloutState };

/** ⭐ THE TRUTH TABLE, IN ONE FUNCTION. ⛔ The default is WITHDRAWN: a stored state this does not know shows nothing. */
export function composeMillionea(ceiling: RolloutState, stored: MillioneaStoredCap): RolloutState {
  if (!isRolloutState(ceiling)) return "WITHDRAWN";
  switch (stored.kind) {
    case "ABSENT": return ceiling;
    case "SET": return lowerRollout(ceiling, stored.cap);
    default: return "WITHDRAWN";
  }
}

/**
 * ⭐ THE ONE DECISION: does THIS request see Millionea, and does it wear the "Preview" mark?
 * `staff` is a signed-in session whose STORED role is a staff role on an open account; `pass` is a verified
 * Millionea preview pass whose issuer still vouches for it. Both are resolved by the server, per request.
 */
export function millioneaVisibleFor(
  state: RolloutState,
  viewer: { staff: boolean; pass: boolean },
): { visible: boolean; preview: boolean } {
  if (state === "ACTIVE") return { visible: true, preview: false };
  if (state === "STAFF_PREVIEW" && (viewer.staff === true || viewer.pass === true)) return { visible: true, preview: true };
  return { visible: false, preview: false };
}
