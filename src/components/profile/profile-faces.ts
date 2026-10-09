/**
 * THE /profile PAGE'S FACES, IN ONE PLACE (round 5 of the Vodacom visual pass, follow-up R5-K, 2026-10-09) — the page,
 * its name editor and the page's loading ghost (`app/profile/loading.tsx`) read the same class strings, so a line of the
 * ghost is the page's line: the same size and line height, wrapping at the same word, in every language. They were
 * written at their call sites; a ghost copying them would have been a second definition of each, free to drift (and the
 * name editor — the one module holding the name's face — loads a server action, which a loading drawing may not).
 * ⛔ Pure strings: no directive, no import, read by server and client code alike.
 */

/** The display name — the editor's button and its input (`name-editor.tsx`): 24px, 28 from `md`, on a 1.25 line. */
export const PROFILE_NAME_FACE = "font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em]";

/** The masked number and the region under the name (12px mono on the inherited 1.5 line: 18px). */
export const PROFILE_PHONE_LINE = "mt-1.5 font-mono text-[12px] text-text-muted tabular-nums";

/** A settings row's title (13.5px on a 1.25 line: 16.875px), beside its "new" badge when it has one. */
export const PROFILE_ROW_TITLE = "font-display text-[13.5px] font-semibold text-text leading-tight flex items-center gap-2";

/** The sign-out row's title (14px on a 1.25 line). */
export const PROFILE_SIGN_OUT_TITLE = "font-display text-[14px] font-semibold text-text leading-tight";
