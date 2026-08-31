"use server";

/**
 * Officer actions for the Up & Down proposal queue.
 *
 * ⚠️ `"use server"` FILES EXPORT ASYNC FUNCTIONS ONLY. A `const` export here fails only at
 * `next build`, not at `tsc` — so keep every export an async function.
 *
 * TIERS, and why they differ from the Overview page:
 *  · GENERATE / REVIEW / REJECT / DELETE → `trading`. These spend AI credit and move a row
 *    through a queue. Nothing settles, no chain changes state.
 *  · ARM → `accounting`. Arming points the asset at a new source and starts a chain that will
 *    emit real-money rounds on a timer. That is an economics change, and it is gated like one.
 *
 * Every action returns a discriminated result and surfaces the SERVICE's error verbatim: the
 * service explains exactly why ("Cannot arm — 3 rounds are unresolved… pause the chains, let
 * them settle, then edit"), and flattening that into "failed" would throw away the only
 * actionable part.
 */

import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { requireStaff } from "@/lib/server/rbac-guard";
import { fieldError } from "@/lib/server/field-error";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import {
  generateProposal, editProposal, approveProposal, rejectProposal, armProposal, deleteProposal,
  PROPOSAL_REJECT_REASONS, type ProposalRejectReason,
} from "@/lib/server/updown-proposal";
import { ALLOWED_DURATIONS, type Duration } from "@/lib/server/updown-config";

async function refresh() {
  revalidatePath("/admin/updown/proposals");
  revalidatePath("/admin/updown");
}

function num(fd: FormData, k: string): number | undefined {
  const raw = String(fd.get(k) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function generateProposalAction(formData: FormData) {
  const session = await requireStaff("trading");
  try {
    const assetId = String(formData.get("assetId") ?? "").trim();
    const duration = num(formData, "durationMinutes");
    if (!assetId) return fieldError("assetId", "Choose an asset.");
    if (duration === undefined || !ALLOWED_DURATIONS.includes(duration as Duration)) {
      return fieldError("durationMinutes", `Choose a round length: ${ALLOWED_DURATIONS.join(", ")} minutes.`);
    }
    const prompt = String(formData.get("prompt") ?? "").trim().slice(0, 1000);
    const r = await generateProposal({
      assetId,
      durationMinutes: duration as Duration,
      prompt: prompt || undefined,
      actorId: session.userId,
    });
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const, warn: r.warn, state: r.data.state, id: r.data.id };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not generate a proposal") };
  }
}

export async function editProposalAction(formData: FormData) {
  const session = await requireStaff("trading");
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false as const, error: "Missing proposal." };

    // Only send fields the officer actually touched: an absent key means "leave it", and
    // sending every field on every save would clear the ones the form does not render.
    const patch: Parameters<typeof editProposal>[1] = {};
    const dur = num(formData, "durationMinutes");
    if (dur !== undefined) patch.durationMinutes = dur;
    const marginPct = num(formData, "marginPct");
    // % in the UI → basis points, the same conversion the Overview form uses.
    if (marginPct !== undefined) patch.marginBps = Math.round(marginPct * 100);
    for (const k of ["sourceUrl", "framingEn", "framingSw", "framingZh"] as const) {
      const raw = formData.get(k);
      if (raw !== null) patch[k] = String(raw);
    }

    const r = await editProposal(id, patch, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const, warn: r.warn, state: r.data.state };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not save the proposal") };
  }
}

export async function approveProposalAction(formData: FormData) {
  const session = await requireStaff("trading");
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false as const, error: "Missing proposal." };
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);
    const r = await approveProposal(id, { officerId: session.userId, note: note || undefined });
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not approve the proposal") };
  }
}

export async function rejectProposalAction(formData: FormData) {
  const session = await requireStaff("trading");
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false as const, error: "Missing proposal." };
    // Validate against the closed set HERE as well as in the service: never trust the client's
    // strings, and a bad value should be a clear message rather than a silent drop.
    const raw = formData.getAll("reasons").map((v) => String(v));
    const reasons = raw.filter((v): v is ProposalRejectReason =>
      (PROPOSAL_REJECT_REASONS as readonly string[]).includes(v));
    if (reasons.length === 0) {
      /* The address is the reason GROUP, not a single checkbox — `data-field` sits on the
         fieldset that owns them, so the officer lands on the first box in the set. */
      return fieldError("reasons", "Choose at least one reason so the rejection can be counted.");
    }
    const note = String(formData.get("note") ?? "").trim().slice(0, 500);
    const r = await rejectProposal(id, { officerId: session.userId, reasons, note: note || undefined });
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not reject the proposal") };
  }
}

/**
 * ⚠️ `accounting`, not `trading` — arming starts a chain that moves real money.
 *
 * ⛔ E-27: the domain now comes from `CONTROL_DOMAIN` so the PAGE can ask the same
 * question before it renders the button. `/admin/updown/proposals` is a `trading` route,
 * and `DEFAULT_GRANTS` makes trading and accounting disjoint, so before this a MODERATOR
 * saw an armed "Arm" button that could only bounce — and the SECURITY row it wrote did
 * not even name the control, because the second argument was omitted.
 */
export async function armProposalAction(formData: FormData) {
  const session = await requireStaff(CONTROL_DOMAIN.armProposal, "armProposal");
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false as const, error: "Missing proposal." };
    const r = await armProposal(id, { officerId: session.userId });
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const, chainId: r.data.chainId };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not arm the chain") };
  }
}

export async function deleteProposalAction(formData: FormData) {
  const session = await requireStaff("trading");
  try {
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return { ok: false as const, error: "Missing proposal." };
    const r = await deleteProposal(id, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    await refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Could not delete the proposal") };
  }
}
