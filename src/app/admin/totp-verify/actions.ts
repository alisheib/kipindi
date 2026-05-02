"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentSession } from "@/lib/server/auth-service";
import { verifyTotp } from "@/lib/server/totp";
import { audit } from "@/lib/server/audit";

const COOKIE_NAME = "kp_admin_totp";
const TTL_SEC = 60 * 60 * 8; // 8 hours

export async function verifyAdminTotpAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
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
  // Issue admin-totp cookie
  const jar = await cookies();
  jar.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SEC,
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
