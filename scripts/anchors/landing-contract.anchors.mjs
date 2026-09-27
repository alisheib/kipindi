/**
 * THE ANCHORS `red:landing-contract` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors`
 * §3 audits that every anchor below still resolves EXACTLY ONCE against real source, without executing
 * a harness that rewrites that source. An inline anchor is one nobody can audit — this harness's own
 * two lens cases had rotted against `hero.ts` for three days before landing v3 WP6 found them.
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion that must break.
 * Moved out of `scripts/landing-contract-red.mjs` on 2026-09-27 (landing v3 WP6).
 */

export const MUTATIONS = [
  {
    name: "the grid does not exclude the hero's ids (the exact batch-2 repetition)",
    file: "src/lib/markets/landing.ts",
    from: `  const open = rows.filter((r) => matchesStatus(r, "open", nowMs) && !excluded.has(r.id));`,
    to: `  const open = rows.filter((r) => matchesStatus(r, "open", nowMs));`,
    expect: "2.1",
  },
  {
    name: "the cold-book lens picks the money lens on an empty book (states a number nobody produced)",
    file: "src/lib/markets/landing.ts",
    from: `  return openPoolTzs > 0 ? "pool" : "new";`,
    to: `  return "pool";`,
    expect: "1.1",
  },
  {
    name: "a topic's lean is a mean of per-row percentages instead of the summed-pool ratio",
    file: "src/lib/markets/landing.ts",
    from: `        leanYesPct: pricedYesPct(a.yes, a.no),`,
    to: `        leanYesPct: 50,`,
    expect: "3.3",
  },
  {
    name: "a CLOSED market is not excluded from the topic fold",
    file: "src/lib/markets/landing.ts",
    from: `    if (!matchesStatus(r, "open", nowMs)) continue;`,
    to: `    // disabled`,
    expect: "3.1",
  },
  {
    name: "the reconciliation check always reports ok (a vacuous assertion)",
    file: "src/lib/markets/landing.ts",
    from: `  return { ok: countDelta === 0 && poolDelta === 0, countDelta, poolDelta };`,
    to: `  return { ok: true, countDelta, poolDelta };`,
    expect: "3.8-control",
  },
  {
    name: "the grid stops filtering by status (a RESOLVED market is offered live YES/NO buttons)",
    file: "src/lib/markets/landing.ts",
    from: `  const open = rows.filter((r) => matchesStatus(r, "open", nowMs) && !excluded.has(r.id));`,
    to: `  const open = rows.filter((r) => !excluded.has(r.id));`,
    expect: "2.5",
  },
  {
    name: "WP6 · the grid seats by the lens alone (a one-sided TZS 90,000 card takes a priced market's seat)",
    file: "src/lib/markets/landing.ts",
    from: `    [0, 1, 2].flatMap((tier) => byLens.filter((r) => priceTier(r) === tier)).slice(0, size).map((r) => r.id),`,
    to: `    byLens.slice(0, size).map((r) => r.id),`,
    expect: "4.1",
  },
  {
    name: "WP6 · the seated cards are shown in tier order, so the heading's 'Biggest pools first' is false",
    file: "src/lib/markets/landing.ts",
    from: `  return byLens.filter((r) => seated.has(r.id));`,
    to: `  return [0, 1, 2].flatMap((tier) => byLens.filter((r) => seated.has(r.id) && priceTier(r) === tier));`,
    expect: "4.4",
  },
];
