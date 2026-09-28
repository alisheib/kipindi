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
];
