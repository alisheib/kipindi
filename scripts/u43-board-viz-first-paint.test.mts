/** BoardViz first paint: desktop reserves the real chart slot before the client
 * reads its viewport/storage preference; phones keep the chart collapsed. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BoardViz } from "../src/components/charts/board-viz";

const source = readFileSync(new URL("../src/components/charts/board-viz.tsx", import.meta.url), "utf8");
const props = { cubes: createElement("i", { "data-testid": "recent-rounds" }, "recent"),
  chart: createElement("i", { "data-testid": "actual-chart" }, "price"),
  labels: { chart: "Price chart", cubesEyebrow: "Last rounds" } };
const html = renderToStaticMarkup(createElement(BoardViz, props));
assert.match(html, /data-testid="recent-rounds"/, "recent rounds remain on first paint");
assert.match(html, /aria-expanded="false"/, "unresolved preference does not claim loaded chart content");
assert.match(html, /class="ud-chart-slot hidden rounded-lg bg-bg-elevated kp-shimmer-track lg:block" aria-hidden="true"/,
  "desktop reserves the 380px chart slot with an inert responsive skeleton");
assert.doesNotMatch(html, /data-testid="actual-chart"/, "no chart series is fabricated on first paint");
assert.match(source, /const \[open, setOpen\] = useState<boolean \| null>\(null\)/,
  "unresolved first paint is distinct from the saved closed choice");
assert.match(source, /setOpen\(\(current\) => current \?\? \(stored === "open"\)\)/,
  "saved open or closed choice wins unless the player already clicked");
assert.equal((source.match(/setOpen\(\(current\) => current \?\? window\.matchMedia\("\(min-width: 1024px\)"\)\.matches\)/g) ?? []).length, 2,
  "desktop defaults open both with absent storage and a storage error");
assert.match(source, /<div className="ud-chart-slot" hidden=\{!open\}>/, "saved closed state removes the slot");
assert.match(source, /window\.localStorage\.setItem\(STORE_KEY, next \? "open" : "closed"\)/,
  "the player can still persist either choice");
const noChart = renderToStaticMarkup(createElement(BoardViz, { ...props, chart: null }));
assert.doesNotMatch(noChart, /ud-chart-slot/, "no available chart reserves no chart space");
console.log("U43 BoardViz first paint: 10 passed, 0 failed");
