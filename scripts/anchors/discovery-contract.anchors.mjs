/**
 * THE ANCHORS `red:discovery-contract` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` §3 audits that every anchor below still
 * resolves EXACTLY ONCE against real source, without executing a harness that rewrites that
 * source. ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths.
 *
 * ── WHY THESE MOVED OUT OF THE HARNESS, 2026-09-06 ───────────────────────────
 * Its sibling `board-discovery-red.mjs` kept its cases inline and, on 2026-09-06, one of them
 * silently stopped resolving when the line it anchored on was repaired. The harness printed
 * `anchor missing` in the middle of an otherwise healthy run and the gate above it stayed green;
 * `test:red-anchors` could not see it because §3 audits declaration FILES. Both harnesses now
 * declare, so both are auditable without being executed.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Every one is a real behaviour of the round-2 design kit that this codebase deliberately
 * overrode, or a defect that actually shipped. None is invented to make a regex twitch.
 *
 * ⭐ THE THREE `progress` MUTATIONS EXIST BECAUSE THAT LENS IS A REFUSAL, AND A REFUSAL IS THE
 * EASIEST PROPERTY IN SOFTWARE TO ASSERT VACUOUSLY. Ali's requirement has two halves — "as long
 * as selection closed but result not out he should see it" AND "when results are out he won't
 * see it anymore" — and only the first half is visible on a board. A suite that checks the tab
 * contains a selection-closed market passes just as happily over a tab that contains
 * EVERYTHING. So:
 *
 *   · `progress-admits-a-decided-market` drops `!row.verdictRecorded`, which is the second half
 *     of Ali's sentence. It must break the §2b.9 PARTITION, not merely §2b.3 — a partition is
 *     arithmetic over the whole universe and cannot be satisfied by a fixture that happens to
 *     have nothing to refuse.
 *   · `progress-swallows-the-open-book` drops the selection test, so the tab becomes "all" under
 *     a different name — the failure where a new control looks like it works because it shows
 *     plenty of cards.
 *   · `progress-reaches-into-the-archive` widens it past the unsettled book into RESOLVED, the
 *     same over-reach `all` is already guarded against, one lens along.
 *
 * ⚠️ `closing-sort-ignores-the-result-clock` is the sort half of the same job and is kept
 * separate on purpose: a lens can hold exactly the right rows and still present them in an
 * order that leads with the least actionable, which is what the board did before 2026-09-06.
 */

const SRC = "src/lib/markets/discovery.ts";

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "move-absent-coerced-to-zero",
    why: "absent `move24h` is coerced to 0 (the kit prototype's own `Math.abs(m.move||0)`), which lands unmeasured markets last in the natural direction and FIRST the moment the reader flips it",
    file: SRC,
    suite: "discovery-contract",
    from: "return row.move24h == null ? null : Math.abs(row.move24h);",
    to: "return Math.abs(row.move24h ?? 0);",
    expect: "Biggest move",
  },
  {
    name: "cold-start-admitted-to-odds-buckets",
    why: "a market nobody has staked is filed under an odds bucket on the strength of `impliedYesPct`'s hardcoded 50 — a fabricated number reaching a FILTER, which licence condition 1 forbids as much as it forbids displaying one",
    file: SRC,
    suite: "discovery-contract",
    from: "  const pct = row.yesPct;\n  if (pct == null) return false;",
    to: "  const pct = row.yesPct ?? 50;",
    expect: "no pool is in NO odds bucket",
  },
  {
    name: "open-counts-a-selection-closed-market",
    why: "the branch that makes Open lie: a market that has stopped taking bets is offered under the lens whose entire meaning is 'a player can act on it right now'",
    file: SRC,
    suite: "discovery-contract",
    from: '      return row.status === "LIVE" && !row.selectionClosed;',
    to: '      return row.status === "LIVE";',
    expect: "open EXCLUDES a selection-closed market",
  },
  {
    name: "all-reaches-into-the-settled-archive",
    why: "`all` stops meaning the unsettled book and re-draws /results inside the board, so a settled market reappears among things still to be decided",
    file: SRC,
    suite: "discovery-contract",
    from: '      return row.status === "LIVE" || row.status === "CLOSED";',
    to: '      return row.status !== "DRAFT";',
    expect: "all EXCLUDES RESOLVED",
  },
  {
    name: "counts-over-the-census",
    why: "counts computed over the census instead of cross-filtered — the 2026-08-10 shape, where the header said '40 live' over a grid holding zero cards and the number was factually true",
    file: SRC,
    suite: "discovery-contract",
    from: "  const next = { ...state, ...patch };",
    to: "  const next = { ...state, ...patch, pool: 'any', odds: 'any', topic: 'all' };",
    expect: "respects the ACTIVE pool filter",
  },
  {
    name: "default-written-into-the-url",
    why: "a default is written into the URL, so a clean board no longer has a clean URL and every share link carries state the sharer never chose",
    file: SRC,
    suite: "discovery-contract",
    from: '  if (s.status !== DEFAULTS.status) p.set("status", s.status);',
    to: '  p.set("status", s.status);',
    expect: "clean board has a clean URL",
  },
  {
    name: "ties-left-to-sort-stability",
    why: "ties left to JS sort stability, so the grid reshuffles under the reader on every refresh",
    file: SRC,
    suite: "discovery-contract",
    from: "  return TIE_BREAK[sort](a, b) || byId(a, b);\n}",
    to: "  return 0;\n}",
    expect: "ties are broken deterministically",
  },
  {
    name: "progress-admits-a-decided-market",
    why: "the In-progress lens stops excluding a recorded verdict, so a market whose result is already out goes on being advertised as waiting for one — the exact condition Ali named as the tab's stopping point ('when results are out he won't see it anymore')",
    file: SRC,
    suite: "discovery-contract",
    from: '      return (row.status === "LIVE" || row.status === "CLOSED") && row.selectionClosed && !row.verdictRecorded;',
    to: '      return (row.status === "LIVE" || row.status === "CLOSED") && row.selectionClosed;',
    // ⭐ The PARTITION, not §2b.3. A membership leg can pass over a fixture with nothing to
    // refuse; arithmetic over the whole universe cannot.
    expect: "EXACTLY partitions all",
  },
  {
    name: "progress-swallows-the-open-book",
    why: "the lens drops its selection test and becomes `all` under another name, so a player pressing 'In progress' is shown markets they can still bet on — the failure that looks like success because the tab is full of cards",
    file: SRC,
    suite: "discovery-contract",
    from: '      return (row.status === "LIVE" || row.status === "CLOSED") && row.selectionClosed && !row.verdictRecorded;',
    to: '      return row.status === "LIVE" || row.status === "CLOSED";',
    expect: "open and progress are DISJOINT",
  },
  {
    name: "progress-reaches-into-the-archive",
    why: "the lens widens past the unsettled book into RESOLVED — the same over-reach `all` is already guarded against, one lens along, and it would put settled markets in front of players as though they were still pending",
    file: SRC,
    suite: "discovery-contract",
    from: '      return (row.status === "LIVE" || row.status === "CLOSED") && row.selectionClosed && !row.verdictRecorded;',
    to: '      return row.status !== "DRAFT" && row.selectionClosed && !row.verdictRecorded;',
    expect: "progress excludes RESOLVED",
  },
  {
    name: "progress-empty-swallows-a-filter-miss",
    why: "the In-progress empty state stops checking whether some OTHER axis narrowed the board, so `?status=progress&topic=sports` tells the reader nothing is waiting for a result while markets ARE waiting under other topics — a confident false statement that also withholds the exits a filter miss would have offered",
    file: SRC,
    suite: "discovery-contract",
    from: '  if (state.status === "progress" && state.topic === DEFAULTS.topic && state.odds === DEFAULTS.odds && state.pool === DEFAULTS.pool) {\n    return "progress-empty";\n  }',
    to: '  if (state.status === "progress") return "progress-empty";',
    expect: "narrowed by TOPIC to nothing is a filter miss",
  },
  {
    name: "closing-sort-ignores-the-result-clock",
    why: "a selection-closed row goes back to keying on a betting deadline already in the past, so ascending 'Closing soonest' leads the board with the markets nobody can bet on — the loudest position given to the least actionable rows",
    file: SRC,
    suite: "discovery-contract",
    from: "      return row.selectionClosed ? row.resolvesAtMs : row.bettableUntilMs;",
    to: "      return row.bettableUntilMs;",
    expect: "sorts on its RESULT time",
  },
];
