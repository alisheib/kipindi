/**
 * Runtime money-mode — the ONE predicate that answers "is this deployment
 * handling (or able to handle) REAL money right now?"
 *
 *   LIVE  = production AND `TEST_FUNDING` is not "true" — the go-live state: no
 *           test-float minting, real deposits/withdrawals move real money.
 *   TEST  = everything else — local dev, staging, or a production deployment still
 *           in the pre-launch `TEST_FUNDING=true` window (real domain, test float,
 *           no real money).
 *
 * This is the SAME condition the POCA §16 solo-resolution hard lock keys off
 * (`test-overrides.ts` → `isConflictOverrideHardLocked`). It lives here, alone, so
 * the compliance lock and the payments control-plane can NEVER drift on what "real
 * money is live" means — two definitions of one truth bound by nothing is exactly
 * the class of bug the audit kept finding. Every safety hard-lock that flips at
 * go-live reads this.
 *
 * ⛔ Do NOT weaken this. Unsetting `TEST_FUNDING` at go-live (a required launch
 * step, see docs/LAUNCH-GO-NO-GO §5) is what flips the platform to LIVE and arms
 * every lock below it. Pure env read — safe to call anywhere, sync, no I/O.
 */
export type MoneyMode = "LIVE" | "TEST";

export function isLiveMoneyMode(): boolean {
  return process.env.NODE_ENV === "production" && process.env.TEST_FUNDING !== "true";
}

export function moneyMode(): MoneyMode {
  return isLiveMoneyMode() ? "LIVE" : "TEST";
}
