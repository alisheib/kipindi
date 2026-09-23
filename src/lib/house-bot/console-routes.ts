/**
 * THE CONSOLE'S ROUTE, ITS TAB KEYS AND EVERY HREF ANY SURFACE BUILDS FROM THEM — ONE HOME (C7-SPEC ruling 319).
 *
 * ⛔ WHY ONE HOME. Before this module the segment was typed 28 times in six `src/` files and again in a shot fixture,
 * in three different spellings of the same limits link (`alert-copy.ts`'s two, `rules.ts`'s `LIMITS_TAB_HREF`, and
 * `eligibility.ts`'s inline one). Three spellings of one route is how an officer is sent to a page that answers about a
 * different limit, and a literal left behind after a rename is an officer-facing link to a route that does not exist.
 * Nothing outside this file types the segment.
 *
 * ⛔ THE SEGMENT CARRIES NO FEATURE WORD AND NO RECORD ID (rulings 320, 452, 453). The RBAC table and the nav table that
 * must hold the prefix are both value-imported by CLIENT modules, and a built chunk of this codebase ships both
 * verbatim — so the prefix reaches every browser whatever the page renders. The dynamic segment is `[id]`, the platform's
 * own spelling, because the notifier href resolver allows exactly `[id]`, `[positionId]`, `[marketId]` and `[slug]`.
 *
 * ⛔ THE TAB LIST HOLDS ONLY KEYS WHOSE PANEL IS BUILT (ruling 312). A rail option with no panel is a dead control, and
 * `?tab=` resolves against this list, so it grows with the panels — never ahead of them. An unrecognised `?tab=` value
 * resolves to `DEFAULT_TAB` (ruling 302): a query string is not a resource, so it is never a 404 and never a redirect.
 *
 * ⚠️ WHERE IT LIVES, AND WHY NOT WHERE THE SPEC DRAFTED IT. Ruling 319 drafted this as
 * `src/lib/server/house-bot/console-routes.ts`. Measured: nothing could have imported it there. A console page may not
 * name any module under `src/lib/server/house-bot/` (ruling 340's pin, `test:house-bot-reports` 0.260.1), and
 * `rules.ts` and `alert-copy.ts` may value-import only this folder and a short allowlist (`test:house-bot-rules` §0's
 * module law). So it is a PURE module of the house folder, under that same law — no client directive, no server value
 * import, no node import — and `test:house-bot-disclosure` 1.2 still watches it by name, because its `houseModules`
 * test is `/[\\/]house-bot[\\/]|house-bot-dal/`, which this path matches.
 */

/** The console section. ⛔ The only place this string is written. */
export const CONSOLE_ROUTE = "/admin/desk";

/** The wizard. */
export const CONSOLE_NEW_ROUTE = `${CONSOLE_ROUTE}/new`;

/**
 * ⛔ THE SECTION's ONE WAY BACK IS A COMPONENT NOW — `src/app/admin/desk/way-out-link.tsx`.
 *
 * It was declared here at the C7 step 7 review as a shared CLASS STRING, and `test:house-bot-rules`
 * 0.console-routes.ts refused it: Tailwind scans EVERY file, so a class-shaped string in a routes module becomes
 * CSS, and an invalid one once 500'd every route on this platform. The review's reasoning was right — three
 * pages had shipped two looks for one control — and only its home was wrong. A component carries a look; a routes
 * module must not author CSS.
 */


/**
 * The landing page's tab keys, in rail order, holding ONLY the keys whose panel exists (ruling 312).
 * `limits` joined it with its panel at C7 step 3.
 *
 * ⭐ `activity` AND `history` JOINED AT C7 STEP 5's LANDING HALF, WITH THE DESK-WIDE READERS BEHIND THEM —
 * `houseFeedForConsole` (every account's stakes in one list) and `houseHistoryForConsole` (every account's changes
 * AND the control row's own: the switch, a limits save, the withdrawal, which a per-account narrowing correctly
 * drops). Each is a gated reader building ONE `readDeskCore` set, so all four tabs paint the same strip, the same
 * band and the same queued-stake badge.
 * ⛔ THE ORDER IS THE RAIL'S ORDER AND IT IS RULING 312's OWN: roster · activity · limits · history — who is on
 * the desk, what it is doing, what would stop it, what was done to it.
 * ⛔ THE LIST STILL GROWS ONLY WITH A PANEL. A rail option with no panel is a dead control, `?tab=` resolves
 * against this list, and `consoleTabExists` is what every surface asks before it renders a link to one.
 * ⚠️ THE ACCOUNT PAGE'S HALF LANDED FIRST, AND THE ORDER WAS FORCED (see `CONSOLE_DETAIL_TABS` below): comms case
 * 7.2d asserted these two keys' ABSENCE while exactly one delivered alert href — the hour summary's — was a
 * LANDING `?tab=activity` link with no panel behind it. That case is deleted with this build, because its subject
 * is gone: there is no dead tab left for it to measure.
 */
export const CONSOLE_TABS = ["roster", "activity", "limits", "history"] as const;
export type ConsoleTab = (typeof CONSOLE_TABS)[number];

/** The panel a bare visit renders, and what any unrecognised `?tab=` value resolves to (ruling 302). */
export const DEFAULT_TAB: ConsoleTab = "roster";

/**
 * The tab a request asked for, or `DEFAULT_TAB`. Absent, empty, misspelled, and an array from a repeated parameter all
 * resolve to the default — never `notFound()` and never a redirect.
 */
export function consoleTab(raw: string | string[] | undefined): ConsoleTab {
  const one = Array.isArray(raw) ? undefined : raw;
  return (CONSOLE_TABS as readonly string[]).includes(one ?? "") ? (one as ConsoleTab) : DEFAULT_TAB;
}

/** The rail's own link for one tab key. */
export function consoleTabHref(tab: ConsoleTab): string {
  return tab === DEFAULT_TAB ? CONSOLE_ROUTE : `${CONSOLE_ROUTE}?tab=${tab}`;
}

/**
 * Where a limits refusal sends the owner. Absolute, like every refusal href (04 N1 §6).
 * ⭐ `limits` now has a panel (`CONSOLE_TABS`, C7 step 3), so this resolves to the limits tab rather than falling back
 * to the roster — and every surface that renders it may render it as a LINK (`LIMITS_TAB_READY`).
 */
export const CONSOLE_LIMITS_HREF = `${CONSOLE_ROUTE}?tab=limits`;

/** True when the tab key `t` has a panel behind it — so a surface can tell a live link from a dead one. */
export function consoleTabExists(t: string): boolean {
  return (CONSOLE_TABS as readonly string[]).includes(t);
}

/**
 * ⛔ WHETHER THE CONSOLE MAY RENDER A LINK TO THE LIMITS TAB AT ALL (ruling 432(i)).
 * `consoleTab()` resolves an unknown `?tab=` back to the roster, so while `limits` was absent from `CONSOLE_TABS` a
 * link to `CONSOLE_LIMITS_HREF` repainted the IDENTICAL page — no limits panel, no message, no feedback. Measured on
 * the first render: the desk's only call to action in the unset-limits state, and the whole roster-full sentence in the
 * head, both pointed there. That is the dead control 432(a) refuses, in its honest-looking half — the head action and
 * the master switch at least say they are disabled.
 * ⭐ C7 STEP 3 ADDED THE PANEL AND THIS FLAG IS NOW TRUE, so both sentences are links. ⛔ The flag STAYS, and the
 * INERT branch keeps its proof: it is derived from `CONSOLE_TABS`, so steps 4, 5 and 6 govern `activity`, `history`,
 * `rules` and `targets` by exactly this rule, and the two functions the inert branch used — `stripLinkedTail` and the
 * reader's `rosterFullPlain` — are asserted directly rather than through a branch that no longer executes. A proof
 * deleted the day its branch stops running is how the next dead control ships.
 */
export const LIMITS_TAB_READY: boolean = consoleTabExists("limits");

/**
 * The id the limits panel renders on the FIRST unset required limit, and the fragment every surface links to.
 *
 * ⛔ THE HREF IS ONE WHOLE STRING LITERAL, DELIBERATELY. `test:tab-anchors` reads every source link matching
 * `"/admin/<route>…#anchor"` and requires the id to be RENDERED on the tab the href selects; a template built from
 * `${CONSOLE_ROUTE}` does not start with `/admin`, so the suite would never see this link and the anchor would be
 * unguarded. ⛔ And because the literal could then drift from the composed form, `test:house-bot-console` asserts the
 * two are equal — the guard gets its literal and the literal cannot rot.
 * ⛔ IT LANDS IN THE SAME CHANGE AS THE RENDERED ID, which is why it did not exist before step 3: a fragment builder
 * pointing at an anchor nothing renders is the exact defect `test:tab-anchors` exists for.
 */
export const LIMITS_FIRST_UNSET_ID = "limits-first-unset";
export const CONSOLE_LIMITS_FIRST_UNSET_HREF = "/admin/desk?tab=limits#limits-first-unset";

/** The activity tab of the landing page, or of one account. */
export function consoleActivityHref(botId?: string | null, opts: { range?: string } = {}): string {
  const range = opts.range ? `&range=${opts.range}` : "";
  return botId ? `${CONSOLE_ROUTE}/${botId}?tab=activity${range}` : `${CONSOLE_ROUTE}?tab=activity${range}`;
}

/**
 * ⭐ THE ACCOUNT PAGE'S OWN TAB KEYS (C7 step 4, rulings 312, 319 as amended by replan ruling 508).
 *
 * ⛔ THE SAME CLOSED-LIST LAW AS THE LANDING PAGE'S: only keys whose panel is BUILT. `rules` and `targets` land with
 * this page under ruling 508 — bells and letters that already shipped link to `?tab=rules`, and §5 captures all three,
 * so striking them would have broken live hrefs to fix a drafting gap. A rail option with no panel is a dead control,
 * and `consoleDetailTab` resolves every other value back to `overview`.
 *
 * ⭐ `activity` AND `history` JOINED AT C7 STEP 5 WITH THE READERS BEHIND THEM — `listFeed`/`countFeed` and
 * `listAll`/`countAll`, both narrowed to this account through the ONE predicate each twin's list and count share.
 * ⛔ THE ACCOUNT PAGE'S HALF LANDS BEFORE THE LANDING PAGE'S, AND THE ORDER IS FORCED, NOT PREFERRED. Measured on
 * this tree: `scripts/lib/house-bot-comms-cases.mts` case 7.2d asserts `!consoleTabExists("activity") &&
 * !consoleTabExists("history")` AND `deadTabs.length >= 1`, and of the eleven `?tab=` hrefs a run of the comms
 * suite produces, TEN are detail links and exactly ONE is a landing link. So building the LANDING panels first
 * reds 7.2d at once, while building these leaves that one landing link dead and 7.2d measuring it. The debt list
 * beside that case is keyed PER SHAPE for the same reason.
 */
export const CONSOLE_DETAIL_TABS = ["overview", "activity", "rules", "targets", "history"] as const;
export type ConsoleDetailTab = (typeof CONSOLE_DETAIL_TABS)[number];

/** The account page's default panel, and what any unrecognised `?tab=` value resolves to (ruling 302). */
export const DEFAULT_DETAIL_TAB: ConsoleDetailTab = "overview";

/** The account-page tab a request asked for, or `DEFAULT_DETAIL_TAB`. Never a 404 and never a redirect (302). */
export function consoleDetailTab(raw: string | string[] | undefined): ConsoleDetailTab {
  const one = Array.isArray(raw) ? undefined : raw;
  return (CONSOLE_DETAIL_TABS as readonly string[]).includes(one ?? "") ? (one as ConsoleDetailTab) : DEFAULT_DETAIL_TAB;
}

/** True when the account page's tab key `t` has a panel behind it (the detail half of 432(i)). */
export function consoleDetailTabExists(t: string): boolean {
  return (CONSOLE_DETAIL_TABS as readonly string[]).includes(t);
}

/** One account's page. */
export function consoleBotHref(botId: string): string {
  return `${CONSOLE_ROUTE}/${botId}`;
}

/** One account's page, on a named tab. */
export function consoleBotTabHref(botId: string, tab: string): string {
  return `${CONSOLE_ROUTE}/${botId}?tab=${tab}`;
}

/**
 * One account's page with the idle explanation open, STAYING on the tab the officer was reading.
 * ⛔ IT KEEPS THE TAB, and that is the whole reason it is a function. Built inline in the page it was
 * `${CONSOLE_ROUTE}/${id}?why=1` — which drops `?tab=`, so an officer asking the question from Rules or
 * Activity was silently thrown back to the Overview and had to find their way again. A link that moves
 * you somewhere you did not ask to go is the kind of thing nobody reports and everybody works around.
 */
export function consoleWhyHref(botId: string, tab: string | null): string {
  return tab && tab !== DEFAULT_TAB ? `${CONSOLE_ROUTE}/${botId}?tab=${tab}&why=1` : `${CONSOLE_ROUTE}/${botId}?why=1`;
}

/** One account's page with the re-verify field focused (`PLAN.md:816`'s canonical form). */
export function consoleReverifyHref(botId: string): string {
  return `${CONSOLE_ROUTE}/${botId}?reverify=1`;
}

/** One account's history, scrolled to one event. */
export function consoleEventHref(botId: string, eventId: string): string {
  return `${CONSOLE_ROUTE}/${botId}?tab=history&event=${eventId}`;
}

/**
 * ⭐ THE DESIGNATE WIZARD'S OWN STEP KEYS (C7 step 6; rulings 312, 319, 412).
 *
 * ⛔ THE SAME CLOSED-LIST LAW AS EVERY OTHER RAIL ON THIS SECTION: only keys whose panel is BUILT, and an
 * unrecognised value resolves back rather than 404s (302). All four ship together — ruling 412 and Ali's standing
 * "no pending states" rule both refuse a wizard with a step that says it is not ready.
 * ⚠️ `step` is NOT spelled `tab`, and that is deliberate: the served probe discovers a page's panels by matching
 * `tab === "…"` over the raw file, so a wizard written with `tab` would put four phantom instances of this route
 * into the probe's own population — four requests for panels that are not tabs of anything.
 */
export const CONSOLE_WIZARD_STEPS = ["find", "check", "consent", "review"] as const;
export type ConsoleWizardStep = (typeof CONSOLE_WIZARD_STEPS)[number];

/**
 * The step a request asked for. ⛔ WITHOUT AN ACCOUNT THERE IS ONLY ONE STEP: `?step=review` with no `?u=` would
 * otherwise paint a form with nothing to designate — the dead control 432(a) refuses. With an account, an
 * unrecognised or absent step is the CHECK, which is the first thing an officer must read about that account.
 */
export function consoleWizardStep(raw: string | string[] | undefined, hasAccount: boolean): ConsoleWizardStep {
  const one = Array.isArray(raw) ? undefined : raw;
  if (!hasAccount) return "find";
  return one === "consent" || one === "review" ? one : "check";
}

/** Where the wizard is, for one account and one step. ⛔ Built here, never spelled at a call site (319). */
export function consoleNewHref(opts: { userId?: string | null; step?: ConsoleWizardStep } = {}): string {
  if (!opts.userId) return CONSOLE_NEW_ROUTE;
  const step = opts.step && opts.step !== "find" && opts.step !== "check" ? `&step=${opts.step}` : "";
  return `${CONSOLE_NEW_ROUTE}?u=${encodeURIComponent(opts.userId)}${step}`;
}

/**
 * ⛔ THE TWO BY-HAND ENTRY MODES, AND WHETHER THIS BUILD HAS A SCREEN THAT CAN USE THEM (prod finding 2026-09-22).
 *
 * Enter now and Targeted stakes are two of the five press purposes (`PRESS_PURPOSES`); of the five, only the
 * staff cancel has a screen on this build, and nothing under `src/` inserts a target. Yet both satisfied Start's
 * "some entry mode" rule, so an account whose only entry was one of them started and never placed a bet — the
 * rules form even says so in prose (`byHandNote`). `rulesStartProblems` now reads THESE flags (its
 * `byHandScreens` default) and refuses such an account with `BY_HAND_NO_SCREEN` while its flag is false.
 *
 * ⛔ A FLAG IS TRUE EXACTLY WHEN THE PAGE AT ITS ROUTE EXISTS — tied by existence, as ruling 432(h) ties the roster's
 * way-out column to the detail page. `test:house-bot-rules` §10 reads `src/app<route>/page.tsx` off disk for each
 * key and holds the flag to it in BOTH directions: a true flag with no page is the inert switch Start exists to
 * refuse; a false flag beside a built page is Start over-refusing a working screen. Building a screen elsewhere
 * (a dialog on the account page, say) means moving the tie here first, in the same change.
 */
export type ByHandScreens = { readonly enterNow: boolean; readonly targeting: boolean };

/** Where each by-hand screen lives when it exists. Routes, so the tie is a page file and not a class of files. */
export const BY_HAND_SCREEN_ROUTES = {
  enterNow: `${CONSOLE_ROUTE}/[id]/enter-now`,
  targeting: `${CONSOLE_ROUTE}/[id]/targets/new`,
} as const satisfies Record<keyof ByHandScreens, string>;

/** ⛔ Flip a value here ONLY in the change that lands its page; the existence tie refuses either alone. */
export const BY_HAND_SCREENS: ByHandScreens = { enterNow: false, targeting: false };
