"use client";

/**
 * IS A RESULT MODAL ON SCREEN RIGHT NOW? — a two-line registry, for one rule.
 *
 * ── THE RULE (`docs/DESIGN_AUTHORITY.md` §F1) ────────────────────────────────────────────
 * The popup is the PRIMARY signal on a consequential mutation; the corner toast is the
 * SECONDARY one. ⭐ So the secondary stands down while the primary is up — Ali's decision,
 * 2026-08-15.
 *
 * ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
 * At 360px the toast stack covers the bet receipt's crest for the toast's first 3 seconds.
 * At 768 and above there is room for both and it is perfect, which is exactly why it
 * survived: the two signals fire together by design, and only the narrowest viewport — the
 * one most players are on — puts them in the same place.
 *
 * ── ⛔ WHY THIS IS NOT A Z-INDEX CHANGE ─────────────────────────────────────────────────
 * Toasts sit ABOVE modals on purpose. A failure fired while a confirm dialog is open has to
 * stay readable — that ordering is a safety property, not an accident, and restacking it
 * globally to fix a 360px overlap would trade a cosmetic collision for a lost failure
 * message. The suppression is therefore at the SOURCE: the toast provider asks whether a
 * result modal is up, and holds the toast if one is.
 *
 * ── ⛔ AND NOTHING IS DROPPED ───────────────────────────────────────────────────────────
 * A held toast is QUEUED, not discarded, and flushed the moment the modal closes. A sticky
 * money-path failure (`durationMs: 0`, the shape UD-3 requires to stay until read) that got
 * swallowed because a modal happened to be open would be a refusal the player never saw —
 * strictly worse than the overlap this exists to fix. `toast.tsx` is where that is enforced;
 * this module only answers the question.
 *
 * ── WHY A MODULE-LEVEL COUNTER AND NOT REACT CONTEXT ────────────────────────────────────
 * `ToastProvider` sits ABOVE every result modal in the tree, so a context published by the
 * modals cannot be read by the provider — the data flows the wrong way. A counter with a
 * subscription is the same shape `use-modal-lock.ts` already uses for the scroll lock, and
 * for the same reason. ⚠️ It COUNTS rather than flags: two result modals can overlap during a
 * cross-fade, and a boolean would be cleared by the first one to unmount while the second is
 * still on screen.
 */
import { useEffect } from "react";

let openCount = 0;
const listeners = new Set<(open: boolean) => void>();

function publish() {
  const open = openCount > 0;
  for (const fn of listeners) fn(open);
}

/** True while at least one result modal is mounted and open. */
export function isResultModalOpen(): boolean {
  return openCount > 0;
}

/** Subscribe to presence changes. Returns an unsubscribe. */
export function subscribeResultModal(fn: (open: boolean) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Register a result modal's presence for as long as `open` is true.
 *
 * ⚠️ THE CLEANUP IS THE LOAD-BEARING HALF. If a modal unmounts while open — a route change
 * during the 5s auto-close, which is an ordinary thing for a player to do — the effect
 * teardown still runs and the count still falls. A registry that leaked one count would
 * silence every toast on the site until reload, so the failure mode of getting this wrong is
 * total and silent, which is why the count is asserted back to zero by `test:feedback-law`.
 */
export function useResultModalPresence(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openCount++;
    publish();
    return () => {
      openCount = Math.max(0, openCount - 1);
      publish();
    };
  }, [open]);
}

/** Test-only reset, so a suite cannot leak presence into the next case. */
export function __resetResultModalPresence(): void {
  openCount = 0;
  publish();
}
