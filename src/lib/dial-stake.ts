/**
 * THE DIAL'S STAKE LADDER — the arithmetic that turns a knob position into money.
 *
 * 🔴 WHY THIS IS A MODULE AND NOT FOUR LINES INSIDE THE COMPONENT. `conviction-dial.tsx` is
 * 1,789 lines of client component; a suite cannot import it to check a number, so the one
 * calculation on the betting surface that decides *how much a player is about to stake* had no
 * test that could fail. This is the `queue-order.ts` shape, for the same reason: the maths
 * lives where it can be asserted, and imports nothing.
 *
 * 🔴 THE DEFECT IT WAS EXTRACTED FOR, found 2026-08-28. The slider path computed
 *
 *     Math.max(baseStake, Math.round(target / 100) * 100)
 *
 * and nothing clamped the result to `maxStake`. `Math.round` to the nearest 100 rounds UP, so
 * whenever the configured maximum did not land on a clean hundred the dial's far end offered a
 * stake ABOVE it — `maxStake` 249,950 offered 250,000. The server refuses that outright
 * (`market-service.ts`: `stake > maxStake` → INVALID), so dragging to the top of the dial
 * produced a Place button the server would reject, on the maximum bet, with a bounds error.
 *
 * ⛔ AND THE ASYMMETRY IS THE TELL: of the dial's three inputs, the typed multiplier was
 * already clamped (`Math.min(baseStake * maxMultiplier, …)`) and the typed stake was already
 * clamped (`Math.min(maxDial, parsed)`). Only the one a player reaches by DRAGGING — the
 * default gesture, the one the whole control exists for — was not.
 *
 * ⚠️ REACHABLE BY CONFIGURATION, NOT BY DEFAULT. `maxStake` defaults to `PLATFORM_MAX_STAKE`
 * (1,000,000), which is a clean hundred, so the shipped platform never hit it. The admin door
 * at `/admin/config` validates only `Number.isFinite` and the platform range — it does not
 * require a multiple of 100 — and Up & Down chains resolve their own per-chain bounds through
 * `stakeBoundsForUpDownMarket`. So this is latent, not theoretical.
 */

/** The legacy ceiling, kept for callers that thread no `maxStake` (kit prototype: 1× … 200×). */
export const LEGACY_MAX_MULTIPLIER = 200;

/**
 * Multiplier ceiling, so the dial spans EXACTLY the configured [baseStake, maxStake].
 * ⚠️ Guarded so a bad config (`max <= min`, non-finite) cannot produce a ≤0 or NaN range —
 * a non-finite multiplier would put `NaN` in the Place button.
 */
export function maxMultiplierFor(baseStake: number, maxStake?: number): number {
  return typeof maxStake === "number" && Number.isFinite(maxStake) && maxStake > baseStake
    ? maxStake / baseStake
    : LEGACY_MAX_MULTIPLIER;
}

/**
 * The highest stake the dial may ever offer.
 *
 * ⛔ FLOORED, and that is not cosmetic: the server also demands `Number.isInteger(stake)`, and
 * the admin door does not require `maxStake` to be one. A ceiling of 250,000.5 handed straight
 * through would be refused for being fractional — a different error, the same dead button.
 */
export function stakeCeilingFor(baseStake: number, maxStake?: number): number {
  return Math.floor(baseStake * maxMultiplierFor(baseStake, maxStake));
}

/**
 * Knob position (0…1, 0.5 = centre) → the staked amount.
 *
 * Distance from centre maps QUADRATICALLY, so precision is fine near the centre where most
 * bets live and coarse out at the extreme. Snapped to the nearest 100 for a readable figure,
 * then held inside [baseStake, ceiling] — the snap is a presentation choice and must never
 * widen the range the operator configured.
 */
export function stakeFromPosition(pos: number, baseStake: number, maxStake?: number): number {
  const distFromCenter = Math.abs(pos - 0.5) * 2;
  const conviction = distFromCenter * distFromCenter; // ease-in
  const target = baseStake * (1 + conviction * (maxMultiplierFor(baseStake, maxStake) - 1));
  const snapped = Math.round(target / 100) * 100;
  // ⛔ The ceiling is applied AFTER the snap, because the snap is what breaks the bound.
  // Clamping the target first and rounding after would round straight back over it.
  return Math.max(baseStake, Math.min(stakeCeilingFor(baseStake, maxStake), snapped));
}
