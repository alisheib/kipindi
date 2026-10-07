/**
 * U13 · THE SEND WINDOW'S CLOCK — the instant the send window is judged at: now (`sendWindowNow`, the default clock of
 * `liveSendWindow` in `./dispatch`).
 *
 * ⚠️ A DEV AND TEST SEAM LIVES HERE, AND ONLY HERE: a developer's drive may pin the clock (`/api/dev-test/marketing-send-window`)
 * to photograph the closed window by day, and `test:marketing-window` pins it to drive the default window at a fixed hour.
 * The pin sits on `globalThis`, so the route, the page and its actions — separate module instances under Next — read one
 * clock. ⛔ IT IS A NO-OP IN PRODUCTION, BOTH WAYS: the reader ignores a pin and the setter writes none — the same rule as
 * every `api/dev-test` route, which also answers 404 there.
 */

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SEND_WINDOW_AT_MS: number | undefined;
}

/** ⭐ The instant the send window is judged at — now, or (never in production) the instant a drive or a suite pinned. */
export function sendWindowNow(): number {
  if (process.env.NODE_ENV !== "production") {
    const pinned = globalThis.__50PICK_SEND_WINDOW_AT_MS;
    if (typeof pinned === "number" && Number.isFinite(pinned)) return pinned;
  }
  return Date.now();
}

/** ⚠️ DEV AND TEST SEAM ONLY — pins the send window's clock; null puts the real clock back. ⛔ A no-op in production. */
export function __setSendWindowClockForDev(atMs: number | null): void {
  if (process.env.NODE_ENV === "production") return;
  globalThis.__50PICK_SEND_WINDOW_AT_MS = atMs !== null && Number.isFinite(atMs) ? atMs : undefined;
}
