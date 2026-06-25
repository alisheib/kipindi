"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setCreditTopup } from "@/lib/server/ai-usage";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

/** Log a credit top-up (USD) so the dashboard can estimate remaining balance =
 *  top-up − metered spend since this moment. */
export async function setCreditTopupAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  await ensureAdmin();
  const raw = String(fd.get("amountUsd") ?? "").trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Enter a valid amount in USD." };
  }
  await setCreditTopup(amount);
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}
