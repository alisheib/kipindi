/**
 * fieldError — DG-S-05 (DESIGN-GATE-2026-08-28 step 5), §K rule 7d.
 *
 * ⭐ Ali's commission has two halves and they run in order: *"forms validations and input
 * validation, and validation takes you to the place where the missing item is."* DG-S-06 builds
 * the second half (`focusFirstInvalid`). ⛔ IT CANNOT WORK WITHOUT THIS ONE, and that is the
 * whole reason DG-S-05 comes first: **if the server says "this is wrong" without saying WHICH
 * field, no amount of client focus code can take an operator to it.**
 *
 * 📐 RE-DERIVED AT HEAD, 2026-08-31. Admin validation is overwhelmingly server-side and
 * hand-rolled: 34 files carry `"use server"`, exactly ONE under `src/app/admin` imports `zod`
 * (`bonuses/bonus-actions.ts`), and `src/lib/server/validators.ts` has no field-error surface at
 * all — no `flatten`, no `fieldErrors`. Every admin action returns `{ ok: false, error: "<a
 * sentence>" }`. The sentence is often excellent; it is simply not addressable.
 *
 * ⛔ SO THIS IS THE SURFACE, NOT THE MIGRATION. It is deliberately additive: `field` is
 * OPTIONAL, so every existing `{ ok: false, error }` still type-checks and still renders exactly
 * as it does today. Nothing is silently rewritten across 34 server files — several of them are
 * money-adjacent, and a blind sweep over an action that moves money is how a correct control
 * breaks. Adoption is per-action, deliberate, and named in the planner as the remainder.
 */

/** The failure shape every admin mutation already returns, plus an address. */
export type ActionFailure = {
  ok: false;
  /** The sentence an operator reads. Unchanged — this is not a new copy layer. */
  error: string;
  /**
   * The `data-field` of the control the operator must fix.
   *
   * ⚠️ IT MUST MATCH A RENDERED `data-field`, and nothing can check that for you across the
   * server/client boundary — a typo here degrades to "no focus happens", which is exactly
   * today's behaviour, so it fails toward the status quo rather than toward a wrong jump.
   * `focusFirstInvalid` reports a name it cannot find rather than refusing in silence.
   */
  field?: string;
};

/**
 * Refuse, and say where.
 *
 * ⛔ `field` FIRST in the signature on purpose: the whole point of this helper is that the
 * address is not an afterthought. A call that omits it is a plain `{ ok: false, error }`, which
 * is still legal and still better than throwing — it just cannot take anyone anywhere.
 */
export function fieldError(field: string, error: string): ActionFailure {
  return { ok: false, error, field };
}
