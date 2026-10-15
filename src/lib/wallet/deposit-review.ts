/** Durable payment-result conflict. It changes player presentation, never the recorded terminal status or money. */
export const DEPOSIT_STATUS_REVIEW_MARK = "deposit-terminal-review:v1";
/** Written atomically with FAILED only after a verified provider-negative settlement. Legacy and local
 * dispatch failures carry no such proof and cannot authorize an operator to send another collection. */
export const DEPOSIT_FINAL_NEGATIVE_MARK = "deposit-provider-final-failed:v1";
/** A durable operator hold when a failed deposit has no proof that another collection is safe. */
export const DEPOSIT_RETRY_REVIEW_MARK = "deposit-admin-retry-review:v1";
/** Retry claimed under the original wallet lock, before sending its deterministic child.
 * A concurrent Cancel must leave the original visible while that collection can begin. */
export const DEPOSIT_RETRY_CLAIM_MARK = "deposit-admin-retry-claimed:v1";

export function hasDepositStatusReview(row: { type: string; providerStatus?: string | null }): boolean {
  return row.type === "DEPOSIT" && row.providerStatus === DEPOSIT_STATUS_REVIEW_MARK;
}

export function hasDepositFinalNegative(row: { type: string; status: string; providerStatus?: string | null }): boolean {
  return row.type === "DEPOSIT" && row.status === "FAILED" && row.providerStatus === DEPOSIT_FINAL_NEGATIVE_MARK;
}
