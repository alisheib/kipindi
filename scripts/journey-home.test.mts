/**
 * test:journey-home — THE HOME ON `/`, HELD BEFORE THE JOURNEY ARM IS BUILT BESIDE IT (the Vodacom plan S7: `docs/VODACOM-PLAN.md`
 * §3.2, "First commit of S7"; `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP2, amendment A10).
 *
 *   npm run test:journey-home     (in predeploy)
 *   npm run red:journey-home      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 *   §1 THE ROUTE FILE (S7 WP2, the pure move). Today's home body left `src/app/page.tsx` verbatim for
 *      `src/components/home/legacy-landing.tsx` (`LegacyLanding`), so the journey arm can later be added beside it without
 *      touching a classic line. The route keeps exactly what Next reads only from a route file:
 *        · `export const dynamic = "force-dynamic"` — "/" is rendered per request;
 *        · the metadata — `generateMetadata`, the tab title in the reader's language since round 4 of the visual pass —
 *          with "/" as its own canonical and the root layout's open graph SPREAD, never replaced: a partial `openGraph`
 *          once wiped og:image, og:locale, og:site_name and og:type from "/" (the note above `generateMetadata`);
 *        · `ROOT_OPEN_GRAPH` from "./layout", the layout's one definition;
 *      and its default export's one classic return is `<LegacyLanding searchParams={searchParams} />`. The body carries no
 *      directive (an async server component, as the route's body was), and the route is the only file that imports it.
 *   §2 THE HOME'S LIST (S7 WP3 step 1, amendment A21), `src/lib/journey/home-list.ts` driven in memory:
 *        · homeBook keeps what the caller's bet-path test accepts at the caller's clock, soonest-closing first by when
 *          BETTING closes, ties by the bigger pool, then by id, and never reorders the caller's list;
 *        · homeChips: Zote, the deck's three (Michezo, Hali ya hewa, Uchumi), then the rest; only the categories the
 *          book holds, plus the one the address selected;
 *        · parseHomeParams: cat known (against the caller's closed set) or none, q trimmed and clamped, page through
 *          parsePageParam, first values only; no search object at all is the plain home, never a crash;
 *        · parsePageParam, the ?page rule the home and journey /live share (A21 item 4): a positive whole number as an
 *          address writes it, else 1 (02 is 1);
 *        · pageCumulative (the home's and journey /live's one paging rule) and homeView: the filters, the paging, the
 *          clamp and the three empty states;
 *        · homeHref: only what is set, always cat, q, page, every value encoded.
 *   §3 THE CARD'S FACE (S7 WP3 step 2, amendment A12), `src/lib/journey/card-face.ts` over `cardEstimate`'s real figures:
 *      the S3 golden pools (Dodoma ≈2.8× / ≈1.4×, Yanga ≈2.9× / ≈1.4×); the canvas states (an empty pool, one side, over
 *      the cap with its thin side at ≈1.0×, a hidden figure for each of its three causes, closed); settled YES, NO and
 *      VOID with their inks; an Up & Down row, live and settled; the one-sided note; and A12's label and ink for every
 *      state.
 *      ⭐ Every §2 and §3 plant must fail ITS check and nothing else: the red run reports a plant that also turns another
 *      check red as not proved, so no check stays green only because a neighbour happens to catch its defect.
 *   §4 THE JOURNEY CARD (S7 WP5, amendments A12, A15, A16 and A24), `src/components/journey/cards/journey-card.tsx`:
 *      the real server component rendered in a test world — every state it draws (priced, closes today, Siku N, an
 *      empty pool, one side, over the cap with its thin side, a hidden figure, selection closed, one-sided and closed,
 *      settled YES / NO / void / never recorded / last year, Up & Down live and settled; sw, en and zh; the home's
 *      `from`, the similar rail's h3, a short title and the fallback) at a pinned clock — plus its source and its rules
 *      in globals.css. It holds: a server component no client module imports; every figure and word through WP3's
 *      rules, no percentage, pool or amount printed, none of the classic card's hooks or classes, no click handler; the
 *      links (one stretched card link named by the full title, and a card's only controls its links: three while it
 *      takes bets, one after; the picks' hrefs, `from=home` on the home only, never prefetched); the heading (its rung,
 *      `keepFigures`, balance by the last word of every rule that styles it, the clamp and its box on the fallback
 *      alone); the meta label's words, glyph and ink (A12); category · competition; each face's words and the figure's
 *      unit; THE WIDTH PROOF — every unit a pick prints, measured with the repo's own fonts against a 320 phone's pick
 *      line ("≈99.9×" kept whole with its words, "≈100.0×" breaking before them); the closed row; the settled row's
 *      instant and outcome chip; the refund sentence; the local stacking plane; the picks' press and lift and their edge
 *      in forced colours; the action block on the card's floor, and THE JOURNEY CARD GRID whose cards share their rows
 *      (A16 item 5, subgrid); and only the kit's tokens (A15's side word).
 *      ⭐ Every §4 plant must fail its own check ALONE too.
 *      ⚠️ The rules are read as the cascade reads them: a selector's value is the LAST one any rule gives it (a list of
 *      one or of several, under any at-rule), so a later rule cannot re-set the card behind a check's back.
 *   §5 THE HOW-TO CARD AND THE STATIC HOW-TO SHEET (S7 WP6, amendments A6, A13(a), A14, A15 and A24; Open points 18-21).
 *      Both RENDER in a test world (WP6's done-when): React's server renderer inside the i18n provider, in sw, en and zh,
 *      the sheet open signed in and out — the kit Modal stood in by one that draws its children in place, since the real
 *      one draws nothing until a browser mounts it. Read rendered and in source:
 *        · the card: a `<button aria-haspopup="dialog">` (never a link) with its test id, holding `open` and rendering the
 *          sheet; its royal plate (choice 3A) with no inline colour, its rule reading the primary material's three tokens
 *          (A14), its play glyph the kit's size for the plate (`plateGlyph(48)`, 24px); its words, with `{steps}` the
 *          sheet's own count and `{minutes}` its named constant;
 *        · the sheet: the kit's bottom sheet, 440 wide from 1024, on the default rung with the kit's ✕ and its test id; in
 *          §3.8's order (grab, title, the steps region holding the three steps and MFANO, the CTA, Weka mipaka); its title
 *          24px through `.kp-jsheet__title--lg` (A15); the side words through `sideWord`; every figure from HOW_TO_EXAMPLE
 *          through `estimateFor` and `{pct}` from `loserSharePct` — the sums `.amount`, the multiple one mono unit; NO
 *          helpline, by any name, in source or rendered (A6, A24 item 4); Weka mipaka's door by sign-in; the kit Button
 *          that closes it; nothing written to storage (Open point 18); the cap on the panel, in CSS, down a flex chain of
 *          its own (the panel, the sheet with `min-height: 0`), the steps region alone scrolling under a fade at the edges
 *          that hide something; MFANO the kit's info Callout, its eyebrow plain in zh;
 *        · the home's lazy module: client code, next/dynamic and the one lost-chunk guard, exactly its parts, each part's
 *          only loader among the home's files, imported by `journey-home.tsx` alone (WP7); and the sheet on test:popup-fit's
 *          review record.
 *      ⚠️ §5 stands in its own delimited block (its world, readers, checks and plants), after §4's; its stylesheet is read
 *      with §4's reader (`cssRules`, `declOf`), as the cascade reads it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY and requires the check named for it to fail.
 * §1's plants edit copies of the source text; §2's and §3's swap ONE rule (a function `home-list.ts` or `card-face.ts`
 * exports, or the `cardEstimate` the card's figures come through) for a copy of the real one carrying one defect; §4's
 * edit a copy of the card's source, of globals.css or of one rendered card (the world is rendered once, from the real
 * component); §5's edit a copy of the How-to card's, the sheet's or the lazy module's source, of globals.css, of
 * test:popup-fit's record or of one rendered card or sheet (rendered once, in §5's own test world). Nothing here
 * touches a file on disk, so `test:red-anchors` §4 counts it in the in-process class.
 * ⚠️ Every read is DECOMMENTED (`scripts/lib/decomment.mts`), so a rule quoted in a note is never mistaken for the rule.
 * ⚠️ This file carries no escape a tool could decode on its way to disk: line breaks are built from their code points, and
 * its patterns use look-arounds and character classes, never a word boundary.
 */
import { existsSync, readFileSync } from "node:fs";
import NodeModule, { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { srcFiles } from "./lib/tracked-files.mts";
import * as HL from "../src/lib/journey/home-list.ts";
import * as CF from "../src/lib/journey/card-face.ts";
import { cardEstimate, pickEstimateRates, type Estimate } from "../src/lib/markets/estimate.ts";
import { MARKET_CATEGORIES } from "../src/lib/markets/categories.ts";
import { MAX_QUERY_LEN } from "../src/lib/search/query.ts";
import { JourneyCard, type JourneyCardMarket } from "../src/components/journey/cards/journey-card.tsx";
import { I } from "../src/components/ui/glyphs.tsx";
import { dict, type Locale } from "../src/lib/i18n-dict.ts";
import { formatEatDateTime } from "../src/lib/eat-day.ts";
import { DEFAULT_GLOBAL_CONFIG, snapshotFromConfig } from "../src/lib/server/market-config.ts";
import { IS_POPUP, reviewGaps, reviewedIn } from "./lib/popup-review.mts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const PAGE = "src/app/page.tsx";
const LANDING = "src/components/home/legacy-landing.tsx";
const LAYOUT = "src/app/layout.tsx";
/** §4 · the journey card (S7 WP5) and the stylesheet that holds its rules. */
const CARD = "src/components/journey/cards/journey-card.tsx";
const CSS = "src/app/globals.css";

/** A file's text with CRLF read as LF (this machine checks files out as CRLF). A missing file reads as "", which §1 reports. */
const read = (rel: string) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF) : "");
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);

/** The pure rules §2 and §3 drive (S7 WP3). A §2 or §3 plant swaps one of them for a copy carrying one defect. */
type Rules = {
  parse: typeof HL.parseHomeParams;
  pageParam: typeof HL.parsePageParam;
  book: typeof HL.homeBook;
  chips: typeof HL.homeChips;
  pages: typeof HL.pageCumulative;
  view: typeof HL.homeView;
  href: typeof HL.homeHref;
  face: typeof CF.cardFace;
  /** The figure each pick reads (`cardEstimate`, what `cardFigures` calls), so a plant can break the hidden causes. */
  estimate: typeof cardEstimate;
};
const RULES: Rules = {
  parse: HL.parseHomeParams, pageParam: HL.parsePageParam, book: HL.homeBook, chips: HL.homeChips, pages: HL.pageCumulative,
  view: HL.homeView, href: HL.homeHref, face: CF.cardFace, estimate: cardEstimate,
};

/** Everything the checks read. The red run plants on copies of it. */
type World = {
  page: string;                  // src/app/page.tsx
  landing: string;               // src/components/home/legacy-landing.tsx
  layout: string;                // src/app/layout.tsx, where ROOT_OPEN_GRAPH is defined
  walked: number;                // how many files under src/ the importer census walked
  naming: Map<string, string>;   // every OTHER file under src/ whose text names legacy-landing: the census's subjects
  rules: Rules;                  // §2 and §3: the home's list and the card's face, as the modules export them
  card: string;                  // §4: src/components/journey/cards/journey-card.tsx
  css: string;                   // §4: src/app/globals.css, where the card's rules and tokens live
  cardNaming: Map<string, string>; // §4: every OTHER file under src/ whose text names journey-card: the importer census
  renders: Renders;              // §4: the card's test world, each case rendered once from the real component
  gutter: number | null;         // §4: a phone page's side gutter — PageContainer's house padding (px-3) on the house scale
  howto: HowToWorld;             // §5 (S7 WP6): the How-to card, the sheet, the home's lazy module — and what they render
};

/** §4's frame: the house padding every page container lays (`px-3` below lg), and the house scale's step 3. */
const CONTAINER = "src/components/layout/page-container.tsx";
const TAILWIND = "tailwind.config.ts";
function pageGutter(): number | null {
  if (!decomment(read(CONTAINER)).includes('pad === "page" && "px-3 lg:px-6 py-6"')) return null;
  const step = /"3":[ ]*"([0-9]+)px"/.exec(decomment(read(TAILWIND)));
  return step ? Number(step[1]) : null;
}

function load(): World {
  const all = srcFiles();
  const naming = new Map<string, string>();
  const cardNaming = new Map<string, string>();
  for (const rel of all) {
    if (rel === PAGE || rel === LANDING || rel === CARD) continue;
    const s = read(rel);
    if (s.includes("legacy-landing")) naming.set(rel, s);
    if (s.includes("journey-card")) cardNaming.set(rel, s);
  }
  return {
    page: read(PAGE), landing: read(LANDING), layout: read(LAYOUT), walked: all.length, naming, rules: RULES,
    card: read(CARD), css: read(CSS), cardNaming, renders: renderCards(), gutter: pageGutter(), howto: loadHowTo(all),
  };
}

type Ok = (label: string, cond: boolean, extra?: string) => void;

/* ── §2 · the home's list (S7 WP3 step 1, A21) ─────────────────────────────────────────────────────────────── */
const T0 = Date.UTC(2026, 9, 12, 7, 0);   // 10:00 in East Africa, 12 October 2026
const HOUR = 3_600_000;
const at = (h: number) => new Date(T0 + h * HOUR).toISOString();
/** A home row, with the caller's bet-path answer (`open`) and a title for the search matcher. */
type Row = HL.HomeMarket & { open: boolean; title: string };
const row = (id: string, category: string, resolvesInH: number, pool: number, o: { selectionClosesInH?: number; open?: boolean; title?: string } = {}): Row => ({
  id, category, yesPool: Math.floor(pool / 2), noPool: pool - Math.floor(pool / 2),
  resolutionAt: at(resolvesInH), selectionClosedAt: o.selectionClosesInH === undefined ? null : at(o.selectionClosesInH),
  open: o.open ?? true, title: o.title ?? id,
});
/** The caller's bet-path test, as WP7 hands it in: the row's own answer, and only at the caller's clock. */
const takesBets = (m: Row, now: number) => now === T0 && m.open;
const ids = (list: readonly { id: string }[]) => list.map((m) => m.id);
/** f's selection closes in 1 hour though it resolves in 120; c and d tie on the instant AND the pool (id decides); a, c and
 *  d tie on the instant (the pool decides); e takes no bets; g holds the biggest pool and closes last. */
const BOOK_IN: readonly Row[] = [
  row("mkt_g", "other", 4, 90_000),
  row("mkt_a", "sports", 3, 10_000),
  row("mkt_e", "macro", 0.5, 99_999, { open: false }),
  row("mkt_c", "weather", 3, 30_000),
  row("mkt_d", "macro", 3, 30_000),
  row("mkt_b", "sports", 2, 5_000),
  row("mkt_f", "crypto", 120, 1_000, { selectionClosesInH: 1 }),
];
const BOOK_GOLDEN = ["mkt_f", "mkt_b", "mkt_c", "mkt_d", "mkt_a", "mkt_g"];
const VIEW_BOOK: readonly Row[] = [
  row("mkt_v1", "sports", 5, 3_000, { title: "Simba v Yanga" }),
  row("mkt_v2", "sports", 6, 2_000, { title: "Azam v Namungo" }),
  row("mkt_v3", "weather", 7, 1_000, { title: "Yanga day rain" }),
];

function homeListChecks(r: Rules, ok: Ok) {
  const book = r.book(BOOK_IN.slice(), T0, takesBets);
  ok("2.book.keeps · homeBook keeps the questions the caller's bet-path test accepts at the caller's clock, and only those (one that takes no bets is left for /live)",
    j(ids(book).slice().sort()) === j(BOOK_GOLDEN.slice().sort()), j(ids(book)));
  const golden = new Set(BOOK_GOLDEN);
  const order = ids(book).filter((id) => golden.has(id));
  ok("2.book.order · soonest-closing first by when BETTING closes (a selection closing in 1 hour leads a resolution in 2), equal instants by the bigger pool: f, b, c, d, a, g",
    j(order) === j(BOOK_GOLDEN), j(order));
  const mine = BOOK_IN.slice().reverse();
  const before = j(ids(mine));
  const again = ids(r.book(mine, T0, takesBets));
  ok("2.book.stable · the same book in another input order gives the same order (a full tie, same instant and pool, goes by id), and the caller's list is never reordered",
    j(again) === j(ids(book)) && j(ids(mine)) === before, j({ again, first: ids(book), callerAfter: ids(mine) }));

  const holding = (...cats: string[]) => cats.map((c, i) => row(`mkt_k${i}`, c, 5, 1_000));
  const every = r.chips(holding("other", "tech", "culture", "crypto", "macro", "weather", "sports"));
  ok("2.chips.order · Zote first, then the deck's three (Michezo, Hali ya hewa, Uchumi), then the rest in the platform's order",
    j(every) === j([null, "sports", "weather", "macro", "crypto", "culture", "tech", "other"]), j(every));
  const some = r.chips(holding("macro", "other", "sports", "macro", "politics")), none = r.chips([]);
  ok("2.chips.held · a chip only for a category the book holds (an unknown category gets none), and an empty book is Zote alone",
    j(some) === j([null, "sports", "macro", "other"]) && j(none) === j([null]), j({ some, none }));
  const sm = holding("sports", "macro");
  const picked = r.chips(sm, "crypto"), pickedHeld = r.chips(sm, "sports");
  ok("2.chips.selected · the category the address selected keeps its chip, in its place, though it holds no question (a filter is never applied out of sight); selecting a held one adds nothing",
    picked.includes("crypto") && picked.indexOf("crypto") > picked.indexOf("macro") && j(pickedHeld) === j(r.chips(sm)), j({ picked, pickedHeld }));

  const P = (sp: HL.HomeSearch) => r.parse(sp, MARKET_CATEGORIES);
  const NARROW = ["sports"] as const;
  const cats = [P({ cat: "sports" }).cat, P({ cat: "politics" }).cat, P({ cat: "all" }).cat, P({ cat: "Sports" }).cat, P({ cat: "" }).cat, P({}).cat,
    r.parse({ cat: "macro" }, NARROW).cat, r.parse({ cat: "sports" }, NARROW).cat];
  ok("2.parse.cat · ?cat is a known category or none: sports is kept; politics, all, Sports, an empty value and no value are none; against a caller's narrower set (sports alone) macro is none and sports is kept",
    j(cats) === j(["sports", null, null, null, null, null, null, "sports"]), j(cats));
  const absent = ([null, undefined] as const).map((sp) => {
    try { return j(r.parse(sp, MARKET_CATEGORIES)); } catch (e) { return `threw: ${(e as Error).message}`; }
  });
  ok("2.parse.absent · no search object at all (null or undefined) is the plain home, Zote with no search on page 1, never a crash",
    j(absent) === j([j({ cat: null, q: "", page: 1 }), j({ cat: null, q: "", page: 1 })]), j(absent));
  const qs = [P({ q: "  simba yanga  " }).q, P({ q: "y".repeat(300) }).q.length, P({}).q];
  ok(`2.parse.q · ?q is trimmed and clamped to the product's one cap (${MAX_QUERY_LEN}); no q is ""`,
    j(qs) === j(["simba yanga", MAX_QUERY_LEN, ""]), j(qs));
  const pagesIn = ["3", undefined, "0", "-2", "2.5", "2abc", "02", "abc", "5000", "99999999999999999999"];
  const pagesOut = pagesIn.map((p) => P(p === undefined ? {} : { page: p }).page);
  ok("2.parse.page · ?page is a positive whole number as an address writes it, else 1 (none, 0, -2, 2.5, 2abc, 02, abc); a huge one stays past the end for the view to clamp",
    j(pagesOut) === j([3, 1, 1, 1, 1, 1, 1, 1, 5000, Number.MAX_SAFE_INTEGER]), j(pagesOut));
  const arr = P({ cat: ["sports", "macro"], q: ["first", "second"], page: ["4", "9"] });
  ok("2.parse.array · a repeated parameter takes its FIRST value, as every reader in the product does (oneParam): cat, q and page",
    j(arr) === j({ cat: "sports", q: "first", page: 4 }), j(arr));
  const rawPages: unknown[] = ["7", "1", "02", "0", "-3", "+3", "3.0", "4abc", " 5", "", undefined, null, 5, ["2"], "99999999999999999999"];
  const rulePages = rawPages.map((v) => r.pageParam(v));
  ok("2.page.rule · parsePageParam, the ?page rule the home and journey /live share (A21 item 4): a positive whole number as an address writes it, else 1; 02, 0, a sign, 3.0, a suffix, a space, an empty value, none, a number and an array are 1; a huge one stays past the end",
    j(rulePages) === j([7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, Number.MAX_SAFE_INTEGER]), j(rulePages));

  const L30 = Array.from({ length: 30 }, (_, i) => i), L24 = L30.slice(0, 24);
  const pg = (list: number[], page: number) => { const x = r.pages(list, page, 12); return [x.shown.length, x.shown[0] ?? null, x.more, x.page]; };
  const paged = [pg(L30, 1), pg(L30, 2), pg(L30, 3), pg(L30, 9), pg(L24, 2), pg([], 3), ...[0, -1, 2.5, Number.NaN].map((p) => pg(L30, p))];
  ok("2.pages · pageCumulative, the home's and journey /live's one rule: page n shows the FIRST 12·n cards; more while any are left (none at an exact end); past the end is the last page; 0, -1, 2.5 and NaN are page 1",
    j(paged) === j([[12, 0, true, 1], [24, 0, true, 2], [30, 0, false, 3], [30, 0, false, 3], [24, 0, false, 2], [0, null, false, 1],
      [12, 0, true, 1], [12, 0, true, 1], [12, 0, true, 1], [12, 0, true, 1]]), j(paged));

  let asked = 0;
  const match = (m: Row, s: string) => { asked += 1; return m.title.toLowerCase().includes(s.toLowerCase()); };
  const f1 = ids(r.view(VIEW_BOOK, { cat: "sports", q: "yanga", page: 1 }, 12, match).shown);
  const f2 = ids(r.view(VIEW_BOOK, { cat: null, q: "yanga", page: 1 }, 12, match).shown);
  const askedBefore = asked;
  const f3 = ids(r.view(VIEW_BOOK, { cat: "weather", q: "", page: 1 }, 12, match).shown);
  ok("2.view.filter · homeView keeps the chosen category and what the caller's matcher accepts for q (sports and yanga is Simba v Yanga alone), and asks no matcher without a search",
    j([f1, f2, f3]) === j([["mkt_v1"], ["mkt_v1", "mkt_v3"], ["mkt_v3"]]) && asked === askedBefore, j({ f1, f2, f3, askedWithoutSearch: asked - askedBefore }));
  const B30 = Array.from({ length: 30 }, (_, i) => row(`mkt_p${String(i).padStart(2, "0")}`, "sports", 5 + i, 1_000));
  const v2 = r.view(B30, { cat: null, q: "", page: 2 }, 12, match), v9 = r.view(B30, { cat: null, q: "", page: 9 }, 12, match);
  const views = [v2.shown.length, v2.shown[0]?.id ?? null, v2.more, v2.page, v2.total, v9.shown.length, v9.more, v9.page];
  ok("2.view.paged · homeView pages through the one rule: page 2 of 30 shows the first 24 with more below; page 9 is page 3, all 30, nothing more",
    j(views) === j([24, "mkt_p00", true, 2, 30, 30, false, 3]), j(views));
  const E = (b: readonly Row[], cat: HL.HomeParams["cat"], q: string) => r.view(b, { cat, q, page: 1 }, 12, match).empty;
  const empties = [E([], null, ""), E(VIEW_BOOK, "crypto", ""), E(VIEW_BOOK, null, "zzz"), E(VIEW_BOOK, "sports", ""), E([], "crypto", "zzz")];
  ok("2.view.empty · which empty state: nothing takes bets is book; a category holding none is cat, with or without a search; a search that matched none of the questions is q; cards are none",
    j(empties) === j(["book", "cat", "q", null, "cat"]), j(empties));

  const hrefs = [
    r.href({}), r.href({ cat: null, q: "", page: 1 }), r.href({ cat: "sports" }), r.href({ cat: "sports", q: "simba yanga", page: 3 }),
    r.href({ page: 2, q: "a&b=c#d", cat: "macro" }), r.href({ q: "x", page: 1 }), r.href({ page: 0 }), r.href({ page: 2.5 }),
    r.href({ q: "   " }), r.href({ cat: "politics" as never }),
  ];
  ok("2.href · / plus only what is set, always cat, q, page; page 1 is the home itself; every value encoded, so an ampersand, an equals sign or a hash adds no parameter",
    j(hrefs) === j(["/", "/", "/?cat=sports", "/?cat=sports&q=simba%20yanga&page=3", "/?cat=macro&q=a%26b%3Dc%23d&page=2", "/?q=x", "/", "/", "/", "/"]),
    j(hrefs));
}

/* ── §3 · the card's face (S7 WP3 step 2, A12) ──────────────────────────────────────────────────────────────── */
/** The deck's rates: 13% loser-share (3% platform + 10% operator), and a legacy capped-commission poll. */
const LS13 = { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, showEstimatedWinnings: true } as const;
const CAPPED = { feeModel: "capped-commission", commissionRate: 0.10, feeCeilingRate: 1 / 3, showEstimatedWinnings: true } as const;
const DAYS = { kind: "days", n: 3 } as const;
type FaceOpts = { bettable?: boolean; rates?: object | null; productLine?: string; status?: string; outcome?: string | null; close?: CF.CardFaceInput["close"] };
/** cardFace's input exactly as WP5's card builds it: the figures through `estimate`, the rules' `cardEstimate` (what
 *  `cardFigures` calls). No `rates` is the deck's 13%; `rates: null` is a market with no rates at all. */
function faceInput(estimate: typeof cardEstimate, yes: number, no: number, o: FaceOpts = {}): CF.CardFaceInput {
  const bettable = o.bettable ?? true;
  const productLine = o.productLine ?? "MARKET";
  const rates = o.rates === null ? null : pickEstimateRates((o.rates ?? LS13) as never);
  const m = { yesPool: yes, noPool: no, productLine };
  return {
    productLine, status: o.status ?? "LIVE", resolvedOutcome: o.outcome ?? null, bettable,
    estimates: { YES: estimate(m, rates, "YES", bettable), NO: estimate(m, rates, "NO", bettable) },
    close: o.close === undefined ? DAYS : o.close,
  };
}

function cardFaceChecks(r: Rules, ok: Ok) {
  const F = (yes: number, no: number, o: FaceOpts = {}) => r.face(faceInput(r.estimate, yes, no, o));
  const open = (yes: CF.PickFace, no: CF.PickFace) => j({ kind: "open", YES: yes, NO: no });
  const win = (mult: string): CF.PickFace => ({ kind: "win", mult });
  const dodoma = F(24_825, 50_462).picks, yanga = F(20_000, 43_700).picks;
  ok("3.golden · the S3 golden pools: Dodoma reads ≈2.8× / ≈1.4× and Yanga ≈2.9× / ≈1.4×, each pick a win line",
    j(dodoma) === open(win("2.8"), win("1.4")) && j(yanga) === open(win("2.9"), win("1.4")), j({ dodoma, yanga }));
  const empty = F(0, 0).picks;
  ok("3.empty · an empty pool: both picks say Kuwa wa kwanza, never a figure", j(empty) === open({ kind: "beFirst" }, { kind: "beFirst" }), j(empty));
  const oneYes = F(5_000, 0).picks, oneNo = F(0, 7_000).picks;
  ok("3.oneside · money on one side only: that side says Upande mmoja tu, and the empty side Kuwa wa kwanza",
    j(oneYes) === open({ kind: "oneSide" }, { kind: "beFirst" }) && j(oneNo) === open({ kind: "beFirst" }, { kind: "oneSide" }), j({ oneYes, oneNo }));
  const over = F(1_000, 200_000).picks;
  ok("3.overcap · over the cap: the small side says Upande mdogo with NO number, and its thin other side Faida ndogo ≈1.0×",
    j(over) === open({ kind: "overCap" }, { kind: "thin", mult: "1.0" }), j(over));
  const legacy = F(24_825, 50_462, { rates: CAPPED }).picks;
  const switchedOff = F(24_825, 50_462, { rates: { ...LS13, showEstimatedWinnings: false } }).picks;
  const noRates = F(24_825, 50_462, { rates: null }).picks;
  ok("3.legacy · a hidden figure, for each of its three causes, prints no number, each pick its side word alone: a legacy capped-commission market, a two-sided pool whose display switch is off, and a market with no rates",
    [legacy, switchedOff, noRates].every((p) => j(p) === open({ kind: "word" }, { kind: "word" })), j({ legacy, switchedOff, noRates }));
  const closed = F(24_825, 50_462, { bettable: false }).picks;
  ok("3.closed · a market that takes no bets now is the one closed row, with no control", j(closed) === j({ kind: "closed" }), j(closed));
  const settled = ([["RESOLVED", "YES"], ["RESOLVED", "NO"], ["VOIDED", "VOID"], ["VOIDED", null], ["RESOLVED", null], ["RESOLVED", "MAYBE"]] as const)
    .map(([status, outcome]) => F(24_825, 50_462, { status, outcome, bettable: false }).picks);
  ok("3.settled · settled YES takes the YES ink, NO the NO ink and a void the neutral ink (one-sided 8.10); a VOIDED market with no stamp is a void; a verdict never recorded names no side",
    j(settled) === j([
      { kind: "settled", outcome: "YES", ink: "yes" }, { kind: "settled", outcome: "NO", ink: "no" },
      { kind: "settled", outcome: "VOID", ink: "neutral" }, { kind: "settled", outcome: "VOID", ink: "neutral" },
      { kind: "settled", outcome: null, ink: "neutral" }, { kind: "settled", outcome: null, ink: "neutral" },
    ]), j(settled));
  const udLive = F(5_000, 3_000, { productLine: "UPDOWN" }).picks;
  const udSettled = F(5_000, 3_000, { productLine: "UPDOWN", status: "RESOLVED", outcome: "YES", bettable: false }).picks;
  ok("3.updown · an Up & Down row: live, each pick is the product's side word alone (it has no estimate); settled, its outcome in that outcome's ink",
    j(udLive) === open({ kind: "word" }, { kind: "word" }) && j(udSettled) === j({ kind: "settled", outcome: "YES", ink: "yes" }), j({ udLive, udSettled }));
  const notes = [
    F(5_000, 0), F(0, 7_000), F(5_000, 0, { bettable: false }), F(5_000, 0, { rates: { ...LS13, showEstimatedWinnings: false } }),
    F(0, 0), F(24_825, 50_462), F(5_000, 0, { status: "RESOLVED", outcome: "YES", bettable: false }), F(5_000, 0, { productLine: "UPDOWN" }),
  ].map((f) => f.oneSidedNote);
  ok("3.note · an unsettled one-sided pool names its EMPTY side for the refund sentence, the closed phase and a display switch turned off included; an empty pool, a two-sided one, a settled card and an Up & Down row carry none",
    j(notes) === j(["NO", "YES", "NO", "NO", null, null, null, null]), j(notes));
  const metas = [
    F(24_825, 50_462, { close: { kind: "today" } }), F(24_825, 50_462, { close: DAYS }), F(24_825, 50_462, { close: { kind: "closed" } }),
    F(24_825, 50_462, { bettable: false, close: DAYS }), F(24_825, 50_462, { status: "RESOLVED", outcome: "YES", bettable: false }),
    F(24_825, 50_462, { status: "VOIDED", outcome: "VOID", bettable: false }), F(24_825, 50_462, { close: null }),
  ].map((f) => f.meta);
  ok("3.meta · A12's label and ink: closes today and waiting are muted; Siku N, settled and void stay subtle; a market that takes no bets is waiting whatever its clock says; no closing instant is no label",
    j(metas) === j([
      { kind: "today", emphasis: "muted" }, { kind: "days", emphasis: "subtle" }, { kind: "waiting", emphasis: "muted" },
      { kind: "waiting", emphasis: "muted" }, { kind: "settled", emphasis: "subtle" }, { kind: "void", emphasis: "subtle" }, null,
    ]), j(metas));
}

/* ── §4 · the journey card (S7 WP5, A12, A15, A16, A24) ───────────────────────────────────────────────────────── */
/** The no-break space the card joins a figure to its unit with (built from its code point, as the card builds it). */
const NBSP = String.fromCharCode(160);
const DAY_H = 24;
/** The deck's rates, frozen onto a market as `createMarket` freezes them: 13% loser-share. */
const LS13_SNAP = snapshotFromConfig({ ...DEFAULT_GLOBAL_CONFIG, feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 });
/** A market row as a surface holds it: the deck's Dodoma question at 13%, taking bets, closing in 11 East Africa days. */
const cardRow = (id: string, o: Partial<JourneyCardMarket> = {}): JourneyCardMarket => ({
  id, titleEn: "Will Dodoma see rain on 1 October?", titleSw: "Je, Dodoma itapata mvua tarehe 1 Oktoba?", titleZh: "多多马10月1日会下雨吗？",
  shortTitleEn: null, shortTitleSw: null, shortTitleZh: null, category: "weather", competition: null,
  status: "LIVE", resolvedOutcome: null, yesPool: 24_825, noPool: 50_462, feeSnapshot: LS13_SNAP, productLine: "MARKET",
  selectionClosedAt: null, resolutionAt: at(11 * DAY_H), settledAt: null, ...o,
});
type CardCase = { m: JourneyCardMarket; locale?: Locale; heading?: "h2" | "h3"; from?: "home"; roundId?: string | null };
/** THE TEST WORLD — every state the card draws, at the render clock T0 (10:00 in East Africa, 12 October 2026). */
const CARD_WORLD = {
  priced: { m: cardRow("mkt_jcPriced") },
  home: { m: cardRow("mkt_jcHome"), from: "home" },
  pricedEn: { m: cardRow("mkt_jcEn"), locale: "en" },
  pricedZh: { m: cardRow("mkt_jcZh"), locale: "zh" },
  today: { m: cardRow("mkt_jcToday", { resolutionAt: at(6) }) },
  closed: { m: cardRow("mkt_jcClosed", { selectionClosedAt: at(-1), resolutionAt: at(2 * DAY_H) }) },
  settledYes: { m: cardRow("mkt_jcYes", { status: "RESOLVED", resolvedOutcome: "YES", resolutionAt: at(-30), settledAt: at(-26) }) },
  settledNo: { m: cardRow("mkt_jcNo", { status: "RESOLVED", resolvedOutcome: "NO", resolutionAt: at(-30), settledAt: at(-26) }) },
  lastYear: { m: cardRow("mkt_jcOld", { status: "RESOLVED", resolvedOutcome: "YES", resolutionAt: "2025-12-30T09:00:00.000Z", settledAt: "2025-12-30T12:00:00.000Z" }) },
  void: { m: cardRow("mkt_jcVoid", { status: "VOIDED", resolvedOutcome: "VOID", resolutionAt: at(-30) }) },
  unrecorded: { m: cardRow("mkt_jcBlank", { status: "RESOLVED", resolvedOutcome: null, resolutionAt: at(-30), settledAt: at(-26) }) },
  oneSided: { m: cardRow("mkt_jcOne", { yesPool: 5_000, noPool: 0 }) },
  oneSidedClosed: { m: cardRow("mkt_jcOneShut", { yesPool: 5_000, noPool: 0, selectionClosedAt: at(-1), resolutionAt: at(2 * DAY_H) }) },
  empty: { m: cardRow("mkt_jcEmpty", { yesPool: 0, noPool: 0 }) },
  overCap: { m: cardRow("mkt_jcCap", { yesPool: 1_000, noPool: 200_000 }) },
  overCapEn: { m: cardRow("mkt_jcCapEn", { yesPool: 1_000, noPool: 200_000 }), locale: "en" },
  overCapZh: { m: cardRow("mkt_jcCapZh", { yesPool: 1_000, noPool: 200_000 }), locale: "zh" },
  legacy: { m: cardRow("mkt_jcLegacy", { feeSnapshot: null }) },
  updownLive: { m: cardRow("mkt_jcUd", { productLine: "UPDOWN", category: "crypto", yesPool: 5_000, noPool: 3_000 }), roundId: "rnd_jcLive" },
  updownNoRound: { m: cardRow("mkt_jcUdNone", { productLine: "UPDOWN", category: "crypto" }), roundId: null },
  updownElsewhere: { m: cardRow("mkt_jcUdElse", { productLine: "UPDOWN", category: "crypto" }) },
  updownSettled: { m: cardRow("mkt_jcUdDone", { productLine: "UPDOWN", category: "crypto", status: "RESOLVED", resolvedOutcome: "YES", resolutionAt: at(-2), settledAt: at(-1) }) },
  short: { m: cardRow("mkt_jcShort", { shortTitleSw: "Je, Dodoma itanyesha kesho?" }), heading: "h3" },
  competition: { m: cardRow("mkt_jcComp", { category: "sports", competition: "ligi-kuu" }) },
  oddCompetition: { m: cardRow("mkt_jcOdd", { category: "sports", competition: "ligi-ya-mwezini" }) },
  /* The widest figures a pick prints (4.picks.fit): at 13% a YES pool of 1,000 against 113,700 reads ≈99.9× (the longest
     four-character figure) and against 113,800 ≈100.0× — which the engine still prints, withholding only a figure ABOVE
     its cap (`estimate.ts`). */
  cap999: { m: cardRow("mkt_jcW999", { yesPool: 1_000, noPool: 113_700 }) },
  cap999En: { m: cardRow("mkt_jcW999En", { yesPool: 1_000, noPool: 113_700 }), locale: "en" },
  cap999Zh: { m: cardRow("mkt_jcW999Zh", { yesPool: 1_000, noPool: 113_700 }), locale: "zh" },
  cap100: { m: cardRow("mkt_jcW100", { yesPool: 1_000, noPool: 113_800 }) },
  cap100En: { m: cardRow("mkt_jcW100En", { yesPool: 1_000, noPool: 113_800 }), locale: "en" },
  cap100Zh: { m: cardRow("mkt_jcW100Zh", { yesPool: 1_000, noPool: 113_800 }), locale: "zh" },
} satisfies Record<string, CardCase>;
type CardName = keyof typeof CARD_WORLD;
type Renders = Record<CardName, string>;
const CARD_NAMES = Object.keys(CARD_WORLD) as CardName[];
const caseOf = (n: CardName): CardCase => CARD_WORLD[n];
/** The cards that take bets now (two picks), and the ones that do not (a closed or a result row). */
const OPEN_CARDS: CardName[] = ["priced", "home", "pricedEn", "pricedZh", "today", "oneSided", "empty", "overCap", "overCapEn",
  "overCapZh", "legacy", "updownLive", "updownNoRound", "updownElsewhere", "short", "competition", "oddCompetition",
  "cap999", "cap999En", "cap999Zh", "cap100", "cap100En", "cap100Zh"];
const CLOSED_CARDS: CardName[] = ["closed", "oneSidedClosed"];
const SETTLED_CARDS: CardName[] = ["settledYes", "settledNo", "lastYear", "void", "unrecorded", "updownSettled"];

/**
 * The world, rendered ONCE from the real component, on the server, at the render clock T0. ⚠️ The wall clock is pinned
 * to T0 for the render too: the bet test's selection half (`isSelectionClosed`, inside `cardFigures`) reads it, as the
 * bet path does, so an unpinned run would grade the cards against whatever moment it ran at.
 */
function renderCards(): Renders {
  const wall = Date.now;
  Date.now = () => T0;
  try {
    const out = {} as Renders;
    for (const n of CARD_NAMES) {
      const c = caseOf(n), locale = c.locale ?? "sw";
      out[n] = renderToStaticMarkup(h(JourneyCard, { m: c.m, nowMs: T0, t: dict[locale], locale, heading: c.heading, from: c.from, roundId: c.roundId }));
    }
    return out;
  } finally {
    Date.now = wall;
  }
}

/** The served markup's five entities, read back as text. */
const ENTITIES: Array<[string, string]> = [["&lt;", "<"], ["&gt;", ">"], ["&quot;", '"'], ["&#x27;", "'"], ["&amp;", "&"]];
const decodeHtml = (s: string) => ENTITIES.reduce((acc, [e, c]) => acc.split(e).join(c), s);
const textOf = (html: string) => decodeHtml(html.replace(/<[^>]*>/g, ""));
const attrOf = (attrs: string, name: string) => { const m = new RegExp(`(?:^| )${name}="([^"]*)"`).exec(attrs); return m ? decodeHtml(m[1]) : null; };
const classesOf = (attrs: string) => (attrOf(attrs, "class") ?? "").split(" ").filter(Boolean);
/** Every element whose class list holds `cls`: its tag, its attributes and its inner markup (its own tag's nesting counted). */
function elementsOf(html: string, cls: string): Array<{ tag: string; attrs: string; inner: string }> {
  const out: Array<{ tag: string; attrs: string; inner: string }> = [];
  const open = new RegExp(`<([a-z][a-z0-9]*)((?: [^>]*)? class="(?:[^"]* )?${cls}(?: [^"]*)?"[^>]*)>`, "g");
  for (let o = open.exec(html); o; o = open.exec(html)) {
    const tag = o[1], from = o.index + o[0].length;
    const step = new RegExp(`<(/?)${tag}(?=[ >])[^>]*>`, "g");
    step.lastIndex = from;
    let depth = 1;
    for (let s = step.exec(html); s; s = step.exec(html)) {
      depth += s[1] ? -1 : 1;
      if (depth === 0) { out.push({ tag, attrs: o[2], inner: html.slice(from, s.index) }); break; }
    }
  }
  return out;
}
const anchorsOf = (html: string) => [...html.matchAll(/<a(?= )([^>]*)>/g)].map((m) => m[1]);
/** A kit glyph as the card draws it. */
const glyph = (g: unknown, s: number) => renderToStaticMarkup(h(g as never, { s } as never));
/** A figure joined to the words after it: "Shinda ≈2.8×" then every space after it a no-break one (the card's rule, said
 *  again here from the dictionary's own words). */
const winText = (l: Locale, mult: string) => {
  const tpl = dict[l].journey.cardWin, at = tpl.indexOf("{mult}"), to = tpl.indexOf(" ", at);
  return tpl.slice(0, to).replace("{mult}", mult) + tpl.slice(to).split(" ").join(NBSP);
};
const winInner = (l: Locale, mult: string) => {
  const tpl = dict[l].journey.cardWin, at = tpl.indexOf("{mult}"), from = tpl.lastIndexOf(" ", at) + 1, to = tpl.indexOf(" ", at);
  return `${tpl.slice(0, from)}<span class="kp-jcard__mult">${tpl.slice(from, to).replace("{mult}", mult)}</span>${tpl.slice(to).split(" ").join(NBSP)}`;
};
const plain = (s: string) => s.split(NBSP).join(" ");

/** White space of every kind, read as one space (a selector list or an at-rule's prelude may span lines). */
const WS = new RegExp(`[ ${LF}${CR}${String.fromCharCode(9)}]+`, "g");
/**
 * The stylesheet's rules in source order, each as its selector list, its declarations and the at-rules it sits in
 * (outermost first, each prelude as written with its white space read as one space: "@media (min-width: 640px)").
 */
type CssRule = { sels: string[]; decls: Array<[string, string]>; at: string[] };
function cssRules(css: string): CssRule[] {
  const text = decommentCss(css), out: CssRule[] = [], at: string[] = [];
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === ";") from = i + 1;
    else if (c === "}") { at.pop(); from = i + 1; }
    else if (c === "{") {
      const prelude = text.slice(from, i).replace(WS, " ").trim();
      if (prelude.startsWith("@")) { at.push(prelude); from = i + 1; continue; }
      const end = text.indexOf("}", i);
      if (end < 0) break;
      out.push({
        sels: prelude.split(",").map((s) => s.trim()).filter(Boolean),
        decls: text.slice(i + 1, end).split(";").map((d) => d.replace(WS, " ").trim()).filter(Boolean).map((d) => {
          const k = d.indexOf(":");
          return [d.slice(0, k).trim(), d.slice(k + 1).trim()] as [string, string];
        }),
        at: [...at],
      });
      i = end;
      from = end + 1;
    }
  }
  return out;
}
/** The card's own rules and its grid's: every selector in the list is theirs (the shared note rule is not). */
const cardRules = (sheet: CssRule[]) => sheet.filter((r) => r.sels.length > 0 && r.sels.every((s) => s.startsWith(".kp-jcard") || s.startsWith(".kp-jgrid")));
/**
 * What the cascade leaves for this selector: the LAST declaration of the property in any rule whose selector list
 * holds it — a list of one or of several, under any at-rule — or null. ⚠️ The last, never the first: a later rule
 * that re-sets the card's own selector is the one a browser paints.
 */
const declOf = (sheet: CssRule[], sel: string, prop: string) => {
  const said = sheet.filter((r) => r.sels.includes(sel)).flatMap((r) => r.decls.filter(([p]) => p === prop).map(([, v]) => v));
  return said.length > 0 ? said[said.length - 1] : null;
};
/** A selector's last compound: the element it styles (".kp-jcard__picks > .kp-jcard__pick:hover" styles the pick). */
const lastCompound = (sel: string) => { const parts = sel.split(/[ >+~]+/).filter(Boolean); return parts.length > 0 ? parts[parts.length - 1] : ""; };
/** Every class a selector names. */
const classesIn = (sel: string) => sel.match(/[.][A-Za-z_][A-Za-z0-9_-]*/g) ?? [];

/** An element's direct children (tag and classes) and the text that stands beside them, nothing nested counted. */
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
function childrenOf(inner: string): { kids: Array<{ tag: string; cls: string[] }>; text: string } {
  const kids: Array<{ tag: string; cls: string[] }> = [];
  let depth = 0, text = "";
  for (const m of inner.matchAll(/<([/]?)([a-z][a-z0-9]*)((?:[^>"]|"[^"]*")*)>|([^<]+)/g)) {
    if (m[4] !== undefined) { if (depth === 0) text += decodeHtml(m[4]); continue; }
    if (m[1]) { depth--; continue; }
    if (depth === 0) kids.push({ tag: m[2], cls: classesOf(m[3]) });
    if (!m[3].endsWith("/") && !VOID_TAGS.has(m[2])) depth++;
  }
  return { kids, text };
}
/** The card's own children: what its <article> holds. */
const cardChildren = (html: string) => {
  const open = /^<article(?= )[^>]*>/.exec(html);
  const close = html.lastIndexOf("</article>");
  return open && close > 0 ? childrenOf(html.slice(open[0].length, close)) : { kids: [], text: html };
};

/**
 * ⭐ THE WIDTH MODEL (4.picks.fit), as `test:visual-pass-r9a` §5.3 measures the classic card's labels: each character
 * at its face's own advance from the repo's font files — the words Inter Medium (the line's weight, 500), the figure
 * JetBrains Mono Bold (700) — at the line's size, its tracking added after every character; Chinese at one em (the
 * system CJK face's full width); kerning ignored, which only tightens a run, so every width is an upper bound.
 */
const req = createRequire(import.meta.url);
type Face = { unitsPerEm: number; glyphForCodePoint: (c: number) => { id: number; advanceWidth: number } };
const FACES = (() => {
  const fontkit = req("fontkit") as { openSync: (p: string) => Face };
  const open = (n: string) => fontkit.openSync(join(ROOT, "src/lib/server/reports/fonts", `${n}.ttf`));
  return { words: open("Inter-Medium"), figure: open("JetBrainsMono-Bold") };
})();
/** A wide East Asian character or mark (ideographs, CJK punctuation, full-width forms): one em, and a break beside it. */
const isWide = (ch: string) => { const p = ch.codePointAt(0) ?? 0; return (p >= 0x3000 && p <= 0x303f) || (p >= 0x3400 && p <= 0x9fff) || (p >= 0xf900 && p <= 0xfaff) || (p >= 0xff00 && p <= 0xffef); };
/** Chinese closing marks: no line opens with one (UAX #14: no break before a closing mark). */
const CLOSING = "，。、：；！？）」』";
/** One character of a pick's line as a browser lays it: its face, whether a nowrap span holds it, and which stacked
 *  part (`DotSeq`'s centred form: each part a line of its own) it sits in. A dot hidden in the gap is not on the line. */
type Glyph = { ch: string; mono: boolean; kept: boolean; part: number };
function lineGlyphs(inner: string): Glyph[] {
  const out: Glyph[] = [];
  const stack: Array<{ mono: boolean; kept: boolean; hidden: boolean }> = [];
  let part = 0;
  for (const m of inner.matchAll(/<([/]?)([a-z][a-z0-9]*)((?:[^>"]|"[^"]*")*)>|([^<]+)/g)) {
    const top = stack.length > 0 ? stack[stack.length - 1] : { mono: false, kept: false, hidden: false };
    if (m[4] !== undefined) {
      if (!top.hidden) for (const ch of decodeHtml(m[4])) out.push({ ch, mono: top.mono, kept: top.kept, part });
      continue;
    }
    if (m[1]) { stack.pop(); continue; }
    const cls = classesOf(m[3]);
    if (cls.includes("kp-seq__item")) part++;
    stack.push({
      mono: top.mono || cls.includes("kp-jcard__mult"),
      kept: top.kept || cls.includes("kp-jcard__mult") || cls.includes("kp-jcard__run"),
      hidden: top.hidden || cls.includes("kp-seq__dot"),
    });
  }
  return out;
}
/** The line's unbreakable runs: it breaks at an ordinary space outside a nowrap span (the space hangs), between stacked
 *  parts, and beside a wide character — except across a no-break space or before a closing mark. */
function lineRuns(gs: Glyph[]): Glyph[][] {
  const runs: Glyph[][] = [];
  let cur: Glyph[] = [];
  const flush = () => { if (cur.length > 0) runs.push(cur); cur = []; };
  gs.forEach((g, i) => {
    const prev = i > 0 ? gs[i - 1] : null;
    if (prev && prev.part !== g.part) flush();
    if (g.ch === " " && !g.kept) { flush(); return; }
    if (prev && !g.kept && !prev.kept && (isWide(g.ch) || isWide(prev.ch)) && g.ch !== NBSP && prev.ch !== NBSP && !CLOSING.includes(g.ch)) flush();
    cur.push(g);
  });
  flush();
  return runs;
}
/** A run's width at the line's size and tracking, or null when a face lacks one of its characters (a run the model
 *  cannot measure is never passed as fitting). */
function runWidth(run: Glyph[], size: number, tracking: number): number | null {
  let w = 0;
  for (const g of run) {
    if (isWide(g.ch)) { w += size + tracking; continue; }
    const face = g.mono ? FACES.figure : FACES.words;
    const glyph = face.glyphForCodePoint(g.ch.codePointAt(0) ?? 0);
    if (!glyph || glyph.id === 0) return null;
    w += (glyph.advanceWidth / face.unitsPerEm) * size + tracking;
  }
  return w;
}
const runText = (run: Glyph[]) => run.map((g) => g.ch).join("");

function journeyCardChecks(w: World, ok: Ok) {
  const src = decomment(w.card);
  const R = w.renders;
  const sw = dict.sw, en = dict.en, zh = dict.zh;
  const sheet = cssRules(w.css);
  const rules = cardRules(sheet);
  const rootDecl = (name: string) => [...decommentCss(w.css).matchAll(new RegExp(`(?<![A-Za-z0-9_-])${name}:([^;]*);`, "g"))].map((m) => m[1].trim());

  /* the card is a server component, and only server code imports it */
  const hooks = src.match(/(?<![A-Za-z0-9_$.])use(?:State|Effect|LayoutEffect|Ref|Transition|Router|Reducer|Context|SyncExternalStore)[(]/g) ?? [];
  const EXPORTS_WANT = ["export type JourneyCardMarket", "export function JourneyCard"];
  const exported = src.split(LF).filter((l) => /^export(?![A-Za-z0-9_$])/.test(l.trim())).map((l) => l.trim().split(/[(=<{;]/)[0].trim());
  const exportWords = (src.match(/(?<![A-Za-z0-9_$.])export(?![A-Za-z0-9_$])/g) ?? []).length;
  ok("4.directive · journey-card.tsx is a SERVER component: no directive, no client hook, and one component export (JourneyCard) beside the row type it takes (JourneyCardMarket) — nothing else exported",
    w.card.length > 0 && !DIRECTIVE.test(src) && hooks.length === 0 && j(exported) === j(EXPORTS_WANT) && exportWords === EXPORTS_WANT.length,
    j({ directive: src.match(DIRECTIVE)?.[0] ?? null, exported, exportWords, hooks }));
  const IMPORTS_CARD = /(?:from|import)[ ]*[(]?[ ]*["'`][^"'`]*journey-card(?:[.]tsx)?["'`]/;
  const importers = [...w.cardNaming].filter(([, s]) => IMPORTS_CARD.test(decomment(s)));
  const clientImporters = importers.filter(([, s]) => /["']use client["']/.test(decomment(s))).map(([f]) => f);
  ok("4.importers · no client module imports the card (a census over every file under src/ that names it): it reaches a page as server markup only",
    w.walked >= 500 && clientImporters.length === 0, j({ walked: w.walked, importers: importers.map(([f]) => f), client: clientImporters }));

  /* every figure and word through WP3's rules; nothing else printed */
  const RULE_CALLS = ["cardFigures(", "cardFace(", "cardCloseLabel(", "cardTitle(", "normaliseCompetition("].map((s) => [s, count(src, s)] as const);
  const ARGS = ["cardFigures(m, nowMs)", "cardCloseLabel(m, nowMs)", "cardTitle(locale, m)", "normaliseCompetition(m.competition)"].map((s) => [s, count(src, s)] as const);
  const WORDS = ["cardCloseText(close, t.journey)", "competitionLabel(t, competition)"].every((s) => src.includes(s));
  const bypass = src.match(/(?<![A-Za-z0-9_$.])(?:cardEstimate|estimateFor|pickEstimateRates|ratesFor|priceState|impliedYesPct|pricedYesPct|shownYesPct|yesPct|formatTzs|formatTzsCompact|formatMultiplier|payoutFor)(?![A-Za-z0-9_$])|[.](?:yesPool|noPool)(?![A-Za-z0-9_$])|Date[.]now|new Date[(]/g) ?? [];
  ok("4.computes · every figure and word comes through WP3's rules, each called once on the server with the render's clock — cardFigures(m, nowMs), cardFace, cardCloseLabel(m, nowMs) with cardCloseText, cardTitle, normaliseCompetition with competitionLabel — and the card reads no pool, rate, price, money formatter or wall clock of its own",
    RULE_CALLS.every(([, n]) => n === 1) && ARGS.every(([, n]) => n === 1) && WORDS && bypass.length === 0, j({ RULE_CALLS, ARGS, WORDS, bypass }));
  const POOLS = [...new Set(CARD_NAMES.flatMap((n) => { const m = caseOf(n).m; return [m.yesPool, m.noPool, m.yesPool + m.noPool]; }))].filter((p) => p >= 1_000);
  const POOL_MARKS = POOLS.flatMap((p) => [String(p), p.toLocaleString("en-US")]);
  const printed = CARD_NAMES.flatMap((n) => {
    const text = textOf(R[n]);
    return [...(text.includes("%") ? ["%"] : []), ...(text.includes("TZS") ? ["TZS"] : []), ...POOL_MARKS.filter((p) => text.includes(p))].map((x) => `${n}: ${x}`);
  });
  ok("4.printed · no card prints a percentage, a pool or an amount: the faces' words and figures only (§3.2 — no pool, predictor count, bar or move)",
    printed.length === 0, printed.join(", "));
  const forbiddenSrc = src.match(/onClick|50pick:navigating|data-market-surface|mcardp|market-grid/g) ?? [];
  const forbiddenDrawn = CARD_NAMES.flatMap((n) => (R[n].match(/data-market-surface|class="[^"]*(?:mcardp|market-grid)[^"]*"/g) ?? []).map((x) => `${n}: ${x}`));
  const unsorted = CARD_NAMES.filter((n) => [OPEN_CARDS, CLOSED_CARDS, SETTLED_CARDS].filter((s) => s.includes(n)).length !== 1);
  const LINKS = /<a(?=[ >])/g;
  const CONTROLS = /<(?:button|input|select|textarea|form)(?=[ >/])|role="button"/g;
  const badControls = CARD_NAMES.map((n) => [n, (R[n].match(LINKS) ?? []).length, (R[n].match(CONTROLS) ?? []).length] as const)
    .filter(([n, links, controls]) => links !== (OPEN_CARDS.includes(n) ? 3 : 1) || controls !== 0);
  ok("4.forbidden · no click handler and no navigating event (NavProgress starts on any internal link), no classic surface hook and no classic card or board-grid class, in the source or on any card drawn (V18 selects them; phone density rewrites them); and a card's only controls are its links — three on a card that takes bets (the card and its two picks), one on a closed or a settled card, never a button",
    forbiddenSrc.length === 0 && forbiddenDrawn.length === 0 && unsorted.length === 0 && badControls.length === 0,
    j({ forbiddenSrc, forbiddenDrawn, unsorted, badControls }));

  /* the links (WP5 step 3, Open point 4) */
  const fullTitle = (c: CardCase) => { const l = c.locale ?? "sw"; return l === "sw" ? c.m.titleSw : l === "zh" ? (c.m.titleZh ?? c.m.titleEn) : c.m.titleEn; };
  const openWant = (n: CardName) => (n === "updownLive" ? "/updown/rnd_jcLive" : n === "updownNoRound" ? "/updown" : `/markets/${caseOf(n).m.id}`);
  const opens = (n: CardName) => anchorsOf(R[n]).filter((a) => classesOf(a).includes("kp-jcard__open"));
  const badOpen = CARD_NAMES.filter((n) => {
    const o = opens(n);
    return o.length !== 1 || attrOf(o[0], "href") !== openWant(n) || attrOf(o[0], "aria-label") !== fullTitle(caseOf(n));
  }).map((n) => [n, opens(n).map((a) => [attrOf(a, "href"), attrOf(a, "aria-label")])]);
  const notFirst = CARD_NAMES.filter((n) => !/^<article [^>]*><a class="kp-jcard__open"[^>]*><[/]a>/.test(R[n]));
  ok("4.links.open · the card is ONE stretched link, first and empty, named by the reader's FULL title: to the question; an Up & Down row on /live to its round, or /updown when none resolved; elsewhere the question, which sends a round on itself",
    badOpen.length === 0 && notFirst.length === 0, j({ badOpen, notFirst }));
  const picksOf = (n: CardName) => anchorsOf(R[n]).filter((a) => classesOf(a).includes("kp-jcard__pick"));
  const pickWant = (n: CardName) => ["YES", "NO"].map((s) => `/markets/${caseOf(n).m.id}?side=${s}${n === "home" ? "&from=home" : ""}`);
  const badPicks = OPEN_CARDS.filter((n) => j(picksOf(n).map((a) => attrOf(a, "href"))) !== j(pickWant(n)) || picksOf(n).some((a) => attrOf(a, "aria-label") !== null));
  const pickBuilder = src.slice(src.indexOf("const pick = ("), src.indexOf("const Heading = heading;"));
  const prefetchOff = count(src, "prefetch={false}") === 1 && pickBuilder.includes("prefetch={false}");
  ok("4.links.picks · the picks go where today's buttons go — the question with ?side=YES, then ?side=NO, &from=home on the home alone — never prefetched, each named by its visible words (a closed or a settled card's one link is 4.forbidden's count)",
    badPicks.length === 0 && prefetchOff, j({ badPicks: badPicks.map((n) => [n, picksOf(n).map((a) => attrOf(a, "href"))]), prefetchOff }));

  /* the heading */
  const headOf = (n: CardName) => elementsOf(R[n], "kp-jcard__title")[0] ?? null;
  const badHead = CARD_NAMES.filter((n) => {
    const hd = headOf(n);
    return !hd || hd.tag !== (n === "short" ? "h3" : "h2") || !classesOf(hd.attrs).includes("text-title-sm");
  });
  const keptFigure = (headOf("priced")?.inner ?? "").includes('<span class="whitespace-nowrap">1 Oktoba</span>')
    && textOf(headOf("priced")?.inner ?? "") === caseOf("priced").m.titleSw && textOf(headOf("short")?.inner ?? "") === "Je, Dodoma itanyesha kesho?";
  /** Every rule that styles the question: its class or its fallback's modifier the selector's last compound. */
  const TITLE_EL = /[.]kp-jcard__title(?:--full)?(?![A-Za-z0-9_-])/;
  const titleRules = sheet.filter((r) => r.sels.some((s) => TITLE_EL.test(lastCompound(s))));
  const titleWrap = declOf(sheet, ".kp-jcard__title", "text-wrap");
  const titleWraps = titleRules.flatMap((r) => r.decls.filter(([p]) => /^text-wrap(?:-style)?$/.test(p)).map(([, v]) => `${r.sels.join(", ")} ${v}`));
  ok("4.title.heading · the question is an h2 (an h3 where the similar rail asks) on the title-sm rung, the short title else the full one, its figures kept whole (keepFigures) and its lines balanced, never pretty — the last word of every rule that styles it, a later one included",
    badHead.length === 0 && keptFigure && titleWrap === "balance" && j(titleWraps) === j([".kp-jcard__title balance"]), j({ badHead, keptFigure, titleWrap, titleWraps }));
  const clampRules = titleRules.filter((r) => r.decls.some(([p]) => p === "-webkit-line-clamp" || p === "line-clamp"))
    .map((r) => [r.sels.join(", "), r.decls.filter(([p]) => p === "-webkit-line-clamp" || p === "line-clamp").map(([p, v]) => `${p}: ${v}`).join("; ")]);
  const clampBox = ["display", "-webkit-box-orient", "overflow"].map((p) => declOf(sheet, ".kp-jcard__title--full", p));
  const badClamp = CARD_NAMES.filter((n) => classesOf(headOf(n)?.attrs ?? "").includes("kp-jcard__title--full") !== (n !== "short"));
  ok("4.title.clamp · only the full-title FALLBACK is held to two lines: the clamp lives on the fallback's modifier alone, with the box it needs to clamp at all (display: -webkit-box, a vertical orient, the overflow hidden), and a card wears it exactly when it has no short title (a short title is never clamped)",
    j(clampRules) === j([[".kp-jcard__title--full", "-webkit-line-clamp: 2"]]) && j(clampBox) === j(["-webkit-box", "vertical", "hidden"]) && badClamp.length === 0,
    j({ clampRules, clampBox, badClamp }));

  /* the meta row (A12) */
  const labelOf = (n: CardName) => elementsOf(R[n], "kp-jcard__when")[0] ?? null;
  const EMPHASIS: Partial<Record<CardName, string>> = { today: "muted", closed: "muted", oneSidedClosed: "muted", priced: "subtle", settledYes: "subtle", void: "subtle", updownSettled: "subtle" };
  const badEmphasis = (Object.keys(EMPHASIS) as CardName[]).filter((n) => attrOf(labelOf(n)?.attrs ?? "", "data-emphasis") !== EMPHASIS[n]);
  const META_FAMILY = /kp-jcard__(?:meta|when|where)(?![A-Za-z0-9_-])/;
  const inks = sheet.filter((r) => r.sels.some((s) => META_FAMILY.test(s))).flatMap((r) => r.decls.filter(([p]) => p === "color").map(([, v]) => [r.sels.join(", "), v]));
  ok("4.meta.ink · A12: the label carries its face's ink — closes today and waiting muted; Siku N, settled and void subtle — and the meta row sets the subtle ink once, the muted rule the only other colour on it, in any rule whose selector list names the row (a list shared with another surface's included)",
    badEmphasis.length === 0 && j(inks) === j([[".kp-jcard__meta", "var(--text-subtle)"], ['.kp-jcard__when[data-emphasis="muted"]', "var(--text-muted)"]]),
    j({ badEmphasis, inks }));
  const LABEL: Partial<Record<CardName, string>> = {
    today: glyph(I.clock, 14) + sw.journey.cardClosesToday,
    priced: sw.journey.cardDaysLeft.replace("{n}", "11"),
    pricedEn: en.journey.cardDaysLeft.replace("{n}", "11"),
    pricedZh: zh.journey.cardDaysLeft.replace("{n}", "11"),
    closed: glyph(I.hourglassOff, 14) + sw.market.waitingForResults,
    settledYes: glyph(I.checkCircle, 14) + sw.market.resolvedOutcome,
    void: sw.common.voided,
  };
  const badLabel = (Object.keys(LABEL) as CardName[]).filter((n) => labelOf(n)?.inner !== LABEL[n]).map((n) => [n, labelOf(n)?.inner ?? null]);
  ok("4.meta.label · the label is in the served markup, computed on the server: closes today with its clock, Siku N, waiting with the closed hourglass, settled with its check, void alone — in the reader's words",
    badLabel.length === 0, j(badLabel));
  const whereOf = (n: CardName) => elementsOf(R[n], "kp-jcard__where")[0] ?? null;
  const comp = whereOf("competition"), plainWhere = whereOf("priced"), odd = whereOf("oddCompetition");
  const whereOk = !!comp && classesOf(comp.attrs).includes("kp-seq") && elementsOf(comp.inner, "kp-seq__item").length === 2
    && textOf(comp.inner) === `${sw.market.catSports} · ${sw.journey.compLigiKuu}`
    && !!plainWhere && !classesOf(plainWhere.attrs).includes("kp-seq") && textOf(plainWhere.inner) === sw.market.catWeather
    && !!odd && textOf(odd.inner) === sw.market.catSports;
  ok("4.meta.where · category · competition, a DotSeq (it breaks between the two; its dot never opens or ends a line); no competition, or a key the list does not hold, is the category alone",
    whereOk, j({ comp: comp && textOf(comp.inner), plain: plainWhere && textOf(plainWhere.inner), odd: odd && textOf(odd.inner) }));

  /* the picks */
  const picks = (n: CardName) => elementsOf(R[n], "kp-jcard__pick").map((p) => ({
    cls: classesOf(p.attrs), side: textOf(elementsOf(p.inner, "kp-jcard__side")[0]?.inner ?? ""), line: elementsOf(p.inner, "kp-jcard__line")[0] ?? null,
  }));
  const said = (n: CardName) => picks(n).map((p) => [p.side, p.line === null ? null : plain(textOf(p.line.inner))]);
  const thinLine = picks("overCap")[1]?.line;
  const WORDS_WANT: Array<[CardName, unknown]> = [
    ["priced", [[sw.common.yes, plain(winText("sw", "2.8"))], [sw.common.no, plain(winText("sw", "1.4"))]]],
    ["empty", [[sw.common.yes, sw.journey.cardBeFirst], [sw.common.no, sw.journey.cardBeFirst]]],
    ["oneSided", [[sw.common.yes, sw.market.oneSideOnly], [sw.common.no, sw.journey.cardBeFirst]]],
    ["overCap", [[sw.common.yes, sw.journey.cardOverCap], [sw.common.no, sw.journey.cardThin.replace("{mult}", "1.0")]]],
    ["legacy", [[sw.common.yes, null], [sw.common.no, null]]],
    ["updownLive", [[sw.market.udUp, null], [sw.market.udDown, null]]],
  ];
  const badWords = WORDS_WANT.filter(([n, want]) => j(said(n)) !== j(want)).map(([n]) => [n, said(n)]);
  const wordOnly = (["legacy", "updownLive"] as CardName[]).every((n) => picks(n).length === 2 && picks(n).every((p) => p.cls.includes("kp-jcard__pick--word")))
    && OPEN_CARDS.filter((n) => n !== "legacy" && !n.startsWith("updown")).every((n) => picks(n).every((p) => !p.cls.includes("kp-jcard__pick--word")));
  const thinStacked = !!thinLine && thinLine.inner.includes('class="kp-seq kp-seq--stack"') && thinLine.inner.includes('<span class="kp-jcard__mult">≈1.0×</span>');
  const inked = OPEN_CARDS.every((n) => {
    const p = picks(n);
    return p.length === 2 && p[0].cls.includes("btn-yes") && !p[0].cls.includes("btn-no") && p[1].cls.includes("btn-no") && !p[1].cls.includes("btn-yes")
      && p.every((x) => !x.cls.some((c) => c === "btn" || /^btn-(?:xs|sm|md|lg|xl)$/.test(c)));
  });
  /* …and no rule that styles a pick cuts it: a pick's last compound, every class it names the card's or the side inks' */
  const PICK_EL = /[.](?:kp-jcard__pick|kp-jcard__pick--word|btn-yes|btn-no)(?![A-Za-z0-9_-])/;
  const stylesPick = (s: string) => PICK_EL.test(lastCompound(s)) && classesIn(s).every((c) => c.startsWith(".kp-jcard") || c === ".btn-yes" || c === ".btn-no");
  const CUTS = (p: string, v: string) => /^(?:height|max-height|block-size|max-block-size|line-clamp|-webkit-line-clamp|text-overflow)$/.test(p)
    || (p === "white-space" && v !== "normal") || (/^text-wrap(?:-mode)?$/.test(p) && v.includes("nowrap"));
  const pickCuts = sheet.filter((r) => r.sels.some(stylesPick)).flatMap((r) => r.decls.filter(([p, v]) => CUTS(p, v)).map(([p, v]) => `${r.sels.join(", ")} ${p}: ${v}`));
  ok("4.picks.words · each pick: the side word in the reader's and the product's words over its face's — win, be first, one side only, over the cap with no number, a thin side stacked; nothing under a hidden figure or an Up & Down side (centred); the YES ink on YES and the NO ink on NO, with no button height or nowrap — on the markup, or in any rule that styles a pick",
    badWords.length === 0 && wordOnly && thinStacked && inked && pickCuts.length === 0, j({ badWords, wordOnly, thinStacked, inked, pickCuts }));
  const lineOf = (n: CardName, i: number) => picks(n)[i]?.line?.inner ?? null;
  const UNIT_WANT: Array<[CardName, number, string]> = [
    ["priced", 0, winInner("sw", "2.8")], ["priced", 1, winInner("sw", "1.4")], ["pricedEn", 0, winInner("en", "2.8")], ["pricedZh", 0, winInner("zh", "2.8")],
    ["overCap", 0, '<span class="kp-jcard__run">Upande mdogo,</span> <span class="kp-jcard__run">ona makadirio</span>'],
    ["overCapEn", 0, '<span class="kp-jcard__run">Small side,</span> <span class="kp-jcard__run">see the estimate</span>'],
    ["overCapZh", 0, zh.journey.cardOverCap],
  ];
  const badUnit = UNIT_WANT.filter(([n, i, want]) => lineOf(n, i) !== want).map(([n, i]) => [n, i, lineOf(n, i)]);
  const nowrap = (["kp-jcard__mult", "kp-jcard__run"] as const).every((c) => declOf(sheet, `.${c}`, "white-space") === "nowrap")
    && declOf(sheet, ".kp-jcard__mult", "font-family") === "var(--font-mono)";
  const capWords = sw.journey.cardOverCap === "Upande mdogo, ona makadirio" && en.journey.cardOverCap === "Small side, see the estimate";
  ok("4.picks.unit · the figure is one mono unit, never broken, joined to the words after it by no-break spaces (“≈2.8× dau”, “≈2.8× your bet”, “≈2.8× 投注”), so a Latin line breaks only before it (a figure of five characters is 4.picks.fit's); over the cap each clause is kept whole where a space follows its comma (sw, en), and Chinese is left as written",
    capWords && badUnit.length === 0 && nowrap, j({ capWords, badUnit, nowrap }));

  /* ⭐ the width proof (the WP5 review's item 1): every unit a pick prints holds a 320 phone's pick line */
  const px = (v: string | null): number | null => {
    if (v === null) return null;
    const ref = /^var[(](--[a-z0-9-]+)[)]$/.exec(v.trim());
    if (ref) { const d = rootDecl(ref[1]); return d.length === 1 ? px(d[0]) : null; }
    const n = /^([0-9]+(?:[.][0-9]+)?)px$/.exec(v.trim());
    return n ? Number(n[1]) : v.trim() === "0" ? 0 : null;
  };
  /** A box shorthand's two inline sides (one value, two, three or four). */
  const inline = (v: string | null): [number | null, number | null] => {
    const p = (v ?? "").split(" ").filter(Boolean);
    return p.length === 0 ? [null, null] : p.length === 1 ? [px(p[0]), px(p[0])] : p.length < 4 ? [px(p[1]), px(p[1])] : [px(p[1]), px(p[3])];
  };
  const firstPx = (v: string | null) => px((v ?? "").split(" ")[0] || null);
  const forcedBorder = sheet.filter((r) => r.at.includes("@media (forced-colors: active)") && r.sels.includes(".kp-jcard__pick"))
    .flatMap((r) => r.decls.filter(([p]) => p === "border").map(([, v]) => v));
  const frame = {
    view: 320, gutter: w.gutter, cardEdge: firstPx(declOf(sheet, ".kp-jcard", "border")), cardPad: inline(declOf(sheet, ".kp-jcard", "padding")),
    pairGap: px(declOf(sheet, ".kp-jcard__picks", "column-gap") ?? declOf(sheet, ".kp-jcard__picks", "gap")),
    pickPad: inline(declOf(sheet, ".kp-jcard__pick", "padding")),
    forcedEdge: forcedBorder.length === 0 ? 0 : firstPx(forcedBorder[forcedBorder.length - 1]),
  };
  const sizes = [frame.gutter, frame.cardEdge, ...frame.cardPad, frame.pairGap, ...frame.pickPad, frame.forcedEdge];
  const framed = sizes.every((x) => typeof x === "number");
  const num = (x: number | null) => x ?? Number.NaN;
  const LINE = (frame.view - 2 * num(frame.gutter) - 2 * num(frame.cardEdge) - num(frame.cardPad[0]) - num(frame.cardPad[1]) - num(frame.pairGap)) / 2
    - num(frame.pickPad[0]) - num(frame.pickPad[1]);
  const FORCED = LINE - 2 * num(frame.forcedEdge);
  const fontSize = px(declOf(sheet, ".kp-jcard__line", "font-size"));
  const track = declOf(sheet, ".kp-jcard__line", "letter-spacing");
  const trackEm = /^(-?[0-9]+(?:[.][0-9]+)?)em$/.exec(track ?? "");
  const tracking = track === null ? null : track === "0" ? 0 : trackEm ? (fontSize === null ? null : Number(trackEm[1]) * fontSize) : px(track);
  const faces = declOf(sheet, ".kp-jcard__line", "font-weight") === "500" && declOf(sheet, ".kp-jcard__mult", "font-weight") === "700"
    && declOf(sheet, ".kp-jcard__mult", "font-family") === "var(--font-mono)";
  const measured = OPEN_CARDS.flatMap((n) => [0, 1].flatMap((i) => {
    const inner = lineOf(n, i);
    return inner === null ? [] : lineRuns(lineGlyphs(inner)).map((run) => ({
      n, text: runText(run), width: fontSize === null || tracking === null ? null : runWidth(run, fontSize, tracking),
    }));
  }));
  const unmeasured = measured.filter((u) => u.width === null).map((u) => `${u.n}: ${u.text}`);
  const widest = measured.reduce<{ n: string; text: string; width: number | null } | null>((a, b) => (a === null || num(b.width) > num(a.width) ? b : a), null);
  const overLine = measured.filter((u) => !(num(u.width) <= FORCED)).map((u) => `${u.n} “${u.text}” ${num(u.width).toFixed(1)}px`);
  /* ≈99.9× kept whole, ≈100.0× broken before its words, in the three languages — as served */
  const capLine = (l: Locale, mult: string, kept: boolean) => {
    const tpl = dict[l].journey.cardWin, at = tpl.indexOf("{mult}"), from = tpl.lastIndexOf(" ", at) + 1, to = tpl.indexOf(" ", at);
    return `${tpl.slice(0, from)}<span class="kp-jcard__mult">${tpl.slice(from, to).replace("{mult}", mult)}</span>${kept ? tpl.slice(to).split(" ").join(NBSP) : tpl.slice(to)}`;
  };
  const CAPS: Array<[CardName, Locale, string, boolean]> = [
    ["cap999", "sw", "99.9", true], ["cap999En", "en", "99.9", true], ["cap999Zh", "zh", "99.9", true],
    ["cap100", "sw", "100.0", false], ["cap100En", "en", "100.0", false], ["cap100Zh", "zh", "100.0", false],
  ];
  const badCaps = CAPS.filter(([n, l, mult, kept]) => lineOf(n, 0) !== capLine(l, mult, kept)).map(([n]) => [n, lineOf(n, 0)]);
  const unitWidth = (inner: string, figure: string) => {
    const run = lineRuns(lineGlyphs(inner)).find((r) => runText(r).includes(figure));
    return run && fontSize !== null && tracking !== null ? runWidth(run, fontSize, tracking) : null;
  };
  const kept999 = (["sw", "en", "zh"] as const).map((l) => num(unitWidth(capLine(l, "99.9", true), "≈99.9×")));
  /* CONTROL — the ruling's reason: ≈100.0× held to its words would run past the line (en: “≈100.0× your bet”) */
  const kept100 = Math.max(...(["sw", "en", "zh"] as const).map((l) => num(unitWidth(capLine(l, "100.0", true), "≈100.0×"))));
  const fmt = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : "?");
  const widestSaid = widest === null ? "none measured" : `“${widest.text}” (${widest.n}) at ${fmt(num(widest.width))}px`;
  ok(`4.picks.fit · the width proof (the repo's Inter Medium and JetBrains Mono Bold by their own advances, kerning ignored, so an upper bound): at 320 a pick's line is ${fmt(LINE)}px — ${fmt(FORCED)}px in forced colours, inside its edge — and every unit a pick prints in sw, en and zh holds it, the widest ${widestSaid}; “≈99.9×” stays joined to its words (sw ${fmt(kept999[0])}, en ${fmt(kept999[1])}, zh ${fmt(kept999[2])}px), and “≈100.0×” breaks before them — held to them, it would run ${fmt(kept100)}px`,
    w.gutter !== null && framed && fontSize !== null && tracking !== null && faces && measured.length > 0 && unmeasured.length === 0
      && overLine.length === 0 && badCaps.length === 0 && kept100 > LINE,
    j({ frame, LINE, FORCED, fontSize, track, faces, unmeasured, overLine, badCaps, kept999, kept100 }));

  /* the closed and the result rows */
  const closedRow = (n: CardName) => elementsOf(R[n], "kp-jcard__closed");
  const badClosed = CARD_NAMES.filter((n) => {
    const rows = closedRow(n);
    return CLOSED_CARDS.includes(n) ? rows.length !== 1 || rows[0].tag !== "p" || rows[0].inner !== glyph(I.lock, 16) + sw.market.statusClosed : rows.length !== 0;
  });
  ok("4.closed · a market whose selection has closed draws the closed row — a lock and the closed word, not a control — and nothing else does",
    badClosed.length === 0, j(badClosed.map((n) => [n, closedRow(n).map((r) => r.inner)])));
  const timesOf = (n: CardName) => [...R[n].matchAll(/<time(?= )([^>]*)>([^<]*)<[/]time>/g)].map((m) => ({ at: attrOf(m[1], "dateTime"), text: decodeHtml(m[2]) }));
  const badDate = CARD_NAMES.filter((n) => {
    const ts = timesOf(n);
    if (!SETTLED_CARDS.includes(n)) return ts.length !== 0;
    const m = caseOf(n).m, instant = m.settledAt ?? m.resolutionAt;
    const label = elementsOf(R[n], "kp-jcard__result-label")[0];
    return ts.length !== 1 || ts[0].at !== instant || ts[0].text !== formatEatDateTime(Date.parse(instant), T0, sw.common.monthsShort, "sw")
      || !label || textOf(label.inner) !== sw.journey.cardResultLabel;
  });
  const yearShown = timesOf("lastYear")[0]?.text.includes("2025") === true;
  const settledFirst = caseOf("settledYes").m.settledAt !== caseOf("settledYes").m.resolutionAt && timesOf("settledYes")[0]?.at === caseOf("settledYes").m.settledAt;
  ok("4.settled.date · a settled card's one date is its settled instant — settledAt, else resolutionAt — in a <time> naming it, in the reader's month words and the East Africa clock, with the year once it is not this year; it sits under the result label; no other card prints a date",
    badDate.length === 0 && yearShown && settledFirst, j({ badDate: badDate.map((n) => [n, timesOf(n)]), yearShown, settledFirst }));
  const chipOf = (n: CardName) => { const c = elementsOf(R[n], "kp-jcard__outcome")[0]; return c ? [attrOf(c.attrs, "data-kit-chip-variant"), textOf(c.inner)] : null; };
  const CHIP_WANT: Array<[CardName, unknown]> = [
    ["settledYes", ["yes", sw.common.yes]], ["settledNo", ["no", sw.common.no]], ["lastYear", ["yes", sw.common.yes]],
    ["void", ["neutral", sw.market.statusVoid]], ["updownSettled", ["yes", sw.market.udUp]], ["unrecorded", null],
  ];
  const badChip = CHIP_WANT.filter(([n, want]) => j(chipOf(n)) !== j(want)).map(([n]) => [n, chipOf(n)]);
  const chipsElsewhere = [...OPEN_CARDS, ...CLOSED_CARDS].filter((n) => R[n].includes("data-kit-chip"));
  ok("4.settled.chip · the result's chip is the kit Chip in its outcome's own ink with the product's word — YES, NO, a void neutral, Up & Down's own — and a verdict never recorded draws none",
    badChip.length === 0 && chipsElsewhere.length === 0, j({ badChip, chipsElsewhere }));

  /* the refund sentence (L22, Open point 7) */
  const notesOf = (n: CardName) => elementsOf(R[n], "kp-jcard__note");
  const noteWant = sw.market.oneSidedNote.replace("{side}", sw.common.no);
  const badNote = CARD_NAMES.filter((n) => {
    const ns = notesOf(n);
    return n === "oneSided" || n === "oneSidedClosed" ? ns.length !== 1 || ns[0].tag !== "p" || textOf(ns[0].inner) !== noteWant : ns.length !== 0;
  });
  const shared = sheet.filter((r) => r.sels.includes(".kp-jcard__note")).map((r) => r.sels.join(", "));
  ok("4.note · an unsettled one-sided card says the refund rule under its action, naming the EMPTY side — the closed phase too — and nothing else does; its voice is the ONE note rule the classic card and the landing rows share",
    badNote.length === 0 && j(shared) === j([".mcardp-onesided-note, .kp-qrow__note, .kp-jcard__note"]),
    j({ badNote: badNote.map((n) => [n, notesOf(n).map((x) => textOf(x.inner))]), shared }));

  /* the rules in globals.css */
  const zs = rules.flatMap((r) => r.decls.filter(([p]) => p === "z-index").map(([, v]) => [r.sels.join(", "), v]));
  const stackOk = declOf(sheet, ".kp-jcard", "position") === "relative" && declOf(sheet, ".kp-jcard", "isolation") === "isolate"
    && declOf(sheet, ".kp-jcard__open", "position") === "absolute" && declOf(sheet, ".kp-jcard__open", "inset") === "0"
    && declOf(sheet, ".kp-jcard__picks", "position") === "relative"
    && j(zs) === j([[".kp-jcard__open", "2"], [".kp-jcard__picks", "3"]]);
  ok("4.stack · the card isolates its own stacking context; the stretched link covers it at 2 and the picks rise to 3 — the local plane (z ≤ 10), and no other z-index in the card's rules",
    stackOk, j({ zs, card: [declOf(sheet, ".kp-jcard", "position"), declOf(sheet, ".kp-jcard", "isolation")], picks: declOf(sheet, ".kp-jcard__picks", "position") }));
  const press = declOf(sheet, ".kp-jcard__pick:active", "transform");
  const lift = declOf(sheet, ".kp-jcard__pick:hover", "transform");
  const fade = declOf(sheet, ".kp-jcard__picks > .kp-jcard__pick", "transition") ?? "";
  const liftGated = decommentCss(w.css).includes("@media (hover: hover) { .kp-jcard__pick:hover { transform: translateY(var(--m-lift)); } }");
  ok("4.press · a pick moves as the side buttons move: the one press scale (--m-press) when pressed, the one hover lift (--m-lift) only where a pointer hovers (a lift stuck after a tap is the classic fills' lesson), on the motion ladder's timing — the pressed feedback the transparent tap-flash counts on",
    press === "translateY(0) scale(var(--m-press))" && lift === "translateY(var(--m-lift))" && liftGated && fade.startsWith("transform var(--t-flick) var(--m-glide)"),
    j({ press, lift, liftGated, fade }));
  const FORCED_AT = "@media (forced-colors: active)";
  const forcedShape = sheet.filter((r) => r.at.includes(FORCED_AT) && r.sels.some((s) => s.includes("kp-jcard") || s.includes("kp-jgrid")))
    .map((r) => [r.at.join(" "), r.sels.join(", "), r.decls.map(([p, v]) => `${p}: ${v}`).join("; ")]);
  ok("4.forced · in forced colours a pick keeps its edge: one 1px border in the system's own ink (no colour named), where the side fill's ring — an inset shadow — goes with the fill (E-129: a forced palette keeps a border or an outline, never a shadow); nothing else in the card changes there",
    j(forcedShape) === j([[FORCED_AT, ".kp-jcard__pick", "border: 1px solid"]]), j(forcedShape));

  /* the action block and the grid (A16) */
  const titleHeights = titleRules.flatMap((r) => r.decls.filter(([p]) => /^(?:height|min-height|block-size|min-block-size)$/.test(p)).map(([p, v]) => `${r.sels.join(", ")} ${p}: ${v}`));
  const actOk = declOf(sheet, ".kp-jcard__act", "margin-block-start") === "auto" && declOf(sheet, ".kp-jcard", "height") === "100%"
    && declOf(sheet, ".kp-jcard__title", "line-height") === "var(--jcard-title-line)" && titleHeights.length === 0;
  ok("4.act · A16: the action block (picks, closed or result row, with the note) stands on the card's floor and the card fills its cell — the layout wherever the cards do not share their rows (4.grid) — and the question keeps no height of its own: its line is the card's token, and no reserve is paid, in one column or in several",
    actOk, j({ act: declOf(sheet, ".kp-jcard__act", "margin-block-start"), height: declOf(sheet, ".kp-jcard", "height"), line: declOf(sheet, ".kp-jcard__title", "line-height"), titleHeights }));
  const SUBGRID_AT = "@supports (grid-template-rows: subgrid)", AT640 = "@media (min-width: 640px)", AT1024 = "@media (min-width: 1024px)";
  /** What the cascade leaves for this selector under exactly these at-rules ("" — none). */
  const gridDecl = (at: string, sel: string, prop: string) => declOf(sheet.filter((r) => r.at.join(" ") === at), sel, prop);
  const SHARED = [".kp-jgrid > li", ".kp-jgrid > .kp-jcard", ".kp-jgrid > li > .kp-jcard"];
  const GRID_WANT: Array<[string, string, string, string]> = [
    ["", ".kp-jgrid", "display", "grid"], ["", ".kp-jgrid", "grid-template-columns", "minmax(0, 1fr)"], ["", ".kp-jgrid", "gap", "var(--sp-4)"],
    [AT640, ".kp-jgrid", "grid-template-columns", "repeat(2, minmax(0, 1fr))"], [AT1024, ".kp-jgrid", "grid-template-columns", "repeat(3, minmax(0, 1fr))"],
    ...SHARED.flatMap((sel): Array<[string, string, string, string]> => [[SUBGRID_AT, sel, "display", "grid"], [SUBGRID_AT, sel, "grid-row", "span 3"], [SUBGRID_AT, sel, "grid-template-rows", "subgrid"]]),
    ...["meta", "title", "act"].map((x): [string, string, string, string] => [SUBGRID_AT, `.kp-jgrid .kp-jcard__${x}`, "align-self", "start"]),
    [SUBGRID_AT, ".kp-jgrid .kp-jcard__act", "margin-block-start", "0"],
  ];
  const badGrid = GRID_WANT.filter(([at, sel, p, v]) => gridDecl(at, sel, p) !== v).map(([at, sel, p, v]) => `${at || "(none)"} ${sel} ${p}: ${gridDecl(at, sel, p)}, not ${v}`);
  const unfenced = sheet.filter((r) => !r.at.includes(SUBGRID_AT) && r.sels.some((s) => /kp-jgrid|kp-jcard/.test(s))
    && r.decls.some(([p, v]) => /^grid-template-rows$|^grid-template$|^grid$/.test(p) && v.includes("subgrid"))).map((r) => r.sels.join(", "));
  const strayAt = sheet.filter((r) => r.sels.some((s) => s.startsWith(".kp-jgrid")) && !["", AT640, AT1024, SUBGRID_AT].includes(r.at.join(" ")))
    .map((r) => `${r.at.join(" ")} ${r.sels.join(", ")}`);
  const ROWS_WANT = ["div kp-jcard__meta", "h kp-jcard__title", "div kp-jcard__act"];
  const rowsOf = (n: CardName) => cardChildren(R[n]).kids.filter((k) => !k.cls.includes("kp-jcard__open"))
    .map((k) => `${/^h[23]$/.test(k.tag) ? "h" : k.tag} ${k.cls.find((c) => c.startsWith("kp-jcard__")) ?? k.cls.join(".")}`);
  const badRows = CARD_NAMES.filter((n) => j(rowsOf(n)) !== j(ROWS_WANT) || cardChildren(R[n]).text.trim() !== "" || gridDecl(SUBGRID_AT, ".kp-jgrid > .kp-jcard", "grid-row") !== `span ${rowsOf(n).length}`)
    .map((n) => [n, rowsOf(n), cardChildren(R[n]).text.trim()]);
  ok("4.grid · A16 item 5: the one journey card grid (.kp-jgrid — one column, two from 640, three from 1024, 16px apart, min-width steps only) lets a row's cards SHARE their rows: where subgrid is supported, each card (or the list item that holds one) spans three of its tracks as a subgrid — the meta row, the question and the action block, the three rows every card draws — each at its track's top, the action block's auto margin reset, so a row's picks start on one line (S6's tickets the precedent); no subgrid outside the fence",
    badGrid.length === 0 && unfenced.length === 0 && strayAt.length === 0 && badRows.length === 0, j({ badGrid, unfenced, strayAt, badRows }));

  const COLOUR_PROP = /^(?:color|background(?:-color|-image)?|border(?:-[a-z]+)?|box-shadow|outline(?:-color)?|fill|stroke|text-shadow)$/;
  const LITERAL_INK = /oklch[(]|rgba?[(]|hsla?[(]|#[0-9a-fA-F]{3,8}(?![A-Za-z0-9_-])/;
  const offLadder = rules.flatMap((r) => r.decls.filter(([p, v]) => p === "font-size" && !/^var[(]--type-[a-z0-9-]+[)]$/.test(v)).map(([, v]) => `${r.sels.join(", ")} font-size: ${v}`));
  const literalInk = rules.flatMap((r) => r.decls.filter(([p, v]) => COLOUR_PROP.test(p) && LITERAL_INK.test(v)).map(([p, v]) => `${r.sels.join(", ")} ${p}: ${v}`));
  const important = rules.filter((r) => r.decls.some(([, v]) => v.includes("!important"))).map((r) => r.sels.join(", "));
  const TOKENS = ["--jcard-pad", "--jcard-gap", "--jcard-meta-line", "--jcard-title-line", "--jcard-act-h"];
  const tokenSites = TOKENS.map((t) => [t, rootDecl(t).length] as const);
  const readTokens = [...new Set(rules.flatMap((r) => r.decls.flatMap(([, v]) => v.match(/--jcard-[a-z0-9-]+/g) ?? [])))];
  const sideWord = declOf(sheet, ".kp-jcard__side", "font-size");
  ok("4.css · only the kit: every size in the card's and its grid's rules a --type-* rung (the call-site rungs ride on the markup), every ink a token, no !important, the side word on the h4 rung (A15), and the --jcard-* geometry declared once each — every token the rules read among them",
    offLadder.length === 0 && literalInk.length === 0 && important.length === 0 && sideWord === "var(--type-h4)"
      && tokenSites.every(([, n]) => n === 1) && readTokens.length > 0 && readTokens.every((t) => TOKENS.includes(t)),
    j({ offLadder, literalInk, important, sideWord, tokenSites, readTokens }));
}

/* ── what §1 reads for, spelled as the route file spells it ─────────────────────────────────────────────────── */
const DYNAMIC = 'export const dynamic = "force-dynamic";';
const GENERATE = "export async function generateMetadata(): Promise<Metadata> {";
const CANONICAL = 'alternates: { canonical: "/" },';
const SPREAD = 'openGraph: { ...ROOT_OPEN_GRAPH, url: "/" },';
const OG_IMPORT = 'import { ROOT_OPEN_GRAPH } from "./layout";';
const LANDING_IMPORT = 'import { LegacyLanding } from "@/components/home/legacy-landing";';
const CLASSIC_RETURN = "return <LegacyLanding searchParams={searchParams} />;";
const LANDING_EXPORT = "export async function LegacyLanding(";
/** A metadata export of either form. */
const METADATA_EXPORT = /export\s+(?:const\s+metadata(?![\w$])|(?:async\s+)?function\s+generateMetadata(?![\w$]))/g;
/** An import of the landing's body, static, dynamic or re-exported, by any specifier that ends in legacy-landing. */
const IMPORTS_LANDING = /(?:from|import)\s*[(]?\s*["'`][^"'`]*legacy-landing(?:[.]tsx)?["'`]/;
const DIRECTIVE = /["']use (?:client|server)["']/;

/* ══ §5 · THE HOW-TO CARD AND THE STATIC HOW-TO SHEET (S7 WP6) ═══════════════════════════════════════════════════════════
 * S7-PLAN WP6 steps 2-5, as A6 (no helpline on the sheet: the owner's ruling of 2026-10-06), A13(a) (the one lost-chunk
 * guard), A14 (the royal plate on the primary material's tokens), A15 (the 24px title) and A24 items 4-5 (the helpline's
 * readers were deleted 2026-10-09, so a read would name the config field) amend them, with Open points 18 (no storage),
 * 19 (a button, no URL), 20 (the kit's sheet, the cap, the fade) and 21 (the example's own 13%). WP7 mounts the card; in
 * WP6 no page renders it, so it is rendered HERE, in a test world, and read in source.
 * ⭐ Everything below is §5's own — its world, its readers, its checks and its plants — so S7 WP3's §2–§3 (written on their
 * own branch) and this block meet only at the World type, load(), run() and the plant list, one line each.
 * ⚠️ No escape a tool could decode: quotes and line breaks are built from their code points, patterns use classes. */
const HT_CARD = "src/components/journey/home/howto-card.tsx";
const HT_SHEET = "src/components/onboarding/how-to-play-sheet.tsx";
const HT_LAZY = "src/components/journey/home/home-lazy.tsx";
/** WP7's server home: the home's lazy module's one importer once it exists (absent in WP6, so nothing may import it yet). */
const HT_HOME = "src/components/journey/home/journey-home.tsx";
const HT_GUARD = "src/components/layout/lost-chunk.ts";
const HT_POPUP_FIT = "scripts/popup-fit.test.mts";
type HtLocale = "sw" | "en" | "zh";
const HT_LOCALES: readonly HtLocale[] = ["sw", "en", "zh"];
/** The home's deferred parts (WP6 step 2): the binding, the module next/dynamic loads, the component it picks from it. */
const HT_PARTS: ReadonlyArray<readonly [string, string, string]> = [
  ["LazyHowToCard", "@/components/journey/home/howto-card", "HowToCard"],
  ["LazyRefreshPoller", "@/components/ui/refresh-poller", "RefreshPoller"],
];
const htPartLine = ([binding, spec, symbol]: readonly [string, string, string]) =>
  `export const ${binding} = dynamic(() => import("${spec}").then((m) => m.${symbol}).catch(nothingIfLost));`;
/** The words a helpline is named by, in each language (`test:support-contact`'s HELPLINE_WORD, and the canvas's own). */
const HT_HELPLINE_WORD = /helpline|hotline|msaada wa tanzania|热线/i;
/** A read of the helpline: an old reader's call, or its config field named (A24 item 4: the readers went on 2026-10-09). */
const HT_HELPLINE_READ = /HELPLINE(?:_TEL)?[ ]*[(]|nationalHelpline/;
const HT_QUOTE = String.fromCharCode(34);
const HT_QUOTES = String.fromCharCode(34, 39, 96);

type HtDict = Record<HtLocale, Record<string, Record<string, string>>>;
/** What the checks hold the render to, read from the modules themselves — never typed here (SJ-21's deck figures aside). */
type HowToTruth = {
  dict: HtDict;
  /** `sideWord(t, "YES" | "NO", "MARKET")`, and the example's own side, in each language. */
  sides: Record<HtLocale, { yes: string; no: string; example: string }>;
  /** HOW_TO_EXAMPLE through `estimateFor`: the stake and the payout as `formatTzs` writes them, the multiple, and `{pct}`. */
  stake: string;
  mult: string;
  payout: string;
  pct: number | null;
};
type HowToRendered = {
  card: Partial<Record<HtLocale, string>>;
  sheetIn: Partial<Record<HtLocale, string>>;
  sheetOut: Partial<Record<HtLocale, string>>;
  /** A render that threw, named — or null. */
  error: string | null;
};
type HowToWorld = {
  card: string;
  sheet: string;
  lazy: string;
  guard: string;
  css: string;                   // src/app/globals.css, its comments blanked
  popupFit: string;              // scripts/popup-fit.test.mts, decommented: the review record the sheet must be on
  naming: Map<string, string>;   // every OTHER file under src/ whose text names one of the three modules: the census's subjects
  rendered: HowToRendered;
  truth: HowToTruth | null;
};

function loadHowTo(all: readonly string[]): HowToWorld {
  const own = new Set([HT_CARD, HT_SHEET, HT_LAZY]);
  const naming = new Map<string, string>();
  for (const rel of all) {
    if (own.has(rel)) continue;
    const s = read(rel);
    if (s.includes("home-lazy") || s.includes("howto-card") || s.includes("how-to-play-sheet")) naming.set(rel, s);
  }
  const { rendered, truth } = renderHowTo();
  return {
    card: read(HT_CARD), sheet: read(HT_SHEET), lazy: read(HT_LAZY), guard: read(HT_GUARD),
    css: decommentCss(read("src/app/globals.css")), popupFit: decomment(read(HT_POPUP_FIT)), naming, rendered, truth,
  };
}

/**
 * THE TEST WORLD (WP6's done-when: "the card and the sheet render in a test world"). The card, and the sheet open, drawn
 * by React's server renderer inside the app's i18n provider (with the router context it asks for), in sw, en and zh, the
 * sheet signed in and signed out.
 * ⭐ THE KIT MODAL IS STOOD IN FOR: it draws nothing until a browser has mounted it open (modal.tsx: a portal after a mount
 * effect), so here a stand-in draws the sheet's children in place, on an element that carries the props the sheet
 * handed it — the frame is read from what the sheet asked for. Everything is loaded through `require`, so the stand-in is
 * in the module cache before the sheet asks for the Modal, and the provider and the components share one React.
 */
function renderHowTo(): { rendered: HowToRendered; truth: HowToTruth | null } {
  const rendered: HowToRendered = { card: {}, sheetIn: {}, sheetOut: {}, error: null };
  try {
    const req = createRequire(import.meta.url);
    const React = req("react") as typeof import("react");
    const h = React.createElement;
    type ModalLike = { open: boolean; children?: unknown; sheet?: boolean; sheetUntil?: string; maxWidth?: number; panelClassName?: string; labelledBy?: string; showClose?: boolean; zIndex?: number };
    const StandIn = (p: ModalLike) => (p.open
      ? h("div", { "data-world-modal": j({ sheet: p.sheet ?? false, sheetUntil: p.sheetUntil ?? null, maxWidth: p.maxWidth ?? null, panelClassName: p.panelClassName ?? null, labelledBy: p.labelledBy ?? null, showClose: p.showClose ?? true, zIndex: p.zIndex ?? null }) }, p.children as never)
      : null);
    const modalAt = req.resolve("../src/components/ui/modal.tsx");
    const standIn = new NodeModule(modalAt);
    standIn.filename = modalAt;
    standIn.loaded = true;
    standIn.exports = { Modal: StandIn };
    (req.cache as Record<string, unknown>)[modalAt] = standIn;
    const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
    const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: unknown };
    const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
    const { HowToCard } = req("../src/components/journey/home/howto-card.tsx") as { HowToCard: unknown };
    const { HowToPlaySheet } = req("../src/components/onboarding/how-to-play-sheet.tsx") as { HowToPlaySheet: unknown };
    const router = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
    const draw = (l: HtLocale, type: unknown, props: object) =>
      renderToStaticMarkup(h(AppRouterContext.Provider, { value: router }, h(I18nProvider as never, { initial: l } as never, h(type as never, props as never))));
    for (const l of HT_LOCALES) {
      rendered.card[l] = draw(l, HowToCard, { signedIn: false });
      rendered.sheetIn[l] = draw(l, HowToPlaySheet, { open: true, onClose() {}, signedIn: true });
      rendered.sheetOut[l] = draw(l, HowToPlaySheet, { open: true, onClose() {}, signedIn: false });
    }
    const { dict } = req("../src/lib/i18n-dict.ts") as { dict: HtDict };
    const { sideWordIn } = req("../src/lib/side-label.ts") as { sideWordIn: (l: HtLocale, side: "YES" | "NO", line: "MARKET") => string };
    const est = req("../src/lib/markets/estimate.ts") as {
      estimateFor: (i: object) => { multText: string | null; payout: number | null } | null;
      HOW_TO_EXAMPLE: { stake: number; side: "YES" | "NO"; rates: object };
    };
    const { loserSharePct } = req("../src/lib/payout.ts") as { loserSharePct: (r: object) => number | null };
    const { formatTzs } = req("../src/lib/utils.ts") as { formatTzs: (n: number) => string };
    const e = est.estimateFor({ ...est.HOW_TO_EXAMPLE, bettable: true });
    const sides = Object.fromEntries(HT_LOCALES.map((l) => [l, {
      yes: sideWordIn(l, "YES", "MARKET"), no: sideWordIn(l, "NO", "MARKET"), example: sideWordIn(l, est.HOW_TO_EXAMPLE.side, "MARKET"),
    }])) as HowToTruth["sides"];
    return {
      rendered,
      truth: {
        dict, sides, stake: formatTzs(est.HOW_TO_EXAMPLE.stake), mult: e?.multText ?? "",
        payout: e?.payout == null ? "" : formatTzs(e.payout), pct: loserSharePct(est.HOW_TO_EXAMPLE.rates),
      },
    };
  } catch (err) {
    rendered.error = String((err as Error)?.stack ?? err).split(LF).slice(0, 3).join(" | ");
    return { rendered, truth: null };
  }
}

/** A rendered page's words: its tags out, React's five escapes read back. */
const htText = (html: string) => html.split(/<[^>]*>/).join("")
  .split("&#x27;").join("'").split("&quot;").join(HT_QUOTE).split("&lt;").join("<").split("&gt;").join(">").split("&amp;").join("&");
/** `{key}` filled from `vars`, every occurrence — the dictionary's own grammar (`fill`, src/lib/utils.ts). */
const htFill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), template);
/**
 * §5 reads the stylesheet as §4 does — as the cascade reads it (WP5's review, 2026-10-12): `cssRules` above parses it
 * and `declOf` gives a selector's LAST declaration of a property in any rule whose list holds it, under any at-rule, so a
 * later rule that re-sets one of §5's selectors is the one read, as a browser paints it. This is every declaration the
 * rules naming a selector write, in source order (the plate's "no literal colour" reads them all).
 */
const htDecls = (sheet: CssRule[], sel: string) => sheet.filter((r) => r.sels.includes(sel)).flatMap((r) => r.decls);
/** Just past the `</div>` that closes the `<div` opening at `at`, or -1. */
function htCloseOf(html: string, at: number): number {
  let depth = 0;
  for (let i = at; ;) {
    const open = html.indexOf("<div", i), close = html.indexOf("</div>", i);
    if (close < 0) return -1;
    if (open >= 0 && open < close) { depth++; i = open + 4; } else { depth--; i = close + 6; if (depth === 0) return i; }
  }
}
/** Whether a source imports `name` — static, dynamic or re-exported, by any specifier that ends in it. */
const htImports = (src: string, name: string) =>
  new RegExp(`(?:from|import)[ ]*[(]?[ ]*[${HT_QUOTES}][^${HT_QUOTES}]*${name}(?:[.]tsx?)?[${HT_QUOTES}]`).test(decomment(src));

type HtOk = (label: string, cond: boolean, extra?: string) => void;

function howToChecks(hw: HowToWorld, ok: HtOk) {
  const card = decomment(hw.card), sheet = decomment(hw.sheet), lazy = decomment(hw.lazy);
  const flat = (s: string) => s.split(LF).map((l) => l.trim()).join(" ");
  const cardFlat = flat(card), sheetFlat = flat(sheet);
  const r = hw.rendered, T = hw.truth;
  const sheets = HT_LOCALES.flatMap((l) => [[l, r.sheetIn[l] ?? ""], [l, r.sheetOut[l] ?? ""]] as Array<[HtLocale, string]>);
  // The stylesheet as the cascade leaves it (see htDecls): `cv` is a selector's last value for a property, or null.
  const cascade = cssRules(hw.css);
  const cv = (sel: string, prop: string) => declOf(cascade, sel, prop);

  // 5.render — WP6's done-when.
  const drawn = HT_LOCALES.every((l) => (r.card[l] ?? "").includes(`data-testid="journey-howto-card"`) && !(r.card[l] ?? "").includes("journey-howto-sheet"))
    && sheets.every(([, html]) => count(html, `data-testid="journey-howto-sheet"`) === 1);
  ok("5.render · the card and the sheet render in a test world: React's server renderer inside the i18n provider, in sw, en and zh, the sheet open signed in and signed out (the kit Modal stood in by one that draws its children in place) — and the card, closed, draws no sheet",
    r.error === null && T !== null && drawn, r.error ?? j({ drawn, truth: T !== null }));

  // 5.card — WP6 step 3; Correction 8; Open points 18 and 19.
  const cardSrc = card.trimStart().startsWith(`${HT_QUOTE}use client${HT_QUOTE}`) && count(card, "<button") === 1 && cardFlat.includes(`type="button"`)
    && cardFlat.includes(`aria-haspopup="dialog"`) && cardFlat.includes("aria-expanded={open}") && cardFlat.includes("onClick={() => setOpen(true)}")
    && cardFlat.includes(`data-testid="journey-howto-card"`) && card.includes("useState(false)")
    && card.includes("<HowToPlaySheet open={open} onClose={() => setOpen(false)} signedIn={signedIn} />")
    && !/<(?:a|Link)[ >]/.test(card) && !card.includes("href");
  const cardDrawn = HT_LOCALES.every((l) => (r.card[l] ?? "").startsWith(`<button type="button" aria-haspopup="dialog" aria-expanded="false" class="kp-jhowto" data-testid="journey-howto-card">`));
  ok(`5.card · the How-to card is a <button type="button" aria-haspopup="dialog"> with the test id journey-howto-card — never a link (the canvas's <a>, Correction 8; no URL, Open point 19) — holding open, rendering the sheet beside it with the server's signedIn and saying aria-expanded; drawn so in sw, en and zh`,
    cardSrc && cardDrawn, j({ cardSrc, cardDrawn }));

  // 5.plate — A14 items 2 and 4; Correction 22 (the glyph); the coordinator's decision of 2026-10-12 (its size): the kit
  // wins over the canvas (§0h point 7), so the glyph is the kit's for a 48px plate, plateGlyph(48) = 24, not the board's 20.
  const plateTag = cardFlat.match(/<IconPlate[^>]*>/)?.[0] ?? "";
  const PLATE = ".kp-jhowto__plate", plateDecls = htDecls(cascade, PLATE);
  const plateSrc = plateTag.includes("size={48}") && plateTag.includes(`className="kp-jhowto__plate"`) && !/[ ](?:bg|fg|border|style)=/.test(plateTag)
    && cardFlat.includes("<I.playBare s={plateGlyph(48)} />");
  const plateCss = cv(PLATE, "background") === "var(--wash-primary)" && cv(PLATE, "box-shadow") === "var(--edge-primary), var(--shadow-primary)"
    && cv(PLATE, "color") === "var(--pearl-50)" && !plateDecls.some(([, v]) => /oklch[(]|#[0-9a-fA-F]{3}|rgba?[(]|hsla?[(]/.test(v));
  const plateDrawn = HT_LOCALES.every((l) => (r.card[l] ?? "").includes(`class="grid shrink-0 place-items-center rounded-control kp-jhowto__plate" style="width:48px;height:48px"><svg viewBox="0 0 24 24" width="24" height="24" `));
  ok("5.plate · the royal plate (choice 3A, A14): a 48px IconPlate with the play glyph I.playBare at the kit's size for that plate, plateGlyph(48) — drawn 24px (the kit over the canvas's 20, §0h point 7) — and NO bg, fg, border or style, so no inline colour (drawn: its style is its size alone); .kp-jhowto__plate paints it, as the cascade leaves it, from the primary material's tokens (--wash-primary; --edge-primary and --shadow-primary, never the glow) with the glyph in --pearl-50, no literal colour in any rule that names it",
    plateSrc && plateCss && plateDrawn, j({ plateSrc, plateCss, plateDrawn, plate: plateDecls }));

  // 5.card.words — WP6 step 3: steps is the sheet's step count, minutes its named constant.
  const wordsSrc = card.includes("{t.journey.howToCardTitle}") && card.includes("fill(t.journey.howToCardMeta, { steps: HOW_TO_STEPS, minutes: HOW_TO_MINUTES })")
    && sheet.includes("export const HOW_TO_STEPS = STEPS.length;") && sheet.includes("export const HOW_TO_MINUTES = 1;");
  const wordsDrawn = T !== null && HT_LOCALES.every((l) => {
    const steps = count(r.sheetIn[l] ?? "", "<li ");
    return steps === 3 && htText(r.card[l] ?? "") === T.dict[l].journey.howToCardTitle + htFill(T.dict[l].journey.howToCardMeta, { steps, minutes: 1 });
  });
  ok("5.card.words · the card says journey.howToCardTitle over journey.howToCardMeta, its {steps} the sheet's own step count (HOW_TO_STEPS = the steps the sheet draws, 3) and its {minutes} the sheet's named constant (HOW_TO_MINUTES, the deck's dakika 1) — drawn in each language exactly",
    wordsSrc && wordsDrawn, j({ wordsSrc, wordsDrawn }));

  // 5.frame — WP6 step 4, the frame; Open point 20.
  const modalTag = sheetFlat.match(/<Modal[^>]*>/)?.[0] ?? "";
  const frameSrc = count(sheet, "<Modal") === 1
    && ["open={open}", "onClose={onClose}", "labelledBy={titleId}", " sheet ", `sheetUntil="lg"`, "maxWidth={440}", `panelClassName="kp-wsheet kp-howto"`].every((p) => modalTag.includes(p))
    && !modalTag.includes("zIndex") && !modalTag.includes("showClose") && sheet.includes("const titleId = useId();")
    && sheet.includes(`<div aria-hidden className="kp-wsheet__grab" />`) && sheet.includes(`data-testid="journey-howto-sheet"`);
  const frameOf = (html: string): Record<string, unknown> | null => {
    const m = /data-world-modal="([^"]*)"/.exec(html);
    if (!m) return null;
    try { return JSON.parse(m[1].split("&quot;").join(HT_QUOTE).split("&amp;").join("&")) as Record<string, unknown>; } catch { return null; }
  };
  const frameDrawn = sheets.every(([, html]) => {
    const f = frameOf(html);
    return f !== null && f.sheet === true && f.sheetUntil === "lg" && f.maxWidth === 440 && f.panelClassName === "kp-wsheet kp-howto"
      && f.showClose === true && f.zIndex === null && typeof f.labelledBy === "string" && html.includes(`<h2 id="${f.labelledBy}"`);
  });
  ok("5.frame · the kit's sheet (Open point 20): a bottom sheet below 1024 and a centred dialog 440 wide from it (sheet, sheetUntil lg, maxWidth 440), titled by its h2, on the default dialog rung (no zIndex: 100), with the kit's own ✕ (showClose untouched), the grab handle and the test id journey-howto-sheet, panelClassName kp-wsheet kp-howto",
    frameSrc && frameDrawn, j({ frameSrc, frameDrawn, modalTag }));

  // 5.order — §3.8's order (A6: it ends at Weka mipaka).
  const orderOf = (l: HtLocale, html: string) => {
    const grab = html.indexOf(`class="kp-wsheet__grab"`), h2 = html.indexOf("<h2 "), region = html.indexOf(`<div role="region"`);
    const end = region < 0 ? -1 : htCloseOf(html, region);
    const ol = html.indexOf(`<ol role="list"`), note = html.indexOf(`<div role="note"`), cta = html.indexOf("<button "), link = html.indexOf("<a ");
    const regionTag = region < 0 ? "" : html.slice(region, html.indexOf(">", region) + 1);
    return grab >= 0 && grab < h2 && h2 < region && region < ol && ol < note && note < end && end <= cta && cta < link
      && count(html, "<h2 ") === 1 && count(html, "<li ") === 3 && count(html, "<button ") === 1 && count(html, "<a ") === 1
      && regionTag.includes(`tabindex="0"`) && T !== null && regionTag.includes(`aria-label="${T.dict[l].journey.howStepsAria}"`);
  };
  const misordered = sheets.filter(([l, html]) => !orderOf(l, html)).map(([l]) => l);
  ok("5.order · in §3.8's order, and nothing else: the grab handle, the title (the dialog's one h2), the steps region (role region, tabindex 0, named by journey.howStepsAria) holding the three steps' list and then MFANO, then the CTA, then Weka mipaka — the sheet's one button and one link, both outside the region that scrolls",
    misordered.length === 0, j({ misordered }));

  // 5.title — A15 (and A24 item 6: the base rule's margin is computed from --type-h3).
  const LG = ".kp-jsheet__title--lg", lg = { size: cv(LG, "font-size"), line: cv(LG, "line-height"), top: cv(LG, "margin-top") };
  const titleSrc = count(sheet, `<h2 id={titleId} className="kp-jsheet__title kp-jsheet__title--lg">{t.journey.howToTitle}</h2>`) === 1;
  const titleCss = lg.size === "var(--type-h2)" && lg.line === "1.2" && lg.top === "calc(var(--sp-10) - var(--sp-8) - var(--type-h2) * 0.575)"
    && cv(".kp-jsheet__title", "font-size") === "var(--type-h3)";
  const titleDrawn = T !== null && sheets.every(([l, html]) => /<h2 id="[^"]+" class="kp-jsheet__title kp-jsheet__title--lg">/.test(html)
    && htText(html.slice(html.indexOf("<h2 "), html.indexOf("</h2>"))) === T.dict[l].journey.howToTitle);
  ok("5.title · the title is 24px, as its canvas draws it (A15): the h2 carries kp-jsheet__title AND kp-jsheet__title--lg, whose rule declares font-size var(--type-h2) in a 1.2 line and re-derives the base rule's top margin for that size (40 − 32 − 0.575em: its capitals on the ✕); the guest sheet's base rule keeps --type-h3",
    titleSrc && titleCss && titleDrawn, j({ titleSrc, titleCss, titleDrawn, lg }));

  // 5.steps — WP6 step 4 item 2; choice 1B.
  const stepKeys = ["howStep1Title", "howStep1Body", "howStep2Title", "howStep2Body", "howStep3Title", "howStep3Body"];
  const keyAt = stepKeys.map((k) => sheet.indexOf(`${HT_QUOTE}${k}${HT_QUOTE}`));
  const stepsSrc = keyAt.every((at, i) => at >= 0 && (i === 0 || at > keyAt[i - 1])) && stepKeys.every((k) => count(sheet, `${HT_QUOTE}${k}${HT_QUOTE}`) === 1)
    && sheet.includes(`sideWord(t, "YES", "MARKET")`) && sheet.includes(`sideWord(t, "NO", "MARKET")`) && sheet.includes(`sideWord(t, HOW_TO_EXAMPLE.side, "MARKET")`)
    && !/t[.]common[.](?:yes|no)(?![A-Za-z])|t[.]market[.]ud(?:Up|Down)/.test(sheet);
  const NUM = ".kp-howto__num";
  const badge = cv(NUM, "background") === "var(--bg-royal-soft)" && cv(NUM, "box-shadow") === "inset 0 0 0 1px var(--border-strong)" && cv(NUM, "color") === "var(--text)";
  const stepsDrawn = T !== null && sheets.every(([l, html]) => {
    const d = T.dict[l].journey, s = T.sides[l];
    const items = html.split("<li ").slice(1).map((li) => htText(`<li ${li.slice(0, li.indexOf("</li>"))}`));
    const want = [1, 2, 3].map((n) => `${n}${htFill(d[`howStep${n}Title`], s)}${htFill(d[`howStep${n}Body`], { ...s, mult: T.mult })}`);
    return j(items) === j(want);
  });
  ok("5.steps · the three steps are WP4's words in §3.8's order — each numeral, title and body exactly, in each language — their YES and NO the product's side words through sideWord (never common.yes or common.no read directly), on the neutral badge (choice 1B: --bg-royal-soft, an inset --border-strong ring, --text)",
    stepsSrc && badge && stepsDrawn, j({ stepsSrc, badge, stepsDrawn }));

  // 5.figures — WP6 step 4 item 3; Open point 21; SJ-21.
  const typed = ["2.7", "2,700", "2700", "2_700", "1,000", "1000", "1_000", "pct: 13"].filter((s) => sheet.includes(s));
  const figuresSrc = count(sheet, "estimateFor({ ...HOW_TO_EXAMPLE, bettable: true })") === 1 && count(sheet, "loserSharePct(HOW_TO_EXAMPLE.rates)") === 1
    && sheet.includes("formatTzs(HOW_TO_EXAMPLE.stake)") && sheet.includes("formatTzs(EXAMPLE.payout)") && typed.length === 0
    // the multiple is handed only to a step whose body writes {mult} (step 2): steps 1 and 3 get no figure to look for
    && sheet.includes(`const holdsMult = body.includes("{mult}");`) && sheetFlat.includes(`holdsMult ? [{ text: multUnit(body, mult), className: "kp-howto__mult" }] : []`);
  const golden = T !== null && T.stake === "TZS 1,000" && T.mult === "2.7" && T.payout === "TZS 2,700" && T.pct === 13;
  const figuresDrawn = T !== null && sheets.every(([, html]) => count(html, `<span class="amount">${T.stake}</span>`) === 1
    && count(html, `<span class="amount">${T.payout}</span>`) === 1 && count(html, `<span class="kp-howto__mult">≈${T.mult}×</span>`) === 2
    && htText(html.slice(html.indexOf(`class="kp-howto__note`))).includes(`${T.pct}%`));
  ok("5.figures · every figure is the engine's: HOW_TO_EXAMPLE through estimateFor and {pct} from loserSharePct(HOW_TO_EXAMPLE.rates), none typed in the sheet — SJ-21's TZS 1,000 → ≈2.7× → TZS 2,700 at 13% — drawn with the two sums as .amount spans and the multiple one mono unit with its ≈ and × (step 2 and MFANO), handed only to the step whose words write {mult}",
    figuresSrc && golden && figuresDrawn, j({ figuresSrc, typed, golden, figuresDrawn, truth: T && { stake: T.stake, mult: T.mult, payout: T.payout, pct: T.pct } }));

  // 5.helpline — A6 item 4; A24 item 4.
  const paths = [...new Set([...`${card}${LF}${sheet}`.matchAll(/(?<![A-Za-z0-9_$.])t(?:[.][A-Za-z0-9_]+)+/g)].map((m) => m[0].slice(2)))]
    .concat([...sheet.matchAll(/(?:title|body): "([A-Za-z0-9]+)"/g)].map((m) => `journey.${m[1]}`));
  const enOf = (path: string) => (T === null ? "" : String(path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], T.dict.en)));
  const named = T === null ? ["the dictionary was not read"] : paths.filter((p) => HT_HELPLINE_WORD.test(enOf(p)));
  const helplineSrc = [card, sheet].every((s) => !HT_HELPLINE_READ.test(s) && !s.includes("0800") && !s.includes("tel:")) && named.length === 0;
  const helplineDrawn = sheets.every(([, html]) => {
    const words = htText(html).toLowerCase();
    return !HT_HELPLINE_WORD.test(words) && !words.includes("0800") && !html.includes("tel:");
  });
  ok("5.helpline · NO helpline on the sheet (the owner's ruling of 2026-10-06; A6): the card's and the sheet's decommented source read neither nationalHelpline nor nationalHelplineTel (nor the deleted HELPLINE()/HELPLINE_TEL(), A24 item 4), hold no 0800 and no tel: link, and render no label whose English names a helpline; drawn, no language says one",
    helplineSrc && helplineDrawn, j({ helplineSrc, named, helplineDrawn, labels: paths.length }));

  // 5.limits — A6 item 1: Weka mipaka alone.
  const limitsSrc = sheet.includes(`const LIMITS = { signedIn: "/profile/responsible-gambling", signedOut: "/legal/responsible-gambling" } as const;`)
    && sheetFlat.includes(`<Link href={signedIn ? LIMITS.signedIn : LIMITS.signedOut} onClick={onClose} className="kp-wsheet__link">`)
    && sheet.includes("{t.rg.setLimits}") && count(sheet, "<Link") === 1 && cv(".kp-wsheet__link", "min-height") === "var(--h-control-md)";
  const linkOf = (html: string) => html.slice(html.indexOf("<a "), html.indexOf("</a>") + 4);
  const limitsDrawn = T !== null && HT_LOCALES.every((l) => {
    const signedIn = linkOf(r.sheetIn[l] ?? ""), guest = linkOf(r.sheetOut[l] ?? "");
    return signedIn.includes(`href="/profile/responsible-gambling"`) && guest.includes(`href="/legal/responsible-gambling"`)
      && htText(signedIn) === T.dict[l].rg.setLimits && htText(guest) === T.dict[l].rg.setLimits;
  });
  ok("5.limits · Weka mipaka (rg.setLimits) is the sheet's one link (A6): /profile/responsible-gambling for a signed-in reader and /legal/responsible-gambling for a guest — the card hands the sheet signedIn from the server — at least 44px (the Wallet's link, --h-control-md), and it closes the sheet as it navigates",
    limitsSrc && limitsDrawn, j({ limitsSrc, limitsDrawn }));

  // 5.cta — WP6 step 4 item 4; test:ui-consistency's rule (the kit Button, never a raw btn button).
  const ctaSrc = sheetFlat.includes(`<Button type="button" variant="primary" size="lg" className="kp-wsheet__act" onClick={onClose}> {t.journey.howCta} </Button>`)
    && !sheet.includes("<button") && cv(".kp-wsheet__act", "width") === "100%";
  const ctaDrawn = T !== null && sheets.every(([l, html]) => {
    const at = html.indexOf("<button ");
    return html.slice(at, html.indexOf(">", at) + 1) === `<button class="btn btn-primary btn-lg kp-wsheet__act" type="button">`
      && htText(html.slice(at, html.indexOf("</button>", at))) === T.dict[l].journey.howCta;
  });
  ok(`5.cta · "Nimeelewa, anza" (journey.howCta) is a full-width kit Button in the primary material (the Wallet's 56px sheet action), and it closes the sheet — never a raw btn button`,
    ctaSrc && ctaDrawn, j({ ctaSrc, ctaDrawn }));

  // 5.storage — Open point 18.
  const STORES = ["localStorage", "sessionStorage", "document.cookie", "indexedDB"];
  const writes = ([[HT_CARD, card], [HT_SHEET, sheet], [HT_LAZY, lazy]] as Array<[string, string]>)
    .flatMap(([f, s]) => STORES.filter((w) => s.includes(w)).map((w) => `${f}: ${w}`));
  ok("5.storage · nothing writes to storage: no localStorage, sessionStorage, cookie or IndexedDB in the card, the sheet or the home's lazy module — no seen key (Open point 18: it is S11's, with the auto-open), so Privacy §7 is unchanged",
    writes.length === 0, j(writes));

  // 5.cap — WP6 step 4, sizing; Open point 20. The chain the cap runs down is the block's own (the review of 2026-10-12):
  // the panel a flex column itself, never leaning on .kp-wsheet; the sheet in it a flex column that may shrink below its
  // content (min-height: 0 — without it the sheet keeps its content's height and runs out of the capped panel); in that,
  // the steps region alone gives way. Each value as the cascade leaves it (null: no rule declares it).
  const CAP: Array<[string, string, string | null]> = [
    [".kp-howto", "display", "flex"], [".kp-howto", "flex-direction", "column"], [".kp-howto", "max-height", "calc(100dvh - var(--sp-12))"],
    [".kp-howto__sheet", "display", "flex"], [".kp-howto__sheet", "flex-direction", "column"], [".kp-howto__sheet", "min-height", "0"],
    [".kp-howto__sheet > *", "flex-shrink", "0"],
    [".kp-howto__scroll", "flex-shrink", "1"], [".kp-howto__scroll", "min-height", "0"], [".kp-howto__scroll", "overflow-y", "auto"],
    [".kp-howto__scroll", "overscroll-behavior", "contain"], [".kp-howto__scroll", "mask-image", null], [".kp-howto__scroll", "-webkit-mask-image", null],
    [".kp-howto__scroll:focus-visible", "mask-image", "none"], [".kp-howto__scroll:focus-visible", "-webkit-mask-image", "none"],
  ];
  const capDrift = CAP.filter(([sel, prop, v]) => cv(sel, prop) !== v).map(([sel, prop, v]) => `${sel} { ${prop} } is ${cv(sel, prop)}, not ${v}`);
  const fades = ["end", "start", "both"].map((e) => `.kp-howto__scroll[data-edges=${HT_QUOTE}${e}${HT_QUOTE}]`);
  const fadeDrift = fades.filter((f) => !(cv(f, "mask-image") ?? "").startsWith("linear-gradient(to bottom,") || cv(f, "-webkit-mask-image") !== cv(f, "mask-image"));
  const capCss = capDrift.length === 0 && fadeDrift.length === 0;
  const capSrc = sheet.includes(`panelClassName="kp-wsheet kp-howto"`) && sheet.includes(`<div className="kp-howto__sheet" data-testid="journey-howto-sheet">`)
    && sheetFlat.includes(`<div ref={ref} role="region" tabIndex={0} aria-label={label} className="kp-howto__scroll">`)
    && sheet.includes(`el.setAttribute("data-edges", edges)`) && ["el.scrollHeight", "el.clientHeight", "el.scrollTop"].every((x) => sheet.includes(x));
  ok("5.cap · the cap is on the panel, in CSS: .kp-howto holds it to the viewport less 48px (calc(100dvh - var(--sp-12)), the first-visit primer's fixed gutter) and is a flex column itself, never leaning on .kp-wsheet; the sheet inside it a flex column that may shrink (.kp-howto__sheet: display flex, flex-direction column, min-height 0); the rest of the sheet never shrinks and the steps region alone gives way and scrolls, its own scroll held; a fade only at an edge that hides something (data-edges, read from the region), none on a region that fits or holds keyboard focus",
    capCss && capSrc, j({ capCss, capSrc, capDrift, fadeDrift }));

  // 5.mfano — WP6 step 4 item 3; Open point 20 (the kit Callout tone="info"). The label's ink is the one section ink, Ali's
  // ruling (3) of 2026-10-10 (`test:visual-pass-r8b` §1 holds every eyebrow to it), which the canvas's info-blue predates.
  const mfanoSrc = count(sheet, `<Callout tone="info" className="kp-howto__ex">`) === 1
    && sheet.includes(`<p className="kp-howto__ex-label eyebrow font-mono text-caption font-semibold uppercase text-text-subtle">{t.journey.howExampleLabel}</p>`)
    && sheet.includes("{noticeBody(fill(t.journey.estimateNote, { pct: PCT }))}");
  const mfanoDrawn = T !== null && sheets.every(([l, html]) => {
    const at = html.indexOf(`<div role="note"`), end = at < 0 ? -1 : htCloseOf(html, at);
    const d = T.dict[l].journey;
    const want = d.howExampleLabel + htFill(d.howExampleBody, { stake: T.stake, side: T.sides[l].example, mult: T.mult, payout: T.payout })
      + htFill(d.estimateNote, { pct: T.pct ?? "" });
    return at >= 0 && end > at && html.slice(at, html.indexOf(">", at)).includes("border-info-border bg-info-bg") && htText(html.slice(at, end)) === want;
  });
  ok("5.mfano · MFANO is the kit Callout tone=info: its label an .eyebrow in the one section ink, --text-subtle (journey.howExampleLabel), the example (journey.howExampleBody, its side the example's own side word), then the estimate's note (journey.estimateNote) — each exactly, in each language",
    mfanoSrc && mfanoDrawn, j({ mfanoSrc, mfanoDrawn }));

  // 5.eyebrow.zh — qa:dg-eyebrow's rule for a Chinese label.
  const ZH = ".kp-howto__ex-label:lang(zh)", zh = { face: cv(ZH, "font-family"), tracking: cv(ZH, "letter-spacing"), transform: cv(ZH, "text-transform") };
  ok("5.eyebrow.zh · MFANO's label is uppercase and mono for Latin words, and for zh 示例 neither, nor tracked: .kp-howto__ex-label:lang(zh) sets the body face, no letter-spacing and no transform",
    zh.face === "var(--font-body)" && zh.tracking === "0" && zh.transform === "none", j(zh));

  // 5.lazy — WP6 step 2; A13(a).
  const statics = [...lazy.matchAll(/^[ ]*import[ ]+([^;]*?)[ ]+from[ ]+"([^"]+)";/gm)].map((m) => `${m[1].trim()} from ${m[2]}`);
  const lazyShape = lazy.trimStart().startsWith(`${HT_QUOTE}use client${HT_QUOTE}`)
    && j(statics) === j(["dynamic from next/dynamic", "{ nothingIfLost } from @/components/layout/lost-chunk"])
    && HT_PARTS.every((p) => count(lazy, htPartLine(p)) === 1) && count(lazy, "export ") === HT_PARTS.length && count(lazy, "dynamic(") === HT_PARTS.length
    && !["ssr", "loading", "suspense"].some((w) => lazy.includes(w)) && !lazy.includes("function nothingIfLost(")
    && decomment(hw.guard).includes("export function nothingIfLost(");
  const subjects: Array<[string, string]> = [[HT_CARD, hw.card], [HT_SHEET, hw.sheet], [HT_LAZY, hw.lazy], ...hw.naming];
  const importersOf = (name: string) => subjects.filter(([f]) => f !== HT_LAZY || name !== "home-lazy").filter(([, s]) => htImports(s, name)).map(([f]) => f).sort();
  const lazyHome = importersOf("home-lazy"), cardHome = importersOf("howto-card"), sheetHome = importersOf("how-to-play-sheet");
  const homeFiles = subjects.filter(([f]) => f.startsWith("src/components/journey/home/") && f !== HT_LAZY && f !== HT_CARD);
  const around = homeFiles.filter(([, s]) => htImports(s, "refresh-poller") || htImports(s, "howto-card")).map(([f]) => f);
  ok("5.lazy · the home's lazy module is client code whose static imports are next/dynamic and the app's one lost-chunk guard, declaring exactly its parts (LazyHowToCard, LazyRefreshPoller), each one line with no option object, its loader ending in .catch(nothingIfLost); it is the card's one loader (the sheet's is the card), no other home file reaches a part around it, and only journey-home.tsx (WP7) may import it",
    lazyShape && lazyHome.every((f) => f === HT_HOME) && j(cardHome) === j([HT_LAZY]) && j(sheetHome) === j([HT_CARD]) && around.length === 0,
    j({ lazyShape, statics, lazyHome, cardHome, sheetHome, around }));

  // 5.popup — WP6 step 5; A13's pattern (popup-review.mts).
  const record = reviewedIn(hw.popupFit);
  const gaps = reviewGaps([HT_SHEET], record);
  ok("5.popup · the sheet is on test:popup-fit's review record by name (a popup no one judged against Ali's rule fails here too), and the card itself renders no popup primitive",
    record.length > 50 && gaps.unreviewed.length === 0 && IS_POPUP.test(sheet) && !IS_POPUP.test(card), j({ unreviewed: gaps.unreviewed, record: record.length }));
}

/* ── §5's plants: each one defect, in memory, on the source, the stylesheet, the record or the render ─────────────── */
type HtPlant = { name: string; expect: RegExp; plant: (w: World) => World };
/** One swap on a copy of a text. ⛔ An anchor that does not resolve exactly once THROWS: a broken plant, never a miss. */
function htSwap(text: string, from: string, to: string): string {
  const n = count(text, from);
  if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times, not once: ${from}`);
  return text.replace(from, () => to);
}
const htWith = (w: World, edit: Partial<HowToWorld>): World => ({ ...w, howto: { ...w.howto, ...edit } });
const htDrawn = (w: World, which: "card" | "sheetIn" | "sheetOut", l: HtLocale, edit: (html: string) => string): World =>
  htWith(w, { rendered: { ...w.howto.rendered, [which]: { ...w.howto.rendered[which], [l]: edit(w.howto.rendered[which][l] ?? "") } } });
const htCard = (from: string, to: string) => (w: World) => htWith(w, { card: htSwap(w.howto.card, from, to) });
const htSheet = (from: string, to: string) => (w: World) => htWith(w, { sheet: htSwap(w.howto.sheet, from, to) });
const htCss = (from: string, to: string) => (w: World) => htWith(w, { css: htSwap(w.howto.css, from, to) });
const htLazy = (from: string, to: string) => (w: World) => htWith(w, { lazy: htSwap(w.howto.lazy, from, to) });
const htNamed = (rel: string, text: string) => (w: World) => htWith(w, { naming: new Map(w.howto.naming).set(rel, text) });

function howToDefects(): HtPlant[] {
  const CTA = `<button class="btn btn-primary btn-lg kp-wsheet__act" type="button">`;
  return [
    { name: "the sheet does not render in Chinese (a missing word, a throw)", expect: /^5[.]render /,
      plant: (w) => htDrawn(w, "sheetOut", "zh", () => "") },
    // (Anchored on the line's own break: the card's header names `<button aria-haspopup="dialog">` too.)
    { name: "the card loses aria-haspopup (a screen reader is not told it opens a dialog)", expect: /^5[.]card /,
      plant: htCard(`aria-haspopup="dialog"${LF}`, LF) },
    { name: "the card is a link to /?howto=1 (the canvas's <a>, S11's URL)", expect: /^5[.]card /,
      plant: (w) => htWith(w, { card: htSwap(htSwap(w.howto.card, `<button${LF}`, `<a href="/?howto=1"${LF}`), "</button>", "</a>") }) },
    { name: "the plate painted by an inline colour prop", expect: /^5[.]plate /,
      plant: htCard(`<IconPlate size={48} className="kp-jhowto__plate"`, `<IconPlate size={48} bg="var(--royal-500)" className="kp-jhowto__plate"`) },
    { name: "a literal oklch in the plate's rule (A14 item 4: a second definition of the primary material)", expect: /^5[.]plate /,
      plant: htCss(".kp-jhowto__plate { background: var(--wash-primary);", ".kp-jhowto__plate { background: oklch(53% 0.20 268);") },
    // (Read as the cascade reads it: a LATER rule that re-sets the selector is the one painted — WP5's review.)
    { name: "a later rule repaints the plate in the gold ramp (its own rule left untouched)", expect: /^5[.]plate /,
      plant: (w) => htWith(w, { css: `${w.howto.css}${LF}.kp-jhowto__plate { background: var(--g-gold); }${LF}` }) },
    { name: "the play glyph typed at the board's 20px (the kit's plateGlyph(48) is 24; §0h point 7)", expect: /^5[.]plate /,
      plant: htCard("<I.playBare s={plateGlyph(48)} />", "<I.playBare s={20} />") },
    { name: "the play glyph drawn 20px on its 48px plate", expect: /^5[.]plate /,
      plant: (w) => htDrawn(w, "card", "zh", (html) => htSwap(html, `style="width:48px;height:48px"><svg viewBox="0 0 24 24" width="24" height="24" `, `style="width:48px;height:48px"><svg viewBox="0 0 24 24" width="20" height="20" `)) },
    { name: "the card's minutes typed instead of read from the sheet", expect: /^5[.]card[.]words /,
      plant: htCard("minutes: HOW_TO_MINUTES", "minutes: 1") },
    // (Anchored on its line: the sheet's header quotes the Modal's props too.)
    { name: "the sheet 480 wide, the canvas's (Open point 20: the kit's 440)", expect: /^5[.]frame /,
      plant: htSheet(`${LF}      maxWidth={440}`, `${LF}      maxWidth={480}`) },
    { name: "the kit's ✕ withheld for a hand-drawn one", expect: /^5[.]frame /,
      plant: htSheet(`panelClassName="kp-wsheet kp-howto"`, `panelClassName="kp-wsheet kp-howto" showClose={false}`) },
    { name: "the CTA drawn above the steps (§3.8's order broken)", expect: /^5[.]order /,
      plant: (w) => htDrawn(w, "sheetIn", "en", (html) => {
        const at = html.indexOf(CTA), cta = html.slice(at, html.indexOf("</button>", at) + 9);
        return htSwap(htSwap(html, cta, ""), `<div role="region"`, `${cta}<div role="region"`);
      }) },
    { name: "the title's 24px modifier dropped from the h2 (A15)", expect: /^5[.]title /,
      plant: htSheet(`className="kp-jsheet__title kp-jsheet__title--lg"`, `className="kp-jsheet__title"`) },
    { name: "the modifier's size re-pointed to --type-h3 (A15)", expect: /^5[.]title /,
      plant: htCss("font-size: var(--type-h2); line-height: 1.2; }", "font-size: var(--type-h3); line-height: 1.2; }") },
    { name: "YES read straight from common.yes (an Up & Down reader would read YES for UP)", expect: /^5[.]steps /,
      plant: htSheet(`yes: sideWord(t, "YES", "MARKET")`, "yes: t.common.yes") },
    { name: "steps 2 and 3 swapped", expect: /^5[.]steps /,
      plant: htSheet(`{ title: "howStep2Title", body: "howStep2Body" },${LF}  { title: "howStep3Title", body: "howStep3Body" },`,
        `{ title: "howStep3Title", body: "howStep3Body" },${LF}  { title: "howStep2Title", body: "howStep2Body" },`) },
    { name: "the multiple typed in the sheet (2.7)", expect: /^5[.]figures /,
      plant: htSheet("mult: EXAMPLE.multText", `mult: "2.7"`) },
    { name: "{pct} typed as 13 instead of the example's own loser-share", expect: /^5[.]figures /,
      plant: htSheet("const PCT = loserSharePct(HOW_TO_EXAMPLE.rates);", "const PCT = 13;") },
    { name: "the multiple handed to every step's body (steps 1 and 3 write no {mult})", expect: /^5[.]figures /,
      plant: htSheet(`holdsMult ? [{ text: multUnit(body, mult), className: "kp-howto__mult" }] : []`, `FIGURES ? [{ text: multUnit(body, mult), className: "kp-howto__mult" }] : []`) },
    { name: "the payout drawn bare, not as one .amount figure", expect: /^5[.]figures /,
      plant: (w) => htDrawn(w, "sheetOut", "sw", (html) => htSwap(html, `<span class="amount">TZS 2,700</span>`, "TZS 2,700")) },
    { name: "the helpline put back: a tel: link on the config field (A6, A24 item 4)", expect: /^5[.]helpline /,
      plant: htSheet(`<div className="kp-howto__foot">`, `<div className="kp-howto__foot"><a href={"tel:" + getSupportConfig().nationalHelplineTel}>{getSupportConfig().nationalHelpline}</a>`) },
    { name: "the English sheet says Helpline 0800 11 0011", expect: /^5[.]helpline /,
      plant: (w) => htDrawn(w, "sheetIn", "en", (html) => `${html}<p>Helpline 0800 11 0011</p>`) },
    { name: "Weka mipaka sends a guest to the signed-in limits page", expect: /^5[.]limits /,
      plant: htSheet("signedIn ? LIMITS.signedIn : LIMITS.signedOut", "LIMITS.signedIn") },
    { name: "the guest's sheet drawn with the signed-in door", expect: /^5[.]limits /,
      plant: (w) => htDrawn(w, "sheetOut", "sw", (html) => htSwap(html, `href="/legal/responsible-gambling"`, `href="/profile/responsible-gambling"`)) },
    { name: "the CTA a raw btn button (test:ui-consistency's rule)", expect: /^5[.]cta /,
      plant: (w) => htWith(w, { sheet: htSwap(htSwap(w.howto.sheet, `<Button type="button" variant="primary" size="lg" className="kp-wsheet__act" onClick={onClose}>`,
        `<button type="button" className="btn btn-primary btn-lg kp-wsheet__act" onClick={onClose}>`), "</Button>", "</button>") }) },
    { name: "the CTA no longer closes the sheet", expect: /^5[.]cta /,
      plant: htSheet(`className="kp-wsheet__act" onClick={onClose}>`, `className="kp-wsheet__act">`) },
    { name: "a seen key written on open (S11's, Open point 18)", expect: /^5[.]storage /,
      plant: htSheet("const titleId = useId();", `const titleId = useId();${LF}  localStorage.setItem("50pick-howto-seen", "1");`) },
    { name: "a later rule lifts the panel's cap from 1024 (an at-rule after it: max-height none)", expect: /^5[.]cap /,
      plant: (w) => htWith(w, { css: `${w.howto.css}${LF}@media (min-width: 1024px) { .kp-howto { max-height: none; } }${LF}` }) },
    { name: "the panel's cap dropped (a tall sheet's top unreachable on a short phone)", expect: /^5[.]cap /,
      plant: htCss(".kp-howto { display: flex; flex-direction: column; max-height: calc(100dvh - var(--sp-12)); }", ".kp-howto { display: flex; flex-direction: column; }") },
    { name: "the panel no flex column of its own (the cap's chain leaning on .kp-wsheet again)", expect: /^5[.]cap /,
      plant: htCss(".kp-howto { display: flex; flex-direction: column; max-height:", ".kp-howto { max-height:") },
    { name: "min-height: 0 dropped from .kp-howto__sheet (the sheet keeps its content's height and runs out of the capped panel)", expect: /^5[.]cap /,
      plant: htCss(".kp-howto__sheet { display: flex; flex-direction: column; gap: var(--sp-4); min-height: 0; }", ".kp-howto__sheet { display: flex; flex-direction: column; gap: var(--sp-4); }") },
    { name: "the steps region no longer scrolls", expect: /^5[.]cap /,
      plant: htCss("overflow-y: auto; overscroll-behavior: contain; }", "overscroll-behavior: contain; }") },
    { name: "a fade drawn on every region, whether it hides anything or not", expect: /^5[.]cap /,
      plant: htCss(".kp-howto__scroll { display: flex;", ".kp-howto__scroll { mask-image: linear-gradient(to bottom, #000 80%, transparent); display: flex;") },
    { name: "MFANO a hand-rolled box instead of the kit Callout", expect: /^5[.]mfano /,
      plant: (w) => htWith(w, { sheet: htSwap(htSwap(w.howto.sheet, `<Callout tone="info" className="kp-howto__ex">`, `<div className="kp-howto__ex">`), "</Callout>", "</div>") }) },
    { name: "the Chinese label left mono and tracked (示例 spaced apart)", expect: /^5[.]eyebrow[.]zh /,
      plant: htCss(".kp-howto__ex-label:lang(zh) { font-family: var(--font-body); letter-spacing: 0; text-transform: none; }", "") },
    { name: "the How-to card loaded with ssr: false (its HTML leaves the home's first paint)", expect: /^5[.]lazy /,
      plant: htLazy(".then((m) => m.HowToCard).catch(nothingIfLost));", ".then((m) => m.HowToCard).catch(nothingIfLost), { ssr: false });") },
    { name: "a part's loader drops the lost-chunk guard", expect: /^5[.]lazy /,
      plant: htLazy(".then((m) => m.RefreshPoller).catch(nothingIfLost));", ".then((m) => m.RefreshPoller));") },
    { name: "a classic file imports the card statically (its code in every visitor's first load of /)", expect: /^5[.]lazy /,
      plant: htNamed("src/components/home/legacy-landing.tsx", `import { HowToCard } from "@/components/journey/home/howto-card";${LF}`) },
    { name: "a classic page imports the home's lazy module", expect: /^5[.]lazy /,
      plant: htNamed("src/app/markets/page.tsx", `import { LazyHowToCard } from "@/components/journey/home/home-lazy";${LF}`) },
    { name: "the sheet leaves test:popup-fit's review record (A13's pattern)", expect: /^5[.]popup /,
      plant: (w) => htWith(w, { popupFit: htSwap(w.howto.popupFit, `"src/components/onboarding/how-to-play-sheet.tsx",`, "") }) },
  ];
}

function run(w: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  const page = decomment(w.page), landing = decomment(w.landing), layout = decomment(w.layout);
  const lineCount = (s: string, want: string) => s.split(LF).filter((l) => l.trim() === want).length;

  /* §1 · the route file (S7 WP2) */
  ok(`1.dynamic · the route file exports dynamic = "force-dynamic", once, and the landing's body declares no route config of its own`,
    lineCount(page, DYNAMIC) === 1 && count(page, "export const dynamic") === 1 && count(landing, "export const dynamic") === 0,
    j({ spelled: lineCount(page, DYNAMIC), route: count(page, "export const dynamic"), body: count(landing, "export const dynamic") }));

  const routeMeta = (page.match(METADATA_EXPORT) ?? []).length, bodyMeta = (landing.match(METADATA_EXPORT) ?? []).length;
  ok("1.metadata · the metadata is the route file's: one generateMetadata in src/app/page.tsx, and no metadata export in the landing's body (Next reads metadata from a route file only)",
    count(page, GENERATE) === 1 && routeMeta === 1 && bodyMeta === 0, j({ generate: count(page, GENERATE), route: routeMeta, body: bodyMeta }));

  const at = page.indexOf(GENERATE);
  const meta = at < 0 ? "" : page.slice(at, page.indexOf(LF + "}", at) + 2);
  ok(`1.spelled · "/" is its own canonical and the root layout's open graph is SPREAD, never replaced: alternates: { canonical: "/" } and openGraph: { ...ROOT_OPEN_GRAPH, url: "/" }, inside generateMetadata, each once`,
    meta.includes(CANONICAL) && meta.includes(SPREAD) && count(page, "alternates:") === 1 && count(page, "openGraph:") === 1,
    meta ? j({ canonical: meta.includes(CANONICAL), spread: meta.includes(SPREAD), alternates: count(page, "alternates:"), openGraph: count(page, "openGraph:") })
      : "no generateMetadata body in the route file");

  const layoutDefines = /export const ROOT_OPEN_GRAPH(?![\w$])/.test(layout);
  ok(`1.layout · ROOT_OPEN_GRAPH comes from "./layout", the root layout's one definition, and the route keeps no copy of its own`,
    lineCount(page, OG_IMPORT) === 1 && !/(?:const|let|var|function|class)\s+ROOT_OPEN_GRAPH(?![\w$])/.test(page) && layoutDefines,
    j({ imported: lineCount(page, OG_IMPORT), layoutDefines }));

  const def = page.indexOf("export default ");
  ok("1.return · the default export's one classic return is <LegacyLanding searchParams={searchParams} />, and the route draws LegacyLanding nowhere else",
    def >= 0 && count(page, CLASSIC_RETURN) === 1 && page.indexOf(CLASSIC_RETURN) > def && count(page, "<LegacyLanding") === 1
      && lineCount(page, LANDING_IMPORT) === 1,
    j({ defaultExport: def >= 0, returns: count(page, CLASSIC_RETURN), drawn: count(page, "<LegacyLanding"), imported: lineCount(page, LANDING_IMPORT) }));

  ok("1.landing · the landing's body is legacy-landing.tsx, an async function exported by name (export async function LegacyLanding), with no default export",
    count(landing, LANDING_EXPORT) === 1 && !/export\s+default(?![\w$])/.test(landing) && landing.length > 5_000,
    j({ named: count(landing, LANDING_EXPORT), chars: landing.length }));

  const directive = landing.match(DIRECTIVE)?.[0] ?? null;
  ok("1.directive · legacy-landing.tsx carries no directive: an async SERVER component, as the route's body was",
    landing.length > 0 && directive === null, directive ?? "the file was not read");

  const subjects: Array<[string, string]> = [[PAGE, w.page], ...w.naming];
  const importers = subjects.filter(([, s]) => IMPORTS_LANDING.test(decomment(s))).map(([rel]) => rel).sort();
  ok("1.importers · only src/app/page.tsx imports legacy-landing.tsx (a census over every file under src/): the route is the body's one mount",
    w.walked >= 500 && j(importers) === j([PAGE]), j({ walked: w.walked, importers }));

  /* §2 · the home's list (S7 WP3) */
  homeListChecks(w.rules, ok);
  /* §3 · the card's face (S7 WP3) */
  cardFaceChecks(w.rules, ok);
  /* §4 · the journey card (S7 WP5) */
  journeyCardChecks(w, ok);
  /* §5 · the How-to card and the static How-to sheet (S7 WP6) — its own block, above */
  howToChecks(w.howto, ok);
  return failed;
}

/** One swap on a copy of a text. ⛔ An anchor that no longer resolves exactly once THROWS, so a plant that changed nothing
 *  is reported as a broken plant, never as a check that missed it. */
function swap(text: string, from: string, to: string) {
  const n = count(text, from);
  if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times, not once: ${from}`);
  return text.replace(from, () => to);
}

/**
 * §2 and §3's plants: each swaps ONE rule for a copy of the real one carrying one defect, and must turn its own check red
 * and no other (`alone`). The copies wrap the real export, so every plant is the real rule with exactly one thing wrong.
 */
function ruleDefects(): Array<{ name: string; expect: RegExp; plant: (w: World) => World; alone: true }> {
  const R = RULES;
  const rule = (w: World, swapIn: Partial<Rules>): World => ({ ...w, rules: { ...w.rules, ...swapIn } });
  const byIdIn = <T extends { id: string }>(originals: readonly T[]) => (x: { id: string }) => originals.find((m) => m.id === x.id) as T;
  /** Each open pick's face remapped from its side's estimate; closed and settled rows pass through. */
  const remap = (f: (face: CF.PickFace, e: Estimate | null) => CF.PickFace) => (i: CF.CardFaceInput): CF.CardFace => {
    const out = R.face(i);
    return out.picks.kind !== "open" ? out
      : { ...out, picks: { kind: "open", YES: f(out.picks.YES, i.estimates?.YES ?? null), NO: f(out.picks.NO, i.estimates?.NO ?? null) } };
  };
  const flip = (s: "YES" | "NO" | null): "YES" | "NO" | null => (s === "YES" ? "NO" : s === "NO" ? "YES" : null);
  return [
    /* §2 · the home's list */
    { name: "a market that takes no bets kept on the home (the caller's bet-path test ignored)", expect: /^2[.]book[.]keeps /, alone: true,
      plant: (w) => rule(w, { book: (ms, now) => R.book(ms, now, () => true) }) },
    { name: "the home ordered by when a market RESOLVES, not by when betting closes", expect: /^2[.]book[.]order /, alone: true,
      plant: (w) => rule(w, { book: (ms, now, ok) => R.book(ms.map((m) => ({ ...m, selectionClosedAt: null })), now, ok).map(byIdIn(ms)) }) },
    { name: "equal closing instants broken by the SMALLER pool", expect: /^2[.]book[.]order /, alone: true,
      plant: (w) => rule(w, { book: (ms, now, ok) => R.book(ms.map((m) => ({ ...m, yesPool: -m.yesPool, noPool: -m.noPool })), now, ok).map(byIdIn(ms)) }) },
    { name: "no id tie-break: a full tie keeps whatever order the list arrived in", expect: /^2[.]book[.]stable /, alone: true,
      plant: (w) => rule(w, { book: (ms, now, ok) => ms.filter((m) => ok(m, now))
        .map((m) => ({ m, closes: Date.parse(String(m.selectionClosedAt ?? m.resolutionAt)), pool: m.yesPool + m.noPool }))
        .sort((a, b) => (a.closes - b.closes) || (b.pool - a.pool)).map((x) => x.m) }) },
    { name: "the caller's list sorted in place (a shared list reordered under every other reader)", expect: /^2[.]book[.]stable /, alone: true,
      plant: (w) => rule(w, { book: (ms, now, ok) => {
        const out = R.book(ms, now, ok);
        (ms as unknown as Array<{ id: string }>).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        return out;
      } }) },
    { name: "the chips in the platform's order, not the deck's three first", expect: /^2[.]chips[.]order /, alone: true,
      plant: (w) => rule(w, { chips: (b, sel) => { const held = new Set<string>(b.map((m) => m.category)); return [null, ...MARKET_CATEGORIES.filter((c) => held.has(c) || c === sel)]; } }) },
    { name: "a chip for every category, held or not (a tap that leads to nothing)", expect: /^2[.]chips[.]held /, alone: true,
      plant: (w) => rule(w, { chips: () => [null, "sports", "weather", "macro", "crypto", "culture", "tech", "other"] }) },
    { name: "the selected category loses its chip when it holds no question (the filter applied out of sight)", expect: /^2[.]chips[.]selected /, alone: true,
      plant: (w) => rule(w, { chips: (b) => R.chips(b) }) },
    { name: "an unknown ?cat passed through to the filter", expect: /^2[.]parse[.]cat /, alone: true,
      plant: (w) => rule(w, { parse: (sp, c) => { const p = R.parse(sp, c); const raw = sp?.cat; return typeof raw === "string" && raw !== "" ? { ...p, cat: raw as never } : p; } }) },
    { name: "the caller's closed set ignored (?cat read against the whole category list)", expect: /^2[.]parse[.]cat /, alone: true,
      plant: (w) => rule(w, { parse: (sp) => R.parse(sp, MARKET_CATEGORIES) }) },
    { name: "a page handed no search object crashes (the null guard dropped)", expect: /^2[.]parse[.]absent /, alone: true,
      plant: (w) => rule(w, { parse: (sp, c) => {
        if (sp === null || sp === undefined) throw new TypeError("Cannot read properties of undefined (reading 'cat')");
        return R.parse(sp, c);
      } }) },
    { name: "?q not clamped to the product's one cap", expect: /^2[.]parse[.]q /, alone: true,
      plant: (w) => rule(w, { parse: (sp, c) => { const p = R.parse(sp, c); const raw = sp?.q; return typeof raw === "string" ? { ...p, q: raw.trim() } : p; } }) },
    { name: "?page read with parseInt (2abc, 02 and 2.5 become page 2)", expect: /^2[.]parse[.]page /, alone: true,
      plant: (w) => rule(w, { parse: (sp, c) => {
        const p = R.parse(sp, c);
        const raw = Array.isArray(sp?.page) ? sp?.page[0] : sp?.page;
        const n = parseInt(raw ?? "1", 10);
        return { ...p, page: Number.isFinite(n) && n >= 1 ? n : 1 };
      } }) },
    { name: "a repeated parameter takes its LAST value", expect: /^2[.]parse[.]array /, alone: true,
      plant: (w) => rule(w, { parse: (sp, c) => R.parse(Object.fromEntries(Object.entries(sp ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v[v.length - 1] : v])), c) }) },
    { name: "the shared page rule read with parseInt (02, 3.0, 4abc and a padded 5 become pages)", expect: /^2[.]page[.]rule /, alone: true,
      plant: (w) => rule(w, { pageParam: (raw) => { const n = parseInt(String(raw ?? "1"), 10); return Number.isFinite(n) && n >= 1 ? n : 1; } }) },
    { name: "Onyesha zaidi pages instead of growing (page 2 shows cards 13 to 24 alone)", expect: /^2[.]pages /, alone: true,
      plant: (w) => rule(w, { pages: (l, p, per) => { const x = R.pages(l, p, per); return { ...x, shown: l.slice((x.page - 1) * per, x.page * per) }; } }) },
    { name: "a page past the end not clamped (an empty page that calls itself page 9)", expect: /^2[.]pages /, alone: true,
      plant: (w) => rule(w, { pages: (l, p, per) => { const x = R.pages(l, p, per); return Number.isSafeInteger(p) && p > x.page ? { ...x, page: p } : x; } }) },
    { name: "the search ignored once a category is chosen", expect: /^2[.]view[.]filter /, alone: true,
      plant: (w) => rule(w, { view: (b, p, per, m) => R.view(b, p.cat !== null ? { ...p, q: "" } : p, per, m) }) },
    { name: "homeView shows only its own page's cards, not everything above them", expect: /^2[.]view[.]paged /, alone: true,
      plant: (w) => rule(w, { view: (b, p, per, m) => { const v = R.view(b, p, per, m); return { ...v, shown: v.shown.slice((v.page - 1) * per) }; } }) },
    { name: "a search that matched nothing reported as an empty book", expect: /^2[.]view[.]empty /, alone: true,
      plant: (w) => rule(w, { view: (b, p, per, m) => { const v = R.view(b, p, per, m); return v.empty === "q" ? { ...v, empty: "book" as const } : v; } }) },
    { name: "page 1 written into the link (two addresses for the one home)", expect: /^2[.]href /, alone: true,
      plant: (w) => rule(w, { href: (p) => { const h = R.href(p); return p.page === 1 ? `${h}${h.includes("?") ? "&" : "?"}page=1` : h; } }) },
    { name: "values written raw, not encoded (a search holding an ampersand adds a parameter)", expect: /^2[.]href /, alone: true,
      plant: (w) => rule(w, { href: (p) => decodeURIComponent(R.href(p)) }) },
    { name: "the parameters written in the order the caller's object lists them", expect: /^2[.]href /, alone: true,
      plant: (w) => rule(w, { href: (p) => {
        const parts = Object.keys(p).flatMap((k) => { const one = R.href({ [k]: (p as Record<string, unknown>)[k] } as never); return one === "/" ? [] : [one.slice(2)]; });
        return parts.length > 0 ? `/?${parts.join("&")}` : "/";
      } }) },

    /* §3 · the card's face */
    { name: "a priced pick printed as the bare side word (the figure lost)", expect: /^3[.]golden /, alone: true,
      plant: (w) => rule(w, { face: remap((f) => (f.kind === "win" ? { kind: "word" } : f)) }) },
    { name: "an empty pool printed as the bare side word, not Kuwa wa kwanza", expect: /^3[.]empty /, alone: true,
      plant: (w) => rule(w, { face: remap((f, e) => (e?.state === "emptyPool" ? { kind: "word" } : f)) }) },
    { name: "the side holding all the money told to be the first", expect: /^3[.]oneside /, alone: true,
      plant: (w) => rule(w, { face: remap((f, e) => (e?.state === "oneSidedRefund" ? { kind: "beFirst" } : f)) }) },
    { name: "over the cap, the cap printed as a figure", expect: /^3[.]overcap /, alone: true,
      plant: (w) => rule(w, { face: remap((f, e) => (e?.overCap ? { kind: "win", mult: e.multText ?? "100" } : f)) }) },
    { name: "a thin side printed as an ordinary win (Faida ndogo lost)", expect: /^3[.]overcap /, alone: true,
      plant: (w) => rule(w, { face: remap((f) => (f.kind === "thin" ? { kind: "win", mult: f.mult } : f)) }) },
    { name: "a legacy (hidden) market's pick told to be the first", expect: /^3[.]legacy /, alone: true,
      plant: (w) => rule(w, { face: remap((f, e) => (e?.state === "hidden" ? { kind: "beFirst" } : f)) }) },
    { name: "the display switch ignored (a market whose figures are switched off prints one anyway)", expect: /^3[.]legacy /, alone: true,
      plant: (w) => rule(w, { estimate: (m, rates, side, bettable) => R.estimate(m, rates && { ...rates, showEstimatedWinnings: true }, side, bettable) }) },
    { name: "a market with no rates priced at the deck's 13% instead of showing its side word", expect: /^3[.]legacy /, alone: true,
      plant: (w) => rule(w, { estimate: (m, rates, side, bettable) => R.estimate(m, rates ?? pickEstimateRates(LS13 as never), side, bettable) }) },
    { name: "a market that takes no bets keeps its two picks", expect: /^3[.]closed /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return f.picks.kind === "closed" ? { ...f, picks: { kind: "open", YES: { kind: "word" }, NO: { kind: "word" } } } : f; } }) },
    { name: "every result in the YES ink (one-sided 8.10's defect: the slot's ink inherited)", expect: /^3[.]settled /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return f.picks.kind === "settled" ? { ...f, picks: { ...f.picks, ink: "yes" as const } } : f; } }) },
    { name: "a VOIDED market with no stamped outcome shows no result", expect: /^3[.]settled /, alone: true,
      plant: (w) => rule(w, { face: (i) => {
        const f = R.face(i);
        return i.status === "VOIDED" && !i.resolvedOutcome && f.picks.kind === "settled" ? { ...f, picks: { kind: "settled", outcome: null, ink: "neutral" } } : f;
      } }) },
    { name: "an Up & Down pick told to be the first (its missing estimate read as an empty pool)", expect: /^3[.]updown /, alone: true,
      plant: (w) => rule(w, { face: remap((f, e) => (e === null ? { kind: "beFirst" } : f)) }) },
    { name: "the refund sentence names the side holding the money", expect: /^3[.]note /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return { ...f, oneSidedNote: flip(f.oneSidedNote) }; } }) },
    { name: "the refund sentence dropped once betting closes", expect: /^3[.]note /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return i.bettable ? f : { ...f, oneSidedNote: null }; } }) },
    { name: "closes today returned in the subtle ink (A12)", expect: /^3[.]meta /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return f.meta?.kind === "today" ? { ...f, meta: { kind: "today", emphasis: "subtle" } } : f; } }) },
    { name: "Siku N returned in the muted ink (A12)", expect: /^3[.]meta /, alone: true,
      plant: (w) => rule(w, { face: (i) => { const f = R.face(i); return f.meta?.kind === "days" ? { ...f, meta: { kind: "days", emphasis: "muted" } } : f; } }) },
  ];
}

/**
 * §4's plants: each puts ONE defect into a copy of the card's source, of globals.css or of one drawn card, and must turn
 * its own check red and no other (`alone`). A drawn-card plant edits the markup the real component served, so it proves
 * the check reads what a reader is served; a source plant proves the check reads how the card computes it.
 */
function cardDefects(): Array<{ name: string; expect: RegExp; plant: (w: World) => World; alone: true }> {
  const drawn = (w: World, n: CardName, from: string, to: string): World => ({ ...w, renders: { ...w.renders, [n]: swap(w.renders[n], from, to) } });
  const styled = (w: World, from: string, to: string, tail = ""): World => ({ ...w, css: swap(w.css, from, to) + tail });
  const sourced = (w: World, from: string, to: string): World => ({ ...w, card: swap(w.card, from, to) });
  const sw = dict.sw;
  const note = sw.market.oneSidedNote.replace("{side}", sw.common.no);
  const old = caseOf("lastYear").m.settledAt ?? "";
  const yes = caseOf("settledYes").m;
  return [
    { name: "the card marked use client (its markup would hydrate, and the close label could run on the phone's clock)", expect: /^4[.]directive /, alone: true,
      plant: (w) => ({ ...w, card: '"use client";' + LF + LF + w.card }) },
    { name: "a helper exported beside the card (a second entry a client module could reach for)", expect: /^4[.]directive /, alone: true,
      plant: (w) => sourced(w, "function winWords(", "export function winWords(") },
    { name: "a client module imports the card", expect: /^4[.]importers /, alone: true,
      plant: (w) => ({ ...w, cardNaming: new Map(w.cardNaming).set("src/components/journey/home/home-island.tsx",
        '"use client";' + LF + 'import { JourneyCard } from "@/components/journey/cards/journey-card";' + LF) }) },
    { name: "the close label read off the wall clock instead of the render's (midnight in East Africa splits server and phone)", expect: /^4[.]computes /, alone: true,
      plant: (w) => sourced(w, "cardCloseLabel(m, nowMs)", "cardCloseLabel(m, Date.now())") },
    { name: "the figures computed beside cardFigures (the card and the bet sheet free to disagree)", expect: /^4[.]computes /, alone: true,
      plant: (w) => sourced(w, "const { bettable, estimates } = cardFigures(m, nowMs);",
        'const bettable = m.status === "LIVE"; const rates = pickEstimateRates(ratesFor(m)); const estimates = { YES: cardEstimate(m, rates, "YES", bettable), NO: cardEstimate(m, rates, "NO", bettable) };') },
    { name: "the card reads a pool into its markup", expect: /^4[.]computes /, alone: true,
      plant: (w) => sourced(w, "<Heading className=", "<span>{m.yesPool}</span><Heading className=") },
    { name: "a percentage printed on a card", expect: /^4[.]printed /, alone: true,
      plant: (w) => drawn(w, "priced", "</div></div></article>", "</div><p>33% NDIO</p></div></article>") },
    { name: "the pool printed on a card", expect: /^4[.]printed /, alone: true,
      plant: (w) => drawn(w, "home", "</div></div></article>", "</div><p>Bwawa TZS 75,287</p></div></article>") },
    { name: "a click handler that fires the navigating event (NavProgress already starts on any internal link)", expect: /^4[.]forbidden /, alone: true,
      plant: (w) => sourced(w, 'className="kp-jcard__open"', 'className="kp-jcard__open" onClick={() => window.dispatchEvent(new Event("50pick:navigating"))}') },
    { name: "the classic card's class on a journey card (V18 selects it; phone density rewrites it)", expect: /^4[.]forbidden /, alone: true,
      plant: (w) => drawn(w, "priced", '<article class="kp-jcard"', '<article class="kp-jcard mcardp"') },
    { name: "a button among the picks (a control that is no link, under the stretched card)", expect: /^4[.]forbidden /, alone: true,
      plant: (w) => drawn(w, "priced", '<div class="kp-jcard__picks">', '<div class="kp-jcard__picks"><button type="button">Shiriki</button>') },
    { name: "a second link on a settled card (a tap target the result row never had)", expect: /^4[.]forbidden /, alone: true,
      plant: (w) => drawn(w, "settledYes", '<p class="kp-jcard__result">', '<p class="kp-jcard__result"><a href="/results">Matokeo yote</a>') },
    { name: "an Up & Down row on /live linked to the question, not its round", expect: /^4[.]links[.]open /, alone: true,
      plant: (w) => drawn(w, "updownLive", 'href="/updown/rnd_jcLive"', 'href="/markets/mkt_jcUd"') },
    { name: "the card link named by the short title (a screen reader loses the full question)", expect: /^4[.]links[.]open /, alone: true,
      plant: (w) => drawn(w, "short", `aria-label="${caseOf("short").m.titleSw}"`, 'aria-label="Je, Dodoma itanyesha kesho?"') },
    { name: "the home's NO pick drops from=home (the old journey's funnel loses the tap)", expect: /^4[.]links[.]picks /, alone: true,
      plant: (w) => drawn(w, "home", '?side=NO&amp;from=home"', '?side=NO"') },
    { name: "the picks prefetched (two question pages per card, on every card in view)", expect: /^4[.]links[.]picks /, alone: true,
      plant: (w) => sourced(w, "prefetch={false}", "prefetch={true}") },
    { name: "a closed card keeps a pick", expect: /^4[.]forbidden /, alone: true,
      plant: (w) => drawn(w, "closed", '<p class="kp-jcard__closed">', '<a class="btn-yes kp-jcard__pick" href="/markets/mkt_jcClosed?side=YES"><span class="kp-jcard__side">NDIO</span></a><p class="kp-jcard__closed">') },
    { name: "the similar rail's card drawn as an h2 (two h2 levels under the rail's own heading)", expect: /^4[.]title[.]heading /, alone: true,
      plant: (w) => drawn(w, "short", '<h3 class="kp-jcard__title text-title-sm">Je, Dodoma itanyesha kesho?</h3>', '<h2 class="kp-jcard__title text-title-sm">Je, Dodoma itanyesha kesho?</h2>') },
    { name: "the question no longer balanced (a word left alone on its last line)", expect: /^4[.]title[.]heading /, alone: true,
      plant: (w) => styled(w, "color: var(--text); text-wrap: balance; overflow-wrap: break-word; }", "color: var(--text); overflow-wrap: break-word; }") },
    { name: "a later rule re-sets the question to pretty (the first rule still says balance)", expect: /^4[.]title[.]heading /, alone: true,
      plant: (w) => ({ ...w, css: w.css + LF + ".kp-jcard__title { text-wrap: pretty; }" + LF }) },
    { name: "every title clamped, the short title included (its end lost)", expect: /^4[.]title[.]clamp /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__title { margin: 0;", ".kp-jcard__title { -webkit-line-clamp: 2; margin: 0;") },
    { name: "a short title given the fallback's clamp", expect: /^4[.]title[.]clamp /, alone: true,
      plant: (w) => drawn(w, "short", '<h3 class="kp-jcard__title text-title-sm">', '<h3 class="kp-jcard__title kp-jcard__title--full text-title-sm">') },
    { name: "the fallback's clamp without its box (no -webkit-box: the clamp does nothing and the full question runs on)", expect: /^4[.]title[.]clamp /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__title--full { display: -webkit-box; -webkit-box-orient: vertical;", ".kp-jcard__title--full { -webkit-box-orient: vertical;") },
    { name: "the fallback's box without its vertical orient", expect: /^4[.]title[.]clamp /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__title--full { display: -webkit-box; -webkit-box-orient: vertical;", ".kp-jcard__title--full { display: -webkit-box;") },
    { name: "A12's plant: the muted rule re-pointed to the subtle ink (closes today and waiting no brighter than Siku N)", expect: /^4[.]meta[.]ink /, alone: true,
      plant: (w) => styled(w, '.kp-jcard__when[data-emphasis="muted"] { color: var(--text-muted); }', '.kp-jcard__when[data-emphasis="muted"] { color: var(--text-subtle); }') },
    { name: "the label inks itself muted in every state (Siku N as loud as closes today)", expect: /^4[.]meta[.]ink /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__when { display: inline-flex;", ".kp-jcard__when { color: var(--text-muted); display: inline-flex;") },
    { name: "the label inked by a list it shares with another surface (a colour the card's own rules never set)", expect: /^4[.]meta[.]ink /, alone: true,
      plant: (w) => ({ ...w, css: w.css + LF + ".kp-hub__sub, .kp-jcard__when { color: var(--text); }" + LF }) },
    { name: "closes today drawn in the subtle ink", expect: /^4[.]meta[.]ink /, alone: true,
      plant: (w) => drawn(w, "today", 'data-emphasis="muted"', 'data-emphasis="subtle"') },
    { name: "closes today drawn with the waiting hourglass", expect: /^4[.]meta[.]label /, alone: true,
      plant: (w) => drawn(w, "today", glyph(I.clock, 14), glyph(I.hourglassOff, 14)) },
    { name: "Siku N missing from the served markup (a label left for the browser to compute)", expect: /^4[.]meta[.]label /, alone: true,
      plant: (w) => drawn(w, "priced", `data-emphasis="subtle">${sw.journey.cardDaysLeft.replace("{n}", "11")}</span>`, 'data-emphasis="subtle"></span>') },
    { name: "the competition dropped from the meta row", expect: /^4[.]meta[.]where /, alone: true,
      plant: (w) => {
        const el = elementsOf(w.renders.competition, "kp-jcard__where")[0];
        if (!el) throw new Error("the competition card draws no meta row to plant in");
        return drawn(w, "competition", `<span${el.attrs}>${el.inner}</span>`, `<span class="kp-jcard__where">${sw.market.catSports}</span>`);
      } },
    { name: "a hidden figure's pick told to be the first", expect: /^4[.]picks[.]words /, alone: true,
      plant: (w) => drawn(w, "legacy", `<span class="kp-jcard__side">${sw.common.yes}</span></a>`, `<span class="kp-jcard__side">${sw.common.yes}</span> <span class="kp-jcard__line">${sw.journey.cardBeFirst}</span></a>`) },
    { name: "the NO pick in the YES ink", expect: /^4[.]picks[.]words /, alone: true,
      plant: (w) => drawn(w, "priced", 'class="btn-no kp-jcard__pick"', 'class="btn-yes kp-jcard__pick"') },
    { name: "a pick given a button's height and nowrap (a two-line pick cut)", expect: /^4[.]picks[.]words /, alone: true,
      plant: (w) => drawn(w, "priced", 'class="btn-yes kp-jcard__pick"', 'class="btn btn-yes btn-md kp-jcard__pick"') },
    { name: "the pick's rule given a fixed height (its second line cut)", expect: /^4[.]picks[.]words /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__pick { display: flex;", ".kp-jcard__pick { height: 44px; display: flex;") },
    { name: "the pick's rule held to one line (white-space: nowrap)", expect: /^4[.]picks[.]words /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__pick { display: flex;", ".kp-jcard__pick { white-space: nowrap; display: flex;") },
    { name: "≈100.0× held to its words by no-break spaces (en: “≈100.0× your bet” runs past a 320 pick's line)", expect: /^4[.]picks[.]fit /, alone: true,
      plant: (w) => drawn(w, "cap100En", "≈100.0×</span> your bet", `≈100.0×</span>${NBSP}your${NBSP}bet`) },
    { name: "≈99.9× parted from its words (a break could read “≈99.9× / your bet”)", expect: /^4[.]picks[.]fit /, alone: true,
      plant: (w) => drawn(w, "cap999En", `≈99.9×</span>${NBSP}your`, "≈99.9×</span> your") },
    { name: "the figure parted from its unit (a break could read “≈2.8× / dau”)", expect: /^4[.]picks[.]unit /, alone: true,
      plant: (w) => drawn(w, "priced", `≈2.8×</span>${NBSP}dau`, "≈2.8×</span> dau") },
    { name: "the English unit split (“≈2.8× your / bet”)", expect: /^4[.]picks[.]unit /, alone: true,
      plant: (w) => drawn(w, "pricedEn", `≈2.8×</span>${NBSP}your${NBSP}bet`, `≈2.8×</span>${NBSP}your bet`) },
    { name: "the closed row without its lock", expect: /^4[.]closed /, alone: true,
      plant: (w) => drawn(w, "closed", `<p class="kp-jcard__closed">${glyph(I.lock, 16)}`, '<p class="kp-jcard__closed">') },
    { name: "the result's <time> names the resolution, not the settlement", expect: /^4[.]settled[.]date /, alone: true,
      plant: (w) => drawn(w, "settledYes", `dateTime="${yes.settledAt}"`, `dateTime="${yes.resolutionAt}"`) },
    { name: "last year's settlement printed with no year", expect: /^4[.]settled[.]date /, alone: true,
      plant: (w) => drawn(w, "lastYear", `>${formatEatDateTime(Date.parse(old), T0, sw.common.monthsShort, "sw")}</time>`,
        `>${formatEatDateTime(Date.parse(old), Date.parse(old), sw.common.monthsShort, "sw")}</time>`) },
    { name: "a NO result chip in the YES ink", expect: /^4[.]settled[.]chip /, alone: true,
      plant: (w) => drawn(w, "settledNo", 'data-kit-chip-variant="no"', 'data-kit-chip-variant="yes"') },
    { name: "a verdict never recorded given a side", expect: /^4[.]settled[.]chip /, alone: true,
      plant: (w) => drawn(w, "unrecorded", "</time></p>", `</time></p> <span data-kit-chip="" data-kit-chip-variant="yes" class="kp-jcard__outcome">${sw.common.yes}</span>`) },
    { name: "the refund sentence names the side holding the money", expect: /^4[.]note /, alone: true,
      plant: (w) => drawn(w, "oneSided", note, sw.market.oneSidedNote.replace("{side}", sw.common.yes)) },
    { name: "the refund sentence dropped once selection closes", expect: /^4[.]note /, alone: true,
      plant: (w) => drawn(w, "oneSidedClosed", `<p class="kp-jcard__note">${note}</p>`, "") },
    { name: "the note given a voice of its own (a second definition of the one note)", expect: /^4[.]note /, alone: true,
      plant: (w) => styled(w, `.kp-qrow__note,${LF}.kp-jcard__note {`, ".kp-qrow__note {", `${LF}.kp-jcard__note { font-size: var(--type-small); color: var(--text-subtle); }${LF}`) },
    { name: "the picks not raised (a tap on NDIO opens the question)", expect: /^4[.]stack /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__picks { position: relative; z-index: 3; display: grid;", ".kp-jcard__picks { display: grid;") },
    { name: "the card's stacking context dropped (its local z-indexes reach the page)", expect: /^4[.]stack /, alone: true,
      plant: (w) => styled(w, ".kp-jcard { position: relative; isolation: isolate; display: flex;", ".kp-jcard { position: relative; display: flex;") },
    { name: "a pick that does not press (no pressed feedback under a transparent tap-flash)", expect: /^4[.]press /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__pick:active { transform: translateY(0) scale(var(--m-press)); filter: brightness(0.93); }", ".kp-jcard__pick:active { filter: brightness(0.93); }") },
    { name: "the hover lift on every pointer (stuck on a phone after a tap)", expect: /^4[.]press /, alone: true,
      plant: (w) => styled(w, "@media (hover: hover) { .kp-jcard__pick:hover { transform: translateY(var(--m-lift)); } }", ".kp-jcard__pick:hover { transform: translateY(var(--m-lift)); }") },
    { name: "the pick's edge lost in forced colours (the ring is a shadow, stripped with the fill)", expect: /^4[.]forced /, alone: true,
      plant: (w) => styled(w, "@media (forced-colors: active) { .kp-jcard__pick { border: 1px solid; } }", "") },
    { name: "the action block off the card's floor (picks out of line across a row, wherever the rows are not shared)", expect: /^4[.]act /, alone: true,
      plant: (w) => styled(w, "gap: var(--jcard-gap); margin-block-start: auto; }", "gap: var(--jcard-gap); }") },
    { name: "a two-line reserve back on the question (one column pays it too)", expect: /^4[.]act /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__title { margin: 0;", ".kp-jcard__title { min-height: 48px; margin: 0;") },
    { name: "the cards no longer share their rows (the subgrid dropped: a longer question pushes its picks below its neighbour's)", expect: /^4[.]grid /, alone: true,
      plant: (w) => styled(w, ".kp-jgrid > li > .kp-jcard { display: grid; grid-row: span 3; grid-template-rows: subgrid; }", ".kp-jgrid > li > .kp-jcard { display: grid; grid-row: span 3; }") },
    { name: "the action block's auto margin kept in the shared rows (a shorter block sinks to its track's floor, off its neighbours' line)", expect: /^4[.]grid /, alone: true,
      plant: (w) => styled(w, "  .kp-jgrid .kp-jcard__act { margin-block-start: 0; }" + LF, "") },
    { name: "the subgrid out of its @supports fence (a browser without subgrid loses the floor and the shared rows alike)", expect: /^4[.]grid /, alone: true,
      plant: (w) => styled(w, "@supports (grid-template-rows: subgrid) {" + LF + "  .kp-jgrid > li {", "@media screen {" + LF + "  .kp-jgrid > li {") },
    { name: "the refund sentence drawn after the action block (a fourth row: the card no longer fits its three tracks)", expect: /^4[.]grid /, alone: true,
      plant: (w) => drawn(w, "oneSided", `</div><p class="kp-jcard__note">${note}</p></div></article>`, `</div></div><p class="kp-jcard__note">${note}</p></article>`) },
    { name: "a hand-typed ink in the card's rules", expect: /^4[.]css /, alone: true,
      plant: (w) => styled(w, "background: var(--bg-inset); font-size: var(--type-body);", "background: oklch(11% 0.11 268); font-size: var(--type-body);") },
    { name: "A15: the side word off the h4 rung", expect: /^4[.]css /, alone: true,
      plant: (w) => styled(w, ".kp-jcard__side { font-family: var(--font-display); font-size: var(--type-h4);", ".kp-jcard__side { font-family: var(--font-display); font-size: var(--type-body);") },
  ];
}

const REAL = load();
if (!PROVE_RED) {
  console.log("journey-home — the home on / (the Vodacom plan S7)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`${LF}JOURNEY HOME — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${LF}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  /** `alone`: the plant must turn its own check red and NO other (every §2, §3 and §4 plant). */
  type Plant = { name: string; expect: RegExp; plant: (w: World) => World; alone?: boolean };
  const PLANTS: Plant[] = [
    { name: "the metadata moved into the landing's body, where Next never reads it (/ would lose its canonical, og:url and og:image)", expect: /^1[.]metadata /,
      plant: (w) => {
        const at = w.page.indexOf("export async function generateMetadata(");
        const end = at < 0 ? -1 : w.page.indexOf(LF + "}" + LF, at);
        if (end < 0) throw new Error("the route file holds no generateMetadata to move");
        return { ...w, page: w.page.slice(0, at) + w.page.slice(end + 2), landing: w.landing + LF + w.page.slice(at, end + 2) + LF };
      } },
    { name: "openGraph replaced instead of spread (the layout's og:image, og:locale, og:site_name and og:type wiped from /)", expect: /^1[.]spelled /,
      plant: (w) => ({ ...w, page: swap(w.page, SPREAD, 'openGraph: { url: "/" },') }) },
    { name: "dynamic dropped (/ no longer forced to render per request)", expect: /^1[.]dynamic /,
      plant: (w) => ({ ...w, page: swap(w.page, DYNAMIC + LF, "") }) },
    { name: "a second importer (the landing's body mounted on another route)", expect: /^1[.]importers /,
      plant: (w) => ({ ...w, naming: new Map(w.naming).set("src/app/markets/page.tsx", LANDING_IMPORT + LF + "export default function Markets() { return null; }" + LF) }) },
    { name: "the open graph copied into the route instead of read from the layout", expect: /^1[.]layout /,
      plant: (w) => ({ ...w, page: swap(w.page, OG_IMPORT, 'const ROOT_OPEN_GRAPH = { type: "website" } as const;') }) },
    { name: "the classic return stops handing the request on (the board's ?sort= is lost)", expect: /^1[.]return /,
      plant: (w) => ({ ...w, page: swap(w.page, "<LegacyLanding searchParams={searchParams} />", "<LegacyLanding searchParams={Promise.resolve({})} />") }) },
    { name: "the landing's body marked use client", expect: /^1[.]directive /,
      plant: (w) => ({ ...w, landing: '"use client";' + LF + LF + w.landing }) },
    { name: "the landing's body a default export again", expect: /^1[.]landing /,
      plant: (w) => ({ ...w, landing: swap(w.landing, LANDING_EXPORT, "export default async function LegacyLanding(") }) },

    /* §2 and §3 (S7 WP3): one rule swapped for a copy that carries one defect, each required to fail its check ALONE. */
    ...ruleDefects(),
    /* §4 (S7 WP5): one defect in a copy of the card's source, of globals.css or of one drawn card, each failing ALONE. */
    ...cardDefects(),
    /* §5 (S7 WP6): the How-to card, the sheet and the home's lazy module — each plant one defect, its own check named. */
    ...howToDefects(),
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  /** The verdict: the plant's own check failed and, for an `alone` plant, no other check did. */
  const judge = (failures: string[], p: Pick<Plant, "expect" | "alone">) => {
    const hit = failures.some((f) => p.expect.test(f));
    const beside = p.alone ? failures.filter((f) => !p.expect.test(f)) : [];
    return { proved: hit && beside.length === 0, hit, beside };
  };
  // CONTROL, before any plant: the verdict must tell a lone failure from a crowd, and a check from its neighbour.
  {
    const lone = { expect: /^2[.]book[.]order /, alone: true };
    const cases: Array<[string[], boolean]> = [
      [["2.book.order · x"], true], [["2.book.order · x", "2.book.keeps · y"], false], [["2.book.orderly · x"], false],
      [["2.book.keeps · y"], false], [[], false],
    ];
    const wrong = cases.filter(([failures, want]) => judge(failures, lone).proved !== want);
    ok("the verdict's control: a lone failure of the check proves it; a second failure beside it, a neighbouring id or nothing does not",
      wrong.length === 0, wrong.length === 0 ? "" : j(wrong));
  }
  const clean = run(REAL, quiet);
  ok("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    let failures: string[];
    try { failures = run(p.plant(REAL), quiet); }
    catch (e) { ok(p.name, false, `the plant is broken: ${(e as Error).message}`); continue; }
    const { proved, hit, beside } = judge(failures, p);
    if (proved) caught++;
    ok(p.name, proved, proved ? ""
      : !hit ? (failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`)
      : `its check failed, but so did another, so the check is not proved to catch it alone: ${beside.slice(0, 2).join(" | ")}`);
  }
  console.log(`${LF}RED CONTROL — ${caught}/${PLANTS.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}${LF}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
