"use client";

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
import { FieldLegend } from "@/components/ui/field-legend";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
  mono?: boolean;
  error?: boolean | string;
  /**
   * Rendered height: sm 36 · md 44 · lg 48 (px). See the warning on `heightCls`
   * below — these are arbitrary literals, not spacing-scale classes, on purpose.
   */
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

// ⚠️ ARBITRARY LITERALS ON PURPOSE. `theme.extend.spacing` is OVERRIDDEN in
// tailwind.config.ts:200-215, so a scale class here is roughly DOUBLE what it
// reads as: this table used to say h-9 / h-11 / h-12 and rendered 64 / 96 / 128px
// against the 36 / 44 / 48 contract above — i.e. every un-sized field in the
// product was 96px tall. ⛔ Never "tidy" these back into h-9 / h-11 / h-12.
const heightCls: Record<NonNullable<Props["size"]>, string> = {
  // ⭐ DG-A-04 (DESIGN-GATE-2026-08-28) — WAS `h-[36px]`, AND 36 IS ON NO RUNG. The ladder is
  // 32/40/44/48/56 (`--h-control-*`), so `sm` was the one field height in the kit that named a
  // number nobody had decided; 45 instances measured on production. Ali's ruling 2026-08-29:
  // it takes `--h-control-sm` (40), not the 32 dense-admin rung — most call sites are FORMS
  // (bonuses, invites, poll editing) rather than dense rails, 40 is `--tap-min` so it stays
  // finger-safe, and where these sit beside a `btn-sm` (the ai-polls batch row) the step of 4px
  // closes to flush. ⚠️ Read the TOKEN, like `md` below, so the rung cannot drift from the ladder.
  sm: "h-[var(--h-control-sm)]",
  md: "h-[var(--h-input)]",   // 44px — the kit input token, globals.css
  lg: "h-[48px]",
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

  // A field the officer cannot edit — either flag. Both make a reader the same promise
  // ("you may not change this"), so both must produce the same appearance.
  const locked = !!(inputRest as { disabled?: boolean; readOnly?: boolean }).disabled
    || !!(inputRest as { disabled?: boolean; readOnly?: boolean }).readOnly;

  // Render numeric fields as text so we fully control the characters; keep an
  // appropriate inputMode so phones still show the numeric keypad.
  const effectiveType = isNumeric ? "text" : type;
  const effectiveInputMode = inputMode ?? (isNumeric ? (decimal ? "decimal" : "numeric") : undefined);

  return (
    <span
      className={cn(
        // `field-measure` (DESIGN_AUTHORITY B7) caps the field at whatever measure
        // its <FormColumn> sets. It resolves to `none` by default, so this is a
        // no-op in inline admin toolbars where the field is meant to flex — the
        // cap only applies where a form column has opted in.
        "field-measure flex items-stretch rounded-lg border overflow-hidden brand-focus-within transition-all duration-150",
        heightCls[size],
        errored ? "border-danger-500"
          // 🔴 A LOCKED FIELD MUST *LOOK* LOCKED — and until 2026-09-10 this atom painted no
          // disabled state whatsoever. The pinned statutory helpline on `/admin/system` rendered
          // through the same <Field>/<Input> as the two editable boxes: same border, same fill,
          // same ink (the input sets `text-text` explicitly, overriding even the UA grey), same
          // hover. ⭐ THIS IS CAUSE **H** OF THE OWNER'S REPORT — *"some fields are not changing,
          // maybe readonly"*. Nothing was broken; the field genuinely is read-only and the console
          // gave the officer no way to know. A control that refuses input without SAYING it is
          // read-only is indistinguishable, from the outside, from one that is broken.
          // ⚠️ Border AND fill AND ink all move, deliberately: one of the three alone reads as a
          // style accident on a dark theme, and the officer has to be able to tell at a glance.
          : locked ? "border-border/50 cursor-not-allowed"
          : "border-border hover:border-border-strong",
        containerClassName,
      )}
      style={
        errored ? { background: "var(--danger-wash)" }
        : locked ? { background: "var(--bg-base)", opacity: 0.72 }
        : { background: "var(--bg-inset)" }
      }
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
          "flex-1 min-w-0 bg-transparent px-3 outline-none placeholder:text-text-subtle",
          // ⛔ NOT a bare `text-text`. That explicit colour is what overrode the UA grey and made a
          // disabled box indistinguishable from an editable one.
          locked ? "text-text-muted cursor-not-allowed" : "text-text",
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
  dataField,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * ⭐ DG-S-05/06 — the ADDRESS a server refusal names, e.g. `fieldError("limitUsd", …)`.
   *
   * It lands on the `<label>` wrapper rather than the control, because that is what
   * `focusFirstInvalid` queries (`[data-field]`) before focusing whatever focusable control
   * the wrapper contains — so one prop works for an `<input>`, a `<select>` and a `<textarea>`
   * alike. ⛔ OPTIONAL, and absent means exactly today's behaviour: nothing renders
   * differently and no consumer has to change. Adoption is per-form and deliberate.
   */
  dataField?: string;
}) {
  return (
    <label className={cn("block", className)} data-field={dataField}>
      <FieldLegend className="block mb-1.5">
        {label}
      </FieldLegend>
      {children}
      {error ? (
        <p className="mt-1.5 text-body-sm text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-body-sm text-text-subtle">{hint}</p>
      ) : null}
    </label>
  );
}
