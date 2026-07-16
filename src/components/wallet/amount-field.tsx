"use client";

/**
 * AmountField — the shared money-amount control for BOTH deposit and withdraw
 * (C2e: withdraw was flagged for not using the deposit's kit control). Input
 * atom (TZS prefix, mono, strict-numeric, brand focus) + quick-amount chips that
 * override the typed value. The Input carries `name` (default "amount") straight
 * to the server action, so the money path is unchanged — only the UI unifies.
 *
 * De-golded on purpose: gold is reserved for earned money, not an entry field.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldLegend } from "@/components/ui/field-legend";

const fmt = (v: number) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${v / 1_000}K` : String(v));

export function AmountField({
  label,
  hint,
  quickAmounts,
  max,
  min,
  defaultValue,
  disabled,
  id = "amount",
  name = "amount",
}: {
  label: string;
  hint?: string;
  quickAmounts: number[];
  max: number;
  min?: number;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}) {
  const [amount, setAmount] = useState<string>(
    defaultValue && /^\d+$/.test(defaultValue) ? defaultValue : "",
  );
  const num = amount ? parseInt(amount, 10) || 0 : 0;
  // Never offer a quick chip the account can't satisfy (e.g. > balance on withdraw).
  const chips = quickAmounts.filter((v) => v <= max);

  return (
    <div>
      <FieldLegend as="label" htmlFor={id} className="block mb-2">
        {label}
      </FieldLegend>

      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        placeholder="10000"
        prefix="TZS"
        mono
        size="lg"
        min={min}
        max={max}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={disabled}
        className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />

      {chips.length > 0 && (
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {chips.map((v) => {
            const active = num === v;
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => setAmount(String(v))}
                aria-pressed={active}
                className={
                  // L6: ≥44px tap target on a money control (was h-8/32px).
                  "min-h-11 inline-flex items-center justify-center px-3.5 rounded-pill border font-mono text-[11.5px] font-bold tabular-nums transition-colors disabled:opacity-50 " +
                  (active
                    ? "border-brand-500 bg-brand-500/15 text-brand-300"
                    : "border-border bg-bg-overlay text-text-subtle hover:bg-brand-500/10 hover:text-brand-300 hover:border-brand-500/60")
                }
              >
                {fmt(v)}
              </button>
            );
          })}
        </div>
      )}

      {hint && <p className="mt-2 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  );
}
