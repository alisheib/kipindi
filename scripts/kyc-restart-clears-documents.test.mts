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
 * Reachable entirely from shipped code: APPROVED → an officer's refusal (since 2026-10-10 an
 * officer may refuse an APPROVED identity directly; before, via `forceReverifyKyc` and a REJECT)
 * → the player taps "start again", which `startKyc` permits because the status is REJECTED.
 * Since 2026-10-10 the photo track is the AGENT's (players type their details), and the same
 * `missingSlots` question decides whether an agent applicant's photo case may be sent.
 *
 * ⭐ AND THE SIX COLUMNS OF 2026-10-10 (§6–§8). Typed-only KYC added `photoVerifiedAt`, `autoApprovedAt`,
 * `autoFlags`, `postCheckedAt`, `postCheckedById` and `priorIdentities` to the submission, and two readers
 * (`findSamePersonCandidates`, `listUncheckedAutoApprovals`). They are the same defect class as the P0
 * above: `kyc.upsert` writes back the whole row its caller read, so a column one DAL half drops is NULLED on
 * the next write — and the unit suites only ever see the in-memory half. So the SAME scenario runs on BOTH
 * halves in this one guard: here against Postgres, and in a child process of this same file with no
 * database (the in-memory store), and the two observations must be equal, part by part.
 * ⚠️ The child is this file re-run with `KYC_RESTART_GUARD_HALF=memory` and the database variables removed —
 * no second script to keep in step.
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
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// ── THE SCENARIO BOTH HALVES RUN (2026-10-10) ─────────────────────────────────────────────────────────────
// ⛔ Fixed timestamps, so the two halves' observations can be compared value for value; the one stamp the
// product writes itself (a restart's `supersededAt`) is checked for shape, never compared.
type StoreDb = (typeof import("../src/lib/server/store.ts"))["db"];
type StartKyc = (userId: string) => Promise<{ ok: boolean }>;
const T0 = "2026-10-10T08:00:00.000Z";
const T1 = "2026-10-10T08:05:00.000Z";
const T2 = "2026-10-10T08:10:00.000Z";
const SP_DAY = "1991-05-05";
const RS6_OFFICER = "usr_rs6_officer";
const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PRIOR = {
  idType: "PASSPORT", idNumber: "AB1234567", idExpiry: "2030-01-01", fullName: "Six Fields Before", dob: "1990-02-02",
  idFingerprint: "fp_prior_1", status: "APPROVED", approvedAt: T0, reviewerId: RS6_OFFICER, cause: "correction", supersededAt: T0,
};
/** A timestamp as ISO, whatever shape the half returned it in (the store keeps strings, Postgres returns Date-derived ISO). */
const ts = (v: unknown): string | null => (v ? new Date(String(v)).toISOString() : null);
/** One prior identity, in a FIXED key order — jsonb does not keep the order an object was written in. */
const priorKey = (p: Record<string, unknown>) => ({
  idType: p.idType ?? null, idNumber: p.idNumber ?? null, idExpiry: p.idExpiry ? String(p.idExpiry).slice(0, 10) : null,
  fullName: p.fullName ?? null, dob: p.dob ? String(p.dob).slice(0, 10) : null, idFingerprint: p.idFingerprint ?? null,
  status: p.status ?? null, approvedAt: ts(p.approvedAt), reviewerId: p.reviewerId ?? null, cause: p.cause ?? null,
});
/** The six columns of 2026-10-10, as one comparable value. */
const six = (k: Record<string, unknown> | null | undefined) => ({
  photoVerifiedAt: ts(k?.photoVerifiedAt), autoApprovedAt: ts(k?.autoApprovedAt),
  autoFlags: Array.isArray(k?.autoFlags) ? [...(k!.autoFlags as string[])] : [],
  postCheckedAt: ts(k?.postCheckedAt), postCheckedById: (k?.postCheckedById as string | null | undefined) ?? null,
  priorIdentities: (Array.isArray(k?.priorIdentities) ? (k!.priorIdentities as Record<string, unknown>[]) : []).map(priorKey),
});
/** A submission row with EVERY column named — the shape a writer that builds a row must produce. */
const row = (o: Record<string, unknown>) => ({
  rejectReason: null, rejectNote: null, idType: null, idNumber: null, idExpiry: null, idVerifiedAt: null, idFingerprint: null,
  fullName: null, dob: null, documents: [], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: null,
  photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [],
  createdAt: T0, updatedAt: T0, ...o,
});

async function scenario(db: StoreDb, startKyc: StartKyc) {
  let phone = 930;
  const mkUser = (id: string, role = "PLAYER") => db.user.create({
    id, phoneE164: `+255700000${String(++phone).padStart(3, "0")}`, displayName: id, status: "ACTIVE", role, locale: "EN", createdAt: T0, updatedAt: T0,
  } as Parameters<typeof db.user.create>[0]);
  const upsert = (o: Record<string, unknown>) => db.kyc.upsert(row(o) as Parameters<typeof db.kyc.upsert>[0]);
  await mkUser(RS6_OFFICER, "COMPLIANCE");

  // ── §6 · the six columns through a write, a spread write, and the restart ─────────────────────────────────
  await mkUser("usr_rs6_six");
  await upsert({
    id: "kyc_rs6_six", userId: "usr_rs6_six", status: "APPROVED", idType: "NIDA", idNumber: "19900101000000000061", idVerifiedAt: T0,
    fullName: "Six Fields", dob: "1990-01-01", reviewerId: RS6_OFFICER, reviewedAt: T1, submittedAt: T0, approvedAt: T1,
    documents: ["NIDA_FRONT", "NIDA_BACK", "SELFIE"].map((docType) => ({ docType, storageKey: PNG_1PX, uploadedAt: T0, mimeType: "image/png", sizeBytes: 70 })),
    photoVerifiedAt: T1, autoApprovedAt: T0, autoFlags: ["PASSPORT_SHAPE", "SAME_PERSON"], postCheckedAt: T2, postCheckedById: RS6_OFFICER,
    priorIdentities: [PRIOR], updatedAt: T2,
  });
  const r1 = await db.kyc.findByUserId("usr_rs6_six");
  const roundTrip = six(r1 as never);
  // The E-3 shape: a writer that SPREADS the row it read and changes one thing.
  await db.kyc.upsert({ ...r1!, status: "ADDITIONAL_INFO_REQUIRED", updatedAt: T2 });
  const r2 = await db.kyc.findByUserId("usr_rs6_six");
  const afterSpread = six(r2 as never);
  // An officer's recoverable refusal, then the player's restart — the REAL `startKyc`, which builds the row field by field.
  await db.kyc.upsert({ ...r2!, status: "REJECTED", rejectReason: "DETAILS_MISMATCH", updatedAt: T2 });
  const started = await startKyc("usr_rs6_six");
  const r3 = await db.kyc.findByUserId("usr_rs6_six");
  const restartPrior = (Array.isArray(r3?.priorIdentities) ? r3!.priorIdentities : []) as Record<string, unknown>[];
  const restart = {
    ok: started.ok, status: r3?.status ?? null, documents: r3?.documents?.length ?? -1, idNumber: r3?.idNumber ?? null,
    approvedAt: ts(r3?.approvedAt), reviewerId: r3?.reviewerId ?? null, ...six(r3 as never),
    supersededIso: restartPrior.length > 0 && restartPrior.every((p) => typeof p.supersededAt === "string" && !Number.isNaN(Date.parse(String(p.supersededAt)))),
  };

  // ── §7 · the same-person reader ────────────────────────────────────────────────────────────────────────────
  const SP: Array<[string, string | null, string, string, string | null]> = [
    ["usr_rs6_sp_self", "Juma Ali Hassan", SP_DAY, "IN_PROGRESS", null],
    ["usr_rs6_sp_a", "Juma Ali Hassan", SP_DAY, "APPROVED", null],
    ["usr_rs6_sp_b", "hassan  JUMA ali", SP_DAY, "REJECTED", "UNDERAGE"],
    ["usr_rs6_sp_c", "Neema Other", SP_DAY, "IN_PROGRESS", null],
    ["usr_rs6_sp_erased", "Erased usr_rs6_sp_erased", SP_DAY, "REJECTED", "OTHER"],
    ["usr_rs6_sp_next", "Juma Ali Hassan", "1991-05-06", "APPROVED", null],
    ["usr_rs6_sp_prev", "Juma Ali Hassan", "1991-05-04", "APPROVED", null],
    ["usr_rs6_sp_noname", null, SP_DAY, "IN_PROGRESS", null],
  ];
  for (const [userId, fullName, dob, status, rejectReason] of SP) {
    await mkUser(userId);
    await upsert({ id: `kyc_${userId}`, userId, status, rejectReason, fullName, dob });
  }
  const bySorted = <T extends { userId: string }>(xs: T[]) => [...xs].sort((a, b) => a.userId.localeCompare(b.userId));
  const samePerson = bySorted((await db.kyc.findSamePersonCandidates(SP_DAY, "usr_rs6_sp_self")).filter((c) => c.userId.startsWith("usr_rs6_")))
    .map((c) => ({ userId: c.userId, fullName: c.fullName ?? null, status: c.status, rejectReason: c.rejectReason ?? null }));
  // The reader is asked with a full Prisma-shaped timestamp too — the service passes a day, but a timestamp must not shift it.
  const samePersonFromIso = bySorted((await db.kyc.findSamePersonCandidates(`${SP_DAY}T00:00:00.000Z`, "usr_rs6_sp_self")).filter((c) => c.userId.startsWith("usr_rs6_")))
    .map((c) => c.userId);

  // ── §8 · the post-check list ────────────────────────────────────────────────────────────────────────────────
  await mkUser("usr_rs6_auto1");
  await upsert({ id: "kyc_rs6_auto1", userId: "usr_rs6_auto1", status: "APPROVED", idType: "VOTER_CARD", idNumber: "RS6AUTO1", idVerifiedAt: T0, fullName: "Auto One", dob: "1990-03-03", approvedAt: T0, autoApprovedAt: T0, autoFlags: ["NO_PUBLISHED_FORMAT"] });
  await mkUser("usr_rs6_auto2");
  await upsert({ id: "kyc_rs6_auto2", userId: "usr_rs6_auto2", status: "APPROVED", idType: "VOTER_CARD", idNumber: "RS6AUTO2", idVerifiedAt: T0, fullName: "Auto Two", dob: "1990-03-04", approvedAt: T0, autoApprovedAt: T0, postCheckedAt: T1, postCheckedById: RS6_OFFICER });
  await mkUser("usr_rs6_auto3");
  await upsert({ id: "kyc_rs6_auto3a", userId: "usr_rs6_auto3", status: "APPROVED", idType: "VOTER_CARD", idNumber: "RS6AUTO3", idVerifiedAt: T0, fullName: "Auto Three", dob: "1990-03-05", approvedAt: T0, autoApprovedAt: T0, createdAt: T0 });
  await upsert({ id: "kyc_rs6_auto3b", userId: "usr_rs6_auto3", status: "IN_PROGRESS", fullName: null, createdAt: T1, updatedAt: T1 });
  // ⭐ 2026-10-10 (review R5.1c): an unchecked automatic approval stays on the list WITH AN OFFICER (a photo send, a routed
  // correction) and WITH THE PLAYER (corrections asked), each row carrying its status — never once refused, restarted or
  // re-opened (nothing sent), and never without the `approvedAt` withdrawal reads.
  await mkUser("usr_rs6_auto4");
  await upsert({ id: "kyc_rs6_auto4", userId: "usr_rs6_auto4", status: "PENDING_REVIEW", idType: "VOTER_CARD", idNumber: "RS6AUTO4", idVerifiedAt: T0, fullName: "Auto Four", dob: "1990-03-06", submittedAt: T1, approvedAt: T1, autoApprovedAt: T1, autoFlags: ["SAME_PERSON"] });
  await mkUser("usr_rs6_auto5");
  await upsert({ id: "kyc_rs6_auto5", userId: "usr_rs6_auto5", status: "ADDITIONAL_INFO_REQUIRED", idType: "VOTER_CARD", idNumber: "RS6AUTO5", idVerifiedAt: T0, fullName: "Auto Five", dob: "1990-03-07", reviewerId: RS6_OFFICER, reviewedAt: T2, approvedAt: T2, autoApprovedAt: T2 });
  await mkUser("usr_rs6_auto6");
  await upsert({ id: "kyc_rs6_auto6", userId: "usr_rs6_auto6", status: "REJECTED", rejectReason: "DETAILS_MISMATCH", idType: "VOTER_CARD", idNumber: "RS6AUTO6", idVerifiedAt: T0, fullName: "Auto Six", dob: "1990-03-08", reviewerId: RS6_OFFICER, reviewedAt: T1, approvedAt: T0, autoApprovedAt: T0 });
  await mkUser("usr_rs6_auto7");
  await upsert({ id: "kyc_rs6_auto7", userId: "usr_rs6_auto7", status: "IN_PROGRESS", fullName: null, reviewerId: RS6_OFFICER, reviewedAt: T1, approvedAt: T0, autoApprovedAt: T0 });
  await mkUser("usr_rs6_auto8");
  await upsert({ id: "kyc_rs6_auto8", userId: "usr_rs6_auto8", status: "PENDING_REVIEW", idType: "VOTER_CARD", idNumber: "RS6AUTO8", idVerifiedAt: T0, fullName: "Auto Eight", dob: "1990-03-09", submittedAt: T1, approvedAt: null, autoApprovedAt: T0 });
  const listedRs6 = (await db.kyc.listUncheckedAutoApprovals()).filter((u) => u.userId.startsWith("usr_rs6_"));
  const unchecked = bySorted(listedRs6)
    .map((u) => ({ id: u.id, userId: u.userId, status: u.status, idType: u.idType ?? null, autoApprovedAt: ts(u.autoApprovedAt), autoFlags: [...u.autoFlags], approvedAt: ts(u.approvedAt) }));
  // The ORDER as the store returns it — newest approval first (`autoApprovedAt` desc, then `id` desc), on both halves.
  const uncheckedOrder = listedRs6.map((u) => u.id);

  return { roundTrip, afterSpread, restart, samePerson, samePersonFromIso, unchecked, uncheckedOrder };
}
type Observation = Awaited<ReturnType<typeof scenario>>;
const HALF_TAG = "KYC_RESTART_GUARD_MEMORY_HALF ";

// ⭐ THE IN-MEMORY HALF — this file, re-run by the Postgres half as a child with no database (see the header).
if (process.env.KYC_RESTART_GUARD_HALF === "memory") {
  delete process.env.DATABASE_URL;
  delete process.env.VERIFY_DATABASE_URL;
  const { db: memDb } = await import("../src/lib/server/store.ts");
  const { startKyc: memStartKyc } = await import("../src/lib/server/kyc-service.ts");
  const obs = await scenario(memDb, memStartKyc);
  console.log(`${HALF_TAG}${JSON.stringify(obs)}`);
  process.exit(0);
}

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

// ══ §6–§8 · THE COLUMNS AND READERS OF 2026-10-10, ON BOTH HALVES ═════════════════════════════════════════
const J = (x: unknown) => JSON.stringify(x);
const { startKyc: pgStartKyc } = await import("../src/lib/server/kyc-service.ts");
const pg = await scenario(db, pgStartKyc);

// The in-memory half: this same file, as a child with no database (see the header).
const childEnv: Record<string, string | undefined> = { ...process.env, KYC_RESTART_GUARD_HALF: "memory" };
delete childEnv.DATABASE_URL;
delete childEnv.VERIFY_DATABASE_URL;
let mem: Observation | null = null;
let childErr = "";
try {
  const out = execFileSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url)], {
    env: childEnv as NodeJS.ProcessEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
  });
  const line = out.split(String.fromCharCode(10)).map((l) => l.trim()).find((l) => l.startsWith(HALF_TAG));
  if (line) mem = JSON.parse(line.slice(HALF_TAG.length)) as Observation;
  else childErr = "the child printed no observation line";
} catch (e) {
  childErr = String((e as { stderr?: string }).stderr || (e as Error)?.message || e).slice(0, 800);
}

const SIX_WRITTEN = {
  photoVerifiedAt: T1, autoApprovedAt: T0, autoFlags: ["PASSPORT_SHAPE", "SAME_PERSON"], postCheckedAt: T2,
  postCheckedById: RS6_OFFICER, priorIdentities: [priorKey(PRIOR)],
};
const RESTARTED_PRIOR = [priorKey(PRIOR), {
  idType: "NIDA", idNumber: "19900101000000000061", idExpiry: null, fullName: "Six Fields", dob: "1990-01-01", idFingerprint: null,
  status: "REJECTED", approvedAt: T1, reviewerId: RS6_OFFICER, cause: "restart",
}];

console.log("");
console.log("§6 · the six columns survive a write, a spread write and the restart — Postgres");
ok("6.1 🔴 every one of the six reads back exactly as written", J(pg.roundTrip) === J(SIX_WRITTEN), J(pg.roundTrip));
ok("6.2 🔴 …and survives a writer that spreads the row it read (the E-3 shape)", J(pg.afterSpread) === J(SIX_WRITTEN), J(pg.afterSpread));
ok("6.3 the restart (the REAL startKyc) is accepted and resets the identity", pg.restart.ok && pg.restart.status === "IN_PROGRESS" && pg.restart.idNumber === null, J(pg.restart));
ok("6.4 🔴 …clears the documents (the P0) — and the KycDocument rows are gone from the table",
  pg.restart.documents === 0 && (await raw.kycDocument.count({ where: { submissionId: "kyc_rs6_six" } })) === 0, `documents=${pg.restart.documents}`);
ok("6.5 ⭐ …APPENDS the identity it released to priorIdentities (cause restart), after the history it already had",
  J(pg.restart.priorIdentities) === J(RESTARTED_PRIOR) && pg.restart.supersededIso, J(pg.restart.priorIdentities));
ok("6.6 ⭐ …clears the approval's stamps (photo, automatic, flags, the officer's check) — the next identity earns its own",
  pg.restart.photoVerifiedAt === null && pg.restart.autoApprovedAt === null && pg.restart.autoFlags.length === 0
    && pg.restart.postCheckedAt === null && pg.restart.postCheckedById === null, J(pg.restart));
ok("6.7 🔴 …and KEEPS the first approval and the refusing officer (provenance)",
  pg.restart.approvedAt === T1 && pg.restart.reviewerId === RS6_OFFICER, `${pg.restart.approvedAt} · ${pg.restart.reviewerId}`);

console.log("");
console.log("§7 · the same-person reader — Postgres");
const NAMED = ["usr_rs6_sp_a", "usr_rs6_sp_b", "usr_rs6_sp_c"];
const pgNamed = pg.samePerson.filter((c) => c.fullName !== null);
ok("7.1 the day's rows on OTHER accounts — never the asker's own, never an erased one, never the day before or after",
  J(pgNamed.map((c) => c.userId)) === J(NAMED), J(pg.samePerson.map((c) => c.userId)));
ok("7.2 …scalars only, with the status and refusal code the service's restriction rule reads",
  pgNamed.every((c) => typeof c.status === "string") && pgNamed.find((c) => c.userId === "usr_rs6_sp_b")?.rejectReason === "UNDERAGE", J(pgNamed));
ok("7.3 …and a full timestamp names the same day as the bare date", J(pg.samePersonFromIso) === J(pg.samePerson.map((c) => c.userId)), J(pg.samePersonFromIso));
// ⚠️ The contract, decided 2026-10-10 (review R2.9): a row with NO name — null or empty — is NOT a candidate, on BOTH
// halves. It can never match (the service's name key is empty, and an empty key matches nothing), and the halves used to
// disagree on it (Postgres dropped null through NOT(NULL LIKE …), memory kept it; Postgres kept ""). Asked separately,
// so a divergence names itself instead of hiding inside 7.1; §9.5 compares the halves on the whole result.
ok("7.4 a row with NO name is never a candidate (it cannot match a name — both halves skip it)", !pg.samePerson.some((c) => c.userId === "usr_rs6_sp_noname"),
  J(pg.samePerson.map((c) => c.userId)));

console.log("");
console.log("§8 · the post-check list — Postgres");
ok("8.1 only the NEWEST row per account, approved automatically and not yet checked — APPROVED, with an officer or with the player, each with its status",
  J(pg.unchecked) === J([
    { id: "kyc_rs6_auto1", userId: "usr_rs6_auto1", status: "APPROVED", idType: "VOTER_CARD", autoApprovedAt: T0, autoFlags: ["NO_PUBLISHED_FORMAT"], approvedAt: T0 },
    { id: "kyc_rs6_auto4", userId: "usr_rs6_auto4", status: "PENDING_REVIEW", idType: "VOTER_CARD", autoApprovedAt: T1, autoFlags: ["SAME_PERSON"], approvedAt: T1 },
    { id: "kyc_rs6_auto5", userId: "usr_rs6_auto5", status: "ADDITIONAL_INFO_REQUIRED", idType: "VOTER_CARD", autoApprovedAt: T2, autoFlags: [], approvedAt: T2 },
  ]),
  J(pg.unchecked));
ok("8.2 ⛔ R5.1c · never a REFUSED row, a restarted / re-opened one (IN_PROGRESS), one an officer checked, or one with no approvedAt",
  !pg.unchecked.some((u) => ["usr_rs6_auto2", "usr_rs6_auto3", "usr_rs6_auto6", "usr_rs6_auto7", "usr_rs6_auto8"].includes(u.userId)), J(pg.unchecked.map((u) => u.userId)));
ok("8.3 ⭐ …newest approval first (autoApprovedAt desc, then id desc)", J(pg.uncheckedOrder) === J(["kyc_rs6_auto5", "kyc_rs6_auto4", "kyc_rs6_auto1"]), J(pg.uncheckedOrder));

console.log("");
console.log("§9 · ⭐ THE TWO HALVES AGREE — the in-memory store, run in a child with no database");
ok("9.0 control · the in-memory half ran and reported", mem !== null, childErr);
if (mem) {
  ok("9.1 the six columns' round trip is identical on both halves", J(mem.roundTrip) === J(pg.roundTrip), `memory ${J(mem.roundTrip)}`);
  ok("9.2 …and after a spread write", J(mem.afterSpread) === J(pg.afterSpread), `memory ${J(mem.afterSpread)}`);
  const strip = (r: Observation["restart"]) => ({ ...r, supersededIso: true });
  ok("9.3 the restart leaves the same row on both halves (documents, history, stamps, approval, provenance)",
    J(strip(mem.restart)) === J(strip(pg.restart)) && mem.restart.supersededIso, `memory ${J(mem.restart)}`);
  ok("9.4 🔴 the same-person reader agrees on every NAMED row (the population the service compares)",
    J(mem.samePerson.filter((c) => c.fullName !== null)) === J(pgNamed), `memory ${J(mem.samePerson)}`);
  ok("9.5 …and on the whole result, the row with no name left out by both", J(mem.samePerson) === J(pg.samePerson),
    `memory ${J(mem.samePerson.map((c) => c.userId))} · postgres ${J(pg.samePerson.map((c) => c.userId))}`);
  ok("9.6 …and reads a full timestamp the same way", J(mem.samePersonFromIso) === J(pg.samePersonFromIso), J(mem.samePersonFromIso));
  ok("9.7 the post-check list agrees — the same rows, each with the same status", J(mem.unchecked) === J(pg.unchecked), `memory ${J(mem.unchecked)}`);
  ok("9.8 …in the same order", J(mem.uncheckedOrder) === J(pg.uncheckedOrder), `memory ${J(mem.uncheckedOrder)} · postgres ${J(pg.uncheckedOrder)}`);
}

await raw.$disconnect();

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass === 0) { console.error("!! ZERO assertions ran — treating as failure."); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
