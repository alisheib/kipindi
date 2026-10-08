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
 *
 * §7 (2026-10-06): a REFUSED sign-up returns to the form it came from — the refusal's
 * shape executed, the one field it marks, the no-reset submit wiring, the countdown,
 * the localized reasons and the hidden ref/invite/next fields.
 */
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { db } from "../src/lib/server/store.ts";
import { registerWithPassword, loginWithPassword, resolveLoginIdentifier } from "../src/lib/server/auth-service.ts";
import { hashPassword } from "../src/lib/server/crypto.ts";
import { registerRefusalOf, refusalField, REGISTER_INVALID_REASONS } from "../src/app/auth/register/refusal.ts";
import { decomment } from "./lib/decomment.mts";

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

/** Seed an account that has a REAL password, plus a fixed old `lastLoginAt` and
 *  `createdAt` so "which account did sign-in choose?" is decidable by comparison
 *  rather than by a millisecond race. `order` fixes creation order, which is what
 *  an unordered `findFirst` resolves by. */
async function seedUserWithPassword(opts: {
  phone: string; email: string; password: string; order: number; role?: string;
}): Promise<string> {
  const id = `usr_dup_${++n}`;
  const salt = `salt${String(opts.order).padStart(28, "0")}`;
  await db.user.create({
    id,
    phoneE164: opts.phone,
    passwordHash: await hashPassword(opts.password, salt),
    passwordSalt: salt,
    failedLoginCount: 0, lockedUntil: null,
    role: opts.role ?? "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: opts.email, emailVerifiedAt: now(),
    createdAt: `2020-01-0${opts.order}T00:00:00.000Z`,
    updatedAt: now(),
    lastLoginAt: NEVER_SIGNED_IN,
    closedAt: null,
  } as never);
  return id;
}

/** A `lastLoginAt` far enough in the past that any real sign-in moves it. */
const NEVER_SIGNED_IN = "2020-01-01T00:00:00.000Z";

/**
 * Drive the real sign-in and report only whether the PASSWORD was accepted.
 *
 * A successful sign-in mints a session cookie, which cannot happen outside a Next
 * request scope — so acceptance surfaces as a throw, not as `ok:true`. We do NOT
 * treat "it threw" as proof on its own (any unrelated error would then read as a
 * pass); the assertions below pin the outcome on `lastLoginAt`, which the service
 * writes to the CHOSEN account immediately before session creation.
 */
async function attempt(identifier: string, password: string): Promise<{ rejectedAs: string | null }> {
  try {
    const r = await loginWithPassword({ identifier, password });
    return { rejectedAs: r.ok ? null : r.error };
  } catch {
    return { rejectedAs: null };
  }
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
  // EMAIL_EXISTS, not the generic ALREADY_EXISTS (changed 2026-07-18). The
  // register page turned the shared code into "that PHONE is already
  // registered" and linked to sign-in with the player's brand-new phone — an
  // account that does not exist — so a duplicate EMAIL sent them round a loop
  // that never named the real cause. The two conditions now carry two codes.
  ok("refusal is reported as EMAIL_EXISTS (distinct from a duplicate phone)", !second.ok && second.code === "EMAIL_EXISTS", !second.ok ? String(second.code) : "");
  ok("refusal message names the email (not the phone)", !second.ok && /email/i.test(second.error), !second.ok ? second.error : "");

  const upper = await registerWithPassword(base({ email: shared.toUpperCase() }));
  ok("uniqueness is CASE-INSENSITIVE (SHARED@… is the same inbox)", !upper.ok && upper.code === "EMAIL_EXISTS");

  const mixed = await registerWithPassword(base({ email: "Shared.Inbox@Example.Com" }));
  ok("uniqueness holds for mixed case too", !mixed.ok && mixed.code === "EMAIL_EXISTS");
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

  // ── REVERSED 2026-07-31 — these three asserted the OPPOSITE until today ────
  // They pinned sign-in to answer NOT_FOUND ("No account with that phone. Create
  // one to get started.") for an unknown identifier, while a real account with a
  // wrong password answered "Wrong phone or password." That difference is an
  // enumeration oracle: one unauthenticated request per number revealed whether
  // that Tanzanian mobile had a gambling account. Found by probing the live site.
  // MODULE-CERTIFICATION-PROGRAM §A exits the auth domain on "enumeration-neutral
  // *proven by timing distribution*", and forgot-password had always been careful
  // about exactly this ("always show sent") — sign-in was the outlier.
  //
  // The sign-up path is NOT lost: /auth/login renders a permanent "No account?
  // Create account" link under the form (page.tsx:212) regardless of any error,
  // so a player who mistypes their number keeps the same one-tap recovery.
  // Full lock: scripts/login-enumeration.test.mts.
  const unknownEmail = await loginWithPassword({ identifier: "nobody.here@example.com", password: PW });
  ok("unknown EMAIL is refused without revealing that it is unknown",
    !unknownEmail.ok && unknownEmail.code !== "NOT_FOUND", !unknownEmail.ok ? String(unknownEmail.code) : "");
  ok("unknown-email message does not point at sign-up",
    !unknownEmail.ok && !/create one/i.test(unknownEmail.error),
    !unknownEmail.ok ? unknownEmail.error : "");

  const unknownPhone = await loginWithPassword({ identifier: "+255700000999", password: PW });
  ok("unknown PHONE is refused without revealing that it is unknown",
    !unknownPhone.ok && unknownPhone.code !== "NOT_FOUND");
  ok("unknown-phone message is the generic wrong-credentials copy",
    !unknownPhone.ok && /wrong phone or password/i.test(unknownPhone.error), !unknownPhone.ok ? unknownPhone.error : "");

  for (const bad of ["", "   ", "!!!!", "@", "hello"]) {
    const r = await loginWithPassword({ identifier: bad, password: PW });
    ok(`malformed identifier ${JSON.stringify(bad)} → INVALID, no crash`, !r.ok && r.code === "INVALID", !r.ok ? String(r.code) : "");
  }
}

// ═══ 6. A DUPLICATED EMAIL MUST NOT SWALLOW A CORRECT PASSWORD ══════════════
// 🔴 THE OWNER COULD NOT SIGN IN, AND THIS IS WHY (production, 2026-08-04).
//
// `email` has NO unique index on `User` (only `phoneE164` does), and §3's
// one-account-per-email rule is enforced in app code that post-dates the rows.
// Production therefore holds FOUR accounts on `alisheib07@gmail.com`. Sign-in
// resolved the address with a bare `findFirst` — no `orderBy`, no ambiguity
// check — so it returned whichever row Postgres handed back first (the OLDEST,
// a `PENDING_KYC` PLAYER) and checked the owner's ADMIN password against THAT
// account's hash. Correct password, wrong row, "Wrong email or password".
//
// Two harms, and the second is the one that bites strangers:
//   1. the real account is unreachable by email, no matter how right the password;
//   2. every attempt increments `failedLoginCount` on an account the person is
//      not even trying to reach — the owner had already driven an innocent row
//      to 3 of the 5 that trigger a 30-minute lockout.
//
// The property pinned here is NOT "some account signs in" — it is "the account
// whose password actually matches is the one that signs in, and no other row is
// penalised". Ordering the lookup alone would NOT satisfy this: it would just
// pick a different arbitrary row.
{
  const shared = "duplicated.inbox@example.com";
  const firstPhone = nextPhone();   // created first — what an unordered findFirst returns
  const secondPhone = nextPhone();  // created second — the one that owns the password
  const FIRST_PW = "FirstAccount!1";
  const SECOND_PW = "SecondAccount!2";

  await seedUserWithPassword({ phone: firstPhone, email: shared, password: FIRST_PW, order: 1 });
  await seedUserWithPassword({ phone: secondPhone, email: shared, password: SECOND_PW, order: 2, role: "ADMIN" });

  ok("setup: both accounts really do share one address",
    (await db.user.findByPhone(firstPhone))?.email === (await db.user.findByPhone(secondPhone))?.email);

  // ── The defect itself: the SECOND account's own password must sign IT in.
  const r = await attempt(shared, SECOND_PW);
  ok("duplicate email: the correct password is NOT rejected as wrong",
    r.rejectedAs === null, r.rejectedAs ?? "");

  const second = await db.user.findByPhone(secondPhone);
  const first = await db.user.findByPhone(firstPhone);
  ok("duplicate email: the account whose password MATCHED is the one signed in",
    second?.lastLoginAt !== NEVER_SIGNED_IN,
    `lastLoginAt still ${second?.lastLoginAt}`);
  ok("duplicate email: the OTHER account was not signed in",
    first?.lastLoginAt === NEVER_SIGNED_IN,
    `other account's lastLoginAt moved to ${first?.lastLoginAt}`);
  ok("duplicate email: the OTHER account's lockout counter is untouched",
    (first?.failedLoginCount ?? 0) === 0,
    `failedLoginCount=${first?.failedLoginCount}`);

  // ── And it must work in the other direction too, so the fix cannot be
  // "always prefer the ADMIN" or "always prefer the newest".
  const r2 = await attempt(shared, FIRST_PW);
  ok("duplicate email: the FIRST account's own password signs IT in",
    r2.rejectedAs === null, r2.rejectedAs ?? "");
  ok("duplicate email: the first account is the one that moved",
    (await db.user.findByPhone(firstPhone))?.lastLoginAt !== NEVER_SIGNED_IN);

  // ── A wrong password must still be refused, with the SAME neutral copy, and
  // must not lock anybody out. Without this the "fix" could be to accept anyone.
  const bad = await attempt(shared, "NotAnyone'sPassword!9");
  ok("duplicate email: a wrong password is still refused",
    bad.rejectedAs !== null && /wrong email or password/i.test(bad.rejectedAs ?? ""),
    bad.rejectedAs ?? "accepted!");
  ok("duplicate email: a wrong password penalises NEITHER account",
    ((await db.user.findByPhone(firstPhone))?.failedLoginCount ?? 0) === 0 &&
    ((await db.user.findByPhone(secondPhone))?.failedLoginCount ?? 0) === 0);
}

// ═══ 6b. THE SINGLE-ACCOUNT PATH IS UNCHANGED ═══════════════════════════════
// The fix must be a no-op for the ordinary case — including the wrong-password
// lockout accounting, which is a real control and not incidental behaviour.
{
  const solo = "solo.inbox@example.com";
  const phone = nextPhone();
  await seedUserWithPassword({ phone, email: solo, password: "SoloAccount!3", order: 5 });

  const bad = await attempt(solo, "wrong-password-here");
  ok("single account: a wrong password is refused",
    bad.rejectedAs !== null && /wrong email or password/i.test(bad.rejectedAs ?? ""), bad.rejectedAs ?? "");
  ok("single account: a wrong password STILL increments the lockout counter",
    ((await db.user.findByPhone(phone))?.failedLoginCount ?? 0) === 1,
    `failedLoginCount=${(await db.user.findByPhone(phone))?.failedLoginCount}`);

  const good = await attempt(solo, "SoloAccount!3");
  ok("single account: the correct password signs in", good.rejectedAs === null, good.rejectedAs ?? "");
  ok("single account: signing in clears the lockout counter",
    ((await db.user.findByPhone(phone))?.failedLoginCount ?? 0) === 0);
}

// ═══ 7. A REFUSED SIGN-UP RETURNS TO THE FORM IT CAME FROM (route audit C1/C2/C3/C-X1, 2026-10-06) ═══
// 🔴 Every refusal was an action redirect back to /auth/register?error=…, and Next remounts the page after an action
// redirect: the date of birth, both passwords and all three ticks came back empty (the SMS-offers tick silently), while
// the phone and the email rode in the URL. The action now RETURNS the refusal (refusal.ts) to the still-mounted form
// (register-form.tsx, useActionState). (The work package numbered these 4.1–4.11; this file already had a §4.)
{
  const read = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
  const ACTIONS = read("src/app/auth/register/actions.ts");
  const FORM = read("src/app/auth/register/register-form.tsx");
  const PAGE = read("src/app/auth/register/page.tsx");
  /** A function's text: from `export async function <name>(` to the next top-level export, or the end of the file. */
  const fnOf = (src: string, name: string) => {
    const from = src.indexOf(`export async function ${name}(`);
    if (from < 0) return "";
    const to = src.indexOf("\nexport ", from + 10);
    return src.slice(from, to < 0 ? undefined : to);
  };
  /** Every literal redirect target: the first argument when it is a template or a quoted string, its quote dropped. */
  const redirectTargets = (src: string) => [...src.matchAll(/redirect\(\s*(`[^`]*`|"[^"]*")/g)].map((m) => m[1].slice(1));
  const body = fnOf(ACTIONS, "startRegisterAction");
  const backToForm = redirectTargets(body).filter((t) => t.startsWith("/auth/register"));
  ok("7.1 no literal redirect in startRegisterAction goes back to /auth/register — a refusal never remounts the form",
    body.length > 300 && backToForm.length === 0, `${body.length} chars · ${backToForm.join(" · ")}`);
  const planted = redirectTargets("    redirect(`/auth/register?${params.toString()}`);");
  ok("7.1 control: the extractor finds the pre-fix redirect when it is planted",
    planted.length === 1 && planted[0].startsWith("/auth/register"), JSON.stringify(planted));
  ok("7.2 the refusal is RETURNED to the mounted form: if (!result.ok) return registerRefusalOf(result, { phone, email });",
    body.includes("if (!result.ok) return registerRefusalOf(result, { phone, email });"));

  // ── the shape, executed (now = 1) ──
  const POSTED = { phone: "+255712345678", email: " Asha@Example.com " };
  const at1 = (code: string | undefined, extra: Record<string, unknown> = {}) =>
    registerRefusalOf({ code, ...extra } as never, POSTED, 1);
  const exists = at1("ALREADY_EXISTS");
  ok("7.3 EXECUTED · ALREADY_EXISTS is exactly { code exists, no reason, no wait, phone 712345678, email trimmed, at 1 }",
    isDeepStrictEqual(exists, { code: "exists", reason: null, retryAfterSec: null, phone: "712345678", email: "Asha@Example.com", at: 1 }),
    JSON.stringify(exists));
  const codeRows: Array<[string | undefined, string]> = [
    ["ALREADY_EXISTS", "exists"], ["EMAIL_EXISTS", "email_exists"], ["RATE_LIMITED", "rate_limited"],
    ["INVALID", "invalid"], [undefined, "invalid"], ["SUSPENDED", "invalid"],
  ];
  const codeWrong = codeRows.filter(([c, want]) => at1(c).code !== want).map(([c, want]) => `${c} → ${at1(c).code} (want ${want})`);
  ok("7.3 …every code maps: ALREADY_EXISTS → exists, EMAIL_EXISTS → email_exists, RATE_LIMITED → rate_limited, INVALID / none / SUSPENDED → invalid",
    codeWrong.length === 0, codeWrong.join(" | "));

  const waitOf = (x: unknown) => at1("RATE_LIMITED", { retryAfterSec: x }).retryAfterSec;
  const waitRows: Array<[unknown, number | null]> = [[299.2, 300], [0.2, 1], [undefined, null], [0, null], [-5, null], [NaN, null], [Infinity, null]];
  const waitWrong = waitRows.filter(([x, want]) => waitOf(x) !== want).map(([x, want]) => `${String(x)} → ${waitOf(x)} (want ${want})`);
  ok("7.4 EXECUTED · the wait is whole seconds and at least one (299.2 → 300, 0.2 → 1); none, 0, negative, NaN and Infinity carry no wait",
    waitWrong.length === 0, waitWrong.join(" | "));
  const strayWait = ["ALREADY_EXISTS", "EMAIL_EXISTS", "INVALID", undefined].filter((c) => at1(c, { retryAfterSec: 30 }).retryAfterSec !== null);
  ok("7.4 …and a refusal that is not a rate limit never carries a wait", strayWait.length === 0, strayWait.join(", "));

  const reasonOf = (code: string | undefined, reason: string) => at1(code, { reason }).reason;
  const kept = REGISTER_INVALID_REASONS.filter((r) => reasonOf("INVALID", r) === r);
  ok("7.5 EXECUTED · each of the three registry reasons (password_weak, password_mismatch, email_invalid) survives on an INVALID refusal",
    kept.length === 3 && REGISTER_INVALID_REASONS.length === 3, kept.join(", "));
  const leaked = [
    reasonOf("INVALID", "stake_below_min"), reasonOf("INVALID", "That password is in the public breach list"),
    reasonOf("ALREADY_EXISTS", "email_invalid"), reasonOf("RATE_LIMITED", "password_weak"), reasonOf("EMAIL_EXISTS", "password_mismatch"),
  ].filter((r) => r !== null);
  ok("7.5 …no other reason survives, and none on any other code — the panel names only a reason it has words for",
    leaked.length === 0, leaked.join(", "));
  const KEYS = ["at", "code", "email", "phone", "reason", "retryAfterSec"];
  const shapes = [
    at1("ALREADY_EXISTS"), at1("EMAIL_EXISTS"), at1("RATE_LIMITED", { retryAfterSec: 9 }), at1(undefined),
    // ⛔ a result that carries the server's sentence and form values must not pass any of them through
    at1("INVALID", { reason: "password_weak", error: "That password is in the public breach list", dob: "1990-01-01", acceptAge: true, password: "12345678" }),
  ];
  const offShape = shapes.filter((s) => !isDeepStrictEqual(Object.keys(s).sort(), KEYS));
  ok("7.5 ⛔ every refusal has exactly the keys at, code, email, phone, reason, retryAfterSec — no server sentence, no birth date, no password, no tick",
    offShape.length === 0, offShape.map((s) => Object.keys(s).join(",")).join(" | "));

  const fieldRows: Array<[ReturnType<typeof registerRefusalOf> | null, "phone" | "email" | null, string]> = [
    [at1("ALREADY_EXISTS"), "phone", "exists"],
    [at1("EMAIL_EXISTS"), "email", "email_exists"],
    [at1("INVALID", { reason: "email_invalid" }), "email", "invalid + email_invalid"],
    [at1("INVALID", { reason: "password_weak" }), null, "invalid + password_weak"],
    [at1("RATE_LIMITED", { retryAfterSec: 5 }), null, "rate_limited"],
    [null, null, "no refusal"],
  ];
  const fieldWrong = fieldRows.filter(([r, want]) => refusalField(r) !== want).map(([r, want, label]) => `${label} → ${refusalField(r)} (want ${want})`);
  ok("7.6 EXECUTED · the ONE field a refusal marks (C3): a taken phone the phone; a taken or malformed email the email; nothing else marks anything",
    fieldWrong.length === 0, fieldWrong.join(" | "));

  // ── the form's wiring (register-form.tsx, comments stripped) ──
  /** The JSX element that opens with `open` and holds `marker`: from the last `open` before the marker to the next "/>". */
  const elementWith = (src: string, open: string, marker: string) => {
    const at = src.indexOf(marker);
    if (at < 0) return "";
    const from = src.lastIndexOf(open, at);
    const to = src.indexOf("/>", at);
    return from < 0 || to < 0 ? "" : src.slice(from, to + 2);
  };
  const fieldDefects = (form: string) => [
    !elementWith(form, "<PhoneInput", 'name="phone"').includes('error={bad === "phone"}') && 'the <PhoneInput> is not marked by bad === "phone"',
    !elementWith(form, "<Input", 'name="email"').includes('error={bad === "email"}') && 'the email <Input> is not marked by bad === "email"',
    !form.includes("const bad = refusalField(refusal)") && "bad is not refusalField(refusal)",
  ].filter(Boolean) as string[];
  ok("7.7 the phone box is marked only for a taken phone and the email box only for an email refusal (C3: 'phone taken' used to mark the email too)",
    fieldDefects(FORM).length === 0, fieldDefects(FORM).join(" · "));
  const crossed = FORM.replace('error={bad === "email"}', 'error={bad === "phone"}');
  ok("7.7 control: a planted form that marks the email box for a taken PHONE fails",
    crossed !== FORM && fieldDefects(crossed).length > 0, fieldDefects(crossed).join(" · "));

  /** The form's opening tag: from `<form` to its first child, `{children}` (the onSubmit arrow holds a ">"). */
  const formTag = (src: string) => {
    const at = src.indexOf("<form");
    const end = at < 0 ? -1 : src.indexOf("{children}", at);
    return at < 0 || end < 0 ? "" : src.slice(at, end);
  };
  const resetDefects = (form: string) => {
    const tag = formTag(form);
    const pd = tag.indexOf("preventDefault()");
    const st = tag.indexOf("startTransition(() => formAction(");
    return [
      !tag && "no <form> found before {children}",
      !tag.includes("action={formAction}") && "no action={formAction} (what a browser without the script posts)",
      !tag.includes("onSubmit=") && "no onSubmit: React's automatic form reset runs after the action and empties every field",
      (pd < 0 || st < 0 || pd > st) && "onSubmit does not preventDefault() and then startTransition(() => formAction(…))",
      tag.includes("noValidate") && "noValidate switches the browser's own checks off",
      !form.includes("useActionState(startRegisterAction, null)") && "the refusal does not come back through useActionState",
      !/<SubmitButton [^>]*pending=\{isPending\}/.test(form) && "the button is not told the action is in flight (useFormStatus cannot see an onSubmit submit)",
    ].filter(Boolean) as string[];
  };
  ok("7.8 the form submits through onSubmit + preventDefault + startTransition (React's form reset never runs) and keeps action for a browser without script",
    resetDefects(FORM).length === 0, resetDefects(FORM).join(" · "));
  const plainForm = `${FORM.slice(0, FORM.indexOf("<form"))}<form action={formAction}>\n        ${FORM.slice(FORM.indexOf("{children}"))}`;
  ok("7.8 control: a planted <form action={formAction}> with no onSubmit fails",
    FORM.includes("{children}") && resetDefects(plainForm).length > 0, resetDefects(plainForm).join(" · "));

  ok("7.9 a rate limit counts down from the service's own wait (C2) — <RateLimitBanner seconds={refusal.retryAfterSec} /> — and each refusal is a new panel (key={refusal.at})",
    /<RateLimitBanner seconds=\{refusal\.retryAfterSec\}\s*\/>/.test(FORM) && FORM.includes("key={refusal.at}") && FORM.includes("data-refusal={refusal.code}"));

  const inForm = (needle: string) => {
    const open = PAGE.indexOf("<RegisterForm ");
    const at = PAGE.indexOf(needle);
    return open >= 0 && at > open && at < PAGE.indexOf("</RegisterForm>");
  };
  const ctas = [
    "`/auth/login?phone=${encodeURIComponent(refusal.phone)}${nextQs}`",
    "`/auth/login?identifier=${encodeURIComponent(refusal.email)}${nextQs}`",
  ];
  ok("7.10 the page renders <RegisterForm> with the hidden ref, invite and next fields inside it, and both panel links keep next (nextQs)",
    inForm('<input type="hidden" name="ref" value={refCode} />') && inForm('<input type="hidden" name="invite" value={inviteCode} />')
      && inForm('<input type="hidden" name="next" value={nextOk} />') && inForm('<input type="hidden" name="shownLocale" value={locale} />')
      && ctas.every((c) => FORM.includes(c)) && FORM.includes("const nextQs = nextOk ? `&next=${encodeURIComponent(nextOk)}` : \"\";"),
    ctas.filter((c) => !FORM.includes(c)).join(" · "));

  // ── the real service, driven: its three reasons reach the refusal (phones this file uses nowhere else) ──
  const weakPhone = "+255749990001", mismatchPhone = "+255749990002", badEmailPhone = "+255749990003";
  const weak = await registerWithPassword({ ...base({ phone: weakPhone, email: "weak.pw.signup@example.com" }), password: "12345678", passwordConfirm: "12345678" });
  const weakRefusal = weak.ok ? null : registerRefusalOf(weak, { phone: weakPhone, email: "weak.pw.signup@example.com" });
  ok("7.11 EXECUTED · the real service's refusal of 12345678 becomes code invalid, reason password_weak — worded by the registry, not 'the public breach list'",
    !weak.ok && weakRefusal?.code === "invalid" && weakRefusal.reason === "password_weak" && weakRefusal.phone === "749990001",
    JSON.stringify(weakRefusal));
  const mismatch = await registerWithPassword({ ...base({ phone: mismatchPhone, email: "mismatch.signup@example.com" }), passwordConfirm: `${PW}x` });
  const badEmail = await registerWithPassword(base({ phone: badEmailPhone, email: "notanemail" }));
  const mismatchRefusal = mismatch.ok ? null : registerRefusalOf(mismatch, { phone: mismatchPhone, email: "mismatch.signup@example.com" });
  const badEmailRefusal = badEmail.ok ? null : registerRefusalOf(badEmail, { phone: badEmailPhone, email: "notanemail" });
  ok("7.11 …and its mismatch and malformed-email refusals carry password_mismatch and email_invalid, the latter marking the email box",
    mismatchRefusal?.reason === "password_mismatch" && badEmailRefusal?.reason === "email_invalid" && refusalField(badEmailRefusal) === "email",
    `${JSON.stringify(mismatchRefusal)} · ${JSON.stringify(badEmailRefusal)}`);

  // ── C-X1 · the reasons are worded in the page's language, from the registry ──
  const { dict } = await import("../src/lib/i18n-dict.ts");
  const { bannerFor } = await import("../src/lib/failure-banner.ts");
  const wordsFor = (l: "en" | "sw" | "zh", r: string) => bannerFor(r, dict[l].error as unknown as Record<string, string>)?.body ?? "";
  const unworded = (["en", "sw", "zh"] as const).flatMap((l) => REGISTER_INVALID_REASONS
    .filter((r) => !wordsFor(l, r) || (l !== "en" && wordsFor(l, r) === wordsFor("en", r))).map((r) => `${l}:${r}`));
  ok("7.12 EXECUTED · C-X1 · each reason has its own registry sentence in en, sw and zh; the page builds copy.reasons from it and the form never looks a word up itself",
    unworded.length === 0 && PAGE.includes("bannerFor(r, t.error as unknown as Record<string, string>)")
      && FORM.includes("(refusal.reason && copy.reasons[refusal.reason]) || copy.checkFormFields") && !FORM.includes("useT("),
    unworded.join(", "));
}

console.log(`\nauth-email-signin: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
