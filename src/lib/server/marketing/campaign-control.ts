/**
 * ⭐ U47b-1 · THE LIVE CAMPAIGN'S SIX SERVICES — Start · Pause · Resume · Stop · Make a copy, and the step dispatcher the
 * page's driver calls (ENGINE-SPEC §4.15 decision 1 AS AMENDED, §3.1 · §3.3 · E10 · E22 · E24 · E25 · OD66).
 *
 * ── THE MOVES (§3.1 — every one ONE conditional `transition`, so of two officers ONE wins) ─────────────────────────────
 *   startCampaign  — ⛔ OD66 FIRST, before anything is counted: a viewer who may not read a number, on an audience their
 *                    role may not count (both populations, a search, a consent, source, player or stop filter —
 *                    `campaignAudienceRefusal`, as the confirmation door asks it), is refused `audience_refused`. Then
 *                    U49a's ONE list of Start refusals (`checkStart`), each said in ITS sentence for this viewer
 *                    (`startRefusalSentence` — money words only for a money reader; ⛔ the refusal OBJECT never leaves this
 *                    file). Then CONFIRMED → PREPARING `{ startedAt }`.
 *   pauseCampaign  — PREPARING · RUNNING → PAUSED `{ pausedAt, stopReason: "officer_paused" }`.
 *   resumeCampaign — U49a's Resume refusal over the recipient COUNTS (`resumeRefusal(c, counts)` — never a figure; what
 *                    only a new copy can fix is refused FIRST, the switch and the credit after; ⛔ E23 · its `reached` form is
 *                    said as a CONDITION to a viewer below the floor — `resumeCopyOnlyHiddenSentence`), then ⭐ the HELD rows
 *                    re-queued (E8 — BEFORE the move, so no slice can find the list "only HELD" and pause it again), then
 *                    PAUSED → RUNNING `{ stopReason: null }` — or PREPARING when the list never finished (`enqueuedAt` null).
 *   stopCampaign   — CONFIRMED · PREPARING · RUNNING · PAUSED → CANCELLED `{ finishedAt, stopReason: "officer_stopped" }`.
 *                    ⛔ E25 · STOP REWRITES NOTHING: the rows still owed a message stay PENDING / HELD; "stopped before
 *                    sending" is a count (`resumeOutstanding`, the ONE definition of what is left), recorded on the row.
 *   copyCampaign   — a NEW DRAFT through the composer's one save (`saveCampaignDraft` — the server's verdict on the message,
 *                    the source line stamped fresh, the draft door's role rule on the audience) with the stored message
 *                    and the stored audience written as the composer's address (`campaignAudienceParams`). ⛔ REFUSED when
 *                    the audience cannot travel (`copyTravel`: unreadable, not writable as an address, or a filter this
 *                    viewer's role may not post — OD66 again) — never a copy that silently widens to the whole book.
 * ⛔ A SENTENCE THAT ADVISES A COPY says the copy messages again everyone it reaches who was already messaged (no
 * cross-campaign de-dupe, no frequency cap — Ali's ruling): the copy's own answer and its refusal follow `liveReach`.
 *
 * ── THE STEP (`campaignStep`, §3.3 · E22 — what one driver call does) ──────────────────────────────────────────────────
 *   PREPARING → the reaper, then ONE enqueue chunk (`enqueueStep`) · RUNNING → ONE slice (`runCampaignSlice`, which reaps
 *   first) · PAUSED · CANCELLED · DONE → the reaper ONLY (the page's mount, so a stranded claim never reads "not sent" for
 *   a message that went) · DRAFT · CONFIRMED → nothing. Then the view, as THIS viewer may see it (`campaignLiveView`).
 *   ⭐ SINGLE-FLIGHT PER CAMPAIGN, IN-PROCESS (decision 1 AS AMENDED — E10's globalThis gate widened): every step of one
 *   campaign takes ITS flight on `globalThis.__50PICK_CAMPAIGN_STEPS` (shared by every module instance — a server action's,
 *   a route's) or answers `waiting busy`, so two drivers — two officers' pages — never run two steps of one campaign at
 *   once: never two enqueue chunks over views that differ (U42's review), never a reap beside a slice. A flight older than
 *   `REAP_AFTER_MS` (or dated ahead by as much) is a lost one and no longer holds; only its own ticket releases it.
 *   Across processes (a deploy's overlap) the enqueue FAILS CLOSED and the claim keeps every send single (§5 rule 8 pauses
 *   every campaign before a push anyway).
 *   The step is act-gated (`viewer.mayAct`, beside the action's own guard); a view-only role polls the view.
 *
 * ── E24 · THE AUDIT ROWS (ADMIN, the officer — one per act; the engine writes its own SYSTEM rows) ─────────────────────
 * `marketing.campaign_started` `{ count, estimateSegments, freshCount, shrunkBy }` · `marketing.campaign_start_refused`
 * `{ reason }` — the refusal's FIGURES only for the money reasons (`over_budget`, `credit_low`), the rail's problem for
 * `rail_dead`, the refused key for `audience_refused` · `marketing.campaign_paused` `{ reason: "officer_paused" }` (the
 * engine's spelling — ONE action) · `marketing.campaign_resumed` `{ requeuedHeld, to }` · `marketing.campaign_stopped`
 * `{ outstanding }` · `marketing.campaign_copied` `{ from, to }` (the draft save writes its own `marketing.campaign_created`).
 * ⭐ ruling 543 · every act's answer carries `recorded`, and its sentence says the second half when the row did not land.
 * ⛔ No phone number in any row, answer or error.
 *
 * ⛔ NOTHING REACHES THIS FILE YET: no `*Action`, no page, no route (U47b-2 adds them, each with its caller in the same push).
 * ⛔ NO SMS LEAVES FROM HERE: the only way to the wire is the engine's own (`runCampaignSlice` → `engineSend`); nothing here
 * names `sendBatch`, `dispatchSlice` or a transport. SERVER-ONLY.
 *
 * Guard: `npm run test:campaign-visuals` §svc (T1–T8, D1–D5, W1, P1) · Red: `npm run red:campaign-visuals` (in memory).
 */
import { db } from "@/lib/server/store";
import type {
  SmsCampaignRecipientCount, SmsCampaignRecipientStatusCounts, SmsCampaignStatus, SmsCampaignTransition, StoredSmsCampaign,
} from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { enqueueStep } from "@/lib/server/marketing/enqueue";
import type { EnqueueStepResult } from "@/lib/server/marketing/enqueue";
import { ENGINE_PAUSED_ACTION, REAP_AFTER_MS, reapStrandedClaims, runCampaignSlice } from "@/lib/server/marketing/engine";
import type { ReapResult, SliceStepResult } from "@/lib/server/marketing/engine";
import {
  checkStart, resumeOutstanding, resumeRefusal, resumeRefusalSentence, startRefusalSentence,
} from "@/lib/server/marketing/start-check";
import type { RefusalViewer, ResumeRefusal, StartCheck, StartRefusal } from "@/lib/server/marketing/start-check";
import { saveCampaignDraft } from "@/lib/server/marketing/campaign-draft";
import type { CampaignDraftInput, CampaignDraftOptions, CampaignDraftResult } from "@/lib/server/marketing/campaign-draft";
import { fillRecipientCounts } from "@/lib/server/marketing/campaign-model";
import { campaignDraftHref, outstandingRows, zeroRecipientStatusCounts } from "@/lib/marketing/campaign-status";
import { CAMPAIGN_NAME_MAX_CHARS } from "@/lib/marketing/campaign-template";
import { charCount } from "@/lib/contacts/contact-fields";
import {
  OFFICER_STOPPED_ACTION, campaignLiveView, copyTravel, liveReach, startAudienceRefusedFor,
} from "@/lib/server/marketing/campaign-live";
import type { CampaignLiveView, LiveViewer } from "@/lib/server/marketing/campaign-live";
import {
  LIVE_CHANGED, LIVE_DISABLED, LIVE_DONE, LIVE_MISSING, LIVE_NOT_RECORDED, START_AUDIENCE_REFUSED, copyCantTravelSentence,
  copyDoneSentence, copyMessageRefusedSentence, resumeCopyOnlyHiddenSentence, waitSentence,
} from "@/app/admin/campaigns/[id]/live-copy";

/* ══ THE ROWS IT WRITES (E24) ═══════════════════════════════════════════════════════════════════════════════════════ */

export const CAMPAIGN_STARTED_ACTION = "marketing.campaign_started";
export const CAMPAIGN_START_REFUSED_ACTION = "marketing.campaign_start_refused";
export const CAMPAIGN_RESUMED_ACTION = "marketing.campaign_resumed";
export const CAMPAIGN_COPIED_ACTION = "marketing.campaign_copied";
/** ⭐ An officer's Pause is the SAME action the engine and the enqueue write (`ENGINE_PAUSED_ACTION`), which the view reads
 *  as `OFFICER_PAUSED_ACTION` (`test:campaign-visuals` holds the spellings equal); Stop's is the view's
 *  `OFFICER_STOPPED_ACTION` — one spelling each. */
export const CAMPAIGN_PAUSED_ACTION = ENGINE_PAUSED_ACTION;
export const CAMPAIGN_STOPPED_ACTION = OFFICER_STOPPED_ACTION;

/** The two stop reasons an officer's act writes (§3.4 — `campaign-status.ts` holds their words). */
export const OFFICER_PAUSED = "officer_paused";
export const OFFICER_STOPPED = "officer_stopped";

/* ══ THE SHAPES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The officer who acts — from the session, every time: their id, may they read a number (`identity.contact` = read), may
 *  they read money (`campaignMoneyVisible`). ⛔ No default; the action's guard decided that they may act at all. */
export type ControlActor = { userId: string; reads: boolean; money: boolean };

/** Why Start was refused: U49a's reasons, OD66's, and a campaign that is not there. */
export type StartControlRefusal = StartRefusal["reason"] | "audience_refused" | "not_found";
export type PauseControlRefusal = "not_found" | "draft" | "already_paused" | "not_sending";
export type ResumeControlRefusal = ResumeRefusal["reason"] | "not_found" | "draft" | "not_paused";
export type StopControlRefusal = "not_found" | "draft" | "finished";
export type CopyControlRefusal = "not_found" | "draft" | "audience_cannot_travel" | "message_cannot_travel" | "source_unreadable";

/** What an act answers: done (and whether its audit row landed — ruling 543), or refused — each in the sentence the page
 *  prints. ⛔ No refusal object, and no figure the viewer may not read, ever reaches an answer. */
export type ControlResult<R extends string> =
  | { ok: true; message: string; recorded: boolean }
  | { ok: false; reason: R; message: string };
/** Make a copy's answer: the new draft and the composer's address for it. */
export type CopyResult = { ok: true; id: string; href: string; message: string; recorded: boolean } | { ok: false; reason: CopyControlRefusal; message: string };

/** What one step did (§4.15's APIs). */
export type StepOutcome = SliceStepResult | EnqueueStepResult | { kind: "reaped"; reaped: number } | { kind: "idle" };
/**
 * ⭐ THE STEP ACTION'S ANSWER (§4.15's APIs; U47b-2's `campaignStepAction` returns it, adding `second_factor` from its guard).
 * ⭐ As built: `said` — a wait in words (`waitSentence`), else null — so the page prints the step's own sentence.
 */
export type StepActionResult =
  | { ok: true; step: DriverStep; said: string | null; view: CampaignLiveView }
  | { ok: false; reason: "role" | "second_factor" | "not_found"; error: string };

/**
 * ⛔ THE U47b-1 REVIEW · WHAT THE DRIVER IS HANDED OF A STEP — its kind and what decides the next call (a wait's reason and
 * time, a pause's reason, a status), and NOTHING ELSE, for EVERY role: no count and no cursor. A slice's handedOver /
 * skipped beside a padded tag would be one person's gate verdict below E23's floor, and an enqueue's `next` names a contact
 * or an account. Every figure the page shows comes from the view, which is role-shaped.
 */
export type DriverStep =
  | { kind: "sent" } | { kind: "finished" } | { kind: "wrote" } | { kind: "done" } | { kind: "reaped" } | { kind: "idle" }
  | { kind: "paused"; reason: string }
  | { kind: "waiting"; reason: string; until: string | null }
  | { kind: "not_running" | "not_preparing"; status: SmsCampaignStatus };

/** A step as the driver may be handed it (`DriverStep`): the figures and the cursor taken out. */
export function driverStep(step: StepOutcome): DriverStep {
  switch (step.kind) {
    case "paused":
      return { kind: "paused", reason: step.reason };
    case "waiting":
      return { kind: "waiting", reason: step.reason, until: step.until };
    case "not_running":
    case "not_preparing":
      return { kind: step.kind, status: step.status };
    default:
      return { kind: step.kind };
  }
}

/** E10 widened · the per-campaign step flights of this PROCESS, on `globalThis`. */
export type StepFlights = { flights: Map<string, { since: number; ticket: number }>; ticket: number };

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CAMPAIGN_STEPS: StepFlights | undefined;
}

/** The process's own step flights (created on first use) — shared by every module instance. */
export function campaignStepFlights(): StepFlights {
  return (globalThis.__50PICK_CAMPAIGN_STEPS ??= { flights: new Map(), ticket: 0 });
}

/** ⭐ A step flight older than this (or dated ahead by as much) is a lost one: no step runs this long. */
export const STEP_FLIGHT_STALE_MS = REAP_AFTER_MS;

/** The audit door as these services use it. */
export type AuditFn = (entry: Parameters<typeof audit>[0]) => unknown;

/** Every read, rule and write the services make — swappable for the suite's in-process plants; production passes none. */
export type ControlDeps = {
  /** ⛔ The step as the driver may be handed it (`driverStep`: no figure, no cursor) — a member only so the suite can plant
   *  its absence; production's is the function itself. */
  shape: (step: StepOutcome) => DriverStep;
  campaigns: {
    find: (id: string) => Promise<StoredSmsCampaign | null>;
    transition: (id: string, t: SmsCampaignTransition) => Promise<StoredSmsCampaign | null>;
  };
  recipients: {
    /** The rows by status (a groupBy) — Resume's counts and Stop's "left". */
    countByStatus: (campaignId: string) => Promise<SmsCampaignRecipientCount[]>;
    /** E8 · HELD → PENDING, attempts 0 (U43a). */
    requeueHeld: (campaignId: string, at: string) => Promise<number>;
  };
  /** U49a · Start's ONE list (`checkStart`). */
  check: (c: StoredSmsCampaign) => Promise<StartCheck>;
  startSentence: typeof startRefusalSentence;
  /** U49a · Resume's refusal over the recipient COUNTS (`resumeRefusal`). */
  resumeCheck: (c: StoredSmsCampaign, counts: SmsCampaignRecipientStatusCounts) => Promise<ResumeRefusal | null>;
  resumeSentence: typeof resumeRefusalSentence;
  /** U49a · what is left (`resumeOutstanding`). */
  outstanding: typeof resumeOutstanding;
  /** OD66 at Start (`startAudienceRefusedFor`, over `campaignAudienceRefusal`). */
  audienceRefusal: typeof startAudienceRefusedFor;
  /** Can the audience travel into a copy, for this viewer (`copyTravel`)? */
  travel: typeof copyTravel;
  /** ⛔ E23 · may a copy-advising sentence say whether anybody was messaged, to this viewer (`liveReach`)? */
  reach: typeof liveReach;
  /** THE composer's one save (`saveCampaignDraft`). */
  saveDraft: (input: CampaignDraftInput, officerId: string, options: CampaignDraftOptions) => Promise<CampaignDraftResult>;
  /** §3.3 · the three engines a step dispatches to. */
  enqueue: (campaignId: string) => Promise<EnqueueStepResult>;
  slice: (campaignId: string) => Promise<SliceStepResult>;
  reap: (campaignId: string) => Promise<ReapResult>;
  /** The ONE view-model (`campaignLiveView`). */
  view: (id: string, viewer: LiveViewer) => Promise<CampaignLiveView | null>;
  /** E10 widened · the per-campaign flights (`campaignStepFlights`). */
  flights: () => StepFlights;
  audit: AuditFn;
  now: () => Date;
};

/** Frozen: production's services — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const CONTROL_DEPS: Readonly<ControlDeps> = Object.freeze({
  shape: driverStep,
  campaigns: Object.freeze({
    find: async (id: string) => db.smsCampaign.find(id),
    transition: async (id: string, t: SmsCampaignTransition) => db.smsCampaign.transition(id, t),
  }),
  recipients: Object.freeze({
    countByStatus: async (campaignId: string) => db.smsCampaignRecipient.countByStatus(campaignId),
    requeueHeld: async (campaignId: string, at: string) => db.smsCampaignRecipient.requeueHeld(campaignId, at),
  }),
  // ⭐ The REAL functions themselves (each called with its own production deps — the services never hand one any), so
  // `test:campaign-visuals` W1 can hold each member to its door by identity.
  check: checkStart,
  startSentence: startRefusalSentence,
  resumeCheck: resumeRefusal,
  resumeSentence: resumeRefusalSentence,
  outstanding: resumeOutstanding,
  audienceRefusal: startAudienceRefusedFor,
  travel: copyTravel,
  reach: liveReach,
  saveDraft: saveCampaignDraft,
  enqueue: enqueueStep,
  slice: runCampaignSlice,
  reap: reapStrandedClaims,
  view: campaignLiveView,
  flights: campaignStepFlights,
  audit,
  now: () => new Date(),
});

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The acting officer's id — ⛔ a blank one is a programming error: nothing is done without an officer to name. */
function officerOf(actor: ControlActor, what: string): string {
  const id = typeof actor?.userId === "string" ? actor.userId.trim() : "";
  if (id === "") throw new Error(`${what}: no officer — nothing was done`);
  return id;
}

/** The viewer a U49a refusal sentence is said to. */
const viewerOf = (actor: ControlActor): RefusalViewer => ({ money: actor?.money === true, reads: actor?.reads === true });

/** ⭐ ruling 543 · whether an awaited audit call left its row — a stand-in that throws, or a result without
 *  `recorded: true`, did not (the confirmation's own measurement, never a default). */
async function recordedBy(deps: ControlDeps, entry: Parameters<typeof audit>[0]): Promise<boolean> {
  try {
    const r = await deps.audit(entry);
    return r !== null && typeof r === "object" && (r as { recorded?: unknown }).recorded === true;
  } catch {
    return false;
  }
}

/** The act's sentence, and — when its audit row did not land — the second half (ruling 543). */
const withRecord = (message: string, recorded: boolean): string => (recorded ? message : `${message} ${LIVE_NOT_RECORDED}`);

/** The campaign's rows by status, every status present — the ONE count (a groupBy, OD26). */
async function countsOf(campaignId: string, deps: ControlDeps): Promise<SmsCampaignRecipientStatusCounts> {
  const out = zeroRecipientStatusCounts();
  for (const c of fillRecipientCounts(await deps.recipients.countByStatus(campaignId))) out[c.status] += c.count;
  return out;
}

const isTerminal = (s: SmsCampaignStatus): boolean => s === "DONE" || s === "CANCELLED";

/** ⛔ The figures a Start refusal's audit row may carry: money for the money reasons, the rail's problem — no count. */
function refusalRecord(r: StartRefusal): Record<string, string | number> {
  if (r.reason === "over_budget") return { costTzs: r.costTzs, budgetTzs: r.budgetTzs };
  if (r.reason === "credit_low") return { balanceTzs: r.balanceTzs, costTzs: r.costTzs, reserveTzs: r.reserveTzs };
  if (r.reason === "rail_dead") return { rail: r.rail };
  return {};
}

/* ══ START ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ START ONE CONFIRMED CAMPAIGN — OD66, then U49a's ONE list, then ONE conditional move (the header). Every refusal is
 * ONE `marketing.campaign_start_refused` row; a start is ONE `marketing.campaign_started` row.
 */
export async function startCampaign(campaignId: string, actor: ControlActor, deps: ControlDeps = CONTROL_DEPS): Promise<ControlResult<StartControlRefusal>> {
  const officer = officerOf(actor, "startCampaign");
  const viewer = viewerOf(actor);
  const refuse = async (reason: StartControlRefusal, message: string, targetId: string | null, record: Record<string, string | number> = {}): Promise<ControlResult<StartControlRefusal>> => {
    await recordedBy(deps, {
      category: "ADMIN", action: CAMPAIGN_START_REFUSED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId,
      payload: { reason, ...record },
    });
    return { ok: false, reason, message };
  };

  const c = typeof campaignId === "string" && campaignId !== "" ? await deps.campaigns.find(campaignId) : null;
  // ⛔ A campaign id is recorded only when it names a stored row (a posted id is text anyone can send).
  if (c === null) return refuse("not_found", LIVE_MISSING, null);

  // ⛔ OD66 · BEFORE ANYTHING IS COUNTED — U49a's check counts the population last, both arms whoever asks.
  if (c.status === "CONFIRMED") {
    const refused = deps.audienceRefusal(c, viewer.reads);
    if (refused !== null) return refuse("audience_refused", START_AUDIENCE_REFUSED, c.id, { param: refused.param });
  }

  // ⭐ U49a · the ONE list, in its order — each refusal in ITS sentence for this viewer.
  const check = await deps.check(c);
  if (!check.ok) return refuse(check.refusal.reason, deps.startSentence(check.refusal, viewer), c.id, refusalRecord(check.refusal));

  // ONE conditional move — of two officers pressing Start, one wins.
  const at = deps.now().toISOString();
  const moved = await deps.campaigns.transition(c.id, { from: ["CONFIRMED"], to: "PREPARING", patch: { startedAt: at }, draftRevision: null, at });
  if (moved === null) {
    const now = await deps.campaigns.find(c.id);
    const message = now !== null && (now.status === "PREPARING" || now.status === "RUNNING" || now.status === "PAUSED" || now.status === "DONE")
      ? LIVE_CHANGED.startedElsewhere
      : now !== null && now.status === "CANCELLED" ? LIVE_CHANGED.stoppedElsewhere : deps.startSentence({ reason: "not_confirmed" }, viewer);
    return refuse("not_confirmed", message, c.id);
  }
  const recorded = await recordedBy(deps, {
    category: "ADMIN", action: CAMPAIGN_STARTED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId: c.id,
    payload: { count: c.audienceCount, estimateSegments: c.estimateSegments, freshCount: check.freshCount, shrunkBy: check.shrunkBy },
  });
  return { ok: true, message: withRecord(LIVE_DONE.start, recorded), recorded };
}

/* ══ PAUSE ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ PAUSE — PREPARING · RUNNING → PAUSED, the officer's reason; ONE ADMIN `marketing.campaign_paused` row. A slice already
 *  past its last check sends; one still gating is vetoed by its own re-read before the wire (E6). */
export async function pauseCampaign(campaignId: string, actor: ControlActor, deps: ControlDeps = CONTROL_DEPS): Promise<ControlResult<PauseControlRefusal>> {
  const officer = officerOf(actor, "pauseCampaign");
  const c = typeof campaignId === "string" && campaignId !== "" ? await deps.campaigns.find(campaignId) : null;
  if (c === null) return { ok: false, reason: "not_found", message: LIVE_MISSING };
  const why = (s: SmsCampaignStatus): ControlResult<PauseControlRefusal> =>
    s === "DRAFT" ? { ok: false, reason: "draft", message: LIVE_DISABLED.draft }
      : s === "PAUSED" ? { ok: false, reason: "already_paused", message: LIVE_CHANGED.alreadyPaused }
        : { ok: false, reason: "not_sending", message: isTerminal(s) ? LIVE_DISABLED.stop : LIVE_DISABLED.pause };
  if (c.status !== "PREPARING" && c.status !== "RUNNING") return why(c.status);
  const at = deps.now().toISOString();
  const moved = await deps.campaigns.transition(c.id, {
    from: ["PREPARING", "RUNNING"], to: "PAUSED", patch: { pausedAt: at, stopReason: OFFICER_PAUSED }, draftRevision: null, at,
  });
  if (moved === null) {
    const now = await deps.campaigns.find(c.id);
    return now === null ? { ok: false, reason: "not_found", message: LIVE_MISSING } : why(now.status);
  }
  const recorded = await recordedBy(deps, {
    category: "ADMIN", action: CAMPAIGN_PAUSED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId: c.id,
    payload: { reason: OFFICER_PAUSED },
  });
  return { ok: true, message: withRecord(LIVE_DONE.pause, recorded), recorded };
}

/* ══ RESUME ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ RESUME — U49a's refusal over the COUNTS (what only a new copy can fix first; nothing it reads is skipped while anything
 * is left), then the HELD rows re-queued, THEN the move: PAUSED → RUNNING, or PREPARING when the list never finished.
 * ONE ADMIN `marketing.campaign_resumed` row `{ requeuedHeld, to }`.
 */
export async function resumeCampaign(campaignId: string, actor: ControlActor, deps: ControlDeps = CONTROL_DEPS): Promise<ControlResult<ResumeControlRefusal>> {
  const officer = officerOf(actor, "resumeCampaign");
  const viewer = viewerOf(actor);
  const c = typeof campaignId === "string" && campaignId !== "" ? await deps.campaigns.find(campaignId) : null;
  if (c === null) return { ok: false, reason: "not_found", message: LIVE_MISSING };
  const why = (s: SmsCampaignStatus): ControlResult<ResumeControlRefusal> =>
    s === "DRAFT" ? { ok: false, reason: "draft", message: LIVE_DISABLED.draft }
      : { ok: false, reason: "not_paused", message: s === "PREPARING" || s === "RUNNING" ? LIVE_CHANGED.alreadySending : isTerminal(s) ? LIVE_DISABLED.stop : LIVE_DISABLED.resume };
  if (c.status !== "PAUSED") return why(c.status);

  // ⭐ U49a · the recipient COUNTS, as stored now — never a figure a caller worked out.
  const counts = await countsOf(c.id, deps);
  const refusal = await deps.resumeCheck(c, counts);
  if (refusal !== null) {
    // ⛔ E23 · what only a new copy can fix carries `reached`: below the floor its words must not say whether anybody on the
    // campaign was messaged, so such a viewer reads the copy advice as a condition (U49a's sentence for everyone else).
    const hidden = "reached" in refusal && deps.reach(c, counts, viewer.reads) === "hidden";
    return {
      ok: false, reason: refusal.reason,
      message: hidden && "reached" in refusal ? resumeCopyOnlyHiddenSentence(refusal.reason) : deps.resumeSentence(refusal, viewer),
    };
  }

  // ⭐ E8 · the HELD rows start over BEFORE the move: a slice that ran first would find only HELD rows and pause again.
  const at = deps.now().toISOString();
  const requeued = await deps.recipients.requeueHeld(c.id, at);
  const to: SmsCampaignStatus = typeof c.enqueuedAt === "string" && c.enqueuedAt !== "" ? "RUNNING" : "PREPARING";
  const moved = await deps.campaigns.transition(c.id, { from: ["PAUSED"], to, patch: { stopReason: null }, draftRevision: null, at });
  if (moved === null) {
    const now = await deps.campaigns.find(c.id);
    return now === null ? { ok: false, reason: "not_found", message: LIVE_MISSING } : why(now.status);
  }
  const recorded = await recordedBy(deps, {
    category: "ADMIN", action: CAMPAIGN_RESUMED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId: c.id,
    payload: { requeuedHeld: requeued, to },
  });
  return { ok: true, message: withRecord(LIVE_DONE.resume, recorded), recorded };
}

/* ══ STOP ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ STOP — for good: → CANCELLED, the officer's reason. ⛔ E25 · nothing on the list is rewritten. ONE ADMIN
 *  `marketing.campaign_stopped` row `{ outstanding }` — everyone confirmed who had no answer when it stopped. */
export async function stopCampaign(campaignId: string, actor: ControlActor, deps: ControlDeps = CONTROL_DEPS): Promise<ControlResult<StopControlRefusal>> {
  const officer = officerOf(actor, "stopCampaign");
  const c = typeof campaignId === "string" && campaignId !== "" ? await deps.campaigns.find(campaignId) : null;
  if (c === null) return { ok: false, reason: "not_found", message: LIVE_MISSING };
  if (c.status === "DRAFT") return { ok: false, reason: "draft", message: LIVE_DISABLED.draft };
  if (isTerminal(c.status)) return { ok: false, reason: "finished", message: LIVE_DISABLED.stop };
  const at = deps.now().toISOString();
  const moved = await deps.campaigns.transition(c.id, {
    from: ["CONFIRMED", "PREPARING", "RUNNING", "PAUSED"], to: "CANCELLED", patch: { finishedAt: at, stopReason: OFFICER_STOPPED },
    draftRevision: null, at,
  });
  if (moved === null) return { ok: false, reason: "finished", message: LIVE_DISABLED.stop };
  const counts = await countsOf(c.id, deps);
  const outstanding = deps.outstanding(moved, counts) ?? outstandingRows(counts);
  const recorded = await recordedBy(deps, {
    category: "ADMIN", action: CAMPAIGN_STOPPED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId: c.id,
    payload: { outstanding },
  });
  return { ok: true, message: withRecord(LIVE_DONE.stop, recorded), recorded };
}

/* ══ MAKE A COPY ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The copy's staff-only name: "<name> (copy)" when it fits the composer's limit, else the name as it is. */
export function copyNameOf(name: string): string {
  const base = typeof name === "string" ? name.trim() : "";
  const named = `${base} (copy)`;
  return charCount(named) <= CAMPAIGN_NAME_MAX_CHARS ? named : base;
}

/**
 * ⭐ MAKE A COPY — a NEW DRAFT through the composer's one save, with the stored message and the stored audience as the
 * composer's address (the header). ⛔ Refused when the audience cannot travel — never a copy that widens. ONE ADMIN
 * `marketing.campaign_copied` row `{ from, to }` beside the save's own `marketing.campaign_created`.
 */
export async function copyCampaign(campaignId: string, actor: ControlActor, deps: ControlDeps = CONTROL_DEPS): Promise<CopyResult> {
  const officer = officerOf(actor, "copyCampaign");
  const reads = actor?.reads === true;
  const c = typeof campaignId === "string" && campaignId !== "" ? await deps.campaigns.find(campaignId) : null;
  if (c === null) return { ok: false, reason: "not_found", message: LIVE_MISSING };
  if (c.status === "DRAFT") return { ok: false, reason: "draft", message: LIVE_DISABLED.draft };
  // ⛔ Was anybody on it messaged? A copy messages them again — the answer says so (as a condition under the floor).
  const reach = deps.reach(c, await countsOf(c.id, deps), reads);
  const travel = deps.travel(c, reads);
  if (!travel.ok) return { ok: false, reason: "audience_cannot_travel", message: copyCantTravelSentence(reach) };
  const saved = await deps.saveDraft({
    id: null, draftRevision: null, name: copyNameOf(c.name), bodySw: c.bodySw ?? "", bodyEn: c.bodyEn ?? "",
    nameFallbackSw: c.nameFallbackSw ?? "", nameFallbackEn: c.nameFallbackEn ?? "", audience: travel.params,
  }, officer, { viewerReads: reads });
  if (!saved.ok) {
    if (saved.reason === "invalid") {
      // The draft door's verdict on the AUDIENCE (this viewer's role rule, OD55) is the audience not travelling; on the
      // message or the name, the copy cannot be made as it is.
      return saved.problems.audience !== undefined
        ? { ok: false, reason: "audience_cannot_travel", message: copyCantTravelSentence(reach) }
        : { ok: false, reason: "message_cannot_travel", message: copyMessageRefusedSentence(saved.error) };
    }
    // A new draft is refused nothing else but a source line that could not be read just now — retryable, in its own words.
    return { ok: false, reason: saved.reason === "source_unreadable" ? "source_unreadable" : "message_cannot_travel", message: saved.error };
  }
  const recorded = await recordedBy(deps, {
    category: "ADMIN", action: CAMPAIGN_COPIED_ACTION, actorId: officer, targetType: "SmsCampaign", targetId: c.id,
    payload: { from: c.id, to: saved.id },
  });
  return { ok: true, id: saved.id, href: campaignDraftHref(saved.id), message: withRecord(copyDoneSentence(reach), recorded), recorded };
}

/* ══ THE STEP ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** E10 widened · take THIS campaign's step flight, or say it is taken. A flight older than `STEP_FLIGHT_STALE_MS` (or
 *  dated ahead by as much) is a lost one and no longer holds. JavaScript runs this to its end before any other step can. */
function takeStepFlight(s: StepFlights, campaignId: string, nowMs: number): number | null {
  const f = s.flights.get(campaignId);
  if (f !== undefined && Math.abs(nowMs - f.since) < STEP_FLIGHT_STALE_MS) return null;
  const ticket = (s.ticket = (Number.isSafeInteger(s.ticket) ? s.ticket : 0) + 1);
  s.flights.set(campaignId, { since: nowMs, ticket });
  return ticket;
}
/** Only the flight's own ticket releases it (a step that outlived its staleness never drops its successor's). */
function dropStepFlight(s: StepFlights, campaignId: string, ticket: number): void {
  const f = s.flights.get(campaignId);
  if (f !== undefined && f.ticket === ticket) s.flights.delete(campaignId);
}

/** §3.3 · what one step does for a campaign in this status. */
async function stepFor(c: StoredSmsCampaign, deps: ControlDeps): Promise<StepOutcome> {
  switch (c.status) {
    case "PREPARING":
      await deps.reap(c.id);
      return deps.enqueue(c.id);
    case "RUNNING":
      return deps.slice(c.id);
    case "PAUSED":
    case "CANCELLED":
    case "DONE":
      return { kind: "reaped", reaped: (await deps.reap(c.id)).reaped };
  }
  return { kind: "idle" };
}

/** A step's own sentence: a wait in words (`waitSentence`); everything else the view says. */
export function stepSaid(step: StepOutcome): string | null {
  return step.kind === "waiting" ? waitSentence(step.reason, step.until) : null;
}

/**
 * ⭐ ONE DRIVER CALL (§3.3 · E22 — the header): act-gated; this campaign's flight taken or `waiting busy`; one step for its
 * status; the flight released (even when the step throws — and a step that throws reaches the caller, so the driver stops
 * and says so); then the view, as this viewer may see it.
 */
export async function campaignStep(campaignId: string, viewer: LiveViewer, deps: ControlDeps = CONTROL_DEPS): Promise<StepActionResult> {
  if (viewer?.mayAct !== true) return { ok: false, reason: "role", error: LIVE_DISABLED.role };
  const id = typeof campaignId === "string" ? campaignId : "";
  if (id === "") return { ok: false, reason: "not_found", error: LIVE_MISSING };
  const flights = deps.flights();
  const ticket = takeStepFlight(flights, id, deps.now().getTime());
  let step: StepOutcome;
  if (ticket === null) {
    step = { kind: "waiting", reason: "busy", until: null };
  } else {
    try {
      const c = await deps.campaigns.find(id);
      if (c === null) return { ok: false, reason: "not_found", error: LIVE_MISSING };
      step = await stepFor(c, deps);
    } finally {
      dropStepFlight(flights, id, ticket);
    }
  }
  const view = await deps.view(id, viewer);
  if (view === null) return { ok: false, reason: "not_found", error: LIVE_MISSING };
  return { ok: true, step: deps.shape(step), said: stepSaid(step), view };
}
