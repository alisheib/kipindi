/**
 * Integration test — KYC submission/review notifications, identity propagation,
 * and email-address verification. In-memory store, email stub (no Postmark key).
 *
 * ⭐ RE-POINTED 2026-10-10 (owner ruling: players verify with TYPED details and are approved at once; agents keep photo
 * ID + selfie — docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details"):
 *   · §3 is the AGENT photo send: the player is told their PHOTOS arrived ("Photos received"), and the officers' bell
 *     links to the identity workstation (`/admin/kyc/<id>`) — it used to link to the player page's KYC tab, which no
 *     longer decides anything — and goes only to the roles that can ACT there (ADMIN, COMPLIANCE): the Trading role
 *     (MODERATOR) has no view of /admin/kyc, so a bell sent to it opened a refusal. The admin EMAIL list is unchanged.
 *   · §3t is NEW: a typed press approved at once tells the officers NOTHING (nobody waits on it); a ROUTED one is "Details
 *     received" for the player, a bell and an email for the officers that say WHY it came to them, and an URGENT bell
 *     when the NIDA number's own birth digits say under 18.
 *   · §6c is NEW: an officer's request for CORRECTIONS (it replaced "more information"/"re-verify") names no document.
 *   · Every officer decision carries the row version (`kycRowVersion`).
 *
 * Run: npx tsx scripts/kyc-submit-notify.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// Arm the email outbox so assertions read the real recipient rather than scraping stdout,
// which masks the address (audit F-06). `outboxArmed()` reads this lazily.
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.KYC_NOTIFY_EMAILS = "Compliance@50pick.tz, ops@50pick.tz , compliance@50pick.tz"; // dupes + case + spaces

import { submitForReview, verifyIdentity, reviewKyc, askForCorrections, kycRowVersion, kycNotifyEmails } from "../src/lib/server/kyc-service.ts";
import { setUserEmail, confirmEmailWithProof, buildEmailVerifyUrl } from "../src/lib/server/email-verification.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.error(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = new Date().toISOString();

// Capture console.log (the email stub + skip-notices) without losing visibility.
let logs: string[] = [];
const realLog = console.log;
console.log = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
const flush = () => new Promise((r) => setTimeout(r, 60)); // let fire-and-forget sends settle
const clearLogs = () => { logs = []; clearEmailOutbox(); };
// ⚠️ Recipients come from the OUTBOX, never from stdout — the log masks the address
// (audit F-06), and relaxing these assertions to the masked form would keep them green
// while destroying what they measure. `to === addr` is also an exact match, where the
// old log scrape matched the fragment anywhere in the line.
const sentTo = (addr: string) => emailOutbox().filter((m) => m.to === addr);
const sentSubject = (frag: string) => emailOutbox().filter((m) => m.subject.includes(frag));

let phoneSeq = 0;
async function mkUser(id: string, status: string, role: string, opts: { email?: string | null; displayName?: string | null } = {}) {
  await db.user.create({
    // Monotonic, NOT `id.slice(-4)` — that collided across ids sharing their last
    // four characters. The in-memory Map keys on id and never noticed; Postgres
    // rejects it on the phoneE164 unique index.
    id, phoneE164: `+25571${String(++phoneSeq).padStart(6, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: role as never, status: status as never, locale: "EN", displayName: opts.displayName ?? ("Handle " + id.slice(-3)),
    dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, email: opts.email ?? null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  });
}
async function mkKyc(userId: string, status: string, fullName = "Asha Mwamba Juma") {
  await db.kyc.upsert({
    id: `kyc_${userId}`, userId, status: status as never, rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: "19900101456712340000", idExpiry: null, idVerifiedAt: now,
    fullName, dob: "1990-01-01",
    documents: [{ docType: "NIDA_FRONT", storageKey: "a", uploadedAt: now }, { docType: "NIDA_BACK", storageKey: "b", uploadedAt: now }, { docType: "SELFIE", storageKey: "c", uploadedAt: now }],
    extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: null,
    // ⛔ Every column named (2026-10-10). The full NIDA photo set is on file — an agent applicant's photo case.
    photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [],
    createdAt: now, updatedAt: now,
  });
}
/** The row version an officer's form posts (`kycRowVersion`, 2026-10-10). */
const v = async (userId: string) => kycRowVersion((await db.kyc.findByUserId(userId))!);

const OFFICER = "usr_officer0001";
await mkUser(OFFICER, "ACTIVE", "COMPLIANCE", { email: "officer@50pick.tz" });

// ── 1. kycNotifyEmails: KYC_NOTIFY_EMAILS override (deduped + lowercased) ──
let recips = await kycNotifyEmails();
ok("override: deduped + lowercased", recips.length === 2 && recips.includes("compliance@50pick.tz") && recips.includes("ops@50pick.tz"), JSON.stringify(recips));

// ── 2. kycNotifyEmails: all-admins fallback when override unset ──
delete process.env.KYC_NOTIFY_EMAILS;
await mkUser("usr_admin01", "ACTIVE", "ADMIN", { email: "Admin1@50pick.tz" });
await mkUser("usr_mod01", "ACTIVE", "MODERATOR", { email: "mod@50pick.tz" });
await mkUser("usr_noemail", "ACTIVE", "ADMIN", { email: null }); // no resolvable email → dropped
await mkUser("usr_player99", "ACTIVE", "PLAYER", { email: "player99@example.com" }); // not an admin → excluded
recips = await kycNotifyEmails();
// ⭐ 2026-10-10 (review R4.5): the email goes to the SAME audience as the bell — `kycOfficerRoles()`, the roles that can
// open AND act on /admin/kyc/<id>, the link the email carries (ADMIN and COMPLIANCE by default). It used a hard-coded
// ADMIN / COMPLIANCE / MODERATOR set, so the Trading role was emailed a case page its grants refuse to open.
ok("all-admins: includes the admin and compliance emails", recips.includes("admin1@50pick.tz") && recips.includes("officer@50pick.tz"), JSON.stringify(recips));
ok("all-admins: ⛔ excludes the moderator (the Trading role cannot open the case it would be sent)", !recips.includes("mod@50pick.tz"), JSON.stringify(recips));
ok("all-admins: excludes players", !recips.includes("player99@example.com"));
ok("all-admins: drops emailless admin (no crash)", recips.every((e) => !!e));
// Restore override for the submit test (deterministic recipient set).
process.env.KYC_NOTIFY_EMAILS = "compliance@50pick.tz,ops@50pick.tz";

// ── 3. submitForReview (the AGENT photo send) fires player + admin emails ──
await mkUser("usr_p0001", "PENDING_KYC", "PLAYER", { email: "jay@example.com" });
await mkKyc("usr_p0001", "IN_PROGRESS");
clearLogs();
let r = await submitForReview("usr_p0001");
await flush();
ok("submit returns ok", r.ok);
ok("kyc -> PENDING_REVIEW", (await db.kyc.findByUserId("usr_p0001"))?.status === "PENDING_REVIEW");
const playerStub = sentTo("jay@example.com").filter((m) => m.subject === "Photos received · verification pending");
ok("player 'photos received' email sent (it names the PHOTOS an agent applicant sent)", playerStub.length === 1, JSON.stringify(sentTo("jay@example.com").map((m) => m.subject)));
ok("…and it names no raw slot code (the old 'Documents' row listed NIDA_FRONT …)",
  playerStub.length === 1 && !/NIDA_FRONT|NIDA_BACK|nida front/i.test(playerStub[0].html));
const playerBell = (await listForUser("usr_p0001", 20)).find((n) => n.kind === "KYC");
ok("player in-app 'Identity photos received'", playerBell?.titleEn === "Identity photos received", String(playerBell?.titleEn));
const adminStubs = sentSubject("New KYC to verify · kyc_usr_p0001");
// Exact recipient match, not a substring of a log line — so "ops@50pick.tz.example.com"
// could no longer satisfy "ops@50pick.tz".
const toCompliance = adminStubs.some((m) => m.to === "compliance@50pick.tz");
const toOps = adminStubs.some((m) => m.to === "ops@50pick.tz");
ok("one admin email per recipient", adminStubs.length === 2 && toCompliance && toOps,
  JSON.stringify(adminStubs.map((m) => m.to)));
ok("the admin email links to the identity workstation and says why the case came (a photo case)",
  adminStubs.length > 0 && adminStubs.every((m) => m.html.includes("/admin/kyc/usr_p0001") && m.html.includes("Photo case")),
  adminStubs[0]?.html.slice(0, 120) ?? "");
// In-app: every officer who can ACT gets a "New KYC to review" alert in their MAIN bell, deep-linking to the
// identity workstation (2026-10-10 — it was the player page's KYC tab, which no longer decides anything).
const adminNote = (await listForUser("usr_admin01", 20)).find((n) => n.kind === "KYC" && n.titleEn === "New KYC to review");
ok("admin gets in-app 'New KYC to review' (main bell)", !!adminNote);
ok("admin notification deep-links to the identity workstation", adminNote?.href === "/admin/kyc/usr_p0001", adminNote?.href ?? "");
ok("the compliance officer is notified in-app too", !!(await listForUser(OFFICER, 20)).find((n) => n.titleEn === "New KYC to review"));
// ⛔ 2026-10-10 (plan A1): the Trading role (MODERATOR) has no view of /admin/kyc by default, so the bell it used to get
// opened a door that refused it. The audience is the roles that can act (`kycOfficerRoles`).
ok("⛔ …but NOT the moderator, whose role cannot open the case",
  !(await listForUser("usr_mod01", 20)).find((n) => n.kind === "KYC"), JSON.stringify((await listForUser("usr_mod01", 20)).map((n) => n.titleEn)));
ok("⛔ …and never a player", !(await listForUser("usr_player99", 20)).find((n) => n.kind === "KYC"));

// ── 4. Idempotency: re-submitting does NOT resend ──
clearLogs();
r = await submitForReview("usr_p0001");
await flush();
ok("re-submit returns ok (idempotent)", r.ok);
ok("re-submit sends NO emails", emailOutbox().length === 0, JSON.stringify(emailOutbox().map((m) => m.subject)));

// ── 3t. THE TYPED PRESS (2026-10-10) — instant: the player hears, the officers do not; routed: everyone does ──
{
  const officerKycBells = async () => (await listForUser(OFFICER, 50)).filter((n) => n.kind === "KYC").length;
  await mkUser("usr_t0001", "ACTIVE", "PLAYER", { email: "tina@example.com" });
  clearLogs();
  const bellsBefore = await officerKycBells();
  const t = await verifyIdentity("usr_t0001", { idType: "VOTER_CARD", idNumber: "T55001234", fullName: "Tina Typed Mollel" });
  await flush();
  ok("3t.1 the typed press is approved at once", t.ok && (t as { data?: { outcome?: string } }).data?.outcome === "approved", JSON.stringify(t));
  ok("3t.2 the player gets the approval email and bell", sentTo("tina@example.com").some((m) => m.subject.includes("fully verified"))
    && (await listForUser("usr_t0001", 20)).some((n) => n.kind === "KYC" && n.titleEn === "Identity verified"));
  ok("3t.3 ⛔ no admin email for an automatic approval — nobody waits on it", sentSubject("New KYC to verify").length === 0,
    JSON.stringify(emailOutbox().map((m) => m.subject)));
  ok("3t.4 ⛔ …and no officer bell (the post-check list and its own alert carry it)", (await officerKycBells()) === bellsBefore);

  // ROUTED — the NIDA number's own birth digits say under 18 (the account's date is adult): an officer, URGENTLY.
  await mkUser("usr_t0002", "ACTIVE", "PLAYER", { email: "umi@example.com" });
  clearLogs();
  const u = await verifyIdentity("usr_t0002", { idType: "NIDA", idNumber: "20120101456712345678", fullName: "Umi Routed Nyerere" });
  await flush();
  const routes = (u as { data?: { routes?: string[] } }).data?.routes ?? [];
  ok("3t.5 a NIDA number whose birth digits say under 18 is ROUTED (NIDA_UNDER_18), never approved",
    u.ok && (u as { data?: { outcome?: string } }).data?.outcome === "routed" && routes.includes("NIDA_UNDER_18")
      && (await db.kyc.findByUserId("usr_t0002"))?.status === "PENDING_REVIEW", JSON.stringify(u));
  ok("3t.6 the player is told their DETAILS arrived", sentTo("umi@example.com").some((m) => m.subject === "Details received · verification pending"),
    JSON.stringify(sentTo("umi@example.com").map((m) => m.subject)));
  const pBell = (await listForUser("usr_t0002", 20)).find((n) => n.kind === "KYC");
  ok("3t.7 …and their bell says 'Identity details received'", pBell?.titleEn === "Identity details received", String(pBell?.titleEn));
  const routedAdmin = sentSubject("New KYC to verify · kyc_");
  ok("3t.8 the admin emails say WHY it came to an officer, and mask the number",
    routedAdmin.length === 2 && routedAdmin.every((m) => m.html.includes("NIDA number says under 18") && !m.html.includes("20120101456712345678") && m.html.includes("5678")),
    routedAdmin[0]?.html.slice(0, 160) ?? "none");
  const urgent = (await listForUser(OFFICER, 50)).find((n) => n.kind === "KYC" && n.href === "/admin/kyc/usr_t0002");
  ok("3t.9 the officer's bell is URGENT and links to the case", urgent?.titleEn === "Urgent KYC to review", JSON.stringify(urgent ? { t: urgent.titleEn, h: urgent.href } : null));
}

// ── 5. reviewKyc APPROVE: reference + legacy status normalisation — and the name is LEFT ALONE ──
// 🔴 INVERTED 2026-09-13 (owner ruling — docs/COMPLIANCE-DECISIONS.md 2026-09-13, the display-name entry).
// These two assertions REQUIRED approval to overwrite `displayName` with the legal name "even over a
// chosen handle" (the 2026-06-14 ruling). From 2026-09-13 a player may spend weeks on the leaderboard
// under a handle and be verified only when they cash out, so overwriting it then would publish their
// legal name unannounced. The legal name is RECORDED on the submission for the officer; it is not shown.
// ⛔ Inverted, not deleted: without them the overwrite could come back from history and nothing would see it.
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0001", decision: "APPROVE", version: await v("usr_p0001") });
await flush();
ok("approve ok", r.ok);
ok("⛔ approval leaves the display name alone — the generated handle survives",
  (await db.user.findById("usr_p0001"))?.displayName === "Handle 001", String((await db.user.findById("usr_p0001"))?.displayName));
ok("…while the legal name is still RECORDED on the submission, for the officer",
  (await db.kyc.findByUserId("usr_p0001"))?.fullName === "Asha Mwamba Juma");
ok("user PENDING_KYC -> ACTIVE (legacy normalisation of a straggler row)", (await db.user.findById("usr_p0001"))?.status === "ACTIVE");
ok("approved email carries reference", sentTo("jay@example.com").some((m) => m.subject.includes("fully verified")));
// ⭐ The approval bell names the one thing approval unlocks, and goes where the player was going.
{
  const n = (await listForUser("usr_p0001", 20)).find((x) => x.kind === "KYC" && x.titleEn === "Identity verified");
  ok("the approval bell names withdrawals — never depositing or playing — and links to the wallet",
    !!n && /withdraw/i.test(n.bodyEn) && !/deposit|add money|\bplay/i.test(n.bodyEn) && n.href === "/wallet",
    JSON.stringify(n ? { body: n.bodyEn, href: n.href } : null));
}

// 5b. A CHOSEN handle survives approval too — the exact case the 2026-06-14 ruling named.
await mkUser("usr_p0002", "PENDING_KYC", "PLAYER", { email: "kay@example.com", displayName: "LuckyStriker" });
await mkKyc("usr_p0002", "PENDING_REVIEW", "Bakari Hassan Omari");
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0002", decision: "APPROVE", version: await v("usr_p0002") });
ok("5b · approve ok", r.ok);
ok("⛔ a chosen handle is NOT overwritten by the legal name",
  (await db.user.findById("usr_p0002"))?.displayName === "LuckyStriker", String((await db.user.findById("usr_p0002"))?.displayName));

// ── 6. reviewKyc REJECT (recoverable) — the notice invites a resubmission, which is true here ──
await mkUser("usr_p0003", "PENDING_KYC", "PLAYER", { email: "ray@example.com" });
await mkKyc("usr_p0003", "PENDING_REVIEW");
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0003", decision: "REJECT", version: await v("usr_p0003"), reason: "Name mismatch with NIDA records." });
await flush();
ok("reject ok", r.ok);
ok("rejected email sent", sentTo("ray@example.com").some((m) => m.subject.includes("Identity check needs attention")));
// ⭐ THE CONTROL FOR 6b, TAKEN BEFORE ITS OUTBOX IS CLEARED: the same checks that must find NO resubmit
// on a final refusal DO find one on a recoverable refusal — otherwise 6b's absences prove nothing.
const RESUBMIT = /re-?submit|tuma tena|wasilisha tena|重新提交/i;
{
  const n = (await listForUser("usr_p0003", 20)).find((x) => x.kind === "KYC");
  ok("6 · control · a recoverable refusal's bell asks for a resubmission and links to the form",
    !!n && RESUBMIT.test(n.bodyEn) && n.href === "/profile/kyc", JSON.stringify(n ? { body: n.bodyEn, href: n.href } : null));
  ok("6 · control · …and its email carries the Resubmit button to the form",
    sentTo("ray@example.com").some((m) => /Resubmit/.test(m.html) && m.html.includes("/profile/kyc")));
}

// ── 6b. A FINAL refusal is told the truth: no "re-submit", a route to support (2026-09-13, S1) ──
// ⭐ The recoverable notice above says "Please re-submit" and links to /profile/kyc — right for a bad
// photo. On a FINAL code (`UNDERAGE`, `SANCTIONED`, `DUPLICATE_IDENTITY`) the player cannot restart
// (`startKyc` refuses with `kyc_refused_final`) and the wallet is frozen while an officer decides the
// balance, so the same sentence would send them to a door that is shut.
// ⚠️ The decision is caught and counted: on 2026-09-13 a final refusal threw from `recordFinalRefusal`
// under the in-memory store BEFORE the notice was sent (`kyc-service.ts`: `.catch` on a store read).
await mkUser("usr_p0004", "ACTIVE", "PLAYER", { email: "zed@example.com" });
await db.wallet.create({
  id: "wal_usr_p0004", userId: "usr_p0004", balance: 30_000, pending: 0, hold: 0, bonusBalance: 0, freezeReasons: [],
  currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
} as never);
await mkKyc("usr_p0004", "PENDING_REVIEW");
clearLogs();
let finalThrew: unknown = null;
try { r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0004", decision: "REJECT", rejectCode: "SANCTIONED", version: await v("usr_p0004") }); }
catch (e) { finalThrew = e; }
await flush();
ok("6b · the final refusal completes without throwing", !finalThrew && r.ok, finalThrew ? String(finalThrew) : JSON.stringify(r));
{
  const n = (await listForUser("usr_p0004", 20)).find((x) => x.kind === "KYC");
  ok("6b · the bell says REFUSED", n?.titleEn === "Identity verification refused", String(n?.titleEn));
  ok("6b · ⛔ …never asks for a resubmission, in any language",
    !!n && ![n.bodyEn, (n as { bodySw?: string }).bodySw, (n as { bodyZh?: string }).bodyZh].some((b) => RESUBMIT.test(b ?? "")),
    JSON.stringify(n ? [n.bodyEn, (n as { bodySw?: string }).bodySw, (n as { bodyZh?: string }).bodyZh] : null));
  ok("6b · …and links to help, not to the verification form", n?.href === "/help", String(n?.href));
  const mails = sentTo("zed@example.com");
  ok("6b · the email is the REFUSED one", mails.some((m) => m.subject === "Identity verification refused"),
    JSON.stringify(mails.map((m) => m.subject)));
  ok("6b · ⛔ …with no Resubmit button and no link to the form",
    mails.length > 0 && mails.every((m) => m.html.length > 50 && !/Resubmit/.test(m.html) && !m.html.includes("/profile/kyc")));
}

// ── 6c. CORRECTIONS (2026-10-10) — the one thing an officer may ask, and it names no document ──
// ⭐ It replaced "more information needed" (which asked for documents to be replaced or added) and force re-verify.
// The officer's note reaches the player word for word; nothing asks for a file, in any language.
await mkUser("usr_p0005", "ACTIVE", "PLAYER", { email: "cora@example.com" });
await mkKyc("usr_p0005", "PENDING_REVIEW");
clearLogs();
const NOTE = "Your surname is spelt differently from your document.";
r = await askForCorrections(OFFICER, "usr_p0005", { note: NOTE, version: await v("usr_p0005") });
await flush();
ok("6c · corrections asked", r.ok, JSON.stringify(r));
{
  const UPLOAD = /upload|replace or add|clearer|photo|nyaraka|picha|上传|照片/i;
  const n = (await listForUser("usr_p0005", 20)).find((x) => x.kind === "KYC");
  ok("6c · the bell asks to check the details and links to the form", n?.titleEn === "Please check your details" && n?.href === "/profile/kyc",
    JSON.stringify(n ? { t: n.titleEn, h: n.href } : null));
  ok("6c · ⛔ …and asks for no document, in any language",
    !!n && ![n.titleEn, n.bodyEn, (n as { titleSw?: string }).titleSw, (n as { bodySw?: string }).bodySw, (n as { titleZh?: string }).titleZh, (n as { bodyZh?: string }).bodyZh].some((s) => UPLOAD.test(s ?? "")),
    JSON.stringify(n ? [n.bodyEn, (n as { bodySw?: string }).bodySw] : null));
  const mails = sentTo("cora@example.com");
  ok("6c · the email carries the officer's note word for word", mails.some((m) => m.subject === "Please check your details · 50pick verification" && m.html.includes(NOTE)),
    JSON.stringify(mails.map((m) => m.subject)));
  ok("6c · ⛔ …and asks for no document either", mails.length > 0 && mails.every((m) => !UPLOAD.test(m.html.replace(NOTE, ""))));
  ok("6c · ⛔ …and no officer was alerted (the move is the player's)", sentSubject("New KYC to verify").length === 0);
}

// ── 7. Email verification token round-trip ──
await mkUser("usr_v0001", "ACTIVE", "PLAYER", { email: null });
clearLogs();
let sr = await setUserEmail("usr_v0001", "  New.User@Example.COM ");
await flush();
ok("setUserEmail stores normalized address", (await db.user.findById("usr_v0001"))?.email === "new.user@example.com");
ok("setUserEmail leaves email unverified", !(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
ok("setUserEmail reports a verification send", sr.ok && sr.changed && sr.verificationSent);
ok("verification email stub sent to new address", sentTo("new.user@example.com").some((m) => m.subject.includes("Confirm your email")));

const token = new URL(buildEmailVerifyUrl("usr_v0001", "new.user@example.com")).searchParams.get("token") ?? undefined;
// The link opened in the account's own session (route audit 2026-10-06, A3: anywhere else it asks for the password).
const owner = { sessionUserId: "usr_v0001", password: null };
let vr = await confirmEmailWithProof(token, owner);
ok("valid token -> verified", vr.status === "verified");
ok("emailVerifiedAt now set", !!(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await confirmEmailWithProof(token, owner);
ok("second click -> already (idempotent)", vr.status === "already");
vr = await confirmEmailWithProof("garbage.token.value", owner);
ok("garbage token -> invalid", vr.status === "invalid");

// Changing the email invalidates the old verified flag AND the old token.
sr = await setUserEmail("usr_v0001", "changed@example.com");
ok("changing email clears verified flag", !(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await confirmEmailWithProof(token, owner); // old token still names new.user@…
ok("stale token (email changed) -> mismatch", vr.status === "mismatch");

// Unchanged address is a no-op (no re-send, stays unverified-without-resend).
clearLogs();
const before = (await db.user.findById("usr_v0001"))?.email;
sr = await setUserEmail("usr_v0001", "changed@example.com");
await flush();
ok("unchanged email is a no-op", sr.ok && !sr.changed && !sr.verificationSent && (await db.user.findById("usr_v0001"))?.email === before);

console.log = realLog;
console.log(`\n${fail === 0 ? "ALL KYC-NOTIFY SCENARIOS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
