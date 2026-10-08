"use server";

/**
 * U47b-2 · /admin/campaigns/[id] — THE LIVE PAGE'S SIX ACTIONS: the poll, and the officer's five presses — Start, Pause,
 * Resume, Stop, Make a copy (ENGINE-SPEC §4.15 decisions 1, 3, 4 and 7). ⭐ The driver's STEP is no action since the review's
 * MAJOR: it is a guarded route handler (`src/app/api/admin/campaigns/[id]/step/route.ts`, the door in `live-step-door.ts`),
 * because Next 16 runs a page's server actions one at a time — a step that takes seconds held every press behind it.
 *
 * ⛔ THE GATE IS EACH ACTION'S FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on, so
 * no layout or path rule can see it). It decides on the viewer's STORED role in the campaigns' domain (growth), audits a
 * refusal as `privilege_escalation_blocked`, and answers in words — before anything else is touched:
 *   · START, RESUME and MAKE A COPY take `softRequireStaff`, and with it the step-up second factor (a press keeps it, as a
 *     Save does);
 *   · PAUSE and STOP take `softCheckStaff` — the review's MINOR 6: they are the brake, pressed with a campaign sending, and a
 *     2-step sign-in that lapsed (or was never set up) is REFUSED IN WORDS with the step-up page's address, never the redirect
 *     that would throw the officer's page — and the press — away. Pressing again once confirmed lands it;
 *   · the POLL takes `softViewStaff` — a read, by an officer who may only LOOK: the VIEW grant, not the act grant, so a
 *     watcher is never turned into a stream of attempted escalations in the security log.
 * ⛔ THE BROWSER NAMES ONE THING: the campaign's id, as text. Who is acting, and what they may see, come from the session and
 * the STORED role (`liveViewerFor`) — never from the request. Every service refuses `role` itself too (`mayAct`).
 * ⭐ EVERY ACT ANSWERS WITH THE CAMPAIGN AS IT IS NOW (`live-run.ts`), and a service that threw after it was handed the
 * campaign answers `unfinished` — it may or may not have happened. ⛔ A REFUSAL IS NOT A REVALIDATION: only an act that
 * landed invalidates the list.
 * ⛔ NO SMS LEAVES FROM HERE: the only way to the wire is the engine's, through the step (`campaign-control.ts`).
 *
 * Guard: `npm run test:campaign-visuals` §page (V5 · L2 · V11) · `npm run test:orphan-actions` (each has its caller).
 */
import { softCheckStaff, softRequireStaff, softViewStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { copyCampaign, pauseCampaign, resumeCampaign, startCampaign, stopCampaign } from "@/lib/server/marketing/campaign-control";
import { campaignLiveView } from "@/lib/server/marketing/campaign-live";
import { liveViewerFor } from "./live-viewer";
import { actRefused, actRefusedBy, refusedBy, resumeWithRetry, runAct } from "./live-run";
import type { LiveActAnswer, LiveViewAnswer } from "./live-run";
import { LIVE_MISSING, LIVE_ROLE_REFUSAL, LIVE_VIEW_REFUSAL, copyRateLimitedSentence } from "./live-copy";

/** A posted value as text — anything else is nothing. */
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/* ══ THE POLL ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ One poll: the campaign as this viewer may see it — for every page that is not driving it. A read that fails THROWS. */
export async function campaignViewAction(campaignId: string): Promise<LiveViewAnswer> {
  const g = await softViewStaff("growth", "marketing.campaign.view", LIVE_VIEW_REFUSAL);
  if (!g.ok) return refusedBy(g);
  const viewer = await liveViewerFor(g.userId);
  const view = await campaignLiveView(text(campaignId), viewer);
  return view === null ? { ok: false, reason: "not_found", error: LIVE_MISSING } : { ok: true, view };
}

/* ══ THE FIVE PRESSES ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Start — the confirmed campaign, after its dialog. U49a's refusals and OD66 are the service's. */
export async function startCampaignAction(campaignId: string): Promise<LiveActAnswer> {
  const g = await softRequireStaff("growth", "marketing.campaign.start", LIVE_ROLE_REFUSAL);
  if (!g.ok) return actRefused("role", g.error);
  const id = text(campaignId);
  return runAct(id, g.userId, "start", (actor) => startCampaign(id, actor));
}

/** Pause — at once, from any tab; a group already past its last check may still go out (E6). */
export async function pauseCampaignAction(campaignId: string): Promise<LiveActAnswer> {
  const g = await softCheckStaff("growth", "marketing.campaign.pause", LIVE_ROLE_REFUSAL);
  if (!g.ok) return actRefusedBy(g);
  const id = text(campaignId);
  return runAct(id, g.userId, "pause", (actor) => pauseCampaign(id, actor));
}

/** Resume — at once; asked once more after a `busy` (the campaign's step flight was taken just then). */
export async function resumeCampaignAction(campaignId: string): Promise<LiveActAnswer> {
  const g = await softRequireStaff("growth", "marketing.campaign.resume", LIVE_ROLE_REFUSAL);
  if (!g.ok) return actRefused("role", g.error);
  const id = text(campaignId);
  return runAct(id, g.userId, "resume", (actor) => resumeWithRetry(resumeCampaign, id, actor));
}

/** Stop — for good, after its dialog; a group already past its last check may still go out. */
export async function stopCampaignAction(campaignId: string): Promise<LiveActAnswer> {
  const g = await softCheckStaff("growth", "marketing.campaign.stop", LIVE_ROLE_REFUSAL);
  if (!g.ok) return actRefusedBy(g);
  const id = text(campaignId);
  return runAct(id, g.userId, "stop", (actor) => stopCampaign(id, actor));
}

/** Make a copy — a new draft, and the composer's address for it. ⛔ A copy IS a saved draft: it spends the officer's save budget. */
export async function copyCampaignAction(campaignId: string): Promise<LiveActAnswer> {
  const g = await softRequireStaff("growth", "marketing.campaign.copy", LIVE_ROLE_REFUSAL);
  if (!g.ok) return actRefused("role", g.error);
  const rate = await rateCheckAsync(g.userId, "marketing.campaignSave");
  if (!rate.allowed) return actRefused("rate_limited", copyRateLimitedSentence(rate.retryAfterSec));
  const id = text(campaignId);
  return runAct(id, g.userId, "copy", (actor) => copyCampaign(id, actor));
}
