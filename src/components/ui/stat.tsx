/**
 * Stat — the kit's label/value pair.
 *
 * A mono micro-label over a bold tabular value. This exact component had been
 * re-implemented three separate times (position-card's `Stat`, resolution-panel's
 * `Row`, the market page's `KPI`), each with slightly different type sizes and
 * tracking. Promoted here so the fee/payout figures this change adds are a
 * fourth USE rather than a fourth COPY.
 *
 * Money values MUST pass `money` — it wraps the numeral in <Cash>, which honours
 * the balance-privacy blur. A bare money numeral bypasses that and leaks the
 * player's figures on a shoulder-surfed screen.
 */

import { Cash } from "@/components/ui/cash";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "gold" | "yes" | "no" | "muted";

const TONE: Record<StatTone, string> = {
  default: "text-text",
  gold: "text-gold-300",
  yes: "text-yes-300",
  no: "text-no-300",
  muted: "text-text-muted",
};

export function Stat({
  label,
  value,
  tone = "default",
  money,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: StatTone;
  /** Wrap the value in <Cash> (balance-privacy blur). Use for every TZS figure. */
  money?: boolean;
  /** Optional sub-line under the value — e.g. "33% of the losing side". */
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{label}</p>
      <p className={cn("font-mono text-[13.5px] font-bold tabular-nums leading-tight", TONE[tone])}>
        {money ? <Cash>{value}</Cash> : value}
      </p>
      {hint ? (
        <p className="mt-0.5 font-mono text-[9px] leading-tight text-text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
