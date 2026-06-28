/**
 * Input atom — kit-faithful (kit/atoms.jsx → Input).
 * - prefix slot (e.g. "TZS", "+255") locked in a sub-cell with a divider
 * - mono variant (font-mono + tabular-nums) for amounts + numeric input
 * - error state — red border + tinted background
 * - controlled OR uncontrolled (defaultValue + value both supported)
 * - kit "input-group" semantic — works as a child of <label>
 *
 * STRICT NUMERIC MODE — any field declared numeric (`type="number"`, or
 * `inputMode="numeric"`/`"decimal"`) is rendered as a filtered text box: every
 * keystroke and paste is sanitised down to a valid number, so letters / "e" /
 * stray symbols can NEVER land in the value. This is enforced centrally here so
 * every numeric field across the app (admin + wallet + profile) is strict by
 * construction — no per-call-site discipline required. Decimals are allowed
 * automatically for `inputMode="decimal"` or a fractional `step`; negatives only
 * when `allowNegative` is set (default off — counts, rates, amounts are ≥ 0).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
  mono?: boolean;
  error?: boolean | string;
  /** sm 36 · md 44 · lg 48 */
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
  /** Force-allow a decimal point (otherwise inferred from inputMode/step). */
  allowDecimal?: boolean;
  /** Allow a leading minus sign. Default false — numeric fields are ≥ 0. */
  allowNegative?: boolean;
};

/** Strip a raw string down to a valid number literal. */
export function sanitizeNumericInput(raw: string, opts: { decimal: boolean; negative: boolean }): string {
  const neg = opts.negative && /^\s*-/.test(raw);
  let s = raw.replace(/[^\d.]/g, "");          // keep digits + dots only
  if (opts.decimal) {
    const i = s.indexOf(".");
    if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ""); // first dot only
  } else {
    s = s.replace(/\./g, "");
  }
  return (neg ? "-" : "") + s;
}

const heightCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-12",
};

const fontCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-[16px]",
  lg: "text-[16px]",
};

export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { prefix, trailing, mono, error, size = "md", className, containerClassName, allowDecimal, allowNegative, ...rest },
  ref,
) {
  const errored = !!error;

  // ── Strict numeric mode ────────────────────────────────────────────
  const { type, inputMode, step, onChange, ...inputRest } = rest;
  const isNumeric = type === "number" || inputMode === "numeric" || inputMode === "decimal";
  const decimal = isNumeric && (
    allowDecimal ??
    (inputMode === "decimal" || (step !== undefined && !Number.isInteger(Number(step))))
  );
  const negative = isNumeric && !!allowNegative;

  // Sanitise on every input (covers typing, paste, drop, IME). For controlled
  // fields the parent stores the sanitised value via this onChange; for
  // uncontrolled fields we mutate the DOM value in place so junk never sticks.
  const handleChange: React.ChangeEventHandler<HTMLInputElement> | undefined = isNumeric
    ? (e) => {
        const clean = sanitizeNumericInput(e.target.value, { decimal: !!decimal, negative });
        if (clean !== e.target.value) e.target.value = clean;
        onChange?.(e);
      }
    : onChange;

  // Render numeric fields as text so we fully control the characters; keep an
  // appropriate inputMode so phones still show the numeric keypad.
  const effectiveType = isNumeric ? "text" : type;
  const effectiveInputMode = inputMode ?? (isNumeric ? (decimal ? "decimal" : "numeric") : undefined);

  return (
    <span
      className={cn(
        "flex items-stretch rounded-lg border overflow-hidden brand-focus-within transition-colors",
        heightCls[size],
        errored ? "border-no-500" : "border-border",
        containerClassName,
      )}
      style={errored ? { background: "oklch(58% 0.2 25 / 0.08)" } : { background: "var(--bg-inset)" }}
    >
      {prefix !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-r border-border font-mono text-text-muted shrink-0",
            fontCls[size],
          )}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        {...inputRest}
        type={effectiveType}
        inputMode={effectiveInputMode}
        {...(isNumeric ? { autoComplete: inputRest.autoComplete ?? "off" } : {})}
        onChange={handleChange}
        className={cn(
          "flex-1 min-w-0 bg-transparent px-3 text-text outline-none placeholder:text-text-subtle",
          mono && "font-mono tabular-nums",
          fontCls[size],
          className,
        )}
      />
      {trailing !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-l border-border font-mono text-text-subtle shrink-0",
            fontCls[size],
          )}
        >
          {trailing}
        </span>
      )}
    </span>
  );
});

/** Field label + Input + hint shorthand. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">
        {label}
      </span>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] text-no-300">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-text-subtle">{hint}</p>
      ) : null}
    </label>
  );
}
