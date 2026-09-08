import { commissionWaterfall, type WaterfallRates, type WaterfallStepId } from "@/lib/agent-commission";
import { fill, formatTzs } from "@/lib/utils";
import { fillNodes } from "@/lib/fill-nodes";
import type { Dict } from "@/lib/i18n-dict";

/**
 * COMMISSION, LINE BY LINE — management's financial waterfall, rendered.
 *
 * ⭐ WHAT THIS REPLACED, AND WHY. Management's feedback on Agent v1 (2026-09-08) struck out
 * the paragraph that said "commission is a share of the net operator fee 50pick actually
 * keeps after TRA and GBT levies" and wrote, against it, "Remove this and Keep this below:"
 * followed by an eight-row table. A partner deciding whether to pay TZS 118,000 wants to
 * FOLLOW the arithmetic, not be told its shape — so the paragraph became this.
 *
 * ⛔ NOT ONE FIGURE IN THIS FILE IS TYPED. Every row comes from `commissionWaterfall`, which
 * is the same module the settlement engine credits through (`splitWithholding`). A table of
 * money that disagreed with the wallet by a shilling would be worse than the paragraph it
 * replaced, and `test:commission-bounded` §7 is the assertion that it cannot.
 *
 * ⚠️ TWO COLUMNS, NOT MANAGEMENT'S THREE, AND THAT IS A DELIBERATE RESPONSIVE CALL. Their
 * document has PARAMETER · AMOUNT · NOTES side by side. The notes are full sentences, and
 * §A6's floor is zero horizontal overflow at 360px — in Swahili, which runs 35–40% longer
 * than English, a third prose column either scrolls sideways or wraps to six lines a row.
 * ⭐ So every word of every note is kept and set UNDER its parameter instead of beside it:
 * one layout that holds at every width in all three languages, rather than a table that
 * needs a scrollbar on the phone most applicants will read it on.
 *
 * ⛔ AND EVERY AMOUNT IS FLAT — NO GOLD. Gold is money that has happened
 * (`DESIGN_AUTHORITY.md` §B4, `test:gold-is-money`): "an amount that is merely projected …
 * stays flat — gilding it promises in ink what the round has not decided." This whole table
 * is an illustration on a round number, so gilding the payout row would be exactly the
 * promise the rule exists to prevent. The final row earns its weight from a rule and a
 * bolder face instead.
 */

/** The row order is the module's, so a step added there cannot be forgotten here. */
const LABEL_KEY: Record<WaterfallStepId, keyof Dict["agent"]> = {
  winnings: "wfWinnings",
  grossFee: "wfGrossFee",
  tra: "wfTra",
  gbt: "wfGbt",
  netFee: "wfNetFee",
  agentShare: "wfAgentShare",
  withholding: "wfWithholding",
  netPayout: "wfNetPayout",
};
const NOTE_KEY: Record<WaterfallStepId, keyof Dict["agent"]> = {
  winnings: "wfWinningsNote",
  grossFee: "wfGrossFeeNote",
  tra: "wfTraNote",
  gbt: "wfGbtNote",
  netFee: "wfNetFeeNote",
  agentShare: "wfAgentShareNote",
  withholding: "wfWithholdingNote",
  netPayout: "wfNetPayoutNote",
};

export function CommissionWaterfall({
  t,
  rates,
  /** The worked example's base. A round TZS 1,000,000, exactly as management presented it. */
  basisTzs = 1_000_000,
}: {
  t: Dict;
  rates: WaterfallRates;
  basisTzs?: number;
}) {
  const { steps, effectivePctOfWinnings } = commissionWaterfall(basisTzs, rates);
  const a = t.agent as unknown as Record<string, string>;

  return (
    <section className="rounded-xl glass-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-display text-title-sm font-bold leading-tight">{t.agent.wfTitle}</p>
        {/* ⭐ The illustration is LABELLED as one, in the eyebrow role, so nobody reads the
            bottom row as a forecast of their own earnings. */}
        <p className="font-mono text-micro uppercase eyebrow text-text-faint">{t.agent.wfEyebrow}</p>
      </div>
      {/* ⚠️ THE FIGURE KEEPS THE MONEY LADDER even inside a sentence (§T5 · §M4): the prose
          keeps its voice, the number keeps mono + tabular figures. `test:type-scale` §1 fails
          a money element that inherits a proportional family from the paragraph around it. */}
      <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
        {fillNodes(t.agent.wfBasis, { amount: <span className="font-mono tabular-nums">{formatTzs(basisTzs)}</span> })}
      </p>

      {/**
        * ⛔ A `<dl>`, NOT A `<table>`, AND THAT IS THE HOUSE PATTERN RATHER THAN AN EVASION.
        *
        * Every `<table>` in this product is in the admin console and wears `.admin-tbl`
        * (`test:ui-consistency`, rule `table-not-admin-tbl`). There is no player table skin in
        * the kit, and there should not be one for a single panel: borrowing the console's
        * density and ink onto a player page, or minting a second table style beside it, are
        * both the "one-off that duplicates a primitive" §K5 names as how a design system dies.
        *
        * ⭐ AND A DESCRIPTION LIST IS WHAT THIS ACTUALLY IS. Every other label/figure block on
        * a player surface — the fee panel here, the receipt rows on the wallet confirms, the
        * workstation's applicant card — is a `<dl>`. Eight labelled amounts is a description
        * list, and a screen reader reads the pairing without needing column headers.
        */}
      <dl className="mt-3">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5">
          <span className="font-mono text-micro uppercase eyebrow text-text-faint">{t.agent.wfColParam}</span>
          <span className="font-mono text-micro uppercase eyebrow text-text-faint">{t.agent.wfColAmount}</span>
        </div>
        {steps.map((s) => {
          const label = s.ratePct === null
            ? a[LABEL_KEY[s.id]]
            : fill(a[LABEL_KEY[s.id]], { pct: formatPct(s.ratePct) });
          return (
            <div
              key={s.id}
              className={`flex items-start justify-between gap-4 ${rowPad(s.id)}${
                // The final row is separated by a rule rather than a colour: it is a total,
                // and a total that changed hue would be reaching for the money palette.
                s.id === "netPayout" ? " border-t border-border-strong" : ""
              }`}
            >
              <dt className={s.deduction ? "min-w-0 pl-3" : "min-w-0"}>
                <span className={
                  s.deduction
                    // ⭐ A statutory deduction is INDENTED and prefixed, so the eye reads it as
                    // coming out of the line above rather than as a step of its own — exactly
                    // how management's document sets these three rows.
                    ? "block text-body-sm leading-snug text-text-muted before:mr-1.5 before:text-text-faint before:content-['·']"
                    : s.id === "netPayout"
                      ? "block text-body-sm font-bold leading-snug text-text"
                      : s.subtotal
                        ? "block text-body-sm font-semibold leading-snug text-text"
                        : "block text-body-sm leading-snug text-text"
                }>
                  {label}
                </span>
                {/* ⚠️ `text-body-sm`, NOT an eyebrow and NOT `text-caption`. These notes are
                    management's own full SENTENCES: §T3 reserves the sub-micro uppercase tier
                    for microlabels ("a SENTENCE in an eyebrow's clothes" is one of the seven
                    roles the tracking census names), and §T4 puts a 12.5px floor under reading
                    copy — `text-caption` is 11px. The hierarchy against the parameter name
                    above comes from COLOUR, which is the lever §T leaves open. */}
                <span className="mt-0.5 block text-body-sm leading-snug text-text-faint">
                  {a[NOTE_KEY[s.id]]}
                </span>
              </dt>
              <dd className={`amount shrink-0 tabular-nums text-right ${
                s.id === "netPayout"
                  ? "text-body font-bold text-text"
                  : s.deduction
                    ? "text-body-sm text-text-muted"
                    : s.subtotal
                      ? "text-body-sm font-semibold text-text"
                      : "text-body-sm text-text"
              }`}>
                {/* A deduction carries a minus so the column can be added up by eye.
                    ⛔ Never `text-no-*`: red is money LOST (§B2), and a tax line in a worked
                    example is not a loss the reader has suffered. */}
                {s.deduction ? `−${formatTzs(s.amountTzs)}` : formatTzs(s.amountTzs)}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* ⭐ THE QUESTION THE TABLE RAISES AND ONLY THIS LINE ANSWERS: a headline rate of 10%
          is a share of the NET FEE, which is a far smaller base than the pool. Stating what
          the partner keeps per shilling of winnings is the honest reading of their own
          table, and leaving a reader to divide two of its rows themselves is how "10%" gets
          heard as ten percent of the winnings. */}
      <p className="mt-3 text-body-sm leading-relaxed text-text">
        {fill(t.agent.wfEffective, { pct: formatPct(effectivePctOfWinnings) })}
      </p>
      {/* Also reading copy — and it is the sentence that stops the table being read as a
          forecast, which makes it the last thing that should be set below the floor. */}
      <p className="mt-1.5 text-body-sm leading-relaxed text-text-faint">{t.agent.wfDisclaimer}</p>
    </section>
  );
}

/** The last row gets breathing room above it; every other row is evenly spaced. */
function rowPad(id: WaterfallStepId): string {
  return id === "netPayout" ? "pt-2.5 pb-1" : "py-1.5";
}

/**
 * A rate for display. ⚠️ Trailing zeros are trimmed so a whole rate reads "13%" rather than
 * "13.00%", and a fractional one still reads exactly — an operator may set 12.5%, and
 * rounding that to 13 on the public page would misstate the fee.
 */
function formatPct(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  return String(rounded);
}
