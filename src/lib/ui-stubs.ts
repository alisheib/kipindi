/**
 * UI-layer stubs: a shared lightweight type and the logged-out placeholder
 * defaults the shell renders before a session exists. Real product data flows
 * through the pari-mutuel market engine at `src/lib/server/market-service.ts`
 * and the wallet/Prisma layer — nothing here is shown to an authenticated user.
 */

/** Wallet transaction row shape used by the wallet UI. */
/** The player-facing transaction states.
 *
 *  These map 1:1 onto `StoredTxn["status"]` (see `adaptTxn` in wallet/page.tsx)
 *  — deliberately, because the previous mapping collapsed PENDING+PROCESSING
 *  into one "pending" and REVERSED+CANCELLED+FAILED into one "failed". A player
 *  whose deposit was REVERSED for self-exclusion was shown the same word as one
 *  whose card was declined, which is not the same event and does not have the
 *  same remedy. Every state the money can be in gets its own honest label. */
export type TxnStatus =
  | "pending"      // accepted by us, not yet sent to the gateway
  | "processing"   // in flight at the gateway — money may still land
  | "review"       // held for AML/compliance review
  | "confirmed"    // settled
  | "failed"       // did not complete; no money moved
  | "reversed"     // completed at the gateway but returned (e.g. RG lockout)
  | "cancelled";   // withdrawn before it went anywhere

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: TxnStatus;
  createdAt: string;
  description?: string | null;
  /** Position reference for wager-related transactions — the ticket number. */
  positionId?: string | null;
  /** The GATEWAY's reference (Selcom `dep_…`). This is what the player's bank
   *  and Selcom's support desk key off, so it belongs anywhere we show our own
   *  id. Null on internal movements that never touched a gateway. */
  providerRef?: string | null;
};

/** Logged-out shell identity (isAuthed:false) — never an authenticated user. */
export const guestUser = {
  id: "guest",
  name: "Guest",
  initials: "GU",
  phone: "",
};

/**
 * Live-match feed placeholder. Stays empty until the Sportradar integrity feed
 * is signed (pre-launch blocker); the admin live page renders its empty state.
 */
export const matches: unknown[] = [];
