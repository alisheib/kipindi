/**
 * WHO SIGNED A MARKET OFF — one derivation for every public surface that says it.
 *
 * ⭐ THE STAMPS ARE THE RECORD. A solo resolve stamps BOTH `resolutionStage1By` and
 * `resolutionStage2By` with the same officer; a two-officer resolve stamps two different officers;
 * the automatic resolver stamps its own actor into both. An objection upheld with remedy REVERSE
 * flips the verdict and leaves the stamps as they were (objections-service.ts), so for such a
 * market the stamps name who signed the verdict that was OVERTURNED — the caller must say so.
 *
 * ⛔ WHY THIS MODULE EXISTS (landing v3, 2026-09-26). The landing's settled strip and `/fairness`
 * each derived the answer inline, and they disagreed: `/fairness` asked only "two distinct stamps?",
 * so a market the AUTOMATIC resolver sealed — both stamps `system_auto_resolver` — was published as
 * "One officer", a human sign-off that never happened, while the market page already excluded
 * `system_` actors. A public attestation that credits a person with a machine's verdict is the
 * over-claim `MOBILE-VISUAL-PLAN` ruling 15 calls a regulatory finding. Both surfaces, and
 * `/api/fairness/recent`, now read this. `test:signoff` pins that they do.
 *
 * ⚠️ Every automatic actor is a `system_` id (`AUTO_RESOLVER_ACTOR` = "system_auto_resolver", and the
 * demo auto-settle "system_demo_auto"); an officer id never is. Reading the prefix rather than a list
 * means a future automatic path cannot be counted as a person. `test:signoff` asserts the prefix
 * still covers `AUTO_RESOLVER_ACTOR`. Pure: no server imports, so client and server both use it.
 */
export type Signoff = "two" | "one" | "auto" | "objection";

export const AUTOMATIC_ACTOR_PREFIX = "system_";

const isAutomatic = (id: string | null | undefined) => !!id && id.startsWith(AUTOMATIC_ACTOR_PREFIX);

export function signoffOf(
  m: { resolutionStage1By: string | null; resolutionStage2By: string | null },
  /** True when an objection on this market was UPHELD with remedy REVERSE. */
  reversedOnObjection = false,
): Signoff | null {
  if (reversedOnObjection) return "objection";
  const a = m.resolutionStage1By, b = m.resolutionStage2By;
  if (!a && !b) return null;
  if (isAutomatic(a) || isAutomatic(b)) return "auto";
  return a && b && a !== b ? "two" : "one";
}

/** The word for a sign-off, from the reader's dictionary. */
export function signoffWord(
  common: { twoOfficerSealed: string; oneOfficerSealed: string; autoSealed: string; correctedOnObjection: string },
  s: Signoff,
): string {
  return s === "two" ? common.twoOfficerSealed
    : s === "auto" ? common.autoSealed
    : s === "objection" ? common.correctedOnObjection
    : common.oneOfficerSealed;
}
