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
 *   §8 THE LIVE STRIP LEAVES / AND /markets FOR A JOURNEY READER (S7 WP8; VODACOM-PLAN §3.2, COMPLIANCE-DECISIONS
 *      2026-09-29 §10; S7-PLAN Open point 16), in AppShell and LiveTicker as written:
 *        · the strip's slot is ONE ternary on the shell's per-request answer (`journeyShown`, the one that chose the
 *          header), in today's place under the away summary and above the main landmark — never a `{journeyShown && …}`
 *          sibling, which would add a `false` child to every classic RSC payload;
 *        · its journey arm alone says `journey`, and its else arm is today's element with today's props, verbatim, so a
 *          classic request's RSC row is today's (no `journey` key, not even false);
 *        · LiveTicker takes `journey = false`, so the else arm's missing prop is today's lobby list.
 *      Which pages each list holds is test:ticker-honesty's (11.1j, 11.2j); the client's call, and its refusal of the
 *      browser's `useJourneyOn` (its server snapshot is false: the strip would paint, then drop), are its 11.5.
 *      ⚠️ §8 stands in its own delimited block (its world, checks and plants), after §2's and §3's plants, just before the
 *      file's run; each plant fails its own check ALONE wherever the defect is one thing (the two that rebuild the whole
 *      slot trip every arm's check).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY and requires the check named for it to fail.
 * §1's plants edit copies of the source text; §2's and §3's swap ONE rule (a function `home-list.ts` or `card-face.ts`
 * exports, or the `cardEstimate` the card's figures come through) for a copy of the real one carrying one defect; §8's
 * edit a copy of AppShell's or LiveTicker's source.
 * Nothing here touches a file on disk, so `test:red-anchors` §4 counts it in the in-process class.
 * ⚠️ Every read is DECOMMENTED (`scripts/lib/decomment.mts`), so a rule quoted in a note is never mistaken for the rule.
 * ⚠️ This file carries no escape a tool could decode on its way to disk: line breaks are built from their code points, and
 * its patterns use look-arounds and character classes, never a word boundary.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { srcFiles } from "./lib/tracked-files.mts";
import * as HL from "../src/lib/journey/home-list.ts";
import * as CF from "../src/lib/journey/card-face.ts";
import { cardEstimate, pickEstimateRates, type Estimate } from "../src/lib/markets/estimate.ts";
import { MARKET_CATEGORIES } from "../src/lib/markets/categories.ts";
import { MAX_QUERY_LEN } from "../src/lib/search/query.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

const PAGE = "src/app/page.tsx";
const LANDING = "src/components/home/legacy-landing.tsx";
const LAYOUT = "src/app/layout.tsx";

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
  strip: StripWorld;             // §8 (S7 WP8): AppShell and LiveTicker as written — the strip's slot and its client's default
};

function load(): World {
  const all = srcFiles();
  const naming = new Map<string, string>();
  for (const rel of all) {
    if (rel === PAGE || rel === LANDING) continue;
    const s = read(rel);
    if (s.includes("legacy-landing")) naming.set(rel, s);
  }
  return { page: read(PAGE), landing: read(LANDING), layout: read(LAYOUT), walked: all.length, naming, rules: RULES, strip: loadStrip() };
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
  /* §8 · the LIVE strip leaves / and /markets for a journey reader (S7 WP8) — its own block, below */
  stripChecks(w.strip, ok);
  return failed;
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

/* ══ §8 · THE LIVE STRIP LEAVES / AND /markets FOR A JOURNEY READER (S7 WP8) — its own block: world, checks, plants ══ */
/**
 * S7-PLAN WP8 steps 1-2 and Open point 16; VODACOM-PLAN §3.2; COMPLIANCE-DECISIONS 2026-09-29 §10. The strip leaves `/`
 * and `/markets` for a journey reader and stays on `/live` and `/results`; every other reader keeps it where it is. The
 * answer is the SHELL's, handed down: `useJourneyOn`'s server snapshot is false, so a client-side answer would paint the
 * 32px strip on a journey reader's `/` and take it away after hydration (the shift `qa:cls-budget` exists to fail).
 */
const STRIP_SHELL = "src/components/layout/app-shell.tsx";
const STRIP_CLIENT = "src/components/layout/live-ticker.tsx";
/** Today's element, verbatim: the else arm, served to every request the resolver does not show the journey to. */
const STRIP_TODAY = "<LiveTicker events={tickerEvents} />";
/** The journey arm: today's element and the bare `journey` attribute, nothing else. */
const STRIP_JOURNEY = "<LiveTicker events={tickerEvents} journey />";
const STRIP_SLOT = `{journeyShown ? ${STRIP_JOURNEY} : ${STRIP_TODAY}}`;
const STRIP_SIGNATURE = "export function LiveTicker({ events, journey = false }: { events: TickerEvent[]; journey?: boolean }) {";
/** AppShell's main landmark, as written (OptOutShell writes its own on one line): the plants' anchor below the slot. */
const STRIP_MAIN = ["<MainLandmark>", "        <RouteTransition>{children}</RouteTransition>", "      </MainLandmark>"].join(LF);

type StripWorld = {
  shell: string;                 // src/components/layout/app-shell.tsx, as written (the checks decomment it)
  client: string;                // src/components/layout/live-ticker.tsx, as written
};
function loadStrip(): StripWorld {
  return { shell: read(STRIP_SHELL), client: read(STRIP_CLIENT) };
}

function stripChecks(s: StripWorld, ok: Ok) {
  const shell = decomment(s.shell), client = decomment(s.client);
  /** Every line of the shell that mounts the strip, trimmed. */
  const mounts = shell.split(LF).map((l) => l.trim()).filter((l) => l.includes("<LiveTicker"));
  const line = mounts[0] ?? "";
  const away = shell.indexOf("<AwaySummaryBar"), at = shell.indexOf("<LiveTicker"), main = shell.indexOf("<MainLandmark>");
  const slot = {
    lines: mounts.length, elements: count(shell, "<LiveTicker"), sibling: count(shell, "&& <LiveTicker"),
    ternary: line.startsWith("{journeyShown ? <LiveTicker ") && line.includes(" : <LiveTicker ") && line.endsWith("/>}"),
    placed: away >= 0 && away < at && at < main,
  };
  ok("8.slot · AppShell's strip slot is ONE ternary on the shell's per-request answer (journeyShown, the one that chose the header), in today's place under the away summary and above the main landmark: one line, two LiveTicker elements, and never a {journeyShown && …} sibling (a false child in every classic RSC payload)",
    slot.lines === 1 && slot.elements === 2 && slot.sibling === 0 && slot.ternary && slot.placed, j({ ...slot, line }));
  const elseArm = count(shell, ` : ${STRIP_TODAY}}`);
  ok(`8.else · the else arm is today's element with today's props, verbatim (${STRIP_TODAY}): a request the resolver does not show the journey to is served today's RSC row, with no journey key — not even false`,
    elseArm === 1, j({ elseArm, line }));
  const arm = count(shell, ` ? ${STRIP_JOURNEY} : `);
  ok(`8.arm · the journey arm alone says journey: today's element and the bare attribute, nothing else (${STRIP_JOURNEY})`,
    arm === 1, j({ arm, line }));
  const signature = count(client, STRIP_SIGNATURE);
  ok(`8.default · LiveTicker takes journey = false, an optional prop, so the else arm's missing prop is today's lobby list (${STRIP_SIGNATURE})`,
    signature === 1, j({ signature }));
}

/** One swap on a copy of a text. ⛔ An anchor that does not resolve exactly once THROWS: a broken plant, never a miss. */
function stripSwap(text: string, from: string, to: string): string {
  const n = count(text, from);
  if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times, not once: ${from}`);
  return text.replace(from, () => to);
}
const inShell = (w: World, from: string, to: string): World => ({ ...w, strip: { ...w.strip, shell: stripSwap(w.strip.shell, from, to) } });
const inClient = (w: World, from: string, to: string): World => ({ ...w, strip: { ...w.strip, client: stripSwap(w.strip.client, from, to) } });

/** §8's plants: each one defect in a copy of AppShell's or LiveTicker's source; `alone` wherever the defect is one thing. */
function stripDefects(): Array<{ name: string; expect: RegExp; plant: (w: World) => World; alone?: true }> {
  return [
    { name: "the strip's ternary decided by the preview pass, not by the answer that chose the header", expect: /^8[.]slot /, alone: true,
      plant: (w) => inShell(w, "{journeyShown ? <LiveTicker", "{journeyPreview ? <LiveTicker") },
    { name: "the strip moved below the main landmark (it would paint under the page for every reader)", expect: /^8[.]slot /, alone: true,
      plant: (w) => inShell(inShell(w, STRIP_SLOT, ""), STRIP_MAIN, `${STRIP_MAIN}${LF}      ${STRIP_SLOT}`) },
    { name: "a second mount of today's strip beside the slot (two strips for a classic reader)", expect: /^8[.]slot /, alone: true,
      plant: (w) => inShell(w, STRIP_MAIN, `${STRIP_MAIN}${LF}      ${STRIP_TODAY}`) },
    { name: "two siblings in place of the ternary (a false child in every RSC payload, the classic one included)", expect: /^8[.]slot /,
      plant: (w) => inShell(w, STRIP_SLOT, `{journeyShown && ${STRIP_JOURNEY}}{!journeyShown && ${STRIP_TODAY}}`) },
    { name: "the else arm hands journey={false} on (a classic request's RSC row gains a key)", expect: /^8[.]else /, alone: true,
      plant: (w) => inShell(w, ` : ${STRIP_TODAY}}`, " : <LiveTicker events={tickerEvents} journey={false} />}") },
    { name: "one element for every reader, journey={journeyShown} (the classic row gains journey: false)", expect: /^8[.]else /,
      plant: (w) => inShell(w, STRIP_SLOT, "<LiveTicker events={tickerEvents} journey={journeyShown} />") },
    { name: "the journey arm loses its journey (a journey reader's home and board keep the strip)", expect: /^8[.]arm /, alone: true,
      plant: (w) => inShell(w, ` ? ${STRIP_JOURNEY} : `, ` ? ${STRIP_TODAY} : `) },
    { name: "the journey arm hands the strip another list (a journey reader's /live and /results lose it)", expect: /^8[.]arm /, alone: true,
      plant: (w) => inShell(w, ` ? ${STRIP_JOURNEY} : `, " ? <LiveTicker events={[]} journey /> : ") },
    { name: "LiveTicker's journey defaults to true (every classic reader's home and board lose the strip)", expect: /^8[.]default /, alone: true,
      plant: (w) => inClient(w, "journey = false }", "journey = true }") },
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
  /** `alone`: the plant must turn its own check red and NO other (every §2 and §3 plant). */
  type Plant = { name: string; expect: RegExp; plant: (w: World) => World; alone?: boolean };
  /** One swap on a copy of a file's text. ⛔ An anchor that no longer resolves exactly once THROWS, so a plant that changed
   *  nothing is reported as a broken plant, never as a check that missed it. */
  const swap = (text: string, from: string, to: string) => {
    const n = count(text, from);
    if (n !== 1) throw new Error(`the plant's anchor resolves ${n} times, not once: ${from}`);
    return text.replace(from, () => to);
  };
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
    /* §8 (S7 WP8): one defect in a copy of AppShell's or LiveTicker's source, ALONE wherever the defect is one thing. */
    ...stripDefects(),
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
