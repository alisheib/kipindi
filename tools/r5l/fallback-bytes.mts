/* R5-L · what the two in-page Suspense fallbacks cost a refresh: the old server-drawn trees (GridSkeleton, ResultsSkeleton,
 * evaluated from HEAD's source) serialized as Flight writes host elements, against the new client reference with props. */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5l/package.json");
const HERE = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/";
const head = `/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "F:/kipindi-main/node_modules/react/index.js";
import { MARKET_CARD_H, MARKET_CARD_H_CLOSED } from "F:/kipindi-r5l/src/components/markets/card-geometry.ts";
import { PLAYER_PER_PAGE } from "F:/kipindi-r5l/src/components/ui/pagination.tsx";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS } from "F:/kipindi-r5l/src/components/ui/query-bar.tsx";
`;
writeFileSync(HERE + "old/skeletons.tsx", head + readFileSync(HERE + "old/grid.txt", "utf8").replace("function GridSkeleton", "export function GridSkeleton")
  + "\n" + readFileSync(HERE + "old/results.txt", "utf8").replace("function ResultsSkeleton", "export function ResultsSkeleton"));
const { GridSkeleton, ResultsSkeleton } = req(HERE + "old/skeletons.tsx");
/** Flight's shape for a server-drawn tree: every host element written out ["$", tag, key, props]. */
function flight(node: any): any {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(flight);
  if (node.$$typeof === Symbol.for("react.transitional.element")) {
    if (typeof node.type === "string") return ["$", node.type, node.key ?? null, Object.fromEntries(Object.entries(node.props ?? {}).map(([k, v]) => [k, flight(v)]))];
    if (node.type === Symbol.for("react.fragment")) return flight(node.props?.children);
    if (typeof node.type === "function") return flight(node.type(node.props));
  }
  return node;
}
const React = req("react");
const grid = JSON.stringify(flight(React.createElement(GridSkeleton)));
const results = JSON.stringify(flight(React.createElement(ResultsSkeleton)));
const ref = JSON.stringify(["$", "$L1", null, {}]);
const refResults = JSON.stringify(["$", "$L1", null, { notable: true, searching: false }]);
console.log(`GridSkeleton (server-drawn) ${Buffer.byteLength(grid)} B · ResultsSkeleton ${Buffer.byteLength(results)} B · now a reference: ${Buffer.byteLength(ref)} B / ${Buffer.byteLength(refResults)} B (+ one import row naming the chunk)`);
