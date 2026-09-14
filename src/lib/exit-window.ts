/**
 * THE EXIT WINDOW — when a stake stops being cancellable. One formula, pure, shared.
 *
 * ⭐ WHY IT IS ITS OWN MODULE (house bots, sanctioned change (k), 04 A14). `cashOutValue` decides
 * whether a player may still sell, and the house engine and the locked-pool query (`lockedForHouse`,
 * N1 §4.1) must agree with it to the millisecond: a house stake that counts money the player can
 * still take back is sized against money that may vanish. Three copies of the rule would drift, so
 * there is one, and `test:house-bot-seam` pins `cashOutValue`'s output byte-identical to the golden
 * grid captured before this was extracted.
 *
 * ⛔ `graceMs > 0` IS PART OF THE RULE. A poll that froze a 0-minute free grace offers NO exit, even
 * with a paid window: `hadRunway` needs a positive grace. Dropping that term would open an exit the
 * player path has never offered — a money change on a live platform.
 *
 * The window, measured from the placement instant with the poll's OWN frozen rates:
 *   · runway   = closesAt − placedAt ≥ grace, and grace > 0 — otherwise there never was an exit;
 *   · closes   = placedAt + grace + paid when there was a runway, else placedAt itself.
 */
export type ExitWindowInput = {
  placedAtMs: number;
  /** `selectionClosedAt ?? resolutionAt`, in ms (NaN when unparseable — then there is no runway). */
  closesAtMs: number;
  freeExitGraceMinutes: number;
  paidExitWindowMinutes: number;
};

export type ExitWindowFacts = {
  graceMs: number;
  /** grace + paid. */
  windowMs: number;
  hadRunway: boolean;
  /** When the stake stops being cancellable: `placedAt + windowMs` with a runway, else `placedAt`. */
  exitCloseAtMs: number;
};

export function exitWindowFacts(input: ExitWindowInput): ExitWindowFacts {
  const graceMs = Math.max(0, input.freeExitGraceMinutes) * 60_000;
  const windowMs = graceMs + Math.max(0, input.paidExitWindowMinutes) * 60_000;
  const hadRunway = graceMs > 0 && input.closesAtMs - input.placedAtMs >= graceMs;
  return { graceMs, windowMs, hadRunway, exitCloseAtMs: hadRunway ? input.placedAtMs + windowMs : input.placedAtMs };
}
