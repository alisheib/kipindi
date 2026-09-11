/**
 * 🔴 THE P0, PROVEN AGAINST A REAL POSTGRES — `scripts/kyc-restart-clears-documents.test.mts`.
 *
 * ⛔ WHY THIS FILE EXISTS AND WHY IT NEEDS A DATABASE. Until 2026-09-11
 * `prisma-dal.ts`'s `kyc.upsert` guarded its document sync with
 * `if (k.documents?.length)`. `startKyc` restarts a REJECTED / NOT_STARTED submission
 * by rebuilding it with `documents: []` AND REUSING THE EXISTING ROW ID — and `[]` is
 * falsy on `.length`, so the delete never ran and the previous attempt's `KycDocument`
 * rows stayed attached in Postgres.
 *
 * ⭐ THE REASON NOTHING WENT RED FOR MONTHS IS THE REASON THIS SUITE IS SHAPED LIKE
 * THIS. The in-memory half replaces the object wholesale
 * (`store.ts` — `upsert: (k) => { store.kyc.set(k.id, k); … }`) and DID clear the
 * documents. EVERY unit suite in this repo runs on that half. So the behaviour under
 * test is, by construction, invisible to every green suite we own: the halves
 * disagreed, the tests ran on the half that was right, and production ran the half that
 * was wrong. A test that cannot fail on the broken code is not evidence, and the only
 * way to make this one able to fail was to give it the backend that was broken.
 *
 * ⛔ IT WAS NOT COSMETIC. `submitForReview`'s `missingSlots` check reads `k.documents`,
 * so once the player re-entered their identity the OLD, already-refused images
 * satisfied the required slots and the file passed back to an officer as complete.
 * Reachable entirely from shipped code: APPROVED → `forceReverifyKyc` → officer REJECT
 * → the player taps "start again", which `startKyc` permits because the status is
 * REJECTED.
 *
 * ⛔ IT CANNOT JOIN `predeploy`, AND SAYING SO IS PART OF THE POINT. Predeploy runs with
 * no `DATABASE_URL`; a guard that SKIPS prints green, and a green skip is exactly the
 * comfort this defect hid behind for months. So this refuses to skip: with no database
 * URL it exits **3** and says what to run. The predeploy-safe half of the protection is
 * the SOURCE assertion in `scripts/kyc-stage.test.mts`, which cannot skip because it
 * only reads a file.
 *
 * RUN IT:
 *   npx tsx scripts/db-scratch.mts --run npx tsx scripts/kyc-restart-clears-documents.test.mts
 * (`db-scratch` boots a disposable PostgreSQL 18.3 on 127.0.0.1:5433 and exports
 * `VERIFY_DATABASE_URL`; this script promotes that to `DATABASE_URL` for Prisma.)
 */
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const RAW = process.env.VERIFY_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (!RAW) {
  console.error(
    "!! NO DATABASE. This guard refuses to skip — a skipped guard prints green, which is\n" +
    "   how the very defect it covers survived. Run it with a real Postgres:\n\n" +
    "   npx tsx scripts/db-scratch.mts --run npx tsx scripts/kyc-restart-clears-documents.test.mts\n",
  );
  process.exit(3);
}
// ⛔ A disposable cluster only. This suite CREATES and DESTROYS rows, so it must never
// be pointed at the live money database by an inherited environment variable.
if (/rlwy\.net|railway\.app|railway\.internal|amazonaws|supabase/i.test(RAW)) {
  console.error(`!! refusing: this guard writes and deletes rows and will not run against a hosted database (${RAW.replace(/:[^:@]*@/, ":***@")}).`);
  process.exit(2);
}

// A dedicated database on the scratch cluster, so a re-run is never polluted by the last.
const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = "kyc_restart_guard";
const URL = `${BASE}/${DB}`;

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const admin = new PrismaClient({ datasources: { db: { url: RAW } } });
await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.$executeRawUnsafe(`CREATE DATABASE "${DB}"`);
await admin.$disconnect();

console.log(`Applying migrations to ${DB} …`);
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: URL },
  stdio: "inherit",
  shell: process.platform === "win32",
});

// The DAL reads `DATABASE_URL` at import time, so it is set BEFORE the dynamic import.
process.env.DATABASE_URL = URL;
const { db } = await import("../src/lib/server/store.ts");

const now = new Date().toISOString();
const USER = "usr_p0_restart_guard";
const KYC = "kyc_p0_restart_guard";

await db.user.create({
  id: USER, phoneE164: "+255700000911", displayName: "P0 Restart Guard",
  status: "PENDING_KYC", role: "PLAYER", locale: "EN",
  createdAt: now, updatedAt: now,
} as Parameters<typeof db.user.create>[0]);

/** A submission carrying two document slots — what a player has after uploading. */
const seed = async () => db.kyc.upsert({
  id: KYC, userId: USER, status: "REJECTED",
  rejectReason: null, rejectNote: null,
  idType: "NIDA", idNumber: "19900101000000000001", idExpiry: null,
  idVerifiedAt: now, idFingerprint: null,
  fullName: "P Zero", dob: "1990-01-01", gender: null,
  reviewerId: null, reviewedAt: now, submittedAt: now, approvedAt: null,
  extraRequests: null,
  documents: [
    { docType: "NIDA_FRONT", storageKey: "data:image/png;base64,AAAA", uploadedAt: now, mimeType: "image/png", sizeBytes: 4 },
    { docType: "NIDA_BACK",  storageKey: "data:image/png;base64,BBBB", uploadedAt: now, mimeType: "image/png", sizeBytes: 4 },
  ],
  createdAt: now, updatedAt: now,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

console.log("\n§1 · a rejected submission holds the documents the player uploaded");
await seed();
const seeded = await db.kyc.findByUserId(USER);
ok("two document slots are attached", (seeded?.documents?.length ?? 0) === 2, `got ${seeded?.documents?.length ?? 0}`);

console.log("\n§2 · 🔴 THE DEFECT — `startKyc`'s reset must DESTROY them in Postgres");
// This is exactly what `startKyc` writes: the same row id, rebuilt, `documents: []`.
await db.kyc.upsert({ ...seeded!, status: "IN_PROGRESS", idNumber: null, idType: null, idVerifiedAt: null, submittedAt: null, documents: [], updatedAt: new Date().toISOString() });
const afterReset = await db.kyc.findByUserId(USER);
ok(
  "🔴 a restart leaves ZERO documents attached",
  (afterReset?.documents?.length ?? 0) === 0,
  `got ${afterReset?.documents?.length ?? 0} — the previous attempt's images survived the reset`,
);

// ⭐ THE ROW COUNT, NOT THE MAPPED SHAPE. `findByUserId` could in principle filter; the
// question is whether the BYTES are still in the table, because that is what
// `missingSlots` would read and what an officer would be shown.
const raw = new PrismaClient({ datasources: { db: { url: URL } } });
const stillThere = await raw.kycDocument.count({ where: { submissionId: KYC } });
ok("🔴 …and zero `KycDocument` ROWS remain in the table", stillThere === 0, `${stillThere} row(s) still in KycDocument`);

console.log("\n§3 · the `undefined` contract still holds — an omitted array touches nothing");
await seed();
const { documents: _omit, ...noDocsField } = (await db.kyc.findByUserId(USER))!;
await db.kyc.upsert(noDocsField as Parameters<typeof db.kyc.upsert>[0]);
const afterOmit = await raw.kycDocument.count({ where: { submissionId: KYC } });
ok("a caller that OMITS `documents` leaves the rows alone", afterOmit === 2, `got ${afterOmit}, expected 2`);

console.log("\n§4 · a non-empty array still replaces");
await db.kyc.upsert({
  ...(await db.kyc.findByUserId(USER))!,
  documents: [{ docType: "SELFIE", storageKey: "data:image/png;base64,CCCC", uploadedAt: now, mimeType: "image/png", sizeBytes: 4 }],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
const afterReplace = await raw.kycDocument.findMany({ where: { submissionId: KYC }, select: { docType: true } });
ok("replacing leaves exactly the new slot", afterReplace.length === 1 && afterReplace[0].docType === "SELFIE", JSON.stringify(afterReplace));

console.log("\n§5 · control — the guard can actually FAIL");
// ⛔ EVERY REFUSAL HAS A CONTROL. If the assertions above can only pass, they are
// decoration. This plants the OLD behaviour by writing the rows behind the DAL's back
// and asserting the count is non-zero — proving §2's query observes what it claims to.
await raw.kycDocument.create({ data: { submissionId: KYC, docType: "NIDA_FRONT", storageKey: "x", mimeType: "image/png", sizeBytes: 1 } });
const planted = await raw.kycDocument.count({ where: { submissionId: KYC } });
ok("the control sees a planted row (so §2's query is not blind)", planted === 2, `got ${planted}`);

await raw.$disconnect();

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
