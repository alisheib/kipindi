/**
 * ADMIN REFUSALS — sanitising a crash, and carrying a refusal the operator can act on.
 *
 * 🔴 THE INCIDENT (production, 2026-08-31). Poll generation was refused by our own AI spend
 * cap — $20.56 against a $20.00 top-up window — and the operator never saw one word of it.
 * `safeError` logged the sentence and returned `"Generation failed"`; the console replaced even
 * that with *"The AI could not produce a valid poll. Try again."* So the screen instructed a
 * retry against a ceiling that can never yield, and the retries happened.
 *
 * ⭐ THE SECOND LESSON WAS THE EXPENSIVE ONE, AND IT IS WHY THIS FILE HAS A SHAPE. The first
 * repair passed the ENGLISH SENTENCE through. That unblocked the operator and was still the
 * wrong architecture — `src/lib/failure-reasons.ts` had already settled this for the player
 * surface, in its own header:
 *
 *     ⛔ THE SERVER SAYS WHY, IN A MACHINE TOKEN, AND CARRIES THE FIGURES AS DATA.
 *     ⛔ INTERPOLATED FIGURES COME FROM `detail`, NEVER FROM THE PROSE.
 *
 * A sentence with `$20.56` baked into it can only ever be PRINTED. The owner read that exact
 * sentence — which NAMES the screen that lifts the block — and still had to ask *"where do I
 * fix it, which screen?"*, because prose that names a destination cannot LINK to one. That
 * question is the entire argument for the shape below.
 *
 * ⛔ SCOPE, STATED HONESTLY, BECAUSE THE FIRST ATTEMPT AT THIS CRITIQUE WAS WRONG.
 * `failure-reasons.ts` is scoped to the PLAYER's betting and cash-out paths and its copy lives
 * in three languages. This is the ADMIN seam, which is English-only in practice — 4 of 195
 * admin files use the i18n hook. ⚠️ MEASURE IT, do not assume: `grep -rlE "\buseT\(|\bgetServerT\("`,
 * with the `(`, because a bare `useT` also matches every `useTransition` and reports 55.
 * So this does NOT duplicate the player registry's dictionary machinery; it carries the same
 * three ideas — token, figures as data, a next step — at the size the admin surface needs.
 * ⚠️ If admin copy is ever translated, `reason` is the key to translate ON and `message`
 * becomes the fallback, which is why `reason` exists even though English is what ships.
 */

// ⛔ THE CONTRACT ITSELF LIVES IN `src/lib/operator-refusal.ts`, NOT HERE, because the console
// that renders a refusal is a CLIENT component and must never reach into `lib/server/` for a
// type. This module owns the EMITTER half only. Re-exported so no call site needs to know.
export type { RefusalFix, OperatorRefusal } from "../operator-refusal";
import type { OperatorRefusal } from "../operator-refusal";

/**
 * A refusal whose message was WRITTEN FOR THE OPERATOR and is safe to show.
 *
 * ⛔ KEEP THIS NARROW. A crash message is untrusted: it can carry SQL, paths, or a stack, and
 * it stays redacted. This class marks the opposite case — a message a human deliberately
 * composed for the person reading the screen. Throw it ONLY with a sentence you would be happy
 * to publish, and NEVER wrap a caught provider or database error in it, because the sanitiser
 * will then hand that error's text straight to the browser.
 *
 * ⭐ THE DISCRIMINATOR IS THE TYPE, NOT THE WORDING. A plain `Error` whose message happens to
 * read like operator prose stays redacted — otherwise the rule becomes "nice-sounding errors
 * leak", which is not a rule anybody can apply.
 */
export class OperatorError extends Error {
  readonly refusal?: OperatorRefusal;
  constructor(message: string, refusal?: OperatorRefusal) {
    super(message);
    this.name = "OperatorError";
    this.refusal = refusal;
  }
}

/** True when `err` is an {@link OperatorError} — including one thrown across a module
 *  boundary, where `instanceof` can fail if the class is somehow duplicated in the bundle. */
function isOperatorError(err: unknown): err is OperatorError {
  return err instanceof OperatorError
    || (!!err && typeof err === "object" && (err as Error).name === "OperatorError");
}

/**
 * Sanitise an error for client-facing UI. Logs the real message server-side for debugging and
 * returns only the safe fallback label to the browser — UNLESS the error is an
 * {@link OperatorError}, whose message is the answer rather than a leak.
 *
 * Prevents raw `Error.message` (which may contain SQL fragments, file paths, or stack traces)
 * from reaching admin or player UIs.
 */
export function safeError(err: unknown, fallback: string): string {
  const raw = (err as Error)?.message ?? String(err);
  console.error(`[action] ${fallback}:`, raw);
  return isOperatorError(err) && raw ? raw : fallback;
}

/**
 * The structured half of the same refusal, for a surface that can render a CONTROL instead of
 * a sentence. `undefined` for anything that is not a deliberate operator refusal.
 *
 * ⛔ MUST STAY SERIALISABLE — it crosses the server-action boundary. Plain data only: no
 * `Error`, no `Date`, no function.
 */
export function safeRefusal(err: unknown): OperatorRefusal | undefined {
  return isOperatorError(err) ? err.refusal : undefined;
}

/**
 * What an action returns when it refuses.
 *
 * ⭐ `error` IS NOT REDUNDANT BESIDE `refusal`, and that is a deliberate design choice rather
 * than a transitional one. A surface that has not been taught a given `reason` still has one
 * correct sentence to render, so adding a reason can never blank a screen that has not caught
 * up. The player registry learned the same thing the hard way — `docs/FAILURE-INVENTORY.md`
 * §3.12 deleted six `REASON_BY_CODE` rows that nothing emitted, after §3.10 found a dead phrase
 * test hiding a live wrong heading.
 */
export type ActionRefusal = { ok: false; error: string; refusal?: OperatorRefusal };

/**
 * Build an action's refusal return value from a thrown error, in ONE place.
 *
 * ⛔ USE THIS RATHER THAN CALLING `safeError` AND `safeRefusal` SEPARATELY. Two calls is two
 * chances to pass the structured half and forget the sentence, or the reverse — and a refusal
 * that carries a `reason` the UI renders but no `error` for the UI that has not been taught it
 * is exactly the half-migrated state this seam is supposed to make impossible.
 */
export function refuseFrom(err: unknown, fallback: string): ActionRefusal {
  return { ok: false, error: safeError(err, fallback), refusal: safeRefusal(err) };
}
