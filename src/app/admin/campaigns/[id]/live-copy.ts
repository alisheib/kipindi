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
 * Guard: `npm run test:campaign-visuals` §svc (S4–S9, T1–T8 and D1 read these words through the services; W1 holds its imports)
 * and §page (V4 · V7 · V8 render the page's parts in these words; V10 holds the page's literal title to `LIVE_TITLE`).
 */
import type { SmsCampaignRecipientStatus } from "@/lib/server/store";
import { EAT_OFFSET_MS } from "@/lib/eat-day";
import { MASKED_BREAKDOWN_MIN, stopReasonLabel } from "@/lib/marketing/campaign-status";
import { formatPriceTzs } from "@/lib/marketing/sms-settings";
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
  // answered (UNCONFIRMED) is settled without an answer — "everyone has an answer" was false whenever there was one. ⭐ Its
  // re-review: "still waiting" could read as waiting for an ANSWER beside "No answer 2" — said as what it is, nobody left.
  DONE: "Finished — nobody on this campaign is left to message.",
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
  if (notMessaged <= 0) return `${head} — nobody on it was left to message.`;
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
 * (`reached`) or when the floor hides it (`hidden`). The engine can pause `template_invalid` AFTER sending began (any slice's
 * dry render, `engine.ts` ④f); the enqueue's `audience_unreadable`, `audience_moved` and `list_over_confirmed` are written
 * only while it PREPARES, before anything ran (the U47b-1 re-review: the engine itself never writes `audience_unreadable` —
 * a confirmed count it cannot read mid-campaign is `confirmation_unreadable`), so their `reached` form exists for a state the
 * engine should never reach. `list_over_confirmed_sending` already prescribes no copy (§3.4). Nobody reached: the spec's own
 * sentence (`stopReasonLabel`).
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
 * ⛔ E23 · THE STOP REASONS A VIEWER BELOW THE FLOOR STILL READS IN THEIR OWN WORDS (the U47b-1 review) — none reads a
 * person, and its words say nothing about anybody on the list: the four whose way out is a NEW COPY — the enqueue's three,
 * written while it prepares, before any slice; and the saved message's own check, a dry render with no person's name
 * (`engine.ts` ④f, before the claim) — said as a condition there (`COPY_ADVICE`'s `hidden`), and an officer's own two
 * acts. EVERY OTHER REASON — the engine's — reads `LIVE_PAUSED_HIDDEN` below the floor: some can only be written once
 * somebody on the list passed the checks for the wire (the network's "no" or silence, a send that failed on our side, the
 * check just before the wire, a group too slow to send, the credit floor `sendBatch` met), `held_rows` says who is left,
 * and a sentence kept for those reasons alone would say the same thing by being said. (`test:campaign-visuals` S10 holds
 * this list to exactly these six keys.)
 */
export const FLOOR_SAFE_STOP_REASONS: readonly string[] = Object.freeze([...COPY_ADVISING_STOP_REASONS, "officer_paused", "officer_stopped"]);

/** ⛔ E23 · an engine's pause, said to a viewer below the floor who may ACT — one sentence, whatever the reason (above).
 *  True of every reason it stands for: Resume either tries again or says first what must be fixed (U49a's refusals, which
 *  hold the switch, the rail, the credit and what only a copy can fix). */
export const LIVE_PAUSED_HIDDEN = `Paused by the system, so nobody more is messaged. The reason is hidden for your role while fewer than ${formatNumber(MASKED_BREAKDOWN_MIN)} people are on this campaign's list: press Resume to try again — it says first if something must be fixed — and if it pauses again, ask an officer who may read phone numbers.`;
/** …and to one who may only VIEW (the U47b-1 re-review: never "press Resume" to a role that has no Resume). */
export const LIVE_PAUSED_HIDDEN_VIEW = `Paused by the system, so nobody more is messaged. The reason is hidden for your role while fewer than ${formatNumber(MASKED_BREAKDOWN_MIN)} people are on this campaign's list — an officer who may read phone numbers can see it.`;

/* ══ THE WAITS — what a step that claimed nobody says (`StepActionResult.said`) ═════════════════════════════════════ */

/** One wait in words. `until` is the instant the step will be worth trying again, when the engine knows it. Every wait the
 *  engine answers (`SliceWait`) has its own sentence — the U43b-2 waits in ENGINE-SPEC §4.15's words (`test:campaign-visuals`
 *  S11 holds the list whole). ⛔ Said to a viewer as `stepSaid` (`campaign-control.ts`) decides: below the floor, every wait
 *  but `busy` reads `LIVE_WAIT_HIDDEN`. */
export function waitSentence(reason: string, until: string | null): string {
  switch (reason) {
    case "quiet_hours": {
      const t = eatClock(until);
      return t === null ? "Waiting for the send window — sending resumes when it opens." : `Waiting for the send window — sending resumes at ${t} EAT.`;
    }
    case "window_unreadable":
      return "Waiting — the sending hours couldn't be read, so nothing is sent until they can be. It tries again by itself; if this stays, check Admin → System → Marketing SMS.";
    case "money_busy":
      return "Waiting a moment — the platform is paying out or taking bets, and money always goes first. Sending resumes by itself.";
    case "otp_failing": {
      const t = eatClock(until);
      return `Waiting — a login or withdrawal code failed in the last two minutes, so marketing steps aside. It tries again ${t === null ? "in two minutes" : `at ${t} EAT`}.`;
    }
    case "busy":
      return "Another campaign step is running — this page waits its turn.";
    case "before_send_unanswered":
      return "Waiting — the last check before sending couldn't be made, so nothing was sent. It tries again by itself; after three tries in a row the campaign pauses.";
    // ⭐ The U47b-1 re-review · the engine answers it (U43b-2's send-age bound) and it had no sentence of its own. ⛔ The
    // check of 980e2ee7 · no count and no group size here: the gate side pauses after three at the smallest group, the send
    // side after three at any size (`tooSlowCounts`) — "if it keeps taking too long" is true of both.
    case "slice_too_slow":
      return "Waiting — getting the last group of people ready to send took too long, so they were put back unsent. It tries again by itself, with a smaller group when it can; if it keeps taking too long, the campaign pauses.";
  }
  return `Waiting — engine reason: ${reason}.`;
}

/** ⛔ E23 · a wait said to a viewer below the floor — one sentence for every wait but `busy` (the U47b-1 re-review): two
 *  waits (the check just before the wire, a group too slow to send) come only once somebody on the list passed the checks
 *  for the wire, and a sentence kept for those alone would say so by being said. The send window and the switch stay on
 *  the page's standing facts, which every viewer reads. */
export const LIVE_WAIT_HIDDEN = `Waiting — nothing is sent just now, and it tries again by itself. The reason is hidden for your role while fewer than ${formatNumber(MASKED_BREAKDOWN_MIN)} people are on this campaign's list.`;

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
  // ⭐ The U47b-1 re-review · true of the group a slice has already passed its last check for — it still goes (at most one
  // group, `SLICE_MAX`), so "nobody more" was false in that moment.
  const head = "Nothing new will start sending. A group already being sent may still go out, and messages already handed to the network are not recalled.";
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
  // ⭐ The U47b-1 re-review · a slice already past its last check still sends its group (at most one, `SLICE_MAX`): "nobody
  // more" was false in that moment — said as what is true.
  pause: "Paused — nothing new starts sending until you resume. A group already being sent may still go out.",
  resume: "Sending again.",
  /** ⭐ The U47b-1 review · a Resume of a list that never finished goes back to PREPARING, where the page says "Preparing the
   *  list" — never "Sending again." beside it. */
  resumePreparing: "Resumed — the list is being prepared. Keep this page open while it sends.",
  stop: "Stopped — nothing new will start sending. A group already being sent may still go out.",
} as const;

/** ⭐ The U47b-1 re-review · Resume's move landed and its held people could not be put back on the list: they stay parked
 *  (the campaign pauses for them once everyone else is done), said beside the act's own sentence. */
export const LIVE_REQUEUE_FAILED = "Some people held back earlier could not be put back on the list — if the campaign pauses for them, press Resume again.";
/** …said as a CONDITION to a viewer below the floor (E23: whether anybody is HELD is a per-state fact), whatever the counts. */
export const LIVE_REQUEUE_FAILED_HIDDEN = "If anyone was held back earlier, they could not be put back on the list — if the campaign pauses for them, press Resume again.";

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
  /** ⭐ Its re-review · Resume's move landed, and a Stop (which never waits for a flight) landed a moment after it. */
  stoppedAfterResume: "This campaign was resumed, then stopped a moment later — nothing new will start sending.",
  /** …or a Pause did (the check of that fix), or the campaign finished in another step meanwhile. */
  pausedAfterResume: "This campaign was resumed, then paused a moment later — nothing new starts sending until it is resumed again.",
  finishedAfterResume: "This campaign was resumed and has finished — nobody on it is left to message.",
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

/* ══ U47b-2 · THE PAGE'S OWN WORDS — the head, the controls, the figures' headings, the driver's stops ════════════════ */

/** The page's head and its gate's title. ⛔ They are LITERALS in `page.tsx` and `loading.tsx` (`admin-section-gate.test.mjs`
 *  §0b′ accepts no computed title on a gate); `test:campaign-visuals` V10 holds those literals equal to these. The gloss is
 *  COPIED, never invented (§5.13): "Kampeni" is the list's own. */
export const LIVE_TITLE = "SMS campaign";
export const LIVE_SW = "Kampeni";
/** A campaign that is not there — its one way on. */
export const LIVE_BACK = "Back to SMS campaigns";

/** The five controls, as their buttons say them. Start and Stop open a dialog first (the "…"); Pause, Resume and Make a
 *  copy act at once. */
export const LIVE_CONTROL_LABEL = {
  start: "Start…",
  pause: "Pause",
  resume: "Resume",
  stop: "Stop…",
  copy: "Make a copy",
} as const;

/** The breakdown card's title, and the lead over the status chips. */
export const LIVE_BREAKDOWN_TITLE = "Not sent, by reason";
export const LIVE_CHIPS_LEAD = "Everyone on it, by status";

/** A reason row's hover title (as U38b's card titles its own rows): "No consent or recorded basis: 2". */
export function liveReasonTitle(label: string, count: number): string {
  return `${label}: ${formatNumber(count)}`;
}
/** A status chip: "Waiting · 1,200". */
export function liveChipText(label: string, count: number): string {
  return `${label} · ${formatNumber(count)}`;
}

/** The stored audience, in one line: "Audience: Tag: vip · Consent: given" (the list's own words, joined as the list joins them). */
export function liveAudienceLine(lines: readonly string[]): string {
  return `Audience: ${lines.join(" · ")}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "7 Oct 2026" on the EAT calendar, whatever the server's or the browser's zone — null for an instant that is not one. */
export function eatDate(iso: string | null | undefined): string | null {
  const ms = typeof iso === "string" ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(ms)) return null;
  const day = new Date(ms + EAT_OFFSET_MS);
  return `${day.getUTCDate()} ${MONTHS_SHORT[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

/** The confirmation, in one line: "Confirmed for 1,604 people by Amina on 7 Oct 2026 at 14:10 EAT." — the count alone, at
 *  every size (OD65: before and after sending, a count is not a breakdown). */
export function liveConfirmedLine(c: { count: number; at: string; byName: string | null }): string {
  const by = c.byName === null || c.byName.trim() === "" ? "" : ` by ${c.byName.trim()}`;
  const day = eatDate(c.at);
  return `Confirmed for ${peopleCount(c.count)}${by}${day === null ? "" : ` on ${day}`}${atClock(c.at)}.`;
}

/* ── the driver's stops (decision 3) ── */

/** The page reloads itself on this — a new build's page, with the campaign exactly where it is. */
export const LIVE_RELOAD = "Reload";
/** After a lapsed 2-step sign-in is confirmed in the other tab, or a refusal the officer has dealt with: drive again. */
export const LIVE_TRY_AGAIN = "Try again";
/** The second factor's link — the step-up page, in ANOTHER tab (the guard's own sentence says so), so this page keeps its
 *  place. */
export const LIVE_FACTOR_LINK = "Open the 2-step sign-in";

/** The step's and every act's gate refusal: a role that may not act in the campaign's domain (the act grant, decision 7). */
export const LIVE_ROLE_REFUSAL = "Your role can't start, pause, resume, stop or copy SMS campaigns — ask an officer with growth access.";
/** The poll's gate refusal: a role that may not even view the campaign's domain (`softViewStaff`) — the page stops updating. */
export const LIVE_VIEW_REFUSAL = "Your role can't view SMS campaigns — this page has stopped updating.";
/** An act whose service threw after it was handed the campaign: it may or may not have happened — never "nothing was done". */
export const LIVE_ACT_UNFINISHED =
  "The server stopped before it answered, so this may or may not have happened — this page now shows where the campaign is. Check it before you press again.";

/** Make a copy refused for the officer's save budget — a copy IS a saved draft (the composer's own budget,
 *  `marketing.campaignSave`). */
export function copyRateLimitedSentence(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(Number.isFinite(retryAfterSec) ? retryAfterSec / 60 : 1));
  return `That is a lot of saves in a row — no copy was made. Try again in ${formatNumber(minutes)} min.`;
}

/* ══ U48a · THE RESULTS CARD'S WORDS — every sentence true for every reader at that moment (ENGINE-SPEC §4.16) ══════════ */

/**
 * ⛔ NEVER "DELIVERED" FOR A HAND-OVER (OD41): the one word for a receipt's delivery is "Delivered", and it heads exactly one
 * row — the rows a receipt moved. Everything the network merely took is "handed over". ⛔ Said only to a viewer who may see the
 * split (E23): the card is not drawn below the floor, so none of these reaches a viewer who must not learn whether anybody
 * was messaged. ⛔ No money word but the spend line, which is handed a figure for a money reader ONLY (OD24).
 */
export const RESULTS_TITLE = "Results";

/** Each result: the spec's title, and the one line under it that says what the count is (and is not). */
export const RESULTS_ROW = {
  delivered: { label: "Delivered", help: "A delivery receipt came back for these." },
  handedOver: {
    label: "Handed over, no receipt yet",
    help: "The network took these messages. Delivery is confirmed by a receipt, usually in seconds — none has come back for these yet.",
  },
  noReceipt: { label: "No receipt after 15 minutes", help: "Handed over more than 15 minutes ago, and still no delivery receipt." },
  failed: { label: "Failed", help: "These did not reach their people, and they are not sent again by themselves." },
  notSent: {
    label: "Not sent — the checks refused them",
    help: "The checks stopped these people just before sending — the system working, not a failure.",
  },
  noAnswer: { label: "No answer from the network", help: "Handed to the network with no answer back — never re-sent automatically." },
  waiting: { label: "Waiting", help: "Still to be messaged." },
  stopped: { label: "Stopped before sending", help: "The campaign was stopped before these people were messaged." },
  stoppedByLink: {
    label: "Stopped by their link since this campaign",
    help: "Their opt-out link was used after this campaign's message was handed over to them. They are stopped now and will not be messaged.",
  },
} as const;

/** The failed, split by where they failed (the spec's two titles). */
export const RESULTS_FAILED = { wire: "The network refused it", receipt: "Not delivered (receipt)" } as const;

/** ⭐ OD41 · THE HONESTY LINES, rendered from the data (the view decides which stand): while something was handed over and no
 *  receipt has reached this campaign — gone by itself once one does — and, as well, while this server could not take a receipt
 *  at all, which makes "Delivered will stay at zero" true when it is said. (The spec points the second at Admin → System →
 *  Diagnostics; that tab says nothing about receipts, so the line asks for the developer instead — said rather than false.) */
export const RESULTS_HONESTY = {
  noReceiptYet: "No delivery receipt has arrived for this campaign yet — 'handed over' is not 'delivered'.",
  notSetUp: "Delivery receipts aren't set up on this server, so 'Delivered' will stay at zero — ask the developer to set them up.",
} as const;

/** A count that could not be read: said, never drawn as a zero. */
export const RESULTS_UNREAD = "Couldn't be counted just now.";

/** ⛔ OD24 · the price line — for a viewer who may read money ONLY (the view hands the figure to no one else). An estimate, and
 *  it says so: handed over × the owner's configured price, not measured; the SMS credit is the true figure. */
export function resultsSpendLine(o: { tzs: number; perSmsTzs: number }): string {
  return `Estimated spend: ${formatTzs(o.tzs)} (handed over × ${formatPriceTzs(o.perSmsTzs)} per SMS, configured, not yet measured) — the SMS credit on Admin → System is the true figure.`;
}
