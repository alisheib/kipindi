"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { closeAccount, exportUserData } from "@/lib/server/user-service";
import { audit } from "@/lib/server/audit";

export async function exportDataAction(): Promise<{ ok: true; payload: string; filename: string } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const data = exportUserData(session.userId);
  audit({
    category: "COMPLIANCE",
    action: "user.data.exported",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
  });
  return {
    ok: true,
    payload: JSON.stringify(data, null, 2),
    filename: `50pick-data-${session.userId}-${new Date().toISOString().slice(0, 10)}.json`,
  };
}

export async function changePasswordAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("new") ?? "");
  const { changePassword } = await import("@/lib/server/password-reset");
  return changePassword(session.userId, current, next);
}

export async function closeAccountAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "CLOSE MY ACCOUNT") {
    redirect(`/profile/account?error=${encodeURIComponent("Type CLOSE MY ACCOUNT exactly to confirm.")}`);
  }
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const result = await closeAccount(session.userId, reason || undefined);
  if (!result.ok) redirect(`/profile/account?error=${encodeURIComponent(result.error)}`);
  redirect("/auth/login?closed=1");
}
