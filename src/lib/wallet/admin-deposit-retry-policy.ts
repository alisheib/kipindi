import { canonicalDepositFunding } from "@/lib/journey/deposit-state";
import { isMobileMoneyMethodId } from "@/lib/payment-providers";
import type { StoredTxn } from "@/lib/server/store";
import { DEPOSIT_RETRY_CLAIM_MARK, hasDepositFinalNegative, hasDepositStatusReview } from "./deposit-review";
import { isRgHeldDeposit } from "./receipts";

/** A provider-negative result, a recoverable original reference and a usable mobile-money
 * funding identity are all required before an officer may send another collection.
 * Old FAILED rows cannot satisfy this: prose in description is not provider authority. */
export function canAdminRetryDeposit(row: StoredTxn, allowClaimed = false): boolean {
  const authority = hasDepositFinalNegative(row)
    || (allowClaimed && row.type === "DEPOSIT" && row.status === "FAILED" && row.providerStatus === DEPOSIT_RETRY_CLAIM_MARK);
  return authority && row.currency === "TZS" && row.houseBotId == null
    && (row.origin == null || row.origin === "low_balance")
    && !!row.providerRef && !hasDepositStatusReview(row) && !isRgHeldDeposit(row)
    && isMobileMoneyMethodId(row.provider) && canonicalDepositFunding(row) !== null;
}
