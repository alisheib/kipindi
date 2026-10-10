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
 * ⭐ Since 2026-10-10 EVERY stage is reached through the service — none is hand-written any more.
 *
 * ⭐ TWO TRACKS SINCE 2026-10-10 (typed-only KYC, owner ruling). A player types the document's
 * details and is approved at once when the automatic checks pass (`verifyIdentity`); an AGENT
 * applicant still attaches the document's photos and a selfie and sends them to an officer
 * (`submitIdentityStep` → `attachDocument` → `submitForReview`). The photo-track stages below are
 * that agent track — the only way a case with images still arises — and two typed players are
 * added: one approved AUTOMATICALLY (so /admin/kyc's "not yet checked" list has a row), and one
 * whose second send was ROUTED to an officer because an officer had already refused it.
 * ⚠️ Officer decisions post the row VERSION they saw (`kycRowVersion`); REQUEST_INFO is gone —
 * an officer asks for CORRECTIONS (`askForCorrections`).
 *
 * ⛔ LOCALHOST ONLY, and it refuses anything else — it creates and deletes players.
 *
 * Usage:
 *   DATABASE_URL='postgresql://…@127.0.0.1:5433/kipindi_qa?schema=public' \
 *     npx tsx scripts/seed-kyc-stages-local.mts
 */
import { db, type StoredUser, type StoredWallet } from "../src/lib/server/store.ts";
import {
  startKyc,
  submitIdentityStep,
  attachDocument,
  submitForReview,
  reviewKyc,
  askForCorrections,
  verifyIdentity,
  kycRowVersion,
} from "../src/lib/server/kyc-service.ts";
import { attestationKeys } from "../src/lib/kyc-attestations.ts";
import { ID_DOC_SPECS } from "../src/lib/id-documents.ts";

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

/** `balance` — money in the wallet. From 2026-09-13 an unverified player can hold it, and the roster's
 *  "Funded · nothing sent" stage only exists for a player who does. Accounts are created ACTIVE, as
 *  registration has created them since the same date. */
async function player(tag: string, n: number, balance = 0): Promise<string> {
  const id = `usr_stage_${tag}`;
  const ts = now();
  const existing = await db.user.findById(id);
  if (!existing) {
    await db.user.create({
      id,
      phoneE164: `+2557100${String(n).padStart(5, "0")}`,
      displayName: `Stage ${tag}`,
      email: `stage.${tag}@50pick.test`,
      status: "ACTIVE",
      role: "PLAYER",
      locale: "EN",
      createdAt: ts,
      updatedAt: ts,
    } as unknown as StoredUser);
    await db.wallet.create({ id: `wal_stage_${tag}`, userId: id, balance, createdAt: ts, updatedAt: ts } as unknown as StoredWallet);
  }
  return id;
}

/** The AGENT photo track's first step — the identity details saved, no decision (`submitIdentityStep`). The players
 *  here have no date of birth on the account, so the typed one is used and then kept on the account. */
async function identity(userId: string, n: number) {
  const r = await submitIdentityStep(userId, { idType: "NIDA", idNumber: nida(n), fullName: `Stage Player ${n}`, dob: "1990-01-01" });
  if (!r.ok) throw new Error(`identity step failed for ${userId}: ${JSON.stringify(r)}`);
}

/** Every slot a NIDA needs (`requiredSlots`, the selfie included — never a hand-written list), attached through the REAL writer. */
async function uploadAll(userId: string) {
  for (const slot of ID_DOC_SPECS.NIDA.requiredSlots) {
    const r = await attachDocument(userId, slot, PNG);
    if (!r.ok) throw new Error(`attachDocument ${slot} failed for ${userId}: ${JSON.stringify(r)}`);
  }
}

/** The photo case SENT — `submitForReview`, which refuses a case missing a slot. */
async function send(userId: string) {
  const r = await submitForReview(userId);
  if (!r.ok) throw new Error(`submitForReview failed for ${userId}: ${JSON.stringify(r)}`);
}

/** The row VERSION an officer's form posts (`kycRowVersion`), read fresh — every officer decision is refused without it. */
async function versionOf(userId: string): Promise<string> {
  const k = await db.kyc.findByUserId(userId);
  if (!k) throw new Error(`no submission for ${userId}`);
  return kycRowVersion(k);
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
   /profile/kyc has no row, and `kycStage(null, money)` is the arm that covers them. A row
   that merely SAYS NOT_STARTED would exercise a state sign-up never produces. */
const pNone = await player("none", 1);
console.log(`  nothing_yet            ${pNone}  (no submission row — startKyc never called)`);

/* ── 1b · funded_nothing_yet · NO ROW, AND MONEY IN THE WALLET (2026-09-13) ─────
   The same "sent nothing" as above, holding TZS 25,000 — the normal new player since identity
   moved to withdrawal. Without it the roster drive's per-stage partition returns no rows for
   the eighth stage. The balance is written straight onto the fixture wallet: this is a LOCAL
   seed for a roster screen, not a money test, and no ledger reads it. */
const pFunded = await player("funded", 88, 25_000);
console.log(`  funded_nothing_yet     ${pFunded}  (no submission row, TZS 25,000 held)`);

/* ── 2 · nothing_yet · a row, identity done, ZERO documents ─────────────────
   The other half of the same word: they opened it and stopped. Same chip, and that
   is correct — the officer's action is identical. (Since 2026-10-10 the details are
   saved this way on the agent photo track, and by legacy rows saved before that day.) */
const pOpened = await player("opened", 2);
await startKyc(pOpened); await identity(pOpened, 2);
console.log(`  nothing_yet (opened)   ${pOpened}  (IN_PROGRESS, 0 documents)`);

/* ── 3 · uploaded · 🔴 THE STAGE ALI ASKED FOR ──────────────────────────────
   Every required photo attached, `submitForReview` NEVER called. Invisible on every
   other screen in the console. Since 2026-10-10 only an agent applicant's photo track
   (or a legacy row) can be here: a player types their details and attaches nothing. */
const pUploaded = await player("uploaded", 3);
await startKyc(pUploaded); await identity(pUploaded, 3); await uploadAll(pUploaded);
console.log(`  uploaded               ${pUploaded}  (all slots attached, Confirm never pressed)`);

/* ── 4 · with_us · a PHOTO case sent, waiting on US ─────────────────────────── */
const pWithUs = await player("withus", 4);
await startKyc(pWithUs); await identity(pWithUs, 4); await uploadAll(pWithUs); await send(pWithUs);
console.log(`  with_us                ${pWithUs}  (PENDING_REVIEW · a photo case)`);

/* ── 4b · with_us · TYPED details ROUTED to an officer (2026-10-10) ───────────
   Approved automatically, refused (recoverably) by an officer, then sent again: the second
   send goes to an OFFICER, because one has already ruled on this identity (the provenance
   route) — never back to the machine. Three real presses, so the row carries what they write:
   the officer on the row, `approvedAt` kept, and the refused identity in `priorIdentities`. */
const pRouted = await player("typedrouted", 10);
{
  const details = { idType: "VOTER_CARD" as const, idNumber: "STAGE-VOTER-0010", fullName: "Stage Player 10", dob: "1990-01-01" };
  const first = await verifyIdentity(pRouted, details);
  if (!first.ok || first.data?.outcome !== "approved") throw new Error(`verifyIdentity (first send) did not approve: ${JSON.stringify(first)}`);
  const refused = await reviewKyc({
    officerId: OFFICER, userId: pRouted, decision: "REJECT", rejectCode: "DETAILS_MISMATCH",
    note: "The name typed does not match the card.", version: await versionOf(pRouted),
  });
  if (!refused.ok) throw new Error(`reviewKyc REJECT failed: ${JSON.stringify(refused)}`);
  const again = await verifyIdentity(pRouted, details);
  if (!again.ok || again.data?.outcome !== "routed") throw new Error(`verifyIdentity (second send) was not routed: ${JSON.stringify(again)}`);
}
console.log(`  with_us (typed)        ${pRouted}  (PENDING_REVIEW · routed: an officer had already ruled)`);

/* ── 5 · more_needed · an officer asked for CORRECTIONS ───────────────────────
   ⭐ `askForCorrections` since 2026-10-10 — the one ask an officer has left (REQUEST_INFO,
   a request for another document, is gone). It posts the version the officer saw. */
const pMore = await player("more", 5);
await startKyc(pMore); await identity(pMore, 5); await uploadAll(pMore); await send(pMore);
{
  const r = await askForCorrections(OFFICER, pMore, { note: "Please check the spelling of your full name — it must match your ID exactly.", version: await versionOf(pMore) });
  if (!r.ok) throw new Error(`askForCorrections failed: ${JSON.stringify(r)}`);
}
console.log(`  more_needed            ${pMore}  (ADDITIONAL_INFO_REQUIRED · corrections asked)`);

/* ── 6 · rejected_after_upload · an officer refused a COMPLETE file ─────────── */
const pRejAfter = await player("rejafter", 6);
await startKyc(pRejAfter); await identity(pRejAfter, 6); await uploadAll(pRejAfter); await send(pRejAfter);
{
  const r = await reviewKyc({ officerId: OFFICER, userId: pRejAfter, decision: "REJECT", reason: "Document does not match the account holder.", version: await versionOf(pRejAfter) });
  if (!r.ok) throw new Error(`reviewKyc REJECT failed: ${JSON.stringify(r)}`);
}
console.log(`  rejected_after_upload  ${pRejAfter}  (REJECTED, a complete file had arrived)`);

/* ── 7 · rejected_no_docs · refused BEFORE anything was sent ─────────────────
   ⭐ THROUGH THE SERVICE SINCE 2026-10-10. This was the one stage written through the DAL —
   as a REJECTED row with no refusal code, a shape no writer produces. The typed press now
   refuses at the identity step when the NIDA check answers a mismatch (the dev mock's hook
   for a number ending `9999`): REJECTED · DETAILS_MISMATCH (recoverable), nothing sent, no
   photo, never approved — exactly "rejected, nothing sent".
   ⛔ The hook is dev-only (`nidaQaHooksEnabled`). With NODE_ENV=production the press would
   verify instead, and this throws rather than report a stage it did not produce. */
const pRejNone = await player("rejnone", 7);
await startKyc(pRejNone);
{
  const r = await verifyIdentity(pRejNone, { idType: "NIDA", idNumber: nida(9999), fullName: "Stage Player 7", dob: "1990-01-01" });
  if (!r.ok || r.data?.outcome !== "refused") throw new Error(`verifyIdentity (NIDA mismatch) did not refuse: ${JSON.stringify(r)}`);
}
console.log(`  rejected_no_docs       ${pRejNone}  (REJECTED · DETAILS_MISMATCH at the identity step, nothing ever sent)`);

/* ── 8 · approved · an OFFICER approved a photo case ──────────────────────────
   Photo mode, the photo attestation set and the version the officer saw — the approval
   that stamps `photoVerifiedAt`, the agent programme's identity gate. */
const pApproved = await player("approved", 8);
await startKyc(pApproved); await identity(pApproved, 8); await uploadAll(pApproved); await send(pApproved);
{
  const attestations: Record<string, "pass"> = {};
  for (const key of attestationKeys("photo")) attestations[key] = "pass";
  const r = await reviewKyc({ officerId: OFFICER, userId: pApproved, decision: "APPROVE", mode: "photo", attestations, version: await versionOf(pApproved) });
  if (!r.ok) throw new Error(`reviewKyc APPROVE failed: ${JSON.stringify(r)}`);
}
console.log(`  approved               ${pApproved}  (APPROVED · an officer, on photos)`);

/* ── 8b · approved AUTOMATICALLY, from typed details (2026-10-10) ─────────────
   The typed track's one press, through the real service: a voter's card, which the
   automatic checks approve at once WITH a flag (no published number format). The same
   roster word as 8; it is the row /admin/kyc lists as verified automatically and not yet
   checked by an officer. */
const pAuto = await player("typedauto", 9);
{
  const r = await verifyIdentity(pAuto, { idType: "VOTER_CARD", idNumber: "STAGE-VOTER-0009", fullName: "Stage Player 9", dob: "1990-01-01" });
  if (!r.ok || r.data?.outcome !== "approved") throw new Error(`verifyIdentity (automatic) did not approve: ${JSON.stringify(r)}`);
}
console.log(`  approved (automatic)   ${pAuto}  (APPROVED · automatic, flagged, not yet checked)`);

/* ── 9 · PADDING, so pagination is actually exercised ───────────────────────
   ⛔ PER_PAGE is 20 and the pager renders nothing at totalPages <= 1, so without this
   the page-2 arm — the `buildBaseHref` regression, which is the silent one — would
   SKIP while reporting green. 24 extra "nothing yet" players push the unfiltered list
   over two pages. */
for (let i = 0; i < 24; i++) await player(`pad${i}`, 100 + i);
console.log(`  + 24 padding players so the roster spans more than one page`);

const rows = await db.kyc.listStageFacts();
console.log(`\nSeeded. ${rows.length} submission rows; ${(await db.user.list()).length} users total.`);
