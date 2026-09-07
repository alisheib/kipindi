/**
 * THE ANCHORS `red:query-core` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` §3 audits that every anchor below still
 * resolves EXACTLY ONCE against real source, without executing a harness that rewrites that
 * source. ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * `src/lib/query/` was lifted out of `lib/markets/discovery.ts`, which is the only list surface
 * in this product that ordered, counted and linked correctly — and it took three separate
 * repairs to get there. Every mutation below is one of those repairs, undone. None is invented
 * to make a regex twitch:
 *
 *   · `absent-coerced-to-zero` is the kit prototype's own `Math.abs(m.move || 0)`.
 *   · `counts-over-the-census` is the 2026-08-10 incident — "40 live · TZS 1,659k in play"
 *     printed above a grid of ZERO cards, at nine of nine viewport × locale combinations.
 *   · `ties-left-to-input-order` is the reshuffling grid the kit specified no tie-break for.
 *   · `default-written-into-the-url` is what made a shared link carry state nobody chose.
 *   · `exit-to-an-empty-page` is the see-wider nudge that switched itself off exactly when the
 *     board was emptiest.
 *
 * ⭐ THE LAST TWO ARE THE ONES THAT MATTER MOST, AND THEY MUTATE `discovery.ts`, NOT THE CORE.
 * That file keeps three lines it could have delegated, because `red:discovery-contract` is
 * anchored on them and its harness reads a single file. §7 of the gate proves those kept copies
 * are EQUIVALENT to the core. `equivalence-*` below breaks each copy on purpose: if §7 could not
 * see that, the copies would be free to drift and the whole arrangement would be a comment
 * rather than a control.
 */

const SORT = "src/lib/query/sort.ts";
const HREF = "src/lib/query/href.ts";
const COUNTS = "src/lib/query/counts.ts";
const EMPTY = "src/lib/query/empty.ts";
const PARSE = "src/lib/query/parse.ts";
const DISCOVERY = "src/lib/markets/discovery.ts";

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "absent-coerced-to-zero",
    why: "a row with no value for the sort stops being partitioned out and is ordered as though it were worth zero — last in the natural direction and FIRST the moment the player flips it. On /positions the absent value is the RETURN of an unsettled bet, so 'which of my bets did best?' answers with a page of undecided ones",
    file: SORT,
    suite: "query-core",
    from: "  if (ka == null) return 1;",
    to: '  if (ka == null) return dir === "asc" ? -1 : 1;',
    expect: "LAST ascending",
  },
  {
    name: "ties-left-to-input-order",
    why: "the tie-break and the id fallback are dropped, so two rows with the same primary key order by whatever order they arrived in — a list that reshuffles under the reader on every re-read",
    file: SORT,
    suite: "query-core",
    from: "  return comparePrimary(spec, a, b, sort, dir) || spec.tieBreak[sort](a, b) || byId(a, b);",
    to: "  return comparePrimary(spec, a, b, sort, dir);",
    expect: "explicit tie-break",
  },
  {
    name: "id-is-not-the-final-tie-break",
    why: "the tie-break stays but the id fallback goes, so when the tie-break itself declines to choose the order stops being total — the same reshuffle, one level deeper and harder to see",
    file: SORT,
    suite: "query-core",
    from: "spec.tieBreak[sort](a, b) || byId(a, b);",
    to: "spec.tieBreak[sort](a, b);",
    expect: "final tie-break",
  },
  {
    name: "default-written-into-the-url",
    why: "defaults stop being omitted, so a clean page no longer has a clean URL and every shared link carries state the sharer never chose",
    file: HREF,
    suite: "query-core",
    from: "    if (v == null || v === defaults[k]) continue;",
    to: "    if (v == null) continue;",
    expect: "clean page has a clean URL",
  },
  {
    name: "null-serialised-as-the-word-null",
    why: "the tri-state absent direction is written into the URL as the four-letter string 'null' — a value no allow-list contains, so it round-trips back to the default and LOOKS like it worked",
    file: HREF,
    suite: "query-core",
    from: "    if (v == null || v === defaults[k]) continue;",
    to: "    if (v === defaults[k]) continue;",
    expect: "never written as the string 'null'",
  },
  {
    name: "page-survives-a-filter-change",
    why: "a player on page 4 who presses a new lens lands on page 4 of the new result — a page that frequently does not exist, and never the rows they asked for",
    file: HREF,
    suite: "query-core",
    from: "  const page = changed ? undefined : extra.page;",
    to: "  const page = extra.page;",
    expect: "DROPS the page",
  },
  {
    name: "inert-pill-becomes-a-go-to-page-1-button",
    why: "the test becomes 'was a patch passed' rather than 'did it change anything', so the ALREADY-SELECTED pill silently resets the page — a control that looks inert and is not",
    file: HREF,
    suite: "query-core",
    from: "  const changed = (Object.keys(patch) as (keyof S)[]).some((k) => patch[k] !== state[k]);",
    to: "  const changed = Object.keys(patch).length > 0;",
    expect: "keeps the page",
  },
  {
    name: "counts-over-the-census",
    why: "🔴 THE 2026-08-10 SHAPE. A pill's count is computed over its own axis alone instead of cross-filtered, so the number beside a control is not what pressing it would show. The number is factually true and the page is still a lie",
    file: COUNTS,
    suite: "query-core",
    from: "  return countMatching(rows, { ...state, ...patch } as State, axes);",
    to: "  const only = Object.keys(patch)[0];\n  const next = { ...state, ...patch };\n  return rows.filter((r) => !only || axes[only](r, next)).length;",
    expect: "respects every OTHER active filter",
  },
  {
    name: "filter-becomes-an-OR",
    why: "the axes stop being an AND, so one matching axis admits a row every other filter excludes — every rail on every page widens at once and no count agrees with any grid",
    file: COUNTS,
    suite: "query-core",
    from: "    if (!axes[name](row, state)) return false;",
    to: "    if (axes[name](row, state)) return true;",
    expect: "AND over every axis",
  },
  {
    name: "exit-to-an-empty-page",
    why: "an empty state offers a way out whose real count is zero, so the player presses it and is shown nothing a second time — the failure three separate compensations for the 2026-08-10 board all shared",
    file: EMPTY,
    suite: "query-core",
    from: "    if (count > 0) out.push({ id: c.id, patch: c.patch, count });",
    to: "    out.push({ id: c.id, patch: c.patch, count });",
    expect: "leads somewhere NON-EMPTY",
  },
  {
    name: "the-cap-is-removed",
    why: "every qualifying exit is offered, so an empty state becomes a menu — a reader who has just been shown nothing is asked to plan rather than to press, and at 360 the block scrolls",
    file: EMPTY,
    suite: "query-core",
    from: "    if (out.length === MAX_EXITS) break;",
    to: "    if (out.length === 99) break;",
    expect: "never more than three",
  },
  {
    name: "lens-empty-swallows-a-filter-miss",
    why: "the healthy-empty claim stops checking whether some OTHER axis narrowed the list, so 'nothing of yours has been refunded' is stated confidently to a player who HAS refunds under another filter — and the exits a filter miss would have offered are withheld",
    file: EMPTY,
    suite: "query-core",
    from: "  if (narrowed.length === 0 && healthyEmpty?.includes(String(state[lensKey]))) return \"lens-empty\";",
    to: "  if (healthyEmpty?.includes(String(state[lensKey]))) return \"lens-empty\";",
    expect: "ONLY when the lens is the only thing narrowing",
  },
  {
    name: "no-rows-outranked-by-the-search",
    why: "a player with nothing at all who happens to have a search term is told their SEARCH missed, which invites them to try other words for rows that do not exist — the cause ordering that made an empty platform read as a filter problem",
    file: EMPTY,
    suite: "query-core",
    from: '  if (total === 0) return "no-rows";\n  if (searchKey && state[searchKey]) return "search-miss";',
    to: '  if (searchKey && state[searchKey]) return "search-miss";\n  if (total === 0) return "no-rows";',
    expect: "outranks a search",
  },
  {
    name: "unknown-value-passed-through",
    why: "an untrusted value from the URL stops being narrowed against the closed set and reaches the comparator and the WHERE clause as-is — the property that makes a URL-driven filter injection-safe by construction",
    file: PARSE,
    suite: "query-core",
    from: "  return typeof raw === \"string\" && (allowed as readonly string[]).includes(raw)\n    ? (raw as T)\n    : fallback;",
    to: "  return (raw ?? fallback) as T;",
    expect: "never passed through",
  },
  {
    name: "direction-collapses-to-two-states",
    why: "the tri-state direction defaults to `desc` instead of `null`, so a sort's natural direction is never consulted and 'closing soonest' opens on the rows closing LAST",
    file: PARSE,
    suite: "query-core",
    from: '  return raw === "asc" ? "asc" : raw === "desc" ? "desc" : null;',
    to: '  return raw === "asc" ? "asc" : "desc";',
    expect: "TRI-STATE",
  },
  {
    name: "equivalence-comparator-drifts",
    why: "⭐ THE ARRANGEMENT'S OWN CONTROL. `discovery.ts` keeps `compareRows`'s last line because a red proof is anchored on it; §7 asserts it is the same function as `compareBy(SORT_SPEC, …)`. Breaking the kept copy must be SEEN — otherwise the two are free to drift and §7 is a comment",
    file: DISCOVERY,
    suite: "query-core",
    from: "  return TIE_BREAK[sort](a, b) || byId(a, b);",
    to: "  return byId(a, b);",
    expect: "compareRows ≡ compareBy",
  },
  {
    name: "equivalence-href-drifts",
    why: "the same control for the second kept copy: `buildDiscoveryHref` writes out its per-param lines, and §7 asserts it agrees with `buildQueryHref` across the whole state space. A drift in one param must be caught",
    file: DISCOVERY,
    suite: "query-core",
    from: '  if (s.topic !== DEFAULTS.topic) p.set("topic", s.topic);',
    to: '  p.set("topic", s.topic);',
    expect: "buildDiscoveryHref ≡ buildQueryHref",
  },
];
