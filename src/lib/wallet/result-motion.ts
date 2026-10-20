/** A receipt remains readable on every visit. Its event motion is claimed only
 * once per transaction in this tab, and fails closed when storage is blocked. */
type MotionStorage = Pick<Storage, "getItem" | "setItem">;

export function claimWalletResultMotion(storage: MotionStorage, txnId: string, eligible: boolean): boolean {
  if (!eligible || !txnId) return false;
  try {
    const key = `50pick-wallet-result-motion:${txnId}`;
    if (storage.getItem(key) !== null) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}
