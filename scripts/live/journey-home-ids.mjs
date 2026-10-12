/**
 * S7'S JOURNEY TEST IDS — the ones a journey page's SERVED DOCUMENT carries before hydration (the Vodacom plan S7:
 * `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP11 step 4 as amendment A23 items 1 and 3 amend
 * it). ONE list, imported by `qa:live` ([E2] and [E3]: absent for every reader who holds no pass) and by
 * `qa:journey-home` (its positive control: present for a pass holder, where each belongs), so an absence is only ever
 * asked of an id proved to appear.
 *   · journey-home        the home's root (`journey-home.tsx`), on `/` alone;
 *   · journey-card        every journey card (`journey-card.tsx`): on `/`, `/live` and `/results` (and `/watchlist`
 *                         and the question page's similar rail);
 *   · journey-howto-card  the How-to card (`howto-card.tsx`, server-rendered through the home's lazy module), on `/`.
 * ⛔ NOT journey-howto-sheet: the kit Modal renders nothing until it is mounted and open, then portals, so that id can
 * never be in served HTML (A23 item 1); the drives use it to find the open sheet. journey-home-ghost (the home's ghost,
 * A17) joins the list only if `qa:journey-home`'s positive control finds it in a pass holder's served document — its
 * finding is recorded in VODACOM-PLAN §0j.
 * ⭐ The generic `journey-*` matcher qa:live already holds (JOURNEY_TRACE) catches these ids too; this list exists so
 * the ids S7 adds are NAMED, matched on their own (`journeyHomeIdsIn`) and proved to appear where they are served.
 */
export const JOURNEY_HOME_TESTIDS = ["journey-home", "journey-card", "journey-howto-card"];

const BS = String.fromCharCode(92);
/** `data-testid` as an element attribute (`data-testid="x"`) or a JSON key in the RSC payload, escaped or not. */
const idPattern = (id) =>
  new RegExp(`data-testid(?:=|${BS}${BS}?":)${BS}${BS}?"${id.replace(/[-]/g, "[-]")}${BS}${BS}?"`);

/** Which of S7's ids a document's bytes carry, as an element or in the RSC payload's JSON (escaped or not). */
export function journeyHomeIdsIn(html) {
  const s = String(html ?? "");
  return JOURNEY_HOME_TESTIDS.filter((id) => idPattern(id).test(s));
}

/**
 * The matcher's own control: each id caught as an element and as RSC JSON (escaped and plain), and a page without them
 * passed — including an id that merely STARTS with one of them, so "journey-card-x" is never read as a card.
 * Returns the problems, empty when the matcher holds.
 */
export function journeyHomeIdsControl() {
  const problems = [];
  for (const id of JOURNEY_HOME_TESTIDS) {
    const element = `<div class="x" data-testid="${id}">`;
    const rscEscaped = `self.__next_f.push([1,"[${BS}"$${BS}",${BS}"div${BS}",null,{${BS}"data-testid${BS}":${BS}"${id}${BS}"}]"])`;
    const rscPlain = `["$","div",null,{"data-testid":"${id}"}]`;
    for (const [form, html] of [["element", element], ["RSC escaped", rscEscaped], ["RSC plain", rscPlain]]) {
      if (journeyHomeIdsIn(html).join() !== id) problems.push(`${id} as ${form} read as ${JSON.stringify(journeyHomeIdsIn(html))}`);
    }
  }
  const clean = `<div data-testid="journey-top-bar"></div><a data-testid="journey-card-pick"></a><p>journey-home journey-card</p><div data-testid="home-card"></div>`;
  if (journeyHomeIdsIn(clean).length !== 0) problems.push(`a page without S7's ids read as ${JSON.stringify(journeyHomeIdsIn(clean))}`);
  return problems;
}
