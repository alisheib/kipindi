/**
 * U47b-2 · HOW THE LIVE PAGE'S ACTS ARE RUN AND ANSWERED — the part of `actions.ts` that is not a guard, kept out of it so a
 * suite can drive it with stand-ins (ENGINE-SPEC §4.15 decisions 3, 4 and 7; ruling 543).
 *
 * ⛔ WHY A MODULE OF ITS OWN. A `"use server"` file may export nothing but async functions, and every one it exports is a
 * public endpoint a browser can post to: a helper exported from `actions.ts` would be a seventh door with no guard. So the
 * doors (`actions.ts`) hold what must be seen there — each guard as its FIRST statement, then the service call — and this
 * file holds what happens around the call. SERVER-ONLY (the view reads the store); it holds no directive and no `*Action`.
 *
 * ⭐ AN ACT'S ANSWER CARRIES THE CAMPAIGN AS IT IS NOW (`view`), read after the act, as the officer's own viewer may see it —
 * so the page shows where the campaign is the moment the press is answered, and never waits out the driver's next call. A
 * view that cannot be read is null (the act still answers; the driver's next call reads it again), never a failed act.
 * ⛔ A SERVICE THAT THROWS AFTER IT WAS HANDED THE CAMPAIGN MAY OR MAY NOT HAVE DONE ITS WORK: the answer is `unfinished`, in
 * `LIVE_ACT_UNFINISHED`'s words ("this may or may not have happened … check it before you press again"), with the fresh view
 * beside it — never "nothing was done", never a blind retry. The log line names the error's TYPE alone: no message can carry
 * a number, and no number is ever printed.
 * ⭐ RESUME MAY ANSWER `busy` (the U47b-1 re-review): it runs inside the campaign's step flight, so a double press, or this
 * page's own step mid-flight, finds the flight taken. It is asked AGAIN ONCE, a second later, before the busy sentence is
 * said — a transient clash is not an answer the officer should have to press through. ⛔ Once: a second `busy` is said.
 *
 * Guard: `npm run test:campaign-visuals` §page (V5 · V11) · Red: `npm run red:campaign-visuals`.
 */
import { revalidatePath } from "next/cache";
import { campaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { CampaignLiveView, LiveViewer } from "@/lib/server/marketing/campaign-live";
import type { ControlResult, CopyResult, StepActionResult } from "@/lib/server/marketing/campaign-control";
import { liveViewerFor } from "./live-viewer";
import { LIVE_ACT_UNFINISHED } from "./live-copy";

/* ══ THE ANSWERS (the page's client and driver read these as TYPES alone) ═══════════════════════════════════════════ */

/**
 * ⛔ WHY THESE LIVE HERE AND NOT IN `actions.ts`: a client module that names the actions file at all — even for a type — is an
 * acting control to `test:admin-act-gate` (it matches the import's path, not its kind), and the driver is not one: it is wired
 * by `live-client.tsx`, which consults the act gate. So the driver reads the shapes of the doors' answers from here.
 */

/** A refusal before the campaign was asked anything: no officer for it, no campaign, or a second factor to confirm first. */
export type LiveRefused =
  | { ok: false; reason: "role" | "not_found"; error: string }
  | { ok: false; reason: "second_factor"; error: string; href: string };
/** The driver's step: what `campaignStep` answers (the step as the driver may be handed it, and the view), or a refusal. */
export type LiveStepAnswer = Extract<StepActionResult, { ok: true }> | LiveRefused;
/** The poll: the campaign as this viewer may see it, or a refusal. */
export type LiveViewAnswer = { ok: true; view: CampaignLiveView } | LiveRefused;

/**
 * What every act answers — Start · Pause · Resume · Stop · Make a copy. `reason` is the service's own refusal key, or this
 * file's: `role` (the guard), `rate_limited` (a copy's save budget) and `unfinished` (the service threw). `href` is a copy's
 * address (the composer, for the new draft) and null for every other act. `view` is the campaign now, or null when it could
 * not be read.
 */
export type LiveActAnswer =
  | { ok: true; message: string; recorded: boolean; href: string | null; view: CampaignLiveView | null }
  | { ok: false; reason: string; message: string; view: CampaignLiveView | null };

/** An act refused before it reached a service: the guard's sentence, no view (nothing was asked of the campaign). */
export function actRefused(reason: string, message: string): LiveActAnswer {
  return { ok: false, reason, message, view: null };
}

/* ══ THE DEPENDENCIES — swappable for the suite's stand-ins; production passes none ═════════════════════════════════ */

export type LiveRunDeps = {
  /** The viewer, from the officer's STORED role (`liveViewerFor` — read once, failing closed). */
  viewer: (userId: string) => Promise<LiveViewer>;
  /** The campaign as that viewer may see it — null when it is not there; a read that fails throws. */
  view: (id: string, viewer: LiveViewer) => Promise<CampaignLiveView | null>;
  /** The campaigns list is stale after an act that landed. */
  revalidate: () => void;
  /** The server's own record of a service that threw: the error's NAME only. */
  log: (tag: string, err: unknown) => void;
  sleep: (ms: number) => Promise<void>;
};

const errorName = (err: unknown): string => (err instanceof Error && err.name !== "" ? err.name : "error");

/** Frozen: production's — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_RUN_DEPS: Readonly<LiveRunDeps> = Object.freeze({
  viewer: (userId: string) => liveViewerFor(userId),
  view: (id: string, viewer: LiveViewer) => campaignLiveView(id, viewer),
  revalidate: () => {
    // ⛔ The act has landed: a stale list is the smaller harm, never a failed answer.
    try {
      revalidatePath("/admin/campaigns");
    } catch {
      /* outside a request scope */
    }
  },
  log: (tag: string, err: unknown) => {
    console.error(`[admin/campaigns/[id]] ${tag} threw:`, errorName(err));
  },
  sleep: (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }),
});

/* ══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The campaign now, for an answer — null when it could not be read (never a failure of the act it follows). */
async function viewNow(id: string, viewer: LiveViewer, deps: LiveRunDeps): Promise<CampaignLiveView | null> {
  try {
    return await deps.view(id, viewer);
  } catch {
    return null;
  }
}

/**
 * ⭐ RUN ONE ACT AFTER ITS GUARD PASSED: the viewer from the stored role, the service called with it as the actor (the
 * services refuse `role` themselves too), the list invalidated when the act landed, and the answer — the service's own
 * sentence, whether its record landed (ruling 543), and the campaign now. `run` is the service call itself, written at the
 * door (`actions.ts`) so the guard and the call it guards are read together.
 */
export async function runAct(
  campaignId: string,
  userId: string,
  tag: string,
  run: (actor: LiveViewer) => Promise<ControlResult<string> | CopyResult>,
  deps: LiveRunDeps = LIVE_RUN_DEPS,
): Promise<LiveActAnswer> {
  const viewer = await deps.viewer(userId);
  let result: ControlResult<string> | CopyResult;
  try {
    result = await run(viewer);
  } catch (err) {
    deps.log(tag, err);
    return { ok: false, reason: "unfinished", message: LIVE_ACT_UNFINISHED, view: await viewNow(campaignId, viewer, deps) };
  }
  if (result.ok) deps.revalidate();
  const view = await viewNow(campaignId, viewer, deps);
  if (!result.ok) return { ok: false, reason: result.reason, message: result.message, view };
  return { ok: true, message: result.message, recorded: result.recorded, href: "href" in result ? result.href : null, view };
}

/** How long Resume waits before it asks once more after a `busy` (the campaign's step flight was taken just then). */
export const RESUME_RETRY_MS = 1_000;

/**
 * ⭐ RESUME, ONCE MORE AFTER A `busy` — and only once. `resume` is the service (`resumeCampaign`), handed in so a suite can
 * count its calls; a second `busy` is its answer, and the page says it (`LIVE_CHANGED.resumeBusy`).
 */
export async function resumeWithRetry(
  resume: (campaignId: string, actor: LiveViewer) => Promise<ControlResult<string>>,
  campaignId: string,
  actor: LiveViewer,
  sleep: (ms: number) => Promise<void> = LIVE_RUN_DEPS.sleep,
): Promise<ControlResult<string>> {
  const first = await resume(campaignId, actor);
  if (first.ok || first.reason !== "busy") return first;
  await sleep(RESUME_RETRY_MS);
  return resume(campaignId, actor);
}
