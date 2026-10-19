/**
 * THE ANCHORS `red:card-choices` MUTATES — declared, as DATA, importable without running (the `one-sided.anchors.mjs`
 * convention): `test:red-anchors` §3 audits that every anchor below still resolves EXACTLY ONCE against real source.
 *
 * Each plants back one figure Ali's ruling of 2026-10-19 took off a card's choices ("for market cards we can remove odds
 * please, keep yes and no only … in this and the Vodacom plan"), on the surface that carried it, and names the check of
 * `test:card-choices` that must go red for it. ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths.
 */

export const MUTATIONS = [
  {
    name: "the market card's NO button prints '@ n%' again",
    file: "src/components/markets/market-card.tsx",
    from: `            {sideWord(t, "NO", productLine)}\n          </button>`,
    to: `            {sideWord(t, "NO", productLine)}{showPrice && <span className="font-mono text-[11.5px]"> @ {100 - yesPct}%</span>}\n          </button>`,
    expect: "1.1",
  },
  {
    name: "the market card's YES button is named with its percentage again",
    file: "src/components/markets/market-card.tsx",
    from: `<button type="button" aria-label={t.market.backSideAriaNoPrice.replace("{side}", sideWord(t, "YES", productLine))} onClick={go("YES")}`,
    to: `<button type="button" aria-label={(showPrice ? t.market.backSideAria.replace("{pct}", String(yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", sideWord(t, "YES", productLine))} onClick={go("YES")}`,
    expect: "1.2",
  },
  {
    name: "the home row's NO link prints '@ n%' again",
    file: "src/components/home/landing-hero.tsx",
    from: `          {noWord}\n        </Link>`,
    to: `          {noWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{100 - price.yesPct}%</span>}\n        </Link>`,
    expect: "2.1",
  },
  {
    name: "the home row's YES link is named with its percentage again",
    file: "src/components/home/landing-hero.tsx",
    from: `  const yesAria = t.market.backSideAriaNoPrice.replace("{side}", yesWord);`,
    to: `  const yesAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", yesWord);`,
    expect: "2.2",
  },
  {
    name: "/live's NO label reads 'NO @ n%' (an Up & Down tile 'Down @ n%') again",
    file: "src/app/live/pulse-grid.tsx",
    from: `<span className="font-bold text-no-300">{sideWord(t, "NO", productLine)}</span>`,
    to: `<span className="font-bold text-no-300">{sideWord(t, "NO", productLine)} <span className="opacity-75">@ {100 - price.yesPct}%</span></span>`,
    expect: "3.1",
  },
  {
    name: "the journey's pick faces regain the win line with its figure",
    file: "src/lib/journey/card-face.ts",
    from: `export type PickFace =\n  | { kind: "beFirst" }`,
    to: `export type PickFace =\n  | { kind: "win"; mult: string }\n  | { kind: "beFirst" }`,
    expect: "4.1",
  },
  {
    name: "a journey pick prints a figure beside its words again",
    file: "src/components/journey/cards/journey-card.tsx",
    from: `    case "beFirst":\n      return t.journey.cardBeFirst;`,
    to: `    case "beFirst":\n      return \`≈2.8× \${t.journey.cardBeFirst}\`;`,
    expect: "4.2",
  },
  {
    name: "the English dictionary keeps the journey card's win line",
    file: "src/lib/i18n-dict.ts",
    from: `      cardBeFirst: "Be the first",`,
    to: `      cardWin: "Win ≈{mult}× your bet",\n      cardBeFirst: "Be the first",`,
    expect: "5.1",
  },
];
