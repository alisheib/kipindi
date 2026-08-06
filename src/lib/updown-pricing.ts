/**
 * WHAT A PLAYER WOULD ACTUALLY BE PAID — computed BEFORE the bet, from the real pool.
 *
 * ── WHY THIS FILE EXISTS (D2, `docs/UPDOWN-FINAL-DESIGN.md`) ─────────────────
 * 🔴 The card showed a flat **`× 1.5 est.`** on both buttons. It was not derived from
 * anything: `estimatedWinningsRate` is a config constant (`market-config.ts`), so the
 * figure read **identically when the other side held TZS 36,000 and when it held nothing**.
 *
 * ⛔ ON A PARI-MUTUEL GAME THAT HIDES THE SINGLE STRONGEST REASON TO TAKE THE THIN SIDE,
 * and the thin side is **43% of every stake this product has ever refunded** — 15 of the 35
 * rounds that ever carried money came back because nobody took the other side. The platform
 * already computes the honest number (`payoutFor`, the function settlement itself pays with)
 * and already uses it for `myExactPayout` at the lock. It simply never showed it *before* the
 * bet, which is the only moment it could change anyone's mind.
 *
 * ⚠️ AND THE DISCLAIMER UNDERNEATH ALREADY CLAIMED IT WAS POOL-DERIVED — *"× figures are pool
 * estimates"* sat beneath a constant. So the surface was not merely silent, it was wrong.
 *
 * ── THE THREE RULES BAKED IN ────────────────────────────────────────────────
 *  · **ONE FUNCTION, NOT A SECOND OPINION.** Everything here routes through `payoutFor` from
 *    `@/lib/payout` — the same call `projectedPayout` (server) and settlement make. Deriving a
 *    multiplier from `upPct` and a rate would ignore the round's FROZEN FEE SNAPSHOT and print
 *    a confident wrong number on a money screen, which is strictly worse than the honest
 *    constant it replaced. That mistake was made once already, on `myExactPayout`.
 *  · **IT IS AN ESTIMATE AND IT MOVES.** Pari-mutuel odds change with every later bet, so this
 *    can never be a promise (G3). It is labelled live in the copy, and at the LOCK the pool
 *    freezes and `myExactPayout` replaces it with arithmetic. That existing behaviour is what
 *    makes showing this safe at all.
 *  · **INFORMATION, NOT PROMOTION** (G5/RG). A big multiplier means the other side is thin,
 *    which is a *risk* statement as much as a reward one. Callers render it in the same ink and
 *    the same size as the small one; nothing here escalates.
 *
 * ── WHY IT LIVES HERE, ISOMORPHIC ───────────────────────────────────────────
 * The board card is a client component, the round page a server component, and the stake panel
 * a third caller. Same reasoning as `updown-refund-reason.ts`: several copies of "what would I
 * be paid" is several chances to disagree about someone's money. `@/lib/payout` is explicitly
 * isomorphic, so this is too — it imports nothing from `server/`.
 */
import { payoutFor, type PollRates } from "@/lib/payout";

/**
 * EXACTLY the frozen rates `poolFee` reads — nothing more crosses to the browser.
 *
 * ⛔ Deliberately narrower than `PollRates`. The long-form poll page ships a whole
 * `FeeSnapshot` to the dial; a board renders three cards, and the tax/levy/exit fields are
 * none of a player's business and none of this calculation's either. Typed as a `Pick` so it
 * cannot drift from the real rate names.
 */
export type UpDownRates = Pick<
  PollRates,
  "feeModel" | "commissionRate" | "feeCeilingRate" | "platformFeeRate" | "operatorFeeRate"
>;

/**
 * A round's live money, as the player surfaces receive it.
 *
 * ⛔ `upPool`/`downPool` are the RAW shillings, never re-derived from the rounded `upPct` the
 * bar draws. A percentage rounded to an integer cannot tell 0 from 400 on a 100,000 pool, and
 * "is this side empty" is the whole question this type exists to answer.
 */
export type UpDownPricing = {
  /** TZS staked on UP (= the market's `yesPool`). */
  upPool: number;
  /** TZS staked on DOWN (= the market's `noPool`). */
  downPool: number;
  /** THIS round's frozen snapshot — a rate retune must never reprice a placed bet. */
  rates: UpDownRates;
  /**
   * The operator's display switch (`showEstimatedWinnings`), frozen per poll. False ⇒ no
   * multiplier is rendered at all, exactly as before this change; legacy rounds that never
   * stamped the display fields keep behaving as they always did.
   *
   * ⚠️ It gates the MULTIPLIER only. The empty-side sentence is a fact about the round, not a
   * winnings estimate, so no display switch may suppress it.
   */
  show: boolean;
};

/** UP is YES and DOWN is NO on the underlying market. One place that mapping is written. */
function sideOf(side: "UP" | "DOWN"): "YES" | "NO" {
  return side === "UP" ? "YES" : "NO";
}

/**
 * What TZS 1 staked on `side` would return right now, as a multiple of the stake.
 *
 * Returns `null` when there is nothing honest to show: the display switch is off, the stake is
 * not a usable amount, or the shared payout function refused the inputs.
 *
 * ⚠️ THE `catch` IS A BACKSTOP, AND THIS SAYS SO RATHER THAN OVERSELLING IT. `payoutFor` runs
 * `assertWinnerFloor`, which THROWS rather than let a winner be quoted below stake — right in
 * the money path, wrong in a render, where an unhandled throw inside a client component blanks
 * the whole card. It is currently **unreachable**: `readRates` clamps both `feeCeilingRate` and
 * the loser-share rate to `1.0`, and the winner floor holds for any rate at or below that. The
 * catch exists so that a future rate, model or clamp cannot turn a display bug into a dark
 * board. `test:updown-pricing` §1 proves the function is total over hostile input instead of
 * pretending to construct a throw it cannot construct.
 */
export function impliedMultiplier(
  pricing: UpDownPricing | null | undefined,
  side: "UP" | "DOWN",
  stake: number,
): number | null {
  if (!pricing || !pricing.show) return null;
  if (!Number.isFinite(stake) || stake <= 0) return null;
  try {
    const { payout } = payoutFor(
      { yesPool: Math.max(0, pricing.upPool), noPool: Math.max(0, pricing.downPool), side: sideOf(side), stake },
      pricing.rates,
    );
    const ratio = payout / stake;
    return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
  } catch {
    return null;
  }
}

/**
 * Which side of this round nobody has backed — `"BOTH"` when the round is untouched.
 *
 * ⭐ THIS IS THE STATE D2 EXISTS TO NAME. A one-sided round refunds everyone at settlement
 * whichever way the price goes (E-65), so a player staking into it is not taking a risk that
 * might pay — they are parking money for the length of the round. Before this, the only place
 * that was ever said was the refund notice, *after* the round.
 */
export function emptySideOf(pricing: UpDownPricing | null | undefined): "UP" | "DOWN" | "BOTH" | null {
  if (!pricing) return null;
  const up = Math.max(0, pricing.upPool);
  const down = Math.max(0, pricing.downPool);
  if (up <= 0 && down <= 0) return "BOTH";
  if (up <= 0) return "UP";
  if (down <= 0) return "DOWN";
  return null;
}

/**
 * The refund warning for a player who is about to back `side` specifically — the side that
 * still has to fill is the OTHER one.
 *
 * ⛔ WHY THIS IS NOT `emptySideOf`, AND THE DIFFERENCE IS THE WHOLE POINT. On a round holding
 * UP 36,000 / DOWN 0, `emptySideOf` says DOWN — correct for everyone currently in the round.
 * But a player about to back DOWN is the one FILLING it: telling them "nobody has backed Down,
 * so your stake comes back" is false the instant they tap, and their multiplier is the largest
 * on the board. They get no warning; the fat-side backer gets the real one.
 *
 * `"BOTH"` when the round is empty — then it is true for whichever side they choose.
 */
export function refundWarningFor(
  pricing: UpDownPricing | null | undefined,
  side: "UP" | "DOWN",
): "UP" | "DOWN" | "BOTH" | null {
  const empty = emptySideOf(pricing);
  if (empty === "BOTH" || empty === null) return empty;
  // The empty side is the one they are about to fill ⇒ the warning is not theirs.
  return empty === side ? null : empty;
}

/**
 * The multiplier as it is printed: `1.00` · `4.24` · `16.6` · `187`.
 *
 * ⛔ IT FLOORS, IT DOES NOT ROUND. `toFixed` rounds half up, so `1.996×` would print `2.00×` —
 * a payout estimate nudged UPWARDS on a money surface. Flooring can only ever understate, which
 * is the safe direction, and it is the same reasoning as refusing to settle rather than
 * underpaying a winner. The `1e-9` absorbs binary float (`1.03 * 100 = 102.99999999999999`,
 * which would otherwise floor to `1.02`).
 *
 * Precision shrinks as the figure grows because the trailing digits stop meaning anything: at
 * `× 187` the pool moves further between two renders than the hundredths place is worth.
 */
export function formatMultiplier(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  const digits = m >= 100 ? 0 : m >= 10 ? 1 : 2;
  const f = 10 ** digits;
  return (Math.floor(m * f + 1e-9) / f).toFixed(digits);
}

/**
 * What a specific stake would return, in whole shillings — the figure the round page's stake
 * field shows beside the amount.
 *
 * Same call, same rates, same rounding as `impliedMultiplier`, so the panel's arrow figure and
 * the button's `× …` can never disagree. Null when there is nothing honest to show.
 */
export function projectedReturn(
  pricing: UpDownPricing | null | undefined,
  side: "UP" | "DOWN",
  stake: number,
): number | null {
  const m = impliedMultiplier(pricing, side, stake);
  return m == null ? null : Math.round(stake * m);
}
