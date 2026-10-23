/**
 * ⭐ A MILLIONEA REFUSAL IN MILLIONEA'S OWN WORDS, WHERE THE PLATFORM'S SENTENCE NAMES A BET (MASWALI-BUILD FLOW 13, the
 * lead's ruling of 2026-10-23; Ali's ruling 7: "Buy ticket", "Kata tiketi", 出票).
 *
 * A held wallet — an officer's hold, a self-exclusion's freeze — is refused at the buy with `wallet_frozen`, whose platform
 * sentence (`error.failWalletFrozen`) says "bets can't be placed". On Millionea it is ONE sentence in the product's buy
 * words, `millionea.walletFrozen`, and every Millionea surface that says it reads this one choice: the slip's pre-refusal
 * (said instead of the slip), the buy's own refusal (the slip's toast) and the hub's buy block. Every other reason keeps
 * the registry's sentence, and the platform's sentence stays for every other product.
 * Pure: the caller hands its dictionary.
 */
export function millioneaRefusalBody(reason: string | null | undefined, t: { millionea: { walletFrozen: string } }): string | null {
  return reason === "wallet_frozen" ? t.millionea.walletFrozen : null;
}
