/**
 * F2a player 2FA — enrollment, login-challenge, backup codes, disable, and the
 * hardening/honesty invariants (in-memory store). Run: npx tsx scripts/player-2fa.test.mts
 *
 * Locks:
 *  - A provisioned-but-unconfirmed secret does NOT gate login (no lockout).
 *  - Enable requires a valid live code; backup codes minted at enable.
 *  - Login challenge accepts TOTP or a one-time backup code (consumed once).
 *  - Backup codes are single-use + format/case-insensitive + never re-usable.
 *  - Disable requires proof; regenerate invalidates the old set.
 *  - twoFactorEnabled=true with no secret still reports NOT enabled (fail-open to
 *    password-only rather than permanently locking the player out).
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { createHmac } from "node:crypto";
import {
  enrollPlayer2fa, confirmPlayer2fa, is2faEnabled, player2faStatus,
  verifyPlayer2faChallenge, disablePlayer2fa, regeneratePlayer2faBackupCodes,
} from "../src/lib/server/player-2fa.ts";
import { hasTotp } from "../src/lib/server/totp.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const nowIso = () => new Date().toISOString();
let seq = 0;

async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25595${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
}

// ── Local RFC-6238 generator (mirrors totp.ts exactly) to produce a valid code ──
function base32Decode(str: string): Buffer {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const s = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const c of s) { const i = A.indexOf(c); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; } }
  return Buffer.from(out);
}
function totpNow(secretB32: string, offsetSteps = 0): string {
  const secret = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30) + offsetSteps;
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, "0");
}

// ── 1. Enroll does NOT enable ──
await mkUser("tfa_a");
const { secretBase32 } = await enrollPlayer2fa("tfa_a");
ok("secret provisioned", secretBase32.length >= 16);
ok("hasTotp true after enroll", await hasTotp("tfa_a"));
ok("is2faEnabled FALSE before confirm (no lockout)", (await is2faEnabled("tfa_a")) === false);

// ── 2. Confirm requires a valid code ──
const good = totpNow(secretBase32);
const bad = good === "000000" ? "111111" : "000000";
{
  const r = await confirmPlayer2fa("tfa_a", bad);
  ok("confirm with wrong code rejected", r.ok === false);
  ok("still not enabled after bad confirm", (await is2faEnabled("tfa_a")) === false);
}
let backupCodes: string[] = [];
{
  const r = await confirmPlayer2fa("tfa_a", good);
  ok("confirm with valid code enables", r.ok === true);
  if (r.ok) backupCodes = r.backupCodes;
  ok("10 backup codes minted", backupCodes.length === 10, `n=${backupCodes.length}`);
  ok("is2faEnabled TRUE after confirm", (await is2faEnabled("tfa_a")) === true);
}
{
  const s = await player2faStatus("tfa_a");
  ok("status enabled + 10 backup remaining", s.enabled === true && s.backupRemaining === 10, `${JSON.stringify(s)}`);
}

// ── 3. Login challenge — TOTP path ──
ok("challenge accepts valid TOTP", (await verifyPlayer2faChallenge("tfa_a", totpNow(secretBase32))) === "totp");
ok("challenge rejects garbage", (await verifyPlayer2faChallenge("tfa_a", "424242")) === false);
ok("challenge rejects empty", (await verifyPlayer2faChallenge("tfa_a", "")) === false);

// ── 4. Backup codes — single-use, format/case-insensitive ──
{
  const code = backupCodes[0];
  const messy = code.toLowerCase().replace("-", ""); // lowercase, no dash
  ok("challenge accepts a backup code (normalized)", (await verifyPlayer2faChallenge("tfa_a", messy)) === "backup");
  ok("same backup code cannot be reused", (await verifyPlayer2faChallenge("tfa_a", code)) === false);
  const s = await player2faStatus("tfa_a");
  ok("backup remaining decremented to 9", s.backupRemaining === 9, `n=${s.backupRemaining}`);
}

// ── 5. Regenerate invalidates the old set (requires a valid TOTP, not a backup) ──
{
  const bad = await regeneratePlayer2faBackupCodes("tfa_a", "000000");
  ok("regenerate rejects bad code", bad.ok === false);
  const oldCode = backupCodes[1];
  const r = await regeneratePlayer2faBackupCodes("tfa_a", totpNow(secretBase32));
  ok("regenerate with valid TOTP ok", r.ok === true);
  const fresh = r.ok ? r.backupCodes : [];
  ok("fresh set is 10", fresh.length === 10);
  ok("OLD backup code no longer works", (await verifyPlayer2faChallenge("tfa_a", oldCode)) === false);
  ok("NEW backup code works", (await verifyPlayer2faChallenge("tfa_a", fresh[0])) === "backup");
}

// ── 6. Disable requires proof; clears everything ──
{
  const bad = await disablePlayer2fa("tfa_a", "000000");
  ok("disable rejects wrong code", bad.ok === false);
  ok("still enabled after failed disable", (await is2faEnabled("tfa_a")) === true);
  const good = await disablePlayer2fa("tfa_a", totpNow(secretBase32));
  ok("disable with valid code ok", good.ok === true);
  ok("is2faEnabled FALSE after disable", (await is2faEnabled("tfa_a")) === false);
  ok("secret removed after disable", (await hasTotp("tfa_a")) === false);
  const s = await player2faStatus("tfa_a");
  ok("no backup codes after disable", s.backupRemaining === 0);
}

// ── 7. Honesty: flag set but NO secret → NOT enabled (fail-open, never lock out) ──
await mkUser("tfa_b");
await db.user.update("tfa_b", { twoFactorEnabled: true }); // flag on, but never provisioned
ok("flag-only (no secret) → is2faEnabled false", (await is2faEnabled("tfa_b")) === false);

// ── 8. Never-enrolled user ──
await mkUser("tfa_c");
ok("never-enrolled → not enabled", (await is2faEnabled("tfa_c")) === false);
ok("never-enrolled challenge → false", (await verifyPlayer2faChallenge("tfa_c", "123456")) === false);

console.log(`\nplayer-2fa: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
