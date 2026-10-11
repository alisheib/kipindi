/**
 * Anchors for `test:predictor-shown` (owner ruling, 2026-10-11 — the count players see and the count admins read) —
 * DATA, read by that suite's own `--prove-red` (`npm run red:predictor-shown`), which plants each one in an IN-MEMORY
 * copy of its file and never writes to disk, and audited by `test:red-anchors` §3 (every `from` resolves exactly once).
 *
 * ⛔ Each plant is a defect the split exists to stop, and each names the ONE check that must go red for it.
 */
export const MUTATIONS = [
  {
    name: "ps-raw-board · the markets board hands its rows the TRUE count",
    file: "src/app/markets/page.tsx",
    from: `    predictors: shownPredictors(m),`,
    to: `    predictors: m.predictorCount,`,
    expect: "2.A · no player surface reads the true count raw",
  },
  {
    name: "ps-raw-updown · the Up & Down board paints the TRUE count",
    file: "src/lib/server/updown-board.ts",
    from: `    players: shownPredictors(m),`,
    to: `    players: m.predictorCount,`,
    expect: "2.A · no player surface reads the true count raw",
  },
  {
    name: "ps-raw-share · the share image prints the TRUE count",
    file: "src/app/api/og/market/[id]/route.tsx",
    from: `  const predictors = shownPredictors(m);`,
    to: `  const predictors = m.predictorCount;`,
    expect: "2.A · no player surface reads the true count raw",
  },
  {
    name: "ps-admin-shown · the admin markets list paints the shown count",
    file: "src/app/admin/markets/page.tsx",
    from: `                          {m.predictorCount} {m.predictorCount === 1 ? "predictor" : "predictors"}`,
    to: `                          {m.predictorCount + (m.predictorExtra ?? 0)} {m.predictorCount === 1 ? "predictor" : "predictors"}`,
    expect: "3.B · no admin page, report or audit row",
  },
  {
    name: "ps-report-shown · the regulator's match-integrity report reads the shown count",
    file: "src/lib/server/reports/catalogue.ts",
    from: `    predictors: m.predictorCount,`,
    to: `    predictors: shownPredictors(m),`,
    expect: "3.B · no admin page, report or audit row",
  },
  {
    name: "ps-client-extra · a browser module names the extra",
    file: "src/components/markets/market-card.tsx",
    from: `  const neverBet = predictors === 0;`,
    to: `  const neverBet = predictors === 0; const predictorExtra = 0; void predictorExtra;`,
    expect: "4 · no browser module names predictorExtra",
  },
  {
    name: "ps-stray-writer · a player reader adds the extra a second time",
    file: "src/lib/server/updown-board.ts",
    from: `    players: shownPredictors(m),`,
    to: `    players: shownPredictors(m) + (m.predictorExtra ?? 0),`,
    expect: "5.1 · predictorExtra is named only by its four homes",
  },
  {
    name: "ps-update-arm · set() writes the extra on an existing row",
    file: "src/lib/server/market-dal.ts",
    from: `        // \`predictorExtra\` is deliberately ABSENT too: increments alone write it (\`addToPool\`, the desk's shift),`,
    to: `        predictorExtra: m.predictorExtra ?? 0,
        // \`predictorExtra\` is deliberately ABSENT too: increments alone write it (\`addToPool\`, the desk's shift),`,
    expect: "5.2 · set()'s UPDATE arm never writes the extra",
  },
  {
    name: "ps-memory-set · the memory set() lets a stale copy overwrite the extra",
    file: "src/lib/server/market-dal.ts",
    from: `      markets.set(m.id, { ...m, predictorExtra: cur.predictorExtra ?? 0 });`,
    to: `      markets.set(m.id, m);`,
    expect: "5.3 · the memory set() keeps the stored extra",
  },
  {
    name: "ps-stampable · the extra becomes stampable",
    file: "src/lib/server/market-dal.ts",
    from: `const STAMPABLE: Record<string, (v: unknown) => unknown> = {`,
    to: `const STAMPABLE: Record<string, (v: unknown) => unknown> = {
  predictorExtra: (v) => v,`,
    expect: "5.4 · the extra is not stampable",
  },
  {
    name: "ps-written-value · the Postgres pool increment WRITES the extra instead of adding it",
    file: "src/lib/server/market-dal.ts",
    from: `    if (deltas.predictorExtra !== undefined) data.predictorExtra = { increment: deltas.predictorExtra };`,
    to: `    if (deltas.predictorExtra !== undefined) data.predictorExtra = deltas.predictorExtra;`,
    expect: "5.5 · both addToPool twins add it by increment",
  },
  {
    name: "ps-direction-swapped · the desk form warns of a fall when the officer RAISES the number",
    file: "src/app/admin/desk/[id]/rules-form.tsx",
    from: `Number(typed) > Number(saved) ? "up" : "down";`,
    to: `Number(typed) > Number(saved) ? "down" : "up";`,
    expect: "6b · the desk form says",
  },
  {
    name: "ps-sentence-lingers · the before-Save sentence stays on screen after the save lands",
    file: "src/app/admin/desk/[id]/rules-form.tsx",
    from: `      setChangeDir({});`,
    to: `      void 0;`,
    expect: "6b · the desk form says",
  },
  {
    name: "ps-bet-unconditional · the bet path names the extra on every stake, a player's included",
    file: "src/lib/server/market-service.ts",
    from: `          const shown = shownExtra > 0 ? { predictorExtra: shownExtra } : {};`,
    to: `          const shown = { predictorExtra: shownExtra };`,
    expect: "6 · the bet path names the extra only through the seam's read",
  },
];
