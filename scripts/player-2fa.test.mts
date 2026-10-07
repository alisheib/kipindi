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
 *  - A-X2 · no re-enrolment over a live authenticator: the original secret and backup
 *    codes keep working, and the refusal is audited (§9).
 *  - A-X3 · turning 2FA on needs the current password; a password-less account is the
 *    recorded residual (§10). The security page is wired through that door (§11).
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  enrollPlayer2fa, confirmPlayer2fa, is2faEnabled, player2faStatus,
  verifyPlayer2faChallenge, disablePlayer2fa, regeneratePlayer2faBackupCodes,
  startPlayer2faEnrolment,
} from "../src/lib/server/player-2fa.ts";
import { hasTotp } from "../src/lib/server/totp.ts";
import { db } from "../src/lib/server/store.ts";
import { hashPassword } from "../src/lib/server/crypto.ts";
import { auditFlush, getAuditForActor } from "../src/lib/server/audit.ts";
import { decomment } from "./lib/decomment.mts";

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
const enr = await enrollPlayer2fa("tfa_a"); const secretBase32 = enr.ok ? enr.secretBase32 : "";
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

// ── 9. A-X2 · no re-enrolment over a live authenticator ──
// Provisioning REPLACES the stored secret. Before the guard a session alone re-provisioned while
// 2FA was ON: the owner's authenticator stopped answering, the intruder's started, and the
// intruder could then strip 2FA or void the backup codes for good.
await mkUser("tfa_d");
{
  const first = await enrollPlayer2fa("tfa_d");
  const original = first.ok ? first.secretBase32 : "";
  ok("9.0 a fresh account enrols", first.ok === true && original.length >= 16);
  const conf = await confirmPlayer2fa("tfa_d", totpNow(original));
  const codes = conf.ok ? conf.backupCodes : [];
  ok("9.1 tfa_d is ON, with 10 backup codes", conf.ok === true && codes.length === 10 && (await is2faEnabled("tfa_d")) === true);

  const again = await enrollPlayer2fa("tfa_d");
  ok("9.2 re-enrolment over a live authenticator is refused (already_enabled)",
    again.ok === false && again.error === "already_enabled", JSON.stringify(again));
  ok("9.3 …and hands back no secret and no QR", !("secretBase32" in again) && !("otpauthUrl" in again));
  ok("9.4 a code from the ORIGINAL secret still answers totp", (await verifyPlayer2faChallenge("tfa_d", totpNow(original))) === "totp");
  ok("9.5 an ORIGINAL backup code still answers backup", (await verifyPlayer2faChallenge("tfa_d", codes[0])) === "backup");
  ok("9.6 the authenticator is still provisioned (hasTotp)", (await hasTotp("tfa_d")) === true);
  ok("9.7 …and 2FA is still ON", (await is2faEnabled("tfa_d")) === true);

  // The player's door answers the same, and BEFORE the current-password check: no re-auth token
  // is spent and no bad-password attempt is recorded against the owner.
  const door = await startPlayer2faEnrolment("tfa_d", "not-the-password");
  ok("9.8 the player's door refuses too — already_enabled, not password_wrong",
    door.ok === false && door.error === "already_enabled", JSON.stringify(door));
  ok("9.9 …and the original secret still answers after the door's refusal",
    (await verifyPlayer2faChallenge("tfa_d", totpNow(original))) === "totp");
  await auditFlush();
  const trail = getAuditForActor("tfa_d", 500);
  const refusals = trail.filter((e) => e.action === "player.2fa.reenroll_refused").length;
  ok("9.10 both refusals are audited under SECURITY (player.2fa.reenroll_refused)",
    refusals === 2 && trail.filter((e) => e.action === "player.2fa.reenroll_refused").every((e) => e.category === "SECURITY"), `n=${refusals}`);
  ok("9.11 the door's refusal ran no current-password check (no auth.reauth.* entry)",
    !trail.some((e) => e.action.startsWith("auth.reauth.")));
}
{
  // Section 7's flag-only user: a flag with no secret is not ON, so an abandoned enrolment stays repairable.
  const r = await enrollPlayer2fa("tfa_b");
  ok("9.12 a flag-only account (no secret) can still enrol", r.ok === true && r.secretBase32.length >= 16, JSON.stringify(r.ok));
}

// ── 10. A-X3 · turning 2FA on needs the current password ──
// A session alone used to be enough, so an intruder could enrol THEIR authenticator and lock the
// owner out for good. `auth.reauth` holds 5 attempts per account; each user below stays inside it
// except tfa_g, which spends it on purpose.
const PW = "Correct-Horse-Battery-9";
const SALT = "tfa-fixed-salt-0001";
async function mkPasswordUser(id: string): Promise<void> {
  await mkUser(id);
  await db.user.update(id, { passwordSalt: SALT, passwordHash: await hashPassword(PW, SALT) });
}
await mkPasswordUser("tfa_e");
{
  const wrong = await startPlayer2faEnrolment("tfa_e", "wrong");
  ok("10.1 a wrong current password is refused (password_wrong)",
    wrong.ok === false && wrong.error === "password_wrong", JSON.stringify(wrong));
  ok("10.2 …and nothing was provisioned", (await hasTotp("tfa_e")) === false);
  const empty = await startPlayer2faEnrolment("tfa_e", "");
  ok("10.3 an empty password is refused on an account that has one",
    empty.ok === false && empty.error === "password_wrong", JSON.stringify(empty));
  const notText = await startPlayer2faEnrolment("tfa_e", 12345);
  ok("10.4 a non-string password is refused",
    notText.ok === false && notText.error === "password_wrong", JSON.stringify(notText));
  ok("10.5 …and still nothing was provisioned", (await hasTotp("tfa_e")) === false);
  const right = await startPlayer2faEnrolment("tfa_e", PW);
  ok("10.6 the current password opens enrolment, with a QR URI",
    right.ok === true && right.otpauthUrl.startsWith("otpauth://totp/") && right.secretBase32.length >= 16, JSON.stringify(right.ok));
  ok("10.7 …and provisions the authenticator", (await hasTotp("tfa_e")) === true);
  ok("10.8 …which is not ON until a live code is confirmed", (await is2faEnabled("tfa_e")) === false);
}
await mkUser("tfa_f");
{
  const r = await startPlayer2faEnrolment("tfa_f", "");
  ok("10.9 a password-less account (dormant OTP era) enrols with no proof — the recorded residual",
    r.ok === true && r.otpauthUrl.startsWith("otpauth://totp/"), JSON.stringify(r.ok));
  ok("10.10 …and is provisioned", (await hasTotp("tfa_f")) === true);
}
await mkPasswordUser("tfa_g");
{
  let last: Awaited<ReturnType<typeof startPlayer2faEnrolment>> | null = null;
  for (let i = 0; i < 6; i++) last = await startPlayer2faEnrolment("tfa_g", "wrong");
  ok("10.11 the sixth wrong attempt is rate-limited, with the server's wait",
    last !== null && last.ok === false && last.error === "reauth_rate_limited" && (last.retryAfterSec ?? 0) >= 1, JSON.stringify(last));
  const right = await startPlayer2faEnrolment("tfa_g", PW);
  ok("10.12 …and while limited even the RIGHT password does not open enrolment",
    right.ok === false && right.error === "reauth_rate_limited", JSON.stringify(right));
  ok("10.13 …so nothing was provisioned", (await hasTotp("tfa_g")) === false);
}

// ── 11. Static wiring (decommented) ──
{
  const src = (rel: string) => decomment(readFileSync(new URL(rel, import.meta.url), "utf8"));
  const ACT = src("../src/app/profile/security/actions.ts");
  const CLI = src("../src/app/profile/security/security-client.tsx");
  const PAGE = src("../src/app/profile/security/page.tsx");
  ok("11.0 CONTROL · the scan read the real action file", ACT.includes("export async function startEnrollAction(") && ACT.includes("getSession("));
  ok("11.1 the security action enrols through the password door (startPlayer2faEnrolment)", ACT.includes("startPlayer2faEnrolment("));
  ok("11.2 …and never calls the bare enrolment (enrollPlayer2fa)", !ACT.includes("enrollPlayer2fa("));
  ok("11.3 the client asks for the CURRENT password (autocomplete current-password)", CLI.includes("current-password"));
  ok("11.4 …and says why (t.common.reauthHint)", CLI.includes("t.common.reauthHint"));
  ok("11.5 the page tells the client whether the account has a password", PAGE.includes("hasPassword={"));
}

console.log(`\nplayer-2fa: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
