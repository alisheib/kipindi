/**
 * In-memory data store — dev-only.
 * INTERFACE matches the Prisma schema exactly so swapping to PrismaClient
 * is a one-line change per service.
 */

export type StoredUser = {
  id: string;
  phoneE164: string;
  role: "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT";
  status: "ACTIVE" | "PENDING_KYC" | "SUSPENDED" | "SELF_EXCLUDED" | "COOLED_OFF" | "CLOSED";
  locale: "EN" | "SW";
  displayName: string | null;
  dob: string | null;
  region: string | null;
  acceptedTermsVersion: string | null;
  acceptedTermsAt: string | null;
  marketingOptIn: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  closedAt: string | null;
};

export type StoredKyc = {
  id: string;
  userId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  rejectReason: string | null;
  rejectNote: string | null;
  nidaNumber: string | null;
  nidaVerifiedAt: string | null;
  fullName: string | null;
  dob: string | null;
  documents: { docType: string; storageKey: string; uploadedAt: string }[];
  reviewerId: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredOtp = {
  id: string;
  phoneE164: string;
  hashedCode: string;
  salt: string;
  purpose: "login" | "register" | "withdraw" | "reauth" | "self_exclusion";
  attempts: number;
  consumedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export type StoredWallet = {
  id: string;
  userId: string;
  balance: number;
  pending: number;
  hold: number;
  currency: "TZS";
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

export type StoredTxn = {
  id: string;
  walletId: string;
  userId: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BET_PLACED" | "BET_PAYOUT" | "BET_REFUND" | "BONUS_CREDIT" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT" | "CASHOUT" | "HOUSE_FEE";
  status: "PENDING" | "PROCESSING" | "AML_REVIEW" | "CONFIRMED" | "FAILED" | "REVERSED" | "CANCELLED";
  amount: number;
  fee: number;
  taxWithheld: number;
  balanceAfter: number | null;
  currency: "TZS";
  provider: "MPESA" | "TIGO_PESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX" | "TTCL_PESA" | "CARD" | "BANK_TRANSFER" | "INTERNAL" | null;
  providerRef: string | null;
  msisdn: string | null;
  description: string | null;
  betId: string | null;
  amlReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type StoredResponsibleGambling = {
  userId: string;
  dailyDepositLimit: number | null;
  weeklyDepositLimit: number | null;
  monthlyDepositLimit: number | null;
  dailyLossLimit: number | null;
  sessionTimeLimitMin: number | null;
  realityCheckIntervalMin: number;
  selfExclusionUntil: string | null;
  coolingOffUntil: string | null;
  pendingIncreaseTo: number | null;
  pendingIncreaseEffectiveAt: string | null;
};

export type StoredBet = {
  id: string;
  userId: string;
  matchId: string;
  matchLabel: string;          // "Simba vs Yanga" snapshot
  league: string;
  windowKind: "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT";
  windowLabel: string;
  outcome: "home" | "away" | "draw";
  outcomeLabel: string;        // "Simba win" snapshot
  stake: number;
  payRateAtPlacement: number;
  potentialReturn: number;
  status: "PENDING_CONFIRMATION" | "PLACED" | "WON" | "LOST" | "VOIDED" | "CASHED_OUT" | "PARTIALLY_SETTLED";
  returnAmount: number | null;
  placedAt: string;
  settledAt: string | null;
};

export type StoredMapigoRound = {
  id: string;
  number: number;
  status: "OPEN" | "SETTLED";
  result: "SPIKE" | "DRIFT" | "CALM" | null;
  pool: number;
  poolByCall: { SPIKE: number; DRIFT: number; CALM: number };
  payRate: { SPIKE: number; DRIFT: number; CALM: number };
  participants: number;
  startedAt: string;
  endedAt: string | null;
};

export type StoredMapigoBet = {
  id: string;
  userId: string;
  roundId: string;
  call: "SPIKE" | "DRIFT" | "CALM";
  stake: number;
  potentialReturn: number;
  status: "PLACED" | "WON" | "LOST";
  returnAmount: number | null;
  placedAt: string;
  settledAt: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __KIPINDI_STORE: {
    users: Map<string, StoredUser>;
    usersByPhone: Map<string, string>;
    kyc: Map<string, StoredKyc>;
    otps: Map<string, StoredOtp>;
    wallets: Map<string, StoredWallet>;
    walletsByUser: Map<string, string>;
    txns: Map<string, StoredTxn>;
    responsible: Map<string, StoredResponsibleGambling>;
    bets: Map<string, StoredBet>;
    mapigoRounds: Map<string, StoredMapigoRound>;
    mapigoBets: Map<string, StoredMapigoBet>;
  } | undefined;
}

const store = globalThis.__KIPINDI_STORE ?? (globalThis.__KIPINDI_STORE = {
  users: new Map(),
  usersByPhone: new Map(),
  kyc: new Map(),
  otps: new Map(),
  wallets: new Map(),
  walletsByUser: new Map(),
  txns: new Map(),
  responsible: new Map(),
  bets: new Map(),
  mapigoRounds: new Map(),
  mapigoBets: new Map(),
});

// Hot-reload safety: if a previous build created the global without the newer maps,
// add them now. Without this, server-action calls into bets/mapigo crash with
// "Cannot read properties of undefined" because the cached global is stale.
if (!store.bets)         store.bets = new Map();
if (!store.mapigoRounds) store.mapigoRounds = new Map();
if (!store.mapigoBets)   store.mapigoBets = new Map();

export const db = {
  // USER
  user: {
    findById: (id: string) => store.users.get(id) ?? null,
    findByPhone: (phone: string) => {
      const id = store.usersByPhone.get(phone);
      return id ? store.users.get(id) ?? null : null;
    },
    create: (u: StoredUser) => { store.users.set(u.id, u); store.usersByPhone.set(u.phoneE164, u.id); return u; },
    update: (id: string, patch: Partial<StoredUser>) => {
      const u = store.users.get(id);
      if (!u) return null;
      const next = { ...u, ...patch, updatedAt: new Date().toISOString() };
      store.users.set(id, next);
      return next;
    },
  },
  kyc: {
    findByUserId: (userId: string) => {
      for (const k of store.kyc.values()) if (k.userId === userId) return k;
      return null;
    },
    upsert: (k: StoredKyc) => { store.kyc.set(k.id, k); return k; },
    list: () => Array.from(store.kyc.values()),
  },
  otp: {
    create: (o: StoredOtp) => { store.otps.set(o.id, o); return o; },
    findActive: (phone: string, purpose: string) => {
      const now = Date.now();
      for (const o of Array.from(store.otps.values()).reverse()) {
        if (o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now) {
          return o;
        }
      }
      return null;
    },
    consume: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.consumedAt = new Date().toISOString();
      store.otps.set(id, o);
      return o;
    },
    incrementAttempts: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.attempts += 1;
      store.otps.set(id, o);
      return o;
    },
  },
  wallet: {
    findByUserId: (userId: string) => {
      const id = store.walletsByUser.get(userId);
      return id ? store.wallets.get(id) ?? null : null;
    },
    create: (w: StoredWallet) => { store.wallets.set(w.id, w); store.walletsByUser.set(w.userId, w.id); return w; },
    update: (id: string, patch: Partial<StoredWallet>) => {
      const w = store.wallets.get(id);
      if (!w) return null;
      const next = { ...w, ...patch, updatedAt: new Date().toISOString() };
      store.wallets.set(id, next);
      return next;
    },
  },
  txn: {
    create: (t: StoredTxn) => { store.txns.set(t.id, t); return t; },
    findByUser: (userId: string, limit = 50) => Array.from(store.txns.values()).filter((t) => t.userId === userId).slice(-limit).reverse(),
    update: (id: string, patch: Partial<StoredTxn>) => {
      const t = store.txns.get(id);
      if (!t) return null;
      const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
      store.txns.set(id, next);
      return next;
    },
    listByStatus: (status: StoredTxn["status"]) => Array.from(store.txns.values()).filter((t) => t.status === status),
  },
  responsible: {
    get: (userId: string) => store.responsible.get(userId) ?? null,
    upsert: (r: StoredResponsibleGambling) => { store.responsible.set(r.userId, r); return r; },
  },
  bet: {
    create: (b: StoredBet) => { store.bets.set(b.id, b); return b; },
    findById: (id: string) => store.bets.get(id) ?? null,
    findByUser: (userId: string, limit = 100) => Array.from(store.bets.values()).filter((b) => b.userId === userId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, limit),
    findByMatchAndWindow: (matchId: string, windowKind: StoredBet["windowKind"]) =>
      Array.from(store.bets.values()).filter((b) => b.matchId === matchId && b.windowKind === windowKind && b.status === "PLACED"),
    update: (id: string, patch: Partial<StoredBet>) => {
      const b = store.bets.get(id);
      if (!b) return null;
      const next = { ...b, ...patch };
      store.bets.set(id, next);
      return next;
    },
  },
  mapigoRound: {
    create: (r: StoredMapigoRound) => { store.mapigoRounds.set(r.id, r); return r; },
    findById: (id: string) => store.mapigoRounds.get(id) ?? null,
    listOpen: () => Array.from(store.mapigoRounds.values()).filter((r) => r.status === "OPEN"),
    list: (limit = 20) => Array.from(store.mapigoRounds.values()).sort((a, b) => b.number - a.number).slice(0, limit),
    update: (id: string, patch: Partial<StoredMapigoRound>) => {
      const r = store.mapigoRounds.get(id);
      if (!r) return null;
      const next = { ...r, ...patch };
      store.mapigoRounds.set(id, next);
      return next;
    },
  },
  mapigoBet: {
    create: (b: StoredMapigoBet) => { store.mapigoBets.set(b.id, b); return b; },
    findByUser: (userId: string, limit = 50) => Array.from(store.mapigoBets.values()).filter((b) => b.userId === userId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, limit),
    findByRound: (roundId: string) => Array.from(store.mapigoBets.values()).filter((b) => b.roundId === roundId),
    update: (id: string, patch: Partial<StoredMapigoBet>) => {
      const b = store.mapigoBets.get(id);
      if (!b) return null;
      const next = { ...b, ...patch };
      store.mapigoBets.set(id, next);
      return next;
    },
  },
};
