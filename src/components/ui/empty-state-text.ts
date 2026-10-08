/**
 * The empty state's TEXT rules, in one plain module — beside `empty-state-classes.ts`, and for the same reason: a plain
 * module can be read by a server component and driven by a test without a browser, where an export of the `"use client"`
 * `empty-state.tsx` could be neither. `EmptyState` passes its body through `emptyStateBody`; the words stay the
 * dictionary's own, and only where a line may break changes.
 */

/**
 * ⭐ A DASH NEVER OPENS A LINE (2026-10-08, the visual pass, tiles 241 and 243). "Chagua swali, bonyeza NDIO au HAPANA
 * — tiketi yako itaonekana hapa." broke at the space BEFORE its dash, so line 2 began "— tiketi yako…" (en: "— your
 * ticket shows up here."). The words are the dictionary's and stay so; only the break before the dash is taken away:
 *   · a spaced dash (sw, en) — the space before it becomes a no-break space, so the dash ends its line with its word;
 *   · an unspaced dash (zh "否——您") — a word joiner (U+2060, zero-width) holds it to the character before.
 * A break AFTER the dash is untouched, and an unspaced en dash ("1–5", a range) is left alone.
 */
const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
const WORD_JOINER = String.fromCharCode(0x2060);
export function dashOnItsWord(text: string): string {
  return text.replace(/[ \t]+(?=[—–])/g, NO_BREAK_SPACE).replace(/([^\s—])(?=—)/g, `$1${WORD_JOINER}`);
}

/**
 * ⭐ A YES/NO PAIR IS ONE PHRASE (2026-10-09, round 3, tiles 241 and 244). Balanced, "Chagua swali, bonyeza NDIO au HAPANA
 * — tiketi yako itaonekana hapa." still broke INSIDE the pair at 390 — "…bonyeza NDIO au" / "HAPANA — tiketi…" (en "…press
 * YES or" / "NO — your…") — so the two answers a reader chooses between stood on two lines. Two capitalised words joined
 * by "au" or "or" are held on one line by no-break spaces, the dash rule's method: built with `String.fromCharCode`, so the
 * source holds no invisible character, and the dictionary's words are untouched. Measured with the repo's Inter at 13px
 * in the 260px measure: sw takes three balanced lines ("Chagua swali, bonyeza" / "NDIO au HAPANA — tiketi" / "yako
 * itaonekana hapa."), the shape it already had at 320; en keeps two ("Pick a question, press YES or NO —" / "your ticket
 * shows up here.").
 * ⚠️ Only an all-capitals word of two or more letters on each side: an ordinary "au"/"or" between lower-case words is left
 * to break as before, and zh, which writes neither, is unchanged.
 */
export function pairOnOneLine(text: string): string {
  return text.replace(/\b([A-Z]{2,})[ \t]+(au|or)[ \t]+(?=[A-Z]{2,}\b)/g, `$1${NO_BREAK_SPACE}$2${NO_BREAK_SPACE}`);
}

/** The body's one text helper: the pair first (its spaces become no-break spaces), then the dash. */
export function emptyStateBody(text: string): string {
  return dashOnItsWord(pairOnOneLine(text));
}
