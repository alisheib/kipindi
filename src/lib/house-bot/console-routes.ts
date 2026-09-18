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
 * The landing page's tab keys, in rail order, holding ONLY the keys whose panel exists (ruling 312).
 * `activity`, `limits` and `history` join it with their panels at C7 steps 3 and 5.
 */
export const CONSOLE_TABS = ["roster"] as const;
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
 * ⚠️ `limits` has no panel yet (`CONSOLE_TABS`), so today this resolves to the roster (ruling 302) — which is the
 * honest answer for a SEALED REFUSAL carried in a letter or a bell (it lands on the section, not on a 404), and
 * becomes the limits panel the moment step 3 adds the key.
 */
export const CONSOLE_LIMITS_HREF = `${CONSOLE_ROUTE}?tab=limits`;

/** True when the tab key `t` has a panel behind it — so a surface can tell a live link from a dead one. */
export function consoleTabExists(t: string): boolean {
  return (CONSOLE_TABS as readonly string[]).includes(t);
}

/**
 * ⛔ WHETHER THE CONSOLE MAY RENDER A LINK TO THE LIMITS TAB AT ALL (ruling 432(i)).
 * `consoleTab()` resolves an unknown `?tab=` back to the roster, so while `limits` is absent from `CONSOLE_TABS` a
 * link to `CONSOLE_LIMITS_HREF` repaints the IDENTICAL page — no limits form, no message, no feedback. Measured on the
 * first render: the desk's only call to action in the unset-limits state, and the whole roster-full sentence in the
 * head, both pointed there. That is the dead control 432(a) refuses, in its honest-looking half — the head action and
 * the master switch at least say they are disabled. So a RENDERED surface reads this flag and paints plain text until
 * the panel lands; a letter's or a bell's href is unaffected, because landing on the section is not a dead control.
 * ⛔ Step 3 adds `"limits"` to `CONSOLE_TABS` and both sentences become links in the SAME change as the panel.
 */
export const LIMITS_TAB_READY: boolean = consoleTabExists("limits");

/*
 * ⛔ NO `#limits-first-unset` BUILDER YET, AND THAT IS DELIBERATE (ruling 306's strip sentence, deferred to step 3).
 * `test:tab-anchors` reads every source link carrying `/admin/<route>…#anchor` and requires the id to be RENDERED on
 * the tab the href selects. The limits panel that carries that id is step 3's, so writing the fragment here would ship
 * a link to an anchor nothing renders — the exact defect that suite exists for. The strip's sentence therefore links to
 * `CONSOLE_LIMITS_HREF`, and the fragment builder lands in the same change as the anchor.
 */

/** The activity tab of the landing page, or of one account. */
export function consoleActivityHref(botId?: string | null, opts: { range?: string } = {}): string {
  const range = opts.range ? `&range=${opts.range}` : "";
  return botId ? `${CONSOLE_ROUTE}/${botId}?tab=activity${range}` : `${CONSOLE_ROUTE}?tab=activity${range}`;
}

/** One account's page. */
export function consoleBotHref(botId: string): string {
  return `${CONSOLE_ROUTE}/${botId}`;
}

/** One account's page, on a named tab. */
export function consoleBotTabHref(botId: string, tab: string): string {
  return `${CONSOLE_ROUTE}/${botId}?tab=${tab}`;
}

/** One account's page with the re-verify field focused (`PLAN.md:816`'s canonical form). */
export function consoleReverifyHref(botId: string): string {
  return `${CONSOLE_ROUTE}/${botId}?reverify=1`;
}

/** One account's history, scrolled to one event. */
export function consoleEventHref(botId: string, eventId: string): string {
  return `${CONSOLE_ROUTE}/${botId}?tab=history&event=${eventId}`;
}
