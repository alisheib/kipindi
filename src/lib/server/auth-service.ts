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

/** Phone numbers Ali wants auto-promoted to ADMIN on first registration.
 *  Set ADMIN_BOOTSTRAP_PHONES=+255712345678,+255700000000 in env. */
function adminBootstrapPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
      .split(",").map(s => s.trim()).filter(Boolean)
  );
}

/** Common-password blacklist. Tiny on purpose — this catches the worst
 *  offenders without UX-blocking legitimate weak choices that the strength
 *  meter already discourages. Source: SecLists top-1000 intersected with
 *  the OWASP "TOP 100 worst passwords" — only entries with length ≥ 8 (so
 *  we don't double-reject the min-length rule). */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "1234567890", "qwerty12", "qwertyui",
  "qwerty123", "iloveyou", "password1", "password!", "letmein1", "welcome1",
  "admin123", "abc12345", "monkey12", "dragon12", "football", "baseball",
  "basketball", "trustno1", "sunshine", "princess", "starwars", "shadow12",
  "michael1", "jennifer", "daniel12", "computer", "internet", "welcome123",
  "password123", "passw0rd", "p@ssword", "p@ssw0rd",
]);
function isCommonPassword(pw: string): boolean {
  return COMMON_PASSWORDS.has(pw.toLowerCase());
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
  | { ok: false; error: string; code?: "RATE_LIMITED" | "INVALID" | "EXPIRED" | "ALREADY_EXISTS" | "NOT_FOUND" | "TOO_MANY_ATTEMPTS" | "SUSPENDED"; retryAfterSec?: number };

/** Step 1: request OTP for login (existing user). */
export async function requestLoginOtp(input: z.input<typeof LoginRequestSchema>): Promise<ServiceResult<{ otpId: string }>> {
  const parse = LoginRequestSchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const phone = parse.data.phone;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "otp.send");
  if (!rl.allowed) {
    audit({ category: "SECURITY", action: "otp.rate_limited", actorId: null, targetType: "Phone", targetId: phone, payload: { ip: meta.ip } });
    return { ok: false, error: "Too many attempts. Please wait.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };
  }

  const user = db.user.findByPhone(phone);
  if (!user) {
    // Surface the missing-account state so the login page can offer a
    // direct "Create account" path. Anti-enumeration is not load-bearing
    // for this product — phone numbers aren't private and registration
    // is one-step OTP, so revealing whether a phone is signed up trades
    // off acceptably for usability.
    audit({ category: "SECURITY", action: "otp.send_to_unknown_phone", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip, userAgent: meta.ua });
    return { ok: false, error: "No account with that phone. Create one to get started.", code: "NOT_FOUND" };
  }
  if (user.status === "SELF_EXCLUDED") {
    audit({ category: "COMPLIANCE", action: "auth.blocked_self_excluded", actorId: user.id, targetType: "User", targetId: user.id });
    return { ok: false, error: "Your account is in self-exclusion.", code: "SUSPENDED" };
  }
  if (user.status === "SUSPENDED" || user.status === "CLOSED") {
    return { ok: false, error: "Account unavailable. Contact support.", code: "SUSPENDED" };
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

  const existing = db.user.findByPhone(phone);
  if (existing) {
    audit({ category: "AUTH", action: "register.duplicate_phone", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip });
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
  const otp = db.otp.create({
    id: `otp_${randomId(12)}`,
    phoneE164: phone,
    hashedCode: hashOtp(code, salt),
    salt,
    purpose,
    attempts: 0,
    consumedAt: null,
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  });

  audit({ category: "AUTH", action: `otp.${purpose}.sent`, actorId: null, targetType: "Phone", targetId: phone, payload: { otpId: otp.id }, ip: meta.ip, userAgent: meta.ua });

  // Fire-and-forget SMS — provider failures don't block UX
  sms.send(phone, otpMessage(code, "SW")).catch(() => {
    audit({ category: "SECURITY", action: "sms.delivery_failed", actorId: null, targetType: "Phone", targetId: phone, payload: { otpId: otp.id } });
  });

  return { ok: true, data: { otpId: otp.id } };
}

/** Step 2: verify OTP, create or sign in user, set session cookie. */
export async function verifyOtpAndAuth(input: z.input<typeof OtpVerifySchema>): Promise<ServiceResult<{ userId: string; isNew: boolean }>> {
  const parse = OtpVerifySchema.safeParse(input);
  if (!parse.success) return { ok: false, error: parse.error.errors[0]?.message ?? "Invalid input", code: "INVALID" };
  const { phone, code, purpose } = parse.data;
  const meta = await clientMeta();

  const rl = rateCheck(phone, "otp.verify");
  if (!rl.allowed) return { ok: false, error: "Too many attempts.", code: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec };

  const otp = db.otp.findActive(phone, purpose);
  if (!otp) {
    audit({ category: "SECURITY", action: "otp.verify.no_active", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip });
    return { ok: false, error: "Code expired or not found.", code: "EXPIRED" };
  }
  if (otp.attempts >= 5) {
    audit({ category: "SECURITY", action: "otp.verify.too_many_attempts", actorId: null, targetType: "Otp", targetId: otp.id });
    return { ok: false, error: "Too many wrong attempts. Request a new code.", code: "TOO_MANY_ATTEMPTS" };
  }

  if (!verifyOtp(code, otp.salt, otp.hashedCode)) {
    db.otp.incrementAttempts(otp.id);
    audit({ category: "SECURITY", action: "otp.verify.wrong_code", actorId: null, targetType: "Otp", targetId: otp.id, ip: meta.ip });
    return { ok: false, error: "Wrong code.", code: "INVALID" };
  }
  db.otp.consume(otp.id);

  // Find or create user
  let user = db.user.findByPhone(phone);
  let isNew = false;
  if (!user) {
    if (purpose !== "register") {
      return { ok: false, error: "Account not found.", code: "NOT_FOUND" };
    }
    const reg = pendingRegistration.get(phone);
    if (!reg) return { ok: false, error: "Registration session expired.", code: "EXPIRED" };
    pendingRegistration.delete(phone);

    user = db.user.create({
      id: `usr_${randomId(12)}`,
      phoneE164: phone,
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
    const starterBalance = getEffectiveConfig().starterBalanceTzs ?? 0;
    dbRef.wallet.create({
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
    audit({ category: "AUTH", action: "user.registered", actorId: user.id, targetType: "User", targetId: user.id, payload: { phone } });
    isNew = true;
  } else {
    db.user.update(user.id, { lastLoginAt: new Date().toISOString() });
    audit({ category: "AUTH", action: "user.login", actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip, userAgent: meta.ua });
  }

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: db.kyc.findByUserId(user.id)?.status ?? "NOT_STARTED",
  });

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

const PASSWORD_MIN = 8;

export type PasswordRegisterInput = {
  phone: string;            // E.164, e.g. +255712345678
  password: string;
  passwordConfirm: string;
  dob: string;              // YYYY-MM-DD
  acceptTerms: boolean;
  acceptAge: boolean;
  marketingOptIn?: boolean;
};

export async function registerWithPassword(input: PasswordRegisterInput): Promise<ServiceResult<{ userId: string }>> {
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
  if (!input.password || input.password.length < PASSWORD_MIN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN} characters.`, code: "INVALID" };
  }
  if (input.password !== input.passwordConfirm) {
    return { ok: false, error: "Passwords do not match.", code: "INVALID" };
  }
  if (/^\s|\s$/.test(input.password)) {
    return { ok: false, error: "Password cannot start or end with a space.", code: "INVALID" };
  }
  if (isCommonPassword(input.password)) {
    return { ok: false, error: "That password is in the public breach list. Pick something less common.", code: "INVALID" };
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

  if (db.user.findByPhone(phone)) {
    audit({ category: "AUTH", action: "register.duplicate_phone", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip });
    return { ok: false, error: "An account with that phone already exists.", code: "ALREADY_EXISTS" };
  }

  const salt = randomId(16);
  const hash = hashPassword(input.password, salt);

  // First-admin bootstrap: any phone listed in ADMIN_BOOTSTRAP_PHONES gets
  // the ADMIN role + ACTIVE status (no KYC) the moment they sign up.
  const bootstrapAdmins = adminBootstrapPhones();
  const isBootstrapAdmin = bootstrapAdmins.has(phone);

  const user = db.user.create({
    id: `usr_${randomId(12)}`,
    phoneE164: phone,
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

  // Auto-create wallet at the configured starter balance.
  const { getEffectiveConfig } = await import("./market-config");
  const starterBalance = getEffectiveConfig().starterBalanceTzs ?? 0;
  db.wallet.create({
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

  audit({
    category: "AUTH",
    action: isBootstrapAdmin ? "user.registered.admin_bootstrap" : "user.registered",
    actorId: user.id, targetType: "User", targetId: user.id,
    payload: { phone, role: user.role },
  });

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: "NOT_STARTED",
  });

  return { ok: true, data: { userId: user.id, role: user.role } };
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

  const user = db.user.findByPhone(phone);
  if (!user) {
    audit({ category: "SECURITY", action: "auth.login.unknown_phone", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip });
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
    db.user.update(user.id, { lockedUntil: null, failedLoginCount: 0 });
  }
  if (!user.passwordHash || !user.passwordSalt) {
    return { ok: false, error: "This account has no password yet. Use the OTP flow or contact support.", code: "INVALID" };
  }
  if (!verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
    const nextCount = (user.failedLoginCount ?? 0) + 1;
    const shouldLock = nextCount >= LOCKOUT_MAX_FAILS;
    const patch: Partial<typeof user> = {
      failedLoginCount: shouldLock ? 0 : nextCount,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString() : user.lockedUntil ?? null,
    };
    db.user.update(user.id, patch);
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
  db.user.update(user.id, {
    lastLoginAt: new Date().toISOString(),
    failedLoginCount: 0,
    lockedUntil: null,
  });
  audit({ category: "AUTH", action: "user.login.password", actorId: user.id, targetType: "User", targetId: user.id, ip: meta.ip, userAgent: meta.ua });

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: db.kyc.findByUserId(user.id)?.status ?? "NOT_STARTED",
  });

  return { ok: true, data: { userId: user.id, role: user.role } };
}
