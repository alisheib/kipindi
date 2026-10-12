/**
 * THE JOURNEY HOME'S LIST — which questions `/` shows a journey reader, in what order, under which chips, and how far
 * "Onyesha zaidi" has reached (the Vodacom plan S7: `docs/VODACOM-PLAN.md` SJ-6 and SJ-7; S7-PLAN WP3 step 1, amendment
 * A21). The home draws what these return; it decides none of it itself.
 *
 *   · `parseHomeParams` — the three things an address may ask for: `?cat` (a known category, else none), `?q` (trimmed
 *     and clamped to the product's one cap, `MAX_QUERY_LEN`) and `?page` (a positive whole number, else 1). A repeated
 *     parameter takes its first value (`oneParam`). An unknown value FALLS BACK: it never throws, and it is never passed
 *     through (`query/parse.ts`).
 *   · `homeBook` — the questions taking bets now, soonest-closing first by the instant BETTING closes
 *     (`cardClosesAtMs`: the selection's close, else the resolution), ties by the bigger pool, then by id, so the order
 *     holds across refreshes. The caller hands in the bet path's own test (`bettable`), so this module never reads a
 *     server.
 *   · `homeChips` — "Zote" (null), then the categories holding at least one question in the book: the deck's three first
 *     (Michezo, Hali ya hewa, Uchumi), then the rest in `MARKET_CATEGORIES` order. A category the address selected keeps
 *     its chip even when it holds none (the empty-category board draws it pressed), so a filter is never applied out of
 *     the reader's sight.
 *   · `homeView` — the book filtered by `cat` and by `q` (the caller's matcher, as `/live` matches MARKET_SEARCH), paged
 *     by `pageCumulative`, and which of the three empty states applies.
 *   · `pageCumulative` — THE paging rule, one for the home and journey `/live` (A21; Open point 12): page n shows the
 *     first perPage·n cards, `more` while any are left below, and a page past the end is the last page.
 *   · `homeHref` — `/` plus only the parameters that are set, always in the order cat, q, page.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports the query helpers, the category list and the close instant, none of which reaches
 * a server module (`test:client-graph-safe` pins this file). `test:journey-home` §2 holds every rule, and
 * `red:journey-home` plants a defect in each.
 */
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { cardClosesAtMs } from "@/lib/markets/card-close-label";
import { clampText, oneParam } from "@/lib/query/parse";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/** Next's `searchParams`: a repeated parameter arrives as an array. */
export type HomeSearch = Record<string, string | string[] | undefined>;

/** What the home's address asks for, every value already narrowed. */
export type HomeParams = {
  /** A known category, or null for "Zote". */
  cat: MarketCategory | null;
  /** The search, trimmed and clamped; "" when there is none. */
  q: string;
  /** The page asked for: a positive whole number, 1 when the address says nothing usable. */
  page: number;
};

/** What the home reads of a market row. A stored market carries all of it. */
export type HomeMarket = {
  id: string;
  category: string;
  yesPool: number;
  noPool: number;
  selectionClosedAt?: string | number | Date | null;
  resolutionAt?: string | number | Date | null;
};

/** A chip: a category, or null for "Zote" (no `?cat`). */
export type HomeChip = MarketCategory | null;

/** Which empty state the home draws: nothing takes bets ("book"), the category holds no open question ("cat"), or
 *  the category holds some and the search matched none of them ("q"). */
export type HomeEmpty = "book" | "cat" | "q";

export type HomeView<T> = {
  /** The cards on the page: the first perPage·page of the filtered list. */
  shown: T[];
  /** Cards are left below: "Onyesha zaidi" links to `page + 1`. */
  more: boolean;
  /** The page shown: the one asked for, or the last page when the address asked past the end. */
  page: number;
  /** How many questions the filters hold. */
  total: number;
  /** The empty state to draw, or null when there are cards. */
  empty: HomeEmpty | null;
};

/** The deck's three, first (SJ-7): Michezo, Hali ya hewa, Uchumi. */
export const HOME_CHIP_LEAD: readonly MarketCategory[] = ["sports", "weather", "macro"];

/** A page number as an address writes it: digits, no sign, no leading zero. */
const PAGE = /^[1-9][0-9]*$/;

/** The home's three parameters. `categories` is the closed set `?cat` is read against. */
export function parseHomeParams(
  sp: HomeSearch | null | undefined,
  categories: readonly MarketCategory[] = MARKET_CATEGORIES,
): HomeParams {
  const search: HomeSearch = sp ?? {};
  const rawCat = oneParam(search, "cat");
  const cat = typeof rawCat === "string" && (categories as readonly string[]).includes(rawCat) ? (rawCat as MarketCategory) : null;
  const q = clampText(oneParam(search, "q"), MAX_QUERY_LEN);
  const rawPage = oneParam(search, "page");
  // A number past the safe range is still a page past the end: `homeView` shows the last page for it.
  const page = typeof rawPage === "string" && PAGE.test(rawPage) ? Math.min(Number(rawPage), Number.MAX_SAFE_INTEGER) : 1;
  return { cat, q, page };
}

/** Both pools, as the order reads them: a pool that is not a number counts as nothing. */
const poolOf = (m: HomeMarket): number =>
  (Number.isFinite(m.yesPool) ? m.yesPool : 0) + (Number.isFinite(m.noPool) ? m.noPool : 0);

/**
 * The questions taking bets at `nowMs`, in the home's order: the instant betting closes, soonest first; then the
 * bigger pool; then the id. A new array: the caller's list is never reordered.
 */
export function homeBook<T extends HomeMarket>(
  markets: readonly T[],
  nowMs: number,
  bettable: (m: T, nowMs: number) => boolean,
): T[] {
  return markets
    .filter((m) => bettable(m, nowMs))
    .map((m) => ({ m, closes: cardClosesAtMs(m) ?? Number.POSITIVE_INFINITY, pool: poolOf(m) }))
    .sort((a, b) => (a.closes - b.closes) || (b.pool - a.pool) || (a.m.id < b.m.id ? -1 : a.m.id > b.m.id ? 1 : 0))
    .map((x) => x.m);
}

/** "Zote", then every category the book holds, the deck's three first; the selected category keeps its chip. */
export function homeChips(book: readonly HomeMarket[], selected: MarketCategory | null = null): HomeChip[] {
  const held = new Set<string>(book.map((m) => m.category));
  const order = [...HOME_CHIP_LEAD, ...MARKET_CATEGORIES.filter((c) => !HOME_CHIP_LEAD.includes(c))];
  return [null, ...order.filter((c) => held.has(c) || c === selected)];
}

/** THE paging rule (A21): page n shows the first perPage·n items; a page past the end is the last page. */
export function pageCumulative<T>(list: readonly T[], page: number, perPage: number): { shown: T[]; more: boolean; page: number } {
  const per = Number.isSafeInteger(perPage) && perPage > 0 ? perPage : 1;
  const last = Math.max(1, Math.ceil(list.length / per));
  const asked = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const at = Math.min(asked, last);
  const shown = list.slice(0, at * per);
  return { shown, more: shown.length < list.length, page: at };
}

/**
 * The home's list for `params`: the book in `cat`, then the questions `matches` accepts for `q` (asked only when a
 * search is set), paged by `pageCumulative`.
 */
export function homeView<T extends HomeMarket>(
  book: readonly T[],
  params: HomeParams,
  perPage: number,
  matches: (m: T, q: string) => boolean,
): HomeView<T> {
  const inCat = params.cat === null ? book.slice() : book.filter((m) => m.category === params.cat);
  const list = params.q === "" ? inCat : inCat.filter((m) => matches(m, params.q));
  const { shown, more, page } = pageCumulative(list, params.page, perPage);
  const empty: HomeEmpty | null = list.length > 0 ? null : inCat.length > 0 ? "q" : params.cat !== null ? "cat" : "book";
  return { shown, more, page, total: list.length, empty };
}

/** `/` plus only the parameters that are set, in the order cat, q, page. Page 1 is the home itself and is not written. */
export function homeHref(p: { cat?: MarketCategory | null; q?: string | null; page?: number | null }): string {
  const parts: string[] = [];
  if (p.cat && (MARKET_CATEGORIES as readonly string[]).includes(p.cat)) parts.push(`cat=${encodeURIComponent(p.cat)}`);
  const q = clampText(p.q, MAX_QUERY_LEN);
  if (q !== "") parts.push(`q=${encodeURIComponent(q)}`);
  if (typeof p.page === "number" && Number.isSafeInteger(p.page) && p.page > 1) parts.push(`page=${p.page}`);
  return parts.length > 0 ? `/?${parts.join("&")}` : "/";
}
