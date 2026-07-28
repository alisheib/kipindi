"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { requireStaff } from "@/lib/server/rbac-guard";
import { upholdObjection, rejectObjection } from "@/lib/server/objections-service";
import type { ObjectionRemedy } from "@/lib/server/store";

/**
 * Objections are gated at COMPLIANCE_ROLES — NOT the broader MARKET_OPS tier.
 *
 * Upholding an objection re-directs real money (it VOIDs a market and refunds
 * every stake, or REVERSEs the verdict so the other side is paid). That is the
 * same class of act as emergencyVoidMarket, which the service already restricts
 * to ADMIN/COMPLIANCE — so a MODERATOR must not be able to reach it here either.
 */
// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function requireOfficer() {
  return requireStaff("compliance");
}

/**
 * UPHOLD — the player was right. Only reachable while the market is unsettled,
 * which is precisely what the settlement gate buys us: the pool is still whole,
 * so the verdict can genuinely be corrected instead of clawed back.
 */
export async function upholdObjectionAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOfficer();
  await requireAdminTotp(session.userId, session.sessionId);

  const objectionId = String(formData.get("objectionId") ?? "");
  const remedy = String(formData.get("remedy") ?? "") as ObjectionRemedy;
  const note = String(formData.get("note") ?? "");

  if (!objectionId) return { ok: false, error: "Missing objection id." };
  if (remedy !== "VOID" && remedy !== "REVERSE") return { ok: false, error: "Pick a remedy: VOID or REVERSE." };

  const r = await upholdObjection(objectionId, session.userId, { remedy, note });
  if (!r.ok) return { ok: false, error: r.error };

  revalidatePath("/admin/objections");
  revalidatePath("/admin/resolver-queue");
  return { ok: true };
}

/** REJECT — the verdict stands. This releases the settlement freeze. */
export async function rejectObjectionAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireOfficer();
  await requireAdminTotp(session.userId, session.sessionId);

  const objectionId = String(formData.get("objectionId") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!objectionId) return { ok: false, error: "Missing objection id." };

  const r = await rejectObjection(objectionId, session.userId, note);
  if (!r.ok) return { ok: false, error: r.error };

  revalidatePath("/admin/objections");
  return { ok: true };
}
