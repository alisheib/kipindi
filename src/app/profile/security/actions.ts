"use server";

import { getSession } from "@/lib/server/session";
import { rateCheck } from "@/lib/server/rate-limit";
import {
  enrollPlayer2fa, confirmPlayer2fa, disablePlayer2fa, regeneratePlayer2faBackupCodes,
} from "@/lib/server/player-2fa";

/** Begin enrollment — provision a secret + return the otpauth URI for the QR. */
export async function startEnrollAction(): Promise<{ ok: boolean; otpauthUrl?: string; secret?: string; error?: string }> {
  const s = await getSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const { otpauthUrl, secretBase32 } = await enrollPlayer2fa(s.userId);
  return { ok: true, otpauthUrl, secret: secretBase32 };
}

/** Confirm the first live code → enable 2FA → return the one-time backup codes. */
export async function confirmEnrollAction(code: string): Promise<{ ok: boolean; backupCodes?: string[]; error?: string }> {
  const s = await getSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const rl = rateCheck(s.userId, "totp.verify");
  if (!rl.allowed) return { ok: false, error: "rate_limited" };
  const res = await confirmPlayer2fa(s.userId, code);
  return res.ok ? { ok: true, backupCodes: res.backupCodes } : { ok: false, error: "invalid" };
}

/** Disable 2FA — requires a valid current TOTP or unused backup code as proof. */
export async function disable2faAction(code: string): Promise<{ ok: boolean; error?: string }> {
  const s = await getSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const rl = rateCheck(s.userId, "totp.verify");
  if (!rl.allowed) return { ok: false, error: "rate_limited" };
  const res = await disablePlayer2fa(s.userId, code);
  return res.ok ? { ok: true } : { ok: false, error: res.error === "not-enabled" ? "not_enabled" : "invalid" };
}

/** Regenerate backup codes — requires a valid current TOTP (not a backup code). */
export async function regenerateBackupCodesAction(code: string): Promise<{ ok: boolean; backupCodes?: string[]; error?: string }> {
  const s = await getSession();
  if (!s) return { ok: false, error: "unauthorized" };
  const rl = rateCheck(s.userId, "totp.verify");
  if (!rl.allowed) return { ok: false, error: "rate_limited" };
  const res = await regeneratePlayer2faBackupCodes(s.userId, code);
  return res.ok ? { ok: true, backupCodes: res.backupCodes } : { ok: false, error: "invalid" };
}
