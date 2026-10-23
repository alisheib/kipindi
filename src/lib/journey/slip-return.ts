/**
 * ⭐ MB-57 · THE MILLIONEA SLIP'S WAY BACK FROM A DEPOSIT (MASWALI-BUILD FLOW 3, the lead's ruling of 2026-10-23;
 * MASWALI-PLAN §8 MB-57: "after a deposit, return to the slip with picks intact and never place the ticket automatically").
 *
 * The question sheet and the Up & Down sheet save their ONE bet with the deposit (`SavedDepositBet`, `deposit-state.ts`),
 * because the server must re-open that bet. The slip needs no such record: its answers — every answer of every ticket of
 * the purchase — are already the tab's own (`kp-millionea-slip:<week>`, the privacy notice's §7), and a deposit never
 * carries a pick. So a deposit started from the slip's low-balance door carries only the WAY BACK, in its addresses
 * (`returnPath`, the saved bet's own parameter): the deposit page hands it to its form, the deposit action to the wait page
 * (both shells land there, so an asynchronous payment is waited for), and the wait page offers it once the money has
 * arrived — the player confirms the ticket themselves; nothing is bought by itself.
 *
 * ⛔ ONE ALLOWED RETURN. A path outside this list is no return at all, never a guess at what was meant (the plant
 *    `red:deposit-slip-return` drops the slip from it, and the case and the drive must then find no way back).
 * ⛔ A WAY BACK INTO A HIDDEN PRODUCT IS NO WAY BACK: every server reader asks `resolveMillionea()` before it honours one,
 *    so while Millionea is hidden from the reader nothing of it is drawn or followed (DESIGN_AUTHORITY §M8a: WITHDRAWN stays
 *    dark).
 * Pure: no storage, no request, no server import — the deposit page, its action, its form and the wait page all read it.
 */
export const MILLIONEA_SLIP_RETURN = "/millionea/slip";

/** Every page a deposit may lead back to WITHOUT a saved bet: the Millionea slip alone. */
export const SLIP_RETURN_PATHS: readonly string[] = [MILLIONEA_SLIP_RETURN];

/** The slip's way back named by `raw` — exactly one of `SLIP_RETURN_PATHS`, no query, no trailing slash — or null. */
export function slipReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 64) return null;
  return SLIP_RETURN_PATHS.includes(raw) ? raw : null;
}
