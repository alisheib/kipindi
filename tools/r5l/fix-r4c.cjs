// R5-L · r4c 1.6: the results page's own fallback IS the loading file's drawing now.
const { once, edit } = require("./lib.cjs");
const FROM = String.raw`    ["src/app/results/page.tsx", /<div className=\{QUERY_SEARCH_BAND_CLASS\} aria-hidden>\s*<div className="search-box-wrap">[\s\S]{0,260}?<p className="mt-1\.5 min-h-\[17px\]" \/>/],` + "\n";
const TO = "    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the page's Suspense fallback IS the loading file's drawing (`ResultsGhostBands`,\n"
  + "    // imported from ./loading) — one ghost for the document's first paint and a move's, so its band is the one above.\n"
  + String.raw`    ["src/app/results/page.tsx", /import \{ ResultsGhostBands \} from "\.\/loading";[\s\S]*<Suspense fallback=\{<ResultsGhostBands /],` + "\n";
edit("scripts/visual-pass-r4c.test.mts", (s) => once(s, FROM, TO, "r4c 1.6"));
