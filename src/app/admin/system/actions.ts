"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChain } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/login");
  return session;
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
