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
  email?: string | null;
  /** ISO-8601 timestamp the user confirmed ownership of `email` via a signed
   *  verification link. Null = email present but unconfirmed (or no email).
   *  Cleared whenever the address changes so a new address must be re-confirmed. */
  emailVerifiedAt?: string | null;
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
  locale: "EN" | "SW" | "ZH";
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

export type KycExtraRequest = { id: string; description: string; requestedAt: string; storageKey: string | null; uploadedAt: string | null };

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
  /** Extra documents an officer asked for during review (each with a written
   *  description the player and reviewer both see). Empty in the normal case;
   *  populated by a REQUEST_INFO decision. `storageKey` is null until the
   *  player uploads the requested file. */
  extraRequests?: KycExtraRequest[];
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
  /** Non-withdrawable promotional funds. Optional so snapshots/rows created
   *  before the bonus wallet shipped restore cleanly (treated as 0). Invariant:
   *  bonusBalance == Σ remainingTzs over the wallet's ACTIVE BonusGrants. */
  bonusBalance?: number;
  currency: "TZS";
  status: "ACTIVE" | "FROZEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

export type BonusSource = "ADMIN" | "REFERRAL" | "PROPOSAL" | "INVITE" | "PROMOTION" | "CASHBACK";
export type BonusGrantStatus = "ACTIVE" | "QUEUED" | "FULFILLED" | "EXPIRED" | "CANCELLED" | "FORFEITED";

/**
 * One promotional bonus credit. Lives in Wallet.bonusBalance and is not
 * withdrawable until `wageredTzs` >= `wagerRequiredTzs` (turnover target =
 * amountTzs × wagerMultiplier), at which point bonus-service converts
 * `remainingTzs` to real balance and marks the grant FULFILLED. All money fields
 * are whole TZS integers.
 */
export type StoredBonusGrant = {
  id: string;
  userId: string;
  walletId: string;
  amountTzs: number;
  remainingTzs: number;
  wagerMultiplier: number;
  wagerRequiredTzs: number;
  wageredTzs: number;
  source: BonusSource;
  sourceRef: string | null;
  status: BonusGrantStatus;
  expiresAt: string | null;
  fulfilledAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "CANCELLED";
export type ContactType = "EMAIL" | "PHONE";
export type InviteEntryStatus = "QUEUED" | "SENT" | "DELIVERED" | "REGISTERED" | "FAILED" | "BOUNCED";

/** A bulk invite campaign — branded SMS/email invites that grant the invitee a
 *  bonus when they register with the campaign's `code`. */
export type StoredInviteCampaign = {
  id: string;
  code: string;
  name: string;
  bonusAmountTzs: number;
  wagerMultiplier: number;
  expiresInDays: number;
  messageEn: string;
  messageSw: string;
  status: CampaignStatus;
  totalInvites: number;
  totalRegistered: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredInviteEntry = {
  id: string;
  campaignId: string;
  contactType: ContactType;
  contactValue: string;
  bonusAmountTzs: number;
  status: InviteEntryStatus;
  sentAt: string | null;
  registeredUserId: string | null;
  bonusGrantId: string | null;
  failureReason: string | null;
  createdAt: string;
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
  positionId: string | null;
  amlReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Client-generated UUID — prevents double-submit on 2G. Null for internal txns. */
  idempotencyKey?: string | null;
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
  pendingWeeklyIncreaseTo: number | null;
  pendingWeeklyIncreaseEffectiveAt: string | null;
  pendingMonthlyIncreaseTo: number | null;
  pendingMonthlyIncreaseEffectiveAt: string | null;
};

export type StoredNotification = {
  id: string;
  userId: string;
  kind:
    | "WIN"
    | "LOSS"
    | "BET_PLACED"
    | "SELECTION_CLOSED"
    | "ROUND_RESULT"
    | "DEPOSIT"
    | "WITHDRAW"
    | "KYC"
    | "MATCH_START"
    | "RG"
    | "SECURITY"
    | "AFFILIATE"
    | "PROPOSAL"
    | "BONUS";
  titleEn: string;
  titleSw: string;
  titleZh?: string | null;
  bodyEn: string;
  bodySw: string;
  bodyZh?: string | null;
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
export type ProposalStatus = "REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "LISTED" | "RESOLVED" | "DECLINED";
export type ProposalCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure";

export type StoredProposal = {
  id: string;
  proposerId: string;
  titleEn: string;
  titleSw: string | null;
  titleZh: string | null;
  description: string | null;
  resolutionCriterion: string;
  category: ProposalCategory;
  resolutionDate: string;            // ISO date (YYYY-MM-DD)
  sourceUrl: string | null;          // player-supplied trusted source (required at app layer)
  status: ProposalStatus;
  up: number;
  down: number;
  publishedMarketId: string | null;  // set when an officer publishes it live (go-live)
  bonusGrantedTzs: number;           // bonus (TZS) granted to the proposer at APPROVAL (0 until approved)
  bonusGrantId: string | null;       // the BonusGrant credited at approval (idempotency/audit)
  approvedAt: string | null;         // when the officer approved (bonus granted)
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
    notifications: Map<string, StoredNotification>;
    sourceOfFunds: Map<string, StoredSourceOfFunds>;
    affiliates: Map<string, StoredAffiliateAccount>;
    referralRewards: Map<string, StoredReferralReward>;
    proposals: Map<string, StoredProposal>;
    proposalVotes: Map<string, StoredProposalVote>;
    bonusGrants: Map<string, StoredBonusGrant>;
    inviteCampaigns: Map<string, StoredInviteCampaign>;
    inviteEntries: Map<string, StoredInviteEntry>;
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
  notifications: new Map(),
  sourceOfFunds: new Map(),
  affiliates: new Map(),
  referralRewards: new Map(),
  proposals: new Map(),
  proposalVotes: new Map(),
  bonusGrants: new Map(),
  inviteCampaigns: new Map(),
  inviteEntries: new Map(),
});

// Hot-reload safety: if a previous build created the global without the newer maps,
// add them now. Without this, server-action calls into bets crash with
// "Cannot read properties of undefined" because the cached global is stale.
if (!store.usersByPhone)  store.usersByPhone = new Map();
if (!store.walletsByUser) store.walletsByUser = new Map();
if (!store.notifications) store.notifications = new Map();
if (!store.sourceOfFunds) store.sourceOfFunds = new Map();
if (!store.affiliates)      store.affiliates = new Map();
if (!store.referralRewards) store.referralRewards = new Map();
if (!store.proposals)       store.proposals = new Map();
if (!store.proposalVotes)   store.proposalVotes = new Map();
if (!store.bonusGrants)     store.bonusGrants = new Map();
if (!store.inviteCampaigns) store.inviteCampaigns = new Map();
if (!store.inviteEntries)   store.inviteEntries = new Map();

const memoryDb = {
  // USER
  user: {
    findById: (id: string): StoredUser | null => store.users.get(id) ?? null,
    findByPhone: (phone: string): StoredUser | null => {
      const id = store.usersByPhone.get(phone);
      return id ? store.users.get(id) ?? null : null;
    },
    create: (u: StoredUser) => { store.users.set(u.id, u); store.usersByPhone.set(u.phoneE164, u.id); return u; },
    /** Find a user by email (case-insensitive). Used to enforce one-email-per-account. */
    findByEmail: (email: string): StoredUser | null => {
      const norm = email.trim().toLowerCase();
      if (!norm) return null;
      for (const u of store.users.values()) if ((u.email ?? "").trim().toLowerCase() === norm) return u;
      return null;
    },
    update: (id: string, patch: Partial<StoredUser>) => {
      const u = store.users.get(id);
      if (!u) return null;
      const next = { ...u, ...patch, updatedAt: new Date().toISOString() };
      store.users.set(id, next);
      return next;
    },
    list: (): StoredUser[] => Array.from(store.users.values()),
  },
  kyc: {
    findByUserId: (userId: string) => {
      // Return the NEWEST submission for this user (matches the Prisma DAL's
      // orderBy createdAt desc) so a resubmission reads the latest record, not
      // a stale one — important for KYC review/compliance.
      let latest: StoredKyc | null = null;
      for (const k of store.kyc.values()) {
        if (k.userId !== userId) continue;
        if (!latest || k.createdAt > latest.createdAt) latest = k;
      }
      return latest;
    },
    upsert: (k: StoredKyc) => { store.kyc.set(k.id, k); return k; },
    /** Find any KYC submission carrying this NIDA number. Used to enforce
     *  one-NIDA-per-account (multi-accounting / identity-reuse defence). */
    findByNida: (nidaNumber: string): StoredKyc | null => {
      const norm = nidaNumber.trim();
      if (!norm) return null;
      for (const k of store.kyc.values()) if ((k.nidaNumber ?? "").trim() === norm) return k;
      return null;
    },
    list: () => Array.from(store.kyc.values()),
  },
  otp: {
    create: (o: StoredOtp) => { store.otps.set(o.id, o); return o; },
    findActive: (phone: string, purpose: string) => {
      // Most-recent active OTP (createdAt desc) — matches the Prisma DAL ordering
      // so the same code is selected in tests and prod under clock skew.
      const now = Date.now();
      return Array.from(store.otps.values())
        .filter((o) => o.phoneE164 === phone && o.purpose === purpose && !o.consumedAt && new Date(o.expiresAt).getTime() > now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
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
    findByUserId: (userId: string): StoredWallet | null => {
      const id = store.walletsByUser.get(userId);
      return id ? store.wallets.get(id) ?? null : null;
    },
    /** All wallets — analytics only (wallet liability total). */
    listAll: (): StoredWallet[] => Array.from(store.wallets.values()),
    create: (w: StoredWallet) => { store.wallets.set(w.id, w); store.walletsByUser.set(w.userId, w.id); return w; },
    update: (id: string, patch: Partial<StoredWallet>) => {
      const w = store.wallets.get(id);
      if (!w) return null;
      const next = { ...w, ...patch, updatedAt: new Date().toISOString() };
      store.wallets.set(id, next);
      return next;
    },
    /**
     * Atomically apply balance/hold/pending DELTAS, optionally guarded by a
     * minimum (for overdraw-safe debits). Returns the updated wallet, or null
     * if the wallet is missing OR a guard failed (e.g. insufficient balance).
     *
     * This is the money-safe mutation: the Prisma implementation maps to a
     * single conditional `updateMany` (DB-atomic `increment`/`decrement` with a
     * `WHERE balance >= n` guard), so concurrent debits/credits on the same
     * wallet can never lose an update or overdraw — correct even across multiple
     * server instances, where the in-process lock alone would not be.
     */
    adjust: (
      id: string,
      deltas: { balance?: number; hold?: number; pending?: number; bonusBalance?: number },
      opts?: { requireBalanceGte?: number; requireHoldGte?: number; requireBonusBalanceGte?: number },
    ): StoredWallet | null => {
      const w = store.wallets.get(id);
      if (!w) return null;
      if (opts?.requireBalanceGte !== undefined && w.balance < opts.requireBalanceGte) return null;
      if (opts?.requireHoldGte !== undefined && w.hold < opts.requireHoldGte) return null;
      if (opts?.requireBonusBalanceGte !== undefined && (w.bonusBalance ?? 0) < opts.requireBonusBalanceGte) return null;
      const next: StoredWallet = {
        ...w,
        balance: w.balance + (deltas.balance ?? 0),
        hold: w.hold + (deltas.hold ?? 0),
        pending: w.pending + (deltas.pending ?? 0),
        bonusBalance: (w.bonusBalance ?? 0) + (deltas.bonusBalance ?? 0),
        updatedAt: new Date().toISOString(),
      };
      store.wallets.set(id, next);
      return next;
    },
  },
  txn: {
    create: (t: StoredTxn) => { store.txns.set(t.id, t); return t; },
    findByUser: (userId: string, limit = 50) => Array.from(store.txns.values()).filter((t) => t.userId === userId).slice(-limit).reverse(),
    findById: (id: string) => store.txns.get(id) ?? null,
    findByProviderRef: (providerRef: string) => Array.from(store.txns.values()).find((t) => t.providerRef === providerRef) ?? null,
    update: (id: string, patch: Partial<StoredTxn>) => {
      const t = store.txns.get(id);
      if (!t) return null;
      const next = { ...t, ...patch, updatedAt: new Date().toISOString() };
      store.txns.set(id, next);
      return next;
    },
    listByStatus: (status: StoredTxn["status"]) => Array.from(store.txns.values()).filter((t) => t.status === status),
    /** All transactions — analytics only. Avoids the user-by-user N+1 walk. */
    listAll: (): StoredTxn[] => Array.from(store.txns.values()),
    findByIdempotencyKey: (key: string): StoredTxn | null => {
      for (const t of store.txns.values()) if (t.idempotencyKey === key) return t;
      return null;
    },
    /** Sum of confirmed deposits for a user since a cutoff timestamp.
     *  No row-count cap — walks all transactions for correctness. */
    sumDepositsSince: (userId: string, sinceMs: number): number => {
      let sum = 0;
      for (const t of store.txns.values()) {
        if (t.userId === userId && t.type === "DEPOSIT" && t.status === "CONFIRMED" && Date.parse(t.createdAt) >= sinceMs) {
          sum += t.amount;
        }
      }
      return sum;
    },
  },
  responsible: {
    get: (userId: string) => store.responsible.get(userId) ?? null,
    listAll: () => Array.from(store.responsible.values()),
    upsert: (r: StoredResponsibleGambling) => { store.responsible.set(r.userId, r); return r; },
  },
  notification: {
    create: (n: StoredNotification) => { store.notifications.set(n.id, n); return n; },
    findByUser: (userId: string, limit = 50) =>
      Array.from(store.notifications.values())
        .filter((n) => n.userId === userId && !n.dismissedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    countUnread: (userId: string) =>
      Array.from(store.notifications.values()).filter((n) => n.userId === userId && !n.readAt && !n.dismissedAt).length,
    markRead: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, readAt: n.readAt ?? new Date().toISOString() };
      store.notifications.set(id, next);
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
      return count;
    },
    dismiss: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, dismissedAt: new Date().toISOString() };
      store.notifications.set(id, next);
      return next;
    },
    dismissAll: (userId: string) => {
      const now = new Date().toISOString();
      let count = 0;
      for (const n of store.notifications.values()) {
        if (n.userId === userId && !n.dismissedAt) {
          store.notifications.set(n.id, { ...n, dismissedAt: now });
          count++;
        }
      }
      return count;
    },
  },
  sourceOfFunds: {
    get: (userId: string) => store.sourceOfFunds.get(userId) ?? null,
    upsert: (s: StoredSourceOfFunds) => { store.sourceOfFunds.set(s.userId, s); return s; },
    listPending: () => Array.from(store.sourceOfFunds.values()).filter((s) => s.reviewStatus === "PENDING"),
  },
  affiliate: {
    findByUserId: (userId: string): StoredAffiliateAccount | null => store.affiliates.get(userId) ?? null,
    findByCode: (code: string): StoredAffiliateAccount | null => {
      const norm = code.trim().toUpperCase();
      for (const a of store.affiliates.values()) if (a.code === norm) return a;
      return null;
    },
    create: (a: StoredAffiliateAccount): StoredAffiliateAccount => { store.affiliates.set(a.userId, a); return a; },
    update: (userId: string, patch: Partial<StoredAffiliateAccount>): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, ...patch, updatedAt: new Date().toISOString() };
      store.affiliates.set(userId, next);
      return next;
    },
    list: (): StoredAffiliateAccount[] => Array.from(store.affiliates.values()),
  },
  referralReward: {
    create: (r: StoredReferralReward): StoredReferralReward => { store.referralRewards.set(r.id, r); return r; },
    update: (id: string, patch: Partial<StoredReferralReward>): StoredReferralReward | null => {
      const r = store.referralRewards.get(id);
      if (!r) return null;
      const next: StoredReferralReward = { ...r, ...patch };
      store.referralRewards.set(id, next);
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
    create: (p: StoredProposal): StoredProposal => { store.proposals.set(p.id, p); return p; },
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
    set: (v: StoredProposalVote): StoredProposalVote => { store.proposalVotes.set(v.id, v); return v; },
    delete: (proposalId: string, userId: string): void => { store.proposalVotes.delete(`${proposalId}:${userId}`); },
    listByProposal: (proposalId: string): StoredProposalVote[] =>
      (Array.from(store.proposalVotes.values()) as StoredProposalVote[]).filter((v) => v.proposalId === proposalId),
  },
  bonusGrant: {
    create: (g: StoredBonusGrant): StoredBonusGrant => { store.bonusGrants.set(g.id, g); return g; },
    findById: (id: string): StoredBonusGrant | null => store.bonusGrants.get(id) ?? null,
    /** Idempotency: find a grant already created for this source reference. */
    findBySourceRef: (sourceRef: string): StoredBonusGrant | null => {
      for (const g of store.bonusGrants.values()) if (g.sourceRef === sourceRef) return g;
      return null;
    },
    update: (id: string, patch: Partial<StoredBonusGrant>): StoredBonusGrant | null => {
      const g = store.bonusGrants.get(id);
      if (!g) return null;
      const next: StoredBonusGrant = { ...g, ...patch, updatedAt: new Date().toISOString() };
      store.bonusGrants.set(id, next);
      return next;
    },
    /** All grants for a user, newest first (history / admin player view). */
    listByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    /** ACTIVE grants for a user, OLDEST first (FIFO wagering / spend order). */
    listActiveByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId && g.status === "ACTIVE")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    /** ACTIVE grants whose expiry has passed — for the expiry sweep. */
    listExpired: (nowIso: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.status === "ACTIVE" && !!g.expiresAt && g.expiresAt < nowIso),
    listByStatus: (status: BonusGrantStatus): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values()).filter((g) => g.status === status),
    /** All grants — admin ledger / analytics. */
    listAll: (limit = 1000): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
  },
  inviteCampaign: {
    create: (c: StoredInviteCampaign): StoredInviteCampaign => { store.inviteCampaigns.set(c.id, c); return c; },
    findById: (id: string): StoredInviteCampaign | null => store.inviteCampaigns.get(id) ?? null,
    findByCode: (code: string): StoredInviteCampaign | null => {
      const norm = code.trim().toUpperCase();
      for (const c of store.inviteCampaigns.values()) if (c.code === norm) return c;
      return null;
    },
    update: (id: string, patch: Partial<StoredInviteCampaign>): StoredInviteCampaign | null => {
      const c = store.inviteCampaigns.get(id);
      if (!c) return null;
      const next: StoredInviteCampaign = { ...c, ...patch, updatedAt: new Date().toISOString() };
      store.inviteCampaigns.set(id, next);
      return next;
    },
    /** Atomic counter bumps (avoid read-modify-write races when many invitees
     *  register concurrently). Deltas, like wallet.adjust. */
    incrementCounters: (id: string, deltas: { invites?: number; registered?: number }): StoredInviteCampaign | null => {
      const c = store.inviteCampaigns.get(id);
      if (!c) return null;
      const next: StoredInviteCampaign = {
        ...c,
        totalInvites: c.totalInvites + (deltas.invites ?? 0),
        totalRegistered: c.totalRegistered + (deltas.registered ?? 0),
        updatedAt: new Date().toISOString(),
      };
      store.inviteCampaigns.set(id, next);
      return next;
    },
    list: (limit = 500): StoredInviteCampaign[] =>
      Array.from(store.inviteCampaigns.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
  },
  inviteEntry: {
    create: (e: StoredInviteEntry): StoredInviteEntry => { store.inviteEntries.set(e.id, e); return e; },
    findById: (id: string): StoredInviteEntry | null => store.inviteEntries.get(id) ?? null,
    findByCampaign: (campaignId: string): StoredInviteEntry[] =>
      Array.from(store.inviteEntries.values()).filter((e) => e.campaignId === campaignId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    findByCampaignAndContact: (campaignId: string, contactValue: string): StoredInviteEntry | null => {
      for (const e of store.inviteEntries.values()) if (e.campaignId === campaignId && e.contactValue === contactValue) return e;
      return null;
    },
    update: (id: string, patch: Partial<StoredInviteEntry>): StoredInviteEntry | null => {
      const e = store.inviteEntries.get(id);
      if (!e) return null;
      const next: StoredInviteEntry = { ...e, ...patch };
      store.inviteEntries.set(id, next);
      return next;
    },
  },
};

// Postgres (Prisma) is the ONE production data path. It engages whenever a
// DATABASE_URL is configured — always the case in prod.
const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

// Hard lock: if we're actually serving production traffic (NODE_ENV=production)
// without a database, REFUSE TO START rather than silently fall back to the
// in-memory store — which would lose data and diverge per instance. There is no
// scenario where production runs on memory. (Skipped during `next build`, which
// evaluates modules with NODE_ENV=production but no DB.)
if (!usePrisma && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "FATAL: DATABASE_URL is required. The in-memory store is a test-only fallback " +
    "and must never serve production traffic — set DATABASE_URL (and USE_PRISMA_DAL≠false).",
  );
}

// The in-memory Maps above are retained STRICTLY as a fake for unit tests and
// local dev that run WITHOUT a DATABASE_URL (the test suites create fixed-id
// records and rely on a wipe-on-run store, so they can't share a persistent DB).
// They never execute in production — the guard above guarantees it.
// Type as the ASYNC Prisma DAL so TypeScript enforces `await` on every call.
// In dev (no DATABASE_URL) the sync in-memory store is cast to match — `await`
// on a sync value is a harmless no-op, but a MISSING `await` on an async
// Prisma call is a production crash. This way tsc catches it at compile time.
export const db: typeof prismaDb = usePrisma
  ? prismaDb
  : (memoryDb as unknown as typeof prismaDb);
