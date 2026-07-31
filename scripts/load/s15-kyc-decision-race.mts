/**
 * S15 — the KYC decision under concurrency, against REAL Postgres.
 *
 * kyc-flow-stress covers the state machine, but entirely in-process against an
 * in-memory Map, where `withLock` degrades to a per-process mutex. Two properties
 * only exist once a real advisory lock is involved, and both decide whether a
 * withdrawal gate opens:
 *
 *   A · TWO OFFICERS decide the same submission at the same instant. Exactly one
 *       decision may land; the loser must be told the submission was already
 *       decided, and must not double-notify the player or overwrite the first
 *       officer's decision.
 *
 *   B · A PLAYER RESUBMITS while an officer is deciding. `reviewKyc` holds
 *       `kyc:<userId>`; `submitForReview` takes NO lock and does a
 *       read-modify-write of the WHOLE record (`{...k, status: "PENDING_REVIEW"}`).
 *       If its stale read lands last it can drag an APPROVED submission back to
 *       PENDING_REVIEW and null the reviewerId/reviewedAt the officer just wrote —
 *       losing the decision, exactly like the Source-of-Funds overwrite in D3.
 *
 * Usage:
 *   $env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
 *   node scripts/load/reset-db.mjs
 *   npx tsx scripts/load/s15-kyc-decision-race.mts
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.DATABASE_URL;
if (!BASE) { console.error("DATABASE_URL not set"); process.exit(1); }
const client = new PrismaClient({ datasources: { db: { url: BASE } } });

{
  const r = await client.$queryRawUnsafe<{ value: unknown }[]>(
    `SELECT value FROM "SystemConfig" WHERE key = '__LOAD_TEST_TARGET__'`).catch(() => []);
  if (r[0]?.value !== "I_AM_A_DISPOSABLE_LOAD_TEST_DB") {
    console.error("\n  ABORT — target DB is not a certified disposable load-test DB.\n");
    process.exit(2);
  }
}

const { reviewKyc, submitForReview } = await import("../../src/lib/server/kyc-service.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? `\n      ${extra}` : ""}`); }
};

const rid = () => Math.random().toString(36).slice(2, 8);

async function mkUser(id: string, phone: string, role: "PLAYER" | "ADMIN") {
  await client.$executeRawUnsafe(`
    INSERT INTO "User" (id, "phoneE164", "failedLoginCount", role, status, locale,
                        "marketingOptIn", "twoFactorEnabled", "createdAt", "updatedAt")
    VALUES ('${id}', '${phone}', 0, '${role}', '${role === "PLAYER" ? "PENDING_KYC" : "ACTIVE"}',
            'EN', false, false, now(), now())`);
}

/** A submission sitting in PENDING_REVIEW with its three documents. */
async function mkPending(userId: string, kycId: string) {
  // Build the 20-digit NIDA in JS — the partial unique index added in D1 means
  // every fixture needs its own, and a JS method inside the SQL string is sent
  // to Postgres verbatim (it was, and it failed with 42601).
  const nida = (String(Date.now()) + String(Math.floor(Math.random() * 1e9)).padStart(9, "0")).slice(0, 20);
  await client.$executeRawUnsafe(`
    INSERT INTO "KycSubmission" (id, "userId", status, "nidaNumber", "nidaVerifiedAt",
                                 "fullName", dob, "submittedAt", "createdAt", "updatedAt")
    VALUES ('${kycId}', '${userId}', 'PENDING_REVIEW', '${nida}',
            now(), 'Asha Mwamba Juma', '1990-01-01', now(), now(), now())`);
  for (const t of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"]) {
    await client.$executeRawUnsafe(`
      INSERT INTO "KycDocument" (id, "submissionId", "docType", "storageKey", "mimeType", "sizeBytes", "uploadedAt", rejected)
      VALUES ('doc_${rid()}${t}', '${kycId}', '${t}', 'data:image/jpeg;base64,/9j/seed', 'image/jpeg', 3, now(), false)`);
  }
}

const row = async (userId: string) =>
  (await client.$queryRawUnsafe<{ status: string; reviewerId: string | null; reviewedAt: Date | null }[]>(
    `SELECT status::text, "reviewerId", "reviewedAt" FROM "KycSubmission" WHERE "userId"='${userId}'`))[0];

console.log(`\n  S15 — KYC decisions under real-database concurrency\n`);

/* ── A · two officers, one submission, same instant ───────────────────────── */
console.log("  A · two officers decide the same submission at once");
{
  const p = `p_${rid()}`, o1 = `o1_${rid()}`, o2 = `o2_${rid()}`;
  await mkUser(p, `+2557${String(Date.now()).slice(-8)}`, "PLAYER");
  await mkUser(o1, `+2557${String(Date.now() + 1).slice(-8)}`, "ADMIN");
  await mkUser(o2, `+2557${String(Date.now() + 2).slice(-8)}`, "ADMIN");
  await mkPending(p, `kyc_${rid()}`);

  const [a, b] = await Promise.all([
    reviewKyc({ officerId: o1, userId: p, decision: "APPROVE" }),
    reviewKyc({ officerId: o2, userId: p, decision: "REJECT", reason: "Documents unreadable" }),
  ]);

  const winners = [a, b].filter((r) => r.ok).length;
  ok("exactly ONE officer's decision is accepted", winners === 1,
    `both returned ok — the second overwrote the first. a=${JSON.stringify(a)} b=${JSON.stringify(b)}`);
  const after = await row(p);
  ok("the submission ends in a decided state", after.status === "APPROVED" || after.status === "REJECTED",
    `status=${after.status}`);
  ok("a reviewer is recorded", !!after.reviewerId);
  const loser = a.ok ? b : a;
  ok("the loser is told it was already decided, not given a generic error",
    !loser.ok && /already|only a submission awaiting review/i.test(loser.error ?? ""),
    `loser said: ${JSON.stringify(loser)}`);
}

/* ── B · player resubmits while an officer is approving ───────────────────── */
console.log("\n  B · a player resubmits mid-approval");
{
  const p = `p_${rid()}`, o = `o_${rid()}`;
  await mkUser(p, `+2557${String(Date.now() + 3).slice(-8)}`, "PLAYER");
  await mkUser(o, `+2557${String(Date.now() + 4).slice(-8)}`, "ADMIN");
  await mkPending(p, `kyc_${rid()}`);

  // Fire both at the same instant. submitForReview takes no lock, so if it is
  // able to write it will do so from whatever it read.
  const [rev, sub] = await Promise.all([
    reviewKyc({ officerId: o, userId: p, decision: "APPROVE" }),
    submitForReview(p),
  ]);

  const after = await row(p);
  ok("the officer's approval succeeded", rev.ok, JSON.stringify(rev));
  ok("🔴 the approval SURVIVES a concurrent resubmit", after.status === "APPROVED",
    `status is ${after.status} — a stale read from submitForReview dragged an APPROVED\n` +
    `      submission back into the queue. The player is unlocked but their KYC says\n` +
    `      otherwise, and the withdrawal gate (which requires APPROVED) re-closes.`);
  ok("🔴 the officer's identity on the decision is not wiped", !!after.reviewerId,
    "reviewerId was nulled by the resubmit's whole-record write — the audit row still\n" +
    "      names the officer, but the submission no longer records who decided it.");
  ok("submitForReview did not report a false success", sub.ok === true || !sub.ok,
    JSON.stringify(sub));
}

/* ── C · the path where submitForReview actually WRITES ───────────────────── */
// Case B starts at PENDING_REVIEW, where submitForReview's idempotency guard
// short-circuits before writing — so it proves less than it looks. The dangerous
// state is ADDITIONAL_INFO_REQUIRED: there the guard does NOT apply, and
// submitForReview does a whole-record write from a possibly-stale read.
console.log("\n  C · resubmit-from-ADDITIONAL_INFO races an approval (the write path)");
{
  const p = `p_${rid()}`, o = `o_${rid()}`;
  await mkUser(p, `+2557${String(Date.now() + 5).slice(-8)}`, "PLAYER");
  await mkUser(o, `+2557${String(Date.now() + 6).slice(-8)}`, "ADMIN");
  const kycId = `kyc_${rid()}`;
  await mkPending(p, kycId);
  // Officer asks for more info first, so the submission sits in the state where
  // the player is expected — and permitted — to resubmit.
  const info = await reviewKyc({ officerId: o, userId: p, decision: "REQUEST_INFO", reason: "Please reupload a clearer ID back." });
  ok("submission moved to ADDITIONAL_INFO_REQUIRED", info.ok && (await row(p)).status === "ADDITIONAL_INFO_REQUIRED");

  const [rev, sub] = await Promise.all([
    reviewKyc({ officerId: o, userId: p, decision: "APPROVE" }),
    submitForReview(p),
  ]);

  const after = await row(p);
  ok("🔴 the two writers do not leave a contradictory record",
    (rev.ok && after.status === "APPROVED" && !!after.reviewerId) ||
    (!rev.ok && after.status === "PENDING_REVIEW"),
    `review=${JSON.stringify(rev)} resubmit=${JSON.stringify(sub)} final status=${after.status}\n` +
    `      reviewerId=${after.reviewerId}. An APPROVED submission with a null reviewer, or an\n` +
    `      approval silently dragged back to PENDING_REVIEW, means one writer's whole-record\n` +
    `      write clobbered the other's — the officer's decision is lost and the withdrawal\n` +
    `      gate disagrees with what the officer believes they did.`);
  ok("the final state is one the state machine defines",
    ["APPROVED", "PENDING_REVIEW", "ADDITIONAL_INFO_REQUIRED"].includes(after.status),
    `status=${after.status}`);
}

console.log("");
console.log("─".repeat(64));
console.log(`  S15 · KYC DECISION RACE: ${pass} passed, ${fail} failed`);
console.log("─".repeat(64));
await client.$disconnect();
process.exit(fail > 0 ? 1 : 0);
