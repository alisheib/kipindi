import * as React from "react";
import { Cash } from "@/components/ui/cash";
import { cn } from "@/lib/utils";

/**
 * ReceiptRow / ReceiptBox — the label-left / figure-right line inside a money
 * confirmation, and the panel it sits in.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). This row was copy-pasted across
 * the deposit confirm, the withdraw confirm and (in a two-column variant) the bet
 * and sell confirms — the last thing a player reads before money moves — and the
 * copies had ALREADY drifted on the one figure that matters:
 *
 *   deposit  Amount → 16px BOLD
 *   withdraw Amount → 15px SEMIBOLD
 *
 * Same label (`t.common.amountLabel`), same meaning, two renderings. Withdraw's
 * shape is the one promoted here because it is the complete one: it has the fee
 * line, the divider and the you-receive total that deposit never needed.
 *
 * ⚠️ ONE RENDERED CHANGE FALLS OUT OF THAT, and it is the point of the exercise
 * rather than a side effect: on the withdraw confirm the Amount row moves from
 * 15px/semibold to `emphasis="amount"` = 16px/bold, matching deposit. Withdraw's
 * hierarchy survives it — the you-receive total stays the loudest line because it
 * is the only GOLD one, and gold is legitimate there (M3: it is the money the
 * player is about to receive, not a projection).
 *
 * ⛔ WHAT THIS DOES NOT ABSORB. The bet and sell confirms lay their figures out
 * as a two-column stat PAIR (a side + a stake, a value + a fee), not as a stacked
 * list of label/value rows. That is <Stat>'s shape, not this one. Forcing them in
 * here would be a redesign of the two money-commit dialogs, so they are left
 * alone and named instead.
 *
 * ⛔ `money` (the <Cash> privacy blur) is OPT-IN and the confirms deliberately do
 * not pass it. Masking the figure a player is committing to, in the instant they
 * commit, is worse than the shoulder-surf risk it would answer.
 */

/** The figure's role in the receipt. One rendering per role — that is the fix. */
export type ReceiptEmphasis = "row" | "amount" | "fee" | "total" | "muted";

const LABEL = "font-mono text-micro uppercase eyebrow text-text-subtle";

const VALUE: Record<ReceiptEmphasis, string> = {
  // The reference/context lines — provider, phone, recipient name.
  // ⚠️ No `tabular-nums`: these are words as often as digits, and tabular figures
  // in a proper name look like a ransom note.
  row:    "font-mono text-[13px] font-semibold text-text",
  // THE commit figure. One size, one weight, both directions of money.
  amount: "font-mono text-[16px] font-bold tabular-nums text-text",
  // A deduction. Colour comes from the ROW (see `tone`), not from here, so the
  // label and the figure are unmistakably one statement.
  fee:    "font-mono text-[13px] font-semibold tabular-nums",
  // The bottom line — what actually lands. The only gold in the box.
  total:  "font-mono text-[16px] font-bold tabular-nums text-gold-300",
  // A row that is still resolving ("checking…").
  muted:  "font-mono text-[12px] text-text-subtle",
};

export function ReceiptRow({
  label,
  value,
  emphasis = "row",
  tone,
  divider,
  money,
  alignEnd,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: ReceiptEmphasis;
  /**
   * Colour the WHOLE row — label and figure together. `warning` is the fee line's
   * amber. ⛔ Never use it to colour a figure the player has not lost or gained.
   */
  tone?: "warning" | "no" | "yes";
  /** A hairline above this row — it separates a subtotal from its total. */
  divider?: boolean;
  /** Wrap the figure in <Cash>. Opt-in; see the header for why the confirms don't. */
  money?: boolean;
  /** Let a long figure (a payee's full name) wrap right-aligned instead of clipping. */
  alignEnd?: boolean;
  className?: string;
}) {
  const toneCls =
    tone === "warning" ? "text-warning-fg" : tone === "no" ? "text-no-300" : tone === "yes" ? "text-yes-300" : null;
  return (
    <div
      className={cn(
        "flex items-baseline justify-between",
        divider && "border-t border-border pt-1.5",
        toneCls,
        className,
      )}
    >
      {/* When the row carries a tone, the label must NOT re-assert `text-text-subtle`
          or it fights the row colour and only half the line reads as one thing. */}
      <span className={toneCls ? "font-mono text-micro uppercase eyebrow" : LABEL}>{label}</span>
      <span className={cn(VALUE[emphasis], alignEnd && "text-right")}>
        {money ? <Cash>{value}</Cash> : value}
      </span>
    </div>
  );
}

/** The panel the rows sit in. Was retyped verbatim on both wallet confirms. */
export function ReceiptBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5", className)}>
      {children}
    </div>
  );
}
