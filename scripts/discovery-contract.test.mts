/**
 * DISCOVERY CONTRACT GUARD — the /markets status · sort · odds · pool · topic contract.
 *
 * The round-2 design kit specified this board, and on the points that decide a player's view
 * it either contradicted itself or left the question open. This gate pins the resolutions so a
 * later session cannot quietly drift back to the kit's literal text (or to its prototype, which
 * disagrees with its own documentation). Each block names the specific thing it prevents.
 *
 * What the kit got wrong, and this asserts:
 *
 *   1. `Biggest move` with no 24h baseline. The written rule (OPEN-QUESTIONS.md:140-142) and
 *      ACCEPTANCE.md:111 both say absent sorts LAST. The prototype coerces absent → 0
 *      (`key:m=>Math.abs(m.move||0)`), which lands them last only in the natural descending
 *      direction and puts them FIRST the moment the player flips direction. Asserted in BOTH
 *      directions, which is the only way the difference shows.
 *
 *   2. Cold-start markets in the odds buckets. `impliedYesPct` returns a hardcoded 50 on a
 *      market nobody has staked (market-service.ts:232-236). Filtering on that files a market
 *      with no pool under "Close call · 40–60%" on the strength of a number nobody produced —
 *      licence condition 1 (never render a guessed number) applied to filtering.
 *
 *   3. Count honesty. The drawn layouts render `Open 41` beside a result line reading `9` with
 *      two filters pressed; the prototype cross-filters. This asserts the prototype's
 *      behaviour, because the layouts' shape is the 2026-08-10 incident: "40 live · TZS 1,659k
 *      in play" printed above a grid of ZERO cards, at nine of nine viewport × locale
 *      combinations. The number was true and the board was still a lie.
 *
 *   4. Tie-breaking. The kit specifies none, anywhere. The prototype leans on JS sort
 *      stability, so two equal rows order by whatever the database returned — on a board that
 *      auto-refreshes every 30s, that is a grid that reshuffles under the reader.
 *
 *   5. The two definitions the kit left open (PLAN-OF-RECORD §8.1/§8.2): `open` excludes a
 *      selection-closed market, `all` is LIVE ∪ CLOSED and never reaches into the settled
 *      archive that /results already owns.
 *
 * Run: npm run test:discovery-contract
 */
import {
  DEFAULTS,
  DEFAULT_STATE,
  SORT_NATURAL_DIR,
  buildDiscoveryHref,
  clearedState,
  compareRows,
  countFor,
  effectiveDir,
  emptyCause,
  filterRows,
  hasActiveFilters,
  matchesOdds,
  matchesPool,
  matchesStatus,
  pageSizeFor,
  parseDiscoveryParams,
  relaxations,
  sortRows,
  type DiscoveryRow,
  type DiscoveryState,
} from "../src/lib/markets/discovery.ts";

let fail = 0;
const log = (m: string) => console.log(m);
function ok(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

const NOW = Date.parse("2026-08-13T12:00:00Z");
const H = 3600_000;
const TOPICS = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"];

function row(over: Partial<DiscoveryRow> = {}): DiscoveryRow {
  return {
    id: "m_" + Math.random().toString(36).slice(2, 8),
    category: "sports",
    pool: 20_000,
    predictors: 5,
    yesPct: 50,
    move24h: 3,
    createdAtMs: NOW - 10 * H,
    bettableUntilMs: NOW + 10 * H,
    selectionClosed: false,
    status: "LIVE",
    watched: false,
    ...over,
  };
}
const noText = () => true;

// ── 1 · the URL contract: defaults omitted, everything round-trips ─────────────
log("\n── 1 · URL contract ────────────────────────────────────────────");
{
  ok("a clean board has a clean URL", buildDiscoveryHref(DEFAULT_STATE) === "/markets",
    buildDiscoveryHref(DEFAULT_STATE));

  // Every axis, one at a time — a param that is silently dropped by the builder is the exact
  // defect this module was created to remove (the page previously had FOUR href builders).
  const axes: Array<[Partial<DiscoveryState>, string]> = [
    [{ status: "all" }, "status=all"],
    [{ sort: "pool" }, "sort=pool"],
    [{ dir: "asc" }, "dir=asc"],
    [{ odds: "cont" }, "odds=cont"],
    [{ pool: "10k" }, "pool=10k"],
    [{ topic: "macro" }, "topic=macro"],
    [{ q: "simba" }, "q=simba"],
  ];
  for (const [patch, expect] of axes) {
    const href = buildDiscoveryHref(DEFAULT_STATE, patch);
    ok(`href carries ${expect}`, href.includes(expect), href);
  }

  // Round-trip: what the builder writes, the parser must read back identically.
  const full: DiscoveryState = {
    status: "today", sort: "people", dir: "desc", odds: "long", pool: "50k",
    topic: "crypto", q: "bitcoin",
  };
  const href = buildDiscoveryHref(full);
  const sp = Object.fromEntries(new URL("http://x" + href).searchParams.entries());
  const back = parseDiscoveryParams(sp, TOPICS);
  ok("state round-trips through the URL", JSON.stringify(back) === JSON.stringify(full),
    `${JSON.stringify(back)} vs ${JSON.stringify(full)}`);

  // A hand-edited or stale link must render a board, never throw.
  const junk = parseDiscoveryParams(
    { status: "banana", sort: "../etc", dir: "sideways", odds: "9", pool: "x", topic: "politics", q: "  hi  " },
    TOPICS,
  );
  ok("unknown values fall back to defaults", junk.status === DEFAULTS.status && junk.sort === DEFAULTS.sort
    && junk.dir === null && junk.odds === DEFAULTS.odds && junk.pool === DEFAULTS.pool
    && junk.topic === DEFAULTS.topic, JSON.stringify(junk));
  ok("query is trimmed", junk.q === "hi", JSON.stringify(junk.q));
  // 'politics' is licence-excluded and is not in the topic list — it must not become a filter.
  ok("a topic outside the taxonomy is refused", junk.topic === "all", junk.topic);

  ok("Clear all returns to the DEFAULT board, not to All",
    clearedState({ ...full }).status === "open");
  ok("Clear all keeps the player's sort", clearedState({ ...full }).sort === "people");
  ok("hasActiveFilters is false on the default board", !hasActiveFilters(DEFAULT_STATE));
  ok("hasActiveFilters is true once anything is narrowed", hasActiveFilters({ ...DEFAULT_STATE, pool: "10k" }));
  // Sort is a VIEW preference, not a filter — changing it must not light up "Clear all".
  ok("sort alone is not an active filter", !hasActiveFilters({ ...DEFAULT_STATE, sort: "pool", dir: "asc" }));
}

// ── 2 · the two definitions the kit left open ─────────────────────────────────
log("\n── 2 · status predicates (PLAN-OF-RECORD §8.1 / §8.2) ──────────");
{
  const bettable = row();
  const selClosed = row({ selectionClosed: true });
  const closed = row({ status: "CLOSED", selectionClosed: true });
  const resolved = row({ status: "RESOLVED", selectionClosed: true });
  const voided = row({ status: "VOIDED", selectionClosed: true });

  ok("open includes a bettable market", matchesStatus(bettable, "open", NOW));
  ok("open EXCLUDES a selection-closed market", !matchesStatus(selClosed, "open", NOW));
  ok("open excludes CLOSED", !matchesStatus(closed, "open", NOW));

  ok("all includes LIVE", matchesStatus(bettable, "all", NOW));
  ok("all includes a selection-closed market", matchesStatus(selClosed, "all", NOW));
  ok("all includes CLOSED", matchesStatus(closed, "all", NOW));
  // /results owns the settled archive — All must not re-draw a whole nav destination.
  ok("all EXCLUDES RESOLVED", !matchesStatus(resolved, "all", NOW));
  ok("all EXCLUDES VOIDED", !matchesStatus(voided, "all", NOW));

  // open ⊂ all — the difference is exactly what makes a segment control worth having. The
  // kit's prototype gave both the identical predicate `() => true`, so it could not.
  const universe = [bettable, selClosed, closed, resolved, voided];
  const opens = universe.filter((r) => matchesStatus(r, "open", NOW));
  const alls = universe.filter((r) => matchesStatus(r, "all", NOW));
  ok("open is a strict subset of all", opens.every((r) => alls.includes(r)) && alls.length > opens.length,
    `open=${opens.length} all=${alls.length}`);

  ok("today = bettable and closing within 24h",
    matchesStatus(row({ bettableUntilMs: NOW + 5 * H }), "today", NOW));
  ok("today excludes a market closing in 30h",
    !matchesStatus(row({ bettableUntilMs: NOW + 30 * H }), "today", NOW));
  ok("today excludes a selection-closed market",
    !matchesStatus(row({ bettableUntilMs: NOW + 5 * H, selectionClosed: true }), "today", NOW));

  // "New" follows market-card.tsx (volume 0 + predictors 0), NOT the kit's "added in 4 days".
  ok("new follows the card: no pool and no predictors",
    matchesStatus(row({ pool: 0, predictors: 0 }), "new", NOW));
  ok("new is NOT merely 'created recently'",
    !matchesStatus(row({ pool: 5_000, predictors: 1, createdAtMs: NOW - H }), "new", NOW));

  ok("watch is membership, not lifecycle", matchesStatus(row({ watched: true, selectionClosed: true }), "watch", NOW));
  ok("watch excludes an unwatched market", !matchesStatus(row({ watched: false }), "watch", NOW));
}

// ── 3 · odds and pool buckets ─────────────────────────────────────────────────
log("\n── 3 · odds / pool buckets ─────────────────────────────────────");
{
  ok("call is 40–60 inclusive at both edges",
    matchesOdds(row({ yesPct: 40 }), "call") && matchesOdds(row({ yesPct: 60 }), "call"));
  ok("call excludes 39 and 61",
    !matchesOdds(row({ yesPct: 39 }), "call") && !matchesOdds(row({ yesPct: 61 }), "call"));
  ok("cont is 25–75 inclusive",
    matchesOdds(row({ yesPct: 25 }), "cont") && matchesOdds(row({ yesPct: 75 }), "cont"));
  ok("call is a strict subset of cont",
    [40, 50, 60].every((p) => matchesOdds(row({ yesPct: p }), "cont")));
  ok("long is STRICTLY under 15", matchesOdds(row({ yesPct: 14.9 }), "long") && !matchesOdds(row({ yesPct: 15 }), "long"));

  // The cold-start trap. A market with no pool has no implied price; impliedYesPct's hardcoded
  // 50 must never reach a filter.
  const cold = row({ pool: 0, predictors: 0, yesPct: null });
  ok("a market with no pool is in NO odds bucket",
    !matchesOdds(cold, "call") && !matchesOdds(cold, "cont") && !matchesOdds(cold, "long"));
  ok("a market with no pool still passes odds=any", matchesOdds(cold, "any"));

  ok("pool 10k is inclusive at the floor", matchesPool(row({ pool: 10_000 }), "10k"));
  ok("pool 10k excludes 9,999", !matchesPool(row({ pool: 9_999 }), "10k"));
  ok("pool 50k is inclusive at the floor", matchesPool(row({ pool: 50_000 }), "50k"));
  ok("pool any admits an empty pool", matchesPool(row({ pool: 0 }), "any"));
}

// ── 4 · sorting: absent values LAST in BOTH directions ────────────────────────
log("\n── 4 · sorting ─────────────────────────────────────────────────");
{
  const a = row({ id: "a", move24h: 10 });
  const b = row({ id: "b", move24h: 2 });
  const none = row({ id: "none", move24h: undefined });

  for (const dir of ["desc", "asc"] as const) {
    const sorted = sortRows([none, a, b], { sort: "move", dir });
    ok(`Biggest move: absent sorts LAST (dir=${dir})`, sorted[sorted.length - 1].id === "none",
      sorted.map((r) => r.id).join(","));
  }
  // The RED proof of the kit's own bug: had absent been coerced to 0, ascending would put it first.
  {
    const asc = sortRows([none, a, b], { sort: "move", dir: "asc" });
    ok("Biggest move ascending does not lead with the absent row", asc[0].id !== "none",
      asc.map((r) => r.id).join(","));
  }

  // Same rule for Closest call, where an empty pool has no distance-from-50.
  for (const dir of ["asc", "desc"] as const) {
    const sorted = sortRows([row({ id: "cold", yesPct: null, pool: 0 }), row({ id: "even", yesPct: 50 }), row({ id: "skew", yesPct: 90 })],
      { sort: "close", dir });
    ok(`Closest call: no implied price sorts LAST (dir=${dir})`, sorted[sorted.length - 1].id === "cold",
      sorted.map((r) => r.id).join(","));
  }

  ok("natural directions match the kit's table",
    SORT_NATURAL_DIR.closing === "asc" && SORT_NATURAL_DIR.pool === "desc"
    && SORT_NATURAL_DIR.people === "desc" && SORT_NATURAL_DIR.close === "asc"
    && SORT_NATURAL_DIR.move === "desc" && SORT_NATURAL_DIR.new === "desc");
  ok("a null direction resolves to the sort's natural one",
    effectiveDir({ sort: "pool", dir: null }) === "desc" && effectiveDir({ sort: "pool", dir: "asc" }) === "asc");

  ok("closing soonest orders by the deadline the CARD shows",
    sortRows([row({ id: "late", bettableUntilMs: NOW + 50 * H }), row({ id: "soon", bettableUntilMs: NOW + H })],
      { sort: "closing", dir: null })[0].id === "soon");

  // Determinism: equal rows must not depend on the order the database returned them.
  {
    const eq = [1, 2, 3, 4, 5].map((n) => row({ id: `eq${n}`, pool: 1_000, predictors: 1, bettableUntilMs: NOW + H, createdAtMs: NOW - H }));
    const one = sortRows(eq, { sort: "pool", dir: null }).map((r) => r.id).join(",");
    const two = sortRows([...eq].reverse(), { sort: "pool", dir: null }).map((r) => r.id).join(",");
    ok("ties are broken deterministically, whatever the input order", one === two, `${one} vs ${two}`);
  }
  // A comparator must be antisymmetric or Array.sort is free to produce anything.
  {
    const x = row({ id: "x", pool: 10 }), y = row({ id: "y", pool: 20 });
    ok("the comparator is antisymmetric",
      Math.sign(compareRows(x, y, "pool", "desc")) === -Math.sign(compareRows(y, x, "pool", "desc")));
  }
}

// ── 5 · count honesty ─────────────────────────────────────────────────────────
log("\n── 5 · counts are cross-filtered ───────────────────────────────");
{
  // 3 sports + 2 macro, all bettable; only the sports ones clear a 10k pool.
  const rows = [
    row({ id: "s1", category: "sports", pool: 30_000 }),
    row({ id: "s2", category: "sports", pool: 30_000 }),
    row({ id: "s3", category: "sports", pool: 30_000 }),
    row({ id: "m1", category: "macro", pool: 1_000 }),
    row({ id: "m2", category: "macro", pool: 1_000 }),
  ];
  const state: DiscoveryState = { ...DEFAULT_STATE, pool: "10k" };

  const shown = filterRows(rows, state, NOW, noText).length;
  ok("the board shows 3 with a 10k pool filter", shown === 3, String(shown));

  const macroCount = countFor(rows, state, NOW, noText, { topic: "macro" });
  ok("the Macro count respects the ACTIVE pool filter (0, not 2)", macroCount === 0, String(macroCount));

  const sportsCount = countFor(rows, state, NOW, noText, { topic: "sports" });
  ok("the Sports count is 3", sportsCount === 3, String(sportsCount));

  // The property, stated directly: pressing a control yields exactly the number beside it.
  for (const topic of ["sports", "macro", "all"]) {
    const promised = countFor(rows, state, NOW, noText, { topic });
    const actual = filterRows(rows, { ...state, topic }, NOW, noText).length;
    ok(`pressing topic=${topic} yields exactly its promised count`, promised === actual, `${promised} vs ${actual}`);
  }
  for (const status of ["open", "today", "new", "all"] as const) {
    const promised = countFor(rows, state, NOW, noText, { status });
    const actual = filterRows(rows, { ...state, status }, NOW, noText).length;
    ok(`pressing status=${status} yields exactly its promised count`, promised === actual, `${promised} vs ${actual}`);
  }
}

// ── 6 · empty states and their exits ──────────────────────────────────────────
log("\n── 6 · empty causes + relaxations ──────────────────────────────");
{
  ok("a search that matches nothing is a SEARCH miss",
    emptyCause({ ...DEFAULT_STATE, q: "zzz" }, 0, 40) === "search-miss");
  ok("an empty Watching list is its own cause",
    emptyCause({ ...DEFAULT_STATE, status: "watch" }, 0, 40) === "watching-empty");
  ok("filters that match nothing over a non-empty book is a FILTER miss",
    emptyCause({ ...DEFAULT_STATE, pool: "50k" }, 0, 40) === "filter-miss");
  ok("an empty platform is not blamed on the filters",
    emptyCause(DEFAULT_STATE, 0, 0) === "no-inventory");
  ok("a board with cards has no empty cause", emptyCause(DEFAULT_STATE, 5, 40) === null);

  const rows = [row({ category: "macro", pool: 1_000 }), row({ category: "macro", pool: 2_000 })];
  const state: DiscoveryState = { ...DEFAULT_STATE, pool: "50k", topic: "sports" };
  const rx = relaxations(rows, state, NOW, noText);
  ok("every offered exit leads somewhere non-empty", rx.every((r) => r.count > 0),
    JSON.stringify(rx.map((r) => [r.id, r.count])));
  ok("at most three exits are offered", rx.length <= 3, String(rx.length));
  for (const r of rx) {
    const actual = filterRows(rows, { ...state, ...r.patch }, NOW, noText).length;
    ok(`the ${r.id} exit promises the count it delivers`, r.count === actual, `${r.count} vs ${actual}`);
  }
  // On the DEFAULT board the only narrowing in force is `open` itself, so the only honest exit
  // is the one that widens past it. This matters: if `open` is empty while selection-closed or
  // CLOSED markets exist, "include everything" is a real destination — and it is the only
  // compensation that is NOT downstream of the thing that emptied the board, which is precisely
  // where the three 2026-08-10 compensations failed.
  {
    const onDefault = relaxations(rows, DEFAULT_STATE, NOW, noText);
    ok("the default board offers exactly one exit, and it is 'include everything'",
      onDefault.length === 1 && onDefault[0].id === "status" && onDefault[0].patch.status === "all",
      JSON.stringify(onDefault.map((r) => [r.id, r.count])));
  }
  // …and when even that leads nowhere, nothing is offered rather than a dead link.
  {
    const noneAnywhere = relaxations([], DEFAULT_STATE, NOW, noText);
    ok("an empty platform offers no exits at all (never a dead link)", noneAnywhere.length === 0,
      JSON.stringify(noneAnywhere));
  }
}

// ── 7 · paging ────────────────────────────────────────────────────────────────
log("\n── 7 · paging ──────────────────────────────────────────────────");
{
  ok("one column pages at 6", pageSizeFor(360) === 6 && pageSizeFor(719) === 6);
  ok("two or three columns page at 12", pageSizeFor(720) === 12 && pageSizeFor(1280) === 12);
  // Server render has no viewport; it must not silently pick the mobile size.
  ok("an unknown viewport pages at 12", pageSizeFor(null) === 12 && pageSizeFor(undefined) === 12);
}

log(fail === 0 ? `\n✅ discovery contract: all assertions passed` : `\n❌ ${fail} assertion(s) failed`);
process.exit(fail === 0 ? 0 : 1);
