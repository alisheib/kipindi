"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import {
  approveAndList,
  requestChanges,
  declineProposal,
  type DeclineReason,
} from "@/lib/server/proposals-service";

const ADMIN_ROLES = new Set(["ADMIN", "COMPLIANCE", "MODERATOR"]);

async function ensureAdmin() {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !ADMIN_ROLES.has(u.role)) redirect("/auth/admin");
  return s;
}

export async function saveProposalsConfigAction(config: ProposalsConfig) {
  const s = await ensureAdmin();
  const r = setProposalsConfig(config, s.userId);
  revalidatePath("/admin/proposals");
  revalidatePath("/proposals");
  return r;
}

export async function approveProposalAction(proposalId: string) {
  const s = await ensureAdmin();
  const r = await approveAndList(proposalId, s.userId);
  revalidatePath("/admin/proposals");
  revalidatePath("/proposals");
  return r;
}

export async function requestChangesAction(proposalId: string, note: string) {
  const s = await ensureAdmin();
  const r = requestChanges(proposalId, s.userId, note);
  revalidatePath("/admin/proposals");
  return r;
}

export async function declineProposalAction(proposalId: string, reason: DeclineReason, note: string) {
  const s = await ensureAdmin();
  const r = declineProposal(proposalId, s.userId, reason, note);
  revalidatePath("/admin/proposals");
  revalidatePath("/proposals");
  return r;
}
