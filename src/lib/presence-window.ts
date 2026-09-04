"use client";

/**
 * The attention window — when this sitting began, and whether anyone is looking.
 *
 * ── WHY THE SERVER CANNOT ANSWER THIS ────────────────────────────────────────────────
 *
 * 🔴 The signed session already carries `playStartedAt`, and a 30-minute gap in REQUESTS
 * already means "the player went away and came back" (`server/session.ts`). That is the
 * right idea and it is the seed used below — but it cannot see the case Ali actually
 * reported. A backgrounded tab keeps polling `/api/positions/settled`, every one of those
 * calls runs `getSession()`, and `getSession()` refreshes `lastSeenAt`. So a tab left open
 * overnight NEVER trips the server's play-session reset: to the server, that player never
 * left. To the human asleep in the next room, they plainly did.
 *
 * ⭐ ATTENTION IS A CLIENT FACT. `document.visibilityState` is the only witness there is,
 * and this module is the one place that reads it for this purpose.
 *
 * ── THE SEED IS NOT REDUNDANT ────────────────────────────────────────────────────────
 *
 * The client has no history on a COLD load — the case where the player closed the laptop
 * and opened it tomorrow. There the signed server value is the only honest answer, and it
 * is already correct, because a real absence produced a real gap in requests. So: the
 * server seeds the window, and the client maintains it. Each covers exactly what the other
 * cannot see. ⛔ Do not "simplify" this to one of them.
 *
 * ── CLOCK DISCIPLINE, WHICH IS THE EASIEST THING HERE TO GET WRONG ───────────────────
 *
 * ⭐ **DELTAS ARE MEASURED IN DEVICE TIME; INSTANTS ARE STORED AND COMPARED IN SERVER TIME.**
 * `hiddenAtDevice` is stamped from `Date.now()` on the hide edge and subtracted from
 * `Date.now()` on the reveal edge — a difference between two readings of the SAME clock is
 * immune to any offset, and stays correct on a device whose clock is minutes out.
 * `presenceSince` is stored as `serverNow()`, and every comparison against a settle instant
 * happens in that frame. ⛔ Nothing here ever compares a device instant to a server instant.
 *
 * ── WHY A MODULE, NOT A CONTEXT ──────────────────────────────────────────────────────
 *
 * Same reason `result-modal-presence.ts` gives for the same shape: the consumers sit at
 * different depths of the tree (the poller is lazy and session-gated; the toast provider is
 * above everything), so context would have to flow in two directions at once.
 *
 * @see docs/DESIGN_AUTHORITY.md §F5 — nothing answers an action the player did not take
 */

import { PLAY_SESSION_GAP_MS } from "@/lib/play-session";

type ReturnInfo = { hiddenForMs: number; presenceSinceMs: number };

/** `serverNow - deviceNow`, captured ONCE against the instant the server rendered.
 *  ⚠️ Never re-measured: re-capturing per read would let the classification of one outcome
 *  disagree with the next by the network latency between them. */
let offsetMs = 0;
let initialised = false;

/** When the current uninterrupted attentive window began, in SERVER time. */
let presenceSince: number | null = null;

/** When the document went hidden, in DEVICE time. `null` while visible. */
let hiddenAtDevice: number | null = null;

let listening = false;
const returnSubs = new Set<(info: ReturnInfo) => void>();

/** Now, in server time. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

/** Is the document being looked at. ⛔ SSR-safe: no document means nobody is looking. */
export function isAttentive(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible";
}

/** The start of this sitting, in server time, or `null` if never established. */
export function presenceSinceMs(): number | null {
  return presenceSince;
}

function handleVisibility(): void {
  if (document.visibilityState === "hidden") {
    // ⚠️ Stamp only the FIRST hide of a run. Some browsers fire `visibilitychange` more than
    // once on the way out (a hide followed by a pagehide-driven repeat); overwriting here
    // would restart the absence clock and make a long absence read as a short one.
    if (hiddenAtDevice == null) hiddenAtDevice = Date.now();
    return;
  }
  if (hiddenAtDevice == null) return;
  const hiddenForMs = Date.now() - hiddenAtDevice;
  hiddenAtDevice = null;

  // ⛔ A GLANCE AWAY IS NOT A RETURN. Reading one notification, checking a message, taking a
  // call — the sitting continues, and killing the ceremony for those would be a worse product
  // than the one being fixed. The boundary is `PLAY_SESSION_GAP_MS`, which is Ali's ruling of
  // 2026-09-04 and the SAME 30 minutes the server already uses: one definition of "a while",
  // not two that will drift apart.
  if (hiddenForMs < PLAY_SESSION_GAP_MS) return;

  presenceSince = serverNow();
  for (const fn of Array.from(returnSubs)) fn({ hiddenForMs, presenceSinceMs: presenceSince });
}

/**
 * Establish the window. Idempotent per mount cycle — calling it again with a fresh
 * `serverNowMs` re-anchors the offset without disturbing a window already in progress.
 *
 * ⚠️ `serverNowMs` must be read on the SERVER and passed as a prop; it is never rendered,
 * only consumed inside an effect, so no markup depends on a clock and there is no hydration
 * mismatch. That is the same discipline `useServerNow` uses (`null` until the first client
 * effect).
 */
export function initPresence(opts: { playStartedAtMs: number; serverNowMs: number }): void {
  offsetMs = opts.serverNowMs - Date.now();

  // ⛔ The seed is applied ONCE. A re-render that re-ran this with the same stale
  // `playStartedAt` would drag the window backwards over a return the client had already
  // detected, and quietly restore the ambush.
  if (!initialised) {
    presenceSince = opts.playStartedAtMs;
    initialised = true;
  }

  if (!listening && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibility);
    listening = true;
  }
}

/** Told when a real absence ends. The bar uses it to re-read the ledger on return. */
export function subscribeReturn(fn: (info: ReturnInfo) => void): () => void {
  returnSubs.add(fn);
  return () => { returnSubs.delete(fn); };
}

/** Test-only, mirroring `__resetResultModalPresence`. ⛔ Never called by product code. */
export function __resetPresence(): void {
  offsetMs = 0;
  initialised = false;
  presenceSince = null;
  hiddenAtDevice = null;
  returnSubs.clear();
  if (listening && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", handleVisibility);
  }
  listening = false;
}
