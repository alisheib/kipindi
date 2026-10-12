/**
 * WHERE A JOURNEY READER'S `/markets` GOES — the one target both of WP9's doors answer with (the Vodacom plan S7, §3.2;
 * S7-PLAN WP3 step 3, Open point 13, amendment A11). AppShell's document branch (a real 307) and the page's own redirect
 * (a flight) both call `journeyMarketsTarget`; nothing else decides the address. A classic reader's `/markets` never
 * comes here.
 *
 *   /markets with                                                  goes to
 *   nothing                                                        /
 *   topic=sports                                                   /?cat=sports
 *   topic=all, an unknown topic                                    /
 *   topic=sports&topic=macro                                       /?cat=sports (the first value, as `oneParam` reads it)
 *   cat=<a known id> and no topic                                  /?cat=<id>
 *   q                                                              kept, trimmed and clamped (MAX_QUERY_LEN), never half
 *                                                                  a character (an emoji the cap cuts in two is dropped)
 *   ref, invite                                                    kept in pending-bet's code shape
 *   utm_source, utm_medium, utm_campaign, utm_term, utm_content    kept in pending-bet's utm shape
 *   utm_id, gclid, gbraid, wbraid                                  kept in one token shape (GA's own list: GA_KEPT_PARAMS)
 *   side=YES or side=NO                                            kept (harmless on /; S11's auto-open reads it)
 *   bet, valid by parseBetParam                                    kept, written again by formatBetParam
 *   welcome=new or welcome=back                                    kept: the sign-up greeting (A11); other values dropped
 *   status=watch                                                   /watchlist, carrying cat, q and welcome only
 *   status, sort, dir, odds, pool, page, when, w, anything else    dropped
 *
 * The order is fixed: cat, q, side, bet, ref, invite, the utm keys, the click ids, then welcome. Every value is written
 * through `encodeURIComponent`.
 *
 * ⛔ ALWAYS A SAME-ORIGIN PATH, AND NO PATH RULE OF ITS OWN (A11 item 5). The target is built from two literals, "/" and
 * "/watchlist", plus encoded parameter values. Nothing the request carries is ever copied into the path, so there is no
 * test of a path's first characters here to drift from `safe-next.ts`, the one rule; `test:markets-redirect` asserts
 * `isSafePath` on every golden.
 *
 * ⛔ The search is read into a record WITHOUT a prototype: a crafted `?__proto__=` or `?constructor=` is an ordinary
 * key here, never a crash that turns a redirect into an error page.
 *
 * Pure and client-safe. It imports what A11 item 5 allows, `pending-bet.ts` (the bet grammar, the attribution reader and
 * its five utm keys) and the query helpers (`oneParam`, `clampText`, the search cap `MAX_QUERY_LEN`), plus ONE module
 * beyond that list's letter: `markets/categories.ts`. The table's `topic=<id>` and `cat=<id>` rows keep only a KNOWN
 * category, and the known categories are the platform's one list, which `categories.ts` holds and forbids anyone to
 * re-declare; it imports nothing itself, so it adds no module to this graph, and `parseHomeParams` reads `?cat` against
 * the same list. `test:markets-redirect` §1 holds the table and pins these four imports, and `red:markets-redirect`
 * plants a defect against each check.
 */
import { attributionFrom, formatBetParam, parseBetParam, UTM_KEYS } from "@/lib/journey/pending-bet";
import { MARKET_CATEGORIES, type MarketCategory } from "@/lib/markets/categories";
import { clampText, oneParam } from "@/lib/query/parse";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/** An `x-href` (path and query) or a search starting with "?"; `URLSearchParams`; or Next's `searchParams` record. */
export type MarketsSearch = string | URLSearchParams | Record<string, string | string[] | undefined>;

/** The five utm keys this table keeps: pending-bet's own list, the one its attribution reader keeps, never a second
 *  copy (`test:markets-redirect` 1.imports refuses one), in GA's order. */
export const KEPT_UTM_KEYS = UTM_KEYS;
/** The rest of GA's list: utm_id and the three click ids, each in the one token shape below. */
export const KEPT_CLICK_KEYS = ["utm_id", "gclid", "gbraid", "wbraid"] as const;
/** One token shape for the click ids: the URL's unreserved characters, 1 to 200 of them. */
const TOKEN = /^[A-Za-z0-9._~-]{1,200}$/;

/**
 * `?q` clamped as every search is (`clampText`: trimmed, then cut at `MAX_QUERY_LEN`), less any half character the cut
 * left. The cap counts UTF-16 units, so a pair (an emoji) standing across it is cut in two, and its first half alone
 * makes `encodeURIComponent` throw a URIError: AppShell's branch would turn a journey reader's /markets into an error
 * page (the WP9 review). The half is dropped, with any space the cut uncovered; a whole pair at the cap stays.
 * ⛔ Here and in `home-list.ts` (its twin, for the home's own reading and links), never in the shared `clampText`: every
 * classic board reads that helper, and none of them may move. `test:markets-redirect` 1.whole holds this one.
 */
function wholeQuery(raw: string | undefined): string {
  const q = clampText(raw, MAX_QUERY_LEN);
  const last = q.charCodeAt(q.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? q.slice(0, -1).trimEnd() : q;
}

type Search = Record<string, string | string[] | undefined>;

/** Every value of `p`, by key, in a record with no prototype. */
function fromParams(p: URLSearchParams): Search {
  const out = Object.create(null) as Record<string, string[]>;
  for (const [k, v] of p) {
    if (!out[k]) out[k] = [];
    out[k].push(v);
  }
  return out;
}

/** The search, whatever form it arrives in. A string's query is what follows its first "?", up to any "#". */
function toSearch(search: MarketsSearch | null | undefined): Search {
  if (typeof search === "string") {
    const bare = search.split("#")[0];
    const at = bare.indexOf("?");
    return fromParams(new URLSearchParams(at < 0 ? "" : bare.slice(at + 1)));
  }
  if (search instanceof URLSearchParams) return fromParams(search);
  return search ?? {};
}

const knownCategory = (v: string | undefined): MarketCategory | null =>
  typeof v === "string" && (MARKET_CATEGORIES as readonly string[]).includes(v) ? (v as MarketCategory) : null;

const write = (path: "/" | "/watchlist", parts: ReadonlyArray<readonly [string, string]>): string =>
  parts.length === 0 ? path : `${path}?${parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;

/** ⭐ THE TARGET of a journey reader's `/markets`: "/" or "/watchlist", plus only the parameters the table keeps. */
export function journeyMarketsTarget(search: MarketsSearch | null | undefined): string {
  const sp = toSearch(search);
  const one = (k: string) => oneParam(sp, k);
  const parts: Array<readonly [string, string]> = [];

  // The board's topic becomes the home's chip; a link that names no topic may already carry the chip's own `cat`.
  const topic = one("topic");
  const cat = topic !== undefined ? knownCategory(topic) : knownCategory(one("cat"));
  if (cat) parts.push(["cat", cat]);
  const q = wholeQuery(one("q"));
  if (q !== "") parts.push(["q", q]);
  const welcome = one("welcome");
  const greeting = welcome === "new" || welcome === "back" ? welcome : null;

  if (one("status") === "watch") {
    if (greeting) parts.push(["welcome", greeting]);
    return write("/watchlist", parts);
  }

  const side = one("side");
  if (side === "YES" || side === "NO") parts.push(["side", side]);
  const bet = parseBetParam(one("bet"));
  if (bet) parts.push(["bet", formatBetParam(bet)]);
  // ref, invite and the five utm keys: pending-bet's own reader, each in its own safe shape, first values only.
  const firsts = new URLSearchParams();
  for (const k of ["ref", "invite", ...UTM_KEYS]) {
    const v = one(k);
    if (typeof v === "string") firsts.set(k, v);
  }
  const attribution = attributionFrom(firsts);
  if (attribution.ref) parts.push(["ref", attribution.ref]);
  if (attribution.invite) parts.push(["invite", attribution.invite]);
  for (const k of UTM_KEYS) {
    const v = attribution.utm?.[k];
    if (v) parts.push([k, v]);
  }
  for (const k of KEPT_CLICK_KEYS) {
    const v = one(k);
    if (typeof v === "string" && TOKEN.test(v)) parts.push([k, v]);
  }
  if (greeting) parts.push(["welcome", greeting]);
  return write("/", parts);
}
