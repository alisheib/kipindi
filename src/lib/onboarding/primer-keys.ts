/**
 * THE FIRST-VISIT KEYS — the path rules, the seen keys and the automation opt-in that the shelved first-visit primer and
 * the How-to host both read (the Vodacom plan S11 WP2; VODACOM-PLAN §3.8: "the shared keys and opt-ins move to
 * `primer-keys.ts`, so `?primer=1` and `kp-primer-force` still work"; `S11-PLAN.md` WP2).
 *
 * ⭐ ONE DEFINITION, TWO READERS. `first-visit-primer.tsx` (shelved for a journey reader since S7 WP8, SHELVED.md) imports
 * the five it declared — `PRIMER_SEEN_KEY` as its own `STORAGE_KEY`, `HIDE_ON`, `SUPPRESS_ON` and `primerForced` — so every
 * line that reads them is the line it was, and the primer behaves as before, line for line. The How-to host (S11 WP4)
 * reads the same rules for its auto-open, plus the How-to seen key and the two storage helpers below.
 * ⛔ NO DIRECTIVE AND NO IMPORTS: pure, so a client component, a server test and the graph walker all load it as it is
 * (`test:client-graph-safe`). The browser globals are read inside functions only, never at module scope.
 * ⭐ The guards that read these: `test:marketing-optout` (HIDE_ON keeps `/s`, the marketing opt-out page, D6),
 * `test:stacking` §8 (both path rules declared here, imported by the primer and the host, tested in the effect AND the
 * render, the automation block overridable) and `test:howto` §2 (the host).
 */

/** The shelved primer's seen key: "1" once a browser has dismissed it. Demo runs can clear it to see the primer again. */
export const PRIMER_SEEN_KEY = "50pick-primer-seen";

/**
 * How to Play's seen key (VODACOM-PLAN §3.8): "1" once any exit of the sheet has run, whatever opened it, so the guide
 * opens by itself once per browser. Privacy §7 names it (§3.10: named in the same commit as its first write).
 */
export const HOWTO_SEEN_KEY = "50pick-howto-seen";

// ⛔ `s` = the marketing opt-out page (D6): somebody who came to STOP marketing is never shown a betting
// tutorial — and they arrive in exactly the fresh browser this opens for. `test:marketing-optout` pins it.
export const HIDE_ON = /^\/(auth|admin|s)(\/|$)/;
// B-26 — a deep-linked market detail (especially one carrying `?side=` from a
// shared card) is a bet-intent moment: ambushing it 700ms in with a four-card
// primer costs the platform its most valuable arriving click. The primer waits
// for a board-level landing instead.
export const SUPPRESS_ON = /^\/markets\/[^/]+|^\/updown\/[^/]+/;

/**
 * ⭐ THE EXPLICIT OPT-IN THAT MAKES THE PRIMER PHOTOGRAPHABLE.
 *
 * A driver sets `?primer=1` (or `localStorage.kp-primer-force = "1"`) and the automation block
 * above stands down for that context only. ⛔ Deliberately NOT a UA allowlist and not an env
 * flag: a query parameter is visible in the drive that used it, so a screenshot can always be
 * traced back to the thing that asked for the modal.
 */
export function primerForced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("primer") === "1") return true;
    return window.localStorage.getItem("kp-primer-force") === "1";
  } catch {
    return false;
  }
}

/**
 * The automation block's user-agent test. ⚠️ The primer spells the same pattern inline on its UA line, which stays byte
 * for byte as it was (`test:stacking` 8.4 reads that line for its `primerForced()` call); `test:howto` §2 holds the two
 * spellings equal, so they cannot drift.
 */
export const AUTOMATION_UA = /HeadlessChrome|Playwright/i;

export function automationUa(ua: string): boolean {
  return AUTOMATION_UA.test(ua);
}

/**
 * Is this browser driven by automation? The UA test, OR `navigator.webdriver` — for the How-to host only (S11-PLAN Open
 * point 6). Measured 2026-10-14 (S11-PLAN Correction 12): Playwright's Firefox and WebKit carry neither "HeadlessChrome"
 * nor "Playwright" in their user agent, and `navigator.webdriver` is true in all three engines — so the UA test alone
 * would let an auto-open cover a Firefox or WebKit drive. The primer keeps its UA test alone (its behaviour unchanged).
 */
export function automated(nav: { userAgent: string; webdriver?: boolean }): boolean {
  return automationUa(nav.userAgent) || nav.webdriver === true;
}

/**
 * Has this browser seen it — or can it not say? Storage that throws (private browsing, a blocked site) counts as SEEN,
 * so nothing auto-opens where its dismissal could never be remembered: the primer's rule (its seen read sits in a
 * `try` whose `catch` opens nothing).
 */
export function seenOrUnreadable(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

/** Remember that it was seen. A refused write is swallowed: at worst the guide opens once more on a later landing. */
export function markSeen(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* storage refused (private browsing) — nothing else to do */
  }
}
