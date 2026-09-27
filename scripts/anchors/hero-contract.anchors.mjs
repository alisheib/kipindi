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
  {
    name: "the hero drops its price-quality floor (orders the whole book by the lens alone)",
    file: "src/lib/markets/hero.ts",
    from: "  const ordered = [0, 1, 2].flatMap((tier) => lens(open.filter((r) => priceTier(r) === tier)));",
    to: "  const ordered = lens(open);",
    expect: "no degenerate market outranks a contested one, however soon it closes",
  },
  {
    name: "WP6 · the tier is read from the ROUNDED share again (a 25,000-vs-100 market filed as one-sided)",
    file: "src/lib/markets/hero.ts",
    from: "  const ordered = [0, 1, 2].flatMap((tier) => lens(open.filter((r) => priceTier(r) === tier)));",
    to: "  const ordered = [0, 1, 2].flatMap((tier) => lens(open.filter((r) => (r.yesPct == null ? 2 : (r.yesPct === 0 || r.yesPct === 100) ? 1 : 0) === tier)));",
    expect: "both lopsided two-sided markets rank ahead of the one-sided one",
  },
  {
    name: "the card is pinned to the LAST market instead of coming from the ordering",
    file: "src/lib/markets/hero.ts",
    from: "    featured: ordered[0] ?? null,",
    to: "    featured: ordered[ordered.length - 1] ?? null,",
    expect: "the most contested market leads the hero",
  },
  {
    // 🔴 THE DUPLICATION DEFECT, REINTRODUCED. This is precisely what shipped in `1de3b38d`: the
    // board started at [0], so the hero stated its lead market TWICE — row 1 and the featured card,
    // same title and same price, 400px apart. Every gate was green over it and the per-band clips
    // could not show it; it was found by reading a whole-page frame. Now it cannot come back
    // silently.
    name: "the board starts at the featured market again (the hero states its lead twice)",
    file: "src/lib/markets/hero.ts",
    from: "    board: ordered.slice(1, 1 + QUESTION_BOARD_SIZE),",
    to: "    board: ordered.slice(0, QUESTION_BOARD_SIZE),",
    expect: "the featured market is NEVER also a board row",
  },
];
