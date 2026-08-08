"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { createProposal, castVote, proposalsBlockedReason, type CreateProposalInput } from "@/lib/server/proposals-service";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";

/**
 * Cast / toggle / clear a vote on a proposal. Returns the new tallies.
 * No revalidatePath here on purpose: the VoteControl updates optimistically
 * and the vote is persisted server-side, so refetching the whole board on
 * every click would only cause churn. Fresh counts load on next navigation.
 */
export async function voteAction(proposalId: string, dir: "up" | "down" | null) {
  const s = await currentSession();
  // B-7 — carry a code so VoteControl renders its own localized line.
  if (!s) return { ok: false as const, error: "Sign in to vote.", code: "AUTH" as const };
  const r = await castVote(s.userId, proposalId, dir);
  if (r.ok) return r;
  // castVote's refusals: the feature gate (any proposalsBlockedReason phrasing),
  // voting closed, or a missing proposal.
  const code =
    /unavailable|available right now|coming soon/i.test(r.error) ? ("PAUSED" as const) :
    /voting has closed/i.test(r.error) ? ("VOTING_CLOSED" as const) : ("NOT_FOUND" as const);
  return { ...r, code };
}

/** Submit a new proposal. Returns the new id on success (client shows the modal). */
export async function createProposalAction(input: CreateProposalInput) {
  const s = await currentSession();
  if (!s) redirect("/auth/login?next=/proposals/new");
  // Server-enforced feature gate (defence-in-depth alongside `createProposal`):
  // never accept a submission unless the feature is fully ACTIVE. The reward is a
  // regulated inducement — the client cannot be trusted to have blocked itself.
  const cfg = getProposalsConfig();
  if (!isProposalsActive(cfg)) {
    return { ok: false as const, error: proposalsBlockedReason(cfg.state), code: "PAUSED" as const };
  }
  const r = await createProposal(s.userId, input);
  if (r.ok) {
    revalidatePath("/proposals");
    return { ok: true as const, proposalId: r.proposal.id };
  }
  return { ok: false as const, error: r.error, code: r.code };
}
