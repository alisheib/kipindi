/**
 * Phase 6 — Migrate StoreSnapshot blob into per-entity Prisma tables.
 *
 * Reads the single StoreSnapshot row from Postgres (the JSON blob that
 * backup.ts has been writing), deserializes every entity Map, and upserts
 * each record into its Prisma table using the same type conversions as
 * prisma-dal.ts / market-dal.ts / ai-poll-generation.ts / market-candidate.ts.
 *
 * Run:
 *   DATABASE_URL="postgres://..." npx tsx scripts/migrate-snapshot-to-tables.ts
 *
 * Safe to run multiple times (upsert = idempotent).
 * Does NOT flip USE_PRISMA_DAL — that's a separate manual step after verification.
 * Does NOT delete StoreSnapshot — kept as a safety net.
 */

import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSecret(): string {
  return process.env.SESSION_SECRET || "dev-only-secret-replace-in-prod-32chars-minimum";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function dt(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(iso);
}

function dtRequired(iso: string): Date {
  return new Date(iso);
}

/** Parse a date-only string like "1999-02-10" into a Date, or full ISO. */
function dtDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // If it's just YYYY-MM-DD, append T00:00:00Z so Prisma accepts it
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00.000Z");
  return new Date(s);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMap = Map<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialize(payload: string): { store: Record<string, AnyMap | any>; extras: Record<string, any> } {
  const parsed = JSON.parse(payload);

  // Extract extras that live outside __50PICK_STORE
  const extras: Record<string, unknown> = {};
  for (const key of ["__auditRing", "__affiliateConfig", "__proposalsConfig", "__aiPolls", "__candidates", "__aiPollConfig"]) {
    if (parsed[key] !== undefined) {
      extras[key] = parsed[key];
      delete parsed[key];
    }
  }

  // Reconstruct Maps
  const store: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    const rec = v as Record<string, unknown> | null;
    if (rec && typeof rec === "object" && rec.__map === true && Array.isArray(rec.entries)) {
      store[k] = new Map(rec.entries as [string, unknown][]);
    } else {
      store[k] = v;
    }
  }

  // Reconstruct Map extras
  for (const key of ["__aiPolls", "__candidates"]) {
    const val = extras[key] as Record<string, unknown> | undefined;
    if (val && typeof val === "object" && val.__map === true && Array.isArray(val.entries)) {
      extras[key] = new Map(val.entries as [string, unknown][]);
    }
  }

  return { store, extras };
}

// ---------------------------------------------------------------------------
// Migration functions
// ---------------------------------------------------------------------------

let migrated = 0;
let skipped = 0;
let errors = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function migrateUsers(users: AnyMap) {
  console.log(`\n--- Users: ${users.size} records ---`);
  for (const [id, u] of users) {
    try {
      await prisma.user.upsert({
        where: { id },
        create: {
          id,
          phoneE164: u.phoneE164,
          passwordHash: u.passwordHash ?? null,
          passwordSalt: u.passwordSalt ?? null,
          failedLoginCount: u.failedLoginCount ?? 0,
          lockedUntil: dt(u.lockedUntil),
          role: u.role,
          status: u.status,
          locale: u.locale,
          displayName: u.displayName ?? null,
          dob: dtDate(u.dob),
          region: u.region ?? null,
          acceptedTermsVersion: u.acceptedTermsVersion ?? null,
          acceptedTermsAt: dt(u.acceptedTermsAt),
          marketingOptIn: u.marketingOptIn ?? false,
          twoFactorEnabled: u.twoFactorEnabled ?? false,
          avatarDataUrl: u.avatarDataUrl ?? null,
          recruitedBy: u.recruitedBy ?? null,
          createdAt: dtRequired(u.createdAt),
          updatedAt: dtRequired(u.updatedAt),
          lastLoginAt: dt(u.lastLoginAt),
          closedAt: dt(u.closedAt),
        },
        update: {
          phoneE164: u.phoneE164,
          passwordHash: u.passwordHash ?? null,
          passwordSalt: u.passwordSalt ?? null,
          failedLoginCount: u.failedLoginCount ?? 0,
          lockedUntil: dt(u.lockedUntil),
          role: u.role,
          status: u.status,
          locale: u.locale,
          displayName: u.displayName ?? null,
          dob: dtDate(u.dob),
          region: u.region ?? null,
          acceptedTermsVersion: u.acceptedTermsVersion ?? null,
          acceptedTermsAt: dt(u.acceptedTermsAt),
          marketingOptIn: u.marketingOptIn ?? false,
          twoFactorEnabled: u.twoFactorEnabled ?? false,
          avatarDataUrl: u.avatarDataUrl ?? null,
          recruitedBy: u.recruitedBy ?? null,
          updatedAt: dtRequired(u.updatedAt),
          lastLoginAt: dt(u.lastLoginAt),
          closedAt: dt(u.closedAt),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR user ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateKyc(kyc: AnyMap) {
  console.log(`\n--- KYC: ${kyc.size} records ---`);
  for (const [id, k] of kyc) {
    try {
      const data = {
        userId: k.userId,
        status: k.status,
        rejectReason: k.rejectReason ?? null,
        rejectNote: k.rejectNote ?? null,
        nidaNumber: k.nidaNumber ?? null,
        nidaVerifiedAt: dt(k.nidaVerifiedAt),
        fullName: k.fullName ?? null,
        dob: k.dob ? new Date(k.dob) : null,
        reviewerId: k.reviewerId ?? null,
        reviewedAt: dt(k.reviewedAt),
        submittedAt: dt(k.submittedAt),
      };
      await prisma.kycSubmission.upsert({
        where: { id },
        create: { id, ...data, createdAt: dtRequired(k.createdAt) },
        update: data,
      });
      // Sync documents
      if (Array.isArray(k.documents) && k.documents.length > 0) {
        await prisma.kycDocument.deleteMany({ where: { submissionId: id } });
        await prisma.kycDocument.createMany({
          data: k.documents.map((d: { docType: string; storageKey: string; uploadedAt: string }) => ({
            submissionId: id,
            docType: (d.docType ?? "NIDA") as "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD" | "SELFIE",
            storageKey: d.storageKey,
            mimeType: "application/octet-stream",
            sizeBytes: 0,
            uploadedAt: new Date(d.uploadedAt),
          })),
        });
      }
      migrated++;
    } catch (err) {
      console.error(`  ERR kyc ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateWallets(wallets: AnyMap) {
  console.log(`\n--- Wallets: ${wallets.size} records ---`);
  for (const [id, w] of wallets) {
    try {
      await prisma.wallet.upsert({
        where: { id },
        create: {
          id,
          userId: w.userId,
          balance: w.balance,
          currency: w.currency,
          status: w.status,
          createdAt: dtRequired(w.createdAt),
          updatedAt: dtRequired(w.updatedAt),
        },
        update: {
          balance: w.balance,
          status: w.status,
          updatedAt: dtRequired(w.updatedAt),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR wallet ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateTransactions(txns: AnyMap) {
  console.log(`\n--- Transactions: ${txns.size} records ---`);
  for (const [id, t] of txns) {
    try {
      await prisma.transaction.upsert({
        where: { id },
        create: {
          id,
          walletId: t.walletId,
          userId: t.userId,
          type: t.type,
          status: t.status,
          amount: t.amount,
          fee: t.fee ?? 0,
          taxWithheld: t.taxWithheld ?? 0,
          balanceAfter: t.balanceAfter,
          currency: t.currency,
          provider: t.provider,
          providerRef: t.providerRef ?? null,
          msisdn: t.msisdn ?? null,
          description: t.description ?? "",
          positionId: null, // positions — no FK to Position table (soft reference)
          amlReason: t.amlReason ?? null,
          createdAt: dtRequired(t.createdAt),
          updatedAt: dtRequired(t.updatedAt),
          completedAt: dt(t.completedAt),
        },
        update: {
          status: t.status,
          balanceAfter: t.balanceAfter,
          updatedAt: dtRequired(t.updatedAt),
          completedAt: dt(t.completedAt),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR txn ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateNotifications(notifications: AnyMap) {
  console.log(`\n--- Notifications: ${notifications.size} records ---`);
  for (const [id, n] of notifications) {
    try {
      await prisma.notification.upsert({
        where: { id },
        create: {
          id,
          userId: n.userId,
          channel: "IN_APP",
          event: n.kind ?? "SYSTEM",
          kind: n.kind ?? null,
          href: n.href ?? null,
          titleEn: n.titleEn ?? n.title ?? "",
          titleSw: n.titleSw ?? null,
          bodyEn: n.bodyEn ?? n.body ?? "",
          bodySw: n.bodySw ?? "",
          readAt: dt(n.readAt),
          dismissedAt: dt(n.dismissedAt),
          createdAt: dtRequired(n.createdAt),
        },
        update: {
          readAt: dt(n.readAt),
          dismissedAt: dt(n.dismissedAt),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR notification ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateResponsibleGambling(rg: AnyMap) {
  console.log(`\n--- ResponsibleGambling: ${rg.size} records ---`);
  for (const [, r] of rg) {
    try {
      const data = {
        dailyDepositLimit: r.dailyDepositLimit ?? null,
        weeklyDepositLimit: r.weeklyDepositLimit ?? null,
        monthlyDepositLimit: r.monthlyDepositLimit ?? null,
        dailyLossLimit: r.dailyLossLimit ?? null,
        sessionTimeLimitMin: r.sessionTimeLimitMin ?? null,
        realityCheckIntervalMin: r.realityCheckIntervalMin ?? 30,
        selfExclusionUntil: dt(r.selfExclusionUntil ?? r.selfExcludeUntil),
        coolingOffUntil: dt(r.coolingOffUntil ?? r.coolOffUntil),
        pendingIncreaseTo: r.pendingIncreaseTo ?? null,
        pendingIncreaseEffectiveAt: dt(r.pendingIncreaseEffectiveAt),
      };
      await prisma.responsibleGambling.upsert({
        where: { userId: r.userId },
        create: { userId: r.userId, ...data },
        update: data,
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR rg ${r.userId}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateSourceOfFunds(sof: AnyMap) {
  console.log(`\n--- SourceOfFunds: ${sof.size} records ---`);
  for (const [, s] of sof) {
    try {
      const data = {
        declaredSource: s.declaredSource ?? s.source ?? "other",
        declaredOccupation: s.declaredOccupation ?? "",
        declaredEmployer: s.declaredEmployer ?? s.employerName ?? null,
        declaredAnnualIncomeBand: s.declaredAnnualIncomeBand ?? "under-12m",
        declaredOther: s.declaredOther ?? null,
        reviewStatus: (s.reviewStatus ?? s.status ?? "PENDING") as "PENDING" | "ACCEPTED" | "REJECTED",
        reviewerId: s.reviewerId ?? s.reviewedBy ?? null,
        reviewedAt: dt(s.reviewedAt),
        submittedAt: dtRequired(s.submittedAt ?? s.createdAt ?? new Date().toISOString()),
      };
      await prisma.sourceOfFunds.upsert({
        where: { userId: s.userId },
        create: { userId: s.userId, ...data },
        update: data,
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR sof ${s.userId}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateAffiliates(affiliates: AnyMap) {
  console.log(`\n--- Affiliates: ${affiliates.size} records ---`);
  for (const [, a] of affiliates) {
    try {
      await prisma.affiliateAgent.upsert({
        where: { userId: a.userId },
        create: {
          userId: a.userId,
          code: a.code,
          totalRecruits: a.recruitCount ?? a.totalRecruits ?? 0,
          totalCommission: a.totalEarnedTzs ?? a.totalCommission ?? 0,
          createdAt: dtRequired(a.createdAt),
        },
        update: {
          totalRecruits: a.recruitCount ?? a.totalRecruits ?? 0,
          totalCommission: a.totalEarnedTzs ?? a.totalCommission ?? 0,
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR affiliate ${a.userId}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateReferralRewards(rewards: AnyMap) {
  console.log(`\n--- ReferralRewards: ${rewards.size} records ---`);
  for (const [id, r] of rewards) {
    try {
      await prisma.referralReward.upsert({
        where: { id },
        create: {
          id,
          referrerUserId: r.referrerUserId ?? r.affiliateUserId,
          recruitUserId: r.recruitUserId,
          type: r.type,
          label: r.label ?? r.type ?? "",
          amountTzs: r.amountTzs ?? r.amount ?? 0,
          status: r.status ?? "PENDING",
          recipientUserId: r.recipientUserId ?? r.referrerUserId ?? r.affiliateUserId,
          note: r.note ?? null,
          createdAt: dtRequired(r.createdAt),
        },
        update: {
          status: r.status ?? "PENDING",
          amountTzs: r.amountTzs ?? r.amount ?? 0,
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR reward ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateProposals(proposals: AnyMap) {
  console.log(`\n--- Proposals: ${proposals.size} records ---`);
  for (const [id, p] of proposals) {
    try {
      await prisma.proposal.upsert({
        where: { id },
        create: {
          id,
          proposerId: p.proposerId,
          status: p.status,
          titleEn: p.titleEn,
          titleSw: p.titleSw ?? null,
          description: p.description ?? null,
          category: p.category,
          resolutionCriterion: p.resolutionCriterion,
          resolutionDate: p.resolutionDate,
          up: p.up ?? 0,
          down: p.down ?? 0,
          publishedMarketId: p.publishedMarketId ?? null,
          prizePaidTzs: p.prizePaidTzs ?? 0,
          declineReason: p.declineReason ?? null,
          declineNote: p.declineNote ?? null,
          changeNote: p.changeNote ?? null,
          reviewedBy: p.reviewedBy ?? null,
          reviewedAt: dt(p.reviewedAt),
          createdAt: dtRequired(p.createdAt),
        },
        update: {
          status: p.status,
          up: p.up ?? 0,
          down: p.down ?? 0,
          publishedMarketId: p.publishedMarketId ?? null,
          prizePaidTzs: p.prizePaidTzs ?? 0,
          changeNote: p.changeNote ?? null,
          reviewedBy: p.reviewedBy ?? null,
          reviewedAt: dt(p.reviewedAt),
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR proposal ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateProposalVotes(votes: AnyMap) {
  console.log(`\n--- ProposalVotes: ${votes.size} records ---`);
  for (const [id, v] of votes) {
    try {
      await prisma.proposalVote.upsert({
        where: { id },
        create: {
          id,
          proposalId: v.proposalId,
          userId: v.userId,
          dir: v.dir ?? v.direction,
          createdAt: dtRequired(v.createdAt),
        },
        update: {
          dir: v.dir ?? v.direction,
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR vote ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateAIPolls(polls: AnyMap) {
  console.log(`\n--- AI Polls: ${polls.size} records ---`);
  for (const [id, p] of polls) {
    try {
      await prisma.aIPoll.upsert({
        where: { id },
        create: {
          id,
          state: p.state,
          requestCategory: p.requestCategory ?? p.category ?? "",
          requestPrompt: p.requestPrompt ?? "",
          generation: p.generation ?? null,
          rawResponse: p.rawResponse ?? null,
          filterReasons: p.filterReasons ?? [],
          qualityIndicators: p.qualityIndicators ?? [],
          overallQuality: p.overallQuality ?? 0,
          titleEn: p.titleEn ?? "",
          titleSw: p.titleSw ?? "",
          category: p.category ?? "",
          resolutionCriterion: p.resolutionCriterion ?? "",
          resolutionAt: dtRequired(p.resolutionAt),
          options: p.options ?? [],
          sources: p.sources ?? [],
          confidence: p.confidence ?? 0,
          reasoning: p.reasoning ?? "",
          reviewedBy: p.reviewedBy ?? null,
          reviewedAt: dt(p.reviewedAt),
          reviewNote: p.reviewNote ?? null,
          rejectReasons: p.rejectReasons ?? [],
          publishedMarketId: p.publishedMarketId ?? null,
          publishedCandidateId: p.publishedCandidateId ?? null,
          tokensUsed: p.tokensUsed ?? 0,
          costUsd: p.costUsd ?? 0,
          latencyMs: p.latencyMs ?? 0,
          regenerationOf: p.regenerationOf ?? null,
          regenerationCount: p.regenerationCount ?? 0,
          createdAt: dtRequired(p.createdAt),
        },
        update: {
          state: p.state,
          filterReasons: p.filterReasons ?? [],
          qualityIndicators: p.qualityIndicators ?? [],
          overallQuality: p.overallQuality ?? 0,
          titleEn: p.titleEn ?? "",
          titleSw: p.titleSw ?? "",
          reviewedBy: p.reviewedBy ?? null,
          reviewedAt: dt(p.reviewedAt),
          reviewNote: p.reviewNote ?? null,
          rejectReasons: p.rejectReasons ?? [],
          publishedMarketId: p.publishedMarketId ?? null,
          publishedCandidateId: p.publishedCandidateId ?? null,
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR aipoll ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

async function migrateCandidates(candidates: AnyMap) {
  console.log(`\n--- Candidates: ${candidates.size} records ---`);
  for (const [id, c] of candidates) {
    try {
      await prisma.marketCandidate.upsert({
        where: { id },
        create: {
          id,
          state: c.state,
          category: c.category ?? "",
          proposedTitleEn: c.proposedTitleEn ?? c.titleEn ?? "",
          proposedTitleSw: c.proposedTitleSw ?? c.titleSw ?? null,
          resolutionCriterion: c.resolutionCriterion ?? "",
          resolutionAt: dtRequired(c.resolutionAt),
          sources: c.sources ?? [],
          confidence: c.confidence ?? 0,
          rejectReason: c.rejectReason ?? null,
          rejectNote: c.rejectNote ?? null,
          trace: c.trace ?? [],
          reviewedBy: c.reviewedBy ?? null,
          reviewedAt: dt(c.reviewedAt),
          reviewNote: c.reviewNote ?? null,
          publishedMarketId: c.publishedMarketId ?? null,
          tokensSpent: c.tokensSpent ?? 0,
          costUsd: c.costUsd ?? 0,
          createdAt: dtRequired(c.createdAt),
        },
        update: {
          state: c.state,
          confidence: c.confidence ?? 0,
          rejectReason: c.rejectReason ?? null,
          rejectNote: c.rejectNote ?? null,
          reviewedBy: c.reviewedBy ?? null,
          reviewedAt: dt(c.reviewedAt),
          publishedMarketId: c.publishedMarketId ?? null,
        },
      });
      migrated++;
    } catch (err) {
      console.error(`  ERR candidate ${id}: ${(err as Error).message}`);
      errors++;
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 6 — Migrate StoreSnapshot → per-entity Prisma tables");
  console.log("=".repeat(60));

  // 1. Read snapshot
  console.log("\n[1] Reading StoreSnapshot from Postgres...");
  // StoreSnapshot model dropped from schema (Phase 0d) — use raw SQL.
  const rows = await prisma.$queryRawUnsafe<{ envelope: string }[]>(
    `SELECT envelope FROM "StoreSnapshot" WHERE id = 1 LIMIT 1`
  );
  const row = rows[0] ?? null;
  if (!row) {
    console.log("  No snapshot found (id=1). Nothing to migrate.");
    await prisma.$disconnect();
    process.exit(0);
  }
  console.log(`  Found snapshot (${(row.envelope.length / 1024).toFixed(0)} KB)`);

  // 2. Parse envelope
  console.log("\n[2] Parsing envelope...");
  let envelope: { v: number; ts: string; payload: string; signature: string };
  try {
    envelope = JSON.parse(row.envelope);
  } catch (err) {
    console.error("  FATAL: envelope is not valid JSON:", (err as Error).message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // 3. Verify signature
  const expected = sign(envelope.payload);
  if (expected !== envelope.signature) {
    console.warn("  WARNING: HMAC signature mismatch — snapshot may be from a different SESSION_SECRET.");
    console.warn("  Proceeding anyway (data is still JSON-parsable).");
  } else {
    console.log("  HMAC signature verified OK.");
  }
  console.log(`  Snapshot timestamp: ${envelope.ts}`);

  // 4. Deserialize
  console.log("\n[3] Deserializing...");
  const { store, extras } = deserialize(envelope.payload);

  // Print what's in the snapshot
  const mapKeys = Object.keys(store).filter(k => store[k] instanceof Map);
  console.log(`  Store maps: ${mapKeys.join(", ")}`);
  for (const k of mapKeys) {
    console.log(`    ${k}: ${(store[k] as Map<unknown, unknown>).size} entries`);
  }
  if (extras.__aiPolls instanceof Map) console.log(`  AI Polls: ${extras.__aiPolls.size} entries`);
  if (extras.__candidates instanceof Map) console.log(`  Candidates: ${extras.__candidates.size} entries`);

  // 5. Migrate each entity type
  console.log("\n[4] Migrating entities...");

  if (store.users instanceof Map) await migrateUsers(store.users);
  if (store.kyc instanceof Map) await migrateKyc(store.kyc);
  if (store.wallets instanceof Map) await migrateWallets(store.wallets);
  if (store.txns instanceof Map) await migrateTransactions(store.txns);
  if (store.notifications instanceof Map) await migrateNotifications(store.notifications);
  if (store.responsible instanceof Map) await migrateResponsibleGambling(store.responsible);
  if (store.sourceOfFunds instanceof Map) await migrateSourceOfFunds(store.sourceOfFunds);
  if (store.affiliates instanceof Map) await migrateAffiliates(store.affiliates);
  if (store.referralRewards instanceof Map) await migrateReferralRewards(store.referralRewards);
  if (store.proposals instanceof Map) await migrateProposals(store.proposals);
  if (store.proposalVotes instanceof Map) await migrateProposalVotes(store.proposalVotes);
  if (extras.__aiPolls instanceof Map) await migrateAIPolls(extras.__aiPolls);
  if (extras.__candidates instanceof Map) await migrateCandidates(extras.__candidates);

  // OTPs are intentionally skipped — they're short-lived codes that expire,
  // not worth migrating. Fresh OTPs will be created on next login.

  // Bets (legacy sports betting) are read-only history. The Prisma Bet
  // model uses a different schema (Window→Match joins). These are not
  // migrated — they remain accessible via the memory store until the
  // legacy module is retired.

  // 6. Verification counts
  console.log("\n[5] Verification — Prisma table counts:");
  const counts = {
    users: await prisma.user.count(),
    kyc: await prisma.kycSubmission.count(),
    wallets: await prisma.wallet.count(),
    transactions: await prisma.transaction.count(),
    notifications: await prisma.notification.count(),
    responsibleGambling: await prisma.responsibleGambling.count(),
    sourceOfFunds: await prisma.sourceOfFunds.count(),
    affiliates: await prisma.affiliateAgent.count(),
    referralRewards: await prisma.referralReward.count(),
    proposals: await prisma.proposal.count(),
    proposalVotes: await prisma.proposalVote.count(),
    aiPolls: await prisma.aIPoll.count(),
    candidates: await prisma.marketCandidate.count(),
  };
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }

  // Wallet balance integrity check
  if (store.wallets instanceof Map) {
    let snapshotSum = 0;
    for (const w of store.wallets.values()) snapshotSum += w.balance;
    const dbWallets = await prisma.wallet.findMany({ select: { balance: true } });
    let dbSum = 0;
    for (const w of dbWallets) dbSum += Number(w.balance);
    const diff = Math.abs(snapshotSum - dbSum);
    console.log(`\n  Wallet balance check:`);
    console.log(`    Snapshot sum: TZS ${snapshotSum.toLocaleString()}`);
    console.log(`    Prisma sum:   TZS ${dbSum.toLocaleString()}`);
    console.log(`    Difference:   TZS ${diff.toLocaleString()} ${diff === 0 ? "✓" : "⚠ MISMATCH"}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`MIGRATION COMPLETE: ${migrated} upserted, ${skipped} skipped, ${errors} errors`);
  console.log("=".repeat(60));
  console.log("\nNext steps:");
  console.log("  1. Verify the counts above match your expectations");
  console.log("  2. Spot-check a few users/wallets in the Prisma tables");
  console.log("  3. Set USE_PRISMA_DAL=true on Railway");
  console.log("  4. The StoreSnapshot table is kept as a safety net — drop after 2 weeks\n");

  await prisma.$disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  await prisma.$disconnect();
  process.exit(1);
});
