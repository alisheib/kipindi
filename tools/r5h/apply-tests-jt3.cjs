const { once, edit } = require("./lib.cjs");
edit("scripts/journey-tickets.test.mts", (s) => once(s,
  "const HISTORY_GHOST_LINES = [`<div className=\"h-4 w-[128px] rounded bg-bg-elevated kp-shimmer-track\" aria-hidden />`,\n"
  + "  `<div className=\"mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track\" aria-hidden />`];\n",
  "/** Today's two head lines in the ghost: since round 5's follow-up (R5-H, G-2b) the page's own — the BackLink's 44px box\n"
  + " *  and the page's PageHeader in its `mt-3` wrapper, same props (a 20px bar and a 40px block stood there). */\n"
  + "const HISTORY_GHOST_LINES = [\"<BackLinkGhost />\",\n"
  + "  `<div className=\"mt-3\"><PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} /></div>`];\n", "jt.lines"));
