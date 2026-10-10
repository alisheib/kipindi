/**
 * THE PLAYER'S OWN KYC WRITES STOP WHERE AN OFFICER'S DECISION CLOSED THE DOOR.   `npm run test:kyc-step-guards`
 *
 * 🔴 WHAT THIS CLOSES (found 2026-09-13, audit session 95 — docs/LIVE-QA-CAMPAIGN.md §6b). The identity-at-withdrawal
 * release made a FINAL refusal (UNDERAGE / SANCTIONED / DUPLICATE_IDENTITY) freeze the wallet, keep the document
 * number reserved, and refuse a restart — in `startKyc`. The three step functions a player's server actions call
 * (`submitIdentityStep`, `attachDocument`, `submitForReview`) asked only whether a row existed, and the page merely
 * hid their forms. A server action is reachable whether or not a form renders it, so a refused player could, by POST:
 *   · send REJECTED/UNDERAGE back to PENDING_REVIEW (off the refused-funds report, out of the officer's decision);
 *   · replace the reserved number, or overwrite UNDERAGE with a recoverable code via the NIDA mock's mismatch path;
 *   · replace the images the refusal was decided on.
 * And an APPROVED (or PENDING_REVIEW, or approved-once and re-verifying) account could rewrite its identity tuple with
 * no review, releasing the number an officer approved while keeping its withdrawal right.
 *
 * ⭐ AND THE RACE THE FIRST FIX LEFT (P0 adversarial review, 2026-09-13): the guard ran on the row each step read at
 * its start, the step then awaited an upload / the NIDA latency, and wrote that stale copy back — reverting an
 * officer's final refusal that landed in between. §7 drives that interleaving deterministically.
 *
 * Also here: the NIDA mock's two QA hooks answered production players (§5), and the age gates disagreed (§8).
 *
 * ⭐ RE-POINTED 2026-10-10 (owner ruling: players verify identity with TYPED details and are approved at once; agents
 * keep the photo track — docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details").
 * There is a FIFTH player write now, `verifyIdentity` (the typed one-press step), and every door below is asked of it
 * too. `attachExtraDocument` is DELETED (officers ask for corrections, never an extra document), so its race case is
 * replaced by the typed press's. Two rules moved, deliberately, and each is asserted in its new shape:
 *   · an approved-once account asked for CORRECTIONS may fix its name and expiry, but its document TYPE and NUMBER stay
 *     locked — the refusal is now `identity_number_locked`, and the approved number still stays held (4.3 / 4.4);
 *   · an IN_PROGRESS row is OPEN after a restart even when it was approved once — the restart already released the
 *     approved tuple, and the old `approvedAt && idVerifiedAt` lock stranded rows (4.8).
 * A typed send after an officer's refusal goes back to an OFFICER (officer provenance), never to the machine (4.7).
 *
 * SECTIONS
 *   §1  a FINAL refusal: every player write is refused; nothing on the row, the documents, the index or the wallet moves
 *   §2  APPROVED: the identity tuple is locked, the approved number stays held, and a re-press is idempotent
 *   §3  PENDING_REVIEW: the identity tuple is locked while an officer holds the file
 *   §4  CONTROLS + corrections: new player (both tracks), recoverable refusal, the approved-once number lock on a
 *       correction, restart-then-re-enter, provenance carried through a restart, the dropped IN_PROGRESS lock
 *   §5  the NIDA QA hooks are off in production and still reachable locally
 *   §6  POPULATION: every player step calls the guard AND writes under the submission lock; the removed steps are gone
 *   §7  THE RACE: a final refusal (or any other write) landing between a step's read and its write is never reverted
 *   §8  ONE AGE GATE: the Tanzanian calendar date, everywhere
 */
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import * as KYC from "../src/lib/server/kyc-service.ts";
import { startKyc, verifyIdentity, submitIdentityStep, attachDocument, submitForReview } from "../src/lib/server/kyc-service.ts";
import { addWalletFreeze, unfreezeWalletByOfficer } from "../src/lib/server/wallet-freeze.ts";
import { refusedFundsPosition } from "../src/lib/server/refused-funds.ts";
import { nidaQaHooksEnabled, verifyNida } from "../src/lib/server/nida.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { isOfAge, platformDateOf } from "../src/lib/id-documents.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const now = () => new Date().toISOString();
const J = (x: unknown) => JSON.stringify(x);
const reasonOf = (r: unknown) => (r as { reason?: string }).reason;

/** A 1×1 PNG that passes `validateDocImage` (the fixture `/auth/demo` attaches). */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const OFFICER = "usr_ksg_officer";
let seq = 0;

type Row = { status: string; rejectReason?: string | null; approvedAt?: string | null; idNumber?: string | null; docs?: number; extra?: boolean };
/** An account with a wallet and a hand-written identity row in exactly the state the product's writers leave it. */
async function account(id: string, row: Row | null, wallet: Partial<StoredWallet> = {}): Promise<string> {
  const n = ++seq;
  await db.user.create({
    id, phoneE164: `+25574${String(n).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: `Handle ${n}`, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 50_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE",
    createdAt: now(), updatedAt: now(), ...wallet,
  } as StoredWallet);
  if (row) {
    const docs = Array.from({ length: row.docs ?? 3 }, (_, i) => ({
      docType: ["NIDA_FRONT", "NIDA_BACK", "SELFIE"][i], storageKey: `${PNG}#${id}-${i}`, uploadedAt: now(), mimeType: "image/png", sizeBytes: 70,
    }));
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: row.status, rejectReason: row.rejectReason ?? null, rejectNote: null,
      idType: row.idNumber ? "NIDA" : null, idNumber: row.idNumber ?? null, idExpiry: null, idVerifiedAt: row.idNumber ? now() : null,
      idFingerprint: null, fullName: "Guard Fixture", dob: "1990-01-01", documents: docs,
      extraRequests: row.extra ? [{ id: "rq1", description: "Back of the ID, clearer", requestedAt: now(), storageKey: null, uploadedAt: null }] : [],
      reviewerId: row.status === "IN_PROGRESS" ? null : OFFICER, reviewedAt: row.status === "IN_PROGRESS" ? null : now(),
      submittedAt: row.status === "IN_PROGRESS" ? null : now(), approvedAt: row.approvedAt ?? null,
      // ⛔ Every column named (2026-10-10): a BUILT row the DAL would otherwise write null. None of these rows is an
      // officer's photo approval or an automatic one — the doors below are asked of the status alone.
      photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [],
      createdAt: now(), updatedAt: now(),
    } as never);
  }
  return id;
}
const kycOf = async (id: string) => (await db.kyc.findByUserId(id))!;
const nida = (tail: string) => `19900101${String(++seq).padStart(8, "0")}${tail}`;
const identity = (idNumber: string, extra: Record<string, string> = {}) =>
  ({ idType: "NIDA", idNumber, fullName: "Guard Fixture", dob: "1990-01-01", ...extra }) as never;
const passport = () => ({ idType: "PASSPORT", idNumber: `AB${String(1_000_000 + ++seq)}`, idExpiry: "2031-01-01", fullName: "Other Name", dob: "1991-02-02" }) as never;
/**
 * A TYPED press under a name no other fixture here carries. ⚠️ Every hand-written row in this file is "Guard Fixture",
 * born 1990-01-01 — and §1's account is FINALLY refused on a frozen wallet. The same-person check would route a typed
 * press under that name to an officer (SAME_PERSON_RESTRICTED) and the case would measure that rule instead of its own.
 */
const typed = (idNumber: string, name: string) => identity(idNumber, { fullName: name });
type VerifyData = { outcome?: string; routes?: string[] };
const outcomeOf = (r: unknown) => (r as { data?: VerifyData }).data?.outcome;
const routesOf = (r: unknown) => (r as { data?: VerifyData }).data?.routes ?? [];

/**
 * THE RACE, DRIVEN — the next `db.kyc.findByUserId(uid)` (the step's opening read) returns the row as it was,
 * and an officer's FINAL refusal is written in the same instant: the wallet frozen, the row REJECTED on a final
 * code. Everything the step does after that read runs against a refusal already on record.
 */
function armFinalRefusalAfterRead(uid: string): () => void {
  const kyc = db.kyc as { findByUserId: typeof db.kyc.findByUserId };
  const orig = kyc.findByUserId;
  let armed = true;
  kyc.findByUserId = (async (id: string) => {
    const row = await orig.call(db.kyc, id);
    if (armed && id === uid && row) {
      armed = false;
      const asRead = structuredClone(row);
      await addWalletFreeze(uid, "IDENTITY_REFUSED", { actorId: OFFICER, note: "race fixture · refused while the player's step was in flight" });
      await db.kyc.upsert({ ...row, status: "REJECTED", rejectReason: "DUPLICATE_IDENTITY", reviewerId: OFFICER, reviewedAt: now(), updatedAt: now() } as never);
      return asRead;
    }
    return row;
  }) as typeof db.kyc.findByUserId;
  return () => { kyc.findByUserId = orig; };
}
/**
 * THE SAME RACE WITH AN ORDINARY WRITE (2026-10-10) — another tab, or an officer's non-final act, lands between the
 * step's read and its write. The typed press checks the row VERSION (`updatedAt`) under the lock, so a row that changed
 * is refused, never overwritten. ⚠️ The planted `updatedAt` is a full second later, so it cannot share the read's millisecond.
 */
function armWriteAfterRead(uid: string, change: Record<string, unknown>): () => void {
  const kyc = db.kyc as { findByUserId: typeof db.kyc.findByUserId };
  const orig = kyc.findByUserId;
  let armed = true;
  kyc.findByUserId = (async (id: string) => {
    const row = await orig.call(db.kyc, id);
    if (armed && id === uid && row) {
      armed = false;
      const asRead = structuredClone(row);
      await db.kyc.upsert({ ...row, ...change, updatedAt: new Date(Date.parse(row.updatedAt) + 1000).toISOString() } as never);
      return asRead;
    }
    return row;
  }) as typeof db.kyc.findByUserId;
  return () => { kyc.findByUserId = orig; };
}
const stillRefused = async (u: string) => {
  const k = await kycOf(u);
  return k.status === "REJECTED" && k.rejectReason === "DUPLICATE_IDENTITY";
};

await db.user.create({
  id: OFFICER, phoneE164: "+255740009999", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: null, region: null,
  acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);

// ── §1 · a FINAL refusal is closed to every player write ─────────────────────────────────────────────────────
section("§1 · a FINAL refusal: every player write is refused, and nothing moves");
{
  const N1 = nida("1234");
  const u = await account("usr_ksg_final", { status: "REJECTED", rejectReason: "UNDERAGE", idNumber: N1 }, { status: "FROZEN", freezeReasons: ["IDENTITY_REFUSED"] });
  const before = await kycOf(u);
  const docsBefore = J(before.documents.map((d: { docType: string; storageKey: string }) => [d.docType, d.storageKey]));

  const s = await submitForReview(u);
  ok("1.1 ⛔ submitForReview refuses a final refusal with kyc_refused_final", !s.ok && reasonOf(s) === "kyc_refused_final", J(s));
  ok("1.2 ⛔ …and the row is still REJECTED / UNDERAGE (it did not go back to the queue)",
    (await kycOf(u)).status === "REJECTED" && (await kycOf(u)).rejectReason === "UNDERAGE");

  // The mismatch hook is live locally — this is the exact shape that overwrote UNDERAGE with a recoverable code.
  const m = await submitIdentityStep(u, identity(`${N1.slice(0, 16)}9999`));
  ok("1.3 ⛔ submitIdentityStep (the NIDA mismatch path) is refused", !m.ok && reasonOf(m) === "kyc_refused_final", J(m));
  const p = await submitIdentityStep(u, passport());
  ok("1.4 ⛔ submitIdentityStep with a fresh passport is refused", !p.ok && reasonOf(p) === "kyc_refused_final", J(p));
  // ⭐ The typed one-press step (2026-10-10) asks the same door first — before its idempotency check, so even the
  // reserved number pressed again is a refusal, not an "already verified".
  const v = await verifyIdentity(u, typed(nida("1235"), "Final Refused Typed"));
  ok("1.4b ⛔ verifyIdentity (the typed press) is refused too", !v.ok && reasonOf(v) === "kyc_refused_final", J(v));
  const after = await kycOf(u);
  ok("1.5 ⛔ …the final code, the document type and the reserved number are exactly as the officer left them",
    after.rejectReason === "UNDERAGE" && after.idType === "NIDA" && after.idNumber === N1, J({ r: after.rejectReason, t: after.idType, n: after.idNumber }));

  const a = await attachDocument(u, "NIDA_FRONT", PNG);
  ok("1.6 ⛔ attachDocument is refused", !a.ok && reasonOf(a) === "kyc_refused_final", J(a));
  ok("1.7 ⛔ …and the images the refusal was decided on are unchanged",
    J((await kycOf(u)).documents.map((d: { docType: string; storageKey: string }) => [d.docType, d.storageKey])) === docsBefore);

  const other = await account("usr_ksg_final_other", { status: "IN_PROGRESS" });
  const dup = await submitIdentityStep(other, identity(N1));
  ok("1.8 ⛔ the refused number is still reserved against another account (id_taken)", !dup.ok && reasonOf(dup) === "id_taken", J(dup));
  const dupTyped = await verifyIdentity(other, typed(N1, "Final Other Typed"));
  ok("1.8b ⛔ …on the typed press as well — no automatic approval of a finally refused number", !dupTyped.ok && reasonOf(dupTyped) === "id_taken" && (await kycOf(other)).status === "IN_PROGRESS", J(dupTyped));

  const r = await startKyc(u);
  ok("1.9 CONTROL · startKyc still refuses the restart (the door this release already closed)", !r.ok && reasonOf(r) === "kyc_refused_final");
  const uf = await unfreezeWalletByOfficer(OFFICER, u, "officer tries to lift the hold");
  const w = await db.wallet.findByUserId(u);
  ok("1.10 ⛔ the identity hold is not 'stale' — an officer's Unfreeze cannot lift it", !uf.ok && w?.status === "FROZEN" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), J(uf));
  ok("1.11 ⛔ the case is still an officer's balance decision", (await refusedFundsPosition(u)).eligible === true);
  await auditFlush();
  const rows = getAuditForTarget("Kyc", `kyc_${u}`, 1000).filter((e) => e.action === "kyc.player_write_refused_final");
  ok("1.12 ⭐ each refused write is recorded (COMPLIANCE, with the step)", rows.length >= 4 && rows.every((e) => e.category === "COMPLIANCE"), `rows=${rows.length}`);
}

// ── §2 · APPROVED ────────────────────────────────────────────────────────────────────────────────────────────
section("§2 · APPROVED: the identity tuple is locked");
{
  const N2 = nida("2345");
  const u = await account("usr_ksg_approved", { status: "APPROVED", idNumber: N2, approvedAt: now() });
  const p = await submitIdentityStep(u, passport());
  ok("2.1 ⛔ an approved account cannot rewrite its identity", !p.ok && reasonOf(p) === "docs_locked", J(p));
  const v = await verifyIdentity(u, passport());
  ok("2.1b ⛔ …nor through the typed press", !v.ok && reasonOf(v) === "docs_locked", J(v));
  const k = await kycOf(u);
  ok("2.2 ⛔ …status, type, number and name are unchanged", k.status === "APPROVED" && k.idType === "NIDA" && k.idNumber === N2 && k.fullName === "Guard Fixture");
  // CONTROL · the same identity pressed again is a success that writes nothing (an approved player re-opening the page).
  const again = await verifyIdentity(u, identity(N2));
  ok("2.2b CONTROL · the SAME identity pressed again answers 'approved' and writes nothing",
    again.ok && outcomeOf(again) === "approved" && (await kycOf(u)).updatedAt === k.updatedAt, J(again));
  const other = await account("usr_ksg_approved_other", { status: "IN_PROGRESS" });
  const dup = await submitIdentityStep(other, identity(N2));
  ok("2.3 ⛔ the approved number stays held against another account", !dup.ok && reasonOf(dup) === "id_taken", J(dup));
}

// ── §3 · PENDING_REVIEW ──────────────────────────────────────────────────────────────────────────────────────
section("§3 · PENDING_REVIEW: the identity tuple is locked while an officer holds the file");
{
  const N3 = nida("3456");
  const u = await account("usr_ksg_pending", { status: "PENDING_REVIEW", idNumber: N3 });
  const p = await submitIdentityStep(u, identity(nida("7777")));
  ok("3.1 ⛔ a submission with an officer cannot change its number", !p.ok && reasonOf(p) === "docs_locked", J(p));
  const v = await verifyIdentity(u, typed(nida("7778"), "Pending Typed Change"));
  ok("3.1b ⛔ …nor through the typed press", !v.ok && reasonOf(v) === "docs_locked", J(v));
  ok("3.2 ⛔ …the number is unchanged", (await kycOf(u)).idNumber === N3);
  const same = await verifyIdentity(u, identity(N3));
  ok("3.2b CONTROL · the SAME identity pressed again answers 'routed' (it is with an officer) and writes nothing",
    same.ok && outcomeOf(same) === "routed" && (await kycOf(u)).status === "PENDING_REVIEW", J(same));
  const a = await attachDocument(u, "SELFIE", PNG);
  ok("3.3 CONTROL · documents were already locked here (unchanged behaviour)", !a.ok && reasonOf(a) === "docs_locked");
}

// ── §4 · CONTROLS and the re-verification lock ───────────────────────────────────────────────────────────────
section("§4 · CONTROLS: the flows that must keep working — and the re-verification identity lock");
{
  const fresh = await account("usr_ksg_fresh", null);
  const st = await startKyc(fresh);
  const id = await submitIdentityStep(fresh, identity(nida("4567")));
  ok("4.1 a new player starts and completes the identity step (the agent photo track's step 1)", st.ok && id.ok && (id as { data?: { verified?: boolean } }).data?.verified === true, J(id));
  // ⭐ The typed track (2026-10-10): one press, approved at once — the doors above must not have closed the open path.
  const freshTyped = await account("usr_ksg_fresh_typed", null);
  const ty = await verifyIdentity(freshTyped, typed(nida("4568"), "Fresh Typed Player"));
  const kt = await kycOf(freshTyped);
  ok("4.1b CONTROL · a new player's typed press is approved at once, with no officer and no documents",
    ty.ok && outcomeOf(ty) === "approved" && kt.status === "APPROVED" && !!kt.autoApprovedAt && kt.reviewerId === null && kt.documents.length === 0, J({ ty, s: kt.status }));

  // The agent photo track keeps its recoverable path: re-upload and resubmit.
  const rec = await account("usr_ksg_recoverable", { status: "REJECTED", rejectReason: "BLURRY_DOC", idNumber: nida("5678") });
  const a = await attachDocument(rec, "NIDA_FRONT", PNG);
  const s = await submitForReview(rec);
  ok("4.2 a RECOVERABLE refusal of a photo case can re-upload and resubmit", a.ok && s.ok && (await kycOf(rec)).status === "PENDING_REVIEW", J({ a, s }));

  // ⛔ Corrections asked of an approved-once account (2026-10-10): the NAME and EXPIRY may change, the document TYPE and
  // NUMBER may not — the 2026-09-13 P0 lock, narrowed to what it protects (the approved number freed for another account).
  const N4 = nida("6789");
  const rev = await account("usr_ksg_reverify", { status: "ADDITIONAL_INFO_REQUIRED", idNumber: N4, approvedAt: now() });
  const r = await submitIdentityStep(rev, passport());
  ok("4.3 ⛔ a correction on an account approved once cannot replace its document by POST (identity_number_locked)", !r.ok && reasonOf(r) === "identity_number_locked", J(r));
  const rt = await verifyIdentity(rev, typed(nida("6788"), "Guard Fixture"));
  ok("4.3b ⛔ …nor change the NUMBER on the same document type, on the typed press", !rt.ok && reasonOf(rt) === "identity_number_locked", J(rt));
  const otherAcct = await account("usr_ksg_reverify_other", { status: "IN_PROGRESS" });
  const held = await submitIdentityStep(otherAcct, identity(N4));
  const holder = await db.kyc.findActiveByIdNumber("NIDA", N4, otherAcct);
  ok("4.4 ⛔ …its approved number stays on the row and held against another account",
    (await kycOf(rev)).idNumber === N4 && (await kycOf(rev)).status === "ADDITIONAL_INFO_REQUIRED" && !held.ok && reasonOf(held) === "id_taken" && holder?.userId === rev,
    J({ held, holder }));
  const up = await attachDocument(rev, "SELFIE", PNG);
  ok("4.5 CONTROL · …and the agent photo track's upload stays open on a correction", up.ok, J(up));
  // CONTROL · the correction the lock exists to allow: the same document and number, a corrected name — sent to an
  // OFFICER (corrections asked are officer provenance), never approved by the machine.
  const N4n = nida("6787");
  const named = await account("usr_ksg_reverify_name", { status: "ADDITIONAL_INFO_REQUIRED", idNumber: N4n, approvedAt: now() });
  const nm = await verifyIdentity(named, typed(N4n, "Corrected Name Typed"));
  const kn = await kycOf(named);
  ok("4.5b CONTROL · a name correction on the SAME number is accepted — and goes to an officer, never instant",
    nm.ok && outcomeOf(nm) === "routed" && routesOf(nm).includes("OFFICER_PROVENANCE") && kn.status === "PENDING_REVIEW" && kn.idNumber === N4n && kn.fullName === "Corrected Name Typed",
    J({ nm, s: kn.status }));
  // ⭐ …and the name the account was approved under is KEPT (a decided identity changed in any fact goes into the
  // history — review R1.7): with no images, the typed details are the only record of what was approved.
  const kept = Array.isArray(kn.priorIdentities) ? kn.priorIdentities : [];
  ok("4.5c ⭐ the corrected identity's previous name is kept in priorIdentities (cause correction)",
    kept.length === 1 && kept[0].fullName === "Guard Fixture" && kept[0].idNumber === N4n && kept[0].cause === "correction", J(kept));

  // The legitimate way to change a document on an approved-once account: an officer's recoverable refusal, then a restart.
  const once = await account("usr_ksg_restart", { status: "REJECTED", rejectReason: "EXPIRED_ID", idNumber: nida("6790"), approvedAt: "2026-09-01T10:00:00.000Z" });
  const N6 = (await kycOf(once)).idNumber;
  const rs = await startKyc(once);
  const re = await submitIdentityStep(once, passport());
  const ko = await kycOf(once);
  ok("4.6 CONTROL · after a recoverable refusal and a restart, an approved-once account can enter a new document — and keeps its first approval",
    rs.ok && re.ok && ko.idType === "PASSPORT" && ko.approvedAt === "2026-09-01T10:00:00.000Z", J({ rs, re, t: ko.idType, a: ko.approvedAt }));
  // ⭐ The restart keeps what it released (2026-10-10): the refused identity goes into the history, and the officer who
  // refused it stays on the row — so the account's next typed send goes back to an officer.
  const prior = Array.isArray(ko.priorIdentities) ? ko.priorIdentities : [];
  ok("4.6b ⭐ …the released identity is kept in priorIdentities (cause restart), and the refusing officer is carried",
    prior.length === 1 && prior[0].idNumber === N6 && prior[0].cause === "restart" && prior[0].reviewerId === OFFICER && ko.reviewerId === OFFICER,
    J({ prior, reviewer: ko.reviewerId }));

  // ⛔ OFFICER PROVENANCE: the typed press on a row an officer refused (recoverably) restarts in the same write and goes
  // to an officer. Without it, a refused player could restart and be approved by the machine a minute later.
  const refused = await account("usr_ksg_refused_typed", { status: "REJECTED", rejectReason: "DETAILS_MISMATCH", idNumber: nida("6791"), approvedAt: "2026-09-02T10:00:00.000Z" });
  const tr = await verifyIdentity(refused, typed(nida("6792"), "Refused Then Typed"));
  const kr = await kycOf(refused);
  ok("4.7 ⛔ a typed send after an officer's recoverable refusal is ROUTED to an officer (OFFICER_PROVENANCE), never approved",
    tr.ok && outcomeOf(tr) === "routed" && routesOf(tr).includes("OFFICER_PROVENANCE") && kr.status === "PENDING_REVIEW" && kr.reviewerId === OFFICER && !kr.autoApprovedAt,
    J({ tr, s: kr.status, a: kr.autoApprovedAt }));
  ok("4.7b ⛔ …and it keeps the account's first approval (withdrawals stay open while the officer looks)", kr.approvedAt === "2026-09-02T10:00:00.000Z");

  // ⛔ THE DROPPED LOCK (2026-10-10): an IN_PROGRESS row that was approved once and still carries an accepted tuple — the
  // shape a restart before this release left — used to refuse every identity write (`docs_locked`) and strand the row.
  // A restart already released that tuple; the row is open now.
  const stranded = await account("usr_ksg_inprogress_once", { status: "IN_PROGRESS", idNumber: nida("6793"), approvedAt: "2026-09-03T10:00:00.000Z" });
  const sk = await kycOf(stranded);
  const so = await verifyIdentity(stranded, typed(nida("6794"), "Stranded Once Typed"));
  ok("4.8 ⛔ the IN_PROGRESS approved-once lock is GONE: a new tuple is accepted (no docs_locked)",
    !!sk.approvedAt && !!sk.idVerifiedAt && so.ok && outcomeOf(so) === "approved" && reasonOf(so) !== "docs_locked", J(so));
  // ⛔ …and the undecided IN_PROGRESS tuple it replaced is NOT history (review R2.7): nothing was decided on it, and
  // appending on every undecided edit would let a player grow the list without bound.
  const ks = await kycOf(stranded);
  ok("4.8b ⛔ an undecided IN_PROGRESS tuple replaced by the press adds nothing to priorIdentities",
    (Array.isArray(ks.priorIdentities) ? ks.priorIdentities : []).length === 0, J(ks.priorIdentities));
}

// ── §5 · the NIDA mock's QA hooks ────────────────────────────────────────────────────────────────────────────
section("§5 · the NIDA QA hooks are off in production");
{
  ok("5.1 ⛔ production: the hooks do not answer", nidaQaHooksEnabled({ NODE_ENV: "production" }) === false);
  ok("5.2 CONTROL · development and an unset NODE_ENV (the local suites) keep them", nidaQaHooksEnabled({ NODE_ENV: "development" }) && nidaQaHooksEnabled({}));
  const src = decomment(readFileSync(new URL("../src/lib/server/nida.ts", import.meta.url), "utf8"));
  ok("5.3 ⛔ the sanctions hook is behind the switch", /nidaQaHooksEnabled\(\)\s*&&\s*opts\.nida\.endsWith\("0000"\)/.test(src));
  ok("5.4 ⛔ the mismatch hook is behind the switch", /nidaQaHooksEnabled\(\)\s*&&\s*opts\.nida\.endsWith\("9999"\)/.test(src));
  ok("5.5 ⛔ no other endsWith(…) hook exists outside the switch",
    (src.match(/opts\.nida\.endsWith\(/g) ?? []).length === (src.match(/nidaQaHooksEnabled\(\)\s*&&\s*opts\.nida\.endsWith\(/g) ?? []).length);
  const local = await verifyNida({ nida: "19900101123412340000", fullName: "X", dob: "1990-01-01", userId: "usr_ksg_hook" });
  ok("5.6 CONTROL · locally the sanctions branch is still reachable", local.ok && local.verified === false && local.reason === "SANCTIONED", J(local));
}

// ── §6 · POPULATION ──────────────────────────────────────────────────────────────────────────────────────────
section("§6 · every player step calls the guard and writes under the submission lock");
{
  const src = decomment(readFileSync(new URL("../src/lib/server/kyc-service.ts", import.meta.url), "utf8"));
  /**
   * The body of each top-level function, by name. ⭐ Since 2026-10-10 the split is EVERY top-level function, exported
   * or not: the typed press moved writes into private helpers (`approveIdentity`, `refuseUnderage`,
   * `checkIdentityAvailable`), and splitting on exports alone would credit a helper's write to whichever exported
   * function happened to sit above it in the file.
   */
  const bodies = (s: string) => {
    const out = new Map<string, string>();
    const re = /^(?:export )?(?:async )?function (\w+)\s*[<(]/gm;
    const starts: Array<[string, number]> = [];
    for (let m; (m = re.exec(s)); ) starts.push([m[1], m.index]);
    starts.forEach(([name, at], i) => out.set(name, s.slice(at, i + 1 < starts.length ? starts[i + 1][1] : s.length)));
    return out;
  };
  // ⭐ STILL FOUR player steps since 2026-10-10, but not the same four: `verifyIdentity` (the typed press) joined,
  // `attachExtraDocument` left with the officer's extra-document request (§6.6 proves it is gone).
  const STEPS: Record<string, PlayerStepName> = { verifyIdentity: "identity", submitIdentityStep: "identity", attachDocument: "documents", submitForReview: "submit" };
  type PlayerStepName = "identity" | "documents" | "submit";
  // ⚠️ The EXACT guarded shape, not a mention: the first RED run of this suite disabled the calls as
  // `const closed = null && closedToPlayer(k, …)` and a bare `closedToPlayer\(k, "step"\)` pattern still matched.
  // The identity steps ask it of the parsed row (`p.k`) with the tuple they are about to write (`next`).
  const guarded = (s: string) => Object.entries(STEPS).filter(([fn, step]) =>
    new RegExp(`const closed = closedToPlayer\\((?:p\\.)?k,\\s*"${step}"(?:,\\s*next)?\\);\\s*if \\(closed\\) return closed;`).test(bodies(s).get(fn) ?? ""));
  const locked = (s: string) => Object.entries(STEPS).filter(([fn, step]) =>
    new RegExp(`underSubmissionLock(?:<[^>(]*>)?\\(\\s*userId,\\s*(?:p\\.)?k,\\s*"${step}"`).test(bodies(s).get(fn) ?? ""));
  ok("6.1 ⛔ the four player step functions each call closedToPlayer with their step, in the guarded shape",
    guarded(src).length === 4, J(guarded(src).map(([f]) => f)));
  ok("6.2 ⛔ …and each writes through underSubmissionLock (re-read under kyc:<userId>)", locked(src).length === 4, J(locked(src).map(([f]) => f)));
  // ⭐ The two identity steps ALSO ask the doors before anything slow runs, through `parseIdentity`'s pre-check: the
  // typed press the final-refusal door alone (an approved identity pressed again is answered idempotently first), the
  // agent step every identity door.
  ok("6.1b ⛔ the identity steps pass their pre-check into parseIdentity",
    /parseIdentity\(userId, input, closedFinal\)/.test(bodies(src).get("verifyIdentity") ?? "") &&
    /parseIdentity\(userId, input, \(k\) => closedToPlayer\(k, "identity"\)\)/.test(bodies(src).get("submitIdentityStep") ?? ""));
  // ⭐ Every db.kyc.upsert inside a player step sits inside the lock's callback — never on the stale copy.
  const STALE_PARSED = /db\.kyc\.upsert\(\{\s*\.\.\.p\.k(?![A-Za-z0-9_$])/;
  const staleWrites = Object.keys(STEPS).filter((fn) => STALE_PARSED.test(bodies(src).get(fn) ?? "") || /db\.kyc\.upsert\(\{\s*\.\.\.k\b/.test(bodies(src).get(fn) ?? ""));
  ok("6.3 ⛔ no player step writes `{ ...k }` — the copy it read before the await", staleWrites.length === 0, J(staleWrites));
  // ⭐ 2026-10-10: `forceReverifyKyc` left (replaced by `askForCorrections`); the officer's new acts joined. Every officer
  // path decides under the same `kyc:<userId>` lock the player steps write under (6.4b).
  const OFFICER_OR_RESET = new Set(["startKyc", "reviewKyc", "askForCorrections", "markPostChecked", "correctDateOfBirth", "reopenFinalRefusal"]);
  // The player steps' private helpers that write — each ONLY inside `underSubmissionLock`, on the re-read row (6.4c).
  const LOCKED_HELPERS = ["refuseUnderage", "checkIdentityAvailable"];
  // The shared approval core — written by its callers' locks, never called from anywhere else (6.4d).
  const APPROVAL_CORE = "approveIdentity";
  const writers = [...bodies(src)].filter(([, body]) => /db\.kyc\.upsert\(/.test(body)).map(([n]) => n);
  const unexplained = writers.filter((n) => !(n in STEPS) && !OFFICER_OR_RESET.has(n) && !LOCKED_HELPERS.includes(n) && n !== APPROVAL_CORE);
  ok("6.4 ⛔ every submission writer is a guarded player step, a locked step helper, the approval core or a named officer/reset path",
    unexplained.length === 0 && writers.length >= 12, J({ writers, unexplained }));
  const officerUnlocked = [...OFFICER_OR_RESET].filter((n) => n !== "startKyc" && !/withLock\(`kyc:\$\{userId\}`/.test(bodies(src).get(n) ?? ""));
  ok("6.4b ⛔ every officer path decides under the kyc:<userId> lock", officerUnlocked.length === 0, J(officerUnlocked));
  const helperStale = LOCKED_HELPERS.filter((n) => {
    const b = bodies(src).get(n) ?? "";
    return !/underSubmissionLock<never>\(userId, k, "identity", async \(fresh\) =>/.test(b) || !/db\.kyc\.upsert\(\{ \.\.\.fresh,/.test(b) || /db\.kyc\.upsert\(\{\s*\.\.\.k[,} ]/.test(b);
  });
  ok("6.4c ⛔ the step helpers write only under the submission lock, from the re-read row", helperStale.length === 0, J(helperStale));
  const coreCallers = [...bodies(src)].filter(([n, b]) => n !== APPROVAL_CORE && b.includes(`${APPROVAL_CORE}(`)).map(([n]) => n).sort();
  ok("6.4d ⛔ the approval core is called only from the typed press's lock and the officer's reviewKyc",
    J(coreCallers) === J(["reviewKyc", "verifyIdentity"]), J(coreCallers));
  const planted = src.replace(/const closed = closedToPlayer\(k, "submit"\);/, "const closed = null;");
  ok("6.5 ⭐ CONTROL · removing one guard call is caught", guarded(planted).length === 3);
  const plantedTyped = src.replace(/const closed = closedToPlayer\(p\.k, "identity", next\);/, "const closed = null;");
  ok("6.5b ⭐ CONTROL · …on an identity step too", guarded(plantedTyped).length === 3);
  // ⛔ REMOVED, NOT RENAMED (2026-10-10). A deleted player write that lingered as an export would be a door this file
  // no longer asks about.
  ok("6.6 ⛔ attachExtraDocument and forceReverifyKyc are no longer exported",
    !("attachExtraDocument" in KYC) && !("forceReverifyKyc" in KYC) && !/function (?:attachExtraDocument|forceReverifyKyc)\s*\(/.test(src));
}

// ── §7 · THE RACE ────────────────────────────────────────────────────────────────────────────────────────────
section("§7 · a final refusal (or any other write) landing between a step's read and its write is never reverted");
{
  {
    const u = await account("usr_ksg_race_attach", { status: "ADDITIONAL_INFO_REQUIRED", idNumber: nida("8001") });
    const restore = armFinalRefusalAfterRead(u);
    const r = await attachDocument(u, "NIDA_BACK", PNG).finally(restore);
    ok("7.1 ⛔ attachDocument: the in-flight upload is refused once the refusal is on record", !r.ok && reasonOf(r) === "kyc_refused_final", J(r));
    ok("7.2 ⛔ …and the refusal stands (REJECTED · DUPLICATE_IDENTITY)", await stillRefused(u), J((await kycOf(u)).status));
  }
  {
    // ⭐ 2026-10-10 — `attachExtraDocument` (this case's subject until then) is deleted; the typed press is the new
    // player write, and it is slow before its lock (the NIDA check, the automatic checks' facts), so it is raced here.
    const u = await account("usr_ksg_race_typed", { status: "IN_PROGRESS" });
    const restore = armFinalRefusalAfterRead(u);
    const r = await verifyIdentity(u, typed(nida("8002"), "Race Typed Player")).finally(restore);
    const k = await kycOf(u);
    ok("7.3 ⛔ verifyIdentity: refused, the refusal stands, and nothing was approved",
      !r.ok && reasonOf(r) === "kyc_refused_final" && await stillRefused(u) && !k.autoApprovedAt, J(r));
  }
  {
    // ⛔ THE VERSION: an ordinary write (another tab correcting the name) lands while the typed press is in flight. The
    // press must refuse — never overwrite the newer row with the copy it read.
    const u = await account("usr_ksg_race_version", { status: "IN_PROGRESS" });
    const restore = armWriteAfterRead(u, { fullName: "Other Tab Name" });
    const r = await verifyIdentity(u, typed(nida("8006"), "Race Version Player")).finally(restore);
    const k = await kycOf(u);
    ok("7.3b ⛔ verifyIdentity: a row that changed under the press is refused, and the newer write stands",
      !r.ok && k.status === "IN_PROGRESS" && k.fullName === "Other Tab Name" && !k.idNumber, J({ r, s: k.status, n: k.fullName }));
  }
  {
    const u = await account("usr_ksg_race_submit", { status: "ADDITIONAL_INFO_REQUIRED", idNumber: nida("8003") });
    const restore = armFinalRefusalAfterRead(u);
    const r = await submitForReview(u).finally(restore);
    ok("7.4 ⛔ submitForReview: refused, and the case never goes back to the queue", !r.ok && await stillRefused(u), J({ r, s: (await kycOf(u)).status }));
  }
  {
    const u = await account("usr_ksg_race_identity", { status: "IN_PROGRESS" });
    const NR = nida("8004");
    await db.kyc.upsert({ ...(await kycOf(u)), idNumber: "19900101000000009990", idType: "NIDA" } as never);
    const restore = armFinalRefusalAfterRead(u);
    const r = await submitIdentityStep(u, identity(NR)).finally(restore);
    const k = await kycOf(u);
    ok("7.5 ⛔ submitIdentityStep: refused, the refusal stands, and the reserved number was not replaced",
      !r.ok && await stillRefused(u) && k.idNumber === "19900101000000009990", J({ r, n: k.idNumber }));
  }
  {
    // CONTROL — the fixture really is a race: with nothing landing in between, the same calls succeed.
    const u = await account("usr_ksg_race_control", { status: "ADDITIONAL_INFO_REQUIRED", idNumber: nida("8005") });
    const r = await attachDocument(u, "NIDA_BACK", PNG);
    ok("7.6 CONTROL · without the refusal landing, the same upload succeeds", r.ok, J(r));
    const t = await account("usr_ksg_race_control_typed", { status: "IN_PROGRESS" });
    const tr = await verifyIdentity(t, typed(nida("8007"), "Race Control Typed"));
    ok("7.6b CONTROL · …and the same typed press, with nothing landing, is approved", tr.ok && outcomeOf(tr) === "approved", J(tr));
  }
}

// ── §8 · ONE AGE GATE ────────────────────────────────────────────────────────────────────────────────────────
section("§8 · one age gate: whole calendar years on the Tanzanian date");
{
  ok("8.1 the platform date is Dar es Salaam's: 21:30 UTC is already the next day", platformDateOf(new Date("2026-09-13T21:30:00Z")) === "2026-09-14");
  ok("8.2 ⛔ 18 at 00:30 in Dar on the 18th birthday (still the day before in UTC)", isOfAge("2008-09-14", new Date("2026-09-13T21:30:00Z")));
  ok("8.3 ⛔ not 18 at 23:30 in Dar the evening before", !isOfAge("2008-09-14", new Date("2026-09-13T20:30:00Z")));
  // The review's case: 5 leap days in 18 years — 365.25-day arithmetic called this player 18 at 16:00 the day before.
  ok("8.4 ⛔ the five-leap-day birth date is NOT 18 at 16:00 EAT the day before (365.25 said it was)",
    !isOfAge("2008-01-15", new Date("2026-01-14T13:00:00Z")) && (Date.parse("2026-01-14T13:00:00Z") - Date.parse("2008-01-15")) / (365.25 * 864e5) >= 18);
  ok("8.5 CONTROL · a clear adult and a clear minor", isOfAge("1990-01-01", new Date()) && !isOfAge("2015-01-01", new Date()));
  const files = ["src/lib/server/validators.ts", "src/lib/server/nida.ts", "src/lib/server/kyc-service.ts", "src/app/admin/kyc/[id]/page.tsx"];
  const leftovers = files.filter((f) => /365\.25/.test(decomment(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"))));
  ok("8.6 ⛔ no age gate measures in 365.25-day years any more", leftovers.length === 0, J(leftovers));
  const v = decomment(readFileSync(new URL("../src/lib/server/validators.ts", import.meta.url), "utf8"));
  ok("8.7 ⛔ registration's dateOfBirth asks isOfAge", /isOfAge\(v,\s*new Date\(\)\)/.test(v));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
