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
 * ⛔ PURE — no "use client" and no server import: the server page and the client form both import it.
 */
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
/** Under the Swahili body, built from the rule's own values — the identity the law needs first, and the one placeholder. */
export const COMPOSE_BODY_SW_HINT = `Begin with ${SENDER_IDENTITY} (lower case). ${JINA} prints the first name.`;
export const COMPOSE_EN_NONE = "No English text — everyone gets the Swahili message.";
export const COMPOSE_EN_RULE = "English goes to players whose account language is English; everyone else gets Swahili.";
export const COMPOSE_STOP_LINK = "Includes the stop link, which is required and is counted.";
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

/** The room a blank source line keeps (M5 · OQ3, owner gate G5) — or, once it is set, that it is counted. */
export function composeSourceLine(sourceUnits: number, phraseSet: boolean): string {
  return phraseSet
    ? "The source line a contact-book number needs is set, and counted."
    : `${formatNumber(sourceUnits)} characters are kept for the source line a contact-book number needs — its wording is not set yet.`;
}

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
 * ⛔ While Unicode leaves no room at all (the footer and the source line take its 70), "N over" would ask the officer to
 * cut N characters that no cut can fix — the line says there is no room, and the sentence names what to replace.
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
export const COMPOSE_TEST_TOKEN_NOTE = "Your stop link is made the first time you send a test; until then it shows as xxxxxxxx.";
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
export const COMPOSE_TEST_TYPED_NOTE =
  `The name is your word for ${JINA}, never the person's own, and their stop link is made for them and isn't shown here.`;
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
/** The trigger while the page is read again, so the dialog opens on the figures as they are now (U40.md "counting"). */
export const COMPOSE_CONFIRM_COUNTING = "Counting the audience…";
/** The dialog's own confirm button. */
export const COMPOSE_CONFIRM_ACT = "Confirm audience";
/** The action's soft refusal for a role without the growth act grant (`softRequireStaff`). */
export const COMPOSE_CONFIRM_ROLE_REFUSAL = "Your role can't confirm SMS campaigns — ask an officer with growth access.";
/** ⭐ Why the trigger is disabled — in its `title` AND beside it, never hidden (decision 1). The service's own blocked
 *  sentences (`CONFIRM_SERVICE_COPY`) are said as they come. */
export const COMPOSE_CONFIRM_SAVE_FIRST = "Save first — confirming freezes the saved message.";
export const COMPOSE_CONFIRM_NOBODY = "Nobody matches this audience yet.";
export const COMPOSE_CONFIRM_WRITE_SW = "Write the Swahili message first.";
export const COMPOSE_CONFIRM_ALREADY = "This campaign is already confirmed.";
export const COMPOSE_CONFIRM_CANCELLED = "This campaign was cancelled — there is nothing to confirm.";
/** The view could not be read: said, with "Count again" beside it — never a zero (U40.md "blocked"). */
export const COMPOSE_CONFIRM_UNCOUNTED = "Couldn't count this audience just now — nothing is wrong with the campaign.";
/** The draft was saved elsewhere after this form was loaded: what a confirmation would freeze is not the text on screen. */
export const COMPOSE_CONFIRM_STALE = "This draft was saved elsewhere after this page loaded — reload the page to see it, then confirm.";
/** ⭐ THE HONESTY LINE (decision 5) — in the dialog, and under the trigger. */
export const COMPOSE_CONFIRM_HONESTY =
  "Confirming freezes this message and this audience. Nothing is sent until someone presses Start on the campaign's page.";
/** A listed audience's people, shown to a READER only (OD67: a viewer who may not read a number is shown no list). */
export const COMPOSE_CONFIRM_LIST_LEAD = "Everyone this campaign will go to";
/** The title of a refusal said outside the dialog (the dialog closed on it, or a fresh view blocks it). */
export const COMPOSE_CONFIRM_REFUSED = "Not confirmed";
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

/** What the trigger's reason is decided from: the act gate, the form against what is saved, and the page's card. */
export type ConfirmTriggerFacts = {
  mayAct: boolean;
  actReason: string | null;
  /** The composer's shared state (`useComposerSaved`): ⛔ the server confirms the SAVED draft and cannot see the form. */
  form: {
    savedId: string | null;
    savedRevision: number | null;
    pageRevision: number | null;
    dirty: boolean;
    audienceUnsaved: boolean;
    saving: boolean;
    swBlank: boolean;
  };
  /** The page's card — null while no draft is saved; `read` says whether its view was counted. */
  card: null | {
    campaignId: string;
    status: string;
    read: "view" | "error" | "gone";
    view: null | { blocked: string | null; message: string | null; tier: ConfirmTier | null; count: number | null; watermark: string | null };
  };
};

/**
 * ⭐ WHY THE TRIGGER IS DISABLED — the first reason, or null when the dialog may open. In order: a campaign past DRAFT (said
 * as what it is); the act gate; the FORM — a blank Swahili message, nothing saved yet, a form whose revision is not the
 * page's (saved elsewhere since: reload; or this tab's own save still being read back: updating), or what the form shows
 * is not the saved draft (its text, its audience on screen, a save in flight) — because confirming freezes the SAVED
 * message and audience, which the server reads and the form is not; then the server's view, in its own words (an unread
 * view never reads as nobody).
 */
export function confirmTriggerBlocked(f: ConfirmTriggerFacts): string | null {
  const c = f.card;
  if (c !== null && c.status !== "DRAFT") return c.status === "CANCELLED" ? COMPOSE_CONFIRM_CANCELLED : COMPOSE_CONFIRM_ALREADY;
  if (!f.mayAct) return f.actReason ?? COMPOSE_CONFIRM_ROLE_REFUSAL;
  if (f.form.swBlank) return COMPOSE_CONFIRM_WRITE_SW;
  if (f.form.savedId === null) return COMPOSE_CONFIRM_SAVE_FIRST;
  if (c === null || c.campaignId !== f.form.savedId) return COMPOSE_TEST_UPDATING;
  const { savedRevision: held, pageRevision: read } = f.form;
  if (held === null || read === null || held > read) return COMPOSE_TEST_UPDATING;
  if (held < read) return COMPOSE_CONFIRM_STALE;
  if (f.form.dirty || f.form.audienceUnsaved || f.form.saving) return COMPOSE_CONFIRM_SAVE_FIRST;
  if (c.read === "gone") return CONFIRM_REFUSAL_COPY.not_found({ fresh: null, shown: null });
  const v = c.view;
  if (c.read === "error" || v === null) return COMPOSE_CONFIRM_UNCOUNTED;
  if (v.blocked === "not_draft") return COMPOSE_CONFIRM_ALREADY;
  if (v.blocked === "audience_empty") return COMPOSE_CONFIRM_NOBODY;
  if (v.blocked === "no_body") return COMPOSE_CONFIRM_WRITE_SW;
  if (v.blocked !== null) return v.message ?? COMPOSE_CONFIRM_UNCOUNTED;
  if (v.tier === null || v.count === null || v.watermark === null) return COMPOSE_CONFIRM_UNCOUNTED;
  return null;
}
