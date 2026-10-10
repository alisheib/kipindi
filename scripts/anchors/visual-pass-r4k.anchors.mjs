/**
 * THE ANCHORS `red:visual-pass-r4k` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` answers "does every anchor still resolve, exactly once?" WITHOUT executing the
 * harness, which rewrites real source. One definition, imported by both. ⚠️ NO SIDE EFFECTS. Data only, repo-relative
 * POSIX paths, anchors written with \n (they resolve in the CRLF tree), and no replacement contains its own anchor.
 *
 * Each mutation puts back one defect the visual pass's round 4 (helper K, 2026-10-09) removed; `expect` is the check of
 * `scripts/visual-pass-r4k.test.mts` that must then fail.
 */

/** @typedef {{ name: string, file: string, from: string, to: string, expect: string }} RedMutation */

const VIEW = "src/components/ui/not-found-view.tsx";
// ⚠️ ROUND 5 (R5-D, review G1's sibling): the view is client code, so its words live in a data module of their own.
const WORDS = "src/components/ui/not-found-words.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  { name: "the market not-found loses its metadata (title back to the root's English)", file: "src/app/markets/[id]/not-found.tsx", from: "export async function generateMetadata() {\n  return notFoundMetadata();\n}\n", to: "", expect: "2.3" },
  { name: "the not-found link goes back to gold", file: VIEW, from: "text-brand-300 hover:text-brand-200\"\n", to: "text-gold-300 hover:text-gold-200\"\n", expect: "1.3" },
  { name: "the column's gutter back to px-5 (24px)", file: VIEW, from: "overflow-hidden px-3 py-10", to: "overflow-hidden px-5 py-10", expect: "6.1" },
  { name: "the cards back in the market page's order (Markets first)", file: VIEW, from: "<Link href=\"/\" className={CARD}>", to: "<Link href=\"/markets\" className={CARD}>", expect: "1.2" },
  { name: "the heading unbalanced", file: VIEW, from: "tracking-[-0.02em] text-text text-balance\">", to: "tracking-[-0.02em] text-text\">", expect: "3.1" },
  { name: "the English apostrophe straight", file: WORDS, from: "We couldn’t find that page", to: "We couldn't find that page", expect: "1.5" },
  { name: "the Chinese hint free to break inside a word again", file: VIEW, from: "text-balance [word-break:keep-all] [overflow-wrap:break-word]\">", to: "text-balance\">", expect: "3.2" },
  { name: "the gap with no word-spacing", file: "src/app/globals.css", from: "letter-spacing: 0; word-spacing: 0.05em;", to: "letter-spacing: 0; word-spacing: 0;", expect: "4.6" },
  { name: "the helper drops the gap", file: "src/lib/cjk-marks.tsx", from: "    if (next !== undefined) {\n", to: "    if (next === \"never\") {\n", expect: "4.3" },
  // Round 7 (R7-A): the title hangs its marks through `keepConnectives` — the plant drops the hang from it.
  { name: "the empty state's title not hung", file: "src/components/ui/empty-state.tsx", from: "{keepConnectives(title, [], hangCjkMarks)}", to: "{keepConnectives(title)}", expect: "4.10" },
  { name: "the wave's top and bottom hard again", file: "src/app/globals.css", from: "  mask-image: linear-gradient(to bottom, transparent, black var(--sp-16), black calc(100% - var(--sp-16)), transparent);\n", to: "", expect: "5.2" },
  { name: "the wave's sides fade on a phone too", file: "src/app/globals.css", from: "--kp-nf-side: clamp(0px, calc((100vw - var(--w-form)) * 1000), var(--sp-16));", to: "--kp-nf-side: var(--sp-16);", expect: "5.4" },
  // Re-anchored (round 7, R7-C, 2026-10-10): the padding is now the h1's last class — round 4's Tailwind indent that followed it
  // moved into globals.css's one display-heading rule (`[data-stem]`) — so the anchor ends on the class's closing quote.
  { name: "the question's column back under the watermark", file: "src/app/markets/[id]/page.tsx", from: " pr-[calc(2em+12px)]\"", to: "\"", expect: "7.1" },
  { name: "the clock's label back in --warning-fg (gold then; amber since 2026-10-10 — a label is no warning)", file: "src/components/markets/countdown.tsx", from: "uppercase eyebrow text-text-subtle\">{resolvedLabel}", to: "uppercase eyebrow text-warning-fg\">{resolvedLabel}", expect: "8.1" },
  { name: "the market panel's eyebrow back in gold", file: "src/app/markets/[id]/page.tsx", from: "eyebrow font-bold text-text-subtle\">\n                  {t.market.signInToPredict}", to: "eyebrow font-bold text-gold-300\">\n                  {t.market.signInToPredict}", expect: "8.2" },
  { name: "a missing round titled ‘Up & Down’ again", file: "src/app/updown/[roundId]/page.tsx", from: "if (!d) return notFoundMetadata();", to: "if (!d) return { title: \"Up & Down\" };", expect: "2.5" },
  { name: "a missing proposal titled ‘Proposal’ again", file: "src/app/proposals/[id]/page.tsx", from: ": notFoundMetadata();", to: ": { title: \"Proposal\" };", expect: "2.6" },
];
