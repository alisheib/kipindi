/**
 * WHERE A NON-ESSENTIAL THING MAY NOT APPEAR — one home for three related questions.
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
 * ⛔ So `isCommitSurface` adds the surfaces that carry a money COMMIT control — the poll bet card,
 * the Up & Down board's one-click stake, and the round card — and it is the predicate the invitation uses.
 */

/** Money surfaces where a fidget must never appear (CLAUDE-CODE-BRIEF §4.1). */
const MONEY_ROUTE = /^\/wallet(\/|$)/;

export function isMoneySurface(path: string | null): boolean {
  return !!path && MONEY_ROUTE.test(path);
}

/**
 * Every route that puts a MONEY COMMIT CONTROL on screen — the poll bet card's confirm and
 * the Up & Down board and round card's one-click commit, plus everything `isMoneySurface` already covers.
 *
 * ⚠️ `/markets` remains a browse surface. `/updown` now carries a one-click stake on its board,
 * so an invitation must stand down there as well as on the detail card.
 * ⛔ Keep this a pure function of the path with no hooks: it is called from a render and from an
 * effect, and a predicate that needs a hook is a predicate two callers will disagree about.
 */
const COMMIT_ROUTE = [
  /^\/markets\/[^/]+/,        // a poll's bet card
  /^\/updown\/?$/,           // the Up & Down board's one-click stake
  /^\/updown\/[^/]+/,         // an Up & Down round card
  /^\/proposals\/new(\/|$)/,  // a paid submission
  // MASWALI-BUILD S5 · ⛔ the slip stays OUT of MONEY_ROUTE (a recorded decision: that line is pinned verbatim and hides
  // the Needle platform-wide); it joins HERE, the wider list, with the one other Millionea page that moves money.
  /^\/millionea\/slip(\/|$)/,       // a Millionea slip's pay control and its confirm sheet
  /^\/millionea\/tickets\/[^/]+/,   // a Millionea ticket's free cancel (NOT the list)
];

export function isCommitSurface(path: string | null): boolean {
  if (!path) return false;
  if (isMoneySurface(path)) return true;
  return COMMIT_ROUTE.some((re) => re.test(path));
}

/**
 * ⭐ THE NEW JOURNEY'S SURFACES (the Vodacom plan S6, S6-PLAN WP2) — the pages the journey re-draws, where the Needle,
 * the channels panel and the chat bubble stand down for a journey viewer (WP7): the home board, a question, Tiketi
 * zangu (both kinds), and the deposit screen with the provider's return.
 *
 * ⛔ AN EXACT ALLOWLIST, NEVER A PREFIX. A page joins only by being named here; the boards, the hub and every page it
 * reaches keep all their overlays. A prefix would stand overlays down on pages nobody re-drew.
 * ⛔ IT ANSWERS FOR THE PAGE ONLY. Whether the READER is in the journey is `useJourneyOn` — the server's answer — and a
 * stand-down needs both, so for everybody else nothing changes.
 * Pure like its two neighbours — no import, no directive — and `test:journey-shell` §2 holds this file to that.
 */
const JOURNEY_ROUTE = [
  /^\/$/,                      // the home board
  /^\/positions$/,             // Tiketi zangu
  /^\/updown\/history$/,       // Tiketi zangu, Up & Down
  /^\/markets\/[^/]+$/,        // a question (NOT the board)
  /^\/wallet\/deposit(\/|$)/,  // the deposit screen and the provider's return
  // MASWALI-BUILD S5 · the Millionea pages the journey's tabs reach (MR-2): the Maswali tab's card opens the hub and its
  // slip; Tiketi zangu's third kind is the list and a ticket. ⛔ Not How or the register: reading pages keep every overlay.
  /^\/millionea$/,             // the Millionea hub
  /^\/millionea\/slip$/,       // the Millionea slip
  /^\/millionea\/tickets$/,    // Tiketi zangu, Millionea
  /^\/millionea\/tickets\/[^/]+$/, // a Millionea ticket
];

export function isJourneySurface(path: string | null): boolean {
  return !!path && JOURNEY_ROUTE.some((re) => re.test(path));
}

/**
 * ⭐ MASWALI-BUILD S5 · THE MILLIONEA SLIP, FOR EVERY READER (the v6 delivery's D-25; MASWALI-PLAN §10): the slip's pay
 * control and its confirm sheet are on screen there, so the Needle and the chat bubble stand down on it for a classic
 * reader too — whom `isJourneySurface` (a journey reader's term) never reaches. ⛔ Not `MONEY_ROUTE`, whose line is pinned
 * verbatim and means the wallet alone, and not the hub, where the Needle stays (D-25). The install invitation, the consent
 * prompt and the channels panel already stand down here through `COMMIT_ROUTE`.
 */
const SLIP_ROUTE = /^\/millionea\/slip$/;

export function isSlipSurface(path: string | null): boolean {
  return !!path && SLIP_ROUTE.test(path);
}

/** S9's payment focus is an exact route family, used before the player shell paints any chrome. */
export function isFocusedJourneyPaymentPath(path: string | null): boolean {
  return !!path && (
    path === "/wallet/deposit" || path === "/wallet/deposit/card" || path === "/wallet/deposit/return"
    || path === "/wallet/deposit/wait" || /^\/wallet\/deposit\/wait\/[^/]+$/.test(path)
  );
}
