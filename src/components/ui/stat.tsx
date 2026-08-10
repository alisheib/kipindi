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
  struck,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: StatTone;
  /** Wrap the value in <Cash> (balance-privacy blur). Use for every TZS figure. */
  money?: boolean;
  /**
   * DA-7 · strike this figure as gold TYPE (`.gilt-ink`) rather than colour it gold.
   *
   * ⛔ OPT-IN, AND DELIBERATELY NOT A CHANGE TO `tone="gold"`. M3 reserves struck gold for
   * money that was EARNED — a payout, a celebration, a resolved seal. Three of `gold`'s
   * call sites are not that: `position-card.tsx:111` paints `payoutIfWin` at betting-close
   * (frozen arithmetic, not yet earned) and the admin fee simulator paints a simulation.
   * Blanket-striking the tone would put earned-money ink on figures nobody has won, which
   * is precisely the violation M3 exists to prevent. So the caller opts in per figure.
   *
   * ⚠️ It also has a measurement cost worth knowing: `.gilt-ink` paints via
   * `background-clip: text` with a transparent fill, and `contrast-rendered.mjs:200-205`
   * SKIPS such nodes (their `color` reads as the canvas, which would measure 1:1 against
   * itself). So every figure struck here leaves that probe's corpus. The modelled pairs in
   * `contrast-audit.mts` are what keeps it measured — they are not optional garnish.
   */
  struck?: boolean;
  /** Optional sub-line under the value — e.g. "33% of the losing side". */
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{label}</p>
      {/* `.gilt-ink` carries its own font-family, tabular-nums and letter-spacing (M4), and
          supplies the colour as a gradient — so the tone class must NOT also be applied, or
          a flat `color` sits under a transparent fill and the two disagree. */}
      <p className={cn("font-mono text-[13.5px] font-bold tabular-nums leading-tight", struck ? "gilt-ink" : TONE[tone])}>
        {money ? <Cash>{value}</Cash> : value}
      </p>
      {hint ? (
        <p className="mt-0.5 font-mono text-[9px] leading-tight text-text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
