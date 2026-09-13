/**
 * Integration test — KYC submission/review notifications, identity propagation,
 * and email-address verification. In-memory store, email stub (no Postmark key).
 *
 * Run: npx tsx scripts/kyc-submit-notify.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// Arm the email outbox so assertions read the real recipient rather than scraping stdout,
// which masks the address (audit F-06). `outboxArmed()` reads this lazily.
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.KYC_NOTIFY_EMAILS = "Compliance@50pick.tz, ops@50pick.tz , compliance@50pick.tz"; // dupes + case + spaces

import { submitForReview, reviewKyc, kycNotifyEmails } from "../src/lib/server/kyc-service.ts";
import { setUserEmail, verifyEmailToken, buildEmailVerifyUrl } from "../src/lib/server/email-verification.ts";
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
    reviewerId: null, reviewedAt: null, submittedAt: null, createdAt: now, updatedAt: now,
  });
}

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
ok("all-admins: includes admin/mod/compliance emails", recips.includes("admin1@50pick.tz") && recips.includes("mod@50pick.tz") && recips.includes("officer@50pick.tz"), JSON.stringify(recips));
ok("all-admins: excludes players", !recips.includes("player99@example.com"));
ok("all-admins: drops emailless admin (no crash)", recips.every((e) => !!e));
// Restore override for the submit test (deterministic recipient set).
process.env.KYC_NOTIFY_EMAILS = "compliance@50pick.tz,ops@50pick.tz";

// ── 3. submitForReview fires player + admin emails ──
await mkUser("usr_p0001", "PENDING_KYC", "PLAYER", { email: "jay@example.com" });
await mkKyc("usr_p0001", "IN_PROGRESS");
clearLogs();
let r = await submitForReview("usr_p0001");
await flush();
ok("submit returns ok", r.ok);
ok("kyc -> PENDING_REVIEW", (await db.kyc.findByUserId("usr_p0001"))?.status === "PENDING_REVIEW");
const playerStub = sentTo("jay@example.com").filter((m) => m.subject.includes("Documents received"));
ok("player 'documents received' email sent", playerStub.length === 1, JSON.stringify(playerStub));
const adminStubs = sentSubject("New KYC to verify · kyc_usr_p0001");
// Exact recipient match, not a substring of a log line — so "ops@50pick.tz.example.com"
// could no longer satisfy "ops@50pick.tz".
const toCompliance = adminStubs.some((m) => m.to === "compliance@50pick.tz");
const toOps = adminStubs.some((m) => m.to === "ops@50pick.tz");
ok("one admin email per recipient", adminStubs.length === 2 && toCompliance && toOps,
  JSON.stringify(adminStubs.map((m) => m.to)));
// In-app: every admin gets a "New KYC to review" alert in their MAIN bell,
// deep-linking to the player's KYC tab (admins removed the separate admin bell).
const adminNote = (await listForUser("usr_admin01", 20)).find((n) => n.kind === "KYC" && n.titleEn === "New KYC to review");
ok("admin gets in-app 'New KYC to review' (main bell)", !!adminNote);
ok("admin notification deep-links to the KYC tab", adminNote?.href === "/admin/players/usr_p0001?tab=kyc", adminNote?.href ?? "");
ok("officer + moderator also notified in-app",
  !!(await listForUser(OFFICER, 20)).find((n) => n.titleEn === "New KYC to review") &&
  !!(await listForUser("usr_mod01", 20)).find((n) => n.titleEn === "New KYC to review"));

// ── 4. Idempotency: re-submitting does NOT resend ──
clearLogs();
r = await submitForReview("usr_p0001");
await flush();
ok("re-submit returns ok (idempotent)", r.ok);
ok("re-submit sends NO emails", emailOutbox().length === 0, JSON.stringify(emailOutbox().map((m) => m.subject)));

// ── 5. reviewKyc APPROVE: reference + legacy status normalisation — and the name is LEFT ALONE ──
// 🔴 INVERTED 2026-09-13 (owner ruling — docs/COMPLIANCE-DECISIONS.md 2026-09-13, the display-name entry).
// These two assertions REQUIRED approval to overwrite `displayName` with the legal name "even over a
// chosen handle" (the 2026-06-14 ruling). From 2026-09-13 a player may spend weeks on the leaderboard
// under a handle and be verified only when they cash out, so overwriting it then would publish their
// legal name unannounced. The legal name is RECORDED on the submission for the officer; it is not shown.
// ⛔ Inverted, not deleted: without them the overwrite could come back from history and nothing would see it.
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0001", decision: "APPROVE" });
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
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0002", decision: "APPROVE" });
ok("5b · approve ok", r.ok);
ok("⛔ a chosen handle is NOT overwritten by the legal name",
  (await db.user.findById("usr_p0002"))?.displayName === "LuckyStriker", String((await db.user.findById("usr_p0002"))?.displayName));

// ── 6. reviewKyc REJECT (recoverable) — the notice invites a resubmission, which is true here ──
await mkUser("usr_p0003", "PENDING_KYC", "PLAYER", { email: "ray@example.com" });
await mkKyc("usr_p0003", "PENDING_REVIEW");
clearLogs();
r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0003", decision: "REJECT", reason: "Name mismatch with NIDA records." });
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
try { r = await reviewKyc({ officerId: OFFICER, userId: "usr_p0004", decision: "REJECT", rejectCode: "SANCTIONED" }); }
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
let vr = await verifyEmailToken(token);
ok("valid token -> verified", vr.status === "verified");
ok("emailVerifiedAt now set", !!(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await verifyEmailToken(token);
ok("second click -> already (idempotent)", vr.status === "already");
vr = await verifyEmailToken("garbage.token.value");
ok("garbage token -> invalid", vr.status === "invalid");

// Changing the email invalidates the old verified flag AND the old token.
sr = await setUserEmail("usr_v0001", "changed@example.com");
ok("changing email clears verified flag", !(await db.user.findById("usr_v0001"))?.emailVerifiedAt);
vr = await verifyEmailToken(token); // old token still names new.user@…
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
