/**
 * TOTP (RFC 6238) — Time-based One-Time Passwords for admin / compliance 2FA.
 *
 * Pure Node implementation, no external deps. Uses HMAC-SHA1 (the RFC default —
 * Google Authenticator, Authy, 1Password all support it). 6-digit codes, 30s window,
 * ±1 step tolerance for clock skew.
 *
 * Security:
 *  - Secrets stored in `globalThis.__50PICK_STORE.totpSecrets` Map (production:
 *    encrypted column on User row, AES-256-GCM at rest).
 *  - QR-code provisioning URI follows otpauth:// standard so any compliant
 *    authenticator app accepts it without manual entry.
 *  - Verification is constant-time via `timingSafeEqual`.
 *  - Replay protection: a one-step window once-used can be tracked, but for
 *    admin 2FA we accept that the user uses each code once within the 30s.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { audit } from "./audit";

const STEP_SECONDS = 30;
const DIGITS = 6;
const SKEW_STEPS = 1;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_STORE: any | undefined;
}

function ensureMap(): Map<string, string> {
  if (!globalThis.__50PICK_STORE) globalThis.__50PICK_STORE = {};
  if (!globalThis.__50PICK_STORE.totpSecrets) {
    globalThis.__50PICK_STORE.totpSecrets = new Map<string, string>();
  }
  return globalThis.__50PICK_STORE.totpSecrets;
}

/** RFC 4648 base32 encode (no padding chars stripped, since otpauth tolerates either). */
function base32Encode(buf: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of cleaned) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpAt(secret: Buffer, time: number): string {
  const counter = Math.floor(time / STEP_SECONDS);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = String(binCode % 10 ** DIGITS).padStart(DIGITS, "0");
  return code;
}

/**
 * Provision a fresh TOTP secret for `userId` and return the otpauth URI for
 * QR-code rendering. Existing secret (if any) is replaced.
 */
export function provisionTotp(userId: string, accountLabel: string, issuer = "50pick"): { secretBase32: string; otpauthUrl: string } {
  const secret = randomBytes(20);
  const secretBase32 = base32Encode(secret);
  ensureMap().set(userId, secretBase32);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  const url = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountLabel)}?${params.toString()}`;
  audit({
    category: "SECURITY",
    action: "totp.provisioned",
    actorId: userId,
    targetType: "User",
    targetId: userId,
  });
  return { secretBase32, otpauthUrl: url };
}

export function hasTotp(userId: string): boolean {
  return ensureMap().has(userId);
}

export function removeTotp(userId: string): void {
  ensureMap().delete(userId);
  audit({ category: "SECURITY", action: "totp.removed", actorId: userId, targetType: "User", targetId: userId });
}

/**
 * Verify a 6-digit code against the user's stored secret.
 * Returns true if any of the windows in [-SKEW_STEPS .. +SKEW_STEPS] matches.
 */
export function verifyTotp(userId: string, code: string): boolean {
  const secretBase32 = ensureMap().get(userId);
  if (!secretBase32) return false;
  const secret = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  const provided = code.trim();
  if (!/^\d{6}$/.test(provided)) return false;
  for (let i = -SKEW_STEPS; i <= SKEW_STEPS; i++) {
    const expected = totpAt(secret, now + i * STEP_SECONDS);
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
