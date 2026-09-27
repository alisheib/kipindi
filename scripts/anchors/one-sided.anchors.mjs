/**
 * THE ANCHORS `red:one-sided` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors`
 * §3 audits that every anchor below still resolves EXACTLY ONCE against real source, without executing
 * a harness that rewrites that source. An inline anchor is one nobody can audit — this harness's own
 * two lens cases had rotted against `hero.ts` for three days before landing v3 WP6 found them.
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion that must break.
 * Moved out of `scripts/one-sided-red.mjs` on 2026-09-27 (landing v3 WP6).
 */

export const MUTATIONS = [
  {
    name: "a lopsided two-sided price is no longer kept within 1–99 (25,000 vs 100 prints 100%)",
    file: "src/lib/markets/price-state.ts",
    from: `    return { kind: "priced", yesPct: Math.min(99, Math.max(1, share)) };`,
    to: `    return { kind: "priced", yesPct: share };`,
    expect: "1.5",
  },
  {
    name: "one side of money is priced again (the ruling-13 defect itself)",
    file: "src/lib/markets/price-state.ts",
    from: `  if (yes > 0 && no > 0) {`,
    to: `  if (yes > 0 || no > 0) {`,
    expect: "1.2",
  },
  {
    name: "the card's YES button prints '@ 100%' on a one-sided market again",
    file: "src/components/markets/market-card.tsx",
    from: `{showPrice && <span className="font-mono text-[11.5px]"> @ {yesPct}%</span>}`,
    to: `{!noPrice && <span className="font-mono text-[11.5px]"> @ {yesPct}%</span>}`,
    expect: "3.3",
  },
  {
    name: "the one-sided rail is drawn as a full pill again",
    file: "src/components/markets/market-card.tsx",
    from: `empty={noPrice || oneSided}`,
    to: `empty={noPrice}`,
    expect: "3.5",
  },
  {
    name: "a call site hands the card a finished price again (the `?? 0` tripwire)",
    file: "src/app/page.tsx",
    from: `                    yesPool={r.yesPool}`,
    to: `                    yesPct={r.yesPct ?? 0}\n                    yesPool={r.yesPool}`,
    expect: "2.3",
  },
  {
    name: "the hero board row prints the rounded share (100 on a one-sided pool)",
    file: "src/components/home/landing-hero.tsx",
    from: `<span className="kp-qrow__num">{price.yesPct}</span>`,
    to: `<span className="kp-qrow__num">{row.yesPct}</span>`,
    expect: "4.2",
  },
  {
    name: "the note goes back to 'No one has picked {side}' (false after a cash-out)",
    file: "src/lib/i18n-dict.ts",
    from: `      oneSidedNote: "No stake on {side} yet. If betting closes one-sided, every stake is refunded in full.",`,
    to: `      oneSidedNote: "No one has picked {side} yet. If betting closes one-sided, every stake is refunded in full.",`,
    expect: "5.5",
  },
  {
    name: "the price slot loses its one-sided arm (the card falls through to 'YES 0%')",
    file: "src/components/markets/market-card.tsx",
    from: `          ) : oneSided ? (`,
    to: `          ) : false ? (`,
    expect: "3.11",
  },
  {
    name: "the 'One side only' row shows on live cards only again (a closed one-sided card loses its word)",
    file: "src/components/markets/market-card.tsx",
    from: `      {(live || oneSided) && (`,
    to: `      {live && (`,
    expect: "3.12",
  },
  {
    name: "the /markets row files a one-sided market by its raw 0/100 share again (Longshots at 0%)",
    file: "src/app/markets/page.tsx",
    from: `    yesPct: shownYesPct(m.yesPool, m.noPool),`,
    to: `    yesPct: pricedYesPct(m.yesPool, m.noPool),`,
    expect: "7.1",
  },
  {
    name: "settlement refunds a one-sided market only when the backed side wins (the note would lie)",
    file: "src/lib/server/market-service.ts",
    from: `    && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));`,
    to: `    && ((m.yesPool > 0 && m.noPool === 0 && opts.outcome === "YES") || (m.yesPool === 0 && m.noPool > 0 && opts.outcome === "NO"));`,
    expect: "6.1",
  },
  // ── landing v3 C1 · commit A — the detail page, its side picker, its resolution panel, the result ink ──
  {
    name: "C1-A · the detail page falls back to the old helper again (100/0 on a one-sided pool, 50/50 on an empty one)",
    file: "src/app/markets/[id]/page.tsx",
    from: `  const yesPct = price.kind === "priced" ? price.yesPct : null;`,
    to: `  const yesPct = shownYesPct(m.yesPool, m.noPool) ?? impliedYesPct(m);`,
    expect: "8.1",
  },
  {
    name: "C1-A · the detail bar draws a full pill for a one-sided pool again (empty only when nothing is staked)",
    file: "src/app/markets/[id]/page.tsx",
    from: `            empty={yesPct === null}`,
    to: `            empty={price.kind === "none"}`,
    expect: "8.2",
  },
  {
    name: "C1-A · a closed, unsettled one-sided market loses its refund note under the rail",
    file: "src/app/markets/[id]/page.tsx",
    from: `{!bettingOpen && oneSidedCallout}`,
    to: `{false && oneSidedCallout}`,
    expect: "8.5",
  },
  {
    name: "C1-A · the side picker prices a one-sided pool again ('YES @ 100%' on the money control)",
    file: "src/components/markets/side-picker.tsx",
    from: `  const yesPct = price.kind === "priced" ? price.yesPct : null;`,
    to: `  const yesPct = yesPool + noPool > 0 ? Math.round((yesPool / (yesPool + noPool)) * 100) : null;`,
    expect: "8.6",
  },
  {
    name: "C1-A · the resolution panel prints a fee on a one-sided refund again (the phantom fee)",
    file: "src/components/markets/resolution-panel.tsx",
    from: `  const refundedAll = isVoid || priceState(yesPool, noPool).kind === "oneSided";`,
    to: `  const refundedAll = isVoid;`,
    expect: "8.8",
  },
  {
    name: "C1 §10 · a NO result is painted in the YES ink again",
    file: "src/components/markets/market-card.tsx",
    from: `  const resultInk = resolvedOutcome === "NO" ? "mcardp-pct--no"`,
    to: `  const resultInk = resolvedOutcome === "NO" ? null`,
    expect: "8.10",
  },
  {
    name: "C1 §14 · a surface outside the declared remainder calls the old price helper again",
    file: "src/components/markets/side-picker.tsx",
    from: `  const price = priceState(yesPool, noPool);`,
    to: `  const price = priceState(yesPool, noPool); void impliedYesPct({ yesPool, noPool });`,
    expect: "14.1",
  },
  // ── landing v3 C1 · commit B — /live, and R6(2) the one tipping rule ─────────────────────────────
  {
    name: "C1-B · the pulse card calls a one-sided pool 'No bets yet' again (money IS on it)",
    file: "src/app/live/pulse-grid.tsx",
    from: `  const noPriceWord = price.kind === "oneSided" ? t.market.oneSideOnly`,
    to: `  const noPriceWord = false ? t.market.oneSideOnly`,
    expect: "9.3",
  },
  {
    name: "C1-B · the pulse card says 'No bets yet' over a pool a cash-out emptied (somebody did bet)",
    file: "src/app/live/pulse-grid.tsx",
    from: `    : market.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;`,
    to: `    : t.market.noBetsYet;`,
    expect: "9.4",
  },
  {
    name: "C1-B · /live features a one-sided market again (the raw share is never null on one side)",
    file: "src/lib/markets/live-contest.ts",
    from: `    const yesPct = shownYesPct(row.yesPool, row.noPool);`,
    to: `    const yesPct = row.yesPool + row.noPool > 0 ? Math.round((row.yesPool / (row.yesPool + row.noPool)) * 100) : null;`,
    expect: "9.6",
  },
  {
    name: "R6(2) · the bar's lean word keeps its own tipping threshold again (< 3, not the one rule)",
    file: "src/components/brand.tsx",
    from: `            {isTipping(target) ? labels.tipping`,
    to: `            {Math.abs(target - 50) < 3 ? labels.tipping`,
    expect: "9.8",
  },
  // ── landing v3 C1 · commit C — /results' notable spotlight ────────────────────────────────────────
  {
    name: "C1-C · the spotlight draws a one-sided pool as a price again (a 100/0 bar under the gilt seal)",
    file: "src/app/results/page.tsx",
    from: `{price.kind === "priced" ? (`,
    to: `{price.kind !== "none" ? (`,
    expect: "10.3",
  },
  {
    name: "C1-C · a one-sided refund wears the crown again (only an empty pool is kept out)",
    file: "src/lib/results/archive.ts",
    from: `    && priceState(m.yesPool, m.noPool).kind === "priced";`,
    to: `    && priceState(m.yesPool, m.noPool).kind !== "none";`,
    expect: "10.8",
  },
  {
    name: "C1-C · the spotlight's empty rail says 'No bets yet' whatever the pool (and not the verdict)",
    file: "src/app/results/page.tsx",
    from: `empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet}`,
    to: `empty emptyLabel={t.market.noBetsYet}`,
    expect: "10.4",
  },
  // ── landing v3 C1 · commit D — chart history ─────────────────────────────────────────────────────
  {
    name: "C1-D · the chart plots every snapshot again (a one-sided 100 and an empty 50 on the line)",
    file: "src/lib/server/market-history.ts",
    from: `return p.kind === "priced" ? [{ s, pct: p.yesPct }] : [];`,
    to: `return [{ s, pct: Math.round((s as { yes?: number }).yes! * 100) }];`,
    expect: "11.1",
  },
  // ── landing v3 C1 · commit F — Up & Down ──────────────────────────────────────────────────────────
  {
    name: "C1-F · the Up & Down card prices a one-sided round again ('Up 100% · 0% Down')",
    file: "src/components/updown/updown-card.tsx",
    from: `  const upPct = price.kind === "priced" ? price.yesPct : null;`,
    to: `  const upPct = pricing.upPool + pricing.downPool > 0 ? Math.round((pricing.upPool / (pricing.upPool + pricing.downPool)) * 100) : null;`,
    expect: "13.1",
  },
  {
    name: "C1-F · the Up & Down card calls every empty rail 'No bets yet' again (a one-sided round has money)",
    file: "src/components/updown/updown-card.tsx",
    from: `emptyLabel={price.kind === "oneSided" ? t.market.oneSideOnly : players === 0 ? t.market.noBetsYet : t.market.noPoolYet}`,
    to: `emptyLabel={t.market.noBetsYet}`,
    expect: "13.3",
  },
];
