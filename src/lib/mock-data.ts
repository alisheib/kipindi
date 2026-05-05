/**
 * Minimal stubs for guest-mode UI. Real product data flows through the
 * pari-mutuel market engine at `src/lib/server/market-service.ts`.
 */

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  description?: string | null;
};

export type WalletState = {
  balance: number;
  pending: number;
  hold: number;
  currency: string;
};

export const wallet: WalletState = {
  balance: 0,
  pending: 0,
  hold: 0,
  currency: "TZS",
};

export const transactions: Transaction[] = [];

export const user = {
  id: "guest",
  name: "Guest",
  initials: "GU",
  phone: "+255 XXX XXX XXX",
};

export type TickerEvent = {
  id: string;
  kind: "PREDICT" | "RESOLVE" | "DEPOSIT" | "WITHDRAW";
  text: string;
  textSw?: string;
  amount?: number;
  at: string;
};

export const tickerEvents: TickerEvent[] = [
  { id: "tk-1", kind: "PREDICT", text: "Someone predicted YES on TZS/USD", textSw: "Mtu fulani ametabiri YES kwenye TZS/USD", amount: 25_000, at: new Date(Date.now() - 30_000).toISOString() },
  { id: "tk-2", kind: "RESOLVE", text: "Bitcoin > $80k resolved YES", textSw: "Bitcoin > $80k imetatuliwa YES", amount: 1_240_000, at: new Date(Date.now() - 90_000).toISOString() },
  { id: "tk-3", kind: "PREDICT", text: "Someone predicted NO on Long Rains", textSw: "Mtu fulani ametabiri NO kwenye Masika", amount: 50_000, at: new Date(Date.now() - 180_000).toISOString() },
];

// Sports legacy stubs — still imported by some pages. Empty arrays so they render empty states.
export const matches: unknown[] = [];
