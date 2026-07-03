"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setAffiliateConfig, type AffiliateConfig } from "@/lib/server/affiliate-config";
import { MONEY_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = MONEY_ROLES; // role tier — see @/lib/server/roles

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

export async function saveAffiliateConfigAction(config: AffiliateConfig) {
  const s = await ensureAdmin();
  await requireAdminTotp(s.userId, s.sessionId);
  const r = setAffiliateConfig(config, s.userId);
  revalidatePath("/admin/affiliate");
  revalidatePath("/profile/invite");
  return r;
}
