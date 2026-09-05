/**
 * In-memory data store + Prisma DAL switch.
 *
 * When USE_PRISMA_DAL=true and DATABASE_URL is set, `db` routes to the
 * Prisma-backed DAL (prisma-dal.ts). Otherwise it uses the in-memory Maps.
 * All call sites must have `await` (Phase 3) before flipping the flag.
 */
import { prismaDb } from "./prisma-dal";
import { hasDatabase } from "./prisma";
import { randomId } from "./crypto";
import { matchesFilters, sortAndPage, summarise, type TxnSearchFilters, type TxnSearchResult } from "./txn-filters";
// ⛔ The same lens definitions the Prisma DAL reads — one home (§0a), so the two
// implementations of this contract cannot drift apart about what "Money" means.
import {
  kindsFor, showsCleared, MONEY_FILTER_KINDS, ACCOUNT_FILTER_KINDS,
  type NotificationFilter, type NotificationSort,
} from "@/lib/notification-filters";

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
  role: "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT" | "FINANCE" | "GROWTH" | "AUDITOR";
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
  /** WHICH of the four documents proves this identity. `IdDocType` in
   *  `@/lib/id-documents`; typed as a string here because `StoredKyc` is the
   *  storage shape both back-ends map onto. */
  idType?: string | null;
  /** The identity number, NORMALISED (`normaliseIdNumber`). ⛔ Half of the
   *  uniqueness tuple — one document, one account, across all four types. */
  idNumber?: string | null;
  /** Expiry, for the two documents that carry one. Null for NIDA / voter card. */
  idExpiry?: string | null;
  /** When the number was accepted: format valid and unique. Never "authority
   *  confirmed" — there is no authority check (docs/IDENTITY-POLICY.md). */
  idVerifiedAt?: string | null;
  /** 🔴 The keyed HMAC of `(idType, idNumber)` — `identityFingerprint` in `crypto.ts`.
   *  The half of one-document-one-account that SURVIVES erasure: `anonymizeClosedAccount`
   *  destroys `idNumber`, so from then on the tuple can no longer collide with the raw
   *  number a future applicant submits, and this can. Optional so rows written before
   *  2026-08-21 still load. */
  idFingerprint?: string | null;
  fullName: string | null;
  dob: string | null;
  /** `mimeType`/`sizeBytes` are the VERIFIED facts about the bytes, captured at
   *  upload (magic-byte sniffed — not the client's claim). They are carried here
   *  because once a document moves to R2 the storageKey is `r2:<key>` and the
   *  bytes can no longer be measured from it: the DAL used to regex the key as a
   *  data URL and silently record `application/octet-stream` / `0` for EVERY R2
   *  document — a false statement about identity evidence in a compliance table
   *  (all 7 R2 rows on production, measured 2026-07-31, against real ~150–240 KB
   *  JPEGs). Optional so older/partial records still load. */
  documents: { docType: string; storageKey: string; uploadedAt: string; mimeType?: string; sizeBytes?: number }[];
  /** Extra documents an officer asked for during review (each with a written
   *  description the player and reviewer both see). Empty in the normal case;
   *  populated by a REQUEST_INFO decision. `storageKey` is null until the
   *  player uploads the requested file. */
  extraRequests?: KycExtraRequest[];
  reviewerId: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
  /** 🔴 First-ever approval — set once, NEVER cleared. Withdrawal asks THIS
   *  (`assertKycForMoney(userId, "WITHDRAW")`); deposit and betting ask
   *  `status`. The split is what stops `forceReverifyKyc` freezing money a
   *  player earned under an identity we already accepted — see the column note
   *  in `prisma/schema.prisma`. Optional so rows written before 2026-09-05
   *  still load. */
  approvedAt?: string | null;
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
export type BonusGrantStatus = "ACTIVE" | "QUEUED" | "PENDING_KYC" | "FULFILLED" | "EXPIRED" | "CANCELLED" | "FORFEITED";

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
  /**
   * What the payment gateway ACTUALLY said, in its own words — HTTP status,
   * resultcode, result and message (see `describeSelcom`).
   *
   * 🔴 The Prisma column has existed since the schema was written and NO code path
   * ever wrote it, so it was silently always null. On 2026-07-29 two real payouts
   * stalled in PROCESSING and the platform could not say whether Selcom had queued
   * them, refused them for an empty float, or rejected the utility code — the
   * envelope was discarded at the adapter and this field, which exists precisely to
   * hold it, was dead. It is written now on dispatch and refreshed on every status
   * re-query. Log-safe by construction: no credentials, payee masked, truncated.
   */
  providerStatus?: string | null;
  /**
   * Which Selcom payout rail this withdrawal went out on — `PayoutRail` in
   * `selcom.ts`. Null on deposits and on payouts written before rails existed.
   *
   * 🔴 Read it through `railOf()`, never raw. Each rail's status endpoint only knows
   * its own transids, so re-querying a payout on the wrong one returns an envelope
   * for a transaction it has never seen — which resolves to FAILED and makes the
   * reconcile sweep refund a player whose money already left. Null means
   * WALLET_CASHIN, which is true for every legacy row.
   */
  payoutRail?: string | null;
  msisdn: string | null;
  description: string | null;
  positionId: string | null;
  amlReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Client-generated UUID — prevents double-submit on 2G. Null for internal txns. */
  idempotencyKey?: string | null;
  /** Set once we've emailed the player that this deposit is taking a while.
   *  Exactly-once guard for the reconcile sweep's "still pending" mail. */
  pendingNotifiedAt?: string | null;
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
  /** When the CURRENT exclusion/cooling-off began. Null for periods set before this
   *  was recorded — the cross-operator register prints "—" rather than guessing. */
  selfExclusionStartedAt: string | null;
  coolingOffStartedAt: string | null;
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
    | "BONUS"
    /** F3 — a market on the player's watchlist closed soon / settled. */
    | "WATCHLIST"
    /** F11 — a player disputed a verdict, or an officer ruled on their dispute. */
    | "OBJECTION"
    /**
     * A verdict was RECORDED and the money has not moved yet (management ruling ①,
     * 2026-09-05). Deliberately not `WIN`/`LOSS`: nobody has been paid, and the same
     * message goes to both sides of the market. Deliberately not `SELECTION_CLOSED`:
     * that is the earlier event, when betting shut and the pools froze.
     */
    | "VERDICT";
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
export type ProposalCategory = "sports" | "macro" | "weather" | "crypto" | "culture" | "infrastructure" | "tech" | "mixed";

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
  selectionCloseDate: string | null; // ISO date (YYYY-MM-DD) — when betting closes; null = auto at publish
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

/** Why a player says the verdict is wrong. A closed list, not free text — the
 *  officer triages on the reason and the player writes their case in `detail`. */
export type ObjectionReason =
  | "WRONG_OUTCOME"        // the result is simply not what the source says
  | "SOURCE_CONTRADICTS"   // the cited source says something else
  | "AMBIGUOUS_CRITERION"  // the criterion doesn't decide this case
  | "RESOLVED_EARLY"       // settled before the real-world event concluded
  | "OTHER";

/**
 * OPEN freezes the market's money; a ruling releases it.
 *
 * There is deliberately NO player-side withdraw. An officer has to read every
 * objection anyway, so a mistaken one is released by them rejecting it — and a
 * withdraw path would have re-opened the file → withdraw → re-file loop that the
 * one-objection-per-market rule exists to close.
 */
export type ObjectionStatus = "OPEN" | "UPHELD" | "REJECTED";

/** What the officer did about an upheld objection. Only reachable while the
 *  market is unsettled — which is the entire reason settlement is gated. */
export type ObjectionRemedy = "VOID" | "REVERSE";

/**
 * A player's formal objection to a market's verdict, filed inside the objection
 * window while the pool is still intact. An OPEN objection blocks settlement
 * (see settleMarket) — that is what gives it teeth.
 */
export type StoredObjection = {
  id: string;                        // obj_…
  marketId: string;
  userId: string;                    // the objector — must hold a position
  reason: ObjectionReason;
  detail: string;                    // the player's case, capped at the app layer
  status: ObjectionStatus;
  createdAt: string;
  /** Officer review. */
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** Set only when status === "UPHELD" — what was done to the market. */
  remedy: ObjectionRemedy | null;
  /** The verdict at the time of filing, so the audit trail shows what was
   *  actually being disputed even after a remedy changes the market. */
  outcomeAtFiling: string | null;
};

/** F3 — a player's star on a market. Composite id `${marketId}:${userId}`. */
export type StoredWatchlist = {
  id: string;
  marketId: string;
  userId: string;
  createdAt: string;
};

/** F4 — one browser push endpoint. Keyed by `endpoint` (globally unique). */
export type StoredPushSub = {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** F8 — an operator-authored real-world event the AI can be steered by.
 *  `category` is a MarketCategory value (typed as string here to avoid a
 *  store ↔ market-service import cycle; events-service narrows it). */
export type StoredEvent = {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  sourceUrl: string;
  note: string | null;
  generatedAt: string | null;
  aiPollId: string | null;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
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
    objections: Map<string, StoredObjection>;
    watchlist: Map<string, StoredWatchlist>;
    pushSubs: Map<string, StoredPushSub>;
    events: Map<string, StoredEvent>;
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
  objections: new Map(),
  watchlist: new Map(),
  pushSubs: new Map(),
  events: new Map(),
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
if (!store.watchlist)       store.watchlist = new Map();
if (!store.pushSubs)        store.pushSubs = new Map();
if (!store.events)          store.events = new Map();
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
    /** EVERY account on an address, oldest first. Mirrors the Prisma DAL — see the
     *  long note there: `email` is not unique, so sign-in must disambiguate. */
    findAllByEmail: (email: string, cap = 5): StoredUser[] => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      return Array.from(store.users.values())
        .filter((u) => (u.email ?? "").trim().toLowerCase() === norm)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .slice(0, cap);
    },
    update: (id: string, patch: Partial<StoredUser>) => {
      const u = store.users.get(id);
      if (!u) return null;
      const next = { ...u, ...patch, updatedAt: new Date().toISOString() };
      store.users.set(id, next);
      return next;
    },
    list: (): StoredUser[] => Array.from(store.users.values()),
    /** COUNT(*) — never materialises rows (audit H4/M5). */
    count: (): number => store.users.size,
    /** Users holding any of `roles` — replaces list().filter(...) officer scans
     *  (audit M5). Indexed on role in the Prisma DAL. */
    listByRoles: (roles: string[], select?: { id: true; email?: true }): StoredUser[] => {
      void select; // in-memory returns full rows; the Prisma DAL honours select
      return Array.from(store.users.values()).filter((u) => roles.includes(u.role));
    },
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
    /**
     * Submissions in the given statuses — the officer review queue.
     *
     * ⛔ IT EXISTS BECAUSE THE POLICY CHANGED THE POPULATION, NOT BECAUSE THE OLD CODE WAS
     * SLOPPY. `listPendingKyc` used to call `db.kyc.list()` — `findMany` with NO `where`
     * and NO `select`, documents joined — and filter in JavaScript. Fine while KYC was
     * optional and production held 56 rows. From 2026-09-05 every registered player has a
     * submission, so that is a full-table scan with a join on every `/admin/approvals`
     * render, growing with sign-ups, on the screen that is now the only route to revenue.
     */
    listByStatus: (statuses: StoredKyc["status"][]) => {
      const want = new Set(statuses);
      return Array.from(store.kyc.values()).filter((k) => want.has(k.status));
    },
    // ⚠️ `findByNida` / `findActiveByNida` LIVED HERE UNTIL 2026-08-20. They read the
    // deprecated `nidaNumber` column and had ZERO callers from the day the identity
    // tuple shipped — `findActiveByIdNumber` below replaced them, matching on the PAIR.
    // ⛔ Deleted with the column and not reinstated: a duplicate read that matches a
    // number without its document type refuses a passport for sharing digits with a
    // NIDA, and lets one human hold two accounts on two different documents.
    /**
     * 🔴 ONE DOCUMENT, ONE ACCOUNT — the duplicate read for ALL FOUR identity
     * types. A non-REJECTED submission carrying this (type, number) on a
     * DIFFERENT user.
     *
     * ⛔ It matches on the PAIR, never on the number alone. Matching the number
     * alone would refuse a passport that happens to share its digits with somebody
     * else's licence; matching the type alone is meaningless. And the pair is what
     * the partial unique index enforces, so the fast path and the enforcement must
     * ask the same question or the two disagree under load.
     *
     * ⚠️ The caller passes an ALREADY-NORMALISED number (`normaliseIdNumber`).
     * Normalising here as well would hide a call site that forgot to.
     */
    findActiveByIdNumber: (
      idType: string,
      idNumber: string,
      excludeUserId?: string,
    ): { userId: string; status: string } | null => {
      const norm = idNumber.trim();
      if (!norm || !idType) return null;
      for (const k of store.kyc.values()) {
        if ((k.idNumber ?? "").trim() !== norm) continue;
        if ((k.idType ?? "") !== idType) continue;
        if (excludeUserId && k.userId === excludeUserId) continue;
        if (k.status === "REJECTED") continue;
        return { userId: k.userId, status: k.status };
      }
      return null;
    },
    /**
     * 🔴 THE SAME CONTROL, ON THE VALUE THAT SURVIVES ERASURE.
     *
     * `findActiveByIdNumber` above matches the RAW number, and an erased submission no
     * longer has one — `anonymizeClosedAccount` replaced it with its keyed HMAC. So a
     * document that was erased would read as free to the fast path while the DATABASE
     * still refuses it on "KycSubmission_idFingerprint_active_key", and the player would
     * meet an unexplained 500 instead of the `id_taken` refusal. Both questions get
     * asked, in the same shape, for the same reason the tuple pair does.
     *
     * Mirror of the Prisma DAL's implementation. Both halves exist because every unit
     * test runs against this store, and a Prisma-only method throws there.
     */
    findActiveByFingerprint: (
      fingerprint: string,
      excludeUserId?: string,
    ): { userId: string; status: string } | null => {
      const fp = fingerprint.trim();
      if (!fp) return null;
      for (const k of store.kyc.values()) {
        if ((k.idFingerprint ?? "") !== fp) continue;
        if (excludeUserId && k.userId === excludeUserId) continue;
        if (k.status === "REJECTED") continue;
        return { userId: k.userId, status: k.status };
      }
      return null;
    },
    /**
     * EVERY submission this user has ever made, newest first.
     *
     * ⛔ NOT `findByUserId`, which returns the NEWEST ONE ONLY. Erasure that reads the
     * newest leaves the identity number, full name and date of birth intact on every
     * earlier submission — and a resubmission after a rejection is the ordinary case, so
     * "one row per user" is the exception, not the rule.
     */
    listByUser: (userId: string): StoredKyc[] =>
      Array.from(store.kyc.values())
        .filter((k) => k.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    /**
     * Drop every document row on a submission. Used only by erasure.
     *
     * ⛔ `upsert` CANNOT DO THIS. Its document sync is guarded by
     * `if (k.documents?.length)`, so handing it an empty array is a no-op, not a delete —
     * an erasure routine written against `upsert` alone would report success while every
     * identity image stayed in the table. The R2 objects are a separate destruction and
     * are `deleteKycDocument`'s job; this removes the rows that point at them.
     */
    deleteDocuments: (submissionId: string): number => {
      const k = store.kyc.get(submissionId);
      if (!k) return 0;
      const n = k.documents?.length ?? 0;
      store.kyc.set(submissionId, { ...k, documents: [] });
      return n;
    },
    list: () => Array.from(store.kyc.values()),
  },
  otp: {
    create: (o: StoredOtp) => { store.otps.set(o.id, o); return o; },
    /** Mirror of the Prisma DAL's prune — see its comment for why this keys on issue,
     *  not expiry. Both halves exist because unit tests run against the memory store. */
    pruneOlderThan: (beforeIso: string): number => {
      const cutoff = Date.parse(beforeIso);
      let removed = 0;
      for (const [id, o] of store.otps) {
        if (Date.parse(o.createdAt) < cutoff) { store.otps.delete(id); removed++; }
      }
      return removed;
    },
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
    /**
     * Delete every OTP row issued to a phone number. Erasure only.
     *
     * `Otp.phoneE164` is the number itself, not a reference to the user, so tombstoning
     * `User.phoneE164` leaves it behind untouched. The 30-day prune would reach it
     * eventually; erasure is not "eventually".
     */
    deleteAllForPhone: (phone: string): number => {
      let removed = 0;
      for (const [id, o] of store.otps) {
        if (o.phoneE164 === phone) { store.otps.delete(id); removed++; }
      }
      return removed;
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
    /** In-memory twin of the Prisma DAL's SQL range query. Same bounds — `>= from`,
     *  `< to` — so a report cannot produce different totals depending on which store it
     *  ran against. */
    listInRange: (fromMs: number, toMs: number): StoredTxn[] =>
      Array.from(store.txns.values()).filter((t) => {
        const at = Date.parse(t.createdAt);
        return at >= fromMs && at < toMs;
      }),
    listForUser: (userId: string): StoredTxn[] =>
      Array.from(store.txns.values()).filter((t) => t.userId === userId),
    /** In-memory twin of the SQL GROUP BY. Same ordering rule — margin descending — so
     *  the admin page ranks identically whichever store it ran against. */
    topContributors: (limit: number): Array<{ userId: string; stakes: number; payouts: number }> => {
      const acc = new Map<string, { stakes: number; payouts: number }>();
      for (const t of store.txns.values()) {
        if (t.status !== "CONFIRMED") continue;
        const isStake = t.type === "BET_PLACED";
        const isPayout = t.type === "BET_PAYOUT" || t.type === "CASHOUT";
        if (!isStake && !isPayout) continue;
        const e = acc.get(t.userId) ?? { stakes: 0, payouts: 0 };
        if (isStake) e.stakes += Math.abs(t.amount);
        else e.payouts += Math.abs(t.amount);
        acc.set(t.userId, e);
      }
      return Array.from(acc, ([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => (b.stakes - b.payouts) - (a.stakes - a.payouts))
        .slice(0, limit);
    },
    /** Filtered + paginated transaction search for the compliance browser.
     *  Summary totals cover the WHOLE filtered set, not the returned page —
     *  an operator reconciling against a gateway statement needs the full figure.
     *  Filter/sort rules live in `txn-filters.ts` so this and the Prisma DAL
     *  can't drift. */
    search: (f: TxnSearchFilters = {}): TxnSearchResult => {
      const all = Array.from(store.txns.values()).filter((t) => matchesFilters(t, f));
      return { rows: sortAndPage(all, f), total: all.length, summary: summarise(all) };
    },
    findByIdempotencyKey: (key: string): StoredTxn | null => {
      for (const t of store.txns.values()) if (t.idempotencyKey === key) return t;
      return null;
    },
    /** Sum of deposits for a user since a cutoff timestamp. No row-count cap.
     *  `includePending` also counts PROCESSING deposits — used by the RG deposit-
     *  cap + SOF gate so an in-flight deposit is visible to a concurrent one
     *  (audit C4). Off by default (the player-facing dashboard wants confirmed-only). */
    sumDepositsSince: (userId: string, sinceMs: number, includePending = false): number => {
      let sum = 0;
      for (const t of store.txns.values()) {
        const counts = t.status === "CONFIRMED" || (includePending && t.status === "PROCESSING");
        if (t.userId === userId && t.type === "DEPOSIT" && counts && Date.parse(t.createdAt) >= sinceMs) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Net real-money gambling result for a user since a cutoff — Σ of the signed
     *  amounts of the four gambling txn types (BET_PLACED is negative money-out;
     *  BET_PAYOUT / BET_REFUND / CASHOUT are positive money-back). A negative
     *  return = net loss. Powers the daily loss-limit gate. */
    sumGamblingNetSince: (userId: string, sinceMs: number): number => {
      let sum = 0;
      for (const t of store.txns.values()) {
        if (
          t.userId === userId &&
          t.status === "CONFIRMED" &&
          (t.type === "BET_PLACED" || t.type === "BET_PAYOUT" || t.type === "BET_REFUND" || t.type === "CASHOUT") &&
          Date.parse(t.createdAt) >= sinceMs
        ) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Per-user Σ of CONFIRMED signed amounts across the given txn types since a
     *  cutoff (in-memory twin of the windowed Prisma aggregate). SIGNED sum —
     *  BET_PLACED / WITHDRAWAL are negative money-out. Powers "Your activity". */
    sumUserByTypesSince: (userId: string, sinceMs: number, types: StoredTxn["type"][]): number => {
      const set = new Set<StoredTxn["type"]>(types);
      let sum = 0;
      for (const t of store.txns.values()) {
        if (t.userId === userId && t.status === "CONFIRMED" && set.has(t.type) && Date.parse(t.createdAt) >= sinceMs) {
          sum += t.amount;
        }
      }
      return sum;
    },
    /** Platform-wide Σ of CONFIRMED amounts across the given txn types (in-memory
     *  twin of the Prisma DB aggregate). Powers the landing "paid out" stats band. */
    sumConfirmedByTypes: (types: StoredTxn["type"][]): number => {
      const set = new Set<StoredTxn["type"]>(types);
      let sum = 0;
      for (const t of store.txns.values()) {
        if (t.status === "CONFIRMED" && set.has(t.type)) sum += t.amount;
      }
      return sum;
    },
    /**
     * Per-type CONFIRMED count and ABSOLUTE sum — in-memory twin of the Prisma
     * GROUP BY. Powers the Selcom statement (`selcom-statement.ts`), which must not
     * walk a 20,000-row ledger to print three numbers.
     *
     * ⚠️ ABSOLUTE, unlike `sumConfirmedByTypes` above, and that is the whole reason
     * this is a separate method rather than a parameter on that one. Withdrawals are
     * stored NEGATIVE, so a signed sum prints a negative "money out" and makes a
     * `net` that adds when it should subtract. A statement wants magnitudes and a
     * direction it decides itself; the landing's "paid out" band wants the signed
     * sum. Two questions, two methods.
     */
    totalsByType: (types: StoredTxn["type"][]): Record<string, { amount: number; count: number }> => {
      const out: Record<string, { amount: number; count: number }> = {};
      for (const t of types) out[t] = { amount: 0, count: 0 };
      for (const t of store.txns.values()) {
        if (t.status !== "CONFIRMED") continue;
        const slot = out[t.type];
        if (!slot) continue;
        slot.amount += Math.abs(t.amount);
        slot.count += 1;
      }
      return out;
    },
    /** Transactions since `sinceMs` (optionally filtered to `types`) — in-memory
     *  twin of the windowed Prisma query. */
    listSince: (sinceMs: number, opts?: { types?: StoredTxn["type"][] }): StoredTxn[] => {
      const set = opts?.types && opts.types.length ? new Set<StoredTxn["type"]>(opts.types) : null;
      const out: StoredTxn[] = [];
      for (const t of store.txns.values()) {
        if (Date.parse(t.createdAt) >= sinceMs && (!set || set.has(t.type))) out.push(t);
      }
      return out;
    },
  },
  responsible: {
    get: (userId: string) => store.responsible.get(userId) ?? null,
    listAll: () => Array.from(store.responsible.values()),
    upsert: (r: StoredResponsibleGambling) => { store.responsible.set(r.userId, r); return r; },
  },
  notification: {
    create: (n: StoredNotification) => { store.notifications.set(n.id, n); return n; },
    /** Mirror of the Prisma DAL's dedupe lookup — the two must not diverge, or
     *  the behaviour tests prove in memory is not the behaviour production has. */
    findRecentDuplicate: (q: {
      userId: string; kind: string; titleEn: string; bodyEn: string; href: string | null; sinceMs: number;
    }): StoredNotification | null => {
      const cutoff = Date.now() - q.sinceMs;
      const hits = Array.from(store.notifications.values()).filter((n) =>
        n.userId === q.userId && n.kind === q.kind &&
        n.titleEn === q.titleEn && n.bodyEn === q.bodyEn &&
        (n.href ?? null) === q.href &&
        Date.parse(n.createdAt) >= cutoff);
      if (!hits.length) return null;
      hits.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return hits[0];
    },
    /** Mirror of the Prisma DAL's once-per-period check — see its header for why
     *  this is unbounded in time and `findRecentDuplicate` is not. */
    existsWithHref: (userId: string, href: string): boolean =>
      Array.from(store.notifications.values()).some((n) => n.userId === userId && n.href === href),
    /**
     * Delete in-app notifications created before `beforeIso`. Returns the count removed.
     *
     * ⚠️ THE PERIOD IS NOT A FREE CHOICE — see `retention.ts`. `existsWithHref` above is
     * deliberately unbounded in time because it is the Up & Down digest's only idempotency
     * key, and this method deletes the rows that answer is read from.
     *
     * Mirror of the Prisma DAL's implementation. Both halves exist because the in-memory
     * store is what every unit test runs against; a Prisma-only method throws there.
     */
    pruneOlderThan: (beforeIso: string): number => {
      const cutoff = Date.parse(beforeIso);
      let removed = 0;
      for (const [id, n] of store.notifications) {
        if (Date.parse(n.createdAt) < cutoff) { store.notifications.delete(id); removed++; }
      }
      return removed;
    },
    findByUser: (userId: string, limit = 50) =>
      Array.from(store.notifications.values())
        .filter((n) => n.userId === userId && !n.dismissedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    countUnread: (userId: string) =>
      Array.from(store.notifications.values()).filter((n) => n.userId === userId && !n.readAt && !n.dismissedAt).length,
    /**
     * Mirror of the Prisma DAL's `page` — the `/notifications` screen's one read.
     *
     * ⛔ BOTH HALVES EXIST OR NEITHER DOES. The in-memory store is what every unit test and
     * every local boot runs against, so a Prisma-only method throws there and the suite that
     * was supposed to prove the screen proves nothing. Same contract, same ordering, same
     * count semantics — if these two ever disagree, the tests are measuring a product that
     * does not ship.
     */
    page: (q: {
      userId: string;
      filter: NotificationFilter;
      sort: NotificationSort;
      page: number;
      perPage: number;
    }) => {
      const mine = Array.from(store.notifications.values()).filter((n) => n.userId === q.userId);
      const live = mine.filter((n) => !n.dismissedAt);
      const kinds = kindsFor(q.filter);
      const base = showsCleared(q.filter) ? mine.filter((n) => !!n.dismissedAt) : live;
      const matched = base
        .filter((n) => (q.filter === "unread" ? !n.readAt : true))
        .filter((n) => (kinds ? kinds.includes(n.kind as never) : true));
      const sorted = [...matched].sort((a, b) =>
        q.sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt));
      const skip = Math.max(0, (q.page - 1) * q.perPage);
      const inKinds = (n: StoredNotification, ks: readonly string[]) => ks.includes(n.kind as never);
      return {
        items: sorted.slice(skip, skip + q.perPage),
        total: sorted.length,
        counts: {
          all: live.length,
          unread: live.filter((n) => !n.readAt).length,
          money: live.filter((n) => inKinds(n, MONEY_FILTER_KINDS)).length,
          account: live.filter((n) => inKinds(n, ACCOUNT_FILTER_KINDS)).length,
          cleared: mine.filter((n) => !!n.dismissedAt).length,
        } as Record<NotificationFilter, number>,
      };
    },
    /** Mirror of the Prisma DAL's `restore` — owner-scoped, undoes a dismissal. */
    restore: (id: string, userId: string) => {
      const n = store.notifications.get(id);
      if (!n || n.userId !== userId) return null; // owner-scoped
      const next = { ...n, dismissedAt: null };
      store.notifications.set(id, next);
      return next;
    },
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
    /**
     * Delete every notification belonging to one user. Erasure only.
     *
     * ⛔ NOT `dismissAll` — dismissing hides a row whose `bodyEn` still says what the
     * player bet and won. In-app notifications are "operational only, 180 days" on
     * docs/DATA-RETENTION.md: no statute asks us to keep them, so erasure deletes them
     * rather than pretending a `dismissedAt` is a deletion.
     *
     * ⚠️ It also removes the rows `existsWithHref` answers from — the Up & Down digest's
     * only idempotency key. That is safe HERE and nowhere else: the account is CLOSED and
     * erased, so a replayed digest has nobody to double-notify.
     */
    deleteAllForUser: (userId: string): number => {
      let removed = 0;
      for (const [id, n] of store.notifications) {
        if (n.userId === userId) { store.notifications.delete(id); removed++; }
      }
      return removed;
    },
    /**
     * 🔴 OVERWRITE A FROZEN MASK WHEREVER IT LANDED IN SOMEBODY ELSE'S ROW.
     *
     * `notifyReferralJoined` writes `maskName(displayName, phoneE164)` into the
     * REFERRER's notification body — "+255•••417 signed up with your link." — and freezes
     * it there at write time. That is the last three digits of the recruit's phone number,
     * sitting in a row erasure does not own and `deleteAllForUser` above does not reach.
     * Same defect as `Comment.authorName`, one table across.
     *
     * ⚠️ Matches on the MASK, not the phone number, because the mask is what was stored.
     * Two accounts sharing a country prefix and last three digits would both be replaced;
     * the cost of that collision is one notification reading "a former member" instead of
     * a mask, which is the right side to err on.
     */
    redactFragment: (fragment: string, replacement: string): number => {
      if (!fragment) return 0;
      let changed = 0;
      for (const [id, n] of store.notifications) {
        const next = { ...n };
        let hit = false;
        for (const f of ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"] as const) {
          const v = (next as Record<string, unknown>)[f];
          if (typeof v === "string" && v.includes(fragment)) {
            (next as Record<string, unknown>)[f] = v.split(fragment).join(replacement);
            hit = true;
          }
        }
        if (hit) { store.notifications.set(id, next); changed++; }
      }
      return changed;
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
    /** Atomic +1 to recruitCount (audit M7) — a lost-update-safe increment
     *  (Prisma `{ increment: 1 }`); never read-modify-write from app code. */
    incrementRecruitCount: (userId: string): StoredAffiliateAccount | null => {
      const a = store.affiliates.get(userId);
      if (!a) return null;
      const next: StoredAffiliateAccount = { ...a, recruitCount: a.recruitCount + 1, updatedAt: new Date().toISOString() };
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
  objection: {
    create: (o: StoredObjection): StoredObjection => { store.objections.set(o.id, o); return o; },
    findById: (id: string): StoredObjection | null => store.objections.get(id) ?? null,
    update: (id: string, patch: Partial<StoredObjection>): StoredObjection | null => {
      const o = store.objections.get(id);
      if (!o) return null;
      const next: StoredObjection = { ...o, ...patch };
      store.objections.set(id, next);
      return next;
    },
    /** Every objection against a market, newest first. */
    listForMarket: (marketId: string): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .filter((o) => o.marketId === marketId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    listForUser: (userId: string): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    list: (limit = 1000): StoredObjection[] =>
      (Array.from(store.objections.values()) as StoredObjection[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
  },
  proposalVote: {
    get: (proposalId: string, userId: string): StoredProposalVote | null =>
      store.proposalVotes.get(`${proposalId}:${userId}`) ?? null,
    set: (v: StoredProposalVote): StoredProposalVote => { store.proposalVotes.set(v.id, v); return v; },
    delete: (proposalId: string, userId: string): void => { store.proposalVotes.delete(`${proposalId}:${userId}`); },
    listByProposal: (proposalId: string): StoredProposalVote[] =>
      (Array.from(store.proposalVotes.values()) as StoredProposalVote[]).filter((v) => v.proposalId === proposalId),
  },
  watchlist: {
    isWatching: (marketId: string, userId: string): boolean => store.watchlist.has(`${marketId}:${userId}`),
    add: (marketId: string, userId: string): void => {
      const id = `${marketId}:${userId}`;
      if (!store.watchlist.has(id)) {
        store.watchlist.set(id, { id, marketId, userId, createdAt: new Date().toISOString() });
      }
    },
    remove: (marketId: string, userId: string): void => { store.watchlist.delete(`${marketId}:${userId}`); },
    listWatcherIds: (marketId: string): string[] =>
      Array.from(store.watchlist.values()).filter((w) => w.marketId === marketId).map((w) => w.userId),
    listMarketIdsForUser: (userId: string): string[] =>
      Array.from(store.watchlist.values())
        .filter((w) => w.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((w) => w.marketId),
  },
  event: {
    create: (e: { title: string; category: string; startsAt: string; sourceUrl: string; note: string | null; addedBy: string }): StoredEvent => {
      const now = new Date().toISOString();
      const row: StoredEvent = {
        id: `evt_${randomId(10)}`,
        title: e.title, category: e.category, startsAt: e.startsAt, sourceUrl: e.sourceUrl,
        note: e.note, generatedAt: null, aiPollId: null, addedBy: e.addedBy,
        createdAt: now, updatedAt: now,
      };
      store.events.set(row.id, row);
      return row;
    },
    findById: (id: string): StoredEvent | null => store.events.get(id) ?? null,
    list: (): StoredEvent[] =>
      Array.from(store.events.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    update: (id: string, patch: { generatedAt?: string | null; aiPollId?: string | null }): void => {
      const cur = store.events.get(id);
      if (!cur) return;
      store.events.set(id, { ...cur, ...patch, updatedAt: new Date().toISOString() });
    },
    delete: (id: string): void => { store.events.delete(id); },
  },
  pushSub: {
    upsert: (s: StoredPushSub): void => { store.pushSubs.set(s.endpoint, s); },
    listForUser: (userId: string): StoredPushSub[] =>
      Array.from(store.pushSubs.values()).filter((s) => s.userId === userId),
    deleteByEndpoint: (endpoint: string): void => { store.pushSubs.delete(endpoint); },
    countForUser: (userId: string): number =>
      Array.from(store.pushSubs.values()).filter((s) => s.userId === userId).length,
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
    /** ACTIVE **and FULFILLED** grants, OLDEST first — the wagering-REVERSAL population
     *  (E-224). Mirrors prisma-dal.listReversibleByUser; see the note there for why
     *  listActiveByUser is deliberately NOT widened instead.
     *  ⛔ THIS MIRROR IS NOT OPTIONAL AND tsc CANNOT SEE IT MISSING: this module exports
     *  `db` as `memoryDb as unknown as typeof prismaDb` — a blind cast — so an absent
     *  method here is a runtime TypeError in every in-memory suite, not a compile error. */
    listReversibleByUser: (userId: string): StoredBonusGrant[] =>
      Array.from(store.bonusGrants.values())
        .filter((g) => g.userId === userId && (g.status === "ACTIVE" || g.status === "FULFILLED"))
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
