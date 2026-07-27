// src/lib/haptics.ts
// 50pick haptics — a small, centralized vocabulary mapped to product events.
// Restraint first: haptics are punctuation, not a drumbeat. Feature-detects
// the Web Vibration API (Android/Chrome), no-ops on iOS Safari (we lean on the
// paired animation there), respects the user's "Sound & feedback" setting and
// reduced-motion intent.
//
// ⚠️ THE RULE (design system, 10-haptics — adopted 2026-07-28):
//   **Physical events only — contact, passing true, coming to rest.
//     NEVER encouragement, reward, or to pull attention.**
// So a haptic marks something that actually HAPPENED to the player's money or
// state: a wager landed, a payout settled, a destructive gate needs a decision,
// an action failed. It never rewards. Selecting, watching, voting and liking are
// preferences, not events — they are silent, and that is deliberate: on a
// real-money product a congratulatory buzz is reinforcement, which is both
// against the kit and against responsible-gambling practice.
// Before adding a call, ask "did something land, or am I congratulating them?"

export type HapticToken =
  | "tap"        // routine acknowledgement — OFF by default
  | "select"     // chip / toggle / segmented pick — OFF by default
  | "confirm"    // action landed (place bet, cash out, save)
  | "success"    // money settled / verified
  | "warning"    // pay attention (destructive confirm)
  | "error"      // validation / transaction failed
  | "celebrate"; // ⛔ RETIRED BY THE PHYSICAL-ONLY RULE — no caller, by design.
                 //    Kept defined so restoring it is a one-line change if the
                 //    owner ever overrules the kit. Wins fire `success` instead.

// Exact vibrate() patterns in ms. [buzz, pause, buzz, …].
// A coherent family: light → heavy. `celebrate` is a heraldic seal-stamp
// flourish, deliberately NOT an arcade buzz.
const PATTERNS: Record<HapticToken, number[]> = {
  tap:       [10],
  select:    [14],
  confirm:   [18, 28, 18],
  success:   [22, 36, 60],
  warning:   [30, 50, 30],
  error:     [60, 40, 60],
  celebrate: [16, 28, 22, 28, 36, 28, 80],
};

// Default ON for money / outcome moments; OFF for routine taps & selects.
const DEFAULT_ENABLED: Record<HapticToken, boolean> = {
  tap: false, select: false,
  confirm: true, success: true, warning: true, error: true, celebrate: true,
};

const STORE_KEY = "50pick:feedback";

export type NeedleMode = "spin" | "bounce";

export type FeedbackPrefs = {
  haptics: boolean;                          // master switch
  motion: "system" | "on" | "off";           // "off" = reduce motion in-app
  perToken: Record<HapticToken, boolean>;    // fine-grained, optional
  needleHidden: boolean;                     // hide The Needle pause object (navbar/settings toggle)
  needleMode: NeedleMode;                    // "spin" = grab/flick; "bounce" = tap repels it away
};

function load(): FeedbackPrefs {
  const base: FeedbackPrefs = { haptics: true, motion: "system", perToken: { ...DEFAULT_ENABLED }, needleHidden: false, needleMode: "spin" };
  if (typeof localStorage === "undefined") return base;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw);
    return {
      haptics: p.haptics !== false,
      motion: p.motion ?? "system",
      perToken: { ...base.perToken, ...(p.perToken ?? {}) },
      needleHidden: p.needleHidden === true,
      needleMode: p.needleMode === "bounce" ? "bounce" : "spin",
    };
  } catch {
    return base;
  }
}

let prefs = load();

export function getPrefs(): FeedbackPrefs {
  return structuredClone(prefs);
}

export function setPrefs(patch: Partial<FeedbackPrefs>): void {
  prefs = { ...prefs, ...patch, perToken: { ...prefs.perToken, ...(patch.perToken ?? {}) } };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch {}
  // Bridge the master haptics switch to the vendored Needle module, which reads a
  // separate legacy key ("50pick.haptics.muted"). One toggle, one behaviour.
  try { localStorage.setItem("50pick.haptics.muted", prefs.haptics ? "0" : "1"); } catch {}
  // Let live listeners (The Needle, the settings panel, the navbar toggle) react
  // without a reload.
  try { window.dispatchEvent(new CustomEvent("50pick:feedback-changed", { detail: getPrefs() })); } catch {}
}

const supported = () =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export function motionReduced(): boolean {
  if (prefs.motion === "off") return true;
  if (prefs.motion === "on") return false;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function fire(token: HapticToken): void {
  if (!prefs.haptics) return;             // master off
  if (prefs.perToken[token] === false) return; // token off
  if (!supported()) return;               // iOS / desktop → no-op (animation carries it)
  try { navigator.vibrate(PATTERNS[token]); } catch { /* ignore */ }
}

// Named sugar — what product code calls.
export const haptics = {
  tap:       () => fire("tap"),
  select:    () => fire("select"),
  confirm:   () => fire("confirm"),
  success:   () => fire("success"),
  warning:   () => fire("warning"),
  error:     () => fire("error"),
  celebrate: () => fire("celebrate"),
  supported,
  patterns: PATTERNS,
};

// Usage:
//   import { haptics } from "@/lib/haptics";
//   haptics.confirm();                 // on bet placed — same frame as the seal
//   haptics.success();                 // on win reveal / money settled
//
// iOS note: navigator.vibrate is absent in Safari. fire() no-ops; the paired
// animation (win-burst / seal-impress / value-flash) carries the moment so the
// feedback never depends on the motor.
