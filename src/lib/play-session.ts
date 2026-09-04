/**
 * The play-session boundary — the ONE definition of "the player went away and came back".
 *
 * ── WHY IT LIVES HERE AND NOT IN `server/session.ts` ─────────────────────────────────
 *
 * It was declared in `src/lib/server/session.ts`, which is unreachable from the client
 * graph: that module imports `next/headers`, `./crypto`, `./audit` and `./session-registry`.
 * A client component importing the constant from there would drag the whole session
 * machinery — cookies, HMAC, the audit chain — into a browser chunk.
 *
 * ⭐ This is the same extraction `hashKey64` → `lock-key.ts` already made for `locks.ts`,
 * and for the same measured reason: importing it from the server module pulled
 * `node:async_hooks` into a browser chunk and broke the build. A pure value that both graphs
 * need belongs in a pure module that both graphs can reach.
 *
 * ── WHY IT IS NOT COPIED ─────────────────────────────────────────────────────────────
 *
 * ⛔ The client-side attention window (`presence-window.ts`) needs exactly this boundary, and
 * Ali's ruling of 2026-09-04 was explicit that it must be the SAME number the server already
 * uses, not a second one that agrees today: *"one definition, not two."* A threshold written
 * twice is a threshold that will disagree with itself, which is the defect class this
 * codebase has been burned by repeatedly. `server/session.ts` re-exports from here so its own
 * surface is unchanged.
 */

/**
 * A gap of this many minutes without the player means they went away and came back: that is
 * a new play session.
 *
 * ⚠️ ON THE SERVER it is measured in REQUESTS (`now - lastSeenAt` in `getSession()`), which
 * is correct for a cold return and blind to a tab left open in the background — every poll
 * refreshes `lastSeenAt`, so a sleeping player looks present. ON THE CLIENT
 * (`presence-window.ts`) the same 30 minutes is measured in ATTENTION, which sees exactly the
 * case the server cannot. Two measurements of one boundary, deliberately.
 */
export const PLAY_SESSION_GAP_MIN = 30;
export const PLAY_SESSION_GAP_MS = PLAY_SESSION_GAP_MIN * 60_000;
