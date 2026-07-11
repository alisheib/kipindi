"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { setProposalsConfig, type ProposalsConfig } from "@/lib/server/proposals-config";
import {
  approveProposal,
  goLiveProposal,
  requestChanges,
  declineProposal,
  editProposal,
  type DeclineReason,
  type EditProposalInput,
} from "@/lib/server/proposals-service";
import { MARKET_OPS_ROLES, MONEY_ROLES, CONFIG_ROLES, type Role } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

// Content ops (edit / go-live / request-changes / decline) are market-ops.
// Approving a proposal GRANTS a bonus (money) and setting the config changes the
// prize economics — those are re-tiered below to exclude MODERATOR (see roles.ts:
// money/economics are NEVER MODERATOR).
async function ensureAdmin(tier: Set<Role> = MARKET_OPS_ROLES) {
  const s = await currentSession();
  if (!s) redirect("/auth/admin");
  const u = await db.user.findById(s.userId);
  if (!u || !tier.has(u.role)) redirect("/auth/admin");
  await requireAdminTotp(s.userId, s.sessionId);
  return s;
}

export async function saveProposalsConfigAction(config: ProposalsConfig) {
  const s = await ensureAdmin(CONFIG_ROLES);
  try {
    const r = setProposalsConfig(config, s.userId);
    revalidatePath("/admin/proposals");
    revalidatePath("/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config save failed") };
  }
}

/** Approve a proposal and grant the proposer's bonus INSTANTLY (exactly-once).
 *  Does NOT publish a market — that's a separate step (goLiveProposalAction). */
export async function approveProposalAction(proposalId: string) {
  const s = await ensureAdmin(MONEY_ROLES);
  try {
    const r = await approveProposal(proposalId, s.userId);
    revalidatePath("/admin/proposals");
    revalidatePath("/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Approve failed") };
  }
}

/** Publish an APPROVED proposal live — creates the real market. No bonus here. */
export async function goLiveProposalAction(proposalId: string, sourceUrl: string) {
  const s = await ensureAdmin();
  try {
    const r = await goLiveProposal(proposalId, s.userId, sourceUrl);
    revalidatePath("/admin/proposals");
    revalidatePath("/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Go live failed") };
  }
}

/** Officer edit of a proposal's content (title, criterion, category, dates,
 *  betting-close, source). Full control before it goes live. */
export async function editProposalAction(proposalId: string, patch: EditProposalInput) {
  const s = await ensureAdmin();
  try {
    const r = await editProposal(proposalId, s.userId, patch);
    revalidatePath("/admin/proposals");
    revalidatePath("/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Edit failed") };
  }
}

export async function requestChangesAction(proposalId: string, note: string) {
  const s = await ensureAdmin();
  try {
    const r = await requestChanges(proposalId, s.userId, note);
    revalidatePath("/admin/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Request changes failed") };
  }
}

export async function declineProposalAction(proposalId: string, reason: DeclineReason, note: string) {
  const s = await ensureAdmin();
  try {
    const r = await declineProposal(proposalId, s.userId, reason, note);
    revalidatePath("/admin/proposals");
    revalidatePath("/proposals");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Decline failed") };
  }
}
