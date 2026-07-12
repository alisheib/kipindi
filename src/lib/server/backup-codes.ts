/**
 * 2FA recovery/backup codes (F2a).
 *
 * A player enrolling in TOTP gets a set of one-time recovery codes so a lost
 * authenticator device is not a permanent lockout. Codes are shown ONCE in
 * plaintext at generation, then only ever stored HMAC-hashed (never plaintext,
 * never logged). Each code is single-use — consumed atomically on login.
 *
 * Storage mirrors totp.ts: Prisma `TotpBackupCode` rows in prod, a globalThis
 * Map in dev/in-memory. Hash = HMAC-SHA256(normalizedCode, OTP_PEPPER) — the same
 * pepper domain the OTP hashes use.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { audit } from "./audit";
import { prisma, hasDatabase } from "./prisma";

const CODE_COUNT = 10;
const BASE32 = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — human-legible

function pepper(): string {
  return process.env.OTP_PEPPER || "dev-only-pepper-replace-in-prod";
}

/** Strip formatting so "abcd-efghij" and "ABCDEFGHIJ" hash identically. */
function normalize(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashCode(code: string): string {
  return createHmac("sha256", pepper()).update(normalize(code)).digest("hex");
}

/** A human-legible 10-char code, grouped `XXXXX-XXXXX`. */
function genPlainCode(): string {
  const bytes = randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += BASE32[bytes[i] % BASE32.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

/** Constant-time hex compare (both are fixed-length HMAC hex). */
function hashEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------------------
// DAL abstraction (Prisma + in-memory twin)
// ---------------------------------------------------------------------------

type Row = { hash: string; used: boolean };

interface BackupStore {
  replace(userId: string, hashes: string[]): Promise<void>;
  remaining(userId: string): Promise<number>;
  /** Marks exactly one unused matching code used; returns true if one was consumed. */
  consume(userId: string, hash: string): Promise<boolean>;
  clear(userId: string): Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_BACKUP_CODES: Map<string, Row[]> | undefined;
}
const mem: Map<string, Row[]> =
  globalThis.__50PICK_BACKUP_CODES ?? (globalThis.__50PICK_BACKUP_CODES = new Map());

const memoryStore: BackupStore = {
  async replace(userId, hashes) { mem.set(userId, hashes.map((h) => ({ hash: h, used: false }))); },
  async remaining(userId) { return (mem.get(userId) ?? []).filter((r) => !r.used).length; },
  async consume(userId, hash) {
    const rows = mem.get(userId) ?? [];
    const row = rows.find((r) => !r.used && hashEquals(r.hash, hash));
    if (!row) return false;
    row.used = true;
    return true;
  },
  async clear(userId) { mem.delete(userId); },
};

function pc() {
  const c = prisma();
  if (!c) throw new Error("backup-codes: DATABASE_URL required");
  return c;
}

const prismaStore: BackupStore = {
  async replace(userId, hashes) {
    await pc().totpBackupCode.deleteMany({ where: { userId } });
    await pc().totpBackupCode.createMany({ data: hashes.map((codeHash) => ({ userId, codeHash })) });
  },
  async remaining(userId) {
    return pc().totpBackupCode.count({ where: { userId, usedAt: null } });
  },
  async consume(userId, hash) {
    // Atomic single-consume: only rows that are still unused are eligible; the
    // updateMany count tells us whether exactly one was claimed. codeHash is a
    // high-entropy HMAC so an equality match is a safe lookup (no timing leak of
    // the plaintext — the plaintext never reaches the DB).
    const res = await pc().totpBackupCode.updateMany({
      where: { userId, codeHash: hash, usedAt: null },
      data: { usedAt: new Date() },
    });
    return res.count > 0;
  },
  async clear(userId) {
    await pc().totpBackupCode.deleteMany({ where: { userId } }).catch(() => {});
  },
};

const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";
const store: BackupStore = usePrisma ? prismaStore : memoryStore;

/**
 * Generate a fresh set of backup codes, replacing any existing ones. Returns the
 * plaintext codes to show the player ONCE — they are never retrievable again.
 */
export async function generateBackupCodes(userId: string): Promise<string[]> {
  const plain = Array.from({ length: CODE_COUNT }, genPlainCode);
  await store.replace(userId, plain.map(hashCode));
  audit({ category: "SECURITY", action: "player.2fa.backup_codes_generated", actorId: userId, targetType: "User", targetId: userId, payload: { count: CODE_COUNT } });
  return plain;
}

export async function remainingBackupCodes(userId: string): Promise<number> {
  return store.remaining(userId);
}

/**
 * Consume one backup code. Returns true if a valid unused code was matched and
 * marked used. Rejects blank / malformed input. Never logs the code.
 */
export async function consumeBackupCode(userId: string, code: string): Promise<boolean> {
  const norm = normalize(code);
  if (norm.length < 8) return false; // reject empty / obviously-too-short input
  const ok = await store.consume(userId, hashCode(code));
  audit({ category: "SECURITY", action: ok ? "player.2fa.backup_code_used" : "player.2fa.backup_code_failed", actorId: userId, targetType: "User", targetId: userId });
  return ok;
}

export async function clearBackupCodes(userId: string): Promise<void> {
  await store.clear(userId);
}
