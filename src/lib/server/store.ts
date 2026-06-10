/**
 * In-memory data store + Prisma DAL switch.
 *
 * When USE_PRISMA_DAL=true and DATABASE_URL is set, `db` routes to the
 * Prisma-backed DAL (prisma-dal.ts). Otherwise it uses the in-memory Maps.
 * All call sites must have `await` (Phase 3) before flipping the flag.
 */
import { prismaDb } from "./prisma-dal";
import { hasDatabase } from "./prisma";

export type StoredUser = {
  id: string;
  phoneE164: string;
  /** scrypt(password, passwordSalt) hex. Optional only because legacy
   *  rows created during the OTP-only era have neither — those accounts
   *  must set a password on next login. */
  passwordHash: string | null;
  passwordSalt: string | null;
  /** Brute-force defence: counts consecutive wrong-password attempts.
   *  Resets to 0 on any successful login. */
  failedLoginCount: number;
  /** ISO-8601 timestamp until which the account refuses logins. Set when
   *  failedLoginCount crosses the threshold. */
  lockedUntil: string | null;
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
  /** Optional user-uploaded avatar image as a data URL (base64 jpeg/png).
   *  Capped at ~96KB after client-side resize to 256x256. Null means use
   *  the deterministic OKLCH gradient + initials. */
  avatarDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  closedAt: string | null;
  /** Affiliate program: the userId of the affiliate who recruited this
   *  account (resolved from a referral code at registration). Null for
   *  organic sign-ups. Optional so snapshots created before the affiliate
   *  feature shipped restore cleanly (treated as null). */
  recruitedBy?: string | null;
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

export type StoredNotification = {
  id: string;
  userId: string;
  kind:
    | "WIN"
    | "LOSS"
    | "BET_PLACED"
    | "ROUND_RESULT"
    | "DEPOSIT"
    | "WITHDRAW"
    | "KYC"
    | "MATCH_START"
    | "RG"
    | "SECURITY"
    | "AFFILIATE"
    | "PROPOSAL";
  titleEn: string;
  titleSw: string;
  bodyEn: string;
  bodySw: string;
  href: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
};

export type StoredSourceOfFunds = {
  userId: string;
  declaredSource: "salary" | "business" | "savings" | "investments" | "inheritance" | "other";
  declaredOccupation: string;
  declaredEmployer: string | null;
  declaredAnnualIncomeBand: "under-12m" | "12m-50m" | "50m-200m" | "over-200m";
  declaredOther: string | null;
  reviewStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewerId: string | null;
  reviewedAt: string | null;
  submittedAt: string;
};

/**
 * Affiliate account — every player automatically gets one the first time
 * their referral surface is touched (visiting /profile/invite, or someone
 * registering with their code). Keyed by userId. `code` is the public,
 * shareable referral code embedded in their link. Running totals are
 * denormalised counters kept in sync by the affiliate service so the
 * Invite & Earn page and the admin leaderboard read in O(1).
 */
export type StoredAffiliateAccount = {
  userId: string;
  code: string;
  recruitCount: number;
  totalEarnedTzs: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Referral reward ledger entry — the immutable record of every payout the
 * affiliate program makes. `COMMISSION` accrues from a recruit's betting
 * activity, `BONUS` from sign-up / first-deposit, `PRIZE` from a milestone.
 * status: PAID (credited to wallet) · PENDING (awaiting trigger) ·
 * HELD (withheld pending anti-fraud review).
 */
export type StoredReferralReward = {
  id: string;
  referrerUserId: string;
  recruitUserId: string;
  type: "COMMISSION" | "BONUS" | "PRIZE";
  /** Human label e.g. "Commission", "Prize · first bet", "Bonus · sign-up". */
  label: string;
  amountTzs: number;
  status: "PAID" | "PENDING" | "HELD";
  /** Recipient of this reward — almost always the referrer, but the bonus
   *  mode can also pay the NEW player; we record who actually received it. */
  recipientUserId: string;
  note: string | null;
  createdAt: string;
};

/**
 * Player market proposal (Feature 2). A player proposes a market; the
 * community up/down-votes (ranking only); an officer approves → it becomes a
 * live Market; the proposer earns a fixed prize when it's both LISTED and
 * RESOLVED. Vote tallies are denormalised onto up/down and kept in sync by
 * the proposals service; individual votes live in `proposalVotes`.
 */
export type ProposalStatus = "REVIEW" | "CHANGES_REQUESTED" | "LISTED" | "RESOLVED" | "DECLINED";
export type ProposalCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure";

export type StoredProposal = {
  id: string;
  proposerId: string;
  titleEn: string;
  titleSw: string | null;
  description: string | null;
  resolutionCriterion: string;
  category: ProposalCategory;
  resolutionDate: string;            // ISO date (YYYY-MM-DD)
  status: ProposalStatus;
  up: number;
  down: number;
  publishedMarketId: string | null;  // set when an officer approves & lists
  prizePaidTzs: number;              // 0 until listed + resolved + paid
  declineReason: string | null;
  declineNote: string | null;
  changeNote: string | null;         // officer "request changes" note
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoredProposalVote = {
  id: string;                        // `${proposalId}:${userId}`
  proposalId: string;
  userId: string;
  dir: "up" | "down";
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_STORE: {
    users: Map<string, StoredUser>;
    usersByPhone: Map<string, string>;
    kyc: Map<string, StoredKyc>;
    otps: Map<string, StoredOtp>;
    wallets: Map<string, StoredWallet>;
    walletsByUser: Map<string, string>;
    txns: Map<string, StoredTxn>;
    responsible: Map<string, StoredResponsibleGambling>;
    bets: Map<string, StoredBet>;
    notifications: Map<string, StoredNotification>;
    sourceOfFunds: Map<string, StoredSourceOfFunds>;
    affiliates: Map<string, StoredAffiliateAccount>;
    referralRewards: Map<string, StoredReferralReward>;
    proposals: Map<string, StoredProposal>;
    proposalVotes: Map<string, StoredProposalVote>;
  } | undefined;
}

const store = globalThis.__50PICK_STORE ?? (globalThis.__50PICK_STORE = {
  users: new Map(),
  usersByPhone: new Map(),
  kyc: new Map(),
  otps: new Map(),
  wallets: new Map(),
  walletsByUser: new Map(),
  txns: new Map(),
  responsible: new Map(),
  bets: new Map(),
  notifications: new Map(),
  sourceOfFunds: new Map(),
  affiliates: new Map(),
  referralRewards: new Map(),
  proposals: new Map(),
  proposalVotes: new Map(),
});

// Hot-reload safety: if a previous build created the global without the newer maps,
// add them now. Without this, server-action calls into bets crash with
// "Cannot read properties of undefined" because the cached global is stale.
if (!store.usersByPhone)  store.usersByPhone = new Map();
if (!store.walletsByUser) store.walletsByUser = new Map();
if (!store.bets)          store.bets = new Map();
if (!store.notifications) store.notifications = new Map();
if (!store.sourceOfFunds) store.sourceOfFunds = new Map();
if (!store.affiliates)      store.affiliates = new Map();
if (!store.referralRewards) store.referralRewards = new Map();
if (!store.proposals)       store.proposals = new Map();
if (!store.proposalVotes)   store.proposalVotes = new Map();

// Lazy import of the backup module — keeps store.ts clean of file-system imports
// for clients that bundle this file (none currently, but future-proof).
function tap() {
  // Called after every mutation. Schedules a debounced disk snapshot.
  // Errors are swallowed so a failed backup never breaks a request.
  import("./backup").then((m) => m.scheduleBackup()).catch(() => {});
}

/** Immediate flush — for money-handling mutations (wallet, transaction).
 *  Bypasses debounce so the Postgres snapshot reflects the new balance
 *  within milliseconds. If this process crashes right after a wallet
 *  debit, the snapshot in Postgres already includes it — worst-case
 *  data loss drops from 500ms to near-zero for financial operations. */
function tapCritical() {
  import("./backup").then((m) => m.flushNow()).catch(() => {});
}

// On first import in this process, restore from the latest snapshot.
// Source order: Postgres (if DATABASE_URL set) → on-disk file → fresh.
// Idempotent — restoreLatestAsync self-guards via __50PICK_BACKUP_RESTORED.
if (typeof window === "undefined" && !globalThis.__50PICK_BACKUP_RESTORED) {
  import("./backup").then((m) => m.restoreLatestAsync()).catch(() => {});
}

const memoryDb = {
  // USER
  user: {
    findById: (id: string): StoredUser | null => store.users.get(id) ?? null,
    findByPhone: (phone: string): StoredUser | null => {
      const id = store.usersByPhone.get(phone);
      return id ? store.users.get(id) ?? null : null;
    },
    create: (u: StoredUser) => { store.users.set(u.id, u); store.usersByPhone.set(u.phoneE164, u.id); tap(); return u; },
    update: (id: string, patch: Partial<StoredUser>) => {
      const u = store.users.get(id);
      if (!u) return null;
      const next = { ...u, ...patch, updatedAt: new Date().toISOString() };
      store.users.set(id, next);
      tap();
      return next;
    },
    list: (): StoredUser[] => Array.from(store.users.values()),
  },
  kyc: {
    findByUserId: (userId: string) => {
      for (const k of store.kyc.values()) if (k.userId === userId) return k;
      return null;
    },
    upsert: (k: StoredKyc) => { store.kyc.set(k.id, k); tap(); return k; },
    list: () => Array.from(store.kyc.values()),
  },
  otp: {
    create: (o: StoredOtp) => { store.otps.set(o.id, o); tap(); return o; },
    findActive: (phone: string, purpose: string) => {
      const now = Date.now();
      for (const o of Array.from(store.otps.values()).reverse()) {
        if (o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now) {
          return o;
        }
      }
      return null;
    },
    /** Return ALL active (unconsumed, unexpired) OTPs for a phone+purpose,
     *  ordered most-recent-first. Used by verifyOtpAndAuth to accept any
     *  valid OTP regardless of delivery order. */
    findAllActive: (phone: string, purpose: string): StoredOtp[] => {
      const now = Date.now();
      return Array.from(store.otps.values())
        .filter((o) => o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    consume: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.consumedAt = new Date().toISOString();
      store.otps.set(id, o);
      tap();
      return o;
    },
    incrementAttempts: (id: string) => {
      const o = store.otps.get(id);
      if (!o) return null;
      o.attempts += 1;
      store.otps.set(id, o);
      tap();
      return o;
    },
  },
  wallet: {
    findByUserId: (userId: string): StoredWallet | null => {
      const id = store.walletsByUser.get(userId);
      return id ? store.wallets.get(id) ?? null : null;
    },
    /** All wallets — analytics only (wallet liability total). */
    listAll: (): StoredWallet[] => Array.from(store.wallets.values()),
    create: (w: StoredWallet) => { store.wallets.set(w.id, w); store.walletsByUser.set(w.userId, w.id); tapCritical(); return w; },
    update: (id: string, patch: Partial<StoredWallet>) => {
      const w = store.wallets.get(id);
      if (!w) return null;
      const next = { ...w, ...patch, updatedAt: new Date().toISOString() };
      store.wallets.set(id, next);
      tapCritical();
      return next;
    },
  },
  txn: {
    create: (t: StoredTxn) => { store.txns.set(t.id, t); tapCritical(); return t; },
    findByUser: (userId: string, limit = 50) => Array.from(store.txns.values()).filter((t) => t.userId === userId).slice(-limit).reverse(),
    update: (id: string, patch: Partial<StoredTxn>) => {
      const t = store.txns.get(id);
      if (!t) return null;
      const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
      store.txns.set(id, next);
      tapCritical();
      return next;
    },
    listByStatus: (status: StoredTxn["status"]) => Array.from(store.txns.values()).filter((t) => t.status === status),
    /** All transactions — analytics only. Avoids the user-by-user N+1 walk. */
    listAll: (): StoredTxn[] => Array.from(store.txns.values()),
  },
  responsible: {
    get: (userId: string) => store.responsible.get(userId) ?? null,
    upsert: (r: StoredResponsibleGambling) => { store.responsible.set(r.userId, r); tap(); return r; },
  },
  bet: {
    create: (b: StoredBet) => { store.bets.set(b.id, b); tap(); return b; },
    findById: (id: string) => store.bets.get(id) ?? null,
    findByUser: (userId: string, limit = 100) => Array.from(store.bets.values()).filter((b) => b.userId === userId).sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, limit),
    findByMatchAndWindow: (matchId: string, windowKind: StoredBet["windowKind"]) =>
      Array.from(store.bets.values()).filter((b) => b.matchId === matchId && b.windowKind === windowKind && b.status === "PLACED"),
    update: (id: string, patch: Partial<StoredBet>) => {
      const b = store.bets.get(id);
      if (!b) return null;
      const next = { ...b, ...patch };
      store.bets.set(id, next);
      tap();
      return next;
    },
  },
  notification: {
    create: (n: StoredNotification) => { store.notifications.set(n.id, n); tap(); return n; },
    findByUser: (userId: string, limit = 50) =>
      Array.from(store.notifications.values())
        .filter((n) => n.userId === userId && !n.dismissedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    countUnread: (userId: string) =>
      Array.from(store.notifications.values()).filter((n) => n.userId === userId && !n.readAt && !n.dismissedAt).length,
    markRead: (id: string) => {
      const n = store.notifications.get(id);
      if (!n) return null;
      const next = { ...n, readAt: n.readAt ?? new Date().toISOString() };
      store.notifications.set(id, next);
      tap();
      return next;
    },
    markAllRead: (userId: string) => {
      const now = new Date().toISOString();
      let count = 0;
      for (const n of store.notifications.values()) {
        if (n.userId === userId && !n.readAt && !n.dismissedAt) {
          store.notifications.set(n.id, { ...n, readAt: now });
          count++;
        }
      }
      if (count > 0) tap();
      return count;
    },
    dismiss: (id: string) => {
      const n = store.notifications.get(id);
      if (!n) return null;
      const next = { ...n, dismissedAt: new Date().toISOString() };
      store.notifications.set(id, next);
      tap();
      return next;
    },
  },
  sourceOfFunds: {
    get: (userId: string) => store.sourceOfFunds.get(userId) ?? null,
    upsert: (s: StoredSourceOfFunds) => { store.sourceOfFunds.set(s.userId, s); tap(); return s; },
    listPending: () => Array.from(store.sourceOfFunds.values()).filter((s) => s.reviewStatus === "PENDING"),
  },
  affiliate: {
    findByUserId: (userId: string): StoredAffiliateAccount | null => store.affiliates.get(userId) ?? null,
    findByCode: (code: string): StoredAffiliateAccount | null => {
      const norm = code.trim().toUpperCase();
      for (const a of store.affiliates.values()) if (a.code === norm) return a;
      return null;
    },
    create: (a: StoredAffiliateAccount): StoredAffiliateAccount => { store.affiliates.set(a.userId, a); tap(); return a; },
    update: (userId: string, patch: Partial<StoredAffiliateAccount>): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, ...patch, updatedAt: new Date().toISOString() };
      store.affiliates.set(userId, next);
      tap();
      return next;
    },
    list: (): StoredAffiliateAccount[] => Array.from(store.affiliates.values()),
  },
  referralReward: {
    create: (r: StoredReferralReward): StoredReferralReward => { store.referralRewards.set(r.id, r); tap(); return r; },
    update: (id: string, patch: Partial<StoredReferralReward>): StoredReferralReward | null => {
      const r = store.referralRewards.get(id);
      if (!r) return null;
      const next: StoredReferralReward = { ...r, ...patch };
      store.referralRewards.set(id, next);
      tap();
      return next;
    },
    list: (limit = 500): StoredReferralReward[] =>
      Array.from(store.referralRewards.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    listByReferrer: (referrerUserId: string): StoredReferralReward[] =>
      Array.from(store.referralRewards.values())
        .filter((r) => r.referrerUserId === referrerUserId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    listByRecruit: (recruitUserId: string): StoredReferralReward[] =>
      Array.from(store.referralRewards.values()).filter((r) => r.recruitUserId === recruitUserId),
  },
  proposal: {
    create: (p: StoredProposal): StoredProposal => { store.proposals.set(p.id, p); tap(); return p; },
    findById: (id: string): StoredProposal | null => store.proposals.get(id) ?? null,
    findByMarketId: (marketId: string): StoredProposal | null => {
      for (const p of store.proposals.values() as Iterable<StoredProposal>) if (p.publishedMarketId === marketId) return p;
      return null;
    },
    update: (id: string, patch: Partial<StoredProposal>): StoredProposal | null => {
      const p = store.proposals.get(id);
      if (!p) return null;
      const next: StoredProposal = { ...p, ...patch, updatedAt: new Date().toISOString() };
      store.proposals.set(id, next);
      tap();
      return next;
    },
    list: (limit = 1000): StoredProposal[] =>
      (Array.from(store.proposals.values()) as StoredProposal[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    listByProposer: (proposerId: string): StoredProposal[] =>
      (Array.from(store.proposals.values()) as StoredProposal[])
        .filter((p) => p.proposerId === proposerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  },
  proposalVote: {
    get: (proposalId: string, userId: string): StoredProposalVote | null =>
      store.proposalVotes.get(`${proposalId}:${userId}`) ?? null,
    set: (v: StoredProposalVote): StoredProposalVote => { store.proposalVotes.set(v.id, v); tap(); return v; },
    delete: (proposalId: string, userId: string): void => { store.proposalVotes.delete(`${proposalId}:${userId}`); tap(); },
    listByProposal: (proposalId: string): StoredProposalVote[] =>
      (Array.from(store.proposalVotes.values()) as StoredProposalVote[]).filter((v) => v.proposalId === proposalId),
  },
};

// Phase 2: Prisma DAL switch.
// Set USE_PRISMA_DAL=true on Railway AFTER Phase 3 (await) + Phase 6 (data migration).
const usePrisma = process.env.USE_PRISMA_DAL === "true" && hasDatabase();
export const db: typeof memoryDb = usePrisma
  ? (prismaDb as unknown as typeof memoryDb)
  : memoryDb;
