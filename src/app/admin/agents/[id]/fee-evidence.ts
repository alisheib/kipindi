import { formatDateTime, formatTzs } from "@/lib/utils";

/**
 * THE FEE PANEL'S EVIDENCE GRID — which slots mean anything, given the rail that collected.
 *
 * 🔴 WHY THIS IS A MODULE AND NOT JSX IN THE PAGE. The grid was built for ONE rail: an
 * applicant wires money to a bank account, types a reference, and an officer attests the
 * receipt against a statement line. `Receipt ref`, `Attested` and `Statement line` are all
 * artefacts of that rail, and `payFeeFromWallet` deliberately writes none of them — so the
 * workstation showed an officer THREE EM-DASHES against a fee that had been paid in full.
 *
 * ⚠️ An em-dash is not neutral in this grid. Every other one means *"this step has not
 * happened yet"* — it is the shape of an unreconciled application, the thing the officer's job
 * is to chase. Printing it for a wallet-funded fee says evidence is MISSING when none is owed.
 *
 * ⭐ AND A FOURTH SLOT LIED OUTRIGHT. `Reconciled` rendered a real timestamp, because the
 * wallet path sets `feeReconciledAt` — so the officer read "Reconciled 11 Sep 09:41" against a
 * fee no officer ever touched, while the History card below showed
 * `agent.fee.paid_from_wallet_recorded` by the APPLICANT.
 *
 * ⛔ `feeReconciledAt` MUST KEEP BEING SET AND MUST NOT BE CLEARED TO TIDY THIS UP. It is not a
 * display field: `reconcileFee` refuses with *"The fee is already reconciled."* when it is
 * present, and that refusal is what stops an officer collecting a SECOND time from somebody who
 * already paid from their wallet. The fix is the LABEL, never the field.
 *
 * ⭐ WHY IT IS A PURE FUNCTION. A guard that greps the page for `<dt>Receipt ref</dt>` asserts a
 * PROXY — the source text — for the property, which is what an officer SEES; the proxy drifts on
 * any rename or reformat and goes silently vacuous. `test:agent-fee-officer-panel` drives THIS
 * and reads its output, the same doctrine as `agentFeeVatClause` and `test:agent-fee-copy`.
 */

/** What the panel needs to decide the shape. A structural type: the DAL row satisfies it. */
export type FeeEvidenceInput = {
  feeFundingSource: "WALLET" | "EXTERNAL" | null;
  feeReference: string | null;
  feeAttestedTzs: number | null;
  feeStatementRef: string | null;
  feeReconciledAt: string | null;
  feeSourceAccount: string | null;
};

export type FeeEvidenceRow = { label: string; value: string };
export type FeeEvidence = { rows: FeeEvidenceRow[]; note: string | null };

/** The grid's placeholder for "this has not happened yet". */
const DASH = "—";

/**
 * ⭐ `null` IS THE LEGACY RAIL, NOT "UNKNOWN". Every collection before 2026-09-10 was out of
 * band, and the one historical APPROVED row was deliberately never backfilled because the
 * 2026-09-09 VAT ruling is not retroactive. This is the same one-line idiom the service already
 * uses at `recordFeeRefund` — `app.feeFundingSource ?? "EXTERNAL"` — and it must stay the same
 * idiom in both places, or a refund and a panel could disagree about the same row.
 */
export const fundingSourceOf = (app: Pick<FeeEvidenceInput, "feeFundingSource">): "WALLET" | "EXTERNAL" =>
  app.feeFundingSource ?? "EXTERNAL";

/** The evidence grid for one application, and the note that explains an empty one. */
export function feeEvidence(app: FeeEvidenceInput): FeeEvidence {
  if (fundingSourceOf(app) === "WALLET") {
    /**
     * ⛔ NO EMPTY SLOTS, AND NO WORD THAT NAMES AN OFFICER ACT. Two rows, both of which are
     * always true of a wallet-funded fee: where it came from, and when it moved. The timestamp
     * is `feeReconciledAt` — the same field, under the only label that is true of it here.
     */
    return {
      rows: [
        { label: "Paid from", value: "Applicant's 50pick wallet" },
        { label: "Paid", value: app.feeReconciledAt ? formatDateTime(app.feeReconciledAt) : DASH },
      ],
      note: "No attestation needed — the wallet debit carries the payer's identity, and it is recorded against their account.",
    };
  }

  // ── The legacy out-of-band rail, byte-for-byte the grid it has always had. ──
  return {
    rows: [
      { label: "Receipt ref", value: app.feeReference ?? DASH },
      // ⛔ `formatTzs`, exactly as the page rendered it — a panel that silently changed how an
      // attested amount is written would be a second, quieter change riding inside this one.
      { label: "Attested", value: app.feeAttestedTzs !== null ? formatTzs(app.feeAttestedTzs) : DASH },
      { label: "Statement line", value: app.feeStatementRef ?? DASH },
      { label: "Reconciled", value: app.feeReconciledAt ? formatDateTime(app.feeReconciledAt) : DASH },
    ],
    note: null,
  };
}

/**
 * Where a refund goes, in words the officer can act on.
 * 🔴 The panel read `feeSourceAccount` unconditionally, which a wallet payment never writes — so
 * the one screen whose job is to say where a person's money is going showed an em-dash.
 */
export function feeRefundDestination(app: Pick<FeeEvidenceInput, "feeFundingSource" | "feeSourceAccount">): string {
  if (fundingSourceOf(app) === "WALLET") return "Applicant's 50pick wallet";
  return app.feeSourceAccount ?? DASH;
}

/**
 * Why the reconcile control is unavailable — true of the rail that actually collected.
 * 🔴 This read `COLLECTED ? "Reconciled."` and, for an unpaid applicant,
 * `"The applicant has not recorded a receipt reference."` — the withdrawn bank rail's
 * instruction, shown to an officer looking at somebody who is simply yet to pay.
 */
export function whyNoReconcile(app: Pick<FeeEvidenceInput, "feeFundingSource"> & { feeDisposition: string }): string | null {
  if (app.feeDisposition === "WAIVED") return "Waived.";
  if (app.feeDisposition === "COLLECTED") {
    return fundingSourceOf(app) === "WALLET"
      ? "Paid from the applicant's wallet — nothing to reconcile."
      : "Reconciled.";
  }
  // ⛔ A REFUND IS NOT AN UNPAID FEE. These two dispositions only exist BECAUSE the fee was
  // collected, so the "has not paid" sentence below would be flatly false on them — and the
  // rail renders this string beside a refund control.
  if (app.feeDisposition === "REFUND_DUE") return "Paid — a refund is owed on this application.";
  if (app.feeDisposition === "REFUNDED") return "Paid, and refunded.";
  return "The applicant has not paid the registration fee yet.";
}
