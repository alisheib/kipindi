/**
 * THE ANCHORS `red:share-preview` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors`
 * §3 audits that every anchor below still resolves EXACTLY ONCE against real source, without executing
 * a harness that rewrites that source. ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths.
 * `expect` names the assertion that must break. Landing v3 WP14b, 2026-09-27.
 */
export const MUTATIONS = [
  {
    name: "the market page writes a bare openGraph again (no og:type, og:site_name, og:locale in any share)",
    file: "src/app/markets/[id]/page.tsx",
    from: `      ...ROOT_OPEN_GRAPH,`,
    to: ``,
    expect: "1.1",
  },
  {
    name: "the og image reads impliedYesPct again (YES 100% on a one-sided market, an invented 50 on an empty one)",
    file: "src/app/api/og/market/[id]/route.tsx",
    from: `import { getMarket } from "@/lib/server/market-service";`,
    to: `import { getMarket, impliedYesPct } from "@/lib/server/market-service";`,
    expect: "3.2",
  },
  {
    name: "a lopsided two-sided price is no longer kept within 1–99 (the preview prints 100/0)",
    file: "src/lib/markets/price-state.ts",
    from: `    return { kind: "priced", yesPct: Math.min(99, Math.max(1, share)) };`,
    to: `    return { kind: "priced", yesPct: share };`,
    expect: "2.4",
  },
  {
    name: "a one-sided pool is previewed as a price again",
    file: "src/lib/markets/share-preview.ts",
    from: `  if (p.kind === "oneSided") return { kind: "oneSided", label: dict.en.market.oneSideOnly };`,
    to: `  if (p.kind === "oneSided") return { kind: "priced", yesPct: 100, noPct: 0, lean: "leans yes" };`,
    expect: "2.3",
  },
  {
    name: "POSITIVE CONTROL — the market page loses its openGraph altogether (only the census can see it)",
    file: "src/app/markets/[id]/page.tsx",
    from: `    openGraph: {\n      ...ROOT_OPEN_GRAPH,`,
    to: `    ogRemoved: {\n      ...ROOT_OPEN_GRAPH,`,
    expect: "1.2",
  },
  // ── landing v3 C1 · commit E — the settled preview ────────────────────────────────────────────
  {
    name: "C1-E · the og image forgets the settled rule (a settled market's card leans like an open one)",
    file: "src/app/api/og/market/[id]/route.tsx",
    from: `  const settled = sharePreviewSettled(m.status, m.resolvedOutcome, m.productLine);`,
    to: `  const settled = null;`,
    expect: "4.8",
  },
  {
    name: "C1-E · a RESOLVED market with no recorded verdict is previewed as a YES win",
    file: "src/lib/markets/share-preview.ts",
    from: `  if (!outcome) return { ...base, tone: null, word: dict.en.market.statusResolved };`,
    to: `  if (!outcome) return { ...base, tone: "YES", word: dict.en.common.yes };`,
    expect: "4.4",
  },
  // ── the Vodacom plan's S12 WP13 (2026-10-14) — no multiple and no estimate on a share card or in share text ──────────
  {
    name: "S12-WP13 · the win card prints a multiple beside its settled figures",
    file: "src/app/api/og/market/[id]/route.tsx",
    from: `              <span style={{ marginLeft: 10, opacity: 0.75 }}>· staked {tzs(win.stake)} · net +{tzs(win.net)}</span>`,
    to: `              <span style={{ marginLeft: 10, opacity: 0.75 }}>· staked {tzs(win.stake)} · net +{tzs(win.net)} · ≈{(win.payout / win.stake).toFixed(1)}×</span>`,
    expect: "5.1",
  },
  {
    name: "S12-WP13 · the share picture reaches for the estimate (the projected return the bet sheet prints)",
    file: "src/app/api/og/market/[id]/route.tsx",
    from: `import { shownPredictors } from "@/lib/markets/predictors";`,
    to: `import { shownPredictors } from "@/lib/markets/predictors";\nimport { estimateFor } from "@/lib/markets/estimate";\nvoid estimateFor;`,
    expect: "5.1",
  },
  {
    name: "S12-WP13 · the share preview's words quote a multiple on a priced market",
    file: "src/lib/markets/share-preview.ts",
    from: "  if (p.kind === \"priced\") return `YES ${p.yesPct}% · NO ${p.noPct}%. Predict on 50pick.`;",
    to: "  if (p.kind === \"priced\") return `YES ${p.yesPct}% · NO ${p.noPct}% · YES pays ≈${(100 / p.yesPct).toFixed(1)}×. Predict on 50pick.`;",
    expect: "5.1",
  },
  {
    name: "S12-WP13 · a share text names the odds",
    file: "src/lib/i18n-dict.ts",
    from: `      pickedText: "I picked {side} on “{title}” — 50pick",`,
    to: `      pickedText: "I picked {side} on “{title}” at odds of 1.9 — 50pick",`,
    expect: "5.2",
  },
];
