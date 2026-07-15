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
import { createHmac, randomBytes, scrypt, scryptSync, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

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
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return `__build-phase-placeholder-${name}__`;
  }
  // In production, refuse to serve traffic without real secrets.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `FATAL: ${name} is not set. The server cannot start without it. ` +
      `Set it in Railway → service → Variables before deploying.`
    );
  }
  // Dev-only: deterministic fallback so local `npm run dev` works
  // without .env.local. NEVER used in production — the guard above
  // throws before this line is reached.
  return name === "SESSION_SECRET"
    ? "dev-only-secret-replace-in-prod-32chars-minimum"
    : "dev-only-pepper-replace-in-prod";
}

const sessionSecret = () => requireSecret("SESSION_SECRET");
const otpPepper     = () => requireSecret("OTP_PEPPER");

// ---------------------------------------------------------------------------
// Symmetric encryption at rest (AES-256-GCM) — for shared secrets we must be able
// to READ BACK (unlike passwords/OTPs, which are one-way hashed). Currently used
// for the TOTP secret column.
//
// Key: `TOTP_ENC_KEY` when set, else derived from `SESSION_SECRET` (already
// mandatory in production). Set TOTP_ENC_KEY explicitly if you ever intend to
// rotate SESSION_SECRET — rotating the session secret without it would make
// existing TOTP secrets undecryptable (players would fall back to their hashed
// backup codes and re-enroll; nothing is lost, but it is avoidable).
//
// Format: `v1.<iv>.<tag>.<ciphertext>` (base64url). Legacy rows hold a raw base32
// secret (A–Z2–7 only, never a "."), so `isEncrypted()` distinguishes them and the
// store transparently upgrades them on next read.
// ---------------------------------------------------------------------------
const ENC_V1 = "v1.";
let encKeyCache: Buffer | null = null;
function encKey(): Buffer {
  if (encKeyCache) return encKeyCache;
  const material = process.env.TOTP_ENC_KEY || sessionSecret();
  encKeyCache = scryptSync(material, "50pick-secret-enc-v1", 32);
  return encKeyCache;
}

/** True when `stored` is an AES-GCM envelope produced by `encryptSecret`. */
export function isEncrypted(stored: string): boolean {
  return stored.startsWith(ENC_V1);
}

/** Encrypt a readable-back secret (e.g. a TOTP seed) for storage at rest. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12); // GCM standard nonce length
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_V1}${iv.toString("base64url")}.${tag.toString("base64url")}.${ct.toString("base64url")}`;
}

/**
 * Decrypt a stored secret. Returns the plaintext, or null if the envelope is
 * malformed / tampered / encrypted under a different key (GCM auth failure).
 * Legacy plaintext values are NOT handled here — callers check `isEncrypted`.
 */
export function decryptSecret(stored: string): string | null {
  if (!isEncrypted(stored)) return null;
  try {
    const [, ivB64, tagB64, ctB64] = stored.split(".");
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null; // tampered or wrong key
  }
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
      return String(n % 1_000_000).padStart(6, "0");
    }
  }
}

/** Hash an OTP for storage (scrypt + pepper; we never store cleartext OTPs). */
export async function hashOtp(code: string, salt: string): Promise<string> {
  const derived = await scryptAsync(`${otpPepper()}:${code}`, salt, 32);
  return derived.toString("hex");
}

/** Constant-time OTP verify. */
export async function verifyOtp(code: string, salt: string, hashedHex: string): Promise<boolean> {
  const expected = await scryptAsync(`${otpPepper()}:${code}`, salt, 32);
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

/** Hash a password (scrypt + per-user salt). Async to avoid blocking the event loop. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = await scryptAsync(password, salt, 64);
  return derived.toString("hex");
}

export async function verifyPassword(password: string, salt: string, hashedHex: string): Promise<boolean> {
  const expected = await scryptAsync(password, salt, 64);
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
 * Timestamp is MANDATORY (audit C5). The replay window cannot be bypassed by
 * omitting the header, and the HMAC is computed OVER the timestamp (Stripe's
 * `${timestamp}.${body}` construction) so the timestamp cannot be stripped or
 * altered without invalidating the signature.
 */
export function verifyWebhookSignature(opts: {
  body: string;
  signatureHex: string;
  secret: string;
  /** ISO timestamp from the webhook header. REQUIRED — a missing timestamp is rejected. */
  timestamp?: string;
  maxSkewSec?: number;
}): { valid: boolean; reason?: string } {
  if (!opts.secret) return { valid: false, reason: "missing-secret" };
  if (!opts.signatureHex) return { valid: false, reason: "missing-signature" };
  // Reject non-hex early with a truthful reason (audit L1): Buffer.from(x,"hex")
  // silently drops invalid nibbles instead of throwing, so the old try/catch was
  // dead and the "bad-signature-encoding" reason was unreachable.
  if (!/^[0-9a-fA-F]+$/.test(opts.signatureHex)) return { valid: false, reason: "bad-signature-encoding" };
  // Timestamp is mandatory and must be fresh (audit C5).
  if (!opts.timestamp) return { valid: false, reason: "missing-timestamp" };
  const ts = Date.parse(opts.timestamp);
  if (Number.isNaN(ts)) return { valid: false, reason: "bad-timestamp" };
  const skew = Math.abs(Date.now() - ts) / 1000;
  if (skew > (opts.maxSkewSec ?? 300)) return { valid: false, reason: "stale-timestamp" };
  // HMAC over `${timestamp}.${body}` so the timestamp is bound to the signature.
  const expectedMac = createHmac("sha256", opts.secret).update(`${opts.timestamp}.${opts.body}`, "utf8").digest();
  const actualMac = Buffer.from(opts.signatureHex, "hex");
  if (expectedMac.length !== actualMac.length) return { valid: false, reason: "length-mismatch" };
  if (!timingSafeEqual(expectedMac, actualMac)) return { valid: false, reason: "signature-mismatch" };
  return { valid: true };
}

/** Helper for outbound signatures (test fixtures, dev tooling). Signs the same
 *  `${timestamp}.${body}` construction verifyWebhookSignature checks (audit C5). */
export function signWebhook(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
}
