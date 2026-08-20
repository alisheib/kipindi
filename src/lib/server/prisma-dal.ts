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
import type { PrismaClient, Prisma } from "@prisma/client";

// A money-path write can pass a Prisma transaction client (audit C3) so the
// wallet mutation, its Transaction row, and its ledger entries commit together
// (see withMoneyTx in ledger.ts). When omitted, the method self-commits as
// before. `PrismaClient` is assignable to `TransactionClient` (it has a superset
// of the model delegates), so `tx ?? pc()` is well-typed for the model calls.
type Db = Prisma.TransactionClient | PrismaClient;
import {
  summarise, GATEWAY_TYPES, STUCK_PROCESSING_MS,
  type TxnSearchFilters, type TxnSearchResult,
} from "./txn-filters";
import { sniffBase64ImageMime } from "./image-signature";
import type {
  StoredUser,
  StoredKyc,
  StoredOtp,
  StoredWallet,
  StoredTxn,
  StoredResponsibleGambling,
  StoredNotification,
  StoredSourceOfFunds,
  StoredAffiliateAccount,
  StoredReferralReward,
  StoredProposal,
  StoredObjection,
  StoredProposalVote,
  StoredPushSub,
  StoredEvent,
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
export function toStoredKyc(row: any): StoredKyc {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    rejectReason: row.rejectReason ?? null,
    rejectNote: row.rejectNote,
    idType: row.idType ?? null,
    idNumber: row.idNumber ?? null,
    // ⚠️ DATE ONLY, and that is not cosmetic. `idExpiry` is a calendar day printed
    // on a document, stored at UTC midnight; `iso()` returns a full timestamp,
    // and this laptop is EAT (+3), so rendering the timestamp shows the day
    // BEFORE the one on the passport. Every consumer wants the day.
    idExpiry: row.idExpiry ? iso(row.idExpiry)?.slice(0, 10) ?? null : null,
    idVerifiedAt: iso(row.idVerifiedAt),
    idFingerprint: row.idFingerprint ?? null,
    fullName: row.fullName,
    dob: iso(row.dob),
    // 🔴 `mimeType`/`sizeBytes` MUST be carried back out. `db.kyc.upsert` syncs
    // documents by deleting and re-creating every row from the StoredKyc it is
    // handed, and every caller builds that StoredKyc by reading here first. Drop
    // the two columns on the way out and the next write re-derives them from the
    // storageKey — which only parses as a data URL, so every `r2:<key>` was
    // rewritten as `application/octet-stream` / `0`. attachDocument measured the
    // real bytes; submitForReview then erased the measurement. Measured on
    // production 2026-07-31: all 19 R2 rows 0 bytes while holding real JPEGs,
    // every legacy inline row correct. The write half was fixed in 502160f — this
    // read half is what made that fix invisible. Campaign §6 E-3.
    documents: (row.documents ?? []).map(
      (d: { docType: string; storageKey: string; uploadedAt: Date; mimeType?: string | null; sizeBytes?: number | null }) => ({
        docType: d.docType,
        storageKey: d.storageKey,
        uploadedAt: iso(d.uploadedAt)!,
        ...(d.mimeType ? { mimeType: d.mimeType } : {}),
        ...(typeof d.sizeBytes === "number" ? { sizeBytes: d.sizeBytes } : {}),
      }),
    ),
    reviewerId: row.reviewerId,
    reviewedAt: iso(row.reviewedAt),
    submittedAt: iso(row.submittedAt),
    extraRequests: Array.isArray(row.extraRequests) ? row.extraRequests : [],
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
  };
}

/** Document type codes accepted by the `KycDocType` Prisma enum. */
type KycDocTypeName = "NIDA" | "NIDA_FRONT" | "NIDA_BACK" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | "SELFIE";

/**
 * Build the `KycDocument` rows for a submission.
 *
 * Extracted from `db.kyc.upsert` so the read→write round trip can be tested
 * directly: `toStoredKyc` feeds this, and this feeds the table those rows came
 * from, so any field either half drops shows up as a lossy round trip rather
 * than as silently wrong data in a compliance export.
 *
 * Precedence for the two byte-facts, strongest evidence first:
 *   1. the storageKey itself, when it is an inline data URL — the bytes ARE
 *      right there, so measuring beats any stored column;
 *   2. `mimeType`/`sizeBytes` carried on the StoredKyc — magic-byte sniffed by
 *      `validateDocImage` at upload. This is the ONLY evidence for an
 *      `r2:<key>`, whose bytes live in a bucket and cannot be measured here;
 *   3. `application/octet-stream` / `0` — the honest "we do not know".
 */
export function toKycDocumentRows(
  submissionId: string,
  documents: StoredKyc["documents"],
): { submissionId: string; docType: KycDocTypeName; storageKey: string; mimeType: string; sizeBytes: number; uploadedAt: Date }[] {
  return documents.map((d) => {
    const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(d.storageKey ?? "");
    const b64 = m?.[2] ?? "";
    const derivedBytes = m
      ? Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0)
      : 0;
    return {
      submissionId,
      docType: d.docType as KycDocTypeName,
      storageKey: d.storageKey,
      // ⛔ A MEASUREMENT BEATS A COLUMN, AND A COLUMN BEATS A LABEL — in that order.
      //
      // For an INLINE document the bytes are right there, so both facts are MEASURED
      // fresh: the mime is magic-byte sniffed from the decoded head (`sniffBase64ImageMime`,
      // the same D2 instrument `validateDocImage` uses) and the size is counted from the
      // base64 itself. A stale or wrong stored column cannot survive when the truth is in
      // hand. For an `r2:<key>` the bytes live in a bucket and cannot be measured here, so
      // the stored column — sniffed by `validateDocImage` at upload — is the only evidence.
      //
      // `m?.[1]`, the mime **label** parsed back out of the data URL, is trusted NOWHERE:
      // it is the string the UPLOADER supplied, and D2 exists because a malicious file can
      // carry an image mime label past a naive check. Sniffing the actual bytes is what
      // keeps "measured wins" from re-opening that hole — an inline doc whose bytes are
      // not a supported image falls through to the stored column, never to the label.
      //
      // ⚠️ Do NOT write an image mime with a wildcard in this comment. `test:cert-d2` strips
      // comments with a naive regex, so the two characters that begin a block comment OPEN one
      // for the stripper and swallow the code below — the gate then reports this very line as
      // missing while it sits here correctly. Same shape as the `--m-*` trap in needle.css.
      mimeType: (m ? sniffBase64ImageMime(b64) : null) ?? d.mimeType ?? "application/octet-stream",
      // Inline → the measured count, always (base64 arithmetic, padding-corrected — the
      // same figure `validateDocImage` reports). R2 → the stored column, `??` and not `||`
      // so a genuine 0-byte reading survives; no evidence at all → the honest 0.
      sizeBytes: m ? derivedBytes : (d.sizeBytes ?? 0),
      uploadedAt: new Date(d.uploadedAt),
    };
  });
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
    providerStatus: t.providerStatus ?? null,
    payoutRail: t.payoutRail ?? null,
    msisdn: t.msisdn,
    description: t.description,
    positionId: t.positionId,
    amlReason: t.amlReason,
    createdAt: iso(t.createdAt)!,
    updatedAt: iso(t.updatedAt)!,
    completedAt: iso(t.completedAt),
    idempotencyKey: t.idempotencyKey ?? null,
    pendingNotifiedAt: iso(t.pendingNotifiedAt),
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
    selfExclusionStartedAt: iso(r.selfExclusionStartedAt),
    coolingOffStartedAt: iso(r.coolingOffStartedAt),
    pendingIncreaseTo: numOrNull(r.pendingIncreaseTo),
    pendingIncreaseEffectiveAt: iso(r.pendingIncreaseEffectiveAt),
    pendingWeeklyIncreaseTo: numOrNull(r.pendingWeeklyIncreaseTo),
    pendingWeeklyIncreaseEffectiveAt: iso(r.pendingWeeklyIncreaseEffectiveAt),
    pendingMonthlyIncreaseTo: numOrNull(r.pendingMonthlyIncreaseTo),
    pendingMonthlyIncreaseEffectiveAt: iso(r.pendingMonthlyIncreaseEffectiveAt),
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredObjection(o: any): StoredObjection {
  return {
    id: o.id,
    marketId: o.marketId,
    userId: o.userId,
    reason: o.reason as StoredObjection["reason"],
    detail: o.detail,
    status: o.status as StoredObjection["status"],
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    reviewedBy: o.reviewedBy ?? null,
    reviewedAt: o.reviewedAt ? new Date(o.reviewedAt).toISOString() : null,
    reviewNote: o.reviewNote ?? null,
    remedy: (o.remedy ?? null) as StoredObjection["remedy"],
    outcomeAtFiling: o.outcomeAtFiling ?? null,
  };
}

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
    selectionCloseDate: p.selectionCloseDate ?? null,
    sourceUrl: p.sourceUrl ?? null,
    status: p.status,
    up: p.up,
    down: p.down,
    publishedMarketId: p.publishedMarketId,
    bonusGrantedTzs: num(p.bonusGrantedTzs),
    bonusGrantId: p.bonusGrantId ?? null,
    approvedAt: iso(p.approvedAt),
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredEvent(r: any): StoredEvent {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    startsAt: iso(r.startsAt)!,
    sourceUrl: r.sourceUrl,
    note: r.note ?? null,
    generatedAt: iso(r.generatedAt) ?? null,
    aiPollId: r.aiPollId ?? null,
    addedBy: r.addedBy,
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

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
      // CASE-INSENSITIVE, and that is load-bearing on Postgres.
      //
      // This was an exact match against a lower-cased needle. Postgres compares
      // text case-sensitively, so any stored address carrying an uppercase
      // character (an admin-set address, a PHONE_EMAIL_MAP entry, anything
      // written before normalisation) became invisible to this lookup. Two
      // real consequences, both money-facing:
      //   1. that player could never sign in with their email again, and
      //   2. the one-account-per-email guard — which is enforced HERE, in app
      //      code, because there is no DB unique index — could be walked
      //      straight past with different casing. One inbox could then open
      //      unlimited depositing accounts, which makes the email deposit gate
      //      decorative and per-account RG limits / self-exclusion evadable.
      // The in-memory Map lower-cases on the way in, so this only ever bit on
      // real Postgres — i.e. only in production.
      // (`email @unique` is deliberately absent: adding the index to the live
      // money DB could fail `migrate deploy` and take prod down if a duplicate
      // already exists. It is a follow-up once prod is confirmed clean.)
      const u = await pc().user.findFirst({ where: { email: { equals: norm, mode: "insensitive" } } });
      return u ? toStoredUser(u) : null;
    },
    /**
     * EVERY account on an address, oldest first — because `findByEmail` above
     * cannot tell "the account" from "an account".
     *
     * `email` has no unique index (see the note above), so an address CAN hold
     * several accounts, and production does: four on one address. A caller that
     * needs to identify a specific user — sign-in — must see the whole set and
     * disambiguate deliberately, not accept whichever row the heap offered.
     * Ordered so the set is stable between calls; capped because the only
     * caller runs on an unauthenticated endpoint and does password work per row.
     */
    findAllByEmail: async (email: string, cap = 5): Promise<StoredUser[]> => {
      const norm = email.trim().toLowerCase();
      if (!norm) return [];
      const rows = await pc().user.findMany({
        where: { email: { equals: norm, mode: "insensitive" } },
        orderBy: { createdAt: "asc" },
        take: cap,
      });
      return rows.map(toStoredUser);
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
    /** COUNT(*) — no rows materialised (audit H4/M5). */
    count: async (): Promise<number> => pc().user.count(),
    /** Users holding any of `roles` — indexed on role; avoids the full-scan
     *  list().filter() officer lookups (audit M5). */
    listByRoles: async (roles: string[], select?: { id: true; email?: true }): Promise<StoredUser[]> => {
      void select; // return full rows so callers keep the StoredUser shape
      const rows = await pc().user.findMany({ where: { role: { in: roles as never } } });
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
        idType: (k.idType ?? null) as "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | null,
        idNumber: k.idNumber ?? null,
        // Stored at UTC midnight so the day on the document is the day in the
        // column, whatever zone the reader is in.
        idExpiry: k.idExpiry ? new Date(`${k.idExpiry.slice(0, 10)}T00:00:00.000Z`) : null,
        idVerifiedAt: k.idVerifiedAt ? new Date(k.idVerifiedAt) : null,
        idFingerprint: k.idFingerprint ?? null,
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
      // Sync documents: delete existing, re-create from StoredKyc.
      // `?.` is deliberate: a KYC submission arriving without a documents array
      // (an older/partial record, or a caller that omitted it) must degrade to
      // "no documents to sync", not throw out of the KYC write path.
      if (k.documents?.length) {
        const docsData = toKycDocumentRows(k.id, k.documents);
        // Atomic delete + re-create so a mid-sync failure can't leave the
        // submission with zero documents (the in-memory store is atomic here).
        await pc().$transaction([
          pc().kycDocument.deleteMany({ where: { submissionId: k.id } }),
          pc().kycDocument.createMany({ data: docsData }),
        ]);
      }
      // Re-fetch with documents
      const full = await pc().kycSubmission.findUnique({
        where: { id: k.id },
        include: { documents: true },
      });
      return toStoredKyc(full ?? row);
    },
    // ⚠️ `findByNida` / `findActiveByNida` LIVED HERE UNTIL 2026-08-20, and were the
    // ONLY readers of the deprecated `nidaNumber` column anywhere in the platform —
    // which is why "read by nothing" was true of PRODUCT code and never of the store
    // layer, and why the guard that claimed to prove it had to exempt this file.
    // They had zero callers from the day `findActiveByIdNumber` below shipped.
    // ⛔ Deleted with the column. Do not reinstate a number-only duplicate read: it
    // refuses a passport for sharing digits with a NIDA, and it lets one human hold
    // two accounts on two different documents.
    /**
     * 🔴 ONE DOCUMENT, ONE ACCOUNT — across all four identity types.
     *
     * Indexed by `@@index([idType, idNumber])`, and deliberately a tiny `select` so
     * it never hydrates the base64 KYC images (audit H5: ~1.2 TB pulled per
     * submission at scale — the defect the deleted NIDA read was itself written to
     * fix, which is why the shape is worth keeping now that it is the only one).
     *
     * ⛔ This is the FAST PATH. The enforcement is the partial unique index
     * "KycSubmission_idType_idNumber_active_key"; the two must ask the same
     * question — the same pair, the same `status <> REJECTED` exclusion — or a
     * race resolves differently from a sequential duplicate.
     */
    findActiveByIdNumber: async (
      idType: string,
      idNumber: string,
      excludeUserId?: string,
    ): Promise<{ userId: string; status: string } | null> => {
      const norm = idNumber.trim();
      if (!norm || !idType) return null;
      const row = await pc().kycSubmission.findFirst({
        where: {
          idType: idType as "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD",
          idNumber: norm,
          status: { not: "REJECTED" },
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        select: { userId: true, status: true },
      });
      return row ? { userId: row.userId, status: String(row.status) } : null;
    },
    /**
     * 🔴 THE SAME CONTROL, ON THE VALUE THAT SURVIVES ERASURE — see the in-memory twin.
     *
     * Indexed by `@@index([idFingerprint])`, and the same tiny `select` as the tuple read
     * so it never hydrates a document (audit H5). ⛔ FAST PATH ONLY: the enforcement is
     * "KycSubmission_idFingerprint_active_key", and the two must ask the same question —
     * the same `status <> REJECTED` exclusion — or a race resolves differently from a
     * sequential duplicate.
     */
    findActiveByFingerprint: async (
      fingerprint: string,
      excludeUserId?: string,
    ): Promise<{ userId: string; status: string } | null> => {
      const fp = fingerprint.trim();
      if (!fp) return null;
      const row = await pc().kycSubmission.findFirst({
        where: {
          idFingerprint: fp,
          status: { not: "REJECTED" },
          ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        select: { userId: true, status: true },
      });
      return row ? { userId: row.userId, status: String(row.status) } : null;
    },
    /**
     * EVERY submission this user has ever made, newest first.
     *
     * ⛔ NOT `findByUserId`, which returns the newest ONE. Erasure that reads the newest
     * leaves the number, name and date of birth on every earlier submission, and a
     * resubmission after a rejection is the ordinary case.
     */
    listByUser: async (userId: string): Promise<StoredKyc[]> => {
      const rows = await pc().kycSubmission.findMany({
        where: { userId },
        include: { documents: true },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredKyc);
    },
    /**
     * Drop every document row on a submission. Erasure only.
     *
     * ⛔ `upsert` CANNOT DO THIS — its document sync is guarded by `if (k.documents?.length)`,
     * so an empty array is a no-op rather than a delete. The R2 objects are destroyed
     * separately by `deleteKycDocument`; this removes the rows that point at them.
     */
    deleteDocuments: async (submissionId: string): Promise<number> => {
      const res = await pc().kycDocument.deleteMany({ where: { submissionId } });
      return res.count;
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
    /**
     * Delete OTP rows issued before `beforeIso`. Returns the count removed.
     *
     * An OTP hash is credential material with no value once its window has passed. 30 days
     * from issue is the figure already published on /admin/retention, so wiring this makes an
     * existing statement true rather than creating a new one.
     *
     * ⚠️ Prunes on `createdAt`, not `expiresAt`: the retention promise is measured from
     * ISSUE, and an OTP that was never consumed still expires minutes after issue — keying on
     * expiry would make the published period meaningless.
     */
    pruneOlderThan: async (beforeIso: string): Promise<number> => {
      const res = await pc().otp.deleteMany({
        where: { createdAt: { lt: new Date(beforeIso) } },
      });
      return res.count;
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
    /**
     * Delete every OTP row issued to a phone number. Erasure only.
     *
     * `Otp.phoneE164` is the number itself, not a reference to the user, so tombstoning
     * `User.phoneE164` leaves it behind. The 30-day prune reaches it eventually; erasure
     * is not "eventually".
     */
    deleteAllForPhone: async (phone: string): Promise<number> => {
      const res = await pc().otp.deleteMany({ where: { phoneE164: phone } });
      return res.count;
    },
  },

  // ── WALLET ────────────────────────────────────────────────────────────────
  wallet: {
    // tx (bet-stake single-tx): a read issued INSIDE an open money $transaction
    // must run on the tx client — the pooled client would borrow a second
    // connection per in-flight bet (pool-exhaustion risk under load) and would
    // not see the tx's own uncommitted writes.
    findByUserId: async (userId: string, tx?: Prisma.TransactionClient | null): Promise<StoredWallet | null> => {
      const w = await (tx ?? pc()).wallet.findUnique({ where: { userId } });
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
      tx?: Prisma.TransactionClient | null,
    ): Promise<StoredWallet | null> => {
      // In tx mode (a money $transaction, audit C3) a DB error must PROPAGATE so
      // the whole transaction rolls back — never swallow it to null, or the caller
      // would commit a half-written movement. A guard failure / missing row still
      // returns null; the caller throws on that to abort the tx. Self-committing
      // mode (no tx) keeps the original catch → null contract.
      const db: Db = tx ?? pc();
      const run = async (): Promise<StoredWallet | null> => {
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
        const res = await db.wallet.updateMany({ where, data });
        if (res.count === 0) return null;
        const row = await db.wallet.findUnique({ where: { id } });
        return row ? toStoredWallet(row) : null;
      };
      if (tx) return run(); // let a guard failure / db error propagate to roll back the tx
      try { return await run(); } catch { return null; }
    },
  },

  // ── TRANSACTION ───────────────────────────────────────────────────────────
  txn: {
    create: async (t: StoredTxn, tx?: Prisma.TransactionClient | null): Promise<StoredTxn> => {
      const db: Db = tx ?? pc();
      const row = await db.transaction.create({
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
          positionId: t.positionId,
          amlReason: t.amlReason,
          createdAt: new Date(t.createdAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
          idempotencyKey: t.idempotencyKey ?? null,
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
    update: async (id: string, patch: Partial<StoredTxn>, tx?: Prisma.TransactionClient | null): Promise<StoredTxn | null> => {
      const db: Db = tx ?? pc();
      const run = async (): Promise<StoredTxn | null> => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === "createdAt" || k === "updatedAt") continue;
          if (k === "completedAt" || k === "pendingNotifiedAt") {
            data[k] = v ? new Date(v as string) : null;
          } else {
            data[k] = v;
          }
        }
        const row = await db.transaction.update({ where: { id }, data });
        return toStoredTxn(row);
      };
      // In tx mode, let the error propagate to roll back; otherwise keep catch → null.
      if (tx) return run();
      try { return await run(); } catch { return null; }
    },
    listByStatus: async (status: StoredTxn["status"]): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({ where: { status } });
      return rows.map(toStoredTxn);
    },
    listAll: async (): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany();
      return rows.map(toStoredTxn);
    },
    /**
     * Every transaction in `[fromMs, toMs)`, filtered in SQL.
     *
     * 🔴 WHY THIS EXISTS. `listAll()` pulls the entire transactions table into memory and
     * 13 call sites then filtered it by date in JavaScript. Measured on a seeded database
     * of 1,000 users × 100 transactions (`scripts/load/s13-scale-ceilings.mts`):
     *
     *     listAll() + filter in JS   3,176 ms   333 MB heap
     *     the same window in SQL        48 ms   ~0
     *
     * 66× slower, and the 333 MB is the part that actually ends the process — a Railway
     * container has 512 MB. The adjacent `search()` has always done it correctly and its
     * own comment says this table "must never be walked in memory"; the reporting paths
     * simply never used it.
     *
     * Bounds match `within()` in report-money.ts exactly — `>= from`, `< to` — because
     * these replace that filter and an off-by-one at a month boundary moves money between
     * two statutory reports.
     */
    listInRange: async (fromMs: number, toMs: number): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: { createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toStoredTxn);
    },
    /**
     * All-time stakes and payouts per user, aggregated in the database, top `limit` by
     * margin. Replaces a whole-table walk that grouped in JavaScript.
     *
     * Genuinely all-time — there is no window to push down — so the answer is a GROUP BY
     * rather than a smaller scan. `limit` is what keeps it bounded.
     */
    topContributors: async (limit: number): Promise<Array<{ userId: string; stakes: number; payouts: number }>> => {
      const rows = await pc().$queryRawUnsafe<
        Array<{ userId: string; stakes: string; payouts: string }>
      >(
        `select "userId",
                coalesce(sum(case when "type" = 'BET_PLACED' then abs("amount") else 0 end), 0)::text as "stakes",
                coalesce(sum(case when "type" in ('BET_PAYOUT', 'CASHOUT') then abs("amount") else 0 end), 0)::text as "payouts"
           from "public"."Transaction"
          where "status" = 'CONFIRMED'
            and "type" in ('BET_PLACED', 'BET_PAYOUT', 'CASHOUT')
          group by "userId"
          order by (coalesce(sum(case when "type" = 'BET_PLACED' then abs("amount") else 0 end), 0)
                  - coalesce(sum(case when "type" in ('BET_PAYOUT', 'CASHOUT') then abs("amount") else 0 end), 0)) desc
          limit $1`,
        limit,
      );
      return rows.map((r) => ({ userId: r.userId, stakes: Number(r.stakes), payouts: Number(r.payouts) }));
    },
    /** Every transaction for ONE user. Was `listAll().filter(t => t.userId === id)`. */
    listForUser: async (userId: string): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
      return rows.map(toStoredTxn);
    },
    /** Filtered + paginated transaction search for the compliance browser.
     *  Filtering/sorting/pagination are pushed into SQL — this table is the
     *  largest on a money platform and must never be walked in memory. The
     *  summary totals cover the WHOLE filtered set (a second, page-independent
     *  pass), because an operator reconciling against a gateway statement needs
     *  the full figure, not the page's. Rules mirror `txn-filters.ts`; the
     *  search tests assert the two DALs agree. */
    search: async (f: TxnSearchFilters = {}): Promise<TxnSearchResult> => {
      const and: Prisma.TransactionWhereInput[] = [];
      if (f.types?.length) and.push({ type: { in: [...f.types] } as never });
      if (f.statuses?.length) and.push({ status: { in: [...f.statuses] } as never });
      if (f.providers?.length) and.push({ provider: { in: [...f.providers] } as never });
      if (f.fromMs != null) and.push({ createdAt: { gte: new Date(f.fromMs) } });
      if (f.toMs != null) and.push({ createdAt: { lt: new Date(f.toMs) } });
      if (f.q) {
        const q = f.q.trim();
        and.push({ OR: [
          { id: { contains: q, mode: "insensitive" } },
          { providerRef: { contains: q, mode: "insensitive" } },
          { msisdn: { contains: q, mode: "insensitive" } },
          { userId: { contains: q, mode: "insensitive" } },
        ] });
      }
      // "Needs attention" = unreconciled (confirmed gateway money with no ref)
      // OR awaiting AML OR still in flight. Mirrors attentionOf()'s warn levels.
      if (f.attentionOnly) {
        and.push({ OR: [
          { AND: [{ type: { in: [...GATEWAY_TYPES] } as never }, { status: "CONFIRMED" as never }, { providerRef: null }] },
          { status: "AML_REVIEW" as never },
          { AND: [{ status: "PROCESSING" as never }, { createdAt: { lt: new Date(Date.now() - STUCK_PROCESSING_MS) } }] },
        ] });
      }
      const finalWhere: Prisma.TransactionWhereInput = and.length ? { AND: and } : {};

      const field = f.sort?.field ?? "createdAt";
      const dir = f.sort?.dir ?? "desc";
      const orderBy: Prisma.TransactionOrderByWithRelationInput =
        field === "amount" ? { amount: dir }
        : field === "type" ? { type: dir }
        : field === "status" ? { status: dir }
        : field === "provider" ? { provider: dir }
        : { createdAt: dir };

      const take = Math.max(1, Math.min(f.take ?? 50, 500));
      const skip = Math.max(0, f.skip ?? 0);
      const [rows, total, allForSummary] = await Promise.all([
        pc().transaction.findMany({ where: finalWhere, orderBy, skip, take }),
        pc().transaction.count({ where: finalWhere }),
        // Summary needs every matching row's type/status/amount/fee/providerRef.
        // Selected narrowly so this stays cheap even on a large filtered set.
        pc().transaction.findMany({
          where: finalWhere,
          select: { type: true, status: true, amount: true, fee: true, providerRef: true },
        }),
      ]);
      const summary = summarise(allForSummary.map((r) => ({
        type: r.type, status: r.status, amount: Number(r.amount), fee: Number(r.fee),
        providerRef: r.providerRef, createdAt: new Date().toISOString(),
      }) as unknown as StoredTxn));
      return { rows: rows.map(toStoredTxn), total, summary };
    },
    findByIdempotencyKey: async (key: string): Promise<StoredTxn | null> => {
      const row = await pc().transaction.findUnique({ where: { idempotencyKey: key } });
      return row ? toStoredTxn(row) : null;
    },
    sumDepositsSince: async (userId: string, sinceMs: number, includePending = false): Promise<number> => {
      const result = await pc().transaction.aggregate({
        where: {
          userId,
          type: "DEPOSIT",
          // includePending counts in-flight PROCESSING deposits so a concurrent
          // deposit is visible to the RG cap / SOF gate (audit C4). Default is
          // confirmed-only for the player-facing dashboard.
          status: includePending ? { in: ["CONFIRMED", "PROCESSING"] } : "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    sumGamblingNetSince: async (userId: string, sinceMs: number, tx?: Prisma.TransactionClient | null): Promise<number> => {
      const result = await (tx ?? pc()).transaction.aggregate({
        where: {
          userId,
          type: { in: ["BET_PLACED", "BET_PAYOUT", "BET_REFUND", "CASHOUT"] },
          status: "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Per-user Σ of CONFIRMED signed amounts across the given txn types since a
     *  cutoff — a DB-side aggregate (no row loading, no row-count cap). Powers the
     *  player "Your activity" summary (staked/won/deposits/withdrawals). Returns
     *  the SIGNED sum (BET_PLACED / WITHDRAWAL are negative money-out). */
    sumUserByTypesSince: async (userId: string, sinceMs: number, types: StoredTxn["type"][]): Promise<number> => {
      if (types.length === 0) return 0;
      const result = await pc().transaction.aggregate({
        where: {
          userId,
          type: { in: types },
          status: "CONFIRMED",
          createdAt: { gte: new Date(sinceMs) },
        },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Platform-wide Σ of CONFIRMED amounts across the given txn types — a DB-side
     *  aggregate (no row loading), for marketing stats like the landing "paid out"
     *  band. BET_PAYOUT/CASHOUT are stored positive, so this equals the abs-sum. */
    sumConfirmedByTypes: async (types: StoredTxn["type"][]): Promise<number> => {
      if (types.length === 0) return 0;
      const result = await pc().transaction.aggregate({
        where: { status: "CONFIRMED", type: { in: types } },
        _sum: { amount: true },
      });
      return Number(result._sum.amount ?? 0);
    },
    /** Transactions created since `sinceMs` (optionally filtered to `types`) — a
     *  windowed DB query so time-bounded analytics (MNO health, reconciliation)
     *  load only the window, not every row. */
    listSince: async (sinceMs: number, opts?: { types?: StoredTxn["type"][] }): Promise<StoredTxn[]> => {
      const rows = await pc().transaction.findMany({
        where: {
          createdAt: { gte: new Date(sinceMs) },
          ...(opts?.types && opts.types.length ? { type: { in: opts.types } } : {}),
        },
      });
      return rows.map(toStoredTxn);
    },
  },

  // ── RESPONSIBLE GAMBLING ──────────────────────────────────────────────────
  responsible: {
    get: async (userId: string): Promise<StoredResponsibleGambling | null> => {
      const r = await pc().responsibleGambling.findUnique({ where: { userId } });
      return r ? toStoredRG(r) : null;
    },
    listAll: async (): Promise<StoredResponsibleGambling[]> => {
      const rows = await pc().responsibleGambling.findMany();
      return rows.map(toStoredRG);
    },
    upsert: async (r: StoredResponsibleGambling): Promise<StoredResponsibleGambling> => {
      const data = {
        dailyDepositLimit: r.dailyDepositLimit,
        weeklyDepositLimit: r.weeklyDepositLimit,
        monthlyDepositLimit: r.monthlyDepositLimit,
        dailyLossLimit: r.dailyLossLimit,
        sessionTimeLimitMin: r.sessionTimeLimitMin,
        // `?? 30` — realityCheckIntervalMin is NON-nullable in the schema
        // (Int @default(30)). A caller passing null must fall back to the
        // default, not throw: this is the responsible-gambling write path, and
        // a crash here is a player unable to set a limit or self-exclude.
        realityCheckIntervalMin: r.realityCheckIntervalMin ?? 30,
        selfExclusionUntil: r.selfExclusionUntil ? new Date(r.selfExclusionUntil) : null,
        coolingOffUntil: r.coolingOffUntil ? new Date(r.coolingOffUntil) : null,
        selfExclusionStartedAt: r.selfExclusionStartedAt ? new Date(r.selfExclusionStartedAt) : null,
        coolingOffStartedAt: r.coolingOffStartedAt ? new Date(r.coolingOffStartedAt) : null,
        pendingIncreaseTo: r.pendingIncreaseTo,
        pendingIncreaseEffectiveAt: r.pendingIncreaseEffectiveAt ? new Date(r.pendingIncreaseEffectiveAt) : null,
        pendingWeeklyIncreaseTo: r.pendingWeeklyIncreaseTo,
        pendingWeeklyIncreaseEffectiveAt: r.pendingWeeklyIncreaseEffectiveAt ? new Date(r.pendingWeeklyIncreaseEffectiveAt) : null,
        pendingMonthlyIncreaseTo: r.pendingMonthlyIncreaseTo,
        pendingMonthlyIncreaseEffectiveAt: r.pendingMonthlyIncreaseEffectiveAt ? new Date(r.pendingMonthlyIncreaseEffectiveAt) : null,
      };
      const row = await pc().responsibleGambling.upsert({
        where: { userId: r.userId },
        create: { userId: r.userId, ...data },
        update: data,
      });
      return toStoredRG(row);
    },
  },

  // ── NOTIFICATION ──────────────────────────────────────────────────────────
  notification: {
    create: async (n: StoredNotification): Promise<StoredNotification> => {
      const created = new Date(n.createdAt);
      const row = await pc().notification.create({
        data: {
          id: n.id,
          userId: n.userId,
          // The ONLY channel this table has ever carried. `NotificationChannel`
          // declares four; PUSH/SMS/EMAIL have no writer and 0 rows. This table
          // is the in-app inbox — see `comms-registry.ts` for the whole picture.
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
          // 🔴 `sentAt` was NULL on all 1,673 production rows because nothing in
          // the repo ever wrote it — "was it delivered?" was unanswerable from
          // the data. For an IN_APP notification, delivery IS the row becoming
          // visible in the bell, so the timestamp is knowable exactly here. A
          // column nobody fills is a promise, not a record.
          sentAt: created,
          readAt: n.readAt ? new Date(n.readAt) : null,
          dismissedAt: n.dismissedAt ? new Date(n.dismissedAt) : null,
          createdAt: created,
        },
      });
      return toStoredNotification(row);
    },
    /**
     * The most recent byte-identical notification for this player inside the
     * window, or null. Identity includes `href`, so two genuinely different
     * events (two deposits, two positions) never collide — see DEDUPE_WINDOW_MS
     * in notification-service for the production measurement behind this.
     */
    findRecentDuplicate: async (q: {
      userId: string; kind: string; titleEn: string; bodyEn: string; href: string | null; sinceMs: number;
    }): Promise<StoredNotification | null> => {
      const row = await pc().notification.findFirst({
        where: {
          userId: q.userId,
          kind: q.kind,
          titleEn: q.titleEn,
          bodyEn: q.bodyEn,
          href: q.href,
          createdAt: { gte: new Date(Date.now() - q.sinceMs) },
        },
        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredNotification(row) : null;
    },
    /**
     * Has this player EVER been sent a notification at this exact deep link?
     *
     * ⚠️ Deliberately unbounded in time, which is the whole difference between
     * this and `findRecentDuplicate` above. That one asks "is this a double-fire
     * of the same event 90 seconds ago"; this one asks "has this once-per-period
     * message already gone out" — and the answer must not become `false` again
     * simply because time passed. The Up & Down daily digest (E-37) keys on
     * `/updown/history?day=YYYY-MM-DD`, so the day is IN the href and a container
     * restart, a redeploy or a healed late settlement can re-run the sweep as
     * often as it likes without a player being told about their day twice.
     *
     * ⛔ Do not "optimise" this into the dedupe window. A 90-second window on a
     * daily message is not idempotency, it is a race that usually wins.
     */
    existsWithHref: async (userId: string, href: string): Promise<boolean> => {
      const row = await pc().notification.findFirst({
        where: { userId, href },
        select: { id: true },
      });
      return !!row;
    },
    /**
     * Delete in-app notifications created before `beforeIso`. Returns the count removed.
     *
     * ⚠️ THE PERIOD IS NOT A FREE CHOICE — see `retention.ts`. `existsWithHref` above is
     * deliberately unbounded in time because it is the Up & Down digest's only idempotency
     * key (E-37), and this method deletes exactly the rows that answer is read from. Tighten
     * the period and a replayed digest tells players about their day twice.
     */
    pruneOlderThan: async (beforeIso: string): Promise<number> => {
      const res = await pc().notification.deleteMany({
        where: { createdAt: { lt: new Date(beforeIso) } },
      });
      return res.count;
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
    /**
     * Delete every notification belonging to one user. Erasure only.
     *
     * ⛔ NOT `dismissAll` — a `dismissedAt` hides a row whose `bodyEn` still says what the
     * player bet and won. In-app notifications are "operational only, 180 days" on
     * docs/DATA-RETENTION.md: no statute asks us to keep them.
     *
     * ⚠️ It also removes the rows `existsWithHref` answers from — the Up & Down digest's
     * only idempotency key. Safe HERE and nowhere else: the account is closed and erased,
     * so a replayed digest has nobody to double-notify.
     */
    deleteAllForUser: async (userId: string): Promise<number> => {
      const res = await pc().notification.deleteMany({ where: { userId } });
      return res.count;
    },
    /**
     * 🔴 OVERWRITE A FROZEN MASK WHEREVER IT LANDED IN SOMEBODY ELSE'S ROW.
     *
     * `notifyReferralJoined` writes `maskName(displayName, phoneE164)` into the REFERRER's
     * body — "+255•••417 signed up with your link." — frozen at write time. That is the
     * last three digits of the recruit's phone number in a row erasure does not own and
     * `deleteAllForUser` does not reach. Same defect as `Comment.authorName`, one table
     * across.
     *
     * ⚠️ A full scan of `Notification` by construction (no index answers `contains`), which
     * is why it is reachable only from erasure — a rare, officer-triggered operation — and
     * never from a render path.
     */
    redactFragment: async (fragment: string, replacement: string): Promise<number> => {
      if (!fragment) return 0;
      const FIELDS = ["titleEn", "titleSw", "titleZh", "bodyEn", "bodySw", "bodyZh"] as const;
      const rows = await pc().notification.findMany({
        where: { OR: FIELDS.map((f) => ({ [f]: { contains: fragment } })) },
        select: { id: true, titleEn: true, titleSw: true, titleZh: true, bodyEn: true, bodySw: true, bodyZh: true },
      });
      let changed = 0;
      for (const row of rows) {
        const data: Record<string, string> = {};
        for (const f of FIELDS) {
          const v = (row as Record<string, unknown>)[f];
          if (typeof v === "string" && v.includes(fragment)) data[f] = v.split(fragment).join(replacement);
        }
        if (Object.keys(data).length === 0) continue;
        await pc().notification.update({ where: { id: row.id }, data });
        changed++;
      }
      return changed;
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
    /** Atomic +1 (audit M7) — Prisma `{ increment: 1 }`, immune to the
     *  read-modify-write lost update the old `recruitCount + 1` had. */
    incrementRecruitCount: async (userId: string): Promise<StoredAffiliateAccount | null> => {
      try {
        const row = await pc().affiliateAgent.update({ where: { userId }, data: { totalRecruits: { increment: 1 } } });
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

  // ── OBJECTION (F11) ───────────────────────────────────────────────────────
  // An OPEN row here freezes a market's settlement, so these are money-bearing
  // compliance records — they persist, they are never silently dropped.
  objection: {
    create: async (o: StoredObjection): Promise<StoredObjection> => {
      const row = await pc().objection.create({
        data: {
          id: o.id,
          marketId: o.marketId,
          userId: o.userId,
          reason: o.reason,
          detail: o.detail,
          status: o.status,
          createdAt: new Date(o.createdAt),
          reviewedBy: o.reviewedBy,
          reviewedAt: o.reviewedAt ? new Date(o.reviewedAt) : null,
          reviewNote: o.reviewNote,
          remedy: o.remedy,
          outcomeAtFiling: o.outcomeAtFiling,
        },
      });
      return toStoredObjection(row);
    },
    findById: async (id: string): Promise<StoredObjection | null> => {
      const row = await pc().objection.findUnique({ where: { id } });
      return row ? toStoredObjection(row) : null;
    },
    update: async (id: string, patch: Partial<StoredObjection>): Promise<StoredObjection | null> => {
      const row = await pc().objection.update({
        where: { id },
        data: {
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.reviewedBy !== undefined ? { reviewedBy: patch.reviewedBy } : {}),
          ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt ? new Date(patch.reviewedAt) : null } : {}),
          ...(patch.reviewNote !== undefined ? { reviewNote: patch.reviewNote } : {}),
          ...(patch.remedy !== undefined ? { remedy: patch.remedy } : {}),
        },
      });
      return toStoredObjection(row);
    },
    listForMarket: async (marketId: string): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ where: { marketId }, orderBy: { createdAt: "desc" } });
      return rows.map(toStoredObjection);
    },
    listForUser: async (userId: string): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
      return rows.map(toStoredObjection);
    },
    list: async (limit = 1000): Promise<StoredObjection[]> => {
      const rows = await pc().objection.findMany({ orderBy: { createdAt: "desc" }, take: limit });
      return rows.map(toStoredObjection);
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
          selectionCloseDate: p.selectionCloseDate,
          sourceUrl: p.sourceUrl,
          status: p.status,
          up: p.up,
          down: p.down,
          publishedMarketId: p.publishedMarketId,
          bonusGrantedTzs: p.bonusGrantedTzs,
          bonusGrantId: p.bonusGrantId,
          approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
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
          if (k === "reviewedAt" || k === "approvedAt") {
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

  // ── EVENT CALENDAR (F8) ───────────────────────────────────────────────────
  event: {
    create: async (e: {
      title: string; category: string; startsAt: string; sourceUrl: string;
      note: string | null; addedBy: string;
    }): Promise<StoredEvent> => {
      const row = await pc().eventCalendar.create({
        data: {
          title: e.title, category: e.category, startsAt: new Date(e.startsAt),
          sourceUrl: e.sourceUrl, note: e.note, addedBy: e.addedBy,
        },
      });
      return toStoredEvent(row);
    },
    findById: async (id: string): Promise<StoredEvent | null> => {
      const row = await pc().eventCalendar.findUnique({ where: { id } });
      return row ? toStoredEvent(row) : null;
    },
    list: async (): Promise<StoredEvent[]> => {
      const rows = await pc().eventCalendar.findMany({ orderBy: { startsAt: "asc" } });
      return rows.map(toStoredEvent);
    },
    update: async (id: string, patch: { generatedAt?: string | null; aiPollId?: string | null }): Promise<void> => {
      await pc().eventCalendar.update({
        where: { id },
        data: {
          ...(patch.generatedAt !== undefined ? { generatedAt: patch.generatedAt ? new Date(patch.generatedAt) : null } : {}),
          ...(patch.aiPollId !== undefined ? { aiPollId: patch.aiPollId } : {}),
        },
      });
    },
    delete: async (id: string): Promise<void> => {
      await pc().eventCalendar.delete({ where: { id } }).catch(() => {});
    },
  },

  // ── WATCHLIST (F3) ────────────────────────────────────────────────────────
  watchlist: {
    isWatching: async (marketId: string, userId: string): Promise<boolean> => {
      const row = await pc().watchlist.findUnique({
        where: { marketId_userId: { marketId, userId } },
        select: { id: true },
      });
      return !!row;
    },
    add: async (marketId: string, userId: string): Promise<void> => {
      await pc().watchlist.upsert({
        where: { marketId_userId: { marketId, userId } },
        create: { marketId, userId },
        update: {},
      });
    },
    remove: async (marketId: string, userId: string): Promise<void> => {
      await pc().watchlist.deleteMany({ where: { marketId, userId } });
    },
    /** User ids watching a market — the alert fan-out set. */
    listWatcherIds: async (marketId: string): Promise<string[]> => {
      const rows = await pc().watchlist.findMany({ where: { marketId }, select: { userId: true } });
      return rows.map((r) => r.userId);
    },
    /** Market ids a user watches, newest first. */
    listMarketIdsForUser: async (userId: string): Promise<string[]> => {
      const rows = await pc().watchlist.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { marketId: true },
      });
      return rows.map((r) => r.marketId);
    },
  },

  // ── PUSH SUBSCRIPTIONS (F4) ───────────────────────────────────────────────
  pushSub: {
    upsert: async (s: StoredPushSub): Promise<void> => {
      await pc().pushSubscription.upsert({
        where: { endpoint: s.endpoint },
        create: { userId: s.userId, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        update: { userId: s.userId, p256dh: s.p256dh, auth: s.auth },
      });
    },
    listForUser: async (userId: string): Promise<StoredPushSub[]> => {
      const rows = await pc().pushSubscription.findMany({ where: { userId } });
      return rows.map((r) => ({ userId: r.userId, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
    },
    /** Prune a dead endpoint (push service returned 404/410). */
    deleteByEndpoint: async (endpoint: string): Promise<void> => {
      await pc().pushSubscription.deleteMany({ where: { endpoint } });
    },
    countForUser: async (userId: string): Promise<number> => {
      return pc().pushSubscription.count({ where: { userId } });
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
    // tx (bet-stake single-tx): inside a money $transaction a DB error must
    // PROPAGATE so the whole movement rolls back — never swallow it to null
    // (same contract as wallet.adjust above). Self-committing mode keeps the
    // original catch → null contract.
    update: async (id: string, patch: Partial<StoredBonusGrant>, tx?: Prisma.TransactionClient | null): Promise<StoredBonusGrant | null> => {
      const run = async (): Promise<StoredBonusGrant | null> => {
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
        const row = await (tx ?? pc()).bonusGrant.update({ where: { id }, data });
        return toStoredBonusGrant(row);
      };
      if (tx) return run(); // let a db error propagate to roll back the tx
      try { return await run(); } catch { return null; }
    },
    listByUser: async (userId: string): Promise<StoredBonusGrant[]> => {
      const rows = await pc().bonusGrant.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toStoredBonusGrant);
    },
    // tx: see wallet.findByUserId — in-tx reads must use the tx client.
    listActiveByUser: async (userId: string, tx?: Prisma.TransactionClient | null): Promise<StoredBonusGrant[]> => {
      const rows = await (tx ?? pc()).bonusGrant.findMany({
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
