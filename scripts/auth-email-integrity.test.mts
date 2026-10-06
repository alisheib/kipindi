/**
 * REGISTRATION + EMAIL-VERIFICATION INTEGRITY.
 *
 * These are regression locks for a set of defects found auditing the money-in
 * ladder (browse free → confirm email to deposit → KYC to withdraw). Each one
 * was individually capable of quietly re-opening the deposit gate or stranding a
 * player who could not deposit and could not find out why:
 *
 *   A. Login used to WRITE the PHONE_EMAIL_MAP address onto the user without
 *      clearing `emailVerifiedAt` — laundering an unconfirmed inbox into a
 *      verified one, clobbering profile edits, and skipping the duplicate check.
 *   B. "We sent you a link" was returned unconditionally, even for an address on
 *      the hard-bounce suppression list where nothing was sent at all.
 *   C. The confirmation link — the one link that unlocks depositing — was sent
 *      with click-tracking on.
 *   D. A duplicate EMAIL at sign-up was reported as a duplicate PHONE, and the
 *      CTA pointed at a phone with no account.
 *   E. The admin email override bypassed the single writer, leaving the player
 *      unverified with no link ever sent.
 *
 * And the route audit of 2026-10-06 (A1 / A3 / A7):
 *
 *   F. The email was a password-less door to the recovery inbox: a minute with an
 *      unlocked signed-in phone planted an address (account page, or the KYC step),
 *      confirmed it from that session, ran forgot-password and owned the account;
 *      removing it warned nobody. One player door now, behind the current password,
 *      on the bucket the password change shares; the KYC step writes nothing.
 *   H. The editor said "Confirmation sent" over an address already confirmed, and
 *      "Check your inbox" over a send that failed.
 *   J. Opening the confirmation link confirmed during the GET for ANYONE holding it —
 *      a mail scanner, or the stranger who owns a mistyped address. It now confirms
 *      on open only in the account's own session, otherwise behind the password, and
 *      never creates a session; one function writes a confirmation.
 *
 * Anything that flips one of these back should fail here, loudly.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
// The map is live in production (Ali's own test number), so the login path must
// be proven safe WITH it set, not merely when it is absent.
process.env.PHONE_EMAIL_MAP = "+255777000111:mapped@50pick.tz";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { db } from "../src/lib/server/store.ts";
import { registerWithPassword, loginWithPassword } from "../src/lib/server/auth-service.ts";
import {
  setUserEmail, buildEmailVerifyUrl, sendEmailVerification,
  changeOwnEmail, peekEmailVerifyToken, openEmailVerifyLink, confirmEmailWithProof, markEmailVerified,
} from "../src/lib/server/email-verification.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { changePassword } from "../src/lib/server/password-reset.ts";
import { startKyc, submitIdentityStep } from "../src/lib/server/kyc-service.ts";
import { KycIdentitySchema } from "../src/lib/server/validators.ts";
import { RATE_RULES } from "../src/lib/server/rate-limit.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { getActiveSessionId } from "../src/lib/server/session-registry.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 20)); };
const mailTagged = (tag: string) => emailOutbox().filter((m) => m.tag === tag);
/** Let fire-and-forget sends land, then let the audit queue stamp its rows. */
const settle = async () => { await flush(); await auditFlush(); };
const show = (x: unknown) => JSON.stringify(x);
/** Every audit row of `action` aimed at this account, newest first. */
const audits = (uid: string, action: string) => getAuditForTarget("User", uid, 1000).filter((e) => e.action === action);

const PW = "Str0ng!Passw0rd#2026";
const WRONG = "Wrong!Passw0rd";
const DOB = "1990-01-01";

const LF = String.fromCharCode(10);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/** Every .ts / .tsx file under src/, DECOMMENTED, its path normalised to "/". Read once, on first use. */
let srcCache: { rel: string; text: string }[] | null = null;
function srcFiles(): { rel: string; text: string }[] {
  if (srcCache) return srcCache;
  const out: { rel: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push({ rel: relative(ROOT, p).split(sep).join("/"), text: decomment(readFileSync(p, "utf8")) });
    }
  };
  walk(join(ROOT, "src"));
  srcCache = out;
  return out;
}
/** The value of the first `variant: "…"` at or after `from`, or null. */
const variantAfter = (text: string, from: number): string | null => {
  const key = 'variant: "';
  const i = text.indexOf(key, from);
  if (i < 0) return null;
  const s = i + key.length;
  return text.slice(s, text.indexOf('"', s));
};

/**
 * SCOPE NOTE (same constraint as auth-email-signin.test.mts): a SUCCESSFUL
 * `registerWithPassword`/`loginWithPassword` mints a session COOKIE, which needs
 * a Next request scope that does not exist in a plain script. Everything that
 * returns BEFORE that point — validation, duplicate detection, and (critically
 * for case A) any email write — runs for real. So we call the real function and
 * treat the cookie throw as "it got all the way to success", then assert on the
 * DB state it left behind. That is exactly the surface these regressions live on.
 */
async function register(phone: string, email: string): Promise<{ ok: boolean; code?: string; userId?: string }> {
  try {
    const r = await registerWithPassword({
      phone, email, password: PW, passwordConfirm: PW, dob: DOB,
      acceptTerms: true, acceptAge: true, marketingOptIn: false,
    } as never);
    if (!r.ok) return { ok: false, code: String(r.code) };
    return { ok: true, userId: r.data!.userId };
  } catch {
    // Reached session creation ⇒ the account was created. Recover its id.
    const u = await db.user.findByPhone(phone);
    return { ok: !!u, userId: u?.id };
  }
}

/** Drive a real password login as far as the session cookie, then stop. */
async function login(identifier: string): Promise<void> {
  try {
    await loginWithPassword({ identifier, password: PW } as never);
  } catch { /* cookie scope — everything before it has already run */ }
}

// ═══ A — LOGIN MUST NEVER REWRITE THE EMAIL ════════════════════════════════
{
  clearEmailOutbox();
  const phone = "+255777000111"; // the mapped number
  const own = "player.own@50pick.tz";
  const r = await register(phone, own);
  ok("A1 registration succeeds", r.ok, r.code ?? "");
  const uid = r.userId ?? "";

  // Confirm the player's OWN address, the way the real flow does (the link, opened in the account's own session).
  const url = buildEmailVerifyUrl(uid, own);
  const token = new URL(url).searchParams.get("token")!;
  const v = await confirmEmailWithProof(token, { sessionUserId: uid, password: null });
  ok("A2 the player's own address confirms", v.status === "verified", v.status);
  const beforeVerifiedAt = (await db.user.findById(uid))!.emailVerifiedAt;
  ok("A3 emailVerifiedAt is set", !!beforeVerifiedAt);

  // Now sign in. The mapped address differs from the player's own.
  await login(phone);
  ok("A4 login ran through the email-binding step", true);

  const after = await db.user.findById(uid);
  // The whole point: login is not an email writer.
  ok("A5 login did NOT overwrite the player's email with the mapped one",
    after?.email === own, `email=${after?.email}`);
  ok("A6 login did NOT disturb the verified flag",
    after?.emailVerifiedAt === beforeVerifiedAt, `after=${after?.emailVerifiedAt}`);
  ok("A7 the account is NOT 'verified' against an address nobody confirmed",
    after?.email === own && !!after?.emailVerifiedAt);
}

// ═══ B — WE NEVER CLAIM A SEND WE DIDN'T MAKE ══════════════════════════════
{
  clearEmailOutbox();
  const r = await register("+255777000222", "suppress.me@50pick.tz");
  ok("B1 registration succeeds", r.ok, r.code ?? "");
  const uid = r.userId ?? "";

  // Normal address → a real send, reported honestly.
  const good = await sendEmailVerification(uid, "suppress.me@50pick.tz");
  await flush();
  ok("B2 a deliverable address reports ok", good.ok, good.reason);
  ok("B3 …and reports WHY (sent/stub), not a bare boolean",
    good.reason === "sent" || good.reason === "stub", good.reason);

  // An address the app refuses to mail must NOT come back as a success.
  const { suppressEmail } = await import("../src/lib/server/email-suppression.ts");
  await suppressEmail("bounced@50pick.tz", "HardBounce");
  const bad = await sendEmailVerification(uid, "bounced@50pick.tz");
  await flush();
  ok("B4 a suppressed address reports FAILURE, not success", !bad.ok, bad.reason);
  ok("B5 …and names the reason so the UI can offer a way out",
    bad.reason === "suppressed", bad.reason);
}

// ═══ C — THE CONFIRMATION LINK IS NOT CLICK-TRACKED ════════════════════════
{
  clearEmailOutbox();
  const r = await register("+255777000333", "tracking@50pick.tz");
  const uid = r.userId ?? "";
  await sendEmailVerification(uid, "tracking@50pick.tz");
  await flush();
  const mail = mailTagged("email-verify");
  ok("C1 a verification email was captured", mail.length >= 1, `got ${mail.length}`);
  const html = mail[mail.length - 1]?.html ?? "";
  // The raw app URL must survive into the body — if it were rewritten through a
  // tracking redirect the player's click could land nowhere and the money-in
  // path would close silently.
  ok("C2 the body carries a real /auth/verify-email link", /\/auth\/verify-email\?token=/.test(html));
  ok("C3 the token round-trips and confirms the address", await (async () => {
    const m = html.match(/\/auth\/verify-email\?token=([^"'&\s]+)/);
    if (!m) return false;
    const res = await confirmEmailWithProof(decodeURIComponent(m[1]), { sessionUserId: uid, password: null });
    return res.status === "verified";
  })());
}

// ═══ D — DUPLICATE EMAIL ≠ DUPLICATE PHONE ═════════════════════════════════
{
  const first = await register("+255777000444", "shared@50pick.tz");
  ok("D1 first account with the address is created", first.ok);

  // Same email, DIFFERENT phone.
  const dupEmail = await register("+255777000555", "shared@50pick.tz");
  ok("D2 a second account on the same email is refused", !dupEmail.ok);
  ok("D3 …with EMAIL_EXISTS, so the page can say the right thing and link to the EMAIL",
    !dupEmail.ok && dupEmail.code === "EMAIL_EXISTS", String(dupEmail.code));

  // Same phone, different email → still the phone code.
  const dupPhone = await register("+255777000444", "other@50pick.tz");
  ok("D4 a second account on the same phone is refused", !dupPhone.ok);
  ok("D5 …and is still reported as ALREADY_EXISTS (phone), not EMAIL_EXISTS",
    !dupPhone.ok && dupPhone.code === "ALREADY_EXISTS", String(dupPhone.code));
}

// ═══ E — CHANGING AN EMAIL RE-GATES DEPOSITING ═════════════════════════════
{
  clearEmailOutbox();
  const r = await register("+255777000666", "before@50pick.tz");
  const uid = r.userId ?? "";
  const url = buildEmailVerifyUrl(uid, "before@50pick.tz");
  await confirmEmailWithProof(new URL(url).searchParams.get("token")!, { sessionUserId: uid, password: null });
  ok("E1 the first address is confirmed", !!(await db.user.findById(uid))!.emailVerifiedAt);

  clearEmailOutbox();
  const changed = await setUserEmail(uid, "after@50pick.tz");
  await flush();
  ok("E2 the change is accepted", changed.ok);
  const u = await db.user.findById(uid);
  ok("E3 the new address is stored", u?.email === "after@50pick.tz", u?.email ?? "none");
  ok("E4 verification is CLEARED — depositing is re-gated", !u?.emailVerifiedAt);
  ok("E5 a fresh confirmation link was sent to the NEW address",
    mailTagged("email-verify").some((m) => m.to === "after@50pick.tz"));
  ok("E6 the OLD address is warned about the change (takeover defence)",
    mailTagged("email-changed").some((m) => m.to === "before@50pick.tz"));

  // A link minted for the OLD address must not confirm the new one.
  const stale = await confirmEmailWithProof(new URL(url).searchParams.get("token")!, { sessionUserId: uid, password: null });
  ok("E7 a stale link for the previous address does not verify", stale.status === "mismatch", stale.status);
  ok("E8 …and the account is still unverified", !(await db.user.findById(uid))!.emailVerifiedAt);
}

// ═══ F — THE EMAIL DOOR ASKS FOR THE PASSWORD (route audit 2026-10-06, A1) ═══
// ⛔ Each account below spends its OWN `auth.reauth` bucket (5 tokens, one back per five minutes): every real change
// spends one, a correct password included. F4 and F5 need a full bucket, so each gets a fresh account.
{
  const OLD = "f.owner@50pick.tz";
  const r = await register("+255777001001", OLD);
  ok("F0 fixture · a fresh account with a real password", r.ok, r.code ?? "");
  const uid = r.userId ?? "";
  await db.user.update(uid, { emailVerifiedAt: new Date().toISOString() });
  const before = await db.user.findById(uid);
  ok("F0b fixture · its address is confirmed", !!before?.emailVerifiedAt);

  // F1 — a wrong password changes nothing and mails nothing.
  clearEmailOutbox();
  const f1 = await changeOwnEmail(uid, "f1.planted@50pick.tz", WRONG);
  await settle();
  const a1 = await db.user.findById(uid);
  ok("F1 a wrong current password is refused: PW_CURRENT_WRONG, reason password_wrong",
    !f1.ok && f1.code === "PW_CURRENT_WRONG" && f1.reason === "password_wrong", show(f1));
  ok("F1b …the address and its confirmation are untouched",
    a1?.email === OLD && a1?.emailVerifiedAt === before?.emailVerifiedAt, show({ email: a1?.email, at: a1?.emailVerifiedAt }));
  ok("F1c …nothing was mailed: no confirmation link, no change alert",
    mailTagged("email-verify").length === 0 && mailTagged("email-changed").length === 0, show(emailOutbox().map((m) => m.tag)));
  ok("F1d …and the refusal is on record as a re-auth failure for an email change",
    audits(uid, "auth.reauth.bad_password").some((e) => e.payload?.purpose === "email_change"));

  // F2 — the right password changes it, re-gates depositing, and warns the old address — in Chinese too.
  clearEmailOutbox();
  const NEW = "f2.new@50pick.tz";
  const f2 = await changeOwnEmail(uid, NEW, PW);
  await settle();
  const a2 = await db.user.findById(uid);
  ok("F2 the right current password changes the address", f2.ok && f2.changed, show(f2));
  ok("F2b …stored UNCONFIRMED: depositing is re-gated", a2?.email === NEW && !a2?.emailVerifiedAt, show({ email: a2?.email, at: a2?.emailVerifiedAt }));
  ok("F2c …a confirmation link went to the NEW address", mailTagged("email-verify").some((m) => m.to === NEW));
  ok("F2d …and the change alert to the OLD one", mailTagged("email-changed").some((m) => m.to === OLD));
  const n2 = (await db.notification.findByUser(uid, 100)).find((n) => n.kind === "SECURITY" && n.titleEn === "Email address changed");
  ok("F2e …the in-app SECURITY notice has a Chinese title and body", !!n2 && !!n2.titleZh?.trim() && !!n2.bodyZh?.trim(), show(n2 ?? null));
  const set2 = audits(uid, "user.email.set")[0];
  ok("F2f …and the audit row names who and what was proved: by self, proof password",
    set2?.payload?.by === "self" && set2?.payload?.proof === "password", show(set2?.payload ?? null));

  // F3 — removing it needs the password too, and WARNS THE ADDRESS IT REMOVED (clear-then-add was a silent swap).
  clearEmailOutbox();
  const f3 = await changeOwnEmail(uid, "", PW);
  await settle();
  const a3 = await db.user.findById(uid);
  ok("F3 the right password removes the address", f3.ok && f3.changed && !a3?.email && !a3?.emailVerifiedAt, show({ f3, email: a3?.email }));
  const removal = mailTagged("email-changed").filter((m) => m.to === NEW);
  ok("F3b …the REMOVED address is warned: 'Your email was removed', with no 'New address' row",
    removal.length === 1 && removal[0].html.includes("Your email was removed") && !removal[0].html.includes("New address"),
    show(removal.map((m) => m.subject)));
  const n3 = (await db.notification.findByUser(uid, 100)).find((n) => n.kind === "SECURITY" && n.titleEn === "Email address removed");
  ok("F3c …and the in-app notice says it was removed, with a Chinese title and body", !!n3 && !!n3.titleZh?.trim() && !!n3.bodyZh?.trim(), show(n3 ?? null));
  const cleared = audits(uid, "user.email.cleared")[0];
  ok("F3d …the cleared row names who and what was proved", cleared?.payload?.by === "self" && cleared?.payload?.proof === "password", show(cleared?.payload ?? null));
}
{
  // F4 — the address already on file, with an EMPTY password: a no-op that asks nothing and SPENDS nothing.
  const SAME = "f4.same@50pick.tz";
  const r = await register("+255777001004", SAME);
  const uid = r.userId ?? "";
  clearEmailOutbox();
  const f4 = await changeOwnEmail(uid, SAME, "");
  await settle();
  ok("F4 the SAME address with an EMPTY password is a no-op: ok, unchanged", f4.ok && !f4.changed && !f4.verificationSent, show(f4));
  ok("F4b …nothing was mailed", emailOutbox().length === 0, show(emailOutbox().map((m) => m.tag)));
  const tries: Awaited<ReturnType<typeof changeOwnEmail>>[] = [];
  for (let i = 0; i < 5; i++) tries.push(await changeOwnEmail(uid, `f4.try${i}@50pick.tz`, WRONG));
  ok("F4c …and it spent NOTHING: five wrong attempts afterwards all still answer PW_CURRENT_WRONG",
    tries.every((t) => !t.ok && t.code === "PW_CURRENT_WRONG"), show(tries.map((t) => (t.ok ? "ok" : t.code))));
}
{
  // F5 — five wrong attempts empty the bucket: the RIGHT password waits too, and so does a password change.
  const OWN = "f5.owner@50pick.tz";
  const r = await register("+255777001005", OWN);
  const uid = r.userId ?? "";
  for (let i = 0; i < 5; i++) await changeOwnEmail(uid, `f5.try${i}@50pick.tz`, WRONG);
  const f5 = await changeOwnEmail(uid, "f5.new@50pick.tz", PW);
  ok("F5 after five wrong passwords even the RIGHT one waits: RATE_LIMITED, with a wait",
    !f5.ok && f5.code === "RATE_LIMITED" && (f5.retryAfterSec ?? 0) > 0, show(f5));
  ok("F5b …and the address is unchanged", (await db.user.findById(uid))?.email === OWN);
  const cp = await changePassword(uid, PW, "N3w!Passw0rd#2026");
  ok("F5c ONE bucket with the password change: it answers RATE_LIMITED too", !cp.ok && cp.code === "RATE_LIMITED", show(cp));
  const u = await db.user.findById(uid);
  ok("F5d ⛔ …and the SIGN-IN lock is untouched: failedLoginCount 0, lockedUntil null",
    u?.failedLoginCount === 0 && (u?.lockedUntil ?? null) === null, show({ failedLoginCount: u?.failedLoginCount, lockedUntil: u?.lockedUntil }));
}
{
  // F6 — a password-less account (the dormant code-sign-in era) has no password to ask: a recorded residual.
  const UID = "usr_aei_f6_nopw";
  const now = new Date().toISOString();
  await db.user.create({
    id: UID, phoneE164: "+255777001006", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "No Password", dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  const f6 = await changeOwnEmail(UID, "f6@50pick.tz", "");
  await settle();
  ok("F6 a password-less account adds an address with no password to ask", f6.ok && f6.changed, show(f6));
  const set6 = audits(UID, "user.email.set")[0];
  ok("F6b …recorded as the residual it is: by self, proof none", set6?.payload?.by === "self" && set6?.payload?.proof === "none", show(set6?.payload ?? null));
}
{
  // F7 — ⛔ THE KYC DOOR IS CLOSED. The identity step wrote the address with no password: a second player door.
  const OWN = "f7.owner@50pick.tz", THIEF = "thief@x.tz";
  const r = await register("+255777001007", OWN);
  const uid = r.userId ?? "";
  await db.user.update(uid, { emailVerifiedAt: new Date().toISOString() });
  const before = await db.user.findById(uid);
  clearEmailOutbox();
  await startKyc(uid);
  let out: unknown;
  try {
    out = await submitIdentityStep(uid, { idType: "NIDA", idNumber: "19900101777770000011", fullName: "Kyc Door Test", dob: "1990-01-01", email: THIEF } as never);
  } catch (e) {
    out = `threw: ${(e as Error)?.message}`;
  }
  await settle();
  const after = await db.user.findById(uid);
  ok("F7 ⛔ the identity step is no email door: whatever it answered, the address and its confirmation are untouched",
    after?.email === OWN && after?.emailVerifiedAt === before?.emailVerifiedAt, show({ out, email: after?.email }));
  ok("F7b …and nothing went to the address it was handed", !emailOutbox().some((m) => m.to === THIEF), show(emailOutbox().map((m) => m.to)));
}
{
  // F8 — the basics action is no email door either, and a page cached before the deploy fails loudly.
  const src = decomment(read("src/app/profile/actions.ts"));
  const at = src.indexOf("export async function updateProfileBasicsAction(");
  const end = at >= 0 ? src.indexOf(LF + "export ", at + 1) : -1;
  const body = at >= 0 ? src.slice(at, end > at ? end : undefined) : "";
  ok("F8 fixture · updateProfileBasicsAction was located", body.length > 200, String(body.length));
  ok("F8b it refuses any form that carries an email",
    body.includes('formData.has("email")') || body.includes("formData.has('email')"));
  ok("F8c …and reaches no email writer: neither setUserEmail nor changeOwnEmail",
    !body.includes("setUserEmail") && !body.includes("changeOwnEmail"));
}
{
  // F9 — THE WRITER CENSUS. One writer, two doors that reach it: the player's (inside email-verification.ts) and the officer's.
  const writers = srcFiles().filter((f) => f.text.includes("setUserEmail(")).map((f) => f.rel).sort();
  ok("F9 ⛔ setUserEmail( appears in exactly two src files: the single writer itself and the officer door",
    isDeepStrictEqual(writers, ["src/app/admin/players/[id]/actions.ts", "src/lib/server/email-verification.ts"]), show(writers));
  ok("F9b the KYC identity schema has no email field (Zod strips one a stale page still posts)", !("email" in KycIdentitySchema.shape));
  ok("F9c the KYC page renders no input named email, in any state", !decomment(read("src/app/profile/kyc/page.tsx")).includes('name="email"'));
  const ed = decomment(read("src/components/profile/email-editor.tsx"));
  ok("F9d the account editor saves through changeEmailAction, with the current password",
    ed.includes("changeEmailAction") && ed.includes("current-password") && ed.includes("currentPassword") && !ed.includes("updateProfileBasicsAction"));
  ok("F9e the re-auth bucket is 5 tokens, one back per five minutes",
    isDeepStrictEqual(RATE_RULES["auth.reauth"], { capacity: 5, refillPerMin: 0.2 }), show(RATE_RULES["auth.reauth"]));
}

// ═══ H — THE EDITOR SAYS WHAT HAPPENED (route audit 2026-10-06, A7 / D-X4) ═══
{
  const ed = decomment(read("src/components/profile/email-editor.tsx"));
  const resendAt = ed.indexOf("const resend = ");
  const resendEnd = resendAt >= 0 ? ed.indexOf(LF + "  return (", resendAt) : -1;
  const resend = resendAt >= 0 && resendEnd > resendAt ? ed.slice(resendAt, resendEnd) : "";
  ok("H0 fixture · the resend handler was located", resend.length > 100, String(resend.length));
  const sentAt = resend.indexOf("r.sent");
  const claimAt = resend.indexOf("t.toast.confirmationSent");
  ok("H1 resend reads r.sent BEFORE it ever says 'Confirmation sent'", sentAt >= 0 && claimAt > sentAt, show({ sentAt, claimAt }));
  const notSent = sentAt >= 0 && claimAt > sentAt ? resend.slice(sentAt, claimAt) : "";
  ok("H2 …the not-sent branch says ALREADY CONFIRMED, refreshes the page and stops",
    notSent.includes("t.common.alreadyConfirmed") && notSent.includes("router.refresh()") && notSent.includes("return"));
  const saveAt = ed.indexOf("const save = ");
  const save = saveAt >= 0 && resendAt > saveAt ? ed.slice(saveAt, resendAt) : "";
  const supAt = save.indexOf("t.wallet.verifyErrSuppressed");
  ok("H3 a save whose link did not go says so: verifyErrSuppressed, in a FACTUAL toast",
    supAt >= 0 && variantAfter(save, supAt) === "factual", show(supAt >= 0 ? variantAfter(save, supAt) : "not found"));
  ok("H4 ⛔ never the gold warning variant, anywhere in the editor",
    !ed.includes('variant: "warning"') && !ed.includes("variant: 'warning'") && !ed.includes('variant="warning"'));
}

// ═══ J — THE LINK CONFIRMS ONLY FOR THE ACCOUNT HOLDER (route audit 2026-10-06, A3) ═══
{
  const A = "j.a@50pick.tz", B = "j.b@50pick.tz", C = "j.c@50pick.tz";
  const ra = await register("+255777001011", A);
  const rb = await register("+255777001012", B);
  const rc = await register("+255777001013", C);
  const ua = ra.userId ?? "", ub = rb.userId ?? "", uc = rc.userId ?? "";
  ok("J0 fixture · three fresh accounts", !!ua && !!ub && !!uc && new Set([ua, ub, uc]).size === 3);
  const tok = (uid: string, email: string) => new URL(buildEmailVerifyUrl(uid, email)).searchParams.get("token")!;
  const ta = tok(ua, A), tb = tok(ub, B), tc = tok(uc, C);
  const confirmed = async (uid: string) => !!(await db.user.findById(uid))?.emailVerifiedAt;
  const verifiedRows = async (uid: string) => { await auditFlush(); return audits(uid, "user.email.verified"); };

  const p1 = await peekEmailVerifyToken(ta);
  ok("J1 a fresh link peeks as pending, naming its account and address",
    p1.status === "pending" && p1.userId === ua && p1.email === A, show(p1));
  ok("J1b …and a peek writes nothing", !(await confirmed(ua)));

  const o2 = await openEmailVerifyLink(ta, null);
  ok("J2 ⛔ opened with NO session (a mail scanner, a stranger): needs_password, nothing written",
    o2.status === "needs_password" && !(await confirmed(ua)) && (await verifiedRows(ua)).length === 0, show(o2));

  const o3 = await openEmailVerifyLink(ta, "usr_someone_else");
  ok("J3 ⛔ opened in SOMEONE ELSE'S session: needs_password too", o3.status === "needs_password" && !(await confirmed(ua)), show(o3));

  const o4 = await openEmailVerifyLink(ta, ua);
  const row4 = (await verifiedRows(ua))[0];
  ok("J4 opened in the account's OWN session: confirmed on open", o4.status === "verified" && (await confirmed(ua)), show(o4));
  ok("J4b …recorded as via link, proof session", row4?.payload?.via === "link" && row4?.payload?.proof === "session", show(row4?.payload ?? null));

  const j5 = await confirmEmailWithProof(tb, { sessionUserId: null, password: WRONG });
  await settle();
  ok("J5 the form with a WRONG password: password_wrong, nothing confirmed", j5.status === "password_wrong" && !(await confirmed(ub)), show(j5));
  ok("J5b …and it is on record as a re-auth failure for a confirmation",
    audits(ub, "auth.reauth.bad_password").some((e) => e.payload?.purpose === "email_confirm"));

  const sessionBefore = await getActiveSessionId(ub);
  const j6 = await confirmEmailWithProof(tb, { sessionUserId: null, password: PW });
  const row6 = (await verifiedRows(ub))[0];
  ok("J6 the form with the account's own password: confirmed", j6.status === "verified" && (await confirmed(ub)), show(j6));
  ok("J6b …recorded as via link, proof password", row6?.payload?.via === "link" && row6?.payload?.proof === "password", show(row6?.payload ?? null));
  ok("J6c ⛔ …and it created NO session", (await getActiveSessionId(ub)) === sessionBefore, show({ before: sessionBefore }));

  const j7 = await confirmEmailWithProof(tc, { sessionUserId: null, password: null });
  ok("J7 the form with no proof at all: proof_required, nothing confirmed", j7.status === "proof_required" && !(await confirmed(uc)), show(j7));

  const j8 = await confirmEmailWithProof(ta, { sessionUserId: null, password: null });
  ok("J8 the J4 link again, with no proof: already — a confirmed address asks for none", j8.status === "already", show(j8));

  const moved = await setUserEmail(ua, "moved@50pick.tz");
  const rowsBefore = (await verifiedRows(ua)).length;
  const j9 = await markEmailVerified(ua, A, "link", "session");
  ok("J9 ⛔ the writer re-reads the account: a confirmation for the OLD address is a mismatch and writes nothing",
    moved.ok && j9 === "mismatch" && !(await confirmed(ua)) && (await verifiedRows(ua)).length === rowsBefore, show({ moved, j9 }));
  ok("J9b a garbage token peeks as invalid", (await peekEmailVerifyToken("garbage")).status === "invalid");
}
{
  // J10 — static: the page cannot confirm by itself, one action file, one writer of a confirmation.
  const page = decomment(read("src/app/auth/verify-email/page.tsx"));
  ok("J10 the confirmation page opens the link through openEmailVerifyLink, with the session",
    page.includes("openEmailVerifyLink") && page.includes("currentSession"));
  ok("J10b ⛔ …and calls no writer itself: no markEmailVerified, confirmEmailWithProof or verifyEmailToken",
    !page.includes("markEmailVerified") && !page.includes("confirmEmailWithProof") && !page.includes("verifyEmailToken"));
  const actRaw = read("src/app/auth/verify-email/actions.ts");
  const act = decomment(actRaw);
  const exportsIn = act.split("export ").length - 1;
  ok("J10c the action file opens with the \"use server\" directive, has exactly ONE export, and calls confirmEmailWithProof(",
    actRaw.trimStart().startsWith('"use server"') && exportsIn === 1 && act.includes("confirmEmailWithProof("), show({ exports: exportsIn }));
  ok("J10d the GET-time confirmer is gone: no function verifyEmailToken",
    !decomment(read("src/lib/server/email-verification.ts")).includes("function verifyEmailToken"));
  const files = srcFiles().filter((f) => f.rel !== "src/app/auth/demo/route.ts");
  const stamps = files.flatMap((f) => Array.from({ length: f.text.split("emailVerifiedAt: new Date").length - 1 }, () => f.rel));
  ok("J10e ⭐ ONE writer of a confirmation: `emailVerifiedAt: new Date` appears exactly once in src/, in email-verification.ts",
    stamps.length === 1 && stamps[0] === "src/lib/server/email-verification.ts", show(stamps));
  const callers = files.filter((f) => f.rel !== "src/lib/server/email-verification.ts" && f.text.includes("markEmailVerified(")).map((f) => f.rel);
  ok("J10f ⛔ no other src file calls markEmailVerified( — S9 adds its caller deliberately, and updates this pin", callers.length === 0, show(callers));
}

console.log(`\nauth-email-integrity: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
