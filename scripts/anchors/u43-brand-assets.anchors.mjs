/** U43 brand export mutations read by both the red proof and the fleet anchor audit. */
export const MUTATIONS = [
  {
    name: "source needle becomes unearned gold",
    file: "src/lib/brand-mark.ts",
    from: 'needle: mono ? ink : MARK.whiteInk,',
    to: 'needle: mono ? ink : "#E3BC66",',
    expectedAsset: "public/brand/mark-color.svg",
  },
  {
    name: "favicon export becomes unearned gold",
    file: "public/favicon.svg",
    from: 'stroke="#F7F8FC" stroke-width="5"',
    to: 'stroke="#E3BC66" stroke-width="5"',
    expectedAsset: "public/favicon.svg",
  },
];
