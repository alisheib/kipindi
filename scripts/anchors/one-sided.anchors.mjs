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
    name: "settlement refunds a one-sided market only when the backed side wins (the note would lie)",
    file: "src/lib/server/market-service.ts",
    from: `    && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));`,
    to: `    && ((m.yesPool > 0 && m.noPool === 0 && opts.outcome === "YES") || (m.yesPool === 0 && m.noPool > 0 && opts.outcome === "NO"));`,
    expect: "6.1",
  },
];
