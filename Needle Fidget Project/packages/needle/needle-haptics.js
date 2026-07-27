/* ===========================================================================
   50pick — Needle haptics  ·  v1.0
   ---------------------------------------------------------------------------
   Every vibration the object can produce, in one place, as a named vocabulary
   rather than navigator.vibrate() sprinkled through the interaction code.

   Principles
     · Haptics confirm PHYSICAL events only: contact, passing true, coming to
       rest. Never used for encouragement, reward, or to pull attention.
     · Intensity is proportional to the real event. A hard wall hit buzzes
       harder than a soft one because it IS harder, not for drama.
     · Rate-limited. Two haptics inside 40ms are indistinguishable to skin and
       just drain battery, so the later one is dropped.
     · Silent by default on anything the user has asked to be calm:
       prefers-reduced-motion, an in-app mute, or a page that is not visible.
     · Fails silently everywhere it is unsupported (all desktop browsers, iOS
       Safari). No feature-detection branches in calling code.

   Note on iOS: the Vibration API is unavailable in Safari. There is no legal
   web substitute (the AudioContext trick is a dark pattern and inconsistent),
   so iOS simply gets no haptics. Do not add a fake one.
   =========================================================================== */

const PATTERNS = {
  /* Contact with a wall. Amplitude is the caller's, not ours. */
  impactSoft:  [6],
  impactHard:  [14],
  /* The needle sweeping past true at speed — the tick of a balance passing centre. */
  cross:       [3],
  /* Picking it up / putting it down. */
  grab:        [5],
  wake:        [4, 26, 7],
  tuck:        [8],
  /* It has found true and stopped. Two soft beats, like a latch closing. */
  settled:     [5, 34, 9],
};

const MIN_GAP = 40;      // ms between any two haptics
const MUTE_KEY = "50pick.haptics.muted";

let lastAt = 0;
let muted = null;        // lazily read from storage

function isMuted() {
  if (muted === null) {
    try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { muted = false; }
  }
  return muted;
}

function calm() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supported() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function allowed() {
  if (!supported() || isMuted() || calm()) return false;
  if (typeof document !== "undefined" && document.hidden) return false;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastAt < MIN_GAP) return false;
  lastAt = now;
  return true;
}

/** Fire a named pattern. Unknown names are ignored rather than throwing. */
export function haptic(name) {
  const p = PATTERNS[name];
  if (!p || !allowed()) return false;
  try { navigator.vibrate(p); return true; } catch (e) { return false; }
}

/**
 * Wall contact, scaled by the real impact speed (px/ms from the engine).
 * Below 0.35 px/ms nothing fires — that is a graze, and a graze you can see
 * but should not feel.
 */
export function hapticImpact(speed) {
  if (speed < 0.35) return false;
  if (!allowed()) return false;
  const ms = Math.max(5, Math.min(16, Math.round(speed * 11)));
  try { navigator.vibrate([ms]); return true; } catch (e) { return false; }
}

/** Mute control, for the app's accessibility / sound settings panel. */
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
}
export function getMuted() { return isMuted(); }
export function hapticsAvailable() { return supported(); }

export default { haptic, hapticImpact, setMuted, getMuted, hapticsAvailable };
