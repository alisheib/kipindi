/**
 * THE LOST-CHUNK GUARD — ONE DEFINITION FOR EVERY `next/dynamic` LOADER IN THE APP (the Vodacom plan S7, S7-PLAN WP6 and
 * amendments A13(a) and A24 item 5; it was written for the shell's deferred parts in S6 WP6c, VODACOM-PLAN §0h point 20).
 *
 * ⭐ A PART WHOSE CODE NEVER ARRIVES IS LEFT OUT, NOT FATAL. A part loaded through `next/dynamic` is a fetch of its own,
 * and a fetch can fail: a dropped connection, or a deploy landing between the page and its chunk. Turbopack names that a
 * `ChunkLoadError` and never retries it, and with nothing between the part and the root to catch it, React's rejected
 * lazy load would take the whole page to the critical-error screen. So a loader ends in `.catch(nothingIfLost)`: the part
 * renders nothing for the rest of that page's life, one report per page goes to `/api/client-error` (the endpoint and
 * the body the error boundaries send), and any other error is thrown on, exactly as before. The server never takes this
 * path (its chunks are on disk), so the HTML does not change.
 * ⭐ WHY ONE MODULE (S7-PLAN A13(a), A24 item 5). The guard lived in `shell-lazy.tsx`, and `route-ghost-lazy.tsx` carried
 * a character-for-character copy, held equal by `test:visual-pass-r5d` §2. Lifted here verbatim (only `export` added, the
 * report's words unchanged), every loader takes the one guard and none keeps its own: the shell's parts
 * (`shell-lazy.tsx`), the journey's route ghosts (`route-ghost-lazy.tsx`), the Tiketi switch's tabs
 * (`journey/tickets/ticket-switch-rail.tsx`) and the journey home's parts (`journey/home/home-lazy.tsx`). The chat bubble
 * and the first-visit primer (`lazy-overlays.tsx`) take it in S7's live fix L1, for every player (A13(b)) — not before.
 * The once-per-page flag is shared with it: one report per page across every loader that takes the guard.
 * ⛔ NO DIRECTIVE AND NO IMPORTS. It is a plain module the client loaders import (`test:journey-shell` 12.parts.client
 * sets aside exactly this specifier and requires both), so it adds nothing to a page but these few lines; and
 * `test:journey-shell` 12.module.lost holds the guard here, by its parts and their order.
 */

/** What a part renders when its code never arrived: nothing. */
export function Nothing(): null {
  return null;
}

/** One report per page: the parts share one connection, so a dropped one would otherwise report each of them. */
let reported = false;

/**
 * The end of every part's loader: a `ChunkLoadError` (the browser could not fetch the part's code) leaves the part out,
 * reported once; anything else is thrown on, as it was before WP6c. See "A PART WHOSE CODE NEVER ARRIVES" above.
 */
export function nothingIfLost(error: unknown): typeof Nothing {
  if (!(error instanceof Error) || error.name !== "ChunkLoadError") throw error;
  if (!reported && typeof window !== "undefined") {
    reported = true;
    try {
      const body = JSON.stringify({
        message: `A part of the shell never arrived and was left out: ${error.message}`.slice(0, 1_000),
        stack: String(error.stack ?? "").slice(0, 4_000),
        path: window.location.pathname,
        digest: null,
        build: String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "") || null,
      });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
      }
    } catch {
      /* reporting must never be the thing that breaks the page */
    }
  }
  return Nothing;
}
