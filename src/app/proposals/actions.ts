"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { createProposal, castVote, type CreateProposalInput } from "@/lib/server/proposals-service";

/**
 * Cast / toggle / clear a vote on a proposal. Returns the new tallies.
 * No revalidatePath here on purpose: the VoteControl updates optimistically
 * and the vote is persisted server-side, so refetching the whole board on
 * every click would only cause churn. Fresh counts load on next navigation.
 */
export async function voteAction(proposalId: string, dir: "up" | "down" | null) {
  const s = await currentSession();
  if (!s) return { ok: false as const, error: "Sign in to vote." };
  return castVote(s.userId, proposalId, dir);
}

/** Submit a new proposal. Returns the new id on success (client shows the modal). */
export async function createProposalAction(input: CreateProposalInput) {
  const s = await currentSession();
  if (!s) redirect("/auth/login?next=/proposals/new");
  const r = await createProposal(s.userId, input);
  if (r.ok) {
    revalidatePath("/proposals");
    return { ok: true as const, proposalId: r.proposal.id };
  }
  return { ok: false as const, error: r.error, code: r.code };
}
