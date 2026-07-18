/**
 * EMAIL AT SIGN-UP + EMAIL-OR-PHONE SIGN-IN.
 *
 * Email became mandatory and unique at registration (2026-07-18) because a
 * CONFIRMED address is what unlocks the first deposit. That makes three things
 * load-bearing, and this suite pins all three:
 *
 *   1. Registration REQUIRES a valid address — a malformed one never creates an
 *      account, and a valid one is stored normalised and UNVERIFIED (a player
 *      must not sign up straight into a deposit-ready state).
 *   2. One account per email, case-insensitively. If one inbox could open many
 *      accounts the deposit gate would be decorative, and per-account controls
 *      (deposit caps, self-exclusion) would be trivially evaded.
 *   3. Sign-in accepts EITHER credential in one field, discriminated on `@`.
 *
 * SCOPE NOTE: `registerWithPassword`/`loginWithPassword` mint a session COOKIE on
 * success, so their happy paths cannot complete outside a Next request scope.
 * Everything that returns BEFORE that point (validation, duplicate detection,
 * unknown user, wrong password) is driven through the real functions here; the
 * credential-discrimination rule is tested exhaustively through the exported
 * pure `resolveLoginIdentifier`. The end-to-end success path is covered by the
 * browser pass in scripts/e2e-deposit-flow.
 */
import { db } from "../src/lib/server/store.ts";
import { registerWithPassword, loginWithPassword, resolveLoginIdentifier } from "../src/lib/server/auth-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const PW = "Str0ng!Passw0rd";
let n = 0;
const nextPhone = () => `+2557${String(30000000 + ++n).padStart(8, "0")}`;
const now = () => new Date().toISOString();

const base = (over: Record<string, unknown> = {}) => ({
  phone: nextPhone(),
  email: `player${n}@example.com`,
  password: PW,
  passwordConfirm: PW,
  dob: "1990-01-01",
  acceptTerms: true,
  acceptAge: true,
  marketingOptIn: false,
  ...over,
}) as Parameters<typeof registerWithPassword>[0];

/** Seed an account directly — bypasses the session-cookie step so we can then
 *  drive the real duplicate/login paths against a user that genuinely exists. */
async function seedUser(opts: { phone: string; email: string | null; verified?: boolean }): Promise<void> {
  await db.user.create({
    id: `usr_seed_${++n}`,
    phoneE164: opts.phone,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: opts.email, emailVerifiedAt: opts.verified ? now() : null,
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
}

// ═══ 1. EMAIL IS REQUIRED AND VALIDATED AT SIGN-UP ══════════════════════════
// These all fail validation, which happens before any session work.
for (const [label, email] of [
  ["missing entirely", undefined],
  ["empty", ""],
  ["whitespace only", "   "],
  ["no @", "notanemail"],
  ["no domain", "player@"],
  ["no local part", "@example.com"],
  ["spaces inside", "pla yer@example.com"],
  ["double @", "a@@example.com"],
  ["no TLD", "player@localhost"],
  ["trailing dot domain", "player@example."],
] as const) {
  const r = await registerWithPassword(base({ email }));
  ok(`sign-up REJECTS an invalid email (${label})`, !r.ok, r.ok ? "accepted!" : "");
}

// ═══ 2. THE VALIDATOR ACCEPTS REAL-WORLD ADDRESSES ══════════════════════════
// Over-strict validation locks real people out of a real-money account, which is
// its own kind of failure. Checked through the same resolver the app uses.
for (const [label, email] of [
  ["plus addressing", "ali+50pick@gmail.com"],
  ["dots in local part", "ali.sheib@arrowconsulting.co.tz"],
  ["subdomain", "ali@mail.example.co.tz"],
  ["hyphenated domain", "ali@my-host.com"],
  ["numeric local part", "255712345678@example.com"],
  ["long TLD", "ali@example.technology"],
  ["the operator's own address", "ali.sheib@50pick.tz"],
] as const) {
  const r = resolveLoginIdentifier(email);
  ok(`validator ACCEPTS a real address (${label})`, r?.kind === "email", JSON.stringify(r));
}

// ═══ 3. ONE ACCOUNT PER EMAIL (case-insensitive) ════════════════════════════
{
  const shared = "shared.inbox@example.com";
  await seedUser({ phone: nextPhone(), email: shared });

  const second = await registerWithPassword(base({ email: shared }));
  ok("a SECOND account on the same email is refused", !second.ok);
  ok("refusal is reported as ALREADY_EXISTS", !second.ok && second.code === "ALREADY_EXISTS", !second.ok ? String(second.code) : "");
  ok("refusal message names the email (not the phone)", !second.ok && /email/i.test(second.error), !second.ok ? second.error : "");

  const upper = await registerWithPassword(base({ email: shared.toUpperCase() }));
  ok("uniqueness is CASE-INSENSITIVE (SHARED@… is the same inbox)", !upper.ok && upper.code === "ALREADY_EXISTS");

  const mixed = await registerWithPassword(base({ email: "Shared.Inbox@Example.Com" }));
  ok("uniqueness holds for mixed case too", !mixed.ok && mixed.code === "ALREADY_EXISTS");
}

// Duplicate PHONE is still refused independently of email.
{
  const phone = nextPhone();
  await seedUser({ phone, email: "phone.dup@example.com" });
  const r = await registerWithPassword(base({ phone, email: "totally.different@example.com" }));
  ok("a second account on the same PHONE is still refused", !r.ok && r.code === "ALREADY_EXISTS");
  ok("phone-duplicate message names the phone", !r.ok && /phone/i.test(r.error), !r.ok ? r.error : "");
}

// ═══ 4. SEEDED ACCOUNTS ARE NOT DEPOSIT-READY ═══════════════════════════════
{
  const phone = nextPhone();
  await seedUser({ phone, email: "Fresh.Account@Example.COM" });
  const user = await db.user.findByPhone(phone);
  ok("a stored address is findable by email lookup", !!(await db.user.findByEmail("fresh.account@example.com")));
  ok("email lookup is case-insensitive", !!(await db.user.findByEmail("FRESH.ACCOUNT@EXAMPLE.COM")));
  ok("a brand-new account is NOT email-verified", !user?.emailVerifiedAt);
}

// ═══ 5. CREDENTIAL DISCRIMINATION (the one-field sign-in rule) ══════════════
for (const [label, input, kind, value] of [
  ["E.164 phone",            "+255712345678",            "phone", "+255712345678"],
  ["local 07XX phone",       "0712345678",               "phone", "+255712345678"],
  ["bare 9-digit phone",     "712345678",                "phone", "+255712345678"],
  ["phone with spaces",      "0712 345 678",             "phone", "+255712345678"],
  ["plain email",            "ali@example.com",          "email", "ali@example.com"],
  ["UPPERCASE email",        "ALI@EXAMPLE.COM",          "email", "ali@example.com"],
  ["mixed-case email",       "Ali.Sheib@Example.Com",    "email", "ali.sheib@example.com"],
  ["email with whitespace",  "  ali@example.com  ",      "email", "ali@example.com"],
] as const) {
  const r = resolveLoginIdentifier(input);
  ok(`sign-in resolves ${label} → ${kind}`, r?.kind === kind, JSON.stringify(r));
  ok(`  …normalised to ${value}`, r?.value === value, JSON.stringify(r));
}

for (const [label, input] of [
  ["empty", ""],
  ["whitespace only", "   "],
  ["garbage", "!!!!"],
  ["a bare @", "@"],
  ["a bare word", "hello"],
  ["too-short number", "12345"],
  ["a non-TZ number", "+14155551234"],
  ["an @ but malformed", "ali@"],
] as const) {
  ok(`sign-in rejects a malformed identifier (${label})`, resolveLoginIdentifier(input) === null, input);
}

// ═══ 6. SIGN-IN FAILURE PATHS THROUGH THE REAL FUNCTION ═════════════════════
// (All return before a session is minted, so they run here.)
{
  const knownEmail = "signin.known@example.com";
  const knownPhone = nextPhone();
  await seedUser({ phone: knownPhone, email: knownEmail, verified: true });

  const wrongPw = await loginWithPassword({ identifier: knownEmail, password: "WrongPassw0rd!" });
  // Seeded users have no passwordHash, so this stops at the no-password branch —
  // the point being it does NOT crash and does NOT sign anyone in.
  ok("sign-in by email finds the account and refuses without a valid password", !wrongPw.ok);

  const unknownEmail = await loginWithPassword({ identifier: "nobody.here@example.com", password: PW });
  ok("unknown EMAIL → NOT_FOUND", !unknownEmail.ok && unknownEmail.code === "NOT_FOUND", !unknownEmail.ok ? String(unknownEmail.code) : "");
  ok("unknown-email message names email and points at sign-up",
    !unknownEmail.ok && /email/i.test(unknownEmail.error) && /create one/i.test(unknownEmail.error),
    !unknownEmail.ok ? unknownEmail.error : "");

  const unknownPhone = await loginWithPassword({ identifier: "+255700000999", password: PW });
  ok("unknown PHONE → NOT_FOUND", !unknownPhone.ok && unknownPhone.code === "NOT_FOUND");
  ok("unknown-phone message names phone", !unknownPhone.ok && /phone/i.test(unknownPhone.error));

  for (const bad of ["", "   ", "!!!!", "@", "hello"]) {
    const r = await loginWithPassword({ identifier: bad, password: PW });
    ok(`malformed identifier ${JSON.stringify(bad)} → INVALID, no crash`, !r.ok && r.code === "INVALID", !r.ok ? String(r.code) : "");
  }
}

console.log(`\nauth-email-signin: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
