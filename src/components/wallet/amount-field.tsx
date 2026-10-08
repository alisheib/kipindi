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
import { moneyRuns } from "@/lib/fill-nodes";
import { formatNumber } from "@/lib/utils";

/**
 * ⭐ THE EXAMPLE IS WRITTEN AS THE PLATFORM WRITES A FIGURE (2026-10-09, the visual pass's round 3, tiles 069 and 174).
 * It read "10000", the one place a player met a figure with no thousands separator; every amount elsewhere is
 * `formatNumber`'s "10,000". The box still takes the digits however they are typed — a comma is dropped on entry
 * (`input.tsx`, strict numeric mode) — so the example teaches nothing the field refuses.
 */
const AMOUNT_EXAMPLE = formatNumber(10_000);

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
        placeholder={AMOUNT_EXAMPLE}
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

      {/* 2026-09-13 · six columns at sm, not five: both callers pass six amounts, so five left a
          lone chip on a second row. The widest label ("500K") is ~56px in an ~86px cell at 640. */}
      {chips.length > 0 && (
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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
                  // L6: 44px tap target on a money control (deposit AND withdraw).
                  // ⛔ ARBITRARY LITERAL ON PURPOSE — `theme.extend.spacing` is overridden
                  // (tailwind.config.ts:200-215), so `min-h-11` is 96px, not 44px. Never a
                  // scale token here.
                  "min-h-[44px] inline-flex items-center justify-center px-3.5 rounded-pill border font-mono text-[11.5px] font-bold tabular-nums transition-colors disabled:opacity-50 " +
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

      {/* break-keep: Chinese breaks only at spaces and punctuation (text-balance alone split 最高 and 需先); it changes
          nothing for Latin text, and overflow-wrap still wraps an over-long run.
          ⭐ Its figures are money, so each is an `.amount` (§M4, `moneyRuns`): "TZS 1,015 … TZS 5,000,000" was set in the
          body face (2026-10-09, tiles 069 and 174), the only amounts on either form not in mono. */}
      {hint && <p className="mt-2 text-body-sm text-text-subtle text-balance break-keep [overflow-wrap:anywhere]">{moneyRuns(hint)}</p>}
    </div>
  );
}
