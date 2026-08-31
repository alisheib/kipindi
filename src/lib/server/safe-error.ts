/**
 * Sanitise an error for client-facing UI. Logs the real message server-side
 * for debugging, returns only the safe fallback label to the browser.
 *
 * Prevents raw Error.message (which may contain SQL fragments, file paths,
 * or stack traces) from leaking to admin or player UIs.
 */

/**
 * A refusal whose message was WRITTEN FOR THE OPERATOR and is safe to show.
 *
 * 🔴 WHY THIS EXISTS (2026-08-31, found on production). Poll generation was refused by our
 * own AI spend cap — `describeAiBudgetBlock()` produced the exact sentence an operator needs:
 * *"AI credit limit reached ($20.56 of $20.00 this top-up window). Raise the limit, or start a
 * new top-up window after adding credit, under Admin → AI usage."* `safeError` then threw that
 * sentence away and returned `"Generation failed"`, and the console replaced even that with
 * *"The AI could not produce a valid poll. Try again."* — so the screen told the operator to
 * retry against a ceiling that can never yield, and they did, repeatedly.
 *
 * That is the precise failure `ai-usage.ts` already warns about above `describeAiBudgetBlock`:
 * *"A refusal that names the wrong cause sends an operator to raise a limit that was never the
 * problem."* Defining the sentence once did not protect it — the transport layer deleted it.
 *
 * ⛔ THE DISTINCTION IS THE POINT, so keep it narrow. A crash message is untrusted: it can
 * carry SQL, paths, or a stack, and it stays redacted. This class marks the opposite case —
 * a message some human deliberately composed for the person reading the screen. Throw it ONLY
 * with a sentence you would be happy to publish; never wrap a caught provider or database
 * error in it, because the sanitiser will then hand that error's text straight to the browser.
 */
export class OperatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperatorError";
  }
}

/** True when `err` is an {@link OperatorError} — including one thrown across a module
 *  boundary, where `instanceof` can fail if the class is somehow duplicated in the bundle. */
function isOperatorError(err: unknown): err is Error {
  return err instanceof OperatorError
    || (!!err && typeof err === "object" && (err as Error).name === "OperatorError");
}

export function safeError(err: unknown, fallback: string): string {
  const raw = (err as Error)?.message ?? String(err);
  console.error(`[action] ${fallback}:`, raw);
  // A deliberate, operator-facing refusal is the ANSWER, not a leak — pass it through.
  return isOperatorError(err) && raw ? raw : fallback;
}
