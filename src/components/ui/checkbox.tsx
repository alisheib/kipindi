"use client";

/**
 * Checkbox — kit-faithful (ds-forms.jsx Checkbox).
 * 19x19, brand-500 (royal) fill when checked, white check icon inside — matches
 * the Toggle ON colour so all form controls read the same blue.
 * Works as both controlled and uncontrolled (form-native).
 */
import * as React from "react";
import { I } from "@/components/ui/glyphs";

export function Checkbox({
  defaultChecked,
  checked: controlledChecked,
  onChange,
  label,
  name,
  value,
  required,
  className,
  indeterminate = false,
  ariaLabel,
}: {
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  name?: string;
  /** Submitted value when checked (form-native). Defaults to the browser's "on".
   *  Set it when a server reads an explicit value, e.g. `?attention=1`. */
  value?: string;
  required?: boolean;
  className?: string;
  /**
   * ⭐ THE THIRD STATE — "some, but not all". A select-all header that can only say
   * checked or unchecked is LYING about a partial selection, and on a bulk control that
   * seals real money the lie is "you have selected everything".
   *
   * ⛔ `indeterminate` IS A DOM PROPERTY, NOT AN ATTRIBUTE. React will not set it from
   * JSX — writing `<input indeterminate={x}>` compiles, renders, and does nothing at all.
   * It has to be assigned to the element in an effect, which is why this component now
   * holds a ref. Ignored while `checked` is true (the native rule).
   */
  indeterminate?: boolean;
  /**
   * The accessible name when there is no visible `label` — a row checkbox in a grid has
   * none, and without this it ships as an UNNAMED checkbox that a screen reader announces
   * as "checkbox" and nothing else.
   *
   * ⛔ camelCase, and that is not a style preference. A HYPHENATED attribute on a custom
   * component (`<Checkbox aria-label="…">`) is invisible to `tsc` — it compiles clean and
   * is SILENTLY DROPPED, because a React component's props are a plain object and nothing
   * checks for a key nobody declared. This platform has shipped a control announcing the
   * wrong name that way once already.
   */
  ariaLabel?: string;
}) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isControlled = controlledChecked !== undefined;
  const on = isControlled ? controlledChecked : internal;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dash = indeterminate && !on;

  // The DOM property, set every render because `indeterminate` is not reflected as an
  // attribute — React re-creating the vnode does not re-apply it.
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = dash;
  }, [dash]);

  const toggle = () => {
    const next = !on;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <label
      className={className}
      /* ⭐ DG-P-12 (2026-08-30) — THE CONSENT ROW REACHES `--tap-min`, AND IT IS THE LABEL THAT
         HAD TO GROW. The real `<input>` is `.sr-only` (a 1x1 clipped box), so the hit area IS
         this `<label>` — and it declared no height at all: a 19px box beside a 13.5px line gave
         a ~20px row against §A2's 40px floor, on the control a player uses to swear they are 18.
         ⛔ THE TOKEN, NEVER A NUMBER, and never a numeric spacing class: `min-h-11` is **96px**
         on this repo's overridden scale, not 44. §0d keeps the value in one home.
         ⚠️ `flex-start` -> `center` is deliberate and is the whole point: with a 40px minimum, a
         top-aligned single-line label would sit against the ceiling with 20px of dead space
         under it. Multi-line labels (the age gate wraps to two lines at 360) stay legible
         centred, and the box tracks the text rather than the first line of it. */
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "var(--tap-min)",
        gap: 9,
        cursor: "pointer",
        fontSize: 13.5,
        color: "var(--text)",
      }}
      onClick={(e) => {
        // Prevent double-toggle from label+input interaction
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        toggle();
      }}
    >
      {/* Visually-hidden but ACCESSIBLE native input — it is the real control
          (screen readers announce it as a labelled checkbox; keyboard focuses
          it). `peer` drives the visible box's focus ring. Never aria-hidden:
          hiding a focusable control from the a11y tree is a WCAG violation. */}
      <input
        ref={inputRef}
        type="checkbox"
        name={name}
        value={value}
        required={required}
        checked={on}
        aria-label={ariaLabel}
        onChange={() => toggle()}
        className="sr-only peer"
      />
      <span
        aria-hidden
        className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--brand-400)]"
        style={{
          width: 19,
          height: 19,
          borderRadius: 5,
          border: `1.5px solid ${on || dash ? "var(--brand-500)" : "var(--border-strong)"}`,
          background: on || dash ? "var(--brand-500)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--t-quick) var(--m-glide)",
          transform: on ? "scale(1)" : "scale(1)",
          boxShadow: on ? "0 0 0 3px oklch(63% 0.18 262 / 0.15)" : "none",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {on
          ? <I.check s={13} style={{ color: "var(--pearl-50)", strokeWidth: 3 }} />
          /* The "some, not all" bar. A plain rectangle rather than a glyph: the kit has no
             minus glyph, and adding one to spend a design-frozen budget on a 9×2 dash would
             be the wrong trade. Both dimensions are numbers and the colour is a token, so
             this adds NO hand-typed value to a frozen property. */
          : dash
            ? <span aria-hidden style={{ width: 9, height: 2, background: "var(--pearl-50)" }} />
            : null}
      </span>
      {label && <span style={{ lineHeight: 1.4 }}>{label}</span>}
    </label>
  );
}
