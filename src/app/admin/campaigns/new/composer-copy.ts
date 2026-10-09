/**
 * U37b · THE COMPOSER'S WORDS, IN ONE PLACE — the page, its ghost, the form and the test card read these, so a state the
 * drive asserts is the sentence the page prints. (The SERVER's refusals — a save refused, a test refused — are the
 * services' own sentences, `campaign-draft.ts` and `campaign-test-send.ts`, shown as they come back.)
 *
 * ⭐ GLOSSES ARE COPIED, NEVER INVENTED (§5.13): "Kampeni mpya" is the shipped Swahili beside "New campaign" on
 * /admin/invites, and "Ujumbe" is the dictionary's own "message".
 * ⛔ NO MONEY WORD (OD24): GROWTH writes campaigns, and a currency figure renders only to a role holding the money tier.
 * ⭐ U40b · the Confirm card's one money line, for a money reader only, is the confirmation service's (`confirmMoneyLine`),
 * made on the server and printed as it comes — so no file here names money (`test:campaign-compose` §16.5).
 * ⛔ NEVER "DELIVERED" (OD41): the gateway taking a message is "handed to the network"; only a receipt is delivery.
 * ⭐ Every sentence renders at `text-body-sm` or larger — reading copy, never a caption (`test:type-scale` §3).
 * ⭐ A REFUSAL SAYS ONLY WHAT CAN WORK NEXT (validation audit, 2026-10-03): the budget's and the role's refusals print
 * alone — "Couldn't save … Try again." in front of them read "Try again… Try again in 5 min", and invited a retry a role
 * can never win — and a save that stopped on the server says to check before saving again, never to retry blind.
 * ⛔ PURE — no "use client" and no server import at runtime (a TYPE is erased): the server page and the client form both
 * import it.
 * ⭐ U40b · the Confirm card's decisions live here too, pure, so the suite drives them: its tier (`confirmGate`), its
 * trigger's reason (`confirmTriggerBlocked`), and what it does with each answer (`confirmOutcome`, `afterRecount`).
 */
import type { SmsCampaignStatus } from "@/lib/server/store";
import { SMS_MAX_SEGMENTS } from "@/lib/sms-compose";
import { JINA } from "@/lib/marketing/campaign-template";
import type { VariantCounter } from "@/lib/marketing/campaign-template";
import { SENDER_IDENTITY } from "@/lib/marketing/footer";
import type { SendWindowState } from "@/lib/marketing/window";
import { CONFIRM_REFUSAL_COPY, confirmTypedWord } from "@/lib/marketing/campaign-confirm";
import type { ConfirmTier } from "@/lib/marketing/campaign-confirm";
import { adminCount, formatClock, formatNumber } from "@/lib/utils";

export const COMPOSE_TITLE = "New SMS campaign";
export const COMPOSE_SW = "Kampeni mpya";
export const COMPOSE_MESSAGE_TITLE = "Message";
export const COMPOSE_MESSAGE_SW = "Ujumbe";
export const COMPOSE_AUDIENCE_TITLE = "Audience";
export const COMPOSE_TEST_TITLE = "Test send";

/** The actions' soft refusal for a role without the growth act grant (`softRequireStaff`). */
export const COMPOSE_ROLE_REFUSAL = "Your role can't write or test SMS campaigns — ask an officer with growth access.";

/* ── the message card ── */
export const COMPOSE_FIELD = {
  name: "Campaign name",
  nameHint: "Only staff see it — it is never sent.",
  bodySw: "Swahili message",
  bodyEn: "English message (optional)",
  fallbackSw: "Swahili word for {jina}",
  fallbackEn: "English word for {jina}",
  fallbackHint: "Printed when a name can't be used — letters only, at most 12.",
} as const;
/** Under the Swahili body, built from the rule's own values — the sender named first, and the one placeholder. */
export const COMPOSE_BODY_SW_HINT = `Begin with ${SENDER_IDENTITY} (lower case). ${JINA} prints the first name.`;
export const COMPOSE_EN_NONE = "No English text — everyone gets the Swahili message.";
export const COMPOSE_EN_RULE = "English goes to players whose account language is English; everyone else gets Swahili.";
/** Under the counter (the owner's ruling of 2026-10-09): nothing is appended to a marketing SMS. */
export const COMPOSE_AS_WRITTEN = "Sent exactly as written — nothing is added to it.";
export const COMPOSE_JINA_RESERVE = "{jina} keeps 12 characters for the name.";
export const COMPOSE_FORCED = "Forced to Unicode by:";
export const COMPOSE_FOLD = "Replace with plain characters";
export const COMPOSE_SAVE = "Save draft";
export const COMPOSE_NO_CHANGES = "Nothing to save — no changes since the last save.";
/** U37s · a DRAFT stamped with another line than the one saved now: only a save brings it up to date (`sourceLineStale`). */
export const COMPOSE_SOURCE_LINE_STALE =
  "This draft's source line isn't the one saved now on Admin → System → Marketing wordings — save the draft to bring it up to date.";
export const COMPOSE_SAVE_FAILED = "Couldn't save — your text is still here. Try again.";
/** The save stopped ON THE SERVER after it was handed the text — it may have written the row, so: check, never retry blind. */
export const COMPOSE_SAVE_UNFINISHED =
  "The server stopped before it answered — the draft may not have saved. Check the campaigns list before saving again; your text is still here.";
/** The test stopped on the server — it may have reached the wire, so: check the phone before another (OD23). */
export const COMPOSE_TEST_UNFINISHED =
  "The server stopped before it answered — the test may or may not have gone out. Check your phone before sending another.";
export const COMPOSE_TRY_AGAIN = "Try again";
export const COMPOSE_RELOAD = "Reload";
/**
 * A save refused because the draft changed under the form — saved by someone else, or confirmed since — keeps the
 * officer's text until they choose: loading the stored version replaces it, so it is asked first, with the way to keep it.
 */
export const COMPOSE_DISCARD_TITLE = "Load the saved version?";
export const COMPOSE_DISCARD_BODY =
  "Loading the version saved on the server replaces what you typed here — your changes are not kept. To keep them, choose Save as a new draft instead.";
export const COMPOSE_DISCARD_CONFIRM = "Discard my text and load theirs";
export const COMPOSE_DISCARD_CANCEL = "Keep my text";
/** The draft this form edits changed, left DRAFT or is gone: the officer's text can still become a draft of its own. */
export const COMPOSE_SAVE_AS_NEW = "Save as a new draft";
/** Why "Save as a new draft" is off: its audience cannot travel with it, and a draft with none would go to everyone. */
export const COMPOSE_SAVE_AS_NEW_AUDIENCE =
  "Can't save as a new draft: this draft's audience can't be set from this page, and a new draft would otherwise go to everyone in the contact book.";
export const COMPOSE_READ_ONLY = "This campaign is no longer a draft — its message can't change.";
/** `?draft=<id>` naming nothing: said in words, with one way on — never a blank form posing as that draft. */
export const COMPOSE_MISSING = "This draft wasn't found — it may have been removed, or the link is wrong.";
export const COMPOSE_START = "Start a new SMS campaign";

/**
 * "Draft saved 14:02 — nothing was sent." — the console's clock and what a save is NOT. ⛔ The test below is named as the
 * next step ONLY when this page can send one (`canTest`: the live switch open, the send window open, the officer's own
 * number reachable, the rail up) — never an invitation the test card beside it would refuse.
 */
export function composeSaved(at: string, canTest: boolean): string {
  const said = `Draft saved ${formatClock(at)} — nothing was sent.`;
  return canTest ? `${said} Send yourself a test below.` : said;
}

/** Why Save is off — said beside the button and in its title, never hidden (the first problem, in field order). */
export function composeSaveBlocked(problem: string): string {
  return `Can't save yet: ${problem}`;
}

/** The save's own per-officer budget ran out (`marketing.campaignSave`, U37b review m5). Nothing was written. */
export function composeSaveRateLimited(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `That is a lot of saves in a row — nothing was saved. Try again in ${minutes} min.`;
}

const NB = String.fromCharCode(0xa0);
/** Breaks may fall before the dot, never after it — so the counter wraps only at " · ". */
const SEP = ` ·${NB}`;
const keep = (s: string) => s.split(" ").join(NB);

/**
 * ⭐ THE COUNTER LINE, numbers kept with their words: "80 characters left · 1 message · GSM-7", or over the cap
 * "12 over · 2 messages · the limit is 1". Every figure is the worst-case whole message's (`counterFor`).
 * ⛔ While Unicode leaves no room at all, "N over" would ask the officer to cut N characters that no cut can fix — the
 * line says there is no room, and the sentence names what to replace. (Since nothing is appended — 2026-10-09 — a Unicode
 * message keeps its whole 70.)
 */
export function counterLine(c: VariantCounter): string {
  if (c.left < 0 || c.segments > SMS_MAX_SEGMENTS) {
    const head = c.encoding === "UCS2" && c.budget <= 0 ? "Unicode leaves no room" : `${formatNumber(Math.max(1, -c.left))} over`;
    const parts = [head, `${formatNumber(c.segments)} ${c.segments === 1 ? "message" : "messages"}`, `the limit is ${SMS_MAX_SEGMENTS}`];
    return parts.map(keep).join(SEP);
  }
  const parts = [
    `${formatNumber(c.left)} ${c.left === 1 ? "character" : "characters"} left`,
    "1 message",
    c.encoding === "UCS2" ? "Unicode" : "GSM-7",
  ];
  return parts.map(keep).join(SEP);
}

/** What the counter's live region says — it changes only when the segments, the encoding or the over-cap state does,
 *  so a screen reader is not read a number on every key. */
export function counterAnnounce(c: VariantCounter): string {
  if (c.encoding === "UCS2") return "Unicode — refused until the marked characters are replaced.";
  if (c.segments > SMS_MAX_SEGMENTS || c.left < 0) return `Over the limit — this is ${c.segments} messages.`;
  return "Fits in one message.";
}

/**
 * ⭐ "Replace with plain characters" is offered when ANY offender has a plain twin (`describeOffenders`' `foldable`).
 * The fold swaps those and leaves the rest, which the counter then names on its own — so one emoji beside a pasted
 * curly quote no longer hides the button for the quote.
 */
export function foldOffered(c: VariantCounter): boolean {
  return c.encoding === "UCS2" && c.offenders.some((o) => o.foldable);
}

/* ── the sender line (OD45: a server constant, never an input) ── */
export function composeSenderLine(senderId: string): string {
  return `Sender ${senderId} — set on the server; it can't be changed here.`;
}
export const COMPOSE_SENDER_STUB =
  "Sender: this server's SMS rail is the console stub — messages go to the server log, never to a phone. It can't be changed here.";
export const COMPOSE_SENDER_UNSET = "Sender: not set on this server — it can't be changed here.";

/* ── the audience card (U38b: its counts, its rail and its states speak `audience-copy.ts`) ── */
export const COMPOSE_AUDIENCE_EVERYONE = "Everyone in the contact book — no filter.";
export const COMPOSE_AUDIENCE_LEAD = "Contacts matching:";
/** A STORED filter this viewer may not have described (A1.1) — said, never a block: the save keeps it as it is. */
export const COMPOSE_AUDIENCE_HIDDEN = "This draft's audience uses a filter your role can't see — saving keeps it as it is.";
/** The address's filter is refused: the one control that takes it out (the draft and the typed text kept). */
export const COMPOSE_AUDIENCE_CLEAR = "Remove the filter";

/* ── the test card ── */
export const COMPOSE_TEST_SAVE_FIRST = "Save first — the test sends the saved text.";
export const COMPOSE_TEST_UPDATING = "Updating to the saved text…";
export const COMPOSE_TEST_NOT_DRAFT = "Only a draft can be tested.";
export const COMPOSE_TEST_BUDGET = "Up to 3 tests at once, then one every 10 minutes.";
export const COMPOSE_TEST_SEND = { SW: "Send the Swahili test", EN: "Send the English test" } as const;
export const COMPOSE_TEST_PREVIEW = { SW: "Swahili, as it will be sent to you", EN: "English, as it will be sent to you" } as const;
export const COMPOSE_TEST_EXACT = "The exact text sent:";
export const COMPOSE_TEST_CONSENT_LINK = "Turn on SMS offers for your own number";
export const COMPOSE_TEST_LIVE_NOTE = "Marketing SMS are not switched on yet — a test is refused until the owner switches them on.";
/** U13 · the send window's hours could not be read: a CLOSED window (fail closed), said as such — never as quiet hours. */
export const COMPOSE_TEST_WINDOW_UNREADABLE =
  "The Marketing SMS settings couldn't be read, so the send window is treated as closed — no test can be sent until they can.";
/**
 * U13 · M12 · the Test card's window note — said UP FRONT while the send window is closed, in the hours the test send obeys
 * (the same window, `liveSendWindow`): "Outside the send window (08:00–20:00 EAT) — a test can be sent from 08:00." Null
 * while it is open. ⛔ Hours that could not be read are said as unreadable, never as quiet hours.
 */
export function composeTestWindowNote(w: SendWindowState): string | null {
  if (w.open === true) return null;
  if (w.reason !== "quiet_hours" || w.label === "") return COMPOSE_TEST_WINDOW_UNREADABLE;
  return `Outside the send window (${w.label}) — a test can be sent from ${w.opensAtTime}.`;
}

/** A test the gateway took — "handed to the network", never "delivered". */
export function composeTestHandedOver(at: string, via: "stub" | "open"): string {
  return via === "stub"
    ? `Handed to this server's console stub at ${formatClock(at)} — it went to the server log, not to a phone.`
    : `Handed to the network at ${formatClock(at)} — check your phone.`;
}

/* ── U37c-2 · THE TEST TO ANOTHER NUMBER (spec §7.5 · §7.3 — English console copy) ── */
export const COMPOSE_TEST_TO_LEGEND = "Send the test to";
export function composeTestToOwn(masked: string): string {
  return `My own number — ${masked}`;
}
export const COMPOSE_TEST_TO_OWN_UNUSABLE = "My own number";
export const COMPOSE_TEST_TO_TYPED = "Another number";
export const COMPOSE_TEST_NUMBER_LABEL = "Number to test on";
export const COMPOSE_TEST_NUMBER_HINT =
  "Any Tanzanian mobile number. The test goes through the same checks as a campaign — use a phone whose owner expects it.";
export const COMPOSE_TEST_TYPED_PREVIEW = {
  SW: "Swahili, as it will be sent to that number",
  EN: "English, as it will be sent to that number",
} as const;
/** Under the typed preview: the greeting is the officer's `{jina}` word. ⛔ It names no stop link — nothing is appended to
 *  a test or a campaign since the owner's ruling of 2026-10-09 (`test:campaign-compose` §16.21). */
export const COMPOSE_TEST_TYPED_NOTE = `The name is your word for ${JINA}, never the person's own.`;
/** Send's reason while no whole number has been typed. */
export const COMPOSE_TEST_NEED_NUMBER = "Type the number to test on.";
/** Send's reason while the typed number is one the plan refuses — the plan's own sentence is already under the field, so
 *  this line says it once more only as a way back to it (a button that goes to the field, as the Save reason does). */
export const COMPOSE_TEST_FIX_NUMBER = "Correct the number above to send the test.";
/** Send's reason while the 18+ box is unticked — the test send's own sentence (`TEST_ATTESTATION_MISSING`), word for word. */
export const COMPOSE_TEST_NEED_TICK = "Tick the box to confirm the person who uses this number is 18 or older.";
/** A typed test the gateway took — about THAT person's phone, never "yours". */
export function composeTypedHandedOver(at: string, via: "stub" | "open"): string {
  return via === "stub"
    ? `Handed to this server's console stub at ${formatClock(at)} — it went to the server log, not to a phone.`
    : `Handed to the network at ${formatClock(at)} — ask the person to check their phone.`;
}

/* ── U40b · THE CONFIRM CARD (ENGINE-SPEC §4.6) — the fourth card, under the Test card, and its dialog ── */
export const COMPOSE_CONFIRM_TITLE = "Confirm";
/** The trigger — it OPENS a confirmation (the ellipsis), it never confirms by itself. */
export const COMPOSE_CONFIRM_TRIGGER = "Confirm audience…";
/** The trigger while the confirmation's view is counted — ON DEMAND, on the press, never on a render (U40.md "counting"). */
export const COMPOSE_CONFIRM_COUNTING = "Counting the audience…";
/** The dialog's own confirm button. */
export const COMPOSE_CONFIRM_ACT = "Confirm audience";
/** Both actions' soft refusal for a role without the growth act grant (`softRequireStaff`). */
export const COMPOSE_CONFIRM_ROLE_REFUSAL = "Your role can't confirm SMS campaigns — ask an officer with growth access.";
/** ⭐ Why the trigger is disabled — in its `title` AND beside it, never hidden (decision 1). */
export const COMPOSE_CONFIRM_SAVE_FIRST = "Save first — confirming freezes the saved message.";
export const COMPOSE_CONFIRM_NOBODY = "Nobody matches this audience yet.";
export const COMPOSE_CONFIRM_WRITE_SW = "Write the Swahili message first.";
export const COMPOSE_CONFIRM_ALREADY = "This campaign is already confirmed.";
/**
 * ⭐ A CAMPAIGN PAST DRAFT, IN WORDS THAT ARE TRUE OF IT — its status, never the honesty line: "nothing is sent until
 * someone presses Start" stops being true the moment somebody has. A full Record, so a new status is a compile error here.
 */
export const COMPOSE_CONFIRM_CLOSED: Readonly<Record<Exclude<SmsCampaignStatus, "DRAFT">, string>> = {
  CONFIRMED: COMPOSE_CONFIRM_ALREADY,
  PREPARING: "This campaign has been started — its recipients are being prepared, and nothing here can change it.",
  RUNNING: "This campaign is sending — nothing here can change it.",
  PAUSED: "This campaign was started and is paused — some of its messages may already have gone out.",
  DONE: "This campaign has finished sending.",
  CANCELLED: "This campaign was cancelled — there is nothing to confirm.",
};
/** The view could not be counted: said as such, with "Count again" beside it — never a zero, never a word on the campaign. */
export const COMPOSE_CONFIRM_UNCOUNTED = "Couldn't count this audience just now.";
/** ⭐ U40b · no slot of the split door's came free in time (`CONFIRM_SLOT_WAIT_MS`) — the trigger's read counted nothing;
 *  "Count again" beside it. ⛔ True as written: the slots are usually counting OTHER audiences, and beside a trigger that
 *  only read, what did not happen is a count — never a confirmation (the third pass). */
export const COMPOSE_CONFIRM_BUSY = "Counting is busy right now — nothing was counted. Try again in a moment.";
/** ⭐ U40b · the same, for the confirmation itself: its own count found no slot in time — BEFORE the one write, so this press
 *  confirmed nothing. The dialog stays open with the typing kept. */
export const COMPOSE_CONFIRM_BUSY_CONFIRM = "Couldn't confirm — counting is busy right now, so nothing was confirmed. Try again in a moment.";
/** ⭐ U40b · a READER's four figures could not be worked out in time (the split door busy, or its read failed): said where
 *  they would stand, never left out in silence — the count is the fence's own and exact either way, and the send gate asks
 *  again at the moment of each message (the third pass). */
export const COMPOSE_CONFIRM_SPLIT_UNREAD =
  "Couldn't work out who will receive it just now — the count is exact, and each message is checked again when it is sent.";

/** ⭐ U40b · the officer's read budget is spent (`marketing.campaignConfirmRead`) — nothing was counted. */
export function composeConfirmReadRateLimited(retryAfterSec: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterSec));
  return `That is a lot of counts in a row — nothing was counted. Try again in ${seconds} s.`;
}
/** A blocked answer can be asked for again (the owner has set the source line, the audience has changed): the same read. */
export const COMPOSE_CONFIRM_CHECK_AGAIN = "Check again";
/** The draft was saved elsewhere after this form was loaded: what a confirmation would freeze is not the text on screen. */
export const COMPOSE_CONFIRM_STALE = "This draft was saved elsewhere after this page loaded — reload the page to see it, then confirm.";
/** ⭐ THE HONESTY LINE (decision 5) — in the dialog, and on the card of a DRAFT while nothing blocks it. */
export const COMPOSE_CONFIRM_HONESTY =
  "Confirming freezes this message and this audience. Nothing is sent until someone presses Start on the campaign's page.";
/** A listed audience's people, shown to a READER only (OD67: a viewer who may not read a number is shown no list).
 *  ⛔ "On", never "will go to": the send gate is asked again at the moment of each message. */
export const COMPOSE_CONFIRM_LIST_LEAD = "Everyone on this campaign";
/** The title of a refusal said outside the dialog (the dialog closed on it). */
export const COMPOSE_CONFIRM_REFUSED = "Not confirmed";
/** ⭐ A refusal because the campaign is no longer a draft, when the page then reads it CONFIRMED: the officer's own earlier
 *  press may have landed with its answer lost, so it is never titled "Not confirmed". */
export const COMPOSE_CONFIRM_ALREADY_TITLE = "Already confirmed";
/** ⭐ THE ERROR STATE (U40.md): the action failed and the row is still a draft — the dialog stays open, the typing kept. */
export const COMPOSE_CONFIRM_FAILED = "Couldn't confirm — nothing was confirmed. Try again.";
/**
 * The action stopped, or its answer was lost, before it could say whether the write landed (the service's known residual):
 * never "nothing was confirmed". Trying again is safe — the write is conditional on a draft, so a campaign that was
 * confirmed is refused, never confirmed twice.
 */
export const COMPOSE_CONFIRM_UNFINISHED =
  "Couldn't confirm — the server stopped before it answered, so this campaign may already be confirmed. Nothing has been sent. Try again: a campaign is never confirmed twice.";
/** ⭐ ruling 543 · the confirmation landed and its record did not — said, never hidden (the live switch's own words). */
export const COMPOSE_CONFIRM_UNRECORDED = "The record of this confirmation couldn't be written — tell the developer.";
/** ⭐ THE CONFIRMED LINE (decision 4): the campaign's own page once `CAMPAIGN_SCREENS.detail` is on (U47b), else what is next. */
export const COMPOSE_CONFIRMED = "Confirmed — nothing has been sent.";
export const COMPOSE_CONFIRMED_START = "Start it from its own page.";
export const COMPOSE_CONFIRMED_NEXT = "Starting a campaign comes next in this release.";

/** The dialog's title — "Confirm these 3 people?" for a list, "Confirm 5,912 people?" to type. */
export function composeConfirmTitle(count: number, listed: boolean): string {
  if (listed) return count === 1 ? "Confirm this person?" : `Confirm these ${formatNumber(count)} people?`;
  return `Confirm ${adminCount(count, "person", "people")}?`;
}

/** "Up to 1,604 SMS — one per person": the segments a confirmation would freeze, said to EVERY role (no money in it). */
export function composeConfirmSegments(segments: number, perRecipient: number): string {
  const each = perRecipient === 1 ? "one" : formatNumber(perRecipient);
  return `Up to ${keep(`${formatNumber(segments)} SMS`)} — ${each} per person`;
}

/** The success toast (decision 4). */
export function composeConfirmedToast(count: number): string {
  return `Audience confirmed — ${adminCount(count, "person", "people")}. Nothing has been sent.`;
}

/** A refusal for a campaign no longer a draft, titled from the row as the page reads it AFTER (decision 4's honesty). */
export function composeNotDraftTitle(status: SmsCampaignStatus | null): string {
  return status === "CONFIRMED" ? COMPOSE_CONFIRM_ALREADY_TITLE : COMPOSE_CONFIRM_REFUSED;
}

/** What a REFUSED confirmation did not do, as the service's sentences end — the longest first. */
const REFUSAL_TAILS = [" Nothing was confirmed or sent.", " Nothing was confirmed.", " Nothing was sent.", " Nothing was changed."] as const;

/**
 * ⛔ A SENTENCE BESIDE A TRIGGER NOBODY CONFIRMED WITH never says "Nothing was confirmed": the service's sentences end with
 * what a refused CONFIRMATION did not do, and beside the trigger nothing was attempted — the press only read the audience.
 * The tail is taken off; the rest is the service's own words.
 */
export function composeTriggerSentence(message: string): string {
  for (const tail of REFUSAL_TAILS) if (message.endsWith(tail)) return message.slice(0, -tail.length);
  return message;
}

/** The dialog's tier, as the ConfirmModal takes it — spread whole (`modal.tsx`: a tier and its word are one decision). */
export type ConfirmGateProps = { tier: "hard"; typedWord: string; typedInputMode: "numeric" } | { tier: "medium" };

/**
 * ⭐ THE DIALOG'S TIER IS THE VIEW'S — `view.tier` exactly as the server's `campaignConfirmView` answered it, and NEVER
 * worked out again here from the count (the U40a re-review's ruling). ⛔ OD67 · a viewer who may not read a number is always
 * handed `typed`: a tier recomputed from a count of five or fewer would show them a list dialog with no list in it, and a
 * one-press confirm the server refuses (`typed_required`). So `enumerate` alone is the medium tier; anything else is the
 * typed tier (fails closed): the bare count to type (`confirmTypedWord`, what the dialog arms on) and the digit keypad.
 * Null while the view carries no tier or no count — nothing to confirm.
 */
export function confirmGate(view: { tier: ConfirmTier | null; count: number | null }): ConfirmGateProps | null {
  if (view.tier === null || view.count === null) return null;
  return view.tier === "enumerate"
    ? { tier: "medium" }
    : { tier: "hard", typedWord: confirmTypedWord(view.count), typedInputMode: "numeric" };
}

/** The trigger read's answer, as far as the card's words need it (`ConfirmReadAnswer`, or a read lost in transit). */
export type ConfirmAnswerFacts =
  | {
      ok: true;
      card: {
        status: SmsCampaignStatus | null;
        read: "view" | "closed" | "stale" | "unsaved" | "busy" | "gone" | "error";
        view: null | { blocked: string | null; message: string | null; tier: ConfirmTier | null; count: number | null; watermark: string | null };
      };
    }
  | { ok: false; reason?: string; error: string };

/** What the trigger's reason is decided from: the act gate, the form against what is saved, and the read's last answer. */
export type ConfirmTriggerFacts = {
  mayAct: boolean;
  actReason: string | null;
  /** The composer's shared state (`useComposerSaved`): ⛔ the server confirms the SAVED draft and cannot see the form. */
  form: {
    savedId: string | null;
    savedRevision: number | null;
    /** The draft this page was read for, its revision and its status. */
    pageDraftId: string | null;
    pageRevision: number | null;
    status: SmsCampaignStatus | null;
    dirty: boolean;
    audienceUnsaved: boolean;
    /** Why the audience on screen cannot be saved — the composer's own sentence — or null. */
    audienceProblem: string | null;
    saving: boolean;
    swBlank: boolean;
  };
  /** The read's last answer for THIS form (its draft, revision and audience) — null before the trigger is pressed. */
  answer: ConfirmAnswerFacts | null;
};

/** ⭐ What the read's answer says about opening — null when the dialog may open on it, else the reason in words. */
function answerBlocked(a: ConfirmAnswerFacts | null): string | null {
  if (a === null) return null;
  // The action's own refusals in their own words — the gate's, and a spent read budget's; a read lost in transit, as such.
  if (!a.ok) return a.reason === "role" || a.reason === "rate_limited" ? a.error : COMPOSE_CONFIRM_UNCOUNTED;
  const c = a.card;
  if (c.read === "gone") return composeTriggerSentence(CONFIRM_REFUSAL_COPY.not_found({ fresh: null, shown: null }));
  if (c.read === "error") return COMPOSE_CONFIRM_UNCOUNTED;
  if (c.read === "busy") return COMPOSE_CONFIRM_BUSY;
  if (c.read === "closed") return c.status !== null && c.status !== "DRAFT" ? COMPOSE_CONFIRM_CLOSED[c.status] : COMPOSE_CONFIRM_ALREADY;
  if (c.read === "stale") return COMPOSE_CONFIRM_STALE;
  if (c.read === "unsaved") return COMPOSE_CONFIRM_SAVE_FIRST;
  const v = c.view;
  if (v === null) return COMPOSE_CONFIRM_UNCOUNTED;
  if (v.blocked === "not_draft") return COMPOSE_CONFIRM_ALREADY;
  if (v.blocked === "audience_empty") return COMPOSE_CONFIRM_NOBODY;
  // ⭐ Every other block in the service's own sentence (`no_body` included), without a refused confirmation's tail.
  if (v.blocked !== null) return v.message !== null ? composeTriggerSentence(v.message) : COMPOSE_CONFIRM_UNCOUNTED;
  if (v.tier === null || v.count === null || v.watermark === null) return COMPOSE_CONFIRM_UNCOUNTED;
  return null;
}

/** ⭐ The read's answer is one the dialog may open on: counted, unblocked, with a tier, a count and its claim. */
export function confirmAnswerReady(a: ConfirmAnswerFacts | null): boolean {
  return a !== null && answerBlocked(a) === null;
}

/** Which way back a blocked answer offers: a read that failed (or found no slot in time) is counted again, a blocked view
 *  checked again; else none. ⛔ The action's own refusals — the role's, and a spent read budget's — are printed ALONE: no
 *  button beside them would do anything but be refused again (the third pass). */
export function confirmAnswerRetry(a: ConfirmAnswerFacts | null): "count" | "check" | null {
  if (a === null) return null;
  if (!a.ok) return a.reason === "role" || a.reason === "rate_limited" ? null : "count";
  if (a.card.read === "error" || a.card.read === "busy") return "count";
  return a.card.read === "view" && answerBlocked(a) !== null ? "check" : null;
}

/**
 * ⭐ MAY THE DIALOG OPEN ON THIS ANSWER, NOW? (the U40b re-review's MINOR 1) — only on an answer it may open on, for the form
 * still on screen (the key it was asked for), while nothing on the page blocks the trigger. An answer that lands after the
 * officer typed, picked another audience or saved is kept for its own form — and never opens the dialog by itself, then
 * or later: opening is a press's, never a render's.
 */
export function confirmOpensOn(o: { answer: ConfirmAnswerFacts | null; askedFor: string; onScreen: string; pageClear: boolean }): boolean {
  return o.pageClear && o.askedFor === o.onScreen && confirmAnswerReady(o.answer);
}

/**
 * ⭐ WHY THE TRIGGER IS DISABLED — the first reason, or null when it may be pressed. In order: a campaign past DRAFT (its
 * status, in words true of it); the act gate; an audience the composer cannot use (its own sentence — the Save beside it
 * is refused for the same problem); a blank Swahili message; nothing saved yet; a form whose draft or revision is not the
 * page's (saved elsewhere since: reload; this tab's own save still being read back: updating); what the form shows is not
 * the saved draft (its text, its audience on screen, a save in flight) — because confirming freezes the SAVED message and
 * audience, which the server reads and the form is not; then the read's last answer, in its words. Before any press there
 * is no answer: nothing is counted until the officer asks.
 */
export function confirmTriggerBlocked(f: ConfirmTriggerFacts): string | null {
  const s = f.form.status;
  if (s !== null && s !== "DRAFT") return COMPOSE_CONFIRM_CLOSED[s];
  if (!f.mayAct) return f.actReason ?? COMPOSE_CONFIRM_ROLE_REFUSAL;
  if (f.form.audienceProblem !== null) return f.form.audienceProblem;
  if (f.form.swBlank) return COMPOSE_CONFIRM_WRITE_SW;
  if (f.form.savedId === null) return COMPOSE_CONFIRM_SAVE_FIRST;
  if (f.form.pageDraftId !== f.form.savedId) return COMPOSE_TEST_UPDATING;
  const { savedRevision: held, pageRevision: read } = f.form;
  if (held === null || read === null || held > read) return COMPOSE_TEST_UPDATING;
  if (held < read) return COMPOSE_CONFIRM_STALE;
  if (f.form.dirty || f.form.audienceUnsaved || f.form.saving) return COMPOSE_CONFIRM_SAVE_FIRST;
  return answerBlocked(f.answer);
}

/* ── U40b · WHAT THE CARD DOES WITH AN ANSWER — pure, so `test:campaign-gates` §UI 13 drives every route ── */

/** A toast as the card hands it to the kit (`durationMs: 0` stays until it is read — UD-3). */
export type ConfirmToast = { title: string; description?: string; variant: "success" | "warning" | "danger"; durationMs?: number };

/** The confirmation's answer as the card receives it (`ConfirmActionResult`), or a request lost in transit. */
export type ConfirmAnswerLike =
  | { ok: true; count: number; recorded: boolean }
  | { ok: false; reason?: string; error: string };

/**
 * ⭐ THE CONFIRMATION'S ANSWER, ROUTED:
 *   · `confirmed` — close, read the page again (read-only now), then say it; a record that did not land is said too;
 *   · `keep` — the dialog STAYS OPEN with the typing kept: a failure that left the row a draft, one nobody can vouch for
 *     (said until it is read), or a count that found no slot in time (`busy` — nothing was confirmed);
 *   · `close` — the role's refusal: closed where it stands; `already` — the campaign is no longer a draft (or is gone):
 *     closed, the page read again, and the toast titled from the row it reads (`composeNotDraftTitle`);
 *   · `recount` — every other refusal: the view is asked for again, and the dialog RE-ARMS on it with the server's sentence
 *     on top (`afterRecount`) — never remounted (a remount blinks), never left on the old number.
 */
export type ConfirmOutcome =
  | { kind: "confirmed"; toast: ConfirmToast }
  | { kind: "keep"; toast: ConfirmToast }
  | { kind: "close"; toast: ConfirmToast }
  | { kind: "already"; description: string; gone: boolean }
  | { kind: "recount"; notice: string };

export function confirmOutcome(r: ConfirmAnswerLike): ConfirmOutcome {
  if (r.ok) {
    return {
      kind: "confirmed",
      toast: r.recorded
        ? { title: composeConfirmedToast(r.count), variant: "success" }
        : { title: composeConfirmedToast(r.count), description: COMPOSE_CONFIRM_UNRECORDED, variant: "danger", durationMs: 0 },
    };
  }
  const reason = r.reason;
  if (reason === "failed") return { kind: "keep", toast: { title: COMPOSE_CONFIRM_FAILED, variant: "danger" } };
  if (reason === "busy") return { kind: "keep", toast: { title: COMPOSE_CONFIRM_BUSY_CONFIRM, variant: "warning" } };
  if (reason === undefined || reason === "unfinished") return { kind: "keep", toast: { title: COMPOSE_CONFIRM_UNFINISHED, variant: "danger", durationMs: 0 } };
  if (reason === "role") return { kind: "close", toast: { title: COMPOSE_CONFIRM_REFUSED, description: r.error, variant: "danger" } };
  if (reason === "not_draft" || reason === "not_found") return { kind: "already", description: r.error, gone: reason === "not_found" };
  return { kind: "recount", notice: r.error };
}

/** After a refusal's recount: RE-ARM on the fresh view when it may open, else close — the refusal said in a toast, and the
 *  card says what blocks it now. */
export type ConfirmRecount = { kind: "rearm"; notice: string } | { kind: "close"; toast: ConfirmToast };

export function afterRecount(answer: ConfirmAnswerFacts | null, notice: string): ConfirmRecount {
  return confirmAnswerReady(answer)
    ? { kind: "rearm", notice }
    : { kind: "close", toast: { title: COMPOSE_CONFIRM_REFUSED, description: notice, variant: "warning" } };
}
