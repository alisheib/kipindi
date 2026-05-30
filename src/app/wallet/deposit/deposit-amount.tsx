"use client";

/**
 * DepositAmount — kit-styled amount control for the deposit form.
 *
 * Replaces the raw <input type="number"> (which showed the browser's own
 * spinner/number UI, off-kit). Uses the kit TZS-prefixed field with
 * comma-formatted display, digits-only entry (no spinners), and quick-amount
 * chips that ALWAYS override whatever is typed. A hidden <input name="amount">
 * carries the raw integer to the server action.
 */
import { useState } from "react";

export function DepositAmount({
  max,
  quickAmounts,
  adminTest,
}: {
  max: number;
  quickAmounts: number[];
  adminTest: boolean;
}) {
  const [raw, setRaw] = useState<string>("");
  const num = raw ? Math.min(max, parseInt(raw, 10) || 0) : 0;
  const display = num > 0 ? num.toLocaleString("en-US") : "";

  const onType = (s: string) => {
    const digits = s.replace(/\D/g, "").slice(0, 12);
    setRaw(digits);
  };

  return (
    <div>
      <label htmlFor="amount-display" className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
        Amount · Kiasi
      </label>

      {/* Kit field: TZS prefix + plain text input (no number spinners). */}
      <span className="flex items-stretch rounded-md border border-border bg-bg-overlay overflow-hidden focus-within:border-gold-500 focus-within:shadow-[0_0_0_3px_var(--gold-subtle)] transition-colors">
        <span className="inline-flex items-center px-3 bg-bg-elevated border-r border-border font-mono text-[13px] font-bold text-text-subtle shrink-0">
          TZS
        </span>
        <input
          id="amount-display"
          inputMode="numeric"
          autoComplete="off"
          placeholder="10,000"
          value={display}
          onChange={(e) => onType(e.target.value)}
          className="flex-1 min-w-0 h-12 px-3 bg-transparent font-display font-bold text-[20px] tabular-nums text-text outline-none placeholder:text-text-subtle placeholder:font-normal"
        />
      </span>
      {/* Raw integer for the server action. */}
      <input type="hidden" name="amount" value={num > 0 ? String(num) : ""} />

      {/* Quick amounts — tapping one OVERRIDES the current value. */}
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        {quickAmounts.map((v) => {
          const active = num === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setRaw(String(v))}
              aria-pressed={active}
              className={
                "h-8 rounded-pill border font-mono text-[11.5px] font-bold tabular-nums transition-colors " +
                (active
                  ? "border-gold-500 bg-gold-500/15 text-gold-300"
                  : "border-border bg-bg-overlay text-text-subtle hover:bg-gold-500/10 hover:text-gold-300 hover:border-gold-700")
              }
            >
              {v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${v / 1_000}K` : v}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-text-subtle">
        {adminTest
          ? "Admin test funding · deposit any amount to test the wallet, referrals & proposals. (Temporary — disable with ADMIN_TEST_DEPOSITS=false.)"
          : "Min TZS 500 · Max TZS 2,000,000 per deposit. Daily limits may apply."}
      </p>
    </div>
  );
}
