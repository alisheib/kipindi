// R5-L · §D's note says exactly what the generic loaders are now (their opening bands only).
const { once, edit } = require("./lib.cjs");
edit("scripts/ghost-landing.mjs", (s) => once(s,
  " * §A's 120px tolerance was set for ghosts that were typed boxes. Since R5-L the ghosts on /agent, /agent/apply,\n"
  + " * /agent/status, /leaderboard, /results, /markets, /live and the sixteen generic loaders are built of their pages' own\n"
  + " * boxes with the pages' own words set and not shown, so the element each one promises lands on the page's pixel: §D\n",
  " * §A's 120px tolerance was set for ghosts that were typed boxes. Since R5-L the ghosts on /agent, /agent/apply,\n"
  + " * /agent/status, /leaderboard, /results, /markets and /live are built of their pages' own boxes with the pages' own\n"
  + " * words set and not shown, and the generic loaders open on their pages' own back link and header (PageLoader's rule),\n"
  + " * so the element each one promises lands on the page's pixel: §D\n",
  "drive doc"));
