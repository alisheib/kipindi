/**
 * THE S9 SEAM — S13's one door to S9's records (`docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md`, A10).
 *
 * Measure 3 after launch ("short balance → deposit" on a question), measure 4 after launch ("deposit → bet completed") and
 * the internal reference row's question/round split read two columns S9 adds — `Transaction.pendingBet` (the bet a
 * deposit was made for) and `Position.origin` (`deposit_return` on the bet placed back from it) — and S9's own parser
 * of the saved bet (`parseSavedDepositBet`, `src/lib/journey/deposit-state.ts`).
 *
 * S9 is merged here. The seam is open only because its schema columns and parser are present.
 *
 * ⭐ THE PLUG-IN, when S9 is on main — this file and one line of `measures.ts`, nothing else:
 *
 *     import { DEPOSIT_RETURN_WINDOW_MS, parseSavedDepositBet } from "@/lib/journey/deposit-state";
 *     import { parseBetParam } from "@/lib/journey/pending-bet";
 *     export const S9_RECORDS: S9Records | null = {
 *       savedQuestionBet(raw) {
 *         const saved = parseSavedDepositBet(raw);
 *         const bet = saved ? parseBetParam(saved.bet) : null;
 *         return bet && bet.kind === "market" && bet.stake !== null ? { marketId: bet.id, side: bet.side, stake: bet.stake } : null;
 *       },
 *       returnWindowMs: DEPOSIT_RETURN_WINDOW_MS,
 *     };
 *
 * and in `measures.ts`, `DEPOSIT_FOLLOW_UP_MS` becomes S9's constant. ⛔ `test:journey-measures` §S9 holds this file to the
 * schema: it FAILS while `prisma/schema.prisma` carries S9's two columns and this seam is shut, and the reverse — so the
 * merge that brings S9 cannot leave these figures dark, and no build can read columns it does not have.
 */
import type { SavedQuestionBet } from "@/lib/journey/measures";
import { DEPOSIT_RETURN_WINDOW_MS, parseSavedDepositBet } from "@/lib/journey/deposit-state";
import { parseBetParam } from "@/lib/journey/pending-bet";

export type S9Records = {
  /** The saved bet a deposit row's `pendingBet` holds, when it is a QUESTION bet with a stake; null for anything else
   *  (a round, no saved bet, a malformed or future envelope — S9's parser fails closed). */
  savedQuestionBet(raw: unknown): SavedQuestionBet | null;
  /** S9's 30-minute window (`DEPOSIT_RETURN_WINDOW_MS`) — the rule measure 4's match and S9's writer share. */
  returnWindowMs: number;
};

export const S9_RECORDS: S9Records | null = {
  savedQuestionBet(raw) {
    const saved = parseSavedDepositBet(raw);
    const bet = saved ? parseBetParam(saved.bet) : null;
    return bet && bet.kind === "market" && bet.stake !== null
      ? { marketId: bet.id, side: bet.side, stake: bet.stake } : null;
  },
  returnWindowMs: DEPOSIT_RETURN_WINDOW_MS,
};
