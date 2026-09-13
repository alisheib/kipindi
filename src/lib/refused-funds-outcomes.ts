/**
 * S1 — THE CLOSED SET OF OUTCOMES FOR A REFUSED PLAYER'S BALANCE (owner ruling, Ali, 2026-09-13).
 *
 * ⭐ WHY A CLOSED SET. Ali ruled that "an officer decides each case, with a recorded reason" — no
 * fixed rule. Unbounded discretion is the weakest thing to hand a regulator, so the discretion is
 * shaped: the officer chooses WHICH of these four, freely, and never WHETHER it is recorded. Each
 * outcome writes its OWN audit action, so the report an inspector is handed can count them.
 *
 * ⛔ PURE AND IMPORT-FREE. The officer's decision form (a client component), the service
 * (`src/lib/server/refused-funds.ts`) and the report page all read this. Adding a fifth outcome here
 * without a money path in the service is a type error there, which is the point.
 */

export const REFUSED_FUNDS_OUTCOMES = ["RETURN_DEPOSITS", "RETURN_BALANCE", "HOLD_PENDING_APPEAL", "FORFEIT"] as const;
export type RefusedFundsOutcome = (typeof REFUSED_FUNDS_OUTCOMES)[number];

export function isRefusedFundsOutcome(x: unknown): x is RefusedFundsOutcome {
  return typeof x === "string" && (REFUSED_FUNDS_OUTCOMES as readonly string[]).includes(x);
}

/** One audit action per outcome — the report counts by these, so they are never shared. */
export const REFUSED_FUNDS_ACTION: Record<RefusedFundsOutcome, string> = {
  RETURN_DEPOSITS: "kyc.refused_funds.deposits_returned",
  RETURN_BALANCE: "kyc.refused_funds.balance_returned",
  HOLD_PENDING_APPEAL: "kyc.refused_funds.held_pending_appeal",
  FORFEIT: "kyc.refused_funds.forfeited",
};

/** Officer-facing names and what each one does, in the words the decision form shows. */
export const REFUSED_FUNDS_OUTCOME_COPY: Record<RefusedFundsOutcome, { label: string; does: string }> = {
  RETURN_DEPOSITS: {
    label: "Return the deposits",
    does: "Sends back what the player paid in (confirmed deposits less anything already paid out), up to the balance, to the registered number. Anything above that is forfeited.",
  },
  RETURN_BALANCE: {
    label: "Return the whole balance",
    does: "Sends the entire withdrawable balance to the registered number.",
  },
  HOLD_PENDING_APPEAL: {
    label: "Hold pending appeal",
    does: "Moves no money. The wallet stays frozen and the case stays open for a later decision.",
  },
  FORFEIT: {
    label: "Forfeit",
    does: "Moves the entire withdrawable balance to the house. Nothing is sent to the player.",
  },
};

/** Which outcomes send money to the player — they need the payout rail to be accepting requests. */
export const RETURNS_MONEY: ReadonlySet<RefusedFundsOutcome> = new Set(["RETURN_DEPOSITS", "RETURN_BALANCE"]);

/**
 * The typed justification every decision must carry. Twenty characters is a sentence, not a
 * keystroke — `/admin/aml`'s release rule ("a recorded justification is mandatory") is the precedent,
 * and this decision can send away or keep a player's whole balance.
 */
export const REFUSED_FUNDS_JUSTIFICATION_MIN = 20;
export const REFUSED_FUNDS_JUSTIFICATION_MAX = 1000;

/**
 * The mobile-money networks a return can be sent on — the payout rail's own list
 * (`WithdrawSchema.provider`). ⛔ The officer CHOOSES it: the live rail needs a per-network utility
 * code, so sending on the wrong network misroutes the payout, and there is no number-prefix table
 * in this codebase to infer it from. The form defaults to the network of the player's most recent
 * confirmed mobile-money deposit.
 */
export const RETURN_PROVIDERS = ["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX"] as const;
export type ReturnProvider = (typeof RETURN_PROVIDERS)[number];
export const RETURN_PROVIDER_LABEL: Record<ReturnProvider, string> = {
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  HALO_PESA: "HaloPesa",
  MIXX: "Mixx by Yas",
};
export function isReturnProvider(x: unknown): x is ReturnProvider {
  return typeof x === "string" && (RETURN_PROVIDERS as readonly string[]).includes(x);
}
