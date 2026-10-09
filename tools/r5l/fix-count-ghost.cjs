// R5-L · ONE bar kit: R5-K's `CountGhost` (exported from money-bar-ghost.tsx on the tip, for /positions' ghost) stands
// in `query-bar-ghost.tsx` beside the one `PillGhost`; the money books' ghost draws both from there — its count line
// takes the very change R5-K made to it (`<CountGhost count={count} />`), so that hunk merges as one.
const { once, edit } = require("./lib.cjs");
edit("src/components/ui/query-bar-ghost.tsx", (s) => once(s,
  "/** A desktop group: the page's own wrapper (`QUERY_GROUP_CLASS`, `hidden … lg:flex`, wrapping inside itself), its key in\n",
  "/** The result count while it loads (`QueryResultCount`'s type: 11.5px mono on its 17.25px line), the phrase's own width\n"
  + " *  set and not shown — R5-K's, drawn by the money books' and /positions' bar ghosts, kept here beside the one pill. */\n"
  + "export function CountGhost({ count }: { count: string }) {\n"
  + "  return <p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">{count}</span></p>;\n"
  + "}\n"
  + "\n"
  + "/** A desktop group: the page's own wrapper (`QUERY_GROUP_CLASS`, `hidden … lg:flex`, wrapping inside itself), its key in\n",
  "count ghost"));
edit("src/app/wallet/money-bar-ghost.tsx", (s) => {
  s = once(s,
    "import { PillGhost } from \"@/components/ui/query-bar-ghost\";\n",
    "import { CountGhost, PillGhost } from \"@/components/ui/query-bar-ghost\";\n",
    "import");
  s = once(s,
    "        <p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">{count}</span></p>\n",
    "        <CountGhost count={count} />\n",
    "count line");
  s = once(s,
    "/* The pill — `filterPillClass`'s box with the label set and not shown — is `query-bar-ghost.tsx`'s `PillGhost` since round\n"
    + "   5's follow-up (R5-L): /results', /markets' and /leaderboard's ghosts draw the same pill, so it lives once, beside the\n"
    + "   other parts every bar ghost draws. */\n",
    "/* The pill — `filterPillClass`'s box with the label set and not shown — and the result count are `query-bar-ghost.tsx`'s\n"
    + "   `PillGhost` and `CountGhost` since round 5's follow-up (R5-L, R5-K): /results', /markets', /leaderboard's and\n"
    + "   /positions' ghosts draw the same pill and count, so each lives once, beside the other parts every bar ghost draws. */\n",
    "trailing note");
  return s;
});
