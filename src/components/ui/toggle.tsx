/**
 * Toggle / Switch — kit-faithful (ds-forms.jsx Switch).
 * 44x26 track, 20px thumb, 3px inset, 18px travel. bg-inset when off, white thumb.
 * (ON is the canonical brand blue — NOT aqua/accent, which the kit reserves for
 *  finishing touches only — so every toggle reads the same colour.)
 *
 * ⭐ `tone` — the ON fill, and the ONLY thing a caller may vary. Added 2026-08-21,
 * replacing a `gold` boolean that had ZERO call sites.
 *   · "brand"  (default) royal — the normal switch
 *   · "gold"   master money-lever
 *   · "claret" ON MEANS STOPPED. `/admin/system`'s maintenance lever is the case:
 *              switching it ON pauses new bets and deposits, so a royal "on" would
 *              read as healthy while the platform is halted.
 *
 * ⛔ THE TONE EXISTS SO NOBODY FORKS THIS FILE AGAIN. `/admin/system` carried a
 * hand-rolled copy of this switch for exactly one reason — it wanted claret — and the
 * copy drifted into an `h-7 w-12` track (40×128px on this repo's overridden spacing
 * scale) with a 32px knob travelling 2px→22px: a knob crossing a sixth of its own
 * track, so ON and OFF were nearly indistinguishable on the lever that pauses
 * money-in. Extend this component; do not copy it.
 */
"use client";

export function Toggle({
  on,
  onClick,
  tone = "brand",
  disabled,
  "aria-label": ariaLabel,
}: {
  on: boolean;
  onClick?: () => void;
  tone?: "brand" | "gold" | "claret";
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const onBorder = {
    brand: "1px solid color-mix(in oklab, var(--brand-400) 40%, transparent)",
    gold: "1px solid color-mix(in oklab, var(--gold-300) 40%, transparent)",
    claret: "1px solid color-mix(in oklab, var(--claret-400) 40%, transparent)",
  }[tone];
  const onFill = {
    brand: "var(--brand-500)",
    gold: "linear-gradient(180deg, var(--gold-400), var(--gold-600))",
    claret: "var(--claret-500)",
  }[tone];
  // The focus ring follows the tone so it never reads as a different control's ring.
  const ring = { brand: "var(--brand-500)", gold: "var(--gold-400)", claret: "var(--claret-400)" }[tone];
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
      className="toggle-switch relative shrink-0 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated active:scale-[0.97]"
      style={{
        width: 44,
        height: 26,
        border: on ? onBorder : "1px solid var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: on ? onFill : "var(--bg-inset)",
        // Set here rather than as a Tailwind ring-[…] class because the tone is a runtime
        // value; a dynamic class name would not survive Tailwind's static extractor.
        ["--tw-ring-color" as string]: ring,
        transition: "background var(--t-base) var(--m-glide), border-color var(--t-base) ease-out, transform var(--t-flick) ease-out",
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
          transition: "transform var(--t-base) var(--m-glide)",
          boxShadow: "0 1px 3px oklch(10% 0.05 264 / 0.5)",
          willChange: "transform",
        }}
      />
    </button>
  );
}
