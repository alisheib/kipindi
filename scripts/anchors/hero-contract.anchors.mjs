/**
 * THE ANCHORS `red:hero-contract` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors`
 * §3 audits that every anchor below still resolves EXACTLY ONCE against real source, without executing
 * a harness that rewrites that source. An inline anchor is one nobody can audit — this harness's own
 * two lens cases had rotted against `hero.ts` for three days before landing v3 WP6 found them.
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion that must break.
 * Moved out of `scripts/hero-contract-red.mjs` on 2026-09-27 (landing v3 WP6).
 */

export const MUTATIONS = [
  {
    name: "an empty pool is priced at 50 again (the licence-condition-1 defect itself)",
    file: "src/lib/markets/discovery.ts",
    from: "  if (pool <= 0) return null;",
    to: "  if (pool <= 0) return 50;",
    expect: "an empty pool has NO price",
  },
  {
    name: "NOTHING is ever priced — must be caught by the POSITIVE CONTROL, not the null checks",
    file: "src/lib/markets/discovery.ts",
    from: "  if (pool <= 0) return null;\n  return Math.round((yesPool / pool) * 100);",
    to: "  if (pool <= 0) return null;\n  return null;",
    expect: "a staked market IS priced (positive control)",
  },
  {
    name: "the aggregate share becomes the MEAN of the per-market percentages",
    file: "src/lib/markets/hero.ts",
    from: "    yesShare: pricedYesPct(sumYes, sumNo),",
    to: "    yesShare: open.length === 0 ? null : Math.round(open.reduce((s, r) => s + (r.yesPct ?? 0), 0) / open.length),",
    expect: "weights by the money on each market",
  },
  {
    name: "the pool total counts shut, closed and settled markets as 'in play'",
    file: "src/lib/markets/hero.ts",
    from: "  const open = rows.filter((r) => matchesStatus(r, \"open\", nowMs));",
    to: "  const open = rows.slice();",
    expect: "counts only markets a player can bet on now",
  },
  // ⚠️ RE-ANCHORED 2026-09-27 (landing v3 WP6). These two cases still named the FIRST lens — a plain
  // `sortRows(open, { sort: "closing" })` that `8b18dc1b` replaced on 2026-09-24 — and an assertion
  // label ("the featured card is the soonest-closing market") that no longer exists, so both reported
  // an anchor or wrong-reason failure and nothing ran this file to notice. They now name the lens that
  // ships, and WP6 adds the case its tier change exists for.
  // ⚠️ RE-ANCHORED 2026-09-28 (landing v3 WP9). The lens, its price-quality floor and the tier
  // partition moved out of `heroFigures` into `boardOrdering` in the same file — one home, because the
  // board's toggle switches between orderings and must never switch between implementations. These
  // three cases name the lines at their new address; nothing about what they plant has changed.
  {
    name: "the hero drops its price-quality floor (orders the whole book by the lens alone)",
    file: "src/lib/markets/hero.ts",
    from: "  return [0, 1, 2].flatMap((tier) => order(open.filter((r) => priceTier(r) === tier)));",
    to: "  return order(open);",
    expect: "no degenerate market outranks a contested one, however soon it closes",
  },
  {
    name: "WP6 · the tier is read from the ROUNDED share again (a 25,000-vs-100 market filed as one-sided)",
    file: "src/lib/markets/hero.ts",
    from: "  return [0, 1, 2].flatMap((tier) => order(open.filter((r) => priceTier(r) === tier)));",
    // The pre-WP6 rule exactly: the tier read from the ROUNDED raw share (a row's own yesPct is the
    // printable price since WP6, so the defect is re-planted from the pools it used to round).
    to: "  return [0, 1, 2].flatMap((tier) => order(open.filter((r) => { const s = pricedYesPct(r.yesPool, r.noPool); return (s == null ? 2 : s === 0 || s === 100 ? 1 : 0) === tier; })));",
    expect: "both lopsided two-sided markets rank ahead of the one-sided one",
  },
  {
    name: "the card is pinned to the LAST market instead of coming from the ordering",
    file: "src/lib/markets/hero.ts",
    from: "  const featured = closing[0] ?? null;",
    to: "  const featured = closing[closing.length - 1] ?? null;",
    expect: "the most contested market leads the hero",
  },
  {
    // ⭐ NEW WITH WP9. The featured card is the CLOSING ordering's lead at every lens (R4(4): the most
    // contested open market is a fact about the book, not about the order a reader chose). Plant it
    // following the toggle instead, and the card changes identity when the board is re-ordered.
    name: "WP9 · the featured card follows the toggle instead of staying the most contested market",
    file: "src/lib/markets/hero.ts",
    // ⚠️ THE FIRST VERSION OF THIS PLANT WAS AIMED AT NOTHING, and `red:hero-contract` said so ("the
    // gate stayed GREEN with the defect in place"). It rewrote `closing` on the line AFTER `featured`
    // had already been read out of it, so the mutation could not reach the value it was about. The
    // defect is one character of intent: take the card from the ORDERING ON SCREEN instead of from the
    // closing lens, and it changes identity the moment a reader re-orders the list under it.
    from: "  const closing = boardOrdering(open, nowMs, \"closing\");",
    to: "  const closing = boardOrdering(open, nowMs, lens);",
    expect: "⛔ WP9 · the featured card is the same market at every lens",
  },
  {
    // 🔴 THE DUPLICATION DEFECT, REINTRODUCED. This is precisely what shipped in `1de3b38d`: the
    // board started at [0], so the hero stated its lead market TWICE — row 1 and the featured card,
    // same title and same price, 400px apart. Every gate was green over it and the per-band clips
    // could not show it; it was found by reading a whole-page frame. Now it cannot come back
    // silently.
    name: "the board starts at the featured market again (the hero states its lead twice)",
    file: "src/lib/markets/hero.ts",
    // ⚠️ RE-ANCHORED 2026-09-28 (WP9). The board subtracts the featured card BY ID now, because with a
    // toggle the card is no longer guaranteed to be row 0 of the list the board slices — so the old
    // `slice(1, …)` would have dropped an innocent row AND shown the card twice. The plant is the same
    // defect: stop subtracting it.
    from: "    board: ordered.filter((r) => r.id !== featured?.id).slice(0, QUESTION_BOARD_SIZE),",
    to: "    board: ordered.slice(0, QUESTION_BOARD_SIZE),",
    expect: "the featured market is NEVER also a board row",
  },
];
