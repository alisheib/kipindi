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

/**
 * ⭐ CHINESE BREAKS BETWEEN WORDS, NOT INSIDE THEM (2026-10-08, the visual pass, tile 247). Chinese may break between
 * any two characters, so a centred line of it split 显示 into "…将显 / 示在这里。". `keep-all` breaks it only where its
 * punctuation and spaces do (after ，。 and the —— dash); Latin text is untouched by it. `break-word` is the floor
 * under that: a run with no break in it that is wider than its box still breaks rather than overflows.
 * ⚠️ Arbitrary properties, not `break-keep break-words`: tailwind-merge (`cn`) files both under ONE `break-*` group
 * and would keep only the last of them.
 */
const CJK_WORDS = "[word-break:keep-all] [overflow-wrap:break-word]";

/** The title line. `text-balance` is part of it because it changes where the line WRAPS, and a
 *  ghost that wraps differently from its page is a ghost with a different height. */
export const EMPTY_STATE_TITLE = `font-display text-[15.5px] font-semibold text-balance ${CJK_WORDS}`;

/** The body line. Measured line box: 21.125px at `text-body-sm leading-relaxed`.
 *  ⭐ Balanced, like the title (2026-10-08, tiles 232, 233, 235, 236): it is centred, and the greedy fill left one word
 *  under a full line — "Weka dau kwenye ubao na litaonekana / hapa.", "…and it appears / here." Balancing keeps the
 *  number of lines and evens their lengths, so no height moves and nothing is left alone. */
export const EMPTY_STATE_BODY = `mt-2 text-body-sm leading-relaxed text-balance ${CJK_WORDS}`;
