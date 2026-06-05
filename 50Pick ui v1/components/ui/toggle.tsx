/**
 * Toggle — switch atom. The kit shipped no switch; this is the canonical one
 * (flagged NEW in the affiliate design handoff → COMPONENTS.md).
 *
 *  - `gold`  → the master money-lever (gold gradient when on)
 *  - default → indigo/royal when on, for sub-toggles
 *  - off     → --bg-overlay
 *
 * Pure kit tokens, kit easing. Accessible: role="switch" + aria-checked,
 * keyboard-operable as a native <button>.
 */
"use client";

import * as React from "react";

export function Toggle({
  on,
  onClick,
  gold,
  disabled,
  "aria-label": ariaLabel,
}: {
  on: boolean;
  onClick?: () => void;
  gold?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="relative shrink-0 rounded-pill transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
      style={{
        width: 46,
        height: 26,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "1px solid " + (on ? (gold ? "var(--gold-700)" : "var(--royal-500)") : "var(--border-strong)"),
        background: on
          ? gold
            ? "linear-gradient(180deg, var(--gold-400), var(--gold-600))"
            : "var(--royal-500)"
          : "var(--bg-overlay)",
        transition: "all var(--ease-stage)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: on ? (gold ? "oklch(24% 0.06 85)" : "white") : "var(--text-subtle)",
          transition: "all var(--ease-stage)",
        }}
      />
    </button>
  );
}
