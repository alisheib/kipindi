/**
 * U47b-2 (the review's MAJOR) · THE DRIVER'S STEP DOOR — `POST /api/admin/campaigns/<id>/step`, answering the driver's step as
 * JSON (ENGINE-SPEC §4.15 decision 3). The route (`src/app/api/admin/campaigns/[id]/step/route.ts`) is THIN: it gathers the
 * request's three facts — the method, `Sec-Fetch-Site`, the id in the path — hands them to `campaignStepDoor` here, and turns
 * the answer into a response. Every decision is made here, where `test:campaign-visuals` V12 drives it in-process.
 *
 * ⭐ WHY A DOOR AND NOT AN ACTION. Next 16 runs the server actions a page invokes ONE AT A TIME, in the order they were
 * called (measured: a Pause clicked 3 s into an 8 s slice went out at 8 s, when the slice returned). The step is the one call
 * that takes seconds — it claims a group, checks every person, sends — so as an action it made every press wait behind it:
 * the driving tab's own Pause reached the server only when the slice it was pressed to stop had already returned, and a Stop
 * could not even be sent while a Pause waited. A `fetch` to a route is not in that queue, so the five presses (still actions)
 * go out the moment they are pressed.
 * ⚠️ WHAT A PAUSE CAN STOP, from THIS tab or any other (the press is the same action): everything that has not passed its last
 * check — a slice still gating is vetoed by its own re-read before the wire (E6) and the next step finds the campaign paused.
 * A group ALREADY past its last check still goes (at most one, `SLICE_MAX`), which is why the Pause and Stop toasts and the Stop
 * dialog say "a group already being sent may still go out". Moving the step out of the queue is what lets a Pause land while
 * that slice is still gating; it does not recall a message the wire already has.
 *
 * ⛔ BUILT AS A DOOR, like `contactsExportDoor` and the preview doors (`sameOriginRequest`):
 *   · POST ONLY — any other method is a 405 that names POST, and reads nothing;
 *   · NEVER CROSS-SITE — `Sec-Fetch-Site` from anywhere but this origin is a 403, asked BEFORE the session is read (a request a
 *     browser made on another site's behalf would carry the officer's SameSite=Lax cookies on a top-level navigation; a
 *     header-less client — an old browser, a script — is let through, the preview door's own rule);
 *   · THE ID COMES FROM THE PATH, and the body is never read: nothing the browser posts can say who is acting, what they may
 *     see, or which group to send;
 *   · THE GUARD IS THE FIRST THING THAT TOUCHES ANYTHING — `softCheckStaff("growth", "marketing.campaign.step", …)`, the very
 *     guard the step had when it was a server action: the STORED role's act grant (an audited `privilege_escalation_blocked` on a refusal), and
 *     a 2-step sign-in that lapsed REFUSED IN WORDS with the step-up page's address, never redirected to — a redirect would
 *     corrupt a JSON answer, and the officer pressed nothing;
 *   · A VISITOR WITH NO SESSION is not redirected either: the guard sends one to the sign-in page by throwing a redirect, and
 *     this door turns that into `signed_out`, in words, with the sign-in address — the driver stops and says so;
 *   · THE VIEWER IS THE STORED ROLE'S (`liveViewerFor`, failing closed) and the service is `campaignStep` — the very one the
 *     action called — so the answer is its answer, byte for byte, as JSON;
 *   · NOTHING ESCAPES AS A 500 PAGE: a step that throws after the guard passed is a typed `unfinished` answer (a group may or
 *     may not have gone out, so the driver stops and says so — it never asks again by itself); a GUARD that throws is the same
 *     type in its own words (nothing was asked of the campaign, so nothing may have gone out — `LIVE_STEP_GUARD_FAILED`); the
 *     log line names the error's TYPE alone. Every response carries `Cache-Control: no-store`.
 * ⛔ NO SMS LEAVES FROM HERE except through the step the engine already makes. No phone number is in any answer (the view
 * holds none); no money word reaches a viewer who may not read money (the view decides, once).
 *
 * Guard: `npm run test:campaign-visuals` §page (V12 · V5) · Red: `npm run red:campaign-visuals`.
 */
import { softCheckStaff } from "@/lib/server/rbac-guard";
import { sameOriginRequest } from "@/lib/server/journey-preview-doors";
import { campaignStep } from "@/lib/server/marketing/campaign-control";
import type { LiveViewer } from "@/lib/server/marketing/campaign-live";
import { campaignDetailHref } from "@/lib/marketing/campaign-status";
import { adminNextDest } from "@/components/admin/admin-nav-groups";
import { liveViewerFor } from "./live-viewer";
import { refusedBy } from "./live-run";
import type { LiveStepAnswer } from "./live-run";
import { LIVE_MISSING, LIVE_ROLE_REFUSAL, LIVE_SIGNED_OUT, LIVE_STEP_GUARD_FAILED, LIVE_STEP_UNFINISHED } from "./live-copy";

/** Where a visitor with no session signs in. */
const SIGN_IN = "/auth/admin";

/** The route's three facts about a request — and nothing else: the body is never read. */
export type LiveStepDoorRequest = { method: string; secFetchSite: string | null; campaignId: unknown };

/** What the route sends back: a status, and — unless the request was refused before anything was asked — the typed answer. */
export type LiveStepDoorAnswer = { status: number; body: LiveStepAnswer | null; allow?: "POST" };

/** The door's dependencies — swappable for the suite's stand-ins; production's are `LIVE_STEP_DOOR_DEPS`. */
export type LiveStepDoorDeps = {
  /** The guard: `softCheckStaff` (the suite hands in one with a stand-in request — the session and the second factor). */
  guard: typeof softCheckStaff;
  /** The viewer, from the officer's STORED role. */
  viewer: (userId: string) => Promise<LiveViewer>;
  /** The service. */
  step: typeof campaignStep;
  /** The server's own record of a throw: the error's NAME only. */
  log: (err: unknown) => void;
};

const errorName = (err: unknown): string => (err instanceof Error && err.name !== "" ? err.name : "error");

/** Frozen: production's — nothing may reassign a member in-process (a suite hands in its own copy instead). */
export const LIVE_STEP_DOOR_DEPS: Readonly<LiveStepDoorDeps> = Object.freeze({
  guard: softCheckStaff,
  viewer: (userId: string) => liveViewerFor(userId),
  step: campaignStep,
  log: (err: unknown) => {
    console.error("[admin/campaigns/[id]/step] threw:", errorName(err));
  },
});

/** A Next redirect thrown out of the guard (no session, or no row for the session): navigation is not an answer here. */
function isRedirect(err: unknown): boolean {
  return err !== null && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

/**
 * ⭐ THE DOOR — see the header. Never throws; every path answers.
 *   1. POST only; never cross-site (asked before the session is read);
 *   2. the guard — the first thing that touches anything;
 *   3. the stored role's viewer, and the service;
 *   4. the answer as the service gave it, or `not_found`/`role` as its own refusals, or `unfinished`.
 */
export async function campaignStepDoor(req: LiveStepDoorRequest, deps: LiveStepDoorDeps = LIVE_STEP_DOOR_DEPS): Promise<LiveStepDoorAnswer> {
  if (req.method !== "POST") return { status: 405, body: null, allow: "POST" };
  if (!sameOriginRequest(req.secFetchSite)) return { status: 403, body: null };
  const id = typeof req.campaignId === "string" ? req.campaignId : "";
  let g: Awaited<ReturnType<typeof softCheckStaff>>;
  try {
    g = await deps.guard("growth", "marketing.campaign.step", LIVE_ROLE_REFUSAL);
  } catch (err) {
    // The guard sends a visitor with no session to the sign-in page by throwing a redirect; a JSON caller is told in words.
    // ⛔ The way back is the console's own (`adminNextDest`, ruling 551(a)): the SECTION, never the record's `cmp_…` id.
    if (isRedirect(err)) return { status: 401, body: { ok: false, reason: "signed_out", error: LIVE_SIGNED_OUT, href: `${SIGN_IN}?next=${encodeURIComponent(adminNextDest(campaignDetailHref(id)))}` } };
    // A guard that could not answer asked nothing of the campaign: its own words, not "a group may have gone out".
    deps.log(err);
    return { status: 500, body: { ok: false, reason: "unfinished", error: LIVE_STEP_GUARD_FAILED } };
  }
  if (!g.ok) return { status: 403, body: refusedBy(g) };
  try {
    const viewer = await deps.viewer(g.userId);
    const r = await deps.step(id, viewer);
    if (r.ok) return { status: 200, body: r };
    // The service never asks for a second factor — its type holds the word for the guard's sake alone — so a refusal that is
    // not "not found" is the role's.
    return r.reason === "not_found"
      ? { status: 404, body: { ok: false, reason: "not_found", error: r.error || LIVE_MISSING } }
      : { status: 403, body: { ok: false, reason: "role", error: r.error } };
  } catch (err) {
    deps.log(err);
    return { status: 500, body: { ok: false, reason: "unfinished", error: LIVE_STEP_UNFINISHED } };
  }
}
