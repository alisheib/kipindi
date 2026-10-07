"use server";

/**
 * U40b · /admin/campaigns/new — THE CONFIRMATION'S ONE ACTION (ENGINE-SPEC §4.6; the work is U40a's `confirmCampaign`).
 *
 * ⛔ THE GATE IS ITS FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on, so no layout
 * or path rule can see it). `softRequireStaff("growth", "marketing.campaign.confirm", …)` decides on the viewer's STORED
 * role, audits a refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before anything else
 * is touched. "growth" is `domainForPath("/admin/campaigns")`, the composer's own domain, so no control-domain entry is owed.
 * ⛔ THREE FIELDS ARE READ, BY NAME, AS TEXT — the campaign, the text the dialog armed on, and the signed claim the dialog was
 * opened on (the watermark). Never a count: the server counts (OD27). Anything else posted is never read.
 * ⛔ THE VIEWER IS THE STORED ROLE'S (`confirmViewerFor` — the very answer the Confirm card counted its view for): may they
 * read a number, may they read money. So a viewer who may not read a number is held to the typed tier here too (OD67),
 * and a refusal names money only to a money reader — whatever the browser sends.
 * ⭐ IT SAYS WHAT HAPPENED: a confirmation with whether its record landed (ruling 543 — `recorded`); a refusal in the
 * service's one sentence, with its reason; and a failure says only what it knows — the row is read once more, and only a
 * row still in DRAFT (or gone) is "nothing was confirmed". A row that moved, or a read that fails, may have been confirmed
 * by this very press (the service's known residual), and the answer says so; trying again is safe either way, because the
 * write is conditional on a draft — a confirmed campaign is refused, never confirmed twice.
 * ⛔ CONFIRMED SENDS NOTHING: no recipient row, no token, no message. Start is a separate act on the campaign's own page.
 * ⛔ EXACTLY ONE ACTION LIVES HERE, and the Confirm card imports it (`test:campaign-gates` §UI · `test:orphan-actions`).
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { db } from "@/lib/server/store";
import { confirmCampaign, confirmViewerFor } from "@/lib/server/marketing/campaign-confirm-service";
import type { ConfirmCampaignResult, ConfirmServiceRefusal } from "@/lib/server/marketing/campaign-confirm-service";
import type { ConfirmOutcomeReason, ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { COMPOSE_CONFIRM_FAILED, COMPOSE_CONFIRM_ROLE_REFUSAL, COMPOSE_CONFIRM_UNFINISHED } from "./composer-copy";

/**
 * What the Confirm card is answered. A refusal carries the service's reason and its sentence, and the count the server
 * holds now when it has one; `role` is the gate's, `failed` a failure that left the row a draft, and `unfinished` one that
 * cannot say whether the write landed.
 */
export type ConfirmActionResult =
  | { ok: true; count: number; tier: ConfirmTier; recorded: boolean }
  | {
      ok: false;
      reason: ConfirmOutcomeReason | ConfirmServiceRefusal | "role" | "failed" | "unfinished";
      error: string;
      freshCount: number | null;
    };

/** One posted field, by name, as text — anything else (a file, nothing, a body that is not a form) is null. */
function posted(formData: unknown, name: string): string | null {
  if (formData === null || typeof formData !== "object" || typeof (formData as { get?: unknown }).get !== "function") return null;
  const v = (formData as FormData).get(name);
  return typeof v === "string" ? v : null;
}

/** ⛔ After a failure: is the row still a draft (or gone)? Only then was nothing confirmed. A read that fails cannot say so. */
async function stillDraft(campaignId: string): Promise<boolean> {
  if (campaignId === "") return true;
  try {
    const row = await db.smsCampaign.find(campaignId);
    return row === null || row.status === "DRAFT";
  } catch {
    return false;
  }
}

/** ⭐ Confirm one draft — the text the dialog armed on, against the server's own count, on the claim it was opened on. */
export async function confirmCampaignAction(formData: FormData): Promise<ConfirmActionResult> {
  const g = await softRequireStaff("growth", "marketing.campaign.confirm", COMPOSE_CONFIRM_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error, freshCount: null };
  const campaignId = (posted(formData, "campaignId") ?? "").trim();
  const typedText = posted(formData, "typed");
  const typed = typedText !== null && typedText.trim() !== "" ? typedText : null;
  const watermark = posted(formData, "watermark");
  // ⛔ WHO IS CONFIRMING: the stored role's two cells — never a field of the request.
  const viewer = await confirmViewerFor(g.userId);
  let result: ConfirmCampaignResult;
  try {
    result = await confirmCampaign({ campaignId, typed, watermark, actorId: g.userId }, viewer);
  } catch {
    // ⛔ Never "nothing was confirmed" unless the row says so (the service's known residual).
    return (await stillDraft(campaignId))
      ? { ok: false, reason: "failed", error: COMPOSE_CONFIRM_FAILED, freshCount: null }
      : { ok: false, reason: "unfinished", error: COMPOSE_CONFIRM_UNFINISHED, freshCount: null };
  }
  if (!result.ok) return { ok: false, reason: result.reason, error: result.message, freshCount: result.freshCount };
  try { revalidatePath("/admin/campaigns"); } catch { /* confirmed; a stale list is the smaller harm */ }
  return { ok: true, count: result.count, tier: result.tier, recorded: result.recorded };
}
