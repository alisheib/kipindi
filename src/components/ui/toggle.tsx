/**
 * Toggle / Switch — kit-faithful (ds-forms.jsx Switch).
 * 44x26, accent-500 when on, bg-inset when off, white thumb.
 * `gold` variant available for master money-lever toggles.
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
      className="relative shrink-0 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
      style={{
        width: 44,
        height: 26,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: on
          ? gold
            ? "linear-gradient(180deg, var(--gold-400), var(--gold-600))"
            : "var(--accent-500)"
          : "var(--bg-inset)",
        transition: "background .18s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "#fff",
          transition: "left .18s cubic-bezier(0.2, 0.8, 0.2, 1)",
          boxShadow: "0 1px 3px oklch(10% 0.05 264 / 0.5)",
        }}
      />
    </button>
  );
}
