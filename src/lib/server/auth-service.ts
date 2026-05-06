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
import { generateOtp, hashOtp, randomId, verifyOtp } from "./crypto";
import { rateCheck } from "./rate-limit";
import { sms, otpMessage } from "./sms";
import { LoginRequestSchema, OtpVerifySchema, RegisterSchema } from "./validators";
import type { z } from "zod";
import { createSession, destroySession, getSession, type SessionData } from "./session";

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
    // Don't leak existence — return success but don't actually send.
    audit({ category: "SECURITY", action: "otp.send_to_unknown_phone", actorId: null, targetType: "Phone", targetId: phone, ip: meta.ip, userAgent: meta.ua });
    return { ok: true, data: { otpId: "noop" } };
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

const pendingRegistration = new Map<string, { dob: string; marketingOptIn: boolean }>();

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
    // Auto-create wallet
    const { db: dbRef } = await import("./store");
    dbRef.wallet.create({
      id: `wlt_${randomId(12)}`,
      userId: user.id,
      balance: 0, pending: 0, hold: 0,
      currency: "TZS", status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
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
