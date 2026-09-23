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
  invalid = false,
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
  /**
   * ⭐ A REFUSED BOX SAYS SO TO THE TREE (2026-09-22, the desk's scope pickers). A server refusal that names a
   * checkbox group — "choose at least one poll category" — had no way to mark it: `aria-invalid` is what
   * `focusFirstInvalid`'s callers read back and what a browser drive counts, and this control set it nowhere.
   * ⛔ camelCase, for the same reason as `ariaLabel`: a hyphenated attribute on a component is silently dropped.
   */
  invalid?: boolean;
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

  /**
   * 🔴 A FORM RESET HAS TO REACH THE VISIBLE BOX, AND FOR THIS CONTROL IT DID NOT
   * (measured on `/admin/desk/[id]?tab=rules`, 2026-09-21).
   *
   * `form.reset()` restores every input's DOM `checked` from its `defaultChecked`
   * attribute. It does NOT tell React, so the painted box — which is drawn from
   * `internal`, not from the DOM — kept the officer's discarded toggle, and the next
   * render wrote that toggle straight back onto the input. A Discard therefore LOOKED
   * like it had done nothing, reported the form clean, and then posted the very changes
   * it claimed to have thrown away.
   *
   * ⚠️ IT SYNCS IN A MICROTASK, NOT IN THE HANDLER. The `reset` event fires BEFORE the
   * form is reset (it is cancellable), so a listener that reads `el.checked` inline reads
   * the OLD value and pins exactly the state it was asked to clear. `form.reset()` is
   * synchronous, so a microtask queued here runs once the reset has landed.
   * ⛔ Uncontrolled only: a controlled box's truth is its parent's state, which a native
   * reset neither knows about nor may silently overwrite.
   */
  React.useEffect(() => {
    if (isControlled) return undefined;
    const form = inputRef.current?.form;
    if (!form) return undefined;
    const sync = () => {
      queueMicrotask(() => {
        const el = inputRef.current;
        if (el) setInternal(el.checked);
      });
    };
    form.addEventListener("reset", sync);
    return () => form.removeEventListener("reset", sync);
  }, [isControlled]);

  /**
   * ⭐ IN UNCONTROLLED MODE THE DOM IS THE TRUTH, SO THE PAINT FOLLOWS IT — however it was moved.
   *
   * React's own `onChange` covers a person: for a checkbox React listens to `click`, so a tick or a space bar
   * reaches the handler below. It does NOT cover a PROGRAMMATIC change — `el.checked = true` fires nothing, and
   * a dispatched `input`/`change` is not the event React watches for this element type. So a restored draft, a
   * "fill these in" control, or any future caller that sets the box in code would move the real input and leave
   * the painted square showing the opposite. A box that disagrees with what it will submit is the worst thing
   * this control can be.
   * ⚠️ Idempotent: when the move DID come from a person this sets the same value React just set, which is a
   * no-op re-render React drops. ⛔ Uncontrolled only — a controlled box's truth is its parent's state.
   */
  React.useEffect(() => {
    if (isControlled) return undefined;
    const el = inputRef.current;
    if (!el) return undefined;
    const follow = () => setInternal(el.checked);
    el.addEventListener("input", follow);
    el.addEventListener("change", follow);
    return () => {
      el.removeEventListener("input", follow);
      el.removeEventListener("change", follow);
    };
  }, [isControlled]);

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
      /**
       * 🔴 THERE IS NO `onClick` HERE ANY MORE, AND ITS REMOVAL IS THE FIX FOR A BUG THAT
       * REACHED THE OWNER (reported 2026-09-21: "changing checkboxes does not trigger the
       * pending-change toolbar").
       *
       * This label used to answer the click ITSELF — `preventDefault()` and then a React
       * state update. `preventDefault()` on a label cancels its activation behaviour, which
       * is the only thing that forwards the click to the control it wraps, so the real
       * `<input>` was never clicked: no native `click`, no `input`, no `change`, and
       * therefore NOTHING for a form-level listener to hear. `useFormDirty` listens on the
       * `<form>` for exactly those two events, so ticking a box with a MOUSE never armed
       * `PendingChangesBar` or `UnsavedChangesGuard` — while the SPACE BAR, which lands on
       * the real input and fires its events, worked perfectly. A control that is only
       * broken for the pointer is a control that tests green and fails every officer.
       *
       * ⭐ THE NATIVE PATH IS THE WHOLE ANSWER. The input is a child of this label, so the
       * browser forwards the click, toggles the box, and fires the events React and the
       * form are both already listening for. Exactly one toggle happens: the old comment's
       * "double-toggle" only occurs when a handler toggles in ADDITION to the native
       * activation, which is what this file used to do.
       */
    >
      {/* Visually-hidden but ACCESSIBLE native input — it is the real control
          (screen readers announce it as a labelled checkbox; keyboard focuses
          it). `peer` drives the visible box's focus ring. Never aria-hidden:
          hiding a focusable control from the a11y tree is a WCAG violation. */}
      {/* ⛔ CONTROLLED WHEN THE CALLER OWNS THE VALUE, UNCONTROLLED WHEN IT DOES NOT — and
          the difference is load-bearing, not tidiness. `checked` on an uncontrolled box
          leaves `defaultChecked` unset on the DOM node, so `form.reset()` resets it to
          FALSE rather than to the value the server rendered: a Discard on a form of ten
          switches would have silently cleared all ten. React also warns about a box that
          is both. The spread keeps exactly one of the two on the element. */}
      <input
        ref={inputRef}
        type="checkbox"
        name={name}
        value={value}
        required={required}
        {...(isControlled ? { checked: controlledChecked } : { defaultChecked: defaultChecked ?? false })}
        aria-label={ariaLabel}
        aria-invalid={invalid ? true : undefined}
        /* The native toggle has already happened by the time this runs, so the new state is
           READ off the element rather than derived from the old one — a derived `!on` is
           what makes a box disagree with itself the moment anything else moves it. */
        onChange={(e) => {
          const next = e.currentTarget.checked;
          if (!isControlled) setInternal(next);
          onChange?.(next);
        }}
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
