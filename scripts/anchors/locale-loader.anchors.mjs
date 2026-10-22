/**
 * THE ANCHORS `red:locale-loader` MUTATES — declared, as DATA, importable without running (`test:red-anchors` §3 audits
 * that each still resolves exactly once). ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ───────────────────────────────────────────────────────
 * The language-change loader's ring wears its green and red by the owner's ruling of 2026-10-22 (DESIGN_AUTHORITY §B2a,
 * "The owner's exception: the language-change loader"; COMPLIANCE-DECISIONS § "2026-10-22 · The language-change loader
 * wears its green and red again"). Each case is one way that ruling silently stops holding, put back in src/lib/i18n.tsx:
 *   · brand-ring    — R5-I's ring as it shipped on 2026-10-09: the blue-grey Ali reported.
 *   · literals-back — the old inks typed by hand again (oklch 78% 0.16): right on screen, outside the system.
 *   · one-ink       — the NO red gone: six greens.
 *   · words-ink     — the pair spent outside the ring: the loader's words in the NO red.
 *   · greyed-ring   — the inks right and the picture grey (a grayscale filter on the ring). ⭐ Only the browser can see
 *                     this one; it is the case that proves `qa:locale-loader` measures pixels, not source.
 * `expect` names, per offline guard, the check that must go RED on the plant (and, as a third element, what its output
 * must also name); `browser` the `qa:locale-loader` checks that must go RED (run only when `BASE` points at a dev server
 * of this tree).
 * ⚠️ The ring's anchor is its six lines whole, so no case can mutate half of it; no replacement contains its own anchor.
 */

/** @typedef {{ name: string, file: string, from: string, to: string, why: string, expect: Array<string[]>, browser: string[] }} RedMutation */

const I18N = "src/lib/i18n.tsx";
/** The ring as the ruling has it — the source's own `\u…` escapes kept as text. */
const RING = [
  '  { char: "Hi",  color: "var(--yes-400)" },',
  '  { char: "\\u8BED", color: "var(--no-400)" },  // 语',
  '  { char: "Ha",  color: "var(--yes-400)" },',
  '  { char: "\\u597D", color: "var(--no-400)" },  // 好',
  '  { char: "Sw",  color: "var(--yes-400)" },',
  '  { char: "En",  color: "var(--no-400)" },',
].join("\n");
const ring = (a, b) => RING.replaceAll("var(--yes-400)", a).replaceAll("var(--no-400)", b);
const WORDS = 'className="font-display text-[13px] font-semibold text-text-subtle tracking-[-0.01em]"';
const BOX = '<div className="relative" style={{ width: 120, height: 120 }}>';

const R5I = ["visual-pass-r5i", "2.15⁗ · OWNER (Ali, 2026-10-22)"];
const INK = ["betting-ink", "§7i the language loader's six glyphs alternate the YES and NO inks from Hi"];

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "brand-ring",
    why: "R5-I's ring back — the brand steps, the blue-grey ring the owner reported (2026-10-22)",
    file: I18N, from: RING, to: ring("var(--brand-300)", "var(--brand-200)"),
    expect: [R5I, INK],
    browser: ["each glyph wears its place's token", "on screen the ring is green and red", "the ring is as colourful as before R5-I"],
  },
  {
    name: "literals-back",
    why: "the old inks typed by hand — the right colours outside the system (test:design-frozen keeps i18n.tsx off its list)",
    file: I18N, from: RING, to: ring("oklch(78% 0.16 152)", "oklch(78% 0.16 22)"),
    expect: [["design-frozen", "no NEW inline design value beyond the ratchet", "src/lib/i18n.tsx"], R5I, INK],
    browser: ["each glyph wears its place's token"],
  },
  {
    name: "one-ink",
    why: "the NO red gone — six greens, not the pair",
    file: I18N, from: RING, to: ring("var(--yes-400)", "var(--yes-400)"),
    expect: [R5I, INK],
    browser: ["each glyph wears its place's token", "on screen the ring is green and red"],
  },
  {
    name: "words-ink",
    why: "the pair spent outside the ring — the loader's words in the NO red",
    file: I18N, from: WORDS, to: WORDS.replace("text-text-subtle", "text-no-400"),
    expect: [INK, ["visual-pass-r5i", "1.2 · no registered file gained a use of the pair"]],
    browser: [],
  },
  {
    name: "greyed-ring",
    why: "the inks right and the picture grey — a grayscale filter on the ring's box",
    file: I18N, from: BOX, to: BOX.replace("height: 120 }}", 'height: 120, filter: "grayscale(1)" }}'),
    expect: [],
    browser: ["on screen the ring is green and red"],
  },
];
