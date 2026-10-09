// R5-L · the money books' bar ghost takes the ONE pill ghost (moved to `components/ui/query-bar-ghost.tsx`).
const { once, edit } = require("./lib.cjs");
edit("src/app/wallet/money-bar-ghost.tsx", (s) => {
  s = once(s,
    'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_GROUP_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";\n',
    'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_GROUP_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";\n'
    + 'import { PillGhost } from "@/components/ui/query-bar-ghost";\n',
    "import");
  s = once(s,
    "\n/** A pill while it loads: `filterPillClass`'s box (its geometry, not its ink) with the label set and not shown. */\n"
    + "function PillGhost({ label }: { label: string }) {\n"
    + "  return (\n"
    + "    <span className=\"inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px] font-semibold text-transparent kp-shimmer-track\">\n"
    + "      {label}\n"
    + "      <span className=\"font-mono text-[11px] font-bold tabular-nums\">00</span>\n"
    + "    </span>\n"
    + "  );\n"
    + "}\n",
    "\n/* The pill — `filterPillClass`'s box with the label set and not shown — is `query-bar-ghost.tsx`'s `PillGhost` since round\n"
    + "   5's follow-up (R5-L): /results', /markets' and /leaderboard's ghosts draw the same pill, so it lives once, beside the\n"
    + "   other parts every bar ghost draws. */\n",
    "PillGhost");
  return s;
});
