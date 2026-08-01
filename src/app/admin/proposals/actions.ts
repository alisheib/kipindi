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
import { type AdminDomain } from "@/lib/server/roles";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN, type ControlId } from "@/lib/server/control-gates";

// RBAC: content ops (edit / go-live / request-changes / decline) are `trading`; the
// config save changes prize economics → `accounting`; approving a proposal GRANTS a
// bonus reward → `growth`. requireStaff enforces canAct for the domain (Owner/ADMIN
// bypass — money/economics stay off Trading by default), audits, then step-up 2FA.
/**
 * ⛔ E-27. Two of this file's actions demand a domain `/admin/proposals` (a `trading`
 * route) cannot see, so the page must be able to ask the same question before rendering
 * the control — hence the domain comes from `CONTROL_DOMAIN` and the control NAMES itself,
 * so a blocked attempt is audited as that control rather than as a bare domain.
 */
async function ensureAdmin(domain: AdminDomain = "trading", control?: ControlId) {
  return requireStaff(domain, control);
}

export async function saveProposalsConfigAction(config: ProposalsConfig) {
  const s = await ensureAdmin(CONTROL_DOMAIN.saveProposalsConfig, "saveProposalsConfig"); // prize economics (money-grade)
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
  const s = await ensureAdmin(CONTROL_DOMAIN.approveProposal, "approveProposal"); // grants a bonus reward
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
