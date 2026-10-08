"use client";

/**
 * U47b-2 · THE DRIVER — the loop that steps a campaign while its page is open, and the one that only watches (ENGINE-SPEC
 * §4.15 decision 3). Nothing sends unless a page like this one is open: the engine has no pump, so THIS is the pump, and
 * everything it may and may not do is a number or a rule in this file.
 *
 * ── WHAT IT DOES ───────────────────────────────────────────────────────────────────────────────────────────────────────
 *   · DRIVE — a viewer who may act, on a PREPARING or RUNNING campaign: `campaignStepAction` at once, then again after
 *     `STEP_GAP_MS` (2 s) when work was done, after the wait's `until` — at least `WAIT_MIN_MS` (5 s), at most `WAIT_MAX_MS`
 *     (30 s) — when the engine is waiting, and after `BUSY_GAP_MS` (5 s) when another step of the campaign held the flight.
 *   · WATCH — everyone else, and everyone on a campaign that is not being sent (CONFIRMED, PAUSED): `campaignViewAction` every
 *     `POLL_GAP_MS` (10 s), so a page never goes stale beside an officer who started, paused or resumed it elsewhere. A viewer
 *     who may not act never makes a step call.
 *   · OFF — a terminal status (DONE, CANCELLED): the loop ends. ⭐ On MOUNT, a viewer who may act on a PAUSED, CANCELLED or DONE
 *     campaign steps ONCE (the reaper — a claim stranded by a process that died must not read "not sent" for a message that
 *     went); a DONE or CANCELLED campaign then ends, a PAUSED one watches.
 *   The mode follows the campaign's status: when a call brings back a status that needs another mode (Start, Resume, Pause,
 *   the end), the loop returns and the hook starts the mode the status now needs — `useLiveDriver` re-keys on the mode.
 *
 * ── WHAT IT NEVER DOES ─────────────────────────────────────────────────────────────────────────────────────────────────
 *   · ⛔ RETRY BLIND. A call that THROWS (a deploy's new action ids, a lost connection) ends the loop and the page says it is
 *     out of date, with a Reload: the request may or may not have reached the server, and a step is not safe to replay on a
 *     guess. The same for a refusal: a second factor that lapsed stops it with the guard's sentence and the step-up link
 *     (and "Try again" starts it once the officer has confirmed); a role that may no longer act, a campaign that is gone.
 *   · ⛔ COMPUTE. It holds no figure: every count comes back in the view, which the page prints. `document.hidden` slows
 *     nothing on purpose — the browser throttles a background tab, and the page says to keep it open.
 *   · ⛔ OVERLAP ITSELF: one call at a time, the next only after the last answered and its gap slept; a loop that is replaced
 *     (a new mode, a retry) drops the answer of the call it left in flight.
 *
 * ── THE LOOP IS A FUNCTION, THE HOOK ONLY WIRES IT ─────────────────────────────────────────────────────────────────────
 * `runLiveLoop` takes its calls, its clock and its sleep as arguments, so `test:campaign-visuals` V6 drives the very loop the
 * page runs — every gap, every stop, the mount's one step — with stand-ins and no timer.
 *
 * Guard: `npm run test:campaign-visuals` §page (V6) · Red: `npm run red:campaign-visuals`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { DriverStep } from "@/lib/server/marketing/campaign-control";
import type { SmsCampaignStatus } from "@/lib/server/store";
import type { LiveRefused, LiveStepAnswer, LiveViewAnswer } from "./actions";

/* ══ THE NUMBERS (decision 3) ═══════════════════════════════════════════════════════════════════════════════════════ */

/** The gap after a step that did work. */
export const STEP_GAP_MS = 2_000;
/** A wait's `until`, but never sooner than this … */
export const WAIT_MIN_MS = 5_000;
/** … and never later than this: the page asks again at least this often, whatever the engine says it is waiting for. */
export const WAIT_MAX_MS = 30_000;
/** The gap after a step that found another step of the campaign running. */
export const BUSY_GAP_MS = 5_000;
/** A watching page asks for the campaign this often. */
export const POLL_GAP_MS = 10_000;

/* ══ THE SHAPES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** What the loop is doing for a campaign in this status, for a viewer who may or may not act. */
export type DriverMode = "drive" | "watch" | "off";

/** Why the loop ended before the campaign did — each with the one way on that can work. */
export type DriverStop =
  | { kind: "out_of_date" }
  | { kind: "second_factor"; sentence: string; href: string }
  | { kind: "role"; sentence: string }
  | { kind: "view_refused"; sentence: string }
  | { kind: "gone"; sentence: string };

/** ⭐ THE MODE a status needs. An acting viewer drives what is being sent; everything else that can still change is watched;
 *  a campaign that is over is left alone. */
export function driverMode(status: SmsCampaignStatus, mayAct: boolean): DriverMode {
  if (status === "DONE" || status === "CANCELLED") return "off";
  return mayAct && (status === "PREPARING" || status === "RUNNING") ? "drive" : "watch";
}

/** Does a page that may act step a campaign in this status ONCE when it opens (the reaper)? */
export function reapsOnMount(status: SmsCampaignStatus): boolean {
  return status === "PAUSED" || status === "CANCELLED" || status === "DONE";
}

/** A wait's gap: until the instant the engine named — at least `WAIT_MIN_MS`, at most `WAIT_MAX_MS`; the minimum when it named none. */
export function waitGap(until: string | null | undefined, nowMs: number): number {
  const at = typeof until === "string" ? Date.parse(until) : Number.NaN;
  if (!Number.isFinite(at)) return WAIT_MIN_MS;
  return Math.min(WAIT_MAX_MS, Math.max(WAIT_MIN_MS, at - nowMs));
}

/** ⭐ THE GAP AFTER A STEP — the spec's three: work done (2 s), a wait (until, 5–30 s), another step running (5 s). The step is
 *  the driver's own shape (`DriverStep`): a wait carries only whether it is `busy` and its `until` — never a reason. */
export function stepGap(step: DriverStep, nowMs: number): number {
  if (step.kind !== "waiting") return STEP_GAP_MS;
  return step.busy ? BUSY_GAP_MS : waitGap(step.until, nowMs);
}

/** A Next redirect thrown out of an action (the session ended): navigation is already under way, never "out of date". */
function isRedirect(err: unknown): boolean {
  return err !== null && typeof err === "object" && "digest" in err && String((err as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

/** A refusal, as the loop stops on it. A step's `role` is "may no longer act"; a poll's is "may no longer view". */
function stopOf(refused: LiveRefused, call: "step" | "poll"): DriverStop {
  if (refused.reason === "second_factor") return { kind: "second_factor", sentence: refused.error, href: refused.href };
  if (refused.reason === "not_found") return { kind: "gone", sentence: refused.error };
  return call === "step" ? { kind: "role", sentence: refused.error } : { kind: "view_refused", sentence: refused.error };
}

/* ══ THE LOOP ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type LoopOptions = {
  id: string;
  mode: DriverMode;
  mayAct: boolean;
  /** The mount's one step (the reaper) — before the loop proper. */
  reap: boolean;
  /** Read the campaign at once instead of after the first gap (an act's answer carried no view). */
  pollFirst: boolean;
  step: (id: string) => Promise<LiveStepAnswer>;
  poll: (id: string) => Promise<LiveViewAnswer>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** True once this loop was replaced or the page left: nothing it learns is applied after that. */
  cancelled: () => boolean;
  onView: (view: CampaignLiveView) => void;
  /** The wait in words, as the step said it — null when the step did work, and for a poll. */
  onSaid: (said: string | null) => void;
  onStop: (stop: DriverStop) => void;
  /** A call is about to be made — the page counts them (the drive reads the counts). */
  onCall: (call: "step" | "poll") => void;
  /** A step answered (the mount's included): this page's own driver has run. */
  onStepped: () => void;
  /** The mount's step answered. */
  onReaped: () => void;
};

type Turn = { over: true } | { over: false; view: CampaignLiveView; gap: number };

/** One call, and what the page does with its answer. ⛔ A throw ends the loop; nothing here asks twice. */
async function turn(o: LoopOptions, call: "step" | "poll"): Promise<Turn> {
  o.onCall(call);
  let answer: LiveStepAnswer | LiveViewAnswer;
  try {
    answer = call === "step" ? await o.step(o.id) : await o.poll(o.id);
  } catch (err) {
    if (!isRedirect(err) && !o.cancelled()) o.onStop({ kind: "out_of_date" });
    return { over: true };
  }
  if (o.cancelled()) return { over: true };
  if (!answer.ok) {
    o.onStop(stopOf(answer, call));
    return { over: true };
  }
  o.onView(answer.view);
  if ("step" in answer) {
    o.onStepped();
    o.onSaid(answer.said);
    return { over: false, view: answer.view, gap: stepGap(answer.step, o.now()) };
  }
  o.onSaid(null);
  return { over: false, view: answer.view, gap: POLL_GAP_MS };
}

/**
 * ⭐ THE LOOP. Returns when the campaign is over, when a call stopped it, when it was cancelled, or when the status it learned
 * needs another mode (the hook starts that one). It never throws.
 */
export async function runLiveLoop(o: LoopOptions): Promise<void> {
  if (o.reap) {
    const t = await turn(o, "step");
    if (t.over) return;
    o.onReaped();
    if (driverMode(t.view.status, o.mayAct) !== o.mode) return;
  }
  if (o.mode === "off") return;
  let gap = o.mode === "drive" || o.pollFirst ? 0 : POLL_GAP_MS;
  for (;;) {
    if (gap > 0) await o.sleep(gap);
    if (o.cancelled()) return;
    const t = await turn(o, o.mode === "drive" ? "step" : "poll");
    if (t.over) return;
    if (driverMode(t.view.status, o.mayAct) !== o.mode) return;
    gap = t.gap;
  }
}

/* ══ THE HOOK ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type LiveDriver = {
  /** The campaign as the last answer (or the render) left it. */
  view: CampaignLiveView;
  /** Put an act's answer on screen at once (a view the server read after the press). */
  setView: (view: CampaignLiveView) => void;
  /** The engine's wait, in words, while the last step was one. */
  said: string | null;
  /** Has this page's own driver completed a step? ("Nobody is driving" is not said to the page that is.) */
  ran: boolean;
  /** Why the loop ended early, or null. */
  stop: DriverStop | null;
  mode: DriverMode;
  /** The calls this page has made — the drive proves a viewer who may not act never made a step call. */
  steps: number;
  polls: number;
  /** After a stop the officer has dealt with (a second factor confirmed): drive again. */
  retry: () => void;
  /** Read the campaign now (an act answered without a view). */
  refresh: () => void;
};

export function useLiveDriver(o: {
  id: string;
  mayAct: boolean;
  initial: CampaignLiveView;
  step: (id: string) => Promise<LiveStepAnswer>;
  poll: (id: string) => Promise<LiveViewAnswer>;
}): LiveDriver {
  const [view, setViewState] = useState<CampaignLiveView>(o.initial);
  const [said, setSaid] = useState<string | null>(null);
  const [ran, setRan] = useState(false);
  const [stop, setStop] = useState<DriverStop | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState<{ steps: number; polls: number }>({ steps: 0, polls: 0 });
  const reaped = useRef(false);
  const pollNow = useRef(false);
  const mode = driverMode(view.status, o.mayAct);
  // The effect below is keyed on the MODE, never on the status: a status that keeps the mode (PREPARING → RUNNING) must not
  // restart the loop, or the gap after the step that did the work would be skipped.
  const statusRef = useRef<SmsCampaignStatus>(view.status);
  statusRef.current = view.status;
  const { id, mayAct, step, poll } = o;

  useEffect(() => {
    if (stop !== null) return undefined;
    let live = true;
    const wakers = new Set<() => void>();
    const reap = mayAct && !reaped.current && reapsOnMount(statusRef.current);
    const pollFirst = pollNow.current;
    pollNow.current = false;
    setSaid(null);
    // ⭐ Started on a tick, not in the effect: React's development double-run mounts, cleans up and mounts again, and a call
    // made by the first would be a second step beside the first of the page that stayed.
    const starter = setTimeout(() => {
      void runLiveLoop({
        id, mode, mayAct, reap, pollFirst, step, poll,
        sleep: (ms) => new Promise<void>((resolve) => {
          const timer = setTimeout(() => { wakers.delete(wake); resolve(); }, ms);
          const wake = () => { clearTimeout(timer); resolve(); };
          wakers.add(wake);
        }),
        now: () => Date.now(),
        cancelled: () => !live,
        onView: (v) => { if (live) setViewState(v); },
        onSaid: (s) => { if (live) setSaid(s); },
        onStop: (s) => { if (live) setStop(s); },
        onCall: (c) => { if (live) setCounts((n) => (c === "step" ? { ...n, steps: n.steps + 1 } : { ...n, polls: n.polls + 1 })); },
        onStepped: () => { if (live) setRan(true); },
        onReaped: () => { reaped.current = true; },
      });
    }, 0);
    return () => {
      live = false;
      clearTimeout(starter);
      for (const wake of wakers) wake();
      wakers.clear();
    };
  }, [id, mode, mayAct, step, poll, attempt, stop]);

  const setView = useCallback((v: CampaignLiveView) => { setViewState(v); }, []);
  const retry = useCallback(() => { setStop(null); setAttempt((n) => n + 1); }, []);
  const refresh = useCallback(() => { pollNow.current = true; setAttempt((n) => n + 1); }, []);

  return { view, setView, said, ran, stop, mode, steps: counts.steps, polls: counts.polls, retry, refresh };
}
