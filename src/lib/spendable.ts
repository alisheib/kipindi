/**
 * WHAT A PLAYER CAN STAKE — one figure, and it is the bet path's own (live fix, 2026-10-14; S12-PLAN F1).
 *
 * `buyPosition` funds a stake from the withdrawable balance FIRST and the bonus wallet for the rest
 * (`buyPositionInner`, SEAM:cash: realPart = min(stake, balance), bonusPart = stake − realPart, refused when bonusPart
 * exceeds bonusBalance). So the largest stake it takes is balance + bonusBalance, and that is the figure it states when
 * it refuses for funds (`balance_insufficient`, `detail.balance`). A surface that pre-checks a stake reads THIS, so its
 * gate can be neither stricter than the server (a funded bet refused on screen) nor looser (a doomed tap sent on).
 *
 * 🔴 WHY IT EXISTS. The Up & Down board's balance read returned the cash alone, so a player whose bonus covered the stake
 * read "not enough balance" on the board and on the round page for a bet the server would have taken — while the classic
 * dial ([id]/page.tsx) and the journey sheet already added the bonus, each in its own spelling.
 *
 * ⛔ A PRE-CHECK ONLY. The bet path decides, inside the wallet lock, on the row it reads there; this changes no gate.
 * ⛔ NEVER A WITHDRAWAL FIGURE: a bonus is stakeable and not withdrawable until wagered, so a withdrawal's figure is the
 * balance alone (`withdraw_bonus_locked`, failure-reasons.ts).
 * Proof: `npm run test:updown-spendable` (and `-db`, the same suite on Postgres; `red:updown-spendable`).
 *
 * Pure and isomorphic: it imports nothing.
 */
export function spendableOf(wallet: { balance: number; bonusBalance?: number | null }): number {
  return wallet.balance + (wallet.bonusBalance ?? 0);
}
