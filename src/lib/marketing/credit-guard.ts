/**
 * ⭐ U49a · THE CREDIT KEPT FOR CODES — ONE RULE for "may marketing spend this much now?" (ENGINE-SPEC §4.12 decision 2;
 * E16). Login and withdrawal codes ride the same SMS account as marketing, and a code that cannot be sent is a player who
 * cannot sign in or withdraw. So a campaign may spend only what lies ABOVE the credit the owner keeps for them — the
 * Marketing SMS settings' `codesReserveTzs` (TZS 20,000 unless the owner saves another figure — OD63, ENGINE-SPEC §7 Q1).
 *
 *   creditVerdict({ balance, costTzs, reserveTzs })
 *     · the credit is not a LIVE figure — a failed, unfinished, stale or unavailable read (`BalanceFigure`'s unreadable
 *       arm, which carries no figure at all) → `credit_unreadable`. ⛔ FAIL CLOSED. Inside `sendBatch` an unknown credit
 *       stays "not low", because that path carries every login code; for marketing, not knowing is a refusal, and it is
 *       decided HERE (E16).
 *     · the live credit minus the cost STRICTLY below the credit kept for codes → `credit_low`, with the three figures;
 *       landing exactly on the line goes ahead.
 *     · otherwise → ok.
 * ⛔ A cost that is not a finite figure of 0 or more, or a reserve that is not a finite figure ABOVE 0, is
 * `credit_unreadable` too: a projection nobody could compute never passes as affordable (NaN compares false with
 * everything, so a bare comparison would let it through), and a reserve of 0 keeps nothing for codes — no saved setting
 * can be one (the settings hold it at the platform floor or more). The estimate reads such a reserve the same way
 * (`campaign-estimate.ts`: no coverage figure).
 *
 * ⭐ ONE RULE, THREE COSTS (decision 2): at Start, the frozen campaign at today's price; at Resume, the outstanding rows ×
 * the segments × the price (both `start-check.ts`); for each slice, its claim × the segments × the price (U43b).
 * ⛔ NOTHING CALLS IT YET outside `start-check.ts` — which nothing calls until U47b's Start — and U43b's slice is its other
 * caller to come. The caller decides who may read the figures in a refusal (`campaignMoneyVisible`); this file only decides.
 *
 * Pure and client-safe: one TYPE import, erased at compile time — no runtime import at all.
 *
 * Guard: `npm run test:marketing-engine` §F (F2 · F3 · F6) · Red: `npm run red:marketing-engine` (in memory).
 */
import type { BalanceFigure } from "@/lib/marketing/campaign-estimate";

export type CreditVerdict =
  | { ok: true }
  | { ok: false; reason: "credit_unreadable" }
  | { ok: false; reason: "credit_low"; balanceTzs: number; costTzs: number; reserveTzs: number };

/** A cost this rule will reason about: finite, and 0 or more. */
const isAmount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
/** A credit kept for codes this rule will reason about: finite, and above 0. */
const isReserve = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * ⭐ May a campaign spend `costTzs` out of this credit and still leave the credit kept for codes? See the header.
 * `balance` is the credit as the caller's read CONFIRMED it (`balanceFigureOf` drops anything else).
 */
export function creditVerdict(a: { balance: BalanceFigure; costTzs: number; reserveTzs: number }): CreditVerdict {
  const b = a.balance;
  if (!b || b.kind !== "live" || typeof b.tzs !== "number" || !Number.isFinite(b.tzs)) return { ok: false, reason: "credit_unreadable" };
  if (!isAmount(a.costTzs) || !isReserve(a.reserveTzs)) return { ok: false, reason: "credit_unreadable" };
  if (b.tzs - a.costTzs < a.reserveTzs) {
    return { ok: false, reason: "credit_low", balanceTzs: b.tzs, costTzs: a.costTzs, reserveTzs: a.reserveTzs };
  }
  return { ok: true };
}
