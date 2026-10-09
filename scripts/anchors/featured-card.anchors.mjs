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
  // Round 3 (2026-10-08): the meta line's break and the empty state's reading floor.
  {
    name: "the meta line's dot goes back into the running text (a line can end on '·' again)",
    file: "src/components/markets/market-card.tsx",
    from: `          {closesOn && <span className="mcardp-src__dot">{" · "}</span>}`,
    to: `          {closesOn ? " · " : null}`,
    expect: "2.14",
  },
  {
    name: "Chinese breaks the meta line's parts anywhere again (结算来 / 源 at 320)",
    file: "src/app/globals.css",
    from: `.mcardp-src:lang(zh) { word-break: keep-all; }`,
    to: `.mcardp-src:lang(zh) { word-break: normal; }`,
    expect: "2.14",
  },
  {
    name: "the no-bets line loses its measured 15px box (the cold-start card grows 4.5px past its skeleton)",
    file: "src/app/globals.css",
    from: `  line-height: 15px;`,
    to: `  line-height: 1.5;`,
    expect: "2.15",
  },
  {
    name: "the invitation drops back to the trader row's 10px count type",
    file: "src/app/globals.css",
    from: `.mcardp-traders .mcardp-befirst { font-size: var(--type-small); }`,
    to: `.mcardp-traders .mcardp-befirst { color: var(--brand-300); }`,
    expect: "2.15",
  },
  // Round 4 (2026-10-09): the top row's two facts, the cold-start pair's centre, the named pool.
  {
    name: "the tail's column gap goes back to the row's 5px (\"UCHUMI masaa 1 yamebaki\" at sw 390)",
    file: "src/app/globals.css",
    from: `.mcardp-tail { display: flex; flex-wrap: wrap; align-items: center; gap: 5px var(--sp-4); flex: 1 1 auto; min-width: 0; }`,
    to: `.mcardp-tail { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; flex: 1 1 auto; min-width: 0; }`,
    expect: "2.16",
  },
  {
    name: "the no-bets line stops being lowered (the pair back at 18 over 28, and the card 4.8px short)",
    file: "src/app/globals.css",
    from: `.mcardp-nobets:has(+ .mcardp-traders .mcardp-befirst) { margin-top: calc(6px + var(--mcard-empty-drop)); }`,
    to: `.mcardp-nobets:has(+ .mcardp-traders .mcardp-befirst) { margin-top: 6px; }`,
    expect: "2.17",
  },
  {
    name: "the drop's constant drifts from the metrics it was derived from (the pair off-centre again)",
    file: "src/app/globals.css",
    from: `  --mcard-empty-drop: calc((var(--mcard-traders-h) / 2 + var(--mcard-act-mt) - 13.4px) / 2);`,
    to: `  --mcard-empty-drop: calc((var(--mcard-traders-h) / 2 + var(--mcard-act-mt) - 8px) / 2);`,
    expect: "2.17",
  },
  {
    name: "the featured pool loses its word and its money face (a bare \"TZS 10,800\" again)",
    file: "src/components/markets/market-card.tsx",
    // Round 5 (R5-A): the grid card's figure names itself to a screen reader (`sr-only`); the anchor follows the line.
    from: `          {fresh ? t.market.noPoolYet : featured ? <>{t.common.pool}{" "}<span className="amount">{formatTzs(volume)}</span></> : <><span className="sr-only">{t.common.pool}{" "}</span>{formatTzs(volume)}</>}`,
    to: `          {fresh ? t.market.noPoolYet : formatTzs(volume)}`,
    expect: "2.18",
  },
  {
    name: "the featured pool drops the row's line box (a selection-closed featured card grows 3px)",
    file: "src/app/globals.css",
    from: `.mcardp--featured .mcardp-meta > .mcardp-pool { font-size: var(--type-small); line-height: 16.5px; }`,
    to: `.mcardp--featured .mcardp-meta > .mcardp-pool { font-size: var(--type-small); }`,
    expect: "2.18",
  },
];
