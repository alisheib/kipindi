/**
 * Player 2FA (F2a) — opt-in TOTP for players, layered on the existing admin-grade
 * TOTP engine (`totp.ts`) + one-time recovery codes (`backup-codes.ts`).
 *
 * State model:
 *  - A provisioned secret alone does NOT gate login. Login is challenged ONLY
 *    when `user.twoFactorEnabled === true` AND a secret exists — so an abandoned
 *    mid-enrollment never locks a player out.
 *  - `twoFactorEnabled` flips true only after the player proves possession
 *    (verifies a live code); backup codes are minted at that same moment.
 *  - Disable requires proof again (a current TOTP code or an unused backup code)
 *    so a hijacked live session cannot silently strip 2FA.
 *  - Enrolment is refused while 2FA is ON (A-X2): re-provisioning REPLACES the secret,
 *    so a hijacked session could swap the owner's authenticator for its own and then
 *    strip 2FA or void the backup codes for good. A flag with no secret is not "on",
 *    so an abandoned enrolment stays repairable.
 *  - Turning 2FA on asks for the current password first (A-X3,
 *    `startPlayer2faEnrolment`), so a session alone cannot enrol a stranger's
 *    authenticator and lock the owner out.
 *
 * Every transition is audited under SECURITY (mirrors the admin TOTP audit set).
 */
import { runOutsideLock } from "./locks";
import { provisionTotp, verifyTotp, removeTotp, hasTotp } from "./totp";
import { generateBackupCodes, remainingBackupCodes, consumeBackupCode, clearBackupCodes } from "./backup-codes";
import { db } from "./store";
import { audit } from "./audit";
import { verifyCurrentPassword } from "./reauth";

/**
 * Begin enrollment: provision a fresh secret and return the otpauth URI (QR).
 * Refused while 2FA is already ON: provisioning REPLACES the stored secret, so this
 * on a session alone would swap a live authenticator (the staff door already refuses
 * a rotation without a current code, `admin/2fa/setup/actions.ts`).
 */
export async function enrollPlayer2fa(userId: string): Promise<{ ok: true; secretBase32: string; otpauthUrl: string } | { ok: false; error: "already_enabled" }> {
  if (await is2faEnabled(userId)) {
    audit({ category: "SECURITY", action: "player.2fa.reenroll_refused", actorId: userId, targetType: "User", targetId: userId });
    return { ok: false, error: "already_enabled" };
  }
  const user = await db.user.findById(userId);
  const label = user?.phoneE164 || user?.displayName || userId;
  const provisioned = await provisionTotp(userId, label);
  return { ok: true, ...provisioned };
}

/**
 * The player's door into enrolment (A-X3): the current password first, then
 * `enrollPlayer2fa`. Already ON is answered before a re-auth token is spent. A
 * password-less account (the dormant OTP era) passes with no proof: it can already
 * set a first password with none, so asking here would add no protection (a
 * recorded residual).
 */
export async function startPlayer2faEnrolment(
  userId: string,
  currentPassword: unknown,
): Promise<{ ok: true; secretBase32: string; otpauthUrl: string } | { ok: false; error: "already_enabled" | "password_wrong" | "reauth_rate_limited"; retryAfterSec?: number }> {
  if (await is2faEnabled(userId)) {
    audit({ category: "SECURITY", action: "player.2fa.reenroll_refused", actorId: userId, targetType: "User", targetId: userId });
    return { ok: false, error: "already_enabled" };
  }
  const re = await verifyCurrentPassword(userId, currentPassword, "two_factor_enable");
  if (!re.ok) {
    if (re.code === "RATE_LIMITED") return { ok: false, error: "reauth_rate_limited", retryAfterSec: re.retryAfterSec };
    if (re.code !== "PW_NOT_SET") return { ok: false, error: "password_wrong" };
  }
  const e = await enrollPlayer2fa(userId);
  if (!e.ok) return { ok: false, error: "already_enabled" };
  return { ok: true, secretBase32: e.secretBase32, otpauthUrl: e.otpauthUrl };
}

/**
 * Confirm enrollment: verify the first live code, flip the enabled flag, and mint
 * one-time backup codes (returned once). Returns the plaintext codes to display.
 */
export async function confirmPlayer2fa(userId: string, code: string): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: "invalid-code" }> {
  const valid = await verifyTotp(userId, code);
  if (!valid) return { ok: false, error: "invalid-code" };
  await db.user.update(userId, { twoFactorEnabled: true });
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "TWO_FA_ON")).catch(() => {});
  });
  const backupCodes = await generateBackupCodes(userId);
  audit({ category: "SECURITY", action: "player.2fa.enabled", actorId: userId, targetType: "User", targetId: userId });
  return { ok: true, backupCodes };
}

/** Whether login must challenge this user (flag set AND a secret exists). */
export async function is2faEnabled(userId: string): Promise<boolean> {
  const user = await db.user.findById(userId);
  if (!user?.twoFactorEnabled) return false;
  return hasTotp(userId);
}

export type Player2faStatus = { enabled: boolean; backupRemaining: number };

export async function player2faStatus(userId: string): Promise<Player2faStatus> {
  const enabled = await is2faEnabled(userId);
  return { enabled, backupRemaining: enabled ? await remainingBackupCodes(userId) : 0 };
}

/**
 * Verify a login-time challenge: try the live TOTP first, then fall back to a
 * one-time backup code (which is consumed on success). Returns how it was
 * satisfied, or false. The CALLER must rate-limit this before invoking.
 */
export async function verifyPlayer2faChallenge(userId: string, code: string): Promise<"totp" | "backup" | false> {
  if (await verifyTotp(userId, code)) return "totp";
  if (await consumeBackupCode(userId, code)) return "backup";
  return false;
}

/**
 * Disable 2FA. Requires a valid current TOTP or unused backup code as proof, so a
 * live-session hijack cannot silently remove protection. Clears the secret + all
 * backup codes and lowers the flag.
 */
export async function disablePlayer2fa(userId: string, code: string): Promise<{ ok: boolean; error?: "invalid-code" | "not-enabled" }> {
  if (!(await is2faEnabled(userId))) return { ok: false, error: "not-enabled" };
  const proof = await verifyPlayer2faChallenge(userId, code);
  if (!proof) return { ok: false, error: "invalid-code" };
  await removeTotp(userId);
  await clearBackupCodes(userId);
  await db.user.update(userId, { twoFactorEnabled: false });
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "TWO_FA_OFF")).catch(() => {});
  });
  audit({ category: "SECURITY", action: "player.2fa.disabled", actorId: userId, targetType: "User", targetId: userId });
  return { ok: true };
}

/** Regenerate backup codes (requires an already-enabled account). Returns new set once. */
export async function regeneratePlayer2faBackupCodes(userId: string, code: string): Promise<{ ok: true; backupCodes: string[] } | { ok: false; error: "invalid-code" | "not-enabled" }> {
  if (!(await is2faEnabled(userId))) return { ok: false, error: "not-enabled" };
  // Proof required (a still-valid TOTP) — do NOT accept a backup code here, since
  // regenerating invalidates the old set and we don't want a leaked backup code to
  // rotate the codes out from under the real owner.
  if (!(await verifyTotp(userId, code))) return { ok: false, error: "invalid-code" };
  const backupCodes = await generateBackupCodes(userId);
  return { ok: true, backupCodes };
}
