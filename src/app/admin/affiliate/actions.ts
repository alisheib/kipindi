"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setAffiliateConfig, type AffiliateConfig } from "@/lib/server/affiliate-config";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function ensureAdmin() {
  return requireStaff("growth");
}

export async function saveAffiliateConfigAction(config: AffiliateConfig) {
  const s = await ensureAdmin();
  await requireAdminTotp(s.userId, s.sessionId);
  const r = setAffiliateConfig(config, s.userId);
  revalidatePath("/admin/affiliate");
  revalidatePath("/profile/invite");
  return r;
}
