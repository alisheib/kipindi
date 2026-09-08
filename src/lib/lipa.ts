/**
 * THE LIPA (Selcom merchant QR) VOCABULARY — client-safe, one home.
 *
 * ── ⛔ NO IMPORTS, AND THAT IS THE POINT ─────────────────────────────────────
 * Same construction and same reason as `payment-providers.ts`: the panel that
 * renders this lives inside `agent/apply/apply-client.tsx`, which is a `"use
 * client"` tree. A client component cannot import `src/lib/server/*` without
 * dragging Prisma and `node:` builtins into a browser chunk. So the *values* are
 * persisted server-side in `server/lipa-config.ts` and handed down as props, while
 * the *rules* about those values live here, where both sides — and the guard —
 * can reach exactly one copy.
 *
 * ── WHAT A "LIPA NUMBER" IS ──────────────────────────────────────────────────
 * A Selcom merchant collection number ("Lipa Namba"). Ocean Entertainment's is
 * 7006 3747. It is printed with a space for the eye and stored without one,
 * because it is an identifier, not a phrase — and an operator retyping it from a
 * poster will include the space whether we like it or not.
 */

/** Everything a payment surface needs in order to render the QR affordance. */
export type LipaDisplay = {
  /** Operator switch for the QR affordance ONLY. It never changes where money goes. */
  enabled: boolean;
  /** Legal merchant name, as printed on the poster. */
  merchantName: string;
  /** Digits only, e.g. "70063747". Format with `formatLipaNumber` to display. */
  lipaNumber: string;
  /** The USSD fallback for a handset that cannot scan, e.g. "*150*50#". */
  ussdCode: string;
  /** Public path of the verified QR image, e.g. "/pay/selcom-lipa-qr.png". */
  qrAssetPath: string;
};

/** Strip everything that is not a digit. "7006 3747" and "7006-3747" are one number. */
export function normalizeLipaNumber(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Group a Lipa number for reading: "70063747" → "7006 3747".
 *
 * Four-digit groups, matching how Selcom prints it on the poster and how the
 * Selcom Business console shows it. A number of unexpected length is returned in
 * whatever grouping falls out rather than rejected — this is a display helper, and
 * refusing to render a number an operator can see in their own console would hide
 * the very misconfiguration they need to spot.
 */
export function formatLipaNumber(raw: string | null | undefined): string {
  const d = normalizeLipaNumber(raw);
  if (!d) return "";
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * ⭐ THE SAFETY RULE. May the QR be shown beside a destination account of `account`?
 *
 * ⛔ WHY THIS EXISTS. The QR pays Lipa 7006 3747. The words next to it are rendered
 * from a SEPARATE operator setting (`agentConfig.feeDestinationAccount`), which at
 * the time of writing still said `0769777877` — a different destination entirely.
 * Two destinations on one screen for one payment is not a cosmetic problem: the
 * applicant pays one of them, we reconcile the other, and the money is "missing"
 * for a week. It is also exactly the shape of a scam a support agent cannot
 * disprove.
 *
 * So the QR is not rendered *alongside* the account — it is rendered **only when it
 * IS the account**. An operator who points the fee somewhere else gets the number
 * in text and no QR, automatically, with nothing to remember. The QR is thereby
 * structurally incapable of contradicting the words beside it.
 *
 * ⚠️ Comparison is on digits, so "7006 3747" typed into the admin field still
 * matches. An empty account never matches — absence is not agreement.
 */
export function lipaQrIsSafeFor(account: string | null | undefined, lipaNumber: string | null | undefined): boolean {
  const a = normalizeLipaNumber(account);
  const l = normalizeLipaNumber(lipaNumber);
  return a.length > 0 && l.length > 0 && a === l;
}

/**
 * Should the QR affordance render at all, for this destination?
 *
 * Folds the operator switch into the safety rule so no call site can consult one
 * and forget the other — the "half-on" failure `feature-state.ts` exists to stop.
 */
export function shouldShowLipaQr(lipa: LipaDisplay | null | undefined, account: string | null | undefined): boolean {
  if (!lipa || !lipa.enabled) return false;
  if (!lipa.qrAssetPath) return false;
  return lipaQrIsSafeFor(account, lipa.lipaNumber);
}
