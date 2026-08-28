"use server";

import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { twoOfficerGate } from "@/lib/server/two-officer";
import { withLock } from "@/lib/server/locks";
import { audit } from "@/lib/server/audit";
import { chainStore, assetStore } from "@/lib/server/updown-dal";
import {
  checkPreconditions, computeCost, startJob, advance, getJob,
  type PurgeCost, type PurgeJob,
} from "@/lib/server/chain-purge";
import {
  getFirstSignature, setFirstSignature, clearFirstSignature, type PurgeStage1,
} from "./purge-stage1-store";

/**
 * THE CHAIN-PURGE CEREMONY — server actions.
 *
 * ⛔ GATED ON `compliance`, AND HOSTED HERE RATHER THAN ON /admin/updown. That is the whole
 * reason this file is in `retention/`. `/admin/updown` is a `trading` route
 * (roles.ts ROUTE_DOMAINS), so a `compliance` control placed there is Owner-only IN PRACTICE
 * and logs every legitimate click from a compliance officer as `privilege_escalation_blocked`
 * — the documented E-18/E-23 failure, which `voidUpDownRound` had to be corrected for within
 * the hour. `/admin/retention` is already `compliance`, so the control and its route agree.
 * /admin/updown gets a LINK, not the control.
 *
 * ⚠️ `CONTROL_DOMAIN.purgeChainHistory` is NOT declared, and that is a handover rather than an
 * omission: `control-gates.ts` belongs to Session M under the parallel-session contract. The
 * declaration only drives BUTTON VISIBILITY; the security boundary is `softRequireStaff` below,
 * plus the fact that a non-compliance role cannot open this route at all. Flagged to M.
 */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const REFUSAL = "Purging a chain's history is a compliance control. Your role cannot act here.";

async function labelFor(chainId: string): Promise<string | null> {
  const chain = await chainStore.get(chainId);
  if (!chain) return null;
  const asset = await assetStore.get(chain.assetId);
  return `${asset?.key ?? chain.assetId} ${chain.durationMinutes}m`;
}

/** The cost panel. Read-only, gated, and it REFUSES rather than estimating (A-5). */
export async function purgeCostAction(chainId: string): Promise<Result<PurgeCost>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };

  const pre = await checkPreconditions(chainId);
  if (!pre.ok) return { ok: false, error: pre.error };

  try {
    return { ok: true, data: await computeCost(chainId) };
  } catch (e) {
    /* ⛔ A-5: a cost panel that cannot count does not show dashes and let the officer sign.
       The whole point of the panel is that the numbers are real. */
    return {
      ok: false,
      error: `Couldn't compute what this would cost (${String((e as Error)?.message ?? e)}). The purge is refused — an officer must not sign for a cost nobody could count.`,
    };
  }
}

/**
 * STAGE 1 — officer A records the reason and the statutory basis.
 *
 * ⛔ THE WRITE IS VERIFIED. `saveConfig` never throws, so a dropped stage-1 write is invisible
 * at the call site — and `twoOfficerGate` treats an ABSENT maker as no conflict and PASSES. So
 * a silently-lost first signature does not fail closed, it makes one officer sufficient. That
 * is the documented way two-officer silently downgraded to one, and it is why this refuses on
 * a failed read-back instead of reporting success.
 */
export async function purgeStage1Action(formData: FormData): Promise<Result<{ at: string }>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };

  const chainId = String(formData.get("chainId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const basis = String(formData.get("basis") ?? "").trim();

  // ≥ 5 characters, as AML requires to release funds. A reason nobody can read is not a reason.
  if (reason.length < 5) return { ok: false, error: "Add a reason (at least 5 characters) — it is recorded against your name." };
  if (basis.length < 5) return { ok: false, error: "Name the statutory basis — it is written into the completion record." };

  const label = await labelFor(chainId);
  if (!label) return { ok: false, error: "Chain not found." };

  const pre = await checkPreconditions(chainId);
  if (!pre.ok) return { ok: false, error: pre.error };

  return withLock(`updown-purge:${chainId}`, async () => {
    const sig: PurgeStage1 = { actorId: gate.userId, at: new Date().toISOString(), reason, basis };
    const stored = await setFirstSignature(chainId, sig);
    if (!stored) {
      return {
        ok: false as const,
        error: "Your signature could not be stored, so the ceremony has not started. Nothing was recorded — try again.",
      };
    }
    await audit({
      category: "COMPLIANCE",
      action: "updown.chain.purge.stage1",
      actorId: gate.userId,
      targetType: "UpDownChain",
      targetId: chainId,
      payload: { chainLabel: label, reason, statutoryBasis: basis },
    });
    revalidatePath("/admin/retention");
    return { ok: true as const, data: { at: sig.at } };
  });
}

/**
 * STAGE 2 — a DIFFERENT officer starts the job.
 *
 * ⛔ AN ABSENT FIRST SIGNATURE IS A REFUSAL, NOT A PASS. `twoOfficerGate` returns null when
 * `makerId` is missing, because for its other callers a missing maker means "no conflict". For
 * a ceremony that REQUIRES two officers, that reading is exactly backwards: no maker means the
 * ceremony never started. So the maker's presence is asserted here BEFORE the gate is
 * consulted, and the gate is then asked only the question it is good at — are these the same
 * person?
 */
export async function purgeStage2Action(formData: FormData): Promise<Result<PurgeJob>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };

  const chainId = String(formData.get("chainId") ?? "");
  const typed = String(formData.get("typedWord") ?? "").trim();

  const label = await labelFor(chainId);
  if (!label) return { ok: false, error: "Chain not found." };

  return withLock(`updown-purge:${chainId}`, async () => {
    const stage1 = await getFirstSignature(chainId);
    if (!stage1) {
      return {
        ok: false as const,
        error: "No first signature on this chain, or it has expired. A second officer cannot complete a ceremony that has not been started.",
      };
    }

    const conflict = twoOfficerGate({
      makerId: stage1.actorId,
      checkerId: gate.userId,
      reason: `purging ${label} needs a second officer — you recorded the reason yourself`,
      audit: {
        action: "updown.chain.purge.conflict_blocked",
        targetType: "UpDownChain",
        targetId: chainId,
        payload: { chainLabel: label, makerId: stage1.actorId },
      },
    });
    if (conflict) return { ok: false as const, error: conflict.error };

    // ⛔ The typed word is the CHAIN'S OWN LABEL, not "DELETE" — typing the specific thing is
    //    what stops muscle memory firing on the wrong row.
    if (typed.toUpperCase() !== label.toUpperCase()) {
      return { ok: false as const, error: `Type ${label} exactly to confirm.` };
    }

    // Re-checked under the lock: the state may have moved since the panel was rendered.
    const pre = await checkPreconditions(chainId);
    if (!pre.ok) return { ok: false as const, error: pre.error };

    const job = await startJob({
      chainId, chainLabel: label,
      officerA: stage1.actorId, officerB: gate.userId,
      reason: stage1.reason, basis: stage1.basis,
    });
    revalidatePath("/admin/retention");
    return { ok: true as const, data: job };
  });
}

/**
 * Drive one batch. The client calls this until `phase` is `done` or `failed`.
 * ⚠️ Under the same lock as the ceremony, so two tabs cannot interleave batches on one chain.
 */
export async function purgeAdvanceAction(chainId: string): Promise<Result<PurgeJob>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };

  return withLock(`updown-purge:${chainId}`, async () => {
    const job = await advance(chainId);
    // The first signature is cleared on completion AND on failure — a stale stage 1 left
    // behind is a half-armed gate that the next officer would walk into.
    if (job.phase === "done" || job.phase === "failed") await clearFirstSignature(chainId);
    revalidatePath("/admin/retention");
    return { ok: true as const, data: job };
  });
}

/** Read the job for the progress bar. */
export async function purgeJobAction(chainId: string): Promise<Result<PurgeJob | null>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };
  return { ok: true, data: await getJob(chainId) };
}

/** Abandon a ceremony before stage 2 — clears the first signature and records the withdrawal. */
export async function purgeCancelAction(chainId: string): Promise<Result<null>> {
  const gate = await softRequireStaff("compliance", "purgeChainHistory", REFUSAL);
  if (!gate.ok) return { ok: false, error: gate.error };
  await clearFirstSignature(chainId);
  await audit({
    category: "COMPLIANCE",
    action: "updown.chain.purge.withdrawn",
    actorId: gate.userId,
    targetType: "UpDownChain",
    targetId: chainId,
  });
  revalidatePath("/admin/retention");
  return { ok: true, data: null };
}
