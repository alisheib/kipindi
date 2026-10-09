// R5-L · /markets: the bar's row 2 from lg carries the page's words; the bar and the grid are ONE drawing for the route's
// loading file and the page's Suspense fallback (`MarketsBoardGhost`).
const fs = require("fs");
const path = require("path");
const { once, edit } = require("./lib.cjs");
const STAGE = path.join(__dirname, "stage/src/app/markets/loading.tsx");
let s = fs.readFileSync(STAGE, "utf8").replace(/\r\n/g, "\n");

s = once(s,
  'import {\n  QUERY_BAR_CLASS,\n  QUERY_BAR_ROW1_CLASS,\n  QUERY_BAR_ROW2_CLASS,\n  QUERY_GROUP_CLASS,\n  QUERY_STRIP_CLASS,\n} from "@/components/ui/query-bar";\n',
  'import {\n  QUERY_BAR_CLASS,\n  QUERY_BAR_ROW1_CLASS,\n  QUERY_BAR_ROW2_CLASS,\n  QUERY_STRIP_CLASS,\n  QueryGroupDivider,\n} from "@/components/ui/query-bar";\n'
  + 'import { FiltersGhost, GroupGhost, MenuGhost, PillGhost, SortGhost } from "@/components/ui/query-bar-ghost";\n'
  + 'import { POOL_FLOORS } from "@/lib/markets/discovery";\nimport { formatTzsCompact } from "@/lib/utils";\n',
  "imports");

s = once(s,
  " * ⛔ Card height and count are NOT re-typed here: `MARKET_CARD_H` is the one shared definition\n * (`components/markets/card-geometry.ts`) and the count comes from `PLAYER_PER_PAGE`. That is\n * how the two skeletons stay equal — the previous pair drifted to 220 vs 349 precisely because\n * each carried its own literal.\n */\n",
  " * ⛔ Card height and count are NOT re-typed here: `MARKET_CARD_H` is the one shared definition\n * (`components/markets/card-geometry.ts`) and the count comes from `PLAYER_PER_PAGE`. That is\n * how the two skeletons stay equal — the previous pair drifted to 220 vs 349 precisely because\n * each carried its own literal.\n"
  + " * ⭐ AND SINCE ROUND 5'S FOLLOW-UP (R5-L) THERE IS ONE SKELETON, NOT TWO. The page's Suspense fallback was\n"
  + " * `GridSkeleton` — the skeleton a DOCUMENT load paints first — and it drew the grid alone, `mt-3`: no bar at all, so the\n"
  + " * first card stood 92px above where the page puts it on a phone (the one-line bar's 84 and the grid's 8 more) and 180px\n"
  + " * at 1280 in Swahili. The bar and the grid below are `MarketsBoardGhost`, this file's drawing and the page's fallback.\n"
  + " * ⭐ AND ROW 2 FROM `lg` CARRIES THE PAGE'S WORDS: the sort, the odds and pool groups (each behind the page's own divider,\n"
  + " * with its key and pills — `query-bar-ghost.tsx`) and the topic menu wrap where the page's do — two lines at 1024 and\n"
  + " * 1280 in Swahili and English (and at 1024 in Chinese), measured from the served fonts (S/r5l/measure-bars.cts), where\n"
  + " * five typed boxes drew one: the grid landed 56px below the ghost's promise.\n */\n",
  "doc");

// The page's board — this file's drawing and the page's own Suspense fallback.
s = once(s,
  "      <div aria-hidden className={QUERY_BAR_CLASS}>\n",
  "      <MarketsBoardGhost />\n    </PageContainer>\n  );\n}\n\n"
  + "/**\n * The board while it loads — the bar, then the grid: this file's drawing AND `markets/page.tsx`'s Suspense fallback, so a\n"
  + " * document's first paint and a move's are one drawing (R5-L). Drawn for a board with a page of cards.\n */\n"
  + "export function MarketsBoardGhost() {\n  const { t } = useT();\n  return (\n    <>\n"
  + "      <div aria-hidden className={QUERY_BAR_CLASS}>\n",
  "split");

s = once(s,
  "          {/* Sort + direction, and the phone's single filters button — the two controls this row\n              renders at EVERY width. Their widths are the DESKTOP ones; under 640 the grid above\n              sizes both from their own content, so these numbers only apply where the bar is\n              genuinely two flex rows. */}\n"
  + "          <div className=\"kp-shimmer-track h-[44px] w-[210px] rounded-pill bg-bg-elevated\" data-bar-cell=\"sort\" />\n"
  + "          {/* The phone's Filters button — `lg:hidden`, as `FilterSheet` is (R5-H · G-2b: `.kp-fsheet` hides nothing at lg,\n              so the ghost drew a 170px pill at 1280 in a row the page does not have). */}\n"
  + "          <div className=\"kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated lg:hidden\" />\n",
  "          {/* Sort + direction, and the phone's single Filters button — the two controls this row renders below `lg`,\n"
  + "              each the page's own box with its words (`query-bar-ghost.tsx`, R5-L): under 640 the phone grid places them by\n"
  + "              the page's own hooks (`data-bar-cell`, `.kp-fsheet`) and folds the Filters label away as it folds the page's.\n"
  + "              They were a 210px and a 170px box: wider than the page's cells, they pushed the phone grid past the bar's\n"
  + "              edge. The Filters button is `lg:hidden`, as `FilterSheet` is (R5-H · G-2b). */}\n"
  + "          <SortGhost label={t.common.sort} value={t.market.sortPool} />\n"
  + "          <FiltersGhost label={t.market.filtersOpen} />\n",
  "row2 head");

s = once(s,
  "          {/* ⛔ ODDS, POOL AND TOPIC ARE DESKTOP-ONLY. On a phone the real bar folds all three\n              behind the button above (`FilterSheet`), and their desktop rows carry\n              `QUERY_GROUP_CLASS`, which is `hidden … lg:flex`. Ghosting them unconditionally drew\n              four 44px pills a phone never receives. Consume the SAME visibility class rather\n              than re-stating the breakpoint, so a change to one moves both. */}\n"
  + "          {[56, 92, 88, 84].map((w, i) => (\n            <div key={i} className={QUERY_GROUP_CLASS}>\n              <div className=\"kp-shimmer-track h-[44px] rounded-pill bg-bg-elevated\" style={{ width: w }} />\n            </div>\n          ))}\n",
  "          {/* ⛔ ODDS, POOL AND TOPIC ARE DESKTOP-ONLY. On a phone the real bar folds all three\n              behind the button above (`FilterSheet`), and their desktop rows carry\n              `QUERY_GROUP_CLASS`, which is `hidden … lg:flex`. Ghosting them unconditionally drew\n              four 44px pills a phone never receives. Consume the SAME visibility class rather\n              than re-stating the breakpoint, so a change to one moves both.\n"
  + "              ⭐ AND THEY ARE THE PAGE'S GROUPS (R5-L): each behind the page's divider (the row's 29px gap is keyed on it),\n"
  + "              its key and its pills with the page's words — the pool's floors set as money, as the page sets them — then\n"
  + "              the topic menu's own box. Four typed boxes drew one line where the page's row takes two. */}\n"
  + "          <QueryGroupDivider />\n"
  + "          <GroupGhost label={t.market.oddsKey}>\n"
  + "            {[t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong].map((o) => <PillGhost key={o} label={o} />)}\n"
  + "          </GroupGhost>\n"
  + "          <QueryGroupDivider />\n"
  + "          <GroupGhost label={t.market.poolKey}>\n"
  + "            <PillGhost label={t.market.poolAny} />\n"
  + "            <PillGhost label={`${formatTzsCompact(POOL_FLOORS[\"10k\"])}+`} amount />\n"
  + "            <PillGhost label={`${formatTzsCompact(POOL_FLOORS[\"50k\"])}+`} amount />\n"
  + "          </GroupGhost>\n"
  + "          <QueryGroupDivider />\n"
  + "          <MenuGhost label={t.common.topic} value={t.market.catAll} />\n",
  "row2 groups");

s = once(s,
  "            style={{ height: MARKET_CARD_H }}\n          />\n        ))}\n      </div>\n    </PageContainer>\n  );\n}\n",
  "            style={{ height: MARKET_CARD_H }}\n          />\n        ))}\n      </div>\n    </>\n  );\n}\n",
  "tail");

fs.writeFileSync(STAGE, s);
console.log("staged markets/loading.tsx");

// The page: the Suspense fallback is the route's drawing; GridSkeleton goes.
edit("src/app/markets/page.tsx", (p) => {
  p = once(p, 'import { MARKET_CARD_H } from "@/components/markets/card-geometry";\n', 'import { MarketsBoardGhost } from "./loading";\n', "imports");
  p = once(p, "      <Suspense fallback={<GridSkeleton />}>\n",
    "      {/* ⭐ THE FALLBACK IS THE ROUTE'S OWN BOARD GHOST (round 5's follow-up, R5-L): the bar and the grid as `loading.tsx`\n"
    + "          draws them — one drawing for a document's first paint and a move's, and a client reference (no drawn tree in this\n"
    + "          page's payload, which every 30s refresh re-sends). It replaces `GridSkeleton`, which drew the grid alone: no bar, so\n"
    + "          the first card stood 92px high on a phone and 180px at 1280 in Swahili. */}\n"
    + "      <Suspense fallback={<MarketsBoardGhost />}>\n", "suspense");
  const start = p.indexOf("/**\n * THE skeleton a visitor actually sees");
  if (start < 0) throw new Error("GridSkeleton doc not found");
  const end = p.indexOf("\n}\n", p.indexOf("function GridSkeleton() {", start));
  p = p.slice(0, start).replace(/\n+$/, "\n") + p.slice(end + 3);
  if (p.includes("GridSkeleton()")) throw new Error("GridSkeleton still there");
  return p;
});
