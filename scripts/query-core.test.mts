/**
 * QUERY CORE GUARD — the four rules every player-facing list now shares.
 *
 * `src/lib/query/{sort,href,counts,empty}.ts` was lifted out of `lib/markets/discovery.ts`, which
 * is the only list surface in this product that ordered, counted and linked correctly. Fifteen
 * routes are being fitted onto it. This gate is what stops a rule that took three repairs to get
 * right on ONE page from being quietly re-broken for all sixteen.
 *
 * What it asserts, and the defect each one prevents:
 *
 *   1. NULL-LAST HOLDS IN BOTH DIRECTIONS. Coercing an absent value to `0` lands those rows last
 *      in the natural direction and FIRST the moment the player flips it. Asserted in both
 *      directions, because that is the only way the difference shows. On `/positions` the absent
 *      value is the RETURN of a bet that has not settled — so the coerced version answers
 *      "which of my bets did best?" with a page of undecided ones.
 *   2. DEFAULTS ARE OMITTED FROM EVERY HREF, so a clean page has a clean URL and a shared link
 *      carries no state the sharer never chose.
 *   3. CHANGING A FILTER DROPS `page`. A player on page 4 who presses a new lens must land on
 *      page 1 of the new result, never on page 4 of it — or on a page that does not exist.
 *   4. A COUNT IS NEVER COMPUTED OVER A WIDER SET THAN ITS OWN CONTROL WOULD SHOW. 🔴 The
 *      2026-08-10 incident: "40 live · TZS 1,659k in play" printed above a grid of ZERO cards at
 *      nine of nine viewport × locale combinations. The number was true; the board was a lie.
 *
 * ── §5 AND §6 ARE WHY THIS FILE EXISTS AT ALL RATHER THAN JUST §1–§4 ─────────────────────────
 * ⭐ `discovery.ts` keeps three lines it could have delegated, because `red:discovery-contract`
 * is anchored on them and `scripts/discovery-contract-red.mjs` reads ONE file, so those anchors
 * cannot follow the rules into `lib/query/`. §8 of the campaign says the gate does not bend — so
 * the copies stay and are proved EQUIVALENT here instead. A copy that cannot disagree is not a
 * drift, and unlike a comment saying "keep these in step" an assertion fails the day they part.
 *
 * Run: npm run test:query-core
 */
import {
  DEFAULTS,
  DEFAULT_STATE,
  SORT_IDS,
  SORT_SPEC,
  STATUS_IDS,
  ODDS_IDS,
  POOL_IDS,
  buildDiscoveryHref,
  compareRows,
  countFor as discoveryCountFor,
  effectiveDir as discoveryEffectiveDir,
  filterRows,
  type DiscoveryRow,
  type DiscoveryState,
} from "../src/lib/markets/discovery.ts";
import { oneOf, oneParam, parseDir, clampText } from "../src/lib/query/parse.ts";
import {
  byId,
  compareBy,
  comparePrimary,
  effectiveDir,
  sortBy,
  type SortDir,
  type SortSpec,
} from "../src/lib/query/sort.ts";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "../src/lib/query/href.ts";
import { countFor, countMatching, countsFor, filterRows as filterByAxes, matchesAll, type Axes } from "../src/lib/query/counts.ts";
import { MAX_EXITS, emptyKind, relaxations, type ExitCandidate } from "../src/lib/query/empty.ts";
import { DAY_MS, PLAYER_PRESETS, inWindow } from "../src/lib/query/windows.ts";
import { matchesWindow, type PortfolioRow } from "../src/lib/positions/portfolio.ts";
import { matchesLedgerWindow, type LedgerRow } from "../src/lib/wallet/ledger.ts";
import { matchesArchiveWindow, type ArchiveRow } from "../src/lib/results/archive.ts";
import { matchesUdWindow, type HistoryRow } from "../src/lib/updown/history-query.ts";
import { matchesBoardWindow, type BoardRow } from "../src/lib/proposals/board.ts";

let fail = 0;
const log = (m: string) => console.log(m);
function ok(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

/* ─────────────────────────────── a list to reason about ────────────────────────────────── */

/**
 * A deliberately small, deliberately AWKWARD fixture: two rows share a primary key (so the
 * tie-break is exercised), two have no value for `ret` (so the partition is exercised), and the
 * titles collide on case and accent (so collation is exercised rather than assumed).
 *
 * ⛔ Every row carries every field. A fixture that omits one silently tests a narrower rule than
 * it claims — `.mts` files are outside `tsconfig.include`, so the typechecker will not say so.
 */
type Bet = { id: string; stake: number; ret: number | null; title: string; placedAt: number; lens: string };

const BETS: Bet[] = [
  { id: "b3", stake: 500, ret: 200, title: "Élan", placedAt: 30, lens: "win" },
  { id: "b1", stake: 900, ret: null, title: "apple", placedAt: 10, lens: "open" },
  { id: "b4", stake: 500, ret: -500, title: "Apple", placedAt: 40, lens: "loss" },
  { id: "b2", stake: 100, ret: null, title: "zebra", placedAt: 20, lens: "open" },
  { id: "b5", stake: 700, ret: 0, title: "banana", placedAt: 50, lens: "void" },
];

type BetSortId = "stake" | "ret" | "title";
const BET_SPEC: SortSpec<Bet, BetSortId> = {
  ids: ["stake", "ret", "title"],
  natural: { stake: "desc", ret: "desc", title: "asc" },
  key: (r, s) => (s === "stake" ? r.stake : s === "ret" ? r.ret : r.title),
  // ⛔ Every id needs one. `placedAt` is unique here, so a tie-break that runs is observable.
  tieBreak: { stake: (a, b) => b.placedAt - a.placedAt, ret: (a, b) => b.placedAt - a.placedAt, title: (a, b) => b.placedAt - a.placedAt },
};

const ids = (rows: readonly Bet[]) => rows.map((r) => r.id).join(",");

/* ── §1 · the comparator: null-last in BOTH directions, tie-break, id final ─────────────── */
log("\n── 1 · the comparator ──────────────────────────────────────────");
{
  const desc = sortBy(BET_SPEC, BETS, { sort: "ret", dir: "desc" });
  const asc = sortBy(BET_SPEC, BETS, { sort: "ret", dir: "asc" });

  // 🔴 THE RULE. `b1` and `b2` have no return — an OPEN bet has not decided one. They must be
  //    last both ways round. `?? 0` would put them last descending and FIRST ascending, which is
  //    precisely the shape this assertion exists to refuse.
  ok("1.1 rows with no value sort LAST descending",
    desc.slice(-2).every((r) => r.ret == null), ids(desc));
  ok("1.2 …and LAST ascending too — the rule that `?? 0` silently breaks",
    asc.slice(-2).every((r) => r.ret == null), ids(asc));

  // ⭐ AND THE VALUED ROWS MUST ACTUALLY REVERSE. Without this, a comparator that returned the
  //    same order in both directions would satisfy 1.1 and 1.2 and be broken.
  const valued = (rs: Bet[]) => rs.filter((r) => r.ret != null).map((r) => r.id).join(",");
  ok("1.3 …while the rows that DO have a value reverse between the two directions",
    valued(desc) === valued(asc).split(",").reverse().join(","), `${valued(desc)} vs ${valued(asc)}`);

  // Two rows share stake 500 (b3, b4). The tie-break is `placedAt` descending, so b4 (40) leads.
  const byStake = sortBy(BET_SPEC, BETS, { sort: "stake", dir: "desc" });
  const tied = byStake.filter((r) => r.stake === 500).map((r) => r.id).join(",");
  ok("1.4 an explicit tie-break orders two rows with the same primary key", tied === "b4,b3", tied);

  // ⛔ And the FINAL tie-break is the id, so the order is total even when the tie-break ties too.
  const flat: SortSpec<Bet, "stake"> = {
    ids: ["stake"], natural: { stake: "desc" },
    key: () => 1,                    // every row equal
    tieBreak: { stake: () => 0 },    // …and the tie-break declines to choose
  };
  const total = sortBy(flat, BETS, { sort: "stake", dir: "desc" });
  ok("1.5 …and `id` is the final tie-break, so a total order survives an undecided tie-break",
    ids(total) === "b1,b2,b3,b4,b5", ids(total));
  ok("1.6 CONTROL: byId is a real comparator, not a constant",
    byId({ id: "a" }, { id: "b" }) < 0 && byId({ id: "b" }, { id: "a" }) > 0 && byId({ id: "a" }, { id: "a" }) === 0);

  // A word key is compared as a word, never by subtraction. Without the string arm both keys
  // would go through `ka - kb`, every comparison would be NaN, and the "order" would be whatever
  // the engine's sort happened to leave behind. `BET_SPEC` supplies no collator, so this is the
  // documented code-point fallback — deterministic and locale-free.
  const byTitle = sortBy(BET_SPEC, BETS, { sort: "title", dir: "asc" });
  ok("1.7 a STRING key orders deterministically instead of comparing NaN to NaN",
    byTitle.every((r, i) => i === 0 || byTitle[i - 1].title <= r.title) &&
      ids(byTitle).split(",").sort().join(",") === ids(BETS).split(",").sort().join(","),
    byTitle.map((r) => r.title).join(","));

  // ⭐ A SUPPLIED COLLATOR IS ACTUALLY USED. Code-point order puts every capital before every
  //    lower-case letter, so "Apple, Élan, apple" — a collator puts the two apples together.
  const collated: SortSpec<Bet, "title"> = { ...BET_SPEC, ids: ["title"], natural: { title: "asc" }, tieBreak: { title: (a, b) => b.placedAt - a.placedAt }, key: (r) => r.title, collate: new Intl.Collator("en").compare } as SortSpec<Bet, "title">;
  const withCollator = sortBy(collated, BETS, { sort: "title", dir: "asc" }).map((r) => r.title);
  const withoutCollator = sortBy({ ...collated, collate: undefined }, BETS, { sort: "title", dir: "asc" }).map((r) => r.title);
  ok("1.8 …and a supplied collator CHANGES the order a code-point compare would give",
    withCollator.join(",") !== withoutCollator.join(","), `${withCollator.join(",")} vs ${withoutCollator.join(",")}`);

  // The tri-state direction: absent means the sort's own natural direction.
  ok("1.9 an absent direction resolves to the sort's NATURAL direction",
    effectiveDir(BET_SPEC, { sort: "title", dir: null }) === "asc" &&
    effectiveDir(BET_SPEC, { sort: "stake", dir: null }) === "desc");
  ok("1.10 …and a chosen direction wins over it",
    effectiveDir(BET_SPEC, { sort: "title", dir: "desc" }) === "desc");

  // ⛔ SORTING MUST NOT MUTATE. These arrays are read again — for the counts beside the pills and
  //    for the pager total — so an in-place sort would reorder a list a count was computed over.
  const before = ids(BETS);
  sortBy(BET_SPEC, BETS, { sort: "stake", dir: "asc" });
  ok("1.11 sorting returns a NEW array and never reorders its input", ids(BETS) === before, ids(BETS));
}

/* ── §2 · the href builder ──────────────────────────────────────────────────────────────── */
log("\n── 2 · the href builder ────────────────────────────────────────");
{
  type S = { tab: string; sort: string; dir: string | null; side: string; q: string };
  const D: S = { tab: "all", sort: "recent", dir: null, side: "any", q: "" };

  ok("2.1 a clean page has a clean URL", buildQueryHref("/positions", D, D) === "/positions",
    buildQueryHref("/positions", D, D));

  // Every axis, one at a time — a param silently dropped by the builder is the defect this
  // module exists to remove.
  for (const [k, v] of [["tab", "win"], ["sort", "stake"], ["dir", "asc"], ["side", "yes"], ["q", "arsenal"]] as const) {
    const href = buildQueryHref("/positions", D, D, { [k]: v } as Partial<S>);
    ok(`2.2 ?${k}= survives the builder`, href === `/positions?${k}=${v}`, href);
  }

  /**
   * ⛔ `null` IS NEVER WRITTEN. `URLSearchParams` serialises it as the four-letter string "null" —
   * a value no allow-list contains, so it round-trips back to the default and LOOKS like it
   * worked, while the URL a player copies carries a token nothing in the product understands.
   *
   * ⚠️ THE DEFAULT MUST BE NON-NULL HERE, AND THE FIRST VERSION OF THIS ASSERTION MISSED THAT.
   * It compared a null `dir` against a default that was ALSO null, so the plain "equals the
   * default" branch skipped the param and the assertion passed whether or not the null guard
   * existed. `red:query-core`'s `null-serialised-as-the-word-null` case removed the guard and
   * this stayed GREEN. A page whose direction defaults to `desc` — which any page with a single
   * natural sort will have — is where the guard actually earns its keep.
   */
  const D_DESC: S = { ...D, dir: "desc" };
  const nulled = buildQueryHref("/positions", { ...D_DESC, dir: null }, D_DESC);
  ok("2.3 a null tri-state axis is omitted, never written as the string 'null'",
    !/null/.test(nulled), nulled);
  ok("2.3b CONTROL: that state really does differ from its default, so 2.3 could fail",
    D_DESC.dir !== null);

  // Param order is the DEFAULTS object's key order, so one state is always one URL.
  const a = buildQueryHref("/positions", D, D, { q: "x", tab: "win" });
  const b = buildQueryHref("/positions", D, D, { tab: "win", q: "x" });
  ok("2.4 the same state produces a byte-identical URL whatever order the patch is written in",
    a === b && a === "/positions?tab=win&q=x", `${a} vs ${b}`);

  ok("2.5 hasActiveFilters ignores the axes a page declares as view state",
    hasActiveFilters({ ...D, sort: "stake" }, D, ["sort", "dir"]) === false &&
    hasActiveFilters({ ...D, side: "yes" }, D, ["sort", "dir"]) === true);

  ok("2.6 the sheet badge counts ONLY the axes the sheet contains",
    sheetFilterCount({ ...D, tab: "win" }, D, ["side"]) === 0 &&
    sheetFilterCount({ ...D, side: "yes" }, D, ["side"]) === 1);
}

/* ── §3 · changing a filter drops the page ──────────────────────────────────────────────── */
log("\n── 3 · paging ──────────────────────────────────────────────────");
{
  type S = { tab: string; side: string };
  const D: S = { tab: "all", side: "any" };
  const state: S = { tab: "win", side: "yes" };

  ok("3.1 a pager link — no patch — KEEPS its page",
    buildQueryHref("/positions", state, D, {}, { page: 4 }) === "/positions?tab=win&side=yes&page=4",
    buildQueryHref("/positions", state, D, {}, { page: 4 }));

  // 🔴 THE RULE. Page 4 of "won" is not page 4 of "lost", and may not exist at all.
  ok("3.2 changing a filter DROPS the page, even when one was passed",
    buildQueryHref("/positions", state, D, { tab: "loss" }, { page: 4 }) === "/positions?tab=loss&side=yes",
    buildQueryHref("/positions", state, D, { tab: "loss" }, { page: 4 }));

  // ⚠️ …but a pill re-stating the state it is already in changed nothing, so it is not a filter
  //    change. Dropping the page there would make the SELECTED pill a "go to page 1" button — a
  //    control that looks inert and is not.
  ok("3.3 …but a pill re-stating the state it is already in is not a change, and keeps the page",
    buildQueryHref("/positions", state, D, { tab: "win" }, { page: 4 }) === "/positions?tab=win&side=yes&page=4",
    buildQueryHref("/positions", state, D, { tab: "win" }, { page: 4 }));

  ok("3.4 page 1 is never written into the URL",
    buildQueryHref("/positions", D, D, {}, { page: 1 }) === "/positions");
}

/* ── §4 · count honesty ─────────────────────────────────────────────────────────────────── */
log("\n── 4 · count honesty ───────────────────────────────────────────");
{
  type S = { lens: string; side: string };
  const D: S = { lens: "all", side: "any" };
  const AXES: Axes<Bet, S> = {
    lens: (r, s) => s.lens === "all" || r.lens === s.lens,
    // `side` stands in for any second axis: "big" keeps only the 700+ stakes.
    side: (r, s) => s.side === "any" || (s.side === "big" ? r.stake >= 700 : true),
  };

  const state: S = { lens: "all", side: "big" };   // 2 rows survive: b1 (900), b5 (700)
  ok("4.0 CONTROL: the fixture is narrowed by the active axis",
    filterByAxes(BETS, state, AXES).length === 2, String(filterByAxes(BETS, state, AXES).length));

  // 🔴 THE RULE. The count beside the `open` lens must be what pressing it would SHOW — with
  //    `side: big` still on. b1 is open AND big; b2 is open and not big. So the honest answer is
  //    1, and the census answer is 2.
  const cross = countFor(BETS, state, AXES, { lens: "open" });
  ok("4.1 a pill's count respects every OTHER active filter", cross === 1, String(cross));

  const census = BETS.filter((r) => r.lens === "open").length;
  ok("4.2 CONTROL: the census answer is different, so §4.1 could actually fail",
    census === 2 && census !== cross, `census ${census}, cross ${cross}`);

  // ⛔ `except` is for "how many if I dropped this one", and is NOT how a pill counts. If a pill
  //    ever used it, this is the number it would print.
  const widened = filterByAxes(BETS, state, AXES, "side").filter((r) => r.lens === "open").length;
  ok("4.3 …and using `except` for a pill's count is exactly the wider, wrong number",
    widened === census && widened !== cross, String(widened));

  ok("4.4 countsFor builds a whole rail against the SAME rule as a single count",
    JSON.stringify(countsFor(BETS, state, AXES, "lens", ["all", "open", "win", "loss", "void"])) ===
      JSON.stringify({ all: 2, open: 1, win: 0, loss: 0, void: 1 }),
    JSON.stringify(countsFor(BETS, state, AXES, "lens", ["all", "open", "win", "loss", "void"])));

  ok("4.5 countMatching and countFor-with-an-empty-patch are the same question",
    countMatching(BETS, state, AXES) === countFor(BETS, state, AXES, {}));

  ok("4.6 matchesAll is an AND over every axis — one `false` is enough",
    matchesAll(BETS[1], { lens: "open", side: "big" }, AXES) === true &&
    matchesAll(BETS[3], { lens: "open", side: "big" }, AXES) === false);
}

/* ── §5 · the empty state ───────────────────────────────────────────────────────────────── */
log("\n── 5 · empty causes and their exits ────────────────────────────");
{
  type S = { lens: string; side: string; when: string; q: string };
  const D: S = { lens: "all", side: "any", when: "any", q: "" };
  const AXES: Axes<Bet, S> = {
    lens: (r, s) => s.lens === "all" || r.lens === s.lens,
    side: (r, s) => s.side === "any" || r.stake >= 700,
    when: (r, s) => s.when === "any" || r.placedAt >= 40,
    q: (r, s) => !s.q || r.title.includes(s.q),
  };
  const kind = (state: S, shown: number, total: number) =>
    emptyKind({ state, defaults: D, axes: AXES, shown, total, lensKey: "lens", healthyEmpty: ["void"], searchKey: "q", windowKey: "when" });

  ok("5.1 a page with rows has no empty cause", kind(D, 5, 5) === null);
  ok("5.2 a player with nothing at all is told THAT, not that a filter missed",
    kind(D, 0, 0) === "no-rows");
  ok("5.3 …and that outranks a search, because the search is not why it is empty",
    kind({ ...D, q: "zzz" }, 0, 0) === "no-rows");
  ok("5.4 a search that matched nothing is a search miss", kind({ ...D, q: "zzz" }, 0, 5) === "search-miss");
  ok("5.5 an empty HEALTHY lens says so — nothing of yours has been refunded",
    kind({ ...D, lens: "void" }, 0, 5) === "lens-empty");

  // ⛔ THE CONDITION THAT MAKES 5.5 HONEST. "Nothing of yours has been refunded" is a confident
  //    false statement whenever something WAS refunded under some other filter.
  ok("5.6 …but ONLY when the lens is the only thing narrowing — otherwise it is a filter miss",
    kind({ ...D, lens: "void", side: "big" }, 0, 5) === "filter-miss");
  ok("5.7 a lens that is not a healthy-empty one is a plain filter miss",
    kind({ ...D, lens: "win" }, 0, 5) === "filter-miss");
  ok("5.8 the date window gets its own cause — the filter a player most often forgets is on",
    kind({ ...D, when: "recent" }, 0, 5) === "window-miss");
  ok("5.9 …but two narrowed axes is a filter miss, not a window miss",
    kind({ ...D, when: "recent", side: "big" }, 0, 5) === "filter-miss");

  // ⭐ SORT IS NOT A FILTER, and the axes record is what makes that structural: a sorted empty
  //    page must not be blamed on a filter nobody set.
  const withSort = { ...D, lens: "void", sort: "stake" } as S & { sort: string };
  ok("5.10 a state field that is NOT a filter axis cannot make a page read as a filter miss",
    emptyKind({ state: withSort, defaults: { ...D, sort: "recent" } as S & { sort: string }, axes: AXES as unknown as Axes<Bet, S & { sort: string }>, shown: 0, total: 5, lensKey: "lens", healthyEmpty: ["void"], searchKey: "q", windowKey: "when" }) === "lens-empty");

  // The exits.
  const EXITS: readonly ExitCandidate<S>[] = [
    { id: "side", patch: { side: "any" } },
    { id: "when", patch: { when: "any" } },
    { id: "q", patch: { q: "" } },
    { id: "lens", patch: { lens: "all" } },
  ];
  const narrowed: S = { lens: "win", side: "big", when: "recent", q: "" };
  const exits = relaxations(BETS, narrowed, AXES, EXITS);
  ok("5.11 every offered exit leads somewhere NON-EMPTY", exits.every((e) => e.count > 0),
    JSON.stringify(exits));
  ok("5.12 an exit that would change nothing is not offered",
    relaxations(BETS, D, AXES, EXITS).length === 0,
    JSON.stringify(relaxations(BETS, D, AXES, EXITS)));

  /**
   * ⛔ A CAP THAT TRUNCATES MUST TRUNCATE THE TAIL, not silently drop a qualifying exit from the
   * middle.
   *
   * ⚠️ THIS NEEDED ITS OWN FIXTURE, AND THE FIRST ATTEMPT AT IT ASSERTED A NUMBER I HAD NOT
   * DERIVED. Over `BETS` the four axes compose conjunctively, so relaxing any ONE of them still
   * left the other three excluding every row — exactly one candidate qualified and the assertion
   * failed against its own arithmetic rather than against the product. Four rows are built here
   * instead, each failing exactly one axis, so relaxing each axis in turn reveals exactly one
   * row and all four candidates genuinely qualify. Only then does "keeps the first three" mean
   * anything.
   */
  type Q = { a: string; b: string; c: string; d: string };
  const QD: Q = { a: "any", b: "any", c: "any", d: "any" };
  type QRow = { id: string; a: boolean; b: boolean; c: boolean; d: boolean };
  const QAXES: Axes<QRow, Q> = {
    a: (r, s) => s.a === "any" || r.a,
    b: (r, s) => s.b === "any" || r.b,
    c: (r, s) => s.c === "any" || r.c,
    d: (r, s) => s.d === "any" || r.d,
  };
  const QROWS: QRow[] = [
    { id: "qa", a: false, b: true, c: true, d: true },   // revealed by relaxing a
    { id: "qb", a: true, b: false, c: true, d: true },   // …by relaxing b
    { id: "qc", a: true, b: true, c: false, d: true },   // …by relaxing c
    { id: "qd", a: true, b: true, c: true, d: false },   // …by relaxing d
  ];
  const QEXITS: readonly ExitCandidate<Q>[] = [
    { id: "a", patch: { a: "any" } }, { id: "b", patch: { b: "any" } },
    { id: "c", patch: { c: "any" } }, { id: "d", patch: { d: "any" } },
  ];
  const qState: Q = { a: "on", b: "on", c: "on", d: "on" };
  ok("5.13 CONTROL: all four candidates genuinely qualify over this fixture",
    QEXITS.every((e) => countFor(QROWS, qState, QAXES, e.patch) === 1),
    QEXITS.map((e) => `${e.id}:${countFor(QROWS, qState, QAXES, e.patch)}`).join(" "));
  const capped = relaxations(QROWS, qState, QAXES, QEXITS);

  /**
   * ⚠️ THIS ASSERTION MOVED ONTO THIS FIXTURE BECAUSE IT WAS VACUOUS ON THE OTHER ONE. It used to
   * read `exits.length <= MAX_EXITS` over `BETS`, where at most one candidate ever qualified — so
   * it was true of a cap that did not exist. `red:query-core`'s `the-cap-is-removed` case raised
   * the cap to 99 and the gate went red on the ORDER assertion below instead, which is how the
   * weakness was found. Four candidates qualify here, so "never more than three" is a real claim.
   */
  ok("5.14 never more than three exits are offered", capped.length <= MAX_EXITS, String(capped.length));
  ok("5.15 …and the cap keeps the FIRST three, in the contract's declared order",
    capped.length === MAX_EXITS && capped.map((e) => e.id).join(",") === "a,b,c",
    capped.map((e) => e.id).join(","));
}

/* ── §6 · the parse primitives ──────────────────────────────────────────────────────────── */
log("\n── 6 · parsing an untrusted URL ────────────────────────────────");
{
  ok("6.1 a repeated param takes the FIRST value", oneParam({ tab: ["a", "b"] }, "tab") === "a");
  ok("6.2 an absent param is undefined", oneParam({}, "tab") === undefined);
  ok("6.3 an unknown value falls back — it never throws and is never passed through",
    oneOf(["all", "win"] as const, "'; DROP TABLE--", "all") === "all");
  ok("6.4 a known value is narrowed, not defaulted", oneOf(["all", "win"] as const, "win", "all") === "win");
  ok("6.5 the direction is TRI-STATE — anything but asc/desc is null",
    parseDir("asc") === "asc" && parseDir("desc") === "desc" && parseDir("sideways") === null && parseDir(undefined) === null);
  ok("6.6 free text is trimmed and clamped by the caller's cap",
    clampText("   arsenal   ", 4) === "arse" && clampText(undefined, 10) === "");
}

/* ── §7 · THE EQUIVALENCES — the copies `discovery.ts` keeps for its red proofs ─────────── */
log("\n── 7 · discovery.ts ≡ the core it was lifted from ──────────────");
{
  const NOW = Date.parse("2026-08-13T12:00:00Z");
  const H = 3600_000;
  let n = 0;
  const mkt = (over: Partial<DiscoveryRow> = {}): DiscoveryRow => ({
    id: "m" + String(++n).padStart(3, "0"),
    category: "sports", pool: 20_000, predictors: 5, yesPct: 50, move24h: 3,
    createdAtMs: NOW - 10 * H, bettableUntilMs: NOW + 10 * H, resolvesAtMs: NOW + 12 * H,
    selectionClosed: false, verdictRecorded: false, status: "LIVE", watched: false, ...over,
  });

  // A spread deliberately containing rows with NO value for `move` and NO value for `close`,
  // ties on pool, and both lifecycle states — so every branch of the comparator is reached.
  const ROWS: DiscoveryRow[] = [
    mkt({ move24h: undefined, yesPct: null, pool: 0, predictors: 0 }),
    mkt({ move24h: undefined, pool: 20_000 }),
    mkt({ move24h: 12, pool: 20_000 }),
    mkt({ move24h: -4, pool: 50_000, selectionClosed: true }),
    mkt({ move24h: 0, pool: 10_000, yesPct: 90, status: "CLOSED", selectionClosed: true, verdictRecorded: true }),
    // ⚠️ A SMALL POOL, DELIBERATELY. §7.7 asks whether a `status: watch` count still respects an
    //    active `pool: 50k`. The first version of this fixture gave the watched row a 50,000 pool,
    //    so the cross-filtered answer and the census answer were BOTH 1 and the assertion could
    //    not have failed however broken the product was — a control that proves nothing.
    mkt({ move24h: 7, pool: 1_000, yesPct: 12, watched: true }),
  ];

  /**
   * 🔴 THE ASSERTION THAT MAKES THE KEPT COPY SAFE. `compareRows` writes out the order its
   * tie-break and `byId` are applied in, because `red:discovery-contract`'s
   * `ties-left-to-sort-stability` is anchored on that line. This proves it is the same function
   * as `compareBy(SORT_SPEC, …)` for EVERY pair in EVERY sort in BOTH directions — so the day
   * somebody edits one of them, this fails instead of the two quietly diverging.
   */
  let pairs = 0;
  let mismatch = "";
  for (const sort of SORT_IDS) {
    for (const dir of ["asc", "desc"] as SortDir[]) {
      for (const a of ROWS) for (const b of ROWS) {
        pairs++;
        const x = Math.sign(compareRows(a, b, sort, dir));
        const y = Math.sign(compareBy(SORT_SPEC, a, b, sort, dir));
        if (x !== y && !mismatch) mismatch = `${sort}/${dir} ${a.id} vs ${b.id}: ${x} ≠ ${y}`;
      }
    }
  }
  ok("7.1 compareRows ≡ compareBy(SORT_SPEC) for every pair, every sort, both directions",
    mismatch === "", mismatch);
  ok("7.2 CONTROL: that comparison actually ran over a real spread",
    pairs === SORT_IDS.length * 2 * ROWS.length * ROWS.length && pairs > 400, `${pairs} pairs`);

  // ⭐ AND THE PARTITION IS REACHED. Without a row that has no value for the sort, 7.1 would be
  //    true of a comparator with no null handling at all.
  ok("7.3 CONTROL: the fixture contains rows with NO value for `move` and for `close`",
    ROWS.some((r) => r.move24h == null) && ROWS.some((r) => r.yesPct == null));
  ok("7.4 CONTROL: comparePrimary returns 0 when NEITHER row has a value, so a tie-break can run",
    comparePrimary(SORT_SPEC, ROWS[0], ROWS[1], "move", "desc") === 0);

  /**
   * 🔴 THE SECOND KEPT COPY. `buildDiscoveryHref` writes out its per-param lines because
   * `default-written-into-the-url` is anchored on the `status` one, and the red harness reads a
   * single file so the anchor cannot follow the rule into `lib/query/href.ts`. This proves the
   * two builders answer identically across the state space.
   */
  const DIRS: (SortDir | null)[] = [null, "asc", "desc"];
  const TOPICS = ["all", "sports", "macro"];
  let urls = 0;
  let urlMismatch = "";
  for (const status of STATUS_IDS) for (const sort of SORT_IDS) for (const dir of DIRS)
    for (const odds of ODDS_IDS) for (const pool of POOL_IDS) for (const topic of TOPICS)
      for (const q of ["", "arsenal"]) {
        const s: DiscoveryState = { status, sort, dir, odds, pool, topic, q };
        for (const page of [undefined, 1, 3]) {
          urls++;
          const a = buildDiscoveryHref(s, {}, { page });
          const b = buildQueryHref("/markets", s as unknown as Record<string, string | null>, DEFAULT_STATE as unknown as Record<string, string | null>, {}, { page });
          if (a !== b && !urlMismatch) urlMismatch = `${JSON.stringify(s)} page=${page}: ${a} ≠ ${b}`;
        }
      }
  ok("7.5 buildDiscoveryHref ≡ buildQueryHref('/markets', …) across the whole state space",
    urlMismatch === "", urlMismatch);
  ok("7.6 CONTROL: that comparison actually ran over the whole space", urls > 5000, `${urls} urls`);

  // The third kept copy is `countFor`'s patch line. It must still cross-filter.
  const state: DiscoveryState = { ...DEFAULT_STATE, status: "all", pool: "50k" };
  const crossed = discoveryCountFor(ROWS, state, NOW, () => true, { status: "watch" });
  const wider = ROWS.filter((r) => r.watched).length;
  ok("7.7 discovery's countFor still respects the ACTIVE pool filter (the kept patch line)",
    crossed === 0 && wider === 1, `cross ${crossed}, census ${wider}`);

  ok("7.8 discovery's effectiveDir ≡ the core's",
    SORT_IDS.every((sort) => DIRS.every((dir) =>
      discoveryEffectiveDir({ sort, dir }) === effectiveDir(SORT_SPEC, { sort, dir }))));

  // filterRows still narrows — a CONTROL so §7.7's zero cannot be a fixture that filters to
  // nothing whatever it is asked.
  ok("7.9 CONTROL: discovery's filterRows returns rows for a state that should match some",
    filterRows(ROWS, { ...DEFAULT_STATE, status: "all" }, NOW, () => true).length > 0);
}

/* ── §8 · the vacuity floor ─────────────────────────────────────────────────────────────── */
log("\n── 8 · this gate refuses to pass over nothing ──────────────────");
{
  ok("8.1 the fixture is the size this gate's arithmetic assumes", BETS.length === 5);
  ok("8.2 DEFAULTS and DEFAULT_STATE still agree", JSON.stringify(DEFAULTS) === JSON.stringify(DEFAULT_STATE));
  ok("8.3 the core's exports are all reachable",
    [oneOf, oneParam, parseDir, clampText, byId, compareBy, comparePrimary, effectiveDir, sortBy,
     buildQueryHref, hasActiveFilters, sheetFilterCount, countFor, countMatching, countsFor,
     filterByAxes, matchesAll, relaxations, emptyKind].every((f) => typeof f === "function"));
}

/* ── §9 · THE DATE WINDOW — one span, five surfaces ──────────────────────────────────────── */
/**
 * 🔴 THIS SECTION EXISTS BECAUSE THE WINDOW HAD NO GATE AT ALL. Re-derived before writing it:
 *
 *     grep -rln "matchesWindow\|matchesLedgerWindow\|matchesArchiveWindow" scripts/   →  none
 *
 * The predicate that decides which of a player's OWN money rows they are shown was asserted
 * nowhere, on any surface, while the same four lines of arithmetic were copied into five contract
 * modules. `windows.ts`'s header promised *"'LAST 30 DAYS' MUST MEAN THE SAME SPAN EVERYWHERE"* and
 * nothing checked it — so a retune of one copy would have shipped two meanings of one word with
 * every suite green.
 *
 * ⛔ §9.5 IS THE ONE THAT MATTERS: it asserts the five surfaces AGREE, over the same instants, by
 * running all five predicates rather than by trusting that they read the same helper. A gate that
 * only tested `inWindow` would pass the day someone re-inlined a copy.
 */
log("\n── 9 · the date window: one span, five surfaces ────────────────");
{
  // A fixed clock. ⛔ Not `Date.now()` — "today" would then depend on the hour the suite runs,
  //    which is how a boundary test comes to pass all day and fail at midnight.
  const NOW = new Date(2026, 8, 8, 14, 30, 0).getTime(); // 2026-09-08 14:30 local
  const startOfToday = new Date(2026, 8, 8).getTime();

  ok("9.1 `all` admits everything, including a row stamped in the future",
    inWindow(0, "all", NOW) && inWindow(NOW + 10 * DAY_MS, "all", NOW));

  ok("9.2 `today` is a CALENDAR day — its first instant is in, the one before it is out",
    inWindow(startOfToday, "today", NOW) && !inWindow(startOfToday - 1, "today", NOW),
    `startOfToday ${startOfToday}`);

  // ⛔ THE HALF-OPEN BOUNDARY, ASSERTED FROM BOTH SIDES. `yesterday` ends where `today` begins;
  //    if either arm used `<=` the same instant would belong to two windows and the two pills
  //    would each count it — the count-honesty defect §4 exists for, in the time dimension.
  ok("9.3 `yesterday` is half-open: [startOfYesterday, startOfToday)",
    inWindow(startOfToday - DAY_MS, "yesterday", NOW)
      && inWindow(startOfToday - 1, "yesterday", NOW)
      && !inWindow(startOfToday, "yesterday", NOW)
      && !inWindow(startOfToday - DAY_MS - 1, "yesterday", NOW));

  ok("9.4 `today` and `yesterday` are DISJOINT and `7d` covers both",
    PLAYER_PRESETS.includes("7d")
      && [startOfToday - DAY_MS, startOfToday - 1, startOfToday, NOW].every(
        (ms) => !(inWindow(ms, "today", NOW) && inWindow(ms, "yesterday", NOW))
          && inWindow(ms, "7d", NOW)));

  ok("9.5 `7d`/`30d` are ROLLING from now, not calendar — the edge is inclusive",
    inWindow(NOW - 7 * DAY_MS, "7d", NOW)
      && !inWindow(NOW - 7 * DAY_MS - 1, "7d", NOW)
      && inWindow(NOW - 30 * DAY_MS, "30d", NOW)
      && !inWindow(NOW - 30 * DAY_MS - 1, "30d", NOW));

  /**
   * ⭐ THE AGREEMENT ASSERTION. Five contracts, five different date fields, one answer required.
   * Each row is built with ONLY the field its own predicate reads set to the instant under test —
   * the rest are cast through `as` because these predicates take a whole row and read one field,
   * and constructing five full fixtures would test the fixtures rather than the rule.
   */
  const INSTANTS = [
    startOfToday - DAY_MS - 1, startOfToday - DAY_MS, startOfToday - 1, startOfToday,
    NOW - 30 * DAY_MS - 1, NOW - 30 * DAY_MS, NOW - 7 * DAY_MS - 1, NOW - 7 * DAY_MS, NOW,
  ];
  const SURFACES: [string, (ms: number, w: (typeof PLAYER_PRESETS)[number]) => boolean][] = [
    ["/positions", (ms, w) => matchesWindow({ placedAtMs: ms } as PortfolioRow, w, NOW)],
    ["/wallet", (ms, w) => matchesLedgerWindow({ createdAtMs: ms } as LedgerRow, w, NOW)],
    ["/results", (ms, w) => matchesArchiveWindow({ resolvedAtMs: ms } as ArchiveRow, w, NOW)],
    ["/updown/history", (ms, w) => matchesUdWindow({ binnedAtMs: ms } as HistoryRow, w, NOW)],
    ["/proposals", (ms, w) => matchesBoardWindow({ createdAtMs: ms } as BoardRow, w, NOW)],
  ];
  const disagreements: string[] = [];
  for (const w of PLAYER_PRESETS) {
    for (const ms of INSTANTS) {
      const truth = inWindow(ms, w, NOW);
      for (const [id, fn] of SURFACES) {
        if (fn(ms, w) !== truth) disagreements.push(`${id} ${w} @${ms}`);
      }
    }
  }
  ok("9.6 all five player surfaces answer identically to the core, over every preset × edge",
    disagreements.length === 0, disagreements.slice(0, 5).join(" · "));

  // ⛔ THE VACUITY CONTROL. §9.6 compares predicates to `inWindow`; if the fixture instants all
  //    fell inside every window, five `true`s would agree and prove nothing. This asserts the
  //    comparison set actually contains both answers.
  const answers = new Set(PLAYER_PRESETS.flatMap((w) => INSTANTS.map((ms) => inWindow(ms, w, NOW))));
  ok("9.7 CONTROL: the instants under test produce BOTH answers, so §9.6 could fail",
    answers.has(true) && answers.has(false),
    `${SURFACES.length} surfaces × ${PLAYER_PRESETS.length} presets × ${INSTANTS.length} instants`);
}

log("");
if (fail > 0) { console.error(`❌ query core: ${fail} assertion(s) failed`); process.exit(1); }
console.log("✅ query core: all assertions passed");
