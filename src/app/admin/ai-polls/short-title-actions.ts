"use server";

/**
 * /admin/ai-polls → "Short titles" — the officer's three acts on the short-title backfill (the Vodacom plan S2):
 * draft short titles for open markets, approve one draft (as drafted, or edited), reject one draft.
 *
 * ⛔ THE GATE IS THE AI-POLLS GATE: `requireStaff("trading", …)` — act rights on the trading domain, audited on a
 * refusal, then step-up 2FA — exactly what every other action on this page runs. The draft run also takes the
 * per-officer "ai.batch" rate rule, because it is a batch of paid AI calls. The service functions hold their own
 * gates as well (the kill switch, the spend gate, the batch clamp): a gate on one of two doors is not a gate.
 *
 * ⛔ A REFUSAL IS NOT A REVALIDATION. Only an act that landed invalidates the page, so a refused approval keeps the
 * officer's typed edit on screen.
 */
import { revalidatePath } from "next/cache";
import { requireStaff, scopeRefusalToViewer } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { refuseFrom, safeError } from "@/lib/server/safe-error";
import type { OperatorRefusal } from "@/lib/server/safe-error";
import {
  draftShortTitles,
  approveShortTitleDraft,
  rejectShortTitleDraft,
  type DraftEdit,
} from "@/lib/server/short-title-backfill";

export type DraftRunActionResult =
  | { ok: true; drafted: number; considered: number; clampedTo: number; remaining: number; failed: number; stopped: string | null }
  | { ok: false; error: string; refusal?: OperatorRefusal };

/** ⭐ DRAFT SHORT TITLES FOR OPEN MARKETS — one run, clamped to the operator's batch ceiling. Never throws. */
export async function draftShortTitlesAction(): Promise<DraftRunActionResult> {
  const { userId: officerId } = await requireStaff("trading", "draftShortTitlesAction");
  const { isPollGenEnabled, pollGenDisabledRefusal } = await import("@/lib/server/ai-controls");
  if (!(await isPollGenEnabled())) {
    return { ok: false, error: "AI generation is switched off in the AI toolkit. Nothing was drafted.", refusal: pollGenDisabledRefusal() };
  }
  const rl = await rateCheckAsync(officerId, "ai.batch");
  if (!rl.allowed) {
    // Retry IS the remedy here — it lifts by itself — so no refusal link, as on the batch generator.
    return { ok: false, error: `Too many AI runs — wait ${rl.retryAfterSec}s before the next one. Nothing was drafted.` };
  }
  try {
    const r = await draftShortTitles({ officerId });
    if (!r.ok) return { ok: false, error: r.error, refusal: await scopeRefusalToViewer(r.refusal, officerId) };
    try { revalidatePath("/admin/ai-polls"); } catch { /* the drafts are stored; a stale page is the smaller harm */ }
    return { ok: true, drafted: r.drafted, considered: r.considered, clampedTo: r.clampedTo, remaining: r.remaining, failed: r.failures.length, stopped: r.stopped };
  } catch (err) {
    const x = refuseFrom(err, "Drafting stopped. Some drafts may have been saved — reload before running it again.");
    return { ok: false, error: x.error, refusal: await scopeRefusalToViewer(x.refusal, officerId) };
  }
}

export type DraftDecisionResult =
  | { ok: true; changed: boolean; recorded: boolean; draftCleared: boolean }
  | { ok: false; error: string; field?: string };

/** What the page posts for an edit — untrusted; each value is a string, null (clear) or absent (leave). */
function readEdit(input: unknown): DraftEdit | undefined {
  if (!input || typeof input !== "object") return undefined;
  const e = input as Record<string, unknown>;
  const pick = (v: unknown): string | null | undefined => (v === undefined ? undefined : v === null ? null : typeof v === "string" ? v : undefined);
  const out: DraftEdit = {
    shortTitleEn: pick(e.shortTitleEn),
    shortTitleSw: pick(e.shortTitleSw),
    shortTitleZh: pick(e.shortTitleZh),
    competition: pick(e.competition),
  };
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

/** ⭐ APPROVE ONE DRAFT — as drafted, or with the officer's edit. Never throws. */
export async function approveShortTitleDraftAction(input: { marketId: string; edited?: unknown }): Promise<DraftDecisionResult> {
  const { userId: officerId } = await requireStaff("trading", "approveShortTitleDraftAction");
  try {
    const marketId = typeof input?.marketId === "string" ? input.marketId : "";
    const r = await approveShortTitleDraft({ officerId, marketId, edited: readEdit(input?.edited) });
    if (!r.ok) return { ok: false, error: r.error, field: r.field };
    try { revalidatePath("/admin/ai-polls"); } catch { /* the market changed; a stale page is the smaller harm */ }
    return { ok: true, changed: r.changed, recorded: r.recorded, draftCleared: r.draftCleared };
  } catch (err) {
    return { ok: false, error: safeError(err, "The approval did not complete. Reload the page before trying again.") };
  }
}

/** ⭐ REJECT ONE DRAFT — with the officer's reason, on the record. Never throws. */
export async function rejectShortTitleDraftAction(input: { marketId: string; reason: string }): Promise<DraftDecisionResult> {
  const { userId: officerId } = await requireStaff("trading", "rejectShortTitleDraftAction");
  try {
    const marketId = typeof input?.marketId === "string" ? input.marketId : "";
    const reason = typeof input?.reason === "string" ? input.reason : "";
    const r = await rejectShortTitleDraft({ officerId, marketId, reason });
    if (!r.ok) return { ok: false, error: r.error, field: r.field };
    try { revalidatePath("/admin/ai-polls"); } catch { /* the draft is gone; a stale page is the smaller harm */ }
    return { ok: true, changed: true, recorded: r.recorded, draftCleared: true };
  } catch (err) {
    return { ok: false, error: safeError(err, "The rejection did not complete. Reload the page before trying again.") };
  }
}
