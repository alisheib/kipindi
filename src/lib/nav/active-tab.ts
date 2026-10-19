/**
 * THE JOURNEY'S TABS, AND WHICH ONE A PAGE BELONGS TO — one definition (the Vodacom plan S6, SJ-16;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP2, amendments A12 and A18).
 *
 * Maswali · Juu/Chini · Tiketi zangu · Akaunti — and, while Maswali Millionea is visible to the reader, Millionea right
 * after Juu/Chini (Ali, 2026-10-19; `docs/DESIGN_AUTHORITY.md` §M8a item 11). The phone rail and the desktop links (S6
 * WP6a) both draw `journeyTabsFor(millionea)` and ask `activeTabFor` which of THOSE tabs is current, so the two can never
 * disagree about where the reader is, and the lit tab is always one that is drawn.
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

/** The tabs, by key. `millionea` is drawn only while Maswali Millionea is visible to the reader (`journeyTabsFor`). */
export type JourneyTab = "questions" | "updown" | "millionea" | "tickets" | "account";

/** A glyph key of `I` (`components/ui/glyphs.tsx`) — `test:journey-shell` §1 holds each one to a real glyph. */
export type TabGlyph = "markets" | "trade" | "millionea" | "ticket" | "user";

/** The dictionary path of a tab's label (`t.journey.tabQuestions` …); `tabLabel` reads it. */
export type TabLabelKey =
  | "journey.tabQuestions" | "nav.updown" | "millionea.productLabel" | "journey.tabTickets" | "journey.tabTicketsShort" | "journey.tabAccount";

/** `railLabel`: the phone rail's own shorter words for a tab whose desktop link and page keep `label` — the tickets tab's
 *  while five tabs share the phone (`journeyTabsFor`). Absent, the rail says `label` too. */
export type JourneyTabDef = { key: JourneyTab; href: string; glyph: TabGlyph; label: TabLabelKey; railLabel?: TabLabelKey };

/**
 * The four tabs, in the deck's order — what a reader who is not shown Millionea is drawn (`journeyTabsFor`). ⚠️ Juu/Chini
 * reuses `nav.updown`, the rail's own short label (a fifth of a 360 phone cannot hold the product title); the three new
 * words are `journey.*` keys until the S15 flip.
 */
export const JOURNEY_TABS: readonly JourneyTabDef[] = [
  // The board: the classic rail's "Masoko" and this "Maswali" are one meaning, so one glyph (PHOSPHOR-MIGRATION R-LEXICON 5.1A).
  { key: "questions", href: "/",          glyph: "markets",        label: "journey.tabQuestions" },
  { key: "updown",    href: "/updown",    glyph: "trade",          label: "nav.updown" },
  { key: "tickets",   href: "/positions", glyph: "ticket",         label: "journey.tabTickets" },
  { key: "account",   href: "/account",   glyph: "user",           label: "journey.tabAccount" },
];

/**
 * ⭐ MASWALI MILLIONEA'S OWN TAB (Ali, 2026-10-19; DESIGN_AUTHORITY §M8a item 11): the same tab as its siblings, drawn right
 * after Juu/Chini only while Millionea is visible to the reader — the shell's own answer, the one the classic chrome's
 * Millionea doors take (AppShell's `millioneaRow`: the rollout admits the request and the reader is not on a break). Its
 * glyph is the product's mark, the label the product's name, Latin script in every language (L10). Only its label's ink
 * sets it apart, and that is the components' business (`kp-millionea-ink`, globals.css).
 */
export const MILLIONEA_TAB: JourneyTabDef = { key: "millionea", href: "/millionea", glyph: "millionea", label: "millionea.productLabel" };

/**
 * The five tabs, built from the four so they cannot drift: Millionea spliced in right after Juu/Chini, and the tickets tab
 * given its short rail label.
 * ⭐ THE SHORT RAIL LABEL WHILE FIVE TABS SHOW (the lead's rulings, 2026-10-19, measured with `test:visual-pass-r9c`'s own
 * model): a fifth of a 320 phone is 64px, and the Swahili "Tiketi zangu" needs 83.2 (12 × 6.6 + 4), the English "My
 * tickets" 70, so the rail says "Tiketi" and "Tickets" (`journey.tabTicketsShort`) — as Juu/Chini's rail label is the
 * short `nav.updown` — while its page and its desktop link keep the full words; Chinese keeps 我的注单 (48px). Every
 * five-tab label of every language then sits on one line from 317 (the longest, 63.4px, × 5), so at every width we hold.
 */
const WITH_MILLIONEA: readonly JourneyTabDef[] = (() => {
  const at = JOURNEY_TABS.findIndex((d) => d.key === "updown") + 1;
  const after = JOURNEY_TABS.slice(at).map((d): JourneyTabDef => (d.key === "tickets" ? { ...d, railLabel: "journey.tabTicketsShort" } : d));
  return [...JOURNEY_TABS.slice(0, at), MILLIONEA_TAB, ...after];
})();

/**
 * ⭐ THE ONE DRAWN LIST: the four tabs, or the five while Millionea shows. Both journey components draw this list and hand
 * the same list to `activeTabFor` and `tabAriaCurrent`. Without Millionea it IS `JOURNEY_TABS`, so that reader's rail and
 * links are today's.
 */
export function journeyTabsFor(millionea: boolean): readonly JourneyTabDef[] {
  return millionea ? WITH_MILLIONEA : JOURNEY_TABS;
}

/**
 * One row of the table: a path, and the paths below it unless `exact`, belong to `tab` (null = no tab is lit) — or to
 * `fallback` where the drawn tabs lack `tab`, for a tab drawn only for some readers (`rowTabIn`).
 */
export type TabRoute = { prefix: string; tab: JourneyTab | null; exact?: boolean; fallback?: JourneyTab };

export const TAB_ROUTES: readonly TabRoute[] = [
  // Maswali — the home board, the board and every question.
  { prefix: "/", tab: "questions", exact: true },
  { prefix: "/markets", tab: "questions" },
  // MASWALI-BUILD S5-TAB (Ali, 2026-10-19; §M8a item 11): Millionea's tickets are Tiketi zangu's third kind — ⚠️ ABOVE
  // `/millionea`, whose row would claim them first — and every other Millionea page lights Millionea's own tab; where the
  // drawn tabs lack it (Millionea is not visible to this reader), Maswali, the tab whose home carries its card.
  { prefix: "/millionea/tickets", tab: "tickets" },
  { prefix: "/millionea", tab: "millionea", fallback: "questions" },
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

/** The tab a row lights among the drawn `tabs`: its own, its `fallback` when the drawn tabs lack its own, or none. */
export function rowTabIn(row: TabRoute | null, tabs: readonly JourneyTabDef[]): JourneyTab | null {
  if (row === null || row.tab === null) return null;
  if (tabs.some((d) => d.key === row.tab)) return row.tab;
  return row.fallback !== undefined && tabs.some((d) => d.key === row.fallback) ? row.fallback : null;
}

/** THE resolver: which of the drawn `tabs` this page belongs to, or null when none is lit. */
export function activeTabFor(pathname: string | null | undefined, tabs: readonly JourneyTabDef[]): JourneyTab | null {
  return rowTabIn(tabRouteFor(pathname), tabs);
}

/**
 * The tab's `aria-current` (A12), among the drawn `tabs`: "page" only on its own href, "true" when the page belongs to
 * its section, and nothing otherwise.
 */
export function tabAriaCurrent(pathname: string | null | undefined, tab: JourneyTab, tabs: readonly JourneyTabDef[]): "page" | "true" | undefined {
  if (activeTabFor(pathname, tabs) !== tab) return undefined;
  return tabs.some((d) => d.key === tab && d.href === pathname) ? "page" : "true";
}

/** A tab's label from a dictionary (`t`), or "" when the key is missing — `assertTabKeysResolve` keeps that from happening. */
export function tabLabel(t: unknown, key: TabLabelKey): string {
  let v: unknown = t;
  for (const part of key.split(".")) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined;
  return typeof v === "string" ? v : "";
}

/**
 * Everything that can be wrong with a table for a drawn list of tabs, as sentences (empty = sound): a row whose tab —
 * and fallback — no drawn tab owns, a tab no row reaches, a row an earlier row shadows, a tab whose own href lights
 * another tab, a duplicate, and — when the dictionaries are passed, keyed by locale — a label (or a rail label) missing
 * in a language.
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
    if (row.tab !== null && rowTabIn(row, tabs) === null) {
      problems.push(`row "${row.prefix}" names "${row.tab}", which no tab owns${row.fallback === undefined ? "" : `, nor its fallback "${row.fallback}"`}`);
    }
  }
  for (const d of tabs) {
    if (!rows.some((row) => rowTabIn(row, tabs) === d.key)) problems.push(`tab "${d.key}" is reached by no row`);
  }
  rows.forEach((row, i) => {
    const earlier = rows.slice(0, i).find((e) => routeMatches(row.prefix, e));
    if (earlier) problems.push(`row "${row.prefix}" is unreachable — "${earlier.prefix}" matches first`);
  });
  for (const d of tabs) {
    const got = rowTabIn(tabRouteIn(rows, d.href), tabs);
    if (got !== d.key) problems.push(`tab "${d.key}": its own href "${d.href}" resolves to ${got === null ? "no tab" : `"${got}"`}`);
  }
  if (dicts) {
    for (const [locale, t] of Object.entries(dicts)) {
      for (const d of tabs) {
        for (const key of d.railLabel === undefined ? [d.label] : [d.label, d.railLabel]) {
          if (!tabLabel(t, key).trim()) problems.push(`tab "${d.key}": label "${key}" is missing in ${locale}`);
        }
      }
    }
  }
  return problems;
}

/**
 * THE guard for THE table, given the real dictionaries keyed by locale — over BOTH drawn lists, the four tabs and the five
 * (each of the five's sentences says so). `test:journey-shell` §1 calls it (`1.guard`) and proves it reads the
 * dictionaries it is handed (`1.guard.c`); `red:journey-shell` plants one that ignores them.
 */
export function assertTabKeysResolve(dicts?: Readonly<Record<string, unknown>>): string[] {
  return [
    ...tabTableProblems(TAB_ROUTES, journeyTabsFor(false), dicts),
    ...tabTableProblems(TAB_ROUTES, journeyTabsFor(true), dicts).map((p) => `with Millionea's tab: ${p}`),
  ];
}
