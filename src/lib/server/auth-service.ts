/**
 * Auth service — phone + OTP only (no passwords initially per TZ market norms).
 * Compliance:
 *  - OTP is 6 digits, hashed at rest, 5-minute TTL, 5-attempt cap, single-use.
 *  - Rate limited per phone + per IP.
 *  - Every event audited (AUTH category).
 *  - Age gate enforced at registration (Gaming Act 2003).
 *  - Terms version recorded with timestamp.
 */
import { headers } from "next/headers";
import { audit } from "./audit";
import { db } from "./store";
import { generateOtp, hashOtp, hashPassword, randomId, verifyOtp, verifyPassword } from "./crypto";
import { rateCheck } from "./rate-limit";
import { sms, otpMessage } from "./sms";
import { LoginRequestSchema, OtpVerifySchema, RegisterSchema } from "./validators";
import type { z } from "zod";
import { createSession, destroySession, getSession, type SessionData } from "./session";
import { withLock } from "./locks";
import { sendEmail, sendEmailToUser, welcomeHtml, loginNotificationHtml } from "./email";
import { displayLabel } from "@/lib/display-label";
import { resolvePhoneEmail } from "./email-map";
import { validatePasswordStrength } from "./password-policy";

/** Mask a phone for an audit payload — keep country code + last 2 (e.g.
 *  "+25570*****19"). The audit entry already carries actorId, so the full number
 *  is recoverable from the user record; it must NOT be stored raw in the chain
 *  (it renders unmasked in /admin/audit and the ISO audit-log export). */
function maskPhoneForAudit(phone?: string | null): string {
  const p = (phone ?? "").trim();
  return p.length > 6 ? `${p.slice(0, 6)}*****${p.slice(-2)}` : "****";
}

/** Phone numbers Ali wants auto-promoted to ADMIN on first registration.
 *  Set ADMIN_BOOTSTRAP_PHONES=+255712345678,+255700000000 in env. */
function adminBootstrapPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
      .split(",").map(s => s.trim()).filter(Boolean)
  );
}

const OTP_TTL_MS = 5 * 60 * 1000;
const TERMS_VERSION = "2026-04-01";

async function clientMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    ua: h.get("user-agent") ?? null,
  };
}

export type ServiceResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; code?: "RATE_LIMITED" | "INVALID" | "EXPIRED" | "ALREADY_EXISTS" | "NOT_FOUND" | "TOO_MANY_ATTEMPTS" | "SUSPENDED" | "SELECTION_CLOSED" | "CONFLICT"; retryAfterSec?: number };

/** Step 1: request OTP for login (existing user). */
export async function requestLoginOtp(input: z.input<typeof LoginRequestSchema>): Promise<ServiceResult<{ otpId: string }>> {
  const parse = LoginRequestSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const phone = parse.data.phone;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "otp.send");
  if (!rl.allowed) {
    audit({ category: "SECURITY", action: "otp.rate_limited", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), payload: { ip: meta.ip } });
    return { ok: false, error: "Too many attempts. Please wait · Subiri kidogo.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };
  }

  const user = await db.user.findByPhone(phone);
  if (!user) {
    // Surface the missing-account state so the login page can offer a
    // direct "Create account" path. Anti-enumeration is not load-bearing
    // for this product — phone numbers aren't private and registration
    // is one-step OTP, so revealing whether a phone is signed up trades
    // off acceptably for usability.
    audit({ category: "SECURITY", action: "otp.send_to_unknown_phone", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), ip: meta.ip, userAgent: meta.ua });
    return { ok: false, error: "No account with that phone. Create one to get started.", code: "NOT_FOUND" };
  }
  if (user.status === "SELF_EXCLUDED") {
    audit({ category: "COMPLIANCE", action: "auth.blocked_self_excluded", actorId: user.id, targetType: "User", targetId: user.id });
    return { ok: false, error: "Your account is in self-exclusion.", code: "SUSPENDED" };
  }
  if (user.status === "SUSPENDED" || user.status === "CLOSED") {
    return { ok: false, error: "Account unavailable. Contact support.", code: "SUSPENDED" };
  }

  // Hard ~30s spacing between sends, on top of the otp.send burst cap. Protects
  // against SMS-pumping / toll fraud on a paid provider and drives the resend
  // countdown shown to the user.
  const cool = rateCheck(phone, "otp.resend");
  if (!cool.allowed) {
    return { ok: false, error: `Please wait ${cool.retryAfterSec}s before requesting another code.`, code: "RATE_LIMITED", retryAfterSec: cool.retryAfterSec };
  }

  return await issueOtp(phone, "login", meta);
}

/** Register a new account — OTP-driven. Returns OTP id. */
export async function requestRegisterOtp(input: z.input<typeof RegisterSchema>): Promise<ServiceResult<{ otpId: string; phone: string }>> {
  const parse = RegisterSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const meta = await clientMeta();
  const phone = parse.data.phone;

  const rl = rateCheck(phone, "auth.register");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const existing = await db.user.findByPhone(phone);
  if (existing) {
    audit({ category: "AUTH", action: "register.duplicate_phone", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), ip: meta.ip });
    return { ok: false, error: "An account with that phone already exists.", code: "ALREADY_EXISTS" };
  }

  const issued = await issueOtp(phone, "register", meta);
  if (!issued.ok) return issued;
  // Stash registration intent (DOB, terms) so OTP verify can finalize
  pendingRegistration.set(phone, { dob: parse.data.dob, marketingOptIn: parse.data.marketingOptIn ?? false });
  return { ok: true, data: { otpId: issued.data!.otpId, phone } };
}

// Stash registration intent (DOB, terms) between requestRegisterOtp and the
// follow-up verifyOtpAndAuth call. Persisted on globalThis so Next.js dev-mode
// HMR doesn't wipe the entry between the two requests.
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_PENDING_REG: Map<string, { dob: string; marketingOptIn: boolean }> | undefined;
}
const pendingRegistration: Map<string, { dob: string; marketingOptIn: boolean }> =
  globalThis.__50PICK_PENDING_REG ?? (globalThis.__50PICK_PENDING_REG = new Map());

async function issueOtp(phone: string, purpose: "login" | "register" | "withdraw" | "reauth" | "self_exclusion", meta: { ip: string | null; ua: string | null }): Promise<ServiceResult<{ otpId: string }>> {
  const code = generateOtp();
  const salt = randomId(8);
  const otp = await db.otp.create({
    id: `otp_${randomId(12)}`,
    phoneE164: phone,
    hashedCode: await hashOtp(code, salt),
    salt,
    purpose,
    attempts: 0,
    consumedAt: null,
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  });

  audit({ category: "AUTH", action: `otp.${purpose}.sent`, actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), payload: { otpId: otp.id }, ip: meta.ip, userAgent: meta.ua });

  // Fire-and-forget SMS — provider failures don't block UX
  sms.send(phone, otpMessage(code, "SW")).catch(() => {
    audit({ category: "SECURITY", action: "sms.delivery_failed", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), payload: { otpId: otp.id } });
  });

  return { ok: true, data: { otpId: otp.id } };
}

/**
 * PRE-LAUNCH testing float. When TEST_FUNDING="true", top every ACTIVE wallet up
 * to a TZS 1,000,000 floor on login/registration — so every testing account and
 * admin account always has money to test with (incl. 0769434985 / +255769434985).
 * Idempotent: only credits the shortfall, never reduces a balance, never touches
 * a frozen/closed wallet. Best-effort — never blocks auth.
 *
 * MUST be turned OFF before real-money launch: unset TEST_FUNDING (or set it to
 * "false"). The DB is formatted before go-live, so no test float carries over.
 */
const TEST_FLOAT_TZS = 1_000_000;
async function applyTestFloat(userId: string): Promise<void> {
  // Defense-in-depth: never mint test float on a production deployment, even if
  // TEST_FUNDING is somehow left set to "true" in the prod environment.
  if (process.env.TEST_FUNDING !== "true" || process.env.NODE_ENV === "production") return;
  try {
    const w = await db.wallet.findByUserId(userId);
    if (!w || w.status !== "ACTIVE" || w.balance >= TEST_FLOAT_TZS) return;
    const updated = await db.wallet.adjust(w.id, { balance: TEST_FLOAT_TZS - w.balance });
    audit({ category: "WALLET", action: "wallet.test_float_topup", actorId: userId, targetType: "Wallet", targetId: w.id, payload: { from: w.balance, to: updated?.balance ?? TEST_FLOAT_TZS } });
  } catch (err) {
    console.error("[test-float] top-up failed:", (err as Error)?.message ?? err);
  }
}

/** Step 2: verify OTP, create or sign in user, set session cookie. */
export async function verifyOtpAndAuth(input: z.input<typeof OtpVerifySchema>): Promise<ServiceResult<{ userId: string; isNew: boolean }>> {
  const parse = OtpVerifySchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const { phone, code, purpose } = parse.data;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "otp.verify");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Try ALL active OTPs for this phone+purpose, not just the most recent.
  // SMS delivery is unreliable — the user might receive OTP #1 after OTP #2
  // arrives. Checking only the newest OTP rejects the older (but valid) code,
  // causing "wrong code" errors that users report as "sign-in doesn't work."
  const allActive = await db.otp.findAllActive(phone, purpose);
  if (allActive.length === 0) {
    audit({ category: "SECURITY", action: "otp.verify.no_active", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), ip: meta.ip });
    return { ok: false, error: "Code expired or not found.", code: "EXPIRED" };
  }
  // Check if ANY active OTP has exhausted attempts
  const freshOtps = allActive.filter((o) => o.attempts < 5);
  if (freshOtps.length === 0) {
    audit({ category: "SECURITY", action: "otp.verify.too_many_attempts", actorId: null, targetType: "Otp", targetId: allActive[0].id });
    return { ok: false, error: "Too many wrong attempts. Request a new code.", code: "TOO_MANY_ATTEMPTS" };
  }

  let matched: typeof freshOtps[0] | null = null;
  for (const otp of freshOtps) {
    if (await verifyOtp(code, otp.salt, otp.hashedCode)) {
      matched = otp;
      break;
    }
  }
  if (!matched) {
    // Burn an attempt on EVERY active OTP, not just the newest. Otherwise an
    // attacker requests several codes (all valid at once) and gets 5 guesses
    // PER code — multiplying the brute-force budget against a 6-digit space.
    // Charging all of them makes the 5-attempt cap a real per-phone ceiling.
    for (const o of freshOtps) await db.otp.incrementAttempts(o.id);
    audit({ category: "SECURITY", action: "otp.verify.wrong_code", actorId: null, targetType: "Otp", targetId: freshOtps[0].id, ip: meta.ip });
    return { ok: false, error: "Wrong code.", code: "INVALID" };
  }
  // Consume the matched OTP (and all others for this phone+purpose to prevent reuse)
  for (const o of allActive) await db.otp.consume(o.id);

  // Find or create user
  let user = await db.user.findByPhone(phone);
  let isNew = false;
  if (!user) {
    if (purpose !== "register") {
      return { ok: false, error: "Account not found.", code: "NOT_FOUND" };
    }
    const reg = pendingRegistration.get(phone);
    if (!reg) return { ok: false, error: "Registration session expired.", code: "EXPIRED" };
    pendingRegistration.delete(phone);

    user = await db.user.create({
      id: `usr_${randomId(12)}`,
      phoneE164: phone,
      email: null,
      passwordHash: null,
      passwordSalt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      role: "PLAYER",
      status: "PENDING_KYC",
      locale: "SW",
      displayName: null,
      dob: reg.dob,
      region: null,
      acceptedTermsVersion: TERMS_VERSION,
      acceptedTermsAt: new Date().toISOString(),
      marketingOptIn: reg.marketingOptIn,
      twoFactorEnabled: false,
      avatarDataUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      closedAt: null,
    });
    // Auto-create wallet — starter balance is the admin-tunable
    // `starterBalanceTzs` config knob; defaults to 0 (no free funds).
    const { db: dbRef } = await import("./store");
    const { getEffectiveConfig } = await import("./market-config");
    const starterBalance = (await getEffectiveConfig()).starterBalanceTzs ?? 0;
    // MUST await: under the Prisma DAL this is a real INSERT. Un-awaited, the
    // wallet row races the redirect — a brand-new user could land on /wallet or
    // place a first bet before the row exists and hit "Wallet not found".
    await dbRef.wallet.create({
      id: `wlt_${randomId(12)}`,
      userId: user.id,
      balance: starterBalance, pending: 0, hold: 0,
      currency: "TZS", status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (starterBalance > 0) {
      const { audit: auditFn } = await import("./audit");
      auditFn({
        category: "WALLET",
        action: "wallet.starter_credit",
        actorId: user.id,
        targetType: "Wallet",
        targetId: user.id,
        payload: { amount: starterBalance },
      });
    }
    audit({ category: "AUTH", action: "user.registered", actorId: user.id, targetType: "User", targetId: user.id, payload: { phone: maskPhoneForAudit(phone) } });
    isNew = true;
    // Welcome email — parity with the password registration path. Best-effort;
    // no-ops cleanly when an OTP-only user has no email on file yet.
    sendEmailToUser(user.id, (email) => ({
      to: email,
      subject: "Welcome to 50pick · Karibu",
      html: welcomeHtml({ name: displayLabel(user!) }),
      tag: "welcome",
    })).catch(() => {});
  } else {
    await db.user.update(user.id, { lastLoginAt: new Date().toISOString() });
    audit({ category: "AUTH", action: "user.login", actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip, userAgent: meta.ua });
    // New sign-in security email — parity with the password login path.
    sendEmailToUser(user.id, (email) => ({
      to: email,
      subject: "New sign-in to your 50pick account",
      html: loginNotificationHtml({
        name: displayLabel(user!),
        time: new Date().toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" }),
        ip: meta.ip ?? "unknown",
      }),
      tag: "login-otp",
    })).catch(() => {});
  }

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: (await db.kyc.findByUserId(user.id))?.status ?? "NOT_STARTED",
  });
  await applyTestFloat(user.id);

  return { ok: true, data: { userId: user.id, isNew } };
}

export async function logout(): Promise<void> {
  await destroySession();
}

export async function currentSession(): Promise<SessionData | null> {
  return getSession();
}

// ─────────────────────────────────────────────────────────────────────
// Password-based auth — interim path while SMS provider is unsigned.
// OTP code above is preserved verbatim; flip back by routing the auth
// pages to startLoginAction / startRegisterAction instead of these.
// ─────────────────────────────────────────────────────────────────────

export type PasswordRegisterInput = {
  phone: string;            // E.164, e.g. +255712345678
  password: string;
  passwordConfirm: string;
  dob: string;              // YYYY-MM-DD
  acceptTerms: boolean;
  acceptAge: boolean;
  marketingOptIn?: boolean;
  /** Affiliate referral code from a ?ref= link, if the user arrived via one. */
  referralCode?: string;
  /** Invite-campaign code from a ?invite= link — grants the campaign bonus. */
  inviteCode?: string;
};

export async function registerWithPassword(input: PasswordRegisterInput): Promise<ServiceResult<{ userId: string; role: string }>> {
  // Validate the non-password parts via the existing schema, then add
  // password rules ourselves so we don't bend the OTP-era validators.
  const baseParse = RegisterSchema.safeParse({
    phone: input.phone,
    dob: input.dob,
    acceptTerms: input.acceptTerms,
    acceptAge: input.acceptAge,
    marketingOptIn: input.marketingOptIn ?? false,
  });
  if (!baseParse.success) return { ok: false, error: baseParse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const pwError = validatePasswordStrength(input.password);
  if (pwError) return { ok: false, error: pwError, code: "INVALID" };
  if (input.password !== input.passwordConfirm) {
    return { ok: false, error: "Passwords do not match. · Nenosiri hazilingani.", code: "INVALID" };
  }

  const phone = baseParse.data.phone;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "auth.register");
  if (!rl.allowed) return { ok: false, error: "Too many attempts. Please wait.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  // Per-IP cap on registration to block credential-stuffing / mass-fake-account
  // bursts from a single source. Looser than the per-phone cap.
  if (meta.ip) {
    const rlIp = rateCheck(meta.ip, "auth.register.ip");
    if (!rlIp.allowed) {
      audit({ category: "SECURITY", action: "register.ip_rate_limited", actorId: null, targetType: "Ip", targetId: meta.ip });
      return { ok: false, error: "Too many sign-ups from this network. Please try again later.", code: "RATE_LIMITED", retryAfterSec: rlIp.retryAfterSec };
    }
  }

  // Serialise per-phone to prevent duplicate-user race: two concurrent
  // registrations both pass findByPhone before either writes the user.
  return withLock(`register:${phone}`, async () => {

  if (await db.user.findByPhone(phone)) {
    audit({ category: "AUTH", action: "register.duplicate_phone", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), ip: meta.ip });
    return { ok: false, error: "An account with that phone already exists.", code: "ALREADY_EXISTS" };
  }

  const salt = randomId(16);
  const hash = await hashPassword(input.password, salt);

  // First-admin bootstrap: any phone listed in ADMIN_BOOTSTRAP_PHONES gets
  // the ADMIN role + ACTIVE status (no KYC) the moment they sign up.
  const bootstrapAdmins = adminBootstrapPhones();
  const isBootstrapAdmin = bootstrapAdmins.has(phone);

  const user = await db.user.create({
    id: `usr_${randomId(12)}`,
    phoneE164: phone,
    email: resolvePhoneEmail(phone),
    passwordHash: hash,
    passwordSalt: salt,
    failedLoginCount: 0,
    lockedUntil: null,
    role: isBootstrapAdmin ? "ADMIN" : "PLAYER",
    status: isBootstrapAdmin ? "ACTIVE" : "PENDING_KYC",
    locale: "SW",
    displayName: null,
    dob: baseParse.data.dob,
    region: null,
    acceptedTermsVersion: TERMS_VERSION,
    acceptedTermsAt: new Date().toISOString(),
    marketingOptIn: baseParse.data.marketingOptIn ?? false,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    closedAt: null,
  });

  // Auto-create wallet. Tester phones get 100K TZS for QA sessions;
  // everyone else gets the configured starter balance (default 0).
  const testerPhones = new Set(
    (process.env.TESTER_BOOTSTRAP_PHONES ?? "").split(",").map(s => s.trim()).filter(Boolean),
  );
  const { getEffectiveConfig } = await import("./market-config");
  const starterBalance = testerPhones.has(phone) ? 100_000 : ((await getEffectiveConfig()).starterBalanceTzs ?? 0);
  await db.wallet.create({
    id: `wlt_${randomId(12)}`,
    userId: user.id,
    balance: starterBalance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (starterBalance > 0) {
    audit({ category: "WALLET", action: "wallet.starter_credit", actorId: user.id, targetType: "Wallet", targetId: user.id, payload: { amount: starterBalance } });
  }

  // Affiliate referral binding — if the user arrived via a ?ref= link, bind
  // them to their referrer and fire any sign-up-triggered reward. Best-effort
  // and never blocks registration (invalid codes are a silent no-op).
  if (input.referralCode) {
    try {
      const { bindRecruit } = await import("./affiliate-service");
      // MUST await: bindRecruit performs DB writes (bind + reward accrual). Un-
      // awaited it races the post-registration redirect and its errors escape
      // the try/catch as an unhandled rejection.
      await bindRecruit({ recruitUserId: user.id, code: input.referralCode, ip: meta.ip });
    } catch (e) {
      audit({ category: "SYSTEM", action: "affiliate.bind.failed", actorId: user.id, targetType: "User", targetId: user.id, payload: { error: String((e as Error)?.message ?? e) } });
    }
  }

  // Invite-campaign binding — if the user arrived via a ?invite= link, grant the
  // campaign bonus (to the bonus wallet) and mark their invite entry registered.
  // Best-effort; never blocks registration (unknown codes are a silent no-op).
  if (input.inviteCode) {
    try {
      const { bindRegistration } = await import("./invite-service");
      await bindRegistration(user.id, input.inviteCode, { phone, email: user.email });
    } catch (e) {
      audit({ category: "SYSTEM", action: "invite.bind.failed", actorId: user.id, targetType: "User", targetId: user.id, payload: { error: String((e as Error)?.message ?? e) } });
    }
  }

  audit({
    category: "AUTH",
    action: isBootstrapAdmin ? "user.registered.admin_bootstrap" : "user.registered",
    actorId: user.id, targetType: "User", targetId: user.id,
    payload: { phone: maskPhoneForAudit(phone), role: user.role },
  });

  // Welcome email — best-effort, never blocks registration
  if (user.email) {
    const { displayLabel } = await import("../display-label");
    sendEmail({
      to: user.email,
      subject: "Welcome to 50pick · Karibu",
      html: welcomeHtml({ name: displayLabel(user) }),
      tag: "welcome",
    }).catch(() => {});
  }

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: "NOT_STARTED",
  });
  await applyTestFloat(user.id);

  return { ok: true, data: { userId: user.id, role: user.role } };
  }); // end withLock register
}

export type PasswordLoginInput = { phone: string; password: string };

const LOCKOUT_MAX_FAILS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;   // 30-minute lockout per LCCP guidance

export async function loginWithPassword(input: PasswordLoginInput): Promise<ServiceResult<{ userId: string; role: string }>> {
  const parse = LoginRequestSchema.safeParse({ phone: input.phone });
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid phone.", code: "INVALID" };
  const phone = parse.data.phone;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "auth.login");
  if (!rl.allowed) return { ok: false, error: "Too many attempts. Please wait.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };
  if (meta.ip) {
    const rlIp = rateCheck(meta.ip, "auth.login.ip");
    if (!rlIp.allowed) {
      audit({ category: "SECURITY", action: "login.ip_rate_limited", actorId: null, targetType: "Ip", targetId: meta.ip });
      return { ok: false, error: "Too many sign-in attempts from this network. Please try again later.", code: "RATE_LIMITED", retryAfterSec: rlIp.retryAfterSec };
    }
  }

  const user = await db.user.findByPhone(phone);
  if (!user) {
    audit({ category: "SECURITY", action: "auth.login.unknown_phone", actorId: null, targetType: "Phone", targetId: maskPhoneForAudit(phone), ip: meta.ip });
    return { ok: false, error: "No account with that phone. Create one to get started.", code: "NOT_FOUND" };
  }
  if (user.status === "SELF_EXCLUDED") {
    audit({ category: "COMPLIANCE", action: "auth.blocked_self_excluded", actorId: user.id, targetType: "User", targetId: user.id });
    return { ok: false, error: "Your account is in self-exclusion.", code: "SUSPENDED" };
  }
  if (user.status === "SUSPENDED" || user.status === "CLOSED") {
    return { ok: false, error: "Account unavailable. Contact support.", code: "SUSPENDED" };
  }
  // Brute-force lockout — separate from rate limit. Rate limit blocks
  // ANY login from a phone/IP for a short window; lockout pins THIS
  // account closed for 30 min after 5 consecutive wrong passwords,
  // which forces an attacker to either solve the rate limit at scale
  // or know the actual password. LCCP / GBT account-protection.
  if (user.lockedUntil) {
    const lockedMs = Date.parse(user.lockedUntil) - Date.now();
    if (lockedMs > 0) {
      audit({ category: "SECURITY", action: "auth.login.account_locked", actorId: user.id, targetType: "User", targetId: user.id, payload: { lockedUntil: user.lockedUntil } });
      return {
        ok: false,
        error: "Account temporarily locked after repeated wrong-password attempts. Try again later or reset your password.",
        code: "RATE_LIMITED",
        retryAfterSec: Math.ceil(lockedMs / 1000),
      };
    }
    // Lock expired — clear it so a successful login resets cleanly.
    await db.user.update(user.id, { lockedUntil: null, failedLoginCount: 0 });
  }
  if (!user.passwordHash || !user.passwordSalt) {
    return { ok: false, error: "This account has no password yet. Use the OTP flow or contact support.", code: "INVALID" };
  }

  // Serialise password verification + counter update per user to prevent
  // concurrent wrong-password logins from losing increment counts (two
  // requests both read failedLoginCount=3, both write 4 → should be 5).
  return withLock(`login:${user.id}`, async () => {
  // Re-read user inside the lock for fresh failedLoginCount
  const freshUser = await db.user.findById(user.id) ?? user;

  if (!(await verifyPassword(input.password, user.passwordSalt!, user.passwordHash!))) {
    const nextCount = (freshUser.failedLoginCount ?? 0) + 1;
    const shouldLock = nextCount >= LOCKOUT_MAX_FAILS;
    const patch: Partial<typeof user> = {
      failedLoginCount: shouldLock ? 0 : nextCount,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() : freshUser.lockedUntil ?? null,
    };
    await db.user.update(user.id, patch);
    audit({
      category: "SECURITY",
      action: shouldLock ? "auth.login.locked_after_failures" : "auth.login.bad_password",
      actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip,
      payload: { failedCount: shouldLock ? LOCKOUT_MAX_FAILS : nextCount },
    });
    if (shouldLock) {
      return {
        ok: false,
        error: `Too many wrong attempts. Account locked for 30 minutes. Reset your password if you forgot it.`,
        code: "RATE_LIMITED",
        retryAfterSec: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }
    return { ok: false, error: "Wrong phone or password.", code: "INVALID" };
  }

  // Successful login — clear the brute-force counter + lockout.
  await db.user.update(user.id, {
    lastLoginAt: new Date().toISOString(),
    failedLoginCount: 0,
    lockedUntil: null,
  });

  // Bootstrap-admin auto-promote on login — ONE-SHOT only.
  // Fires once for accounts registered before ADMIN_BOOTSTRAP_PHONES was set,
  // then records the fact durably so a leaked/mis-set env var can never
  // re-promote a demoted admin or grant standing admin to a stranger.
  let effectiveRole = user.role;
  if (effectiveRole !== "ADMIN" && adminBootstrapPhones().has(user.phoneE164)) {
    const { loadConfig, saveConfig } = await import("./config-store");
    const key = `bootstrap.login_promoted:${user.phoneE164}`;
    const alreadyPromoted = await loadConfig<boolean>(key);
    if (!alreadyPromoted) {
      await db.user.update(user.id, { role: "ADMIN", status: "ACTIVE" });
      effectiveRole = "ADMIN";
      await saveConfig(key, true);
      audit({
        category: "SECURITY",
        action: "user.bootstrap_promoted_on_login",
        actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip,
        payload: { fromRole: user.role, toRole: "ADMIN", reason: "phone in ADMIN_BOOTSTRAP_PHONES (one-shot)" },
      });
    }
  }

  audit({ category: "AUTH", action: "user.login.password", actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip, userAgent: meta.ua });

  // Bind env-mapped email (phone → email). Later this moves to KYC.
  const emailForPhone = resolvePhoneEmail(user.phoneE164);
  if (emailForPhone && user.email !== emailForPhone) {
    await db.user.update(user.id, { email: emailForPhone });
  }

  // Login notification email — best-effort
  const userEmail = emailForPhone ?? user.email;
  if (userEmail) {
    const { displayLabel } = await import("../display-label");
    const userRef = { id: user.id, displayName: user.displayName };
    sendEmail({
      to: userEmail,
      subject: "Signed in · Umeingia 50pick",
      html: loginNotificationHtml({ name: displayLabel(userRef), time: new Date().toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" }), ip: meta.ip ?? "unknown" }),
      tag: "login",
    }).catch(() => {});
  }

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: effectiveRole,
    kycStatus: (await db.kyc.findByUserId(user.id))?.status ?? "NOT_STARTED",
  });
  await applyTestFloat(user.id);

  return { ok: true, data: { userId: user.id, role: effectiveRole } };
  }); // end withLock login
}
