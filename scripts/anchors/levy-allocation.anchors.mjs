/**
 * Declared anchors for `red:levy-allocation`.
 *
 * ⛔ DECLARED RATHER THAN INLINE, AND THIS HARNESS IS THE REASON WHY. Its subject —
 * `settlementPayoutEntries` — is money code under active repair: the levies moved on
 * 2026-09-09, and the sibling harness `red:bonus-withdrawable` had an anchor ROT on the very
 * same day, on a line in `wallet-service.ts` that a money fix threaded `tx` through. The
 * harness then reported "anchor missing" — a WARNING, not a failure — while the gate above it
 * printed green. A red proof that can no longer inject its defect is worth LESS than no red
 * proof, because it still looks like one. `test:red-anchors` §3 audits every mutation in this
 * directory on every run and fails when one stops resolving; an inline `from` string has
 * nothing watching it.
 *
 * ⚠️ `mutation 1` is split across TWO entries joined by `combineInto`, because the pre-fix
 * source derived BOTH levies per winner and removing only one half leaves the gate correctly
 * green — which the harness would report as a MISS against a working platform.
 */

const LEDGER = "src/lib/server/ledger.ts";
const PAYOUT = "src/lib/payout.ts";

export const MUTATIONS = [
  {
    name: "the-defect-verbatim-tra",
    why: "the pre-fix source, TRA half — the ledger derives this winner's levy with its own "
       + "Math.round instead of booking the share levySplit already allocated.",
    file: LEDGER,
    from: "  const traLevyAmt = opts.traLevyAmount != null\n"
        + "    ? Math.max(0, Math.round(opts.traLevyAmount))\n"
        + "    : Math.round(commAmt * opts.rates.traTaxOnCommissionRate);",
    to: "  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);",
  },
  {
    // ⛔ THE SECOND HALF OF THE MUTATION ABOVE, never applied alone.
    name: "the-defect-verbatim-gbt",
    combineInto: "the-defect-verbatim-tra",
    why: "GBT is the 5% levy, so it is the half that books ZERO on a fee share under 10 TZS. "
       + "Reverting only TRA leaves GBT correct and the suite would report a miss.",
    file: LEDGER,
    from: "  const gbtLevyAmt = opts.gbtLevyAmount != null\n"
        + "    ? Math.max(0, Math.round(opts.gbtLevyAmount))\n"
        + "    : Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);",
    to: "  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);",
  },
  {
    name: "half-fix-derive-gbt",
    why: "honour the pre-allocated TRA share but still derive GBT — the half-fix that leaves "
       + "the levy which actually books zero still broken.",
    file: LEDGER,
    from: "  const gbtLevyAmt = opts.gbtLevyAmount != null\n"
        + "    ? Math.max(0, Math.round(opts.gbtLevyAmount))\n"
        + "    : Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);",
    to: "  const gbtLevyAmt = Math.round(commAmt * opts.rates.gbtLevyOnCommissionRate);",
  },
  {
    name: "half-fix-derive-tra",
    why: "the mirror half-fix — GBT honoured, TRA still derived per winner.",
    file: LEDGER,
    from: "  const traLevyAmt = opts.traLevyAmount != null\n"
        + "    ? Math.max(0, Math.round(opts.traLevyAmount))\n"
        + "    : Math.round(commAmt * opts.rates.traTaxOnCommissionRate);",
    to: "  const traLevyAmt = Math.round(commAmt * opts.rates.traTaxOnCommissionRate);",
  },
  {
    name: "over-correction-levy-at-zero-rate",
    why: "⚠️ OVER-CORRECTION — book a levy line even when the configured rate is ZERO. "
       + "RULES §2.2: a levy is charged on our fee, or it is not charged at all.",
    file: LEDGER,
    // ⚠️ THE COMMENT LINE IS PART OF THE ANCHOR AND MUST STAY. `if (traLevyAmt > 0) {` alone
    // matches TWICE in this file — settlementPayoutEntries AND cashoutEntries — and the
    // hand-rolled `split().join()` this harness used before silently mutated BOTH while
    // reporting one. `resolveAnchor` refuses an ambiguous needle outright, which is how that
    // was found; the extra line is what makes it unique.
    from: "    // The levies come OUT of our commission — never out of the player's payout.\n    if (traLevyAmt > 0) {",
    to: "    // The levies come OUT of our commission — never out of the player's payout.\n    if (traLevyAmt >= 0) {",
  },
  {
    name: "over-correction-levy-from-player-payout",
    why: "⚠️ OVER-CORRECTION — take the levy out of the PLAYER's payout. RULES §2.8: a player "
       + "is charged the pool fee and the withdrawal fee and NOTHING else. ⛔ The group still "
       + "BALANCES after this edit (the pool debit shrinks by the same amount), so only an "
       + "assertion on the exact credited amount can see it.",
    file: LEDGER,
    from: "  const netPayout = opts.payout;",
    to: "  const netPayout = opts.payout - traLevyAmt - gbtLevyAmt;",
  },
  {
    name: "over-correction-round-share-up",
    why: "⚠️ OVER-CORRECTION — round the allocated share UP, inventing a fraction of a shilling. "
       + "RULES §2.10 fixes the rounding direction and §2.2 fixes the total.",
    file: LEDGER,
    from: "    ? Math.max(0, Math.round(opts.gbtLevyAmount))",
    to: "    ? Math.max(0, Math.ceil(opts.gbtLevyAmount + 0.4))",
  },
  {
    name: "vacuity-allocation-exact-by-luck",
    why: "⭐ AIMED AT THE GATE'S OWN POSITIVE CONTROL. Drop the largest-remainder top-up so the "
       + "allocation no longer sums exactly. If §3 of the suite stops failing under this, its "
       + "control has gone blind and §1 is asserting nothing.",
    file: PAYOUT,
    from: "  let remainder = total - allocated; // in [0, winners.length)",
    to: "  let remainder = 0; // in [0, winners.length)",
  },
];
