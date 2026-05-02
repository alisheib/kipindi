"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { backupNow } from "@/lib/server/backup";
import { verifyChain } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = db.user.findById(session.userId);
  if (!session.demoMode && !(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");
  return session;
}

export async function backupNowAction() {
  const session = await requireAdmin();
  const result = backupNow();
  if (result.ok) {
    audit({ category: "ADMIN", action: "backup.manual", actorId: session.userId, targetType: null, targetId: null, payload: { ts: result.ts } });
  }
  revalidatePath("/admin/system");
  return result;
}

export async function verifyChainAction() {
  const session = await requireAdmin();
  const result = verifyChain();
  audit({
    category: "ADMIN",
    action: "audit.chain.verified",
    actorId: session.userId,
    targetType: null,
    targetId: null,
    payload: result.valid ? { valid: true } : { valid: false, firstBreakAt: result.firstBreakAt, index: result.index },
  });
  return result;
}
