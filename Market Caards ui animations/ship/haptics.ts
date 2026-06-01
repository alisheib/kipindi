// src/lib/haptics.ts
// 50pick haptics — a small, centralized vocabulary mapped to product events.
// Restraint first: haptics are punctuation, not a drumbeat. Feature-detects
// the Web Vibration API (Android/Chrome), no-ops on iOS Safari (we lean on the
// paired animation there), respects the user's "Sound & feedback" setting and
// reduced-motion intent.

export type HapticToken =
  | "tap"        // routine acknowledgement — OFF by default
  | "select"     // chip / toggle / segmented pick — OFF by default
  | "confirm"    // action landed (place bet, cash out, save)
  | "success"    // money settled / verified
  | "warning"    // pay attention (destructive confirm)
  | "error"      // validation / transaction failed
  | "celebrate"; // the peak — win, badge unlock, level up

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

export type FeedbackPrefs = {
  haptics: boolean;                          // master switch
  motion: "system" | "on" | "off";           // "off" = reduce motion in-app
  perToken: Record<HapticToken, boolean>;    // fine-grained, optional
};

function load(): FeedbackPrefs {
  const base: FeedbackPrefs = { haptics: true, motion: "system", perToken: { ...DEFAULT_ENABLED } };
  if (typeof localStorage === "undefined") return base;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw);
    return {
      haptics: p.haptics !== false,
      motion: p.motion ?? "system",
      perToken: { ...base.perToken, ...(p.perToken ?? {}) },
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
//   haptics.celebrate();               // on win reveal — same frame as win-burst
//
// iOS note: navigator.vibrate is absent in Safari. fire() no-ops; the paired
// animation (win-burst / seal-impress / value-flash) carries the moment so the
// feedback never depends on the motor.
