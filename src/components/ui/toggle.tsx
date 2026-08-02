/**
 * Toggle / Switch — kit-faithful (ds-forms.jsx Switch).
 * 44x26, brand-500 (royal) when on, bg-inset when off, white thumb.
 * `gold` variant available for master money-lever toggles.
 * (ON is the canonical brand blue — NOT aqua/accent, which the kit reserves for
 *  finishing touches only — so every toggle reads the same colour.)
 */
"use client";

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
      /* ⛔ G-9 (2026-08-02). This control had `active:` and `focus-visible:` states and NO
         hover state at all — measured live across 374 admin controls, and the switches it
         renders include `/admin/affiliate`'s "Program master switch" and `/admin/bonuses`'
         "Bonus program master switch", i.e. the levers that decide whether those programmes
         run. A consequential control that does not answer the pointer reads as inert.
         The hover lives in `globals.css` as `.toggle-switch`, NOT here, because this
         component sets `background` and `border` via inline `style` and inline style beats
         any class — so the hover has to use properties the inline style does not set.
         `filter` + `box-shadow` are exactly that, and neither can move layout, which the
         hover sweep asserts for every control on the page. */
      className="toggle-switch relative shrink-0 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated active:scale-[0.97]"
      style={{
        width: 44,
        height: 26,
        border: on
          ? gold
            ? "1px solid color-mix(in oklab, var(--gold-300) 40%, transparent)"
            : "1px solid color-mix(in oklab, var(--brand-400) 40%, transparent)"
          : "1px solid var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: on
          ? gold
            ? "linear-gradient(180deg, var(--gold-400), var(--gold-600))"
            : "var(--brand-500)"
          : "var(--bg-inset)",
        transition: "background .18s cubic-bezier(0.2, 0.8, 0.2, 1), border-color .18s ease-out, transform .1s ease-out",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "var(--pearl-50)",
          transform: on ? "translateX(18px)" : "translateX(0)",
          transition: "transform .18s cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: "0 1px 3px oklch(10% 0.05 264 / 0.5)",
          willChange: "transform",
        }}
      />
    </button>
  );
}
