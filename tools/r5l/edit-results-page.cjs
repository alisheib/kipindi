// R5-L · /results' Suspense fallback is the route's own ghost (`ResultsGhostBands`), handed what the page knows.
const { rd, once, edit } = require("./lib.cjs");
const P = "src/app/results/page.tsx";
edit(P, (s) => {
  s = once(s, 'import { MARKET_CARD_H_CLOSED } from "@/components/markets/card-geometry";\n', "", "card-geometry import");
  s = once(s, 'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\n',
    'import { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\n', "query-bar import");
  s = once(s, 'import { NotableCarousel } from "./notable-carousel";\n',
    'import { NotableCarousel } from "./notable-carousel";\nimport { ResultsGhostBands } from "./loading";\n', "ghost import");
  s = once(s,
    "      <div className=\"flex flex-col gap-5\">\n        <Suspense fallback={<ResultsSkeleton />}>\n",
    "      <div className=\"flex flex-col gap-5\">\n"
    + "        {/* ⭐ THE FALLBACK IS THE ROUTE'S OWN GHOST (round 5's follow-up, R5-L): a document's first paint and a move's are\n"
    + "            ONE drawing (`loading.tsx`'s `ResultsGhostBands`, a client reference — no drawn tree in this page's payload,\n"
    + "            which every 60s refresh re-sends), handed what this page knows: the carousel on page one with no search, and a\n"
    + "            search's line over the grid. It replaces `ResultsSkeleton`, a second drawing that had drifted from the first: a\n"
    + "            24px header row against the page's 38, the phone's Filters pill beside the sort at every width (a second line at\n"
    + "            320, and none of the three groups from 1024) and no carousel — page one's first card landed 395 to 547px below it — and eight\n"
    + "            cards with the open card's YES/NO buttons where the page draws nine closed ones. */}\n"
    + "        <Suspense fallback={<ResultsGhostBands notable={!searching && pageNum === 1} searching={searching} />}>\n",
    "suspense");
  const start = s.indexOf("/** Shimmer skeleton shown while the async content loads (same pattern as\n");
  if (start < 0) throw new Error("skeleton doc not found");
  const end = s.indexOf("\n}\n", s.indexOf("function ResultsSkeleton() {", start));
  if (end < 0) throw new Error("skeleton end not found");
  s = s.slice(0, start).replace(/\n+$/, "\n") + s.slice(end + 3);
  if (s.includes("function ResultsSkeleton")) throw new Error("skeleton still there");
  return s;
});
console.log(rd(P).slice(-400));
