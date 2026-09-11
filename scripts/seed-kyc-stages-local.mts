/**
 * seed-kyc-stages-local.mts — one player per KYC STAGE, in the LOCAL Postgres.
 *
 * ⭐ WHY IT EXISTS. `scripts/live/kyc-roster-drive.mjs` proves the roster's KYC column
 * and its filter against a REAL render. It cannot do that without a population that
 * actually spans the seven stages, and no existing fixture produces them: `/auth/demo`
 * mints ONE player and 404s under `next start`, and `seed-admin-local` seeds staff.
 *
 * ⛔ IT DRIVES THE REAL SERVICE WHERE THE SERVICE CAN REACH THE STATE, and only writes
 * through the DAL where it cannot. That distinction is the whole value of the fixture:
 * a seeder that hand-writes every row proves the DERIVATION and nothing about the
 * WRITERS, and the stage that matters most here — "uploaded every photo, never pressed
 * Confirm" — is reachable only by actually calling `attachDocument` without
 * `submitForReview`. If a future change to `attachDocument` started stamping a status,
 * this fixture would stop producing that stage and the drive would go red, which is
 * exactly what should happen.
 *
 * ⛔ LOCALHOST ONLY, and it refuses anything else — it creates and deletes players.
 *
 * Usage:
 *   DATABASE_URL='postgresql://…@127.0.0.1:5433/kipindi_qa?schema=public' \
 *     npx tsx scripts/seed-kyc-stages-local.mts
 */
import { db, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";
import { startKyc, submitIdentityStep, attachDocument, submitForReview, reviewKyc } from "../src/lib/server/kyc-service.ts";

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("DATABASE_URL is required."); process.exit(1); }
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production."); process.exit(1);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — localhost only."); process.exit(1);
}

const now = () => new Date().toISOString();
/** A 1×1 PNG, small enough to keep the fixture fast and valid for `validateDocImage`. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** A NIDA number that is unique per player — the tuple index refuses duplicates. */
const nida = (n: number) => `1990010100000000${String(n).padStart(4, "0")}`;

async function player(tag: string, n: number): Promise<string> {
  const id = `usr_stage_${tag}`;
  const ts = now();
  const existing = await db.user.findById(id);
  if (!existing) {
    await db.user.create({
      id,
      phoneE164: `+2557100${String(n).padStart(5, "0")}`,
      displayName: `Stage ${tag}`,
      email: `stage.${tag}@50pick.test`,
      status: "PENDING_KYC",
      role: "PLAYER",
      locale: "EN",
      createdAt: ts,
      updatedAt: ts,
    } as unknown as StoredUser);
    await db.wallet.create({ id: `wal_stage_${tag}`, userId: id, balance: 0, createdAt: ts, updatedAt: ts } as unknown as StoredWallet);
  }
  return id;
}

/** Identity accepted — the step every stage past "nothing yet" needs. */
async function identity(userId: string, n: number) {
  const r = await submitIdentityStep(userId, {
    idType: "NIDA", idNumber: nida(n), fullName: `Stage Player ${n}`, dob: "1990-01-01",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (!r.ok) throw new Error(`identity step failed for ${userId}: ${JSON.stringify(r)}`);
}

/** Every slot a NIDA needs, attached through the REAL writer. */
async function uploadAll(userId: string) {
  for (const slot of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"] as const) {
    const r = await attachDocument(userId, slot, PNG);
    if (!r.ok) throw new Error(`attachDocument ${slot} failed for ${userId}: ${JSON.stringify(r)}`);
  }
}

console.log("Seeding one player per KYC stage …\n");

// An officer is needed for the decided stages — reviewKyc refuses self-review.
const OFFICER = "usr_stage_officer";
if (!(await db.user.findById(OFFICER))) {
  const ts = now();
  await db.user.create({
    id: OFFICER, phoneE164: "+255710099999", displayName: "Stage Officer",
    email: "stage.officer@50pick.test", status: "ACTIVE", role: "COMPLIANCE",
    locale: "EN", createdAt: ts, updatedAt: ts,
  } as unknown as StoredUser);
}

/* ── 1 · nothing_yet · NO SUBMISSION ROW AT ALL ─────────────────────────────
   ⛔ `startKyc` is deliberately NOT called. A player who registers and never opens
   /profile/kyc has no row, and `kycStage(null)` is the arm that covers them. A row
   that merely SAYS NOT_STARTED would exercise a state sign-up never produces. */
const pNone = await player("none", 1);
console.log(`  nothing_yet            ${pNone}  (no submission row — startKyc never called)`);

/* ── 2 · nothing_yet · a row, identity done, ZERO documents ─────────────────
   The other half of the same word: they opened it and stopped. Same chip, and that
   is correct — the officer's action is identical. */
const pOpened = await player("opened", 2);
await startKyc(pOpened); await identity(pOpened, 2);
console.log(`  nothing_yet (opened)   ${pOpened}  (IN_PROGRESS, 0 documents)`);

/* ── 3 · uploaded · 🔴 THE STAGE ALI ASKED FOR ──────────────────────────────
   Every required photo attached, `submitForReview` NEVER called. Invisible on every
   other screen in the console. */
const pUploaded = await player("uploaded", 3);
await startKyc(pUploaded); await identity(pUploaded, 3); await uploadAll(pUploaded);
console.log(`  uploaded               ${pUploaded}  (all slots attached, Confirm never pressed)`);

/* ── 4 · with_us · submitted, waiting on US ─────────────────────────────────── */
const pWithUs = await player("withus", 4);
await startKyc(pWithUs); await identity(pWithUs, 4); await uploadAll(pWithUs);
{
  const r = await submitForReview(pWithUs);
  if (!r.ok) throw new Error(`submitForReview failed: ${JSON.stringify(r)}`);
}
console.log(`  with_us                ${pWithUs}  (PENDING_REVIEW)`);

/* ── 5 · more_needed · an officer asked for more ────────────────────────────── */
const pMore = await player("more", 5);
await startKyc(pMore); await identity(pMore, 5); await uploadAll(pMore); await submitForReview(pMore);
{
  const r = await reviewKyc({ officerId: OFFICER, userId: pMore, decision: "REQUEST_INFO", reason: "Please re-take the selfie in better light." });
  if (!r.ok) throw new Error(`reviewKyc REQUEST_INFO failed: ${JSON.stringify(r)}`);
}
console.log(`  more_needed            ${pMore}  (ADDITIONAL_INFO_REQUIRED)`);

/* ── 6 · rejected_after_upload · an officer refused a COMPLETE file ─────────── */
const pRejAfter = await player("rejafter", 6);
await startKyc(pRejAfter); await identity(pRejAfter, 6); await uploadAll(pRejAfter); await submitForReview(pRejAfter);
{
  const r = await reviewKyc({ officerId: OFFICER, userId: pRejAfter, decision: "REJECT", reason: "Document does not match the account holder." });
  if (!r.ok) throw new Error(`reviewKyc REJECT failed: ${JSON.stringify(r)}`);
}
console.log(`  rejected_after_upload  ${pRejAfter}  (REJECTED, a complete file had arrived)`);

/* ── 7 · rejected_no_docs · refused BEFORE any upload was possible ──────────
   ⛔ There is no service path that rejects a submission which never reached
   PENDING_REVIEW (`reviewKyc` refuses anything else), so this one state is written
   through the DAL. It is real: `submitIdentityStep` refuses an underage or duplicate
   applicant, and an officer-side refusal can land before documents exist. */
const pRejNone = await player("rejnone", 7);
await startKyc(pRejNone);
{
  const k = await db.kyc.findByUserId(pRejNone);
  if (!k) throw new Error("no submission to reject");
  await db.kyc.upsert({ ...k, status: "REJECTED", documents: [], submittedAt: null, approvedAt: null, updatedAt: now() });
}
console.log(`  rejected_no_docs       ${pRejNone}  (REJECTED, nothing ever sent)`);

/* ── 8 · approved ──────────────────────────────────────────────────────────── */
const pApproved = await player("approved", 8);
await startKyc(pApproved); await identity(pApproved, 8); await uploadAll(pApproved); await submitForReview(pApproved);
{
  const r = await reviewKyc({ officerId: OFFICER, userId: pApproved, decision: "APPROVE", reason: "Verified." });
  if (!r.ok) throw new Error(`reviewKyc APPROVE failed: ${JSON.stringify(r)}`);
}
console.log(`  approved               ${pApproved}  (APPROVED)`);

/* ── 9 · PADDING, so pagination is actually exercised ───────────────────────
   ⛔ PER_PAGE is 20 and the pager renders nothing at totalPages <= 1, so without this
   the page-2 arm — the `buildBaseHref` regression, which is the silent one — would
   SKIP while reporting green. 24 extra "nothing yet" players push the unfiltered list
   over two pages. */
for (let i = 0; i < 24; i++) await player(`pad${i}`, 100 + i);
console.log(`  + 24 padding players so the roster spans more than one page`);

const rows = await db.kyc.listStageFacts();
console.log(`\nSeeded. ${rows.length} submission rows; ${(await db.user.list()).length} users total.`);
