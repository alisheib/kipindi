/** U43 brand export mutations read by both the red proof and the fleet anchor audit. */
export const MUTATIONS = [
  {
    name: "source needle loses the delivered gilt",
    file: "src/lib/brand-mark.ts",
    from: 'needle: mono ? ink : MARK.gold,',
    to: 'needle: mono ? ink : MARK.whiteInk,',
    expectedAsset: "public/brand/mark-color.svg",
  },
  {
    name: "favicon export loses the delivered gilt",
    file: "public/favicon.svg",
    from: 'stroke="#E3BC66" stroke-width="5"',
    to: 'stroke="#F7F8FC" stroke-width="5"',
    expectedAsset: "public/favicon.svg",
  },
];
