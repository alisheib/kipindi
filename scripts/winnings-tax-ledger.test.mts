/**
 * test:winnings-tax-ledger — THE STAKE-SHARE WINNINGS TAX, FROM THE ARITHMETIC TO THE ROWS, ON BOTH STORES
 * (programme FEE-TAX-2026-10, release R2 lane b; `docs/FEE-TAX-PLAN.md` §3 and §6).
 *
 *   npm run test:winnings-tax-ledger     (boots the on-box Postgres through db-scratch)
 *   npm run red:winnings-tax-ledger      (plants five defects into the real source — the tax booked from PLAYER, booked to
 *                                         HOUSE:TRA_LEVY, left in POOL by the builder, never handed over by the settlement,
 *                                         the payout credited gross — memory child; commit first)
 *
 * Under `stake-share` a winner's prize carries a winnings tax, withheld at settlement for TRA. It must leave the POOL —
 * never a PLAYER account, whose ledger is held line for line against the wallet — into its own liability,
 * `HOUSE:WINNINGS_TAX` — never `HOUSE:TRA_LEVY` (10% of OUR fee, read by every levy report) and never `HOUSE:TAX` (the agent
 * programme's VAT and withholding). And it must leave at all: a tax that stays in the pool is a residual every group and
 * the trial balance accept — the self-cancelling shape that hid the 2026-08-11 commission defect behind four green suites.
 *
 * ⭐ ONE CASE LIST, TWO STORES (`scripts/lib/winnings-tax-ledger-child.mts`, each store in its own child, through the runner
 * the house's two-store suites use). Its §1–§2 drive the PURE builders on `stakeShareSplit`'s own output and prove their
 * checks able to fail; §3–§5 drive the REAL `settleMarket`. The ledger rows exist only on Postgres (the memory store keeps
 * none), so that child reads them back: every group balanced, the tax line tied to its BET_PAYOUT row, HOUSE:WINNINGS_TAX
 * = Σ taxWithheld, POOL = 0, the trial balance tying — and a resumed settlement reproducing every share.
 * ⛔ NO POSTGRES IS A FAILURE, NOT A SKIP (exit 3, NOT MEASURED).
 *
 * ⛔ THE FLOORS ARE THE CHILD'S FIXED ASSERTION LIST (no loop prints a variable number of lines): 36 on every store —
 * §1 seven, §2 nine, §2b three, §3 eight, §4 three, §5 four, the store and gate checks two — and eleven more on Postgres
 * alone (§3 seven ledger reads, §4 two, §5 two). The first printed run must equal them; if it does not, they are
 * re-measured from that print, never guessed again, and they only ever rise.
 */
import { runTwoStores } from "./lib/house-bot-two-stores.mts";

await runTwoStores({
  suite: "test:winnings-tax-ledger",
  casesFile: "scripts/lib/winnings-tax-ledger-child.mts",
  minPass: { memory: 36, postgres: 47 },
  dbPrefix: "wtl",
});
