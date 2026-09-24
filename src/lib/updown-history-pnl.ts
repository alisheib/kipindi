/**
 * THE MONEY LINE ON /updown/history — one pure function, so the figures can be checked
 * without a browser, a database or a signed-in session.
 *
 * 🔴 WHY IT EXISTS (D37). This arithmetic lived inline in the page and reduced over `rounds`,
 * which is the TWELVE ROUNDS ON THE CURRENT PAGE. The strip around it described the whole
 * filtered view — the bar above counts `matched.length`, the middle tile printed an unpaged bet
 * count, and the page's own comment said the figures "describe the whole filtered view". So
 * **Net return and Win rate changed when the player pressed "next"**, and one tile carried two
 * scopes two lines apart ("Rounds 12 · 87 bets").
 *
 * ⭐ Ali decided the scope on 2026-09-24: THE WHOLE FILTERED VIEW. The pager moves the list and
 * never the money. Handing this the wrong population is now the only way to get it wrong, and
 * `updown-history-pnl.test.mts` §3 reads the page to check which one it hands over.
 *
 * ⚠️ THE VIEW IS ITSELF BOUNDED. `getMyUpDownHistory` caps at the most recent `UD_HISTORY_LIMIT`
 * positions, so "the whole view" means "within that cap" — which the caption under the strip
 * states in words. This function reports on what it is given and claims nothing wider.
 */

/** One round, already aggregated across every bet the player placed on it. */
export type PnlRound = {
  /** Total staked by this player on this round. */
  stake: number;
  /** Total returned to this player on this round — payouts and refunds alike. */
  returned: number;
  /** Any position on this round is still OPEN, so the round has no realised result yet. */
  anyOpen: boolean;
  /** The ROUND's outcome. `"VOID"` is not a result and must not score. */
  outcome: string | null;
};

export type Pnl = {
  staked: number;
  returned: number;
  net: number;
  /** Rounds with a realised result — the denominator of `winRate`. */
  decided: number;
  wins: number;
  /** Null, never 0, when nothing has been decided: 0% is a claim, an absence is not. */
  winRate: number | null;
};

/**
 * ⛔ A ROUND COUNTS ONCE, however many bets were placed on it. Counting bets instead would make
 * a player who staked six times on one round look six times as active, and would score that
 * round's single outcome six times over in the win rate.
 *
 * ⛔ OPEN AND VOID ROUNDS ARE EXCLUDED FROM EVERY FIGURE, denominator included. An open round
 * has no result to count. A VOID round returns the stake, so folding it in would add a decided
 * round with a net of exactly zero — dragging the win rate down for something that never
 * resolved and that the player was made whole for.
 */
export function roundPnl(rounds: readonly PnlRound[]): Pnl {
  const settled = rounds.filter((g) => !g.anyOpen && g.outcome !== "VOID");
  const staked = settled.reduce((s, g) => s + g.stake, 0);
  const returned = settled.reduce((s, g) => s + g.returned, 0);
  const decided = settled.length;
  const wins = settled.filter((g) => g.returned > g.stake).length;
  return {
    staked,
    returned,
    net: returned - staked,
    decided,
    wins,
    // ⛔ NULL, NOT ZERO. "0%" tells a player they lost every round; the truth is that nothing has
    // been decided yet. The strip renders an em-dash for null.
    winRate: decided > 0 ? Math.round((wins / decided) * 100) : null,
  };
}
