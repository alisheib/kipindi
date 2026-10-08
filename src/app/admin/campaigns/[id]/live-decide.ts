/**
 * U47b-2 (the review's MINORS 1–5 and 8) · WHAT THE LIVE PAGE DOES AND SAYS, AS PURE FUNCTIONS — the decisions that used to
 * sit inside `live-client.tsx`'s JSX and `press`, pulled out so the page CALLS them and `test:campaign-visuals` V14–V15
 * EXECUTES them (a grep of a component proves what it contains, not what it does). Nothing here holds state, reads a clock,
 * touches the DOM or imports a server module; the view and the driver's shapes arrive as TYPES.
 *
 *   · `liveMay` — who is let act: the server's decision AND the console's act gate (a page not told it may act never acts);
 *   · `controlState` / `reasonModel` — each control's state, and which disabled control's reason is PRINTED in words (the
 *     status's expected one, any that is not the plain "not in this state", a role's once for all five) — the rest are named to
 *     assistive technology (`aria-describedby`), never title-only;
 *   · `calloutsFor` — every callout's condition, in one place: "Nobody is sending" is said to an ACTOR only once its own driver
 *     has stopped (never above "Keep this page open" on the first paint), the closed window and the switch's closing time to a
 *     viewer who is not driving, a stopped driver's stale wait not at all;
 *   · `settlePress` / `toastFor` / `copyDestination` — what an answer does: a warning or advice stays on screen until it is
 *     dismissed (`variant: "warning"`, `durationMs: 0`), a refusal stays beside the controls, and Make a copy never takes a
 *     DRIVING tab away (that would silently end the only driver) — it offers the new draft as a link for a new tab;
 *   · `announcementFor` — the page's ONE live region says the status when it CHANGES, not every two seconds.
 */
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import type { DriverMode, DriverStop } from "./live-driver";
import type { LiveActAnswer } from "./live-run";
import {
  LIVE_CONTROL_LABEL, LIVE_DISABLED, liveAnnouncement, liveDoneIsPlain, liveSwitchClosesSentence, liveWindowSentence,
} from "./live-copy";

/* ══ THE SHAPES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

export type ActName = "start" | "pause" | "resume" | "stop" | "copy";
/** The five controls, in the order they are drawn. */
export const ACTS: readonly ActName[] = ["start", "pause", "resume", "stop", "copy"];
/** The two presses that ask first. */
export type DialogName = "start" | "stop";
/** The last refusal, by the press that met it — printed beside the controls until the next press. `href` is the step-up page
 *  for a second-factor refusal (opened in another tab). */
export type Refusal = { act: ActName; reason: string; message: string; href: string | null };

/* ══ WHO MAY ACT ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The server's decision (the officer's STORED role) AND the console's act gate — a page that is not told it may act by both
 *  never acts. The gate alone cannot widen the server's answer, and the server's cannot widen the gate's. */
export function liveMay(serverMay: boolean, gateMay: boolean): boolean {
  return serverMay === true && gateMay === true;
}

/* ══ THE CONTROLS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The control the status asks for — the one whose reason is always said in words beside the row. */
const EXPECTED: Readonly<Record<string, ActName | undefined>> = {
  CONFIRMED: "start", PREPARING: "pause", RUNNING: "pause", PAUSED: "resume",
};

/** One control's state: the view's verdict (decided on the server from the STORED role), then this page's own — the console's
 *  act gate, and ITS OWN press in flight (never another control's: the brake stays pressable while another press is pending). */
export function controlState(view: CampaignLiveView, act: ActName, mayAct: boolean, pending: ReadonlySet<ActName>): { enabled: boolean; reason: string | null } {
  const c = view.controls[act];
  if (!mayAct) return { enabled: false, reason: c.reason ?? LIVE_DISABLED.role };
  return { enabled: c.enabled && !pending.has(act), reason: c.enabled ? null : c.reason };
}

/** The four plain "not in this state" sentences: true, and already said by the status chip and the headline beside them. */
const PLAIN_STATE_REASONS: readonly string[] = [LIVE_DISABLED.start, LIVE_DISABLED.pause, LIVE_DISABLED.resume, LIVE_DISABLED.stop];

/** What is printed about the disabled controls, and what is only named to assistive technology. */
export type ReasonModel = {
  /** Printed beside the controls, in words. `acts` is every control the line explains. */
  lines: Array<{ id: string; acts: ActName[]; text: string }>;
  /** Disabled controls whose reason is not printed: said to a screen reader through `aria-describedby`, and in `title`. */
  quiet: Array<{ id: string; act: ActName; text: string }>;
};

/** The element a disabled control is described by — a printed line's, or its own quiet one. */
export function reasonIdFor(model: ReasonModel, act: ActName): string | undefined {
  return model.lines.find((l) => l.acts.includes(act))?.id ?? model.quiet.find((q) => q.act === act)?.id;
}

/**
 * ⭐ THE REVIEW'S MINOR 8 · A DISABLED CONTROL'S REASON, IN WORDS. A phone has no hover, and a disabled button takes no focus,
 * so `title` alone tells a finger and a screen reader nothing. Printed: a role that may only look — ONCE, for all five; the
 * control the status asks for; and any reason that is not the plain "not in this state" (the switch, OD66's audience, a copy
 * that cannot be made). The plain "not in this state" ones are not repeated in print (the chip and the headline say the state)
 * and are named to assistive technology instead. Equal reasons are said once.
 */
export function reasonModel(view: CampaignLiveView, mayAct: boolean): ReasonModel {
  const expected = EXPECTED[view.status];
  const printed: Array<{ act: ActName; text: string }> = [];
  const quiet: ReasonModel["quiet"] = [];
  if (!mayAct) {
    for (const act of ACTS) printed.push({ act, text: controlState(view, act, false, NO_PENDING).reason ?? LIVE_DISABLED.role });
  } else {
    for (const act of ACTS) {
      const s = controlState(view, act, true, NO_PENDING);
      if (s.enabled || s.reason === null) continue;
      if (act === expected || !PLAIN_STATE_REASONS.includes(s.reason)) printed.push({ act, text: s.reason });
      else quiet.push({ id: `live-reason-${act}`, act, text: s.reason });
    }
  }
  const lines: ReasonModel["lines"] = [];
  for (const p of printed) {
    const same = lines.find((l) => l.text === p.text);
    if (same) same.acts.push(p.act);
    else lines.push({ id: `live-reason-${p.act}`, acts: [p.act], text: p.text });
  }
  return { lines, quiet };
}

/** The empty set of presses in flight (a shared, never-mutated one). */
export const NO_PENDING: ReadonlySet<ActName> = new Set<ActName>();

/** The name a control is called in a list of reasons ("Start", never "Start…"). */
export const controlName = (act: ActName): string => LIVE_CONTROL_LABEL[act].replace("…", "");

/* ══ THE CALLOUTS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Every callout beside the controls and whether it is drawn — or, for the sentences computed from the view, the sentence. */
export type Callouts = {
  /** The last press's refusal (printed until the next press). */
  refusal: boolean;
  /** Why the driver stopped. */
  stop: boolean;
  /** The engine's wait in words — only while the driver that heard it is still running. */
  said: boolean;
  /** "Nobody is sending / preparing" — to a viewer who cannot act, and to an actor only once its own driver has stopped. */
  nobody: boolean;
  /** The closed send window, to a viewer who is not driving a RUNNING campaign (null: nothing to say). */
  window: string | null;
  /** The switch's closing time, to a viewer who is not driving a campaign that can still send (null: nothing to say). */
  switchCloses: string | null;
  /** Marketing SMS are switched off. */
  switchOff: boolean;
  /** "Keep this page open while it sends". */
  keepOpen: boolean;
  /** A copy was made and this page keeps sending: its address, as a link for a new tab. */
  copyLink: boolean;
};

/** Is this page's own driver stepping the campaign right now? (A watcher, a stopped driver and a campaign not being sent: no.) */
export function isDriving(mayAct: boolean, mode: DriverMode, stop: DriverStop | null): boolean {
  return mayAct && mode === "drive" && stop === null;
}

export function calloutsFor(i: {
  view: CampaignLiveView;
  mayAct: boolean;
  mode: DriverMode;
  stop: DriverStop | null;
  said: string | null;
  refusal: boolean;
  copyLink: boolean;
}): Callouts {
  const { view } = i;
  const driving = isDriving(i.mayAct, i.mode, i.stop);
  const terminal = view.status === "DONE" || view.status === "CANCELLED" || view.status === "DRAFT";
  return {
    refusal: i.refusal,
    stop: i.stop !== null,
    said: i.said !== null && i.stop === null,
    // "Nobody is sending" is the DATA's fact (no claim / no chunk for 90 s). An actor whose own driver runs is the one sending,
    // and says so by being on the page — shown above "Keep this page open" on a first paint it would be a lie told at once.
    nobody: view.standing.nobodyDriving && (!i.mayAct || i.stop !== null),
    window: !driving && view.status === "RUNNING" ? liveWindowSentence(view.standing.window) : null,
    switchCloses: !driving && !terminal && view.standing.switchOpen ? liveSwitchClosesSentence(view.standing.switchClosesAt) : null,
    switchOff: !view.standing.switchOpen && !terminal,
    keepOpen: view.standing.keepOpen,
    copyLink: i.copyLink,
  };
}

/* ══ WHAT AN ANSWER DOES ════════════════════════════════════════════════════════════════════════════════════════════ */

/** A toast: `warning` with `durationMs: 0` stays until it is dismissed; `success` fades. */
export type ToastSpec = { title: string; variant: "success" | "warning"; durationMs?: number };

/**
 * ⭐ THE REVIEW'S MINOR 1 · A landed act's toast. The act's own plain sentence fades (4.5 s); anything the services put beside
 * it — the audit row that did not land, a copy that would message people again, a Resume overtaken by a Stop, a Pause or the
 * end, held people who could not be put back — is a warning or advice, and stays until it is dismissed. A refusal is no toast:
 * it stays beside the controls.
 */
export function toastFor(answer: LiveActAnswer): ToastSpec | null {
  if (!answer.ok) return null;
  return liveDoneIsPlain(answer.message)
    ? { title: answer.message, variant: "success" }
    : { title: answer.message, variant: "warning", durationMs: 0 };
}

/**
 * ⭐ THE REVIEW'S MINOR 2 · WHERE A COPY GOES. A page that is DRIVING (PREPARING, RUNNING, an actor's tab) must not leave: leaving
 * ends the only driver, silently. It stays, and offers the new draft as a link for a new tab (a tab opened from the answer would
 * be a blocked popup). Any other page goes to the draft, as it always did.
 */
export function copyDestination(href: string | null, mode: DriverMode): { kind: "navigate" | "link"; href: string } | null {
  if (href === null || href === "") return null;
  return { kind: mode === "drive" ? "link" : "navigate", href };
}

/** What a press's answer does to the page: the campaign now (null: ask for it), the refusal, the toast, where a copy goes. */
export type Settled = {
  view: CampaignLiveView | null;
  /** The answer carried no view: the page asks for the campaign at once. */
  refresh: boolean;
  refusal: Refusal | null;
  toast: ToastSpec | null;
  copy: { kind: "navigate" | "link"; href: string } | null;
};

export function settlePress(act: ActName, answer: LiveActAnswer, mode: DriverMode): Settled {
  const refresh = answer.view === null;
  if (answer.ok) {
    return { view: answer.view, refresh, refusal: null, toast: toastFor(answer), copy: act === "copy" ? copyDestination(answer.href, mode) : null };
  }
  return { view: answer.view, refresh, refusal: { act, reason: answer.reason, message: answer.message, href: answer.href }, toast: null, copy: null };
}

/* ══ THE LIVE REGION ════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ THE REVIEW'S MINOR 8 · What the page's ONE polite live region says: the headline (and why), when the status CHANGED — never
 *  on mount, never every two seconds. null: say nothing. */
export function announcementFor(previous: string, view: Pick<CampaignLiveView, "status" | "headline" | "stopSentence">): string | null {
  return view.status === previous ? null : liveAnnouncement(view);
}
