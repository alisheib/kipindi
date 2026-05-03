/**
 * Cryptographic helpers — Node built-ins only, no external deps.
 * Used for: HMAC-signed session cookies, OTP hashing, generic random IDs.
 *
 * Compliance notes (for regulator review):
 *  - All randomness from `crypto.randomBytes` (CSPRNG)
 *  - Password hashing uses scrypt (NIST SP 800-132, OWASP-recommended)
 *  - HMAC-SHA-256 for cookie integrity (>= 256-bit security)
 *  - Constant-time comparison via `timingSafeEqual` to prevent timing attacks
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Lazily resolve the secrets so module evaluation during `next build` (which sets
 * NODE_ENV=production while collecting page data) does not require the env vars
 * to be present yet. The guard still triggers at the first runtime use of any
 * signing or hashing path, so production servers refuse to actually serve traffic
 * without real secrets configured.
 */
function requireSecret(name: "SESSION_SECRET" | "OTP_PEPPER"): string {
  const v = process.env[name];
  if (v) return v;
  // Allow the build phase (page data collection) to evaluate modules without secrets.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error(`${name} must be set in production`);
  }
  return name === "SESSION_SECRET"
    ? "dev-only-secret-replace-in-prod-32chars-minimum"
    : "dev-only-pepper-replace-in-prod";
}

const sessionSecret = () => requireSecret("SESSION_SECRET");
const otpPepper     = () => requireSecret("OTP_PEPPER");

/** Generate a CSPRNG-backed random ID. */
export function randomId(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

/** Generate a 6-digit numeric OTP (CSPRNG-backed, no modulo bias). */
export function generateOtp(): string {
  while (true) {
    const buf = randomBytes(4);
    const n = buf.readUInt32BE(0);
    if (n < 4_000_000_000) {
      return String(n % 1_000_000).padStart(6, "0");
    }
  }
}

/** Hash an OTP for storage (scrypt + pepper; we never store cleartext OTPs). */
export function hashOtp(code: string, salt: string): string {
  const derived = scryptSync(`${otpPepper()}:${code}`, salt, 32);
  return derived.toString("hex");
}

/** Constant-time OTP verify. */
export function verifyOtp(code: string, salt: string, hashedHex: string): boolean {
  const expected = scryptSync(`${otpPepper()}:${code}`, salt, 32);
  const actual = Buffer.from(hashedHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** HMAC-sign an arbitrary JSON payload for a session cookie. */
export function signSession(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const mac = createHmac("sha256", sessionSecret()).update(b64).digest("base64url");
  return `${b64}.${mac}`;
}

/** Verify + parse a session cookie. Returns null on tamper / expiry. */
export function verifySession<T = Record<string, unknown>>(token: string | undefined): T | null {
  if (!token) return null;
  const [b64, mac] = token.split(".");
  if (!b64 || !mac) return null;
  const expected = createHmac("sha256", sessionSecret()).update(b64).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as T & { exp?: number };
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash a password (scrypt + per-user salt). */
export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password: string, salt: string, hashedHex: string): boolean {
  const expected = scryptSync(password, salt, 64);
  const actual = Buffer.from(hashedHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Verify an incoming webhook signature (HMAC-SHA-256, hex).
 *
 * The shared secret is the per-provider webhook secret negotiated when the
 * payment-aggregator agreement is signed. Caller MUST pass the secret name
 * (eg. `SELCOM_WEBHOOK_SECRET`) — we never default this for security.
 *
 * Includes optional timestamp staleness check (default 5 minutes) so a
 * captured-and-replayed payload from days ago is rejected.
 */
export function verifyWebhookSignature(opts: {
  body: string;
  signatureHex: string;
  secret: string;
  /** ISO timestamp from the webhook header, optional; if present, must be within `maxSkewSec`. */
  timestamp?: string;
  maxSkewSec?: number;
}): { valid: boolean; reason?: string } {
  if (!opts.secret) return { valid: false, reason: "missing-secret" };
  if (!opts.signatureHex) return { valid: false, reason: "missing-signature" };
  const expectedMac = createHmac("sha256", opts.secret).update(opts.body, "utf8").digest();
  let actualMac: Buffer;
  try {
    actualMac = Buffer.from(opts.signatureHex, "hex");
  } catch {
    return { valid: false, reason: "bad-signature-encoding" };
  }
  if (expectedMac.length !== actualMac.length) return { valid: false, reason: "length-mismatch" };
  if (!timingSafeEqual(expectedMac, actualMac)) return { valid: false, reason: "signature-mismatch" };
  if (opts.timestamp) {
    const ts = Date.parse(opts.timestamp);
    if (Number.isNaN(ts)) return { valid: false, reason: "bad-timestamp" };
    const skew = Math.abs(Date.now() - ts) / 1000;
    if (skew > (opts.maxSkewSec ?? 300)) return { valid: false, reason: "stale-timestamp" };
  }
  return { valid: true };
}

/** Helper for outbound signatures (test fixtures, dev tooling). */
export function signWebhook(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}
