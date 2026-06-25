"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setCreditLimit, resetCreditCycle } from "@/lib/server/ai-usage";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

/** Set the per-cycle spend limit (USD). Admins are emailed at ~80% and at 100%. */
export async function setCreditLimitAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  await ensureAdmin();
  const raw = String(fd.get("limitUsd") ?? "").trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid limit in USD (e.g. 20)." };
  }
  await setCreditLimit(amount);
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}

/** Start a fresh spend cycle (call right after topping up Anthropic credit).
 *  Resets "spent this cycle" to 0 and re-arms the limit alerts. */
export async function resetCreditCycleAction(): Promise<{ ok: boolean; error?: string }> {
  await ensureAdmin();
  await resetCreditCycle();
  revalidatePath("/admin/ai-usage");
  return { ok: true };
}
