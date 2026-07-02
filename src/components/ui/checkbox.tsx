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
  required,
  className,
}: {
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  name?: string;
  required?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isControlled = controlledChecked !== undefined;
  const on = isControlled ? controlledChecked : internal;

  const toggle = () => {
    const next = !on;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <label
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
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
      {/* Hidden native input for form submission */}
      <input
        type="checkbox"
        name={name}
        required={required}
        checked={on}
        onChange={() => toggle()}
        className="sr-only"
        aria-hidden
      />
      <span
        style={{
          width: 19,
          height: 19,
          borderRadius: 5,
          border: `1.5px solid ${on ? "var(--brand-500)" : "var(--border-strong)"}`,
          background: on ? "var(--brand-500)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all .15s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transform: on ? "scale(1)" : "scale(1)",
          boxShadow: on ? "0 0 0 3px oklch(63% 0.18 262 / 0.15)" : "none",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {on && <I.check s={13} style={{ color: "#fff", strokeWidth: 3 }} />}
      </span>
      {label && <span style={{ lineHeight: 1.4 }}>{label}</span>}
    </label>
  );
}
