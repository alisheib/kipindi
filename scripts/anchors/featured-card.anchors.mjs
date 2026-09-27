/**
 * THE ANCHORS `red:featured-card` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `one-sided.anchors.mjs` convention): `test:red-anchors` §3 audits
 * that every anchor below still resolves EXACTLY ONCE against real source, without executing a harness
 * that rewrites that source. Single-line anchors only (the working tree is CRLF).
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion that must break.
 * Written 2026-09-27 (landing v3 WP3 + WP4).
 */

export const MUTATIONS = [
  {
    name: "SOON goes back to testing a label (it never fired in sw or zh)",
    file: "src/components/markets/market-card.tsx",
    from: `  if (closesWithinTheHour(msLeft)) return { kind: "soon", label: labels.soon };`,
    to: `  if (/^\\d+m left$/.test(String(msLeft))) return { kind: "soon", label: labels.soon };`,
    expect: "2.1",
  },
  {
    name: "the 24h mark drops its priced guard (a mark on a one-sided card)",
    file: "src/lib/markets/price-state.ts",
    from: `  if (p.kind !== "priced" || move24h === undefined || !Number.isFinite(move24h)) return null;`,
    to: `  if (move24h === undefined || !Number.isFinite(move24h)) return null;`,
    expect: "1.7",
  },
  {
    name: "the 24h move is measured from a baseline that had no price again (the −50 pt frame)",
    file: "src/lib/server/market-history.ts",
    from: `  if (base.kind !== "priced") return { spark };`,
    to: `  if (base.kind === "none") return { spark };`,
    expect: "1.29",
  },
  {
    name: "one reading inside the window is measured against itself again (a false ±0)",
    file: "src/lib/server/market-history.ts",
    from: `  if (!dayAgo || dayAgo === points[points.length - 1]) return { spark };`,
    to: `  if (!dayAgo) return { spark };`,
    expect: "1.28",
  },
  {
    name: "the source name grows a second host rule (a look-alike domain borrows a name)",
    file: "src/lib/server/source-registry.ts",
    from: `  const named = (s: TrustedSource, cat: MarketCategory) => sourceMatchesAny([{ ...s, enabled: true }], url, cat);`,
    to: `  const named = (s: TrustedSource, cat: MarketCategory) => url.includes(s.domain) && !!cat;`,
    expect: "1.17",
  },
  {
    name: "a /markets call site starts naming its source (the board card's geometry would move)",
    file: "src/app/markets/page.tsx",
    from: `              msLeft={r.selectionClosed ? undefined : Date.parse(m.selectionClosedAt ?? m.resolutionAt) - nowMs}`,
    to: `              msLeft={r.selectionClosed ? undefined : Date.parse(m.selectionClosedAt ?? m.resolutionAt) - nowMs}\n              sourceName={m.sourceUrl}`,
    expect: "3.1",
  },
  {
    name: "the predictor floor is applied to every card (K48 lost on the grid and the boards)",
    file: "src/components/markets/market-card.tsx",
    from: `  const showDepth = !featured || featuredShowsPredictors(predictors, fresh);`,
    to: `  const showDepth = featuredShowsPredictors(predictors, fresh);`,
    expect: "2.10",
  },
  {
    name: "V18's source-order waiver is widened past the featured card",
    file: "scripts/qa/landing-ten.mjs",
    from: `      const srcUnder = kind === "featured" && vw < 640;       // exception (2): hero v3's first screen`,
    to: `      const srcUnder = vw < 640;`,
    expect: "7.2",
  },
  {
    name: "POSITIVE CONTROL · the bar stops drawing the mark the delta names",
    file: "src/components/markets/market-card.tsx",
    from: ` as={featured ? "img" : undefined} mark={dayAgo} />`,
    to: ` as={featured ? "img" : undefined} />`,
    expect: "2.4",
  },
];
