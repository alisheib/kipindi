/**
 * THE SLIP'S SHORT MAIN BALANCE, ASKED OF THE BET SHEET'S OWN PLAN (MASWALI-BUILD S5; Ali 2026-10-21 10/10 pass — the slip
 * critic's H4, and the lead's ruling: the deposit door's amount follows `lib/journey/shortfall.ts` exactly).
 *
 * 🔴 THE DOOR OFFERED AN AMOUNT THE DEPOSIT REFUSES: "Weka pesa TZS 600" — the raw shortfall — while the smallest deposit
 * is `DEPOSIT_MIN_TZS` (the classic form drops a below-minimum prefill and the journey form refuses it), with no ceiling
 * and a second offer beside a deposit still in flight. A broken money promise (§F7).
 * ⭐ NOW THE PLAN'S OWN DEPOSIT HALF (its steps 9–15): enough? · a deposit already pending (wait for it, never a second) ·
 * D = max(shortfall, DEPOSIT_MIN_TZS) · the rails open · the RG and source-of-funds ceiling · the chips (D and the next two
 * ladder amounts within it) · `belowDepositMin` · what stays after (`leftAfter`). Fed with the MAIN balance alone and a
 * bonus of nothing — bonus money never buys a ticket (MR-10) — and the purchase's total as the stake.
 * ⛔ THE BET PATH'S OWN GATES ARE NOT ASKED HERE (steps 1–6 and 8: maintenance, a break, the session clock, the account,
 * the market, the stake bounds, the loss limit): they are the bet's, and the ticket purchase decides its own at the buy —
 * the page has already refused a break, a closed week, a pause and the cap before any pick. They are passed as the
 * values that let the plan reach its deposit half, named here, never read as facts about the player. The wallet's status
 * (step 7) IS asked: no deposit and no ticket through a held wallet.
 * ⛔ UNKNOWN IS NOT ZERO: with no facts or no readable balance there is no plan (null), and the composer's door falls back
 * to the one rule it can still keep — the minimum (`depositRequestFor`).
 *
 * Pure and client-safe: the only import is the plan, which ships to the browser already (the bet sheet).
 */
import { depositRequestFor, shortfallPlan, type ShortfallInput, type ShortfallPlan } from "@/lib/journey/shortfall";

/** What the slip's page reads for the deposit half of the plan — the journey's `viewerFacts`, slimmed to it. */
export type SlipDepositFacts = {
  /** The wallet row's status (ACTIVE, or held). */
  walletStatus: string;
  /** The newest PROCESSING deposit, with its age (null when its age is unknown). */
  pendingDeposit: { amount: number; txnId: string; createdAt: string | null } | null;
  /** The RG limits and their usage, the source-of-funds standing, and the open deposit rails (by name). */
  deposit: ShortfallInput["deposit"] & { railNames: string[] };
};

/** The plan for a purchase of `total` against the main balance `main`, or null when either is unknown. */
export function slipShortfall(facts: SlipDepositFacts | null, main: number | null, total: number, nowMs: number): ShortfallPlan | null {
  if (facts === null || main === null || !Number.isSafeInteger(main) || !Number.isSafeInteger(total) || total <= 0) return null;
  return shortfallPlan({
    // The bet path's gates, passed through (see the header): the purchase decides its own at the buy.
    maintenance: false,
    lockout: null,
    session: null,
    account: { status: "ACTIVE" },
    market: { live: true, selectionClosed: false },
    stake: total,
    bounds: { min: total, max: total },
    loss: { dailyLossLimit: null, lossToday: 0 },
    // The facts the deposit half reads: the main balance and NO bonus (MR-10), the pending deposit, the ceiling's inputs.
    wallet: { status: facts.walletStatus, balance: main, bonusBalance: 0 },
    pendingDeposit: facts.pendingDeposit,
    deposit: facts.deposit,
    nowMs,
  });
}

/** With no plan (facts or balance unknown): the one figure still kept — the shortfall, or the whole total when the balance
 *  is unknown, never under the minimum deposit. */
export function slipFallbackDeposit(main: number | null, total: number): number {
  return depositRequestFor(main === null ? total : Math.max(0, total - main)).amount;
}
