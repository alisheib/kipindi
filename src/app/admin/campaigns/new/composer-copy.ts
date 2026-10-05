/**
 * U37b · THE COMPOSER'S WORDS, IN ONE PLACE — the page, its ghost, the form and the test card read these, so a state the
 * drive asserts is the sentence the page prints. (The SERVER's refusals — a save refused, a test refused — are the
 * services' own sentences, `campaign-draft.ts` and `campaign-test-send.ts`, shown as they come back.)
 *
 * ⭐ GLOSSES ARE COPIED, NEVER INVENTED (§5.13): "Kampeni mpya" is the shipped Swahili beside "New campaign" on
 * /admin/invites, and "Ujumbe" is the dictionary's own "message".
 * ⛔ NO MONEY WORD (OD24): GROWTH writes campaigns, and a currency figure renders only to a role holding the money tier.
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
import { formatClock, formatNumber } from "@/lib/utils";

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
 * next step ONLY when this page can send one (`canTest`: the live switch open, the officer's own number reachable, the
 * rail up) — never an invitation the test card beside it would refuse.
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

/* ── the audience card ── */
export const COMPOSE_AUDIENCE_EVERYONE = "Everyone in the contact book — no filter.";
export const COMPOSE_AUDIENCE_LEAD = "Contacts matching:";
export const COMPOSE_AUDIENCE_NOTE =
  "Nothing is counted or sent from this page. Who will receive it — after consent, stops and age — is counted and confirmed before any campaign starts.";
/** A STORED filter this viewer may not have described (A1.1) — said, never a block: the save keeps it as it is. */
export const COMPOSE_AUDIENCE_HIDDEN = "This draft's audience uses a filter your role can't see — saving keeps it as it is.";
/** The address's filter is refused: the one control that takes it out (the draft and the typed text kept). */
export const COMPOSE_AUDIENCE_CLEAR = "Remove the filter";

/* ── the test card ── */
export function composeTestTo(masked: string): string {
  return `To ${masked} (your own number)`;
}
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

/** A test the gateway took — "handed to the network", never "delivered". */
export function composeTestHandedOver(at: string, via: "stub" | "open"): string {
  return via === "stub"
    ? `Handed to this server's console stub at ${formatClock(at)} — it went to the server log, not to a phone.`
    : `Handed to the network at ${formatClock(at)} — check your phone.`;
}
