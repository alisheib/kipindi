/**
 * The opt-out page's class names, in ONE place, so the real page (`optout-client.tsx`) and its
 * loading skeleton (`loading.tsx`) cannot drift apart. The skeleton renders the same elements with
 * these classes and the same dictionary strings, only with the text made transparent, so every
 * line wraps where the real one will — in every locale, at every width.
 *
 * 🔴 WHY IT EXISTS: the skeleton used to state its heights by hand, and the stop button landed 24px
 * higher than the skeleton drew it at 360. A skeleton that re-types the page's measurements is a
 * second copy of them, and a second copy drifts.
 *
 * ⛔ A PLAIN MODULE, NEVER `"use client"`: a server file that imports a constant from a client
 * module receives a client reference, not the string.
 */

/**
 * Words kept whole, for the headings and the notices' sentences. ⭐ In zh, `break-keep` allows a break only
 * at punctuation, spaces and the zero-width hints (U+200B) the page's zh strings carry between phrases, the
 * rule the footer's `licensedByGbt` already follows; the anywhere-wrap still breaks a run too long for its
 * line. ⚠️ Never on a zh string WITHOUT hints: keep-all alone breaks only at punctuation (`trust-band.tsx`).
 * So it is not on `ACT_SENTENCE`, whose strings go into the consent ledger and carry no hints. For sw and en
 * keep-all changes nothing.
 */
export const KEEP_WORDS = "break-keep [overflow-wrap:anywhere]";
/** The H1's text. `PageHeader` balances the H1 itself; the skeleton puts its bar on the same span. */
export const TITLE_TEXT = KEEP_WORDS;
/** A notice's sentence: `text-pretty`, so its last line is never one word or one glyph. */
export const NOTICE_TEXT = `text-pretty ${KEEP_WORDS}`;

/** The labelled number: its label and its masked value. */
export const NUMBER_LABEL = "text-body-sm text-text-muted";
export const NUMBER_VALUE = "mt-1 font-mono text-title-sm font-bold tabular-nums text-text";

/** The group that holds the one sentence and the one button. `text-pretty`: the zh sentence ended on a
 *  lone glyph line ("送。"), and this string is ledger evidence, so no break hint can go into it. */
export const ACT_GROUP = "space-y-3";
export const ACT_SENTENCE = "text-body-sm leading-relaxed text-text-muted text-pretty";
