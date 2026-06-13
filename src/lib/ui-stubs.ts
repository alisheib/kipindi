/**
 * UI-layer stubs: a shared lightweight type and the logged-out placeholder
 * defaults the shell renders before a session exists. Real product data flows
 * through the pari-mutuel market engine at `src/lib/server/market-service.ts`
 * and the wallet/Prisma layer — nothing here is shown to an authenticated user.
 */

/** Wallet transaction row shape used by the wallet UI. */
export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  description?: string | null;
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
