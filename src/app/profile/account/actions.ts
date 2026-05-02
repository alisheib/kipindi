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
    filename: `kipindi-data-${session.userId}-${new Date().toISOString().slice(0, 10)}.json`,
  };
}

export async function closeAccountAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "CLOSE MY ACCOUNT") {
    return { ok: false as const, error: "Type CLOSE MY ACCOUNT to confirm." };
  }
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const result = await closeAccount(session.userId, reason || undefined);
  if (!result.ok) return { ok: false as const, error: result.error };
  redirect("/auth/login?closed=1");
}
