/**
 * WHAT THE JOURNEY HEADER SHOWS — one truth table (the Vodacom plan S6, SJ-15; S6-PLAN WP2 step 3).
 *
 * Three answers, from five facts the shell already holds (`app-shell.tsx` builds `topUser` and `promoSuppressed`; the
 * bar reads the path):
 *   · capsule — the captioned balance ("Salio" over the figure). Shown to a signed-in reader whose balance was READ,
 *     zero included (Ali, 2026-09-28 — the classic capsule's own rule); "held" when the wallet is held. A wallet that
 *     could not be read shows nothing: never a zero nobody measured.
 *   · pill — "+ Weka pesa". The classic bar's guard, unchanged (signed in, wallet not held, not already on the deposit
 *     screen or its return — `/wallet/deposit` refuses a held wallet), plus the S4 rule: not during a break.
 *   · authPills — Ingia and Jisajili, for a signed-out reader, at every width (E-276).
 *
 * ⚠️ `onBreak` IS `promoSuppressed`, WHICH FAILS OPEN on a failed responsible-gambling read: it gates an OFFER, never a
 * refusal (`feature-state.ts` LAW 1), so after a failed read the pill can show during a break. Stated, not hidden.
 *
 * ⭐ PURE, AND THE ONLY PLACE THESE ARE DECIDED: the bar renders what this returns. `test:journey-shell` §3 holds the
 * table, and `red:journey-shell` plants a pill during a break, a pill on a held wallet, a pill on the deposit screen and
 * a capsule that hides at zero.
 */

export type JourneyCapsule = "none" | "balance" | "held";

export type JourneyHeaderInput = {
  isAuthed: boolean;
  /** The wallet balance, or null / undefined when it was not read. */
  balance: number | null | undefined;
  walletHeld: boolean;
  /** The reader is on a self-imposed break (`promoSuppressed`). */
  onBreak: boolean;
  pathname: string | null | undefined;
};

export type JourneyHeaderState = {
  capsule: JourneyCapsule;
  /** "+ Weka pesa". */
  pill: boolean;
  /** Ingia and Jisajili. */
  authPills: boolean;
};

export function journeyHeaderState(i: JourneyHeaderInput): JourneyHeaderState {
  const path = i.pathname ?? "";
  const read = i.balance !== null && i.balance !== undefined;
  const capsule: JourneyCapsule = !i.isAuthed || !read ? "none" : i.walletHeld ? "held" : "balance";
  const pill = i.isAuthed && !i.walletHeld && !i.onBreak && !path.startsWith("/wallet/deposit");
  return { capsule, pill, authPills: !i.isAuthed };
}
