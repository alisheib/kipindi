/**
 * U47b · THE LIVE CAMPAIGN PAGE'S WORDS, IN ONE PLACE — ENGINE-SPEC §4.15 "States and sentences", word for word wherever
 * the spec gives the sentence. U47b-1's services (`campaign-control.ts`) and view-model (`campaign-live.ts`) RETURN these —
 * the services say what the page will say — and U47b-2's page, client and driver print them as they come back, adding
 * the page's own words here (the ghost, the second factor, the out-of-date reload).
 *
 * ⛔ PURE — no "use client" and no server import (a TYPE is erased): the server services and the page's client both read
 * this module.
 * ⛔ NO MONEY WORD FOR A VIEWER WHO MAY NOT READ MONEY (OD24): the only sentence here that can carry a TZS figure is the
 * Start dialog, and it is handed the money ONLY for a money reader (`startDialog`'s `money`, null for anyone else). The
 * refusal sentences are U49a's (`startRefusalSentence` / `resumeRefusalSentence`), which decide their own.
 * ⛔ NEVER "DELIVERED" FOR A HAND-OVER (OD41): the network taking a message is "handed over"; only a receipt is delivery.
 * ⛔ A SENTENCE THAT ADVISES A COPY SAYS THE COPY MESSAGES AGAIN everyone it reaches who was already messaged — nothing
 * de-duplicates across campaigns and there is no frequency cap yet (Ali's ruling; U42's re-review). The view-model hands
 * each such sentence the campaign's `LiveReach`: `none` (nobody on it was handed a message — or it never ran), `reached`
 * (somebody was), or `hidden` — ⛔ E23: a viewer who may not read a number, on a campaign under the floor, must not learn
 * from the WORDING whether anyone was messaged, so they read the conditional form whatever the counts say.
 *
 * Guard: `npm run test:campaign-visuals` §svc (S4–S9, T1–T8 and D1 read these words through the services; W1 holds its imports).
 */
import type { SmsCampaignRecipientStatus } from "@/lib/server/store";
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { MASKED_BREAKDOWN_MIN, stopReasonLabel } from "@/lib/marketing/campaign-status";
import { formatNumber, formatTzs } from "@/lib/utils";

/* ══ THE PIECES ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Whether anyone on a campaign was handed a message, as a sentence may say it (the header). */
export type LiveReach = "none" | "reached" | "hidden";

/** "14:10" on the EAT wall clock, whatever the server's or the browser's zone — null for an instant that is not one. */
export function eatClock(iso: string | null | undefined): string | null {
  const ms = typeof iso === "string" ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms + EAT_OFFSET_MS).toISOString().slice(11, 16) : null;
}

/** "1 person" · "1,180 people". */
export function peopleCount(n: number): string {
  return n === 1 ? "1 person" : `${formatNumber(n)} people`;
}

/** Who acted, when the record names nobody this page can read. */
export const LIVE_SOMEBODY = "an officer";

/** " at 14:10 EAT", or nothing when the instant cannot be read. */
const atClock = (iso: string | null): string => {
  const t = eatClock(iso);
  return t === null ? "" : ` at ${t} EAT`;
};

/* ══ THE HEADLINE — the one sentence for the status ═════════════════════════════════════════════════════════════════ */

export const LIVE_HEADLINE = {
  /** Not reachable from the list (a draft opens in the composer) — said if it is opened anyway. */
  DRAFT: "This campaign is still a draft — nothing has been sent.",
  CONFIRMED: "Ready to start — nothing has been sent.",
  PAUSED: "Paused.",
  // ⭐ The U47b-1 review · true beside the "No answer" KPI too: DONE is nobody PENDING or HELD, and a message the network never
  // answered (UNCONFIRMED) is settled without an answer — "everyone has an answer" was false whenever there was one.
  DONE: "Finished — nobody on this campaign is still waiting.",
} as const;

/** PREPARING — "Preparing the list — 600 of 1,604 people written." (rows WRITTEN over the confirmed count). */
export function preparingHeadline(written: number, confirmed: number | null): string {
  if (confirmed === null || !Number.isSafeInteger(confirmed) || confirmed < 1) return "Preparing the list.";
  return `Preparing the list — ${formatNumber(written)} of ${formatNumber(confirmed)} people written.`;
}

/** RUNNING — "Sending — 420 of 1,604 done." (rows SETTLED over rows written; HELD is not done). */
export function sendingHeadline(progress: { value: number; max: number } | null): string {
  return progress === null ? "Sending." : `Sending — ${formatNumber(progress.value)} of ${formatNumber(progress.max)} done.`;
}

/** CANCELLED — "Stopped by Amina at 14:10 EAT — 1,180 people were not messaged." `notMessaged` is everyone confirmed who
 *  has no answer (`resumeOutstanding`, the ONE definition of what is left — E25's "stopped before sending"). */
export function stoppedHeadline(who: string, atIso: string | null, notMessaged: number): string {
  const head = `Stopped by ${who}${atClock(atIso)}`;
  // ⭐ The U47b-1 review · never "had an answer" (a message with no answer back is settled too) — DONE's own words.
  if (notMessaged <= 0) return `${head} — nobody on it was still waiting.`;
  return `${head} — ${peopleCount(notMessaged)} ${notMessaged === 1 ? "was" : "were"} not messaged.`;
}

/* ══ WHY IT STOPPED — `stopSentence` ════════════════════════════════════════════════════════════════════════════════ */

/** An officer's Pause, named from its audit row (§3.4: "the live page names who and when from the audit row"). */
export function officerPausedSentence(who: string, atIso: string | null): string {
  return `Paused by ${who}${atClock(atIso)}.`;
}
// ⭐ The U47b-1 review · an officer's Stop has NO sentence of its own: the CANCELLED headline already says "Stopped by <who>
// at <time>" (`stoppedHeadline`), and the page says it once.

/** The copy advice when somebody on the campaign was already messaged — a fact. */
const REACHED_AGAIN =
  "Some people on it have already been messaged, and a copy would message them again: stop it, and confirm a copy only if that is what you want.";
/** …and when the floor hides whether anybody was — a condition, said whatever the counts are. */
const IF_REACHED_AGAIN = "If anyone on it was already messaged, a copy would message them again.";

/**
 * ⭐ THE STOP REASONS THAT ADVISE A COPY (or a new campaign), and what each says once anybody on the campaign was messaged
 * (`reached`) or when the floor hides it (`hidden`). The engine can pause `audience_unreadable` and `template_invalid` AFTER
 * sending began (`engine.ts` ④a and ④f); the enqueue's `audience_moved` and `list_over_confirmed` are set before anything
 * ran, so their `reached` form exists for a state the engine should never reach. `list_over_confirmed_sending` already
 * prescribes no copy (§3.4). Nobody reached: the spec's own sentence (`stopReasonLabel`).
 */
const COPY_ADVICE: Readonly<Record<string, { reached: string; hidden: string }>> = Object.freeze({
  audience_unreadable: {
    reached:
      "Paused — the saved audience can't be read any more, so nobody more is messaged. Some people on it have already been messaged, and a new campaign to the same people would message them again: stop it, and send another only if that is what you want.",
    hidden: `${stopReasonLabel("audience_unreadable")} ${IF_REACHED_AGAIN}`,
  },
  template_invalid: {
    reached:
      "Paused — the saved message no longer passes its own check, so nobody more is messaged. Some people on it have already been messaged, and a corrected copy would message them again: stop this campaign, and send a corrected copy only if that is what you want.",
    hidden:
      "Paused — the saved message no longer passes its own check, so nobody more is messaged. Stop this campaign and send a corrected copy — if anyone on it was already messaged, the copy would message them again.",
  },
  audience_moved: {
    reached: `Paused — the people on this campaign changed after it was started. ${REACHED_AGAIN}`,
    hidden: `Paused — the people on this campaign changed after it was started. Stop it and confirm a new copy. ${IF_REACHED_AGAIN}`,
  },
  list_over_confirmed: {
    reached: `Paused — more people are on this campaign's list than were confirmed. ${REACHED_AGAIN}`,
    hidden: `Paused — more people are on this campaign's list than were confirmed. Stop it and confirm a new copy. ${IF_REACHED_AGAIN}`,
  },
});

/** The keys `pausedReasonSentence` words by reach (for the suite: every one of them advises a copy). */
export const COPY_ADVISING_STOP_REASONS: readonly string[] = Object.freeze(Object.keys(COPY_ADVICE));

/** A PAUSED campaign's reason in words: the copy-advising ones by reach (above); every other key `stopReasonLabel`'s.
 *  ⛔ Said to a viewer as `pausedReasonSentenceFor` (`campaign-live.ts`) decides — never straight to a masked viewer. */
export function pausedReasonSentence(key: string, reach: LiveReach): string {
  const k = typeof key === "string" ? key.trim() : "";
  const advice = Object.prototype.hasOwnProperty.call(COPY_ADVICE, k) ? COPY_ADVICE[k] : undefined;
  if (advice === undefined || reach === "none") return stopReasonLabel(k);
  return reach === "reached" ? advice.reached : advice.hidden;
}

/**
 * ⛔ E23 · THE STOP REASONS A VIEWER BELOW THE FLOOR STILL READS IN THEIR OWN WORDS (the U47b-1 review) — each is found
 * before anybody on the list is checked, and its words say nothing about anybody on it: the four whose way out is a NEW
 * COPY (the enqueue's three and the saved message's own check — said as a condition there, `COPY_ADVICE`'s `hidden`) and an
 * officer's own two acts. EVERY OTHER REASON — the engine's — reads `LIVE_PAUSED_HIDDEN` below the floor: some can only be
 * written once somebody on the list passed the checks for the wire (the network's "no" or silence, a send that failed on
 * our side, the check just before the wire, a group too slow to send, the credit floor `sendBatch` met), `held_rows` says
 * who is left, and a sentence kept for those reasons alone would say the same thing by being said.
 */
export const FLOOR_SAFE_STOP_REASONS: readonly string[] = Object.freeze([...COPY_ADVISING_STOP_REASONS, "officer_paused", "officer_stopped"]);

/** ⛔ E23 · an engine's pause, said to a viewer below the floor — one sentence, whatever the reason (above). True of every
 *  reason it stands for: Resume either tries again or says first what must be fixed (U49a's refusals, which hold the
 *  switch, the rail, the credit and what only a copy can fix). */
export const LIVE_PAUSED_HIDDEN = `Paused by the system, so nobody more is messaged. The reason is hidden for your role while fewer than ${formatNumber(MASKED_BREAKDOWN_MIN)} people are on this campaign's list: press Resume to try again — it says first if something must be fixed — and if it pauses again, ask an officer who may read phone numbers.`;

/* ══ THE WAITS — what a step that claimed nobody says (`StepActionResult.said`) ═════════════════════════════════════ */

/** One wait in words. `until` is the instant the step will be worth trying again, when the engine knows it. */
export function waitSentence(reason: string, until: string | null): string {
  switch (reason) {
    case "quiet_hours": {
      const t = eatClock(until);
      return t === null ? "Waiting for the send window — sending resumes when it opens." : `Waiting for the send window — sending resumes at ${t} EAT.`;
    }
    case "window_unreadable":
      return "Waiting — the send window's hours can't be read just now, so nothing is sent. Sending resumes once they can be read.";
    case "money_busy":
      return "Waiting a moment — the platform is paying out or taking bets, and money always goes first. Sending resumes by itself.";
    case "otp_failing": {
      const t = eatClock(until);
      return `Waiting — a login or withdrawal code failed in the last two minutes, so marketing steps aside. It tries again ${t === null ? "in two minutes" : `at ${t} EAT`}.`;
    }
    case "busy":
      return "Another campaign step is running — this page waits its turn.";
    case "before_send_unanswered":
      return "Waiting — the last check before sending couldn't be made, so nothing was sent. It tries again in a moment.";
  }
  return `Waiting — engine reason: ${reason}.`;
}

/* ══ THE STANDING CALLOUTS ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const LIVE_KEEP_OPEN = "Keep this page open while it sends — sending continues only while a page like this one is open.";
export const LIVE_SWITCH_OFF = "Marketing SMS are switched off — this campaign waits until the owner switches them on.";
export const LIVE_OUT_OF_DATE = "This page is out of date or lost its connection — reload it to keep sending. Nothing is lost.";

/** Nobody driving (RUNNING, no claim for 90 s) — with the last step's time when there was one. */
export function nobodyDrivingSentence(lastStepAt: string | null): string {
  const t = eatClock(lastStepAt);
  return `Nobody is sending this campaign right now. Open it as an officer who can send, and keep the page open.${t === null ? "" : ` (Last step ${t} EAT.)`}`;
}

/* ══ THE FIGURES ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The KPIs (§4.15 decision 8), with the two hover titles the spec gives. ⛔ "Handed over" is not "delivered" (OD41). */
export const LIVE_KPI = {
  onCampaign: { label: "On campaign", title: null },
  handedOver: { label: "Handed over", title: "The network took the message. Delivery is confirmed by a receipt, usually in seconds." },
  failed: { label: "Failed", title: null },
  notSent: { label: "Not sent (checks)", title: null },
  noAnswer: { label: "No answer", title: "Handed to the network with no answer back — never re-sent automatically." },
  waiting: { label: "Waiting", title: null },
} as const;

/** Each recipient status as a chip says it. A full Record, so a status added to the schema is a compile error here.
 *  ⛔ DELIVERED is the ONE word for a receipt's delivery; SENT is "handed over" (OD41). */
export const RECIPIENT_STATUS_LABEL: Readonly<Record<SmsCampaignRecipientStatus, string>> = Object.freeze({
  PENDING: "Waiting",
  HELD: "Held — couldn't be checked or prepared",
  SENT: "Handed over",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  SKIPPED: "Not sent (checks)",
  UNCONFIRMED: "No answer",
});

/** "Not sent" beyond U38b's five words: a number no SMS can reach, and a refusal this code has no word for. */
export const NOT_SENT_EXTRA = {
  /** U38b's own word for it (`AUDIENCE_FIGURE.unsendable`). */
  unsendable: "Can't be sent to",
  other: "Refused by another check at sending",
} as const;

/** ⛔ E23 · the floor — a viewer who may not read a number, on a campaign of fewer than ten people. */
// ⭐ About the LIST (the U47b-1 review): a campaign confirmed for 1,604 whose list holds a handful is not "fewer than 10 people".
export const LIVE_FLOOR = `Fewer than ${formatNumber(MASKED_BREAKDOWN_MIN)} people are on this campaign's list, so its breakdown is hidden for your role.`;

/* ══ THE CONTROLS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Why a control is disabled — said in its `title`, never hidden (§4.15 decision 4). */
export const LIVE_DISABLED = {
  start: "Only a confirmed campaign can start.",
  startSwitchOff: "Marketing SMS are switched off.",
  pause: "Only a campaign that is preparing or sending can be paused.",
  resume: "Only a paused campaign can resume.",
  stop: "This campaign has already finished or stopped.",
  role: "Your role can view this campaign but not change it.",
  /** Not in the spec (a draft's address redirects to the composer): every control of a draft says this. */
  draft: "This campaign is still a draft — open it in the composer.",
} as const;

/** ⛔ OD66 at Start — a viewer who may not read a number, on an audience their role may not count (both populations, a
 *  search, a consent, source, player or stop filter): refused before anything is counted. */
export const START_AUDIENCE_REFUSED =
  "Your role can't start this campaign: its audience uses a filter your role can't count. An officer who may read phone numbers can start it. Nothing was sent.";

/** The Start dialog (§4.15) — `money` is the frozen estimate and limit, handed in ONLY for a money reader. */
export function startDialog(o: {
  count: number;
  segments: number | null;
  window: { opens: string; closes: string } | null;
  money: null | { costTzs: number | null; limitTzs: number | null };
}): { title: string; body: string } {
  const title = `Start sending to up to ${peopleCount(o.count)}?`;
  const parts = ["Each person is checked again just before their message: anyone who has stopped, withdrew or is protected is skipped."];
  parts.push(o.window === null ? "Messages go out only inside the owner's send window." : `Messages go out between ${o.window.opens} and ${o.window.closes} EAT.`);
  if (o.money !== null) {
    if (o.money.costTzs !== null && o.money.limitTzs !== null) parts.push(`It can cost up to ${formatTzs(o.money.costTzs)} of the ${formatTzs(o.money.limitTzs)} limit.`);
    else if (o.money.limitTzs !== null) parts.push(`It can cost up to its ${formatTzs(o.money.limitTzs)} limit.`);
  } else if (o.segments !== null) {
    parts.push(`It uses up to ${formatNumber(o.segments)} SMS.`);
  }
  parts.push("Keep this page open while it sends.");
  return { title, body: parts.join(" ") };
}

/** The Stop dialog (§4.15) — its "make a copy" advice says, once anybody was messaged, that the copy messages them again. */
export function stopDialog(reach: LiveReach): { title: string; body: string } {
  const head = "Nobody more will be messaged. Messages already handed to the network are not recalled.";
  // ⭐ The U47b-1 review · "everyone it reaches AGAIN" said everyone is messaged twice — only those already messaged are.
  const tail = reach === "reached"
    ? "A stopped campaign can't be restarted. A copy would message everyone it reaches — including, again, the people this campaign already messaged."
    : reach === "hidden"
      ? "A stopped campaign can't be restarted — make a copy to send it again; if anyone on it was already messaged, the copy would message them again."
      : "A stopped campaign can't be restarted — make a copy to send it again.";
  return { title: "Stop this campaign for good?", body: `${head} ${tail}` };
}

/** The dialogs' two buttons (the page's). */
export const LIVE_DIALOG_ACTIONS = { cancel: "Cancel", start: "Start sending", stop: "Stop campaign" } as const;

/* ══ WHAT AN ACT ANSWERS ════════════════════════════════════════════════════════════════════════════════════════════ */

/** The toasts (§4.15) — Start's is this unit's own (the spec gives none). */
export const LIVE_DONE = {
  start: "Started — the list is being prepared. Keep this page open while it sends.",
  pause: "Paused — nobody more is messaged until you resume.",
  resume: "Sending again.",
  /** ⭐ The U47b-1 review · a Resume of a list that never finished goes back to PREPARING, where the page says "Preparing the
   *  list" — never "Sending again." beside it. */
  resumePreparing: "Resumed — the list is being prepared. Keep this page open while it sends.",
  stop: "Stopped — nobody more will be messaged.",
} as const;

/** ⭐ ruling 543 · the act landed and its audit row did not — said beside the act's own sentence, never instead of it. */
export const LIVE_NOT_RECORDED = "⚠️ Its record could not be written to the audit log — tell whoever keeps the records.";

/** An act that lost its race to another officer's (the conditional move found the campaign elsewhere). */
export const LIVE_CHANGED = {
  startedElsewhere: "This campaign was started a moment ago — this page shows where it is now. Nothing more was done.",
  stoppedElsewhere: "This campaign was stopped a moment ago — nothing was started.",
  alreadyPaused: "This campaign is already paused.",
  alreadySending: "This campaign is already sending.",
  /** ⭐ The U47b-1 review · Resume runs inside the campaign's step flight, and another step held it just then. */
  resumeBusy: "Another step of this campaign is running — press Resume again in a moment. Nothing was changed.",
} as const;

export const LIVE_MISSING = "This campaign was not found.";

/**
 * ⛔ E23 · Resume refused for what only a new copy can fix, said to a viewer BELOW THE FLOOR (a masked viewer, fewer than ten
 * rows): U49a's own words for the reason (`resumeRefusalSentence`), with its copy advice as a CONDITION — the same words
 * whether or not anybody on the campaign was messaged, which U49a's `reached` form would otherwise tell them. Every other
 * viewer reads U49a's sentence as it is.
 */
export function resumeCopyOnlyHiddenSentence(reason: "list_over_confirmed" | "audience_moved" | "audience_unreadable"): string {
  if (reason === "audience_unreadable") {
    return "The saved audience can't be read any more, so this campaign can't resume. Stop it — and if anyone on it was already messaged, a new campaign to the same people would message them again: send another only if that is what you want. Nobody more was messaged.";
  }
  const head = reason === "list_over_confirmed"
    ? "More people are on this campaign's list than were confirmed, so it can't resume."
    : "The people on this campaign changed after it was confirmed, so it can't resume.";
  return `${head} Stop it — and if anyone on it was already messaged, a copy would message them again: confirm one only if that is what you want. Nobody more was messaged.`;
}

/** Make a copy — made (to the composer). Once anybody was messaged, it says the copy messages them again. */
export function copyDoneSentence(reach: LiveReach): string {
  if (reach === "reached") {
    return "A copy was made as a new draft. Some people on this campaign have already been messaged, and the copy would message them again when it is sent.";
  }
  if (reach === "hidden") return "A copy was made as a new draft. If anyone on this campaign was already messaged, the copy would message them again when it is sent.";
  return "A copy was made as a new draft.";
}

/** Make a copy — refused: the stored audience cannot be carried into a draft (§4.15). Its advice (a new campaign) says,
 *  once anybody was messaged, that the new campaign messages them again. */
export function copyCantTravelSentence(reach: LiveReach): string {
  if (reach === "reached") {
    return "This campaign's audience can't be carried into a copy. Some people on it have already been messaged, and a new campaign to the same people would message them again — write one only if that is what you want.";
  }
  if (reach === "hidden") {
    return "This campaign's audience can't be carried into a copy — write a new campaign instead. If anyone on it was already messaged, a new campaign to them would message them again.";
  }
  return "This campaign's audience can't be carried into a copy — write a new campaign instead.";
}

/** Make a copy — refused: the stored message (or name) no longer passes the draft's own check, so no draft was made. It
 *  advises nothing (no copy, no new campaign), so it needs no reach. */
export function copyMessageRefusedSentence(problem: string): string {
  const said = problem.trim().replace(/[.]$/, "");
  return `This campaign can't be copied as it is: ${said}. Nothing was made.`;
}
