/**
 * Sanitise an error for client-facing UI. Logs the real message server-side
 * for debugging, returns only the safe fallback label to the browser.
 *
 * Prevents raw Error.message (which may contain SQL fragments, file paths,
 * or stack traces) from leaking to admin or player UIs.
 */
export function safeError(err: unknown, fallback: string): string {
  const raw = (err as Error)?.message ?? String(err);
  console.error(`[action] ${fallback}:`, raw);
  return fallback;
}
