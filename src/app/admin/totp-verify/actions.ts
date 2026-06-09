"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { verifyTotp } from "@/lib/server/totp";
import { audit } from "@/lib/server/audit";
import { signSession } from "@/lib/server/crypto";
import { rateCheck } from "@/lib/server/rate-limit";
import { TOTP_COOKIE_NAME, TOTP_TTL_SEC } from "@/lib/server/totp-cookie";

export async function verifyAdminTotpAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");

  // Rate limit TOTP verification — prevents brute-forcing the 6-digit code.
  const rl = rateCheck(session.userId, "totp.verify");
  if (!rl.allowed) {
    audit({
      category: "SECURITY",
      action: "admin.totp.rate_limited",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
    });
    return { ok: false as const, error: `Too many attempts. Wait ${rl.retryAfterSec}s and try again.` };
  }

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "Enter the 6-digit code from your authenticator app." };
  }
  const ok = verifyTotp(session.userId, code);
  if (!ok) {
    audit({
      category: "SECURITY",
      action: "admin.totp.failed",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
    });
    return { ok: false as const, error: "Code didn't match. Codes refresh every 30 seconds." };
  }
  // Issue a signed admin-totp cookie bound to this specific user + session.
  // A plain "1" value would be trivially forgeable via subdomain injection
  // or any cookie-setting vector, letting an attacker bypass 2FA entirely.
  const payload = {
    userId: session.userId,
    sessionId: session.sessionId,
    verifiedAt: Date.now(),
    exp: Date.now() + TOTP_TTL_SEC * 1000,
  };
  const jar = await cookies();
  jar.set(TOTP_COOKIE_NAME, signSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOTP_TTL_SEC,
  });
  audit({
    category: "SECURITY",
    action: "admin.totp.verified",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
  });
  redirect("/admin");
}
