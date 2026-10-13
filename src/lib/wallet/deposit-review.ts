/** Durable payment-result conflict. It changes player presentation, never the recorded terminal status or money. */
export const DEPOSIT_STATUS_REVIEW_MARK = "deposit-terminal-review:v1";

export function hasDepositStatusReview(row: { type: string; providerStatus?: string | null }): boolean {
  return row.type === "DEPOSIT" && row.providerStatus === DEPOSIT_STATUS_REVIEW_MARK;
}
