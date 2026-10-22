/** Red plants for the U43 match-card wording and placement guard. */
const TEST = "scripts/updown-match.test.mts";
const signedIn = '...floorDefects(signedIn(l), dict[l].market.udNobodyBackedEither).map((x) => `${l} signed in: ${x}`),';

export const MUTATIONS = [
  {
    name: "round detail price loses reached-target ink",
    file: TEST,
    from: 'const heroSrc = readFileSync(new URL("../src/components/updown/price-hero.tsx", import.meta.url), "utf8");',
    to: 'const heroSrc = readFileSync(new URL("../src/components/updown/price-hero.tsx", import.meta.url), "utf8").replace(\'tone === "up" ? "var(--yes-300)"\', \'tone === "up" ? "var(--text)"\');',
    expect: "11b.6 the round detail's observed price",
  },
  {
    name: "terminal opening reference loses gilt ink",
    file: TEST,
    from: 'const termSrc = src("src/components/charts/terminal-chart.tsx");',
    to: 'const termSrc = src("src/components/charts/terminal-chart.tsx").replace(\'color: ink("--gilt"),\', \'color: ink("--text-subtle"),\');',
    expect: "11b.8 the terminal's dashed line",
  },
  {
    name: "brief shrunk in rendered signed-in card",
    file: TEST,
    from: signedIn,
    to: '...floorDefects(signedIn(l).replace("ud-refund-brief m-0 text-body-sm", "ud-refund-brief m-0 text-[10px]"), dict[l].market.udNobodyBackedEither).map((x) => `${l} signed in: ${x}`),',
    expect: "11b.12 the source line and both action sentences",
  },
  {
    name: "helper shrunk in rendered signed-in card",
    file: TEST,
    from: signedIn,
    to: '...floorDefects(signedIn(l).replace(" text-body-sm leading-[1.45] text-text-faint", " text-[10px] leading-[1.45] text-text-faint"), dict[l].market.udNobodyBackedEither).map((x) => `${l} signed in: ${x}`),',
    expect: "11b.12 the source line and both action sentences",
  },
  {
    name: "refund placement premise reversed",
    file: TEST,
    from: "const beforeChoices = html.slice(splitAt, actAt);",
    to: "const beforeChoices = html.slice(actAt, footAt);",
    expect: "11b.12 the source line and both action sentences",
  },
  {
    name: "kick-off invents a price rise",
    file: TEST,
    from: "const w = matchWords(dict[loc] as Dict, loc, ROUNDS[name]);",
    to: 'const w = matchWords(name === "S4" ? ({ ...dict[loc], home: { ...dict[loc].home, udMatchNoNewPrice: "Price rose since {time}" } } as Dict) : dict[loc] as Dict, loc, ROUNDS[name]);',
    expect: "12.S4.en Kick-off",
  },
];
