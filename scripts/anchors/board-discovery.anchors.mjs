/**
 * THE ANCHORS `red:board-discovery` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` §3 audits that every anchor below still
 * resolves EXACTLY ONCE against real source, without executing a harness that rewrites that
 * source. ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths, nothing that touches the
 * filesystem to describe itself.
 *
 * ── WHY THESE MOVED OUT OF THE HARNESS, 2026-09-06 ───────────────────────────
 * 🔴 They were inline, and on 2026-09-06 that cost exactly what this convention exists to
 * prevent. Fixing a live defect in `matchesStatus`'s `new` arm changed the line the
 * `new-drifts-to-a-clock` case anchors on. The harness printed `anchor missing — cannot inject`
 * and the gate above it went on printing green, so the only signal was a line in the middle of
 * a passing-looking run. `test:red-anchors` could not see it either: §3 audits declaration
 * FILES, and this harness had none. An inline anchor is one nobody can audit — three of them in
 * `updown-push-red.mjs` had silently rotted against rewritten code on the same day the rule was
 * written down.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Each is a defect that actually shipped, or a proposal from the round-2 kit that this codebase
 * deliberately overrode. None is invented to make a regex twitch.
 *
 * ⭐ `default-gains-a-clock` and `open-gains-a-clock` are the SAME HARM SPELLED TWO WAYS, and
 * both are kept on purpose: the 2026-08-10 board emptied itself because the default lens carried
 * a 24-hour window, and a future author could reintroduce that either by moving the default or
 * by teaching `open` a deadline. A guard that only catches one spelling of a bug catches it once.
 *
 * ⚠️ `new-drifts-to-a-clock` is re-anchored on the 2026-09-06 arm, which now also carries
 * `!row.selectionClosed`. Its `to` deliberately drops BOTH properties at once — the clock and
 * the selection-closed test — because the kit's proposal genuinely had neither, and a mutation
 * that reintroduces a real historical defect is worth more than a minimal one.
 *
 * ⚠️ `board-refilters-on-time` restores the one line whose removal is the entire Job-1 fix. It
 * is a source-level mutation caught by §6.5 rather than by a predicate, because the defect lives
 * in the page's data read and not in the pure contract — the place a pure-module guard cannot see.
 *
 * ⛔ THE `progress` LENS IS NOT ATTACKED FROM HERE, AND THAT IS DELIBERATE. Its assertions (the
 * §2b partition) live in `discovery-contract.test.mts`, so its mutations live in
 * `anchors/discovery-contract.anchors.mjs`. A mutation whose defect the named suite cannot see
 * would go red for some unrelated reason, or not at all — and either way the harness would be
 * certifying a gate it never exercised. A red case belongs with the assertion that catches it.
 *
 * ── `expect` ─────────────────────────────────────────────────────────────────
 * ⭐ EVERY CASE NAMES THE ASSERTION IT MUST BREAK, and the harness matches on `FAIL <expect>`
 * rather than on a non-zero exit. Added 2026-09-06. Exit-code-only matching cannot tell a defect
 * caught for the right reason from a syntax error, an unrelated regression, or a suite that
 * crashed before reaching the leg in question — all three print "went red".
 */

const CONTRACT = "src/lib/markets/discovery.ts";
const PAGE = "src/app/markets/page.tsx";

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "default-gains-a-clock",
    expect: "the default is NOT the bounded \"closing today\" window",
    why: "the landing board goes back to a 24-hour window — THE 2026-08-10 BUG, which emptied the board and whose three compensations all sat downstream of the thing that emptied it",
    file: CONTRACT,
    suite: "board-discovery",
    from: '  status: "open" as StatusId,',
    to: '  status: "today" as StatusId,',
  },
  {
    name: "open-gains-a-clock",
    expect: "the default board keeps a long-dated book",
    why: "the same harm, different spelling: `open` itself learns a deadline, so a market bettable for three days stops being offered",
    file: CONTRACT,
    suite: "board-discovery",
    from: '      return row.status === "LIVE" && !row.selectionClosed;',
    to: '      return row.status === "LIVE" && !row.selectionClosed && row.bettableUntilMs - nowMs <= DAY_MS;',
  },
  {
    name: "counts-over-the-census",
    expect: "a count respects the OTHER active filters",
    why: "a control's count stops respecting the other active filters, so the number beside a chip is not what pressing it yields",
    file: CONTRACT,
    suite: "board-discovery",
    from: "  const next = { ...state, ...patch };",
    to: "  const next = { ...state, ...patch, pool: 'any', odds: 'any', topic: 'all' };",
  },
  {
    name: "new-drifts-to-a-clock",
    expect: "already staked is NOT New",
    why: "`New` goes back to the kit's \"added in the last four days\" AND loses the selection-closed test, so the board advertises a market that has stopped taking bets as somewhere to place the first one — while the card refuses to badge it, and the two disagree",
    file: CONTRACT,
    suite: "board-discovery",
    from: '      return row.status === "LIVE" && !row.selectionClosed && row.pool === 0 && row.predictors === 0;',
    to: '      return row.status === "LIVE" && nowMs - row.createdAtMs <= 4 * DAY_MS;',
  },
  {
    name: "board-refilters-on-time",
    expect: "getBoard does not re-filter LIVE rows on isClosedByTime",
    why: "the board restores the `isClosedByTime` filter, so every market whose result is overdue vanishes from /markets — and /results reads RESOLVED ∪ VOIDED only, so it appears on no player surface at all. This is the defect the whole job exists to fix",
    file: PAGE,
    suite: "board-discovery",
    from: "  return [...live, ...closed];",
    to: "  return [...live.filter((m) => !isClosedByTime(m)), ...closed];",
  },
  {
    name: "skeleton-drops-a-status-pill",
    expect: "the skeleton draws exactly one status pill per status",
    why: "the loading skeleton goes back to reserving five status pills against six statuses, so the first paint draws the bar one pill short and then widens it under the reader's eye — the B-29 shape `markets/loading.tsx` was rewritten to document, and four pixels of missing shimmer is not something a human review catches",
    file: "src/app/markets/loading.tsx",
    suite: "board-discovery",
    from: "export const STATUS_PILL_W = [64, 104, 60, 92, 84, 52];",
    to: "export const STATUS_PILL_W = [64, 104, 60, 84, 52];",
  },
  {
    name: "recent-slices-ascending",
    // ⚠️ Not "re-sorts before slicing" — that leg only checks the `resolvedAll` BINDING exists,
    // which survives this mutation. The leg that actually reads the comparator is the one below it.
    expect: "sorts resolutionAt DESCENDING",
    why: '"recently resolved" goes back to slicing the ascending board order, which pins the three OLDEST results on the platform there forever',
    file: PAGE,
    suite: "board-discovery",
    from: "    .sort((a, b) => b.resolutionAt.localeCompare(a.resolutionAt));",
    to: "    .slice();",
  },
  {
    name: "page-reintroduces-a-status-literal",
    expect: "the page does not fall back to a bare status literal",
    why: "the page falls back to its own bare status literal instead of the shared contract — the four-independent-href-builders defect, where changing three of four produced links that disagreed with the page they pointed at",
    file: PAGE,
    suite: "board-discovery",
    from: "  const state = parseDiscoveryParams(sp, MARKET_CATEGORIES);",
    to: '  const state = { ...parseDiscoveryParams(sp, MARKET_CATEGORIES), status: (sp.status as never) ?? "open" };',
  },
];
