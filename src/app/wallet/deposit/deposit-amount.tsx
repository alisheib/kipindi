"use client";

/**
 * DepositAmount — amount control for the deposit form, built on the shared
 * Input atom so it mirrors the withdraw amount field (TZS prefix, mono,
 * strict-numeric, brand focus). Quick-amount chips override the typed value.
 * The Input carries `name="amount"` directly to the server action.
 *
 * De-golded on purpose: gold is reserved for earned money (winnings), not a
 * deposit-entry field — matches withdraw and the gold-budget rule.
 */
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldLegend } from "@/components/ui/field-legend";
import { useT } from "@/lib/i18n";

export function DepositAmount({
  max,
  quickAmounts,
  defaultValue,
}: {
  max: number;
  quickAmounts: number[];
  adminTest?: boolean;
  defaultValue?: string;
}) {
  const { t } = useT();
  const [amount, setAmount] = useState<string>(
    defaultValue && /^\d+$/.test(defaultValue) ? defaultValue : "",
  );
  const num = amount ? parseInt(amount, 10) || 0 : 0;

  return (
    <div>
      <FieldLegend as="label" htmlFor="amount" className="block mb-2">
        {t.common.depositAmountLabel}
      </FieldLegend>

      <Input
        id="amount"
        name="amount"
        inputMode="numeric"
        autoComplete="off"
        placeholder="10000"
        prefix="TZS"
        mono
        size="lg"
        max={max}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {/* Quick amounts — tapping one OVERRIDES the current value. */}
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        {quickAmounts.map((v) => {
          const active = num === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              aria-pressed={active}
              className={
                "h-8 rounded-pill border font-mono text-[11.5px] font-bold tabular-nums transition-colors " +
                (active
                  ? "border-brand-500 bg-brand-500/15 text-brand-300"
                  : "border-border bg-bg-overlay text-text-subtle hover:bg-brand-500/10 hover:text-brand-300 hover:border-brand-500/60")
              }
            >
              {v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${v / 1_000}K` : v}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-text-subtle">{t.common.depositAmountHint}</p>
    </div>
  );
}
