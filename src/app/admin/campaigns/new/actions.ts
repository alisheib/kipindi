"use server";

/**
 * U37b · /admin/campaigns/new — the composer's two actions: save the draft, and test it on the officer's own number.
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on,
 * so no layout or path rule can see it). `softRequireStaff("growth", …)` decides on the viewer's STORED role, audits a
 * refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before anything else is touched.
 * ⛔ EVERY FIELD IS RE-TYPED, NAMED ONE BY ONE. The browser can post anything; a key the save does not name (segments, a
 * coding, a sender, a source line) is never read, and a value that is not a string becomes "". The service then
 * re-validates on the server and stores ITS OWN figures.
 * ⛔ THE TEST TAKES EXACTLY (campaignId, variant) — no number and no body, by its signature
 * (`test:campaign-compose` §16.4 reads this parameter list). The recipient is the officer's own account number.
 * ⛔ A REFUSAL IS NOT A REVALIDATION: only a save that landed invalidates the list.
 * ⭐ EVERY REFUSAL CARRIES ITS REASON (validation audit, 2026-10-03), so the screen prints the sentence alone and offers
 * only the next step that can work: `role` (no retry can win it), `rate_limited` (the sentence says when), and
 * `unfinished` — the service threw after it was handed the text, so the row may exist: check, never retry blind.
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { safeError } from "@/lib/server/safe-error";
import { saveCampaignDraft } from "@/lib/server/marketing/campaign-draft";
import type { CampaignDraftInput, CampaignDraftResult } from "@/lib/server/marketing/campaign-draft";
import { SMS_CAMPAIGN_VALUE } from "@/lib/server/marketing/campaign-model";
import { sendCampaignTest } from "@/lib/server/marketing/campaign-test-send";
import type { CampaignTestResult } from "@/lib/server/marketing/campaign-test-send";
import type { CampaignVariant } from "@/lib/marketing/campaign-template";
import { CONTACT_AUDIENCE_URL_KEYS } from "@/lib/server/marketing/audience";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import {
  COMPOSE_ROLE_REFUSAL, COMPOSE_SAVE_UNFINISHED, COMPOSE_TEST_UNFINISHED, composeSaveRateLimited,
} from "./composer-copy";

/** A refusal the console renders as it is — the gate's sentence, the budget's, or a failure's — with its reason. */
type Refused = { ok: false; reason: "role" | "rate_limited" | "unfinished"; error: string };

/** A posted value as text — anything else is nothing. */
const text = (v: unknown): string => (typeof v === "string" ? v : "");
/** The posted body as a bag of unknowns — never trusted to be the shape the form meant to send. */
const bag = (v: unknown): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
/** A revision is the column's whole number (Postgres INTEGER — `campaign-model.ts`'s own rule), or nothing. */
const revision = (v: unknown): number | null => (SMS_CAMPAIGN_VALUE.draftRevision(v) ? v : null);

/** The composer's address, in the contacts filter vocabulary ONLY — any other key is dropped; none at all keeps the stored one. */
function audienceParams(v: unknown): Record<string, string> | null {
  const posted = bag(v);
  const out: Record<string, string> = {};
  for (const k of CONTACT_AUDIENCE_URL_KEYS) {
    const value = posted[k];
    if (typeof value === "string" && value.trim() !== "") out[k] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Save one draft — a new one, or the one the form was rendered on, by compare-and-set on its revision. */
export async function saveCampaignDraftAction(request: unknown): Promise<CampaignDraftResult | Refused> {
  const g = await softRequireStaff("growth", "marketing.campaign.save", COMPOSE_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error };
  // ⛔ THE OFFICER'S SAVE BUDGET, BEFORE THE SERVICE (U37b review m5): every create is a campaign row and an audit row
  // that are never removed — the case `contacts.write` bounds on the contacts form.
  const rate = await rateCheckAsync(g.userId, "marketing.campaignSave");
  if (!rate.allowed) return { ok: false, reason: "rate_limited", error: composeSaveRateLimited(rate.retryAfterSec) };
  const body = bag(request);
  const id = text(body.id).trim();
  const input: CampaignDraftInput = {
    id: id === "" ? null : id,
    draftRevision: revision(body.draftRevision),
    name: text(body.name),
    bodySw: text(body.bodySw),
    bodyEn: text(body.bodyEn),
    nameFallbackSw: text(body.nameFallbackSw),
    nameFallbackEn: text(body.nameFallbackEn),
    audience: audienceParams(body.audience),
  };
  let result: CampaignDraftResult;
  try {
    result = await saveCampaignDraft(input, g.userId, { viewerReads: await viewerReadsContacts().catch(() => false) });
  } catch (err) {
    // ⛔ The throw may come AFTER the row was written (its audit row), so the sentence never says "nothing was saved".
    return { ok: false, reason: "unfinished", error: safeError(err, COMPOSE_SAVE_UNFINISHED) };
  }
  if (result.ok) {
    try { revalidatePath("/admin/campaigns"); } catch { /* saved; a stale list is the smaller harm */ }
  }
  return result;
}

/** ⛔ Test the SAVED draft on the officer's OWN number. Two parameters, and neither is a number or a body. */
export async function sendCampaignTestAction(campaignId: string, variant: CampaignVariant): Promise<CampaignTestResult | Refused> {
  const g = await softRequireStaff("growth", "marketing.campaign.test", COMPOSE_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error };
  try {
    return await sendCampaignTest({ campaignId: text(campaignId), variant: variant === "EN" ? "EN" : "SW" }, g.userId);
  } catch (err) {
    // ⛔ The throw may come after the message reached the wire — never "nothing was sent", never a blind resend (OD23).
    return { ok: false, reason: "unfinished", error: safeError(err, COMPOSE_TEST_UNFINISHED) };
  }
}
