// S7 × S5 merge · source mutation proofs of S7's F1 line on the release's card. `test:maswali-design` must go red on 4.F1e.
export const MUTATIONS = [
  {
    name: "(F1-card) the card no longer draws the announced final week",
    file: "src/components/maswali/maswali-home-card.tsx",
    from: "{!finalWeek && finalAhead !== null && <span id={`${idBase}-final`}",
    to: "{false && finalAhead !== null && <span id={`${idBase}-final`}",
    expect: "4.F1e",
  },
  {
    name: "(F1-describe) the card's description no longer reads the announcement",
    file: "src/components/maswali/maswali-home-card.tsx",
    from: "finalWeek || finalAhead !== null ? `${idBase}-final` : null",
    to: "finalWeek ? `${idBase}-final` : null",
    expect: "4.F1e",
  },
];
