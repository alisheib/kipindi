/**
 * Stress test — the WHOLE KYC flow end to end against the real services:
 * upload validation, NIDA reject paths, the submit/review state machine, the
 * corrections loop, re-upload + resubmit, idempotency, and that the
 * right in-app notification + email fires on EVERY transition.
 *
 * ⭐ RE-POINTED 2026-10-10 (owner ruling: players verify identity with TYPED details and are approved at once; agents
 * keep the photo track — docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details").
 *   · §5 is now the AGENT photo loop (details → photos + selfie → an officer), and an officer's ask is a CORRECTION of
 *     the details (`askForCorrections`) — the REQUEST_INFO decision is removed and §5c proves it is refused.
 *   · §6 is NEW: the TYPED loop — one press, approved at once with no officer and no email to the officers; the
 *     officer's check afterwards (`markPostChecked`); a routed press (a wallet hold) going to an officer instead.
 *   · §7 (extra documents) proves the REMOVAL: no extra-document request can be made, the upload function is gone,
 *     and a LEGACY open request never blocks a send and is never erased by a correction.
 *   · The date of birth is the ACCOUNT's: a posted one is ignored when the account has one (§2b), and the age gate
 *     runs on whichever date is used — the account's, or a typed one only when the account has none.
 *   · Every officer decision carries the row version it was shown (`kycRowVersion`).
 *
 * In-memory store, email stub (no Postmark key). Run:
 *   npx tsx scripts/kyc-flow-stress.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";
process.env.KYC_NOTIFY_EMAILS = "compliance@50pick.tz,ops@50pick.tz";
// Arm the email outbox so assertions can read the real recipient. Read lazily by
// `outboxArmed()`, so setting it here — before the imports run — works.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import * as KYC from "../src/lib/server/kyc-service.ts";
import {
  startKyc, verifyIdentity, submitIdentityStep, attachDocument, submitForReview, reviewKyc, askForCorrections, markPostChecked,
  kycRowVersion, validateDocImage, getKycStatus,
} from "../src/lib/server/kyc-service.ts";
import { db } from "../src/lib/server/store.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { addWalletFreeze } from "../src/lib/server/wallet-freeze.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.error(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

let logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const flush = () => new Promise((r) => setTimeout(r, 60));
const clearLogs = () => { logs = []; clearEmailOutbox(); };
// ⚠️ EMAIL RECIPIENTS COME FROM THE OUTBOX, NOT FROM STDOUT (2026-08-20).
// The log lines mask the address (`j***@example.com`, audit F-06) because Railway's log
// retention is not ours to control — so `logs.some(l => l.includes("jay@example.com"))`
// can no longer pass. Relaxing those assertions to the masked form was the wrong fix: it
// keeps the suite green while destroying what it measured. "An email went to somebody at
// example.com" is not the claim being tested; "this email went to THIS player" is, and on
// a KYC decision that is the whole point.
// `emailOutbox()` already existed for exactly this. Reading it is also STRICTER than the
// old check: `to === addr` is an exact recipient match, where a log scrape matched the
// fragment anywhere in the line — including inside a subject or a URL.
const sentTo = (addr: string) => emailOutbox().filter((m) => m.to === addr);
const sentSubject = (frag: string) => emailOutbox().filter((m) => m.subject.includes(frag));
const latestKycNote = async (uid: string) => (await listForUser(uid, 50)).find((n) => n.kind === "KYC")?.titleEn ?? "";

// ⚠️ These fixtures used to be `Buffer.from("a".repeat(2048))` — the letter 'a',
// 2048 times, labelled image/jpeg. So "validate: valid jpeg accepted" was passing
// on bytes that are not a JPEG, and this suite could never have noticed that the
// upload path did no magic-byte checking at all. A fixture that lies makes the
// assertion above it meaningless. Real JPEG SOI + JFIF APP0 header now.
const JPEG_HEADER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
]);
const jpegOf = (padBytes: number) =>
  "data:image/jpeg;base64," + Buffer.concat([JPEG_HEADER, Buffer.alloc(padBytes, 0x61)]).toString("base64");

const VALID_IMG = jpegOf(2048);
const HUGE_IMG = jpegOf(3 * 1024 * 1024 + 16); // > the 3 MB decoded cap — refused on SIZE, not signature
/** A real Windows PE header wearing an image/jpeg label. */
const EXE_AS_JPG = "data:image/jpeg;base64," +
  Buffer.concat([Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "binary"), Buffer.alloc(512, 0x41)]).toString("base64");

/** `dob` is the ACCOUNT's date of birth — since 2026-10-10 the one the identity step uses (null = an account with none). */
async function mkPlayer(id: string, email: string | null = null, dob: string | null = "1990-01-01") {
  await db.user.create({
    id, phoneE164: `+25571${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob, region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}
const OFFICER = "usr_officer_stress";
await db.user.create({
  id: OFFICER, phoneE164: "+255710000000", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: "1985-01-01", region: "TZ",
  acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  email: "compliance@50pick.tz", emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
});

const GOOD_NIDA = "19900101456712345678"; // 20 digits, not ...0000/...9999
// Each player needs a UNIQUE NIDA now that one-NIDA-per-account is enforced.
let nidaSeq = 0;
async function getToVerified(uid: string) {
  await startKyc(uid);
  nidaSeq++;
  const nida = "1990010100000000" + String(nidaSeq).padStart(4, "0"); // 20 digits, unique, not ...0000/...9999
  const r = await submitIdentityStep(uid, { idType: "NIDA", idNumber: nida, fullName: "Asha Mwamba Juma", dob: "1990-01-01" });
  return r;
}
async function attach3(uid: string) {
  await attachDocument(uid, "NIDA_FRONT", VALID_IMG);
  await attachDocument(uid, "NIDA_BACK", VALID_IMG);
  await attachDocument(uid, "SELFIE", VALID_IMG);
}
/** The row version an officer's form posts (2026-10-10) — read fresh, exactly as the workstation renders it. */
const ver = async (uid: string) => kycRowVersion((await getKycStatus(uid))!);
type VerifyData = { outcome?: string; reason?: string; routes?: string[] };
const verified = (x: unknown) => (x as { data?: VerifyData }).data;

// ─── 1. Upload validation — multiple rejection shapes ───
ok("validate: empty rejected", !validateDocImage("").ok);
ok("validate: non-dataurl rejected", !validateDocImage("hello world").ok);
ok("validate: wrong mime (gif) rejected", !validateDocImage("data:image/gif;base64,AAAA").ok);
ok("validate: pdf rejected", !validateDocImage("data:application/pdf;base64,AAAA").ok);
ok("validate: oversized rejected", !validateDocImage(HUGE_IMG).ok);
ok("validate: valid jpeg accepted", validateDocImage(VALID_IMG).ok);
// 🔴 Magic bytes: the mime in a data URL is written by the CLIENT. Before
// 2026-07-31 a renamed .exe, a zip and an SVG carrying <script> were all stored
// as identity documents. An officer cannot approve against a file that is not an image.
ok("🔴 validate: .exe renamed .jpg refused on its BYTES", !validateDocImage(EXE_AS_JPG).ok);
const valid = validateDocImage(VALID_IMG);
ok("validate: reports the SNIFFED mime, not the declared one",
  valid.ok && valid.mimeType === "image/jpeg");

// ─── 2. NIDA reject paths (each a distinct user; NIDA tail drives the mock) ───
// ⭐ SANCTIONED IS A FINAL CODE FROM 2026-09-13 (`src/lib/kyc-refusal.ts`; docs/COMPLIANCE-DECISIONS.md,
// S1): the wallet is frozen BEFORE the refusal is written, the player cannot restart it, and the notice
// sends them to support rather than back to the form. So this player now has a WALLET — a refusal can
// land on an account holding money — and the mismatch player below is the RECOVERABLE control.
// ⚠️ THE STEP IS CAUGHT AND COUNTED, NOT ALLOWED TO END THE RUN. On 2026-09-13 it threw from
// `recordFinalRefusal` (`kyc-service.ts`: `.catch` chained straight onto `db.wallet.findByUserId`, which
// the in-memory store returns synchronously), and every section below went unreported.
async function mkWallet(uid: string) {
  await db.wallet.create({
    id: `wal_${uid}`, userId: uid, balance: 40_000, pending: 0, hold: 0, bonusBalance: 0, freezeReasons: [],
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as never);
}
const freezeReasonsOf = (w: unknown): string[] => ((w as { freezeReasons?: string[] } | null)?.freezeReasons ?? []);
await mkPlayer("usr_nida_san", "san@example.com");
await mkWallet("usr_nida_san");
await startKyc("usr_nida_san");
clearLogs();
let r = { ok: false, error: "not run", code: "INVALID" } as Awaited<ReturnType<typeof submitIdentityStep>>;
let sanThrew: unknown = null;
try {
  r = await submitIdentityStep("usr_nida_san", { idType: "NIDA", idNumber: "19900101456712340000", fullName: "Sani Test", dob: "1990-01-01" });
} catch (e) { sanThrew = e; }
await flush();
ok("NIDA sanctioned · the step completes without throwing", !sanThrew, sanThrew ? String(sanThrew) : "");
ok("NIDA sanctioned -> verified:false", r.ok && (r as { data?: { verified: boolean } }).data?.verified === false);
{
  const k = await getKycStatus("usr_nida_san");
  ok("NIDA sanctioned -> kyc REJECTED on the FINAL code SANCTIONED",
    k?.status === "REJECTED" && k?.rejectReason === "SANCTIONED", `${k?.status}/${k?.rejectReason}`);
  const w = await db.wallet.findByUserId("usr_nida_san");
  ok("🔴 NIDA sanctioned -> the wallet is FROZEN, held for IDENTITY_REFUSED, and no money moved",
    w?.status === "FROZEN" && freezeReasonsOf(w).includes("IDENTITY_REFUSED") && w?.balance === 40_000,
    `${w?.status} [${freezeReasonsOf(w)}] balance=${w?.balance}`);
  const restart = await startKyc("usr_nida_san");
  ok("⛔ NIDA sanctioned -> the player cannot restart it (kyc_refused_final)",
    !restart.ok && (restart as { reason?: string }).reason === "kyc_refused_final", JSON.stringify(restart));
  const note = (await listForUser("usr_nida_san", 20)).find((n) => n.kind === "KYC");
  ok("NIDA sanctioned -> the bell says REFUSED and links to help, not back to the form",
    note?.titleEn === "Identity verification refused" && note?.href === "/help",
    JSON.stringify(note ? { title: note.titleEn, href: note.href } : null));
  const mails = sentTo("san@example.com");
  ok("NIDA sanctioned -> the email is the refusal, with no resubmit button",
    mails.some((m) => m.subject === "Identity verification refused")
      && mails.every((m) => ((m as { html?: string }).html ?? "").length > 50 && !/Resubmit/.test((m as { html?: string }).html ?? "")),
    JSON.stringify(mails.map((m) => m.subject)));
}
// ⭐ THE TYPED PRESS MEETS THE SAME NIDA SEAM (2026-10-10): a refusal is reported as an OUTCOME ("refused"), never as an
// approval — the final code, the freeze and the closed door are the ones above.
await mkPlayer("usr_nida_san_typed", "santyped@example.com");
await mkWallet("usr_nida_san_typed");
{
  const t = await verifyIdentity("usr_nida_san_typed", { idType: "NIDA", idNumber: "19900101456712350000", fullName: "Sani Typed" });
  await flush();
  const k = await getKycStatus("usr_nida_san_typed");
  const w = await db.wallet.findByUserId("usr_nida_san_typed");
  ok("NIDA sanctioned (typed press) -> outcome 'refused' SANCTIONED, never approved",
    t.ok && verified(t)?.outcome === "refused" && verified(t)?.reason === "SANCTIONED" && k?.status === "REJECTED" && k?.rejectReason === "SANCTIONED" && !k?.autoApprovedAt,
    JSON.stringify({ t, s: k?.status }));
  ok("🔴 …and the wallet is frozen for IDENTITY_REFUSED", w?.status === "FROZEN" && freezeReasonsOf(w).includes("IDENTITY_REFUSED"));
}

await mkPlayer("usr_nida_mis");
await mkWallet("usr_nida_mis");
await startKyc("usr_nida_mis");
r = await submitIdentityStep("usr_nida_mis", { idType: "NIDA", idNumber: "19900101456712349999", fullName: "Miss Match", dob: "1990-01-01" });
ok("NIDA mismatch -> verified:false", r.ok && (r as { data?: { verified: boolean } }).data?.verified === false);
{
  const k = await getKycStatus("usr_nida_mis");
  const w = await db.wallet.findByUserId("usr_nida_mis");
  ok("⭐ CONTROL · NIDA mismatch is RECOVERABLE — DETAILS_MISMATCH, wallet ACTIVE with no hold",
    k?.status === "REJECTED" && k?.rejectReason === "DETAILS_MISMATCH" && w?.status === "ACTIVE" && freezeReasonsOf(w).length === 0,
    `${k?.status}/${k?.rejectReason} wallet=${w?.status} [${freezeReasonsOf(w)}]`);
  ok("⭐ CONTROL · …and the player may restart it themselves", (await startKyc("usr_nida_mis")).ok);
}

// Underage + bad format are caught by zod BEFORE the NIDA call. ⭐ Since 2026-10-10 the date the schema reads is the
// ACCOUNT's, so the typed under-18 case needs an account with NO date of birth (the only accounts that type one).
await mkPlayer("usr_nida_under", null, null);
await startKyc("usr_nida_under");
r = await submitIdentityStep("usr_nida_under", { idType: "NIDA", idNumber: GOOD_NIDA, fullName: "Too Young", dob: "2015-01-01" });
ok("underage DOB blocked by validation (an account with no date of birth types one)", !r.ok && r.code === "INVALID");
r = await submitIdentityStep("usr_nida_under", { idType: "NIDA", idNumber: "123", fullName: "Bad Nida", dob: "1990-01-01" });
ok("short NIDA blocked by validation", !r.ok && r.code === "INVALID");
ok("…and it says WHICH rule, not 'invalid'", !r.ok && (r as { reason?: string }).reason === "id_number_format");
// ⭐ 🔴 THE AGE GATE IS NOT NIDA-ONLY. Only a NIDA carries a date of birth inside
// the number, so an age check derived from the NUMBER would pass for the other
// three because the feature is absent (§3 ④). Assert it on EVERY type.
//
// ⚠️ ONE FRESH PLAYER PER CASE, and that is not tidiness. Reusing one account put
// the FOURTH attempt past `rateCheckAsync(userId, "kyc.submit")`, so the refusal
// came back RATE_LIMITED and the assertion was measuring the rate limiter rather
// than the age gate. A guard whose verdict depends on an unrelated control is not
// a guard. Caught by running it.
// ⭐ AND ONE NUMBER PER ACCEPTED CASE (2026-10-10): three cases per type are accepted now, and one document, one account.
let numSeq = 0;
const numFor = (idType: string) => idType === "NIDA" ? `1990010145671234${String(9100 + ++numSeq)}` : `AB12${String(3400 + ++numSeq)}`;
for (const idType of ["NIDA", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD"] as const) {
  const t = idType.toLowerCase();
  // (a) An account with NO date of birth types an under-18 one — refused by the schema, nothing written.
  const uid = `usr_under_${t}`;
  await mkPlayer(uid, null, null);
  await startKyc(uid);
  const under = await submitIdentityStep(uid, { idType, idNumber: numFor(idType), fullName: "Too Young", dob: "2015-01-01", idExpiry: "2030-01-01" });
  ok(`underage refused on ${idType} too`, !under.ok && under.code === "INVALID", String(under.code));
  // ⭐ POSITIVE CONTROL IN THE SAME RUN — the very same call with an ADULT date of
  // birth must be ACCEPTED. Without it, "refused for every type" would also be
  // satisfied by a validator that refuses everything.
  const uidOk = `usr_adult_${t}`;
  await mkPlayer(uidOk, null, null);
  await startKyc(uidOk);
  const adult = await submitIdentityStep(uidOk, { idType, idNumber: numFor(idType), fullName: "Grown Up", dob: "1990-01-01", idExpiry: "2030-01-01" });
  ok(`control · an ADULT is accepted on ${idType}`, adult.ok && (adult as { data?: { verified: boolean } }).data?.verified === true, JSON.stringify(adult).slice(0, 90));
  ok(`…and the typed date becomes the account's (it had none) on ${idType}`, (await db.user.findById(uidOk))?.dob === "1990-01-01", String((await db.user.findById(uidOk))?.dob));
  // (b) ⭐ THE POSTED DATE IS IGNORED WHEN THE ACCOUNT HAS ONE (2026-10-10): an adult account posting an under-18 date is
  // verified on its own date — and the row records the ACCOUNT's date, not the posted one.
  const uidIgn = `usr_postdob_${t}`;
  await mkPlayer(uidIgn, null, "1991-03-04");
  await startKyc(uidIgn);
  const ign = await submitIdentityStep(uidIgn, { idType, idNumber: numFor(idType), fullName: "Posted Date", dob: "2015-01-01", idExpiry: "2030-01-01" });
  const ki = await getKycStatus(uidIgn);
  ok(`⛔ the posted date of birth is ignored on ${idType} — the account's is used and recorded`,
    ign.ok && (ign as { data?: { verified: boolean } }).data?.verified === true && String(ki?.dob).slice(0, 10) === "1991-03-04", `${JSON.stringify(ign).slice(0, 90)} dob=${ki?.dob}`);
  // (c) 🔴 An ACCOUNT date under 18 (a legacy row, or an officer's correction) is the FINAL refusal, whatever is posted.
  const uidMinor = `usr_minoracct_${t}`;
  await mkPlayer(uidMinor, null, "2015-01-01");
  await mkWallet(uidMinor);
  await startKyc(uidMinor);
  const minor = await submitIdentityStep(uidMinor, { idType, idNumber: numFor(idType), fullName: "Minor Account", dob: "1990-01-01", idExpiry: "2030-01-01" });
  const km = await getKycStatus(uidMinor);
  const wm = await db.wallet.findByUserId(uidMinor);
  ok(`🔴 an account dated under 18 is refused FINALLY on ${idType} (UNDERAGE, wallet frozen), whatever date is posted`,
    minor.ok && (minor as { data?: { verified: boolean; reason?: string } }).data?.verified === false && km?.status === "REJECTED" && km?.rejectReason === "UNDERAGE" && wm?.status === "FROZEN",
    `${JSON.stringify(minor).slice(0, 90)} ${km?.status}/${km?.rejectReason} wallet=${wm?.status}`);
}

// ─── 3. attachDocument guards ───
r = await attachDocument("usr_ghost_none", "SELFIE", VALID_IMG);
ok("attach without KYC -> NOT_FOUND", !r.ok && r.code === "NOT_FOUND");
await mkPlayer("usr_attach01");
await startKyc("usr_attach01");
r = await attachDocument("usr_attach01", "SELFIE", "not-an-image");
ok("attach invalid image -> INVALID", !r.ok && r.code === "INVALID");
r = await attachDocument("usr_attach01", "SELFIE", VALID_IMG);
ok("attach valid image ok", r.ok);

// ─── 4. submitForReview guards ───
await mkPlayer("usr_guard01");
await startKyc("usr_guard01");
r = await submitForReview("usr_guard01");
ok("submit before NIDA -> INVALID", !r.ok && r.code === "INVALID");
r = await getToVerified("usr_guard01");
ok("NIDA verify ok", r.ok && (r as { data?: { verified: boolean } }).data?.verified === true);
r = await submitForReview("usr_guard01");
ok("submit with <3 docs -> INVALID", !r.ok && r.code === "INVALID");

// ─── 5. THE AGENT PHOTO LOOP: details → photos → send → corrections → re-upload → resend → reject → resend → approve ───
// ⭐ Since 2026-10-10 this is the AGENT track (document photos + selfie, an officer decides) — exactly as before for
// agents. The officer's ask is a CORRECTION of the details; the REQUEST_INFO decision is gone (5c proves it).
await mkPlayer("usr_loop01", "loop@example.com");
await getToVerified("usr_loop01");
await attach3("usr_loop01");

// 5a. Submit → PENDING_REVIEW, player + admin emails
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("loop submit ok", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");
ok("loop submit: player email names the PHOTOS it received", sentTo("loop@example.com").some((m) => m.subject === "Photos received · verification pending"),
  JSON.stringify(sentTo("loop@example.com").map((m) => m.subject)));
ok("loop submit: admin emails (2)", sentSubject("New KYC to verify").length === 2);
ok("loop submit: in-app 'Identity photos received'", (await latestKycNote("usr_loop01")) === "Identity photos received", await latestKycNote("usr_loop01"));

// 5b. attach blocked while PENDING_REVIEW
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("attach blocked during PENDING_REVIEW", !r.ok && r.code === "INVALID");

// 5c. ⛔ REQUEST_INFO IS REMOVED (2026-10-10) — refused, and nothing moves.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REQUEST_INFO" as never, version: await ver("usr_loop01"), reason: "The back of your ID is blurry — re-upload a clearer photo." });
ok("⛔ the REQUEST_INFO decision is refused", !r.ok && r.code === "INVALID", JSON.stringify(r));
ok("⛔ …the case is still with the officer, and no extra request was written",
  (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW" && ((await getKycStatus("usr_loop01"))?.extraRequests?.length ?? 0) === 0);
// The officer asks for CORRECTIONS instead → ADDITIONAL_INFO_REQUIRED + email + in-app
clearLogs();
r = await askForCorrections(OFFICER, "usr_loop01", { note: "Your name does not match the document — please check it.", version: await ver("usr_loop01") });
await flush();
ok("corrections asked ok", r.ok, JSON.stringify(r));
ok("status -> ADDITIONAL_INFO_REQUIRED", (await getKycStatus("usr_loop01"))?.status === "ADDITIONAL_INFO_REQUIRED");
ok("corrections: note stored for player", !!(await getKycStatus("usr_loop01"))?.rejectNote?.includes("does not match"));
ok("⛔ corrections: never an extra-document request", ((await getKycStatus("usr_loop01"))?.extraRequests?.length ?? 0) === 0);
ok("corrections: email sent", sentTo("loop@example.com").some((m) => m.subject === "Please check your details · 50pick verification"),
  JSON.stringify(sentTo("loop@example.com").map((m) => m.subject)));
ok("corrections: in-app 'Please check your details'", (await latestKycNote("usr_loop01")) === "Please check your details", await latestKycNote("usr_loop01"));
ok("corrections: requires a note", !(await askForCorrections(OFFICER, "usr_loop01", { note: "x", version: await ver("usr_loop01") })).ok);

// 5d. Player re-uploads (allowed now) and resubmits → back to PENDING_REVIEW + re-notify
r = await attachDocument("usr_loop01", "NIDA_BACK", VALID_IMG);
ok("re-upload allowed in ADDITIONAL_INFO_REQUIRED", r.ok);
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("resubmit ok -> PENDING_REVIEW", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");
ok("resubmit re-notifies player + admins", sentTo("loop@example.com").length >= 1 && sentSubject("New KYC to verify").length === 2);

// 5e. Idempotency: re-submitting while PENDING_REVIEW sends nothing
clearLogs();
r = await submitForReview("usr_loop01"); await flush();
ok("double-submit idempotent (no emails)", r.ok && emailOutbox().length === 0);

// 5f. Reject → REJECTED + email. ⛔ A decision on a version the officer did not see is refused first.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REJECT", version: "1999-01-01T00:00:00.000Z", reason: "Photo still unreadable after re-upload." });
ok("⛔ reject on a STALE version is refused, and the case is untouched", !r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW", JSON.stringify(r));
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REJECT", version: await ver("usr_loop01"), reason: "Photo still unreadable after re-upload." });
await flush();
ok("reject ok -> REJECTED", r.ok && (await getKycStatus("usr_loop01"))?.status === "REJECTED");
ok("reject: email sent", sentTo("loop@example.com").some((m) => m.subject.includes("Identity check needs attention")));
ok("reject: in-app 'Identity needs review'", (await latestKycNote("usr_loop01")) === "Identity needs review");

// 5g. After reject, player can re-upload + resubmit again
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("re-upload allowed after REJECTED", r.ok);
r = await submitForReview("usr_loop01");
ok("resubmit after reject -> PENDING_REVIEW", r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW");

// 5h. Approve → APPROVED, legacy status normalised, email — and the display name LEFT ALONE.
// 🔴 INVERTED 2026-09-13: this asserted "displayName = legal name". The owner reversed that rule
// (docs/COMPLIANCE-DECISIONS.md 2026-09-13): approval now happens when a player cashes out, often after
// weeks under a handle, and must not publish their legal name. `mkPlayer` gives no display name, so
// "left alone" means it is still `null` — with the legal name still recorded on the submission.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "APPROVE", version: "1999-01-01T00:00:00.000Z" });
ok("⛔ approve on a STALE version is refused", !r.ok && (await getKycStatus("usr_loop01"))?.status === "PENDING_REVIEW", JSON.stringify(r));
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "APPROVE", version: await ver("usr_loop01") }); await flush();
const approvedLoop = await getKycStatus("usr_loop01");
ok("approve ok -> APPROVED", r.ok && approvedLoop?.status === "APPROVED", JSON.stringify(r));
// ⭐ An officer's approval on the full photo set is the agent programme's identity gate (2026-10-10).
ok("⭐ approve: an officer's PHOTO approval — photoVerifiedAt stamped, reviewer named, not an automatic approval",
  !!approvedLoop?.photoVerifiedAt && approvedLoop?.reviewerId === OFFICER && !approvedLoop?.autoApprovedAt,
  JSON.stringify({ p: approvedLoop?.photoVerifiedAt, r: approvedLoop?.reviewerId, a: approvedLoop?.autoApprovedAt }));
ok("⛔ approve: the display name is NOT set from the legal name",
  (await db.user.findById("usr_loop01"))?.displayName === null, String((await db.user.findById("usr_loop01"))?.displayName));
ok("…while the legal name stays recorded on the submission", (await getKycStatus("usr_loop01"))?.fullName === "Asha Mwamba Juma");
ok("approve: account ACTIVE (a PENDING_KYC straggler is normalised)", (await db.user.findById("usr_loop01"))?.status === "ACTIVE");
ok("approve: email with reference", sentTo("loop@example.com").some((m) => m.subject.includes("fully verified")));

// 5i. An APPROVED identity is not approved twice, and its photos are the decision's evidence.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "APPROVE", version: await ver("usr_loop01") });
ok("approve-after-approve blocked", !r.ok && r.code === "INVALID");
r = await attachDocument("usr_loop01", "SELFIE", VALID_IMG);
ok("attach blocked when APPROVED on photos", !r.ok && r.code === "INVALID");
// ⭐ CHANGED 2026-10-10: an officer MAY now refuse an APPROVED identity (the post-check finds a problem). It used to be
// "decide-after-approve blocked"; the refusal keeps the first approval, so withdrawals stay open unless the officer also
// freezes the wallet.
r = await reviewKyc({ officerId: OFFICER, userId: "usr_loop01", decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await ver("usr_loop01") });
const refusedLoop = await getKycStatus("usr_loop01");
ok("⭐ reject-after-approve is now an officer's decision, and keeps the first approval",
  r.ok && refusedLoop?.status === "REJECTED" && refusedLoop?.rejectReason === "DETAILS_MISMATCH" && refusedLoop?.approvedAt === approvedLoop?.approvedAt,
  JSON.stringify({ r, s: refusedLoop?.status, a: refusedLoop?.approvedAt }));

// ─── 6. THE TYPED LOOP (2026-10-10): one press → approved at once → the officer checks it afterwards ───
await mkPlayer("usr_typed01", "typed@example.com");
clearLogs();
{
  const t = await verifyIdentity("usr_typed01", { idType: "VOTER_CARD", idNumber: "T1000234567", fullName: "Neema Typed Juma" });
  await flush();
  const k = await getKycStatus("usr_typed01");
  ok("typed: one press -> APPROVED at once, no documents, no officer",
    t.ok && verified(t)?.outcome === "approved" && k?.status === "APPROVED" && (k?.documents?.length ?? 0) === 0 && k?.reviewerId === null && !!k?.autoApprovedAt,
    JSON.stringify({ t, s: k?.status }));
  ok("typed: ⛔ an automatic approval is NOT an officer's photo approval (no photoVerifiedAt)", !k?.photoVerifiedAt);
  ok("typed: the voter's card (no published format) is flagged for the officer's check", (k?.autoFlags ?? []).includes("NO_PUBLISHED_FORMAT"), JSON.stringify(k?.autoFlags));
  ok("typed: player email is the approval", sentTo("typed@example.com").some((m) => m.subject.includes("fully verified")), JSON.stringify(sentTo("typed@example.com").map((m) => m.subject)));
  ok("typed: in-app 'Identity verified'", (await latestKycNote("usr_typed01")) === "Identity verified");
  ok("typed: ⛔ no officer email — nobody waits on an automatic approval", sentSubject("New KYC to verify").length === 0);
  // The officer's check afterwards — the typed attestation set, on the version shown.
  const PASS4 = { details_genuine: "pass", number_reviewed: "pass", no_other_account: "pass", sanctions_clear: "pass" } as const;
  const stale = await markPostChecked(OFFICER, "usr_typed01", { version: "1999-01-01T00:00:00.000Z", attestations: PASS4 });
  ok("post-check: ⛔ a stale version is refused", !stale.ok, JSON.stringify(stale));
  const photoSet = await markPostChecked(OFFICER, "usr_typed01", { version: await ver("usr_typed01"), attestations: { name_matches: "pass", document_authentic: "pass", selfie_match: "pass", sanctions_clear: "pass" } });
  ok("post-check: ⛔ the PHOTO attestation set is refused on a typed approval", !photoSet.ok, JSON.stringify(photoSet));
  const checked = await markPostChecked(OFFICER, "usr_typed01", { version: await ver("usr_typed01"), attestations: PASS4 });
  const kc = await getKycStatus("usr_typed01");
  ok("post-check: marked checked by the officer, still APPROVED", checked.ok && !!kc?.postCheckedAt && kc?.postCheckedById === OFFICER && kc?.status === "APPROVED", JSON.stringify(checked));
  const twice = await markPostChecked(OFFICER, "usr_typed01", { version: await ver("usr_typed01"), attestations: PASS4 });
  ok("post-check: a second check is refused (already checked)", !twice.ok);
}
// A ROUTED press: an officer's wallet hold sends the identity to an officer instead (never refused, never instant).
await mkPlayer("usr_typed02", "typed2@example.com");
await mkWallet("usr_typed02");
await addWalletFreeze("usr_typed02", "OFFICER", { actorId: OFFICER, note: "flow stress · a hold that routes the identity" });
clearLogs();
{
  const t = await verifyIdentity("usr_typed02", { idType: "NIDA", idNumber: "19900101456712355678", fullName: "Baraka Routed Mushi" });
  await flush();
  const k = await getKycStatus("usr_typed02");
  ok("typed routed: a wallet hold -> PENDING_REVIEW, reason WALLET_HOLD, not approved",
    t.ok && verified(t)?.outcome === "routed" && (verified(t)?.routes ?? []).includes("WALLET_HOLD") && k?.status === "PENDING_REVIEW" && !k?.autoApprovedAt,
    JSON.stringify({ t, s: k?.status }));
  ok("typed routed: player email names the DETAILS it received", sentTo("typed2@example.com").some((m) => m.subject === "Details received · verification pending"),
    JSON.stringify(sentTo("typed2@example.com").map((m) => m.subject)));
  ok("typed routed: in-app 'Identity details received'", (await latestKycNote("usr_typed02")) === "Identity details received", await latestKycNote("usr_typed02"));
  ok("typed routed: admin emails (2)", sentSubject("New KYC to verify").length === 2);
  const bell = (await listForUser(OFFICER, 50)).find((n) => n.kind === "KYC" && n.href === "/admin/kyc/usr_typed02");
  ok("typed routed: the officer's bell links to the identity workstation", !!bell, JSON.stringify(bell ?? null));
  // The officer decides it on the TYPED set — and a typed approval stamps no photo approval.
  const typedSet = { details_genuine: "pass", number_reviewed: "pass", no_other_account: "pass", sanctions_clear: "pass" } as const;
  const wrongMode = await reviewKyc({ officerId: OFFICER, userId: "usr_typed02", decision: "APPROVE", version: await ver("usr_typed02"), mode: "photo" });
  ok("typed routed: ⛔ approving it as a PHOTO case is refused (no photos on file)", !wrongMode.ok, JSON.stringify(wrongMode));
  const ap = await reviewKyc({ officerId: OFFICER, userId: "usr_typed02", decision: "APPROVE", version: await ver("usr_typed02"), mode: "typed", attestations: typedSet });
  const ka = await getKycStatus("usr_typed02");
  ok("typed routed: an officer approves it on the typed set — APPROVED, reviewer named, NO photoVerifiedAt",
    ap.ok && ka?.status === "APPROVED" && ka?.reviewerId === OFFICER && !ka?.photoVerifiedAt && !ka?.autoApprovedAt, JSON.stringify(ap));
}

// ─── 7. EXTRA DOCUMENTS — REMOVED 2026-10-10, and the legacy requests still on rows ───
// ⛔ The owner's ruling leaves officers one ask: a correction of the typed details. This section used to prove the
// extra-document loop worked; it now proves the loop is GONE and that the requests already on rows are harmless.
ok("⛔ attachExtraDocument is no longer exported", !("attachExtraDocument" in KYC));
await mkPlayer("usr_extra01", "extra@example.com");
await getToVerified("usr_extra01"); await attach3("usr_extra01"); await submitForReview("usr_extra01");
r = await reviewKyc({ officerId: OFFICER, userId: "usr_extra01", decision: "REQUEST_INFO" as never, version: await ver("usr_extra01"),
  reason: "Need two more documents to verify.", requestedDocs: ["Clearer photo of ID back", "Proof of address (utility bill)", "  "] } as never);
ok("⛔ request-info with docs is refused", !r.ok && r.code === "INVALID", JSON.stringify(r));
let ek = await getKycStatus("usr_extra01");
ok("⛔ …no extra request was created", (ek?.extraRequests?.length ?? 0) === 0, JSON.stringify(ek?.extraRequests));

// A LEGACY row: an officer's open extra-document request from before 2026-10-10, on a case sent back for corrections.
r = await askForCorrections(OFFICER, "usr_extra01", { note: "Please check the spelling of your name.", version: await ver("usr_extra01") });
ok("corrections asked on the legacy case", r.ok, JSON.stringify(r));
ek = await getKycStatus("usr_extra01");
const LEGACY = [
  { id: "req_legacy1", description: "Clearer photo of ID back", requestedAt: "2026-10-01T09:00:00.000Z", storageKey: null, uploadedAt: null },
  { id: "req_legacy2", description: "Proof of address (utility bill)", requestedAt: "2026-10-01T09:00:00.000Z", storageKey: null, uploadedAt: null },
];
await db.kyc.upsert({ ...ek!, extraRequests: LEGACY });
// ⛔ THE EXTRA-REQUESTS GATE IS DELETED: a legacy open request never blocks a send — its upload control no longer exists.
r = await submitForReview("usr_extra01");
ok("⛔ a legacy OPEN extra request no longer blocks the send", r.ok && (await getKycStatus("usr_extra01"))?.status === "PENDING_REVIEW", JSON.stringify(r));
ok("…and the legacy requests stay on the row as they were (read-only evidence)",
  JSON.stringify((await getKycStatus("usr_extra01"))?.extraRequests) === JSON.stringify(LEGACY));
// A correction neither adds a request nor erases the legacy ones.
r = await askForCorrections(OFFICER, "usr_extra01", { note: "Actually, check the document number too.", version: await ver("usr_extra01") });
ok("a second correction is asked", r.ok, JSON.stringify(r));
ok("⛔ a correction never writes extraRequests — the legacy ones are carried untouched",
  JSON.stringify((await getKycStatus("usr_extra01"))?.extraRequests) === JSON.stringify(LEGACY));

// ─── 8. Self-review still blocked across every officer decision ───
await mkPlayer("usr_self_si");
await getToVerified("usr_self_si"); await attach3("usr_self_si"); await submitForReview("usr_self_si");
r = await askForCorrections("usr_self_si", "usr_self_si", { note: "trying to self-review", version: await ver("usr_self_si") });
ok("self corrections blocked", !r.ok && r.code === "INVALID");
r = await reviewKyc({ officerId: "usr_self_si", userId: "usr_self_si", decision: "APPROVE", version: await ver("usr_self_si") });
ok("self approve blocked", !r.ok && r.code === "INVALID");
r = await reviewKyc({ officerId: "usr_self_si", userId: "usr_self_si", decision: "REJECT", version: await ver("usr_self_si"), reason: "trying to self-review" });
ok("self reject blocked", !r.ok && r.code === "INVALID");

console.log = realLog;
console.log(`\n${fail === 0 ? "ALL KYC-FLOW STRESS SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
