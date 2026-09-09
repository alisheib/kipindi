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
 * ⛔ THE RELEASE GATE — the QR is WITHHELD until Selcom can verify a QR payment.
 *
 * Set to `false` on 2026-09-09 by management decision. Read `docs/LIPA-QR.md` §3d
 * before changing it.
 *
 * ⭐ WHY A CONSTANT AND NOT THE OPERATOR SWITCH. `lipaConfig.enabled` already exists
 * and would hide the QR too — but it is persisted in `SystemConfig`, and **a persisted
 * row beats a code default**. Turning the QR off by editing a default would have
 * changed nothing in production, which is the exact trap this feature already walked
 * into once: the handover recorded the QR as invisible in production because the
 * shipped default disagreed, while production held a row saying otherwise and was
 * rendering it. A constant cannot be overridden by a row, an operator, or an
 * environment — so "off" means off everywhere, provably.
 *
 * ⚠️ THE REASON, so it is never re-enabled for the wrong one. A Lipa Namba payment has
 * nowhere to carry our reference: on M-Pesa, Mixx, Airtel and HaloPesa alike the payer
 * enters the Lipa number and the amount and is never asked for a reference. Money
 * arriving that way cannot be attributed to a person by the system — only by a human
 * reading a bank statement (§3c). Scanning changes none of that; the QR only saves
 * typing. Payment without traceability is what is being withdrawn, and the QR goes
 * with it because it is the shortcut TO it.
 *
 * ⭐ RE-ENABLING IS THIS ONE FLAG, and everything behind it is kept alive and guarded
 * for that day: the safety rule below, the verified vector artwork, the payload pin,
 * the console card, and the whole of `test:lipa-qr` / `red:lipa-qr`. The condition is
 * NOT "someone wants the QR back" — it is **Selcom confirming a QR payment can be
 * verified against the payer**: a per-order QR from Checkout whose `order_id` reaches
 * our webhook, exactly as a deposit already does (§6).
 */
export const LIPA_QR_RELEASED = false;

/**
 * Would the QR be shown for this config and destination, **ignoring the release gate**?
 *
 * ⭐ THIS EXISTS SO WITHDRAWING THE QR DOES NOT BLIND ITS OWN GUARDS. With the gate
 * off, every `shouldShowLipaQr` assertion of the form "hides when …" passes no matter
 * what — it would pass with the safety rule deleted, which is a check that has stopped
 * testing anything. The rule is therefore expressed here and tested here, while the
 * gate is tested separately for the one thing it must do: refuse **everything**.
 *
 * ⛔ NOT A CALL SITE. Rendering surfaces must call `shouldShowLipaQr`, never this. It
 * answers "is this config coherent", not "may this be on screen".
 */
export function lipaQrWouldShow(lipa: LipaDisplay | null | undefined, account: string | null | undefined): boolean {
  if (!lipa || !lipa.enabled) return false;
  if (!lipa.qrAssetPath) return false;
  return lipaQrIsSafeFor(account, lipa.lipaNumber);
}

/**
 * Should the QR affordance render at all, for this destination?
 *
 * Folds the release gate and the operator switch into the safety rule so no call site
 * can consult one and forget another — the "half-on" failure `feature-state.ts` exists
 * to stop.
 */
export function shouldShowLipaQr(lipa: LipaDisplay | null | undefined, account: string | null | undefined): boolean {
  // ⛔ FIRST, and unconditional. Nothing below can re-open the affordance.
  if (!LIPA_QR_RELEASED) return false;
  return lipaQrWouldShow(lipa, account);
}
