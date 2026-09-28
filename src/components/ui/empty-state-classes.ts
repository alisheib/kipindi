/**
 * The empty state's GEOMETRY, in one place — importable from a SERVER component.
 *
 * ⛔ WHY THIS IS ITS OWN MODULE AND NOT AN EXPORT OF `empty-state.tsx`, measured 2026-09-28 (U17).
 * `empty-state.tsx` is `"use client"`. A plain string exported from a client module and imported
 * into a SERVER component (a `loading.tsx`) does not arrive as a string: Next hands over a client
 * reference proxy, and interpolating it into `className` silently yields the SOURCE TEXT OF A
 * FUNCTION — `class="function() { throw new Error(\"Attempted to call EMPTY_STATE_TITLE()...\")"`.
 * Nothing throws and the page still renders, so a screenshot looks plausible; the box simply loses
 * every class it was given. Measured on the first attempt: the real block's padding is 48px top and
 * bottom, the ghost's was 0px, and the ghost came out 121px against the real 230.38px. Only reading
 * the computed styles found it.
 *
 * So the strings live HERE, where both a client component and a server component can read them,
 * and `empty-state.tsx` is one of the two consumers rather than the owner.
 *
 * ⭐ WHAT THIS BUYS: a `loading.tsx` can reserve exactly the height its page will take without
 * re-typing a single dimension — the rule the /s skeleton earned on 2026-09-27, when a guessed
 * third text line moved a button 24px.
 */

/** The dashed box itself. The per-variant width (`w-full` vs `max-w-[360px] mx-auto`) stays at the
 *  call site: that is the variant decision, not the geometry. */
export const EMPTY_STATE_BOX =
  "rounded-xl border border-dashed border-border-strong bg-bg-elevated px-8 py-8 text-center";

/** The title line. `text-balance` is part of it because it changes where the line WRAPS, and a
 *  ghost that wraps differently from its page is a ghost with a different height. */
export const EMPTY_STATE_TITLE = "font-display text-[15.5px] font-semibold text-balance";

/** The body line. Measured line box: 21.125px at `text-body-sm leading-relaxed`. */
export const EMPTY_STATE_BODY = "mt-2 text-body-sm leading-relaxed";
