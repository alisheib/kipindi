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
 * It lives here, alone, so every surface that asks "is real money live?" — the
 * payments control-plane simulation flag, the payment-mode boot alarm, the wallet
 * guards — reads ONE definition and can never drift. Two definitions of one truth
 * bound by nothing is exactly the class of bug the audit kept finding.
 *
 * NOTE: market-resolution authorization is NO LONGER keyed off this predicate — the
 * old POCA §16 solo-resolution hard-lock was retired (resolution-policy.ts; owner
 * decision 2026-07-24). Two-admin authorization is now an operator toggle with no
 * money-mode hard-lock, and provider selection (incl. the mock) is operator-
 * controlled in every mode. This predicate now drives surfacing, not blocking.
 *
 * ⛔ Do NOT weaken this. Unsetting `TEST_FUNDING` at go-live (a required launch
 * step, see docs/LAUNCH-GO-NO-GO §5) is what flips the platform to LIVE. Pure env
 * read — safe to call anywhere, sync, no I/O.
 */
export type MoneyMode = "LIVE" | "TEST";

export function isLiveMoneyMode(): boolean {
  return process.env.NODE_ENV === "production" && process.env.TEST_FUNDING !== "true";
}

export function moneyMode(): MoneyMode {
  return isLiveMoneyMode() ? "LIVE" : "TEST";
}
