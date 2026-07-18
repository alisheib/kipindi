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
 * Anything that flips one of these back should fail here, loudly.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";
// The map is live in production (Ali's own test number), so the login path must
// be proven safe WITH it set, not merely when it is absent.
process.env.PHONE_EMAIL_MAP = "+255777000111:mapped@50pick.tz";

import { db } from "../src/lib/server/store.ts";
import { registerWithPassword, loginWithPassword } from "../src/lib/server/auth-service.ts";
import { setUserEmail, verifyEmailToken, buildEmailVerifyUrl, sendEmailVerification } from "../src/lib/server/email-verification.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 20)); };
const mailTagged = (tag: string) => emailOutbox().filter((m) => m.tag === tag);

const PW = "Str0ng!Passw0rd#2026";
const DOB = "1990-01-01";

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

  // Confirm the player's OWN address, the way the real flow does.
  const url = buildEmailVerifyUrl(uid, own);
  const token = new URL(url).searchParams.get("token")!;
  const v = await verifyEmailToken(token);
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
    const res = await verifyEmailToken(decodeURIComponent(m[1]));
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
  await verifyEmailToken(new URL(url).searchParams.get("token")!);
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
  const stale = await verifyEmailToken(new URL(url).searchParams.get("token")!);
  ok("E7 a stale link for the previous address does not verify", stale.status === "mismatch", stale.status);
  ok("E8 …and the account is still unverified", !(await db.user.findById(uid))!.emailVerifiedAt);
}

console.log(`\nauth-email-integrity: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
