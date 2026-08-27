/**
 * WHERE A NON-ESSENTIAL THING MAY NOT APPEAR — one home for two related questions.
 *
 * ⛔ WHY THIS FILE EXISTS. `isMoneySurface` was private to `needle.tsx`, and the install
 * invitation needs the same class of judgement. Copying it would have given the platform two
 * definitions of "a money surface" that drift — the shape this repo has now filed for the
 * route→nav-key resolver, the campaign-handoff locator (four times) and the crumb resolver.
 * The Needle imports it from here now and its behaviour is UNCHANGED: same regex, same answer.
 *
 * ⭐ AND THE SECOND PREDICATE IS DELIBERATELY WIDER, WITH A DIFFERENT JOB. Ali's rule for the
 * install invitation is stricter than the Needle's: *"never over the bet button or the balance
 * pill"*. A fidget parked at the edge of `/markets/<id>` is harmless; a dismissible card anchored
 * to the bottom of the viewport can land on the one gold control that commits money. This repo has
 * already shipped a WhatsApp FAB sitting on top of a CTA, and only LOOKING found it.
 * ⛔ So `isCommitSurface` adds the surfaces that carry a money COMMIT control — the poll bet card
 * and the Up & Down round card — and it is the predicate the invitation uses.
 */

/** Money surfaces where a fidget must never appear (CLAUDE-CODE-BRIEF §4.1). */
const MONEY_ROUTE = /^\/wallet(\/|$)/;

export function isMoneySurface(path: string | null): boolean {
  return !!path && MONEY_ROUTE.test(path);
}

/**
 * Every route that puts a MONEY COMMIT CONTROL on screen — the poll bet card's gold confirm and
 * the Up & Down round card's one-click commit, plus everything `isMoneySurface` already covers.
 *
 * ⚠️ THE BOARDS ARE NOT LISTED, AND THAT IS ON PURPOSE. `/markets` and `/updown` are browse
 * surfaces with no commit control, and suppressing an invitation there would leave nowhere for it
 * to appear on a phone. The DETAIL routes are the ones that commit.
 * ⛔ Keep this a pure function of the path with no hooks: it is called from a render and from an
 * effect, and a predicate that needs a hook is a predicate two callers will disagree about.
 */
const COMMIT_ROUTE = [
  /^\/markets\/[^/]+/,        // a poll's bet card
  /^\/updown\/[^/]+/,         // an Up & Down round card (NOT /updown itself)
  /^\/proposals\/new(\/|$)/,  // a paid submission
];

export function isCommitSurface(path: string | null): boolean {
  if (!path) return false;
  if (isMoneySurface(path)) return true;
  return COMMIT_ROUTE.some((re) => re.test(path));
}
