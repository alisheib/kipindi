// src/lib/needle-bridge.ts
// Thin app-facing API for The Needle pause object. The object mounts once in the
// shell (src/components/layout/needle.tsx) and listens for these window events, so
// callers never need a ref to it. All calls are safe on the server and pre-mount
// (they simply do nothing until the object is listening).

import { getPrefs, setPrefs } from "@/lib/haptics";

function emit(type: string): void {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent(type)); } catch { /* ignore */ }
}

/**
 * A position the player HOLDS has settled. Gives the object one quarter-turn back
 * to true — an acknowledgement, not a celebration (there is deliberately no
 * win/loss variant). Call only for the current user's own resolved positions.
 */
export function acknowledgeNeedle(): void {
  emit("needle:acknowledge");
}

/**
 * Hide the object for the duration of a live money commit (bet confirm, cash-out,
 * stake sheet). Pair every suppress() with exactly one release(). Reference-counted
 * inside the object, so nested/overlapping sheets are safe.
 */
export function suppressNeedle(): void {
  emit("50pick:needle-suppress");
}
export function releaseNeedle(): void {
  emit("50pick:needle-release");
}

/** Persisted show/hide preference (navbar + settings toggle). */
export function isNeedleHidden(): boolean {
  return getPrefs().needleHidden === true;
}
export function setNeedleHidden(hidden: boolean): void {
  setPrefs({ needleHidden: hidden });   // dispatches "50pick:feedback-changed"
}
export function toggleNeedleHidden(): boolean {
  const next = !isNeedleHidden();
  setNeedleHidden(next);
  return next;
}
