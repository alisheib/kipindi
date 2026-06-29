/**
 * Prisma-backed DAL — drop-in async replacement for the in-memory `db` object
 * exported by store.ts.
 *
 * Every method has the same name and return shape as the memory version.
 * The only difference is all methods are `async`. Phase 3 adds `await` at
 * every call site so the switch is transparent.
 *
 * Type conversions handled here:
 *   Prisma DateTime  →  ISO-8601 string
 *   Prisma Decimal   →  number
 *   Prisma enums     →  identical string literals (cast)
 *
 * NOT wired up until Phase 2 flips the switch in store.ts.
 */
import { prisma } from "./prisma";
import type { PrismaClient } from "@prisma/client";
import type {
  StoredUser,
  StoredKyc,
  StoredOtp,
  StoredWallet,
  StoredTxn,
  StoredResponsibleGambling,
  StoredBet,
  StoredNotification,
  StoredSourceOfFunds,
  StoredAffiliateAccount,
  StoredReferralReward,
  StoredProposal,
  StoredProposalVote,
  StoredBonusGrant,
  BonusGrantStatus,
  StoredInviteCampaign,
  StoredInviteEntry,
} from "./store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get PrismaClient or throw — DAL is only used when DATABASE_URL is set. */
function pc(): PrismaClient {
  const c = prisma();
  if (!c) throw new Error("prisma-dal: DATABASE_URL is required");
  return c;
}

/** Prisma Date → ISO string */
function iso(d: Date): string;
function iso(d: Date | null | undefined): string | null;
function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

/** Prisma Decimal / number → number */
function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

/** Prisma Decimal / number | null → number | null */
function numOrNull(d: unknown): number | null {
  if (d == null) return null;
  return Number(d);
}

// ---------------------------------------------------------------------------
// Entity mappers: Prisma row → Stored* type
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredUser(u: any): StoredUser {
  return {
    id: u.id,
    phoneE164: u.phoneE164,
    passwordHash: u.passwordHash,
    passwordSalt: u.passwordSalt,
    failedLoginCount: u.failedLoginCount ?? 0,
    lockedUntil: iso(u.lockedUntil),
    role: u.role,
    status: u.status,
    email: u.email ?? null,
    emailVerifiedAt: iso(u.emailVerifiedAt),
    locale: u.locale,
    displayName: u.displayName,
    dob: iso(u.dob),
    region: u.region,
    acceptedTermsVersion: u.acceptedTermsVersion,
    acceptedTermsAt: iso(u.acceptedTermsAt),
    marketingOptIn: u.marketingOptIn,
    twoFactorEnabled: u.twoFactorEnabled,
    avatarDataUrl: u.avatarDataUrl,
    createdAt: iso(u.createdAt)!,
    updatedAt: iso(u.updatedAt)!,
    lastLoginAt: iso(u.lastLoginAt),
    closedAt: iso(u.closedAt),
    recruitedBy: u.recruitedBy ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredKyc(row: any): StoredKyc {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    rejectReason: row.rejectReason ?? null,
    rejectNote: row.rejectNote,
    nidaNumber: row.nidaNumber,
    nidaVerifiedAt: iso(row.nidaVerifiedAt),
    fullName: row.fullName,
    dob: iso(row.dob),
    documents: (row.documents ?? []).map((d: { docType: string; storageKey: string; uploadedAt: Date }) => ({
      docType: d.docType,
      storageKey: d.storageKey,
      uploadedAt: iso(d.uploadedAt)!,
    })),
    reviewerId: row.reviewerId,
    reviewedAt: iso(row.reviewedAt),
    submittedAt: iso(row.submittedAt),
    extraRequests: Array.isArray(row.extraRequests) ? row.extraRequests : [],
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  };
}

const OTP_SEP = "|";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredOtp(row: any): StoredOtp {
  // codeHash stores "hashedCode|salt" — see fromStoredOtp
  const parts = (row.codeHash as string).split(OTP_SEP);
  return {
    id: row.id,
    phoneE164: row.phoneE164,
    hashedCode: parts[0],
    salt: parts[1] ?? "",
    purpose: row.purpose as StoredOtp["purpose"],
    attempts: row.attempts,
    consumedAt: iso(row.consumedAt),
    expiresAt: iso(row.expiresAt)!,
    createdAt: iso(row.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredWallet(w: any): StoredWallet {
  return {
    id: w.id,
    userId: w.userId,
    balance: num(w.balance),
    pending: num(w.pending),
    hold: num(w.hold),
    bonusBalance: num(w.bonusBalance),
    currency: "TZS",
    status: w.status,
    createdAt: iso(w.createdAt)!,
    updatedAt: iso(w.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredBonusGrant(g: any): StoredBonusGrant {
  return {
    id: g.id,
    userId: g.userId,
    walletId: g.walletId,
    amountTzs: num(g.amountTzs),
    remainingTzs: num(g.remainingTzs),
    wagerMultiplier: num(g.wagerMultiplier),
    wagerRequiredTzs: num(g.wagerRequiredTzs),
    wageredTzs: num(g.wageredTzs),
    source: g.source,
    sourceRef: g.sourceRef ?? null,
    status: g.status,
    expiresAt: iso(g.expiresAt),
    fulfilledAt: iso(g.fulfilledAt),
    note: g.note ?? null,
    createdAt: iso(g.createdAt)!,
    updatedAt: iso(g.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredTxn(t: any): StoredTxn {
  return {
    id: t.id,
    walletId: t.walletId,
    userId: t.userId,
    type: t.type,
    status: t.status,
    amount: num(t.amount),
    fee: num(t.fee),
    taxWithheld: num(t.taxWithheld),
    balanceAfter: numOrNull(t.balanceAfter),
    currency: "TZS",
    provider: t.provider ?? null,
    providerRef: t.providerRef,
    msisdn: t.msisdn,
    description: t.description,
    betId: t.betId,
    amlReason: t.amlReason,
    createdAt: iso(t.createdAt)!,
    updatedAt: iso(t.updatedAt)!,
    completedAt: iso(t.completedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredRG(r: any): StoredResponsibleGambling {
  return {
    userId: r.userId,
    dailyDepositLimit: numOrNull(r.dailyDepositLimit),
    weeklyDepositLimit: numOrNull(r.weeklyDepositLimit),
    monthlyDepositLimit: numOrNull(r.monthlyDepositLimit),
    dailyLossLimit: numOrNull(r.dailyLossLimit),
    sessionTimeLimitMin: r.sessionTimeLimitMin,
    realityCheckIntervalMin: r.realityCheckIntervalMin,
    selfExclusionUntil: iso(r.selfExclusionUntil),
    coolingOffUntil: iso(r.coolingOffUntil),
    pendingIncreaseTo: numOrNull(r.pendingIncreaseTo),
    pendingIncreaseEffectiveAt: iso(r.pendingIncreaseEffectiveAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredBet(b: any): StoredBet {
  // Legacy sports bets: reconstruct denormalised fields from window → match join
  const win = b.window;
  const match = win?.match;
  const outcomeMap: Record<string, string> = { HOME_WIN: "home", AWAY_WIN: "away", DRAW: "draw" };
  return {
    id: b.id,
    userId: b.userId,
    matchId: match?.id ?? "",
    matchLabel: match ? `Match ${match.id.slice(0, 6)}` : "",
    league: "",
    windowKind: win?.kind ?? "W_FT",
    windowLabel: win?.kind ?? "",
    outcome: (outcomeMap[b.outcome] ?? "home") as StoredBet["outcome"],
    outcomeLabel: b.outcome,
    stake: num(b.stake),
    payRateAtPlacement: numOrNull(b.poolShareAtPlacement) ?? 0,
    potentialReturn: num(b.potentialReturn),
    status: b.status,
    returnAmount: numOrNull(b.returnAmount),
    placedAt: iso(b.placedAt)!,
    settledAt: iso(b.settledAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredNotification(n: any): StoredNotification {
  return {
    id: n.id,
    userId: n.userId,
    kind: n.kind ?? "BET_PLACED",
    titleEn: n.titleEn ?? "",
    titleSw: n.titleSw ?? "",
    titleZh: n.titleZh ?? null,
    bodyEn: n.bodyEn,
    bodySw: n.bodySw,
    bodyZh: n.bodyZh ?? null,
    href: n.href,
    readAt: iso(n.readAt),
    dismissedAt: iso(n.dismissedAt),
    createdAt: iso(n.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredSOF(s: any): StoredSourceOfFunds {
  return {
    userId: s.userId,
    declaredSource: s.declaredSource as StoredSourceOfFunds["declaredSource"],
    declaredOccupation: s.declaredOccupation,
    declaredEmployer: s.declaredEmployer,
    declaredAnnualIncomeBand: s.declaredAnnualIncomeBand as StoredSourceOfFunds["declaredAnnualIncomeBand"],
    declaredOther: s.declaredOther,
    reviewStatus: s.reviewStatus as StoredSourceOfFunds["reviewStatus"],
    reviewerId: s.reviewerId,
    reviewedAt: iso(s.reviewedAt),
    submittedAt: iso(s.submittedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredAffiliate(a: any): StoredAffiliateAccount {
  return {
    userId: a.userId,
    code: a.code,
    recruitCount: a.totalRecruits ?? 0,
    totalEarnedTzs: num(a.totalCommission),
    createdAt: iso(a.createdAt)!,
    updatedAt: iso(a.updatedAt ?? a.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredReward(r: any): StoredReferralReward {
  return {
    id: r.id,
    referrerUserId: r.referrerUserId,
    recruitUserId: r.recruitUserId,
    type: r.type,
    label: r.label,
    amountTzs: num(r.amountTzs),
    status: r.status,
    recipientUserId: r.recipientUserId,
    note: r.note,
    createdAt: iso(r.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredProposal(p: any): StoredProposal {
  return {
    id: p.id,
    proposerId: p.proposerId,
    titleEn: p.titleEn,
    titleSw: p.titleSw,
    titleZh: p.titleZh ?? null,
    description: p.description,
    resolutionCriterion: p.resolutionCriterion,
    category: p.category as StoredProposal["category"],
    resolutionDate: p.resolutionDate,
    status: p.status,
    up: p.up,
    down: p.down,
    publishedMarketId: p.publishedMarketId,
    prizePaidTzs: num(p.prizePaidTzs),
    declineReason: p.declineReason,
    declineNote: p.declineNote,
    changeNote: p.changeNote,
    reviewedBy: p.reviewedBy,
    reviewedAt: iso(p.reviewedAt),
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredVote(v: any): StoredProposalVote {
  return {
    id: v.id,
    proposalId: v.proposalId,
    userId: v.userId,
    dir: (v.dir as string).toLowerCase() as "up" | "down",
    createdAt: iso(v.createdAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredInviteCampaign(c: any): StoredInviteCampaign {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    bonusAmountTzs: num(c.bonusAmountTzs),
    wagerMultiplier: num(c.wagerMultiplier),
    expiresInDays: num(c.expiresInDays),
    messageEn: c.messageEn,
    messageSw: c.messageSw,
    status: c.status,
    totalInvites: num(c.totalInvites),
    totalRegistered: num(c.totalRegistered),
    createdById: c.createdById,
    createdAt: iso(c.createdAt)!,
    updatedAt: iso(c.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredInviteEntry(e: any): StoredInviteEntry {
  return {
    id: e.id,
    campaignId: e.campaignId,
    contactType: e.contactType,
    contactValue: e.contactValue,
    bonusAmountTzs: num(e.bonusAmountTzs),
    status: e.status,
    sentAt: iso(e.sentAt),
    registeredUserId: e.registeredUserId ?? null,
    bonusGrantId: e.bonusGrantId ?? null,
    failureReason: e.failureReason ?? null,
    createdAt: iso(e.createdAt)!,
  };
}

// ---------------------------------------------------------------------------
// The Prisma DAL — same shape as the in-memory `db` from store.ts
// ---------------------------------------------------------------------------

export const prismaDb = {
  // ── USER ──────────────────────────────────────────────────────────────────
  user: {
    findById: async (id: string): Promise<StoredUser | null> => {
      const u = await pc().user.findUnique({ where: { id } });
      return u ? toStoredUser(u) : null;
    },
    findByPhone: async (phone: string): Promise<StoredUser | null> => {
      const u = await pc().user.findUnique({ where: { phoneE164: phone } });
      return u ? toStoredUser(u) : null;
    },
    findByEmail: async (email: string): Promise<StoredUser | null> => {
      const norm = email.trim().toLowerCase();
      if (!norm) return null;
      // email @unique removed for testing — use findFirst instead of findUnique.
      const u = await pc().user.findFirst({ where: { email: norm } });
      return u ? toStoredUser(u) : null;
    },
    create: async (u: StoredUser): Promise<StoredUser> => {
      const row = await pc().user.create({
        data: {
          id: u.id,
          phoneE164: u.phoneE164,
          passwordHash: u.passwordHash,
          passwordSalt: u.passwordSalt,
          failedLoginCount: u.failedLoginCount,
          lockedUntil: u.lockedUntil ? new Date(u.lockedUntil) : null,
          role: u.role,
          status: u.status,
          email: u.email ?? null,
          emailVerifiedAt: u.emailVerifiedAt ? new Date(u.emailVerifiedAt) : null,
          locale: u.locale,
          displayName: u.displayName,
          dob: u.dob ? new Date(u.dob) : null,
          region: u.region,
          acceptedTermsVersion: u.acceptedTermsVersion,
          acceptedTermsAt: u.acceptedTermsAt ? new Date(u.acceptedTermsAt) : null,
          marketingOptIn: u.marketingOptIn,
          twoFactorEnabled: u.twoFactorEnabled,
          avatarDataUrl: u.avatarDataUrl,
          createdAt: new Date(u.createdAt),
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
          closedAt: u.closedAt ? new Date(u.closedAt) : null,
          recruitedBy: u.recruitedBy ?? null,
        },
      });
      return toStoredUser(row);
    },
    update: async (id: string, patch: Partial<StoredUser>): Promise<StoredUser | null> => {
      const exists = await pc().user.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return null;
      // Convert date strings to Date objects for Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      const dateFields = ["lockedUntil", "dob", "acceptedTermsAt", "lastLoginAt", "closedAt", "emailVerifiedAt"] as const;
      for (const [k, v] of Object.entries(patch)) {
        if (k === "updatedAt") continue; // Prisma handles @updatedAt
        if (dateFields.includes(k as (typeof dateFields)[number])) {
          data[k] = v ? new Date(v as string) : null;
        } else {
          data[k] = v;
        }
      }
      const row = await pc().user.update({ where: { id }, data });
      return toStoredUser(row);
    },
    list: async (): Promise<StoredUser[]> => {
      const rows = await pc().user.findMany();
      return rows.map(toStoredUser);
    },
  },

  // ── KYC ───────────────────────────────────────────────────────────────────
  kyc: {
    findByUserId: async (userId: string): Promise<StoredKyc | null> => {
      const row = await pc().kycSubmission.findFirst({
        where: { userId },
        include: { documents: true },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredKyc(row) : null;
    },
    upsert: async (k: StoredKyc): Promise<StoredKyc> => {
      const data = {
        userId: k.userId,
        status: k.status as "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED",
        rejectReason: k.rejectReason as null,
        rejectNote: k.rejectNote,
        nidaNumber: k.nidaNumber,
        nidaVerifiedAt: k.nidaVerifiedAt ? new Date(k.nidaVerifiedAt) : null,
        fullName: k.fullName,
        dob: k.dob ? new Date(k.dob) : null,
        reviewerId: k.reviewerId,
        reviewedAt: k.reviewedAt ? new Date(k.reviewedAt) : null,
        submittedAt: k.submittedAt ? new Date(k.submittedAt) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extraRequests: (k.extraRequests ?? []) as any,
      };
      const row = await pc().kycSubmission.upsert({
        where: { id: k.id },
        create: { id: k.id, ...data },
        update: data,
        include: { documents: true },
      });
      // Sync documents: delete existing, re-create from StoredKyc
      if (k.documents.length > 0) {
        await pc().kycDocument.deleteMany({ where: { submissionId: k.id } });
        await pc().kycDocument.createMany({
          data: k.documents.map((d) => {
            // storageKey holds a base64 image data URL — record its real mime +
            // byte size for the document record (cosmetic; serving reads the URL).
            const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(d.storageKey ?? "");
            const sizeBytes = m ? Math.floor((m[2].length * 3) / 4) : 0;
            return {
              submissionId: k.id,
              docType: d.docType as "NIDA" | "NIDA_FRONT" | "NIDA_BACK" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | "SELFIE",
              storageKey: d.storageKey,
              mimeType: m?.[1] ?? "application/octet-stream",
              sizeBytes,
              uploadedAt: new Date(d.uploadedAt),
            };
          }),
        });
      }
      // Re-fetch with documents
      const full = await pc().kycSubmission.findUnique({
        where: { id: k.id },
        include: { documents: true },
      });
      return toStoredKyc(full ?? row);
    },
    findByNida: async (nidaNumber: string): Promise<StoredKyc | null> => {
      const norm = nidaNumber.trim();
      if (!norm) return null;
      const row = await pc().kycSubmission.findFirst({
        where: { nidaNumber: norm },
        include: { documents: true },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredKyc(row) : null;
    },
    list: async (): Promise<StoredKyc[]> => {
      const rows = await pc().kycSubmission.findMany({ include: { documents: true } });
      return rows.map(toStoredKyc);
    },
  },

  // ── OTP ───────────────────────────────────────────────────────────────────
  // hashedCode + salt are packed into the single `codeHash` column as "hash|salt"
  otp: {
    create: async (o: StoredOtp): Promise<StoredOtp> => {
      const row = await pc().otp.create({
        data: {
          id: o.id,
          phoneE164: o.phoneE164,
          codeHash: `${o.hashedCode}${OTP_SEP}${o.salt}`,
          purpose: o.purpose,
          attempts: o.attempts,
          consumedAt: o.consumedAt ? new Date(o.consumedAt) : null,
          expiresAt: new Date(o.expiresAt),
          createdAt: new Date(o.createdAt),
        },
      });
      return toStoredOtp(row);
    },
    findActive: async (phone: string, purpose: string): Promise<StoredOtp | null> => {
      const row = await pc().otp.findFirst({
        where: {
          phoneE164: phone,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredOtp(row) : null;
    },
    findAllActive: async (phone: string, purpose: string): Promise<StoredOtp[]> => {
      const rows = await pc().otp.findMany({
        where: {
          phoneE164: phone,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredOtp);
    },
    consume: async (id: string): Promise<StoredOtp | null> => {
      try {
        const row = await pc().otp.update({
          where: { id },
          data: { consumedAt: new Date() },
        });
        return toStoredOtp(row);
      } catch {
        return null;
      }
    },
    incrementAttempts: async (id: string): Promise<StoredOtp | null> => {
      try {
        const row = await pc().otp.update({
          where: { id },
          data: { attempts: { increment: 1 } },
        });
        return toStoredOtp(row);
      } catch {
        return null;
      }
    },
  },

  // ── WALLET ────────────────────────────────────────────────────────────────
  wallet: {
    findByUserId: async (userId: string): Promise<StoredWallet | null> => {
      const w = await pc().wallet.findUnique({ where: { userId } });
      return w ? toStoredWallet(w) : null;
    },
    listAll: async (): Promise<StoredWallet[]> => {
      const rows = await pc().wallet.findMany();
      return rows.map(toStoredWallet);
    },
    create: async (w: StoredWallet): Promise<StoredWallet> => {
      const row = await pc().wallet.create({
        data: {
          id: w.id,
          userId: w.userId,
          balance: w.balance,
          pending: w.pending,
          hold: w.hold,
          bonusBalance: w.bonusBalance ?? 0,
          currency: w.currency,
          status: w.status,
          createdAt: new Date(w.createdAt),
        },
      });
      return toStoredWallet(row);
    },
    update: async (id: string, patch: Partial<StoredWallet>): Promise<StoredWallet | null> => {
      try {
        const { createdAt: _c, updatedAt: _u, ...rest } = patch;
        const row = await pc().wallet.update({ where: { id }, data: rest });
        return toStoredWallet(row);
      } catch {
        return null;
      }
    },
    // Atomic balance/hold/pending deltas with optional minimum guards. Maps to a
    // single conditional updateMany so the DB applies increment/decrement
    // atomically (no lost updates) and the WHERE guard makes debits overdraw-safe
    // under concurrency — correct even across multiple instances. Returns the
    // updated wallet, or null if missing or a guard failed (insufficient funds).
    adjust: async (
      id: string,
      deltas: { balance?: number; hold?: number; pending?: number; bonusBalance?: number },
      opts?: { requireBalanceGte?: number; requireHoldGte?: number; requireBonusBalanceGte?: number },
    ): Promise<StoredWallet | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { id };
        if (opts?.requireBalanceGte !== undefined) where.balance = { gte: opts.requireBalanceGte };
        if (opts?.requireHoldGte !== undefined) where.hold = { gte: opts.requireHoldGte };
        if (opts?.requireBonusBalanceGte !== undefined) where.bonusBalance = { gte: opts.requireBonusBalanceGte };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        if (deltas.balance !== undefined) data.balance = { increment: deltas.balance };
        if (deltas.hold !== undefined) data.hold = { increment: deltas.hold };
        if (deltas.pending !== undefined) data.pending = { increment: deltas.pending };
        if (deltas.bonusBalance !== undefined) data.bonusBalance = { increment: deltas.bonusBalance };
        const res = await pc().wallet.updateMany({ where, data });
        if (res.count === 0) return null;
        const row = await pc().wallet.findUnique({ where: { id } });
        return row ? toStoredWallet(row) : null;
      } catch {
        return null;
      }
    },
  },

  // ── TRANSACTION ───────────────────────────────────────────────────────────
  txn: {
    create: async (t: StoredTxn): Promise<StoredTxn> => {
      const row = await pc().transaction.create({
        data: {
          id: t.id,
          walletId: t.walletId,
          userId: t.userId,
          type: t.type,
          status: t.status,
          amount: t.amount,
          fee: t.fee,
          taxWithheld: t.taxWithheld,
          balanceAfter: t.balanceAfter,
          currency: t.currency,
          provider: t.provider,
          providerRef: t.providerRef,
          msisdn: t.msisdn,
          description: t.description,
          betId: t.betId,
          amlReason: t.amlReason,
          createdAt: new Date(t.createdAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
        },
      });
      return toStoredTxn(row);
    },
    findByUser: async (userId: string, limit = 50): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredTxn);
    },
    findById: async (id: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findUnique({ where: { id } });
      return row ? toStoredTxn(row) : null;
    },
    findByProviderRef: async (providerRef: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findFirst({ where: { providerRef } });
      return row ? toStoredTxn(row) : null;
    },
    update: async (id: string, patch: Partial<StoredTxn>): Promise<StoredTxn | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "completedAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await pc().transaction.update({ where: { id }, data });
        return toStoredTxn(row);
      } catch {
        return null;
      }
    },
    listByStatus: async (status: StoredTxn["status"]): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({ where: { status } });
      return rows.map(toStoredTxn);
    },
    listAll: async (): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany();
      return rows.map(toStoredTxn);
    },
  },

  // ── RESPONSIBLE GAMBLING ──────────────────────────────────────────────────
  responsible: {
    get: async (userId: string): Promise<StoredResponsibleGambling | null> => {
      const r = await pc().responsibleGambling.findUnique({ where: { userId } });
      return r ? toStoredRG(r) : null;
    },
    upsert: async (r: StoredResponsibleGambling): Promise<StoredResponsibleGambling> => {
      const data = {
        dailyDepositLimit: r.dailyDepositLimit,
        weeklyDepositLimit: r.weeklyDepositLimit,
        monthlyDepositLimit: r.monthlyDepositLimit,
        dailyLossLimit: r.dailyLossLimit,
        sessionTimeLimitMin: r.sessionTimeLimitMin,
        realityCheckIntervalMin: r.realityCheckIntervalMin,
        selfExclusionUntil: r.selfExclusionUntil ? new Date(r.selfExclusionUntil) : null,
        coolingOffUntil: r.coolingOffUntil ? new Date(r.coolingOffUntil) : null,
        pendingIncreaseTo: r.pendingIncreaseTo,
        pendingIncreaseEffectiveAt: r.pendingIncreaseEffectiveAt ? new Date(r.pendingIncreaseEffectiveAt) : null,
      };
      const row = await pc().responsibleGambling.upsert({
        where: { userId: r.userId },
        create: { userId: r.userId, ...data },
        update: data,
      });
      return toStoredRG(row);
    },
  },

  // ── BET (legacy sports bets) ──────────────────────────────────────────────
  bet: {
    create: async (b: StoredBet): Promise<StoredBet> => {
      // Legacy: resolve windowId from matchId + windowKind.
      // If window doesn't exist, this is a legacy snapshot — store with minimal data.
      const outcomeMap: Record<string, string> = { home: "HOME_WIN", away: "AWAY_WIN", draw: "DRAW" };
      const window = await pc().window.findFirst({
        where: {
          match: { id: b.matchId },
          kind: b.windowKind as "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT",
        },
        select: { id: true },
      });
      if (!window) throw new Error(`No window for match ${b.matchId} / ${b.windowKind}`);
      const row = await pc().bet.create({
        data: {
          id: b.id,
          userId: b.userId,
          windowId: window.id,
          outcome: (outcomeMap[b.outcome] ?? "HOME_WIN") as "HOME_WIN" | "AWAY_WIN" | "DRAW",
          stake: b.stake,
          potentialReturn: b.potentialReturn,
          poolShareAtPlacement: b.payRateAtPlacement,
          status: b.status,
          returnAmount: b.returnAmount,
          placedAt: new Date(b.placedAt),
          settledAt: b.settledAt ? new Date(b.settledAt) : null,
        },
        include: { window: { include: { match: true } } },
      });
      return toStoredBet(row);
    },
    findById: async (id: string): Promise<StoredBet | null> => {
      const row = await pc().bet.findUnique({
        where: { id },
        include: { window: { include: { match: true } } },
      });
      return row ? toStoredBet(row) : null;
    },
    findByUser: async (userId: string, limit = 100): Promise<StoredBet[]> => {
      const rows = await pc().bet.findMany({
        where: { userId },
        include: { window: { include: { match: true } } },
        orderBy: { placedAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredBet);
    },
    findByMatchAndWindow: async (matchId: string, windowKind: StoredBet["windowKind"]): Promise<StoredBet[]> => {
      const rows = await pc().bet.findMany({
        where: {
          status: "PLACED",
          window: {
            kind: windowKind as "W_0_15" | "W_15_30" | "W_30_45" | "W_45_60" | "W_FT",
            match: { id: matchId },
          },
        },
        include: { window: { include: { match: true } } },
      });
      return rows.map(toStoredBet);
    },
    update: async (id: string, patch: Partial<StoredBet>): Promise<StoredBet | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        if (patch.status) data.status = patch.status;
        if (patch.returnAmount !== undefined) data.returnAmount = patch.returnAmount;
        if (patch.settledAt) data.settledAt = new Date(patch.settledAt);
        const row = await pc().bet.update({
          where: { id },
          data,
          include: { window: { include: { match: true } } },
        });
        return toStoredBet(row);
      } catch {
        return null;
      }
    },
  },

  // ── NOTIFICATION ──────────────────────────────────────────────────────────
  notification: {
    create: async (n: StoredNotification): Promise<StoredNotification> => {
      const row = await pc().notification.create({
        data: {
          id: n.id,
          userId: n.userId,
          channel: "IN_APP",
          event: n.kind,
          kind: n.kind,
          href: n.href,
          titleEn: n.titleEn,
          titleSw: n.titleSw,
          titleZh: n.titleZh ?? null,
          bodyEn: n.bodyEn,
          bodySw: n.bodySw,
          bodyZh: n.bodyZh ?? null,
          readAt: n.readAt ? new Date(n.readAt) : null,
          dismissedAt: n.dismissedAt ? new Date(n.dismissedAt) : null,
          createdAt: new Date(n.createdAt),
        },
      });
      return toStoredNotification(row);
    },
    findByUser: async (userId: string, limit = 50): Promise<StoredNotification[]> => {
      const rows = await pc().notification.findMany({
        where: { userId, dismissedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredNotification);
    },
    countUnread: async (userId: string): Promise<number> => {
      return pc().notification.count({
        where: { userId, readAt: null, dismissedAt: null },
      });
    },
    markRead: async (id: string, userId: string): Promise<StoredNotification | null> => {
      try {
        // Scope to the owner — updateMany on {id, userId} no-ops if the row
        // isn't theirs (an `update` on id alone would mutate any user's row).
        const res = await pc().notification.updateMany({
          where: { id, userId },
          data: { readAt: new Date() },
        });
        if (res.count === 0) return null;
        const row = await pc().notification.findUnique({ where: { id } });
        return row ? toStoredNotification(row) : null;
      } catch {
        return null;
      }
    },
    markAllRead: async (userId: string): Promise<number> => {
      const result = await pc().notification.updateMany({
        where: { userId, readAt: null, dismissedAt: null },
        data: { readAt: new Date() },
      });
      return result.count;
    },
    dismiss: async (id: string, userId: string): Promise<StoredNotification | null> => {
      try {
        // Scope to the owner (see markRead).
        const res = await pc().notification.updateMany({
          where: { id, userId },
          data: { dismissedAt: new Date() },
        });
        if (res.count === 0) return null;
        const row = await pc().notification.findUnique({ where: { id } });
        return row ? toStoredNotification(row) : null;
      } catch {
        return null;
      }
    },
    dismissAll: async (userId: string): Promise<number> => {
      const result = await pc().notification.updateMany({
        where: { userId, dismissedAt: null },
        data: { dismissedAt: new Date() },
      });
      return result.count;
    },
  },

  // ── SOURCE OF FUNDS ───────────────────────────────────────────────────────
  sourceOfFunds: {
    get: async (userId: string): Promise<StoredSourceOfFunds | null> => {
      const row = await pc().sourceOfFunds.findUnique({ where: { userId } });
      return row ? toStoredSOF(row) : null;
    },
    upsert: async (s: StoredSourceOfFunds): Promise<StoredSourceOfFunds> => {
      const data = {
        declaredSource: s.declaredSource,
        declaredOccupation: s.declaredOccupation,
        declaredEmployer: s.declaredEmployer,
        declaredAnnualIncomeBand: s.declaredAnnualIncomeBand,
        declaredOther: s.declaredOther,
        reviewStatus: s.reviewStatus as "PENDING" | "ACCEPTED" | "REJECTED",
        reviewerId: s.reviewerId,
        reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
        submittedAt: new Date(s.submittedAt),
      };
      const row = await pc().sourceOfFunds.upsert({
        where: { userId: s.userId },
        create: { userId: s.userId, ...data },
        update: data,
      });
      return toStoredSOF(row);
    },
    listPending: async (): Promise<StoredSourceOfFunds[]> => {
      const rows = await pc().sourceOfFunds.findMany({
        where: { reviewStatus: "PENDING" },
      });
      return rows.map(toStoredSOF);
    },
  },

  // ── AFFILIATE ─────────────────────────────────────────────────────────────
  affiliate: {
    findByUserId: async (userId: string): Promise<StoredAffiliateAccount | null> => {
      const row = await pc().affiliateAgent.findUnique({ where: { userId } });
      return row ? toStoredAffiliate(row) : null;
    },
    findByCode: async (code: string): Promise<StoredAffiliateAccount | null> => {
      const norm = code.trim().toUpperCase();
      const row = await pc().affiliateAgent.findUnique({ where: { code: norm } });
      return row ? toStoredAffiliate(row) : null;
    },
    create: async (a: StoredAffiliateAccount): Promise<StoredAffiliateAccount> => {
      const row = await pc().affiliateAgent.create({
        data: {
          userId: a.userId,
          code: a.code,
          totalRecruits: a.recruitCount,
          totalCommission: a.totalEarnedTzs,
          createdAt: new Date(a.createdAt),
        },
      });
      return toStoredAffiliate(row);
    },
    update: async (userId: string, patch: Partial<StoredAffiliateAccount>): Promise<StoredAffiliateAccount | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        if (patch.code !== undefined) data.code = patch.code;
        if (patch.recruitCount !== undefined) data.totalRecruits = patch.recruitCount;
        if (patch.totalEarnedTzs !== undefined) data.totalCommission = patch.totalEarnedTzs;
        const row = await pc().affiliateAgent.update({ where: { userId }, data });
        return toStoredAffiliate(row);
      } catch {
        return null;
      }
    },
    list: async (): Promise<StoredAffiliateAccount[]> => {
      const rows = await pc().affiliateAgent.findMany();
      return rows.map(toStoredAffiliate);
    },
  },

  // ── REFERRAL REWARD ───────────────────────────────────────────────────────
  referralReward: {
    create: async (r: StoredReferralReward): Promise<StoredReferralReward> => {
      const row = await pc().referralReward.create({
        data: {
          id: r.id,
          referrerUserId: r.referrerUserId,
          recruitUserId: r.recruitUserId,
          type: r.type,
          label: r.label,
          amountTzs: r.amountTzs,
          status: r.status,
          recipientUserId: r.recipientUserId,
          note: r.note,
          createdAt: new Date(r.createdAt),
        },
      });
      return toStoredReward(row);
    },
    update: async (id: string, patch: Partial<StoredReferralReward>): Promise<StoredReferralReward | null> => {
      try {
        const { createdAt: _c, ...rest } = patch;
        const row = await pc().referralReward.update({ where: { id }, data: rest });
        return toStoredReward(row);
      } catch {
        return null;
      }
    },
    list: async (limit = 500): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredReward);
    },
    listByReferrer: async (referrerUserId: string): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        where: { referrerUserId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredReward);
    },
    listByRecruit: async (recruitUserId: string): Promise<StoredReferralReward[]> => {
      const rows = await pc().referralReward.findMany({
        where: { recruitUserId },
      });
      return rows.map(toStoredReward);
    },
  },

  // ── PROPOSAL ──────────────────────────────────────────────────────────────
  proposal: {
    create: async (p: StoredProposal): Promise<StoredProposal> => {
      const row = await pc().proposal.create({
        data: {
          id: p.id,
          proposerId: p.proposerId,
          titleEn: p.titleEn,
          titleSw: p.titleSw,
          titleZh: p.titleZh,
          description: p.description,
          resolutionCriterion: p.resolutionCriterion,
          category: p.category,
          resolutionDate: p.resolutionDate,
          status: p.status,
          up: p.up,
          down: p.down,
          publishedMarketId: p.publishedMarketId,
          prizePaidTzs: p.prizePaidTzs,
          declineReason: p.declineReason,
          declineNote: p.declineNote,
          changeNote: p.changeNote,
          reviewedBy: p.reviewedBy,
          reviewedAt: p.reviewedAt ? new Date(p.reviewedAt) : null,
          createdAt: new Date(p.createdAt),
        },
      });
      return toStoredProposal(row);
    },
    findById: async (id: string): Promise<StoredProposal | null> => {
      const row = await pc().proposal.findUnique({ where: { id } });
      return row ? toStoredProposal(row) : null;
    },
    findByMarketId: async (marketId: string): Promise<StoredProposal | null> => {
      const row = await pc().proposal.findFirst({
        where: { publishedMarketId: marketId },
      });
      return row ? toStoredProposal(row) : null;
    },
    update: async (id: string, patch: Partial<StoredProposal>): Promise<StoredProposal | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "reviewedAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await pc().proposal.update({ where: { id }, data });
        return toStoredProposal(row);
      } catch {
        return null;
      }
    },
    list: async (limit = 1000): Promise<StoredProposal[]> => {
      const rows = await pc().proposal.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredProposal);
    },
    listByProposer: async (proposerId: string): Promise<StoredProposal[]> => {
      const rows = await pc().proposal.findMany({
        where: { proposerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredProposal);
    },
  },

  // ── PROPOSAL VOTE ─────────────────────────────────────────────────────────
  proposalVote: {
    get: async (proposalId: string, userId: string): Promise<StoredProposalVote | null> => {
      const row = await pc().proposalVote.findUnique({
        where: { proposalId_userId: { proposalId, userId } },
      });
      return row ? toStoredVote(row) : null;
    },
    set: async (v: StoredProposalVote): Promise<StoredProposalVote> => {
      const dir = v.dir.toUpperCase() as "UP" | "DOWN";
      const row = await pc().proposalVote.upsert({
        where: { proposalId_userId: { proposalId: v.proposalId, userId: v.userId } },
        create: {
          proposalId: v.proposalId,
          userId: v.userId,
          dir,
          createdAt: new Date(v.createdAt),
        },
        update: { dir },
      });
      return toStoredVote(row);
    },
    delete: async (proposalId: string, userId: string): Promise<void> => {
      await pc().proposalVote.deleteMany({
        where: { proposalId, userId },
      });
    },
    listByProposal: async (proposalId: string): Promise<StoredProposalVote[]> => {
      const rows = await pc().proposalVote.findMany({
        where: { proposalId },
      });
      return rows.map(toStoredVote);
    },
  },

  // ── BONUS GRANT ───────────────────────────────────────────────────────────
  bonusGrant: {
    create: async (g: StoredBonusGrant): Promise<StoredBonusGrant> => {
      const row = await pc().bonusGrant.create({
        data: {
          id: g.id,
          userId: g.userId,
          walletId: g.walletId,
          amountTzs: g.amountTzs,
          remainingTzs: g.remainingTzs,
          wagerMultiplier: g.wagerMultiplier,
          wagerRequiredTzs: g.wagerRequiredTzs,
          wageredTzs: g.wageredTzs,
          source: g.source,
          sourceRef: g.sourceRef,
          status: g.status,
          expiresAt: g.expiresAt ? new Date(g.expiresAt) : null,
          fulfilledAt: g.fulfilledAt ? new Date(g.fulfilledAt) : null,
          note: g.note,
          createdAt: new Date(g.createdAt),
        },
      });
      return toStoredBonusGrant(row);
    },
    findById: async (id: string): Promise<StoredBonusGrant | null> => {
      const row = await pc().bonusGrant.findUnique({ where: { id } });
      return row ? toStoredBonusGrant(row) : null;
    },
    findBySourceRef: async (sourceRef: string): Promise<StoredBonusGrant | null> => {
      const row = await pc().bonusGrant.findFirst({ where: { sourceRef } });
      return row ? toStoredBonusGrant(row) : null;
    },
    update: async (id: string, patch: Partial<StoredBonusGrant>): Promise<StoredBonusGrant | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "expiresAt" || k === "fulfilledAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await pc().bonusGrant.update({ where: { id }, data });
        return toStoredBonusGrant(row);
      } catch {
        return null;
      }
    },
    listByUser: async (userId: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredBonusGrant);
    },
    listActiveByUser: async (userId: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }, // FIFO
      });
      return rows.map(toStoredBonusGrant);
    },
    listExpired: async (nowIso: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { status: "ACTIVE", expiresAt: { lt: new Date(nowIso) } },
      });
      return rows.map(toStoredBonusGrant);
    },
    listByStatus: async (status: BonusGrantStatus): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({ where: { status } });
      return rows.map(toStoredBonusGrant);
    },
    listAll: async (limit = 1000): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toStoredBonusGrant);
    },
  },

  // ── INVITE CAMPAIGN ───────────────────────────────────────────────────────
  inviteCampaign: {
    create: async (c: StoredInviteCampaign): Promise<StoredInviteCampaign> => {
      const row = await pc().inviteCampaign.create({
        data: {
          id: c.id, code: c.code, name: c.name,
          bonusAmountTzs: c.bonusAmountTzs, wagerMultiplier: c.wagerMultiplier,
          expiresInDays: c.expiresInDays, messageEn: c.messageEn, messageSw: c.messageSw,
          status: c.status, totalInvites: c.totalInvites, totalRegistered: c.totalRegistered,
          createdById: c.createdById, createdAt: new Date(c.createdAt),
        },
      });
      return toStoredInviteCampaign(row);
    },
    findById: async (id: string): Promise<StoredInviteCampaign | null> => {
      const row = await pc().inviteCampaign.findUnique({ where: { id } });
      return row ? toStoredInviteCampaign(row) : null;
    },
    findByCode: async (code: string): Promise<StoredInviteCampaign | null> => {
      const row = await pc().inviteCampaign.findUnique({ where: { code: code.trim().toUpperCase() } });
      return row ? toStoredInviteCampaign(row) : null;
    },
    update: async (id: string, patch: Partial<StoredInviteCampaign>): Promise<StoredInviteCampaign | null> => {
      try {
        const { createdAt: _c, updatedAt: _u, ...rest } = patch;
        const row = await pc().inviteCampaign.update({ where: { id }, data: rest });
        return toStoredInviteCampaign(row);
      } catch {
        return null;
      }
    },
    incrementCounters: async (id: string, deltas: { invites?: number; registered?: number }): Promise<StoredInviteCampaign | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {};
        if (deltas.invites !== undefined) data.totalInvites = { increment: deltas.invites };
        if (deltas.registered !== undefined) data.totalRegistered = { increment: deltas.registered };
        const row = await pc().inviteCampaign.update({ where: { id }, data });
        return toStoredInviteCampaign(row);
      } catch {
        return null;
      }
    },
    list: async (limit = 500): Promise<StoredInviteCampaign[]> => {
      const rows = await pc().inviteCampaign.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toStoredInviteCampaign);
    },
  },

  // ── INVITE ENTRY ──────────────────────────────────────────────────────────
  inviteEntry: {
    create: async (e: StoredInviteEntry): Promise<StoredInviteEntry> => {
      const row = await pc().inviteEntry.create({
        data: {
          id: e.id, campaignId: e.campaignId, contactType: e.contactType,
          contactValue: e.contactValue, bonusAmountTzs: e.bonusAmountTzs, status: e.status,
          sentAt: e.sentAt ? new Date(e.sentAt) : null,
          registeredUserId: e.registeredUserId, bonusGrantId: e.bonusGrantId,
          failureReason: e.failureReason, createdAt: new Date(e.createdAt),
        },
      });
      return toStoredInviteEntry(row);
    },
    findById: async (id: string): Promise<StoredInviteEntry | null> => {
      const row = await pc().inviteEntry.findUnique({ where: { id } });
      return row ? toStoredInviteEntry(row) : null;
    },
    findByCampaign: async (campaignId: string): Promise<StoredInviteEntry[]> => {
      const rows = await pc().inviteEntry.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } });
      return rows.map(toStoredInviteEntry);
    },
    findByCampaignAndContact: async (campaignId: string, contactValue: string): Promise<StoredInviteEntry | null> => {
      const row = await pc().inviteEntry.findUnique({ where: { campaignId_contactValue: { campaignId, contactValue } } });
      return row ? toStoredInviteEntry(row) : null;
    },
    update: async (id: string, patch: Partial<StoredInviteEntry>): Promise<StoredInviteEntry | null> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt") continue;
          if (k === "sentAt") data[k] = v ? new Date(v as string) : null;
          else data[k] = v;
        }
        const row = await pc().inviteEntry.update({ where: { id }, data });
        return toStoredInviteEntry(row);
      } catch {
        return null;
      }
    },
  },
};
