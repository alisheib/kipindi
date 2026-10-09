// R5-L · the suite's header names the cases the data decides (the podium's, the two title stacks' one rule).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5l.test.mts", (s) => {
  s = once(s,
    " *   §5 /leaderboard · the ribbon, the lens, the sort, the podium and the table with its head, in order; no spinner box\n"
    + " *   §6 /results · row 2 from lg in the page's words; the carousel the notable card's own box; the grid's count\n",
    " *   §5 /leaderboard · the ribbon, the lens, the sort, the podium and the table with its head, in order; no spinner box;\n"
    + " *          the podium the measured board's (the leader without a streak, the two beside it on one)\n"
    + " *   §6 /results · row 2 from lg in the page's words; the carousel the notable card's own box, its title the tallest of\n"
    + " *          three on the one rule for a title stack (the N/(N+1) quantile); the grid's count\n",
    "header 5-6");
  s = once(s,
    " *   §8 /live · the hero IS PageHero; the CTA row the page's button and six dots; each card the PulseCard's box per language\n",
    " *   §8 /live · the hero IS PageHero; the CTA row the page's button and six dots; its question stack the tallest of six on\n"
    + " *          the same rule; each card the PulseCard's box per language\n",
    "header 8");
  return s;
});
