/**
 * Pure stake math for Up & Down quick-bet — NO React, NO server imports, so it can be
 * unit-tested directly (scripts/updown-quickbet.test.mts) and shared by the hook + UI.
 * This is UX-side validation only; `buyPosition` re-validates the bounds server-side —
 * that remains the security boundary, this just stops a bad request from being sent.
 */

/**
 * Preset quick-stake steps, clamped to the chain's [min, max]. A fast game wants a
 * one-tap amount, not a keyboard — these cover the common stakes and dedupe.
 */
export function quickStakes(min: number, max: number): number[] {
  const base = [min, min * 2, min * 5, min * 10].filter((v) => v <= max);
  const set = Array.from(new Set([...base, max])).filter((v) => v >= min && v <= max).sort((a, b) => a - b);
  return set.slice(0, 4);
}

/**
 * Tight chip label for a stake — just the magnitude, no "TZS" (the STAKE label and the
 * custom field already establish the currency). Keeps the chip row on one line at 360px:
 * 100 · 200 · 500 · 1K · 100K.
 */
export function stakeChipLabel(n: number): string {
  if (n >= 1_000_000) return `${n % 1_000_000 === 0 ? n / 1_000_000 : (n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${n % 1_000 === 0 ? n / 1_000 : (n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Parse a free-typed stake to a whole positive number of TZS, or null if it isn't one. */
export function parseStake(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** True when `raw` parses to a whole amount within [min, max] — the placement gate. */
export function stakeIsValid(raw: string, min: number, max: number): boolean {
  const n = parseStake(raw);
  return n != null && n >= min && n <= max;
}

/**
 * UD-1 (ux-audit 2026-08) · THE BALANCE PRE-FLIGHT — pure, so the suite can drive it.
 *
 * A tap that is predictably doomed must never look like a placed bet: the conviction
 * dial already warns pre-click when `stake > balance` (CLAUDE.md UX commitments), and
 * the quick-bet stack had nothing equivalent. `balance` is the SERVER-rendered wallet
 * balance; `spentSinceTruth` is the optimistic stake placed since that render (the
 * hook's `optUp + optDown`), so a rapid burst cannot overdraw the rendered figure.
 *
 * ⛔ `balance == null` = UNKNOWN (guest, or the wallet read failed) → NOT insufficient.
 * B-1's law: a failed read never renders as zero — inventing "insufficient" from a
 * null would block a real bettor on a read hiccup. The server stays the boundary.
 */
export function insufficientFor(
  balance: number | null | undefined,
  spentSinceTruth: number,
  stake: number,
): boolean {
  if (balance == null || stake <= 0) return false;
  return stake > balance - spentSinceTruth;
}
