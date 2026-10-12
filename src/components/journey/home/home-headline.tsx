/**
 * THE JOURNEY HOME'S HEADLINE — "Jibu swali. / NDIO au HAPANA." (the Vodacom plan S7: VODACOM-PLAN §3.2's order, the §2
 * build map's Headline row; `S7-PLAN.md` WP7 step 2 item 2 with amendment A16 items 1-2; pick-1-home.dc.html :48,
 * s4-3-home-desktop.dc.html :40). ONE DRAWING for the page and its ghost, so the ghost's headline stands exactly where the
 * page's lands, in every language and at every width.
 *
 * ⭐ TWO SENTENCES, THE SECOND BUILT FROM THE SIDE WORDS: `journey.headlineAsk`, then `journey.headlineSides` filled with
 * `sideWord` (the product's own YES and NO, in the headline's neutral ink — no side ink, §2). On a phone a `<br>` sets
 * each sentence on its own line; from 1024 the `<br>` is hidden (`.kp-jhome__br`) and the two share one line (A16 item 2).
 * ⭐ THE SEPARATOR IS THE LANGUAGE'S OWN, AND IT REACHES THE HTML: a space after a Latin full stop, nothing after
 * Chinese's 。 (`sentenceGap`, decided by the sentence's own last mark, never the locale). It is an explicit expression,
 * because the compiler drops source whitespace around a `<br>` — and from 1024, where the `<br>` draws nothing, a lost
 * space would run the sentences together.
 * ⭐ THE RUNG (A16 item 2; measured — VODACOM-PLAN §0j's bar budget at 360, and the Sora widths recorded with WP7): below
 * 1024 the markup's `text-title-lg` (28px), the largest ladder rung that holds exactly two lines at 360 in sw, en and zh
 * (English's "Answer the question." outgrows a 360 phone's 328px line at 32px); from 1024 `--type-display-2` (44px,
 * `.kp-jhome__title` in globals.css), the largest of A16's three candidates that holds one line at 1280 beside the How-to
 * card. In the `.kp-hero__headline` family (§2): Sora 800, the family's tracking, Chinese untracked.
 * ⭐ A DISPLAY HEADING OPENS ON ITS COLUMN'S EDGE: it asks the one stem question (`stemOf`, round 7's R7-C rule). Only its
 * first line is set back, as for every display heading (`display-stem.ts`).
 * ⛔ No directive and no read: the server page and the client ghost both draw it from the words they are handed.
 * `test:journey-home` §7 holds it.
 */
import { stemOf } from "@/lib/display-stem";
import { sideWord } from "@/lib/side-label";
import { fill } from "@/lib/utils";
import type { Dict } from "@/lib/i18n-dict";

/** Chinese's full stop, 。 — built from its code point, so no tool can decode it on its way to disk. */
const IDEOGRAPHIC_FULL_STOP = String.fromCharCode(0x3002);

/** The gap between the two sentences: none after a sentence that closes on 。 (Chinese sets no space after it), else one
 *  space. */
export function sentenceGap(sentence: string): string {
  return sentence.endsWith(IDEOGRAPHIC_FULL_STOP) ? "" : " ";
}

/** The page's h1, or — `ghost` — the same words set but not shown, a bar under each sentence, marked for the ghost drive. */
export function HomeHeadline({ t, ghost = false }: { t: Dict; ghost?: boolean }) {
  const ask = t.journey.headlineAsk;
  const sides = fill(t.journey.headlineSides, { yes: sideWord(t, "YES", "MARKET"), no: sideWord(t, "NO", "MARKET") });
  const words = (
    <>
      <span>{ask}</span>{sentenceGap(ask)}<br className="kp-jhome__br" /><span>{sides}</span>
    </>
  );
  return ghost ? (
    <p aria-hidden data-stem={stemOf(ask)} className="kp-jhome__title kp-jhome-ghost__title text-title-lg" data-ghost-part="headline">{words}</p>
  ) : (
    <h1 data-stem={stemOf(ask)} className="kp-jhome__title text-title-lg">{words}</h1>
  );
}
