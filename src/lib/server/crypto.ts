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

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-secret-replace-in-prod-32chars-minimum";
const OTP_PEPPER = process.env.OTP_PEPPER || "dev-only-pepper-replace-in-prod";

if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET must be set in production");
  if (!process.env.OTP_PEPPER) throw new Error("OTP_PEPPER must be set in production");
}

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
      // Limit to 6 digits 000000-999999
      return String(n % 1_000_000).padStart(6, "0");
    }
  }
}

/** Hash an OTP for storage (scrypt + pepper; we never store cleartext OTPs). */
export function hashOtp(code: string, salt: string): string {
  const derived = scryptSync(`${OTP_PEPPER}:${code}`, salt, 32);
  return derived.toString("hex");
}

/** Constant-time OTP verify. */
export function verifyOtp(code: string, salt: string, hashedHex: string): boolean {
  const expected = scryptSync(`${OTP_PEPPER}:${code}`, salt, 32);
  const actual = Buffer.from(hashedHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** HMAC-sign an arbitrary JSON payload for a session cookie. */
export function signSession(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const mac = createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
  return `${b64}.${mac}`;
}

/** Verify + parse a session cookie. Returns null on tamper / expiry. */
export function verifySession<T = Record<string, unknown>>(token: string | undefined): T | null {
  if (!token) return null;
  const [b64, mac] = token.split(".");
  if (!b64 || !mac) return null;
  const expected = createHmac("sha256", SESSION_SECRET).update(b64).digest("base64url");
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
