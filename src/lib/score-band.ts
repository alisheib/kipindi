/**
 * Score → band → tone. The ONE place the admin console turns a 0–100 score
 * (AI-poll quality, extraction confidence, …) into a good/warn/bad tier and a
 * kit colour token — replacing the ~dozen hand-typed `value >= 80 ? … : >= 50 ?`
 * threshold ladders that had drifted (quality cut at 50, confidence at 50 in one
 * table but 75 in another, etc.). Callers pass the thresholds explicitly, so the
 * (legitimately different) cutoffs per metric stay visible at the call site while
 * the branching logic lives here once.
 *
 * Two "bad" treatments are kept ON PURPOSE — they are contextual, not drift:
 *   • BAND_TEXT       — alarm claret for emphasis surfaces (detail quality meter)
 *   • BAND_TEXT_MUTED — muted grey for dense score tables (a low row shouldn't shout)
 *
 * Risk/health scores that use a high/medium/low vocabulary (KYC risk, player
 * risk band) are deliberately NOT routed through here — that vocabulary doubles
 * as the visible label ("high · review monthly"), so it stays its own thing.
 */
export type Band = "good" | "warn" | "bad";

/** Higher is better. `good`/`warn` are the inclusive lower bounds of each tier. */
export function band(value: number, t: { good: number; warn: number }): Band {
  return value >= t.good ? "good" : value >= t.warn ? "warn" : "bad";
}

/** Alarm palette — a low score reads as concerning (detail meters). */
export const BAND_TEXT: Record<Band, string> = {
  good: "var(--yes-300)",
  warn: "var(--warning-fg)",
  bad: "var(--claret-300)",
};

/** Muted palette — a low score reads as quiet (dense score tables). */
export const BAND_TEXT_MUTED: Record<Band, string> = {
  good: "var(--yes-300)",
  warn: "var(--warning-fg)",
  bad: "var(--text-tertiary)",
};

/** Progress-fill palette (solid tones for meter bars). */
export const BAND_FILL: Record<Band, string> = {
  good: "var(--yes-500)",
  warn: "var(--warning-500)",
  bad: "var(--danger-500)",
};
