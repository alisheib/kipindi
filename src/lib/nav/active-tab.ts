/**
 * THE JOURNEY'S FOUR TABS, AND WHICH ONE A PAGE BELONGS TO — one definition (the Vodacom plan S6, SJ-16;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP2, amendments A12 and A18).
 *
 * Maswali · Juu/Chini · Tiketi zangu · Akaunti. The phone rail and the desktop links (S6 WP6a) both read `JOURNEY_TABS`
 * and ask `activeTabFor` which one is current, so the two can never disagree about where the reader is.
 *
 * ⭐ ONE ORDERED TABLE, FIRST MATCH WINS — the shape of `activeKeyFromPath` (`admin-nav-groups.ts`), which exists because
 * its two copy-pasted predecessors drifted and three admin pages highlighted nothing. A page reached through the hub
 * reads as Akaunti, following the classic rail's own `moreActive` precedent (`bottom-nav.tsx`): the tab that holds the
 * door is the tab that is lit.
 *
 * ⛔ A ROW MATCHES ITS OWN PATH OR A PATH BELOW IT, NEVER A PATH THAT MERELY SHARES ITS LETTERS (A18). The marketing
 * opt-out lives at `/s` and `/s/<token>`; a bare `startsWith("/s")` would also claim every future route that begins with
 * an s. `routeMatches` is the one matcher, and `test:journey-shell` §1 plants the bare form.
 * ⛔ ORDER IS LOAD-BEARING where one prefix sits under another: `/updown/history` is a TICKETS page and must stay above
 * `/updown`, or the game's tab would claim it. `tabTableProblems` reports a row an earlier row shadows.
 *
 * ⭐ `aria-current` IS DECIDED HERE TOO (A12). "page" only when the path IS the tab's own href; "true" when the page
 * merely belongs to the tab's section — so a screen reader on Matokeo hears "Akaunti, current", never "current page".
 *
 * Pure: no imports and no directive, so the server (the hub) and the client chrome read the same table —
 * `test:journey-shell` §2 holds it to that.
 */

/** The four tabs, by key. */
export type JourneyTab = "questions" | "updown" | "tickets" | "account";

/** A glyph key of `I` (`components/ui/glyphs.tsx`) — `test:journey-shell` §1 holds each one to a real glyph. */
export type TabGlyph = "questionCircle" | "trade" | "ticket" | "user";

/** The dictionary path of a tab's label (`t.journey.tabQuestions` …); `tabLabel` reads it. */
export type TabLabelKey = "journey.tabQuestions" | "nav.updown" | "journey.tabTickets" | "journey.tabAccount";

export type JourneyTabDef = { key: JourneyTab; href: string; glyph: TabGlyph; label: TabLabelKey };

/**
 * The tabs, in the deck's order. ⚠️ Juu/Chini reuses `nav.updown`, the rail's own short label (a fifth of a 360 phone
 * cannot hold the product title); the three new words are `journey.*` keys until the S15 flip.
 */
export const JOURNEY_TABS: readonly JourneyTabDef[] = [
  { key: "questions", href: "/",          glyph: "questionCircle", label: "journey.tabQuestions" },
  { key: "updown",    href: "/updown",    glyph: "trade",          label: "nav.updown" },
  { key: "tickets",   href: "/positions", glyph: "ticket",         label: "journey.tabTickets" },
  { key: "account",   href: "/account",   glyph: "user",           label: "journey.tabAccount" },
];

/** One row of the table: a path, and the paths below it unless `exact`, belong to `tab` (null = no tab is lit). */
export type TabRoute = { prefix: string; tab: JourneyTab | null; exact?: boolean };

export const TAB_ROUTES: readonly TabRoute[] = [
  // Maswali — the home board, the board and every question.
  { prefix: "/", tab: "questions", exact: true },
  { prefix: "/markets", tab: "questions" },
  // ⚠️ ABOVE `/updown`: Up & Down tickets are tickets, and the game's row below would claim this path first.
  { prefix: "/updown/history", tab: "tickets" },
  { prefix: "/updown", tab: "updown" },
  { prefix: "/positions", tab: "tickets" },
  { prefix: "/account", tab: "account" },
  // Reached through the hub (S6 WP5), so they light the hub's tab.
  { prefix: "/wallet", tab: "account" },
  { prefix: "/profile", tab: "account" },
  { prefix: "/notifications", tab: "account" },
  { prefix: "/results", tab: "account" },
  { prefix: "/live", tab: "account" },
  { prefix: "/leaderboard", tab: "account" },
  { prefix: "/fairness", tab: "account" },
  { prefix: "/help", tab: "account" },
  { prefix: "/legal", tab: "account" },
  { prefix: "/proposals", tab: "account" },
  { prefix: "/agent", tab: "account" },
  { prefix: "/watchlist", tab: "account" },
  // No tab: a sign-in in progress, the marketing opt-out (its own minimal shell) and the offline fallback.
  { prefix: "/auth", tab: null },
  { prefix: "/s", tab: null },
  { prefix: "/offline", tab: null, exact: true },
];

/** THE matcher: the row's own path, or a path BELOW it — never one that only shares its letters. */
export function routeMatches(path: string, row: Pick<TabRoute, "prefix" | "exact">): boolean {
  if (path === row.prefix) return true;
  return !row.exact && path.startsWith(`${row.prefix}/`);
}

/** The first row of `rows` that claims `pathname`, or null. */
export function tabRouteIn(rows: readonly TabRoute[], pathname: string | null | undefined): TabRoute | null {
  if (!pathname) return null;
  for (const row of rows) if (routeMatches(pathname, row)) return row;
  return null;
}

/** The row of THE table that claims `pathname`, or null. */
export function tabRouteFor(pathname: string | null | undefined): TabRoute | null {
  return tabRouteIn(TAB_ROUTES, pathname);
}

/** THE resolver: which tab this page belongs to, or null when none is lit. */
export function activeTabFor(pathname: string | null | undefined): JourneyTab | null {
  return tabRouteFor(pathname)?.tab ?? null;
}

/**
 * The tab's `aria-current` (A12): "page" only on its own href, "true" when the page belongs to its section, and
 * nothing otherwise.
 */
export function tabAriaCurrent(pathname: string | null | undefined, tab: JourneyTab): "page" | "true" | undefined {
  if (activeTabFor(pathname) !== tab) return undefined;
  return JOURNEY_TABS.some((d) => d.key === tab && d.href === pathname) ? "page" : "true";
}

/** A tab's label from a dictionary (`t`), or "" when the key is missing — `assertTabKeysResolve` keeps that from happening. */
export function tabLabel(t: unknown, key: TabLabelKey): string {
  let v: unknown = t;
  for (const part of key.split(".")) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined;
  return typeof v === "string" ? v : "";
}

/**
 * Everything that can be wrong with a table, as sentences (empty = sound): a row naming a tab nobody owns, a tab no row
 * reaches, a row an earlier row shadows, a tab whose own href lights another tab, a duplicate, and — when the
 * dictionaries are passed, keyed by locale — a label missing in a language.
 */
export function tabTableProblems(
  rows: readonly TabRoute[],
  tabs: readonly JourneyTabDef[],
  dicts?: Readonly<Record<string, unknown>>,
): string[] {
  const problems: string[] = [];
  const keys = new Set<string>();
  const hrefs = new Set<string>();
  for (const d of tabs) {
    if (keys.has(d.key)) problems.push(`tab key "${d.key}" twice`);
    if (hrefs.has(d.href)) problems.push(`tab href "${d.href}" twice`);
    keys.add(d.key);
    hrefs.add(d.href);
  }
  for (const row of rows) {
    if (row.tab !== null && !keys.has(row.tab)) problems.push(`row "${row.prefix}" names "${row.tab}", which no tab owns`);
  }
  for (const d of tabs) {
    if (!rows.some((row) => row.tab === d.key)) problems.push(`tab "${d.key}" is reached by no row`);
  }
  rows.forEach((row, i) => {
    const earlier = rows.slice(0, i).find((e) => routeMatches(row.prefix, e));
    if (earlier) problems.push(`row "${row.prefix}" is unreachable — "${earlier.prefix}" matches first`);
  });
  for (const d of tabs) {
    const got = tabRouteIn(rows, d.href)?.tab ?? null;
    if (got !== d.key) problems.push(`tab "${d.key}": its own href "${d.href}" resolves to ${got === null ? "no tab" : `"${got}"`}`);
  }
  if (dicts) {
    for (const [locale, t] of Object.entries(dicts)) {
      for (const d of tabs) {
        if (!tabLabel(t, d.label).trim()) problems.push(`tab "${d.key}": label "${d.label}" is missing in ${locale}`);
      }
    }
  }
  return problems;
}

/**
 * THE guard for THE table, given the real dictionaries keyed by locale. `test:journey-shell` §1 calls it (`1.guard`)
 * and proves it reads the dictionaries it is handed (`1.guard.c`); `red:journey-shell` plants one that ignores them.
 */
export function assertTabKeysResolve(dicts?: Readonly<Record<string, unknown>>): string[] {
  return tabTableProblems(TAB_ROUTES, JOURNEY_TABS, dicts);
}
